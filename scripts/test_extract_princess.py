import os
from PIL import Image

def remove_white_bg(img, threshold=242, feather=18):
    img = img.convert("RGBA")
    datas = img.getdata()
    new_data = []
    for r, g, b, _ in datas:
        min_c = min(r, g, b)
        if min_c >= threshold:
            new_data.append((r, g, b, 0))
        elif min_c > threshold - feather:
            alpha = int(255 * (threshold - min_c) / feather)
            new_data.append((r, g, b, alpha))
        else:
            new_data.append((r, g, b, 255))
    img.putdata(new_data)
    return img

src_dir = '/home/gallabot/.gemini/antigravity/brain/ec582232-567f-4225-b8f1-d6ff7b3cefb8'

# 1. Penelope Idle 1
char_img = Image.open(os.path.join(src_dir, 'princess_penelope_character_1788441979685.jpg'))
char_trans = remove_white_bg(char_img)
bbox = char_trans.getbbox()
print("Character bbox:", bbox)
cropped = char_trans.crop(bbox)
# Target aspect ratio: 96x128 (w:h = 3:4)
cw, ch = cropped.size
# Fit into 96x128 with proportional scaling
scale = min(96 / cw, 128 / ch) * 0.95
nw, nh = int(cw * scale), int(ch * scale)
scaled = cropped.resize((nw, nh), Image.Resampling.LANCZOS)
canvas = Image.new("RGBA", (96, 128), (0, 0, 0, 0))
canvas.paste(scaled, ((96 - nw) // 2, 128 - nh - 4))
canvas.save("scripts/test_princess_idle1.png")
print("Saved scripts/test_princess_idle1.png")

# 2. Penelope Idle 2 (breathing: shifted up by 2px, chest expansion)
canvas2 = Image.new("RGBA", (96, 128), (0, 0, 0, 0))
canvas2.paste(scaled, ((96 - nw) // 2, 128 - nh - 7))
canvas2.save("scripts/test_princess_idle2.png")
print("Saved scripts/test_princess_idle2.png")

# 3. Penelope Celebrating / Catch
celeb_img = Image.open(os.path.join(src_dir, 'princess_penelope_celebrating_1788442003907.jpg'))
celeb_trans = remove_white_bg(celeb_img)
c_bbox = celeb_trans.getbbox()
print("Celebrating bbox:", c_bbox)
c_cropped = celeb_trans.crop(c_bbox)
cw, ch = c_cropped.size
scale = min(96 / cw, 128 / ch) * 0.95
nw, nh = int(cw * scale), int(ch * scale)
scaled_c = c_cropped.resize((nw, nh), Image.Resampling.LANCZOS)
canvas_c = Image.new("RGBA", (96, 128), (0, 0, 0, 0))
canvas_c.paste(scaled_c, ((96 - nw) // 2, 128 - nh - 4))
canvas_c.save("scripts/test_princess_catch.png")
print("Saved scripts/test_princess_catch.png")

# 4. Penelope Think: slightly zoomed head/shoulders with slight tilt
head_crop = cropped.crop((int(cw * 0.1), 0, int(cw * 0.9), int(ch * 0.7)))
head_rotated = head_crop.rotate(4, resample=Image.Resampling.BICUBIC, expand=True)
hw, hh = head_rotated.size
scale_h = min(96 / hw, 128 / hh) * 0.9
nw, nh = int(hw * scale_h), int(hh * scale_h)
scaled_h = head_rotated.resize((nw, nh), Image.Resampling.LANCZOS)
canvas_h = Image.new("RGBA", (96, 128), (0, 0, 0, 0))
canvas_h.paste(scaled_h, ((96 - nw) // 2, (128 - nh) // 2))
canvas_h.save("scripts/test_princess_think.png")
print("Saved scripts/test_princess_think.png")

