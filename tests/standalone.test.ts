import { beforeAll, describe, expect, it, vi } from 'vitest';

const { mockStartWithFunctions } = vi.hoisted(() => ({
    mockStartWithFunctions: vi.fn(async () => ({})),
}));

vi.mock('/node_modules/@pookiesoft/bongbot-core/dist/index.js', () => ({
    startWithFunctions: mockStartWithFunctions,
}));

vi.mock('/src/commands/build_commands.ts', () => ({
    default: vi.fn(),
}));

describe('Standalone Bot', () => {
    beforeAll(async () => {
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
