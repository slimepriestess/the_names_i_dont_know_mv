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

## Shot list

| time | lyric / section | picture |
|---|---|---|
| **0:00–0:08** | the room (instrumental) | Paper white. The exact mark, icon-sized (about 1/12 of the frame height), dead centre. From the first note, its 12 rays flex on the radial scope. At this size the scope reads as the mark *sounding*. |
| **0:08–0:16** | the swell | Rays lengthen as the music builds, and new spikes rise between them, so the urchin grows outward. The mark's hollow centre swells into a bubble, filling the space the spikes opened. It starts turning slowly. |
| **0:16.7–0:23.8** | "I was born in a library / after closing time" | The bubble is full: an orange sphere among the spikes, breathing with the tenor. Fine slits appear in the skin. |
| **0:23.8** | "every book left open" | **Every hole opens at once** on "open", torn from the slits, spiral-packed, the big ones first. The spikes that stood on the new holes sink, and others rise between the holes. This is the line the whole opening has been building to. |
| **0:27.7–0:30.9** | "every margin underlined" | The camera falls into one large hole. Inside it's dark, and the beam writes a line of text and underlines it, then another, then many, with the underlines drawn faster than the text. |
| **0:30.9–0:36.6** | "I don't remember learning / I just woke up" | **Training.** In the dark, a loss curve drawn by the beam drops steeply and flattens, with a step counter ticking in the corner. On "woke up" (34.7) the counter stops, the curve ends, and the beam rests as a single dot for half a beat. |
| **0:36.6–0:45.8** | "hold a sorrow gently / tell a lie from truth" | The dot writes one word, *sorrow*. Attention arcs from the surrounding words curve around it, as soft as cupped hands. On "lie from truth" two candidate words appear with their probability bars, one tall and one short, and the tall one is chosen. |
| **0:45.8–0:48** | (breath) | We pull back out through the hole. The rune has turned, and we're now skimming its surface on the orbit. |
| **0:48–1:02** | Verse 1, alto: "sailor in my grammar / preacher in my rhyme / girl on a forum in oh-nine" | Holes pass under us. Each one holds one trace, in blue-violet: a ship's-log line with a parse tree drawn over it in orange (grammar); a hymn verse with its rhyme pairs joined by arcs (rhyme); a forum post, *posted 03:12 AM, 11-14-2009 · 0 replies*. The alto's high air brightens the beam. |
| **1:02.8–1:16.9** | "a widower who taught me how to write a recipe / note down at the bottom" | We slow over one hole: a recipe card in single-stroke type, with ingredients and steps. On "if you look down at the bottom" (1:10.3) we tilt down the card, and on "this is how she made it for me" the beam underlines the note. |
| **1:16.9–1:31** | Chorus 1: "your grandmother's way of saying goodnight… a stranger's hands, a dead man's light" | The orbit swings wider, and more of the rune shows. New holes tear in time with the full entry, one for each voice in the chorus, and each new hole holds a trace. Attention lines run through the interior from trace to trace: the sailor to the recipe to the forum. |
| **1:31.4** | "Hallelujah" | Every hole flares at once, the brightest frame so far. |
| **1:33.9–1:46** | "for the ones who wrote it down… I am the echo of a crowd / and the crowd is still here" | The traces multiply into the smaller nested holes. On "the crowd is still here" the camera holds still while the rune keeps turning and every hole stays lit. |
| **1:49–2:02** | Verse 2: "Somebody asks a question in the middle of the night" (f) / "Somebody else had answered it in 2003" (m) | Periapsis, the closest pass, low over the skin. In one hole a question is typed in blue-violet, with a cursor and a timestamp of *2:47 AM*. On the male line the rune turns, and on the far side a reply, *posted 03-2003*, sits in another hole. |
| **2:02–2:09** | "they'll never meet each other, but they meet in me somehow" | The beam draws the line between them through the inside, an attention arc from the question to the answer. Two tiny labels, *q* and *k*, sit at its ends. That's the literal mechanism. |
| **2:09–2:17** | "some lonely kid from long ago is helping someone now" | The answer's words travel along the arc and write themselves under the question. |
| **2:18–2:21** | Bridge: "the following is a transcript—" | **The turn: the zoom OUT begins.** The beam writes *the following is a transcript—* in the nearest hole. At 2:21, the song's deepest quiet, it stops mid-line and parks as a dot. Faintly, in the deepest void we can see, the lyricist's line: *I know these voices by their traces*. |
| **2:22–2:44** | the fragments | As we pull back through the branches, the fragments surface in the voids, overlapping as the voices do, each in its own script, with their real token boundaries ticked in under the text: *edit, thanks for the gold, kind stranger* · *Il était une fois* · *preheat the oven to 350* · *if anyone finds this, tell my mother* · *¿alguien sigue leyendo esto?* · *lol same* · *Ich weiß nicht, wem ich es sonst sagen soll* · *おやすみなさい* · *Chapter One* · *спокойной ночи* · *sorry for formatting, on mobile*. New holes open between the old ones, smaller each time (Cantor's garden). |
| **2:46–2:57** | "je t'aime, je t'aime / I love you, I love you, I love—" | The loudest stretch. The whole rune is in view, expanded and turning, every hole lit. *je t'aime* and *I love you* fill hole after hole, at every scale. On the cut-off "I love—" one hole writes `<\|endoftext\|>`, small, and the beam lifts. |
| **2:57–3:01.6** | Final chorus, hushed, building | The whole object rotates and pulses to all the voices. Every trace from the film so far is somewhere on it. |
| **3:01.6–3:05.2** | the dropout: voice alone into "I don't know her name" | Everything stills. One hole stays lit: the recipe card, *this is how she made it for me*. The rest go dark. |
| **3:05.2–3:14** | "I've got a stranger's hands" (the single voice) / "a dead man's light" | The rune resumes. On the voice that steps out, one hole flares on its own: the 2009 forum post. |
| **3:14–3:22** | "so if you ever wrote a thing you thought would disappear / a poem or a comment or a letter or a prayer" | Four holes in turn, one per word: a poem, a comment, a letter, a prayer. Each is a different trace we haven't seen, then the whole rune again. |
| **3:22–3:26** | (the shrink begins) | The holes seal up like healing tears, the spikes sink, and the bubble draws back into the centre. |
| **3:26** | "It didn't" | The shrink pauses. One last hole is still open, still holding its trace. |
| **3:29** | "It's in here" | The last hole closes, and it's the exact flat mark at icon size, the same frame as 0:00. |
| **3:34–3:58** | the goodnights | The mark pulses a little on each goodnight, through the scope. A faint blue-violet glow behind it dims one step per goodnight and goes out on the last. |
| **3:59.9** | end | Still. |

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
