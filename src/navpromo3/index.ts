// The VINARI navigator + CarPlay promo (2026-10-21): its own Remotion entry (npx remotion render src/navpromo3/index.ts
// NavCarPlay ...), apart from the studio's specs, index and checks (three Gemini voices, the app's real navigator clips and the
// custom shots are this promo's alone). Built from the owner's brief of 2026-10-21 (a new problem story, a glamorous woman,
// the black beat and the phone in from the SIDE, the Georgian navigator, CarPlay and how to connect it); the timeline and the
// sound come from src/navpromo3/build/plan.py.
import {getRemotionEnvironment, registerRoot} from 'remotion';
import {NavCpRoot} from './Root';

// the same wall as the studio's entry: while rendering, the page loads only this bundle's own files
if (typeof document !== 'undefined' && getRemotionEnvironment().isRendering) {
  const m = document.createElement('meta');
  m.httpEquiv = 'Content-Security-Policy';
  m.content = [
    "default-src 'self' data: blob:",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data: blob:",
    "media-src 'self' data: blob:",
    "connect-src 'self' data: blob:",
    "worker-src 'self' blob:",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');
  document.head.appendChild(m);
}

registerRoot(NavCpRoot);
