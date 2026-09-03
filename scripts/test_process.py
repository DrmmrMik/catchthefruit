import os
from PIL import Image, ImageChops

def remove_white_bg(img, threshold=245, feather=15):
    img = img.convert("RGBA")
    r, g, b, a = img.split()
    
    # Calculate whiteness
    datas = img.getdata()
    new_data = []
    for item in datas:
        r, g, b, _ = item
        # Whiteness metric: minimum of r, g, b
        min_c = min(r, g, b)
        if min_c >= threshold:
            # Completely transparent
            new_data.append((r, g, b, 0))
        elif min_c > threshold - feather:
            # Linear alpha feather
            alpha = int(255 * (threshold - min_c) / feather)
            new_data.append((r, g, b, alpha))
        else:
            new_data.append((r, g, b, 255))
            
    img.putdata(new_data)
    return img

src_dir = '/home/gallabot/.gemini/antigravity/brain/ec582232-567f-4225-b8f1-d6ff7b3cefb8'
basket_img = Image.open(os.path.join(src_dir, 'royal_golden_basket_1788442063144.jpg'))
transparent_basket = remove_white_bg(basket_img)

# Find bbox of non-zero alpha
bbox = transparent_basket.getbbox()
print("Basket bbox:", bbox)
cropped = transparent_basket.crop(bbox)
scaled = cropped.resize((128, 64), Image.Resampling.LANCZOS)
scaled.save("scripts/test_basket_out.png")
print("Saved scripts/test_basket_out.png", scaled.size)
