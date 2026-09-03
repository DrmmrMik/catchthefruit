import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('PWA Compliance & App Shell Verification', () => {
  const rootDir = process.cwd();
  const manifestPath = path.join(rootDir, 'public/manifest.json');
  const swPath = path.join(rootDir, 'public/sw.js');
  const indexPath = path.join(rootDir, 'index.html');
  const fontPath = path.join(rootDir, 'public/fonts/Lexend-Variable.woff2');

  it('manifest.json contains required WebAPK metadata', () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    expect(manifest.name).toBe('Catch the Fruit - Phonics & Word Arcade');
    expect(manifest.short_name).toBe('CatchFruit');
    expect(manifest.start_url).toBe('./index.html');
    expect(manifest.scope).toBe('./');
    expect(manifest.display).toBe('standalone');
    expect(manifest.display_override).toEqual(['standalone']);
    expect(manifest.orientation).toBe('portrait');
    expect(manifest.theme_color).toBe('#0284c7');
    expect(manifest.background_color).toBe('#38bdf8');
    expect(manifest.prefer_related_applications).toBe(false);
  });

  it('manifest.json has separate any and maskable icon entries for 192 and 512', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const icons = manifest.icons;
    expect(Array.isArray(icons)).toBe(true);

    const hasAny192 = icons.some((i: any) => i.sizes.includes('192') && i.purpose === 'any');
    const hasAny512 = icons.some((i: any) => i.sizes.includes('512') && i.purpose === 'any');
    const hasMask192 = icons.some((i: any) => i.sizes.includes('192') && i.purpose === 'maskable');
    const hasMask512 = icons.some((i: any) => i.sizes.includes('512') && i.purpose === 'maskable');

    expect(hasAny192, 'Missing 192 any icon').toBe(true);
    expect(hasAny512, 'Missing 512 any icon').toBe(true);
    expect(hasMask192, 'Missing 192 maskable icon').toBe(true);
    expect(hasMask512, 'Missing 512 maskable icon').toBe(true);
  });

  it('manifest icons and screenshots physically exist on disk', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    for (const icon of manifest.icons) {
      const p = path.join(rootDir, 'public', icon.src);
      expect(fs.existsSync(p), `Icon does not exist: ${p}`).toBe(true);
    }
    for (const shot of manifest.screenshots) {
      const p = path.join(rootDir, 'public', shot.src);
      expect(fs.existsSync(p), `Screenshot does not exist: ${p}`).toBe(true);
    }
  });

  it('manifest excludes risky experimental desktop keys', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const riskyKeys = [
      'protocol_handlers',
      'handle_links',
      'edge_side_panel',
      'launch_handler',
      'window-controls-overlay'
    ];
    for (const k of riskyKeys) {
      expect(manifest[k], `Manifest contains forbidden key: ${k}`).toBeUndefined();
    }
  });

  it('sw.js strictly avoids cache.addAll and precaches verified files', () => {
    expect(fs.existsSync(swPath)).toBe(true);
    const sw = fs.readFileSync(swPath, 'utf-8');

    // Strictly forbidden token: cache.addAll(
    expect(sw.includes('cache.addAll(')).toBe(false);

    // Verify all quoted static asset references exist in public/ or root
    const regex = /['"](\.\/[^'"]+\.(?:css|js|png|svg|webp|jpg|ico|html))['"]/g;
    let match;
    while ((match = regex.exec(sw)) !== null) {
      const relPath = match[1]!;
      const cleanPath = relPath.replace(/^\.\//, '');
      const fullPath = cleanPath === 'index.html'
        ? path.join(rootDir, 'index.html')
        : path.join(rootDir, 'public', cleanPath);
      expect(fs.existsSync(fullPath), `SW references missing asset: ${relPath}`).toBe(true);
    }
  });

  it('index.html conforms to PWA, responsive viewport, and zero mixed content standards', () => {
    expect(fs.existsSync(indexPath)).toBe(true);
    const html = fs.readFileSync(indexPath, 'utf-8');

    // Zero http://
    expect(html.includes('http://')).toBe(false);

    // Mandatory elements
    expect(html.includes('rel="manifest"')).toBe(true);
    expect(html.includes('name="viewport"')).toBe(true);
    expect(html.includes('viewport-fit=cover')).toBe(true);
    expect(html.includes('name="theme-color"')).toBe(true);
    expect(html.includes('serviceWorker.register')).toBe(true);
    expect(html.includes('id="game-container"')).toBe(true);
    expect(html.includes('id="sr-announcements"')).toBe(true);
  });

  it('Lexend font asset is bundled locally in public/fonts', () => {
    expect(fs.existsSync(fontPath)).toBe(true);
    const stats = fs.statSync(fontPath);
    expect(stats.size).toBeGreaterThan(10000);
  });
});
