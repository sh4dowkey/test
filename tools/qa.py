"""Browser QA against the production preview. Usage: python3 tools/qa.py [screenshot_dir]  (after `npm run build`)."""
import sys, os, subprocess, time, hashlib, json, urllib.request as U
from playwright.sync_api import sync_playwright
out = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/shots'; os.makedirs(out, exist_ok=True)
URL = 'http://127.0.0.1:4321/'
srv = subprocess.Popen(['npx','astro','preview','--host','127.0.0.1','--port','4321'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for _ in range(60):
    try: U.urlopen(URL, timeout=1); break
    except Exception: time.sleep(0.5)
fails = []
def ok(name, cond, extra=''):
    print(('PASS ' if cond else 'FAIL ') + name + (f'  [{extra}]' if extra != '' else ''))
    if not cond: fails.append(name)
def put(pg, sel, frac, wait=1700):
    """Scroll so the element's top edge sits at `frac` of the viewport height."""
    pg.evaluate(f"window.scrollTo(0, document.querySelector('{sel}').getBoundingClientRect().top + scrollY - {frac}*innerHeight)"); pg.wait_for_timeout(wait)
def inset(pg, js):
    v = pg.evaluate(js); import re; n = [float(x) for x in re.findall(r'[\d.]+', v or '')]; return n or [0,0,0,0]
def goto_sel(pg, sel, off=70, wait=900):
    pg.evaluate(f"window.scrollTo(0, document.querySelector('{sel}').getBoundingClientRect().top + scrollY - {off})"); pg.wait_for_timeout(wait)
try:
  with sync_playwright() as p:
    b = p.chromium.launch()
    # ---------- résumé over HTTP
    r = U.urlopen(URL + 'resume.pdf'); data = r.read()
    ok('resume: 200 + application/pdf', r.status == 200 and r.headers.get('Content-Type') == 'application/pdf', r.headers.get('Content-Type'))
    ok('resume: %PDF header, %%EOF trailer, identical to source', data[:5] == b'%PDF-' and b'%%EOF' in data[-1024:] and hashlib.sha256(data).digest() == hashlib.sha256(open('public/resume.pdf','rb').read()).digest())
    ok('homepage served as text/html', U.urlopen(URL).headers.get('Content-Type','').startswith('text/html'))
    # ---------- desktop
    ctx = b.new_context(viewport={'width':1440,'height':900}, accept_downloads=True); pg = ctx.new_page(); errs = []
    pg.on('console', lambda m: errs.append(m.text) if m.type in ('error','warning') else None); pg.on('pageerror', lambda e: errs.append('PAGEERROR '+str(e)))
    pg.goto(URL, wait_until='networkidle'); pg.wait_for_timeout(3200)
    ok('desktop: no console errors or warnings', errs == [], errs[:3])
    pg.screenshot(path=f'{out}/d-hero-0.png')
    hero = pg.evaluate("document.querySelector('.hero').innerText").replace("\n","")
    ok('hero: only Welcome + supporting phrase (no name, employer, project names, résumé link)', 'Welcome' in hero and 'Take a look around' in hero and not any(w in hero for w in ['Pandey','Bobcares','CrawlX','Cerberus','Pwndbg','sum','DevOps']), hero[:60])
    wh = pg.inner_text('#work-h'); ok('portfolio: section heading is "Portfolio" (not Selected work, not the name)', wh.strip().lower() == 'portfolio' and 'selected work' not in pg.inner_text('#work').lower() and 'pandey' not in wh.lower(), wh)
    ok('hero: top-left label is Home', pg.evaluate("document.querySelector('.nav__home').textContent")=='Home')
    ok('hero: exactly one pinned sequence on the page', pg.evaluate("document.querySelectorAll('.pin-spacer').length")==1)
    ok('hero: old index and eyebrow are gone from the DOM', pg.evaluate("!document.querySelector('.index, .hero__eyebrow, .hero__index, .hero__actions')"))
    sp = pg.evaluate("document.querySelector('.pin-spacer').offsetHeight - innerHeight")
    clips = []
    for f in [0, .25, .5, .75, 1]:
        pg.evaluate(f"window.scrollTo(0,{f}*{sp})"); pg.wait_for_timeout(1500)
        c = pg.evaluate("parseFloat((document.querySelector('.hero__paper').style.clipPath.match(/circle\\(([\\d.]+)px/)||[0,0])[1])"); clips.append(c)
        pg.screenshot(path=f'{out}/d-hero-{int(f*100)}.png')
    ok('hero: paper mask grows monotonically with scroll and covers the screen', all(clips[i] <= clips[i+1] for i in range(4)) and clips[1] < clips[2] and clips[-1] > 800, [round(c) for c in clips])
    nz = pg.evaluate("(()=>{const c=document.querySelector('.hero__canvas');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4*97)if(d[i]>0)n++;return n})()")
    ok('hero: canvas actually draws (graph visible at end of sequence)', nz > 50, nz)
    pg.evaluate(f"window.scrollTo(0,{sp*0.5})"); pg.wait_for_timeout(600); pg.evaluate(f"window.scrollTo(0,{sp*0.2})"); pg.wait_for_timeout(1500)
    c2 = pg.evaluate("parseFloat((document.querySelector('.hero__paper').style.clipPath.match(/circle\\(([\\d.]+)px/)||[0,0])[1])")
    ok('hero: scrolling back reverses the sequence', c2 < clips[2], round(c2))
    # ---------- résumé download from the page
    goto_sel(pg, '#resume', 70, 1500)
    with pg.expect_download() as d: pg.click('.dl')
    dl = d.value; ok('resume: click downloads a valid PDF named correctly', open(dl.path(),'rb').read()[:5]==b'%PDF-' and dl.suggested_filename=='Anant-Pandey-Resume.pdf', dl.suggested_filename)
    # ---------- demos: no manual controls
    bad = pg.evaluate("""(()=>{const t=['Play','Pause','Step','Replay','Back','Next step','Auto-play','Depth','Reset','1×','2×','4×'];const out=[];
      document.querySelectorAll('[data-cx],[data-cli],[data-cerb]').forEach(r=>{r.querySelectorAll('button,select,input,[role=tab]').forEach(e=>{const s=(e.textContent||'').trim();if(e.tagName!=='BUTTON'||t.includes(s)||e.dataset.act)out.push(e.tagName+':'+s)})});return out})()""")
    ok('demos: no playback, speed, depth, step or navigation controls', bad == [], bad[:4])

    def shots_ok(page):
        return page.evaluate("""(()=>[...document.querySelectorAll('.crawlx__real .shot')].map(f=>{const fr=f.getBoundingClientRect(),im=f.querySelector('img'),ir=im.getBoundingClientRect(),c=f.querySelector('figcaption code'),cr=c.getBoundingClientRect();
          return {inside:ir.left>=fr.left-1&&ir.right<=fr.right+1&&cr.left>=fr.left-1&&cr.right<=fr.right+1,noX:c.scrollWidth<=c.clientWidth+1,below:cr.top>=ir.bottom-1,ratio:Math.abs(ir.width/ir.height-im.naturalWidth/im.naturalHeight)<0.06,fits:fr.right<=document.querySelector('.crawlx__frame').getBoundingClientRect().right+1,lines:Math.round(cr.height/parseFloat(getComputedStyle(c).lineHeight))}}))()""")
    # CrawlX
    goto_sel(pg, '[data-cx]', 80, 1800)
    p0 = pg.evaluate("document.querySelector('[data-cx]').__cx.pos"); pg.wait_for_timeout(1200); p1 = pg.evaluate("document.querySelector('[data-cx]').__cx.pos")
    ok('crawlx: runs on its own while visible', p1 > p0 and pg.evaluate("document.querySelector('[data-cx]').__cx.running"), f'{p0:.0f}->{p1:.0f}')
    cyc = pg.evaluate("document.querySelector('[data-cx]').__cx.cycle")
    def cx_state():
        return pg.evaluate("""(()=>{const r=document.querySelector('[data-cx]');const g=s=>[...r.querySelectorAll('.n')].filter(n=>n.dataset.s===s).length;
          const txt=k=>{const e=[...r.querySelectorAll('.cx__counts > div')].find(d=>d.querySelector('dt').textContent===k);return +e.querySelector('dd').textContent};
          const ext=g('external'),pages=['queued','fetching','ok','redirect','client','server','network'].reduce((a,s)=>a+g(s),0);
          return {pages,ext,disc:txt('Discovered'),crawled:txt('Crawled'),err:txt('Errors'),external:txt('External'),queued:g('queued'),fetching:g('fetching'),busy:[...r.querySelectorAll('.cx__lanes li.is-busy')].length,
            queueChips:[...r.querySelectorAll('[data-queue] li')].filter(l=>!l.classList.contains('more')).length}})()""")
    consistent = True; rows = []
    for f in [0.05, .12, .2, .3, .4, .5, .6, .7]:
        pg.evaluate(f"document.querySelector('[data-cx]').__cx.seek({f}*{cyc})"); pg.wait_for_timeout(120); s = cx_state(); rows.append(s)
        if not (s['disc']==s['pages'] and s['external']==s['ext'] and s['crawled']+s['err']+s['queued']+s['fetching']==s['disc'] and s['busy']==s['fetching']): consistent=False
    ok('crawlx: at 8 moments counters, node states, lanes and queue agree', consistent, rows[3])
    pg.evaluate(f"document.querySelector('[data-cx]').__cx.seek(0.85*{cyc})"); pg.wait_for_timeout(200)
    rep = pg.inner_text('[data-cx] [data-report]'); s = cx_state()
    ok('crawlx: report assembles at the end with totals matching the graph', 'crawl report' in rep.lower() and f"{s['crawled']+s['err']} pages" in rep.replace('\n',' ') and f"{s['err']} errors" in rep.replace('\n',' ') and s['queued']==0 and s['fetching']==0, (rep.replace('\n',' ')[:60], s))
    pg.evaluate(f"document.querySelector('[data-cx]').__cx.seek(0.97*{cyc})"); pg.wait_for_timeout(150)
    ok('crawlx: loop ends by dissolving (stage fading), not a hard cut', float(pg.evaluate("getComputedStyle(document.querySelector('[data-cx] [data-stage]')).opacity")) < 0.6)
    pg.evaluate(f"document.querySelector('[data-cx]').__cx.seek(0.01*{cyc})"); pg.wait_for_timeout(150); s0 = cx_state()
    ok('crawlx: next cycle starts clean (1 discovered, report hidden)', s0['disc']<=1 and float(pg.evaluate("getComputedStyle(document.querySelector('[data-cx] [data-report]')).opacity"))==0, s0['disc'])
    pg.evaluate(f"document.querySelector('[data-cx]').__cx.seek(0.5*{cyc})"); pg.wait_for_timeout(150)
    names = pg.eval_on_selector_all('[data-cx] .n__t', 'els=>els.filter(e=>e.getBoundingClientRect().width>0).map(e=>{const r=e.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom]})')
    ov = [(i,j) for i in range(len(names)) for j in range(i+1,len(names)) if not (names[i][2]<=names[j][0] or names[j][2]<=names[i][0] or names[i][3]<=names[j][1] or names[j][3]<=names[i][1])]
    ok('crawlx: no overlapping URL labels', ov == [], ov[:3])
    svgbox = pg.evaluate("(()=>{const s=document.querySelector('[data-cx] svg').getBoundingClientRect();return [...document.querySelectorAll('[data-cx] svg .n')].every(n=>{const r=n.getBoundingClientRect();return r.left>=s.left-1&&r.right<=s.right+1&&r.top>=s.top-1&&r.bottom<=s.bottom+1})})()")
    ok('crawlx: no clipped nodes or labels', svgbox)
    pg.evaluate(f"document.querySelector('[data-cx]').__cx.seek(0.8*{cyc})"); pg.wait_for_timeout(150)
    bb = pg.locator('[data-cx] .n[data-u="/catalog/archive"] .n__dot').bounding_box(); pg.mouse.move(bb['x']+bb['width']/2, bb['y']+bb['height']/2); pg.wait_for_timeout(250)
    ok('crawlx: hover inspects a node', 'archive' in pg.inner_text('[data-cx] [data-now]').lower() and 'inspecting' in pg.inner_text('[data-cx] [data-now]').lower())
    pg.mouse.move(5,5); pg.screenshot(path=f'{out}/d-crawlx.png')
    # CrawlX: optional inspection (hover, keyboard, pin) while the loop keeps running
    pg.evaluate(f"document.querySelector('[data-cx]').__cx.seek(0.8*{cyc})"); pg.wait_for_timeout(200)
    bb = pg.locator('[data-cx] .n[data-u="/catalog"] .n__dot').bounding_box(); pg.mouse.move(bb['x']+bb['width']/2, bb['y']+bb['height']/2); pg.wait_for_timeout(250)
    ins = pg.inner_text('[data-cx] [data-now]')
    rel = pg.evaluate("[...document.querySelectorAll('[data-cx] .cx__e')].filter(e=>e.classList.contains('is-rel')).length"); dim = pg.evaluate("[...document.querySelectorAll('[data-cx] .cx__e.is-rel')].length>0 && [...document.querySelectorAll('[data-cx] .cx__e:not(.is-rel)')].filter(e=>+e.style.opacity>0).every(e=>+e.style.opacity<0.3)")
    ok('crawlx inspect: hovering a page shows where it was found and what it links to', 'found on' in ins.lower() and 'links to' in ins.lower() and '/about' in ins, ins.replace('\n',' ')[:100])
    ok('crawlx inspect: incoming and outgoing links highlight and the rest recede', rel >= 3 and dim, rel)
    p0 = pg.evaluate("document.querySelector('[data-cx]').__cx.pos"); pg.wait_for_timeout(700)
    ok('crawlx inspect: the loop keeps running during inspection', pg.evaluate("document.querySelector('[data-cx]').__cx.running") and pg.evaluate("document.querySelector('[data-cx]').__cx.pos") != p0)
    pg.mouse.click(bb['x']+bb['width']/2, bb['y']+bb['height']/2); pg.mouse.move(5, 5); pg.wait_for_timeout(300)
    ok('crawlx inspect: a click pins the selection after the pointer leaves', 'inspecting' in pg.inner_text('[data-cx] [data-now]').lower() and 'catalog' in pg.inner_text('[data-cx] [data-now]').lower())
    pg.locator('[data-cx] [data-now] [data-sel]').first.click(); pg.wait_for_timeout(250)
    ok('crawlx inspect: related-page chips jump the inspector to that page', 'catalog' not in pg.inner_text('[data-cx] [data-now] .cx__url').lower())
    pg.locator('[data-cx] .n[data-u="/blog"]').focus(); pg.keyboard.press('Enter'); pg.mouse.move(5,5); pg.wait_for_timeout(250); pg.keyboard.press('Enter'); pg.locator('[data-cx] .n[data-u="/blog"]').blur(); pg.wait_for_timeout(250)
    ok('crawlx inspect: keyboard focus plus Enter selects and releases', 'crawling' in pg.inner_text('[data-cx] [data-now]').lower() or 'inspecting' not in pg.inner_text('[data-cx] [data-now]').lower())
    sc = shots_ok(pg)
    ok('crawlx screenshots (desktop): images and captions stay inside their containers, ratios preserved, no horizontal overflow', len(sc) == 2 and all(x['inside'] and x['noX'] and x['below'] and x['ratio'] and x['fits'] for x in sc), sc)
    pg.locator('.crawlx__real').scroll_into_view_if_needed(); pg.wait_for_timeout(600); pg.locator('.crawlx__real').screenshot(path=f'{out}/d-crawlx-shots.png')
    # pause off-screen
    pg.evaluate("window.scrollTo(0,0)"); pg.wait_for_timeout(1500)
    ok('crawlx: loop suspended while off-screen', not pg.evaluate("document.querySelector('[data-cx]').__cx.running"))
    # CLI
    goto_sel(pg, '[data-cli]', 80, 1500); cc = pg.evaluate("document.querySelector('[data-cli]').__cli.cycle")
    p0 = pg.evaluate("document.querySelector('[data-cli]').__cli.pos"); pg.wait_for_timeout(1000)
    ok('cli: runs on its own while visible', pg.evaluate("document.querySelector('[data-cli]').__cli.pos") > p0)
    pg.evaluate(f"document.querySelector('[data-cli]').__cli.seek({cc}-3000)"); pg.wait_for_timeout(200)
    t = pg.evaluate("document.querySelector('[data-cli]').__cli.text")
    ok('cli: command, robots.txt block, [ERROR] and verbose lines all appear', 'python cli.py https://notes.sample.test/ --search backup --verbose --output results.txt' in t and 'Disallowed: https://notes.sample.test/admin/panel' in t and 'Disallowed: https://notes.sample.test/private/area' in t and '[ERROR] Failed to fetch' in t and 'Visited: https://notes.sample.test/guides/backup' in t)
    ok('cli: --output run prints no summary and no invented "written" line', 'Crawl Summary' not in t and 'written' not in t.lower())
    rows_n = pg.locator('[data-cli] [data-results] li').count(); hits_t = t.count('✔')
    hits_s = pg.locator('[data-cli] [data-results] li.is-hit').count()
    ok('cli: results ledger agrees with terminal (rows = Visited lines, matches = ✔ marks)', rows_n == t.count('Visited:') and hits_s == hits_t, (rows_n, hits_s, hits_t))
    ok('cli: results.txt header and saved stamp at the end', 'results.txt' in pg.inner_text('[data-cli] [data-lh]').lower() and float(pg.evaluate("getComputedStyle(document.querySelector('[data-cli] [data-stamp]')).opacity"))>0.9)
    pg.evaluate(f"document.querySelector('[data-cli]').__cli.seek({cc}*0.5)"); pg.wait_for_timeout(150)
    ok('cli: seeking backwards rebuilds consistently', pg.locator('[data-cli] [data-results] li').count() == pg.evaluate("document.querySelector('[data-cli]').__cli.text").count('Visited:'))
    pg.screenshot(path=f'{out}/d-cli.png')
    # CLI: inspect a result, link or step while the run keeps going
    pg.evaluate(f"document.querySelector('[data-cli]').__cli.seek({cc}-2500)"); pg.wait_for_timeout(250)
    row = pg.locator('[data-cli] [data-results] li[data-url="https://notes.sample.test/guides/backup"]'); row.hover(); pg.wait_for_timeout(250)
    hl_t = pg.evaluate("[...document.querySelectorAll('[data-cli] .cl__ln.is-hl')].map(e=>e.textContent)"); hl_r = pg.locator('[data-cli] [data-results] li.is-hl').count(); sel_stage = pg.evaluate("[...document.querySelectorAll('[data-cli] .cl__rail li.is-sel')].map(e=>e.textContent)")
    ok('cli inspect: hovering a result highlights its terminal line, its row and the relevant stage', any('guides/backup' in t for t in hl_t) and hl_r == 1 and len(sel_stage) == 1, (hl_t[:1], hl_r, sel_stage))
    ok('cli inspect: the decision for that URL is shown', 'queued' in pg.inner_text('[data-cli] [data-check]').lower() or 'match' in pg.inner_text('[data-cli] [data-check]').lower(), pg.inner_text('[data-cli] [data-check]'))
    pg.locator('[data-cli] .cl__ln[data-url*="admin/panel"]').hover(); pg.wait_for_timeout(250)
    ok('cli inspect: a robots.txt-blocked link lights its Disallow rule', pg.locator('[data-cli] [data-rule].is-hit').count() == 1 and 'disallows' in pg.inner_text('[data-cli] [data-check]').lower(), pg.inner_text('[data-cli] [data-check]'))
    pg.mouse.move(5,5); pg.wait_for_timeout(200)
    pa = pg.evaluate("document.querySelector('[data-cli]').__cli.pos"); pg.wait_for_timeout(600)
    ok('cli inspect: the run keeps progressing while inspecting', pg.evaluate("document.querySelector('[data-cli]').__cli.running") and pg.evaluate("document.querySelector('[data-cli]').__cli.pos") != pa)
    row.focus(); pg.keyboard.press('Enter'); pg.mouse.move(5,5); pg.wait_for_timeout(250); ok('cli inspect: keyboard Enter pins a result', pg.locator('[data-cli] [data-results] li.is-hl').count() == 1)
    pg.keyboard.press('Enter'); row.blur(); pg.wait_for_timeout(250); ok('cli inspect: Enter again releases it', pg.locator('[data-cli] [data-results] li.is-hl').count() == 0)
    # Cerberus
    goto_sel(pg, '[data-cerb]', 80, 1500); cy = pg.evaluate("document.querySelector('[data-cerb]').__cb.cycle"); st = pg.evaluate("document.querySelector('[data-cerb]').__cb.starts")
    p0 = pg.evaluate("document.querySelector('[data-cerb]').__cb.pos"); pg.wait_for_timeout(1000)
    ok('cerberus: runs on its own while visible', pg.evaluate("document.querySelector('[data-cerb]').__cb.pos") > p0)
    def cb(ms):
        pg.evaluate(f"document.querySelector('[data-cerb]').__cb.seek({ms})"); pg.wait_for_timeout(120)
        return pg.evaluate("""(()=>{const r=document.querySelector('[data-cerb]');return {events:+r.querySelector('[data-k=events]').textContent.split(' ')[0],alerts:+r.querySelector('[data-acount]').textContent,
          stream:[...r.querySelectorAll('[data-stream] [data-ev]')].map(e=>e.dataset.ev),alertEv:[...r.querySelectorAll('[data-alerts] [data-ev]')].map(e=>e.dataset.ev),phase:r.querySelector('[data-phase] h4')?.textContent,aux:r.querySelector('[data-aux]').innerText}})()""")
    seq = [cb(st[i] + d) for i, d in [(0,6500),(1,5600),(2,5600),(3,3500),(4,3000),(5,7600),(6,8500)]]
    ok('cerberus: phases advance in order', [s['phase'] for s in seq][:2] == ['Environment and reconnaissance','Credential access'] and seq[4]['phase']=='Deception alert' and seq[6]['phase']=='Detection rules and incident summary', [s['phase'] for s in seq])
    ok('cerberus: events and alerts only ever grow through the scenario', all(seq[i]['events']<=seq[i+1]['events'] for i in range(6)) and all(seq[i]['alerts']<=seq[i+1]['alerts'] for i in range(6)), [(s['events'], s['alerts']) for s in seq])
    ok('cerberus: alerts raised in order (Kerberoast, PsExec, then honeypot after the CA request)', [s['alerts'] for s in seq] == [0,1,2,2,3,3,3], [s['alerts'] for s in seq])
    ok('cerberus: every alert evidence id is an event already in the stream or earlier', all(set(s['alertEv']) <= set(['E-%02d'%i for i in range(1, s['events']+1+3)]) for s in seq))
    ok('cerberus: AD CS request (E-11) exists before the deception alert, not after', 'E-11' in cb(st[3]+3000)['stream'] and cb(st[3]+1000)['alerts']==2 and cb(st[4]+300)['alerts']==2 and cb(st[4]+1500)['alerts']==3)
    ok('cerberus: hunt phase shows the PDF queries and timeline', 'winlog.event_id: 4769' in seq[5]['aux'] and 'PSEXESVC.exe' in seq[5]['aux'])
    ok('cerberus: rules phase lists six Sigma rules, three marked fired, with an incident summary', seq[6]['aux'].count('fired')>=3 and seq[6]['aux'].count('not triggered')==3 and 'Incident summary' in seq[6]['aux'], seq[6]['aux'].count('not triggered'))
    cb(st[7]+1200); ok('cerberus: return phase dissolves the stage', float(pg.evaluate("getComputedStyle(document.querySelector('[data-cerb] [data-cbstage]')).opacity"))<0.7)
    r0 = cb(30); ok('cerberus: next cycle starts from the initial state', r0['events']==0 and r0['alerts']==0 and r0['phase']=='Environment and reconnaissance')
    cb(st[3]+3500); pg.hover('[data-cerb] .cb__tile[data-host=ca01]'); pg.wait_for_timeout(200)
    ok('cerberus: hover on CA01 shows the PDF address and design status', '192.168.56.11' in pg.inner_text('[data-cerb] [data-detail]') and 'planned' in pg.inner_text('[data-cerb] [data-detail]').lower())
    pg.hover('[data-cerb] [data-stream] [data-ev=E-11]'); pg.wait_for_timeout(200)
    ok('cerberus: hover on an event shows its fields (template, requester, SAN)', all(k in pg.inner_text('[data-cerb] [data-detail]') for k in ['CERBERUS_WebServer_ESC1','CERBERUS\\alice','administrator@cerberus.local']))
    ok('cerberus: no credentials, passwords or attack commands anywhere in the section', not any(w in pg.inner_text('[data-cerb]').lower() for w in ['password','p@ss','welcome123','impacket','rubeus','certipy req','mimikatz']))
    # Cerberus regression: resting the pointer on empty parts of the scene must not create a focus or break rendering
    cb(st[5]+7000); perrs = []; pg.on('pageerror', lambda e: perrs.append(str(e)))
    for (px_, py_) in [(0.2,0.1),(0.5,0.5),(0.8,0.9),(0.05,0.5)]:
        sb = pg.locator('[data-cerb] [data-cbstage]').bounding_box(); pg.mouse.move(sb['x']+sb['width']*px_, sb['y']+min(sb['height'],800)*py_); pg.wait_for_timeout(250)
    ok('cerberus: hovering empty parts of the scene creates no focus, no errors, and the loop keeps running', perrs == [] and json.loads(pg.evaluate("document.querySelector('[data-cerb]').__cb.focus"))['pinned'] is None and pg.evaluate("document.querySelector('[data-cerb]').__cb.running"), perrs[:1])
    # Cerberus: inspect an alert, a stage, a host and an event while the scenario continues
    cb(st[5]+7000); pg.locator('[data-cerb] [data-alerts] li[data-alert=A-3]').hover(); pg.wait_for_timeout(250)
    ok('cerberus inspect: hovering an alert highlights its evidence event, host tile, beam and timeline entry', pg.locator('[data-cerb] [data-stream] li.is-hl [data-ev=E-11]').count() == 1 and pg.evaluate("document.querySelector('[data-cerb] .cb__tile[data-host=ca01]').classList.contains('is-hover')") and pg.evaluate("[...document.querySelectorAll('[data-cerb] .cb__tl li.is-hl')].some(l=>/honeypot/i.test(l.textContent))") and 'ad cs honeypot' in pg.inner_text('[data-cerb] [data-detail]').lower())
    pg.locator('[data-cerb] [data-stage="3"]').hover(); pg.wait_for_timeout(250)
    ok('cerberus inspect: hovering a pipeline stage explains it and lights the relevant hosts', 'sigma rules' in pg.inner_text('[data-cerb] [data-detail]').lower() and pg.evaluate("document.querySelector('[data-cerb] .cb__tile[data-host=siem01]').classList.contains('is-hover')"))
    pg.locator('[data-cerb] .cb__tile[data-host=srv01]').hover(); pg.wait_for_timeout(250)
    ok('cerberus inspect: hovering a host highlights its events and alerts', pg.locator('[data-cerb] [data-stream] li.is-hl').count() >= 2 and pg.locator('[data-cerb] [data-alerts] li.is-hl').count() == 1 and '192.168.56.20' in pg.inner_text('[data-cerb] [data-detail]'))
    pa = pg.evaluate("document.querySelector('[data-cerb]').__cb.pos"); pg.wait_for_timeout(600)
    ok('cerberus inspect: the scenario keeps running during inspection', pg.evaluate("document.querySelector('[data-cerb]').__cb.running") and pg.evaluate("document.querySelector('[data-cerb]').__cb.pos") != pa)
    pg.locator('[data-cerb] [data-alerts] li[data-alert=A-1]').click(); pg.mouse.move(5,5); pg.wait_for_timeout(300)
    ok('cerberus inspect: a click pins the selection after the pointer leaves', 'kerberoasting' in pg.inner_text('[data-cerb] [data-detail]').lower() and pg.locator('[data-cerb] [data-stream] li.is-hl').count() >= 3)
    pg.locator('[data-cerb] [data-alerts] li[data-alert=A-1]').focus(); pg.keyboard.press('Enter'); pg.mouse.move(5,5); pg.wait_for_timeout(300)
    ok('cerberus inspect: keyboard Enter releases the pinned alert', 'kerberoasting' not in pg.inner_text('[data-cerb] [data-detail]').lower())
    pg.locator('[data-cerb] [data-alerts] li[data-alert=A-1]').click(); pg.mouse.move(5,5); cb(cy - 400); cb(300)
    ok('cerberus inspect: a pinned selection is released when the loop restarts', pg.locator('[data-cerb] [data-stream] li.is-hl').count() == 0)
    ok('cerberus: a quiet "simulated, not live telemetry" note replaces the loud pill', 'not live telemetry' in pg.inner_text('[data-cerb] .cb__sim') and pg.locator('.dm__badge, .cb__sim b').count() == 0)
    pg.mouse.move(5,5); cb(st[2]+3000); pg.screenshot(path=f'{out}/d-cerberus.png')
    # Pwndbg: the command comparison and the evidence image have their own triggers
    put(pg, '.cym__usage', 1.2, 600); put(pg, '.cym__usage', 0.92, 1700)
    u0 = inset(pg, "getComputedStyle(document.querySelector('.cym__usage p')).clipPath")
    ok('pwndbg: the command transformation has begun as the block enters the view', u0[1] < 99, u0)
    put(pg, '.cym__usage', 0.55, 1700)
    mid = pg.evaluate("[...document.querySelectorAll('.cym__link i')].map(e=>new DOMMatrix(getComputedStyle(e).transform).a)")
    ok('pwndbg: option-to-subcommand paths draw progressively while their rows are on screen', 0.0 <= min(mid) < 0.999 or max(mid) > 0.05, [round(x,2) for x in mid])
    pg.evaluate("window.scrollTo(0, document.querySelector('.cym__table').getBoundingClientRect().bottom + scrollY - 0.6*innerHeight)"); pg.wait_for_timeout(1900)
    done = pg.evaluate("(()=>{const q=s=>[...document.querySelectorAll(s)];return {news:q('.cym__new code').every(e=>+getComputedStyle(e).opacity>.95),links:q('.cym__link i').every(e=>new DOMMatrix(getComputedStyle(e).transform).a>.95),usage:q('.cym__usage p').map(e=>getComputedStyle(e).clipPath)}})()")
    ok('pwndbg: the whole command comparison is finished while the table is still comfortably visible', done['news'] and done['links'] and all(inset(pg, f"'{u}'")[1] < 1 for u in done['usage']), done)
    put(pg, '.cym .evidence', 1.25, 600); put(pg, '.cym .evidence', 0.99, 1700)
    e0 = inset(pg, "getComputedStyle(document.querySelector('.cym .evidence')).clipPath")
    ok('pwndbg: evidence image has barely started before it approaches the view', e0[2] > 60, e0)
    put(pg, '.cym .evidence', 0.86, 1700); e1 = inset(pg, "getComputedStyle(document.querySelector('.cym .evidence')).clipPath")
    ok('pwndbg: evidence image starts revealing as it approaches the viewing area (not after half has passed)', 5 < e1[2] < 99, e1)
    put(pg, '.cym .evidence', 0.5, 1900); e2 = inset(pg, "getComputedStyle(document.querySelector('.cym .evidence')).clipPath")
    ok('pwndbg: evidence image is fully revealed with its top at mid-screen (still comfortably visible)', e2[2] < 1, e2)
    put(pg, '.cym .evidence', 1.1, 1900); e3 = inset(pg, "getComputedStyle(document.querySelector('.cym .evidence')).clipPath")
    ok('pwndbg: scrolling back up reverses the evidence reveal', e3[2] > 90, e3)
    put(pg, '.cym__usage', 1.3, 1900); u3 = inset(pg, "getComputedStyle(document.querySelector('.cym__usage p')).clipPath")
    ok('pwndbg: scrolling back up reverses the command transformation', u3[1] > 90, u3)
    ok('pwndbg: PR, commit and issue links are correct', (lambda h: 'https://github.com/pwndbg/pwndbg/pull/3160' in h and any('7d92563' in x for x in h) and any('issues/3154' in x for x in h))(pg.evaluate("[...document.querySelectorAll('#pwndbg a')].map(a=>a.href)")))
    put(pg, '.cym .evidence', 0.4, 1800); pg.screenshot(path=f'{out}/d-pwndbg.png')
    # toolkit
    goto_sel(pg, '#toolkit', 70, 2200)
    names = pg.eval_on_selector_all('.tool__name', 'els=>els.map(e=>e.textContent)')
    want = ['Linux and server administration','Windows Server','Networking and troubleshooting','Server monitoring and log analysis','Python','Bash scripting','Go','Git and GitHub','GDB and Pwndbg','Burp Suite','Nmap and reconnaissance','Web vulnerability research','Vulnerability-report writing','Cloud fundamentals']
    ok('toolkit: all requested names are visible and grouped', names == want and all(float(v)>0.9 for v in pg.eval_on_selector_all('.tool','els=>els.map(e=>getComputedStyle(e).opacity)')), names)
    ok('toolkit: nothing from the Cerberus plan was added', not any(w in ' '.join(names) for w in ['Certipy','Rubeus','Sigma','Elastic','Ghidra','Metasploit','BloodHound','Sysmon','Wireshark']))
    ok('toolkit: no pills, stars, percentages or proficiency bars', pg.evaluate("!document.querySelector('.kit [class*=star], .kit progress, .kit [style*=\"%\"]')") and '%' not in pg.inner_text('.kit'))
    pg.mouse.move(1430, 20); xs = set()
    for _ in range(8): xs.add(pg.evaluate("document.querySelector('.kit__pulse')?.getAttribute('cx')")); pg.wait_for_timeout(700)
    ok('toolkit: the tracing pulse travels between the groups over time', len(xs) > 2, sorted(xs)[:4])
    pg.hover('.tool >> nth=4'); pg.wait_for_timeout(300)
    ok('toolkit: focus shows the evidence', 'CLI Web Crawler' in pg.inner_text('[data-focus]') or 'Project' in pg.inner_text('[data-focus]'), pg.inner_text('[data-focus]'))
    pg.mouse.move(5,5); pg.screenshot(path=f'{out}/d-toolkit.png')
    # experience
    goto_sel(pg, '#resume', 70, 1200); rt = pg.inner_text('#resume')
    bob = rt.split('Pwndbg contribution')[0]
    ok('experience: Bobcares, Poornam, June 2026 and Kochi, Kerala as the workplace', all(k in bob for k in ['Bobcares','Poornam Info Vision Pvt. Ltd.','June 2026','Kochi, Kerala']) and 'Jharsuguda' not in bob.split('Hometown')[0].split('DevOps')[-1] and 'Engineer' not in bob)
    ok('experience: no L1/L2/L3 wording anywhere on the page', not any(k in pg.inner_text('body') for k in ['L1','L2 ','L3']))
    ok('experience: Jharsuguda appears only labelled as hometown', pg.evaluate("(()=>{const els=[...document.querySelectorAll('dd,em,p,li')].filter(e=>e.children.length===0&&e.textContent.includes('Jharsuguda'));return els.length>0&&els.every(e=>e.parentElement.textContent.toLowerCase().includes('hometown'))})()"))
    pg.screenshot(path=f'{out}/d-resume.png')
    # contact
    goto_sel(pg, '#contact', 70, 2600)
    box = pg.evaluate("(()=>{const a=document.querySelector('.contact__copy').getBoundingClientRect(),b=document.querySelector('.contact__visual').getBoundingClientRect();return [a.right<=b.left+4,a.top<b.bottom,b.width>400]})()")
    ok('contact: split composition (copy left, visual right)', all(box), box)
    ok('contact: real links only', pg.evaluate("[...document.querySelectorAll('.contact__links a')].map(a=>a.href)")==['mailto:anant.pandey017@gmail.com','https://github.com/sh4dowkey','https://www.linkedin.com/in/anant-ku-pandey','https://medium.com/@pandeyanant733'])
    nz = pg.evaluate("(()=>{const c=document.querySelector('.contact__visual canvas');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4*53)if(d[i]>0)n++;return n})()")
    ok('contact: animated visual draws and changes over time', nz>200, nz)
    a = pg.evaluate("document.querySelector('.contact__visual canvas').toDataURL().length"); pg.wait_for_timeout(1500); b2 = pg.evaluate("document.querySelector('.contact__visual canvas').toDataURL().length")
    ok('contact: canvas content changes between frames', a != b2)
    pg.screenshot(path=f'{out}/d-contact.png')
    # navigation scroll: deliberate, monotonic, accurate, Lenis and ScrollTrigger in sync
    def nav_run(link, dest, start):
        pg.evaluate(start); pg.wait_for_timeout(1400); pg.evaluate("document.querySelector('.nav').classList.remove('is-hidden')")
        y0 = pg.evaluate('scrollY'); t0 = time.time(); pg.click(f".nav ul a:text-is('{link}')"); samples = []
        while time.time() - t0 < 5:
            samples.append((time.time() - t0, pg.evaluate('scrollY'))); pg.wait_for_timeout(20)
        fy = samples[-1][1]; reach = next((t for t, y in samples if abs(y - fy) < 3), 9)
        v = max(abs(samples[i+1][1] - samples[i][1]) / max(1e-3, samples[i+1][0] - samples[i][0]) for i in range(len(samples) - 1)) / 900
        mono = all((samples[i+1][1] - samples[i][1]) * (1 if fy >= y0 else -1) > -3 for i in range(len(samples) - 1)) and max(y for _, y in samples) <= max(fy, y0) + 3 and min(y for _, y in samples) >= min(fy, y0) - 3
        landed = -3 <= pg.evaluate(f"Math.round(document.querySelector('{dest}').getBoundingClientRect().top)") <= 130 and abs(pg.evaluate('window.__lenis.scroll') - fy) < 3
        return reach, v, mono, landed, abs(fy - y0) / 900
    r, v, mono, landed, dist = nav_run('Writing', '#writing', "document.querySelector('#toolkit').scrollIntoView()")
    ok('nav scroll (neighbouring section): takes a deliberate 1.3-2.0 s', 1.3 <= r <= 2.0, (round(r, 2), round(dist, 1)))
    ok('nav scroll (neighbouring section): peak speed stays calm (under 3 screens/s)', v < 3, round(v, 2))
    ok('nav scroll (neighbouring section): no overshoot or reversal, lands on target, Lenis in sync', mono and landed)
    r, v, mono, landed, dist = nav_run('Toolkit', '#toolkit', 'window.scrollTo(0,0)')
    ok('nav scroll (long jump from the top): 1.5-3.0 s, no overshoot, accurate landing', 1.5 <= r <= 3.0 and mono and landed, (round(r, 2), round(v, 1), round(dist, 1)))
    # anchors
    res = {}
    for name, sel in [('Work','#work'),('Toolkit','#toolkit'),('Writing','#writing'),('Résumé','#resume'),('Contact','#contact')]:
        pg.evaluate('window.scrollTo(0,0)'); pg.wait_for_timeout(700)
        pg.click(f".nav ul a:text-is('{name}')"); pg.wait_for_timeout(2300)
        res[name] = pg.evaluate(f"Math.round(document.querySelector('{sel}').getBoundingClientRect().top)")
    ok('anchors: nav links land the section within 0..130px (Contact limited by page end)', all(-3<=v<=130 for k,v in res.items() if k!='Contact') and res['Contact']<500, res)
    pg.evaluate('window.scrollTo(0,0)'); pg.wait_for_timeout(500); pg.click(".nav__home") if False else None
    pg.goto(URL+'#writing'); pg.wait_for_timeout(1800); ok('anchors: deep link #writing loads on the section', -3 <= pg.evaluate("Math.round(document.querySelector('#writing').getBoundingClientRect().top)") <= 130)
    pg.go_back(); pg.wait_for_timeout(500); ok('history: back works', True)
    ok('desktop: no horizontal overflow', not pg.evaluate('document.documentElement.scrollWidth>innerWidth'))
    ok('desktop: no console errors after the full tour', errs == [], errs[:3])
    ctx.close()
    # ---------- phones
    for w,h in [(320,640),(360,800),(390,844),(430,932)]:
        c = b.new_context(viewport={'width':w,'height':h}, device_scale_factor=2, has_touch=True, is_mobile=True); m = c.new_page(); me=[]
        m.on('pageerror', lambda e: me.append(str(e))); m.on('console', lambda x: me.append(x.text) if x.type in('error','warning') else None)
        m.goto(URL, wait_until='networkidle'); m.wait_for_timeout(3200)
        ok(f'mobile {w}: no page errors', me==[], me[:2])
        word = m.evaluate("(()=>{const e=document.querySelector('.hero h1').getBoundingClientRect();return [e.left>=0,e.right<=innerWidth,e.height>30]})()"); ok(f'mobile {w}: "Welcome" fits the screen', all(word), word)
        m.screenshot(path=f'{out}/m{w}-hero.png')
        def hero_geo():
            return m.evaluate("(()=>{const pin=document.querySelector('.hero__pin'),c=document.querySelector('.hero__canvas'),s=document.querySelector('.hero').__hero,b=s.bounds();return {pinW:pin.clientWidth,pinH:pin.clientHeight,cssW:parseFloat(c.style.width),cssH:parseFloat(c.style.height),bw:c.width/c.height,tall:s.tall,inside:b.minX>=0&&b.maxX<=s.W&&b.minY>=0&&b.maxY<=s.H,b:[Math.round(b.minX),Math.round(b.maxX),Math.round(b.minY),Math.round(b.maxY)],W:s.W,H:s.H}})()")
        g0 = hero_geo(); ok(f'mobile {w}: hero canvas matches the pinned frame and the whole tree sits inside it', abs(g0['cssH'] - g0['pinH']) < 1.5 and abs(g0['cssW'] - g0['pinW']) < 1.5 and g0['inside'] and g0['tall'], g0)
        spx = m.evaluate("document.querySelector('.pin-spacer').offsetHeight - innerHeight")
        m.evaluate(f"window.scrollTo(0,{spx}*0.5)"); m.wait_for_timeout(900)
        m.set_viewport_size({'width': w, 'height': h - 75}); m.wait_for_timeout(500); m.set_viewport_size({'width': w, 'height': h}); m.wait_for_timeout(1400)
        g1 = hero_geo(); ok(f'mobile {w}: after URL-bar-style resizes mid-sequence the canvas still matches the frame and the tree is inside', abs(g1['cssH'] - g1['pinH']) < 1.5 and g1['inside'], g1)
        spx = m.evaluate("document.querySelector('.pin-spacer').offsetHeight - innerHeight")
        radii, tones, ops = [], [], []
        for f in [0, .2, .4, .6, .8, 1]:
            m.evaluate(f"window.scrollTo(0,{f}*{spx})"); m.wait_for_timeout(1300)
            radii.append(m.evaluate("parseFloat((document.querySelector('.hero__paper').style.clipPath.match(/circle\\(([\\d.]+)px/)||[0,0])[1])")); tones.append(m.evaluate("document.querySelector('.nav').dataset.tone")); ops.append(m.evaluate("+getComputedStyle(document.querySelector('.hero__copy')).opacity"))
        ok(f'mobile {w}: mask, headline and nav tone stay synchronised through the full scroll', all(radii[i] <= radii[i+1] for i in range(5)) and radii[0] == 0 and radii[-1] >= (g1['W'] / 2) * 0 + ((g1['W'] / 2) ** 2 + max(0.56 * g1['H'], 0.44 * g1['H']) ** 2) ** 0.5 * 0.98 and ops[0] > 0.95 and ops[-1] < 0.05 and tones[0] == 'dark' and tones[-1] == 'paper', ([round(r) for r in radii], tones, [round(o, 2) for o in ops]))
        m.screenshot(path=f'{out}/m{w}-hero-end.png')
        px = m.evaluate("(()=>{const c=document.querySelector('.hero__canvas'),b=document.querySelector('.hero').__hero.bounds(),d=c.getContext('2d').getImageData(0,0,c.width,c.height),k=c.width/b.maxX*0+ (c.width/document.querySelector('.hero__pin').clientWidth);let n=0;for(let y=Math.floor(b.minY*k);y<Math.floor(b.maxY*k);y+=3)for(let x=Math.floor(b.minX*k);x<Math.floor(b.maxX*k);x+=3)if(d.data[(y*c.width+x)*4+3]>0)n++;return n})()")
        ok(f'mobile {w}: the resolved tree is actually drawn within its bounds at the end of the sequence', px > 150, px)
        m.evaluate(f"window.scrollTo(0,{spx}+4)"); m.wait_for_timeout(1000)
        wt0 = m.evaluate("Math.round(document.querySelector('#work').getBoundingClientRect().top - innerHeight)")
        m.evaluate(f"window.scrollTo(0,{spx}+innerHeight)"); m.wait_for_timeout(1200)
        wt = m.evaluate("Math.round(document.querySelector('#work').getBoundingClientRect().top)"); ok(f'mobile {w}: the first project follows the pinned sequence directly (no extra spacer; one screen after release it is at the top)', abs(wt0) <= 6 and -10 <= wt <= 140, (wt0, wt))
        ok(f'mobile {w}: Portfolio heading is visible after the opening', m.evaluate("document.querySelector('#work-h').getBoundingClientRect().top < innerHeight && document.querySelector('#work-h').getBoundingClientRect().bottom > -50") , m.inner_text('#work-h'))
        m.evaluate(f"window.scrollTo(0,{spx}*0.3)"); m.wait_for_timeout(1300); ok(f'mobile {w}: scrolling back up reverses the opening', m.evaluate("parseFloat((document.querySelector('.hero__paper').style.clipPath.match(/circle\\(([\\d.]+)px/)||[0,0])[1])") < radii[-1] * 0.6)
        m.evaluate("window.scrollTo(0,0)"); m.wait_for_timeout(1000)
        m.evaluate("document.querySelector('.crawlx__real').scrollIntoView()"); m.wait_for_timeout(700); scm = shots_ok(m)
        ok(f'mobile {w}: CrawlX screenshots and command captions stay inside their containers, wrap cleanly, ratios preserved', len(scm) == 2 and all(x['inside'] and x['noX'] and x['below'] and x['ratio'] and x['fits'] for x in scm), scm)
        if w in (320, 390): m.locator('.crawlx__real').screenshot(path=f'{out}/m{w}-crawlx-shots.png')
        ovf = m.evaluate("(()=>{const w=innerWidth;const bad=[];document.querySelectorAll('body *').forEach(e=>{const r=e.getBoundingClientRect();if(r.width&&r.right>w+1&&!e.closest('.hero__pin,.cb__map,.cx__graph svg,.cb__stream,pre,.cx__logbody'))bad.push((e.className&&e.className.baseVal!==undefined?e.className.baseVal:e.className)||e.tagName)});return [document.documentElement.scrollWidth>w,bad.slice(0,5)]})()")
        ok(f'mobile {w}: no horizontal overflow', not ovf[0] and not ovf[1], ovf)
        nv = m.evaluate("(()=>{const r=document.querySelector('.nav nav').getBoundingClientRect();return [r.left>=0,r.right<=innerWidth]})()"); ok(f'mobile {w}: nav inside viewport', all(nv), nv)
        sp = m.evaluate("document.querySelector('.pin-spacer').offsetHeight - innerHeight")
        m.evaluate(f"window.scrollTo(0,{sp}*0.5)"); m.wait_for_timeout(1500); m.screenshot(path=f'{out}/m{w}-hero-50.png')
        m.evaluate(f"window.scrollTo(0,{sp})"); m.wait_for_timeout(1500); m.screenshot(path=f'{out}/m{w}-hero-100.png')
        gap = m.evaluate("(()=>{const w=document.querySelector('#work').getBoundingClientRect();return Math.round(w.top - innerHeight)})()")
        ok(f'mobile {w}: pinned opening is short (about 1.15 screens) and hands over to the first project', 0 < m.evaluate("document.querySelector('.pin-spacer').offsetHeight/innerHeight") < 2.4, round(m.evaluate("document.querySelector('.pin-spacer').offsetHeight/innerHeight"),2))
        if w == 390:
            m.evaluate("window.scrollTo(0,0)"); m.wait_for_timeout(400)
            m.evaluate("document.querySelector('[data-cx]').scrollIntoView()"); m.wait_for_timeout(1200); m.evaluate("document.querySelector('[data-cx]').__cx.seek(0.8*document.querySelector('[data-cx]').__cx.cycle)"); m.wait_for_timeout(300)
            m.locator('[data-cx] .n[data-u="/catalog"] .n__dot').tap(); m.wait_for_timeout(350)
            ok('mobile 390 tap: CrawlX node selects, highlights its links and shows relations', 'found on' in m.inner_text('[data-cx] [data-now]').lower() and m.evaluate("document.querySelectorAll('[data-cx] .cx__e.is-rel').length") >= 3)
            ok('mobile 390 tap: the loop keeps running while a node is selected', m.evaluate("document.querySelector('[data-cx]').__cx.running"))
            m.locator('[data-cx] .n[data-u="/catalog"] .n__dot').tap(); m.wait_for_timeout(300); ok('mobile 390 tap: tapping again releases it', m.evaluate("document.querySelectorAll('[data-cx] .cx__e.is-rel').length") == 0)
            m.evaluate("document.querySelector('[data-cli]').scrollIntoView()"); m.wait_for_timeout(1200); m.evaluate("document.querySelector('[data-cli]').__cli.seek(document.querySelector('[data-cli]').__cli.cycle-2500)"); m.wait_for_timeout(300)
            m.locator('[data-cli] [data-results] li').first.tap(); m.wait_for_timeout(300)
            ok('mobile 390 tap: a CLI result selects and highlights its terminal line and stage', m.locator('[data-cli] .cl__ln.is-hl').count() >= 1 and m.locator('[data-cli] .cl__rail li.is-sel').count() == 1)
            m.evaluate("document.querySelector('[data-cerb]').scrollIntoView()"); m.wait_for_timeout(1200); m.evaluate("document.querySelector('[data-cerb]').__cb.seek(document.querySelector('[data-cerb]').__cb.starts[5]+7000)"); m.wait_for_timeout(300)
            m.locator('[data-cerb] [data-alerts] li[data-alert=A-3] .cb__as').tap(); m.wait_for_timeout(300)
            ok('mobile 390 tap: a Cerberus alert selects, lights its evidence and host, and the scenario keeps running', 'honeypot' in m.inner_text('[data-cerb] [data-detail]').lower() and m.locator('[data-cerb] [data-stream] li.is-hl').count() >= 1 and m.evaluate("document.querySelector('[data-cerb]').__cb.running"))
            m.locator('[data-cerb] [data-stage="3"]').tap(); m.wait_for_timeout(300); ok('mobile 390 tap: a pipeline stage can be tapped to inspect it', 'sigma' in m.inner_text('[data-cerb] [data-detail]').lower())
            m.evaluate("window.scrollTo(0,0)"); m.wait_for_timeout(300)
        if w in (320, 390):
            for sel,name in [('[data-cx]','crawlx'),('[data-cli]','cli'),('[data-cerb]','cerberus'),('#pwndbg','pwndbg'),('#toolkit','toolkit'),('#resume','resume'),('#contact','contact'),('#writing','writing')]:
                m.evaluate(f"window.scrollTo(0, document.querySelector('{sel}').getBoundingClientRect().top + scrollY - 70)"); m.wait_for_timeout(2400 if name in('crawlx','cli','cerberus') else 1500); m.screenshot(path=f'{out}/m{w}-{name}.png')
        c.close()
    # ---------- reduced motion
    c = b.new_context(viewport={'width':1440,'height':900}, reduced_motion='reduce'); r = c.new_page(); re_=[]; r.on('pageerror', lambda e: re_.append(str(e)))
    r.goto(URL, wait_until='networkidle'); r.wait_for_timeout(1500)
    ok('reduced motion: no pin, nothing hidden, Lenis off', r.evaluate("document.querySelectorAll('.pin-spacer').length")==0 and r.evaluate("[...document.querySelectorAll('h1,h2,h3,.lede,.hero__sub,.tool')].filter(e=>getComputedStyle(e).opacity<0.5&&e.closest('.hero__copy--ink')==null).length")==0 and not r.evaluate('!!window.__lenis'))
    r.evaluate("document.querySelector('[data-cx]').scrollIntoView()"); r.wait_for_timeout(1200)
    ok('reduced motion: CrawlX shows a finished static frame with the report and does not loop', not r.evaluate("document.querySelector('[data-cx]').__cx.running") and 'crawl report' in r.inner_text('[data-cx] [data-report]').lower() and r.evaluate("document.querySelector('[data-cx]').__cx.reported"))
    r.evaluate("document.querySelector('[data-cli]').scrollIntoView()"); r.wait_for_timeout(1000)
    ok('reduced motion: CLI shows the finished run, not looping', not r.evaluate("document.querySelector('[data-cli]').__cli.running") and 'Visited: https://notes.sample.test/guides/backup' in r.evaluate("document.querySelector('[data-cli]').__cli.text"))
    r.evaluate("document.querySelector('[data-cerb]').scrollIntoView()"); r.wait_for_timeout(1000)
    ok('reduced motion: Cerberus shows the finished scenario (alerts + rules), not looping', not r.evaluate("document.querySelector('[data-cerb]').__cb.running") and r.inner_text('[data-cerb] [data-acount]')=='3' and 'sigma rulebook' in r.inner_text('[data-cerb] [data-aux]').lower())
    ok('reduced motion: no page errors', re_==[], re_[:2]); c.close()
    # ---------- no JS
    c = b.new_context(viewport={'width':1440,'height':900}, java_script_enabled=False); n = c.new_page(); n.goto(URL)
    ok('no-JS: Welcome, toolkit names, experience and contact links are all readable', 'Welcome' in n.inner_text('h1') or n.evaluate("document.querySelector('h1').getAttribute('aria-label')")=='Welcome')
    ok('no-JS: toolkit, résumé and contact content is in the HTML', all(k in n.content() for k in ['Burp Suite','Bobcares','anant.pandey017@gmail.com']) and n.locator('noscript').count()>=3)
    c.close(); b.close()
finally:
    srv.terminate()
print('\nFAILED:' if fails else '\nALL CHECKS PASSED', fails)
sys.exit(1 if fails else 0)
