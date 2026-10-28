"""Visual QA: screenshots of key routes in light/dark at desktop and mobile widths, plus console errors and
horizontal-overflow checks. Usage: python3 tests/shoot.py <base-url> <out-dir>"""
import sys, pathlib
from playwright.sync_api import sync_playwright
base, out = sys.argv[1].rstrip('/'), pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
routes = {'journey': '#/', 'stage': '#/stage/s04', 'explore': '#/explore', 'handbook': '#/handbook', 'harvard': '#/handbook/references',
          'research': '#/research', 'resources': '#/resources', 'readiness': '#/readiness', 'directory': '#/directory', 'question': '#/questions/c-anonymization'}
only = sys.argv[3].split(',') if len(sys.argv) > 3 else list(routes)
problems = []
with sync_playwright() as p:
    b = p.chromium.launch()
    for vw, vh, tag in ((1440, 900, 'desk'), (375, 812, 'mob')):
        for theme in ('light', 'dark'):
            ctx = b.new_context(viewport={'width': vw, 'height': vh}, color_scheme=theme)
            pg = ctx.new_page()
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
            for name in only:
                pg.goto(f"{base}/{routes[name]}"); pg.wait_for_timeout(700)
                ov = pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
                if ov > 1: problems.append(f'{tag}/{theme}/{name}: horizontal overflow {ov}px')
                pg.screenshot(path=str(out / f'{name}-{tag}-{theme}.png'), full_page=(tag == 'mob' or name in ('handbook',)))
            if errs: problems.append(f'{tag}/{theme}: console errors: {errs[:5]}')
            ctx.close()
    b.close()
print('\n'.join(problems) or 'no overflow, no console errors')
