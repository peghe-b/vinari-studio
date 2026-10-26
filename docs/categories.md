# Car knowledge and crazy car stories

> Moved out of CLAUDE.md on 2026-10-26 (plan step 2.5: the cloud context slimmed to the rules). Nothing here was
> dropped. Section names in the text (Voice, Style, Motion, Sound, Story moments, The ending, Cloud studio ...) and
> "rule N" point to the other files of docs/ (CLAUDE.md's map says which); the linters named here still enforce them.

## Car knowledge (`carinfo`, the owner 2026-10-05)

Films that teach a driver one true, useful thing (a tip, how a part works, maintenance, history, a myth, a trending
problem, Georgian winters and roads, US and Japanese imports, gas cars), so the page is worth following, and the app
only where it truly fits.
- **The bank**: `ci/carinfo-sources.json` (the category's `"bank"`): `"lines"`, one `"<id>: <plain Georgian>"` each
  (545 facts in 25 themes), and `"facts"` by id: the theme, the exact English statement, the source page(s), the
  licence note, `app` (the category a film about it may end on, or null; a link to a retired or still locked category
  counts as none), `sounds` (real recordings it may open with, best first, or null where no honest recording exists)
  and `tip` (true: a practical habit a driver can try tomorrow; 194 of them, the theme `driving` beginning as UK Highway Code
  advice checked on gov.uk on 2026-10-06; part D of 2026-10-12 added 324 facts and the themes maintenance, buying, tech and fines). The lines are not in ci/categories.json: the general, whatsnew
  and no-category briefs read that file whole, and the bank would make it about five times longer. Free, reliable sources only (Wikipedia, gov.uk, US federal
  sites, Transport Canada, WHO, NHTSA's bulletin archive, matsne.gov.ge for Georgian law; from 2026-10-12 also Canadian and
  Australian state handbooks, the EU, auto clubs, safety bodies, makers' own pages and Copart's own definitions, facts only), each fact checked on its page
  and restated in our own words. Facts dropped on purpose are listed there with why. Keep the source's hedges ("can",
  "probably", "family lore") and whose rule it is ("in the UK", "US guidance"); a Georgian line never says more than
  its English statement. Adding a fact: check it on its page, restate it (no run of the source's words), add its line
  and its entry, a unique id. A review on 2026-10-05 corrected 43 (the clutch, the 1911 mirror, the child seat, the
  brake wear squeal, Resolution No. 80 being methane only and the app having no methane date, and others).
- **The offer** (tools/ci/carinfo.mjs): the brief never sends the whole bank. It offers three themes used longest
  ago (never used first; a per-request order among ties), ten facts each, without the facts the category's last 12
  films used; or, when his typed idea names themes (their `words`), up to two of them with up to 16 facts each (a
  recently used fact marked), led by up to 5 facts whose own Georgian shares his rarer words (`closest()`, whatever
  their theme: the theme cap never drops the fact he means); a redo gets its original's themes. Each line keeps its
  id, `(tip)` when it is one, its source site, its app link and its best usable sound. `"tipEvery": 2` (the owner,
  2026-10-06): when the category's last film used no tip, the dice's offer is tips only and the brief says the film is a
  tip film. When his idea needs a fact the offer lacks, the cloud
  Claude may Grep the bank's lines; anything not in the bank is refused (the never-list).
- **A typed idea's category** (prompt.mjs `fromTopic`): carinfo's `words` are subject words only (no "რატომ",
  "იცოდი", "რჩევ", "tips": an idea about the app went to carinfo, whose brief forbids naming the app). carinfo never
  takes an idea that names the app, and a tie with a feature goes to the feature ("ზეთის შეცვლა დროზე": reminders).
- **The lesson** (the owner, 2026-10-12, rule 24; HOOKS.md, The lesson): a new car-knowledge film is 45 to 60 s,
  ci/categories.json carinfo `"lesson": {"min": 45, "length": 60}`. prompt.mjs makes a new film asked under 45 (the site's
  default 20, or the dice landing on it) at 60 (request.json `"length"` the film's, `"lengthAsked"` and `"lengthFrom":
  "lesson"` what the site sent; check.mjs takes the request's length over the job's env), and a redo asked under 45 keeps
  its original's length when the original is a lesson. The site (web/studio.html CATS carinfo `lesson`) dims 15, 20 and 30
  while the category is picked and sets 60 (back to the earlier length when another topic is picked). The brief's
  carinfo block is the lesson's: the hook, why it matters, two to four steps each with its own picture (a diagram Film of
  the part moving step by step, a real photo, the sound, a sourced number), one everyday example played to the end, the
  takeaway, one connected voice (sentences of 6 to 12 words, LESSON_CHOPPY), at least 16 scenes in 60 s.
- **The film**: a scroll-stopping new hook (a belief broken, a surprising figure, a question every driver asked, or the
  real sound first; a tip film opens on a question about the viewer's own driving, HOOKS.md H15, and its post may end on
  one open question for his answer, never a second "write in the comments"), the knowledge said plainly with a clear picture per beat (a diagram of the part as the Film scene,
  a real photo, the sound, a true number with its `source`), and one takeaway. Whose rule it is: a UK, US, Canadian
  or Japanese rule is theirs; Georgian law only where the fact says so; Resolution No. 80 is methane (CNG), never said
  about LPG. Hooks follow every rule of HOOKS.md (§5 has a car-knowledge row).
- **The app only when it fits**: when a fact the film uses has an `app`, the last beat before the EndCard shows that
  feature on its real screen (that category's screens, facts, tier and never-list); otherwise the film never names or
  shows the app. The ending rule is the usual one (every second film the comment and follow line).
- **Recording** (`--record ... --facts <ids>`): required for carinfo, 1 to 6 bank ids. It refuses a fact one of the
  last 12 carinfo films used (his own words may ask for it: `--from-idea`), a Phone screen or the app's name with no
  linked fact, no app screen with one, a sound fact with no real- cue in the first two beats, and a CC BY cue while
  credits are off; and, for a new film without `--from-idea`, a tip film whose beat 0 `say` asks nothing, and an
  opening that shares two content words (tools/ci/words.mjs stems) with one of the category's last 10 openings. The ledger keeps `"facts"`, so the next films take others, and `"from": "dice"` on a dice film.
  check.mjs runs the same rules again before the voice, on the spec as it is then (FACTS lines, fatal in the cloud),
  since the spec may change after the record.
- **The dice**: a category with `"diceEvery": n` comes up on every n-th dice roll (carinfo: every other), counted on the
  ledger's dice films; the other rolls take the least-used category among the rest, as before. A category that opens
  late (`"release"`: obd and nav at 1.0.4) counts at least as many films as the least-used of the others, so it joins
  the rotation at the bottom instead of catching up (with 0 films against 3 to 11 it would have taken 6 feature rolls
  in a row).


## Crazy car stories (`stories`, the owner 2026-10-06)

The owner, that evening: "add a category that gives drive: crazy car stories, facts from history, people who do crazy
things, survive, invent or create marvels, brands, plot twists; I put aura sounds on them on TikTok. Hooks less serious,
a buddy tone. Move the extra categories to the top." The voice-over stays as it is and the music rule is unchanged.
- **The bank**: `ci/stories-sources.json` (the category's `"bank"`, tools/ci/stories.mjs): 60 true stories ranked by TikTok
  potential, each with `facts` (English statements with their source pages; Wikipedia always paired with an official,
  museum or press page where one exists), `ka` (setup, escalation, twist, payoff in plain Georgian, true to the facts),
  `plot` (the twist in one line), `hooks` (three seeds, shapes only), `ending` (a shape), `legend` (null, or the popular
  version and how a film says it), `note` (respect, a death), `photos` (its own licensed photos) and `carinfo` (the
  car-knowledge facts on the same subject), and `names` (2026-10-07: the names a first-time listener must hear, each
  with the word starts that count as saying it, a person's other cues, and when: by beats[1], from the twist on,
  anywhere, or only "said with who they are" if said; storyTelling reads them). `"lines"`, one `"<id>: <title>. <twist>"` each, are for Grep. The research
  checked every URL; a fact review the same evening cut every Georgian claim no fact states (a year, a place, a title, a
  motive, "everyone", a superlative) and added a few facts checked on the page named. `"photos"` by key is the licence
  manifest (Commons page, file, author, licence and deed, the templates read on the page, attribution, credit, date).
- **The photos**: 198 new `public/photos/story-<story>-<n>.jpg` (plus the four of the motion layer), Wikimedia Commons
  public domain, CC0, Attribution, CC BY or CC BY-SA only; "no known copyright restrictions" files and the research's
  medium-risk files were left out. Each one's photos.json line carries the licence fields and the Georgian credit the
  story scenes show on screen and publish.mjs adds to the post. A photo that fills the picture band only when blown up
  more than 1.5 times is marked small, and one wider than 15:16 wide (Style, Pictures, the fit): both are shown whole
  instead of full bleed (a wide one still fills a Split stack's wide panels); the brief marks each photo tall, wide
  (with the stack panel it fills) or small. Rebuilding the bank and the photos from the
  research: the builder lives in the session's scratchpad (stories/build-bank.mjs), not in the repo; edit the bank by hand.
- **The offer** (`offerStories`): his idea's stories (their own Georgian words: a name, a brand), a redo's original's,
  else the best-ranked stories no film of the last 30 told, one of each kind (four). A story whose subject a car-knowledge
  film among the last 12 used is left out too, and the other way round (`crossTold`: Bertha Benz, the first speeding
  fine, the Model T, the Volvo belt, Harroun's mirror are in both banks).
- **The film**: ONE story; a buddy hook (HOOKS.md H16 to H20, H01, H02; since 2026-10-07 never an aura opening, H21 or H22: those moved to car knowledge); the arc of HOOKS.md Story films (setup, it gets
  crazier, the twist, the payoff, the callback); the twist a hard fact, its beat marked (a `Twist` scene or `"twist":
  true`), starting before 70 % of the spoken words, then a `hold` of 0.6 to 0.8 s (his TikTok sound hits there); a legend
  said as one; the person and the car on the story's own photos in PhotoStory, Split, Timeline, Twist or a
  KineticHeadline / BigNumber `bg` (never `Photo`: it shows no credit); the last line a callback, a loop, a punchline or
  one question; no app; an injury or a death in one calm line. The motion layer gives it the stamp or loop ending
  (ci/fx.json `"stories"`). **Told so a stranger gets it in one viewing** (the owner, 2026-10-07, on v79-tractor-man:
  „ვერაფერი გავიგე, სრულად მოყვეს"; it said „ეს კაცი" and never „ლამბორგინი", „ენცო" with no word of who he was, the
  company's name only on the Twist card, and nine sentences of four words): the person or the brand by name by beats[1],
  every other person the first time with who they are, the name the payoff lands on said out loud, the story in
  connected sentences of 6 to 12 words. The post says what the film did not (POST_ECHO, Say it simply).
- **Recording** (`--record ... --story <id>`): required; kept in the ledger's `"facts"` (one id), so publish.mjs and the
  checks carry it unchanged. It refuses a story one of the category's last 30 films told or whose subject a recent
  car-knowledge film used (his own words may ask for it: `--from-idea`; a redo keeps its original's), the app shown or
  named, a twist not marked or after 70 %, another story's photo, a licensed photo in `Photo`, and (a new film without
  `--from-idea`) an opening that shares two content words with one of the last 10 openings. A small or wide photo in a
  full-bleed staging is a note since 2026-10-07 (`photoNotes`: the render shows it whole by itself).
  check.mjs runs the same rules again before the voice (STORY lines, fatal in the cloud) and prints where the twist lands.
  The listener test (stories.mjs `storyTelling`, inside `storyRules`): STORY_NAMES (a "names" entry never said, or the
  lead not by beats[1]), STORY_WHO (a person's first beat says no other cue: given name, nationality or a role word),
  STORY_PAYOFF (the name the story lands on not said from the twist on), STORY_CHOPPY (the sentences, the last line left
  out, average under 5 words, or 3 of 1 to 3 words in a row). Tested 2026-10-07: v79 fails all four; v78 says Lauda by
  beats[1] but fails STORY_WHO (Hunt) and STORY_CHOPPY (its H21 opening is six fragments): notes on the Mac.
- **The dice**: `"diceEvery": 4`. With carinfo's 2 the two interlock (prompt.mjs `dice()`: when both are due, the more
  frequent takes the roll): stories, carinfo, a feature, carinfo, stories ... carinfo keeps every other roll, stories every
  fourth, a feature every fourth (it had every other before). A typed idea or a chosen category is never the dice.
