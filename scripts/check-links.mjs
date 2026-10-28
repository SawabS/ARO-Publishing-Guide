// Checks every URL in data/sources.json and writes link-report.json.
//   node scripts/check-links.mjs            check all sources
//   node scripts/check-links.mjs --list     print the URLs without fetching
// Behind a proxy on Node ≥ 22.21, run with NODE_USE_ENV_PROXY=1 so fetch honours HTTPS_PROXY.
// Exit code 1 if an official ARO page fails, so CI can flag drift. Google Docs/Drive links often answer
// 200 for a sign-in page; the report marks them "needs a browser" rather than claiming the file is fine.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { sources } = JSON.parse(readFileSync(join(root, 'data/sources.json'), 'utf8'));
if (process.argv.includes('--list')) { sources.forEach(s => console.log(`${s.id}\t${s.url}`)); process.exit(0); }

async function check(s) {
  const started = Date.now();
  for (const method of ['HEAD', 'GET']) {
    try {
      const res = await fetch(s.url, { method, redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'aro-navigator-link-check/1.0' } });
      if (method === 'HEAD' && (res.status === 405 || res.status === 403)) continue;
      const google = /docs\.google|drive\.google/.test(s.url);
      return { id: s.id, url: s.url, official: s.official, status: res.status, finalUrl: res.url, ok: res.ok, note: google && res.ok ? 'reachable; content needs a browser session' : '', ms: Date.now() - started };
    } catch (e) {
      if (method === 'GET') return { id: s.id, url: s.url, official: s.official, status: 0, ok: false, note: String(e.cause?.code || e.message), ms: Date.now() - started };
    }
  }
}

const results = [];
const queue = [...sources];
await Promise.all(Array.from({ length: 6 }, async () => { while (queue.length) results.push(await check(queue.shift())); }));
results.sort((a, b) => a.id.localeCompare(b.id));
const checkedAt = new Date().toISOString();
writeFileSync(join(root, 'link-report.json'), JSON.stringify({ checkedAt, results }, null, 2));
for (const r of results) console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${String(r.status).padStart(3)} ${r.id.padEnd(22)} ${r.note || ''}`);
const badOfficial = results.filter(r => r.official && !r.ok);
console.log(`\n${results.filter(r => r.ok).length}/${results.length} reachable at ${checkedAt}; ${badOfficial.length} official ARO links failing.`);
process.exit(badOfficial.length ? 1 : 0);
