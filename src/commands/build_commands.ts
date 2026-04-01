import type { ExtendedClient } from '@pookiesoft/bongbot-core';
import { commandBuilder } from '@pookiesoft/bongbot-core';
import pterodactyl from './pterodactyl/master.js';

export default function buildCommands(client: ExtendedClient) {
    return commandBuilder(client, [ pterodactyl ]);
}