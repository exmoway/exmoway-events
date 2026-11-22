// Exmoway events — checker. Run before every commit:  node tools/validate.mjs
// Same rules as the website's server-side check (api/events-lib.php). If this
// prints any problem, fix it before committing: the website would refuse it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const pages = read('pages.json');
const routes = new Set(pages.routes), dests = new Set(pages.destinations), airports = new Set(pages.airports);
const COUNTRIES = new Set(pages.countries);
const iso = (d) => d.toISOString().slice(0, 10);
const today = iso(new Date(Date.now() - 12 * 3600e3));
const plus = (n) => iso(new Date(Date.now() + n * 86400e3));
const RE_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const validDate = (s) => { const m = RE_DATE.exec(String(s || '')); if (!m) return ''; const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return iso(d) === s ? s : ''; };
const PRICE = /[£$€¥฿₹₩₺₱]\s?\d|\d\s?(%|percent\b)|\b(usd|gbp|eur|thb|aud|sgd|aed|inr|jpy)\s?\d|\d\s?(usd|gbp|eur|thb|aud|sgd|aed|inr|jpy)\b/iu;

function text(v, max, required, why, field) {
  const s = String(v ?? '').replace(/\s+/gu, ' ').trim();
  if (!s) { if (required) why.push(`${field} is empty`); return ''; }
  if ([...s].length > max) { why.push(`${field} is longer than ${max} characters`); return ''; }
  if (/[<>{}\\`]|[\x00-\x1F]/u.test(s)) { why.push(`${field} contains characters that are not allowed`); return ''; }
  if (PRICE.test(s)) { why.push(`${field} mentions a price or percentage (not allowed)`); return ''; }
  return s;
}
const httpsUrl = (s) => { s = String(s || '').trim(); if (!s || s.length > 300 || /[\s"'<>\\`]/.test(s)) return ''; try { const u = new URL(s); return u.protocol === 'https:' && u.hostname && !u.username ? s : ''; } catch { return ''; } };
const pageExists = (slug) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && (slug.includes('-to-') ? routes.has(slug) : dests.has(slug));

function validate(code, j) {
  const problems = [];
  if (!j || !Array.isArray(j.items)) return { ok: false, problems: ['not a valid events file'] };
  let why = [];
  text(j.headline, 80, true, why, 'headline'); text(j.sub, 200, false, why, 'sub');
  const gen = String(j.generated_at || '');
  const genTs = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?Z$/.test(gen) ? Date.parse(gen) : NaN;
  if (!genTs || genTs > Date.now() + 86400e3) why.push('generated_at is missing or in the future');
  if (genTs && Date.now() - genTs > 100 * 86400e3) why.push('generated_at is older than 100 days — refresh this file');
  if (why.length) return { ok: false, problems: why };
  let valid = 0;
  j.items.slice(0, 30).forEach((it, i) => {
    why = [];
    const n = `item ${i + 1} (${String(it?.title || '').slice(0, 40)})`;
    if (!it || typeof it !== 'object') { problems.push(`${n}: not an object`); return; }
    text(it.title, 80, true, why, 'title'); text(it.blurb, 160, false, why, 'blurb');
    const dates = text(it.dates, 40, false, why, 'dates');
    if (dates) {
      const end = validDate(it.end);
      if (!end) why.push('dated item needs "end" (YYYY-MM-DD)');
      if (!httpsUrl(it.source)) why.push('dated item needs an https:// "source"');
      text(it.source_name, 50, true, why, 'source_name');
      if (end && end < today) { problems.push(`${n}: has ended — remove it`); return; }
      if (end && end > plus(400)) why.push('end date is too far ahead');
    }
    if (it.search && typeof it.search === 'object') {
      const s = it.search, dep = validDate(s.dep), ret = validDate(s.ret);
      if (!airports.has(String(s.from)) || !airports.has(String(s.to)) || s.from === s.to) why.push('search airports must be in pages.json "airports"');
      if (!dep || dep < today || dep > plus(360)) why.push('search "dep" is missing, past or too far ahead');
      if (s.ret && (!ret || ret < dep || (Date.parse(ret) - Date.parse(dep)) > 60 * 86400e3)) why.push('search "ret" is not valid (max 60 days after dep)');
    } else if (!pageExists(String(it.route || ''))) {
      why.push(`route "${String(it.route || '').slice(0, 40)}" is not in pages.json`);
    }
    if (why.length) problems.push(`${n}: ${[...new Set(why)].join('; ')}`); else valid++;
  });
  if (valid < 3) problems.push(`only ${valid} valid item(s) — at least 3 needed (6–10 recommended)`);
  if (j.items.length > 12) problems.push('more than 12 items — the website shows at most 8 and keeps 12');
  return { ok: valid >= 3, problems };
}

const manifest = read('manifest.json');
let failed = false;
if (!Array.isArray(manifest.files) || !manifest.files.includes('world')) { console.log('manifest.json: "files" must include "world"'); failed = true; }
for (const c of manifest.files || []) {
  if (c !== 'world' && !COUNTRIES.has(String(c).toUpperCase())) { console.log(`manifest.json: "${c}" is not a 2-letter country code`); failed = true; continue; }
  const f = `trending-${c}.json`;
  if (!fs.existsSync(path.join(ROOT, f))) { console.log(`${f}: missing`); failed = true; continue; }
  let j; try { j = read(f); } catch (e) { console.log(`${f}: invalid JSON — ${e.message}`); failed = true; continue; }
  const r = validate(c, j);
  if (r.problems.length) { failed = true; r.problems.forEach((p) => console.log(`${f}: ${p}`)); }
  else console.log(`${f}: OK (${j.items.length} items)`);
}
console.log(failed ? '\nNOT OK — fix the problems above before committing.' : '\nAll files OK.');
process.exit(failed ? 1 : 0);
