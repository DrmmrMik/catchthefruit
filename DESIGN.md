---
name: Catch the Fruit
description: Grade 2 ELA educational 2D arcade game with 16-bit retro pixel art
colors:
  primary: "#0284c7"
  primary-border: "#0369a1"
  action: "#16a34a"
  action-border: "#15803d"
  phonics: "#0284c7"
  morphology: "#d97706"
  vocabulary: "#7c3aed"
  sky-bg: "#38bdf8"
  panel-bg: "#ffffff"
  neutral-light: "#f8fafc"
  neutral-muted: "#94a3b8"
  neutral-dark: "#0f172a"
  backdrop: "#071b2e"
typography:
  display:
    fontFamily: "Lexend, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "0.02em"
  headline:
    fontFamily: "Lexend, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Lexend, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Lexend, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Lexend, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    letterSpacing: "0.05em"
rounded:
  sm: "8px"
  md: "16px"
  lg: "24px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "16px 32px"
    height: "56px"
    width: "240px"
  button-primary-hover:
    backgroundColor: "{colors.action-border}"
  button-icon:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "8px"
    size: "64px"
  card-modal:
    backgroundColor: "{colors.panel-bg}"
    textColor: "{colors.neutral-dark}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: Catch the Fruit

## Overview

**Creative North Star: "The Pixel Orchard Classroom"**

Catch the Fruit fuses high-energy 16-bit arcade aesthetics with clean, distraction-free educational readability. Designed specifically for emerging elementary readers (Grade 2), the visual world prioritizes instantaneous legibility, crisp retro tactile feedback, and gentle positive reinforcement. Visual elements take inspiration from classic console arcade titles, rendered through a locked 16-color palette and unified texture atlas, while interface typography relies on high-contrast, dyslexia-friendly Lexend.

**Key Characteristics:**
- **High-Readability 16-Bit Pixel Art**: Retro orchard sprites and character animations rendered with nearest-neighbor clarity, strict palette harmony, and zero subpixel blur.
- **Cognitive Clarity**: Distraction-free modal layouts, color-coded morpheme breakdowns, and high contrast compliant with WCAG AAA standards.
- **Tactile Touch-First Controls**: Generous hitboxes ($\ge 48\text{px}$, standard $64\text{px} \times 74\text{px}$ fruit targets) optimized for small fingers and portrait mobile screens.

## Colors

The color system combines an energetic sky and orchard arcade palette with distinct topic-based semantic codings.

### Primary
- **Arcade Sky Blue** (`#0284c7`): Core brand accent and interactive prompt highlight. Used for the HUD prompt banner, default buttons, and Topic A (Phonics) cards.
- **Deep Ocean Border** (`#0369a1`): Stroke and shadow border providing high-contrast definition against bright backdrops.

### Secondary
- **Success Emerald** (`#16a34a`): Primary action and resume button color, signifying encouragement and forward progression.
- **Success Emerald Dark** (`#15803d`): Bevel stroke for action buttons.

### Topic Semantic Accents
- **Morphology Amber** (`#d97706`): Highlights prefixes, suffixes, and morphological root words.
- **Vocabulary Violet** (`#7c3aed`): Encodes synonym and antonym word pairs.

### Neutral
- **Sunny Canvas Sky** (`#38bdf8`): Game world background color.
- **Modal Pure White** (`#ffffff`): Card body backgrounds ensuring effortless reading contrast.
- **Night Navy Backdrop** (`#071b2e`): 85% opacity modal overlay for focus dampening during teaching cards.
- **Slate Text Dark** (`#0f172a`): Primary body and headline text achieving $\ge 7:1$ contrast ratio.
- **Slate Stroke Muted** (`#94a3b8`): Secondary borders, dividers, and inactive state badges.

### Named Rules
**The Color-Code Rule.** Phonics uses sky blue (`#0284c7`), Morphology uses amber (`#d97706`), and Vocabulary uses violet (`#7c3aed`). These color identities remain strictly consistent across intros, prompts, and remediation cards.

**The No-Flicker Rule.** All in-game sprites strictly snap to the locked palette with 1-bit alpha borders, completely eliminating color bleeding, halo artifacts, and unquantized drift.

## Typography

**Display Font:** Lexend (Variable) with system fallback (`system-ui, sans-serif`)
**Body Font:** Lexend (Variable) with system fallback
**Character:** Clean, expansive geometric letterforms engineered to reduce visual crowding and enhance reading fluency for young learners and readers with dyslexia.

### Hierarchy
- **Display** (800 weight, 32px, line-height 1.1): Round titles, victory celebrations, and primary word cards.
- **Headline** (700 weight, 24px, line-height 1.2): Level introduction titles and teaching card headers.
- **Title** (600 weight, 20px, line-height 1.3): HUD prompt banners and morphological segmentation equations (`re + play → replay`).
- **Body** (400 weight, 16px, line-height 1.4, max-width 45ch): Rule explanations and contextual vocabulary sentences.
- **Label** (700 weight, 14px, letter-spacing 0.05em): Button labels, score chips, and combo streaks.

### Named Rules
**The Dyslexia-Friendly Rule.** All in-game text must use Lexend with minimum 16px size for body explanations and 20px+ for targets. All caps is restricted strictly to short 1-2 word UI labels.

## Layout

The game operates exclusively in mobile-first portrait orientation ($480\text{px} \times 800\text{px}$ virtual viewport scaled uniformly to fit the device screen):
- **HUD Anchor**: Fixed to top safe area ($0\text{px}$ to $100\text{px}$) displaying the target word banner, star badges, and control toggles.
- **Active Playfield**: Center play area where fruits fall under fixed-timestep physics.
- **Basket Catcher Base**: Anchored along the bottom third, tracking horizontal touch coordinates without swipe resistance.
- **Modal Centering**: Level intros and remediation cards center directly over the playfield with an $85\%$ dark blue wash.

## Elevation & Depth

Catch the Fruit employs layered flat 2D retro depth rather than diffuse ambient shadows:
- **Structural Bevels**: Modals, prompt boxes, and buttons use 2–3px crisp solid line strokes (`lineStyle(3, borderHex)`) and flat offset shadow rectangles (`0x000000, 0.25–0.35` opacity, 4px vertical offset) evocative of classic 16-bit cartridge interfaces.
- **Modal Layering**: Modal dialogs live at depth $1000+$ over an 85% alpha backdrop rectangle (`0x071b2e`) to immediately decouple attention from the paused playfield.

### Named Rules
**The Crisp Bevel Rule.** UI cards and buttons do not use blurry CSS box-shadows. Depth is conveyed purely through high-contrast boundary strokes and crisp offset fills.

## Shapes

- **Modal Corners**: Generously rounded ($16\text{px}$ to $24\text{px}$ radius) for a child-friendly, safe tactile feel.
- **Action Buttons**: Rounded rectangles ($16\text{px}$ radius) with minimum dimensions of $220\text{px} \times 56\text{px}$ ensuring effortless tapping.
- **Icon Toggles**: Circular pills ($64\text{px} \times 64\text{px}$) for pause and audio toggles.
- **Target Sprites**: Pixel-art fruits and character keyframes maintain clean 1-bit alpha silhouettes without antialiased feathered halos.

## Components

### Buttons
- **Primary Action (Resume / Play)**: High-contrast emerald green (`#16a34a`) background with dark emerald border (`#15803d`), white bold Lexend text, $240\text{px} \times 56\text{px}$ minimum touch target.
- **Icon Controls (Pause / Sound)**: $64\text{px} \times 64\text{px}$ round buttons loaded from atlas frames (`btn-pause`, `btn-sound`), with tap scale-down tween feedback.

### Prompt Banner
- Centered rounded bar with white fill, 3px sky-blue border (`#0284c7`), and dark slate prompt text. Tapping the banner re-triggers the Web Speech TTS audio instruction.

### Teaching Card Modal
- Full-screen dimming overlay (`#071b2e` at 0.85).
- Centered white panel ($380\text{px} \times 460\text{px}$) with colored category badge, large target word, highlighted phoneme/morpheme pill, plain-language audio-ready explanation, and prominent green "KEEP PLAYING!" button.

### Orchard Growth Tree
- Multi-stage pixel art tree graphic advancing across 5 growth tiers based on cumulative star unlocks, celebrating long-term mastery.

## Do's and Don'ts

### Do:
- **Do** maintain touch target hitboxes of at least 48px on all interactive elements.
- **Do** ensure all text maintains $\ge 7:1$ contrast against card backgrounds for WCAG AAA compliance.
- **Do** render all sprite visuals through the single packed texture atlas (`atlas.png` + `atlas.json`).
- **Do** use fixed-timestep physics scaling so falling speeds are identical on 60Hz and 120Hz devices.
- **Do** provide spoken audio for all instructional prompts and remediation explanations.

### Don't:
- **Don't** use diffuse blurred shadows or antialiased gradients on retro pixel art sprites.
- **Don't** introduce raw `requestAnimationFrame` loops or unbatched individual image fetches.
- **Don't** penalize students with harsh buzzers, red failure flashes, or lives counters; use gentle remedial card pauses.
- **Don't** require horizontal swipe or drag gestures for falling fruits; single tap anywhere on the hitbox catches the fruit.
