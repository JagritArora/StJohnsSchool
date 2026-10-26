#!/bin/sh
# Rebuilds assets/prospectus.pdf from prospectus.html (8 A4 pages, no browser headers).
# Run after any change to prospectus.html: sh tools/build-prospectus-pdf.sh
cd "$(dirname "$0")/.." || exit 1
CHROME=$(find "$HOME/Library/Caches/ms-playwright" -name chrome-headless-shell -type f 2>/dev/null | head -1)
[ -z "$CHROME" ] && CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$CHROME" ] || { echo "build-prospectus-pdf: no Chrome found, PDF not rebuilt" >&2; exit 1; }
"$CHROME" --headless --virtual-time-budget=6000 --no-pdf-header-footer --allow-file-access-from-files \
  --print-to-pdf="$PWD/assets/prospectus.pdf" "file://$PWD/prospectus.html" 2>/dev/null
PAGES=$(python3 -I -c "import re,sys; print(len(re.findall(rb'/Type\s*/Page[^s]', open(sys.argv[1],'rb').read())))" assets/prospectus.pdf)
echo "build-prospectus-pdf: assets/prospectus.pdf rebuilt ($PAGES pages)"
[ "$PAGES" = 8 ] || echo "build-prospectus-pdf: warning, expected 8 pages" >&2
