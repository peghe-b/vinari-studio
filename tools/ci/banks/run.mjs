// The banks' one entry point (phase 2, plan step 13), run by .github/workflows/banks.yml only:
//   node tools/ci/banks/run.mjs <probe|news|stories|photos|hero|humour|stories-merge|all> [--max-usd N] [--lane georgia]
// probe: ONE small news request, to measure the real cost of an item before the big rounds (the plan: re-plan when the
// estimate is off by more than 30 %). Every bank checks its own budget first (common.mjs budget: STUDIO_BANK_USD and the
// month), prints counts and dollars only, and writes only its own data files.
import {clientOf, runBatch, sweepBatches} from './common.mjs';
import * as news from './news.mjs';
import * as stories from './stories.mjs';
import * as photos from './photos.mjs';
import * as humour from './humour.mjs';

const args = process.argv.slice(2);
const bank = args[0];
const maxUsd = Number(args[args.indexOf('--max-usd') + 1]) || undefined;
// stories only: one lane to scout (the p2x story judge: georgia had 0 stories; one lane costs about a quarter of all four)
const lane = args.includes('--lane') ? String(args[args.indexOf('--lane') + 1] ?? '') : '';
if (lane && !Object.keys(stories.SCOUT_LANES).includes(lane)) {
  console.log(`banks: unknown lane "${lane}" (${Object.keys(stories.SCOUT_LANES).join(', ')})`);
  process.exit(2);
}
const BANKS = ['probe', 'news', 'stories', 'photos', 'hero', 'humour', 'stories-merge', 'all'];
if (!BANKS.includes(bank)) {
  console.log(`usage: node tools/ci/banks/run.mjs <${BANKS.join('|')}> [--max-usd N]`);
  process.exit(2);
}
if (bank === 'stories-merge') {
  stories.merge();
  process.exit(0);
}
const {client, why} = await clientOf();
if (!client) {
  console.log(`banks: skipped (${why})`);
  process.exit(0);
}
// an earlier run's batch still running is cancelled, an unrecorded one costed (the p2 prove run's 5-hour news batch)
await sweepBatches(client);
const opt = maxUsd ? {maxUsd} : {};
if (bank === 'probe') {
  const {results, usd} = await runBatch(client, [{id: 'probe', system: 'You research car news. Return ONLY JSON.', user: 'Find ONE car news item from Georgia in the last 14 days with its source URL. JSON: {"items": [{"id": "", "eventDate": "", "sources": [{"url": ""}]}]}', max: 4000, uses: 3}], {bank: 'probe'}); // one request: a plain call, recorded as it returns
  console.log(`probe: $${usd.toFixed(3)} for one item (the news estimate assumes about $0.70 a scout and $0.30 a verify)`);
  process.exit(0);
}
const order = bank === 'all' ? ['news', 'stories', 'photos', 'hero', 'humour'] : [bank];
for (const b of order) {
  if (b === 'news') await news.run(client, opt);
  if (b === 'stories') await stories.run(client, {...opt, ...(lane ? {lanes: [lane]} : {})});
  if (b === 'photos') await photos.runStories(client, opt);
  if (b === 'hero') await photos.runHero(client, opt);
  if (b === 'humour') await humour.run(client, opt);
}
