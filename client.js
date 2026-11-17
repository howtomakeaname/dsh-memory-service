window.__ModuleLoader__.load({
  id: "dsh-memory-service",
  factory(require) {
    const React = require("react");
    const h = React.createElement;
    let ui = {};
    try { ui = require("@deepseek-ai/dsh-client-ui-primitives") || {}; } catch { ui = {}; }
    const icon = (name, size) => { const C = ui[name]; return C ? h(C, { size: size || 14 }) : null; };
    const Button = ui.Button;
    const Input = ui.Input;
    const Tag = ui.Tag;
    const SegmentedTabs = ui.SegmentedTabs;
    const DisclosureRow = ui.DisclosureRow;
    const TextShimmer = ui.TextShimmer;
    const Modal = ui.Modal;

    function action(label, props, iconName) {
      if (Button) return h(Button, { size: "sm", ...props, icon: iconName ? icon(iconName) : undefined }, label);
      const { variant, ...rest } = props || {};
      return h("button", { className: "dms_btn " + (variant === "primary" ? "primary" : ""), ...rest }, iconName ? icon(iconName) : null, " ", label);
    }
    function iconButton(label, props, iconName) {
      if (Button) return h(Button, { size: "sm", variant: "ghost", ...props, icon: icon(iconName), "aria-label": label, title: label });
      return h("button", { className: "dms_btn", "aria-label": label, title: label, ...props }, iconName ? icon(iconName) : null);
    }
    function Dropdown({ value, options, onChange, label }) {
      if (!ui.Menu || !ui.MenuItemButton || !Button) {
        return h("select", { className: "dms_select", value, "aria-label": label, onChange: (event) => onChange(event.target.value) }, options.map((item) => h("option", { key: item.value, value: item.value }, item.label)));
      }
      const [open, setOpen] = React.useState(false);
      const current = options.find((item) => item.value === value) || options[0];
      return h(ui.Menu, {
        open,
        onClose: () => setOpen(false),
        align: "start",
        portal: true,
        autoFocus: true,
        anchor: h(Button, {
          type: "button", size: "sm", variant: "outline", "aria-label": label,
          "aria-haspopup": "menu", "aria-expanded": open,
          onClick: () => setOpen((next) => !next),
          onKeyDown: (event) => { if (!open && event.key === "ArrowDown") { event.preventDefault(); setOpen(true); } }
        }, h("span", { className: "dms_dropdownLabel" }, current ? current.label : ""), icon("IconChevronDownOutlineRegular", 12))
      }, options.map((item) => h(ui.MenuItemButton, {
        key: item.value,
        onSelect: () => { onChange(item.value); setOpen(false); }
      }, item.label)));
    }
    function textField(props) {
      const { icon: leading, ...rest } = props || {};
      if (Input) return h(Input, { ...rest, icon: leading });
      return h("input", { className: "dms_input", ...rest });
    }
    function tag(label, tone) { return Tag ? h(Tag, { tone: tone || "outline" }, label) : h("span", { className: "dms_tag" }, label); }
    function shimmer(label) { return TextShimmer ? h(TextShimmer, null, label) : h("span", null, label); }

    const NS = "memory-service";
    const API = "/memory-service/api";
    const STYLE_ID = "dsh-memory-service/page";
    const TYPES = ["convention", "preference", "feedback", "project", "reference", "fact", "user"];
    const TYPE_ICONS = {
      convention: "IconChecklistOutlineRegular", preference: "IconUserOutlineRegular",
      feedback: "IconInfoOutlineRegular", project: "IconDatabaseOutlineRegular",
      reference: "IconBrowseOutlineRegular", fact: "IconInfoOutlineRegular", user: "IconUserOutlineRegular"
    };
    const zh = {
      section: "记忆", title: "记忆服务", description: "管理 DSH 的长期记忆：按作用域查看、搜索、新增、编辑、遗忘，并处理捕获队列。",
      workspace: "当前工作区", workspaceShort: "工作区", allShort: "全部", global: "全局", all: "全部工作区", search: "搜索", searchPlaceholder: "搜索标题、描述或正文…",
      refresh: "刷新", flush: "处理队列", newMemory: "新增记忆", loading: "加载中…", empty: "没有匹配的记忆。",
      emptyHint: "试试换一个作用域，或新增一条记忆。", formHint: "保存一条可跨会话复用的记忆。", edit: "编辑", delete: "遗忘", save: "保存", cancel: "取消",
      back: "返回列表", titleField: "标题", descriptionField: "一句话描述", bodyField: "正文", typeField: "类型", scopeField: "作用域",
      revision: "版本", updated: "更新于", id: "ID", copyId: "复制 ID", copied: "已复制",
      confirmDelete: "确定遗忘这条记忆？", error: "操作失败", conflict: "版本冲突：内容已被其他会话修改，请重试。",
      queue: "捕获队列", pending: "待处理", failed: "失败", notes: "笔记", active: "有效", conflicts: "冲突", claudeImport: "从 Claude Code 导入", claudeImportTitle: "导入 Claude Code 记忆", claudeImportDesc: "选择 Claude Code 的 memory 目录，导入到当前工作区或全局；重复导入会跳过未变化项。", claudeProject: "Claude 项目", claudeImportScope: "导入到", claudeNotes: "条记忆", claudeImportAction: "开始导入", claudeImporting: "导入中…", claudeNoSources: "没有找到 Claude Code memory 目录。", claudeSummary: "导入结果", imported: "新增", updated: "更新", skipped: "跳过", importConflicts: "冲突", importErrors: "错误", forceImport: "覆盖本地修改",
      extractor: "模型抽取", on: "开启", off: "关闭", allScopes: "全部", detail: "记忆详情", conflictShort: "冲突", status: "状态", showConflicts: "只看冲突", allMemories: "全部记忆", resolveKeep: "保留此版本", conflictWith: "冲突对象", resolved: "已解决", argumentsLabel: "参数", resultLabel: "结果", errorLabel: "错误",
      sourceRefs: "来源", noDescription: "（无描述）", noBody: "（无正文）", memory: "记忆",
      toolSearch: "搜索记忆", toolSave: "保存记忆", toolGet: "读取记忆", toolUpdate: "更新记忆",
      toolForget: "遗忘记忆", toolFlush: "处理捕获队列", toolConflicts: "查看记忆冲突",
      toolResolve: "解决记忆冲突", toolStats: "记忆统计"
    };
    const en = {
      section: "Memory", title: "Memory service", description: "Manage DSH long-term memory: browse, search, create, edit and forget by scope; drain the capture queue.",
      workspace: "Current workspace", workspaceShort: "Workspace", allShort: "All", global: "Global", all: "All workspaces", search: "Search", searchPlaceholder: "Search title, description or body…",
      refresh: "Refresh", flush: "Drain queue", newMemory: "New memory", loading: "Loading…", empty: "No matching memories.",
      emptyHint: "Try another scope, or create a memory.", formHint: "Save a durable memory for future sessions.", edit: "Edit", delete: "Forget", save: "Save", cancel: "Cancel",
      back: "Back to list", titleField: "Title", descriptionField: "One-line description", bodyField: "Body", typeField: "Type", scopeField: "Scope",
      revision: "Revision", updated: "Updated", id: "ID", copyId: "Copy ID", copied: "Copied",
      confirmDelete: "Forget this memory?", error: "Operation failed", conflict: "Revision conflict: another session changed this memory. Reload and retry.",
      queue: "Capture queue", pending: "pending", failed: "failed", notes: "notes", active: "active", conflicts: "conflicts", claudeImport: "Import from Claude Code", claudeImportTitle: "Import Claude Code memories", claudeImportDesc: "Choose a Claude Code memory directory and import it into the current workspace or global memory. Re-imports skip unchanged entries.", claudeProject: "Claude project", claudeImportScope: "Import to", claudeNotes: "memories", claudeImportAction: "Import", claudeImporting: "Importing…", claudeNoSources: "No Claude Code memory directory found.", claudeSummary: "Import result", imported: "added", updated: "updated", skipped: "skipped", importConflicts: "conflicts", importErrors: "errors", forceImport: "Overwrite local edits",
      extractor: "Model extraction", on: "on", off: "off", allScopes: "all", detail: "Memory detail", conflictShort: "Conflicts", status: "Status", showConflicts: "Conflicts", allMemories: "All memories", resolveKeep: "Keep this version", conflictWith: "Conflicts with", resolved: "Resolved", argumentsLabel: "Arguments", resultLabel: "Result", errorLabel: "Error",
      sourceRefs: "Sources", noDescription: "(no description)", noBody: "(empty body)", memory: "Memory",
      toolSearch: "Search memory", toolSave: "Save memory", toolGet: "Read memory", toolUpdate: "Update memory",
      toolForget: "Forget memory", toolFlush: "Drain capture queue", toolConflicts: "Memory conflicts",
      toolResolve: "Resolve memory conflict", toolStats: "Memory stats"
    };
    const TOOL_LABELS = {
      memory_search: "toolSearch", memory_save: "toolSave", memory_get: "toolGet", memory_update: "toolUpdate",
      memory_forget: "toolForget", memory_flush: "toolFlush", memory_conflicts: "toolConflicts",
      memory_resolve: "toolResolve", memory_stats: "toolStats"
    };
    const TOOL_ICONS = {
      memory_search: "IconSearchOutlineRegular", memory_save: "IconPlusOutlineRegular", memory_get: "IconBrowseOutlineRegular",
      memory_update: "IconEditOutlineRegular", memory_forget: "IconTrashOutlineRegular", memory_flush: "IconDatabaseOutlineRegular",
      memory_conflicts: "IconInfoOutlineRegular", memory_resolve: "IconCheckCircleOutlineRegular", memory_stats: "IconDataOutlineRegular"
    };

    function installStyle() {
      if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = [
        ".dms_page{display:flex;flex-direction:column;gap:14px;color:var(--dsw-alias-label-primary,#e6e6e6);}",
        ".dms_head{display:flex;flex-direction:column;gap:4px;}.dms_title{font-size:19px;line-height:26px;font-weight:600;}.dms_desc{font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary,#aaa);}",
        ".dms_summary{display:flex;gap:14px;flex-wrap:wrap;align-items:center;padding:10px 12px;border:1px solid var(--dsw-alias-border-l2,#333);border-radius:8px;background:var(--dsw-alias-bg-layer-1,#181818);}",
        ".dms_metric{display:flex;gap:5px;align-items:baseline;font-size:12px;color:var(--dsw-alias-label-tertiary,#888);}.dms_metric b{font-size:14px;color:var(--dsw-alias-label-primary,#eee);font-weight:600;}",
        ".dms_controls{display:flex;flex-direction:column;gap:10px;}",
        ".dms_toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}.dms_filters{display:flex;gap:8px;align-items:center;flex-wrap:wrap;min-width:0;}.dms_actions{margin-left:auto;display:flex;gap:4px;align-items:center;padding-left:10px;border-left:1px solid var(--dsw-alias-border-l2,#333);}.dms_scope{width:250px;flex:none;min-width:210px;}.dms_dropdownLabel{max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}",
        ".dms_toolbar .dms_search{min-width:230px;flex:1;}",
        ".dms_input,.dms_select,.dms_textarea{background:var(--dsw-alias-bg-layer-3,#222);color:inherit;border:1px solid var(--dsw-alias-border-l2,#333);border-radius:6px;padding:7px 9px;font:inherit;}",
        ".dms_input{box-sizing:border-box;width:100%;}.dms_textarea{min-height:150px;width:100%;box-sizing:border-box;resize:vertical;font-size:13px;line-height:20px;}",
        ".dms_select{padding:6px 8px;}.dms_btn{cursor:pointer;border:1px solid var(--dsw-alias-border-l2,#333);background:var(--dsw-alias-bg-layer-3,#222);color:inherit;border-radius:6px;padding:7px 11px;font:inherit;}",
        ".dms_list{display:flex;flex-direction:column;gap:8px;}.dms_row{width:100%;display:flex;gap:10px;align-items:flex-start;text-align:left;cursor:pointer;border:1px solid var(--dsw-alias-border-l2,#333);border-radius:8px;padding:11px 12px;background:var(--dsw-alias-bg-layer-1,#181818);color:inherit;font:inherit;}",
        ".dms_row:hover{background:var(--dsw-alias-interactive-bg-hover,#242424);}.dms_rowIcon{width:22px;height:22px;flex:none;display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-secondary,#aaa);}",
        ".dms_rowMain{min-width:0;flex:1;display:flex;flex-direction:column;gap:4px;}.dms_rowTitle{font-size:14px;line-height:20px;font-weight:600;color:var(--dsw-alias-label-primary,#eee);}",
        ".dms_rowDesc{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary,#aaa);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}",
        ".dms_rowMeta{display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:11px;color:var(--dsw-alias-label-tertiary,#888);}",
        ".dms_detail{display:flex;flex-direction:column;gap:14px;border:1px solid var(--dsw-alias-border-l2,#333);border-radius:8px;background:var(--dsw-alias-bg-layer-1,#181818);padding:16px;}",
        ".dms_detailTop{display:flex;gap:8px;align-items:center;justify-content:space-between;}.dms_detailTitle{font-size:17px;line-height:24px;font-weight:600;overflow-wrap:anywhere;}",
        ".dms_detailActions{display:flex;gap:6px;align-items:center;flex:none;}.dms_meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:12px;color:var(--dsw-alias-label-tertiary,#888);}",
        ".dms_detailDesc{font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary,#aaa);}",
        ".dms_body{font-size:13px;line-height:21px;color:var(--dsw-alias-label-primary,#ddd);white-space:pre-wrap;overflow-wrap:anywhere;border-top:1px solid var(--dsw-alias-border-l2,#333);padding-top:12px;}",
        ".dms_detailFoot{font-size:11px;line-height:18px;color:var(--dsw-alias-label-tertiary,#888);word-break:break-all;}",
        ".dms_form{display:flex;flex-direction:column;gap:10px;border:1px solid var(--dsw-alias-border-l2,#333);border-radius:8px;padding:14px;background:var(--dsw-alias-bg-layer-1,#181818);}",
        ".dms_field{display:flex;flex-direction:column;gap:5px;font-size:12px;color:var(--dsw-alias-label-secondary,#aaa);}.dms_formRow{display:flex;gap:10px;flex-wrap:wrap;}",
        ".dms_conflict{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;border:1px solid var(--dsw-alias-state-error-primary,#e74c3c);border-radius:6px;padding:9px 10px;background:var(--dsw-alias-bg-layer-3,#222);font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary,#bbb);}",
        ".dms_import{display:flex;flex-direction:column;gap:12px;}.dms_check{display:flex;gap:8px;align-items:center;font-size:12px;color:var(--dsw-alias-label-secondary,#aaa);}.dms_importSummary{display:flex;flex-direction:column;gap:7px;border-top:1px solid var(--dsw-alias-border-l2,#333);padding-top:10px;font-size:12px;color:var(--dsw-alias-label-secondary,#bbb);}",
        ".dms_error{color:var(--dsw-alias-state-error-primary,#e74c3c);font-size:13px;line-height:19px;}.dms_empty{display:flex;flex-direction:column;gap:6px;align-items:center;padding:42px 12px;color:var(--dsw-alias-label-tertiary,#888);text-align:center;border:1px dashed var(--dsw-alias-border-l2,#333);border-radius:8px;}",
        ".dms_empty b{font-size:14px;color:var(--dsw-alias-label-secondary,#aaa);font-weight:500;}.dms_emptyIcon{opacity:.7;}",
        ".dms_toolBody{display:flex;flex-direction:column;gap:8px;padding:8px 0 2px 26px;}.dms_toolLabel{font-size:11px;color:var(--dsw-alias-label-tertiary,#888);}.dms_toolPre{margin:0;padding:8px 10px;border-radius:6px;background:var(--dsw-alias-bg-layer-3,#222);color:var(--dsw-alias-label-secondary,#ccc);font-size:11px;line-height:17px;white-space:pre-wrap;overflow-wrap:anywhere;max-height:260px;overflow:auto;}",
        "@media (max-width:720px){.dms_scope{width:100%;min-width:0;}.dms_filters{width:100%;}.dms_actions{margin-left:0;border-left:none;padding-left:0;}.dms_detailTop{align-items:flex-start;flex-direction:column;}.dms_detailActions{flex-wrap:wrap;}.dms_summary{gap:10px 14px;}.dms_search{min-width:0;}}",
        ".dms_toolTitle{display:flex;gap:6px;align-items:center;min-width:0;}.dms_toolSummary{color:var(--dsw-alias-label-tertiary,#888);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}"
      ].join("");
      document.head.appendChild(style);
    }

    async function api(method, payload) {
      const response = await fetch(API + "/" + method, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload || {}) });
      const body = await response.json().catch(() => null);
      if (!response.ok || body?.ok !== true) throw new Error(body?.error?.message || ("HTTP " + response.status));
      return body.value;
    }

    function fmtDate(value) {
      if (!value) return "";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return String(value);
      return date.toLocaleString(undefined, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    }
    function scopeLabel(value, t) { return value === "global" ? t("global") : value === "all" ? t("all") : t("workspace"); }
    function typeIcon(type) { return icon(TYPE_ICONS[type] || "IconDatabaseOutlineRegular", 14); }
    function toolsSummary(args) {
      if (!args || typeof args !== "object") return "";
      return String(args.query || args.title || args.text || args.id || args.winnerId || args.key || "").slice(0, 100);
    }
    function parseArgs(block) {
      const raw = block?.argsRaw || block?.call?.argsRaw || "";
      if (!raw) return null;
      try { return JSON.parse(raw); } catch { return null; }
    }
    function outputText(block) {
      if (!block) return "";
      if (Array.isArray(block.content)) return block.content.filter((part) => part && part.type === "text").map((part) => part.text || "").join("\n");
      return block.output || "";
    }

    function createToolRow(t) {
      return function MemoryToolRow({ toolName, block, useDisclosure, phase }) {
        const disclosure = useDisclosure();
        const args = parseArgs(block);
        const output = outputText(block);
        const summary = toolsSummary(args);
        const title = t(TOOL_LABELS[toolName] || "memory") + (summary ? " · " + summary : "");
        const failed = block?.isError === true || Boolean(block?.error);
        const expandable = Boolean(args || output || failed);
        const children = h("div", { className: "dms_toolBody" },
          args ? h("div", null, h("div", { className: "dms_toolLabel" }, t("argumentsLabel")), h("pre", { className: "dms_toolPre" }, JSON.stringify(args, null, 2))) : null,
          output ? h("div", null, h("div", { className: "dms_toolLabel" }, failed ? t("errorLabel") : t("resultLabel")), h("pre", { className: "dms_toolPre" }, output.slice(0, 8000))) : null);
        return h(DisclosureRow, {
          icon: icon(TOOL_ICONS[toolName] || "IconSparkleRegular", 14),
          title,
          open: disclosure.expanded,
          expandable,
          onToggle: disclosure.toggle,
          running: phase === "preparing" || phase === "start",
          expandOnRowClick: true,
          children
        });
      };
    }

    function createPage(t) {
      return function MemoryPage() {
        const [status, setStatus] = React.useState(null);
        const [items, setItems] = React.useState([]);
        const [scope, setScope] = React.useState("workspace");
        const [query, setQuery] = React.useState("");
        const [loading, setLoading] = React.useState(true);
        const [error, setError] = React.useState("");
        const [draft, setDraft] = React.useState(null);
        const [selectedId, setSelectedId] = React.useState(null);
        const [copied, setCopied] = React.useState(false);
        const [onlyConflicts, setOnlyConflicts] = React.useState(false);
        const [claudeOpen, setClaudeOpen] = React.useState(false);
        const [claudeSources, setClaudeSources] = React.useState([]);
        const [claudeSource, setClaudeSource] = React.useState("");
        const [claudeImportScope, setClaudeImportScope] = React.useState("workspace");
        const [claudeForce, setClaudeForce] = React.useState(false);
        const [claudeBusy, setClaudeBusy] = React.useState(false);
        const [claudeSummary, setClaudeSummary] = React.useState(null);
        const [claudeError, setClaudeError] = React.useState("");

        const selected = items.find((item) => item.id === selectedId) || null;

        const load = React.useCallback(async (nextScope, nextQuery) => {
          setLoading(true); setError("");
          try {
            const [state, rows] = await Promise.all([
              api("state"),
              nextQuery ? api("search", { query: nextQuery, scope: nextScope, limit: 50 }) : api("list", { scope: nextScope, allScopes: nextScope === "all" })
            ]);
            setStatus(state); setItems(rows || []);
            if (selectedId && !(rows || []).some((row) => row.id === selectedId)) setSelectedId(null);
          } catch (failure) { setError(String(failure.message || failure)); }
          finally { setLoading(false); }
        }, [selectedId]);

        React.useEffect(() => { void load(scope, ""); }, [scope, load]);
        const submitSearch = (event) => { event.preventDefault(); setOnlyConflicts(false); void load(scope, query.trim()); };
        const refresh = () => { setOnlyConflicts(false); void load(scope, query.trim()); };
        const openClaudeImport = async () => {
          setClaudeOpen(true); setClaudeBusy(true); setClaudeError(""); setClaudeSummary(null);
          try {
            const sources = await api("claudeDiscover");
            setClaudeSources(sources || []);
            setClaudeSource((sources && sources[0] && sources[0].source) || "");
            setClaudeImportScope(scope === "global" ? "global" : "workspace");
          } catch (failure) { setClaudeError(String(failure.message || failure)); }
          finally { setClaudeBusy(false); }
        };
        const runClaudeImport = async () => {
          if (!claudeSource || claudeBusy) return;
          setClaudeBusy(true); setClaudeError(""); setClaudeSummary(null);
          try {
            const summary = await api("claudeImport", { source: claudeSource, scope: claudeImportScope, force: claudeForce });
            setClaudeSummary(summary);
            await load(scope, query.trim());
          } catch (failure) { setClaudeError(String(failure.message || failure)); }
          finally { setClaudeBusy(false); }
        };
        const showConflicts = async () => {
          if (onlyConflicts) { setOnlyConflicts(false); void load(scope, query.trim()); return; }
          setLoading(true); setError("");
          try { setStatus(await api("state")); setItems(await api("conflicts", { scope: scope === "all" ? "all" : scope })); setSelectedId(null); setOnlyConflicts(true); }
          catch (failure) { setError(String(failure.message || failure)); }
          finally { setLoading(false); }
        };
        const flush = async () => { setError(""); try { await api("flush"); refresh(); } catch (failure) { setError(String(failure.message || failure)); } };
        const back = () => setSelectedId(null);
        const openDetail = (item) => { setSelectedId(item.id); setDraft(null); };
        const startNew = () => { setSelectedId(null); setDraft({ id: "", title: "", description: "", body: "", type: "fact", scope: scope === "global" ? "global" : "workspace", revision: null }); };
        const startEdit = (item) => setDraft({ id: item.id, title: item.title, description: item.description, body: item.body, type: item.type, scope: item.scope === "global" ? "global" : "workspace", revision: item.revision });
        const forget = async (item) => { if (!window.confirm(t("confirmDelete") + " #" + item.id)) return; try { await api("forget", { id: item.id, scope: item.scope === "global" ? "global" : "workspace" }); setSelectedId(null); refresh(); } catch (failure) { setError(String(failure.message || failure)); } };
        const save = async () => {
          if (!draft || !draft.body.trim()) return;
          setError("");
          try {
            const base = { title: draft.title, description: draft.description, body: draft.body, type: draft.type, scope: draft.scope };
            const result = draft.id ? await api("update", { ...base, id: draft.id, expectedRevision: draft.revision }) : await api("save", base);
            if (result && result.conflict) { setError(t("conflict")); setDraft({ ...draft, revision: result.latest.revision }); return; }
            const savedId = result?.note?.id || draft.id;
            setDraft(null);
            await load(scope, query.trim());
            if (savedId) setSelectedId(savedId);
          } catch (failure) { setError(String(failure.message || failure)); }
        };
        const copyId = async (id) => {
          try { await navigator.clipboard.writeText(id); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch { /* ignore */ }
        };
        const resolveSelected = async (item) => {
          const peers = String(item?.metadata?.conflict_with || "").split(",").map((id) => id.trim()).filter(Boolean);
          if (!peers.length) return;
          setError("");
          try {
            await api("resolve", { winnerId: item.id, loserIds: peers, scope: item.scope === "global" ? "global" : "workspace" });
            setOnlyConflicts(false);
            await load(scope, query.trim());
            setSelectedId(item.id);
          } catch (failure) { setError(String(failure.message || failure)); }
        };

        const scopeItems = [
          { value: "workspace", label: t("workspaceShort"), id: "dms-scope-workspace" },
          { value: "global", label: t("global"), id: "dms-scope-global" },
          { value: "all", label: t("allShort"), id: "dms-scope-all" }
        ];

        const metric = (label, value) => h("span", { className: "dms_metric", key: label }, h("b", null, String(value == null ? "—" : value)), label);
        const toolbar = h("div", { className: "dms_toolbar" },
          h("div", { className: "dms_search" }, textField({ value: query, placeholder: t("searchPlaceholder"), icon: icon("IconSearchOutlineRegular"), onChange: (event) => setQuery(event.target.value) })),
          action(t("search"), { type: "submit", variant: "primary" }, "IconSearchOutlineRegular"));
        const toolbar2 = h("div", { className: "dms_toolbar" },
          h("div", { className: "dms_filters" },
            h("div", { className: "dms_scope" }, SegmentedTabs ? h(SegmentedTabs, { items: scopeItems, value: scope, onChange: (value) => { setScope(value); setSelectedId(null); }, label: t("scopeField"), size: "sm" }) : h("select", { className: "dms_select", value: scope, onChange: (event) => setScope(event.target.value) }, scopeItems.map((item) => h("option", { key: item.value, value: item.value }, item.label)))),
            (status?.conflicts || 0) > 0 ? action(onlyConflicts ? t("allMemories") : t("conflictShort") + " " + status.conflicts, { type: "button", onClick: showConflicts, variant: onlyConflicts ? "primary" : "ghost" }, "IconInfoOutlineRegular") : null),
          h("div", { className: "dms_actions" },
            iconButton(t("claudeImport"), { type: "button", onClick: openClaudeImport }, "IconDownloadOutlineRegular"),
            iconButton(t("refresh"), { type: "button", onClick: refresh }, "IconRefreshOutlineRegular"),
            iconButton(t("flush"), { type: "button", onClick: flush }, "IconDatabaseOutlineRegular"),
            iconButton(t("newMemory"), { type: "button", onClick: startNew }, "IconPlusOutlineRegular")));

        const summary = status ? h("div", { className: "dms_summary" },
          metric(t("notes"), status.notes), metric(t("active"), status.active), metric(t("conflicts"), status.conflicts || 0),
          metric(t("pending"), status.capture?.pending || 0), metric(t("failed"), status.capture?.failed || 0),
          tag(t("extractor") + ": " + (status.extractor ? t("on") : t("off")), status.extractor ? "success" : "neutral")) : null;

        const visibleItems = onlyConflicts ? items : items.filter((item) => item.status === "active");
        const list = loading ? h("div", { className: "dms_desc" }, shimmer(t("loading"))) :
          visibleItems.length === 0 ? h("div", { className: "dms_empty" }, h("span", { className: "dms_emptyIcon" }, icon("IconDatabaseOutlineRegular", 24)), h("b", null, onlyConflicts ? t("resolved") : t("empty")), h("span", null, onlyConflicts ? t("emptyHint") : t("emptyHint"))) :
          h("div", { className: "dms_list" }, visibleItems.map((item) => h("button", { type: "button", className: "dms_row", key: item.id, onClick: () => openDetail(item) },
            h("span", { className: "dms_rowIcon" }, typeIcon(item.type)),
            h("span", { className: "dms_rowMain" },
              h("span", { className: "dms_rowTitle" }, item.title || item.id),
              h("span", { className: "dms_rowDesc" }, item.description || item.body || t("noDescription")),
              h("span", { className: "dms_rowMeta" }, tag(item.type), tag(item.scope), item.status !== "active" ? tag(t("status") + ": " + item.status, "error") : null, h("span", null, t("updated") + " " + fmtDate(item.updatedAt)))))));

        const detail = selected ? h("div", { className: "dms_detail" },
          h("div", { className: "dms_detailTop" },
            h("div", { className: "dms_detailActions" }, action(t("back"), { type: "button", variant: "ghost", onClick: back }, "IconChevronLeftOutlineRegular")),
            h("div", { className: "dms_detailActions" },
              action(copied ? t("copied") : t("copyId"), { type: "button", variant: "ghost", onClick: () => copyId(selected.id) }, copied ? "IconCheckOutlineRegular" : "IconCopyOutlineRegular"),
              action(t("edit"), { type: "button", variant: "ghost", onClick: () => startEdit(selected) }, "IconEditOutlineRegular"),
              action(t("delete"), { type: "button", variant: "ghost", onClick: () => forget(selected) }, "IconTrashOutlineRegular"))),
          h("div", { className: "dms_detailTitle" }, selected.title || selected.id),
          h("div", { className: "dms_meta" }, tag(selected.type), tag(selected.scope), selected.status !== "active" ? tag(t("status") + ": " + selected.status, selected.status === "conflicted" ? "error" : "neutral") : null, h("span", null, t("revision") + " " + selected.revision), h("span", null, t("updated") + " " + fmtDate(selected.updatedAt))),
          selected.status === "conflicted" ? h("div", { className: "dms_conflict" }, h("span", null, t("conflictWith") + ": " + String(selected.metadata?.conflict_with || "")), action(t("resolveKeep"), { type: "button", variant: "primary", onClick: () => resolveSelected(selected) }, "IconCheckCircleOutlineRegular")) : null,
          selected.description ? h("div", { className: "dms_detailDesc" }, selected.description) : null,
          h("div", { className: "dms_body" }, selected.body || t("noBody")),
          h("div", { className: "dms_detailFoot" }, t("id") + ": " + selected.id + (selected.sourceRefs && selected.sourceRefs.length ? " · " + t("sourceRefs") + ": " + selected.sourceRefs.join(", ") : ""))) : null;

        const form = draft ? h("div", { className: "dms_form" },
          h("div", { className: "dms_head" }, h("div", { className: "dms_title" }, draft.id ? t("edit") : t("newMemory")), h("div", { className: "dms_desc" }, t("formHint"))),
          h("label", { className: "dms_field" }, t("titleField"), textField({ value: draft.title, onChange: (event) => setDraft({ ...draft, title: event.target.value }) })),
          h("label", { className: "dms_field" }, t("descriptionField"), textField({ value: draft.description, onChange: (event) => setDraft({ ...draft, description: event.target.value }) })),
          h("label", { className: "dms_field" }, t("bodyField"), h("textarea", { className: "dms_textarea", value: draft.body, onChange: (event) => setDraft({ ...draft, body: event.target.value }) })),
          h("div", { className: "dms_formRow" },
            h("label", { className: "dms_field" }, t("typeField"), h(Dropdown, { value: draft.type, options: TYPES.map((type) => ({ value: type, label: type })), onChange: (value) => setDraft({ ...draft, type: value }), label: t("typeField") })),
            h("label", { className: "dms_field" }, t("scopeField"), h(Dropdown, { value: draft.scope, options: [{ value: "workspace", label: t("workspace") }, { value: "global", label: t("global") }], onChange: (value) => setDraft({ ...draft, scope: value }), label: t("scopeField") }))),
          h("div", { className: "dms_toolbar" }, action(t("save"), { type: "button", onClick: save, variant: "primary", icon: icon("IconCheckOutlineRegular") }), action(t("cancel"), { type: "button", onClick: () => setDraft(null), variant: "ghost" }))) : null;

        const claudeOptions = claudeSources.map((item) => ({ value: item.source, label: (item.project || item.source) + " · " + item.notes + " " + t("claudeNotes") }));
        const claudeImportBody = h("div", { className: "dms_import" },
          claudeError ? h("div", { className: "dms_error" }, claudeError) : null,
          claudeBusy ? h("div", { className: "dms_desc" }, shimmer(t("claudeImporting"))) :
            claudeSources.length === 0 ? h("div", { className: "dms_empty" }, icon("IconDownloadOutlineRegular", 24), h("b", null, t("claudeNoSources"))) :
              h(React.Fragment, null,
                h("label", { className: "dms_field" }, t("claudeProject"), h(Dropdown, { value: claudeSource, options: claudeOptions, onChange: setClaudeSource, label: t("claudeProject") })),
                h("label", { className: "dms_field" }, t("claudeImportScope"), h(Dropdown, { value: claudeImportScope, options: [{ value: "workspace", label: t("workspace") }, { value: "global", label: t("global") }], onChange: setClaudeImportScope, label: t("claudeImportScope") })),
                h("label", { className: "dms_check" }, h("input", { type: "checkbox", checked: claudeForce, onChange: (event) => setClaudeForce(event.target.checked) }), t("forceImport")),
                claudeSummary ? h("div", { className: "dms_importSummary" },
                  h("b", null, t("claudeSummary")),
                  h("div", { className: "dms_meta" }, tag(t("imported") + " " + claudeSummary.imported), tag(t("updated") + " " + claudeSummary.updated), tag(t("skipped") + " " + claudeSummary.skipped), tag(t("importConflicts") + " " + claudeSummary.conflicts, claudeSummary.conflicts ? "error" : "outline")),
                  claudeSummary.errors && claudeSummary.errors.length ? h("div", { className: "dms_error" }, claudeSummary.errors.slice(0, 3).join("\n")) : null) : null));
        const claudeDialog = claudeOpen ? (Modal ? h(Modal, {
          open: true,
          onClose: () => setClaudeOpen(false),
          title: t("claudeImportTitle"),
          closeLabel: t("cancel"),
          description: t("claudeImportDesc"),
          footer: h("div", { className: "dms_toolbar" },
            action(t("cancel"), { type: "button", onClick: () => setClaudeOpen(false), variant: "ghost" }),
            action(claudeBusy ? t("claudeImporting") : t("claudeImportAction"), { type: "button", onClick: runClaudeImport, variant: "primary", disabled: claudeBusy || !claudeSource }, "IconDownloadOutlineRegular"))
        }, claudeImportBody) : h("div", { className: "dms_form" }, claudeImportBody)) : null;
        return h("div", { className: "dms_page" },
          h("div", { className: "dms_head" }, h("div", { className: "dms_title" }, t("title")), h("div", { className: "dms_desc" }, t("description"))),
          summary,
          h("form", { className: "dms_controls", onSubmit: submitSearch }, toolbar, toolbar2),
          error ? h("div", { className: "dms_error" }, error) : null,
          form || detail || list,
          claudeDialog);
      };
    }

    installStyle();
    return {
      inject: ["slots", "locale"],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-memory-service: dictionaries");
        const t = ctx.locale.bind(NS);
        const Page = createPage(t);
        const ToolRow = createToolRow(t);
        ctx.slots.inject("settings.section", () => ctx.slots.register({ name: "settings.section", id: "memory-service", order: 70, label: () => t("section") }, Page));
        ctx.slots.inject("tool.call.toolview", function* () {
          for (const key of Object.keys(TOOL_LABELS)) yield ctx.slots.register({ name: "tool.call.toolview", key, locale: NS }, ToolRow);
        });
      }
    };
  }
});
