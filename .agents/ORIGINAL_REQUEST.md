# Original User Request

## Initial Request — 2026-09-03T01:15:30Z

Build "Catch the Fruit", an educational 2D arcade Progressive Web App for a 2nd grade student in Pittsburgh Public Schools that teaches phonics (vowel teams and r-controlled vowels), morphology (prefixes and suffixes), and vocabulary (synonyms and antonyms) with scaffolded difficulty and offline capability.

Working directory: /home/gallabot/Documents/antigravity/joyful-hertz
Integrity mode: demo

Reference: SPEC.md and STACK.md in working directory.

## Requirements

### R1. Curriculum and Pedagogical Engine
- Support three Grade 2 ELA topic domains from the PA Core Standards:
  1. Topic A (Phonics): Vowel teams (ai, ay, ea [explicit split between /ē/ and /ĕ/], ee, ie, oa, oe, ui, ue) and r-controlled vowels (ar, er, ir, or, ur), minimum 40 curriculum words.
  2. Topic B (Morphology): Common prefixes (re-, un-, dis-, pre-) and suffixes (-s/-es, -ed, -ing, -er, -est, -ful, -less, -ly) across 30+ base words, featuring visual morphological segmentation on correct catch (e.g. `re + play → replay`).
  3. Topic C (Vocabulary): 40+ synonym and antonym word pairs contextualized in grade-level sentences.
- Store all curriculum data, word lists, and level parameters in external JSON files validated with runtime Zod schemas.
- Implement scaffolded progression (single rule no distractors → discrimination → mixed patterns → boss level) with mastery advancement requiring >85% accuracy over 10+ attempts.
- Include spaced repetition and mistake remediation: after 3 consecutive wrong catches, temporarily reduce fall speed and display a targeted teaching card before resuming.

### R2. 2D Arcade Mechanics and Visual UX
- Mobile-first, single-thumb portrait orientation arcade gameplay powered by Phaser 4 fixed-timestep physics, ensuring identical fall speeds across 60Hz and 120Hz mobile digitizers.
- All interactive falling fruits feature touch target hitboxes of at least 48px diameter with no swipe or drag requirements.
- Large, high-contrast, dyslexia-friendly typography (Lexend) with color-coded phonics/affix patterns.
- High-performance batched rendering using a single packed texture atlas (`.png` + `.json`) for all fruit sprites, UI elements, and particle effects.
- Dynamic reward feedback: particle sparkle chimes on correct catch, gentle explanatory correction on incorrect catch, and an orchard growth tree progress visualization.

### R3. Audio Pipeline
- Immediate tactile sound effects using Web Audio API synthesis (ascending correct chimes, gentle descending miss tones, celebratory round jingles).
- Spoken voice instructions and phoneme pronunciations using the Web Speech API (TTS) so no reading is required for children to understand the round's target objective.
- Responsive mobile audio unlocking triggered on first user touch gesture.

### R4. PWA Installation, Local Storage and Android Compliance
- Offline-first PWA built with Vite and Workbox (`vite-plugin-pwa`) featuring individual asset precaching (strictly prohibiting bare `cache.addAll`).
- Web App Manifest compliant with modern Android / Samsung Galaxy S24 Ultra standards: 192px and 512px full-bleed maskable PNG icons, standalone display mode, and an in-app installation prompt.
- Purely local persistence using IndexedDB (Dexie / idb-keyval) storing completed levels, stars, error tracking, and preferences without logins or external network tracking.

### R5. Deployment and Verification Gate
- Automated build and publication integration targeting GitHub Pages under `DrmmrMik/catch-the-fruit` and synchronized with the central `pwas` portal.
- All code and manifests must strictly pass `validate_pwa.py` with 0 errors and 0 warnings, and pass `bsa verify` against `STACK.md`.

## Acceptance Criteria

### Curriculum & Validation
- [ ] Topic A word list includes all specified vowel teams and r-controlled vowels (>=40 words) with dedicated instruction for the dual sounds of "ea".
- [ ] Topic B word list includes >=30 base words across the required prefixes and suffixes, displaying base + affix segmentation upon successful catch.
- [ ] Topic C word list includes >=40 synonym/antonym pairs with contextual sentence prompts.
- [ ] External curriculum JSON loads through strict Zod schemas with zero validation exceptions.
- [ ] Progression logic locks subsequent levels until mastery threshold (>=85% on 10+ items) is reached.

### Arcade Gameplay & Accessibility
- [ ] Game runs on Phaser 4 with fixed delta-time physics avoiding double-speed on 120Hz displays.
- [ ] All interactive fruit sprites have touch areas >= 48px.
- [ ] All sprite assets render via a single packed texture atlas.
- [ ] 3 consecutive mistakes trigger a speed dampener and remedial rule review card.

### PWA Standards & Android Compliance
- [ ] `python3 validate_pwa.py` passes with 0 errors and 0 warnings.
- [ ] `~/.build-standards/bin/bsa verify /home/gallabot/Documents/antigravity/joyful-hertz` passes.
- [ ] App is fully functional offline with service worker caching all assets.
- [ ] Web App Manifest has full-bleed 192px and 512px maskable PNG icons with no experimental/desktop-only keys.
- [ ] User progress (stars, level unlocks, per-pattern error counts) persists reliably across browser refreshes and restarts.

### Deployment & Live Access
- [ ] Built assets successfully deployed and live base URL returns HTTP 200 upon live probe.
