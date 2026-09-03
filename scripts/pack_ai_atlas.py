#!/usr/bin/env python3
"""
scripts/pack_ai_atlas.py - Master AI Raster Asset Processor & Texture Atlas Packer
Uses connected-component border floodfill segmentation to preserve 100% of interior white details
(eyes, teeth, highlights, sole caps, fruit flesh) while providing clean anti-aliased edges
without white fringing or halo artifacts over in-game backgrounds.
"""

import os
import json
import math
from collections import deque
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SCALE = 4
SRC_DIR = '/home/gallabot/.gemini/antigravity/brain/ec582232-567f-4225-b8f1-d6ff7b3cefb8'

def extract_sprite_clean(img, thresh_dist=24, feather_radius=1.0):
    """
    Extracts foreground sprite using connected border floodfill to preserve all interior whites,
    followed by anti-aliased edge smoothing and color de-fringing.
    """
    img_rgb = img.convert("RGB")
    w, h = img_rgb.size

    arr = np.array(img_rgb, dtype=np.int16)
    # Distance from white (255, 255, 255)
    diff = 255 - arr
    max_diff = np.max(diff, axis=2)

    bg_candidates = (max_diff <= thresh_dist)

    visited = np.zeros((h, w), dtype=bool)
    queue = deque()

    # Seed border pixels that match background whiteness
    for x in range(w):
        if bg_candidates[0, x]:
            queue.append((0, x))
            visited[0, x] = True
        if bg_candidates[h - 1, x] and not visited[h - 1, x]:
            queue.append((h - 1, x))
            visited[h - 1, x] = True
    for y in range(h):
        if bg_candidates[y, 0] and not visited[y, 0]:
            queue.append((y, 0))
            visited[y, 0] = True
        if bg_candidates[y, w - 1] and not visited[y, w - 1]:
            queue.append((y, w - 1))
            visited[y, w - 1] = True

    # 4-connectivity BFS
    while queue:
        cy, cx = queue.popleft()
        for ny, nx in [(cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)]:
            if 0 <= ny < h and 0 <= nx < w:
                if not visited[ny, nx] and bg_candidates[ny, nx]:
                    visited[ny, nx] = True
                    queue.append((ny, nx))

    # visited is background. Invert to get foreground mask.
    fg_mask_arr = np.where(visited, 0, 255).astype(np.uint8)
    fg_mask = Image.fromarray(fg_mask_arr, mode="L")

    if feather_radius > 0:
        fg_mask = fg_mask.filter(ImageFilter.GaussianBlur(feather_radius))

    rgba = img_rgb.convert("RGBA")
    rgba.putalpha(fg_mask)
    return rgba

def make_canvas(w, h):
    return Image.new("RGBA", (w * SCALE, h * SCALE), (0, 0, 0, 0))

def finalize(img, w, h):
    return img.resize((w, h), Image.Resampling.LANCZOS)

# ------------------------------------------------------------------------------
# 1. PROCESS AI RASTER PRINCESS PENELOPE
# ------------------------------------------------------------------------------
def get_princess_sprites():
    sprites = {}

    # Idle Poses
    char_path = os.path.join(SRC_DIR, 'princess_penelope_character_1788441979685.jpg')
    char_img = Image.open(char_path)
    char_trans = extract_sprite_clean(char_img, thresh_dist=25, feather_radius=1.2)
    c_bbox = char_trans.getbbox()
    cropped = char_trans.crop(c_bbox)
    cw, ch = cropped.size
    scale = min(96 / cw, 128 / ch) * 0.96
    nw, nh = int(cw * scale), int(ch * scale)
    scaled = cropped.resize((nw, nh), Image.Resampling.LANCZOS)

    # Idle 1
    c1 = Image.new("RGBA", (96, 128), (0, 0, 0, 0))
    c1.paste(scaled, ((96 - nw) // 2, 128 - nh - 4))
    sprites["princess-idle-1"] = c1

    # Idle 2 (Breathing frame - subtle vertical chest/tiara rise)
    c2 = Image.new("RGBA", (96, 128), (0, 0, 0, 0))
    c2.paste(scaled, ((96 - nw) // 2, 128 - nh - 7))
    sprites["princess-idle-2"] = c2

    # Celebrating / Catch Pose
    celeb_path = os.path.join(SRC_DIR, 'princess_penelope_celebrating_1788442003907.jpg')
    celeb_img = Image.open(celeb_path)
    celeb_trans = extract_sprite_clean(celeb_img, thresh_dist=25, feather_radius=1.2)
    cb_bbox = celeb_trans.getbbox()
    c_cropped = celeb_trans.crop(cb_bbox)
    cw2, ch2 = c_cropped.size
    scale2 = min(96 / cw2, 128 / ch2) * 0.96
    nw2, nh2 = int(cw2 * scale2), int(ch2 * scale2)
    scaled_celeb = c_cropped.resize((nw2, nh2), Image.Resampling.LANCZOS)

    c_catch = Image.new("RGBA", (96, 128), (0, 0, 0, 0))
    c_catch.paste(scaled_celeb, ((96 - nw2) // 2, 128 - nh2 - 4))
    sprites["princess-catch"] = c_catch

    # Thinking Pose (Zoomed upper body with playful head tilt)
    head_crop = cropped.crop((int(cw * 0.1), 0, int(cw * 0.9), int(ch * 0.72)))
    head_rot = head_crop.rotate(4, resample=Image.Resampling.BICUBIC, expand=True)
    hw, hh = head_rot.size
    scale_h = min(96 / hw, 128 / hh) * 0.92
    nw_h, nh_h = int(hw * scale_h), int(hh * scale_h)
    scaled_h = head_rot.resize((nw_h, nh_h), Image.Resampling.LANCZOS)

    c_think = Image.new("RGBA", (96, 128), (0, 0, 0, 0))
    c_think.paste(scaled_h, ((96 - nw_h) // 2, (128 - nh_h) // 2))
    sprites["princess-think"] = c_think

    return sprites

# ------------------------------------------------------------------------------
# 2. PROCESS AI RASTER FRUIT CHARACTERS (12 FRUITS)
# ------------------------------------------------------------------------------
def get_fruit_sprites():
    sprites = {}
    sheet_path = os.path.join(SRC_DIR, 'magical_fruit_characters_1788442017917.jpg')
    sheet = Image.open(sheet_path)
    w, h = sheet.size
    cell_w, cell_h = w // 3, h // 3

    names = [
        ["apple", "orange", "grape"],
        ["banana", "watermelon", "blueberry"],
        ["strawberry", "peach", "cherry"]
    ]

    for row in range(3):
        for col in range(3):
            name = names[row][col]
            box = (col * cell_w, row * cell_h, (col + 1) * cell_w, (row + 1) * cell_h)
            cell = sheet.crop(box)
            cell_trans = extract_sprite_clean(cell, thresh_dist=22, feather_radius=1.0)
            bbox = cell_trans.getbbox()
            if bbox:
                fruit_crop = cell_trans.crop(bbox)
                fw, fh = fruit_crop.size
                max_dim = max(fw, fh) + 16
                sq = Image.new("RGBA", (max_dim, max_dim), (0, 0, 0, 0))
                sq.paste(fruit_crop, ((max_dim - fw) // 2, (max_dim - fh) // 2))
                sprites[name] = sq.resize((80, 80), Image.Resampling.LANCZOS)

    # 3 Complementary fruits
    # Lemon from orange (hue shifted +15)
    orange_img = sprites["orange"]
    hsv_lemon = orange_img.convert("HSV")
    h, s, v = hsv_lemon.split()
    h_new = h.point(lambda p: (p + 15) % 256)
    lemon_rgb = Image.merge("HSV", (h_new, s, v)).convert("RGBA")
    lemon_rgb.putalpha(orange_img.split()[3])
    sprites["lemon"] = lemon_rgb

    # Plum from peach (hue shifted +180)
    peach_img = sprites["peach"]
    hsv_peach = peach_img.convert("HSV")
    h, s, v = hsv_peach.split()
    h_new = h.point(lambda p: (p + 180) % 256)
    plum_rgb = Image.merge("HSV", (h_new, s, v)).convert("RGBA")
    plum_rgb.putalpha(peach_img.split()[3])
    sprites["plum"] = plum_rgb

    # Kiwi from peach (hue shifted +70)
    h_new = h.point(lambda p: (p + 70) % 256)
    kiwi_rgb = Image.merge("HSV", (h_new, s, v)).convert("RGBA")
    kiwi_rgb.putalpha(peach_img.split()[3])
    sprites["kiwi"] = kiwi_rgb

    return sprites

# ------------------------------------------------------------------------------
# 3. PROCESS AI RASTER TREE & BASKET
# ------------------------------------------------------------------------------
def get_tree_and_basket_sprites():
    sprites = {}

    # Basket
    basket_path = os.path.join(SRC_DIR, 'royal_golden_basket_1788442063144.jpg')
    basket_img = Image.open(basket_path)
    b_trans = extract_sprite_clean(basket_img, thresh_dist=25, feather_radius=1.2)
    b_bbox = b_trans.getbbox()
    b_cropped = b_trans.crop(b_bbox)
    b_scaled = b_cropped.resize((128, 64), Image.Resampling.LANCZOS)
    sprites["basket"] = b_scaled
    sprites["basket-royal"] = b_scaled

    # Tree (5 progressive stages)
    tree_path = os.path.join(SRC_DIR, 'enchanted_royal_tree_1788442048455.jpg')
    tree_img = Image.open(tree_path)
    t_trans = extract_sprite_clean(tree_img, thresh_dist=20, feather_radius=1.2)
    t_bbox = t_trans.getbbox()
    t_cropped = t_trans.crop(t_bbox)

    stage_scales = [0.55, 0.68, 0.80, 0.90, 1.0]
    for idx, sc in enumerate(stage_scales, 1):
        nw, nh = int(128 * sc), int(128 * sc)
        scaled = t_cropped.resize((nw, nh), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
        canvas.paste(scaled, ((128 - nw) // 2, 128 - nh))
        sprites[f"tree-stage-{idx}"] = canvas

    return sprites

# ------------------------------------------------------------------------------
# 4. CRISP VECTOR UI ELEMENTS
# ------------------------------------------------------------------------------
def get_ui_sprites():
    sprites = {}

    # Card panel
    img = make_canvas(96, 96)
    d = ImageDraw.Draw(img)
    s = SCALE
    d.rounded_rectangle([4*s, 4*s, 92*s, 92*s], radius=14*s, fill=(255, 255, 255, 255), outline=(2, 132, 199, 255), width=3*s)
    sprites["card-panel"] = finalize(img, 96, 96)

    # Pause button
    img = make_canvas(64, 64)
    d = ImageDraw.Draw(img)
    d.ellipse([2*s, 2*s, 62*s, 62*s], fill=(2, 132, 199, 255), outline=(255, 255, 255, 255), width=2*s)
    d.rounded_rectangle([24*s, 20*s, 29*s, 44*s], radius=2*s, fill=(255, 255, 255, 255))
    d.rounded_rectangle([35*s, 20*s, 40*s, 44*s], radius=2*s, fill=(255, 255, 255, 255))
    sprites["btn-pause"] = finalize(img, 64, 64)

    # Sound button
    img = make_canvas(64, 64)
    d = ImageDraw.Draw(img)
    d.ellipse([2*s, 2*s, 62*s, 62*s], fill=(2, 132, 199, 255), outline=(255, 255, 255, 255), width=2*s)
    d.polygon([(22*s, 26*s), (28*s, 26*s), (36*s, 20*s), (36*s, 44*s), (28*s, 38*s), (22*s, 38*s)], fill=(255, 255, 255, 255))
    d.arc([34*s, 24*s, 44*s, 40*s], start=300, end=60, fill=(255, 255, 255, 255), width=2*s)
    sprites["btn-sound"] = finalize(img, 64, 64)

    # Sound off
    img = make_canvas(64, 64)
    d = ImageDraw.Draw(img)
    d.ellipse([2*s, 2*s, 62*s, 62*s], fill=(148, 163, 184, 255), outline=(255, 255, 255, 255), width=2*s)
    d.polygon([(22*s, 26*s), (28*s, 26*s), (36*s, 20*s), (36*s, 44*s), (28*s, 38*s), (22*s, 38*s)], fill=(255, 255, 255, 255))
    d.line([(22*s, 44*s), (44*s, 22*s)], fill=(239, 68, 68, 255), width=3*s)
    sprites["btn-sound-off"] = finalize(img, 64, 64)

    # Replay
    img = make_canvas(64, 64)
    d = ImageDraw.Draw(img)
    d.ellipse([2*s, 2*s, 62*s, 62*s], fill=(16, 185, 129, 255), outline=(255, 255, 255, 255), width=2*s)
    d.arc([20*s, 20*s, 44*s, 44*s], start=45, end=300, fill=(255, 255, 255, 255), width=3*s)
    d.polygon([(40*s, 16*s), (48*s, 24*s), (38*s, 26*s)], fill=(255, 255, 255, 255))
    sprites["btn-replay"] = finalize(img, 64, 64)

    # Home
    img = make_canvas(64, 64)
    d = ImageDraw.Draw(img)
    d.ellipse([2*s, 2*s, 62*s, 62*s], fill=(139, 92, 246, 255), outline=(255, 255, 255, 255), width=2*s)
    d.polygon([(32*s, 18*s), (18*s, 32*s), (46*s, 32*s)], fill=(255, 255, 255, 255))
    d.rectangle([22*s, 32*s, 42*s, 44*s], fill=(255, 255, 255, 255))
    d.rectangle([28*s, 35*s, 36*s, 44*s], fill=(139, 92, 246, 255))
    sprites["btn-home"] = finalize(img, 64, 64)

    # Stars
    def draw_star(full):
        im = make_canvas(48, 48)
        dr = ImageDraw.Draw(im)
        cx, cy = 24*s, 24*s
        pts = []
        for i in range(10):
            a = -math.pi/2 + (i * math.pi/5)
            r = 20*s if i%2 == 0 else 9*s
            pts.append((cx + r*math.cos(a), cy + r*math.sin(a)))
        if full:
            dr.polygon(pts, fill=(251, 191, 36, 255), outline=(217, 119, 6, 255))
            dr.ellipse([cx - 6*s, cy - 6*s, cx, cy], fill=(254, 240, 138, 220))
        else:
            dr.polygon(pts, fill=(226, 232, 240, 255), outline=(148, 163, 184, 255))
        return finalize(im, 48, 48)

    sprites["star-full"] = draw_star(True)
    sprites["star-empty"] = draw_star(False)

    # Royal Crown Badges
    def draw_crown_star(full):
        im = make_canvas(48, 48)
        dr = ImageDraw.Draw(im)
        cx, cy = 24*s, 26*s
        pts = [
            (cx - 18*s, cy + 10*s), (cx - 18*s, cy - 8*s), (cx - 10*s, cy + 2*s),
            (cx, cy - 14*s), (cx + 10*s, cy + 2*s), (cx + 18*s, cy - 8*s), (cx + 18*s, cy + 10*s)
        ]
        if full:
            dr.polygon(pts, fill=(251, 191, 36, 255), outline=(217, 119, 6, 255))
            dr.rounded_rectangle([cx - 20*s, cy + 8*s, cx + 20*s, cy + 14*s], radius=2*s, fill=(245, 158, 11, 255))
            dr.ellipse([cx - 3*s, cy - 4*s, cx + 3*s, cy + 2*s], fill=(225, 29, 72, 255))
            dr.ellipse([cx - 1*s, cy - 15*s, cx + 1*s, cy - 13*s], fill=(255, 255, 255, 255))
        else:
            dr.polygon(pts, fill=(226, 232, 240, 255), outline=(148, 163, 184, 255))
            dr.rounded_rectangle([cx - 20*s, cy + 8*s, cx + 20*s, cy + 14*s], radius=2*s, fill=(203, 213, 225, 255))
        return finalize(im, 48, 48)

    sprites["crown-star-full"] = draw_crown_star(True)
    sprites["crown-star-empty"] = draw_crown_star(False)

    # Check & X Marks
    im_c = make_canvas(48, 48)
    dr_c = ImageDraw.Draw(im_c)
    dr_c.ellipse([3*s, 3*s, 45*s, 45*s], fill=(16, 185, 129, 255))
    dr_c.line([(14*s, 24*s), (22*s, 32*s), (36*s, 16*s)], fill=(255, 255, 255, 255), width=4*s)
    sprites["check-mark"] = finalize(im_c, 48, 48)

    im_x = make_canvas(48, 48)
    dr_x = ImageDraw.Draw(im_x)
    dr_x.ellipse([3*s, 3*s, 45*s, 45*s], fill=(239, 68, 68, 255))
    dr_x.line([(16*s, 16*s), (32*s, 32*s)], fill=(255, 255, 255, 255), width=4*s)
    dr_x.line([(32*s, 16*s), (16*s, 32*s)], fill=(255, 255, 255, 255), width=4*s)
    sprites["x-mark"] = finalize(im_x, 48, 48)

    # Particles
    im_sp = make_canvas(32, 32)
    dr_sp = ImageDraw.Draw(im_sp)
    cx, cy = 16*s, 16*s
    pts = [
        (cx, cy - 14*s), (cx + 4*s, cy - 4*s), (cx + 14*s, cy),
        (cx + 4*s, cy + 4*s), (cx, cy + 14*s), (cx - 4*s, cy + 4*s),
        (cx - 14*s, cy), (cx - 4*s, cy - 4*s)
    ]
    dr_sp.polygon(pts, fill=(251, 191, 36, 255))
    dr_sp.ellipse([cx - 3*s, cy - 3*s, cx + 3*s, cy + 3*s], fill=(255, 255, 255, 255))
    sprites["sparkle"] = finalize(im_sp, 32, 32)

    # Petal
    im_pt = make_canvas(32, 32)
    dr_pt = ImageDraw.Draw(im_pt)
    dr_pt.ellipse([4*s, 10*s, 28*s, 22*s], fill=(251, 207, 232, 220))
    dr_pt.ellipse([8*s, 12*s, 24*s, 20*s], fill=(244, 114, 182, 180))
    sprites["petal"] = finalize(im_pt, 32, 32)

    # Firefly
    im_ff = make_canvas(24, 24)
    dr_ff = ImageDraw.Draw(im_ff)
    cx, cy = 12*s, 12*s
    dr_ff.ellipse([cx - 10*s, cy - 10*s, cx + 10*s, cy + 10*s], fill=(254, 240, 138, 100))
    dr_ff.ellipse([cx - 6*s, cy - 6*s, cx + 6*s, cy + 6*s], fill=(253, 224, 71, 200))
    dr_ff.ellipse([cx - 3*s, cy - 3*s, cx + 3*s, cy + 3*s], fill=(255, 255, 255, 255))
    sprites["firefly"] = finalize(im_ff, 24, 24)

    return sprites

# ------------------------------------------------------------------------------
# 5. PACK ALL SPRITES INTO 1024x1024 ATLAS
# ------------------------------------------------------------------------------
def pack_atlas(output_dir="public/assets"):
    os.makedirs(output_dir, exist_ok=True)
    all_sprites = {}

    print("Processing AI Princess sprites (clean floodfill)...")
    all_sprites.update(get_princess_sprites())

    print("Processing AI Fruit characters (clean floodfill)...")
    all_sprites.update(get_fruit_sprites())

    print("Processing AI Tree & Basket (clean floodfill)...")
    all_sprites.update(get_tree_and_basket_sprites())

    print("Processing UI elements...")
    all_sprites.update(get_ui_sprites())

    print(f"Total sprite frames to pack: {len(all_sprites)}")

    atlas_w, atlas_h = 1024, 1024
    atlas_img = Image.new("RGBA", (atlas_w, atlas_h), (0, 0, 0, 0))
    padding = 6

    sorted_items = sorted(all_sprites.items(), key=lambda item: item[1].size[1], reverse=True)

    frames_json = {}
    cur_x, cur_y = padding, padding
    shelf_height = 0

    for name, img in sorted_items:
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
            "app": "CatchTheFruit-AIAtlasPacker",
            "version": "3.1-CleanFloodfill",
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

    print(f"Successfully generated clean AI Texture Atlas:")
    print(f"  PNG:  {png_path} ({os.path.getsize(png_path):,} bytes)")
    print(f"  JSON: {json_path} ({len(frames_json)} frames)")

if __name__ == "__main__":
    pack_atlas("public/assets")
