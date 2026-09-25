# Vinari video studio

Local, free, unlimited 15/20/30 s vertical promo videos (1080×1920, 30 fps) with a Georgian
voice, synced Georgian subtitles, motion graphics and a close, quiet ASMR sound design (no music).
Nothing here costs money: Remotion (free for a team of ≤3 people, pinned 4.0.527), Google Gemini TTS
on the free AI Studio key (the house voice `gemini:Algieba`, the voice every spec asks for), edge-tts
(Microsoft's free `ka-GE-GiorgiNeural` / `ka-GE-EkaNeural`: the last resort when Gemini's free quota is gone,
on the Mac and in the cloud),
a synthesised sound kit (tools/asmr.mjs), CC0 Kenney models, OFL fonts.

## The owner's rules (2026-09-24, newest; they override anything older below)

1. **Voiced, always, by Gemini first.** `"voice": "gemini:Algieba"` (female: `"gemini:Achernar"`). The
   whole film is ONE Gemini request (Voice, below). Out of today's free quota, vo.py falls back to
   Microsoft's edge-tts with a loud warning, on the Mac and in the cloud (the owner, 2026-09-25, reversing
   the same morning's "Gemini only": a video must always come out). The cloud tells him before he makes
   one (vinari.ge/studio: a banner and a question) and labels the film "Microsoft-ის ხმა" on the site,
   never in the film, the cover or the post. On the Mac, voice it again after 11:00 Tbilisi for Gemini.
   The sound effects stay as present and clear as in a silent cut, the voice on top (the voiced mix:
   `setMix` in scenes/common.tsx, `MIX_VOICED` in tokens.ts).
2. **Render only what was asked.** `./make.sh <id>` makes the one voiced film. No `--silent`, no
   `--light` copy, no `--formats` unless the owner asks in that message: unrequested files fill his
   MacBook. Check work with stills (`tools/stills.mjs`, `--still N`), not with extra full renders.
3. **Creative like v1-v8** (he found v9/v10 flatter): a visual metaphor per beat (the car ages on
   1 January, a board flips ×1 → ×3, squares zoom out, a passer-by scans the QR card, a pin drops, a
   push lands on the lock screen, dots of a strip plot, a wireframe car drawing on), a visual change
   on every subtitle chunk, at least three scene types in 20 s. Never a slideshow of titles and phones.
4. **Say it simply** (below): everyday, short, friend-talk Georgian, every line through the Georgian check
   before it is voiced (2026-09-25: it sometimes sounded like "აბდაუბდა"). Hooks may be playful or silly, as
   long as they are true (HOOKS.md H14).
5. **Never "myauto"** (myauto.ge, MYAUTO, მაიავტო) in any text or voice: say "ცოცხალი განცხადებები"
   or "ბაზარი". build-index stops on it.
6. **App screens clearly visible**: large (the talked-about element pushed in), bright, readable at
   phone size, never a dimmed grey slab. Highlight with the band, do not grey out the whole screen.
7. **The looks alternate** in production order: dark, light, dark ... Every new spec sets `"theme"`
   from `node tools/next-theme.mjs <id>` (ledger: specs/.themes.json).
8. **Cars look premium**: Wire3D models in the `real` stance, refined lines, realistic proportions.
9. **Sharp, with pollar's lens** (after v11 on Instagram; this replaces the old "VHS clearly visible"
   with scanlines and grain, which read as blur on a phone): a crisp centre, a radial red / blue fringe
   that grows towards the edges, ON GRAPHICS ONLY (cars, charts, phones, maps, cards), never on text;
   short, subtle glitches on cuts only. References: out/pollar-reference-station.png, -paper.webp.
10. **The ending**: the quiet EndCard (mark, wordmark) with a short, creative closing quote in plain
    Georgian as its `tagline`, spoken as the last line; optional quiet `note` ("… · VINARI+"). He likes
    these quote endings. **No call to action**: no store, no "გადმოწერე", no "download", nothing that
    pushes an install (build-index stops on it).
11. **Subtitle low, graphics big** (his screenshot of the posted v11: out/ig-reference-v11.webp): the
    subtitle sits in the free band over Instagram's username row (frame y 1500), the graphics take the
    room it left (the content box runs to frame 1330).
12. **White is white, red is red, green is green**: every white and grey neutral (R = G = B), the data
    colours real and vivid on both looks (Style).
13. **The film's Georgian in Mtavruli** ("on one line it is prettier", out/mtavruli-reference.webp):
    subtitle, meta bar, titles, labels, captions, chips, the tagline, all set at render time by `mtav()`
    (src/lib/format.ts); specs stay Mkhedruli (build-index forbids Mtavruli there). The designed cover is
    set the same way (the owner, 2026-09-25: the film's font "is very good" and the cover must not be
    another one): headline, tag and sub in condensed Mtavruli, the headline at the Title scene's weight 600.

## Make a video

1. `node tools/next-theme.mjs <id>` → the look; write `specs/<id>.json` (format below) with that
   `"theme"`. Copy an existing spec as the starting point.
2. `./make.sh <id>` → voice (`tools/vo.py`) → index → render → glitch check (`tools/flicker.py`) →
   loudness (two-pass, -10 LUFS / -1.5 dBTP) → `out/<id>.mp4` + `out/<id>.cover.png`. That is the
   delivery. (`--light`, `--silent`, `--formats` exist, only on the owner's request.)
3. Look before shipping: `tools/lock.sh node tools/stills.mjs <id> [frames...]` writes half-size PNGs
   of every scene to `out/stills/`; read them. `./make.sh studio` opens the live preview. The 8 GB M1
   runs one Chrome job at a time: every render and still goes through `tools/lock.sh` (make.sh does).

A 30 s render takes about 1.5 minutes on this M1 (about 3 when the glitch check forces a second,
`--concurrency=1` pass). The voice is one Gemini request per film, cached in `tools/.vo_cache`: an
unchanged film costs nothing, one changed `say` line one request for that line alone (Voice).

## Spec

```json
{
  "id": "v11-example",              // file name, composition id: [a-z0-9-]
  "voice": "gemini:Algieba",         // the house voice; female "gemini:Achernar" (the only voices he uses)
  "rate": "+0%",                     // edge-tts voices only (+8..+12%); a Gemini voice takes "style" instead
  "gap": 0.22, "sentenceGap": 0.3,   // pause between beats / between sentences inside a beat
  "leadIn": 0.1, "tail": 0.35,       // silence before the first word / after the last (defaults)
  "accent": "brand",                 // "brand" = the red data colour, "yellow" = pollar yellow
  "theme": "light",                  // from `node tools/next-theme.mjs <id>`: the looks alternate dark, light ...
  "cover": {"title": "ერთი მანქანა, | ორი ფასი", "tag": "განბაჟება", "frame": 260}, // the designed Reels cover
  "music": null,                     // the default: no music, the sound is the ASMR kit (see Sound)
  "beats": [
    {
      "say": "ორი ათას ოცი წლის ბენზინზე | დღეს სამი ათას ექვსას ათი ლარი.",
      "show": "2020 წლის ბენზინზე | დღეს 3 610 ₾",
      "meta": ["განბაჟება · 2020"],   // top mono bar, persists until changed
      "scene": {"type": "Stat", "value": 3610, "format": "gel", "at": 1, "source": "rs.ge · 2026"},
      "sfx": [{"name": "asmr-paper-tear", "chunk": 1, "volume": 0.4}], // only for an event no scene sounds
      "hold": 0.5                     // extra silence after this beat
    }
  ]
}
```

- `say` is what the voice reads. Numbers, dates and brand names are spelled as Georgian words
  (`ვინარი`, `ვინ კოდი`, `ოცდაცხრა`). `show` is the subtitle: digits, `Vinari`, `VIN`.
- `|` splits a beat into subtitle chunks. `show` must have the same number of chunks. One chunk
  is one subtitle line: keep it ≤ 30 characters (≤ 24 is best).
- A beat without `scene` keeps the previous scene running. A scene's `at: n` means "when
  chunk n of this scene starts" (chunks counted across all beats of the scene).
- Budget: about 11.5 Georgian letters per second of finished voice. 15 s ≈ 150 letters,
  20 s ≈ 210, 30 s ≈ 310. Every sentence end costs `sentenceGap`. `tools/vo.py` prints the real
  length; trim words, not speed, when it runs long.
- `{daysToJan1}`, `{today}`, `{year}` are filled at build time in `show` and scene strings, never in `say`.
- `leadIn`: seconds of silence before the first word (default 0.1). Use 0.6 to 1.0 when a sound or a
  motion should hook before the voice (v5 uses 0.97: two knocks of the Wave play alone first).
  `tail`: silence after the last word (default 0.35). Both are read by `tools/vo.py`.
- `music` is off by default (absent or null). A bed can still be set (`{"src", "volume", "duck"}`,
  `node tools/music.mjs`), but the owner asked for none: the film is voice, room tone and ASMR.
- `cutSfx`: the sound on every scene cut, default `"asmr-air"`; `null` = silent cuts.
- `theme`: `"dark"` (the black film) or `"light"` (the app's light look, Style). Every new spec sets it
  from `node tools/next-theme.mjs <id>`, which reserves the next look in production order (dark, light,
  dark ...; ledger specs/.themes.json). A hook variant or a translation keeps its original's look.
  build-index warns when a spec has none.
- `cover`: the designed Reels cover (`src/Cover.tsx`, the owner 2026-09-24), in the film's own theme (a
  black film gets a black cover, a white film a white one). Layout: a small Vinari lockup top left, the
  issue number (from the id) and a small tag top right, a hairline, a big headline, and the film's own
  picture frozen at `frame` rising out of the field below (no meta bar, subtitle or VHS). Everything that
  matters sits in the centre 1080×1440 (y 240..1680), the 3:4 that Instagram's profile grid shows.
  **Black and white only** (the owner: no green or red on a cover; the picture is shown in grey).
  Every new spec writes one: `title` (2 short lines, `|` breaks; plain words, a question or a twist,
  never the whole voice line), `tag`
  (default the first meta label), `frame` (the clearest picture of the idea: a settled scene, never
  mid-flip; default 70% into the hook scene), optional `sub`, `zoom` (1.15 on a Wire3D car, else 1), `y`.
  A bare number is still read as `frame`. Check it on the contact sheet before delivering.

## Voice (Gemini, `tools/vo.py`)

- **The quota**: the free AI Studio key gives each model about 10 requests a day; vo.py tries
  gemini-3.8-flash-tts, 3.8-flash-lite-tts, 3.1-flash-tts-preview, 2.5-flash-preview-tts in that order,
  one model per film (never two in one film). It resets at midnight Pacific: 11:00 Tbilisi (12:00 in
  winter). The key is read from env `GEMINI_API_KEY` or `~/.config/vinari/gemini.key`, never printed.
- **One request per film** (`"geminiSplit": "whole"`, the default; spec, beat or env
  `GEMINI_TTS_SPLIT`): every sentence group, word for word, one per line, in one request. vo.py cuts the
  take into the sentences at their pauses (`split_whole`: a small dynamic programme on the pauses, the
  film's own pace from the letters, and a preference for long pauses), then every sentence into its `|`
  chunks with `pause_split`, exactly as the sentence mode does, so gaps, `leadIn`, `tail`, the timeline and
  the subtitles work as before. vo.py's summary line says how many Gemini requests the run made.
- **When the cut is not sure** it says why ("does not split with confidence (...)") and voices that film one
  request per sentence instead (1 + the lines not cached): fewer clear pauses than borders, a border only the
  letters chose (a longer pause next to it or inside its sentences), a sentence too fast or slow for its
  letters, all the sentences' paces together too far from their letters (a chi-square test, `W_CHI`: a line
  skipped, read twice or run into the next), or a second split that fits almost as well. `"sentence"` (one
  request per sentence) and `"chunk"` (per subtitle chunk) still exist.
- **What a change costs**: an unchanged film nothing (its take, or every line's own take, is cached). ONE new or
  changed line exactly one request, for that line alone: a whole take leaves each line's piece in the cache
  (`<key>.gemini-cut.wav`, not a request, so check.mjs does not count it), and the other lines keep their
  audio and timing. Two or more changed lines: one request for the whole film again. A re-run tries the
  model of the film's own timeline first, so a film voiced on a later model of the chain keeps it (and its
  cache) after the first model gets its quota back.
- **Measured offline** (`python3 tools/vo_whole_check.py`, no network: real cached Algieba clips joined into
  whole films, 2026-09-25): with 0.25-0.7 s pauses between sentences no sentence border on the wrong pause
  in 480 films, borders within 3 ms (median) of where the sentence mode finds them, about 20 % fall back;
  with tight 0.12-0.2 s pauses (shorter than the pauses inside sentences) no wrong border either, and most
  fall back. `--timeline <id>` runs one real film through vo.build. `python3 tools/vo_test.py` is the
  plumbing test (a mock server). Review 2026-09-25: takes that are not the text (two lines run together with no
  pause, a line skipped, a line read twice) split anyway about 15 % of the time before `W_CHI` and the click
  rule (`W_CLICK_PAUSE`), about 3-4 % after; a take whose line ran into the next can still slip through, so
  listen to the first real whole-film takes. No Achernar clip was cached to test the female voice.
- **Out of quota** (every model of the chain): edge-tts reads the whole film (same gender: Giorgi for
  Algieba, Eka for Achernar; `"fallbackVoice"` overrides) with a loud WARNING, on the Mac and in the cloud,
  and vo.py writes `out/ci/voice-quota.json` `{"code":"voice_quota","fallback":"edge","resets":"11:00
  Tbilisi"}` (the cloud turns it into post.json's `"geminiOut"`). A model that is not there (404 NOT_FOUND: a
  preview model retired or renamed, `GeminiMissing`) is skipped as if it were not in the chain: a day with
  [out of quota, 404, out of quota] is still a quota day (no `"why"`, so the site warns). A model that fails
  another way (the key refused: 400/401/403; a 5xx, the network, or an answer cut short or not JSON after every
  retry) is skipped the same way (`GeminiUnavailable`), so a film still comes out; the note then adds `"why":
  "gemini_error"` (so does a chain where no model said it was out of quota) and publish.mjs does NOT set
  `"geminiOut"` (the site does not claim today's quota is gone). An answer with no audio twice for the same text
  (`GeminiNoAudio`) ends the chain at once: every answer costs a request of the free quota, so the other models
  are not asked, edge-tts reads the film (`"why": "gemini_error"`), and `out/ci/voice-noaudio.json` marks the film's
  text for the rest of the job (the cloud's check, then its voice step; 3 hours on the Mac): the next run sends it
  to edge-tts without asking Gemini. A normal film still costs one request. Only Google's status
  and reason are logged, never the error body (it can name the Cloud project). The timeline's `"voice"` is then the
  edge-tts voice and it has no `"model"`; a Gemini film's timeline has `"voice": "gemini:..."` and the
  `"model"`. Every vo.py run first removes an earlier run's note, so the file always speaks for the last
  run. `tools/check.mjs` says the film is read by edge-tts and goes on. Only with `VO_NO_EDGE=1` (the
  cloud's repo variable `STUDIO_NO_EDGE`, off by default) vo.py stops instead: exit 75, a `VOICE_QUOTA:`
  line and the same file without `"fallback"` (only when the quota is all that stopped it, 404s aside; any other
  failure is an ordinary one); check turns it into one line, "VOICE_QUOTA ხმის
  დღევანდელი ლიმიტი ამოიწურა". On the Mac, a film for the house voice is voiced again after the reset.
- Change a `say` only when the words must change: one changed line is one request, more re-voice the whole
  film. Never re-voice a spec just to check it.
- **The director's note** (`GEMINI_STYLE`, in Georgian: an English note gave "ვინარი" an English stress). Since
  2026-09-25 it is someone telling a friend something, warm, unhurried and clear, never an announcer, a documentary
  narrator or an ad, with a short pause after every sentence. The note is part of every cache key: a film voiced
  under an earlier note (`GEMINI_STYLES_BEFORE`) keeps that take for free until one of its lines changes, then the
  whole film is voiced again with today's note (one request); `VO_RESTYLE=1` does that on purpose. A beat's own
  `"style"` (a joke, the car speaking) is Georgian too: today's note plus one line on what differs, never
  "მთხრობელი" or "დიქტორი".

## Scenes (`src/scenes/*.tsx`, props documented in each file)

Any `src/scenes/<Name>.tsx` that exports a component `<Name>` is scene type `"<Name>"` (no registry).
`at` is a chunk index of the scene, or seconds from the scene start as a string (`"1.2s"`) where noted.

| type | use it for | props (all optional unless marked) |
|---|---|---|
| `Title` | hook, statement, question | `lines`* (string or `{text, at, tone}`), `size` (84; shrinks so the widest line fits 840 px, never wraps), `strips` (pollar cover look; the strip stays inside the 70 px safe margin), `align`, `y`, `kicker`, `source` |
| `Stat` | one true number counting up | `value`*, `from`, `format` gel/usd/int/plain, `decimals`, `tone`, `at`, `landAt` (count lands on that chunk), `chips`, `label`, `caption`, `source`, `delta{text, tone}` |
| `Compare` | before/after bars from zero | `items`*`[{label, value, tone, at}]`, `format`, `delta{text, tone, at}`, `title`, `source` |
| `Squares` | pollar scale zoom-out, area = value | `items`*`[{label, value, tone, at}]`, `format`, `source` |
| `Grid` | n cells filling (29/29, 187 months, 11 mechanics) | `n`*, `cols`, `filled` (default n), `big`, `label`, `tone` (up), `at`, `source`, `check`; cells up to 150 px, the grid at most 560 px tall |
| `List` | short list, checks, strike-throughs | `items`*`[{text, note, at, strike, tone, mark: check/cross/dot}]`, `title`, `size` (58: marks, gaps and notes scale with it, a long note shrinks to its line) |
| `LineChart` | a real series drawing on | `series`* (numbers or `"geostat"`, the 187-month index), `tone`, `label`, `source`, `fromLabel`, `toLabel`, `at` |
| `StripPlot` | listings as dots: median vs mean | `dots` (21), `markersAt`, `outlierAt`, `meanLabel`, `medianLabel`, `source` (schematic: no prices) |
| `SplitFlap` | a mechanical board flipping one value to another | `from`*, `to`*, `at` (chunk or "0.65s"), `label`, `tone`, `size`, `laps` (full drum turns before a digit lands; unset = one extra turn for a hop under 4 cards, 0 = the direct hop) |
| `Calendar` | a month, a countdown to a date | `month`*, `days`*, `startWeekday`* (0 = Monday), `marks`*`[{day, label, tone, at}]`, `today`, `countdownTo`, `at` (chunk or "0.9s") |
| `Notification` | a push on a lock screen or floating | `title`*, `body`*, `time`, `at`, `lock`, `clock`, `app` |
| `QRCard` | the glass card, a passer-by scans it | `scanAt`, `noPlate`, `reasons` (3), `caption` |
| `MapPin` | parking: a pin drops on the car in a line-art city | `label`, `caption`, `at` |
| `Wave` | engine sound: mic, live waveform, 3 character chips | `labels` (კაკუნი/ჭრიალი/გუგუნი), `pick`, `at`, `caption`, `sound` (false = silent recording) |
| `Phone` | a REAL app screen in a line-art iPhone, clearly visible: large, bright, readable | `src`* (public/screens), `y`, `x`, `zoom` (the framing it lands in), `focus[{y, x, zoom 1..1.8, at}]` (`at` chunk or "1.2s"; a first key at "0s" is the landing framing, not a push), `highlight` (one or an array of `{y, h, x, w, tone, at}`), `tap` (one or an array of `{x, y, at}`), `callout{text, value, tone, at}`, `bright` (dark film only; never below the scene's default), `cropBottom` (hide the capture from this fraction down) |
| `Wire3D` | pollar wireframe 3D | see below |
| `EndCard` | always last: a quiet signature, never a call to action | `tagline` (a short creative closing quote, ≤ 26 characters, the last spoken line), `note` ("<feature> · VINARI+" or a hedge); no store line |

`Wire3D` props: `models`* (`["sedan-sports"]` or `[{name, label, tone, at, highlight}]`, 2+ stack
vertically; sedan-sports, suv-luxury, sedan, suv, taxi, van, truck, hatchback-sports, ship-cargo-a,
shipping-container-a, cargo-container-a, building-a), `shot` hero/side/top/front/rear, `az`, `el`
(degrees, override the shot), `orbit` (degrees over the scene), `dist`, `fill` (0..1 of the box),
`stance` real (the default; keep it: premium, realistic proportions) / toy / `{len, over, cabin, belt,
wheel, width}`, `threshold` (crease angle, 28), `ghost`
(hidden-line opacity, false = off), `seed` front/rear/top/center (where the pen starts), `draw`
(frames, 46), `highlight{part: front/rear/wheels/roof/engine, tone, at, label}` (brackets),
`scan{at, tone, dur, from, keep, label}` (a section plane), `caption` (mono formula line),
`flip{from, to, at, tone}` (a big mono readout that flips; shrinks to fit 840 px), `move{from, to,
crossAt}` (slide along x in old screen units; the framing keeps the whole path inside the box),
`marker{label, tone}` (the dashed 01.01 line, label under the box), `tag{from, to, tone}` (the price
that flips when the model crosses the marker). All models of a scene draw in ONE WebGL canvas (a band
per model, viewport + scissor): see Gotchas.

Tones: `neutral` (ink), `up` (green: good for the viewer), `down` (red: costs the viewer),
`accent` (the video's one saturated colour). At most one saturated colour per shot.

Screen coordinates for `Phone` are fractions of the 1080×2346 capture (0 = top/left). Read the
JPEG first and measure; never guess.

## Content rules (from Marketing/VINARI — app brief.md, all hard)

- Never invent a number. Only figures from the brief: customs 2020 · 2.0 L petrol 3 610 ₾ today,
  9 615 ₾ from 1 January (valid for 2026 declarations only, so such a spec gets
  `"validUntil": "2026-12-31"`); 29/29 match with rs.ge; 187 measured months (Geostat); the
  live-listing median ("შუა ფასი" of "ცოცხალი განცხადებები"); 11 mechanic types; reminders 7/3/1 days,
  09:00 and 19:30.
- **Never name the listing site** (the owner, 2026-09-24): no "myauto", "myauto.ge", "MYAUTO", "my auto",
  "მაიავტო", "მაი ავტო" in say, show, meta, scene text or the title, even as a source line. Say
  "ცოცხალი განცხადებები" or "ბაზარი". `tools/build-index.mjs` stops on it (demos too), and on a scene
  that draws it by default.
- Never say the app shows owners, fines, finds a car by plate, gives a "full history", makes a
  "დიაგნოზი", or name an Android date. No percentages or user counts.
- Only "one car and its price" is free. Customs, calendar, QR card, wallet, engine sound, chart
  and auction history are VINARI+. Never call them free.
- Never read out prices that appear on screens: they are live and change.
- No em dash (—) anywhere on screen, no "!", no italics. Georgian must sound like a friend talking
  (Say it simply, below).
- Never `.toUpperCase()` Georgian, and never write Mtavruli into a spec: the film's Mtavruli is made at
  render time by `mtav()` (src/lib/format.ts), drawn from Noto Sans Georgian. `capsLatin()` is safe.
- Screens are never edited, only cropped, zoomed, dimmed. Do not show test data
  (03-calendar-day contains a "ტესტი, ვაკე" entry).
- **No call to action** (the owner, 2026-09-24: it reads as marketing and pushy). No store name (App
  Store, ეპ სტორი, Google Play, Play Market, Эп Стор), no "გადმოწერე" / "ჩამოტვირთე" / "დააინსტალირე",
  no "download" / "install" / "get it on" / "link in bio", no "скачай" / "установи" / "загрузи" in say,
  show, meta or scene text, and no store line on the end card: `tools/build-index.mjs` stops on them
  (and warns on "ახლავე", "დღესვე", "სცადე", "try it"). The film ends on the EndCard with a short
  creative closing quote; the last beat's `say` is that quote (the `tagline`) itself.
- Paid features are labelled quietly: the meta of the beat that shows a VINARI+ screen reads
  "<feature> · VINARI+" ("კალკულატორი · VINARI+", "ჩარტი · VINARI+"). 16-chart is the paid chart screen.
- Never read out a listing count off a screen either ("22 განცხადება" on 16-chart is live).
- No App Store badge is drawn (and, with no call to action, no store is named either).

## Say it simply (the owner, 2026-09-24: "მაღალფარდოვანი"; 2026-09-25: "აბდაუბდა", the idea came across, the Georgian did not)

Write what a Georgian friend says out loud in the car, not what an office prints and never a translation: "შენ",
short sentences, everyday verbs, the verb last.

**The Georgian check** (every `say` line, the cover title and the post, before the first `check.mjs`: after that
every changed line costs a Gemini request). Say each line aloud as if telling a friend in the car and rewrite it when
a friend would not say exactly these words in this order, when a word heard once can be taken for another, when it is
nouns with no verb, or when it reads like an English or Russian sentence in Georgian words (then do not patch it: say
the thought again, from scratch, in Georgian). Then read the whole film aloud once: one friend talking, not slogans.
`node tools/build-index.mjs <id>` voices nothing and warns on the word table below and on long sentences: run it
before the first check. The rest is the ear.

- One thought per sentence: **7 words or fewer** (9 at most, counted on `show`, a number is one word); in the voice
  **40 letters or fewer** (55 at most: one breath). Two sentences per beat at most.
- The verb ends the sentence and the news sits right before it. A "რომ" or "თუ" clause goes first: "ბიდს რომ დებ,
  ბოლო ფასი იცი?"
- The viewer acts, in the informal singular: ჩაწერ, ნახავ, დააჭერ, გადაიხდი, გახსოვს?, გჭირდება. Never "თქვენ", the
  "-თ" plural (ნახეთ, იცოდით), "მომხმარებელი".
- Verbs, not nouns ("დაითვლის", not "გამოთვლას ახორციელებს"). An imperative takes the future after it ("ჩაწერე…
  დაითვლის", "დაამატე… ნახავ"); a present takes a present. Never a future and a present in one sentence.
- Say who does it when the doer changes ("ვინარი", "ტყუპები"); "მას", "მათ", "ის" for the app or the cars sound bookish.
- Friendly is not slang: no Russianisms (ვაფშე, ტიპა, კაროჩე), no "ძმაო" or "ბრატ", no slang spelling. The drivers'
  own words are welcome: ჩამოყვანა, ბიდი, განბაჟება, ტექდათვალიერება, კარობკა, მალიარი.
- For the voice: numbers the way people say them ("ორი ათას ოცი წლის", "სამი ათას ექვსას ათი ლარი"), no hyphens,
  brackets or quotes in `say`, a comma where a friend takes a breath.
- A hard word the story needs (აქციზი is on the calculator screen) is said once in plain words, or replaced.

**The traps** (each one is in a film we made; the table after them has the lines):
- **Heard as another word, once**: "ვინ" opening a clause is "who" (say "კოდს" once the VIN is known, or put it
  mid-sentence); "ფასს იღებს" is "gets paid"; "კვირაში" is also "per week"; "დამთხვევა" also "a coincidence";
  "წელს" is "this year" (say "წელი"); "ორი განბაჟება" is "clearing it twice".
- **Passive and participles** ("გამოკლებულია", "გაუქმებული კოდი", "დაემატა"): give it a doer and an active verb.
- **Noun piles**: nouns and genitives with no verb are a label, not speech. Add the verb and the "შენ".
- **"-ში" chains**: one place per sentence ("ვინარიში" once), then verbs.
- **Clauses**: "რომელიც", "რის გამოც", "იმის გამო, რომ", "რათა" become two sentences, or a "რომ" up front.
- **English order**: the subject or "only one" after the verb ("სამჯერ იზრდება მხოლოდ ერთი"). The verb goes last.
- **Calques**: "მადლობას გეტყვის" (will thank you), "ერთი შეხებით" (one tap), "სურათს ამახინჯებს" (distorts the
  picture), "მზად მიხვალ" (go prepared), "შენთან მოვა" (comes to you: "შენ მოგივა"), "დღე იწურება". Say what a
  Georgian says instead, often an idiom: "თავს აღარ გაიტეხ", "საღამომდე მოასწარი".
- **Bookish words**: ვარაუდობს (ჰგონია), იზრდება for a price (ძვირდება), სამმაგია (სამჯერ მეტია), აღარასდროს
  (აღარ), ნაცვლად (მაგივრად), ყოველი (ყველა), and the word table below.
- **A missing subject**: "ცოტა თუ ნახა" (few what?). Name the thing: "განცხადება თუ ცოტაა".

Our own lines, before and after (the 2026-09-25 review):

| film | before | after | the trap |
|---|---|---|---|
| v11 | ვინ კოდს თვითონ წაიკითხავს. | კოდს თვითონ წაიკითხავს. | "ვინ" first: "who will read it?" |
| v2 | ამიტომ ვინარი შუა ფასს იღებს. | ამიტომ ვინარი შუა ფასს გიჩვენებს. | "ფასს იღებს": gets paid |
| v12 | კვირაში დაზღვევა მითავდება. | ერთ კვირაში დაზღვევა მითავდება. | "კვირაში": per week |
| v1 | ოცდაცხრა შემოწმება, ოცდაცხრა დამთხვევა. | ოცდაცხრაჯერ შევამოწმეთ, ოცდაცხრაჯერ დაემთხვა. | nouns; "a coincidence" |
| v2 | ცოტა თუ ნახა, პირდაპირ გეტყვის. | განცხადება თუ ცოტაა, პირდაპირ გეტყვის. | few what? |
| v13 | საქსტატმა ას ოთხმოცდაშვიდი თვე დათვალა. | საქსტატი ფასებს ას ოთხმოცდაშვიდი თვე ზომავდა. | it measured prices, not months |
| v10 | განბაჟება სამი ნაწილია. სამჯერ იზრდება მხოლოდ ერთი. | განბაჟება სამი ნაწილია. აქედან მარტო ერთი სამჯერ ძვირდება. | English order, "იზრდება" |
| v10 | ვინარის კალკულატორში მარჯვენა საჭეს ცალკე გადამრთველი აქვს. | ვინარის კალკულატორში მარჯვენა საჭეს მონიშნავ. თვითონ გადაითვლის. | a thing "has" a noun; you act |
| v6 | ხარჯები უკვე გამოკლებულია, რაც დარჩა, ბიდია. | ხარჯებს თვითონ გამოაკლებს, რაც დარჩება, შენი ბიდია. | passive |
| v14 | ვინარიში ბარათს ერთი შეხებით გააუქმებ. | ვინარიში ბარათს ერთი ღილაკით გათიშავ. | "one tap"; an office verb |
| v14 | გაუქმებული კოდი აღარასდროს გაიხსნება. | გათიშულ კოდს ვეღარავინ გახსნის. | participle, passive, bookish |
| v9 | შენთან ერთად ისინიც იყიდება. | ისინიც ახლა გასაყიდად დგანან. | "along with you": you are for sale |
| v9-h1 | ვინარი მათ ითვლის და ფასსაც მათით ზომავს. | ვინარი ტყუპებს ითვლის, ფასიც მათგან გამოდის. | "მათ", "measures with them" |
| v13 | ორივე ვარაუდობს. | ორივეს ჰგონია, რომ იცის. | bookish verb |
| v13 | ვინარიში ეს თვეები ერთ ხაზზე ჩანს. | ვინარიში ყველა თვეს ერთ ხაზზე ნახავ. | things "are seen"; you see |
| v4 | ვინარიში თარიღს ჩაწერ და შენ ირჩევ, როდის შეგახსენოს: | ვინარიში თარიღს ჩაწერ და აირჩევ, როდის შეგახსენოს: | future + present |
| v11 | კისერი მადლობას გეტყვის. | კისერი აღარ გეტკინება. | "will thank you" |
| v12 | ტექინსპექტირება დღესაა. დღე იწურება. | ტექინსპექტირება დღესაა. საღამომდე მოასწარი. | bookish; say what to do |
| v8 | მეხსიერება დაისვენებს. | თავს აღარ გაიტეხ. | an abstract subject; the idiom |
| demo | ას ოთხმოცდაშვიდი გაზომილი თვე ერთ ხაზზე, ვინარის ჩარტზე. | ვინარის ჩარტზე ას ოთხმოცდაშვიდ თვეს ერთ ხაზზე ნახავ. | a noun pile, no verb |

Friend-talk that works (keep this sound): "ბიდს რომ დებ, ბოლო ფასი იცი?" · "ვერ იპოვა? პირდაპირ გეტყვის." ·
"სად დააყენე მანქანა, გახსოვს?" · "რამდენად ზუსტია, ამასაც გეტყვის." · "ერთი ძვირი განცხადებაც საშუალოს მაღლა
ქაჩავს." · "საბაჟოსთვის მანქანა პირველ იანვარს ბერდება." · "ხვალ ზეთი გამომიცვალე." · "ჭორი კი არა, ციფრი."

The words `build-index` warns on:

| instead of | say |
|---|---|
| მედიანა | შუა ფასი ("შუაში რომ დგას, ის ფასი") |
| სიმჭიდროვე | რამდენი იყიდება |
| კონკურენცია, კონკურენტი | ვინც იგივეს ყიდის, სხვა გამყიდველები |
| დეკლარაცია, დეკლარირება | განბაჟება, "როცა განბაჟებ" |
| აქციზი | ერთი გადასახადი |
| ავტომობილი, სატრანსპორტო საშუალება | მანქანა |
| ღირებულება | ფასი |
| იმპორტი | ჩამოყვანა |
| ინდექსი | ფასების ხაზი |
| მომხმარებელი | შენ |
| მონაცემები, ინფორმაცია | ციფრები, რაც წერია |
| სტატისტიკა, დინამიკა, ტენდენცია | როგორ იცვლება |
| რეალურ დროში, ამჟამად, მიმდინარე | ახლა, დღეს |
| უზრუნველყოფს, ახორციელებს, წარმოადგენს | აკეთებს, არის |
| განსაზღვრავს, ანალიზი | ითვლის, ნახულობს |
| ხელმისაწვდომია | გაქვს, შეგიძლია |
| ოპტიმალური, ეფექტური, უნიკალური, ინოვაციური | (drop it) |

## Style (see src/tokens.ts)

The owner's rules (2026-09-24): a clean field (pure black, or a neutral light paper, alternating video
by video), a sharp picture with pollar's lens fringe on the graphics only, everything inside the
Instagram Reels safe zone, and no call to action.

- **Field**: the dark film is pure black `#000` (`C.bg`); the light film is a neutral paper `#F3F3F3` (Light
  theme below). No gradient, no grid, no vignette, no 3D floor grid, no
  decorative background lines (lines that ARE the content, map streets or chart axes, stay). `C.bgCenter`
  and friends are `#000` too, for the scenes that use the field as a knockout. Colour only carries data
  (green good for the viewer, red costs the viewer), no blue.
- **Colours** (the owner, 2026-09-24: the whites read bluish, the red and green did not read as red and
  green): every white, grey and surface is neutral, R = G = B. Dark film: ink `#F5F5F5` (19.3:1 on
  black), ink2 `#8A8A8A` (6.1:1), ink3 `#7C7C7C`, rule `#5E5E5E`; green `#1FD14F` (10.3:1) and red
  `#FF2A2A` (5.6:1), the same for lines and text. Light film on `#F3F3F3`: ink `#0B0B0B` (17.7:1), ink2
  `#6A6A6A` (4.9:1), ink3 `#858585` (3.3:1, quiet mono only), rule `#A0A0A0`; green text `#0B7F2D`
  (4.6:1) / line `#0F9B37` (3.3:1: strokes, fills, big numbers), red text `#D60000` (4.9:1) / line
  `#E01B1B` (4.4:1). Small text takes `toneText`; a big number or word (about 40 px and up: Stat, a landed
  flap, Calendar's count, Squares, Wire3D's flip and tag, a toned Title line or strip) takes `toneBig` (= the
  line variant), so the light film's big greens are the vivid `#0F9B37`, never the forest `#0B7F2D`. The
  brand SVGs are `#F5F5F5`. The cover stays black and white (Promo `mono`).
- **Type**: FiraGO (Latin, digits, ₾), DejaVu Sans Mono (Latin meta), and the Georgian in **Mtavruli**
  from Noto Sans Georgian 2.005 at **width 75, condensed** (the owner picked "C" of four widths;
  `NotoGeo`, OFL, public/fonts/NotoSansGeorgian-VF.ttf: instanced with fontTools, wdth 75, wght 400..700;
  its OFL file says how): the
  stacks are `'FiraGO, NotoGeo, sans-serif'` and `'VinariMono, FiraGO, NotoGeo, monospace'` (`F`), and
  Chrome takes each Mtavruli glyph from Noto. Text goes through `mtav()` at its entry point (Subtitles,
  MetaBar, SourceLine, MonoLabel, every scene's text props); measure text with the `F` stacks and the
  converted string (condensed Mtavruli runs about 16 % narrower than the full width did). Noto's line
  metrics are overridden to FiraGO's, so a line box keeps its height.
- **Safe zone** (`SAFE`, frame pixels), measured on the owner's screenshot of the posted v11
  (out/ig-reference-v11.webp: the film shows at 0.939, 45 px cropped each side): top 250, left 70, right
  edge x 1025 from y 250 to 1110 and x 887 from 1110 down (the like / comment / share column starts at
  x 922, the heart at y 1111), bottom 1620 (the username row starts at 1668, the caption line at 1795).
  Nothing important outside it. `{"safe": true}` draws these zones and Instagram's own UI boxes.
- **Stage**: every scene still draws in the old 1080×1920 design space ("stage units": content box x
  120..960, y 380..1280 = `L.side`, `L.contentTop`, `L.contentBottom`, `L.safeRight`; its centre
  `L.contentMid` 830). Promo scales the whole stage once by `STAGE.s` = 1.1: it lands on frame x 78..1002,
  y 340..1330 (`toFrame()`). The box grew from stage 1100 (frame 1132) when the subtitle moved down: the
  graphics took the room (a taller Phone window, the Wire3D model centred in a taller rect, taller
  charts, calendar rows and grid, a bigger lock screen, lower captions and sources). Keep writing scenes in
  stage units: important things inside x 120..960, y 380..1280; below stage y 1080 (`L.lowY`, frame 1110)
  nothing important right of stage x 850 (`L.lowRight`, frame 881: the like column); nothing above stage
  y 345 (the meta bar). Text and SVG re-rasterise at the final size; Wire3D renders its canvas at dpr
  `STAGE.s`, so thin lines stay one sharp line.
- **Meta bar**: frame y 268 (caps at about 274..296), from x 78 to 1002, the content box's edges; mono,
  its Georgian in Mtavruli, outside the lens.
- **Subtitle line**: centred on frame (510, 1500) (`L.subtitleY`; it was 1340 with ~300 px of nothing
  under it), in the free band over the username row: the Mtavruli letters span about 1477..1520 at 58 px,
  147 px under the content box and 148 px over the username row. At most 754 px wide (133..887), one
  line that never wraps, a plain clean line outside the lens. One size per film (layers/Subtitles.tsx
  `filmSize`): the size at which 80 % of the film's lines fit (58 px, never under 50), so the line does not
  jump in size; only a rare longer line shrinks on its own (condensed Mtavruli: 11 of 133 lines of v1-v12,
  the smallest 54 px). The lower block's own centre
  (478) looks 62 px off wherever the Reels UI is not drawn (a gallery, a chat, 16:9); 510 reads centred
  with and without it. The 16:9 frame (Wide.tsx, Promo `ui="none"`) centres it on (540, 1420)
  (`L.subtitleYWide`), closer under the picture. (tools/formats.mjs's 1:1 crop cannot hold the meta bar
  and a line at 1500 in 1080 px: its crop window cuts both ends; 4:5 fits.)
- **Lens** (`src/layers/VHS.tsx`, spec `"vhs"`: 0..1, 0 = off; leave it at the default). The owner
  (2026-09-24): the even RGB split, the scanlines and the grain read as blur on a phone; the look is
  pollar's (out/pollar-reference-station.png, -paper.webp): a radial chromatic aberration, the frame's
  centre exact, red outward and blue inward, growing to the edges, and soft like a lens. Chrome's
  feDisplacementMap samples the nearest pixel, so the offsets are whole pixels (R-to-B 1 px from 150 px off
  (540, 930) per axis, one more every 80 px, 5 at most); the moved red and blue are then blurred (sigma 1)
  through a smooth radial weight (0 within 120 px, 1 from 300 px), so a fringe is a soft gradient that
  survives 4:2:0, not three hard strands. After our encode and an Instagram-like re-encode it measures like
  pollar's station (red outward, video px, r 150-300 / 300-450 / 450-600: ours 0.3 / 1.9 / 3.6, station
  1.4 / 2.9 / 3.5, paper 2.2 / 4.2 / 5.3). No scanlines, no grain, no wobble, and short subtle glitches on
  cuts only (2-4 thin slices of the graphics thrown sideways, the fringe a pixel wider for 2 frames, a
  faint tracking band; the filter sees 64 px past the frame, so a torn slice never pulls in an empty edge).
  **Graphics only**: Promo renders the scenes twice
  (`src/lib/layer.ts`): the lens layer (everything, text hidden) and above it the text layer (only the
  text, clean). A scene marks the element that draws text with `className={TXT}`; everything inside it
  goes to the text layer (a chip, a price tag with its knockout, the end card's mark and wordmark). Text
  that a graphic covers (a card's print behind the passer-by's phone) stays graphic. Real app screens are
  graphics (the owner's list: phones), so their own small print near the frame's edges takes the fringe
  too. Sfx plays and Wire3D's WebGL canvas mounts only in the lens layer; Phone and Photo skip their
  `<Img>` in the text layer. The meta bar and the subtitle sit above both. Numbers and render cost are in
  the header of `src/layers/VHS.tsx`; check a still at 100 % and one at phone size.
- **End card**: a quiet signature, the mark, the wordmark, a one-line `tagline` and an optional mono
  `note` ("VINARI+" after a film that showed paid features). The tagline is a short creative closing
  quote in plain Georgian (≤ 5 words, ≤ 26 characters, one line of at most 720 px), spoken as the last line; the owner likes these
  (HOOKS.md §3 has a bank). No store line, no badge, no call to action (a spec's old `line` is
  ignored). It never freezes: a slow push-in, one soft light across the mark, a hairline that keeps
  drawing.
- **App screens** (`Phone`): clearly visible (the owner, 2026-09-24): big enough to read at phone size,
  bright, the element the voice talks about pushed in and highlighted. Never a dim grey slab: do not
  lower `bright`, and a highlight's dim must leave the rest of the screen readable.
- **Silent version** (only when the owner asks; he does not want unrequested silent files):
  `./make.sh <id> --silent` → `out/<id>.silent.mp4` (or spec `"narration": false`,
  or `--props='{"silent":true}'`): no voice track, the subtitle line is the primary text (66 px, weight
  600), same timing. Its sound kit is normalised to about -20 LUFS, -2 dBTP (`VS_SILENT_LUFS`; it sat at
  -28 before), never to speech level: -14 would pump the room tone up.
- **Loudness** (make.sh): two-pass loudnorm. Pass 1 measures; pass 2 is one linear gain when the true
  peak allows it, otherwise loudnorm's limiter on a meter primed with the whole film (the audio runs
  twice, only the second copy is kept, LRA 50), which in practice is a constant gain whose limiter only
  shaves the loudest clicks; a result more than 0.25 LU off is aimed once more by the miss. Voiced
  -10 LUFS / -1.5 dBTP (v9 -15.09 → -13.99), silent -20 / -2 (v10 -28.2 → -19.97). make.sh prints the
  before/after figures.
- **Light theme** (`--props='{"theme":"light"}'`, `./make.sh <id> --light` → `out/<id>.light.mp4` and
  `out/<id>.light.cover.png`; with `--silent` too → `out/<id>.light.silent.mp4`; spec `"theme": "light"`
  makes it that spec's default): the app's own light look, every second new video (next-theme). It is a token
  swap: `setTheme()` (tokens.ts) swaps the whole `C` table and the `THEME` knobs before anything renders,
  and every scene reads `C` at render time. Light values are the app's (Vinari/Design/Tokens.swift light)
  made neutral (Colours above): paper `#F3F3F3` (never warm beige, never bluish), ink `#0B0B0B`; cards
  and tiles are white surfaces. No pure black anywhere: a neutral Title strip is a white card with ink text, a picked chip is
  an ink pill, the island is ink. Real screens play at their natural brightness (Phone ignores `bright`),
  fading up from the paper; the dim around a highlight is a paper fog. Coloured glows drop to a whisper
  (`THEME.glow` 0.3), the Wire3D lines are ink (the pen's additive glow is off), the end card's mark and
  wordmark are ink (the brand SVGs through a filter on the same `<Img>`), subtitles are ink with no glow.
  The lens on paper: the same fringe (red and blue around the dark lines). A new scene: take every
  colour from `C` (or `rgba(C.x, a)` / `halo(color, a)` from tokens.ts), never a literal.
- **Debug overlay**: input prop `{"safe": true}` (`--props`, the Studio's props panel) or env
  `REMOTION_SAFE_OVERLAY=1` in a CLI render draws the safe zone (red), Instagram's measured UI (red
  boxes: the icon column, the username row, the caption), the stage content box (dashed, its lower right
  cut at the like column) and the subtitle box. `tools/stills.mjs` does not pass props yet (`./make.sh <id> --light --still N`
  does not work either: `--still` must come second, `./make.sh <id> --still N --light` does).

Springs are the app's SwiftUI
springs. Hard cuts between scenes with a soft breath of air; every scene drifts slightly. A later
scene starts its entrance `CUT_IN` (10) frames before the cut (`entrance(ctx)` in common.tsx), so a
cut lands on a picture, never on a dip to black: Phone, QRCard, Notification, SplitFlap, EndCard,
Wire3D (the pen is already drawing), and the frames of Compare, Grid, List and Title use it. Items
with `at: 0` still wait for the first word (about 3 frames after the cut).

## Sound (public/sfx/asmr.json, made by tools/asmr.mjs)

Close, soft, dry, detailed: wood, felt, graphite, paper, glass. No melody, at most about three sounds
at once, repeated hits vary a little (`vary()`). Every asmr- file is balanced for volume 0.5 against a
reference voice and its hit sits 3 ms in, so `at` is the frame of the event. The owner (2026-09-24)
liked the sounds in the silent cut: in the voiced film they must be just as present and clear, with
the voice on top and every word intelligible. Promo sets the voiced mix against the film's own voice
level (`setMix` in scenes/common.tsx, `MIX_VOICED` in tokens.ts); listen to the voiced mp4, not the
silent one, before delivering.

Already in every film, add nothing for these: `asmr-room` (room tone under everything, softer under
the voice), `asmr-sub` on frame 0 (the hook's felt thump), `asmr-air` 3 frames before every cut
(`cutSfx`), `asmr-key-roll` under a meta label typing on. Every scene sounds its own events
(Phone: slide, push, tap, highlight; SplitFlap: every flap, the landing; Wave: its recording; List:
check/strike/pop; Stat/Compare: count-roll and land; Wire3D: pencil, brackets, scan, flip; EndCard:
asmr-end ...). A spec `sfx` cue is only for an event no scene sounds. Listen for double hits.

| sound | use it for |
|---|---|
| `asmr-key`, `asmr-key-roll` | one key / a mono label typing on (TypeSfx) |
| `asmr-tick-fine` | one step of a count, a grid cell, a small value changing |
| `asmr-count-roll`, `-long` | a number counting up (30 / 36 frames); pair with `asmr-land` |
| `asmr-land` | a number or a value lands (felt thump, tiny wood knock) |
| `asmr-knock` | a card, chip or line appears; the Wave's knock recording |
| `asmr-tap`, `asmr-double-tap` | a finger on phone glass |
| `asmr-pencil`, `-short`, `-long` | a line drawing on (0.95 s / 0.36 s / 2.0 s) |
| `asmr-paper`, `asmr-paper-tear` | a card sliding into place / something old torn away |
| `asmr-air`, `asmr-air-long` | the cut / a slow reveal or camera push |
| `asmr-swell` | a soft rising reveal, no pitch; the Wave's hum recording |
| `asmr-sub` | the hook's low felt thump (Promo plays it on frame 0) |
| `asmr-flap`, `asmr-flap-roll` | one split-flap card / half a second of a board turning |
| `asmr-check`, `asmr-strike` | a check mark / a strike-through |
| `asmr-pop` | a dot or a pin appearing |
| `asmr-slide`, `asmr-screen` | a phone sliding in / a screen waking |
| `asmr-notif` | a notification (two soft wooden notes, same pitch) |
| `asmr-camera` | a scan, a VIN or a QR captured |
| `asmr-end` | the end card's warm felt hit with a long tail |
| `asmr-room` | room tone, a 10 s loop (Promo plays it) |

The `app-*` (.m4a, the app's own UI sounds) and `synth-*` files are older and not used by any scene.

## Gotchas

- Everything animates from `useCurrentFrame()`; no CSS animations, no `Math.random()`.
- three.js needs a real GL backend: `--gl=angle` on the Mac, `swangle` (software) on a GPU-less Linux
  runner. `tools/platform.mjs` picks it for every tool and make.sh (remotion.config.ts mirrors it).
- The Mac uses the system Chrome (`--chrome-mode=chrome-for-testing`) to save 200 MB of disk; Linux uses
  Remotion's own chrome-headless-shell (`npx remotion browser ensure`).
- If edge-tts starts failing with 403: `python3 -m pip install --target tools/pylib -U edge-tts`.
- A Gemini voice reads its key from env `GEMINI_API_KEY`, else the first line of
  `~/.config/vinari/gemini.key` (env `GEMINI_KEY_FILE` points elsewhere). The key is never printed.
  The free daily quota is small (Voice, above): one request per film, one per changed line.
- A parallel render (concurrency 3) now and then drops a layer or writes a corrupted, tiled frame on a
  single frame (seen in v1, v3 and v6). `make.sh` runs `tools/flicker.py --threshold 0.7` on every render
  (`VS_FLICKER_THRESHOLD`; flicker.py's own 0.8 let a Wire3D frame with missing thin lines through at
  0.80) and renders again with `--concurrency=1` when it finds one. A frame flagged again in that render
  and flagged at least as high in the parallel one rendered the same twice: it is the film's own motion
  and is accepted (a Notification's buzz shakes the phone every frame: 0.66 on the dark film, 0.8 on the
  light one). Any other survivor stops the build. Check any mp4 with
  `python3 tools/flicker.py out/<id>.mp4 --top 5`. Motion that alternates every frame (a strobe, a flap
  shaded dark on a white card) scores like a glitch: keep it soft.
- Wire3D and parallel renders (measured 2026-09-24, frames 100-230 of v10 and 0-160 of v9 at
  concurrency 3): two stacked models as two `<ThreeCanvas>` dropped the SUBTITLE layer on 4..7 frames
  of every render, and a model's delayRender released next to `setModel()` let a tab screenshot a frame
  whose canvas had not drawn yet (a blank car). Now every Wire3D scene is one canvas (one THREE.Scene
  and camera per model, a viewport band each) and the model's handle is released after the commit:
  both spans score clean (worst 0.00). Keep it that way: one WebGL context per scene, and release a
  delayRender only in an effect after the state it waited for has rendered. Never add nested CSS 3D (`preserve-3d`,
  `backface-visibility`) to a scene: one flat `perspective() rotate()` transform is safe.
- A scene you are still writing goes in `src/scenes/_draft_<Name>.tsx` (not registered); a broken
  registered scene breaks every bundle.

## Verified pitfalls (from the 2026-09-24 review: check every spec against these)

- Reminders: 09:00 fires on every step (7, 3, 1 days and the day itself), but the **19:30 repeat fires
  only 1 day before and on the day** (Vinari/Core/VNCalendar.swift ~452). Never put "09:00 · 19:30"
  over the 7- and 3-day items.
- `05-customs.jpg` is the **budget → max bid** mode: it shows 30 000 ₾ budget, **$6810 max safe bid** and a
  live NBG exchange-rate line. It does NOT show a customs total, and the rate line is online. Do not say
  "you see the customs amount" or "offline" over this screen. Offline is true for the customs formula only.
- Customs step: the age counts from the **declaration year**. "a late ship pays the January amount" is too
  strong; say "a ship that arrives in January pays the new amount".
- "წელს" means "this year" when heard: in a video about the year changing, say "წელი" / "გამოშვების წელი".
- `{daysToJan1}` is fixed at render time. A video with it is only true on the day it was rendered.
- If the voice says "the same car", the same model must be on screen.
- Do not show the same words twice in one frame (list rows = subtitle, tagline = subtitle, meta = chips).
  On the end card, a subtitle whose every word is already on the card (the tagline) is dropped
  automatically, so the last beat's `say` is the tagline; lists should carry icons/marks or
  different words than the voice.
- Right-hand drive: the ×3 is the **excise** only (duty and the 480 ₾ fees do not change), and only for
  an ordinary car (CustomsCalculator.swift: classics over 30 years keep 1.0 × cc, electric cars are a
  flat figure). Name the car ("2020 · 2.0 L · ბენზინი") and never say the customs total triples.
- The 29/29 rs.ge check says nothing about right-hand-drive cases: do not put it right after the ×3 as
  its proof.
- QR card quiet hours are OFF by default (Vinari/Core/MoveCar.swift ~293: `quietOn ... ?? false`);
  23:00-07:00 is only the window once someone switches them on. Say "ღამით, თუ გინდა, უხმოდ მოვა.",
  never "at night it makes no sound". The brief (Marketing/VINARI — app brief.md) still words this as
  automatic and needs the owner's fix.
- SplitFlap passes through other values on its way; only the first and the landed value are drawn in
  full ink (the cards in between are a blurred smear), and a "?" target turns through blanks, never
  digits. Still: never pause-frame a flip in a thumbnail.
- A subtitle chunk over ~24 characters shrinks; over 30 is a lint warning. Split with "|".
- Numbers in "say" as Georgian words; Latin in "say" (rs.ge, App) is read oddly: write it in Georgian.

## Recent scene API changes

- 2026-09-24, fourth pass (review of the third):
  - Condensed Mtavruli (NotoGeo at width 75); the subtitle keeps one size per film.
  - Lens: stronger (pollar's station after Instagram's encode) and soft (the moved red and blue blurred
    outside the centre); EDGE 64 (no yellow slivers on paper glitches).
  - Nothing important under the like column below stage `L.lowY`: List lifts its block so the last row ends
    above 1080 and fits a lower row to `L.lowRight`; a Wire3D stack that reaches below 1080 ends every band
    at `L.lowRight`; Compare's baseline and Grid's big word end there too (Grid's word shrinks to fit).
    A pushed Phone's lower right still runs under the icons (a faded corner read as a hole in the screen).
  - Wire3D's `caption` is one line that shrinks (it wrapped a lone word); SplitFlap's reflection ends above
    stage 1240; the end card's mark and wordmark are drawn clean (text layer); its tagline shrinks at 720 px.
  - Grid's block and StripPlot are centred on the content box; the light Photo band starts at stage 370;
    a pushed Phone's top mask starts 10 px lower; the dark film's highlight dim is 0.12 (was 0.2);
    Notification bodies take three lines; the cover centres the film on frame 835 (the content box) and a
    Wire3D stack steps back to 0.9.

- 2026-09-24, third pass (the owner's rules 9, 11-13):
  - Layout: the content box runs to stage 1280 (`L.contentBottom`, frame 1330), its centre `L.contentMid`
    830; below `L.lowY` 1080 things end at `L.lowRight` 850. Phone: a 908 px window (65 % of the screen);
    Wire3D: the rect runs to 1220, stacked models get taller bands; Compare: baseline 1150, bars up to
    480 / 600; Squares: corner at (150, 1230); Grid: up to 560 px tall; LineChart: axis 1030, the label
    one line; StripPlot: axis 955, dots 17 px; Calendar: rows 94 / 80; Notification: a 640 px lock screen
    to 1270, the floating banner at 700; QRCard: the windshield 60 px lower, the plate at 1110, a taller
    page; MapPin: the car at 830; Wave: chips at 980; List, SplitFlap, EndCard, Stat: centred on 830
    (Stat's delta now under its number); SourceLine's default y is 1240; Photo's bleed to 1285.
  - Text: every scene's text is `className={TXT}` (the text layer, lib/layer.ts) and `mtav()`; List, the
    end card's tagline, QRCard's reasons and the LineChart label shrink to fit instead of wrapping.
  - Wire3D's design lines 1.6 / 1.25 px at 0.64 (1.5 / 1.1 at 0.55): they sat dim at phone size.

- 2026-09-24, second pass:
  - `Phone`: the dim cuts out the highlight's own box (x/w included, rounded like it), not a full-width
    band. `x`/`zoom` set the framing the Phone lands in, and so does a first `focus` key at `"0s"` (on
    the video's first scene also `at: 0`); a later `at: 0` is still a push on the first word. Every
    zoom is capped so the device's outline stays inside the Reels safe zone (x 70..1025 after the stage
    and the drift): at x 0.5 the cap is 1.449, and the Studio console warns which key was capped.
    `cropBottom: 0.8` hides a floating bar (05-customs' "პორტფოლიო" pill starts at 0.814).
  - `List`: marks, gaps and notes scale with `size` (k = size / 58); rows with `at: 0` on a later scene
    rise with its entrance, so a cut lands on the list, never on an empty field (their sound stays on
    the word).
  - `Grid`: cells up to 150 px (was 110). `Title` strips: the strip's left edge sits at frame 71 (it was
    58, outside the 70 px margin) and the widest strip ends at 1009.
  - `SplitFlap`: `laps`. `Wire3D`: one canvas per scene (Gotchas).
  - Subtitles: the hook's line is up on frame 0 when the voice starts within 1 s (the cover reads with
    the sound off).

- `Phone`: `focus[].zoom` (1..1.8) pushes the WHOLE device in like a camera (the UI is never sliced).
  A gentle push keeps the device whole (it slides down up to 40 px so its top stays at 360); a deeper
  push crops it under a soft mask that starts below the meta bar (360→420 px), so nothing ever draws
  behind the meta text, at any zoom and any focus y. `highlight` can be an array: the dim layer fades in
  once and the band slides from one highlight to the next (no flash). `tap` can be an array and `at`
  can be seconds ("1.0s"); `bright` (default 0.66) keeps light screens from flashing on the dark film.
  A Phone after the first scene lands on a picture (no draw-on, screen at 60 % on the cut frame).
- `Wire3D`: `move` is part of the framing (the model never leaves its box vertically, the marker label
  sits under the box); `flip` shrinks to fit 840 px. Specs no longer need a lower `fill` for `move`.
  No floor grid and no contact shadow any more (pure black field); the ground line and the wheel ticks stay.
- `Wave`: plays the sound of its recording while it listens (a knock on every spike for `pick: 0`, a
  fine tick per crest for 1, a swell per rise for 2), softer under the voice, silent in the last 12
  frames before the pick. Do not add manual knock cues; `sound: false` turns it off.
- `Calendar`: the ring's count and "დღე" appear only when the count starts (frame 0 never reads
  "0 days"); a mark off the countdown trail lands after the count (or at its own `at`).
- `SplitFlap`: flat drawing (no CSS 3D), blurred in-between cards, non-digit targets turn through blanks.
- `Title`: a line never wraps; the block shrinks until the widest line fits.
- `MapPin`: the city lines are brighter so frame 0 (the cover) reads at phone size.
- `Stat`: `landAt` (chunk) makes the count run under the voice and land on that word.
- `Compare`: the delta sits top-left, bars get shorter when there is a delta or title.
- First scene: everything with `at: 0` is already composed at frame 0 (thumbnail + loop point).
- `SceneCtx.speech`: the voice spans of the scene's beats, for scenes that make their own rhythm.

## Languages (ka / en / ru)

The app ships in Georgian, English and Russian, so every video can too.
1. `cp specs/<id>.json specs/<id>.en.json` (or `.ru.json`); set `"id": "<id>-en"` and `"lang": "en"`.
   Same-gender voice: Giorgi → `en-US-AndrewNeural` / `ru-RU-DmitryNeural`, Eka → `en-US-AvaNeural` /
   `ru-RU-SvetlanaNeural` (vo.py swaps a leftover Georgian voice by gender and says so).
2. Translate words only: `say` (same number of `|` chunks), `show`, `meta` and every text prop in the
   scenes. Never change numbers, `at`, focus, `src`, `tone`, `sfx`. en/ru `say` may keep digits. Russian
   `say` writes the brand in Cyrillic ("Винари"); `show` keeps "Vinari". No call to action in any
   language: the last line is the translated tagline. App wording: Vinari/Localizable.xcstrings.
3. A number that legitimately reads differently goes in `"translationNotes": {"beats[3].scene.body": "why"}`.
4. `node tools/translate-check.mjs <id>` must print ok (it compares every number and the structure).
5. `./make.sh <id>-en`. Real app screens inside `Phone` stay Georgian captures; Calendar, QRCard and
   StripPlot still draw a few Georgian words themselves (the lint warns).

## Every platform, covers, gallery, one-click page

Only the voiced 9:16 film is made by default. The rest only when the owner asks (disk space):
- `./make.sh <id> --formats` → also `out/<id>.4x5.mp4` (1080×1350), `.1x1.mp4`, `.16x9.mp4` (designed wide frame).
- `./make.sh <id> --silent` → `out/<id>.silent.mp4`: the same film without the voice (see Style).
- Every render writes `out/<id>.cover.png` (the designed cover, spec `cover`, 1080×1920) +
  `out/<id>.cover-4x5.png` (its centre 1080×1440, what the profile grid shows), and refreshes
  `out/index.html` (all videos, covers, subtitles, stale warnings). `node tools/covers.mjs <id...> | all`
  renders many covers from one bundle (about 2 s each). `node tools/cover.mjs <id> --plain` takes the
  film's own frame instead; `--light` writes `out/<id>.light.cover.png`.
- `./make.sh variants <id> [hooks.json] [--stills]`: hook A/B videos from `specs/hooks/<id>.json`.
- `./make.sh all [--missing]`: everything, one render at a time.
- `./make.sh app` (or double-click `Vinari Video.command`): a local page at http://127.0.0.1:4777 with one
  text box. It runs the `/video` skill headless (`claude -p`) and shows the finished video.
- Hooks: `HOOKS.md` (formulas, rubric, templates). The procedure: `../.claude/skills/video/SKILL.md`.

## Cloud studio (GitHub Actions)

Categories: `ci/categories.json` is the single source of the 12 feature categories (ids, Georgian labels,
allowed facts, never-lists, screens). The site (web/api/studio.js, web/studio.html) hard-codes the same ids.
Ideas never repeat inside a category: the brief lists every earlier angle, formula, opening, cover title and
quote of that category, and `--record` refuses a repeat.


vinari.ge/studio (web/studio.html + web/api/studio.js in the Vinari repo) dispatches
`.github/workflows/studio.yml` of peghe-b/vinari-studio, whose root is this folder. One run at a time
(concurrency "studio", `queue: max`), on `ubuntu-24.04` (pinned: ubuntu-latest moves to 26.04 from 2026-10-19;
move on purpose, after a test), a 150-minute job, with the owner's Mac switched off.
- **Flow**: **check request** (inputs checked; the typed topic and feedback are read from the event, never
  from the job's env, masked with `::add-mask::` and handed on through GITHUB_ENV; a second run of the same
  req stops here; the daily cap, below) → checkout, node → **brief** (`tools/ci/prompt.mjs` fills
  `ci/prompt.md`, writes out/ci/request.json; its pre-gate turns plain spam down with no model: a link, the
  same letter or word over and over, mostly another alphabet, or only invisible characters →
  out/ci/rejected.json, exit 4, the run ends here, before anything is installed) → python, caches →
  **setup** (`tools/ci/setup.sh`: zsh, npm ci, `requirements.txt`, Remotion's chrome-headless-shell) →
  claude token (cleaned, handed to the next step as a step OUTPUT, never GITHUB_ENV, so no later step or
  action sees it) → **script** (claude-code-action: first the gate, `ci/prompt.md` §0, only when a topic or
  feedback was typed: not about cars or Vinari; not fit to post, which includes fraud or evasion tips (mileage,
  hidden damage, bribes, fake papers, dodging customs, fines or cameras), a real person, plate, phone or
  address pointed at, a notice in the name of a state body or company; or orders to Claude, even next to a
  car topic → `node tools/ci/prompt.mjs --reject off_topic "<Georgian why>"` (in a redo this refuses the
  feedback, since the topic already made the base film; `--field topic` when the topic itself is unfit), last line `OFF_TOPIC`; else
  writes `specs/<id>.json`, `node tools/ci/prompt.mjs --record <id>`, `node tools/check.mjs <id>` until
  "ready to render") → claude error (on a failure: the result line only; a refused or expired token →
  `claude_auth`, the Max usage limit → `claude_limit`) → **gate** (fails the run when out/ci/rejected.json
  exists, the last line has the word `OFF_TOPIC`, or a typed request ended with no change under specs/ (a
  refusal in Claude's own words); then `tools/ci/resolve.mjs` must find this request's spec, so a missing
  one fails here as "script": nothing is voiced or rendered) → **voice** (`tools/ci/resolve.mjs` → id,
  `tools/vo.py`) → **render** (`VS_CI=1 ./make.sh <id>`: the film only; its own 110-minute limit) →
  **cover** (`tools/covers.mjs`) → package (`tools/ci/publish.mjs package`, also `thumb.jpg`, the cover
  360 px wide for the site's grid, optional) → four uploads → **publish** (spec + ledgers pushed back; the
  commit message is `studio <req>: <id>`, never the topic; the ledger line is rebuilt from its known fields,
  cleaned and capped). On a failure or a cancel (a time-out): "failure note" writes `$RUNNER_TEMP/error.json`
  and "upload error.json" uploads it.
- **The DATA markers** carry a code that is new on every run (`<<<TOPIC 3f9a0c1e` … `TOPIC 3f9a0c1e>>>`,
  FEEDBACK the same, and `<<<MADE …` around the earlier videos' lines), so typed text cannot close a block
  with a marker of its own. `clean()` (prompt.mjs) and `line()` (web/api/studio.js) strip the same things:
  NFKC, then every invisible character (format characters, the tag block, variation selectors, private use,
  unassigned, the Hangul fillers), controls to a space, runs of angle brackets or guillemets; the page's
  `plainText()` too, so the page, the API and the workflow agree on what was typed and on what "empty" is.
- **resolve.mjs checks the id against out/ci/request.json** (the brief writes it; the Claude step cannot): a
  redo's own id, or a new id that starts with `request.next` and is not already a spec on the branch. A
  Claude step talked into editing an older video's spec can never get it voiced, rendered or committed. The
  Claude step may not Write or Edit `specs/.*` (the ledgers are written by --record and next-theme only), and
  --record refuses an angle with `<`, `>`, a backtick, `§`, braces, `OFF_TOPIC` or a command in it.
- **Daily cap and goal** (the owner, 2026-09-25): at most 10 runs a day (the hard wall against spam; a
  refused or failed run counts too), and the site shows a goal of 3 finished films a day. The goal is
  the page's own; only the cap is enforced, twice: the site API (one /make at a time per instance, a real
  queue; a request that would wait over 8 s gets 503 "busy"; a dispatch in flight already counts) and "check
  request" (GitHub's total_count of today's `event=workflow_dispatch` runs; three tries, then the run stops
  rather than risk going past the cap; a full day writes error.json `daily_cap`). Only dispatches count:
  a fork's pull request that turns this file into a pull_request workflow creates runs under the same path,
  and the site filters them out as well. The site refuses plain spam itself (400 "spam", the pre-gate's
  rules) before it dispatches, so spam never costs one of the 10.
- **Idempotent requests**: the page makes the request id itself and keeps it for a retry after a lost answer;
  the API answers 202 again for a req it already started (never a second film), and "check request" stops a
  second run of the same req in any case.
- **Voice, cloud** (the owner, 2026-09-25: a video must always come out): each film voiced
  in ONE Gemini request (about 10 a model a day, four models). When every model is out of quota, edge-tts
  reads the film and vo.py's note says so (`"fallback": "edge"`); check says so and the brief tells Claude to
  carry on (no retries, no line changes to win Gemini back); the voice step goes on; publish.mjs writes
  post.json `"voiceSource": "edge"`, `"voiceModel": "ka-GE-GiorgiNeural"`, `"geminiOut": true` and a
  warning in the job summary. vinari.ge/studio then (API `gemini: {out, until}`: the newest finished film
  since the last reset at midnight Los Angeles, 11:00 Tbilisi, 12:00 in winter, had geminiOut or edge)
  shows a calm banner over the make button ("Gemini-ის ხმები დღეს ამოიწურა. 11:00-მდე ვიდეო Microsoft-ის
  ხმით გაკეთდება."), asks before every new video, redo or retry ("ეს ვიდეო Microsoft-ის ხმით გაკეთდება.
  გავაკეთოთ?", "გავაკეთოთ" / "დავიცდი"), and labels that film "Microsoft-ის ხმა" on its tile and sheet
  (every Gemini film is labelled with its model from post.json's voiceModel: "Gemini 3.8", "Gemini 3.8 Lite",
  "Gemini 3.1", "Gemini 2.5", so the owner sees how far down the chain the day has gone).
  Nothing is blocked. It all returns to normal at the reset, or as soon as a later film was made with Gemini.
  **Repo variable `STUDIO_NO_EDGE=1`** switches the fallback off (job env `VO_NO_EDGE`): vo.py then stops
  (exit 75, the note without "fallback"), check prints "VOICE_QUOTA ხმის დღევანდელი ლიმიტი ამოიწურა", the
  brief tells Claude to stop at once with the last line `VOICE_QUOTA`, the voice step fails on that note,
  error.json says `voice_quota`, and the site shows that failure as "დღევანდელი ხმები ამოიწურა" with its
  retry only after the reset.
- **The recipe**: `ci/prompt.md` (the brief), `.claude/skills/video/SKILL.md` (this repo's copy: facts,
  cover and post rules), `tools/check.mjs` (with VS_CI=1 it also demands "post" and "cover", the asked
  voice, a redo's original look, the recorded request, and no pinned "geminiModel").
- **Contracts the site reads** (never rename): run-name `studio <req> <meta>` (the site seals the topic in
  meta.t with a key only Vercel has: the run list of this public repo is public); the steps named setup,
  script, voice, render, cover, publish, in that order and used by no other step; single-file artifacts
  `video.mp4`, `cover.png`, `post.json` and the optional `thumb.jpg` (archive false, 2 days, `name` = the
  file name so a re-run can overwrite); post.json {req, id, topic, category, description, tags, theme,
  seconds, title, voice, voiceSource ("gemini" | "edge"), voiceModel, geminiOut} (the site's
  RUN.voiceSource); on a failure only `error.json` {"code": "off_topic", "reason", "field"} (the gate or the
  pre-gate refused the request; the site shows its own fixed text, never the reason; the optional "field",
  "topic" or "feedback", names the typed text that was refused: the pre-gate knows it, Claude gives it with
  `--field`; a refusal without one names the feedback in a redo that has one, else the topic, or the feedback
  when only that was typed), {"code":
  "daily_cap"} (check request found the day full), {"code": "claude_auth"} / {"code": "claude_limit"}
  (the Claude token refused, the Max usage limit reached: the site shows the reason and offers no retry),
  {"code": "voice_quota"} (STUDIO_NO_EDGE on) or {"code": "failed", "step": "<contract step>" | "timeout"}
  (the site's RUN.error is one of these codes, "failed" or null; an edge-tts note never makes a failure
  "voice_quota"). "brief", "gate", "claude token", "claude error", "failure note" and the uploads are not
  contract names. The ledger
  `specs/.studio.json`, req → {id, topic, base, at, category, angle, hook[, features]}, is written by
  `node tools/ci/prompt.mjs --record <id> --hook <Hnn> --angle "<one line>"` and committed back to main
  with the spec and `specs/.themes.json`. The id always comes from that ledger.
- **Knobs**: repo variable STUDIO_NO_EDGE (unset = the edge-tts fallback, the default; `1` = stop instead),
  passed as job env `VO_NO_EDGE`; secrets CLAUDE_CODE_OAUTH_TOKEN, GEMINI_API_KEY; repo variables STUDIO_MODEL (default
  claude-opus-5-5), STUDIO_GL (swangle), STUDIO_CONCURRENCY, STUDIO_DAILY_CAP (default 10; keep it equal to
  the site's). The voice cache travels by actions/cache.
- **Guards**: "check request" refuses a run when the cap was already started that Tbilisi day (the site
  counts too, but only per Vercel instance). Checkout takes the branch tip, so a queued run sees the run
  before it (so push a change to the workflow or the brief scripts only while no film is queued or running:
  a queued run keeps the old YAML but checks out the new scripts). The topic is typed on a website: the
  Claude step may write only `specs/**` (not `specs/.*`) and run only next-theme, `ci/prompt.mjs --record`,
  `ci/prompt.mjs --reject`, check, build-index, vo.py and ls (no /proc, no .git). A new
  command in `ci/prompt.md` must be added to `--allowedTools` in studio.yml too.
- **Test on the Mac** (no GitHub, Claude or Gemini): `tools/ci/rehearse.sh <id>` runs voice → render →
  cover → package → `publish --dry-run` for an existing spec, with a made-up request in a temporary
  ledger (`STUDIO_LEDGER`) and Gemini on a dead address; `STUDIO_REQ=r-test01-abcd node tools/ci/prompt.mjs`
  prints the brief (then delete out/ci/; exit 4 with out/ci/rejected.json = the pre-gate refused the topic).
  Only a real run proves the Claude step, its gate and the Linux render time.
  The site on this Mac: `node scripts/studio-dev.mjs` in the Vinari repo (a pretend GitHub; a topic with
  "fail" fails at render, one with "quota" at voice with error.json `voice_quota`, one with "offtopic" or
  "კატა" at script with error.json `off_topic`, "claudeauth" / "claudelimit" at script with
  `claude_auth` / `claude_limit`, "dailycap" before setup with `daily_cap`, one with "edge" is read
  by Microsoft's voice and turns `gemini.out` on; `STUDIO_DEV_RESET_MIN=5` puts the pretend reset 5 minutes
  out; `POST /__gh/_token?bad=1` expires the token, `POST /__gh/_forkpr` adds a fork's pull_request run).
