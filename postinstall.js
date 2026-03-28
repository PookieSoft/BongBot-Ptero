import { execSync } from 'child_process';
import { createRequire } from 'module';
import { dirname } from 'path';
/** ensure that bongbot-core is built before building this package */
const require = createRequire(import.meta.url);
const coreDir = dirname(require.resolve('bongbot-core/package.json'));

execSync('npm run build', { cwd: coreDir, stdio: 'inherit' });
execSync('npx tsc', { stdio: 'inherit' });
