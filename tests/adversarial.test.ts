import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

describe('Adversarial Verification Suite (Challenger M1-2)', () => {
  const rootDir = process.cwd();

  it('executes Python adversarial verification oracle with 0 errors and APPROVE verdict', () => {
    const scriptPath = path.join(rootDir, 'scripts/adversarial_verify.py');
    expect(fs.existsSync(scriptPath)).toBe(true);

    const output = execSync(`python3 ${scriptPath}`, {
      encoding: 'utf-8',
      cwd: rootDir,
    });

    const outputPath = path.join(rootDir, '.agents/challenger_m1_2/oracle_output.txt');
    fs.writeFileSync(outputPath, output, 'utf-8');

    expect(output).toContain('VERDICT: APPROVE');
    expect(output).not.toContain('[ERROR]');
    expect(output).toContain('Zero bounding box overlaps found');
    expect(output).toContain('No \'cache.addAll(\' found');
    expect(output).toContain('100% full-bleed opaque');
  });

  it('verifies texture atlas non-overlapping bounds in TypeScript oracle', () => {
    const atlasJsonPath = path.join(rootDir, 'public/assets/atlas.json');
    const atlas = JSON.parse(fs.readFileSync(atlasJsonPath, 'utf-8'));
    const frames = atlas.frames;
    const names = Object.keys(frames);

    expect(names.length).toBeGreaterThanOrEqual(29);

    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const n1 = names[i]!;
        const n2 = names[j]!;
        const r1 = frames[n1].frame;
        const r2 = frames[n2].frame;

        const overlapX = Math.max(r1.x, r2.x) < Math.min(r1.x + r1.w, r2.x + r2.w);
        const overlapY = Math.max(r1.y, r2.y) < Math.min(r1.y + r1.h, r2.y + r2.h);

        expect(
          overlapX && overlapY,
          `Overlap between frame "${n1}" and "${n2}"`
        ).toBe(false);
      }
    }
  });

  it('verifies fruit touch targets are strictly >= 48px', () => {
    const atlasJsonPath = path.join(rootDir, 'public/assets/atlas.json');
    const atlas = JSON.parse(fs.readFileSync(atlasJsonPath, 'utf-8'));
    const fruits = [
      'apple', 'orange', 'grape', 'banana', 'watermelon', 'blueberry',
      'strawberry', 'lemon', 'kiwi', 'peach', 'plum', 'cherry'
    ];

    for (const fruit of fruits) {
      expect(atlas.frames[fruit], `Missing fruit ${fruit}`).toBeDefined();
      const { w, h } = atlas.frames[fruit].frame;
      expect(w).toBeGreaterThanOrEqual(48);
      expect(h).toBeGreaterThanOrEqual(48);
      expect(w).toBe(80);
      expect(h).toBe(80);
    }
  });

  it('verifies service worker precache assets all exist in dist/', () => {
    const swPath = path.join(rootDir, 'dist/sw.js');
    expect(fs.existsSync(swPath), 'dist/sw.js missing').toBe(true);
    const sw = fs.readFileSync(swPath, 'utf-8');

    expect(sw.includes('cache.addAll(')).toBe(false);

    const assetMatches = sw.match(/['"](\.\/[^'"]+\.(?:css|js|png|svg|webp|jpg|ico|html|woff2|json))['"]/g) || [];
    for (const raw of assetMatches) {
      const clean = raw.replace(/['"]/g, '').replace(/^\.\//, '');
      const distTarget = path.join(rootDir, 'dist', clean);
      expect(fs.existsSync(distTarget), `Precached asset missing in dist/: ${clean}`).toBe(true);
    }
  });
});
