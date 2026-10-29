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
