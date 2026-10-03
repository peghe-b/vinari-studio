// V69CodeNod: the mechanic's code, typed into a search field, unfolds like a folded note into plain Georgian.
// The field types the code on the cut; on `openAt` the note under it opens panel by panel (each a crease
// swinging flat), the title first, then the two plain lines; on `countAt` a quiet count of the codes lands, and
// on `offlineAt` a wifi mark draws on and is struck through (it works without internet).
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx, TypeSfx} from '../common';
import {C, F, L, rgba, toneBig, toneText, type Tone} from '../../tokens';
import {ease, lerp, prog, spr, typeOn} from '../../lib/anim';
import {capsLatin, mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';

type Row = {text: string; tone?: Tone};
type P = {
  code?: string; // what is typed into the field
  title?: string[]; // the code's own title, one or two lines
  rows?: Row[]; // the plain lines under it
  count?: string; // "9 533"
  countLabel?: string;
  openAt?: number | string;
  countAt?: number | string;
  offlineAt?: number | string;
};

const X0 = 150;
const W = 780;
const FIELD_Y = 470;
const FIELD_H = 116;
const NOTE_Y = 626;
const TITLE_H = 168;
const ROW_H = 132;

const fit = (s: string, font: (n: number) => string, max: number, size: number) =>
  Math.min(size, Math.floor((size * max) / Math.max(1, textWidth(s, font(size)))));

/** The code unfolds into words: a field, a folded note opening crease by crease, a count, an offline mark. */
export const V69CodeNod: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const code = capsLatin(p.code ?? 'P0420');
  const title = (p.title ?? ['კატალიზატორის', 'ეფექტიანობა დაბალია']).map(mtav);
  const rows = (p.rows ?? []).map((r) => ({lines: r.text.split('|').map((s) => mtav(s.trim())), tone: r.tone ?? ('neutral' as Tone)}));
  const typeFrom = Math.max(base + 4, e + 8);
  const typed = typeOn(code, frame, typeFrom, 0.32);
  const typedDone = typeFrom + Math.ceil(code.length / 0.32);
  const openF = Math.max(typedDone + 4, cueFrame(ctx, p.openAt ?? 1));
  const countF = p.countAt != null ? cueFrame(ctx, p.countAt) : openF + 26;
  const hasOff = p.offlineAt != null;
  const offF = hasOff ? cueFrame(ctx, p.offlineAt) : 99999;

  // the camera: in close on the field, easing back as the note opens, a last slow drift
  const settle = prog(frame, openF - 6, 40, ease.camera);
  const scale = lerp(1.14, 1, settle) * lerp(1, 1.03, prog(frame, openF + 34, ctx.dur, ease.camera));
  const ty = lerp(150, 0, settle);
  const fieldIn = spr(frame, e, 'enter');
  const caretOn = Math.floor(frame / 9) % 2 === 0 || (frame >= typeFrom && frame < typedDone + 2);
  const found = spr(frame, typedDone, 'land');

  // panels: the title, then each row, every one swinging open from its upper crease
  const panels = [{h: TITLE_H}, ...rows.map((r) => ({h: ROW_H + (r.lines.length - 1) * 54}))];
  let y = NOTE_Y;
  const laid = panels.map((pn, i) => {
    const at = openF + i * 8;
    const o = spr(frame, at, 'enter');
    const topY = y;
    y += pn.h * Math.min(1, o);
    return {top: topY, h: pn.h, o, at};
  });
  const noteBottom = y;

  const monoFont = (n: number) => `500 ${n}px ${F.mono}`;
  const titleFont = (n: number) => `600 ${n}px ${F.sans}`;
  const rowFont = (n: number) => `500 ${n}px ${F.sans}`;
  const tSize = Math.min(...title.map((t) => fit(t, titleFont, W - 120, 56)));

  const countLabel = mtav(p.countLabel ?? 'კოდი');
  const countIn = spr(frame, countF, 'land');
  const offIn = prog(frame, offF, 14, ease.drawOn);
  const strike = prog(frame, offF + 12, 10, ease.drawOn);
  const statY = Math.max(noteBottom + 56, 1150);

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `translateY(${ty}px) scale(${scale})`, transformOrigin: `540px ${L.contentMid}px`}}>
        {/* the search field */}
        <div style={{position: 'absolute', left: X0, top: FIELD_Y, width: W, height: FIELD_H, borderRadius: 30, backgroundColor: C.surface, border: `2px solid ${rgba(C.ink, lerp(0.25, 0.9, found))}`, opacity: fieldIn, transform: `translateY(${(1 - fieldIn) * 24}px)`}}>
          <svg width={W} height={FIELD_H} style={{position: 'absolute', inset: 0}}>
            <circle cx={58} cy={52} r={17} fill="none" stroke={C.ink2} strokeWidth={3} />
            <line x1={70} y1={64} x2={84} y2={78} stroke={C.ink2} strokeWidth={3} strokeLinecap="round" />
          </svg>
          <div className={TXT} style={{position: 'absolute', left: 110, top: 0, height: FIELD_H, display: 'flex', alignItems: 'center', fontFamily: F.mono, fontSize: 60, letterSpacing: 6, color: C.ink, whiteSpace: 'nowrap'}}>
            {typed}
            <span style={{display: 'inline-block', width: 4, height: 62, marginLeft: 6, backgroundColor: C.ink, opacity: caretOn && found < 0.5 ? 1 : 0}} />
          </div>
        </div>

        {/* the note, opening crease by crease */}
        {laid.map((pn, i) => {
          const s = Math.max(0, Math.min(1, pn.o));
          if (frame < pn.at) return null;
          const first = i === 0;
          const last = i === laid.length - 1;
          const r = rows[i - 1];
          return (
            <div key={i} style={{position: 'absolute', left: X0, top: pn.top, width: W, height: pn.h, transformOrigin: '50% 0%', transform: `scaleY(${Math.max(0.02, s)})`, backgroundColor: C.surface, borderLeft: `2px solid ${rgba(C.ink, 0.12)}`, borderRight: `2px solid ${rgba(C.ink, 0.12)}`, borderTop: first ? `2px solid ${rgba(C.ink, 0.12)}` : 'none', borderBottom: last ? `2px solid ${rgba(C.ink, 0.12)}` : 'none', borderTopLeftRadius: first ? 26 : 0, borderTopRightRadius: first ? 26 : 0, borderBottomLeftRadius: last ? 26 : 0, borderBottomRightRadius: last ? 26 : 0, overflow: 'hidden'}}>
              {/* the crease's shadow while it swings, gone once flat */}
              <div style={{position: 'absolute', inset: 0, backgroundColor: rgba(C.shade, 0.18 * (1 - s))}} />
              {!first ? <div style={{position: 'absolute', left: 40, right: 40, top: 0, height: 0, borderTop: `1.5px dashed ${rgba(C.ink, 0.22)}`}} /> : null}
              {first ? (
                <div className={TXT} style={{position: 'absolute', left: 50, top: 34, fontFamily: F.sans, color: C.ink}}>
                  {title.map((t, k) => (
                    <div key={k} style={{fontWeight: 600, fontSize: tSize, lineHeight: 1.18, whiteSpace: 'nowrap'}}>{t}</div>
                  ))}
                </div>
              ) : r ? (
                <div className={TXT} style={{position: 'absolute', left: 50, right: 40, top: 0, height: pn.h, display: 'flex', alignItems: 'center', gap: 22}}>
                  <div style={{width: 16, height: 16, borderRadius: 8, flex: 'none', backgroundColor: r.tone === 'neutral' ? C.ink2 : toneBig(r.tone)}} />
                  <div style={{fontFamily: F.sans, fontWeight: 500, fontSize: Math.min(...r.lines.map((s) => fit(s, rowFont, W - 140, 44))), lineHeight: 1.22, color: r.tone === 'neutral' ? C.ink : toneText(r.tone)}}>
                    {r.lines.map((s, k) => (
                      <div key={k} style={{whiteSpace: 'nowrap'}}>{s}</div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}

        {/* the count of codes and the offline mark */}
        <div className={TXT} style={{position: 'absolute', left: X0 + 10, top: statY, display: 'flex', alignItems: 'baseline', gap: 16, opacity: countIn, transform: `translateY(${(1 - countIn) * 20}px)`}}>
          <div style={{fontFamily: F.sans, fontWeight: 600, fontSize: 64, color: C.ink}}>{p.count ?? '9 533'}</div>
          <div style={{fontFamily: F.sans, fontWeight: 500, fontSize: 36, color: C.ink2}}>{countLabel}</div>
        </div>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: hasOff && frame >= offF ? 1 : 0}}>
          {[0, 1, 2].map((k) => {
            const rr = 20 + k * 20;
            const len = (Math.PI / 2) * rr;
            const cx = 760;
            const cy = statY + 82;
            return (
              <path key={k} d={`M ${cx - rr * 0.707} ${cy - rr * 0.707} A ${rr} ${rr} 0 0 1 ${cx + rr * 0.707} ${cy - rr * 0.707}`} fill="none" stroke={C.ink} strokeWidth={4} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - offIn)} />
            );
          })}
          <circle cx={760} cy={statY + 82} r={5} fill={C.ink} opacity={offIn} />
          <line x1={712} y1={statY - 2} x2={712 + 96 * strike} y2={statY - 2 + 96 * strike} stroke={C.ink} strokeWidth={5} strokeLinecap="round" opacity={strike > 0 ? 1 : 0} />
        </svg>
      </div>
      <TypeSfx text={code} at={typeFrom} cpf={0.32} />
      <Sfx name="asmr-paper" at={openF} volume={0.42} />
      <Sfx name="asmr-paper" at={openF + 8 * Math.max(1, rows.length)} volume={0.3} />
      <Haptic kind="light" at={openF} />
      <Sfx name="asmr-count-roll" at={countF} volume={0.3} />
      <Land at={countF + 10} />
      {hasOff ? <Sfx name="asmr-pencil-short" at={offF} volume={0.35} /> : null}
      {hasOff ? <Sfx name="asmr-strike" at={offF + 12} volume={0.4} /> : null}
    </PictureBand>
  );
};
