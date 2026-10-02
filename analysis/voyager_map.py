# voyager_map.py: what's in voyager_voices.flac. Split by whisper's own segments (there's no real silence between speakers), then whisper's language ID + a transcript per
# greeting, so the bridge bed can be picked by language and length, not blind.
import json, numpy as np, librosa
from faster_whisper import WhisperModel
y, sr = librosa.load('voyager_voices.flac', sr=16000, mono=True)
m0 = WhisperModel('large-v3', device='cpu', compute_type='int8')
segs = [[int(s.start * sr), int(s.end * sr)] for s in m0.transcribe(y, vad_filter=True, vad_parameters=dict(min_silence_duration_ms=250), beam_size=1)[0]]
m = m0
out = []
for a, b in segs:
  clip = y[a:b]
  lang, p, _ = m.detect_language(clip)
  txt = ' '.join(s.text.strip() for s in m.transcribe(clip, beam_size=3, vad_filter=False)[0])
  out.append({'t0': round(a / sr, 2), 't1': round(b / sr, 2), 'lang': lang, 'p': round(p, 2), 'text': txt})
  print(f"{a/sr:7.2f}-{b/sr:7.2f}  {lang} {p:.2f}  {txt}", flush=True)
json.dump(out, open('analysis/voyager_map.json', 'w'), ensure_ascii=False, indent=1)
print(len(out), 'segments')
