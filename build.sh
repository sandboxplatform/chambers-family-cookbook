#!/usr/bin/env bash
# Assembles index.html from src/. Run: ./build.sh
set -euo pipefail
cd "$(dirname "$0")"

# Image manifest: {"<recipe-id>": {"photo": "photos/<id>.jpg?v=..", "ai": "images/ai/<id>.jpg?v=.."}}
# A real photo in photos/ always wins over the AI image in images/ai/.
images_json() {
  local first=1 dir kind f id v
  declare -A photo ai
  for kind in photo ai; do
    [ "$kind" = photo ] && dir=photos || dir=images/ai
    [ -d "$dir" ] || continue
    for f in "$dir"/*.jpg "$dir"/*.jpeg "$dir"/*.png "$dir"/*.webp; do
      [ -f "$f" ] || continue
      id=$(basename "$f"); id=${id%.*}
      v=$(cksum < "$f" | cut -d' ' -f1)
      if [ "$kind" = photo ]; then photo[$id]="$f?v=$v"; else ai[$id]="$f?v=$v"; fi
    done
  done
  printf '{'
  for id in $(printf '%s\n' "${!photo[@]}" "${!ai[@]}" | sort -u); do
    [ $first = 1 ] || printf ','; first=0
    printf '"%s":{' "$id"
    [ -n "${photo[$id]:-}" ] && printf '"photo":"%s"' "${photo[$id]}"
    [ -n "${photo[$id]:-}" ] && [ -n "${ai[$id]:-}" ] && printf ','
    [ -n "${ai[$id]:-}" ] && printf '"ai":"%s"' "${ai[$id]}"
    printf '}'
  done
  printf '}'
}

{
  echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
  cat src/head.html
  echo '</head><body>'
  cat src/body.html
  echo '<script type="text/plain" id="book">'; cat src/book.txt; echo '</script>'
  echo '<script type="application/json" id="images">'; images_json; echo '</script>'
  echo '<script>'; cat src/app.js; echo '</script>'
  echo '</body></html>'
} > index.html

# The page-turning book: src/book.html with the same recipe text and image list dropped in at <!--DATA-->.
{
  sed -n '1,/<!--DATA-->/p' src/book.html | sed '$d'
  echo '<script type="text/plain" id="book">'; cat src/book.txt; echo '</script>'
  echo '<script type="application/json" id="images">'; images_json; echo '</script>'
  sed -n '/<!--DATA-->/,$p' src/book.html | sed '1d'
} > book.html
