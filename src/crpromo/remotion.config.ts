// The creator story's render config: the QR promo's (src/qrpromo/remotion.config.ts) settings for the GL and the
// workers, but the film renders to ProRes 422 HQ (an intermediate): build/render.sh then grades the finished picture
// (a gentle global lift) and encodes the master itself (H.264 High, level 5.1, CRF 15, BT.709), and the house master
// sets the sound.
import {Config} from '@remotion/cli/config';
import os from 'node:os';

const mac = process.platform === 'darwin';
Config.setChromiumOpenGlRenderer(mac ? 'angle' : ((process.env.VS_GL || 'swangle') as 'swangle'));
const envConcurrency = Number(process.env.VS_CONCURRENCY);
Config.setConcurrency(Number.isInteger(envConcurrency) && envConcurrency > 0 ? envConcurrency : mac ? 3 : Math.max(2, os.cpus().length - 1));
Config.setCodec('prores');
Config.setProResProfile('hq');
Config.setColorSpace('bt709');
Config.setVideoImageFormat('png');
