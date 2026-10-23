// v121-empty-record's own visual. One used-car lot in Tbilisi by day, one hero car (a coupe-SUV in the film's accent): the
// seller pats it and swears it is clean, its paint shines; then the record's three answers fill a white card (what was
// damaged, which document, when), five VIN plates show two with no page at all, and last a scan line crosses the same
// shining car and leaves behind it a crease and dull paint nobody wrote down: an empty page proves nothing.
//   shot   lot | shine | record | five | xray (each once in the film)
//   hitAt  the key moment (a chunk or "1.2s"): the pat, the last glint, the third row, the empty plates, the crease
//   cast   the seller (a cast object, the same person as the film's Person scenes)
//   line   an optional punch ("*word*") on the hit
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, L, rgba} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import {OBJ} from '../../lib/layer';
import type {SceneCtx} from '../../types';
import {Figure, type Cast} from '../illo/figure';
import {Car} from '../illo/car';
import {Backdrop} from '../illo/backdrop';
import {acc, accRamp} from '../illo/palette';
import {FOOT, IlloBand, Svg} from '../illo/scene';
import {Glint, IlloDefs, Shadow} from '../illo/solid';
import {INK, WHITE} from '../kit/stage';

type P = {
  look?: 'illustrated' | 'diagram';
  shot?: 'lot' | 'shine' | 'record' | 'five' | 'xray';
  hitAt?: number | string;
  cast?: Cast;
  line?: string;
};

const GROUND = 1300;
const n1 = (v: number) => +v.toFixed(1);

/** The lot: the city behind, the asphalt to the frame's foot, a string of little flags over the cars. */
const Lot: React.FC<{uid: string; frame: number; base: number; seed?: number; veil?: number}> = ({uid, frame, base, seed = 121, veil = 0}) => {
  const flags: React.ReactNode[] = [];
  const cols = [acc('a'), WHITE, acc('b'), C.il4];
  for (let i = 0; i < 18; i++) {
    const x = -40 + i * 68;
    const t = (x + 40) / 1200;
    const y = 470 + 70 * 4 * t * (1 - t);
    const sw = 6 * Math.sin(frame / 11 + i * 0.9);
    flags.push(<path key={i} d={`M${n1(x)} ${n1(y)} L${n1(x + 50)} ${n1(y + 2)} L${n1(x + 25 + sw)} ${n1(y + 58)} Z`} fill={cols[i % 4]} opacity={0.92} />);
  }
  return (
    <>
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind="city" uid={uid} frame={frame} time="day" base={base} drift={0.2} seed={seed} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <rect x={-200} y={base} width={1480} height={FOOT - base} fill={C.il2} />
          <rect x={-200} y={base} width={1480} height={10} fill={C.il3} />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={-120 + i * 330} y={base + 120} width={180} height={10} rx={5} fill={WHITE} opacity={0.6} />
          ))}
          {veil > 0 ? <rect x={-200} y={-200} width={1480} height={2400} fill={INK} opacity={veil} /> : null}
          {veil > 0 ? null : <path d={`M-40 470 Q540 610 1120 470`} stroke={C.il5} strokeWidth={4} fill="none" />}
          {veil > 0 ? null : flags}
        </Svg>
      </CameraLayer>
    </>
  );
};

/** A small round icon for a record row: a crack (what), a page (which document), a calendar (when). */
const RowIcon: React.FC<{kind: number; x: number; y: number}> = ({kind, x, y}) => (
  <g transform={`translate(${x} ${y})`}>
    <circle cx={0} cy={0} r={44} fill={kind === 0 ? accRamp(acc('a'), 3) : C.il1} />
    {kind === 0 ? <path d="M-18 -20 L-4 -4 L-14 4 L6 22 M-4 -4 L14 -14" stroke={WHITE} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
    {kind === 1 ? (
      <g>
        <path d="M-16 -22 H8 L18 -12 V22 H-16 Z" fill="none" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
        <path d="M-8 -2 H10 M-8 9 H6" stroke={INK} strokeWidth={4} strokeLinecap="round" />
      </g>
    ) : null}
    {kind === 2 ? (
      <g>
        <rect x={-20} y={-16} width={40} height={36} rx={6} fill="none" stroke={INK} strokeWidth={5} />
        <path d="M-20 -4 H20 M-10 -24 V-12 M10 -24 V-12" stroke={INK} strokeWidth={5} strokeLinecap="round" />
      </g>
    ) : null}
  </g>
);

export const V121EmptyRecord: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const raw = useId();
  const uid = raw.replace(/:/g, '');
  const f = useCurrentFrame();
  const shot = p.shot ?? 'lot';
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 10, cueFrame(ctx, p.hitAt ?? 1));
  const kick = useKick();
  const seller: Cast = p.cast ?? 'seller';

  const punch = p.line ? (
    <Hud>
      <div style={{position: 'absolute', left: L.camSafe.left, top: 400, whiteSpace: 'nowrap'}}>
        <Words text={p.line} at={hit} fx="slam" size={110} color={INK} />
      </div>
    </Hud>
  ) : null;

  if (shot === 'lot') {
    // the seller beside the car, offering it; on the hit he pats the roof and the paint flashes
    const acts = [
      {at: Math.min(0, e), face: 'smile' as const, pose: 'offer' as const, turn: 0.8},
      {at: hit - 3, face: 'grin' as const, pose: 'thumbsUp' as const, turn: 0.6},
    ];
    const pat = prog(f, hit - 2, 3) * (1 - prog(f, hit + 2, 8));
    return (
      <IlloBand uid={uid} time="day">
        <Lot uid={uid} frame={f} base={GROUND} />
        <CameraLayer depth={1}>
          <Svg>
            <Shadow uid={uid} cx={660} cy={GROUND + 2} rx={330} ry={20} />
            <Car uid={uid} x={660} y={GROUND} len={600} body="suv" paint="a" caliper="b" dir={-1} frame={f} time="day" bob={2 * pat} />
            <Glint x={600} y={GROUND - 190} size={60} at={hit} frame={f} dur={14} color={WHITE} />
            <Glint x={790} y={GROUND - 120} size={40} at={hit + 4} frame={f} dur={12} color={WHITE} />
            <Shadow uid={uid} cx={230} cy={GROUND + 2} rx={100} />
            <Figure uid={uid} cast={seller} x={230} y={GROUND} size={610} frame={f} time="day" acts={acts} />
          </Svg>
        </CameraLayer>
        {punch}
        <Sfx name="asmr-knock" at={Math.max(base, hit)} volume={0.34} />
        <Haptic kind="light" at={Math.max(base, hit)} />
      </IlloBand>
    );
  }

  if (shot === 'shine' || shot === 'xray') {
    // the same car alone, close and low: glints run along its paint (shine), or a scan line crosses it and leaves a
    // crease and dull paint behind (xray)
    const g = 1250;
    const xray = shot === 'xray';
    const from = Math.max(e, base);
    const sweep = xray ? prog(f, from + 2, Math.max(10, hit - from - 2), ease.camera) : 0;
    const bx = -20 + 1120 * sweep;
    const glints = [0, 1, 2, 3, 4].map((i) => Math.round(from + ((hit - from) * i) / 4));
    return (
      <IlloBand uid={uid} time="day">
        <Lot uid={uid} frame={f} base={g} seed={7} veil={xray ? 0.72 : 0} />
        <CameraLayer depth={1}>
          <Svg>
            <defs>
              <clipPath id={`${uid}k`}>
                <rect x={-200} y={0} width={n1(Math.max(0, bx + 200))} height={1920} />
              </clipPath>
            </defs>
            <Shadow uid={uid} cx={540} cy={g + 2} rx={430} ry={26} />
            <Car uid={uid} x={540} y={g} len={800} body="suv" paint="a" caliper="b" dir={-1} frame={f} time="day" />
            {xray ? (
              <g clipPath={`url(#${uid}k)`}>
                <Car uid={uid} x={540} y={g} len={800} body="suv" paint="a" caliper="b" dir={-1} frame={f} time="day" dent={prog(f, hit - 6, 10)} dirt={0.7} />
              </g>
            ) : null}
            {xray && sweep > 0 && sweep < 1 ? (
              <g>
                <rect x={n1(bx - 40)} y={g - 420} width={80} height={460} fill={WHITE} opacity={0.35} />
                <rect x={n1(bx - 4)} y={g - 440} width={8} height={500} rx={4} fill={WHITE} />
              </g>
            ) : null}
            {!xray ? glints.map((s, i) => <Glint key={i} x={260 + i * 130} y={g - 170 - (i % 2) * 70} size={44 + 10 * (i % 2)} at={s} frame={f} dur={14} color={WHITE} />) : null}
            {xray ? <circle cx={700} cy={g - 150} r={n1(70 + 30 * kick)} fill="none" stroke={WHITE} strokeWidth={6} opacity={prog(f, hit, 8)} /> : null}
          </Svg>
        </CameraLayer>
        {punch}
        {xray ? <Sfx name="asmr-air-long" at={from} volume={0.24} /> : <Sfx name="asmr-swell" at={from} volume={0.22} />}
        {xray ? <Land at={hit} /> : null}
        <Haptic kind="light" at={Math.max(base, hit)} />
      </IlloBand>
    );
  }

  if (shot === 'record') {
    // the record card in the app's look: the hero car small at its head, then one row per chunk
    const rise = spr(f, e, 'enter');
    const rows = [0, 1, 2].map((i) => Math.max(base, cueFrame(ctx, i)));
    const CW = 700;
    const CH = 760;
    const cx = 540 - CW / 2;
    const cy = 470 + 40 * (1 - rise);
    return (
      <PictureBand camera={false}>
        <CameraLayer depth={1}>
          <div className={OBJ} style={{position: 'absolute', left: cx, top: n1(cy), width: CW, height: CH, borderRadius: 48, backgroundColor: WHITE, boxShadow: '0 24px 60px rgba(0,0,0,0.14)', opacity: rise}}>
            <svg width={CW} height={CH} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
              <defs>
                <IlloDefs uid={uid} />
              </defs>
              <Car uid={uid} x={CW / 2} y={190} len={340} body="suv" paint="a" caliper="b" dir={-1} frame={f} time="day" />
              <rect x={60} y={232} width={CW - 120} height={4} rx={2} fill={'#E4E4E4'} />
              {rows.map((at, i) => {
                const k = spr(f, at, 'land');
                const y = 330 + i * 150;
                const w1 = 330 - 55 * i;
                return (
                  <g key={i} opacity={n1(0.15 + 0.85 * k)} transform={`translate(${n1(30 * (1 - k))} 0)`}>
                    <RowIcon kind={i} x={110} y={y} />
                    <rect x={190} y={y - 26} width={n1(w1 * k)} height={22} rx={11} fill={INK} />
                    <rect x={190} y={y + 12} width={n1((w1 - 90) * k)} height={16} rx={8} fill={'#BDBDBD'} />
                  </g>
                );
              })}
            </svg>
          </div>
        </CameraLayer>
        {punch}
        {rows.map((at, i) => <Sfx key={i} name="asmr-knock" at={at} volume={0.26} />)}
        <Haptic kind="light" at={rows[2]} />
      </PictureBand>
    );
  }

  // five VIN plates: three with a page (rows of ink), two with nothing (a dashed empty box); on the hit the empty ones
  // darken their outline and nudge, and the punch lands
  const rows = [0, 1, 2, 3, 4];
  const empty = [1, 4];
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {rows.map((i) => {
            const at = Math.max(base, e) + i * 4;
            const k = spr(f, at, 'enter');
            const y = 560 + i * 128;
            const none = empty.indexOf(i) >= 0;
            const hot = none ? prog(f, hit, 6) : 0;
            const nudge = none ? 10 * Math.sin((f - hit) / 1.6) * (prog(f, hit, 2) - prog(f, hit + 8, 6)) : 0;
            const chars: React.ReactNode[] = [];
            for (let j = 0; j < 17; j++) chars.push(<rect key={j} x={190 + j * 19} y={y + 36} width={12} height={34} rx={3} fill={j % 4 === 0 ? C.ink : C.ink2} />);
            return (
              <g key={i} opacity={n1(k)} transform={`translate(${n1(40 * (1 - k) + nudge)} 0)`}>
                <rect x={150} y={y} width={780} height={106} rx={26} fill={WHITE} stroke={none ? rgba(C.ink, 0.25 + 0.75 * hot) : C.rule} strokeWidth={none ? 4 + 3 * hot : 3} />
                {chars}
                {none ? (
                  <rect x={560} y={y + 26} width={330} height={54} rx={14} fill="none" stroke={rgba(C.ink, 0.35 + 0.65 * hot)} strokeWidth={4} strokeDasharray="14 10" />
                ) : (
                  <g>
                    <rect x={560} y={y + 28} width={260} height={18} rx={9} fill={INK} />
                    <rect x={560} y={y + 58} width={190} height={14} rx={7} fill={'#BDBDBD'} />
                    <circle cx={870} cy={y + 53} r={16} fill={accRamp(acc('a'), 3)} />
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </CameraLayer>
      <Hud>
        <div style={{position: 'absolute', left: L.camSafe.left, top: 400, whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? '*2 / 5*'} at={hit} fx="slam" size={120} color={INK} />
        </div>
      </Hud>
      {rows.map((i) => (i % 2 === 0 ? <Sfx key={i} name="asmr-tick-fine" at={Math.max(base, e) + i * 4} volume={0.2} /> : null))}
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};
