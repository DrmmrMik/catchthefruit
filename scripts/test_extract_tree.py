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
tree_img = Image.open(os.path.join(src_dir, 'enchanted_royal_tree_1788442048455.jpg'))
tree_trans = remove_white_bg(tree_img)
bbox = tree_trans.getbbox()
print("Tree bbox:", bbox)
cropped = tree_trans.crop(bbox)
tw, th = cropped.size

# Generate 5 progressive growth stages from sapling to full majestic glowing tree
stage_scales = [0.55, 0.68, 0.80, 0.90, 1.0]

for idx, sc in enumerate(stage_scales, 1):
    nw, nh = int(128 * sc), int(128 * sc)
    scaled = cropped.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    # Anchor to bottom center
    canvas.paste(scaled, ((128 - nw) // 2, 128 - nh))
    canvas.save(f"scripts/test_tree_stage_{idx}.png")
    print(f"Saved scripts/test_tree_stage_{idx}.png")

