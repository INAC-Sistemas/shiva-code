# Agent Note: client-modules reads BOM-prefixed package manifests

Status: implemented

## Problem

The Memory tab of `dsh-openviking` stopped appearing in the better-sidebar of the desktop app, although the active profile selected the plugin and its host half logged `[dsh-openviking] loaded`. The boot roster (`__DSH_BOOT__`) served every other plugin's `client.js` but not `dsh-openviking/client.js`, so nothing in the browser called `betterSidebar.registerTab`. `dsh-openviking@0.1.1` ships its `package.json` with a UTF-8 byte order mark. `ClientModuleRegistry.nearestPackage` parsed each candidate manifest with plain `JSON.parse`, which rejects the mark; its catch treats an unparsable manifest as "not the owner" and keeps walking, so the package resolved to no manifest and was dropped as "not a client row" with no warning. Node's module loader ignores the mark, which is why the host half loaded. The same defect in the inventory contributor was fixed in `649d9a0f36`.

## Decision

`packages/client/modules` parses manifests through one `readManifest` helper that strips a leading U+FEFF before `JSON.parse`, used both where the owning manifest is located and where its `dsh.client` declaration is read. The desktop consumes the published `0.1.2-alpha.4` build, so `desktop/patches/@deepseek-ai+dsh-client-modules+0.1.2-alpha.4.patch` carries the same change on `lib/index.js`, next to the fallback it already carried.

## Alternatives considered

Rewriting the `dsh-openviking` tarball without the mark would fix this one package and leave the next Windows-authored manifest to fail the same silent way.

## Consequences

A node-half spec writes a BOM-prefixed manifest and asserts that the package reaches the served graph; it fails on the previous parser.
