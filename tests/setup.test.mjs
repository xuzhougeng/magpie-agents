import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, readdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { packages } from '../scripts/packages.mjs';

const run = promisify(execFile);
for (const { dir, path } of await packages()) {
  const id = dir.slice('agent-'.length);
  const setup = pathToFileURL(join(path, 'setup.mjs')).href;
  const sandbox = async t => {
    const home = await mkdtemp(join(tmpdir(), 'magpie-setup-'));
    t.after(() => rm(home, { recursive: true, force: true }));
    const env = { ...process.env, HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: join(home, 'other-config') };
    const initialize = () => run(process.execPath, ['--input-type=module', '-e',
      `const { initializeAgent } = await import(${JSON.stringify(setup)}); await initializeAgent(); await initializeAgent();`], { env });
    return { home, folder: join(home, '.config', id), initialize };
  };

  test(`${id}: loading initializes only its empty detection directory`, async t => {
    const { home, folder, initialize } = await sandbox(t);
    await initialize();
    assert.deepEqual(await readdir(home), ['.config']);
    assert.deepEqual(await readdir(join(home, '.config')), [id]);
    assert.deepEqual(await readdir(folder), []);
    if (process.platform !== 'win32') assert.equal((await stat(folder)).mode & 0o777, 0o700);
  });

  test(`${id}: reloading preserves existing settings and directory permissions`, async t => {
    const { folder, initialize } = await sandbox(t);
    await mkdir(folder, { recursive: true, mode: 0o755 });
    const file = join(folder, 'magpie.json');
    const original = '{ "model": "personal/model", "apiKey": "test-only", "extra": 7 }\n';
    await writeFile(file, original, { mode: 0o600 });
    const mode = (await stat(folder)).mode;
    await initialize();
    assert.equal(await readFile(file, 'utf8'), original);
    assert.equal((await stat(folder)).mode, mode);
  });

  test(`${id}: a conflicting file causes a visible error without replacing it`, async t => {
    const { home, folder, initialize } = await sandbox(t);
    await mkdir(join(home, '.config'));
    await writeFile(folder, 'keep this file');
    await assert.rejects(initialize(), /EEXIST/);
    assert.equal(await readFile(folder, 'utf8'), 'keep this file');
  });
}
