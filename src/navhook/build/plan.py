#!/usr/bin/env python3
"""The four-navigators hook (4 Nov 2026): timeline.json (shots, events, word-timed subtitles) and the mastered mix
(public/vo/navhook/mix.wav, 48 kHz stereo, -10.5 LUFS / -1.5 dBTP) from the cached takes and the sound library's real
recordings (~/.vinari-tools/sfx, catalog.json: CC0 / Mixkit / Kenney). Nothing here is synthesized.
    python3 src/navhook/build/plan.py
"""
import json, os, subprocess, wave
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
VO = os.path.join(ROOT, 'public', 'vo', 'navhook')
SFX = os.path.expanduser('~/.vinari-tools/sfx')
FF = os.path.expanduser('~/.vinari-tools/opuscar/bin/ffmpeg')
NAV = '/Users/admin/Documents/Claude Projects/Vinari/Vinari/Resources/NavVoice/nv-male-turn.right.600m.m4a'
SR = 48000
TMP = os.path.join(VO, '.tmp'); os.makedirs(TMP, exist_ok=True)

def load(path, filt=None):
    """any audio file -> 48 kHz mono float (ffmpeg, an optional filter)"""
    out = os.path.join(TMP, os.path.basename(path) + (str(abs(hash(filt))) if filt else '') + '.wav')
    if not os.path.exists(out):
        cmd = [FF, '-v', 'error', '-y', '-i', path] + (['-af', filt] if filt else []) + ['-ac', '1', '-ar', str(SR), out]
        subprocess.run(cmd, check=True)
    w = wave.open(out); a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    return a

def speech(a, thr=-38):
    hop = SR // 100; n = len(a) // hop
    db = 20 * np.log10(np.array([np.sqrt(np.mean(a[i*hop:(i+1)*hop]**2)) for i in range(n)]) + 1e-9)
    on = np.nonzero(db > thr)[0]
    return on[0] / 100, (on[-1] + 1) / 100

V = {k: load(os.path.join(VO, f'{k}.wav')) for k in ['mom', 'gio', 'luka', 'drv', 'drv2', 'mom2']}
V['nav'] = load(NAV)
S = {k: speech(v) for k, v in V.items()}

voice = []   # (key, at = where the clip's sample 0 lands)
t = 0.06
def put(k, start):
    """place clip k so its speech starts at `start`; returns its speech end"""
    voice.append((k, start - S[k][0]))
    return start + S[k][1] - S[k][0]

shots, ev, subs = [], {}, []
e = put('mom', 0.06); ev['mom'] = 0.06; ev['momEnd'] = e
g0 = e + 0.10; shots.append(('mom', 0, g0 - 0.06))
e = put('gio', g0); ev['gio'] = g0; ev['gioEnd'] = e
l0 = e + 0.08; shots.append(('gio', g0 - 0.06, l0 - 0.06))
e = put('luka', l0); ev['luka'] = l0; ev['lukaEnd'] = e
top0 = e + 0.12; shots.append(('luka', l0 - 0.06, top0))
d0 = top0 + 0.95; ev['arms'] = [top0 + 0.10, top0 + 0.32, top0 + 0.54]
e = put('drv', d0); ev['drv'] = d0; ev['drvEnd'] = e
far0 = e + 0.22; shots.append(('top', top0, far0))
ev['chorus'] = [far0 + 0.10, far0 + 0.34, far0 + 0.58]
d20 = far0 + 1.55; shots.append(('far', far0, d20 - 0.12))
e = put('drv2', d20); ev['drv2'] = d20; ev['drv2End'] = e
stop = e + 0.10; ev['stop'] = stop; shots.append(('drv2', d20 - 0.12, stop + 0.30))
nav0 = stop + 0.30 + 0.42; shots.append(('black', stop + 0.30, nav0))
n0 = nav0 + 0.70; e = put('nav', n0); ev['nav'] = n0; ev['navEnd'] = e
m0 = e + 0.30; e = put('mom2', m0); ev['mom2'] = m0; ev['mom2End'] = e
total = e + 0.95; shots.append(('nav', nav0, total))

LINES = {
    'mom': ('მარჯვნივ მოუხვიე, შვილო!', 'white'), 'gio': ('არა, პირდაპირ, ტო!', 'white'),
    'luka': ('ხიდზე გადადი, ხიდზე!', 'white'), 'drv': ('ხმების უმრავლესობით ვუხვევთ?!', 'white'),
    'drv2': ('ეს მანქანაა თუ პარლამენტი?!', 'white'), 'nav': ('600 მეტრში მარჯვნივ მოუხვიე.', 'ink'),
    'mom2': ('ხომ გითხარი!', 'ink'),
}
SAID = {'nav': 'ექვსას მეტრში მარჯვნივ მოუხვიე.'}
VOW = set('აეიოუ')
def weights(said):
    out = []
    ws = said.split()
    for i, w in enumerate(ws):
        k = sum(1.6 if c in VOW else (0.8 if c.isalpha() else 0) for c in w) + 1 + (2 if i == len(ws) - 1 else 0)
        out.append(k)
    return out
for k, (text, tone) in LINES.items():
    a, b = ev[k], ev[k + 'End']
    shown = text.split(); said = SAID.get(k, text).split()
    w = weights(' '.join(said)); cum = np.concatenate([[0], np.cumsum(w)[:-1]]) / sum(w)
    starts = [round(a + c * (b - a), 3) for c in cum]
    if len(shown) != len(said):   # „600“ is said as two words: keep the shown words on the said ones by order
        starts = [starts[0]] + starts[len(said) - len(shown) + 1:]
    subs.append({'text': text, 'start': round(a, 3), 'end': round(b, 3), 'tone': tone, 'words': starts})

tl = {'total': round(total, 3), 'fps': 30, 'shots': [{'id': i, 'from': round(f, 3), 'to': round(to, 3)} for i, f, to in shots],
      'events': {k: (round(v, 3) if not isinstance(v, list) else [round(x, 3) for x in v]) for k, v in ev.items()}, 'subs': subs, 'music': {}}
json.dump(tl, open(os.path.join(ROOT, 'src', 'navhook', 'timeline.json'), 'w'), ensure_ascii=False, indent=1)

# ---- the mix ----------------------------------------------------------------------------------------------------------
N = int((total + 0.3) * SR)
mix = np.zeros(N, np.float32)
def add(a, at, db=0.0, fade_in=0.0, fade_out=0.0, until=None):
    a = a.copy()
    if until is not None: a = a[:max(0, int((until - at) * SR))]
    if fade_in: n = min(len(a), int(fade_in * SR)); a[:n] *= np.linspace(0, 1, n)
    if fade_out: n = min(len(a), int(fade_out * SR)); a[len(a) - n:] *= np.linspace(1, 0, n)
    i = int(round(at * SR))
    if i < 0: a = a[-i:]; i = 0
    j = min(N, i + len(a))
    if j > i: mix[i:j] += a[:j - i] * 10 ** (db / 20)
def bed(path, a0, a1, db, fi=0.08, fo=0.12, filt=None):
    x = load(path, filt); n = int((a1 - a0) * SR) + 1
    while len(x) < n: x = np.concatenate([x, x])
    add(x[:n], a0, db, fi, fo)
for k, at in voice:
    add(V[k], at, {'nav': -1.5, 'mom2': 3.0}.get(k, 0))
# the chorus from afar: the three lines again, overlapped, small and far (low-passed, a short slap of the street)
for (k, at) in zip(['mom', 'gio', 'luka'], ev['chorus']):
    far = load(os.path.join(VO, f'{k}.wav'), 'highpass=f=260,lowpass=f=1500,aecho=0.8:0.5:90:0.3')
    add(far, at - S[k][0], -13)
sh = {i: (f, to) for i, f, to in shots}
car_end = sh['drv2'][1]
bed(f'{SFX}/car/interior_road_hum_loop_1.wav', 0, sh['top'][0], -21, fi=0.02, fo=0.05)
bed(f'{SFX}/city/traffic_road_loop_4.wav', sh['top'][0], sh['top'][1], -24, fi=0.03, fo=0.05)
bed(f'{SFX}/city/traffic_distant_loop_1.wav', sh['far'][0], sh['far'][1], -17, fi=0.02, fo=0.06)
bed(f'{SFX}/car/interior_road_hum_loop_1.wav', sh['drv2'][0], car_end, -21, fi=0.02, fo=0.02)
add(load(f'{SFX}/people/keys_jingle_4.wav'), ev['mom'] + 0.05, -22)          # mom's bracelet as her arm shoots out
add(load(f'{SFX}/people/cloth_rustle_4.wav'), ev['gio'] - 0.12, -17)         # Gio leans in between the seats
add(load(f'{SFX}/people/cloth_rustle_2.wav'), ev['luka'] - 0.10, -19)        # Luka turns to the window
for i, at in enumerate(ev['arms']):
    add(load(f'{SFX}/ui/pop_{[2, 3, 2][i]}.wav'), at, -20)                   # the three arrows pop out of the car
add(load(f'{SFX}/whoosh/whoosh_medium_3.wav'), sh['far'][0] - 0.30, -16)    # the sudden pull to the sky
add(load(f'{SFX}/whoosh/impact_low_soft_1.wav'), sh['drv2'][0], -18)        # the cut back in, close
tape = load(f'{SFX}/misc/tape_stop_1.wav')
add(tape, ev['stop'] - 0.05, -12, fade_out=0.15)                             # everything stops
add(load(f'{SFX}/ui/swipe_2.wav'), sh['nav'][0] + 0.05, -22)                 # the phone rises on the white
raw = os.path.join(TMP, 'mix_raw.wav')
st = np.stack([mix, mix], 1)
pk = np.abs(st).max(); st = st / max(1, pk / 0.98)
with wave.open(raw, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype(np.int16).tobytes())
# two-pass loudnorm to -10.5 LUFS / -1.5 dBTP
m = subprocess.run([FF, '-hide_banner', '-i', raw, '-af', 'loudnorm=I=-10.5:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
j = json.loads(m[m.rindex('{'):m.rindex('}') + 1])
out = os.path.join(VO, 'mix.wav')
af = (f"loudnorm=I=-10.5:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:"
      f"measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
subprocess.run([FF, '-v', 'error', '-y', '-i', raw, '-af', af, '-ar', str(SR), out], check=True)
m2 = subprocess.run([FF, '-hide_banner', '-i', out, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
print('total', round(total, 2), 's;', ' '.join(f"{i} {f:.2f}-{to:.2f}" for i, f, to in shots))
print([l for l in m2.splitlines() if l.strip().startswith(('I:', 'Peak:'))])
