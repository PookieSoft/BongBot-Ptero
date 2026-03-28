import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

/** ensure that bongbot-core is built before building this package */
const __dirname = dirname(fileURLToPath(import.meta.url));
const coreDir = join(__dirname, 'node_modules', 'bongbot-core');

execSync('npm run build', { cwd: coreDir, stdio: 'inherit' });
execSync('npx tsc', { stdio: 'inherit' });
