#!/usr/bin/env python3
"""
scripts/generate_atlas.py - Catch the Fruit Procedural Sprite Generator & Atlas Packer
Author: Explorer M1-3 / Worker M1-1

Requires: Pillow >= 10.0.0
Generates:
  - public/assets/atlas.png (1024x512 RGBA)
  - public/assets/atlas.json (Phaser 3/4 JSON Hash Format with 29 sprites)
"""

import os
import json
import math
from PIL import Image, ImageDraw

SCALE = 4

def make_canvas(w, h):
    """Creates a 4x supersampled RGBA transparent canvas."""
    return Image.new("RGBA", (w * SCALE, h * SCALE), (0, 0, 0, 0))

def finalize(img, w, h):
    """Downsamples supersampled image to target size using high-quality Lanczos."""
    return img.resize((w, h), Image.Resampling.LANCZOS)

# ==============================================================================
# 12 FRUIT SPRITE GENERATORS (80x80 px)
# ==============================================================================

def draw_apple(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2 + (4 * s)

    # Stem
    d.line([(cx - 2*s, cy - 24*s), (cx - 8*s, cy - 36*s)], fill=(93, 64, 55, 255), width=5*s)
    # Leaf
    leaf_pts = [(cx - 3*s, cy - 28*s), (cx + 18*s, cy - 36*s), (cx + 12*s, cy - 22*s)]
    d.polygon(leaf_pts, fill=(67, 160, 71, 255))
    d.line([(cx - 3*s, cy - 28*s), (cx + 18*s, cy - 36*s)], fill=(46, 125, 50, 255), width=2*s)

    # Apple Body (Dual lobes)
    r = 25 * s
    d.ellipse([cx - r - 2*s, cy - r, cx + 5*s, cy + r], fill=(229, 57, 53, 255))
    d.ellipse([cx - 5*s, cy - r, cx + r + 2*s, cy + r], fill=(211, 47, 47, 255))
    d.ellipse([cx - 20*s, cy - 10*s, cx + 20*s, cy + 24*s], fill=(229, 57, 53, 255))
    d.ellipse([cx - 7*s, cy - r - 2*s, cx + 7*s, cy - r + 6*s], fill=(183, 28, 28, 255))
    d.ellipse([cx - 20*s, cy - 18*s, cx - 10*s, cy - 6*s], fill=(255, 205, 210, 200))
    return finalize(img, w, h)

def draw_orange(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2 + (2 * s)
    r = 28 * s

    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 152, 0, 255))
    d.arc([cx - r, cy - r, cx + r, cy + r], start=0, end=140, fill=(245, 124, 0, 255), width=4*s)

    for angle in [30, 75, 120, 210, 250, 300]:
        rad = math.radians(angle)
        px = cx + (r * 0.65) * math.cos(rad)
        py = cy + (r * 0.65) * math.sin(rad)
        d.ellipse([px - 1.5*s, py - 1.5*s, px + 1.5*s, py + 1.5*s], fill=(255, 183, 77, 255))

    calyx_pts = [
        (cx, cy - r + 1*s),
        (cx + 6*s, cy - r - 6*s),
        (cx + 2*s, cy - r + 3*s),
        (cx + 8*s, cy - r + 4*s),
        (cx + 1*s, cy - r + 6*s),
        (cx - 7*s, cy - r + 5*s),
        (cx - 3*s, cy - r + 2*s),
        (cx - 6*s, cy - r - 6*s),
    ]
    d.polygon(calyx_pts, fill=(56, 142, 60, 255))
    d.ellipse([cx - 2*s, cy - r + 1*s, cx + 2*s, cy - r + 5*s], fill=(93, 64, 55, 255))
    d.ellipse([cx - 20*s, cy - 20*s, cx - 10*s, cy - 8*s], fill=(255, 224, 130, 200))
    return finalize(img, w, h)

def draw_grape(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2 + (2 * s)

    d.line([(cx, cy - 26*s), (cx, cy - 36*s)], fill=(85, 139, 47, 255), width=4*s)
    d.arc([cx - 10*s, cy - 38*s, cx + 6*s, cy - 26*s], start=180, end=360, fill=(85, 139, 47, 255), width=3*s)
    d.polygon([(cx, cy - 30*s), (cx - 16*s, cy - 36*s), (cx - 12*s, cy - 24*s)], fill=(104, 159, 56, 255))

    grape_positions = [
        (-18, -14), (-6, -16), (6, -16), (18, -14),
        (-12, -2), (0, -3), (12, -2),
        (-6, 11), (6, 11),
        (0, 23)
    ]
    gr = 9 * s
    for gx, gy in grape_positions:
        x, y = cx + gx * s, cy + gy * s
        d.ellipse([x - gr, y - gr, x + gr, y + gr], fill=(123, 31, 162, 255))
        d.ellipse([x - gr + 1*s, y - gr + 1*s, x + gr - 1*s, y + gr - 1*s], outline=(74, 20, 140, 255), width=2*s)
        d.ellipse([x - 5*s, y - 6*s, x - 1*s, y - 2*s], fill=(225, 190, 231, 220))
    return finalize(img, w, h)

def draw_banana(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2

    outer_pts = [
        (cx - 24*s, cy - 30*s),
        (cx - 18*s, cy - 20*s),
        (cx + 8*s,  cy - 12*s),
        (cx + 26*s, cy + 4*s),
        (cx + 28*s, cy + 22*s),
        (cx + 18*s, cy + 32*s),
        (cx + 14*s, cy + 30*s),
        (cx + 18*s, cy + 18*s),
        (cx + 10*s, cy + 2*s),
        (cx - 6*s,  cy - 10*s),
        (cx - 20*s, cy - 22*s),
        (cx - 26*s, cy - 28*s)
    ]
    d.polygon(outer_pts, fill=(255, 235, 59, 255))
    d.line(outer_pts + [outer_pts[0]], fill=(251, 192, 45, 255), width=3*s)
    ridge_pts = [
        (cx - 22*s, cy - 26*s),
        (cx - 8*s, cy - 14*s),
        (cx + 14*s, cy + 2*s),
        (cx + 22*s, cy + 16*s),
        (cx + 16*s, cy + 31*s)
    ]
    d.line(ridge_pts, fill=(245, 127, 23, 255), width=2*s)
    d.ellipse([cx - 27*s, cy - 32*s, cx - 21*s, cy - 26*s], fill=(78, 52, 46, 255))
    d.ellipse([cx + 14*s, cy + 29*s, cx + 20*s, cy + 34*s], fill=(78, 52, 46, 255))
    return finalize(img, w, h)

def draw_watermelon(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2

    p_top = (cx, cy - 32*s)
    d.pieslice([cx - 38*s, cy - 20*s, cx + 38*s, cy + 34*s], start=25, end=155, fill=(27, 94, 32, 255))
    d.pieslice([cx - 34*s, cy - 20*s, cx + 34*s, cy + 30*s], start=25, end=155, fill=(76, 175, 80, 255))
    d.pieslice([cx - 31*s, cy - 20*s, cx + 31*s, cy + 27*s], start=25, end=155, fill=(232, 245, 233, 255))
    d.polygon([p_top, (cx - 26*s, cy + 22*s), (cx + 26*s, cy + 22*s)], fill=(233, 30, 99, 255))

    seeds = [(-10, 10), (10, 10), (0, 3), (-8, -6), (8, -6)]
    for sx, sy in seeds:
        px, py = cx + sx * s, cy + sy * s
        d.ellipse([px - 2.5*s, py - 4*s, px + 2.5*s, py + 4*s], fill=(33, 33, 33, 255))
        d.ellipse([px - 1*s, py - 3*s, px + 1*s, py - 1*s], fill=(255, 255, 255, 220))
    return finalize(img, w, h)

def draw_blueberry(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2 + (2 * s)
    r = 27 * s

    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(30, 136, 229, 255))
    d.arc([cx - r, cy - r, cx + r, cy + r], start=0, end=140, fill=(26, 35, 126, 255), width=5*s)

    crown_y = cy - r + 6*s
    d.ellipse([cx - 9*s, crown_y - 6*s, cx + 9*s, crown_y + 6*s], fill=(13, 71, 161, 255))
    crown_pts = [
        (cx, crown_y - 8*s),
        (cx + 7*s, crown_y - 4*s),
        (cx + 9*s, crown_y + 4*s),
        (cx, crown_y + 6*s),
        (cx - 9*s, crown_y + 4*s),
        (cx - 7*s, crown_y - 4*s)
    ]
    d.polygon(crown_pts, fill=(21, 101, 192, 255))
    d.ellipse([cx - 4*s, crown_y - 3*s, cx + 4*s, crown_y + 3*s], fill=(13, 71, 161, 255))
    d.ellipse([cx - 18*s, cy - 16*s, cx - 8*s, cy - 6*s], fill=(187, 222, 251, 190))
    return finalize(img, w, h)

def draw_strawberry(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2 + (2 * s)

    body_pts = [
        (cx, cy + 28*s),
        (cx - 18*s, cy + 18*s),
        (cx - 26*s, cy - 2*s),
        (cx - 22*s, cy - 20*s),
        (cx - 10*s, cy - 24*s),
        (cx, cy - 20*s),
        (cx + 10*s, cy - 24*s),
        (cx + 22*s, cy - 20*s),
        (cx + 26*s, cy - 2*s),
        (cx + 18*s, cy + 18*s)
    ]
    d.polygon(body_pts, fill=(229, 57, 53, 255))
    d.line(body_pts + [body_pts[0]], fill=(198, 40, 40, 255), width=3*s)

    seed_locs = [
        (-12, -14), (0, -14), (12, -14),
        (-16, -4), (-5, -4), (6, -4), (17, -4),
        (-12, 6), (0, 6), (12, 6),
        (-6, 16), (6, 16),
        (0, 23)
    ]
    for sx, sy in seed_locs:
        px, py = cx + sx * s, cy + sy * s
        d.ellipse([px - 1.5*s, py - 2.5*s, px + 1.5*s, py + 2.5*s], fill=(255, 245, 157, 255))

    leaf_top = [
        (cx, cy - 32*s), (cx - 4*s, cy - 24*s),
        (cx - 22*s, cy - 26*s), (cx - 10*s, cy - 18*s),
        (cx - 16*s, cy - 12*s), (cx - 4*s, cy - 16*s),
        (cx + 4*s, cy - 16*s), (cx + 16*s, cy - 12*s),
        (cx + 10*s, cy - 18*s), (cx + 22*s, cy - 26*s),
        (cx + 4*s, cy - 24*s)
    ]
    d.polygon(leaf_top, fill=(46, 125, 50, 255))
    return finalize(img, w, h)

def draw_lemon(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2

    lemon_pts = [
        (cx - 30*s, cy),
        (cx - 22*s, cy - 18*s),
        (cx, cy - 25*s),
        (cx + 22*s, cy - 18*s),
        (cx + 30*s, cy),
        (cx + 22*s, cy + 18*s),
        (cx, cy + 25*s),
        (cx - 22*s, cy + 18*s)
    ]
    d.polygon(lemon_pts, fill=(255, 238, 88, 255))
    d.line(lemon_pts + [lemon_pts[0]], fill=(251, 192, 45, 255), width=3*s)
    d.polygon([(cx - 30*s, cy), (cx - 38*s, cy - 12*s), (cx - 28*s, cy - 10*s)], fill=(76, 175, 80, 255))
    d.ellipse([cx - 15*s, cy - 18*s, cx + 15*s, cy - 6*s], fill=(255, 253, 231, 200))
    return finalize(img, w, h)

def draw_kiwi(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2
    r = 28 * s

    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(109, 76, 65, 255))
    d.ellipse([cx - r + 3*s, cy - r + 3*s, cx + r - 3*s, cy + r - 3*s], fill=(93, 64, 55, 255))

    rf = r - 5*s
    d.ellipse([cx - rf, cy - rf, cx + rf, cy + rf], fill=(139, 195, 74, 255))

    for angle in range(0, 360, 24):
        rad = math.radians(angle)
        x1 = cx + (rf * 0.35) * math.cos(rad)
        y1 = cy + (rf * 0.35) * math.sin(rad)
        x2 = cx + (rf * 0.85) * math.cos(rad)
        y2 = cy + (rf * 0.85) * math.sin(rad)
        d.line([(x1, y1), (x2, y2)], fill=(197, 225, 165, 200), width=2*s)

    for angle in range(0, 360, 24):
        rad = math.radians(angle + 12)
        sx = cx + (rf * 0.55) * math.cos(rad)
        sy = cy + (rf * 0.55) * math.sin(rad)
        d.ellipse([sx - 1.5*s, sy - 2.5*s, sx + 1.5*s, sy + 2.5*s], fill=(33, 33, 33, 255))

    rc = 7 * s
    d.ellipse([cx - rc, cy - rc, cx + rc, cy + rc], fill=(241, 248, 233, 255))
    return finalize(img, w, h)

def draw_peach(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2 + (4 * s)

    d.line([(cx, cy - 24*s), (cx + 4*s, cy - 36*s)], fill=(93, 64, 55, 255), width=4*s)
    d.polygon([(cx + 4*s, cy - 30*s), (cx + 24*s, cy - 32*s), (cx + 12*s, cy - 22*s)], fill=(56, 142, 60, 255))

    r = 25 * s
    d.ellipse([cx - r - 2*s, cy - r, cx + 4*s, cy + r], fill=(255, 112, 67, 255))
    d.ellipse([cx - 4*s, cy - r, cx + r + 2*s, cy + r], fill=(255, 213, 79, 255))
    d.ellipse([cx - 18*s, cy - 10*s, cx + 18*s, cy + 24*s], fill=(255, 167, 38, 255))
    d.line([(cx, cy - r + 3*s), (cx, cy + 18*s)], fill=(230, 81, 0, 200), width=2*s)
    d.ellipse([cx - 18*s, cy - 16*s, cx - 8*s, cy - 6*s], fill=(255, 224, 178, 190))
    return finalize(img, w, h)

def draw_plum(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2 + (4 * s)
    r = 26 * s

    d.line([(cx, cy - 24*s), (cx - 3*s, cy - 34*s)], fill=(78, 52, 46, 255), width=4*s)
    d.polygon([(cx, cy - 28*s), (cx + 14*s, cy - 32*s), (cx + 8*s, cy - 22*s)], fill=(67, 160, 71, 255))

    d.ellipse([cx - r, cy - r - 2*s, cx + r, cy + r + 2*s], fill=(74, 20, 140, 255))
    d.ellipse([cx - 18*s, cy - 18*s, cx - 6*s, cy - 6*s], fill=(206, 147, 216, 190))
    d.arc([cx - r, cy - r, cx + 2*s, cy + r], start=70, end=110, fill=(49, 27, 146, 255), width=3*s)
    return finalize(img, w, h)

def draw_cherry(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2 + (8 * s)

    top_stem = (cx, cy - 36*s)
    c1 = (cx - 16*s, cy + 2*s)
    c2 = (cx + 16*s, cy + 2*s)
    d.line([top_stem, (cx - 12*s, cy - 12*s), c1], fill=(56, 142, 60, 255), width=4*s)
    d.line([top_stem, (cx + 12*s, cy - 12*s), c2], fill=(56, 142, 60, 255), width=4*s)
    d.polygon([top_stem, (cx + 16*s, cy - 40*s), (cx + 12*s, cy - 26*s)], fill=(76, 175, 80, 255))

    r = 15 * s
    for x, y in [c1, c2]:
        d.ellipse([x - r, y - r, x + r, y + r], fill=(194, 24, 91, 255))
        d.arc([x - r, y - r, x + r, y + r], start=0, end=140, fill=(183, 28, 28, 255), width=3*s)
        d.ellipse([x - 8*s, y - 9*s, x - 2*s, y - 3*s], fill=(255, 255, 255, 230))
    return finalize(img, w, h)

# ==============================================================================
# BASKET CATCHER (128x64 px)
# ==============================================================================

def draw_basket(w=128, h=64):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2

    bowl_pts = [
        (cx - 52*s, cy - 16*s),
        (cx + 52*s, cy - 16*s),
        (cx + 38*s, cy + 26*s),
        (cx - 38*s, cy + 26*s)
    ]
    d.polygon(bowl_pts, fill=(141, 110, 99, 255))

    for offset in range(-45, 46, 12):
        d.line([(cx + offset*s - 12*s, cy - 16*s), (cx + offset*s + 8*s, cy + 26*s)], fill=(188, 170, 164, 255), width=3*s)
        d.line([(cx + offset*s + 12*s, cy - 16*s), (cx + offset*s - 8*s, cy + 26*s)], fill=(109, 76, 65, 255), width=3*s)

    d.rounded_rectangle([cx - 56*s, cy - 22*s, cx + 56*s, cy - 12*s], radius=5*s, fill=(109, 76, 65, 255))
    d.rounded_rectangle([cx - 54*s, cy - 20*s, cx + 54*s, cy - 14*s], radius=3*s, fill=(141, 110, 99, 255))
    d.ellipse([cx - 48*s, cy - 22*s, cx + 48*s, cy - 14*s], fill=(62, 39, 35, 255))

    d.arc([cx - 62*s, cy - 16*s, cx - 48*s, cy + 4*s], start=90, end=270, fill=(109, 76, 65, 255), width=5*s)
    d.arc([cx + 48*s, cy - 16*s, cx + 62*s, cy + 4*s], start=270, end=90, fill=(109, 76, 65, 255), width=5*s)

    return finalize(img, w, h)

# ==============================================================================
# UI BUTTONS & CONTROLS (64x64 px)
# ==============================================================================

def draw_btn_circle(w, h, bg_color, shadow_color):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2
    r = 27 * s

    d.ellipse([cx - r, cy - r + 3*s, cx + r, cy + r + 3*s], fill=shadow_color)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=bg_color)
    d.arc([cx - r + 2*s, cy - r + 2*s, cx + r - 2*s, cy + r - 2*s], start=180, end=360, fill=(255, 255, 255, 120), width=2*s)
    return img, d, s, cx, cy

def draw_btn_pause(w=64, h=64):
    img, d, s, cx, cy = draw_btn_circle(w, h, (2, 136, 209, 255), (1, 87, 155, 255))
    bw, bh = 5*s, 18*s
    d.rounded_rectangle([cx - 8*s - bw/2, cy - bh/2, cx - 8*s + bw/2, cy + bh/2], radius=2*s, fill=(255, 255, 255, 255))
    d.rounded_rectangle([cx + 8*s - bw/2, cy - bh/2, cx + 8*s + bw/2, cy + bh/2], radius=2*s, fill=(255, 255, 255, 255))
    return finalize(img, w, h)

def draw_btn_sound(w=64, h=64):
    img, d, s, cx, cy = draw_btn_circle(w, h, (0, 137, 123, 255), (0, 77, 64, 255))
    d.polygon([(cx - 12*s, cy - 6*s), (cx - 4*s, cy - 6*s), (cx + 5*s, cy - 14*s),
               (cx + 5*s, cy + 14*s), (cx - 4*s, cy + 6*s), (cx - 12*s, cy + 6*s)], fill=(255, 255, 255, 255))
    d.arc([cx + 1*s, cy - 10*s, cx + 13*s, cy + 10*s], start=300, end=60, fill=(255, 255, 255, 255), width=3*s)
    d.arc([cx + 4*s, cy - 16*s, cx + 20*s, cy + 16*s], start=300, end=60, fill=(255, 255, 255, 255), width=3*s)
    return finalize(img, w, h)

def draw_btn_sound_off(w=64, h=64):
    img, d, s, cx, cy = draw_btn_circle(w, h, (84, 110, 122, 255), (55, 71, 79, 255))
    d.polygon([(cx - 14*s, cy - 6*s), (cx - 6*s, cy - 6*s), (cx + 3*s, cy - 14*s),
               (cx + 3*s, cy + 14*s), (cx - 6*s, cy + 6*s), (cx - 14*s, cy + 6*s)], fill=(255, 255, 255, 255))
    d.line([(cx + 6*s, cy - 10*s), (cx + 18*s, cy + 10*s)], fill=(229, 57, 53, 255), width=4*s)
    d.line([(cx + 18*s, cy - 10*s), (cx + 6*s, cy + 10*s)], fill=(229, 57, 53, 255), width=4*s)
    return finalize(img, w, h)

def draw_btn_replay(w=64, h=64):
    img, d, s, cx, cy = draw_btn_circle(w, h, (251, 140, 0, 255), (230, 81, 0, 255))
    d.arc([cx - 14*s, cy - 14*s, cx + 14*s, cy + 14*s], start=60, end=330, fill=(255, 255, 255, 255), width=4*s)
    d.polygon([(cx - 14*s, cy - 4*s), (cx - 6*s, cy - 16*s), (cx - 18*s, cy - 14*s)], fill=(255, 255, 255, 255))
    return finalize(img, w, h)

def draw_btn_home(w=64, h=64):
    img, d, s, cx, cy = draw_btn_circle(w, h, (142, 36, 170, 255), (74, 20, 140, 255))
    d.polygon([(cx, cy - 16*s), (cx - 16*s, cy - 2*s), (cx + 16*s, cy - 2*s)], fill=(255, 255, 255, 255))
    d.rectangle([cx - 12*s, cy - 2*s, cx + 12*s, cy + 14*s], fill=(255, 255, 255, 255))
    d.rounded_rectangle([cx - 4*s, cy + 4*s, cx + 4*s, cy + 14*s], radius=2*s, fill=(142, 36, 170, 255))
    return finalize(img, w, h)

# ==============================================================================
# STAR RATING BADGES (48x48 px)
# ==============================================================================

def get_star_points(cx, cy, r_out, r_in):
    pts = []
    for i in range(10):
        r = r_out if i % 2 == 0 else r_in
        angle = -math.pi / 2 + (i * math.pi / 5)
        pts.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
    return pts

def draw_star_full(w=48, h=48):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2
    pts = get_star_points(cx, cy, 21*s, 9*s)

    d.polygon(pts, fill=(255, 215, 0, 255))
    d.line(pts + [pts[0]], fill=(255, 160, 0, 255), width=3*s)
    d.polygon([(cx, cy - 21*s), (cx, cy), (cx - 12*s, cy - 6*s)], fill=(255, 249, 196, 220))
    return finalize(img, w, h)

def draw_star_empty(w=48, h=48):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2
    pts = get_star_points(cx, cy, 21*s, 9*s)

    d.polygon(pts, fill=(236, 239, 241, 100))
    d.line(pts + [pts[0]], fill=(120, 144, 156, 255), width=3*s)
    return finalize(img, w, h)

# ==============================================================================
# ORCHARD TREE GROWTH STAGES (128x128 px)
# ==============================================================================

def draw_tree_stage(stage, w=128, h=128):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2

    # Soil mound
    d.ellipse([cx - 45*s, cy + 42*s, cx + 45*s, cy + 58*s], fill=(121, 85, 72, 255))
    d.ellipse([cx - 38*s, cy + 44*s, cx + 38*s, cy + 54*s], fill=(141, 110, 99, 255))

    if stage == 1:
        d.line([(cx, cy + 46*s), (cx, cy + 18*s)], fill=(109, 76, 65, 255), width=6*s)
        d.polygon([(cx, cy + 24*s), (cx - 18*s, cy + 12*s), (cx - 6*s, cy + 24*s)], fill=(102, 187, 106, 255))
        d.polygon([(cx, cy + 20*s), (cx + 18*s, cy + 8*s), (cx + 6*s, cy + 20*s)], fill=(129, 199, 132, 255))
        d.ellipse([cx - 4*s, cy + 10*s, cx + 4*s, cy + 18*s], fill=(229, 57, 53, 255))

    elif stage == 2:
        d.line([(cx, cy + 46*s), (cx, cy + 10*s)], fill=(109, 76, 65, 255), width=10*s)
        d.ellipse([cx - 32*s, cy - 28*s, cx + 32*s, cy + 18*s], fill=(67, 160, 71, 255))
        d.ellipse([cx - 24*s, cy - 22*s, cx + 24*s, cy + 10*s], fill=(76, 175, 80, 255))
        for ax, ay in [(-12, -4), (14, 2)]:
            d.ellipse([cx + ax*s - 5*s, cy + ay*s - 5*s, cx + ax*s + 5*s, cy + ay*s + 5*s], fill=(229, 57, 53, 255))

    elif stage == 3:
        d.polygon([(cx - 8*s, cy + 46*s), (cx + 8*s, cy + 46*s), (cx + 5*s, cy), (cx - 5*s, cy)], fill=(109, 76, 65, 255))
        d.line([(cx, cy + 6*s), (cx - 18*s, cy - 10*s)], fill=(109, 76, 65, 255), width=6*s)
        d.line([(cx, cy + 6*s), (cx + 18*s, cy - 10*s)], fill=(109, 76, 65, 255), width=6*s)
        d.ellipse([cx - 42*s, cy - 32*s, cx + 8*s, cy + 12*s], fill=(56, 142, 60, 255))
        d.ellipse([cx - 8*s, cy - 32*s, cx + 42*s, cy + 12*s], fill=(67, 160, 71, 255))
        d.ellipse([cx - 26*s, cy - 42*s, cx + 26*s, cy - 2*s], fill=(76, 175, 80, 255))
        for ax, ay in [(-20, -10), (0, -22), (20, -6)]:
            d.ellipse([cx + ax*s - 6*s, cy + ay*s - 6*s, cx + ax*s + 6*s, cy + ay*s + 6*s], fill=(229, 57, 53, 255))

    elif stage == 4:
        d.polygon([(cx - 12*s, cy + 46*s), (cx + 12*s, cy + 46*s), (cx + 7*s, cy - 8*s), (cx - 7*s, cy - 8*s)], fill=(93, 64, 55, 255))
        d.ellipse([cx - 48*s, cy - 36*s, cx + 12*s, cy + 14*s], fill=(46, 125, 50, 255))
        d.ellipse([cx - 12*s, cy - 36*s, cx + 48*s, cy + 14*s], fill=(56, 142, 60, 255))
        d.ellipse([cx - 36*s, cy - 48*s, cx + 36*s, cy - 2*s], fill=(67, 160, 71, 255))
        for ax, ay in [(-26, -12), (-8, -28), (12, -26), (26, -8)]:
            d.ellipse([cx + ax*s - 6*s, cy + ay*s - 6*s, cx + ax*s + 6*s, cy + ay*s + 6*s], fill=(229, 57, 53, 255))

    elif stage == 5:
        d.ellipse([cx - 54*s, cy - 54*s, cx + 54*s, cy + 20*s], fill=(255, 238, 88, 70))
        d.polygon([(cx - 14*s, cy + 46*s), (cx + 14*s, cy + 46*s), (cx + 8*s, cy - 12*s), (cx - 8*s, cy - 12*s)], fill=(93, 64, 55, 255))
        d.ellipse([cx - 52*s, cy - 42*s, cx + 16*s, cy + 14*s], fill=(46, 125, 50, 255))
        d.ellipse([cx - 16*s, cy - 42*s, cx + 52*s, cy + 14*s], fill=(56, 142, 60, 255))
        d.ellipse([cx - 38*s, cy - 52*s, cx + 38*s, cy - 4*s], fill=(67, 160, 71, 255))
        for fx, fy in [(-30, -32), (-12, -10), (14, -36), (32, -14)]:
            d.ellipse([cx + fx*s - 4*s, cy + fy*s - 4*s, cx + fx*s + 4*s, cy + fy*s + 4*s], fill=(255, 128, 171, 255))
        for gx, gy in [(-28, -8), (-16, -26), (4, -36), (20, -22), (30, -4)]:
            d.ellipse([cx + gx*s - 7*s, cy + gy*s - 7*s, cx + gx*s + 7*s, cy + gy*s + 7*s], fill=(255, 215, 0, 255))
            d.ellipse([cx + gx*s - 2*s, cy + gy*s - 5*s, cx + gx*s + 3*s, cy + gy*s], fill=(255, 255, 255, 220))

    return finalize(img, w, h)

# ==============================================================================
# PARTICLE & FEEDBACK MARKERS
# ==============================================================================

def draw_sparkle(w=32, h=32):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2

    d.ellipse([cx - 12*s, cy - 12*s, cx + 12*s, cy + 12*s], fill=(255, 213, 79, 100))

    r = 15 * s
    pts = [(cx, cy - r), (cx + 3*s, cy), (cx, cy + r), (cx - 3*s, cy)]
    d.polygon(pts, fill=(255, 255, 255, 255))
    pts_h = [(cx - r, cy), (cx, cy + 3*s), (cx + r, cy), (cx, cy - 3*s)]
    d.polygon(pts_h, fill=(255, 255, 255, 255))

    rd = 8 * s
    for angle in [45, 135, 225, 315]:
        rad = math.radians(angle)
        dx, dy = rd * math.cos(rad), rd * math.sin(rad)
        d.line([(cx, cy), (cx + dx, cy + dy)], fill=(255, 245, 157, 230), width=2*s)

    d.ellipse([cx - 2.5*s, cy - 2.5*s, cx + 2.5*s, cy + 2.5*s], fill=(255, 255, 255, 255))
    return finalize(img, w, h)

def draw_check_mark(w=48, h=48):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2
    r = 21 * s

    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(46, 125, 50, 255))
    pts = [(cx - 10*s, cy + 1*s), (cx - 3*s, cy + 8*s), (cx + 10*s, cy - 7*s)]
    d.line(pts, fill=(255, 255, 255, 255), width=5*s, joint="curve")
    return finalize(img, w, h)

def draw_x_mark(w=48, h=48):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2
    r = 21 * s

    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(211, 47, 47, 255))
    d.line([(cx - 9*s, cy - 9*s), (cx + 9*s, cy + 9*s)], fill=(255, 255, 255, 255), width=5*s)
    d.line([(cx + 9*s, cy - 9*s), (cx - 9*s, cy + 9*s)], fill=(255, 255, 255, 255), width=5*s)
    return finalize(img, w, h)

def draw_card_panel(w=96, h=96):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE

    pad = 4 * s
    d.rounded_rectangle([pad, pad, w*s - pad, h*s - pad], radius=12*s, fill=(255, 253, 231, 255))
    d.rounded_rectangle([pad, pad, w*s - pad, h*s - pad], radius=12*s, outline=(255, 179, 0, 255), width=4*s)
    return finalize(img, w, h)

# ==============================================================================
# ATLAS PACKER (Shelf Packing Algorithm with 4px Gutters)
# ==============================================================================

def generate_and_pack_atlas(output_dir):
    os.makedirs(output_dir, exist_ok=True)
    atlas_w, atlas_h = 1024, 512
    atlas_img = Image.new("RGBA", (atlas_w, atlas_h), (0, 0, 0, 0))
    padding = 4

    sprites = [
        # Orchard stages (128x128)
        ("tree-stage-1", draw_tree_stage(1)),
        ("tree-stage-2", draw_tree_stage(2)),
        ("tree-stage-3", draw_tree_stage(3)),
        ("tree-stage-4", draw_tree_stage(4)),
        ("tree-stage-5", draw_tree_stage(5)),
        # Basket Catcher (128x64)
        ("basket", draw_basket(128, 64)),
        # Card Panel (96x96)
        ("card-panel", draw_card_panel(96, 96)),
        # 12 Fruits (80x80)
        ("apple", draw_apple(80, 80)),
        ("orange", draw_orange(80, 80)),
        ("grape", draw_grape(80, 80)),
        ("banana", draw_banana(80, 80)),
        ("watermelon", draw_watermelon(80, 80)),
        ("blueberry", draw_blueberry(80, 80)),
        ("strawberry", draw_strawberry(80, 80)),
        ("lemon", draw_lemon(80, 80)),
        ("kiwi", draw_kiwi(80, 80)),
        ("peach", draw_peach(80, 80)),
        ("plum", draw_plum(80, 80)),
        ("cherry", draw_cherry(80, 80)),
        # UI Buttons (64x64)
        ("btn-pause", draw_btn_pause(64, 64)),
        ("btn-sound", draw_btn_sound(64, 64)),
        ("btn-sound-off", draw_btn_sound_off(64, 64)),
        ("btn-replay", draw_btn_replay(64, 64)),
        ("btn-home", draw_btn_home(64, 64)),
        # Stars & Markers (48x48)
        ("star-full", draw_star_full(48, 48)),
        ("star-empty", draw_star_empty(48, 48)),
        ("check-mark", draw_check_mark(48, 48)),
        ("x-mark", draw_x_mark(48, 48)),
        # Sparkle (32x32)
        ("sparkle", draw_sparkle(32, 32)),
    ]

    frames_json = {}
    cur_x, cur_y = padding, padding
    shelf_height = 0

    for name, img in sprites:
        sw, sh = img.size
        if cur_x + sw + padding > atlas_w:
            cur_x = padding
            cur_y += shelf_height + padding
            shelf_height = 0

        if cur_y + sh + padding > atlas_h:
            raise RuntimeError(f"Texture atlas overflow! Failed to pack {name} ({sw}x{sh}) at y={cur_y}")

        atlas_img.paste(img, (cur_x, cur_y))

        frames_json[name] = {
            "frame": {"x": cur_x, "y": cur_y, "w": sw, "h": sh},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": sw, "h": sh},
            "sourceSize": {"w": sw, "h": sh},
            "pivot": {"x": 0.5, "y": 0.5}
        }

        cur_x += sw + padding
        if sh > shelf_height:
            shelf_height = sh

    atlas_data = {
        "frames": frames_json,
        "meta": {
            "app": "CatchTheFruit-AtlasPacker",
            "version": "1.0",
            "image": "atlas.png",
            "format": "RGBA8888",
            "size": {"w": atlas_w, "h": atlas_h},
            "scale": "1"
        }
    }

    png_path = os.path.join(output_dir, "atlas.png")
    json_path = os.path.join(output_dir, "atlas.json")

    atlas_img.save(png_path, "PNG", optimize=True)
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(atlas_data, f, indent=2)

    print(f"Successfully generated texture atlas:")
    print(f"  PNG:  {png_path} ({os.path.getsize(png_path):,} bytes)")
    print(f"  JSON: {json_path} ({len(frames_json)} frames)")

if __name__ == "__main__":
    import sys
    out_dir = sys.argv[1] if len(sys.argv) > 1 else "public/assets"
    generate_and_pack_atlas(out_dir)
