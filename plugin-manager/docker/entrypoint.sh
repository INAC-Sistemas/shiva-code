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
# NÃO há seed. O seed cria contas de demonstração com senhas fixas no código
# (`prisma/seed.ts`), o que em produção seria abrir acesso conhecido. A primeira
# conta é responsabilidade de quem implanta.

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "==> Aplicando migrations"
  node ./node_modules/prisma/build/index.js migrate deploy
else
  echo "==> RUN_MIGRATIONS=false; migrations não aplicadas nesta partida"
fi

echo "==> Subindo Next.js em produção na porta ${PORT:-3000}"
exec node server.js
