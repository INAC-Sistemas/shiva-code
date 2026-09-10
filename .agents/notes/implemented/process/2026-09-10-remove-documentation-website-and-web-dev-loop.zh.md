# Agent Note: 移除文档网站与浏览器 Web 开发循环

Status: implemented

[English](2026-09-10-remove-documentation-website-and-web-dev-loop.md) | 中文

## 问题

本仓库携带着一个 VitePress 文档站（`website/`）和一条面向浏览器的开发循环（`scripts/dev-web.ts`），而它们已不再服务于任何产品表面。本 fork 只交付一个应用——Electron 桌面应用；它在环回地址上启动 `dsh web`，并在 `BrowserWindow` 中渲染 harness 的 Web GUI。没有人发布这个文档站，也没有人对着普通浏览器做开发。两者的维护成本都是真实的：文档站拥有一个投影器、两道 fragment 门禁、一个 Pages 工作流、一条 Windows CI 泳道、四个 `docs:*` 脚本和一个 workspace 成员；watcher 则拥有一句模型可见的提示词，承诺只有该 watcher 才能兑现的热重载。

## 决策

**文档站已删除。** `website/`、`scripts/project-doc-site.ts`、`scripts/verify-doc-site-fragments.ts`、它们的 spec、`dsh-doc-site-sync` skill（技能）以及 `.github/workflows/docs-pages.yml` 全部删除。`docs:dev`、`docs:build`、`docs:build:mpa`、`docs:preview`、`docs:check`、`website:dev`、`website:build` 和 `verify-doc-site-fragments` 脚本一并移除，`website` workspace 成员及其在 `tsconfig.host.json`、`.oxlintrc.json` 与 `knip.json` 中的条目也随之移除。`doc-sync` 失去 `docs-site-build` 与 `docs-site-projection` 两个叶子；`docSyncLeafGates` 失去 `docsBuildScript` 选项。`docs/` 仍是文档语料，从仓库直接阅读——其余每一道文档门禁（链接、fragment、折行、配对、预算、引用、目录）都未改动，仍在强制约束它。

**Windows CI 保留一条阻塞泳道，但不再是站点构建。** `ci-windows-blocking` 现在只有 build，`ci-windows-complete` 不再调度生产站点，`ci-master.yml` 的 consolidated-runner 基准测试中 Windows 的 workload 改为 `build`。这条泳道原本是为了证明 Windows 能跑一个原生开销很大的长任务；build 同样能达成这个目的，而站点已不复存在。

**浏览器开发循环已删除，但它所喂养的运行时没有。** `scripts/dev-web.ts` 与 `dev:web` 脚本删除，驱动该 watcher 的 `apps/web/tests/hmr-live.e2e.ts` 一并删除。`@deepseek-ai/dsh-client-hmr` 仍挂载在 `web-app` bundle 中：它的 node 半边通过 stat 轮询任何改写 `lib/client.js` 的进程，从不依赖某个特定的 watcher，因此移除仓库自带的 watcher 只会让这条链路空闲，而不会让它损坏。模型可见的 `app:web-surface` 提示词不再点名 `pnpm run dev:web`，而是以「同一检出目录中的另一个 watcher」表述同一约定——无论开发者运行哪种重建进程，这句话都成立。

**`apps/web`、`packages/client/*`、`packages/host/webserver` 与 `packages/bundle/web-app` 明确保留。** 就本次移除的含义而言，它们并不是「Web 开发」，而是 Electron 的 renderer。`desktop/src/main/runtime/harness-runtime.ts` 启动 `dsh web --no-open --host 127.0.0.1 --port <n>`，`desktop/src/main/index.ts` 从 `@deepseek-ai/dsh-web-frontend/dist` 读取品牌资源，`@deepseek-ai/dsh-web-app` 是桌面端安全模式与恢复 profile 中的核心 bundle。删除它们会让桌面应用的窗口没有任何内容。`test:web*` 泳道基于同一理由保留：它们是桌面端所交付 renderer 的唯一自动化覆盖。

**仅服务于文档站的 Agent Note 予以归档，而非改写。** 七组已实现三文件组——站点投影、导航与外框、纯 Markdown 孪生页、tag 发布、站点图片、已发布文档 fragment，以及快速开始 locale 重定向——其决策已不再描述树中任何东西，故按标准流程加 `Archived:` 标记并写入 manifest 封存，移入 `archived/`。仍然活跃的笔记中的入链已修复：浏览器 GIF 笔记改为按冻结路径引用已归档的图片决策，产品优先 README 笔记去掉了一句关于已不存在站点的断言。两份中文归档侧需要把全角的 `Agent Note：` 标题冒号规范为 ASCII，因为 `verify-agent-note-format` 只检查英文侧而归档校验器两侧都查——这是本次归档暴露出的一处潜在分歧。

**`docs/user/index.md` 变成真正的索引。** 它此前只有 VitePress 重定向 frontmatter 和一个标题，没有站点便毫无意义；现在中英两侧都列出 `docs/user/` 下的指南。

## 验证

`scripts/run-gates.spec.ts` 固定了新的 `doc-sync` 叶子顺序和 Windows 观察性过滤，且通过。`packages/bundle/web-app/tests/web-app.spec.ts` 断言 `app:web-surface` 区段中改写后的更新约定句，`apps/web` 的两份提示词快照（`web-runtime-context`、`fresh-round-trip`）携带同一文本，因此这处模型可见改动在装配后的 transcript 与单元测试中都被固定。`verify-md-links`、`verify-doc-refs`、`verify-agent-note-format`、`verify-agent-note-classification` 与 `verify-archived-agent-notes` 在整个语料上通过。`verify-translation-pairing` 只报告本分支上先于本次改动就存在的违规（树内 `plugins/*` README、`plugin-manager/`、`docs/subsystems/skills.md`、`packages/client/ui-sidebar`），已通过对 stash 后的干净树运行该门禁确认。

## 曾考虑的替代方案

- **连 `dsh web` 和整个 web 运行时一起移除。** 这是对「移除 Web 开发」字面理解的做法，但它会摧毁产品：Electron 应用没有自己的 renderer。要走到那一步，得先让 `desktop/` 自行托管并伺服 client——那是重写而非移除，而且本次请求并未要求，因为 Electron 的开发与生产必须继续可用。
- **保留 `website/` 但不构建，只把它移出 CI。** 否决：不再构建的投影器会悄然腐烂，而 `AGENTS.md` 的预发布立场是宁可彻底删除一个表面，也不带着一个休眠的表面走。
- **连同 watcher 一起移除 `packages/client/hmr`。** 否决，超出范围：接收端是 `web-app` bundle 中的一个运行时行，桌面组合会加载它，移除它就改变了 Electron 交付的内容；而且这条链路配合任何改写客户端 bundle 的进程都能工作，并不绑定某个仓库脚本。
- **删除而非归档这些站点 Agent Note。** 否决：笔记 README 只允许通过合并进某个保全全部独有理据的归属笔记来删除。对于一个已完成、其理据不再指导后续工作的决策，归档才是被认可的做法，而且归档同时会把这些笔记移出链接门禁的源文件集合。

## 后果

文档现在只从仓库阅读；没有已发布站点、没有 `llms.txt`、也没有渲染后 HTML 的 fragment 检查，因此标题锚点仅由 `verify-md-links` 按 GitHub slug 保证。若有人想要恢复站点，可以把已归档的投影笔记当作起点，但必须重建投影器——它无法靠某个配置开关恢复。客户端插件热重载对自行运行重建 watcher 的人仍然可用，只是不再是仓库文档化的工作流。Windows CI 不再执行 VitePress 构建，那曾是它耗时最长的单个作业。本仓库仍然承载的唯一 Web 开发是 `plugin-manager/`，它是 pnpm workspace 之外的独立 Next.js 项目，本次改动未触及。
