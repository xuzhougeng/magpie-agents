import { spawnSync } from 'node:child_process';
import { packages, root } from './packages.mjs';

const [selected, ...flags] = process.argv.slice(2);
const entry = (await packages()).find(p => p.dir === selected || p.pkg.name === selected);
if (!entry || flags.some(f => f !== '--publish')) {
  throw new Error('Usage: npm run release -- agent-wispterm [--publish]. Default: npm publish --dry-run.');
}
for (const args of [['scripts/check.mjs'], ['--test', 'tests/plugins.test.mjs', 'tests/setup.test.mjs']]) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) throw new Error('Release checks failed');
}
const args = ['publish', '--access', 'public', '--tag', entry.pkg.publishConfig.tag, '--ignore-scripts'];
if (!flags.includes('--publish')) args.push('--dry-run');
const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { cwd: entry.path, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
