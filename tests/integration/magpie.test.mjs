// Runs the real Magpie engine. No emulated backup/restore implementation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, copyFile, chmod, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { packages, root } from '../../scripts/packages.mjs';

const run = promisify(execFile);
const binary = process.env.MAGPIE_BIN;
if (!binary) throw new Error('Set MAGPIE_BIN to an official Magpie CLI. Run npm run pack first.');
const probes = {
  wispterm: process.env.WISPTERM_PROBE_BIN,
  'wisp-science': process.env.WISP_SCIENCE_PROBE_BIN,
  citebox: process.env.CITEBOX_PROBE_BIN,
};
if (process.env.MAGPIE_VERIFY_APPS === '1') assert(Object.values(probes).every(Boolean), 'All three application probes are required');
const readJSON = async path => JSON.parse(await readFile(path, 'utf8'));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

// One sandbox across the three packages, including a private HOME and provider.
test('packed plugins: install → connect → gateway request → switch → restore', { timeout: 180000 }, async t => {
  const sandbox = await mkdtemp(join(tmpdir(), 'magpie-agents-test-'));
  const cleanup = [];
  t.after(async () => { for (const fn of cleanup.reverse()) await fn(); });
  cleanup.push(() => rm(sandbox, { recursive: true, force: true, maxRetries: 3 }));
  const binDir = join(sandbox, 'bin');
  await mkdir(binDir);
  if (process.env.MAGPIE_TEST_BUN) {
    const bun = join(binDir, process.platform === 'win32' ? 'bun.exe' : 'bun');
    await copyFile(process.env.MAGPIE_TEST_BUN, bun);
    await chmod(bun, 0o700);
  }
  const env = { ...process.env, HOME: sandbox, USERPROFILE: sandbox, XDG_CONFIG_HOME: join(sandbox, '.config'),
    XDG_CACHE_HOME: join(sandbox, '.cache'), APPDATA: join(sandbox, 'AppData'), LOCALAPPDATA: join(sandbox, 'LocalAppData'),
    MAGPIE_NO_ACCOUNTS: '1', PATH: `${binDir}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH}` };
  if (process.env.MAGPIE_TEST_BUN) env.MAGPIE_BUN = join(binDir, process.platform === 'win32' ? 'bun.exe' : 'bun');
  const cli = async (...args) => {
    const result = await run(resolve(binary), args, { env, timeout: 90000 });
    return result.stdout;
  };
  const received = [];
  const upstream = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/v1/models') return res.end(JSON.stringify({ data: ['first', 'second'].map(id => ({ id, object: 'model' })) }));
    if (req.url !== '/v1/chat/completions') { res.statusCode = 404; return res.end('{}'); }
    let data = '';
    for await (const chunk of req) data += chunk;
    const body = JSON.parse(data);
    received.push({ model: body.model, authorization: req.headers.authorization });
    res.end(JSON.stringify({ id: 'fixture-chat', object: 'chat.completion', created: 0, model: body.model,
      choices: [{ index: 0, message: { role: 'assistant', content: 'fixture-ok' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } }));
  });
  upstream.listen(0, '127.0.0.1');
  await once(upstream, 'listening');
  cleanup.push(() => { upstream.closeAllConnections(); upstream.close(); });
  const portProbe = createServer();
  portProbe.listen(0, '127.0.0.1');
  await once(portProbe, 'listening');
  const gatewayPort = portProbe.address().port;
  await new Promise(resolve => portProbe.close(resolve));
  const configDir = join(sandbox, '.config', 'magpie');
  await mkdir(configDir, { recursive: true });
  await writeFile(join(configDir, 'settings.json'), JSON.stringify({ port: gatewayPort }));
  await cli('provider', 'add', 'fixture', `url=http://127.0.0.1:${upstream.address().port}/v1`, 'key=upstream-test-only', 'models=first,second');

  const entries = await packages();
  for (const entry of entries) {
    const installDir = join(sandbox, entry.dir);
    await mkdir(installDir);
    const tarball = `${entry.pkg.name.replace('@', '').replace('/', '-')}-${entry.pkg.version}.tgz`;
    await run('tar', ['-xzf', join(root, 'artifacts', tarball), '-C', installDir]);
    const folder = join(sandbox, '.config', entry.dir.slice('agent-'.length));
    await assert.rejects(readdir(folder), { code: 'ENOENT' });
    await cli('plugin', 'add', join(installDir, 'package'));
    // Installation itself must initialize the folder, before any separate CLI
    // command, provider login, connection or manual directory creation.
    assert.deepEqual(await readdir(folder), [], `${entry.dir}: install must create an empty detection directory`);
  }
  const agents = await cli('agents');
  for (const name of ['WispTerm', 'Wisp Science', 'CiteBox']) {
    assert(agents.includes(name), `Installed agent missing from Magpie: ${name}`);
  }
  await t.test('desktop discovery: installed plugins are immediately detected without manual setup', async () => {
    // `agents` includes undetected plugins; only `ls` proves that they are
    // eligible for the desktop list. Exclude any real app CLI from PATH.
    const detected = async () => (await run(resolve(binary), ['ls'], {
      env: { ...env, PATH: binDir }, timeout: 90000,
    })).stdout;
    const listing = await detected();
    for (const { dir } of entries) {
      const { agent } = await import(pathToFileURL(join(root, 'packages', dir, 'agent.js')));
      const folder = join(sandbox, '.config', agent.id);
      const row = listing.split('\n').find(line => line.includes(agent.name));
      assert(row && !row.includes('not detected'), `${agent.name} missing from detected agents after install`);
      await assert.rejects(readFile(join(folder, 'magpie.json')), { code: 'ENOENT' });
    }
  });
  const daemon = spawn(resolve(binary), ['serve'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '';
  daemon.stderr.on('data', chunk => { logs = (logs + chunk).slice(-3000); });
  daemon.stdout.on('data', () => {});
  cleanup.push(async () => {
    if (daemon.exitCode !== null || daemon.signalCode !== null) return;
    const stopped = once(daemon, 'exit');
    daemon.kill();
    const timer = setTimeout(() => daemon.kill('SIGKILL'), 2000);
    await stopped;
    clearTimeout(timer);
  });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { ready = (await fetch(`http://127.0.0.1:${gatewayPort}/api/hello`)).ok; } catch {}
    if (ready || daemon.exitCode !== null) break;
    await pause(100);
  }
  assert(ready, `Gateway did not start: ${logs}`);

  for (const { dir } of entries) {
    const id = dir.slice('agent-'.length);
    await t.test(`${id}: preserves original values and unrelated edits`, async () => {
      const folder = join(sandbox, '.config', id);
      await mkdir(folder, { recursive: true });
      const file = join(folder, 'magpie.json');
      const original = { baseURL: 'https://original.example/v1', apiKey: 'original-test-key', model: 'original/model', extra: { theme: 'dark', enabled: true, count: 7 } };
      await writeFile(file, JSON.stringify(original));
      for (const model of ['first', 'second']) {
        await cli(id, `fixture/${model}`);
        const config = await readJSON(file);
        assert.equal(config.baseURL, `http://127.0.0.1:${gatewayPort}/v1`);
        assert.equal(config.apiKey, `magpie-${id}`);
        assert.equal(config.model, `fixture/${model}`);
        assert.deepEqual(config.extra, original.extra);
        const response = await fetch(`${config.baseURL}/chat/completions`, { method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
          body: JSON.stringify({ model: config.model, messages: [{ role: 'user', content: 'fixture' }], stream: false }) });
        assert.equal(response.status, 200, await response.clone().text());
        assert.equal((await response.json()).choices[0].message.content, 'fixture-ok');
        assert.deepEqual(received.at(-1), { model, authorization: 'Bearer upstream-test-only' });
        if (probes[id]) {
          const args = id === 'citebox' ? ['-test.run=^TestMagpieExternalGateway$', '-test.v'] : [];
          const beforeProbe = received.length;
          await run(resolve(probes[id]), args, { env: { ...env, MAGPIE_TEST_CONFIG: file }, timeout: 30000 });
          assert.equal(received.length, beforeProbe + 1, `${id} must make its own upstream request`);
          assert.deepEqual(received.at(-1), { model, authorization: 'Bearer upstream-test-only' });
          t.diagnostic(`${id} application client reached fixture/${model} through Magpie`);
        }
      }
      const connected = await readJSON(file);
      connected.userAdded = 'preserve me';
      await writeFile(file, JSON.stringify(connected));
      await cli(id, 'default');
      assert.deepEqual(await readJSON(file), { ...original, userAdded: 'preserve me' });
      // Do not disconnect twice: Magpie 0.1.1986 deletes the restored model
      // on a second `default` (upstream behavior; see docs/verification.md).
      // Missing and partial settings are restored as missing, not empty strings.
      for (const initial of [null, { model: 'personal', extra: false }, { model: 12, baseURL: false, apiKey: null }]) {
        await rm(file);
        if (initial !== null) await writeFile(file, JSON.stringify(initial));
        await cli(id, 'fixture/first');
        await cli(id, 'fixture/second');
        await cli(id, 'default');
        const restored = await readJSON(file).catch(err => { if (err.code === 'ENOENT') return {}; throw err; });
        assert.deepEqual(restored, initial ?? {});
      }
    });
  }
});
