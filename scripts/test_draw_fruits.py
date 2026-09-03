from PIL import Image, ImageDraw

SCALE = 4

def make_canvas(w, h):
    return Image.new("RGBA", (w * SCALE, h * SCALE), (0, 0, 0, 0))

def finalize(img, w, h):
    return img.resize((w, h), Image.Resampling.LANCZOS)

def draw_cute_face(d, cx, cy, s, eye_dist=8, eye_r=2.5, smile_w=5, blush=True):
    ed = eye_dist * s
    er = eye_r * s
    # Eyes
    d.ellipse([cx - ed - er, cy - er, cx - ed + er, cy + er], fill=(30, 41, 59, 255))
    d.ellipse([cx + ed - er, cy - er, cx + ed + er, cy + er], fill=(30, 41, 59, 255))
    # Eye Highlights
    hr = er * 0.4
    d.ellipse([cx - ed - hr, cy - er*0.6, cx - ed + hr, cy - er*0.1], fill=(255, 255, 255, 255))
    d.ellipse([cx + ed - hr, cy - er*0.6, cx + ed + hr, cy - er*0.1], fill=(255, 255, 255, 255))
    # Rosy Cheeks
    if blush:
        br = 3.5 * s
        d.ellipse([cx - ed - br*1.2, cy + 1*s, cx - ed + br*0.8, cy + 1*s + br], fill=(251, 113, 133, 160))
        d.ellipse([cx + ed - br*0.8, cy + 1*s, cx + ed + br*1.2, cy + 1*s + br], fill=(251, 113, 133, 160))
    # Smile
    sw = smile_w * s
    d.arc([cx - sw, cy + 1*s, cx + sw, cy + 6*s], start=10, end=170, fill=(30, 41, 59, 255), width=int(1.8*s))

img = make_canvas(80, 80)
d = ImageDraw.Draw(img)
s = SCALE
cx, cy = 40 * s, 44 * s
# Draw apple body
r = 25 * s
d.ellipse([cx - r - 2*s, cy - r, cx + 5*s, cy + r], fill=(239, 68, 68, 255))
d.ellipse([cx - 5*s, cy - r, cx + r + 2*s, cy + r], fill=(220, 38, 38, 255))
d.ellipse([cx - 20*s, cy - 10*s, cx + 20*s, cy + 24*s], fill=(239, 68, 68, 255))
# Face
draw_cute_face(d, cx, cy + 2*s, s, eye_dist=8, eye_r=3, smile_w=5)
fin = finalize(img, 80, 80)
fin.save("scripts/test_cute_apple.png")
print("Saved scripts/test_cute_apple.png")
