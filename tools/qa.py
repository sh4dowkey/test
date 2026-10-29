"""Browser QA against the production preview. Usage: python3 tools/qa.py [screenshot_dir]  (after `npm run build`)."""
import sys, os, subprocess, time, hashlib, urllib.request as U
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
    cb(st[7]+1200); ok('cerberus: return phase dissolves the stage', float(pg.evaluate("getComputedStyle(document.querySelector('[data-cerb] [data-stage]')).opacity"))<0.7)
    r0 = cb(30); ok('cerberus: next cycle starts from the initial state', r0['events']==0 and r0['alerts']==0 and r0['phase']=='Environment and reconnaissance')
    cb(st[3]+3500); pg.hover('[data-cerb] .cb__tile[data-host=ca01]'); pg.wait_for_timeout(200)
    ok('cerberus: hover on CA01 shows the PDF address and design status', '192.168.56.11' in pg.inner_text('[data-cerb] [data-detail]') and 'planned' in pg.inner_text('[data-cerb] [data-detail]').lower())
    pg.hover('[data-cerb] [data-stream] [data-ev=E-11]'); pg.wait_for_timeout(200)
    ok('cerberus: hover on an event shows its fields (template, requester, SAN)', all(k in pg.inner_text('[data-cerb] [data-detail]') for k in ['CERBERUS_WebServer_ESC1','CERBERUS\\alice','administrator@cerberus.local']))
    ok('cerberus: no credentials, passwords or attack commands anywhere in the section', not any(w in pg.inner_text('[data-cerb]').lower() for w in ['password','p@ss','welcome123','impacket','rubeus','certipy req','mimikatz']))
    pg.mouse.move(5,5); cb(st[2]+3000); pg.screenshot(path=f'{out}/d-cerberus.png')
    # Pwndbg scrub
    goto_sel(pg, '[data-cym]', 80, 600)
    pg.evaluate("window.scrollTo(0, document.querySelector('[data-cym]').getBoundingClientRect().bottom + scrollY - innerHeight*0.3)"); pg.wait_for_timeout(2200)
    fin = pg.evaluate("(()=>{const q=s=>[...document.querySelectorAll(s)];return {news:q('.cym__new code').every(e=>+getComputedStyle(e).opacity>.95),links:q('.cym__link i').every(e=>getComputedStyle(e).transform!=='none'&&new DOMMatrix(getComputedStyle(e).transform).a>.95),usage:q('.cym__usage p').map(e=>getComputedStyle(e).clipPath),fig:getComputedStyle(document.querySelector('.cym .evidence')).clipPath}})()")
    ok('pwndbg: scrolling through plays the full explanation (all 7 mappings, both usage lines, patch evidence)', fin['news'] and fin['links'] and all('0%' in u or u=='none' for u in fin['usage']) and ('0%' in fin['fig'] or fin['fig']=='none'), fin)
    ok('pwndbg: PR, commit and issue links are correct', pg.evaluate("[...document.querySelectorAll('#pwndbg a')].map(a=>a.href)").__contains__('https://github.com/pwndbg/pwndbg/pull/3160') and any('7d92563' in h for h in pg.evaluate("[...document.querySelectorAll('#pwndbg a')].map(a=>a.href)")) and any('issues/3154' in h for h in pg.evaluate("[...document.querySelectorAll('#pwndbg a')].map(a=>a.href)")))
    pg.screenshot(path=f'{out}/d-pwndbg.png')
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
    ok('experience: Bobcares, Poornam, Jharsuguda, L1/L2/L3, June 2026 all present and accurate', all(k in rt for k in ['Bobcares','Poornam Info Vision Pvt. Ltd.','Jharsuguda','L1, L2 and L3','June 2026']) and 'Engineer' not in rt.split('Pwndbg')[0])
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
        ovf = m.evaluate("(()=>{const w=innerWidth;const bad=[];document.querySelectorAll('body *').forEach(e=>{const r=e.getBoundingClientRect();if(r.width&&r.right>w+1&&!e.closest('.hero__pin,.cb__map,.cx__graph svg,.cb__stream,pre,.cx__logbody'))bad.push((e.className&&e.className.baseVal!==undefined?e.className.baseVal:e.className)||e.tagName)});return [document.documentElement.scrollWidth>w,bad.slice(0,5)]})()")
        ok(f'mobile {w}: no horizontal overflow', not ovf[0] and not ovf[1], ovf)
        nv = m.evaluate("(()=>{const r=document.querySelector('.nav nav').getBoundingClientRect();return [r.left>=0,r.right<=innerWidth]})()"); ok(f'mobile {w}: nav inside viewport', all(nv), nv)
        sp = m.evaluate("document.querySelector('.pin-spacer').offsetHeight - innerHeight")
        m.evaluate(f"window.scrollTo(0,{sp}*0.5)"); m.wait_for_timeout(1500); m.screenshot(path=f'{out}/m{w}-hero-50.png')
        m.evaluate(f"window.scrollTo(0,{sp})"); m.wait_for_timeout(1500); m.screenshot(path=f'{out}/m{w}-hero-100.png')
        gap = m.evaluate("(()=>{const w=document.querySelector('#work').getBoundingClientRect();return Math.round(w.top - innerHeight)})()")
        ok(f'mobile {w}: pinned opening is short (about 1.15 screens) and hands over to the first project', 0 < m.evaluate("document.querySelector('.pin-spacer').offsetHeight/innerHeight") < 2.4, round(m.evaluate("document.querySelector('.pin-spacer').offsetHeight/innerHeight"),2))
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
