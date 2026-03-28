import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

/** ensure that bongbot-core is built before building this package */
const __dirname = dirname(fileURLToPath(import.meta.url));
const nested = join(__dirname, 'node_modules', 'bongbot-core');
const hoisted = join(__dirname, '..', 'bongbot-core');
const coreDir = existsSync(nested) ? nested : hoisted;

execSync('npm run build', { cwd: coreDir, stdio: 'inherit' });
execSync('npx tsc', { stdio: 'inherit' });
