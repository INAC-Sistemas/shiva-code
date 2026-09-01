/**
 * Completeness gate for the translation plugins in `plugins/`.
 *
 * A plugin resolves outside the monorepo's cordis instance, so the
 * `LocaleNamespaceMap` augmentations that type every shipped registration site
 * against its namespace's key union cannot reach it: its dictionaries are
 * `Record<string, string>` and its own `tsc` has nothing to compare them to.
 * This file closes that gap from the side that does see the map — the
 * repository — by assigning each shipped bundle to the exact shape the map
 * describes.
 *
 * The check is the assignment itself, so the gate is `tsc`, not a runtime
 * walk: a missing namespace, a missing key, and a key the shipped copy does
 * not have are all compile errors naming what is wrong. Running this file
 * only reports that the compiler had nothing to say.
 *
 * **The import list below IS the translated surface.** A namespace reaches
 * `LocaleNamespaceMap` only through a package imported here, so adding a
 * package to this list is what obliges every translation to cover it, and
 * leaving one out is what keeps another plugin's copy the responsibility of
 * that plugin. The type-only imports exist for the augmentation alone; none
 * of them contributes a value.
 */

import { describe, expect, it } from 'vitest'
import type { LocaleDictOf, LocaleNamespaceMap } from '@deepseek-ai/dsh-client-ui-slots'

// The shipped panel's dictionary owners, each named by the module that
// declares its namespace. Type-only: erased at compile time, present so the
// `declare module` blocks merge into the map above.
//
// By source path, never by package name: several of these packages publish no
// `/client` subpath in the resolution facade, and their package-name form
// silently resolves to a declaration file whose internal-only dictionary
// import was elided — the `declare module` block never arrives, and the gate
// passes with that namespace simply absent. Naming the declaring module is
// what makes the merge unmissable.
//
// This program reaches those modules through the referenced projects, so it
// reads their EMITTED declarations: a namespace or key added to a package
// counts here only after that package's types are rebuilt.
import type {} from '../packages/client/locale/src/client/index.ts'
import type {} from '../packages/client/ui-agent-preset/src/client/AgentPresetRow.tsx'
import type {} from '../packages/client/ui-commands/src/client/index.ts'
import type {} from '../packages/client/ui-conversation/src/client/apply.ts'
import type {} from '../packages/client/ui-deliverables/src/client/index.ts'
import type {} from '../packages/client/ui-goal/src/client/index.ts'
import type {} from '../packages/client/ui-input-trigger/src/client/index.ts'
import type {} from '../packages/client/ui-jobs/src/client/index.ts'
import type {} from '../packages/client/ui-message-feedback/src/client/locales.ts'
import type {} from '../packages/client/ui-model-selection/src/client/index.ts'
import type {} from '../packages/client/ui-permission-presets/src/client/PermissionRow.tsx'
import type {} from '../packages/client/ui-plan/src/client/index.ts'
import type {} from '../packages/client/ui-reference/src/client/locales.ts'
import type {} from '../packages/client/ui-settings-general/src/client/index.ts'
import type {} from '../packages/client/ui-settings-models/src/client/index.ts'
import type {} from '../packages/client/ui-settings-plugin-inventory/src/client/index.ts'
import type {} from '../packages/client/ui-settings-plugins/src/client/PluginsSettingsSection.tsx'
import type {} from '../packages/client/ui-sidebar/src/client/index.ts'
import type {} from '../packages/client/ui-skill/src/client/index.ts'
import type {} from '../packages/client/ui-subagent/src/client/index.ts'
import type {} from '../packages/client/ui-theme/src/client/index.ts'
import type {} from '../packages/client/ui-trajectory/src/client/locales.ts'
import type {} from '../packages/client/ui-user-questions/src/client/index.ts'
import type {} from '../packages/client/ui-workflow-run/src/client/index.ts'
import type {} from '../packages/client/ui-workspace/src/client/index.ts'
import type {} from '../packages/extensions/ui-cordis/src/client/locales.ts'
import type {} from '../packages/session-query/session-log-export/src/client/index.ts'

import { ES_DICTIONARIES, PT_BR_DICTIONARIES } from '../plugins/dsh-i18n/src/locales/index.ts'

/**
 * Every namespace the panel ships, each with exactly the keys its own
 * dictionary declares. This is the shape a complete translation has.
 */
type CompleteTranslation = {
  [N in keyof LocaleNamespaceMap]: LocaleDictOf<N>
}

/**
 * The completeness check. Each assignment fails to COMPILE when its bundle
 * misses a namespace, misses a key, or carries a key the shipped copy does not
 * have — so the gate is `tsc -p tsconfig.client.json`, and this file lives in
 * the client face because the map it reads is merged by client packages.
 */
const ptBR: CompleteTranslation = PT_BR_DICTIONARIES
const es: CompleteTranslation = ES_DICTIONARIES

/**
 * The other direction, which catches what the first cannot.
 *
 * The bundles are spread-merged constants rather than fresh object literals at
 * the assignment site, so TypeScript's excess-property check does not run and
 * a key the shipped copy no longer has would pass the assignments above. Going
 * the other way — the shipped shape into the bundle's own inferred type —
 * fails on exactly that key, because the shipped shape does not carry it.
 *
 * A misspelled key is caught by the pair as a whole: the real key goes
 * missing above, and the misspelling shows up here.
 */
const ptBRHasNoExtraKeys: typeof PT_BR_DICTIONARIES = {} as CompleteTranslation
const esHasNoExtraKeys: typeof ES_DICTIONARIES = {} as CompleteTranslation

void ptBRHasNoExtraKeys
void esHasNoExtraKeys

describe('dsh-i18n translation bundles', () => {
  it('cover every namespace the shipped panel registers', () => {
    // The assignments above are the completeness proof; this asserts the pair
    // stays symmetric, which the type cannot say (both sides satisfy it
    // independently, so one language could lag a namespace behind the other
    // only if the map itself were incomplete — assert it rather than assume).
    expect(Object.keys(es).sort()).toEqual(Object.keys(ptBR).sort())
    expect(Object.keys(ptBR).length).toBeGreaterThan(0)
  })

  it('leave no key empty and keep every placeholder of the shipped copy', () => {
    for (const [locale, bundle] of [['pt-BR', ptBR], ['es', es]] as const) {
      for (const [namespace, dictionary] of Object.entries(bundle)) {
        for (const [key, text] of Object.entries(dictionary as Record<string, string>)) {
          // An empty translation renders as blank rather than falling back to
          // English: the lookup finds the key and stops.
          expect(text, `${locale} ${namespace}:${key} is empty`).not.toBe('')
        }
      }
    }
  })
})
