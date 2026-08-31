import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Este app fica dentro do repositório shiva-code, que tem pnpm-lock.yaml e
    // pnpm-workspace.yaml na raiz. Sem fixar a raiz, o Turbopack a infere pelo
    // lockfile mais alto e passaria a resolver módulos e observar arquivos do
    // monorepo inteiro.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
