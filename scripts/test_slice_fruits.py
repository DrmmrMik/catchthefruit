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
sheet = Image.open(os.path.join(src_dir, 'magical_fruit_characters_1788442017917.jpg'))
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
        cell_trans = remove_white_bg(cell)
        bbox = cell_trans.getbbox()
        if bbox:
            fruit_crop = cell_trans.crop(bbox)
            # Add padding to make square
            fw, fh = fruit_crop.size
            max_dim = max(fw, fh) + 16
            sq = Image.new("RGBA", (max_dim, max_dim), (0, 0, 0, 0))
            sq.paste(fruit_crop, ((max_dim - fw) // 2, (max_dim - fh) // 2))
            fruit_final = sq.resize((80, 80), Image.Resampling.LANCZOS)
            fruit_final.save(f"scripts/test_fruit_{name}.png")
            print(f"Extracted {name}: {fruit_final.size}")

