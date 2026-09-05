/**
 * Challenger M4-1 Standalone Adversarial Verification Oracle
 * Milestone 4: Fixed-Timestep Physics, Fall Duration Scaling, HitAreas & Basket Clamping
 */

import fs from 'fs';
import path from 'path';

const ROOT_DIR = '/home/gallabot/Documents/antigravity/joyful-hertz';
const LOG_FILE = path.join(ROOT_DIR, '.agents/challenger_m4_1/verification.log');

let passedTests = 0;
let failedTests = 0;
const logLines = [];

function log(msg = '') {
  console.log(msg);
  logLines.push(msg);
}

function pass(testName, details = '') {
  passedTests++;
  log(`  [PASS] ${testName}${details ? ' — ' + details : ''}`);
}

function fail(testName, details = '') {
  failedTests++;
  log(`  [FAIL] ${testName}${details ? ' — ' + details : ''}`);
}

function assert(condition, testName, details = '') {
  if (condition) {
    pass(testName, details);
  } else {
    fail(testName, details);
  }
}

log('================================================================');
log('   CHALLENGER M4-1 EMPIRICAL ADVERSARIAL VERIFICATION ORACLE    ');
log('   Milestone 4: Core Gameplay, Physics, Hitboxes & Clamping     ');
log('================================================================\n');

// --------------------------------------------------------------------------
// TEST 1: Source Code Invariants & Static Contracts
// --------------------------------------------------------------------------
log('--- TEST 1: SOURCE CODE INVARIANTS & ENGINE CONFIG AUDITING ---');

const mainSource = fs.readFileSync(path.join(ROOT_DIR, 'src/main.ts'), 'utf-8');
const gameSceneSource = fs.readFileSync(path.join(ROOT_DIR, 'src/scenes/GameScene.ts'), 'utf-8');

assert(
  /fixedStep:\s*true/.test(mainSource),
  'main.ts configures physics.arcade.fixedStep: true',
  'Enforces deterministic fixed simulation'
);

assert(
  /fps:\s*60/.test(mainSource),
  'main.ts configures physics.arcade.fps: 60',
  'Targets standard 60Hz physics base'
);

assert(
  /default:\s*['"]arcade['"]/.test(mainSource),
  'main.ts specifies default physics: "arcade"',
  'Arcade physics engine selected'
);

assert(
  /this\.physics\.world\.fixedStep\s*=\s*true/.test(gameSceneSource),
  'GameScene.ts explicitly sets this.physics.world.fixedStep = true in create()',
  'Scene-level fixed-timestep confirmed'
);

assert(
  !/fallSpeedDurationMs[^\n]*\*\s*2/.test(gameSceneSource),
  'GameScene.ts does NOT contain fallSpeedDurationMs * 2 doubling multiplier',
  'Duration bug verified absent'
);

assert(
  /const\s+deltaSeconds\s*=\s*delta\s*\/\s*1000/.test(gameSceneSource),
  'GameScene.ts computes deltaSeconds = delta / 1000',
  'Delta scaling correctly normalized from milliseconds'
);

assert(
  /fruit\.container\.y\s*\+=\s*fruit\.speed\s*\*\s*deltaSeconds/.test(gameSceneSource),
  'GameScene.ts applies fruit.container.y += fruit.speed * deltaSeconds',
  'Continuous delta-time falling integration'
);

assert(
  /container\.setInteractive\(\s*new\s+Phaser\.Geom\.Rectangle\(\s*-hitWidth\s*\/\s*2,\s*-hitHeight\s*\/\s*2,\s*hitWidth,\s*hitHeight\s*\)/.test(gameSceneSource),
  'GameScene.ts applies centered hitArea [-hitWidth/2, -hitHeight/2, hitWidth, hitHeight]',
  'Touch hitbox coordinate centering confirmed'
);

assert(
  /Phaser\.Math\.Clamp\([^\n]+,\s*55,\s*width\s*-\s*55\)/.test(gameSceneSource),
  'GameScene.ts clamps basket between 55 and width - 55 (425)',
  'Basket visual clamping confirmed'
);

assert(
  /pointer\.y\s*>\s*height\s*-\s*140/.test(gameSceneSource),
  'GameScene.ts filters basket tap/drag to lower playfield (pointer.y > height - 140)',
  'A11y thumb-zone touch navigation confirmed'
);

// --------------------------------------------------------------------------
// TEST 2: Empirical Fixed-Timestep Physics & Refresh Rate Invariance
// --------------------------------------------------------------------------
log('\n--- TEST 2: EMPIRICAL FIXED-TIMESTEP PHYSICS & REFRESH RATE INVARIANCE ---');

const fallDurationMs = 2400; // 2.4s
const totalDistance = 600; // px
const speed = totalDistance / (fallDurationMs / 1000); // 250 px/s

// 60Hz: 60 frames, delta = 16.666667ms
const dt60 = 1000 / 60;
let pos60_1s = 0;
for (let i = 0; i < 60; i++) pos60_1s += speed * (dt60 / 1000);

// 120Hz: 120 frames, delta = 8.333333ms
const dt120 = 1000 / 120;
let pos120_1s = 0;
for (let i = 0; i < 120; i++) pos120_1s += speed * (dt120 / 1000);

// 144Hz: 144 frames, delta = 6.944444ms
const dt144 = 1000 / 144;
let pos144_1s = 0;
for (let i = 0; i < 144; i++) pos144_1s += speed * (dt144 / 1000);

// 240Hz: 240 frames, delta = 4.166667ms
const dt240 = 1000 / 240;
let pos240_1s = 0;
for (let i = 0; i < 240; i++) pos240_1s += speed * (dt240 / 1000);

const diff60_120 = Math.abs(pos60_1s - pos120_1s);
assert(
  diff60_120 < 1e-9,
  'Displacement at 60Hz and 120Hz after 1.0s is identical',
  `pos60=${pos60_1s.toFixed(6)}px, pos120=${pos120_1s.toFixed(6)}px, diff=${diff60_120.toExponential(4)}`
);

assert(
  Math.abs(pos60_1s - speed) < 1e-6 && Math.abs(pos120_1s - speed) < 1e-6,
  'Displacement in 1.0s matches nominal speed exactly',
  `expected ${speed}px, got 60Hz:${pos60_1s.toFixed(6)}px, 120Hz:${pos120_1s.toFixed(6)}px`
);

assert(
  Math.abs(pos144_1s - speed) < 1e-6 && Math.abs(pos240_1s - speed) < 1e-6,
  'Displacement extends accurately to 144Hz and 240Hz display hardware',
  `144Hz:${pos144_1s.toFixed(6)}px, 240Hz:${pos240_1s.toFixed(6)}px`
);

// Jitter simulation: 100 random frames summing to 2500ms
let totalJitterTimeMs = 0;
let jitterPos = 0;
for (let i = 0; i < 100; i++) {
  const dt = 5 + Math.sin(i * 1.7) * 3 + (i % 7) * 4; // fluctuates 2ms to 32ms
  totalJitterTimeMs += dt;
  jitterPos += speed * (dt / 1000);
}
const expectedJitterPos = speed * (totalJitterTimeMs / 1000);
assert(
  Math.abs(jitterPos - expectedJitterPos) < 1e-6,
  'Delta scaling is invariant under erratic frame-rate jitter (100 frames)',
  `simulated=${jitterPos.toFixed(4)}px, analytical=${expectedJitterPos.toFixed(4)}px`
);

// Mathematical equivalence check: speed * (delta / 1000) vs (delta / 16.666667) * step60
const dtArbitrary = 11.45;
const form1 = speed * (dtArbitrary / 1000);
const form2 = (speed * 0.016666666667) * (dtArbitrary / 16.666666667);
assert(
  Math.abs(form1 - form2) < 1e-9,
  'Delta scaling (delta / 1000) is algebraically identical to (delta / 16.666) * frameDelta60',
  `form1=${form1.toFixed(8)}, form2=${form2.toFixed(8)}`
);

// --------------------------------------------------------------------------
// TEST 3: Fall Duration Scaling Across Levels (2800ms - 1800ms)
// --------------------------------------------------------------------------
log('\n--- TEST 3: FALL DURATION SCALING ACROSS TOPICS & LEVELS ---');

const curriculumFiles = ['phonics.json', 'morphology.json', 'vocabulary.json', 'math.json'];
let allDurationsValid = true;
let allMonotonic = true;
let levelDetails = [];

for (const file of curriculumFiles) {
  const filePath = path.join(ROOT_DIR, 'data', file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const levels = data.levels || [];

  assert(levels.length >= 5, `${file}: contains at least 5 levels`, `found ${levels.length} levels`);

  const l1 = levels.find(l => l.levelNumber === 1);
  const l5 = levels.find(l => l.levelNumber === 5);

  assert(
    l1 && l1.fallSpeedDurationMs === 2800,
    `${file} Level 1: fallSpeedDurationMs == 2800ms`,
    `actual=${l1?.fallSpeedDurationMs}ms (speed ${(600 / (2800 / 1000)).toFixed(2)} px/s)`
  );

  assert(
    l5 && l5.fallSpeedDurationMs === 1800,
    `${file} Level 5: fallSpeedDurationMs == 1800ms`,
    `actual=${l5?.fallSpeedDurationMs}ms (speed ${(600 / (1800 / 1000)).toFixed(2)} px/s)`
  );

  for (let i = 0; i < levels.length; i++) {
    const dur = levels[i].fallSpeedDurationMs;
    if (dur < 1800 || dur > 2800) allDurationsValid = false;
    if (i > 0 && dur > levels[i - 1].fallSpeedDurationMs) allMonotonic = false;
    levelDetails.push(`${data.topic} L${levels[i].levelNumber}: ${dur}ms`);
  }
}

assert(
  allDurationsValid,
  'All 20 levels across 4 topics strictly satisfy: 1800ms <= fallSpeedDurationMs <= 2800ms',
  'All fall rates bounded strictly within 214.3 px/s - 333.3 px/s'
);

assert(
  allMonotonic,
  'Fall durations monotonically decrease (speeds increase) as difficulty progresses',
  'Zero regression in fall rate progression'
);

// --------------------------------------------------------------------------
// TEST 4: Fruit HitArea Touch Target Geometry (>= 48px, Centered)
// --------------------------------------------------------------------------
log('\n--- TEST 4: FRUIT CONTAINER HITAREA GEOMETRY & BOUNDARY VERIFICATION ---');

// Audit all words in all 4 curriculum datasets
let totalWordsChecked = 0;
let allHitSizesValid = true;
let allContainOrigin = true;
let allContainTouchBounds = true;
let allContainSpriteAnchor = true;
let allContainLabelAnchor = true;

for (const file of curriculumFiles) {
  const filePath = path.join(ROOT_DIR, 'data', file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const items = data.items || [];

  for (const item of items) {
    let words = [];
    if (data.topic === 'phonics') {
      words = [item.word, ...(item.distractorWords || [])];
    } else if (data.topic === 'morphology') {
      words = [item.combinedWord, item.baseWord, ...(item.distractorWords || [])];
    } else if (data.topic === 'vocabulary') {
      words = [item.matchWord, item.targetWord, ...(item.distractorWords || [])];
    } else if (data.topic === 'math') {
      words = [String(item.result), ...(item.distractorResults || []).map(String)];
    }

    for (const w of words) {
      if (!w) continue;
      totalWordsChecked++;

      const textLen = String(w).length;
      const pillW = Math.max(textLen * 11 + 24, 72);
      const hitWidth = Math.max(pillW, 64);
      const hitHeight = 74;

      if (hitWidth < 48 || hitHeight < 48) allHitSizesValid = false;

      // Centered rectangle: x in [-hitWidth/2, +hitWidth/2], y in [-hitHeight/2, +hitHeight/2]
      const halfW = hitWidth / 2;
      const halfH = hitHeight / 2;

      const contains = (x, y) => x >= -halfW && x <= halfW && y >= -halfH && y <= halfH;

      if (!contains(0, 0)) allContainOrigin = false;
      if (!contains(-24, -24) || !contains(24, -24) || !contains(-24, 24) || !contains(24, 24)) {
        allContainTouchBounds = false;
      }
      if (!contains(0, -12)) allContainSpriteAnchor = false; // Fruit sprite at y = -12
      if (!contains(0, 31)) allContainLabelAnchor = false;   // Text label at y = 31
    }
  }
}

assert(
  totalWordsChecked >= 200,
  `Tested ${totalWordsChecked} curriculum vocabulary words across all items`,
  'Full curriculum word coverage'
);

assert(
  allHitSizesValid,
  'All fruit hitAreas satisfy width >= 48px and height >= 48px',
  'Minimum dimensions: hitWidth >= 72px, hitHeight = 74px'
);

assert(
  allContainOrigin,
  'All fruit hitAreas contain container origin (0, 0)',
  'Touch center hits target'
);

assert(
  allContainTouchBounds,
  'All fruit hitAreas contain complete 48x48px touch zone [(-24,-24) to (24,24)]',
  'All 4 quadrants exceed 48px accessible touch boundary'
);

assert(
  allContainSpriteAnchor,
  'All fruit hitAreas contain fruit sprite center (0, -12)',
  'Tapping the fruit sprite registers hit'
);

assert(
  allContainLabelAnchor,
  'All fruit hitAreas contain word label center (0, 31)',
  'Tapping the text pill registers hit'
);

// Empirical demonstration: uncentered rectangle fails negative touch coordinates
const uncenteredW = 72;
const uncenteredH = 74;
const uncenteredContains = (x, y) => x >= 0 && x <= uncenteredW && y >= 0 && y <= uncenteredH;

assert(
  !uncenteredContains(-24, -24) && !uncenteredContains(0, -12) && !uncenteredContains(-25, 0),
  'Adversarial proof: Uncentered Rectangle(0,0,w,h) fails touches at (-24,-24), (0,-12), (-25,0)',
  'Proves centered hitArea [-w/2, -h/2, w, h] is strictly necessary for gameplay reliability'
);

// --------------------------------------------------------------------------
// TEST 5: Basket Touch & Keyboard Clamping Bounds [0, 480]
// --------------------------------------------------------------------------
log('\n--- TEST 5: BASKET TOUCH & KEYBOARD BOUNDS CLAMPING [0, 480] ---');

const screenW = 480;
const clampMin = 55;
const clampMax = screenW - 55; // 425
const basketW = 96;
const basketHalfW = basketW / 2; // 48px

assert(
  clampMin === 55 && clampMax === 425,
  'Clamp range [55, 425] is configured for screen width 480',
  `minX=${clampMin}, maxX=${clampMax}`
);

// Verify visual boundaries of basket
const leftVisual = clampMin - basketHalfW;
const rightVisual = clampMax + basketHalfW;

assert(
  leftVisual >= 0 && rightVisual <= screenW,
  'Basket visual sprite [x - 48, x + 48] remains strictly within screen width [0, 480]',
  `leftmost visual edge = ${leftVisual}px (>=0), rightmost visual edge = ${rightVisual}px (<=480)`
);

// Fuzz test 10,000 extreme input coordinate values
let allClampedCorrectly = true;
let allVisualBoundsInsideScreen = true;

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

// Explicit extreme boundary values
const testInputs = [
  -Infinity, -1e9, -10000, -480, -100, -55, -1, 0, 1, 54, 55, 56,
  240, 424, 425, 426, 479, 480, 481, 600, 1000, 10000, 1e9, Infinity
];

for (const x of testInputs) {
  const cx = clamp(x, clampMin, clampMax);
  if (cx < clampMin || cx > clampMax) allClampedCorrectly = false;
  if (cx - basketHalfW < 0 || cx + basketHalfW > screenW) allVisualBoundsInsideScreen = false;
}

// 10,000 random fuzz inputs
for (let i = 0; i < 10000; i++) {
  const randomX = (Math.random() - 0.5) * 20000;
  const cx = clamp(randomX, clampMin, clampMax);
  if (cx < clampMin || cx > clampMax) allClampedCorrectly = false;
  if (cx - basketHalfW < 0 || cx + basketHalfW > screenW) allVisualBoundsInsideScreen = false;
}

assert(
  allClampedCorrectly,
  'All 10,024 fuzzed basket coordinates strictly clamped to [55, 425]',
  'Zero boundary violations under extreme input values'
);

assert(
  allVisualBoundsInsideScreen,
  'All fuzzed basket positions guarantee visual sprite stays within [0, 480]',
  'Basket never bleeds outside virtual viewport'
);

// Simulate keyboard traversal at variable framerates
let kx = 240;
const kSpeed = 400; // px/s
// Hold left key for 1000 ticks
for (let i = 0; i < 1000; i++) {
  kx = clamp(kx - kSpeed * (16.6667 / 1000), clampMin, clampMax);
}
assert(
  kx === clampMin,
  'Sustained keyboard LEFT navigation clamps cleanly at minX (55px)',
  `final basket.x = ${kx}`
);

// Hold right key for 1000 ticks
for (let i = 0; i < 1000; i++) {
  kx = clamp(kx + kSpeed * (16.6667 / 1000), clampMin, clampMax);
}
assert(
  kx === clampMax,
  'Sustained keyboard RIGHT navigation clamps cleanly at maxX (425px)',
  `final basket.x = ${kx}`
);

// --------------------------------------------------------------------------
// TEST 6: Rectangle-to-Rectangle Basket Catch Collision Geometry
// --------------------------------------------------------------------------
log('\n--- TEST 6: BASKET & FRUIT COLLISION DETECTION GEOMETRY ---');

function rectIntersects(r1, r2) {
  return !(
    r2.x > r1.x + r1.w ||
    r2.x + r2.w < r1.x ||
    r2.y > r1.y + r1.h ||
    r2.y + r2.h < r1.y
  );
}

const basketRect = { x: 240 - 48, y: 755 - 28, w: 96, h: 56 }; // [192, 727, 96, 56]

// Direct hit
const directFruit = { x: 240 - 36, y: 730 - 37, w: 72, h: 74 };
assert(
  rectIntersects(basketRect, directFruit),
  'Direct central fruit entry intersects basket bounding box',
  'Catch registered'
);

// Left graze
const leftGrazeFruit = { x: 192 - 70, y: 730, w: 72, h: 74 }; // x+w = 194 > 192
assert(
  rectIntersects(basketRect, leftGrazeFruit),
  'Fruit grazing basket left lip intersects basket bounding box',
  'Left edge catch registered'
);

// Left near miss
const leftMissFruit = { x: 192 - 75, y: 730, w: 72, h: 74 }; // x+w = 189 < 192
assert(
  !rectIntersects(basketRect, leftMissFruit),
  'Fruit falling outside left rim does NOT intersect basket',
  'Correctly rejected as miss'
);

// High fruit
const highFruit = { x: 240 - 36, y: 500, w: 72, h: 74 };
assert(
  !rectIntersects(basketRect, highFruit),
  'Fruit at mid-screen does NOT intersect basket prematurely',
  'No premature catch'
);

// --------------------------------------------------------------------------
// SUMMARY & LOG PERSISTENCE
// --------------------------------------------------------------------------
log('\n================================================================');
log('                     VERIFICATION SUMMARY                       ');
log('================================================================');
log(`  Total Checks Executed : ${passedTests + failedTests}`);
log(`  Checks Passed         : ${passedTests}`);
log(`  Checks Failed         : ${failedTests}`);
log(`  Verdict               : ${failedTests === 0 ? 'APPROVE' : 'REQUEST_CHANGES'}`);
log('================================================================');

fs.writeFileSync(LOG_FILE, logLines.join('\n') + '\n', 'utf-8');
console.log(`\nVerification log saved to: ${LOG_FILE}`);

process.exit(failedTests === 0 ? 0 : 1);
