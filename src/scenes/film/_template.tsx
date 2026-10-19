// src/scenes/film/_template.tsx: how to write a FILM SCENE, and a small working one to start from.
// (Not registered: a leading "_" is never a film. Copy it to <Name>.tsx; tools/ci/filmlint.mjs checks it.)
//
// WHAT IT IS. Every film designs at least one NEW visual for its key moment (the owner, 2026-09-27: "every film must
// think differently and try to make a good NEW graphic"): a new metaphor, camera and motion, refined and premium,
// thought afresh each time. It lives in src/scenes/film/<Name>.tsx, <Name> = the film's id in PascalCase
// (v26-night-scan -> V26NightScan), and exports ONE component of that name. The spec uses it like any scene:
//   "scene": {"type": "Film", "name": "V26NightScan", "at": 2, "label": "..."}   (your own props, any you like)
// The props arrive as `p` (the whole scene object), the timing as `ctx` (SceneCtx: dur, index, cues = the frames
// where the scene's subtitle chunks start, beats, speech). cueFrame(ctx, p.at) turns a chunk index or "1.2s" into a
// frame. Library scenes and stagings are fine for the other beats.
//
// WHAT IT MAY USE (filmlint refuses every other import, and names that are not exported):
//   react        React (default), Fragment, useMemo, useCallback, useId, memo; types freely
//   remotion     useCurrentFrame, useVideoConfig, interpolate, interpolateColors, spring, Easing, Sequence,
//                AbsoluteFill, Img, staticFile, random (seeded: random('seed-1'))
//   ../common    entrance, lead, cueFrame, CUT_IN, inSpeech, Sfx, Haptic, Land, toneHaptic, vary, TypeSfx,
//                SourceLine, MonoLabel, BrandMark (the scenes' own sound and label helpers), PictureBand (the hard cut)
//   ../../tokens C (the palette of the current look), F (font stacks), L (stage layout), SAFE, STAGE, SPRING, T,
//                rgba, halo, toneBig, toneText, toneLine, isLight, Tone, accentsOn (the film has an object accent pair)
//   ../../lib/anim    prog, spr (the house springs: 'enter', 'enterXL', 'land', 'tap'), ease (enter, exit, camera, countUp,
//                     drawOn, drift, whipIn, whipOut, snap), lerp, rand, logZoom, typeOn
//   ../../lib/format  mtav (Georgian -> Mtavruli), capsLatin, fmt
//   ../../lib/layer   TXT       ../../lib/measure  textWidth       ../../types  SceneCtx (type)
//   ../../lib/camera  CameraLayer (a plane of the picture that moves with the film's camera: depth 0.6 background,
//                     1 subject, 1.3 foreground: one move gives parallax), Hud (labels that never move), useKick (the
//                     camera's impact, 0..1, to flash a weight or a scale with it), kickEnv, springIn (a landing that
//                     goes about 3 % past and settles: motion 2's curve, 0..1 in, 0..1 out)
//   ../../lib/textfx  Words (one line set word by word: fx "mask" | "slam" | "blur" | "stack" | "strike" | "type" |
//                     "decode"; "*word*" is a punch word that pops, turns bold and takes its tone), lineWidth
//   building blocks: any scene module ("../Wire3D", "../Phone", "../QRCard", "../PhoneDesk", "../CarNight" ...: render <Wire3D p={{...}} ctx={ctx}/>
//   inside yours when that is clean) and the staging parts ("../staging/qrParts": MODULES, QN, REASONS, ICONS)
//   THE KIT (src/scenes/illo/, the "Graphite" look; each file's header has its props): the parts you compose YOUR
//   pictures from (the owner, 2026-10-06: "never a fixed set that rotates: every film invents new graphics that fit it")
//     ../illo/figure    Figure (refined people with faces and poses: cast me | friend | girl | ex | man | woman | mom |
//                       dad | grandpa | grandma | mechanic | seller | buyer | officer | boss | neighbour | crowd; face,
//                       pose, turn, hold, acts [{at, face, pose, fx, turn, hold}]), headAt, castLook, lookLine.
//                       THE WARDROBE: a role left bare is a NEW person every film (the kit picks the outfit, hair and face
//                       from the film's number: the same person all through the film). Dress someone for who they are in
//                       THIS story with {is, outfit, hair, ...}: outfit suit | suitOpen | blazer | leather | bomber |
//                       denim | trench | overcoat | puffer | shirt | polo | turtleneck | knit | hoodie (rarely) | tee |
//                       cardigan | blouse | dress | coverall | uniform; hair crop | side | quiff | slick | fade | buzz |
//                       curly | wavy | manbun | textured | receding | bald | long | waves | bob | lob | pixie | pony | bun
//                       | curls | lowbun; beard stubble | short | full | tache | goatee | none; glasses round | rect |
//                       shades | aviator | none; hat cap | beanie | flatCap | none; gender m | f; age young | adult | old;
//                       tone 0..7; extras [watch, chain, earrings, hoops, bag, scarf, tie]; look 1, 2 (another person of
//                       the same role). A businessman in a suit, an ex in a stylish coat; never the outfit AND hair the
//                       page's last 3 main characters wore (CAST_REPEAT)
//     ../illo/car       Car (a refined 2020s car: view side | rear | front | top, body sedan | suv (a coupe-SUV) | hatch |
//                       coupe | ev (an electric crossover) | racer, paint 1..5 or 'a' | 'b' (the film's accent), caliper,
//                       speed, lights {head, tail, brake, hazard, beam}, dent, dirt), carBox, blink. Vary the body
//                       and the view from the films before (never always the sedan in profile)
//     ../illo/handset   Handset, CallScreen, HandGrip (a phone, a call, a hand holding it);  ../illo/hand  Hand
//     ../illo/backdrop  Backdrop (city | mountains | highway | station | garage | room | coast | bridge | tunnel, day |
//                       night | dusk), Plate, ROADSIDE
//     ../illo/road      Road, CarAhead, Cabin (wheelX, wheel, screen {x}: the driver's, the passenger's or the console
//                       view), Wipers (the road in perspective, the driver's view)
//     ../illo/fx        Rain, Snow, Drops, Sparks, Confetti, Petals, Notes (banknotes), Smoke, SpeedLines, Dust, Rings,
//                       Shockwave, Burst, FaceFx (sweat, shock, tear, sparkle, zap, hearts, question, idea, zzz), Halo
//     ../illo/icons     Icon (warning lights, reactions, thoughts, signs);  ../illo/props  Prop, drawItem (an Item:
//                       phone, flowers, keys, wrench, ticket, clipboard, coffee, trophy, money, ringBox, plan)
//     ../illo/solid     Solid, Shadow, Glint, rr, circ, ell, capsule, poly, smooth, star, paint, IlloDefs
//     ../illo/scene     IlloBand (the full-bleed picture with the kit's defs and the night plate), Svg (one full-stage
//                       layer), TOP / FOOT (draw grounds and walls past the frame), timeOf, osc, env, useFilmKey,
//                       filmPick (this film's pick from a list: consecutive films differ), freshFilm
//     ../illo/palette   ground, far, near, lit, lamp, accent, glow, dark (the kit's tones from C, both looks), acc ('a' /
//                       'b': the film's object accent), accRamp (a shading ramp on a colour, like tone())
//   (filmlint refuses deepFreeze, and the kit scenes' own Camera / useCam: your camera is the rig's, ../../lib/camera)
//     ../../lib/guard.mjs  the frame guards' numbers and placements: footAbove (feet, a phone's foot, a wheel's rim kept over
//                       the subtitle band), fitSpan / fitWhole (a car, a phone, a card kept WHOLE inside the frame),
//                       SUB_BAND_STAGE, WHOLE_STAGE;  ../../lib/layer  OBJ / FIG (className on your own card or diagram
//                       / your own person, so check's probe finds them)
//   THE PROMO KIT (src/scenes/kit/, from film v110: the QR, navigator and diagnostics promos' parts, 100K views in 21 h; each
//   file's header has its props and an example; time everything from your ctx: `const {t, at} = useShot(ctx)`, at(p.hitAt, 20))
//     ../kit/stage      useShot, mixCam (a 3D camera move), personAt (a person on the car's floor), rise / riseIn / riseFoot
//                       (the phone's SLOW entrance), breath, punch, jolt, StepChip, StepLabel, Label, Card, Svg, cssCam
//     ../kit/car3d      Car3 (the graphite 2020s crossover in WebGL: cam {pos, target, fov} in metres, night 0..1, hood (the
//                       open bonnet and its engine bay), bayLamp, lift, lamp, yaw, at, design suv | sedan), projectCar
//     ../kit/garage     Garage (a Tbilisi workshop seen by the car's camera: look night | day, layer back | front round Car3)
//     ../kit/street     Street (an old Tbilisi street round the car: look day | night), viewOf;  ../kit/room  Room (an evening
//                       room, a mirror, a lamp), WarmLight
//     ../kit/people     Mechanic, Owner, Seller (Silhouette-light people: pose, face, turn, hold, acts, light garage | morning
//                       | day, cig, smoke);  ../kit/man  Man (walks, raises his phone);  ../kit/woman  Woman, POSES;
//                       ../kit/her  Her;  ../kit/passer  Passer;  ../kit/sil/sil  SilFigure, silPal, SilPalCtx
//     ../kit/phone3d    Phone3 (the REAL 3D iPhone on a real capture: pose {x, y, w, yaw, pitch, roll}, band, veil, taps),
//                       atFoot (a pose standing on a frame y), Lift (a row of the screen lifted out as a card), float, TapRing
//     ../kit/explain    StepShot (ONE whole step: label, the phone rising in a hand, the window on the row, the tap, the lift),
//                       HeldPhone, regionOf, inPlace;  ../kit/reveal  PhoneReveal (the slow product reveal, once a film)
//     ../kit/grip       GripBack, GripFront (a hand round Phone3);  ../kit/ios  LockScreen, Banner, IncomingCall,
//                       ActiveCall, QrFrame, LinkChip, VoiceNote, AppIcon, StatusBar (the phone's own UI, capture px)
//     ../kit/cockpit    Cockpit (a 2020s digital cockpit, the amber check lamp);  ../kit/cluster  Cluster, CheckLamp;
//                       ../kit/parts  PartIcon (12 engine parts)
//     ../kit/motion     MaskUp, CharRise, TrackIn, BlurUp, RollNumber, SlotWords, Swap, Strike, PillLine (refined text
//                       motion);  ../kit/cuts  Cut, Cuts (push | focus | axis | slide | scale: a fast cut INSIDE your Film)
//     ../kit/ui         Toast, Sheet, Stepper, Bubbles;  ../kit/chart  Curve, Bars, Ring (bold data);  ../kit/glow  Glow
//                       (light that blooms over a 3D canvas: headlamps, a lamp, a lit screen);  ../kit/icons  Sym (the
//                       app's own icons: qr_code_2, local_parking, calendar_month, obd_port, navigation_fill, speed ...)
//     ../kit/lib        clamp, lerp, prog, E (easings), sp (a spring), smoothPath, hash, rnd (seeded)
//   A 3D shot (Car3, Phone3, StepShot, PhoneReveal: one WebGL canvas each, two a scene at most) moves its OWN camera (mixCam
//   between two CarCams, a pose that turns): never inside a CameraLayer, a Cut or a CSS scale (its pixels would blur).
//   (filmlint refuses the kit's plumbing: SYMBOLS, canvasTex, makeEnv, KitScale, useKitDpr)
//
// THE RULES (filmlint.mjs enforces the first ones; the rest is the house style, CLAUDE.md Style):
// - Pure drawing code. No network, no page APIs, no timers, no clock, no Math.random, no eval, no `this`, no
//   dangerouslySetInnerHTML, no URLs (images only as <Img src={staticFile('screens/...')}/>), no event handlers, no
//   useState/useEffect/useRef/ref. At most 30 KB. Nothing runs on import: a top-level const is a literal, a function,
//   or an object, array or arithmetic of those (Math.* is fine); compute the rest inside the component. Never change
//   C, L or anything imported (C and the tables are frozen: a write throws). A computed key is a number: a[2], a[i]
//   from your own for loop, a[+i] for a map index; for a name write a.b. A style that can load a file (background,
//   mask, filter, content ...) takes literals, numbers and colours (C.x, rgba(), halo(), toneBig()); use
//   backgroundColor for a plain colour you were passed.
// - Frame-driven only: everything is a function of useCurrentFrame() (prog, spr, interpolate). No CSS animation.
// - Text: every element that draws text has className={TXT} (it goes to the clean text layer, off the lens), and
//   Georgian goes through mtav() (Mtavruli at render time); Latin through capsLatin() if caps. No em dash, no "!" in
//   the file (the film's one "!", a hook's, comes from the spec as a prop), no street word (one the film says comes
//   from the spec as a prop: ci/street-words.json), no call to action, no store, no "myauto". On screen only punch
//   words, 1 to 3 (5 a scene at most), never the subtitle's words (DUP_SUBTITLE). Measure with
//   textWidth(mtav(s), `600 48px ${F.sans}`) and shrink to fit.
// - Colour: only from C (C.ink, C.ink2, C.rule, C.surface, C.screen, C.shade ...) and toneBig/toneText/toneLine for
//   data marks (green good for the viewer, red costs the viewer, one saturated colour per shot). From v110 every WORD is
//   black or white (the owner, 2026-10-19: "refined black/white text"): a punch word lands by weight and motion, no
//   punchTone; and people are silhouettes (../kit/sil/sil SilFigure first: the mood in posture and light, no cartoon face). It must work on the black
//   film AND on the light paper: never a literal colour, halo() for glows (a whisper on paper).
//   OBJECT ACCENTS (the owner, 2026-10-12: "here and there on objects, refined harmonious colours that suit the film, to
//   draw attention; not many"): when accentsOn(), the ONE thing the moment is about may take C.accA (acc('a'),
//   toneLine('a')): the hero car's paint (Car paint 'a'), the part a diagram explains, a warning light, a highlight ring,
//   an icon; a second, small detail C.accB. One or two accented things a shot, the same pair all film, shaded with
//   accRamp() (never a flat toy fill). Never on text, the field, a Hud label or the cover: the words stay ink.
// - Space: draw in STAGE units, a 1080 x 1920 box. Important things inside x 120..960, y 380..1280 (L.side,
//   L.contentTop, L.contentBottom); below y 1080 (L.lowY) nothing important right of x 850 (L.lowRight). Wrap every
//   moving picture in <PictureBand> (outside your camera's scale/translate, as below). Two looks:
//   - COMPOSE IT: the illustrated scenes (Call, Chat, Drive, Windshield, Dashboard, Person, Money, Impact, Pump) are
//     references, not templates. Your Film is a NEW picture of THIS film's moment from the kit's parts: its own who
//     (cast, face, pose, what they hold), where (backdrop, time of day, weather), what (a car's body, view and lights, a
//     prop, an effect) and camera depth. check refuses a Film composed like one of the category's last 3 (IDEA_REPEAT)
//     or the page's last 3 (FEED_REPEAT). People and cars only from the kit, never lines (STICK_FIGURE).
//   - A PICTURE (a scene, a place, people, a car in its world: the spec's "look": "illustrated", or "bleed": true) is
//     FULL BLEED (the owner, 2026-10-06: "no crop band at the top and bottom"): PictureBand cuts nothing, the meta bar
//     hides, and your picture must fill the WHOLE frame: draw its sky, wall, ground or road from L.bleedTop to
//     L.bleedBottom (stage 16..1872; a plane at depth 1.3 a little past them), never a band that ends on a line inside
//     the frame. The subtitle sits on your picture: keep the subject in L.camSafe and the words in the Hud, inside the
//     content box, and the SUBTITLE BAND calm (below).
//   - A DIAGRAM ("look": "diagram": a part explained, bars, a gauge) keeps the clean field: PictureBand cuts it at
//     L.graphicsTop (370) and L.graphicsBottom (1380) on clean hard edges (no soft fades), nothing above y 345 (the meta
//     bar), and nothing lingers half-cut on those lines: an object leaves the band whole or stays whole inside it.
// - The look (the owner, 2026-10-19: "every film as powerful as the promos"): strong custom graphics, a NEW picture each
//   film, refined black or white text, real current app screens BIG in WHOLE phones (never cut by the frame or the band,
//   never under the subtitle), modern cars, silhouette people, clean motion, generous space, one idea a shot, springs that
//   settle, a picture on the cut frame (start the entrance at entrance(ctx), not at 0). No hairline or pen strokes (3 px
//   and up), no text under 34 px, no chaos. Every subtitle chunk changes something. Never a slideshow of text.
// - THE FRAME GUARDS (the owner, 2026-10-19, after checking v100-v110 frame by frame; src/lib/guard.mjs):
//   - the subtitle always reads: nobody and nothing stands in its band (frame y 1440..1560, stage 1380 down): no body, no
//     hands, no wheel, no phone, car or card, no road graphic under the words. A person, a car, a phone stands above stage
//     1380 (footAbove): a whole figure, not a bust running down through the band. Only ground, sky, wall or road there
//     (where it is busy anyway the line sits on a soft plate by itself);
//   - phones, cars, cards and diagrams stay WHOLE inside the frame (fitSpan / fitWhole); only a fast entry or exit (under
//     0.4 s) touches the edge;
//   - no shot holds still past 2.5 s (an event on a chunk, a turn, a cut);
//   - never a blurred or side-on phone (no blur filter on it, 35 degrees of yaw at most), never a thought bubble or cloud.
//   check samples the whole film every 6 frames: EDGE_CUT, SUB_BAND, STATIC_HOLD.
// - THE METHOD (the promos'): the problem LIVED first, in a real scene with Georgian street humour (a person, a place, a
//   car, the moment it goes wrong), then the reveal (the phone rising slowly out of the dark), then the clear explanation
//   step by step (one plain verb a step, the real screen, the window on the row, the tap, the row lifted big). A new
//   picture every 1.5 to 2.5 s: several beats, or Cuts inside one Film.
// - MOTION (2026-10-06, the owner: "the same trails every time, no camera, no motion"):
//   - Do not add your own scene-wide push or pan: the film's camera rig moves the camera (src/lib/camera.tsx). Put the
//     picture in <PictureBand camera={false}> with two or three <CameraLayer depth>s (a background at 0.6, the subject
//     at 1, a foreground at 1.3) and the labels in a <Hud>, and the one camera move gives depth.
//   - Keep important things inside L.camSafe (stage x 160..920, y 420..1240) or in the Hud.
//   - The overused motifs are draw-on routes, travelling dots, ripple rings, rise-in words and pop-ins: use one at
//     most (tools/ci/visual.mjs warns MOTIF_REPEAT). Think of a different picture for the idea.
//   - Give the key moment an IMPACT: name it `hitAt` in the spec (a chunk or "1.2s"): the camera kicks there; land a
//     punch word on it (<Words text="... *word*" fx="slam" .../>), a sound and one haptic.
// - Sound: the scene sounds its own events: <Sfx name="asmr-tap" at={f}/> (names: CLAUDE.md, Sound; never a pencil or
//   the room tone: they are silent from v110), one
//   <Haptic kind="light" at={f}/> per visual event, <Land at={f}/> when a value lands. Keep sounds on lead(ctx) or
//   later (a cue before frame 0 is lost), at most about three at once.
// - Check it: node tools/ci/filmlint.mjs <Name>, then node tools/check.mjs <id> and READ out/<id>.sheet.png: every phone
//   and car whole, every word readable at phone size, no two tiles alike, nothing a film before showed; refine what looks
//   cheap, crowded, cut off or off-centre, and check again.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, MonoLabel, PictureBand, Sfx} from '../common';
import {C, L, rgba, toneBig, type Tone} from '../../tokens';
import {footAbove} from '../../lib/guard.mjs';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
// the promo kit: compose this film's own picture from its parts
import {Car3, projectCar, type CarCam} from '../kit/car3d';
import {Garage} from '../kit/garage';
import {Glow} from '../kit/glow';
import {Mechanic, Owner} from '../kit/people';
import {StepShot} from '../kit/explain';
import {breath, INK, mixCam, personAt, Svg, useShot, WHITE} from '../kit/stage';
import {E} from '../kit/lib';

type P = {
  look?: 'illustrated' | 'diagram'; // the spec's "look": a picture (full bleed: the garage, the step) or a diagram (the band)
  shot?: 'garage' | 'step'; // which picture example (write yours as ONE picture)
  hitAt?: number | string; // the key moment (a chunk or "1.2s"): the camera kicks, the punch word lands
  line?: string; // the punch that lands on it, "*word*" = the punch word (1 to 3 words, never the subtitle's)
  label?: string; // a small readout in the HUD (the diagram)
  tone?: Tone;
  src?: string; // a real screen (public/screens/<src>.jpg) for the step
  step?: number;
  verb?: string; // the step's one plain verb and its object
  row?: {x?: number; y: number; w?: number; h: number}; // the row the step is about (capture fractions)
};

// the garage at night, seen by the car's own camera: a slow dolly in (two CarCams mixed), never a CSS push. Far enough back
// and aimed so the WHOLE car stays inside the frame all through the move (a car is never cut by the frame's side)
const CAM0: CarCam = {pos: [2.3, 1.75, 10.8], target: [-0.05, 0.85, 0.4], fov: 34};
const CAM1: CarCam = {pos: [2.15, 1.72, 10.4], target: [-0.05, 0.86, 0.42], fov: 34};

/** THE PROBLEM, LIVED (the diagnostics promo's bay shot): a deep two-shot in a Tbilisi workshop at night. The owner in the
 *  foreground at the left, standing whole with his feet just over the subtitle band (the frame guards: never a body running
 *  down through it), a little soft (the lens is on the car), arms crossed; behind him, sharp, the WHOLE graphite
 *  crossover at three quarters with the bonnet up (never cut by the frame) and the mechanic bent into its bay under the work
 *  lamp, the wrench in his fist (a held item turns with his bend); the room soft and dark. On the key moment the mechanic
 *  straightens and points, the lamp blooms, the punch word lands. A 3D shot: its camera is the CarCam (mixCam), not the rig;
 *  the text over a dark picture is white (WHITE), on a light one black (INK). A night picture belongs in a dark film
 *  ("theme": "dark": the subtitle is white over it); in a light film draw the day look (Garage look="day", Car3 night={0}),
 *  or the subtitle's black words sink into the dark room. */
const GarageShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, len, at} = useShot(ctx);
  const base = lead(ctx); // sounds start here or later
  const hit = Math.max(base + 12, at(p.hitAt, 30));
  const k = E.inOut(prog(t, 0, len));
  const cam = mixCam(CAM0, CAM1, k);
  const m = personAt(cam, 1.1, 1.55, 1.74); // the mechanic on the car's floor, by the open bay
  const lamp = projectCar(cam, [0.05, 1.45, 1.55]);
  const b = breath(t, 0.7);
  return (
    <PictureBand camera={false}>
      <div style={{position: 'absolute', left: -60, right: -60, top: -80, bottom: -80, backgroundColor: INK, overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: 60 + b.x, top: 80 + b.y, width: 1080, height: 1920}}>
          <div style={{position: 'absolute', inset: 0, filter: 'blur(9px) brightness(0.8)'}}>
            <Garage cam={cam} uid={`${uid}g`} look="night" lift={0} />
          </div>
          <Car3 cam={cam} night={1} street={0.5} lift={0} shadow={1} hood={1} bayLamp={1} lamp={0.3} bayDim={1.25} cool={0.12} style={{filter: 'saturate(0.55)'}} />
          <Glow x={lamp.x} y={lamp.y} r={260} color="#FFD9A8" k={0.6 + 0.3 * prog(t, hit, 10)} />
          <Svg>{m ? <Mechanic uid={`${uid}m`} x={m.x} y={m.y} size={m.size} frame={t} pose="hold" hold="wrench" face="meh" turn={-0.9} bend={40 - 10 * prog(t, hit - 6, 12)} acts={[{at: hit - 4, pose: 'point'}]} /> : null}</Svg>
          <Svg style={{filter: 'blur(1.5px)'}}>
            <Owner uid={`${uid}o`} x={170 + 11 * k} y={footAbove(1400)} size={1000} frame={t + 40} pose="crossArms" face="worried" turn={0.55} />
          </Svg>
        </div>
      </div>
      <Hud>
        {/* the punch word over the dark room, white, clear of the people's heads and inside the frame (measure a long one) */}
        <div style={{position: 'absolute', left: L.camSafe.left, top: 330, whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? 'ისევ *სანთლები*'} at={hit} fx="slam" size={80} color={WHITE} />
        </div>
      </Hud>
      <Sfx name="asmr-swell" at={Math.max(base, hit - 10)} volume={0.24} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};

/** ONE STEP of the how-to (the promo kit): the step label, the real screen in a whole phone rising slowly in a hand, the
 *  window on the row, the tap, the row lifted big. A step shot is a PICTURE: its beat says "look": "illustrated" (the
 *  spec: {"type": "Film", "name": ..., "look": "illustrated", "shot": "step"}: full bleed), or the clean field's band
 *  (370..1380) would cut the label; without it StepShot shrinks itself into the band. The phone's foot stays above the subtitle (stage 1300) and its top under
 *  the label (w 380: 2.25 x 380 = 855 px high, so its top is at 445, the label's 290..382). */
const StepPicture: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => (
  <PictureBand camera={false}>
    <StepShot ctx={ctx} src={p.src ?? '08-qr-card'} n={p.step ?? 1} text={p.verb ?? 'დააჭირე ამობეჭდვას'} row={p.row ?? {y: 0.648, h: 0.054}} tapAt={p.hitAt ?? 1} liftAt={p.hitAt ?? 1} hold w={380} foot={1300} labelY={290} />
    <Sfx name="asmr-tap" at={Math.max(lead(ctx), cueFrame(ctx, p.hitAt ?? 1))} volume={0.3} />
  </PictureBand>
);

/** A LOOK "diagram": a gauge in depth, BOLD (3 px and up). The background plane drifts less than the gauge (parallax), the
 *  needle slams to full on the key moment with the camera's kick, and the punch line lands under it. Every ring stays WHOLE
 *  inside the band (370..1380) and the frame, with room for the camera's drift: nothing lingers half-cut on a band's edge or
 *  the frame's side. */
const TICKS = 24;
const CX = 540;
const CY = 820;
const RINGS = [320, 380]; // the outer one: y 440..1200, x 160..920
const Diagram: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx); // the picture is already there on the cut frame
  const base = lead(ctx);
  const hit = Math.max(base + 12, cueFrame(ctx, p.hitAt ?? 1));
  const kick = useKick(); // 0..1: the rig's impact on hitAt
  const tone = p.tone ?? 'up';
  const appear = spr(frame, e, 'enterXL');
  const idle = 0.18 + 0.03 * Math.sin(frame / 9);
  const slam = prog(frame, hit, 8, ease.whipOut);
  const v = idle + (0.94 - idle) * slam;
  const a = (-120 + 240 * v) * (Math.PI / 180);
  const R = 250;
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.5 * appear}}>
          {RINGS.map((r, i) => (
            <circle key={i} cx={CX} cy={CY} r={r} fill="none" stroke={C.rule} strokeWidth={4} />
          ))}
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear, transform: `scale(${(0.94 + 0.06 * appear).toFixed(4)})`, transformOrigin: `${CX}px ${CY}px`}}>
          {Array.from({length: TICKS + 1}, (_, i) => {
            const t = (-120 + (240 * i) / TICKS) * (Math.PI / 180);
            const on = i / TICKS <= v;
            return <line key={i} x1={CX + Math.sin(t) * (R - 40)} y1={CY - Math.cos(t) * (R - 40)} x2={CX + Math.sin(t) * R} y2={CY - Math.cos(t) * R} stroke={on && slam > 0 ? toneBig(tone) : C.ink2} strokeWidth={i % 6 === 0 ? 7 : 4} strokeLinecap="round" />;
          })}
          <line x1={CX} y1={CY} x2={CX + Math.sin(a) * (R - 60)} y2={CY - Math.cos(a) * (R - 60)} stroke={C.ink} strokeWidth={8} strokeLinecap="round" />
          <circle cx={CX} cy={CY} r={16 + 6 * kick} fill={C.ink} />
          <circle cx={CX} cy={CY} r={R + 26} fill="none" stroke={rgba(C.ink, 0.12 + 0.3 * kick)} strokeWidth={4} />
        </svg>
      </CameraLayer>
      <Hud>
        <MonoLabel text={p.label ?? 'წნევა'} at={Math.max(base, e + 4)} size={40} color={C.ink} style={{position: 'absolute', left: L.camSafe.left, top: L.camSafe.top - 30}} />
      </Hud>
      <div style={{position: 'absolute', left: L.camSafe.left, top: 1230, whiteSpace: 'nowrap'}}>
        <Words text={p.line ?? 'ერთი *დარტყმა*'} at={hit} fx="slam" size={84} />
      </div>
      <Sfx name="asmr-swell" at={Math.max(base, hit - 10)} volume={0.28} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};

/** One film scene, one export: the spec's "look" and "shot" pick the example (write yours as ONE picture for your moment). */
export const FilmTemplate: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) =>
  p.look === 'diagram' ? <Diagram p={p} ctx={ctx} /> : p.shot === 'step' ? <StepPicture p={p} ctx={ctx} /> : <GarageShot p={p} ctx={ctx} />;
