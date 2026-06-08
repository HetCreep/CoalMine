#!/bin/sh
# CoalMine pre-commit hook (Unix)
# Exit on failure to prevent commit

if [ -f scripts/verify.mjs ]; then
  node scripts/verify.mjs
  exit $?
fi
exit 0
