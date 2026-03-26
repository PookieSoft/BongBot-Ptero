import { jest } from '@jest/globals';

interface MockInteractionOptions {
    commandName?: string;
    options?: Record<string, any>;
}

const createMockInteraction = (options: MockInteractionOptions = {}) => {
    const defaults = {
        options: {
            getString: jest.fn(),
            getInteger: jest.fn(),
            getUser: jest.fn(),
            getSubcommand: jest.fn(),
        },
        guild: {
            id: 'test_guild_id',
            members: {
                cache: new Map(),
                fetch: jest.fn(),
            },
        },
        user: {
            id: 'test_user_id',
            username: 'testuser',
        },
        reply: jest.fn(),
        commandName: options.commandName || 'test',
    };

    return { ...defaults, ...options };
};

const createMockClient = (options = {}) => {
    const defaults = {
        user: {
            displayAvatarURL: jest.fn(() => 'http://example.com/bot_avatar.jpg'),
        },
        commands: new Map(),
    };

    return { ...defaults, ...options };
};

export { createMockInteraction, createMockClient };
