# The studio's own meter and limiter (video-studio/tools/master.py), with a bisection on the gain instead of 8 steps.
import sys, json
import numpy as np
sys.path.insert(0, '/Users/admin/Documents/Claude Projects/Vinari/video-studio/tools')
import master as M
from scipy.io import wavfile
src, dst, target, tp = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
REL = float(sys.argv[5]) if len(sys.argv) > 5 else 40.0
fs, x = M.read(src); I0 = M.integrated(x, fs)
def run(g):
    y = x * 10 ** (g / 20); lg = M.limiter(y, fs, tp, 1.5, REL); z = y * 10 ** (-lg[:, None] / 20)
    return M.integrated(z, fs), z, lg
lo, hi = target - I0 - 1, target - I0 + 12
for _ in range(22):
    mid = (lo + hi) / 2; got, z, lg = run(mid)
    if got < target: lo = mid
    else: hi = mid
got, z, lg = run(hi)
wavfile.write(dst, fs, np.clip(z, -1, 1).astype(np.float32))
print(json.dumps({'in_i': round(I0, 2), 'gain_db': round(hi, 2), 'out_i': round(got, 2), 'out_tp': round(float(M.db(M.truepeak(z).max())), 2), 'limiter_db_max': round(float(lg.max()), 2), 'limited_pct': round(float((lg > 1).mean() * 100), 2)}))
