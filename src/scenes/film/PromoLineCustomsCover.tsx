// demo-promo-line-d's cover (cover.art), the line cover look. „1 იანვარს მანქანა იგივეა, განბაჟება ×3“: the
// calculator's receipt (today's sum struck, the 1 January sum big: the brief's own figures) and a tear-off page of
// 1 January beside it.
import React from 'react';
import {LineArt, LPage, LReceipt, Mono, type LineP} from '../kit/coverline';

export const PromoLineCustomsCover: React.FC<{p: LineP; ctx?: unknown}> = ({p}) => (
  <LineArt p={p}>
    <LReceipt
      x={380}
      y={30}
      w={420}
      h={560}
      head="2020 · 2.0 ლ · ბენზინი"
      rows={[
        ['დღეს', '3 610 ₾', 'strike'],
        ['1 იანვრიდან', '9 615 ₾', 'big'],
        ['სხვაობა', '×3', ''],
      ]}
    />
    <LPage x={110} y={220} w={220} mon="იანვარი" day="01" a={-6} dark />
    <Mono x={590} y={680} size={20} anchor="middle">
      განბაჟება · კალკულატორი
    </Mono>
  </LineArt>
);
