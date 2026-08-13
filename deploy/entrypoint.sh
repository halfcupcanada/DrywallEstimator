#!/usr/bin/env bash
set -e
cd /app
echo "[app] applying drizzle migrations…"
pnpm exec drizzle-kit migrate || echo "[app] migrate skipped/failed (continuing)"
echo "[app] starting…"
exec node dist/index.js
