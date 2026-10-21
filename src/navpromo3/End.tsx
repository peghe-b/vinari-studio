// 24 the end card (the white): the VINARI mark and wordmark build, the line „ქართული ნავიგატორი. / ახლა CarPlay-ზეც." lands
// word by word, „პირველი მგზავრობა საჩუქარია." is said (its subtitle under the card), and on „ეპ სთორსა" and „გუგლ ფლეიზეა"
// the two store pills land (the pills are the store line: no subtitle under them); the quiet note last: the navigator and
// CarPlay are iPhone's (the brief: never promise them on Android). Text black only; a slow push with depth, never frozen.
import React from 'react';
import {Img, staticFile} from 'remotion';
import {mtav} from '../lib/format';
import {textWidth} from '../lib/measure';
import {C, F} from '../tokens';
import {clamp, E, lerp, prog, sp} from './lib';
import {INK, useShot, WHITE} from './kit/stage';

const STORES = ['App Store', 'Google Play'];
const GLYPH = [
  'M16.4 12.6c0-2.4 2-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.9-.9-3-.8-1.6 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.5-1-2.5-3.7zM14.1 5.5c.6-.8 1.1-1.8 1-2.9-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.8 1 .1 2.1-.5 2.7-1.3z',
  'M5 3.2v17.6c0 .4.4.6.8.4L20 12.9c.4-.2.4-.7 0-.9L5.8 2.8c-.4-.2-.8 0-.8.4z',
];
const Pill: React.FC<{i: number; k: number}> = ({i, k}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '17px 38px 19px 30px',
      borderRadius: 999,
      background: INK,
      fontFamily: F.sans,
      fontWeight: 600,
      fontSize: 40,
      lineHeight: 1.1,
      color: WHITE,
      whiteSpace: 'nowrap',
      opacity: clamp(k * 2),
      transform: `translateY(${((1 - k) * 46).toFixed(2)}px) scale(${lerp(0.78, 1, k).toFixed(4)})`,
    }}
  >
    <svg width={38} height={38} viewBox="0 0 24 24" style={{display: 'block', flex: 'none', marginTop: i === 0 ? -4 : 0}}>
      <path d={GLYPH[i]} fill={WHITE} />
    </svg>
    {STORES[i]}
  </div>
);

const MARK_W = 150;
const MARK_H = (MARK_W * 671) / 768;
export const End: React.FC = () => {
  const {t, len, L, Ls} = useShot('end');
  const markAt = L('mark');
  const tags = Ls('tag');
  const p1 = L('pill1');
  const p2 = L('pill2');
  const noteAt = L('note');
  const hit = clamp(L('endHit'), 0, len - 1);
  const markK = sp(t, markAt - 3, 130, 15);
  const wmK = sp(t, markAt + 2, 130, 18);
  const nod = Math.sin(Math.PI * prog(t, hit, 8)) * (t >= hit ? 1 : 0);
  // the line: ქართული ნავიგატორი. | ახლა CarPlay-ზეც.
  const words = [mtav('ქართული'), mtav('ნავიგატორი.'), mtav('ახლა'), `CarPlay-${mtav('ზეც.')}`];
  const LINES = [[0, 1], [2, 3]];
  let size = 92;
  const lineText = (idx: number[]) => idx.map((i) => words[i]).join(' ');
  const widest = Math.max(...LINES.map((l) => textWidth(lineText(l), `700 ${size}px ${F.sans}`)));
  if (widest > 900) size = Math.floor((size * 900) / widest);
  const LH = size * 1.14;
  const gap = size * 0.28;
  const TAG_TOP = 690;
  const wordAt = [tags[0], tags[0] + 4, tags[1], tags[1] + 4];
  const camK = clamp(t / Math.max(1, len));
  const s = 1 + 0.045 * E.out2(camK);
  const note = E.out(prog(t, noteAt, 12));
  return (
    <div style={{position: 'absolute', inset: 0, background: C.surface, overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${s})`, transformOrigin: '540px 860px'}}>
        <div style={{position: 'absolute', left: 540 - MARK_W / 2, top: 360 + (1 - markK) * 30, width: MARK_W, height: MARK_H, opacity: clamp(markK * 1.6), transform: `scale(${(lerp(0.86, 1, markK) * (1 + 0.035 * nod)).toFixed(4)})`, transformOrigin: '50% 60%'}}>
          <Img src={staticFile('brand/mark.svg')} style={{width: MARK_W, height: MARK_H, filter: 'brightness(0) invert(0.045)'}} />
        </div>
        <Img src={staticFile('brand/wordmark.svg')} style={{position: 'absolute', left: 540 - 120, top: 520 + (1 - wmK) * 22, width: 240, height: (240 * 68) / 267, filter: 'brightness(0) invert(0.045)', opacity: clamp(wmK * 1.4)}} />
        {LINES.map((idx, li) => {
          const top = TAG_TOP + li * LH;
          const ws = idx.map((i) => textWidth(words[i], `700 ${size}px ${F.sans}`));
          const lineW = ws.reduce((acc, wd, n) => acc + wd + (n > 0 ? gap : 0), 0);
          let x = 540 - lineW / 2;
          return idx.map((i, n) => {
            const k = E.out(prog(t, wordAt[i] - 2, 9));
            if (n > 0) x += gap;
            const left = x;
            x += ws[n];
            return (
              <div key={i} style={{position: 'absolute', left, top, whiteSpace: 'nowrap', fontFamily: F.sans, fontWeight: 700, fontSize: size, lineHeight: 1.1, color: INK, opacity: k, transform: `translateY(${((1 - k) * 24).toFixed(2)}px)`}}>
                {words[i]}
              </div>
            );
          });
        })}
        <div style={{position: 'absolute', left: 0, right: 0, top: TAG_TOP + 2 * LH + 70, display: 'flex', justifyContent: 'center', gap: 24}}>
          <Pill i={0} k={sp(t, p1 - 2, 170, 16)} />
          <Pill i={1} k={sp(t, p2 - 2, 170, 16)} />
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top: TAG_TOP + 2 * LH + 200, textAlign: 'center', fontFamily: F.mono, fontSize: 30, color: C.ink2, letterSpacing: '0.04em', opacity: note, transform: `translateY(${((1 - note) * 10).toFixed(2)}px)`}}>
          iPhone · iOS 18+
        </div>
      </div>
    </div>
  );
};

export const SHOTS: Record<string, React.FC> = {end: End};
