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
