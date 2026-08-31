window.__ModuleLoader__.load({
	id: "dsh-sidebar-qa",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_dom_client = require("react-dom/client");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/answer.ts
		/** Extract the text blocks of an assistant/message event (reasoning excluded). */
		function textOfAssistantMessage(event) {
			if (event.type !== "assistant/message") return "";
			const content = event.data.message?.content;
			if (!Array.isArray(content)) return "";
			const parts = [];
			for (const block of content) {
				if (block === null || typeof block !== "object") continue;
				const record = block;
				if (record.type === "text" && typeof record.text === "string") parts.push(record.text);
			}
			return parts.join("\n");
		}
		/** Extract the text blocks of a user/message event. */
		function textOfUserMessage(event) {
			if (event.type !== "user/message") return "";
			const data = event.data;
			const kind = data.source?.kind;
			if (kind !== void 0 && kind !== "user") return "";
			const content = data.content;
			if (!Array.isArray(content)) return "";
			const parts = [];
			for (const block of content) {
				if (block === null || typeof block !== "object") continue;
				const record = block;
				if (record.type === "text" && typeof record.text === "string") parts.push(record.text);
			}
			return parts.join("\n");
		}
		/** Whether one event is a text-delta chunk (in-flight answer token). */
		function chunkText(event) {
			if (event.type !== "assistant/chunk") return "";
			const data = event.data;
			if (data.chunk?.type === "text-delta" && typeof data.chunk.text === "string") return data.chunk.text;
			return "";
		}
		/**
		* Locate the LAST `session/end-seed` event in a history page. A fork child's
		* log is `[seed…, session/end-seed, live…]`; the end-seed marks where the
		* inherited parent history ends and the child's own messages begin. Nested
		* forks can carry several markers, so the LAST one is the child's own
		* boundary (mirror of the core session contract's rule for stored history).
		* @returns the index of the last marker, or -1 when the page has none.
		*/
		function lastEndSeedIndex(events) {
			let index = -1;
			for (let i = 0; i < events.length; i++) if (events[i]?.event.type === "session/end-seed") index = i;
			return index;
		}
		/**
		* Fold one history page into an ordered message transcript. Chunks belonging
		* to the in-flight answer (seq past the last settled assistant message) are
		* appended as a trailing assistant message marked with `streaming`.
		*/
		function transcriptOf(events) {
			const messages = [];
			let lastAssistantSeq = -1;
			for (const entry of events) {
				const event = entry.event;
				if (event.type === "user/message") {
					const text = textOfUserMessage(event);
					if (text !== "") messages.push({
						role: "user",
						text
					});
				} else if (event.type === "assistant/message") {
					const text = textOfAssistantMessage(event);
					lastAssistantSeq = event.seq;
					if (text !== "") messages.push({
						role: "assistant",
						text
					});
				}
			}
			let inFlight = "";
			for (const entry of events) {
				const event = entry.event;
				if (event.type === "assistant/chunk" && event.seq > lastAssistantSeq) inFlight += chunkText(event);
			}
			if (inFlight !== "") messages.push({
				role: "assistant",
				text: inFlight
			});
			return messages;
		}
		/**
		* Like {@link transcriptOf}, but each row also carries the seq of its last
		* event: settled messages use their event seq, the in-flight chunk aggregate
		* uses the last chunk's seq. The panel uses the seq to split inherited
		* (fork-seed) rows from the child's own rows and to anchor the initial view.
		*/
		function transcriptRowsOf(events) {
			const rows = [];
			let lastAssistantSeq = -1;
			for (const entry of events) {
				const event = entry.event;
				if (event.type === "user/message") {
					const text = textOfUserMessage(event);
					if (text !== "") rows.push({
						role: "user",
						text,
						seq: event.seq
					});
				} else if (event.type === "assistant/message") {
					const text = textOfAssistantMessage(event);
					lastAssistantSeq = event.seq;
					if (text !== "") rows.push({
						role: "assistant",
						text,
						seq: event.seq
					});
				}
			}
			let inFlight = "";
			let inFlightSeq = -1;
			for (const entry of events) {
				const event = entry.event;
				if (event.type === "assistant/chunk" && event.seq > lastAssistantSeq) {
					inFlight += chunkText(event);
					inFlightSeq = event.seq;
				}
			}
			if (inFlight !== "") rows.push({
				role: "assistant",
				text: inFlight,
				seq: inFlightSeq
			});
			return rows;
		}
		/** Whether the history feed contains a finished answering turn. */
		function hasTurnEnded(events) {
			return events.some((entry) => entry.event.type === "turn/end");
		}
		//#endregion
		//#region src/prompt-locale.ts
		/**
		* Every question marker this plugin has EVER emitted.
		*
		* APPEND-ONLY: never reorder, never remove. These messages are persisted in the
		* DSH session log and re-parsed on every panel render, so a marker dropped here
		* would make historical follow-ups display a bare `问题：` prefix forever.
		* `tests/prompt-locale.spec.ts` pins that every bundle's `questionLabel` is a
		* member of this list, so a new language cannot be added without teaching the
		* parser about it.
		*/
		const QUESTION_LABELS = ["问题：", "Question: "];
		/** The model-facing text, per language. */
		const PROMPTS = {
			zh: {
				backgroundSystem: [
					"你是对话上下文压缩助手。下面是主对话【较早部分】的原文，按时间从新到旧排列（第一条是最新状态，每条以「用户：」或「助手：」开头）。",
					"请用最多 3 句话概括，依次是：会话目标（在做什么）、当前进度（最新状态/最近完成了什么）、未决事项（没有就省略这一句）。",
					"要求：极简、只陈述事实、禁止列清单、禁止复述指令、禁止编造；早期指令若已被后续执行，视为已完成，不要当作未决事项。"
				].join("\n"),
				roleUser: "用户：",
				roleAssistant: "助手：",
				sectionBackground: "【背景】",
				sectionRecent: "【近期对话】",
				titleSystem: [
					"你是会话标题生成助手：根据下面的「问题 + 回答」提炼一个极简标题。",
					"严格只输出标题本身，遵守：",
					"1. 纯文本单行，禁止引号、Markdown、XML、解释、前后缀、换行或终端控制码；",
					"2. 使用问题与回答的语言；",
					"3. 不超过 15 个汉字（非中文语言约 6 个词以内）；",
					"4. 直接给主题短语，不要开场白、自我陈述或任务复述。"
				].join("\n"),
				titleQuestionLabel: "问题：",
				titleAnswerLabel: "回答：",
				followUpIntro: [
					"这是一次「侧边栏追问」：用户对主对话里划选的一段文本提问。",
					"请识别用户意图，只围绕这段划选文本的主题直接、简明地回答（必要时先做概念澄清），不要复述上下文、也不要过度联系主对话的整体主题。",
					"输出要求：第一句就进入回答正文，禁止任何开场白、自我陈述或任务复述（如\"我来回答…\"\"这个问题是关于…\"\"直接介绍即可\"之类的话一律不写）。",
					"用与「用户的问题」相同的语言作答；问题的语言不明确时，跟随划选文本的语言。",
					"下面依次是参考上下文：",
					"1. 主对话整体主题",
					"2. 主对话最近几轮对话",
					"3. 用户划选的文本（见 <quoted_context> 块）",
					"4. 用户的问题"
				].join("\n"),
				contextHeading: "【主对话上下文】",
				questionLabel: "问题：",
				quoteLabelUser: "用户消息",
				quoteLabelAgent: "Agent 回复",
				fallbackTopic: "追问"
			},
			en: {
				backgroundSystem: [
					"You compress conversation context. Below is the verbatim EARLIER part of a main conversation, ordered newest first (the first entry is the latest state; each entry starts with \"User:\" or \"Assistant:\").",
					"Summarize it in at most 3 sentences, in this order: the goal of the session (what is being done), the current progress (latest state / what was just finished), and open items (omit this sentence if there are none).",
					"Requirements: be minimal, state facts only, no bullet lists, no restating instructions, no invention; an early instruction that later work already carried out counts as done and must not be reported as an open item."
				].join("\n"),
				roleUser: "User: ",
				roleAssistant: "Assistant: ",
				sectionBackground: "[Background]",
				sectionRecent: "[Recent]",
				titleSystem: [
					"You generate session titles: distill one minimal title from the \"question + answer\" below.",
					"Output the title and nothing else, obeying:",
					"1. plain text, single line — no quotes, Markdown, XML, explanation, prefix, suffix, newline or terminal control codes;",
					"2. use the language of the question and the answer;",
					"3. at most 6 words (about 15 characters for CJK);",
					"4. give the topic phrase directly — no preamble, self-description or task restatement."
				].join("\n"),
				titleQuestionLabel: "Question: ",
				titleAnswerLabel: "Answer: ",
				followUpIntro: [
					"This is a \"sidebar follow-up\": the user is asking about a passage they selected in the main conversation.",
					"Identify their intent and answer the topic of that selected passage directly and concisely (clarify the concept first when that is needed). Do not restate the context, and do not over-connect the answer to the main conversation's overall theme.",
					"Output: begin with the answer itself in the first sentence. No opening remarks, self-description or task restatement (never write things like \"Let me answer…\", \"This question is about…\", \"Here is an introduction\").",
					"Answer in the same language as the user's question; if that language is ambiguous, follow the language of the quoted text.",
					"The reference context follows, in order:",
					"1. the overall topic of the main conversation",
					"2. the most recent turns of the main conversation",
					"3. the passage the user selected (see the <quoted_context> block)",
					"4. the user's question"
				].join("\n"),
				contextHeading: "[Main conversation context]",
				questionLabel: "Question: ",
				quoteLabelUser: "user message",
				quoteLabelAgent: "agent reply",
				fallbackTopic: "Follow-up"
			}
		};
		/**
		* One language's model-facing text.
		* @param locale - the resolved prompt locale (defaults to the pre-i18n zh).
		*/
		function promptsOf(locale = "zh") {
			return PROMPTS[locale];
		}
		//#endregion
		//#region src/client/injection.ts
		/**
		* Context-injection formatting for the side session's first message: the
		* context block, the `<quoted_context>` XML block (own parser contract,
		* XML-escaped and sanitized), and the question. Kept pure and dependency-free
		* (its one import, `prompt-locale.ts`, is itself dependency-free) for unit
		* testing.
		*
		* The model-facing wording lives in `../prompt-locale.ts`; every builder takes
		* the locale as a trailing parameter defaulting to `'zh'`, so a caller that
		* predates i18n produces byte-identical output.
		*/
		/** Maximum quoted-text length admitted into the XML block. */
		const QUOTE_MAX_LEN = 2e3;
		/** Escape the five XML special characters in a text node or attribute. */
		function escapeXml(input) {
			return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
		}
		/** Reverse of {@link escapeXml} (display the quoted body back unescaped). */
		function unescapeXml(input) {
			return input.replace(/&apos;/g, "'").replace(/&quot;/g, "\"").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
		}
		/** Strip control characters and NUL that would corrupt the XML/text block. */
		function sanitizeText(input) {
			return input.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
		}
		/** Bound a string to `max` characters with an ellipsis (Unicode-safe slice). */
		function boundText(input, max) {
			const text = sanitizeText(input);
			if (text.length <= max) return text;
			return `${text.slice(0, max)}…`;
		}
		/** One quoted_context attribute line (escaped value or omitted). */
		function attr(name, value) {
			return value === void 0 || value === "" ? "" : ` ${name}="${escapeXml(value)}"`;
		}
		/**
		* Build the `<quoted_context>` XML block for one captured selection.
		* Selection offsets are only meaningful when the message id is known; they are
		* omitted otherwise.
		*/
		function buildQuotedContext(quote, label) {
			const body = escapeXml(boundText(quote.text, QUOTE_MAX_LEN));
			const messageId = quote.messageId ?? "";
			const role = quote.role ?? "assistant";
			const turn = quote.turn ?? "";
			const hasOffsets = quote.selectionStart !== void 0 && quote.selectionEnd !== void 0 && quote.messageId !== void 0;
			const start = hasOffsets ? String(quote.selectionStart) : void 0;
			const end = hasOffsets ? String(quote.selectionEnd) : void 0;
			return `<quoted_context${[
				attr("source", "agent-history"),
				attr("label", label),
				attr("message_id", messageId),
				attr("role", role),
				attr("turn", turn),
				attr("selection_start", start),
				attr("selection_end", end)
			].join("")}>\n${body}\n</quoted_context>`;
		}
		/**
		* The governing instruction prepended to the side session's first message.
		* It sits at the very start of the input so the model reads it under the
		* highest attention weight, before the (heavier) context blocks: it sets the
		* frame that this is a sidebar follow-up anchored on a SELECTED snippet, that
		* the answer must stay on the snippet's topic instead of over-indexing on the
		* main conversation's theme, and that the ANSWER LANGUAGE follows the user's
		* question (not the UI language).
		* @param locale - which language the instruction itself is written in.
		*/
		function followUpIntro(locale = "zh") {
			return promptsOf(locale).followUpIntro;
		}
		followUpIntro("zh");
		/**
		* Build the side session's first user message: the governing intro, optional
		* summary block, quoted context block, then the question. Later follow-up
		* messages pass `summary` as null (only the first message carries the
		* compressed main context).
		*/
		function buildFirstMessage(summary, quote, question, label, locale = "zh") {
			const prompts = promptsOf(locale);
			const parts = [prompts.followUpIntro];
			if (summary !== null && summary !== "") parts.push(`${prompts.contextHeading}\n${boundText(summary, 12e3)}`);
			parts.push(buildQuotedContext(quote, label));
			parts.push(`${prompts.questionLabel}${sanitizeText(question)}`);
			return parts.join("\n\n");
		}
		/**
		* Derive the `❓<主题>` subject: the first non-blank line of the quote,
		* whitespace-collapsed, bounded to a script-aware budget; falls back to
		* `fallback` (the caller passes the locale's placeholder topic).
		*/
		function topicFromQuote(text, fallback = "追问") {
			const firstLine = sanitizeText(text).split(/\r?\n/).map((line) => line.trim()).find((line) => line !== "");
			if (firstLine === void 0 || firstLine === "") return fallback;
			return boundText(firstLine, /[\u3040-\u30ff\u4e00-\u9fff]/.test(firstLine) ? 12 : 24);
		}
		/**
		* Build the full side-session title from a subject. The emoji alone marks a
		* follow-up session, so the title carries no translatable word (and no locale
		* switch can ever leave a session list with mixed-language prefixes).
		*/
		function followUpTitle(subject) {
			return `❓${subject}`;
		}
		/**
		* Strip a leading question label, else return the trimmed text as-is.
		*
		* Tries EVERY marker the plugin has ever emitted ({@link QUESTION_LABELS}):
		* these messages live in the DSH session log forever, so a message written
		* under zh must still parse after the user switches to en.
		*/
		function stripQuestionLabel(text) {
			const trimmed = text.trim();
			for (const label of QUESTION_LABELS) if (trimmed.startsWith(label)) return trimmed.slice(label.length).trim();
			return trimmed;
		}
		/**
		* Parse a user message into its display parts. The governing intro and the
		* context summary blocks are stripped (they were consumed as model context,
		* not shown to the reader) — structurally, by slicing past the quote block, so
		* no localized heading is ever matched; the `<quoted_context>` body is
		* unescaped for display; the question is whatever follows the quote (first
		* message) or the whole message (plain follow-up).
		*/
		function parseUserMessage(text) {
			const match = /<quoted_context\s[^>]*>([\s\S]*?)<\/quoted_context>/.exec(text);
			return {
				quote: match === null ? null : unescapeXml(match[1].trim()),
				question: match === null ? stripQuestionLabel(text) : stripQuestionLabel(text.slice((match.index ?? 0) + match[0].length))
			};
		}
		//#endregion
		//#region src/client/history-scope.ts
		/** The workspace owning a session (undefined when the session is ungrouped). */
		function workspaceOwningSession(workspaces, sessionId) {
			return workspaces.find((workspace) => workspace.sessionIds.includes(sessionId));
		}
		/**
		* Restrict a parent→children history tree to one workspace: keep only edges
		* whose parent AND child are in the allowed set. A parent outside the set is
		* dropped with its whole subtree (its follow-ups share its workspace); a
		* parent inside the set keeps only its in-workspace children (an empty
		* children list renders the parent as a leaf row).
		*/
		function filterHistoryToWorkspace(parentToChildren, allowedSessionIds) {
			const out = {};
			for (const [parentId, children] of Object.entries(parentToChildren)) {
				if (!allowedSessionIds.has(parentId)) continue;
				out[parentId] = children.filter((child) => allowedSessionIds.has(child));
			}
			return out;
		}
		/**
		* The tree roots: parents that are not themselves a child in the map. Recompute
		* this on the FILTERED map — a child whose parent was filtered out must not
		* resurface as a root (it belongs to another workspace's subtree).
		*/
		function rootsOf(parentToChildren) {
			const childSet = /* @__PURE__ */ new Set();
			for (const children of Object.values(parentToChildren)) for (const child of children) childSet.add(child);
			return Object.keys(parentToChildren).filter((id) => !childSet.has(id));
		}
		/**
		* The most recent activity (`updatedAt`) across a node and its whole subtree —
		* the "最近访问时间" of one conversation group. Returns undefined when no
		* session in the subtree has a timestamp yet (e.g. still hydrating). A visited
		* set guards against a corrupted map forming a cycle.
		*/
		function subtreeLatestUpdatedAt(id, parentToChildren, updatedAtOf) {
			const seen = /* @__PURE__ */ new Set();
			const visit = (sessionId) => {
				if (seen.has(sessionId)) return void 0;
				seen.add(sessionId);
				let latest = updatedAtOf(sessionId);
				for (const child of parentToChildren[sessionId] ?? []) {
					const childLatest = visit(child);
					if (childLatest !== void 0 && (latest === void 0 || childLatest > latest)) latest = childLatest;
				}
				return latest;
			};
			return visit(id);
		}
		/**
		* Classify one session id:
		* - `archived` — in the registry-global archive set (a DSH-side archive
		*   hides it from every workspace's `sessionIds`, but its mapping row here
		*   survives until pruned; check this FIRST so an archived id is never
		*   misread as deleted while the session feed still lists it);
		* - `gone` — absent from the session feed and not archived (deleted, or the
		*   feed has not hydrated it yet);
		* - `live` — present in the session feed and not archived.
		*/
		function sessionStatus(sessionId, byId, archivedSessionIds) {
			if (archivedSessionIds.has(sessionId)) return "archived";
			if (byId[sessionId] === void 0) return "gone";
			return "live";
		}
		/**
		* The ids of one node plus its whole subtree (root included). Iterative DFS
		* with a visited set, so a corrupted map forming a cycle terminates.
		*/
		function subtreeIds(parentToChildren, rootId) {
			const out = [];
			const seen = /* @__PURE__ */ new Set();
			const stack = [rootId];
			while (stack.length > 0) {
				const current = stack.pop();
				if (seen.has(current)) continue;
				seen.add(current);
				out.push(current);
				for (const child of parentToChildren[current] ?? []) stack.push(child);
			}
			return out;
		}
		/**
		* A new parent→children map with one subtree removed:
		* - the subtree's own keys are deleted (its descendants must not resurface
		*   as roots once their ancestor row is pruned);
		* - every remaining parent's children list drops any id inside the subtree
		*   (covers both the removed root and dangling references to removed
		*   descendants from a corrupted map).
		* Unknown ids return the input map unchanged.
		*/
		function removeSubtree(parentToChildren, rootId) {
			const removed = new Set(subtreeIds(parentToChildren, rootId));
			const out = {};
			let changed = false;
			for (const [parentId, children] of Object.entries(parentToChildren)) {
				if (removed.has(parentId)) {
					changed = true;
					continue;
				}
				const kept = children.filter((child) => !removed.has(child));
				if (kept.length !== children.length) changed = true;
				out[parentId] = kept;
			}
			return changed ? out : parentToChildren;
		}
		//#endregion
		//#region src/client/api.ts
		/** One wire failure. */
		var SidebarqaApiError = class extends Error {
			code;
			constructor(code, message) {
				super(message);
				this.code = code;
			}
		};
		async function call(method, payload, signal) {
			let response;
			try {
				response = await fetch(`/sidebarqa/api/${method}`, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(payload),
					signal
				});
			} catch (error) {
				throw new SidebarqaApiError("network", error instanceof Error ? error.message : String(error));
			}
			const parsed = await response.json().catch(() => null);
			if (!response.ok || parsed === null || parsed.ok !== true || parsed.value === void 0) throw new SidebarqaApiError(parsed?.error?.code ?? "http", parsed?.error?.message ?? `HTTP ${response.status}`);
			return parsed.value;
		}
		/** The sidebarqa API surface (session scope-free; the route fences itself). */
		const sidebarqaApi = {
			context: (payload, signal) => call("context", payload, signal),
			title: (payload, signal) => call("title", payload, signal),
			config: (signal) => call("config", {}, signal),
			catalog: (signal) => call("catalog", {}, signal),
			configGet: (signal) => call("config.get", {}, signal),
			configUpdate: (patch, expectedRevision) => call("config.update", {
				patch,
				...expectedRevision !== void 0 ? { expectedRevision } : {}
			})
		};
		/** Resolve a session's current model selection (used to inherit the summarize provider). */
		async function currentModelOf(ctx, sessionId) {
			try {
				const response = await ctx.connection.api.sessions.models({ sessionId });
				if (!response.result.ok) return void 0;
				return response.result.value.current ?? void 0;
			} catch {
				return;
			}
		}
		//#endregion
		//#region src/title.ts
		/**
		* Pure helpers for the post-answer retitle flow: the strict "title-only"
		* system prompt, the Q+A input framing with a truncation budget, and
		* UTF-8-safe title normalization. The normalization rules mirror DSH's
		* session-title package (control-sequence stripping + UTF-8 byte truncation
		* that never splits a code point), copied here so a third-party plugin
		* resolves outside the DSH monorepo without a runtime value import. Kept
		* dependency-free (TextEncoder only) for unit testing and shared by both the
		* host title route and the client input builder.
		*
		* The prompt text itself lives in `prompt-locale.ts`; the locale enters as a
		* trailing parameter defaulting to `'zh'`, so pre-i18n callers are unaffected.
		*/
		/**
		* System prompt: emit ONLY the title, plain single line, with a dual budget
		* (≤15 CJK chars / ≤6 words). It tells the model to use the language of the
		* question and answer — the title follows the CONTENT, not the UI language.
		* @param locale - which language the instruction itself is written in.
		*/
		function titleSystem(locale = "zh") {
			return promptsOf(locale).titleSystem;
		}
		titleSystem("zh");
		/** Max chars of the answer part admitted into the title input. */
		const TITLE_ANSWER_MAX = 1200;
		/** Bound a string to `max` characters with an ellipsis (Unicode-safe slice). */
		function bound(input, max) {
			if (input.length <= max) return input;
			return `${input.slice(0, max)}…`;
		}
		/**
		* Build the labeled `question / answer` input for the title model, each part
		* bounded. The labels are the ones `titleSystem` refers to, so both come from
		* the same bundle.
		*/
		function buildTitleInput(question, answer, locale = "zh") {
			const prompts = promptsOf(locale);
			const parts = [];
			if (question.trim() !== "") parts.push(`${prompts.titleQuestionLabel}${bound(question, 400)}`);
			if (answer.trim() !== "") parts.push(`${prompts.titleAnswerLabel}${bound(answer, TITLE_ANSWER_MAX)}`);
			return parts.join("\n");
		}
		//#endregion
		//#region src/client/locales.ts
		/**
		* The plugin's zh/en copy dictionary and the module-level `t()` it resolves
		* through. ZERO imports by design: every pure module and every component may
		* read copy from here without dragging a dependency (and without tripping the
		* client-bundle purity gate).
		*
		* The active language follows the DSH locale service (`ctx.locale`, attached by
		* the client `apply()`): the Host-backed preference (`locale.preference` in
		* settings.yaml) wins over the browser language, exactly like every first-party
		* DSH surface. Without the service — a build without the locale plugin, or a
		* unit test — `activeLocaleId()` degrades to `navigator.language`, then `'en'`.
		*
		* `zh` is the key-set source of truth; `en` is typed as `Record<CopyKey, string>`,
		* so a missing translation is a COMPILE error, and `tests/locales.spec.ts`
		* additionally pins key parity and rejects empty values at runtime.
		*
		* This dictionary holds UI copy only. Model-facing prompt text lives in
		* `src/prompt-locale.ts` — it is protocol (markers the prompts name and the
		* transcript parser reads back), not translatable chrome, and must never be
		* mixed in here.
		*/
		/** Namespace this plugin's dictionaries register under in the DSH locale
		*  registry. `sidebar` is DSH's own ui-sidebar and `betterSidebar` is the
		*  framework's, so neither is available. */
		const LOCALE_NS = "sidebarQa";
		/** Chinese copy — the key-set source of truth. */
		const zh = {
			commonCancel: "取消",
			commonRetry: "重试",
			commonRemove: "移除",
			commonLoading: "加载中…",
			commonCopy: "复制",
			commonCopied: "已复制",
			commonDefault: "默认",
			askTabTitle: "追问",
			askPopoverButton: "提问",
			askNewAsk: "新追问",
			askQuoteHead: "引文",
			askNoQuoteHint: "未选择文本，可直接提问（仅不带引文）。",
			askEmptyHint: "划选对话文本后点击「提问」，或直接输入问题。",
			askPreparing: "准备追问会话…",
			askComposerPlaceholder: "继续追问…（Enter 发送，Shift+Enter 换行）",
			askSend: "发送",
			askGenerating: "生成中…",
			askSeedDivider: "↑ 上方为主对话历史",
			askSeedDividerMore: "↑ 上方为主对话历史，继续向上滚动加载",
			askDegradedToCompressed: "主对话正在回答中，已改用「压缩」模式，稍后可在主对话空闲时再试「全量继承」。",
			histTabTitle: "追问记录",
			histEmptyAll: "还没有追问记录。在对话中划选文本并点击「提问」即可生成。",
			histEmptyWorkspace: "当前工作区暂无追问记录。在对话中划选文本并点击「提问」即可生成。",
			histWorkspace: "当前工作区：{name}",
			histArchived: "已归档",
			histDeleted: "已删除",
			histRemoveTitle: "从追问记录移除（不影响 DSH 侧会话）",
			histExpand: "展开追问",
			histCollapse: "折叠追问",
			modelFallbackLabel: "模型",
			modelTrigger: "模型：{label}",
			modelMenuLabel: "模型选择",
			modelCellModel: "模型",
			modelCellEffort: "推理强度",
			modelProviderDefault: "跟随提供方默认",
			modelLoadFailed: "加载失败",
			modelFailureDetail: "{name}：{message}",
			modelEmpty: "未加载到可用模型",
			modelNoEfforts: "当前模型没有可选的推理强度",
			modelInheritSeatHint: "全量继承沿用主对话模型（保前缀缓存），如需换模型请改用压缩/裁切",
			strategyInherit: "全量继承",
			strategyCompressed: "压缩对话",
			strategyTrim: "机械裁切",
			strategyAria: "上下文策略：{label}",
			cfgLoading: "加载配置…",
			cfgCatalogInherit: "继承被追问会话",
			cfgHistoryStrategyLabel: "上下文策略",
			cfgHistoryStrategyDesc: "追问如何继承主对话上下文：全量（fork+缓存命中）/ 压缩 / 机械裁切",
			cfgTrimWindowLabel: "裁切保留条数",
			cfgTrimWindowDesc: "机械裁切模式保留的最近消息条数（1–256）",
			cfgAnswerProviderLabel: "回答模型渠道",
			cfgAnswerProviderDesc: "子对话回答模型的 provider（从已配置渠道中选择）",
			cfgAnswerModelLabel: "回答模型",
			cfgAnswerModelDesc: "子对话回答模型的 id（随所选渠道切换）",
			cfgAnswerEffortLabel: "回答思考模式",
			cfgSummarizeProviderLabel: "摘要模型渠道",
			cfgSummarizeProviderDesc: "快速无思考摘要/标题模型的 provider（空 = 继承被追问会话）",
			cfgSummarizeModelLabel: "摘要模型",
			cfgSummarizeModelDesc: "快速无思考模型的 id（随所选渠道切换）",
			cfgSummarizeEffortLabel: "摘要思考模式",
			cfgEffortDesc: "Off 关闭思考；High / Max 逐级增强推理",
			meterSystem: "系统提示词",
			meterTools: "工具",
			meterMessages: "对话消息",
			meterUsed: "上下文已用 {reading}",
			meterHeadline: "上下文已用",
			meterPanelLabel: "上下文占用",
			timeNow: "刚刚",
			timeMinutes: "{n}分钟",
			timeHours: "{n}小时",
			timeDays: "{n}天",
			timeMonths: "{n}个月",
			timeYears: "{n}年",
			errSaveFailed: "保存失败：{detail}",
			errSaveConflict: "保存失败：配置已在其他窗口被修改，请重试",
			errAskFailed: "追问失败：{detail}",
			errModelFailed: "模型加载失败：{detail}"
		};
		/** English copy. The annotation makes a missing key a compile error. */
		const en = {
			commonCancel: "Cancel",
			commonRetry: "Retry",
			commonRemove: "Remove",
			commonLoading: "Loading…",
			commonCopy: "Copy",
			commonCopied: "Copied",
			commonDefault: "Default",
			askTabTitle: "Follow-up",
			askPopoverButton: "Ask",
			askNewAsk: "New follow-up",
			askQuoteHead: "Quote",
			askNoQuoteHint: "No text selected — you can still ask without a quote.",
			askEmptyHint: "Select text in the conversation and click \"Ask\", or just type a question.",
			askPreparing: "Preparing the follow-up session…",
			askComposerPlaceholder: "Ask a follow-up… (Enter to send, Shift+Enter for a new line)",
			askSend: "Send",
			askGenerating: "Generating…",
			askSeedDivider: "↑ Inherited main-conversation history",
			askSeedDividerMore: "↑ Inherited main-conversation history — scroll up to load more",
			askDegradedToCompressed: "The main conversation is still answering, so \"Compressed\" was used instead. Try \"Inherit full history\" again once it is idle.",
			histTabTitle: "Follow-ups",
			histEmptyAll: "No follow-ups yet. Select text in a conversation and click \"Ask\" to create one.",
			histEmptyWorkspace: "No follow-ups in this workspace yet. Select text in a conversation and click \"Ask\" to create one.",
			histWorkspace: "Workspace: {name}",
			histArchived: "Archived",
			histDeleted: "Deleted",
			histRemoveTitle: "Remove from the follow-up records (the DSH session itself is untouched)",
			histExpand: "Expand follow-ups",
			histCollapse: "Collapse follow-ups",
			modelFallbackLabel: "Model",
			modelTrigger: "Model: {label}",
			modelMenuLabel: "Model selection",
			modelCellModel: "Model",
			modelCellEffort: "Reasoning effort",
			modelProviderDefault: "Provider default",
			modelLoadFailed: "failed to load",
			modelFailureDetail: "{name}: {message}",
			modelEmpty: "No models available",
			modelNoEfforts: "This model has no selectable reasoning effort",
			modelInheritSeatHint: "Inherit keeps the main conversation’s model (that is what preserves the prefix cache); switch to Compressed or Trim to pick another model",
			strategyInherit: "Inherit full history",
			strategyCompressed: "Compressed",
			strategyTrim: "Trim",
			strategyAria: "Context strategy: {label}",
			cfgLoading: "Loading settings…",
			cfgCatalogInherit: "Inherit from the asked session",
			cfgHistoryStrategyLabel: "Context strategy",
			cfgHistoryStrategyDesc: "How a follow-up inherits the main conversation: full history (fork + prefix-cache hit) / compressed / trimmed",
			cfgTrimWindowLabel: "Trim window",
			cfgTrimWindowDesc: "How many recent messages the trim strategy keeps verbatim (1–256)",
			cfgAnswerProviderLabel: "Answer channel",
			cfgAnswerProviderDesc: "Provider route for the follow-up’s answer model (pick a configured channel)",
			cfgAnswerModelLabel: "Answer model",
			cfgAnswerModelDesc: "Model id for the follow-up’s answers (follows the chosen channel)",
			cfgAnswerEffortLabel: "Answer thinking mode",
			cfgSummarizeProviderLabel: "Summary channel",
			cfgSummarizeProviderDesc: "Provider of the fast no-thinking summary/title model (empty = inherit the asked session)",
			cfgSummarizeModelLabel: "Summary model",
			cfgSummarizeModelDesc: "Model id of the fast no-thinking model (follows the chosen channel)",
			cfgSummarizeEffortLabel: "Summary thinking mode",
			cfgEffortDesc: "Off disables thinking; High / Max deepen reasoning step by step",
			meterSystem: "System prompt",
			meterTools: "Tools",
			meterMessages: "Messages",
			meterUsed: "Context used {reading}",
			meterHeadline: "Context used",
			meterPanelLabel: "Context usage",
			timeNow: "now",
			timeMinutes: "{n}m",
			timeHours: "{n}h",
			timeDays: "{n}d",
			timeMonths: "{n}mo",
			timeYears: "{n}y",
			errSaveFailed: "Save failed: {detail}",
			errSaveConflict: "Save failed: the settings were changed in another window — please retry",
			errAskFailed: "Ask failed: {detail}",
			errModelFailed: "Model load failed: {detail}"
		};
		/**
		* The attached DSH locale service, or undefined before `apply()` runs and after
		* disposal. This is the one deliberate module-level mutable in a package whose
		* rule is "no module-level singletons, use createXxx factories": `t()` is
		* called from 20+ modules and from pure functions that receive no context, so
		* the active language has to be ambient.
		*/
		let localeService;
		/**
		* Attach (or, with `undefined`, detach) the DSH locale service.
		* @param service - `ctx.locale`, or undefined to fall back to the browser language.
		*/
		function attachLocale(service) {
			localeService = service;
		}
		/**
		* The active locale id.
		*
		* MUST return a stable primitive: it backs `useSyncExternalStore` through
		* `useLocaleRevision`, and returning a fresh object per call (e.g. the whole
		* `getSnapshot()`) would make React re-render forever.
		*/
		function activeLocaleId() {
			const active = localeService?.getSnapshot().active;
			if (active !== void 0 && active !== "") return active;
			const browser = typeof navigator !== "undefined" ? navigator.language : void 0;
			return browser === void 0 || browser === "" ? "en" : browser;
		}
		/**
		* Subscribe to locale switches. Without an attached service the copy can never
		* change, so this is an inert disposer rather than an error.
		* @param fn - called after every locale change.
		* @returns the unsubscribe disposer.
		*/
		function subscribeLocale(fn) {
			return localeService?.subscribe(fn) ?? (() => {});
		}
		/** Whether the active locale is Chinese (the dictionary choice is binary). */
		function isZh() {
			return activeLocaleId().toLowerCase().startsWith("zh");
		}
		/**
		* The model-facing prompt locale for the active language — the wire value sent
		* to the host's context/title routes (see `src/prompt-locale.ts`).
		*/
		function promptLocale() {
			return isZh() ? "zh" : "en";
		}
		/**
		* Translate one copy key, interpolating `{name}` placeholders.
		* @param key - a key of the `zh` dictionary.
		* @param params - placeholder values, substituted by name.
		*/
		function t(key, params) {
			let text = (isZh() ? zh : en)[key];
			if (params !== void 0) for (const [name, value] of Object.entries(params)) text = text.replaceAll(`{${name}}`, String(value));
			return text;
		}
		//#endregion
		//#region src/client/orchestrate.ts
		/** Find the workspace id owning a session (undefined when ungrouped). */
		function resolveWorkspaceId(ctx, sessionId) {
			try {
				return workspaceOwningSession(ctx.workspaces.list.getSnapshot().items, sessionId)?.workspaceId;
			} catch {
				return;
			}
		}
		/** A session's cwd (fallback create target when it has no workspace). */
		function sessionCwd(ctx, sessionId) {
			try {
				return ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd;
			} catch {
				return;
			}
		}
		/** Best-effort rename that never blocks the ask. */
		async function tryRename(ctx, sideSessionId, title) {
			try {
				const response = await ctx.connection.api.sessions.rename({
					sessionId: sideSessionId,
					title
				});
				if (!response.result.ok) console.warn("[dsh-sidebar-qa] rename failed:", response.result.error.message);
			} catch (error) {
				console.warn("[dsh-sidebar-qa] rename failed:", error);
			}
		}
		/** Best-effort model selection (default deepseek-v4-flash, thinking off; a
		*  panel-picked override wins when present). */
		async function trySelectModel(ctx, sideSessionId, config, override) {
			try {
				const response = await ctx.connection.api.sessions.selectModel({
					sessionId: sideSessionId,
					provider: override?.provider ?? config.answerProvider,
					model: override?.model ?? config.answerModel,
					...override === void 0 ? { reasoningEffort: config.answerReasoningEffort } : override.reasoningEffort === void 0 ? {} : { reasoningEffort: override.reasoningEffort }
				});
				if (!response.result.ok) console.warn("[dsh-sidebar-qa] selectModel failed:", response.result.error.message);
			} catch (error) {
				console.warn("[dsh-sidebar-qa] selectModel failed:", error);
			}
		}
		/** Read the resolved plugin config (fall back to safe defaults on failure). */
		async function loadConfig(ctx) {
			try {
				return await sidebarqaApi.config();
			} catch {
				return {
					historyStrategy: "compressed",
					trimWindowMessages: 10,
					summarizeProvider: "",
					summarizeModel: "deepseek-v4-flash",
					summarizeReasoningEffort: "off",
					summarizeBudgetTokens: 160,
					recentWindowMessages: 2,
					backgroundWindowMessages: 12,
					answerProvider: "deepseek-official",
					answerModel: "deepseek-v4-flash",
					answerReasoningEffort: "off",
					titleBudgetTokens: 64
				};
			}
		}
		/** Best-effort fork of the parent (the `inherit` strategy's session creation). */
		async function tryForkParent(ctx, parentSessionId) {
			const response = await ctx.connection.api.sessions.fork({ sessionId: parentSessionId });
			if (!response.result.ok) throw new Error(`fork failed: ${response.result.error.code}: ${response.result.error.message}`);
			return response.result.value.sessionId;
		}
		/** Prompt a side session with the assembled first message (throws on failure). */
		async function tryPrompt(ctx, sideSessionId, text) {
			const response = await ctx.connection.api.sessions.prompt({
				sessionId: sideSessionId,
				mode: "queue",
				content: [{
					type: "text",
					text
				}]
			});
			if (!response.result.ok) throw new Error(`prompt failed: ${response.result.error.code}: ${response.result.error.message}`);
		}
		/**
		* Run the full ask flow and return the created side session id.
		* @throws when create or prompt fails (the panel surfaces the error).
		*/
		async function askFollowUp(ctx, store, input, onPhase) {
			const { parentSessionId, quote, question } = input;
			onPhase?.("preparing");
			const [config, currentModel] = await Promise.all([loadConfig(ctx), currentModelOf(ctx, parentSessionId)]);
			const workspaceId = resolveWorkspaceId(ctx, parentSessionId);
			const cwd = workspaceId === void 0 ? sessionCwd(ctx, parentSessionId) : void 0;
			const locale = promptLocale();
			const prompts = promptsOf(locale);
			const label = quote.role === "user" ? prompts.quoteLabelUser : prompts.quoteLabelAgent;
			let strategy = input.strategy ?? config.historyStrategy ?? "compressed";
			if (strategy === "inherit") {
				let forkedId;
				try {
					forkedId = await tryForkParent(ctx, parentSessionId);
				} catch (error) {
					console.warn("[dsh-sidebar-qa] inherit fork failed, degrading to compressed:", error);
					strategy = "compressed";
				}
				if (forkedId !== void 0) {
					const sideSessionId = forkedId;
					await tryRename(ctx, sideSessionId, followUpTitle(topicFromQuote(quote.text, prompts.fallbackTopic)));
					await tryPrompt(ctx, sideSessionId, buildFirstMessage(null, quote, question, label, locale));
					store.addChild(parentSessionId, sideSessionId);
					onPhase?.("answering");
					return {
						sideSessionId,
						parentSessionId,
						degraded: false,
						strategy
					};
				}
			}
			const contextPromise = sidebarqaApi.context({
				mainSessionId: parentSessionId,
				strategy,
				locale,
				...config.summarizeProvider !== "" ? { provider: config.summarizeProvider } : currentModel !== void 0 ? { provider: currentModel.provider } : {}
			}).catch(() => ({
				degraded: true,
				text: null,
				sourceSeq: -1,
				reason: "network"
			}));
			const createResponse = await ctx.connection.api.sessions.create(workspaceId !== void 0 ? { workspaceId } : cwd !== void 0 ? { cwd } : {});
			if (!createResponse.result.ok) throw new Error(`create session failed: ${createResponse.result.error.code}: ${createResponse.result.error.message}`);
			const sideSessionId = createResponse.result.value.sessionId;
			const context = await contextPromise;
			await tryRename(ctx, sideSessionId, followUpTitle(topicFromQuote(quote.text, prompts.fallbackTopic)));
			await trySelectModel(ctx, sideSessionId, config, input.modelOverride);
			await tryPrompt(ctx, sideSessionId, buildFirstMessage(context.text, quote, question, label, locale));
			store.addChild(parentSessionId, sideSessionId);
			onPhase?.("answering");
			return {
				sideSessionId,
				parentSessionId,
				degraded: context.degraded,
				strategy
			};
		}
		/**
		* Send a follow-up message inside an existing side session (no summary — only
		* the first message carries the compressed parent context, per PRD 6).
		*/
		async function sendFollowUp(ctx, sideSessionId, question) {
			const response = await ctx.connection.api.sessions.prompt({
				sessionId: sideSessionId,
				mode: "queue",
				content: [{
					type: "text",
					text: question
				}]
			});
			if (!response.result.ok) throw new Error(`prompt failed: ${response.result.error.code}: ${response.result.error.message}`);
		}
		/**
		* Fold one history page into the clean question + answer for the title model.
		* The question is recovered via {@link parseUserMessage} (summary + quote
		* stripped); the answer is every settled assistant message's text.
		*/
		function questionAndAnswerOf(events) {
			const transcript = transcriptOf(events);
			return {
				question: transcript.filter((message) => message.role === "user").map((message) => parseUserMessage(message.text).question).filter((text) => text.trim() !== "").join(" / "),
				answer: transcript.filter((message) => message.role === "assistant").map((message) => message.text).filter((text) => text.trim() !== "").join("\n")
			};
		}
		/**
		* One-shot post-answer retitle: after the side session's FIRST turn completes,
		* fold the question + answer into a compact input, ask the fast no-thinking
		* title model (the summarize route: fixed flash / thinking off) for a ≤15-char
		* subject, and overwrite the placeholder `❓<topicFromQuote>` title.
		* Fires at most once per side session (the store flag), never blocks the
		* panel, and degrades silently to the placeholder on any failure.
		*/
		async function titleSideSessionOnce(ctx, store, input) {
			const { sideSessionId, parentSessionId, events } = input;
			if (!hasTurnEnded(events)) return;
			if (store.isTitled(sideSessionId)) return;
			store.markTitled(sideSessionId);
			const locale = promptLocale();
			const { question, answer } = questionAndAnswerOf(events);
			const text = buildTitleInput(question, answer, locale);
			if (text.trim() === "") return;
			try {
				const [config, parentModel] = await Promise.all([loadConfig(ctx), currentModelOf(ctx, parentSessionId)]);
				const provider = config.summarizeProvider !== "" ? config.summarizeProvider : parentModel?.provider ?? config.answerProvider;
				if (provider === "") return;
				const result = await sidebarqaApi.title({
					text,
					provider,
					model: config.summarizeModel,
					locale
				});
				if (result.degraded || result.title === null || result.title === "") return;
				await tryRename(ctx, sideSessionId, followUpTitle(result.title));
			} catch {}
		}
		//#endregion
		//#region src/client/model-seat.ts
		/**
		* The configured answer model as a selection, or null when it cannot be used.
		* An unusable config (still loading, or an empty provider/model) falls back to
		* showing the read session's own current model rather than a half-empty chip.
		*/
		function configSelection(config) {
			if (config === null) return null;
			if (config.answerProvider === "" || config.answerModel === "") return null;
			return {
				provider: config.answerProvider,
				model: config.answerModel,
				...config.answerReasoningEffort === "" ? {} : { reasoningEffort: config.answerReasoningEffort }
			};
		}
		/**
		* Resolve the seat binding for one panel state.
		* @param input - the panel facts (active follow-up, parent, strategy, draft, config).
		* @returns which session to read, how a pick lands, what to display, and the hint.
		*/
		function resolveModelSeat(input) {
			if (input.activeChildId !== null) return {
				sessionId: input.activeChildId,
				mode: "commit",
				value: null
			};
			if (input.strategy === "inherit") return {
				sessionId: input.parentSessionId,
				mode: "readonly",
				value: null,
				hintKey: "modelInheritSeatHint"
			};
			return {
				sessionId: input.parentSessionId,
				mode: "draft",
				value: input.pendingModel ?? configSelection(input.config)
			};
		}
		//#endregion
		//#region src/client/use-locale.ts
		/**
		* The React adapter over the locale holder in `locales.ts`.
		*
		* Every panel root calls `useLocaleRevision()` once. The module-level `t()`
		* reads the active language at CALL time, so a single re-render of a root
		* re-localizes its whole subtree — which is why no component below a root may
		* be wrapped in `React.memo`, and why no `useMemo` may cache already-translated
		* text (cache the copy KEY instead; see `model-seat.ts`). The one exception is
		* `codeLabels` in `AskPanel`, which must be identity-stable per locale because
		* `MarkdownText` caches its component table on it.
		*
		* The hook deliberately takes no `ctx`: `ConfigPanel` (rendered by the DSH
		* settings shell) and `SelectionPopover` (its own body root) never receive one,
		* and reading the module holder is what lets one hook serve all four roots.
		*/
		/**
		* Re-render this component when the DSH locale switches.
		* @returns the active locale id — a stable primitive, as `useSyncExternalStore`
		*          requires (a fresh object per call would loop forever).
		*/
		function useLocaleRevision() {
			return (0, react.useSyncExternalStore)(subscribeLocale, activeLocaleId);
		}
		/** The three thinking modes shown as a dropdown. */
		const REASONING_EFFORT_OPTIONS = [
			{
				value: "off",
				label: "Off"
			},
			{
				value: "high",
				label: "High"
			},
			{
				value: "max",
				label: "Max"
			}
		];
		/** The three history strategies shown as a dropdown (mirror of the host union).
		*  A FUNCTION, not a const: a module-level table would freeze its labels at
		*  import time and never follow a locale switch. The `value`s are the persisted
		*  protocol keys and never change. */
		function historyStrategyOptions() {
			return [
				{
					value: "inherit",
					label: t("strategyInherit")
				},
				{
					value: "compressed",
					label: t("strategyCompressed")
				},
				{
					value: "trim",
					label: t("strategyTrim")
				}
			];
		}
		/** The config panel's editable rows, in display order. Only the knobs users
		*  plausibly tune are surfaced; the compression internals (summary budget,
		*  window sizes, title budget) keep their defaults and stay settable through
		*  the `sidebarqa` settings namespace in settings.yaml.
		*
		*  A FUNCTION for the same reason as {@link historyStrategyOptions}: the copy
		*  is resolved per call, so the panel re-localizes on a language switch. */
		function configFields() {
			return [
				{
					key: "historyStrategy",
					label: t("cfgHistoryStrategyLabel"),
					type: "select",
					options: historyStrategyOptions(),
					desc: t("cfgHistoryStrategyDesc")
				},
				{
					key: "trimWindowMessages",
					label: t("cfgTrimWindowLabel"),
					type: "number",
					min: 1,
					max: 256,
					desc: t("cfgTrimWindowDesc")
				},
				{
					key: "answerProvider",
					label: t("cfgAnswerProviderLabel"),
					type: "catalog",
					source: "answerProvider",
					desc: t("cfgAnswerProviderDesc")
				},
				{
					key: "answerModel",
					label: t("cfgAnswerModelLabel"),
					type: "catalog",
					source: "answerModel",
					desc: t("cfgAnswerModelDesc")
				},
				{
					key: "answerReasoningEffort",
					label: t("cfgAnswerEffortLabel"),
					type: "select",
					options: REASONING_EFFORT_OPTIONS,
					desc: t("cfgEffortDesc")
				},
				{
					key: "summarizeProvider",
					label: t("cfgSummarizeProviderLabel"),
					type: "catalog",
					source: "summarizeProvider",
					desc: t("cfgSummarizeProviderDesc")
				},
				{
					key: "summarizeModel",
					label: t("cfgSummarizeModelLabel"),
					type: "catalog",
					source: "summarizeModel",
					desc: t("cfgSummarizeModelDesc")
				},
				{
					key: "summarizeReasoningEffort",
					label: t("cfgSummarizeEffortLabel"),
					type: "select",
					options: REASONING_EFFORT_OPTIONS,
					desc: t("cfgEffortDesc")
				}
			];
		}
		/**
		* Parse + clamp one number row's raw input. A non-finite input returns null so
		* the row can revert to the stored value (mirror of the host rows' behavior).
		*/
		function coerceNumberField(raw, min, max) {
			if (raw.trim() === "") return null;
			const parsed = Number(raw);
			if (!Number.isFinite(parsed)) return null;
			let clamped = Math.round(parsed);
			if (min !== void 0 && clamped < min) clamped = min;
			if (max !== void 0 && clamped > max) clamped = max;
			return clamped;
		}
		/**
		* The provider catalog row's choices, in provider order. The summarize channel
		* prepends its "inherit the asked session" sentinel (empty value) so the
		* default `''` stays selectable from the dropdown.
		* @param catalog - the live model catalog.
		* @param source - the row's role; only `summarizeProvider` gets the inherit entry.
		*/
		function providerOptionsOf(catalog, source) {
			const rows = catalog.map((provider) => ({
				value: provider.provider,
				label: provider.displayName
			}));
			if (source === "summarizeProvider") return [{
				value: "",
				label: t("cfgCatalogInherit")
			}, ...rows];
			return rows;
		}
		/**
		* The model catalog row's choices for one provider route: that provider's
		* catalog models, or [] while the provider is unknown/unchosen.
		*/
		function modelOptionsOf(catalog, provider) {
			if (provider !== "") {
				const match = catalog.find((candidate) => candidate.provider === provider);
				if (match === void 0) return [];
				return match.models.map((model) => ({
					value: model.id,
					label: model.name
				}));
			}
			const seen = /* @__PURE__ */ new Set();
			const rows = [];
			for (const group of catalog) for (const model of group.models) {
				if (seen.has(model.id)) continue;
				seen.add(model.id);
				rows.push({
					value: model.id,
					label: model.name
				});
			}
			return rows;
		}
		//#endregion
		//#region \0dsh-css:/home/rai/shiva-code/plugins/dsh-sidebar-qa/src/client/ask-panel.module.css.mjs
		const css$3 = "._94yh6q_root{height:100%;color:var(--dsw-alias-label-primary);flex-direction:column;font-size:13px;display:flex}._94yh6q_switcher{border-bottom:1px solid var(--dsw-alias-border-l2);flex-wrap:wrap;gap:6px;padding:8px 10px;display:flex}._94yh6q_switcherItem{appearance:none;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);cursor:pointer;text-overflow:ellipsis;white-space:nowrap;border-radius:999px;max-width:180px;padding:3px 8px;font-size:12px;overflow:hidden}._94yh6q_switcherActive{border-color:var(--dsw-alias-state-business-primary);color:#fff;background:var(--dsw-alias-button-info-fill)}._94yh6q_newAsk{appearance:none;border:1px dashed var(--dsw-alias-border-l3);color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border-radius:999px;padding:3px 8px;font-size:12px}._94yh6q_body{flex:1;padding:12px 10px;overflow-y:auto}._94yh6q_transcript{flex-direction:column;gap:12px;display:flex}._94yh6q_seedDivider{text-align:center;color:var(--dsw-alias-label-tertiary);border-bottom:1px solid var(--dsw-alias-border-l2);margin-bottom:2px;padding:6px 0;font-size:12px;line-height:18px}._94yh6q_userRow{justify-content:flex-end;display:flex}._94yh6q_assistantRow{justify-content:flex-start;display:flex}._94yh6q_userContent{flex-direction:column;align-items:flex-end;gap:6px;max-width:88%;display:flex}._94yh6q_quoteBlock{border-left:3px solid var(--dsw-alias-state-business-primary);color:var(--dsw-alias-label-tertiary);white-space:pre-wrap;word-break:break-word;max-width:100%;margin:0;padding:2px 0 2px 10px;font-size:12px}._94yh6q_questionText{background:var(--dsw-alias-button-info-fill);color:#fff;white-space:pre-wrap;word-break:break-word;border-radius:12px 12px 2px;padding:8px 12px}._94yh6q_assistantMarkdown{max-width:100%;color:var(--dsw-alias-label-primary);word-break:break-word;font-size:13px;line-height:1.6}._94yh6q_startHint{flex-direction:column;gap:8px;display:flex}._94yh6q_quoteChip{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);border-radius:8px;overflow:hidden}._94yh6q_quoteChipHead{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-tertiary);justify-content:space-between;align-items:center;padding:5px 10px;font-size:12px;display:flex}._94yh6q_quoteCancel{color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;padding:0;font-size:12px}._94yh6q_quoteCancel:hover{color:var(--dsw-alias-label-primary)}._94yh6q_quoteChipText{white-space:pre-wrap;word-break:break-word;max-height:160px;padding:8px 10px;overflow-y:auto}._94yh6q_emptyHint{color:var(--dsw-alias-label-dimmed)}._94yh6q_strategyNote,._94yh6q_busyHint{color:var(--dsw-alias-label-tertiary);margin:0 10px;padding:0 0 6px;font-size:12px}._94yh6q_card{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2-darkmode-thin);background:var(--dsw-specific-input-major);box-shadow:var(--dsw-shadow-lv2);border-radius:22px;flex-direction:column;gap:12px;margin:0 10px 10px;padding-top:10px;font-size:16px;line-height:24px;display:flex}._94yh6q_input{box-sizing:border-box;resize:vertical;width:100%;min-height:40px;max-height:160px;color:var(--dsw-alias-label-primary);caret-color:var(--dsw-alias-state-business-primary);font:inherit;background:0 0;border:none;outline:none;padding:4px 12px 0 16px}._94yh6q_input::placeholder{color:var(--dsw-alias-label-caption)}._94yh6q_row{justify-content:space-between;align-items:center;gap:12px;min-width:0;padding:2px 8px 6px;display:flex}._94yh6q_tools,._94yh6q_trailing{align-items:center;min-width:0;display:flex}._94yh6q_tools{gap:16px}._94yh6q_trailing{flex:none;gap:12px}._94yh6q_chip{min-width:0;max-width:220px;height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:24px;outline:none;align-items:center;gap:4px;padding:0 4px 0 8px;font-size:13px;font-weight:500;line-height:20px;display:inline-flex}._94yh6q_chip:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}._94yh6q_chip:focus-visible{box-shadow:0 0 0 2px var(--dsw-alias-border-l3)}._94yh6q_chip:disabled,._94yh6q_chip._94yh6q_chipReadonly{color:var(--dsw-alias-label-dimmed);cursor:default}._94yh6q_chip._94yh6q_chipReadonly:hover{background:0 0}._94yh6q_chipIcon{flex:none;display:inline-flex}._94yh6q_chipIcon svg{width:14px;height:14px}._94yh6q_chipLabel{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}._94yh6q_chipEffort{color:var(--dsw-alias-label-caption);flex:none}._94yh6q_chipChevron{color:var(--dsw-alias-label-caption);flex:none;transition:transform .12s;display:inline-flex}._94yh6q_chipChevronOpen{transform:rotate(180deg)}._94yh6q_primary{background:var(--dsw-alias-button-info-fill);color:#fff;cursor:pointer;border:none;border-radius:999px;flex:none;place-items:center;width:34px;height:34px;transition:background-color .1s;display:grid;transform:translateY(-2px)}._94yh6q_primary:hover:not(:disabled){background:var(--dsw-alias-button-info-hover)}._94yh6q_primary:disabled{opacity:.4;cursor:default}._94yh6q_modelRoot{min-width:0;position:relative}._94yh6q_modelMenu{z-index:20;border:1px solid var(--dsw-alias-border-inverted);background:var(--dsw-specific-menu);width:min(240px,100vw - 32px);max-height:min(360px,100vh - 96px);box-shadow:var(--dsw-shadow-lv3);color:var(--dsw-alias-label-primary);border-radius:12px;flex-direction:column;padding:4px;font-size:13px;line-height:20px;display:flex;position:absolute;bottom:calc(100% + 8px);right:0;overflow:hidden}._94yh6q_modelStatus{color:var(--dsw-alias-label-tertiary);padding:10px;font-size:13px;line-height:20px}._94yh6q_modelError,._94yh6q_modelWarn{background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary);border-radius:8px;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:4px;padding:7px 8px;font-size:12px;line-height:18px;display:flex}._94yh6q_modelWarn{background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-state-warn-label)}._94yh6q_modelRetry{color:inherit;font:inherit;cursor:pointer;background:0 0;border:none;flex:none;padding:0;font-weight:600}._94yh6q_modelGroups{min-height:0;overflow-y:auto}._94yh6q_modelGroup+._94yh6q_modelGroup{margin-top:4px}._94yh6q_modelGroupTitle{z-index:1;background:var(--dsw-specific-menu);color:var(--dsw-alias-label-tertiary);padding:5px 8px 3px;font-size:12px;font-weight:500;line-height:18px;position:sticky;top:0}._94yh6q_modelOption{width:100%;min-height:38px;color:inherit;text-align:left;cursor:pointer;background:0 0;border:none;border-radius:10px;outline:none;align-items:center;gap:8px;padding:6px 8px;display:flex}._94yh6q_modelOption:hover:not(:disabled),._94yh6q_modelOption:focus-visible{background:var(--dsw-alias-interactive-bg-hover)}._94yh6q_modelOption:disabled{color:var(--dsw-alias-label-dimmed);cursor:default}._94yh6q_modelOptionCopy{flex-direction:column;flex:1;min-width:0;display:flex}._94yh6q_modelName{color:inherit;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:500;line-height:20px;overflow:hidden}._94yh6q_modelDesc{color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;font-size:12px;line-height:18px;overflow:hidden}._94yh6q_modelCheck{color:var(--dsw-alias-label-primary);flex:0 0 18px;place-items:center;display:grid}._94yh6q_modelCell{width:100%;height:40px;color:var(--dsw-alias-label-primary);cursor:pointer;text-align:left;background:0 0;border:none;border-radius:10px;align-items:center;gap:8px;padding:0 10px;font-size:14px;line-height:22px;display:flex}._94yh6q_modelCell:hover{background:var(--dsw-alias-interactive-bg-hover)}._94yh6q_modelCellLabel{text-overflow:ellipsis;white-space:nowrap;flex:auto;min-width:0;overflow:hidden}._94yh6q_modelCellValue{text-overflow:ellipsis;white-space:nowrap;min-width:0;color:var(--dsw-alias-label-tertiary);flex:0 auto;overflow:hidden}._94yh6q_modelCellChevron{color:var(--dsw-alias-label-tertiary);flex:none}._94yh6q_meterRoot{display:inline-flex;position:relative}._94yh6q_meterTrigger{width:28px;height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:999px;flex:none;place-items:center;display:grid}._94yh6q_meterTrigger:hover{background:var(--dsw-alias-interactive-bg-hover)}._94yh6q_meterTrack{fill:none;stroke:var(--dsw-alias-border-l3);stroke-width:2px}._94yh6q_meterFill{fill:none;stroke:var(--dsw-alias-label-tertiary);stroke-width:2px;stroke-linecap:round}._94yh6q_meterPanel{z-index:100;box-sizing:border-box;border:1px solid var(--dsw-alias-border-inverted);background:var(--dsw-specific-menu);width:264px;box-shadow:var(--dsw-shadow-lv3);color:var(--dsw-alias-label-secondary);cursor:default;border-radius:12px;padding:12px;font-size:12px;line-height:20px;position:absolute;bottom:calc(100% + 8px);right:0}._94yh6q_meterHeader{align-items:center;gap:6px;display:flex}._94yh6q_meterFigures{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary);margin-left:auto;font-weight:500}._94yh6q_meterPercent{color:var(--dsw-alias-label-primary);font-weight:500}._94yh6q_meterHeadline{color:var(--dsw-alias-label-tertiary)}._94yh6q_meterBar{background:var(--dsw-alias-interactive-bg-hover);border-radius:999px;gap:1px;height:4px;margin:10px 0 12px;display:flex;overflow:hidden}._94yh6q_meterSegment{background:var(--meter-tint,var(--dsw-alias-label-tertiary));border-radius:1px;flex:none;min-width:2px;height:100%}._94yh6q_meterSwatch{background:var(--meter-tint);vertical-align:baseline;border-radius:2px;width:8px;height:8px;margin-right:6px;display:inline-block}._94yh6q_meterColorSystem{--meter-tint:var(--dsw-static-neutral-bluish-400)}._94yh6q_meterColorTools{--meter-tint:#a78bfa}._94yh6q_meterColorMessages{--meter-tint:var(--dsw-static-blue-450)}._94yh6q_meterRows{margin:6px 0 0}._94yh6q_meterRow{justify-content:space-between;align-items:center;gap:12px;padding:2px 0;display:flex}._94yh6q_meterRow dt{color:var(--dsw-alias-label-secondary)}._94yh6q_meterRow dd{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary);margin:0}._94yh6q_error{color:var(--dsw-alias-state-error-primary);white-space:pre-wrap;padding:0 10px 8px;font-size:12px}";
		const tagId$3 = "dsh-sidebar-qa/ask-panel.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$3) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-sidebar-qa";
			tag.dataset.pluginCss = tagId$3;
			tag.textContent = css$3;
			document.head.appendChild(tag);
		}
		var ask_panel_module_css_default = {
			"meterRow": "_94yh6q_meterRow",
			"switcherActive": "_94yh6q_switcherActive",
			"modelWarn": "_94yh6q_modelWarn",
			"meterRows": "_94yh6q_meterRows",
			"quoteChipText": "_94yh6q_quoteChipText",
			"trailing": "_94yh6q_trailing",
			"transcript": "_94yh6q_transcript",
			"startHint": "_94yh6q_startHint",
			"meterTrack": "_94yh6q_meterTrack",
			"modelDesc": "_94yh6q_modelDesc",
			"root": "_94yh6q_root",
			"modelGroupTitle": "_94yh6q_modelGroupTitle",
			"quoteCancel": "_94yh6q_quoteCancel",
			"chipEffort": "_94yh6q_chipEffort",
			"modelStatus": "_94yh6q_modelStatus",
			"body": "_94yh6q_body",
			"busyHint": "_94yh6q_busyHint",
			"assistantRow": "_94yh6q_assistantRow",
			"emptyHint": "_94yh6q_emptyHint",
			"meterColorMessages": "_94yh6q_meterColorMessages",
			"strategyNote": "_94yh6q_strategyNote",
			"modelRetry": "_94yh6q_modelRetry",
			"userRow": "_94yh6q_userRow",
			"modelMenu": "_94yh6q_modelMenu",
			"error": "_94yh6q_error",
			"questionText": "_94yh6q_questionText",
			"userContent": "_94yh6q_userContent",
			"newAsk": "_94yh6q_newAsk",
			"meterPercent": "_94yh6q_meterPercent",
			"chipChevronOpen": "_94yh6q_chipChevronOpen",
			"meterRoot": "_94yh6q_meterRoot",
			"quoteChipHead": "_94yh6q_quoteChipHead",
			"modelCellChevron": "_94yh6q_modelCellChevron",
			"primary": "_94yh6q_primary",
			"modelCellValue": "_94yh6q_modelCellValue",
			"switcher": "_94yh6q_switcher",
			"modelRoot": "_94yh6q_modelRoot",
			"meterHeadline": "_94yh6q_meterHeadline",
			"row": "_94yh6q_row",
			"meterHeader": "_94yh6q_meterHeader",
			"quoteChip": "_94yh6q_quoteChip",
			"meterSwatch": "_94yh6q_meterSwatch",
			"chipChevron": "_94yh6q_chipChevron",
			"meterColorSystem": "_94yh6q_meterColorSystem",
			"switcherItem": "_94yh6q_switcherItem",
			"card": "_94yh6q_card",
			"chipIcon": "_94yh6q_chipIcon",
			"modelCheck": "_94yh6q_modelCheck",
			"meterBar": "_94yh6q_meterBar",
			"assistantMarkdown": "_94yh6q_assistantMarkdown",
			"modelError": "_94yh6q_modelError",
			"meterTrigger": "_94yh6q_meterTrigger",
			"modelCellLabel": "_94yh6q_modelCellLabel",
			"meterColorTools": "_94yh6q_meterColorTools",
			"modelOption": "_94yh6q_modelOption",
			"meterFill": "_94yh6q_meterFill",
			"modelGroup": "_94yh6q_modelGroup",
			"seedDivider": "_94yh6q_seedDivider",
			"quoteBlock": "_94yh6q_quoteBlock",
			"modelOptionCopy": "_94yh6q_modelOptionCopy",
			"input": "_94yh6q_input",
			"chip": "_94yh6q_chip",
			"meterSegment": "_94yh6q_meterSegment",
			"modelGroups": "_94yh6q_modelGroups",
			"modelCell": "_94yh6q_modelCell",
			"meterFigures": "_94yh6q_meterFigures",
			"tools": "_94yh6q_tools",
			"chipReadonly": "_94yh6q_chipReadonly",
			"meterPanel": "_94yh6q_meterPanel",
			"chipLabel": "_94yh6q_chipLabel",
			"modelName": "_94yh6q_modelName"
		};
		//#endregion
		//#region src/client/StrategySelect.tsx
		/**
		* The AskPanel's history-strategy selector: a chip trigger + anchored dropdown
		* in the exact chrome of the host composer's access-mode control
		* (PermissionSelect) — same trigger geometry, hover fill, chevron rotation and
		* menu material, driven by the primitives Menu. Replaces the plain <select>
		* so the composer row reads as one DSH-style control set.
		*/
		/** Join truthy class names (no clsx dependency in this package). */
		function cx$1(...names) {
			return names.filter(Boolean).join(" ");
		}
		/** inherit: a fork — the side thread splits off the main lineage. */
		function InheritGlyph() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: "16",
				height: "16",
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": true,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M8 13.5V8.5",
						stroke: "currentColor",
						strokeWidth: "1.3",
						strokeLinecap: "round"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M8 8.5C8 6 5.5 5.5 4 4.5",
						stroke: "currentColor",
						strokeWidth: "1.3",
						strokeLinecap: "round"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M8 8.5C8 6 10.5 5.5 12 4.5",
						stroke: "currentColor",
						strokeWidth: "1.3",
						strokeLinecap: "round"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "8",
						cy: "13.5",
						r: "1.1",
						fill: "currentColor"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "4",
						cy: "4.5",
						r: "1.1",
						fill: "currentColor"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "12",
						cy: "4.5",
						r: "1.1",
						fill: "currentColor"
					})
				]
			});
		}
		/** compressed: stacked bars narrowing upward. */
		function CompressedGlyph() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: "16",
				height: "16",
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": true,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "3",
						y: "10.5",
						width: "10",
						height: "2",
						rx: "1",
						fill: "currentColor"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "4.5",
						y: "7",
						width: "7",
						height: "2",
						rx: "1",
						fill: "currentColor"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "6",
						y: "3.5",
						width: "4",
						height: "2",
						rx: "1",
						fill: "currentColor"
					})
				]
			});
		}
		/** trim: a strip with a scissor cut. */
		function TrimGlyph() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: "16",
				height: "16",
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": true,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "2.5",
						y: "6.75",
						width: "11",
						height: "2.5",
						rx: "1.25",
						fill: "currentColor"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M9 9.25L11 7.25",
						stroke: "currentColor",
						strokeWidth: "1.3",
						strokeLinecap: "round"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "11.8",
						cy: "11.5",
						r: "1.1",
						fill: "currentColor"
					})
				]
			});
		}
		/** Glyph for one strategy value (the chips' leading icon). */
		function strategyGlyph(value) {
			if (value === "inherit") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(InheritGlyph, {});
			if (value === "trim") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TrimGlyph, {});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CompressedGlyph, {});
		}
		/**
		* The strategy chip: current strategy glyph + label + chevron, opening an
		* anchored dropdown (side top — the composer row sits at the panel bottom).
		*/
		function StrategySelect({ value, onChange, disabled = false }) {
			const [open, setOpen] = (0, react.useState)(false);
			const options = historyStrategyOptions();
			const current = options.find((option) => option.value === value) ?? options[1];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
				open,
				items: options.map((option) => ({
					id: option.value,
					label: option.label,
					icon: strategyGlyph(option.value)
				})),
				selectedId: value,
				onSelect: (id) => {
					setOpen(false);
					onChange(id);
				},
				onClose: () => {
					setOpen(false);
				},
				side: "top",
				align: "start",
				anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: ask_panel_module_css_default.chip,
					"aria-label": t("strategyAria", { label: current.label }),
					title: current.label,
					disabled,
					onClick: () => {
						setOpen(!open);
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ask_panel_module_css_default.chipIcon,
							"aria-hidden": true,
							children: strategyGlyph(value)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ask_panel_module_css_default.chipLabel,
							children: current.label
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: cx$1(ask_panel_module_css_default.chipChevron, open && ask_panel_module_css_default.chipChevronOpen),
							"aria-hidden": true,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, {})
						})
					]
				})
			});
		}
		//#endregion
		//#region src/client/model-menu.ts
		/** Build the opaque row id for one provider/model pair. */
		function modelChoiceId(provider, model) {
			return `${provider}/${model}`;
		}
		/**
		* Flatten the advisory directory into selectable rows in provider order.
		* @param models - the directory snapshot from `session.models`.
		*/
		function modelChoicesOf(models) {
			const rows = [];
			for (const group of models.groups) for (const model of group.models) rows.push({
				id: modelChoiceId(group.id, model.id),
				provider: group.id,
				model: model.id,
				name: model.name,
				detail: model.description !== void 0 && model.description !== "" ? `${group.name} · ${model.description}` : group.name,
				...model.reasoning === void 0 ? {} : { reasoning: model.reasoning }
			});
			return rows;
		}
		/**
		* Resolve a picked row id back to a complete selection. The reasoning effort
		* carries the provider default unless the row IS the current route (then the
		* host's reported current effort wins — it may differ from the default).
		* @param models - the directory snapshot the rows were built from.
		* @param id - the picked row id.
		* @returns the selection, or undefined for stale/unknown ids.
		*/
		function modelSelectionOf(models, id) {
			for (const group of models.groups) for (const model of group.models) {
				if (modelChoiceId(group.id, model.id) !== id) continue;
				const reasoningEffort = models.current?.provider === group.id && models.current.model === model.id ? models.current?.reasoningEffort ?? model.reasoning?.defaultEffort : model.reasoning?.defaultEffort;
				return {
					provider: group.id,
					model: model.id,
					...reasoningEffort === void 0 ? {} : { reasoningEffort }
				};
			}
		}
		/**
		* The effort a selection would actually run with: its explicit effort, else the
		* catalog model's advertised `defaultEffort`, else undefined (the provider
		* decides). A selection whose model is absent from the directory keeps its
		* explicit effort verbatim — nothing is invented for a route we cannot describe.
		* @param models - the directory snapshot (its groups carry the reasoning metadata).
		* @param selection - the selection to normalize; null yields undefined.
		* @returns the effective effort id, or undefined.
		*/
		function effectiveEffortOf(models, selection) {
			if (selection === null) return void 0;
			if (selection.reasoningEffort !== void 0) return selection.reasoningEffort;
			for (const group of models.groups) {
				if (group.id !== selection.provider) continue;
				for (const model of group.models) if (model.id === selection.model) return model.reasoning?.defaultEffort;
			}
		}
		/**
		* Whether submitting `next` would change nothing: same provider, same model AND
		* the same EFFECTIVE effort. The seat's earlier provider/model-only guard
		* ignored `reasoningEffort` and therefore swallowed every effort switch
		* (issue #10) — an effort-only pick keeps the route by construction. An unknown
		* current selection is never a no-op.
		* @param models - directory snapshot used to fold in default efforts.
		* @param current - the selection the seat displays, or null.
		* @param next - the selection the user picked.
		* @returns true when the submission would be a pure no-op.
		*/
		function isNoopSelection(models, current, next) {
			if (current === null) return false;
			if (current.provider !== next.provider || current.model !== next.model) return false;
			return effectiveEffortOf(models, current) === effectiveEffortOf(models, next);
		}
		//#endregion
		//#region src/client/ModelSelect.tsx
		/**
		* The AskPanel's model selector: a compact port of the host composer's
		* `conversation.input.model` seat (ModelSelect), driven directly by the same
		* wire facts — `session.models` for the advisory directory and
		* `session.selectModel` for submission — so a switch here is what the host
		* composer and the /model command show next. Two-level menu (模型 / 推理强度)
		* over the provider-grouped directory; failures surface as an inline strip
		* with Retry.
		*/
		/** Join truthy class names (no clsx dependency in this package). */
		function cx(...names) {
			return names.filter(Boolean).join(" ");
		}
		const IDLE = {
			current: null,
			routable: null,
			groups: [],
			failures: [],
			status: "idle",
			error: null
		};
		/**
		* The compact model seat for the side panel. `ctx.connection.api.sessions`
		* carries both verbs; the RPC surface mirrors the host's `session.models` /
		* `session.selectModel` exactly, so no plugin-to-plugin import is involved.
		*/
		function ModelSelect({ ctx, sessionId, mode = "commit", value = null, hint, disabled = false, onChange }) {
			const localeRevision = useLocaleRevision();
			const [dir, setDir] = (0, react.useState)(IDLE);
			const [open, setOpen] = (0, react.useState)(false);
			const [pane, setPane] = (0, react.useState)("root");
			const generation = (0, react.useRef)(0);
			const rootRef = (0, react.useRef)(null);
			const triggerRef = (0, react.useRef)(null);
			const itemRefs = (0, react.useRef)([]);
			const id = (0, react.useId)();
			const choices = (0, react.useMemo)(() => modelChoicesOf(dir), [dir]);
			const selection = mode === "commit" ? dir.current : value ?? dir.current;
			const currentChoice = choices[selection === null ? -1 : choices.findIndex((c) => c.provider === selection.provider && c.model === selection.model)];
			const reasoning = currentChoice?.reasoning;
			const effectiveEffort = effectiveEffortOf(dir, selection);
			const effortLabel = reasoning === void 0 ? void 0 : effectiveEffort === void 0 ? t("commonDefault") : reasoning.efforts.find((level) => level.id === effectiveEffort)?.name ?? effectiveEffort;
			const effortChoices = (0, react.useMemo)(() => reasoning === void 0 ? [] : [...reasoning.defaultEffort === void 0 ? [{
				key: "provider-default",
				effort: void 0,
				label: t("modelProviderDefault")
			}] : [], ...reasoning.efforts.map((effort) => ({
				key: `effort:${effort.id}`,
				effort: effort.id,
				label: effort.name
			}))], [reasoning, localeRevision]);
			const busy = dir.status === "selecting";
			const load = () => {
				const gen = ++generation.current;
				setDir((prev) => ({
					...prev,
					status: "loading",
					error: null
				}));
				ctx.connection.api.sessions.models({ sessionId }).then((response) => {
					if (gen !== generation.current) return;
					const { result } = response;
					if (!result.ok) {
						setDir((prev) => ({
							...prev,
							status: "error",
							error: `${result.error.code}: ${result.error.message}`
						}));
						return;
					}
					const { current, routable, groups, failures } = result.value;
					setDir({
						current,
						routable,
						groups,
						failures,
						status: "ready",
						error: null
					});
				}).catch((error) => {
					if (gen !== generation.current) return;
					setDir((prev) => ({
						...prev,
						status: "error",
						error: error instanceof Error ? error.message : String(error)
					}));
				});
			};
			(0, react.useEffect)(() => {
				load();
			}, [sessionId]);
			(0, react.useEffect)(() => {
				if (!open) return;
				const closeOutside = (event) => {
					if (!rootRef.current?.contains(event.target)) setOpen(false);
				};
				document.addEventListener("mousedown", closeOutside);
				return () => {
					document.removeEventListener("mousedown", closeOutside);
				};
			}, [open]);
			const show = () => {
				setPane("root");
				setOpen(true);
				load();
			};
			const close = (restoreFocus = false) => {
				setOpen(false);
				setPane("root");
				if (restoreFocus) queueMicrotask(() => {
					triggerRef.current?.focus();
				});
			};
			const moveFocus = (offset) => {
				const items = itemRefs.current.filter((item) => item !== null);
				if (items.length === 0) return;
				const active = items.findIndex((item) => item === document.activeElement);
				items[(Math.max(active, 0) + offset + items.length) % items.length]?.focus();
			};
			const onRootKeyDown = (event) => {
				if (event.key === "Escape" && open) {
					event.preventDefault();
					if (pane !== "root") setPane("root");
					else close(true);
					return;
				}
				if (!open) return;
				if (event.key === "ArrowDown" || event.key === "ArrowUp") {
					event.preventDefault();
					moveFocus(event.key === "ArrowDown" ? 1 : -1);
				}
			};
			const onBlur = (event) => {
				if (event.relatedTarget instanceof Node && rootRef.current?.contains(event.relatedTarget)) return;
				close();
			};
			const choose = (next) => {
				if (mode === "readonly") {
					close(true);
					return;
				}
				if (mode === "draft") {
					onChange?.(next);
					close(true);
					return;
				}
				if (isNoopSelection(dir, selection, next)) {
					close(true);
					return;
				}
				const gen = ++generation.current;
				setDir((prev) => ({
					...prev,
					status: "selecting",
					error: null
				}));
				ctx.connection.api.sessions.selectModel({
					sessionId,
					provider: next.provider,
					model: next.model,
					...next.reasoningEffort === void 0 ? {} : { reasoningEffort: next.reasoningEffort }
				}).then((response) => {
					if (gen !== generation.current) return;
					const { result } = response;
					if (!result.ok) {
						setDir((prev) => ({
							...prev,
							status: "error",
							error: `${result.error.code}: ${result.error.message}`
						}));
						return;
					}
					setDir((prev) => ({
						...prev,
						current: result.value.selected,
						routable: true,
						status: "ready",
						error: null
					}));
					onChange?.(result.value.selected);
					close(true);
				}).catch((error) => {
					if (gen !== generation.current) return;
					setDir((prev) => ({
						...prev,
						status: "error",
						error: error instanceof Error ? error.message : String(error)
					}));
				});
			};
			const chooseEffort = (effort) => {
				if (selection === null) return;
				choose({
					provider: selection.provider,
					model: selection.model,
					...effort === void 0 ? {} : { reasoningEffort: effort }
				});
			};
			const modelLabel = currentChoice?.name ?? selection?.model ?? t("modelFallbackLabel");
			const triggerLabel = effortLabel === void 0 ? modelLabel : `${modelLabel} · ${effortLabel}`;
			const readonly = mode === "readonly";
			itemRefs.current = [];
			let itemIndex = 0;
			const itemRef = () => {
				const at = itemIndex++;
				return (node) => {
					itemRefs.current[at] = node;
				};
			};
			const root = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: rootRef,
				className: ask_panel_module_css_default.modelRoot,
				onKeyDown: onRootKeyDown,
				onBlur,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					ref: triggerRef,
					type: "button",
					className: cx(ask_panel_module_css_default.chip, readonly && ask_panel_module_css_default.chipReadonly),
					"aria-label": t("modelTrigger", { label: triggerLabel }),
					"aria-haspopup": readonly ? void 0 : "menu",
					"aria-expanded": readonly ? void 0 : open,
					"aria-controls": open ? `${id}-menu` : void 0,
					"aria-disabled": readonly ? true : void 0,
					title: hint === void 0 ? triggerLabel : void 0,
					disabled,
					onClick: () => {
						if (readonly) return;
						if (open) close();
						else show();
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ask_panel_module_css_default.chipLabel,
							children: modelLabel
						}),
						effortLabel !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ask_panel_module_css_default.chipEffort,
							children: effortLabel
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: cx(ask_panel_module_css_default.chipChevron, open && ask_panel_module_css_default.chipChevronOpen),
							"aria-hidden": true,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, {})
						})
					]
				}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					id: `${id}-menu`,
					className: ask_panel_module_css_default.modelMenu,
					role: "menu",
					"aria-label": t("modelMenuLabel"),
					"aria-busy": busy || dir.status === "loading",
					children: [
						pane === "root" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							ref: itemRef(),
							type: "button",
							role: "menuitem",
							className: ask_panel_module_css_default.modelCell,
							onClick: () => {
								setPane("models");
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ask_panel_module_css_default.modelCellLabel,
									children: t("modelCellModel")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ask_panel_module_css_default.modelCellValue,
									children: modelLabel
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, { className: ask_panel_module_css_default.modelCellChevron })
							]
						}), reasoning !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							ref: itemRef(),
							type: "button",
							role: "menuitem",
							className: ask_panel_module_css_default.modelCell,
							onClick: () => {
								setPane("effort");
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ask_panel_module_css_default.modelCellLabel,
									children: t("modelCellEffort")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ask_panel_module_css_default.modelCellValue,
									children: effortLabel
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, { className: ask_panel_module_css_default.modelCellChevron })
							]
						})] }),
						pane === "models" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							dir.status === "loading" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: ask_panel_module_css_default.modelStatus,
								children: t("commonLoading")
							}),
							dir.error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: ask_panel_module_css_default.modelError,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, {}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("errModelFailed", { detail: dir.error }) }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: ask_panel_module_css_default.modelRetry,
										onClick: load,
										children: t("commonRetry")
									})
								]
							}),
							dir.failures.map((failure) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: ask_panel_module_css_default.modelWarn,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, {}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("modelFailureDetail", {
										name: failure.name,
										message: failure.message ?? t("modelLoadFailed")
									}) }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: ask_panel_module_css_default.modelRetry,
										onClick: load,
										children: t("commonRetry")
									})
								]
							}, failure.id)),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: ask_panel_module_css_default.modelGroups,
								children: dir.groups.map((group) => {
									const headingId = `${id}-${group.id}`;
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
										role: "group",
										"aria-labelledby": headingId,
										className: ask_panel_module_css_default.modelGroup,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: ask_panel_module_css_default.modelGroupTitle,
											id: headingId,
											children: group.name
										}), group.models.map((model) => {
											const selected = selection?.provider === group.id && selection.model === model.id;
											return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
												ref: itemRef(),
												type: "button",
												role: "menuitemradio",
												"aria-checked": selected,
												className: cx(ask_panel_module_css_default.modelOption, selected && ask_panel_module_css_default.modelOptionSelected),
												title: model.name,
												disabled: busy,
												onClick: () => {
													const picked = modelSelectionOf({
														...dir,
														current: selection
													}, modelChoiceId(group.id, model.id));
													if (picked !== void 0) choose(picked);
												},
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													className: ask_panel_module_css_default.modelOptionCopy,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: ask_panel_module_css_default.modelName,
														children: model.name
													}), model.description !== void 0 && model.description !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: ask_panel_module_css_default.modelDesc,
														children: model.description
													})]
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: ask_panel_module_css_default.modelCheck,
													children: selected ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16, {}) : null
												})]
											}, model.id);
										})]
									}, group.id);
								})
							}),
							dir.status === "ready" && choices.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: ask_panel_module_css_default.modelStatus,
								children: t("modelEmpty")
							})
						] }),
						pane === "effort" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: effortChoices.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: ask_panel_module_css_default.modelStatus,
							children: t("modelNoEfforts")
						}) : effortChoices.map((level) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							ref: itemRef(),
							type: "button",
							role: "menuitemradio",
							"aria-checked": effectiveEffort === level.effort,
							className: cx(ask_panel_module_css_default.modelOption, effectiveEffort === level.effort && ask_panel_module_css_default.modelOptionSelected),
							disabled: busy,
							onClick: () => {
								chooseEffort(level.effort);
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ask_panel_module_css_default.modelOptionCopy,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ask_panel_module_css_default.modelName,
									children: level.label
								})
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ask_panel_module_css_default.modelCheck,
								children: effectiveEffort === level.effort ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16, {}) : null
							})]
						}, level.key)) })
					]
				})]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
				label: hint ?? "",
				side: "top",
				delayMs: 300,
				disabled: hint === void 0,
				children: root
			});
		}
		//#endregion
		//#region src/client/context-meter.ts
		/**
		* Compact token count: 517 / 12.2K / 517K / 1.2M (one decimal under three
		* digits). Port of the host StatsLine helper so both meters read identically.
		*/
		function formatTokens(n) {
			const scaled = (v) => v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10);
			if (n < 1e3) return String(n);
			if (n < 1e6) return `${scaled(n / 1e3)}K`;
			return `${scaled(n / 1e6)}M`;
		}
		/**
		* Approximate context occupancy: `projectedTokens` (the provider sample
		* carried forward over the surface's movement since) falls back to the bare
		* `pressureTokens`; both numerator and capacity must be known, else null.
		* @param pressure - the session's `contextPressure` projection value.
		* @returns occupancy, or null until both values are known.
		*/
		function contextOccupancy(pressure) {
			const usedTokens = pressure?.projectedTokens ?? pressure?.pressureTokens;
			if (usedTokens === void 0 || pressure?.contextWindow === void 0) return null;
			return {
				percent: Math.min(100, Math.round(usedTokens / pressure.contextWindow * 100)),
				usedTokens,
				contextWindow: pressure.contextWindow
			};
		}
		//#endregion
		//#region src/client/ContextMeter.tsx
		/**
		* The AskPanel's context-occupancy meter: a ring beside the send button fed by
		* the host-computed `contextPressure` projection, with a click-open panel of
		* the `contextBreakdown` composition (system prompt / tools / conversation).
		* Reads the per-session projection store through `ctx.sessions.scope →
		* sessionOf → projections.faceOf` — the same projection values the host
		* composer's ContextMeter renders, reached without any plugin-to-plugin
		* import. Renders nothing until a provider reports both pressure and a route
		* capacity.
		*/
		/** Ring geometry: 14px viewBox, 2px stroke. */
		const RADIUS = 5.5;
		const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
		/** Panel legend rows, in bar-segment order (each color class pairs swatch +
		*  segment). The rows carry the copy KEY, not the copy: a module-level table
		*  holding resolved text would never follow a language switch. */
		const ROWS = [
			{
				key: "systemTokens",
				labelKey: "meterSystem",
				color: ask_panel_module_css_default.meterColorSystem
			},
			{
				key: "toolsTokens",
				labelKey: "meterTools",
				color: ask_panel_module_css_default.meterColorTools
			},
			{
				key: "messageTokens",
				labelKey: "meterMessages",
				color: ask_panel_module_css_default.meterColorMessages
			}
		];
		/**
		* One projection key's value for a session, as a React observable.
		* Absent projections (face undefined or value undefined) read `undefined`.
		*/
		function useProjectionValue(ctx, sessionId, key) {
			const face = (0, react.useMemo)(() => {
				try {
					const scoped = ctx.sessions.scope(sessionId);
					if (scoped === void 0) return void 0;
					return ctx.sessions.sessionOf(scoped)?.projections.faceOf(key);
				} catch {
					return;
				}
			}, [
				ctx,
				sessionId,
				key
			]);
			return (0, react.useSyncExternalStore)((cb) => face?.subscribe(cb) ?? (() => {}), () => face?.getSnapshot());
		}
		function ContextMeter({ ctx, sessionId }) {
			const pressure = useProjectionValue(ctx, sessionId, "contextPressure");
			const breakdown = useProjectionValue(ctx, sessionId, "contextBreakdown");
			const [open, setOpen] = (0, react.useState)(false);
			const rootRef = (0, react.useRef)(null);
			const context = contextOccupancy(pressure);
			const available = context !== null;
			(0, react.useEffect)(() => {
				if (!available && open) setOpen(false);
			}, [available, open]);
			if (context === null) return null;
			const percent = context.percent;
			const reading = `${percent}%`;
			const breakdownTotal = breakdown === void 0 ? 0 : breakdown.systemTokens + breakdown.toolsTokens + breakdown.messageTokens;
			const segments = (breakdown === void 0 || breakdownTotal === 0 ? [{
				key: "total",
				color: void 0,
				width: percent
			}] : ROWS.map((row) => ({
				key: row.key,
				color: row.color,
				width: percent * breakdown[row.key] / breakdownTotal
			}))).filter((part) => part.width > 0);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				ref: rootRef,
				className: ask_panel_module_css_default.meterRoot,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
					label: t("meterUsed", { reading }),
					side: "top",
					delayMs: 200,
					disabled: open,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: ask_panel_module_css_default.meterTrigger,
						"aria-label": t("meterUsed", { reading }),
						"aria-haspopup": "dialog",
						"aria-expanded": open,
						onClick: () => {
							setOpen(!open);
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
							viewBox: "0 0 14 14",
							width: "14",
							height: "14",
							"aria-hidden": true,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
								className: ask_panel_module_css_default.meterTrack,
								cx: "7",
								cy: "7",
								r: RADIUS
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
								className: ask_panel_module_css_default.meterFill,
								cx: "7",
								cy: "7",
								r: RADIUS,
								strokeDasharray: `${CIRCUMFERENCE * percent / 100} ${CIRCUMFERENCE}`,
								transform: "rotate(-90 7 7)"
							})]
						})
					})
				}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: ask_panel_module_css_default.meterPanel,
					role: "dialog",
					"aria-label": t("meterPanelLabel"),
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: ask_panel_module_css_default.meterHeader,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ask_panel_module_css_default.meterHeadline,
									children: t("meterHeadline")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ask_panel_module_css_default.meterPercent,
									children: reading
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ask_panel_module_css_default.meterFigures,
									children: `~${formatTokens(context.usedTokens)} / ${formatTokens(context.contextWindow)}`
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: ask_panel_module_css_default.meterBar,
							children: segments.map((segment) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: segment.color === void 0 ? ask_panel_module_css_default.meterSegment : `${ask_panel_module_css_default.meterSegment} ${segment.color}`,
								style: { width: `${segment.width}%` }
							}, segment.key))
						}),
						breakdown !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dl", {
							className: ask_panel_module_css_default.meterRows,
							children: ROWS.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: ask_panel_module_css_default.meterRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dt", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: `${ask_panel_module_css_default.meterSwatch} ${row.color}`,
									"aria-hidden": true
								}), t(row.labelKey)] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: `~${formatTokens(breakdown[row.key])}` })]
							}, row.key))
						})
					]
				})]
			});
		}
		//#endregion
		//#region src/client/meta-quote.ts
		/**
		* Read a quote off a tab's `meta` slot, validating the wire shape.
		* `meta` is JSON-serializable unknown data set by any caller, so the shape is
		* checked field by field; anything unexpected yields null and the panel falls
		* back to the store's pending quote (or no quote).
		* @param meta - the tab's `meta` value (may be absent or anything).
		* @returns the quote, or null when absent or not a valid quote.
		*/
		function resolveMetaQuote(meta) {
			if (meta === null || meta === void 0 || typeof meta !== "object") return null;
			const record = meta;
			const text = record.quote;
			if (typeof text !== "string" || text.trim() === "") return null;
			const quote = { text };
			if (typeof record.messageId === "string") quote.messageId = record.messageId;
			if (typeof record.role === "string") quote.role = record.role;
			return quote;
		}
		/**
		* Strip a consumed quote off a tab's `meta` value, keeping any other keys.
		* The panel calls this after the quote was sent, so a later focus of the same
		* tab (or a page reload, where the meta persists) does not resurface the
		* stale quote.
		* @param meta - the tab's current `meta` value.
		* @returns a new meta object without `quote`, or undefined when meta was absent.
		*/
		function consumeMetaQuote(meta) {
			if (meta === null || meta === void 0 || typeof meta !== "object") return meta;
			const record = meta;
			if (!Object.hasOwn(record, "quote")) return meta;
			const { quote: _quote, ...rest } = record;
			return rest;
		}
		/**
		* The panel's view mode. A pending quote only owns the view while no
		* follow-up is selected: picking an existing child in the switcher returns to
		* that conversation (the quote stays parked for the 新追问 button), and
		* cancelling the quote without children falls back to the empty hint.
		* @param hasQuote - whether a pending quote (store or meta) is present.
		* @param activeChildId - the selected follow-up session, or null.
		* @returns the view mode.
		*/
		function resolveAskMode(hasQuote, activeChildId) {
			if (activeChildId !== null) return "conversation";
			return hasQuote ? "start" : "empty";
		}
		/** All leaf pane ids under a split node. */
		function paneIdsOf(node) {
			if (node.kind === "leaf") return [node.id];
			const children = node.children ?? [];
			const ids = [];
			for (const child of children) ids.push(...paneIdsOf(child));
			return ids;
		}
		/**
		* The expansion patch needed so a freshly opened tab lands in sight, or null
		* when nothing needs to change. Mirrors better-sidebar's content-open
		* auto-expand rule:
		* - unknown viewport width → null (the runtime skips auto-expand without a
		*   window too);
		* - narrow viewport → `panelOpen` is the only lever (merged drawer);
		* - wide viewport → expand the panel hosting the active pane: the bottom
		*   panel when the active pane lives in `bottomSplits`, else the right panel.
		*/
		function expandPatch(state, viewportWidth) {
			if (viewportWidth === void 0) return null;
			if (viewportWidth < 768) return state.panelOpen ? null : { panelOpen: true };
			if (state.activePane !== null && paneIdsOf(state.bottomSplits).includes(state.activePane)) return state.bottomOpen ? null : { bottomOpen: true };
			return state.panelOpen ? null : { panelOpen: true };
		}
		/**
		* Expand the collapsed panel hosting this plugin's tabs, if needed. Safe to
		* call from a tab component's mount effect (or any other point with the
		* store in hand); a no-op when the sidebar state is missing (no active
		* session) or already expanded. Returns true when it expanded. `viewportWidth`
		* is injectable for tests; absent, it falls back to `window.innerWidth`.
		*/
		function expandPanelIfCollapsed(store, viewportWidth) {
			const state = store.getSnapshot().state;
			if (state === void 0) return false;
			const patch = expandPatch(state, viewportWidth ?? (typeof window === "undefined" ? void 0 : window.innerWidth));
			if (patch === null) return false;
			store.reduce((s) => ({
				...s,
				...patch
			}));
			return true;
		}
		//#endregion
		//#region src/client/tab-activation.ts
		const listeners = /* @__PURE__ */ new Set();
		/** Subscribe to a "a tab of this plugin was just activated" event. Returns the disposer. */
		function onTabActivated(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		}
		/** Fire every registered listener (called from the tab descriptor's onActivate). */
		function notifyTabActivated() {
			for (const fn of [...listeners]) fn();
		}
		//#endregion
		//#region src/client/AskPanel.tsx
		/**
		* The `dsh-sidebar-qa:ask` tab: an embedded conversation view for the current
		* session's follow-up thread. A follow-up is a real workspace session, but the
		* Q&A happens IN the panel — the transcript streams here and a composer at the
		* bottom continues the conversation, without ever jumping to the child
		* session's main window. Selecting text + 提问 starts a new (nested) follow-up
		* from whatever session is currently open.
		*/
		function AskPanel(props) {
			const { ctx, scope, visible, store, bsStore } = props;
			const localeRevision = useLocaleRevision();
			const sessionId = scope.sessionId;
			const tabId = props.tab.id;
			(0, react.useEffect)(() => {
				ctx.betterSidebar.updateTab(tabId, { title: t("askTabTitle") });
			}, [
				ctx,
				tabId,
				localeRevision
			]);
			(0, react.useEffect)(() => {
				if (bsStore === void 0) return;
				expandPanelIfCollapsed(bsStore);
				return onTabActivated(() => expandPanelIfCollapsed(bsStore));
			}, [bsStore]);
			const snapshot = (0, react.useSyncExternalStore)((cb) => store.subscribe(cb), () => store.getSnapshot());
			const metaQuote = resolveMetaQuote(props.tab.meta);
			const pendingQuote = metaQuote ?? snapshot.pendingBySession[sessionId] ?? null;
			const children = snapshot.parentToChildren[sessionId] ?? [];
			const sessionList = (0, react.useSyncExternalStore)((cb) => ctx.sessions.list.subscribe(cb), () => ctx.sessions.list.getSnapshot());
			const [activeChildId, setActiveChildId] = (0, react.useState)(null);
			const [question, setQuestion] = (0, react.useState)("");
			const [phase, setPhase] = (0, react.useState)("idle");
			const [error, setError] = (0, react.useState)(null);
			const [strategy, setStrategy] = (0, react.useState)("compressed");
			const [strategyNote, setStrategyNote] = (0, react.useState)(null);
			const [pendingModel, setPendingModel] = (0, react.useState)(null);
			const [config, setConfig] = (0, react.useState)(null);
			const inputRef = (0, react.useRef)(null);
			const codeLabels = (0, react.useMemo)(() => ({
				copyLabel: t("commonCopy"),
				copiedLabel: t("commonCopied")
			}), [localeRevision]);
			const activeRunning = activeChildId !== null && sessionList.byId[activeChildId]?.running === true;
			const toolSessionId = activeChildId ?? sessionId;
			const seat = (0, react.useMemo)(() => resolveModelSeat({
				activeChildId,
				parentSessionId: sessionId,
				strategy,
				pendingModel,
				config
			}), [
				activeChildId,
				sessionId,
				strategy,
				pendingModel,
				config
			]);
			const [loadedEvents, setLoadedEvents] = (0, react.useState)([]);
			const [anchorSeq, setAnchorSeq] = (0, react.useState)(null);
			const [hasOlder, setHasOlder] = (0, react.useState)(false);
			const [loadingOlder, setLoadingOlder] = (0, react.useState)(false);
			const seededRef = (0, react.useRef)(false);
			const anchoredRef = (0, react.useRef)(false);
			const scrollRef = (0, react.useRef)(null);
			const anchorRowRef = (0, react.useRef)(null);
			const rows = (0, react.useMemo)(() => transcriptRowsOf(loadedEvents), [loadedEvents]);
			(0, react.useEffect)(() => {
				const list = store.childrenOf(sessionId);
				setActiveChildId(list.length > 0 ? list[list.length - 1] ?? null : null);
				setQuestion("");
				setPhase("idle");
				setError(null);
				setStrategyNote(null);
				setPendingModel(null);
			}, [sessionId, store]);
			(0, react.useEffect)(() => {
				seededRef.current = false;
				anchoredRef.current = false;
				setLoadedEvents([]);
				setAnchorSeq(null);
				setHasOlder(false);
				setLoadingOlder(false);
				if (scrollRef.current !== null) scrollRef.current.scrollTop = 0;
			}, [activeChildId]);
			(0, react.useEffect)(() => {
				let cancelled = false;
				sidebarqaApi.config().then((view) => {
					if (cancelled) return;
					setStrategy(view.historyStrategy ?? "compressed");
					setConfig(view);
				}).catch(() => {});
				return () => {
					cancelled = true;
				};
			}, []);
			(0, react.useEffect)(() => {
				if (pendingQuote !== null) {
					setActiveChildId(null);
					setPhase("idle");
					setError(null);
				}
			}, [pendingQuote !== null]);
			(0, react.useEffect)(() => {
				if (visible) inputRef.current?.focus();
			}, [visible]);
			(0, react.useEffect)(() => {
				if (activeChildId === null || !visible) return;
				let cancelled = false;
				const poll = async () => {
					try {
						const response = await ctx.connection.api.sessions.history({
							sessionId: activeChildId,
							maxMessages: 60
						});
						if (cancelled || !response.result.ok) return;
						const events = response.result.value.events;
						if (!seededRef.current) {
							seededRef.current = true;
							const seedIndex = lastEndSeedIndex(events);
							const anchor = seedIndex >= 0 ? events[seedIndex]?.event.seq ?? null : null;
							setAnchorSeq(anchor);
							setHasOlder(seedIndex >= 0 || response.result.value.hasMore);
							setLoadedEvents(events);
							if (anchor !== null && !events.some((entry) => entry.event.seq > anchor && (entry.event.type === "user/message" || entry.event.type === "assistant/message"))) window.setTimeout(() => {
								if (!cancelled) poll();
							}, 200);
							return;
						}
						setLoadedEvents((prev) => {
							const latest = prev.at(-1)?.event.seq ?? -1;
							const fresh = events.filter((event) => event.event.seq > latest);
							return fresh.length === 0 ? prev : [...prev, ...fresh];
						});
					} catch {}
				};
				poll();
				const timer = window.setInterval(() => {
					poll();
				}, 1200);
				return () => {
					cancelled = true;
					window.clearInterval(timer);
				};
			}, [
				activeChildId,
				visible,
				ctx
			]);
			(0, react.useEffect)(() => {
				if (activeChildId === null || loadedEvents.length === 0) return;
				const ownEvents = anchorSeq === null ? loadedEvents : loadedEvents.filter((entry) => entry.event.seq > anchorSeq);
				if (ownEvents.length === 0) return;
				titleSideSessionOnce(ctx, store, {
					sideSessionId: activeChildId,
					parentSessionId: store.parentOf(activeChildId) ?? sessionId,
					events: ownEvents
				});
			}, [
				loadedEvents,
				anchorSeq,
				activeChildId,
				ctx,
				store,
				sessionId
			]);
			(0, react.useEffect)(() => {
				if (anchorSeq === null || anchoredRef.current) return;
				const scrollEl = scrollRef.current;
				const anchorEl = anchorRowRef.current;
				if (scrollEl === null || anchorEl === null) return;
				anchoredRef.current = true;
				requestAnimationFrame(() => {
					const containerTop = scrollEl.getBoundingClientRect().top;
					const anchorTop = anchorEl.getBoundingClientRect().top;
					scrollEl.scrollTop += anchorTop - containerTop;
				});
			}, [anchorSeq, rows]);
			const loadOlder = async () => {
				if (activeChildId === null || loadingOlder || !hasOlder) return;
				const first = loadedEvents[0];
				if (first === void 0) return;
				setLoadingOlder(true);
				try {
					const before = first.event.seq;
					const response = await ctx.connection.api.sessions.history({
						sessionId: activeChildId,
						beforeSeq: before,
						maxMessages: 60
					});
					if (!response.result.ok) return;
					const older = response.result.value.events.filter((event) => event.event.seq < before);
					if (older.length > 0) {
						const scrollEl = scrollRef.current;
						const heightBefore = scrollEl?.scrollHeight ?? 0;
						setLoadedEvents((prev) => [...older, ...prev]);
						setHasOlder(response.result.value.hasMore);
						if (scrollEl !== null) requestAnimationFrame(() => {
							scrollEl.scrollTop += scrollEl.scrollHeight - heightBefore;
						});
					} else setHasOlder(response.result.value.hasMore);
				} catch {} finally {
					setLoadingOlder(false);
				}
			};
			const onScroll = () => {
				const el = scrollRef.current;
				if (el === null) return;
				if (el.scrollTop <= 48) loadOlder();
			};
			(0, react.useEffect)(() => {
				if (!activeRunning) setPhase((prev) => prev === "answering" ? "idle" : prev);
			}, [activeRunning]);
			const submit = async () => {
				const q = question.trim();
				if (q === "" || phase === "asking") return;
				setPhase("asking");
				setError(null);
				setStrategyNote(null);
				try {
					if (activeChildId === null) {
						const result = await askFollowUp(ctx, store, {
							parentSessionId: sessionId,
							quote: pendingQuote ?? { text: "" },
							question: q,
							strategy,
							modelOverride: pendingModel ?? void 0
						}, (next) => {
							if (next === "answering") setPhase("answering");
						});
						setActiveChildId(result.sideSessionId);
						if (result.strategy !== strategy) setStrategyNote(t("askDegradedToCompressed"));
						store.setPendingQuote(sessionId, null);
						consumeMeta();
						setPhase("answering");
					} else {
						await sendFollowUp(ctx, activeChildId, q);
						setPhase("answering");
					}
					setQuestion("");
				} catch (err) {
					setPhase("error");
					setError(err instanceof Error ? err.message : String(err));
				}
			};
			const busy = phase === "asking";
			const mode = resolveAskMode(pendingQuote !== null, activeChildId);
			const consumeMeta = () => {
				if (metaQuote !== null) ctx.betterSidebar.updateTab(props.tab.id, { meta: consumeMetaQuote(props.tab.meta) });
			};
			const clearQuote = () => {
				store.setPendingQuote(sessionId, null);
				consumeMeta();
				const list = store.childrenOf(sessionId);
				setActiveChildId(list.length > 0 ? list[list.length - 1] ?? null : null);
				setPhase("idle");
				setError(null);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: ask_panel_module_css_default.root,
				children: [
					children.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ask_panel_module_css_default.switcher,
						children: [children.map((id) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: activeChildId === id ? `${ask_panel_module_css_default.switcherItem} ${ask_panel_module_css_default.switcherActive}` : ask_panel_module_css_default.switcherItem,
							title: titleOf$1(ctx, id),
							onClick: () => {
								setActiveChildId(id);
								setPhase("idle");
								setError(null);
							},
							children: titleOf$1(ctx, id)
						}, id)), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: ask_panel_module_css_default.newAsk,
							onClick: () => {
								setActiveChildId(null);
								setPhase("idle");
								setError(null);
							},
							children: t("askNewAsk")
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ask_panel_module_css_default.body,
						ref: scrollRef,
						onScroll,
						children: [
							mode === "conversation" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Transcript, {
								rows,
								running: activeRunning,
								codeLabels,
								anchorSeq,
								anchorRef: anchorRowRef,
								hasOlder
							}),
							mode === "start" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: ask_panel_module_css_default.startHint,
								children: pendingQuote !== null && pendingQuote.text !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: ask_panel_module_css_default.quoteChip,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: ask_panel_module_css_default.quoteChipHead,
										children: [t("askQuoteHead"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: ask_panel_module_css_default.quoteCancel,
											onClick: clearQuote,
											children: t("commonCancel")
										})]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: ask_panel_module_css_default.quoteChipText,
										children: pendingQuote.text
									})]
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: ask_panel_module_css_default.emptyHint,
									children: t("askNoQuoteHint")
								})
							}),
							mode === "empty" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: ask_panel_module_css_default.emptyHint,
								children: t("askEmptyHint")
							})
						]
					}),
					strategyNote !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: ask_panel_module_css_default.strategyNote,
						children: strategyNote
					}),
					phase === "asking" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: ask_panel_module_css_default.busyHint,
						children: t("askPreparing")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ask_panel_module_css_default.card,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							ref: inputRef,
							className: ask_panel_module_css_default.input,
							placeholder: t("askComposerPlaceholder"),
							value: question,
							onChange: (event) => {
								setQuestion(event.target.value);
							},
							onKeyDown: (event) => {
								if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
									event.preventDefault();
									submit();
								}
							}
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: ask_panel_module_css_default.row,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: ask_panel_module_css_default.tools,
								children: activeChildId === null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StrategySelect, {
									value: strategy,
									disabled: busy,
									onChange: setStrategy
								})
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: ask_panel_module_css_default.trailing,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelSelect, {
										ctx,
										sessionId: seat.sessionId,
										mode: seat.mode,
										value: seat.value,
										...seat.hintKey === void 0 ? {} : { hint: t(seat.hintKey) },
										disabled: busy,
										onChange: seat.mode === "draft" ? setPendingModel : void 0
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ContextMeter, {
										ctx,
										sessionId: toolSessionId
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
										label: t("askSend"),
										side: "top",
										delayMs: 500,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: ask_panel_module_css_default.primary,
											"aria-label": t("askSend"),
											disabled: question.trim() === "" || busy,
											onClick: () => {
												submit();
											},
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
												viewBox: "0 0 16 16",
												width: "16",
												height: "16",
												"aria-hidden": true,
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
													d: "M8.3125 0.980183C8.66767 1.0531 8.97902 1.20418 9.2627 1.43233C9.48724 1.61297 9.73029 1.85793 9.97949 2.10714L14.707 6.83468L13.293 8.24874L9 3.95577V15.0417H7V3.95577L2.70703 8.24874L1.29297 6.83468L6.02051 2.10714C6.26971 1.85793 6.51277 1.61297 6.7373 1.43233C6.97662 1.23986 7.28445 1.04402 7.6875 0.980183C7.8973 0.947006 8.1031 0.95516 8.3125 0.980183Z",
													fill: "currentColor"
												})
											})
										})
									})
								]
							})]
						})]
					}),
					phase === "error" && error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: ask_panel_module_css_default.error,
						children: t("errAskFailed", { detail: error })
					})
				]
			});
		}
		/** The streaming transcript (user right, assistant left; assistant is plain
		*  markdown). When the followed session is a fork child, the inherited parent
		*  history renders ABOVE the anchor divider — the divider sits at the child's
		*  own first message (the quote + question), which is also the initial
		*  scroll anchor. */
		function Transcript({ rows, running, anchorSeq, anchorRef, hasOlder, codeLabels }) {
			if (rows.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: ask_panel_module_css_default.emptyHint,
				children: t("askGenerating")
			});
			const lastIndex = rows.length - 1;
			let dividerPlaced = false;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: ask_panel_module_css_default.transcript,
				children: rows.map((row, index) => {
					const isAnchor = !dividerPlaced && anchorSeq !== null && row.seq > anchorSeq;
					if (isAnchor) dividerPlaced = true;
					const streaming = running && index === lastIndex && row.role === "assistant";
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						ref: isAnchor ? anchorRef : void 0,
						children: [isAnchor && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: ask_panel_module_css_default.seedDivider,
							children: hasOlder ? t("askSeedDividerMore") : t("askSeedDivider")
						}), row.role === "user" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UserRow, { text: row.text }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AssistantRow, {
							text: row.text,
							streaming,
							codeLabels
						})]
					}, row.seq);
				})
			});
		}
		/** One assistant message: raw markdown, no card (mirrors the main conversation). */
		function AssistantRow({ text, streaming, codeLabels }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: ask_panel_module_css_default.assistantRow,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: ask_panel_module_css_default.assistantMarkdown,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MarkdownText, {
						text,
						streaming,
						codeLabels
					})
				})
			});
		}
		/** One user message: strip the summary, render the quote as a blockquote, then the question. */
		function UserRow({ text }) {
			const { quote, question } = parseUserMessage(text);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: ask_panel_module_css_default.userRow,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: ask_panel_module_css_default.userContent,
					children: [quote !== null && quote !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("blockquote", {
						className: ask_panel_module_css_default.quoteBlock,
						children: quote
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: ask_panel_module_css_default.questionText,
						children: question
					})]
				})
			});
		}
		/** Resolve a session's display title (fallback to the id). */
		function titleOf$1(ctx, id) {
			try {
				const summary = ctx.sessions.list.getSnapshot().byId[id];
				if (summary?.displayTitle !== void 0 && summary.displayTitle !== "") return summary.displayTitle;
				if (summary?.title !== void 0 && summary.title !== "") return summary.title;
			} catch {}
			return id;
		}
		//#endregion
		//#region \0dsh-css:/home/rai/shiva-code/plugins/dsh-sidebar-qa/src/client/config-panel.module.css.mjs
		const css$2 = "._3Z1bvq_root,._3Z1bvq_rows{flex-direction:column;width:100%;display:flex}._3Z1bvq_row{border-bottom:1px solid var(--dsw-alias-border-l2);justify-content:space-between;align-items:center;gap:16px;padding:14px 2px;display:flex}._3Z1bvq_rows>:last-child{border-bottom:none}._3Z1bvq_rowText{flex-direction:column;gap:4px;min-width:0;display:flex}._3Z1bvq_title{color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px}._3Z1bvq_desc{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}._3Z1bvq_textInput,._3Z1bvq_numberInput,._3Z1bvq_select{font:inherit;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;flex:none;padding:5px 8px;font-size:13px;line-height:1.5}._3Z1bvq_textInput{width:200px}._3Z1bvq_numberInput{width:76px}._3Z1bvq_select{width:200px}._3Z1bvq_textInput:focus,._3Z1bvq_numberInput:focus,._3Z1bvq_select:focus{border-color:var(--dsw-alias-state-business-primary);outline:none}._3Z1bvq_loading{color:var(--dsw-alias-label-tertiary);padding:14px 2px;font-size:13px;line-height:20px}._3Z1bvq_error{color:var(--dsw-alias-state-error-primary);padding:10px 0 2px;font-size:12px;line-height:17px}";
		const tagId$2 = "dsh-sidebar-qa/config-panel.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-sidebar-qa";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		var config_panel_module_css_default = {
			"select": "_3Z1bvq_select",
			"root": "_3Z1bvq_root",
			"loading": "_3Z1bvq_loading",
			"error": "_3Z1bvq_error",
			"numberInput": "_3Z1bvq_numberInput",
			"row": "_3Z1bvq_row",
			"rows": "_3Z1bvq_rows",
			"rowText": "_3Z1bvq_rowText",
			"title": "_3Z1bvq_title",
			"textInput": "_3Z1bvq_textInput",
			"desc": "_3Z1bvq_desc"
		};
		//#endregion
		//#region src/client/ConfigPanel.tsx
		/**
		* The webview config panel for dsh-sidebar-qa, rendered inside better-sidebar's
		* settings gear popup (the "功能配置" entry on the 追问 tab card in the DSH
		* Settings → 侧边卡片 page). It edits the host's own `sidebarqa` settings
		* namespace through the revision-guarded /sidebarqa/api config routes — NOT
		* better-sidebar's pluginSettings blob — so the host summarize/title routes keep
		* reading the same live values the panel just wrote.
		*
		* Persistence mirrors the Side card settings rows: text rows commit on
		* blur/Enter; number rows parse + clamp to their declared range and revert to
		* the stored value on invalid input. Writes are serialized and revision-guarded;
		* a stale write reverts the optimistic row and shows an inline conflict message.
		*/
		/** Map one wire failure to an inline message (the conflict gets friendly copy). */
		function messageOf(error) {
			if (error instanceof Error && "code" in error && error.code === "settings-conflict") return t("errSaveConflict");
			return t("errSaveFailed", { detail: error instanceof Error ? error.message : String(error) });
		}
		/** One config row: a controlled input with a local draft committed on blur/Enter. */
		function FieldRow(props) {
			const { field, value, options, onCommit } = props;
			const [draft, setDraft] = (0, react.useState)(value);
			const number = field.type === "number";
			const select = field.type === "select" || field.type === "catalog";
			const commit = (raw) => {
				setDraft(onCommit(raw));
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: config_panel_module_css_default.row,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: config_panel_module_css_default.rowText,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: config_panel_module_css_default.title,
						children: field.label
					}), field.desc !== void 0 && field.desc !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: config_panel_module_css_default.desc,
						children: field.desc
					})]
				}), select ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
					className: config_panel_module_css_default.select,
					value: draft,
					"aria-label": field.label,
					onChange: (event) => {
						commit(event.currentTarget.value);
					},
					children: options?.map((option) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
						value: option.value,
						children: option.label
					}, option.value))
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					type: number ? "number" : "text",
					className: number ? config_panel_module_css_default.numberInput : config_panel_module_css_default.textInput,
					value: draft,
					min: field.min,
					max: field.max,
					step: 1,
					placeholder: field.placeholder,
					"aria-label": field.label,
					onChange: (event) => {
						setDraft(event.currentTarget.value);
					},
					onBlur: () => {
						commit(draft);
					},
					onKeyDown: (event) => {
						if (event.key === "Enter") event.currentTarget.blur();
					}
				})]
			});
		}
		/**
		* The config panel body. Mounted only while the gear popup is open, so it
		* re-reads the live config on every open and commits each row on blur/Enter.
		*/
		function ConfigPanel() {
			useLocaleRevision();
			const [config, setConfig] = (0, react.useState)(null);
			const [catalog, setCatalog] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(null);
			const configRef = (0, react.useRef)(null);
			const revisionRef = (0, react.useRef)(void 0);
			const dirtyRef = (0, react.useRef)(false);
			const inFlightRef = (0, react.useRef)(Promise.resolve());
			const update = (next) => {
				configRef.current = next;
				setConfig(next);
			};
			(0, react.useEffect)(() => {
				let cancelled = false;
				sidebarqaApi.configGet().then((view) => {
					if (cancelled) return;
					revisionRef.current = view.revision;
					if (dirtyRef.current) return;
					update(view.value ?? null);
				}).catch(() => {});
				sidebarqaApi.catalog().then((next) => {
					if (!cancelled) setCatalog(next);
				}).catch(() => {});
				return () => {
					cancelled = true;
				};
			}, []);
			/** Persist one patch (serialized, revision-guarded); revert on failure. */
			const commit = (patch) => {
				const previous = configRef.current;
				dirtyRef.current = true;
				const optimistic = {
					...previous ?? {},
					...patch
				};
				update(optimistic);
				setError(null);
				const run = inFlightRef.current.then(async () => {
					const view = await sidebarqaApi.configUpdate(patch, revisionRef.current);
					revisionRef.current = view.revision;
					const settled = view.value ?? optimistic;
					update(settled);
					return settled;
				});
				inFlightRef.current = run.then(() => void 0, () => void 0);
				run.catch((caught) => {
					update(previous);
					setError(messageOf(caught));
				});
			};
			/** Commit one row; return the canonical value the row should display. */
			const onCommit = (field, raw) => {
				const current = configRef.current;
				const fallback = String(current?.[field.key] ?? "");
				if (field.type === "number") {
					const clamped = coerceNumberField(raw, field.min, field.max);
					if (clamped === null) return fallback;
					commit({ [field.key]: clamped });
					return String(clamped);
				}
				if (field.type === "catalog" && field.source === "answerProvider") {
					const chosen = (catalog?.providers ?? []).find((provider) => provider.provider === raw);
					const previousModel = String(current?.answerModel ?? "");
					const nextModel = (chosen?.models.some((model) => model.id === previousModel) ?? false) || chosen === void 0 ? previousModel : chosen.models[0]?.id ?? previousModel;
					commit({
						answerProvider: raw,
						...nextModel === previousModel ? {} : { answerModel: nextModel }
					});
					return raw;
				}
				if (field.type === "catalog" && field.source === "summarizeProvider") {
					const providers = catalog?.providers ?? [];
					const previousModel = String(current?.summarizeModel ?? "");
					if (raw === "") {
						commit({ summarizeProvider: raw });
						return raw;
					}
					const chosen = providers.find((provider) => provider.provider === raw);
					const nextModel = (chosen?.models.some((model) => model.id === previousModel) ?? false) || chosen === void 0 ? previousModel : chosen.models[0]?.id ?? previousModel;
					commit({
						summarizeProvider: raw,
						...nextModel === previousModel ? {} : { summarizeModel: nextModel }
					});
					return raw;
				}
				commit({ [field.key]: raw });
				return raw;
			};
			if (config === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: config_panel_module_css_default.loading,
				children: t("cfgLoading")
			});
			const currentConfig = config;
			const optionsOf = (field) => {
				if (field.type !== "catalog") return field.options;
				const providers = catalog?.providers ?? [];
				const stored = String(currentConfig[field.key] ?? "");
				const source = field.source;
				const scoping = source === "answerModel" ? currentConfig.answerProvider : source === "summarizeModel" ? currentConfig.summarizeProvider : null;
				const base = scoping === null ? providerOptionsOf(providers, source ?? "") : source === "answerModel" && scoping === "" ? [] : modelOptionsOf(providers, scoping);
				return stored !== "" && !base.some((option) => option.value === stored) ? [...base, {
					value: stored,
					label: stored
				}] : base;
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: config_panel_module_css_default.root,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: config_panel_module_css_default.rows,
					children: configFields().map((field) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FieldRow, {
						field,
						value: String(currentConfig[field.key] ?? ""),
						options: optionsOf(field),
						onCommit: (raw) => onCommit(field, raw)
					}, `${field.key}:${String(currentConfig[field.key] ?? "")}`))
				}), error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: config_panel_module_css_default.error,
					role: "alert",
					children: error
				})]
			});
		}
		//#endregion
		//#region src/client/history-time.ts
		/**
		* Compact relative-time formatting for the 追问记录 (history) rows — the same
		* presentation as the DSH left (workspace browser) panel: a bucketed relative
		* label ("刚刚"/"5分钟"/… in zh, "now"/"5m"/… in en) computed from the session's
		* last-activity `updatedAt`. The label follows the DSH language through the
		* dependency-free `locales.ts` dictionary; the bucketing itself is locale-free.
		*
		* The bucketing mirrors `relativeTime` from @deepseek-ai/dsh-client-ui-workspace
		* (the left panel's source of truth), restated here so the client bundle stays
		* free of a value-import from another plugin package.
		*/
		const MIN = 6e4;
		const HOUR = 36e5;
		const DAY = 864e5;
		/** Bucket an epoch-ms `updatedAt` relative to `now` (both injected for pure rendering). */
		function relativeTime(updatedAt, now) {
			const diff = Math.max(0, now - updatedAt);
			if (diff < MIN) return {
				unit: "now",
				n: 0
			};
			if (diff < HOUR) return {
				unit: "minutes",
				n: Math.floor(diff / MIN)
			};
			if (diff < DAY) return {
				unit: "hours",
				n: Math.floor(diff / HOUR)
			};
			if (diff < 30 * DAY) return {
				unit: "days",
				n: Math.floor(diff / DAY)
			};
			if (diff < 365 * DAY) return {
				unit: "months",
				n: Math.floor(diff / (30 * DAY))
			};
			return {
				unit: "years",
				n: Math.floor(diff / (365 * DAY))
			};
		}
		/** The compact label ("刚刚" / "5分钟" / … in zh; "now" / "5m" / … in en) —
		*  mirror of the left panel row label. The en forms are unit abbreviations,
		*  which need no plural rules and fit the row chip better than "5 minutes". */
		function timeLabel(updatedAt, now) {
			const { unit, n } = relativeTime(updatedAt, now);
			switch (unit) {
				case "now": return t("timeNow");
				case "minutes": return t("timeMinutes", { n });
				case "hours": return t("timeHours", { n });
				case "days": return t("timeDays", { n });
				case "months": return t("timeMonths", { n });
				case "years": return t("timeYears", { n });
			}
		}
		//#endregion
		//#region \0dsh-css:/home/rai/shiva-code/plugins/dsh-sidebar-qa/src/client/history-panel.module.css.mjs
		const css$1 = ".UA8-8a_root{height:100%;color:var(--dsw-alias-label-primary);flex-direction:column;gap:10px;padding:12px;font-size:13px;display:flex;overflow-y:auto}.UA8-8a_empty{color:var(--dsw-alias-label-dimmed)}.UA8-8a_workspaceLabel{color:var(--dsw-alias-label-dimmed);word-break:break-word;padding:0 8px;font-size:12px}.UA8-8a_group{flex-direction:column;display:flex}.UA8-8a_mainRow{border-radius:6px;align-items:center;gap:8px;padding:6px 8px;display:flex}.UA8-8a_mainRow:hover{background:var(--dsw-alias-interactive-bg-hover)}.UA8-8a_sideRow{border-radius:6px;align-items:center;gap:6px;padding:5px 8px;display:flex}.UA8-8a_sideRow:hover{background:var(--dsw-alias-interactive-bg-hover)}.UA8-8a_rowOpen{appearance:none;min-width:0;color:inherit;text-align:left;cursor:pointer;background:0 0;border:none;flex:1;align-items:center;gap:8px;padding:0;font-size:13px;display:flex}.UA8-8a_dot{background:var(--dsw-alias-state-business-primary);border-radius:50%;flex:none;width:8px;height:8px}.UA8-8a_mainLabel{word-break:break-word;font-weight:600}.UA8-8a_sideLabel{color:var(--dsw-alias-state-business-primary);word-break:break-word}.UA8-8a_time{color:var(--dsw-alias-label-tertiary);white-space:nowrap;flex:none;font-size:12px;line-height:20px}.UA8-8a_collapse{appearance:none;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:4px;flex:none;justify-content:center;align-items:center;padding:2px;display:inline-flex}.UA8-8a_collapse:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.UA8-8a_collapseSpacer{flex:none;width:18px}.UA8-8a_arrow{transition:transform .15s var(--ds-ease-in-out);display:block}.UA8-8a_arrowOpen{transform:rotate(90deg)}.UA8-8a_children{border-left:1px solid var(--dsw-alias-border-l2);flex-direction:column;margin-left:12px;padding-left:10px;display:flex}.UA8-8a_connector{background:var(--dsw-alias-border-l2);flex:none;width:10px;height:1px}.UA8-8a_stale{opacity:.55}.UA8-8a_stale:hover{background:0 0}.UA8-8a_rowOpenDisabled{cursor:default}.UA8-8a_staleBadge{color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-interactive-bg-hover);white-space:nowrap;border-radius:8px;flex:none;padding:0 6px;font-size:11px;line-height:16px}.UA8-8a_remove{appearance:none;color:var(--dsw-alias-label-tertiary);cursor:pointer;white-space:nowrap;background:0 0;border:none;border-radius:4px;flex:none;padding:1px 6px;font-size:12px;line-height:18px}.UA8-8a_remove:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}";
		const tagId$1 = "dsh-sidebar-qa/history-panel.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-sidebar-qa";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var history_panel_module_css_default = {
			"sideRow": "UA8-8a_sideRow",
			"remove": "UA8-8a_remove",
			"workspaceLabel": "UA8-8a_workspaceLabel",
			"root": "UA8-8a_root",
			"group": "UA8-8a_group",
			"rowOpenDisabled": "UA8-8a_rowOpenDisabled",
			"mainRow": "UA8-8a_mainRow",
			"rowOpen": "UA8-8a_rowOpen",
			"collapseSpacer": "UA8-8a_collapseSpacer",
			"empty": "UA8-8a_empty",
			"dot": "UA8-8a_dot",
			"children": "UA8-8a_children",
			"connector": "UA8-8a_connector",
			"collapse": "UA8-8a_collapse",
			"stale": "UA8-8a_stale",
			"staleBadge": "UA8-8a_staleBadge",
			"sideLabel": "UA8-8a_sideLabel",
			"mainLabel": "UA8-8a_mainLabel",
			"arrowOpen": "UA8-8a_arrowOpen",
			"time": "UA8-8a_time",
			"arrow": "UA8-8a_arrow"
		};
		//#endregion
		//#region src/client/HistoryPanel.tsx
		/**
		* The `dsh-sidebar-qa:history` tab: every follow-up session grouped by its ROOT
		* (main) session, rendered as a layered tree (main → follow-up → nested
		* follow-up). Clicking a node jumps into it. The tree is driven by the
		* plugin's self-maintained parent→children mapping, restricted to the CURRENT
		* workspace: only sessions accounted in the workspace owning the active
		* session are shown (mirror of the DSH runtime's current-workspace projection
		* over the `workspaces` list, where each workspace carries its sessionIds).
		*
		* Rows with follow-ups (leaf nodes) carry a right-aligned fold button whose
		* chevron rotates with the collapse state, and the row's most recent activity
		* time to its left — the same compact relative label ("刚刚"/"5分钟"/…) the
		* DSH left (workspace browser) panel uses.
		*/
		/** How often the relative-time labels refresh while the tab is visible. */
		const NOW_TICK_MS = 6e4;
		function HistoryPanel({ ctx, store, scope, visible, bsStore, tab }) {
			const localeRevision = useLocaleRevision();
			const snapshot = (0, react.useSyncExternalStore)((cb) => store.subscribe(cb), () => store.getSnapshot());
			const tabId = tab.id;
			(0, react.useEffect)(() => {
				ctx.betterSidebar.updateTab(tabId, { title: t("histTabTitle") });
			}, [
				ctx,
				tabId,
				localeRevision
			]);
			(0, react.useEffect)(() => {
				if (bsStore === void 0) return;
				expandPanelIfCollapsed(bsStore);
				return onTabActivated(() => expandPanelIfCollapsed(bsStore));
			}, [bsStore]);
			const workspaceList = (0, react.useSyncExternalStore)((cb) => ctx.workspaces.list.subscribe(cb), () => ctx.workspaces.list.getSnapshot());
			const sessionList = (0, react.useSyncExternalStore)((cb) => ctx.sessions.list.subscribe(cb), () => ctx.sessions.list.getSnapshot());
			const [now, setNow] = (0, react.useState)(() => Date.now());
			(0, react.useEffect)(() => {
				if (!visible) return;
				const timer = window.setInterval(() => {
					setNow(Date.now());
				}, NOW_TICK_MS);
				return () => {
					window.clearInterval(timer);
				};
			}, [visible]);
			const currentSessionId = scope.sessionId !== "" ? scope.sessionId : sessionList.current;
			const currentWorkspace = currentSessionId === void 0 ? void 0 : workspaceOwningSession(workspaceList.items, currentSessionId);
			const parentToChildren = currentWorkspace === void 0 ? snapshot.parentToChildren : filterHistoryToWorkspace(snapshot.parentToChildren, new Set(currentWorkspace.sessionIds));
			const archivedIds = new Set(workspaceList.archivedSessionIds);
			const roots = rootsOf(parentToChildren);
			if (roots.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: history_panel_module_css_default.root,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: history_panel_module_css_default.empty,
					children: currentWorkspace === void 0 ? t("histEmptyAll") : t("histEmptyWorkspace")
				})
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: history_panel_module_css_default.root,
				role: "tree",
				"aria-label": t("histTabTitle"),
				children: [currentWorkspace !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: history_panel_module_css_default.workspaceLabel,
					children: t("histWorkspace", { name: currentWorkspace.title || currentWorkspace.workspaceId })
				}), roots.map((rootId) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TreeNode, {
					ctx,
					id: rootId,
					depth: 0,
					store,
					sessionList,
					now,
					parentToChildren,
					archivedIds
				}, rootId))]
			});
		}
		/** One tree node: the session row plus its recursive children. */
		function TreeNode(props) {
			const { ctx, id, depth, store, sessionList, now, parentToChildren, archivedIds } = props;
			const children = parentToChildren[id] ?? [];
			const isRoot = depth === 0;
			const hasChildren = children.length > 0;
			const collapsed = store.isCollapsed(id);
			const status = sessionStatus(id, sessionList.byId, archivedIds);
			const stale = status !== "live";
			const updatedAt = subtreeLatestUpdatedAt(id, parentToChildren, (sid) => sessionList.byId[sid]?.updatedAt);
			const time = updatedAt === void 0 ? void 0 : timeLabel(updatedAt, now);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: history_panel_module_css_default.group,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					role: "treeitem",
					"aria-level": depth + 1,
					"aria-expanded": hasChildren ? !collapsed : void 0,
					"aria-disabled": stale || void 0,
					className: `${isRoot ? history_panel_module_css_default.mainRow : history_panel_module_css_default.sideRow}${stale ? ` ${history_panel_module_css_default.stale}` : ""}`,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: stale ? `${history_panel_module_css_default.rowOpen} ${history_panel_module_css_default.rowOpenDisabled}` : history_panel_module_css_default.rowOpen,
							disabled: stale,
							onClick: () => {
								openConversation(ctx, id, sessionList.byId[id]?.cwd);
							},
							children: [
								isRoot && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: history_panel_module_css_default.dot }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: isRoot ? history_panel_module_css_default.mainLabel : history_panel_module_css_default.sideLabel,
									children: titleOf(ctx, id)
								}),
								stale && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: history_panel_module_css_default.staleBadge,
									children: status === "archived" ? t("histArchived") : t("histDeleted")
								})
							]
						}),
						time !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: history_panel_module_css_default.time,
							children: time
						}),
						stale ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: history_panel_module_css_default.remove,
							title: t("histRemoveTitle"),
							onClick: () => {
								store.removeSession(id);
							},
							children: t("commonRemove")
						}) : hasChildren ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: history_panel_module_css_default.collapse,
							"aria-label": collapsed ? t("histExpand") : t("histCollapse"),
							"aria-expanded": !collapsed,
							onClick: () => {
								store.toggleCollapsed(id);
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTriangleRightFill14, { className: collapsed ? history_panel_module_css_default.arrow : `${history_panel_module_css_default.arrow} ${history_panel_module_css_default.arrowOpen}` })
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: history_panel_module_css_default.collapseSpacer,
							"aria-hidden": "true"
						})
					]
				}), hasChildren && !collapsed && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					role: "group",
					className: history_panel_module_css_default.children,
					children: children.map((childId) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TreeNode, {
						ctx,
						id: childId,
						depth: depth + 1,
						store,
						sessionList,
						now,
						parentToChildren,
						archivedIds
					}, childId))
				})]
			});
		}
		/** Resolve a session's display title (fallback to the id). */
		function titleOf(ctx, id) {
			try {
				const summary = ctx.sessions.list.getSnapshot().byId[id];
				if (summary?.displayTitle !== void 0 && summary.displayTitle !== "") return summary.displayTitle;
				if (summary?.title !== void 0 && summary.title !== "") return summary.title;
			} catch {}
			return id;
		}
		/**
		* Jump into a conversation from the 追问记录 tree, keeping the 追问记录 tab
		* open in the TARGET session's sidebar state: `sessions.open` switches the
		* active conversation, then `betterSidebar.openTab(seed, scope)` lands the
		* tab in that session's state — focusing it if already open, creating it if
		* not — regardless of what tabs the target session had before (better-sidebar
		* v0.12+ targeted open; the tab is `single: true`, so the dedupe focuses).
		*/
		function openConversation(ctx, sessionId, cwd) {
			ctx.sessions.open(sessionId);
			ctx.betterSidebar.openTab({ type: "dsh-sidebar-qa:history" }, {
				sessionId,
				...cwd === void 0 ? {} : { cwd }
			});
		}
		/** Resolve the chat-anchor element owning a DOM node (text nodes → parent). */
		function chatAnchorOf(node) {
			const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
			if (element === null || typeof element.closest !== "function") return null;
			return element.closest("[data-chat-anchor-key]");
		}
		/** Whether the owning message is still streaming (unfinished). */
		function isStreaming(anchor) {
			return anchor.hasAttribute("data-streaming") || anchor.querySelector("[data-streaming]") !== null;
		}
		/** Derive the quoted_context role from the chat-flow kind. */
		function roleOfKind(kind) {
			return kind.toLowerCase().includes("user") ? "user" : "assistant";
		}
		/** Capture and validate the current window selection, or null when invalid. */
		function captureSelection(currentSessionId) {
			const sel = window.getSelection();
			if (sel === null || sel.isCollapsed || sel.rangeCount === 0) return null;
			const text = sel.toString();
			if (text.trim() === "" || text.length > 2e3) return null;
			const range = sel.getRangeAt(0);
			const startAnchor = chatAnchorOf(range.startContainer);
			const endAnchor = chatAnchorOf(range.endContainer);
			if (startAnchor === null || startAnchor !== endAnchor) return null;
			if (isStreaming(startAnchor)) return null;
			const kind = startAnchor.dataset.chatFlowKind ?? "";
			const anchorKey = startAnchor.dataset.chatAnchorKey;
			const rect = range.getBoundingClientRect();
			return {
				text,
				kind,
				anchorKey,
				rect: {
					left: rect.left,
					top: rect.top,
					width: rect.width,
					bottom: rect.bottom
				},
				sessionId: currentSessionId
			};
		}
		/** Debounce for selectionchange (ms). */
		const DEBOUNCE_MS = 200;
		/** Create one selection controller (call once per plugin activation). */
		function createSelectionController(getSessionId) {
			let selection = null;
			const listeners = /* @__PURE__ */ new Set();
			let debounceTimer;
			let state = { selection: null };
			const notify = () => {
				state = { selection };
				for (const fn of [...listeners]) fn();
			};
			const recompute = () => {
				const next = captureSelection(getSessionId());
				if (!(selection === null !== (next === null) || selection !== null && next !== null && (selection.text !== next.text || selection.anchorKey !== next.anchorKey || selection.sessionId !== next.sessionId || selection.kind !== next.kind))) return;
				selection = next;
				notify();
			};
			const onSelectionChange = () => {
				if (debounceTimer !== void 0) window.clearTimeout(debounceTimer);
				debounceTimer = window.setTimeout(recompute, DEBOUNCE_MS);
			};
			document.addEventListener("selectionchange", onSelectionChange);
			document.addEventListener("mouseup", recompute);
			document.addEventListener("keyup", onSelectionChange);
			return {
				getSnapshot: () => state,
				subscribe(fn) {
					listeners.add(fn);
					return () => {
						listeners.delete(fn);
					};
				},
				clear() {
					selection = null;
					notify();
				},
				dispose() {
					document.removeEventListener("selectionchange", onSelectionChange);
					document.removeEventListener("mouseup", recompute);
					document.removeEventListener("keyup", onSelectionChange);
					if (debounceTimer !== void 0) window.clearTimeout(debounceTimer);
				}
			};
		}
		//#endregion
		//#region \0dsh-css:/home/rai/shiva-code/plugins/dsh-sidebar-qa/src/client/selection-popover.module.css.mjs
		const css = ".AwtVfa_popover{z-index:2147483000;pointer-events:auto;position:fixed;transform:translate(-50%,-100%)}.AwtVfa_ask{appearance:none;border:1px solid var(--dsw-alias-state-business-primary);background:var(--dsw-alias-button-floating-fill);color:var(--dsw-alias-label-primary);cursor:pointer;border-radius:8px;padding:7px 12px;font-size:13px;line-height:1;box-shadow:0 4px 16px #00000059}.AwtVfa_ask:hover{background:var(--dsw-alias-button-floating-hover)}";
		const tagId = "dsh-sidebar-qa/selection-popover.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-sidebar-qa";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var selection_popover_module_css_default = {
			"ask": "AwtVfa_ask",
			"popover": "AwtVfa_popover"
		};
		//#endregion
		//#region src/client/SelectionPopover.tsx
		/**
		* The floating "提问" button shown over a validated selection. Rendered into
		* the plugin's own body host root; `onMouseDown` is prevented so clicking the
		* button never collapses the selection before it is captured.
		*/
		function SelectionPopover({ controller, onAsk }) {
			useLocaleRevision();
			const selection = (0, react.useSyncExternalStore)((cb) => controller.subscribe(cb), () => controller.getSnapshot()).selection;
			if (selection === null) return null;
			const { rect, text, kind, anchorKey, sessionId } = selection;
			const left = rect.left + rect.width / 2;
			const top = rect.top - 10;
			const ask = () => {
				const quote = {
					text,
					role: roleOfKind(kind),
					...anchorKey !== void 0 ? { messageId: anchorKey } : {}
				};
				controller.clear();
				onAsk(quote, sessionId);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: selection_popover_module_css_default.popover,
				style: {
					left,
					top
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: selection_popover_module_css_default.ask,
					onMouseDown: (event) => {
						event.preventDefault();
					},
					onMouseUp: (event) => {
						event.preventDefault();
					},
					onClick: (event) => {
						event.preventDefault();
						event.stopPropagation();
						ask();
					},
					children: t("askPopoverButton")
				})
			});
		}
		//#endregion
		//#region src/client/store.ts
		/**
		* Client store for dsh-sidebar-qa: the parent→children mapping between
		* follow-up (side) sessions and the session they were asked from (localStorage
		* persisted) plus the transient per-session pending quote. One instance per
		* plugin activation (created in apply(), never a module-level singleton).
		*
		* The mapping is the plugin's self-maintained lineage, generalized to support
		* NESTED follow-ups: a side session can itself be the parent of another side
		* session (select text inside a 追问 and ask again). A session is a "side
		* session" when it appears as a child; its root (main) session is reached by
		* walking the parent chain to the top.
		*/
		const STORAGE_KEY = "dsh-sidebar-qa:map";
		const TITLED_STORAGE_KEY = "dsh-sidebar-qa:titled";
		const COLLAPSED_STORAGE_KEY = "dsh-sidebar-qa:collapsed";
		/** Parse the persisted map, tolerating any corruption. */
		function loadMap() {
			try {
				const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
				if (raw === null || raw === void 0 || raw === "") return {};
				const parsed = JSON.parse(raw);
				if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return {};
				const out = {};
				for (const [key, value] of Object.entries(parsed)) if (Array.isArray(value)) out[key] = value.filter((item) => typeof item === "string");
				return out;
			} catch {
				return {};
			}
		}
		/** Persist the map (best-effort; localStorage may be unavailable). */
		function saveMap(map) {
			try {
				globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(map));
			} catch {}
		}
		/** Compute the reverse index from the forward map. */
		function reverseIndex(map) {
			const out = {};
			for (const [parentId, childIds] of Object.entries(map)) for (const childId of childIds) out[childId] = parentId;
			return out;
		}
		/** Parse the persisted titled-session set, tolerating any corruption. */
		function loadTitled() {
			try {
				const raw = globalThis.localStorage?.getItem(TITLED_STORAGE_KEY);
				if (raw === null || raw === void 0 || raw === "") return /* @__PURE__ */ new Set();
				const parsed = JSON.parse(raw);
				if (!Array.isArray(parsed)) return /* @__PURE__ */ new Set();
				return new Set(parsed.filter((item) => typeof item === "string"));
			} catch {
				return /* @__PURE__ */ new Set();
			}
		}
		/** Persist the titled-session set (best-effort; localStorage may be unavailable). */
		function saveTitled(sessions) {
			try {
				globalThis.localStorage?.setItem(TITLED_STORAGE_KEY, JSON.stringify([...sessions]));
			} catch {}
		}
		/** Parse the persisted collapsed-session set (追问记录 fold state), tolerating corruption. */
		function loadCollapsed() {
			try {
				const raw = globalThis.localStorage?.getItem(COLLAPSED_STORAGE_KEY);
				if (raw === null || raw === void 0 || raw === "") return /* @__PURE__ */ new Set();
				const parsed = JSON.parse(raw);
				if (!Array.isArray(parsed)) return /* @__PURE__ */ new Set();
				return new Set(parsed.filter((item) => typeof item === "string"));
			} catch {
				return /* @__PURE__ */ new Set();
			}
		}
		/** Persist the collapsed-session set (best-effort; localStorage may be unavailable). */
		function saveCollapsed(sessions) {
			try {
				globalThis.localStorage?.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify([...sessions]));
			} catch {}
		}
		/** Create one store instance (call once per plugin activation). */
		function createSidebarqaStore() {
			let parentToChildren = loadMap();
			let titledSessions = loadTitled();
			let collapsedSessions = loadCollapsed();
			let pendingBySession = {};
			const listeners = /* @__PURE__ */ new Set();
			let cachedSnapshot = null;
			const notify = () => {
				cachedSnapshot = null;
				for (const fn of [...listeners]) fn();
			};
			const subscribe = (fn) => {
				listeners.add(fn);
				return () => {
					listeners.delete(fn);
				};
			};
			const getSnapshot = () => {
				if (cachedSnapshot === null) cachedSnapshot = {
					parentToChildren,
					childToParent: reverseIndex(parentToChildren),
					pendingBySession
				};
				return cachedSnapshot;
			};
			return {
				getSnapshot,
				subscribe,
				setPendingQuote(sessionId, quote) {
					const next = { ...pendingBySession };
					if (quote === null) delete next[sessionId];
					else next[sessionId] = quote;
					pendingBySession = next;
					notify();
				},
				addChild(parentSessionId, childSessionId) {
					if (parentSessionId === "" || childSessionId === "") return;
					if (parentSessionId === childSessionId) return;
					const existing = parentToChildren[parentSessionId] ?? [];
					if (existing.includes(childSessionId)) return;
					const next = {
						...parentToChildren,
						[parentSessionId]: [...existing, childSessionId]
					};
					parentToChildren = next;
					saveMap(next);
					notify();
				},
				childrenOf(parentSessionId) {
					return parentToChildren[parentSessionId] ?? [];
				},
				parentOf(childSessionId) {
					return reverseIndex(parentToChildren)[childSessionId];
				},
				isSideSession(sessionId) {
					return reverseIndex(parentToChildren)[sessionId] !== void 0;
				},
				rootOf(sessionId) {
					let current = sessionId;
					const reverse = reverseIndex(parentToChildren);
					const seen = /* @__PURE__ */ new Set();
					while (reverse[current] !== void 0 && !seen.has(current)) {
						seen.add(current);
						current = reverse[current];
					}
					return current;
				},
				isTitled(sessionId) {
					return titledSessions.has(sessionId);
				},
				markTitled(sessionId) {
					if (titledSessions.has(sessionId)) return;
					const next = new Set(titledSessions);
					next.add(sessionId);
					titledSessions = next;
					saveTitled(titledSessions);
				},
				isCollapsed(sessionId) {
					return collapsedSessions.has(sessionId);
				},
				toggleCollapsed(sessionId) {
					const next = new Set(collapsedSessions);
					if (next.has(sessionId)) next.delete(sessionId);
					else next.add(sessionId);
					collapsedSessions = next;
					saveCollapsed(collapsedSessions);
					notify();
				},
				removeSession(sessionId) {
					if (sessionId === "") return;
					if (!(parentToChildren[sessionId] !== void 0 || Object.values(parentToChildren).some((children) => children.includes(sessionId)))) return;
					const subtree = subtreeIds(parentToChildren, sessionId);
					const next = removeSubtree(parentToChildren, sessionId);
					parentToChildren = next;
					saveMap(next);
					if (subtree.some((id) => titledSessions.has(id))) {
						const nextTitled = new Set(titledSessions);
						for (const id of subtree) nextTitled.delete(id);
						titledSessions = nextTitled;
						saveTitled(nextTitled);
					}
					if (subtree.some((id) => collapsedSessions.has(id))) {
						const nextCollapsed = new Set(collapsedSessions);
						for (const id of subtree) nextCollapsed.delete(id);
						collapsedSessions = nextCollapsed;
						saveCollapsed(nextCollapsed);
					}
					notify();
				}
			};
		}
		//#endregion
		//#region src/client/index.tsx
		/**
		* Client half of dsh-sidebar-qa: the selection-capture controller + floating
		* "提问" popover, and the two better-sidebar tabs (`dsh-sidebar-qa:ask` and
		* `dsh-sidebar-qa:history`). It is a thin consumer of dsh-better-sidebar — it
		* builds no panel chrome (portal/resize/折叠/persistence/settings shell);
		* the panel container is entirely better-sidebar's.
		*
		* The client requires the `betterSidebar` service (hard peer dependency):
		* `inject = ['betterSidebar', ...]` keeps the plugin inactive (no UI, no
		* behavior, no session creation) until better-sidebar provides it.
		*/
		/** Services required before mounting (provided by the client runtime; betterSidebar by dsh-better-sidebar). */
		const inject = [
			"betterSidebar",
			"sessions",
			"connection",
			"workspaces"
		];
		/**
		* Client plugin body.
		* @param ctx - the client cordis context (betterSidebar, sessions, connection, workspaces).
		*/
		function apply(ctx) {
			const store = createSidebarqaStore();
			const selectionController = createSelectionController(() => ctx.sessions.list.getSnapshot().current ?? "");
			ctx.inject(["locale"], (lctx) => {
				attachLocale(lctx.locale);
				lctx.effect(() => {
					try {
						const offZh = lctx.locale.register(LOCALE_NS, "zh", zh);
						const offEn = lctx.locale.register(LOCALE_NS, "en", en);
						return () => {
							offZh();
							offEn();
						};
					} catch (error) {
						console.warn("[dsh-sidebar-qa] locale registration failed:", error);
						return () => {};
					}
				}, "dsh-sidebar-qa: locale dictionaries");
				lctx.effect(() => () => {
					attachLocale(void 0);
				}, "dsh-sidebar-qa: locale detach");
			});
			const onAsk = (quote, sessionId) => {
				store.setPendingQuote(sessionId, quote);
				ctx.betterSidebar.openTab({ type: "dsh-sidebar-qa:ask" });
			};
			ctx.effect(() => {
				const host = document.createElement("div");
				host.setAttribute("data-dsh-sidebar-qa", "");
				document.body.appendChild(host);
				const root = (0, react_dom_client.createRoot)(host);
				root.render(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectionPopover, {
					controller: selectionController,
					onAsk
				}));
				return () => {
					root.unmount();
					host.remove();
				};
			}, "dsh-sidebar-qa: selection popover mount");
			ctx.effect(() => {
				const offAsk = ctx.betterSidebar.registerTab({
					id: "dsh-sidebar-qa:ask",
					title: () => t("askTabTitle"),
					icon: (size) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconQuestionOutline14, { size }),
					order: 60,
					single: true,
					settings: { render: () => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConfigPanel, {}) },
					component: (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AskPanel, {
						...props,
						bsStore: props.store,
						store
					}),
					onActivate: () => notifyTabActivated()
				});
				const offHistory = ctx.betterSidebar.registerTab({
					id: "dsh-sidebar-qa:history",
					title: () => t("histTabTitle"),
					icon: (size) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconQueueOutline14, { size }),
					order: 70,
					single: true,
					component: (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HistoryPanel, {
						...props,
						bsStore: props.store,
						store
					}),
					onActivate: () => notifyTabActivated()
				});
				return () => {
					offAsk();
					offHistory();
				};
			}, "dsh-sidebar-qa: register sidebar tabs");
			ctx.effect(() => () => {
				selectionController.dispose();
			}, "dsh-sidebar-qa: selection listeners");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map