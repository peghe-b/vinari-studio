// demo-promo-line-c's cover (cover.art), the line cover look. „შუქი დაგრჩა, გამვლელი გეტყვის“: the car from above
// with its lights left on, the QR card behind its glass, a dashed leader to the same card drawn big, and the push the
// owner gets.
import React from 'react';
import {LBanner, LCard, LCarTop, LDash, LineArt, LQr, Mono, type LineP} from '../kit/coverline';

export const PromoLineNightCover: React.FC<{p: LineP; ctx?: unknown}> = ({p}) => (
  <LineArt p={p}>
    <LCarTop cx={330} cy={560} L={520} beams />
    <LCard x={285} y={452} w={90} h={90} r={8} />
    <LQr x={296} y={463} s={68} seed={9} />
    <LDash d="M378 470 Q520 420 600 470" />
    <g transform="rotate(4 750 550)">
      <LCard x={600} y={380} w={300} h={340} r={24} />
      <LQr x={640} y={420} s={220} seed={9} />
      <Mono x={750} y={690} size={18} anchor="middle">
        VINARI · QR
      </Mono>
    </g>
    <LBanner x={470} y={110} w={540} title="შუქები ანთია" sub="გამვლელი წერს · ახლა" />
  </LineArt>
);
