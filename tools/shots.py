"""Screenshots by section. Usage: python3 tools/shots.py <outdir> <tag> <w> <h> [mobile] [reduced]"""
import sys, os, subprocess, time, urllib.request as U
from playwright.sync_api import sync_playwright
out, tag, vw, vh = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
mobile = 'mobile' in sys.argv; reduced = 'reduced' in sys.argv
os.makedirs(out, exist_ok=True)
srv = subprocess.Popen(['npx','astro','preview','--host','127.0.0.1','--port','4321'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for _ in range(60):
    try: U.urlopen('http://127.0.0.1:4321/', timeout=1); break
    except Exception: time.sleep(0.5)
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width':vw,'height':vh}, is_mobile=mobile, has_touch=mobile, device_scale_factor=1, reduced_motion='reduce' if reduced else 'no-preference')
        pg = ctx.new_page(); errs=[]
        pg.on('console', lambda m: errs.append(m.text) if m.type in ('error','warning') else None)
        pg.on('pageerror', lambda e: errs.append('PAGEERROR '+str(e)))
        pg.goto('http://127.0.0.1:4321/', wait_until='networkidle'); pg.wait_for_timeout(2600)
        top = lambda sel: pg.evaluate(f"(()=>{{const e=document.querySelector('{sel}');return Math.round(e.getBoundingClientRect().top+scrollY)}})()")
        def shot(name, y, wait=1900):
            pg.evaluate(f'window.scrollTo(0,{int(y)})'); pg.wait_for_timeout(wait); pg.screenshot(path=f'{out}/{tag}_{name}.png')
        pg.screenshot(path=f'{out}/{tag}_00_hero.png')
        shot('01_t30', vh*0.3, 900); shot('02_t60', vh*0.6, 900); shot('03_t100', vh*1.0)
        shot('04_crawlx', top('#crawlx')-70); shot('04b_crawlx2', top('#crawlx')+vh*0.55)
        shot('05_cli', top('#cli-crawler')-40)
        shot('06_lab', top('#lab')-20); shot('06b_lab2', top('#lab')+vh*0.6)
        shot('07_pwndbg', top('#pwndbg')-20); shot('07b_pwndbg2', top('#pwndbg')+vh*0.7)
        shot('08_toolkit', top('#toolkit')-20)
        shot('09_writing', top('#writing')-60)
        shot('10_resume', top('#resume')-60); shot('10b_resume2', top('#resume')+vh*0.8)
        shot('11_contact', top('#contact')-40); shot('12_end', 999999)
        print(tag, 'scrollHeight', pg.evaluate('document.documentElement.scrollHeight'), 'hscroll', pg.evaluate('document.documentElement.scrollWidth>innerWidth'), 'errors', errs)
        b.close()
finally: srv.terminate()
