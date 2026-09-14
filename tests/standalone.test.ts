import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@pookiesoft/bongbot-core', () => ({
    startWithFunctions: vi.fn(async () => ({})),
    buildError: vi.fn(),
    Caller: vi.fn(),
    LOGGER: { log: vi.fn(), default: { info: vi.fn() } },
    commandBuilder: vi.fn((client: any, commands: any[]) => {
        commands.forEach((cmd) => client.commands.set(cmd.data.name, cmd));
    }),
}));

describe('Standalone Bot', () => {
    let coreMock: any;

    beforeAll(async () => {
        coreMock = await import('@pookiesoft/bongbot-core');
        await import('../src/standalone.js');
    });

    it('should have called bongbot-core with the correct arguments', () => {
        expect(coreMock.startWithFunctions).toHaveBeenCalledWith('PookieSoft', 'BongBot-Ptero', expect.any(Function), [
            'setupCollector',
        ]);
    });
});
