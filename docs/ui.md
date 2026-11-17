# UI：复用 DSH 现有前端

## 复用了什么

DSH 的记忆插件前端不是独立页面，而是注册到宿主设置页：

- 页面槽位：`settings.section`。
- 客户端模块：`window.__ModuleLoader__.load({ id, factory(require) })`。
- 运行时：宿主提供 `react`、`react-dom`、`@deepseek-ai/dsh-client-ui-primitives` 等静态模块。
- 主题：使用 `--dsw-alias-*` 设计变量，不写死颜色。
- 图标：使用官方 `Icon*OutlineRegular` 组件，例如 `IconSearchOutlineRegular`、`IconRefreshOutlineRegular`、`IconPlusOutlineRegular`、`IconTrashOutlineRegular`、`IconEditOutlineRegular`、`IconDatabaseOutlineRegular`。
- locale：`ctx.locale.register` + `ctx.locale.bind`。

官方 `@deepseek-ai/dsh-client-ui-primitives` 里可用的组件包括：

`Button`、`Input`、`Tag`、`Pill`、`Switch`、`StateDot`、`SegmentedTabs`、`SettingsForm`、`SettingsValueField`、`Modal`、`Toast`、`Tooltip`，以及大量 `Icon...`。

当前页面用了官方的设置页外壳、locale、设计变量和图标；表单控件还是原生 input/select/textarea，因为 `SettingsForm` 绑定的是宿主 settings namespace，不适合直接编辑记忆 CRUD 数据。后续可以把编辑表单迁到 `SettingsValueField`，把按钮迁到 `Button`，需要先确认它们的 props 契约。

## 页面能力

Settings → 记忆：

- 查看笔记数、有效数、队列 pending/failed、模型抽取开关；
- 按当前工作区/全局/全部工作区查看；
- 搜索标题、描述、正文；
- 新增、编辑（带 revision CAS）、软遗忘；
- 手动 drain 捕获队列。

## 宿主 API

前端不能读文件，所有数据走宿主路由：

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

实现：[src/api.mjs](../src/api.mjs)。路由通过 `ctx.inject(['webServer'])` 懒挂载；headless profile 没有 webServer 时自动跳过，不影响记忆工具。

请求走同源 JSON；`admits` 使用 `connection.requestRejection`，不自己造认证。

## 客户端入口

`package.json`：

~~~json
{
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "platform": "web",
      "immediately": true,
      "inject": [
        "@deepseek-ai/dsh-client-runtime",
        "@deepseek-ai/dsh-client-ui-settings",
        "@deepseek-ai/dsh-client-locale",
        "@deepseek-ai/dsh-client-ui-primitives"
      ]
    }
  }
}
~~~

`client.js` 无需构建：module loader 直接把源码交给浏览器，`require` 由宿主提供。

## 验证边界

已做：

- `client.js` 注册 `settings.section` 的单元测试；
- `src/api.mjs` 的 POST/错误/鉴权单元测试；
- 27 个测试全过。

未做：

- 没有在真实 Web 设置页里截图验收；
- 没有确认 `Button`/`SettingsValueField` 的完整 props 契约，所以还没替换原生控件；
- 没有 Web 端 e2e（headless 仍是主路径）。

下一步：把包装进一个 web test profile，启动真实 web，检查设置页布局/按钮/图标，再决定哪些原生控件替换为 primitives。
