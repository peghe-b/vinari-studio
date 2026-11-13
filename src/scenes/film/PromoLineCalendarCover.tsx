// demo-promo-line-a's cover (cover.art), the line cover look (the owner, 2026-11-13: „კაია, მომწონს ეგ სტილები,
// ლამაზია, ესთეტიურია“). „სკლეროზი გაქვს? არაუშავს“: the calendar's month card with every date on it, the 23rd circled,
// and the list of what is coming with its days. Thin line, white cards, the app's own words.
import React from 'react';
import {LineArt, LList, LMonth, type LineP} from '../kit/coverline';

export const PromoLineCalendarCover: React.FC<{p: LineP; ctx?: unknown}> = ({p}) => (
  <LineArt p={p}>
    <LMonth x={90} y={20} name="ნოემბერი" year="2026" first={6} marks={[4, 11, 19, 23, 27]} circled={23} />
    <LList
      x={520}
      y={520}
      w={500}
      rows={[
        ['ზეთის შეცვლა', '4 დღე'],
        ['დაზღვევა', '10 დღე'],
        ['ტექდათვალიერება', '53 დღე'],
      ]}
    />
  </LineArt>
);
