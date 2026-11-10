#!/usr/bin/env python3
"""The creator story's sound: the ONE narrator take laid whole at TAKE_AT (never re-spaced, never cut), and a sparse bed of
REAL recorded sounds (no synthesis): Kenney's CC0 recordings in public/sfx (cc0-*) and the free downloaded library in
~/.vinari-tools/sfx (freesound CC0 / Mixkit free licence, catalog.json has every source). One sound per action, quiet,
ducked a further 7 dB wherever the voice speaks. No music. Before it: cp take.wav voice.wav && python3 <studio>/tools/master.py voice public/vo/crpromo/voice.wav --plr 11.
Writes public/vo/crpromo/mix.wav (48 kHz stereo); the house
master (~/.vinari-tools/house_master.py) sets the final loudness on the muxed film.   python3 src/crpromo/build/mix.py"""
import json, os, subprocess, sys
import numpy as np
from scipy import signal
HERE = os.path.dirname(os.path.abspath(__file__))
STUDIO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
FF = os.path.expanduser('~/.vinari-tools/opuscar/bin/ffmpeg')
SR = 48000
OUT = os.path.join(STUDIO, 'public', 'vo', 'crpromo')
TL = json.load(open(os.path.join(STUDIO, 'src', 'crpromo', 'timeline.json')))
C = TL['cues']
REC = json.load(open(os.path.join(STUDIO, 'src', 'crpromo', 'rec-manifest.json')))

def load(path):
    raw = subprocess.run([FF, '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()
LIB = os.path.expanduser('~/.vinari-tools/sfx')
KEN = os.path.join(STUDIO, 'public', 'sfx')
_cache = {}
def snd(name):
    if name not in _cache:
        p = os.path.join(KEN, name + '.wav') if name.startswith('cc0-') else os.path.join(LIB, name + '.wav')
        _cache[name] = load(p)
    return _cache[name]

n = int((TL['total'] + 0.6) * SR)
voice = np.zeros((n, 2), np.float32)
# the take, leveled the studio's way first (tools/master.py voice --plr 11, as make.sh does): voice.wav
take = load(os.path.join(OUT, 'voice.wav'))
# the words a touch forward for a phone speaker (the house master's own clarify filter, gently, so its last pass lands
# the 1-4 kHz band at the owner's middle, -13.2 LU, by the house meter too)
sys.path.insert(0, '/Users/admin/Documents/Claude Projects/Vinari/video-studio/tools')
from master import peaking  # noqa: E402
take = peaking(peaking(take.astype(np.float64), SR, 3000, 0.8, 4.2), SR, 280, 1.0, -3.0).astype(np.float32)
at = int(TL['takeAt'] * SR); voice[at:at + len(take)] += take[: n - at]
fx = np.zeros((n, 2), np.float32)

def put(name, t, db, pan=0.0):
    x = snd(name) * (10 ** (db / 20))
    i = int(t * SR)
    if i >= n: return
    m = min(len(x), n - i)
    l, r = np.sqrt(0.5 * (1 - pan)), np.sqrt(0.5 * (1 + pan))
    fx[i:i + m, 0] += x[:m, 0] * l * 1.414
    fx[i:i + m, 1] += x[:m, 1] * r * 1.414

# ---- the shot changes: a soft air, alternating takes (from CrPromo.tsx's SHOTS) ----
shot_from = [1.92, C['manqana'] - 0.25, C['tiktok'] - 0.08, C['plus'] - 0.28, C['piradi'] - 0.14, C['mayurebeli'] - 0.36,
             C['itvleba'] - 0.2, C['tviuri'] - 0.14, C['tan'] - 0.28, C['skrinebs'] - 0.24, C['frazas'] - 0.06, C['saitze'] - 0.5,
             C['blokis'] + 0.04, C['sakheli'] - 0.24, C['chven'] - 0.16, C['bmuli'] - 0.24]
airs = ['ui/swipe_4', 'whoosh/whoosh_short_1', 'ui/swipe_1', 'whoosh/whoosh_short_2']
for k, t in enumerate(shot_from):
    put(airs[k % len(airs)], t - 0.06, -27, pan=(-0.25 if k % 2 else 0.25))
# ---- the hook: the record start, the chain's chips ----
put('ui/glass_tick_2', 0.02, -22)
put('cc0-card-place', C['kodit'] - 0.05, -20, 0.3)
put('ui/success_4', C['gadakhda'] + 0.05, -26, 0.3)
put('cc0-chip', C['wili'] - 0.06, -17, 0.3)
# ---- topics, channels ----
for k, c in enumerate(['manqana', 'gza', 'teqnika']): put('cc0-card-slide', C[c] - 0.1, -22, (k - 1) * 0.4)
for k, c in enumerate(['tiktok', 'insta', 'yt']): put('ui/tap_soft_4', C[c], -21, 0.35)
put('ui/pop_3', C['sul'], -25)
# ---- VINARI+ on, the coupon typing ----
put('cc0-switch', C['chagirtavt'] - 0.02, -15)
put('cc0-card-place', C['piradi'] - 0.12, -22)
for i in range(3): put('cc0-click-tiny', C['piradi'] + 4 / 30 - 0.14 + 0.06 + i * 4 / 30, -21)
# ---- the app: taps, the code, save ----
put('ui/tap_soft_1', C['gakhsnis'] - 0.42, -20)
put('ui/swipe_1', C['ekranze'] - 0.3, -28)
put('ui/tap_soft_1', C['shens'] - 0.18, -20)
for i in range(3): put('cc0-click-tiny', C['shens'] - 0.18 + 5 / 30 + i * 4 / 30, -21)
put('ui/tap_soft_1', C['chawers'] + 0.12, -20)
# ---- payments ----
put('ui/success_4', C['namdvili'], -22)
for c in ['tviuri', 'wliuri', 'ganakhleba']:
    put('cc0-chip', C[c] - 0.08, -21, -0.3)
    put('cc0-chips-stack', C[c] - 0.08 + 0.55, -27, 0.3)
# ---- the kit ----
put('cc0-page-turn', C['tan'] - 0.2, -22)
put('ui/pop_3', C['chatgpt'] - 0.05, -22, 0.3)
put('cc0-card-fan', C['skrinebs'] - 0.3, -20)
for i in range(4): put('cc0-click-tiny', C['frazas'] + 0.1 + i * 0.2, -25)
# ---- the site: the long scroll, the tap, the form typed ----
put('ui/swipe_2', C['bolomde'] - 0.05, -26)
put('ui/tap_soft_4', C['daachire'], -19)
put('ui/swipe_4', C['mokle'] - 0.15, -28)
taps = [C['sakheli'] - 0.15, C['meili'] - 0.04, C['arkhi'] - 0.05, C['auditoria'] + 0.04, C['tema'] - 0.12]
for t in taps: put('ui/tap_soft_4', t, -21)
typing = [(C['sakheli'], C['sakheli'] + 0.32, 3), (C['meili'] + 0.03, C['meili'] + 0.62, 7), (C['arkhi'] + 0.03, C['arkhi'] + 0.5, 7), (C['tema'] - 0.05, C['tema'] + 0.2, 4)]
for a, b, k in typing:
    for i in range(k): put('cc0-click-tiny', a + (b - a) * i / max(1, k - 1), -24 - (i % 2) * 2)
put('cc0-toggle', C['tankhmoba'] + 0.02, -21)
put('ui/tap_soft_4', C['gagzavna'] - 0.06, -19)
put('ui/success_3', C['gagzavna'] + 0.4, -23)
# ---- the mail ----
put('ui/notification_soft_2', C['meilze'] - 0.1, -22)
# ---- the end card ----
put('whoosh/impact_low_soft_1', C['bmuli'] - 0.24, -24)

# duck the bed under the words: the voice's envelope (attack 10 ms, release 220 ms) takes up to 7 dB off
env = np.abs(voice).max(axis=1)
b, a_ = signal.butter(2, 8 / (SR / 2))
env = signal.filtfilt(b, a_, env)
env = env / (env.max() + 1e-9)
gate = np.clip(env / 0.08, 0, 1)
duck = 10 ** (-7 * gate / 20)
fx *= duck[:, None]
mix = voice + fx
peak = np.abs(mix).max()
mix = mix / max(1.0, peak / 0.89)
pcm = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
import wave
with wave.open(os.path.join(OUT, 'mix.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
rms = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
print('mix.wav', f'{len(mix) / SR:.2f}s', 'voice rms', round(rms(voice), 1), 'fx rms', round(rms(fx), 1), 'peak', round(20 * np.log10(peak), 1))
