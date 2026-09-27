import {getRemotionEnvironment, registerRoot} from 'remotion';
import {Root} from './Root';

// While rendering (stills, the film, covers), the page may load and run only this bundle's own files: no image,
// font, fetch or frame from outside, and no code built from text (eval, Function). A Film scene
// (src/scenes/film/<Name>.tsx) is written in the cloud from a typed topic; tools/ci/filmlint.mjs refuses anything but
// drawing code, and this is the wall behind it for whatever a static lint cannot see. A <meta> CSP added by a script
// applies to everything after it, which is every scene; Remotion's own driver (the DevTools protocol) is not bound by
// it. The Studio (./make.sh studio) is left alone.
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

registerRoot(Root);
