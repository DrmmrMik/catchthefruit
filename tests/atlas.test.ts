import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Texture Atlas Asset Verification', () => {
  const rootDir = process.cwd();
  const atlasJsonPath = path.join(rootDir, 'public/assets/atlas.json');
  const atlasPngPath = path.join(rootDir, 'public/assets/atlas.png');

  it('atlas.json exists and is valid JSON', () => {
    expect(fs.existsSync(atlasJsonPath)).toBe(true);
    const content = fs.readFileSync(atlasJsonPath, 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed).toBeDefined();
    expect(parsed.meta).toBeDefined();
    expect(parsed.meta.image).toBe('atlas.png');
    expect(parsed.meta.size.w).toBe(1024);
    expect(parsed.meta.size.h).toBeGreaterThanOrEqual(512);
  });

  it('contains at least 29 frames including Princess Penelope and curriculum sprites', () => {
    const content = JSON.parse(fs.readFileSync(atlasJsonPath, 'utf-8'));
    const frameKeys = Object.keys(content.frames);
    expect(frameKeys.length).toBeGreaterThanOrEqual(29);
    expect(content.frames['princess-idle-1']).toBeDefined();
    expect(content.frames['princess-catch']).toBeDefined();
  });

  it('contains all 12 curriculum fruit types with >= 48px dimensions', () => {
    const content = JSON.parse(fs.readFileSync(atlasJsonPath, 'utf-8'));
    const expectedFruits = [
      'apple', 'orange', 'grape', 'banana', 'watermelon', 'blueberry',
      'strawberry', 'lemon', 'kiwi', 'peach', 'plum', 'cherry'
    ];

    for (const fruit of expectedFruits) {
      const frame = content.frames[fruit];
      expect(frame, `Missing fruit frame: ${fruit}`).toBeDefined();
      expect(frame.frame.w).toBeGreaterThanOrEqual(48);
      expect(frame.frame.h).toBeGreaterThanOrEqual(48);
      expect(frame.frame.w).toBe(80);
      expect(frame.frame.h).toBe(80);
    }
  });

  it('contains basket catcher and card panel', () => {
    const content = JSON.parse(fs.readFileSync(atlasJsonPath, 'utf-8'));
    expect(content.frames['basket']).toBeDefined();
    expect(content.frames['basket'].frame).toEqual({ x: expect.any(Number), y: expect.any(Number), w: 128, h: 64 });
    expect(content.frames['card-panel']).toBeDefined();
  });

  it('contains all 5 orchard tree growth stages', () => {
    const content = JSON.parse(fs.readFileSync(atlasJsonPath, 'utf-8'));
    for (let stage = 1; stage <= 5; stage++) {
      const key = `tree-stage-${stage}`;
      expect(content.frames[key], `Missing tree stage: ${key}`).toBeDefined();
      expect(content.frames[key].frame.w).toBe(128);
      expect(content.frames[key].frame.h).toBe(128);
    }
  });

  it('contains UI control buttons, stars, markers, and sparkle FX', () => {
    const content = JSON.parse(fs.readFileSync(atlasJsonPath, 'utf-8'));
    const requiredElements = [
      'btn-pause', 'btn-sound', 'btn-sound-off', 'btn-replay', 'btn-home',
      'star-full', 'star-empty', 'check-mark', 'x-mark', 'sparkle'
    ];

    for (const elem of requiredElements) {
      expect(content.frames[elem], `Missing UI/FX frame: ${elem}`).toBeDefined();
    }
  });

  it('atlas.png exists on disk with valid PNG header', () => {
    expect(fs.existsSync(atlasPngPath)).toBe(true);
    const buf = fs.readFileSync(atlasPngPath);
    // Check PNG signature: 89 50 4E 47 0D 0A 1A 0A
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50);
    expect(buf[2]).toBe(0x4E);
    expect(buf[3]).toBe(0x47);
    expect(buf.length).toBeGreaterThan(50000);
  });
});
