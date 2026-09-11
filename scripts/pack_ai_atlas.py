#!/usr/bin/env python3
"""
scripts/pack_ai_atlas.py - Master 16-Bit Retro Pixel Art Pipeline & Atlas Packer
Enforces locked 16-color palette quantization, clean 1-bit alpha borders,
--anim-lock ground-plane locking, and power-of-two texture atlas packing.
"""

import os
import json
import math
from collections import deque
import numpy as np
from PIL import Image, ImageDraw

SRC_DIR = '/home/gallabot/.gemini/antigravity/brain/ec582232-567f-4225-b8f1-d6ff7b3cefb8'

LOCKED_PALETTE_HEX = [
    "#071b2e",  # 0: Night Navy Backdrop / Outline ink / Darkest shadow
    "#0f172a",  # 1: Slate Text Dark / Deep clothing creases
    "#0369a1",  # 2: Deep Ocean Border / Dungarees base shadow
    "#0284c7",  # 3: Arcade Sky Blue / Primary UI / Phonics badge
    "#38bdf8",  # 4: Sunny Canvas Sky / Blueberry highlight / Denim cuffs
    "#15803d",  # 5: Success Emerald Dark / Tree foliage shadow / Watermelon rind
    "#16a34a",  # 6: Success Emerald / Leaf midtone / Play action green
    "#84cc16",  # 7: Retro Kiwi Lime / Bright leaf highlight / Foliage apex
    "#d97706",  # 8: Morphology Amber / Wicker basket / Wood trunk / Orange shadow
    "#f59e0b",  # 9: Warm Gold / Stars / Coin / Banana midtone / Penelope crown
    "#facc15",  # 10: Sunlight Yellow / Lemon / Sparkle / Star highlight
    "#f43f5e",  # 11: Fruit Crimson / Apple / Strawberry / Penelope sneakers
    "#fb7185",  # 12: Peach Pink / Cheek blush / Watermelon sweet flesh
    "#7c3aed",  # 13: Vocabulary Violet / Grape / Plum / Shop button
    "#94a3b8",  # 14: Slate Stroke Muted / Neutral border / Lock metal
    "#ffffff",  # 15: Modal Pure White / Eye sparkles / Sneaker toe caps / Hotspots
]

PALETTE_RGB = np.array([
    [7, 27, 46],
    [15, 23, 42],
    [3, 105, 161],
    [2, 132, 199],
    [56, 189, 248],
    [21, 128, 61],
    [22, 163, 74],
    [132, 204, 22],
    [217, 119, 6],
    [245, 158, 11],
    [250, 204, 21],
    [244, 63, 94],
    [251, 113, 133],
    [124, 58, 237],
    [148, 163, 184],
    [255, 255, 255]
], dtype=np.uint8)

def quantize_image_nearest(img, alpha_threshold=128):
    """
    Quantizes an RGBA PIL image to the 16-color locked palette using nearest Euclidean distance.
    Enforces clean 1-bit alpha: alpha >= threshold -> 255, else (0,0,0,0).
    """
    arr = np.array(img.convert("RGBA"))
    alpha = arr[:, :, 3]
    mask = alpha >= alpha_threshold

    out_arr = np.zeros_like(arr)
    if np.any(mask):
        pixels = arr[mask, :3].astype(np.float32)
        pal = PALETTE_RGB.astype(np.float32)
        diff = pixels[:, np.newaxis, :] - pal[np.newaxis, :, :]
        dist_sq = np.sum(diff ** 2, axis=-1)
        nearest_idx = np.argmin(dist_sq, axis=-1)
        out_arr[mask, :3] = PALETTE_RGB[nearest_idx]
        out_arr[mask, 3] = 255

    return Image.fromarray(out_arr, mode="RGBA")

def despeckle_edges(img):
    """Removes isolated 1-pixel noise without orthogonal neighbors."""
    arr = np.array(img.convert("RGBA"))
    alpha = (arr[:, :, 3] > 0).astype(np.uint8)
    h, w = alpha.shape
    padded = np.pad(alpha, 1, mode="constant", constant_values=0)
    neighbors = (
        padded[:-2, 1:-1]
        + padded[2:, 1:-1]
        + padded[1:-1, :-2]
        + padded[1:-1, 2:]
    )
    isolated = (alpha == 1) & (neighbors == 0)
    arr[isolated] = [0, 0, 0, 0]
    return Image.fromarray(arr, mode="RGBA")

def extract_sprite_clean(img, thresh_dist=28):
    """
    Extracts foreground sprite using connected border floodfill to preserve all interior whites,
    enforcing clean 1-bit alpha (0 or 255).
    """
    img_rgb = img.convert("RGB")
    w, h = img_rgb.size

    arr = np.array(img_rgb, dtype=np.int16)
    diff = 255 - arr
    max_diff = np.max(diff, axis=2)

    bg_candidates = (max_diff <= thresh_dist)

    visited = np.zeros((h, w), dtype=bool)
    queue = deque()

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

    while queue:
        cy, cx = queue.popleft()
        for ny, nx in [(cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)]:
            if 0 <= ny < h and 0 <= nx < w:
                if not visited[ny, nx] and bg_candidates[ny, nx]:
                    visited[ny, nx] = True
                    queue.append((ny, nx))

    fg_mask_arr = np.where(visited, 0, 255).astype(np.uint8)
    rgba = img_rgb.convert("RGBA")
    rgba.putalpha(Image.fromarray(fg_mask_arr, mode="L"))
    return rgba

def clean_character_foot_shadow(rgba_img):
    """
    Eliminates character foot drop shadow residue by detecting where the sneaker soles end
    and zeroing out the neutral floor shadow beneath the shoes.
    """
    arr = np.array(rgba_img)
    alpha = arr[:, :, 3]
    h, w = alpha.shape

    opaque_rows = np.where(np.any(alpha > 0, axis=1))[0]
    if len(opaque_rows) == 0:
        return rgba_img

    bottom_y = opaque_rows[-1]

    # Check bottom rows upwards for gray floor shadow residue
    for y in range(bottom_y, max(0, bottom_y - 40), -1):
        row_alpha = alpha[y]
        opaque_cols = np.where(row_alpha > 0)[0]
        if len(opaque_cols) == 0:
            continue
        row_pixels = arr[y, opaque_cols, :3]
        # Red sneakers: R > 140 and R - G > 35
        is_red = (row_pixels[:, 0] > 140) & ((row_pixels[:, 0].astype(int) - row_pixels[:, 1].astype(int)) > 35)
        # White toe caps / sneaker soles: R > 220, G > 220, B > 220
        is_white_sole = (row_pixels[:, 0] > 220) & (row_pixels[:, 1] > 220) & (row_pixels[:, 2] > 220)

        # Once we find strong sneaker sole pixels, stop pruning
        if np.sum(is_red) >= 4 or np.sum(is_white_sole) >= 4:
            break

        # Prune shadow row
        arr[y, :, 3] = 0
        arr[y, :, :3] = 0

    return Image.fromarray(arr, mode="RGBA")

# ------------------------------------------------------------------------------
# 1. PROCESS AI RASTER PRINCESS PENELOPE (--anim-lock logic)
# ------------------------------------------------------------------------------
def get_princess_sprites():
    sprites = {}

    char_path = os.path.join(SRC_DIR, 'princess_penelope_character_1788441979685.jpg')
    char_img = Image.open(char_path)
    char_clean = clean_character_foot_shadow(extract_sprite_clean(char_img, thresh_dist=28))
    c_bbox = char_clean.getbbox()
    c_crop = char_clean.crop(c_bbox)
    cw, ch = c_crop.size

    celeb_path = os.path.join(SRC_DIR, 'princess_penelope_celebrating_1788442003907.jpg')
    celeb_img = Image.open(celeb_path)
    celeb_clean = clean_character_foot_shadow(extract_sprite_clean(celeb_img, thresh_dist=28))
    cb_bbox = celeb_clean.getbbox()
    cb_crop = celeb_clean.crop(cb_bbox)
    cw2, ch2 = cb_crop.size

    # --anim-lock: Single union envelope across standing and celebrating keyframes
    union_w = max(cw, cw2)
    union_h = max(ch, ch2)
    scale = min(96 * 0.90 / union_w, 128 * 0.90 / union_h)

    nw1, nh1 = int(round(cw * scale)), int(round(ch * scale))
    scaled1 = c_crop.resize((nw1, nh1), Image.Resampling.NEAREST)

    nw2, nh2 = int(round(cw2 * scale)), int(round(ch2 * scale))
    scaled2 = cb_crop.resize((nw2, nh2), Image.Resampling.NEAREST)

    # Ground baseline locked so feet touch identical Y coordinate
    ground_y = 128 - 4
    offset_y1 = ground_y - nh1
    offset_y2 = ground_y - nh2
    offset_x1 = (96 - nw1) // 2
    offset_x2 = (96 - nw2) // 2

    # 1. princess-idle-1
    c1 = Image.new("RGBA", (96, 128), (0, 0, 0, 0))
    c1.paste(scaled1, (offset_x1, offset_y1))
    sprites["princess-idle-1"] = despeckle_edges(quantize_image_nearest(c1))

    # 2. princess-idle-2 (Breathing frame - subtle vertical chest rise while feet remain locked)
    c2 = Image.new("RGBA", (96, 128), (0, 0, 0, 0))
    c2.paste(scaled1, (offset_x1, offset_y1 - 2))
    sprites["princess-idle-2"] = despeckle_edges(quantize_image_nearest(c2))

    # 3. princess-catch
    c_catch = Image.new("RGBA", (96, 128), (0, 0, 0, 0))
    c_catch.paste(scaled2, (offset_x2, offset_y2))
    sprites["princess-catch"] = despeckle_edges(quantize_image_nearest(c_catch))

    # 4. princess-think (Upper body with head tilt)
    head_crop = c_crop.crop((int(cw * 0.1), 0, int(cw * 0.9), int(ch * 0.75)))
    hw, hh = head_crop.size
    scale_h = min(96 * 0.88 / hw, 128 * 0.88 / hh)
    nw_h, nh_h = int(round(hw * scale_h)), int(round(hh * scale_h))
    scaled_h = head_crop.resize((nw_h, nh_h), Image.Resampling.NEAREST)

    c_think = Image.new("RGBA", (96, 128), (0, 0, 0, 0))
    c_think.paste(scaled_h, ((96 - nw_h) // 2, (128 - nh_h) // 2))
    sprites["princess-think"] = despeckle_edges(quantize_image_nearest(c_think))

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
            cell_clean = extract_sprite_clean(cell, thresh_dist=24)
            bbox = cell_clean.getbbox()
            if bbox:
                fruit_crop = cell_clean.crop(bbox)
                fw, fh = fruit_crop.size
                scale = min(68 / fw, 68 / fh)
                nw, nh = max(48, int(round(fw * scale))), max(48, int(round(fh * scale)))
                resized = fruit_crop.resize((nw, nh), Image.Resampling.NEAREST)
                canvas = Image.new("RGBA", (80, 80), (0, 0, 0, 0))
                canvas.paste(resized, ((80 - nw) // 2, (80 - nh) // 2))
                sprites[name] = despeckle_edges(quantize_image_nearest(canvas))

    # 3 Complementary fruits
    # Lemon from orange (bright yellow shift)
    orange_arr = np.array(sprites["orange"])
    lemon_arr = orange_arr.copy()
    # Snap warm orange to sunlight yellow (#facc15 -> [250, 204, 21])
    is_orange = (lemon_arr[:, :, 0] > 200) & (lemon_arr[:, :, 1] < 180) & (lemon_arr[:, :, 3] > 0)
    lemon_arr[is_orange, 0] = 250
    lemon_arr[is_orange, 1] = 204
    lemon_arr[is_orange, 2] = 21
    sprites["lemon"] = quantize_image_nearest(Image.fromarray(lemon_arr, mode="RGBA"))

    # Plum from peach (deep violet shift #7c3aed -> [124, 58, 237])
    peach_arr = np.array(sprites["peach"])
    plum_arr = peach_arr.copy()
    is_peach = (plum_arr[:, :, 3] > 0) & (plum_arr[:, :, 0] > 150)
    plum_arr[is_peach, 0] = 124
    plum_arr[is_peach, 1] = 58
    plum_arr[is_peach, 2] = 237
    sprites["plum"] = quantize_image_nearest(Image.fromarray(plum_arr, mode="RGBA"))

    # Kiwi from peach (retro kiwi lime #84cc16 -> [132, 204, 22] and emerald)
    kiwi_arr = peach_arr.copy()
    is_flesh = (kiwi_arr[:, :, 3] > 0) & (kiwi_arr[:, :, 0] > 150)
    kiwi_arr[is_flesh, 0] = 132
    kiwi_arr[is_flesh, 1] = 204
    kiwi_arr[is_flesh, 2] = 22
    sprites["kiwi"] = quantize_image_nearest(Image.fromarray(kiwi_arr, mode="RGBA"))

    return sprites

# ------------------------------------------------------------------------------
# 3. PROCESS AI RASTER TREE & BASKET
# ------------------------------------------------------------------------------
def get_tree_and_basket_sprites():
    sprites = {}

    # Basket (128x64)
    basket_path = os.path.join(SRC_DIR, 'royal_golden_basket_1788442063144.jpg')
    basket_img = Image.open(basket_path)
    b_clean = extract_sprite_clean(basket_img, thresh_dist=26)
    b_bbox = b_clean.getbbox()
    b_crop = b_clean.crop(b_bbox)
    bw, bh = b_crop.size
    scale = min(120 / bw, 58 / bh)
    nw, nh = int(round(bw * scale)), int(round(bh * scale))
    resized = b_crop.resize((nw, nh), Image.Resampling.NEAREST)
    canvas = Image.new("RGBA", (128, 64), (0, 0, 0, 0))
    canvas.paste(resized, ((128 - nw) // 2, 64 - nh - 2))
    quant_basket = despeckle_edges(quantize_image_nearest(canvas))
    sprites["basket"] = quant_basket
    sprites["basket-royal"] = quant_basket

    # Tree (5 progressive stages - 128x128, bottom ground anchor)
    tree_path = os.path.join(SRC_DIR, 'enchanted_royal_tree_1788442048455.jpg')
    tree_img = Image.open(tree_path)
    t_clean = extract_sprite_clean(tree_img, thresh_dist=22)
    t_bbox = t_clean.getbbox()
    t_crop = t_clean.crop(t_bbox)
    tw, th = t_crop.size

    stage_scales = [0.52, 0.65, 0.78, 0.90, 1.0]
    for idx, sc in enumerate(stage_scales, 1):
        target_max_w = int(120 * sc)
        target_max_h = int(120 * sc)
        scale_t = min(target_max_w / tw, target_max_h / th)
        nw, nh = int(round(tw * scale_t)), int(round(th * scale_t))
        scaled = t_crop.resize((nw, nh), Image.Resampling.NEAREST)
        canvas_t = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
        # Ground anchor trunk base
        canvas_t.paste(scaled, ((128 - nw) // 2, 128 - nh - 4))
        sprites[f"tree-stage-{idx}"] = despeckle_edges(quantize_image_nearest(canvas_t))

    return sprites

# ------------------------------------------------------------------------------
# 4. CRISP RETRO UI SPRITES
# ------------------------------------------------------------------------------
def make_canvas(w, h):
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))

def get_ui_sprites():
    sprites = {}

    # Card panel (96x96): White background, 3px sky blue border
    img = make_canvas(96, 96)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([2, 2, 93, 93], radius=14, fill=(255, 255, 255, 255), outline=(2, 132, 199, 255), width=3)
    sprites["card-panel"] = quantize_image_nearest(img)

    # Pause button (64x64): Blue circle, two white vertical bars
    img = make_canvas(64, 64)
    d = ImageDraw.Draw(img)
    d.ellipse([2, 2, 61, 61], fill=(2, 132, 199, 255), outline=(255, 255, 255, 255), width=2)
    d.rounded_rectangle([24, 20, 29, 44], radius=2, fill=(255, 255, 255, 255))
    d.rounded_rectangle([35, 20, 40, 44], radius=2, fill=(255, 255, 255, 255))
    sprites["btn-pause"] = quantize_image_nearest(img)

    # Sound button (64x64): Blue circle, speaker cone
    img = make_canvas(64, 64)
    d = ImageDraw.Draw(img)
    d.ellipse([2, 2, 61, 61], fill=(2, 132, 199, 255), outline=(255, 255, 255, 255), width=2)
    d.polygon([(22, 26), (28, 26), (36, 20), (36, 44), (28, 38), (22, 38)], fill=(255, 255, 255, 255))
    d.arc([34, 24, 44, 40], start=300, end=60, fill=(255, 255, 255, 255), width=2)
    sprites["btn-sound"] = quantize_image_nearest(img)

    # Sound off (64x64): Slate circle, speaker cone with crimson strikeout
    img = make_canvas(64, 64)
    d = ImageDraw.Draw(img)
    d.ellipse([2, 2, 61, 61], fill=(148, 163, 184, 255), outline=(255, 255, 255, 255), width=2)
    d.polygon([(22, 26), (28, 26), (36, 20), (36, 44), (28, 38), (22, 38)], fill=(255, 255, 255, 255))
    d.line([(22, 44), (44, 22)], fill=(244, 63, 94, 255), width=3)
    sprites["btn-sound-off"] = quantize_image_nearest(img)

    # Replay button (64x64): Emerald circle, white circular arrow
    img = make_canvas(64, 64)
    d = ImageDraw.Draw(img)
    d.ellipse([2, 2, 61, 61], fill=(22, 163, 74, 255), outline=(255, 255, 255, 255), width=2)
    d.arc([20, 20, 44, 44], start=45, end=300, fill=(255, 255, 255, 255), width=3)
    d.polygon([(40, 16), (48, 24), (38, 26)], fill=(255, 255, 255, 255))
    sprites["btn-replay"] = quantize_image_nearest(img)

    # Home button (64x64): Violet circle, white castle roof & door
    img = make_canvas(64, 64)
    d = ImageDraw.Draw(img)
    d.ellipse([2, 2, 61, 61], fill=(124, 58, 237, 255), outline=(255, 255, 255, 255), width=2)
    d.polygon([(32, 18), (18, 32), (46, 32)], fill=(255, 255, 255, 255))
    d.rectangle([22, 32, 42, 44], fill=(255, 255, 255, 255))
    d.rectangle([28, 35, 36, 44], fill=(124, 58, 237, 255))
    sprites["btn-home"] = quantize_image_nearest(img)

    # Stars (48x48)
    def draw_star(full):
        im = make_canvas(48, 48)
        dr = ImageDraw.Draw(im)
        cx, cy = 24, 24
        pts = []
        for i in range(10):
            a = -math.pi / 2 + (i * math.pi / 5)
            r = 19 if i % 2 == 0 else 8
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
        if full:
            dr.polygon(pts, fill=(245, 158, 11, 255), outline=(217, 119, 6, 255))
            dr.ellipse([cx - 5, cy - 5, cx, cy], fill=(250, 204, 21, 255))
        else:
            dr.polygon(pts, fill=(15, 23, 42, 40), outline=(148, 163, 184, 255))
        return quantize_image_nearest(im)

    sprites["star-full"] = draw_star(True)
    sprites["star-empty"] = draw_star(False)

    # Royal Crown Badges (48x48)
    def draw_crown_star(full):
        im = make_canvas(48, 48)
        dr = ImageDraw.Draw(im)
        cx, cy = 24, 26
        pts = [
            (cx - 18, cy + 10), (cx - 18, cy - 8), (cx - 10, cy + 2),
            (cx, cy - 14), (cx + 10, cy + 2), (cx + 18, cy - 8), (cx + 18, cy + 10)
        ]
        if full:
            dr.polygon(pts, fill=(245, 158, 11, 255), outline=(217, 119, 6, 255))
            dr.rounded_rectangle([cx - 20, cy + 8, cx + 20, cy + 14], radius=2, fill=(217, 119, 6, 255))
            dr.ellipse([cx - 3, cy - 4, cx + 3, cy + 2], fill=(244, 63, 94, 255))
            dr.ellipse([cx - 1, cy - 15, cx + 1, cy - 13], fill=(255, 255, 255, 255))
        else:
            dr.polygon(pts, fill=(15, 23, 42, 40), outline=(148, 163, 184, 255))
            dr.rounded_rectangle([cx - 20, cy + 8, cx + 20, cy + 14], radius=2, fill=(148, 163, 184, 255))
        return quantize_image_nearest(im)

    sprites["crown-star-full"] = draw_crown_star(True)
    sprites["crown-star-empty"] = draw_crown_star(False)

    # Check & X Marks (48x48)
    im_c = make_canvas(48, 48)
    dr_c = ImageDraw.Draw(im_c)
    dr_c.ellipse([3, 3, 44, 44], fill=(22, 163, 74, 255))
    dr_c.line([(14, 24), (22, 32), (34, 16)], fill=(255, 255, 255, 255), width=4)
    sprites["check-mark"] = quantize_image_nearest(im_c)

    im_x = make_canvas(48, 48)
    dr_x = ImageDraw.Draw(im_x)
    dr_x.ellipse([3, 3, 44, 44], fill=(244, 63, 94, 255))
    dr_x.line([(16, 16), (32, 32)], fill=(255, 255, 255, 255), width=4)
    dr_x.line([(32, 16), (16, 32)], fill=(255, 255, 255, 255), width=4)
    sprites["x-mark"] = quantize_image_nearest(im_x)

    # Lock icon (48x48): 16-bit retro golden padlock with iron shackle and keyhole
    im_lock = make_canvas(48, 48)
    dr_lock = ImageDraw.Draw(im_lock)
    dr_lock.arc([15, 6, 33, 24], start=180, end=0, fill=(148, 163, 184, 255), width=4)
    dr_lock.line([(15, 15), (15, 22)], fill=(148, 163, 184, 255), width=4)
    dr_lock.line([(33, 15), (33, 22)], fill=(148, 163, 184, 255), width=4)
    dr_lock.rounded_rectangle([10, 20, 38, 42], radius=4, fill=(245, 158, 11, 255), outline=(217, 119, 6, 255), width=2)
    dr_lock.line([(12, 22), (20, 22)], fill=(250, 204, 21, 255), width=2)
    dr_lock.ellipse([22, 26, 26, 30], fill=(7, 27, 46, 255))
    dr_lock.polygon([(23, 29), (25, 29), (26, 36), (22, 36)], fill=(7, 27, 46, 255))
    sprites["lock"] = quantize_image_nearest(im_lock)

    # Particles
    im_sp = make_canvas(32, 32)
    dr_sp = ImageDraw.Draw(im_sp)
    cx, cy = 16, 16
    pts = [
        (cx, cy - 14), (cx + 4, cy - 4), (cx + 14, cy),
        (cx + 4, cy + 4), (cx, cy + 14), (cx - 4, cy + 4),
        (cx - 14, cy), (cx - 4, cy - 4)
    ]
    dr_sp.polygon(pts, fill=(250, 204, 21, 255))
    dr_sp.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=(255, 255, 255, 255))
    sprites["sparkle"] = quantize_image_nearest(im_sp)

    # Petal
    im_pt = make_canvas(32, 32)
    dr_pt = ImageDraw.Draw(im_pt)
    dr_pt.ellipse([4, 10, 28, 22], fill=(251, 113, 133, 255))
    dr_pt.ellipse([8, 12, 24, 20], fill=(244, 63, 94, 255))
    sprites["petal"] = quantize_image_nearest(im_pt)

    # Firefly
    im_ff = make_canvas(24, 24)
    dr_ff = ImageDraw.Draw(im_ff)
    cx, cy = 12, 12
    dr_ff.ellipse([cx - 10, cy - 10, cx + 10, cy + 10], fill=(250, 204, 21, 120))
    dr_ff.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=(250, 204, 21, 200))
    dr_ff.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=(255, 255, 255, 255))
    sprites["firefly"] = quantize_image_nearest(im_ff)

    return sprites

# ------------------------------------------------------------------------------
# 5. PROCESS CASTLE DECORATIONS & FURNITURE (AI RASTER)
# ------------------------------------------------------------------------------
def get_decorations_sprites():
    sprites = {}
    sheet_path = os.path.join(SRC_DIR, 'castle_decorations_sheet_1788453895482.jpg')
    if not os.path.exists(sheet_path):
        print(f"Warning: {sheet_path} not found, skipping decoration extraction")
        return sprites

    sheet_img = Image.open(sheet_path)
    sheet_clean = extract_sprite_clean(sheet_img, thresh_dist=24)

    items = {
        'decor-fountain': (35, 33, 285, 324),
        'decor-topiary': (342, 18, 480, 329),
        'decor-banners': (507, 43, 828, 314),
        'decor-lantern': (826, 28, 991, 319),
        'decor-couch': (748, 335, 988, 501),
        'decor-peacock': (23, 361, 267, 635),
        'decor-swing': (269, 369, 529, 665),
        'decor-throne': (557, 332, 709, 558),
        'decor-chaise': (533, 554, 802, 745),
        'decor-mirror': (822, 509, 993, 757),
        'decor-teatable': (42, 764, 233, 967),
        'decor-bookshelf': (294, 692, 514, 976),
        'decor-chandelier': (575, 751, 743, 953),
        'coin-gold': (799, 784, 982, 975)
    }

    for name, bbox in items.items():
        crop = sheet_clean.crop(bbox)
        cbbox = crop.getbbox()
        if cbbox:
            crop = crop.crop(cbbox)

        target_size = 48 if name == 'coin-gold' else 96
        cw, ch = crop.size
        scale = min((target_size - 4) / cw, (target_size - 4) / ch)
        nw, nh = max(1, int(round(cw * scale))), max(1, int(round(ch * scale)))
        resized = crop.resize((nw, nh), Image.Resampling.NEAREST)
        canvas = Image.new('RGBA', (target_size, target_size), (0, 0, 0, 0))
        canvas.paste(resized, ((target_size - nw) // 2, (target_size - nh) // 2))
        sprites[name] = despeckle_edges(quantize_image_nearest(canvas))

    return sprites

# ------------------------------------------------------------------------------
# 6. PROCESS 16-BIT RETRO SCENERY BACKDROPS
# ------------------------------------------------------------------------------
def get_backdrop_sprites():
    sprites = {}

    backdrops = {
        'background': os.path.join(SRC_DIR, 'magical_orchard_background_1788442033920.jpg'),
        'castle-exterior': os.path.join(SRC_DIR, 'castle_exterior_grounds_1788453868950.jpg'),
        'castle-interior': os.path.join(SRC_DIR, 'throne_room_flat_1788454559926.jpg')
    }

    for name, path in backdrops.items():
        img = Image.open(path).convert("RGB")
        # Native retro resolution 240x400 (nearest-neighbor 2x scaled to 480x800 in-game)
        resized = img.resize((240, 400), Image.Resampling.NEAREST).convert("RGBA")
        sprites[name] = quantize_image_nearest(resized, alpha_threshold=0)

    return sprites

# ------------------------------------------------------------------------------
# 7. PACK ALL SPRITES INTO 1024x1024 ATLAS
# ------------------------------------------------------------------------------
LAYOUT = {
    # Top region (y: 6 to 408)
    "background": (6, 6),
    "castle-exterior": (252, 6),
    "castle-interior": (498, 6),
    "tree-stage-1": (744, 6),
    "tree-stage-2": (744, 140),
    "tree-stage-3": (744, 274),
    "tree-stage-4": (878, 6),
    "tree-stage-5": (878, 140),
    "basket": (878, 274),
    "basket-royal": (878, 344),

    # Shelf 1 (y: 414 to 542)
    "princess-idle-1": (6, 414),
    "princess-idle-2": (108, 414),
    "princess-catch": (210, 414),
    "princess-think": (312, 414),
    "decor-fountain": (414, 414),
    "decor-topiary": (516, 414),
    "decor-banners": (618, 414),
    "decor-lantern": (720, 414),
    "decor-couch": (822, 414),
    "decor-peacock": (924, 414),

    # Shelf 2 (y: 548 to 644)
    "decor-swing": (6, 548),
    "decor-throne": (108, 548),
    "decor-chaise": (210, 548),
    "decor-mirror": (312, 548),
    "decor-teatable": (414, 548),
    "decor-bookshelf": (516, 548),
    "decor-chandelier": (618, 548),
    "card-panel": (720, 548),
    "apple": (822, 548),
    "orange": (908, 548),

    # Shelf 3 (y: 650 to 730)
    "grape": (6, 650),
    "banana": (92, 650),
    "watermelon": (178, 650),
    "blueberry": (264, 650),
    "strawberry": (350, 650),
    "lemon": (436, 650),
    "kiwi": (522, 650),
    "peach": (608, 650),
    "plum": (694, 650),
    "cherry": (780, 650),
    "btn-pause": (866, 650),

    # Shelf 4 (y: 736 to 800)
    "btn-sound": (6, 736),
    "btn-sound-off": (76, 736),
    "btn-replay": (146, 736),
    "btn-home": (216, 736),
    "coin-gold": (286, 736),
    "lock": (340, 736),
    "star-full": (394, 736),
    "star-empty": (448, 736),
    "crown-star-full": (502, 736),
    "crown-star-empty": (556, 736),
    "check-mark": (610, 736),
    "x-mark": (664, 736),
    "sparkle": (718, 736),
    "petal": (756, 736),
    "firefly": (794, 736),
}

def pack_atlas(output_dir="public/assets"):
    os.makedirs(output_dir, exist_ok=True)
    all_sprites = {}

    print("Processing AI Princess sprites (clean floodfill + sole clamp + anim-lock)...")
    all_sprites.update(get_princess_sprites())

    print("Processing AI Fruit characters (clean floodfill + 16-color quantize)...")
    all_sprites.update(get_fruit_sprites())

    print("Processing AI Tree & Basket (clean floodfill + ground anchor)...")
    all_sprites.update(get_tree_and_basket_sprites())

    print("Processing Castle Decorations & Furniture...")
    all_sprites.update(get_decorations_sprites())

    print("Processing UI elements (including lock icon)...")
    all_sprites.update(get_ui_sprites())

    print("Processing 16-bit retro arcade backdrops...")
    all_sprites.update(get_backdrop_sprites())

    print(f"Total sprite frames to pack: {len(all_sprites)}")

    atlas_w, atlas_h = 1024, 1024
    atlas_img = Image.new("RGBA", (atlas_w, atlas_h), (0, 0, 0, 0))

    # Verify all sprites have layout coordinates and zero overlaps
    rects = []
    frames_json = {}

    for name, img in all_sprites.items():
        if name not in LAYOUT:
            raise ValueError(f"Sprite '{name}' missing from LAYOUT dictionary!")
        x, y = LAYOUT[name]
        sw, sh = img.size

        if x + sw > atlas_w or y + sh > atlas_h:
            raise RuntimeError(f"Frame '{name}' ({sw}x{sh}) at ({x},{y}) exceeds atlas bounds {atlas_w}x{atlas_h}")

        rects.append((name, x, y, sw, sh))
        atlas_img.paste(img, (x, y))

        frames_json[name] = {
            "frame": {"x": x, "y": y, "w": sw, "h": sh},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": sw, "h": sh},
            "sourceSize": {"w": sw, "h": sh},
            "pivot": {"x": 0.5, "y": 0.5}
        }

    # Verify pairwise non-overlap across all packed frames
    for i in range(len(rects)):
        for j in range(i + 1, len(rects)):
            n1, x1, y1, w1, h1 = rects[i]
            n2, x2, y2, w2, h2 = rects[j]
            overlap_x = max(x1, x2) < min(x1 + w1, x2 + w2)
            overlap_y = max(y1, y2) < min(y1 + h1, y2 + h2)
            if overlap_x and overlap_y:
                raise RuntimeError(f"Overlap between '{n1}' and '{n2}'!")

    atlas_data = {
        "frames": frames_json,
        "meta": {
            "app": "CatchTheFruit-AIAtlasPacker",
            "version": "4.0-Retro16BitLockedPalette",
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

    print(f"Successfully generated clean 16-Bit Retro Texture Atlas:")
    print(f"  PNG:  {png_path} ({os.path.getsize(png_path):,} bytes)")
    print(f"  JSON: {json_path} ({len(frames_json)} frames)")

    # Write locked palette to scripts/palette.json
    with open("scripts/palette.json", "w", encoding="utf-8") as f:
        json.dump(LOCKED_PALETTE_HEX, f, indent=2)
    print("Wrote locked palette to scripts/palette.json")

    # Try updating pipeline palette if accessible
    try:
        pip_path = os.path.expanduser("~/Documents/pixel-art-pipeline/palette.json")
        with open(pip_path, "w", encoding="utf-8") as f:
            json.dump(LOCKED_PALETTE_HEX, f, indent=2)
        print("Updated ~/Documents/pixel-art-pipeline/palette.json")
    except Exception as e:
        print(f"Note on pipeline palette: {e}")

    # Remove loose unbatched jpg backgrounds
    for loose_file in ["public/assets/background.jpg", "public/assets/castle_exterior.jpg", "public/assets/castle_interior.jpg"]:
        if os.path.exists(loose_file):
            try:
                os.remove(loose_file)
                print(f"Removed loose unbatched image: {loose_file}")
            except Exception as e:
                print(f"Error removing {loose_file}: {e}")

if __name__ == "__main__":
    pack_atlas("public/assets")
