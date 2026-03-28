/** export commands for use on composite bot */
export { default as pterodactyl } from './commands/pterodactyl/master.js';

import { fileURLToPath } from 'url';
import { resolve } from 'path';
import { startBot } from './standalone.js';

/** Start standalone when run directly */
const isMain = resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
    startBot();
}
