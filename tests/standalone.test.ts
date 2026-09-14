import { beforeAll, describe, expect, it, vi } from 'vitest';

const { mockStartWithFunctions } = vi.hoisted(() => ({
    mockStartWithFunctions: vi.fn(async () => ({})),
}));

vi.mock(import('@pookiesoft/bongbot-core'), async (importOriginal) => ({
    ...(await importOriginal()),
    startWithFunctions: mockStartWithFunctions,
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
