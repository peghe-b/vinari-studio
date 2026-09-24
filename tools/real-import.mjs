#!/usr/bin/env node
// Real recorded car sounds for Vinari films (the owner, 2026-09-24: "a broken engine knocking at the
// start of the diagnostics video would grab attention; stock free sounds in case we need them").
// Faults for hooks (a rod knock, a squealing belt, a starter that will not catch, squealing brakes)
// and clean everyday car sounds (a healthy start, a door, a seatbelt, a fob, rain on the roof).
// Only licences that allow paid ads without payment or credit: CC0 1.0 or public domain. Nothing
// here needs an account. The raw downloads stay outside the repo; only the chosen, trimmed and
// levelled takes land in public/sfx/real-<name>.wav.
//
//   node tools/real-import.mjs --fetch     check every source's licence on its own page (the page must
//                                          show CC0 1.0 or public domain, nothing else), then download it
//                                          into ../_research_scratch/real-sfx/ (gitignored), with a .json
//                                          receipt per file (page, url, bytes, date, what the page said)
//   node tools/real-import.mjs --list      every downloaded source: length, format, level every 0.5 s
//   node tools/real-import.mjs --sheet [key ...]   out/real-audition.sources.png: the sources as
//                                          spectrograms with a time ruler (to choose the windows)
//   node tools/real-import.mjs             cut, clean and level every PICK → public/sfx/real-<name>.wav,
//                                          public/sfx/real.json, public/sfx/REAL-LICENSES.md,
//                                          out/real-audition.wav (+ .txt order, + .png spectrograms)
//
// SOURCES. Freesound (freesound.org) holds most of the real car recordings under CC0. Its original
// files need a login; its HQ previews (Ogg Vorbis about 190 kbit/s, 44.1 kHz) do not, and CC0 covers
// the recording whatever copy of it is used. So the Freesound takes here are lossy previews: good
// enough for a phone speaker, not a mastering source. Wikimedia Commons files are the uploaded
// originals. Pixabay was not usable (its pages sit behind a bot check, 2026-09-24); OpenGameArt had
// only game-style car sounds (looneybits' CC0 door and blinker were compared and not kept). Do not add
// Freesound user craigsmith: his CC0 uploads are digitised old studio libraries (ownership unclear).
//
// LEVEL, like tools/sfx-import.mjs: a file's loudest 100 ms at suggestedVolume sits `rel` LU under the
// voice (tools/asmr.mjs VOICE_LUFS), and the file carries the film's +3 dB (ASMR_TRIM is given to asmr-
// cues only; do NOT add real- to ASMR_TRIM). real.json's loudnessVsVoiceLU is the same measure as
// asmr.json's, so common.tsx's ceiling can read it (today KIT_LEVEL reads asmr.json only: until it also
// reads real.json, a real- cue in a voiced film gets the 7.5 dB lift with no ceiling).
//   hooks -12 (the kit's loudest, asmr-land), a door or a start -12..-13, a pass-by -14,
//   small one-shots -16..-18, beds under the voice -22.
//
// LISTENING. The tool cannot listen. Every take was chosen from its author's description, the
// spectrogram (--sheet) and the level curve (--list); the audition reel is for a human ear.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {SR, VOICE_LUFS, readWav, writeWav, analyse, loudness, truePeak, filt, phoneLoss} from './asmr.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SFX = path.join(ROOT, 'public', 'sfx');
const OUT = path.join(ROOT, 'out');
const RAW = process.env.REAL_SFX_DIR ? path.resolve(process.env.REAL_SFX_DIR) : path.resolve(ROOT, '..', '_research_scratch', 'real-sfx');
const MANIFEST = path.join(SFX, 'real.json');
const LICENSES = path.join(SFX, 'REAL-LICENSES.md');
const AUDITION = path.join(OUT, 'real-audition.wav');
const FILM_TRIM = 1.41; // = common.tsx ASMR_TRIM
const MIX_VOICED = {lift: 7.5, ceil: 8}; // = tokens.ts MIX_VOICED (the audition plays the voiced film's balance)
const MAX_BYTES = 150e6; // the owner's cap for this whole library
const UA = 'VinariVideoStudio/1.0 (info@vinari.ge; licence check before download)';
const CC0 = {name: 'CC0 1.0 Universal (public domain dedication)', short: 'CC0 1.0', url: 'https://creativecommons.org/publicdomain/zero/1.0/'};
const PD = {name: 'Public domain (released by the author, as stated on the file page)', short: 'Public domain', url: 'https://commons.wikimedia.org/wiki/Commons:Licensing#Public_domain'};

const n = (s) => Math.max(0, Math.round(s * SR));
const db = (x) => 20 * Math.log10(Math.max(1e-12, x));
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const rel = (p) => path.relative(ROOT, p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── sources ─────────────────────────────────────────────────────────────────────────────────
// fsd(id, user id, user, original title, what the author wrote): a Freesound CC0 sound, fetched as its
// HQ Ogg preview. wc(file name, author, what): a Wikimedia Commons file (its licence read from the API).
const fsd = (id, uid, user, title, what) => ({
  key: `fs${id}`, site: 'Freesound', id, author: user, title, what, ext: 'ogg', licence: CC0, preview: true,
  page: `https://freesound.org/people/${encodeURIComponent(user)}/sounds/${id}/`,
  url: `https://cdn.freesound.org/previews/${Math.floor(id / 1000)}/${id}_${uid}-hq.ogg`,
});
const wc = (file, author, what) => ({
  key: `wc-${file.replace(/\.[a-z0-9]+$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`, site: 'Wikimedia Commons', author, title: file, what,
  ext: file.split('.').pop().toLowerCase(), page: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replaceAll(' ', '_'))}`, url: null, licence: null,
});
const oga = (slug, file, author, what) => ({
  key: `oga-${slug}-${file.replace(/\.[a-z0-9]+$/i, '')}`, site: 'OpenGameArt', author, title: file, what, ext: file.split('.').pop().toLowerCase(),
  page: `https://opengameart.org/content/${slug}`, url: `https://opengameart.org/sites/default/files/${file}`, licence: CC0,
});

// Every candidate that was downloaded and compared (2026-09-24). The ones a PICK uses are marked there.
const SOURCES = [
  // faults
  fsd(535073, 219873, 'jlstaples', 'engine-knock.aif', 'Sound of a bad engine with a rod knock. Engine revs and knocks.'),
  fsd(36837, 347035, 'csproductions', 'carstart2.wav', 'A car engine starts with belt squeal'),
  fsd(36836, 347035, 'csproductions', 'carstart.wav', 'A car engine starts with belt squeal'),
  fsd(180031, 1038806, 'unfa', 'Old Car Starting in Winter', 'A Fiat 126p starting on a cold winter day; the fan belt squeals loudly. Zoom H2.'),
  fsd(622829, 6394480, 'Mullumbimby', 'Cold start of old diesel car', 'Cold start of an old Ford Transit diesel van; turns over reluctantly, belt screech after start.'),
  fsd(456764, 9514571, 'WavJunction.com', 'Car Brakes sqeak screech squeal stop.wav', 'Car hitting the brakes with no engine sound, just high pitched squeaking brakes, 2 variations.'),
  fsd(513360, 8644110, 'shelbyshark', 'Brakes Squeak in Rain.wav', 'Brakes squeaking when a vehicle comes to a stop in the rain.'),
  fsd(839068, 18267781, 'Jupo_22', 'slow_moving_car_wintertyres_braking', 'A car with studded tyres at idle speed on a paved parking lot, slowing down at a crossing with its brakes squealing.'),
  fsd(770642, 11465444, 'ronikn', 'car_6', 'A car with loud engine noise coming to a stop, brakes screeching. Tampere, iPhone 13 mini.'),
  fsd(364896, 179538, 'RutgerMuller', 'Japan_Tokyo_Shinjuku_Walking_Screeching_Brake_City.wav', 'Field recording in Shinjuku, Tokyo: a screeching brake in the city.'),
  fsd(95006,367313, 'j1987', 'parkingbrake.mp3', 'Parking brake of a Volvo 740 being released and pulled.'),
  fsd(32416, 276701, 'KRAFTWERK2K1', "car_engine_won't start.wav", "A car engine that won't start. Recorded December 2006."),
  fsd(478593, 2247456, 'Kinoton', 'Car Engine, False Start 4x', 'Opel Astra 1.6, exterior, false start, engine failure, engine perspective, 4x. MixPre-6, ME66.'),
  fsd(520773, 2313592, 'Ika.Komura', 'Car not starting.wav', 'Car ignition on a late 90s BMW failing to get the motor to start.'),
  fsd(216531, 4042640, 'Moondogg', 'Car Not Starting', 'My 2000 Honda Accord in the garage not starting.'),
  fsd(819556, 71257, 'qubodup', 'Ignition Failure and Cricket Noise', 'A car failing to start twice, at night, in the street, from a window. Zoom H2n MS.'),
  fsd(687447, 14981647, 'drdeath666', 'cranks-but-not-start.mp3', 'A good starter motor, but the engine will not start.'),
  fsd(679204, 14804462, 'shdwtek', '12 Volt Solenoid Clicks', '12 volt solenoid cycling three times, opening and closing click noises.'),
  fsd(496171, 1784475, 'editboy23', 'Import car revs on Chassis Dyno with Turbo.wav', 'A Toyota Supra on a chassis dyno revved to the max; its turbo whines.'),
  fsd(659544, 13241413, 'EwanPenman11', 'Turbo Spooling and Blow Off.WAV', 'A car drives past; the turbo blow-off can be heard.'),
  fsd(273334, 4168822, 'ulose2piranha', 'WRX - Exhaust sounds', '2003 Subaru Impreza WRX with a 3 inch turbo-back exhaust.'),
  fsd(390744, 3472961, 'mcweigert', 'Audi A4 1998 broken exhaust - start and drive off.MP3', 'An Audi A4 (1998) with a hole in the front of the exhaust starts and drives off.'),
  fsd(327718, 5596057, 'buddhafish', 'Interior Prius driving rough road w rattles.wav', 'Toyota Prius C (2015) on rough, pothole-filled pavement; suspension clunks and rattles.'),
  fsd(591079, 6411813, 'orlandorizo', 'Car rolling on asphalt .wav', 'A small car rolling on asphalt; bumps and manhole covers.'),
  fsd(508170, 9159316, 'Breviceps', 'Passing car + road bump', 'A car passes and drives over a speed bump.'),
  fsd(410235, 5882206, 'watercool', 'As.m4a', 'Driving along in a car, loud whirring noise (tagged bearing, problem).'),
  fsd(579211, 485650, 'bowlingballout', '1970 VW Bug Engine Starting Sputtering.wav', 'A 1970 VW Beetle starting and sputtering. Zoom H2n.'),
  fsd(505820, 4024739, 'jedg', 'Car sputter and car start vintage MG convertable.wav', 'Vintage 1970s MG convertible sputters and starts.'),
  fsd(579213, 485650, 'bowlingballout', '1970 VW Bug Engine Cranking 2.wav', 'A 1970 VW Beetle cranking after months standing. Zoom H2n.'),
  // healthy and everyday
  fsd(50898, 179538, 'RutgerMuller', 'Car Ignition Key - Engine Starting Running Idle 2.wav', 'I turn my car key, the engine starts, then idles. Edirol R-1, Sennheiser ME66.'),
  fsd(458461, 63692, 'prometheus888', 'CarEngine.wav', 'Car engine starting.'),
  fsd(425158, 4370343, 'sound_catcher99', 'Car engine start up running and turning off.wav', 'Fiat Punto Grande petrol engine: start, a few seconds running, off.'),
  fsd(269771, 3366749, 'seth-m', 'car idle', '2002 Mini Cooper 1.6 L inline-4 at warm idle. Loops seamlessly. Edirol R-09HR.'),
  fsd(772236, 16645026, 'chiliwau', 'Old big Toyota car idle', 'An old, large Toyota idling in a parking place.'),
  fsd(208695, 1756543, 'monotraum', 'car door close.wav', 'Car door closing (Audi).'),
  fsd(9876, 21830, 'Heigh-hoo', 'car_door_closed.aif', 'A car door closed, low frequencies.'),
  fsd(173009, 773642, 'ninebilly', 'car door close.wav', 'Car door closing, exterior.'),
  fsd(778421, 8927049, 'BlondPanda', 'Car_Door_Closing_Dull_04', 'The dull sound of a car door being shut forcefully.'),
  fsd(396448, 123355, 'hz37', 'Car Lock', 'Field recording of a car lock beep.'),
  fsd(433590, 5618682, 'jackthemurray', 'Car locking', 'Locking a car remotely.'),
  fsd(91358, 742435, 'hawabaz', 'car lock.mp3', 'Car central locking tweet when the key button is pressed.'),
  fsd(446322, 4986614, 'MPierluissi', 'VEHCar_NISSAN SENTRA-TURNING SIGNAL_MP.wav', 'Turn signal of a 2004 Nissan Sentra, background noise removed.'),
  fsd(574249, 12956274, 'MWsfx', 'Car - Turn Signal.wav', 'Turn signal, Zoom H4N Pro internal stereo mics.'),
  fsd(431816, 5340249, 'Audy_Leonard', 'Car blinker', 'Blinker of an Audi A2, Zoom H4n.'),
  fsd(200976, 3430035, 'NHumphrey', "Vehicle's Turning Signal - On.wav", 'A car turn signal from the interior, Zoom H4n.'),
  fsd(50900, 179538, 'RutgerMuller', 'car seatbelt clicking.wav', 'A seatbelt clicking into its slot. Edirol R-1, Sennheiser ME66.'),
  fsd(345064, 1256155, 'metrostock99', '2 SEAT BELT CLICKS.wav', 'Two separate clicks of a modern seatbelt.'),
  fsd(429948, 8689166, 'jonnythedonkey', 'Seat belt click in', 'Seat belt clicking in.'),
  fsd(535870, 9250976, 'Nox_Sound', 'Ambiance_Rain_Inside_Car_Close_Roof_Loop_Stereo.wav', 'Rain inside a car, close to the roof; loop.'),
  fsd(448125, 2573247, 'derjuli', 'Inside a car in the rain', 'Inside a standing car in the rain.'),
  fsd(143120, 707115, 'Framefive', 'Rain_inside_of_a_Car.wav', 'Raindrops on the ceiling of a car, from inside.'),
  fsd(171447, 3191786, 'hinzebeat', 'Car passing by.wav', 'A car passing by from left to right.'),
  fsd(462862, 9159316, 'Breviceps', 'Passing Car (Wet road)', 'A car passing at about 100 km/h on a wet road.'),
  fsd(3179, 2211, 'Pingel', 'PassingCar01.wav', 'A passing car. Behringer ECM8000 omni.'),
  fsd(476836, 1481531, 'richwise', 'phone short buzz', 'A short mobile phone vibration. Olympus LS-5, no filtering.'),
  fsd(515295, 9159316, 'Breviceps', 'Phone vibration', 'Smartphone vibration (incoming message).'),
  fsd(77392, 325383, 'Splash.Yang', 'mobile phone vibration.aif', 'iPhone 3G vibrating on a wooden desk.'),
  fsd(425160, 4370343, 'sound_catcher99', 'Car key inserted into ignition', 'Car keys inserted into the ignition. Noise removed.'),
  fsd(405416, 2402876, 'Mrthenoronha', 'Pulling Hand Brake Single.wav', 'Pulling the hand brake of a car.'),
  fsd(439247, 6072659, 'devy32', 'Car electric window.wav', 'An electric car window opening and closing.'),
  fsd(495795, 8972317, 'priesjensen', 'Car driving ambience', 'Inside a car driving on Danish roads. Zoom H6, M/S mic.'),
  fsd(529222, 1138214, 'UnplugTheFridge', 'Gear Shift - Park Reverse Drive - Interior Honda.wav', 'Gear shifter moved from Park to Reverse to Drive, interior of a Honda.'),
  // Wikimedia Commons (originals)
  wc('1997AccordSE enginestart.ogg', 'X5DragonFire', '1997 Honda Accord SE engine starting, recorded from the engine bay.'),
  wc('Open Corsa E model 2014 engine startup sound.ogg', 'MKFI', 'Opel Corsa E (2014) engine start-up.'),
  wc('Open Corsa E model 2014 parking sensor sound.oga', 'MKFI', 'Opel Corsa E (2014) parking sensor beeps.'),
  wc('HR12DE-March-K13.oga', 'Oq10pass', 'Nissan March HR12DE engine; tuned by the uploader to enhance the sound.'),
  // OpenGameArt
  oga('cardoorsfx', 'door_closing.wav', 'looneybits', 'Car door closing, made for a parking game.'),
  oga('car-blinker-sfx', 'blinker01.wav', 'looneybits', 'Car blinker, made for a parking game.'),
];

// Why a compared source was not kept (REAL-LICENSES.md prints it)
const WHY = {
  fs36837: 'the source clips (36 runs near 0 dBFS)', fs36836: 'the source is saturated from start to end',
  fs622829: '', fs456764: '',
  fs513360: 'the squeaks are faint under loud rain; fs456764 is cleaner',
  fs839068: 'one thin squeal line under tyre crunch', fs770642: 'the squeal is faint, at the very end', fs364896: 'the squeal lasts 0.5 s and is cut by the file end',
  fs95006: 'a parking-brake ratchet, repeated; fs405416 is the cleaner single pull',
  fs32416: 'cranking only, like no-start but noisier', fs520773: 'long even cranking; the Kinoton takes are cleaner',
  fs216531: 'long takes with a noisy garage', fs819556: 'crickets and street noise over it', fs687447: 'three short cranks, low quality mp3 source',
  fs659544: 'quiet and windy: no clear blow-off', fs273334: 'healthy revs, not a fault', fs327718: 'road noise with no single clear clunk', fs508170: 'the bump is small under the pass-by',
  fs505820: 'a long, noisy start', fs579213: 'cranking again (no-start covers it)',
  fs458461: 'a start with revs; real-start is cleaner', fs425158: 'a third healthy start, not needed', fs269771: 'the source clips at 0.79 s and 1.06 s',
  fs173009: 'the source clips (13 runs)', fs778421: 'a thin, dull door', fs433590: 'one beep over a noisy street', fs91358: 'a good alternative chirp, not needed',
  fs574249: 'noisy interior', fs431816: 'a good alternative (Audi A2, tick and tock differ), not needed', fs200976: 'noisy interior',
  fs345064: 'handling noise around the clicks', fs429948: 'room noise around the click', fs448125: 'less detail than Nox_Sound', fs143120: 'a good alternative, not needed',
  fs171447: 'a dry pass-by; the wet one reads better as a whoosh', fs3179: 'slow and long', fs515295: 'noisy', fs439247: 'not needed', fs529222: 'not needed',
  'wc-open-corsa-e-model-2014-engine-startup-sound': 'a short start with a gap before it; the Accord is clearer', 'wc-hr12de-march-k13': 'clips hard (582 runs; the uploader "tuned" it)',
  'oga-cardoorsfx-door_closing': 'a game-style door, thinner than the recorded Audi', 'oga-car-blinker-sfx-blinker01': 'a single game-style blink',
};

// ── picks ───────────────────────────────────────────────────────────────────────────────────
// name     public/sfx/real-<name>.wav
// src      a SOURCES key; win [start, end] seconds of the source
// mode     hit  = a one-shot: its onset moved 3 ms in (like the kit), so at = the frame of the event
//          take = the window as it is (a short scene: a start, a pass-by, a squeal), soft fades
//          loop = the window crossfaded into itself (equal power), so <Audio loop> repeats it without
//                 a seam; no fades at the ends
// hp, lp   high-/low-pass Hz (4th order; hp default 30: DC and rumble out); eq [type, Hz, q, dB]
// rel      LU under the voice at suggestedVolume (see LEVEL)
// role     hook (a fault that opens a film), contrast (the healthy twin), event, bed
const PICKS = [
  // hooks: a car that is not well. Each opens a film on its own, before the voice (leadIn 0.6..1.0 s)
  {name: 'knock', src: 'fs535073', win: [5.9, 8.5], mode: 'take', hp: 60, rel: -12, role: 'hook',
    use: 'a real rod knock at idle: a fast metallic knock on every turn of the crank (12.5 a second)',
    event: 'the first frame of the engine-sound film (v5 "ეს ხმა რა არის?"): plays alone through leadIn, the voice lands on it'},
  {name: 'knock-long', src: 'fs535073', win: [4.0, 10.0], mode: 'take', hp: 60, rel: -14, role: 'hook',
    use: 'the same knocking engine for 6 s: runs on under the first line',
    event: 'a hook that keeps knocking under the question (the voice dip steps it back under the words)'},
  {name: 'knock-rev', src: 'fs535073', win: [16.5, 22.0], mode: 'take', hp: 60, rel: -12, role: 'hook',
    use: 'the knocking engine revved: the knock speeds up with the revs',
    event: 'a second beat of the fault ("listen when it revs"), or a hook with more motion'},
  {name: 'belt-squeal', src: 'fs180031', win: [0.3, 5.0], mode: 'take', hp: 40, rel: -12, role: 'hook',
    use: 'an old petrol car (Fiat 126p) starting on a cold morning, its fan belt squealing',
    event: 'a squeal hook: the chirp of a slipping belt on a cold start'},
  {name: 'belt-screech', src: 'fs622829', win: [4.3, 9.0], mode: 'take', hp: 40, rel: -12, role: 'hook',
    use: 'an old diesel van catching and idling, a belt screeching over it (from 2.2 s)',
    event: 'a squeal hook with an engine under it'},
  {name: 'diesel-crank', src: 'fs622829', win: [0.0, 4.9], mode: 'take', hp: 40, rel: -12, role: 'hook',
    use: 'an old diesel turning over reluctantly on a cold morning, then catching at 4.4 s',
    event: 'a slow, worrying crank: "will it start?"'},
  {name: 'false-start', src: 'fs478593', win: [0.3, 5.3], mode: 'take', hp: 40, rel: -12, role: 'hook',
    use: 'a starter cranks, the engine catches for a second and dies (Opel Astra 1.6, exterior)',
    event: 'a hook of a car that almost starts'},
  {name: 'no-start', src: 'fs478593', win: [14.85, 17.9], mode: 'take', hp: 40, rel: -12, role: 'hook',
    use: 'a starter cranking, the engine never catching (the same Astra)',
    event: 'a hook of a car that will not start'},
  {name: 'starter-click', src: 'fs679204', win: [0.0, 2.6], mode: 'hit', max: 2.6, hp: 150, rel: -14, role: 'hook',
    use: 'a 12 V solenoid clicking three times, 1 s apart: the click of a starter on a flat battery (recorded on its own, not in a car)',
    event: 'turning the key, nothing but a click: a silent, tense hook'},
  {name: 'broken-exhaust', src: 'fs390744', win: [9.4, 15.0], mode: 'take', hp: 40, rel: -12, role: 'hook',
    use: 'an Audi A4 (1998) with a hole in the front of its exhaust: starts, then a loud raspy idle',
    event: 'a loud, rough hook (a hole in the exhaust)'},
  {name: 'turbo-whine', src: 'fs496171', win: [19.8, 25.8], mode: 'take', hp: 40, rel: -12, role: 'hook',
    use: 'a Toyota Supra revved on a dyno, its turbo whining higher and higher, then let off',
    event: 'a whistle that rises: tension before a reveal (a healthy car, loud)'},
  {name: 'sputter', src: 'fs579211', win: [18.2, 22.4], mode: 'take', hp: 40, rel: -12, role: 'hook',
    use: 'an old VW Beetle engine sputtering and missing as it starts',
    event: 'a sick engine that misfires'},
  {name: 'whine', src: 'fs410235', win: [2.0, 6.0], mode: 'take', hp: 60, rel: -14, role: 'hook',
    use: 'inside a car driving with a loud whirring whine (its author tags it bearing / problem; what fails is not known)',
    event: 'a steady worrying whine while driving'},
  {name: 'brake-squeak', src: 'fs456764', win: [0.3, 3.4], mode: 'take', hp: 300, lp: 15000, rel: -14, role: 'hook',
    use: 'brakes squeaking as a car stops, no engine: a high squeal (12-14 kHz) and short squeaks (2-6 kHz)',
    event: 'a thin, piercing squeak; not a big screech (the best CC0 take found, check it by ear)'},
  {name: 'clunk', src: 'fs591079', win: [31.9, 33.9], mode: 'take', hp: 40, rel: -12, role: 'hook', sync: 'the clunk lands about 0.53 s in',
    use: 'a small car rolling on asphalt hits a bump: one hollow suspension clunk',
    event: 'a knock from below: the suspension over a bump'},
  // the healthy twin
  {name: 'start', src: 'fs50898', win: [0.0, 4.78], mode: 'take', hp: 40, rel: -12, role: 'contrast',
    use: 'a key turned, a healthy engine starts at once and idles smoothly',
    event: 'the good ending after a fault hook, or a car that is fine'},
  {name: 'start-b', src: 'wc-1997accordse-enginestart', win: [0.0, 6.0], mode: 'take', hp: 40, rel: -12, role: 'contrast',
    use: 'a 1997 Honda Accord starting, recorded in the engine bay: a quick crank and a steady idle',
    event: 'a second healthy start, close and mechanical'},
  {name: 'idle', src: 'fs772236', win: [1.2, 4.9], mode: 'loop', xfade: 0.4, hp: 40, rel: -20, role: 'contrast',
    use: 'an old, large Toyota idling evenly in a car park, a seamless 3.7 s loop',
    event: 'a healthy engine under a scene (<Audio loop>, volume 0.3..0.5)'},
  // everyday car events
  {name: 'door', src: 'fs208695', mode: 'hit', hp: 40, rel: -12, role: 'event',
    use: 'a car door closing (an Audi): a solid, premium thunk',
    event: 'getting in: the film begins inside the car; or a firm full stop'},
  {name: 'door-b', src: 'fs9876', mode: 'hit', hp: 40, rel: -12, role: 'event',
    use: 'a second car door closed, lower and rounder',
    event: 'as door (alternate on repeats)'},
  {name: 'fob-lock', src: 'fs396448', mode: 'hit', hp: 150, rel: -16, role: 'event',
    use: 'a key fob locks the car: two short chirps with the lock clunk',
    event: 'something is safe or done (the QR card is set, the car is parked)'},
  {name: 'indicator', src: 'fs446322', win: [0.0, 3.26], mode: 'take', fadeOut: 0.05, hp: 200, rel: -18, role: 'event',
    use: 'a turn signal: the stalk clicks on, seven ticks (0.35 s apart), the stalk clicks off (Nissan Sentra)',
    event: 'a turn, a choice, a countdown feel'},
  {name: 'indicator-loop', src: 'fs446322', win: [0.4, 1.7948], mode: 'loop', xfade: 0.03, hp: 200, rel: -18, role: 'event',
    use: 'the turn signal ticking, a seamless loop of four ticks (1.39 s)',
    event: 'ticking under a scene as long as it needs (<Audio loop>)'},
  {name: 'seatbelt', src: 'fs50900', win: [0.17, 0.47], mode: 'hit', hp: 150, rel: -16, role: 'event',
    use: 'a seatbelt clicking into its buckle',
    event: 'ready, set: the start of a trip, a reminder armed'},
  {name: 'key-in', src: 'fs425160', win: [0.3, 1.4], mode: 'hit', hp: 150, rel: -18, role: 'event',
    use: 'a car key slid into the ignition',
    event: 'the moment before a start'},
  {name: 'handbrake', src: 'fs405416', win: [0.0, 1.0], mode: 'hit', hp: 100, rel: -16, role: 'event',
    use: 'a hand brake pulled up: a short ratchet',
    event: 'parked (the MapPin lands, the car stops)'},
  {name: 'parking-sensor', src: 'wc-open-corsa-e-model-2014-parking-sensor-sound', win: [0.6, 4.95], mode: 'take', hp: 200, rel: -16, role: 'event',
    use: 'parking-sensor beeps speeding up as the car closes in (Opel Corsa E, 2014)',
    event: 'getting closer: a deadline nearing, a spot almost reached'},
  {name: 'pass-by', src: 'fs462862', win: [0.1, 5.6], mode: 'take', hp: 40, rel: -14, role: 'event', sync: 'the car is closest at about 2.4 s',
    use: 'a car passing at about 100 km/h on a wet road: a long whoosh',
    event: 'a transition with the street in it'},
  {name: 'phone-buzz', src: 'fs476836', mode: 'hit', hp: 60, rel: -16, role: 'event',
    use: 'a phone vibrating once, short and clean (0.6 s)',
    event: 'a notification arriving (with or instead of the Notification buzz)'},
  {name: 'phone-buzz-desk', src: 'fs77392', win: [0.25, 3.55], mode: 'hit', max: 3.3, hp: 60, rel: -15, role: 'event',
    use: 'an iPhone vibrating twice on a wooden desk: two 1 s buzzes with the desk rattling',
    event: 'a call or a reminder you cannot miss'},
  // beds
  {name: 'rain-roof', src: 'fs535870', win: [10.0, 16.0], mode: 'loop', xfade: 0.5, hp: 80, rel: -22, role: 'bed',
    use: 'rain on a car roof heard from inside, a seamless 6 s loop',
    event: 'a quiet, cosy bed under a scene (<Audio loop>, fade the cue in and out)'},
  {name: 'interior-drive', src: 'fs495795', win: [2.0, 8.0], mode: 'loop', xfade: 0.5, hp: 40, rel: -22, role: 'bed',
    use: 'inside a car driving on an open road, a seamless 6 s loop',
    event: 'the road under a scene about a trip'},
];

// ── fetch ───────────────────────────────────────────────────────────────────────────────────
const get = async (url, as = 'text') => {
  for (let tries = 0; ; tries++) {
    const r = await fetch(url, {headers: {'User-Agent': UA}});
    if (r.ok) return as === 'text' ? r.text() : as === 'json' ? r.json() : Buffer.from(await r.arrayBuffer());
    if (tries >= 2 || r.status < 500) throw new Error(`${url}: HTTP ${r.status}`);
    await sleep(1500);
  }
};
// The licence is read from the source's own page at fetch time, and the file is only saved when the
// page shows CC0 1.0 or public domain and nothing else.
const checkLicence = async (s) => {
  if (s.site === 'Freesound') {
    const html = await get(s.page);
    const links = [...new Set([...html.matchAll(/creativecommons\.org\/(licenses|publicdomain)\/[a-z0-9./-]+/gi)].map((m) => m[0].replace(/\/$/, '')))];
    const artist = (html.match(/og:audio:artist" content="([^"]+)"/) || [])[1];
    const dur = (html.match(/>Duration<\/dt>\s*<dd[^>]*>([^<]+)</) || html.match(/Duration[\s\S]{0,120}?(\d+:\d+\.\d+)/) || [])[1];
    const ok = links.length === 1 && /publicdomain\/zero\/1\.0/.test(links[0]) && artist === s.author;
    return {ok, seen: `page links ${links.join(', ') || 'no licence'}; author ${artist}`, extra: {originalDuration: dur?.trim() ?? null}};
  }
  if (s.site === 'Wikimedia Commons') {
    const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=${encodeURIComponent(`File:${s.title}`)}&prop=imageinfo&iiprop=url|size|extmetadata&iiextmetadatafilter=LicenseShortName|LicenseUrl|Artist|UsageTerms`;
    const j = await get(api, 'json');
    const ii = Object.values(j.query?.pages ?? {})[0]?.imageinfo?.[0];
    const m = ii?.extmetadata ?? {};
    const lic = m.LicenseShortName?.value ?? '';
    const artist = (m.Artist?.value ?? '').replace(/<[^>]+>/g, '').trim();
    // the page's own wikitext: the author's own work ({{own}}) under {{PD-self}} or {{self|cc-zero}}
    const wt = await get(`https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=${encodeURIComponent(`File:${s.title}`)}&prop=revisions&rvprop=content&rvslots=main`, 'json');
    const text = Object.values(wt.query?.pages ?? {})[0]?.revisions?.[0]?.slots?.main?.['*'] ?? '';
    const own = /\{\{\s*own\s*\}\}/i.test(text), tpl = (text.match(/\{\{\s*(PD-self|self\s*\|\s*cc-zero|cc-zero)\s*\}\}/i) || [])[1] ?? null;
    const ok = !!ii && /^(CC0|Public domain)$/i.test(lic) && own && !!tpl;
    s.url = ii?.url?.split('?')[0] ?? null;
    s.licence = /^CC0$/i.test(lic) ? CC0 : PD;
    return {ok, seen: `API LicenseShortName "${lic}"; wikitext {{${tpl ?? 'no PD/CC0 template'}}}${own ? ', {{own}} work' : ', not marked own work'}; artist "${artist}"`, extra: {bytes: ii?.size}};
  }
  if (s.site === 'OpenGameArt') {
    const html = await get(s.page);
    const i = html.indexOf('field-name-field-art-licenses');
    const block = i < 0 ? '' : html.slice(i, html.indexOf('Collections', i) > 0 ? html.indexOf('Collections', i) : i + 1500).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const names = [...block.matchAll(/\b(CC0|CC-BY(?:-SA)?\s*[0-9.]*|OGA-BY\s*[0-9.]*|GPL\s*[0-9.]*|LGPL\s*[0-9.]*)\b/g)].map((m) => m[1]);
    const author = (html.slice(html.indexOf('field-name-author-submitter')).match(/href="\/users\/([^"]+)"/) || [])[1];
    return {ok: names.length > 0 && names.every((x) => x === 'CC0') && author === s.author, seen: `licence field "${block.replace(/^.*License\(s\):\s*/, '').slice(0, 40).trim()}"; author ${author}`, extra: {}};
  }
  return {ok: false, seen: 'unknown site', extra: {}};
};
const rawFile = (s) => path.join(RAW, `${s.key}.${s.ext}`);
const receipt = (s) => path.join(RAW, `${s.key}.json`);
const readReceipt = (s) => { try { return JSON.parse(fs.readFileSync(receipt(s), 'utf8')); } catch { return null; } };
// a Commons file's url and licence come from the API at fetch time; later runs read them from the receipt
for (const s of SOURCES) {
  const rc = readReceipt(s);
  if (rc && !s.url) s.url = rc.url.split('?')[0];
  if (rc && !s.licence) s.licence = rc.licence === CC0.short ? CC0 : PD;
}
const fetchAll = async (only) => {
  fs.mkdirSync(RAW, {recursive: true});
  let total = 0;
  for (const f of fs.readdirSync(RAW)) if (!f.endsWith('.json') && fs.statSync(path.join(RAW, f)).isFile()) total += fs.statSync(path.join(RAW, f)).size;
  for (const s of SOURCES) {
    if (only.length && !only.includes(s.key)) continue;
    const rc = readReceipt(s);
    if (rc && fs.existsSync(rawFile(s)) && fs.statSync(rawFile(s)).size === rc.bytes) { console.log(`have  ${s.key}`); continue; }
    const lic = await checkLicence(s);
    if (!lic.ok) { console.log(`SKIP  ${s.key}: licence not confirmed (${lic.seen})`); continue; }
    if (!s.url) { console.log(`SKIP  ${s.key}: no file url`); continue; }
    if (lic.extra.bytes && total + lic.extra.bytes > MAX_BYTES) { console.log(`SKIP  ${s.key}: would pass the ${MAX_BYTES / 1e6} MB cap`); continue; }
    const buf = await get(s.url, 'buffer');
    if (total + buf.length > MAX_BYTES) { console.log(`STOP  ${s.key}: the ${MAX_BYTES / 1e6} MB cap`); break; }
    fs.writeFileSync(rawFile(s), buf);
    total += buf.length;
    fs.writeFileSync(receipt(s), JSON.stringify({key: s.key, site: s.site, page: s.page, url: s.url, bytes: buf.length, fetched: new Date().toISOString().slice(0, 10), licence: s.licence.short, licenceSeen: lic.seen, ...lic.extra}, null, 1) + '\n');
    console.log(`got   ${s.key.padEnd(44)} ${(buf.length / 1e6).toFixed(2).padStart(6)} MB  ${lic.seen}`);
    await sleep(400);
  }
  console.log(`\n${(total / 1e6).toFixed(1)} MB in ${rel(RAW)} (cap ${MAX_BYTES / 1e6} MB)`);
};

// ── decode ──────────────────────────────────────────────────────────────────────────────────
// Remotion's own ffmpeg, called directly (npx remotion ffmpeg when it is not where it is expected)
const COMPOSITOR = path.join(ROOT, 'node_modules', '@remotion', `compositor-${process.platform}-${process.arch}`);
const FFMPEG = fs.existsSync(path.join(COMPOSITOR, 'ffmpeg')) ? path.join(COMPOSITOR, 'ffmpeg') : null;
const ffmpeg = (args, capture = false) => {
  const stdio = ['ignore', capture ? 'pipe' : 'ignore', capture ? 'pipe' : 'inherit'];
  return FFMPEG
    ? execFileSync(FFMPEG, args, {cwd: COMPOSITOR, env: {...process.env, DYLD_LIBRARY_PATH: COMPOSITOR, LD_LIBRARY_PATH: COMPOSITOR}, stdio, maxBuffer: 256e6})
    : execFileSync('npx', ['remotion', 'ffmpeg', ...args], {cwd: ROOT, stdio, maxBuffer: 256e6});
};
const DECODED = path.join(RAW, '_decoded');
const decodeFile = (src, tag) => {
  const out = path.join(DECODED, `${tag}.wav`);
  if (!fs.existsSync(out) || fs.statSync(out).mtimeMs < fs.statSync(src).mtimeMs) {
    fs.mkdirSync(DECODED, {recursive: true});
    ffmpeg(['-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-ar', String(SR), '-ac', '2', '-c:a', 'pcm_s16le', out]);
  }
  return readWav(out).chs;
};
const decode = (s) => decodeFile(rawFile(s), s.key);
// the source's own format, as ffmpeg reports it
const probe = (file) => {
  try { ffmpeg(['-hide_banner', '-i', file], true); } catch (e) { return String(e.stderr ?? '').split('\n').find((l) => /Audio:/.test(l))?.replace(/.*Audio:\s*/, '').trim() ?? '?'; }
  return '?';
};
// "It plays": ffmpeg (not readWav) decodes the written file to its last frame without an error
const plays = (file) => {
  try {
    const b = ffmpeg(['-hide_banner', '-v', 'error', '-i', file, '-map_metadata', '-1', '-c:a', 'pcm_s16le', '-ac', '2', '-ar', String(SR), '-f', 'wav', '-'], true);
    const at = b.indexOf('data', 12, 'ascii');
    return at < 0 ? -1 : (b.length - at - 8) / 4;
  } catch { return -1; }
};

// ── measures ────────────────────────────────────────────────────────────────────────────────
const mid = ([L, R]) => Float64Array.from(L, (v, i) => 0.5 * (v + R[i]));
const winRms = (x, w) => { const out = []; for (let s = 0; s + w <= x.length; s += w) { let e = 0; for (let i = s; i < s + w; i++) e += x[i] * x[i]; out.push(Math.sqrt(e / w)); } return out; };
// clipping in the recording itself: runs of 3+ samples within 0.1 dB of the maximum, when that
// maximum is within 0.5 dB of full scale
const clipRuns = (chs) => {
  let pk = 0;
  for (const c of chs) for (const v of c) pk = Math.max(pk, Math.abs(v));
  if (pk < 10 ** (-0.5 / 20)) return 0;
  let runs = 0;
  for (const c of chs) { let run = 0; for (const v of c) { if (Math.abs(v) >= pk * 0.989) { run++; if (run === 3) runs++; } else run = 0; } }
  return runs;
};
const slice = (chs, a, b) => chs.map((c) => c.slice(clamp(n(a), 0, c.length), clamp(n(b), 0, c.length)));

// ── --list ──────────────────────────────────────────────────────────────────────────────────
const BARS = ' .:-=+*#%@';
const list = (only) => {
  for (const s of SOURCES) {
    if (only.length && !only.includes(s.key)) continue;
    if (!fs.existsSync(rawFile(s))) { console.log(`${s.key.padEnd(44)} not downloaded`); continue; }
    const chs = decode(s), m = mid(chs), dur = m.length / SR;
    const w = winRms(m, n(0.5)).map(db), top = Math.max(...w);
    const curve = w.map((v) => BARS[clamp(Math.round(((v - top + 45) / 45) * (BARS.length - 1)), 0, BARS.length - 1)]).join('');
    const l = loudness(chs, SR);
    console.log(`${s.key.padEnd(20)} ${dur.toFixed(1).padStart(5)} s  ${probe(rawFile(s)).slice(0, 44).padEnd(44)} int ${l.integrated.toFixed(1).padStart(6)}  clip ${String(clipRuns(chs)).padStart(3)}  ${s.title.slice(0, 40)}`);
    console.log(`${''.padEnd(20)} |${curve}|  (0.5 s per char, 45 dB range)`);
  }
};

// ── spectrogram sheets ──────────────────────────────────────────────────────────────────────
const fft = (re, im) => {
  const N = re.length;
  for (let i = 1, j = 0; i < N; i++) { let bit = N >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let size = 2; size <= N; size <<= 1) {
    const h = size >> 1, ang = (-2 * Math.PI) / size;
    for (let k = 0; k < h; k++) {
      const wr = Math.cos(ang * k), wi = Math.sin(ang * k);
      for (let i = k; i < N; i += size) { const j = i + h, tr = re[j] * wr - im[j] * wi, ti = re[j] * wi + im[j] * wr; re[j] = re[i] - tr; im[j] = im[i] - ti; re[i] += tr; im[i] += ti; }
    }
  }
};
// 3x5 capitals (the same glyphs as tools/asmr.mjs's sheet)
const FONT = Object.fromEntries(Object.entries({'A': '.#. #.# ### #.# #.#', 'B': '##. #.# ##. #.# ##.', 'C': '.## #.. #.. #.. .##', 'D': '##. #.# #.# #.# ##.', 'E': '### #.. ##. #.. ###', 'F': '### #.. ##. #.. #..', 'G': '.## #.. #.# #.# .##', 'H': '#.# #.# ### #.# #.#', 'I': '### .#. .#. .#. ###', 'J': '..# ..# ..# #.# .#.', 'K': '#.# #.# ##. #.# #.#', 'L': '#.. #.. #.. #.. ###', 'M': '#.# ### ### #.# #.#', 'N': '##. #.# #.# #.# #.#', 'O': '.#. #.# #.# #.# .#.', 'P': '##. #.# ##. #.. #..', 'Q': '.#. #.# #.# ##. .##', 'R': '##. #.# ##. #.# #.#', 'S': '.## #.. .#. ..# ##.', 'T': '### .#. .#. .#. .#.', 'U': '#.# #.# #.# #.# ###', 'V': '#.# #.# #.# #.# .#.', 'W': '#.# #.# ### ### #.#', 'X': '#.# #.# .#. #.# #.#', 'Y': '#.# #.# .#. .#. .#.', 'Z': '### ..# .#. #.. ###', '0': '### #.# #.# #.# ###', '1': '.#. ##. .#. .#. ###', '2': '##. ..# .#. #.. ###', '3': '##. ..# .#. ..# ##.', '4': '#.# #.# ### ..# ..#', '5': '### #.. ##. ..# ##.', '6': '.## #.. ### #.# ###', '7': '### ..# .#. .#. .#.', '8': '### #.# ### #.# ###', '9': '### #.# ### ..# ##.', '-': '... ... ### ... ...', '.': '... ... ... ... .#.', ':': '... .#. ... .#. ...', '/': '..# ..# .#. #.. #..', '+': '... .#. ### .#. ...', ' ': '... ... ... ... ...'}).map(([k, v]) => [k, v.replaceAll(' ', '')]));
const crcT = Array.from({length: 256}, (_, k) => { let c = k; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcT[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const png = (file, W, H, rgb) => {
  const raw = Buffer.alloc(H * (W * 3 + 1));
  for (let y = 0; y < H; y++) { raw[y * (W * 3 + 1)] = 0; rgb.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3); }
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 2;
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
};
const heat = (t) => { t = clamp(t, 0, 1); return [Math.round(255 * clamp(1.6 * t - 0.1, 0, 1)), Math.round(255 * clamp(1.9 * t - 0.8, 0, 1) ** 1.2), Math.round(255 * (clamp(3 * t, 0, 1) * 0.55 * (1 - t) + clamp(2.2 * t - 1.3, 0, 1)))]; };
// items: [{label, x (mono Float64Array), secs (px per second, or null = fit)}]. Log frequency
// 30 Hz..20 kHz, 70 dB under each panel's own maximum, faint lines at 100 Hz / 1 kHz / 10 kHz, an
// amplitude strip under it, and a ruler: a tick every second, a number every 5 s (every 1 s when
// the panel is short)
const drawSheet = (items, file, {cols = 1, pw = 1400, sh = 120} = {}) => {
  const LH = 16, AH = 22, RH = 16, GAP = 10;
  const cell = LH + sh + AH + RH + GAP, rowsN = Math.ceil(items.length / cols), W = cols * (pw + GAP) + GAP, H = rowsN * cell + GAP;
  const img = Buffer.alloc(W * H * 3, 12);
  const put = (x, y, [r, g, b]) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const o = (y * W + x) * 3; img[o] = r; img[o + 1] = g; img[o + 2] = b; };
  const text = (x, y, str, col = [220, 220, 228]) => { let cx = x; for (const ch of str.toUpperCase()) { const g = FONT[ch] ?? FONT[' ']; for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r * 3 + c] === '#') for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) put(cx + c * 2 + dx, y + r * 2 + dy, col); cx += 8; } };
  items.forEach((it, k) => {
    const x = it.x, dur = x.length / SR;
    const x0 = GAP + (k % cols) * (pw + GAP), y0 = GAP + Math.floor(k / cols) * cell;
    const width = it.secs ? Math.min(pw, Math.round(dur * it.secs)) : pw;
    text(x0, y0 + 2, `${it.label} ${dur.toFixed(2)}S`);
    const F = 2048, colsA = [];
    let top = -Infinity;
    for (let c = 0; c < width; c++) {
      const centre = Math.round(((c + 0.5) / width) * x.length), re = new Float64Array(F), im = new Float64Array(F);
      for (let i = 0; i < F; i++) { const j = centre - F / 2 + i; re[i] = (j >= 0 && j < x.length ? x[j] : 0) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / F)); }
      fft(re, im);
      const col = new Float64Array(sh);
      for (let y = 0; y < sh; y++) {
        const f = 30 * (20000 / 30) ** (y / (sh - 1)), f2 = 30 * (20000 / 30) ** ((y + 1) / (sh - 1));
        const b1 = Math.max(1, Math.floor((f * F) / SR)), b2 = Math.max(b1, Math.ceil((f2 * F) / SR));
        let e = 0;
        for (let b = b1; b <= Math.min(F / 2 - 1, b2); b++) e = Math.max(e, re[b] * re[b] + im[b] * im[b]);
        col[y] = 10 * Math.log10(e + 1e-20);
        top = Math.max(top, col[y]);
      }
      let a = 0;
      const lo = Math.floor((c / width) * x.length), hi = Math.floor(((c + 1) / width) * x.length);
      for (let i = lo; i < Math.max(lo + 1, hi); i++) a = Math.max(a, Math.abs(x[i] ?? 0));
      colsA.push({col, a});
    }
    const amax = Math.max(...colsA.map((c) => c.a)) || 1;
    colsA.forEach(({col, a}, c) => {
      for (let y = 0; y < sh; y++) put(x0 + c, y0 + LH + sh - 1 - y, heat((col[y] - top + 70) / 70));
      const h = Math.round((a / amax) * (AH - 4));
      for (let y = 0; y < h; y++) put(x0 + c, y0 + LH + sh + AH - 2 - y, [150, 150, 160]);
    });
    for (const f of [100, 1000, 10000]) { const y = Math.round((Math.log(f / 30) / Math.log(20000 / 30)) * (sh - 1)); for (let c = 0; c < width; c += 3) put(x0 + c, y0 + LH + sh - 1 - y, [70, 70, 80]); }
    // marks: [[a, b, label]] windows in seconds: a cyan line at each edge and a bar under the panel
    for (const [ma, mb, ml] of it.marks ?? []) {
      const ca = x0 + Math.round((ma / dur) * (width - 1)), cb = x0 + Math.round((Math.min(mb, dur) / dur) * (width - 1));
      for (const c of [ca, cb]) for (let y = 0; y < sh; y += 2) put(c, y0 + LH + y, [90, 230, 240]);
      for (let c = ca; c <= cb; c++) for (let y = 0; y < 3; y++) put(c, y0 + LH + sh + y, [90, 230, 240]);
      if (ml) text(ca + 3, y0 + LH + 3, ml, [90, 230, 240]);
    }
    // ruler
    const ry = y0 + LH + sh + AH, every = dur <= 8 ? 1 : 5;
    for (let t = 0; t <= dur + 1e-9; t += dur <= 3 ? 0.1 : 1) {
      const cx = x0 + Math.round((t / dur) * (width - 1)), whole = Math.abs(t - Math.round(t)) < 1e-6;
      for (let y = 0; y < (whole ? 5 : 2); y++) put(cx, ry + y, [200, 200, 210]);
      if (whole && Math.round(t) % every === 0) text(cx + 2, ry + 5, String(Math.round(t)), [170, 170, 180]);
    }
  });
  png(file, W, H, img);
  console.log(`sheet: ${rel(file)} (${W}x${H}, ${items.length} panels)`);
};

// ── processing ──────────────────────────────────────────────────────────────────────────────
const LEAD = 0.003; // the onset of a hit: right after its 3 ms fade-in (like the kit)
const hc = (i, len) => 0.5 - 0.5 * Math.cos((Math.PI * i) / len); // half-cosine 0..1
const shape = (s, p) => {
  const all = decode(s), dur = all[0].length / SR;
  const [a, b] = p.win ?? [0, dur];
  const xf = p.mode === 'loop' ? (p.xfade ?? 0.3) : 0;
  // 0.3 s of the source before the window settles the filters and is dropped again
  const pre = Math.min(0.3, a);
  let chs = slice(all, a - pre, b + xf);
  const src = slice(all, a, b + xf);
  const hp = p.hp ?? 30;
  chs = chs.map((c) => {
    let y = filt(filt(c, 'hp', hp, 0.5412), 'hp', hp, 1.3066);
    if (p.lp) y = filt(filt(y, 'lp', p.lp, 0.5412), 'lp', p.lp, 1.3066);
    for (const [type, f, q, g] of p.eq ?? []) y = filt(y, type, f, q, g);
    return y.slice(n(pre));
  });
  let [L, R] = chs;
  if (p.mode === 'loop') {
    // equal-power crossfade: the head of the loop is the source after the window (fading out) laid
    // over the window's own head (fading in), so the last sample runs straight into the first
    const len = n(b - a), x = n(xf);
    const out = [L, R].map((c) => {
      const y = c.slice(0, len);
      for (let i = 0; i < x; i++) { const t = (i / x) * (Math.PI / 2); y[i] = c[len + i] * Math.cos(t) + c[i] * Math.sin(t); }
      const mean = y.reduce((s2, v) => s2 + v, 0) / y.length;
      return y.map((v) => v - mean);
    });
    return {L: out[0], R: out[1], src};
  }
  let start = 0, end = L.length;
  if (p.mode === 'hit') {
    const m = mid([L, R]);
    let pk = 1e-9;
    for (const v of m) pk = Math.max(pk, Math.abs(v));
    const w = winRms(m, n(0.01)), quiet = Math.min(...w.slice(0, Math.max(1, w.length)));
    const th = Math.max(pk * 10 ** (-30 / 20), quiet * 10);
    const on = m.findIndex((v) => Math.abs(v) > th);
    start = Math.max(0, on - n(0.0015) - n(LEAD));
    end = Math.min(L.length, start + n(p.max ?? 6));
  }
  L = L.slice(start, end); R = R.slice(start, end);
  const len = L.length;
  const fi = n(p.fadeIn ?? (p.mode === 'hit' ? LEAD : 0.04)), fo = Math.min(Math.round(len / 3), n(p.fadeOut ?? (p.mode === 'hit' ? 0.08 : 0.25)));
  const out = [L, R].map((x) => {
    for (let i = 0; i < len; i++) {
      let g = 1;
      if (i < fi) g *= hc(i, fi);
      if (i >= len - fo) g *= hc(len - 1 - i, fo);
      x[i] *= g;
    }
    // DC out without moving the silent ends: a sine-weighted mean, removed with the same weight
    let s1 = 0, s2 = 0;
    for (let i = 0; i < len; i++) { const w = Math.sin((Math.PI * i) / (len - 1)) ** 2; s1 += x[i] * w; s2 += w * w; }
    const c = s1 / (s2 || 1);
    for (let i = 0; i < len; i++) x[i] -= c * Math.sin((Math.PI * i) / (len - 1)) ** 2;
    return x;
  });
  return {L: out[0], R: out[1], src: slice(all, a + start / SR, a + end / SR)};
};

// loop seam: the step across the seam as a percentile of every sample step in the file (a seamless
// loop ranks anywhere; above 99.5 % is a click)
const seamRank = (x) => {
  const steps = [];
  for (let i = 1; i < x.length; i++) steps.push(Math.abs(x[i] - x[i - 1]));
  const seam = Math.abs(x[0] - x[x.length - 1]);
  return (100 * steps.filter((v) => v < seam).length) / steps.length;
};

const build = () => {
  const bySrc = new Map(SOURCES.map((s) => [s.key, s]));
  const rows = [], own = [];
  let failed = 0;
  for (const p of PICKS) {
    const s = bySrc.get(p.src);
    if (!s || !fs.existsSync(rawFile(s))) { rows.push(`${p.name.padEnd(16)} source ${p.src} missing (node tools/real-import.mjs --fetch)   FAIL`); failed++; continue; }
    const rc = readReceipt(s);
    const {L, R, src} = shape(s, p);
    const vol = p.vol ?? 0.5;
    const now = loudness([L, R], SR).fast;
    let g = 10 ** ((VOICE_LUFS + p.rel - 20 * Math.log10(vol) - now) / 20) * FILM_TRIM;
    const tp = Math.max(truePeak(L), truePeak(R)) * g;
    const limited = db(tp) > -1.5;
    if (limited) g *= 10 ** ((-1.5 - db(tp)) / 20);
    const file = path.join(SFX, `real-${p.name}.wav`);
    writeWav(file, L.map((v) => v * g), R.map((v) => v * g), 7000 + own.length);
    const {chs} = readWav(file), a = analyse(chs, SR), spk = phoneLoss(chs, SR), decoded = plays(file), srcClip = clipRuns(src);
    const problems = [];
    if (decoded !== chs[0].length) problems.push(`plays? (ffmpeg decoded ${decoded} of ${chs[0].length} frames)`);
    if (a.dur < 0.25 || a.dur > 8) problems.push(`duration ${a.dur.toFixed(2)} s`);
    if (a.tp > -1.4) problems.push(`true peak ${a.tp.toFixed(1)}`);
    if (srcClip) problems.push(`the source clips here (${srcClip} runs)`);
    if (a.dc > 1e-4) problems.push('dc');
    if (p.mode !== 'loop' && a.edge > 1 / 32768) problems.push('edge');
    if (p.mode === 'hit' && a.onset > 6) problems.push(`onset ${a.onset.toFixed(1)} ms`);
    let seam = null;
    if (p.mode === 'loop') { seam = Math.max(seamRank(chs[0]), seamRank(chs[1])); if (seam > 99.5) problems.push(`loop seam ranks ${seam.toFixed(1)} %`); }
    if (problems.length) failed++;
    const vsVoice = a.fast + 20 * Math.log10(vol) - VOICE_LUFS - 20 * Math.log10(FILM_TRIM);
    rows.push(`${p.name.padEnd(16)}${p.mode.padStart(5)}${a.dur.toFixed(2).padStart(6)}${a.peak.toFixed(1).padStart(7)}${a.tp.toFixed(1).padStart(7)}${vsVoice.toFixed(1).padStart(7)}${String(Math.round(a.centroid)).padStart(7)}${spk.toFixed(1).padStart(7)}  ${s.key}@${p.win ? p.win.join('-') : 'all'}` +
      (limited ? '  (peak-limited: quieter than rel)' : '') + (seam !== null ? `  seam ${seam.toFixed(0)} %` : '') + (problems.length ? `   FAIL: ${problems.join(', ')}` : ''));
    own.push({
      name: `real-${p.name}`,
      file: `sfx/real-${p.name}.wav`,
      family: 'real',
      role: p.role,
      durationSec: +a.dur.toFixed(3),
      use: p.use,
      event: p.event,
      ...(p.mode === 'loop' ? {loop: true} : {}),
      suggestedVolume: vol,
      sync: p.mode === 'hit' ? 'onset 3 ms in: at = the frame of the event; hitMs = its loudest 10 ms' : p.mode === 'loop' ? 'a seamless loop: <Audio loop>, no fades at its ends (fade the cue itself)' : `a short scene with soft fades; hitMs = its loudest 10 ms${p.sync ? `; ${p.sync}` : ''}`,
      hitMs: Math.round(a.peakAt),
      peakDbfs: +a.peak.toFixed(1),
      centroidHz: Math.round(a.centroid),
      loudnessVsVoiceLU: +vsVoice.toFixed(1),
      phoneSpeakerDb: +spk.toFixed(1),
      filmTrim: 'included (+3 dB, like ASMR_TRIM for asmr- cues); do not add real- to ASMR_TRIM',
      source: {site: s.site, page: s.page, file: s.url, author: s.author, title: s.title, window: p.win ?? null, ...(s.preview ? {copy: 'Freesound HQ preview (Ogg Vorbis, lossy); the original needs a login'} : {})},
      licence: {name: s.licence.name, short: s.licence.short, url: s.licence.url, checked: rc?.fetched ?? null, seen: rc?.licenceSeen ?? null},
    });
  }
  // real- files are this tool's own output: a file whose pick is gone is removed
  for (const f of fs.readdirSync(SFX)) if (/^real-.*\.wav$/.test(f) && !own.some((e) => e.file === `sfx/${f}`)) { fs.unlinkSync(path.join(SFX, f)); console.log(`removed ${f} (no longer a pick)`); }
  fs.writeFileSync(MANIFEST, JSON.stringify(own, null, 2) + '\n');
  // the decoded cache keeps only what a pick reads (the rest is decoded again by --list / --sheet)
  if (fs.existsSync(DECODED)) for (const f of fs.readdirSync(DECODED)) if (!f.startsWith('_') && !PICKS.some((p) => `${p.src}.wav` === f)) fs.unlinkSync(path.join(DECODED, f));
  console.log(`\nVinari real car sounds: ${own.length} of ${PICKS.length} picks, 48 kHz 16-bit stereo, levelled against the voice (${VOICE_LUFS} LUFS)\n`);
  console.log('sound            mode   dur   peak  tpeak  LU vs   cent    spk  source@window');
  console.log('                          s   dBFS   dBFS  voice     Hz     dB');
  for (const r of rows) console.log(r);
  console.log(`\n${failed ? `${failed} pick(s) failed` : 'all checks pass'}: ffmpeg decodes every file to its last frame, 0.25..8 s, true peak <= -1.4 dBFS, no clipping in the`);
  console.log('source window, |DC| < 1e-4, hits: onset <= 6 ms and silent first/last samples, loops: the seam ranks under 99.5 % of all steps');
  console.log(`wrote ${rel(MANIFEST)}`);
  return {own, failed};
};

// ── REAL-LICENSES.md ────────────────────────────────────────────────────────────────────────
const writeLicenses = (own) => {
  const bySrc = new Map(SOURCES.map((s) => [s.key, s]));
  const used = [...new Set(PICKS.map((p) => p.src))].map((k) => bySrc.get(k)).filter(Boolean);
  const lines = [
    '# Real car sounds: licences (public/sfx/real-*.wav)',
    '',
    `Written by tools/real-import.mjs (${new Date().toISOString().slice(0, 10)}). Every file below may be used in paid, commercial videos and`,
    'ads without payment and without credit: each source is CC0 1.0 or public domain, and each licence was read',
    'from the source\'s own page by the tool before the file was downloaded (the "seen" column). Credit is not',
    'required; it is given here so anyone can trace a file back to its recording.',
    '',
    '- **CC0 1.0** (Creative Commons Zero): the author waived every copyright and related right worldwide.',
    `  Summary ${CC0.url} · legal code https://creativecommons.org/publicdomain/zero/1.0/legalcode`,
    '- **Public domain**: released into the public domain by its author, as stated on its Wikimedia Commons page.',
    '- Neither grants trademark rights: a sound is only a sound (no car brand is named in a film because of it).',
    '- **Freesound copies are previews.** Freesound (freesound.org) serves original files to logged-in users only;',
    '  its HQ preview (Ogg Vorbis, about 190 kbit/s, 44.1 kHz) is public. The CC0 dedication covers the recording',
    '  whatever copy of it is used. The previews are lossy: fine on a phone speaker, not a mastering source.',
    '- Every file was converted to 48 kHz 16-bit stereo WAV, cut to the window listed, high-passed (DC and',
    '  rumble), faded (or crossfaded into a loop) and levelled against the Vinari voice. Nothing else was changed.',
    '- Raw downloads (not in the repo): `../_research_scratch/real-sfx/`, each with a `.json` receipt (page, file',
    '  url, bytes, date, the licence text the page showed). `node tools/real-import.mjs --fetch` downloads them again.',
    '',
    '| file | source page | author | original title | window (s) | licence | checked | seen on the page |',
    '|---|---|---|---|---|---|---|---|',
  ];
  for (const e of own) {
    const lic = `[${e.licence.short}](${e.licence.url})`;
    lines.push(`| \`${path.basename(e.file)}\` | ${e.source.page} | ${e.source.author} | ${e.source.title.replaceAll('|', '/')} | ${e.source.window ? e.source.window.join('..') : 'all'} | ${lic} | ${e.licence.checked ?? '?'} | ${(e.licence.seen ?? '').replaceAll('|', '/')} |`);
  }
  lines.push('', '## Download urls', '');
  for (const s of used) lines.push(`- \`${s.key}\`: ${s.url ?? '(resolved from the Commons API at fetch time)'}`);
  lines.push('', '## Compared and not kept', '', 'Downloaded under the same licence check, judged from their spectrograms and level curves (not by ear), not used:', '');
  for (const s of SOURCES.filter((x) => !used.includes(x))) lines.push(`- ${s.site}: ${s.title} by ${s.author} (${s.page})${WHY[s.key] ? `: ${WHY[s.key]}` : ''}`);
  lines.push('', '## Not used as sources', '',
    '- Freesound user craigsmith (S-, G- and R- series): his profile says these are digitised from old Hollywood studio libraries (the',
    '  Gold, Red and Sunset Editorial libraries donated to USC). He marks them CC0, but who owns those recordings is unclear, so none is',
    '  used (three were downloaded to compare, then deleted: a bearing knock loop, a clattering engine, squeaky brakes).',
    '- Pixabay: its pages answer with a bot check (HTTP 403, "Just a moment"), so nothing could be read or licence-checked there.',
    '- Wikimedia Commons car recordings are mostly CC BY-SA 3.0 (the Goodwood hill-climb series) or CC BY 4.0 (Work With Sounds): left out, they need credit.',
    '- MIMII (Zenodo) machine-fault recordings: CC BY-SA. BBC Sound Effects: non-commercial (RemArc). Kaggle: downloads need a login.',
    '',
    '## Asked for and not found under CC0 / public domain',
    '',
    '- A hydraulic lifter tick (valve tick) as its own recording. real-knock is the nearest: a fast, metallic knock at idle.',
    '- Metal-on-metal grinding brakes. real-brake-squeak is a thin squeal, not a grind.',
    '- A wheel-bearing hum that is labelled as one for certain. real-whine is a whir its author only tags "bearing, problem".',
    '');
  fs.writeFileSync(LICENSES, lines.join('\n'));
  console.log(`wrote ${rel(LICENSES)} (${own.length} files)`);
};

// ── the audition ────────────────────────────────────────────────────────────────────────────
// Part 1: the v5 hook as the voiced film would play it: real-knock from frame 0 and the v5 voice from
// its own first word (1.07 s). Part 2: every real- sound once, in PICKS order, 1.2 s apart. The whole
// reel plays the VOICED film's balance: the voice at the kit's reference loudness, every cue at its
// suggestedVolume + MIX_VOICED.lift, trimmed so its loudest 100 ms stays MIX_VOICED.ceil LU under the
// voice (what common.tsx does once KIT_LEVEL reads real.json too). One gain for the whole reel (its
// loudest true peak at -3 dBFS).
const VOICE = path.join(ROOT, 'public', 'vo', 'v5-engine-sound', 'voice.wav');
const audition = (own) => {
  const lift = MIX_VOICED.lift, ceil = MIX_VOICED.ceil;
  const cueGain = (e, vol = e.suggestedVolume) => {
    const over = e.loudnessVsVoiceLU + 20 * Math.log10(vol / e.suggestedVolume) + lift + ceil;
    return vol * 10 ** (lift / 20) * (over > 0 ? 10 ** (-over / 20) : 1);
  };
  const parts = [], lines = [];
  const add = (o, chs, g) => { const [l, r] = chs.length === 2 ? chs : [chs[0], chs[0]]; parts.push({o, l, r, g}); return l.length; };
  const at = (o) => { const t = o / SR; return `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`; };
  let o = n(0.5);
  const byName = new Map(own.map((e) => [e.name, e]));
  const knock = byName.get('real-knock');
  if (knock && fs.existsSync(VOICE)) {
    const v = decodeFile(VOICE, '_voice-v5');
    const vg = 10 ** ((VOICE_LUFS - loudness([v[0]], SR).integrated) / 20); // the voice at the kit's reference (mono on both channels)
    const tl = JSON.parse(fs.readFileSync(path.join(path.dirname(VOICE), 'timeline.json'), 'utf8'));
    const lead = tl.beats[0].speechStart, cut = tl.beats[0].end;
    const kchs = readWav(path.join(SFX, path.basename(knock.file))).chs;
    add(o, kchs, cueGain(knock));
    add(o, [v[0].slice(0, n(cut)), v[1].slice(0, n(cut))], vg);
    lines.push(`${at(o)}  DEMO  real-knock from frame 0, then the v5 voice "ეს ხმა რა არის?" from ${lead.toFixed(2)} s (its first beat), as the voiced film mixes them`);
    o += Math.max(n(cut), kchs[0].length) + n(2.0);
  } else lines.push(`(no demo: ${fs.existsSync(VOICE) ? 'real-knock is not a pick' : `${rel(VOICE)} missing (./make.sh v5-engine-sound makes it)`})`);
  let lastRole = null;
  for (const e of own) {
    if (lastRole && e.role !== lastRole) o += n(1.0);
    const chs = readWav(path.join(SFX, path.basename(e.file))).chs;
    const len = add(o, chs, cueGain(e));
    lines.push(`${at(o)}  ${e.role.padEnd(8)} ${e.name.padEnd(24)} ${e.durationSec.toFixed(2).padStart(5)} s  vol ${e.suggestedVolume}  ${e.use}`);
    o += len + n(1.2);
    lastRole = e.role;
  }
  const total = o + n(0.5), L = new Float64Array(total), R = new Float64Array(total);
  for (const p of parts) for (let i = 0; i < p.l.length && p.o + i < total; i++) { L[p.o + i] += p.l[i] * p.g; R[p.o + i] += p.r[i] * p.g; }
  const k = 10 ** (-3 / 20) / Math.max(truePeak(L), truePeak(R), 1e-9);
  for (let i = 0; i < total; i++) { L[i] *= k; R[i] *= k; }
  writeWav(AUDITION, L, R, 88);
  fs.writeFileSync(AUDITION.replace(/\.wav$/, '.txt'), [
    `Vinari real car sounds: audition (${path.basename(AUDITION)}, ${(total / SR).toFixed(1)} s, ${own.length} sounds).`,
    'The balance is the voiced film\'s: the voice at the kit\'s reference loudness, each sound at its suggestedVolume',
    `lifted ${lift} dB (MIX_VOICED) and held ${ceil} LU under the voice at its loudest (the ceiling common.tsx applies once it`,
    `reads real.json; without that a real- cue plays up to ${lift} dB louder than the kit's balance, never over the ceiling`,
    `then). One gain for the whole reel (x${k.toFixed(2)}, loudest true peak -3 dBFS). Nothing here was listened to by the tool:`,
    'every take was chosen from its author\'s description, a spectrogram and a level curve. Listen on earbuds.',
    '',
    'time    role     name                      length   volume  use',
    ...lines, '',
  ].join('\n'));
  console.log(`audition: ${rel(AUDITION)} (${(total / SR).toFixed(1)} s), order ${rel(AUDITION.replace(/\.wav$/, '.txt'))}`);
  drawSheet(own.map((e) => ({label: e.name.replace(/^real-/, ''), x: mid(readWav(path.join(SFX, path.basename(e.file))).chs)})), AUDITION.replace(/\.wav$/, '.png'), {cols: 3, pw: 460, sh: 110});
  // every used source whole, each pick's window marked on it
  const srcs = [...new Set(PICKS.map((p) => p.src))].map((k) => SOURCES.find((x) => x.key === k)).filter((x) => x && fs.existsSync(rawFile(x)));
  drawSheet(srcs.map((x) => ({label: `${x.key} ${x.title.slice(0, 44)}`, x: mid(decode(x)), marks: PICKS.filter((p) => p.src === x.key).map((p) => [...(p.win ?? [0, 1e9]), p.name])})), AUDITION.replace(/\.wav$/, '.sources.png'), {cols: 2, pw: 700, sh: 80});
};

// ── main ────────────────────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const rest = args.filter((a) => !a.startsWith('--'));
if (flag('--fetch')) { await fetchAll(rest); process.exit(0); }
if (flag('--list')) { list(rest); process.exit(0); }
if (flag('--sheet')) {
  // a key, or key@a-b for a window of it (seconds)
  const want = rest.map((r) => { const [k, w] = r.split('@'); return {k, w: w ? w.split('-').map(Number) : null}; });
  const items = (want.length ? want : SOURCES.map((s) => ({k: s.key, w: null}))).map(({k, w}) => {
    const s = SOURCES.find((x) => x.key === k);
    if (!s || !fs.existsSync(rawFile(s))) return null;
    const m = mid(decode(s));
    return {label: `${s.key}${w ? ` @${w[0]}` : ''} ${s.title.slice(0, 44)}`, x: w ? m.slice(n(w[0]), n(w[1])) : m};
  }).filter(Boolean);
  drawSheet(items, path.join(OUT, 'real-audition.sources.png'), {cols: 1, pw: 1400, sh: 100});
  process.exit(0);
}
const missing = SOURCES.filter((s) => PICKS.some((p) => p.src === s.key) && !fs.existsSync(rawFile(s)));
if (missing.length) console.log(`missing sources: ${missing.map((s) => s.key).join(', ')}\nrun: node tools/real-import.mjs --fetch`);
const {own, failed} = build();
writeLicenses(own);
audition(own);
process.exit(failed ? 1 : 0);
