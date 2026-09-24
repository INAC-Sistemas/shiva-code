# Agent Note: Frontend design, motion and React quality skills in the library

Status: implemented

[English](2026-09-16-frontend-design-and-motion-skills.md) | 中文

## Problem

产品 skill（技能）流程已经规定了控件、图标和颜色如何选择（`shadcn-ui`、`ui-icons`、`ui-palette`），但除此之外没有任何环节决定外观。原型和应用交付的是模板结果：默认字体、原样的 shadcn 布局、居中 hero 下方三张等宽卡片，而且没有任何动效。requester 想要会动的现代页面。主机上已有覆盖这一点的社区 skill（`frontend-design`、`ui-ux-pro-max`、`baseline-ui`、`tailwind-patterns`、`react-ui-patterns`、`react-best-practices`、`fixing-accessibility`、`fixing-motion-performance`），但出于三个原因不能原样复制。它们彼此矛盾，也与流程矛盾：`frontend-design` 要求大胆的调色板并禁止「用组件做设计」，而 `baseline-ui` 禁止未经要求的动画、渐变和自定义缓动。其中几个依赖技能库无法提供的文件：`LibrarySkill` 只存储 `SKILL.md` 正文，因此 `ui-ux-pro-max` 的 Python 搜索脚本和 CSV 目录、`react-best-practices` 的 `rules/` 目录都会丢失。它们还假定了流程不使用的技术栈（Apollo、React Native `FlatList`、处处 `next/dynamic`、Heroicons、优先 Base UI）。

## Decision

**八个 skill 经过改写，而非镜像。** 每个都位于 `plugins/dsh-skill-manager/skills/<name>/SKILL.md`，是一份带 `whenToUse` 的自包含英文正文，并同步到 `plugin-manager/prisma/skills/` 供 seed 使用。`ui-ux-pro-max` 以从原始 CSV 文件生成的精简 Markdown 表格承载其目录（96 种产品类型、57 种风格、57 组字体搭配、27 种落地页模式）。`react-best-practices` 精简保留全部 45 条规则，把 Server Components 规则标为仅限 Next.js，并用流程的默认做法替换 `better-all`、只用 SWR 的数据获取和 `lucide-react` 深层导入。每份正文末尾有一行注明来源。

**动效是必需的，且只有一个归属。** `frontend-design` 第 3 节定义动效约定：每个界面都有入场序列、滚动显现、控件反馈、状态切换过渡、带动画的加载，以及一个标志性动效，全部由时长与缓动 token 驱动。`baseline-ui`、`fixing-motion-performance`、`fixing-accessibility`、`tailwind-patterns` 和 `react-ui-patterns` 执行这一约定而不是与之矛盾。它们限制动效如何运行（大面积表面只动合成属性、减少动效时保留内容、动画从不阻塞输入、CDN 失败时内容仍可见），而不限制动效是否存在。由调色板角色构成的渐变、光晕和纹理是允许的。

**设计方向是一个产物。** `frontend-design` 紧接 `03-palette.md` 之后记录 `mds/epics/<epic>/03-design.md`：美学方向、辨识锚点、字体搭配、构图和动效 token。`03-prototype` 以它作为界面的前提，并要求用 Motion 的 CDN 构建（`https://cdn.jsdelivr.net/npm/motion@13/dist/motion.js`，全局 `Motion`）制作带动画的界面。`04-tech-plan` 要求该文件，并新增一行字体与动效的 Decisions（`motion/react`，与 `shadcn init` 安装的 `tw-animate-css` 并存）。`07-build` 用有限的 skill 集合给 UI builder 写 briefing，并给 evaluator 增加 RED 检查：缺少动效、破坏减少动效设置的动效、缺少数据状态、严重无障碍违规。`00-start-here` 写明这条常设规则，`ui-palette` 从目录中读取产品类型的色彩基调。

**skill 加载按角色限定。** `ui-ux-pro-max`（约 50 KB）只在 `03-prototype` 的设计方向步骤加载。builder 在三个已有 UI skill 之外加载 `frontend-design` 和 `baseline-ui`，只有 ticket 需要时才加载 `react-ui-patterns`、`tailwind-patterns` 或 `react-best-practices`。evaluator 以审查模式加载两个 `fixing-*` skill。这样 UI briefing 保持在 `07-build` 的上下文预算内。

## Alternatives considered

**原样复制主机上的 skill。** 最快的做法。不采用，因为模型会在动画和颜色上收到相反的指令，目录类 skill 会引用客户端上不存在的脚本和数据，示例也会把 builder 引向流程禁止的库。

**由技能库提供 bundle 资源。** 给 `LibrarySkill` 增加文件存储、给远程 skill 加载器增加资源路径，就能保留原本的多文件 skill。本次不采用，因为这会涉及 Prisma schema、API、插件外壳和一次客户端发版，而精简进正文的代价只是一份更大的 skill 正文。

**让动效可选，由 `frontend-design` 按产品决定。** 不采用，因为 requester 明确要求页面带动画，而一条可选规则恰恰就是被 `baseline-ui` 变成「不要动画」的那种规则。

## Consequences

经由该流程构建的每个原型和应用都有记录在案的视觉方向和带动画的界面，evaluator 可以依据具名规则拒绝静态或模板化的界面。原型冻结后更改字体、方向或动效，与更换调色板一样，属于 `03-prototype` 冻结规则下的修订。

目录表格是源 CSV 文件的快照。更新它们需要重新生成表格并编辑正文；没有可替换的数据文件。

这些 skill 在下次 deploy 时到达已认证的 agent：seed 创建这八行，并把它们挂到每个用户的 `Padrão` profile。手工精选的 profile 只有在有人勾选后才会收到它们。
