// The art director (phase 2, plan step 11; src/lib/p2.mjs): a vision critic on the API credit that LOOKS at the film.
// Until now Claude never saw the render. Two passes, the same rubric:
//   review <id>   BEFORE the render: the writer runs it after `node tools/check.mjs <id>` made out/<id>.sheet.png (the
//                 settled frame of every shot). It prints the scores and the fixes to the writer (never to the public
//                 log: the writer's transcript is the step's own), and the writer edits the spec or its Film. At most
//                 ROUNDS rounds a film (out/ci/artdirector.json counts them); a third call prints the last verdict.
//   final <id> <sheet.png>   AFTER the render (studio.yml): a 1-frame-a-second sheet, scored the same way; the verdict
//                 and the scores (numbers only) go to the job summary and the spend ledger. A FAIL (a hard row under 1)
//                 exits 3 and the film is not published (the p3 prove run: v136 scored "fail 4/12" and went out anyway);
//                 tools/ci/filmgate.mjs already ran the same look on the check's sheet before the voice, with a fix round.
//   --test        the self-test on a recorded reply (no network)
//
// The rubric (0, 1 or 2 each, 12 in all): legible (hierarchy, nothing cut or crowded), one hue (paper and ink, colour on
// data only), whole (phones, cars, cards whole, outlines concentric), explained (every second shows what is said, a mark
// or a number landing), fresh (no frame like the last films', no template look), crafted (no clip art, no drawn faces,
// purpose-built graphics). Hard rules: whole, one hue and crafted under 1 fail the round.
// Cost: about $1-2.5 a film (two or three sheets at about 1500 x 1500 px).
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {costOf} from './director.mjs';
import {knobs, markEmpty, mayPlan, readLedger, record} from './spend.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const ROUNDS = 2;
export const ROWS = ['legible', 'oneHue', 'whole', 'explained', 'fresh', 'crafted'];
export const HARD = ['whole', 'oneHue', 'crafted'];
export const PASS_MIN = 9;

export const RUBRIC = [
  'You are the art director of a premium black-and-white motion-graphics studio (vertical 1080x1920 films, Georgian',
  'voice, a car app). You see a contact sheet: one settled frame of every shot, in order. Score it strictly, 0, 1 or 2 on',
  'each row: legible (a clear hierarchy, every text readable and inside the frame, nothing crowded or cut), oneHue (paper',
  'and ink; colour only on data, one hue a frame; a real app screen may keep its colour), whole (phones, cars, cards and',
  'objects whole in the frame, outlines concentric with what they ring), explained (every shot SHOWS what the line is',
  'about: a mark drawn, a number landing, a word lifted; nothing decorative), fresh (no frame looks like a template or a',
  'stock slide; each shot a new picture), crafted (purpose-built graphics, real photos and real screens; no clip art, no',
  'drawn faces, no triangle road, no flat icon). Each row: 2 when every shot holds it, 1 when one or two shots break it, 0',
  'when it is broken across the film; score what you see on THIS sheet, not a habit. Then list at most 6 fixes, each',
  '{shot: the number that starts the label printed above its tile (labels read "N Type t s"; a tile labelled "open ..." is',
  'shot 1, the opening; never count tiles yourself), what: one concrete change in English (move, enlarge, cut, replace with',
  'a named kit part)}. The tiles labelled "open" are the first 1.5 s of the film (its opening) frame by frame, and shot 1 (and 2) is the same picture still playing: they look alike because they ARE one shot, so never call shot 1 or 2 a repeat of the opening. Name the worst problems first. The dashed lines on the tiles are the sheet\'s own safe-area overlay,',
  "not the film. Never comment on the words or the topic, only the pictures. If the sheet is unreadable or empty, score 0",
  'and say so in one fix.',
].join(' ');

/** The reply's shape (zod v4, from tools/ci/engine). */
export const schemaOf = (z) =>
  z.object({
    scores: z.object(Object.fromEntries(ROWS.map((r) => [r, z.number().int().min(0).max(2)]))),
    fixes: z.array(z.object({shot: z.number().int().min(1).max(60), what: z.string()})).max(6),
  });

/** {total, pass, hardFail, verdict}: pass = PASS_MIN or more and no hard row under 1 */
export const verdictOf = (scores) => {
  const total = ROWS.reduce((s, r) => s + (Number.isInteger(scores?.[r]) ? scores[r] : 0), 0);
  const hardFail = HARD.filter((r) => !(scores?.[r] >= 1));
  const pass = total >= PASS_MIN && hardFail.length === 0;
  return {total, pass, hardFail, verdict: pass ? 'pass' : hardFail.length ? 'fail' : 'fix'};
};

/** The bar before the voice (tools/ci/filmgate.mjs; the r1 car film, 2026-10-27: "fix 6/12" went on to the voice, then the
 *  rendered film failed "crafted 0"): a PASS and the hard rows at GATE_HARD_MIN (2) each. */
export const GATE_HARD_MIN = 2;
export const gateHolds = (v, scores) => v?.verdict === 'pass' && HARD.every((r) => (scores?.[r] ?? 0) >= GATE_HARD_MIN);

const stateFile = (id) => path.join(root, 'out', 'ci', `artdirector-${id}.json`);
const readState = (id) => {
  try {
    return JSON.parse(fs.readFileSync(stateFile(id), 'utf8'));
  } catch {
    return {rounds: []};
  }
};

/** one line of model text, safe to print: no controls, cut */
const clean = (s, n = 200) => String(s ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

export const reviewText = (res) => {
  const v = verdictOf(res.scores);
  return [
    `art director: ${v.verdict.toUpperCase()} ${v.total}/12 (${ROWS.map((r) => `${r} ${res.scores[r]}`).join(', ')})${v.hardFail.length ? `; hard rows under 1: ${v.hardFail.join(', ')}` : ''}`,
    ...res.fixes.map((f) => `  shot ${f.shot}: ${clean(f.what)}`),
    gateHolds(v, res.scores)
      ? 'Keep it.'
      : v.pass
        ? `A pass, but the gate after you wants whole, one hue and crafted at ${GATE_HARD_MIN} each before any voice: fix these, run the check again, then review again.`
        : 'Fix these in the spec or your Film, run the check again, then review again. A shot that is not crafted is REPLACED (a real photo with Ink marks, a current app screen, a kit data part), never polished.',
  ].join('\n');
};

const callApi = async (png, env, kind) => {
  if (!String(env.ANTHROPIC_API_KEY ?? '').trim()) return {skip: 'no API key'};
  const k = knobs();
  const pace = mayPlan(readLedger(k.file), Date.now(), k);
  if (!pace.ok) return {skip: `credits: ${pace.why}`};
  let api;
  try {
    api = await import('./engine/api.mjs');
  } catch (e) {
    return {skip: `the engine is not installed: ${e.code || e.message}`};
  }
  const {Anthropic, zodOutputFormat, z} = api;
  const model = /^[a-z0-9][a-z0-9.-]{2,60}$/.test(String(env.STUDIO_DIRECTOR_MODEL ?? '')) ? env.STUDIO_DIRECTOR_MODEL : 'claude-opus-5-5';
  const client = new Anthropic({apiKey: String(env.ANTHROPIC_API_KEY).trim(), maxRetries: 1});
  let usd = 0;
  try {
    const res = await client.messages.parse(
      {
        model,
        max_tokens: 4000,
        system: RUBRIC,
        output_config: {format: zodOutputFormat(schemaOf(z))},
        messages: [{role: 'user', content: [{type: 'image', source: {type: 'base64', media_type: 'image/png', data: fs.readFileSync(png).toString('base64')}}, {type: 'text', text: `The ${kind === 'final' ? 'rendered film, one frame a second' : "film's shots, before the render"}. Score it.`}]}],
      },
      {timeout: 150e3},
    );
    usd += costOf(res.usage, model);
    record('ad', usd, {k});
    if (res.stop_reason === 'refusal' || !res.parsed_output) return {skip: `no review (${res.stop_reason})`, usd};
    return {out: res.parsed_output, usd};
  } catch (e) {
    try {
      record('ad', usd, {k});
    } catch {}
    const status = e?.status ?? 0;
    if (status === 400 && /credit|billing/i.test(String(e?.message))) {
      try {
        markEmpty('billing_error', {k});
      } catch {}
    }
    return {skip: `no review: ${status || e?.name || 'error'}`, usd};
  }
};

/** Several looks at one sheet -> one: the LOWER score of each row (a single look is not calibrated: the r1 car film scored
 *  "fix 6/12" before the voice and "fail 5/12, crafted 0" after the render), and the fixes of all looks, by shot, 6 at most. */
export const lowerOf = (outs) => {
  if (outs.length === 1) return outs[0];
  const scores = Object.fromEntries(ROWS.map((r) => [r, Math.min(...outs.map((o) => (Number.isInteger(o?.scores?.[r]) ? o.scores[r] : 0)))]));
  const seen = new Set();
  const fixes = outs
    .flatMap((o) => o?.fixes ?? [])
    .filter((f) => {
      const k = `${f.shot}:${String(f.what).slice(0, 40).toLowerCase()}`;
      return !seen.has(k) && seen.add(k);
    })
    .sort((a, b) => a.shot - b.shot)
    .slice(0, 6);
  return {scores, fixes};
};

/** One look (tools/ci/filmgate.mjs uses it before the voice, `kind` "gate"): {skip} when there is no review (no key, the
 *  credits, an API error), else {v: verdictOf(...), out: {scores, fixes}, usd}; the round goes into out/ci/artdirector-<id>.json. */
export const assess = async (id, png, kind, env = process.env, {looks = 1} = {}) => {
  const outs = [];
  let usd = 0;
  for (let k = 0; k < Math.max(1, looks); k++) {
    const r = await callApi(png, env, kind);
    usd += r.usd ?? 0;
    if (r.skip) {
      if (!outs.length) return {skip: r.skip};
      break;
    }
    outs.push(r.out);
  }
  const out = lowerOf(outs);
  const r = {out, usd};
  // each look's own scores, for the gate's log (the r3x round-2 panel: 5 of 6 looks gave the identical vector)
  const lookScores = outs.map((o) => o?.scores ?? null);
  const v = verdictOf(r.out.scores);
  const st = readState(id);
  st.rounds.push({kind, at: new Date().toISOString(), looks: outs.length, lookScores, ...v, scores: r.out.scores, fixes: r.out.fixes, usd: +r.usd.toFixed(4)});
  fs.mkdirSync(path.dirname(stateFile(id)), {recursive: true});
  fs.writeFileSync(stateFile(id), JSON.stringify(st, null, 1));
  return {v, out: r.out, usd: r.usd, looks: lookScores};
};

/** The exit code of "final": a FAIL (a hard row under 1: whole, one hue, crafted) stops the film (the p3 prove run: v136 was
 *  scored "fail 4/12" and published anyway); a fix verdict, a pass or no review lets it go on. STUDIO_AD_STOP=0 turns it off. */
export const finalExit = (verdict, env = process.env) => (verdict === 'fail' && String(env.STUDIO_AD_STOP ?? '') !== '0' ? 3 : 0);

const main = async (argv, env = process.env) => {
  const [cmd, id, sheet] = argv;
  if (!/^(review|final)$/.test(cmd ?? '') || !/^v\d+-[a-z0-9-]+$/.test(id ?? '')) {
    console.log('usage: node tools/ci/artdirector.mjs review <id> | final <id> <sheet.png>');
    return 2;
  }
  const png = cmd === 'final' ? sheet : path.join(root, 'out', `${id}.sheet.png`);
  if (!png || !fs.existsSync(png)) {
    console.log(`art director: no sheet (${cmd === 'final' ? 'the render step makes it' : `run node tools/check.mjs ${id} first`})`);
    return 0;
  }
  const st = readState(id);
  if (cmd === 'review' && st.rounds.length >= ROUNDS) {
    const last = st.rounds[st.rounds.length - 1];
    console.log(`art director: ${ROUNDS} rounds done (the last: ${last.verdict} ${last.total}/12); finish the film`);
    return 0;
  }
  const r = await callApi(png, env, cmd);
  if (r.skip) {
    console.log(`art director: ${r.skip}; go on with your own review of the sheet`);
    return 0;
  }
  const v = verdictOf(r.out.scores);
  st.rounds.push({kind: cmd, at: new Date().toISOString(), ...v, scores: r.out.scores, fixes: r.out.fixes, usd: +r.usd.toFixed(4)});
  fs.mkdirSync(path.dirname(stateFile(id)), {recursive: true});
  fs.writeFileSync(stateFile(id), JSON.stringify(st, null, 1));
  if (cmd === 'final') {
    // the public log and the job summary: numbers only
    const line = `art director (after the render): ${v.verdict} ${v.total}/12 (${ROWS.map((x) => `${x} ${r.out.scores[x]}`).join(', ')}), $${r.usd.toFixed(2)}`;
    console.log(line);
    if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY, `${line}\n`);
    // its fixes by shot ("shot N" is the Nth second of the film on this sheet): about the pictures only (the rubric never
    // comments on the words), so a judge can find the shots it marked without the sheet
    for (const f of r.out.fixes ?? []) console.log(`  shot ${f.shot}: ${clean(f.what, 240)}`);
    const code = finalExit(v.verdict, env);
    if (code) console.log(`::error::ART_DIRECTOR the rendered film failed a hard row (${v.hardFail.join(', ')}): it is not published (its film, sheet and the art director's notes go to the artifact rejected-${id})`);
    return code;
  }
  console.log(reviewText(r.out));
  return 0;
};

const selfTest = () => {
  let bad = 0;
  const ok = (cond, what) => {
    if (!cond) bad++;
    console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`);
  };
  const rec = {scores: {legible: 2, oneHue: 2, whole: 1, explained: 2, fresh: 1, crafted: 2}, fixes: [{shot: 3, what: 'Lift the row higher; the phone foot nearly touches the caption band.\u0007'}]};
  const v = verdictOf(rec.scores);
  ok(v.total === 10 && v.pass && v.verdict === 'pass', 'the scores are read: 10/12 passes');
  ok(verdictOf({...rec.scores, whole: 0}).verdict === 'fail', 'a hard row at 0 fails whatever the total');
  ok(verdictOf({legible: 1, oneHue: 1, whole: 1, explained: 1, fresh: 1, crafted: 1}).verdict === 'fix', 'a weak sheet with no hard failure is a fix round');
  ok(!/\u0007/.test(reviewText(rec)) && /shot 3: Lift the row/.test(reviewText(rec)), 'the fixes print clean');
  ok(verdictOf({}).verdict === 'fail', 'an empty reply fails');
  ok(finalExit('fail', {}) === 3 && finalExit('fix', {}) === 0 && finalExit('pass', {}) === 0 && finalExit('fail', {STUDIO_AD_STOP: '0'}) === 0, 'a final FAIL stops the film (exit 3), a fix or a pass goes on');
  {
    const lo = lowerOf([{scores: {legible: 2, oneHue: 2, whole: 2, explained: 1, fresh: 1, crafted: 1}, fixes: [{shot: 2, what: 'a'}]}, {scores: {legible: 1, oneHue: 2, whole: 2, explained: 2, fresh: 1, crafted: 0}, fixes: [{shot: 1, what: 'b'}, {shot: 2, what: 'a'}]}]);
    ok(lo.scores.crafted === 0 && lo.scores.legible === 1 && lo.scores.explained === 1 && lo.fixes.map((f) => f.what).join() === 'b,a', 'two looks: the lower score of each row, the fixes of both by shot');
  }
  ok(ROWS.length * 2 === 12 && HARD.every((h) => ROWS.includes(h)), 'the rubric: 6 rows, 12 points, the hard rows among them');
  // the rounds stop after ROUNDS
  const id = 'v999999-selftest';
  fs.mkdirSync(path.dirname(stateFile(id)), {recursive: true});
  fs.writeFileSync(stateFile(id), JSON.stringify({rounds: [{verdict: 'fix', total: 7}, {verdict: 'fix', total: 8}]}));
  fs.writeFileSync(path.join(root, 'out', `${id}.sheet.png`), Buffer.from([137, 80, 78, 71]));
  const logs = [];
  const log0 = console.log;
  console.log = (s) => logs.push(String(s));
  return main(['review', id], {})
    .then((rc) => {
      console.log = log0;
      ok(rc === 0 && logs.some((l) => /2 rounds done/.test(l)), 'a third review call stops: the film is finished with what it has');
      fs.rmSync(stateFile(id), {force: true});
      fs.rmSync(path.join(root, 'out', `${id}.sheet.png`), {force: true});
      console.log(bad ? `${bad} failed` : 'all ok');
      return bad ? 1 : 0;
    })
    .catch((e) => {
      console.log = log0;
      console.log(`FAIL ${e.message}`);
      return 1;
    });
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === '--test') process.exit(await selfTest());
  process.exit(await main(process.argv.slice(2)));
}
