"""Render the built site in headless Chromium and capture frames. Usage: python3 tools/screenshot.py [outdir]"""
import sys, os, subprocess, time, json
from playwright.sync_api import sync_playwright
out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/shots'; os.makedirs(out, exist_ok=True)
srv = subprocess.Popen(['npx','astro','preview','--host','127.0.0.1','--port','4321'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(4)
URL = 'http://127.0.0.1:4321/'
report = {}
def run(name, vw, vh, js=True, reduced=False, fracs=None, mobile=False):
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width':vw,'height':vh}, java_script_enabled=js, reduced_motion='reduce' if reduced else 'no-preference', is_mobile=mobile, has_touch=mobile, device_scale_factor=1)
        pg = ctx.new_page(); errs = []
        pg.on('console', lambda m: errs.append(m.text) if m.type in ('error','warning') else None)
        pg.on('pageerror', lambda e: errs.append('PAGEERROR '+str(e)))
        pg.goto(URL, wait_until='networkidle'); pg.wait_for_timeout(600)
        total = pg.evaluate('document.documentElement.scrollHeight')
        info = {'scrollHeight': total, 'hscroll': pg.evaluate('document.documentElement.scrollWidth > window.innerWidth')}
        for f in (fracs or []):
            y = int(f if f > 1 else f * (total - vh))
            pg.evaluate(f'window.scrollTo(0,{y})'); pg.wait_for_timeout(1500)
            pg.screenshot(path=f'{out}/{name}_{y:05d}.png')
        info['errors'] = errs
        report[name] = info; b.close()
try:
    heroY = [0, 300, 700, 1100, 1500, 1900, 2300, 2600]
    run('desk', 1440, 900, fracs=heroY + [3000, 3600, 4200, 4800, 5400, 6000, 6600, 7200, 7800, 8600, 9400, 10200, 11000, 99999])
    run('mobile', 390, 844, mobile=True, fracs=[0, 500, 1000, 1500, 2000, 2600, 3400, 4400, 5600, 7000])
    run('reduced', 1440, 900, reduced=True, fracs=[0, 900, 1800, 2700, 3600])
    run('nojs', 1440, 900, js=False, fracs=[0, 900, 1800, 2700])
finally:
    srv.terminate()
print(json.dumps(report, indent=1))
