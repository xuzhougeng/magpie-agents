// Runs the real Magpie engine. No emulated backup/restore implementation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, copyFile, chmod, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
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
if (process.env.MAGPIE_VERIFY_VISION === '1') assert(probes.wispterm, 'WISPTERM_PROBE_BIN is required for the vision regression');
const fixtureImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';
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
  const wireRequests = [];
  const modelFacts = {
    first: { context_length: 400000, max_output_tokens: 128000, supported_reasoning_levels: ['low', 'medium', 'high'] },
    second: { context_length: 200000, max_output_tokens: 32000, supported_reasoning_levels: ['low', 'high'] },
  };
  const upstream = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/v1/models') return res.end(JSON.stringify({ data: Object.entries(modelFacts).map(([id, facts]) => ({
      id, object: 'model', ...facts, modalities: { input: ['text', 'image'], output: ['text'] },
      supported_endpoints: ['/v1/chat/completions', '/v1/responses'],
    })) }));
    if (!['/v1/chat/completions', '/v1/responses'].includes(req.url)) { res.statusCode = 404; return res.end('{}'); }
    let data = '';
    for await (const chunk of req) data += chunk;
    const body = JSON.parse(data);
    wireRequests.push({ path: req.url, body });
    const images = (body.messages ?? body.input).flatMap(message => Array.isArray(message.content)
      ? message.content.filter(part => part.type === 'image_url' || part.type === 'input_image').map(part => part.image_url.url ?? part.image_url) : []);
    received.push({ model: body.model, authorization: req.headers.authorization, ...(images.length ? { images } : {}) });
    // Magpie may translate Responses to a streamed Chat Completions request.
    if (req.url === '/v1/chat/completions' && body.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.write(`data: ${JSON.stringify({ id: 'fixture-chat', object: 'chat.completion.chunk', model: body.model,
        choices: [{ index: 0, delta: { role: 'assistant', content: 'fixture-ok' }, finish_reason: null }] })}\n\n`);
      res.write(`data: ${JSON.stringify({ id: 'fixture-chat', object: 'chat.completion.chunk', model: body.model,
        choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } })}\n\n`);
      return res.end('data: [DONE]\n\n');
    }
    if (req.url === '/v1/responses') return res.end(JSON.stringify({ id: 'fixture-response', object: 'response', status: 'completed', model: body.model,
      output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'fixture-ok' }] }],
      usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 } }));
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
  await cli('provider', 'refresh', 'fixture');

  const entries = await packages();
  for (const entry of entries) {
    const installDir = join(sandbox, entry.dir);
    await mkdir(installDir);
    const tarball = `${entry.pkg.name.replace('@', '').replace('/', '-')}-${entry.pkg.version}.tgz`;
    await run('tar', ['-xzf', join(root, 'artifacts', tarball), '-C', installDir]);
    const folder = join(sandbox, '.config', entry.dir.slice('agent-'.length));
    await cli('plugin', 'add', join(installDir, 'package'));
    // A plugin must not create files only so Magpie reports its app as installed.
    await assert.rejects(readdir(folder), { code: 'ENOENT' }, `${entry.dir}: install must not create its config folder`);
  }
  const agents = await cli('agents');
  for (const name of ['WispTerm', 'Wisp Science', 'CiteBox']) {
    assert(agents.includes(name), `Installed agent missing from Magpie: ${name}`);
  }
  // `agents` includes undetected plugins; only `ls` lists what the desktop shows.
  const listed = async path => (await run(resolve(binary), ['ls'], { env: { ...env, PATH: path }, timeout: 90000 })).stdout;
  const isDetected = (listing, name) => {
    const row = listing.split('\n').find(line => line.includes(name));
    return Boolean(row) && !row.includes('not detected');
  };
  const agentOf = async dir => (await import(pathToFileURL(join(root, 'packages', dir, 'agent.js')))).agent;
  await t.test('desktop discovery: an agent is detected by its app, not by installing the plugin', async () => {
    // Exclude any real app command from PATH.
    const before = await listed(binDir);
    for (const { dir } of entries) {
      const { name } = await agentOf(dir);
      assert(!isDetected(before, name), `${name} detected with neither its app nor a connection`);
    }
    const appBin = join(sandbox, 'app-bin');
    await mkdir(appBin);
    for (const { dir } of entries) {
      const { bin } = await agentOf(dir);
      const command = join(appBin, process.platform === 'win32' ? `${bin}.cmd` : bin);
      await writeFile(command, process.platform === 'win32' ? '@exit /b 0\r\n' : '#!/bin/sh\nexit 0\n');
      await chmod(command, 0o755);
    }
    const withApps = await listed(`${appBin}${delimiter}${binDir}`);
    for (const { dir } of entries) {
      const { id, name } = await agentOf(dir);
      assert(isDetected(withApps, name), `${name} not detected with its command on PATH`);
      await assert.rejects(readdir(join(sandbox, '.config', id)), { code: 'ENOENT' }, `${name}: detection must not create files`);
    }
    await rm(appBin, { recursive: true });
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

  await t.test('desktop discovery: an undetected agent connects from the CLI and is then detected by its config', async () => {
    for (const { dir } of entries) {
      const { id, name } = await agentOf(dir);
      const folder = join(sandbox, '.config', id);
      await cli(id, 'fixture/first');
      assert.equal((await readJSON(join(folder, 'magpie.json'))).model, 'fixture/first');
      assert(isDetected(await listed(binDir), name), `${name} not detected after connecting`);
      await cli(id, 'default');
      await rm(folder, { recursive: true, force: true });
    }
  });

  for (const { dir } of entries) {
    const id = dir.slice('agent-'.length);
    await t.test(`${id}: preserves original values and unrelated edits`, async agentTest => {
      const folder = join(sandbox, '.config', id);
      await mkdir(folder, { recursive: true });
      const file = join(folder, 'magpie.json');
      const original = { baseURL: 'https://original.example/v1', apiKey: 'original-test-key', model: 'original/model', extra: { theme: 'dark', enabled: true, count: 7 } };
      if (id === 'wispterm') Object.assign(original, { vision: false, modelInfo: { id: 'original/model', context: 9000, output: 1000 } });
      await writeFile(file, JSON.stringify(original));
      for (const model of ['first', 'second']) {
        await cli(id, `fixture/${model}`);
        const config = await readJSON(file);
        assert.equal(config.baseURL, `http://127.0.0.1:${gatewayPort}/v1`);
        assert.equal(config.apiKey, `magpie-${id}`);
        assert.equal(config.model, `fixture/${model}`);
        assert.deepEqual(config.extra, original.extra);
        if (id === 'wispterm') assert.equal(config.vision, false, 'model switches must preserve the user vision override');
        if (id === 'wispterm') assert.deepEqual(config.modelInfo, { id: `fixture/${model}`, context: modelFacts[model].context_length,
          output: modelFacts[model].max_output_tokens, efforts: modelFacts[model].supported_reasoning_levels });
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
          if (id === 'wispterm') {
            const body = wireRequests.at(-1).body;
            assert.equal(body.max_tokens ?? body.max_completion_tokens ?? body.max_output_tokens, modelFacts[model].max_output_tokens);
            assert.equal(body.reasoning_effort ?? body.reasoning?.effort, model === 'first' ? 'medium' : 'high');
          }
          t.diagnostic(`${id} application client reached fixture/${model} through Magpie`);
        }
      }
      if (id === 'wispterm' && probes.wispterm) {
        await agentTest.test('WispTerm reasoning and output overrides work through both gateway protocols', async () => {
          const baseline = await readJSON(file);
          try { for (const protocol of ['chat_completions', 'responses']) {
            const config = { ...baseline, protocol, thinking: true, reasoningEffort: 'low', maxTokens: 12345 };
            await writeFile(file, JSON.stringify(config));
            await cli(id, 'fixture/first');
            await cli(id, 'fixture/second');
            const afterSwitch = await readJSON(file);
            for (const key of ['protocol', 'thinking', 'reasoningEffort', 'maxTokens']) assert.equal(afterSwitch[key], config[key]);
            await run(resolve(probes.wispterm), [], { env: { ...env, MAGPIE_TEST_CONFIG: file }, timeout: 30000 });
            const body = wireRequests.at(-1).body;
            assert.equal(body.reasoning_effort ?? body.reasoning?.effort, 'low');
            assert.equal(body.max_tokens ?? body.max_completion_tokens ?? body.max_output_tokens, 12345);
            assert.equal(body.context_window, undefined, 'context capacity is not an output request parameter');
          } } finally { await writeFile(file, JSON.stringify(baseline)); }
        });
        await agentTest.test('WispTerm default vision and explicit overrides reach the upstream correctly', async () => {
          for (const vision of [undefined, true, false, 'on', 'off']) {
            const config = await readJSON(file);
            if (vision === undefined) delete config.vision;
            else config.vision = vision;
            await writeFile(file, JSON.stringify(config));
            const enabled = vision === undefined || vision === true || vision === 'on';
            const before = received.length;
            await run(resolve(probes.wispterm), [], { env: { ...env, MAGPIE_TEST_CONFIG: file,
              MAGPIE_TEST_VISION: enabled ? 'on' : 'off' }, timeout: 30000 });
            assert.equal(received.length, before + 1);
            assert.deepEqual(received.at(-1), { model: 'second', authorization: 'Bearer upstream-test-only',
              ...(enabled ? { images: [fixtureImage] } : {}) });
            assert.deepEqual(await readJSON(file), config, 'the application reader must not modify connection settings');
          }
          const config = await readJSON(file);
          config.vision = original.vision;
          await writeFile(file, JSON.stringify(config));
        });
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
