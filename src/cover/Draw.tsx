// The cover's painter (2026-10-27): it draws, in order, exactly the primitives ./layout.mjs placed: cards and the speech
// bubble, texts, discs and the app's icons, the bars, the hand-drawn marks (./Marker.tsx), a region of a real capture (the
// loupe and the phone's tag), the flat source phone, the tilted phone, the CarPlay display and the polaroid. Nothing here
// decides a size or a position: the layout did, and the checks read the same numbers.
import React from 'react';
import {Img} from 'remotion';
import {mtav} from '../lib/format';
import {photoFile, placePhoto} from '../lib/photo';
import {useScreenUrl} from '../lib/statusbar';
import {BrandMark} from '../scenes/common';
import {Sym} from '../scenes/kit/icons';
import {F} from '../tokens';
import type {CoverMark} from '../types';
import {CAPTURE} from './layout.mjs';
import {type Box, Marks} from './Marker';
import {CarPlayTilt, Phone3D} from './TiltDevice';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Prim = {t: string} & Record<string, any>;

const Text: React.FC<{p: Prim}> = ({p}) => (
  <div
    style={{
      position: 'absolute',
      left: p.x,
      top: p.y,
      fontFamily: F.sans,
      fontWeight: p.weight,
      fontSize: p.px,
      lineHeight: 1,
      letterSpacing: p.tracking ? `${p.tracking}em` : undefined,
      color: p.color,
      whiteSpace: 'nowrap',
    }}
  >
    {p.mtav ? mtav(p.text) : p.text}
  </div>
);

const Card: React.FC<{p: Prim}> = ({p}) => <div style={{position: 'absolute', left: p.x, top: p.y, width: p.w, height: p.h, borderRadius: p.r ?? 0, background: p.fill, boxShadow: p.shadow}} />;

/** the speech bubble: a rounded card with its tail as one path, the card's shadow under both */
const Bubble: React.FC<{p: Prim}> = ({p}) => {
  const {x, y, w, h, r} = p;
  const [t0, t1, tip, th] = p.tail as [number, number, number, number];
  const b = y + h;
  const d = `M${x + r},${y} H${x + w - r} A${r},${r} 0 0 1 ${x + w},${y + r} V${b - r} A${r},${r} 0 0 1 ${x + w - r},${b} H${t1} L${tip},${b + th} L${t0},${b} H${x + r} A${r},${r} 0 0 1 ${x},${b - r} V${y + r} A${r},${r} 0 0 1 ${x + r},${y} Z`;
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', filter: 'drop-shadow(0 16px 17px rgba(0,0,0,0.16)) drop-shadow(0 2px 4px rgba(0,0,0,0.08))'}}>
      <path d={d} fill={p.fill} />
    </svg>
  );
};

const Line: React.FC<{p: Prim}> = ({p}) => (
  <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
    <line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke={p.color} strokeWidth={p.w} strokeLinecap="round" />
  </svg>
);

const Mark: React.FC<{p: Prim}> = ({p}) => (
  <Marks marks={[{kind: p.kind as CoverMark, box: p.box as Box, seed: p.seed, pad: p.pad, rot: p.rot}]} w={1080} h={1920} color={p.color} width={p.stroke} />
);

/** a region of a real capture, enlarged z times, in grey: each corner round only where it is the element's own corner, and a
 *  fade on each side where the crop cuts through the element (src/cover/layout.mjs regionCrop); a hairline only round a
 *  region with no measured element */
const Fade: React.FC<{side: string; px: number; children: React.ReactNode}> = ({side, px, children}) => {
  const dir = {l: 'to right', r: 'to left', t: 'to bottom', b: 'to top'}[side] ?? 'to left';
  const m = `linear-gradient(${dir}, transparent 0px, #000 ${px}px)`;
  return <div style={{position: 'absolute', inset: 0, maskImage: m, WebkitMaskImage: m}}>{children}</div>;
};
const Region: React.FC<{p: Prim}> = ({p}) => {
  const url = useScreenUrl(p.src);
  const [cx, cy, cw, ch] = p.crop as [number, number, number, number];
  const z = p.z as number;
  const corners = p.corners as number[] | undefined;
  const radius = corners ? corners.map((c) => `${c.toFixed(1)}px`).join(' ') : p.r;
  let inner: React.ReactNode = (
    <div style={{position: 'absolute', inset: 0, borderRadius: radius, overflow: 'hidden', background: '#FFFFFF'}}>
      {url ? <Img src={url} style={{position: 'absolute', left: -cx * z, top: -cy * z, width: CAPTURE.w * z, height: CAPTURE.h * z, maxWidth: 'none'}} /> : null}
      {p.hairline === false ? null : <div style={{position: 'absolute', inset: 0, borderRadius: radius, boxShadow: 'inset 0 0 0 3px #E2E2E2'}} />}
    </div>
  );
  const fade = (p.fade ?? {}) as Record<string, boolean>;
  for (const side of ['l', 'r', 't', 'b']) if (fade[side]) inner = <Fade side={side} px={56}>{inner}</Fade>;
  return <div style={{position: 'absolute', left: p.x, top: p.y, width: cw * z, height: ch * z, filter: 'grayscale(1) contrast(1.1)'}}>{inner}</div>;
};

/** the flat whole phone the loupe's region comes from, with the region's outline on it (concentric with it) */
const FlatPhone: React.FC<{p: Prim}> = ({p}) => {
  const url = useScreenUrl(p.src);
  const o = p.outline;
  return (
    <>
      <div style={{position: 'absolute', left: p.x, top: p.y, width: p.w, height: p.h, borderRadius: p.r, background: '#0E0E0E', boxShadow: '0 14px 30px rgba(0,0,0,0.22), inset 0 0 0 2px #3A3A3A', filter: 'grayscale(1) contrast(1.05)'}}>
        <div style={{position: 'absolute', left: p.bezel, top: p.bezel, width: p.w - 2 * p.bezel, height: p.h - 2 * p.bezel, borderRadius: p.r - p.bezel, overflow: 'hidden', background: '#000'}}>
          {url ? <Img src={url} style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}} /> : null}
        </div>
      </div>
      <div style={{position: 'absolute', left: o.x, top: o.y, width: o.w, height: o.h, borderRadius: o.r, boxShadow: `0 0 0 ${o.stroke}px #0B0B0B`, background: 'transparent'}} />
    </>
  );
};

/** the polaroid: a white instant-photo card, tilted, the photo in grey, the tag in its foot with a hand mark */
const Polaroid: React.FC<{p: Prim}> = ({p}) => {
  const info = p.info as {w: number; h: number; lum?: number};
  const r = placePhoto({x: 0, y: 0, w: p.winW, h: p.winH}, info, p.zoom, p.u, p.v);
  const lum = typeof info.lum === 'number' ? info.lum : 0.45;
  const lift = Math.min(1.14, Math.max(0.94, 1 + (0.45 - lum) * 0.5));
  const tag = p.tag as null | {text: string; px: number; x: number; y: number; w: number; mark: CoverMark; pad?: [number, number]; rot?: number};
  return (
    <div
      style={{
        position: 'absolute',
        left: p.x,
        top: p.y,
        width: p.w,
        height: p.h,
        background: 'linear-gradient(180deg, #FCFCFC 0%, #F1F1F1 100%)',
        borderRadius: 5,
        transform: `rotate(${Number(p.tilt).toFixed(2)}deg)`,
        boxShadow: '0 22px 46px rgba(0,0,0,0.22), 0 3px 9px rgba(0,0,0,0.16)',
      }}
    >
      <div style={{position: 'absolute', left: p.side, top: p.side, width: p.winW, height: p.winH, overflow: 'hidden', background: '#1C1C1C'}}>
        <Img src={photoFile(p.photo)} style={{position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h, maxWidth: 'none', filter: `grayscale(1) contrast(1.08) brightness(${lift.toFixed(3)})`}} />
        <div style={{position: 'absolute', inset: 0, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.14), inset 0 2px 8px rgba(0,0,0,0.22)'}} />
      </div>
      {tag ? (
        <>
          <div style={{position: 'absolute', left: tag.x, top: tag.y, fontFamily: F.sans, fontWeight: 700, fontSize: tag.px, lineHeight: 1, color: '#0B0B0B', whiteSpace: 'nowrap'}}>{tag.text}</div>
          <Marks
            marks={[{kind: tag.mark, box: {x: tag.x, y: tag.y + 0.15 * tag.px, w: tag.w, h: 0.69 * tag.px}, seed: p.seed, pad: tag.mark === 'circle' ? (tag.pad ?? [30, 22]) : undefined, rot: tag.rot}]}
            w={p.w}
            h={p.h}
            width={10}
          />
        </>
      ) : null}
    </div>
  );
};

/** a speaker's round photo, in grey */
const Avatar: React.FC<{p: Prim}> = ({p}) => {
  const info = (p.info ?? {w: p.d, h: p.d}) as {w: number; h: number};
  const r = placePhoto({x: 0, y: 0, w: p.d, h: p.d}, info, 1, 0.5, 0.4);
  return (
    <div style={{position: 'absolute', left: p.cx - p.d / 2, top: p.cy - p.d / 2, width: p.d, height: p.d, borderRadius: p.d, overflow: 'hidden', background: '#1C1C1C'}}>
      <Img src={photoFile(p.photo)} style={{position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h, maxWidth: 'none', filter: 'grayscale(1) contrast(1.05)'}} />
    </div>
  );
};

export const Draw: React.FC<{draw: Prim[]; stage: {top: number; bottom: number; left: number; right: number}}> = ({draw, stage}) => (
  <>
    {draw.map((p, i) => {
      switch (p.t) {
        case 'text':
          return <Text key={i} p={p} />;
        case 'card':
        case 'rect':
          return <Card key={i} p={p} />;
        case 'bubble':
          return <Bubble key={i} p={p} />;
        case 'disc':
          return <div key={i} style={{position: 'absolute', left: p.cx - p.d / 2, top: p.cy - p.d / 2, width: p.d, height: p.d, borderRadius: p.d, background: p.fill}} />;
        case 'ring':
          return <div key={i} style={{position: 'absolute', left: p.cx - p.d / 2, top: p.cy - p.d / 2, width: p.d, height: p.d, borderRadius: p.d, background: p.fill, boxShadow: `inset 0 0 0 ${p.stroke}px ${p.color}`}} />;
        case 'sym':
          return <Sym key={i} name={p.name} size={p.size} color={p.color} x={p.cx} y={p.cy} />;
        case 'mark':
          return <Mark key={i} p={p} />;
        case 'line':
          return <Line key={i} p={p} />;
        case 'region':
          return <Region key={i} p={p} />;
        case 'flatphone':
          return <FlatPhone key={i} p={p} />;
        case 'phone3d':
          return <Phone3D key={i} p={p} />;
        case 'carplay':
          return <CarPlayTilt key={i} src={p.src} stage={stage} />;
        case 'polaroid':
          return <Polaroid key={i} p={p} />;
        case 'avatar':
          return <Avatar key={i} p={p} />;
        case 'brandmark':
          return (
            <div key={i} style={{position: 'absolute', left: p.cx - p.h, top: p.cy - p.h / 2, width: 2 * p.h, height: p.h, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <BrandMark kind="mark" height={p.h} style={{filter: 'brightness(0) invert(1)'}} />
            </div>
          );
        default:
          return null;
      }
    })}
  </>
);
