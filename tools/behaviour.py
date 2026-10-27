"""Behaviour checks against the production preview. Usage: python3 tools/behaviour.py [outdir]
Checks: overflow, dead space after the opening, anchors, résumé download (byte compare), links, toolkit and contact
interactions, copy button, image containment, reduced motion, no-JS."""
import sys, os, subprocess, time, json, hashlib, urllib.request as U
from playwright.sync_api import sync_playwright
out = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/shots'; os.makedirs(out, exist_ok=True)
URL = 'http://127.0.0.1:4321/'
srv = subprocess.Popen(['npx','astro','preview','--host','127.0.0.1','--port','4321'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for _ in range(60):
    try: U.urlopen(URL, timeout=1); break
    except Exception: time.sleep(0.5)
R = {}
def ok(k, v): R[k] = v; print(('PASS ' if v is True or (isinstance(v,(int,float)) and not isinstance(v,bool)) else 'INFO ' if not isinstance(v,bool) else 'FAIL ') + k + ('' if isinstance(v,bool) else f': {v}'))
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        # ---------- desktop
        ctx = b.new_context(viewport={'width':1440,'height':900}, accept_downloads=True)
        ctx.grant_permissions(['clipboard-read','clipboard-write'])
        pg = ctx.new_page(); errs=[]
        pg.on('console', lambda m: errs.append(m.text) if m.type in ('error','warning') else None)
        pg.on('pageerror', lambda e: errs.append('PAGEERROR '+str(e)))
        pg.goto(URL, wait_until='networkidle'); pg.wait_for_timeout(2500)
        ok('desktop: no console errors', errs == [])
        ok('desktop: no horizontal overflow', not pg.evaluate('document.documentElement.scrollWidth>innerWidth'))
        ok('desktop: Lenis active', pg.evaluate('!!window.__lenis'))
        ok('desktop: pinned elements (expect 0)', pg.evaluate("document.querySelectorAll('.pin-spacer').length") == 0)
        # opening: how far does the user scroll before the first project heading is on screen, and is there ever a blank screen?
        vh = 900
        r = pg.evaluate("(()=>{const h=document.querySelector('.hero').getBoundingClientRect().height;const c=document.querySelector('#crawlx-h').getBoundingClientRect().top+scrollY;return [h,c]})()")
        ok('opening: hero height px', round(r[0]))
        ok('opening: scroll distance until the CrawlX heading is in view (viewport heights)', round((r[1]-vh*0.8)/vh, 2))
        blank = []
        for y in range(0, int(r[0])+vh, 150):
            pg.evaluate(f'window.__lenis? window.__lenis.scrollTo({y},{{immediate:true}}):window.scrollTo(0,{y})'); pg.wait_for_timeout(120)
            # fraction of the viewport that holds real content = not just the dark hero glow: sample text elements intersecting
            n = pg.evaluate("[...document.querySelectorAll('h1,h2,h3,p,li,figure,dl')].filter(e=>{const r=e.getBoundingClientRect();const o=+getComputedStyle(e).opacity;return r.bottom>0&&r.top<innerHeight&&r.height>0&&o>0.2}).length")
            if n < 3: blank.append((y, n))
        ok('opening: scroll positions with <3 visible content blocks', blank)
        # anchors
        res = {}
        for name, sel in [('Work','#work'),('Toolkit','#toolkit'),('Writing','#writing'),('Résumé','#resume'),('Contact','#contact')]:
            pg.evaluate('window.scrollTo(0,0)'); pg.wait_for_timeout(700)
            pg.evaluate("document.querySelector('.nav').classList.remove('is-hidden')")
            pg.click(f".nav ul a:text-is('{name}')"); pg.wait_for_timeout(2200)
            res[name] = pg.evaluate(f"Math.round(document.querySelector('{sel}').getBoundingClientRect().top)")
        ok('anchors: target top after click (px from viewport top)', res)
        ok('anchors: all within 0..130', all(-2 <= v <= 130 for v in res.values()))
        # wheel responsiveness
        pg.evaluate('window.scrollTo(0,0)'); pg.wait_for_timeout(600); pg.mouse.move(700,450); y0 = pg.evaluate('scrollY'); pg.mouse.wheel(0,600); pg.wait_for_timeout(80)
        first = pg.evaluate('scrollY') - y0; pg.wait_for_timeout(1800)
        ok('wheel: moved within 80 ms (px)', round(first)); ok('wheel: settled at 600', round(pg.evaluate('scrollY')) == 600)
        # résumé download
        with pg.expect_download() as d: pg.evaluate("document.querySelector('.dl').click()")
        dl = d.value; path = f'{out}/downloaded.pdf'; dl.save_as(path)
        a = hashlib.sha256(open(path,'rb').read()).hexdigest(); bb = hashlib.sha256(open('public/resume.pdf','rb').read()).hexdigest()
        ok('résumé: downloaded file is byte-identical to public/resume.pdf', a == bb); ok('résumé: suggested filename', dl.suggested_filename)
        ok('résumé: starts with %PDF', open(path,'rb').read(5) == b'%PDF-')
        # links
        links = pg.evaluate("[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href'))")
        ext = sorted({l for l in links if l.startswith('http') or l.startswith('mailto')})
        ok('links: external + mailto (unique)', ext)
        ids = [l for l in set(links) if l.startswith('#') and len(l) > 1]
        ok('links: every in-page anchor has a target', [i for i in ids if not pg.evaluate(f"!!document.querySelector('{i}')")] == [])
        # images contained
        bad = pg.evaluate("""[...document.querySelectorAll('.crawlx__frame img, .evidence img')].filter(i=>{const f=i.closest('figure').getBoundingClientRect(), r=i.getBoundingClientRect();return r.left<f.left-1||r.right>f.right+1}).length""")
        ok('media: images inside their figures', bad == 0)
        ov = pg.evaluate("""(()=>{const fr=document.querySelector('.crawlx__frame').getBoundingClientRect();const t=document.querySelector('.project--crawlx .project__text').getBoundingClientRect();return t.right<=fr.left+1})()""")
        ok('media: CrawlX text does not overlap the frame', ov)
        # toolkit interaction
        pg.evaluate("window.scrollTo(0, document.querySelector('#toolkit').getBoundingClientRect().top+scrollY-40)"); pg.wait_for_timeout(1800)
        pg.hover(".tool:text-is('Python')"); pg.wait_for_timeout(1000)
        st = pg.evaluate("({chips:[...document.querySelectorAll('.chip.is-on')].map(c=>c.dataset.id), paths:document.querySelectorAll('.kit__trace path').length, on:[...document.querySelectorAll('.tool.is-on')].map(t=>t.textContent.trim().split(' (')[0])})")
        ok('toolkit: hover Python -> related chips and trace paths', st)
        pg.screenshot(path=f'{out}/d_kit_hover.png')
        pg.hover(".chip[data-id='crawlx']"); pg.wait_for_timeout(900)
        ok('toolkit: hover CrawlX chip -> tools', pg.evaluate("[...document.querySelectorAll('.tool.is-on')].map(t=>t.textContent.trim().split(' (')[0])"))
        pg.mouse.move(5,5); pg.focus(".tool:text-is('Go')"); pg.wait_for_timeout(700)
        ok('toolkit: keyboard focus on Go -> chip', pg.evaluate("[...document.querySelectorAll('.chip.is-on')].map(c=>c.dataset.id)"))
        pg.keyboard.press('Enter'); pg.mouse.move(5,5); pg.wait_for_timeout(500)
        ok('toolkit: Enter locks selection', pg.evaluate("document.querySelector('.tool[aria-pressed=true]')?.textContent.trim().split(' (')[0]"))
        # contact interaction
        pg.evaluate("window.scrollTo(0, document.querySelector('#contact').getBoundingClientRect().top+scrollY-30)"); pg.wait_for_timeout(2600)
        y_email = pg.evaluate("document.querySelector('.channels__signal').getBoundingClientRect().top")
        pg.hover(".channel[data-k='github'] a"); pg.wait_for_timeout(1100)
        y_gh = pg.evaluate("document.querySelector('.channels__signal').getBoundingClientRect().top")
        ok('contact: signal moves to hovered row (px)', round(y_gh - y_email)); pg.screenshot(path=f'{out}/d_contact_hover.png')
        pg.mouse.move(5,5); pg.wait_for_timeout(1000)
        y_back = pg.evaluate("document.querySelector('.channels__signal').getBoundingClientRect().top")
        ok('contact: signal returns to Email on leave', abs(y_back - y_email) < 2)
        pg.keyboard.press('Tab'); pg.focus(".channel[data-k='linkedin'] a"); pg.wait_for_timeout(900)
        ok('contact: keyboard focus moves the signal', pg.evaluate("document.querySelector('.channel.is-active').dataset.k") == 'linkedin')
        pg.click('.copy'); pg.wait_for_timeout(300)
        ok('contact: copy button feedback', pg.inner_text('.copy'))
        try: ok('contact: clipboard contents', pg.evaluate('navigator.clipboard.readText()'))
        except Exception as e: ok('contact: clipboard contents', 'unreadable in headless: ' + str(e)[:60])
        # text selectable
        sel = pg.evaluate("(()=>{const e=document.querySelector('.channel[data-k=email] .channel__handle');const r=document.createRange();r.selectNodeContents(e);const s=getSelection();s.removeAllRanges();s.addRange(r);return s.toString()})()")
        ok('contact: email text is selectable', sel)
        # back/forward restore
        ctx.close()
        # ---------- mobile checks
        for (w,h) in [(390,844),(360,800)]:
            c2 = b.new_context(viewport={'width':w,'height':h}, is_mobile=True, has_touch=True)
            m = c2.new_page(); me=[]
            m.on('console', lambda mm: me.append(mm.text) if mm.type in ('error','warning') else None)
            m.on('pageerror', lambda e: me.append(str(e)))
            m.goto(URL, wait_until='networkidle'); m.wait_for_timeout(2400)
            ok(f'mobile {w}x{h}: no horizontal overflow', not m.evaluate('document.documentElement.scrollWidth>innerWidth'))
            ok(f'mobile {w}x{h}: no console errors', me == [])
            ok(f'mobile {w}x{h}: nav fits (right edge <= width)', m.evaluate("Math.round(document.querySelector('.nav ul').getBoundingClientRect().right)") <= w)
            ok(f'mobile {w}x{h}: hero content inside first viewport', m.evaluate("(()=>{const r=document.querySelector('.index').getBoundingClientRect();return Math.round(r.bottom)})()") <= h)
            wide = m.evaluate("[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left<-1)&&!e.closest('.hero__glow')&&getComputedStyle(e).position!=='fixed'}).map(e=>e.className||e.tagName).slice(0,6)")
            ok(f'mobile {w}x{h}: elements outside viewport horizontally', wide)
            c2.close()
        # ---------- reduced motion
        c3 = b.new_context(viewport={'width':1440,'height':900}, reduced_motion='reduce'); r3 = c3.new_page(); re_=[]
        r3.on('pageerror', lambda e: re_.append(str(e)))
        r3.goto(URL, wait_until='networkidle'); r3.wait_for_timeout(1200)
        ok('reduced motion: no Lenis', not r3.evaluate('!!window.__lenis'))
        hidden = r3.evaluate("[...document.querySelectorAll('main h1, main h2, main h3, main p, main li, main figure, main a')].filter(e=>getComputedStyle(e).opacity!=='1'&&e.getClientRects().length).length")
        ok('reduced motion: elements with opacity != 1', hidden == 0)
        ok('reduced motion: hero headline in place', r3.evaluate("[...document.querySelectorAll('.hero__line-in')].every(e=>getComputedStyle(e).transform==='none')"))
        ok('reduced motion: errors', re_ == [])
        r3.screenshot(path=f'{out}/red_hero.png'); r3.evaluate("window.scrollTo(0, document.querySelector('#contact').getBoundingClientRect().top+scrollY-30)"); r3.wait_for_timeout(500); r3.screenshot(path=f'{out}/red_contact.png')
        r3.evaluate("window.scrollTo(0, document.querySelector('#resume').getBoundingClientRect().top+scrollY-30)"); r3.wait_for_timeout(500); r3.screenshot(path=f'{out}/red_resume.png')
        c3.close()
        # ---------- no JS
        c4 = b.new_context(viewport={'width':1440,'height':900}, java_script_enabled=False); n = c4.new_page(); n.goto(URL, wait_until='load')
        ok('no-JS: hero h1 visible', n.evaluate("(()=>{const h=document.querySelector('h1');const r=h.getBoundingClientRect();return r.height>50&&getComputedStyle(h).opacity==='1'})()"))
        ok('no-JS: nothing hidden', n.evaluate("[...document.querySelectorAll('main h2, main h3, main p, main li, main figure')].filter(e=>getComputedStyle(e).opacity!=='1'&&e.getClientRects().length).length") == 0)
        ok('no-JS: résumé link and 4 contact links present', n.evaluate("document.querySelectorAll('.dl').length==1&&document.querySelectorAll('.channel__link').length==4"))
        n.screenshot(path=f'{out}/nojs_hero.png'); c4.close()
        b.close()
finally: srv.terminate()
json.dump(R, open(f'{out}/behaviour.json','w'), indent=1, default=str)
