# Gotchas and verified pitfalls

> Moved out of CLAUDE.md on 2026-10-26 (plan step 2.5: the cloud context slimmed to the rules). Nothing here was
> dropped. Section names in the text (Voice, Style, Motion, Sound, Story moments, The ending, Cloud studio ...) and
> "rule N" point to the other files of docs/ (CLAUDE.md's map says which); the linters named here still enforce them.

## Gotchas

- Everything animates from `useCurrentFrame()`; no CSS animations, no `Math.random()`.
- A text-layer element (`TXT`) inside a faded or masked copy can come out opaque: SplitFlap's mirrored reflection drew its
  falling halves (card and glyph together, `TXT`) as solid grey blocks on every other frame of a flip on the light look,
  and tools/flicker.py stopped the render (demo-lesson-brakes-v96, 230 -> 155, 2026-10-12). The reflection now draws only
  the standing cards. Keep a `TXT` element out of any copy that relies on its parent's opacity or mask.
- three.js needs a real GL backend: `--gl=angle` on the Mac, `swangle` (software) on a GPU-less Linux
  runner. `tools/platform.mjs` picks it for every tool and make.sh (remotion.config.ts mirrors it).
- The Mac uses the system Chrome (`--chrome-mode=chrome-for-testing`) to save 200 MB of disk; Linux uses
  Remotion's own chrome-headless-shell (`npx remotion browser ensure`).
- If edge-tts starts failing with 403: `python3 -m pip install --target tools/pylib -U edge-tts`.
- A Gemini voice reads its key from env `GEMINI_API_KEY`, else the first line of
  `~/.config/vinari/gemini.key` (env `GEMINI_KEY_FILE` points elsewhere). The key is never printed.
  The free daily quota is small (Voice, above): one request per film, one more (the whole film) whenever a line changes.
- A parallel render (concurrency 3) now and then drops a layer or writes a corrupted, tiled frame on a
  single frame (seen in v1, v3 and v6). `make.sh` runs `tools/flicker.py --threshold 0.7` on every render
  (`VS_FLICKER_THRESHOLD`; flicker.py's own 0.8 let a Wire3D frame with missing thin lines through at
  0.80) and renders again with `--concurrency=1` when it finds one. A frame flagged again in that render
  and flagged at least as high in the parallel one rendered the same twice: it is the film's own motion
  and is accepted (a Notification's buzz shakes the phone every frame: 0.66 on the dark film, 0.8 on the
  light one). Any other survivor stops the build. **In the cloud the second pass is capped** (the owner, 2026-10-12: a 20 s
  film sat 60 minutes in "render": software GL makes one-at-a-time about `concurrency` times the first
  render): it runs only when first render × concurrency fits `VS_RERENDER_MAX` seconds (600 under VS_CI,
  no limit on the Mac) and under `timeout` there; otherwise the parallel render is kept and the run
  carries a `::warning::`. Check any mp4 with
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

- Reminders: 09:00 (the default morning time; settings move it between 06:00 and 12:00) fires on every
  step (7, 3, 1 days and the day itself), but the **19:30 repeat fires only 1 day before and on the day**
  (Vinari/Core/VNCalendar.swift ~452), and it can be switched off. Never put "09:00 · 19:30" over the
  7- and 3-day items.
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
