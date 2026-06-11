#!/bin/sh
# CoalMine pre-push hook (Unix)
# Exit on failure to prevent push

if [ -f scripts/lib/render.test.mjs ]; then
  node --test scripts/lib/render.test.mjs scripts/lib/hooks.test.mjs || exit 1
fi
if [ -f scripts/verify.mjs ]; then
  node scripts/verify.mjs
  exit $?
fi
exit 0
