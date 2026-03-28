/**
 * Tests the index.ts module initialization path where DISCORD_API_KEY is not set.
 * Needs a separate file because module-level code only runs once per Jest worker.
 */
import { jest } from '@jest/globals';

// Ensure DISCORD_API_KEY is NOT set for this test
delete process.env.DISCORD_API_KEY;

// Mock crypto
jest.unstable_mockModule('crypto', () => {
    const mockCrypto = {
        randomUUID: jest.fn(() => 'fixed-uuid-no-env'),
    };
    return { ...mockCrypto, default: mockCrypto };
});

// Mock discord.js
jest.unstable_mockModule('discord.js', () => {
    class MockCollection extends Map {}

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

// Mock bongbot-core — validateRequiredConfig must not throw so we can test the error push
const mockValidateRequiredConfig = jest.fn();

jest.unstable_mockModule('bongbot-core', () => ({
    LOGGER: {
        log: jest.fn(),
        default: { info: jest.fn(), debug: jest.fn(), error: jest.fn() },
    },
    buildError: jest.fn(),
    buildUnknownError: jest.fn(),
    Caller: jest.fn(() => ({ get: jest.fn(), post: jest.fn() })),
    generateCard: jest.fn(),
    validateRequiredConfig: mockValidateRequiredConfig,
}));

// Mock buildCommands
jest.unstable_mockModule('../src/commands/build_commands.js', () => ({
    default: jest.fn((_bot: any) => {}),
}));

describe('index.ts - missing DISCORD_API_KEY', () => {
    it('pushes DISCORD_API_KEY error and calls validateRequiredConfig with it', async () => {
        await import('../src/index.js');

        expect(mockValidateRequiredConfig).toHaveBeenCalled();
    });
});
