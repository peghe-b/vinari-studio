// src/scenes/kit/icons.tsx: the app's own icons (./symbols.ts: Material Symbols Rounded, Apache 2.0, as the VINARI app ships
// them, and its few own glyphs), for a film's step markers and labels and the Story slides' Highlight covers. Never SF Symbols.
//   <Sym name="qr_code_2" size={96} color={C.ink} x={540} y={760} />   centred on (x, y) when given, else inline
//   SYM_NAMES   every name there is (car ones: directions_car, car_repair, tire_repair, local_gas_station, ev_station_fill,
//               oil_barrel, speed, car_battery, obd_port, steering_wheel, brake_alert, auto_transmission, local_parking,
//               navigation_fill, calendar_month, qr_code_2, wallet, sell_mirror, notifications, warning, check_circle ...)
import React from 'react';
import {SYMBOLS} from './symbols';

export const SYM_NAMES: readonly string[] = Object.freeze(Object.keys(SYMBOLS));
export const hasSym = (name: string) => Object.prototype.hasOwnProperty.call(SYMBOLS, name);

/** One icon, `size` px square, in one colour. `x`/`y` place its centre (absolute, frame or stage px); without them it sits inline.
 *  `weight` scales a stroked glyph's line (1 the app's). An unknown name draws nothing (the lint names the set). */
export const Sym: React.FC<{name: string; size: number; color: string; x?: number; y?: number; opacity?: number; weight?: number; style?: React.CSSProperties}> = ({
  name,
  size,
  color,
  x,
  y,
  opacity = 1,
  weight = 1,
  style,
}) => {
  const s = hasSym(name) ? SYMBOLS[name] : null;
  if (!s) return null;
  const placed: React.CSSProperties = x !== undefined && y !== undefined ? {position: 'absolute', left: x - size / 2, top: y - size / 2} : {};
  return (
    <svg width={size} height={size} viewBox={s.vb.join(' ')} style={{overflow: 'visible', opacity, ...placed, ...style}}>
      {s.p.map((p, i) =>
        p.w ? (
          <path key={i} d={p.d} fill="none" stroke={color} strokeWidth={p.w * weight} strokeLinecap={(p.cap as 'round') ?? 'butt'} strokeLinejoin={(p.join as 'round') ?? 'miter'} />
        ) : (
          <path key={i} d={p.d} fill={color} />
        ),
      )}
    </svg>
  );
};
