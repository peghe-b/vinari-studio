// The next film number in specs/ (the number P2_FROM in src/lib/p2.mjs is set to when phase 2 merges, so every film main made
// before the merge renders as made):   node tools/ci/p2-next.mjs [--set]   (--set writes it into src/lib/p2.mjs)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const nums = fs.readdirSync(path.join(root, 'specs')).map((f) => /^v(\d+)-/.exec(f)?.[1]).filter(Boolean).map(Number);
const next = Math.max(0, ...nums) + 1;
if (process.argv.includes('--set')) {
  const f = path.join(root, 'src/lib/p2.mjs');
  const s = fs.readFileSync(f, 'utf8');
  const t = s.replace(/export const P2_FROM = \d+;/, `export const P2_FROM = ${next};`);
  if (t === s && !s.includes(`export const P2_FROM = ${next};`)) throw new Error('P2_FROM not found in src/lib/p2.mjs');
  fs.writeFileSync(f, t);
  console.log(`P2_FROM = ${next}`);
} else console.log(next);
