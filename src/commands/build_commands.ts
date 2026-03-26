import { Collection } from 'discord.js';
import type { ExtendedClient } from 'bongbot-core';
import pterodactyl from './pterodactyl/master.js';

const commandsArray = [ pterodactyl ];

export default function buildCommands(client: ExtendedClient) {
    client.commands = new Collection<string, any>();
    for (const command of commandsArray) {
        client.commands.set(command.data.name, command);
    }
}