# The owner's rules in full

> Moved out of CLAUDE.md on 2026-10-26 (plan step 2.5: the cloud context slimmed to the rules). Nothing here was
> dropped. Section names in the text (Voice, Style, Motion, Sound, Story moments, The ending, Cloud studio ...) and
> "rule N" point to the other files of docs/ (CLAUDE.md's map says which); the linters named here still enforce them.

## The owner's rules (2026-09-24, newest; they override anything older below)

1. **Voiced, always, by Gemini first.** `"voice": "gemini:Algieba"` (female: `"gemini:Achernar"`). The
   whole film is ONE Gemini request, kept as ONE continuous take, never cut into sentences, re-spaced or patched
   with lines voiced apart (the owner, 2026-10-07: "every 1-2 seconds the voice breaks"; Voice, below). Out of
   today's free quota, vo.py falls back to
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
   long as they are true (HOOKS.md H14). Since 2026-10-06 **the buddy tone** (ძმაკაცური ტონი, HOOKS.md Buddy tone: the
   hooks read "high-flown, it will not take off"): what a friend says across the table, a little cheeky; „ძმაო" is
   welcome (once a film), a hook may shout once (one "!" on screen, never "!!"; the post never); no aphorism, no poster
   line, no riddle, no hype word. The mild street words are allowed here and there (rule 21).
5. **Never "myauto"** (myauto.ge, MYAUTO, მაიავტო) in any text or voice: say "ცოცხალი განცხადებები"
   or "ბაზარი". build-index stops on it.
6. **App screens clearly visible**: large (the talked-about element pushed in), bright, readable at
   phone size, never a dimmed grey slab. Highlight with the band, do not grey out the whole screen.
7. **The looks rotate** in production order: since 2026-10-19 (after v113) FOUR light films then one dark, every FIFTH
   film black (light, light, light, light, dark ...; v110-v113 every fourth; the owner: "fewer black ones, white is prettier"; 2026-10-02 to v109 light,
   light, dark; until then dark, light, dark ...). Every new spec sets `"theme"` from
   `node tools/next-theme.mjs <id>` (ledger: specs/.themes.json; a redo keeps its original's look and does not count).
8. **Cars look premium**: Wire3D models in the `real` stance, refined lines, realistic proportions. The drawn cars (the
   kit's `Car`) are refined 2020s cars (rule 17) and never the same scene twice in a row (rule 25).
9. **Sharp, with pollar's lens** (after v11 on Instagram; this replaces the old "VHS clearly visible"
   with scanlines and grain, which read as blur on a phone): a crisp centre, a radial red / blue fringe
   that grows towards the edges, ON GRAPHICS ONLY (cars, charts, phones, maps, cards), never on text;
   short, subtle glitches on cuts only. References: out/pollar-reference-station.png, -paper.webp.
10. **The ending**: the quiet EndCard (mark, wordmark) with a short punchline or callback in plain
    Georgian as its `tagline` (HOOKS.md §3; since 2026-10-06 never an aphorism), spoken as the last line; optional quiet `note` ("… · VINARI+"). He likes
    these quote endings. **No call to action**: no store, no "გადმოწერე", no "download", nothing that
    pushes an install (build-index stops on it). **Every second film ends on the follow reminder instead**
    (2026-09-29: "people forget to follow"): the same card and last spoken line, one line of `ci/endings.json`
    ("კომენტარში დაწერე „ვინარი", ლინკს მოგწერთ. გამოგვიწერე." ...), in rotation; which films and how: The
    ending, below. Nowhere else in the film; the post's first paragraph is the same comment ask, added by
    tools/ci/publish.mjs (never by the spec).
11. **Subtitle low, graphics big** (his screenshot of the posted v11: out/ig-reference-v11.webp): the
    subtitle sits in the free band over Instagram's username row (frame y 1500), the graphics take the
    room it left (the content box runs to frame 1330, the pictures to 1440 with hard edges, 2026-09-27; since
    2026-10-06 a picture scene fills the whole frame instead: rule 19).
12. **White is white, red is red, green is green**: every white and grey neutral (R = G = B), the data
    colours real and vivid on both looks (Style).
13. **The film's Georgian in Mtavruli** ("on one line it is prettier", out/mtavruli-reference.webp):
    subtitle, meta bar, titles, labels, captions, chips, the tagline, all set at render time by `mtav()`
    (src/lib/format.ts); specs stay Mkhedruli (build-index forbids Mtavruli there). The designed cover is
    set the same way (the owner, 2026-09-25: the film's font "is very good" and the cover must not be
    another one): headline, tag and sub in condensed Mtavruli, the headline at the Title scene's weight 600.
14. **Music under every third film** (2026-10-02, "something quiet that suits it; let's see how it works"; until
    then none): from v63, every third film by its number (v63, v66, v69 ...) gets a calm synthesised bed at render,
    under the voice and the ASMR kit; nothing in the spec. Which films and which bed: Sound, Music. **PAUSED the same evening: the owner disliked the four beds ("random free stock music"); ci/music.json has no tracks, so no film gets one.**
15. **Car knowledge** (2026-10-05, the owner's new strategy: not only "a problem, then the app"): the category
    `carinfo` (მანქანის ცოდნა), every other dice roll, teaches one true, useful thing about cars
    (tips, how a part works, maintenance, history, myths, Georgian winters and roads, US and Japanese imports, gas
    cars). **Truth first**: only facts of the sourced bank (ci/carinfo-sources.json: its "lines" and each fact's
    source), every film a new viral hook, the knowledge said plainly with a clear picture, a takeaway.
    The app only when a fact links a feature; then the film ends on that feature's real screen. When the topic is a
    sound, the real recording plays first. Car knowledge, below. **Reel-style tips** (2026-10-06, after an Instagram reel
    that taught one driving habit and asked the viewer's own: "make videos like this"): about every second car-knowledge
    dice film is a practical tip that opens on a question about the viewer's own driving (HOOKS.md H15), a fresh hook
    every time.
16. **Never the same words** (2026-10-05, after a diagnostics film said the Russianism "ხოდოვოი" in line after
    line): „ხოდოვოი" is banned (say „სავალი ნაწილი"; tools/ci/words.mjs BANNED: build-index warns BANNED_WORD, and
    check.mjs stops the cloud check on it before the voice, so it costs no Gemini request), one content word in four lines of a film is a REPEAT warning,
    and a film that leans on three words the category's last five films leaned on is a KEYWORDS warning
    (tools/ci/words.mjs; the brief lists those words). Always new and varied.
17. **Pictures that explain** (2026-10-05): draw a car only when the car is the point, and then only a refined
    2020s car (raked windshield, slim light line, smooth low hood, small mirrors; never a boxy 90s shape: the owner's
    "modern cars only"). An explanation wants a clear diagram of the part (a Film scene), a real photo (`Photo`,
    public/photos, licensed) or the real app screen; a drawn car for decoration says nothing.
18. **Crazy car stories** (2026-10-06 evening, the owner: "a category that gives drive: crazy car stories from history,
    people who survive, invent or create marvels, brands, plot twists; I add the aura sound on TikTok; the extra
    categories on top"): the category `stories` (გიჟური ისტორიები), first in the list, every fourth dice roll. True,
    sourced stories with a twist from their own bank (ci/stories-sources.json), told in the buddy tone, the twist a hard
    fact before 70 % of the film, a legend said as one, the person or the car on the story's own licensed photos
    (credited), no app. Crazy car stories, below.
19. **Pictures full bleed** (2026-10-06, the owner on the first stories samples: "100x better than before", but not
    the hard crop band at the top and bottom of the pictures; then, on the subtitle over them: "neither shadow nor
    outline; as it is now is good; if the text sometimes does not show, that is fine"): a picture scene fills the
    whole 9:16 frame edge to edge, no crop line and no fade. Photos (Photo bleed and cover, PhotoStory bleed and depth,
    Split, a Twist with a photo, a KineticHeadline or BigNumber `bg`, a Callback of such a hook), the illustrated scenes
    (Call, Chat, Drive, Windshield, Dashboard, Person, Money, Impact, Pump) and a Film with `"look": "illustrated"`. The
    meta bar stays exactly as it is (the owner, the same night: "do not hide it; if it sometimes merges into the
    picture, fine"; there is no band behind it); the subtitle is exactly the subtitle (no shadow, no outline, no box) and
    sits on the picture, so a picture keeps a calm area under the subtitle line; only its COLOUR follows the picture
    under it (the owner, 2026-10-07, on v81's black line over a dark ship photo: "write the subtitles in white"): white
    over a dark picture, ink over a light one, measured along the film before the render (tools/subtone.mjs; Style,
    Subtitle line); the photo credit stays small on its knockout in the lower left (the licence needs it); a
    name strip, kinetic lines and chips keep their places in the safe zone; the picture itself runs under the platform
    UI. Data scenes, Phone and the other app pictures keep the clean field and the band (rule 11). **But a photo bleeds
    only when it FITS** (the owner, 2026-10-07, on v79's opening wipe of a tractor and a 350 GT: "the photos are spread
    full screen but you cannot make them out; when nothing shows, make them smaller again, in that earlier format"):
    covering its box must keep at least 60 % of the photo's width, so a portrait fills the frame and a square or
    landscape photo (or a small one) is shown WHOLE on the clean field instead, at its own aspect, by the render itself
    (src/lib/bleed.ts, scenes.json "_fit" / "fit"). Style, Pictures.
20. **The free idea** (`free`, თავისუფალი იდეა, second in the list; the owner, 2026-10-06: "when an idea comes to me,
    the video follows MY idea"): his typed message, his order and his lines, polished only by the Georgian check and the
    buddy tone; the pictures and the joins are ours, nothing else. No feature list; a feature only when his words name it
    (its facts, tier, never-list and screens; the brand's name alone is the mark, never a screen: FREE_SCREEN). A teaser
    stays his vague words. Never rolled by the dice, never made without a typed idea (`"needsTopic": true`: the site
    answers 400 "topic", prompt.mjs exits 2), and the gate still refuses what is not cars, Vinari, the page or its
    audience. The navigator and OBD lock words still apply (the site refuses them, 409). The free idea, below.
21. **Street words** (the owner, 2026-10-06: mild folk insults like ბოზი, უმაქნისი, ჩუჩელა are "more viral, people share
    them"; „მთლად უზრდელობაც არაა და არ ამახინჯებს"): the Georgian words of ci/street-words.json "allowed" (no Russian
    slang), only here and there (never two films in a row, at most one film in three, page-wide by number; the last
    street film's word not again), at most three a film, only in a "me" line or a made-up character's line, never at the
    viewer, a woman (ბოზი), a group or a real person (2026-10-07: the list grew to 73, mild and bitter, ნაძირალა, ჩათლახი,
    ნაბიჭვარი, ლეში and their kind, and a film that may say one should, plainly, from three random picks; group slurs and
    mother insults stay out), never in a real person's mouth (no invented or vulgar quote), never
    in the cover, the meta, the EndCard or the post. The heavy words and the slurs of its "banned" list (ყლე, განდონი and
    their kind) never. tools/ci/streetwords.mjs: BANNED_WORD and STREET lines (check.mjs before the voice, fatal in the
    cloud; build-index; filmlint; `--record`, which keeps the words in the ledger's "street" for the rotation). A free
    film says only the street words he typed. **His ask in general words** (2026-10-07: „უწმაწური ჰუკით დაიწყე“, „ცუდი
    დაწერე ჰუკი“, „უზრდელური“, „გინებით“; he cannot tell someone else to type the word): `streetAsk()` reads it, the brief
    offers three random allowed words, the hook (beat 0 or 1) must say one (STREET_ASKED), the frequency is then a note,
    a free film may say that one too; „გინების გარეშე“, „ნუ იგინები“ asks for none (STREET_NO).
    **The bleep** (2026-10-15: "the rudeness in the promo is good; when a swear is said, the bleep is good"): from
    ci/street-words.json "censor"."from" (v107) on, ONE heavy swear a film may be said cut off, never in full: a beat's
    say marks it „რა ტვინი მომი{bleep:ტყნეს}" (the marker ends its "|" chunk). tools/vo.py sends the voice only „მომი...",
    puts a 1 kHz bleep (0.42 s, soft edges, 4 dB under the voice) where the take stops and silences the voice under it;
    the subtitle reads „მომი#@%ეს" and src/layers/Subtitles.tsx pops the „#@%" with the bleep. A comic, human moment
    (a groan, Georgian street humour), in a made-up "me" or character line; never a scene text, the cover, the meta, the
    EndCard or the post; never a group slur, a mother insult or Russian mat ("censor"."never"), never at the viewer, a
    woman or a real person (CENSOR lines in tools/ci/streetwords.mjs). Films before v107 stay as they are.
22. **New pictures every film** (the owner, 2026-10-06 evening: "too much text on screen, the subtitles are there
    anyway", "mom calling is a phone ringing with დედა on it", and at 21:25: "the graphics must not be a fixed set that
    rotates: every film invents new graphics that fit it"): every beat SHOWS its moment (Story moments, below), on screen
    only punch words (3 a punch, 5 a scene, never the subtitle's words, no lists but a comparison: tools/ci/screentext.mjs),
    line art only for a diagram that points at something. The illustrated scenes and the kit (src/scenes/illo/) are
    references and parts, never templates: each film composes its own pictures for its own moments, and the checks
    refuse a picture or a composition a recent film showed (HOOK_REPEAT, MOMENT_REPEAT, IDEA_REPEAT, FEED_REPEAT).
23. **The aura openings** (the owner, 2026-10-06: "the stories open on the grindset meme: they insulted, dumped or
    doubted me, არაუშავს, bold move, საქმე მაქვს"; "hurt at the start, then a crazy comeback, then the cars"): HOOKS.md
    H21 (grindset) and H22 (heartbreak glow-up), mapped onto true stories by the truth table there (a dead person's shoes
    only with the sources' sense, a living one only reported, never an invented quote in a real mouth). **Moved on
    2026-10-07** (the owner: in the stories "it makes no sense"; "a person who solves a problem and explains it"): the
    aura openings now live in car knowledge (`carinfo`), every third film, a made-up persona with a problem, „არაუშავს",
    then the fix; the stories open with their own hooks. Never two films in a row on the page with the same one, a new
    put-down every time (ci/categories.json "openers"; prompt.mjs and `--record`). **A TikTok drop** (the owner, the same
    evening, on the first ones, v81-flood-ex among them: "not emotional, no aura, no good jump. A SAD opening and BOOM.
    „არაუშავს! ახლა თემას ვღეჭავ.": a STRONG transition, so the topic becomes THE topic and gives people drive"; he adds
    the trending sound): act 1, the hurt (beats[0] or [0..1], 2.5 to 4 s, `"style": "hurt"`, a picture that feels it,
    graded grey and slow by the planner), a `hold` of 0.2 to 0.4 (with the gap between the two takes about 0.8 s of
    near-silence; the picture inhales through it, pushing in and going dark), then the beat marked `"drop": true` opens on
    „არაუშავს!" slammed by its own scene ON the cut (a KineticHeadline "slam" whose line, or a scene `word`, has
    `"at": "0s"`; its subtitle chunk empty) on a hard cut (the `aura-drop` opening: a WHITE flash on both looks, a tear,
    the picture slamming in from 1.36x and shaking, a kick, `asmr-drop`), then act 2, the drive (`"style": "drive"` at the
    top, a new picture every 1 to 1.5 s: the glow-up first, then the topic). HOOKS.md H21; tools/ci/aura.mjs AURA_DROP
    refuses the flat shape (check before the voice, fatal in the cloud; `--record`).
24. **Car knowledge is a LESSON, the voice explains in one go, the features say the main thing** (the owner, 2026-10-12,
    after four explainer reels: "how well and simply they explain, one-minute ones, explained in detail but simply; in OUR
    style, change nothing of it"): a new `carinfo` film is a 45 to 60 s lesson (ci/categories.json `"lesson"`: asked under 45
    it is made at 60, the site picks 60 itself; a redo of a lesson keeps its length): ONE topic, the hook, why it matters,
    how it works in two to four steps with a picture each, one everyday example played to the end, the takeaway, in
    connected sentences of 6 to 12 words (LESSON_CHOPPY warns on fragments). HOOKS.md, The lesson; Car knowledge, below.
    **The voice** ("the speech must flow and connect, so the meaning reaches the person"): today's director's note is a
    friend explaining in one connected go (Voice). **Feature films** say what he wants understood (ci/categories.json
    `"explain"`, in the brief): the navigator needs no internet and has its own settings (unpaved roads, humour ...); the QR
    card is printed by you on A4, vertical or horizontal, with your number only if you type it (good for a girl who does not
    want strangers calling); diagnostics is one screen with the OBD scanner on top, and the engine sound (8 to 10 s: knock,
    squeal, grinding or hum, or "could not tell") with his friend's-father story (4 000 ₾ to learn what a noise was).
    **„ულიმიტოდ“** (the owner, 2026-10-15 and 2026-10-21: "the word sells", in EVERY film about an app feature): from v120
    every film of a category whose facts hold a true UNLIMITED fact (ci/categories.json `"unlimited": true`: parking, the
    VIN scanner, diagnostics, the OBD scanner, the navigator; general and whatsnew about those) says a form of „ულიმიტო“
    once, naturally, true to that fact; the QR card (its messages a day are limited), the calendar, the widgets, the auction
    and the documents never do; stories, car knowledge and the free idea keep their own words (check.mjs UNLIMITED, fatal
    in the cloud; tools/ci/words.mjs unlimitedRule). Only the verified facts (Vinari docs/deck/facts-2026-10-12.json, web/creator/vinari-ai.md) go into ci/categories.json.
25. **Colour on objects, the cars modern and varied** (the owner, 2026-10-12: "covers stay black and white as now, the
    backgrounds and the texts stay black and white, but here and there on objects add refined, harmonious colours that suit
    the film, to draw attention; not many"; "the cars are always the same scene, the models ugly, old, van-like: refined
    2020s cars and varied scenes; the stripe design itself is fine"): every film from v94 has ONE object accent pair
    (tokens.ts `ACCENT_PAIRS`: cobalt, ember, saffron, aqua, violet, copper; its number picks it, consecutive films differ,
    or the spec's `"accent2"`), `a` for the one thing the moment is about (the hero car's paint, the part a diagram
    explains, a warning light, a ring), `b` for a small second detail (the brake calipers, the route on a dash screen). One
    or two accented things a shot, never on text, the field, the meta bar, the subtitle or the cover (Style, Object
    accents). The data colours keep their meaning. The kit's cars were redrawn (a coupe-SUV, a modern hatch, a new
    electric crossover `ev`, four wheel designs, wide low end views, a narrow cabin from above), and Drive, Windshield and
    Pump pick their body, backdrop and framing per film when the spec names none (new backdrops coast, bridge, tunnel;
    Drive's `front` staging and framings; Windshield's passenger and console views): Story moments, Cars and places.
    **More colour, like the promos** (the owner, 2026-10-15: "the colours in the promos are better; mix more colours into
    studio films"): from v107 (tokens.ts `RICH_FROM`) four promo palettes join the rotation, every other film:
    `walnut-lamp` (lamp amber + window blue, the drawn world warm walnut), `night-violet` (night violet + warm window,
    warm lights over blue-violet shadows), `cobalt-day` (studio cobalt + warm sun, a clean lightly split world),
    `sunset-road` (sunset orange + dusk blue). Besides the pair they tint the illustration ramp `C.il0`..`il7` (RICH_WORLD),
    so the whole drawn picture carries the colour; people are lit by `a` with `b` as their second light. Still one
    coherent look per film: one palette all film, the field, texts, subtitle and cover stay black and white, the data
    colours keep their meaning. Films up to v106 render exactly as made.
26. **Motion 2** (the owner, 2026-10-12, after Claude's motion design in the Opus update on Twitter: "we want that power
    too"): from v94 (ci/fx.json `motion2From`) the camera, the cuts and the words move on springs: impacts anticipate and
    swing, transitions land past their rest and settle, deeper parallax, letter-by-letter reveals, two new cuts (slide,
    iris). Earlier films render as made. Motion, Motion 2.
27. **The phone mockups in real 3D** (the owner, 2026-10-12: "the videos' 3D motion graphics, I hope you did not delete
    them; and the mockups: those will be in 3D too, refined"): Wire3D and src/scenes/three stay as they are; from v94
    (src/lib/device.mjs `PHONE3D_FROM`) a `Phone` is a real 3D iPhone in three.js (src/scenes/three/phone3d.tsx): a rounded
    titanium frame, thin black bezels, the Dynamic Island, side buttons, the REAL capture as a crisp full-resolution display
    (its own colours: the white stays the capture's white), a soft studio light for both looks (a soft shadow on paper), a
    slow elegant camera. The same props; the new `"staging": "hero"` is a product reveal from the side. Earlier films, their
    redos and translations keep the flat device; `"mode": "3d"` / `"flat"` forces one; the loupe is always flat. From
    v96 (`PHONE_MIX_FROM`) the two take turns (the owner: "keep the old moving mockups too, and the 3D one now and then,
    sometimes this, sometimes that"): an even film is 3D, an odd one the classic device. From v96 (`PHONE_WHOLE_FROM`)
    every phone is drawn WHOLE (the owner: "never cut the mockups, cut ones don't read well"): the flat device shows its
    whole screen and rounded foot, the 3D iPhone its whole body, no push past that (bands and taps still point); a Drive
    scene keeps the car whole too (side wide | pan, rear wide | high). App screens, 3D phone.
28. **Promo grade** (the owner, 2026-10-19: "every studio film must be as powerful as the promos": the QR, navigator and
    diagnostics promos, 100K views in 21 h with no ads): from v113 (src/lib/kit.mjs `KIT_FROM`) a Film composes the PROMO
    KIT (src/scenes/kit/: the 3D car and phone, the garage, the street, rooms, silhouette people, the reveal, the step
    explainer, text motion, cuts, charts, the app's icons; src/scenes/film/_template.tsx lists every part) with the promo
    METHOD: the problem lived in a real scene with street humour, the reveal, then the clear step-by-step on real screens
    in whole phones; a new picture every 1.5 to 2.5 s (screentext `MIN_SCENES_KIT`); strokes 3 px and up, text 34 px and
    up (filmlint); no pencil sounds and no room tone (silent from v113). check.mjs reviews the stills themselves
    (STILL_REPEAT against the page's earlier films, specs/.stills.json; the edges and the subtitle band: rule 29). Each film
    keeps its own topic and length: it is never an ad. The free-week line on every second film (the owner, 2026-10-21:
    the quote films from v120, v120, v122 ...; the beat right before the EndCard, check FREE_WEEK), never in a crazy
    story or a car-knowledge film (`"skip": ["stories", "carinfo"]`): ci/endings.json `freeWeek` (one switch). Earlier films render as made.
29. **The frame guards** (the owner, 2026-10-19, after frame-by-frame checks of v100-v110 and the older TikTok films: the
    subtitle hidden again and again behind a standing man, a driver's hand or the wheel, a road graphic, or lost in clothes
    of its own colour; cars and phones cut by the frame (v110's car off the right edge 21.7-23.3 s, v106's car front); a
    shot held still four seconds; a blurred tilted phone; a cartoon "?" thought bubble. His rules: phones, cars and
    graphics always whole; the subtitle always readable; refined, never cartoonish). From v113 (src/lib/guard.mjs
    `GUARD_FROM`, the upgrade's first film; every earlier film, its redos and translations render as made; the input prop
    `"guard": true` forces them on for a before-and-after still):
    (a) **The subtitle always reads.** Promo draws it above everything (zIndex), and tools/subtone.mjs measures the picture
        under its words: FIRST the colour that reads (white or ink; a guarded line switches as soon as its own reads on
        less than 90 % and the other reads better), and ONLY where NEITHER colour reaches 3:1 on 85 % of its box
        (`PLATE_KEEP`: a busy, mixed picture under the words; the owner, 2026-10-19: "I don't like the boxes: black or
        white first, a box only when even that does not read", so a plate is RARE) the line sits on a
        SOFT PLATE for its whole time (layers/Subtitles.tsx `PLATE`: the line's opposite colour, paper white at 0.88 under
        ink, near-black at 0.66 under white, rounded, its edge feathered by a glow of itself, never an outline or a hard
        box); unmeasured, a line has NO plate (input prop `"subPlate": true` forces one for a before-and-after still).
        A plate is never a design choice: keep the band clean (below) so the colour alone reads. This overrides "no shadow, no box" (rule 19 and the Subtitle
        line, below) from v113 on. Its BAND is reserved (`SUB_BAND`: frame y 1440..1560 over the line's 133..887, stage
        y 1380 down, x 170..855): no person, hand, wheel, phone, car, card or diagram stands in it; only the picture's
        ground, sky, wall or road. The library scenes and the kit keep out of it BY THEMSELVES: Person "solo" and "think"
        on a full-bleed picture draw the WHOLE figure, its feet at stage 1340 (`FOOT_CAM`: a library scene's own camera
        push and the breath carry 1340 to about 1370), on one of seven framings the film picks per shot
        (`WHOLE_FRAMINGS`), a pair stands there too; the Cabin's wheel (Windshield, Call "mount", Impact "crack") is
        drawn big and low, its hub and spokes under the band and its ring passing BESIDE the line (the inner edge outside
        x 170..855 on every band row), the hands at ten and two over the band with their forearms leaving the frame at its
        sides; the phone in a hand (Call "hand", Chat "thread"/"group": illo/handset.tsx `heldPlace`, `HandGrip`) stands
        between the meta bar and the band, its forearm leaving to the right; Dashboard's rim sits 44 px higher; Call
        "desk" lies further up the table; the kit's grip (HeldPhone, StepShot) keeps its sleeve's foot over the band.
    (b) **The edge guard.** A phone, a car, a card, a chart or a display stays WHOLE inside the frame; only a fast entry or
        exit (under 0.4 s, `FAST_S`) may touch the edge. The placements fit themselves inside `WHOLE_STAGE` (stage x
        100..980, y 370..1370): `fitSpan` / `fitWhole` / `slideInside` (src/lib/guard.mjs), at render time `keepBox` /
        `keepFoot` (src/lib/guardrt.ts). Library scenes: Person "full"'s parked car (980 long at x 760: fitted to 880 at
        540, the man moved with it in proportion), Pump's car (a nozzle shot is framed like the station's, everything
        moved left until the car's nose is in; its 2.3 x macro "close" keeps the crop, the car there is scenery), Impact
        "bump"'s two cars (smaller, car A already in the frame), Drive "side"'s car (at most the frame's width less the
        camera's drift; "pan" crosses only that room; "close" and "low" were wider than the frame), Impact's and Call
        "missed"'s phones (`phonePlace`, foot at `FOOT_CAM`). The kit: `atFoot` slides a phone's body inside the sides, `riseFoot` ends over
        the band (`FOOT_MAX` 1370), `StepShot` puts its label under the meta bar (`LABEL_TOP` 384: v110's label covered the
        meta bar's words) and its phone between the label and the band, its rise starting 10 frames before the cut so the
        phone crosses the band in under 0.4 s, `PhoneReveal` the same, `personAt` steps a person
        BACK along the camera's view until the feet are over the band (never lifted off the floor), `fitCarCam` widens a
        3D car's camera until the whole car fits (give that one camera to everything the shot draws), the cards, toasts,
        sheets, step dots, chat bubbles and charts (kit/stage `Card`, kit/ui, kit/chart) slide themselves inside, the
        Cluster's display is whole unless the shot pushes in past 1.2 x on one lamp (a macro).
    (c) **No shot holds still past 2.5 s** (`STATIC_MAX_S`). A shot longer than that breathes (Promo's `Breath`: a 3.5 % push
        over the shot about FRAME (540, 1230), `BREATH_Y` in frame px: a foot over the band stays over it, the label's top
        under the meta bar), whatever its camera (a step shot under a band camera has no planes to move: v110's held four
        seconds); the quiet EndCard keeps still. The breath is the floor, not the answer: check measures stillness WITHOUT
        it and asks for an event (STATIC_HOLD, a note). A whole flat phone (Phone.tsx) rests 92 px over the band instead of
        44, so its slide-in and the tilt's nearer foot stay out of it.
    (d) **Never a blurred or side-on phone, never a thought bubble.** Person `"staging": "think"` (THOUGHT_BUBBLE) and a
        Phone's `"hero"` (PHONE_TILT, the side-on reveal) are build-index ERRORs (the render draws them safely anyway: no
        cloud; the phone upright); tools/ci/fx.mjs puts no whip and no flash next to a Phone shot; filmlint refuses a
        thought bubble or cloud by any name, a blur filter on an element that holds a kit phone, a phone past 35 degrees
        of yaw, and a literal foot (`y`, `foot`, `ground`) of a person, a car or a step shot in the band.
    **The check** (tools/check.mjs, tools/ci/guards.mjs): the whole film every 6 frames, quarter size, through Promo's
    input prop `"guardProbe"`: `"obj"` draws only the things marked `OBJ` (lib/layer.ts) on key green, `"fig"` only the
    people, hands and wheels (`FIG`), `"pic"` the picture without the subtitle, the meta bar and the breath. Marked: every
    phone (Phone, PhoneDesk, the kit's Phone3, illo `Handset`), every car (illo `Car`, the kit's `Car3`, CarNight's car),
    Wire3D's model, the kit's cards, toasts, sheets, step dots, bubbles, charts, the Cockpit and the Cluster's display;
    every person (`Figure`, `SilFigure`, the kit's Man and Woman), every hand (illo `Hand`, `HandGrip`, the kit's grip),
    the Cabin's wheel and Dashboard's rim. A Film's own card or diagram carries className={OBJ}, its own person FIG. In the
    "obj" pass the 3D canvases drop their contact shadows and floors (guardrt `shadowOf`): only the thing is measured.
    EDGE_CUT: an OBJ at the frame's edge on three samples in a row (0.4 s); SUB_BAND: an OBJ or a FIG in the band as
    long WHILE A LINE IS ON SCREEN (Promo marks those probe frames, `PROBE_MARK`: a phone rising through the band
    between two lines hides no word); STATIC_HOLD: a 2.6 s window of one shot where no frame moves more than `STILL_MAD` from its first, without the
    breath (the EndCard may hold). EDGE_CUT and SUB_BAND are problems in the cloud from v120 (`GUARD_STRICT_FROM`; lines
    to fix before that, as STILL_REPEAT), STATIC_HOLD always a note, all notes on the Mac. The stills' clean-field
    EDGE_CUT (stillreview.py) stays as the fallback for what nobody marked; alone it MISSED v110's car: it read one
    still a shot (at 70 % of it), only when the picture band's four corners were one flat colour (v110's sky over its
    ground: 242 over 208, so it never looked), only the left and right sides, and only as a note. Scenery (the traffic
    ahead, parked rows streaming by: Car `scenery`) is not guarded.
30. **The treatment first** (2026-10-26, plan step 1.3: studio films made the way the three viral promos were): the studio
    films were one long step that invented, scripted, coded and fixed lints at once, with the idea
    only "8 angles in your head", calm narrator questions as hooks and library scenes for most beats. Now a film starts from
    a written treatment (ci/prompt.md step 1, `ci/promo-dna.md`: the promos' shot lists, why they worked, the rubric): three
    pitches scored, the best kept, written into the spec's `"treatment"`; the hook an event with its sound by 2 s, Act 1
    worse three times, the turn, the reveal, three or more real screens in tap order, the payoff with the same hero. A film
    may write up to three Film files (90 KB together), and no library Person, Drive or Windshield stands in its hook or
    reveal. With no length asked a film is 45 s. tools/ci/treatment.mjs (TREATMENT, HOOK_SOUND, HOOK_CALM, HOOK_LIBRARY,
    REVEAL_LIBRARY, SCREEN_FLOW), run by check.mjs before the voice: fatal in the cloud and from v131 on the Mac; a redo
    and a free film keep only TREATMENT fatal. The endings (the quote, the follow reminder, the free-week line, no store
    CTA) stay as they were until the owner decides.
31. **Today's app only** (2026-10-26, plan steps 1.1, 1.2 and 1.4, after the owner's 23 Oct complaint about the old OBD hub
    and the covers made of film frames): the retired captures moved to public/screens/_retired (RETIRED; docs/content.md,
    Content rules), every phone shows one status bar painted at render (src/lib/statusbar.ts), and the cover is
    purpose-built (docs/spec.md, `cover`; SKILL.md Cover; tools/ci/cover.mjs).
