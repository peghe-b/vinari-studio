// The four-navigators hook (4 Nov 2026, a test of ChatGPT's idea 01): its own Remotion entry (npx remotion render src/navhook/index.ts NavHook ...).
import {getRemotionEnvironment, registerRoot} from 'remotion';
import {HookRoot} from './Root';

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

registerRoot(HookRoot);
