import { beforeAll, describe, expect, it, vi } from 'vitest';

const coreMocks = vi.hoisted(() => ({
    startWithFunctions: vi.fn(async () => ({})),
}));

vi.mock('@pookiesoft/bongbot-core', () => ({
    startWithFunctions: coreMocks.startWithFunctions,
    buildError: vi.fn(),
    Caller: vi.fn(),
    LOGGER: { log: vi.fn(), default: { info: vi.fn() } },
    commandBuilder: vi.fn((client: any, commands: any[]) => {
        commands.forEach((cmd) => client.commands.set(cmd.data.name, cmd));
    }),
}));

describe('Standalone Bot', () => {
    beforeAll(async () => {
        await import('../src/standalone.js');
    }, 30_000);

    it('should have called bongbot-core with the correct arguments', () => {
        expect(coreMocks.startWithFunctions).toHaveBeenCalledWith(
            'PookieSoft',
            'BongBot-Ptero',
            expect.any(Function),
            ['setupCollector']
        );
    });
});
