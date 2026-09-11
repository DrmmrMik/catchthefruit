import os
import numpy as np
from PIL import Image
from collections import deque

src_dir = '/home/gallabot/.gemini/antigravity/brain/ec582232-567f-4225-b8f1-d6ff7b3cefb8'

def flood_fill_bg(img, thresh_dist=30):
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

    fg_mask = np.where(visited, 0, 255).astype(np.uint8)
    rgba = img_rgb.convert("RGBA")
    rgba.putalpha(Image.fromarray(fg_mask, mode="L"))
    return rgba

char_img = Image.open(os.path.join(src_dir, 'princess_penelope_character_1788441979685.jpg'))
rgba = flood_fill_bg(char_img, thresh_dist=30)
bbox = rgba.getbbox()
print("Character bbox at thresh 30:", bbox)

# Let's see what happens if thresh_dist is 40 or 50 on the bottom border
rgba50 = flood_fill_bg(char_img, thresh_dist=50)
print("Character bbox at thresh 50:", rgba50.getbbox())

# Let's inspect the bottom 20 rows of non-transparent area in rgba
cropped = rgba.crop(bbox)
cw, ch = cropped.size
crop_arr = np.array(cropped)
print("Cropped size:", cw, ch)
for y in range(ch - 15, ch):
    row_alpha = crop_arr[y, :, 3]
    opaque_indices = np.where(row_alpha > 0)[0]
    if len(opaque_indices) > 0:
        colors = crop_arr[y, opaque_indices, :3]
        mean_c = np.mean(colors, axis=0)
        print(f"Row {y} (from bottom {ch - y}): {len(opaque_indices)} px, mean RGB={mean_c.astype(int)}")

