import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export const root = fileURLToPath(new URL('../', import.meta.url));

export async function packages() {
  const dirs = (await readdir(join(root, 'packages'))).filter(n => n.startsWith('agent-')).sort();
  return Promise.all(dirs.map(async dir => {
    const path = join(root, 'packages', dir);
    const pkg = JSON.parse(await readFile(join(path, 'package.json'), 'utf8'));
    return { dir, path, pkg };
  }));
}
