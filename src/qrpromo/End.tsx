// 10 the end card (white): the VINARI mark and wordmark, the tagline „ნომერი შენთან რჩება." built word by word as the narrator
// says it (the card is the line: no subtitle), a hairline, and the quiet note „QR ბარათი · VINARI+". No store, no call to
// action. A slow push with depth; a light crosses the mark on the last sound. Everything sits above y 1110.
import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {mtav} from '../lib/format';
import {textWidth} from '../lib/measure';
import {C, F} from '../tokens';
import {clamp, E, ev, fr, lerp, prog, shot, sp} from './lib';

const MARK_W = 170;
const MARK_H = (MARK_W * 671) / 768;

export const End: React.FC = () => {
  const t = useCurrentFrame();
  const base = fr(shot('end').from);
  const len = fr(shot('end').to) - base;
  const tag = fr(ev('tag')) - base;
  const hit = fr(ev('endHit')) - base;
  const push = E.inOut(prog(t, 0, len));
  const s = lerp(1, 1.045, push);
  // the mark is there from the cut (a dark room to a bare white frame would flash), the wordmark follows
  const markK = sp(t + 8, 0, 120, 16);
  const wordK = sp(t + 3, 0, 120, 18);
  // the tagline's words on the voice: ნომერი | შენთან | რჩება.
  const words = [mtav('ნომერი'), mtav('შენთან'), mtav('რჩება.')];
  const at = [tag - 2, fr(ev('tag2')) - base - 2, fr(ev('tag3')) - base - 2];
  // two centred lines that build with the voice: „ნომერი" / „შენთან რჩება." (each line centred as it grows)
  let size = 104;
  const wLine2 = textWidth(`${words[1]} ${words[2]}`, `700 ${size}px ${F.sans}`);
  if (wLine2 > 860) size = Math.floor((size * 860) / wLine2);
  const LINE1 = 880;
  const LINE2 = LINE1 + size * 1.12;
  const hair = E.out(prog(t, at[2] + 6, 14));
  const note = E.out(prog(t, at[2] + 10, 12));
  const glint = prog(t, hit - 4, 20);
  return (
    <div style={{position: 'absolute', inset: 0, background: C.surface, overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${s})`, transformOrigin: '540px 860px'}}>
        <div style={{position: 'absolute', left: 540 - MARK_W / 2, top: 520 + (1 - markK) * 30, width: MARK_W, height: MARK_H, opacity: clamp(markK * 1.4), transform: `scale(${0.9 + 0.1 * markK})`}}>
          <Img src={staticFile('brand/mark.svg')} style={{width: MARK_W, height: MARK_H, filter: 'brightness(0) invert(0.045)'}} />
          {glint > 0 && glint < 1 ? (
            <div style={{position: 'absolute', inset: -20, overflow: 'hidden', WebkitMaskImage: `url(${staticFile('brand/mark.svg')})`, WebkitMaskSize: `${MARK_W}px ${MARK_H}px`, WebkitMaskPosition: '20px 20px', WebkitMaskRepeat: 'no-repeat'}}>
              <div style={{position: 'absolute', top: 0, bottom: 0, width: 60, left: lerp(-80, MARK_W + 60, E.inOut(glint)), background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.75), rgba(255,255,255,0))', transform: 'skewX(-20deg)'}} />
            </div>
          ) : null}
        </div>
        <Img
          src={staticFile('brand/wordmark.svg')}
          style={{position: 'absolute', left: 540 - 130, top: 730 + (1 - wordK) * 16, width: 260, height: (260 * 68) / 267, filter: 'brightness(0) invert(0.045)', opacity: clamp(wordK * 1.3)}}
        />
        {[
          {top: LINE1, idx: [0]},
          {top: LINE2, idx: [1, 2]},
        ].map((line) => {
          // a word not yet said takes no room: the line stays centred as it builds
          const ws = line.idx.map((i) => textWidth(words[i], `700 ${size}px ${F.sans}`));
          const gap = size * 0.28;
          const rooms = line.idx.map((i, n) => (n === 0 ? 1 : E.inOut(prog(t, at[i] - 2, 8))));
          const lineW = ws.reduce((acc, w, n) => acc + (n === 0 ? w : rooms[n] * (gap + w)), 0);
          // each word keeps its full place after the one before (never overlapping); the whole line slides to stay centred
          let x = 540 - lineW / 2;
          return line.idx.map((i, n) => {
            const k = E.out(prog(t, at[i], 9));
            if (n > 0) x += gap;
            const left = x;
            x += ws[n];
            return (
              <div key={i} style={{position: 'absolute', left, top: line.top, whiteSpace: 'nowrap', fontFamily: F.sans, fontWeight: 700, fontSize: size, lineHeight: 1.1, color: C.ink, opacity: k, transform: `translateY(${(1 - k) * 26}px)`}}>
                {words[i]}
              </div>
            );
          });
        })}
        <div style={{position: 'absolute', left: 540 - 300 * hair, top: LINE2 + size * 1.3, width: 600 * hair, height: 2, background: C.ink}} />
        <div style={{position: 'absolute', left: 0, right: 0, top: LINE2 + size * 1.3 + 40, textAlign: 'center', fontFamily: F.mono, fontSize: 32, color: C.ink2, letterSpacing: '0.04em', opacity: note, transform: `translateY(${(1 - note) * 10}px)`}}>
          {mtav('QR ბარათი')} · VINARI+
        </div>
      </div>
    </div>
  );
};
