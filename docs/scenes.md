# Scenes

> Moved out of CLAUDE.md on 2026-10-26 (plan step 2.5: the cloud context slimmed to the rules). Nothing here was
> dropped. Section names in the text (Voice, Style, Motion, Sound, Story moments, The ending, Cloud studio ...) and
> "rule N" point to the other files of docs/ (CLAUDE.md's map says which); the linters named here still enforce them.

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
| `Calendar` | a month, a countdown to a date | `month`*, `days`*, `startWeekday`* (0 = Monday), `marks`*`[{day, label, tone, at}]`, `today`, `countdownTo`, `at` (chunk or "0.9s"), `staging`: `month` (default: the grid and a counting ring) / `tearoff` (a tear-off day calendar, pages tearing away to the target day, its label under it) / `ruler` (the month as a ruler, a marker sliding from today to the flag of the target, a big count of days above) |
| `Notification` | a push on a lock screen or floating | `title`*, `body`*, `time`, `at`, `lock`, `clock`, `app`, `staging`: `float` / `lock` (the default follows `lock`) / `desk` (the phone lying on a table at a slant, the screen waking, buzz rings on the table) / `stack` (the banner dropping onto a pile of blank earlier banners) |
| `QRCard` | the glass card, a passer-by scans it | `scanAt`, `noPlate`, `reasons` (3), `caption`, `staging`: `windshield` (default: the card behind the glass, the phone scans and opens the page) / `street` (low angle from the pavement: the phone rises into the foreground, its camera finds the card, turns to the viewer with the page) / `night` (dark glass, a phone torch finds the card, the code is read in its light, the three reasons light up under it; no caption) / `topdown` (the car from above, the card a glowing tag on the dash, a passer-by walks up, scans, green rings) |
| `MapPin` | parking: a pin drops on the car in a line-art city | `label`, `caption`, `at`, `staging`: `city` (default: the tilted city turning) / `walk` (the plan from above, north up, a green dotted way from your dot to the car) / `floors` (a car park in section, numbered floors, the pin falls onto the car on its floor; `level`, default "-2") |
| `Wave` | engine sound: the recording, 3 character chips | `labels` (კაკუნი/ჭრიალი/გუგუნი), `pick`, `at`, `caption`, `sound` (false = silent recording), `staging`: `mic` (default: microphone, voice-memo waveform) / `radial` (the sound as spikes around a ring, the mic inside) / `seismo` (a pen writing it on a running strip of paper, the pen lifts at the pick) |
| `Phone` | a REAL app screen in a line-art iPhone, clearly visible: large, bright, readable | `src`* (public/screens), `y`, `x`, `zoom` (the framing it lands in), `focus[{y, x, zoom 1..1.8, at}]` (`at` chunk or "1.2s"; a first key at "0s" is the landing framing, not a push), `highlight` (one or an array of `{y, h, x, w, tone, at, r, snap, gap}`; from v113 the outline follows the element under the box: A highlight follows the element's own shape), `tap` (one or an array of `{x, y, at}`), `callout{text, value, tone, at}`, `bright` (dark film only; never below the scene's default), `cropBottom` (hide the capture from this fraction down), `staging`: `device` (default) / `tilt` (the same device turned in space, slowly turning to you) / `loupe` (the whole device small at the left, a 2x loupe on the talked-about element beside it, following the highlights; from v113 with highlights the loupe is a rounded box concentric with the element's outline holding the WHOLE element, under the device when the element is too wide to grow beside it; no callout, zoom or cropBottom) / `hero` (the 3D phone seen almost side-on, small, turning to you while the camera closes in; the flat device draws it as `tilt`), `mode` (`3d` / `flat`; leave it out: the flat device before v94, the 3D iPhone in v94 and v95, then even films 3D and odd ones flat: rule 27) |
| `Photo` | a REAL photograph (public/photos, 41 licensed Unsplash photos (an archival photo with a CC licence goes in the story scenes below, which show its credit: build-index refuses it in Photo), catalogue public/photos/photos.json "shows", licences public/photos/LICENSES.md) graded into the film's look | `src`* (file name without .jpg), `mode` frame/bleed/cover (bleed and cover fill the whole frame when the photo fits it, rule 19, else they are the frame plate; frame is a plate on the field), `aspect`, `move` push/pull/pan-*, `center{x, y}`, `zoom`, `highlight` (box or array: `{x, y, w, h, tone, at, label, push, fill, outline}`), `caption`, `source`, `strips` (cover mode), `grade` duotone/color; header of src/scenes/Photo.tsx |
| `Wire3D` | pollar wireframe 3D | see below |
| `EndCard` | always last: a quiet signature, never a call to action | `tagline` (a short punchline or callback, ≤ 26 characters, the last spoken line; on a follow film the reminder, which a `\|` breaks into two lines), `note` ("<feature> · VINARI+" or a hedge; on a follow film a hedge only); no store line |
| `Film` | the film's OWN new visual (Film scenes, below): one to three per new film (plan step 1.3) | `name`* (the id in PascalCase: src/scenes/film/<name>.tsx), its own props |
| `PhotoStory` | a REAL archival or modern photo, alive (the stories category: real people and history) | `src`* (public/photos; an archival one carries its licence and `credit`, shown lower left while it is on screen), `staging` bleed/print/window/depth (bleed and depth fill the whole frame when the photo fits it, rule 19, else a whole plate; depth only with a vetted `subject` outline in the catalogue; a print or a window is a whole object on the field), `move`, `amount`, `center`, `grade` mono/archival/color, `contrast` 1.25, `grain`, `vignette`, `leak` (a cue: a light passes), `who{name, note, at}` (the name strip), `lines` (kinetic, "*punch*"), `ring{x, y, r, at, tone}`, `print{rot, at}`, `more[{src, at, rot}]` (prints dropping on it); header of src/scenes/PhotoStory.tsx |
| `KineticHeadline` | the punchy line that MOVES (a hook, a takeaway, a twist said out loud) | `lines`* (1..4, "*word*" punches: pops, turns bold, takes its tone, kicks the camera), `staging` mask/slam/stack/strike/type, `size` 120, `align`, `y`, `kicker`, `bg{src, dim}`, `source` |
| `BigNumber` | a year or a bank number, huge, on odometer drums | `value`*, `from` (required for rewind; never the clock), `staging` odometer/rewind/scrub, `format` year/int/plain, `unit`, `label`, `caption`, `at`, `landAt`, `tone`, `bg{src, dim}` (rewind), `source` |
| `Twist` | the plot twist: the belief, then the hit | `reveal`* (lines; a reveal of 1 to 3 words is THE frame of the film: centred, 360 px for one word, 300 for two, 260 for three, over the photo under a light veil on paper), `setup{lines, src}` (none: the previous scene is the setup and the cut into it crashes), `at`, `src`, `tone` (the punch words), `staging` crash/whip/glitch; one a film |
| `Split` | then and now: two real photos | `a`*, `b`* `{src, label, year, center}`, `staging` wipe/stack/slide, `at`, `hold`, `tone`, `caption` |
| `Timeline` | years that travel | `from`*, `to`*, `events`* `[{year, label, at, tone, src}]` (1..5), `staging` ruler/feed/zoom, `now` (a year written in the spec), `caption`, `source` |
| `Callback` | the hook comes back near the end, frozen, with the twist written on it | `lines`, `mark` strip/strike/ring, `ring{x, y, r}`, `at`, `frame`; fx films only, one a film |

**Stagings** (the owner, 2026-09-27: "the same graphics every time ... each time refined AND different"): the scenes
the categories lean on take a `staging`, a different camera and idea, not a colour swap (the table above; the code in
src/scenes/staging/). Leaving it out is the default look, so every older spec renders as before. The cloud studio
keeps a film's looks apart from its category's last films (tools/ci/visual.mjs; Cloud studio, below): vary them by
hand too, and never put two films in a row on the same staging.

**Film scenes** (the owner, 2026-09-27: "not 10 fixed options that rotate: EVERY film must think differently and try
to make a good NEW graphic"): every new film designs at least one new visual for its key moment, written for it as
`src/scenes/film/<Name>.tsx` (<Name> = its id in PascalCase: `v26-night-scan` → `V26NightScan`, one exported component
of that name, the usual `p` + `ctx` props) and used as `{"type": "Film", "name": "<Name>", ...its own props}`.
`src/scenes/film/_template.tsx` (never registered) is the toolkit: what a film may import (react, remotion's frame
tools, ../common, ../../tokens, ../../lib/format, layer, anim, measure, and existing scenes or staging parts as building
blocks) and the rules (frame-driven, TXT and mtav() on text, colours from C for both looks, stage units, the safe zone
and L.graphicsBottom, the scene sfx helpers, no em dash, no "!" or street word written in the file: those come from the spec). `tools/ci/filmlint.mjs` (run by build-index and
check, and by hand: `node tools/ci/filmlint.mjs [<Name>]`) reads a film AS TEXT and refuses anything but drawing code:
only those imports (and only names they export), no network or page API, timers, clock, Math.random, eval, Function,
import(), require, process, `this`, dangerouslySetInnerHTML, URLs (images only `<Img src={staticFile('screens/…')}/>`),
event handlers, `ref`, computed keys that are not numbers (a[i] from the film's own counter, a[+i]), text pieced into a
style that can load a file (background, mask, filter, content, --custom), no change to anything shared (imports,
globals, what they hold, through any cast; Object.assign, freeze, defineProperty), top-level values only literals,
functions and arithmetic (nothing run on load), at most 90 KB (30 KB until plan step 1.3), exactly one export. Since
plan step 1.3 (2026-10-26) a film may write up to three: `<Name>.tsx` and `<Name><Word>.tsx` (`V26NightScanHook`,
`V26NightScanReveal`; tools/ci/visual.mjs isOwnFilm), 90 KB together, each its own export, none importing another; the
hook and the reveal are composed this way, never on a library Person, Drive or Windshield (tools/ci/treatment.mjs). The topic comes from a website, so
this is a safety wall: a film only ever runs in the render page (the Remotion bundle), never in Node (no tool imports
src/scenes/film/; build-index, check and filmlint only read the text). Behind the lint, two runtime walls: while
rendering, src/index.ts puts a Content-Security-Policy on the page (only the bundle's own files load; no outside URL,
fetch or frame, no eval or Function), and src/tokens.ts serves C and THEME as read-only views and freezes its other
tables, so a write the lint missed throws in that film instead of recolouring the rest of the render. A moving
picture goes inside `PictureBand` (../common): a diagram (`"look": "diagram"`) is cut there on hard lines at
L.graphicsTop / L.graphicsBottom; a picture (`"look": "illustrated"`, or `"bleed": true`) is full bleed (rule 19): no
cut, the meta bar and the subtitle as they are, and the Film draws its picture to the frame's edges, L.bleedTop /
L.bleedBottom (the kit's `IlloBand`, `TOP` / `FOOT`). A Film composes its people, cars and places from the kit
(src/scenes/illo/, Story moments below); the template's example is an illustrated moment made of it. build-index
lists the films of the indexed specs in `src/generated/films.ts`, each loaded only when its film asks
(`src/scenes/Film.tsx`): a film file that is missing, refused or throws on load is an ERROR for that one film (left out
of the index, or its render stops with `Film scene "<Name>": ...`), never the bundle or another film. Its visual token
is `Film:<Name>`. Library scenes and stagings stay for the other beats (reuse now and then is fine).

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


## Story moments (the illustrated scenes and the kit, `src/scenes/illo/`; rule 22)

The owner (2026-10-06 evening, on a posted film's "დედა: სად ხარ? ბუმ?" text cards, a strike-through list and a stick
figure): too much text, the subtitle is there anyway; a story moment is SHOWN, animated (mom calls: a phone ringing with
„დედა" on it); line art only for a diagram that points at something. And at 21:25: never a fixed set of graphics that
rotates. So the scenes below are **references**: stage each one for the film (its staging, who, where, what), and compose
the film's key moments as its own Film from the kit's parts. The "Graphite" look: filled, softly shaded, a key light from
the top left, the colours from `C` (both looks), full bleed (rule 19).

| when the line says | show | stagings |
|---|---|---|
| someone calls (mom, the mechanic, the buyer, an unknown number) | `Call` | hand, desk, mount, pocket, missed |
| someone writes, a group chat, left on read | `Chat` | thread, bubble, group |
| on the road, a trip, speed, winter, rain, night | `Drive` / `Windshield` | side, rear, top, front / road, traffic, parking |
| a warning light, the fuel, the temperature | `Dashboard` | cluster, light, fuel |
| fuel, the station, LPG | `Pump` | nozzle, display, station |
| a push or a message lands on a phone lying on a table or a car seat (from v107; the real 3D iPhone, its lock screen and 1 to 3 iOS banners) | `PhoneDesk` | walnut, marble, seat |
| the car parked at night, the QR card behind its windscreen, the hazards on (from v107; the solid 3D car, front three-quarter, whole) | `CarNight` | right, left, low |
| costs, prices, a budget, money gone | `Money` | rain, wallet, tag, receipt |
| a reaction, a feeling, a dialogue, "me" | `Person` | solo, pair, think, full |
| boom, the twist, a bump, a crack | `Impact` | burst, bump, crack |
| a real person or a real historic car | `PhotoStory` / `Split` / `Twist` | the stories scenes |
| a true number, a comparison | `BigNumber`, `Stat`, `Compare`, `SplitFlap`, `Timeline` | data scenes |
| how a part works, where it is | a Film with `"look": "diagram"` | line art allowed here only |
| the app | `Phone` (real screens), `Notification`, `QRCard`, `MapPin`, `Wave` | as before |
| anything else: rejected, dumped, the comeback, the new car, the garage, the police, a race, a crowd, winning, a teaser, a phone screen that is not ours, time passing | **your Film**, `"look": "illustrated"`, composed from the kit | your own |

Props (every file's header has the rest; `at` is a chunk or "1.2s", `word` a punch word of 1 to 3, `time` day | night |
dusk, `camera` overrides the planned move, `seed` varies the jitter):

| type | props |
|---|---|
| `Call` | `name`* (the caller, an identity label: may repeat the subtitle), `label`, `avatar` (a Figure preset, "initial", "none"; from the name: დედა → mom), `outcome {is: answer \| decline \| ignore, at}`, `count` (missed), `where` (station \| road \| room \| garage \| street \| city \| none) |
| `Chat` | `messages`* `[{text ≤ 4 words, from: me \| them \| a preset, at, react: heart \| laugh \| wow \| sad \| like, seen}]` (≤ 3, ≤ 9 words in all; bubble ≤ 2), `contact`, `where` |
| `Drive` | `body` (sedan \| suv \| hatch \| coupe \| ev), `paint` 1..5 or `a` \| `b`, `speed` 0..1, `backdrop` (city \| mountains \| highway \| station \| coast \| bridge \| tunnel), `framing` (side: wide \| close \| low \| pan; rear: wide \| close \| high; front: wide \| close), `weather` (clear \| rain \| snow), `traffic` 0..3, `events [{is: brake \| stop \| go \| indicate-left \| indicate-right \| lights, at}]`, `cast` |
| `Windshield` | `weather`, `events [{is: brake \| turn-left \| turn-right \| found, at}]`, `backdrop`, `framing` (cabin \| passenger \| console) |
| `Dashboard` | `light` (engine \| battery \| oil \| temp \| tyre \| brake \| abs \| airbag \| fuel \| seatbelt), `at`, `blink`, `tone`, `needle {from, to, at}`, `boot`, `speed` |
| `Pump` | `fuel` (petrol \| diesel \| lpg), `value {litres, money}` (facts only), `at`, `cast`, `acts`, `hold`, `sign {is: no-phone, at}`, `spark {at}`, `close`, `reach {at}`, `body` (never `ev` at a pump), `paint` |
| `PhoneDesk` | `staging` or `surface` (walnut \| marble \| seat), `time` (night \| day), `clock` ("21:52"), `date`, `notes`* `[{app (vinari \| messages \| phone \| mail \| a name), title ≤ 3 words, body ≤ 6, when, at}]` (1 to 3, the newest on top, one buzz each; asleep until the first), `land` (false: already lying there), `roll` (degrees on the surface), `word`. One WebGL canvas, `cam: self`; the phone always whole above the subtitle |
| `CarNight` | `staging` or `angle` (right: from the pavement \| left: from the road \| low: a low hero view; always a front three-quarter, never a side view), `color` (cobalt \| graphite \| pearl \| silver \| red \| black \| green or #hex), `card` (true or `{at}`: the printed QR card behind the windscreen), `loupe` (true or `{at}`: only the code, needs `card`; it takes the top, so no `word` with it), `hazard` (true or `{at}`), `lights` (true: the headlamps and their beams), `word`. One WebGL canvas (two with the loupe), `cam: self`; the car always whole |
| `Money` | `value`, `from`, `format` (gel \| usd \| int), `direction` (in \| out), `tone`, `cast`, `coin`, `at` |
| `Person` | `cast`* (a role or `{is, seed, face, pose, hold, turn}` plus the wardrobe picks below; two for pair), `acts [{at, who, face, pose, say ≤ 3 words, fx, turn, hold}]`, `think` (an icon), `backdrop` (room \| city \| station \| garage \| mountains \| highway \| none), `hold`, `car {body, paint, x}` (full), `enter`, `charge {at, until}` |
| every `cast` (Person, Drive, Pump, Money, a Film's Figure) | a role: `me`, `friend`, `girl`, `ex`, `man`, `woman`, `mom`, `dad`, `grandpa`, `grandma`, `mechanic`, `seller`, `buyer`, `officer`, `boss`, `neighbour`, `crowd` (a NEW person every film), or `{is: <role>, outfit, hair, hairTone 0..7, skin 0..3, tone 0..7, legs, beard, glasses, hat, shoe, bottom, gender m \| f, age young \| adult \| old, extras [watch, chain, earrings, hoops, bag, scarf, tie], look 1, 2 (another person of the same role)}`: outfit `suit` (with a tie) \| `suitOpen` \| `blazer` \| `leather` \| `bomber` \| `denim` \| `trench` \| `overcoat` \| `puffer` \| `shirt` \| `polo` \| `turtleneck` \| `knit` \| `hoodie` (rarely) \| `tee` \| `cardigan` \| `blouse` \| `dress` \| `coverall` \| `uniform`; hair `crop` \| `side` \| `quiff` \| `slick` \| `fade` \| `buzz` \| `curly` \| `wavy` \| `manbun` \| `textured` \| `receding` \| `bald` \| `long` \| `waves` \| `bob` \| `lob` \| `pixie` \| `pony` \| `bun` \| `curls` \| `lowbun`; beard `stubble` \| `short` \| `full` \| `tache` \| `goatee` \| `none`; glasses `round` \| `rect` \| `shades` \| `aviator` \| `shadesUp` \| `none`; hat `cap` \| `capBack` \| `beanie` \| `flatCap` \| `peaked` \| `none`; shoe `sneaker` \| `derby` \| `loafer` \| `chelsea` \| `boot` \| `heel` \| `flat`; bottom `trousers` \| `jeans` \| `chinos` \| `skirt` |
| `Impact` | `word` (≤ 2), `at`, `tone`, `glass` (phone \| windshield), `body`, `where` |

**The kit** (import it in a Film: `../illo/<file>`, filmlint allows every export but `deepFreeze` and the kit scenes' own
`Camera` / `useCam`; the template's header lists it and its example composes a moment from it):
- people: `Figure` (the roles above, dressed by the wardrobe; 12 faces: neutral,
  smile, grin, laugh, shock, worried, sad, cry, angry, smirk, cool, meh; 21 poses: stand, wave, point, pointYou,
  phoneEar, phoneLook, shrug, facepalm, handsHead, thumbsUp, armsUp, crossArms, hold, offer, reject, confident, slumped,
  crouch, sitDrive, walk, jump; `acts` for a performance, `hold` an item; hands with fingers in every pose), `castLook`,
  `lookLine`, `useCastLook` (a scene's close-up hand in "me"'s sleeve), `Hand`, `HandGrip`;
- cars: `Car` (sedan, suv, hatch, coupe, ev, racer; side, rear, front, top; paint 1..5 or `a` / `b`, caliper, speed,
  lights, dent, dirt), `Road`, `CarAhead`, `Cabin` (`wheelX`, `wheel`, `screen {x}`), `Wipers`;
- phones: `Handset`, `CallScreen`;
- places: `Backdrop` (city, mountains, highway, station, garage, room, coast, bridge, tunnel; day, night, dusk; `ROADSIDE`
  the outdoor six), `Plate`, `IlloBand` (the full-bleed picture with the kit's defs), `Svg`, `TOP` / `FOOT`, `useFilmKey`,
  `filmPick`, `freshFilm` (the per-film picks: Cars and places), palette's `acc` and `accRamp` (the object accents);
- things and effects: `Prop` / `drawItem` (phone, flowers, keys, wrench, ticket, clipboard, coffee, trophy, money,
  ringBox, plan), `Icon` (warning lights, reactions, thoughts, signs), `Rain`, `Snow`, `Drops`, `Sparks`, `Confetti`,
  `Petals`, `Notes`, `Smoke`, `SpeedLines`, `Dust`, `Rings`, `Shockwave`, `Burst`, `FaceFx`, `Halo`, `Solid`, `Shadow`,
  `Glint`.

**Cars and places** (the owner, 2026-10-12: "the cars in the studio are always the same scene, and the models are ugly,
old, van-like: refined modern 2020s cars and varied scenes; the stripe design itself is fine"): src/scenes/illo/car.tsx was
redrawn: the `suv` is a coupe-SUV (raked windshield, a roof falling to a raked tailgate under a lip, a beltline that kicks
up, slim lamps, Y-spoke wheels), the `hatch` a modern hot hatch (spoiler, thick C-pillar), the new `ev` an electric crossover
(a short grille-less nose, the windshield and roof one arc, a Kamm tail, aero wheels, a panoramic roof from above), the sedan
a little lower; wheels in four designs (twin, blade, Y, aero); the rear and front views wide and low with the greenhouse
pinched in and the C-pillar flowing into the hips (the old flat shelf read as a pickup), small mirrors; from above a narrow
cabin with the windshield and rear glass as separate panes (the old square greenhouse read as a van). The kit gallery:
`tools/illo-gallery.mjs --kit --only car-modern` (every body, grey and in an accent, the end views, the top views).
**Never the same car scene**: when a spec names no body, backdrop or framing, a film from `ACCENT_FROM` (94) takes its own
pick by its number (illo/scene.tsx `filmPick`: a stride coprime with the list, so two films in a row never share one; an
older film keeps the old defaults): Drive's body (sedan, suv, ev, coupe, hatch), backdrop (`ROADSIDE`: city, mountains,
highway, coast, bridge, tunnel) and framing; Windshield's framing (cabin: the driver's wheel and hands; passenger: the wheel
at the left edge and a floating centre screen; console: no wheel, the screen and the road), backdrop and the body of the car
ahead; Pump's body (never the `ev` at a fuel pump). With a pair (rule 25) the hero car is painted `a` (Drive's, Pump's,
Person's `car`, Impact's moving car, Windshield's car ahead) with the other accent on its calipers; the traffic stays grey.
Name them in the spec when the story needs one (a family SUV, a night tunnel). The Drive framings: side `wide` (the car
whole, the world streaming by), `close` (a tight car-ad crop), `low` (the camera on the asphalt: a low horizon, a big car),
`pan` (the car crosses the frame); rear `wide`, `close`, `high`; the new `front` staging (head-on, the road running away
behind it, a glare at night) `wide`, `close`.

**The people from v94: "Silhouette light"** (the owner, 2026-10-12, on the round-headed cartoon people: "a disaster";
his references: out/char-ref/): from `CHAR_FROM` (src/scenes/illo/wardrobe.mjs, 94; `charsNext`) `Figure`, `Hand` and
`HandGrip` draw the new people (src/scenes/illo/sil.tsx, the heads in silhead.tsx); every film made before keeps the
Graphite people below as it was made. Elegant adults of about seven heads (a small sculpted head on a long neck, long legs),
always in a strict profile or a three-quarter view, never from the front: a crisp near-black silhouette with no outline (the
clothes are its shape: a tailored jacket with its V, a long coat to the knee, a dress, a turtleneck), a white garment white
turned by the light, and only the skin (the face, the neck, a V of the chest, the hands) revealed by ONE soft light of the
film's object accent `a` (grey without a pair, and on the cover). Closed or lowered eyes, a brow, a nostril, the lips: no
cartoon face, no big eyes, no mitten hands; the mood is posture and light (worried drops the head and dims the light, a
smile lifts the chin into it). On the black film the ink lifts a step and the light draws a rim. The props are the same:
`turn`'s sign is where the person faces (0 or + = right, - = left), its size how far the body turns (under 0.75 the
three-quarter view, from 0.75 the profile), `flip` mirrors; the 21 poses are poses.ts's, the arms that reach the body (the
phone at the ear, a hand to the face, crossed arms, the wheel) aimed at the new head and chest; the wardrobe dresses them
as before (garment tones 0..2 are white, darker ones ink; hair from tone 3 down is grey; a man's short cut ends above the
nape, the receding one leaves the crown bare). No cartoon effects (shock lines, sparkles) on the new people. The sheet:
`tools/lock.sh npx remotion still src/illo-kit/index.ts sil-sheet out/char-next/final-sheet.png` (and `sil-sheet-dark`):
three people in two outfits, standing in profile, in three quarters, walking, on the phone, behind the wheel, worried,
relieved, pointing, and three close-ups.

**The people** (the owner, 2026-10-07, on v81's pair: "the boy and the girl, what do they look like? why is the boy in a
hoodie? refine them; isn't a NEW character every time better, refined, in a suit?"): refined adults of about 6.6 heads in
the Graphite look (long legs, the arms hanging outside a tailored trunk, faces with almond eyes, lids, brows, a nose, lips),
in a real wardrobe of 20 outfits (tailored suits, coats, leather, knitwear, dresses with skirts, a coverall, the police
uniform; the hoodie only now and then), 21 hairstyles, beards, glasses, hats, earrings, a watch, a chain, a bag, a scarf,
four skin tones and hair from black to grey (Georgia: mostly dark), shoes with soles, hands with fingers. **A new person
every film**: `src/scenes/illo/wardrobe.mjs` (plain JS, read by the render and by tools/ci/visual.mjs alike) dresses each
role from the film's number (`filmKey`: v81, its -en, its hook variants and redos, its cover; a demo `demo-...-v81` shows
v81's people; any other id a hash) and the role: the same person all through the film, "me" never in the outfit or the hair
of the three films before (its pools step by a stride), the film's other people never in "me"'s outfit, "me" a woman when
`gemini:Achernar` reads the film. The roles keep their sense: `boss` a suit, `mechanic` the coverall, `officer` the
uniform and peaked cap, `mom` and `dad` in their fifties, `grandpa` and `grandma` older (grey, glasses, a flat cap), `me`,
`friend`, `girl` and `ex` free and stylish, `seller` the dealer (leather, a chain, sunglasses up). **Dress them for the
story**: a cast object picks what the story needs (`{"is": "me", "outfit": "suit", "hair": "slick"}`, an ex in
`"trench"` or `"overcoat"`); what it leaves out stays the film's own. The close-up hands of Call, Chat and Pump wear "me"'s
sleeve (`useCastLook`). The gallery: `tools/illo-gallery.mjs --kit --only cast` (every role in one film, "me" and a friend
across twelve films, every outfit on him and on her, the hair and the beards, the faces, the hands).

**Never the same picture** (tools/ci/visual.mjs, check.mjs before the voice): HOOK_REPEAT (the film opens on the scene one
of the category's last 2 films opened on: fatal in the cloud), MOMENT_REPEAT (a story scene's `Type:staging` in 2 of the
category's last 4 films: a note; the very picture, type, staging, who, where and what, of one of its last 2: fatal),
IDEA_REPEAT (a Film composing the kit's parts as one of the category's last 3 Films did, or a recorded idea that reads like
one: fatal), FEED_REPEAT (the page's last 3 films, every category: the same picture or composition: fatal), CAST_REPEAT (the
film's main character, its "me" or else the first person it draws, in the outfit AND the hair the main character of one of
the page's last 3 films wore; only a spec's or a Film's own pick can do that: fatal). The brief lists the pictures and
compositions of the category's last 4 and the page's last 3 films and the people of the page's last 3 ("Made before").

**Text on screen** (tools/ci/screentext.mjs: errors for a new film in the cloud, warnings elsewhere): text scenes at most
30 % of the time and at most 1 (15 and 20 s), 2 (30 s), 3 (45 s), 4 (60 s), never two in a row and never the first; pictures at
least 50 %; at most 5 words a scene and 3 a punch; nothing that repeats the subtitle shown with it (DUP_SUBTITLE); a
`List` only as a 2 or 3 row comparison (`"compare": true`); every Film says its `look`, and a film draws ONE diagram (LINEART
counts diagram Films by name: the same diagram may come back step after step, as a lesson's part moving on, the 2026-10-12
lesson demo; two different diagrams warn); a new picture every 2 to 3 s
(at least 4, 5, 8, 12, 16 scenes for 15, 20, 30, 45, 60 s; `beat.cuts` count). A diagram is data, not a picture, so a
lesson that explains its steps on one diagram still needs photos and illustrated moments for half its chunks (PICTURE_SHARE):
the hook, why it matters, the example and the takeaway as pictures, a real photo for a step where one fits.


## Recent scene API changes

- 2026-10-22 (the owner: the subtitle builds word by word with the voice; Style, The line builds word by word): the
  timeline's chunks carry `"words"` (tools/vo.py `chunk_words`, `word_starts`, `shown_starts`); layers/Subtitles.tsx
  `SubChunk.words` (frames), `tokensOf`, `letterStarts`, `WORD_POP`, `popOf`; types.ts `Chunk.bleep` / `Chunk.words`.

- 2026-10-12 (the owner on the round heads and cartoon faces: "a disaster"; Story moments, The people from v94):
  src/scenes/illo/sil.tsx (`SilFigure`, `SilHand`, `silPal`, `filmSilPal`, `pairSilPal`, `SilPalCtx`), silhead.tsx
  (`SilHead`, `pathOf`), wardrobe.mjs `CHAR_FROM` / `charsNext`; figure.tsx's `Figure` and `Hand` and handset.tsx's
  `HandGrip` hand over to them from v94; the kit bundle's `sil-sheet` and `sil-sheet-dark` (src/illo-kit/sil-sheet.tsx).

- 2026-10-12 (the owner: "the mockups will be in 3D too, refined"; rule 27): src/scenes/three/phone3d.tsx (`Phone3D`),
  src/lib/device.mjs (`PHONE3D_FROM` 94, `phoneMode`, `isWebgl3dPhone`, `phoneProblems`; `node src/lib/device.mjs --test`),
  Phone's `mode` and `hero` staging (tools/ci/visual.mjs STAGINGS, src/data/scenes.json), tokens.ts `setFilmNo` / `filmNo`
  (Promo sets it with `filmKey(spec.id)`), build-index refuses a bad `mode` or 3D with the loupe, tools/stills.mjs `--full`.

- 2026-10-12 (the owner: colour on objects, modern varied cars, Claude's motion power; rules 25, 26): tokens.ts
  `ACCENT_PAIRS`, `ACCENT_FROM`, `setAccents`, `accents`, `accentsOn`, `C.accA` / `C.accB`, the `Tone`s `a` and `b`
  (toneLine colours, toneText / toneBig ink), `setMotion`, `motion2`; the spec's `accent2` and `motion`; palette.ts `acc`,
  `accRamp` (`accent` and `glow` now toneLine); the Car's `ev` body, the new suv, hatch, end and top geometry, `paint 'a' |
  'b'`, `caliper`, four rim designs; Backdrop `coast`, `bridge`, `tunnel`, `ROADSIDE`; Cabin `wheelX`, `wheel`, `screen`;
  illo/scene.tsx `useFilmKey`, `filmPick`, `freshFilm`; Drive's `front` staging and `framing`; Windshield's `framing`;
  Pump, Person and Impact paint their car `a`; Dashboard's lamp takes `toneLine` (an `a` lamp is coloured); camera.tsx
  `springIn`, the spring `kickEnv` (motion 2); fx.ts `slide` and `iris`; textfx's motion 2 mask, slam, rise, stack and pop;
  tools/ci/fx.mjs `motionLevelOf`, the plan's `motion`, ci/fx.json `motion2From`; filmlint refuses `setAccents` and
  `setMotion` in a Film; tools/stills.mjs `--light` / `--dark` and voice-free silent demos; the kit gallery's `car-modern`
  sheet (src/illo-kit/demos-car.tsx; a demo's `accent`).

- 2026-10-07 (the owner on v81's pair: "refine them, a NEW character every time, in a suit"): the people (Story moments,
  The people): `Figure` redrawn (6.6 heads, a trunk with the arms outside it, faces with lids and lips, hands with fingers
  in every pose), the wardrobe (`src/scenes/illo/wardrobe.mjs` + `.d.mts`: 17 roles, 20 outfits, 21 hairstyles, beards,
  accessories, four skin tones; the film's number dresses every role), every cast's picks (`outfit`, `hair`, `beard`,
  `glasses`, `hat`, `gender`, `age`, `extras`, `look` ...), `Figure`'s `film` prop (another film's people, the gallery),
  `castLook`, `lookLine`, `useCastLook`; the old preset names all work (`jacket`, `top`, `overalls`, hair `short`, `neat`,
  `grey`, `ponytail` read as `bomber`, `blouse`, `coverall`, `crop`, `side`, a grey `side`, `pony`). CAST_REPEAT
  (tools/ci/visual.mjs `castRepeats`, check.mjs; the brief's people list `castText`). Call's avatar and Drive's driver drawn
  at the new head's scale; Drive's `cast` takes an object.
- 2026-10-07, late (the owner on the aura films: "a SAD opening and BOOM", TikTok style): the aura drop (rule 23,
  HOOKS.md H21, H22): a beat's `"drop": true`, the `"style"` presets `"hurt"` and `"drive"` (tools/vo.py), the opening
  `aura-drop`, the transitions `fade` and `drop` (src/lib/fx.ts), the camera's `grade`, `curve` and `inhale`
  (src/lib/camera.tsx: CamState carries a `filter`), `asmr-drop` (tools/asmr.mjs), AURA_DROP (tools/ci/aura.mjs: check
  before the voice, `--record`; `node tools/ci/aura.mjs --test`), ci/fx.json `auraFrom` (82: the aura films before it
  render as made). Its review the same night (the first demo's drop read as a fade-up from grey on paper, the word
  already standing when the boom hit, the boom silent on a phone): a flash's `"tone": "white"` (layers/FxOverlay.tsx,
  the drop's on both looks), the `drop` cut counted from the cut frame (1.36x on it) with a damped shake, the slam's
  `"at": "0s"` (AURA_DROP refuses a slam that lands before the cut, and a plain `word` string that lands 40 frames in),
  the hold 0.2 to 0.4, the inhale through the whole silence, `asmr-drop` audible on a phone speaker.

- 2026-10-07 (the owner's evening asks, wired): the free idea (`free`, rule 20, The free idea), the aura openings H21 and
  H22 with their rotation (rule 23, HOOKS.md, ci/categories.json "openers"), the street words (rule 21,
  tools/ci/streetwords.mjs, ci/street-words.json: check, build-index, filmlint, `--record` and the ledger's "street"),
  the moment menu and the kit (Story moments, rule 22; FEED_REPEAT page-wide, IDEA_REPEAT and the very picture's
  MOMENT_REPEAT fatal in the cloud), the Film template's illustrated example composed from the kit (`look` picks the
  example: "illustrated" or "diagram"), filmlint refusing the kit's `deepFreeze`, `Camera` and `useCam` and any street
  word written into a Film file, and the meta bar kept over full-bleed pictures (Promo `META_HIDE_ON_BLEED` off).

- 2026-10-06, late (the owner: no crop band on pictures; "neither shadow nor outline" on the subtitle): FULL BLEED (rule
  19; Style, Pictures): src/lib/bleed.ts (`bleedOf`, `BleedCtx`, `useBleed`, `usePictureView`, `BLEED_VIEW`), the
  registry's `"bleed"`, `L.bleedTop` / `L.bleedBottom`, MetaBar `hide`; PictureBand cuts nothing in a full-bleed shot;
  Photo, PhotoStory, Split, Twist, Callback and the KineticHeadline / BigNumber `bg` fill the frame; a PhotoStory print
  is no longer cut by the band; the illo particles (Rain, Snow, Notes ...) default to the whole frame there. The
  illustrated kit (branch illo-wave: src/scenes/illo/, Call, Chat, Drive, Windshield, Dashboard, Person, Money, Impact,
  Pump, tools/illo-film.mjs, tools/illo-gallery.mjs) is merged; its camera is now the rig's (src/scenes/illo/cam.tsx
  adapts `Camera`, `Plane` = CameraLayer, `Hud`; the staging's designed move wins over the planner's random pick) and
  the camera classes come from the registry. Their grounds, roads, the cabin's roof liner and dash, the dashboard and
  the pump's face run past the frame (TOP / FOOT); the cabin shows the whole wheel; a Person bust is drawn whole.

- 2026-10-06 (the owner: "more drive, motion, camera; the openings and endings more powerful; real photos for real
  people"): the motion layer (Motion, above) and seven scenes for the stories category: PhotoStory, KineticHeadline,
  BigNumber, Twist, Split, Timeline, Callback; EndCard `mode` (card, stamp, loop: set by the planner); PictureBand moves
  its contents with the band camera in an fx film (`camera={false}` for your own CameraLayers); `lead()` follows the
  opening; the Film template teaches the camera rig (CameraLayer, Hud, useKick, `hitAt`, `<Words>`), no longer the
  route that draws on. Archival photos in public/photos carry `license`, `author`, `source`, `credit` (LICENSES.md,
  "Wikimedia Commons and archives"); publish.mjs closes the post with a CC BY / BY-SA photo's credit.

- 2026-09-27, later (the owner: "the same graphics are generated every time"): `staging` on QRCard (windshield,
  street, night, topdown), MapPin (city, walk, floors + `level`), Wave (mic, radial, seismo), Calendar (month,
  tearoff, ruler), Notification (float/lock, desk, stack) and Phone (device, tilt, loupe); the defaults are today's
  looks. Shared parts: staging/qrParts.ts (the reasons, icons and module pattern), MapPin's `CitySvg`, Wave's `amp`.

- 2026-09-27 (the owner: "the middle graphics have a gradient at the top and bottom: remove it; the cut-off
  bottom: move it down"): every top / bottom fade mask is now a hard `clip-path` crop, and the pictures run
  to `L.graphicsBottom` 1380 (tokens.ts; `L.graphicsTop` 370 for a top cut). Phone: window 372..1380, a
  push cuts the top on a line (358 at rest, 370 when cropping), `cropBottom` cuts hard, the callout stays
  at 1130. QRCard: windshield `DY` 110 (whole glass, cut at 370), the plate line and caption end at 1300,
  the opened page cut 34 px over them (the scanning phone is whole). MapPin: no oval or edge fades, the
  city is a band 370..1380 (a caption ends at 1300, the map 34 px over it; `HALF` 1700 keeps the far edge out).
  Notification: the lock screen runs to 1380, cut straight outside its tilt. Photo `bleed`: a crisp band
  370..1380 on both films (the dark fades are gone; captions under the band). SplitFlap's reflection and
  the cover's fade under its headline stay.

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
  push crops it on a clean line under the meta bar (stage 358..370, no fade since 2026-09-27), so nothing
  ever draws behind the meta text, at any zoom and any focus y. `highlight` can be an array: the dim layer fades in
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

## Phase 2 kit (src/lib/p2.mjs, from film P2_FROM; every scene's props are in its file's `type P`)

Black and white, colour on data only, every text fitted by src/lib/textfit.mjs, every scene whole inside the P2 stage
(stage x 110..970, y 400..1370). Any scene of a P2 film takes hand marks: `"marks": [{"kind": "circle|underline|strike|tick|arrow|bracket|badge", "box": {x, y, w, h}, "at": <chunk>}]` (3 at once at most, never under stage y 1370).

| scene | props | what |
|---|---|---|
| FilmTitleCard | title, kind (stat, bars, versus, receipt, grid), value, unit, label, rows[{label, value, hl}], total, source, mark | the film's one signature infographic; the cover is built like it |
| KeywordLift | lift[1-2 words], t, mark (the beat: `"subs": "inPicture"`) | the spoken line in the picture, the key word lifted |
| Receipt | title, rows[{label, value, t}], total{label, value, t}, totalAt, source | a cost built line by line |
| UnitGrid | n, label, source (required), t, at | N of 100 |
| ScaleReveal | items[{label, value, shown, t}], at, source | sizes by true area, a pull-out |
| PhysJar | value, shown, unit, label, source (required), per, of, ofShown, ofLabel, kind (coin, drop), t, at, seed | a cost as coins (or fuel drops) pouring into a jar, simulated; a budget is a dashed line where the budget's own coins reach |
| PhysStack | title, items[{label, value, shown, hl}] (2-3), per, unit, source (required), t, at, seed | a comparison as blocks dropping into columns and stacking, simulated; one block = per (the legend) |
| PhysCount | n, of (100 at most), label, yes, no, pct, source (required, a real named one: never illustrative or an example), t, at, seed | N of M balls pouring into two bins, the N marked ones left, simulated |
| RankShift | title, rows[{label, a, b, hl}] (6 at most), unit, at, source | a ranking changing in stages |
| RouteTrace | from, to, note, seed, at | a drawn paper map, the route draws |
| WipeCompare | a{label, src or screen}, b{...}, at | before and after with a handle |
| ScreenFocus | screen, row{y, h, x, w, r} (capture px), label, at, zoom | the whole hero phone, the row lifted |
| TapTrail | steps[{screen, tap{x, y}, verb, at, next}] (2-4) | the taps in order |
| ScreenDeck | screens[3-4], labels, at[] | "and also" |
| HeroObject | src (public/hero), label, aim, at | a real cut-out object |
| FreezeTag | claim, src, tag, aim, freezeAt | hook: mid-trouble, frozen |
| IrisDetail | screen or src, aim, claim, open | hook: a circle of detail widening |
| ShapeMatch | from, to (dot, coin, card, phone, pill, bar), label | a match cut, once a film |
| TypeDive | word, letter, hold | through a letter, once a film |
| CodeAnatomy | code (as printed, 16 characters at most), kind, parts[{part, means, at}] (1-4, each the code's own characters in order: CODE_PART), sum{text, at}, t | a code taken apart: frame 0 the code big (a hook, hookType Decode), then a bracket under each part drops into a panel that says what it means |
| StakeCounter | label, unit, from, steps[{value (the running total), note, at}] (2-5: STAKE_STEPS), resolve{text, at}, t, source | the open loop: a cost or count that only grows, each step's increase and reason stacked under it; at the payoff it goes grey, is struck, the answer lands (hookType StakeCounter) |
| ScreenTour | screen, points[{x, y (the element's centre), w, h (its box), label, at}] (capture px; 2-3: TOUR_POINTS, the box about 560 x 470 at most) | the whole hero phone, a hotspot cursor pressing element after element; a lens shaped to the element shows its whole box, a thin outline stays round it and its number beside the phone (never on the app's words); app time |
| RangeScale | title, unit, min, max, zones[{to, label, bad}] (2-4: RANGE_ZONES), value, shown, from, fromLabel, step, source (required: RANGE_SOURCE), at, t | a reading on its true scale: the zones say what it means, the marker slides and lands, bad zones hatched |
| TimeRace | title, fast{label, secs, shown}, slow{label, secs, shown} (RACE_TIME), at, source | two ways timed on one shared clock: the fast one ticks done, the slow one keeps lapping (one lap a round unit) |
| WhoCard, QuoteCard, Versus, Standings, Ledger, DocCard, LapDelta, StoryMap | (their files) | the story kit |
| JamGrid, ShoutType, SideCar, NewsCard | (their files) | the humour kit (tools/ci/humor.mjs) |

The r3 scenes (src/lib/r3.mjs: CodeAnatomy, StakeCounter, ScreenTour, RangeScale, TimeRace) exist only for phase-2 films (build-index `R3_SCENE`); their props rules are in `node src/lib/r3.mjs --test` and p2lint. Every word they set is measured at the width its scene gives it (r3Texts: TEXT_WIDE; a StakeCounter note 508 px in one line, a ScreenTour label 275 px in two, both ending left of TikTok's action column). A part's meaning, a step's note, a tour label and a sum show what the voice does NOT say (DUP_SUBTITLE is an error for a new film); what is measured, a zone's name, whose clock and a time as a figure are identities (dup:false).

The physics scenes (round 3, 2026-10-27; src/lib/physics.mjs, Matter.js 0.20.0, MIT): the world is simulated on a fixed
clock (two 1000/60 ms steps a frame) from the shot's own first frame, seeded, never the wall clock, so every frame renders
the same in any tab and any order (`node src/lib/physics.mjs --test`; `node tools/p2-stills.mjs <ids> --det=<ids>`
renders the key frames cold twice and walked, pixel for pixel). The lints are tools/ci/physlint.mjs (through p2lint):
`PHYS_P2` (none before P2_FROM), `PHYS_SOURCE`, `PHYS_VALUE`, `PHYS_SCALE` (a jar 4 to 64 coins, the coins within 10 % of
the figure, a column within 25 % and 14 blocks at most, two values never the same column), `PHYS_CLOSE` (a figure within
15 % of its budget: a pile cannot show it), `PHYS_TEXT`, `PHYS_MAX` (2 a film), `PHYS_SHORT` (1.8 s on screen at least).

Retired for P2 films (src/lib/retired.mjs): Drive, Windshield, Person, Pump, CarNight, the small Phone, Photo `"mode": "frame"`.
