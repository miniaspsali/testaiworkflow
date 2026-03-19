# Tool Package 規格

這份 reference 用來描述目前這個 repo 的 `tools/` workspace 慣例。

## Workspace 層級規則

- `tools/` 是獨立的 `pnpm` workspace
- 主要 build 入口是 `cd tools && pnpm build`
- 打包後的 JS tools 輸出到 `tools/dist/`
- `tools/dist/index.js` 會自動聚合所有已 build 的 tool

## 標準 package 結構

```text
tools/src/<tool-name>/
├── package.json
├── tool.json
├── vite.config.ts
├── tsconfig.json
├── README.md
├── skill/
│   ├── SKILL.md
│   └── references/
│       └── ...
└── src/
    ├── cli.ts
    ├── core.ts
    └── tool.ts
```

## 各檔案責任

### `tool.json`

給系統讀的 tool contract。

主要用來放：

- `name`
- `description`
- `inputSchema`
- `runtime`

不要因為未來可能有用，就先塞進目前 runtime 還不支援的欄位。

### `src/tool.ts`

可執行的 tool definition。

責任是：

- import `tool.json`
- attach `handler`
- map runtime secrets from `context.secrets`
- return serializable output

### `src/core.ts`

可重用的邏輯與 API client 程式碼。

把商業邏輯盡量放這裡，讓 CLI 和 tool handler 可以共用。

### `src/cli.ts`

CLI 入口或 placeholder。

如果 CLI 尚未完成，就維持最小 placeholder，不要虛構不存在的行為。

### `README.md`

給人看的說明文件。

至少應說明：

- what the tool does
- how agents should use it
- supported input parameters
- runtime secret expectations
- expected return format
- build outputs

### `skill/`

工具 package 內附帶的 skill 檔案目錄。

## Runtime secret 模式

建議 metadata 長這樣：

```json
{
  "runtime": {
    "secrets": {
      "apiKey": "FELO_API_KEY"
    }
  }
}
```

對應的 handler 建議長這樣：

```ts
async handler(args, context) {
  return doSomething(args, {
    apiKey: context?.secrets?.apiKey
  });
}
```

## 輸出規則

build 後應預期看到：

```text
tools/dist/
├── index.js
└── <tool-name>.js
```

## 目前範例

除非使用者明確要調整標準，否則以 `tools/src/felo-cli/` 作為目前格式的實作範例。
