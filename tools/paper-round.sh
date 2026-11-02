#!/bin/bash
# The formatter's test round: every Word file in tools/papers/ × the 3 layouts, through the live AI.
# Needs the local server (python3 -m http.server 8080 in the project folder) and Chrome's headless shell.
# Prints PASS/LOOK per run; the finished Word files land in tools/papers/out/ to open and read.
# tools/papers/expect.json: per file, the question/section counts it must give, and "known" flags
# (bits of check text) that are right for that paper, such as instructions describing a longer paper.
# A teacher's file that came out wrong goes in tools/papers/ with its right counts: it is then tested every round.
# Usage: tools/paper-round.sh [one-file.docx]
set -e
cd "$(dirname "$0")/.."
CHROME=$(ls -d ~/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell 2>/dev/null | tail -1)
[ -x "$CHROME" ] || { echo "Chrome headless shell not found (npx playwright install chromium-headless-shell)"; exit 1; }
curl -s -o /dev/null http://localhost:8080/staff.html || { echo "Start the local server first: python3 -m http.server 8080"; exit 1; }
FILES=$(cd tools/papers && if [ -n "$1" ] && [ "$1" != "-v" ]; then echo "$1"; else echo sample; ls *.docx; fi)
python3 - "$FILES" <<'PY'
import json, sys
files = [f for f in sys.argv[1].split("\n") if f]
s = open("staff.html").read()
inj = "<script>window.ROUND_FILES=" + json.dumps(files) + ";</script><script src=\"tools/paper-round.js\"></script>"
s = s.replace("<head>", "<head>" + inj, 1).replace("navigator.serviceWorker", "void 0&&navigator.serviceWorker")
open("_round.html", "w").write(s)
PY
N=$(echo "$FILES" | wc -l | tr -d ' ')
perl -e 'alarm shift; exec @ARGV' $((N * 3 * 60 + 60)) "$CHROME" --virtual-time-budget=$((N * 3 * 60000)) --dump-dom \
  "http://localhost:8080/_round.html?id=SJS-T-0508" 2>/dev/null > /tmp/paper-round.$$ || true
rm -f _round.html
mkdir -p tools/papers/out
python3 - /tmp/paper-round.$$ "$@" <<'PY'
import sys, re, html, json, base64
s = open(sys.argv[1]).read()
m = re.search(r'<pre id="ROUND"[^>]*>(.*?)</pre>', s, re.S)
if not m: print("The round didn't finish (no results). Is the page loading?"); sys.exit(1)
fails = 0
for line in html.unescape(m.group(1)).split("\n"):
    r = json.loads(line)
    if r.get("selftest"):
        fails += not r["caught"]
        print(("PASS" if r["caught"] else "FAIL"), "self-test: a paper spoilt on purpose is", "caught" if r["caught"] else "NOT caught")
        for x in r["bad"]: print("       !", x)
        continue
    if "docx" not in r: fails += 1; print("ERROR", r.get("f", ""), r.get("layout", ""), r.get("error", "")[:400]); continue
    name = r["f"].rsplit(".", 1)[0] + "_" + r["layout"] + ".docx"
    open("tools/papers/out/" + name, "wb").write(base64.b64decode(r["docx"]))
    look = r["bad"] + r["want"] + r["problems"]
    fails += bool(look)
    print(("LOOK" if look else "PASS"), f'{r["f"]:<28} {r["layout"]:<11} {r["q"]:>3} q  {r["by"]}{" ("+r["why"]+")" if r["why"] else ""}, {r["calls"]} call{"s" if r["calls"] != 1 else ""}, {r["tin"]+r["tout"]:,} tokens ≈ ₹{(r["tin"]*0.10+r["tout"]*0.50)/1e6*88:.2f}')
    for x in look: print("       !", x)
    if look or "-v" in sys.argv:
        for x in r["outline"]: print("       »", x[:300])
    for x in r["knownBad"]: print("       ~", x, "(known)")
    for x in r["warnings"]: print("       ·", x)
    for x in r["ok"]: print("       ✓", x)
print(f"\n{'All runs passed.' if not fails else str(fails) + ' run(s) need a look.'} Word files: tools/papers/out/")
PY
rm -f /tmp/paper-round.$$
