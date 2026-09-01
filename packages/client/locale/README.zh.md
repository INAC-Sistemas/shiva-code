# @deepseek-ai/dsh-client-locale

[English](README.md) | 中文

locale 插件：LocaleRuntime——`locale.preference` 选择项存储在 `$DSH_HOME/settings.yaml` 中；若没有显式 Host 值，全新浏览器会使用 `navigator` 请求的语言（标签与某个 locale 完全相等、或其 id 为该标签的主子标签时即视为匹配；若其请求的语言都未注册，则使用 `en`）。Host 读取在插件激活后执行，因此 settings 服务不可用不会阻塞页面；读取结果会实时替换浏览器推导出的值。settings API 仅限回环请求，因此远程浏览器的选择仅保留在进程内。`locale/change` 仅在切换语言时触发；插件会在激活时以及每次快照变化时把 `<html lang>` 指向当前 locale 自带的 `documentLanguage` 标签。该服务还拥有 ns×locale 字典注册表（类型化 `register(ns, {zh, en})` 按 `LocaleNamespaceMap` 校验，`bind(ns)`→`TranslateNS<ns>`；查找链 ns → common → en → key），实现 slot 系统的 `LocaleFace`，并经 `ctx.slots.installLocale` 自行安装，支撑框架注入的 `t` 标准席位（`Translate`／`TranslateNS` 是 ui-slots 的类型；请从那里导入——本包的再导出仅为字典所有者提供便利）。该持久化边界由[Host settings 支撑的偏好决策](../../../.agents/notes/implemented/bug-fix/2026-08-06-host-backed-web-preferences.zh.md)拥有。

`zh` 与 `en` 是本包所附带的语言，而非读者可选的全集：`registerLocale(definition)` 在运行时新增语言，未类型化的 `register(ns, locale, dict)` 重载提供其文案——这正是翻译插件所用的接缝（[该决策](../../../.agents/notes/implemented/feature/2026-09-01-plugin-supplied-browser-locales.zh.md)，以及首个使用者 [dsh-i18n](../../../plugins/dsh-i18n/README.zh.md)）。存储的偏好按写入原样保留，并在每次变化时对注册表重新求解，因此某个尚未激活其插件的 id 会先行让位，而不会退化为已附带的 locale，并在该插件注册的那一刻立即生效。

## 模型体验

无。locale 注册表为浏览器 UI 文案提供服务；这里没有任何内容进入模型请求。

#### KV Cache 影响

无；该包既不组装也不发送提供方请求。

## 已知限制与暂缓事项

- **部分界面仍保留内联文案**——设置行、侧边栏、问题作答器和模型选择使用 locale seat；其他包仍直接拥有静态文本。
- **注册表持有的文本只读取一次翻译**——在 slot 渲染路径之外于注册时捕获的文案（例如 command 注册表中的 `/model` 命令描述）在重新注册前保持注册时的语言；slot 渲染的文案随切换实时更新。
- **持久化偏好不再自我校验**——该字段接受任意字符串，因为 Host 写入时并不知道浏览器加载了哪些 locale 插件。若文档中的 locale 无人注册，读者会停留在浏览器推导出的语言，因此这是静默失败而非显式报错。
- **插件的字典不由本包校验**——`registerLocale` 与未类型化的 `register` 重载接受任意键。对 `LocaleNamespaceMap` 的完备性由 `scripts/verify-plugin-locales.client.spec.ts` 证明，其 import 列表决定了一份翻译必须覆盖哪些 namespace。
