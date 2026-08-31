# Plugin Manager

Next.js 16 + Postgres + Prisma 7, rodando em container no modo desenvolvimento com hot reload.

## Subir o projeto

```bash
cp .env.example .env   # já existe um .env pronto para dev
docker compose up -d --build
```

Aplicação: http://localhost:3000/login

O entrypoint do container ([docker/dev-entrypoint.sh](docker/dev-entrypoint.sh)) roda
`prisma generate`, `prisma migrate deploy` e `prisma db seed` antes de subir o Next.
O seed é idempotente (`upsert`), então pode rodar a cada start.

## Credenciais do seed

| Nome        | E-mail                   | Senha       | Papel |
| ----------- | ------------------------ | ----------- | ----- |
| admin       | admin@inacsistemas.com   | `inac1255`  | ADMIN |
| Maria Souza | maria@inacsistemas.com   | `guest1234` | GUEST |
| João Lima   | joao@inacsistemas.com    | `guest1234` | GUEST |

Os dois usuários guest são apenas dados de demonstração — remova o bloco marcado em
[prisma/seed.ts](prisma/seed.ts) se não quiser.

## Rotas

| Rota         | Descrição                                                       |
| ------------ | --------------------------------------------------------------- |
| `/`          | Redireciona para `/login` (ou `/dashboard`, se já houver sessão)  |
| `/login`     | Formulário de login. Redireciona para `/dashboard` se já logado   |
| `/dashboard` | Listagem de usuários. Redireciona para `/login` se não logado     |
| `/dashboard/token` | Gera um token de API para o usuário logado                  |

O controle de acesso fica em [src/proxy.ts](src/proxy.ts) (no Next 16 a convenção
`middleware` foi renomeada para `proxy`).

## Papéis

- **ADMIN** — vê todos os usuários e pode criar novos.
- **GUEST** — vê apenas o próprio cadastro e não pode criar.

A regra de visibilidade é um único `where` em
[src/app/dashboard/page.tsx](src/app/dashboard/page.tsx); a de criação está no
início de [src/app/actions/users.ts](src/app/actions/users.ts) — validada no
servidor, não só escondendo o botão.

## Criar usuário

Botão **Novo usuário** no dashboard (visível só para admin). Valida nome, formato
do e-mail, senha com no mínimo 8 caracteres e papel, e recusa e-mail duplicado —
tanto por consulta prévia quanto pelo índice único do Postgres, que é a garantia
real contra corrida.

## API

Autenticação por token Bearer, independente do login web. Pelo navegador, o menu
**Token da API** no dashboard gera um token para o usuário logado — sem pedir a
senha de novo, já que o cookie de sessão prova quem é. Pelo terminal:

```bash
# 1. obter o token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@inacsistemas.com","password":"inac1255"}' \
  | jq -r .token)

# 2. usar em requisições autenticadas
curl http://localhost:3000/api/users -H "Authorization: Bearer $TOKEN"
```

| Método | Rota              | Auth   | Descrição                                        |
| ------ | ----------------- | ------ | ------------------------------------------------ |
| POST   | `/api/auth/login` | —      | Recebe `{email, password}`, devolve o token       |
| GET    | `/api/auth/me`    | Bearer | Confere se o token ainda é válido                 |
| POST   | `/api/auth/logout` | Bearer | Revoga o token usado na requisição               |
| GET    | `/api/users`      | Bearer | Lista usuários (admin: todos, guest: só a si)     |
| GET    | `/api/plugins/host-info` | Bearer | Disco e memória do host             |

Resposta do login:

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "tokenType": "Bearer",
  "expiresIn": 86400,
  "user": { "id": "...", "name": "admin", "email": "...", "role": "ADMIN" }
}
```

Erros: `400` body inválido, `401` credenciais ou token inválidos (com header
`WWW-Authenticate: Bearer`), `403` papel insuficiente.

A validação fica em [src/lib/api-auth.ts](src/lib/api-auth.ts). Para proteger uma
nova rota:

```ts
const auth = await authenticateRequest(request);
if (!auth.ok) return auth.response;
// auth.session.userId / .role disponíveis aqui
```

Token de API vale 24 horas; o cookie de sessão web vale 7 dias. Os dois são JWT
assinados com o mesmo `SESSION_SECRET`, mas carregam uma claim `typ`
(`"api"` / `"session"`) que impede usar um no lugar do outro.

### Logout da API

```bash
curl -X POST http://localhost:3000/api/auth/logout -H "Authorization: Bearer $TOKEN"
# {"revoked":true}
```

Como o token é um JWT, nada é guardado na emissão — devolver `200` e não fazer
nada deixaria o token valendo até expirar. Então o logout registra o `jti` do
token na tabela `revoked_api_tokens`
([src/lib/token-revocation.ts](src/lib/token-revocation.ts)), consultada pelo
`authenticateRequest` a cada requisição; dali em diante as rotas respondem
`401 Token revogado`. Repetir o logout com o mesmo token também dá `401` — ele
já não vale mais.

A lista só precisa guardar cada token até a expiração dele, então o próprio
logout apaga as linhas já vencidas. Revogação é por token, não por usuário: os
outros tokens da mesma conta continuam valendo.

O logout da API não mexe no cookie do navegador — quem faz isso é o botão
**Sair** do dashboard.

## Plugins

Serviços em [plugins/](plugins/), importáveis pelo alias `@plugins/*`. Cada um é
um módulo puro; a rota HTTP fica em `src/app/api/plugins/<nome>/route.ts` e só
faz a autenticação e o wiring.

### host-info

`GET /api/plugins/host-info` (Bearer) → disco e memória do host, em bytes:

```json
{
  "disk": { "totalBytes": 1081101176832, "usedBytes": 179197698048 },
  "memory": { "totalBytes": 8197959680, "usedBytes": 5563781120 }
}
```

Implementado em [plugins/host-info/index.ts](plugins/host-info/index.ts) só com
built-ins do Node — `fs.statfs` para disco e `/proc/meminfo` para memória, sem
shell e sem dependências.

O filesystem inspecionado é `/` por padrão. Se o container tiver um disco próprio
(diferente do host), monte o filesystem do host e aponte para ele com
`HOST_INFO_DISK_PATH`.

## Autenticação

Senhas com hash `bcrypt` e sessão em JWT (`jose`) dentro de um cookie `httpOnly`,
`sameSite=lax`, com `secure` ativado em produção. Validade de 7 dias.

O segredo vem de `SESSION_SECRET`, definido no `.env` (gitignored) e injetado no
container por interpolação no [docker-compose.yml](docker-compose.yml) — o valor
não fica versionado. Gere um novo por ambiente:

```bash
openssl rand -base64 48
```

Trocar o segredo invalida todas as sessões abertas.

## Comandos

```bash
docker compose up -d              # subir
docker compose logs -f web        # logs da aplicação
docker compose down               # parar
docker compose down -v            # parar e apagar o volume do Postgres
docker compose up -d --build      # rebuild (após mudar package.json)

npm run db:migrate                # nova migration (roda do host, porta 5432 exposta)
npm run db:seed                   # rodar o seed manualmente
npm run db:studio                 # Prisma Studio
```

Novas dependências: `node_modules` é um volume anônimo do container, então
`npm install <pacote>` no host não reflete lá dentro. Use
`docker compose exec web npm install <pacote>` ou refaça o build.
