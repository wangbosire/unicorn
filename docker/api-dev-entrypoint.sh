#!/bin/sh
set -e
cd /repo
export DATABASE_URL="${DATABASE_URL:-mysql://root:root123..@mysql:3306/unicorn}"
pnpm --filter @unicorn/api exec prisma db push
pnpm --filter @unicorn/api exec prisma generate
pnpm --filter @unicorn/api exec prisma db seed || true
cd /repo/apps/api
exec pnpm run dev:watch
