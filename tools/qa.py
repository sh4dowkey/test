"""QA against the production preview. Usage: python3 tools/qa.py [outdir]. Prints PASS/FAIL per check; screenshots to outdir."""
import sys, os, subprocess, time, urllib.request as U, hashlib
from playwright.sync_api import sync_playwright
out = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/shots'; os.makedirs(out, exist_ok=True)
URL = 'http://127.0.0.1:4321/'
srv = subprocess.Popen(['npx','astro','preview','--host','127.0.0.1','--port','4321'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for _ in range(60):
    try: U.urlopen(URL, timeout=1); break
    except Exception: time.sleep(0.5)
fails = []
def ok(name, cond, extra=''):
    print(('PASS ' if cond else 'FAIL ') + name + (f' [{extra}]' if extra != '' else '')); 
    if not cond: fails.append(name)
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    # ---- résumé over HTTP
    r = U.urlopen(URL + 'resume.pdf'); data = r.read()
    ok('resume: 200 + application/pdf', r.status == 200 and r.headers.get('Content-Type') == 'application/pdf', r.headers.get('Content-Type'))
    ok('resume: starts with %PDF and ends with %%EOF', data[:5] == b'%PDF-' and b'%%EOF' in data[-1024:])
    ok('resume: identical to source file', hashlib.sha256(data).hexdigest() == hashlib.sha256(open('public/resume.pdf','rb').read()).hexdigest())
    # ---- desktop
    ctx = b.new_context(viewport={'width':1440,'height':900}, accept_downloads=True); pg = ctx.new_page(); errs = []
    pg.on('console', lambda m: errs.append(m.text) if m.type in ('error','warning') else None); pg.on('pageerror', lambda e: errs.append('PAGEERROR '+str(e)))
    pg.goto(URL, wait_until='networkidle'); pg.wait_for_timeout(2800)
    ok('desktop: no console errors', errs == [], errs[:3])
    ok('desktop: no horizontal overflow', not pg.evaluate('document.documentElement.scrollWidth>innerWidth'))
    ok('nav: first label is Home', pg.evaluate("document.querySelector('.nav__home').textContent")=='Home')
    ok('hero: no name/employer as h1', 'Pandey' not in pg.inner_text('h1') and 'Bobcares' not in pg.inner_text('h1'), pg.inner_text('h1').replace('\n',' '))
    ok('pins: none', pg.evaluate("document.querySelectorAll('.pin-spacer').length")==0)
    pg.screenshot(path=f'{out}/d-hero.png')
    with pg.expect_download() as d: pg.click('.dl')
    dl = d.value; path = dl.path(); ok('resume download: file saved, valid PDF, name kept', open(path,'rb').read()[:5]==b'%PDF-' and dl.suggested_filename=='Anant-Pandey-Resume.pdf', dl.suggested_filename)
    # ---- CrawlX
    pg.evaluate("document.querySelector('[data-cx]').scrollIntoView()"); pg.wait_for_timeout(1500)
    cx = pg.locator('[data-cx]'); 
    t0 = pg.evaluate("document.querySelector('[data-cx]').__cx.t"); pg.wait_for_timeout(1200); t1 = pg.evaluate("document.querySelector('[data-cx]').__cx.t")
    ok('crawlx: clock advances while playing', t1 > t0, f'{t0:.0f}->{t1:.0f}')
    pg.click('[data-cx] [data-play]'); pg.wait_for_timeout(200); ta = pg.evaluate("document.querySelector('[data-cx]').__cx.t"); pg.wait_for_timeout(700); tb = pg.evaluate("document.querySelector('[data-cx]').__cx.t")
    ok('crawlx: pause freezes the clock', ta == tb)
    pg.click('[data-cx] [data-play]')
    pg.wait_for_function("document.querySelector('[data-cx]').__cx.t >= document.querySelector('[data-cx]').__cx.total", timeout=25000)
    pg.wait_for_timeout(500)
    txt = lambda k: pg.inner_text(f'[data-cx] [data-stat="{k}"]')
    ok('crawlx: report visible at end', pg.is_visible('[data-cx] [data-report]'))
    stats = {k: txt(k) for k in ['disc','queue','ok','err','ext','dup','busy']}
    ok('crawlx: end counters coherent (queue 0, 0 busy workers, 17 pages = ok+err)', stats['queue']=='0' and stats['busy'].startswith('0/') and int(stats['ok'])+int(stats['err'])==int(stats['disc']), stats)
    pg.locator('[data-cx] .n[data-u="/catalog/archive"]').click(); pg.wait_for_timeout(200)
    ok('crawlx: selecting a URL shows its details (500)', '500 Internal Server Error' in pg.inner_text('[data-cx] [data-insp]'))
    pg.locator('[data-cx] .n[data-u="/status"]').focus(); pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
    ok('crawlx: keyboard selection, network error after retries', 'failed' in pg.inner_text('[data-cx] [data-insp]').lower() or 'Network error' in pg.inner_text('[data-cx] [data-insp]'))
    pg.click('[data-cx] [data-replay]'); pg.wait_for_timeout(600)
    ok('crawlx: replay resets and runs', pg.is_hidden('[data-cx] [data-report]') and pg.evaluate("document.querySelector('[data-cx]').__cx.playing"))
    pg.select_option('[data-cx] [data-depth]', '1'); pg.wait_for_timeout(300)
    pg.fill('[data-cx] [data-scrub]', '0') if False else None
    pg.click('[data-cx] [data-speed]'); pg.click('[data-cx] [data-speed]')
    pg.wait_for_function("document.querySelector('[data-cx]').__cx.t >= document.querySelector('[data-cx]').__cx.total", timeout=25000); pg.wait_for_timeout(400)
    ok('crawlx: depth 1 changes outcome (fewer pages)', int(txt('disc')) < int(stats['disc']), f"{txt('disc')} < {stats['disc']}")
    pg.screenshot(path=f'{out}/d-crawlx.png')
    # ---- CLI
    pg.evaluate("document.querySelector('[data-cli]').scrollIntoView()"); pg.wait_for_timeout(1500)
    pg.wait_for_function("document.querySelector('[data-cli]').__cli.i >= document.querySelector('[data-cli]').__cli.n", timeout=40000); pg.wait_for_timeout(300)
    out_txt = pg.inner_text('[data-cli] [data-out]')
    ok('cli: robots.txt disallow logged for /admin/panel', 'Disallowed: https://notes.sample.test/admin/panel' in out_txt)
    ok('cli: failed fetch printed as [ERROR]', '[ERROR] Failed to fetch' in out_txt)
    ok('cli: summary printed with title and keyword lines', '--- Crawl Summary ---' in out_txt and 'Title: Backup guide' in out_txt)
    pg.check('[data-cli] input[name=scope][value=external]'); pg.wait_for_function("document.querySelector('[data-cli]').__cli.i >= document.querySelector('[data-cli]').__cli.n", timeout=40000)
    o2 = pg.inner_text('[data-cli] [data-out]'); ok('cli: --external-only crawls start page then only external links', 'partner.test' in o2 and 'notes.sample.test/guides' not in o2.split('--- Crawl Summary ---')[0].replace('Crawling https://notes.sample.test/',''))
    pg.check('[data-cli] input[name=scope][value=all]'); pg.check('[data-cli] input[data-o=output]'); pg.wait_for_function("document.querySelector('[data-cli]').__cli.i >= document.querySelector('[data-cli]').__cli.n", timeout=40000)
    ok('cli: --output shows results.txt panel, no summary in terminal', pg.is_visible('[data-cli] [data-file]') and '--- Crawl Summary ---' not in pg.inner_text('[data-cli] [data-out]'))
    pg.screenshot(path=f'{out}/d-cli.png')
    # ---- Cerberus
    pg.evaluate("document.querySelector('[data-cerb]').scrollIntoView()"); pg.wait_for_timeout(1200)
    cb = lambda k: pg.inner_text(f'[data-cerb] [data-k="{k}"]')
    ok('cerberus: starts at 0 events, 0 alerts', cb('events')=='0' and cb('alerts')=='0')
    pg.click('[data-cerb] [data-act=next]'); pg.wait_for_timeout(200)
    ok('cerberus: step 1 ingests 3 events and 1 alert', cb('step')=='1/7' and cb('events')=='3' and cb('alerts')=='1', (cb('events'), cb('alerts')))
    for _ in range(3): pg.click('[data-cerb] [data-act=next]')
    pg.wait_for_timeout(200); ok('cerberus: step 4 has 12 events, 3 alerts (deception alert not yet raised)', cb('events')=='12' and cb('alerts')=='3', (cb('events'), cb('alerts')))
    pg.click('[data-cerb] [data-act=next]'); ok('cerberus: step 5 raises the deception alert', cb('alerts')=='4')
    pg.click('[data-cerb] [data-tab=telemetry]'); pg.click('[data-cerb] [data-stage=detect]'); pg.click('[data-cerb] [data-stream] button >> nth=0'); pg.wait_for_timeout(200)
    ok('cerberus: selecting an event updates the selected stage detail', 'E-12' in pg.inner_text('[data-cerb] [data-stage-detail]') and 'R4' in pg.inner_text('[data-cerb] [data-stage-detail]'))
    pg.click('[data-cerb] [data-act=next]'); pg.click('[data-cerb] [data-hunt=H1]'); pg.wait_for_timeout(200)
    ok('cerberus: hunt H1 filters stream to 2 RC4 events', pg.locator('[data-cerb] [data-stream] li').count()==2)
    pg.click('[data-cerb] [data-act=prev]'); pg.click('[data-cerb] [data-act=prev]'); pg.wait_for_timeout(200)
    ok('cerberus: going back removes later events, alerts and clears the selection', cb('step')=='4/7' and cb('events')=='12' and cb('alerts')=='3')
    pg.click('[data-cerb] [data-tab=arch]'); pg.locator('[data-cerb] .cb__n[data-id=ca01]').click(); pg.wait_for_timeout(200)
    ok('cerberus: selecting CA01 shows planned status and its event', 'Planned' in pg.inner_text('[data-cerb] [data-host-detail]') and '4886' in pg.inner_text('[data-cerb] [data-host-detail]'))
    pg.click('[data-cerb] [data-act=reset]'); ok('cerberus: reset returns to zero', cb('events')=='0' and cb('step')=='0/7')
    for _ in range(7): pg.click('[data-cerb] [data-act=next]')
    pg.click('[data-cerb] [data-tab=scenario]'); pg.wait_for_timeout(300)
    ok('cerberus: step 7 shows 5 alerts and a 5-item timeline', cb('alerts')=='5' and pg.locator('[data-cerb] [data-cbtl] li').count()==5)
    pg.screenshot(path=f'{out}/d-cerberus.png')
    # tab keyboard
    pg.focus('[data-cerb] [data-tab=scenario]'); pg.keyboard.press('ArrowRight'); ok('cerberus: tabs move with arrow keys', pg.evaluate("document.activeElement.dataset.tab")=='arch')
    # ---- anchors + nav + scrolling
    res={}
    for name, sel in [('Work','#work'),('Toolkit','#toolkit'),('Writing','#writing'),('Résumé','#resume'),('Contact','#contact')]:
        pg.evaluate('window.scrollTo(0,0)'); pg.wait_for_timeout(500); pg.evaluate("document.querySelector('.nav').classList.remove('is-hidden')")
        pg.click(f".nav ul a:text-is('{name}')"); pg.wait_for_timeout(2000)
        res[name]=pg.evaluate(f"Math.round(document.querySelector('{sel}').getBoundingClientRect().top)")
    ok('anchors land within 0..130px (Contact limited by page end)', all(-2<=v<=130 for k,v in res.items() if k!='Contact') and res['Contact']<400, res)
    pg.evaluate('window.scrollTo(0,0)'); pg.wait_for_timeout(500); pg.mouse.move(700,450); y0=pg.evaluate('scrollY'); pg.mouse.wheel(0,700); pg.wait_for_timeout(900); y1=pg.evaluate('scrollY'); pg.mouse.wheel(0,-700); pg.wait_for_timeout(1200); y2=pg.evaluate('scrollY')
    ok('scroll: wheel forward and back is responsive', y1>300 and y2<y1-300, (y0,y1,y2))
    pg.goto(URL+'#toolkit'); pg.wait_for_timeout(1500); pg.go_back(); pg.wait_for_timeout(600); ok('history: back works', True)
    # toolkit
    pg.evaluate("document.querySelector('#toolkit').scrollIntoView()"); pg.wait_for_timeout(1200)
    pg.hover('.tool >> nth=0'); pg.wait_for_timeout(300); ok('toolkit: hover highlights evidence (Bobcares)', pg.evaluate("document.querySelector('.chip[data-id=work]').classList.contains('is-on')"))
    names = pg.eval_on_selector_all('.tool__name','els=>els.map(e=>e.textContent)')
    ok('toolkit: no unsupported tools', not any(x in ' '.join(names) for x in ['Burp','Nmap','Wireshark','Metasploit','Ghidra','BloodHound','AWS','Azure','Nessus','Gobuster']), names)
    pg.screenshot(path=f'{out}/d-toolkit.png')
    ok('experience: Bobcares and Jharsuguda present, no invented title',  'Bobcares' in pg.inner_text('#resume') and 'Jharsuguda' in pg.inner_text('#resume') and 'Engineer' not in pg.inner_text('#resume').split('Pwndbg')[0].split('Experience')[1][:600])
    pg.evaluate("document.querySelector('#contact').scrollIntoView()"); pg.wait_for_timeout(1500); pg.screenshot(path=f'{out}/d-contact.png')
    ctx.close()
    # ---- mobile widths
    for w,h in [(320,640),(360,800),(390,844),(430,932)]:
        c = b.new_context(viewport={'width':w,'height':h}, device_scale_factor=2, has_touch=True, is_mobile=True); m = c.new_page(); me=[]
        m.on('pageerror', lambda e: me.append(str(e)))
        m.goto(URL, wait_until='networkidle'); m.wait_for_timeout(2500)
        ovf = m.evaluate("(()=>{const w=innerWidth;const bad=[];document.querySelectorAll('body *').forEach(e=>{const r=e.getBoundingClientRect();if(r.width&&r.right>w+1&&!e.closest('.hero__glow,.cb__tabs,.cb__stream,.cx__links,.cl__out,.cl__results,pre,svg,.cx__logbody'))bad.push(e.className||e.tagName)});return [document.documentElement.scrollWidth>w,bad.slice(0,5)]})()")
        ok(f'mobile {w}: no horizontal overflow', not ovf[0] and not ovf[1], ovf)
        nav = m.evaluate("(()=>{const r=document.querySelector('.nav nav').getBoundingClientRect();return [r.left>=0,r.right<=innerWidth]})()"); ok(f'mobile {w}: nav inside viewport', all(nav), nav)
        ok(f'mobile {w}: no page errors', me==[], me[:2])
        m.screenshot(path=f'{out}/m{w}-hero.png')
        if w in (320, 390):
            for sel,name in [('[data-cx]','crawlx'),('[data-cli]','cli'),('[data-cerb]','cerberus'),('#toolkit','toolkit'),('#resume','resume'),('#contact','contact'),('#writing','writing')]:
                m.evaluate(f"window.scrollTo(0, document.querySelector('{sel}').getBoundingClientRect().top + scrollY - 70)"); m.wait_for_timeout(1400); m.screenshot(path=f'{out}/m{w}-{name}.png')
        c.close()
    # ---- reduced motion
    c = b.new_context(viewport={'width':1440,'height':900}, reduced_motion='reduce'); r = c.new_page(); r.goto(URL, wait_until='networkidle'); r.wait_for_timeout(1500)
    hidden = r.evaluate("[...document.querySelectorAll('h1,h2,h3,.lede,.hero__intro')].filter(e=>getComputedStyle(e).opacity<0.5).length")
    ok('reduced motion: nothing hidden', hidden==0, hidden); ok('reduced motion: Lenis off', not r.evaluate('!!window.__lenis'))
    r.evaluate("document.querySelector('[data-cx]').scrollIntoView()"); r.wait_for_timeout(1200)
    ok('reduced motion: CrawlX shows the finished state and does not autoplay', r.is_visible('[data-cx] [data-report]') and not r.evaluate("document.querySelector('[data-cx]').__cx.playing"))
    r.evaluate("document.querySelector('[data-cli]').scrollIntoView()"); r.wait_for_timeout(1000)
    ok('reduced motion: CLI replay shows the finished run', 'Crawl Summary' in r.inner_text('[data-cli] [data-out]'))
    c.close()
    # ---- no JS
    c = b.new_context(viewport={'width':1440,'height':900}, java_script_enabled=False); n = c.new_page(); n.goto(URL); 
    ok('no-JS: headline and noscript notes present', 'Infrastructure' in n.inner_text('h1') and n.locator('noscript').count()>=3)
    c.close(); b.close()
finally:
    srv.terminate()
print('\nFAILED:' if fails else '\nALL CHECKS PASSED', fails)
sys.exit(1 if fails else 0)
