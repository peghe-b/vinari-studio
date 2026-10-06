// src/scenes/Money.tsx: money (illustrated, the "Graphite" kit): costs, prices, a budget, money gone. Banknotes are generic
// rounded notes with a lari circle, never a real banknote's design. A figure only from the story's bank facts.
//
// Stagings:
//   rain     banknotes fall, flip and pile up; direction "out" makes them fly up and away from an open wallet (a loss)
//   wallet   a wallet opens: empty; a moth flutters out (or one coin rolls out: `coin`)
//   tag      a price tag on a string swings in from the top and settles; its number flips from `from` to `value`
//            (no value: a "?")
//   receipt  a receipt prints out of a slot: blank lines pile up, the total row lands with `value`, the paper curls
// Props: value, from, format (gel | usd | int), direction (in | out), tone (down for a cost, up for money in), cast (a
//   figure under the rain), coin (wallet), at, time, word, camera, seed.
// Frame 0: notes already falling / the tag mid-swing. Sounds: asmr-paper and asmr-flap for notes and flips, cc0-chip for
//   a coin, TypeSfx under printing, <Land> for the total or the value.
import React, {useId} from 'react';
import {interpolate, spring, useCurrentFrame} from 'remotion';
import {fmt, mtav, type NumFormat} from '../lib/format';
import {TXT} from '../lib/layer';
import {textWidth} from '../lib/measure';
import {C, F, SPRING, toneBig, type Tone} from '../tokens';
import type {SceneCtx} from '../types';
import {entrance, Haptic, Land, lead, Sfx, TypeSfx, vary} from './common';
import {Backdrop} from './illo/backdrop';
import {Camera, Hud, Plane, type CamSpec} from './illo/cam';
import {Figure, type Cast} from './illo/figure';
import {Dust, LARI, Notes} from './illo/fx';
import {dark, tone, type Time} from './illo/palette';
import {circ, paint, rr, Shadow, Solid} from './illo/solid';
import {at, clamp01, IlloBand, n1, osc, seedOf, stagingOf, Svg, timeOf} from './illo/scene';
import {Punch, wordOf} from './illo/type';

const STAGINGS = ['rain', 'wallet', 'tag', 'receipt'] as const;
type P = {
  staging?: (typeof STAGINGS)[number];
  value?: number;
  from?: number;
  format?: NumFormat;
  direction?: 'in' | 'out';
  tone?: Tone;
  cast?: Cast;
  coin?: boolean;
  at?: number | string;
  time?: Time;
  word?: unknown;
  camera?: CamSpec;
  seed?: number;
};

/** One banknote lying flat (a pile's note), drawn like the falling ones. */
const note = (x: number, y: number, w: number, rot: number, uid: string, k: number) => {
  const h = w * 0.5;
  return (
    <g key={k} transform={`translate(${n1(x)} ${n1(y)}) rotate(${n1(rot)}) scale(1 0.42)`}>
      <path d={rr(-w / 2, -h / 2, w, h, h * 0.16)} fill={paint(uid, 'soft-2')} stroke={C.il3} strokeWidth={3} />
      <circle cx={-w * 0.22} cy={0} r={h * 0.27} fill={C.il1} stroke={C.il3} strokeWidth={2} />
    </g>
  );
};

export const Money: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const f = useCurrentFrame();
  const uid = useId();
  const staging = stagingOf(p, STAGINGS);
  const time = timeOf(p);
  const e = entrance(ctx);
  const base = lead(ctx);
  const seed = seedOf(p as Record<string, unknown>);
  const out = p.direction === 'out';
  const tn: Tone = p.tone ?? (staging === 'rain' && !out ? 'up' : 'down');
  const acc = toneBig(tn);
  const fAt = at(ctx, p.at, e + 20);
  const word = wordOf(p.word, ctx, 1);
  const dk = dark(time);
  const format = p.format ?? 'gel';
  const cues: React.ReactNode[] = [];
  let pic: React.ReactNode = null;
  let cam: CamSpec = {move: 'push', amount: 0.035};
  let kicks: number[] = [];

  if (staging === 'rain') {
    cam = {move: 'sink', travel: 30};
    if (out) {
      const k = spring({frame: f - e, fps: 30, config: SPRING.enterXL});
      const wy = 1150 + 80 * (1 - k);
      pic = (
        <Plane depth={1}>
          <Svg>
            <Shadow uid={uid} cx={540} cy={wy + 120} rx={260} />
            <Wallet uid={uid} x={540} y={wy} open={1} time={time} />
            <Notes frame={f} seed={seed} n={20} at={Math.min(fAt, e + 4)} from={{x: 540, y: wy - 60}} direction="out" size={150} uid={uid} />
          </Svg>
        </Plane>
      );
    } else {
      // the pile grows: a note settles every 5 frames
      const landed = Math.max(0, Math.min(26, Math.floor((f - e) / 5) + 6));
      const pile: React.ReactNode[] = [];
      for (let i = 0; i < landed; i++) {
        const r = (j: number) => Math.sin(seed * 13 + i * 7.7 + j * 3.1) * 0.5 + 0.5;
        const row = Math.floor(i / 6);
        pile.push(note(540 + (r(1) - 0.5) * (520 - row * 70), 1330 - row * 26 - r(2) * 16, 170, (r(3) - 0.5) * 50, uid, i));
      }
      pic = (
        <>
          <Plane depth={0.6}>
            <Svg>
              <Backdrop kind="city" uid={uid} frame={f} time={time} opacity={0.6} />
            </Svg>
          </Plane>
          <Plane depth={1}>
            <Svg>
              {pile}
              {p.cast ? <Figure uid={uid} cast={p.cast} x={540} y={1300} size={720} frame={f} acts={[{at: -100, pose: 'armsUp', face: 'laugh'}]} time={time} /> : null}
              <Notes frame={f} seed={seed} n={18} at={e - 60} size={150} uid={uid} />
            </Svg>
          </Plane>
          <Plane depth={1.3}>
            <Svg>
              <Notes frame={f} seed={seed + 5} n={5} at={e - 90} size={240} uid={uid} box={{x: 0, y: 370, w: 1080, h: 1010}} />
            </Svg>
          </Plane>
        </>
      );
    }
    for (let i = 0; i * 26 < ctx.dur; i++) if (i * 26 + 4 >= Math.max(0, base)) cues.push(<Sfx key={`p${i}`} name="asmr-paper" at={i * 26 + 4} volume={0.16 * vary(i, 0.3)} />);
  } else if (staging === 'wallet') {
    const openK = spring({frame: f - fAt, fps: 30, config: SPRING.enterXL});
    const k = spring({frame: f - e, fps: 30, config: SPRING.enter});
    kicks = [fAt];
    const wy = 980 + 60 * (1 - k);
    const mt = f - fAt - 8;
    // the moth: out of the wallet, a wobbly climb, wings beating fast
    const moth =
      !p.coin && mt > 0 ? (
        <g transform={`translate(${n1(540 + 120 * Math.sin(mt / 11) + mt * 2)} ${n1(wy - 80 - mt * 6)}) rotate(${n1(10 * Math.sin(mt / 5))})`}>
          {[-1, 1].map((s) => (
            <path key={s} d={`M0 0C${s * 30} -40 ${s * 70} -30 ${s * 66} 6C${s * 60} 30 ${s * 20} 24 0 8Z`} transform={`scale(1 ${(0.35 + 0.65 * Math.abs(Math.sin(mt * 0.9))).toFixed(3)})`} fill={dk ? C.il3 : C.il4} />
          ))}
          <ellipse rx={7} ry={20} fill={dk ? C.il2 : C.il5} />
        </g>
      ) : null;
    const coinT = f - fAt - 10;
    const coin =
      p.coin && coinT > 0 ? (
        <g transform={`translate(${n1(540 + coinT * 9)} ${n1(Math.min(1250, wy + 40 + 0.9 * coinT * coinT))}) rotate(${n1(coinT * 14)})`}>
          <Solid uid={uid} d={circ(0, 0, 44)} tone={2} shade="ball" time={time} rim outline />
          <path d={LARI} transform="scale(2.6)" fill="none" stroke={C.il4} strokeWidth={1.4} strokeLinecap="round" />
        </g>
      ) : null;
    pic = (
      <>
        <Plane depth={0.6}>
          <Svg>
            <Backdrop kind="room" uid={uid} frame={f} time={time} opacity={0.5} />
          </Svg>
        </Plane>
        <Plane depth={1}>
          <Svg>
            <Shadow uid={uid} cx={540} cy={wy + 170} rx={300} />
            <Wallet uid={uid} x={540} y={wy} open={openK} time={time} />
            {openK > 0.5 ? <Dust frame={f} seed={seed} n={18} cone={{x: 540, top: wy - 260, bottom: wy, w0: 120, w1: 380}} time={time} /> : null}
            {moth}
            {coin}
          </Svg>
        </Plane>
      </>
    );
    if (fAt >= Math.max(0, base) && fAt < ctx.dur) cues.push(<Sfx key="w" name="cc0-leather" at={fAt} volume={0.4} />, <Haptic key="wh" kind="soft" at={fAt} />);
    if (p.coin && fAt + 10 < ctx.dur && fAt + 10 >= 0) cues.push(<Sfx key="c" name="cc0-chip" at={fAt + 24} volume={0.4} />);
  } else if (staging === 'tag') {
    const t = f - (e - 4);
    const theta = 18 * Math.exp(-t / 25) * Math.cos(t / 7) + 1.2 * osc(f, 70);
    const drop = spring({frame: f - (e - 6), fps: 30, config: SPRING.enterXL});
    const from = p.from;
    const val = p.value;
    const shown = val === undefined ? '?' : fmt(val, format);
    const flipAt = fAt;
    // split-flap: the number flips through a few values to the target
    const flips = 6;
    const fi = Math.max(0, Math.min(flips, Math.floor((f - flipAt) / 3) + 1));
    const cur = f < flipAt ? (from !== undefined ? fmt(from, format) : '') : fi >= flips || val === undefined ? shown : fmt(Math.round((from ?? 0) + ((val - (from ?? 0)) * fi) / flips), format);
    const landAt = flipAt + flips * 3;
    kicks = [landAt];
    const px = 540;
    const py = 380;
    const tagW = 640;
    const tagH = 420;
    const ty = 620 - 200 * (1 - drop);
    const font = `700 160px ${F.sans}`;
    const size = Math.min(160, (160 * (tagW - 120)) / Math.max(1, textWidth(cur || ' ', font)));
    const fp = (f - flipAt) % 3;
    const sq = f >= flipAt && f < landAt ? (fp === 0 ? 0.55 : fp === 1 ? 0.85 : 1) : 1;
    pic = (
      <>
        <Plane depth={0.6}>
          <Svg>
            <Backdrop kind="station" uid={uid} frame={f} time={time} opacity={0.55} />
          </Svg>
        </Plane>
        <Plane depth={1}>
          <Svg>
            <g transform={`rotate(${n1(theta)} ${px} ${py})`}>
              <path d={`M${px} ${py - 40}L${px} ${ty - tagH / 2 + 50}`} stroke={dk ? C.il2 : C.il5} strokeWidth={5} />
              <g transform={`translate(${px} ${ty})`}>
                <Solid uid={uid} d={`M${-tagW / 2 + 60} ${-tagH / 2}H${tagW / 2 - 30}Q${tagW / 2} ${-tagH / 2} ${tagW / 2} ${-tagH / 2 + 30}V${tagH / 2 - 30}Q${tagW / 2} ${tagH / 2} ${tagW / 2 - 30} ${tagH / 2}H${-tagW / 2 + 60}L${-tagW / 2} ${0}Z`} tone={dk ? 1 : 0} time={time} rim outline />
                <circle cx={-tagW / 2 + 70} cy={0} r={24} fill={dark(time) ? '#000000' : C.bg} />
                <circle cx={-tagW / 2 + 70} cy={0} r={24} fill="none" stroke={dk ? C.il3 : C.il4} strokeWidth={4} />
                <g transform={`scale(1 ${sq})`}>
                  <text className={TXT} x={40} y={size * 0.36} textAnchor="middle" fontFamily={F.sans} fontWeight={700} fontSize={size} fill={f >= landAt ? acc : dk ? C.il7 : C.ilFeature}>
                    {mtav(cur)}
                  </text>
                </g>
              </g>
              <path d={`M${px - 260} ${py - 40}H${px + 260}`} stroke={dk ? C.il5 : C.il4} strokeWidth={14} strokeLinecap="round" />
            </g>
          </Svg>
        </Plane>
      </>
    );
    for (let i = 0; i < flips; i++) {
      const fr = flipAt + i * 3;
      if (fr >= Math.max(0, base) && fr < ctx.dur) cues.push(<Sfx key={`f${i}`} name="asmr-flap" at={fr} volume={0.3 * vary(i, 0.2)} />);
    }
    if (landAt >= 0 && landAt < ctx.dur) cues.push(<Land key="land" at={landAt} />);
  } else {
    // receipt: the printer at the top, the paper running down, blank lines, the total landing
    const printFrom = e - 10;
    const lenNow = interpolate(f, [printFrom, fAt], [80, 860], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) + Math.max(0, f - fAt) * 0.6;
    kicks = [fAt];
    const tot = p.value;
    const totalK = spring({frame: f - fAt, fps: 30, config: SPRING.land});
    const x0 = 290;
    const w = 500;
    const top = 470;
    const lines: React.ReactNode[] = [];
    const nLines = 11;
    for (let i = 0; i < nLines; i++) {
      const y = top + lenNow - 120 - i * 62;
      if (y < top + 30) continue;
      const r = Math.sin(seed * 7 + i * 3.3) * 0.5 + 0.5;
      lines.push(<path key={i} d={rr(x0 + 40, y, 160 + 140 * r, 18, 9) + rr(x0 + w - 150, y, 110, 18, 9)} fill={dk ? C.il3 : C.il2} />);
    }
    const curl = 22 + 8 * osc(f, 40);
    const yEnd = top + lenNow;
    const shown = tot === undefined ? '' : fmt(tot, format);
    pic = (
      <>
        <Plane depth={0.6}>
          <Svg>
            <Backdrop kind="station" uid={uid} frame={f} time={time} opacity={0.5} />
          </Svg>
        </Plane>
        <Plane depth={1}>
          <Svg>
            <path d={`M${x0} ${top}H${x0 + w}V${yEnd - curl}Q${x0 + w / 2} ${yEnd + curl} ${x0} ${yEnd - curl}Z`} fill={dk ? C.il1 : C.il0} />
            <path d={`M${x0} ${yEnd - curl}Q${x0 + w / 2} ${yEnd + curl} ${x0 + w} ${yEnd - curl}Q${x0 + w / 2} ${yEnd + curl * 2.2} ${x0} ${yEnd - curl}Z`} fill={dk ? C.il3 : C.il2} />
            <path d={`M${x0 + w - 40} ${top}V${yEnd}`} stroke={C.il4} strokeWidth={1.5} opacity={0.3} />
            {lines}
            {f >= fAt && shown ? (
              <g transform={`translate(${x0 + w / 2} ${yEnd - 80}) scale(${(0.7 + 0.3 * totalK).toFixed(3)})`} opacity={clamp01(totalK * 3)}>
                <path d={rr(-w / 2 + 30, -70, w - 60, 4, 2)} fill={dk ? C.il4 : C.il3} />
                <text className={TXT} x={0} y={30} textAnchor="middle" fontFamily={F.sans} fontWeight={700} fontSize={96} fill={acc}>
                  {shown}
                </text>
              </g>
            ) : null}
            {/* the terminal it prints from */}
            <Solid uid={uid} d={rr(220, 330, 640, 170, 40)} tone={6} time={time} rim outline />
            <path d={rr(270, 460, 540, 18, 9)} fill="#000000" />
            <circle cx={800} cy={390} r={12} fill={f >= fAt ? toneBig('up') : tone(4)} />
          </Svg>
        </Plane>
      </>
    );
    if (Math.max(0, base) < fAt) cues.push(<TypeSfx key="t" text={'x'.repeat(30)} at={Math.max(0, base)} cpf={1} volume={0.2} rolls={2} />);
    if (fAt >= 0 && fAt < ctx.dur) cues.push(<Land key="land" at={fAt} />);
  }
  return (
    <IlloBand uid={uid} time={time}>
      <Camera ctx={ctx} spec={cam} over={p.camera} kicks={kicks}>
        {pic}
        <Hud>
          <Punch word={word} slot={staging === 'tag' ? 'low' : 'top'} />
        </Hud>
      </Camera>
      {cues}
    </IlloBand>
  );
};

/** A bi-fold wallet seen from the front, `open` 0 closed .. 1 open (the flap folds down, the empty inside shows). */
const Wallet: React.FC<{uid: string; x: number; y: number; open: number; time: Time}> = ({uid, x, y, open, time}) => {
  const dk = dark(time);
  const W = 520;
  const H = 340;
  const o = clamp01(open);
  return (
    <g transform={`translate(${x} ${y})`}>
      {/* the back half and the empty inside: card slots, a dark mouth */}
      <Solid uid={uid} d={rr(-W / 2, -H / 2, W, H, 40)} tone={6} time={time} rim outline />
      <path d={rr(-W / 2 + 26, -H / 2 + 24, W - 52, H * 0.42, 22)} fill="#000000" opacity={o * (dk ? 0.9 : 0.6)} />
      {[0, 1, 2].map((i) => (
        <path key={i} d={rr(-W / 2 + 40, -H / 2 + 90 + i * 46, W - 80, 40, 10)} fill={tone(5)} opacity={o} />
      ))}
      <path d={rr(-W / 2 + 14, -H / 2 + 14, W - 28, H - 28, 30)} fill="none" stroke={tone(4)} strokeWidth={3} strokeDasharray="10 8" />
      {/* the flap: folds down out of the way */}
      <g transform={`translate(0 ${-H / 2}) scale(1 ${(1 - 2 * o).toFixed(3)}) translate(0 ${H / 2})`}>
        <Solid uid={uid} d={rr(-W / 2, -H / 2, W, H * 0.62, 40)} tone={o > 0.5 ? 6 : 5} time={time} rim outline />
        <path d={rr(-60, H * 0.12 - 40, 120, 50, 22)} fill={tone(3)} />
      </g>
    </g>
  );
};
