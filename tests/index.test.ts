import { beforeAll, describe, expect, it, vi } from 'vitest';

// Mock pterodactyl master
vi.mock('../src/commands/pterodactyl/master.js', () => ({
    default: { data: { name: 'pterodactyl' }, execute: vi.fn() },
}));

describe('index.ts', () => {
    let indexModule: any;

    beforeAll(async () => {
        indexModule = await import('../src/index.js');
    });

    it('exports pterodactyl command for composite use', () => {
        expect(indexModule.pterodactyl).toBeDefined();
        expect(indexModule.pterodactyl.data.name).toBe('pterodactyl');
    });
});
