#!/usr/bin/env python3
"""The two added phrases as separate files for the owner (he lays them on the v2 film himself): the same Algieba,
gemini-3.8-flash-tts and STYLE as v2 (phrases.py: „შენთვის კარგი ამბავი გვაქვს.“ voiced alone; „წარმატებები.“ cut from
„ბმული სტორიშივეა. წარმატებები.“ voiced together, which continued the narrator best). Each: trimmed to its words with
0.1 s of air at both ends, the v2 voice chain (tools/master.py voice --plr 11, the mix's presence EQ: +4.2 dB at 3 kHz,
-3 dB at 280 Hz), 48 kHz stereo, set to -10.5 LUFS over the words with a -1.5 dBTP true-peak ceiling (master.py mix),
AAC 256k .m4a.   python3 phrases_export.py <outdir>"""
import os, shutil, subprocess, sys, wave
import numpy as np
from scipy.io import wavfile
HERE = os.path.dirname(os.path.abspath(__file__))
VO = os.path.join(os.path.abspath(os.path.join(HERE, '..', '..', '..')), 'public', 'vo', 'crpromo')
TOOLS = '/Users/admin/Documents/Claude Projects/Vinari/video-studio/tools'
sys.path.insert(0, TOOLS)
from master import peaking  # noqa: E402
FF = os.path.expanduser('~/.vinari-tools/opuscar/bin/ffmpeg')
TMP = '/private/tmp/claude-501/cr/phr'
dest = sys.argv[1]
# the leveler is skipped for the one-word wish: on 0.8 s it limited 7.8 dB over 96 % of the word (squashed); the final
# true-peak limiter alone takes about 3.5 dB off its peaks
for src, name, level in [('ph_open.wav', 'ხმა-დასაწყისი-შენთვის-კარგი-ამბავი', True), ('ph_wish_c1.wav', 'ხმა-ბოლო-წარმატებები', False)]:
    sr, a = wavfile.read(os.path.join(VO, src)); a = a.astype(np.float64) / 32768
    hop = sr // 100; env = np.array([np.sqrt(np.mean(a[i:i + hop] ** 2)) for i in range(0, len(a) - hop, hop)])
    on = np.where(env > env.max() * 10 ** (-38 / 20))[0]
    s, e = max(0, on[0] * hop - int(0.1 * sr)), min(len(a), (on[-1] + 1) * hop + int(0.1 * sr))
    x = a[s:e]
    n = int(0.012 * sr); x[:n] *= np.linspace(0, 1, n); x[-n:] *= np.linspace(1, 0, n)
    d = os.path.join(TMP, src[:-4]); shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
    wavfile.write(f'{d}/voice.wav', sr, (x * 32767).astype(np.int16))
    if level: print(subprocess.run(['python3', f'{TOOLS}/master.py', 'voice', f'{d}/voice.wav', '--plr', '11'], capture_output=True, text=True).stdout.strip())
    sr, y = wavfile.read(f'{d}/voice.wav'); y = y.astype(np.float64) / 32768
    y = peaking(peaking(y, sr, 3000, 0.8, 4.2), sr, 280, 1.0, -3.0)
    wavfile.write(f'{d}/eq.wav', sr, (np.clip(y, -1, 1) * 32767).astype(np.int16))
    subprocess.run([FF, '-v', 'error', '-y', '-i', f'{d}/eq.wav', '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s24le', f'{d}/st.wav'], check=True)
    j = subprocess.run(['python3', f'{TOOLS}/master.py', 'mix', f'{d}/st.wav', f'{d}/m.wav', '-10.5', '-1.5'], capture_output=True, text=True, check=True).stdout.strip().splitlines()[-1]
    print(name, j)
    out = os.path.join(dest, name + '.m4a')
    subprocess.run([FF, '-v', 'error', '-y', '-i', f'{d}/m.wav', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', out], check=True)
    print(out)
