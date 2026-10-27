// The shout's layout (the humour kit, r3), pure and shared: src/scenes/kit/shout.tsx draws it, tools/ci/humor.mjs checks it
// (HINGE_WORD, and the self-test below: the punched word at its peak never meets a neighbour, the line below or the edge).
//
//   shoutLayout(words, hinge, top, bottom, measure)   the lines, each word with its x and width (stage px)
//   punchOf(line, j)                                  word j's peak scale on its slam frame (from its centre, 1 .. 1.06)
//   hingeIndex(words, hinge)                          the word the hinge names (its first 5 letters), or -1
//   shoutProblems(lines, top, bottom, measure)        what the punched layout breaks, one line each ([] when clean)
//   node src/lib/shout.mjs --test
//
// r3 review (2026-10-27): every word not said yet stood at 1.3x from its left edge (the punch's start held before its
// frame), so the pale ghosts ran into each other and the hinge „დიზელი" past the frame's right edge (v906 f66-70). Now a
// word is at 1x until its frame, punches from its CENTRE to at most 1.06x, and only as far as the room it has: half the
// gap to each neighbour, PUNCH_ROOM past the measure at the line's ends.
import {fitLines, textW} from './textfit.mjs';
import {P2_STAGE, P2_TEXT_INSET, P2_TEXT_W, P2_TT} from './p2.mjs';

export const BLEEP = /#@%|\{bleep/;
export const OPTS = Object.freeze({weight: 700, mtav: true});
/** the bleep bar's width in ems (the glyphs' own widths are not in the font table: the bar ran to x 1048 in the r3 stills) */
export const BAR_EM = 2.2;
/** the gap between two words, in ems of the line */
export const GAP_EM = 0.28;
/** the punch: a word slams in at most this big (from its centre) and settles to 1 */
export const PUNCH_MAX = 1.06;
/** px a line's first or last word may pass the measure while it punches (the line starts 20 px inside the stage) */
export const PUNCH_ROOM = 16;
/** the share of the line's box the Mtavruli caps fill (vertical check; the caps sit in the middle of a size-px box) */
const INK_H = 0.8;
const STAGE_L = P2_STAGE.left + P2_TEXT_INSET;
const STAGE_R = P2_STAGE.right - P2_TEXT_INSET;
const TEXT_W = Math.min(P2_TEXT_W, STAGE_R - STAGE_L);
/** the line's left edge */
export const SHOUT_X = STAGE_L + 20;
/** the measure keeps 7 % in hand: the bold Mtavruli draws about that much wider than the table says (the r3 stills) */
export const SHOUT_MEASURE = Math.round((TEXT_W - 40) * 0.93);

export const norm = (w) => String(w).replace(/[.,!?;:„“"«»()…]/g, '').toLowerCase();
export const wordW = (w, px) => (BLEEP.test(w.text) ? BAR_EM * px : textW(w.text, px, OPTS));
/** the word the hinge names: the same 5-letter prefix match the layout sets on its own line */
export const hingeIndex = (words, hinge) => {
  const h = norm(hinge ?? '').slice(0, 5);
  if (!h) return -1;
  return words.findIndex((w) => !BLEEP.test(w.text) && norm(w.text).startsWith(h));
};

/** a beat's "say" as the shout's words (chunks joined; the render's ctx.words carry the same tokens) */
export const sayWords = (say) => String(say ?? '').replace(/\|/g, ' ').split(/\s+/).filter(Boolean).map((text) => ({text, at: 0}));
/** NewsCard's headline fit and the line its hinge stands on (src/scenes/NewsCard.tsx draws with this, the lints read it) */
export const newsHinge = (headline, hinge) => {
  const fit = fitLines(headline ?? '', STAGE_R - STAGE_L - 100, 4, 96, {...OPTS, min: 52});
  const li = hinge ? fit.lines.findIndex((l) => l.includes(hinge)) : -1;
  // a hinge on the last line (or a one-line headline) is marked; one on an upper line is left to the stamp
  return {fit, li, drawn: li >= 0 && (fit.lines.length === 1 || li === fit.lines.length - 1)};
};
/** the hinge a scene names is DRAWN (r3 review: „ზზზზზზ" counted as a kit part and drew nothing): ShoutType and SideCar
 *  find it among the beat's words by its first 5 letters, NewsCard in its headline's last line */
export const hingeDrawn = (scene, say) => {
  const h = typeof scene?.hinge === 'string' ? scene.hinge.trim() : '';
  if (!h) return false;
  if (scene.type === 'NewsCard') return newsHinge(scene.headline, h).drawn;
  if (scene.type === 'ShoutType' || scene.type === 'SideCar') return hingeIndex(sayWords(say), h) >= 0;
  return false;
};

/** The poster layout (r3, 2026-10-27): every line set to fill the measure (a short line gets BIG, as a shout on a poster
 *  does), the hinge word on a line of its own, the stack scaled to fit between `top` and `bottom`. */
export const shoutLayout = (words, hinge, top, bottom, measure = SHOUT_MEASURE) => {
  const h = hingeIndex(words, hinge);
  // the words broken greedily into lines no wider than the measure at `px`
  const breakAt = (ws, px) => {
    const out = [];
    let cur = [];
    let w = 0;
    for (const x of ws) {
      const ww = wordW(x, px);
      if (cur.length && w + px * GAP_EM + ww > measure) {
        out.push({ws: cur, hinge: false});
        cur = [];
        w = 0;
      }
      w += (cur.length ? px * GAP_EM : 0) + ww;
      cur.push(x);
    }
    if (cur.length) out.push({ws: cur, hinge: false});
    return out;
  };
  // each line fills the measure: its size from its width at 100 px, a line at most 230 px (the hinge 250)
  const sizeOf = (g) => {
    const w100 = g.ws.reduce((t, w) => t + wordW(w, 100), 0) + (g.ws.length - 1) * GAP_EM * 100; // the words and the gaps as drawn
    return Math.min(g.hinge ? 250 : 230, (100 * measure) / Math.max(1, w100)); // never wider than the measure
  };
  // the stack: lines at 0.98 of their size, the hinge line keeps room under it for the marker's underline
  const gap = (l) => l.size * (l.hinge ? 1.18 : 0.98);
  // the hinge stays the biggest word on the poster where it can: a lone short word („რა") would otherwise outgrow it (a long
  // hinge, „გადავაფრინდე", is held small by the measure: the others keep 120 px)
  const hs = h >= 0 ? sizeOf({ws: [words[h]], hinge: true}) : 0;
  const cap = hs ? Math.max(0.85 * hs, 120) : 230;
  const layout = (px) => {
    const groups = h >= 0 ? [...breakAt(words.slice(0, h), px), {ws: [words[h]], hinge: true}, ...breakAt(words.slice(h + 1), px)] : breakAt(words, px);
    const sized = groups.map((g) => ({...g, size: g.hinge ? sizeOf(g) : Math.min(sizeOf(g), cap)}));
    return {sized, total: sized.reduce((t, l) => t + gap(l), 0)};
  };
  // r3 review (the figure is gone, the poster fills the stage): the biggest break whose stack still fits the box: shorter
  // lines set bigger (a shout of 1-2 words a line), never a long line at a third of the box's height
  let best = layout(50);
  for (let px = Math.floor(Math.min(230, cap)); px >= 50; px -= 4) {
    const l = layout(px);
    if (l.total <= bottom - top) {
      best = l;
      break;
    }
  }
  const {sized, total} = best;
  const k = Math.min(1, (bottom - top) / Math.max(1, total));
  // a short stack stands in the middle of its box (the poster, not a line hung from the top)
  let y = top + Math.max(0, (bottom - top - total * k) / 2);
  return sized.map((l) => {
    const size = Math.floor(l.size * k);
    let x = SHOUT_X;
    const ws = l.ws.map((w) => {
      const ww = wordW(w, size);
      const out = {...w, x, w: ww};
      x += ww + size * GAP_EM;
      return out;
    });
    const out = {ws, size, y, hinge: l.hinge, measure};
    y += gap({size, hinge: l.hinge});
    return out;
  });
};

/** word j's peak scale: from its centre, never past half the gap to a neighbour or PUNCH_ROOM past the measure */
export const punchOf = (line, j) => {
  const w = line.ws[j];
  const half = (line.size * GAP_EM) / 2 - 2;
  const lo = j ? half : w.x - (SHOUT_X - PUNCH_ROOM);
  const hi = j < line.ws.length - 1 ? half : SHOUT_X + (line.measure ?? SHOUT_MEASURE) + PUNCH_ROOM - (w.x + w.w);
  const room = Math.max(0, Math.min(lo, hi));
  return Math.max(1, Math.min(PUNCH_MAX, 1 + (2 * room) / Math.max(1, w.w)));
};

/** the punched box of word j at its peak (stage px) */
export const punchBox = (line, j) => {
  const w = line.ws[j];
  const s = punchOf(line, j);
  const cx = w.x + w.w / 2;
  const cy = line.y + line.size / 2;
  return {x0: cx - (s * w.w) / 2, x1: cx + (s * w.w) / 2, y0: cy - (s * INK_H * line.size) / 2, y1: cy + (s * INK_H * line.size) / 2, s};
};

/** what the punched layout breaks: a word at its peak over a neighbour at ITS peak, over the line below, past the
 *  measure's room, the stage or TikTok's action column, or the stack past the shout's box */
export const shoutProblems = (lines, top, bottom) => {
  const out = [];
  lines.forEach((l, i) => {
    l.ws.forEach((w, j) => {
      const b = punchBox(l, j);
      const t = `line ${i} „${w.text}" at ${b.s.toFixed(3)}x`;
      if (j && b.x0 < punchBox(l, j - 1).x1) out.push(`${t} meets „${l.ws[j - 1].text}"`);
      if (b.x0 < SHOUT_X - PUNCH_ROOM - 0.5 || b.x1 > SHOUT_X + (l.measure ?? SHOUT_MEASURE) + PUNCH_ROOM + 0.5) out.push(`${t} passes the measure (x ${Math.round(b.x0)}..${Math.round(b.x1)})`);
      if (b.x0 < STAGE_L || b.x1 > STAGE_R || b.x1 > P2_TT.right) out.push(`${t} passes the stage or TikTok's column (x ${Math.round(b.x1)})`);
      const next = lines[i + 1];
      if (next) {
        const nTop = next.y + next.size / 2 - (INK_H * next.size) / 2;
        if (b.y1 > nTop) out.push(`${t} reaches the line below (y ${Math.round(b.y1)} > ${Math.round(nTop)})`);
      }
    });
    if (l.y < top - 0.5 || l.y + l.size > bottom + l.size * 0.25) out.push(`line ${i} stands outside the shout's box (y ${Math.round(l.y)}, ${l.size} px)`);
  });
  return out;
};

const selfTest = () => {
  let bad = 0;
  const ok = (c, w) => {
    if (!c) bad++;
    console.log(`${c ? 'ok  ' : 'FAIL'} ${w}`);
  };
  const W = (t) => t.split(/\s+/).map((text, k) => ({text, at: 10 + 6 * k}));
  const shouts = [
    ['დიზელი მეწვება და შენ მისიგნალებ, შე {bleep}!', 'დიზელი'],
    ['მეოთხედ გეუბნები, ჩემი ადგილია!', 'მეოთხედ'],
    ['რას მისიგნალებ, შენ დედასაც გავკარი, გადავაფრინდე?!', 'გადავაფრინდე'],
    ['საწვავი გამითავდა და შენ კიდევ მიყვირი?', 'საწვავი'],
    ['ცხრა საათია აქ ვდგავარ, ჩემო ძმაო!', ''],
    ['ჰოო', 'ჰოო'],
    ['ერთი ორი სამი ოთხი ხუთი ექვსი შვიდი რვა ცხრა ათი თერთმეტი თორმეტი ცამეტი', 'ოთხი'],
  ];
  // the kit's two boxes: ShoutType fills the stage, SideCar sets the shout under its car
  for (const [top, bottom] of [[P2_STAGE.top, P2_STAGE.bottom], [P2_STAGE.top + 600, P2_STAGE.bottom]])
    for (const [s, h] of shouts) {
      const lines = shoutLayout(W(s), h || undefined, top, bottom);
      const p = shoutProblems(lines, top, bottom);
      ok(!p.length, `„${s.slice(0, 28)}…" in ${top}..${bottom}: ${lines.length} lines, the punch inside${p.length ? `: ${p.join(' / ')}` : ''}`);
    }
  // the guard itself: the old punch (1.3x from the left edge) is refused
  const lines = shoutLayout(W(shouts[0][0]), 'დიზელი', P2_STAGE.top, P2_STAGE.bottom);
  const old = lines.map((l) => ({...l, ws: l.ws.map((w) => ({...w, w: w.w * 1.3}))}));
  ok(shoutProblems(old, P2_STAGE.top, P2_STAGE.bottom).length > 0, 'a word drawn 30 % wider than its slot is refused');
  ok(lines.some((l) => l.hinge && norm(l.ws[0].text) === 'დიზელი'), 'the hinge stands on its own line');
  ok(hingeDrawn({type: 'ShoutType', hinge: 'ზზზზზზ'}, 'მეოთხედ გეუბნები, | ჩემი ადგილია!') === false && hingeDrawn({type: 'SideCar', hinge: 'მეოთხედ'}, 'მეოთხედ გეუბნები, | ჩემი ადგილია!'), 'hingeDrawn: a shout hinge is one of the beat\'s words');
  ok(newsHinge('63 141 მანქანა გავიდა', 'გავიდა').drawn && !hingeDrawn({type: 'NewsCard', headline: '63 141 მანქანა გავიდა', hinge: 'ზზზ'}, ''), 'hingeDrawn: a NewsCard hinge stands in its headline');
  ok(hingeIndex(W('მეოთხედ გეუბნები'), 'ზზზზზზ') === -1 && hingeIndex(W('მეოთხედ გეუბნები'), 'მეოთხედი') === 0, 'hingeIndex: the 5-letter prefix, a made-up hinge matches nothing');
  console.log(bad ? `${bad} failed` : 'all ok');
  return bad ? 1 : 0;
};
if (typeof process !== 'undefined' && /shout\.mjs$/.test(process.argv?.[1] ?? '') && process.argv[2] === '--test') process.exit(selfTest());
