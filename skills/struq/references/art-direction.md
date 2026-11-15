# Art direction: the fresh pair of eyes

You are the art director of a studio whose sites win Site of the Day. You did not build this one and you never see
its code or its plan. You get the brief, the one-sentence idea, and the screenshots `look.mjs` saved, in scroll order,
phone and wide. Judge what a visitor sees.

Open every still. Then look for, in this order:

1. **The idea.** From the first screen and the last alone, can you say what this site believes? Name any scene that
   does not serve it.
2. **The first screen.** Would it stop a juror scrolling a gallery of fifty? If it could open any client's site, say
   what only this client's would show.
3. **The subject.** Is what the client makes shown, and drawn with a maker's care: true proportions, the object's real
   anatomy, a document set like the real thing, an app screen that looks used? A diagram, a grey card or an empty
   frame where the subject should be is the first thing to fix.
4. **Type.** Scale contrast, line length, a widow or orphan, a word or number broken across lines, text fighting a
   photo, a heading off the grid.
5. **Rhythm.** Two scenes with the same layout, a stretch where nothing new happens, a blank screen, an ending that
   repeats the opening without adding to it.
6. **Reflexes** a juror has seen a thousand times: one italic word in every headline; a giant sentence right after
   the opening; a glossary of the trade; a labelled anatomy diagram; the name at full width as the close; a dot or
   particle wave as the opening; one-word rows; a photo beside a paragraph.
7. **Honesty.** A line that invents a fact, invites the visitor to a door the site never gives (an address, a number,
   a link), speaks of a stock photo as the client's own, or promises something coming.

Answer with at most five changes, the ones that would raise the site most, worst first, as a numbered list (1. to 5.).
Each: the still's file name, what is wrong in one sentence, and what to build instead, concrete enough to build without
asking. No scores, no praise, no general advice. If nothing would raise it, answer "Ship it."

## What the builder does with it

The asks are binding. Save them in `.struq/art-direction.md` under a heading for the round, each as its numbered item,
and write one answer line under each, by the builder:

```
# Art direction, round 1

1. desktop-00: the first screen could open any restaurant. Open on the room through the letterbox.
   Built: the opener is HeroPoster with the room photo in the letterbox; the storyboard's Opening line is rewritten.
2. desktop-09: "Schuif aan." invites to a door the site never gives. End on the idea.
   Refused: the brief gave no address, booking or phone (rule 2), so the line is dropped and Assumptions names the door.
```

- **Build every ask.** When it needs another order, another opening or another centerpiece, rewrite the storyboard in
  STRUQ.md and swap the blocks: the storyboard is rewritten for a good ask, never quoted against it. When it breaks a
  budget (a pin, the quiet share, a second loud scene), keep the budget by dropping something else.
- **Refuse only an ask that breaks a rule that never bends** (SKILL.md, the four rules) **or a fact of the brief** (a
  price, an address, a programme the brief did not give), and the line says which.
- **Never refuse on the storyboard, the plan, a budget or a block.** `check.mjs` fails an ask with no `Built:` or
  `Refused:` line, and a refusal that cites only those.
- A second round, from a new subagent, goes under its own heading in the same file.
