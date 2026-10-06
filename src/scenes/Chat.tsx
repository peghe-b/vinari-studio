// src/scenes/Chat.tsx: messages typing and arriving (illustrated, the "Graphite" kit): mom writes, a group chat, left on
// read. The bubbles ARE the moment; they never repeat what the voice says (a reaction, a question, other words).
//
// Stagings:
//   thread   (default) a hand holds the phone with a messenger thread: typing dots, then a bubble lands at the bottom and
//            the older ones scroll up; a reaction pops on a bubble's corner; "seen" ticks turn ink
//   bubble   no phone: one big bubble at a time floats over a dim room, the sender's face beside it, typing dots between
//   group    a group thread: three faces in the header, each bubble with its sender's small face
// Props: messages* [{text (<= 4 words), from: me | them | a Figure preset, at, react: heart | laugh | wow | sad | like,
//   seen}] (<= 3; bubble <= 2; <= 9 words together), contact (<= 2 words: the header's name, an identity label), where
//   (bubble: the room behind), time, word, camera, seed.
// Frame 0: the first bubble is already there, or the typing dots run. Tail: the dots or the cursor.
// Sounds: asmr-notif (them), cc0-click-soft + asmr-air (me: sent), asmr-pop (a reaction), Haptic light per bubble.
import React, {useId} from 'react';
import {spring, useCurrentFrame} from 'remotion';
import {mtav} from '../lib/format';
import {TXT} from '../lib/layer';
import {textWidth} from '../lib/measure';
import {C, F, SPRING, toneBig, type Tone} from '../tokens';
import type {SceneCtx} from '../types';
import {entrance, Haptic, lead, Sfx} from './common';
import {AvatarHead, avatarOf} from './Call';
import {Backdrop} from './illo/backdrop';
import {Camera, Hud, Plane, type CamSpec} from './illo/cam';
import {type Preset, PRESETS_LIST} from './illo/figure';
import {Handset, HandGrip} from './illo/handset';
import {Icon} from './illo/icons';
import {dark, mix, type Time} from './illo/palette';
import {paint, rr} from './illo/solid';
import {at, clamp01, env, IlloBand, n1, osc, stagingOf, Svg, timeOf} from './illo/scene';
import {Punch, wordOf} from './illo/type';

const STAGINGS = ['thread', 'bubble', 'group'] as const;
type Msg = {text: string; from?: string; at?: number | string; react?: string; seen?: boolean};
type P = {staging?: (typeof STAGINGS)[number]; messages?: Msg[]; contact?: string; where?: string; time?: Time; word?: unknown; tone?: Tone; camera?: CamSpec; seed?: number};

type Placed = {text: string; me: boolean; who: Preset | null; at: number; react?: string; seen?: boolean};

const isPreset = (v: unknown): v is Preset => typeof v === 'string' && (PRESETS_LIST as readonly string[]).includes(v);

/** Lines of `text` (already in capitals) that fit maxW in `font`. */
const wrap = (text: string, font: string, maxW: number) => {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (!cur || textWidth(t, font) <= maxW) cur = t;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
};

/** Three dots in a bubble, a scale wave running through them (18-frame period). */
const Dots: React.FC<{x: number; y: number; s: number; f: number; fill: string; ink: string; k: number; tail?: 'l' | 'r'}> = ({x, y, s, f, fill, ink, k, tail = 'l'}) => (
  <g transform={`translate(${n1(x)} ${n1(y)}) scale(${(k * s).toFixed(3)})`} opacity={clamp01(k * 2)}>
    <path d={rr(0, -46, 150, 92, 46)} fill={fill} />
    <path d={tail === 'l' ? 'M6 30C0 44 -8 50 -16 52C2 54 18 48 26 40Z' : 'M144 30C150 44 158 50 166 52C148 54 132 48 124 40Z'} fill={fill} />
    {[0, 1, 2].map((i) => {
      const w = 0.5 + 0.5 * Math.max(0, Math.sin(((f - i * 4) / 18) * Math.PI * 2));
      return <circle key={i} cx={40 + i * 35} cy={0} r={10 + 4 * w} fill={ink} opacity={0.4 + 0.5 * w} />;
    })}
  </g>
);

export const Chat: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const f = useCurrentFrame();
  const uid = useId();
  const staging = stagingOf(p, STAGINGS);
  const time = timeOf(p);
  const e = entrance(ctx);
  const base = lead(ctx);
  const contact = (p.contact ?? '').trim();
  const contactFace = avatarOf(contact || 'them', undefined) ?? (staging === 'group' ? 'friend' : 'girl');
  const cap = staging === 'bubble' ? 2 : 3;
  const msgs: Placed[] = (p.messages ?? []).slice(0, cap).map((m, i) => {
    const me = m.from === 'me';
    const who = me ? 'me' : isPreset(m.from) ? m.from : contactFace;
    // a message without `at` arrives one after another from the cut
    const fm = m.at === undefined ? e + 6 + i * 24 : Math.max(e, at(ctx, m.at, e + 6 + i * 24));
    return {text: m.text, me, who, at: fm, react: m.react, seen: m.seen};
  });
  const word = wordOf(p.word, ctx, 1);
  const kicks = msgs.map((m) => m.at).filter((x) => x > e + 4);
  const dk = dark(time);

  let picture: React.ReactNode = null;
  let cam: CamSpec = {move: 'push', amount: 0.035};
  if (staging === 'bubble') {
    picture = <Floating uid={uid} f={f} e={e} msgs={msgs} time={time} where={p.where} />;
    cam = {move: 'push', amount: 0.03, origin: {x: 540, y: 860}};
  } else {
    const k = spring({frame: f - e, fps: 30, config: SPRING.enterXL});
    const W = 570;
    const x = 550;
    const y = 905 + 120 * (1 - k);
    const tilt = -3 + 0.5 * osc(f, 90);
    const place = {x, y, w: W, tilt, frame: f};
    const screen = (w: number, h: number) => <Thread uid={uid} f={f} w={w} h={h} msgs={msgs} contact={contact} contactFace={contactFace} group={staging === 'group'} />;
    cam = {move: 'push', amount: 0.035, origin: {x, y: 1000}};
    picture = (
      <>
        <Plane depth={0.6}>
          <Svg>
            <Backdrop kind="room" uid={uid} frame={f} time={time} opacity={0.75} />
          </Svg>
        </Plane>
        <Plane depth={1}>
          <Svg>
            <ellipse cx={x} cy={y} rx={W} ry={W * 1.3} fill={paint(uid, 'glow-ink')} opacity={dk ? 0.12 : 0.05} />
            <HandGrip uid={uid} part="back" {...place} time={time} sleeve={4} />
            <Handset uid={uid} {...place} lit={env(f, e + 2, 8)} time={time} screen={screen} />
          </Svg>
        </Plane>
      </>
    );
  }

  return (
    <IlloBand uid={uid} time={time}>
      <Camera ctx={ctx} spec={cam} over={p.camera} kicks={kicks}>
        {picture}
        <Hud>
          <Punch word={word} slot={staging === 'bubble' ? 'top' : 'centre'} plate={staging !== 'bubble'} />
        </Hud>
      </Camera>
      {msgs.map((m, i) =>
        m.at >= Math.max(0, base) && m.at < ctx.dur ? (
          <React.Fragment key={i}>
            {m.me ? (
              <>
                <Sfx name="cc0-click-soft" at={m.at} volume={0.35} />
                <Sfx name="asmr-air" at={m.at} volume={0.12} />
              </>
            ) : (
              <Sfx name="asmr-notif" at={m.at} volume={0.4} />
            )}
            <Haptic kind="light" at={m.at} />
            {m.react && m.at + 14 < ctx.dur ? <Sfx name="asmr-pop" at={m.at + 14} volume={0.3} /> : null}
          </React.Fragment>
        ) : null,
      )}
    </IlloBand>
  );
};

// ---- the thread on the phone ------------------------------------------------------------------------------------------------
const Thread: React.FC<{uid: string; f: number; w: number; h: number; msgs: Placed[]; contact: string; contactFace: Preset; group: boolean}> = ({uid, f, w, h, msgs, contact, contactFace, group}) => {
  const ink = C.ink;
  const panel = mix(C.screen, C.ink, 0.12);
  const fs = w * 0.1;
  const font = `600 ${fs}px ${F.sans}`;
  const pad = w * 0.045;
  const maxW = w * 0.76;
  const headTop = h * 0.035;
  const headH = h * 0.15;
  const inputY = h * 0.855;
  const avR = w * 0.055;
  const lead = group ? avR * 2 + w * 0.03 : 0;
  // each bubble's lines and size
  const items = msgs.map((m) => {
    const lines = wrap(mtav(m.text), font, maxW - 2 * pad);
    const bw = Math.max(...lines.map((l) => textWidth(l, font))) + 2 * pad;
    const bh = lines.length * fs * 1.22 + pad * 1.3;
    return {...m, lines, bw, bh};
  });
  // the typing dots before a "them" message: 18 frames
  const typingFor = items.find((m) => !m.me && f >= m.at - 20 && f < m.at);
  const dotsK = typingFor ? spring({frame: f - (typingFor.at - 20), fps: 30, config: SPRING.land}) : 0;
  const gap = w * 0.03;
  // stack from the bottom: the newest at the bottom, older ones pushed up by every landed bubble's height
  let yb = inputY - gap - (typingFor ? (92 * 0.62 + gap) * dotsK : 0);
  const placed: {m: (typeof items)[number]; y: number; k: number}[] = [];
  for (let i = items.length - 1; i >= 0; i--) {
    const m = items[i];
    if (f < m.at) continue;
    const k = spring({frame: f - m.at, fps: 30, config: SPRING.land});
    const y = yb - m.bh;
    placed.push({m, y, k});
    yb -= (m.bh + gap) * Math.min(1, k * 1.15);
  }
  const caret = Math.floor(f / 16) % 2 === 0;
  return (
    <g>
      <rect width={w} height={h} fill={C.screen} />
      {/* the header: back chevron, the contact's face(s) and name */}
      <path d={`M0 0H${w}V${headH}H0Z`} fill={mix(C.screen, C.ink, 0.05)} />
      <g transform={`translate(0 ${headTop * 0.5})`}>
      <path d={`M${w * 0.07} ${headH * 0.62}l${w * 0.03} ${-w * 0.03}M${w * 0.07} ${headH * 0.62}l${w * 0.03} ${w * 0.03}`} stroke={ink} strokeWidth={w * 0.01} strokeLinecap="round" />
      {group ? (
        ['friend', 'girl', 'boss'].map((pr, i) => (
          <g key={pr} transform={`translate(${n1(w * 0.2 + i * avR * 1.4)} ${n1(headH * 0.6)})`}>
            <circle r={avR * 1.12} fill={C.screen} />
            <AvatarHead uid={uid} preset={pr as Preset} r={avR} frame={f} />
          </g>
        ))
      ) : (
        <g transform={`translate(${n1(w * 0.21)} ${n1(headH * 0.6)})`}>
          <AvatarHead uid={uid} preset={contactFace} r={avR * 1.1} frame={f} />
        </g>
      )}
      <text className={TXT} x={group ? w * 0.2 + avR * 4.2 : w * 0.3} y={headH * 0.6 + fs * 0.35} fontFamily={F.sans} fontWeight={600} fontSize={fs * 0.95} fill={ink}>
        {mtav(contact)}
      </text>
      </g>
      {/* the bubbles */}
      {placed.map(({m, y, k}, i) => {
        const x = m.me ? w - pad - m.bw : pad + lead;
        const ox = m.me ? x + m.bw : x;
        const oy = y + m.bh;
        const fill = m.me ? ink : panel;
        const tx = m.me ? C.screen : ink;
        const tail = m.me
          ? `M${x + m.bw - 10} ${y + m.bh - 26}C${x + m.bw} ${y + m.bh - 8} ${x + m.bw + 10} ${y + m.bh} ${x + m.bw + 18} ${y + m.bh + 2}C${x + m.bw - 4} ${y + m.bh + 6} ${x + m.bw - 26} ${y + m.bh} ${x + m.bw - 34} ${y + m.bh - 8}Z`
          : `M${x + 10} ${y + m.bh - 26}C${x} ${y + m.bh - 8} ${x - 10} ${y + m.bh} ${x - 18} ${y + m.bh + 2}C${x + 4} ${y + m.bh + 6} ${x + 26} ${y + m.bh} ${x + 34} ${y + m.bh - 8}Z`;
        const s = 0.6 + 0.4 * k;
        const react = m.react ? spring({frame: f - (m.at + 14), fps: 30, config: SPRING.tap}) : 0;
        const tickOn = m.me && (m.seen || f > m.at + 20);
        return (
          <g key={i} transform={`translate(${n1(ox)} ${n1(oy + (1 - k) * 30)}) scale(${s.toFixed(3)}) translate(${n1(-ox)} ${n1(-oy)})`} opacity={clamp01(k * 3)}>
            {group && !m.me && m.who ? (
              <g transform={`translate(${n1(pad + avR)} ${n1(y + m.bh - avR)})`}>
                <AvatarHead uid={uid} preset={m.who} r={avR} frame={f} />
              </g>
            ) : null}
            <path d={rr(x, y, m.bw, m.bh, Math.min(m.bh / 2, w * 0.06)) + tail} fill={fill} />
            {m.lines.map((l, j) => (
              <text key={j} className={TXT} x={x + pad} y={y + pad * 0.65 + fs * (j + 0.95) * 1.22 - fs * 0.22} fontFamily={F.sans} fontWeight={600} fontSize={fs} fill={tx}>
                {l}
              </text>
            ))}
            {m.me ? (
              <path d={`M${x + m.bw - w * 0.1} ${y + m.bh + w * 0.04}l${w * 0.012} ${w * 0.012}l${w * 0.022} ${-w * 0.024}M${x + m.bw - w * 0.075} ${y + m.bh + w * 0.04}l${w * 0.012} ${w * 0.012}l${w * 0.022} ${-w * 0.024}`} fill="none" stroke={tickOn ? ink : C.ink3} strokeWidth={w * 0.007} strokeLinecap="round" strokeLinejoin="round" />
            ) : null}
            {m.react && react > 0.01 ? (
              <g transform={`translate(${n1(m.me ? x + 8 : x + m.bw - 8)} ${n1(y + 4)}) scale(${react.toFixed(3)})`}>
                <circle r={w * 0.055} fill={C.screen} />
                <circle r={w * 0.048} fill={mix(C.screen, C.ink, 0.1)} />
                <Icon name={m.react} x={0} y={0} size={w * 0.07} color={m.react === 'heart' ? toneBig('down') : ink} />
              </g>
            ) : null}
          </g>
        );
      })}
      {typingFor ? <Dots x={pad + lead} y={inputY - gap - 46 * 0.62} s={0.62} f={f} fill={panel} ink={ink} k={dotsK} /> : null}
      {/* the input bar with a blinking caret */}
      <path d={rr(pad, inputY, w - 2 * pad - w * 0.13, h * 0.065, h * 0.0325)} fill={mix(C.screen, C.ink, 0.08)} />
      {caret ? <rect x={pad * 2.2} y={inputY + h * 0.016} width={w * 0.008} height={h * 0.033} fill={ink} /> : null}
      <circle cx={w - pad - w * 0.055} cy={inputY + h * 0.0325} r={w * 0.055} fill={ink} />
      <path d={`M${w - pad - w * 0.055} ${inputY + h * 0.05}V${inputY + h * 0.016}M${w - pad - w * 0.08} ${inputY + h * 0.03}L${w - pad - w * 0.055} ${inputY + h * 0.014}L${w - pad - w * 0.03} ${inputY + h * 0.03}`} fill="none" stroke={C.screen} strokeWidth={w * 0.01} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
};

// ---- bubble: one big bubble at a time, no phone -------------------------------------------------------------------------------
const Floating: React.FC<{uid: string; f: number; e: number; msgs: Placed[]; time: Time; where?: string}> = ({uid, f, e, msgs, time, where}) => {
  const dk = dark(time);
  const fs = 112;
  const font = `600 ${fs}px ${F.sans}`;
  const pad = 62;
  const panel = dk ? C.il6 : C.il0;
  const meFill = C.ink;
  const items = msgs.map((m) => {
    const lines = wrap(mtav(m.text), font, 600);
    const bw = Math.max(...lines.map((l) => textWidth(l, font))) + 2 * pad;
    const bh = lines.length * fs * 1.18 + pad * 1.2;
    return {...m, lines, bw, bh};
  });
  const typing = items.find((m) => !m.me && f >= m.at - 22 && f < m.at);
  const tk = typing ? spring({frame: f - (typing.at - 22), fps: 30, config: SPRING.land}) : 0;
  const landed = items.filter((m) => f >= m.at);
  const kind = where === 'station' ? 'station' : where === 'garage' ? 'garage' : where === 'city' || where === 'street' ? 'city' : 'room';
  return (
    <>
      <Plane depth={0.6}>
        <Svg>
          <Backdrop kind={kind} uid={uid} frame={f} time={time} opacity={0.55} />
        </Svg>
      </Plane>
      <Plane depth={1}>
        <Svg>
          {landed.map((m, i) => {
            const k = spring({frame: f - m.at, fps: 30, config: SPRING.land});
            // the newest sits at y 900; an older one floats up and fades a step
            const newer = landed.length - 1 - i;
            const lift = newer > 0 ? spring({frame: f - landed[i + 1].at, fps: 30, config: SPRING.enter}) * (m.bh + 60) : 0;
            const yb = 930 - lift + 6 * osc(f, 70, i);
            const x = m.me ? 960 - m.bw : 330;
            const y = yb - m.bh;
            const ox = m.me ? x + m.bw : x;
            const s = 0.6 + 0.4 * k;
            const who = m.who;
            return (
              <g key={i} opacity={clamp01(k * 3) * (newer > 0 ? 0.55 : 1)}>
                <g transform={`translate(${n1(ox)} ${n1(yb + (1 - k) * 40)}) scale(${s.toFixed(3)}) translate(${n1(-ox)} ${n1(-yb)})`}>
                  <path
                    d={
                      rr(x, y, m.bw, m.bh, 56) +
                      (m.me
                        ? `M${x + m.bw - 20} ${yb - 40}C${x + m.bw} ${yb - 10} ${x + m.bw + 16} ${yb} ${x + m.bw + 30} ${yb + 4}C${x + m.bw - 10} ${yb + 10} ${x + m.bw - 46} ${yb} ${x + m.bw - 56} ${yb - 14}Z`
                        : `M${x + 20} ${yb - 40}C${x} ${yb - 10} ${x - 16} ${yb} ${x - 30} ${yb + 4}C${x + 10} ${yb + 10} ${x + 46} ${yb} ${x + 56} ${yb - 14}Z`)
                    }
                    fill={m.me ? meFill : panel}
                  />
                  {m.lines.map((l, j) => (
                    <text key={j} className={TXT} x={x + pad} y={y + pad * 0.6 + fs * (j + 0.86) * 1.18} fontFamily={F.sans} fontWeight={600} fontSize={fs} fill={m.me ? C.screen : C.ink}>
                      {l}
                    </text>
                  ))}
                </g>
                {!m.me && who ? (
                  <g transform={`translate(190 ${n1(yb - 50 + 4 * osc(f, 55))}) scale(${(0.7 + 0.3 * k).toFixed(3)})`}>
                    <AvatarHead uid={uid} preset={who} r={118} frame={f} face={newer > 0 ? 'neutral' : 'worried'} bg={dk ? 6 : 2} />
                  </g>
                ) : null}
              </g>
            );
          })}
          {typing ? (
            <g>
              <Dots x={340} y={880} s={1.5} f={f} fill={panel} ink={C.ink} k={tk} />
              {typing.who && !landed.some((m) => !m.me) ? (
                <g transform={`translate(190 ${n1(880 + 4 * osc(f, 55))}) scale(${(0.7 + 0.3 * tk).toFixed(3)})`}>
                  <AvatarHead uid={uid} preset={typing.who} r={118} frame={f} face="neutral" bg={dk ? 6 : 2} />
                </g>
              ) : null}
            </g>
          ) : null}
        </Svg>
      </Plane>
    </>
  );
};
