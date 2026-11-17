# Changelog

## 0.1.1

- Settings memory page with master list and drill-down detail view.
- Keyed tool.call.toolview cards for all memory_* tools.
- Reuses DSH Button, Input, Tag, SegmentedTabs, DisclosureRow, official icons and design tokens.
- Grouped toolbar and DSH Menu-based type/scope dropdowns.
- Settings UI for discovering and importing Claude Code memory directories.
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
