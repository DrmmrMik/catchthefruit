#!/usr/bin/env python3
"""
scripts/generate_atlas.py - Princesses Wear Pants Magical World Sprite Generator & Atlas Packer
Generates:
  - public/assets/atlas.png (1024x1024 RGBA)
  - public/assets/atlas.json (Phaser 3/4 JSON Hash Format)
"""

import os
import json
import math
import random
from PIL import Image, ImageDraw

SCALE = 4

def make_canvas(w, h):
    """Creates a 4x supersampled RGBA transparent canvas."""
    return Image.new("RGBA", (w * SCALE, h * SCALE), (0, 0, 0, 0))

def finalize(img, w, h):
    """Downsamples supersampled image to target size using high-quality Lanczos."""
    return img.resize((w, h), Image.Resampling.LANCZOS)

def draw_cute_face(d, cx, cy, s, eye_dist=8, eye_r=2.5, smile_w=5, blush=True):
    """Draws a cozy, expressive storybook face with specular eye highlights and rosy cheeks."""
    ed = eye_dist * s
    er = eye_r * s
    # Eyes
    d.ellipse([cx - ed - er, cy - er, cx - ed + er, cy + er], fill=(30, 41, 59, 255))
    d.ellipse([cx + ed - er, cy - er, cx + ed + er, cy + er], fill=(30, 41, 59, 255))
    # Eye Highlights (Top-left shine)
    hr = er * 0.45
    d.ellipse([cx - ed - hr, cy - er*0.6, cx - ed + hr, cy - er*0.1], fill=(255, 255, 255, 255))
    d.ellipse([cx + ed - hr, cy - er*0.6, cx + ed + hr, cy - er*0.1], fill=(255, 255, 255, 255))
    # Rosy Cheeks
    if blush:
        br = 3.2 * s
        d.ellipse([cx - ed - br*1.2, cy + 1.5*s, cx - ed + br*0.8, cy + 1.5*s + br], fill=(251, 113, 133, 160))
        d.ellipse([cx + ed - br*0.8, cy + 1.5*s, cx + ed + br*1.2, cy + 1.5*s + br], fill=(251, 113, 133, 160))
    # Gentle Smiling Mouth
    sw = smile_w * s
    d.arc([cx - sw, cy + 1*s, cx + sw, cy + 6*s], start=10, end=170, fill=(30, 41, 59, 255), width=int(1.8*s))

# ==============================================================================
# PRINCESS PENELOPE SPRITES (96x128 px)
# ==============================================================================

def draw_princess(w=96, h=128, pose="idle1"):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE

    cx = (w * s) / 2
    ground_y = (h * s) - (10 * s)

    bob_y = 0
    arm_pose = "down"

    if pose == "idle2":
        bob_y = -3 * s
    elif pose == "catch":
        bob_y = -9 * s
        arm_pose = "up"
    elif pose == "think":
        arm_pose = "think"

    # 1. Shoes (Red Adventure Sneakers with White Caps)
    shoe_l_x = cx - 18 * s
    shoe_r_x = cx + 8 * s
    shoe_y = ground_y + bob_y

    if pose == "catch":
        # Left shoe planted
        d.rounded_rectangle([shoe_l_x, shoe_y - 8*s, shoe_l_x + 18*s, shoe_y + 2*s], radius=4*s, fill=(225, 29, 72, 255))
        d.rounded_rectangle([shoe_l_x - 2*s, shoe_y, shoe_l_x + 20*s, shoe_y + 5*s], radius=2*s, fill=(255, 255, 255, 255))
        # Right shoe kicked up in joy
        r_sy = shoe_y - 12*s
        d.rounded_rectangle([shoe_r_x + 4*s, r_sy - 8*s, shoe_r_x + 22*s, r_sy + 2*s], radius=4*s, fill=(225, 29, 72, 255))
        d.rounded_rectangle([shoe_r_x + 2*s, r_sy, shoe_r_x + 24*s, r_sy + 5*s], radius=2*s, fill=(255, 255, 255, 255))
    else:
        # Left Shoe
        d.rounded_rectangle([shoe_l_x, shoe_y - 8*s, shoe_l_x + 18*s, shoe_y + 2*s], radius=4*s, fill=(225, 29, 72, 255))
        d.rounded_rectangle([shoe_l_x - 2*s, shoe_y, shoe_l_x + 20*s, shoe_y + 5*s], radius=2*s, fill=(255, 255, 255, 255))
        d.ellipse([shoe_l_x + 4*s, shoe_y - 6*s, shoe_l_x + 8*s, shoe_y - 2*s], fill=(255, 255, 255, 220))

        # Right Shoe
        d.rounded_rectangle([shoe_r_x, shoe_y - 8*s, shoe_r_x + 18*s, shoe_y + 2*s], radius=4*s, fill=(225, 29, 72, 255))
        d.rounded_rectangle([shoe_r_x - 2*s, shoe_y, shoe_r_x + 20*s, shoe_y + 5*s], radius=2*s, fill=(255, 255, 255, 255))
        d.ellipse([shoe_r_x + 10*s, shoe_y - 6*s, shoe_r_x + 14*s, shoe_y - 2*s], fill=(255, 255, 255, 220))

    # 2. Denim Dungarees / Overalls Legs
    pant_y = ground_y - 34 * s + bob_y
    # Left Leg
    d.rounded_rectangle([cx - 19*s, pant_y, cx - 5*s, ground_y - 6*s + bob_y], radius=3*s, fill=(30, 64, 175, 255))
    # Right Leg
    r_leg_end = (ground_y - 14*s + bob_y) if pose == "catch" else (ground_y - 6*s + bob_y)
    d.rounded_rectangle([cx + 5*s, pant_y, cx + 19*s, r_leg_end], radius=3*s, fill=(30, 64, 175, 255))
    # Rolled-up cuffs
    d.rounded_rectangle([cx - 20*s, ground_y - 9*s + bob_y, cx - 4*s, ground_y - 5*s + bob_y], radius=2*s, fill=(96, 165, 250, 255))
    d.rounded_rectangle([cx + 4*s, r_leg_end - 3*s, cx + 20*s, r_leg_end + 1*s], radius=2*s, fill=(96, 165, 250, 255))

    # 3. Torso: Cozy Striped Shirt Underneath
    shirt_y = pant_y - 26 * s
    d.rounded_rectangle([cx - 18*s, shirt_y, cx + 18*s, pant_y + 6*s], radius=6*s, fill=(255, 255, 255, 255))
    for sy in range(int(shirt_y + 4*s), int(pant_y), int(6*s)):
        d.rectangle([cx - 18*s, sy, cx + 18*s, sy + 3*s], fill=(244, 114, 182, 255))

    # 4. Overalls Bib & Pocket
    bib_w = 14 * s
    bib_y = shirt_y + 8 * s
    d.rounded_rectangle([cx - bib_w, bib_y, cx + bib_w, pant_y + 4*s], radius=4*s, fill=(29, 78, 216, 255))
    # Straps
    d.line([(cx - 12*s, shirt_y + 2*s), (cx - 10*s, bib_y + 4*s)], fill=(30, 58, 138, 255), width=5*s)
    d.line([(cx + 12*s, shirt_y + 2*s), (cx + 10*s, bib_y + 4*s)], fill=(30, 58, 138, 255), width=5*s)
    # Brass Buckles
    d.ellipse([cx - 12*s, bib_y + 2*s, cx - 8*s, bib_y + 6*s], fill=(251, 191, 36, 255))
    d.ellipse([cx + 8*s, bib_y + 2*s, cx + 12*s, bib_y + 6*s], fill=(251, 191, 36, 255))
    # Utility Pocket with Golden Stitching
    d.rounded_rectangle([cx - 8*s, bib_y + 10*s, cx + 8*s, bib_y + 22*s], radius=3*s, fill=(30, 64, 175, 255), outline=(251, 191, 36, 255), width=int(1.5*s))
    d.ellipse([cx - 3*s, bib_y + 14*s, cx + 3*s, bib_y + 19*s], fill=(239, 68, 68, 255)) # Apple emblem

    # 5. Back Curly Hair
    head_y = shirt_y - 20 * s
    d.ellipse([cx - 28*s, head_y - 12*s, cx - 10*s, head_y + 16*s], fill=(120, 53, 15, 255))
    d.ellipse([cx + 10*s, head_y - 12*s, cx + 28*s, head_y + 16*s], fill=(120, 53, 15, 255))
    d.ellipse([cx - 32*s, head_y - 4*s, cx - 14*s, head_y + 22*s], fill=(146, 64, 14, 255))
    d.ellipse([cx + 14*s, head_y - 4*s, cx + 32*s, head_y + 22*s], fill=(146, 64, 14, 255))

    # 6. Arms
    skin_color = (254, 215, 170, 255)
    if arm_pose == "up":
        d.line([(cx - 16*s, shirt_y + 8*s), (cx - 26*s, shirt_y - 14*s)], fill=skin_color, width=6*s)
        d.line([(cx + 16*s, shirt_y + 8*s), (cx + 26*s, shirt_y - 14*s)], fill=skin_color, width=6*s)
        d.ellipse([cx - 30*s, shirt_y - 20*s, cx - 22*s, shirt_y - 12*s], fill=(251, 191, 36, 255))
        d.ellipse([cx + 22*s, shirt_y - 20*s, cx + 30*s, shirt_y - 12*s], fill=(251, 191, 36, 255))
    elif arm_pose == "think":
        d.line([(cx - 16*s, shirt_y + 8*s), (cx - 24*s, shirt_y + 20*s)], fill=skin_color, width=6*s)
        d.line([(cx + 16*s, shirt_y + 8*s), (cx + 14*s, head_y + 6*s)], fill=skin_color, width=6*s)
        d.ellipse([cx + 10*s, head_y + 4*s, cx + 18*s, head_y + 12*s], fill=skin_color)
    else:
        d.line([(cx - 16*s, shirt_y + 8*s), (cx - 22*s, shirt_y + 24*s)], fill=skin_color, width=6*s)
        d.line([(cx + 16*s, shirt_y + 8*s), (cx + 22*s, shirt_y + 24*s)], fill=skin_color, width=6*s)
        # Small basket in hands
        bw = 14 * s
        by = shirt_y + 22 * s
        d.rounded_rectangle([cx - bw, by, cx + bw, by + 16*s], radius=4*s, fill=(217, 119, 6, 255), outline=(251, 191, 36, 255), width=2*s)
        d.ellipse([cx - 4*s, by - 4*s, cx + 4*s, by + 4*s], fill=(239, 68, 68, 255))

    # 7. Head & Face
    d.ellipse([cx - 18*s, head_y - 16*s, cx + 18*s, head_y + 16*s], fill=skin_color)
    d.ellipse([cx - 16*s, head_y + 2*s, cx - 8*s, head_y + 8*s], fill=(251, 113, 133, 160))
    d.ellipse([cx + 8*s, head_y + 2*s, cx + 16*s, head_y + 8*s], fill=(251, 113, 133, 160))

    if pose == "catch":
        d.arc([cx - 13*s, head_y - 6*s, cx - 5*s, head_y], start=180, end=360, fill=(30, 41, 59, 255), width=3*s)
        d.arc([cx + 5*s, head_y - 6*s, cx + 13*s, head_y], start=180, end=360, fill=(30, 41, 59, 255), width=3*s)
        d.chord([cx - 7*s, head_y + 4*s, cx + 7*s, head_y + 14*s], start=0, end=180, fill=(225, 29, 72, 255))
        d.chord([cx - 4*s, head_y + 8*s, cx + 4*s, head_y + 14*s], start=0, end=180, fill=(255, 255, 255, 255))
    elif pose == "think":
        d.ellipse([cx - 12*s, head_y - 5*s, cx - 6*s, head_y + 1*s], fill=(30, 41, 59, 255))
        d.ellipse([cx + 6*s, head_y - 5*s, cx + 12*s, head_y + 1*s], fill=(30, 41, 59, 255))
        d.ellipse([cx - 9*s, head_y - 4*s, cx - 7*s, head_y - 2*s], fill=(255, 255, 255, 255))
        d.ellipse([cx + 9*s, head_y - 4*s, cx + 11*s, head_y - 2*s], fill=(255, 255, 255, 255))
        d.arc([cx - 5*s, head_y + 4*s, cx + 5*s, head_y + 10*s], start=20, end=160, fill=(185, 28, 28, 255), width=2*s)
    else:
        d.ellipse([cx - 13*s, head_y - 6*s, cx - 5*s, head_y + 2*s], fill=(30, 41, 59, 255))
        d.ellipse([cx + 5*s, head_y - 6*s, cx + 13*s, head_y + 2*s], fill=(30, 41, 59, 255))
        d.ellipse([cx - 11*s, head_y - 5*s, cx - 8*s, head_y - 2*s], fill=(255, 255, 255, 255))
        d.ellipse([cx + 7*s, head_y - 5*s, cx + 10*s, head_y - 2*s], fill=(255, 255, 255, 255))
        d.arc([cx - 6*s, head_y + 4*s, cx + 6*s, head_y + 10*s], start=10, end=170, fill=(185, 28, 28, 255), width=2*s)

    # 8. Front Hair Curls
    d.ellipse([cx - 16*s, head_y - 20*s, cx - 2*s, head_y - 6*s], fill=(146, 64, 14, 255))
    d.ellipse([cx - 4*s, head_y - 21*s, cx + 14*s, head_y - 8*s], fill=(120, 53, 15, 255))
    d.ellipse([cx + 8*s, head_y - 19*s, cx + 18*s, head_y - 7*s], fill=(146, 64, 14, 255))

    # 9. Sparkling Golden Royal Tiara
    crown_y = head_y - 18 * s
    crown_pts = [
        (cx - 15*s, crown_y),
        (cx - 15*s, crown_y - 12*s),
        (cx - 8*s, crown_y - 4*s),
        (cx, crown_y - 16*s),
        (cx + 8*s, crown_y - 4*s),
        (cx + 15*s, crown_y - 12*s),
        (cx + 15*s, crown_y)
    ]
    d.polygon(crown_pts, fill=(251, 191, 36, 255), outline=(217, 119, 6, 255))
    d.rounded_rectangle([cx - 16*s, crown_y - 2*s, cx + 16*s, crown_y + 2*s], radius=2*s, fill=(245, 158, 11, 255))
    d.ellipse([cx - 3*s, crown_y - 9*s, cx + 3*s, crown_y - 3*s], fill=(225, 29, 72, 255))
    d.ellipse([cx - 16*s, crown_y - 14*s, cx - 14*s, crown_y - 12*s], fill=(255, 255, 255, 255))
    d.ellipse([cx + 14*s, crown_y - 14*s, cx + 16*s, crown_y - 12*s], fill=(255, 255, 255, 255))
    d.ellipse([cx - 1*s, crown_y - 18*s, cx + 1*s, crown_y - 16*s], fill=(255, 255, 255, 255))

    return finalize(img, w, h)

# ==============================================================================
# 12 MAGICAL STORYBOOK FRUIT SPRITES (80x80 px) WITH CUTE EXPRESSIVE FACES
# ==============================================================================

def draw_apple(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2 + (4 * s)

    # Stem & Leaf
    d.line([(cx - 2*s, cy - 24*s), (cx - 8*s, cy - 36*s)], fill=(93, 64, 55, 255), width=5*s)
    leaf_pts = [(cx - 3*s, cy - 28*s), (cx + 18*s, cy - 36*s), (cx + 12*s, cy - 22*s)]
    d.polygon(leaf_pts, fill=(67, 160, 71, 255))

    # Apple Body
    r = 25 * s
    d.ellipse([cx - r - 2*s, cy - r, cx + 5*s, cy + r], fill=(239, 68, 68, 255))
    d.ellipse([cx - 5*s, cy - r, cx + r + 2*s, cy + r], fill=(220, 38, 38, 255))
    d.ellipse([cx - 20*s, cy - 10*s, cx + 20*s, cy + 24*s], fill=(239, 68, 68, 255))
    # Specular highlight
    d.ellipse([cx - 20*s, cy - 18*s, cx - 10*s, cy - 6*s], fill=(255, 205, 210, 180))

    # Cute Expressive Storybook Face
    draw_cute_face(d, cx, cy + 2*s, s, eye_dist=8, eye_r=2.8, smile_w=5)
    return finalize(img, w, h)

def draw_orange(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2 + (2 * s)
    r = 28 * s

    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(249, 115, 22, 255))
    d.arc([cx - r, cy - r, cx + r, cy + r], start=0, end=140, fill=(234, 88, 12, 255), width=4*s)

    # Green leaf on top
    d.ellipse([cx - 6*s, cy - r - 6*s, cx + 6*s, cy - r + 4*s], fill=(34, 197, 94, 255))
    d.ellipse([cx - 20*s, cy - 20*s, cx - 10*s, cy - 8*s], fill=(255, 237, 213, 180))

    draw_cute_face(d, cx, cy + 2*s, s, eye_dist=9, eye_r=2.8, smile_w=6)
    return finalize(img, w, h)

def draw_grape(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2 + (2 * s)

    # Stem & curly vine
    d.line([(cx, cy - 26*s), (cx, cy - 36*s)], fill=(101, 163, 13, 255), width=4*s)
    d.arc([cx - 10*s, cy - 38*s, cx + 6*s, cy - 26*s], start=180, end=360, fill=(101, 163, 13, 255), width=3*s)

    grape_positions = [
        (-18, -14), (-6, -16), (6, -16), (18, -14),
        (-12, -2), (0, -3), (12, -2),
        (-6, 11), (6, 11),
        (0, 23)
    ]
    gr = 9 * s
    for gx, gy in grape_positions:
        d.ellipse([cx + gx*s - gr, cy + gy*s - gr, cx + gx*s + gr, cy + gy*s + gr], fill=(139, 92, 246, 255))
        d.ellipse([cx + gx*s - gr*0.6, cy + gy*s - gr*0.6, cx + gx*s, cy + gy*s], fill=(196, 181, 253, 180))

    # Cute face centered on the central grapes
    draw_cute_face(d, cx, cy - 2*s, s, eye_dist=7, eye_r=2.4, smile_w=4)
    return finalize(img, w, h)

def draw_banana(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2

    # Banana curve
    d.arc([cx - 30*s, cy - 32*s, cx + 30*s, cy + 28*s], start=30, end=150, fill=(234, 179, 8, 255), width=22*s)
    d.arc([cx - 30*s, cy - 32*s, cx + 30*s, cy + 28*s], start=35, end=145, fill=(250, 204, 21, 255), width=18*s)
    # Stem & tip
    d.rectangle([cx + 18*s, cy - 14*s, cx + 24*s, cy - 8*s], fill=(101, 163, 13, 255))
    d.rectangle([cx - 24*s, cy - 14*s, cx - 18*s, cy - 8*s], fill=(113, 63, 18, 255))

    draw_cute_face(d, cx, cy + 6*s, s, eye_dist=7, eye_r=2.5, smile_w=5)
    return finalize(img, w, h)

def draw_watermelon(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2 + (4 * s)

    # Rind (Green)
    d.chord([cx - 32*s, cy - 30*s, cx + 32*s, cy + 30*s], start=0, end=180, fill=(22, 163, 74, 255))
    # Inner White Rind
    d.chord([cx - 29*s, cy - 28*s, cx + 29*s, cy + 28*s], start=0, end=180, fill=(240, 253, 244, 255))
    # Red Flesh
    d.chord([cx - 26*s, cy - 26*s, cx + 26*s, cy + 26*s], start=0, end=180, fill=(244, 63, 94, 255))

    # Seeds
    for sx, sy in [(-14, 4), (14, 4), (-6, 16), (6, 16)]:
        d.ellipse([cx + sx*s - 2*s, cy + sy*s - 3*s, cx + sx*s + 2*s, cy + sy*s + 3*s], fill=(30, 41, 59, 255))

    draw_cute_face(d, cx, cy + 4*s, s, eye_dist=8, eye_r=2.8, smile_w=6)
    return finalize(img, w, h)

def draw_blueberry(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2 + (2 * s)
    r = 27 * s

    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(37, 99, 235, 255))
    d.arc([cx - r, cy - r, cx + r, cy + r], start=0, end=140, fill=(29, 78, 216, 255), width=4*s)

    # Crown crown calyx on top
    d.polygon([(cx - 8*s, cy - r + 2*s), (cx - 12*s, cy - r - 4*s), (cx - 4*s, cy - r),
               (cx, cy - r - 6*s), (cx + 4*s, cy - r), (cx + 12*s, cy - r - 4*s),
               (cx + 8*s, cy - r + 2*s)], fill=(30, 58, 138, 255))
    d.ellipse([cx - 18*s, cy - 18*s, cx - 8*s, cy - 8*s], fill=(191, 219, 254, 180))

    draw_cute_face(d, cx, cy + 2*s, s, eye_dist=8, eye_r=2.6, smile_w=5)
    return finalize(img, w, h)

def draw_strawberry(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2 + (4 * s)

    # Heart/Cone Body
    body_pts = [
        (cx, cy + 28*s),
        (cx - 26*s, cy - 4*s),
        (cx - 24*s, cy - 20*s),
        (cx, cy - 16*s),
        (cx + 24*s, cy - 20*s),
        (cx + 26*s, cy - 4*s)
    ]
    d.polygon(body_pts, fill=(239, 68, 68, 255))
    d.ellipse([cx - 26*s, cy - 22*s, cx + 26*s, cy + 14*s], fill=(239, 68, 68, 255))

    # Green Leaf Crown
    d.polygon([(cx - 18*s, cy - 24*s), (cx - 8*s, cy - 18*s), (cx, cy - 28*s),
               (cx + 8*s, cy - 18*s), (cx + 18*s, cy - 24*s), (cx, cy - 18*s)], fill=(34, 197, 94, 255))

    # Yellow seeds
    for px, py in [(-12, -4), (12, -4), (-6, 8), (6, 8), (0, 18)]:
        d.ellipse([cx + px*s - 1.5*s, cy + py*s - 1.5*s, cx + px*s + 1.5*s, cy + py*s + 1.5*s], fill=(254, 240, 138, 255))

    draw_cute_face(d, cx, cy - 2*s, s, eye_dist=8, eye_r=2.6, smile_w=5)
    return finalize(img, w, h)

def draw_lemon(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2

    # Oval with tips
    d.ellipse([cx - 28*s, cy - 22*s, cx + 28*s, cy + 22*s], fill=(250, 204, 21, 255))
    d.polygon([(cx - 28*s, cy - 6*s), (cx - 34*s, cy), (cx - 28*s, cy + 6*s)], fill=(234, 179, 8, 255))
    d.polygon([(cx + 28*s, cy - 6*s), (cx + 34*s, cy), (cx + 28*s, cy + 6*s)], fill=(234, 179, 8, 255))
    d.ellipse([cx - 16*s, cy - 14*s, cx - 6*s, cy - 4*s], fill=(254, 249, 195, 200))

    draw_cute_face(d, cx, cy + 2*s, s, eye_dist=8, eye_r=2.8, smile_w=5)
    return finalize(img, w, h)

def draw_kiwi(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2
    r = 27 * s

    # Fuzzy brown rind
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(161, 98, 7, 255))
    # Green interior
    d.ellipse([cx - r + 3*s, cy - r + 3*s, cx + r - 3*s, cy + r - 3*s], fill=(132, 204, 22, 255))
    # Cream center
    d.ellipse([cx - 8*s, cy - 8*s, cx + 8*s, cy + 8*s], fill=(254, 240, 138, 255))

    draw_cute_face(d, cx, cy + 2*s, s, eye_dist=8, eye_r=2.5, smile_w=5)
    return finalize(img, w, h)

def draw_peach(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2 + (2 * s)

    # Leaf
    d.polygon([(cx, cy - 24*s), (cx + 16*s, cy - 32*s), (cx + 10*s, cy - 18*s)], fill=(34, 197, 94, 255))
    # Peach Body (Warm peach gradient)
    r = 26 * s
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(251, 146, 60, 255))
    d.ellipse([cx - r, cy - r, cx + 4*s, cy + r], fill=(251, 113, 133, 200))
    d.arc([cx, cy - r + 2*s, cx + 8*s, cy + r - 2*s], start=90, end=270, fill=(244, 63, 94, 200), width=3*s)

    draw_cute_face(d, cx, cy + 2*s, s, eye_dist=8, eye_r=2.8, smile_w=5)
    return finalize(img, w, h)

def draw_plum(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2 + (2 * s)
    r = 26 * s

    # Deep violet plum
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(109, 40, 217, 255))
    d.ellipse([cx - 16*s, cy - 16*s, cx - 6*s, cy - 6*s], fill=(216, 180, 254, 180))
    # Small stem
    d.line([(cx, cy - r), (cx - 4*s, cy - r - 8*s)], fill=(101, 163, 13, 255), width=3*s)

    draw_cute_face(d, cx, cy + 2*s, s, eye_dist=8, eye_r=2.6, smile_w=5)
    return finalize(img, w, h)

def draw_cherry(w=80, h=80):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2 + (4 * s)

    # Dual Cherries
    # Stems meeting at top
    d.arc([cx - 20*s, cy - 36*s, cx, cy - 6*s], start=270, end=360, fill=(101, 163, 13, 255), width=3*s)
    d.arc([cx, cy - 36*s, cx + 20*s, cy - 6*s], start=180, end=270, fill=(101, 163, 13, 255), width=3*s)
    # Leaf at join
    d.polygon([(cx, cy - 32*s), (cx + 12*s, cy - 36*s), (cx + 6*s, cy - 26*s)], fill=(34, 197, 94, 255))

    # Left Cherry
    d.ellipse([cx - 24*s, cy - 8*s, cx - 2*s, cy + 14*s], fill=(225, 29, 72, 255))
    d.ellipse([cx - 20*s, cy - 5*s, cx - 14*s, cy + 1*s], fill=(254, 205, 211, 200))
    draw_cute_face(d, cx - 13*s, cy + 3*s, s, eye_dist=4, eye_r=1.8, smile_w=3)

    # Right Cherry
    d.ellipse([cx + 2*s, cy - 2*s, cx + 24*s, cy + 20*s], fill=(225, 29, 72, 255))
    d.ellipse([cx + 6*s, cy + 1*s, cx + 12*s, cy + 7*s], fill=(254, 205, 211, 200))
    draw_cute_face(d, cx + 13*s, cy + 9*s, s, eye_dist=4, eye_r=1.8, smile_w=3)

    return finalize(img, w, h)

# ==============================================================================
# BASKETS & UI
# ==============================================================================

def draw_basket(w=128, h=64):
    """Classic Catcher Basket"""
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2

    # Wicker Basket
    d.chord([cx - 48*s, cy - 24*s, cx + 48*s, cy + 28*s], start=0, end=180, fill=(180, 83, 9, 255))
    d.chord([cx - 44*s, cy - 20*s, cx + 44*s, cy + 24*s], start=0, end=180, fill=(217, 119, 6, 255))
    # Rim
    d.rounded_rectangle([cx - 52*s, cy - 26*s, cx + 52*s, cy - 16*s], radius=5*s, fill=(245, 158, 11, 255))
    # Wicker cross pattern
    for x in range(int(cx - 36*s), int(cx + 40*s), int(12*s)):
        d.line([(x, cy - 16*s), (x + 8*s, cy + 22*s)], fill=(180, 83, 9, 255), width=2*s)
        d.line([(x + 8*s, cy - 16*s), (x, cy + 22*s)], fill=(180, 83, 9, 255), width=2*s)

    return finalize(img, w, h)

def draw_basket_royal(w=128, h=64):
    """Royal Braided Golden Basket with Crimson Velvet & Jewels"""
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w * s) / 2, (h * s) / 2

    # Velvet lining interior
    d.chord([cx - 46*s, cy - 22*s, cx + 46*s, cy + 24*s], start=0, end=180, fill=(190, 18, 60, 255))
    # Golden Braided Wicker
    d.chord([cx - 48*s, cy - 20*s, cx + 48*s, cy + 28*s], start=0, end=180, fill=(217, 119, 6, 255))
    d.chord([cx - 44*s, cy - 16*s, cx + 44*s, cy + 24*s], start=0, end=180, fill=(251, 191, 36, 255))

    # Royal Golden Rim with Ruby Gems
    d.rounded_rectangle([cx - 54*s, cy - 26*s, cx + 54*s, cy - 14*s], radius=6*s, fill=(245, 158, 11, 255), outline=(254, 240, 138, 255), width=2*s)
    for rx in [-36, -18, 0, 18, 36]:
        d.ellipse([cx + rx*s - 3*s, cy - 23*s, cx + rx*s + 3*s, cy - 17*s], fill=(225, 29, 72, 255))

    # Golden Ribbon Bow on Front
    d.polygon([(cx - 10*s, cy - 8*s), (cx - 18*s, cy - 16*s), (cx - 12*s, cy), (cx, cy - 4*s)], fill=(234, 179, 8, 255))
    d.polygon([(cx + 10*s, cy - 8*s), (cx + 18*s, cy - 16*s), (cx + 12*s, cy), (cx, cy - 4*s)], fill=(234, 179, 8, 255))
    d.ellipse([cx - 4*s, cy - 8*s, cx + 4*s, cy], fill=(225, 29, 72, 255))

    return finalize(img, w, h)

def draw_card_panel(w=96, h=96):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    d.rounded_rectangle([4*s, 4*s, (w-4)*s, (h-4)*s], radius=14*s, fill=(255, 255, 255, 255), outline=(2, 132, 199, 255), width=3*s)
    return finalize(img, w, h)

# ==============================================================================
# ENCHANTED ROYAL ORCHARD TREE STAGES (128x128 px)
# ==============================================================================

def draw_tree_stage(stage, w=128, h=128):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx = (w * s) / 2

    # Trunk
    d.rounded_rectangle([cx - 10*s, 64*s, cx + 10*s, 114*s], radius=4*s, fill=(120, 53, 15, 255))
    # Roots / Grassy Mound
    d.chord([cx - 32*s, 100*s, cx + 32*s, 124*s], start=0, end=180, fill=(34, 197, 94, 255))

    # Canopy (Lush Emerald & Mint Green Clouds)
    d.ellipse([cx - 38*s, 24*s, cx + 38*s, 76*s], fill=(22, 163, 74, 255))
    d.ellipse([cx - 44*s, 34*s, cx - 4*s, 78*s], fill=(34, 197, 94, 255))
    d.ellipse([cx + 4*s, 34*s, cx + 44*s, 78*s], fill=(34, 197, 94, 255))
    d.ellipse([cx - 26*s, 14*s, cx + 26*s, 56*s], fill=(74, 222, 128, 255))

    # Fairy Blossoms & Jewel Fruits based on stage (1 to 5)
    fruit_spots = [
        (cx - 16*s, 44*s),
        (cx + 18*s, 42*s),
        (cx, 28*s),
        (cx - 24*s, 60*s),
        (cx + 22*s, 62*s)
    ]
    for i in range(min(stage, 5)):
        fx, fy = fruit_spots[i]
        # Golden Apple / Jewel Fruit with Sparkle
        d.ellipse([fx - 8*s, fy - 8*s, fx + 8*s, fy + 8*s], fill=(239, 68, 68, 255))
        d.ellipse([fx - 6*s, fy - 6*s, fx - 2*s, fy - 2*s], fill=(254, 205, 211, 220))
        d.point((fx - 1*s, fy - 9*s), fill=(34, 197, 94, 255))
        # Fairy glow
        d.ellipse([fx - 12*s, fy - 12*s, fx + 12*s, fy + 12*s], outline=(254, 240, 138, 140), width=2*s)

    # Glowing lantern for stage 4 and 5
    if stage >= 4:
        lx, ly = cx - 28*s, 70*s
        d.line([(lx, 64*s), (lx, ly)], fill=(251, 191, 36, 255), width=2*s)
        d.ellipse([lx - 4*s, ly - 4*s, lx + 4*s, ly + 6*s], fill=(254, 240, 138, 255))

    return finalize(img, w, h)

# ==============================================================================
# BUTTONS, STARS & PARTICLES
# ==============================================================================

def draw_btn_pause(w=64, h=64):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    d.ellipse([2*s, 2*s, (w-2)*s, (h-2)*s], fill=(2, 132, 199, 255), outline=(255, 255, 255, 255), width=2*s)
    cx, cy = (w*s)/2, (h*s)/2
    d.rounded_rectangle([cx - 8*s, cy - 12*s, cx - 3*s, cy + 12*s], radius=2*s, fill=(255, 255, 255, 255))
    d.rounded_rectangle([cx + 3*s, cy - 12*s, cx + 8*s, cy + 12*s], radius=2*s, fill=(255, 255, 255, 255))
    return finalize(img, w, h)

def draw_btn_sound(w=64, h=64):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    d.ellipse([2*s, 2*s, (w-2)*s, (h-2)*s], fill=(2, 132, 199, 255), outline=(255, 255, 255, 255), width=2*s)
    cx, cy = (w*s)/2, (h*s)/2
    # Speaker cone
    d.polygon([(cx - 10*s, cy - 6*s), (cx - 4*s, cy - 6*s), (cx + 4*s, cy - 12*s),
               (cx + 4*s, cy + 12*s), (cx - 4*s, cy + 6*s), (cx - 10*s, cy + 6*s)], fill=(255, 255, 255, 255))
    d.arc([cx + 2*s, cy - 8*s, cx + 12*s, cy + 8*s], start=300, end=60, fill=(255, 255, 255, 255), width=2*s)
    return finalize(img, w, h)

def draw_btn_sound_off(w=64, h=64):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    d.ellipse([2*s, 2*s, (w-2)*s, (h-2)*s], fill=(148, 163, 184, 255), outline=(255, 255, 255, 255), width=2*s)
    cx, cy = (w*s)/2, (h*s)/2
    d.polygon([(cx - 10*s, cy - 6*s), (cx - 4*s, cy - 6*s), (cx + 4*s, cy - 12*s),
               (cx + 4*s, cy + 12*s), (cx - 4*s, cy + 6*s), (cx - 10*s, cy + 6*s)], fill=(255, 255, 255, 255))
    d.line([(cx - 10*s, cy + 12*s), (cx + 12*s, cy - 10*s)], fill=(239, 68, 68, 255), width=3*s)
    return finalize(img, w, h)

def draw_btn_replay(w=64, h=64):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    d.ellipse([2*s, 2*s, (w-2)*s, (h-2)*s], fill=(16, 185, 129, 255), outline=(255, 255, 255, 255), width=2*s)
    cx, cy = (w*s)/2, (h*s)/2
    d.arc([cx - 12*s, cy - 12*s, cx + 12*s, cy + 12*s], start=45, end=300, fill=(255, 255, 255, 255), width=3*s)
    d.polygon([(cx + 8*s, cy - 16*s), (cx + 16*s, cy - 8*s), (cx + 6*s, cy - 6*s)], fill=(255, 255, 255, 255))
    return finalize(img, w, h)

def draw_btn_home(w=64, h=64):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    d.ellipse([2*s, 2*s, (w-2)*s, (h-2)*s], fill=(139, 92, 246, 255), outline=(255, 255, 255, 255), width=2*s)
    cx, cy = (w*s)/2, (h*s)/2
    d.polygon([(cx, cy - 14*s), (cx - 14*s, cy), (cx + 14*s, cy)], fill=(255, 255, 255, 255))
    d.rectangle([cx - 10*s, cy, cx + 10*s, cy + 12*s], fill=(255, 255, 255, 255))
    d.rectangle([cx - 4*s, cy + 3*s, cx + 4*s, cy + 12*s], fill=(139, 92, 246, 255))
    return finalize(img, w, h)

def draw_star(is_full, w=48, h=48):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w*s)/2, (h*s)/2
    pts = []
    for i in range(10):
        angle = -math.pi / 2 + (i * math.pi / 5)
        r = (20*s) if i % 2 == 0 else (9*s)
        pts.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))

    if is_full:
        d.polygon(pts, fill=(251, 191, 36, 255), outline=(217, 119, 6, 255))
        d.ellipse([cx - 6*s, cy - 6*s, cx, cy], fill=(254, 240, 138, 220))
    else:
        d.polygon(pts, fill=(226, 232, 240, 255), outline=(148, 163, 184, 255))
    return finalize(img, w, h)

def draw_crown_star(is_full, w=48, h=48):
    """Princess Royal Crown Badge"""
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w*s)/2, (h*s)/2 + (2*s)

    crown_pts = [
        (cx - 18*s, cy + 10*s),
        (cx - 18*s, cy - 8*s),
        (cx - 10*s, cy + 2*s),
        (cx, cy - 14*s), # High central peak
        (cx + 10*s, cy + 2*s),
        (cx + 18*s, cy - 8*s),
        (cx + 18*s, cy + 10*s)
    ]

    if is_full:
        d.polygon(crown_pts, fill=(251, 191, 36, 255), outline=(217, 119, 6, 255))
        d.rounded_rectangle([cx - 20*s, cy + 8*s, cx + 20*s, cy + 14*s], radius=2*s, fill=(245, 158, 11, 255))
        d.ellipse([cx - 3*s, cy - 4*s, cx + 3*s, cy + 2*s], fill=(225, 29, 72, 255))
        d.ellipse([cx - 1*s, cy - 15*s, cx + 1*s, cy - 13*s], fill=(255, 255, 255, 255))
    else:
        d.polygon(crown_pts, fill=(226, 232, 240, 255), outline=(148, 163, 184, 255))
        d.rounded_rectangle([cx - 20*s, cy + 8*s, cx + 20*s, cy + 14*s], radius=2*s, fill=(203, 213, 225, 255))
    return finalize(img, w, h)

def draw_check_mark(w=48, h=48):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w*s)/2, (h*s)/2
    d.ellipse([3*s, 3*s, (w-3)*s, (h-3)*s], fill=(16, 185, 129, 255))
    d.line([(cx - 10*s, cy), (cx - 2*s, cy + 8*s), (cx + 12*s, cy - 8*s)], fill=(255, 255, 255, 255), width=4*s)
    return finalize(img, w, h)

def draw_x_mark(w=48, h=48):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w*s)/2, (h*s)/2
    d.ellipse([3*s, 3*s, (w-3)*s, (h-3)*s], fill=(239, 68, 68, 255))
    d.line([(cx - 8*s, cy - 8*s), (cx + 8*s, cy + 8*s)], fill=(255, 255, 255, 255), width=4*s)
    d.line([(cx + 8*s, cy - 8*s), (cx - 8*s, cy + 8*s)], fill=(255, 255, 255, 255), width=4*s)
    return finalize(img, w, h)

def draw_sparkle(w=32, h=32):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w*s)/2, (h*s)/2
    pts = [
        (cx, cy - 14*s), (cx + 4*s, cy - 4*s), (cx + 14*s, cy),
        (cx + 4*s, cy + 4*s), (cx, cy + 14*s), (cx - 4*s, cy + 4*s),
        (cx - 14*s, cy), (cx - 4*s, cy - 4*s)
    ]
    d.polygon(pts, fill=(251, 191, 36, 255))
    d.ellipse([cx - 3*s, cy - 3*s, cx + 3*s, cy + 3*s], fill=(255, 255, 255, 255))
    return finalize(img, w, h)

def draw_petal(w=32, h=32):
    """Floating Pink Cherry Blossom Petal for Cozy Atmosphere"""
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w*s)/2, (h*s)/2
    d.ellipse([cx - 12*s, cy - 6*s, cx + 12*s, cy + 6*s], fill=(251, 207, 232, 220))
    d.ellipse([cx - 8*s, cy - 4*s, cx + 8*s, cy + 4*s], fill=(244, 114, 182, 180))
    return finalize(img, w, h)

def draw_firefly(w=24, h=24):
    """Golden Glowing Magical Mote"""
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE
    cx, cy = (w*s)/2, (h*s)/2
    d.ellipse([cx - 10*s, cy - 10*s, cx + 10*s, cy + 10*s], fill=(254, 240, 138, 100))
    d.ellipse([cx - 6*s, cy - 6*s, cx + 6*s, cy + 6*s], fill=(253, 224, 71, 200))
    d.ellipse([cx - 3*s, cy - 3*s, cx + 3*s, cy + 3*s], fill=(255, 255, 255, 255))
    return finalize(img, w, h)

# ==============================================================================
# TEXTURE ATLAS PACKER (1024x1024)
# ==============================================================================

def generate_and_pack_atlas(output_dir="public/assets"):
    os.makedirs(output_dir, exist_ok=True)

    atlas_w, atlas_h = 1024, 1024
    atlas_img = Image.new("RGBA", (atlas_w, atlas_h), (0, 0, 0, 0))
    padding = 6

    sprites = [
        # Princess Penelope Character Animations (96x128)
        ("princess-idle-1", draw_princess(96, 128, "idle1")),
        ("princess-idle-2", draw_princess(96, 128, "idle2")),
        ("princess-catch", draw_princess(96, 128, "catch")),
        ("princess-think", draw_princess(96, 128, "think")),
        # Orchard stages (128x128)
        ("tree-stage-1", draw_tree_stage(1, 128, 128)),
        ("tree-stage-2", draw_tree_stage(2, 128, 128)),
        ("tree-stage-3", draw_tree_stage(3, 128, 128)),
        ("tree-stage-4", draw_tree_stage(4, 128, 128)),
        ("tree-stage-5", draw_tree_stage(5, 128, 128)),
        # Baskets (128x64)
        ("basket", draw_basket(128, 64)),
        ("basket-royal", draw_basket_royal(128, 64)),
        # Card Panel (96x96)
        ("card-panel", draw_card_panel(96, 96)),
        # 12 Storybook Fruits with Cute Faces (80x80)
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
        ("star-full", draw_star(True, 48, 48)),
        ("star-empty", draw_star(False, 48, 48)),
        ("crown-star-full", draw_crown_star(True, 48, 48)),
        ("crown-star-empty", draw_crown_star(False, 48, 48)),
        ("check-mark", draw_check_mark(48, 48)),
        ("x-mark", draw_x_mark(48, 48)),
        # Atmospheric Particles (32x32 / 24x24)
        ("sparkle", draw_sparkle(32, 32)),
        ("petal", draw_petal(32, 32)),
        ("firefly", draw_firefly(24, 24)),
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
            "version": "2.0-PrincessPants",
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
