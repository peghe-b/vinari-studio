import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

// FiraGO (OFL) carries Georgian, ₾ and tabular figures. DejaVu Sans Mono (free licence) is the
// mono face for meta labels; it also has Mkhedruli, and FiraGO fills anything it lacks (₾).
// NotoGeo is Noto Sans Georgian 2.005 (OFL) at width 75, the condensed cut the owner picked ("C", 2026-09-24),
// variable in weight 400..700 (public/fonts/NotoSansGeorgian-OFL.txt says how it was instanced): the film's
// Georgian is set in Mtavruli (lib/format.ts mtav(), the owner: "on one line it is prettier") and FiraGO has no
// Mtavruli glyphs, so every stack reads 'FiraGO, NotoGeo': Latin and digits stay FiraGO, Chrome takes
// the Mtavruli from Noto glyph by glyph. Its range is Georgian only, and its line metrics are FiraGO's
// (the overrides), so a line box with a Mtavruli word is exactly as tall as before.
const fira = (file: string, weight: string) =>
  loadFont({family: 'FiraGO', url: staticFile(`fonts/${file}`), weight, display: 'block'});

export const fontsLoaded = Promise.all([
  fira('FiraGO-Book.otf', '350'),
  fira('FiraGO-Regular.otf', '400'),
  fira('FiraGO-Medium.otf', '500'),
  fira('FiraGO-SemiBold.otf', '600'),
  fira('FiraGO-Bold.otf', '700'),
  loadFont({
    family: 'NotoGeo',
    url: staticFile('fonts/NotoSansGeorgian-VF.ttf'),
    weight: '300 700', // the file is 400..700: a lighter weight (the clock's 350) takes its 400
    display: 'block',
    unicodeRange: 'U+10A0-10FF, U+1C90-1CBF, U+2D00-2D2F',
    ascentOverride: '93.5%',
    descentOverride: '26.5%',
    lineGapOverride: '0%',
  }),
  loadFont({
    family: 'VinariMono',
    url: staticFile('fonts/DejaVuSansMono.ttf'),
    weight: '400',
    display: 'block',
    unicodeRange: 'U+0000-024F, U+2000-206F, U+2190-21FF, U+2212',
  }),
]);
