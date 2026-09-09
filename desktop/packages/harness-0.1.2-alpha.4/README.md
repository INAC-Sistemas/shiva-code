# Harness 0.1.2-alpha.4 本地打包产物（临时）

> **这是临时目录，upstream 发布到 npm 后应整个删除。**
> 见 [`docs/harness-0.1.2-alpha.4-upgrade.md`](../../docs/harness-0.1.2-alpha.4-upgrade.md)。

上游 [`dsh-v0.1.2-alpha.4`](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.2-alpha.4)
（commit `4e84901e6471b79ec0338099867ebb4606d12bb5`）只有 GitHub tag，尚未发布到 npm
registry。这里放的是从该 tag 本地构建打包出的 tarball，让补丁返工和兼容性验证不必等
registry。从已适配的 alpha.3 直接推进，跳过独立合并 alpha.3。

- `npm-dsh/` —— dsh 家族 242 个包（alpha.3 为 244）
- `npm-vendor/` —— vendor 家族 9 个包（cordis / cosmokit / schemastery），版本号与 alpha.3 完全一致
- 各自的 `publish-order.txt` 是上游 pack 步骤记录的发布顺序

## 复现方式

```bash
git clone --depth 1 --branch dsh-v0.1.2-alpha.4 \
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

## 相对 alpha.3 的包清单变化

vendor：9 个包名与版本号全部不变
（cordis 4.0.2、cosmokit 1.8.3、schemastery 3.18.2、cordis-plugin-group 1.0.2、
cordis-plugin-hmr 1.0.17、cordis-plugin-include 1.0.7、cordis-plugin-loader 1.0.3、
cordis-plugin-logger-console 1.0.2、cordis-plugin-timer 1.1.4）。**无版本上抬。**

dsh：净 −2 包，无新增。

- 删除：`@deepseek-ai/dsh-code-runtime-python`（上游把 code-runtime python 路径迁走）、
  `@deepseek-ai/dsh-tool-subagent-report`（上游整包移除）
- 新增：无

两个被删的包都不在 `@deepseek-ai/dsh` 运行时闭包内（alpha.3 / alpha.4 的
`deepseek-ai-dsh` tarball `dependencies` 均未引用），也不被任何 `patches/` 或 `test/`
引用。但 `package.json` 第 245 行仍有一条
`@deepseek-ai/dsh-tool-subagent-report` 的 `file:` 直接依赖 —— 依赖切换任务需删除该行。

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
git rm -r packages/harness-0.1.2-alpha.4
```

注意 git 历史是永久的，删除只是从工作树移除，克隆体积不会回收。

## `npm-shiva-plugins/` —— 本仓库自有插件

与上面两个目录不同：`npm-dsh/` 和 `npm-vendor/` 来自上游 tag，而
`npm-shiva-plugins/` 是把本仓库 `plugins/*` 打包出来的产物。

**改完 `plugins/` 下任何插件后，必须重新打包**，否则 `file:` 依赖仍解析到旧内容：
文件名没变时 npm 不会察觉，应用照常启动，任何地方都不会报错。曾因此排查了一轮
“配置文件选择器不与 plugin manager 通信” —— 直到有人打开 tarball 才发现里面是旧代码。

```bash
cd desktop
npm run pack:plugins        # 打包并把 package.json 指向新文件名
npm install                 # 让 lockfile 记录新的 integrity
npm run pack:plugins:check  # CI/提交前：报告是否有 tarball 落后于 plugins/
```

需要构建的插件（`dsh-login`、`dsh-profiles`、`dsh-skill-library`）的 `lib/` 已被
gitignore，打包前先在各自目录跑 `npm run build`。

两个插件**不**从本仓库打包，脚本里有常量说明：`dsh-flowglass` 用已发布的 0.4.4
（本仓库副本的 `inject` 缺 `sessions`，会导致启动崩溃），`dsh-openviking` 用已发布的
0.1.1（比本仓库副本新）。改动它们的本地副本不会进入打包后的应用。
