import { jest } from '@jest/globals';
import type { ChatInputCommandInteraction, Client } from 'discord.js';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { createMockInteraction, createMockClient } from '../../utils/command_test_utils.js';

// Set allowed hosts for SSRF bypass
process.env.PTERODACTYL_ALLOWED_HOSTS = 'panel.example.com,custom-panel.com';

const testServerUrl = 'https://panel.example.com';

const handlers = [
    http.get(`${testServerUrl}/api/client`, () => {
        return HttpResponse.json({ data: [] });
    }),
];

const server = setupServer(...handlers);

// Mock Database
const mockAddServer = jest.fn();
const mockDbClose = jest.fn();

const mockDb = {
    addServer: mockAddServer,
    getServerById: jest.fn(),
    getServersByUserId: jest.fn(),
    close: mockDbClose,
};

// Mock @pookiesoft/bongbot-core
const mockBuildError = jest.fn();

jest.unstable_mockModule('@pookiesoft/bongbot-core', () => ({
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
const { default: RegisterServer } = await import('../../../src/commands/pterodactyl/register_server.js');
const { Caller } = await import('@pookiesoft/bongbot-core');

// Create instance with mock dependencies
const caller = new Caller();
const registerServerInstance = new RegisterServer(mockDb as any, caller as any);
const registerServerExecute = registerServerInstance.execute.bind(registerServerInstance);

describe('register_server command', () => {
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

        const baseInteraction = createMockInteraction({
            commandName: 'register_server',
        });

        mockInteraction = {
            ...baseInteraction,
            user: {
                ...baseInteraction.user,
                id: 'test-user-123',
            },
            options: {
                getString: jest.fn((key: string, _required?: boolean) => {
                    const options: { [key: string]: string } = {
                        server_url: 'https://panel.example.com',
                        api_key: 'test-api-key-123',
                        server_name: 'My Test Server',
                    };
                    return options[key] || null;
                }),
            },
        } as any;

        mockClient = createMockClient() as any;

        mockAddServer.mockReturnValue(42);
        mockBuildError.mockReturnValue({
            content: 'Error occurred',
            ephemeral: true,
        });
    });

    describe('execute function', () => {
        it('should successfully register a new server', async () => {
            mockAddServer.mockReturnValue(42);

            const result = await registerServerExecute(mockInteraction as ChatInputCommandInteraction);

            expect(mockAddServer).toHaveBeenCalledWith({
                userId: 'test-user-123',
                serverName: 'My Test Server',
                serverUrl: 'https://panel.example.com',
                apiKey: 'test-api-key-123',
            });
            expect(result).toEqual({
                content: expect.stringContaining('Successfully registered server'),
                ephemeral: true,
            });
            expect((result as any).content).toContain('My Test Server');
        });

        it('should remove trailing slash from server URL', async () => {
            const getString = jest.fn((key: string, _required?: boolean) => {
                const options: { [key: string]: string } = {
                    server_url: 'https://panel.example.com/',
                    api_key: 'test-api-key',
                    server_name: 'Test Server',
                };
                return options[key] || null;
            });

            mockInteraction.options = { getString } as any;
            mockAddServer.mockReturnValue(1);

            await registerServerExecute(mockInteraction as ChatInputCommandInteraction);

            expect(mockAddServer).toHaveBeenCalledWith({
                userId: 'test-user-123',
                serverName: 'Test Server',
                serverUrl: 'https://panel.example.com',
                apiKey: 'test-api-key',
            });
        });

        it('should handle database errors', async () => {
            const testError = new Error('Database connection failed');
            mockAddServer.mockImplementation(() => {
                throw testError;
            });

            mockBuildError.mockReturnValue({
                content: 'Error occurred',
                ephemeral: true,
                isError: true,
            });

            const result = await registerServerExecute(mockInteraction as ChatInputCommandInteraction);

            expect(mockBuildError).toHaveBeenCalledWith(mockInteraction, testError);
            expect((result as any).isError).toBe(true);
        });

        it('should handle duplicate server error', async () => {
            const duplicateError = new Error('This server is already registered for this user.');
            mockAddServer.mockImplementation(() => {
                throw duplicateError;
            });

            await registerServerExecute(mockInteraction as ChatInputCommandInteraction);

            expect(mockBuildError).toHaveBeenCalledWith(mockInteraction, duplicateError);
        });

        it('should handle errors and call buildError', async () => {
            const testError = new Error('Test error');
            mockAddServer.mockImplementation(() => {
                throw testError;
            });

            mockBuildError.mockReturnValue({
                content: 'Error occurred',
                ephemeral: true,
                isError: true,
            });

            await registerServerExecute(mockInteraction as ChatInputCommandInteraction);

            expect(mockBuildError).toHaveBeenCalledWith(mockInteraction, testError);
        });

        it('should extract all options from interaction correctly', async () => {
            server.use(
                http.get('https://custom-panel.com/api/client', () => {
                    return HttpResponse.json({ data: [] });
                })
            );

            const getString = jest.fn((key: string, _required?: boolean) => {
                const map: { [key: string]: string } = {
                    server_url: 'https://custom-panel.com',
                    api_key: 'custom-key-xyz',
                    server_name: 'Custom Server Name',
                };
                return map[key] || null;
            });

            mockInteraction.options = { getString } as any;

            await registerServerExecute(mockInteraction as ChatInputCommandInteraction);

            expect(getString).toHaveBeenCalledWith('server_url', true);
            expect(getString).toHaveBeenCalledWith('api_key', true);
            expect(getString).toHaveBeenCalledWith('server_name', true);

            expect(mockAddServer).toHaveBeenCalledWith({
                userId: 'test-user-123',
                serverName: 'Custom Server Name',
                serverUrl: 'https://custom-panel.com',
                apiKey: 'custom-key-xyz',
            });
        });

        it('should handle pterodactyl API validation failure', async () => {
            server.use(
                http.get(`${testServerUrl}/api/client`, () => {
                    return new HttpResponse(null, { status: 401 });
                })
            );

            await registerServerExecute(mockInteraction as ChatInputCommandInteraction);

            expect(mockBuildError).toHaveBeenCalledWith(
                mockInteraction,
                expect.objectContaining({
                    message: expect.stringContaining('Failed to connect to the Pterodactyl panel'),
                })
            );
            expect(mockAddServer).not.toHaveBeenCalled();
        });

        it('should reject empty server name', async () => {
            const getString = jest.fn((key: string, _required?: boolean) => {
                const options: { [key: string]: string } = {
                    server_url: 'https://panel.example.com',
                    api_key: 'test-api-key',
                    server_name: '   ',
                };
                return options[key] || null;
            });

            mockInteraction.options = { getString } as any;

            await registerServerExecute(mockInteraction as ChatInputCommandInteraction);

            expect(mockBuildError).toHaveBeenCalledWith(
                mockInteraction,
                expect.objectContaining({
                    message: 'Server name cannot be empty or whitespace.',
                })
            );
            expect(mockAddServer).not.toHaveBeenCalled();
        });

        it('should reject empty string server name', async () => {
            const getString = jest.fn((key: string, _required?: boolean) => {
                const options: { [key: string]: string | null } = {
                    server_url: 'https://panel.example.com',
                    api_key: 'test-api-key',
                    server_name: '',
                };
                return key in options ? options[key] : null;
            });

            mockInteraction.options = { getString } as any;

            await registerServerExecute(mockInteraction as ChatInputCommandInteraction);

            expect(mockBuildError).toHaveBeenCalledWith(
                mockInteraction,
                expect.objectContaining({
                    message: 'Server name cannot be empty or whitespace.',
                })
            );
            expect(mockAddServer).not.toHaveBeenCalled();
        });
    });
});
