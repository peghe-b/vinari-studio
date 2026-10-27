// The cover's compositions (rebuilt 2026-10-27 after the owner's „ეს ტელეფონის ქავერი მოქაფში ერთდაიგივეებია, არც ჩანს
// წესიერად": 6 of 11 new covers were the same tilted phone, unreadable in the gallery tile, and one was the bare logo).
// Shared by the render (src/Cover.tsx, src/cover/*.tsx), the layout (./layout.mjs) and the lints (tools/build-index.mjs,
// tools/check.mjs, tools/ci/cover.mjs). Plain JS, typed by comps.d.mts.
//
// Every cover is PURPOSE-BUILT and black and white on the paper #F3F3F3, in the frame the owner approved (the lockup, a
// hairline, a two-line Mtavruli headline), then ONE picture, which is one of ten compositions:
//   stat      one hero number (a count, a year, a price, a time, a code) with its label, circled or underlined
//   versus    two things compared (a claim against the truth, before against after): side by side or stacked
//   bars      two or three amounts of the same thing (the ticked „მუსიკა თავისით ჩაიწევა" card, enlarged)
//   detail    one element of a REAL current screen, WHOLE, on its own screen (the capture's pixels: the lock screen's banner
//             on its wallpaper), its key big
//   phone     one row of a real current screen, enlarged as the app draws it: the row's own icon (the capture's pixels) and
//             its own words as type, the key big (27 Oct, round 3: the small tilted phone is gone, the judges: a 70 px phone
//             in the 300 px tile shows nothing, and the same home screen came back film after film)
//   carplay   the real CarPlay capture in the car's display, tilted (the ticked CarPlay cover), CarPlay films only
//   polaroid  the story's real photo as an instant photo, with a tag (the ticked „მარტო მეექვსე" cover)
//   quote     one spoken line in a speech bubble, with its speaker (the app's mark or a real photo), once in 6 at most
//   steps     how it works, in 2 or 3 moves
//   timeline  when: 2 or 3 times, dates or day counts on a rail
// Never a film frame and never the logo: an older spec, or a cover that breaks its guards, is rebuilt from the film's own
// data by ./pick.mjs (its FilmTitleCard, a labelled number, its Ledger, its opening line).

export const COMPS = Object.freeze(['stat', 'versus', 'bars', 'detail', 'phone', 'carplay', 'polaroid', 'quote', 'steps', 'timeline']);
/** the kinds of the first cover system (2026-10-26): read on older specs, refused on new films in the cloud */
export const OLD_KINDS = Object.freeze(['card', 'screen']);
/** kept for older imports: the kinds a spec may name today */
export const COVER_KINDS = COMPS;
export const MARKS = Object.freeze(['circle', 'underline', 'strike', 'arrow', 'tick']);
export const CARPLAY_SCREENS = Object.freeze(['f18-03-home-car', 'f18-06-list-car', 'f18-07-preview-car', 'f18-10-guid1-car', 'f18-12-lanes-car', 'f18-14-arrived-car']);
/** the tilted phone's poses of 26-27 Oct (older ledger lines carry them; the phone row of round 3 has none) */
export const PHONE_POSES = Object.freeze(['left-lean', 'right-lean', 'left-back', 'right-back']);
export const PILL = 'VINARI+';
/** the categories with no app in them: no „VINARI+" pill on their cover */
export const NO_APP_PILL = Object.freeze(['stories', 'carinfo', 'humor']);

/** Which compositions each category may use, in its order of preference (the brief offers what the variety rule leaves).
 *  detail and phone drop out by themselves when the category has no verified current capture with a named region. */
// (27 Oct, round 2) the quote is LAST everywhere and never a default: a line of text in a bubble is not an infographic, a
// photo or a real screen (the judges); a real screen (phone, detail) or photo comes early wherever the category has one.
// Every category also has two compositions that need nothing but the film's own words or numbers (steps or versus, stat),
// so the variety rule always leaves one that is not a quote (tools/ci/coverlog.mjs).
export const CAT_COMPS = Object.freeze({
  stories: ['polaroid', 'stat', 'timeline', 'versus', 'quote'],
  humor: ['versus', 'stat', 'steps', 'quote'],
  carinfo: ['stat', 'versus', 'bars', 'polaroid', 'steps', 'timeline'],
  nav: ['detail', 'phone', 'bars', 'stat', 'versus', 'quote'],
  parking: ['phone', 'detail', 'steps', 'versus', 'stat', 'quote'],
  qr: ['steps', 'phone', 'versus', 'stat', 'quote'],
  vin: ['detail', 'phone', 'versus', 'steps', 'stat', 'quote'],
  engine: ['detail', 'phone', 'steps', 'versus', 'stat', 'quote'],
  obd: ['phone', 'stat', 'versus', 'detail', 'steps', 'quote'],
  reminders: ['timeline', 'stat', 'phone', 'detail', 'steps', 'quote'],
  widgets: ['phone', 'detail', 'versus', 'steps', 'stat', 'quote'],
  auction: ['stat', 'detail', 'versus', 'bars', 'steps', 'quote'],
  docs: ['steps', 'phone', 'versus', 'detail', 'stat', 'quote'],
  general: ['steps', 'phone', 'detail', 'stat', 'versus', 'quote'],
  whatsnew: ['detail', 'phone', 'steps', 'stat', 'versus', 'quote'],
  free: ['stat', 'polaroid', 'steps', 'detail', 'versus', 'phone', 'quote'],
});
/** a category the table does not name (a new one, a retired one): the safe five, the quote last */
export const DEFAULT_COMPS = Object.freeze(['stat', 'steps', 'versus', 'detail', 'quote']);
/** How a cover reads in the grid at 300 px, by what is DRAWN (the variety rule R4, R6, R7 and R8 count the looks, not the
 *  names: the 27 Oct judges, „8 of 13 tiles are a white card with Georgian words", and round 3, „03, 04 and 12 read as a
 *  white card of words"): "card" a white card of words (versus, bars, steps, quote, and the phone's enlarged row: its card
 *  is the picture), "dark" the black card (the stat's slab, the black versus), "type" bare big type on the paper (stat,
 *  timeline), "photo" a real photo (polaroid), "screen" a real app screen's own pixels as the picture (detail, carplay).
 *  `look` is what the layout recorded for a drawn cover (the ledger's "look"): it wins over the name. */
export const LOOKS = Object.freeze(['card', 'dark', 'type', 'photo', 'screen']);
export const lookOf = (comp, variant, look) => {
  if (LOOKS.includes(look)) return look;
  if (/dark|slab/.test(String(variant ?? ''))) return 'dark';
  if (comp === 'detail' || comp === 'carplay') return 'screen';
  if (comp === 'polaroid') return 'photo';
  if (comp === 'stat' || comp === 'timeline') return 'type';
  return 'card';
};
/** a picture: a real photo or a real screen's own pixels (the judges: at most 2 covers without one in a row, any direction) */
export const isPicture = (look) => look === 'photo' || look === 'screen';
export const compsFor = (cat) => [...(CAT_COMPS[cat] ?? DEFAULT_COMPS)];

// the short-text limits (SKILL.md Cover): what can still be set at its tier inside the picture area
export const LIMIT = Object.freeze({
  statValue: 7, // characters of a stat's value ("186 000" is 7)
  statUnit: 6, // „ღილაკი" (27 Oct, round 3)
  label: 14, // letters of a label (versus side, bars row, timeline stop)
  statLabel: 28, // letters of a stat's label (two lines at 96)
  sub: 30,
  note: 34,
  step: 11, // letters of a step's text
  tag: 6, // characters of a polaroid tag
  quoteLetters: 40,
  quoteLines: 3,
  timelineValue: 6,
  shown: 8, // a bar's printed amount ("45,4 %")
  source: 40,
});

const isStr = (x) => typeof x === 'string' && x.trim().length > 0;
/** letters (and digits), without spaces, punctuation, "|" or quote marks */
export const letters = (s) => String(s ?? '').replace(/[\s|„“”"'.,:;!?…«»()\-–]/g, '').length;
const frac = (x) => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 1;
const marksOf = (m) => (m === undefined ? [] : Array.isArray(m) ? m : [m]);
const hasDigit = (s) => /\d/.test(String(s ?? ''));

/** The composition a cover asks for: a new kind as it is; an old "card" maps to stat (one row), versus (two numbers) or bars;
 *  an old "screen" is "carplay" on a CarPlay capture and "screen" otherwise (./pick.mjs sends it to the net); no kind: null. */
export const coverKind = (cover) => {
  if (!cover || typeof cover !== 'object') return null;
  const k = cover.kind;
  if (COMPS.includes(k)) return k;
  if (k === 'card') {
    const rows = Array.isArray(cover.card?.rows) ? cover.card.rows : [];
    if (cover.card?.type === 'bars') return 'bars';
    return rows.length === 1 ? 'stat' : 'versus';
  }
  if (k === 'screen') return CARPLAY_SCREENS.includes(cover.screen?.src) ? 'carplay' : 'screen';
  if (k === undefined && cover.polaroid === true) return 'polaroid';
  return null;
};

/** The capture a cover shows ("detail", "phone", "carplay") and the photo ("polaroid"), as one asset id for the ledger:
 *  "07-parking#spot-row", "story-toyota-2016-1"; null for the rest. */
export const coverAsset = (cover) => {
  if (!cover || typeof cover !== 'object') return null;
  const k = cover.kind;
  if (k === 'detail' || k === 'phone') {
    const d = cover[k] ?? {};
    return isStr(d.src) ? `${d.src}${isStr(d.region) ? `#${d.region}` : ''}` : null;
  }
  if (k === 'carplay') return isStr(cover.carplay?.src) ? cover.carplay.src : isStr(cover.screen?.src) ? cover.screen.src : null;
  if (k === 'screen') return isStr(cover.screen?.src) ? cover.screen.src : null;
  if (k === 'polaroid') {
    const p = cover.polaroid?.photo ?? cover.photo;
    const first = Array.isArray(p) ? p[0] : p;
    return isStr(first) ? first : null;
  }
  return null;
};

/** semver-ish "1.0.10" >= "1.0.5", part by part */
export const versionAtLeast = (a, b) => {
  const pa = String(a ?? '').split('.').map((x) => parseInt(x, 10) || 0);
  const pb = String(b ?? '').split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0);
  }
  return true;
};

/**
 * What is wrong with spec.cover, as one-line problems ("COVER_..."). ctx (all optional):
 *   screens   a Set of the current captures' names (public/screens/*.jpg)
 *   retired   a Set of the retired ones (public/screens/_retired)
 *   photo     (src) => true when public/photos has it
 *   photoInfo (src) => the photos.json entry
 *   syms      a Set of the app's icon names (src/scenes/kit/symbols.ts)
 *   regions   public/screens/regions.json (the named regions of each capture)
 *   screenInfo public/screens/screens.json "screens" (each capture's "verified" app version)
 *   store     the app version the App Store has (categories.json store.known, tools/ci/release.mjs)
 *   needKind  true: the cloud, a new film: a "kind" of today is required, the old "card" and "screen" are refused
 */
export const coverProblems = (cover, ctx = {}) => {
  const out = [];
  if (!cover || typeof cover !== 'object') return ['COVER no "cover" {title, kind, ...}'];
  if (!isStr(cover.title)) out.push('COVER_TEXT no "title": two short lines, "|" breaks them');
  else {
    const lines = cover.title.split('|');
    if (lines.length > 2) out.push(`COVER_TEXT "title" has ${lines.length} lines: two at most ("|" once)`);
    if (cover.title.includes('—')) out.push('COVER_TEXT an em dash (—) in the title');
  }
  if ('frame' in cover || 'hook' in cover) out.push('COVER_FRAME "frame"/"hook" are gone: the cover is never a film frame; name its "kind" and its data instead');
  const kind = cover.kind;
  if (kind === undefined) {
    if (ctx.needKind) out.push(`COVER_KIND no "kind": one of ${COMPS.join(', ')} (SKILL.md Cover)`);
    return out;
  }
  if (kind === 'card') {
    if (ctx.needKind) out.push(`COVER_KIND "card" is gone: write "versus" (two values) or "bars" (amounts) with their own data (SKILL.md Cover)`);
    return out;
  }
  if (kind === 'screen') {
    if (ctx.needKind) out.push('COVER_KIND "screen" is gone (the whole tilted phone on its own did not read at 300 px): use "detail" or "phone" with a named region (SKILL.md Cover)');
    return out;
  }
  if (!COMPS.includes(kind)) return [...out, `COVER_KIND "kind" is "${kind}": one of ${COMPS.join(', ')}`];
  const data = cover[kind];
  if (kind !== 'carplay' && (!data || typeof data !== 'object')) return [...out, `COVER_DATA a "${kind}" cover needs "${kind}": {...} (SKILL.md Cover)`];
  const markOk = (m, where, allowed = MARKS) => {
    for (const k of marksOf(m)) if (!allowed.includes(k)) out.push(`COVER_MARK ${where} "${k}": one of ${allowed.join(', ')}`);
  };
  const noDash = (s, where) => {
    if (String(s ?? '').includes('—')) out.push(`COVER_TEXT an em dash (—) in ${where}`);
  };
  const icon = (name, where) => {
    if (!isStr(name) || (ctx.syms && !ctx.syms.has(name))) out.push(`COVER_ICON ${where} "${name}" is not one of the app's icons (src/scenes/kit/icons.tsx SYM_NAMES)`);
  };
  const capture = (src, where) => {
    if (!isStr(src)) return out.push(`COVER_SCREEN ${where} needs "src": a capture of public/screens`);
    if (ctx.retired?.has(src)) return out.push(`COVER_STALE_SCREEN "${src}" is retired (public/screens/_retired): the app no longer looks like it`);
    if (ctx.screens && !ctx.screens.has(src)) return out.push(`COVER_SCREEN "${src}" is not a current capture of public/screens`);
    const info = ctx.screenInfo?.[src];
    if (ctx.screenInfo && ctx.store && !(info?.verified && versionAtLeast(info.verified, ctx.store)))
      out.push(`COVER_STALE_SCREEN "${src}" is not verified against the app the store has (${ctx.store}; public/screens/screens.json "verified": ${info?.verified ?? 'none'}): measure it on the current build first`);
  };
  const region = (src, name) => {
    if (!isStr(name)) return out.push(`COVER_REGION a "${kind}" cover names its "region" (public/screens/regions.json)`);
    if (ctx.regions && isStr(src) && !ctx.regions[src]?.[name]) out.push(`COVER_REGION "${name}" is not a named region of "${src}" in public/screens/regions.json (${Object.keys(ctx.regions[src] ?? {}).join(', ') || 'it has none'})`);
  };

  if (kind === 'stat') {
    const v = String(data.value ?? '');
    if (!hasDigit(v) || v.length > LIMIT.statValue) out.push(`COVER_DATA stat.value "${v}": a number as shown (a digit in it), ${LIMIT.statValue} characters at most`);
    if (data.unit !== undefined && (!isStr(data.unit) || data.unit.length > LIMIT.statUnit)) out.push(`COVER_DATA stat.unit: ${LIMIT.statUnit} letters at most ("%", "დღე", "კმ")`);
    if (!isStr(data.label) || letters(data.label) > LIMIT.statLabel) out.push(`COVER_DATA stat.label: what the number is, ${LIMIT.statLabel} letters at most`);
    if (data.sub !== undefined && (!isStr(data.sub) || letters(data.sub) > LIMIT.sub)) out.push(`COVER_DATA stat.sub: one short line, ${LIMIT.sub} letters at most`);
    if (data.source !== undefined && (!isStr(data.source) || data.source.length > LIMIT.source)) out.push('COVER_DATA stat.source: one short line (whose figure it is)');
    if (data.variant !== undefined && data.variant !== 'slab') out.push('COVER_DATA stat.variant: "slab" or left out');
    markOk(data.mark ?? 'circle', 'stat.mark', ['circle', 'underline']);
    [data.label, data.sub, data.unit].forEach((s, i) => noDash(s, ['stat.label', 'stat.sub', 'stat.unit'][i]));
  }
  if (kind === 'versus') {
    const sides = [data.a, data.b];
    if (!sides.every((s) => s && typeof s === 'object')) out.push('COVER_DATA versus needs "a" and "b": {label, value} or {label, icon}');
    else {
      sides.forEach((s, i) => {
        const at = `versus.${'ab'[i]}`;
        if (!isStr(s.label) || letters(s.label) > LIMIT.label) out.push(`COVER_DATA ${at}.label: a word or two, ${LIMIT.label} letters at most`);
        if (s.icon !== undefined) {
          icon(s.icon, `${at}.icon`);
          if (ctx.needKind) out.push(`COVER_DATA ${at}.icon: two of the app's glyphs in discs read as clip-art in the tile (the 27 Oct judges; the owner bans primitive drawings): compare the film's own values or words, or show the real screen ("phone", "detail")`);
        }
        else if (!isStr(String(s.value ?? '')) || String(s.value).length > 9) out.push(`COVER_DATA ${at}.value: a short value as shown, 9 characters at most`);
        noDash(s.label, `${at}.label`);
      });
      const kindOf = (s) => (s.icon !== undefined ? 'icon' : hasDigit(s.value) ? 'number' : 'word');
      if (kindOf(data.a) !== kindOf(data.b)) out.push(`COVER_VERSUS_UNIT versus compares a ${kindOf(data.a)} with a ${kindOf(data.b)}: both sides the same kind (number and number, word and word, icon and icon)`);
    }
    if (data.win !== 'a' && data.win !== 'b') out.push('COVER_DATA versus.win: "a" or "b", the side that is right');
  }
  if (kind === 'bars') {
    const rows = Array.isArray(data.rows) ? data.rows : [];
    if (rows.length < 2 || rows.length > 3) out.push('COVER_DATA bars.rows: 2 rows (3 only when every label is 9 letters or fewer)');
    if (rows.length === 3 && rows.some((r) => letters(r?.label) > 9)) out.push('COVER_DATA bars: 3 rows only when every label is 9 letters or fewer');
    let marked = 0;
    rows.forEach((r, i) => {
      const at = `bars.rows[${i}]`;
      if (!r || typeof r !== 'object') return out.push(`COVER_DATA ${at} is {icon, label, value, shown?, mark?}`);
      if (!isStr(r.label) || letters(r.label) > LIMIT.label) out.push(`COVER_DATA ${at}.label: a few words, ${LIMIT.label} letters at most`);
      if (!frac(r.value)) out.push(`COVER_DATA ${at}.value: the bar's fill, a number 0..1, all rows on one scale`);
      // an icon only when the app's glyph IS the row's thing (car_battery for a battery); the app has no engine glyph, so a
      // row about the engine has none, and then no row has one (the 27 Oct judges: a car-front glyph for „ძრავი")
      if (r.icon !== undefined) icon(r.icon, `${at}.icon`);
      if (r.shown !== undefined && (!isStr(r.shown) || r.shown.length > LIMIT.shown)) out.push(`COVER_DATA ${at}.shown: the amount as printed, ${LIMIT.shown} characters at most`);
      markOk(r.mark, `${at}.mark`, ['circle', 'arrow', 'tick']);
      if (marksOf(r.mark).length) marked++;
      noDash(r.label, `${at}.label`);
    });
    if (marked > 2) out.push('COVER_MARK more than two marked rows: one mark says "look here", three say nothing');
    const withIcon = rows.filter((r) => r && r.icon !== undefined).length;
    if (withIcon && withIcon < rows.length) out.push('COVER_ICON bars: an icon on every row or on none (the app has no glyph for some things, the engine among them: then none)');
    if (data.note !== undefined && (!isStr(data.note) || letters(data.note) > LIMIT.note)) out.push(`COVER_DATA bars.note: one short line, ${LIMIT.note} letters at most`);
  }
  if (kind === 'detail' || kind === 'phone') {
    capture(data.src, kind);
    region(data.src, data.region);
    if (kind === 'detail') {
      markOk(data.mark ?? 'circle', 'detail.mark', ['circle', 'underline', 'none']);
      if (data.note !== undefined && (!isStr(data.note) || letters(data.note) > 28 || data.note.split('|').length > 2)) out.push('COVER_DATA detail.note: one or two short lines ("|" breaks them), 28 letters at most');
    }
    if (kind === 'phone' && data.pose !== undefined && !PHONE_POSES.includes(data.pose)) out.push(`COVER_DATA phone.pose "${data.pose}": one of ${PHONE_POSES.join(', ')} (the brief gives it)`);
  }
  if (kind === 'carplay') {
    const src = cover.carplay?.src ?? cover.screen?.src;
    if (!CARPLAY_SCREENS.includes(src)) out.push(`COVER_SCREEN "${src}" is not a CarPlay capture: one of ${CARPLAY_SCREENS.join(', ')}`);
  }
  if (kind === 'polaroid') {
    const ph = Array.isArray(data.photo) ? data.photo : [data.photo];
    if (ph.length > 2) out.push('COVER_PHOTO "polaroid.photo": one photo, or two for a true pair');
    for (const p of ph) if (!isStr(p) || (ctx.photo && !ctx.photo(p))) out.push(`COVER_PHOTO "${p}" is not in public/photos`);
    if (ctx.needKind && !isStr(data.tag)) out.push(`COVER_DATA polaroid.tag: the short thing the photo proves („3 წთ", „1967"), ${LIMIT.tag} characters at most`);
    if (data.tag !== undefined && (!isStr(data.tag) || [...data.tag].length > LIMIT.tag)) out.push(`COVER_DATA polaroid.tag: ${LIMIT.tag} characters at most`);
    markOk(data.mark ?? 'underline', 'polaroid.mark', ['underline', 'circle']);
    if (data.focus !== undefined && !(data.focus && frac(data.focus.x) && frac(data.focus.y))) out.push('COVER_DATA polaroid.focus: {x, y}, fractions of the photo');
    if (data.zoom !== undefined && !(typeof data.zoom === 'number' && data.zoom >= 1 && data.zoom <= 3)) out.push('COVER_DATA polaroid.zoom: 1 to 3');
    const info = isStr(ph[0]) && ctx.photoInfo ? ctx.photoInfo(ph[0]) : null;
    if (ctx.needKind && info && !info.subject && !(data.focus && data.zoom)) out.push(`COVER_PHOTO_SUBJECT "${ph[0]}" has no "subject" outline in photos.json: give "focus" and "zoom" so the face or the car fills a third of the window`);
  }
  if (kind === 'quote') {
    const t = String(data.text ?? '');
    if (!isStr(t)) out.push('COVER_DATA quote.text: the line, "|" breaks it');
    else {
      if (letters(t) > LIMIT.quoteLetters) out.push(`COVER_DATA quote.text has ${letters(t)} letters: ${LIMIT.quoteLetters} at most`);
      if (t.split('|').length > LIMIT.quoteLines) out.push(`COVER_DATA quote.text: ${LIMIT.quoteLines} lines at most`);
      if (/#@%|\{bleep/.test(t)) out.push('COVER_DATA quote.text: never a bleep on the cover');
      noDash(t, 'quote.text');
    }
    const sp = data.speaker ?? {kind: 'none'};
    if (!['app', 'photo', 'none'].includes(sp.kind)) out.push('COVER_DATA quote.speaker.kind: app, photo or none');
    else if (ctx.needKind && sp.kind === 'none') out.push('COVER_DATA quote.speaker: a quote shows who says it, the app\'s mark ("app": the app\'s own answer) or a real photo ("photo"): a bare line in a bubble is not a picture (the 27 Oct judges); no speaker, no quote: take another composition');
    if (sp.kind === 'photo' && (!isStr(sp.src) || (ctx.photo && !ctx.photo(sp.src)))) out.push('COVER_PHOTO quote.speaker.src: a photo of public/photos');
    if (sp.name !== undefined && (!isStr(sp.name) || letters(sp.name) > LIMIT.label)) out.push(`COVER_DATA quote.speaker.name: ${LIMIT.label} letters at most`);
    if (data.mark !== undefined) {
      const m = data.mark;
      if (!m || !isStr(m.word) || !['underline', 'circle'].includes(m.kind ?? 'underline')) out.push('COVER_MARK quote.mark: {word, kind: underline | circle}');
      else if (!t.replace(/\|/g, ' ').split(/\s+/).some((w) => w.replace(/[„“”"'.,:;!?…]/g, '') === m.word)) out.push(`COVER_MARK quote.mark.word "${m.word}" is not a word of the quote`);
    }
  }
  if (kind === 'steps') {
    const rows = Array.isArray(data.rows) ? data.rows : [];
    if (rows.length < 2 || rows.length > 3) out.push('COVER_DATA steps.rows: 2 or 3 moves');
    rows.forEach((r, i) => {
      if (!r || !isStr(r.text) || letters(r.text) > LIMIT.step) out.push(`COVER_DATA steps.rows[${i}].text: a verb or a short phrase, ${LIMIT.step} letters at most`);
      if (r?.icon !== undefined) icon(r.icon, `steps.rows[${i}].icon`);
      noDash(r?.text, `steps.rows[${i}].text`);
    });
    if (data.mark !== undefined) {
      const m = data.mark;
      if (!m || !Number.isInteger(m.row) || m.row < 1 || m.row > rows.length || !['tick', 'strike'].includes(m.kind)) out.push('COVER_MARK steps.mark: {row: 1..n, kind: tick | strike}');
    }
  }
  if (kind === 'timeline') {
    const stops = Array.isArray(data.stops) ? data.stops : [];
    if (stops.length < 2 || stops.length > 3) out.push('COVER_DATA timeline.stops: 2 or 3 stops, in order');
    stops.forEach((s, i) => {
      const v = String(s?.value ?? '');
      if (!hasDigit(v) || v.length > LIMIT.timelineValue) out.push(`COVER_DATA timeline.stops[${i}].value "${v}": a time, date, year or day count, ${LIMIT.timelineValue} characters at most`);
      if (!isStr(s?.label) || letters(s.label) > LIMIT.label) out.push(`COVER_DATA timeline.stops[${i}].label: ${LIMIT.label} letters at most`);
      noDash(s?.label, `timeline.stops[${i}].label`);
    });
    if (stops.filter((s) => s?.hero).length > 1) out.push('COVER_DATA timeline: one "hero" stop at most (default: the last)');
  }
  return out;
};
