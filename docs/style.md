# Style, motion and sound

> Moved out of CLAUDE.md on 2026-10-26 (plan step 2.5: the cloud context slimmed to the rules). Nothing here was
> dropped. Section names in the text (Voice, Style, Motion, Sound, Story moments, The ending, Cloud studio ...) and
> "rule N" point to the other files of docs/ (CLAUDE.md's map says which); the linters named here still enforce them.

## Style (see src/tokens.ts)

The owner's rules (2026-09-24): a clean field (pure black, or a neutral light paper, alternating video
by video), a sharp picture with pollar's lens fringe on the graphics only, everything inside the
Instagram Reels safe zone, and no call to action.

- **Field**: the dark film is pure black `#000` (`C.bg`); the light film is a neutral paper `#F3F3F3` (Light
  theme below). No gradient, no grid, no vignette, no 3D floor grid, no
  decorative background lines (lines that ARE the content, map streets or chart axes, stay). `C.bgCenter`
  and friends are `#000` too, for the scenes that use the field as a knockout. Colour only carries data
  (green good for the viewer, red costs the viewer), no blue; the one exception is an object's accent (Object accents).
- **Colours** (the owner, 2026-09-24: the whites read bluish, the red and green did not read as red and
  green): every white, grey and surface is neutral, R = G = B. Dark film: ink `#F5F5F5` (19.3:1 on
  black), ink2 `#8A8A8A` (6.1:1), ink3 `#7C7C7C`, rule `#5E5E5E`; green `#1FD14F` (10.3:1) and red
  `#FF2A2A` (5.6:1), the same for lines and text. Light film on `#F3F3F3`: ink `#0B0B0B` (17.7:1), ink2
  `#6A6A6A` (4.9:1), ink3 `#858585` (3.3:1, quiet mono only), rule `#A0A0A0`; green text `#0B7F2D`
  (4.6:1) / line `#0F9B37` (3.3:1: strokes, fills, big numbers), red text `#D60000` (4.9:1) / line
  `#E01B1B` (4.4:1). Small text takes `toneText`; a big number or word (about 40 px and up: Stat, a landed
  flap, Calendar's count, Squares, Wire3D's flip and tag, a toned Title line or strip) takes `toneBig` (= the
  line variant), so the light film's big greens are the vivid `#0F9B37`, never the forest `#0B7F2D`. The
  brand SVGs are `#F5F5F5`. The cover stays black and white (src/cover: everything in grey, COVER_COLOUR).
- **Object accents** (rule 25; the owner, 2026-10-12): the field, the texts and the cover stay black and white; OBJECTS
  may take the film's pair, `C.accA` (`a`, the attention colour) and `C.accB` (`b`, its quieter companion), set once per
  render by `setAccents(filmKey(id), spec.accent2)` in Promo (after setTheme, before setMono). Dark values on black, deeper
  ones on paper (at least 3:1): cobalt `#4D7CFE` / `#2D5BDB` + amber `#F0B25A` / `#B57A12`, ember `#FF7B3A` / `#D9561A` +
  steel `#8FB8E8` / `#4A78B0`, saffron `#F5B731` / `#B88300` + lavender `#A68CF2` / `#6E4FD0`, aqua `#33C2DB` / `#0F8BA6` +
  ochre `#E8B65E` / `#A87A1E`, violet `#9B7BFF` / `#6A45E0` + gold `#F2C14E` / `#A87C00`, copper `#E0915A` / `#B5622A` + sea
  `#7FB2C9` / `#3E7B94`; no pair is a red or a green (the data colours keep their meaning). A film before 94 and
  `"accent2": "none"` stay grey (`accentsOn()` false: every scene draws as before). The `Tone`s `a` and `b` reach every scene
  that takes a tone: `toneLine('a')` is the accent (a line, a ring, a fill, a lamp), while `toneText` and `toneBig` answer the
  ink for them, so a word never takes it; the kit's `accent('a')` and `acc('a')` too. Paint a part in steps of
  `accRamp(col, n)` (palette.ts: 3 the colour, lower lit, higher shade), never a flat fill: the car's accent paint is muted
  14 % toward its grey and a step deeper on the black film (a lit accent body on black read as a toy, a deep metallic as a
  car). One or two accented things a shot, the same pair all film. `setMono()` (the cover) turns both grey, and the cover's
  picture is grey anyway. Film scenes: the template's Colour rule. A Photo highlight in `a` / `b` shows the part in the
  photo's OWN colour inside the accent frame (its `fill` defaults to "photo"; printed in the accent it was a flat orange slab
  over a brake caliper, demo-lesson-brakes-v96); a data tone keeps its print.
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
  y 345 (the meta bar).
- **Pictures** (the owner, 2026-10-06, after the first stories samples: "100x better than before", but not "the hard
  crop band at the top and bottom of the pictures"; on the subtitle: "neither shadow nor outline; as it is now is good;
  if the text sometimes does not show, that is fine"). **FULL BLEED**: a picture scene fills the whole 9:16 frame edge
  to edge, no crop line and no fade (rule 19). The rule lives in the scene registry (src/data/scenes.json `"bleed"`:
  always for the illustrated scenes and Split, by props for Photo bleed / cover, PhotoStory bleed / depth, a Twist with
  a photo, a KineticHeadline or BigNumber `bg`, a Film with `"look": "illustrated"` or `"bleed": true`, a Callback as
  its hook); src/lib/bleed.ts reads it, Promo marks each shot, provides `BleedCtx` to the scene (PictureBand cuts
  nothing, a photo's view is `BLEED_VIEW`). The meta bar stays exactly as it is over a full-bleed shot (the owner,
  23:50 the same night: "do not hide it; if it sometimes merges into the picture, fine"): Promo's `META_HIDE_ON_BLEED`
  is off, MetaBar's `hide` spans stay for a later switch. The view is stage x 0..1080, y `L.bleedTop` 16 ..
  `L.bleedBottom` 1872 (frame -54..1134 x -60..1981): the frame and a margin the band camera never uncovers; an
  illustrated scene draws its ground, road, wall or roof liner from `TOP` / to `FOOT` (src/scenes/illo/scene.tsx: 160
  px past those, for a near plane's parallax), never a band that ends on a line inside the frame. The SUBTITLE IS NOT
  TOUCHED: the same line, the same place, no shadow, no outline, no box, on the picture; since 2026-10-07 only its
  colour turns white over a dark picture or ink over a light one (Subtitle line, below). What sits on the picture keeps its place in the safe zone, anchored to the
  old band (`L.graphicsTop` / `L.graphicsBottom`): a PhotoStory's name strip and kinetic lines (their scrim is a soft
  band behind the lines that lets go just past stage 1380, so the photo never washes out at its foot), Split's chips
  and years, a Photo's caption lines (on a small knockout), and the photo credit (lower left, mono 18 on its knockout,
  frame 1436 at its foot). A PhotoStory print or window and a Photo plate are whole objects on the clean field (the
  meta bar stays). A full-bleed photo is blown up more than the band did (a 1 067 px tall photo about 1.8 times: the
  grain hides it at phone size). **The fit** (the owner, 2026-10-07: v79's wipe kept 21 % of a 4:3 tractor and 15 % of a
  1.86:1 car, "you cannot make them out"): a photo bleeds only when covering the box it fills keeps at least 60 % of its
  width (or height) and it is not small (stories.mjs `tooSmall`): the box is the 9:16 frame (Photo bleed / cover,
  PhotoStory bleed / depth, Twist, a `bg`, Split slide), half of it (Split wipe: in practice never) or the two panels
  (Split stack: wide boxes, so most landscape photos fill them and a portrait does not). So a portrait (up to 15:16)
  bleeds; a square, landscape or small photo is drawn WHOLE at its own aspect
  on the clean field instead, by the scene itself, old specs too: PhotoStory a plate (`wholeView`, up to 920 wide inside
  the picture band, a hairline, a gentler push; depth keeps its parallax in it; a window its 4:5 crop would cut under
  60 % too), Photo its frame plate, Split the pair (a alone and big, then one above the other or side by side with their
  chips; b comes in by the staging's wipe, rise or slide), a Twist and a KineticHeadline / BigNumber `bg` a plate behind
  the same veil and words (blown up behind text it was grey texture; whole, the car reads around the letters). The
  numbers live in src/data/scenes.json `"_fit"` and each scene's `"fit"`; src/lib/bleed.ts (`photosFit`, `bleedOf`)
  and tools/ci/stories.mjs (`fitsBox`, `photoShape`, `photoNotes`) read the same ones, so BleedCtx, the meta bar logic
  and the subtitle get the real outcome, the brief marks each story photo tall, wide or small, and check / `--record`
  NOTE (never refuse) the shots drawn whole. The cover
  (src/Cover.tsx) shows a story photo as polaroids of the photo files themselves (Spec, `cover`); it never shows a frame
  of the film (2026-10-26).
- **The clean field's band** (the owner, 2026-09-27; data scenes and app pictures since 2026-10-06): Phone's window,
  the QR page, the map, the lock screen, a Timeline and a diagram Film end at `L.graphicsBottom` (stage 1380, frame
  1440, 37 px over the subtitle's letters) and a picture cropped at the top is cut at `L.graphicsTop` (stage 370,
  frame 329). **No soft fades** at a picture's top or bottom: a clean, hard edge (a crop) or a whole object. A caption
  under a picture ends at stage 1300 (frame 1352; at 1440 it reads as a second subtitle line) and the
  picture is cut over it; the content box itself (charts, lists, titles) is unchanged. Text and SVG re-rasterise at
  the final size; Wire3D renders its canvas at dpr `STAGE.s`, so thin lines stay one sharp line.
- **Meta bar**: frame y 268 (caps at about 274..296), from x 78 to 1002, the content box's edges; mono,
  its Georgian in Mtavruli, outside the lens. It stays over a full-bleed picture too, with no band behind it
  (Pictures, above).
- **The line builds word by word** (the owner, 2026-10-22, after a demo; every film, old ones too): the whole line is laid
  out once (its size, its place, never wrapped), and each word pops in one frame before it is heard (`WORD_POP`: about
  70 ms of fade and a ~14 px rise easing out over 100 ms), so the words already up never move; the same clean line, no
  stroke, shadow or box (he refused an outline). The hook's line is still up WHOLE on frame 0, a silent film's line still
  comes whole, a swap starts the next line with its first word, a pause's fade-out stays, and a bleep's „#@%" (with the
  rest of its word) is laid out from the start and pops with the bleep, so the line never shifts. The times come from
  tools/vo.py, the chunk's `"words"` (one start per whitespace token of the SHOWN text): edge-tts reports every word; a
  Gemini take reports none, so its words are placed in the chunk's own span by their letters (`word_weight`: a vowel 1.6,
  any other letter 0.8, a digit or a sign said as a word 3, a word 1 more, the chunk's last word 2 more; fitted on the 265
  cached edge-tts clips against their real word boundaries: 58 ms mean error, a plain letters + 4 a word 133 ms, all late),
  and a pause of 150 ms or more inside the chunk (a comma's breath) pins the word after it when the words on both sides
  keep a voice's pace (52 ms, 89 % within 100 ms). Shown and spoken words differ („4 000 ₾" / „ოთხი ათასი ლარი"): by
  index when the counts match (a sign said as a word counts), else the same words pin each other and the rest share their
  stretch in proportion; „—" or „·" comes with the next word. A timeline without `"words"` (older, recorded) is placed by
  the same letters in layers/Subtitles.tsx (`letterStarts`). `python3 tools/vo_test.py` checks the words on the mock's bursts.
- **Subtitle line**: centred on frame (510, 1500) (`L.subtitleY`; it was 1340 with ~300 px of nothing
  under it), in the free band over the username row: the Mtavruli letters span about 1477..1520 at 58 px,
  147 px under the content box and 148 px over the username row. At most 754 px wide (133..887), one
  line that never wraps, a plain clean line outside the lens (on a full-bleed picture too: no shadow, no outline,
  no box, the owner 2026-10-06; from v113 the frame guards give it a soft plate where the picture under it would
  swallow it, and keep its band clear: rule 29). One size per film (layers/Subtitles.tsx
  `filmSize`): the size at which 80 % of the film's lines fit (58 px, never under 50), so the line does not
  jump in size; only a rare longer line shrinks on its own (condensed Mtavruli: 11 of 133 lines of v1-v12,
  the smallest 54 px). The lower block's own centre
  (478) looks 62 px off wherever the Reels UI is not drawn (a gallery, a chat, 16:9); 510 reads centred
  with and without it. The 16:9 frame (Wide.tsx, Promo `ui="none"`) centres it on (540, 1420)
  (`L.subtitleYWide`), closer under the picture. (tools/formats.mjs's 1:1 crop cannot hold the meta bar
  and a line at 1500 in 1080 px: its crop window cuts both ends; 4:5 fits.) **Its colour follows the picture under it**
  (the owner, 2026-10-07, on v81, a light film's black line on a dark ship photo: "when there are frames like this,
  write the subtitles in white"; still no shadow, outline or box): make.sh runs `tools/subtone.mjs` before the render.
  It samples the film every 5 frames at 0.25 scale with the line hidden (Promo's `subProbe`; a bar on the frame's top
  edge gives the line's own width and says a line is up) and measures the pixels under the line: a NEW line takes white
  (`SUB_TONE.white`, the dark film's ink) or ink (`SUB_TONE.ink`, the light film's), whichever contrasts more with most
  of them (4.5:1, so the boundary is a mid grey; the theme's own colour stays unless the other reads on 20 points more);
  a line on screen KEEPS its colour while it still reads (3:1 on half its box), so it changes mid-line only when a cut
  or a photo sliding in under it would make it vanish, on that very frame. A colour that holds under half a second
  (a flash, a glitch, a whip) is ignored. The result is a track of [frame, colour] (out/<id>.subtone.json), embedded by
  build-index only while the spec and the timeline it was measured on are unchanged and only in that look; the silent
  line is measured at its 66 px, the 16:9 line at its own place (`wide`). No file (an old render, the probe failed or
  passed its 600 s budget, `VS_SUBTONE=0`) = the theme's ink as before; the probe never stops a film. About 25 s for a
  36 s film on the M1 (one bundle, `renderFrames` with the frame list, about 0.1 s a frame); `node tools/subtone.mjs <id>
  --debug` prints a sample map and keeps the frames in out/subtone-<id>/, `--test` is the self-test.
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
  `note` ("VINARI+" after a film that showed paid features). The tagline is a short punchline or callback in plain
  Georgian (≤ 5 words, ≤ 26 characters, one line of at most 720 px), spoken as the last line (HOOKS.md §3: since 2026-10-06
  never an aphorism; the owner likes these endings). No store line, no badge, no call to action (a spec's old `line` is
  ignored). It never freezes: a slow push-in, one soft light across the mark, a hairline that keeps
  drawing. A `|` in the tagline breaks it into two lines of one size (the follow reminder is longer than a
  quote: at most two lines of 34 characters); a tagline without one is the single line it always was.
- **App screens** (`Phone`): clearly visible (the owner, 2026-09-24): big enough to read at phone size,
  bright, the element the voice talks about pushed in and highlighted. Never a dim grey slab: do not
  lower `bright`, and a highlight's dim must leave the rest of the screen readable.
- **A highlight follows the element's own shape** (the owner, 2026-10-19, on a small-radius box round the black pill
  „ჩამოტვირთვა · ~97 MB": "the corners don't follow it, it is ugly, it doesn't sit well"; slides, covers and films alike):
  every outline, band, veil window and lifted card round an element of a real capture is CONCENTRIC with it: its inner
  edge an even gap off the element all round (16 capture px at most, less where a neighbour is close, never touching or
  clipping it), its corner radius the element's own plus that gap (a pill gets a pill, a 24 px card 24 + the gap), one
  stroke width. src/lib/outline.mjs `ringOf` finds the element under the spec's box in the capture's own pixels (a fill, a
  bordered or dashed card, a switch, a gradient card; the box is only a hint and may be loose) and its corner radius;
  a row with no shape of its own (a row of a grouped list, a line of text in a card) keeps the spec's box with 28 px
  corners, brought inside the card it sits in. The spec may help: a highlight's (or a step's `row`'s) `"r"` (the element's
  corner radius in capture px, or `"pill"`), `"snap": false` (the box as given), `"gap"`. From v113 (`outlineOn` =
  `kitOn`) on the flat Phone, the 3D Phone (the stroke drawn outside its box in the shader) and the loupe; the kit's
  StepShot and `useRow` (src/scenes/kit/explain.tsx: the window and the Lift card, `rCap`) always. The cover is the film
  frozen, so it follows. Films up to v109 render as made. Stills: out/stills/demo-outline-v110-*-full.png (a pill, a card, a
  grouped row, the lifted card, the loupe). The loupe staging (src/scenes/staging/phone.tsx `RingLoupe`, from v113, the
  reviewer 2026-10-19: the round loupe clipped the pill and its outline mid-word, its source circle cut the words under it):
  the element's own outline on the device (no circle), a box concentric with it holding the whole element and its outline,
  beside the device (under it when the element would not grow there), two lines from the device's side, never over the
  screen. The Story slides (src/slides/) measure every outline's gap again on the capture's own edges and refuse one that is
  uneven by more than 3 px (tools/ci/slides.mjs), keep the ONE gap (8 px) wherever there is room, and draw no tap ring on an
  outlined element.
- **App screens, 3D phone** (rule 27; src/scenes/three/phone3d.tsx, from `PHONE3D_FROM` 94, src/lib/device.mjs `phoneMode`):
  an iPhone 16 Pro's proportions in three.js, one WebGL canvas in the lens layer (Wire3D's rule), drawn at the pixels it
  covers (dpr `STAGE.s`). The display is the capture at its full 1080 x 2346, sampled 2x2 a pixel (sharp text, no
  shimmer), untouched by light, tone mapping or colour conversion; the band, its veil, the tap rings and a faint glass
  sheen are drawn ON the display in its shader, so they turn and push with it and stay aligned. The frame's light is a
  procedural studio (softboxes, rim strips, a room black on the dark film and pale on paper) baked into a PMREM once a
  scene: no lamp, no file, no randomness. A 26 degree lens looks straight ahead; the phone turns a little (its left side,
  away from the like column), leans back and floats on slow sines, and faces the viewer while a band or a push is on, so
  the row reads flat. `focus` pushes in exactly as on the flat device (the same zoom units, the safe-zone cap, the top
  cropped on a clean line under the meta bar, `cropBottom` cut level). Promo's 1 % drift leaves it alone (a CSS scale
  would resample the screen's text) and the planner never pre-rolls it (tools/ci/fx.mjs `webglOf`). Stills:
  out/stills/demo-phone3d-v94-*-full.png (`tools/stills.mjs <id> <frames> --dark|--light --full` renders 1080 x 1920 to
  judge the screen's text).
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
  makes it that spec's default): the app's own light look, two of every three new videos (next-theme). It is a token
  swap: `setTheme()` (tokens.ts) swaps the whole `C` table and the `THEME` knobs before anything renders,
  and every scene reads `C` at render time. Light values are the app's (Vinari/Design/Tokens.swift light)
  made neutral (Colours above): paper `#F3F3F3` (never warm beige, never bluish), ink `#0B0B0B`; cards
  and tiles are white surfaces. No pure black anywhere: a neutral Title strip is a white card with ink text, a picked chip is
  an ink pill, the island is ink. Real screens play at their natural brightness (Phone ignores `bright`),
  fading up from the paper; the dim around a highlight is a paper fog. Coloured glows drop to a whisper
  (`THEME.glow` 0.3), the Wire3D lines are ink (the pen's additive glow is off), the end card's mark and
  wordmark are ink (the brand SVGs through a filter on the same `<Img>`), subtitles are ink with no glow (white
  over a dark picture: Subtitle line).
  The lens on paper: the same fringe (red and blue around the dark lines). A new scene: take every
  colour from `C` (or `rgba(C.x, a)` / `halo(color, a)` from tokens.ts), never a literal.
- **Debug overlay**: input prop `{"safe": true}` (`--props`, the Studio's props panel) or env
  `REMOTION_SAFE_OVERLAY=1` in a CLI render draws the safe zone (red), Instagram's measured UI (red
  boxes: the icon column, the username row, the caption), the stage content box (dashed, its lower right
  cut at the like column) and the subtitle box. `tools/stills.mjs` does not pass props yet (`./make.sh <id> --light --still N`
  does not work either: `--still` must come second, `./make.sh <id> --still N --light` does).

Springs are the app's SwiftUI
springs. Hard cuts between scenes with a soft breath of air; every scene drifts slightly (a film without the motion
layer; with it, Motion below). A later
scene starts its entrance `CUT_IN` (10) frames before the cut (`entrance(ctx)` in common.tsx), so a
cut lands on a picture, never on a dip to black: Phone, QRCard, Notification, SplitFlap, EndCard,
Wire3D (the pen is already drawing), and the frames of Compare, Grid, List and Title use it. Items
with `at: 0` still wait for the first word (about 3 frames after the cut).


## Motion (the owner, 2026-10-06: "the same trails every time, the graphics not animated, no camera movement; the openings and endings more creative and powerful")

A film from `ci/fx.json` "from" on (and any spec with `"fx": true`; `"fx": false` or env `VS_FX=0` turns it off,
`VS_FX=1` forces it for a rehearsal) gets the motion layer. tools/ci/fx.mjs plans it once, deterministically, before the
render (build-index embeds the plan, writes `out/<id>.fx.json`; `node tools/ci/fx.mjs <id>` prints it); a film without it
renders exactly as before (checked pixel for pixel on v1, v8, v11 and demo-photo).
- **Camera** (src/lib/camera.tsx): every shot moves from frame 0 and never stops (push, pull, drift, rise, arc on
  `ease.drift`), with impact KICKS on its events (a punch word, a number landing, a twist, a Film's `hitAt`), a handheld
  breath on story photos, and the velocity a transition carries in. Classes (src/data/scenes.json `"cam"`, read by the rig
  and the planner alike): `band` (the camera inside the picture's clip:
  a Film's PictureBand, PhotoStory, Split, Timeline, Twist, Callback and the illustrated scenes; the band's edges, or on
  a full-bleed picture the frame's, never move), `free` (the whole
  scene, at most 1.2 %: Title, Stat, List, Compare, Grid, Squares, SplitFlap, KineticHeadline, BigNumber; text never
  shakes), `self` (exactly the old 1 % drift: Phone, whose safe-zone maths inverts it, Wire3D, the maps and cards, Photo,
  EndCard). Budgets in tokens.ts `MOTION`. A Film scene puts its planes in `<CameraLayer depth>` (0.6 background, 1
  subject, 1.3 foreground: parallax), its labels in `<Hud>`, and never pushes its own camera (old Films that do keep
  the old drift); important things inside `L.camSafe`.
- **Transitions** (src/lib/fx.ts): cut, glitch, whip, push, match, pull, stack, wipe, flash, crash, dip, at the voice's
  own cut frames (the outgoing shot plays on muted for a few frames, the incoming one is shown frozen on its frame 0
  before its cut; nothing moves in time). The planner: never the same twice in a row, at most 2 glitches (the lens on 4
  of 5 cuts is gone), at most 3 flashes 60 frames apart (white on the dark film, an ink dip on paper), one crash, into a
  Twist; whips, pushes and matches in the first 6 s, cuts, wipes, stacks and pulls in the middle; a Phone only takes a
  cut, a glitch or a flash; a 3D shot is never pre-rolled. Each has its own sound instead of the cut's air. A spec may ask
  for one: a scene's `"transition"`. Phase 2 (src/lib/p2.mjs) refuses every cut that holds two opaque shots at once,
  except the GL transitions a spec asks for (src/lib/gltrans.mjs, after the MIT gl-transitions collection): gl-softwipe,
  gl-inkbleed, gl-squares, gl-gridflip, gl-windowslice, gl-radial, gl-crosszoom. A shader draws the frame's MASK with
  WebGL 2 (ANGLE on the Mac, swangle on a runner; a CPU twin without WebGL), the incoming shot takes it as a CSS mask, the
  outgoing its inverse, both layers alike, and three draw an ink hairline on the edge. Only between pictures (never a
  text-heavy shot, the hook's first 2 s or the EndCard), 3 a film, each type once, 5 s apart, 8-14 frames; the planner
  never picks one by itself, p2lint's GL_* codes and the planner's notes say why one was refused; tools/gltrans-stills.mjs
  and the p2 check prove them. Two only the aura drop places: `fade` (a soft cross-fade between the hurt's shots) and
  `drop` (the hit into „არაუშავს!": the outgoing gone at once, the incoming at the full 1.36x ON the cut frame, slamming
  to 1x in about six frames with a damped shake, overbright and oversaturated, with its own WHITE flash on both looks (the
  plan's `"tone": "white"`: on paper an ink dip only faded the drop up from grey), lens tear, camera kick and
  `asmr-drop`; no other flash within 60 frames); after the drop the drive's first 5 s take the hook's energetic cuts and a
  livelier camera.
- **Openings** (`"opening"`, else the planner picks one that fits scene 0 and differs from the category's last two):
  `cold-punch` (KineticHeadline, or PhotoStory with lines), `rewind` (BigNumber rewind), `photo-slam` (PhotoStory print or
  bleed), `mark-subject` (PhotoStory with a `ring`), `question-slam` (KineticHeadline slam ending on "?"), `classic`.
  Frame 0 stays a composed picture (the cover, the loop point) and is already moving; the first event by 0.6 s.
  photo-slam is a real hit (2026-10-06, its old 8 % settle read as a still photo until the name strip at 1.4 s): frame 0
  is the photo at 1.24x, it slams to 1x on an expo-out (most of it by frame 3), the camera kicks as it lands, a shutter
  and a felt land sound it (the plan's `openSfx`). `aura-drop` (rule 23, HOOKS.md H21, tools/ci/aura.mjs; never picked by
  chance): planned by itself when a beat says `"drop": true` (or `"opening": "aura-drop"`, or, from ci/fx.json `auraFrom`,
  the ledger's H21 / H22 with an „არაუშავს" beat): the shots before the drop are the hurt (camera `grade: "hurt"`: grey,
  dim, cold, a CSS filter on every camera layer, the Hud's words clean; `curve: "linear"`, a slow even push or drift; no
  kicks; `fade` between them; the last one's `inhale`, from the hurt's last word to the cut (12 to 36 frames), pushes in
  8 % on an accelerating curve and darkens to half the light), the drop beat's shot takes
  the `drop` cut, and the plan says `"drop": {beat, shot, at}`. A self-class scene (Photo, Phone) takes no grade, so the
  hurt never shows one (AURA_DROP).
- **Endings** (`"ending"`): `card` (the end card, a dip or a cut into it), `stamp` (the last picture freezes under the card,
  its words gone, the grain still moving), `loop` (as stamp, then the last 12 frames push into the hook's frame 0: a
  seamless replay; only after cold-punch, photo-slam or rewind, never on a follow film), `callback` (a Callback scene
  before the card). The stories category defaults to stamp or loop, never its last film's; feature films to card. Stamp,
  loop and callback only freeze a PHOTO under the card (Photo, PhotoStory, Split, a Twist with `src`, a Callback of a
  photo hook): a film whose last shot is drawn (a Film, a BigNumber, a Timeline) ends on the clean card, and the frozen
  photo is blurred and dimmed so the mark and the tagline read.
- **Text** (src/lib/textfx.tsx `<Words>`): mask, slam, blur, stack, strike, type, decode; "*word*" punches.
- **Pace**: `beat.cuts: [{chunk, scene}]` starts a new shot on that chunk of the beat (no extra voice pause): a story
  cuts every 1.8 to 3.5 s.
- **Checks**: check.mjs adds a "first 1.5 s" row to the sheet and warns STATIC (a shot that hardly moves), SLOW_OPEN (no
  EVENT in the picture band by 0.6 s, or none between 0.6 and 1.5 s: half-size stills every 6 frames, an event being new
  edges farther than 20 px from the last still's, or a jump in brightness; a drift, a breath or a Ken Burns push is not
  one),
  FX_BUDGET, MOTION_REPEAT (an opening, ending or first cuts of the category's last films) and MOTIF_REPEAT (a Film that
  draws a route on again, pushes its own camera, or leans on three of the old motifs); every planned flash and glitch is
  on tools/flicker.py's allowlist (`--allow out/<id>.fx.json`, make.sh passes it). TikTok's safe area (tokens.ts
  `SAFE_TT`, provisional until measured on a posted TikTok) is a dashed line on every tile and in `{"safe": true}`.
- **Cost**: demo-stories (38 s, every new scene) rendered in 173 s with the layer against 158 s without it (+10 %) on the M1.
- **Motion 2** (rule 26; the owner, 2026-10-12: "Claude's motion design got stronger in the Opus update: we want that power
  too"): the planner sets the plan's `"motion": 2` from ci/fx.json `motion2From` (94; a demo by its `-vNN` suffix; a spec's
  `"motion"` forces 1 or 2) and Promo calls tokens.ts `setMotion()` before anything renders; with 1 every earlier film moves
  exactly as it was made. Then:
  - impacts are springs (camera.tsx `kickEnv`): the rounded three-frame rise, then a damped swing that passes once under rest
    (about a quarter of the hit) and settles; the camera anticipates each kick with a small dip in the three frames before it
    (`camKickEnv`; `kickEnv` itself stays 0 before the hit, so a word or a Film's scale never shrinks early);
  - a carried velocity (a whip's, a push's, a slide's, an opening's settle) settles on a spring, a few per cent past rest and
    home, faded to exactly zero (no step);
  - depth separates the planes more: a `CameraLayer`'s travel scales by depth^1.6 and its push by depth^1.35 (a background
    at 0.6 moves less, a foreground at 1.3 more; the subject at 1 and the Hud unchanged, L.camSafe still holds);
  - the incoming shot of a whip, push, pull, stack and slide lands on `springIn` (about 3 % past, then home, inside the
    window; nothing moves after it), the outgoing of a push turns a degree as it flies;
  - two new cuts: `slide` (a feed swipe: the next shot pushes the outgoing up and lands on the spring; pre 4, post 6,
    `asmr-air-long`; the hook's table and the middle's) and `iris` (the next shot opens out of a circle at its point of
    interest, its Film `focus` or a photo's centre, while the outgoing steps back under a veil; post 9, `asmr-whoomp`; the
    middle's); never on a Phone or the end card;
  - words (textfx.tsx): `mask` reveals each word LETTER BY LETTER out of its mask, every letter on the spring (the stagger
    shrinks for a long word: landed within about 16 frames), `slam` words settle from a few degrees of turn, `rise` lands on
    the punch spring, `stack` slides in on the spring, a punch pops on the camera's spring (its dip under rest capped at
    1.5 %). The line and word boxes never change: nothing reflows, and once landed the words stand still.
  The strips: out/stills/render-2026-10-12/motion2-*.strip.png (demo-variety-v94). Cost: the springs are arithmetic; the
  only new pixels are the iris's clip-path.
- **Demos**: `specs/demo-stories*.json` (silent, `node tools/fake-timeline.mjs <demo-id>` gives them a timeline from the
  letters, no Gemini request).


## Sound (public/sfx/asmr.json, made by tools/asmr.mjs)

Close, soft, dry, detailed: wood, felt, graphite, paper, glass. No melody, at most about three sounds
at once, repeated hits vary a little (`vary()`). Every asmr- file is balanced for volume 0.5 against a
reference voice and its hit sits 3 ms in, so `at` is the frame of the event. The owner (2026-09-24)
liked the sounds in the silent cut: in the voiced film they must be just as present and clear, with
the voice on top and every word intelligible. Promo sets the voiced mix against the film's own voice
level (`setMix` in scenes/common.tsx, `MIX_VOICED` in tokens.ts); listen to the voiced mp4, not the
silent one, before delivering.

Already in every film, add nothing for these: (`asmr-room`, the room tone, is OFF since 2026-10-14: the owner wants
clean silence, no noise; never add it back as a bed or a cue) `asmr-sub` on frame 0 (the hook's felt thump), `asmr-air` 3 frames before every cut
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
| `asmr-pencil`, `-short`, `-long` | a line drawing on (0.95 s / 0.36 s / 2.0 s); silent from v113 (rule 28): never in a new film |
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
| `asmr-drop` | the aura drop's BOOM: a deep, short, felt hit (a 44 Hz membrane, its harmonics driven up to 340..1500 Hz so a phone's own speaker plays it: -8 dB there, the first version -16.6; a felt mallet, a push of air); the `drop` cut plays it, nothing else |

The `app-*` (.m4a, the app's own UI sounds) and `synth-*` files are older and not used by any scene.

**Real car sounds** (`public/sfx/real-*.wav`, manifest `public/sfx/real.json`, licences `public/sfx/REAL-LICENSES.md`,
made by `tools/real-import.mjs`): 51 recordings of real cars, faults (a rod knock, belt squeals, a misfire, a weak battery,
a starter grind, a worn engine, a broken exhaust, brake squeals, a suspension creak), healthy twins (starts, an idle, turbo
whistles), stethoscope "knowledge" takes (a pulley, the steering pump, the valve train, the alternator) and everyday events
(a door, a seatbelt, a fob, an indicator, a phone buzz). Each licence was read on the source's own page before download
(receipts outside the repo). A film opens on one when its topic is a sound: beat 0 `"sfx": [{"name": "real-<x>", "at": 0}]`
and `"leadIn"` 0.8 to 1.2, so it plays alone before the first word; it rings on under the voice with the word dip, and the
voiced mix's ceiling holds it like the kit (common.tsx KIT_LEVEL reads real.json too, 2026-10-05). **Truth**: a film names
a fault only when the recording's own `use` names it (real-rough-idle, real-suspension-creak, real-squeak-pass and
real-whine are "something is wrong" only; real-belt-squeak, called real-belt-chirp until 2026-10-05, is a belt squeaking
whose cause its author never named), a sound its author does not call faulty (the stethoscope takes, the turbo whistles) is
never a fault, and the brake squeal recordings are the common squeal while braking, never the pad wear indicator.
**Credit**: the CC0 and public-domain files need none; ten are CC BY (real.json `credit.required`): usable only while
`ci/sounds.json` `"creditLines"` is on (off until the owner says yes), and then publish.mjs closes the post with the
cue's credit line (title, author, freesound.org/s/<id>, the licence's name and URI, as CC BY asks; when the post would
pass the site's 1200 characters, the film's own text is shortened, never the credit); build-index refuses one
otherwise. Not found under an open licence (2026-10-05): detonation (pinging), a lifter tick, metal-on-metal brake grind, a
wheel-bearing hum labelled as one, a CV-joint click, a faulty power-steering whine, a faulty turbo. To add one: a `fsd()` /
`fsdBy()` source and a pick in tools/real-import.mjs, `node tools/real-import.mjs --fetch <key>`, `--list` / `--sheet` to
choose the window, then `node tools/real-import.mjs` (it rebuilds every file, the old ones byte for byte) and listen to
out/real-audition.wav.

**Music** (`ci/music.json`, `tools/ci/music.mjs`; the owner, 2026-10-02: "every third video gets background music,
something quiet that suits it; let's see how it works"). **PAUSED the same evening: the owner disliked the four beds ("random free stock music"); ci/music.json has no tracks, so no film gets one.** Film number n (the `v<n>-` of its id) gets a bed when
n ≥ `from` and (n − `from`) is a multiple of `every` (from 63, every 3), the track taking turns: v63 felt-piano, v66
warm-pad, v69 soft-keys, v72 wood-mallet, v75 felt-piano ... A redo, a hook variant and a translation share the number
and so the bed; a demo never gets one. Nothing goes in the spec: `tools/build-index.mjs` puts `{src, volume, duck}`
into the indexed spec at render (Mac and cloud) when the spec's `music` is absent or null; Promo loops it from frame 0,
ducked to `duck` × `volume` under the voice (8-frame ramps), faded over the last 24 frames. The beds are synthesised
from scratch into public/music/*.m4a: $0 and royalty-free by construction, so Instagram can never mute or claim a
film. Calm, never cheesy, under the voice. A missing file stops build-index on the film that gets it (the cloud needs
the m4a committed). `node tools/ci/music.mjs [<id>]` says whether a film (default: the next free number) gets one
and which; check.mjs prints a `music` line, the brief a `- music:` line, post.json a `"music"` name. **Changing it**:
edit `ci/music.json` only (`from`, `every`, `volume`, `duck`, `tracks`). It is the film's number, never its spec: a
film made before a change of `from` or `every` takes the new rule's bed when it is rendered again.
