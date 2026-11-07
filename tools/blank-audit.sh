#!/bin/bash
# Blank-space audit at one width (default 1280): tools/blank-audit.sh [width] [phase]
cd "$(dirname "$0")/.."
CHROME=$(ls -d ~/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell 2>/dev/null | tail -1)
W=${1:-1280}; PH=${2:-mid}
for f in parent.html staff.html driver.html; do
  python3 - "$f" <<'PY'
import sys
f = sys.argv[1]
s = open(f).read().replace("<head>", '<head><script src="tools/blank-audit.js"></script><style>*{animation:none!important;transition:none!important}</style>', 1).replace("navigator.serviceWorker", "void 0&&navigator.serviceWorker")
open("_blank_" + f, "w").write(s)
PY
done
for p in parent.html?kid=VII-B-1:parent-VII parent.html?kid=XII-B-12:parent-XII staff.html?id=SJS-T-0508:teacher staff.html?id=SJS-P-0001:principal staff.html?id=SJS-A-0107:office driver.html?id=SJS-D-0114:driver; do
  url=${p%%:*}; who=${p##*:}
  perl -e 'alarm 120; exec @ARGV' "$CHROME" --window-size=$W,900 --virtual-time-budget=120000 --dump-dom "http://localhost:8080/_blank_$url&ph=$PH" 2>/dev/null \
  | python3 -c "
import sys,re,html,json
m=re.search(r'<pre id=\"AUDIT\"[^>]*>(.*?)</pre>',sys.stdin.read(),re.S)
if not m: print('$who: NO RESULT'); sys.exit()
r=json.loads(html.unescape(m.group(1)))
print('$who: %d'%len(r)); [print('  '+x) for x in r]"
done
rm -f _blank_*.html
