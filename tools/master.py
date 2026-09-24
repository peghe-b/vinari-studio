# The loudness of a film: Reels-level (-10 LUFS) without clipping (true peak <= -1 dBTP) and without
# pumping, in two steps (make.sh runs both; numpy + scipy, like make.sh --mix):
#
#   python3 tools/master.py voice public/vo/<id>/voice.wav [--plr 12]
#       BEFORE the render: levels the voice track in place (a gentle compressor, then a true-peak
#       limiter with a 60 ms release) to a peak-to-loudness ratio of --plr dB, keeping its
#       integrated loudness exactly, so the film's mix (scenes/common.tsx setMix: every sound is set
#       against the voice's loudness) keeps its balance. The source is kept as voice.src.wav and
#       voice.master.json remembers what was made, so a second run on the same file changes nothing.
#   python3 tools/master.py mix in.wav out.wav -10 -1.5
#       AFTER the render: one constant gain to the integrated target (BS.1770) and a true-peak limiter
#       (4x oversampled, 1.5 ms look-ahead, 40 ms release) for the few peaks left (a click on a word).
#       Prints the figures as JSON.
#
# Why not ffmpeg's loudnorm (2026-09-24): its linear mode gives up when the true peak would pass the
# target and falls back to its dynamic mode, whose limiter ate the loudness: the films came out at
# -11.3 to -12.3 LUFS for -10 (v11 even at -0.41 dBTP after the AAC encode), and aiming higher did
# not help (v12 aimed at -8.5 gave -11.7). The voices peak 16-18 dB over their loudness (TTS glottal
# pulses); -10 LUFS at -1 dBTP needs about 9 in the mix. Limiting the finished MIX that hard took 3.5 to
# 5 LU off the voice alone while the sounds between the words kept the full gain: the loudest sound
# events came to 1 LU of the voice (measured on v9, v11, v12 stems). Leveling the voice before the
# render keeps the balance the mix was designed with, and the mix itself then needs only a light limiter.
import hashlib, json, math, os, sys
import numpy as np
from scipy.io import wavfile
from scipy.ndimage import maximum_filter1d, uniform_filter1d
from scipy.signal import lfilter, resample_poly


def read(path):
    fs, x = wavfile.read(path)
    if np.issubdtype(x.dtype, np.integer):
        x = x.astype(np.float64) / (float(np.iinfo(x.dtype).max) + 1.0)
    else:
        x = x.astype(np.float64)
    return fs, (x if x.ndim == 2 else x[:, None])


def kweight(x, fs):
    A = 10 ** (3.99984385397 / 40)
    w0 = 2 * math.pi * 1681.9744509555319 / fs
    al = math.sin(w0) / (2 * 0.7071752369554193)
    c = math.cos(w0)
    a0 = A + 1 - (A - 1) * c + 2 * math.sqrt(A) * al
    y = lfilter([A * (A + 1 + (A - 1) * c + 2 * math.sqrt(A) * al) / a0, -2 * A * (A - 1 + (A + 1) * c) / a0, A * (A + 1 + (A - 1) * c - 2 * math.sqrt(A) * al) / a0],
                [1, 2 * (A - 1 - (A + 1) * c) / a0, (A + 1 - (A - 1) * c - 2 * math.sqrt(A) * al) / a0], x, axis=0)
    w0 = 2 * math.pi * 38.13547087613982 / fs
    al = math.sin(w0) / (2 * 0.5003270373253953)
    return lfilter([1, -2, 1], [1, -2 * math.cos(w0) / (1 + al), (1 - al) / (1 + al)], y, axis=0)


def integrated(x, fs):
    """BS.1770 integrated loudness (400 ms blocks, 75 % overlap, -70 LUFS and -10 LU gates)."""
    k = kweight(x, fs)
    c = np.concatenate([[0], np.cumsum((k ** 2).sum(axis=1))])
    n, h = int(0.4 * fs), int(0.1 * fs)
    st = np.arange(0, max(1, len(c) - n), h)
    z = (c[np.minimum(st + n, len(c) - 1)] - c[st]) / n
    L = -0.691 + 10 * np.log10(np.maximum(z, 1e-20))
    if not (L > -70).any():
        return -70.0
    r = -0.691 + 10 * np.log10(z[L > -70].mean()) - 10
    return float(-0.691 + 10 * np.log10(z[(L > -70) & (L > r)].mean()))


def truepeak(x):
    """Per sample: the largest 4x-oversampled |value| over the channels."""
    n = len(x)
    up = np.abs(resample_poly(x, 4, 1, axis=0)).max(axis=1)
    return up[: n * 4].reshape(n, 4).max(axis=1)


def db(v):
    return 20 * np.log10(np.maximum(v, 1e-12))


def smooth_release(gr, fs, rel_ms):
    """Gain reduction (dB, per sample) that falls back with a `rel_ms` time constant after each peak
    (computed on 1 ms blocks), never below `gr` itself."""
    B = max(1, fs // 1000)
    nb = (len(gr) + B - 1) // B
    blk = np.pad(gr, (0, nb * B - len(gr))).reshape(nb, B).max(axis=1)
    a = math.exp(-1 / rel_ms)
    s, out = 0.0, np.empty(nb)
    for i in range(nb):
        s = max(blk[i], a * s)
        out[i] = s
    held = np.repeat(out, B)[: len(gr)]
    return np.maximum(gr, uniform_filter1d(held, size=B * 3))


def limiter(x, fs, ceil_db, attack_ms, release_ms):
    """Gain reduction in dB per sample so the true peak stays at ceil_db: the look-ahead window rises
    over attack_ms before a peak (held, then smoothed: never under what the peak needs), then falls
    back over release_ms."""
    over = np.maximum(0.0, db(truepeak(x)) - ceil_db)
    S = max(3, int(attack_ms * fs / 1000) | 1)
    fast = uniform_filter1d(maximum_filter1d(over, size=2 * S + 1), size=S)
    return smooth_release(fast, fs, release_ms) if release_ms > 0 else fast


def compressor(x, fs, thr_db, ratio, attack_ms, release_ms, knee=6.0):
    """Gain reduction in dB per sample: 10 ms RMS over thr_db, soft knee, attack/release in ms."""
    B = max(1, fs // 1000)
    N = len(x)
    p = (x ** 2).mean(axis=1)
    cp = np.concatenate([[0], np.cumsum(p)])
    nb = N // B + 1
    centres = np.minimum(np.arange(nb) * B, N - 1)
    h = int(0.005 * fs)
    lo, hi = np.maximum(0, centres - h), np.minimum(N, centres + h)
    lev = 10 * np.log10(np.maximum((cp[hi] - cp[lo]) / np.maximum(1, hi - lo), 1e-20)) - thr_db
    want = np.where(lev <= -knee / 2, 0.0, np.where(lev >= knee / 2, lev, (lev + knee / 2) ** 2 / (2 * knee))) * (1 - 1 / ratio)
    aA, aR = math.exp(-1 / attack_ms), math.exp(-1 / release_ms)
    s, out = 0.0, np.empty(nb)
    for i in range(nb):
        w = want[i]
        s = aA * s + (1 - aA) * w if w > s else aR * s + (1 - aR) * w
        out[i] = s
    la = int(attack_ms)  # look ahead by the attack: the gain is down when the syllable starts
    out = np.concatenate([out[la:], np.repeat(out[-1:], la)])
    return np.interp(np.arange(N), centres, out)


def voice(path, plr):
    d = os.path.dirname(path)
    src, note = os.path.join(d, 'voice.src.wav'), os.path.join(d, 'voice.master.json')
    sha = lambda p: hashlib.sha1(open(p, 'rb').read()).hexdigest()
    cur = sha(path)
    memo = json.load(open(note)) if os.path.exists(note) else {}
    if memo.get('out') == cur and memo.get('plr') == plr:
        print(json.dumps({'voice': 'already leveled', **memo.get('figures', {})}))
        return
    fs, x0 = wavfile.read(path)
    fs, x = read(path)
    I = integrated(x, fs)
    tp0 = float(db(truepeak(x).max()))
    if tp0 - I <= plr:  # already within: nothing to do
        print(json.dumps({'voice': 'within', 'I': round(I, 2), 'plr': round(tp0 - I, 2)}))
        return
    # 1) a gentle compressor: loud syllables down (3:1 over the loudness + 2 dB, 150 ms release)
    cg = compressor(x, fs, I + 2, 3.0, 5, 150)
    gain = 0.0
    for it in range(12):
        y = x * 10 ** ((gain - cg)[:, None] / 20)
        # 2) a true-peak limiter at loudness + plr (3 ms look-ahead, 60 ms release)
        lg = limiter(y, fs, I + plr, 3, 60)
        z = y * 10 ** (-lg[:, None] / 20)
        got = integrated(z, fs)
        if abs(I - got) < 0.02:
            break
        gain += I - got
    tp1 = float(db(truepeak(z).max()))
    if np.issubdtype(x0.dtype, np.integer):
        m = float(np.iinfo(x0.dtype).max)
        out = np.clip(np.round(z * (m + 1)), -m - 1, m).astype(x0.dtype)
    else:
        out = z.astype(x0.dtype)
    if out.shape[1] == 1 and x0.ndim == 1:
        out = out[:, 0]
    if memo.get('out') != cur:  # a new source (vo.py wrote it, or a recording): keep it
        with open(src, 'wb') as f:
            f.write(open(path, 'rb').read())
    tmp = path + '.tmp'
    wavfile.write(tmp, fs, out)
    os.replace(tmp, path)
    loud = (10 * np.log10(np.maximum(uniform_filter1d((x ** 2).mean(axis=1), size=int(0.05 * fs)), 1e-20))) > I - 12
    figures = {'I': round(I, 2), 'I_out': round(got, 2), 'tp_in': round(tp0, 2), 'tp_out': round(tp1, 2), 'plr_in': round(tp0 - I, 2), 'plr_out': round(tp1 - got, 2),
               'makeup_db': round(gain, 2), 'comp_db_speech_mean': round(float(cg[loud].mean()), 2),
               'limiter_db_speech_mean': round(float(lg[loud].mean()), 2), 'limiter_db_max': round(float(lg.max()), 2),
               'limited_pct_of_speech': round(float((lg[loud] > 1).mean() * 100), 1)}
    json.dump({'src': sha(src), 'out': sha(path), 'plr': plr, 'figures': figures}, open(note, 'w'), indent=1)
    print(json.dumps({'voice': 'leveled', **figures}))


def mix(src, dst, target, tp):
    fs, x = read(src)
    I0 = integrated(x, fs)
    tp0 = float(db(truepeak(x).max()))
    gain = target - I0
    for it in range(8):
        y = x * 10 ** (gain / 20)
        lg = limiter(y, fs, tp, 1.5, 40)
        z = y * 10 ** (-lg[:, None] / 20)
        got = integrated(z, fs)
        if abs(target - got) < 0.02:
            break
        gain += target - got
    wavfile.write(dst, fs, np.clip(z, -1, 1).astype(np.float32))
    print(json.dumps({'in_i': round(I0, 2), 'in_tp': round(tp0, 2), 'gain_db': round(gain, 2), 'out_i': round(got, 2), 'out_tp': round(float(db(truepeak(z).max())), 2),
                      'limiter_db_max': round(float(lg.max()), 2), 'limited_pct': round(float((lg > 1).mean() * 100), 2)}))


if __name__ == '__main__':
    a = sys.argv[1:]
    if a and a[0] == 'voice':
        voice(a[1], float(a[a.index('--plr') + 1]) if '--plr' in a else 12.0)
    elif a and a[0] == 'mix':
        mix(a[1], a[2], float(a[3]), float(a[4]))
    else:
        sys.exit('usage: master.py voice <voice.wav> [--plr 12] | master.py mix <in.wav> <out.wav> <LUFS> <dBTP>')
