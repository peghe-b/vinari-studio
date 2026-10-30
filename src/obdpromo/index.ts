// The VINARI OBD promo (2026-10-30): its own Remotion entry (npx remotion render src/obdpromo/index.ts ObdPromo ...), apart from
// the studio's specs, index and checks (three voices, a bleep, custom 3D shots are this promo's alone). Built from the
// owner's brief of 2026-10-15 (OBD diagnostics the star: even someone who knows nothing about cars understands what is
// wrong); the timeline and the sound come from src/obdpromo/build/plan.py.
import {getRemotionEnvironment, registerRoot} from 'remotion';
import {ObdRoot} from './Root';

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

registerRoot(ObdRoot);
