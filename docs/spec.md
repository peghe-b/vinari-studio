# Making a film and the spec

> Moved out of CLAUDE.md on 2026-10-26 (plan step 2.5: the cloud context slimmed to the rules). Nothing here was
> dropped. Section names in the text (Voice, Style, Motion, Sound, Story moments, The ending, Cloud studio ...) and
> "rule N" point to the other files of docs/ (CLAUDE.md's map says which); the linters named here still enforce them.

## Make a video

1. `node tools/next-theme.mjs <id>` → the look; write `specs/<id>.json` (format below) with that
   `"theme"`. Copy an existing spec as the starting point.
2. `./make.sh <id>` → voice (`tools/vo.py`) → index → subtitle colours (`tools/subtone.mjs`, then the index again)
   → render → glitch check (`tools/flicker.py`) →
   loudness (two-pass, -10 LUFS / -1.5 dBTP) → `out/<id>.mp4` + `out/<id>.cover.png`. That is the
   delivery. (`--light`, `--silent`, `--formats` exist, only on the owner's request.)
3. Look before shipping: `tools/lock.sh node tools/stills.mjs <id> [frames...]` writes half-size PNGs
   of every scene to `out/stills/`; read them. `--light` / `--dark` forces the look (out/stills/<id>-<look>-<frame>.png):
   check both. A silent demo (`demo-*`, `"narration": false`) takes its timeline from the letters (tools/fake-timeline.mjs),
   never from vo.py, so a demo costs no Gemini request (`specs/demo-variety-v94.json` dark, `-v95` light: the 2026-10-12
   cars, scenes, accents and motion 2). `./make.sh studio` opens the live preview. The 8 GB M1
   runs one Chrome job at a time: every render and still goes through `tools/lock.sh` (make.sh does).

A 30 s render takes about 1.5 minutes on this M1 (about 3 when the glitch check forces a second,
`--concurrency=1` pass). The voice is one Gemini request per film, kept as one continuous take, cached in
`tools/.vo_cache`: an unchanged film costs nothing, any changed `say` line one request for the whole film (Voice).


## Spec

```json
{
  "id": "v11-example",              // file name, composition id: [a-z0-9-]
  "voice": "gemini:Algieba",         // the house voice; female "gemini:Achernar" (the only voices he uses)
  "rate": "+0%",                     // edge-tts voices only (+8..+12%); a Gemini voice takes "style" instead
  "gap": 0.22, "sentenceGap": 0.3,   // pause between beats / sentences voiced apart (a Gemini take keeps its own)
  "leadIn": 0.1, "tail": 0.35,       // silence before the first word / after the last (defaults)
  "accent": "brand",                 // "brand" = the red data colour, "yellow" = pollar yellow
  "accent2": "ember",                // the OBJECT accent pair (rule 25); leave it out: the film's number picks one
  "theme": "light",                  // from `node tools/next-theme.mjs <id>`: four light, then one dark ...
  "cover": {"title": "ერთი მანქანა, | ორი ფასი", "kind": "card", "card": {"type": "numbers", "rows": [...]}}, // the Reels cover
  "music": null,                     // leave it null: every third film gets its bed at render (Sound, Music)
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
  20 s ≈ 210, 30 s ≈ 310, 45 s ≈ 465, 60 s ≈ 620 (tools/ci/screentext.mjs LETTERS, the brief's). Every sentence end costs a pause (the take's own breath; `sentenceGap` for
  edge-tts). `tools/vo.py` prints the real length; trim words, not speed, when it runs long.
- `{daysToJan1}`, `{today}`, `{year}` are filled at build time in `show` and scene strings, never in `say`.
- `leadIn`: seconds of silence before the first word (default 0.1). Use 0.6 to 1.0 when a sound or a
  motion should hook before the voice (v5 uses 0.97: two knocks of the Wave play alone first).
  `tail`: silence after the last word (default 0.35). Both are read by `tools/vo.py`.
- `music`: leave it absent or null. Every third film from v63 gets its bed at render (Sound, Music: build-index adds
  it); the others have none, the sound being voice and ASMR (no room tone since 2026-10-14). `{"src", "volume", "duck"}` sets a bed of the
  spec's own (it wins); `false` keeps a music film without one. Either only when the owner asks.
- `cutSfx`: the sound on every scene cut, default `"asmr-air"`; `null` = silent cuts.
- `accent2` (rule 25): the film's object accent pair, `cobalt` (blue + amber), `ember` (burnt orange + steel blue),
  `saffron` (saffron + lavender), `aqua` (aqua + ochre), `violet` (violet + gold), `copper` (copper + sea blue), or
  `"none"`; from v107 also the promo palettes `walnut-lamp`, `night-violet`, `cobalt-day`, `sunset-road` (rule 25: they
  tint the drawn world too). Leave it out and the film's number picks (v94 to v106 `n % 6` of the six, from v107
  tokens.ts `ROTATION_107`: a promo palette every other film; before 94 none). Set it when the film's subject asks for
  a colour (saffron for an amber warning light, aqua for a coast film, walnut-lamp for a warm evening at home,
  night-violet for a night street, sunset-road for an evening drive).
- `motion`: 1 or 2 forces the motion level (Motion 2); leave it out (ci/fx.json `motion2From`).
- `theme`: `"dark"` (the black film) or `"light"` (the app's light look, Style). Every new spec sets it
  from `node tools/next-theme.mjs <id>`, which reserves the next look in production order (light, light,
  light, dark ... since 2026-10-19; ledger specs/.themes.json). A hook variant or a translation keeps its original's look.
  build-index warns when a spec has none.
- `cover`: the designed Reels cover (`src/Cover.tsx`, `src/cover/`; the owner 2026-09-24, rebuilt 2026-10-26 after the
  drawn roundabout of №119 and the drawn gauge of №122): **purpose-built, NEVER a frame of the film** (the Freeze of the film
  is gone from the code). Always the light paper #F3F3F3 and black and white, whatever the film's look (the owner,
  2026-10-19), in the layout of the covers he approved (Marketing/19 CarPlay, 21 and 23 cards, v118's polaroid): the mark
  and wordmark at (72, 300), a „● VINARI+" pill, a hairline, the headline (`title`, 2 short lines, `|` breaks; Mtavruli,
  weight 600, at most 112 px, only shrunk), then ONE picture by `kind`: `card` (`card` {type "bars" or "numbers", 1 to 3
  rows}: a white data card from the film's own numbers, app icons only, a hand-drawn marker on the row that matters),
  `screen` (`screen` {src, tilt, mark}: a CURRENT capture whole in a tilted iPhone, the marker on its row, the studio's one
  status bar), `carplay` (`screen` {src}: a real CarPlay capture, public/screens/carplay, in the car's display, the
  approved tilt) or `polaroid` (`photo`: the story's photo(s) as instant photos, a person's face first, the CC BY credit on
  the foot). `note`: one optional caption line. Everything sits inside y 240..1680 (the 3:4 of the profile grid).
  Guards: build-index and check.mjs lint it (tools/ci/cover.mjs: COVER_KIND, COVER_CARD, COVER_SCREEN, COVER_OLD_SCREEN,
  COVER_MARK, COVER_TEXT, COVER_FRAME; in the cloud a new spec without `kind` fails), and the rendered pixels are checked
  (COVER_COLOUR: any coloured pixel; COVER_GRID: ink outside the grid's 3:4 or at a side) by check.mjs on its still and by
  covers.mjs after the render, where a broken cover is replaced by the brand card, loudly, so the film still goes out.
  An older spec without `kind` gets the story's person photo, else its last real screen, else its photo, else the brand
  card; its `frame`, `hook` and `tag` are ignored. The brief lists each earlier film's "cover picture" (kind and capture)
  so the next one takes another. SKILL.md, Cover.


## The ending: a quote, or the follow reminder (`ci/endings.json`, `tools/ci/ending.mjs`)

The owner (2026-09-29): people forget to follow the page, so some films say "don't forget to follow" at the end
instead of the closing quote. **The owner, 2026-10-02: every second film from v63, and the line first asks to comment
the keyword „ვინარი" (the page then sends the app's link in a DM: Meta Business Suite's comment-to-message
automation, set up by the owner), then to follow** ("კომენტარში დაწერე „ვინარი", | ლინკს მოგწერთ. გამოგვიწერე.").
A line is 45 to 52 letters (about 4.5 s), each card row at most 34 characters. And **every** film's post text starts
with `postLine` of ci/endings.json as its own paragraph (tools/ci/publish.mjs adds it to post.json; the spec's
"post" never has it, so build-index's no-brand, no-CTA post rules still hold for what Claude writes).
- **Which films**: the rule is the film's number n (the `v<n>-` of its id): a follow film when n ≥ `from` and
  (n − `from`) is a multiple of `every` (from 63, every 2: v63, v65, v67 ...; until 2026-10-02 from 44, every 3). Deterministic: the number is fixed
  before the film is written (prompt.mjs `next`, pinned by resolve.mjs), so a retried run ends the same way. A redo
  keeps its original's ending, read from the original's tagline, and a film already made (its spec committed) keeps
  the ending it was made with; hook variants and translations copy their base (a translation translates the
  reminder too); demos never. It counts films made, not films posted. What a film's ending IS is always read from
  its spec: its tagline is a line of `follow` or `retired`.
- **Which line**: exactly one of `follow`, never one of the last `recent` (2) distinct lines earlier films ended
  on, all categories together; the least recently used is offered first. It is the EndCard `tagline` and the
  last beat's `say` and `show`, word for word and with the `|` where the card breaks it (`cardLine()` puts it
  at the best space: after a comma or a full stop, never after "და"); so the card shows it and Promo drops the
  subtitle. No `style` on that beat (it would cost a second Gemini request), `hold` 0.3 to 0.5, and no VINARI+
  or price `note` under it (a hedge is fine). The lines repeat by design, so the "same closing quote as vN" rules
  skip them.
- **What a line says**: follow the page, never the app's paid plan, whose Georgian name is also "გამოწერა" (the
  app says "გამოწერის მართვა"): so a line says "გამოგვიწერე" (us) or names the page ("გვერდის გამოწერა"), never a
  bare "გამოწერა შენზე" next to a feature. Informal შენ, 45 to 52 letters (about 4.5 s: the E slot of a quote and a little more),
  nothing pushy, no em dash, nothing that puts a phone in a driver's hand.
- **The brief** (cloud) puts `- ending:` in the request list and, on a follow film, the offered lines in step 3
  (flag `follow`); "Made before" shows a follow film's ending as "end: the follow reminder". On the Mac,
  `node tools/ci/ending.mjs <id>` prints the same (with no id: the next free number).
- **The checks**: `endingProblems()` (tools/ci/ending.mjs) refuses a follow film that ends on anything but an
  offered line, a last beat that does not say it, a `style` or a VINARI+ note on it, more than two card lines of
  34 characters, and a quote film whose tagline or last line asks to follow; and, in every film, a reminder
  anywhere else (another beat, meta, scene text, the note, the cover, the post). check.mjs runs it before the
  voice (fatal under VS_CI=1 with `ENDING` lines, a note on the Mac); `--record` refuses the same. The Claude step
  may still leave a line after its fix rounds, so the workflow's gate step runs `node tools/ci/ending.mjs --gate
  <id>` after it: a reminder outside the ending stops the run before the voice (build-index stops the render on
  it too, as on any call to action); a wrong ending (a quote on a follow film, a reminder on a quote film, a
  rotation, a note) is a `::warning::` on the run, and the film still comes out.
- **What counts as asking to follow** (`reminderIn()`): the verb of "გამოწერა" also orders a car or parts from
  abroad ("მანქანა ამერიკიდან გამოიწერე"), writes out a fine ("ჯარიმა გამომიწერეს") and names the paid plan
  ("VINARI+ გამოწერით"), so it asks only as "us / me" (გამოგვიწერე, გამომიწერე), as "you" (გამოიწერე, გამოიწერო)
  in a film that is not about bringing a car or parts from afar (in a customs film that is ordering the car), next
  to a page or a platform, or with "forget" ("გამოწერა არ დაგავიწყდეს"), in a clause that names nothing ordered (a
  car, a part, a country, an auction, customs, a fine) and is not about the plan; plus a bank line, a hashtag of the
  verb, "follow us", "don't forget to follow", "subscribe.", "подпишись (на нас)". Not "подпишите договор" (sign
  the contract).
- **The ledger**: `--record` adds `"ending": "follow"` to a follow film's line; publish.mjs writes it from the spec
  itself (so the line resolve.mjs adds when `--record` never ran has it too).
- **Changing it**: edit `ci/endings.json` only (`every`, `recent`, the lines). To restart the count, set `from` to
  the next free number; films already made keep their ending (a redo follows its original's tagline). A line
  taken out of the bank goes to `retired`, so the films that used it still read as follow films.
