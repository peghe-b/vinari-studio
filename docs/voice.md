# The voice

> Moved out of CLAUDE.md on 2026-10-26 (plan step 2.5: the cloud context slimmed to the rules). Nothing here was
> dropped. Section names in the text (Voice, Style, Motion, Sound, Story moments, The ending, Cloud studio ...) and
> "rule N" point to the other files of docs/ (CLAUDE.md's map says which); the linters named here still enforce them.

## Voice (Gemini, `tools/vo.py`)

- **The quota**: the free AI Studio key gives each model about 10 requests a day; vo.py tries
  gemini-3.8-flash-tts, 3.8-flash-lite-tts, 3.1-flash-tts-preview, 2.5-flash-preview-tts in that order,
  one model per film (never two in one film). It resets at midnight Pacific: 11:00 Tbilisi (12:00 in
  winter). The key is read from env `GEMINI_API_KEY` or `~/.config/vinari/gemini.key`, never printed.
- **One request per film, one continuous take** (`"geminiSplit": "whole"`, the default; spec, beat or env
  `GEMINI_TTS_SPLIT`; since 2026-10-07, the owner on v79: "every 1-2 seconds the voice breaks and a new one
  starts, I understood nothing"): every sentence group, word for word, one after another as ONE paragraph, in one
  request, and that take IS the film's voice, as it came: never cut apart, never re-spaced, never patched with a
  separately voiced line. vo.py only TIMES it (`take_views`): `split_whole` finds the sentences (a small dynamic
  programme on the pauses, the film's own pace from the letters, a preference for long pauses; with too few
  pauses a border may sit where none is), `pause_split` every sentence's `|` chunks (greedy, nearest pause first; a chunk
left far too short for its letters, under max(0.12 s, letters / 2.5x the sentence's pace), bans the pause the border before
it took and the pass runs again, at most three times: demo-lesson-brakes-v96's „ფეხი ხუნდებს | კი არ აწვება, | სითხეს
აწვება." had given the comma's pause to the first border and left the middle chunk 22 ms; vo_whole_check prints the same
before and after); the beats, scenes and
  subtitles follow (a beat starts 0.1 s before its first word, as before). A beat's `hold` is the one silence
  added, at that beat's border inside the take, only where the take pauses there (`HOLD_PAUSE`: at a border placed
  where it runs on, silence would cut a word, so the hold is left out and vo.py says so); `leadIn` and `tail` frame it; **`gap` and `sentenceGap` do not
  touch a whole take** (its own breaths are the pauses); they still space pieces voiced apart: edge-tts, the
  `"sentence"` / `"chunk"` modes (separate generations: the patchwork, only on purpose), a beat with a style of
  its own (a one-sentence piece, cut as before), an old film kept as it was. vo.py's summary line says how many
  Gemini requests the run made.
- **When the borders are not sure** (fewer clear pauses than borders, a border only the letters chose, a sentence
  too fast or slow for its letters, the paces together too far off, `W_CHI`, a second split almost as good) vo.py
  says why and uses its best split anyway: a border a little off moves a subtitle a little, the voice is untouched.
  There is no fallback to one request per sentence any more.
- **What a change costs**: an unchanged film nothing (its take is cached). ANY new or changed line: one request,
  the whole film again (a line voiced alone and spliced in was the patchwork the owner heard). A re-run tries the
  model of the film's own timeline first, so a film voiced on a later model of the chain keeps it (and its cache)
  after the first model gets its quota back. **A film voiced before 2026-10-07** (its take one sentence per line,
  cut and re-spaced, or one request per sentence, `<key>.gemini-cut.wav` pieces included) keeps that audio for free,
  built exactly as then (`legacy_pieces`; every film voiced on this Mac checked byte for byte), until a line changes
  or `VO_RESTYLE=1`; then one request makes it one continuous take. When its old pieces are not all cached (they
  would cost a request), it becomes one continuous take at once, never one request per sentence. Those old takes
  are not kept whole on purpose: a line per sentence under the old note paused 0.8-1.5 s after each sentence
  (measured 2026-10-07 on the cached ones: kept whole, five films ran 0.8-4.6 s longer).
- **Measured offline** (`python3 tools/vo_whole_check.py`, no network: real cached Algieba clips joined into
  whole films, 2026-10-07, seed 7, every film kept as one take): with 0.25-0.7 s between sentences no sentence
  border on the wrong pause in 120 films, sure or not (borders 3 ms median, p95 8 ms); with tight 0.12-0.2 s
  pauses (shorter than the pauses inside sentences) 80 % are not sure and 16 of 120 have a subtitle border more
  than 0.3 s off (up to 1.7 s): that is why the note keeps a breath at a sentence's end. `--takes` times the real
  cached whole takes both ways (the old cut and take_views agree within 5 ms); `--timeline <id>` runs one real film
  through vo.build. `python3 tools/vo_test.py` is the plumbing test (a mock server: one request, voice.wav the take
  sample for sample, subtitles on their words, holds, a run-on take, old films kept, what a change costs).
  Takes that are not the text (a line skipped, read twice, run into the next) are no longer re-voiced: the doubt is
  printed, so listen to the first real continuous takes. No Achernar clip was cached to test the female voice.
- **Out of quota** (every model of the chain): edge-tts reads the whole film (same gender: Giorgi for
  Algieba, Eka for Achernar; `"fallbackVoice"` overrides) with a loud WARNING, on the Mac and in the cloud,
  and vo.py writes `out/ci/voice-quota.json` `{"code":"voice_quota","fallback":"edge","resets":"11:00
  Tbilisi"}` (the cloud turns it into post.json's `"geminiOut"`). A model that is not there (404 NOT_FOUND: a
  preview model retired or renamed, `GeminiMissing`) is skipped as if it were not in the chain: a day with
  [out of quota, 404, out of quota] is still a quota day (no `"why"`, so the site warns). A model that fails
  another way (the key refused: 400/401/403; a 5xx, the network, or an answer cut short or not JSON after every
  retry) is skipped the same way (`GeminiUnavailable`), so a film still comes out; the note then adds `"why":
  "gemini_error"` (so does a chain where no model said it was out of quota) and publish.mjs does NOT set
  `"geminiOut"` (the site does not claim today's quota is gone). An answer with no audio twice for the same text
  (`GeminiNoAudio`) ends the chain at once: every answer costs a request of the free quota, so the other models
  are not asked, edge-tts reads the film (`"why": "gemini_error"`), and `out/ci/voice-noaudio.json` marks the film's
  text for the rest of the job (the cloud's check, then its voice step; 3 hours on the Mac): the next run sends it
  to edge-tts without asking Gemini. A normal film still costs one request. Only Google's status
  and reason are logged, never the error body (it can name the Cloud project). The timeline's `"voice"` is then the
  edge-tts voice and it has no `"model"`; a Gemini film's timeline has `"voice": "gemini:..."` and the
  `"model"`. Every vo.py run first removes an earlier run's note, so the file always speaks for the last
  run. `tools/check.mjs` says the film is read by edge-tts and goes on. Only with `VO_NO_EDGE=1` (the
  cloud's repo variable `STUDIO_NO_EDGE`, off by default) vo.py stops instead: exit 75, a `VOICE_QUOTA:`
  line and the same file without `"fallback"` (only when the quota is all that stopped it, 404s aside; any other
  failure is an ordinary one); check turns it into one line, "VOICE_QUOTA ხმის
  დღევანდელი ლიმიტი ამოიწურა". On the Mac, a film for the house voice is voiced again after the reset.
- Change a `say` only when the words must change: any changed line re-voices the whole film (one request).
  Never re-voice a spec just to check it.
- **The director's note** (`GEMINI_STYLE`, in Georgian: an English note gave "ვინარი" an English stress). Since
  2026-10-07 it is someone telling a friend something in one go, warm, unhurried and clear, the sentences flowing
  into each other with ordinary breaths, never read one by one, no deliberate pause after every sentence (the
  2026-09-25 note asked for one; it is in `GEMINI_STYLES_BEFORE`), never an announcer, a documentary narrator or
  an ad. Since 2026-10-12 (the owner: "the speech must flow and connect, so the meaning reaches the person"; rule 24) the
  same friend EXPLAINS something he knows well, as one connected explanation: each sentence carries on from the last, the
  voice does not drop at a sentence's end as if all were said (only on the last line), the key word of each sentence gets a
  little weight, a question is a real question, a number or a new word a touch slower; the breath between sentences stays
  (the subtitle borders need it), and never a teacher reading a textbook. The 2026-10-07 note is the first of
  `GEMINI_STYLES_BEFORE`. A 60 s take is one request too (`urlopen` waits 180 s). The note is part of every cache key: a film voiced
  under an earlier note (`GEMINI_STYLES_BEFORE`) keeps that take for free until one of its lines changes, then the
  whole film is voiced again with today's note (one request); `VO_RESTYLE=1` does that on purpose. A beat's own
  `"style"` (a joke, the car speaking) is Georgian too: today's note plus one line on what differs, never
  "მთხრობელი" or "დიქტორი". Two such notes have names (`GEMINI_STYLE_PRESETS`, the aura drop, rule 23): `"style":
  "hurt"` on the sad beats before the drop (quieter, slower, hurt; beats with one style are one take of their own, so the
  whole act is ONE extra request, never one per line) and `"style": "drive"` at the top of the spec (the drop and the
  rest with energy: the film's usual one take). A drop film is two requests (`python3 tools/vo_test.py` checks it).
