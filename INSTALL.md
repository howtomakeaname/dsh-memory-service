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
