#!/bin/bash
# The full portal audit, run before every push: 8 demo people × 3 session stages × 2 widths = 48 runs.
# Each run opens every view of the page and reports script errors and sideways overflow.
# Needs the local server (python3 -m http.server 8080 in the project folder) and Chrome's headless shell.
cd "$(dirname "$0")/.."
CHROME=$(ls -d ~/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell 2>/dev/null | tail -1)
[ -x "$CHROME" ] || { echo "Chrome headless shell not found (npx playwright install chromium-headless-shell)"; exit 1; }
curl -s -o /dev/null http://localhost:8080/staff.html || { echo "Start the local server first: python3 -m http.server 8080"; exit 1; }
PAGES="parent.html staff.html driver.html login.html"
for f in $PAGES; do
  python3 - "$f" <<'PY'
import sys
f = sys.argv[1]
s = open(f).read().replace("<head>", '<head><script src="tools/stage-audit.js"></script>', 1).replace("navigator.serviceWorker", "void 0&&navigator.serviceWorker")
open("_audit_" + f, "w").write(s)
PY
done
PEOPLE="parent.html?kid=VII-B-1:parent-VII parent.html?kid=IX-A-30:parent-IX parent.html?kid=XII-B-12:parent-XII staff.html?id=SJS-T-0508:teacher staff.html?id=SJS-P-0001:principal staff.html?id=SJS-A-0107:office driver.html?id=SJS-D-0114:driver login.html:sign-in"
clear=0; runs=0
for ph in start mid end; do for W in 1280 390; do for p in $PEOPLE; do
  url=${p%%:*}; name=${p##*:}; sep=$([[ $url == *\?* ]] && echo "&" || echo "?")
  res=$(perl -e 'alarm 60; exec @ARGV' "$CHROME" --window-size=$W,900 --virtual-time-budget=30000 --dump-dom "http://localhost:8080/_audit_$url${sep}ph=$ph" 2>/dev/null \
    | python3 -c "
import sys,re,html,json
m=re.search(r'<pre id=\"AUDIT\"[^>]*>(.*?)</pre>',sys.stdin.read(),re.S)
if not m: print('NO RESULT (page did not finish)'); sys.exit()
r=json.loads(html.unescape(m.group(1))); bad=r['errs']+r['out']
print('all clear (%d views)'%r['views'] if not bad else ' | '.join(bad)[:600])")
  runs=$((runs+1)); [[ $res == all\ clear* ]] && clear=$((clear+1))
  printf "%-6s %-5s %-11s %s\n" $ph $W $name "$res"
done; done; done
rm -f _audit_*.html
echo; echo "clear: $clear of $runs"
