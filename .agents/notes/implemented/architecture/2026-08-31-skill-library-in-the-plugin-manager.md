# Agent Note: the shared skill library lives in the plugin library

Status: implemented

## Problem

A skill is the complete instruction block that drives an agent — the product's own process skills (`00-start-here` … `10-profiles`, `find-skills`) are what turn the harness into `shiva`. They shipped as plain `SKILL.md` files inside `plugins/dsh-skill-manager/skills/`, versioned in the repository, with nothing between the file and anyone who received the plugin package.

Two facts framed the work. First, that folder reached nobody: no `customSkillDirs` pointed at it, and the `dsh-skill-manager` actually mounted in the `web` profile is the published `^0.1.3`, which has no `skills/` folder and scans `$DSH_HOME/skills` and `~/.agents/skills` instead. The eleven skills were invisible to the model and unreachable from the tab that manages skills. Second, there was no surface to add a skill at all without editing a file and redistributing a plugin.

Both point the same way, and the repository's own split already said where: the client runs the shell, the plugin library runs the intelligence. A skill *is* intelligence.

## Decision

The skills live in `plugin-manager` as `LibrarySkill` rows, cadastered through a **Skills** page in the dashboard, and served to the client by `dsh-skill-library`, a new Service Provider on the existing `ctx.skills` seam.

Neither the registry nor the `skill` tool changed. `SkillProvider.list` already documents that "remote initialization, authentication, and discovery are awaited inside this method" — a fourth provider next to `filesystem`, `dsh-badge` and `runtime` is the shape the seam was built for.

Reads are open to every authenticated session; writes are `ADMIN` only. The read routes never branch on role, deliberately: "any valid token reads the same library" is the rule, and a `403` there would be a new rule rather than a refinement.

### The gate is `get()`, not the catalog

The registry caches candidates but never caches a definition — every `ctx.skills.get()` calls the winning provider. So the provider resolves the signed-in session **inside `get()`, per call, never cached**, and a candidate discovered while signed in cannot produce a body after a sign-out. `tests/registry.spec.ts` proves exactly that against the real `SkillRegistry`: warm the catalog while signed in, drop the session, and the cached candidate still yields no instructions.

The body is never written to disk and never memoized on the provider instance. A memo would be a resident copy outliving the session that was allowed to read it, which is the same thing as no gate at all.

Signing in or out invalidates the catalog through `credentials/record-updated` on the `dsh-login/session` key, so the model's catalog gains or loses the library's entries at the next agent step. Without it the consumer would keep republishing a catalog naming skills that can no longer load.

### Authoritative absence versus transient failure

`list()` splits on one question: is this fact decidable without leaving the machine?

No credential store, nobody signed in, an expired session, an unreadable record — all authoritative, all a **complete** empty catalog. An unreachable library, a 5xx, a malformed body, a rejected session — all **incomplete** observations, uncached, retried on the next step.

The split is not cosmetic. Reporting "incomplete" for the signed-out case would hold `snapshot.complete` false on every read for as long as nobody is signed in, which freezes the consumer's catalog *and* disables the registry's discovery cache for the local provider too — a regression paid by a plugin that did nothing wrong.

A 401 from the library is reported and not acted on: retiring the local session there would let a transient upstream fault wipe a good one. The browser's revalidation owns that, as it already does for `dsh-vps-status`.

### Rank 50

Library candidates outrank every local root (`project-dsh` is 100). The shipped names are guessable, and a same-named file dropped in a workspace would replace audited instructions with arbitrary ones while the catalog still showed the original description.

The cost is real and accepted: those eleven names cannot be shadowed locally at all, so forking one means renaming it. `rank` is a `Config` field, so a deployment wanting the opposite policy changes a line rather than a constant.

### Where the client half lives

`plugins/dsh-skill-library/`, not `packages/skill/skill-library/`. The provider needs `resolveLoginAuthorization` from `dsh-login`, which is a `plugins/*` member. Every `packages/<group>/<pkg>` is a release member that `scripts/check-workspace-constraints.ts` requires to be publicly published; such a package depending on `dsh-login` would publish a dependency on a name this repository never publishes, and the constraint checker would not catch it because its member set is built only from the globs that exclude `plugins/`. It would break at the consumer's install. Two plugins already import `dsh-login/vps-auth`; no package under `packages/` references `plugins/`.

## Alternatives considered

**Ship the bodies in the catalog.** One request instead of two, and the requirement permits memory-only bodies. Rejected: discovery reruns on the agent's step boundary, so the whole library would ride the most frequent call — and separating them is what makes `get()` the natural place the token is demanded.

**Keep the local filesystem provider unmounted so the library is the only source.** Rejected: the user's own skills under `.agents/skills` are theirs, and taking them away is a different decision from protecting the product's.

**Full `upsert` in the seed.** Rejected outright. The seed runs on every container start, so updating would silently revert every edit made in the panel. It creates and never updates; `--force-skills` overwrites, and being an explicit gesture is the point.

**`resourceBase: { kind: 'url' }`.** Rejected: the shipped skills carry no companion files, and a URL base tells the model to resolve relative paths against an endpoint that answers 401 to anything without the bearer this plugin holds. `opaque` says the truth — there are no companion files.

**Store the YAML frontmatter as text.** Rejected: the columns *are* the frontmatter, so the client receives typed fields and needs no YAML parser at a wire boundary.

## Consequences

A skill can be published from the panel and is live for every signed-in client at their next agent step, with no plugin release. The bodies never touch a client disk.

The trust story changed and must be said plainly: `renderSkillContent` embeds a body **verbatim, without escaping**, justified by skills being trusted local content. The body now arrives over the network, so the premise becomes "authored by whoever can write to the library". **Anyone who gains `role: ADMIN` on the plugin manager gains arbitrary text injection into every authenticated agent's context** — the same power as editing a `SKILL.md` today, with the radius of every client instead of one machine. The write path and the transport are what protect it: `ADMIN`-only actions, and `resolveEndpoint` refusing plain http off loopback.

Read access is open to every authenticated user, so any signed-in account can `curl` the whole library. "Never touches disk" prevents accidental leakage and stops bodies from becoming editable files; it is not DRM against a determined authenticated reader.

There is no offline mode. When the library is unreachable its skills are simply absent — all or nothing, by the same decision that keeps them off disk.

Two defects surfaced on the way. `03-prototype/SKILL.md` was invalid YAML (an unquoted `CDN-first:` inside `description`), so it would have failed the harness's own parser too; it is quoted now. And the root `.gitignore`'s `lib/` pattern was swallowing `plugin-manager/src/lib/`, which would have left new source files silently out of a commit; `plugin-manager/.gitignore` re-includes it.

## Deferred

Per-user or per-role entitlement on reads. The schema carries no owner column, and adding one later is an additive migration.

Managing library skills from the `dsh` side — the `dsh-skill-manager` tab still manages only local roots, and the eleven no longer appear there. Removing that stalled v0.1.0 fork from the repository is its own decision, since what runs is the published `0.1.3`.

Snapshot coverage. The model-visible surfaces (`<available_skills>`, `<skill_content>`) already have snapshots and this change alters neither render, and no example mounts a plugin from `plugins/` — so the root snapshot gate does not reach this work. Left as an open question for review rather than papered over.
