# Agent Note: The requester chooses the color palette at the start of the prototype

Status: implemented

[English](2026-09-16-requester-chosen-color-palette-skill.md) | 中文

## Problem

产品 skill（技能）流程中没有任何阶段决定颜色。`03-prototype` 用 Tailwind Play CDN 的默认颜色给界面上色，`prototype.md` 只在 Global decisions 下用自由文本记录「theme」，`shadcn-ui` 禁止硬编码颜色，却把变量值留在 `init` preset 的默认状态。因此每个生成的系统都带着 requester 从未作为选项见过的 preset 颜色交付；对话中提到的品牌色既到不了原型也到不了构建，因为承载它的工具结果会滚出模型的上下文。

## Decision

**`ui-palette` 负责调色板，选择发生在 `03-prototype` 的 Part 0，在任何界面之前。** `plugins/dsh-skill-manager/skills/ui-palette/SKILL.md` 让 agent（智能体）从 `01-brief.md` 推导出 3–4 套调色板（requester 已有品牌色时排在第一），在 `prototype/palettes.html` 中以浅色与深色迷你 UI 预览渲染它们，用 `prototype_automation` 打开该页面，再用 `ask_user_question` 提问：每套调色板一个选项，自定义颜色走自由文本回答。自定义颜色会被解析，缺失的角色由其推导，WCAG AA 对比度用 `prototype_automation` `eval` 实测，自定义调色板先渲染并确认，然后才记录。

**`mds/epics/<epic>/03-palette.md` 是颜色的唯一来源。** 它包含每个角色（shadcn 变量名加上 `success` 与 `warning`）的浅色与深色值、requester 的原话、推导出的角色以及对比度表。原型通过唯一的 `prototype/theme.js` 读取它，该文件设置 RGB 通道形式的 CSS 变量和 Tailwind Play CDN 的颜色配置；React 应用通过 `shadcn init` 生成的主题 CSS 文件读取它。由于该产物是 `mds/` 下的文件，后续每个阶段和每份 subagent briefing 都按路径读取它，这个选择因此在整个 epic 期间都留在模型上下文中。

**规则写在每个决定发生的地方。** `00-start-here` 载有常设指令，`03-prototype` 以已验证的调色板作为 Part 1 的前提并在 `prototype.md` 中引用它，`04-tech-plan` 要求该文件并记录一行 Theme colors 的 Decisions，`07-build` 在 UI briefing 中加载 `ui-palette` 并给 evaluator 增加针对颜色字面量的 RED 检查，`shadcn-ui` 把其变量值指向该调色板。

## Alternatives considered

**在桌面应用中提供原生调色板提问。** 问题面板内的色块和取色器会比原型页面更好看。暂不采用，因为它需要在 `packages/interaction/user-questions` 中新增 `AskUserQuestionIntent`，修改 `packages/host/apiproxy/src/api/events.schema.ts` 中的严格协议 schema、`ask_user_question` 工具 schema、`packages/client/ui-user-questions` `QuestionComposer` 中的面板、LAN 移动端提问页面、两个 SDK 的快照，并发布客户端。skill 如今通过技能库 seed 就能到达用户，之后的 intent 只需替换该 skill 的第 3 节。

**在 `01-epic-brief` 中选择调色板。** 更早，且与品牌识别放在一起。不采用，因为 requester 将在没看到任何界面的情况下选择颜色，而 `03-prototype` 才是外观得到验证并冻结的地方。

**让 `04-tech-plan` 自行挑选颜色。** 与「库由 agent 自行决定」一致。不采用，因为颜色改变 requester 收到的东西，且在 ticket 构建之后撤回代价高，这正符合流程自身判断「交给 requester 决定」的标准。

## Consequences

经由该流程构建的每个原型和应用都使用 requester 的调色板，零散的字面量可以被机械地找出：skill 中对 `prototype/*.html` 的 grep，以及 `07-build` 中 evaluator 的检查。`palettes.html` 是唯一允许颜色字面量的原型文件，且永不进入 `prototype.md`。

原型冻结后更换调色板属于 `03-prototype` 冻结规则下的修订，`03-palette.md`、`theme.js` 与应用主题 CSS 一起变更。

该 skill 通过技能库而非客户端发版到达已认证的 agent：`node scripts/sync-skills.mjs` 把它镜像到 `plugin-manager/prisma/skills/ui-palette/`，seed 在下次 deploy 时发布它并挂到 `Padrão` profile。手工精选的 profile 在有人于其中勾选之前不会收到它。
