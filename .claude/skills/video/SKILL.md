---
name: video
description: Make Vinari promo videos (vertical 1080x1920 Reels/TikTok/Shorts, 15/20/30/45 s, Georgian voice and subtitles) for $0 with this studio, from idea to a finished mp4, its designed cover and its post text. Use it for any video request in Georgian or English, e.g. "ვიდეო გამიკეთე განბაჟებაზე", "რილსი გამიკეთე", "რილსი QR ბარათზე", "ტიკტოკისთვის ვიდეო", "რეკლამა გამიკეთე", "პრომო ვიდეო", "კიდევ ვიდეოები", "ათი ვიდეო", "ჰუკები / სხვადასხვა დასაწყისი", "ყველა ვიდეო გადაარენდერე", "make a promo video about the calendar", "reel about customs", "A/B test hooks", "render all videos". Also use it to fix, re-render or make variants of an existing video. In the studio workflow (vinari.ge/studio, GitHub Actions) ci/prompt.md drives it.
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
- **Say it simply**: plain, short, friend-talk Georgian (CLAUDE.md, Say it simply: the rules, the traps, our own
  lines before and after). Every line passes the Georgian check below before it is voiced (2026-09-25: the films'
  Georgian sometimes sounded like "აბდაუბდა"). Hooks may be playful or silly if true (HOOKS.md H14). Since
  2026-10-06 **the buddy tone** (HOOKS.md Buddy tone: "high-flown, it will not take off"): what a friend says across
  the table, a little cheeky; never an aphorism, a poster line, a riddle or a hype word.
- **Never "myauto"** (myauto.ge, MYAUTO, მაიავტო) anywhere: "ცოცხალი განცხადებები", "ბაზარი".
- **App screens clearly visible**: big, bright, readable; the element in question pushed in.
- **Looks rotate** light, light, dark ... (owner 2026-10-02: mostly white): `"theme"` from `node tools/next-theme.mjs <id>`.
- **Cars premium** (Wire3D `stance` real) and **VHS clearly visible** (RGB split, scanlines, short glitches on
  cuts), never over the meta bar or the subtitle.
- **Ending**: the quiet EndCard with a short creative quote in plain Georgian (`tagline`, spoken as the last
  line), optional quiet "… · VINARI+" note. **Never a call to action**: no store, no "გადმოწერე", no "download",
  nothing that pushes an install. **Every second film** (v63, v65, v67 ...) ends on the comment ask and follow
  reminder instead ("comment „ვინარი" for the link, follow us"): one line of `ci/endings.json`, as the brief (or
  `node tools/ci/ending.mjs <id>`) offers it. The post's first paragraph is the same comment ask, added by the
  workflow (tools/ci/publish.mjs, `postLine`): never write it in the spec's post.
- **Music: PAUSED** (owner 2026-10-02 evening: no music for now; ci/music.json has no tracks). When on, every third film gets a quiet bed added at render from
  `ci/music.json` (`node tools/ci/music.mjs <id>` says which); leave `"music"` out or null in the spec.
- **Cover in black and white**, **post text like a friend talking** (the Cover and Post text sections below).
- **Car knowledge** (owner 2026-10-05): besides "a problem, then the app", films that teach one true, useful thing
  about cars (category `carinfo`, every other dice roll): only facts of the sourced bank, a new viral hook every time,
  the app only when a fact links a feature, the real sound first when the topic is a sound (§1 and §3 below;
  CLAUDE.md, Car knowledge). **Reel-style tips** (owner 2026-10-06, after a reel that taught one driving habit): about
  every second car-knowledge dice film is a practical tip (a bank fact marked tip) that opens on a question about the
  viewer's own driving (HOOKS.md H15), answers it and ends on what he does tomorrow.
- **The categories are the app's own names** (owner 2026-10-06): QR ბარათი, პარკინგი, VIN სკანერი, დიაგნოსტიკა, OBD
  სკანერი, ნავიგატორი, კალენდარი first. The cloud studio no longer makes market-price, customs or price-history films
  (rows marked below); the navigator and the OBD scanner exist in 1.0.4 and are made only once the brief says that
  version is on the App Store (until then their facts and screens are out of bounds).
- **Never the same words**: „ხოდოვოი" is banned (say „სავალი ნაწილი"), one content word in four lines of a film is a
  REPEAT warning, three words the category's last films leaned on again a KEYWORDS warning. Fix them like any warning.
- **Pictures that explain**: draw a car only when the car is the point, and then a refined 2020s car (raked
  windshield, slim light line; never a boxy 90s shape). An explanation wants a clear diagram of the part, a real photo
  (`Photo`, public/photos) or the real app screen.

## What was asked (on the Mac)

| request | do |
|---|---|
| one video ("ვიდეო გამიკეთე X-ზე") | steps 1–8 |
| no topic given | pick a feature × pain that `ls specs` does not cover yet, or a car-knowledge fact no film used, and say which one you picked. Do not ask |
| a car tip, "რჩევა", "იცოდი?", how a part works, a myth, a car sound | a `carinfo` film (§1, Car knowledge): bank facts only |
| many ("10 ვიდეო", "კიდევ", "unlimited") | steps 1–6 for each idea, each a different feature or angle, then `./make.sh all --missing`, then step 8 for every new mp4 |
| other openings, A/B ("ჰუკები") | the Variants section |
| re-render all | `./make.sh all` (about 2 min per 30 s video, one after another) |
| change an existing video | edit its spec, then steps 5–8 |

## 1. Idea: one feature, one pain, one true fact

The facts come from the app brief (`Marketing/VINARI — app brief.md` in the main Vinari repo, not in this one),
`docs/pricing.md` and each update's notes (VINARI_STATE.md there). This table and `ci/categories.json` are the
allowed extract; in the cloud the brief's categories file (out/ci/categories.now.json: what is true today) is the only
source. Nothing outside them: a feature not listed here is not in the app, whatever you have heard. Updated for the
iPhone 1.0.3 update (2026-09-28); the 1.0.4 rows (navigator, OBD scanner) only once the brief says 1.0.4 is live.

| feature | pain (brief §3) | true things to say | price |
|---|---|---|---|
| market price (not in the cloud studio since 2026-10-06) | "what is my car worth today" | the live-listing **median ("შუა ფასი"), not the mean**, from "ცოცხალი განცხადებები" (never the site's name); shows how many listings and when; too few listings means no price at all; how many of the same car are for sale now | **free** (one car) |
| customs (not in the cloud studio since 2026-10-06) | "how much, and what happens on 1 January" | 2020 · 2.0 L petrol: 3 610 ₾ today, 9 615 ₾ from 1 January (`"validUntil": "2026-12-31"`); 29/29 match with rs.ge; the formula works offline; age counts from the declaration year; hybrid/EV/right-hand-drive toggles, excise ×3 for right-hand drive | VINARI+ |
| the car's own dates | a forgotten inspection | every car's two dates, the inspection (ტექინსპექტირება) and the LPG cylinder (LPG ბალონი): set, change and get reminded; reminders 7/3/1 days before; scheduled on the phone | **free** |
| calendar | forgotten insurance, oil, tyres | every date on one month grid with your own entries: tech inspection, insurance, oil, tyres + 6 more types; reminders 7/3/1 days before; 09:00 on every step by default (the time can be moved, 06:00 to 12:00), the 19:30 repeat only 1 day before and on the day (can be switched off); scheduled on the phone | VINARI+ |
| home screen widgets | "how many days are left?" without opening the app | small: the nearest date and the days left ("ტექინსპექტირება 53 დღე"), also on the lock screen; medium: the car card (plate, market price and its change, next date); large: the garage (up to 3 cars, where you parked); a month calendar; never online, a tap opens the app there; on the free plan one car and its own two dates | **free** (they show what the plan shows: more cars, calendar entries and the parked spot are VINARI+) |
| trouble codes (OBD-II) | "a light came on, the mechanic said P0420" | type the code (P0420, p0420, 0420, პ0420, Р0420) and read in Georgian what it means, how urgent it is (სასწრაფოდ, ერთ კვირაში, ორ კვირაში, კომფორტი) and which mechanic you need; 9 533 codes; works without internet; P0420 is "კატალიზატორის ეფექტიანობა დაბალია"; you type the code: reading the car through an adapter is the OBD scanner (next row), only once the brief says 1.0.4 is live (until then the app does not plug into the car) | **free** |
| OBD scanner (1.0.4: only once the brief says it is live) | "the light came on: can I keep driving?" | an ELM327 adapter (on iPhone Wi-Fi or Bluetooth LE, never Classic Bluetooth or a cable) in the OBD-II port: the check engine light, the codes, the VIN, the battery, readiness, then „შეგიძლია იარო?"; live data, history, the codes sent to a mechanic as text, clearing codes (no fix: the cause brings them back); the pre-purchase check (codes cleared recently, permanent codes, the engine unit's VIN against the papers); engine and emissions only, never ABS or airbags | VINARI+ (a sample scan is free) |
| navigator (1.0.4: only once the brief says it is live) | "no signal in the mountains", "which exit?" | Nelson or Alice speak Georgian whatever the app's language; map, search, routes and voice on the phone, so no signal needed; Georgia's roads only, on iPhone; roundabout exits counted, lanes, bridges and speed cameras spoken (OpenStreetMap data, may be incomplete); street names an optional download; guides with the screen locked, the next turn on the Lock Screen and in the Dynamic Island; home, work, „დედასთან" in one tap with a 4 s countdown; usual traffic for the hour, no live traffic | VINARI+ (both voices to hear and one demo drive are free) |
| QR windshield card | a phone number left on the glass | A4, black and white; the scanner picks one of 3 reasons and the owner gets a notification; the plate is nowhere on the card; quiet at night only if switched on (23:00–07:00); one tap revokes it and a revoked code never opens | VINARI+ |
| wallet / max bid | US auction budget | budget in, max bid out, with ocean, port, fee and customs taken off; the rate comes from the National Bank | VINARI+ |
| auction history | "was it damaged" | record on the VIN: what, which document, when; the database is incomplete, and "not found" does not mean "never crashed" | VINARI+ |
| price index chart (not in the cloud studio since 2026-10-06) | "are prices going up" | Georgian used-car index, 187 measured months, Geostat | VINARI+ |
| parking | "where did I park" | saves the spot offline; says honestly when it is imprecise (±40 m underground) | VINARI+ |
| document photos | papers left at home | „ტექპასპორტი და დაზღვევა ტელეფონში, ჯიბეში."; they stay on the phone, never sent | VINARI+ |
| engine sound | "what is this noise" | records 4 s; says knock, squeal or hum; never names a part | VINARI+ |
| mechanic finder | "which mechanic" | 3 questions give one of 11 mechanic types | do not call it free |
| VIN scan | typing 17 characters | the VIN is read from a photo on the phone; it is how the free car gets added; reading it (make, model, year, engine) works without internet; a Japanese home-market car's frame number (GRX130-6012345) is accepted too, but the auction record is found by VIN only | n/a |
| garage | editing a car | swipe a car to the left to edit or delete it | n/a |
| VINARI+ | "how much is it" | $9.99 a month (about 26.99 ₾) or $49.99 a year (about 130.99 ₾, an estimate at today's rate: the charge is in dollars); the yearly plan starts with a 7-day free trial; the screen compares a month to about 7 liters of petrol at today's price and the year to one tank | at most once, calmly, never as the hook or the closer |
| honesty | apps that invent numbers | every number carries a source and a time; it says "could not fetch" instead of guessing; it will not tell you the owner, fines or a full auction history | n/a |
| no account | sign-ups | no email, no password | n/a |

Existing videos: `ls specs` (the cloud prompt lists them). v1-v8 set the creative bar. Open angles: the widgets,
a trouble code explained, a Japanese car's frame number, wallet (`04-wallet`), no account, revoking a QR code,
"2 of 5 VINs have no page", source and time on every number. No app screen capture shows a widget or a code card
yet: draw them in the film's own Film scene, in the app's look (white cards, black ink), never on a capture.
Hybrid and electric customs have no figure in the brief: no numbers for them.

**Car knowledge (`carinfo`)**: not a feature. The facts are the bank in ci/carinfo-sources.json, its `"lines"`
(`"<id>: <Georgian>"`; Grep them, never read the file whole), 221 facts in 21 themes: tyres, brakes, winter, the engine and its lights, belts, the battery, coolant, oil, gas and
methane, the running gear, the gearbox, lights and wipers, the AC, fuel and myths, history, how things work, safety,
Georgian road rules, VIN and Japanese cars, US imports, driving habits), each one checked on its source (its entry in
"facts"). 34 are practical tips (`"tip": true`, `(tip)` in the brief): a tip film opens on a question about the
viewer's own driving (HOOKS.md H15) and `--record` refuses one whose beat 0 asks nothing; every car-knowledge opening
must differ in its words from the category's last 10.
Pick ONE fact (or a few of one theme that build one idea) a Georgian driver would send to a friend; nothing outside the
bank, numbers as written and with whose they are (a UK or US rule is theirs, never Georgian law). The app only when the
fact's `app` links a feature: then the film ends on that feature's real screen; otherwise it never names the app. A fact
with `sounds` opens on its real recording (§3). In the cloud the brief offers a few themes and `--record --facts` stores
the ids; on the Mac, `grep` the ledger's `"facts"` to take facts no film used.

## 2. Length

| length | letters in `say` | beats | use |
|---|---|---|---|
| 15 s | ≈ 150 | 4 | one claim, one screen |
| 20 s (default) | ≈ 210 | 5 | hook, tension, app, proof, end |
| 30 s | ≈ 310 | 6–7 | a small story (customs cliff) |

The voice reads about 11.5 Georgian letters per second, plus the take's own breaths between sentences (a Gemini film
is one continuous take: `gap` and `sentenceGap` no longer re-space it). If the check reports the film as too long, cut
words. Never raise the rate.

## 3. Structure: the hook comes first

**The hook decides everything. HOOKS.md** has 15 formulas with Georgian examples, a scoring rubric (§2), the
15/20/30/45 s templates and closing quotes (§3) and the per-feature angle bank (§5); read the sections you need, not
the whole file. Write 5 hooks from at least 3 different formulas (3 in the cloud), score each with the rubric (six
criteria, 0–2), keep the best (it must score ≥ 9 and never 0 on "true and on-brand"); on the Mac keep the
runner-up as hook variant h1. When the pain is everyday, one candidate is a playful H14 hook. Close the video so
the last line flows back into the first frame (loop).

1. **Hook, beat 0, ≤ 2 s, ≤ 25 spoken letters.** Said like a friend across the table, a little cheeky, 8 words or
   fewer (HOOKS.md Buddy tone). The viewer's pain as a question ("შენი მანქანა დღეს რამდენი
   ღირს?"), a true number that surprises ("ერთი მანქანა. ორი ფასი საბაჟოზე."), a situation ("შუშაზე ნომერს
   ტოვებ?") or what the app refuses to do. The subject is "შენ", not the app. Never open with the logo or the
   app name. Everything with `at: 0` must already show at frame 0 (readable with the sound off).
2. **Tension** (optional in 15 s): what goes wrong without it.

   **A car-knowledge film** (`carinfo`) runs: hook (a belief broken, a surprising figure, a question every driver has
   asked, or the real sound alone before a word: beat 0 `"sfx": [{"name": "real-<x>", "at": 0}]`, `"leadIn"` 0.8 to
   1.2), the knowledge said plainly (one idea a beat, each its own clear picture: a diagram of the part as the Film
   scene, a real photo, the sound, a true number with its `source`), the takeaway in one plain sentence, then the app
   only when a fact links a feature (that feature's real screen, its facts and tier), then the EndCard. A recording names
   a fault only when its own `use` in public/sfx/real.json names it; a healthy sound is never a fault; a CC BY sound
   only while ci/sounds.json allows credit lines.

   **A crazy story film** (`stories`) runs: a buddy hook on the person, the car or the number with the outcome withheld
   (HOOKS.md H16 to H20), the setup, it gets crazier, the twist (a hard fact, its beat marked with a `Twist` scene or
   `"twist": true`, before 70 % of the film, then a `hold` of 0.6 to 0.8 s), the payoff, the callback. Only the story's
   facts (ci/stories-sources.json), a legend said as one, the person and the car on the story's own photos (PhotoStory,
   Split, Timeline, Twist, a `bg`; credited), no app (steps 3 and 4 below do not apply). CLAUDE.md, Crazy car stories.
   Since 2026-10-07 a story never opens on an aura formula (H21, H22 moved to car knowledge): it opens on its own jaw-drop.
   **Told so a stranger gets it in one viewing** (the owner, 2026-10-07, on v79: „ვერაფერი გავიგე, სრულად მოყვეს"): the
   person or the brand by name by beats[1] with what they are, every other person the first time with who they are
   („ენცო ფერარი, ფერარის პატრონი", never a bare „ენცო" or „ეს კაცი"), the name the payoff lands on said out loud („ასე
   დაიბადა ლამბორგინი"), and the story in connected sentences of 6 to 12 words, one breath each (ჰოდა, მერე, ამიტომ,
   მაგრამ), never a run of 1 to 3 word fragments. `--record` and check refuse the rest: STORY_NAMES, STORY_WHO,
   STORY_PAYOFF, STORY_CHOPPY (the bank's "names" say which names count).

   **A free idea** (`free`, თავისუფალი იდეა): his lines are the script (ci/prompt.md step 1: his order, his questions,
   his teaser word for word; no feature list; a screen only for a feature his words name: FREE_SCREEN). On the Mac, the
   same when the owner says "exactly my words". CLAUDE.md, The free idea.
3. **Vinari does it:** a real screen (`Phone`). The voice says "ვინარიში … ჩაწერ / ნახავ", the subtitle `Vinari`.
4. **Proof:** one true fact from the table (Stat, Grid, List, Compare, SplitFlap).
5. **EndCard with a punchline, no CTA.** The last beat's `say` is the EndCard `tagline` itself: a short punchline in
   plain Georgian (≤ 5 words, ≤ 26 characters), true to the film: a callback to the hook's words (best when the replay
   loops), a dry joke at us, or a question to the viewer; never an aphorism (more in HOOKS.md §3). Its subtitle
   is dropped automatically. `hold` 0.3 to 0.5. Optional `note`: "<feature> · VINARI+" or a hedge. No store
   line, no "გადმოწერე", "download", "install" (`build-index` stops on them).
   **A follow film** (every second by its number: the brief's "ending", or `node tools/ci/ending.mjs <id>`) ends
   on the follow reminder instead of a quote: the `tagline`, `say` and `show` are exactly one offered line, `|`
   included (the card shows it in two lines), no `style` on that beat, no VINARI+ or price `note` (a hedge is
   fine). Nothing else asks to follow; check refuses a reminder anywhere else and on a quote film.

Cut the scene every 2–4 s. Never the same scene type twice in a row. `rate` does not apply to Gemini,
`"music"` null (every third film gets its bed at render) unless asked.

**The voice budget.** The free Gemini key gives each model about 10 requests a day (four models, one per film,
back at 11:00 Tbilisi). vo.py reads the WHOLE film in one request (`"geminiSplit": "whole"`, the default) and keeps
that take as ONE continuous voice (the owner, 2026-10-07: sentences voiced apart "break every 1-2 seconds"): the
borders it finds only time the beats and subtitles, a beat's `hold` goes into a real pause, and it never falls back
to one request per sentence. Its summary line says how many requests it made. Everything is cached: an unchanged film
costs nothing, any changed `say` line one request for the whole film again. So change words only
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
  most; a crazy story is told, not listed: connected sentences up to 12 words and 70 letters, never fragments), two
  sentences a beat at most, verbs not nouns, the verb last. One "!" at most (the hook), no em dash, no ad clichés, no
  medical words. „ძმაო" is fine (once a film). A mild street word now and then (CLAUDE.md rule 21, ci/street-words.json:
  never two films in a row, at most one in three, three a film at most, only in a "me" line or a made-up character's line,
  never at the viewer, a woman, a group or a real person, never in the cover, meta, EndCard or post; ყლე, განდონი and
  their kind never). Then the Georgian check (below), before step 5 voices anything.
- Before using a `Phone` screen (`ls public/screens`: 01-home … 25-menu-104), read its JPEG and measure the
  coordinates as fractions of 1080×2346. Never guess them. 17 to 25 are the 1.0.4 screens (navigator, OBD scanner, the
  new home and menu): never in a film until the brief says 1.0.4 is live (check.mjs refuses them in the cloud).
- Always `"cover"` and `"post"` (the two sections below).
- **One NEW visual per film** (the owner, 2026-09-27: "every film must think differently and try to make a good NEW
  graphic"): the key moment gets a Film scene written for this film, `src/scenes/film/<Name>.tsx` (<Name> = the id
  in PascalCase, `v26-night-scan` → `V26NightScan`), used as `{"type": "Film", "name": "<Name>", ...props}`. A new
  metaphor, camera and motion, premium, thought afresh; never a staging or an earlier film's idea again. Start from
  `src/scenes/film/_template.tsx` (what it may use, the rules), run `node tools/ci/filmlint.mjs <Name>` until ok,
  and record the idea with `--record ... --idea "<one line>"` in the cloud. The other beats take library scenes.
- **Show the moments, compose new pictures** (CLAUDE.md rule 22, Story moments): every beat shows its moment (mom calls:
  `Call` with „დედა" ringing; a message: `Chat`; the road: `Drive`, `Windshield`; a light: `Dashboard`; money: `Money`;
  a feeling: `Person`; the twist: `Impact`); the scenes are references, never templates: stage each for this film and
  compose the key moment as your Film from the kit (`../illo/figure` Figure, `../illo/car` Car, handset, backdrop, fx,
  icons, props; the template shows how). On screen only punch words (3 a punch, 5 a scene), never the subtitle's words,
  no lists (a 2 or 3 row comparison only); line art only for a diagram. check refuses a picture or a composition a
  recent film showed (FEED_REPEAT, IDEA_REPEAT, MOMENT_REPEAT) and too much text (TEXT lines).

**Content rules (hard).** Never invent a number, a percentage or a user count. Never claim the app shows the
owner or fines, finds a car by plate, gives a "full history", makes a "დიაგნოზი", reads a trouble code from the car,
or will be on Android by some date. Free: one car, its price, its own two dates (inspection, LPG cylinder) with their
reminders, the home screen widgets and the trouble-code lookup; never call anything else free. Never read out prices or listing
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
- **description**: one or two short lines of plain everyday Georgian, human and friendly like a friend talking (the
  buddy tone: what you would text a friend about it): a moment the viewer knows, then the easy way out (a story film:
  a fact of the story the voice left out, or its context, maybe one question). NOT a quote or an aphorism (the owner: "ციტატასავით არ
  მინდა"), not an ad: no app, site or store name, no "გადმოწერე", no follow reminder ("გამოიწერე": only a follow
  film's EndCard says it), no link, no "!", no em dash, no emoji (they
  do not suit the brand), no invented number, no street word (ci/street-words.json: the post stays clean even when the
  film says one). At most 220 characters. A free film: his message in a friend's words, never his lines pasted as a
  quote or retold (the voice IS his lines, so POST_ECHO counts them: say why it matters or ask one question), never
  „ვინარი" even when his idea says it.
- **Never the film retold** (the owner, 2026-10-07, on v79's post: it wrote what the video says, word for word, and read as slop): the
  description says what the film did NOT say (a detail of the facts it left out, the context, a personal take, one
  question for the comments), in other words than the voice. POST_ECHO (tools/ci/words.mjs): a run of 4 of the voice's
  content words in its order, or more than half of the post's content words from the voice (a story's names do not
  count); build-index warns, `--record` refuses it, check stops the cloud on it before the voice.
- **tags**: exactly three, topical to the video: two Georgian and one English (Latin letters only), each `#`
  plus letters, digits or `_`, no spaces. No brand tag, no tag walls.
- **An open question** (owner 2026-10-06, the reel he liked asked for the viewer's own answer): the description may end
  on one question that invites the viewer's own habit or opinion ("შენ რომელი ხელით აღებ კარს?"), where it fits (a tip
  film always may). It is a question, never "დაწერე კომენტარში": the post's first paragraph already asks for comments.
- `node tools/build-index.mjs` stops on every broken rule.

## Georgian check (after the spec, before step 5; never skip)

The owner (2026-09-25): the films' Georgian sometimes sounded like "აბდაუბდა", the idea there but badly said; he
wants it simpler, the way a friend talks. Step 5 voices the spec, and after that every changed line costs a Gemini
request, so go through every `say` line, the cover title and the post description first (in a redo or an edit: the
lines you write or change):

1. **Say it aloud**, as if telling a friend in the car. Would a Georgian friend say exactly these words, in this
   order? If not, do not patch the words: say the thought again, from scratch, in Georgian, and write that. Never
   translate a sentence you thought in English or Russian.
2. **Hear it once**, with no subtitle and no rewind. Can a word be taken for another ("ვინ" opening a clause is
   "who", "ფასს იღებს" is "gets paid", "კვირაში" is also "per week", "დამთხვევა" also "a coincidence", "წელს" is
   "this year")? Does every sentence say who does what ("ცოტა თუ ნახა": few what)?
3. **Scan for the traps** (CLAUDE.md, Say it simply): a passive or "-ულია" form, nouns with no verb, a "-ში"
   chain, a "რომელიც" clause, the subject after the verb, a calque ("მადლობას გეტყვის", "ერთი შეხებით"), a bookish
   word ("ვარაუდობს", "იზრდება", "აღარასდროს", "ნაცვლად", "მას"), a future and a present in one sentence, "თქვენ"
   or "-თ".
4. **Rewrite** every line that fails, with the same facts; keep `show` in step (the same `|` count, ≤ 24
   characters a chunk). Then read the whole film aloud once, top to bottom: one friend talking, not a string of
   slogans (a story: as someone who never heard it, who is it, who is each person, what did it come to). Then the post
   next to the voice: it adds what the film did not say (POST_ECHO). Last, `node tools/build-index.mjs <id>` (it voices nothing) and fix its word and sentence warnings now,
   while they are free.

## 5. Check: voice, lint, stills, cover, one sheet

```sh
node tools/check.mjs <id> [frames...] [--len 15|20|30|45]
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
  covers it) or at the right edge beside the like column. Nothing is clipped at an edge. An illustrated scene or an
  illustrated Film fills the whole frame edge to edge (2026-10-06, full bleed): no crop line, no fade, no band of
  picture ending inside the frame; the meta bar and the subtitle sit on it unchanged (no shadow, no box), so the
  picture keeps a calm area under the subtitle line. A photo fills the frame only when it fits (a tall photo); a wide
  or small one is drawn whole on the clean field, smaller (the owner, 2026-10-07: blown up, "you can't make it out"):
  the photo must be recognisable on every tile.
- No text overlaps. No word appears twice in the frame. The Georgian has no typos and still passes the Georgian
  check. One "!" at most (the hook), never "!!", and no "—".
- Every number on screen equals the number in the voice and a number in the facts table.
- Green means good for the viewer, red means it costs the viewer. At most one saturated colour per shot.
- A phone shows the right screen for the claim, with the highlight on the real element and no test data. Every
  app screen is big, bright and readable at this size; never a dim grey slab.
- The VHS is visible (a colour fringe on edges, scanlines) but never tears the meta or the subtitle.
- Cars look premium: clean lines, real proportions, nothing clipped; and a car is drawn only where the car is the
  point (a refined 2020s shape), never as decoration where a diagram of the part, a real photo or the screen explains.
- No word leans: the lint's REPEAT and KEYWORDS warnings are fixed, and „ხოდოვოი" appears nowhere (BANNED_WORD).
- Street words only where rule 21 allows them, and no STREET or BANNED_WORD line is left.
- Every beat has its own picture idea; no two tiles in a row look alike.
- The Film tile (the film's new visual): premium and clear in this look, not crowded, centred in the content box;
  an illustrated Film fills the frame (full bleed), a diagram is cut only on a hard edge; refine the file and check
  again when it looks cheap.
- The last scene is the EndCard with the quote (on a follow film the reminder, in two lines); nothing names a
  store or asks to download.
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
