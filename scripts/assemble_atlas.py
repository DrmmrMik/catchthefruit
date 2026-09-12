#!/usr/bin/env python3
import json
import os
from PIL import Image

SPRITES_DIR = '/tmp/processed_16bit/sprites'
ATLAS_JSON = 'public/assets/atlas.json'
ATLAS_PNG = 'public/assets/atlas.png'

with open(ATLAS_JSON, 'r') as f:
    atlas_data = json.load(f)

meta_w = atlas_data['meta']['size']['w']
meta_h = atlas_data['meta']['size']['h']

canvas = Image.new('RGBA', (meta_w, meta_h), (0, 0, 0, 0))

frames = atlas_data['frames']
for name, item in frames.items():
    fr = item['frame']
    sprite_path = os.path.join(SPRITES_DIR, f'{name}.png')
    if not os.path.exists(sprite_path):
        raise FileNotFoundError(f'Missing sprite: {sprite_path}')
    sprite = Image.open(sprite_path).convert('RGBA')
    if sprite.size != (fr['w'], fr['h']):
        raise ValueError(f'Dimension mismatch for {name}: {sprite.size} vs expected ({fr["w"]}, {fr["h"]})')
    canvas.paste(sprite, (fr['x'], fr['y']), sprite)
    print(f'Pasted {name} at ({fr["x"]}, {fr["y"]}) size=({fr["w"]}, {fr["h"]})')

canvas.save(ATLAS_PNG, format='PNG', optimize=True)
print(f'Successfully assembled {ATLAS_PNG} ({meta_w}x{meta_h}) with {len(frames)} frames.')
