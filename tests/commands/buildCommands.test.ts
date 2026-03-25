import { jest } from '@jest/globals';
import { Collection } from 'discord.js';
import type { ExtendedClient } from 'bongbot-core';

// Mock the pterodactyl master command to avoid pulling in bongbot-core transitively
jest.unstable_mockModule('../../src/commands/pterodactyl/master.js', () => ({
    default: { data: { name: 'pterodactyl', toJSON: () => ({ name: 'pterodactyl' }) } },
}));

// Import after mocks are set up
const { default: buildCommands } = await import('../../src/commands/buildCommands.js');

describe('buildCommands', () => {
    let mockClient: ExtendedClient;

    beforeEach(() => {
        mockClient = {
            commands: new Collection(),
        } as unknown as ExtendedClient;
    });

    it('should create a commands collection on the client', () => {
        buildCommands(mockClient);

        expect(mockClient.commands).toBeInstanceOf(Collection);
    });

    it('should add the pterodactyl command to the collection', () => {
        buildCommands(mockClient);

        expect(mockClient.commands?.size).toBe(1);
        expect(mockClient.commands?.has('pterodactyl')).toBe(true);
    });

    it('should store the command object with its data', () => {
        buildCommands(mockClient);

        const command = mockClient.commands?.get('pterodactyl');
        expect(command).toBeDefined();
        expect(command).toHaveProperty('data');
        expect(command.data.name).toBe('pterodactyl');
    });

    it('should not throw when building commands', () => {
        expect(() => buildCommands(mockClient)).not.toThrow();
    });
});
