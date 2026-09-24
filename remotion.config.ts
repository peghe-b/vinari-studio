import {Config} from '@remotion/cli/config';
import os from 'node:os';

// The same choices as tools/platform.mjs (this file is bundled to CommonJS by the CLI, so it cannot
// import that module; keep the two in step). The CLI flags make.sh and the tools pass win anyway.
// three.js needs a real GL backend: ANGLE goes through Metal on Apple silicon; a GPU-less Linux runner
// uses 'swangle' (ANGLE on SwiftShader, remotion.dev/docs/gl-options), or env VS_GL.
const mac = process.platform === 'darwin';
Config.setChromiumOpenGlRenderer(mac ? 'angle' : ((process.env.VS_GL || 'swangle') as 'swangle'));
// 8 GB M1: 3 tabs keep the machine cool; a runner uses its cores. Env VS_CONCURRENCY overrides both.
const envConcurrency = Number(process.env.VS_CONCURRENCY);
Config.setConcurrency(Number.isInteger(envConcurrency) && envConcurrency > 0 ? envConcurrency : mac ? 3 : Math.max(2, os.cpus().length - 1));
Config.setCodec('h264');
Config.setPixelFormat('yuv420p');
Config.setColorSpace('bt709'); // limited-range BT.709, so platforms do not crush the near-black field

// Sharp (the owner, 2026-09-24: "ვიდეო შარპენ იყოს"). Measured on v11 (541 frames) against a lossless
// PNG render of the same frames (Y PSNR, and how much of the horizontal detail survives):
//   frames as JPEG 92 (Chrome's JPEG halves the colour resolution before x264 halves it again):
//     49.1 dB luma, 35.3 dB colour; PNG frames cost about 17 ms a frame (+20 % capture time)
//   x264 crf 21 medium (the old setting): 45.7 dB, 90 % of the detail, 4.0 MB
//   crf 16 slower -tune film:              50.5 dB, 99 % of the detail, 12.1 MB (+6.5 s of encoding, in
//     parallel with the capture). -tune film lowers the deblocking (-1:-1), so edges are not smoothed.
//   A 20 s film lands near 13-15 MB: well under the 40 MB budget, and Instagram re-encodes from a
//   cleaner source.
Config.setVideoImageFormat('png');
Config.setCrf(16);
Config.setX264Preset('slower');
Config.overrideFfmpegCommand(({type, args}) => {
  // the video is encoded while the frames are captured (the pre-stitcher) when Remotion's free-memory
  // check allows it; on the 8 GB M1 it often does not, and the stitcher encodes instead: tune both
  if ((type !== 'pre-stitcher' && type !== 'stitcher') || !args.includes('libx264') || args.includes('-tune')) return args;
  const i = args.lastIndexOf('-y');
  return i < 0 ? args : [...args.slice(0, i), '-tune', 'film', ...args.slice(i)];
});
