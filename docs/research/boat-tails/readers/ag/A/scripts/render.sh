#!/bin/bash
# usage: render.sh <pdf> <page> <dpi> <outprefix>
# renders one PDF page (with its /Rotate applied) to PNG and appends to the open log
set -e
pdf="$1"; p="$2"; dpi="$3"; out="$4"
pdftoppm -r "$dpi" -f "$p" -l "$p" -singlefile -png "$pdf" "$out"
echo "$(date -u +%FT%TZ) render $(basename "$pdf") page $p at ${dpi} dpi -> $(basename "$out").png" >> "$(dirname "$0")/../opened.log"
