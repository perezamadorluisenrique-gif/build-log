import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** --flag, --key value, --key=value. Booleans are flags listed in `bool`. */
export function parseArgs(argv, bool = []) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const [k, v] = a.slice(2).split('=');
    const key = k.replace(/-/g, '_');
    if (v !== undefined) out[key] = v;
    else if (bool.includes(k)) out[key] = true;
    else out[key] = argv[++i];
  }
  return out;
}

export function loadConfig(path = join(ROOT, 'config.json')) {
  return JSON.parse(readFileSync(path, 'utf8'));
}
