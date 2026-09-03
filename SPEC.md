# Catch-the-Fruit: 2nd Grade ELA Word Game

## Build Brief for agy

Build a "Catch the Fruit" PWA — an arcade-style 2D game where fruit falls from the top of the screen and the
player catches the right ones while dodging wrong ones, targeting three specific 2nd grade English Language Arts
topics drawn from the Pittsburgh Public Schools curriculum (PA Core Standards).

This is NOT a general game. It is a deliberate teaching tool with pedagogy baked in from the start. Every design
decision — speed, feedback, progression, visual clarity, error handling — serves learning outcomes first.

---

## EDUCATIONAL CONTEXT

### PA Core Standards (Grade 2) — these three topic groups

**Topic A — Phonics: Vowel Teams & R-Controlled Vowels** (CC.1.1.2.D)

- Know and apply grade-level phonics and word analysis skills in decoding words.
- Decode words with:
  - R-controlled vowels (ar, er, ir, or, ur)
  - Vowel teams (ai, ay, ea, ee, ie, oa, oe, ui, ue)
  - Long vowel spellings (VCe pattern: a_e, i_e, o_e, u_e)
- Distinguish between long and short vowel sounds for common teams.
- PA Benchmark: 2nd graders are expected to decode multisyllabic words and automatically recognize common vowel
  patterns by end of year.

**Topic B — Prefixes & Suffixes (Morphology)** (CC.1.1.2.D, CC.1.2.2.F)

- Identify and decode words with common prefixes (re-, un-, dis-, pre-)
- Identify and decode words with common suffixes (-s, -es, -ed, -ing, -er, -est, -ly, -ful, -less)
- Understand how adding a prefix or suffix changes meaning.
- PA Benchmark: Use knowledge of meaningful word parts to read and understand unfamiliar words.

**Topic C — Synonyms & Antonyms (Vocabulary)** (CC.1.2.2.F)

- Demonstrate understanding of word relationships and nuances in word meanings.
- Identify synonyms (words with similar meaning) for common grade-level words.
- Identify antonyms (words with opposite meaning) for common grade-level words.
- PA Benchmark: Use knowledge of synonyms and antonyms to determine meaning of unfamiliar words.

### Pittsburgh Public Schools Context

PPS 2nd grade assessments (DIBELS, PVA, and district benchmarks) test these skills explicitly:
- DIBELS Nonsense Word Fluency (NWF) — decoding vowel patterns
- PVA (Phonics/PAST) — phonemic awareness and morphological awareness
- District ELA unit assessments — vocabulary (synonyms/antonyms) and decoding

The student is a 7-year-old girl in PPS 2nd grade, advanced reader (zone of proximal development — push her
reading level upward, not just "at grade level"). Design for challenge, not just comfort.

---

## TEACHING METHODOLOGY (must be baked into game mechanics)

### 1. Scaffolded Difficulty (Gradual Release of Responsibility)

- **Level structure:** Each topic has 5–6 levels that introduce patterns one at a time, then combine them.
  - Level 1: Single pattern, all correct answers (no distractors) — teaches the rule.
  - Level 2: Single pattern with easy distractors — practice discrimination.
  - Level 3: Two patterns mixed — requires pattern recognition.
  - Level 4+: All patterns mixed, hard distractors, faster fall speed.
- **Pacing:** Start slow (fruit falls at ~2-3 seconds to cross screen). Speed increases only when the player
  shows consistent accuracy (>80%) at the current speed.

### 2. Immediate Corrective Feedback

- Catch a correct fruit: **positive + instructional** — show the pattern highlighted (e.g. "ea in 'beach' says
  /ē/!") with a brief celebratory animation and +1 point sound.
- Catch a wrong fruit: **clear why** — flash red X, show the correct pattern, say WHY it's wrong ("'bread'
  has 'ea' but it says /ĕ/, not /ē/ — nope!") — this is critical for vowel team instruction.
- Miss a correct fruit (let it fall off screen): **gentle reminder** — show the word with the target pattern
  underlined for a moment so they see what they missed.
- Each miss or wrong-catch teaches: after 3 wrong catches in a row, temporarily slow the game, show a
  teaching card, then resume. Never let frustration compound.

### 3. Mastery-Based Progression

- No time pressure to advance. The player advances to the next level only after demonstrating mastery
  (>85% accuracy on 10+ attempts at the current level).
- Each topic has a "Boss Level" — an accelerated round mixing ALL patterns from the topic. Clearing it
  unlocks the next topic and shows a celebratory screen.
- Stars / sticker rewards per level (3 stars = perfect, 2 = >80%, 1 = completed). Kids collect them.
- Progress is saved locally (IndexedDB via localForage or similar) — no login. The app remembers where
  she left off.

### 4. Spaced Repetition / Retrieval Practice

- After completing a topic, previously-mastered patterns reappear as "surprise review" items in later
  levels (at a lower frequency, ~20% of items).
- Patterns the player struggled with (wrong catch or miss >=2 times) get tagged for extra repetition.
  The game engine should track per-pattern error rate.

### 5. Accessibility & Child-Friendly UX

- **No reading required to play the game itself** — audio instructions (recorded voice or TTS) say what
  to catch: "Catch words with 'ea' that say /ē/!" — the child listens, reads the falling word, decides.
- **All fruit is touchable** — tap to catch. No drag, no swipe. Mobile-first, finger-friendly targets
  (minimum 48px tap area).
- **Fonts** — large, clear, sans-serif (Lexend or similar — designed for developing readers).
- **Color-coding** — each vowel team / prefix / suffix type has a consistent color across levels so
  visual pattern recognition reinforces the phonics pattern.
- **Audio praise** — varied, genuine, non-repetitive. ("Awesome! You caught 'replay' — 're-' means again!")
- **Pause button** always visible, top-left.
- **No ads. No data collection. Purely local.**

---

## WORD LISTS (must be curriculum-aligned)

### Topic A — Vowel Teams & R-Controlled Vowels (minimum 40 words)

| Pattern | Examples |
|---------|----------|
| ai (long a) | rain, train, brain, paint, mail, snail, trail, wait |
| ay (long a) | play, stay, day, say, gray, pray, tray, spray |
| ea (long e) | beach, teach, leaf, read, eat, sea, peach, dream |
| ea (short e) | bread, head, read (past tense), thread, sweat, spread, dead, dread |
| ee (long e) | green, tree, sleep, keep, three, street, queen, sweet |
| ie (long e) | field, piece, believe, chief, thief, shield, yield, brief |
| oa (long o) | boat, coat, road, soap, float, goat, throat, toast |
| oe (long o) | toe, doe, hoe, goes, poet, woe, foe, aloe |
| ui (long u) | fruit, suit, juice, cruise, bruise, sluice, recruit, pursuit |
| ue (long u) | blue, glue, true, clue, value, tissue, argue, rescue |
| ar | car, star, far, park, dark, farm, yard, shark |
| er | her, sister, never, better, winter, water, letter, flower |
| ir | bird, girl, first, shirt, dirt, skirt, whirl, third |
| or | for, horn, short, sport, store, storm, torch, horse |
| ur | turn, burn, hurt, curl, surf, purse, turtle, church |

**Critical teaching note:** ea has TWO sounds (/ē/ as in "beach" and /ĕ/ as in "bread") — this is a major
2nd grade phonics hurdle. The game must explicitly teach that ea is a trickster pattern. Animals riding
fruit with two faces or a similar kid-friendly metaphor for the split.

### Topic B — Prefixes & Suffixes (minimum 30 base words × applicable affixes)

| Affix | Meaning | Example words |
|-------|---------|--------|
| re- | again | replay, redo, refill, rewrite, reread, rebuild, retell, retake |
| un- | not / opposite | unhappy, unpack, unlock, unsafe, undo, unkind, unfair, unplug |
| dis- | not / opposite of | dislike, disobey, disagree, disappear, disconnect, distrust |
| pre- | before | preview, prepay, preheat, preschool, pretest, pregame, precook |
| -s / -es | more than one | cats, dogs, boxes, dishes, benches, peaches, wishes |
| -ed | past tense | jumped, played, walked, helped, landed, started, wanted |
| -ing | happening now | running, jumping, reading, playing, eating, sleeping, swimming |
| -er | one who / more | teacher, player, runner, bigger, faster, taller, colder |
| -est | most | biggest, fastest, tallest, coldest, happiest, brightest, longest |
| -ful | full of | helpful, hopeful, playful, careful, colorful, peaceful, joyful |
| -less | without | helpless, hopeless, careless, fearless, harmless, endless, tireless |
| -ly | how | quickly, slowly, happily, sadly, loudly, softly, bravely, kindly |

**Teaching note for B:** The core skill is segmentation — the player must recognize that a word is built
from a base + affix. When catching correctly, briefly show the word broken apart:
`re + play → replay`. This teaches morphological awareness, which is a key 2nd grade PPS target.

### Topic C — Synonyms & Antonyms (minimum 40 word pairs)

| Word | Synonym | Antonym |
|------|---------|---------|
| big | large, huge, giant | small, tiny |
| happy | glad, joyful, cheerful | sad, unhappy |
| fast | quick, rapid, speedy | slow |
| hot | warm, burning | cold, chilly |
| dark | dim, shadowy | bright, light |
| old | ancient, aged | new, young |
| hard | difficult, tough | easy, simple |
| loud | quiet, silent |
| good | great, excellent | bad, poor |
| pretty | beautiful, lovely | ugly |
| clean | tidy, neat | dirty, messy |
| strong | powerful, mighty | weak |
| brave | courageous, fearless | afraid, scared |
| smart | clever, intelligent | foolish, dumb |
| kind | nice, caring | mean, cruel |
| thin | skinny, slim | thick, fat |
| rich | wealthy, loaded | poor, broke |
| calm | peaceful, still | angry, upset |
| open | unlocked | closed, shut, locked |
| full | stuffed | empty, bare |

**Teaching note for C:** This topic builds vocabulary breadth. The prompt should NOT just be "catch
the synonym" — it should also show the target word being defined in context. "Catch a word that means
the same as 'big'" with the spoken prompt "The pumpkin was SO big!" — context enriches the semantic
learning.

---

## GAME MECHANIC

### Core Loop

1. A spoken (or text-overlay) instruction says what to catch this round — e.g. "Catch words with 'ee'
   that say the long E sound!"
2. Fruit items fall from the top of the screen, each labeled with a word.
3. The player taps the correct fruit to catch it. Wrong fruit = penalty (point lost + corrective
   feedback). Catching nothing = fruit falls off screen = item not counted.
4. The round ends when 12–15 items have passed. The next round begins at the same level (until mastery
   unlocks the next level).
5. Between rounds: brief summary of how the player did, which words they nailed, which patterns need work.

### Visual Style

- Bright, cheerful, child-friendly art. Colorful fruit characters (apple, orange, grape, banana,
  watermelon, blueberry, strawberry, lemon, kiwi, peach, plum, cherry).
- Each fruit type should be visually distinct and recognizable.
- The background is a gentle sky gradient — daylight bright, not dark.
- Words are displayed in a large, readable font INSIDE or BELOW each fruit (not tiny overlay text).
- Correct catches trigger a brief particle burst (sparkles, not explosions).
- Wrong catches show a gentle shake + fade + the corrective explanation card.
- Level progression is shown as a fruit tree growing (or orchard map) — each new level waters a tree
  that bears one more fruit.

### Sound Design

- Catch correct: pleasant ascending chime.
- Catch wrong: gentle descending tone (not alarming — no failure sound for a 7yo).
- Missed fruit: soft whoosh as it falls off screen.
- Level complete: celebratory jingle.
- Voice cues (optional but strongly recommended for Topics A & B where the child needs to hear the
  target vowel sound). Use TTS or pre-recorded prompts.

---

## TECH STACK (REQUIRED — do not deviate)

This is an **educational 2D arcade game PWA**. Use the following defaults:

### Engine: Phaser 4 (default)

- Phaser 4 is the default engine for all arcade and educational games on this system.
- Do NOT hand-roll a game loop with requestAnimationFrame — Phaser provides fixed-timestep Arcade
  Physics, collision detection, scene management, and audio handling that work identically across
  screen refresh rates.
- Forbidden: raw `requestAnimationFrame` without deltaTime → runs 2x speed on 120Hz screens (S24 Ultra).

### Data Validation: Zod

- All word lists, level configurations, and curriculum data MUST be defined in external JSON files and
  validated with Zod at load time.
- Forbidden: hardcoded word lists inside switch statements or game scene code.

### Graphics: Texture Atlas (packed sprites)

- All fruit sprites, UI elements, backgrounds → a single PNG texture atlas with JSON frame data.
- Forbidden: individual `<img>` elements for sprites, or `new Image()` loads for each fruit.

### PWA (current Android / Samsung S24 Ultra)

- Service Worker with individual-asset caching (no bare `cache.addAll` — it aborts install on one 404).
- Manifest with full-bleed 192 + 512 maskable PNG icons, `display_override: ["standalone"]` only.
- No desktop-only manifest members (`window-controls-overlay`, `protocol_handlers`, etc.).
- Install button in-app, offline-capable.
- See the `modern-pwa-android16` skill for full requirements.
- See the `pwa-publish-gate` skill for pre-publish validation.

### Data Storage: Local only (IndexedDB via idb-keyval or localForage)

- No backend, no login, no cloud sync.
- Store: completed levels, per-word error counts, total stars, theme preference.

### Deploy: GitHub Pages (individual repo, then PWA Portal monorepo)

---

## WHAT SUCCESS LOOKS LIKE

The game should be:
1. **Installable** on current Android (S24 Ultra) — passes `validate_pwa.py` with 0 errors and 0 warnings.
2. **Playable offline** — all assets cached, full game loop works without network.
3. **Mobile-first** — large touch targets, portrait orientation, single-thumb play.
4. **Educationally sound** — a 2nd grade teacher at Pittsburgh Public Schools could assign this as
   meaningful phonics practice. A child who plays through all three topics should show measurable
   improvement on: decoding vowel teams and r-controlled vowels, recognizing prefix/suffix structures,
   and understanding synonym/antonym relationships.
5. **Fun** — the 7yo target user chooses to play it voluntarily, not just because a parent assigned it.

---

## DELIVERABLES

1. Working PWA at a GitHub Pages URL that the Nova Portal can index.
2. All source in a repo under DrmmrMik/.
3. STACK.md written to the project by `bsa emit` confirming the Phaser 4 + Zod + PWA stack decision.
4. Curriculum data in external JSON files validated by Zod schemas.
5. This SPEC.md copied into the project root.

---

*End of brief. Build the game.*
