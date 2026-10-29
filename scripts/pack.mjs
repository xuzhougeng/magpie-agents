import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { packages, root } from './packages.mjs';
import './check.mjs';

const destination = join(root, 'artifacts');
await mkdir(destination, { recursive: true });
const cache = await mkdtemp(join(tmpdir(), 'magpie-npm-'));
try {
  for (const { path } of await packages()) {
    const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['pack', '--pack-destination', destination, '--cache', cache, '--ignore-scripts'], { cwd: path, stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`npm pack failed: ${result.status}`);
  }
} finally {
  await rm(cache, { recursive: true, force: true });
}
