import { beforeAll, describe, expect, it, vi } from 'vitest';

const mockStartWithFunctions = vi.fn(async () => ({}));

describe('Standalone Bot', () => {
    beforeAll(async () => {
        vi.doMock('@pookiesoft/bongbot-core', () => ({
            startWithFunctions: mockStartWithFunctions,
            buildError: vi.fn(),
            Caller: vi.fn(),
            LOGGER: { log: vi.fn(), default: { info: vi.fn() } },
            commandBuilder: vi.fn((client: any, commands: any[]) => {
                commands.forEach((cmd) => client.commands.set(cmd.data.name, cmd));
            }),
        }));
        await import('../src/standalone.js');
    }, 30_000);

    it('should have called bongbot-core with the correct arguments', () => {
        expect(mockStartWithFunctions).toHaveBeenCalledWith(
            'PookieSoft',
            'BongBot-Ptero',
            expect.any(Function),
            ['setupCollector']
        );
    });
});
