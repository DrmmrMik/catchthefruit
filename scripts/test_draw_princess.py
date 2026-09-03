import math
from PIL import Image, ImageDraw

SCALE = 4

def make_canvas(w, h):
    return Image.new("RGBA", (w * SCALE, h * SCALE), (0, 0, 0, 0))

def finalize(img, w, h):
    return img.resize((w, h), Image.Resampling.LANCZOS)

def draw_princess(w=96, h=128, pose="idle1"):
    img = make_canvas(w, h)
    d = ImageDraw.Draw(img)
    s = SCALE

    # Coordinates
    cx = (w * s) / 2
    ground_y = (h * s) - (10 * s)

    # Bob offset for idle2 or jump for catch
    bob_y = 0
    leg_offset = 0
    arm_pose = "down"

    if pose == "idle2":
        bob_y = -2 * s
    elif pose == "catch":
        bob_y = -8 * s
        leg_offset = 4 * s
        arm_pose = "up"
    elif pose == "think":
        arm_pose = "think"

    # 1. Shoes (Red Adventure Sneakers)
    shoe_l_x = cx - 18 * s
    shoe_r_x = cx + 10 * s
    shoe_y = ground_y + bob_y

    if pose == "catch":
        # Left shoe planted, right shoe kicked up in joy
        # Left Shoe
        d.rounded_rectangle([shoe_l_x, shoe_y - 8*s, shoe_l_x + 18*s, shoe_y + 2*s], radius=4*s, fill=(225, 29, 72, 255))
        d.rounded_rectangle([shoe_l_x - 2*s, shoe_y, shoe_l_x + 20*s, shoe_y + 5*s], radius=2*s, fill=(255, 255, 255, 255))
        # Right Shoe (raised/angled)
        r_sy = shoe_y - 10*s
        d.rounded_rectangle([shoe_r_x + 4*s, r_sy - 8*s, shoe_r_x + 22*s, r_sy + 2*s], radius=4*s, fill=(225, 29, 72, 255))
        d.rounded_rectangle([shoe_r_x + 2*s, r_sy, shoe_r_x + 24*s, r_sy + 5*s], radius=2*s, fill=(255, 255, 255, 255))
    else:
        # Left Shoe
        d.rounded_rectangle([shoe_l_x, shoe_y - 8*s, shoe_l_x + 18*s, shoe_y + 2*s], radius=4*s, fill=(225, 29, 72, 255))
        d.rounded_rectangle([shoe_l_x - 2*s, shoe_y, shoe_l_x + 20*s, shoe_y + 5*s], radius=2*s, fill=(255, 255, 255, 255))
        d.ellipse([shoe_l_x + 4*s, shoe_y - 6*s, shoe_l_x + 8*s, shoe_y - 2*s], fill=(255, 255, 255, 200)) # toe cap

        # Right Shoe
        d.rounded_rectangle([shoe_r_x, shoe_y - 8*s, shoe_r_x + 18*s, shoe_y + 2*s], radius=4*s, fill=(225, 29, 72, 255))
        d.rounded_rectangle([shoe_r_x - 2*s, shoe_y, shoe_r_x + 20*s, shoe_y + 5*s], radius=2*s, fill=(255, 255, 255, 255))
        d.ellipse([shoe_r_x + 10*s, shoe_y - 6*s, shoe_r_x + 14*s, shoe_y - 2*s], fill=(255, 255, 255, 200))

    # 2. Denim Dungarees / Overalls Legs (Rolled Up)
    pant_y = ground_y - 34 * s + bob_y
    leg_w = 14 * s
    # Left Leg
    d.rounded_rectangle([cx - 19*s, pant_y, cx - 5*s, ground_y - 6*s + bob_y], radius=3*s, fill=(30, 64, 175, 255))
    # Right Leg
    r_leg_end = (ground_y - 14*s + bob_y) if pose == "catch" else (ground_y - 6*s + bob_y)
    d.rounded_rectangle([cx + 5*s, pant_y, cx + 19*s, r_leg_end], radius=3*s, fill=(30, 64, 175, 255))
    # Rolled-up cuffs (light blue denim cuff)
    d.rounded_rectangle([cx - 20*s, ground_y - 9*s + bob_y, cx - 4*s, ground_y - 5*s + bob_y], radius=2*s, fill=(96, 165, 250, 255))
    d.rounded_rectangle([cx + 4*s, r_leg_end - 3*s, cx + 20*s, r_leg_end + 1*s], radius=2*s, fill=(96, 165, 250, 255))

    # 3. Torso: Striped Shirt Underneath
    shirt_y = pant_y - 26 * s
    d.rounded_rectangle([cx - 18*s, shirt_y, cx + 18*s, pant_y + 6*s], radius=6*s, fill=(255, 255, 255, 255))
    # Pink/Magenta Cozy Stripes
    for sy in range(int(shirt_y + 4*s), int(pant_y), int(6*s)):
        d.rectangle([cx - 18*s, sy, cx + 18*s, sy + 3*s], fill=(244, 114, 182, 255))

    # 4. Overalls Bib & Front
    bib_w = 14 * s
    bib_y = shirt_y + 8 * s
    d.rounded_rectangle([cx - bib_w, bib_y, cx + bib_w, pant_y + 4*s], radius=4*s, fill=(29, 78, 216, 255)) # Denim Blue
    # Dungarees Straps
    d.line([(cx - 12*s, shirt_y + 2*s), (cx - 10*s, bib_y + 4*s)], fill=(30, 58, 138, 255), width=5*s)
    d.line([(cx + 12*s, shirt_y + 2*s), (cx + 10*s, bib_y + 4*s)], fill=(30, 58, 138, 255), width=5*s)
    # Brass Buckles
    d.ellipse([cx - 12*s, bib_y + 2*s, cx - 8*s, bib_y + 6*s], fill=(251, 191, 36, 255))
    d.ellipse([cx + 8*s, bib_y + 2*s, cx + 12*s, bib_y + 6*s], fill=(251, 191, 36, 255))
    # Front Pocket
    d.rounded_rectangle([cx - 8*s, bib_y + 10*s, cx + 8*s, bib_y + 22*s], radius=3*s, fill=(29, 78, 216, 255), outline=(251, 191, 36, 255), width=int(1.5*s))
    # Cute apple emblem on pocket
    d.ellipse([cx - 3*s, bib_y + 14*s, cx + 3*s, bib_y + 19*s], fill=(239, 68, 68, 255))
    d.point((cx, bib_y + 13*s), fill=(34, 197, 94, 255))

    # 5. Curly Hair (Back Layer)
    head_y = shirt_y - 20 * s
    hair_r = 24 * s
    # Bouncy curls framing head
    d.ellipse([cx - 28*s, head_y - 12*s, cx - 10*s, head_y + 16*s], fill=(120, 53, 15, 255)) # left curls
    d.ellipse([cx + 10*s, head_y - 12*s, cx + 28*s, head_y + 16*s], fill=(120, 53, 15, 255)) # right curls
    d.ellipse([cx - 32*s, head_y - 4*s, cx - 14*s, head_y + 22*s], fill=(146, 64, 14, 255))
    d.ellipse([cx + 14*s, head_y - 4*s, cx + 32*s, head_y + 22*s], fill=(146, 64, 14, 255))

    # 6. Arms & Basket
    skin_color = (254, 215, 170, 255) # Warm peaches-and-cream skin
    if arm_pose == "up":
        # Arms raised in cheer
        d.line([(cx - 16*s, shirt_y + 8*s), (cx - 26*s, shirt_y - 14*s)], fill=skin_color, width=6*s)
        d.line([(cx + 16*s, shirt_y + 8*s), (cx + 26*s, shirt_y - 14*s)], fill=skin_color, width=6*s)
        # Sparkle in hands
        d.ellipse([cx - 30*s, shirt_y - 20*s, cx - 22*s, shirt_y - 12*s], fill=(251, 191, 36, 255))
        d.ellipse([cx + 22*s, shirt_y - 20*s, cx + 30*s, shirt_y - 12*s], fill=(251, 191, 36, 255))
    elif arm_pose == "think":
        # Left arm holding waist, right arm to chin
        d.line([(cx - 16*s, shirt_y + 8*s), (cx - 24*s, shirt_y + 20*s)], fill=skin_color, width=6*s)
        d.line([(cx + 16*s, shirt_y + 8*s), (cx + 14*s, head_y + 6*s)], fill=skin_color, width=6*s)
        d.ellipse([cx + 10*s, head_y + 4*s, cx + 18*s, head_y + 12*s], fill=skin_color)
    else:
        # Arms down holding golden royal basket
        d.line([(cx - 16*s, shirt_y + 8*s), (cx - 22*s, shirt_y + 24*s)], fill=skin_color, width=6*s)
        d.line([(cx + 16*s, shirt_y + 8*s), (cx + 22*s, shirt_y + 24*s)], fill=skin_color, width=6*s)
        # Cute woven basket between hands
        bw = 14 * s
        by = shirt_y + 22 * s
        d.rounded_rectangle([cx - bw, by, cx + bw, by + 16*s], radius=4*s, fill=(217, 119, 6, 255), outline=(251, 191, 36, 255), width=2*s)
        # Red apple sitting inside basket
        d.ellipse([cx - 4*s, by - 4*s, cx + 4*s, by + 4*s], fill=(239, 68, 68, 255))

    # 7. Head & Face
    d.ellipse([cx - 18*s, head_y - 16*s, cx + 18*s, head_y + 16*s], fill=skin_color)
    # Rosy Cheeks
    d.ellipse([cx - 16*s, head_y + 2*s, cx - 8*s, head_y + 8*s], fill=(251, 113, 133, 160))
    d.ellipse([cx + 8*s, head_y + 2*s, cx + 16*s, head_y + 8*s], fill=(251, 113, 133, 160))

    # Eyes
    if pose == "catch":
        # Joyful happy arched eyes ^ ^
        d.arc([cx - 13*s, head_y - 6*s, cx - 5*s, head_y], start=180, end=360, fill=(30, 41, 59, 255), width=3*s)
        d.arc([cx + 5*s, head_y - 6*s, cx + 13*s, head_y], start=180, end=360, fill=(30, 41, 59, 255), width=3*s)
        # Open joyful smile :D
        d.chord([cx - 7*s, head_y + 4*s, cx + 7*s, head_y + 14*s], start=0, end=180, fill=(225, 29, 72, 255))
        d.chord([cx - 4*s, head_y + 8*s, cx + 4*s, head_y + 14*s], start=0, end=180, fill=(255, 255, 255, 255))
    elif pose == "think":
        # Eyes looking up-right
        d.ellipse([cx - 12*s, head_y - 5*s, cx - 6*s, head_y + 1*s], fill=(30, 41, 59, 255))
        d.ellipse([cx + 6*s, head_y - 5*s, cx + 12*s, head_y + 1*s], fill=(30, 41, 59, 255))
        # Eyeballs shifted right
        d.ellipse([cx - 9*s, head_y - 4*s, cx - 7*s, head_y - 2*s], fill=(255, 255, 255, 255))
        d.ellipse([cx + 9*s, head_y - 4*s, cx + 11*s, head_y - 2*s], fill=(255, 255, 255, 255))
        # Curious little smile
        d.arc([cx - 5*s, head_y + 4*s, cx + 5*s, head_y + 10*s], start=20, end=160, fill=(185, 28, 28, 255), width=2*s)
    else:
        # Cheerful open big cartoon eyes
        d.ellipse([cx - 13*s, head_y - 6*s, cx - 5*s, head_y + 2*s], fill=(30, 41, 59, 255))
        d.ellipse([cx + 5*s, head_y - 6*s, cx + 13*s, head_y + 2*s], fill=(30, 41, 59, 255))
        # Sparkling reflections
        d.ellipse([cx - 11*s, head_y - 5*s, cx - 8*s, head_y - 2*s], fill=(255, 255, 255, 255))
        d.ellipse([cx + 7*s, head_y - 5*s, cx + 10*s, head_y - 2*s], fill=(255, 255, 255, 255))
        d.point((cx - 7*s, head_y), fill=(255, 255, 255, 200))
        d.point((cx + 11*s, head_y), fill=(255, 255, 255, 200))
        # Warm happy smile
        d.arc([cx - 6*s, head_y + 4*s, cx + 6*s, head_y + 10*s], start=10, end=170, fill=(185, 28, 28, 255), width=2*s)

    # 8. Curly Bangs / Front Hair
    d.ellipse([cx - 16*s, head_y - 20*s, cx - 2*s, head_y - 6*s], fill=(146, 64, 14, 255))
    d.ellipse([cx - 4*s, head_y - 21*s, cx + 14*s, head_y - 8*s], fill=(120, 53, 15, 255))
    d.ellipse([cx + 8*s, head_y - 19*s, cx + 18*s, head_y - 7*s], fill=(146, 64, 14, 255))

    # 9. Sparkling Golden Royal Tiara / Crown!
    crown_y = head_y - 18 * s
    crown_pts = [
        (cx - 15*s, crown_y),
        (cx - 15*s, crown_y - 12*s),
        (cx - 8*s, crown_y - 4*s),
        (cx, crown_y - 16*s), # High central peak
        (cx + 8*s, crown_y - 4*s),
        (cx + 15*s, crown_y - 12*s),
        (cx + 15*s, crown_y)
    ]
    d.polygon(crown_pts, fill=(251, 191, 36, 255), outline=(217, 119, 6, 255))
    # Crown base band
    d.rounded_rectangle([cx - 16*s, crown_y - 2*s, cx + 16*s, crown_y + 2*s], radius=2*s, fill=(245, 158, 11, 255))
    # Ruby Jewel in center of tiara
    d.ellipse([cx - 3*s, crown_y - 9*s, cx + 3*s, crown_y - 3*s], fill=(225, 29, 72, 255))
    # Diamond sparks on outer peaks
    d.ellipse([cx - 16*s, crown_y - 14*s, cx - 14*s, crown_y - 12*s], fill=(255, 255, 255, 255))
    d.ellipse([cx + 14*s, crown_y - 14*s, cx + 16*s, crown_y - 12*s], fill=(255, 255, 255, 255))
    d.ellipse([cx - 1*s, crown_y - 18*s, cx + 1*s, crown_y - 16*s], fill=(255, 255, 255, 255))

    return finalize(img, w, h)

for p in ["idle1", "idle2", "catch", "think"]:
    img = draw_princess(96, 128, p)
    img.save(f"scripts/test_{p}.png")
    print(f"Saved scripts/test_{p}.png ({img.size})")

