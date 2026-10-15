// ACT 4: the calm cluster in the daylight (no check light), the app's other real screens rising in a calm flow („და ეს მხოლოდ
// დასაწყისია"), two honest „მალე" chips (CarPlay, Android Auto: in the works, nothing else promised), the store and the end
// card. The end card (the QR promo's, without its stroke: the owner, no line under any text): the mark and the wordmark, the
// last line said and built word by word („შენი მანქანა / ქართულად / ალაპარაკდა."; the card is the line: no subtitle), the
// two store pills, and a quiet pill „7 დღე უფასოდ" (true: a first subscription starts with 7 free days).
import React from 'react';
import {Img, staticFile} from 'remotion';
import {mtav} from '../lib/format';
import {textWidth} from '../lib/measure';
import {C, F, rgba} from '../tokens';
import {clamp, E, lerp, prog, sp} from './lib';
import {useShot} from './Act1';
import {Cluster} from './kit/cluster';
import {atFoot, float, flatRect, Lift, Phone3, TapRing, type Band, type Region} from './kit/phone3d';

// ---- 24 calm: the cluster in the morning light, quiet, no lamp; the needle breathes at idle ------------------------------------
export const CalmShot: React.FC = () => {
  const {t, len} = useShot('calm');
  const k = E.inOut(prog(t, 0, len));
  return (
    <div style={{position: 'absolute', inset: 0, background: '#2C2E33'}}>
      <Cluster uid="cm" look="day" frame={t} check={0} rpm={0.09 + 0.004 * Math.sin(t / 3)} speed={0} cam={{s: lerp(1.0, 1.05, k), cx: 540, cy: lerp(950, 975, k)}} />
    </div>
  );
};

// ---- 25 more: the app's other real screens rise one by one into a calm grid -------------------------------------------------
const TILES = ['17-nav-drive', '08-qr-card', '02-calendar', '05-customs', '06-market', '07-parking'];
const TW = 250;
const TH = (TW * 2346) / 1080;
const GX = [135, 415, 695];
const GY = [262, 262 + TH + 36];
export const Tiles: React.FC<{t: number; at: number[]; dim?: number; push?: number}> = ({t, at, dim = 0, push = 0}) => (
  <div style={{position: 'absolute', inset: 0, transform: `scale(${1 + 0.03 * push})`, transformOrigin: '540px 820px', perspective: 2200}}>
    {TILES.map((src, i) => {
      const q = sp(t, at[i] ?? 0, 120, 17);
      if (q <= 0.001) return null;
      const x = GX[i % 3];
      const y = GY[Math.floor(i / 3)];
      return (
        <div
          key={src}
          style={{
            position: 'absolute',
            left: x,
            top: y,
            width: TW,
            height: TH,
            borderRadius: 34,
            overflow: 'hidden',
            background: C.surface,
            boxShadow: `0 ${24 * clamp(q)}px ${60 * clamp(q)}px ${rgba(C.shade, 0.16)}, 0 0 0 1.5px ${rgba(C.shade, 0.06)}`,
            opacity: clamp(q * 1.8) * (1 - dim),
            transform: `translateY(${(1 - q) * 120}px) rotateX(${(1 - clamp(q)) * 18}deg) scale(${lerp(0.9, 1, clamp(q))})`,
            transformOrigin: '50% 100%',
          }}
        >
          <Img src={staticFile(`screens/${src}.jpg`)} style={{width: TW, height: TH, display: 'block'}} />
        </div>
      );
    })}
  </div>
);

export const MoreShot: React.FC = () => {
  const {t, len, Ls} = useShot('more');
  const at = Ls('tiles');
  return (
    <div style={{position: 'absolute', inset: 0, background: '#F3F3F3', overflow: 'hidden'}}>
      <Tiles t={t} at={at.map((a, i) => (i === 0 ? a - 9 : a))} push={E.inOut(prog(t, 0, len))} />
    </div>
  );
};

// ---- 26 soon: the grid steps back under a veil; two honest chips land: „CarPlay · მალე", „Android Auto · მალე" -----------------
const Chip: React.FC<{name: string; k: number}> = ({name, k}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 22,
      padding: '26px 46px 28px',
      borderRadius: 999,
      background: C.ink,
      color: C.onInk,
      fontFamily: F.sans,
      fontWeight: 600,
      fontSize: 58,
      whiteSpace: 'nowrap',
      boxShadow: `0 22px 50px ${rgba(C.shade, 0.18)}`,
      opacity: clamp(k * 2),
      transform: `translateY(${(1 - k) * 50}px) scale(${lerp(0.8, 1, clamp(k))})`,
    }}
  >
    <span>{name}</span>
    <span style={{opacity: 0.5}}>·</span>
    <span style={{color: '#8FB0FF'}}>{mtav('მალე')}</span>
  </div>
);
export const SoonShot: React.FC = () => {
  const {t, Ls, base} = useShot('soon');
  const chips = Ls('chips');
  const moreAt = Ls('tiles');
  void base;
  const back = E.out(prog(t, 0, 10));
  return (
    <div style={{position: 'absolute', inset: 0, background: '#F3F3F3', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${lerp(1.03, 0.9, back)})`, transformOrigin: '540px 820px', opacity: lerp(1, 0.22, back)}}>
        <Tiles t={10000} at={moreAt.map(() => 0)} />
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 640, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40}}>
        <Chip name="CarPlay" k={sp(t, chips[0], 170, 15)} />
        <Chip name="Android Auto" k={sp(t, chips[1], 170, 15)} />
      </div>
    </div>
  );
};

// ---- 27 the store and the end card ----------------------------------------------------------------------------------------
const STORE = '26-appstore-page';
const HEAD: Region = {x0: 18 / 585, y0: 328 / 1266, x1: 567 / 585, y1: 542 / 1266};
const GET = {u: 286 / 585, v: 498 / 1266};
const STORES = ['App Store', 'Google Play'];
const GLYPH = [
  'M16.4 12.6c0-2.4 2-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.9-.9-3-.8-1.6 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.5-1-2.5-3.7zM14.1 5.5c.6-.8 1.1-1.8 1-2.9-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.8 1 .1 2.1-.5 2.7-1.3z',
  'M5 3.2v17.6c0 .4.4.6.8.4L20 12.9c.4-.2.4-.7 0-.9L5.8 2.8c-.4-.2-.8 0-.8.4z',
];
const PHONE_W = 420;
const STORE_FOOT = 1236;
const Y_STORE_PILLS = 1268;
const MARK_W = 140;
const MARK_H = (MARK_W * 671) / 768;
const Y_MARK = 300;
const Y_WORD = 444;
const TAG_TOP = 560;
const ORIGIN = {x: 540, y: 780};

const Pill: React.FC<{i: number; k: number}> = ({i, k}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '15px 34px 17px 28px',
      borderRadius: 999,
      background: C.ink,
      boxShadow: `0 ${(10 * k).toFixed(1)}px ${(24 * k).toFixed(1)}px ${rgba(C.shade, 0.16 * clamp(k))}`,
      fontFamily: F.sans,
      fontWeight: 600,
      fontSize: 36,
      lineHeight: 1.1,
      color: C.onInk,
      whiteSpace: 'nowrap',
      opacity: clamp(k * 2),
      transform: `translateY(${((1 - k) * 46).toFixed(2)}px) scale(${lerp(0.78, 1, k).toFixed(4)})`,
    }}
  >
    <svg width={34} height={34} viewBox="0 0 24 24" style={{display: 'block', flex: 'none', marginTop: i === 0 ? -4 : 0}}>
      <path d={GLYPH[i]} fill={C.onInk} />
    </svg>
    {STORES[i]}
  </div>
);

export const End: React.FC = () => {
  const {t, len, L, Ls} = useShot('end');
  const end = len;
  const bandAt = L('storeBand');
  const getAt = L('getTap');
  const p1 = L('pill1');
  const p2 = L('pill2');
  const cardAt = L('card');
  const markAt = L('mark');
  const tags = Ls('tag');
  const freeAt = L('free');
  const hit = clamp(L('endHit'), 0, end - 1);

  const enter = sp(t + 8, 0, 110, 21);
  const fl = float(t);
  const push = clamp(t / Math.max(1, cardAt));
  const sink = E.in(prog(t, cardAt, 11));
  const phoneA = 1 - E.inOut(prog(t, cardAt, 6));
  const w = PHONE_W * lerp(0.9, 1, enter) * (1 + 0.05 * push) * (1 - 0.1 * sink);
  let pose = atFoot({x: 540, w, yaw: lerp(14, -3, enter) + 2 * sink + fl.roll, pitch: lerp(9, 3, enter) + fl.pitch + 6 * sink, roll: fl.roll}, STORE_FOOT + 40 * (1 - enter) + 300 * sink);
  pose = {...pose, y: pose.y + fl.bob};
  const liftK = sp(t, bandAt, 150, 20) * (1 - E.inOut(prog(t, getAt + 12, 12)));
  const bandA = prog(t, bandAt - 6, 6) * (1 - clamp(liftK * 3)) * (1 - prog(t, getAt + 6, 4));
  const veil = 0.22 * prog(t, bandAt - 6, 8) * (1 - prog(t, getAt + 16, 10));
  const band: Band = {x: HEAD.x0 + 0.006, y: HEAD.y0 + 0.004, w: HEAD.x1 - HEAD.x0 - 0.012, h: HEAD.y1 - HEAD.y0 - 0.008, a: bandA};
  const hf = flatRect(pose, HEAD);
  const HS = 1.07;
  const headTo = {x: hf.x - (hf.w * (HS - 1)) / 2, y: hf.y - (hf.h * (HS - 1)) / 2, w: hf.w * HS, h: hf.h * HS};
  const pillK = [sp(t, p1, 190, 13), sp(t, p2, 190, 13)];
  const glide = E.inOut(prog(t, cardAt + 2, 18));

  const camK = clamp((t - cardAt) / Math.max(1, end - cardAt));
  const camE = 0.35 * E.out2(camK) + 0.65 * camK;
  const layer = (depth: number): React.CSSProperties => {
    const s = 1 + 0.07 * camE * depth;
    const dy = -16 * camE * depth;
    return {position: 'absolute', inset: 0, transform: `translate(0px, ${dy.toFixed(2)}px) scale(${s.toFixed(4)})`, transformOrigin: `${ORIGIN.x}px ${ORIGIN.y}px`};
  };
  const markK = sp(t, markAt - 3, 130, 15);
  const wmK = sp(t, markAt + 2, 130, 18);
  const nod = Math.sin(Math.PI * prog(t, hit, 8)) * (t >= hit ? 1 : 0);
  const shine = prog(t, hit - 4, 22);
  const words = [mtav('შენი'), mtav('მანქანა'), mtav('ქართულად'), mtav('ალაპარაკდა.')];
  const LINES = [[0, 1], [2], [3]];
  let size = 108;
  const lineText = (idx: number[]) => idx.map((i) => words[i]).join(' ');
  const widest = Math.max(...LINES.map((l) => textWidth(lineText(l), `700 ${size}px ${F.sans}`)));
  if (widest > 860) size = Math.floor((size * 860) / widest);
  const LH = size * 1.1;
  const gap = size * 0.28;
  const yPills = TAG_TOP + 3 * LH + 50;
  const pillsY = lerp(Y_STORE_PILLS, yPills, glide);
  const free = sp(t, freeAt, 150, 16);

  return (
    <div style={{position: 'absolute', inset: 0, background: C.surface, overflow: 'hidden'}}>
      {phoneA > 0.002 ? (
        <>
          <Phone3 src={STORE} pose={pose} look={1} rim={1} shadow={0.9} veil={veil} band={band} bar="patch" opacity={phoneA * clamp(enter * 2.2)} />
          {liftK > 0.002 ? (
            <Lift src={STORE} r={HEAD} pose={pose} to={headTo} k={liftK} radius={30} show={phoneA} band={{x0: HEAD.x0 + 0.006, y0: HEAD.y0 + 0.004, x1: HEAD.x1 - 0.006, y1: HEAD.y1 - 0.004, a: clamp(liftK * 1.5) * (1 - prog(t, getAt + 8, 6))}}>
              {({fx, fy, s}) => <TapRing x={fx(GET.u)} y={fy(GET.v)} k={prog(t, getAt, 16)} s={s * 0.9} />}
            </Lift>
          ) : null}
        </>
      ) : null}

      {t >= markAt - 4 ? (
        <div style={layer(1)}>
          <div style={{position: 'absolute', left: 540 - MARK_W / 2, top: Y_MARK + (1 - markK) * 34, width: MARK_W, height: MARK_H, opacity: clamp(markK * 1.6), transform: `scale(${(lerp(0.84, 1, markK) * (1 + 0.035 * nod)).toFixed(4)})`, transformOrigin: '50% 60%'}}>
            <Img src={staticFile('brand/mark.svg')} style={{width: MARK_W, height: MARK_H, filter: 'brightness(0) invert(0.045)'}} />
            {shine > 0 && shine < 1 ? (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  WebkitMaskImage: `url(${staticFile('brand/mark.svg')})`,
                  WebkitMaskSize: '100% 100%',
                  maskImage: `url(${staticFile('brand/mark.svg')})`,
                  maskSize: '100% 100%',
                  background: `linear-gradient(110deg, ${rgba(C.surface, 0)} ${lerp(-40, 120, shine) - 20}%, ${rgba(C.surface, 0.55)} ${lerp(-40, 120, shine)}%, ${rgba(C.surface, 0)} ${lerp(-40, 120, shine) + 20}%)`,
                }}
              />
            ) : null}
          </div>
          <Img src={staticFile('brand/wordmark.svg')} style={{position: 'absolute', left: 540 - 115, top: Y_WORD + (1 - wmK) * 24, width: 230, height: (230 * 68) / 267, filter: 'brightness(0) invert(0.045)', opacity: clamp(wmK * 1.4)}} />
        </div>
      ) : null}

      {t >= tags[0] - 3 ? (
        <div style={layer(0.8)}>
          {LINES.map((idx, li) => {
            const top = TAG_TOP + li * LH;
            const ws = idx.map((i) => textWidth(words[i], `700 ${size}px ${F.sans}`));
            const lineW = ws.reduce((acc, wd, n) => acc + wd + (n > 0 ? gap : 0), 0);
            let x = 540 - lineW / 2;
            return idx.map((i, n) => {
              const k = E.out(prog(t, tags[i] - 2, 9));
              if (n > 0) x += gap;
              const left = x;
              x += ws[n];
              return (
                <div key={i} style={{position: 'absolute', left, top, whiteSpace: 'nowrap', fontFamily: F.sans, fontWeight: 700, fontSize: size, lineHeight: 1.1, color: i === 2 ? C.accA : C.ink, opacity: k, transform: `translateY(${((1 - k) * 26).toFixed(2)}px)`}}>
                  {words[i]}
                </div>
              );
            });
          })}
        </div>
      ) : null}

      <div style={layer(0.6 * glide)}>
        <div style={{position: 'absolute', left: 0, right: 0, top: pillsY, display: 'flex', justifyContent: 'center', gap: 24}}>
          {STORES.map((st, i) => (
            <Pill key={st} i={i} k={pillK[i]} />
          ))}
        </div>
      </div>

      {free > 0.01 ? (
        <div style={layer(0.45)}>
          <div style={{position: 'absolute', left: 0, right: 0, top: yPills + 104, display: 'flex', justifyContent: 'center', opacity: clamp(free * 1.6), transform: `translateY(${((1 - clamp(free)) * 14).toFixed(2)}px)`}}>
            <div style={{padding: '12px 30px 14px', borderRadius: 999, boxShadow: `inset 0 0 0 2.5px ${C.accA}`, color: C.accA, fontFamily: F.sans, fontWeight: 600, fontSize: 34, whiteSpace: 'nowrap'}}>{mtav('7 დღე უფასოდ')}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
