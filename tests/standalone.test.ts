import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// 1. Define the mock FIRST
jest.unstable_mockModule('@pookiesoft/bongbot-core', () => ({
    startWithFunctions: jest.fn(async () => ({})),
    buildError: jest.fn(),
    Caller: jest.fn(),
    LOGGER: { log: jest.fn(), default: { info: jest.fn() } },
    commandBuilder: jest.fn((client: any, commands: any[]) => {
        commands.forEach(cmd => client.commands.set(cmd.data.name, cmd));
    }), 
}));

describe('Standalone Bot', () => {
    let coreMock: any;

    beforeAll(async () => {
        // 2. Import the MOCK version of the module dynamically
        coreMock = await import('@pookiesoft/bongbot-core');
        // 3. Import your source file
        await import('../src/standalone.js');
    });

    it('should have called bongbot-core with the correct arguments', () => {
        // 4. Assert against the version from coreMock
        expect(coreMock.startWithFunctions).toHaveBeenCalledWith(
            'PookieSoft',
            'BongBot-Ptero',
            expect.any(Function),
            ['setupCollector']
        );
    });
});