import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { packages, root } from './packages.mjs';

const registry = JSON.parse(await readFile(join(root, 'registry.json'), 'utf8'));
const ids = new Set();
for (const { dir, path, pkg } of await packages()) {
  assert.equal(pkg.name, `@hoptoper/magpie-${dir}`);
  assert.equal(pkg.type, 'module');
  assert.equal(pkg.main, './setup.mjs', 'The plugin host initializes the detection directory');
  assert.equal(pkg.exports, undefined);
  assert.equal(pkg.magpie.agent, './agent.js');
  assert.equal(pkg.publishConfig.access, 'public');
  assert.equal(pkg.dependencies, undefined, 'Keep each package self-contained');
  assert(pkg.files.includes('agent.js'));
  assert(pkg.files.includes('setup.mjs'));
  assert.equal(pkg.scripts, undefined, 'Magpie skips npm install scripts; initialize on plugin load');
  const source = await readFile(join(path, 'agent.js'), 'utf8');
  assert(!/\b(import\s|require\s*\(|process\.|fetch\s*\()/.test(source), 'Agent runtime has no Node or network APIs');
  const { agent, connect } = await import(pathToFileURL(join(path, 'agent.js')));
  assert.equal(agent.id, dir.slice('agent-'.length));
  assert.equal(agent.config, `~/.config/${agent.id}/magpie.json`);
  assert.equal(agent.format, 'json');
  assert.equal(agent.model, 'model');
  assert(!ids.has(agent.id));
  ids.add(agent.id);
  assert.equal(typeof connect, 'function');
  assert.equal(registry.plugins.filter(p => p.package === pkg.name && p.kind === 'agent').length, 1);
  console.log(`${pkg.name}@${pkg.version}: OK`);
}
assert.equal(ids.size, 3);
