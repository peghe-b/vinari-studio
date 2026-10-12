// src/scenes/film/V96MomTap.tsx: the film's own moment (v96-mom-tap): one tap and the car is on its way to mom's.
// The driver's view at dusk, the hands on the wheel, the phone standing in a holder on the dash. On its screen three
// round shortcuts (home, work, mom's); on `tapAt` the mom's one is pressed, the rows fall away and a ring counts down
// four ticks, draining in the film's accent; on `hitAt` the count ends, the screen turns into the first arrow of the
// route, the camera kicks and the road starts to stream toward us. A "look": "illustrated" picture (full bleed).
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, Sfx} from '../common';
import {C, F, L, rgba, accentsOn} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {CameraLayer, Hud} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Backdrop} from '../illo/backdrop';
import {Cabin, Road, view} from '../illo/road';
import {Handset} from '../illo/handset';
import {Icon} from '../illo/icons';
import {Rings} from '../illo/fx';
import {IlloBand, Svg, timeOf} from '../illo/scene';
import {rr, Solid} from '../illo/solid';

type P = {
  look?: 'illustrated' | 'diagram';
  tapAt?: number | string; // the mom's shortcut is pressed
  hitAt?: number | string; // the count ends, the car pulls away
  label?: string; // the shortcut's name on the screen
  line?: string; // the punch on the hit ("*word*")
  time?: 'day' | 'night' | 'dusk';
};

const PX = 772; // the phone in its holder (stage)
const PY = 905;
const PW = 290;
const HORIZON = 720;
const TICKS = 4;

export const V96MomTap: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const time = timeOf({time: p.time ?? 'dusk'});
  const e = entrance(ctx);
  const base = lead(ctx);
  const tap = Math.max(base + 4, cueFrame(ctx, p.tapAt ?? '0.4s'));
  const hit = Math.max(tap + 30, cueFrame(ctx, p.hitAt ?? 1));
  const c0 = tap + 6; // the count starts
  const tick = (hit - c0) / TICKS;
  const counting = frame >= c0 && frame < hit;
  const left = counting ? TICKS - Math.floor((frame - c0) / tick) : frame < c0 ? TICKS : 0;
  const drain = counting ? (frame - c0) / (hit - c0) : frame >= hit ? 1 : 0;
  const pressed = spr(frame, tap, 'tap');
  const rowsOut = prog(frame, c0 - 2, 10, ease.enter);
  const ringIn = spr(frame, c0, 'enter');
  const routeIn = spr(frame, hit, 'land');
  // the car: parked until the hit, then pulls away (the road's distance accelerates and settles to a cruise)
  const t = Math.max(0, frame - hit);
  const d = t <= 24 ? 0.03 * t * t : 17.3 + 1.44 * (t - 24);
  const v = view({hy: HORIZON, vx: 540, h: 1.25, fp: 900});
  const acc = accentsOn() ? C.accA : C.ink;
  const tilePos = [150, 290, 430];
  const label = p.label ?? '';
  const screen = (sw: number, sh: number) => {
    const cx = sw / 2;
    const cy = sh * 0.48;
    const R = sw * 0.34;
    const arc = 2 * Math.PI * R;
    return (
      <g>
        <rect x={0} y={0} width={sw} height={sh} fill={C.screen} />
        {/* the three shortcuts: home, work, mom's (the last one named), fall away when the count starts */}
        <g opacity={1 - rowsOut} transform={`translate(0 ${(-40 * rowsOut).toFixed(1)})`}>
          {tilePos.map((y, i) => {
            const mom = i === 2;
            const on = mom ? pressed : 0;
            const fill = on > 0.5 ? C.ink : rgba(C.ink, 0.07);
            const glyph = on > 0.5 ? C.screen : C.ink;
            return (
              <g key={i} transform={mom ? `translate(${cx} ${y + 50}) scale(${(1 - 0.05 * Math.sin(Math.PI * Math.min(1, on))).toFixed(3)}) translate(${-cx} ${-(y + 50)})` : undefined}>
                <path d={rr(18, y, sw - 36, 100, 50)} fill={fill} />
                <circle cx={68} cy={y + 50} r={32} fill={on > 0.5 ? rgba(C.screen, 0.16) : rgba(C.ink, 0.08)} />
                {i === 0 ? <Icon name="house" x={68} y={y + 50} size={40} color={glyph} /> : null}
                {i === 1 ? (
                  <g>
                    <path d={rr(50, y + 38, 36, 26, 5)} fill={glyph} />
                    <path d={rr(60, y + 30, 16, 10, 3)} fill="none" stroke={glyph} strokeWidth={3.5} />
                  </g>
                ) : null}
                {mom ? <Icon name="heart" x={68} y={y + 51} size={36} color={glyph} accent={glyph} /> : null}
                {mom && label ? (
                  <text className={TXT} x={116} y={y + 61} fontFamily={F.sans} fontWeight={600} fontSize={30} fill={glyph}>
                    {mtav(label)}
                  </text>
                ) : (
                  <g>
                    <path d={rr(116, y + 38, 70 + 30 * i, 10, 5)} fill={rgba(C.ink, 0.16)} />
                    <path d={rr(116, y + 56, 46, 8, 4)} fill={rgba(C.ink, 0.09)} />
                  </g>
                )}
              </g>
            );
          })}
        </g>
        {/* the count: a ring that drains, the digit in the middle */}
        {frame >= c0 && frame < hit + 8 ? (
          <g opacity={ringIn * (1 - prog(frame, hit, 8, ease.enter))} transform={`translate(${cx} ${cy}) scale(${(0.86 + 0.14 * ringIn).toFixed(3)})`}>
            <circle r={R} fill="none" stroke={rgba(C.ink, 0.1)} strokeWidth={12} />
            <circle r={R} fill="none" stroke={acc} strokeWidth={12} strokeLinecap="round" strokeDasharray={`${(arc * (1 - drain)).toFixed(1)} ${arc.toFixed(1)}`} transform="rotate(-90)" />
            <text className={TXT} x={0} y={36} textAnchor="middle" fontFamily={F.sans} fontWeight={600} fontSize={104} fill={C.ink}>
              {String(Math.max(1, left))}
            </text>
            {label ? (
              <text className={TXT} x={0} y={-R - 34} textAnchor="middle" fontFamily={F.sans} fontWeight={600} fontSize={28} fill={C.ink}>
                {mtav(label)}
              </text>
            ) : (
              <Icon name="heart" x={0} y={-R - 50} size={46} color={acc} accent={acc} />
            )}
          </g>
        ) : null}
        {/* the route begins: the first arrow straight on, the line in the accent */}
        {frame >= hit ? (
          <g opacity={routeIn}>
            <path d={`M${cx} ${sh * 0.92}L${cx} ${sh * 0.5}`} stroke={acc} strokeWidth={22} strokeLinecap="round" />
            <path d={`M${cx - 66} ${sh * 0.5 + 40}L${cx} ${sh * 0.5 - 30 - 20 * routeIn}L${cx + 66} ${sh * 0.5 + 40}`} fill="none" stroke={C.ink} strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" />
            <path d={rr(30, 40, sw - 60, 70, 20)} fill={C.ink} />
            <path d={rr(56, 66, 110, 18, 9)} fill={rgba(C.screen, 0.7)} />
          </g>
        ) : null}
      </g>
    );
  };
  return (
    <IlloBand uid={uid} time={time}>
      {/* far: the evening city on the horizon */}
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind="city" uid={uid} frame={frame} time={time} base={HORIZON} />
        </Svg>
      </CameraLayer>
      {/* the road ahead, still until the hit, then streaming */}
      <CameraLayer depth={1}>
        <Svg>
          <Road v={v} d={d} time={time} uid={uid} beam={0.6} />
        </Svg>
      </CameraLayer>
      {/* near: the cabin (hands on the wheel) and the phone in its holder on the dash */}
      <CameraLayer depth={1.3}>
        <Svg>
          <Cabin uid={uid} time={time} frame={frame} wheelX={400} mirror />
          <Solid uid={uid} d={rr(PX - 40, PY + PW * 1.025 - 10, 80, 70, 14)} tone={7} time={time} />
          <Solid uid={uid} d={rr(PX - PW / 2 - 14, PY + PW * 0.7, PW + 28, 46, 16)} tone={6} time={time} rim />
          <Handset uid={uid} x={PX} y={PY} w={PW} frame={frame} time={time} lit={prog(frame, e - 2, 8, ease.enter)} screen={screen} />
          <Rings frame={frame} x={PX} y={PY - (PW * 2.05) / 2 + PW * 0.026 + 480} w={PW - 50} h={90} r={45} at={tap} period={999} count={1} until={tap + 20} color={acc} width={3} />
        </Svg>
      </CameraLayer>
      <Hud>
        <div style={{position: 'absolute', left: L.camSafe.left, top: 470, whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? '*წავედით*'} at={hit} fx="slam" size={104} punchTone="neutral" />
        </div>
      </Hud>
      <Sfx name="asmr-tap" at={tap} volume={0.5} />
      <Haptic kind="light" at={tap} volume={0.3} />
      {Array.from({length: TICKS}, (_, i) => (
        <Sfx key={i} name="asmr-tick-fine" at={Math.round(c0 + i * tick)} volume={0.4} />
      ))}
      <Sfx name="asmr-air-long" at={hit} volume={0.35} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </IlloBand>
  );
};
