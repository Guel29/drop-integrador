#!/usr/bin/env bash
set -euo pipefail
cd /workspace/drop-integrador
export npm_config_cache=/tmp/smartdrop-npm-cache
export NODE_USE_ENV_PROXY=1
npm ci --no-audit --no-fund
node scripts/setup-local.mjs
npm run db:generate
