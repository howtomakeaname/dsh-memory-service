# Install

## Local development

```bash
dsh plugin --profile <profile> add /absolute/path/to/dsh-memory-service
```

The profile bundle list is updated automatically. To override root or capture:

```yaml
# ~/.dsh/profiles/<profile>/cordis.patch.yml
- id: memory-service
  config:
    root: /absolute/path/to/memory
    capture: true
    budgetTokens: 1200
```

## Package

Once published:

```bash
dsh plugin --profile <profile> add dsh-memory-service
```

## Requirements

- DSH with plugin bundles (base + headless/desktop)
- Node >= 22.5 for `node:sqlite`
- No external services or API keys for memory itself; the host model handles extraction prompts

## 配置项

- `root`：记忆根目录，默认 `DSH_MEMORY_HOME` 或 `~/.dsh/memory-service`
- `capture`：是否自动捕获，默认 `true`
- `budgetTokens`：注入预算，200–8000，默认 1200
- `extractEveryTurns`：每 N 轮做一次模型抽取，1–50，默认 1
- `minConfidence`：抽取置信度下限，0–1，默认 0.55

非法数值会被 clamp 到合法范围并在日志里 warning。
- `queryExpansion`：是否用模型把问题改写成检索 query，默认 `true`
- `profileSynthesis`：是否把 preference/user 记忆合成短 profile，默认 `true`

## 从 GitHub Release 安装

~~~bash
npm install https://github.com/howtomakeaname/dsh-memory-service/releases/download/v0.1.0/dsh-memory-service-0.1.0.tgz
~~~

或下载 release 里的 `dsh-memory-service-0.1.0.tgz`，再用 `npm install ./dsh-memory-service-0.1.0.tgz`。npm registry 发布仍需要 npm 凭据。
