// The VINARI navigator promo: its own Remotion entry (npx remotion render src/navpromo/index.ts NavPromo ...), apart from
// the studio's specs, index and checks (a store-free call to action, multi-line small print and a third voice are this
// promo's alone). Built from out/navpromo/storyboard.json; the timeline and the sound come from src/navpromo/build/plan.py.
import {getRemotionEnvironment, registerRoot} from 'remotion';
import {NavRoot} from './Root';

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

registerRoot(NavRoot);
