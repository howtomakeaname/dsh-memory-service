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
    function action(label, props, iconName) {
      if (Button) return h(Button, { size: "sm", ...props, icon: iconName ? icon(iconName) : undefined }, label);
      const { variant, ...rest } = props || {};
      return h("button", { className: "dms_btn " + (variant === "primary" ? "primary" : ""), ...rest }, iconName ? icon(iconName) : null, " ", label);
    }
    function textField(props) {
      const { icon: leading, ...rest } = props || {};
      if (Input) return h(Input, { ...rest, icon: leading });
      return h("input", { className: "dms_input", ...rest });
    }
    function tag(label) { return Tag ? h(Tag, { tone: "outline" }, label) : h("span", null, label); }
    const NS = "memory-service";
    const API = "/memory-service/api";
    const STYLE_ID = "dsh-memory-service/page";
    const zh = {
      section: "记忆", title: "记忆服务", description: "管理 DSH 的长期记忆：按作用域查看、搜索、新增、编辑、遗忘，并处理捕获队列。",
      workspace: "当前工作区", global: "全局", all: "全部工作区", search: "搜索", searchPlaceholder: "搜索标题、描述或正文…",
      refresh: "刷新", flush: "处理队列", newMemory: "新增记忆", loading: "加载中…", empty: "没有匹配的记忆。",
      edit: "编辑", delete: "遗忘", save: "保存", cancel: "取消", titleField: "标题", descriptionField: "描述",
      bodyField: "正文", typeField: "类型", scopeField: "作用域", revision: "版本", updated: "更新于",
      confirmDelete: "确定遗忘这条记忆？", error: "操作失败", conflict: "版本冲突：内容已被其他会话修改，请重试。",
      queue: "捕获队列", pending: "待处理", failed: "失败", notes: "笔记", active: "有效", extractor: "模型抽取"
    };
    const en = {
      section: "Memory", title: "Memory service", description: "Manage DSH long-term memory: browse, search, create, edit and forget by scope; drain the capture queue.",
      workspace: "Current workspace", global: "Global", all: "All workspaces", search: "Search", searchPlaceholder: "Search title, description or body…",
      refresh: "Refresh", flush: "Drain queue", newMemory: "New memory", loading: "Loading…", empty: "No matching memories.",
      edit: "Edit", delete: "Forget", save: "Save", cancel: "Cancel", titleField: "Title", descriptionField: "Description",
      bodyField: "Body", typeField: "Type", scopeField: "Scope", revision: "Revision", updated: "Updated",
      confirmDelete: "Forget this memory?", error: "Operation failed", conflict: "Revision conflict: another session changed this memory. Reload and retry.",
      queue: "Capture queue", pending: "pending", failed: "failed", notes: "notes", active: "active", extractor: "Model extraction"
    };
    const TYPES = ["convention", "feedback", "project", "reference", "fact", "user"];

    function installStyle() {
      if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = [
        ".dms_page{display:flex;flex-direction:column;gap:16px;color:var(--dsw-alias-label-primary,#e6e6e6);}",
        ".dms_head{display:flex;flex-direction:column;gap:6px;}",
        ".dms_title{font-size:18px;font-weight:600;}.dms_desc{font-size:13px;color:var(--dsw-alias-label-secondary,#aaa);}",
        ".dms_stats{display:flex;gap:10px;flex-wrap:wrap;}",
        ".dms_stat{min-width:110px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l2,#333);border-radius:8px;background:var(--dsw-alias-bg-layer-1,#181818);}",
        ".dms_stat b{display:block;font-size:18px;}.dms_stat span{font-size:12px;color:var(--dsw-alias-label-tertiary,#888);}",
        ".dms_toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}",
        ".dms_input,.dms_select,.dms_textarea{background:var(--dsw-alias-bg-layer-3,#222);color:inherit;border:1px solid var(--dsw-alias-border-l2,#333);border-radius:6px;padding:7px 9px;font:inherit;}",
        ".dms_input{min-width:230px;flex:1;}.dms_textarea{min-height:140px;width:100%;box-sizing:border-box;resize:vertical;}",
        ".dms_btn{cursor:pointer;border:1px solid var(--dsw-alias-border-l2,#333);background:var(--dsw-alias-bg-layer-3,#222);color:inherit;border-radius:6px;padding:7px 11px;font:inherit;}",
        ".dms_btn:hover{background:var(--dsw-alias-interactive-bg-hover,#2a2a2a);}.dms_btn.primary{background:var(--dsw-alias-state-business-primary,#4b7bec);color:#fff;border-color:transparent;}",
        ".dms_btn.danger{color:var(--dsw-alias-state-error-primary,#e74c3c);}",
        ".dms_list{display:flex;flex-direction:column;gap:8px;}",
        ".dms_row{border:1px solid var(--dsw-alias-border-l2,#333);border-radius:8px;padding:10px 12px;background:var(--dsw-alias-bg-layer-1,#181818);}",
        ".dms_rowHead{display:flex;gap:8px;align-items:center;justify-content:space-between;}.dms_rowTitle{font-weight:600;}",
        ".dms_meta{font-size:12px;color:var(--dsw-alias-label-tertiary,#888);display:flex;gap:8px;flex-wrap:wrap;}",
        ".dms_body{font-size:13px;color:var(--dsw-alias-label-secondary,#bbb);margin-top:6px;white-space:pre-wrap;max-height:86px;overflow:hidden;}",
        ".dms_form{display:flex;flex-direction:column;gap:10px;border:1px solid var(--dsw-alias-border-l2,#333);border-radius:8px;padding:12px;background:var(--dsw-alias-bg-layer-1,#181818);}",
        ".dms_field{display:flex;flex-direction:column;gap:4px;font-size:13px;}.dms_error{color:var(--dsw-alias-state-error-primary,#e74c3c);font-size:13px;}",
        ".dms_rowActions{display:flex;gap:6px;}"
      ].join("");
      document.head.appendChild(style);
    }

    async function api(method, payload) {
      const response = await fetch(API + "/" + method, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload || {}) });
      const body = await response.json().catch(() => null);
      if (!response.ok || body?.ok !== true) throw new Error(body?.error?.message || ("HTTP " + response.status));
      return body.value;
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

        const load = React.useCallback(async (nextScope, nextQuery) => {
          setLoading(true); setError("");
          try {
            const [state, rows] = await Promise.all([
              api("state"),
              nextQuery ? api("search", { query: nextQuery, scope: nextScope, limit: 50 }) : api("list", { scope: nextScope, allScopes: nextScope === "all" })
            ]);
            setStatus(state); setItems(rows || []);
          } catch (failure) { setError(String(failure.message || failure)); }
          finally { setLoading(false); }
        }, []);

        React.useEffect(() => { void load(scope, ""); }, [scope, load]);

        const submitSearch = (event) => { event.preventDefault(); void load(scope, query.trim()); };
        const refresh = () => { void load(scope, query.trim()); };
        const flush = async () => { setError(""); try { await api("flush"); refresh(); } catch (failure) { setError(String(failure.message || failure)); } };
        const startNew = () => setDraft({ id: "", title: "", description: "", body: "", type: "fact", scope: scope === "global" ? "global" : "workspace", revision: null });
        const startEdit = (item) => setDraft({ id: item.id, title: item.title, description: item.description, body: item.body, type: item.type, scope: item.scope === "global" ? "global" : "workspace", revision: item.revision });
        const forget = async (item) => { if (!window.confirm(t("confirmDelete") + " #" + item.id)) return; try { await api("forget", { id: item.id, scope: item.scope === "global" ? "global" : "workspace" }); refresh(); } catch (failure) { setError(String(failure.message || failure)); } };
        const save = async () => {
          if (!draft || !draft.body.trim()) return;
          setError("");
          try {
            const base = { title: draft.title, description: draft.description, body: draft.body, type: draft.type, scope: draft.scope };
            const result = draft.id ? await api("update", { ...base, id: draft.id, expectedRevision: draft.revision }) : await api("save", base);
            if (result && result.conflict) { setError(t("conflict")); setDraft({ ...draft, revision: result.latest.revision }); return; }
            setDraft(null); refresh();
          } catch (failure) { setError(String(failure.message || failure)); }
        };

        const stat = (label, value) => h("div", { className: "dms_stat", key: label }, h("b", null, String(value == null ? "—" : value)), h("span", null, label));
        return h("div", { className: "dms_page" },
          h("div", { className: "dms_head" }, h("div", { className: "dms_title" }, t("title")), h("div", { className: "dms_desc" }, t("description"))),
          status ? h("div", { className: "dms_stats" },
            stat(t("notes"), status.notes), stat(t("active"), status.active),
            stat(t("pending"), status.capture?.pending || 0), stat(t("failed"), status.capture?.failed || 0),
            stat(t("extractor"), status.extractor ? "on" : "off")) : null,
          h("form", { className: "dms_toolbar", onSubmit: submitSearch },
            textField({ value: query, placeholder: t("searchPlaceholder"), icon: icon("IconSearchOutlineRegular"), onChange: (event) => setQuery(event.target.value) }),
            h("select", { className: "dms_select", value: scope, onChange: (event) => setScope(event.target.value) },
              h("option", { value: "workspace" }, t("workspace")), h("option", { value: "global" }, t("global")), h("option", { value: "all" }, t("all"))),
            action(t("search"), { type: "submit", variant: "primary" }, "IconSearchOutlineRegular"),
            action(t("refresh"), { type: "button", onClick: refresh, variant: "ghost" }, "IconRefreshOutlineRegular"),
            action(t("flush"), { type: "button", onClick: flush, variant: "ghost" }, "IconDatabaseOutlineRegular"),
            action(t("newMemory"), { type: "button", onClick: startNew, variant: "ghost" }, "IconPlusOutlineRegular")),
          error ? h("div", { className: "dms_error" }, error) : null,
          draft ? h("div", { className: "dms_form" },
            h("label", { className: "dms_field" }, t("titleField"), h("input", { className: "dms_input", value: draft.title, onChange: (event) => setDraft({ ...draft, title: event.target.value }) })),
            h("label", { className: "dms_field" }, t("descriptionField"), h("input", { className: "dms_input", value: draft.description, onChange: (event) => setDraft({ ...draft, description: event.target.value }) })),
            h("label", { className: "dms_field" }, t("bodyField"), h("textarea", { className: "dms_textarea", value: draft.body, onChange: (event) => setDraft({ ...draft, body: event.target.value }) })),
            h("div", { className: "dms_toolbar" },
              h("label", { className: "dms_field" }, t("typeField"), h("select", { className: "dms_select", value: draft.type, onChange: (event) => setDraft({ ...draft, type: event.target.value }) }, TYPES.map((type) => h("option", { key: type, value: type }, type)))),
              h("label", { className: "dms_field" }, t("scopeField"), h("select", { className: "dms_select", value: draft.scope, onChange: (event) => setDraft({ ...draft, scope: event.target.value }) }, h("option", { value: "workspace" }, t("workspace")), h("option", { value: "global" }, t("global"))))),
            h("div", { className: "dms_toolbar" }, action(t("save"), { type: "button", onClick: save, variant: "primary" }), action(t("cancel"), { type: "button", onClick: () => setDraft(null), variant: "ghost" }))) : null,
          loading ? h("div", { className: "dms_desc" }, t("loading")) : items.length === 0 ? h("div", { className: "dms_desc" }, t("empty")) : h("div", { className: "dms_list" },
            items.map((item) => h("div", { className: "dms_row", key: item.id },
              h("div", { className: "dms_rowHead" },
                h("div", { className: "dms_rowTitle" }, item.title || item.id),
                h("div", { className: "dms_rowActions" }, action(t("edit"), { type: "button", onClick: () => startEdit(item), variant: "ghost" }, "IconEditOutlineRegular"), action(t("delete"), { type: "button", onClick: () => forget(item), variant: "ghost" }, "IconTrashOutlineRegular"))),
              h("div", { className: "dms_meta" }, tag(item.type), tag(item.scope), t("revision") + " " + item.revision, item.updatedAt || ""),
              h("div", { className: "dms_body" }, item.description ? item.description + "\n" : "", item.body || "")))));
      };
    }

    installStyle();
    return {
      inject: ["slots", "locale"],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-memory-service: dictionaries");
        const t = ctx.locale.bind(NS);
        const Page = createPage(t);
        ctx.slots.inject("settings.section", () => ctx.slots.register({ name: "settings.section", id: "memory-service", order: 70, label: () => t("section") }, Page));
      }
    };
  }
});
