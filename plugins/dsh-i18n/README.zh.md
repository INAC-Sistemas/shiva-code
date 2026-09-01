# dsh-i18n

[English](README.md) | 中文

为 DSH web 面板提供巴西葡萄牙语与西班牙语。启用该插件后，设置中的**语言**行会在已附带的中文与 English 旁多出两项。

```
Settings › General › Language
  ┌──────────────────────┐
  │ 中文                  │
  │ English              │
  │ Português (Brasil) ← │  dsh-i18n
  │ Español            ← │  dsh-i18n
  └──────────────────────┘
```

## 如何挂载

已附带的 locale 服务（`@deepseek-ai/dsh-client-locale`）拥有偏好、选择器以及 ns×locale 字典注册表。本插件只向它贡献内容：`registerLocale` 把语言加入可选集合，每个 namespace 一次 `register(namespace, locale, dictionary)` 调用提供其文案。已附带的内容不会被替换——移除插件后，面板与此前完全一致，只是少了这两项。

每种语言是一个 effect：注册 locale 与其字典，也一并释放。若某语言仍可选却没有文案，选择器会声称它可用，界面却经回退链渲染出已附带的英文。

host 半边不注册任何东西。它存在的原因是：profile 按包名挂载插件，而 web shell 只为已启用的 loader 条目提供 `dsh.client` 包。

## 切换会做什么，不会做什么

启用该插件**不会改变任何人的当前语言**。服务会按以下顺序对已注册内容重新求解当前 locale：存储的偏好、浏览器自身的语言、然后是英文。因此：

- 已在另一台机器上选过 `pt-BR` 的读者，会在插件加载的那一刻落到该语言上——该偏好跨越了这门语言尚未安装的那段空档；
- 没有显式偏好、但浏览器请求 `pt-BR` 或 `es` 的读者会随之切换；
- 其他人保持原样。

停用该插件会移除这些语言，正在使用其中之一的读者回退到英文，其存储的偏好完好保留，等待下次安装。

`pt-BR` 保留地区标识，因为文案是巴西葡萄牙语；对请求欧洲葡萄牙语的浏览器而言，已附带的英文好过方言不符的文本。西班牙语不带地区标识——其文案避开了区分各地区变体的词汇。

## 覆盖范围

DSH 客户端自身附带的面板：会话对话、workspace 导航、设置，以及跟随 agent 活动的各个界面——共 29 个 namespace。

其他插件拥有各自的文案。`dsh-better-sidebar` 与 `dsh-sidebar-qa` 注册自己的 namespace，**不在**此处翻译；插件的文本是该插件的责任，从外部翻译它会在它新增字符串的那一刻失效。

## 完备性

DSH 仓库中的 `scripts/verify-plugin-locales.client.spec.ts` 会把两份 bundle 对照 `LocaleNamespaceMap` 断言——已附带的各个包正是把自己的 namespace 合并进该类型。缺少 namespace、缺少键，以及已附带文案中已不存在的键，都会成为指名道姓的编译错误。

该检查放在那里而不是这里，是因为插件在 monorepo 的 cordis 实例之外解析：那些 `declare module` 增强无法抵达它，因此它自己的 `tsc` 没有可比对的对象。该文件顶部的 import 列表定义了被翻译的界面范围。

当某个已附带的包新增一条字符串时，该门禁会一直失败，直到两种语言都补上它。

## 其他插件拥有的 tab

有两个侧边栏 tab 的标题由其插件以中文硬编码，且从不经过 locale 注册表：`dsh-docs-panel:docs` 与 `dsh-flowglass:flow`。任何字典都无法触及它们——没有可供覆盖的键。

侧边栏在**渲染时调用** tab 的标题，这留下了唯一一处诚实的接缝。本插件把这些描述符的标题替换为一个在每次绘制时读取当前 locale 的函数，因此切换语言无需重新注册即可生效，卸载时又会把插件自己的标题放回去。[src/tab-titles.ts](src/tab-titles.ts) 中没有列出的 locale 会回退到 tab 自带的标题，中文读者因此保留原有措辞。

这是对第三方文案的覆盖，**完备性门禁并不覆盖它**：当其中某个插件重命名自己的 tab 或开始自行翻译时，不会有任何检查失败。回退机制正是让过期条目不至于破坏标题的东西——它会显示插件自己的标题。

`dsh-flowglass` 没有发布拉丁字母名称，因此用其包名作为品牌名，而不是为「流镜」臆造一个译名。

## 安装

```sh
pnpm --filter dsh-i18n build
dsh plugin --profile web add link:/absolute/path/to/plugins/dsh-i18n
```

`dsh plugin add` 会把 `dsh-i18n` 追加到该 profile 的 `dsh.profile.bundles`；启动时再合并 [cordis.patch.yml](cordis.patch.yml)，插入 `i18n` 条目。任何源码改动后都要重新构建（`pnpm --filter dsh-i18n build`）——即便以源码方式启动，web shell 始终提供构建产物 `lib/client.js`。

移除：`dsh plugin --profile web remove dsh-i18n`。

## 开发

```sh
pnpm --filter dsh-i18n typecheck
pnpm --filter dsh-i18n test         # registration and disposal
pnpm --filter dsh-i18n watch        # rebuild the bundles on change
```

字典位于 [src/locales/](src/locales/)，按界面拆分——`core`、`settings`、`agent`、`workspace`、`conversation`——每种语言一套。该拆分只关乎呈现；服务看到的是每种语言一张扁平的 namespace 表。

MIT。
