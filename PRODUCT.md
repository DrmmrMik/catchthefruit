# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Primary users are Grade 2 elementary school students (ages 7–8, aligned with Pittsburgh Public Schools ELA benchmarks), learning to read, decode, and expand vocabulary. Secondary users are elementary educators and parents seeking distraction-free, privacy-preserving literacy practice.

## Product Purpose
"Catch the Fruit" is an educational 2D arcade Progressive Web App that teaches phonics (vowel teams and r-controlled vowels), morphology (prefixes and suffixes), and vocabulary (synonyms and antonyms). Its goal is to make foundational literacy mastery joyful and scaffolded, working fully offline without external accounts or data collection.

## Positioning
Unlike generic gamified flashcards, Catch the Fruit combines authentic 16-bit retro arcade mechanics with deep pedagogical structure: explicit phonological discrimination (including the dual sounds of "ea"), live visual morphological segmentation on catch (`re + play → replay`), context-rich vocabulary sentences, and adaptive pacing that slows down and remediates before frustration sets in.

## Operating Context
Used primarily in classroom literacy rotations, after-school programs, and home mobile devices in single-thumb portrait orientation. Frequently operated in school environments with spotty or restricted Wi-Fi, making zero-latency offline operation essential.

## Capabilities and Constraints
- **Arcade Engine**: Phaser fixed-timestep physics ensuring identical fall mechanics across 60Hz and 120Hz mobile digitizers. Touch targets are centered and at least 48px in diameter (measured >= 64px x 74px).
- **Visual Pipeline**: 16-color locked retro palette (`palette.json`), nearest-neighbor downsampling with `--anim-lock` for multi-frame animations, packed into a single power-of-two texture atlas (`atlas.png` + `atlas.json`). Zero unbatched individual image requests.
- **Pedagogical Engine**: External JSON curriculum files validated via runtime Zod schemas. Scaffolded progression requiring >85% accuracy over 10+ items to unlock subsequent levels.
- **Remediation & Adaptive Pacing**: After 3 consecutive incorrect catches, fall speed is automatically dampened (+800ms fall duration) and an explanatory `TeachingCard` modal is presented with spoken voice instruction before resuming.
- **Audio Synthesis**: Procedural Web Audio API sound synthesis (ascending chimes, gentle miss tones, pentatonic combo chords) with mobile touch gesture audio unlocking. Auditory voice prompts powered by Web Speech API TTS.
- **Offline & Persistence**: Vite + Workbox offline PWA with individual asset precaching (no bare `cache.addAll`). Progress, unlocked stages, stars, and error tracking persist locally in IndexedDB without external network telemetry.

## Brand Commitments
- High-contrast, dyslexia-friendly typography utilizing the Lexend font family.
- Authentic 16-bit retro pixel art aesthetic with vibrant orchard visuals and smooth sprite keyframing.
- Encouraging, gentle educational tone with positive error framing (no punishment states, only supportive teaching moments).

## Evidence on Hand
- Full Grade 2 PA Core curriculum datasets in `data/curriculum/`: Topic A (58 phonics words), Topic B (12 affixes, 49 base words), Topic C (44 vocabulary pairs in contextual sentences).
- 16-bit texture atlas at `public/assets/atlas.png` and `public/assets/atlas.json`.
- Comprehensive automated test suite: 20 test files, 499 tests passed (100% pass rate).
- PWA manifest and icons: 192px and 512px full-bleed maskable PNG icons.

## Product Principles
1. **Zero Reading Barrier to Play**: Spoken voice TTS prompts and clear color-coded visual cues ensure emerging readers can immediately understand round objectives.
2. **Pedagogical Integrity Over Guesswork**: Real morphological breakdowns and phonetic discrimination rather than arbitrary matching.
3. **Fair, Deterministic Physics**: Identical gameplay feel across flagship 120Hz phones, standard 60Hz tablets, and desktop browsers.
4. **Offline Autonomy & Student Privacy**: 100% client-side execution; zero accounts, trackers, advertisements, or cloud dependencies.

## Accessibility & Inclusion
- Touch target hitboxes >= 48px diameter with no swipe or drag requirements (single tap / thumb play).
- High contrast dyslexia-friendly Lexend typography with distinct color-coded morpheme and vowel highlights.
- Dual-channel instruction (spoken Web Speech TTS voice instructions paired with visual prompt banners).
- Calibrated motion and error remediation to avoid sensory overload or reading anxiety.
