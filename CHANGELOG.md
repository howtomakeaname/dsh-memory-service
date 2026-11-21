# Changelog

## 0.3.0

- Memory manager promoted from a Settings section to a first-class left-sidebar panel: `sidebar.panellist` entry plus a `main` keyed page.
- Updated panel, detail, and Claude Code import screenshots for the sidebar shell.
- Client injection now targets the DSH layout and sidebar packages instead of the Settings package.
- Workspace scope now exposes real memory workspaces and sends explicit `workspace:<id>` scopes; it no longer falls back to `workspace:default` silently.
- Memory page layout now follows the Plugins/Tasks page shell: 28px top inset, 48px inline inset, 960px content column, shared-width header/summary/content.
- Workspace scope is now a DSH-style workspace tree; opening the panel from a Session follows that Session's workspace, with a latest-workspace fallback.
- Refined the page toolbar to one compact row and replaced the tree card with a borderless sidebar-style rail.
- New/edit memory scope picker now shows workspace title, full path, and the selected check in a DSH-style Menu, matching the native workspace selector.
- Search now runs as you type with a 260ms debounce and a clear button; the separate Search button is gone.
- Forget confirmation now uses the shared DSH Modal with cancel/confirm actions and busy/error states.
- Added a list/nebula toggle: the nebula view renders memories as a constellation with conflict, supersede, shared-key, source and cluster links, search highlighting, hover previews and click-through detail.

## 0.2.0

- Claude Code import flow: multi-select workspaces and global memory, preview all entries, edit title/description/body/type/scope, import only selected entries.
- Dedicated Memory settings nav icon (`IconContextInjectionOutlineRegular`) instead of the generic settings glyph.
- Import modal widened and source/entry layout cleaned up.
- Simplified settings and import copy (`管理 DeepSeek Harness 的各项记忆`, `从 Claude Code 导入各项记忆。`).
- 50 tests, CI green.

## 0.1.1

- Settings memory page with master list and drill-down detail view.
- Keyed tool.call.toolview cards for all memory_* tools.
- Reuses DSH Button, Input, Tag, SegmentedTabs, DisclosureRow, official icons and design tokens.
- Grouped toolbar and DSH Menu-based type/scope dropdowns.
- Settings UI for discovering multiple Claude Code memory directories, previewing and editing entries, and importing selected workspace/global memories.
- Memory conflict filter and in-detail resolution.
- Real DSH Web screenshots for settings, detail, conflict and tool card.

## 0.1.0

- Markdown-first long-term memory store with global/workspace scopes, revisions, supersede and hard/soft forget.
- SQLite FTS5 derived index with Markdown hydration and rebuild.
- DSH plugin: memory_search/save/get/update/forget/flush/conflicts/resolve/stats, pre-step recall injection, session capture.
- Durable capture queue and optional model-guided extraction with evidence/confidence checks.
- Semantic conflict detection and resolution.
- Claude Code memory import/export adapter.
- CLI: init/list/search/get/upsert/forget/rebuild/flush/doctor/backup/restore/import-claude/export-claude.
- Settings-page client using DSH slots, primitives, official icons and design tokens, with memory drill-down detail and keyed memory tool-call views.
- Schema version with v1→v2 migration, backup/restore, cross-process write lock, CI and package gates.
