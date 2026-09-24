#!/bin/sh
set -e

echo "==> Gerando Prisma Client"
npx prisma generate

echo "==> Aplicando migrations"
npx prisma migrate deploy

echo "==> Rodando seed (skills recriadas; usuários upsert)"
npx prisma db seed

echo "==> Subindo Next.js em modo dev"
exec npm run dev -- --hostname 0.0.0.0
