# Agent Note: Plugin-manager seed recreates library skills on every deploy

Status: implemented

[English](2026-09-16-plugin-manager-seed-recreates-skills.md) | 中文

## Problem

产品 skill（技能）只有作为已登录用户的活动 profile 所选中的 `LibrarySkill` 行，才会到达已认证的 agent（智能体）。在仓库里新增 `SKILL.md` 对已有数据库没有效果：seed 只会为缺失的 name 建行，之后不再改写，因此编辑过的文件在有人传入 `--force-skills` 或改面板之前一直不可见。生产环境完全跳过 seed，因为同一脚本还会 upsert 源码中带密码的演示用户。于是新 skill 会错过按 profile 门控的技能库路径，除非运维记得在生产上手动加那个生产环境根本不会跑的标志。

## Decision

**`plugin-manager/prisma/skills/` 下的版本化 bundle 在每次 deploy 时重建 `LibrarySkill` 行。** `seedSkills` 读取每个 `<name>/SKILL.md`，为缺失的 name 建行；当文件有差异时更新 description、正文、调用开关，并写成 `published: true`，且只在那时递增 `revision`。行 id 不变，因此 `ProfileSkill` 选择得以保留。新创建的 name 会挂到每一个名为 `Padrão` 的 profile；其他 profile 仍是手工裁剪。面板里独有、seed 目录中没有对应文件夹的行不会被改动。

**写作路径是 source，然后 sync，然后 seed。** 新产品 skill 加在 `plugins/dsh-skill-manager/skills/<name>/SKILL.md`，由 `node scripts/sync-skills.mjs` 镜像到 `plugin-manager/prisma/skills/`，再用 `--check` 确认。VPS 镜像复制的是这棵树；它不含 monorepo 的其余部分，所以 seed 在运行时读不到桌面那份副本。

**生产环境跑 skill seed，跳过演示用户。** `NODE_ENV=production`（可由 `SEED_USERS` 覆盖）省略对源码中带密码账户的 bcrypt upsert。`docker/entrypoint.sh` 先应用 migration，再运行 `tsx prisma/seed.ts`，然后才 serve。开发环境仍然两边都 seed。

## Alternatives considered

**继续「只创建不更新」，把 `--force-skills` 当作唯一覆盖手段。** 这是原先的 seed 规则，为的是容器重启不要回滚面板编辑。它被放弃，因为产品 skill 的真源是仓库；一次未发布新文件的 deploy 会让按 profile 门控的技能库继续提供过期或缺失的指令；而且 `--force-skills` 是生产上没人跑的标志，生产本来就完全不 seed。

**删除每一行 `LibrarySkill` 再插入。** 一步重建内容，并丢掉已从 seed 树移除的 name。否决原因是 `ProfileSkill` 在 delete 时级联，每个已有 profile 都会失去选择，面板独有的 skill 也会一起消失。按 `name` 原地更新可保留 id，并留下面板独有行。

**增加 `seeded` 列，并删除已离开该树的行。** 能区分产品 skill 与面板 skill，从而让被删文件从技能库消失。否决原因是：这是当前写作路径并不需要的 schema 变更——下线一个产品 skill 应是面板上的显式取消发布或删除，而不是 deploy 的静默副作用。

**每次 deploy 把每条已 seed 的 skill 挂到每一个 profile。** 新文件无需编辑 profile 即可可见。否决原因是 profile 本身就是裁剪；重写非默认 profile 会撤销有意的排除。只有 `Padrão` 接收新创建的 name，而这正是 seed 在用户尚无任何 profile 时用来填满整份已发布技能库的那个 profile。

**把 skill 正文打进客户端插件包，而不是 VPS 技能库。** 可以不要 seed。否决原因是 skill 就是智能，客户端只跑壳，正文只按 token 的活动 profile 提供——这正是技能库已经在执行的访问规则。

## Consequences

一次包含 seed 树中新增或编辑过的 `SKILL.md` 的 deploy，会在下一次容器启动时发布该正文，客户端通过 `revision` 发现变更。这些同名行上的面板编辑会在文件有差异时被覆盖；这是把文件当作产品真源所接受的代价。

生产环境在「已有用户、却从未跑过 seed」的首次安装之后，不再对空技能库失败关闭：entrypoint 一跑，skill 就会出现。演示账户仍然只在开发环境 upsert。

常务规则写在根目录 `AGENTS.md`，步骤写在 `plugin-manager/AGENTS.md`。`scripts/sync-skills.mjs --check` 是桌面副本与 seed 树之间的漂移检测器。
