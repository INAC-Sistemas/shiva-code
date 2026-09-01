# Agent Note: 由插件提供的浏览器 locale

Status: implemented

[English](2026-09-01-plugin-supplied-browser-locales.md) | 中文

## 问题

web 面板此前只附带两种语言 `zh` 与 `en`，而这个集合被三处互相独立地写死：一个模块级冻结的 `LOCALES` 数组、一张 `<html lang>` 标签的 `Record<LocaleId, string>`，以及守卫持久化偏好的 `z.union([...LOCALE_IDS])`。要加入第四种语言，只能修改 locale 包，并在同一次改动中把它的字典补进全部 29 个已附带的注册点，且必须在仓库内完成。

对一门翻译来说这是错误的形态。语言是叠加性的——它不会从不使用它的读者那里拿走任何东西——而有能力写出一门翻译的人，很少正是拥有那些被翻译文案的包的人。巴西葡萄牙语的任何内容都不该住在 `ui-conversation` 里。

障碍在于：把每个注册点按其 namespace 的键联合进行类型约束的 `LocaleNamespaceMap`，是通过声明合并对 monorepo 中某个包的增强。插件在 monorepo 的 cordis 实例之外解析，收不到这份增强，因此插件的字典只是 `Record<string, string>`，它自己的 `tsc` 没有可比对的对象。可扩展性与完备性证明看上去互相排斥。

## 决策

locale 集合改为运行时注册表，而完备性由仓库来证明，而不是由插件来证明。

**`LocaleRuntime.registerLocale(definition)`** 把一门语言加入可选集合，并返回其 disposer。`LocaleDefinition` 携带 id、语言自称的显示名，以及此前住在一张中心表里的 `documentLanguage`（BCP 47 标签）——每种语言只有一个归属地，因此插件自带其标签。

**存储的偏好按写入原样保留。** `LocaleRuntime` 保存读者所要求的那个 id，它可能指向尚无插件注册的语言，并在每次变化时对注册表重新求解：先是存储的偏好，然后是浏览器自身的语言，最后是 `FALLBACK_LOCALE`。插件的激活顺序并不等于 settings 的读取顺序，因此一到达就把无法识别的 id 收敛为已附带的 locale，会静默丢弃一份仍然有效的偏好。选过 `pt-BR` 的读者会在插件加载的那一刻落到它上面；插件被移除时回退到英文，偏好完好保留。

**浏览器探测同时匹配完整标签与主子标签。** 精确请求 `pt-BR` 的浏览器能够到达它；`zh-Hans-CN` 仍然落在 `zh`。

**持久化 schema 接受纯字符串。** Host 写入 `locale.preference` 时并不知道浏览器加载了哪些插件，因此已附带 id 的联合不再能充当校验器。留下的校验在浏览器一侧：`setLocale` 只会写入注册表中已有的 id，而无人注册的 id 会先行让位。

**语言行跟随 `subscribe`，而非 `locale/change`。** 字典注册被刻意排除在该事件之外；没有这一改动，插件刚加入的语言不会出现在选择器里。

**`plugins/dsh-i18n`** 是首个使用者：一个 casca，注册 `pt-BR` 与 `es`，并各自提供跨 29 个 namespace 的 709 个键。每种语言一个 effect，一并注册 locale 与其字典，也一并释放——若某语言仍可选却没有文案，选择器会声称它可用，界面却经回退链渲染出英文。

**`scripts/verify-plugin-locales.client.spec.ts`** 是完备性门禁。它位于仓库中——那里能看见 `LocaleNamespaceMap`——并把每份 bundle 双向赋值给 `{ [N in keyof LocaleNamespaceMap]: LocaleDictOf<N> }`：正向赋值在缺少 namespace 或键时失败，反向赋值则在出现已附带文案中不再存在的键时失败（bundle 是展开合并出的常量，因此 TypeScript 的多余属性检查不会对它们生效）。拼错的键会同时触发两者。**该门禁的 import 列表就是被翻译的界面范围**——namespace 只有经由那里 import 的模块才会进入该类型表，这正是让其他插件的文案仍归该插件负责的机制。

`permission.access` 此前经由未类型化的 `register(ns, locale, dict)` 重载注册，因而不在该类型表中。现在它与 `settings.permission` 并列声明，其注册改用类型化形式，`optionsOf` 的参数也由 `(key: string) => string` 收窄为 `TranslateNS<typeof ACCESS_NS>`。

**由插件硬编码单一语言的侧边栏 tab 采取改标签，而非翻译。** `dsh-docs-panel:docs` 与 `dsh-flowglass:flow` 携带的中文标题字面量从不抵达 locale 注册表，因此任何字典都无法寻址它们。侧边栏在渲染时调用 tab 的标题，于是 `dsh-i18n` 把这些描述符的标题替换为在每次绘制时读取当前 locale 的函数，并在卸载时恢复原值。该表位于 `src/tab-titles.ts`，刻意放在 `src/locales/` 之外：任何已附带的包都未声明的 namespace 会让门禁的反向断言失败。代价是这些标签成为本次工作中唯一无人校验的部分——表中缺失的 locale 会回退到插件自己的标题，因此过期条目退化为原文，而不是损坏。

## 门禁为何指名模块而非包

该门禁按源码路径 import 每个声明所在的模块。按包名 import 会经 `exports` 解析到产出的声明文件，而其中若干包只在内部使用自己的字典类型——声明文件省略了该 import，`declare module` 块从未抵达，门禁便会在该 namespace 干脆缺席的情况下通过。这种失败是静默的，而这正是完备性门禁最不该有的性质。

该 program 经由 referenced projects 抵达这些模块，因此读到的是它们**产出的**声明：某个包新增的 namespace 或键，只有在该包的类型重新构建之后才会在这里生效。这是仓库惯常的产物平面依赖，而非绕行手段。

## 备选方案考量

**在仓库内把 `pt-BR` 与 `es` 加在 `zh`／`en` 旁边。** 那样 `Record<LocaleId, LocaleDictOf<N>>` 会要求每个已附带的注册点都提供四种语言，仅凭 `tsc` 就能证明完备性，无需新门禁。之所以否决：它把语言变成核心关切——每一门翻译都成为对 29 个包的改动，没有人能独立发布一门翻译，而这个集合对下一门语言依然是封闭的。走插件路线，是用一个门禁换来这份独立性。

**让插件通过声明合并扩宽 `LocaleId`。** 这能让类型化重载对插件 locale 同样诚实。之所以否决：那份增强根本无法抵达插件——与类型表抵达不了的原因相同——而且扩宽 `LocaleId` 会在插件加载的那一刻让 29 个已附带的调用点失败，使某个插件的存在成为对它一无所知的包中的编译错误。

**让插件为类型而依赖 `@deepseek-ai/dsh-client-ui-slots`。** 这样既能有 profile 里的开关，也能有 `tsc`。之所以否决：它违背每个插件 `context-types.ts` 中记录的 casca 约定——插件结构化地镜像它所触及的服务面，从而把漂移限制在一处——并且会把插件绑定到某个 monorepo 版本，而这恰恰会让它不再能从外部安装。

**用运行时门禁遍历已附带的 `en` 字典并比对键集合。** 之所以否决：每份字典所属的 namespace 无法从字典模块中恢复——该映射存在于注册调用里，而重新编码它的门禁会成为该事实的第二个归属地，随时可能与它所检查的代码不一致。

**保留持久化 schema 的联合，改在别处校验插件 id。** 之所以否决：没有别处可选。Host 拥有 settings 文档，却无法知道浏览器的插件组合；它所对照的任何列表都只是猜测。

## 后果

一门语言可以独立发布、安装与移除，而面板的文案相对拥有它们的那些包始终被证明是完备的。代价是这份证明从编译器的常规覆盖范围，移到了一个需要人来维持诚实的文件里：**若某个包的 namespace 未被该门禁 import，那个 namespace 就既未被校验，也悄无声息地没有翻译。** 当某个 client 包新增面向用户的文案时，该 import 列表就是需要复核的地方。

持久化偏好字段失去了它的枚举。settings 文档现在可以指向一个永远不会有人注册的 locale；运行时会先行让位，因此失败表现为读者看到英文，而不是启动损坏，但该值不再自我校验。

`LocaleSnapshot.active` 与 `LocaleDefinition.id` 由 `LocaleId` 扩宽为 `string`。`LocaleId` 仍然是已附带的语言集合，也仍然为仓库内每个字典所有者所用的 `register` 重载提供类型，因此双语对齐在原有位置照旧被强制。

`dsh-better-sidebar` 与 `dsh-sidebar-qa` 注册各自的 namespace，被刻意排除在该门禁的 import 列表之外——那是另外 403 个键，保持在这两个插件各自附带的语言中。

tab 标题的覆盖会伸进另一个插件的注册表，这是本次工作原本不会有的耦合：它依赖 `dsh-better-sidebar` 暴露 `getTab`／`subscribe`，也依赖它惰性解析标题。两者都是承重的，而它们都不是该插件承诺的契约，因此上游的一次改动会让这两个标签悄无声息地退回中文。
