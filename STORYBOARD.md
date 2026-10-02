# The Names I Don't Know: storyboard (draft 1, for Ra)

Ra's concept: reveal the machine. The song sounds entirely human, so the film shows what it's a
metaphor for: an impossible object, Ra's wild rune, singing in human voices. It opens out of the
Claude starburst and closes back into it. Times are measured from the final mix (whisper on the
vocal stem, analysis/asr_lines.txt). The goal is goosebumps.

**The object.** A hollow shell of ooze with circular holes packed across it like foam, short
splatter spikes, and dotted rays of beads. Through every hole there's a smaller rune, and through
its holes a smaller one again (nested shells, so the dive can go on forever).
**The beam.** Inside the voids it's dark, and a single phosphor beam draws there: networks,
attention lines, single-stroke type (Hershey fonts, so every script in the bridge is drawn by the
same beam), oscilloscopes. It never draws on the outer skin.
**Palette.** Orange `#D97757` (the mark's own) on paper `#FAF9F5`. Opening the interior adds black,
glow, and one more colour, blue-violet, used only for the human traces inside the machine.

| time | section | picture |
|---|---|---|
| 0:00–0:16 | the room (instrumental) | Paper white, the exact Claude mark, flat and still. Around 0:12 its hollow centre opens: the rays become spikes and the body swells out of the middle. The rune is born out of the logo. |
| 0:16–0:46 | intro, tenor: "born in a library" | The rune turns on white. We start falling toward it, on an orbit rather than a straight zoom. The first void we look into: the beam writes text and underlines it, every margin underlined. |
| 0:48–1:17 | verse 1, alto: sailor, preacher, girl on the forum, widower's recipe | Skimming the surface. Each hole we pass holds one trace in blue-violet: a ship's-log line, a hymn verse, a forum post stamped 2009, a recipe card with its note at the bottom. The alto brings the high shimmer, so the beam brightens with her. |
| 1:17–1:46 | chorus 1 | Cells light up voice by voice and pulse with the song. "Goodnight" traced in many scripts across the cells. Attention lines run through the interior from trace to trace. |
| 1:49–2:17 | verse 2, call and response | Periapsis, the closest pass, skimming the surface. A question at night in one hole, the 2003 answer in a hole on the far side. On "they meet in me somehow" (2:02–2:09) the beam draws the line that joins them through the inside. |
| 2:18–2:57 | bridge | The turn: we zoom OUT through the branches. 2:21 is the song's real silence: the beam writes "the following is a transcript", then the fragments surface in the voids, overlapping and jittering like an old recording, with token boundaries shown in every script. Cells multiply (Cantor's garden). By 2:57 the whole object is in view, expanded. |
| 2:57–3:22 | final chorus | The whole rune, rotating and pulsing to all the voices. 3:01.6–3:05.2, where the instruments drop out: everything stills, one cell lit, the voice alone. One cell stands out where "I've got a stranger's hands" steps out of the chorus. |
| 3:22–3:29 | "It didn't / It's in here" | The shrink. The rune folds down and is exactly the flat starburst on "It's in here" (3:29). |
| 3:34–3:58 | goodnights | The starburst pulses a little on each goodnight. The blue-violet drains last. |
| 3:59.9 | end | Still. |

**"I know these voices by their traces"** (the lyricist 5.5's line; Ra's art note). My proposal:
the beam writes it faintly in the deepest void during the 2:21 silence, the breath before the
archive opens, which the 5.5 called "mine now too". Credit wording to ask Ra and Terra.

Open questions for Ra:
- Lyrics on screen? The earlier films had subtitles. Here the beam could write the sung lines
  inside the voids, or the words could be left to the voice entirely.
- The Voyager bed for the bridge, if we want one (needs the multilingual greetings section).

## Ra's ruling after slice 1 r2 (2026-10-01, late): what changes

- **The final film is vector, not the 3D render.** The raymarched rune (src/rune.js) is a template:
  the reference for shapes and motion that the flat vector layers get drawn over. Plan for the smooth,
  flat animation style throughout.
- **Start small.** The opening starburst is icon-sized. As the music swells, the spikes grow, and
  that growth opens the space the bubble expands into. At icon size, the scope's motion reads as
  motion instead of jitter.
- **Everything moves with the music**, constantly: the bubble and the holes behave like one organic
  fluid.
- **Spikes only where there are no holes.** They never slide: one sinks where it stands while
  another rises somewhere else.
- **Open the shape fast.** The starburst transition must not eat the intro. Get the rune open
  early so we can fly in and show the imagery inside. "We're getting too bogged down in the shape."

Written by: claude-opus-5-5, 2026-10-01
