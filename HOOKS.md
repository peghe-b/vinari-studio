# HOOKS: how a Vinari video opens

Load this file before writing a new `specs/<id>.json`. The companion files are `CLAUDE.md` (pipeline, scenes, pitfalls)
and `../Marketing/VINARI — app brief.md` (the only source of facts). Where this file and the brief disagree, the brief wins.
Georgian examples are spec-ready `show` strings: `|` splits subtitle chunks, digits are allowed, and every chunk is at most 24 characters.
In `say`, spell the numbers out in Georgian words.

The owner's newest word (2026-09-24): plain everyday Georgian (Say it simply, below), hooks may be playful or silly if true (H14),
never the listing site's name ("myauto" in any spelling: say "ცოცხალი განცხადებები" or "ბაზარი"), and every film closes on the
quiet EndCard with a short creative quote, never a call to action (§3).

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

## 1. Hook formulas (H01 to H14)

Every hook has the same skeleton. **Frame 0 is a finished still.** Everything with `at: 0` is already composed and the meta bar is already typed,
because frame 0 is also the cover and the loop point. The voice starts at about 0.15 s. **Aim for chunk 0 at 15 characters or fewer** (about 1.2 s),
so that **chunk 1 starts a visible event by about 1.5 s**: a flip, a land, a strike, a pin or an inflating dot. A chunk 0 of 16 to 24 characters
moves the event to about 1.7 to 2.2 s. That is fine only when the frame-0 scene already moves on its own (Wave, a LineChart or Wire3D draw-on,
Grid ticking, a Calendar countdown) or when chunk 0 itself says the number. Promo already plays `asmr-sub` on frame 0 and
`asmr-air` on every cut, and every scene sounds its own events (CLAUDE.md, Sound): add a spec `sfx` cue only for an event
no scene sounds by itself, never a second `asmr-sub`. Timings below are at 30 fps.

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
- Frame 0: `Wire3D` `ship-cargo-a` with `move` toward `marker` "01.01", or `Phone` `06-market`.
- `ბიდის დადებამდე | ეს დაითვალე.`
- `გემი იანვარში ჩამოდის? | ჯერ ეს ნახე.` (resolve with "ახალ თანხას გადაიხდი", never "a late ship pays")
- `გაყიდვამდე ნახე, | რამდენი ღირს დღეს.`

### H11 · The moment you know (POV)
- Why it works: recognition ("that's me") is ABCD's Connect [S6]. Carwow built a series on car pains [S17]. Talk like a friend [S22].
- Frame 0: `Wire3D` with two models (one blocking), `Title` `strips` with the masked phone number "5•• •• •• ••" (as in v3), or `MapPin`.
- `გზა გადაგიკეტეს, | პატრონი არსად ჩანს.`
- `შუშაზე ნომერს ტოვებ? | ყველა გამვლელი ხედავს.` (the frame must show a phone number, since "ნომერი" also means the plate)
- `მიწისქვეშა პარკინგი. | რომელ სართულზე დატოვე?`
- `ძმაკაცი ერთს გეტყვის, | გადამყიდველი სხვას.`

### H12 · The rule you didn't know
- Why it works: a specific, checkable rule is high-value novelty [S13]. The consequence number is the payoff.
- Frame 0: `Wire3D` `sedan-sports` with `flip` 2026 → 2027 `at: 1` and `tone: "down"`. Alternative: `Stat`.
- `საბაჟოსთვის მანქანა | 1 იანვარს ბერდება.`
- `ასაკს განბაჟების | წლით ითვლიან.`
- `საჭე მარჯვნივ? | ერთი გადასახადი ×3.` (say "… ერთი გადასახადი სამჯერ მეტია."; v10 said "აქციზი", too official, and "სამმაგი" is bookish. Over `SplitFlap`
  "×1" → "×3" `at: 1`, label "2020 · 2.0 L · ბენზინი"; brief: the excise is multiplied by three)
- Must: if the voice says "the same car", the same model is on screen. Avoid "წელს" in year-change videos. The ×3 is the excise
  only, not the total, and it holds for an ordinary car (the code exempts classics over 30 years and treats electric cars apart):
  name the car in the label and never say "განბაჟება სამჯერ". If the calculator screen shows the word აქციზი, say once, plainly,
  that it is one of the three parts of the customs sum.

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
  at a person or a group (mechanics, sellers, drivers), never at accidents. Calm delivery: no "!", no emoji, no slang spelling,
  no fake urgency; a Gemini `style` may ask for "a small smile in the voice". It is scored with the same rubric, and silly never
  excuses a 0 on #3.

Twelve examples (`show` → the scene at frame 0 and its event on chunk 1; why it is true):

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

## Say it simply (the owner, 2026-09-24: the wording was "მაღალფარდოვანი")

Every line is what a friend says out loud in the car. "შენ", short, everyday words, the drivers' own words (ჩამოყვანა, ბიდი, განბაჟება,
ტექდათვალიერება, კარობკა). Every line goes through the Georgian check before it is voiced (the owner, 2026-09-25: "აბდაუბდა"); the
traps and our own lines before and after are in CLAUDE.md, Say it simply.
- One thought per sentence: **7 words or fewer** (9 at most, counted on `show`, a number is one word); in the voice **40 letters or
  fewer** (55 at most). Two sentences per beat at most. Verbs, not nouns. No "რომელიც" chains.
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
| 4 | Tension the video resolves | no gap, or never closed | closed too early (under 3 s) or only by the end card | a clear gap, answered at 60 to 75 % |
| 5 | Georgian sounds native | translated, bureaucratic or high-flown (მედიანა, დეკლარაცია, კონკურენცია), ambiguous | correct but written register | what a friend says aloud; chunks of 24 or fewer; no "წელს"/"ყველას"/"ორი განბაჟება" traps |
| 6 | Fits the first scene | no scene can show it | carried by a Title card only | a data scene shows the hook itself at f0 and changes at chunk 1 |

Keep the highest total; ties go to #3, then #1. Ship at **9 or more**. Any 0 on #3 discards the hook.

Calibration: "ერთი მანქანა. | ორი ფასი საბაჟოზე." over SplitFlap scores 2/2/2/2/2/2 = 12.
"იცოდით, რომ განბაჟება იცვლება?" scores 0/1/2/1/0/1 = 5: a generic opener, the formal "-თ", and no number.

Georgian register: use informal singular "შენ". Never mix future and present in one sentence ("ჩაწერ… ხედავ" is wrong).
An imperative followed by a future result is natural ("დაამატე… ნახავ").
Use the drivers' words: ჩამოყვანა (not იმპორტი), ბიდი, განბაჟება, ხოდოვოი, კარობკა, ჟესტიანშიკი, მალიარი.
Say ტექდათვალიერება in speech; ტექინსპექტირება is also fine, and it must match the word on the Phone screen shown.
For things, say "ყველაფერს", not "ყველას".

## 3. Structure templates

The budget is about 11.5 letters per second of voice (15 s ≈ 150, 20 s ≈ 210, 30 s ≈ 310). Beats: **H** hook, **T** turn/proof, **W** why/rule,
**M** mechanism (real screen), **P** payoff (the hook's gap closes), **E** end card. The payoff lands at about 70 %.
**E is the quiet EndCard with a creative closing quote** (the owner, 2026-09-24: he likes these endings; keep them): the mark, the wordmark
and a short quote in plain Georgian as `tagline`, spoken once as the last line, plus an optional quiet `note` ("… · VINARI+").
Its subtitle is dropped automatically because the card already shows the words. **There is no CTA**: a store line reads as marketing and pushy.

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
  Never repeat the tagline in `note`. The quote is creative but plain: a small twist, an image or an aphorism a friend would say,
  true to the film, no brand boast, no promise, no "!".
- **Creative closing quotes** (≤ 26 characters, each true to its film; write new ones in this spirit):
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
- **An ASMR sound on every event.** This is the default: no music (`music` absent or null), Promo plays `asmr-sub` on frame 0,
  `asmr-air` on every cut and `asmr-room` under the whole film, and every scene fires the asmr- sound of each of its own events.
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
- Generic openers: "იცოდით, რომ…", "ყურადღება", "ეს აუცილებლად ნახე", "გაოცდები", "99 % არ იცის".
- Fake urgency: "სანამ გვიანაა", "ახლავე". A countdown `{daysToJan1}` is true only on the render day, so render on the posting day or drop it.
- A call to action of any kind: a store name, "გადმოწერე", "download", "try it", a store line on the card. The film ends on the EndCard's
  creative quote.
- High-flown words (მედიანა, სიმჭიდროვე, დეკლარაცია, კონკურენცია, აქციზი: Say it simply) and the listing site's name in any spelling.
- Invented stats: percentages, user counts, "ათასობით მძღოლი", and any number not in the brief. That includes true outside facts,
  for example the 50 ₾ penalty for a missed inspection [S21] or import volumes [S19]: background only, never on screen.
- Shouting: no "!", no em dash, no Mtavruli caps, no emoji, no zoom-punch on every word, and a voice rate no higher than +12 %.
- Forbidden claims: showing owners, fines, finding a car by plate, "full history", "დიაგნოზი" (or დავადგენ/გამოვავლენ), Monroney, an Android date,
  or "free" for anything except one car and its price.
- Screens that contradict the voice (05-customs is not a customs total), reading live prices off screens, test data (03-calendar-day), "09:00 · 19:30" on 7- or 3-day reminders.

## 5. Angle bank per feature

| feature (tier) | pain in their words | strongest true fact (brief) | best formulas | watch |
|---|---|---|---|---|
| Market price (FREE: one car) | "რამდენი ღირს ჩემი მანქანა დღეს?" · "ძმაკაცი ერთს მეუბნება, გადამყიდველი სხვას." | live-listing **median** ("შუა ფასი", never the site's name), not the average; shows how many listings were counted and when; no median drawn when listings are few; how many of the same car are for sale now | H02, H11 (then H10 "before selling"); sellers (v9): H03 "რამდენი ყიდის შენნაირ მანქანას?" | never read the price or the listing count off a screen (both are live); "free" only for one car and its price, as a fact, never as the closer; 16-chart is the paid chart screen: meta "ჩარტი · VINARI+" |
| Customs + 1 January (VINARI+) | "განბაჟება რამდენი გამოვა?" · "იანვარში რამდენით გაძვირდება?" | 2020 · 2.0 L petrol: 3 610 ₾ → 9 615 ₾ (+6 005); 29/29 with rs.ge; offline formula; age from the declaration year; right-hand drive excise ×3 (v10); excise, duty and fees shown separately | H01, H12 (H06, then H07 as proof) | `validUntil` 2026-12-31 for the 3 610 / 9 615 pair; the car on screen equals the car in the voice; ×3 is the excise, never the total; hybrid and electric have no brief figure: no numbers for them |
| Deadlines (VINARI+) | "ტექდათვალიერება დამავიწყდა." · "დაზღვევას ვადა გაუვიდა და ვერც გავიგე." | inspection, insurance, oil, tyres and 6 more types; 7 / 3 / 1 days before; 09:00 on every step, 19:30 only 1 day before and on the day; local, no server | H03, H11 | no fines; the Notification says "09:00" |
| QR windshield card (VINARI+) | "შუშაზე ნომრის დატოვება არ მინდა, მაგრამ უნდა დამიკავშირდნენ." · "გზა გადამიკეტეს." | A4 black and white; the passer-by picks 1 of 3 reasons; **the plate is nowhere on the card**; quiet hours only if the owner switches them on (off by default); revoked with one tap and never opens again | H11, H04 (Notification), H09 (QRCard) | use the three reasons verbatim from `../web/c/index.html` (as v3 does) |
| Auction damage record (VINARI+) | "ამერიკიდან ჩამოყვანილი ავარიული ხომ არ იყო?" | if the car was at a US auction: what was damaged, the document and the date; the database is incomplete and the screen says so; "not found" ≠ "no accident"; 2 of 5 VINs have no page at all | H05, H09 | never "full history", never "any car" |
| Wallet / max bid (VINARI+) | "ბიდს რომ ვდებ, ბოლოს რამდენი დამიჯდება?" | budget in → max bid out, minus ocean, port, commission and customs; NBG rate with its time (online) | H08, H10 (H13) | never read 30 000 ₾ / $6810 aloud |
| Parking (VINARI+) | "სად დავაყენე?" · "რომელ სართულზე ვიყავი?" | saved offline; honest precision: "±40 მ, მიწისქვეშ თითქმის ყოველთვის ასეა" | H11, H03 (H05 with ±40 m) | floor/row only if 07-parking shows them |
| Engine sound (VINARI+) | "ძრავში რაღაც აკაკუნებს, ხელოსანს რა ვუთხრა?" | 4 s recorded on the phone; says knock, squeal or hum; **never names a part**; "ვარაუდია და არა დიაგნოზი" | H04, H05 | the Wave caption "ნაწილს არ ვასახელებთ" |
| Diagnostics: 3 questions (tier not stated) | "არ ვიცი, ვისთან წავიდე." | 3 questions → 1 of 11 mechanic types, in the drivers' words (ხოდოვოი, კარობკა, ჟესტიანშიკი, მალიარი…) | H13, H07 (Grid 11) | never call it free |
| Price history chart (VINARI+) | "მანქანები ძვირდება თუ იაფდება?" | 187 measured months, Geostat used-car index; the y axis has no numbers | H07, H03 | no trend claim or percentage the series doesn't show |
| VIN scan (adding a car) | "VIN-ს ხელით აკრეფა მეზარება." | read from a photo **on the phone** (Apple Vision) | H09 | the scan is how the free car gets added; never call the auction record free |
| Document photos (VINARI+) | "ტექპასპორტის ფოტო სად მაქვს?" | stay on the phone, sent nowhere | H03, H09 | minor: pair with parking or deadlines |
| Brand honesty | "აპები ციფრს იგონებენ." | every number carries a source and a time; when a source is silent, the screen says so; no account needed | H05, H02 | this is the tone of every video, not only one |

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
