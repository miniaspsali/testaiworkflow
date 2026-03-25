# Repository Memory

這份檔案是從 `daily/*.md` 蒸餾出來的長期 memory。

尚未建立整理後的長期 context。

請先產生 daily snapshots，再整理成這份 MEMORY.md：

- 觸發 `.github/workflows/compact-memory.yml`
- 執行 `node .github/scripts/memory/compact-memory.mjs`
- 執行 `node .github/scripts/memory/summarize-memory-context.mjs --memory-dir .memory --output .memory/MEMORY.md`
