"""Capture review screenshots by section (desktop + mobile). Usage: python3 tools/review_shots.py [outdir]"""
import sys, os, subprocess, time, json
from playwright.sync_api import sync_playwright
out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/rs'; os.makedirs(out, exist_ok=True)
srv = subprocess.Popen(['npx','astro','preview','--host','127.0.0.1','--port','4321'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(4)
rep = {}
def run(tag, vw, vh, mobile=False, reduced=False, js=True):
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width':vw,'height':vh}, is_mobile=mobile, has_touch=mobile, java_script_enabled=js, reduced_motion='reduce' if reduced else 'no-preference')
        pg = ctx.new_page(); errs=[]
        pg.on('console', lambda m: errs.append(m.text) if m.type in ('error','warning') else None)
        pg.on('pageerror', lambda e: errs.append('PAGEERROR '+str(e)))
        pg.goto('http://127.0.0.1:4321/', wait_until='networkidle'); pg.wait_for_timeout(700)
        total = pg.evaluate('document.documentElement.scrollHeight')
        def top(sel): return pg.evaluate(f"(()=>{{const e=document.querySelector('{sel}');const r=e.getBoundingClientRect();return Math.round(r.top+scrollY)}})()")
        def shot(name, y):
            pg.evaluate(f'window.scrollTo(0,{int(y)})'); pg.wait_for_timeout(1700); pg.screenshot(path=f'{out}/{tag}_{name}.png')
        hero = [0, .12, .3, .5, .7, .9] if js and not reduced else [0]
        dist = {'desk':2.5,'mob':1.8}.get(tag.split('_')[0], 2.5)
        for f in hero: shot(f'a_hero_{int(f*100):02d}', f*vh*dist)
        shot('b_premise', top('.premise') - 40)
        a = top('.anatomy')
        for f in ([.02,.2,.4,.6,.8] if not reduced else [0]): shot(f'c_pwndbg_{int(f*100):02d}', a + f*vh*3)
        shot('d_proof', top('.proof') - 60)
        shot('e_crawlx', top('#crawlx')-40); shot('f_cli', top('#cli-crawler')-40); shot('g_lab', top('#ad-lab')-40)
        tk = top('#toolkit'); shot('h_toolkit_a', tk - vh*0.45); shot('h_toolkit_b', tk - 40)
        shot('i_writing', top('#writing')-60); shot('j_background', top('#background')-60); shot('k_background2', top('.story')+300)
        c = top('.closing'); shot('l_closing_enter', c - vh*0.55); shot('m_closing', c - 40); shot('n_end', 99999)
        rep[tag] = dict(scrollHeight=total, hscroll=pg.evaluate('document.documentElement.scrollWidth>innerWidth'), errors=errs)
        b.close()
try:
    run('desk', 1440, 900)
    run('mob', 390, 844, mobile=True)
    run('red', 1440, 900, reduced=True)
finally: srv.terminate()
print(json.dumps(rep, indent=1))
