import { describe, expect, it, vi } from 'vitest';
import '../src/standalone.js';

const { mockStartWithFunctions } = vi.hoisted(() => ({
    mockStartWithFunctions: vi.fn(async () => ({})),
}));

vi.mock('@pookiesoft/bongbot-core', () => ({
    startWithFunctions: mockStartWithFunctions,
}));

vi.mock('../src/commands/build_commands.js', () => ({
    default: vi.fn(),
}));

describe('Standalone Bot', () => {
    it('should have called bongbot-core with the correct arguments', () => {
        expect(mockStartWithFunctions).toHaveBeenCalledWith(
            'PookieSoft',
            'BongBot-Ptero',
            expect.any(Function),
            ['setupCollector']
        );
    });
});
