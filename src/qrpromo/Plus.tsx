// v5 (the owner, 2026-10-14: "say how and where the card is made, and its big pluses"): the three shots of the new lines.
//   print  „A4-ზე ამობეჭდავ": a home printer in the white studio feeds out an A4 sheet, the REAL card (08-qr-card) printed
//          at its head inside a thin cut line; the camera eases in.
//   spam   „სპამი არ იქნება: ერთი ბარათიდან ხშირად ვერავინ მოგწერს.": her phone on the walnut, the push from before on its
//          glass; the same card tries again three times, each repeat lands under it, is struck out in red and falls away,
//          the phone never buzzes.
//   night  „ღამით, თუ გინდა, უხმოდ მოვა. ბარათს კი ნებისმიერ დროს გათიშავ.": the same phone in the small hours, the
//          quiet-hours moon under the clock; a push slides in without a sound; then the card's own switch, tapped off.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {F} from '../tokens';
import {clamp, E, ev, evs, fr, lerp, prog, shot} from './lib';
import {Phone3, ScreenLayer, type Pose} from './kit/phone3d';
import {Banner, LockScreen, Tap} from './kit/ios';
import {PhoneShadow, Wood} from './Act1';
import {CardArt} from './CardShot';
import {PUSH} from './Push';

const DATE = 'ოთხშაბათი, 14 ოქტომბერი';
const local = (id: string) => {
  const t = useCurrentFrame();
  const base = fr(shot(id).from);
  return {t, base, len: fr(shot(id).to) - base, L: (n: string) => fr(ev(n)) - base};
};

// ---- print -------------------------------------------------------------------------------------------------------------------
const SLOT_Y = 1046; // the output slot (frame px)
const SHEET_W = 560;
const SHEET_H = (SHEET_W * 297) / 210;

const Printer: React.FC = () => (
  <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
    <defs>
      <linearGradient id="prBody" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFFFFF" />
        <stop offset="1" stopColor="#D9DADE" />
      </linearGradient>
      <linearGradient id="prTop" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#F4F4F6" />
        <stop offset="1" stopColor="#FFFFFF" />
      </linearGradient>
      <filter id="prSh" x="-20%" y="-50%" width="140%" height="200%">
        <feGaussianBlur stdDeviation="18" />
      </filter>
    </defs>
    <ellipse cx={540} cy={1352} rx={430} ry={30} fill="rgba(0,0,0,0.16)" filter="url(#prSh)" />
    <rect x={150} y={1004} width={780} height={340} rx={58} fill="url(#prBody)" />
    <rect x={150} y={1004} width={780} height={92} rx={46} fill="url(#prTop)" />
    <rect x={150.75} y={1004.75} width={778.5} height={338.5} rx={57} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={1.5} />
    {/* the slot */}
    <rect x={232} y={SLOT_Y - 12} width={616} height={22} rx={11} fill="#1B1C1F" />
    <rect x={232} y={SLOT_Y + 6} width={616} height={3} rx={1.5} fill="rgba(255,255,255,0.7)" />
    {/* the front: a seam, a small display, the power key with its green light */}
    <rect x={150} y={1178} width={780} height={2} fill="rgba(0,0,0,0.07)" />
    <rect x={214} y={1222} width={168} height={58} rx={14} fill="#25272B" />
    <rect x={232} y={1240} width={70} height={8} rx={4} fill="rgba(255,255,255,0.55)" />
    <rect x={232} y={1256} width={44} height={8} rx={4} fill="rgba(255,255,255,0.3)" />
    <circle cx={852} cy={1251} r={26} fill="#F1F1F3" stroke="rgba(0,0,0,0.1)" strokeWidth={2} />
    <circle cx={852} cy={1251} r={7} fill="#2FCB57" />
  </svg>
);

const Sheet: React.FC = () => {
  const cw = 430;
  return (
    <div style={{width: SHEET_W, height: SHEET_H, background: '#FFFFFF', boxShadow: 'inset 0 0 0 1.5px rgba(0,0,0,0.06)', position: 'relative'}}>
      <div style={{position: 'absolute', left: (SHEET_W - cw) / 2 - 14, top: 52, padding: 12, border: '2.5px dashed #BDBDC2', borderRadius: 10}}>
        <CardArt w={cw} />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{position: 'absolute', left: (SHEET_W - cw) / 2, top: 52 + cw * (456 / 810) + 78 + i * 30, width: i === 2 ? cw * 0.55 : cw, height: 10, borderRadius: 5, background: '#E6E6EA'}} />
      ))}
    </div>
  );
};

export const PrintShot: React.FC = () => {
  const {t, len, L} = local('print');
  const at = L('sheet');
  const k = E.inOut(prog(t, 0, len));
  // the sheet feeds out in the printer's small line steps, its head (the card) first
  const raw = prog(t, at, Math.max(10, len - at - 2));
  const steps = 6;
  const step = Math.floor(raw * steps);
  const p = 0.84 * ((step + E.out(clamp((raw * steps - step) * 1.8))) / steps);
  const top = SLOT_Y - p * SHEET_H;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#F1F1F3', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${lerp(1, 1.06, k)})`, transformOrigin: '540px 900px'}}>
        {/* the paper behind the printer's top: only what has come out of the slot shows */}
        <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: SLOT_Y, overflow: 'hidden'}}>
          <div style={{position: 'absolute', left: 540 - SHEET_W / 2, top, filter: 'drop-shadow(0 18px 30px rgba(0,0,0,0.10))'}}>
            <Sheet />
          </div>
        </div>
        <Printer />
      </div>
    </div>
  );
};

// ---- the phone on the walnut (spam, night) ---------------------------------------------------------------------------------
const BANNER_Y = 900;
const usePose = (t: number, len: number, w0 = 560, w1 = 596): Pose => {
  const k = E.inOut(prog(t, 0, len));
  return {x: 540, y: lerp(800, 792, k), w: lerp(w0, w1, k), yaw: 0, pitch: 0, roll: lerp(-3, -2, k)};
};

/** a red stroke drawn across a banner (capture px) */
const Strike: React.FC<{y: number; k: number}> = ({y, k}) =>
  k > 0 ? (
    <svg width={1080} height={2346} style={{position: 'absolute', left: 0, top: 0}}>
      <path d={`M80 ${y + 112}L${80 + 920 * k} ${y + 88 - 6 * k}`} stroke="#E01B1B" strokeWidth={20} strokeLinecap="round" fill="none" />
    </svg>
  ) : null;

export const SpamShot: React.FC = () => {
  const {t, len, base} = local('spam');
  const reps = evs('spam').map((r) => fr(r) - base);
  const pose = usePose(t, len);
  const REP_Y = BANNER_Y + 236;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#6E4A32', overflow: 'hidden'}}>
      <Wood uid="sp" light={0.8} />
      <PhoneShadow pose={pose} />
      <Phone3 src="qrpromo/lock-night.jpg" pose={pose} look={0.3} rim={0.9} shadow={0} />
      <ScreenLayer pose={pose}>
        <LockScreen wall="qrpromo/lock-night.jpg" time="21:53" date={DATE}>
          <Banner n={PUSH} y={BANNER_Y} k={1} />
          {reps.map((r, i) => {
            if (t < r) return null;
            const k = E.out(prog(t, r, 6));
            const strike = E.inOut(prog(t, r + 8, 6));
            const gone = E.in(prog(t, r + 15, 9));
            if (gone >= 1) return null;
            return (
              <div key={i} style={{position: 'absolute', inset: 0, opacity: 1 - gone, transform: `translateY(${gone * 140}px) rotate(${gone * 3}deg)`, transformOrigin: `540px ${REP_Y}px`}}>
                <div style={{position: 'absolute', inset: 0, opacity: 1 - 0.45 * strike}}>
                  <Banner n={PUSH} y={REP_Y} k={k} />
                </div>
                <Strike y={REP_Y} k={strike} />
              </div>
            );
          })}
        </LockScreen>
      </ScreenLayer>
    </div>
  );
};

// ---- night -------------------------------------------------------------------------------------------------------------------
const Moon: React.FC<{size: number; color: string}> = ({size, color}) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1z" fill={color} />
  </svg>
);

const QrGlyph: React.FC<{size: number}> = ({size}) => {
  const c = '#0B0B0B';
  const box = (x: number, y: number) => (
    <g key={`${x}${y}`}>
      <rect x={x} y={y} width={9} height={9} rx={2} fill="none" stroke={c} strokeWidth={2.2} />
      <rect x={x + 3} y={y + 3} width={3} height={3} fill={c} />
    </g>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      {box(1.5, 1.5)}
      {box(13.5, 1.5)}
      {box(1.5, 13.5)}
      <rect x={14} y={14} width={3} height={3} fill={c} />
      <rect x={19} y={14} width={3} height={3} fill={c} />
      <rect x={14} y={19} width={3} height={3} fill={c} />
      <rect x={19} y={19} width={3} height={3} fill={c} />
    </svg>
  );
};

/** the card's switch (capture px), on 1 .. off 0 */
const Switch: React.FC<{on: number}> = ({on}) => {
  const W = 150;
  const H = 90;
  const g = [52 + (229 - 52) * (1 - on), 199 + (229 - 199) * (1 - on), 89 + (234 - 89) * (1 - on)].map(Math.round);
  return (
    <div style={{position: 'relative', width: W, height: H, borderRadius: H / 2, background: `rgb(${g[0]},${g[1]},${g[2]})`}}>
      <div style={{position: 'absolute', top: 5, left: 5 + (W - H) * on, width: H - 10, height: H - 10, borderRadius: (H - 10) / 2, background: '#FFFFFF', boxShadow: '0 4px 10px rgba(0,0,0,0.18)'}} />
    </div>
  );
};

export const NightShot: React.FC = () => {
  const {t, len, L} = local('night');
  const pose = usePose(t, len, 556, 600);
  const moonK = E.out(prog(t, L('moon'), 10));
  const quiet = L('quiet');
  const pushK = prog(t, quiet, 12);
  const wake = E.inOut(prog(t, quiet - 2, 10));
  const cardK = E.out(prog(t, L('offCard'), 10));
  const tap = L('offTap');
  const on = 1 - E.inOut(prog(t, tap + 2, 6));
  const CARD_Y = 1560;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#4A3122', overflow: 'hidden'}}>
      <Wood uid="ng" light={0.55} />
      <PhoneShadow pose={pose} />
      <Phone3 src="qrpromo/lock-night.jpg" pose={pose} look={0.3} rim={0.7} shadow={0} />
      <ScreenLayer pose={pose}>
        <LockScreen wall="qrpromo/lock-night.jpg" time="03:12" date={DATE} dim={lerp(0.5, 0.12, wake)}>
          {/* the quiet hours' moon under the clock */}
          <div
            style={{
              position: 'absolute',
              left: 540 - 250,
              top: 712,
              width: 500,
              height: 104,
              borderRadius: 52,
              background: 'rgba(255,255,255,0.16)',
              boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 22,
              opacity: moonK,
              transform: `scale(${0.9 + 0.1 * moonK})`,
              fontFamily: F.sans,
              fontWeight: 600,
              fontSize: 44,
              color: '#FFFFFF',
            }}
          >
            <Moon size={52} color="#C9B6FF" />
            ჩუმი საათები
          </div>
          {pushK > 0 ? <Banner n={PUSH} y={BANNER_Y + 10} k={pushK} /> : null}
          {/* the card's own switch */}
          {cardK > 0 ? (
            <div
              style={{
                position: 'absolute',
                left: 40,
                top: CARD_Y,
                width: 1000,
                height: 210,
                borderRadius: 56,
                background: 'rgba(255,255,255,0.94)',
                boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 44px',
                boxSizing: 'border-box',
                gap: 30,
                opacity: cardK,
                transform: `translateY(${(1 - cardK) * 90}px)`,
                fontFamily: F.sans,
              }}
            >
              <div style={{width: 104, height: 104, borderRadius: 26, background: '#F1F1F3', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <QrGlyph size={64} />
              </div>
              <div style={{flex: 1}}>
                <div style={{fontWeight: 600, fontSize: 46, color: '#0B0B0B'}}>QR ბარათი</div>
                <div style={{fontWeight: 400, fontSize: 38, color: '#6A6A6A', marginTop: 4}}>{on > 0.5 ? 'ჩართულია' : 'გათიშულია'}</div>
              </div>
              <Switch on={on} />
            </div>
          ) : null}
          <Tap x={40 + 1000 - 44 - 75} y={CARD_Y + 105} k={prog(t, tap - 1, 12)} />
        </LockScreen>
      </ScreenLayer>
    </div>
  );
};
