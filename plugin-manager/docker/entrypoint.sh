#!/bin/sh
set -e

# Entrypoint de produção: aplica as migrations pendentes e serve.
#
# `migrate deploy` é o comando de produção do Prisma — aplica o que ainda não
# foi aplicado, na ordem, e nunca reescreve histórico nem apaga dados, ao
# contrário do `migrate dev`. Falhar aqui derruba o container de propósito: um
# servidor no ar com o banco numa versão anterior à do código responde erros
# que parecem bugs da aplicação.
#
# O seed de usuários de demonstração (senhas no código) não roda aqui:
# `NODE_ENV=production` faz `prisma/seed.ts` omiti-los. A primeira conta é
# responsabilidade de quem implanta. As skills versionadas em `prisma/skills/`
# são recriadas a cada partida, para o deploy levar o corpo novo à biblioteca.

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "==> Aplicando migrations"
  node ./node_modules/prisma/build/index.js migrate deploy
else
  echo "==> RUN_MIGRATIONS=false; migrations não aplicadas nesta partida"
fi

echo "==> Recriando a biblioteca de skills a partir dos arquivos versionados"
node ./node_modules/tsx/dist/cli.mjs prisma/seed.ts

echo "==> Subindo Next.js em produção na porta ${PORT:-3000}"
exec node server.js
