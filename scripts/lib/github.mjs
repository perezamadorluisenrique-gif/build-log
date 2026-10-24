// Minimal GitHub REST client on top of fetch. Only public data is read; the token is optional
// and only raises the rate limit. GITHUB_API_URL / OBSIDIAN_RAW_URL can point at a mock server in tests.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function makeClient({ token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN, base = process.env.GITHUB_API_URL || 'https://api.github.com' } = {}) {
  const headers = { accept: 'application/vnd.github+json', 'user-agent': 'build-log', 'x-github-api-version': '2022-11-28' };
  if (token) headers.authorization = `Bearer ${token}`;
  const stats = { calls: 0 };

  async function request(path, { retries = 3, raw = false } = {}) {
    const url = path.startsWith('http') ? path : base + path;
    for (let attempt = 0; ; attempt++) {
      let res;
      try {
        stats.calls++;
        res = await fetch(url, { headers });
      } catch (err) {
        if (attempt >= retries) throw new Error(`network error for ${url}: ${err.message}`);
        await sleep(500 * 2 ** attempt);
        continue;
      }
      if (res.ok) return raw ? res.text() : res.json();
      const limited = res.status === 429 || (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0');
      if ((res.status >= 500 || limited) && attempt < retries) {
        const reset = Number(res.headers.get('retry-after')) * 1000 || 1000 * 2 ** attempt;
        await sleep(Math.min(reset, 15000));
        continue;
      }
      const err = new Error(`${res.status} for ${url}`);
      err.status = res.status;
      throw err;
    }
  }

  /** Follow ?page=N until a short page comes back. */
  async function paginate(path, { perPage = 100, maxPages = 10 } = {}) {
    const out = [];
    const sep = path.includes('?') ? '&' : '?';
    for (let page = 1; page <= maxPages; page++) {
      const items = await request(`${path}${sep}per_page=${perPage}&page=${page}`);
      out.push(...items);
      if (items.length < perPage) break;
    }
    return out;
  }

  /** Like request, but 404 -> null. */
  async function optional(path, opts) {
    try {
      return await request(path, opts);
    } catch (err) {
      if (err.status === 404) return null;
      throw err;
    }
  }

  return { request, paginate, optional, stats };
}

export const OBSIDIAN_RAW = () => process.env.OBSIDIAN_RAW_URL || 'https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master';
