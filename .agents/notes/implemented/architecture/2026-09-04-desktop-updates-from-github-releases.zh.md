# Agent Note: 桌面端更新从本仓库的 GitHub Releases 发布

Status: implemented

[English](2026-09-04-desktop-updates-from-github-releases.md) | 中文

## Problem

桌面应用早已具备完整的自动更新机制——`electron-updater`、阶段状态归约、跳过某个版本的持久化、回滚版本选择器，以及由 preload 注入的更新卡片。但它指向的是我们并不拥有的基础设施：更新源是厂商域名 `https://dshdesktop.com/updates/`，回滚归档位于厂商账号下的 ModelScope 仓库，发布通知发往厂商的飞书 webhook。已安装的版本永远收不到本仓库发布的新版。

发布本身也走不通。发布需要手动推送 `shiva-desktop-v*` 标签，而 `publish` 作业还依赖 macOS 公证作业，以及运行在持有 SafeNet UKey 的自托管 macOS Runner 上的 `sign-windows` 作业。本仓库既没有那台 Runner，也没有那六个 Apple 机密，因此任何标签都产不出发行版。

## Decision

更新从 `INAC-Sistemas/shiva-code` 的 GitHub Releases 发布，并且向 `rai` 推送即发布一个版本。`rai` 是产品的集成分支：`master` 跟踪上游 harness，根本不含桌面应用，因此不是发布分支。代价是在本工作流也存在于默认分支之前，`workflow_dispatch`——即重新发布与预发布路径——不会出现在 Actions 界面中。

### 更新源仍使用 `generic` provider

稳定更新源是 `https://github.com/INAC-Sistemas/shiva-code/releases/latest/download/`，即 GitHub 指向最新发行版资产的永久重定向。回滚时更新源指向 `releases/download/shiva-desktop-v<semver>/`，回滚索引则是每个发行版自带的 `versions.json` 资产。

`github` provider 被否决。`update-manager.ts` 在安装指定版本后会用 `setFeedURL({ provider: 'generic', … })` 恢复稳定更新源，因此以 `github` provider 打包会与其自身的运行时更新源相冲突。`generic` provider 还让按版本的基址是一个普通 URL，而该 URL 恰好含有版本号——于是 `Provider.getBlockMapFiles` 能为回滚推导出正确的旧 blockmap URL，而不含版本号的产物名本会阻断这一点。

由这些 URL 构建的每个更新源都设置 `useMultipleRangeRequest: false`。`electron-updater` 会对任何非 S3 的 URL 启用多区间下载，而 GitHub 的资产 CDN 对多区间请求返回 `501`。若不显式关闭，每次更新都会先取两个 blockmap、再发出一次注定失败的区间请求，然后才退回完整下载。单区间请求返回 `206`，因此增量下载仍然可用。

**更新源依赖 GitHub 对"最新发行版"的判定**，而本仓库的标签命名空间与 harness（`dsh-v*`）共用。三点保障它：`publish` 显式传入 `--latest` 而非依赖日期启发式；`publish-prerelease` 从不传入；以及一旦有其他工作流开始创建 GitHub Release，`desktop/test/release.test.ts` 就会失败。目前只有 `desktop-release.yml` 会创建。

### 由一个作业解析版本

`resolve-version` 最先运行，输出 `version`、`tag`、`publish`、`prerelease` 和 `windows_artifact`。约三十处重复的 `startsWith(github.ref, 'refs/tags/shiva-desktop-v') || inputs.prerelease_tag != ''` 收敛为 `needs.resolve-version.outputs.publish == 'true'`，三组成对的版本设置步骤也各自收敛为一步。

版本规则是：当 `package.json` 大于最高的 `shiva-desktop-v*` 标签时取它，否则取该标签并递增补丁位。补丁位归 CI 所有；`package.json` 是经评审的次版本/主版本旋钮，同时也为序列提供起点——落地时尚不存在这类标签，仅靠"最高标签加一"会解析不出任何版本。若解析出的标签已存在，该作业拒绝运行。

不设标签触发器。`push` 块上的 `paths` 同样会过滤标签推送，而打在已推送提交上的标签其差异是退化的，因此在分支路径过滤旁再放一个标签触发器会静默吞掉发布。`publish` 在资产就绪处自行创建标签；用 `GITHUB_TOKEN` 推送的标签不会再次触发工作流，因此不会形成回环。

### 签名被保留而非移除

`sign-windows` 与两个 macOS 作业完整保留在工作流中，各自由一个仓库变量把关——`DESKTOP_WINDOWS_SIGNING` 与 `DESKTOP_MACOS_RELEASE`。一旦 Runner 或 Apple 机密就绪，重新启用只是一次配置改动。`publish` 将被跳过的签名或 macOS 作业视为可接受、将失败的视为阻断，并读取 `windows_artifact` 以在签名产物存在时消费它。`finalize-windows-release.mjs`——在签名改写安装包后重新生成 blockmap 与 `latest.yml`——原样保留。

被删除的只有厂商自有的基础设施：ModelScope 镜像、仅为填充该镜像而存在的 `desktop-backfill-archive.yml`，以及飞书 webhook。`feishu_release_notes.py` 本身得以保留——`github_release_notes.py` 从中导入 `collect_release_evidence`、`release_version` 与 `LINK_PATTERN`——仅移除 `send` 子命令与卡片格式化部分。

`verify-release-assets.mjs` 现在接受要校验的平台。它此前无条件要求六个 macOS 资产，而仅含 Windows 的发行版无法满足。

## Alternatives considered

**把更新源托管在运行插件库的 VPS 上。** 这能保持既有 `generic` provider 的 URL 形态，并对灰度与指标有完全控制。否决原因：仓库是公开的，GitHub Releases 无需令牌、无需服务器、无需存储、也无需上传步骤，且其 CDN 已支持区间请求。

**为安装包单设一个公开仓库。** 这能彻底消除共用标签命名空间的隐患，因为那里不会有别的东西成为最新发行版。因过早而否决：它需要第二个仓库和跨仓库令牌，并会把[桌面端并入](../process/2026-09-04-desktop-app-in-repository.zh.md)刚刚合并的发布说明与标签历史再次拆开。`--latest` 加一个守卫测试以低得多的代价覆盖了该隐患，逃生方案记录于下文。

**由 CI 把版本号回提到发布分支。** 这会让 `package.json` 有一个真实的值。否决原因：它需要能推送受保护分支的令牌；用 `GITHUB_TOKEN` 推送会产生一个自身触及 `desktop/` 的提交，还得再排除；而用 PAT 推送会重新触发 `on: push`，即无限发布回环。改以标签作为唯一真相来源。

**删除签名作业，日后再从 git 历史中恢复。** 依用户要求否决，且无论如何这都是更好的选择：保留它们意味着 `release.test.ts` 中关于 Jsign、UKey 和公证的既有断言，会在这段代码闲置期间持续守护它不腐坏。

## Consequences

向 `rai` 推送并触及桌面应用即发布一个版本，因此版本号随合并推进，而非随刻意打标签推进。文档、测试和仅 Markdown 的路径已排除在触发器之外；`desktop/` 下的其他改动都会发布，并在六小时内向每个已安装的应用弹出更新卡片。

在设置 `DESKTOP_WINDOWS_SIGNING` 之前，Windows 安装包未签名，因此首次安装时 SmartScreen 会提示发行者未知。更新本身不受影响：`win.verifyUpdateCodeSignature` 本就为 `false`。

Windows 冒烟测试现在也对发行版构建运行。它此前会跳过标签推送，这意味着送达用户的那个安装包正是 CI 中从未启动过的那个。

在次版本递增之间，`desktop/package.json` 仍会落后于已发布版本。这原本就是事实，如今成为写明的规则而非偶然。

若日后确需在此发布 harness 的发行版，它必须传入 `--latest=false`。若这变得常见，逃生方案是设一个长期存在的 `shiva-desktop-updates` 发行版并标记为预发布——使其永远不会成为"最新"——其中只放 `latest.yml` 与 `versions.json`，安装包以绝对 URL 指名，而 `resolveFiles` 会优先采用绝对 URL 而非基址。

## Testing

在 `desktop/` 下运行 `npm test` 覆盖该应用的 669 项测试，包括重写后的工作流断言、version-catalog 的 URL、按平台限定的资产校验，以及一项新守卫：没有其他工作流会创建 GitHub Release。`npm run typecheck` 覆盖更新源常量。

以上都无法证明更新真的送达了用户。端到端证据是在一台 Windows 机器上安装连续两个发行版，用**检查更新**避开六小时间隔，再依次点击**立即更新**与**重启并安装**，在关于对话框中确认新版本，并确认日志中没有 `multipart/byteranges` 错误。
