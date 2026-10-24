#!/usr/bin/env node
// Verifies a built site: the three pages exist, nav links each other, every local link/asset resolves
// (including #fragments), and every bilingual span comes in an en/es pair.
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const dir = resolve(process.argv[2] || 'dist');
const problems = [];
const pages = ['index.html', 'stats.html', 'projects.html'];
const html = {};
for (const p of pages) {
  if (!existsSync(join(dir, p))) problems.push(`missing page ${p}`);
  else html[p] = readFileSync(join(dir, p), 'utf8');
}
const ids = (src) => new Set([...src.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
for (const [page, src] of Object.entries(html)) {
  for (const target of pages) if (!src.includes(`href="${target}"`)) problems.push(`${page} does not link to ${target}`);
  const en = (src.match(/<(span|div) lang="en"/g) || []).length;
  const es = (src.match(/<(span|div) lang="es"/g) || []).length;
  if (en !== es) problems.push(`${page}: ${en} English blocks but ${es} Spanish blocks`);
  for (const m of src.matchAll(/(?:href|src)="([^"]*)"/g)) {
    const ref = m[1];
    if (/^(https?:|mailto:|data:)/.test(ref) || ref === '') continue;
    if (ref.startsWith('/')) { problems.push(`${page}: root-absolute link ${ref} breaks under a project subpath`); continue; }
    const [file, frag] = ref.split('#');
    const target = file ? join(dirname(join(dir, page)), file) : join(dir, page);
    if (!existsSync(target)) { problems.push(`${page}: broken link ${ref}`); continue; }
    if (frag && target.endsWith('.html') && !ids(readFileSync(target, 'utf8')).has(frag)) problems.push(`${page}: missing anchor ${ref}`);
  }
}
if (problems.length) {
  console.error('site check failed:\n- ' + problems.join('\n- '));
  process.exit(1);
}
console.log(`site ok: ${pages.length} pages, links and anchors resolve`);
