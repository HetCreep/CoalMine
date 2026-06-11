#!/bin/sh
# CoalMine pre-commit hook (Unix)
# Exit on failure to prevent commit

if [ -f scripts/lib/render.test.mjs ]; then
  node --test scripts/lib/render.test.mjs scripts/lib/hooks.test.mjs || exit 1
fi
if [ -f scripts/verify.mjs ]; then
  node scripts/verify.mjs
  exit $?
fi
exit 0
