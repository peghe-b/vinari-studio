# Content and words

> Moved out of CLAUDE.md on 2026-10-26 (plan step 2.5: the cloud context slimmed to the rules). Nothing here was
> dropped. Section names in the text (Voice, Style, Motion, Sound, Story moments, The ending, Cloud studio ...) and
> "rule N" point to the other files of docs/ (CLAUDE.md's map says which); the linters named here still enforce them.

## Content rules (from Marketing/VINARI — app brief.md, all hard)

- Never invent a number. A car-knowledge film (`carinfo`) takes its figures only from its bank facts, as written,
  with whose figure it is said or shown (a `source` line: "WHO", "gov.uk", "matsne.gov.ge"); a UK, US, Canadian or
  Japanese rule is theirs, never Georgian law. The app's own figures come only from the brief: customs 2020 · 2.0 L petrol 3 610 ₾ today,
  9 615 ₾ from 1 January (valid for 2026 declarations only, so such a spec gets
  `"validUntil": "2026-12-31"`); 29/29 match with rs.ge; 187 measured months (Geostat); the
  live-listing median ("შუა ფასი" of "ცოცხალი განცხადებები"); 11 mechanic types; reminders 7/3/1 days,
  09:00 (the default; settings move it between 06:00 and 12:00) and 19:30; 9 533 trouble codes; VINARI+
  $9.99 a month or $49.99 a year with a 7-day free trial on the yearly plan (iPhone charges dollars: the app shows a lari
  estimate at today's rate, so a film says the dollar price, „თვეში ათ დოლარზე ნაკლები“, never a fixed lari price),
  a month about 7 liters of petrol, the year about one tank (ci/categories.json has the exact wording).
- **Never name the listing site** (the owner, 2026-09-24): no "myauto", "myauto.ge", "MYAUTO", "my auto",
  "მაიავტო", "მაი ავტო" in say, show, meta, scene text or the title, even as a source line. Say
  "ცოცხალი განცხადებები" or "ბაზარი". `tools/build-index.mjs` stops on it (demos too), and on a scene
  that draws it by default.
- Never say the app shows owners, fines, finds a car by plate, gives a "full history", makes a
  "დიაგნოზი", reads a trouble code from the car (you type it), or name an Android date. No percentages
  or user counts about the app (a car-knowledge fact keeps its own sourced figure). No feature that is not in
  ci/categories.json.
- Free: one car, its price, its own two dates (the inspection and the LPG cylinder) with their
  reminders, the home screen widgets and the trouble-code lookup. Customs, the calendar (its grid,
  your own entries, insurance, oil and tyres), QR card, wallet, parking, documents, engine sound, the
  mechanic questions, chart and auction history are VINARI+. Never call them free. A widget is free but
  shows only what the plan shows (more cars, calendar entries, the parked spot are VINARI+).
- Never read out prices that appear on screens: they are live and change.
- No em dash (—) anywhere on screen, one "!" at most (a hook; never "!!"), no italics. Georgian must sound like a friend talking
  (Say it simply, below).
- Never `.toUpperCase()` Georgian, and never write Mtavruli into a spec: the film's Mtavruli is made at
  render time by `mtav()` (src/lib/format.ts), drawn from Noto Sans Georgian. `capsLatin()` is safe.
- Screens are never edited, only cropped, zoomed, dimmed (the one exception: the status bar, which every phone of the
  studio repaints at render time to ONE bar, 9:41, full signal, Wi-Fi and a full battery, src/lib/statusbar.ts; the file
  itself stays the capture). Do not show test data.
- **Retired screens** (2026-10-26, after the owner's 23 Oct complaint about the old OBD hub): `public/screens/_retired/` holds
  the captures the app no longer looks like: 21-obd-hub (two full-width rows; today two square tiles), 13-diagnosis
  („ხოდოვოი"; 13-diagnosis-108 is the fixed one), 01-home and 10-features (the 1.0.3 home and menu), 03-calendar-day (a
  test entry), 05-customs, 06-market and 16-chart (the old bottom bar, a live myauto count). No film shows one again:
  build-index refuses them, the brief lists them as old, and the cloud check stops on RETIRED. Until a fresh capture,
  obd shows only 22-obd-result, reminders only 02-calendar, auction 04-wallet and 09-history: the rest is told with
  photos or a Film scene, never a drawn app screen. New: `17-nav-lanes` (the navigator with the 1.0.5 lane strip and the
  speed limit) and the real CarPlay captures `public/screens/carplay/f18-*.png` (800×480: the cover's `carplay` kind).
- **The captures' manifests** (2026-10-27, the covers): `public/screens/screens.json` gives each capture the day it was
  added and the App Store version it was last checked against ("verified"; the nine of 24 Sept wait for one simulator
  session against the current build), and what reads on it ("says", for COVER_FACT). `public/screens/regions.json` names
  the parts of a capture a cover may enlarge (the "detail" loupe, the "phone" tag): its box, the key text's box and font
  size in capture px, measured on the file. A cover enlarges only a named region of a verified capture
  (COVER_REGION, COVER_STALE_SCREEN), and only when its key text reaches 96 px on the cover (COVER_ZOOM). The cover's ten
  compositions and who may use which: SKILL.md Cover and src/cover/comps.mjs (stories: polaroid, stat, timeline,
  quote, versus; humour: quote, versus, stat, steps; and so on per category).
- **No call to action** (the owner, 2026-09-24: it reads as marketing and pushy). No store name (App
  Store, ეპ სტორი, Google Play, Play Market, Эп Стор), no "გადმოწერე" / "ჩამოტვირთე" / "დააინსტალირე",
  no "download" / "install" / "get it on" / "link in bio", no "скачай" / "установи" / "загрузи" in say,
  show, meta or scene text, and no store line on the end card: `tools/build-index.mjs` stops on them
  (and warns on "ახლავე", "დღესვე", "სცადე", "try it"). The film ends on the EndCard with a short
  punchline or callback; the last beat's `say` is that line (the `tagline`) itself. The follow reminder that
  ends every second film instead (The ending, below) asks for no install or store (it asks to comment „ვინარი" and
  promises the link in a DM, the owner 2026-10-02): it is the one allowed
  exception, on that card only, never in another beat, the cover or the post (build-index stops on it there).
- Paid features are labelled quietly: the meta of the beat that shows a VINARI+ screen reads
  "<feature> · VINARI+" ("კალკულატორი · VINARI+", "ჩარტი · VINARI+"). 16-chart is the paid chart screen (its films are
  no longer made in the cloud studio since 2026-10-06). 17 to 25 are the 1.0.4 screens (2026-10-06, from
  Marketing/07 — 1.0.4 განახლება: 17-nav-drive, 18-nav-lock-screen, 19-nav-streets-offer, 20-nav-streets-settings,
  21-obd-hub, 22-obd-result, 23-home-104, 24-home-tip, 25-menu-104), flattened on white at 1080×2346; 21 and 22 were
  588 px captures, so they are soft: keep them small in the frame or take sharper captures. None of them is shown in a
  film before the App Store has 1.0.4 (the cloud's check.mjs refuses them; on the Mac, ask the owner). From 1.0.4,
  23-home-104 and 25-menu-104 replace 01-home (the 1.0.3 home with the old bottom bar) and 10-features (the old menu)
  in vin, widgets, docs and general (ci/categories.json "after"); until then the old two stay, as 1.0.3 is what people
  have.
- Never read out a listing count off a screen either ("22 განცხადება" on 16-chart is live).
- No App Store badge is drawn (and, with no call to action, no store is named either). **The store page** (the owner,
  2026-10-14: "show now and then that VINARI is on the store, so people know"): `26-appstore-page` is VINARI's real App
  Store page (a 585 px capture scaled to 1080×2346, 2 px trimmed a side: soft like 21 and 22, so it stays at the device's
  size), ci/categories.json `"storeScreen"`, in no category's screens. A film may show it in ONE Phone beat where a line is
  about the app itself or having it, now and then: never in car knowledge or a story, a free film only when his words are
  about the app or getting it (its `"words"`; request.json `freeScreens`), never when one of the page's last 2 films
  (`"gap"`) showed it (tools/ci/prompt.mjs offers it in the brief, `storeOk`; request.json `"storeScreen"`). Whole, like
  every phone; highlight only the icon (`{"x": 0.04, "w": 0.32, "y": 0.265, "h": 0.15}`) or the name (`{"x": 0.38,
  "w": 0.57, "y": 0.27, "h": 0.095}`); never a tap or a highlight on the blue Get button (x 0.395..0.583, y 0.375..0.412),
  never a push onto the age, chart and developer row (y 0.45..0.53: a live rank and the developer's real name, never
  said) or the store's own screenshots (y 0.57..1). It is a picture, never a call to action: the voice and every text
  still never name a store or say get, download or install (build-index stops on it). check.mjs (VS_CI=1) refuses it
  where the brief did not offer it, in a second scene, and a tap or a highlight on Get (STORE_SCREEN).


## The free idea (`free`, the owner 2026-10-06; rule 20)

- **The category**: ci/categories.json `free` (თავისუფალი იდეა, second, right after the stories): `"needsTopic": true`,
  `"dice": false`, no `"words"` (a topic typed without a category never lands here), `"allfacts": true`. The site
  (web/api/studio.js `NEEDS_TOPIC`) answers 400 `{error: "topic"}` to an empty one (a redo is fine without one: its
  original's idea is in the ledger), prompt.mjs exits 2 without a topic, and both keep the navigator and OBD lock words.
- **The brief** (ci/prompt.md): the gate passes a message to the page's audience (Vinari, this page and its films, the
  people who watch them, a teaser) besides cars, and still refuses anything else; step 1's free block makes his lines the
  script, in his order (his questions stay questions), with the pictures and the joins ours; no "new problem" block, no
  formula refused.
- **The app**: only the features his words name (each category's own `words`, as a typed topic is read; prompt.mjs
  `namedFeatures`), with their facts, tier, never-list and today's screens, plus the home and the menu when he asks to
  see the app itself (request.json `freeFeatures`, `freeScreens`). The brand's name alone is the mark and the wordmark.
  check.mjs (VS_CI=1) and `--record` refuse any other screen (FREE_SCREEN, tools/ci/visual.mjs `screensShown`: the spec
  and its Film file read as text).
- **Recording**: never refused for its formula, its aura rotation or an opening line made of his own words (notes); the
  cover title, closing line and angle stay new. check's "short by" line is fine for a free film (his lines decide).


## Say it simply (the owner, 2026-09-24: "მაღალფარდოვანი"; 2026-09-25: "აბდაუბდა", the idea came across, the Georgian did not)

**Explain it so anyone gets it (the owner, 2026-10-02).** Georgians did not understand some films: the hook named the
problem, then the film never said plainly what the feature does. Every film: (1) a NEW everyday problem, not the one
the feature's earlier films used (a reminders film is not the inspection again while the oil, the mechanic, tyres,
insurance, the LPG cylinder, the licence or parking are unused); (2) right after it, ONE plain sentence of what the
feature is for ("კალენდარი იმისთვისაა, რომ დროზე შეგახსენოს"); (3) the feature SHOWN working on the real screen, step
by step (Phone with focus, tap, highlight, callout), and its result (e.g. the Notification arriving). One concrete
example played to the end beats three features named. Test: someone who never saw the app knows after one viewing
what it does and how. ci/prompt.md carries the same rule for the cloud.

Write what a Georgian friend says out loud in the car, not what an office prints and never a translation: "შენ",
short sentences, everyday verbs, the verb last.

**The Georgian check** (every `say` line, the cover title and the post, before the first `check.mjs`: after that
every changed line costs a Gemini request). Say each line aloud as if telling a friend in the car and rewrite it when
a friend would not say exactly these words in this order, when a word heard once can be taken for another, when it is
nouns with no verb, or when it reads like an English or Russian sentence in Georgian words (then do not patch it: say
the thought again, from scratch, in Georgian). Then read the whole film aloud once: one friend talking, not slogans.
`node tools/build-index.mjs <id>` voices nothing and warns on the word table below and on long sentences: run it
before the first check. The rest is the ear. **The post adds, it never repeats** (the owner, 2026-10-07: v79's post was
its voice retold, "slop"): it says what the film did not (a detail it left out, the context, a take, one question), in
other words; POST_ECHO (tools/ci/words.mjs `postEcho`: a run of 4 of the voice's content words in its order, or more than
half of the post's content words from the voice, a story's names left out) is a build-index warning for this film or a
new one, a `--record` refusal and fatal in the cloud check before the voice (a note on the Mac: most older posts did it).

- One thought per sentence: **7 words or fewer** (9 at most, counted on `show`, a number is one word); in the voice
  **40 letters or fewer** (55 at most: one breath). Two sentences per beat at most. **A crazy story is told, not listed**
  (the owner, 2026-10-07: v79's four-word fragments said nothing to him): its sentences run up to 12 words and 70 letters
  (build-index's story allowance), connected (ჰოდა, მერე, ამიტომ, მაგრამ, და), never a run of 1 to 3 word fragments
  (STORY_CHOPPY; Crazy car stories). So is a car-knowledge **lesson** (a `carinfo` film of 45 or 60 s, rule 24): the same 12
  words and 70 letters, connected, a run of fragments a LESSON_CHOPPY warning (build-index).
- The verb ends the sentence and the news sits right before it. A "რომ" or "თუ" clause goes first: "ბიდს რომ დებ,
  ბოლო ფასი იცი?"
- The viewer acts, in the informal singular: ჩაწერ, ნახავ, დააჭერ, გადაიხდი, გახსოვს?, გჭირდება. Never "თქვენ", the
  "-თ" plural (ნახეთ, იცოდით), "მომხმარებელი".
- Verbs, not nouns ("დაითვლის", not "გამოთვლას ახორციელებს"). An imperative takes the future after it ("ჩაწერე…
  დაითვლის", "დაამატე… ნახავ"); a present takes a present. Never a future and a present in one sentence.
- Say who does it when the doer changes ("ვინარი", "ტყუპები"); "მას", "მათ", "ის" for the app or the cars sound bookish.
- Buddy, not slang (the owner, 2026-10-06, HOOKS.md Buddy tone): spoken Georgian is welcome (ხო, აბა, მოიცა, ჰოდა, ნახე,
  წარმოიდგინე, სერიოზულად, ეგაა, მორჩა), „ძმაო" once a film at most; no Russianisms (ვაფშე, ტიპა, კაროჩე, ბრატ), no slang
  spelling (ძაან, რაა), no aphorism, poster line or riddle, no hype word (ლეგენდარული, წარმოუდგენელი, საოცარი). The drivers'
  own words are welcome: ჩამოყვანა, ბიდი, განბაჟება, ტექდათვალიერება, კარობკა, მალიარი. Street words are the one exception
  to "not slang" (rule 21): a mild one now and then, in a "me" line, never in the cover, meta, EndCard or post.
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
| **ხოდოვოი** (banned: BANNED_WORD, fatal in the cloud) | სავალი ნაწილი; its mechanic: სავალი ნაწილის ხელოსანი |
| ხელთ | ხელში, ჯიბეში, თან |
| როგორც წესი | ჩვეულებრივ |
| ერთი შეხებით | ერთი ღილაკით, ერთი დაჭერით |
| პატიოსნად | პირდაპირ |
| მიაწვდენ, შეატყობინებ | გააგებინებ, მიწერ |
| აღარასდროს, ნაცვლად, ვარაუდობს | აღარ, მაგივრად, ჰგონია |
| გახლავთ, ამრიგად, აქედან გამომდინარე, თავის მხრივ, რის შედეგადაც | (drop it), მოკლედ, ჰოდა |
| ლეგენდარული, წარმოუდგენელი, საოცარი, გასაოცარი, უპრეცედენტო, კაცობრიობა | (show it: the detail is the hype) |
| ჭორიკანა, დარდი (poetry) | the plain fact, a little cheeky |
| **ვაფშე, კაროჩე, ტიპა, ბრატ** (banned the same way; „ძმაო" is fine since 2026-10-06, once a film) | plain Georgian |
| **ყლე, განდონი and their kind; slurs** (ci/street-words.json "banned": BANNED_WORD, fatal in the cloud) | nothing; a mild word of its "allowed", in a "me" line (rule 21) |

**Never the same word over and over** (the owner, 2026-10-05): a content word in four lines of one film (five in a 45 s
film, six in a 60 s one: tools/ci/words.mjs `REPEAT_BY_LENGTH`; the voice's sentences, the scenes' text, the cover title;
the follow line left out) is a REPEAT warning: say it another way, show the
thing instead of naming it again, or let "ის" carry it. And a film that leans on three or more words the category's last
five films leaned on (in two of their lines, or in their opening or cover) is a KEYWORDS warning: find new words and a new
picture. Both are tools/ci/words.mjs (a rough stem: "საბურავი", "საბურავის", "საბურავებზე" are one word; function and
number words never count; a feature category's own words, like "კალენდარი" in a reminders film, do not count against its
last films, a car-knowledge film's do). The cloud brief lists the last films' words in "Made before".


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
