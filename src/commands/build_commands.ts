import { Collection } from 'discord.js';
import type { ExtendedClient } from '@pookiesoft/bongbot-core';
import pterodactyl from './pterodactyl/master.js';

const commandsArray = [ pterodactyl ];

/** TODO: Move to BongBot-Core as buildCommands(client, commandsArray) */
export default function buildCommands(client: ExtendedClient) {
    const commands: Array<any> = [];
    client.commands = new Collection<string, any>();
    for (const command of commandsArray) {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
    }
    return commands;
}