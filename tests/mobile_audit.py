"""Phone visual audit: every route on an emulated phone, cut into screen-height tiles laid side by side.
    python3 tests/mobile_audit.py <base-url> <out-dir> [device] [theme]"""
import sys, pathlib, io
from playwright.sync_api import sync_playwright
from PIL import Image
base, out = sys.argv[1].rstrip('/'), pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
device = sys.argv[3] if len(sys.argv) > 3 else 'iPhone 13'
theme = sys.argv[4] if len(sys.argv) > 4 else 'light'
ROUTES = {
  'journey': '#/', 'stage': '#/stage/s04', 'explore': '#/explore', 'explore-node': '#/explore?focus=r-double-blind',
  'handbook': '#/handbook', 'hb-harvard': '#/handbook/references', 'hb-length': '#/handbook/length', 'hb-abstract': '#/handbook/abstract',
  'hb-structure': '#/handbook/organization', 'hb-ai': '#/handbook/ai', 'hb-anon': '#/handbook/blind', 'hb-submit': '#/handbook/submission',
  'hb-review': '#/handbook/revisions', 'hb-eq': '#/handbook/equations', 'hb-fig': '#/handbook/figures', 'req': '#/req/r-length',
  'questions': '#/questions', 'question': '#/questions/c-anonymization', 'research': '#/research', 'resources': '#/resources',
  'sources': '#/sources', 'readiness': '#/readiness', 'directory': '#/directory',
}
only = sys.argv[5].split(',') if len(sys.argv) > 5 else list(ROUTES)
with sync_playwright() as p:
    b = p.chromium.launch()
    dev = dict(p.devices[device]); dev.pop('default_browser_type', None)
    ctx = b.new_context(**dev, color_scheme=theme)
    pg = ctx.new_page()
    vh = dev['viewport']['height']; vw = dev['viewport']['width']
    for name in only:
        pg.goto(f"{base}/{ROUTES[name]}"); pg.wait_for_timeout(700)
        if name in ('hb-harvard',): pg.locator('.harv-step summary').nth(1).click(); pg.wait_for_timeout(200)
        pg.add_style_tag(content='.tabbar{visibility:hidden}')
        png = pg.screenshot(full_page=True)
        im = Image.open(io.BytesIO(png)); s = im.width / vw
        tiles = [im.crop((0, int(y * s), im.width, int(min(im.height / s, y + vh) * s))) for y in range(0, int(im.height / s), vh)][:5]
        sheet = Image.new('RGB', (sum(t.width for t in tiles) + 12 * (len(tiles) - 1), int(vh * s)), (255, 0, 255))
        x = 0
        for t in tiles: sheet.paste(t, (x, 0)); x += t.width + 12
        sheet = sheet.resize((sheet.width // max(1, int(s)), sheet.height // max(1, int(s))))
        sheet.save(out / f'{name}.png')
    b.close()
print('ok')
