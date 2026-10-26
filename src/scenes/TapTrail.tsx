import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, prog} from '../lib/anim';
import type {SceneCtx} from '../types';
import {drift, FitText, HERO_H, HeroPhone, phoneGeom, S, tone} from './kit/p2';
import {cueFrame, entrance, Sfx} from './common';
import {C, F} from '../tokens';
import {TXT} from '../lib/layer';

type Step = {
  /** a current capture */
  screen: string;
  /** where the finger presses, in capture px (1080 x 2346) */
  tap: {x: number; y: number};
  /** the verb chip: what the viewer does (2 words at most: „შეიყვანე კოდი") */
  verb: string;
  /** the chunk the press lands on (default: evenly spaced, 40 to 55 frames a step) */
  at?: number;
  /** how the next screen arrives: a push from the right (default) or a sheet from below */
  next?: 'push' | 'sheet';
};
type P = {steps: Step[]};

// TapTrail (phase 2): the app used in tap order. A whole hero phone; on each step a 96 px hotspot ring presses (1 -> 0.82
// over 3 frames) and ripples, the existing app-tick on the press frame (never later), then the next screen pushes in (or
// rises as a sheet). A verb chip and a step counter sit over the phone. 40 to 55 frames a step.
export const TapTrail: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = entrance(ctx);
  const steps = (p.steps ?? []).slice(0, 4);
  const n = steps.length;
  if (!n) return null;
  const g = phoneGeom(HERO_H - 90, S.cx, S.cy + 45);
  const per = Math.min(55, Math.max(40, Math.floor((ctx.dur - 10) / n)));
  const press = steps.map((s, i) => (s.at !== undefined ? cueFrame(ctx, s.at) : Math.max(0, base) + 18 + i * per));
  // the step on screen: it changes 10 frames after the previous press (the push)
  const cur = Math.max(0, press.reduce((c, f, i) => (frame >= f + 10 && i + 1 < n ? i + 1 : c), 0));
  const sw = cur > 0 ? prog(frame, press[cur - 1] + 10, 12, ease.data) : 1; // the arrival of the current screen
  const prev = cur > 0 ? steps[cur - 1] : null;
  const s = steps[cur];
  const sheet = prev?.next === 'sheet';
  const pf = press[cur];
  const k = g.k;
  const tx = g.screen.x + s.tap.x * k;
  const ty = g.screen.y + s.tap.y * k;
  const d = frame - pf;
  const ringS = d < 0 ? 1 : d < 3 ? 1 - 0.18 * (d / 3) : d < 8 ? 0.82 + 0.18 * ((d - 3) / 5) : 1;
  const ringOn = frame >= pf - 12 && frame < pf + 14;
  const ripple = d >= 0 && d < 16 ? d / 16 : -1;
  return (
    <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur, {x: tx, y: ty}, 0.025)}}>
      {/* the step counter and the verb chip */}
      <div className={TXT} style={{position: 'absolute', left: S.left, top: S.top - 6, fontFamily: F.sans, fontWeight: 600, fontSize: 36, color: C.ink2, letterSpacing: '0.02em'}}>
        {`${cur + 1}/${n}`}
      </div>
      <FitText key={cur} text={s.verb} x={S.left + 90} y={S.top - 22} w={S.right - S.left - 90} size={64} min={40} maxLines={1} weight={700} at={cur > 0 ? press[cur - 1] + 12 : base + 4} />
      <div style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {prev ? (
          <div style={{position: 'absolute', inset: 0, transform: sheet ? undefined : `translateX(${-sw * 0.3 * g.w}px)`, opacity: sw >= 1 ? 0 : 1}}>
            <HeroPhone g={g} screen={prev.screen} />
          </div>
        ) : null}
        <div style={{position: 'absolute', inset: 0, opacity: prev ? Math.min(1, sw * 3) : 1}}>
          <HeroPhone g={g} screen={s.screen} style={prev ? (sheet ? {clipPath: `inset(${(1 - sw) * 100}% 0 0 0 round ${g.r}px)`} : {clipPath: `inset(0 0 0 ${(1 - sw) * 100}% round ${g.r}px)`}) : undefined} />
        </div>
      </div>
      {ringOn ? (
        <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none'}}>
          <circle cx={tx} cy={ty} r={48 * ringS} fill={tone('ink')} opacity={0.14} />
          <circle cx={tx} cy={ty} r={48 * ringS} fill="none" stroke={tone('ink')} strokeWidth={5} />
          {ripple >= 0 ? <circle cx={tx} cy={ty} r={48 + 70 * ease.whipOut(ripple)} fill="none" stroke={tone('ink')} strokeWidth={4 * (1 - ripple)} opacity={1 - ripple} /> : null}
        </svg>
      ) : null}
      {press.map((f, i) => (
        <Sfx key={i} name="app-tick" at={f} volume={0.4} /* event: the finger presses (the press frame, never later) */ />
      ))}
    </div>
  );
};
