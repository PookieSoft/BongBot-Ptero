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
    };
});

// Mock bongbot-core — validateRequiredConfig must not throw so we can test the error push
const mockValidateRequiredConfig = jest.fn();

jest.unstable_mockModule('bongbot-core', () => ({
    LOGGER: {
        log: jest.fn(),
        default: { info: jest.fn(), debug: jest.fn(), error: jest.fn() },
    },
    buildUnknownError: jest.fn(),
    generateCard: jest.fn(),
    validateRequiredConfig: mockValidateRequiredConfig,
}));

// Mock buildCommands
jest.unstable_mockModule('../src/commands/buildCommands.js', () => ({
    default: jest.fn((_bot: any) => {}),
}));

describe('index.ts - missing DISCORD_API_KEY', () => {
    it('pushes DISCORD_API_KEY error and calls validateRequiredConfig with it', async () => {
        await import('../src/index.js');

        expect(mockValidateRequiredConfig).toHaveBeenCalledWith(
            expect.arrayContaining(['DISCORD_API_KEY is required'])
        );
    });
});
