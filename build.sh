#!/usr/bin/env bash
# Assembles index.html from src/. Run: ./build.sh
set -euo pipefail
cd "$(dirname "$0")"
{
  echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>'
  cat src/head.html src/body.html
  echo '<script type="text/plain" id="book">'; cat src/book.txt; echo '</script>'
  echo '<script>'; cat src/app.js; echo '</script>'
  echo '</body></html>'
} > index.html
