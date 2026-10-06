# HOOKS: how a Vinari video opens

Load this file before writing a new `specs/<id>.json`. The companion files are `CLAUDE.md` (pipeline, scenes, pitfalls)
and `../Marketing/VINARI — app brief.md` (the only source of facts). Where this file and the brief disagree, the brief wins.
Georgian examples are spec-ready `show` strings: `|` splits subtitle chunks, digits are allowed, and every chunk is at most 24 characters.
In `say`, spell the numbers out in Georgian words.

The owner's newest word (2026-10-06): **the buddy tone** (ძმაკაცური ტონი). The hooks and endings read high-flown
(„მაღალფარდოვანი, არ გავარდება"): every line is what a friend says across the table, a little cheeky, never a poster line, a
riddle or an aphorism (Buddy tone, below). Still: plain everyday Georgian (Say it simply), true, never the listing site's name
("myauto" in any spelling: say "ცოცხალი განცხადებები" or "ბაზარი"), and every film closes on the quiet EndCard with a punchline
or a callback, never a call to action (§3). The voice stays as it is: the words carry the tone. Crazy car stories (the category
`stories`, the same day): H16 to H20 and Story films (§5). The aura openings (the owner, the same evening: the grindset meme and
the heartbreak glow-up, every other stories film): H21, H22 and their truth table.

## 0. Evidence in one screen (what the platforms and research actually say)

- The hook window is tiny. Meta measured 1.7 s average dwell per mobile feed item and recall from 0.25 s of exposure [S5].
  TikTok says to state the proposition in the first 3 s and put the hook in the first 6 s [S1], and that 90 % of ad-recall impact is in the first 6 s [S2].
  YouTube reports a Shorts-only "viewed vs swiped away" metric, which is the hook's scorecard [S8].
- Meta names three hook types that work in Reels: value promise, statement of intent, and question/invitation [S4].
  Google's ABCD says to jump straight in, use tight framing, support the story with audio and on-screen text, show the brand early, and use surprise or intrigue [S6].
- Sound matters. TikTok users rate sound as core to the app (Kantar) [S2][S3]. Voiceover or music lifts results on Meta [S4] and on Shorts [S7].
  A quiet, close ASMR sound is still sound, and it is also a pattern interrupt in a loud feed (judgment, untested).
- Captions carry the message when the sound is off [S5][S7]. TikTok links text overlays to more view time [S2].
- Faster scene changes pull viewers in early (TikTok with Neuro-Insight) [S2].
- Watching to the end and rewatching count. Finishing a video is a strong TikTok signal [S10]. Instagram weights watch time and sends [S11].
  Shorts count every replay as a view since 2025-03-31 [S9]. So a loop ending is worth building.
- Curiosity comes from a small, specific gap (Loewenstein) [S12]. Curiosity gaps backfire when too vague or too concrete, so the best hook is
  specific about the topic and withholds only the answer [S13]. Sharp numbers (3 610, not "about 4 000") read as measured [S14].
- Data explainers keep it simple: a hard question, clear graphics, clear narration, and a personality with no presenter on screen
  (The Economist [S15], Vox short-form [S16]). Talking to the viewer like a friend beat a classic ad in a Google test [S22].
  Car brands win with the buyer's own pains [S17].
- Georgia: TikTok ad reach is 2.57 M, or 89.5 % of adults, Facebook reaches all adults, and Instagram 64.4 % (DataReportal, Oct 2025) [S18].
  Publish the same cut to all three. Most imported cars come from the US [S19]. Drivers say "ჩამოყვანა", "განბაჟება", "ბიდი",
  "ტექდათვალიერება" [S20][S21]. Their fears are hidden damage and surprise costs [S20].
- Unverified (do not rely on these): "47 % of campaign value in the first 3 s" (the primary source was not found) [S23],
  "TikTok judges at 1.5 s", "63 % of top-CTR ads put the message in 3 s" [S24], and the swipe-away benchmarks [S8].
  pollar.news itself is a text news service. The "pollar look" in this studio is our own codified reading of it [S25].

## 1. Hook formulas (H01 to H22)

Every hook has the same skeleton. **Frame 0 is composed AND moving** (2026-10-06): everything with `at: 0` is already composed and the meta bar
is already typed, because frame 0 is also the cover and the loop point; in a film with the motion layer the camera is already moving on frame 0 and
the first event lands by 0.6 s, a second by 1.5 s (the opening templates: CLAUDE.md, Motion). The voice starts at about 0.15 s. **Aim for chunk 0 at 15 characters or fewer** (about 1.2 s),
so that **chunk 1 starts a visible event by about 1.5 s**: a flip, a land, a strike, a pin or an inflating dot. A chunk 0 of 16 to 24 characters
moves the event to about 1.7 to 2.2 s. That is fine only when the frame-0 scene already moves on its own (Wave, a LineChart or Wire3D draw-on,
Grid ticking, a Calendar countdown) or when chunk 0 itself says the number. Promo already plays `asmr-sub` on frame 0 and
`asmr-air` on every cut, and every scene sounds its own events (CLAUDE.md, Sound): add a spec `sfx` cue only for an event
no scene sounds by itself, never a second `asmr-sub`. Timings below are at 30 fps. **Frame 0 is a picture, never a
text card** (the owner, 2026-10-06: "mostly text, the subtitle is there anyway"): a punch word may sit on it.

### H01 · Number cliff (the same thing, two true numbers)
- Why it works: one object and two sharp numbers make a gap the eye sees before the ear explains it [S12][S14]. A number that changes is motion at frame 0.
- Frame 0: `SplitFlap` with `from` "3 610 ₾" on the board, `to` "9 615 ₾", `at: 1`, `tone: "down"`, `label` "2020 · 2.0 L · ბენზინი",
  and meta "განბაჟება". Alternative: `Compare` with the first bar `at: 0` and the second bar `at: 1`.
- 0 to 1.5 s: f0 board plus meta and Promo's `asmr-sub`. f5 is chunk 0. At about f36, chunk 1 rolls the flaps and they land (SplitFlap plays `asmr-flap` per card and `asmr-land`: add nothing).
- `ერთი მანქანა. | ორი ფასი საბაჟოზე.`
- `31 დეკემბერს 3 610 ₾. | 1 იანვარს 9 615 ₾.` (the SplitFlap label says the declaration date)
- `იგივე მანქანა. | ერთ ღამეში +6 005 ₾.` (6 005 = 9 615 − 3 610, which matches `januaryJump` in the code)
- Must: set `"validUntil": "2026-12-31"`, name the car in the meta or label, and explain the declaration year in the body. Never write "ორი განბაჟება"
  (it is heard as "clearing the car twice").

### H02 · Belief flip (the number you trust is wrong)
- Why it works: it contradicts a number the viewer already uses (the average), and the chart proves it with no claim needed [S15][S16].
- Frame 0: `StripPlot` with `dots: 21`, `markersAt: 0` (mean and median both visible), `outlierAt: 1`, and `source` "სქემა · ცოცხალი განცხადებები".
  Alternative: `Title` with `strips: true`.
- 0 to 1.5 s: f0 swarm plus both lines. At chunk 1 the far-right dot inflates and the mean slides after it (`asmr-swell`, and `asmr-pop` on the dot).
- `საშუალო ფასს | ნუ ენდობი.`
- `ერთი ძვირი მანქანა | საშუალოს აძვირებს.`
- `საშუალო ფასს | ერთი მანქანა ატყუებს.`
- Must: StripPlot is schematic. Never say the dots are real listings and never put ₾ on them. Never name the listing site: the
  source line says "ცოცხალი განცხადებები". Say "შუა ფასი", never "მედიანა".

### H03 · The question you can't answer exactly
- Why it works: self-reference plus a small gap. The viewer almost knows, and the honest answer is "not exactly" [S12]. This is Meta's question hook [S4].
- Frame 0: `Calendar` with `today` outlined, one `marks` day, `countdownTo`, and `at: 1`. Alternatives: `MapPin` (the pin drops at chunk 1) and `LineChart`.
- 0 to 1.5 s: f0 month plus the today ring. At chunk 1 the days light up one by one (`asmr-tick-fine`) and the mark lands (`asmr-land`).
- `ტექდათვალიერება | როდის გაქვს?`
- `დაზღვევას | ვადა როდის გასდის?`
- `ზეთი ბოლოს | როდის გამოცვალე?`
- Must: ask a real question, never a rhetorical one ("გინდა ფულის დაზოგვა?" is banned). Show the app's answer within 3 s.

### H04 · Sound first
- Why it works: feeds autoplay with sound [S4]. A close, quiet sound is a pattern interrupt, and sound drives TikTok [S2][S3].
- Frame 0: `Wave` with the waveform already scrolling, `labels` [კაკუნი, ჭრიალი, გუგუნი], and `pick` on a later chunk.
  Alternative: `Notification` with `lock: true`, the banner `at: 0`, and `asmr-notif` at f0.
- 0 to 1.5 s: f0 `asmr-sub` plus the moving wave. Wave sounds its own recording (a soft knock on every spike for `pick: 0`),
  so give the spec `"leadIn": 0.6` to `1.0` and two knocks play alone before the voice (v5 uses 0.97).
- `ეს ხმა რა არის?`
- `ძრავში რაღაც აკაკუნებს?`
- `ვიღაცამ შენი ბარათი | დაასკანერა.` (QR card; Notification plus `asmr-notif`)
- Must: never use a fake engine recording. Never name a part or say "დიაგნოზი". Say "ხასიათი". Wave never draws a duration.

### H05 · Honest refusal
- Why it works: ads overclaim, and this one lists its limits, which buys credibility. The brief says to make it a strength (brief §5).
  Each strike is one visual event per chunk.
- Frame 0: `List` with a `title` and item 0 composed. Items strike on later chunks (`asmr-strike`). Alternative: `Title` with `strips: true`.
- `Vinari სამ რამეს | არ გეტყვის.`
- `ჩანაწერი რომ არ ჩანს, | ავარია არ ყოფილა?` (answer: "არა. ბაზა სრული არაა.")
- `ხუთიდან ორ VIN-ზე | ჩანაწერი საერთოდ არაა.` (brief: on 2 of 5 VINs the page does not exist)
- `ნომრით მანქანას | ვერავინ იპოვის.`
- Must: owners, fines, the full auction history and plate search may appear ONLY as struck "won't do" items, in the brief's words and with its reason.
  Never present them as a feature.

### H06 · Scale zoom-out (pollar squares)
- Why it works: area equals value, which makes a sum physical. The pull-out is the reveal.
- Frame 0: `Squares` with the first item (3 610) filling the frame and the second `at: 1`. Use `asmr-air-long` under the pull-out and `asmr-land` when it settles.
- `3 610 ₾ ბევრი გგონია? | იანვარში ეს დაგხვდება.`
- `ეს დღევანდელი თანხაა. | ეს კი 1 იანვრიდან.`
- Must: use only the brief's pair (3 610 / 9 615), put the car in the meta, and set `validUntil`.

### H07 · Proof counter
- Why it works: a count is a micro open loop (where does it stop?), and a sharp final number reads as measured [S14].
  Proof up front earns trust for a paid feature.
- Frame 0: `Grid` (`n: 29`, filling from chunk 0, `tone: "up"`), `Stat` (`value`, `landAt` on the spoken word), or `LineChart` (`series: "geostat"`, `at: 0`).
- 0 to 1.5 s: cells or digits tick (`asmr-tick-fine` / `asmr-count-roll`) and land on the word (`asmr-land`).
- `29 შემთხვევა. | 29 დამთხვევა.` (say: "ოცდაცხრა შემთხვევა. | ოცდაცხრა დამთხვევა.")
- `187 თვე | ერთ ხაზზე.`
- `11 ტიპის ხელოსანი. | შენ რომელი გჭირდება?`
- Must: say what was counted by the next beat (the rs.ge calculator, Geostat, mechanic types).

### H08 · The price isn't the price (hidden subtraction)
- Why it works: loss aversion aims at the importer's first fear, surprise costs [S20]. Each item is a new event.
- Frame 0: `Wire3D` `ship-cargo-a` with a `tag`, or a `List` of costs. Alternative: `Title` with `strips`.
- `აუქციონის ფასი | ბოლო ფასი არაა.`
- `ბიდს რომ დებ, | ბოლო ფასი იცი?`
- `ოკეანე, პორტი, | საკომისიო, განბაჟება.`
- Must: use no amounts except brief figures. `05-customs.jpg` shows budget and max bid (30 000 ₾ / $6810) plus a live NBG rate:
  never read those aloud and never call that screen offline.

### H09 · Show it working (statement of intent)
- Why it works: this is Meta's statement-of-intent hook [S4] and ABCD's "jump in, product early" [S6]. A real screen is proof.
- Frame 0: `Phone` with `14-vin-scanner` already on screen, a `tap` at "0.6s", and `asmr-camera`. Alternatives: `QRCard` (`scanAt: 1`, windshield seen from outside)
  and `Phone` `06-market`.
- `VIN-ს ფოტოს უღებ, | Vinari თვითონ კითხულობს.`
- `მანქანა დაამატე | და დღევანდელ ფასს ნახავ.` (the free feature)
- `ასე გამოიყურება | შენი ბარათი გარედან.`
- Must: screens are only cropped, zoomed or dimmed. The phone is already in place at f0, not sliding in from black.

### H10 · Before you ... (a trigger moment of the viewer's own)
- Why it works: prevention framing tied to a real decision window (bidding, shipping, selling). The urgency is theirs, so it is not fake.
- Frame 0: `Phone` `04-wallet` or `09-history`, a `Calendar` before the date, or the moment itself (a Film scene).
- `ბიდის დადებამდე | ეს დაითვალე.` (the wallet: budget in, the max bid out)
- `მეორადის ყიდვამდე | VIN-ით ჩანაწერი ნახე.` (the auction damage record; "not found" never means "never crashed")
- `გრძელ გზაზე გასვლამდე | ორი საათის წესი გაიხსენე.` (car knowledge, hc-break-every-two-hours, the UK's advice)
- (Until 2026-10-06 the examples were customs and the market price, which the cloud studio no longer makes.)

### H11 · The moment you know (POV)
- Why it works: recognition ("that's me") is ABCD's Connect [S6]. Carwow built a series on car pains [S17]. Talk like a friend [S22].
- Frame 0: `Wire3D` with two models (one blocking), `Title` `strips` with the masked phone number "5•• •• •• ••" (as in v3), or `MapPin`.
- `გზა გადაგიკეტეს, | პატრონი არსად ჩანს.`
- `შუშაზე ნომერს ტოვებ? | ყველა გამვლელი ხედავს.` (the frame must show a phone number, since "ნომერი" also means the plate)
- `მიწისქვეშა პარკინგი. | რომელ სართულზე დატოვე?`
- `ძმაკაცი ერთს გეტყვის, | გადამყიდველი სხვას.`

### H12 · The rule you didn't know
- Why it works: a specific, checkable rule is high-value novelty [S13]. The consequence number is the payoff.
- Frame 0: `Stat` or `Title` strips with the rule's key words, or the part's diagram (a Film scene).
- `M+S წარწერა | ზამთრის საბურავი არაა.` (winter-tyres-3pmsf-vs-ms)
- `საბურავზე დაწერილი წნევა | მაქსიმუმია.` (tyre-pressure-label-not-sidewall: the right figure is on the car's own label)
- `ბრიტანეთში კარს | მოპირდაპირე ხელით აღებენ.` (hc-door-far-hand: a UK rule, said as the UK's)
- Must: say whose rule it is (a UK, US or Canadian rule is theirs; Georgian law only where the fact says so), and the reason
  or the consequence lands in the next beat. Customs (on the Mac only, the cloud studio no longer makes it since
  2026-10-06): the age counts from the declaration year, the right-hand-drive ×3 is the excise only for the named ordinary
  car, never "განბაჟება სამჯერ" and never "წელს" in a year-change film.

### H13 · Bounded promise
- Why it works: the viewer knows the cost of watching up front, and numbered items pull toward completion (practitioner consensus, unverified).
- Frame 0: `Grid` (`n: 11`, `cols: 4`, `big: "11"`, `label` "ხელოსნის ტიპი") or a `List` of four cost rows.
- `3 კითხვა. | 11 ხელოსნიდან ერთი.` (the Grid `label` says "ხელოსნის ტიპი", so 11 reads as types, not people)
- `3 კითხვა და იცი, | ვისთან წახვიდე.`
- `ბიუჯეტს 4 რამ აკლდება: | ოკეანე, პორტი, | საკომისიო, განბაჟება.`
- Must: never call the diagnostics free (the brief lists it as neither free nor VINARI+).

### H14 · Playful, even silly, but true
- Why it works: a smile stops the thumb as well as a number does, and a joke about the viewer's own everyday trouble is
  recognition (ABCD Connect [S6], Carwow's tongue-in-cheek car pains [S17], a friend's voice [S22]). The owner asked for it (2026-09-24).
- Frame 0: the scene that makes the joke visible, already composed (below per example). The punchline lands on chunk 1 as a visual event.
- When: at most one hook in three videos, and among the 5 candidates whenever the pain is everyday (parking, deadlines, documents,
  a mechanic, the QR card, what friends say about prices). Prefer a number cliff (H01) when a brief figure is the surprise.
- Must: literally true, and the next beat proves it within 3 s with a real screen or a brief figure. Laugh at the situation, never
  at a person or a group (mechanics, sellers, drivers), never at accidents. Cheeky in the words, the voice as it is: one "!" on
  screen at most (the hook; never "!!"), no emoji, no slang spelling, no fake urgency, no beat `style` (a second Gemini request).
  It is scored with the same rubric, and silly never excuses a 0 on #3.

Twelve examples (`show` → the scene at frame 0 and its event on chunk 1; why it is true; 3, 4, 5, 11 and 12 are subjects the
cloud studio no longer makes since 2026-10-06: read them for the shape only):

1. parking: `მანქანა გაქრა? | არა, შენ დაგავიწყდა.` → `MapPin`, the pin drops at chunk 1. True: the car is where you left it; Vinari saved the spot.
2. deadlines: `დაზღვევა არ გკითხავს, | როდის გაუვიდეს ვადა.` → `Calendar`, the expiry mark lands. True: insurance and inspection dates just pass; reminders 7/3/1 days.
3. customs: `1 იანვარს მანქანას | დაბადების დღე აქვს.` → `Wire3D` `flip` 2026 → 2027. True: customs age counts from the year you clear it; pay-off 3 610 → 9 615 ₾ for the named car, `validUntil`.
4. market price: `ყველა ძმაკაცი | სხვა ფასს გეუბნება.` → `StripPlot`, scattered dots, the middle line at chunk 1. True: the free feature: one car's price from live listings, with source and time.
5. market price: `საშუალო ფასს | ერთი მანქანა ატყუებს.` → `StripPlot`, `outlierAt: 1`. True: one pricey listing drags the average, not the middle price.
6. engine sound: `ძრავი ლაპარაკობს. | კაკუნით და ჭრიალით.` → `Wave`, `leadIn` 0.8 so two knocks play first. True: it says knock, squeal or hum; never a part, never "დიაგნოზი".
7. QR card: `შენი ნომერი შუშაზე? | ახლა ყველას აქვს.` → `Title` strips with "5•• •• •• ••" (a phone number, not the plate). True: a number on the glass is read by every passer-by; with the card the owner gets a push and no number shows (web/c: "ნომერი არსად ჩანს").
8. mechanic finder: `კარობკას მალიარი | ვერ გაგიკეთებს.` → `Grid` 11, one cell checks at chunk 1. True: 3 questions give 1 of 11 mechanic types (never "free").
9. VIN scan: `VIN-ს ხელით კრეფ? | ფოტო გადაუღე, ეგაა.` → `Phone` `14-vin-scanner`, `tap` on chunk 1. True: the VIN is read from a photo on the phone.
10. documents: `ტექპასპორტის ფოტო | კატების ფოტოებს შორისაა?` → `Title` strips, the second line at chunk 1. True: document photos stay on the phone in their own place.
11. price chart: `მანქანები ძვირდება? | 187 თვეს ჰკითხე.` → `LineChart` `"geostat"` drawing on. True: 187 measured months, Geostat (VINARI+).
12. honesty: `ყველაფრის მცოდნე აპი? | ეს ის არაა.` → `List`, the first "won't do" item strikes at chunk 1. True: it says when a source is silent; no owners, fines or plate search.

### H15 · Your way? (a question about the viewer's own driving)
- Why it works (the owner, 2026-10-06, after an Instagram reel that taught one driving habit, opened on "which reference
  point do you use?" and asked for answers in the comments: "make videos like this"): a question about his own habit makes
  the viewer answer in his head before the film does; the tip is then his to try tomorrow, and the post can ask for his
  answer. Recognition and a promise in one line.
- Frame 0: the moment of the habit, already composed: a hand on the door handle, the mirror, the view while reversing,
  the clock on a long road (a Film scene or a `Photo`), or a `Title` with the question.
- `კარს რომელი ხელით | აღებ?` (hc-door-far-hand)
- `რას უყურებ, როცა | უკუსვლით შედიხარ?` (hc-reversing-checks)
- `ორ საათს | შეუსვენებლად მიდიხარ?` (hc-break-every-two-hours)
- `მზე თვალს გჭრის. | რას აკეთებ?` (hc-sun-dazzle)
- Must: a real question he wants to answer, never rhetorical, never a quiz voice ("იცოდით?"); the next beats answer it with a
  bank fact marked tip, saying whose advice it is (a Highway Code tip is the UK's); one picture a beat; the takeaway is what
  he does differently tomorrow. Every opening is new: never the words or the shape of the category's last 10 openings
  (`--record` refuses one that shares two words with one of them). The post may end on one open question of the same kind
  ("შენ რომელი ხელით აღებ კარს?"), never a second "write in the comments" (its first paragraph already asks).
- When: every tip film (a fact marked `(tip)`, about every second car-knowledge dice film), and any film whose idea is a
  habit of the driver's own.

H16 to H20 (the owner, 2026-10-06: the buddy tone, and the crazy car stories): every one a shape, true to its bank (the stories
bank, ci/stories-sources.json, or a category's facts). `--record` refuses an opening another film has: never copy one word for word.

### H16 · This guy (the character, then the absurd fact)
- Why it works: a person named and one fact that cannot fit them is a gap the viewer must close (the curiosity gap [S12][S13]),
  and a person is easier to care about than a number.
- Frame 0: the person's photo already graded and pushing in (PhotoStory, `who` lands on chunk 1), or the object of the fact.
- `ეს კაცი | ტრაქტორებს აკეთებდა.` (then: the 1963 car company; lamborghini-tractor)
- `ამ ქალმა ბენზინი | აფთიაქში იყიდა.` (bertha-benz)
- `ბოლო ზიარება მისცეს. | ავარიიდან 42 დღეში რბოლაშია.` (lauda-comeback: the 42 days count from the crash, never from the last rites)
- Must: the second chunk turns it (the contrast is the hook); „ამ კაცმა" with a transitive past verb, „ეს კაცი" with a passive one.

### H17 · You know what...? (the buddy question)
- Why it works: „იცი, ...?" asks ONE friend about one thing, and the answer is promised in the next breath.
- Frame 0: the subject of the question, composed (the photo, the car, the place).
- `იცი, ფერარიმ | ლამბორგინის რა უთხრა?` (his own telling: a legend, said as one)
- `იცი, პირველი ჯარიმა | რა სიჩქარეზე დაწერეს?` (13 km/h; first-speeding-ticket)
- `იცი, ჰონდამ ნანგრევები | ვის მიჰყიდა?` (Toyota; honda-never-quit)
- Must: a concrete subject in the question and the answer within 1.5 to 3 s; never the plural quiz „იცოდით, რომ...". „ძმაო" may
  open it (the owner's own word), once a film at most.

### H18 · Imagine (put him in the seat)
- Why it works: the viewer is in the moment before he knows what it is about.
- Frame 0: the imagined moment itself (a Film scene or a photo), already moving.
- `წარმოიდგინე: | ხნულში მიდიხარ, | უკან კვერცხები გიდევს.` (citroen-2cv-eggs)
- `წარმოიდგინე: | საჭესთან ზიხარ | და ხმას უსწრებ.` (thrust-ssc)
- `წარმოიდგინე, ბენზინი | მარტო აფთიაქში იყიდება.` (bertha-benz)
- Must: the real fact lands on chunk 1 or 2.

### H19 · The twist promise (name the stake, hide the outcome)
- Why it works: a stake and a "then what?" keep the thumb off the screen until the twist (paid at 60 to 70 %).
- Frame 0: the stake, composed: the photo of the moment, or the number.
- `ფერარის ყიდვა უნდოდა. | არ გამოვიდა.` (then: Le Mans 1966, 1-2-3; ford-v-ferrari)
- `ქარხანა დაუბომბეს. | მერე მიწისძვრამ დაანგრია.` (honda-never-quit)
- `3 წუთი აკლდათ | გამარჯვებამდე.` (toyota-2016)
- Must: the outcome is a hard fact, paid before 70 % of the film; "ბოლო ვერ გამოიცნობ" with no stake is generic.

### H20 · What is this? (the photo first)
- Why it works: an odd picture is a question by itself; the answer by 1.5 s is the reward.
- Frame 0: the photo already graded and pushing in, nothing else.
- `ეს ტრაქტორი | ვისია?` (lamborghini-tractor's own photo)
- `ეს რა არის, იცი? | ბენზინგასამართი. 1888.` (the Wiesloch pharmacy; bertha-benz)
- `ამ მანქანას | გოგოს სახელი ჰქვია.` (mercedes-girl)
- Must: the photo is the story's own (licensed, credited on screen), and the answer lands by 1.5 s.

### H21 · არაუშავს, საქმე მაქვს (the grindset turn)
- Why it works (the owner, 2026-10-06: "the stories open on the grindset meme: they insulted, dumped or doubted me, then
  არაუშავს, then the bold move, საქმე მაქვს"): the meme every Georgian TikTok viewer knows. A put-down anyone has heard
  (a dad, an ex, friends, a rival), a shrug, a bold move. The shrug is the aura moment (the owner lays his TikTok sound
  there); the bold move promises a story, and a true story pays it.
- Shape: [who put me down, and how] → „არაუშავს." → [the bold move] (→ „საქმე მაქვს." at most every other time).
- Frame 0: the put-down already moving: an illustrated chat bubble or a call (from „მამა"), a Figure turned away, or the
  archival photo pushing in with the person's name in the meta bar. „არაუშავს." slams in on a hard cut (a punch word, or
  the figure's shrug), `hold` 0.4 to 0.6 after it.
- Framings (the aura truth table below): P a historical figure's own shoes, R reported history, E an everyday "me" that
  bridges to the true story or the feature, O an object speaking (H14).
- `ფერარიმ მითხრა, | ტრაქტორებს მიხედეო. | არაუშავს. | საკუთარს ავაწყობ.` (P, lamborghini-tractor; the next beat:
  „ლამბორგინი ამას თვითონ ასე ჰყვებოდა.")
- `მამამ მითხრა, | უმაქნისი ხარო. | არაუშავს. | ლამბორგინიც | ტრაქტორით დაიწყო.` (E: the street word is the made-up
  dad's)
- `ბოლო წრეზე | ბენზინი გამითავდა. | არაუშავს. | ფინიშამდე | ხელით მივაგორებ.` (P, brabham-push)
- `სამივე ადგილი | მინებმა აიღეს. | ფარების გამო | მოხსნეს. | არაუშავს.` (R, mini-monte-carlo)
- Must: chunk 0 ≤ 15 characters, the first sentence ≤ 8 words; the put-down true (P, R) or plainly made up (E); one "!"
  at most (on the shrug or the bold move: the slam carries the rest); street words only in an E line or a made-up
  character's line, never at or from a real person; a living person only in R; the bold move paid by a hard fact of the
  story by 75 % of the film; an injury or a death told straight (the shrug is the person's own toughness, never a joke
  about the injury).
- When: every other film of the stories category (ci/categories.json "openers".aura: the brief says when it is due, and
  `--record` refuses it on the other films), and in any category when a "me" line fits; never the formula the page's
  newest film opened with, and every time a new put-down and a new move (`--record` refuses an aura opening that shares
  two content words, „არაუშავს", „საქმე მაქვს", „მითხრა" left out, with one of the page's last 10).

### H22 · გული მატკინეს, მერე გავგიჟდი (the heartbreak glow-up)
- Why it works (the owner, 2026-10-06: "hurt at the start, then a crazy comeback, then the car content"): the hurt is
  the hook, the escalation is the watch time, the glow-up is the share.
- Shape: one hurt (a dismissal, a breakup, a loss) → it develops and goes crazy (two escalating beats) → the car content
  (the cars, the record, the result), often „განვიხილოთ."
- Frame 0: the hurt as an illustrated moment (flowers held out, a door closing, a chat marked seen: a Film from the kit)
  or the archival photo of the place and the year.
- `ფერუჩომ ფერარის | გადაბმულობა დაიწუნა. | ყური არ ათხოვეს. | ჰოდა, 1963-ში | საკუთარი მარკა შექმნა.` (R)
- `ერთხელ | შეყვარებულს | ყვავილი მივუტანე. | მანქანა მოგეყვანა, | შე უმაქნისოო. | დაშორების მერე | 3 ლეგენდა
  ვისწავლე. | განვიხილოთ სამივე.` (E: the owner's own arc; a 30 or 45 s film that then tells three short true stories,
  each with its facts)
- Must: one hurt, not a sob story; the crazy part true (R) or the made-up everyman's (E); „განვიხილოთ" only when the film
  then really goes through each thing named, each with its own bank facts; a breakup is never sexual and no street word
  is ever said about a woman; one "!" at most.

### Aura truth table and ready openings (H21, H22)

**The truth table** (both formulas, every category):

| framing | who speaks | allowed when | must |
|---|---|---|---|
| P, a historical figure's shoes ("me" = Ferruccio) | the narrator as that person | the person has died; the put-down and the move are in the story's facts, or its legend (marked) | the person's name and the year in the meta bar from frame 0; a legend marked in the same or the next sentence („თვითონ ასე ჰყვებოდა", „ამბობენ"); no street word in any mouth; nothing beyond the sources' sense |
| R, reported history (third person) | the narrator about them | always; the only framing for a living person (Rimac, Kubica, Mouton, Grosjean) | the story's facts; a legend marked; no street word |
| E, an everyday "me" (the viewer's own life) | a made-up narrator and made-up people (a dad, an ex, friends, a neighbour) | always | the true story enters with its own subject („ლამბორგინიც ...", „1888-ში ერთმა ქალმა ..."), and from then on its facts are the bank's; street words live only here |
| O, an object speaks (H14: the car or a part talking) | a thing (the halo, a tyre) | always | no real person quoted through it |

Never: a vulgar or invented quote in a real person's or brand's mouth; a living person's "me"; a put-down the sources do
not give, presented as fact (Enzo's words are Lamborghini's own retelling: a legend); "banned for winning" (Mazda: the rule
change predates the win).

**Ready openings on true stories** (`show`, digits allowed; `say` spells the numbers; the story ids are the bank's, its
facts the only truth; never copy one word for word: `--record` refuses an opening another film has, and the next aura
opening must differ from the last 10):
- H21 P `lamborghini-tractor`: `ფერარიმ მითხრა, | ტრაქტორებს მიხედეო. | არაუშავს. | საკუთარს ავაწყობ.` (Enzo's words are
  a legend: the next beat says „ლამბორგინი ამას თვითონ ასე ჰყვებოდა"; pays: the 1963 company)
- H21 P `honda-never-quit`: `ქარხანა | დამიბომბეს. | მეორე მიწისძვრამ | დამინგრია. | არაუშავს.` (pays: the remains sold to
  Toyota, the Honda Technical Research Institute)
- H21 P `kearns-wiper`: `ადვოკატები | წამივიდნენ. | სამივე ფირმა. | არაუშავს. | ადვოკატი მე ვიქნები.` (pays: what Ford and
  Chrysler paid, as the facts give it)
- H21 P `brabham-push`: `ბოლო წრეზე | ბენზინი გამითავდა. | არაუშავს. | ფინიშამდე | ხელით მივაგორებ.` (never a pushing
  distance; the title was already his)
- H21 R `rimac-garage`: `რიმაკის BMW-ს | სარეცხ მანქანას | ეძახდნენ. | არაუშავს.` (living: reported only; never "he bought
  Bugatti")
- H21 R `mini-monte-carlo`: `სამივე ადგილი | მინებმა აიღეს. | ფარების გამო | მოხსნეს. | არაუშავს.` (pays: the other years'
  wins)
- H21 R `mazda-787b`: `ამ ძრავას | ლე მანზე | კარს უჩვენებდნენ. | არაუშავს. | ბოლო წელს მოიგო.` (the rule came before the
  win: never "banned for winning")
- H21 R `porsche-901`: `პორშეს სახელზე | პეჟომ იდავა. | არაუშავს. | 901 გახდა 911.`
- H21 P `lauda-comeback`: `ბოლო ზიარებაც | მომცეს. | არაუშავს. | ავარიიდან 6 კვირაში | ისევ საჭესთან ვარ.` (the weeks
  count from the crash; straight tone, period photos only)
- H21 P `jackson-road-trip`: `50 დოლარზე | დამენაძლევნენ: | ვერ გადაკვეთო. | არაუშავს.` (never whether he collected)
- H21 O `grosjean-halo`: `მე ჰალო ვარ. | ბევრი მაკრიტიკებდა. | არაუშავს.` (no crash video, no critic named)
- H21 E `bertha-benz`: `შეყვარებულმა | მიმაგდო. | არაუშავს. | 1888-ში ერთმა ქალმა | ქმარს არც უთხრა | და მანქანით
  წავიდა.` (the owner's own line, then the true story)
- H21 E `graham-hill-licence`: `ძმაკაცებმა | მითხრეს, | ჩუჩელა ხარო. | 24 წლის ხარ | და მოწმობა არ გაქვსო. |
  არაუშავს.` (the street word is the made-up friends')
- H22 R `lamborghini-tractor`: `ფერუჩომ ფერარის | გადაბმულობა დაიწუნა. | ყური არ ათხოვეს. | ჰოდა, 1963-ში | საკუთარი
  მარკა შექმნა.`
- H22 R `rimac-garage`: `18 წლისას | ძრავა აუფეთქდა. | ელექტროზე გადააკეთა. | სარეცხ მანქანას | ეძახდნენ.`
- H22 R `ford-v-ferrari`: `ფორდს | ფერარის ყიდვა | ჩაეშალა. | სამი წლის მერე | ლე მანზე | სამივე ადგილი წაიღო.`
- H22 R `kubica-comeback`: `რალიზე ხელი | კინაღამ დაკარგა. | რვა წლის მერე | ფორმულა 1-ში დაბრუნდა.` (living: reported)
- H22 R `audi-listen`: `ჰორხს | საკუთარი გვარი | აუკრძალეს. | ლათინურად თარგმნეს.`
- Outside the stories (the same rules, that category's facts): parking `ძმაკაცმა | მითხრა, | ვირთხა ხარ, | მანქანას
  ვეღარ პოულობო. | არაუშავს. | სართული ჩაწერილი მაქვს.` · reminders `მამამ მითხრა, | უმაქნისი ხარ, | ტექინსპექტირება |
  გაგივიდაო. | არაუშავს.` · free / general `შეყვარებულმა | მიმაგდო. | არაუშავს. | საქმე უნდა გაკეთდეს.` (his words)
Endings that pair with them (≤ 26 characters, no street word on the EndCard, new every film): „საქმე გაკეთდა." ·
„ტრაქტორისტი, ხო?" · „ადვოკატი აღარ დასჭირდა." · „ბენზინი არ იყო, ტიტული იყო." · „ერთი უარი, სამი ფორდი."

## Buddy tone (the owner, 2026-10-06: "უფრო არასერიუზული, ძმაკაცური ტონი")

The hooks read high-flown and would not take off. The test for every line: **would you say exactly this to a friend across
the table, in this order, and would he lean in?** A poster, a textbook, a TV anchor, a riddle or a moral: say it again from
scratch. All categories, the opening, the cover and the closing line most of all.
1. **Spoken, not written.** Short sentences, the verb last, „შენ". Spoken particles where a friend would use them: ხო, აბა,
   მოიცა, ჰოდა, ნახე, წარმოიდგინე, სერიოზულად, ეგაა, მორჩა, ეგრევე, მოკლედ, იცი? One or two a film, not every line. Short is
   not chopped: a story is told in connected sentences, one breath each, never a telegram of fragments (Story films).
2. **Cheeky, not slang.** No Russianisms (ვაფშე, ტიპა, კაროჩე, ბრატ), no slang spelling on screen (ძაან, რაა, ხოო), no emoji,
   no shouting caps; one "!" on screen at most, for the hook. „ძმაო" (the owner's own word) once a film at most. The joke is
   about the situation or about us, never about a person, a group, a victim, an accident, an injury or a death. **Street
   words** are the one exception to "not slang" (the owner, 2026-10-06: „მთლად უზრდელობაც არაა და არ ამახინჯებს"): the
   mild folk words of ci/street-words.json "allowed" (ბოზი, უმაქნისი, უტრაკო, ჩუჩელა, საქონელი, ვირთხა, ტრაკი, სირი and
   their kind), only here and there (never two films in a row, at most one film in three), at most three a film, only in
   a "me" line or a made-up character's line, never at the viewer, a woman (ბოზი), a group or a real person, never in a
   real person's mouth, never in the cover, the meta, the EndCard or the post; the heavy words and slurs (ყლე, განდონი and
   their kind) never: check refuses them (BANNED_WORD, STREET lines; tools/ci/streetwords.mjs).
3. **Concrete beats clever.** A name, a year, a number, an object. No hype words (ლეგენდარული, წარმოუდგენელი, საოცარი,
   გასაოცარი, უპრეცედენტო): the detail is the hype.
4. **No aphorisms, morals or riddles** as the opening, the last line or the cover („შუშა ჭორიკანაა", „სიჩუმე სისუფთავე არაა",
   „ოცნებას ნუ დაანებებ თავს").
5. **Facts exact.** The buddy tone never rounds a number up and never adds "everyone", "the first ever" or "the biggest" a
   source does not say; a legend is said as a legend („ამბობენ", „თვითონ ასე ჰყვებოდა").
6. **The voice stays.** Gemini reads it warm, as now (no beat `style`). The energy is in short lines and fast pictures.
7. **The post adds, it never repeats** (the owner, 2026-10-07): what a friend texts about the film is what the film did not
   say (a detail, the context, a take, one question), never its lines again (POST_ECHO, tools/ci/words.mjs).

**The opening line**: 8 words or fewer in its first sentence (best 4 to 6), chunk 0 about 15 characters, the whole hook done by
2 s, a visible event by 1.5 s (§1). A specific subject with the answer withheld (a person, a car, a number, a place: hide only the
outcome) and a turn promised. Never "იცოდით, რომ...", "ყურადღება", "გაოცდები", "99 % არ იცის", "ყველას ჰგონია" (say „გგონია?"),
a hype word, a moral, the logo or the app's name.

| now (high-flown) | buddy |
|---|---|
| „ნომერს შუშაზე ნუ დატოვებ. შუშა ჭორიკანაა." (a riddle) | „შუშაზე ნომერი გიდევს? \| მთელი ქუჩა კითხულობს." |
| „საბუთები ხელთ გაქვს, ინტერნეტში კი არსად დევს." („ხელთ") | „ტექპასპორტის ფოტო გინდა, \| ოღონდ ინტერნეტში არა?" |
| „ერთი ღვედი ოთხი კაცის საქმეს აკეთებს." (a proverb) | „ეს ღვედი თუ გაწყდა, \| საჭე უცებ დამძიმდება." |
| „დილა მშვიდობისა, საქართველო." (a TV anchor) | „ცხრა საათია, \| ყავას სვამ და..." |
| „სამივეს ერთი აპი შველის." („შველის") | „სამივე ერთ აპში გვარდება." |
| „პატრონს ხმას მიაწვდენ." (an office verb) | „პატრონს გააგებინებ." |

Words to swap (build-index warns on them): ხელთ → ხელში, თან; როგორც წესი → ჩვეულებრივ; ერთი შეხებით → ერთი ღილაკით;
პატიოსნად → პირდაპირ; მიაწვდენ, შეატყობინებ → გააგებინებ, მიწერ; დაგაკავშირებს → მოგწერენ; შველის → გვარდება; დარდი →
თავისტკივილი; ამოიკითხავს → წაიკითხავს; ტვირთი (physics) → სიმძიმე; გახლავთ, ამრიგად, აქედან გამომდინარე, თავის მხრივ, რის
შედეგადაც → drop it, or „მოკლედ", „ჰოდა"; "X, Y კი Z" → two short sentences.

## Say it simply (the owner, 2026-09-24: the wording was "მაღალფარდოვანი")

Every line is what a friend says out loud in the car. "შენ", short, everyday words, the drivers' own words (ჩამოყვანა, ბიდი, განბაჟება,
ტექდათვალიერება, კარობკა). Every line goes through the Georgian check before it is voiced (the owner, 2026-09-25: "აბდაუბდა"); the
traps and our own lines before and after are in CLAUDE.md, Say it simply.
- One thought per sentence: **7 words or fewer** (9 at most, counted on `show`, a number is one word); in the voice **40 letters or
  fewer** (55 at most). Two sentences per beat at most. Verbs, not nouns. No "რომელიც" chains. A crazy story is told, not
  listed: up to 12 words and 70 letters, connected, never a run of fragments (Story films).
- A hard word the story needs is said once in plain words, or replaced. `node tools/build-index.mjs <id>` warns on these:

| instead of | say |
|---|---|
| მედიანა | შუა ფასი |
| სიმჭიდროვე | რამდენი იყიდება |
| კონკურენცია, კონკურენტი | ვინც იგივეს ყიდის |
| დეკლარაცია | განბაჟება, "როცა განბაჟებ" |
| აქციზი | ერთი გადასახადი |
| ავტომობილი | მანქანა |
| ღირებულება | ფასი |
| იმპორტი | ჩამოყვანა |
| ინდექსი | ფასების ხაზი |
| მონაცემები, ინფორმაცია | ციფრები, რაც წერია |
| რეალურ დროში, ამჟამად | ახლა, დღეს |
| უზრუნველყოფს, ახორციელებს | აკეთებს |
| ეფექტური, უნიკალური, ინოვაციური | (drop it) |

| before | after |
|---|---|
| რატომ მედიანა და არა საშუალო? | ერთი ძვირი მანქანა საშუალოს აძვირებს. შუა ფასს არა. |
| ასაკს დეკლარაციის წლით ითვლიან. | ასაკს განბაჟების წლით ითვლიან. |
| საჭე მარჯვნივ? აქციზი სამმაგია. | საჭე მარჯვნივ? ერთი გადასახადი სამჯერ მეტია. |
| რამდენ კონკურენტთან გიწევს კონკურენცია? | რამდენი ყიდის იგივე მანქანას? |
| ბაზრის სიმჭიდროვე მაღალია. | იგივე მანქანას ბევრი ყიდის. |
| აპლიკაცია უზრუნველყოფს ვადების შეხსენებას. | ვადამდე ვინარი შეგახსენებს. |
| ავტომობილის საბაზრო ღირებულება რეალურ დროში. | შენი მანქანა დღეს რამდენი ღირს. |
| ოფიციალურ კალკულატორს 29 შემთხვევიდან 29-ში დაემთხვა. | 29 შემთხვევა შევადარეთ. 29-ვე დაემთხვა. |

## 2. Scoring rubric: write 5, score them, keep 1

Write **5 hooks from at least 3 different formulas**, using the feature's row in §5. Score each criterion 0, 1 or 2 (12 maximum). Print the table in the reply
(not in a file) and keep the winner. Keep the runner-up as an A/B variant that changes only beat 0 (TikTok advises 3 to 5 creatives per ad group [S1]).

| # | criterion | 0 | 1 | 2 |
|---|---|---|---|---|
| 1 | Stops the scroll in 1 s | static text, logo, black or slow start | only the words or only the picture hooks | frame 0 reads muted AND the voice hooks, with an event by 1.5 s |
| 2 | Specific, not generic | fits any app ("დაზოგე ფული") | car or customs topic, but nothing concrete | a sharp number, date, object or place (3 610 ₾, 1 იანვარი, მიწისქვეშა პარკინგი) |
| 3 | True and on-brand | invented number, forbidden claim, "free" misused, fake urgency: **reject** | true but loud or needing a later caveat | literally true from the brief, calm |
| 4 | Tension the video resolves | no gap, or never closed | closed too early (under 3 s) or only by the end card | a clear gap and a promised turn, answered at 60 to 70 % |
| 5 | Sounds like a buddy | bookish, translated, a poster line, a riddle or an aphorism, an announcer, a quiz (მედიანა, შუშა ჭორიკანაა, დილა მშვიდობისა) | correct but written register | what a friend says across the table, in that order, a little cheeky; chunks of 24 or fewer; no "წელს"/"ყველას"/"ორი განბაჟება" traps |
| 6 | Fits the first scene | no scene can show it | carried by a Title card only | a data scene shows the hook itself at f0 and changes at chunk 1 |

Keep the highest total; ties go to #3, then #1. Ship at **9 or more**. Any 0 on #3 discards the hook.

Calibration: "ერთი მანქანა. | ორი ფასი საბაჟოზე." over SplitFlap scores 2/2/2/2/2/2 = 12.
"იცოდით, რომ განბაჟება იცვლება?" scores 0/1/2/1/0/1 = 5: a generic opener, the formal "-თ", and no number.
"ეს კაცი | ტრაქტორებს აკეთებდა." over the story's own tractor photo, a red "1963" stamp landing on chunk 1, scores 12.
"ნომერს შუშაზე ნუ დატოვებ. შუშა ჭორიკანაა." scores 1 on #5: a riddle, not a friend.

Georgian register: use informal singular "შენ". Never mix future and present in one sentence ("ჩაწერ… ხედავ" is wrong).
An imperative followed by a future result is natural ("დაამატე… ნახავ").
Use the drivers' words: ჩამოყვანა (not იმპორტი), ბიდი, განბაჟება, კარობკა, ჟესტიანშიკი, მალიარი. Never „ხოდოვოი" (the
owner bans the Russianism, 2026-10-05: say „სავალი ნაწილი"; build-index BANNED_WORD). And never one word over and over:
a content word in four lines of a film is a REPEAT warning (CLAUDE.md, Say it simply).
Say ტექდათვალიერება in speech; ტექინსპექტირება is also fine, and it must match the word on the Phone screen shown.
For things, say "ყველაფერს", not "ყველას".

## 3. Structure templates

The budget is about 11.5 letters per second of voice (15 s ≈ 150, 20 s ≈ 210, 30 s ≈ 310, 45 s ≈ 465). Beats: **H** hook, **T** turn/proof, **W** why/rule,
**M** mechanism (real screen), **P** payoff (the hook's gap closes), **E** end card. The payoff lands at about 70 %.
**E is the quiet EndCard with a closing line** (the owner, 2026-09-24: he likes these endings; since 2026-10-06 a punchline or a callback in the
buddy tone, never an aphorism): the mark, the wordmark and a short line in plain Georgian as `tagline`, spoken once as the last line, plus an
optional quiet `note` ("… · VINARI+").
Its subtitle is dropped automatically because the card already shows the words. **There is no CTA**: a store line reads as marketing and pushy.
**Every second film ends on the comment ask and the follow reminder instead of a quote** (the owner, 2026-09-29: people forget to follow;
2026-10-02: every second film from v63, first "comment „ვინარი" and we DM you the link", then follow): the same card and last spoken line,
one line of `ci/endings.json` in rotation ("კომენტარში დაწერე „ვინარი", | ლინკს მოგწერთ. გამოგვიწერე."), with its `|` (two lines on the
card), no VINARI+ note under it. A line is 45 to 52 letters (about 4 to 4.5 s), so E takes ~50 letters on those films: the story
gets less room (15 s: H, M and P only). The brief says when and offers the lines
(`node tools/ci/ending.mjs <id>` on the Mac); it is never a quote film's ending, never anywhere else in the film, and never in the post.
The quote rules below are for the other films.

| 15 s | H 0–2 | T 2–5 | M 5–9.5 | P 9.5–11.5 | E 11.5–15 |
|---|---|---|---|---|---|
| letters | ≤ 30 | ~35 | ~45 | ~20 | ~20 |
| scene | data scene | Compare/Stat/StripPlot | Phone, 1 highlight | Stat land / List check / SplitFlap | EndCard |

| 20 s | H 0–2 | T 2–5.5 | W 5.5–9 | M 9–13.5 | P 13.5–15 | E 15.5–20 |
|---|---|---|---|---|---|---|
| letters | ≤ 30 | ~40 | ~40 | ~50 | ~20 | ~20 |

| 30 s | H 0–2 | T 2–6 | W 6–11 | M 11–16 | proof 16–20 | P 20–22 | limits 22–25.5 | E 25.5–30 |
|---|---|---|---|---|---|---|---|---|
| letters | ≤ 30 | ~45 | ~55 | ~55 | ~40 | ~25 | ~35 | ~20 |

| 45 s | H 0–2 | T 2–6 | W 6–12 | M 12–20 | example 20–28 | proof 28–32 | P 32–35 | limits 35–39 | E 39–45 |
|---|---|---|---|---|---|---|---|---|---|
| letters | ≤ 30 | ~45 | ~65 | ~85 | ~85 | ~40 | ~30 | ~40 | ~45 |

- 45 s (the owner, 2026-10-02: for a feature that needs a real walk-through): M shows the feature on the real screen step by step,
  and "example" plays ONE everyday case through to the end (what you tap, what you see, what happens next, e.g. the reminder arriving).
  Never padding: if the idea fits 30 s, it is a 30 s film.

- proof: 29/29, 187 months, or the source and time line. limits: what it won't say, or "when the source doesn't answer, it says so" (brief §7).
- Say the brand in the voice by about 5 s in 20 and 30 s videos (ABCD brand-early [S6]) and by the M beat in 15 s. Never put the logo at frame 0.
- **No CTA, anywhere.** Never "App Store", "ეპ სტორზე", "Google Play", "გადმოწერე", "ჩამოტვირთე", "დააინსტალირე", "download", "install",
  "link in bio", "скачай", "Эп Стор", no store line on the EndCard (it has no `line` prop any more), no "ახლავე", no "დღესვე", no "სცადე".
  `node tools/build-index.mjs` stops on the store and download words and warns on the pushy ones.
  "ერთი მანქანის ფასს უფასოდ ნახავ." is a fact, not a closer: say it inside the film if the story needs it, never as the last line.
- **Paid features are labelled quietly:** the meta of the beat that shows a VINARI+ screen reads "<feature> · VINARI+"
  ("კალკულატორი · VINARI+", "ჩარტი · VINARI+", "ისტორია · VINARI+"). The EndCard `note` may repeat it or carry a hedge
  ("ზუსტ მიზეზს ხელოსანი გეტყვის"). Never call a VINARI+ feature free.
- EndCard beat: `say` is the tagline itself (≤ 5 words, ≤ 26 characters so it stays one line on the card), `hold` 0.3 to 0.5 s.
  Never repeat the tagline in `note`. The last line is a punchline a friend would say, never an aphorism or a moral: a callback
  that turns the hook's words (best when the replay loops), a dry joke at ourselves, a local cliché turned („გარბენი ცოტა აქვს,
  ხო?"), or one question to the viewer („შენ რას იზამდი?"). True to the film; no brand boast, no promise, no "!", no "share" or
  "tag". Write it together with the hook.
- **Closing lines since 2026-10-06** (≤ 26 characters; shapes, write your own):
  - callback: hook „ეს კაცი ტრაქტორებს აკეთებდა." → „ტრაქტორისტი, ხო?" · hook „ფერარის ყიდვა უნდოდა." → „ერთი უარი, სამი ფორდი."
  - loop: „ყველაფერი უარით დაიწყო." → the replay's „ფერარის ყიდვა უნდოდა."
  - the dry joke at us: „ჩვენ ორშაბათს ვერ ვდგებით." (after a comeback) · the cliché turned: „გარბენი ცოტა აქვს, ხო?"
  - one question: „შენ რას იზამდი?"
  - feature films, the old riddles made buddy: „მანქანა ორ ადგილას დგას." → „მანქანა ჯიბეშიც გყავს." · „სწორ კარზე
    დააკაკუნე." → „პირდაპირ სწორ ხელოსანთან." · „საბუთს თავისი ადგილი აქვს." → „კატებში აღარ ეძებ." (a callback to its hook)
- **Closing quotes before 2026-10-06** (shape only; several are riddles, "what not to write" now):
  - customs: "იანვარი ძვირი თვეა." (the named car, `validUntil`) · "ჩამოყვანამდე დაითვალე."
  - right-hand drive: "ჩამოყვანამდე საჭეს შეხედე."
  - market price: "ფასს წყარო და დრო აწერია." · sellers: "გაყიდვამდე დათვალე."
  - deadlines: "დაივიწყე, ვინარს ახსოვს." · "ვადები ერთ ადგილას."
  - parking: "დამახსოვრება აღარ გინდა."
  - QR card: "შენი ნომერი შენთან რჩება."
  - engine sound: "მანქანაც ლაპარაკობს."
  - auction record: "სიჩუმე სისუფთავე არაა." (not found does not mean no accident)
  - wallet / max bid: "ჯერ დაითვალე, მერე დადე."
  - mechanic finder: "ყველას თავისი ხელოსანი."
  - VIN scan: "აკრეფა აღარ გინდა." · documents: "საბუთები შენთან რჩება."
  - honesty: "რაც არ იცის, არ იგონებს."
- **Loop-back ending** (the best quotes do this): the last spoken line leads into the first, so the replay sounds like one thought.
  - customs: "ჩამოყვანამდე დაითვალე." → "ერთი მანქანა. ორი ფასი საბაჟოზე."
  - right-hand drive: "ჩამოყვანამდე საჭეს შეხედე." → "საჭე მარჯვნივ? ერთი გადასახადი ×3."
  - market: "ფასს წყარო და დრო აწერია." → "საშუალო ფასს ნუ ენდობი."
  - sellers: "გაყიდვამდე დათვალე." → "რამდენი ყიდის შენნაირ მანქანას?"
  - deadlines: "ვადები ერთ ადგილას." → "ტექდათვალიერება როდის გაქვს?"
  - parking: "დამახსოვრება აღარ გინდა." → "სად დააყენე მანქანა, გახსოვს?"
  - QR card: "ნომერი შუშაზე აღარ გინდა." → "შუშაზე ნომერს ტოვებ?"
  - visually: frame 0 is the composed hook scene, so end the EndCard on a still. `asmr-end` has a long tail, so keep it short (≤ 0.5 s silence),
    and the `asmr-sub` at f0 of the replay becomes the downbeat.

## 4. Retention tricks with this studio, and what to avoid

Do:
- **Frame 0 is the cover.** It is readable as a still with 7 words or fewer (meta plus the scene's own label), with no black frame.
- **Open loop:** plant it in the hook and close it at about 70 % (15 s → about 10.5 s, 20 s → about 14 s, 30 s → about 21 s). Never close it in chunk 1 or only on the end card.
- **Number reveals:** use `Stat` with `landAt` so the count runs under the voice and lands on the spoken word
  (`asmr-count-roll`, or `-long` for 100 000 and above, plus `asmr-land` on the landing frame). One number per scene.
  Every number gets a `source` (brief: every number carries a source and a time).
- **Contrast cut every 2 to 3 s:** a new scene, or a state change inside it (flip, focus zoom, highlight, strike, tap). A scene over 4 s needs an
  internal event (the review flagged a static 2.1 s Stat and a 4.7 s List hook).
- **A visual change on every subtitle chunk:** give each chunk its own `at` (item, highlight, focus, tap). One new idea per chunk.
- **A visual metaphor per beat, like v1-v8** (the owner found v9/v10 flatter): the car ages on 1 January (Wire3D flip), ×1 → ×3 on a
  split-flap board, squares zooming out, a passer-by scanning the QR card, a pin dropping, a push on the lock screen, one dot dragging
  the average. At least three scene types in 20 s; never two Titles or two Phones in a row; a real screen is proof, not the story.
- **An ASMR sound on every event.** This is the default (`music` absent or null: no music, but for the quiet bed every third film
  gets at render, CLAUDE.md Sound): Promo plays `asmr-sub` on frame 0, `asmr-air` on every cut and `asmr-room` under the whole
  film, and every scene fires the asmr- sound of each of its own events.
  A spec adds a cue only for an event no scene sounds; listen for double hits.

  | event | sound | event | sound |
  |---|---|---|---|
  | hook underlay f0 | asmr-sub | card/chip appears | asmr-knock |
  | count / land | asmr-count-roll → asmr-land | Phone enters / wakes | asmr-slide / asmr-screen |
  | tap / double tap | asmr-tap / asmr-double-tap | VIN or QR captured | asmr-camera |
  | strike / check | asmr-strike / asmr-check | pin, dot | asmr-pop |
  | split-flap | asmr-flap-roll | line or axis draws | asmr-pencil(-short/-long) |
  | meta typing | asmr-key-roll | notification | asmr-notif |
  | reveal / pull-out | asmr-swell / asmr-air-long | old price torn away | asmr-paper-tear |
  | end card | asmr-end | room tone | asmr-room (Promo plays it under everything) |

- **Silence before the payoff:** a `hold` of 0.2 to 0.3 s before the landing number (judgment).
- **Colour carries data only:** at most one saturated colour per shot, with `down` = it costs the viewer and `up` = good for them.
- **Sound-off safe:** the subtitles carry the whole story. Do not show the same words twice in one frame.

Avoid:
- Generic openers: "იცოდით, რომ…", "ყურადღება", "ეს აუცილებლად ნახე", "გაოცდები", "99 % არ იცის", "ყველას ჰგონია" (say „გგონია?").
- Aphorisms, morals and riddles as the hook, the last line or the cover (შუშა ჭორიკანაა, სიჩუმე სისუფთავე არაა). Announcer openers
  (დილა მშვიდობისა, ახალი ამბავი). Hype words (ლეგენდარული, წარმოუდგენელი, საოცარი): the detail is the hype.
- Fake urgency: "სანამ გვიანაა", "ახლავე". A countdown `{daysToJan1}` is true only on the render day, so render on the posting day or drop it.
- A call to action of any kind: a store name, "გადმოწერე", "download", "try it", a store line on the card. The film ends on the EndCard's
  creative quote.
- High-flown words (მედიანა, სიმჭიდროვე, დეკლარაცია, კონკურენცია, აქციზი: Say it simply) and the listing site's name in any spelling.
- Invented stats: percentages, user counts, "ათასობით მძღოლი", and any number not in the brief. That includes true outside facts,
  for example the 50 ₾ penalty for a missed inspection [S21] or import volumes [S19]: background only, never on screen.
- Shouting: one "!" at most (the hook), no em dash, no Mtavruli caps, no emoji, no zoom-punch on every word, and a voice rate no higher than +12 %.
- Forbidden claims: showing owners, fines, finding a car by plate, "full history", "დიაგნოზი" (or დავადგენ/გამოვავლენ), Monroney, an Android date,
  reading a trouble code from the car, or "free" for anything except one car, its price, its own two dates (inspection, LPG cylinder)
  with their reminders, the home screen widgets and the trouble-code lookup.
- Screens that contradict the voice (05-customs is not a customs total), reading live prices off screens, test data (03-calendar-day), "09:00 · 19:30" on 7- or 3-day reminders.

## 5. Angle bank per feature

| feature (tier) | pain in their words | strongest true fact (brief) | best formulas | watch |
|---|---|---|---|---|
| Market price (FREE: one car; not in the cloud studio since 2026-10-06) | "რამდენი ღირს ჩემი მანქანა დღეს?" · "ძმაკაცი ერთს მეუბნება, გადამყიდველი სხვას." | live-listing **median** ("შუა ფასი", never the site's name), not the average; shows how many listings were counted and when; no median drawn when listings are few; how many of the same car are for sale now | H02, H11 (then H10 "before selling"); sellers (v9): H03 "რამდენი ყიდის შენნაირ მანქანას?" | never read the price or the listing count off a screen (both are live); "free" only for one car and its price, as a fact, never as the closer; 16-chart is the paid chart screen: meta "ჩარტი · VINARI+" |
| Customs + 1 January (VINARI+; not in the cloud studio since 2026-10-06) | "განბაჟება რამდენი გამოვა?" · "იანვარში რამდენით გაძვირდება?" | 2020 · 2.0 L petrol: 3 610 ₾ → 9 615 ₾ (+6 005); 29/29 with rs.ge; offline formula; age from the declaration year; right-hand drive excise ×3 (v10); excise, duty and fees shown separately | H01, H12 (H06, then H07 as proof) | `validUntil` 2026-12-31 for the 3 610 / 9 615 pair; the car on screen equals the car in the voice; ×3 is the excise, never the total; hybrid and electric have no brief figure: no numbers for them |
| Deadlines (the car's own two dates FREE, the calendar VINARI+) | "ტექდათვალიერება დამავიწყდა." · "დაზღვევას ვადა გაუვიდა და ვერც გავიგე." | the inspection and the LPG cylinder dates and their reminders are free; the calendar: inspection, insurance, oil, tyres and 6 more types; 7 / 3 / 1 days before; 09:00 on every step (the default), 19:30 only 1 day before and on the day; local, no server | H03, H11 | no fines; the Notification says "09:00"; insurance, oil and tyres are the calendar's (VINARI+) |
| Home screen widgets (FREE) | "რამდენი დღე დამრჩა?" · "აპს ყოველ დღე ვერ გავხსნი." | the nearest date and the days left right on the home screen ("ტექინსპექტირება 53 დღე"), the lock screen too; the car card, the garage, a month calendar; never online | H11, H09, H14 | draw the widget itself (no capture shows one); a widget shows what the plan shows |
| Trouble codes (FREE) | "ნათურა აინთო." · "ხელოსანმა P0420 მითხრა, ეს რაღაა?" | type the code and read it in Georgian: what it means, how urgent (4 steps), which mechanic; 9 533 codes; without internet; P0420 "კატალიზატორის ეფექტიანობა დაბალია" | H03, H09, H14 | you type the code (free); reading the car through an adapter is the OBD scanner (VINARI+, below), only once the brief says it is released; no repair price; draw the code card itself |
| QR windshield card (VINARI+) | "შუშაზე ნომრის დატოვება არ მინდა, მაგრამ უნდა დამიკავშირდნენ." · "გზა გადამიკეტეს." | A4 black and white; the passer-by picks 1 of 3 reasons; **the plate is nowhere on the card**; quiet hours only if the owner switches them on (off by default); revoked with one tap and never opens again | H11, H04 (Notification), H09 (QRCard) | use the three reasons verbatim from `../web/c/index.html` (as v3 does) |
| Auction damage record (VINARI+) | "ამერიკიდან ჩამოყვანილი ავარიული ხომ არ იყო?" | if the car was at a US auction: what was damaged, the document and the date; the database is incomplete and the screen says so; "not found" ≠ "no accident"; 2 of 5 VINs have no page at all | H05, H09 | never "full history", never "any car" |
| Wallet / max bid (VINARI+) | "ბიდს რომ ვდებ, ბოლოს რამდენი დამიჯდება?" | budget in → max bid out, minus ocean, port, commission and customs; NBG rate with its time (online) | H08, H10 (H13) | never read 30 000 ₾ / $6810 aloud |
| Parking (VINARI+) | "სად დავაყენე?" · "რომელ სართულზე ვიყავი?" | saved offline; honest precision: "±40 მ, მიწისქვეშ თითქმის ყოველთვის ასეა" | H11, H03 (H05 with ±40 m) | floor/row only if 07-parking shows them |
| Engine sound (VINARI+) | "ძრავში რაღაც აკაკუნებს, ხელოსანს რა ვუთხრა?" | 4 s recorded on the phone; says knock, squeal or hum; **never names a part**; "ვარაუდია და არა დიაგნოზი" | H04, H05 | the Wave caption "ნაწილს არ ვასახელებთ" |
| Diagnostics: 3 questions (tier not stated) | "არ ვიცი, ვისთან წავიდე." | 3 questions → 1 of 11 mechanic types, in the drivers' words (სავალი ნაწილი, კარობკა, ჟესტიანშიკი, მალიარი…) | H13, H07 (Grid 11) | never call it free; never „ხოდოვოი" |
| Price history chart (VINARI+; not in the cloud studio since 2026-10-06) | "მანქანები ძვირდება თუ იაფდება?" | 187 measured months, Geostat used-car index; the y axis has no numbers | H07, H03 | no trend claim or percentage the series doesn't show |
| VIN scan (adding a car) | "VIN-ს ხელით აკრეფა მეზარება." · "იაპონურს VIN არ აქვს." | read from a photo **on the phone** (Apple Vision); decoded without internet; a Japanese frame number (GRX130-6012345) is accepted | H09 | the scan is how the free car gets added; never call the auction record free; a frame number finds no auction record |
| Document photos (VINARI+) | "ტექპასპორტის ფოტო სად მაქვს?" | the registration certificate and the insurance in the phone, at hand; they stay on the phone, sent nowhere | H03, H09 | minor: pair with parking or deadlines; never "valid for the police" |
| Navigator (VINARI+; only once the brief says 1.0.4 is on the App Store) | "მთაში ინტერნეტი არ არის." · "წრიულზე რომელ გასასვლელში შევიდე?" | Nelson or Alice speak Georgian; works with no signal, Georgia's roads only; roundabout exits counted, lanes, bridges and cameras spoken; guides with the screen locked; home, work, „დედასთან" in one tap | H11, H09, H14 | no live traffic; cameras may be incomplete; never "free" (only the voices and one demo drive); never a phone in a driver's hand |
| OBD scanner (VINARI+; only once the brief says 1.0.4 is on the App Store) | "ჩეკი აინთო, ვიარო თუ არა?" · "მეორადს ვყიდულობ, კოდები წაშლილი ხომ არაა?" | an ELM327 adapter (Wi-Fi or Bluetooth LE on iPhone) in the port: the light, the codes, the VIN, the battery, readiness, then „შეგიძლია იარო?"; the pre-purchase check (codes cleared recently, permanent codes, the engine unit's VIN against the papers) | H03, H11, H09 | engine and emissions only, never ABS, airbags or "full diagnostics"; clearing a code is no fix; no adapter brand or price; the verdict is for the scanned car |
| Brand honesty | "აპები ციფრს იგონებენ." | every number carries a source and a time; when a source is silent, the screen says so; no account needed | H05, H02 | this is the tone of every video, not only one |
| **Car knowledge** (`carinfo`; no tier: the app only when a fact links a feature) | "ეს რა ხმაა?" · "ზამთარში რა უნდა ვიცოდე?" · "ამბობენ, რომ ..." | ONE fact of the offered bank themes (the bank: ci/carinfo-sources.json "lines", each fact's source there too): a myth broken, a surprising figure with its source, a Georgian rule, a sound explained, a piece of history, a driving habit to try tomorrow (a tip) | H15 (a tip: a question about his own driving), H02 (the belief, then the fact), H04 (the real sound before a word), H12 (the rule you did not know), H01 (two true figures), H11, H14 | only bank facts, numbers as written and whose they are; a UK/US/Canadian/Japanese rule is theirs; the app only when the fact links it; a fault named only when the recording's author named it |
| **Crazy car stories** (`stories`; no tier, no app) | „მოყევი ისეთი ამბავი, ძმაკაცს რომ გადაუგზავნო" | ONE story of the stories bank (ci/stories-sources.json: its facts and sources, a Georgian draft, the twist, a legend marked, its own licensed photos) | H21 or H22 every other film (the brief says when; HOOKS.md H21's truth table), H16, H17, H19, H20, H01, H02, H18 | only the story's facts; a legend said as one; the twist a hard fact before 70 %; no app; no joke about an injury or a death; only the story's own photos |
| **The free idea** (`free`, თავისუფალი იდეა; his words, no feature list) | his message to the page's audience: a question, a thank-you, a teaser | his words are the hook and the angle (ci/prompt.md step 1) | any formula his opening has (record it; none is refused) | no feature list; screens only for the features he names (FREE_SCREEN); a teaser stays vague; the street words only he wrote |

**Car-knowledge hooks** (examples of the shape, each true to a bank fact; never copy one word for word: `--record`
refuses an opening another film has):
- H02, a belief broken: „სუფთა ანტიფრიზი უფრო მაგარია?" then the fact (antifreeze-pure-myth: pure, it freezes at
  about -12; a 60/40 mix holds to about -45).
- H04, sound first: real-belt-squeal alone for a second, then „ეს ჭყივილი გაცნობს?" (belt-squeal-causes: low tension or a
  wet belt squeals, a misaligned pulley chirps; the recording itself is never given a cause its author did not name).
- H12, the rule you did not know: „M+S წარწერა ზამთრის საბურავს არ ნიშნავს." (winter-tyres-3pmsf-vs-ms).
- H11, the moment you know: „ზამთრის დილაა და ხიდზე შედიხარ?" (black-ice-bridges-first: a bridge freezes first).
- H01, two true figures: „-12 თუ -45? ერთი სითხე, ორი ზღვარი." (antifreeze-pure-myth).
- H14, playful but true: „ნეიტრალზე დაშვებით ფულს ზოგავ? ძრავა პირიქით ფიქრობს." (engine-braking-no-fuel).
- H15, your way (a tip): „კარს რომელი ხელით აღებ?" (hc-door-far-hand: the far hand turns your head to the cyclist).
A good car-knowledge hook makes a stranger stop: it names something every driver has seen, heard or believed, and
promises the answer in the next beat. Never a quiz voice ("იცოდით?"), never a lecture opening.

## Story films (the stories category, the owner 2026-10-06: "drive and aura, plot twists, I add the sound on TikTok")

The arc, 30 s (about 310 letters at 11.5 a second; 20 s: H, S, T, P, E; 45 s: add E3 and "what happened next" after P):

| beat | time | letters | what | picture |
|---|---|---|---|---|
| H hook | 0 to 2 | ≤ 30 | the person or thing and the gap (H16 to H20, H01, H02; since 2026-10-07 never the aura turn, H21 or H22: that is car knowledge's) | frame 0: the photo or the number composed and pushing in, an event by 1.5 s |
| S setup | 2 to 6 | ~45 | who by NAME and what they are, when, where, in one breath | a year on BigNumber or Timeline, the photo with `who` |
| E1, E2 | 6 to 14 | ~45 each | it starts, it gets crazier | a new picture each (`cuts` every 1.8 to 3.5 s) |
| B bridge | 14 to 15 | ~15 | „ჰოდა, ახლა მთავარი." · „და მერე?" · „მოიცა." | `hold` 0.3 s before the cut |
| T twist | 15 to 20 | ~55 | the turn, in the fewest words of the film | `Twist` or your Film scene, one punch word big; the beat is marked (`Twist` or `"twist": true`) |
| drop | 20 to 21 | 0 | `hold` 0.6 to 0.8 s on the punch word, the picture moving | room for his TikTok sound |
| P payoff | 21 to 26 | ~55 | one number or one image, and the name it lands on said out loud; the legend marked | BigNumber, Split (then and now), the photo |
| E end | 26 to 30 | ≤ 26 | the callback, loop or punchline (§3) | EndCard (stamp or loop over a PHOTO as the last shot before it; after a drawn shot, the clean card: the planner) |

- **The twist** is a hard fact (never the legend alone), said in few words, and it starts before 70 % of the film's spoken
  words (`--record` and check refuse later). Then the drop.
- **Told, not listed** (the owner, 2026-10-07, on v79: „ვერაფერი გავიგე ... სრულად მოყვეს, რომ გაიგოს ადამიანმა"; it said
  „ეს კაცი" and never „ლამბორგინი", „ენცო" with no word of who he was, and nine sentences of four words). The test: someone
  who never heard the story follows it after one viewing. The person or the brand by name by beats[1] (right after a
  teaser hook) with what they are; every other person the first time with who they are („ენცო ფერარი, ფერარის პატრონი");
  the payoff says the name the story lands on („ჰოდა, ასე დაიბადა ლამბორგინი"), the Twist card alone is not enough (when the card
  shows the name, the voice says it in the beat after: a card never repeats its own subtitle, DUP_SUBTITLE). A
  friend tells it in one breath: connected sentences of 6 to 12 words (70 letters at most) with the cause and what came of
  it (ჰოდა, მერე, ამიტომ, მაგრამ, და), never a run of 1 to 3 word fragments. v79's „ეს კაცი ტრაქტორებს აწყობდა. ორმოცდარვა
  წლიდან. თვითონ კი ფერარით დადიოდა." is „ფერუჩო ლამბორგინი ორმოცდარვა წლიდან ტრაქტორებს აწყობდა, თან ფერარით
  დადიოდა." (66 letters; a spelled-out year is long, so a year with a name and two verbs is about all one breath holds).
  The checks (tools/ci/stories.mjs storyTelling, the bank's "names"): STORY_NAMES, STORY_WHO, STORY_PAYOFF,
  STORY_CHOPPY, refused by `--record` and fatal in the cloud check.
- **Follow films** (every second film by number): the follow line takes ~50 letters, so drop E2 or B; the callback is the beat
  before it.
- **Legends**: in the same sentence, „ამბობენ", „თვითონ ასე ჰყვებოდა", „ენცოს თქმით"; the story's entry says how.
- **Respect**: real people are the point. Never a scandal, a crime or an accusation beyond the facts; an injury or a death in
  one calm line, never a joke (the joke turns to us); a brand or a rival is never put down; a person who died recently (Alex
  Zanardi, 1 May 2026) without a punchline.
- **On screen**: one punch word a beat at most, 1 to 3 words, never the subtitle's words in the same frame; numbers as digits
  with their unit; the cover two short buddy lines, a question or the twist half told („ცეცხლიდან | ექვს კვირაში სტარტზე"; a number keeps the fact's own starting point: the six weeks count from the crash).
- **The photos must read** (the owner, 2026-10-07, on v79's opening wipe: „ფოტოები არ ჩანს ... ჯობია დააპატარაო"): only a
  tall (portrait) photo fills the whole frame; a wide or small one is shown whole on the clean field (a print, or the plate
  and the pair the render falls back to: src/lib/bleed.ts), except in a Split stack, whose two wide panels it fills. A
  frame-0 photo of H20 that must fill the screen takes a tall photo; a landscape car is a print.
- **The post**: what the film did NOT say (the owner, 2026-10-07: a post that repeats the voice reads as slop): a fact of the
  story the voice left out, the context or your own take, in your own words, one or two sentences, may end on one question;
  never the voice retold (POST_ECHO); no call to action (the comment ask and the photo credits are added by publish.mjs).

## Sources

[S1] TikTok Ads Help, creative best practices for performance ads (fetched): https://ads.tiktok.com/help/article/creative-best-practices
[S2] TikTok for Business blog, top-performing ads, citing Kantar, Lumen, Neuro-Insight and Ipsos (fetched): https://ads.tiktok.com/business/en/blog/creative-best-practices-top-performing-ads
[S3] TikTok Creative Codes (fetched): https://ads.tiktok.com/business/en-US/creative-codes
[S4] Meta, "The Science of the Hook", Dec 2025 (fetched): https://www.facebook.com/business/news/the-science-of-the-hook-how-to-supercharge-your-reels-performance
[S5] Meta / Facebook IQ, "Capturing attention in feed", 2016 (fetched): https://www.facebook.com/business/news/insights/capturing-attention-feed-video-creative
[S6] Google Ads Help, ABCDs of effective video ads (fetched): https://support.google.com/google-ads/answer/14783551
[S7] Google Ads Help, YouTube Shorts ads best practices (fetched): https://support.google.com/google-ads/answer/16041697
[S8] YouTube, "viewed vs swiped away" metric: https://support.google.com/youtube/community-video/273390203 (the "under 30 % is strong" benchmark is third-party and unverified)
[S9] Shorts view counting from 2025-03-31: https://ppc.land/youtube-changes-how-shorts-views-are-counted-from-march-31/
[S10] TikTok Newsroom, "How TikTok recommends videos #ForYou": https://newsroom.tiktok.com/how-tiktok-recommends-videos-for-you
[S11] Mosseri, Jan 2025 ranking signals (secondary reporting): https://blog.hootsuite.com/instagram-algorithm/
[S12] Loewenstein 1994, The Psychology of Curiosity: https://www.cmu.edu/dietrich/sds/docs/loewenstein/PsychofCuriosity.pdf
[S13] Aubin Le Quéré & Matias 2025, Sci. Rep., 8 977 Upworthy tests (fetched): https://pmc.ncbi.nlm.nih.gov/articles/PMC11704130/
[S14] Schindler & Yalch 2006, sharp vs round numbers: https://www.researchwithrutgers.com/en/publications/it-seems-factual-but-is-it-effects-of-using-sharp-versus-round-nu/
[S15] WAN-IFRA 2023, The Economist's short-form rules (fetched): https://wan-ifra.org/2023/08/how-short-form-video-is-helping-the-economist-gain-young-users/
[S16] Vox Creative explainers go short-form (search snippet only): https://www.campaignlive.com/article/vox-creative-explainers-go-short-form-tiktok-instagram/1802718
[S17] The Drum 2023, Carwow car-buying pains series (fetched): https://www.thedrum.com/news/carwow-plays-car-buying-pains-with-tongue-cheek-social-media-series
[S18] DataReportal, Digital 2026 Georgia (fetched): https://datareportal.com/reports/digital-2026-georgia
[S19] Geostat via Crystalauto, May 2026 (US imports, Q1): https://www.crystalauto.ge/news/7703-sakartvelos-amerikuli-mankanebis-importi-8-it-gauiapda---rogoria-erti-erteulis-ghirebuleba (summaries disagree on which figure is which; context only)
[S20] lionauto.ge import guide, Georgian vocabulary and fears (fetched): https://lionauto.ge/amerikidan-sakartveloshi-meoradi-avtomobilis-importi/
[S21] ტექდათვალიერება in the Georgian car press: https://www.crystalauto.ge/news/5798-tekdatvaliereba---rogor-ar-unda-chavichrat · https://www.mogo.ge/news/55/ra-unda-vicode-teqdatvalierebis-shesaxeb
[S22] Think with Google, video ad creative experiments (fetched): https://business.google.com/us/think/search-and-video/video-ad-creative-experiments/
[S23] "47 % of value in the first 3 s" (unverified; the primary source was not found): https://www.socialmediatoday.com/social-business/facebook-advancing-video-strategy-adds-mid-roll-video-ads
[S24] "63 % of top-CTR ads", "decided at 1.5 s" (agency blogs; unverified): https://www.stackmatix.com/blog/tiktok-hook-first-3-seconds
[S25] pollar.news (a text news service; no video format found): https://pollar.news/en/about
