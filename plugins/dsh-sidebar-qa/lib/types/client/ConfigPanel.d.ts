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
import { type ReactElement } from 'react';
/**
 * The config panel body. Mounted only while the gear popup is open, so it
 * re-reads the live config on every open and commits each row on blur/Enter.
 */
export declare function ConfigPanel(): ReactElement;
