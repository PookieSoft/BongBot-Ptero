import { jest } from '@jest/globals';
import type { ChatInputCommandInteraction, Client } from 'discord.js';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { createMockInteraction, createMockClient } from '../../utils/command_test_utils.js';

// Set allowed hosts for SSRF bypass
process.env.PTERODACTYL_ALLOWED_HOSTS = 'new-panel.example.com,existing-panel.example.com';

const testServerUrl = 'https://new-panel.example.com';
const existingServerUrl = 'https://existing-panel.example.com';

const handlers = [
    http.get(`${testServerUrl}/api/client`, () => {
        return HttpResponse.json({ data: [] });
    }),
    http.get(`${existingServerUrl}/api/client`, () => {
        return HttpResponse.json({ data: [] });
    }),
];

const server = setupServer(...handlers);

// Mock Database
const mockUpdateServer = jest.fn();
const mockGetServersByUserId = jest.fn();
const mockDbClose = jest.fn();

const mockDb = {
    updateServer: mockUpdateServer,
    getServersByUserId: mockGetServersByUserId,
    close: mockDbClose,
};

// Mock bongbot-core
const mockBuildError = jest.fn();

jest.unstable_mockModule('bongbot-core', () => ({
    buildError: mockBuildError,
    Caller: class MockCaller {
        constructor() {}
        async validateServerSSRF(_url: string): Promise<void> {}
        async get(baseUrl: string, path: string, _?: null, headers?: Record<string, string>): Promise<any> {
            const response = await fetch(`${baseUrl}${path}`, { headers });
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        }
        async post(baseUrl: string, path: string, headers?: Record<string, string>, body?: any): Promise<any> {
            const response = await fetch(`${baseUrl}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        }
    },
}));

// Import after mocking
const { default: UpdateServer } = await import('../../../src/commands/pterodactyl/update_server.js');
const { Caller } = await import('bongbot-core');

// Create instance with mock dependencies
const caller = new Caller();
const updateServerInstance = new UpdateServer(mockDb as any, caller as any);
const updateServerExecute = updateServerInstance.execute.bind(updateServerInstance);

describe('update_server command', () => {
    let mockInteraction: Partial<ChatInputCommandInteraction>;
    let mockClient: Partial<Client>;

    beforeAll(() => {
        server.listen({ onUnhandledRequest: 'bypass' });
    });

    afterAll(() => {
        server.close();
    });

    afterEach(() => {
        server.resetHandlers(...handlers);
    });

    beforeEach(() => {
        jest.clearAllMocks();

        mockInteraction = createMockInteraction({
            commandName: 'update_server',
            options: {
                getString: jest.fn((name: string, _required?: boolean) => {
                    if (name === 'server_name') return 'Test Server';
                    if (name === 'server_url') return testServerUrl;
                    if (name === 'api_key') return null;
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

        mockGetServersByUserId.mockReturnValue([
            {
                id: 1,
                userId: 'test-user-123',
                serverName: 'Test Server',
                serverUrl: existingServerUrl,
                apiKey: 'existing-api-key',
            },
        ]);
    });

    describe('execute function', () => {
        it('should update server URL', async () => {
            const result = await updateServerExecute(
                mockInteraction as ChatInputCommandInteraction
            );
            if (!('content' in result)) {
                fail('Expected result to have content, but it had embeds/files instead');
            }
            expect(mockGetServersByUserId).toHaveBeenCalledWith('test-user-123');
            expect(mockUpdateServer).toHaveBeenCalledWith('test-user-123', 'Test Server', {
                serverUrl: testServerUrl,
            });
            expect(result.content).toContain('Successfully updated **Test Server**!');
            expect(result.content).toContain('URL');
        });

        it('should update API key', async () => {
            (mockInteraction.options!.getString as jest.Mock<(name: string) => string | null>).mockImplementation((name: string) => {
                if (name === 'server_name') return 'Test Server';
                if (name === 'server_url') return null;
                if (name === 'api_key') return 'new-api-key-123';
                return null;
            });

            const result = await updateServerExecute(
                mockInteraction as ChatInputCommandInteraction
            );
            if (!('content' in result)) {
                fail('Expected result to have content, but it had embeds/files instead');
            }
            expect(mockUpdateServer).toHaveBeenCalledWith('test-user-123', 'Test Server', {
                apiKey: 'new-api-key-123',
            });
            expect(result.content).toContain('API key');
        });

        it('should update both URL and API key', async () => {
            (mockInteraction.options!.getString as jest.Mock<(name: string) => string | null>).mockImplementation((name: string) => {
                if (name === 'server_name') return 'Test Server';
                if (name === 'server_url') return testServerUrl;
                if (name === 'api_key') return 'new-api-key-123';
                return null;
            });

            const result = await updateServerExecute(
                mockInteraction as ChatInputCommandInteraction
            );
            if (!('content' in result)) {
                fail('Expected result to have content, but it had embeds/files instead');
            }
            expect(mockUpdateServer).toHaveBeenCalledWith('test-user-123', 'Test Server', {
                serverUrl: testServerUrl,
                apiKey: 'new-api-key-123',
            });
            expect(result.content).toContain('URL');
            expect(result.content).toContain('API key');
        });

        it('should trim server name, URL, and API key', async () => {
            (mockInteraction.options!.getString as jest.Mock<(name: string) => string | null>).mockImplementation((name: string) => {
                if (name === 'server_name') return '  Test Server  ';
                if (name === 'server_url') return `  ${testServerUrl}  `;
                if (name === 'api_key') return '  new-api-key-123  ';
                return null;
            });

            await updateServerExecute(
                mockInteraction as ChatInputCommandInteraction
            );

            expect(mockUpdateServer).toHaveBeenCalledWith('test-user-123', 'Test Server', {
                serverUrl: testServerUrl,
                apiKey: 'new-api-key-123',
            });
        });

        it('should handle error when no fields provided', async () => {
            (mockInteraction.options!.getString as jest.Mock<(name: string) => string | null>).mockImplementation((name: string) => {
                if (name === 'server_name') return 'Test Server';
                return null;
            });

            const testError = new Error('No fields to update. Please provide at least one field (server_url or api_key).');
            mockUpdateServer.mockImplementation(() => {
                throw testError;
            });

            mockBuildError.mockReturnValue({
                content: 'Error: No fields to update',
                ephemeral: true,
            });

            await updateServerExecute(
                mockInteraction as ChatInputCommandInteraction
            );

            expect(mockBuildError).toHaveBeenCalledWith(mockInteraction, testError);
        });

        it('should handle server not found error', async () => {
            mockGetServersByUserId.mockReturnValue([]);

            mockBuildError.mockReturnValue({
                content: 'Error: Server not found',
                ephemeral: true,
            });

            const result = await updateServerExecute(
                mockInteraction as ChatInputCommandInteraction
            );
            if (!('content' in result)) {
                fail('Expected result to have content, but it had embeds/files instead');
            }
            expect(mockBuildError).toHaveBeenCalledWith(
                mockInteraction,
                expect.objectContaining({
                    message: expect.stringContaining('not found')
                })
            );
            expect(result.content).toContain('Error');
        });

        it('should handle database errors', async () => {
            const testError = new Error('Database error');
            mockUpdateServer.mockImplementation(() => {
                throw testError;
            });

            mockBuildError.mockReturnValue({
                content: 'Error updating server',
                ephemeral: true,
            });

            const result = await updateServerExecute(
                mockInteraction as ChatInputCommandInteraction
            );
            if (!('content' in result)) {
                fail('Expected result to have content, but it had embeds/files instead');
            }
            expect(mockBuildError).toHaveBeenCalledWith(mockInteraction, testError);
            expect(result.content).toBe('Error updating server');
            
        });

        it('should handle pterodactyl API validation failure', async () => {
            server.use(
                http.get(`${testServerUrl}/api/client`, () => {
                    return new HttpResponse(null, { status: 401 });
                })
            );

            await updateServerExecute(
                mockInteraction as ChatInputCommandInteraction
            );

            expect(mockBuildError).toHaveBeenCalledWith(
                mockInteraction,
                expect.objectContaining({
                    message: expect.stringContaining('Failed to connect to the Pterodactyl panel')
                })
            );
            expect(mockUpdateServer).not.toHaveBeenCalled();
        });

        it('should remove trailing slash from server URL', async () => {
            (mockInteraction.options!.getString as jest.Mock<(name: string) => string | null>).mockImplementation((name: string) => {
                if (name === 'server_name') return 'Test Server';
                if (name === 'server_url') return `${testServerUrl}/`;
                if (name === 'api_key') return null;
                return null;
            });

            await updateServerExecute(
                mockInteraction as ChatInputCommandInteraction
            );

            expect(mockUpdateServer).toHaveBeenCalledWith('test-user-123', 'Test Server', {
                serverUrl: testServerUrl,
            });
        });
    });
});
