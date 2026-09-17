# Agent Note: Product skills grouped under category folders

Status: implemented

[English](2026-09-17-skill-category-folders.md) | 中文

## Problem

产品 skill（技能）原先平铺在 `plugins/dsh-skill-manager/skills/<name>/`。23 个 bundle 把构建流程、UI 设计、React 质量和 profile 管理并排放在一起，目录已看不出哪些 skill 属于同一领域，而每个新领域只会继续增加平级目录。这棵树的两个读取方——plugin-manager 的 seed 与本地 skill-manager 扫描器——都只读一层，因此不改它们就无法引入文件夹。

## Decision

**bundle 位于 `skills/<category>/<name>/SKILL.md`，当前所有 skill 都在 `system-development/` 下。** 分类名是英文 kebab-case 文件夹。`node scripts/sync-skills.mjs` 本就递归镜像，所以 `plugin-manager/prisma/skills/` 无需改脚本即得到相同布局。

**分类只是文件夹，不是技能库字段。** `LibrarySkill.name` 在整个技能库内保持唯一，因为 `skill({ name })` 只按名称寻址；分类只存在于磁盘，不会进入 API、profile 目录或模型。

**两个读取方都会下探一层进入不含 `SKILL.md` 的目录。** 在 `plugin-manager/prisma/seed.ts` 中，`listSkillBundles()` 同时返回顶层 bundle 与分类下的子目录；若另一个分类里已 seed 过相同 `name`，后出现的 bundle 用 `console.error` 记录并跳过，否则每次 deploy 都会覆盖第一行。在 `plugins/dsh-skill-manager/lib/index.js` 中，`scanRoot()` 采用同一规则，因此 skill-manager 标签页能原地列出并编辑移动后的 bundle。

## Alternatives considered

**把分类存为 `LibrarySkill` 列。** 这能让面板按分类分组。暂不采用，因为目前没有任何地方消费分类，而新列需要迁移、frontmatter 键和面板 UI，却没有读取方。

**递归到任意深度。** 不采用，因为 bundle 自身的子文件夹（references、assets）会被当作候选 skill 扫描；一层分类已满足需要。

## Consequences

新的产品 skill 在某个分类文件夹内创建；`plugin-manager/AGENTS.md` 写明了这条规则。skill-manager 的 `create` 端点仍写到 user scope 根目录，按一层规则它被读作未分类 bundle。seed 按 `name` 匹配，技能库行保留原 id，因此 profile 选择在移动后依然有效。
