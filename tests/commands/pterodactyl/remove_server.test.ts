import { jest } from '@jest/globals';
import type { ChatInputCommandInteraction, Client } from 'discord.js';
import { createMockInteraction, createMockClient } from '../../utils/command_test_utils.js';

// Mock Database
const mockDeleteServer = jest.fn();
const mockDbClose = jest.fn();

const mockDb = {
    deleteServer: mockDeleteServer,
    close: mockDbClose,
};

// Mock @pookiesoft/bongbot-core
const mockBuildError = jest.fn();

jest.unstable_mockModule('@pookiesoft/bongbot-core', () => ({
    buildError: mockBuildError,
}));

// Import after mocking
const { default: RemoveServer } = await import('../../../src/commands/pterodactyl/remove_server.js');

// Create instance with mock dependencies
const removeServerInstance = new RemoveServer(mockDb as any);
const removeServerExecute = removeServerInstance.execute.bind(removeServerInstance);

describe('remove_server command', () => {
    let mockInteraction: Partial<ChatInputCommandInteraction>;
    let mockClient: Partial<Client>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockInteraction = createMockInteraction({
            commandName: 'remove_server',
            options: {
                getString: jest.fn((name: string, _required?: boolean) => {
                    if (name === 'server_name') return 'Test Server';
                    return null;
                }),
            },
        }) as any;

        mockInteraction.user = {
            id: 'test-user-123',
            username: 'testuser',
        } as any;

        mockClient = createMockClient() as any;

        mockBuildError.mockReturnValue({
            content: 'Error occurred',
            ephemeral: true,
        });
    });

    describe('execute function', () => {
        it('should successfully remove a server', async () => {
            const result = await removeServerExecute(mockInteraction as ChatInputCommandInteraction);

            expect(mockDeleteServer).toHaveBeenCalledWith('test-user-123', 'Test Server');
            expect(result).toEqual({
                content: 'Successfully removed server **Test Server**!',
                ephemeral: true,
            });
        });

        it('should trim server name before removing', async () => {
            (mockInteraction.options!.getString as jest.Mock).mockReturnValue('  Test Server  ');

            await removeServerExecute(mockInteraction as ChatInputCommandInteraction);

            expect(mockDeleteServer).toHaveBeenCalledWith('test-user-123', 'Test Server');
        });

        it('should handle database errors', async () => {
            const testError = new Error('Database error');
            mockDeleteServer.mockImplementation(() => {
                throw testError;
            });

            mockBuildError.mockReturnValue({
                content: 'Error removing server',
                ephemeral: true,
            });

            const result = await removeServerExecute(mockInteraction as ChatInputCommandInteraction);

            expect(mockBuildError).toHaveBeenCalledWith(mockInteraction, testError);
            if (!('content' in result)) {
                fail('Expected result to have content property');
            }
            expect(result.content).toBe('Error removing server');
        });

        it('should use the injected database', async () => {
            await removeServerExecute(mockInteraction as ChatInputCommandInteraction);

            expect(mockDeleteServer).toHaveBeenCalledWith('test-user-123', 'Test Server');
        });
    });
});
