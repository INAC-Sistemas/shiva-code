# Agent Note: The desktop app lives in this repository

Status: implemented

[English](2026-09-04-desktop-app-in-repository.md) | 中文

## Problem

Electron 应用此前从独立仓库 `INAC-Sistemas/dsh-desktop` 发布。它只以构建产物的形式消费 harness：243 个 `@deepseek-ai/dsh-*` tarball 和 16 个仓库内插件 tarball，全部以 `file:` 依赖的形式引用 `desktop/packages/harness-<version>/` 下的路径。因此该应用需要的每一处 harness 或插件改动，都要以打包再复制的步骤跨越仓库边界传递，而横跨两棵树的改动无法作为一个单元评审、测试或回滚。

## Decision

`desktop/` 存放 Electron 应用，通过 `git subtree add` 导入，其 373 个提交仍然可达。它仍是独立的 npm 项目，拥有自己的 `package-lock.json` 和 `.npmrc`：`pnpm-workspace.yaml` 中没有任何 glob 匹配 `desktop/`，因此根目录的 `pnpm install` 不会把它当作工作区成员，其依赖仍在 `desktop/` 下用 `npm ci` 安装。

`desktop/packages/harness-<version>/` 下的 tarball 快照保持不变。删除它会破坏 `desktop/package.json` 声明的 259 个 `file:` 依赖，因此该应用仍以发布产物而非工作区源码的形式消费 harness。

### Continuous integration

GitHub 只读取仓库根目录的 `.github/workflows/`，因此两个桌面工作流以 `desktop-release.yml` 和 `desktop-backfill-archive.yml` 的名字放在那里。两者都设置 `defaults.run.working-directory: desktop`；action 输入改为相对工作区根目录解析，因此显式携带前缀，产物路径、`download-artifact` 目标和 `cache-dependency-path` 都写明 `desktop/`。发布工作流的 pull request 触发器限定在 `master` 以及 `desktop/` 下的路径。

发布通过推送 `shiva-desktop-v<semver>` 触发，独立仓库携带的 26 个标签不予导入。前缀标明产品，因为本仓库同时以 `dsh-v*` 发布 harness。其后的 semver 是发布的应用版本，并作为 ModelScope 回滚归档 `releases/archive/<semver>/` 的键，因此必须延续已发布的序列；`package.json` 中的版本已过时，工作流会用标签覆盖它。所有面向用户的字符串仍渲染为 `v<semver>`，因此发布标题与说明标题与此前一致。

发布说明由两个发布标签之间的提交区间生成。该区间现在也跨越 harness 提交，因此 `feishu_release_notes.py` 把它的 `git log` 和 `git diff` 限制在当前目录，而工作流将该目录设为 `desktop/`。

### Gates

两个仓库门禁扫描到新目录并拒绝了它。`rescope-vendor` 与双语配对门禁都豁免 `desktop/`：该应用消费的发布 tarball，其 peer 版本范围合理地带有上游名称，而它按自己的命名方式翻译自己的 README，不使用 `.i18n.yaml` 记录。[vendored rescope](2026-08-10-vendor-package-rescope.zh.md) 拥有这两处豁免所针对的重命名。

桌面应用捆绑了它所测试的那个 pnpm 版本。由于 pnpm 10 会把自身替换为最近祖先 `packageManager` 字段所指定的版本，从检出目录运行的 profile 命令本会取到 harness 根目录的 pnpm；现在其 spawn 环境把 `manage-package-manager-versions` 关闭。

## Alternatives considered

**让应用留在自己的仓库。** 这保留了独立的发布打标签方式和更小的克隆体积，但会把每一处同时涉及 harness 与应用的改动拆到两条评审历史里，而这正是本次导入所消除的代价。

**把 `desktop/` 变成 pnpm 工作区成员。** 这才能让应用基于 `plugins/` 和 harness 源码构建，而不是基于 259 个 tarball，也正是把两者放进同一个仓库的理由。它被刻意排除在本次导入之外：把 npm 的 `file:` tarball 依赖与 pnpm 解析调和是一次更大的改动，在此处进行会把一次机械导入与一次构建系统重写混在一起。

**在导入时删除临时 tarball 快照。** 它自己的 README 标明其为临时目录，等待尚未发生的上游 npm 发布。删除它会破坏 `npm ci`，而这些 blob 无论如何都留在历史中，因此这棵树保持原样。

**保留桌面应用裸的 `v*` 标签并导入它们。** 这不需要任何代码改动，也不会冲突，因为 harness 以 `dsh-v*` 发布，且本仓库没有其他工作流由标签触发。它被否决，是因为裸的 `v*` 无法说明一个标签发布的是两个产品中的哪一个，而按一个正在退役的约定导入 26 个标签，会让一份列表里并存两套方案。

## Consequences

一次克隆、一条评审历史、一个回滚单元即可覆盖 harness 与应用。仓库 pack 增大约 40 MB，其标签命名空间现在共享——`shiva-desktop-v*` 属于桌面应用，`dsh-v*` 属于 harness。

丢弃旧标签的代价是第一次发布没有前驱：`find_previous_tag` 匹配不到任何标签，因此那次发布的说明取自最近 100 个提交，而非标签区间。其后的每次发布都恢复为区间。唯一读取本仓库真实标签历史的那个测试已被删除，它自 fork 以来一直处于跳过状态；与它相邻的合成历史测试以确定的方式覆盖同一处前驱标签解析。

为 Windows 安装包签名的自托管 macOS runner 注册在旧仓库上，必须先在此处重新注册，发布才能完成。切换时仍未合并到 `INAC-Sistemas/dsh-desktop` 的分支不在本次导入范围内，需要在 `desktop/` 之上重新应用。

## Testing

`desktop/` 下的 `npm test` 覆盖该应用的 666 个测试，包括现在读取根工作流路径的发布工作流断言。`pnpm run hygiene` 和 `pnpm run test:docs` 覆盖这两处门禁豁免。
