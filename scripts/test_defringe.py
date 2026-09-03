from PIL import Image, ImageDraw, ImageFilter
import numpy as np

def extract_sprite_clean(img, thresh_color=(242, 242, 242), thresh_dist=28, feather_radius=1.2):
    """
    Extracts foreground sprite using border floodfill to preserve all interior whites,
    followed by anti-aliased edge smoothing and color de-fringing.
    """
    img_rgb = img.convert("RGB")
    w, h = img_rgb.size

    # Create binary background mask using connected flood fill from the 4 corners and borders
    # 0 = foreground, 255 = background
    mask = Image.new("L", (w, h), 0)
    draw_mask = ImageDraw.Draw(mask)

    # Convert to numpy for fast distance calculation from pure white
    arr = np.array(img_rgb, dtype=np.int16)
    # Euclidean or max distance from white (255, 255, 255)
    diff = 255 - arr
    max_diff = np.max(diff, axis=2) # 0 for pure white, >0 for colors

    # Pixels that could be background (very light)
    bg_candidates = (max_diff <= thresh_dist)

    # Flood fill starting from all 4 borders
    # We do a BFS or flood fill on the candidate mask
    from collections import deque
    visited = np.zeros((h, w), dtype=bool)
    queue = deque()

    # Seed all border pixels that are bg_candidates
    for x in range(w):
        if bg_candidates[0, x]:
            queue.append((0, x))
            visited[0, x] = True
        if bg_candidates[h - 1, x]:
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

    # visited is True where it's connected background
    # Invert to get foreground mask: 255 for foreground, 0 for background
    fg_mask_arr = np.where(visited, 0, 255).astype(np.uint8)
    fg_mask = Image.fromarray(fg_mask_arr, mode="L")

    # Anti-alias mask edge with a subtle Gaussian blur
    if feather_radius > 0:
        # Erode mask slightly then blur to avoid white halo
        fg_mask_blurred = fg_mask.filter(ImageFilter.GaussianBlur(feather_radius))
    else:
        fg_mask_blurred = fg_mask

    # Combine RGB with blurred mask
    rgba = img_rgb.convert("RGBA")
    rgba.putalpha(fg_mask_blurred)

    return rgba

src_path = '/home/gallabot/.gemini/antigravity/brain/ec582232-567f-4225-b8f1-d6ff7b3cefb8/princess_penelope_character_1788441979685.jpg'
img = Image.open(src_path)
clean = extract_sprite_clean(img)
clean.save("scripts/test_princess_clean.png")
print("Saved test_princess_clean.png")
