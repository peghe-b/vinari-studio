// The foreign phone GPS of act 1 (no real app's look, no brand: a generic dark navigation screen drawn in capture px,
// 1080 x 2346, laid on the 3D phone's screen with ScreenLayer): a grey banner with a turn arrow, the distance in FEET and
// a street name it cannot spell, a dark map with the route in a plain blue, the bottom bar in minutes and MILES. States:
//   'turn'    „500 ft · Tchavtchavadze Ave" (the name can be cut short: `name`)
//   'recalc'  „Recalculating..." with a spinner
//   'uturn'   a U-turn arrow, „Make a U-turn"
import React from 'react';
import {F} from '../../tokens';

const BLUE = '#3E7CF0';
const ArrowLeft = () => <path d="M150 210V120Q150 80 110 80H60L60 40 0 100 60 160V120H110V210Z" fill="#FFFFFF" transform="translate(70 -10)" />;
const ArrowU = () => <path d="M60 220V110Q60 40 130 40Q200 40 200 110V170H240L180 240 120 170H160V110Q160 80 130 80Q100 80 100 110V220Z" fill="#FFFFFF" transform="translate(40 -14)" />;

export const GpsScreen: React.FC<{state: 'turn' | 'recalc' | 'uturn'; name?: string; spin?: number; t?: number}> = ({state, name = 'Tchavtchavadze Ave', spin = 0, t = 0}) => {
  const pan = (t * 1.2) % 400;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#15181D', overflow: 'hidden', fontFamily: F.sans}}>
      {/* the map: dark blocks and grey streets, the route in blue */}
      <svg width={1080} height={2346} style={{position: 'absolute', inset: 0}}>
        <g transform={`translate(0 ${pan.toFixed(1)})`}>
          {Array.from({length: 9}).map((_, i) => (
            <g key={i}>
              <rect x={-40} y={-400 + i * 330} width={1200} height={44} fill="#2A2F37" transform={`rotate(-8 540 ${-400 + i * 330})`} />
              <rect x={120 + (i % 3) * 330} y={-600} width={36} height={3400} fill="#252A31" transform={`rotate(14 540 1100)`} />
            </g>
          ))}
          <path d="M540 2600L540 1500Q540 1300 420 1180L180 940" stroke={BLUE} strokeWidth={46} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <circle cx={540} cy={1880} r={38} fill="#FFFFFF" />
        <circle cx={540} cy={1880} r={26} fill={BLUE} />
      </svg>
      {/* the banner */}
      <div style={{position: 'absolute', left: 40, right: 40, top: 150, height: 330, borderRadius: 40, background: '#30353D', boxShadow: '0 12px 40px rgba(0,0,0,0.5)'}}>
        <svg width={300} height={300} style={{position: 'absolute', left: 20, top: 30}}>
          {state === 'turn' ? <ArrowLeft /> : state === 'uturn' ? <ArrowU /> : (
            <g transform={`rotate(${spin * 360} 150 150)`}>
              <circle cx={150} cy={150} r={80} stroke="#5A616C" strokeWidth={22} fill="none" />
              <path d="M150 70A80 80 0 0 1 230 150" stroke="#FFFFFF" strokeWidth={22} fill="none" strokeLinecap="round" />
            </g>
          )}
        </svg>
        {state === 'turn' ? (
          <>
            <div style={{position: 'absolute', left: 330, top: 46, color: '#FFFFFF', fontSize: 120, fontWeight: 700, lineHeight: 1}}>500 ft</div>
            <div style={{position: 'absolute', left: 334, top: 196, color: '#C9CED6', fontSize: 64, fontWeight: 500, whiteSpace: 'nowrap', maxWidth: 680, overflow: 'hidden'}}>{name}</div>
          </>
        ) : state === 'uturn' ? (
          <>
            <div style={{position: 'absolute', left: 330, top: 60, color: '#FFFFFF', fontSize: 96, fontWeight: 700, lineHeight: 1}}>U-turn</div>
            <div style={{position: 'absolute', left: 334, top: 196, color: '#C9CED6', fontSize: 60, fontWeight: 500}}>when possible</div>
          </>
        ) : (
          <div style={{position: 'absolute', left: 330, top: 118, color: '#FFFFFF', fontSize: 84, fontWeight: 600}}>Recalculating...</div>
        )}
      </div>
      {/* the bottom bar: minutes and miles */}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 300, background: '#22262C', borderTopLeftRadius: 50, borderTopRightRadius: 50}}>
        <div style={{position: 'absolute', left: 70, top: 70, color: '#FFFFFF', fontSize: 84, fontWeight: 700}}>9 min</div>
        <div style={{position: 'absolute', left: 420, top: 84, color: '#9AA1AC', fontSize: 64, fontWeight: 500}}>2.4 mi · 21:58</div>
      </div>
    </div>
  );
};
