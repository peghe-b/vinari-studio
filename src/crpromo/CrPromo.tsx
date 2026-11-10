// VINARI creator program STORY v2 (1080x1920, 30 fps, ~40 s): its own composition in the promos' way (not the studio's
// library scenes): a close, stylish hook (a free stock clip of a creator's car video, recorded in a phone's viewfinder),
// real app screens and the REAL vinari.ge path in whole moving 3D phones, kinetic glass cards, a new picture every ~2 s,
// one continuous narrator take (Algieba) timed to the shots by build/plan.py. Sound is mixed by build/mix.py and muxed
// after the render (the film itself renders silent).
import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import {clamp, cue, E, fr, TL} from './lib';
import {Subs} from './Subs';
import {Channels, Coupon, HookPhone, Plus, Topics, View} from './shots1';
import {AppOpen, FileShot, Pay, Phrase, Renew, Screens} from './shots2';
import {End, Form, Mail, SiteHome, SiteTap} from './shots3';

type Shot = {id: string; from: number; C: React.FC<{from: number; to: number}>};
const C = cue;
export const SHOTS: Shot[] = [
  {id: 'view', from: 0, C: View},
  {id: 'hookPhone', from: 1.92, C: HookPhone},
  {id: 'topics', from: C('manqana') - 0.25, C: Topics},
  {id: 'channels', from: C('tiktok') - 0.08, C: Channels},
  {id: 'plus', from: C('plus') - 0.28, C: Plus},
  {id: 'coupon', from: C('piradi') - 0.14, C: Coupon},
  {id: 'app', from: C('mayurebeli') - 0.36, C: AppOpen as React.FC<{from: number; to: number}>},
  {id: 'pay', from: C('itvleba') - 0.2, C: Pay},
  {id: 'renew', from: C('tviuri') - 0.14, C: Renew},
  {id: 'file', from: C('tan') - 0.28, C: FileShot},
  {id: 'screens', from: C('skrinebs') - 0.24, C: Screens},
  {id: 'phrase', from: C('frazas') - 0.06, C: Phrase},
  {id: 'siteHome', from: C('saitze') - 0.5, C: SiteHome},
  {id: 'siteTap', from: C('blokis') + 0.04, C: SiteTap},
  {id: 'form', from: C('sakheli') - 0.24, C: Form},
  {id: 'mail', from: C('chven') - 0.16, C: Mail},
  {id: 'end', from: C('bmuli') - 0.24, C: End},
];
const XF = 7; // frames: each shot dissolves in over the one before (with a small settle)

const In: React.FC<{n: number; children: React.ReactNode}> = ({n, children}) => {
  const f = useCurrentFrame();
  const k = n > 0 ? E.out(clamp((f + 1) / (n + 1))) : 1;
  return <AbsoluteFill style={{opacity: k, transform: `scale(${(1.025 - 0.025 * k).toFixed(4)})`}}>{children}</AbsoluteFill>;
};

export const CrPromo: React.FC = () => (
  <AbsoluteFill style={{background: '#F4F4F6'}}>
    {SHOTS.map((s, i) => {
      const a = fr(s.from);
      const next = SHOTS[i + 1];
      const b = next ? fr(next.from) + XF : fr(TL.total);
      const Comp = s.C;
      return (
        <Sequence key={s.id} from={a} durationInFrames={b - a} layout="none">
          <In n={i === 0 ? 0 : XF}>
            <Comp from={s.from} to={next ? next.from : TL.total} />
          </In>
        </Sequence>
      );
    })}
    <Subs />
  </AbsoluteFill>
);
