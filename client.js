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
    const Checkbox = ui.Checkbox;
    const Tooltip = ui.Tooltip;

    function action(label, props, iconName) {
      if (Button) return h(Button, { size: "sm", ...props, icon: iconName ? icon(iconName) : undefined }, label);
      const { variant, ...rest } = props || {};
      return h("button", { className: "dms_btn " + (variant === "primary" ? "primary" : ""), ...rest }, iconName ? icon(iconName) : null, " ", label);
    }
    function iconButton(label, props, iconName) {
      const control = Button
        ? h(Button, { size: "sm", variant: "ghost", ...props, icon: icon(iconName), "aria-label": label }, label)
        : h("button", { className: "dms_btn", "aria-label": label, title: label, ...props }, iconName ? icon(iconName) : null);
      return Tooltip ? h(Tooltip, { label, side: "bottom", delayMs: 250, portal: true }, control) : control;
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
    function WorkspaceScopeDropdown({ value, options, onChange, label, emptyLabel }) {
      const [open, setOpen] = React.useState(false);
      const current = options.find((item) => item.value === value);
      if (!ui.Menu || !ui.MenuItemButton || !Button) {
        return h("select", { className: "dms_select", value, "aria-label": label, onChange: (event) => onChange(event.target.value) },
          options.map((item) => h("option", { key: item.value, value: item.value }, item.title)));
      }
      return h(ui.Menu, {
        open, onClose: () => setOpen(false), align: "start", portal: true, autoFocus: true,
        listClassName: "dms_wsMenu",
        anchor: h(Button, {
          type: "button", size: "sm", variant: "outline", "aria-label": label, "aria-haspopup": "menu", "aria-expanded": open,
          title: current?.path || undefined,
          onClick: () => setOpen((next) => !next)
        }, h("span", { className: "dms_workspacePickLabel" }, current ? current.title : emptyLabel), icon("IconChevronDownOutlineRegular", 12))
      }, options.map((item) => h(ui.MenuItemButton, {
        key: item.value,
        onSelect: () => { onChange(item.value); setOpen(false); }
      }, h("span", { className: "dms_wsOption" },
        h("span", { className: "dms_wsOptionText" },
          h("span", { className: "dms_wsOptionTitle" }, item.title),
          item.path ? h("span", { className: "dms_wsOptionPath" }, item.path) : null),
        item.value === value ? h("span", { className: "dms_wsOptionCheck" }, icon("IconCheckOutlineRegular", 14)) : null))));
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
    const TYPE_COLORS = {
      convention: "#6ea8fe", preference: "#b58cff", feedback: "#f2a65a", project: "#4fd1b0",
      reference: "#5bc8e8", fact: "#f2d35e", user: "#f27bae"
    };
    const zh = {
      section: "记忆", title: "记忆服务", description: "管理 DeepSeek Harness 的各项记忆",
      workspace: "当前工作区", workspaceShort: "工作区", workspaceTree: "工作区树", otherWorkspaces: "其他记忆工作区", noWorkspaces: "暂无工作区", followsSession: "跟随当前会话", allShort: "全部", global: "全局", all: "全部工作区", listView: "列表", nebulaView: "关系", viewField: "视图", nebulaTitle: "记忆关系图", nebulaNodes: "条记忆", nebulaLinks: "条关系", zoomIn: "放大", zoomOut: "缩小", resetView: "复位视图", edgeConflict: "冲突", edgeSupersede: "替代", edgeKey: "同 key", edgeSource: "来源", edgeType: "同类", nebulaRelations: "连线：冲突 / 替代 / 同 key / 来源 / 时间链", search: "搜索", clearSearch: "清除搜索", searchPlaceholder: "搜索标题、描述或正文…",
      refresh: "刷新", flush: "处理队列", newMemory: "新增记忆", loading: "加载中…", empty: "没有匹配的记忆。",
      emptyHint: "试试换一个作用域，或新增一条记忆。", formHint: "保存一条可跨会话复用的记忆。", edit: "编辑", delete: "遗忘", save: "保存", cancel: "取消",
      back: "返回列表", titleField: "标题", descriptionField: "一句话描述", bodyField: "正文", typeField: "类型", scopeField: "作用域",
      revision: "版本", updated: "更新于", id: "ID", copyId: "复制 ID", copied: "已复制",
      confirmDelete: "确定遗忘这条记忆？", confirmForgetTitle: "遗忘这条记忆？", confirmForgetDesc: "遗忘后会从当前作用域的搜索结果和召回上下文中隐藏。", forgetting: "正在遗忘…", error: "操作失败", conflict: "版本冲突：内容已被其他会话修改，请重试。",
      queue: "捕获队列", pending: "待处理", failed: "失败", notes: "笔记", active: "有效", conflicts: "冲突", claudeImport: "从 Claude Code 导入", claudeImportTitle: "导入 Claude Code 记忆", claudeImportDesc: "从 Claude Code 导入各项记忆。", claudeProject: "Claude 项目", claudeImportScope: "导入到", claudeNotes: "条记忆", claudeImportAction: "开始导入", claudeImporting: "导入中…", claudeNoSources: "没有找到 Claude Code memory 目录。", claudeSummary: "导入结果", imported: "新增", updated: "更新", skipped: "跳过", importConflicts: "冲突", importErrors: "错误", forceImport: "覆盖本地修改", claudeSelectSources: "选择来源（可多选）", claudeSelectAll: "全选", claudeClear: "清空", claudePreview: "预览", claudePreviewing: "预览中…", claudeEntries: "条待导入", claudeExisting: "已存在", claudeEdit: "修改", claudeDone: "完成", claudeImportSelected: "导入选中", claudeNoEntries: "没有可导入的记忆。", claudeEntrySource: "来源：",
      extractor: "模型抽取", on: "开启", off: "关闭", allScopes: "全部", detail: "记忆详情", conflictShort: "冲突", status: "状态", showConflicts: "只看冲突", allMemories: "全部记忆", resolveKeep: "保留此版本", conflictWith: "冲突对象", resolved: "已解决", argumentsLabel: "参数", resultLabel: "结果", errorLabel: "错误",
      sourceRefs: "来源", noDescription: "（无描述）", noBody: "（无正文）", memory: "记忆",
      toolSearch: "搜索记忆", toolSave: "保存记忆", toolGet: "读取记忆", toolUpdate: "更新记忆",
      toolForget: "遗忘记忆", toolFlush: "处理捕获队列", toolConflicts: "查看记忆冲突",
      toolResolve: "解决记忆冲突", toolStats: "记忆统计"
    };
    const en = {
      section: "Memory", title: "Memory service", description: "Manage DeepSeek Harness memories.",
      workspace: "Current workspace", workspaceShort: "Workspace", workspaceTree: "Workspaces", otherWorkspaces: "Other memory workspaces", noWorkspaces: "No workspaces", followsSession: "Following current session", allShort: "All", global: "Global", all: "All workspaces", listView: "List", nebulaView: "Graph", viewField: "View", nebulaTitle: "Memory graph", nebulaNodes: "memories", nebulaLinks: "links", zoomIn: "Zoom in", zoomOut: "Zoom out", resetView: "Reset view", edgeConflict: "conflict", edgeSupersede: "supersede", edgeKey: "same key", edgeSource: "source", edgeType: "same type", nebulaRelations: "links: conflict / supersede / same key / source / time", search: "Search", clearSearch: "Clear search", searchPlaceholder: "Search title, description or body…",
      refresh: "Refresh", flush: "Drain queue", newMemory: "New memory", loading: "Loading…", empty: "No matching memories.",
      emptyHint: "Try another scope, or create a memory.", formHint: "Save a durable memory for future sessions.", edit: "Edit", delete: "Forget", save: "Save", cancel: "Cancel",
      back: "Back to list", titleField: "Title", descriptionField: "One-line description", bodyField: "Body", typeField: "Type", scopeField: "Scope",
      revision: "Revision", updated: "Updated", id: "ID", copyId: "Copy ID", copied: "Copied",
      confirmDelete: "Forget this memory?", confirmForgetTitle: "Forget this memory?", confirmForgetDesc: "It will be hidden from search and recall in this scope.", forgetting: "Forgetting…", error: "Operation failed", conflict: "Revision conflict: another session changed this memory. Reload and retry.",
      queue: "Capture queue", pending: "pending", failed: "failed", notes: "notes", active: "active", conflicts: "conflicts", claudeImport: "Import from Claude Code", claudeImportTitle: "Import Claude Code memories", claudeImportDesc: "Import memories from Claude Code.", claudeProject: "Claude project", claudeImportScope: "Import to", claudeNotes: "memories", claudeImportAction: "Import", claudeImporting: "Importing…", claudeNoSources: "No Claude Code memory directory found.", claudeSummary: "Import result", imported: "added", updated: "updated", skipped: "skipped", importConflicts: "conflicts", importErrors: "errors", forceImport: "Overwrite local edits", claudeSelectSources: "Sources (multi-select)", claudeSelectAll: "All", claudeClear: "Clear", claudePreview: "Preview", claudePreviewing: "Previewing…", claudeEntries: "entries", claudeExisting: "existing", claudeEdit: "Edit", claudeDone: "Done", claudeImportSelected: "Import selected", claudeNoEntries: "No importable memories.", claudeEntrySource: "Source: ",
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
        ".dms_page{display:flex;flex-direction:column;gap:20px;width:100%;height:100%;overflow:auto;padding:28px clamp(24px,4vw,48px) 48px;box-sizing:border-box;color:var(--dsw-alias-label-primary,#e6e6e6);}",
        ".dms_page>*{width:100%;max-width:960px;margin-inline:auto;flex:none;box-sizing:border-box;}",
        ".dms_pageHead{display:flex;flex-direction:column;gap:14px;}",
        ".dms_head{display:flex;flex-direction:column;gap:4px;}.dms_title{font-size:20px;line-height:28px;font-weight:600;}.dms_desc{font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary,#aaa);}",
        ".dms_summary{display:flex;gap:16px;flex-wrap:wrap;align-items:center;padding:11px 14px;border:1px solid var(--dsw-alias-border-l2,#333);border-radius:10px;background:var(--dsw-alias-bg-layer-1,#181818);}",
        ".dms_layout{display:grid;grid-template-columns:238px minmax(0,1fr);gap:22px;align-items:start;}",
        ".dms_content{display:flex;flex-direction:column;gap:14px;min-width:0;}",
        ".dms_viewSwitch{flex:none;}",
        ".dms_nebula{position:relative;width:100%;height:clamp(420px,calc(100vh - 310px),720px);border:1px solid rgba(126,150,255,.24);border-radius:10px;overflow:hidden;background:radial-gradient(ellipse at 50% 42%,#1a2442 0%,#0d1224 58%,#090d18 100%);box-shadow:inset 0 0 80px rgba(60,90,180,.12);}",
        ".dms_nebulaCanvas{display:block;width:100%;height:100%;cursor:crosshair;touch-action:none;}",
        ".dms_nebulaMeta{position:absolute;left:14px;top:12px;display:flex;flex-direction:column;gap:3px;pointer-events:none;font-size:11px;color:#8ea6c9;}.dms_nebulaMeta b{font-size:13px;font-weight:600;color:#eef4ff;}.dms_nebulaControls{position:absolute;right:12px;top:12px;display:flex;align-items:center;gap:3px;padding:4px 6px;border:1px solid rgba(126,150,255,.18);border-radius:8px;background:rgba(8,12,24,.55);backdrop-filter:blur(3px);z-index:2;}.dms_nebulaScale{font-size:10px;line-height:14px;color:#8ea6c9;min-width:32px;text-align:center;font-variant-numeric:tabular-nums;}.dms_nebulaBtn{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;border:0;border-radius:5px;background:transparent;color:#a9bce0;cursor:pointer;}.dms_nebulaBtn:hover{background:rgba(126,150,255,.16);color:#eef4ff;}",
        ".dms_nebulaTip{position:absolute;z-index:3;width:260px;display:flex;flex-direction:column;gap:4px;padding:9px 11px;border:1px solid rgba(126,150,255,.28);border-radius:8px;background:#131b30;box-shadow:0 12px 30px rgba(0,0,0,.45);pointer-events:none;}",
        ".dms_nebulaType{font-size:10px;line-height:14px;text-transform:uppercase;letter-spacing:.05em;}.dms_nebulaFacts{font-size:10px;line-height:14px;color:#7f98bb;overflow-wrap:anywhere;}.dms_nebulaUpdated{font-size:10px;line-height:14px;color:#6f86a8;}.dms_nebulaTip b{font-size:12px;line-height:17px;color:#eef4ff;}.dms_nebulaDesc{font-size:11px;line-height:16px;color:#9fb4d4;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}",
        ".dms_nebulaLegend{position:absolute;left:14px;right:14px;bottom:10px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:center;pointer-events:none;padding:5px 8px;border-radius:8px;background:rgba(8,12,24,.45);backdrop-filter:blur(2px);}.dms_nebulaLegendItem{display:inline-flex;align-items:center;gap:5px;font-size:10px;line-height:14px;color:#8ea6c9;}.dms_nebulaLegendItem i{width:6px;height:6px;border-radius:50%;display:inline-block;}.dms_nebulaLegendItem span{font-variant-numeric:tabular-nums;}",
        ".dms_nebulaEmpty{min-height:320px;}",
        ".dms_treePane{border:0;border-right:1px solid var(--dsw-alias-border-l2,#333);border-radius:0;background:transparent;padding:0 16px 0 0;position:sticky;top:16px;max-height:calc(100vh - 200px);overflow:auto;box-sizing:border-box;}",
        ".dms_treeHead{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:2px 8px 8px;font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary,#eee);}.dms_treeHint{font-size:10px;font-weight:400;color:var(--dsw-alias-label-tertiary,#888);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
        ".dms_treeList{display:flex;flex-direction:column;gap:1px;}.dms_treeSection{padding:10px 8px 4px;font-size:11px;font-weight:500;color:var(--dsw-alias-label-tertiary,#888);letter-spacing:.02em;}",
        ".dms_treeRow{width:100%;min-height:30px;display:flex;align-items:center;gap:7px;padding:5px 8px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary,#bbb);font:inherit;font-size:13px;line-height:20px;text-align:left;cursor:pointer;box-sizing:border-box;}.dms_treeRow:hover{background:var(--dsw-alias-interactive-bg-hover,#242424);color:var(--dsw-alias-label-primary,#eee);}.dms_treeRowActive,.dms_treeRowActive:hover{background:var(--dsw-alias-interactive-bg-hover,#242424);color:var(--dsw-alias-label-primary,#fff);}.dms_treeRow:disabled{opacity:.5;cursor:default;}",
        ".dms_treeIcon{display:flex;align-items:center;justify-content:center;flex:none;color:var(--dsw-alias-label-tertiary,#888);}.dms_treeRowActive .dms_treeIcon{color:var(--dsw-alias-state-business-primary,#4d6bfe);}.dms_treeTitle{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.dms_treeCount{flex:none;font-size:11px;color:var(--dsw-alias-label-tertiary,#888);font-variant-numeric:tabular-nums;}",
        ".dms_treeEmpty{padding:12px 8px;font-size:12px;color:var(--dsw-alias-label-tertiary,#888);}",
        ".dms_metric{display:flex;gap:5px;align-items:baseline;font-size:12px;color:var(--dsw-alias-label-tertiary,#888);}.dms_metric b{font-size:14px;color:var(--dsw-alias-label-primary,#eee);font-weight:600;}",
        ".dms_controls{display:flex;flex-direction:column;gap:10px;}",
        ".dms_toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}.dms_filters{display:flex;gap:8px;align-items:center;flex-wrap:wrap;min-width:0;}.dms_actions{margin-left:auto;display:flex;gap:4px;align-items:center;padding-left:10px;border-left:1px solid var(--dsw-alias-border-l2,#333);}.dms_scope{width:250px;flex:none;min-width:210px;}.dms_dropdownLabel{max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}",
        ".dms_toolbar .dms_search{min-width:230px;flex:1;display:flex;position:relative;}.dms_toolbar .dms_search>*:first-child{width:100%;}.dms_searchClear{position:absolute;right:8px;top:50%;transform:translateY(-50%);display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border:0;border-radius:50%;background:transparent;color:var(--dsw-alias-label-tertiary,#888);cursor:pointer;}.dms_searchClear:hover{background:var(--dsw-alias-interactive-bg-hover,#242424);color:var(--dsw-alias-label-primary,#eee);}.dms_search input{padding-right:32px;}.dms_search input::-webkit-search-cancel-button{display:none;}",
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
        ".dms_field{display:flex;flex-direction:column;gap:5px;font-size:12px;color:var(--dsw-alias-label-secondary,#aaa);}.dms_formRow{display:flex;gap:10px;flex-wrap:wrap;}.dms_scopeChoice{display:flex;gap:12px;align-items:center;flex-wrap:wrap;}.dms_workspacePick{display:flex;align-items:center;gap:7px;min-width:240px;max-width:100%;border:1px solid var(--dsw-alias-border-l2,#333);border-radius:6px;background:var(--dsw-alias-bg-layer-3,#222);color:var(--dsw-alias-label-primary,#eee);padding:7px 9px;font:inherit;cursor:pointer;}.dms_workspacePick:hover{background:var(--dsw-alias-interactive-bg-hover,#242424);}.dms_workspacePickLabel{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.dms_scopePicker{min-width:260px;max-width:100%;display:flex;}.dms_wsMenu{min-width:360px;max-width:min(520px,calc(100vw - 40px));}.dms_wsOption{display:flex;align-items:center;justify-content:space-between;gap:16px;width:100%;min-width:0;}.dms_wsOptionText{display:flex;flex-direction:column;gap:2px;min-width:0;}.dms_wsOptionTitle{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.dms_wsOptionPath{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary,#888);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:420px;}.dms_wsOptionCheck{display:flex;flex:none;color:var(--dsw-alias-state-business-primary,#4d6bfe);}",
        ".dms_conflict{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;border:1px solid var(--dsw-alias-state-error-primary,#e74c3c);border-radius:6px;padding:9px 10px;background:var(--dsw-alias-bg-layer-3,#222);font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary,#bbb);}",
        ".dms_importDialog{width:min(760px,calc(100vw - 64px))!important;max-width:760px!important;}.dms_confirmDialog{width:min(460px,calc(100vw - 48px))!important;max-width:460px!important;}.dms_confirmBody{display:flex;flex-direction:column;gap:10px;}.dms_dangerButton{color:var(--dsw-alias-state-error-primary,#e74c3c)!important;border-color:var(--dsw-alias-state-error-primary,#e74c3c)!important;}.dms_import{display:flex;flex-direction:column;gap:12px;}.dms_importSection{display:flex;flex-direction:column;gap:7px;border:1px solid var(--dsw-alias-border-l2,#333);border-radius:8px;padding:10px;}.dms_importSectionHead{display:flex;gap:8px;align-items:center;justify-content:space-between;font-size:12px;color:var(--dsw-alias-label-secondary,#bbb);}.dms_sourceGrid{display:grid;grid-template-columns:1fr;gap:6px;max-height:160px;overflow:auto;}.dms_importList{display:flex;flex-direction:column;gap:8px;max-height:320px;overflow:auto;}.dms_importEntry{border:1px solid var(--dsw-alias-border-l2,#333);border-radius:7px;padding:9px;display:flex;flex-direction:column;gap:6px;}.dms_importEntryHead{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;}.dms_check{display:flex;gap:8px;align-items:center;font-size:12px;color:var(--dsw-alias-label-secondary,#aaa);}.dms_importSummary{display:flex;flex-direction:column;gap:7px;border-top:1px solid var(--dsw-alias-border-l2,#333);padding-top:10px;font-size:12px;color:var(--dsw-alias-label-secondary,#bbb);}",
        ".dms_error{color:var(--dsw-alias-state-error-primary,#e74c3c);font-size:13px;line-height:19px;}.dms_empty{display:flex;flex-direction:column;gap:6px;align-items:center;padding:42px 12px;color:var(--dsw-alias-label-tertiary,#888);text-align:center;border:1px dashed var(--dsw-alias-border-l2,#333);border-radius:8px;}",
        ".dms_empty b{font-size:14px;color:var(--dsw-alias-label-secondary,#aaa);font-weight:500;}.dms_emptyIcon{opacity:.7;}",
        ".dms_toolBody{display:flex;flex-direction:column;gap:8px;padding:8px 0 2px 26px;}.dms_toolLabel{font-size:11px;color:var(--dsw-alias-label-tertiary,#888);}.dms_toolPre{margin:0;padding:8px 10px;border-radius:6px;background:var(--dsw-alias-bg-layer-3,#222);color:var(--dsw-alias-label-secondary,#ccc);font-size:11px;line-height:17px;white-space:pre-wrap;overflow-wrap:anywhere;max-height:260px;overflow:auto;}",
        "@media (max-width:900px){.dms_layout{grid-template-columns:1fr;}.dms_treePane{position:static;border-right:0;border-bottom:1px solid var(--dsw-alias-border-l2,#333);padding:0 0 12px;max-height:240px;}}",
        "@media (max-width:720px){.dms_filters{width:100%;}.dms_actions{margin-left:0;border-left:none;padding-left:0;}.dms_detailTop{align-items:flex-start;flex-direction:column;}.dms_detailActions{flex-wrap:wrap;}.dms_summary{gap:10px 14px;}.dms_search{min-width:0;}.dms_page{padding:20px 18px 32px;}.dms_treeHint{display:none;}}",
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

    function workspaceRowsOf(workspaces, pathIds, details) {
      const items = Array.isArray(workspaces) ? workspaces : [];
      const counts = new Map((details || []).map((entry) => [entry.id, entry.notes || 0]));
      const mapped = new Set();
      const depthOf = (path) => {
        let depth = 0;
        let current = path;
        while (true) {
          const parent = items.filter((candidate) => candidate.path !== current && path.startsWith(candidate.path.replace(/\/+$/, "") + "/"))
            .sort((a, b) => b.path.length - a.path.length)[0];
          if (!parent) return depth;
          depth += 1;
          current = parent.path;
        }
      };
      const rows = items.map((workspace) => {
        const memoryId = pathIds?.[workspace.path] || "";
        if (memoryId) mapped.add(memoryId);
        return {
          key: "dsh:" + workspace.workspaceId,
          title: workspace.title || workspace.path.split("/").filter(Boolean).pop() || workspace.path,
          path: workspace.path,
          count: counts.get(memoryId) || 0,
          memoryId,
          depth: depthOf(workspace.path),
          sessionCount: workspace.sessionIds?.length || 0
        };
      });
      const other = (details || []).filter((entry) => !mapped.has(entry.id)).map((entry) => ({
        key: "memory:" + entry.id, title: entry.id, path: "", count: entry.notes || 0, memoryId: entry.id, depth: 0, sessionCount: 0
      }));
      return { rows, other };
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

    function nebulaHash(text) {
      let value = 2166136261;
      const input = String(text || "");
      for (let index = 0; index < input.length; index += 1) {
        value ^= input.charCodeAt(index);
        value = Math.imul(value, 16777619);
      }
      return value >>> 0;
    }

    function nebulaRand(seed) {
      let value = seed || 1;
      value ^= value << 13;
      value ^= value >>> 17;
      value ^= value << 5;
      return (value >>> 0) / 4294967296;
    }

    function buildNebula(items) {
      const notes = (items || []).filter((note) => note.status !== "forgotten");
      const types = [...TYPES.filter((type) => notes.some((note) => note.type === type)), ...new Set(notes.map((note) => note.type).filter((type) => !TYPES.includes(type)))];
      const groups = types.map((type, index) => ({
        type,
        color: TYPE_COLORS[type] || "#8fa3bf",
        angle: -Math.PI / 2 + (index * Math.PI * 2) / Math.max(1, types.length)
      }));
      const nodes = notes.map((item, index) => {
        const groupIndex = Math.max(0, types.indexOf(item.type));
        const angle = groups[groupIndex] ? groups[groupIndex].angle : -Math.PI / 2;
        const seed = nebulaHash(item.id);
        const radius = 0.1 + 0.18 * nebulaRand(seed);
        const node = {
          id: item.id, item, type: item.type, color: TYPE_COLORS[item.type] || "#8fa3bf",
          x: Math.max(0.1, Math.min(0.9, 0.5 + Math.cos(angle) * radius + (nebulaRand(seed >>> 5) - 0.5) * 0.06)),
          y: Math.max(0.1, Math.min(0.9, 0.5 + Math.sin(angle) * radius + (nebulaRand(seed >>> 9) - 0.5) * 0.06)),
          r: 5.2, degree: 0, match: true
        };
        return node;
      });
      const byId = new Map(nodes.map((node) => [node.id, node]));
      const links = [];
      const seen = new Set();
      const addLink = (from, to, kind, color, width, directed) => {
        if (!from || !to || from === to) return;
        const a = byId.get(from);
        const b = byId.get(to);
        if (!a || !b) return;
        const key = [from, to].sort().join("|") + ":" + kind;
        if (seen.has(key)) return;
        seen.add(key);
        links.push({ a, b, kind, color, width, directed: directed === true });
        a.degree += 1;
        b.degree += 1;
      };
      for (const node of nodes) {
        const conflict = node.item.metadata && node.item.metadata.conflict_with;
        if (conflict) addLink(node.id, String(conflict), "conflict", "#ef6b6b", 1.8, false);
        if (node.item.supersededBy) addLink(node.id, String(node.item.supersededBy), "supersede", "#6ea8fe", 1.5, true);
        if (node.item.supersedes) addLink(node.id, String(node.item.supersedes), "supersede", "#6ea8fe", 1.5, true);
      }
      const byKey = new Map();
      for (const node of nodes) {
        if (!node.item.key) continue;
        const list = byKey.get(node.item.key) || [];
        list.push(node);
        byKey.set(node.item.key, list);
      }
      for (const list of byKey.values()) {
        for (let index = 1; index < list.length; index += 1) addLink(list[index - 1].id, list[index].id, "key", "#b58cff", 1.3, false);
      }
      const bySource = new Map();
      for (const node of nodes) {
        const source = Array.isArray(node.item.sourceRefs) ? node.item.sourceRefs[0] : "";
        if (!source) continue;
        const list = bySource.get(source) || [];
        list.push(node);
        bySource.set(source, list);
      }
      for (const list of bySource.values()) {
        for (let index = 1; index < list.length; index += 1) addLink(list[index - 1].id, list[index].id, "source", "#5f7d9e", 1.1, false);
      }
      for (const group of groups) {
        const groupNodes = nodes.filter((node) => node.type === group.type);
        for (let index = 1; index < groupNodes.length; index += 1) addLink(groupNodes[index - 1].id, groupNodes[index].id, "type", group.color, 0.8, false);
      }
      const typeCenter = new Map(groups.map((group) => [group.type, { x: 0.5 + Math.cos(group.angle) * 0.3, y: 0.5 + Math.sin(group.angle) * 0.26 }]));
      const iterations = nodes.length > 120 ? Math.max(20, Math.round(20000 / nodes.length)) : Math.min(240, 150 + nodes.length * 2);
      for (let step = 0; step < iterations; step += 1) {
        for (let i = 0; i < nodes.length; i += 1) {
          const a = nodes[i];
          for (let j = i + 1; j < nodes.length; j += 1) {
            const b = nodes[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 0.001;
            const minimum = 0.075 + (a.r + b.r) / 620;
            if (distance < minimum) {
              const push = ((minimum - distance) / distance) * 0.022;
              a.x -= dx * push;
              a.y -= dy * push;
              b.x += dx * push;
              b.y += dy * push;
            }
          }
        }
        for (const link of links) {
          const dx = link.b.x - link.a.x;
          const dy = link.b.y - link.a.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 0.001;
          const pull = (distance - 0.145) * 0.012;
          const move = (dx / distance) * pull;
          const moveY = (dy / distance) * pull;
          link.a.x += move;
          link.a.y += moveY;
          link.b.x -= move;
          link.b.y -= moveY;
        }
        for (const node of nodes) {
          const center = typeCenter.get(node.type);
          if (center) {
            node.x += (center.x - node.x) * 0.0018;
            node.y += (center.y - node.y) * 0.0018;
          }
          node.x += (0.5 - node.x) * 0.0007;
          node.y += (0.5 - node.y) * 0.0007;
          node.x = Math.max(0.08, Math.min(0.92, node.x));
          node.y = Math.max(0.09, Math.min(0.91, node.y));
        }
      }
      for (const node of nodes) {
        const bodySize = String(node.item.body || "").length;
        node.r = 5.2 + Math.min(7, node.degree * 1.1) + Math.min(3, bodySize / 420);
      }
      return { nodes, links, groups };
    }

    function createMemoryNebula(t) {
      return function MemoryNebula({ items, query, onOpen }) {
        const wrapRef = React.useRef(null);
        const canvasRef = React.useRef(null);
        const [size, setSize] = React.useState({ width: 0, height: 0 });
        const [hoverId, setHoverId] = React.useState(null);
        const [tip, setTip] = React.useState(null);
        const [viewport, setViewport] = React.useState({ scale: 1, x: 0, y: 0 });
        const dragRef = React.useRef(null);
        const pointerRef = React.useRef({ x: -9999, y: -9999, active: false });
        const layout = React.useMemo(() => buildNebula(items), [items]);
        const needle = String(query || "").trim().toLowerCase();
        const hover = layout.nodes.find((node) => node.id === hoverId) || null;

        const graphButton = (label, onClick, iconName) => {
          const control = h("button", { type: "button", className: "dms_nebulaBtn", "aria-label": label, title: label, onClick }, icon(iconName, 14));
          return Tooltip ? h(Tooltip, { label, side: "bottom", delayMs: 250, portal: true }, control) : control;
        };
        React.useEffect(() => {          const element = wrapRef.current;
          if (!element) return undefined;
          const update = () => setSize({ width: element.clientWidth, height: element.clientHeight });
          update();
          const observer = new ResizeObserver(update);
          observer.observe(element);
          return () => observer.disconnect();
        }, []);

        const pointOf = (event) => {
          const canvas = canvasRef.current;
          if (!canvas) return null;
          const rect = canvas.getBoundingClientRect();
          return { x: event.clientX - rect.left, y: event.clientY - rect.top, width: rect.width, height: rect.height };
        };

        const nearest = (event) => {
          const point = pointOf(event);
          if (!point) return null;
          const x = (point.x - viewport.x) / viewport.scale;
          const y = (point.y - viewport.y) / viewport.scale;
          let best = null;
          let bestDistance = Infinity;
          for (const node of layout.nodes) {
            const distance = Math.hypot(x - node.x * point.width, y - node.y * point.height);
            if (distance < Math.max(10, node.r + 8) && distance < bestDistance) {
              best = node;
              bestDistance = distance;
            }
          }
          return best ? { node: best, x: point.x, y: point.y } : null;
        };

        const zoomAt = (factor, centerX, centerY) => {
          setViewport((current) => {
            const nextScale = Math.min(3.5, Math.max(0.55, current.scale * factor));
            const cx = centerX == null ? size.width / 2 : centerX;
            const cy = centerY == null ? size.height / 2 : centerY;
            const worldX = (cx - current.x) / current.scale;
            const worldY = (cy - current.y) / current.scale;
            return { scale: nextScale, x: cx - worldX * nextScale, y: cy - worldY * nextScale };
          });
        };
        const resetView = () => setViewport({ scale: 1, x: 0, y: 0 });
        const wheel = (event) => {
          event.preventDefault();
          const point = pointOf(event);
          if (!point) return;
          zoomAt(Math.exp(-event.deltaY * 0.0012), point.x, point.y);
        };
        const down = (event) => {
          if (event.button !== 0) return;
          dragRef.current = { x: event.clientX, y: event.clientY, viewport, moved: false };
          event.currentTarget.setPointerCapture?.(event.pointerId);
          setHoverId(null);
          setTip(null);
        };
        const move = (event) => {
          const canvas = canvasRef.current;
          if (canvas) {
            const rect = canvas.getBoundingClientRect();
            pointerRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top, active: true };
          }
          const drag = dragRef.current;
          if (drag) {
            const dx = event.clientX - drag.x;
            const dy = event.clientY - drag.y;
            if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
            setViewport({ scale: drag.viewport.scale, x: drag.viewport.x + dx, y: drag.viewport.y + dy });
            return;
          }
          const result = nearest(event);
          setHoverId(result ? result.node.id : null);
          setTip(result ? { node: result.node, x: Math.min(result.x + 14, Math.max(12, size.width - 230)), y: Math.max(8, result.y - 10) } : null);
        };
        const up = (event) => {
          const drag = dragRef.current;
          dragRef.current = null;
          event.currentTarget.releasePointerCapture?.(event.pointerId);
          if (drag && !drag.moved) {
            const result = nearest(event);
            if (result) onOpen(result.node.item);
          }
        };
        const leave = () => { pointerRef.current = { x: -9999, y: -9999, active: false }; if (!dragRef.current) { setHoverId(null); setTip(null); } };

        React.useEffect(() => {
          const canvas = canvasRef.current;
          if (!canvas || !size.width || !size.height) return undefined;
          const ratio = Math.min(window.devicePixelRatio || 1, 2);
          canvas.width = Math.max(1, Math.round(size.width * ratio));
          canvas.height = Math.max(1, Math.round(size.height * ratio));
          const context = canvas.getContext("2d");
          if (!context) return undefined;
          const style = getComputedStyle(canvas);
          const primary = "#eef4ff";
          const secondary = "#8ea6c9";
          const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          const started = performance.now();
          let frame = 0;
          const draw = (now) => {
            const width = size.width;
            const height = size.height;
            const phase = reduced ? 0 : (now - started) / 1600;
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            context.clearRect(0, 0, width, height);
            const glow = context.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, Math.max(width, height) * 0.72);
            glow.addColorStop(0, "rgba(92,124,255,0.10)");
            glow.addColorStop(0.5, "rgba(128,88,220,0.035)");
            glow.addColorStop(1, "rgba(0,0,0,0)");
            context.fillStyle = glow;
            context.fillRect(0, 0, width, height);
            const pointer = pointerRef.current;
            const dotSpacing = 28;
            for (let gx = 14; gx < width; gx += dotSpacing) {
              for (let gy = 14; gy < height; gy += dotSpacing) {
                const dx = gx - pointer.x;
                const dy = gy - pointer.y;
                const distance = Math.sqrt(dx * dx + dy * dy) || 0.001;
                const influence = pointer.active && distance < 118 ? 1 - distance / 118 : 0;
                const push = influence * 7;
                const ox = gx + (dx / distance) * push;
                const oy = gy + (dy / distance) * push;
                context.globalAlpha = 0.13 + influence * 0.58;
                context.fillStyle = influence > 0 ? "#9db8ff" : secondary;
                context.beginPath();
                context.arc(ox, oy, 0.8 + influence * 1.3, 0, Math.PI * 2);
                context.fill();
              }
            }
            context.save();
            context.translate(viewport.x, viewport.y);
            context.scale(viewport.scale, viewport.scale);
            for (const link of layout.links) {
              const ax = link.a.x * width;
              const ay = link.a.y * height;
              const bx = link.b.x * width;
              const by = link.b.y * height;
              const bend = link.kind === "source" ? 0.035 : 0.075;
              const controlX = (ax + bx) / 2 + (by - ay) * bend;
              const controlY = (ay + by) / 2 - (bx - ax) * bend;
              const related = !hoverId || link.a.id === hoverId || link.b.id === hoverId;
              context.globalAlpha = related ? (link.kind === "type" ? 0.3 : 0.82) : 0.08;
              context.strokeStyle = link.color;
              context.lineWidth = link.kind === "type" ? 0.8 : link.width;
              context.setLineDash(link.kind === "type" ? [2, 4] : []);
              context.beginPath();
              context.moveTo(ax, ay);
              context.quadraticCurveTo(controlX, controlY, bx, by);
              context.stroke();
              context.setLineDash([]);
              if (link.kind !== "type") {
                const offset = (phase * 0.14 + nebulaRand(nebulaHash(link.a.id + link.b.id))) % 1;
                const px = (1 - offset) * (1 - offset) * ax + 2 * (1 - offset) * offset * controlX + offset * offset * bx;
                const py = (1 - offset) * (1 - offset) * ay + 2 * (1 - offset) * offset * controlY + offset * offset * by;
                context.globalAlpha = related ? 0.85 : 0.08;
                context.fillStyle = link.color;
                context.beginPath();
                context.arc(px, py, 1.6, 0, Math.PI * 2);
                context.fill();
              }
              if (link.directed) {
                const angle = Math.atan2(by - controlY, bx - controlX);
                context.fillStyle = link.color;
                context.beginPath();
                context.moveTo(bx, by);
                context.lineTo(bx - Math.cos(angle - 0.5) * 8, by - Math.sin(angle - 0.5) * 8);
                context.lineTo(bx - Math.cos(angle + 0.5) * 8, by - Math.sin(angle + 0.5) * 8);
                context.closePath();
                context.fill();
              }
            }
            const labelBoxes = [];
            for (const group of layout.groups) {
              const groupNodes = layout.nodes.filter((node) => node.type === group.type);
              if (groupNodes.length < 2) continue;
              const cx = groupNodes.reduce((sum, node) => sum + node.x, 0) / groupNodes.length * width;
              const cy = Math.min(...groupNodes.map((node) => node.y)) * height - 16;
              context.globalAlpha = 0.46;
              context.fillStyle = group.color;
              context.font = "600 10px system-ui, -apple-system, sans-serif";
              context.textAlign = "center";
              context.fillText(group.type.toUpperCase(), cx, Math.max(18, cy));
            }
            for (const node of layout.nodes) {
              const x = node.x * width;
              const y = node.y * height;
              const matched = !needle || [node.item.title, node.item.description, node.item.body, node.item.type].join(" ").toLowerCase().includes(needle);
              const connected = !hoverId || node.id === hoverId || layout.links.some((link) => (link.a.id === hoverId && link.b.id === node.id) || (link.b.id === hoverId && link.a.id === node.id));
              const active = (!needle || matched) && connected;
              const pulse = 1 + (reduced ? 0 : Math.sin(phase + node.x * 6) * 0.06);
              context.globalAlpha = active ? 1 : 0.16;
              const halo = context.createRadialGradient(x, y, 0, x, y, node.r * 2.8);
              halo.addColorStop(0, node.color + "66");
              halo.addColorStop(0.45, node.color + "20");
              halo.addColorStop(1, node.color + "00");
              context.fillStyle = halo;
              context.beginPath();
              context.arc(x, y, node.r * 2.8, 0, Math.PI * 2);
              context.fill();
              context.fillStyle = node.color;
              context.beginPath();
              context.arc(x, y, node.r * pulse, 0, Math.PI * 2);
              context.fill();
              if (node.id === hoverId || (needle && matched)) {
                context.globalAlpha = active ? 0.9 : 0.2;
                context.strokeStyle = primary;
                context.lineWidth = 1;
                context.beginPath();
                context.arc(x, y, node.r + 4, 0, Math.PI * 2);
                context.stroke();
              }
              if (layout.nodes.length <= 80 || node.id === hoverId || (needle && matched)) {
                context.globalAlpha = active ? 0.82 : 0.18;
                context.fillStyle = primary;
                context.font = "500 11px system-ui, -apple-system, sans-serif";
                context.textAlign = "center";
                const title = String(node.item.title || node.item.id);
                const labelY = y + (nebulaHash(node.id) % 2 === 0 ? -node.r - 9 : node.r + 15);
                const labelWidth = Math.min(190, title.length * 6.2 + 10);
                const labelBox = { left: x - labelWidth / 2 - 6, right: x + labelWidth / 2 + 6, top: labelY - 13, bottom: labelY + 7 };
                const collides = labelBoxes.some((box) => labelBox.left < box.right && labelBox.right > box.left && labelBox.top < box.bottom && labelBox.bottom > box.top);
                if (!collides || node.id === hoverId) {
                  labelBoxes.push(labelBox);
                  context.fillText(title.length > 24 ? title.slice(0, 23) + "…" : title, x, labelY);
                }
              }
            }
            context.globalAlpha = 1;
            context.restore();
            if (!reduced) frame = requestAnimationFrame(draw);
          };
          draw(performance.now());
          return () => cancelAnimationFrame(frame);
        }, [layout, size, hoverId, needle, viewport]);

        if (!items || items.length === 0) {
          return h("div", { className: "dms_empty dms_nebulaEmpty" }, h("span", { className: "dms_emptyIcon" }, icon("IconSparkleRegular", 26)), h("b", null, t("empty")), h("span", null, t("emptyHint")));
        }
        return h("div", { className: "dms_nebula", ref: wrapRef },
          h("canvas", { ref: canvasRef, className: "dms_nebulaCanvas", onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: up, onPointerLeave: leave, onWheel: wheel, onDoubleClick: resetView }),
          h("div", { className: "dms_nebulaControls" },
            h("span", { className: "dms_nebulaScale" }, Math.round(viewport.scale * 100) + "%"),
            graphButton(t("zoomOut"), () => zoomAt(0.8), "IconMinusOutlineRegular"),
            graphButton(t("zoomIn"), () => zoomAt(1.25), "IconPlusOutlineRegular"),
            graphButton(t("resetView"), resetView, "IconRefreshOutlineRegular")),
          h("div", { className: "dms_nebulaMeta" },
            h("b", null, t("nebulaTitle")),
            h("span", null, layout.nodes.length + " " + t("nebulaNodes") + " / " + layout.links.length + " " + t("nebulaLinks")),
            ),
          tip ? h("div", { className: "dms_nebulaTip", style: { left: tip.x, top: tip.y } },
            h("span", { className: "dms_nebulaType", style: { color: tip.node.color } }, tip.node.type),
            h("b", null, tip.node.item.title || tip.node.item.id),
            h("span", { className: "dms_nebulaFacts" }, tip.node.item.scope + " / " + tip.node.item.status),
            h("span", { className: "dms_nebulaDesc" }, tip.node.item.description || tip.node.item.body || t("noDescription")),
            h("span", { className: "dms_nebulaUpdated" }, fmtDate(tip.node.item.updatedAt) + " / " + tip.node.degree + " " + t("nebulaLinks"))) : null,
          h("div", { className: "dms_nebulaLegend" },
            [{ key: "conflict", color: "#ef6b6b", label: t("edgeConflict") }, { key: "supersede", color: "#6ea8fe", label: t("edgeSupersede") }, { key: "key", color: "#b58cff", label: t("edgeKey") }, { key: "source", color: "#5f7d9e", label: t("edgeSource") }, { key: "type", color: "#6f86a8", label: t("edgeType") }].map((item) => h("span", { className: "dms_nebulaLegendItem", key: item.key },
              h("i", { className: "dms_nebulaLegendLine", style: { background: item.color } }),
              item.label))));
      };
    }

    function createPage(t, currentSessionId) {
      const MemoryNebula = createMemoryNebula(t);
      return function MemoryPage(props) {
        const [status, setStatus] = React.useState(null);
        const [items, setItems] = React.useState([]);
        const [scope, setScope] = React.useState("workspace");
        const [view, setView] = React.useState("list");
        const [workspaceId, setWorkspaceId] = React.useState("");
        const [workspaceDetails, setWorkspaceDetails] = React.useState([]);
        const [pathWorkspaceIds, setPathWorkspaceIds] = React.useState({});
        const [pathIdsReady, setPathIdsReady] = React.useState(false);
        const autoSelected = React.useRef(false);
        const workspacesSnapshot = props.useWorkspaces ? props.useWorkspaces((snapshot) => snapshot) : null;
        const [query, setQuery] = React.useState("");
        const [debouncedQuery, setDebouncedQuery] = React.useState("");
        const loadSeq = React.useRef(0);
        const [loading, setLoading] = React.useState(true);
        const [error, setError] = React.useState("");
        const [draft, setDraft] = React.useState(null);
        const [selectedId, setSelectedId] = React.useState(null);
        const [confirmForget, setConfirmForget] = React.useState(null);
        const [forgetBusy, setForgetBusy] = React.useState(false);
        const [forgetError, setForgetError] = React.useState("");
        const [copied, setCopied] = React.useState(false);
        const [onlyConflicts, setOnlyConflicts] = React.useState(false);
        const [claudeOpen, setClaudeOpen] = React.useState(false);
        const [claudeSources, setClaudeSources] = React.useState([]);
        const [claudeSelectedSources, setClaudeSelectedSources] = React.useState([]);
        const [claudeImportScope, setClaudeImportScope] = React.useState("workspace");
        const [claudeForce, setClaudeForce] = React.useState(false);
        const [claudeBusy, setClaudeBusy] = React.useState(false);
        const [claudeSummary, setClaudeSummary] = React.useState(null);
        const [claudeError, setClaudeError] = React.useState("");
        const [claudeEntries, setClaudeEntries] = React.useState([]);
        const [claudeEditing, setClaudeEditing] = React.useState(null);

        const selected = items.find((item) => item.id === selectedId) || null;
        const activeWorkspace = workspaceId || "default";
        const apiScope = scope === "global" ? "global" : scope === "all" ? "all" : "workspace:" + activeWorkspace;
        const workspaceOptions = (workspaceDetails.length ? workspaceDetails : [{ id: "default", notes: 0, updatedAt: "" }]).map((item) => ({ value: item.id, label: item.id + (item.notes ? " · " + item.notes : "") }));
        const scopeIds = [...new Set([...workspaceOptions.map((item) => item.value), activeWorkspace, ...Object.values(pathWorkspaceIds)])].filter(Boolean);
        const scopeOptions = [...scopeIds.map((id) => ({ value: "workspace:" + id, label: t("workspace") + " " + id })), { value: "global", label: t("global") }];

        React.useEffect(() => {
          const items = workspacesSnapshot?.items || [];
          if (!items.length) { setPathWorkspaceIds({}); setPathIdsReady(true); return undefined; }
          let live = true;
          setPathIdsReady(false);
          api("workspaceIds", { paths: items.map((workspace) => workspace.path) })
            .then((map) => { if (live) { setPathWorkspaceIds(map || {}); setPathIdsReady(true); } })
            .catch(() => { if (live) { setPathWorkspaceIds({}); setPathIdsReady(true); } });
          return () => { live = false; };
        }, [workspacesSnapshot]);

        React.useEffect(() => {
          if (autoSelected.current || !status || !pathIdsReady) return;
          if (workspacesSnapshot && workspacesSnapshot.phase !== "ready") return;
          const details = status.workspaceDetails || [];
          const sessionId = currentSessionId?.();
          const containing = sessionId
            ? (workspacesSnapshot?.items || []).find((workspace) => (workspace.sessionIds || []).includes(sessionId))
            : null;
          let next = containing ? pathWorkspaceIds[containing.path] : "";
          if (!next) next = [...details].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0]?.id || "default";
          setScope("workspace");
          setWorkspaceId(next);
          autoSelected.current = true;
        }, [status, pathIdsReady, pathWorkspaceIds, workspacesSnapshot, currentSessionId]);

        const load = React.useCallback(async (nextScope, nextQuery) => {
          const sequence = ++loadSeq.current;
          setLoading(true); setError("");
          try {
            const [state, rows] = await Promise.all([
              api("state"),
              nextQuery ? api("search", { query: nextQuery, scope: nextScope, limit: 50 }) : api("list", { scope: nextScope, allScopes: nextScope === "all" })
            ]);
            if (sequence !== loadSeq.current) return;
            setStatus(state); setItems(rows || []);
            const details = state.workspaceDetails || [];
            setWorkspaceDetails(details);
            if (selectedId && !(rows || []).some((row) => row.id === selectedId)) setSelectedId(null);
          } catch (failure) { if (sequence === loadSeq.current) setError(String(failure.message || failure)); }
          finally { if (sequence === loadSeq.current) setLoading(false); }
        }, [selectedId]);

        React.useEffect(() => {
          const timer = setTimeout(() => {
            const value = query.trim();
            setDebouncedQuery(value);
            setOnlyConflicts(false);
          }, 260);
          return () => clearTimeout(timer);
        }, [query]);
        React.useEffect(() => { void load(apiScope, debouncedQuery); }, [apiScope, debouncedQuery, load]);
        const submitSearch = (event) => { event.preventDefault(); const value = query.trim(); setDebouncedQuery(value); setOnlyConflicts(false); void load(apiScope, value); };
        const refresh = () => { setOnlyConflicts(false); void load(apiScope, query.trim()); };
        const openClaudeImport = async () => {
          setClaudeOpen(true); setClaudeBusy(true); setClaudeError(""); setClaudeSummary(null);
          setClaudeEntries([]); setClaudeSelectedSources([]);
          try {
            const sources = await api("claudeDiscover");
            setClaudeSources(sources || []);
            setClaudeImportScope(scope === "global" ? "global" : "workspace");
          } catch (failure) { setClaudeError(String(failure.message || failure)); }
          finally { setClaudeBusy(false); }
        };
        const toggleClaudeSource = (source) => {
          setClaudeSummary(null); setClaudeEntries([]);
          setClaudeSelectedSources((current) => current.includes(source) ? current.filter((item) => item !== source) : [...current, source]);
        };
        const setAllClaudeSources = (selected) => { setClaudeEntries([]); setClaudeSummary(null); setClaudeSelectedSources(selected ? claudeSources.map((item) => item.source) : []); };
        const previewClaude = async () => {
          if (!claudeSelectedSources.length || claudeBusy) return;
          setClaudeBusy(true); setClaudeError(""); setClaudeSummary(null);
          try {
            const result = await api("claudePreview", { sources: claudeSelectedSources, scope: claudeImportScope === "workspace" ? "workspace:" + activeWorkspace : "global" });
            setClaudeEntries((result.entries || []).map((entry) => ({ ...entry, included: true })));
          } catch (failure) { setClaudeError(String(failure.message || failure)); }
          finally { setClaudeBusy(false); }
        };
        const updateClaudeEntry = (index, patch) => setClaudeEntries((current) => current.map((entry, i) => i === index ? { ...entry, ...patch } : entry));
        const runClaudeImport = async () => {
          const selected = claudeEntries.filter((entry) => entry.included);
          if (!selected.length || claudeBusy) return;
          setClaudeBusy(true); setClaudeError(""); setClaudeSummary(null);
          try {
            const summary = await api("claudeImportEntries", { force: claudeForce, scope: claudeImportScope === "workspace" ? "workspace:" + activeWorkspace : "global", entries: selected.map((entry) => ({
              source: entry.source, file: entry.file, title: entry.title, description: entry.description,
              body: entry.body, type: entry.type, scope: entry.scope === "global" ? "global" : "workspace"
            })) });
            setClaudeSummary(summary);
            await load(apiScope, query.trim());
          } catch (failure) { setClaudeError(String(failure.message || failure)); }
          finally { setClaudeBusy(false); }
        };
        const showConflicts = async () => {
          if (onlyConflicts) { setOnlyConflicts(false); void load(apiScope, query.trim()); return; }
          setLoading(true); setError("");
          try { setStatus(await api("state")); setItems(await api("conflicts", { scope: scope === "all" ? "all" : apiScope })); setSelectedId(null); setOnlyConflicts(true); }
          catch (failure) { setError(String(failure.message || failure)); }
          finally { setLoading(false); }
        };
        const flush = async () => { setError(""); try { await api("flush"); refresh(); } catch (failure) { setError(String(failure.message || failure)); } };
        const back = () => setSelectedId(null);
        const openDetail = (item) => { setSelectedId(item.id); setDraft(null); };
        const startNew = () => { setSelectedId(null); setDraft({ id: "", title: "", description: "", body: "", type: "fact", scope: scope === "global" ? "global" : "workspace:" + activeWorkspace, revision: null }); };
        const startEdit = (item) => setDraft({ id: item.id, title: item.title, description: item.description, body: item.body, type: item.type, scope: item.scope === "global" ? "global" : item.scope, revision: item.revision });
        const forget = (item) => { setForgetError(""); setConfirmForget(item); };
        const runForget = async () => {
          if (!confirmForget || forgetBusy) return;
          setForgetBusy(true); setForgetError("");
          try {
            await api("forget", { id: confirmForget.id, scope: confirmForget.scope });
            setConfirmForget(null);
            setSelectedId(null);
            refresh();
          } catch (failure) {
            setForgetError(String(failure.message || failure));
          } finally { setForgetBusy(false); }
        };
        const save = async () => {
          if (!draft || !draft.body.trim()) return;
          setError("");
          try {
            const base = { title: draft.title, description: draft.description, body: draft.body, type: draft.type, scope: draft.scope };
            const result = draft.id ? await api("update", { ...base, id: draft.id, expectedRevision: draft.revision }) : await api("save", base);
            if (result && result.conflict) { setError(t("conflict")); setDraft({ ...draft, revision: result.latest.revision }); return; }
            const savedId = result?.note?.id || draft.id;
            setDraft(null);
            await load(apiScope, query.trim());
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
            await api("resolve", { winnerId: item.id, loserIds: peers, scope: item.scope });
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
          h("div", { className: "dms_search" },
            textField({ type: "search", value: query, placeholder: t("searchPlaceholder"), icon: icon("IconSearchOutlineRegular"), onChange: (event) => setQuery(event.target.value) }),
            query ? h("button", { type: "button", className: "dms_searchClear", "aria-label": t("clearSearch"), title: t("clearSearch"), onClick: () => { setQuery(""); setDebouncedQuery(""); } }, icon("IconCloseOutlineRegular", 14)) : null),
          h("div", { className: "dms_viewSwitch" }, SegmentedTabs ? h(SegmentedTabs, {
            items: [{ value: "list", label: t("listView") }, { value: "nebula", label: t("nebulaView") }],
            value: view, size: "sm", label: t("viewField"),
            onChange: (next) => { setView(next); setSelectedId(null); setDraft(null); }
          }) : null),
          (status?.conflicts || 0) > 0 ? action(onlyConflicts ? t("allMemories") : t("conflictShort") + " " + status.conflicts, { type: "button", onClick: showConflicts, variant: onlyConflicts ? "primary" : "ghost" }, "IconInfoOutlineRegular") : null,
          h("div", { className: "dms_actions" },
            iconButton(t("claudeImport"), { type: "button", onClick: openClaudeImport }, "IconDownloadOutlineRegular"),
            iconButton(t("refresh"), { type: "button", onClick: refresh }, "IconRefreshOutlineRegular"),
            iconButton(t("flush"), { type: "button", onClick: flush }, "IconDatabaseOutlineRegular"),
            iconButton(t("newMemory"), { type: "button", onClick: startNew }, "IconPlusOutlineRegular")));

        const summary = status ? h("div", { className: "dms_summary" },
          metric(t("notes"), status.notes), metric(t("active"), status.active), metric(t("conflicts"), status.conflicts || 0),
          metric(t("pending"), status.capture?.pending || 0), metric(t("failed"), status.capture?.failed || 0),
          tag(t("extractor") + ": " + (status.extractor ? t("on") : t("off")), status.extractor ? "success" : "neutral")) : null;

        const tree = workspaceRowsOf(workspacesSnapshot?.items, pathWorkspaceIds, pathIdsReady ? workspaceDetails : []);
        const selectMemoryScope = (nextScope, nextWorkspace) => {
          autoSelected.current = true;
          setScope(nextScope);
          if (nextWorkspace !== undefined) setWorkspaceId(nextWorkspace);
          setSelectedId(null);
          setOnlyConflicts(false);
        };
        const treeRow = (row) => h("button", {
          key: row.key, type: "button", disabled: row.disabled === true,
          className: "dms_treeRow" + (row.active ? " dms_treeRowActive" : ""),
          style: row.depth ? { paddingLeft: 8 + row.depth * 14 } : undefined,
          title: row.path || row.label,
          onClick: row.onClick
        },
          h("span", { className: "dms_treeIcon" }, icon(row.icon, 14)),
          h("span", { className: "dms_treeTitle" }, row.label),
          row.count ? h("span", { className: "dms_treeCount" }, String(row.count)) : null);
        const workspaceTree = h("aside", { className: "dms_treePane" },
          h("div", { className: "dms_treeHead" }, h("span", null, t("workspaceTree")), h("span", { className: "dms_treeHint" }, t("followsSession"))),
          h("div", { className: "dms_treeList" },
            treeRow({ key: "scope:all", icon: "IconLayersOutlineRegular", label: t("all"), active: scope === "all", onClick: () => selectMemoryScope("all") }),
            treeRow({ key: "scope:global", icon: "IconGlobeOutlineRegular", label: t("global"), active: scope === "global", onClick: () => selectMemoryScope("global") }),
            tree.rows.length || tree.other.length ? h("div", { className: "dms_treeSection" }, t("workspaceShort")) : null,
            tree.rows.map((row) => treeRow({
              key: row.key, icon: row.depth ? "IconFolderOpenOutlineRegular" : "IconWorkspaceTreeOutlineRegular", label: row.title,
              count: row.count, depth: row.depth, path: row.path, active: scope === "workspace" && workspaceId === row.memoryId,
              disabled: !row.memoryId, onClick: () => selectMemoryScope("workspace", row.memoryId)
            })),
            tree.other.length ? h("div", { className: "dms_treeSection" }, t("otherWorkspaces")) : null,
            tree.other.map((row) => treeRow({
              key: row.key, icon: "IconDatabaseOutlineRegular", label: row.title, count: row.count,
              active: scope === "workspace" && workspaceId === row.memoryId,
              onClick: () => selectMemoryScope("workspace", row.memoryId)
            })),
            !tree.rows.length && !tree.other.length ? h("div", { className: "dms_treeEmpty" }, t("noWorkspaces")) : null));

        const workspaceChoices = [
          ...tree.rows.filter((row) => row.memoryId).map((row) => ({ value: "workspace:" + row.memoryId, title: row.title, path: row.path })),
          ...tree.other.map((row) => ({ value: "workspace:" + row.memoryId, title: row.title, path: row.title }))
        ];
        if (draft && String(draft.scope || "").startsWith("workspace:") && !workspaceChoices.some((choice) => choice.value === draft.scope)) {
          workspaceChoices.push({ value: draft.scope, title: String(draft.scope).replace(/^workspace:/, ""), path: "" });
        }
        const scopeControl = draft ? h("div", { className: "dms_scopeChoice" },
          h("div", { className: "dms_scopePicker" }, h(WorkspaceScopeDropdown, {
            value: draft.scope, options: workspaceChoices, label: t("scopeField"), emptyLabel: draft.scope === "global" ? t("global") : t("workspace"),
            onChange: (value) => setDraft({ ...draft, scope: value })
          })),
          h(Checkbox, {
            label: t("global"), checked: draft?.scope === "global",
            onChange: (checked) => setDraft({ ...draft, scope: checked ? "global" : "workspace:" + activeWorkspace })
          })) : null;

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
            h("div", { className: "dms_field" }, t("scopeField"), scopeControl)),
          h("div", { className: "dms_toolbar" }, action(t("save"), { type: "button", onClick: save, variant: "primary", icon: icon("IconCheckOutlineRegular") }), action(t("cancel"), { type: "button", onClick: () => setDraft(null), variant: "ghost" })),
          ) : null;

        const claudeSourceRows = claudeSources.map((source) => h(Checkbox, {
          key: source.source,
          label: (source.project || source.source) + " · " + source.notes + " " + t("claudeNotes"),
          checked: claudeSelectedSources.includes(source.source),
          onChange: () => toggleClaudeSource(source.source)
        }));
        const renderClaudeEntry = (entry, index) => h("div", { className: "dms_importEntry", key: entry.source + ":" + entry.file },
          h("div", { className: "dms_importEntryHead" },
            h(Checkbox, { label: entry.title, checked: entry.included, onChange: (checked) => updateClaudeEntry(index, { included: checked }) }),
            h("div", { className: "dms_meta" }, tag(entry.type), tag(entry.project), entry.existing ? tag(t("claudeExisting"), "warning") : null)),
          h("div", { className: "dms_desc" }, entry.description || entry.file),
          h("div", { className: "dms_toolbar" }, action(t("claudeEdit"), { type: "button", variant: "ghost", onClick: () => setClaudeEditing(claudeEditing === index ? null : index) }, "IconEditOutlineRegular")),
          claudeEditing === index ? h("div", { className: "dms_form" },
            h("label", { className: "dms_field" }, t("titleField"), textField({ value: entry.title, onChange: (event) => updateClaudeEntry(index, { title: event.target.value }) })),
            h("label", { className: "dms_field" }, t("descriptionField"), textField({ value: entry.description, onChange: (event) => updateClaudeEntry(index, { description: event.target.value }) })),
            h("label", { className: "dms_field" }, t("bodyField"), h("textarea", { className: "dms_textarea", value: entry.body, onChange: (event) => updateClaudeEntry(index, { body: event.target.value }) })),
            h("div", { className: "dms_formRow" },
              h("label", { className: "dms_field" }, t("typeField"), h(Dropdown, { value: entry.type, options: TYPES.map((type) => ({ value: type, label: type })), onChange: (value) => updateClaudeEntry(index, { type: value }), label: t("typeField") })),
              h("label", { className: "dms_field" }, t("scopeField"), h(Dropdown, { value: entry.scope === "global" ? "global" : "workspace", options: [{ value: "workspace", label: t("workspace") }, { value: "global", label: t("global") }], onChange: (value) => updateClaudeEntry(index, { scope: value }), label: t("scopeField") }))),
            h("div", { className: "dms_toolbar" }, action(t("claudeDone"), { type: "button", variant: "primary", onClick: () => setClaudeEditing(null) }, "IconCheckOutlineRegular"))) : null);
        const claudeImportBody = h("div", { className: "dms_import" },
          claudeError ? h("div", { className: "dms_error" }, claudeError) : null,
          claudeBusy ? h("div", { className: "dms_desc" }, shimmer(t("claudeImporting"))) :
            claudeSources.length === 0 ? h("div", { className: "dms_empty" }, icon("IconDownloadOutlineRegular", 24), h("b", null, t("claudeNoSources"))) :
              h(React.Fragment, null,
                h("div", { className: "dms_importSection" },
                  h("div", { className: "dms_importSectionHead" }, h("b", null, t("claudeSelectSources")), h("div", { className: "dms_toolbar" }, action(t("claudeSelectAll"), { type: "button", variant: "ghost", onClick: () => setAllClaudeSources(true) }), action(t("claudeClear"), { type: "button", variant: "ghost", onClick: () => setAllClaudeSources(false) }))),
                  h("div", { className: "dms_sourceGrid" }, claudeSourceRows)),
                h("label", { className: "dms_field" }, t("claudeImportScope"), h(Dropdown, { value: claudeImportScope, options: [{ value: "workspace", label: t("workspace") }, { value: "global", label: t("global") }], onChange: (value) => { setClaudeImportScope(value); setClaudeEntries((current) => current.map((entry) => ({ ...entry, scope: value }))); }, label: t("claudeImportScope") })),
                h(Checkbox, { label: t("forceImport"), checked: claudeForce, onChange: setClaudeForce }),
                claudeEntries.length === 0 ? null : h("div", { className: "dms_importSection" },
                  h("div", { className: "dms_importSectionHead" }, h("b", null, claudeEntries.length + " " + t("claudeEntries")), h("div", { className: "dms_toolbar" }, action(t("claudeSelectAll"), { type: "button", variant: "ghost", onClick: () => setClaudeEntries((current) => current.map((entry) => ({ ...entry, included: true }))) }), action(t("claudeClear"), { type: "button", variant: "ghost", onClick: () => setClaudeEntries((current) => current.map((entry) => ({ ...entry, included: false }))) }))),
                  h("div", { className: "dms_importList" }, claudeEntries.map(renderClaudeEntry))),
                claudeSummary ? h("div", { className: "dms_importSummary" },
                  h("b", null, t("claudeSummary")),
                  h("div", { className: "dms_meta" }, tag(t("imported") + " " + claudeSummary.imported), tag(t("updated") + " " + claudeSummary.updated), tag(t("skipped") + " " + claudeSummary.skipped), tag(t("importConflicts") + " " + claudeSummary.conflicts, claudeSummary.conflicts ? "error" : "outline")),
                  claudeSummary.errors && claudeSummary.errors.length ? h("div", { className: "dms_error" }, claudeSummary.errors.slice(0, 3).join("\n")) : null) : null));
        const forgetDialog = confirmForget && Modal ? h(Modal, {
          className: "dms_confirmDialog",
          open: true,
          onClose: () => { if (!forgetBusy) { setConfirmForget(null); setForgetError(""); } },
          title: t("confirmForgetTitle"),
          closeLabel: t("cancel"),
          description: "#" + confirmForget.id + (confirmForget.title ? " " + confirmForget.title : ""),
          footer: h("div", { className: "dms_toolbar" },
            action(t("cancel"), { type: "button", variant: "ghost", disabled: forgetBusy, onClick: () => { setConfirmForget(null); setForgetError(""); } }),
            action(t("delete"), { type: "button", variant: "outline", className: "dms_dangerButton", disabled: forgetBusy, onClick: runForget }, "IconTrashOutlineRegular"))
        },
          h("div", { className: "dms_confirmBody" },
            h("div", { className: "dms_desc" }, t("confirmForgetDesc")),
            h("div", { className: "dms_meta" }, tag(confirmForget.scope), tag(confirmForget.status)),
            forgetBusy ? h("div", { className: "dms_desc" }, shimmer(t("forgetting"))) : null,
            forgetError ? h("div", { className: "dms_error" }, forgetError) : null)) : null;
        const claudeDialog = claudeOpen ? (Modal ? h(Modal, {
          className: "dms_importDialog",
          open: true,
          onClose: () => setClaudeOpen(false),
          title: t("claudeImportTitle"),
          closeLabel: t("cancel"),
          description: t("claudeImportDesc"),
          footer: h("div", { className: "dms_toolbar" },
            action(t("cancel"), { type: "button", onClick: () => setClaudeOpen(false), variant: "ghost" }),
            claudeEntries.length === 0
              ? action(claudeBusy ? t("claudePreviewing") : t("claudePreview"), { type: "button", onClick: previewClaude, variant: "primary", disabled: claudeBusy || claudeSelectedSources.length === 0 }, "IconSearchOutlineRegular")
              : action(t("claudeImportSelected"), { type: "button", onClick: runClaudeImport, variant: "primary", disabled: claudeBusy || !claudeEntries.some((entry) => entry.included) }, "IconDownloadOutlineRegular"))
        }, claudeImportBody) : h("div", { className: "dms_form" }, claudeImportBody)) : null;
        return h("div", { className: "dms_page" },
          h("div", { className: "dms_pageHead" },
            h("div", { className: "dms_head" }, h("div", { className: "dms_title" }, t("title")), h("div", { className: "dms_desc" }, t("description"))),
            summary),
          error ? h("div", { className: "dms_error" }, error) : null,
          h("div", { className: "dms_layout" },
            workspaceTree,
            h("div", { className: "dms_content" },
              h("form", { className: "dms_controls", onSubmit: submitSearch }, toolbar),
              form || detail || (view === "nebula" ? h(MemoryNebula, { items: items.filter((item) => item.status !== "forgotten"), query, onOpen: openDetail }) : list)),
          ),
          forgetDialog,
          claudeDialog);
      };
    }

    installStyle();
    return {
      inject: ["slots", "locale", "uiWorkspace"],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-memory-service: dictionaries");
        const t = ctx.locale.bind(NS);
        const currentSessionId = () => {
          try {
            const selection = ctx.uiWorkspace?.selection?.getSnapshot?.();
            if (selection?.sessionId) return selection.sessionId;
          } catch { /* fall back to the persisted selection */ }
          try {
            const parsed = JSON.parse(window.localStorage.getItem("dsh.sessions.current") || "{}");
            return parsed?.sessionId || parsed?.current?.sessionId;
          } catch { return undefined; }
        };
        const Page = createPage(t, currentSessionId);
        const ToolRow = createToolRow(t);
        const MemoryIcon = ({ size }) => icon("IconContextInjectionOutlineRegular", size || 16);
        ctx.slots.inject("main", () => ctx.slots.register({ name: "main", key: "memory-service", locale: NS }, Page));
        ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({ name: "sidebar.panellist", id: "memory-service", order: 20, locale: NS, label: () => t("section") }, MemoryIcon));
        ctx.slots.inject("tool.call.toolview", function* () {
          for (const key of Object.keys(TOOL_LABELS)) yield ctx.slots.register({ name: "tool.call.toolview", key, locale: NS }, ToolRow);
        });
      }
    };
  }
});
