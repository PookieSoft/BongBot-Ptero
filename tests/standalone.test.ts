import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// Set required env vars before any imports
process.env.DISCORD_API_KEY = 'fake-token';
process.env.ENCRYPTION_KEY = 'a'.repeat(64);

const mockExecute = jest.fn<any>(() => ({ content: 'pong!' }));

// Mock crypto
jest.unstable_mockModule('crypto', () => {
    const mockCrypto = {
        randomUUID: jest.fn(() => 'fixed-uuid-1234-5678-9012-abcdef123456'),
        randomBytes: jest.fn(),
        createCipheriv: jest.fn(),
        createDecipheriv: jest.fn(),
    };
    return {
        ...mockCrypto,
        default: mockCrypto,
    };
});

// Mock discord.js
jest.unstable_mockModule('discord.js', () => {
    class MockCollection extends Map {
        constructor(entries?: [string, any][]) {
            super();
            if (entries) {
                for (const [key, value] of entries) {
                    this.set(key, value);
                }
            }
        }

        filter(predicate: (value: any, key: string, map: Map<string, any>) => boolean) {
            const filteredEntries: [string, any][] = [];
            for (const [key, value] of this.entries()) {
                if (predicate(value, key, this)) {
                    filteredEntries.push([key, value]);
                }
            }
            return new MockCollection(filteredEntries);
        }
    }

    return {
        Client: jest.fn(() => ({
            on: jest.fn(),
            login: jest.fn(),
            user: { id: 'bot123' },
            channels: { fetch: jest.fn() },
            commands: new MockCollection(),
        })),
        GatewayIntentBits: { Guilds: 1, GuildMessages: 2, MessageContent: 4 },
        MessageFlags: { Loading: 1 << 7, Ephemeral: 1 << 6 },
        Collection: MockCollection,
        EmbedBuilder: jest.fn(() => ({ setTitle: jest.fn(), setDescription: jest.fn(), addFields: jest.fn() })),
        SlashCommandBuilder: jest.fn(() => ({
            setName: jest.fn().mockReturnThis(),
            setDescription: jest.fn().mockReturnThis(),
            addSubcommand: jest.fn().mockReturnThis(),
        })),
        ChatInputCommandInteraction: jest.fn(),
        ButtonInteraction: jest.fn(),
        Message: jest.fn(),
        StringSelectMenuInteraction: jest.fn(),
        ActionRowBuilder: jest.fn(() => ({ addComponents: jest.fn().mockReturnThis() })),
        ButtonBuilder: jest.fn(() => ({ setCustomId: jest.fn().mockReturnThis(), setLabel: jest.fn().mockReturnThis(), setStyle: jest.fn().mockReturnThis() })),
        ButtonStyle: { Primary: 1, Secondary: 2, Success: 3, Danger: 4 },
        StringSelectMenuBuilder: jest.fn(() => ({ setCustomId: jest.fn().mockReturnThis(), addOptions: jest.fn().mockReturnThis() })),
        ComponentType: { Button: 2, StringSelect: 3 },
        APIButtonComponent: jest.fn(),
    };
});

// Mock bongbot-core
const mockBuildUnknownError = jest.fn((err: any) => ({ content: `Error: ${err.message}`, isError: true }));
const mockGenerateCard = jest.fn(async (client: any, config: { repoOwner: string; repoName: string }) => ({
    title: 'Fake Card'
}));
const mockValidateRequiredConfig = jest.fn();
const mockLoggerLog = jest.fn();

jest.unstable_mockModule('bongbot-core', () => ({
    LOGGER: {
        log: mockLoggerLog,
        default: { info: jest.fn(), debug: jest.fn(), error: jest.fn() },
    },
    buildError: jest.fn(),
    buildUnknownError: mockBuildUnknownError,
    Caller: jest.fn(() => ({ get: jest.fn(), post: jest.fn() })),
    generateCard: mockGenerateCard,
    validateRequiredConfig: mockValidateRequiredConfig,
}));

// Mock buildCommands
jest.unstable_mockModule('../src/commands/build_commands.js', () => ({
    default: jest.fn((bot: any) => {
        const pingCommand = {
            data: { name: 'ping' },
            msgFlag: undefined,
            execute: mockExecute,
        };
        bot.commands.set('ping', pingCommand);
    }),
}));

describe('standalone', () => {
    let Discord: any;
    let mockClient: any;

    beforeAll(async () => {
        Discord = await import('discord.js');
        const { startBot } = await import('../src/standalone.js');
        startBot();
        mockClient = (Discord.Client as any).mock.results[0].value;
    });

    it('loads commands into bot.commands', () => {
        expect(mockClient.commands.get('ping')).toBeDefined();
    });

    it('registers interactionCreate and clientReady event listeners', () => {
        expect(mockClient.on).toHaveBeenCalledWith('interactionCreate', expect.any(Function));
        expect(mockClient.on).toHaveBeenCalledWith('clientReady', expect.any(Function));
    });

    it('logs in with the provided token', () => {
        expect(mockClient.login).toHaveBeenCalledWith('fake-token');
    });

    describe('interactionCreate handler', () => {
        let handler: Function;

        beforeAll(() => {
            handler = mockClient.on.mock.calls.find((c: any[]) => c[0] === 'interactionCreate')[1];
        });

        it('ignores non-command interactions', async () => {
            const interaction = { isCommand: () => false };
            await handler(interaction);
            expect(mockExecute).not.toHaveBeenCalled();
        });

        it('ignores unknown commands', async () => {
            const interaction = {
                isCommand: () => true,
                commandName: 'unknown',
                deferReply: jest.fn(),
            };
            await handler(interaction);
            expect(interaction.deferReply).not.toHaveBeenCalled();
        });

        it('executes a known command successfully', async () => {
            mockExecute.mockResolvedValueOnce({ content: 'pong!' });

            const interaction = {
                isCommand: () => true,
                commandName: 'ping',
                deferReply: jest.fn(),
                followUp: jest.fn(),
                deleteReply: jest.fn(),
                replied: false,
            };
            await handler(interaction);
            expect(mockExecute).toHaveBeenCalled();
            expect(interaction.deferReply).toHaveBeenCalled();
            expect(interaction.followUp).toHaveBeenCalledWith({ content: 'pong!' });
        });

        it('deletes deferred reply and follows up with error on isError response', async () => {
            mockExecute.mockResolvedValueOnce({ isError: true, content: 'Error response' });

            const interaction = {
                isCommand: () => true,
                commandName: 'ping',
                deferReply: jest.fn(),
                followUp: jest.fn(),
                deleteReply: jest.fn(),
                replied: true,
            };
            await handler(interaction);
            expect(interaction.deleteReply).toHaveBeenCalled();
            expect(interaction.followUp).toHaveBeenCalledWith({ isError: true, content: 'Error response' });
        });

        it('calls setupCollector when command has setupCollector method', async () => {
            const mockSetupCollector = jest.fn();
            const mockMessage = { id: 'message123' };

            const commandWithCollector = {
                data: { name: 'manage' },
                msgFlag: undefined,
                execute: jest.fn(() => ({ content: 'status' })),
                setupCollector: mockSetupCollector,
            };
            mockClient.commands.set('manage', commandWithCollector);

            const interaction = {
                isCommand: () => true,
                commandName: 'manage',
                deferReply: jest.fn(),
                followUp: jest.fn(() => Promise.resolve(mockMessage)),
                deleteReply: jest.fn(),
                replied: false,
            };

            await handler(interaction);

            expect(commandWithCollector.execute).toHaveBeenCalled();
            expect(mockSetupCollector).toHaveBeenCalledWith(interaction, mockMessage);
        });

        it('handles thrown errors during command execution - replied=true', async () => {
            mockExecute.mockImplementationOnce(() => { throw new Error('boom'); });

            const interaction = {
                isCommand: () => true,
                commandName: 'ping',
                deferReply: jest.fn(),
                followUp: jest.fn(),
                deleteReply: jest.fn(),
                replied: true,
            };
            await handler(interaction);
            expect(interaction.deleteReply).toHaveBeenCalled();
            expect(mockBuildUnknownError).toHaveBeenCalled();
        });

        it('handles thrown errors during command execution - replied=false', async () => {
            mockExecute.mockImplementationOnce(() => { throw new Error('boom'); });

            const interaction = {
                isCommand: () => true,
                commandName: 'ping',
                deferReply: jest.fn(),
                followUp: jest.fn(),
                deleteReply: jest.fn(),
                replied: false,
            };
            await handler(interaction);
            expect(interaction.deleteReply).not.toHaveBeenCalled();
            expect(mockBuildUnknownError).toHaveBeenCalled();
        });
    });

    describe('clientReady handler', () => {
        let handler: Function;
        let originalChannelId: string | undefined;

        beforeAll(() => {
            handler = mockClient.on.mock.calls.find((c: any[]) => c[0] === 'clientReady')[1];
            originalChannelId = process.env.DISCORD_CHANNEL_ID;
        });

        afterAll(() => {
            if (originalChannelId !== undefined) {
                process.env.DISCORD_CHANNEL_ID = originalChannelId;
            } else {
                delete process.env.DISCORD_CHANNEL_ID;
            }
        });

        it('logs when DISCORD_CHANNEL_ID is not set', async () => {
            delete process.env.DISCORD_CHANNEL_ID;
            mockLoggerLog.mockClear();

            await handler();

            expect(mockLoggerLog).toHaveBeenCalledWith('DISCORD_CHANNEL_ID not set');
        });

        it('returns early when channel is not found', async () => {
            process.env.DISCORD_CHANNEL_ID = 'test-channel-id';
            mockClient.channels.fetch.mockResolvedValueOnce(null);

            await handler();

            expect(mockGenerateCard).not.toHaveBeenCalled();
        });

        it('returns early when channel is not text-based', async () => {
            process.env.DISCORD_CHANNEL_ID = 'test-channel-id';
            mockClient.channels.fetch.mockResolvedValueOnce({
                isTextBased: () => false,
            });

            await handler();

            expect(mockGenerateCard).not.toHaveBeenCalled();
        });

        it('returns early when channel has no send method', async () => {
            process.env.DISCORD_CHANNEL_ID = 'test-channel-id';
            mockClient.channels.fetch.mockResolvedValueOnce({
                isTextBased: () => true,
                // No send method
            });

            await handler();

            expect(mockGenerateCard).not.toHaveBeenCalled();
        });

        it('fetches messages, deletes bot messages, and sends deployment card', async () => {
            process.env.DISCORD_CHANNEL_ID = 'test-channel-id';

            const Discord = await import('discord.js');
            const mockDeleteFn = jest.fn<() => Promise<any>>().mockResolvedValue(undefined);
            const mockDeleteDescFn = jest.fn<() => Promise<any>>().mockResolvedValue(undefined);
            const mockMessages = new (Discord.Collection as any)([
                ['1', { author: { id: 'bot123' }, embeds: [{ title: 'BongBot-Ptero' }], delete: mockDeleteFn }],
                ['2', { author: { id: 'other-user' }, embeds: [], delete: jest.fn() }],
                ['3', { author: { id: 'bot123' }, embeds: [{ description: 'Deployed BongBot-Ptero v2' }], delete: mockDeleteDescFn }],
            ]);

            const fakeChannel = {
                isTextBased: () => true,
                send: jest.fn(),
                messages: { fetch: jest.fn<() => Promise<any>>().mockResolvedValue(mockMessages) },
            };
            mockClient.channels.fetch.mockResolvedValueOnce(fakeChannel);
            mockGenerateCard.mockResolvedValueOnce({ title: 'Deploy Card' });

            await handler();
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(fakeChannel.send).toHaveBeenCalledWith({ embeds: [{ title: 'Deploy Card' }] });
            expect(mockGenerateCard).toHaveBeenCalledWith(
                mockClient,
                { repoOwner: 'Mirasii', repoName: 'BongBot-Ptero' }
            );
            expect(mockDeleteFn).toHaveBeenCalled();
            expect(mockDeleteDescFn).toHaveBeenCalled();
        });

        it('warns when lacking manage messages permission', async () => {
            process.env.DISCORD_CHANNEL_ID = 'test-channel-id';
            const fakeChannel = {
                isTextBased: () => true,
                send: jest.fn(),
                messages: { fetch: jest.fn<() => Promise<any>>().mockRejectedValue(new Error('Forbidden')) },
            };
            mockClient.channels.fetch.mockResolvedValueOnce(fakeChannel);

            const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            await handler();
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining('Warning: Could not delete messages')
            );
            warnSpy.mockRestore();
        });

        it('logs error when postDeploymentMessage throws', async () => {
            process.env.DISCORD_CHANNEL_ID = 'test-channel-id';
            mockClient.channels.fetch.mockRejectedValueOnce(new Error('channel fetch failed'));
            mockLoggerLog.mockClear();

            await handler();

            expect(mockLoggerLog).toHaveBeenCalledWith(expect.any(Error));
        });
    });

    describe('missing DISCORD_API_KEY', () => {
        let originalKey: string | undefined;
        const mockValidateNoEnv = jest.fn();

        beforeAll(async () => {
            originalKey = process.env.DISCORD_API_KEY;
            delete process.env.DISCORD_API_KEY;

            jest.resetModules();
            jest.unstable_mockModule('crypto', () => {
                const m = { randomUUID: jest.fn(() => 'fixed-uuid-no-env') };
                return { ...m, default: m };
            });
            jest.unstable_mockModule('discord.js', () => ({
                Client: jest.fn(() => ({ on: jest.fn(), login: jest.fn(), commands: new Map() })),
                GatewayIntentBits: { Guilds: 1, GuildMessages: 2, MessageContent: 4 },
                MessageFlags: { Loading: 1 << 7, Ephemeral: 1 << 6 },
                Collection: Map,
            }));
            jest.unstable_mockModule('bongbot-core', () => ({
                LOGGER: { log: jest.fn(), default: { info: jest.fn(), debug: jest.fn(), error: jest.fn() } },
                buildError: jest.fn(),
                buildUnknownError: jest.fn(),
                Caller: jest.fn(() => ({ get: jest.fn(), post: jest.fn() })),
                generateCard: jest.fn(),
                validateRequiredConfig: mockValidateNoEnv,
            }));
            jest.unstable_mockModule('../src/commands/build_commands.js', () => ({
                default: jest.fn(),
            }));

            const { startBot } = await import('../src/standalone.js');
            startBot();
        });

        afterAll(() => {
            if (originalKey !== undefined) {
                process.env.DISCORD_API_KEY = originalKey;
            }
        });

        it('calls validateRequiredConfig when DISCORD_API_KEY is not set', () => {
            expect(mockValidateNoEnv).toHaveBeenCalled();
        });
    });
});
