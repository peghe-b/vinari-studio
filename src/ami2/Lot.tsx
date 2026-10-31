// Before you buy (v2): a used-car lot in the day (its painted bays, the bunting, the seller all smiles by a white saloon with its
// „იყიდება" sign behind the windscreen), then VINARI's before-purchase check as a clean list of its four real questions
// (ObdBuyCheckView: the clearing's trace, permanent codes, the VIN of the engine computer against the document's, the auction
// history), the first answering in the app's own fair words („ახლახან წაშლილი ჩანს", or a battery change), and the two VINs
// compared character by character until they match. Text only black or white.
import React from 'react';
import {mtav} from '../lib/format';
import {F} from '../tokens';
import {clamp, E, lerp, prog, sp} from './lib';
import {Car3, projectCar, type CarCam} from './kit/car3d';
import {Seller} from './kit/people';
import {Card, INK, Svg, useShot, WHITE} from './kit/stage';

// ---- 32 lot: low on the lot's asphalt at three quarters: the white saloon whole, its sign; the seller beside it opens his hands,
// then a thumbs up -----------------------------------------------------------------------------------------------------------------
const LO_CAM0: CarCam = {pos: [8.4, 1.5, 12.8], target: [-0.2, 0.8, 0.0], fov: 34};
const LO_CAM1: CarCam = {pos: [8.1, 1.48, 12.4], target: [-0.2, 0.8, 0.0], fov: 34};
export const LotShot: React.FC = () => {
  const {t, len, L} = useShot('lot');
  const sAt = L('seller');
  const k = E.inOut(prog(t, 0, len));
  const cam: CarCam = {pos: [lerp(LO_CAM0.pos[0], LO_CAM1.pos[0], k), lerp(LO_CAM0.pos[1], LO_CAM1.pos[1], k), lerp(LO_CAM0.pos[2], LO_CAM1.pos[2], k)], target: LO_CAM0.target, fov: 34};
  const sF = projectCar(cam, [2.35, 0, 1.6]);
  const sH = projectCar(cam, [2.35, 1.78, 1.6]);
  const ws = projectCar(cam, [0.15, 1.18, 0.62]);
  const flags = Array.from({length: 13}, (_, i) => i);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#ECECEC', overflow: 'hidden'}}>
      <Svg>
        <defs>
          <linearGradient id="ltSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#EEF0F3" />
          </linearGradient>
          <linearGradient id="ltGround" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#D9D9D9" />
            <stop offset="1" stopColor="#C4C4C4" />
          </linearGradient>
        </defs>
        <rect width={1080} height={1920} fill="url(#ltSky)" />
        {/* the lot's low back wall and its small office kiosk */}
        <rect x={-40} y={720} width={1160} height={120} fill="#E2E2E2" />
        <rect x={60} y={560} width={260} height={280} fill="#D6D6D6" />
        <rect x={100} y={610} width={180} height={110} fill="#C2C6CB" />
        <rect x={60} y={540} width={260} height={30} fill="#BDBDBD" />
        {/* the asphalt, its painted bays converging */}
        <path d="M-40 840L1120 840L1120 1920L-40 1920Z" fill="url(#ltGround)" />
        {[-3, -2, -1, 0, 1, 2, 3, 4].map((i) => (
          <path key={i} d={`M${540 + i * 150} 840L${540 + i * 420} 1920`} stroke={WHITE} strokeWidth={8} opacity={0.8} />
        ))}
        {/* the bunting on a line across the top */}
        <path d="M-40 420Q540 520 1120 410" stroke="#9A9A9A" strokeWidth={3} fill="none" />
        {flags.map((i) => {
          const x = -10 + i * 90;
          const y = 420 + 100 * Math.sin((Math.PI * (x + 40)) / 1160) - 4;
          const sw = 6 * Math.sin(t / 7 + i);
          return <path key={i} d={`M${x - 26} ${y}L${x + 26} ${y}L${x + sw} ${y + 64}Z`} fill={i % 3 === 0 ? '#2B2B2B' : i % 3 === 1 ? '#FFFFFF' : '#A8A8A8'} />;
        })}
      </Svg>
      <Car3 cam={cam} night={0} paint="#ECEDEF" shadow={1} lamp={0.25} design="sedan" />
      {/* the sign behind the windscreen */}
      <div style={{position: 'absolute', left: ws.x - 70, top: ws.y - 34, width: 140, height: 70, background: WHITE, borderRadius: 6, transform: 'skewY(-6deg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: 24, color: INK, boxShadow: '0 2px 6px rgba(0,0,0,0.15)'}}>{mtav('იყიდება')}</div>
      <Svg>
        <Seller uid="ls" x={sF.x} y={sF.y} size={sF.y - sH.y} frame={t} pose="confident" face="smile" turn={-0.62} light="day" acts={[{at: sAt, pose: 'offer', face: 'grin'}, {at: sAt + 22, pose: 'thumbsUp', face: 'grin'}]} />
      </Svg>
    </div>
  );
};

// ---- 33 checks: the four questions VINARI's before-purchase check asks, row by row; the first answers in the app's fair words -
const ROWS: {title: string; icon: string}[] = [
  {title: 'წაშლის კვალი', icon: 'M5 15L12 8L18 14L13 19H8ZM12 19H20M14.5 10.5L18.5 6.5'},
  {title: 'მუდმივი კოდები', icon: 'M7 11V8A5 5 0 0 1 17 8V11M5 11H19V20H5ZM12 14.5V16.5'},
  {title: 'VIN: ბლოკი და საბუთი', icon: 'M5 4H15L19 8V20H5ZM15 4V8H19M8 12H16M8 15.5H16M8 9H12'},
  {title: 'აუქციონის ისტორია', icon: 'M5 20H15M8 16L14 10M11 7L17 13M13 5L19 11M4 9.5L9.5 4'},
];
export const ChecksShot: React.FC = () => {
  const {t, len, L, Ls} = useShot('checks');
  const rows = Ls('rows');
  const cleared = L('cleared');
  const k = E.inOut(prog(t, 0, len));
  const inK = sp(t, -2, 130, 18);
  const ans = sp(t, cleared, 150, 16);
  // v2.1 (the AD: the card ran edge to edge, into the right rail and under the subtitle): the card inside x 90..870, its foot
  // 80 px above the subtitle; a slow push from its left edge (never past x 887)
  const CX = 90;
  const CW = 780;
  const RH = 172;
  const TOP = 466;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#F3F3F3', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${lerp(1, 1.02, k)})`, transformOrigin: `${CX}px 800px`}}>
        <Card x={CX} y={290} w={CW} h={1040} k={inK} r={56}>
          <div style={{position: 'absolute', left: 50, top: 50, fontFamily: F.sans, fontWeight: 500, fontSize: 32, color: INK}}>VINARI</div>
          <div style={{position: 'absolute', left: 50, top: 94, fontFamily: F.sans, fontWeight: 700, fontSize: 58, color: INK, whiteSpace: 'nowrap'}}>{mtav('ყიდვამდე შემოწმება')}</div>
        </Card>
        {ROWS.map((r, i) => {
          const a = E.out(prog(t, rows[i] - 4, 8));
          const first = i === 0;
          const hi = first ? clamp(ans) : 0;
          const push = i > 0 ? 84 * clamp(ans) : 0;
          return (
            <div key={r.title} style={{position: 'absolute', left: CX + 36, width: CW - 72, top: TOP + i * RH + push, height: first ? 156 + 84 * hi : 156, borderRadius: 32, background: first && hi > 0.01 ? `rgba(11,11,11,${0.95 * hi})` : 'rgba(0,0,0,0.035)', opacity: a, transform: `translateY(${(1 - a) * 24}px)`}}>
              <svg width={64} height={64} viewBox="0 0 24 24" style={{position: 'absolute', left: 30, top: 46}}>
                <path d={r.icon} fill="none" stroke={hi > 0.5 ? WHITE : INK} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div style={{position: 'absolute', left: 120, top: 48, fontFamily: F.sans, fontWeight: 700, fontSize: 43, color: hi > 0.5 ? WHITE : INK, whiteSpace: 'nowrap'}}>{mtav(r.title)}</div>
              {first && hi > 0.01 ? (
                <div style={{position: 'absolute', left: 120, top: 116, opacity: hi, fontFamily: F.sans, whiteSpace: 'nowrap'}}>
                  <div style={{fontWeight: 600, fontSize: 35, color: WHITE}}>{mtav('კოდები ახლახან წაშლილი ჩანს')}</div>
                  <div style={{fontWeight: 400, fontSize: 29, color: WHITE, marginTop: 8}}>{mtav('ან უბრალოდ აკუმულატორი შეიცვალა')}</div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---- 34 vin: the engine computer's VIN against the document's: a highlight runs along both, character by character; they match -
const VIN = 'XW8ZZZ61ZKG000417';
export const VinShot: React.FC = () => {
  const {t, len, L} = useShot('vin');
  const run = L('vinRun');
  const ok = L('vinOk');
  const k = E.inOut(prog(t, 0, len));
  const inK = sp(t, -2, 130, 18);
  const pos = clamp((t - run) / Math.max(1, ok - run - 4)) * VIN.length;
  const okK = sp(t, ok, 170, 15);
  const CW = 46;
  const x0 = 540 - (VIN.length * CW) / 2;
  const line = (y: number, label: string, icon: string) => (
    <>
      <div style={{position: 'absolute', left: x0 - 6, top: y - 74, display: 'flex', alignItems: 'center', gap: 14, fontFamily: F.sans, fontWeight: 500, fontSize: 34, color: INK, whiteSpace: 'nowrap'}}>
        <svg width={44} height={44} viewBox="0 0 24 24">
          <path d={icon} fill="none" stroke={INK} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {mtav(label)}
      </div>
      {VIN.split('').map((c, i) => {
        const seen = i < pos;
        const cur = Math.floor(pos) === i && t < ok;
        return (
          <div key={i} style={{position: 'absolute', left: x0 + i * CW, top: y, width: CW - 6, height: 76, borderRadius: 12, background: cur ? INK : seen ? 'rgba(0,0,0,0.06)' : 'transparent', color: cur ? WHITE : INK, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.mono, fontWeight: 600, fontSize: 44}}>
            {c}
          </div>
        );
      })}
    </>
  );
  return (
    <div style={{position: 'absolute', inset: 0, background: '#F3F3F3', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${lerp(1, 1.03, k)})`, transformOrigin: '540px 800px'}}>
        <Card x={90} y={420} w={900} h={680} k={inK} r={56}>
          <div />
        </Card>
        <div style={{opacity: clamp(inK * 1.5)}}>
          {line(580, 'ძრავის ბლოკში', 'M6 7H18V17H6ZM9 4V7M15 4V7M9 17V20M15 17V20M3 10H6M3 14H6M18 10H21M18 14H21')}
          {line(860, 'საბუთში', 'M5 4H15L19 8V20H5ZM15 4V8H19M8 12H16M8 15.5H16M8 9H12')}
          {/* the equal sign between them, filling as they're compared */}
          <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
            <rect x={540 - 40} y={712} width={80} height={10} rx={5} fill={INK} opacity={0.15 + 0.85 * clamp(pos / VIN.length)} />
            <rect x={540 - 40} y={734} width={80} height={10} rx={5} fill={INK} opacity={0.15 + 0.85 * clamp(pos / VIN.length)} />
          </svg>
        </div>
        {okK > 0.01 ? (
          <div style={{position: 'absolute', left: 0, right: 0, top: 1150, display: 'flex', justifyContent: 'center', opacity: clamp(okK * 1.6), transform: `scale(${lerp(0.85, 1, clamp(okK))})`}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 18, padding: '20px 46px 22px 30px', borderRadius: 999, background: INK, color: WHITE, fontFamily: F.sans, fontWeight: 700, fontSize: 50, whiteSpace: 'nowrap'}}>
              <svg width={52} height={52} viewBox="0 0 24 24">
                <circle cx={12} cy={12} r={11} fill={WHITE} />
                <path d="M7 12.4L10.4 15.6L17.2 8.8" fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {mtav('ემთხვევა')}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const SHOTS: Record<string, React.FC> = {lot: LotShot, checks: ChecksShot, vin: VinShot};
