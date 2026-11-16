import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { packages } from '../scripts/packages.mjs';

for (const { dir, path } of await packages()) {
  const { agent, connect } = await import(pathToFileURL(join(path, 'agent.js')));
  test(`${dir}: maps the supplied gateway without taking over model or backup writes`, () => {
    for (const v1 of ['http://127.0.0.1:3425/v1', 'https://gateway.example.test/proxy/v1']) {
      const gateway = Object.freeze({ url: v1.slice(0, -3), v1, key: `test-${agent.id}` });
      const result = connect(Object.freeze({ gateway, model: Object.freeze({ id: 'provider/model' }), models: [] }));
      assert.deepEqual(result, { baseURL: v1, apiKey: gateway.key });
      assert.equal(agent.model, 'model');
      assert.equal(agent.prefix, undefined);
    }
  });
  test(`${dir}: tolerates a catalog refresh without a selected model`, () => {
    assert.deepEqual(connect({ gateway: { v1: 'http://localhost:9000/v1', key: 'rotated-key' }, models: [] }), {
      baseURL: 'http://localhost:9000/v1', apiKey: 'rotated-key',
    });
  });
}

for (const [name, dir] of [['WispTerm', 'agent-wispterm'], ['Wisp Science', 'agent-wisp-science'], ['CiteBox', 'agent-citebox']]) test(`${name} publishes model facts separately from user settings`, async () => {
  const { connect } = await import(`../packages/${dir}/agent.js`);
  const gateway = { v1: 'http://localhost:3425/v1', key: 'fixture' };
  const result = connect({ gateway, model: { id: 'p/reasoner', context: 400000, output: 128000, efforts: ['low', 'medium', 'high'] } });
  assert.deepEqual(result, { baseURL: gateway.v1, apiKey: gateway.key,
    modelInfo: { id: 'p/reasoner', context: 400000, output: 128000, efforts: ['low', 'medium', 'high'] } });
  for (const key of ['thinking', 'reasoningEffort', 'maxTokens', 'contextWindow', 'protocol', 'vision']) assert.equal(result[key], undefined);
  assert.deepEqual(connect({ gateway, model: { id: 'p/unknown', context: 0, output: -1, efforts: [false, 'bad value'] } }), {
    baseURL: gateway.v1, apiKey: gateway.key,
  });
  // Magpie's placeholder for a model missing from its catalog.
  assert.deepEqual(connect({ gateway, model: { id: 'p/opaque', name: 'p/opaque', context: 0, output: 0, images: false, efforts: [] } }), {
    baseURL: gateway.v1, apiKey: gateway.key,
  });
  assert.deepEqual(connect({ gateway, model: { id: 'p/partial', context: 2 ** 32, output: 8192.5, efforts: ['high', 'High', 'x'.repeat(33)] } }).modelInfo,
    { id: 'p/partial', efforts: ['high'] });
});

test('Wisp Science takes the Library in its own user folder', async () => {
  const { agent } = await import('../packages/agent-wisp-science/agent.js');
  assert.deepEqual(agent.library, {
    instructions: '~/.wisp/AGENTS.md', mcp: '~/.wisp/mcp.json', mcpFormat: 'claude', skills: '~/.wisp/skills',
  });
});
