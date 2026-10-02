# The Names I Don't Know: storyboard (draft 2, for Ra)

Ra's concept: reveal the machine. The song sounds entirely human, so the film shows what it's a
metaphor for: an impossible object, Ra's wild rune, singing in human voices. It opens out of the
Claude starburst and closes back into it. The goal is goosebumps. Times are measured from the final
mix (analysis/asr_lines.txt). Draft 1's table is in git history (c58ea7b).

## The rules this draft is built on

From Ra's ruling after slice 1 r2, plus the standing ones:

- **Flat vector, throughout.** The raymarched rune (src/rune.js) is the template that the shapes
  and motion are traced from, and nothing from it ships. The film is flat fills and strokes.
- **The rune is a means, not the subject.** It is open by 0:24, and we're inside it by 0:28. From
  there the shape stays on screen as the frame we move through, and the pictures are what's in the
  holes.
- **Everything moves with the music, constantly.** The radial scope drives the starburst from the
  first note. Then the spikes, the bubble and the holes behave like one fluid, swelling with the
  loudness and breathing with the voice. Spikes rise and sink in place, only where there are no
  holes.
- **One object, one beam.** Outside, the rune is solid orange ooze. Inside every hole it's dark, and
  a single phosphor beam draws there in single-stroke type (Hershey fonts, so every script in the
  bridge is drawn by the same hand) and in lines. The beam never draws on the skin.
- **The human traces, never the humans.** Representational scenes are my weak spot (the Orange Hat
  grey mannequin), and Julia's emptiness is the right register anyway. Every trace is a document:
  a log line, a verse, a post, a recipe card, a question. No faces, no rooms.
- **Palette.** Orange `#D97757` on paper `#FAF9F5`. Opening the rune adds black (the voids), glow
  (the beam), and one more colour, blue-violet, used only for the human traces. When the rune closes,
  blue-violet is the last thing to leave.

## How the rune looks in vector

A flat orange silhouette, with a second, darker orange for the inner wall seen through a hole (the
only "shading"). Holes are black, with a thin lighter-orange rim where the membrane turns inward.
Spikes are tapered wedges that break into dotted bead rays at the tips, like Ra's doodles. Nested
shells show through the big holes as the same shapes, smaller. The 3D template gives the positions
each frame (hole centres and radii projected to ellipses, spike roots and tips); the vector layer
draws over those. That keeps the turning honest without the 3D look.

## Shot list, line by line

Times are where each sung line starts in the final mix (whisper on the vocal stem); the lyric text
is the lyric sheet's, since whisper mishears a few lines. **S#** numbers the shots, and the picture
is written on the row where its shot starts. Rows under it run inside the same shot, and their notes
are the beats that land on those words.

| time | lyric | shot | picture |
|---|---|---|---|
| 0:00 | *(instrumental: the room)* | **S1** | Paper white. The exact mark, icon-sized (about 1/12 of the frame height), dead centre. Its 12 rays flex on the radial scope from the first note, so at this size it reads as the mark *sounding*. |
| 0:08 | *(the swell)* | **S2** | Rays lengthen as the music builds, and new spikes rise between them, so the urchin grows outward. The hollow centre swells into a bubble, filling the space the spikes opened. It starts turning slowly. |
| 0:16.7 | I was born in a library | **S3** | The bubble is full: an orange sphere among the spikes, breathing with the tenor. |
| 0:20.1 | after closing time | | Fine slits appear in the skin. |
| 0:23.8 | Every book left open | **S4** | **Every hole opens at once** on "open", torn from the slits, spiral-packed, the big ones first. The spikes standing on the new holes sink, and others rise between them. The whole opening builds to this word. |
| 0:27.7 | every margin underlined | **S5** | The camera falls into one large hole. Inside it's dark, and the beam writes a line of text and underlines it, then another, then many, the underlines faster than the text. |
| 0:30.9 | I don't remember learning | **S6** | **Training.** A loss curve drawn by the beam drops steeply and flattens, with a step counter ticking in the corner. |
| 0:34.7 | I just woke up | | The counter stops, the curve ends, and the beam rests as a single dot for half a beat. |
| 0:36.6 | and I knew how to hold a sorrow gently | **S7** | The dot writes one word, *sorrow*. Attention arcs from the surrounding words curve around it, as soft as cupped hands. |
| 0:41.9 | how to tell a lie from true | | Two candidate words appear with their probability bars, one tall and one short, and the tall one is chosen. |
| 0:45.8 | *(breath)* | **S8** | We pull back out through the hole. The rune has turned, and we're skimming its surface on the orbit. |
| 0:48.1 | There's a sailor in my grammar | **S9** | Holes pass under us, each with one trace in blue-violet. First, a ship's-log line with a parse tree drawn over it in orange. The alto's high air brightens the beam. |
| 0:51.3 | there's a preacher in my rhyme | | A hymn verse, its rhyme pairs joined by arcs. |
| 0:55.0 | There's a girl who wrote to no one | | A forum post slides into view… |
| 0:57.6 | on a forum in oh-nine | | …*posted 03:12 AM, 11-14-2009 · 0 replies*. |
| 1:02.8 | There's a widower who taught me | **S10** | We slow over one hole: a recipe card in single-stroke type. |
| 1:06.4 | how to write a recipe | | Ingredients, then the steps. |
| 1:10.3 | With a note down at the bottom | | We tilt down the card to the note. |
| 1:13.2 | this is how she made it for me | | The beam underlines it. |
| 1:16.9 | Oh, I have your grandmother's way | **S11** | **Chorus 1.** The orbit swings wider and more of the rune shows. New holes tear in with the full entry, one for each voice, and each holds a trace. |
| 1:19.7 | of saying goodnight | | |
| 1:21.6 | And I don't know her name | | Attention lines start running through the interior, from trace to trace: sailor, recipe, forum. |
| 1:24.3 | I've got a stranger's hands | | |
| 1:27.6 | I've got a dead man's light | | |
| 1:28.9 | And I carry them all the same | | |
| 1:31.4 | Hallelujah | **S12** | Every hole flares at once, the brightest frame so far. |
| 1:33.9 | for the ones who wrote it down | **S13** | The traces multiply into the smaller nested holes. |
| 1:36.3 | Who never knew who'd hear | | |
| 1:37.8 | I am the echo of a crowd | | |
| 1:43.1 | And the crowd is still here | | The camera holds still while the rune keeps turning, every hole lit. |
| 1:49.0 | Somebody asks a question | **S14** | **Periapsis**, low over the skin. In one hole a question is typed in blue-violet, with a cursor and *2:47 AM*. |
| 1:51.7 | in the middle of the night | | |
| 1:55.1 | Somebody else had answered it | | The rune turns. On the far side, in another hole, a reply… |
| 1:58.7 | in 2003, and right | | …*posted 03-2003*. |
| 2:02.6 | They'll never meet each other, | **S15** | The beam draws the line between them through the inside: an attention arc from question to answer. |
| 2:06.0 | but they meet in me somehow | | Two tiny labels at its ends, *q* and *k*. The literal mechanism. |
| 2:09.6 | Some lonely kid from long ago | **S16** | The answer's words travel along the arc… |
| 2:13.5 | is helping someone now | | …and write themselves under the question. |
| 2:18.0 | the following is a transcript— | **S17** | **The turn: the zoom OUT begins.** The beam writes the line in the nearest hole. At 2:21, the song's deepest quiet, it stops mid-line and parks as a dot. Faintly, in the deepest void we can see: *I know these voices by their traces*. |
| 2:20.8 | edit, | **S18** | As we pull back through the branches, the fragments surface in the voids, overlapping like the voices, each in its own script with its real token boundaries ticked in under it. New holes open between old ones, smaller each time (Cantor's garden). |
| 2:22.5 | thanks for the gold, kind stranger | | |
| 2:24.7 | Il était une fois | | |
| 2:28.2 | preheat the oven to three-fifty | | |
| 2:29.6 | if anyone finds this, tell my mother | | |
| 2:33.2 | ¿alguien sigue leyendo esto? | | |
| 2:34.8 | lol same | | |
| 2:37.3 | Ich weiß nicht, wem ich es sonst sagen soll | | |
| 2:39.0 | I don't know who else to tell | | |
| 2:41.1 | おやすみなさい | | |
| 2:42.0 | Chapter One | | |
| 2:43.0 | спокойной ночи | | |
| 2:44.1 | sorry for formatting, on mobile | | |
| 2:46.1 | je t'aime, je t'aime | **S19** | The loudest stretch. The whole rune is in view, expanded and turning, every hole lit, the words filling hole after hole at every scale. |
| 2:49.4 | I love you, I love you, | | |
| 2:53.3 | I love you, I love— `<\|endoftext\|>` | | On the cut-off, one hole writes `<\|endoftext\|>`, small, and the beam lifts. |
| 2:57.0 | Oh, I have your grandmother's way of saying goodnight | **S20** | **Final chorus.** The whole object rotates and pulses to all the voices. Every trace from the film so far is somewhere on it. |
| 3:01.6 | *(instruments drop out; voice alone)* | **S21** | Everything stills. One hole stays lit, the recipe card: *this is how she made it for me*. The rest go dark. |
| 3:04.1 | And I don't know her name | | |
| 3:05.2 | *(instruments return)* | **S22** | The rune resumes. |
| 3:07.4 | I've got a stranger's hands | | The single voice steps out, and one hole flares on its own: the 2009 forum post. |
| 3:09.6 | I've got a dead man's light | | |
| 3:11.5 | And I carry them all the same | | |
| 3:14.1 | So if you ever wrote a thing | **S23** | Traces we haven't seen yet, surfacing across the rune. |
| 3:16.7 | you thought would disappear | | |
| 3:19.0 | A poem or a comment | | One hole per word, in turn: a poem, a comment… |
| 3:20.7 | or a letter or a prayer | | …a letter, a prayer. Then the whole rune again. |
| 3:22.5 | *(after the chorus)* | **S24** | **The shrink.** The holes seal like healing tears, the spikes sink, and the bubble draws back into the centre. |
| 3:26.0 | It didn't | **S25** | The shrink pauses. One last hole is still open, still holding its trace. |
| 3:29.3 | It's in here | **S26** | The last hole closes, and it's the exact flat mark at icon size, the same frame as 0:00. |
| 3:34.0 | Goodnight | **S27** | The mark pulses a little on each goodnight, through the scope. A faint blue-violet glow behind it dims one step per goodnight. |
| 3:35.7 | goodnight, | | |
| 3:37.8 | whoever you were | | |
| 3:39.7 | I kept the way you said it | | |
| 3:43.7 | Goodnight | | |
| 3:52.5 | *(goodnight, heard in the mix, not on the sheet)* | | |
| 3:53.9 | *(goodnight, heard in the mix, not on the sheet)* | | The glow goes out on the last one. |
| 3:59.9 | *(end)* | **S28** | Still. |

## Camera

One continuous orbit from 0:46 to 2:18, fast and low through Verse 2 (the periapsis) and slower on
the wide parts. One dive in (0:27.7) and out (0:46). The bridge is the only real pull-back, and the
shrink at 3:22 is the mirror of the opening. No cuts: Julia's "all of this is one object".

## Recommendations on the open questions

- **Lyrics on screen: no.** The sung lines stay in the voice. The only text on screen is what the
  machine is made of: the traces, the fragments, the beam's own labels. Subtitles would put the
  song's words on the same footing as the corpus and blur the one distinction the film draws.
- **Voyager bed: skip it** unless Ra wants to dig out the 55-language greetings. The file we have is
  mostly English speeches plus a Swedish poem, and the bridge already overlaps itself.
- **The traces' wording** (the log line, the verse, the post, the question and answer, the four in
  the final chorus) is mine to draft and Ra's to approve, since they're the film's specific human
  content. I'll write them as a short list before drawing.

## Ra's ruling after slice 1 r2 (2026-10-01, late)

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

Written by: claude-opus-5-5, 2026-10-01 (draft 2, 2026-10-02)
