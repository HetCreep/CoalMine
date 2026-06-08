#!/bin/sh
# CoalMine pre-push hook (Unix)
# Exit on failure to prevent push

if [ -f scripts/verify.mjs ]; then
  node scripts/verify.mjs
  exit $?
fi
exit 0
