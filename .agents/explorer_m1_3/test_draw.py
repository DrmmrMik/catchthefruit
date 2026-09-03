#!/usr/bin/env python3
"""
Test sprite generator for Catch the Fruit assets using Pillow.
Renders all sprites at 4x scale with antialiasing downsampling (LANCZOS).
"""
import math
from PIL import Image, ImageDraw

def create_supersampled_canvas(w, h, scale=4):
    return Image.new("RGBA", (w * scale, h * scale), (0, 0, 0, 0)), scale

def downsample(img, w, h):
    return img.resize((w, h), Image.Resampling.LANCZOS)

def draw_apple(w=80, h=80):
    img, s = create_supersampled_canvas(w, h)
    draw = ImageDraw.Draw(img)
    cx, cy = w * s / 2, h * s / 2 + 3 * s
    
    # Stem
    draw.line([(cx - 2 * s, cy - 26 * s), (cx - 6 * s, cy - 36 * s)], fill=(110, 60, 30, 255), width=4 * s)
    # Leaf
    draw.polygon([(cx - 2 * s, cy - 30 * s), (cx + 16 * s, cy - 36 * s), (cx + 10 * s, cy - 24 * s)], fill=(76, 175, 80, 255))
    draw.line([(cx - 2 * s, cy - 30 * s), (cx + 16 * s, cy - 36 * s)], fill=(56, 142, 60, 255), width=2 * s)
    
    # Apple lobes
    r = 24 * s
    draw.ellipse([cx - r - 2 * s, cy - r, cx + 4 * s, cy + r], fill=(230, 40, 50, 255))
    draw.ellipse([cx - 4 * s, cy - r, cx + r + 2 * s, cy + r], fill=(215, 30, 40, 255))
    # Bottom curve merge
    draw.ellipse([cx - 20 * s, cy - 10 * s, cx + 20 * s, cy + 24 * s], fill=(225, 35, 45, 255))
    # Top dimple
    draw.ellipse([cx - 6 * s, cy - r - 2 * s, cx + 6 * s, cy - r + 6 * s], fill=(160, 20, 30, 255))
    # Specular highlight
    draw.ellipse([cx - 18 * s, cy - 16 * s, cx - 8 * s, cy - 4 * s], fill=(255, 180, 190, 180))
    
    return downsample(img, w, h)

apple = draw_apple()
print("Apple size:", apple.size, "Mode:", apple.mode)
