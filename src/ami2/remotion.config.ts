// The diagnostics promo's own render config: a copy of the QR promo's (src/qrpromo/remotion.config.ts), the studio's
// remotion.config.ts word for word, except the quality knob. The brief asks for 6 to 10 Mbps; the studio's crf 16 gave this
// mostly flat, white film 1.8 Mbps (measured 2026-10-12), and a CLI --video-bitrate collides with that config's crf, so this
// promo targets 8 Mbps instead of a crf (slower preset, tune film, PNG frames, BT.709 limited range, as the studio).
import {Config} from '@remotion/cli/config';
import os from 'node:os';

const mac = process.platform === 'darwin';
Config.setChromiumOpenGlRenderer(mac ? 'angle' : ((process.env.VS_GL || 'swangle') as 'swangle'));
const envConcurrency = Number(process.env.VS_CONCURRENCY);
Config.setConcurrency(Number.isInteger(envConcurrency) && envConcurrency > 0 ? envConcurrency : mac ? 3 : Math.max(2, os.cpus().length - 1));
Config.setCodec('h264');
Config.setPixelFormat('yuv420p');
Config.setColorSpace('bt709');
Config.setVideoImageFormat('png');
Config.setVideoBitrate('8M');
Config.setX264Preset('slower');
Config.overrideFfmpegCommand(({type, args}) => {
  if ((type !== 'pre-stitcher' && type !== 'stitcher') || !args.includes('libx264') || args.includes('-tune')) return args;
  const i = args.lastIndexOf('-y');
  return i < 0 ? args : [...args.slice(0, i), '-tune', 'film', ...args.slice(i)];
});
