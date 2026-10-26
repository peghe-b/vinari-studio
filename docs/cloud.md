# The cloud studio

> Moved out of CLAUDE.md on 2026-10-26 (plan step 2.5: the cloud context slimmed to the rules). Nothing here was
> dropped. Section names in the text (Voice, Style, Motion, Sound, Story moments, The ending, Cloud studio ...) and
> "rule N" point to the other files of docs/ (CLAUDE.md's map says which); the linters named here still enforce them.

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

The motion layer's rollout: `ci/fx.json` (`from`: the first film number that gets it, `categories`: "all" or a list,
`stories`: the categories with the story defaults); Motion, above. A redo of an older film keeps the old look.
Categories: `ci/categories.json` is the single source of the 15 categories (ids, Georgian labels, allowed facts,
never-lists, screens). Since 2026-10-06 (the owner: "chaos, too many; name them as in the app; the main features on
top") they are named as the app names its features; the same evening (the owner: "move the extra categories to the top,
the new one first, I have to scroll") the list is: stories (გიჟური ისტორიები, crazy car stories from their own bank,
`"diceEvery": 4`; Crazy car stories, above), free (თავისუფალი იდეა, the owner 2026-10-06: his own idea, typed, never
rolled; The free idea, above), carinfo (მანქანის ცოდნა, car knowledge from a sourced fact bank,
`"diceEvery": 2`: every other dice roll; Car knowledge, above), general (ზოგადი) and whatsnew (აპში დაემატა, the newest
update's announcement films; `"dice": false`, so only asked for, and `"allfacts": true`), then the features: qr (QR
ბარათი), parking (პარკინგი), vin (VIN სკანერი), engine (დიაგნოსტიკა), obd (OBD სკანერი), nav (ნავიგატორი), reminders
(კალენდარი), widgets (ვიჯეტები), auction (ჩემი საფულე), docs (საბუთების ფოტოები). The dice still breaks a tie with a
feature first. The ids did not change, only the labels and the order. The site (web/api/studio.js, web/studio.html, and scripts/studio-dev.mjs's
mock) hard-codes the same ids, in the same order: change all four together (scripts/studio-lock-words-test.mjs in the
Vinari repo checks the order and the "needsTopic" list against this file). **Retired** (ci/categories.json `"retired"`): price (ფასი და
ბაზარი), customs (განბაჟება) and chart (ფასების ისტორია) on 2026-10-06 ("rubbish, make it simpler"), honest (რასაც
Vinari არ გეტყვის) on 2026-09-28. Their old specs and ledger lines keep the id: build-index still indexes and renders
them, the site still labels them, but no new film or redo is made in them (prompt.mjs refuses; the bank's one customs
link counts as none).
**The App Store gate** (the owner, 2026-10-06: "show the navigator and the OBD scanner faded, blocked until the update
is on the App Store; when tapped, say they wait for it, then they open"): a category with `"release": "1.0.4"` (obd,
nav) is locked until Apple's public lookup (`"store".lookup`, results[0].version) says the live version is at least
that, and an `"after": {"1.0.4": {...}}` block (engine without "the app does not plug into the car", general and whatsnew
with the 1.0.4 features and screens, vin, widgets and docs with the 1.0.4 home and menu screens) applies from the same
moment. Nothing is deployed when Apple releases: the brief
asks Apple itself (tools/ci/release.mjs, 3 tries, fail closed; `STUDIO_STORE_VERSION=1.0.4` pretends on the Mac), and
the site asks it too (web/api/studio.js, cached 10 minutes per instance, fail closed: the rows stay faded and /make
answers 409 "locked", also for a typed idea or a redo's note that names the navigator or the OBD scanner: its
`LOCK_WORDS` cover obd's and nav's `"words"` here except the few a car-knowledge idea uses too, `LOCK_SKIP`; after
changing either, run `node scripts/studio-lock-words-test.mjs` in the Vinari repo). While locked, the dice, the
topic's category and the general rotation never use them, the brief names them and their screens as out of bounds
(`{{lockedLine}}`), prompt.mjs writes `out/ci/categories.now.json` (the categories as true today: locked and retired gone,
`after` merged) and the brief sends Claude there, never to ci/categories.json; request.json carries `store`, `locked`,
`lockedScreens` and `oldScreens`, `--record` re-applies that version, and check.mjs (VS_CI=1) refuses a locked screen
anywhere in the spec or the film's scene (LOCKED lines); after the release it refuses the screens the release replaced
the same way (`oldScreens`, the brief's `{{oldLine}}`: 01-home and 10-features, the app as it looked before 1.0.4). After the release the next two non-carinfo dice films go to obd and nav
(never used, they win the tie), and then they take their turn with the least-used categories: the dice counts a
category that opened late at no fewer films than the least-used of the rest (prompt.mjs `dice()`), so there is no
catch-up run of navigator and OBD films. After every big app update, bring the facts, "whatsnew" and the site's blurbs up to date.
Ideas never repeat inside a category: the brief lists every earlier angle, formula, opening, cover title and
quote of that category, and `--record` refuses a repeat.

**His idea is the plan** (the owner, 2026-09-30: the co-founder could type only a little, and the studio did not do
what he wrote). The site takes an idea of up to 2000 characters and a redo's note of up to 1000 (the same limits in
web/api/studio.js `line()`, studio.yml's "check request" and prompt.mjs `TOPIC_MAX` / `FEEDBACK_MAX`; the page turns
each line break he types into " / "). A typed idea is the film's plan (ci/prompt.md step 1): Claude makes the film he
described (his situation, story and order, opening, pictures, words, ending), invents only what he left open, changes a
part only for a house rule, the category's facts or the length, and never drops his idea for being close to an earlier
film ("Made before" then changes only the wording and the drawing). Length and voice stay the request's. The 8 fresh
angles remain for an empty topic and a bare theme. His opening is the hook: `--record ... --from-idea` keeps a formula
the category's last two films opened with (a note instead of a refusal; only when his idea, a redo's original, and note
hold 8 words or more, `OWN_OPENING`: a bare theme, a chip or a dice film's idea gives no opening); a picture he
describes is the Film scene. The gate reads film directions and an invented first-name character as part of the topic.
The last line ends ` · not done: <what>` (Georgian, never the word OFF_TOPIC) whenever something was typed; the
workflow's gate step cuts that tail off before it looks for OFF_TOPIC. The public ledger and the run summary keep the
first 300 characters of an idea (…); post.json has it whole (a public repo's artifact: any signed-in GitHub user can
fetch it for its 2 days). The site sends a redo's topic only when it has the whole idea (its own copy or post.json);
otherwise it sends none, and the brief takes the original's topic from the ledger, never a cut one as his whole idea.

**What's new on the site** (the owner, 2026-09-30: "when we add an update, pop it up once"): every studio change the
co-founder should know about adds one entry at the top of `NEWS` in web/studio.html: a new `id`, the `date`
(YYYY-MM-DD), a short friendly Georgian `title` and one or two sentences of `body` (no em dash, no "!", a no-break
space inside a number: `2\u00a0000`); optional `ok` (the button's word, default "კარგი") and `write: true` (the button
also puts the cursor in the idea field: only for news about writing the idea). After the password screen the site shows
the newest unseen entry once as a bottom sheet (older unseen ones under it), then never again (localStorage
`vs.news.<id>`; without storage, once per page visit). It waits while a video sheet or a question is open, while he
types in a field or a video is being sent, and entries older than 30 days (`NEWS_DAYS`) never show (a new phone
in January does not get September's news).


vinari.ge/studio (web/studio.html + web/api/studio.js in the Vinari repo) dispatches
`.github/workflows/studio.yml` of peghe-b/vinari-studio, whose root is this folder. One run at a time
(concurrency "studio", `queue: max`), on `ubuntu-24.04` (pinned: ubuntu-latest moves to 26.04 from 2026-10-19;
move on purpose, after a test), a 220-minute job (script 50 + its hand-over window 10 + plan 5 + render 140 + the rest; 205 until
plan step 2.1, 2026-10-26; web/api/studio.js JOB_TIMEOUT_MS, the page's
JOB_MIN and the mock match, scripts/studio-lock-words-test.mjs holds them; 175 and 110 until the 60 s lessons, 2026-10-12: measured
render steps 26..34 min for 20 s, 28..49 for 45 s, so about 75..95 for 60 s), with the owner's Mac switched off.
- **Flow**: **check request** (inputs checked, the topic at most 2000 characters and the feedback 1000; the typed topic and feedback are read from the event, never
  from the job's env, masked with `::add-mask::` and handed on through GITHUB_ENV; a second run of the same
  req stops here; the daily cap, below) → checkout, node → **brief** (`tools/ci/prompt.mjs` fills
  `ci/prompt.md`, writes out/ci/request.json; its pre-gate turns plain spam down with no model: a link, the
  same letter or word over and over, mostly another alphabet, or only invisible characters →
  out/ci/rejected.json, exit 4, the run ends here, before anything is installed) → python, caches →
  **setup** (`tools/ci/setup.sh`: zsh, npm ci, `requirements.txt`, Remotion's chrome-headless-shell, and the API
  engine when it may run) → restore spend → plan (films: `tools/ci/director.mjs`, below) → **script**, on one of two
  engines (below): claude api, or clean for fallback → claude token (cleaned, handed to the next step as a step OUTPUT,
  never GITHUB_ENV, so no later step or action sees it) → claude oauth (claude-code-action), then the verdict step
  named script → save spend, spend (the summary line). The script step itself: first the gate, `ci/prompt.md` §0, only when a topic or
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
  `tools/vo.py`) → **render** (`VS_CI=1 ./make.sh <id>`: the film only; its own 140-minute limit) →
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
- **Daily cap** (the owner, 2026-09-25): at most 10 runs a day (the hard wall against spam; a refused or failed
  run counts too). Since 2026-10-23 for each kind apart: 10 films and 10 story sets a day (a story set when the run
  title's meta has `"k": "s"`, anything else a film); the site shows the count of the tab it is on. The site shows it top right as "დღეს N / 10": the films started today (Tbilisi day), the same
  count the API and "check request" make, back to 0 at Tbilisi midnight (until 2026-09-28 it showed a goal of 3
  finished films, which read as a limit that was always used up). The cap is enforced twice: the site API (one /make at a time per instance, a real
  queue; a request that would wait over 8 s gets 503 "busy"; a dispatch in flight already counts) and "check
  request" (today's `event=workflow_dispatch` runs before this one, of its kind, every page; three tries, then the run stops
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
- **The looks never repeat** (tools/ci/visual.mjs): a film's visual signature is its scenes in order as tokens
  (`QRCard:night`, `Phone:tilt/05-customs`, `Wire3D:hero/sedan`; EndCard left out). `--record` stores it in the
  ledger (`"visual"`); the brief lists the category's last 5 and asks for other stagings and one scene type the newest
  did not use; `check.mjs` (before the voice, so a refusal costs nothing) fails under VS_CI=1 with `VISUAL_REPEAT ...`
  lines when the first scene of a signature type (ci/categories.json `"signature"`: qr QRCard, parking MapPin, engine
  Wave, reminders Calendar and Notification, the Phone categories Phone, general every staged type) repeats the
  staging of either of the category's last 2 films, or the whole signature equals one of its last 5; on the Mac it is a
  note. A redo keeps its original's looks (not checked). An unknown staging name is refused too.
- **New visuals per film** (Film scenes, docs/scenes.md): the brief lists the category's last 10 new visuals (the ledger's
  `"idea"`) and asks for a new one as the film's own Film scenes, linted, then looked at on the contact sheet and
  refined. The Claude step may write only `specs/**` (not `specs/.*`) and `src/scenes/film/**` (not `_*`, so never the
  template) and may run `node tools/ci/filmlint.mjs`. `--record ... --idea "<one line>"` stores the idea next to the
  visual signature (required when the spec has its own Film scene, refused like `--angle` with markup or a command, or
  when it repeats an earlier film's idea; a redo that keeps its original's Film scene keeps its idea). check.mjs under
  VS_CI=1, before the voice: one to three Films of its own in a new film (since plan step 1.3, 2026-10-26; until then
  exactly one), named after its id (`<Name>`, `<Name><Word>`; a redo keeps its original's or writes its own under the redo's
  id; the names are counted, not the scenes, since 2026-10-12: a lesson's one diagram comes back step by step, and the count
  refused it), 90 KB together, every film file passes filmlint (FILM lines; on the Mac too), and no other file in
  src/scenes/film/ changed (git status). The written treatment comes before all of it (ci/prompt.md step 1,
  tools/ci/treatment.mjs: TREATMENT, HOOK_SOUND, HOOK_CALM, HOOK_LIBRARY, REVEAL_LIBRARY, SCREEN_FLOW). publish commits
  the film's own files with the spec and the ledgers, and the
  ledger line keeps `visual` and `idea`. The script step's limit is 50 minutes (140 turns since plan step 1.3; 110 before) for it.
- **Contracts the site reads** (never rename): run-name `studio <req> <meta>` (the site seals the topic in
  meta.t with a key only Vercel has: the run list of this public repo is public); the steps named setup,
  script, voice, render, cover, publish, in that order and used by no other step; the upload steps' names
  start with "upload " (the site's cancel/delete, 2026-09-25, reads them to know a finished run had files:
  a run whose files the owner deleted is hidden but still counts toward the day; a queued run he cancels
  is deleted on GitHub and does not count); single-file artifacts
  `video.mp4`, `cover.png`, `post.json` and the optional `thumb.jpg` (archive false, 2 days, `name` = the
  file name so a re-run can overwrite); post.json {req, id, topic, category, description, tags, theme,
  seconds, title, voice, voiceSource ("gemini" | "edge"), voiceModel, geminiOut, music (the bed's name or null;
  the site ignores it)} (the site's
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
  `specs/.studio.json`, req → {id, topic, base, at, category, angle, hook[, features][, facts][, from], visual[, idea][, ending][, street]}, is written by
  `node tools/ci/prompt.mjs --record <id> --hook <Hnn> --angle "<one line>" [--idea "<one line>"] [--facts <ids>]` and committed back
  to main with the spec, `specs/.themes.json` and the film's own `src/scenes/film/<Name>.tsx`. The id always comes from that ledger.
- **Two engines for the script step** (plan step 2.1, 2026-10-26). `claude api` runs `tools/ci/claude-run.mjs write`:
  the same Claude Code (the Agent SDK of `tools/ci/engine`, pinned to 0.3.281 = Claude Code 2.1.281, the version the
  pinned action installs; one native binary, installed by `tools/ci/engine/install.sh` in setup) with the action's own
  choices (the claude_code preset, every setting source, so CLAUDE.md and SKILL.md load; the tools and turn cap of
  `ci/tools.json`; the same `$RUNNER_TEMP/claude-execution-output.json` that "gate" and "claude error" read) on the repo
  secret ANTHROPIC_API_KEY (the Max plan's monthly API credits; no card and no auto-reload, so an empty balance is the
  hard cap) with maxBudgetUsd 12. It hands over (output fallback=1, exit 0) when there is no key, the engine is not
  installed, the ledger says no, or the API refuses within the first 10 minutes (a wrong or revoked key: 401 in about
  4 s; no credits; a rate limit; an outage). Then "clean for fallback" resets specs/ and src/scenes/film/, and "claude
  token" + "claude oauth" run the Claude Code Action on CLAUDE_CODE_OAUTH_TOKEN exactly as before (prompt: the plan or
  the brief; claude_args from `node tools/ci/claude-run.mjs args`). Repo variable STUDIO_ENGINE=oauth skips the API. A
  TEST dispatch may put `"engine": "oauth"` or `"engine": "badkey"` (a wrong key on purpose) in its meta. The verdict
  step "script" (the contract name) passes when either engine finished and writes `out/ci/engine` (post.json
  `"engine"`). The API engine prints only `api result: {subtype, turns, cost, ...}` and an API error's first line, never
  the transcript, and its failures are never `claude_auth` / `claude_limit` (those are the owner's token and his Max
  limit; "claude error" skips them). Claude Code scrubs the keys out of its Bash commands' env on GitHub Actions by
  default; CLAUDE_CODE_SUBPROCESS_ENV_SCRUB=1 is not set (it would add a subprocess sandbox the render stack never ran in).
- **The spend ledger** (plan step 2.2, `tools/ci/spend.mjs`, `tools/.spend/ledger.json` through actions/cache: "restore
  spend", and "save spend" right after the script step, even on a failure). The month is the credits' cycle, from
  STUDIO_API_CYCLE_DAY (2, UTC) to the same day next month; its cap STUDIO_API_MONTH_USD (190). The writer may use the
  API while the month has its own cap (STUDIO_API_FILM_MAX, 12) left and today's share (what was left before today over
  the days left) is not used up; a billing refusal marks the balance empty for 24 h (or until the next cycle). Every job
  summary has `api $x.xx · month $y / 190 · engine api|oauth`. A lost cache only forgets the month; the balance stays the
  hard cap. Caches are per branch: a test run on a branch never counts in main's ledger.
- **The director** (plan step 2.3, `tools/ci/director.mjs`, step "plan", films only, never a redo or a free idea): two
  Messages API calls on the API key (claude-opus-5-5, effort high, structured output; the system prompt is
  ci/promo-dna.md + HOOKS.md's buddy tone and hook rubric, cached with the brief): three pitches from three angles, then
  a judge that sees them anonymised and shuffled scores each on the six rubric rows (strict on calm, safe hooks); the
  highest total wins (ties: the louder hook). Under 8, or on any API error, refusal, bad reply or the 255 s deadline,
  nothing happens and the brief goes on alone. Else "The plan (the director's pick)" is appended to the brief between
  `<<<PLAN <code>` markers (DATA), and ci/prompt.md step 1 has the writer copy its pitches and scores into the treatment.
  The log shows scores and the cost only, never a pitch (the typed topic is private). About $0.3 a film.
- **Knobs**: repo variable STUDIO_NO_EDGE (unset = the edge-tts fallback, the default; `1` = stop instead),
  passed as job env `VO_NO_EDGE`; secrets CLAUDE_CODE_OAUTH_TOKEN, ANTHROPIC_API_KEY (the API engine and the director;
  empty = everything on the token, as before), GEMINI_API_KEY; repo variables STUDIO_MODEL (default
  claude-opus-5-5), STUDIO_ENGINE (oauth = the token only), STUDIO_EFFORT (unset = Claude Code's default),
  STUDIO_API_MONTH_USD (190), STUDIO_API_CYCLE_DAY (2), STUDIO_API_FILM_MAX (12), STUDIO_DIRECTOR (off = no plan),
  STUDIO_GL (swangle), STUDIO_CONCURRENCY, STUDIO_DAILY_CAP (default 10; keep it equal to
  the site's). The voice cache and the spend ledger travel by actions/cache.
- **Guards**: "check request" refuses a run when the cap was already started that Tbilisi day (the site
  counts too, but only per Vercel instance). Checkout takes the branch tip, so a queued run sees the run
  before it (so push a change to the workflow or the brief scripts only while no film is queued or running:
  a queued run keeps the old YAML but checks out the new scripts). The topic is typed on a website: the
  Claude step may write only `specs/**` (not `specs/.*`) and `src/scenes/film/**` (not `_*`), and run only
  next-theme, `ci/prompt.mjs --record`, `ci/prompt.mjs --reject`, check, build-index, filmlint, vo.py and ls (no
  /proc, no .git). A new
  command in `ci/prompt.md` must be added to `ci/tools.json` too (both engines read it; studio.yml no longer lists them).
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
  out; `POST /__gh/_token?bad=1` expires the token, `POST /__gh/_forkpr` adds a fork's pull_request run; a pretend App
  Store for the gate: `STUDIO_DEV_STORE=1.0.4` starts it released, `POST /__store/_version?v=1.0.4` releases it while the
  page is open, `POST /__store/_down?on=1` breaks the lookup; `STUDIO_DEV_RETIRED=1` seeds a customs film from yesterday).
  The brief at a given store version: `STUDIO_STORE_VERSION=1.0.4 STUDIO_REQ=r-test01-abcd node tools/ci/prompt.mjs`
  (any other word, e.g. `none`, pretends the lookup failed).
