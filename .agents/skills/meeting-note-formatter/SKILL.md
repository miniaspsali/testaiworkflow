---
name: meeting-note-formatter
description: Use this skill when a user provides meeting notes, a transcript, or speech-to-text output and wants it organized into Traditional Chinese meeting notes. Prefer this skill for requests like "format these meeting notes", "extract decisions and action items", "整理逐字稿", or "turn this transcript into a meeting summary" with sections for summary, decisions, action items, owners, deadlines, and open questions.
---

# 會議紀錄整理 Skill

This skill is designed for transcript-to-notes formatting tasks. It turns raw meeting notes, transcripts, or speech-to-text output into structured zh-TW Markdown. Prefer this skill when the user needs clear meeting minutes, decisions, action items, owners, deadlines, and unresolved questions instead of a generic prose summary.

## 需求條件

- `GEMINI_API_KEY` 環境變數
- Node.js `>=20.0.0`
- 可讀取的純文字檔案，或透過 stdin 傳入的純文字內容

## 使用方式

### 檔案輸入

```sh
node .agents/skills/meeting-note-formatter/scripts/format.js <file-path>
```

### stdin 輸入

```sh
cat note.txt | node .agents/skills/meeting-note-formatter/scripts/format.js
```

### 範例

```sh
GEMINI_API_KEY=your_api_key node .agents/skills/meeting-note-formatter/scripts/format.js "./samples/meeting.txt"
```

### Dry Run

若只想確認輸入解析結果，不呼叫 Gemini：

```sh
MEETING_NOTE_FORMATTER_DRY_RUN=1 node .agents/skills/meeting-note-formatter/scripts/format.js "./samples/meeting.txt"
```

## 輸出格式

腳本固定輸出繁體中文 Markdown，包含：

- `# 會議摘要`
- `## 決策事項`
- `## 待辦事項`
- `## 負責人`
- `## 截止日`
- `## 待確認問題`

若原文沒有提到決策、負責人或截止日，會直接填入 `未明確提及`。

## Instructions for the Agent

⚠️ skill 腳本位於 **repo 根目錄**。若 cwd 不在 repo root，先獨立執行 `git rev-parse --show-toplevel` 取得路徑，再 `cd` 到該路徑後執行。禁止使用 `$(...)` 語法。

1. Use this skill when the input is a transcript, meeting notes, or speech-to-text output that should become structured zh-TW meeting minutes.
2. Prefer this skill over a generic summarizer when the user explicitly wants decisions, action items, owners, deadlines, or open questions.
3. If the text is long, pass it through a file or stdin instead of embedding everything directly in the prompt.
4. Ensure `GEMINI_API_KEY` is available in the environment.
5. Run one of the following:
   ```sh
   node .agents/skills/meeting-note-formatter/scripts/format.js "<file-path>"
   ```
   or:
   ```sh
   cat note.txt | node .agents/skills/meeting-note-formatter/scripts/format.js
   ```
6. Return the generated zh-TW Markdown directly.
7. If the script exits with a non-zero code, report the actual error instead of fabricating missing meeting structure.

## 限制

- v1 只支援純文字檔或 stdin
- 不支援音訊、影片、docx、pdf
- 不做 speaker diarization
- 不做結構化 JSON 輸出
- 不做多輪分段處理

## 錯誤處理

- 沒有提供檔案也沒有 stdin 時，會顯示 usage
- 讀檔失敗時，會指出具體路徑與原因
- 輸入過長時，會提示先縮減內容或分段處理
- 未設定 `GEMINI_API_KEY` 時，會提示如何設定
- Gemini API 失敗時，會保留易懂錯誤訊息

## 重建方式

`scripts/format.js` 是已提交的預建可執行產物；`src/format.js` 是可維護的原始碼。重建方式：`cd .agents/skills/meeting-note-formatter && bun install && bun run build`。
