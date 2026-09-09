import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A imagem de produção copia `.next/standalone`, que traz o servidor com
  // apenas os módulos que o build rastreou. Sem isso, o runtime precisaria do
  // `node_modules` inteiro — as dependências de build junto — e a imagem
  // passaria de centenas de megabytes de coisa que nunca é executada.
  output: "standalone",

  turbopack: {
    // Este app fica dentro do repositório shiva-code, que tem pnpm-lock.yaml e
    // pnpm-workspace.yaml na raiz. Sem fixar a raiz, o Turbopack a infere pelo
    // lockfile mais alto e passaria a resolver módulos e observar arquivos do
    // monorepo inteiro.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
