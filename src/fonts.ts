import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

// FiraGO (OFL) carries Georgian, ₾ and tabular figures. DejaVu Sans Mono (free licence) is the
// mono face for meta labels; it also has Mkhedruli, and FiraGO fills anything it lacks (₾).
const fira = (file: string, weight: string) =>
  loadFont({family: 'FiraGO', url: staticFile(`fonts/${file}`), weight, display: 'block'});

export const fontsLoaded = Promise.all([
  fira('FiraGO-Book.otf', '350'),
  fira('FiraGO-Regular.otf', '400'),
  fira('FiraGO-Medium.otf', '500'),
  fira('FiraGO-SemiBold.otf', '600'),
  fira('FiraGO-Bold.otf', '700'),
  loadFont({
    family: 'VinariMono',
    url: staticFile('fonts/DejaVuSansMono.ttf'),
    weight: '400',
    display: 'block',
    unicodeRange: 'U+0000-024F, U+2000-206F, U+2190-21FF, U+2212',
  }),
]);
