import { describe, expect, it, vi } from 'vitest';
import { startWithFunctions } from '@pookiesoft/bongbot-core';
import '../src/standalone.js';

vi.mock('/node_modules/@pookiesoft/bongbot-core/dist/config/startups.js', () => ({
    basicStart: vi.fn(),
    commandBuilder: vi.fn(),
    startBot: vi.fn(),
    startWithHandlers: vi.fn(),
    startWithFunctions: vi.fn(async () => ({})),
}));

vi.mock('../src/commands/build_commands.js', () => ({
    default: vi.fn(),
}));

describe('Standalone Bot', () => {
    it('should have called bongbot-core with the correct arguments', () => {
        expect(startWithFunctions).toHaveBeenCalledWith('PookieSoft', 'BongBot-Ptero', expect.any(Function), [
            'setupCollector',
        ]);
    });
});
