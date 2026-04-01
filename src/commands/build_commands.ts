import type { ExtendedClient } from '@pookiesoft/bongbot-core';
import { commandBuilder } from '@pookiesoft/bongbot-core';
import pterodactyl from './pterodactyl/master.js';

const commandsArray = [ pterodactyl ];

export default function buildCommands(client: ExtendedClient) {
    return commandBuilder(client, commandsArray);
}