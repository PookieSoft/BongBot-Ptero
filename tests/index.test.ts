import { jest, describe, it, expect, beforeAll } from '@jest/globals';

const mockStartBot = jest.fn();

// Mock standalone to track if startBot is called
jest.unstable_mockModule('../src/standalone.js', () => ({
    startBot: mockStartBot,
}));

// Mock pterodactyl master
jest.unstable_mockModule('../src/commands/pterodactyl/master.js', () => ({
    default: { data: { name: 'pterodactyl' }, execute: jest.fn() },
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

    it('does not call startBot when imported as a module (isMain=false)', () => {
        expect(mockStartBot).not.toHaveBeenCalled();
    });
});
