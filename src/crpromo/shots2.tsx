// Shots 7-13: the viewer's first open of the app and the code typed on „როგორ მოგვაგნე?" (the app's REAL screens),
// every real payment counted (monthly, yearly, every renewal), the creator kit (the ChatGPT file, app screenshots, a
// ready phrase).
import React from 'react';
import {Img, staticFile} from 'remotion';
import {F} from '../tokens';
import {atFoot, float, Lift, Phone3, projectBox, ScreenLayer, type Pose, type Region} from './kit/phone3d';
import {clamp, cue, E, FPS, GREEN, INK, INK2, INK3, lerp, prog, SHADOW, sp} from './lib';
import {Bg, Check, Glass, Mark, Mt, Tap} from './ui';
import {CODE, useT, type ShotProps} from './shots1';

const L = (from: number, s: number) => (s - from) * FPS;
const ONB01 = staticFile('vo/crpromo/onb01.jpg');
const ONB15 = staticFile('vo/crpromo/onb15.jpg');
// regions on the 1080 x 2346 capture of „როგორ მოგვაგნე?" (measured on the 920 x 2000 preview: x / 920, y / 2000)
const R_TITLE: Region = {x0: 40 / 920, y0: 318 / 2000, x1: 620 / 920, y1: 398 / 2000};
const R_FIELD: Region = {x0: 44 / 920, y0: 609 / 2000, x1: 876 / 920, y1: 749 / 2000};
const R_SAVE: Region = {x0: 46 / 920, y0: 776 / 2000, x1: 874 / 920, y1: 892 / 2000};
const START_BTN = {u: 0.5, v: 0.925}; // „დავიწყოთ" on the first screen
const LW = 760; // the lifted field's width
const rx = (r: Region) => ({x: r.x0 * 1080, y: r.y0 * 2346, w: (r.x1 - r.x0) * 1080, h: (r.y1 - r.y0) * 2346});

// ---- 7 + 8 APP: the viewer opens the app for the first time -> „როგორ მოგვაგნე?" -> types the code -> saves ----------
export const AppOpen: React.FC<ShotProps & {to: number}> = ({from, to}) => {
  const {f, t} = useT(from);
  const enter = sp(f, 0, 110, 19);
  const fl = float(f);
  const tapStart = L(from, cue('gakhsnis') - 0.42);
  const slide = E.inOut(clamp((f - L(from, cue('ekranze') - 0.3)) / 10));
  // phase 2 (the code): the phone steps a little closer and faces the viewer
  const p2 = E.inOut(clamp((f - L(from, cue('rogor') - 0.6)) / 18));
  const w = lerp(lerp(330, 404, enter), 440, p2);
  const pose: Pose = atFoot({x: 490, w, yaw: lerp(lerp(-28, -10, enter), -3, p2) + fl.roll, pitch: lerp(6, 3, p2) + fl.pitch, roll: lerp(2, 0, p2)}, lerp(lerp(1330, 1400, enter), 1404, p2));
  // the code
  const fieldTap = L(from, cue('shens') - 0.18);
  const typeAt = fieldTap + 5;
  const typed = Math.max(0, Math.min(CODE.length, Math.floor((f - typeAt) / 4) + 1));
  const saveOn = typed >= CODE.length ? clamp((f - typeAt - 8) / 4) : 0;
  const saveTap = L(from, cue('chawers') + 0.12);
  const lift = sp(f, fieldTap + 2, 120, 16);
  const liftOut = E.in2(clamp((f - (L(from, to) - 10)) / 9));
  const band = clamp((f - L(from, cue('rogor') - 0.1)) / 8) * (1 - clamp((f - fieldTap) / 8));
  const caret = Math.floor(f / 8) % 2 === 0;
  const fr_ = rx(R_FIELD);
  const sv = rx(R_SAVE);
  const tt = rx(R_TITLE);
  const codeText = (scale: number) => (
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.mono, fontWeight: 700, fontSize: 62 * scale, letterSpacing: '0.1em', color: INK}}>
      {CODE.slice(0, typed)}
      <span style={{display: 'inline-block', width: 4 * scale, height: 66 * scale, background: '#0A84FF', marginLeft: 4 * scale, opacity: caret ? 1 : 0}} />
    </div>
  );
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Bg />
      <Phone3 src="vo/crpromo/blank.jpg" pose={pose} look={1} opacity={clamp(enter * 1.8)} />
      <ScreenLayer pose={pose} opacity={clamp(enter * 1.8)}>
        <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: '#F2F2F4'}}>
          <Img src={ONB01} style={{position: 'absolute', left: -1080 * slide * 0.3, top: 0, width: 1080, height: 2346, filter: `brightness(${(1 - 0.08 * slide).toFixed(3)})`}} />
          <Img src={ONB15} style={{position: 'absolute', left: 1080 * (1 - slide), top: 0, width: 1080, height: 2346, boxShadow: '-20px 0 60px rgba(0,0,0,0.12)'}} />
          {/* the title found */}
          {band > 0 ? <div style={{position: 'absolute', left: tt.x - 14, top: tt.y - 8, width: tt.w + 28, height: tt.h + 16, borderRadius: 22, border: '6px solid #0B0B0B', opacity: band}} /> : null}
          {/* the code typed into the real field (a paper patch over its placeholder) */}
          {typed > 0 || f > fieldTap ? (
            <div style={{position: 'absolute', left: fr_.x + 6, top: fr_.y + 6, width: fr_.w - 12, height: fr_.h - 12, borderRadius: 34, background: '#F2F2F4', border: '4px solid rgba(11,11,11,0.5)'}}>{codeText(1)}</div>
          ) : null}
          {saveOn > 0 ? (
            <div style={{position: 'absolute', left: sv.x, top: sv.y, width: sv.w, height: sv.h, borderRadius: sv.h / 2, background: INK, opacity: saveOn, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 50, color: '#fff'}}>შენახვა</div>
          ) : null}
          <Tap x={START_BTN.u * 1080} y={START_BTN.v * 2346} k={(f - tapStart) / 16} s={1.3} />
          <Tap x={fr_.x + fr_.w / 2} y={fr_.y + fr_.h / 2} k={(f - fieldTap) / 16} s={1.3} />
          <Tap x={sv.x + sv.w / 2} y={sv.y + sv.h / 2} k={(f - saveTap) / 16} s={1.3} />
        </div>
      </ScreenLayer>
      {/* the field lifts out, big: the code reads at a glance */}
      {lift > 0.001 ? (
        <Lift src="vo/crpromo/onb15.jpg" r={R_FIELD} pose={pose} to={{x: 110, y: projectBox(pose, R_FIELD).y - 26, w: LW, h: (LW * (R_FIELD.y1 - R_FIELD.y0) * 2346) / ((R_FIELD.x1 - R_FIELD.x0) * 1080)}} k={lift * (1 - liftOut)} show={1 - liftOut} radius={40}>
          {({s}) => {
            const k = (s * LW) / fr_.w;
            return <div style={{position: 'absolute', inset: 6 * k, borderRadius: 34 * k, background: '#F2F2F4', border: `${4 * k}px solid rgba(11,11,11,0.5)`}}>{codeText(k)}</div>;
          }}
        </Lift>
      ) : null}
    </div>
  );
};

// ---- 9 PAY: every real payment counts ---------------------------------------------------------------------------------
export const Pay: React.FC<ShotProps> = ({from}) => {
  const {f} = useT(from);
  const enter = sp(f, 0, 120, 18);
  const ok = clamp((f - L(from, cue('namdvili'))) / 14);
  const drift = E.sine(prog(f, 0, 60));
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Bg />
      <div style={{position: 'absolute', inset: 0, perspective: 2400, perspectiveOrigin: '490px 760px'}}>
        <Glass x={170} y={440} w={640} h={600} r={48} style={{transform: `rotateY(${lerp(20, 0, enter).toFixed(2)}deg) translateY(${((1 - enter) * 90).toFixed(1)}px) scale(${lerp(1, 1.035, drift).toFixed(4)})`, opacity: clamp(enter * 1.6)}}>
          <div style={{position: 'absolute', left: 60, top: 60, display: 'flex', alignItems: 'center', gap: 22}}>
            <div style={{width: 92, height: 92, borderRadius: 24, background: INK, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <Mark w={50} color="#fff" />
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
              <span style={{fontFamily: F.sans, fontWeight: 700, fontSize: 44, color: INK}}>VINARI+</span>
              <Mt size={26} weight={500} color={INK3} spacing={0.04}>გამოწერა</Mt>
            </div>
          </div>
          <div style={{position: 'absolute', left: 60, right: 60, top: 210, height: 2, background: 'rgba(11,11,11,0.07)'}} />
          <div style={{position: 'absolute', left: 60, right: 60, top: 236, display: 'flex', flexDirection: 'column', gap: 0}}>
            {['თვიური', 'წლიური'].map((r, i) => (
              <div key={i} style={{display: 'flex', alignItems: 'center', gap: 18, height: 64, borderBottom: i === 0 ? '2px solid rgba(11,11,11,0.06)' : undefined}}>
                <div style={{width: 26, height: 26, borderRadius: 13, border: '3px solid rgba(11,11,11,0.28)'}} />
                <Mt size={34} weight={600} color={INK2}>{r}</Mt>
              </div>
            ))}
          </div>
          <div style={{position: 'absolute', left: 60, right: 60, bottom: 60, height: 150, borderRadius: 34, background: ok > 0 ? `rgba(31,157,76,${(0.1 * ok).toFixed(3)})` : 'rgba(11,11,11,0.04)', display: 'flex', alignItems: 'center', gap: 24, padding: '0 34px', boxSizing: 'border-box'}}>
            <Check s={78} k={ok} bg={GREEN} />
            <div style={{display: 'flex', flexDirection: 'column', gap: 6, opacity: clamp(ok * 2)}}>
              <Mt size={24} weight={500} color={INK3} spacing={0.05}>ნამდვილი</Mt>
              <Mt size={46} weight={700}>გადახდა</Mt>
            </div>
          </div>
        </Glass>
      </div>
    </div>
  );
};

// ---- 10 RENEW: monthly, yearly and every renewal: each one sends its share to the creator --------------------------------
export const Renew: React.FC<ShotProps> = ({from}) => {
  const {f} = useT(from);
  const pills = [
    {at: cue('tviuri') - 0.08, label: 'თვიური', y: 470},
    {at: cue('wliuri') - 0.08, label: 'წლიური', y: 670},
    {at: cue('ganakhleba') - 0.1, label: 'განახლება', y: 870, renew: true},
  ];
  const share = sp(f, 0, 120, 18);
  const drift = E.sine(prog(f, 0, 76));
  const CX = 780;
  const CY = 730;
  let pulse = 0;
  for (const p of pills) {
    const arrive = L(from, p.at) + 16;
    const d = f - arrive;
    if (d >= 0 && d < 14) pulse = Math.max(pulse, 1 - d / 14);
  }
  const fills = pills.filter((p) => f > L(from, p.at) + 16).length;
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Bg />
      <div style={{position: 'absolute', inset: 0, transform: `translateY(${lerp(10, -14, drift).toFixed(1)}px)`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {pills.map((p, i) => {
            const kk = E.inOut(clamp((f - L(from, p.at) - 4) / 14));
            const x0 = 470;
            const y0 = p.y + 62;
            const d = `M${x0} ${y0} C ${x0 + 120} ${y0}, ${CX - 200} ${CY}, ${CX - 150} ${CY}`;
            return kk > 0 ? <path key={i} d={d} fill="none" stroke="rgba(11,11,11,0.22)" strokeWidth={3} strokeDasharray="2 10" strokeLinecap="round" pathLength={1} style={{strokeDasharray: `${kk} 1`}} /> : null;
          })}
          {pills.map((p, i) => {
            const kk = E.inOut(clamp((f - L(from, p.at) - 4) / 14));
            if (kk <= 0 || kk >= 1) return null;
            const x0 = 470;
            const y0 = p.y + 62;
            const bez = (a: number, b: number, c: number, d2: number, t: number) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d2;
            const x = bez(x0, x0 + 120, CX - 200, CX - 150, kk);
            const y = bez(y0, y0, CY, CY, kk);
            return <circle key={`d${i}`} cx={x} cy={y} r={13} fill={INK} />;
          })}
        </svg>
        {pills.map((p, i) => {
          const kk = sp(f, L(from, p.at), 180, 17);
          return (
            <div key={i} style={{position: 'absolute', left: 120, top: p.y, width: 350, height: 124, borderRadius: 62, background: '#fff', boxShadow: SHADOW, display: 'flex', alignItems: 'center', gap: 18, padding: '0 34px', boxSizing: 'border-box', opacity: clamp(kk * 1.6), transform: `translateX(${((1 - kk) * -70).toFixed(1)}px) scale(${(0.9 + 0.1 * kk).toFixed(3)})`}}>
              {p.renew ? (
                <svg width="48" height="48" viewBox="0 0 24 24" style={{transform: `rotate(${(f * 6).toFixed(1)}deg)`}}><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" /><path d="M19.8 3.5v4.6h-4.6" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              ) : (
                <svg width="46" height="46" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="15" rx="3" fill="none" stroke={INK} strokeWidth="2.2" /><path d="M3 10h18M8 3v4M16 3v4" stroke={INK} strokeWidth="2.2" strokeLinecap="round" /></svg>
              )}
              <Mt size={44} weight={700}>{p.label}</Mt>
            </div>
          );
        })}
        {/* the creator's share */}
        <div style={{position: 'absolute', left: CX - 150, top: CY - 150, width: 300, height: 300, borderRadius: 64, background: INK, boxShadow: '0 40px 90px rgba(10,10,20,0.28)', opacity: clamp(share * 1.6), transform: `scale(${(lerp(0.8, 1, share) * (1 + 0.06 * pulse)).toFixed(4)})`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16}}>
          <div style={{display: 'flex', gap: 10}}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{width: 34, height: 34, borderRadius: 17, border: '3px solid rgba(255,255,255,0.5)', background: i < fills ? '#fff' : 'transparent'}} />
            ))}
          </div>
          <Mt size={26} weight={500} color="rgba(255,255,255,0.6)" spacing={0.05}>შენი</Mt>
          <Mt size={56} weight={700} color="#fff">წილი</Mt>
        </div>
      </div>
    </div>
  );
};

// ---- 11 FILE: a ready file for ChatGPT ------------------------------------------------------------------------------------
export const FileShot: React.FC<ShotProps> = ({from}) => {
  const {f} = useT(from);
  const enter = sp(f, 0, 120, 18);
  const chip = sp(f, L(from, cue('chatgpt')) - 2, 170, 15);
  const drift = E.sine(prog(f, 0, 70));
  const lines = ['1. VINARI მოკლედ', '2. ნავიგატორი ქართული ხმით', '3. OBD სკანერი', '4. უფასოდ და VINARI+-ში', '7. კრეატორის კოდი', '8. ვიდეოს იდეები'];
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Bg />
      <div style={{position: 'absolute', inset: 0, perspective: 2400, perspectiveOrigin: '490px 760px'}}>
        <Glass x={180} y={400} w={620} h={700} r={44} style={{transform: `rotateX(${lerp(16, 0, enter).toFixed(2)}deg) rotateZ(${lerp(-5, -1.5, enter).toFixed(2)}deg) translateY(${((1 - enter) * 100).toFixed(1)}px) scale(${lerp(1, 1.035, drift).toFixed(4)})`, opacity: clamp(enter * 1.6)}}>
          <div style={{position: 'absolute', left: 56, top: 56, display: 'flex', alignItems: 'center', gap: 22}}>
            <svg width="86" height="104" viewBox="0 0 43 52"><path d="M4 2h24l13 13v33a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#fff" stroke={INK} strokeWidth="2.6" /><path d="M28 2v13h13" fill="none" stroke={INK} strokeWidth="2.6" /><text x="21" y="40" textAnchor="middle" fontFamily="FiraGO" fontWeight="700" fontSize="11" fill={INK}>.md</text></svg>
            <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
              <span style={{fontFamily: F.sans, fontWeight: 700, fontSize: 40, color: INK}}>Vinari</span>
              <Mt size={30} weight={600} color={INK2}>ფაილი AI-სთვის</Mt>
            </div>
          </div>
          <div style={{position: 'absolute', left: 56, top: 228, display: 'flex', flexDirection: 'column', gap: 30}}>
            {lines.map((w, i) => (
              <div key={i} style={{opacity: clamp((f - 6 - i * 3) / 8), transform: `translateX(${((1 - E.out(clamp((f - 6 - i * 3) / 12))) * 30).toFixed(1)}px)`}}>
                <Mt size={30} weight={i === 4 ? 700 : 500} color={i === 4 ? INK : INK2}>{w}</Mt>
              </div>
            ))}
          </div>
        </Glass>
        {chip > 0.001 ? (
          <div style={{position: 'absolute', left: 520, top: 330, height: 108, borderRadius: 54, background: INK, display: 'flex', alignItems: 'center', gap: 16, padding: '0 36px 0 24px', boxShadow: '0 24px 60px rgba(10,10,20,0.3)', opacity: clamp(chip * 1.6), transform: `translateY(${((1 - chip) * 40).toFixed(1)}px) scale(${(0.8 + 0.2 * chip).toFixed(3)})`}}>
            <Check s={56} k={chip} bg="#fff" fg={INK} />
            <span style={{fontFamily: F.sans, fontWeight: 600, fontSize: 44, color: '#fff'}}>ChatGPT</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};

// ---- 12 SCREENS: the app's real screenshots, fanned -------------------------------------------------------------------------
export const Screens: React.FC<ShotProps> = ({from}) => {
  const {f} = useT(from);
  const fan = sp(f, 0, 120, 16);
  const imgs = ['vo/crpromo/34-vin-result.jpg', 'screens/17-nav-drive.jpg', 'vo/crpromo/26-diagnostics-hub.jpg'];
  const SW = 246;
  const SH = (SW * 2346) / 1080;
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Bg />
      {imgs.map((src, i) => {
        const d = i - 1;
        const x = 490 + d * 222 * fan - SW / 2;
        const rot = d * 7 * fan;
        const y = 440 + Math.abs(d) * 40 * fan;
        return (
          <div key={i} style={{position: 'absolute', left: x, top: y, width: SW, height: SH, borderRadius: 40, overflow: 'hidden', border: '7px solid #111', boxShadow: '0 30px 80px rgba(20,20,30,0.22)', transform: `rotate(${rot.toFixed(2)}deg) scale(${(0.9 + 0.1 * fan).toFixed(3)})`, zIndex: i === 1 ? 2 : 1, background: '#fff'}}>
            <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
          </div>
        );
      })}
    </div>
  );
};

// ---- 13 PHRASE: a ready phrase for the video ------------------------------------------------------------------------------
export const Phrase: React.FC<ShotProps> = ({from}) => {
  const {f} = useT(from);
  const enter = sp(f, 0, 140, 17);
  const caret = Math.floor(f / 8) % 2 === 0;
  // the creator file's own ready line (Marketing/08, part 7), with this film's example code
  const lines = ['აპის პირველივე გახსნისას,', 'ეკრანზე „როგორ მოგვაგნე?“,', 'ჩაწერე ჩემი კოდი: ' + CODE];
  const words = lines.map((l) => l.split(' '));
  let n = 0;
  const shown = Math.floor((f - 3) / 1.7);
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <Bg />
      <Glass x={140} y={480} w={700} h={560} r={48} style={{transform: `translateY(${((1 - enter) * 80).toFixed(1)}px) scale(${lerp(0.94, 1, enter).toFixed(3)})`, opacity: clamp(enter * 1.6)}}>
        <div style={{position: 'absolute', left: 50, top: 18, fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 150, color: 'rgba(11,11,11,0.14)', lineHeight: 1}}>„</div>
        <div style={{position: 'absolute', left: 60, right: 50, top: 170, display: 'flex', flexDirection: 'column', gap: 22}}>
          {words.map((ws, li) => (
            <div key={li} style={{display: 'flex', flexWrap: 'nowrap', gap: 12, alignItems: 'center'}}>
              {ws.map((w, wi) => {
                const k = n++;
                const on = clamp(shown - k + 1);
                return (
                  <span key={wi} style={{opacity: on, transform: `translateY(${((1 - on) * 8).toFixed(1)}px)`}}>
                    {w === CODE ? <span style={{fontFamily: F.sans, fontWeight: 700, fontSize: 42, color: INK, letterSpacing: '0.08em'}}>{w}</span> : <Mt size={38} weight={li === 1 ? 700 : 500} color={INK}>{w}</Mt>}
                  </span>
                );
              })}
              {li === 2 && shown >= n ? <span style={{display: 'inline-block', width: 5, height: 44, background: INK, opacity: caret ? 1 : 0}} /> : null}
            </div>
          ))}
        </div>
        <div style={{position: 'absolute', left: 60, bottom: 46}}>
          <Mt size={26} weight={500} color={INK3} spacing={0.05}>მზა ფრაზა ვიდეოსთვის</Mt>
        </div>
      </Glass>
    </div>
  );
};
