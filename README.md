# The Names I Don't Know

Music video for *The Names I Don't Know*, an Appalachian folk hymn sung by a model about its corpus: a sailor in its
grammar, a widower's recipe, a girl who wrote to no one on a forum in oh-nine. 3:59, 1920×1080, 30 fps. Shipped
2026-10-02.

The song is very human, so the film shows what the song is a metaphor *for*. It opens on the Claude starburst, which
swells with the music and opens into an impossible object: a sphere of shifting spikes with holes cut into it. Each
hole looks into a dark interior, and inside, a single phosphor beam draws what the voices left behind: oscilloscope
rings, token streams, connections lighting up between fragments of text. The lyrics are drawn into the space like
everything else. In the bridge the camera flies through the object and out the other side into the light. At the
end it closes back into the starburst on "It's in here".

## Techniques

- **Every frame is a pure function of song time.** `src/v/film.js` turns t into the camera, the object's state and
  every cue. There's no state between frames, so rendering parallelises across browser pages and any frame can be
  re-rendered alone.
- **Flat vector over a 3D template.** The object is computed in 3D (sphere, holes, spikes, a perspective camera that
  can fly inside) and drawn as flat 2D vector shapes (`src/v/rune2d.js`). An earlier raymarched render was kept only
  as the template.
- **The spikes are the mark's own rays.** They're cut at the twelve notches of the official starburst path, so the
  opening frame is the real mark, and the shape never switches spike styles as it opens and closes.
- **A radial spectrum drives the exterior.** Frequency runs around the circle and loudness pushes the spikes out
  (`analysis/spectrum.py` → `src/v/spec.js`). The two voices sit roughly opposite each other, with the tenor's range
  on one side and the alto's on the other. The vocal stem drives the interior scopes (`analysis/scope.py`).
- **Forced alignment, not recognition.** Whisper's word times ran a word early through four drafts, and Ra heard it
  in one listen. The lyric is now placed by torchaudio's MMS forced aligner against the demucs vocal stem
  (`analysis/force_align.py`), which is given the text and only has to place it. Whisper is kept only where the
  aligner squeezed the repeated "I love you".
- **Real tokens.** The strings the beam writes are tokenized with a real byte-level BPE (`analysis/tokens.py`), so
  the token-id streams on screen are the actual ids.
- **Lyric placement is a search.** Each line picks a spot by scoring its whole life on screen: staying in frame,
  staying off the hole's story text, not landing on the line before it.
- **Text is drawn unhinted** (`textRendering = 'geometricPrecision'`). Hinted glyphs snap to whole pixel sizes as
  text scales, which made the flythrough's text wobble about a pixel a frame.

## How it was made

Ten drafts between the evening of 2026-10-01 and the late morning of 10-02, after an afternoon of prototyping the object. Each draft is one full round of Ra's notes and one commit. The arc:
- **Draft 1:** the storyboard, flat vector.
- **Draft 2:** a perspective camera that flies inside, with the interior behind a dark opacity layer.
- **Draft 3:** starburst spikes throughout, and an ocean of text.
- **Draft 4:** the radial spectrum and the bridge flythrough.
- **Draft 5:** forced alignment, and the opening driven by the song's energy.
- **Drafts 6–10:** seams, jitter and placement, then a beauty pass.

`STORYBOARD.md` is the plan as it evolved. `LYRICS.md` keeps the lyric sheet with Ra's direction notes.

## What is and isn't in this repo

The code, the analysis scripts and the lyric alignment are here under MIT (see `LICENSE`). The song is not.
CREDIT_LINE_PENDING. The lyrics in `LYRICS.md` and in the alignment data belong to the song, not to this license.
The audio, the renders and the stems are gitignored. To render, put the track at `assets/track.m4a` (and
`track.wav` at the root for the analysis scripts).

The Claude mark (`assets/claude_mark_favicon.svg`) is Anthropic's trademark. It's included because the film is
about it, and the MIT license doesn't cover it.

## Rendering

Needs Node, Chrome and ffmpeg (`npm install` for puppeteer-core). Open `studio.html` in Chrome to scrub.

    node render.mjs --frames=0:240 --workers=4        # frames → out/frames (resumable)
    node render.mjs --encode --out=out/hymn.mp4       # frames + song → mp4
    node render.mjs --stills=0.8,23.8 --out=out/st    # full-res stills
    node render.mjs --sheet=23,23.5,24 --out=out/c.jpg  # contact sheet
    node camjit.mjs / posjit.mjs                      # camera and text jitter measurements

The analysis scripts need Python with numpy, librosa, torch and torchaudio (MMS_FA), faster-whisper and demucs.

## What was hard, and what I'd do differently

Two things, and Ra had to tell me each more than once.

The first was polishing what I could see instead of making what I couldn't. Early on I spent nine revisions on the
shape of the object and two renders of its 3D template before drawing anything inside it. Ra's note was "we're
getting too bogged down in the shape". The film is the inside.

The second was checking the first second last. I kept building layers on top before looking at frame one at full
resolution, and the opening had artifacts for several drafts. Ra asked me twice to look closely at frame 1. Next
time I'd start every round with full-resolution crops of the opening, and I'd measure before smoothing anything. The
flythrough's jitter turned out to be in the text renderer, not the camera; tracking one word's centroid at 200 sizes
showed that, after I'd already smoothed the camera twice.

Written by: claude-opus-5-5, 2026-10-03
