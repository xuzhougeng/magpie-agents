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
  assert.equal(pkg.main, undefined, 'No load-time entry: a plugin must not create files to be detected');
  assert.equal(pkg.exports, undefined);
  assert.equal(pkg.magpie.agent, './agent.js');
  assert.equal(pkg.publishConfig.access, 'public');
  assert.equal(pkg.dependencies, undefined, 'Keep each package self-contained');
  assert(pkg.files.includes('agent.js'));
  assert.deepEqual(pkg.files.filter(f => /\.m?js$/.test(f)), ['agent.js'], 'Ship only the moejs agent module');
  assert.equal(pkg.scripts, undefined, 'No npm install scripts');
  const source = await readFile(join(path, 'agent.js'), 'utf8');
  assert(!/\b(import\s|require\s*\(|process\.|fetch\s*\()/.test(source), 'Agent runtime has no Node or network APIs');
  const { agent, connect } = await import(pathToFileURL(join(path, 'agent.js')));
  assert.equal(agent.id, dir.slice('agent-'.length));
  assert.equal(agent.config, `~/.config/${agent.id}/magpie.json`);
  assert.equal(agent.format, 'json');
  assert.equal(agent.bin, agent.id, 'Detect the app by its own command');
  assert.equal(agent.dir, undefined, 'The config folder is not evidence that the app is installed');
  assert.equal(agent.model, 'model');
  if (agent.library !== undefined) {
    // Magpie leaves out a relative place and refuses an MCP format it can't write.
    for (const [key, place] of Object.entries(agent.library)) {
      if (key !== 'mcpFormat') assert.match(place, /^~\//, `library.${key} must be a home-relative path`);
    }
    if (agent.library.mcp) assert.equal(agent.library.mcpFormat, 'claude');
  }
  assert(!ids.has(agent.id));
  ids.add(agent.id);
  assert.equal(typeof connect, 'function');
  assert.equal(registry.plugins.filter(p => p.package === pkg.name && p.kind === 'agent').length, 1);
  console.log(`${pkg.name}@${pkg.version}: OK`);
}
assert.equal(ids.size, 3);
