// The cover's data card (plan step 1.4; the owner's ticked „მუსიკა თავისით ჩაიწევა" card, Marketing/23 B, and the mileage card,
// Marketing/21 A): a white card 940 wide on the paper, radius 40, a soft shadow, built ONLY from the spec's numbers, never a
// drawing. Two types:
//   bars     up to 3 rows: an app icon in a dark disc (src/scenes/kit/icons.tsx, never a drawn glyph), the label, a bar on a
//            light track (the fill 0..1)
//   numbers  up to 3 rows: the label, the number big in FiraGO Bold and its unit; a row struck through goes grey, the row that
//            matters stays ink
// A hand-drawn marker on the row(s) that ask for it (./Marker.tsx), and the caption line (cover.note) at the card's foot.
import React from 'react';
import {mtav} from '../lib/format';
import {textWidth} from '../lib/measure';
import {Sym} from '../scenes/kit/icons';
import {F} from '../tokens';
import type {CoverRow} from '../types';
import {GREY, INK, type Stage} from './CoverFrame';
import {type MarkSpec, Marks, marksOf} from './Marker';

const W = 940;
const R = 40;
const TRACK = '#E8E8E8';
const DISC = ['#111111', '#3A3A3A', '#5A5A5A'];
const SHADOW = '0 16px 34px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)';

type Props = {type: 'bars' | 'numbers'; rows: CoverRow[]; note?: string; stage: Stage; seed: number};

const Card: React.FC<{top: number; h: number; children: React.ReactNode}> = ({top, h, children}) => (
  <div style={{position: 'absolute', left: 70, top, width: W, height: h, borderRadius: R, background: '#FFFFFF', boxShadow: SHADOW}}>{children}</div>
);

const Note: React.FC<{text: string; top: number; left: number}> = ({text, top, left}) => (
  <div style={{position: 'absolute', left, top, fontFamily: F.sans, fontWeight: 600, fontSize: 46, lineHeight: 1, color: GREY, whiteSpace: 'nowrap'}}>{mtav(text)}</div>
);

const Bars: React.FC<Props> = ({rows, note, stage, seed}) => {
  const n = rows.length;
  const pitch = n >= 3 ? 210 : 240;
  const icons = rows.some((r) => r.icon);
  const lx = icons ? 180 : 64; // the label's and the bar's left edge in the card
  const bx1 = W - 70;
  const first = 74;
  const barsBottom = first + (n - 1) * pitch + 90;
  const noteTop = barsBottom + 120;
  const h = note ? noteTop + 46 + 70 : barsBottom + 84;
  const top = Math.min(stage.top + 10, stage.bottom - h);
  const marks: MarkSpec[] = [];
  rows.forEach((r, i) => {
    const y = first + i * pitch;
    const fill = Math.max(0.04, Math.min(1, Number(r.value) || 0)) * (bx1 - lx);
    // the approved card's ellipse: round the fill and a little past it, from left of the bar's start, the label's foot inside;
    // the arrow comes down onto the ellipse's upper right
    const ring = {x: lx, y: y + 60, w: Math.max(fill, 110) + 90, h: 30};
    const pad = [35, 49] as const;
    marksOf(r.mark).forEach((kind, k) => {
      const s = seed + i * 31 + k * 7;
      if (kind === 'circle') marks.push({kind, box: ring, seed: s, pad});
      else if (kind === 'arrow') marks.push({kind, box: {x: ring.x - pad[0], y: ring.y - pad[1] + 26, w: ring.w + 2 * pad[0], h: ring.h + 2 * pad[1]}, seed: s});
      else if (kind === 'tick') marks.push({kind, box: {x: lx, y: y + 54, w: bx1 - lx - 70, h: 42}, seed: s});
      else marks.push({kind, box: {x: lx, y: y + 60, w: fill, h: 30}, seed: s});
    });
  });
  return (
    <Card top={top} h={h}>
      {rows.map((r, i) => {
        const y = first + i * pitch;
        const fill = Math.max(0.04, Math.min(1, Number(r.value) || 0)) * (bx1 - lx);
        return (
          <React.Fragment key={i}>
            {r.icon ? (
              <div style={{position: 'absolute', left: 60, top: y + 12, width: 88, height: 88, borderRadius: 44, background: DISC[Math.min(i, DISC.length - 1)]}}>
                <Sym name={r.icon} size={52} color="#FFFFFF" x={44} y={44} />
              </div>
            ) : null}
            <div style={{position: 'absolute', left: lx, top: y - 6, fontFamily: F.sans, fontWeight: 600, fontSize: 42, lineHeight: 1, color: INK, whiteSpace: 'nowrap'}}>{mtav(r.label)}</div>
            <div style={{position: 'absolute', left: lx, top: y + 60, width: bx1 - lx, height: 30, borderRadius: 15, background: TRACK}} />
            <div style={{position: 'absolute', left: lx, top: y + 60, width: fill, height: 30, borderRadius: 15, background: INK}} />
          </React.Fragment>
        );
      })}
      {note ? <Note text={note} top={noteTop} left={60} /> : null}
      <Marks marks={marks} w={W} h={h} />
    </Card>
  );
};

const Numbers: React.FC<Props> = ({rows, note, stage, seed}) => {
  const n = rows.length;
  const pitch = n >= 3 ? 250 : 330;
  const big = n >= 3 ? 120 : 150;
  const x0 = 64;
  const inner = W - 2 * x0;
  // the row that matters: the circled one, else the last one; a struck row goes grey
  const circled = rows.findIndex((r) => marksOf(r.mark).includes('circle'));
  const hero = circled >= 0 ? circled : n - 1;
  const sizeOf = (i: number) => (i === hero ? Math.round(big * 1.13) : big);
  // one size rule: the number and its unit fit the card (shrink only)
  const fit = rows.map((r, i) => {
    const fs = sizeOf(i);
    const v = String(r.value);
    const u = r.unit ? mtav(r.unit) : '';
    const vw = textWidth(v, `700 ${fs}px ${F.sans}`);
    const uw = u ? textWidth(u, `600 ${Math.round(fs * 0.37)}px ${F.sans}`) + 24 : 0;
    const k = Math.min(1, inner / (vw + uw));
    return {fs: Math.floor(fs * k), vw: vw * k, uw: uw * k};
  });
  const first = 70;
  const rowsBottom = first + (n - 1) * pitch + 56 + Math.max(...fit.map((f) => f.fs)) * 1.02;
  const noteTop = rowsBottom + 40;
  const h = Math.round(note ? noteTop + 46 + 64 : rowsBottom + 58);
  const top = Math.min(stage.top + 10, stage.bottom - h);
  const marks: MarkSpec[] = [];
  rows.forEach((r, i) => {
    const y = first + i * pitch;
    const f = fit[i];
    const vy = y + 56;
    // the approved card: the ellipse round the number (its unit just outside), the strike through the number alone
    marksOf(r.mark).forEach((kind, k) => {
      const box = {x: x0, y: vy + f.fs * 0.16, w: f.vw, h: f.fs * 0.7};
      marks.push({kind, box, seed: seed + i * 31 + k * 7, ...(kind === 'circle' ? {pad: [Math.min(70, f.vw * 0.09), f.fs * 0.2] as const} : {})});
    });
  });
  return (
    <Card top={top} h={h}>
      {rows.map((r, i) => {
        const y = first + i * pitch;
        const f = fit[i];
        const struck = marksOf(r.mark).includes('strike');
        const tone = struck ? '#B4B4B4' : INK;
        return (
          <React.Fragment key={i}>
            <div style={{position: 'absolute', left: x0, top: y, fontFamily: F.sans, fontWeight: 600, fontSize: 40, lineHeight: 1, color: GREY, whiteSpace: 'nowrap'}}>{mtav(r.label)}</div>
            <div style={{position: 'absolute', left: x0, top: y + 56, display: 'flex', alignItems: 'baseline', gap: 24, whiteSpace: 'nowrap', color: tone}}>
              <span style={{fontFamily: F.sans, fontWeight: 700, fontSize: f.fs, lineHeight: 1, letterSpacing: '-0.01em'}}>{String(r.value)}</span>
              {r.unit ? <span style={{fontFamily: F.sans, fontWeight: 600, fontSize: Math.round(f.fs * 0.37), lineHeight: 1}}>{mtav(r.unit)}</span> : null}
            </div>
            {i < n - 1 ? <div style={{position: 'absolute', left: x0, right: x0, top: y + pitch - 40, height: 3, background: TRACK}} /> : null}
          </React.Fragment>
        );
      })}
      {note ? <Note text={note} top={noteTop} left={x0} /> : null}
      <Marks marks={marks} w={W} h={h} />
    </Card>
  );
};

export const InfoCard: React.FC<Props> = (p) => (p.type === 'numbers' ? <Numbers {...p} /> : <Bars {...p} />);

/** The brand card: the cover of a film that names no picture and has none to give (no story photo, no app screen). The app's
 *  mark big in a black rounded square on the white card, the caption under it. Never a drawing of anything. */
export const BrandCard: React.FC<{stage: Stage; note?: string; mark: React.ReactNode}> = ({stage, note, mark}) => {
  const h = Math.min(stage.bottom - stage.top - 20, note ? 640 : 560);
  const top = stage.top + 10;
  return (
    <Card top={top} h={h}>
      <div style={{position: 'absolute', left: W / 2 - 150, top: note ? 90 : (h - 300) / 2, width: 300, height: 300, borderRadius: 72, background: '#0E0E0E', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{mark}</div>
      {note ? <div style={{position: 'absolute', left: 0, right: 0, top: 450, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 46, lineHeight: 1, color: GREY, whiteSpace: 'nowrap'}}>{mtav(note)}</div> : null}
    </Card>
  );
};
