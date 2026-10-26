"""Behavioural checks in headless Chromium: reversibility, CLS, pin count, no horizontal overflow. Not a performance test."""
import subprocess, time, io, json
from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright
srv = subprocess.Popen(['npx','astro','preview','--host','127.0.0.1','--port','4321'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(4)
res = {}
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width':1440,'height':900})
        pg.add_init_script("window.__cls=0;new PerformanceObserver(l=>{for(const e of l.getEntries()) if(!e.hadRecentInput) window.__cls+=e.value}).observe({type:'layout-shift',buffered:true});")
        pg.goto('http://127.0.0.1:4321/', wait_until='networkidle'); pg.wait_for_timeout(800)
        pg.add_style_tag(content='.nav{visibility:hidden !important}')  # nav hide/show depends on scroll direction by design
        def shot(y):
            pg.evaluate(f'window.scrollTo(0,{y})'); pg.wait_for_timeout(3200)
            return Image.open(io.BytesIO(pg.screenshot())).convert('RGB')
        pts = [900, 1500, 2100, 4200, 5200, 6000, 7600]
        fwd = {y: shot(y) for y in pts}
        for y in reversed(pts[:-1]): shot(y+300)  # wander
        bwd = {y: shot(y) for y in reversed(pts)}
        def diff(a, b):
            d = ImageChops.difference(a, b).convert('L').point(lambda v: 255 if v > 24 else 0)
            return round(sum(1 for v in d.getdata() if v) / (a.width * a.height), 5)
        res['frame_diff_fraction_fwd_vs_back'] = {str(y): diff(fwd[y], bwd[y]) for y in pts}  # antialiasing at clip edges only; ~0 = reversible
        res['pins'] = pg.evaluate("document.querySelectorAll('.pin-spacer').length")
        res['pinned_elements'] = pg.evaluate("[...document.querySelectorAll('.pin-spacer > *')].map(e=>e.className)")
        res['cls'] = round(pg.evaluate('window.__cls'), 4)
        # nav anchor jump lands on the right section while pins are active
        res['anchors'] = {}
        for h in ['work','toolkit','writing','background','contact']:
            pg.evaluate(f"location.hash='#{h}'"); pg.wait_for_timeout(900)
            top = pg.evaluate(f"Math.round(document.getElementById('{h}').getBoundingClientRect().top)")
            res['anchors'][h] = top
        # resize while mid-hero
        pg.evaluate('window.scrollTo(0,1500)'); pg.set_viewport_size({'width':1100,'height':760}); pg.wait_for_timeout(1500)
        res['after_resize_hscroll'] = pg.evaluate('document.documentElement.scrollWidth > innerWidth')
        # sticky/focus: tab through nav
        b.close()
finally:
    srv.terminate()
print(json.dumps(res, indent=1))
