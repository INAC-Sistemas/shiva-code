# Harness 0.1.2-alpha.3 本地打包产物（临时）

> **这是临时目录，upstream 发布到 npm 后应整个删除。**
> 见 [`docs/harness-0.1.2-alpha.3-upgrade.md`](../../docs/harness-0.1.2-alpha.3-upgrade.md)。

上游 [`dsh-v0.1.2-alpha.3`](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.2-alpha.3)
（commit `dd6322d604e00eec1ba5e0c8541159906a21094a`）只有 GitHub tag，尚未发布到 npm
registry。这里放的是从该 tag 本地构建打包出的 tarball，让补丁返工和兼容性验证不必等
registry。跳过 alpha.2，直接从 alpha.1 升级。

- `npm-dsh/` —— dsh 家族 244 个包（alpha.1 为 241）
- `npm-vendor/` —— vendor 家族 9 个包（cordis / cosmokit / schemastery）
- 各自的 `publish-order.txt` 是上游 pack 步骤记录的发布顺序

## 复现方式

```bash
git clone --depth 1 --branch dsh-v0.1.2-alpha.3 \
  https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
corepack enable                      # packageManager 指定 pnpm@11.7.0
corepack pnpm install --frozen-lockfile
corepack pnpm run build:official     # release:pack 要求 official 客户端构建记录
corepack pnpm exec tsx scripts/release/pack.ts --family vendor --out dist/npm-vendor --concurrency 8
corepack pnpm exec tsx scripts/release/pack.ts --family dsh    --out dist/npm-dsh    --concurrency 8
```

构建环境：Node v24.15.0、pnpm 11.7.0（corepack）、macOS arm64。
`build:official` 记录 220 个 client artifact / 4 个 public value。

`pnpm run release:pack -- --family dsh` 会把参数当位置参数报错，需按上面直接 `pnpm exec tsx` 调用。

## 相对 alpha.1 的包清单变化

vendor：9 个包名不变，全部为 patch/minor 版本号上抬
（cordis 4.0.1→4.0.2、cosmokit 1.8.2→1.8.3、schemastery 3.18.1→3.18.2、
cordis-plugin-* 各 +1 patch）。

dsh：
- 删除：`@deepseek-ai/dsh-agent-spine-demo`、`@deepseek-ai/dsh-session-persistence-sqlite`
- 新增：`@deepseek-ai/dsh-client-ui-schedule`、`@deepseek-ai/dsh-deque`、
  `@deepseek-ai/dsh-session-turn-outline`、`@deepseek-ai/dsh-util-time`、
  `@deepseek-ai/dsh-util-values`

## 使用方式

上游 `scripts/release/verify-packed-install.ts` 会把每个 tarball 都写进消费方
`dependencies`，这是用于验证整套发布物的测试方式，不适合 Desktop 生产打包。
它会把测试支持、未启用的 provider，以及 Claude Code/Codex 等自带大型原生 CLI
的可选 Bundle 一并提升为应用依赖。

Desktop 的 `package.json` 只引用 `@deepseek-ai/dsh` 实际运行闭包、运行时代码引用的
前端公共包，以及四个 `dsh-desktop-*` 插件。新增 tarball 前必须确认它被默认 Profile、
运行时 import 或必需 peer 引用；可选 Bundle 应由插件安装流程按需安装。

## 不要提交本机绝对路径生成的 lockfile

这样装出来的 `package-lock.json`，`resolved` 字段指向本机 `file:` 路径，别人 `npm ci`
会直接失败。真正的版本 bump 和 lockfile 必须等上游发布到 npm 后，由真实 registry 生成。

## 删除

上游发布到 npm 后：

```bash
git rm -r packages/harness-0.1.2-alpha.3
```

注意 git 历史是永久的，删除只是从工作树移除，克隆体积不会回收。
