// Obsidian plugin discovery and download counts, from obsidianmd/obsidian-releases (public raw files).
import { OBSIDIAN_RAW } from './github.mjs';

/** Plugins whose repo belongs to `user`, plus any explicit ids from config. */
export async function fetchPlugins(gh, { user, ids = [] }) {
  const base = OBSIDIAN_RAW();
  const [list, stats] = await Promise.all([
    gh.request(`${base}/community-plugins.json`),
    gh.request(`${base}/community-plugin-stats.json`),
  ]);
  const want = new Set(ids);
  const mine = list.filter((p) => want.has(p.id) || String(p.repo).split('/')[0].toLowerCase() === user.toLowerCase());
  const plugins = {};
  for (const p of mine.sort((a, b) => a.id.localeCompare(b.id))) {
    const d = stats[p.id]?.downloads;
    plugins[p.id] = { name: p.name, repo: p.repo, description: p.description || '', downloads: Number.isInteger(d) ? d : null };
  }
  const missing = [...want].filter((id) => !plugins[id]);
  return { plugins, missing };
}
