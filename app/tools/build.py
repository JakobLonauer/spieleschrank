"""Baut pb_public/index.html aus den Teilen in src/ (eine Datei, CSS und JS eingebettet)."""
import os, re, subprocess, sys
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(APP, 'src')
r = lambda f: open(os.path.join(SRC, f), encoding='utf-8').read()
CSS = ['05_fonts.css', '10_base.css', '20_v3.css', '25_v4.css', '28_app.css']
JS = ['40_core.js', '41_data.js', '42_logic.js', '43_render.js', '44_sheets.js', '45_actions.js', '47_api.js']
version = open(os.path.join(APP, 'VERSION')).read().strip() if os.path.exists(os.path.join(APP, 'VERSION')) else 'dev'
js = ''.join(r(f) for f in JS).replace('__APP_VERSION__', version)
page = (r('00_head.html') + '<style>\n' + ''.join(r(f) for f in CSS) + '</style>\n</head>\n<body>\n'
        + r('30_markup.html') + '\n<script src="/vendor/pocketbase.umd.js"></script>\n<script>\n' + js + '</script>\n</body>\n</html>\n')
out = os.path.join(APP, 'pb_public', 'index.html')
open(out, 'w', encoding='utf-8').write(page)
chk = os.path.join(APP, 'tools', '.check.js')
open(chk, 'w', encoding='utf-8').write(js)
res = subprocess.run(['node', '--check', chk], capture_output=True, text=True)
os.remove(chk)
if res.returncode: print(res.stderr); sys.exit(1)
print(f'{len(page)//1024} KB, Syntax ok, Version {version}')
