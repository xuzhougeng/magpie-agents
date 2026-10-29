// Magpie runs this entry in its Bun plugin host. npm install scripts are skipped.
// Keep filesystem initialization outside agent.js, which runs in moejs.
import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { agent } from './agent.js';

export const initializeAgent = async () => {
  // An empty directory lets Magpie detect a desktop agent without a PATH command.
  // Never create/overwrite magpie.json or select a model on the user's behalf.
  await mkdir(join(homedir(), '.config', agent.id), { recursive: true, mode: 0o700 });
  return {};
};
