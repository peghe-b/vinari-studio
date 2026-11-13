// demo-promo-line-b's cover (cover.art), the line cover look on a DARK cover (one film in six). „ძრავამ ცეკვა
// ისწავლა“ (P0300): the code typed into the app's lookup, the answer in Georgian, and the engine's shake drawn as two
// pairs of wavy lines beside the card.
import React from 'react';
import {LCodeCard, LineArt, lp, Mono, type LineP} from '../kit/coverline';

export const PromoLineCodeCover: React.FC<{p: LineP; ctx?: unknown}> = ({p}) => {
  const t = lp();
  const shake = (x0: number, s: number) => (
    <g key={x0}>
      <path d={`M${x0} 300 q${s * 18} 16 0 32 q${-s * 18} 16 0 32 q${s * 18} 16 0 32`} fill="none" stroke={t.ink} strokeWidth={3} strokeLinecap="round" />
      <path d={`M${x0 + s * 26} 312 q${s * 14} 14 0 28 q${-s * 14} 14 0 28`} fill="none" stroke={t.faint} strokeWidth={2.5} strokeLinecap="round" />
    </g>
  );
  return (
    <LineArt p={p}>
      <LCodeCard x={150} y={40} w={780} code="P0300" sub="P0300 · ძრავა" title={['რამდენიმე ცილინდრის', 'გამოტოვება']} lines={['ძრავა უქმ სვლაზე კანკალებს', 'ჩეკი ანთია ან ციმციმებს', 'ჯერ სანთლები და კოჭები']} />
      <Mono x={190} y={700} size={22}>
        9 533 კოდი · ქართულად
      </Mono>
      {shake(90, 1)}
      {shake(990, -1)}
    </LineArt>
  );
};
