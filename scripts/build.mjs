#!/usr/bin/env node
// Builds the static site: data/*.json + notes/*.md + site/* -> dist/
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs, loadConfig, ROOT } from './lib/args.mjs';
import { loadSnapshots, loadNotes, buildModel } from './lib/model.mjs';
import { renderIndex, renderStats, renderProjects } from './lib/pages.mjs';

const args = parseArgs(process.argv.slice(2));
const cfg = loadConfig(args.config);
const dataDir = args.data || join(ROOT, 'data');
const notesDir = args.notes || join(ROOT, 'notes');
const out = args.out || join(ROOT, 'dist');
const vendorDir = args.tinta || join(ROOT, 'vendor', 'tinta');

const snapshots = loadSnapshots(dataDir);
const model = buildModel({ snapshots, notes: loadNotes(notesDir) });

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'assets'), { recursive: true });
mkdirSync(join(out, 'data'), { recursive: true });

const css = [join(ROOT, 'site', 'tokens.css')];
if (existsSync(vendorDir)) css.push(...readdirSync(vendorDir).filter((f) => f.endsWith('.css')).sort().map((f) => join(vendorDir, f)));
css.push(join(ROOT, 'site', 'site.css'));
writeFileSync(join(out, 'assets', 'site.css'), css.map((f) => readFileSync(f, 'utf8')).join('\n'));
copyFileSync(join(ROOT, 'site', 'app.js'), join(out, 'assets', 'app.js'));
for (const s of snapshots) copyFileSync(join(dataDir, `${s.week}.json`), join(out, 'data', `${s.week}.json`));
writeFileSync(join(out, '.nojekyll'), '');

const ctx = { cfg, model };
writeFileSync(join(out, 'index.html'), renderIndex(ctx));
writeFileSync(join(out, 'stats.html'), renderStats(ctx));
writeFileSync(join(out, 'projects.html'), renderProjects(ctx));
console.log(`built ${out}: ${model.entries.length} entries (${snapshots.length} snapshots), ${css.length > 2 ? 'with vendored Tinta CSS' : 'built-in ink-on-paper tokens'}`);
