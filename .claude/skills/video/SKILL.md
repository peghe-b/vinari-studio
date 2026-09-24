---
name: video
description: Make Vinari promo videos (vertical 1080x1920 Reels/TikTok/Shorts, 15/20/30 s, Georgian voice and subtitles) for $0 with this studio, from idea to a finished mp4, its designed cover and its post text. Use it for any video request in Georgian or English, e.g. "ვიდეო გამიკეთე განბაჟებაზე", "რილსი გამიკეთე", "რილსი QR ბარათზე", "ტიკტოკისთვის ვიდეო", "რეკლამა გამიკეთე", "პრომო ვიდეო", "კიდევ ვიდეოები", "ათი ვიდეო", "ჰუკები / სხვადასხვა დასაწყისი", "ყველა ვიდეო გადაარენდერე", "make a promo video about the calendar", "reel about customs", "A/B test hooks", "render all videos". Also use it to fix, re-render or make variants of an existing video. In the studio workflow (vinari.ge/studio, GitHub Actions) ci/prompt.md drives it.
---

# Vinari videos

Everything runs at the studio root (this repo; inside the main Vinari repo it is `video-studio/`). `CLAUDE.md`
there has the spec format, every scene's props, the style and every gotcha; it loads by itself when you work at
the root (otherwise read it once per session before writing a spec). This file is the procedure plus the rules
that most often break a video.

## Where it runs

| where | who asks | what you do |
|---|---|---|
| the owner's Mac | the owner, in chat | `export PATH=/Users/admin/.local/node/bin:$PATH`, then steps 1 to 8. Reply in Georgian, short: he skims |
| the cloud: vinari.ge/studio → GitHub Actions | the co-founder, from his phone | `ci/prompt.md` (filled in by `tools/ci/prompt.mjs`) is the brief: steps 1 to 6 for ONE spec, no render, no reply. The workflow voices, renders and hands over the video, the cover and the post text |

**Never:**
- Spend money: no paid API, no Higgsfield/ElevenLabs/stock/music sites, no generation MCP tool, no account.
- Post or upload anything. The owner or the co-founder posts it themselves.
- Run two heavy jobs at once. Every render or still goes through `tools/lock.sh` (make.sh, check.mjs and
  covers.mjs already do). Other sessions may be rendering: wait for the lock, never kill their processes.
- Render what was not asked: no `--silent`, no `--light` copy, no `--formats` unless the owner asks for it in
  that message. Unrequested files fill his MacBook (2026-09-24). One video = one voiced mp4.
- In the cloud: render the film, commit or push (the workflow does both), or ask a question (nobody answers).

## The owner's bar (2026-09-24, overrides anything older)

- **Voiced, always, by Gemini first**: `"voice": "gemini:Algieba"` (female `"gemini:Achernar"`); out of quota vo.py
  falls back to Microsoft's edge-tts (see the voice budget). The sound effects stay as present as in a silent cut,
  the voice on top. Silent only on request.
- **Creative like v1-v8**, not like v9/v10: a visual metaphor per beat (wireframe car ageing on 1 January,
  split-flap ×1 → ×3, squares zooming out, strip-plot dots, a push on the lock screen, the QR card scanned, a pin
  dropping), a visual change on every subtitle chunk. Never a slideshow.
- **Say it simply**: plain, short, friend-talk Georgian (CLAUDE.md, Say it simply, has the word tables). Hooks may
  be playful or silly if true (HOOKS.md H14).
- **Never "myauto"** (myauto.ge, MYAUTO, მაიავტო) anywhere: "ცოცხალი განცხადებები", "ბაზარი".
- **App screens clearly visible**: big, bright, readable; the element in question pushed in.
- **Looks alternate** dark, light, dark ...: `"theme"` from `node tools/next-theme.mjs <id>`.
- **Cars premium** (Wire3D `stance` real) and **VHS clearly visible** (RGB split, scanlines, short glitches on
  cuts), never over the meta bar or the subtitle.
- **Ending**: the quiet EndCard with a short creative quote in plain Georgian (`tagline`, spoken as the last
  line), optional quiet "… · VINARI+" note. **Never a call to action**: no store, no "გადმოწერე", no "download",
  nothing that pushes an install.
- **Cover in black and white**, **post text like a friend talking** (the Cover and Post text sections below).

## What was asked (on the Mac)

| request | do |
|---|---|
| one video ("ვიდეო გამიკეთე X-ზე") | steps 1–8 |
| no topic given | pick a feature × pain that `ls specs` does not cover yet, and say which one you picked. Do not ask |
| many ("10 ვიდეო", "კიდევ", "unlimited") | steps 1–6 for each idea, each a different feature or angle, then `./make.sh all --missing`, then step 8 for every new mp4 |
| other openings, A/B ("ჰუკები") | the Variants section |
| re-render all | `./make.sh all` (about 2 min per 30 s video, one after another) |
| change an existing video | edit its spec, then steps 5–8 |

## 1. Idea: one feature, one pain, one true fact

The facts come from the app brief (`Marketing/VINARI — app brief.md` in the main Vinari repo, not in this one).
This table is its allowed extract; in the cloud it is the only source. Nothing outside it.

| feature | pain (brief §3) | true things to say | price |
|---|---|---|---|
| market price | "what is my car worth today" | the live-listing **median ("შუა ფასი"), not the mean**, from "ცოცხალი განცხადებები" (never the site's name); shows how many listings and when; too few listings means no price at all; how many of the same car are for sale now | **free** (one car) |
| customs | "how much, and what happens on 1 January" | 2020 · 2.0 L petrol: 3 610 ₾ today, 9 615 ₾ from 1 January (`"validUntil": "2026-12-31"`); 29/29 match with rs.ge; the formula works offline; age counts from the declaration year; hybrid/EV/right-hand-drive toggles, excise ×3 for right-hand drive | VINARI+ |
| deadlines | forgotten inspection or insurance | tech inspection, insurance, oil, tyres + 6 more types; reminders 7/3/1 days before; 09:00 on every step, 19:30 only 1 day before and on the day; scheduled on the phone | VINARI+ |
| QR windshield card | a phone number left on the glass | A4, black and white; the scanner picks one of 3 reasons and the owner gets a notification; the plate is nowhere on the card; quiet at night only if switched on (23:00–07:00); one tap revokes it and a revoked code never opens | VINARI+ |
| wallet / max bid | US auction budget | budget in, max bid out, with ocean, port, fee and customs taken off; the rate comes from the National Bank | VINARI+ |
| auction history | "was it damaged" | record on the VIN: what, which document, when; the database is incomplete, and "not found" does not mean "never crashed" | VINARI+ |
| price index chart | "are prices going up" | Georgian used-car index, 187 measured months, Geostat | VINARI+ |
| parking | "where did I park" | saves the spot offline; says honestly when it is imprecise (±40 m underground) | VINARI+ |
| document photos | privacy | stay on the phone, never sent | VINARI+ |
| engine sound | "what is this noise" | records 4 s; says knock, squeal or hum; never names a part | VINARI+ |
| mechanic finder | "which mechanic" | 3 questions give one of 11 mechanic types | do not call it free |
| VIN scan | typing 17 characters | the VIN is read from a photo on the phone; it is how the free car gets added | n/a |
| honesty | apps that invent numbers | every number carries a source and a time; it says "could not fetch" instead of guessing; it will not tell you the owner, fines or a full auction history | n/a |
| no account | sign-ups | no email, no password | n/a |

Existing videos: `ls specs` (the cloud prompt lists them). v1-v8 set the creative bar. Open angles: wallet
(`04-wallet`), no account, revoking a QR code, "2 of 5 VINs have no page", source and time on every number.
Hybrid and electric customs have no figure in the brief: no numbers for them.

## 2. Length

| length | letters in `say` | beats | use |
|---|---|---|---|
| 15 s | ≈ 150 | 4 | one claim, one screen |
| 20 s (default) | ≈ 210 | 5 | hook, tension, app, proof, end |
| 30 s | ≈ 310 | 6–7 | a small story (customs cliff) |

The voice reads about 11.5 Georgian letters per second, and every sentence end adds `sentenceGap`. If the check
reports the film as too long, cut words. Never raise the rate.

## 3. Structure: the hook comes first

**The hook decides everything. HOOKS.md** has 14 formulas with Georgian examples, a scoring rubric (§2), the
15/20/30 s templates and closing quotes (§3) and the per-feature angle bank (§5); read the sections you need, not
the whole file. Write 5 hooks from at least 3 different formulas (3 in the cloud), score each with the rubric (six
criteria, 0–2), keep the best (it must score ≥ 9 and never 0 on "true and on-brand"); on the Mac keep the
runner-up as hook variant h1. When the pain is everyday, one candidate is a playful H14 hook. Close the video so
the last line flows back into the first frame (loop).

1. **Hook, beat 0, ≤ 2 s, ≤ 25 spoken letters.** The viewer's pain as a question ("შენი მანქანა დღეს რამდენი
   ღირს?"), a true number that surprises ("ერთი მანქანა. ორი ფასი საბაჟოზე."), a situation ("შუშაზე ნომერს
   ტოვებ?") or what the app refuses to do. The subject is "შენ", not the app. Never open with the logo or the
   app name. Everything with `at: 0` must already show at frame 0 (readable with the sound off).
2. **Tension** (optional in 15 s): what goes wrong without it.
3. **Vinari does it:** a real screen (`Phone`). The voice says "ვინარიში … ჩაწერ / ნახავ", the subtitle `Vinari`.
4. **Proof:** one true fact from the table (Stat, Grid, List, Compare, SplitFlap).
5. **EndCard with a creative quote, no CTA.** The last beat's `say` is the EndCard `tagline` itself: a short
   creative closing quote in plain Georgian (≤ 5 words, ≤ 26 characters), true to the film, ideally a lead-in
   that loops into the hook ("ჩამოყვანამდე საჭეს შეხედე." → "საჭე მარჯვნივ?"; more in HOOKS.md §3). Its subtitle
   is dropped automatically. `hold` 0.3 to 0.5. Optional `note`: "<feature> · VINARI+" or a hedge. No store
   line, no "გადმოწერე", "download", "install" (`build-index` stops on them).

Cut the scene every 2–4 s. Never the same scene type twice in a row. `rate` does not apply to Gemini,
`"music": null` unless asked.

**The voice budget.** The free Gemini key gives each model about 10 requests a day (four models, one per film,
back at 11:00 Tbilisi). vo.py reads the WHOLE film in one request (`"geminiSplit": "whole"`, the default) and cuts
it at the pauses; when that cut is not sure it says so and voices the film one request per sentence (1 + n). Its
summary line says how many requests it made. Everything is cached: an unchanged film costs nothing, one changed
`say` line one request for that line alone, two or more one request for the whole film again. So change words only
when they must change, and never re-voice a spec just to check it. Out of quota (every model): Microsoft's edge-tts
reads the film (same gender) with a loud WARNING, on the Mac and in the cloud alike (the owner, 2026-09-25: a video
must always come out; the studio site warns him before he makes one and labels it). Check says so: carry on as
usual, no retries, no line changes to get Gemini back. On the Mac, voice it again after 11:00 Tbilisi for the house
voice. Only when the cloud's repo variable `STUDIO_NO_EDGE` is on (`VO_NO_EDGE=1`, off by default) does check print
"VOICE_QUOTA ხმის დღევანდელი ლიმიტი ამოიწურა": then stop at once, no retries, no spec changes, your last line
`VOICE_QUOTA`. Sounds come from `public/sfx` (`asmr-*` is the house kit), via `"sfx"`, only for an
event no scene sounds.

## 4. Write `specs/<id>.json`

- id: the next free `v<N>-<slug>` (the cloud prompt gives the number). Start by copying the closest spec.
- `"theme"`: run `node tools/next-theme.mjs <id>` and write exactly what it prints. It reserves the look, so
  the looks alternate in production order. Variants, translations and cloud redos keep the original's look.
- `"voice": "gemini:Algieba"` (or `"gemini:Achernar"`). Never `"narration": false` unless asked.
- `say` is for the ear: numbers as Georgian words ("ოცდაცხრა", "სამი ათას ექვსას ათი"), brands the way they
  sound ("ვინარი", "ქიუარ", "ვინ კოდი"), no Latin letters, no digits.
- `show` is for the eye: digits, `Vinari`, `VIN`. The same number of `|` chunks as `say`, each ≤ 24 characters.
- **Label paid features quietly:** the meta of the beat that shows a VINARI+ screen reads "<feature> · VINARI+".
- Like a friend talking: ≤ 7 words a sentence (9 at most, counted on `show`), ≤ 40 letters in `say` (55 at
  most), two sentences a beat at most, verbs not nouns. No "!", no em dash, no ad clichés, no medical words.
- Before using a `Phone` screen (`ls public/screens`: 01-home … 16-chart), read its JPEG and measure the
  coordinates as fractions of 1080×2346. Never guess them.
- Always `"cover"` and `"post"` (the two sections below).

**Content rules (hard).** Never invent a number, a percentage or a user count. Never claim the app shows the
owner or fines, finds a car by plate, gives a "full history", makes a "დიაგნოზი", or will be on Android by some
date. Only one car and its price are free; never call a VINARI+ feature free. Never read out prices or listing
counts that appear on screens. Never show the test entry "ტესტი, ვაკე" (`03-calendar-day`). No call to action
and no store name anywhere (voice, subtitle, meta, scene text, end card, post).

**Verified pitfalls (they have shipped wrong before; CLAUDE.md has the full list):**
- 19:30 fires only 1 day before and on the day. Never put it over the 7-day or 3-day step.
- `05-customs.jpg` is the budget → max bid mode: no customs total, and its rate line is online.
- Customs age comes from the declaration year: "a ship that arrives in January pays the new amount".
- In a video about the year changing, say "წელი" or "გამოშვების წელი", never "წელს".
- `{daysToJan1}` is true only on the render day.
- If the voice says "the same car", the same model must be on screen.
- Never the same words twice in one frame (subtitle against list rows, title lines, tagline or meta).
- SplitFlap digits roll upward only: a short hop (07→01), never a countdown through 0; Georgian letters stay
  off the tiles (they get cut), words go in `label`. Never pause a flip in a cover.

## Cover (spec `"cover"`)

`{"title": "VIN კოდი | ერთი ფოტოთი", "tag": "VIN სკანერი", "frame": 100}`: the designed Reels cover
(`src/Cover.tsx`), in the film's own theme (a black film gets a black cover).
- **Black and white only** (the owner): no green or red on a cover; the film's picture is shown in grey.
- `title`: two short lines split with `|`, plain words, a question or a twist, never the whole voice line.
- `tag`: one or two words (default the first meta label). `frame`: the clearest settled picture of the idea
  (never mid-flip; default 70 % into the hook scene). Optional `sub`, `zoom` (1.15 on a Wire3D car), `y`.
- Everything that matters sits in the centre 3:4 (y 240..1680): the dashes on the sheet's cover tile.

## Post text (spec `"post"`)

`{"description": "ყველას გვქონია: შუშაზე დახრილი, ტელეფონის ფანრით VIN-ს ასო-ასო კითხულობ და მაინც სადღაც
ერევი. ახლა ერთ ფოტოს უღებ და ეგაა.", "tags": ["#მანქანა", "#ვინკოდი", "#carhacks"]}` (the owner approved this
one). It goes out with the video as written:
- **description**: one or two short lines of plain everyday Georgian, human and friendly like a friend talking:
  a moment the viewer knows, then the easy way out. NOT a quote or an aphorism (the owner: "ციტატასავით არ
  მინდა"), not an ad: no app, site or store name, no "გადმოწერე", no link, no "!", no em dash, no emoji (they
  do not suit the brand), no invented number. At most 220 characters.
- **tags**: exactly three, topical to the video: two Georgian and one English (Latin letters only), each `#`
  plus letters, digits or `_`, no spaces. No brand tag, no tag walls.
- `node tools/build-index.mjs` stops on every broken rule.

## 5. Check: voice, lint, stills, cover, one sheet

```sh
node tools/check.mjs <id> [frames...] [--len 15|20|30]
```

The one command. It voices the spec (`tools/vo.py`: the whole film in one Gemini request, a cached film is free, and
it says how many requests it made; `VOICE_QUOTA` = stop, see the voice budget), lints it (`tools/build-index.mjs`: every ERROR stops it; fix the warnings too), bundles once,
renders a still of every scene at 70 % of its length plus the designed cover, and draws ONE contact sheet,
`out/<id>.sheet.png`. It prints the film's length against the target. Extra frames (0 = the loop point) go after
the id. Too long: cut words. With `VS_CI=1` (the workflow) it also fails without "post" or "cover".

## 6. Look at the sheet, fix, repeat (never skip)

Read `out/<id>.sheet.png` (one image; a single half-size still is in `out/stills/<id>-<frame>.png` when something
is too small to judge). On every tile check:
- The subtitle is one line, not shrunk, and matches what is said at that moment.
- Content sits between the meta bar and the subtitle; nothing important below the dashed line (the Reels UI
  covers it) or at the right edge beside the like column. Nothing is clipped at an edge.
- No text overlaps. No word appears twice in the frame. The Georgian has no typos. No "!" and no "—".
- Every number on screen equals the number in the voice and a number in the facts table.
- Green means good for the viewer, red means it costs the viewer. At most one saturated colour per shot.
- A phone shows the right screen for the claim, with the highlight on the real element and no test data. Every
  app screen is big, bright and readable at this size; never a dim grey slab.
- The VHS is visible (a colour fringe on edges, scanlines) but never tears the meta or the subtitle.
- Cars look premium: clean lines, real proportions, nothing clipped.
- Every beat has its own picture idea; no two tiles in a row look alike.
- The last scene is the EndCard with the quote; nothing names a store or asks to download.
- The cover: black and white, the title readable at thumbnail size, the picture settled, everything inside
  the dashes.

Fix the spec and check again. On the Mac, stop only when a whole pass finds nothing; in the cloud, at most 2
fix rounds.

## 7. Render (the Mac only; in the cloud the workflow renders)

```sh
./make.sh <id>              # lint, voice, render (locked), -10 LUFS, cover, gallery → out/<id>.mp4, out/<id>.cover.png
npx remotion ffprobe -v error -show_entries format=duration -of csv=p=0 out/<id>.mp4
```

That is the whole delivery. `--formats` (4:5, 1:1, 16:9), `--light` and `--silent` only when the owner asks for
them in that message. Listen to the voiced mp4: the sounds as present as in a silent cut, every word clear.
`node tools/covers.mjs <id>` re-renders the cover alone. If `ls tools` shows a tool not named here, read its
header and use it.

## 8. Deliver (the Mac)

Send `out/<id>.mp4` and `out/<id>.cover.png` with **SendUserFile** (`display: "render"`). Look at the cover
before sending. Then reply in Georgian, the post text taken from the spec's `"post"`:

```
**<title>**: <N> წამი, <feature>. <one line: what it says>
ფაილი: out/<id>.mp4

> **შენ გასაკეთებელი:** ატვირთე Reels/TikTok-ზე. ტექსტი პოსტისთვის:
> <post.description>
> <post.tags, space-separated>
```

English/Russian versions: "Languages" in CLAUDE.md (`specs/<id>.en.json`, `node tools/translate-check.mjs <id>`).
All videos side by side: `out/index.html`. The one-click page (`./make.sh app`, or double-click
`Vinari Video.command`) runs this skill headless from a text box. The spec is the source of truth (`out/` and
`public/vo/` are gitignored): commit `specs/` and `specs/hooks/`.

## Variants: one idea, several hooks (A/B, the Mac)

1. Write `specs/hooks/<id>.json`, 2–4 openings, each from a different angle:
   ```json
   [
     {"name": "question", "say": "ტექინსპექტირების ვადა | ზუსტად გახსოვს?"},
     {"name": "countdown", "say": "ერთი კვირა | ბევრი გგონია?", "meta": ["ვადები"],
      "scene": {"type": "SplitFlap", "from": "07", "to": "01", "at": 1, "label": "დღე ტექინსპექტირებამდე", "tone": "down"}}
   ]
   ```
   Only beat 0 changes. A hook may set `say`, `show`, `scene`, `meta`, `sfx`, `hold`, `gap` and
   `voice`/`rate`/`pitch`. Keep every hook within ±0.5 s of the others. If a hook keeps the original scene, give
   it the same number of `|` chunks; otherwise give it a `scene`.
2. `./make.sh variants <id> --stills` writes `specs/<id>--h1.json`… (ids `<id>-h1`…), lints and voices them and
   makes `out/stills/<id>-hooks.png`: the original and every hook side by side. Read it, fix the hooks file, repeat.
3. `./make.sh variants <id>` renders `out/<id>-h1.mp4`… one by one. `--append` adds hooks after the existing
   ones. `./make.sh <id>-h2 [--still N]` handles a single variant.
4. Never edit `specs/<id>--hN.json` by hand: edit the hooks file or the original (variants are rebuilt from it).

Send the variants together and say which hook is which (h1 = question, …), so he can post them on different
days and compare.
