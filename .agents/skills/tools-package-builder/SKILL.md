---
name: tools-package-builder
description: 在這個 repo 的 `tools/` workspace 中建立或修改 Tool package。當使用者要求新增 `tools/src/<name>` 小專案、建立 Tool/CLI 骨架、定義 `tool.json`、串接 runtime secrets，或調整輸出到 `tools/dist` 的流程時，都應使用這個技能。
---

當任務涉及這個 repo 的 `tools/` workspace 時，使用這個技能。

這個技能專門對應此 repo 目前的 Tool 專案慣例：

- 每個 tool 都是 `tools/src/<tool-name>/` 底下的一個獨立小專案
- machine-readable 的 contract 放在 `tool.json`
- 可執行的 handler 放在 `src/tool.ts`
- 共用邏輯放在 `src/core.ts`
- CLI 程式碼若需要，放在 `src/cli.ts`
- JS tool bundle 產出到 `tools/dist/`
- skill 檔案維護在 `tools/src/<tool-name>/skill/`

在建立或調整 Tool package 前，先讀 [references/tool-package-spec.md](references/tool-package-spec.md)。

## 工作方式

1. 先判斷使用者要的是哪一種：
   - 全新的 tool package
   - 修改既有的 `tools/src/<tool-name>/`
   - 修改共用的 `tools/` build 或 sync 流程
2. 只要任務涉及 package 結構或慣例，除非使用者明確要求例外，否則一律遵守 reference spec。
3. 把 metadata、runtime secret 綁定、handler 邏輯分開：
   - `tool.json` 定義 tool contract
   - `src/tool.ts` 補上 handler
   - `README.md` 提供人類可讀的說明
4. 如果 tool 需要 credentials，不要把 secret 放進 `inputSchema`。
   應該把 secret 綁定寫在 `tool.json -> runtime.secrets`，並依賴 `ClawBrain` 的 runtime secret injection。
5. 如果 CLI 還沒真正完成，就保留最小 placeholder，不要虛構一個其實不能用的 CLI。
6. 如果這個 tool 也要附帶 skill，請維護 `tools/src/<tool-name>/skill/` 內的內容。

## 新 tool package 的基本輸出

正常情況下，新的 package 至少要建立或確認這些檔案：

- `tools/src/<tool-name>/package.json`
- `tools/src/<tool-name>/tool.json`
- `tools/src/<tool-name>/vite.config.ts`
- `tools/src/<tool-name>/tsconfig.json`
- `tools/src/<tool-name>/README.md`
- `tools/src/<tool-name>/src/tool.ts`
- `tools/src/<tool-name>/src/core.ts`
- `tools/src/<tool-name>/src/cli.ts`

可選，但通常也會需要：

- `tools/src/<tool-name>/skill/SKILL.md`
- `tools/src/<tool-name>/skill/references/*`

## Metadata 規則

`tool.json` 只應該包含目前這套 tool system 真正有用到的欄位。

建議使用這個結構：

```json
{
  "name": "tool_name",
  "description": "What the tool does.",
  "inputSchema": {
    "type": "object",
    "properties": {},
    "required": [],
    "additionalProperties": false
  },
  "runtime": {
    "secrets": {}
  }
}
```

不要加入目前 `ClawBrain` runtime 還沒有支援的猜測性欄位。

## Runtime secret 規則

當 tool 需要 credentials 時：

- 不要把 secrets 放進 `inputSchema`
- 不要要求 LLM 傳真正的 key
- 應透過 `runtime.secrets` 做綁定

範例：

```json
{
  "runtime": {
    "secrets": {
      "apiKey": "FELO_API_KEY"
    }
  }
}
```

然後在 `src/tool.ts` 中，從 `context.secrets` 讀取解析後的值。

## Build 與驗證

修改完 workspace 後，優先用這個指令驗證：

```bash
cd tools
pnpm build
```

視任務需要，確認這些輸出是否存在：

- `tools/dist/<tool-name>.js`
- `tools/dist/index.js`

## 既有範例

目前這個 repo 的主要範例 package 是 `tools/src/felo-cli/`。除非使用者明確要改規格，否則以它作為參考實作。

## 回覆時要交代的內容

使用這個技能完成任務後，回覆中至少要交代：

- 建立或修改了哪些 package / 共用 tool 檔案
- 是否有執行 `pnpm build`
- 預期輸出是否出現在 `tools/dist/`
