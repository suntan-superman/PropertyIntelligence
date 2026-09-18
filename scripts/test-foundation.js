import { spawnSync } from 'node:child_process';
import { root, writeJson } from '../src/io/files.js';
const run = spawnSync(process.execPath, ['--import','./src/analysis/offline.js','--test', '--test-reporter=tap', 'tests'], { cwd:root, encoding:'utf8' });
process.stdout.write(run.stdout || '');
process.stderr.write(run.stderr || '');
const count = (label) => Number(run.stdout?.match(new RegExp(`^# ${label} (\\d+)$`, 'm'))?.[1] ?? 0);
await writeJson('data/validation/sprint3_2-unit-tests.json', { at:new Date().toISOString(),
  command:'node --import ./src/analysis/offline.js --test --test-reporter=tap tests', tests:count('tests'), passed:count('pass'),
  failed:count('fail'), exitCode:run.status ?? 1, networkDisabled:true,liveCalls:0 });
process.exitCode = run.status ?? 1;
