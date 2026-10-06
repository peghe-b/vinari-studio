#!/usr/bin/env node
// Street words (ci/street-words.json): the owner's mild Georgian folk insults a film may use, the heavy words it
// may never use, and the rotation that keeps them from repeating.
//
//   import {checkStreet} from './ci/streetwords.mjs'
//   checkStreet(text, {last: ['ლოხი']}) -> {errors: string[], used: string[]}
//     errors: a banned word (a word that STARTS with a banned stem; ordinary words that merely contain the
//             letters pass), more than perFilm.max allowed words, or an allowed word the last film already used
//     used:   the allowed words found, in order (record them in the ledger so the next film can rotate)
//
//   node tools/ci/streetwords.mjs "<text>" [--last ლოხი,ჩმო]   prints the result; exit 1 on an error
//   node tools/ci/streetwords.mjs --test                        the built-in cases
//
// Matching is by word start, so a Georgian case ending still counts („ლოხს“, „ლოხო“ are ლოხი; a stem is the
// word minus its final ი/ა/ე/ო when that leaves at least 3 letters). What the list cannot judge (a mother insult,
// a slur aimed at a group, a vulgar line put in a real person's mouth) is the brief's rule, not this check's.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const LIST = JSON.parse(readFileSync(join(HERE, '..', '..', 'ci', 'street-words.json'), 'utf8'))

const norm = (s) => String(s || '').toLowerCase().normalize('NFC')
const words = (text) => norm(text).match(/[\p{L}\p{M}]+/gu) || []
const stem = (w) => {
  const n = norm(w)
  return n.length > 3 && /[იაეო]$/.test(n) ? n.slice(0, -1) : n
}

/** Does the text contain the phrase at a word start (multi-word phrases match across one space)? */
function startsAt(text, phrase) {
  const t = norm(text)
  const p = norm(phrase)
  const re = new RegExp(`(?<![\\p{L}\\p{M}])${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')}`, 'u')
  return re.test(t)
}

export function checkStreet(text, { last = [] } = {}) {
  const errors = []
  for (const b of LIST.banned) {
    if (startsAt(text, b)) errors.push(`banned word "${b}…": never in a film (ci/street-words.json "banned")`)
  }
  const used = []
  for (const w of words(text)) {
    const hit = LIST.allowed.find((a) => w.startsWith(stem(a)))
    if (hit && !used.includes(hit)) used.push(hit)
  }
  const max = LIST.perFilm?.max ?? 3
  if (used.length > max) errors.push(`${used.length} street words (${used.join(', ')}): at most ${max} per film`)
  const again = used.filter((w) => last.map(norm).includes(norm(w)))
  if (again.length) errors.push(`"${again.join('", "')}" was in the last film: rotate (ci/street-words.json "allowed" has ${LIST.allowed.length})`)
  return { errors, used }
}

function selfTest() {
  const cases = [
    ['მამამ მითხრა, უმაქნისი ხარო. არაუშავს!', [], 0, ['უმაქნისი']],
    ['შე ლოხო, მანქანა მოგეყვანა!', [], 0, ['ლოხი']],
    ['დედაშენი რეკავს, აიღე ტელეფონი', [], 0, []],
    ['ფეები და მანქანები', [], 0, []],
    ['შე პიდარასტო', [], 1, []],
    ['ყლეობაა ეს', [], 1, []],
    ['ლოხი, ტუტუცი, ბოთე და ვირი', [], 1, ['ლოხი', 'ტუტუცი', 'ბოთე', 'ვირი']],
    ['შე ჩუჩელავ', ['ჩუჩელა'], 1, ['ჩუჩელა']],
  ]
  let bad = 0
  for (const [text, last, nErr, used] of cases) {
    const r = checkStreet(text, { last })
    const ok = (nErr === 0 ? r.errors.length === 0 : r.errors.length >= 1) && JSON.stringify(r.used) === JSON.stringify(used)
    if (!ok) {
      bad++
      console.log(`FAIL: ${text} -> ${JSON.stringify(r)}`)
    }
  }
  console.log(bad ? `${bad} failed` : `ok: ${cases.length} cases`)
  return bad ? 1 : 0
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2)
  if (args[0] === '--test') process.exit(selfTest())
  const i = args.indexOf('--last')
  const last = i >= 0 ? (args[i + 1] || '').split(',').filter(Boolean) : []
  const text = args.filter((a, k) => k !== i && k !== i + 1).join(' ')
  const r = checkStreet(text, { last })
  console.log(JSON.stringify(r, null, 1))
  process.exit(r.errors.length ? 1 : 0)
}
