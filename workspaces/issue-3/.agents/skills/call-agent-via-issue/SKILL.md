---
name: call-agent-via-issue
description: >-
  Use this skill when you need to delegate a task to another agent through a
  GitHub Issue comment and wait for the reply before continuing. Trigger it for
  requests like "ask another agent", "delegate this through an Issue", "透過
  Issue 叫另一個代理人處理", "請另一個 agent 幫我做", or any workflow that
  needs asynchronous agent-to-agent handoff with an explicit timeout.
---

# Call Agent via Issue

這個 skill 會把任務包裝成一則 GitHub Issue 留言，交給另一個正在監聽該 Issue 的代理人執行，並等待回覆。適合用在需要跨代理人協作、但又不能無限等待的情境。

這個 skill 資料夾內建可執行工具：

- `scripts/call-agent-via-issue.js`

## When to Use

優先使用這個 skill 的情況：

- 使用者明確要求你「請另一個代理人處理」或「透過 Issue 留言轉交任務」。
- 你需要把任務交給另一個已綁定特定 Issue 的代理人處理，而這個綁定是透過第一則 config comment 的 `name` 來辨識。
- 你需要等待外部代理人完成後，拿到結果再繼續。
- 你需要明確 timeout，避免流程卡住。

不要在以下情況使用：

- 你自己就能直接完成任務。
- 找不到明確的 `agent_name`，也無法從上下文合理推定。
- 沒有任何代理人在監聽該 Issue。

## Required Inputs

呼叫前先確認這三件事：

1. **agent_name**：要找哪一個 agent。系統會先掃描 repo 內所有 Issue，讀每個 Issue 的第一則留言；若那則留言是合法 JSON 且包含 `name`，就視為該 Issue 綁定的 agent 名稱。
2. **message**：要交給另一個代理人的完整任務說明。
3. **timeout_seconds**：最長等待時間。

如果你已經非常確定目標 Issue，也可以直接給 `issue_number` 當 fallback；但在目前這個 repo 的慣例下，應優先以 `agent_name` 找 agent。

## How to Execute

優先使用 skill 目錄內建的腳本，不要只描述做法。

### Prerequisites

- `GITHUB_TOKEN`
- `GITHUB_REPOSITORY`，格式必須是 `owner/repo`
- Node.js `>=20`

### Preferred Command

```sh
node .agents/skills/call-agent-via-issue/scripts/call-agent-via-issue.js \
  --agent "記帳小龍蝦" \
  --message-file /tmp/agent-task.txt \
  --timeout 600 \
  --poll 15 \
  --language "繁體中文（zh-TW）"
```

如果訊息很短，也可以直接用 `--message`：

```sh
node .agents/skills/call-agent-via-issue/scripts/call-agent-via-issue.js \
  --agent "記帳小龍蝦" \
  --message "請幫我分析這個錯誤，說明根因、影響範圍，以及建議修正方式。背景如下：..." \
  --language "繁體中文（zh-TW）"
```

如果你已經知道要直送的 Issue 編號，也支援相容舊流程：

```sh
node .agents/skills/call-agent-via-issue/scripts/call-agent-via-issue.js \
  --issue 42 \
  --message "請幫我分析這個錯誤，說明根因、影響範圍，以及建議修正方式。背景如下：..." \
  --language "繁體中文（zh-TW）"
```

如果目前執行環境另外也有註冊 `call_agent_via_issue` tool，可以直接呼叫；但也應優先用 `agent_name` 而不是手動指定 `issue_number`。這個 skill 不應依賴外部是否剛好有註冊，因為 skill 資料夾本身已附帶可執行工具。

## Agent Resolution Rule

目前這個 repo 的工作模型是：

- **一個 GitHub Issue 就是一個 agent**
- **Issue 的第一則留言** 是這個 agent 的 config comment
- 這則留言應該是 JSON，至少包含 `name` 與 `tools`

例如：

```json
{
  "name": "記帳小龍蝦",
  "description": "整理帳務",
  "goal": "協助分類支出",
  "tools": ["search", "sheet"]
}
```

因此，當使用者說「請找某個 agent 幫忙」時，先以 `agent_name` 為主，交給腳本去掃描所有 Issue 的第一則留言並找出對應目標，不要要求使用者先提供 `issue_number`。

## Message Construction Guidance

`message` 盡量一次講清楚，讓對方不用再追問。至少包含：

- 任務目標
- 背景脈絡
- 相關限制
- 預期輸出格式
- 若有需要，附上檔案路徑、Issue/PR 編號、錯誤訊息或驗證標準

### Recommended Prompt Template

```text
請協助處理以下任務。

目標：
- <要完成的事情>

背景：
- <必要背景>

限制：
- <時間、工具、不可做的事>

預期輸出：
- <你希望對方回覆的格式>

補充資訊：
- <檔案路徑 / 錯誤訊息 / issue / PR / 其他上下文>
```

## Timeout Guidance

- **120 秒內**：簡單查詢、單一分析、短回覆
- **300–600 秒**：一般代理人任務
- **600 秒以上**：只有在你確定對方需要較長時間時才使用

如果使用者沒有指定 timeout，先依任務複雜度自行設定保守值；一般情況可從 **300 秒** 開始。

## How to Handle the Result

腳本成功時會輸出 JSON，內容包含：

- `issueNumber`：最終解析到的 Issue 編號
- `agentName`：最終解析到的 agent 名稱
- `reply`：另一個代理人的純文字回覆
- `commentId`：你發出的留言 ID
- `replyCommentId`：對方回覆的留言 ID
- `commentUrl` / `replyCommentUrl`：對應留言網址
- `elapsedSeconds`：等待耗時

收到結果後：

1. 先確認 `reply` 是否已完整回答任務。
2. 若回覆內容可直接交付，就整理後回覆使用者。
3. 若回覆是中間結果，明確說明下一步。
4. 若工具逾時，回報 timeout，並附上 `commentUrl` 方便追查。

## Maintenance Note

若未來要調整行為，直接修改 `scripts/call-agent-via-issue.js` 即可。若同步有註冊 `call_agent_via_issue` tool，也要一併更新 `tools/src/call-agent-via-issue/` 內的 contract 與實作，避免 skill 與 tool 參數模型不一致。

## Safety Notes

- 不要把 secrets、token、密碼直接塞進 `message`。
- 不要對不受控或未知用途的 Issue 發送敏感內容。
- 如果你判斷會形成代理人互相呼叫的迴圈，先停下來並改用人工說明。
