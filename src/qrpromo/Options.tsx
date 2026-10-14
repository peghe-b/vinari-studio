// 7 the three buttons and the reason (v3, the owner: "explain how the passer-by scans and gets those three options, with
// the good mockup animation of the navigator promo"). The scan's phone leaves his hand (the hand drops away under it) and
// comes forward, whole, on the white, the real page (15-qr-web) on its screen. „სამ ღილაკს დაინახავს:" a cobalt band
// holds all three reasons under a light paper veil; then, as the voice names each, the band steps onto that row and the
// row lifts out of the REAL page as a card (Lift, the navigator promo's), stacking on the right while the phone stands
// stepped to the left and turned toward them (its studio spring, never an overshoot out of the frame). „მიზეზს აირჩევს"
// the second and third sink back into the screen, the phone comes back to the middle and the camera pulls back, the first
// („მანქანა გზას მიკეტავს") rises above it; the band rings it, a tap; it settles back and a large „გაიგზავნა" takes its
// place. Under the next shot's dissolve everything recedes. Cards and phone stay whole inside x 70..1025, y >= 250; the
// phone's foot above the subtitle band.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C, F, rgba} from '../tokens';
import {clamp, E, ev, evs, fr, lerp, prog, shot, sp, XFADE} from './lib';
import {atFoot, bodyBox, cardRect, float, Lift, Phone3, ScreenLayer, TapRing, zoomAbout, type Band, type Pose, type Rect, type Region} from './kit/phone3d';
import {GripBack, GripFront} from './kit/grip';
import {FOOT as SCAN_FOOT, MAN_PAL, OtsBack, PAGE, phonePose} from './Street';

const TAU = Math.PI * 2;
/** the studio's spring turn (critically damped: it never overshoots) */
const swing = (t: number, at: number) => sp(t, at, 110, 21);

// the three reasons on the capture (1080 x 2346; the dashed cards run x 49..1031)
const row = (y0: number, y1: number): Region => ({x0: 49 / 1080, y0: y0 / 2346, x1: 1031 / 1080, y1: y1 / 2346});
const ROWS: Region[] = [row(790, 1002), row(1042, 1254), row(1294, 1506)];
/** the chosen row in capture px (its flash and check, v3.1) */
const ROW_PX = {x0: 49, y0: 790, x1: 1031, y1: 1002};
const ALL: Region = {x0: ROWS[0].x0, y0: ROWS[0].y0, x1: ROWS[0].x1, y1: ROWS[2].y1};
const bandOf = (r: Region): Band => ({x: r.x0 + 0.004, y: r.y0 + 0.0015, w: r.x1 - r.x0 - 0.008, h: r.y1 - r.y0 - 0.003, a: 1});
const mixBand = (a: Band, b: Band, k: number): Band => ({x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k), a: 1});
const mixRect = (a: Rect, b: Rect, k: number): Rect => ({x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k)});

const FOOT = 1398;
const W0 = 452; // the phone out of his hand (display px)
const STEP_X = 352; // its place while the cards are out
const CW = 610; // a side card's width
const SIDE_X = 1014 - CW;
const SIDE_Y = [508, 680, 852];
const TOP = cardRect(ROWS[0], 900, 90, 296); // the chosen one, above the phone
/** where the label sits on a reason card (capture fractions): the tap lands on it */
const LABEL = {u: 0.33};

/** the phone's pose at the shot's frame `t` (pure: the push shot dissolves in over exactly this phone, v3.1) */
export const optionsPose = (t: number): Pose => {
  const base = fr(shot('options').from);
  const len = fr(shot('options').to) - base;
  const scanLen = base - fr(shot('ots').from);
  const opt0 = fr(evs('opt')[0]) - base;
  const sinkAt = fr(ev('sink')) - base;
  const p0 = phonePose(t + scanLen);
  const rel = sp(t, 3, 120, 20);
  const s1 = swing(t, opt0 - 9);
  const s3 = swing(t, sinkAt);
  const fl = float(t);
  const drift = 18 * Math.sin((TAU * t) / 210 - 1.4) * clamp(rel);
  const push = 1 + 0.05 * clamp(t / len);
  const x = lerp(p0.x, 540, rel) + (STEP_X - 540) * (s1 - s3);
  const w = lerp(p0.w, W0, rel) * push * (1 - 0.2 * s3);
  const yaw = lerp(p0.yaw, -3, rel) + 13 * s1 - 13 * s3;
  const pitch = lerp(p0.pitch, 3, rel) + fl.pitch * rel;
  const roll = lerp(p0.roll ?? 0, 0, rel) + fl.roll * rel;
  const foot = lerp(SCAN_FOOT, FOOT, rel) + drift * 0.6;
  let pose = atFoot({x, w, yaw, pitch, roll}, foot);
  pose = {...pose, y: pose.y + fl.bob * rel};
  const out = E.inOut(prog(t, len - 2, XFADE + 2));
  return zoomAbout(pose, 1 - 0.03 * out, 540, FOOT);
};

export const Options: React.FC = () => {
  const t = useCurrentFrame();
  const base = fr(shot('options').from);
  const len = fr(shot('options').to) - base;
  const scanLen = base - fr(shot('ots').from);
  const L = (n: string) => fr(ev(n)) - base;
  const band3 = L('band3');
  const opt = evs('opt').map((o) => fr(o) - base);
  const sinkAt = L('sink');
  const pickAt = L('pick');
  const tapAt = L('tapRow');
  const backAt = L('back');
  const landAt = L('landRow');
  const sentAt = L('sent');

  // ---- the phone: out of his hand, forward to the middle; aside for the cards; back to the middle, pulled back --------
  const pose = optionsPose(t);
  const p0 = phonePose(t + scanLen);
  const rel = sp(t, 3, 120, 20);
  const s1 = swing(t, opt[0] - 9);
  const s3 = swing(t, sinkAt);
  const drift = 18 * Math.sin((TAU * t) / 210 - 1.4) * clamp(rel);

  // ---- his hand lets go: it stays where it held the phone and drops away under it --------------------------------------
  const hb = bodyBox(p0);
  // v3.1 (the art director: it faded as a grey see-through ghost): it falls out of the frame, whole
  const drop = E.in(prog(t, 2, 12));
  const carOut = E.inOut(prog(t, 0, 10));
  const handA = drop < 1 ? 1 : 0;

  // ---- the band and the veil: all three first, then onto each row just before it lifts ---------------------------------
  const veil = 0.3 * E.out(prog(t, band3, 10));
  const bpos = mixBand(
    mixBand(mixBand(mixBand(bandOf(ALL), bandOf(ROWS[0]), E.inOut(prog(t, opt[0] - 7, 8))), bandOf(ROWS[1]), E.inOut(prog(t, opt[1] - 7, 8))), bandOf(ROWS[2]), E.inOut(prog(t, opt[2] - 7, 8))),
    bandOf(ROWS[0]),
    E.inOut(prog(t, pickAt, 8)),
  );
  // v3.1: once the chosen card is back on its row, the band stays on that row (its chosen state)
  const band: Band = {...bpos, a: Math.max(prog(t, band3, 7) * (1 - prog(t, opt[2] + 8, 7)), prog(t, landAt, 4))};

  // ---- the cards ----------------------------------------------------------------------------------------------------------
  const lifted = (i: number) => sp(t, opt[i], 150, 20);
  // v3.1 (the art director: the return was a 4-frame snap that never reached its row): the chosen card glides back over
  // 12 frames, decelerating, exactly onto its row (k ends at 0), its last 3 frames melting into the screen
  const retP = prog(t, backAt, 11);
  const back = (i: number) => (i === 0 ? 0.35 * E.inOut(retP) + 0.65 * E.out(retP) : clamp(sp(t, sinkAt + 3 * (i - 1), 190, 26)));
  const ks = ROWS.map((_, i) => lifted(i) * (1 - back(i)));
  const cardDrift = drift * 1.3;
  const side = (i: number): Rect => {
    const r = cardRect(ROWS[i], CW, SIDE_X, SIDE_Y[i]);
    return {...r, y: r.y + cardDrift};
  };
  // the tap presses the chosen card down (a 4 % dip) until it lets go
  const press = 0.04 * E.out(prog(t, tapAt, 3)) * (1 - E.inOut(prog(t, backAt, 6)));
  const top0 = mixRect(side(0), {...TOP, y: TOP.y + cardDrift * 0.6}, s3);
  const to0 = {x: top0.x + (top0.w * press) / 2, y: top0.y + (top0.h * press) / 2, w: top0.w * (1 - press), h: top0.h * (1 - press)};
  // a soft cobalt ring hugs each card as it lands (its haptic, seen)
  const landRing = (i: number, r: Rect) => {
    const k = prog(t, opt[i] + 7, 14);
    if (k <= 0 || k >= 1 || ks[i] < 0.5) return null;
    const g = 4 + 16 * E.out(k);
    return <div key={`ring${i}`} style={{position: 'absolute', left: r.x - g, top: r.y - g, width: r.w + 2 * g, height: r.h + 2 * g, borderRadius: 30 + g, border: `2px solid ${C.accA}`, opacity: 0.45 * (1 - k)}} />;
  };
  const fogOf = (i: number) => veil * (1 - clamp(ks[i]));

  // ---- the tap and the sent pill --------------------------------------------------------------------------------------------
  // the band rings the chosen card as it rises („მიზეზს აირჩევს") and lets go of it as it leaves
  const ringA = prog(t, pickAt + 8, 6) * (1 - prog(t, backAt, 4));
  // the row flashes cobalt as the card lands on it, then keeps a light tint and a check
  const flash = prog(t, landAt - 1, 3) * (0.1 + 0.4 * (1 - E.out(prog(t, landAt + 2, 14))));
  const checkK = E.outBack(prog(t, landAt + 1, 9));
  const sentK = E.outBack(prog(t, sentAt, 10));
  const pillOut = E.inOut(prog(t, len - 8, 9));
  const pillY = TOP.y + TOP.h / 2 - 68;

  return (
    <div style={{position: 'absolute', inset: 0, background: C.surface, overflow: 'hidden'}}>
      {/* v3.1 (the art director: the car vanished in one frame): the scan's car lifts away and fades over 10 frames */}
      {carOut < 1 ? (
        <div style={{position: 'absolute', inset: 0, transform: `translateY(${(-70 * E.in2(carOut)).toFixed(1)}px)`}}>
          <OtsBack a={1 - carOut} />
        </div>
      ) : null}
      {handA > 0 ? (
        <div style={{position: 'absolute', inset: 0, opacity: handA, transform: `translate(${(drop * 140).toFixed(1)}px, ${(drop * 1250).toFixed(1)}px) rotate(${(drop * 9).toFixed(2)}deg)`, transformOrigin: `${hb.x + hb.w}px ${hb.y + hb.h}px`}}>
          <GripBack b={hb} id="ogb" skin={MAN_PAL.lit} />
          {t < 3 ? null : <GripFront b={hb} id="ogf" skin={MAN_PAL.lit} />}
        </div>
      ) : null}
      <Phone3 src={PAGE} pose={pose} look={1} rim={1} shadow={clamp(rel) * 0.9} veil={veil} band={band} />
      {t < 3 ? <GripFront b={hb} id="ogf0" skin={MAN_PAL.lit} /> : null}
      {[2, 1, 0].map((i) => {
        if (t < opt[i] || (i === 0 ? t >= backAt + 14 : ks[i] < 0.002)) return null;
        const to = i === 0 ? to0 : side(i);
        return (
          <Lift key={i} src={PAGE} r={ROWS[i]} pose={pose} to={to} k={ks[i]} show={i === 0 ? 1 - prog(t, backAt + 11, 3) : 1} radius={40} fog={fogOf(i)} band={i === 0 ? {x0: ROWS[0].x0 + 0.006, y0: ROWS[0].y0 + 0.004, x1: ROWS[0].x1 - 0.006, y1: ROWS[0].y1 - 0.004, a: ringA} : null}>
            {({fx, fy, s}) => (i === 0 ? <TapRing x={fx(ROWS[0].x0 + LABEL.u * (ROWS[0].x1 - ROWS[0].x0))} y={fy((ROWS[0].y0 + ROWS[0].y1) / 2)} k={prog(t, tapAt, 16)} s={s * 1.2} /> : null)}
          </Lift>
        );
      })}
      {ROWS.map((_, i) => (t >= opt[i] ? landRing(i, i === 0 ? to0 : side(i)) : null))}
      {flash > 0 ? (
        <ScreenLayer pose={pose}>
          <div style={{position: 'absolute', left: ROW_PX.x0, top: ROW_PX.y0, width: ROW_PX.x1 - ROW_PX.x0, height: ROW_PX.y1 - ROW_PX.y0, borderRadius: 34, background: C.accA, opacity: flash}} />
          {checkK > 0 ? (
            <svg width={96} height={96} viewBox="0 0 24 24" style={{position: 'absolute', left: ROW_PX.x1 - 96 - 40, top: (ROW_PX.y0 + ROW_PX.y1) / 2 - 48, transform: `scale(${clamp(checkK, 0, 1.2).toFixed(4)})`, opacity: clamp(checkK * 2)}}>
              <circle cx={12} cy={12} r={11} fill={C.accA} />
              <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={16} strokeDashoffset={16 * (1 - clamp((t - landAt - 3) / 6))} />
            </svg>
          ) : null}
        </ScreenLayer>
      ) : null}
      {/* the count: a small cobalt 1, 2, 3 on each card's corner as it lands (gone when the reason is chosen) */}
      {ROWS.map((_, i) => {
        const k = E.outBack(prog(t, opt[i] + 5, 8)) * (1 - E.inOut(prog(t, sinkAt - 2, 7)));
        if (k <= 0.01 || ks[i] < 0.6) return null;
        const r = side(i);
        const d = 50;
        return (
          <div
            key={`n${i}`}
            style={{
              position: 'absolute',
              left: r.x - d * 0.42,
              top: r.y - d * 0.42,
              width: d,
              height: d,
              borderRadius: d / 2,
              background: C.accA,
              color: '#FFFFFF',
              fontFamily: F.sans,
              fontWeight: 700,
              fontSize: 28,
              lineHeight: `${d}px`,
              textAlign: 'center',
              opacity: clamp(k * 1.5),
              transform: `scale(${(0.6 + 0.4 * k).toFixed(4)})`,
              boxShadow: `0 6px 16px ${rgba(C.shade, 0.18)}`,
            }}
          >
            {i + 1}
          </div>
        );
      })}
      {sentK > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: 540 - 290,
            top: pillY,
            width: 580,
            height: 136,
            borderRadius: 68,
            background: C.ink,
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 26,
            fontFamily: F.sans,
            fontWeight: 600,
            fontSize: 58,
            opacity: clamp(sentK * 1.5) * (1 - pillOut),
            transform: `translateY(${((1 - clamp(sentK)) * 30 - 40 * pillOut).toFixed(1)}px) scale(${(0.8 + 0.2 * sentK).toFixed(4)})`,
            boxShadow: `0 24px 60px ${rgba(C.shade, 0.18)}`,
          }}
        >
          <svg width={76} height={76} viewBox="0 0 24 24">
            <circle cx={12} cy={12} r={11} fill="#34C759" />
            <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={16} strokeDashoffset={16 * (1 - clamp((t - sentAt - 2) / 6))} />
          </svg>
          გაიგზავნა
        </div>
      ) : null}
    </div>
  );
};
