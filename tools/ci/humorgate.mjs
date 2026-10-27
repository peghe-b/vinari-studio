// The humour fixture films through the gate's spec checks (r3, 2026-10-27): every specs/demo-p2-humor-*.json that names a
// news item, renamed as a NEW film (v999-…: what check.mjs makes fatal in the cloud), passes the humour rules
// (tools/ci/humor.mjs), the news rules (news.mjs), phase 2's lint (p2lint.mjs), the text-on-screen errors (screentext.mjs)
// and the street words (streetwords.mjs), on the REAL verified bank (ci/news-bank.json), the day after its item's event.
// The general rules once stopped every humour film (TITLE_CARD, KIT_MIN, HOOK_FRAME0, SHOT_LONG, the „{bleep}" placeholder
// ERROR in build-index): this proves the format and the gate agree. A nav film still needs its FilmTitleCard.
//   node tools/ci/humorgate.mjs [--test]
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {estimateTimeline} from './fx.mjs';
import {humorProblems, loadNews} from './humor.mjs';
import {newsProblems} from './news.mjs';
import {p2Problems} from './p2lint.mjs';
import {loadRegistry, textProblems} from './screentext.mjs';
import {streetProblems} from './streetwords.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** the live bank, then the frozen copy of the fixtures' items (ci/fixtures/humor/_bank-r3.json) */
const bankOf = () => {
  const live = loadNews();
  const frozen = JSON.parse(fs.readFileSync(path.join(root, 'ci', 'fixtures', 'humor', '_bank-r3.json'), 'utf8')).items;
  return [...live, ...frozen.filter((x) => !live.some((y) => y.id === x.id))];
};
export const gateLines = (spec0, {news = bankOf(), reg = loadRegistry()} = {}) => {
  const spec = {...spec0, id: `v999-${String(spec0.id).replace(/^demo-/, '')}`};
  const timeline = estimateTimeline(spec);
  const item = news.find((x) => x.id === spec.news);
  const now = item ? new Date(Date.parse(item.eventDate) + 864e5).toISOString() : new Date().toISOString();
  return [
    ...humorProblems(spec, {news, now, timeline}),
    ...newsProblems(spec, {items: news, now}),
    ...p2Problems(spec, {timeline, target: 20}),
    ...textProblems(spec, {reg, timeline, length: 20, ci: true, isNew: true}).filter((p) => p.severity === 'error').map((p) => p.line),
    ...streetProblems(spec, {}).filter((p) => p.fatal).map((p) => `${p.code} ${p.where}: ${p.msg}`),
  ];
};

const selfTest = () => {
  let bad = 0;
  const ok = (c, w) => {
    if (!c) bad++;
    console.log(`${c ? 'ok  ' : 'FAIL'} ${w}`);
  };
  const dir = path.join(root, 'specs');
  const films = fs.readdirSync(dir).filter((f) => /^demo-p2-humor-.*\.json$/.test(f)).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))).filter((x) => x.news);
  ok(films.length >= 3, `${films.length} humour fixture films name a bank item (3 at least)`);
  for (const f of films) {
    const lines = gateLines(f);
    ok(!lines.length, `${f.id}: the gate's spec checks as a new film${lines.length ? `: ${lines.join(' / ')}` : ': clean'}`);
  }
  // the exemptions are the humour's only: the same film as a nav film is stopped by the general rules
  if (films[0]) {
    const asNav = gateLines({...films[0], category: 'nav', pair: undefined}).map((l) => l.split(' ')[0]);
    ok(['TITLE_CARD', 'HOOK_FRAME0', 'SHOT_LONG'].every((c) => asNav.includes(c)), `the same film as a nav film: TITLE_CARD, HOOK_FRAME0, SHOT_LONG (${[...new Set(asNav)].join(', ')})`);
  }
  console.log(bad ? `${bad} failed` : 'all ok');
  return bad ? 1 : 0;
};
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(selfTest());
