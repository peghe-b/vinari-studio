// The news bank's offer and rules (phase 2, plan step 13; the owner, 2026-10-26: "the studio should know recent news").
// ci/news-bank.json is written by .github/workflows/banks.yml (tools/ci/banks/news.mjs) on the API credit: verified,
// dated, sourced items. The brief offers the freshest few; a film that uses one names it ("news": "<id>").
//
//   offerNews(items, {now, recent, max})   the items a film may use: not expired, not told by the last 10 films, Georgian
//                                          first, then the freshest (max 3)
//   newsProblems(spec, {items, now, recent})  NEWS_EXPIRED, NEWS_DATE, NEWS_REPEAT, NEWS_FRESH (one line each)
//   node tools/ci/news.mjs --test
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const NEWS_RECENT = 10;
const days = (a, b) => (Date.parse(b) - Date.parse(a)) / 864e5;
const FRESH_WORD = /(?<![\p{L}])(?:ახლა|ახალი|ახალ)(?![\p{L}])/u;
const TODAY = /(?<![\p{L}])დღეს(?![\p{L}])/u;
// a date said: a year, a month's name, „გუშინ", „ამ კვირაში", „წინა კვირას", „X დღის წინ"
const DATED = /(?:20\d\d|იანვ|თებერვ|მარტ|აპრილ|მაის|ივნის|ივლის|აგვისტ|სექტემბ|ოქტომბ|ნოემბ|დეკემბ|გუშინ|ამ კვირ|წინა კვირ|დღის წინ|კვირის წინ|ამ თვე|გასულ თვე)/u;

export const loadNewsBank = (base = root) => {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(base, 'ci', 'news-bank.json'), 'utf8'));
    return Array.isArray(j.items) ? j.items : [];
  } catch {
    return [];
  }
};

export const offerNews = (items, {now = new Date().toISOString(), recent = [], max = 3} = {}) => {
  const told = new Set(recent.slice(0, NEWS_RECENT).map((r) => r?.news).filter(Boolean));
  return (items ?? [])
    .filter((x) => x?.id && !told.has(x.id) && (!x.useUntil || Date.parse(now) <= Date.parse(x.useUntil)) && Date.parse(x.eventDate ?? x.published ?? now) <= Date.parse(now))
    .sort((a, b) => Number(Boolean(b.georgia)) - Number(Boolean(a.georgia)) || String(b.eventDate ?? '').localeCompare(String(a.eventDate ?? '')))
    .slice(0, max);
};

export const newsProblems = (spec, {items = loadNewsBank(), now = new Date().toISOString(), recent = []} = {}) => {
  if (typeof spec?.news !== 'string' || !spec.news) return [];
  const out = [];
  const item = items.find((x) => x?.id === spec.news);
  if (!item) return [`NEWS_EXPIRED "news": "${spec.news}" is not in the verified bank (ci/news-bank.json)`];
  if (item.useUntil && Date.parse(now) > Date.parse(item.useUntil)) out.push(`NEWS_EXPIRED ${item.id} could be told until ${item.useUntil}`);
  const said = (spec.beats ?? []).map((b) => String(b?.say ?? '')).join(' ');
  if (!DATED.test(said)) out.push(`NEWS_DATE the film never says when ${item.id} happened (a date, „გუშინ", „ამ კვირაში")`);
  const told = recent.slice(0, NEWS_RECENT).find((r) => r?.news === item.id && r?.id !== spec.id);
  if (told) out.push(`NEWS_REPEAT ${item.id} was told by ${told.id}, one of the last ${NEWS_RECENT} films`);
  out.push(...unitProblems(spec, item));
  const age = item.eventDate ? days(item.eventDate, now) : Infinity;
  if (TODAY.test(said) && age > 2) out.push(`NEWS_FRESH „დღეს" on news ${Math.round(age)} days old (2 at most)`);
  if (FRESH_WORD.test(said) && age > 30) out.push(`NEWS_FRESH „ახლა/ახალი" on news ${Math.round(age)} days old (30 at most)`);
  return out;
};

// ---- NEWS_UNIT (the r3x round-2 humour film, 2026-10-28: the bank said the RE-EXPORTS fell 24 % in VALUE, $475 million; the
// film said „მანქანების გადაყიდვა ოცდაოთხი პროცენტით დაეცა" and its card „საზღვარს ნაკლები სცდება · 24%", a drop in the
// NUMBER of cars, and built its punchline on it) ---------------------------------------------------------------------------
const UNITS_KA = ['ერთ', 'ორ', 'სამ', 'ოთხ', 'ხუთ', 'ექვს', 'შვიდ', 'რვა', 'ცხრა', 'ათ', 'თერთმეტ', 'თორმეტ', 'ცამეტ', 'თოთხმეტ', 'თხუთმეტ', 'თექვსმეტ', 'ჩვიდმეტ', 'თვრამეტ', 'ცხრამეტ'];
const TENS_KA = {20: 'ოც', 40: 'ორმოც', 60: 'სამოც', 80: 'ოთხმოც'};
/** a whole number 1..99 as the voice says it, its stem (no final „ი": „ოცდაოთხ" matches „ოცდაოთხი", „ოცდაოთხით") */
export const kaNumStem = (n) => {
  if (!(Number.isInteger(n) && n >= 1 && n <= 99)) return null;
  if (n < 20) return UNITS_KA[n - 1];
  const base = Math.floor(n / 20) * 20;
  const rest = n - base;
  return rest ? `${TENS_KA[base]}და${UNITS_KA[rest - 1]}` : TENS_KA[base];
};
const MONEY = /დოლარ|ლარ|თეთრ|ევრო|თანხ|ღირებულ|ფას|შემოსავ|\$|₾|€|მილიარდ|მილიონ/;
/** the percentages a bank item gives in VALUE (money) only, never in a count */
export const valuePercents = (item) => {
  const out = new Set();
  for (const f of item?.figures ?? []) {
    const t = String(f);
    if (!/\$|GEL|EUR|USD|value|worth|billion|million|price/i.test(t)) continue;
    for (const m of t.matchAll(/(\d{1,2})(?:[.,]\d+)?\s*%/g)) out.add(Number(m[1]));
  }
  // a percentage the figures also give for a count (vehicles, cars, units) is not a value-only one
  for (const f of item?.figures ?? []) {
    const t = String(f);
    if (/\$|GEL|value|worth|billion|million|price/i.test(t)) continue;
    for (const m of t.matchAll(/(\d{1,2})(?:[.,]\d+)?\s*%/g)) if (/vehicle|car|unit|registr|import/i.test(t)) out.delete(Number(m[1]));
  }
  return out;
};
/** NEWS_UNIT: a line (said, shown, or a scene's text) that gives a value-only percentage with no money word next to it */
export const unitProblems = (spec, item) => {
  const pcs = valuePercents(item);
  if (!pcs.size) return [];
  const lines = [];
  (spec?.beats ?? []).forEach((b, i) => {
    for (const k of ['say', 'show']) if (typeof b?.[k] === 'string') lines.push([`beats[${i}].${k}`, b[k]]);
    for (const sc of [b?.scene, ...(Array.isArray(b?.cuts) ? b.cuts.map((c) => c?.scene) : [])]) {
      if (!sc || typeof sc !== 'object') continue;
      const txt = [sc.headline, sc.title, sc.claim, sc.value, sc.unit, ...(sc.rows ?? []).flatMap((r) => [r?.label, r?.value])].filter((x) => typeof x === 'string' || typeof x === 'number').join(' · ');
      if (txt) lines.push([`beats[${i}] ${sc.type}`, txt]);
    }
  });
  const out = [];
  for (const [where, t] of lines) {
    for (const p of pcs) {
      const stem = kaNumStem(p);
      const said = new RegExp(`(^|[^\\d])${p}\\s*(%|პროცენტ)`).test(t) || (stem && new RegExp(`${stem}[ი]?[^\\s]*\\s+პროცენტ`).test(t));
      if (said && !MONEY.test(t)) out.push(`NEWS_UNIT ${where} gives ${p} % with no money in it, but the bank's ${p} % is a drop in VALUE (${item.id}): say what fell („${p}%-ით ნაკლებ თანხად", „ღირებულება"), never a count of cars`);
    }
  }
  return [...new Set(out)];
};

const selfTest = () => {
  let bad = 0;
  const ok = (c, w) => {
    if (!c) bad++;
    console.log(`${c ? 'ok  ' : 'FAIL'} ${w}`);
  };
  const now = '2026-10-26T12:00:00Z';
  const items = [
    {id: 'a', georgia: false, eventDate: '2026-10-25', useUntil: '2026-11-25'},
    {id: 'b', georgia: true, eventDate: '2026-10-10', useUntil: '2026-11-25'},
    {id: 'c', georgia: true, eventDate: '2026-09-01', useUntil: '2026-10-01'},
    {id: 'd', georgia: false, eventDate: '2026-10-20', useUntil: '2026-11-25'},
  ];
  const off = offerNews(items, {now, recent: [{id: 'v1', news: 'd'}]});
  ok(off.map((x) => x.id).join() === 'b,a', `Georgian first, expired and recently told left out (${off.map((x) => x.id).join()})`);
  const film = (say, news = 'a') => ({id: 'v900-x', news, beats: [{say}]});
  ok(newsProblems(film('გუშინ ბენზინი გაძვირდა.'), {items, now}).length === 0, 'a dated fresh item passes');
  ok(newsProblems(film('ბენზინი გაძვირდა.'), {items, now}).some((l) => l.startsWith('NEWS_DATE')), 'no date said: NEWS_DATE');
  ok(newsProblems(film('ოქტომბერში დღეს გაძვირდა.', 'b'), {items, now}).some((l) => l.startsWith('NEWS_FRESH')), '„დღეს" on a 16-day-old item: NEWS_FRESH');
  ok(newsProblems(film('სექტემბერში.', 'c'), {items, now}).some((l) => l.startsWith('NEWS_EXPIRED')), 'an expired item: NEWS_EXPIRED');
  ok(newsProblems(film('ოქტომბერში.', 'd'), {items, now, recent: [{id: 'v899-y', news: 'd'}]}).some((l) => l.startsWith('NEWS_REPEAT')), 'told by a recent film: NEWS_REPEAT');
  ok(newsProblems({id: 'v900-x', beats: []}, {items, now}).length === 0, 'a film without news: nothing');
  {
    // NEWS_UNIT: the r3x round-2 humour film's re-export twist
    const re = {id: 're', eventDate: '2026-10-19', useUntil: '2026-11-25', figures: ['63,141 vehicles re-exported, Jan-Sep 2026', '$1.5 billion in value', '-24% year on year (-$475 million)']};
    const its = [...items, re];
    ok(kaNumStem(24) === 'ოცდაოთხ' && kaNumStem(30) === 'ოცდაათ' && kaNumStem(40) === 'ორმოც' && kaNumStem(8) === 'რვა', 'the Georgian number stems (24, 30, 40, 8)');
    ok(valuePercents(re).has(24), 'the bank item\'s 24 % is a drop in value');
    const bad = {id: 'v900-x', news: 're', beats: [{say: 'საქსტატი, ოქტომბერი: მანქანების გადაყიდვა ოცდაოთხი პროცენტით დაეცა.'}, {say: 'ა.', scene: {type: 'FilmTitleCard', title: 'საზღვარს ნაკლები სცდება', kind: 'stat', value: '24%'}}]};
    const got = newsProblems(bad, {items: its, now}).filter((l) => l.startsWith('NEWS_UNIT'));
    ok(got.length === 2, `„ოცდაოთხი პროცენტით" resale and a „24%" card with no money: NEWS_UNIT twice (${got.length})`);
    const good = {id: 'v900-x', news: 're', beats: [{say: 'საქსტატი, ოქტომბერი: რეექსპორტი ოცდაოთხი პროცენტით ნაკლებ თანხად გაიყიდა.'}]};
    ok(!newsProblems(good, {items: its, now}).some((l) => l.startsWith('NEWS_UNIT')), 'the same drop said in money passes');
  }
  console.log(bad ? `${bad} failed` : 'all ok');
  return bad ? 1 : 0;
};
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv[2] === '--test') process.exit(selfTest());
