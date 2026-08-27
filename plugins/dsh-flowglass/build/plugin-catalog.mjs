// ===== build/plugin-catalog.mjs：Plugins元数据唯一事实源 =====
// 动态模式（make-payloads.mjs）与编译模式（scripts/build-toolbox-bundle.mjs）共用本表。
// 新Plugins三步：plugins/<key>/tool.js + 本表加一行 + node make-payloads.mjs。
//
// 字段定义（对应 DSH_TOOLBOX_COMPILED_BUNDLES_PLAN.md §5.2）：
//   key            稳定功能 ID，也是 --features 值
//   idPrefix       dynamicCordisRunner 新Plugins前缀，3–6 items小写字母；重复时必须声明 idPrefixSharedGroup
//   order          动态重建顺序与Default Tab 顺序的元数据
//   platform       host-only / client-only / host+client
//   approval       是否包含需要批准的 Client 半
//   autoStart      动态模式Default启停；编译模式也作为Default启动策略
//   inject         Host payload 的硬依赖声明
//   hostFiles      Host 源Files列表（仓库根相对路径）
//   clientFile     可选 Client 源Files（仓库根相对路径）
//   clientRpc      需要 Host 拉取 Client 源码时的 RPC 语义名
//   sharedHost     是否拼接 shared/host.js
//   modelTools     该Plugins注册的模型工具名清单（可选）
//   note           备注（写入 plugins.json，可选）
//   bundle.selectable    能否从编译 CLI 直接选择（toolbox core 恒为 false：永远隐式加入）
//   bundle.defaultLabel  单功能Default显示名
//   bundle.aliases       编译 CLI Auto生成的布尔快捷参数名
//   bundle.dependencies  功能依赖，编译器Auto求闭包
//   bundle.conflicts     不能同时启用的功能（如互斥Theme）
//   bundle.scope         process 或 workspace；含 Client 半的功能强制 process（避免按 root 重复批准）

export const PLUGINS = Object.freeze([
  {
    key: 'toolbox', idPrefix: 'tbx', order: 1, platform: 'host+client', approval: true, autoStart: true,
    name: 'Toolbox Framework (Host registry + Client panel shell)',
    purpose: 'Toolbox framework: the Host half maintains the tool registry and provides the toolbox/tools and toolbox/panel RPC; the Client half provides the drawer + Tab bar + generic HTML panel shell (the only new-architecture plugin that needs browser approval)',
    inject: ['fs'], hostFiles: ['plugins/toolbox/host.js'], clientFile: 'plugins/toolbox/client.js',
    sharedHost: false, sharedRegistry: true, clientRpc: 'toolbox/client-impl',
    note: 'The framework must run first: it provides the toolboxRegistry service + the shared design system (tb- classes) + the drawer shell',
    bundle: { selectable: false, defaultLabel: 'Toolbox', aliases: [], dependencies: [], conflicts: [], scope: 'process' },
  },
  { key: 'jira', idPrefix: 'jira', order: 2, platform: 'host-only', approval: false, autoStart: true,
    name: 'Jira Requirement Reader & Archiver (Host-only)',
    purpose: 'Host-only: Jira query/attachment-archive/record-management action machine plus HTML panel rendering; credentials go through the credentials service and HTTP through a node child process; registered via toolbox RPC; records persist to .dsh-dynamic-toolbox/jira-watch.json',
    inject: ['fs', 'credentials', 'subprocess', 'timer'], hostFiles: ['plugins/jira/tool.js'],
    note: 'The issue body and preview image (base64, possibly MB-scale) stay in closure variables lastIssue/lastPreview instead of state—state stays lightweight, same as http/git/compare',
    bundle: { selectable: true, defaultLabel: 'Jira', aliases: ['jira'], dependencies: [], conflicts: [], scope: 'workspace' } },
  { key: 'git', idPrefix: 'git', order: 3, platform: 'host-only', approval: false, autoStart: true,
    name: 'Git History Tool (Host-only)',
    purpose: 'Host-only: git status/history/commit/diff action machine spawned via subprocess plus HTML panel rendering (list/detail/diff three views); clicking a file in the change list shows the worktree/staged diff (unstaged first, untracked via --no-index); status uses porcelain -z (Chinese paths unescaped), diff resolves via rev-parse --show-toplevel (matches even when the workspace is a subdirectory), and the workspace prefers resolving by sessionId→current session cwd; registered via toolbox RPC',
    inject: ['fs', 'subprocess', 'timer'], hostFiles: ['plugins/git/tool.js'],
    bundle: { selectable: true, defaultLabel: 'Git', aliases: ['git'], dependencies: [], conflicts: [], scope: 'workspace' } },
  { key: 'files', idPrefix: 'files', order: 4, platform: 'host-only', approval: false, autoStart: true,
    name: 'Workspace File Tools (Host-only)',
    purpose: 'Host-only: directory listing via the fs service plus an HTML-rendered folder tree (expand/collapse/refresh); the workspace prefers resolving by sessionId→current session cwd (absolute path inside the fence as fallback); registered via toolbox RPC',
    inject: ['fs', 'timer'], hostFiles: ['plugins/files/tool.js'],
    bundle: { selectable: true, defaultLabel: 'Files', aliases: ['files'], dependencies: [], conflicts: [], scope: 'workspace' } },
  { key: 'flow', idPrefix: 'flow', order: 5, platform: 'host-only', approval: false, autoStart: true,
    name: 'Live Flowglass (Host-only)',
    purpose: 'Host-only: live flowgraph of the current session—a top-down arrow spine (user/assistant/tool groups), subagent git-tree branches (├─ branches expand sub-session steps live, ╰─ merge), plain calls synced as parallel cards; the panel carries data-autorefresh=2000 and the framework silently re-pulls every 2s; makeSessionLogReader caches per session',
    inject: ['fs', 'sessionQuery', 'timer'], hostFiles: ['plugins/flow/tool.js'],
    note: 'Complements ’Trace’: trace = filtered timeline + details, flow = shape view; the live toggle pauses auto-refresh',
    bundle: { selectable: true, defaultLabel: 'Flowglass', aliases: ['flow'], dependencies: [], conflicts: [], scope: 'workspace' } },
  { key: 'flowedit', idPrefix: 'fedt', order: 5, platform: 'host-only', approval: false, autoStart: true,
    name: 'Workflow Editor (Host-only)',
    purpose: 'Host-only: Markdown-first workflow editing (modeled on dsh-deepseek-flow)—## steps / ### gate:ifElse and other logic-gate kinds (8 types in all) / - yes→target branches, with live two-way preview between the editor and the flowgraph (git tree-branch styling reuses the fl- family); files persist to .dsh-dynamic-toolbox/data/flows/<name>.md',
    inject: ['fs', 'subprocess', 'timer'], hostFiles: ['plugins/flowedit/tool.js'],
    note: 'idPrefix: flowedit is 7 letters, over the limit → fedt; an editor, not a runner (canvas dragging needs the Client half; the accepted tradeoff is Markdown↔graph two-way)',
    bundle: { selectable: true, defaultLabel: '工作流编辑', aliases: ['flowedit'], dependencies: [], conflicts: [], scope: 'workspace' } },
  { key: 'trace', idPrefix: 'trace', order: 6, platform: 'host-only', approval: false, autoStart: true,
    name: 'Session Trace Tool (Host-only)',
    purpose: 'Host-only: sessionQuery reads the current session log (cached by makeSessionLogReader); multi-select filters of skills/plugins/MCP/subagents/commands (pwsh/bash/terminal, checked by default)/built-in narrow the timeline, clicking an entry shows its full input/output; fixed header + independently scrolling timeline (column-reverse, newest at bottom)',
    inject: ['fs', 'sessionQuery', 'timer'], hostFiles: ['plugins/trace/tool.js'],
    bundle: { selectable: true, defaultLabel: '轨迹', aliases: ['trace'], dependencies: [], conflicts: [], scope: 'workspace' } },
  { key: 'http', idPrefix: 'http', order: 7, platform: 'host-only', approval: false, autoStart: true,
    name: 'HTTP API Debug Tool (Host-only)',
    purpose: 'Host-only: Postman-style API debugging—method chip + URL + Params/Headers key-value editing (enable/add/remove) + Body type (none/JSON/raw/form, automatic Content-Type) + response JSON pretty-printing + resend of history snapshots; persisted to .dsh-dynamic-toolbox/toolbox-http.json',
    inject: ['fs', 'subprocess', 'timer'], hostFiles: ['plugins/http/tool.js'],
    note: 'The response body (up to 256KB) stays in the closure instead of state—state travels on every action round-trip and must stay light (K3 rule, same construction as commitmsg)',
    bundle: { selectable: true, defaultLabel: 'HTTP', aliases: ['http'], dependencies: [], conflicts: [], scope: 'workspace' } },
  { key: 'ports', idPrefix: 'ports', order: 8, platform: 'host-only', approval: false, autoStart: true,
    name: 'Port & Process Viewer (Host-only)',
    purpose: 'Host-only: cross-platform listener-port + process-name listing (win32 netstat/tasklist, macOS lsof, Linux ss→netstat fallback, parsed in a node child process branching on process.platform); killing processes always goes through child-process process.kill(SIGKILL); filter/refresh/two-step confirm; registered via toolbox RPC',
    inject: ['fs', 'subprocess', 'timer'], hostFiles: ['plugins/ports/tool.js'],
    note: 'Line-by-line execution over pwsh stdin hits multi-line-block pitfalls; the plugin evaluator has no Buffer—always use a node child process; the PORTS_FIXTURE test hook lets smoke tests cover the three platforms’ parsing branches on any platform',
    bundle: { selectable: true, defaultLabel: '端口', aliases: ['ports'], dependencies: [], conflicts: [], scope: 'workspace' } },
  { key: 'calc', idPrefix: 'calc', order: 9, platform: 'host-only', approval: false, autoStart: true,
    name: 'Calc Bench (encode-decode/regex/cron/text diff/generator, 5-in-1)',
    purpose: 'Host-only: a single-Tab ’Calc’ merging the five pure-computation mini tools codec/regex/cron/txtdiff/gen; sub-mode chips switch between Base64/URL/JSON/timestamp encode-decode, regex match-and-replace, 5-field cron parsing, line-level LCS text diff, and UUID/random-string/hash, eliminating the jarring clutter of scattered mini tabs',
    inject: ['fs', 'subprocess', 'timer'], hostFiles: ['plugins/calc/tool.js'],
    note: 'Consolidated from the original five plugins codec/regex/cron/txtdiff/gen; each sub-mode’s state lives in its own namespace st.<sub>',
    bundle: { selectable: true, defaultLabel: '计算', aliases: ['calc'], dependencies: [], conflicts: [], scope: 'workspace' } },
  { key: 'usage', idPrefix: 'usage', order: 11, platform: 'host-only', approval: false, autoStart: true,
    name: 'Session Token Usage Analytics (Host-only)',
    purpose: 'Host-only: summary of assistant/message usage in the current session (total input/output/cache hit rate/average per step) + top-10 step bar chart + latest 20 steps in detail; cached by makeSessionLogReader',
    inject: ['fs', 'sessionQuery', 'timer'], hostFiles: ['plugins/usage/tool.js'],
    bundle: { selectable: true, defaultLabel: '用量', aliases: ['usage'], dependencies: [], conflicts: [], scope: 'workspace' } },
  { key: 'prompt', idPrefix: 'prompt', order: 12, platform: 'host-only', approval: false, autoStart: true,
    name: 'System Prompt Assembly Viewer (Host-only)',
    purpose: 'Host-only: list of sections/contexts/tools/variables assembled globally by systemPrompt.assemble, click to expand the full text; fixed header + independently scrolling list',
    inject: ['fs', 'systemPrompt', 'timer'], hostFiles: ['plugins/prompt/tool.js'],
    bundle: { selectable: true, defaultLabel: '提示词', aliases: ['prompt'], dependencies: [], conflicts: [], scope: 'workspace' } },
  { key: 'context', idPrefix: 'contx', order: 13, platform: 'host-only', approval: false, autoStart: true,
    name: 'Current Context Window Viewer (Host-only)',
    purpose: 'Host-only: current model-visible context entries via sessionQuery.readSurface plus per-entry token estimates via tokenMeter, click to expand full content; fixed header + independently scrolling list',
    inject: ['fs', 'sessionQuery', 'tokenMeter', 'timer'], hostFiles: ['plugins/context/tool.js'],
    note: 'idPrefix takes 3-6 lowercase letters: context is 7, over the limit → contx',
    bundle: { selectable: true, defaultLabel: '上下文', aliases: ['context'], dependencies: [], conflicts: [], scope: 'workspace' } },
  { key: 'aiassist', idPrefix: 'aias', order: 14, platform: 'host-only', approval: false, autoStart: true,
    name: 'AI Assistant (Q&A/translation/optimize/review/commit message/summary/compare, 7-in-1)',
    purpose: 'Host-only: a single-Tab ’AI Assistant’ merging the original seven AI tools ask/translate/promptopt/review/commitmsg/aisummary/compare; PRESETS table + generic handler with preset-chip purpose switching (including compare multi-model concurrent mode)—switching prompt/system switches the purpose; continues using the original toolbox-*.json on-disk files and ledger tool keys (history and usage continue seamlessly)',
    // llm/agentDefaultModel 走 ctx.get 可选获取（makeLlmHelper 自带 available:false 降级）——
    // 不进 inject：硬依赖会让无 LLM 部署下整个 Tab 消失，连历史都看不到（审计 L10）
    inject: ['fs', 'timer'], hostFiles: ['plugins/aiassist/tool.js'],
    note: 'Consolidated from ask/translate/promptopt/review/commitmsg/aisummary/compare; large payloads (git diff/log samples/compare results) stay in the closure instead of state; consumes real API quota',
    bundle: { selectable: true, defaultLabel: 'AI Assistant', aliases: ['aiassist'], dependencies: [], conflicts: [], scope: 'workspace' } },
  { key: 'tools', idPrefix: 'tools', order: 15, platform: 'host-only', approval: false, autoStart: true,
    name: 'Available Tools List (Host-only)',
    purpose: 'Host-only: model-visible tool list from tools.schemas (falls back to systemPrompt assembly when empty), search filtering + full parameter-schema expansion',
    inject: ['fs', 'tools', 'systemPrompt', 'timer'], hostFiles: ['plugins/tools/tool.js'],
    bundle: { selectable: true, defaultLabel: '工具清单', aliases: ['tools'], dependencies: [], conflicts: [], scope: 'workspace' } },
  { key: 'search', idPrefix: 'search', order: 16, platform: 'host-only', approval: false, autoStart: true,
    name: 'Session Full-Text Search (Host-only)',
    purpose: 'Host-only: full-text search of the current session via sessionQuery.searchEvents (snippet hit list + readEvent jumps to the original text), complementing structured traces; press Enter to search',
    inject: ['fs', 'sessionQuery', 'timer'], hostFiles: ['plugins/search/tool.js'],
    bundle: { selectable: true, defaultLabel: '搜索', aliases: ['search'], dependencies: [], conflicts: [], scope: 'workspace' } },
  { key: 'lineage', idPrefix: 'line', order: 17, platform: 'host-only', approval: false, autoStart: true,
    name: 'Session Lineage Tree (Host-only)',
    purpose: 'Host-only: ancestor chain plus subagent descendant tree via sessionQuery.traceSession (recursive indentation), live/persisted/subagent badges, and broken-chain hints',
    inject: ['fs', 'sessionQuery', 'timer'], hostFiles: ['plugins/lineage/tool.js'],
    note: 'idPrefix: lineage is 7 letters, over the limit → line',
    bundle: { selectable: true, defaultLabel: '血缘', aliases: ['lineage'], dependencies: [], conflicts: [], scope: 'workspace' } },
  { key: 'aiusage', idPrefix: 'aius', order: 24, platform: 'host-only', approval: false, autoStart: true,
    name: 'AI Side-Channel Call Ledger (Host-only)',
    purpose: 'Host-only: reads .dsh-dynamic-toolbox/toolbox-ai-usage.json (side-channel ledger of AI tool calls, cap 100)—grand totals/today stats + per-tool aggregated bar chart + latest 20 records + two-step-confirm clear; complements ’Usage’ (which is session-log based)',
    inject: ['fs', 'subprocess', 'timer'], hostFiles: ['plugins/aiusage/tool.js'],
    bundle: { selectable: true, defaultLabel: 'AI 台账', aliases: ['aiusage'], dependencies: [], conflicts: [], scope: 'workspace' } },
  { key: 'quota', idPrefix: 'quota', order: 25, platform: 'host-only', approval: false, autoStart: true,
    name: 'API Quota Query (Host-only)',
    purpose: 'Host-only: checks the Kimi for Coding (k3) plan balance (weekly main quota + 5h sliding window + concurrency) via GET /coding/v1/usages; the key resolves along the environment-variable→~/.dsh/.credentials.yaml credential chain; https runs in a Node child process (sandboxed curl over schannel is refused, while Node connects directly through the TUN); rendered with redaction, the key never leaves the child process',
    inject: ['subprocess', 'timer'], hostFiles: ['plugins/quota/tool.js'],
    bundle: { selectable: true, defaultLabel: '配额', aliases: ['quota'], dependencies: [], conflicts: [], scope: 'workspace' } },
  { key: 'selfview', idPrefix: 'selv', order: 29, platform: 'host+client', approval: true, autoStart: true,
    name: 'UI Self-Inspection (screenshot/snapshot/UI operations)',
    purpose: 'Host+Client: view and operate the current WebGUI—getDisplayMedia screenshots (one reusable authorization flow; the panel injects a real button bar at [data-selfview-mount] so authorization/copy get user activation), semantic DOM snapshots ([eN] ref→element mapping), DOM operations (click/fill through native setters bypassing React value tracking, scroll, key press), screenshot composed into a ClipboardEvent pasted into the chat attachment area; the Host half registers model tools ui_snapshot/ui_capture/ui_click/ui_fill/ui_scroll/ui_press (JPEGs batch-written via subprocess stdin to .dsh-dynamic-toolbox/toolbox-selfview/, then viewed by the model with read_image), while the Client half long-polls selfview/pull for commands (25s heartbeat)',
    inject: ['fs', 'subprocess', 'timer'], hostFiles: ['plugins/selfview/tool.js'], clientFile: 'plugins/selfview/client.js', clientRpc: 'selfview/client-impl',
    modelTools: ['ui_snapshot', 'ui_capture', 'ui_click', 'ui_fill', 'ui_scroll', 'ui_press'],
    note: 'Entails one-time approval for the Client half; during rebuild, autoStart entries launch run automatically (non-blocking) → one click on the pop-up approval card starts them; authorization never crosses processes; modelTools lists the model tool names registered by this plugin (trace tools classify as ’plugin’ based on it—dynamic markers cannot be found inside the sandbox, so this list is the source of truth)',
    bundle: { selectable: true, defaultLabel: '界面自查', aliases: ['selfview'], dependencies: [], conflicts: [], scope: 'process' } },
])
