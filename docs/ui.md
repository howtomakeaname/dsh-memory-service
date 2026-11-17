# UI：复用 DSH 设置页与工具调用

## 截图

### Settings → 记忆

![记忆设置页列表](screenshots/memory-settings-list.png)

### 单条记忆详情

![单条记忆详情](screenshots/memory-detail.png)

### 工具调用卡片

![memory_save 工具卡片](screenshots/memory-tool-card.png)

### DSH Menu 下拉

![类型下拉复用 DSH Menu](screenshots/memory-dropdown.png)

### 冲突详情

![冲突详情与保留版本](screenshots/memory-conflict.png)

截图来自真实 DSH Web：

- DSH web app `0.2.2-rc.3`
- 测试 profile：`bench-memt-web`
- 真实 Settings 弹层、真实会话，不是静态 mock。

## 复用了什么

### 设置页外壳

- slot：`settings.section`
- 客户端模块：`window.__ModuleLoader__.load({ id, factory(require) })`
- locale：`ctx.locale.register` / `ctx.locale.bind`
- 图标：官方 `Icon*OutlineRegular`
- 主题：`--dsw-alias-*` CSS 变量

### primitives

当前页面实际使用：

- `Button`：搜索、刷新、处理队列、新增、编辑、遗忘、返回、复制 ID
- `Input`：搜索框、标题、描述
- `Tag`：类型、scope、模型抽取状态
- `SegmentedTabs`：工作区 / 全局 / 全部
- `DisclosureRow`：工具调用折叠行
- `Menu` / `MenuItemButton`：表单里的类型、scope 下拉
- 图标：`IconSearchOutlineRegular`、`IconRefreshOutlineRegular`、`IconDatabaseOutlineRegular`、`IconPlusOutlineRegular`、`IconEditOutlineRegular`、`IconTrashOutlineRegular`、`IconChevronLeftOutlineRegular`、`IconCopyOutlineRegular`、`IconCheckOutlineRegular`、`IconInfoOutlineRegular`、`IconUserOutlineRegular`、`IconChecklistOutlineRegular`、`IconBrowseOutlineRegular`、`IconDataOutlineRegular`

原生控件只保留：

- `textarea`：多行正文；
- 列表行：需要整行点击和复合内容，用原生 `button` 承载，内部仍用 DSH token/Tag/icon。

类型/scope 已从原生 `<select>` 换成 DSH `Menu` + `MenuItemButton`；只有 primitives 不可用时才回退原生 select。

## 页面结构

### 列表

- 顶部摘要：笔记/有效/冲突/待处理/失败 + 模型抽取状态；
- 搜索单独一行；
- 筛选组和操作组分开：scope + 冲突筛选在左，刷新/队列/新增图标在右，避免挤成一排；
- 列表行显示类型图标、标题、描述、type/scope、更新时间；
- 点击整行进入单条详情；
- 有冲突时可切换“只看冲突”，列表只显示 `conflicted` 记忆。

### 单条记忆详情

- 独立 drill-down 视图，不是把列表行展开；
- 返回列表、复制 ID、编辑、遗忘；
- 展示 type/scope/revision/updated、完整正文、ID、sourceRefs；
- 编辑复用同一表单，带 revision CAS；
- `conflicted` 详情显示冲突对象和“保留此版本”，选择 winner 后 loser 转 superseded。

### 工具调用

注册 keyed slot：

~~~js
ctx.slots.inject("tool.call.toolview", function* () {
  for (const key of Object.keys(TOOL_LABELS)) {
    yield ctx.slots.register({ name: "tool.call.toolview", key, locale: NS }, ToolRow);
  }
});
~~~

覆盖：

`memory_search`、`memory_save`、`memory_get`、`memory_update`、`memory_forget`、`memory_flush`、`memory_conflicts`、`memory_resolve`、`memory_stats`。

卡片用公开 `DisclosureRow`，标题带工具动作和参数摘要；展开后显示 Arguments / Result。running / failed 状态沿用宿主 disclosure 语义。

## 宿主 API

前端不读文件，全部走同源 JSON：

~~~text
POST /memory-service/api/state
POST /memory-service/api/list
POST /memory-service/api/search
POST /memory-service/api/get
POST /memory-service/api/save
POST /memory-service/api/update
POST /memory-service/api/forget
POST /memory-service/api/flush
~~~

实现：`src/api.mjs`。路由通过 `ctx.inject(['webServer'])` 懒挂载；headless profile 没有 webServer 时自动跳过。

## 验证方式

1. 启动测试 profile：

~~~bash
dsh --profile bench-memt-web --port 54123 --host 127.0.0.1 --no-open
~~~

2. 浏览器打开打印出的 URL，侧边栏账号菜单 → 设置 → 记忆。
3. 验证列表、搜索、scope 切换、新增/编辑/遗忘、详情 drill-down。
4. 新建会话，让模型调用 `memory_save`，展开“已完成 → 已调用工具”，确认自定义卡片和展开后的 Arguments / Result。

## 已知限制

- 没有独立的 Playwright/浏览器 CI；这次是 CDP 驱动的真实 DSH 手动 e2e；
- 没有移动端/窄屏专门验证；
- 冲突解决一次处理当前记录标记的冲突对象，不做三方合并。
- textarea/select 仍是原生控件，因为 primitives 没有对应公开组件；
- 没有独立路由页，详情是 Settings 内 drill-down。
