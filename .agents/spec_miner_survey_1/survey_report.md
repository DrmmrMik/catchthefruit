# Catch the Fruit: Comprehensive Survey & Specification Report

**Document ID**: SPEC-MINER-SURVEY-01  
**Target Project**: Catch the Fruit (2D Educational Arcade Progressive Web App)  
**Author**: Survey Spec Miner 1  
**Date**: 2026-09-03  
**Integrity Mode**: Demo / Production-Ready Standards  
**Authoritative Sources**:
1. `/home/gallabot/Documents/antigravity/joyful-hertz/ORIGINAL_REQUEST.md`
2. `/home/gallabot/Documents/antigravity/joyful-hertz/SPEC.md`
3. `/home/gallabot/Documents/antigravity/joyful-hertz/STACK.md`
4. `/home/gallabot/Documents/antigravity/joyful-hertz/AGENTS.md`
5. Pennsylvania Core Standards for Grade 2 ELA & Math (CC.1.1.2.D, CC.1.2.2.F, CC.2.2.2.A.1)
6. Pittsburgh Public Schools (PPS) 2nd Grade Assessment Frameworks (DIBELS NWF, PVA/PAST, District Benchmarks)

---

## 1. Executive Summary & Specification Scope Reconciliation

### 1.1 Project Archetype & Mission
"Catch the Fruit" is a mobile-first, 2D arcade educational Progressive Web App designed specifically for a 7-year-old 2nd grade student in the Pittsburgh Public Schools (PPS) system. Operating in the Zone of Proximal Development (ZPD) for an advanced reader and budding learner, the application combines fast-paced arcade catching mechanics with rigorous, evidence-based pedagogy.

### 1.2 Specification Reconciliation: ELA Core Standards vs. Math Inquiry
A critical finding during initial specification mining is the relationship between the authoritative core specifications (`SPEC.md` & `ORIGINAL_REQUEST.md`) and the dispatch query:
- **Authoritative Mandate (`SPEC.md` § EDUCATIONAL CONTEXT & `ORIGINAL_REQUEST.md` § R1)**: Focuses primarily on Grade 2 English Language Arts (ELA) covering:
  - **Topic A (Phonics)**: Vowel teams (ai, ay, ea [/ē/ vs /ĕ/ split], ee, ie, oa, oe, ui, ue) and r-controlled vowels (ar, er, ir, or, ur), minimum 40 curriculum words.
  - **Topic B (Morphology)**: Prefixes (re-, un-, dis-, pre-) and suffixes (-s/-es, -ed, -ing, -er, -est, -ful, -less, -ly) across 30+ base words with dynamic visual morphological segmentation (`re + play → replay`).
  - **Topic C (Vocabulary)**: 40+ synonym and antonym pairs contextualized in grade-level sentences.
- **Dispatch Inquiry Requirement**: Requested extraction of "2nd grade Pittsburgh Public Schools math requirements (addition/subtraction, mental math, difficulty progression) ... basket controls ... math problem prompts".
- **Reconciliation & Unified Architecture**: The game architecture and Zod curriculum schema are designed with a **polymorphic curriculum engine**. The primary launch modules implement the mandatory ELA curriculum (Topics A, B, C), while the data schema and prompt engine natively support Grade 2 PPS Math (Operations & Algebraic Thinking: addition/subtraction within 20 mental math, addition/subtraction within 100, skip counting by 2s, 5s, 10s, even/odd identification). Both domains share identical falling fruit mechanics, feedback loops, speed dampening, and spaced repetition tracking.

---

## 2. Features Discovered

The following table comprehensively catalogs all functional and technical features derived from the authoritative specifications and dispatch requirements.

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Curriculum | Topic A: Phonics (Vowel Teams & R-Controlled) | Spawns words testing 9 vowel teams (ai, ay, ea, ee, ie, oa, oe, ui, ue) and 5 r-controlled vowels (ar, er, ir, or, ur). | Current level curriculum item list, target phoneme prompt. | Fruit labeled with target words and phonetically distinct distractors. | Catches with wrong sound trigger corrective phonics card. | SPEC.md L18-28, ORIGINAL_REQUEST.md L16 |
| 2 | Curriculum | "ea" Dual Sound Discrimination | Explicit instruction separating /ē/ (long e as in "beach") from /ĕ/ (short e as in "bread"). Kid-friendly "trickster" metaphor. | Level prompt e.g. "Catch words with 'ea' that say /ē/!". | Target words (beach, teach, leaf) vs distractors (bread, head, read). | Wrong catch explains: "'bread' has 'ea' but it says /ĕ/ — nope!". | SPEC.md L118-119, L132-135 |
| 3 | Curriculum | Topic B: Morphology (Prefixes & Suffixes) | Decoding words with prefixes (re-, un-, dis-, pre-) and suffixes (-s/-es, -ed, -ing, -er, -est, -ful, -less, -ly). | Target affix prompt, base word list (>=30 base words). | Fruits with affix-modified words. | Wrong affix catches trigger definition reminder. | SPEC.md L29-35, L136-152 |
| 4 | Visual/Pedagogy | Visual Morphological Segmentation | On catching a morphological word, the word visually splits into base + affix before fading/collecting. | Successful catch of word e.g. "replay". | Animation displaying `re + play → replay` with color-coded affix. | N/A (trigger only on success). | SPEC.md L153-156, ORIGINAL_REQUEST.md L17 |
| 5 | Curriculum | Topic C: Synonyms & Antonyms | Vocabulary matching requiring player to catch words that mean the same or opposite of a target word. | Target vocabulary word + relation prompt (synonym or antonym). | Fruits displaying synonyms/antonyms alongside semantic distractors. | Incorrect semantic match shows definition comparison. | SPEC.md L36-42, L157-185 |
| 6 | Curriculum | Contextual Sentence Prompts | Spoken and visual sentence prompts providing rich semantic context for vocabulary items. | Context sentence template (e.g. "The pumpkin was SO big!"). | TTS speech synthesis + visual prompt text box at top of screen. | Fallback to text prompt if speech synthesis is disabled/muted. | SPEC.md L182-186, L220-222 |
| 7 | Curriculum (Ext) | Grade 2 PPS Math (Operations & Skip Counting) | Polymorphic math questions: addition/subtraction within 20, mental math, skip counting by 2s, 5s, 10s. | Math prompt (e.g. "Catch sums of 12!", "Catch multiples of 5!"). | Fruits labeled with numbers or mini-equations. | Wrong catch displays number bond or step breakdown. | DISPATCH.md L14, PA Standards CC.2.2.2.A.1 |
| 8 | Progression | Scaffolded Difficulty (Gradual Release) | 5-6 levels per topic: L1: Single pattern (no distractors); L2: Single pattern + easy distractors; L3: 2 patterns mixed; L4+: All patterns + hard distractors; L5/L6: Boss Level. | Player performance history, level completion state. | Unlocked levels, dynamically selected distractor sets and speeds. | Player cannot skip ahead without reaching mastery criteria. | SPEC.md L57-66, ORIGINAL_REQUEST.md L20 |
| 9 | Progression | Mastery-Based Advancement Threshold | Advancement to next level requires >= 85% accuracy over 10+ consecutive attempts at the current level. | Attempt counter, correct catches count, wrong catches count. | Level unlock event, star award, progression saved to IndexedDB. | If <85% over round, level must be replayed; hints provided. | SPEC.md L78-86, ORIGINAL_REQUEST.md L20 |
| 10 | Progression | Star Rating & Reward System | Awards 1 to 3 stars per completed level: 3 stars = 100% accuracy, 2 stars = >= 80% accuracy, 1 star = completed. | Round accuracy score. | Visual star animation, persistence in IndexedDB, update to orchard view. | Minimum 1 star awarded only if mastery threshold is satisfied. | SPEC.md L84-85, ORIGINAL_REQUEST.md L38 |
| 11 | Progression | Topic Boss Level | Culminating accelerated level per topic mixing all patterns with increased speed and mixed distractors. | Successful mastery of all preceding topic levels. | Special boss challenge screen, high velocity, celebratory unlock. | Failing boss level allows retry without losing prior level stars. | SPEC.md L82-84 |
| 12 | Visual | Orchard Growth Visualization | Level progression displayed as an orchard or fruit tree: each completed level waters a tree that grows and bears fruit. | Number of stars and completed levels. | Interactive or visual orchard map with watering can animation. | Tree remains at previous growth stage if level is failed. | SPEC.md L211-213, ORIGINAL_REQUEST.md L28 |
| 13 | Mechanics | Remedial Speed Dampener & Teaching Card | After 3 consecutive wrong catches, game temporarily slows fall speed by 50% and presents an educational review card. | Consecutive mistake counter (reaches 3). | Fall speed reduced, pause gameplay, modal teaching card shown with audio. | Player clicks "Ready" to resume at dampener speed before gradual ramp-up. | SPEC.md L75-77, ORIGINAL_REQUEST.md L21 |
| 14 | Mechanics | Spaced Repetition & Error Weighting | Previously mastered patterns reappear in subsequent levels at ~20% frequency. Patterns with >= 2 errors are prioritized. | Per-pattern error registry in local persistence. | Spawner elevates spawn probability of struggled patterns. | If no error history exists, items are uniformly sampled. | SPEC.md L88-94 |
| 15 | Gameplay | Mobile-First Tap-to-Catch Input | Players directly tap falling fruit on screen. Optimized for single-thumb portrait mobile play. | Pointerdown / touchstart events on fruit game objects. | Collision registered, fruit caught, particle chime triggered. | Touches outside fruit bounding boxes are ignored. | SPEC.md L99-100, ORIGINAL_REQUEST.md L24-25 |
| 16 | Gameplay | Basket / Catcher Movement (Hybrid Input) | Optional bottom catcher basket controllable via horizontal touch/pointer drag, mouse, or left/right arrow keys. | Pointer drag coordinates, keyboard ArrowLeft / ArrowRight / A / D. | Catcher basket moves horizontally along bottom row. | Clamped strictly to viewport boundaries [0, gameWidth]. | DISPATCH.md L15 |
| 17 | Gameplay | Fixed-Timestep Physics Engine | Phaser 4 Arcade Physics running with delta-time normalization, ensuring identical fall speeds on 60Hz and 120Hz displays. | Screen refresh event, fixed delta tick (16.66ms). | Normalized vertical velocity `vy` independent of hardware frame rate. | Prevents 2x speed bug on 120Hz displays (S24 Ultra). | SPEC.md L229-236, ORIGINAL_REQUEST.md L24 |
| 18 | Gameplay | Dynamic Falling Velocity Curve | Fruit takes 2.0 - 3.0 seconds to traverse the screen initially; velocity scales up gradually as accuracy exceeds 80%. | Current player running accuracy, level baseline speed. | Calculated pixel fall speed: `(screenHeight / durationSeconds) * scaleFactor`. | Speed dampens back to baseline if error streak occurs. | SPEC.md L64-66 |
| 19 | Gameplay | Round Structure & Pacing | Rounds consist of 12 to 15 falling items. Summary screen displayed at end of round. | Item counter (1..15). | End-of-round transition, results modal, star calculation. | Items falling past bottom without tap count as misses. | SPEC.md L198-201 |
| 20 | Graphics | Packed Texture Atlas Rendering | All fruit sprites, UI elements, particles, and icons batched in a single PNG texture atlas + JSON frame definition. | Asset loader manifest (`assets.json`, `atlas.png`). | WebGL/Canvas batched draw calls with minimal texture swaps. | If frame missing, fallback placeholder graphic rendered; error logged. | SPEC.md L243-247, STACK.md L20 |
| 21 | Graphics | Fruit Character Roster (12 Types) | 12 visually distinct fruit characters: Apple, Orange, Grape, Banana, Watermelon, Blueberry, Strawberry, Lemon, Kiwi, Peach, Plum, Cherry. | Item definition `fruitType` field. | High-contrast fruit sprite rendered with legible text inside/below. | Unrecognized fruit type defaults to Apple sprite. | SPEC.md L204-206 |
| 22 | Graphics | Particle Burst Effect | Cheerful sparkle particle effect emitted at fruit coordinates upon successful catch. | Fruit (x, y) coordinates on catch. | Phaser particle emitter bursts 15-20 sparkle particles. | Disabled or reduced when reduced-motion preference is enabled. | SPEC.md L209, L27 |
| 23 | Audio | Web Audio API Synthesized Sound Effects | Ascending chime (+1 correct), gentle descending tone (wrong catch), soft whoosh (missed fruit), celebratory jingle (round win). | Game event triggers (correct, wrong, miss, win). | AudioContext synthetic oscillators (sine, triangle, melody chords). | Silent fallback if AudioContext is blocked or audio muted. | SPEC.md L214-222, ORIGINAL_REQUEST.md L30-33 |
| 24 | Audio | Web Speech API TTS Instruction | Synthesizes spoken voice prompts for phonemes, target words, and positive praise without requiring reading. | Target prompt text, phoneme phonetics. | SpeechSynthesisUtterance with en-US natural pitch/rate. | If SpeechSynthesis unavailable, audio synthesis chime used instead. | SPEC.md L97-98, L220-222 |
| 25 | Audio | First-Touch Audio Unlocking | Resumes Web Audio `AudioContext` and prepares speech synthesis on the very first user touch or pointer event. | Initial touchstart / pointerdown on Start screen. | `audioContext.resume()` resolved; audio unlocked for entire session. | If user denies or doesn't interact, audio remains muted until first tap. | ORIGINAL_REQUEST.md L33 |
| 26 | UX / A11y | Large Touch Targets (>= 48px) | Interactive falling fruit hitboxes strictly sized to at least 48px diameter for children's motor accuracy. | Touch / pointer hit detection. | Generous touch target circle/box enclosing sprite and text. | Hits within 48px radius register even if near edge of sprite. | SPEC.md L99-100, ORIGINAL_REQUEST.md L25 |
| 27 | UX / A11y | Accessible Dyslexia-Friendly Typography | Prominently displays all words using Lexend / Atkinson Hyperlegible sans-serif fonts with color-coded affixes. | Text strings, word segmentation spans. | Crisp, legible vector canvas text with high contrast stroke/background. | Font fallback to standard system sans-serif if webfont loading fails. | SPEC.md L101-103, ORIGINAL_REQUEST.md L26 |
| 28 | UX / A11y | Color Contrast & Visual Scheme | WCAG AAA compliant contrast on bright daylight sky gradient; high-contrast text containers with distinct borders. | Background gradient, fruit color palette. | Clear separation between text, fruit, and sky. | Color blind friendly palettes (avoid relying solely on red/green). | SPEC.md L102-103, L207-208 |
| 29 | UX / A11y | Screen Reader & ARIA Live Announcements | Hidden ARIA live region announcing game state changes, prompts, scores, and instructional feedback for assistive tech. | Game state events. | DOM element `aria-live="polite"` updated with descriptive text. | Sanitized text strings to avoid spamming screen readers. | SPEC.md L97, DISPATCH.md L17 |
| 30 | Architecture | Zod Curriculum Schema Validation | All curriculum data files (`phonics.json`, `morphology.json`, `vocabulary.json`, `math.json`) validated via Zod. | External JSON file contents. | Type-safe validated curriculum data object or descriptive startup error. | Throws descriptive error on invalid schema; prevents silent game bugs. | SPEC.md L237-241, STACK.md L10, L21 |
| 31 | Architecture | Forbidden Hardcoded Curriculum Logic Guard | Separation of code from data: no hardcoded switch/case word lists in Phaser scene classes. | Curriculum loader service. | Pure data-driven level generation from external JSON configurations. | CI / lint verification rejects inline word arrays in game scenes. | STACK.md L21 |
| 32 | Persistence | Purely Local Persistence (IndexedDB) | Persists completed levels, star counts, error rates per pattern, high scores, and audio preferences locally. | Player achievements, level results, settings changes. | IndexedDB stores updated via `idb-keyval` / Dexie. | Graceful in-memory fallback if IndexedDB is disabled in private mode. | SPEC.md L257-260, ORIGINAL_REQUEST.md L38 |
| 33 | UI / States | Start / Title Screen | Kid-friendly menu with "Play", topic selector carousel, settings (sound, voice), and progress summary. | User tap on buttons. | Scene transition to level select or gameplay scene. | Ignores invalid navigation requests. | DISPATCH.md L16, SPEC.md L86 |
| 34 | UI / States | In-Game Pause & Resume Modal | Persistent pause button in top-left corner; freezes physics, displays options to Resume, Restart, or Quit. | Tap on pause button or ESC key. | Game loop suspended, modal dialog displayed, audio paused. | State preserved exactly upon resumption without delta-time jump. | SPEC.md L105, DISPATCH.md L16 |
| 35 | UI / States | Game Over / Round Summary Screen | Post-round screen displaying items caught, items missed, accuracy %, stars awarded, and remedial highlights. | Round statistics payload. | Rendered summary card, star sparkles, "Next Level" / "Try Again" buttons. | Prevents advancing if mastery threshold (<85%) is not met. | SPEC.md L198-201 |
| 36 | UI / States | Topic Mastery Victory Celebration | Full-screen celebratory sequence when a topic is cleared (boss beaten): confetti, badges, joyful jingles. | Boss level completion payload. | Particle explosion, unlocked badge popup, congratulatory voice praise. | Directs player back to orchard overview with newly unlocked topic. | SPEC.md L82-84 |

---

## 3. Edge Cases Discovered

The following table documents critical operational and cognitive edge cases that the game engine and curriculum parser must handle.

| # | Feature | Input / Condition | Observed / Required Behavior |
|---|---------|-------------------|-----------------------------|
| 1 | Physics / Timing | 120Hz or variable refresh rate mobile digitizer (e.g. Samsung Galaxy S24 Ultra). | Fall speed must remain strictly fixed (e.g., 2.5 seconds screen traversal) using Phaser 4 Arcade Physics fixed timestep. Raw `requestAnimationFrame` is strictly forbidden as it causes 2x fall speed. |
| 2 | Phonics Evaluation | Word "read" presented under Topic A ("ea" rule). | "Read" is homographic: present tense /rēd/ (long e) vs past tense /rĕd/ (short e). System must supply explicit pronunciation metadata and sentence context to disambiguate, or exclusively use unambiguous exemplars (e.g., "beach", "leaf" for /ē/ vs "bread", "head" for /ĕ/). |
| 3 | Audio Autoplay Policy | Mobile browser blocks audio playback prior to explicit user gesture. | AudioContext initializes in suspended state. Game captures first pointerdown/touchstart on the start button to execute `audioContext.resume()` and unlock both Web Audio oscillators and Web Speech API. |
| 4 | Offline Speech Synthesis | Device operates fully offline with no cloud TTS service available. | Web Speech API must query local device voices (`window.speechSynthesis.getVoices()`). If no offline voice is installed, fallback cleanly to synthetic Web Audio chime melodies with visual text highlight without throwing an unhandled exception. |
| 5 | Touch Multi-Touch / Rapid Tap | Child rapidly taps screen with multiple fingers simultaneously or double-taps fruit. | Game input handler must debounce per-fruit tap events: once a fruit is registered as caught, its physics body and tap listener are immediately deactivated to prevent duplicate score awards. |
| 6 | Frustration Prevention | Player makes 3 consecutive wrong catches within a single round. | Streak detector triggers immediately: spawns are paused, falling fruits freeze/slow, and a targeted Remedial Teaching Card pops up explaining the active rule. Spawns resume at 50% velocity. |
| 7 | Round Completion with Uncaught Fruits | Player reaches target item limit (e.g. 15 items), but 2 items are still falling on screen. | Round ends only after all spawned items have either been caught or exited past the bottom screen boundary. No premature cutoffs. |
| 8 | Mastery Edge Case: Exact 85% Accuracy | Player achieves 11 correct out of 13 attempts (84.6%) vs 9 correct out of 10 attempts (90.0%). | Calculation must strictly evaluate `(correctCatches / totalAttempts) >= 0.85` AND `totalAttempts >= 10`. 11/13 = 84.6% does NOT unlock next level; 9/10 = 90% does unlock. |
| 9 | Boundary & Screen Resizing | Player rotates phone between portrait and landscape or splits screen. | Responsive Phaser Scale Manager (`Phaser.Scale.FIT`, `autoCenter: CENTER_BOTH`) scales viewport while maintaining fixed 9:16 portrait aspect ratio. Touch coordinates remain accurately transformed. |
| 10 | Local Storage Quota / Private Browsing | IndexedDB storage throws QuotaExceededError or is disabled in strict private mode. | Persistence layer wraps storage calls in try/catch with an in-memory state fallback. The game remains fully playable during the session with a non-intrusive warning that progress won't persist across restarts. |
| 11 | Missed Fruit Scoring | A correct fruit falls off screen without being tapped. | Counted as a missed opportunity: soft whoosh sound plays, target word briefly flashes with underline at bottom, item is recorded in per-pattern struggle tracking, but does not trigger the harsh "wrong catch" penalty. |
| 12 | Wrong Fruit Missed | An incorrect distractor fruit falls off screen without being tapped. | Considered a correct avoidance: no penalty, no miss sound, rewards player attention passively without interrupting flow. |
| 13 | Curriculum Zod Parse Failure | A corrupted curriculum JSON file is loaded (e.g. missing `baseWord` in Topic B). | Zod schema validation throws a formatted ZodError listing exact line and property path. Error overlay displays friendly maintenance screen instead of blank white screen or silent game crash. |
| 14 | Texture Atlas Frame Missing | Curriculum item requests a fruit type that lacks a frame in `atlas.json`. | Asset manager detects `!atlas.hasFrame(fruitType)` and gracefully renders a default fallback fruit sprite (e.g., standard red apple) while logging a console warning. |

---

## 4. Deep Pedagogical & Curriculum Specifications

### 4.1 Target Learner Profile
- **Student**: 7-year-old female 2nd grader in Pittsburgh Public Schools (PPS).
- **Reading Profile**: Advanced reader operating in her Zone of Proximal Development (ZPD). She requires cognitive stimulation beyond basic sight-word drills: multisyllabic decoding, phonetic nuance, morphological breakdown, and vocabulary in context.
- **District Assessment Alignment**:
  - **DIBELS 8th Edition**: Nonsense Word Fluency (NWF) and Oral Reading Fluency (ORF) requiring automaticity with complex vowel patterns.
  - **PPS Phonemic/Phonics (PVA/PAST)**: Advanced phonemic manipulation and orthographic mapping.
  - **District ELA Benchmarks**: Contextual vocabulary acquisition and structural word analysis (PA Core Standards CC.1.1.2.D, CC.1.2.2.F).

### 4.2 Topic A: Phonics — Vowel Teams & R-Controlled Vowels
- **Standard**: PA Core CC.1.1.2.D ("Know and apply grade-level phonics and word analysis skills in decoding words").
- **Pedagogical Goal**: Automatic recognition of vowel digraphs and r-influenced vowels; discrimination between vowel team sounds.
- **Curriculum Word Bank (>= 40 items required)**:
  - `ai` (long /ā/): *rain, train, brain, paint, mail, snail, trail, wait, chain, praise*
  - `ay` (long /ā/): *play, stay, day, say, gray, pray, tray, spray, clay, away*
  - `ea` (long /ē/): *beach, teach, leaf, read, eat, sea, peach, dream, clean, feast*
  - `ea` (short /ĕ/ - trickster): *bread, head, thread, sweat, spread, dead, dread, heavy, threat*
  - `ee` (long /ē/): *green, tree, sleep, keep, three, street, queen, sweet, cheese, freeze*
  - `ie` (long /ē/): *field, piece, believe, chief, thief, shield, yield, brief*
  - `oa` (long /ō/): *boat, coat, road, soap, float, goat, throat, toast, coach, roast*
  - `oe` (long /ō/): *toe, doe, hoe, goes, woe, foe, aloe*
  - `ui` (long /ū/): *fruit, suit, juice, cruise, bruise, recruit, pursuit*
  - `ue` (long /ū/): *blue, glue, true, clue, value, tissue, argue, rescue*
  - `ar` (/är/): *car, star, far, park, dark, farm, yard, shark, smart, spark*
  - `er` (/ẽr/): *her, sister, never, better, winter, water, letter, flower, summer, silver*
  - `ir` (/ẽr/): *bird, girl, first, shirt, dirt, skirt, whirl, third, chirp, stir*
  - `or` (/ôr/): *for, horn, short, sport, store, storm, torch, horse, morning, north*
  - `ur` (/ẽr/): *turn, burn, hurt, curl, surf, purse, turtle, church, nurse, fur*
- **Explicit Instruction on "ea"**:
  - The "ea" vowel team is explicitly personified as the "Trickster Team" with two distinct masks/faces: Sunny /ē/ (as in beach) and Rainy /ĕ/ (as in bread).
  - Levels introducing "ea" present targeted discrimination rounds contrasting words like *beach* vs *bread*, requiring the child to catch only the sound requested in the vocal prompt.

### 4.3 Topic B: Morphology — Prefixes & Suffixes
- **Standards**: PA Core CC.1.1.2.D, CC.1.2.2.F ("Use knowledge of meaningful word parts to read and understand unfamiliar words").
- **Pedagogical Goal**: Structural analysis — understanding how prefixes alter direction/negation and suffixes alter tense, comparative state, or part of speech.
- **Affix Bank & Meanings**:
  - `re-` ("again / back"): *replay, redo, refill, rewrite, reread, rebuild, retell, retake, restart, refresh*
  - `un-` ("not / opposite of"): *unhappy, unpack, unlock, unsafe, undo, unkind, unfair, unplug, untrue, unwell*
  - `dis-` ("not / apart"): *dislike, disobey, disagree, disappear, disconnect, distrust, disorder, dismay*
  - `pre-` ("before"): *preview, prepay, preheat, preschool, pretest, pregame, precook, preheat*
  - `-s / -es` ("more than one"): *cats, dogs, boxes, dishes, benches, peaches, wishes, foxes*
  - `-ed` ("past tense"): *jumped, played, walked, helped, landed, started, wanted, shouted*
  - `-ing` ("happening now"): *running, jumping, reading, playing, eating, sleeping, swimming, flying*
  - `-er` ("one who does / more"): *teacher, player, runner, singer, helper / bigger, faster, taller, colder*
  - `-est` ("most"): *biggest, fastest, tallest, coldest, happiest, brightest, longest, smallest*
  - `-ful` ("full of"): *helpful, hopeful, playful, careful, colorful, peaceful, joyful, thankful*
  - `-less` ("without"): *helpless, hopeless, careless, fearless, harmless, endless, tireless, speechless*
  - `-ly` ("in what manner"): *quickly, slowly, happily, sadly, loudly, softly, bravely, kindly*
- **Visual Segmentation Mechanic**:
  - When the player catches an affix word (e.g. `replay`), the word pauses momentarily, glowing in high contrast.
  - The word graphically segments: `re` (colored in purple prefix pill) + `play` (amber root pill) `→ replay ("play again")`.
  - This embeds morphological awareness into working memory before the fruit enters the basket.

### 4.4 Topic C: Vocabulary — Synonyms & Antonyms in Context
- **Standard**: PA Core CC.1.2.2.F ("Demonstrate understanding of word relationships and nuances in word meanings").
- **Pedagogical Goal**: Expanding expressive and receptive vocabulary using rich contextual sentences.
- **Word Pair Bank (>= 40 word pairs)**:
  - *big* | Synonyms: large, huge, giant, enormous | Antonyms: small, tiny, mini
  - *happy* | Synonyms: glad, joyful, cheerful, delighted | Antonyms: sad, unhappy, gloomy
  - *fast* | Synonyms: quick, rapid, speedy, swift | Antonyms: slow, sluggish
  - *hot* | Synonyms: warm, burning, sizzling | Antonyms: cold, chilly, freezing
  - *dark* | Synonyms: dim, shadowy, murky | Antonyms: bright, light, radiant
  - *old* | Synonyms: ancient, aged, elderly | Antonyms: new, young, modern
  - *hard* | Synonyms: difficult, tough, challenging | Antonyms: easy, simple, soft
  - *loud* | Synonyms: noisy, roaring, blaring | Antonyms: quiet, silent, hush
  - *good* | Synonyms: great, excellent, wonderful | Antonyms: bad, poor, awful
  - *pretty* | Synonyms: beautiful, lovely, gorgeous | Antonyms: ugly, plain
  - *clean* | Synonyms: tidy, neat, spotless | Antonyms: dirty, messy, filthy
  - *strong* | Synonyms: powerful, mighty, sturdy | Antonyms: weak, frail
  - *brave* | Synonyms: courageous, fearless, bold | Antonyms: afraid, scared, timid
  - *smart* | Synonyms: clever, intelligent, wise | Antonyms: foolish, silly
  - *kind* | Synonyms: nice, caring, gentle | Antonyms: mean, cruel, harsh
  - *thin* | Synonyms: skinny, slim, slender | Antonyms: thick, wide, plump
  - *rich* | Synonyms: wealthy, prosperous | Antonyms: poor, broke
  - *calm* | Synonyms: peaceful, serene, tranquil | Antonyms: angry, upset, stormy
  - *open* | Synonyms: unlocked, accessible | Antonyms: closed, shut, locked
  - *full* | Synonyms: stuffed, packed, brimming | Antonyms: empty, bare, hollow
- **Contextual Sentence Integration**:
  - Rather than bare word drills, prompts provide authentic syntactic context.
  - Example: Visual Prompt: "Find a synonym for LARGE: The elephant was ____!" Spoken TTS: "Catch words that mean the same as large — the elephant was huge!"

### 4.5 Grade 2 Pittsburgh Public Schools Math Extension
- **Standards**: PA Core CC.2.2.2.A.1 ("Represent and solve problems involving addition and subtraction within 100"), CC.2.2.2.A.2 ("Use mental strategies to add and subtract within 20").
- **Extensible Modules**:
  1. **Addition & Subtraction within 20 (Mental Fluency)**: Target sum prompts (e.g. "Catch fruit that equals 14!"). Fruits labeled with `8 + 6`, `7 + 7`, `9 + 5` (correct) vs `9 + 4`, `8 + 7` (distractors).
  2. **Skip Counting & Place Value**: "Catch multiples of 5!", "Catch even numbers greater than 50!".
  3. **Fact Families & Number Bonds**: Visual decomposition on catch: `8 + 6 = 14`.

---

## 5. Gameplay Mechanics & Interaction Specifications

### 5.1 Game Loop & Spawning Algorithm
1. **Round Initialization**:
   - Level configuration loaded from validated curriculum JSON.
   - Spoken TTS prompt plays: `"Catch words with 'oa' that say the long O sound!"`
   - Active targets array, distractor array, and fall speed parameters initialized.
2. **Item Spawning**:
   - Fixed pool of 12 to 15 items per round.
   - Spawn interval: Random stagger between 1200ms and 1800ms to allow cognitive processing.
   - Horizontal position $x$: Uniform random distribution across viewport: `x ∈ [padding, viewportWidth - padding]`.
   - Fruit selection: Balanced rotation between 12 distinct fruit sprite characters from the texture atlas.
3. **Physics & Fall Speed Curve**:
   - Governed by Phaser 4 Arcade Physics fixed delta time.
   - Formula: $\text{velocity}_y = \frac{\text{viewportHeight}}{\text{fallDurationSeconds}}$.
   - Baseline: $\text{fallDurationSeconds} = 2.8\text{s}$ (gentle pace for reading).
   - Accelerated Pace: Scales down to $2.0\text{s}$ at Level 4+ and $1.8\text{s}$ during Topic Boss Levels.
4. **Collision & Hit Testing**:
   - **Direct Touch (Primary)**: Fruit touch area set to a minimum bounding radius of 24px (48px diameter circle). Tap registers instantaneously on pointerdown.
   - **Basket Catch (Hybrid Mode)**: Player can slide a decorative basket across the bottom using finger drag or keyboard. Falling fruit colliding with the basket bounding box triggers a catch.
5. **Scoring & Evaluation**:
   - Correct catch: $+100$ base points, $+10 \times \text{streak}$ multiplier, star score accumulator increments, accuracy tracked.
   - Incorrect catch: $-50$ points, streak reset to 0, error registered in per-pattern tracker.
   - Missed correct item: No point deduction, streak preserved, missed item logged for spaced review.
   - Missed distractor item: Ignored (passive avoidance).

### 5.2 Feedback Loops & Remediation Engine
- **Correct Catch Feedback**:
  1. Immediate ascending pitch harmonic chime via Web Audio synthesizer.
  2. Sparkle particle explosion emitted at fruit centroid (16 multi-colored star particles).
  3. Instructional callout: Brief pill banner displays rule verification (`"oa in boat says /ō/!"` or `re + play → replay`).
  4. Audio voice praise randomly selected from 8 child-friendly affirmations (`"Super!", "You got it!", "Awesome decoding!"`).
- **Incorrect Catch Feedback**:
  1. Gentle descending two-tone chime (comforting, avoiding negative reinforcement).
  2. Fruit shakes horizontally for 300ms, turns translucent red, and dissolves.
  3. Corrective hint card briefly slides in at screen center:
     - Header: `"Not quite!"`
     - Explanation: `"'bread' has 'ea' but it says /ĕ/, not /ē/!"`
  4. Strike counter increments.
- **Three Consecutive Mistakes Remediation**:
  - If player logs 3 consecutive incorrect catches:
    1. Physics engine pauses all active falling bodies.
    2. Screen darkens with 40% blur overlay.
    3. Remedial Teaching Card opens:
       - Displays large visual diagram of target phoneme or affix.
       - Audio automatically speaks rule explanation: `"Remember: 'ea' can say /ē/ like in beach, or /ĕ/ like in bread. Look closely at the word before tapping!"`
       - Includes an animated "Ready to Try!" button.
    4. Upon click, physics unpauses with a 3-2-1 countdown and fall speed dampened by 35% for the next 5 items.

### 5.3 Mastery Progression & Unlock Matrix
- **Mastery Criteria**: Level cleared with $\ge 85\%$ accuracy across at least 10 attempts.
- **Star Allocation**:
  - $\star\star\star$ (3 Stars): $100\%$ accuracy (flawless round).
  - $\star\star$ (2 Stars): $85\% - 99\%$ accuracy (mastery achieved).
  - $\star$ (1 Star): $70\% - 84\%$ accuracy (round finished, needs practice to advance).
  - $0$ Stars: $< 70\%$ accuracy (replay recommended).
- **Level Flow per Topic**:
  - **Level 1 (Introduction)**: Single target pattern (e.g. `ai`), 100% correct spawns, no distractors. Teaches rule.
  - **Level 2 (Discrimination)**: Single target pattern (`ai`) with obvious distractors (e.g. simple CVC words `cat`, `dog`).
  - **Level 3 (Contrast)**: Two competing patterns mixed (e.g. `ai` vs `ay`).
  - **Level 4 (Advanced Mix)**: All topic vowel teams with phonetically subtle distractors.
  - **Level 5 (Boss Level - Fruit Frenzy)**: Rapid fall speed, 15 items, all patterns mixed. Clearing unlocks the next curriculum topic and awards the Topic Master Badge.

---

## 6. Game State Machine & Screen Flows

```
                   ┌──────────────────┐
                   │   BOOT / LOAD    │
                   │ (Assets + Zod)   │
                   └─────────┬────────┘
                             │
                             ▼
                   ┌──────────────────┐
        ┌─────────►│   TITLE SCREEN   │◄────────┐
        │          │ (Orchard Progress│         │
        │          └─────────┬────────┘         │
        │                    │ [Press Play]     │
        │                    ▼                  │
        │          ┌──────────────────┐         │
        │          │   TOPIC SELECT   │         │
        │          │ (A:Phonics, etc) │         │
        │          └─────────┬────────┘         │
        │                    │ [Select Level]   │
        │                    ▼                  │
        │          ┌──────────────────┐         │
        │          │  GAMEPLAY SCENE  │         │
        │          │ (Phaser 4 Loop)  │         │
        │          └───────┬───┬──────┘         │
        │                  │   │                │
        │    [Pause Button]│   │[3 Mistakes]    │
        │                  ▼   ▼                │
        │        ┌───────────────┐              │
        │        │ PAUSE/REMEDIAL│              │
        │        │     MODAL     │              │
        │        └───────┬───────┘              │
        │                │ [Resume]             │
        │                ▼                      │
        │          ┌──────────────────┐         │
        │          │ ROUND COMPLETED  │         │
        │          │  (Stars & Stats) │         │
        │          └───────┬───┬──────┘         │
        │                  │   │                │
        │   [Mastery Met]  │   │ [Retry]        │
        │                  ▼   └────────────────┘
        │          ┌──────────────────┐
        │          │ ORCHARD WATERING │
        │          │ (Tree Grows +1)  │
        │          └─────────┬────────┘
        │                    │ [Topic Cleared]
        │                    ▼
        │          ┌──────────────────┐
        └──────────┤ VICTORY / BADGE  │
                   └──────────────────┘
```

### Screen Details:
1. **Boot / Preloader**: Loads packed texture atlas (`atlas.png`, `atlas.json`), audio assets, web fonts (Lexend), and validates curriculum JSON files via Zod.
2. **Title / Orchard Screen**: Displays child's custom orchard with growing fruit trees reflecting unlocked levels and stars. Includes large "Start Adventure" button, sound/music toggles, and reset progress modal.
3. **Topic & Level Selection**: Horizontal scroll carousel showing Topic A, Topic B, Topic C (and Math). Locked levels displayed with padlock badges and requirement tooltips.
4. **Gameplay Scene**: HUD displays current score, round progress meter (e.g. 8/15), target prompt pill, audio repeat button, and top-left pause button.
5. **Remedial / Teaching Modal**: High-contrast overlay presenting rule explanations and interactive pronunciation replay.
6. **Round Summary Modal**: Shows star animations, accuracy percentage, list of "Words Nailed!" vs "Words to Practice", and "Next Level" button.
7. **Boss Victory Celebration**: Full-screen particle fireworks, brass jingle, and interactive badge collection.

---

## 7. Accessibility, UX & Sensory Architecture

### 7.1 Child-Centered Accessibility Guidelines
- **Zero Reading Barrier to Play**: All round objectives are spoken automatically via Web Speech API / TTS upon round start. Children who cannot yet read the prompt text can play entirely by listening to the auditory instruction and identifying target patterns on falling fruit.
- **Physical Hit Targets**:
  - Touch targets strictly $\ge 48\text{px} \times 48\text{px}$ adhering to WCAG 2.5.5 and Android accessibility benchmarks.
  - Generous radial hitboxes extend $8\text{px}$ beyond visible sprite artwork to accommodate 7-year-old motor coordination.
- **Cognitive Load Optimization**:
  - Clean daylight sky gradient background eliminating visual clutter, strobing, or high-contrast background motion.
  - Color-coding convention maintained consistently:
    - Long vowel teams: Warm golden-amber highlights.
    - R-controlled vowels: Emerald green highlights.
    - Prefixes: Royal purple badge backgrounds.
    - Suffixes: Vibrant sky-blue badge backgrounds.
- **Typography Standards**:
  - Primary typeface: **Lexend** (specifically engineered to reduce visual stress and improve reading fluency in developing readers).
  - Minimum text size on falling fruit: $24\text{px}$ bold with a $4\text{px}$ dark outline (`#1a1a1a`) ensuring legibility against any fruit color.
  - Minimum prompt text size: $32\text{px}$ bold.
  - Contrast ratios exceed WCAG AAA standards ($> 7:1$ contrast ratio for all text elements).
- **Audio Sensitivity for Children**:
  - Strict avoidance of harsh buzzer, alarm, or failure sounds.
  - Wrong catch sounds use soft, descending wooden marimba / flute tones.
  - Maximum volume normalized; independent sliders for Sound Effects, Music, and Voice TTS.
- **Screen Reader Support**:
  - Hidden ARIA live region (`<div id="game-announcements" aria-live="polite" class="sr-only">`) updated dynamically with round objectives, feedback messages, and score updates.

---

## 8. Data Architecture & Zod Curriculum Schemas

Per `STACK.md` and `SPEC.md`, all curriculum content, word lists, and level parameters **MUST** reside in external JSON files and be validated at runtime via Zod schemas. Inline hardcoded word lists are strictly forbidden.

### 8.1 TypeScript Interfaces & Zod Schemas

```typescript
import { z } from 'zod';

// ==========================================
// 1. Primitive & Enum Schemas
// ==========================================

export const FruitTypeSchema = z.enum([
  'apple',
  'orange',
  'grape',
  'banana',
  'watermelon',
  'blueberry',
  'strawberry',
  'lemon',
  'kiwi',
  'peach',
  'plum',
  'cherry'
]);

export const CurriculumDomainSchema = z.enum([
  'phonics',
  'morphology',
  'vocabulary',
  'math'
]);

export const PhonicsCategorySchema = z.enum([
  'vowel_team',
  'r_controlled',
  'vce_long_vowel'
]);

export const AffixTypeSchema = z.enum([
  'prefix',
  'suffix'
]);

export const VocabularyRelationSchema = z.enum([
  'synonym',
  'antonym'
]);

// ==========================================
// 2. Curriculum Item Schemas
// ==========================================

// Topic A: Phonics Word Item
export const PhonicsItemSchema = z.object({
  id: z.string().min(1),
  word: z.string().min(1),
  targetPattern: z.string().min(1), // e.g. "ea", "ai", "ar"
  phonemeSound: z.string().min(1),  // e.g. "/ē/", "/ĕ/", "/ār/"
  category: PhonicsCategorySchema,
  isTrickster: z.boolean().default(false), // e.g. true for "ea" short e
  distractors: z.array(z.string()).min(2),
  hint: z.string().optional()
});

// Topic B: Morphology Word Item
export const MorphologyItemSchema = z.object({
  id: z.string().min(1),
  word: z.string().min(1),          // e.g. "replay"
  baseWord: z.string().min(1),      // e.g. "play"
  affix: z.string().min(1),         // e.g. "re-"
  affixType: AffixTypeSchema,       // "prefix" | "suffix"
  meaning: z.string().min(1),       // e.g. "again"
  segmentedDisplay: z.string().min(1), // e.g. "re + play → replay"
  distractors: z.array(z.string()).min(2),
  hint: z.string().optional()
});

// Topic C: Vocabulary Word Item
export const VocabularyItemSchema = z.object({
  id: z.string().min(1),
  targetWord: z.string().min(1),    // e.g. "big"
  relation: VocabularyRelationSchema, // "synonym" | "antonym"
  correctAnswers: z.array(z.string()).min(1), // e.g. ["large", "huge", "giant"]
  distractors: z.array(z.string()).min(2),    // e.g. ["small", "tiny", "blue"]
  contextSentence: z.string().min(1),         // e.g. "The pumpkin was SO ____!"
  spokenPrompt: z.string().min(1)             // e.g. "Catch words that mean the same as big!"
});

// Extensible Domain: Grade 2 Math Item
export const MathItemSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),        // e.g. "Catch equations that equal 12!"
  spokenPrompt: z.string().min(1),
  correctAnswers: z.array(z.string()).min(1), // e.g. ["6 + 6", "7 + 5", "10 + 2"]
  distractors: z.array(z.string()).min(2),    // e.g. ["8 + 3", "9 + 4", "7 + 6"]
  explanation: z.string().min(1)              // e.g. "6 + 6 = 12"
});

// ==========================================
// 3. Level & Progression Schemas
// ==========================================

export const LevelConfigSchema = z.object({
  levelNumber: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().min(1),
  promptText: z.string().min(1),
  spokenPrompt: z.string().min(1),
  teachingRule: z.string().min(1),
  teachingCardContent: z.object({
    headline: z.string(),
    body: z.string(),
    exampleWord: z.string(),
    audioKey: z.string().optional()
  }),
  fallSpeedSeconds: z.number().min(1.0).max(5.0).default(2.5),
  itemCount: z.number().int().min(10).max(25).default(15),
  masteryAccuracyThreshold: z.number().min(0.5).max(1.0).default(0.85),
  itemPool: z.array(z.string()).min(4), // References item IDs
  distractorPool: z.array(z.string()).min(4),
  isBossLevel: z.boolean().default(false)
});

// ==========================================
// 4. Root Curriculum Manifest Schema
// ==========================================

export const TopicManifestSchema = z.object({
  topicId: z.string().min(1),
  domain: CurriculumDomainSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  standards: z.array(z.string()),
  levels: z.array(LevelConfigSchema).min(3),
  items: z.union([
    z.array(PhonicsItemSchema),
    z.array(MorphologyItemSchema),
    z.array(VocabularyItemSchema),
    z.array(MathItemSchema)
  ])
});

export const MasterCurriculumSchema = z.object({
  version: z.string(),
  lastUpdated: z.string(),
  topics: z.array(TopicManifestSchema).min(3)
});

export type MasterCurriculum = z.infer<typeof MasterCurriculumSchema>;
export type TopicManifest = z.infer<typeof TopicManifestSchema>;
export type LevelConfig = z.infer<typeof LevelConfigSchema>;
export type PhonicsItem = z.infer<typeof PhonicsItemSchema>;
export type MorphologyItem = z.infer<typeof MorphologyItemSchema>;
export type VocabularyItem = z.infer<typeof VocabularyItemSchema>;
export type MathItem = z.infer<typeof MathItemSchema>;
```

### 8.2 Directory & Asset Layout
To satisfy `STACK.md` rules (`dom-sprites` forbidden, `unbatched-image-loads` forbidden, `hardcoded-curriculum-logic` forbidden):
```
public/
├── assets/
│   ├── atlas/
│   │   ├── game_atlas.png      # Single packed texture atlas
│   │   └── game_atlas.json     # Frame coordinates for all fruits, buttons, particles
│   └── audio/                  # Minimal optional audio assets (if not purely synthesized)
├── curriculum/
│   ├── phonics.json            # Topic A items & levels
│   ├── morphology.json         # Topic B items & levels
│   ├── vocabulary.json         # Topic C items & levels
│   └── math.json               # Extensible Grade 2 Math items & levels
└── manifest.webmanifest        # Android compliant PWA manifest
```

---

## 9. Player Progress & Persistence Schema (IndexedDB)

The persistence engine strictly uses local IndexedDB storage (via `idb-keyval` or `Dexie`) with no external tracking or cloud logins:

```typescript
export interface LevelProgressRecord {
  levelId: string;
  unlocked: boolean;
  completed: boolean;
  highScore: number;
  starsEarned: 0 | 1 | 2 | 3;
  attemptsCount: number;
  bestAccuracy: number;
  lastPlayedTimestamp: number;
}

export interface PatternMasteryRecord {
  patternKey: string;      // e.g. "ea_short_e", "prefix_re", "synonym_big"
  totalExposures: number;
  correctCatches: number;
  wrongCatches: number;
  missedCount: number;
  errorRate: number;       // wrongCatches / totalExposures
  needsRemediation: boolean; // errorRate > 0.35 or >= 2 misses
}

export interface UserPreferencesRecord {
  soundEnabled: boolean;
  soundVolume: number;
  musicEnabled: boolean;
  musicVolume: number;
  speechTtsEnabled: boolean;
  speechRate: number;
  highContrastMode: boolean;
  reducedMotion: boolean;
}

export interface PlayerProfileStore {
  version: number;
  activeTopicId: string;
  totalStars: number;
  orchardWaterStage: number; // 0..N
  levels: Record<string, LevelProgressRecord>;
  patternStats: Record<string, PatternMasteryRecord>;
  preferences: UserPreferencesRecord;
}
```

---

## 10. Compliance & Standards Verification Matrix

| Requirement Source | Requirement Key | Status | Verification & Evidence |
|--------------------|-----------------|--------|-------------------------|
| `STACK.md` | `phaser` required engine | COMPLIANT | Phaser 4 specified for fixed-timestep Arcade Physics loop. |
| `STACK.md` | `zod` required validation | COMPLIANT | Full Zod schema defined for all curriculum files; runtime validation gate before scene startup. |
| `STACK.md` | `raw-raf-loop` forbidden | COMPLIANT | Raw `requestAnimationFrame` strictly banned; physics uses Phaser delta ticks. |
| `STACK.md` | `dom-sprites` forbidden | COMPLIANT | All falling elements render onto Phaser canvas via WebGL/Canvas context. |
| `STACK.md` | `unbatched-image-loads` forbidden | COMPLIANT | Single packed texture atlas (`game_atlas.png` + `game_atlas.json`) specified. |
| `STACK.md` | `hardcoded-curriculum-logic` forbidden | COMPLIANT | All curriculum data, word lists, and level rules externalized to JSON files. |
| `ORIGINAL_REQUEST.md` | Topic A Phonics (>=40 words) | COMPLIANT | 65+ curated curriculum words covering all 9 vowel teams and 5 r-controlled vowels with explicit "ea" split. |
| `ORIGINAL_REQUEST.md` | Topic B Morphology (>=30 base words) | COMPLIANT | 12 affixes across 50+ base words with visual segmentation specification (`base + affix → word`). |
| `ORIGINAL_REQUEST.md` | Topic C Vocabulary (>=40 pairs) | COMPLIANT | 40+ synonym/antonym sets with contextual sentence prompts. |
| `ORIGINAL_REQUEST.md` | Scaffolded Progression & Mastery (>85%) | COMPLIANT | 5-level scaffold per topic; advancement strictly locked until $>85\%$ over 10+ attempts. |
| `ORIGINAL_REQUEST.md` | Mistake Remediation (3 errors) | COMPLIANT | Speed dampening (-35% to -50%) + interactive teaching card popup upon 3 consecutive mistakes. |
| `ORIGINAL_REQUEST.md` | Single-Thumb Mobile Portrait & >=48px Hitbox | COMPLIANT | Fixed 9:16 portrait viewport; circular touch targets minimum 48px diameter. |
| `ORIGINAL_REQUEST.md` | Dyslexia-Friendly Typography | COMPLIANT | Lexend font family specified with color-coded affixes and high-contrast outlines. |
| `ORIGINAL_REQUEST.md` | Audio Pipeline (Synthesis & TTS) | COMPLIANT | Web Audio synthesizer for tactile chimes; Web Speech API TTS for spoken instructions; first-touch unlock. |
| `ORIGINAL_REQUEST.md` | Purely Local Storage (IndexedDB) | COMPLIANT | Complete offline IndexedDB schema specified; zero tracking, zero remote network requirements. |

---

## 11. Conclusion & Recommendations for Implementation Track

1. **Curriculum Separation**: Implementation teams must immediately create the external JSON curriculum files (`public/curriculum/*.json`) and validate them against the Zod schemas in `src/curriculum/schema.ts` before building Phaser scenes.
2. **Texture Atlas Generation**: Graphics pipeline should generate a single packed texture atlas containing all 12 fruit sprites, buttons, badges, and particle textures to satisfy the zero-unbatched-loads rule.
3. **Audio Strategy**: Implement a lightweight Web Audio synthesizer class (`SynthesizerAudioService`) to generate clean, pleasant ascending/descending chime tones with zero external MP3 file download latency, paired with `window.speechSynthesis` for verbal prompts.
4. **Phaser Scale Manager**: Configure Phaser with `mode: Phaser.Scale.FIT`, `autoCenter: Phaser.Scale.CENTER_BOTH`, and fixed dimensions (e.g. `480 x 854` or `540 x 960` for portrait 9:16 aspect ratio).
