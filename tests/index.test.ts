import { jest, describe, it, expect, beforeAll } from '@jest/globals';

describe('index.ts', () => {
    describe('when imported as a module (isMain=false)', () => {
        let indexModule: any;
        const mockStartBot = jest.fn();

        beforeAll(async () => {
            jest.unstable_mockModule('../src/standalone.js', () => ({
                startBot: mockStartBot,
            }));
            jest.unstable_mockModule('../src/commands/pterodactyl/master.js', () => ({
                default: { data: { name: 'pterodactyl' }, execute: jest.fn() },
            }));
            indexModule = await import('../src/index.js');
        });

        it('exports pterodactyl command for composite use', () => {
            expect(indexModule.pterodactyl).toBeDefined();
            expect(indexModule.pterodactyl.data.name).toBe('pterodactyl');
        });

        it('does not call startBot', () => {
            expect(mockStartBot).not.toHaveBeenCalled();
        });
    });

    describe('when run as main entry (isMain=true)', () => {
        const mockStartBot = jest.fn();

        beforeAll(async () => {
            jest.resetModules();
            jest.unstable_mockModule('../src/standalone.js', () => ({
                startBot: mockStartBot,
            }));
            jest.unstable_mockModule('../src/commands/pterodactyl/master.js', () => ({
                default: { data: { name: 'pterodactyl' }, execute: jest.fn() },
            }));
            jest.unstable_mockModule('path', () => ({
                resolve: jest.fn(() => '/same/path'),
            }));
            jest.unstable_mockModule('url', () => ({
                fileURLToPath: jest.fn(() => '/same/path'),
            }));
            await import('../src/index.js');
        });

        it('calls startBot', () => {
            expect(mockStartBot).toHaveBeenCalled();
        });
    });
});
