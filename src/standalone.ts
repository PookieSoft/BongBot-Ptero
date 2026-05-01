import type { ExtendedClient } from '@pookiesoft/bongbot-core';
import { startWithFunctions } from '@pookiesoft/bongbot-core';
import buildCommands from './commands/build_commands.js';

// TODO: [TECHNICAL_DEBT 3.6] Allow env var overrides for forkability
const GITHUB_REPO_OWNER = 'PookieSoft';
const GITHUB_REPO_NAME = 'BongBot-Ptero';

const bot: ExtendedClient = await startWithFunctions(GITHUB_REPO_OWNER, GITHUB_REPO_NAME, buildCommands, [
    'setupCollector',
]);
