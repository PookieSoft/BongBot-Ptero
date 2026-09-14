import { vi } from 'vitest';

interface MockInteractionOptions {
    commandName?: string;
    options?: Record<string, any>;
}

const createMockInteraction = (options: MockInteractionOptions = {}) => {
    const defaults = {
        options: {
            getString: vi.fn(),
            getInteger: vi.fn(),
            getUser: vi.fn(),
            getSubcommand: vi.fn(),
        },
        guild: {
            id: 'test_guild_id',
            members: {
                cache: new Map(),
                fetch: vi.fn(),
            },
        },
        user: {
            id: 'test_user_id',
            username: 'testuser',
        },
        reply: vi.fn(),
        commandName: options.commandName || 'test',
    };

    return { ...defaults, ...options };
};

const createMockClient = (options = {}) => {
    const defaults = {
        user: {
            displayAvatarURL: vi.fn(() => 'http://example.com/bot_avatar.jpg'),
        },
        commands: new Map(),
    };

    return { ...defaults, ...options };
};

export { createMockInteraction, createMockClient };
