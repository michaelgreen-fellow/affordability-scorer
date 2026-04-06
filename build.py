#!/usr/bin/env python3
"""
Site Builder for Affordability for All v2
Reads config.json + content.json, loads shared templates, stitches pages.

Usage: cd site-v2 && python3 build.py
"""
import json, os, shutil, re

ROOT = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(ROOT, 'public')
TEMPLATES = os.path.join(ROOT, 'templates')
PAGES = os.path.join(ROOT, 'pages')
os.makedirs(PUBLIC, exist_ok=True)

with open(os.path.join(ROOT, 'config.json'), 'r') as f:
    config = json.load(f)
with open(os.path.join(ROOT, 'content.json'), 'r') as f:
    content = json.load(f)

print("Building Affordability for All...")

def read_file(path):
    if os.path.exists(path):
        with open(path, 'r') as f:
            return f.read()
    return ''

# Generate shared CSS from template + config
c, fnt, fc = config['colors'], config['fonts'], config['colors']['fights']
shared_css = read_file(os.path.join(TEMPLATES, 'shared.css'))
replacements = {
    '{{bg}}':c['bg'],'{{navy}}':c['navy'],'{{gold}}':c['gold'],'{{goldLight}}':c['goldLight'],
    '{{text}}':c['text'],'{{text2}}':c['text2'],'{{text3}}':c['text3'],'{{white}}':c['white'],
    '{{earn}}':fc['earn'],'{{build}}':fc['build'],'{{save}}':fc['save'],
    '{{care}}':fc['care'],'{{protect}}':fc['protect'],
    '{{serif}}':fnt['serif'],'{{sans}}':fnt['sans'],'{{mono}}':fnt['mono']
}
for k, v in replacements.items():
    shared_css = shared_css.replace(k, v)

# Generate nav HTML
nav_links = ""
for link in config['nav']['links']:
    feat = link.get('feature')
    if feat and not config['features'].get(feat, True):
        continue
    sub = link['sub'].replace('&', '&amp;')
    nav_links += f'  <a class="nl" href="{link["href"]}" onclick="closeNav()">{link["label"]}<span>{sub}</span></a>\n'

nav_html = read_file(os.path.join(TEMPLATES, 'nav.html'))
nav_html = nav_html.replace('{{NAV_LINKS}}', nav_links).replace('{{NAV_FOOTER}}', config['nav']['footer'])

topnav_tpl = read_file(os.path.join(TEMPLATES, 'topnav.html'))
footer_html = read_file(os.path.join(TEMPLATES, 'footer.html')).replace('{{FOOTER_TEXT}}', content['site']['footerText'])
nav_js = read_file(os.path.join(TEMPLATES, 'nav.js')).strip()

def safe_write(filepath, content):
    """Write file, fixing permissions if needed."""
    if os.path.exists(filepath):
        os.chmod(filepath, 0o644)
    with open(filepath, 'w') as f:
        f.write(content)

def build_page(filename, nav_title):
    name = filename.replace('.html', '')
    page_css = read_file(os.path.join(PAGES, f'{name}.css'))
    page_body = read_file(os.path.join(PAGES, f'{name}.body.html'))
    page_js = read_file(os.path.join(PAGES, f'{name}.js'))
    
    page_topnav = topnav_tpl.replace('{{PAGE_TITLE}}', nav_title)
    
    # Index has custom header
    if filename == 'index.html':
        header = '<header class="hdr"><div class="hdr-left"><div class="hdr-byline" id="hdrByline"></div><div class="hdr-title" id="hdrTitle"></div></div><div class="ham" id="ham" onclick="toggleNav()"><span></span><span></span><span></span></div></header>'
        page_body = page_body.replace('{{HEADER}}', header)
        page_body = page_body.replace('{{TOPNAV}}', '')
    else:
        page_body = page_body.replace('{{TOPNAV}}', page_topnav)
    
    page_body = page_body.replace('{{NAV_DRAWER}}', nav_html)
    page_body = page_body.replace('{{FOOTER}}', footer_html)
    page_js = page_js.replace('{{NAV_JS}}', nav_js)

    # Draft badge: injected per-page via feature flag
    draft_badge = ''
    if filename == 'talking-points.html' and config['features'].get('talkingPointsDraft', False):
        draft_badge = f'<div style="position:fixed;top:14px;right:16px;z-index:8000;background:{c["gold"]};color:#fff;font-family:{fnt["mono"]};font-size:8px;letter-spacing:.18em;text-transform:uppercase;padding:5px 10px;border-radius:4px;pointer-events:none;opacity:.92">Draft</div>'

    title_clean = nav_title.replace('&amp;', '&')
    
    # Password gate (injected when site is not public)
    pw_gate = ''
    if not config['env'].get('isPublic', True) and config['env'].get('password'):
        pw = config['env']['password']
        hint = config['env'].get('passwordHint', '')
        pw_gate = f"""
<div id="pwGate" style="position:fixed;inset:0;z-index:9999;background:{c['bg']};display:flex;align-items:center;justify-content:center;font-family:{fnt['sans']}">
<div style="text-align:center;max-width:340px;padding:2rem">
<div style="font-family:{fnt['serif']};font-size:clamp(24px,4vw,36px);color:{c['navy']};margin-bottom:.5rem">Affordability <em style="color:{c['gold']};font-style:italic">for All</em></div>
<div style="font-family:{fnt['mono']};font-size:8px;letter-spacing:.15em;text-transform:uppercase;color:{c['text3']};margin-bottom:2rem">Draft Review Access</div>
<input id="pwIn" type="password" placeholder="Enter password" style="width:100%;padding:10px 14px;border:1px solid rgba(11,28,51,.15);border-radius:6px;font-size:14px;font-family:{fnt['sans']};outline:none;text-align:center;margin-bottom:.75rem;background:rgba(255,255,255,.7)" onkeydown="if(event.key==='Enter')checkPw()">
<button onclick="checkPw()" style="width:100%;padding:9px;background:{c['navy']};color:#fff;border:none;border-radius:6px;font-size:12px;cursor:pointer;font-family:{fnt['sans']};letter-spacing:.05em">Access Site</button>
<div id="pwErr" style="font-size:11px;color:#DC2626;margin-top:.75rem;opacity:0;transition:opacity .2s"></div>
<div style="font-size:10px;color:{c['text3']};margin-top:1.5rem">{hint}</div>
</div></div>
<script>
(function(){{var k='aff_access',h='{pw}';if(sessionStorage.getItem(k)===h){{document.getElementById('pwGate').style.display='none';}}
window.checkPw=function(){{var v=document.getElementById('pwIn').value;if(v===h){{sessionStorage.setItem(k,h);document.getElementById('pwGate').style.display='none';}}else{{var e=document.getElementById('pwErr');e.textContent='Incorrect password';e.style.opacity='1';document.getElementById('pwIn').value='';setTimeout(function(){{e.style.opacity='0';}},2000);}}}};
document.getElementById('pwIn').focus();}})();
</script>"""
    
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title_clean} | Affordability for All</title>
<link href="{config['fonts']['googleImport']}" rel="stylesheet">
<style>
{shared_css}
{page_css}
</style>
</head>
<body>
{pw_gate}
{draft_badge}
{page_body}
<script>
{page_js}
</script>
</body>
</html>"""

    safe_write(os.path.join(PUBLIC, filename), html)
    print(f"  Built: {filename} ({len(html):,} bytes)")

# Build all pages
pages = [
    ('index.html', 'Home'),
    ('campaigns.html', 'Five Fights'),
    ('recommendations.html', 'Policy Shortlist'),
    ('dashboard.html', 'Data Dashboard'),
    ('inventory.html', 'Program Inventory'),
    ('talking-points.html', 'Talking Points'),
    ('sources.html', 'Sources & References'),
    ('about.html', 'About'),
    ('contact.html', 'Contact'),
]

for filename, title in pages:
    build_page(filename, title)

# Build pillar homepage draft (index-pillars uses different source files)
def build_variant(filename, title, source_prefix):
    """Build a page variant using a different set of source files."""
    page_css = read_file(os.path.join(PAGES, f'{source_prefix}.css'))
    page_body = read_file(os.path.join(PAGES, f'{source_prefix}.body.html'))
    page_js = read_file(os.path.join(PAGES, f'{source_prefix}.js'))
    
    header = '<header class="hdr"><div class="hdr-left"><div class="hdr-byline" id="hdrByline"></div><div class="hdr-title" id="hdrTitle"></div></div><div class="ham" id="ham" onclick="toggleNav()"><span></span><span></span><span></span></div></header>'
    page_body = page_body.replace('{{HEADER}}', header)
    page_body = page_body.replace('{{TOPNAV}}', '')
    page_body = page_body.replace('{{NAV_DRAWER}}', nav_html)
    page_body = page_body.replace('{{FOOTER}}', footer_html)
    page_js = page_js.replace('{{NAV_JS}}', nav_js)
    
    # Password gate
    pw_gate = ''
    if not config['env'].get('isPublic', True) and config['env'].get('password'):
        pw = config['env']['password']
        hint = config['env'].get('passwordHint', '')
        pw_gate = f"""
<div id="pwGate" style="position:fixed;inset:0;z-index:9999;background:{c['bg']};display:flex;align-items:center;justify-content:center;font-family:{fnt['sans']}">
<div style="text-align:center;max-width:340px;padding:2rem">
<div style="font-family:{fnt['serif']};font-size:clamp(24px,4vw,36px);color:{c['navy']};margin-bottom:.5rem">Affordability <em style="color:{c['gold']};font-style:italic">for All</em></div>
<div style="font-family:{fnt['mono']};font-size:8px;letter-spacing:.15em;text-transform:uppercase;color:{c['text3']};margin-bottom:2rem">Draft Review Access</div>
<input id="pwIn" type="password" placeholder="Enter password" style="width:100%;padding:10px 14px;border:1px solid rgba(11,28,51,.15);border-radius:6px;font-size:14px;font-family:{fnt['sans']};outline:none;text-align:center;margin-bottom:.75rem;background:rgba(255,255,255,.7)" onkeydown="if(event.key==='Enter')checkPw()">
<button onclick="checkPw()" style="width:100%;padding:9px;background:{c['navy']};color:#fff;border:none;border-radius:6px;font-size:12px;cursor:pointer;font-family:{fnt['sans']};letter-spacing:.05em">Access Site</button>
<div id="pwErr" style="font-size:11px;color:#DC2626;margin-top:.75rem;opacity:0;transition:opacity .2s"></div>
<div style="font-size:10px;color:{c['text3']};margin-top:1.5rem">{hint}</div>
</div></div>
<script>
(function(){{var k='aff_access',h='{pw}';if(sessionStorage.getItem(k)===h){{document.getElementById('pwGate').style.display='none';}}
window.checkPw=function(){{var v=document.getElementById('pwIn').value;if(v===h){{sessionStorage.setItem(k,h);document.getElementById('pwGate').style.display='none';}}else{{var e=document.getElementById('pwErr');e.textContent='Incorrect password';e.style.opacity='1';document.getElementById('pwIn').value='';setTimeout(function(){{e.style.opacity='0';}},2000);}}}};
document.getElementById('pwIn').focus();}})();
</script>"""

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} | Affordability for All</title>
<link href="{config['fonts']['googleImport']}" rel="stylesheet">
<style>
{shared_css}
{page_css}
</style>
</head>
<body>
{pw_gate}
{page_body}
<script>
{page_js}
</script>
</body>
</html>"""

    safe_write(os.path.join(PUBLIC, filename), html)
    print(f"  Built: {filename} ({len(html):,} bytes) [variant]")

build_variant('index-pillars.html', 'Home (Pillars Draft)', 'index-pillars')

# Copy JSON, CSV, and assets to public (fix permissions first)
for jf in ['content.json', 'config.json', 'inventory.csv', 'talking-points.csv', 'sources.csv']:
    src = os.path.join(ROOT, jf)
    dst = os.path.join(PUBLIC, jf)
    if os.path.exists(src):
        if os.path.exists(dst):
            os.chmod(dst, 0o644)
        shutil.copy(src, dst)

# Copy assets
for af in os.listdir(os.path.join(ROOT, 'assets')):
    src = os.path.join(ROOT, 'assets', af)
    dst = os.path.join(PUBLIC, af)
    if os.path.isfile(src):
        if os.path.exists(dst):
            os.chmod(dst, 0o644)
        shutil.copy(src, dst)

# Verify
print("\n=== VERIFICATION ===")
for fn in sorted(os.listdir(PUBLIC)):
    if not fn.endswith('.html'):
        continue
    with open(os.path.join(PUBLIC, fn), 'r') as f:
        h = f.read()
    nav = 'nav-dr' in h
    css = '--bg:' in h
    ftr = 'footer' in h.lower()
    issues = []
    if not nav: issues.append("NO NAV")
    if not css: issues.append("NO CSS VARS")
    if not ftr: issues.append("NO FOOTER")
    print(f"  {fn}: {'OK' if not issues else ' | '.join(issues)}")

print(f"\nDone. {len(os.listdir(PUBLIC))} files in public/")
