# Agent Note：把登录会话记为凭据记录（dsh-login / dsh-vps-status）

Status: implemented

[English](2026-08-31-login-session-as-a-credential-record.md) | 中文

## 问题

两个树外插件用两套互不相干的方式向同一台 VPS 认证。`dsh-login` 取得按用户的令牌并把它留在浏览器里（`localStorage`，以 `ctx.loginSession` 发布）；它的宿主端刻意不保存任何会话状态。`dsh-vps-status`——模型调用的纯宿主端工具——发送从 `.env` 读到的静态机器凭据 `Bearer $VPS_TOKEN`。宿主端插件没有任何途径以登录用户的身份行事，因此每一次由模型发起的 VPS 请求都无从体现是谁提出的；而那个共享令牌就放在 `process.env` 里，进程内任何代码都能读到，派生出的任何命令都会继承它。

浏览器侧还有第二个缺口：没有任何机制能发现令牌已经失效。`sessionTtlMs` 默认为 `0`，所以 store 的过期定时器从不装设，而令牌真正的有效期是登录服务自己的事。令牌已被吊销的用户看上去仍然处于登录状态，直到某次调用碰巧失败为止。

## 决定

**凭据 seam 就是那个 seam。** 不新增 `ctx.vpsAuth` 服务：`ctx.credentials` 已经具备 Service Definition、Provider 与 Consumer，而 CLAUDE.md 拆分 seam 的规则（"角色各自独立演化时才拆"）在此并不成立——不存在一个不等同于凭据 Provider 的"VPS 令牌"Provider 角色。由此还省去了新服务本会需要的大部分机制：该 seam 自身的规则是消费者按操作重新解析、从不跨操作缓存，所以宿主端没有 `credentials/record-updated` 监听、没有缓存、也没有 `subscribe`。消费者共享的是一个库，而不是一个服务。

**宿主端的副本是位于 `dsh-login/session` 的 `GrantRecord`。** authenticate 处理器在令牌返回浏览器的途中本就看得到它，于是就地写入记录——不存在也不需要浏览器到宿主的桥接路由。键的 scope 之所以是 `dsh-login`，是因为该 seam 以记录**所有者**的注册插件名寻址；本插件是唯一的写入方，所以持有键、载荷、过期规则与 `Bearer` 构造的模块就放在 `dsh-login` 内部，并以 `dsh-login/vps-auth` 子路径导出。宿主端消费者把 `dsh-login` 声明为 peer 依赖后直接导入——`plugins/` 中"用结构类型、不跨插件导入"的先例，只因**浏览器**打包的纯净性闸门禁止平台值导入而存在，并不适用于宿主端。

**该记录不是浏览器会话的镜像。** 它是同一次授权在宿主端自有的副本，由产生它的那个处理器写入，并被同一次登出撤除。把这一点讲明，"漂移"问题的大部分就从需要协调的状态，变成需要记录在案的性质。

**回到登录页就是结束会话。** `LoginGate` 通过 `useSyncExternalStore` 依 store 渲染，会话存在时返回 `null`，因此不需要任何路由或跳转。新增了两个触发点：`ctx.loginSession.authorizedFetch`，它拥有 `authorization` 头并在 `401`/`403` 时登出；以及在启动时和标签页重获焦点时，经新增的 `GET /login/api/validate` 路由对 `config.validateEndpoint` 做的重新校验。

**`ValidateResult` 是可辨识联合，不是布尔值**——`{ ok: true } | { ok: false, reason: 'rejected' | 'unreachable' }`。只有 `rejected` 会结束会话。把两者合一，会把登录服务的一次故障变成大规模登出；这与现有登出顺序早已防范的失败恰成镜像：一个连不上的服务，既不该把用户困在应用里，也不该把用户赶出去。

**宿主端记不下来的登录，就让登录失败**（`grant-storage`，HTTP 500）。另一种做法——浏览器已登录、宿主端却没有副本——正是那种沉默的半状态：应用报告成功，随后每一次宿主端请求都失败。

## 后果

- `$VPS_TOKEN` 已从 `.env`、`dsh-vps-status` 的 patch 及其 README 中移除。`config.headers` 保留给网关密钥和租户 id，但 `authorization` 行现在**在加载时被拒绝**：该头只有一个来源，残留的静态令牌会悄悄遮蔽已登录的用户。
- `dsh-vps-status` 新增了对 `dsh-login` 的硬性 peer 依赖；只挂载工具而不挂载登录页的 profile，会得到一个永远无法认证的工具。这去掉了它自己的多主机示例所宣传的"用各自的静态令牌指向任意主机"的能力。若将来确实需要，恢复路径是一个 `auth: 'session' | 'headers'` 配置字段——本次刻意不做。
- 两个插件都不硬注入 `credentials`：都按操作解析 `ctx.get('credentials')` 并给出有据可查的拒绝，既符合该 seam 的可选性，也与 `llm-pi-ai` 的写法一致。服务是否存在在 `apply` 时无法判定（挂载顺序），所以 `dsh-login` 在那里只记一条告警，并在登录尝试这个最早可判定的时点做决定。
- **用户的 bearer 现在落在磁盘上**（`$DSH_HOME/.credentials.yaml`，权限 `0600`，跨进程加锁），关闭浏览器和重启机器都不会消失。正是它让宿主端工具能跨越 harness 重启继续工作，也让 headless 运行在一次登录之后能以登录用户的身份行事。这同时是一次实实在在的暴露面变化，是有意选择的；`sessionTtlMs` 保持默认的 `0`，因此记录自身不带有效期，只会被登出或一次否定的重新校验撤除——而这两者都源自浏览器。把 `sessionTtlMs` 设为有限值，是让两份副本都能无人值守地自行退役的那一行改动。
- 与之相抵的一点：凭据存储**从不被具化到进程环境中**，也没有模型可见的工具读取记录载荷。从 `process.env` 移走，对派生命令和进程内读取者而言是净减少的暴露。
- **一条记录、一个身份、一个 `$DSH_HOME`。** 共用同一个 harness home 的两个人，或与 Web UI 并存的 `dsh --profile headless` 运行，都会以最后登录的那个人的身份行事。这与 harness 既有的单用户假设（settings、sessions、identity）一致，但比"完成登录的那个标签页"要宽——而且旧的 `$VPS_TOKEN` 影响范围与此相同，却*看起来*像机器凭据；新的这个看起来像用户凭据，作用域却并非按用户划分。
- 登出采用**先比对再删除**：同源围栏是跨站防护而非认证（`Sec-Fetch-Site` 与 `Origin` 都没有的调用方能通过），所以无条件删除会让任何本地进程都能结束宿主端的会话。该 seam 没有比对删除原语——`modifyRecord` 返回 `undefined` 意为*保持不动*，而非*删除*——因此在读取与删除之间落地的一次登录会丢掉它刚写入的记录。这是自愈的：浏览器仍持有令牌，下一次请求会重新发布。
- `modifyRecord` 不接受 signal，而 `DOCUMENT_LOCK_WAIT_MS` 是 30 秒，所以当 `.credentials.yaml` 的另一个写入方（`llm-pi-ai` 的 OAuth 刷新）持有文档锁时，`/login/api/authenticate` 最长会阻塞这么久。予以接受；再加一层期限只会让写入半途被放弃。
- **未使用** `isUnloading`：此处没有任何在拆卸时重新注册的回调（路由都是普通的 `ctx.effect` 注册），而在拆卸期间把进行中的 HTTP 响应写完是正确的。
- `revalidateIntervalMs` 在**宿主端**执行，因为客户端打包收不到插件配置。该备忘只缓存"通过"这一结果、且只针对一个令牌，所以在登录服务侧已被吊销的令牌，会一直通过重新校验直到窗口耗尽。这正是限流所换来的代价；窗口界定了一个答案最多能陈旧多久。
- 宿主端工具收到的 `401` **不会**删除记录，也不会结束浏览器的会话。否则上游的一次瞬时故障就会抹掉一个好端端的会话；让它退役的是浏览器自己的重新校验。

## 考虑过的替代方案

- **由独立的 `dsh-vps-auth` seam 插件持有 `ctx.vpsAuth`**——依该 seam 自身的寻址规则否决。`CredentialKey` 的 scope 必须是**写入**该记录的插件的注册名，而 `dsh-login` 是唯一的写入方；由另一个包持有该键，会把记录归档到一个其具名所有者从不写入的 scope 之下。它同时也是在凭据 seam 已建模的事实之上再叠一个 seam。
- **仅存于内存的宿主端持有者，由浏览器到宿主的发布路由重新填充**——两重否决：它重新引入了本设计要避开的桥接；并且会把*设置*宿主端令牌的能力，交给任何同源调用方（围栏放行不带相关头的本地进程）。它还会丢掉持久化记录白送的 harness 重启与 headless 两种情形。
- **在 `dsh-login` 上加 `persistSession: false` 之类的仅内存开关**——否决：持久化是凭据 **Provider** 的职责，在消费者内部再开一条存储路径会重复 Provider 角色。若将来确有需要，正确形态是一个 `@deepseek-ai/dsh-credentials-memory` Provider，挂载时取代 `-local`（`packages/credentials/credentials/tests/memory.ts` 已经是一份可直接提升的完整实现）——那是 `packages/` 下的另一次改动。
- **用有限的 `sessionTtlMs` 做本地过期，以及把宿主端的 `401` 传播到浏览器**——两者都经过考虑，并按用户的决定不予采用。前者已在上文记为一行的后续改动；后者需要一条目前并不存在的宿主到浏览器通道。
- **记录写入失败时只记日志、照样让浏览器登录**——否决：它恰好造出凭据设计笔记警告过的那种半状态，登录报告成功，而此后每一次宿主端请求都失败。
