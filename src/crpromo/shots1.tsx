// Shots 1-6: the hook (a stylish creator's car clip being recorded, then on a phone, the code -> payment -> share chain),
// who it is for (car, road, tech; TikTok, Instagram, YouTube), VINARI+ switched on, the personal code.
import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {mtav} from '../lib/format';
import {F} from '../tokens';
import {atFoot, float, Phone3, ScreenLayer, bodyBox, type Pose} from './kit/phone3d';
import {clamp, cue, E, FPS, GREEN, INK, INK2, INK3, lerp, prog, SHADOW, sp} from './lib';
import {Bar, Bg, CamUI, Check, Glass, Mark, Mt, Stock, Wordmark} from './ui';

export type ShotProps = {from: number};
export const useT = (from: number) => {
  const f = useCurrentFrame();
  return {f, t: from + f / FPS};
};
const SLOW = 0.66; // the hook clip in gentle slow motion
/** a frame index local to the shot for a time `s` (absolute seconds) */
const L = (from: number, s: number) => (s - from) * FPS;

// ---- 1 VIEW: the creator's viewfinder, close: the clip in an aesthetic frame, REC running, focus locking on the car ----
export const View: React.FC<ShotProps> = ({from}) => {
  const {f, t} = useT(from);
  const enter = E.out(prog(f, 0, 14));
  const push = E.sine(prog(f, 0, 70));
  const exit = E.in2(prog(f, 50, 9));
  const x = 140;
  const w = 700;
  const y = 290;
  const h = 1040;
  const ry = lerp(-7, 1.5, push) - 8 * exit;
  const rx = lerp(4, 0, push);
  const sc = lerp(0.93, 1.0, enter) * lerp(1, 1.025, push) * (1 - 0.22 * exit);
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Bg />
      <div style={{position: 'absolute', inset: 0, perspective: 2400, perspectiveOrigin: '490px 800px'}}>
        <div
          style={{
            position: 'absolute',
            left: x,
            top: y,
            width: w,
            height: h,
            borderRadius: 54,
            overflow: 'hidden',
            boxShadow: '0 50px 120px rgba(20,20,30,0.22), 0 10px 30px rgba(20,20,30,0.12)',
            border: '10px solid #fff',
            transform: `translateY(${(-40 * exit).toFixed(1)}px) rotateY(${ry.toFixed(2)}deg) rotateX(${rx.toFixed(2)}deg) scale(${sc.toFixed(4)})`,
            opacity: 1 - exit,
            background: '#000',
          }}
        >
          <Stock clip="A" sec={t * SLOW} zoom={lerp(1.42, 1.5, push)} ox={44} oy={60} />
          <CamUI w={w - 20} h={h - 20} t={3 + t} focus={{x: 520, y: 660, k: clamp((f - 8) / 24)}} />
        </div>
      </div>
    </div>
  );
};

// ---- 2 the clip on the creator's phone; the chain: your code -> a payment -> your share --------------------------------
const CHIP_X = 604;
export const HookPhone: React.FC<ShotProps> = ({from}) => {
  const {f, t} = useT(from);
  const k = sp(f, 0, 120, 20);
  const fl = float(f);
  const w = lerp(470, 372, k);
  const pose: Pose = atFoot({x: lerp(490, 330, k), w, yaw: lerp(0, 14, k) + fl.roll, pitch: lerp(2, 5, k) + fl.pitch, roll: lerp(0, -2, k)}, lerp(1460, 1402, k));
  const chips = [
    {at: cue('kodit') - 0.08, y: 470, kind: 'code'},
    {at: cue('gadakhda') - 0.08, y: 690, kind: 'pay'},
    {at: cue('wili') - 0.1, y: 910, kind: 'share'},
  ];
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Bg />
      <Phone3 src="vo/crpromo/blank.jpg" pose={pose} look={1} />
      <ScreenLayer pose={pose}>
        <div style={{position: 'absolute', inset: 0, background: '#000'}}>
          <Stock clip="A" sec={t * SLOW} zoom={1.12} ox={46} oy={58} />
          <div style={{position: 'absolute', left: 0, top: 120, width: 1080, height: 2100}}>
            <CamUI w={1080} h={2100} t={3 + t} scale={1.5} brackets={false} />
          </div>
        </div>
      </ScreenLayer>
      {/* the hairline that ties the chain */}
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {chips.slice(1).map((c, i) => {
          const a = chips[i];
          const kk = E.inOut(clamp((f - L(from, c.at) + 6) / 10));
          const y0 = a.y + 140;
          const y1 = c.y;
          return <line key={i} x1={CHIP_X + 60} y1={y0} x2={CHIP_X + 60} y2={lerp(y0, y1, kk)} stroke="rgba(11,11,11,0.25)" strokeWidth={3} strokeDasharray="2 9" strokeLinecap="round" />;
        })}
      </svg>
      {chips.map((c, i) => {
        const kk = sp(f, L(from, c.at), 170, 17);
        if (kk <= 0.001) return null;
        const share = c.kind === 'share';
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: CHIP_X,
              top: c.y,
              width: 332,
              height: 140,
              borderRadius: 36,
              background: share ? INK : 'rgba(255,255,255,0.95)',
              boxShadow: SHADOW,
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              padding: '0 26px',
              boxSizing: 'border-box',
              opacity: clamp(kk * 1.6),
              transform: `translateX(${((1 - kk) * 60).toFixed(1)}px) scale(${(0.86 + 0.14 * kk).toFixed(3)})`,
              border: c.kind === 'code' ? '3px dashed rgba(11,11,11,0.22)' : undefined,
            }}
          >
            {c.kind === 'code' ? (
              <svg width="64" height="64" viewBox="0 0 32 32"><path d="M4 9.5A2.5 2.5 0 0 1 6.5 7h19A2.5 2.5 0 0 1 28 9.5V13a3 3 0 0 0 0 6v3.5a2.5 2.5 0 0 1-2.5 2.5h-19A2.5 2.5 0 0 1 4 22.5V19a3 3 0 0 0 0-6z" fill="none" stroke={INK} strokeWidth="2.2" /><path d="M12 12v8M16 12v8M20 12v8" stroke={INK} strokeWidth="2" strokeLinecap="round" /></svg>
            ) : c.kind === 'pay' ? (
              <Check s={60} k={clamp((f - L(from, c.at)) / 12)} bg={GREEN} />
            ) : (
              <svg width="64" height="64" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="none" stroke="#fff" strokeWidth="2.4" /><path d="M16 16V4a12 12 0 0 1 11.4 8.3z" fill="#fff" /></svg>
            )}
            <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
              <Mt size={24} weight={500} color={share ? 'rgba(255,255,255,0.6)' : INK3} spacing={0.06}>{c.kind === 'code' ? 'შენი' : c.kind === 'pay' ? 'ყოველი' : 'შენი'}</Mt>
              <Mt size={44} weight={700} color={share ? '#fff' : INK}>{c.kind === 'code' ? 'კოდი' : c.kind === 'pay' ? 'გადახდა' : 'წილი'}</Mt>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ---- 3 TOPICS: a car, the road, car tech: three tiles dealt in on the words ----------------------------------------------
export const Topics: React.FC<ShotProps> = ({from}) => {
  const {f, t} = useT(from);
  const drift = E.sine(prog(f, 0, 60));
  const tiles = [
    {at: cue('manqana') - 0.12, label: 'მანქანა', kind: 'stock'},
    {at: cue('gza') - 0.1, label: 'გზა', img: 'screens/17-nav-drive.jpg'},
    {at: cue('teqnika') - 0.1, label: 'ტექნიკა', img: 'vo/crpromo/26-diagnostics-hub.jpg'},
  ];
  const TW = 220;
  const TH = 452;
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Bg />
      <div style={{position: 'absolute', inset: 0, transform: `scale(${lerp(1, 1.04, drift).toFixed(4)})`, transformOrigin: '490px 760px'}}>
        {tiles.map((c, i) => {
          const kk = sp(f, Math.max(0, L(from, c.at)), 150, 16);
          const x = 490 - (3 * TW + 2 * 26) / 2 + i * (TW + 26);
          const rot = (i - 1) * 3 * (1 - kk) + (i - 1) * 0.8;
          return (
            <div key={i} style={{position: 'absolute', left: x, top: 470, width: TW, opacity: clamp(kk * 1.8), transform: `translateY(${((1 - kk) * 140).toFixed(1)}px) rotate(${rot.toFixed(2)}deg)`}}>
              <div style={{position: 'relative', width: TW, height: TH, borderRadius: 34, overflow: 'hidden', boxShadow: SHADOW, background: '#fff', border: '6px solid #fff'}}>
                {c.kind === 'stock' ? <Stock clip="B" sec={t - from + 0.3} zoom={1.3} ox={50} oy={58} /> : <Img src={staticFile(c.img as string)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 0%'}} />}
              </div>
              <div style={{marginTop: 26, textAlign: 'center'}}>
                <Mt size={44} weight={700}>{c.label}</Mt>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---- 4 CHANNELS: a creator's vertical video, and the three channels as the site's form rows -----------------------------
export const Channels: React.FC<ShotProps> = ({from}) => {
  const {f, t} = useT(from);
  const enter = sp(f, 0, 120, 19);
  const drift = E.sine(prog(f, 0, 86));
  const rows = [
    {at: cue('tiktok') - 0.1, name: 'TikTok'},
    {at: cue('insta') - 0.1, name: 'Instagram'},
    {at: cue('yt') - 0.1, name: 'YouTube'},
  ];
  const all = clamp((f - L(from, cue('sul'))) / 10);
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Bg />
      <div style={{position: 'absolute', inset: 0, transform: `translateY(${lerp(16, -16, drift).toFixed(1)}px)`}}>
        <div
          style={{
            position: 'absolute',
            left: 110,
            top: 330,
            width: 372,
            height: 662,
            borderRadius: 44,
            overflow: 'hidden',
            border: '8px solid #fff',
            boxShadow: '0 40px 100px rgba(20,20,30,0.2)',
            transform: `perspective(2000px) rotateY(${lerp(14, 6, enter).toFixed(2)}deg) scale(${lerp(0.9, 1, enter).toFixed(3)})`,
            opacity: clamp(enter * 1.5),
          }}
        >
          <Stock clip="B" sec={t - 4.75 + 0.3} zoom={1.12} ox={50} oy={56} />
          <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 170, background: 'linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0.38))'}} />
          <svg style={{position: 'absolute', left: 30, bottom: 34}} width="56" height="56" viewBox="0 0 28 28"><path d="M9 6.5v15l12-7.5z" fill="#fff" /></svg>
        </div>
        {rows.map((r, i) => {
          const kk = sp(f, L(from, r.at), 170, 18);
          const glow = all * (0.5 + 0.5 * Math.sin((f - L(from, cue('sul'))) / 4 + i));
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: 516,
                top: 420 + i * 158,
                width: 444,
                height: 124,
                borderRadius: 34,
                background: '#fff',
                boxShadow: SHADOW,
                display: 'flex',
                alignItems: 'center',
                padding: '0 30px',
                boxSizing: 'border-box',
                gap: 22,
                opacity: clamp(kk * 1.6),
                transform: `translateX(${((1 - kk) * 80).toFixed(1)}px)`,
                outline: all > 0 ? `${(3 * all).toFixed(1)}px solid rgba(11,11,11,${(0.12 + 0.2 * glow).toFixed(3)})` : undefined,
              }}
            >
              <span style={{fontFamily: F.sans, fontWeight: 600, fontSize: 40, color: INK, flex: 1}}>{r.name}</span>
              <Check s={50} k={clamp((f - L(from, r.at) - 4) / 12)} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---- 5 PLUS: VINARI+ switched on for you -------------------------------------------------------------------------------
export const Plus: React.FC<ShotProps> = ({from}) => {
  const {f} = useT(from);
  const enter = sp(f, 0, 110, 18);
  const on = E.inOut(clamp((f - L(from, cue('chagirtavt')) + 2) / 8));
  const drift = E.sine(prog(f, 0, 50));
  const x = 150;
  const y = 540;
  const w = 680;
  const h = 470;
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Bg glow={on * 0.6} />
      <div style={{position: 'absolute', inset: 0, perspective: 2400, perspectiveOrigin: '490px 760px'}}>
        <Glass
          x={x}
          y={y}
          w={w}
          h={h}
          r={48}
          style={{transform: `rotateY(${lerp(-24, 0, enter).toFixed(2)}deg) rotateX(${lerp(8, 0, enter).toFixed(2)}deg) scale(${(lerp(0.9, 1, enter) * lerp(1, 1.04, drift)).toFixed(4)})`, opacity: clamp(enter * 1.6)}}
        >
          <div style={{position: 'absolute', left: 64, top: 70, display: 'flex', alignItems: 'flex-end', gap: 14}}>
            <Wordmark w={330} />
            <span style={{fontFamily: F.sans, fontWeight: 700, fontSize: 104, lineHeight: 0.8, color: INK, marginBottom: -4}}>+</span>
          </div>
          <div style={{position: 'absolute', left: 64, right: 64, top: 236, height: 2, background: 'rgba(11,11,11,0.07)'}} />
          <div style={{position: 'absolute', left: 64, top: 292, display: 'flex', flexDirection: 'column', gap: 10}}>
            <Mt size={26} weight={500} color={INK3} spacing={0.05}>წვდომა</Mt>
            <Mt size={44} weight={700}>შენთვის უფასოა</Mt>
          </div>
          {/* the switch, iOS's */}
          <div style={{position: 'absolute', right: 60, top: 306, width: 146, height: 90, borderRadius: 45, background: 'rgba(11,11,11,0.12)'}}>
            <div style={{position: 'absolute', inset: 0, borderRadius: 45, background: GREEN, opacity: on}} />
            <div style={{position: 'absolute', top: 5, left: lerp(5, 61, on), width: 80, height: 80, borderRadius: 40, background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.18)'}} />
          </div>
        </Glass>
      </div>
    </div>
  );
};

// ---- 6 COUPON: the personal code, the site's coupon (dashed ticket, the wordmark, the code typing) ------------------------
export const CODE = 'NIA';
export const Coupon: React.FC<ShotProps & {at?: number}> = ({from}) => {
  const {f} = useT(from);
  const enter = sp(f, 0, 130, 17);
  const t0 = L(from, cue('piradi')) + 4;
  const typed = Math.max(0, Math.min(CODE.length, Math.floor((f - t0) / 4) + 1));
  const caret = Math.floor(f / 8) % 2 === 0;
  const drift = E.sine(prog(f, 0, 38));
  const x = 130;
  const y = 470;
  const w = 720;
  const h = 640;
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Bg />
      <div style={{position: 'absolute', inset: 0, perspective: 2400, perspectiveOrigin: '490px 760px'}}>
        <div style={{position: 'absolute', inset: 0, transform: `translateY(${((1 - enter) * 120).toFixed(1)}px) rotateX(${lerp(14, 0, enter).toFixed(2)}deg) scale(${lerp(1, 1.035, drift).toFixed(4)})`, opacity: clamp(enter * 1.6), transformOrigin: '490px 800px'}}>
          <Glass x={x} y={y} w={w} h={h} r={52} dashed>
            <div style={{position: 'absolute', left: 64, top: 64}}>
              <Mt size={26} weight={500} color={INK2} spacing={0.06}>შენი პირადი კოდი</Mt>
            </div>
            <Wordmark w={150} style={{position: 'absolute', right: 64, top: 62}} />
            <div style={{position: 'absolute', left: 60, top: 130, fontFamily: F.sans, fontWeight: 700, fontSize: 170, letterSpacing: '0.14em', color: INK, display: 'flex', alignItems: 'center'}}>
              {CODE.slice(0, typed)}
              <span style={{display: 'inline-block', width: 8, height: 150, background: INK, marginLeft: 10, opacity: caret ? 1 : 0}} />
            </div>
            {/* the perforation */}
            <div style={{position: 'absolute', left: -22, top: 400, width: 44, height: 44, borderRadius: 22, background: '#EEEEF2'}} />
            <div style={{position: 'absolute', right: -22, top: 400, width: 44, height: 44, borderRadius: 22, background: '#EEEEF2'}} />
            <div style={{position: 'absolute', left: 40, right: 40, top: 421, borderTop: '3px dashed rgba(11,11,11,0.14)'}} />
            <div style={{position: 'absolute', left: 64, top: 470, display: 'flex', gap: 54}}>
              <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                <span style={{fontFamily: F.sans, fontWeight: 500, fontSize: 24, color: INK3, letterSpacing: '0.06em'}}>VINARI+</span>
                <Mt size={31} weight={700}>შენთვის უფასოა</Mt>
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                <Mt size={24} weight={500} color={INK3} spacing={0.06}>შენი წილი</Mt>
                <Mt size={31} weight={700}>ყოველი გადახდიდან</Mt>
              </div>
            </div>
          </Glass>
        </div>
      </div>
    </div>
  );
};
export {Bar, Mark, bodyBox};
