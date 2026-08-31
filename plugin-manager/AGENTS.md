<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Objetivo da aplicação

O Plugin Manager é a biblioteca de plugins do `dsh`: ele publica os plugins e executa a
inteligência deles no servidor (VPS). O `shiva` consome essa biblioteca depois de
autenticar o usuário por token de API.

A execução é dividida em duas metades:

- **Casca** — roda na máquina do cliente, dentro do `dsh`. Declara o plugin (nome,
  entrada, saída), coleta os argumentos e chama a VPS; não contém a lógica.
- **Inteligência** — roda aqui, neste projeto Next.js. Recebe a chamada autenticada,
  executa a lógica do plugin e devolve o resultado para a casca.

Consequências para quem mexe no código:

- Lógica de plugin nova entra neste projeto ([plugins/](plugins/), servida por
  [src/app/api/plugins/](src/app/api/plugins/)), nunca na casca do cliente.
- Toda rota de plugin é autenticada como o resto da API (token Bearer, ver
  [src/lib/api-auth.ts](src/lib/api-auth.ts)); a casca é código não confiável, então
  autorização e validação de argumentos são responsabilidade do servidor.
- A resposta da API é a interface pública do plugin: alterá-la quebra as cascas já
  instaladas nas máquinas dos clientes.
