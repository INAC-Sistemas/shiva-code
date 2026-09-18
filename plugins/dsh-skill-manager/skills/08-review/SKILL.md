---
name: 08-review
description: Final gate — run the full verification of everything delivered against the epic artifacts, produce the cold-machine human walkthrough, and write the honest delivery report (verified vs not verified) as mds/epics/<epic>/08-review.md.
whenToUse: When every ticket from /07-build is human_test/done and delivery is next.
---

# Review & Handover

The requester trusts your "done" completely — that is why this skill exists. Read `/00-start-here` (the law of done and handover law) and apply it to the whole epic.

## Procedure

1. **Regressão completa (a única fase do épico em que ela existe)** — spawn de agentes com `role: "qa"` para escrever e rodar tudo o que o build adiou: suítes de segurança (bypass de rotas — percent-encoding, case, barras duplicadas, `..`; tokens forjados/expirados/`alg`-trocados; vazamento de campos sensíveis em **toda** rota), bateria de entradas inválidas nas rotas novas (campos faltando/extras, tipos errados), integridade de schema, e as suítes do repo. Qa escreve só em `testes/` e não toca em `src/` (o guard bloqueia). O resultado entra no relatório: achados → consertados com evidência, ou declarados.
2. **Gate de UI — mobile e motion, verificado visualmente** (antes do walkthrough humano):
   - **Mobile**, quando a superfície é usada no celular: percorra o checklist do `/ui-mobile` contra o navegador real em tamanho de telefone (e o aparelho, quando houver), **cada item com seu print** como evidência — tap highlight, altura dinâmica (`dvh`), input 16px, atraso de toque, overscroll, safe areas, hover gateado, `theme-color`. Emulação não é evidência; diga o que só o hardware confirma.
   - **Motion — inventário primeiro, depois a auditoria.** Antes de auditar, varra os arquivos entregues por `transition`, `animation`, `@keyframes`, `transform`, `:hover`, `:active` e movimento disparado por JS (toggle de classe, `animate(`, timeout que mexe em estilo) e monte **a lista de todo movimento da superfície** — o `transitions review` do `/ui-transitions` faz essa varredura e sugere o transition certo por site. Sem o inventário a auditoria depende de lembrar onde olhar — e o que se esquece nunca é auditado. Depois audite item por item contra o `/ui-motion`, **medindo com a instrumentação dele** quando um still não mostra (duração, propriedades, distância, opacidade, curva), e rode o `transitions refine`: trocar duração/easing soltos pelos tokens, **casando por uso** (valor sem uso correspondente fica listado e intocado). Escreva os achados como tabela `| Antes | Depois | Porquê |` (uma linha por problema). Conserte o que bloqueia e mantenha a tabela no relatório.
   - **Craft do protótipo**: o que foi congelado em `prototype.md` e construído não pode ter regredido — compare o print final com o aprovado no `/03-prototype` e registre divergências como achado, não como ajuste silencioso.
3. **Read the epic artifacts**: `01-brief.md` (outcome + Must Do), `02-flows.md` (every flow's happy + unhappy paths), `prototype.md` (frozen UX contract), `04-tech-plan.md` (decisions + boundaries).
4. **Verify outcome, not tickets**: each Must Do from the brief gets evidence — executed command, real output, or the exact reason it cannot be verified from here. A checked ticket whose evidence you cannot reproduce today counts as UNVERIFIED.
5. **Traceability sweep**: every UX id in `prototype.md` → working feature. Every boundary in the plan ("we will not do X") → still true.
6. **Full run from cold**: execute the start commands yourself with `bash`/`pwsh`/`terminal_*`, confirm the exact "working" signals, then write the walkthrough a human can follow from a cold machine (see shape). For a deployed deliverable, verify with the connection tools (`railway_cli`/`vercel_cli`/`supabase_cli` `status`) and open the real URL with `browser {op:'navigate'}` + `browser {op:'screenshot'}` — the screenshot is the evidence, not the deploy exit code.
7. **Write** `mds/epics/<epic>/08-review.md` (shape below) and present the delivery report in the requester's language: what is verified, what is not, what broke and was fixed, what they must test themselves.

The order is fixed: (1) regressão com qa → (2) gate de UI (mobile + motion, com prints) → (3) walkthrough humano com o app inteiro → (4) relatório honesto (verificado vs não verificado).

## Artifact shape

```markdown
---
epic: <slug>
artifact: 08-review
status: delivered
---
# Delivery review — <initiative>
## Outcome check (brief outcome → evidence per Must Do)
## UI gate (mobile checklist with prints · motion audit | Before | After | Why | · prototype craft not regressed)
## UX sweep (prototype.md → all screens verified, changes found and how they were handled)
## What I verified (each: how, when, output)
## What I could NOT verify (each: why, and exactly what the human should do)
## Human walkthrough (cold machine)
1. run `<command>` in `<dir>` → you will see <signal>
2. open <url/screen> → click <path> → expect <result>
3. <unhappy path> → expect <recovery>
## Findings during review (found → fixed? → evidence)
## Decisions taken without asking (none, or list + why)
```

## Rules

- Walkthrough steps you have not executed yourself are guesses — run each one first, now, not "earlier".
- Never write "it is running at X"; write how to start it and what "working" looks like.
- Honest partial delivery ("I could not verify C because …") keeps their trust; one false "done" spends it all.
- Anything broken found here: say it first, plainly, with the fix or the proposal — never let them discover it.
- After delivery, when something you shipped breaks: report it unprompted, with impact and plan.

## Suspect the deploy path, not the code

- Build passes + deploy fails with **no log** + retry fails the same way = suspect the **trigger path**, not the code. In one epic the GitHub-push deploy failed silently three times (build OK, container never started, zero logs) while `railway up` of the same code succeeded. Prove the start locally against the real database, and use `railway up --service <svc>` as the workaround, telling the owner.
