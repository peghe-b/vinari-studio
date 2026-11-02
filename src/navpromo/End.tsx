// THE END CARD, for this promo only (outside the studio EndCard, whose 26-character tagline and no-CTA rules would refuse it):
// the reveal's edge light runs once around the frame's border, then the quiet card on pure white: the mark and the wordmark in
// ink, the silent slogan „გზა ქართულად." and four lines of honest small print. The spoken call to action is the subtitle.
// It never freezes: a slow push and one soft light across the mark.
import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {mtav} from '../lib/format';
import {textWidth} from '../lib/measure';
import {F} from '../tokens';
import {clamp, E, fr, INK, INK2, lerp, prog, shot, sp} from './lib';

const W = 1080;
const H = 1920;
const PRINT = [
  'მხოლოდ iPhone-ზე, iOS 18+. ნავიგატორი VINARI+-შია.',
  'უფასოდ: ორივე ხმის მოსმენა და ერთი საცდელი მგზავრობა.',
  'წლიურ გეგმაზე პირველი 7 დღე უფასოა.',
  'კამერების სია შეიძლება სრული არ იყოს.',
];
const PERIM = 2 * (W + H);
const onBorder = (s: number): [number, number] => {
  const d = ((s % PERIM) + PERIM) % PERIM;
  if (d < W) return [d, 1];
  if (d < W + H) return [W - 1, d - W];
  if (d < 2 * W + H) return [W - (d - W - H), H - 1];
  return [1, H - (d - 2 * W - H)];
};

export const End: React.FC = () => {
  const t = useCurrentFrame();
  const end = fr(shot('end').to) - fr(shot('end').from);
  // the rim: a bright head with a fading tail, once around in 18 frames
  const rimK = prog(t, 0, 18);
  const head = E.inOut(rimK) * PERIM + W / 2;
  const tail = 900;
  const segs: React.ReactNode[] = [];
  if (t <= 20) {
    for (let i = 0; i < 40; i++) {
      const a = head - (tail * i) / 40;
      const b = head - (tail * (i + 1)) / 40;
      const [x1, y1] = onBorder(a);
      const [x2, y2] = onBorder(b);
      if (Math.abs(x1 - x2) > W / 2 || Math.abs(y1 - y2) > H / 2) continue;
      segs.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth={4} opacity={(1 - i / 40) * (1 - clamp((t - 16) / 4))} strokeLinecap="round" />);
    }
  }
  const push = 1 + 0.03 * E.sine(clamp(t / end));
  const markK = sp(t, 4, 120, 20);
  const wmK = sp(t, 8, 120, 20);
  const sloK = sp(t, 13, 120, 20);
  const prK = clamp((t - 20) / 10);
  const slogan = mtav('გზა ქართულად.');
  let size = 110;
  const sw = textWidth(slogan, `700 ${size}px ${F.sans}`);
  if (sw > 860) size = Math.floor((size * 860) / sw);
  const shine = prog(t, 30, 40);
  const markW = 150;
  const markH = (markW * 671) / 768;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#FFFFFF'}}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: '540px 880px'}}>
        <div style={{position: 'absolute', left: 540 - markW / 2, top: 560 + (1 - markK) * 30, width: markW, height: markH, opacity: markK}}>
          <Img src={staticFile('brand/mark.svg')} style={{width: markW, height: markH, filter: 'brightness(0) invert(0.045)'}} />
          {shine > 0 && shine < 1 ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                WebkitMaskImage: `url(${staticFile('brand/mark.svg')})`,
                WebkitMaskSize: '100% 100%',
                maskImage: `url(${staticFile('brand/mark.svg')})`,
                maskSize: '100% 100%',
                background: `linear-gradient(110deg, rgba(255,255,255,0) ${lerp(-40, 120, shine) - 20}%, rgba(255,255,255,0.55) ${lerp(-40, 120, shine)}%, rgba(255,255,255,0) ${lerp(-40, 120, shine) + 20}%)`,
              }}
            />
          ) : null}
        </div>
        <Img src={staticFile('brand/wordmark.svg')} style={{position: 'absolute', left: 540 - 125, top: 712 + (1 - wmK) * 24, width: 250, height: (250 * 68) / 267, filter: 'brightness(0) invert(0.045)', opacity: wmK}} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 840 + (1 - sloK) * 26, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: size, lineHeight: 1, color: INK, opacity: sloK, whiteSpace: 'nowrap'}}>{slogan}</div>
        <div style={{position: 'absolute', left: 510 - 347, width: 694, top: 1150, textAlign: 'center', fontFamily: F.mono, fontSize: 22, lineHeight: '35px', color: INK2, opacity: prK}}>
          {PRINT.map((l, i) => (
            <div key={i} style={{whiteSpace: 'nowrap'}}>
              {mtav(l)}
            </div>
          ))}
        </div>
      </div>
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        {segs}
      </svg>
    </div>
  );
};
