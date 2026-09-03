from PIL import Image, ImageEnhance

# Lemon from orange: shift hue to yellow-lemon
orange = Image.open("scripts/test_fruit_orange.png")
# Rotate hue using HSV
hsv = orange.convert("HSV")
h, s, v = hsv.split()
# Orange hue is around 25/255. Yellow lemon is around 40/255.
h_new = h.point(lambda p: (p + 15) % 256)
hsv_lemon = Image.merge("HSV", (h_new, s, v))
lemon_rgb = hsv_lemon.convert("RGBA")
lemon_rgb.putalpha(orange.split()[3])
lemon_rgb.save("scripts/test_fruit_lemon.png")
print("Saved lemon")

# Plum from peach: shift hue to purple/plum
peach = Image.open("scripts/test_fruit_peach.png")
hsv = peach.convert("HSV")
h, s, v = hsv.split()
# Shift hue by +180 to get violet/plum
h_new = h.point(lambda p: (p + 180) % 256)
hsv_plum = Image.merge("HSV", (h_new, s, v))
plum_rgb = hsv_plum.convert("RGBA")
plum_rgb.putalpha(peach.split()[3])
plum_rgb.save("scripts/test_fruit_plum.png")
print("Saved plum")

# Kiwi from peach: shift hue to fresh kiwi lime green
h_new = h.point(lambda p: (p + 70) % 256)
hsv_kiwi = Image.merge("HSV", (h_new, s, v))
kiwi_rgb = hsv_kiwi.convert("RGBA")
kiwi_rgb.putalpha(peach.split()[3])
kiwi_rgb.save("scripts/test_fruit_kiwi.png")
print("Saved kiwi")

