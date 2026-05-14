#!/bin/sh
set -e
cd /repo
export DATABASE_URL="${DATABASE_URL:-mysql://root:root123..@mysql:3306/unicorn}"
pnpm --filter @unicorn/api exec prisma db push
pnpm --filter @unicorn/api exec prisma db seed || true
cd /repo/apps/api
# tsc 在 monorepo 下可能输出 dist/main.js 或 dist/apps/api/src/main.js，启动时兼容两者。
if [ -f dist/main.js ]; then
  exec node dist/main.js
fi
if [ -f dist/apps/api/src/main.js ]; then
  exec node dist/apps/api/src/main.js
fi
echo "api: 未找到 dist 入口（dist/main.js 或 dist/apps/api/src/main.js）" >&2
exit 1
