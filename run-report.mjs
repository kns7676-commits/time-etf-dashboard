import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const [variant, ...args] = process.argv.slice(2);
if (!['original', 'daily', 'extended'].includes(variant)) {
  console.error('Usage: node run-report.mjs original|daily|extended [--dry-run|--telegram|--build]');
  process.exit(1);
}
// Each report keeps its own baseline and output; never overwrite dashboard history.
const cwd = fileURLToPath(new URL(`./reports/${variant}/`, import.meta.url));
const result = spawnSync(process.execPath, ['weekly.mjs', ...(args.length ? args : ['--dry-run'])], {cwd, stdio:'inherit'});
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
