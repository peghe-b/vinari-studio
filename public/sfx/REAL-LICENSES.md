# Real car sounds: licences (public/sfx/real-*.wav)

Written by tools/real-import.mjs (2026-10-04). Every file below may be used in paid, commercial videos and
ads without payment. Each licence was read from the source's own page by the tool before the file was downloaded
(the "seen" column). The CC0 and public-domain files need no credit; it is given here so anyone can trace a file
back to its recording. The CC BY files need a credit wherever a film using one is published: see "Credit required"
below (a film may use one only while ci/sounds.json "creditLines" is on; tools/ci/publish.mjs then adds the line).

- **CC0 1.0** (Creative Commons Zero): the author waived every copyright and related right worldwide.
  Summary https://creativecommons.org/publicdomain/zero/1.0/ · legal code https://creativecommons.org/publicdomain/zero/1.0/legalcode
- **Public domain**: released into the public domain by its author, as stated on its Wikimedia Commons page.
- **CC BY 3.0 / 4.0** (Attribution): free to use commercially and to change, with credit (title, author, source,
  licence, and that it was changed). https://creativecommons.org/licenses/by/3.0/ · https://creativecommons.org/licenses/by/4.0/
- None grants trademark rights: a sound is only a sound (no car brand is named in a film because of it).
- **Freesound copies are previews.** Freesound (freesound.org) serves original files to logged-in users only;
  its HQ preview (Ogg Vorbis, about 190 kbit/s, 44.1 kHz) is public. The CC0 dedication covers the recording
  whatever copy of it is used. The previews are lossy: fine on a phone speaker, not a mastering source.
- Every file was converted to 48 kHz 16-bit stereo WAV, cut to the window listed, high-passed (DC and
  rumble), faded (or crossfaded into a loop) and levelled against the Vinari voice. Nothing else was changed.
- Raw downloads (not in the repo): `../_research_scratch/real-sfx/`, each with a `.json` receipt (page, file
  url, bytes, date, the licence text the page showed). `node tools/real-import.mjs --fetch` downloads them again.

| file | source page | author | original title | window (s) | licence | checked | seen on the page |
|---|---|---|---|---|---|---|---|
| `real-knock.wav` | https://freesound.org/people/jlstaples/sounds/535073/ | jlstaples | engine-knock.aif | 5.9..8.5 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-09-24 | page links creativecommons.org/publicdomain/zero/1.0; author jlstaples |
| `real-knock-long.wav` | https://freesound.org/people/jlstaples/sounds/535073/ | jlstaples | engine-knock.aif | 4..10 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-09-24 | page links creativecommons.org/publicdomain/zero/1.0; author jlstaples |
| `real-knock-rev.wav` | https://freesound.org/people/jlstaples/sounds/535073/ | jlstaples | engine-knock.aif | 16.5..22 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-09-24 | page links creativecommons.org/publicdomain/zero/1.0; author jlstaples |
| `real-belt-squeal.wav` | https://freesound.org/people/unfa/sounds/180031/ | unfa | Old Car Starting in Winter | 0.3..5 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-09-24 | page links creativecommons.org/publicdomain/zero/1.0; author unfa |
| `real-belt-screech.wav` | https://freesound.org/people/Mullumbimby/sounds/622829/ | Mullumbimby | Cold start of old diesel car | 4.3..9 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-09-24 | page links creativecommons.org/publicdomain/zero/1.0; author Mullumbimby |
| `real-diesel-crank.wav` | https://freesound.org/people/Mullumbimby/sounds/622829/ | Mullumbimby | Cold start of old diesel car | 0..4.9 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-09-24 | page links creativecommons.org/publicdomain/zero/1.0; author Mullumbimby |
| `real-false-start.wav` | https://freesound.org/people/Kinoton/sounds/478593/ | Kinoton | Car Engine, False Start 4x | 0.3..5.3 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-09-24 | page links creativecommons.org/publicdomain/zero/1.0; author Kinoton |
| `real-no-start.wav` | https://freesound.org/people/Kinoton/sounds/478593/ | Kinoton | Car Engine, False Start 4x | 14.85..17.9 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-09-24 | page links creativecommons.org/publicdomain/zero/1.0; author Kinoton |
| `real-starter-click.wav` | https://freesound.org/people/shdwtek/sounds/679204/ | shdwtek | 12 Volt Solenoid Clicks | 0..2.6 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-09-24 | page links creativecommons.org/publicdomain/zero/1.0; author shdwtek |
| `real-broken-exhaust.wav` | https://freesound.org/people/mcweigert/sounds/390744/ | mcweigert | Audi A4 1998 broken exhaust - start and drive off.MP3 | 9.4..15 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-09-24 | page links creativecommons.org/publicdomain/zero/1.0; author mcweigert |
| `real-turbo-whine.wav` | https://freesound.org/people/editboy23/sounds/496171/ | editboy23 | Import car revs on Chassis Dyno with Turbo.wav | 19.8..25.8 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-09-24 | page links creativecommons.org/publicdomain/zero/1.0; author editboy23 |
| `real-sputter.wav` | https://freesound.org/people/bowlingballout/sounds/579211/ | bowlingballout | 1970 VW Bug Engine Starting Sputtering.wav | 18.2..22.4 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-09-24 | page links creativecommons.org/publicdomain/zero/1.0; author bowlingballout |
| `real-whine.wav` | https://freesound.org/people/watercool/sounds/410235/ | watercool | As.m4a | 2..6 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-09-24 | page links creativecommons.org/publicdomain/zero/1.0; author watercool |
| `real-brake-squeak.wav` | https://freesound.org/people/WavJunction.com/sounds/456764/ | WavJunction.com | Car Brakes sqeak screech squeal stop.wav | 0.3..3.4 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-09-24 | page links creativecommons.org/publicdomain/zero/1.0; author WavJunction.com |
| `real-clunk.wav` | https://freesound.org/people/orlandorizo/sounds/591079/ | orlandorizo | Car rolling on asphalt .wav | 31.9..33.9 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-09-24 | page links creativecommons.org/publicdomain/zero/1.0; author orlandorizo |
| `real-start.wav` | https://freesound.org/people/RutgerMuller/sounds/50898/ | RutgerMuller | Car Ignition Key - Engine Starting Running Idle 2.wav | 0..4.78 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-09-24 | page links creativecommons.org/publicdomain/zero/1.0; author RutgerMuller |
| `real-start-b.wav` | https://commons.wikimedia.org/wiki/File:1997AccordSE_enginestart.ogg | X5DragonFire | 1997AccordSE enginestart.ogg | 0..6 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-09-24 | API LicenseShortName "CC0"; wikitext {{self/cc-zero}}, {{own}} work; artist "X5DragonFire" |
| `real-idle.wav` | https://freesound.org/people/chiliwau/sounds/772236/ | chiliwau | Old big Toyota car idle | 1.2..4.9 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-09-24 | page links creativecommons.org/publicdomain/zero/1.0; author chiliwau |
| `real-door.wav` | https://freesound.org/people/monotraum/sounds/208695/ | monotraum | car door close.wav | all | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-09-24 | page links creativecommons.org/publicdomain/zero/1.0; author monotraum |
| `real-door-b.wav` | https://freesound.org/people/Heigh-hoo/sounds/9876/ | Heigh-hoo | car_door_closed.aif | all | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-09-24 | page links creativecommons.org/publicdomain/zero/1.0; author Heigh-hoo |
| `real-fob-lock.wav` | https://freesound.org/people/hz37/sounds/396448/ | hz37 | Car Lock | all | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-09-24 | page links creativecommons.org/publicdomain/zero/1.0; author hz37 |
| `real-indicator.wav` | https://freesound.org/people/MPierluissi/sounds/446322/ | MPierluissi | VEHCar_NISSAN SENTRA-TURNING SIGNAL_MP.wav | 0..3.26 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-09-24 | page links creativecommons.org/publicdomain/zero/1.0; author MPierluissi |
| `real-indicator-loop.wav` | https://freesound.org/people/MPierluissi/sounds/446322/ | MPierluissi | VEHCar_NISSAN SENTRA-TURNING SIGNAL_MP.wav | 0.4..1.7948 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-09-24 | page links creativecommons.org/publicdomain/zero/1.0; author MPierluissi |
| `real-seatbelt.wav` | https://freesound.org/people/RutgerMuller/sounds/50900/ | RutgerMuller | car seatbelt clicking.wav | 0.17..0.47 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-09-24 | page links creativecommons.org/publicdomain/zero/1.0; author RutgerMuller |
| `real-key-in.wav` | https://freesound.org/people/sound_catcher99/sounds/425160/ | sound_catcher99 | Car key inserted into ignition | 0.3..1.4 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-09-24 | page links creativecommons.org/publicdomain/zero/1.0; author sound_catcher99 |
| `real-handbrake.wav` | https://freesound.org/people/Mrthenoronha/sounds/405416/ | Mrthenoronha | Pulling Hand Brake Single.wav | 0..1 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-09-24 | page links creativecommons.org/publicdomain/zero/1.0; author Mrthenoronha |
| `real-parking-sensor.wav` | https://commons.wikimedia.org/wiki/File:Open_Corsa_E_model_2014_parking_sensor_sound.oga | MKFI | Open Corsa E model 2014 parking sensor sound.oga | 0.6..4.95 | [Public domain](https://commons.wikimedia.org/wiki/Commons:Licensing#Public_domain) | 2026-09-24 | API LicenseShortName "Public domain"; wikitext {{PD-self}}, {{own}} work; artist "MKFI" |
| `real-pass-by.wav` | https://freesound.org/people/Breviceps/sounds/462862/ | Breviceps | Passing Car (Wet road) | 0.1..5.6 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-09-24 | page links creativecommons.org/publicdomain/zero/1.0; author Breviceps |
| `real-phone-buzz.wav` | https://freesound.org/people/richwise/sounds/476836/ | richwise | phone short buzz | all | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-09-24 | page links creativecommons.org/publicdomain/zero/1.0; author richwise |
| `real-phone-buzz-desk.wav` | https://freesound.org/people/Splash.Yang/sounds/77392/ | Splash.Yang | mobile phone vibration.aif | 0.25..3.55 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-09-24 | page links creativecommons.org/publicdomain/zero/1.0; author Splash.Yang |
| `real-rain-roof.wav` | https://freesound.org/people/Nox_Sound/sounds/535870/ | Nox_Sound | Ambiance_Rain_Inside_Car_Close_Roof_Loop_Stereo.wav | 10..16 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-09-24 | page links creativecommons.org/publicdomain/zero/1.0; author Nox_Sound |
| `real-interior-drive.wav` | https://freesound.org/people/priesjensen/sounds/495795/ | priesjensen | Car driving ambience | 2..8 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-09-24 | page links creativecommons.org/publicdomain/zero/1.0; author priesjensen |
| `real-weak-battery.wav` | https://freesound.org/people/RadioOAF/sounds/141995/ | RadioOAF | Citroen Xantia 2.0 HDI Startversuche.mp3 | 8.8..14 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-10-04 | page links creativecommons.org/publicdomain/zero/1.0; author RadioOAF |
| `real-starter-grind.wav` | https://freesound.org/people/nissse/sounds/322974/ | nissse | 1983 Volvo 245 starter engagement failure + successful start | 19.9..23.3 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-10-04 | page links creativecommons.org/publicdomain/zero/1.0; author nissse |
| `real-worn-engine.wav` | https://freesound.org/people/Kevaaq/sounds/203962/ | Kevaaq | worn_engine_idle.flac | 0.5..5.5 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-10-04 | page links creativecommons.org/publicdomain/zero/1.0; author Kevaaq |
| `real-worn-engine-rev.wav` | https://freesound.org/people/Kevaaq/sounds/203963/ | Kevaaq | worn_engine_revving.flac | 0.2..5.8 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-10-04 | page links creativecommons.org/publicdomain/zero/1.0; author Kevaaq |
| `real-suspension-creak.wav` | https://freesound.org/people/nmscher/sounds/86234/ | nmscher | Car_Suspension_Creak.aif | 14.7..18 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-10-04 | page links creativecommons.org/publicdomain/zero/1.0; author nmscher |
| `real-belt-squeak.wav` | https://freesound.org/people/itinerantmonk108/sounds/707216/ | itinerantmonk108 | LandRover idle belt | 2..7 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-10-04 | page links creativecommons.org/publicdomain/zero/1.0; author itinerantmonk108 |
| `real-rough-idle.wav` | https://freesound.org/people/JalynCatbtg/sounds/616520/ | JalynCatbtg | Rough Car Motor.wav | 2..7 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-10-04 | page links creativecommons.org/publicdomain/zero/1.0; author JalynCatbtg |
| `real-exhaust-drive.wav` | https://freesound.org/people/Veridiansunrise/sounds/399222/ | Veridiansunrise | Broken Muffler to DC | 20..25 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-10-04 | page links creativecommons.org/publicdomain/zero/1.0; author Veridiansunrise |
| `real-turbo-whistle.wav` | https://freesound.org/people/fredless/sounds/181165/ | fredless | audiwhistle.mp3 | 6.2..12.2 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-10-04 | page links creativecommons.org/publicdomain/zero/1.0; author fredless |
| `real-misfire.wav` | https://freesound.org/people/j_soundeffects/sounds/843896/ | j_soundeffects | Misfiring Engine Volvo 240 | 4..9.5 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | 2026-10-04 | page links creativecommons.org/licenses/by/4.0; author j_soundeffects |
| `real-idler-pulley.wav` | https://freesound.org/people/EnduringAutomotive/sounds/170320/ | EnduringAutomotive | Bad Pulley.wav | 2..6 | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | 2026-10-04 | page links creativecommons.org/licenses/by/3.0; author EnduringAutomotive |
| `real-steering-pump.wav` | https://freesound.org/people/EnduringAutomotive/sounds/170253/ | EnduringAutomotive | Power Steering.wav | 2..6 | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | 2026-10-04 | page links creativecommons.org/licenses/by/3.0; author EnduringAutomotive |
| `real-valve-train.wav` | https://freesound.org/people/EnduringAutomotive/sounds/170252/ | EnduringAutomotive | Valve Cover.wav | 2..6 | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | 2026-10-04 | page links creativecommons.org/licenses/by/3.0; author EnduringAutomotive |
| `real-alternator.wav` | https://freesound.org/people/EnduringAutomotive/sounds/170250/ | EnduringAutomotive | Alternator.wav | 2..6 | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | 2026-10-04 | page links creativecommons.org/licenses/by/3.0; author EnduringAutomotive |
| `real-starter-grind-b.wav` | https://freesound.org/people/lonemonk/sounds/167910/ | lonemonk | Engine-Starter Grind.wav | all | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | 2026-10-04 | page links creativecommons.org/licenses/by/4.0; author lonemonk |
| `real-brake-squeal.wav` | https://freesound.org/people/IEDLabs/sounds/82321/ | IEDLabs | squeaky brakes dry.aif | 0..3.4 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | 2026-10-04 | page links creativecommons.org/licenses/by/4.0; author IEDLabs |
| `real-battery-dies.wav` | https://freesound.org/people/YleArkisto/sounds/244785/ | YleArkisto | Henkilöauto, kylmäkäynnistys / A car, cold starts, attempts, battery runs out of power, Saab 99, a 1982 model | 47.2..54 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | 2026-10-04 | page links creativecommons.org/licenses/by/4.0; author YleArkisto |
| `real-turbo-whistle-diesel.wav` | https://freesound.org/people/digifishmusic/sounds/28641/ | digifishmusic | Opel Astra Diesel 19CDTi Start Idle Rev Off.wav | 14.6..18.6 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | 2026-10-04 | page links creativecommons.org/licenses/by/4.0; author digifishmusic |
| `real-squeak-pass.wav` | https://freesound.org/people/shimsewn/sounds/90651/ | shimsewn | car squeaky.wav | all | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | 2026-10-04 | page links creativecommons.org/licenses/by/4.0; author shimsewn |

## Credit required (CC BY)

These files may be used only with a credit wherever the film is published. Use one only while ci/sounds.json
"creditLines" is on: tools/ci/publish.mjs then puts the cue's Georgian line under the post (build-index refuses
the cue while it is off). The full credit (TASL, with the change notice CC BY asks for):

| file | credit (TASL) | the line under the post |
|---|---|---|
| `real-misfire.wav` | "Misfiring Engine Volvo 240" by j_soundeffects (https://freesound.org/s/843896/), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/); trimmed, filtered and levelled for Vinari | ხმა: „Misfiring Engine Volvo 240“, j_soundeffects, freesound.org/s/843896, CC BY 4.0 (creativecommons.org/licenses/by/4.0), დამუშავებული |
| `real-idler-pulley.wav` | "Bad Pulley.wav" by EnduringAutomotive (https://freesound.org/s/170320/), licensed under CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/); trimmed, filtered and levelled for Vinari | ხმა: „Bad Pulley“, EnduringAutomotive, freesound.org/s/170320, CC BY 3.0 (creativecommons.org/licenses/by/3.0), დამუშავებული |
| `real-steering-pump.wav` | "Power Steering.wav" by EnduringAutomotive (https://freesound.org/s/170253/), licensed under CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/); trimmed, filtered and levelled for Vinari | ხმა: „Power Steering“, EnduringAutomotive, freesound.org/s/170253, CC BY 3.0 (creativecommons.org/licenses/by/3.0), დამუშავებული |
| `real-valve-train.wav` | "Valve Cover.wav" by EnduringAutomotive (https://freesound.org/s/170252/), licensed under CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/); trimmed, filtered and levelled for Vinari | ხმა: „Valve Cover“, EnduringAutomotive, freesound.org/s/170252, CC BY 3.0 (creativecommons.org/licenses/by/3.0), დამუშავებული |
| `real-alternator.wav` | "Alternator.wav" by EnduringAutomotive (https://freesound.org/s/170250/), licensed under CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/); trimmed, filtered and levelled for Vinari | ხმა: „Alternator“, EnduringAutomotive, freesound.org/s/170250, CC BY 3.0 (creativecommons.org/licenses/by/3.0), დამუშავებული |
| `real-starter-grind-b.wav` | "Engine-Starter Grind.wav" by lonemonk (https://freesound.org/s/167910/), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/); trimmed, filtered and levelled for Vinari | ხმა: „Engine-Starter Grind“, lonemonk, freesound.org/s/167910, CC BY 4.0 (creativecommons.org/licenses/by/4.0), დამუშავებული |
| `real-brake-squeal.wav` | "squeaky brakes dry.aif" by IEDLabs (https://freesound.org/s/82321/), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/); trimmed, filtered and levelled for Vinari | ხმა: „squeaky brakes dry“, IEDLabs, freesound.org/s/82321, CC BY 4.0 (creativecommons.org/licenses/by/4.0), დამუშავებული |
| `real-battery-dies.wav` | "Henkilöauto, kylmäkäynnistys / A car, cold starts, attempts, battery runs out of power, Saab 99, a 1982 model" by YleArkisto (https://freesound.org/s/244785/), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/); trimmed, filtered and levelled for Vinari | ხმა: „A car, cold starts, battery runs out of power, Saab 99“, YleArkisto, freesound.org/s/244785, CC BY 4.0 (creativecommons.org/licenses/by/4.0), დამუშავებული |
| `real-turbo-whistle-diesel.wav` | "Opel Astra Diesel 19CDTi Start Idle Rev Off.wav" by digifishmusic (https://freesound.org/s/28641/), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/); trimmed, filtered and levelled for Vinari | ხმა: „Opel Astra Diesel 19CDTi Start Idle Rev Off“, digifishmusic, freesound.org/s/28641, CC BY 4.0 (creativecommons.org/licenses/by/4.0), დამუშავებული |
| `real-squeak-pass.wav` | "car squeaky.wav" by shimsewn (https://freesound.org/s/90651/), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/); trimmed, filtered and levelled for Vinari | ხმა: „car squeaky“, shimsewn, freesound.org/s/90651, CC BY 4.0 (creativecommons.org/licenses/by/4.0), დამუშავებული |

## Download urls

- `fs535073`: https://cdn.freesound.org/previews/535/535073_219873-hq.ogg
- `fs180031`: https://cdn.freesound.org/previews/180/180031_1038806-hq.ogg
- `fs622829`: https://cdn.freesound.org/previews/622/622829_6394480-hq.ogg
- `fs478593`: https://cdn.freesound.org/previews/478/478593_2247456-hq.ogg
- `fs679204`: https://cdn.freesound.org/previews/679/679204_14804462-hq.ogg
- `fs390744`: https://cdn.freesound.org/previews/390/390744_3472961-hq.ogg
- `fs496171`: https://cdn.freesound.org/previews/496/496171_1784475-hq.ogg
- `fs579211`: https://cdn.freesound.org/previews/579/579211_485650-hq.ogg
- `fs410235`: https://cdn.freesound.org/previews/410/410235_5882206-hq.ogg
- `fs456764`: https://cdn.freesound.org/previews/456/456764_9514571-hq.ogg
- `fs591079`: https://cdn.freesound.org/previews/591/591079_6411813-hq.ogg
- `fs50898`: https://cdn.freesound.org/previews/50/50898_179538-hq.ogg
- `wc-1997accordse-enginestart`: https://upload.wikimedia.org/wikipedia/commons/3/3d/1997AccordSE_enginestart.ogg
- `fs772236`: https://cdn.freesound.org/previews/772/772236_16645026-hq.ogg
- `fs208695`: https://cdn.freesound.org/previews/208/208695_1756543-hq.ogg
- `fs9876`: https://cdn.freesound.org/previews/9/9876_21830-hq.ogg
- `fs396448`: https://cdn.freesound.org/previews/396/396448_123355-hq.ogg
- `fs446322`: https://cdn.freesound.org/previews/446/446322_4986614-hq.ogg
- `fs50900`: https://cdn.freesound.org/previews/50/50900_179538-hq.ogg
- `fs425160`: https://cdn.freesound.org/previews/425/425160_4370343-hq.ogg
- `fs405416`: https://cdn.freesound.org/previews/405/405416_2402876-hq.ogg
- `wc-open-corsa-e-model-2014-parking-sensor-sound`: https://upload.wikimedia.org/wikipedia/commons/3/3c/Open_Corsa_E_model_2014_parking_sensor_sound.oga
- `fs462862`: https://cdn.freesound.org/previews/462/462862_9159316-hq.ogg
- `fs476836`: https://cdn.freesound.org/previews/476/476836_1481531-hq.ogg
- `fs77392`: https://cdn.freesound.org/previews/77/77392_325383-hq.ogg
- `fs535870`: https://cdn.freesound.org/previews/535/535870_9250976-hq.ogg
- `fs495795`: https://cdn.freesound.org/previews/495/495795_8972317-hq.ogg
- `fs141995`: https://cdn.freesound.org/previews/141/141995_2567813-hq.ogg
- `fs322974`: https://cdn.freesound.org/previews/322/322974_326207-hq.ogg
- `fs203962`: https://cdn.freesound.org/previews/203/203962_2590045-hq.ogg
- `fs203963`: https://cdn.freesound.org/previews/203/203963_2590045-hq.ogg
- `fs86234`: https://cdn.freesound.org/previews/86/86234_1188748-hq.ogg
- `fs707216`: https://cdn.freesound.org/previews/707/707216_2397507-hq.ogg
- `fs616520`: https://cdn.freesound.org/previews/616/616520_13349052-hq.ogg
- `fs399222`: https://cdn.freesound.org/previews/399/399222_46808-hq.ogg
- `fs181165`: https://cdn.freesound.org/previews/181/181165_3376436-hq.ogg
- `fs843896`: https://cdn.freesound.org/previews/843/843896_14030247-hq.ogg
- `fs170320`: https://cdn.freesound.org/previews/170/170320_3148183-hq.ogg
- `fs170253`: https://cdn.freesound.org/previews/170/170253_3148183-hq.ogg
- `fs170252`: https://cdn.freesound.org/previews/170/170252_3148183-hq.ogg
- `fs170250`: https://cdn.freesound.org/previews/170/170250_3148183-hq.ogg
- `fs167910`: https://cdn.freesound.org/previews/167/167910_230160-hq.ogg
- `fs82321`: https://cdn.freesound.org/previews/82/82321_1245723-hq.ogg
- `fs244785`: https://cdn.freesound.org/previews/244/244785_4415905-hq.ogg
- `fs28641`: https://cdn.freesound.org/previews/28/28641_29541-hq.ogg
- `fs90651`: https://cdn.freesound.org/previews/90/90651_338714-hq.ogg

## Compared and not kept

Downloaded under the same licence check, judged from their spectrograms and level curves (not by ear), not used:

- Freesound: carstart2.wav by csproductions (https://freesound.org/people/csproductions/sounds/36837/): the source clips (36 runs near 0 dBFS)
- Freesound: carstart.wav by csproductions (https://freesound.org/people/csproductions/sounds/36836/): the source is saturated from start to end
- Freesound: Brakes Squeak in Rain.wav by shelbyshark (https://freesound.org/people/shelbyshark/sounds/513360/): the squeaks are faint under loud rain; fs456764 is cleaner
- Freesound: slow_moving_car_wintertyres_braking by Jupo_22 (https://freesound.org/people/Jupo_22/sounds/839068/): one thin squeal line under tyre crunch
- Freesound: car_6 by ronikn (https://freesound.org/people/ronikn/sounds/770642/): the squeal is faint, at the very end
- Freesound: Japan_Tokyo_Shinjuku_Walking_Screeching_Brake_City.wav by RutgerMuller (https://freesound.org/people/RutgerMuller/sounds/364896/): the squeal lasts 0.5 s and is cut by the file end
- Freesound: parkingbrake.mp3 by j1987 (https://freesound.org/people/j1987/sounds/95006/): a parking-brake ratchet, repeated; fs405416 is the cleaner single pull
- Freesound: car_engine_won't start.wav by KRAFTWERK2K1 (https://freesound.org/people/KRAFTWERK2K1/sounds/32416/): cranking only, like no-start but noisier
- Freesound: Car not starting.wav by Ika.Komura (https://freesound.org/people/Ika.Komura/sounds/520773/): long even cranking; the Kinoton takes are cleaner
- Freesound: Car Not Starting by Moondogg (https://freesound.org/people/Moondogg/sounds/216531/): long takes with a noisy garage
- Freesound: Ignition Failure and Cricket Noise by qubodup (https://freesound.org/people/qubodup/sounds/819556/): crickets and street noise over it
- Freesound: cranks-but-not-start.mp3 by drdeath666 (https://freesound.org/people/drdeath666/sounds/687447/): three short cranks, low quality mp3 source
- Freesound: Turbo Spooling and Blow Off.WAV by EwanPenman11 (https://freesound.org/people/EwanPenman11/sounds/659544/): quiet and windy: no clear blow-off
- Freesound: WRX - Exhaust sounds by ulose2piranha (https://freesound.org/people/ulose2piranha/sounds/273334/): healthy revs, not a fault
- Freesound: Interior Prius driving rough road w rattles.wav by buddhafish (https://freesound.org/people/buddhafish/sounds/327718/): road noise with no single clear clunk
- Freesound: Passing car + road bump by Breviceps (https://freesound.org/people/Breviceps/sounds/508170/): the bump is small under the pass-by
- Freesound: Car sputter and car start vintage MG convertable.wav by jedg (https://freesound.org/people/jedg/sounds/505820/): a long, noisy start
- Freesound: 1970 VW Bug Engine Cranking 2.wav by bowlingballout (https://freesound.org/people/bowlingballout/sounds/579213/): cranking again (no-start covers it)
- Freesound: CarEngine.wav by prometheus888 (https://freesound.org/people/prometheus888/sounds/458461/): a start with revs; real-start is cleaner
- Freesound: Car engine start up running and turning off.wav by sound_catcher99 (https://freesound.org/people/sound_catcher99/sounds/425158/): a third healthy start, not needed
- Freesound: car idle by seth-m (https://freesound.org/people/seth-m/sounds/269771/): the source clips at 0.79 s and 1.06 s
- Freesound: car door close.wav by ninebilly (https://freesound.org/people/ninebilly/sounds/173009/): the source clips (13 runs)
- Freesound: Car_Door_Closing_Dull_04 by BlondPanda (https://freesound.org/people/BlondPanda/sounds/778421/): a thin, dull door
- Freesound: Car locking by jackthemurray (https://freesound.org/people/jackthemurray/sounds/433590/): one beep over a noisy street
- Freesound: car lock.mp3 by hawabaz (https://freesound.org/people/hawabaz/sounds/91358/): a good alternative chirp, not needed
- Freesound: Car - Turn Signal.wav by MWsfx (https://freesound.org/people/MWsfx/sounds/574249/): noisy interior
- Freesound: Car blinker by Audy_Leonard (https://freesound.org/people/Audy_Leonard/sounds/431816/): a good alternative (Audi A2, tick and tock differ), not needed
- Freesound: Vehicle's Turning Signal - On.wav by NHumphrey (https://freesound.org/people/NHumphrey/sounds/200976/): noisy interior
- Freesound: 2 SEAT BELT CLICKS.wav by metrostock99 (https://freesound.org/people/metrostock99/sounds/345064/): handling noise around the clicks
- Freesound: Seat belt click in by jonnythedonkey (https://freesound.org/people/jonnythedonkey/sounds/429948/): room noise around the click
- Freesound: Inside a car in the rain by derjuli (https://freesound.org/people/derjuli/sounds/448125/): less detail than Nox_Sound
- Freesound: Rain_inside_of_a_Car.wav by Framefive (https://freesound.org/people/Framefive/sounds/143120/): a good alternative, not needed
- Freesound: Car passing by.wav by hinzebeat (https://freesound.org/people/hinzebeat/sounds/171447/): a dry pass-by; the wet one reads better as a whoosh
- Freesound: PassingCar01.wav by Pingel (https://freesound.org/people/Pingel/sounds/3179/): slow and long
- Freesound: Phone vibration by Breviceps (https://freesound.org/people/Breviceps/sounds/515295/): noisy
- Freesound: Car electric window.wav by devy32 (https://freesound.org/people/devy32/sounds/439247/): not needed
- Freesound: Gear Shift - Park Reverse Drive - Interior Honda.wav by UnplugTheFridge (https://freesound.org/people/UnplugTheFridge/sounds/529222/): not needed
- Wikimedia Commons: Open Corsa E model 2014 engine startup sound.ogg by MKFI (https://commons.wikimedia.org/wiki/File:Open_Corsa_E_model_2014_engine_startup_sound.ogg): a short start with a gap before it; the Accord is clearer
- Wikimedia Commons: HR12DE-March-K13.oga by Oq10pass (https://commons.wikimedia.org/wiki/File:HR12DE-March-K13.oga): clips hard (582 runs; the uploader "tuned" it)
- OpenGameArt: door_closing.wav by looneybits (https://opengameart.org/content/cardoorsfx): a game-style door, thinner than the recorded Audi
- OpenGameArt: blinker01.wav by looneybits (https://opengameart.org/content/car-blinker-sfx): a single game-style blink
- Freesound: Bad Pulley.wav by EnduringAutomotive (https://freesound.org/people/EnduringAutomotive/sounds/170249/): the same bad pulley as fs170320 with heavy noise reduction (artefacts); the unedited take is kept

## Not used as sources

- Freesound user craigsmith (S-, G- and R- series): his profile says these are digitised from old Hollywood studio libraries (the
  Gold, Red and Sunset Editorial libraries donated to USC). He marks them CC0, but who owns those recordings is unclear, so none is
  used (three were downloaded to compare, then deleted: a bearing knock loop, a clattering engine, squeaky brakes).
- Pixabay: its pages answer with a bot check (HTTP 403, "Just a moment"), so nothing could be read or licence-checked there.
- Wikimedia Commons car recordings are mostly CC BY-SA 3.0 (the Goodwood hill-climb series: ShareAlike, excluded) or CC BY 4.0
  (Work With Sounds); its "Sounds of automobiles" category (73 files, searched 2026-10-05) holds healthy supercars, street
  ambience and pronunciations, no faults.
- MIMII (Zenodo) machine-fault recordings: CC BY-SA. BBC Sound Effects: non-commercial (RemArc). Kaggle: downloads need a login.
- Freesound CmdRobot "Clicking Engine Cooldown" (539514): a designed sound, not a recording. mickyman5000's flat-battery start (340662): an ATV.
- archive.org: only podcasts and 78 rpm sound-effect records with unclear rights. Openverse: mirrors Freesound and Commons.
- Zapsplat, Mixkit, Sonniss GDC bundles, SoundBible: custom licences, logins, bot checks or doubtful provenance (not CC).

## Asked for and not found under an open licence (CC0, public domain, CC BY; searched again 2026-10-05)

- A hydraulic lifter tick (valve tick) as its own recording. real-knock is the nearest fault (a fast, metallic knock at idle);
  real-valve-train is a valve train its author does not call faulty.
- Engine detonation (pinging) as its own recording: real-knock is a rod knock, a different fault, never a stand-in for it.
- Metal-on-metal grinding brakes (on a car; only trains were found). real-brake-squeak / real-brake-squeal are squeals.
- A wheel-bearing hum that is labelled as one for certain. real-whine is a whir its author only tags "bearing, problem":
  a film never calls it a bearing.
- A CV-joint (axle) click when turning.
- A faulty power-steering whine (real-steering-pump is a pump its author does not call faulty) and a faulty turbo (only whistles nobody calls faulty).
