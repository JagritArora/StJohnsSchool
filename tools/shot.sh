#!/bin/bash
# tools/shot.sh <view> <width> <out.png> [height] [page?query]: screenshot one portal view, no animation.
cd "$(dirname "$0")/.."
CH=$(ls -d ~/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell | tail -1)
V=$1; W=$2; OUT=$3; H=${4:-900}; PG=${5:-staff.html?id=SJS-T-0508}; F=${PG%%\?*}; Q=${PG#*\?}
TMP=_shot_$$_$F
python3 - "$F" "$V" "$TMP" <<'PY'
import sys
f,v,t=sys.argv[1],sys.argv[2],sys.argv[3]
s=open(f).read().replace('navigator.serviceWorker','void 0&&navigator.serviceWorker')
s=s.replace('<head>','<head><script>addEventListener("load",()=>setTimeout(()=>{SJS.go("%s")},1500))</script><style>*{animation:none!important;transition:none!important}</style>'%v,1)
open(t,'w').write(s)
PY
perl -e 'alarm 60; exec @ARGV' "$CH" --window-size=$W,$H --virtual-time-budget=9000 --screenshot="$OUT" "http://localhost:8080/$TMP?$Q" 2>/dev/null
rm -f "$TMP"
