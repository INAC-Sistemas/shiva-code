# Agent Note: One icon rule for product UI — Lucide first, Tabler second

Status: implemented

[English](2026-09-16-lucide-and-tabler-icon-skill.md) | 中文

## Problem

产品 skill（技能）告诉 agent（智能体）标准控件从哪来（`shadcn-ui`），却从未说图标从哪来。没有任何地方指定图标包，于是每个 ticket 都重新决定一次：手写一段 `<svg>` path、在按钮文字里塞 emoji、再加第四个图标依赖，或者写一个下次发版就会失效的 `dist/` 深路径 import。`03-prototype` skill 让情况更糟：它把图标列进 `generate_image` 产出的素材里，与它自己「用 CDN 加载 lucide」的指令自相矛盾——用生成的 PNG 顶替字形，既不能缩放、不能改色，也配不上它所在的控件。

有两个事实让这个缺口很便宜就能补上。DSH Desktop 为每个 agent shell 在 `PATH` 上自带 Node.js 与 pnpm，因此 builder 能在没有系统 Node.js 的最终用户机器上装包；而 plugin-manager 的 seed 现在每次 deploy 都会把版本化的 `SKILL.md` 发布到技能库（[seed 重建技能库 skill](../architecture/2026-09-16-plugin-manager-seed-recreates-skills.zh.md)），因此一条新规则无需客户端发版就能到达已认证的 agent。

## Decision

**`ui-icons` 是拥有图标这件事的 skill，Lucide 是默认。** `plugins/dsh-skill-manager/skills/ui-icons/SKILL.md` 写明取包顺序——项目 `package.json` 里已有的包优先，否则 `lucide-react`；`@tabler/icons-react` 只在 Lucide 没有对应含义的字形、或请求方点名时使用。两个包都是 MIT、都是描边风格、都与 shadcn/ui 视觉相容，这就是集合止于两个的原因：当其中任一个能覆盖需求时，手写 SVG、用 emoji 当图标、或引入第三个包都是缺陷。

**规则写在真正做决定的地方。** `04-tech-plan` 把图标包与 shadcn 的 template、base、preset 并列记进 Decisions 行；`07-build` 在每个 UI ticket 的 briefing 里与 `shadcn-ui` 一起加载 `ui-icons`，并加上对应的 evaluator 检查；`00-start-here` 承载那条一行常务规则；`03-prototype` 不再把图标列进生成素材。安装是 builder 的动作（`pnpm add`），因为 `dsh-tool-guard` 拒绝主 agent 在 `mds/` 与 `prototype/` 之外写入。

**这个 skill 写下那些否则会静默出错的机制。** 只从包根做具名 import，因为 `dist/` 深路径破坏 tree-shaking 并会随发版失效；用 Tailwind 尺寸 class 与 `currentColor`，而不是像素与十六进制字面量；装饰性字形用 `aria-hidden`，纯图标控件用 `aria-label`；在只用 CDN 的原型里，`data-lucide` 取 kebab-case 名称，并在任何注入标记之后重新调用 `lucide.createIcons()`，Tabler 则按同一条规则三的例外使用 webfont。

## Alternatives considered

**把图标规则并进 `shadcn-ui`。** 少一个 skill，而且 shadcn 本来就会把 `lucide-react` 作为组件依赖装进来。否决原因是两条规则的适用范围不同：图标出现在只用 CDN 的原型里，那里没有 shadcn；也出现在排除了 shadcn 的项目里，而 `04-tech-plan` 完全可以正当地记下不用 shadcn，却仍然需要一个图标包。一个为「标准控件」而加载的 skill，不会被只加一个图标的 ticket 加载。

**只选一个包，禁止第二个。** 这是最容易评判的规则。否决原因是 Lucide 的目录没有品牌字形，金融与设备符号也覆盖很薄，因此单包规则会在第一个「用 GitHub 登录」按钮上被打破——而且是以手绘 SVG 的方式打破，那正是这个 skill 要防的结果。把 Tabler 作为点名并需上报的例外，能把逃逸口留在规则之内。

**让技术方案随意选包。** 每个项目自由度最大。否决原因是：开放选择正是不一致的来源；没有默认，每个 epic 都要重新争论一次，而同一产品里混用图标包，用户能直接看出描边粗细与圆角不匹配。

**在 skill 的安装命令里钉死具体版本。** 安装可复现。否决原因是 skill 正文不是 lockfile：任一图标包一发版，钉死的版本就成了过期指令，而可复现性属于项目自己的 lockfile。不带范围的 `pnpm add` 才是长期成立的指令。

**把一套图标 vendored 进项目，而不是依赖包。** 没有安装步骤，没有 registry 也能用。否决原因是这等于交给 agent 一整个要手工维护的 SVG 目录——同一个缺陷换了个形式——而两个包本来就只把真正 import 到的字形留进产物。

## Consequences

图标现在有唯一正确答案，错误答案在评审时也有机械依据：evaluator 的 UI 检查把手写 SVG 与 emoji 当图标，和手写控件并列点名。已经带着另一个图标包的项目不受影响，因为已安装的包优先于两个默认。

规则通过技能库到达已认证的 agent，而不是通过客户端发版：`node scripts/sync-skills.mjs` 把 bundle 镜像到 `plugin-manager/prisma/skills/ui-icons/`，seed 在下一次 deploy 发布它并挂到 `Padrão` profile。作为有意手工裁剪的 profile 在有人在那里勾选之前不会拿到它。

在 Tabler 例外之下，一个项目里可以并存两个包，这是不靠手绘 SVG 覆盖品牌字形所接受的代价；ticket 报告会点明是哪个屏幕需要它，评审者因此能看出这个例外是否真实。
