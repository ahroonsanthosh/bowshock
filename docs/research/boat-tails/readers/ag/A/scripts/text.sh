#!/bin/bash
# usage: text.sh <pdf> <first> <last> ; prints OCR text layer, logs pages opened
set -e
pdf="$1"; f="$2"; l="$3"
echo "$(date -u +%FT%TZ) text layer $(basename "$pdf") pages $f-$l" >> "$(dirname "$0")/../opened.log"
pdftotext -layout -f "$f" -l "$l" "$pdf" -
