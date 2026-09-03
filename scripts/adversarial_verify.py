#!/usr/bin/env python3
"""
Adversarial Verification Oracle for Milestone 1 (Catch the Fruit).
Empirically tests:
1. Full-bleed maskable icon margin opacity (every pixel in outer 8% margin).
2. Texture atlas non-overlapping bounds, texture dimensions, 12 fruit names, >= 48px hitboxes.
3. Service worker precache validity against dist/ and prohibition of cache.addAll.
"""

import os
import sys
import json
import math
import re
from PIL import Image

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

ERRORS = []
WARNINGS = []
LOGS = []

def log(msg):
    LOGS.append(msg)
    print(msg)

def fail(msg):
    ERRORS.append(msg)
    print(f"  [ERROR] {msg}")

def warn(msg):
    WARNINGS.append(msg)
    print(f"  [WARN] {msg}")

def test_maskable_icons():
    log("\n--- TEST 1: MASKABLE ICON MARGIN OPACITY VIA PIL ---")
    targets = [
        ("public/icons/maskable-192x192.png", 192, 192),
        ("public/icons/maskable-512x512.png", 512, 512),
        ("dist/icons/maskable-192x192.png", 192, 192),
        ("dist/icons/maskable-512x512.png", 512, 512),
    ]

    for rel_path, exp_w, exp_h in targets:
        full_path = os.path.join(ROOT_DIR, rel_path)
        if not os.path.exists(full_path):
            fail(f"Icon missing on disk: {rel_path}")
            continue

        im = Image.open(full_path)
        w, h = im.size
        log(f"Inspecting {rel_path}: dimensions={w}x{h}, mode={im.mode}")

        if w != exp_w or h != exp_h:
            fail(f"{rel_path} size mismatch: expected {exp_w}x{exp_h}, got {w}x{h}")

        rgba = im.convert("RGBA")
        px = rgba.load()

        # Check outer 8% margin using both floor and ceil to be maximally adversarial
        margin_f = int(w * 0.08)
        margin_c = int(math.ceil(w * 0.08))
        margin = max(margin_f, margin_c, 1)

        total_margin_pixels = 0
        min_margin_alpha = 255
        non_opaque_margin_pixels = 0
        below_10_margin_pixels = 0

        total_pixels = w * h
        min_overall_alpha = 255

        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if a < min_overall_alpha:
                    min_overall_alpha = a

                is_margin = (x < margin or x >= w - margin or y < margin or y >= h - margin)
                if is_margin:
                    total_margin_pixels += 1
                    if a < min_margin_alpha:
                        min_margin_alpha = a
                    if a < 255:
                        non_opaque_margin_pixels += 1
                    if a < 10:
                        below_10_margin_pixels += 1

        log(f"  Margin depth: {margin}px ({margin/w*100:.2f}% of width)")
        log(f"  Margin pixels inspected: {total_margin_pixels} / {total_pixels} ({total_margin_pixels/total_pixels*100:.2f}%)")
        log(f"  Minimum margin alpha: {min_margin_alpha}")
        log(f"  Non-255 margin pixels: {non_opaque_margin_pixels}")
        log(f"  Margin pixels with alpha < 10: {below_10_margin_pixels}")
        log(f"  Overall minimum alpha: {min_overall_alpha}")

        if below_10_margin_pixels > 0:
            fail(f"{rel_path} has {below_10_margin_pixels} transparent/semi-transparent pixels in outer 8% margin (alpha < 10)!")
        elif non_opaque_margin_pixels > 0:
            warn(f"{rel_path} margin has {non_opaque_margin_pixels} pixels with alpha < 255 (min alpha: {min_margin_alpha})")
        else:
            log(f"  [PASS] {rel_path} outer 8% margin is 100% full-bleed opaque (alpha=255 for all {total_margin_pixels} pixels)")

def test_texture_atlas():
    log("\n--- TEST 2: TEXTURE ATLAS BOUNDING BOXES & TOUCH TARGETS ---")
    atlas_json_rel = "public/assets/atlas.json"
    atlas_png_rel = "public/assets/atlas.png"
    atlas_json_path = os.path.join(ROOT_DIR, atlas_json_rel)
    atlas_png_path = os.path.join(ROOT_DIR, atlas_png_rel)

    if not os.path.exists(atlas_json_path):
        fail(f"Atlas JSON missing: {atlas_json_rel}")
        return
    if not os.path.exists(atlas_png_path):
        fail(f"Atlas PNG missing: {atlas_png_rel}")
        return

    with open(atlas_json_path, "r", encoding="utf-8") as f:
        atlas = json.load(f)

    im = Image.open(atlas_png_path)
    img_w, img_h = im.size
    log(f"Actual atlas.png dimensions: {img_w}x{img_h}, mode={im.mode}")

    meta = atlas.get("meta", {})
    meta_size = meta.get("size", {})
    meta_w = meta_size.get("w")
    meta_h = meta_size.get("h")
    log(f"atlas.json meta.size: {meta_w}x{meta_h}")

    if meta_w != 1024 or meta_h not in [512, 1024]:
        fail(f"Atlas meta size expected 1024x512 or 1024x1024, got {meta_w}x{meta_h}")
    if img_w != 1024 or img_h not in [512, 1024]:
        fail(f"Atlas actual image expected 1024x512 or 1024x1024, got {img_w}x{img_h}")
    if (img_w, img_h) != (meta_w, meta_h):
        fail(f"Atlas image size {img_w}x{img_h} does not match meta.size {meta_w}x{meta_h}")

    frames = atlas.get("frames", {})
    frame_keys = list(frames.keys())
    log(f"Total frame entries in atlas.json: {len(frame_keys)}")

    if len(frame_keys) != 29:
        warn(f"Expected exactly 29 frames, got {len(frame_keys)}")

    # 1. Check all 12 fruit names and hitboxes >= 48px
    expected_fruits = [
        "apple", "orange", "grape", "banana", "watermelon", "blueberry",
        "strawberry", "lemon", "kiwi", "peach", "plum", "cherry"
    ]
    log(f"Checking {len(expected_fruits)} curriculum fruits...")
    for fruit in expected_fruits:
        if fruit not in frames:
            fail(f"Missing required fruit in atlas: '{fruit}'")
            continue
        fr = frames[fruit].get("frame", {})
        fw = fr.get("w", 0)
        fh = fr.get("h", 0)
        if fw < 48 or fh < 48:
            fail(f"Fruit '{fruit}' hitbox dimension < 48px: w={fw}, h={fh}")
        else:
            log(f"  Fruit '{fruit}': {fw}x{fh}px (>= 48px requirement satisfied)")

    # 2. Check bounding box containment inside 1024x512
    rects = []
    for name, data in frames.items():
        fr = data.get("frame", {})
        x = fr.get("x", 0)
        y = fr.get("y", 0)
        w = fr.get("w", 0)
        h = fr.get("h", 0)

        if x < 0 or y < 0 or x + w > img_w or y + h > img_h:
            fail(f"Frame '{name}' exceeds texture bounds: rect=({x},{y},{w},{h}), texture=({img_w},{img_h})")

        rects.append((name, x, y, w, h))

    # 3. Check for any overlapping bounding boxes between distinct frames
    log("Checking bounding box pairwise non-overlap across all frames...")
    overlap_count = 0
    min_gutter = float("inf")

    for i in range(len(rects)):
        for j in range(i + 1, len(rects)):
            n1, x1, y1, w1, h1 = rects[i]
            n2, x2, y2, w2, h2 = rects[j]

            # Overlap test:
            # Overlap in X if: max(x1, x2) < min(x1+w1, x2+w2)
            # Overlap in Y if: max(y1, y2) < min(y1+h1, y2+h2)
            overlap_x = max(x1, x2) < min(x1 + w1, x2 + w2)
            overlap_y = max(y1, y2) < min(y1 + h1, y2 + h2)

            if overlap_x and overlap_y:
                overlap_count += 1
                fail(f"OVERLAP DETECTED between frame '{n1}' ({x1},{y1},{w1},{h1}) and '{n2}' ({x2},{y2},{w2},{h2})!")
            else:
                # Calculate minimum distance between non-overlapping boxes
                dx = max(0, max(x1, x2) - min(x1 + w1, x2 + w2))
                dy = max(0, max(y1, y2) - min(y1 + h1, y2 + h2))
                dist = max(dx, dy)
                if dist < min_gutter:
                    min_gutter = dist

    if overlap_count == 0:
        log(f"  [PASS] Zero bounding box overlaps found across all {len(rects)} frames! Minimum gutter: {min_gutter}px")
    else:
        fail(f"Found {overlap_count} overlapping frame pairs in atlas!")

def test_service_worker():
    log("\n--- TEST 3: SERVICE WORKER & PRECACHE VERIFICATION ---")
    sw_rel = "public/sw.js"
    sw_path = os.path.join(ROOT_DIR, sw_rel)
    dist_dir = os.path.join(ROOT_DIR, "dist")

    if not os.path.exists(sw_path):
        fail(f"sw.js missing at {sw_rel}")
        return

    with open(sw_path, "r", encoding="utf-8") as f:
        sw_content = f.read()

    # Check 1: Prohibition of cache.addAll(
    log("Checking for forbidden cache.addAll( calls in sw.js...")
    if re.search(r"cache\.addAll\(", sw_content):
        fail("sw.js contains forbidden 'cache.addAll(' call! Must use individual .add().catch().")
    else:
        log("  [PASS] No 'cache.addAll(' found in sw.js.")

    # Check 2: Precache assets exist in dist/
    log("Verifying precached assets exist in dist/ directory...")
    if not os.path.exists(dist_dir):
        fail("dist/ directory does not exist! Run npm run build first.")
        return

    # Extract all asset paths from sw.js
    asset_matches = re.findall(r"['\"](\.\/[^'\"]+\.(?:css|js|png|svg|webp|jpg|ico|html|woff2|json))['\"]", sw_content)
    # Also look for paths without leading ./
    asset_matches += re.findall(r"['\"]([a-zA-Z0-9_\-\/]+\.(?:css|js|png|svg|webp|jpg|ico|html|woff2|json))['\"]", sw_content)

    asset_set = set(asset_matches)
    log(f"Found {len(asset_set)} asset references in sw.js: {sorted(list(asset_set))}")

    missing_in_dist = 0
    for asset in asset_set:
        clean_rel = asset.lstrip("./")
        dist_asset_path = os.path.join(dist_dir, clean_rel)
        if not os.path.exists(dist_asset_path):
            missing_in_dist += 1
            fail(f"Precached asset '{asset}' missing in dist/ (looked at {dist_asset_path})")
        else:
            size = os.path.getsize(dist_asset_path)
            log(f"  Asset '{asset}' verified in dist/ ({size} bytes)")

    if missing_in_dist == 0:
        log(f"  [PASS] All {len(asset_set)} precache asset paths physically exist in dist/!")

def test_manifest_and_dist_integrity():
    log("\n--- TEST 4: MANIFEST & DIST ARTIFACT INTEGRITY ---")
    manifest_path = os.path.join(ROOT_DIR, "dist/manifest.json")
    if not os.path.exists(manifest_path):
        fail("dist/manifest.json missing!")
        return

    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    # Check icons in manifest
    icons = manifest.get("icons", [])
    for ic in icons:
        src = ic.get("src", "").lstrip("./")
        target = os.path.join(ROOT_DIR, "dist", src)
        if not os.path.exists(target):
            fail(f"Manifest icon '{src}' does not exist in dist/!")
        else:
            log(f"  Manifest icon '{src}' exists ({os.path.getsize(target)} bytes)")

    # Check screenshots
    screenshots = manifest.get("screenshots", [])
    for sc in screenshots:
        src = sc.get("src", "").lstrip("./")
        target = os.path.join(ROOT_DIR, "dist", src)
        if not os.path.exists(target):
            fail(f"Manifest screenshot '{src}' does not exist in dist/!")
        else:
            log(f"  Manifest screenshot '{src}' exists ({os.path.getsize(target)} bytes)")

def main():
    log("=================================================================")
    log("  CHALLENGER M1-2 EMPIRICAL ADVERSARIAL VERIFICATION HARNESS")
    log("=================================================================")

    test_maskable_icons()
    test_texture_atlas()
    test_service_worker()
    test_manifest_and_dist_integrity()

    log("\n=================================================================")
    log("  VERIFICATION SUMMARY")
    log("=================================================================")
    log(f"Total Errors: {len(ERRORS)}")
    log(f"Total Warnings: {len(WARNINGS)}")

    if ERRORS:
        log("\nFAILURES ENCOUNTERED:")
        for e in ERRORS:
            log(f"  * {e}")
        log("\nVERDICT: CHALLENGE_FAILED")
        sys.exit(1)
    else:
        log("\nVERDICT: APPROVE")
        sys.exit(0)

if __name__ == "__main__":
    main()
