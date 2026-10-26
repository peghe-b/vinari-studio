import React from 'react';
import {AbsoluteFill} from 'remotion';
import {BrandMark} from './scenes/common';
import {setAccentMode, setTheme} from './tokens';
import type {CoverSpec, SceneSpec, VideoProps} from './types';
import {CoverFrame, GRID_BOTTOM, type Stage} from './cover/CoverFrame';
import {BrandCard, InfoCard} from './cover/InfoCard';
import {CARPLAY_SCREENS} from './cover/kinds.mjs';
import {filmPhotos, photoAt, Polaroids, type CoverPhoto} from './cover/Polaroid';
import {CarPlayTilt, PhoneTilt, type Tilt} from './cover/TiltDevice';
import {photoInfo} from './lib/photo';

// The designed Reels cover (the owner, 2026-09-24; rebuilt 2026-10-26, plan step 1.4): PURPOSE-BUILT, black and white, on the
// light paper, in the layout of the covers the owner approved (./cover/CoverFrame.tsx), and NEVER a frame of the film. The old
// cover froze the film at cover.frame (a Freeze of Promo): that is how №119 got the flat roundabout and №122 the drawn gauge.
// That code path is gone; the picture is one of four kinds (./cover/kinds.mjs), from the spec's own data:
//   card      cover.card {type: "bars" | "numbers", rows}: a white data card with a hand-drawn marker (./cover/InfoCard.tsx)
//   screen    cover.screen {src, tilt, mark}: a real current capture in a whole iPhone, tilted (./cover/TiltDevice.tsx)
//   carplay   cover.screen {src, tilt, mark}: a real CarPlay capture in the car's display, tilted
//   polaroid  cover.photo: the story's real photo(s) as instant photos (./cover/Polaroid.tsx)
// An older spec without "kind" (its "frame" is ignored): the story's person photo when it has one, else the last real app
// screen it shows, else any photo it shows, else the brand card. Rendered by tools/covers.mjs as out/<id>.cover.png
// (composition "<id>-cover", Root.tsx), checked there for colour (COVER_COLOUR) and the grid (COVER_GRID).

export const coverOf = (spec: VideoProps['spec']): CoverSpec => (typeof spec.cover === 'number' ? {} : (spec.cover ?? {}));

/** a stable number from the film's id (FNV-1a), so one film always gets the same marker strokes and tilt */
const seedOf = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** "a b|c d" -> lines. */
const parseTitle = (t: string) => t.split('|').map((line) => line.trim());

type Pick =
  | {kind: 'card'; card: NonNullable<CoverSpec['card']>}
  | {kind: 'screen' | 'carplay'; src: string; tilt: Tilt; mark?: NonNullable<CoverSpec['screen']>['mark']}
  | {kind: 'polaroid'; photos: CoverPhoto[]}
  | {kind: 'brand'};

/** The last real app screen the film shows (a Phone scene's src, a beat's or a cut's). */
const lastScreen = (spec: VideoProps['spec']) => {
  let src: string | null = null;
  const look = (sc: SceneSpec | undefined) => {
    const s = sc as {type?: string; src?: unknown} | undefined;
    if (s?.type === 'Phone' && typeof s.src === 'string' && /^[a-z0-9-]+$/.test(s.src)) src = s.src;
  };
  for (const b of spec.beats) {
    look(b.scene);
    for (const c of Array.isArray(b.cuts) ? b.cuts : []) look(c?.scene);
  }
  return src;
};

const pickCover = (props: VideoProps, n: number): Pick => {
  const cv = coverOf(props.spec);
  const kind = cv.kind ?? (cv.polaroid ? 'polaroid' : undefined);
  const tilt: Tilt = cv.screen?.tilt ?? (n % 2 ? 'right' : 'left');
  if (kind === 'card' && cv.card && Array.isArray(cv.card.rows) && cv.card.rows.length) return {kind: 'card', card: cv.card};
  if (kind === 'screen' && cv.screen?.src) return {kind: 'screen', src: cv.screen.src, tilt, mark: cv.screen.mark};
  if (kind === 'carplay' && cv.screen?.src && CARPLAY_SCREENS.includes(cv.screen.src)) return {kind: 'carplay', src: cv.screen.src, tilt: cv.screen.tilt ?? 'left', mark: cv.screen.mark};
  if (kind === 'polaroid') {
    const named = (Array.isArray(cv.photo) ? cv.photo : cv.photo ? [cv.photo] : []).filter((s) => typeof s === 'string' && photoInfo(s));
    const photos = named.length ? named.slice(0, 2).map((s) => photoAt(s)) : filmPhotos(props).length ? filmPhotos(props) : filmPhotos(props, false);
    if (photos.length) return {kind: 'polaroid', photos};
  }
  // nothing usable named: the story's person, else the film's last real screen, else any photo it shows, else the brand
  const story = filmPhotos(props);
  if (story.length) return {kind: 'polaroid', photos: story};
  const screen = lastScreen(props.spec);
  if (screen) return {kind: 'screen', src: screen, tilt};
  const any = filmPhotos(props, false);
  if (any.length) return {kind: 'polaroid', photos: any};
  return {kind: 'brand'};
};

export const Cover: React.FC<VideoProps> = (props) => {
  const {spec} = props;
  // always the light paper and ink (the owner, 2026-10-19: every cover on #F3F3F3, whatever the film's look)
  setTheme('light');
  setAccentMode(spec.accent);
  const cv = coverOf(spec);
  const lines = parseTitle(cv.title ?? spec.beats[0].say);
  const n = Number(/^v(\d+)/.exec(spec.id)?.[1] ?? 0);
  const seed = seedOf(String(spec.id ?? '')) % 100000;
  const note = cv.note ?? cv.sub;
  const pick: Pick = props.coverSafe ? {kind: 'brand'} : pickCover(props, n);
  const picture = (stage: Stage) => {
    switch (pick.kind) {
      case 'card':
        return <InfoCard type={pick.card.type} rows={pick.card.rows.slice(0, 3)} note={note} stage={stage} seed={seed} />;
      case 'screen':
        return <PhoneTilt src={pick.src} tilt={pick.tilt} mark={pick.mark} note={note} stage={stage} seed={seed} />;
      case 'carplay':
        return <CarPlayTilt src={pick.src} tilt={pick.tilt} mark={pick.mark} note={note} stage={stage} seed={seed} />;
      case 'polaroid':
        return <Polaroids photos={pick.photos} top={stage.top - 16} bottom={GRID_BOTTOM - 24} n={n} nudge={cv.y ?? 0} zoom={cv.zoom ?? 1} />;
      default:
        return <BrandCard stage={stage} note={note} mark={<BrandMark kind="mark" height={150} style={{filter: 'brightness(0) invert(1)'}} />} />;
    }
  };
  // the brand card is covers.mjs's last net after a cover broke its guards: it never inherits the spec's own pill, and it is
  // greyed whole, so a coloured glyph in the title (an emoji the check let through) cannot break it too (test film
  // r-pwrtreat1-dice, 2026-10-26: COVER_COLOUR in the pill on the cover AND on the brand card, so no film came out)
  if (props.coverSafe)
    return (
      <AbsoluteFill style={{filter: 'grayscale(1)'}}>
        <CoverFrame lines={lines}>{picture}</CoverFrame>
      </AbsoluteFill>
    );
  return (
    <CoverFrame lines={lines} pill={cv.pill}>
      {picture}
    </CoverFrame>
  );
};
