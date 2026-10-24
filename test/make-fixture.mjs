// Builds a realistic data directory against the mock API: backfill for the early weeks, then four weekly
// fetches exactly as the Monday cron would run them (each with its own "now" and a growing stage).
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { rmSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startMock } from './mock-github.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const CONFIG = join(ROOT, 'test', 'fixtures', 'config.json');
const exec = promisify(execFile);

// async on purpose: the mock server lives in this process and must keep serving while the child runs
export async function run(script, extraArgs, env) {
  const { stdout } = await exec('node', [join(ROOT, 'scripts', script), '--config', CONFIG, ...extraArgs], { env: { ...process.env, ...env }, encoding: 'utf8' });
  return stdout;
}

export async function makeFixtureData(dir, { mock } = {}) {
  const own = mock ? null : await startMock();
  const m = mock || own;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const log = [];
  const early = { ...m.env(0), BUILD_LOG_NOW: '2026-10-05T06:17:00Z' };
  log.push((await run('backfill.mjs', ['--out', dir], early)).trim());
  log.push((await run('fetch.mjs', ['--out', dir], early)).split('\n')[1]);
  for (const [now, stage] of [['2026-10-12T06:17:00Z', 1], ['2026-10-19T06:17:00Z', 2], ['2026-10-26T06:17:00Z', 3]]) {
    log.push((await run('fetch.mjs', ['--out', dir], { ...m.env(stage), BUILD_LOG_NOW: now })).split('\n')[1]);
  }
  if (own) await own.close();
  return log;
}

if (import.meta.url === `file://${process.argv[1]}`) console.log((await makeFixtureData(process.argv[2] || join(ROOT, '.score', 'fixture-data'))).join('\n'));
