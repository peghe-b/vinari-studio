// The creator story's REAL path on vinari.ge at phone size (360x782 CSS at 3x = 1080x2346, like the app captures):
// home -> the creators block near the bottom -> tap „შემოგვიერთდი" -> /creators -> scroll -> the form filled field by
// field (placeholder data: ნია, nia@example.com, tiktok.com/@sheni.arxi) -> consent -> send -> „განაცხადი მივიღეთ.".
// NOTHING is sent: every /api/creators request is answered here with {"ok":true} and never leaves the machine.
// Writes <out>/fNNNN.jpg and <out>/manifest.json ([{file, step, rect?}]).
//   PLAYWRIGHT_BROWSERS_PATH=~/Library/Caches/ms-playwright node src/crpromo/build/capture.cjs <out>
const {chromium} = require('/Users/admin/.vinari-tools/opuscar/lib/node_modules/playwright-core');
const fs = require('fs');
const OUT = process.argv[2];
fs.mkdirSync(OUT, {recursive: true});
const man = [];
let n = 0;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({viewport: {width: 360, height: 782}, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'ka-GE'});
  const p = await ctx.newPage();
  let blocked = 0;
  await p.route('**/api/creators**', (r) => { blocked++; return r.fulfill({status: 200, contentType: 'application/json', body: '{"ok":true}'}); });
  p.on('request', (r) => { if (/api\/creators/.test(r.url())) console.log('intercepted', r.method(), r.url()); });
  const snap = async (step, extra = {}) => {
    const file = `f${String(n++).padStart(4, '0')}.jpg`;
    await p.screenshot({path: `${OUT}/${file}`, type: 'jpeg', quality: 92});
    man.push({file, step, y: await p.evaluate(() => scrollY), ...extra});
  };
  const walk = async () => { const h = await p.evaluate(() => document.body.scrollHeight); for (let y = 0; y < h; y += 350) { await p.evaluate((v) => window.scrollTo(0, v), y); await p.waitForTimeout(110); } await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(600); };
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  const scrollSeq = async (step, y0, y1, frames, settle = 0) => {
    for (let i = 0; i <= frames; i++) { await p.evaluate((v) => window.scrollTo(0, v), Math.round(y0 + (y1 - y0) * ease(i / frames))); if (settle) await p.waitForTimeout(settle); await snap(step); }
  };
  const rectOf = (sel) => p.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return {x: r.x, y: r.y, w: r.width, h: r.height}; }, sel);
  const absY = (sel) => p.evaluate((s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : -1; }, sel);

  // ---- home ----
  await p.goto('https://vinari.ge/', {waitUntil: 'networkidle'});
  await walk();
  await p.waitForTimeout(800);
  await snap('home-top');
  const cr = await absY('#creators');
  const target = cr - 40;
  await scrollSeq('home-scroll', 0, target, 40, 0);
  await p.waitForTimeout(1500);
  await snap('home-creators');
  const join = await p.evaluate(() => { const a = [...document.querySelectorAll('#creators a')].find((x) => /შემოგვიერთდი/.test(x.textContent)); if (!a) return null; a.setAttribute('data-join', '1'); return true; });
  await p.waitForTimeout(100);
  const jr = await rectOf('[data-join]');
  await snap('home-join', {tap: jr});
  // ---- the tap: the link opens /creators ----
  await Promise.all([p.waitForNavigation({waitUntil: 'networkidle'}), p.tap('[data-join]')]);
  await p.waitForTimeout(900);
  await snap('cr-hero');
  await walk();
  await p.waitForTimeout(900);
  await snap('cr-hero2');
  const nameY = await absY('#cr-name');
  await scrollSeq('cr-scroll', 0, nameY - 300, 36, 0);
  // ---- the form, field by field ----
  const typeIn = async (sel, text, step, every = 1) => {
    await p.click(sel, {force: true});
    let cur = '';
    const chars = [...text];
    for (let i = 0; i < chars.length; i++) {
      cur += chars[i];
      await p.fill(sel, cur);
      if ((i + 1) % every === 0 || i === chars.length - 1) await snap(step, {field: sel});
    }
  };
  const glide = async (step, sel, at = 300, frames = 8) => { const y0 = await p.evaluate(() => scrollY); const y1 = (await absY(sel)) - at; if (Math.abs(y1 - y0) > 4) await scrollSeq(step, y0, y1, frames); };
  await p.click('#cr-name', {force: true}); await snap('name-focus', {tap: await rectOf('#cr-name')});
  await typeIn('#cr-name', 'ნია', 'name');
  await glide('g-email', '#cr-email', 330, 6);
  await p.click('#cr-email', {force: true}); await snap('email-focus', {tap: await rectOf('#cr-email')});
  await typeIn('#cr-email', 'nia@example.com', 'email', 2);
  await glide('g-tiktok', '#cr-tiktok', 330, 8);
  await p.click('#cr-tiktok', {force: true}); await snap('tiktok-focus', {tap: await rectOf('#cr-tiktok')});
  await typeIn('#cr-tiktok', 'tiktok.com/@sheni.arxi', 'tiktok', 3);
  await glide('g-aud', '#cr-aud', 360, 8);
  await snap('aud-focus', {tap: await rectOf('#cr-aud')});
  await p.selectOption('#cr-aud', '5-20k');
  await p.evaluate(() => document.activeElement && document.activeElement.blur());
  await p.waitForTimeout(250);
  await snap('aud-set');
  await glide('g-topic', '#cr-topic', 330, 6);
  await p.click('#cr-topic', {force: true}); await snap('topic-focus', {tap: await rectOf('#cr-topic')});
  await typeIn('#cr-topic', 'მანქანები და გზა', 'topic', 3);
  await p.evaluate(() => document.activeElement && document.activeElement.blur());
  await glide('g-ok', '#cr-ok', 430, 8);
  const okr = await rectOf('#cr-ok');
  await snap('ok-before', {tap: okr});
  await p.check('#cr-ok', {force: true});
  await p.waitForTimeout(250);
  await snap('ok-checked');
  const br = await rectOf('form button[type=submit]');
  await snap('send-before', {tap: br});
  await p.click('form button[type=submit]', {force: true});
  for (let i = 0; i < 8; i++) { await p.waitForTimeout(140); await snap('sent'); }
  await p.waitForTimeout(1200);
  const okY = await p.evaluate(() => { const h = [...document.querySelectorAll('h3,h2,p,div')].find((e) => /განაცხადი მივიღეთ/.test(e.textContent) && e.children.length === 0 && e.getBoundingClientRect().height > 0); if (!h) return null; const r = h.getBoundingClientRect(); return {y: Math.round(r.top + scrollY), vis: r.top}; });
  console.log('success at', JSON.stringify(okY));
  await snap('sent-done');
  if (okY) { const y0 = await p.evaluate(() => scrollY); const y1 = Math.max(0, okY.y - 300); if (Math.abs(y1 - y0) > 4) await scrollSeq('sent-scroll', y0, y1, 10); await snap('sent-final'); }
  fs.writeFileSync(`${OUT}/manifest.json`, JSON.stringify(man, null, 1));
  console.log('frames', n, 'api calls answered locally', blocked);
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
