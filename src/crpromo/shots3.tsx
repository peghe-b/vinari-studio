// Shots 14-18: the REAL path on vinari.ge, recorded on a phone-size browser (build/capture.cjs; the form was answered
// locally and never sent): home -> the creators block at the bottom -> „შემოგვიერთდი" -> /creators -> the form, field by
// field -> consent -> send -> „განაცხადი მივიღეთ."; then the code by email, and the end card.
import React from 'react';
import {Img, staticFile} from 'remotion';
import {F} from '../tokens';
import {textWidth} from '../lib/measure';
import {atFoot, float, Phone3, ScreenLayer, type Pose} from './kit/phone3d';
import {clamp, cue, E, FPS, INK, INK2, INK3, lerp, prog, SHADOW, sp} from './lib';
import {Bg, Check, Mark, Mt, StatusBar, Tap, UrlPill, Wordmark} from './ui';
import {CODE, useT, type ShotProps} from './shots1';
import manifest from './rec-manifest.json';

type Rect = {x: number; y: number; w: number; h: number};
const MAN = manifest as {file: string; step: string; tap?: Rect}[];
const recSrc = (i: number) => staticFile(`vo/crpromo/rec/${MAN[Math.max(0, Math.min(MAN.length - 1, i))].file}`);
const TOP = 140; // the page sits under the status bar
const capOf = (r: Rect) => ({x: (r.x + r.w / 2) * 3, y: (r.y + r.h / 2) * 3 + TOP});
/** the recording's clock: [from s, to s, first frame, last frame] runs; between runs the last frame holds */
const RUNS: [number, number, number, number][] = [];
const run = (a: number, b: number, i0: number, i1: number) => RUNS.push([a, b, i0, i1]);
const C = (n: string) => cue(n);
run(0, C('bolomde') - 0.05, 0, 0);
run(C('bolomde') - 0.05, C('bolomde') + 0.95, 1, 41);
run(C('bolomde') + 0.95, C('blokis') - 0.06, 42, 42);
run(C('blokis') - 0.06, C('daachire') + 0.2, 43, 43);
run(C('daachire') + 0.2, C('mokle') - 0.15, 44, 45);
run(C('mokle') - 0.15, C('sheavse') + 0.48, 46, 82);
run(C('sakheli') - 0.15, C('sakheli') - 0.01, 83, 83);
run(C('sakheli'), C('sakheli') + 0.32, 84, 86);
run(C('meili') - 0.2, C('meili') - 0.02, 87, 93);
run(C('meili') - 0.02, C('meili') + 0.03, 94, 94);
run(C('meili') + 0.03, C('meili') + 0.62, 95, 102);
run(C('arkhi') - 0.28, C('arkhi') - 0.03, 103, 111);
run(C('arkhi') - 0.03, C('arkhi') + 0.03, 112, 112);
run(C('arkhi') + 0.03, C('arkhi') + 0.5, 113, 120);
run(C('auditoria') - 0.1, C('auditoria') + 0.05, 121, 129);
run(C('auditoria') + 0.05, C('auditoria') + 0.28, 130, 130);
run(C('auditoria') + 0.28, C('tema') - 0.3, 131, 131);
run(C('tema') - 0.3, C('tema') - 0.1, 132, 138);
run(C('tema') - 0.1, C('tema') - 0.05, 139, 139);
run(C('tema') - 0.05, C('tema') + 0.2, 140, 145);
run(C('tema') + 0.2, C('tankhmoba') + 0.02, 146, 154);
run(C('tankhmoba') + 0.02, C('tankhmoba') + 0.2, 155, 155);
run(C('tankhmoba') + 0.2, C('gagzavna') - 0.12, 156, 156);
run(C('gagzavna') - 0.12, C('gagzavna') + 0.08, 157, 157);
run(C('gagzavna') + 0.08, C('gagzavna') + 0.4, 158, 165);
run(C('gagzavna') + 0.4, C('gagzavna') + 0.5, 166, 166);
run(C('gagzavna') + 0.5, C('gagzavna') + 0.95, 167, 177);
run(C('gagzavna') + 0.95, 99, 178, 178);
export const recIndex = (t: number) => {
  let idx = 0;
  for (const [a, b, i0, i1] of RUNS) {
    if (t >= b) idx = i1;
    else if (t >= a) {
      const k = (t - a) / Math.max(1e-6, b - a);
      idx = Math.min(i1, i0 + Math.floor(k * (i1 - i0 + 1)));
    }
  }
  return idx;
};
/** when each tap of the recording happens (s) and where (capture px) */
const tapAt = (step: string, t: number) => {
  const m = MAN.find((x) => x.step === step);
  return m && m.tap ? {...capOf(m.tap), t} : null;
};
const TAPS = [
  tapAt('home-join', C('daachire')),
  tapAt('name-focus', C('sakheli') - 0.15),
  tapAt('email-focus', C('meili') - 0.04),
  tapAt('tiktok-focus', C('arkhi') - 0.05),
  tapAt('aud-focus', C('auditoria') + 0.04),
  tapAt('topic-focus', C('tema') - 0.12),
  tapAt('ok-before', C('tankhmoba') + 0.02),
  tapAt('send-before', C('gagzavna') - 0.06),
].filter(Boolean) as {x: number; y: number; t: number}[];

const RecScreen: React.FC<{t: number}> = ({t}) => {
  const i = recIndex(t);
  const nav = C('daachire') + 0.2;
  const navK = clamp((t - nav) * FPS / 5);
  const url = t < nav + 0.1 ? 'vinari.ge' : 'vinari.ge/creators';
  return (
    <div style={{position: 'absolute', inset: 0, background: '#F4F4F6', overflow: 'hidden'}}>
      {navK > 0 && navK < 1 ? <Img src={recSrc(43)} style={{position: 'absolute', left: 0, top: TOP, width: 1080, height: 2346}} /> : null}
      <Img src={recSrc(i)} style={{position: 'absolute', left: 0, top: TOP, width: 1080, height: 2346, opacity: navK > 0 && navK < 1 ? navK : 1}} />
      <StatusBar bg="#F4F4F6" />
      <UrlPill url={url} />
      {TAPS.map((p, k) => (
        <Tap key={k} x={p.x} y={p.y} k={((t - p.t) * FPS) / 16} s={1.25} />
      ))}
    </div>
  );
};

// ---- 14 SITE: the homepage, a long scroll to the bottom, the creators block -------------------------------------------
export const SiteHome: React.FC<ShotProps> = ({from}) => {
  const {f, t} = useT(from);
  const enter = sp(f, 0, 110, 19);
  const fl = float(f);
  const pose: Pose = atFoot({x: 490, w: lerp(360, 440, enter), yaw: lerp(30, 9, enter) + fl.roll, pitch: lerp(8, 4, enter) + fl.pitch, roll: lerp(-3, -1, enter)}, lerp(1330, 1404, enter));
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Bg />
      <Phone3 src="vo/crpromo/blank.jpg" pose={pose} look={1} opacity={clamp(enter * 1.8)} />
      <ScreenLayer pose={pose} opacity={clamp(enter * 1.8)}>
        <RecScreen t={t} />
      </ScreenLayer>
    </div>
  );
};

// ---- 15 the tap, /creators, the scroll to the form (a new angle) --------------------------------------------------------
export const SiteTap: React.FC<ShotProps> = ({from}) => {
  const {f, t} = useT(from);
  const k = sp(f, 0, 90, 20);
  const fl = float(f);
  const pose: Pose = atFoot({x: 490, w: lerp(440, 470, k), yaw: lerp(9, -8, k) + fl.roll, pitch: 3 + fl.pitch, roll: lerp(-1, 0.5, k)}, 1406);
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Bg />
      <Phone3 src="vo/crpromo/blank.jpg" pose={pose} look={1} />
      <ScreenLayer pose={pose}>
        <RecScreen t={t} />
      </ScreenLayer>
    </div>
  );
};

// ---- 16 FORM: field by field, the values floating beside the phone so they read; send; received ----------------------
const VALUES: {after: number; label: string; value: string; size?: number}[] = [
  {after: C('sakheli') + 0.32, label: 'სახელი', value: 'ნია'},
  {after: C('meili') + 0.62, label: 'ელფოსტა', value: 'nia@example.com', size: 31},
  {after: C('arkhi') + 0.5, label: 'TikTok', value: 'tiktok.com/@sheni.arxi', size: 25},
  {after: C('auditoria') + 0.28, label: 'აუდიტორია', value: '5K-დან 20K-მდე', size: 30},
  {after: C('tema') + 0.2, label: 'მთავარი თემა', value: 'მანქანები და გზა', size: 30},
  {after: C('tankhmoba') + 0.2, label: 'თანხმობა', value: '✓'},
];
export const Form: React.FC<ShotProps> = ({from}) => {
  const {f, t} = useT(from);
  const k = sp(f, 0, 110, 20);
  const fl = float(f);
  const sent = C('gagzavna') + 0.1;
  const back = E.inOut(clamp((t - sent - 0.25) / 0.5));
  const pose: Pose = atFoot({x: lerp(lerp(490, 332, k), 490, back), w: lerp(lerp(470, 404, k), 430, back), yaw: lerp(lerp(-8, 12, k), 0, back) + fl.roll, pitch: 3 + fl.pitch, roll: 0}, 1404);
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Bg />
      <Phone3 src="vo/crpromo/blank.jpg" pose={pose} look={1} />
      <ScreenLayer pose={pose}>
        <RecScreen t={t} />
      </ScreenLayer>
      {VALUES.map((v, i) => {
        const kk = sp(f, (v.after - from) * FPS - 1, 190, 17);
        if (kk <= 0.001) return null;
        const fly = E.in2(clamp((t - sent - i * 0.03) / 0.32));
        const y = 352 + i * 114;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 584,
              top: y,
              width: 380,
              height: 98,
              borderRadius: 28,
              background: 'rgba(255,255,255,0.96)',
              boxShadow: SHADOW,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '0 26px',
              boxSizing: 'border-box',
              gap: 4,
              opacity: clamp(kk * 1.6) * (1 - fly),
              transform: `translateX(${((1 - kk) * 70 - fly * 260).toFixed(1)}px) scale(${((0.88 + 0.12 * kk) * (1 - 0.4 * fly)).toFixed(3)})`,
            }}
          >
            {/^[A-Za-z]/.test(v.label) ? <span style={{fontFamily: F.sans, fontWeight: 500, fontSize: 21, color: INK3, letterSpacing: '0.05em'}}>{v.label.toUpperCase()}</span> : <Mt size={21} weight={500} color={INK3} spacing={0.05}>{v.label}</Mt>}
            {v.value === '✓' ? (
              <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                <Check s={36} k={kk} />
                <Mt size={28} weight={600}>ვეთანხმები</Mt>
              </div>
            ) : /[ა-ჰ]/.test(v.value) ? (
              <Mt size={v.size ?? 34} weight={600}>{v.value}</Mt>
            ) : (
              <span style={{fontFamily: F.sans, fontWeight: 500, fontSize: v.size ?? 34, color: INK, whiteSpace: 'nowrap'}}>{v.value}</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ---- 17 MAIL: we look at your channels and email you the code ------------------------------------------------------------
export const Mail: React.FC<ShotProps> = ({from}) => {
  const {f, t} = useT(from);
  const k = sp(f, 0, 100, 20);
  const fl = float(f);
  const pose: Pose = atFoot({x: lerp(490, 372, k), w: lerp(430, 410, k), yaw: lerp(0, 10, k) + fl.roll, pitch: 3 + fl.pitch, roll: 0}, 1404);
  const look = clamp((t - C('chven') + 0.05) / 0.3);
  const scan = E.inOut(clamp((t - C('arkhebs') + 0.1) / 0.85));
  const drop = sp(f, (C('meilze') - 0.12 - from) * FPS, 160, 16);
  const chans = ['TikTok', 'Instagram', 'YouTube'];
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Bg />
      <Phone3 src="vo/crpromo/blank.jpg" pose={pose} look={1} />
      <ScreenLayer pose={pose}>
        <RecScreen t={t} />
      </ScreenLayer>
      {drop > 0.001 ? (
        <div style={{position: 'absolute', left: 110, top: 300, width: 1008, height: 250, transform: `translateY(${((1 - drop) * -26).toFixed(1)}px) scale(${((760 / 1008) * (0.96 + 0.04 * drop)).toFixed(4)})`, transformOrigin: '0 0', opacity: clamp(drop * 2)}}>
          <div style={{position: 'absolute', inset: 0, borderRadius: 64, background: 'rgba(250,250,252,0.97)', boxShadow: '0 30px 80px rgba(0,0,0,0.22)', display: 'flex', alignItems: 'center', gap: 34, padding: '0 46px', boxSizing: 'border-box'}}>
            <div style={{width: 132, height: 132, borderRadius: 32, background: INK, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none'}}>
              <svg width="78" height="60" viewBox="0 0 26 20"><rect x="1.5" y="1.5" width="23" height="17" rx="3" fill="none" stroke="#fff" strokeWidth="2.2" /><path d="M2.5 3l10.5 8 10.5-8" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" /></svg>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 10, flex: 1}}>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span style={{fontFamily: F.sans, fontWeight: 700, fontSize: 44, color: INK}}>VINARI</span>
                <Mt size={34} weight={400} color={INK3}>ახლა</Mt>
              </div>
              <div style={{display: 'flex', alignItems: 'baseline', gap: 16}}>
                <Mt size={40} weight={500} color={INK2}>შენი პირადი კოდი:</Mt>
                <span style={{fontFamily: F.sans, fontWeight: 700, fontSize: 46, color: INK, letterSpacing: '0.08em'}}>{CODE}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {/* we look at the channels */}
      {chans.map((c, i) => {
        const kk = sp(f, (C('chven') - 0.1 - from) * FPS + i * 2, 170, 18);
        const y = 520 + i * 140;
        const lit = clamp(1 - Math.abs(scan * 2.4 - i * 0.9 - 0.25) * 2.2);
        return (
          <div key={i} style={{position: 'absolute', left: 642, top: y, width: 318, height: 106, borderRadius: 30, background: '#fff', boxShadow: SHADOW, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', boxSizing: 'border-box', opacity: clamp(kk * 1.6) * look, transform: `translateX(${((1 - kk) * 60).toFixed(1)}px) scale(${(1 + 0.04 * lit).toFixed(3)})`, outline: `${(3 * lit).toFixed(1)}px solid rgba(11,11,11,0.25)`}}>
            <span style={{fontFamily: F.sans, fontWeight: 600, fontSize: 36, color: INK}}>{c}</span>
            <Check s={42} k={clamp((scan * 2.4 - i * 0.9 - 0.2) * 2)} />
          </div>
        );
      })}
      {look > 0 && scan < 1 ? (
        <svg width="120" height="120" viewBox="0 0 60 60" style={{position: 'absolute', left: 870, top: lerp(500, 820, scan), opacity: look * (1 - E.in2(clamp((scan - 0.85) / 0.15)))}}>
          <circle cx="24" cy="24" r="15" fill="rgba(255,255,255,0.5)" stroke={INK} strokeWidth="4" />
          <path d="M35 35l14 14" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        </svg>
      ) : null}
    </div>
  );
};

// ---- 18 END: the wordmark and the address, big; the owner's link sticker goes under it -----------------------------------
export const End: React.FC<ShotProps> = ({from}) => {
  const {f} = useT(from);
  const a = sp(f, 0, 120, 18);
  const b = sp(f, 6, 140, 17);
  const c = sp(f, 12, 120, 18);
  const push = E.sine(prog(f, 0, 80));
  const url = 'vinari.ge/creators';
  const size = Math.min(92, Math.floor((92 * 700) / Math.max(1, textWidth(url, `700 92px ${F.sans}`))));
  const line = E.inOut(clamp((f - 16) / 18));
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Bg glow={0.5} />
      <div style={{position: 'absolute', inset: 0, transform: `scale(${lerp(1, 1.03, push).toFixed(4)})`, transformOrigin: '490px 640px'}}>
        <div style={{position: 'absolute', left: 0, width: 980, top: 400, display: 'flex', justifyContent: 'center', opacity: clamp(a * 1.6), transform: `translateY(${((1 - a) * 40).toFixed(1)}px)`}}>
          <Wordmark w={330} />
        </div>
        <div style={{position: 'absolute', left: 0, width: 980, top: 548, textAlign: 'center', opacity: clamp(b * 1.6), transform: `translateY(${((1 - b) * 30).toFixed(1)}px)`}}>
          <Mt size={34} weight={500} color={INK2} spacing={0.08}>კრეატორების პროგრამა</Mt>
        </div>
        <div style={{position: 'absolute', left: 0, width: 980, top: 618, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: size, color: INK, letterSpacing: '-0.01em', opacity: clamp(c * 1.6), transform: `translateY(${((1 - c) * 40).toFixed(1)}px)`}}>
          {url}
        </div>
        <div style={{position: 'absolute', left: 490 - 300 * line, width: 600 * line, top: 752, height: 4, borderRadius: 2, background: INK}} />
      </div>
    </div>
  );
};
export {Mark};
