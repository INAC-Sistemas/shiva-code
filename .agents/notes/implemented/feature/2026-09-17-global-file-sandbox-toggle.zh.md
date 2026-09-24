# Agent Note: 全局 File sandbox 开关

Status: implemented

[English](2026-09-17-global-file-sandbox-toggle.md) | 中文

## 问题

权限预设只在会话创建时钉住沙箱模式，`/permission` 也只改写当前会话。没有进程级控件能一次关掉所有会话的文件沙箱——包括已经打开的——因此需要 Full access 的用户仍得逐个切换，想恢复默认沙箱时又得逐个改回去。

「通用」里的 Permission 行不能承担这件事：它的文案已经写明只对之后新建的会话生效；若改写每个已打开会话的 `sandbox/mode` 日志，这些会话在全局开关重新打开时就无法恢复原来的模式。

## 决策

`dsh-sandbox-policy` 拥有进程级 `enabled` 标志，默认 `true`，同时出现在插件 Config 和 `sandbox` Settings 命名空间里。`resolve()` 每次调用都读取它。`enabled` 为 `false` 时，每一项策略——包括已批准的显式模式和已打开会话的最后一条 `sandbox/mode` 事件——都解析为 `danger-full-access`。会话日志不被改写。再打开该标志后，各会话在下一次能力调用时恢复日志中的模式。

`dsh-client-ui-permission-presets` 里的「通用」File sandbox 行是产品侧控件：一个 On/Off 开关，通过共享的 Settings describe 镜像写入 `sandbox.enabled`。该行排在 Permission 之后（`order: -15`），host 未提供该命名空间时自行隐藏。它不改变审批策略；文案中的 Full access 指的是不受限的文件访问，也就是该预设的沙箱一侧。

下一次模型请求通过已有的 `sandbox:policy` 运行时上下文贡献观察到这次变化，该贡献本来就会调用 `resolve({ session })`。

## 考虑过的替代方案

**开关翻转时改写每个已打开会话的 `sandbox/mode` 事件。** 不予采用，因为它毁掉这些会话本可恢复的模式，并使 Off→On 往返变成永久的 Full access 钉住，而不是可逆覆盖。

**把该开关折进 Permission 行的 `defaultPreset`。** 不予采用，因为该值只在会话创建时生效；那一行的产品文案已经承诺运行中的会话保持开始时的预设。

**为该行新建一个客户端包。** 不予采用：该控件紧挨 Permission，共用 Settings describe 镜像，不值得再做一个插件包。

**沙箱关闭时同时强制 `approval/policy: never`。** 不予采用：该控件是文件沙箱开关。审批仍走自己的旋钮和 Permission 预设。文案中的 Full access 命名沙箱模式，而不是捆绑后的预设。

## 后果

用户可以在「通用」设置里为整个进程关闭文件沙箱（包括正在运行的会话），再打开时不会丢掉逐会话模式。无头组合可以在 cordis.yml 里设置 `enabled: false`，不必依赖 UI。代价是多一个 Settings 命名空间，以及每个强制执行消费方本来就会经过的一层 `resolve()` 优先级。

Composer 的权限芯片在开关关闭时仍显示会话日志中的预设；强制执行与运行时上下文快照才是权威。

## 测试

- 单元：组合的 `enabled: false` 在没有 settings 提供方时强制 Full access；Settings 覆盖层会关闭已打开会话的沙箱并恢复其日志中的模式；`sandbox:policy` 贡献渲染 Full access 且不改写日志。
- 客户端：「通用」行会加载、切换、在未提供的命名空间下隐藏，并包容写入失败。
- 无密钥 web e2e：设置对话框快照包含该行；拨动开关会写入 `sandbox.enabled`，并改变一个已打开会话的 `resolve()`，而其 `sandbox/mode` 事件仍为 `workspace-write`。
