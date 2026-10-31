// v2: the engine's parts as clean line pictograms (48-unit grid, round caps and joins), for the explainers: every one of them
// can light the one CHECK lamp. Drawn by the shot in its own colour (white on the dark, ink on the white world).
import React from 'react';

export type PartName = 'plug' | 'coil' | 'o2' | 'cat' | 'injector' | 'cap' | 'thermo' | 'battery' | 'hose' | 'maf' | 'egr' | 'belt';

/** the parts' strokes (and a few fills) in a 48 x 48 box */
export const PART_D: Record<PartName, {d: string; fill?: string}> = {
  // a spark plug: the terminal, the ribbed white insulator, the hex, the thread, the electrode
  plug: {d: 'M24 3V8M20 8H28V22H20ZM20 12H28M20 16H28M17 22H31V28H17ZM19 28H29V38H19ZM19 31.5H29M19 35H29M24 38V42H28'},
  // an ignition coil: the head with its connector, the long boot down to the plug
  coil: {d: 'M14 6H34V18H14ZM34 10H40V15H34M21 18V40Q24 44 27 40V18M18 24H30'},
  // an oxygen sensor: the cable, the hex body, the slotted tip
  o2: {d: 'M24 2C24 8 30 8 30 13M18 13H30V21H18ZM20 21H28V28H20ZM21 28H27V40Q24 44 21 40ZM21 33H27'},
  // the catalytic converter: an oval canister with its pipes in and out
  cat: {d: 'M2 24H10M38 24H46M10 16Q10 12 16 12H32Q38 12 38 16V32Q38 36 32 36H16Q10 36 10 32ZM16 18V30M22 18V30M28 18V30M33 18V30'},
  // a fuel injector: the connector, the body, the O-ring, the nozzle
  injector: {d: 'M16 4H32V10H16ZM19 10H29V26H19ZM18 26H30V30H18ZM21 30H27V38L24 44L21 38Z'},
  // the fuel cap: its round knurled grip
  cap: {d: 'M24 6A18 18 0 1 1 23.99 6ZM24 14A10 10 0 1 1 23.99 14ZM24 6V14M24 34V42M6 24H14M34 24H42'},
  // the thermostat (a coolant thermometer)
  thermo: {d: 'M20 6Q20 2 24 2Q28 2 28 6V28A8 8 0 1 1 20 28ZM24 12V30M32 10H38M32 16H36M32 22H38'},
  // the battery
  battery: {d: 'M6 14H42V40H6ZM12 14V9H18V14M30 14V9H36V14M12 26H18M33 23V29M30 26H36'},
  // a vacuum hose with its clamp
  hose: {d: 'M4 34C12 34 12 14 22 14C32 14 32 34 44 34M8 30V38M40 30V38'},
  // the air mass meter: a short tube with a grille
  maf: {d: 'M8 14H40V34H8ZM14 14V34M34 14V34M20 20H28M20 24H28M20 28H28M2 20H8M2 28H8M40 20H46M40 28H46'},
  // the EGR valve: a round body on a flange, its pipe
  egr: {d: 'M14 10A10 10 0 1 1 13.99 10ZM8 30H40V36H8ZM24 30V20M40 33H46'},
  // the drive belt round two pulleys
  belt: {d: 'M14 10A8 8 0 1 1 13.99 10ZM34 24A10 10 0 1 1 33.99 24ZM14 10L34 24M14 26L34 44'},
};

export const PartIcon: React.FC<{name: PartName; x: number; y: number; size: number; color: string; opacity?: number; width?: number}> = ({name, x, y, size, color, opacity = 1, width = 2.4}) => {
  const s = size / 48;
  return (
    <g transform={`translate(${x - size / 2} ${y - size / 2}) scale(${s})`} opacity={opacity}>
      <path d={PART_D[name].d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </g>
  );
};
