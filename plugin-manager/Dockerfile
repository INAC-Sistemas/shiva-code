# syntax=docker/dockerfile:1

# Imagem de produção do Plugin Manager.
#
# O runtime carrega três coisas e nada além delas: o servidor standalone que o
# `next build` emite, o schema com as migrations, e uma árvore isolada com a CLI
# do Prisma. Dependências de build — TypeScript, ESLint, Tailwind — ficam nos
# estágios anteriores e não chegam à imagem final.
#
# A CLI do Prisma vive numa árvore própria porque o `standalone` traz só o que o
# build rastreou a partir do código da aplicação, e a CLI ninguém importa: ela é
# executada. Instalá-la à parte também mantém as dependências dela (engines,
# drivers) fora do resolvedor da aplicação.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# O cliente gerado é versionado, mas gerar de novo é o que garante que ele
# corresponde ao schema deste commit — um cliente defasado só apareceria como
# erro de runtime, com a query errada já em produção.
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# A CLI que aplica as migrations, mais o que o `prisma7.config.ts` importa.
# As versões saem do manifesto, não repetidas aqui, para não haver duas fontes
# da mesma verdade.
#
# O manifesto é lido de FORA do diretório de instalação: com ele dentro, o
# `npm install` trataria o diretório como o próprio projeto e instalaria todas
# as dependências da aplicação junto da CLI.
FROM node:22-alpine AS migrator
WORKDIR /migrator
COPY package.json /tmp/app-package.json
RUN npm install --omit=dev --no-package-lock --no-audit --no-fund \
      "prisma@$(node -p "require('/tmp/app-package.json').dependencies.prisma")" \
      "dotenv@$(node -p "require('/tmp/app-package.json').devDependencies.dotenv")" \
  && rm -f /tmp/app-package.json \
  && npm cache clean --force
# Nada é podado desta árvore. `@prisma/studio-core` parece supérfluo numa imagem
# que só aplica migrations, mas a CLI o exige no topo do próprio `cli.js`, antes
# de olhar qual subcomando foi pedido: removê-lo derruba o `migrate deploy` com
# MODULE_NOT_FOUND.

FROM node:22-alpine AS runner
# Exigido pelo schema engine da CLI do Prisma na alpine. O runtime da aplicação
# não precisa dele: o Prisma 7 fala com o Postgres pelo adapter `pg`, sem
# engine binária.
RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Schema, migrations e o config que a CLI lê: o entrypoint aplica as pendentes
# antes de servir. O config declara a url do datasource — no Prisma 7 ela não
# pode mais viver no schema — e o runtime não o usa: a aplicação abre a conexão
# pelo adapter `pg`.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma7.config.ts ./prisma7.config.ts
# Mesclada dentro do node_modules do standalone, e não numa árvore à parte,
# porque é dali que o `prisma7.config.ts` resolve `prisma/config` e `dotenv`:
# a resolução sobe a partir do diretório do config, e nunca entraria numa
# árvore vizinha.
COPY --from=migrator /migrator/node_modules ./node_modules
COPY docker/entrypoint.sh ./docker/entrypoint.sh

# `node` é um usuário que a imagem base já traz. O servidor não escreve em
# lugar nenhum do WORKDIR; o diretório de cache é criado com dono para o caso
# de alguma rota passar a ser revalidada.
RUN mkdir -p .next/cache && chown -R node:node .next
USER node

EXPOSE 3000

ENTRYPOINT ["sh", "/app/docker/entrypoint.sh"]
