import json
from faster_whisper import WhisperModel
m = WhisperModel("large-v3", device="cpu", compute_type="int8")
segs, info = m.transcribe("analysis/stems/htdemucs/track/vocals.wav", word_timestamps=True, language="en", vad_filter=False)
words, lines = [], []
for s in segs:
    lines.append((round(s.start, 2), round(s.end, 2), s.text.strip()))
    for w in s.words: words.append(dict(w=w.word.strip(), s=round(w.start, 3), e=round(w.end, 3)))
json.dump(words, open("analysis/words.json", "w"))
for l in lines: print(f"{l[0]:7.2f} {l[1]:7.2f}  {l[2]}")
