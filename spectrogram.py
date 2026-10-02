# spectrogram.py: a labelled mel spectrogram of the whole track, for Terra to share with the 5.5 instance that
# wrote the lyrics. librosa for the analysis, PIL for the drawing (no matplotlib in the pbloom venv).
# Run: ../pbloom_mv/.venv/bin/python spectrogram.py
import os, numpy as np, librosa
from PIL import Image, ImageDraw, ImageFont
SRC, OUT = "Names I don't Know.wav", 'out/names_i_dont_know_spectrogram.jpg'
y, sr = librosa.load(SRC, sr=None, mono=True); dur = len(y) / sr
FMIN, FMAX, HOP = 30, 16000, 600
S = librosa.feature.melspectrogram(y=y, sr=sr, n_fft=4096, hop_length=HOP, n_mels=320, fmin=FMIN, fmax=FMAX, power=2.0)
D = librosa.power_to_db(S, ref=np.max, top_db=80)                    # 0 dB = the loudest bin in the song
k = (D + 80) / 80                                                    # 0..1
STOPS = [(0, 0, 4), (28, 16, 68), (79, 18, 123), (129, 37, 129), (181, 54, 122), (229, 80, 100), (251, 135, 97), (254, 194, 135), (252, 253, 191)]
def magma(v):
  x = np.clip(v, 0, 1) * (len(STOPS) - 1); i = np.minimum(x.astype(int), len(STOPS) - 2); f = (x - i)[..., None]
  a, b = np.array(STOPS)[i], np.array(STOPS)[i + 1]; return (a + (b - a) * f).astype(np.uint8)
rms = librosa.feature.rms(y=y, frame_length=4096, hop_length=HOP)[0]; rms_db = np.clip((librosa.amplitude_to_db(rms, ref=np.max) + 48) / 48, 0, 1)

PW, PH, ML, MR, MT, MB, LH = 1900, 600, 92, 30, 74, 70, 90             # plot size, margins, loudness strip height
img = Image.new('RGB', (ML + PW + MR, MT + PH + 14 + LH + MB), (14, 12, 18)); d = ImageDraw.Draw(img)
spec = Image.fromarray(magma(k[::-1])).resize((PW, PH), Image.LANCZOS); img.paste(spec, (ML, MT))
def font(sz, bold=False):
  for p in (['/System/Library/Fonts/Supplementary/Arial Bold.ttf', '/Library/Fonts/Arial Bold.ttf'] if bold else []) + ['/System/Library/Fonts/Supplementary/Arial.ttf', '/Library/Fonts/Arial.ttf', '/System/Library/Fonts/Helvetica.ttc']:
    if os.path.exists(p): return ImageFont.truetype(p, sz)
  return ImageFont.load_default()
F, FB, FT = font(19), font(19, True), font(30, True)
INK, GRID = (232, 226, 236), (255, 255, 255, 60)
mel = lambda hz: librosa.hz_to_mel(hz); m0, m1 = mel(FMIN), mel(FMAX)
yof = lambda hz: MT + PH * (1 - (mel(hz) - m0) / (m1 - m0))
ov = Image.new('RGBA', img.size, (0, 0, 0, 0)); do = ImageDraw.Draw(ov)
for hz, lab in [(100, '100'), (250, '250'), (500, '500'), (1000, '1k'), (2000, '2k'), (4000, '4k'), (8000, '8k'), (16000, '16k')]:
  yy = yof(hz); do.line([(ML, yy), (ML + PW, yy)], fill=(255, 255, 255, 38)); d.text((ML - 10, yy), lab, font=F, fill=INK, anchor='rm')
d.text((22, MT + PH / 2), 'Hz', font=FB, fill=INK, anchor='lm')
xof = lambda s: ML + PW * s / dur
for s in range(0, int(dur) + 1, 15):
  xx = xof(s); major = s % 30 == 0
  do.line([(xx, MT), (xx, MT + PH)], fill=(255, 255, 255, 46 if major else 22))
  do.line([(xx, MT + PH + 14), (xx, MT + PH + 14 + LH)], fill=(255, 255, 255, 46 if major else 22))
  if major: d.text((xx, MT + PH + 14 + LH + 10), f'{s // 60}:{s % 60:02d}', font=F, fill=INK, anchor='mt')
img.paste(Image.alpha_composite(img.convert('RGBA'), ov).convert('RGB'))
# loudness strip: RMS in dB (−48..0), filled
d = ImageDraw.Draw(img); y0 = MT + PH + 14; pts = [(ML, y0 + LH)]
xs = np.linspace(0, len(rms_db) - 1, PW).astype(int)
for i, j in enumerate(xs): pts.append((ML + i, y0 + LH - rms_db[j] * (LH - 4)))
pts.append((ML + PW, y0 + LH)); d.polygon(pts, fill=(229, 80, 100)); d.rectangle([ML, y0, ML + PW, y0 + LH], outline=(90, 84, 98))
d.text((ML - 10, y0 + LH / 2), 'loud', font=F, fill=INK, anchor='rm')
d.rectangle([ML, MT, ML + PW, MT + PH], outline=(90, 84, 98))
d.text((ML, 22), "The Names I Don't Know", font=FT, fill=INK)
d.text((ML + PW, 30), f'mel spectrogram, mono mix · {int(dur // 60)}:{dur % 60:04.1f} · 30 Hz–16 kHz · 80 dB range · loudness = RMS', font=F, fill=(170, 164, 178), anchor='ra')
d.text((ML + PW / 2, img.height - 22), 'time (m:ss)', font=FB, fill=INK, anchor='mm')
for q in (88, 82, 76, 70):
  img.save(OUT, quality=q, optimize=True, progressive=True)
  if os.path.getsize(OUT) < 245_000: break
print(OUT, img.size, os.path.getsize(OUT), 'q', q)
