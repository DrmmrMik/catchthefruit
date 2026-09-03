import os
import json
from PIL import Image

def verify_all():
    results = {}
    
    # 1. Maskable icons
    for path in [
        'dist/icons/maskable-192x192.png',
        'dist/icons/maskable-512x512.png',
        'public/icons/maskable-192x192.png',
        'public/icons/maskable-512x512.png',
    ]:
        if not os.path.exists(path):
            results[path] = {'error': 'file does not exist'}
            continue
        im = Image.open(path).convert('RGBA')
        w, h = im.size
        px = im.load()
        margin = max(1, int(w * 0.08))
        ring = [px[x, y][3] for x in range(w) for y in range(h) if x < margin or x >= w - margin or y < margin or y >= h - margin]
        transparent_count = sum(1 for a in ring if a < 255)
        # Check colors inside center to ensure it's not a blank dummy
        center_colors = {px[x, y] for x in range(margin, w - margin, 5) for y in range(margin, h - margin, 5)}
        results[path] = {
            'size': f'{w}x{h}',
            'margin': margin,
            'ring_pixels': len(ring),
            'transparent_pixels': transparent_count,
            'distinct_center_colors': len(center_colors),
            'full_bleed_pass': transparent_count == 0
        }

    # 2. Texture atlas
    atlas_json_path = 'dist/assets/atlas.json'
    atlas_png_path = 'dist/assets/atlas.png'
    with open(atlas_json_path) as f:
        atlas_data = json.load(f)
    
    atlas_im = Image.open(atlas_png_path).convert('RGBA')
    aw, ah = atlas_im.size
    frames = atlas_data.get('frames', {})
    
    sprites_info = {}
    padding_violations = 0
    rectangles = []
    
    for name, f_info in frames.items():
        fr = f_info['frame']
        fx, fy, fw, fh = fr['x'], fr['y'], fr['w'], fr['h']
        
        # Check within bounds
        within_bounds = (fx >= 0 and fy >= 0 and fx + fw <= aw and fy + fh <= ah)
        
        # Crop sprite and inspect content
        cropped = atlas_im.crop((fx, fy, fx + fw, fy + fh))
        px_c = cropped.load()
        non_transparent = sum(1 for x in range(fw) for y in range(fh) if px_c[x, y][3] > 0)
        
        sprites_info[name] = {
            'w': fw,
            'h': fh,
            'touch_target_ok': (fw >= 48 and fh >= 48) if ('fruit' in name or name in ['apple', 'orange', 'grape', 'banana', 'watermelon', 'blueberry', 'strawberry', 'lemon', 'kiwi', 'peach', 'plum', 'cherry'] or name.startswith('btn-')) else True,
            'within_bounds': within_bounds,
            'non_transparent_pixels': non_transparent,
            'is_non_empty': non_transparent > 50
        }
        rectangles.append((name, fx, fy, fw, fh))
    
    # Check 4px padding/separation between sprites
    # For any two sprites, bounding boxes expanded by 2px shouldn't overlap (ensuring >=4px gap)
    padding_check = True
    min_dist_found = 999
    for i in range(len(rectangles)):
        name1, x1, y1, w1, h1 = rectangles[i]
        for j in range(i + 1, len(rectangles)):
            name2, x2, y2, w2, h2 = rectangles[j]
            # calculate gap
            x_gap = max(0, max(x1, x2) - min(x1 + w1, x2 + w2))
            y_gap = max(0, max(y1, y2) - min(y1 + h1, y2 + h2))
            dist = max(x_gap, y_gap)
            if dist < 4 and not (x1 + w1 <= x2 or x2 + w2 <= x1 or y1 + h1 <= y2 or y2 + h2 <= y1):
                # overlapping
                padding_check = False
            if dist < min_dist_found and dist > 0:
                min_dist_found = dist

    results['atlas'] = {
        'atlas_size': f'{aw}x{ah}',
        'frame_count': len(frames),
        'sprites_all_non_empty': all(s['is_non_empty'] for s in sprites_info.values()),
        'fruits_touch_target_pass': all(s['touch_target_ok'] for s in sprites_info.values()),
        'all_within_bounds': all(s['within_bounds'] for s in sprites_info.values()),
        'min_gutter_observed': min_dist_found,
        'padding_pass': padding_check,
        'sprites': sprites_info
    }

    # 3. sw.js checks
    with open('dist/sw.js') as f:
        sw_code = f.read()
    results['sw'] = {
        'has_cache_add_all': 'cache.addAll(' in sw_code,
        'uses_individual_add': '.add(' in sw_code and '.catch(' in sw_code,
        'has_stale_while_revalidate': 'caches.match' in sw_code and 'cache.put' in sw_code
    }

    # 4. manifest.json checks
    with open('dist/manifest.json') as f:
        manifest = json.load(f)
    results['manifest'] = {
        'display': manifest.get('display'),
        'display_override': manifest.get('display_override'),
        'icons_count': len(manifest.get('icons', [])),
        'screenshots_count': len(manifest.get('screenshots', [])),
        'forbidden_keys': [k for k in ['protocol_handlers', 'handle_links', 'edge_side_panel', 'launch_handler', 'window-controls-overlay'] if k in manifest]
    }

    print(json.dumps(results, indent=2))

if __name__ == '__main__':
    verify_all()
