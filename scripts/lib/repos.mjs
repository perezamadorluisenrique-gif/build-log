/** Public, non-fork repos of `user` (or just `only`, a comma list, which also works where /users/... is not reachable). */
export async function listRepos(gh, { user, cfg, only }) {
  const list = only
    ? await Promise.all(only.split(',').map((n) => gh.request(`/repos/${user}/${n.trim()}`)))
    : await gh.paginate(`/users/${user}/repos?type=owner&sort=pushed`, { maxPages: 10 });
  const excluded = new Set((cfg.repos.exclude || []).map((n) => n.toLowerCase()));
  return list.filter((r) => !r.private && (cfg.repos.include_forks || !r.fork) && !excluded.has(r.name.toLowerCase()));
}
