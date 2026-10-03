// v67-three-drivers: a drivers' group chat. Three friends post their car troubles one by one (a blocked way out,
// a missed mechanic, a noise they cannot put into words, sent as a voice note); typing dots come first, every
// message lands on its chunk, the thread scrolls up as it grows.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead, PictureBand, Sfx} from '../common';
import {C, F, L, rgba, toneBig, toneText, type Tone} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';

type Msg = {name: string; text: string; icon?: 'cars' | 'clock' | 'wave'; at?: number | string};
type P = {title?: string; messages?: Msg[]; tone?: Tone};

const X0 = 150; // the thread's left edge (avatars)
const BX = 240; // bubbles start here
const BMAX = 680; // widest bubble
const ROW = 200; // one message, stage units (before the chat's 1.2 scale)
const TOP = 545; // the first message's top
// a voice note's bars (fixed heights, a knock in the middle)
const BARS = [6, 10, 8, 14, 9, 22, 40, 18, 11, 8, 30, 46, 20, 9, 7, 12, 26, 14, 8, 6, 10, 7];

const Icon: React.FC<{kind: string; color: string}> = ({kind, color}) => {
  if (kind === 'cars') {
    // two cars nose to tail, the front one boxed in
    return (
      <svg width={84} height={44} viewBox="0 0 84 44">
        <g fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M 4 30 L 6 20 L 14 14 L 30 14 L 36 20 L 38 30 Z" />
          <path d="M 46 30 L 48 20 L 56 14 L 72 14 L 78 20 L 80 30 Z" />
          <circle cx={13} cy={32} r={4} /><circle cx={30} cy={32} r={4} />
          <circle cx={55} cy={32} r={4} /><circle cx={72} cy={32} r={4} />
          <path d="M 40 8 L 44 4 M 40 4 L 44 8" />
        </g>
      </svg>
    );
  }
  if (kind === 'clock') {
    return (
      <svg width={44} height={44} viewBox="0 0 44 44">
        <g fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx={22} cy={22} r={17} />
          <path d="M 22 12 L 22 22 L 29 26" />
        </g>
      </svg>
    );
  }
  return null;
};

/** A group chat of three drivers: each trouble lands as a message on its chunk. */
export const V67ThreeDrivers: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const msgs = p.messages ?? [];
  const tone = p.tone ?? 'down';
  const hd = spr(frame, e, 'enter');

  // when each message lands (its chunk), and the typing dots 9 frames before
  const lands: number[] = [];
  for (let i = 0; i < msgs.length; i++) {
    const at = msgs[+i].at ?? i;
    const f = cueFrame(ctx, at);
    // the first message is already there on the first frame (the hook reads muted)
    lands.push(i === 0 ? Math.min(f, e) : Math.max(base + 8, f));
  }
  let shown = 0;
  let last = 0;
  for (let i = 0; i < lands.length; i++) {
    if (frame >= lands[+i] - 9) shown = i + 1;
    last = lands[+i];
  }
  // the thread scrolls up once the last message comes in
  const scroll = lerp(0, -30, prog(frame, last, 22, ease.camera));
  const push = lerp(1, 1.04, prog(frame, e, ctx.dur, ease.camera));

  const title = mtav(p.title ?? 'მძღოლები');
  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: `540px ${L.contentMid}px`}}>
       <div style={{position: 'absolute', inset: 0, transform: 'scale(1.2)', transformOrigin: '120px 400px'}}>
        {/* the chat's header: three small rings (the members) and the group's name */}
        <div style={{position: 'absolute', left: X0, top: 400, width: 650, height: 96, opacity: hd, transform: `translateY(${(1 - hd) * 14}px)`}}>
          {msgs.slice(0, 3).map((m, i) => (
            <div key={i} style={{position: 'absolute', left: i * 30, top: 22, width: 48, height: 48, borderRadius: 24, border: `2px solid ${i === 0 ? C.ink : C.ink2}`, backgroundColor: C.bg}} />
          ))}
          <div className={TXT} style={{position: 'absolute', left: 150, top: 14, fontFamily: F.sans, fontWeight: 600, fontSize: 40, color: C.ink}}>{title}</div>
          <div className={TXT} style={{position: 'absolute', left: 150, top: 64, fontFamily: F.mono, fontSize: 22, color: C.ink2}}>{mtav(`${msgs.length} წევრი`)}</div>
          <div style={{position: 'absolute', left: 0, right: 0, top: 110, height: 1.5, backgroundColor: C.rule, transformOrigin: 'left', transform: `scaleX(${prog(frame, e, 24, ease.drawOn)})`}} />
        </div>

        <div style={{position: 'absolute', inset: 0, transform: `translateY(${scroll}px)`}}>
          {msgs.map((m, i) => {
            if (i >= shown) return null;
            const land = lands[+i];
            const k = spr(frame, land, 'enter');
            const typing = frame < land;
            const y = TOP + i * ROW;
            const text = mtav(m.text);
            const fs = 40;
            const tw = textWidth(text, `500 ${fs}px ${F.sans}`);
            const iconW = m.icon === 'cars' ? 100 : m.icon === 'clock' ? 60 : 0;
            const isWave = m.icon === 'wave';
            const w = typing ? 130 : Math.min(BMAX, (isWave ? 420 : tw + iconW) + 64);
            const scaleT = Math.min(1, (BMAX - 64 - iconW) / Math.max(1, tw));
            const dot = (j: number) => 0.35 + 0.65 * Math.max(0, Math.sin((frame - j * 4) / 3.2));
            const bars = prog(frame, land + 4, 26, ease.drawOn);
            return (
              <div key={i} style={{position: 'absolute', left: 0, top: y, width: 1080, height: ROW}}>
                <div style={{position: 'absolute', left: X0, top: 34, width: 64, height: 64, borderRadius: 32, border: `2px solid ${C.ink2}`, backgroundColor: C.bg}} />
                <div className={TXT} style={{position: 'absolute', left: X0, top: 34, width: 64, lineHeight: '64px', textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 28, color: C.ink}}>{mtav(m.name.slice(0, 1))}</div>
                <div className={TXT} style={{position: 'absolute', left: BX + 4, top: 0, fontFamily: F.mono, fontSize: 22, color: C.ink2, opacity: Math.min(1, k * 1.5)}}>{mtav(m.name)}</div>
                <div
                  style={{
                    position: 'absolute', left: BX, top: 32, width: w, height: 104, borderRadius: 30, borderTopLeftRadius: 8,
                    backgroundColor: C.surface, border: `1.5px solid ${rgba(C.ink, 0.22)}`,
                    transformOrigin: 'left top', transform: typing ? 'none' : `scale(${0.86 + 0.14 * k})`, opacity: typing ? 1 : 0.4 + 0.6 * k,
                  }}
                >
                  {typing ? (
                    <svg width={130} height={104} style={{position: 'absolute', left: 0, top: 0}}>
                      {[0, 1, 2].map((j) => <circle key={j} cx={40 + j * 25} cy={52} r={7} fill={C.ink2} opacity={dot(j)} />)}
                    </svg>
                  ) : isWave ? (
                    <svg width={420} height={104} style={{position: 'absolute', left: 0, top: 0}}>
                      <circle cx={52} cy={52} r={22} fill="none" stroke={C.ink} strokeWidth={2} />
                      <path d="M 46 41 L 61 52 L 46 63 Z" fill={C.ink} />
                      {BARS.map((h, j) => {
                        const hh = Math.max(4, h * (j / BARS.length < bars ? 1 : 0.15));
                        return <rect key={j} x={98 + j * 13} y={52 - hh / 2} width={6} height={hh} rx={3} fill={j === 6 || j === 11 ? toneBig(tone) : C.ink} />;
                      })}
                    </svg>
                  ) : (
                    <>
                      {m.icon ? (
                        <div style={{position: 'absolute', left: 30, top: m.icon === 'cars' ? 28 : 30}}>
                          <Icon kind={m.icon} color={toneText(tone)} />
                        </div>
                      ) : null}
                      <div className={TXT} style={{position: 'absolute', left: 32 + iconW, top: 0, height: 104, lineHeight: '104px', whiteSpace: 'nowrap', fontFamily: F.sans, fontWeight: 500, fontSize: fs * scaleT, color: C.ink}}>
                        {text}
                      </div>
                    </>
                  )}
                </div>
                {!typing && isWave ? (
                  <div className={TXT} style={{position: 'absolute', left: BX + 432, top: 66, fontFamily: F.mono, fontSize: 24, color: C.ink2, opacity: k}}>{'0:04'}</div>
                ) : null}
                <Sfx name="asmr-key-roll" at={Math.max(base, land - 9)} volume={0.18} />
                <Sfx name={isWave ? 'asmr-knock' : 'asmr-pop'} at={land} volume={0.4} />
                <Haptic kind="light" at={land} />
              </div>
            );
          })}
        </div>
       </div>
      </div>
    </PictureBand>
  );
};
