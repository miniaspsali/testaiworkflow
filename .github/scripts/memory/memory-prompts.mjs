const DEFAULT_LANGUAGE = '繁體中文（zh-TW）';

function formatTimestampValue(value) {
  return new Date(value).toISOString();
}

export function buildIssueAgentPrompt({
  issueThread,
  conversationSource,
  language = DEFAULT_LANGUAGE,
}) {
  return [
    `請以${language}輸出一個精簡 JSON 物件，內容將會寫入 .memory/agents/issue-${issueThread.number}.json。`,
    '每一個 GitHub issue 都視為一隻龍蝦 agent；你現在要整理這隻龍蝦的對話記錄與工作脈絡。',
    '整體視角是：龍蝦正在替主人記住生活與工作中的這條支線，方便之後繼續陪主人前進。',
    '這些內容主要來自 Telegram 拉進來的對話紀錄與後續留言。',
    '不要複製完整原文，要做分析、濃縮與狀態判斷。',
    '請只輸出單一 JSON 物件，不要輸出 Markdown、前言、解釋、或程式碼區塊。',
    'JSON 必須包含這些 keys：`status`、`recentActivity`、`decisions`、`completedWork`、`openTasks`。',
    '- 用繁體中文，語氣像一隻可靠的龍蝦在替主人整理記憶；內容仍要保有工程可接手性。',
    '- 要從 issue title、issue body、Telegram 對話與留言中辨識這隻龍蝦的角色與功能，並以這個角色來記錄事情。',
    '- `status` 必須是單一字串，先判斷這個 issue 目前是活躍、阻塞、等待、已完成、或資訊不明，並說明原因。',
    '- `recentActivity`、`decisions`、`completedWork`、`openTasks` 都必須是字串陣列。',
    '- `recentActivity` 要優先整理最近一輪對話中這隻龍蝦實際幫主人做了什麼、回覆了什麼、目前推進到哪裡。',
    '- `decisions` 要列出已經定下來的方向；如果沒有明確決策，要放一條明確說明。',
    '- `completedWork` 與 `openTasks` 要分清楚已完成與未完成事項。',
    '- 這份記憶要總結對話過程與工作脈絡，不是單純事件 log；要寫出為什麼這些對話重要。',
    '- 如果某些 Telegram 對話只是確認或閒聊，只保留對後續接手工作有用的資訊。',
    '- 每個陣列最多 5 條，每條盡量控制在 1 句內，避免冗長。',
    '',
    '以下是 issue metadata 與對話內容：',
    '',
    `<issue-agent number="${issueThread.number}" state="${issueThread.state}" comments="${issueThread.comments.length}">`,
    conversationSource.text,
    '</issue-agent>',
  ].join('\n');
}

export function buildDailyPrompt({
  repo,
  issueState,
  issueLimit,
  sinceDays,
  generatedAt,
  agentMemories,
  omittedAgentCount = 0,
  language = DEFAULT_LANGUAGE,
}) {
  const agentBlocks = agentMemories.map((agentMemory) =>
    [
      `<agent issue="${agentMemory.issueNumber}" path="${agentMemory.relativePath}" state="${agentMemory.state}" updatedAt="${agentMemory.updatedAt}">`,
      `Title: ${agentMemory.title}`,
      `Labels: ${agentMemory.labels.join(', ') || 'none'}`,
      `Assignees: ${agentMemory.assignees.join(', ') || 'none'}`,
      `Participants: ${agentMemory.participants.join(', ') || 'none'}`,
      `Summary JSON: ${agentMemory.promptSummaryJson || agentMemory.summaryJson || '{}'}`,
      '</agent>',
    ].join('\n'),
  );

  return [
    `請以${language}輸出一份高品質 Markdown 片段，這會被放進某一天的 daily memory snapshot。`,
    '你會讀到同一天整理出的多個 issue agents 精簡摘要。',
    '請把它們寫成多隻龍蝦一起替主人記下今天生活與工作的方式。',
    '請彙整今天這些 agents 幫主人處理了什麼、哪些主題正在推進、哪些問題仍未解。',
    '不要輸出額外標題，請直接從 `## Agent Activity` 開始。',
    '必須包含這些章節：`## Agent Activity`、`## Cross-Issue Themes`、`## Decisions`、`## Open Loops`。',
    '- 用繁體中文，語氣像龍蝦群在替主人整理今日記憶；內容仍要保有工程可讀性。',
    '- 要優先描述主人今天經歷了哪些工作／生活脈絡、今日進展與跨 issue 關聯，而不是逐字複製單一 issue 摘要。',
    '- 需要時請引用 issue 編號，例如 `#37`。',
    '- 若沒有明確進展或資料不足，必須直接寫出來。',
    '',
    '整理視窗：',
    `- Repository: ${repo.fullName}`,
    `- Generated at: ${formatTimestampValue(generatedAt)}`,
    `- Issue state: ${issueState}`,
    `- Issue limit: ${issueLimit}`,
    `- Since days: ${sinceDays}`,
    ...(omittedAgentCount > 0
      ? [
          `- Earlier agents omitted to fit the provider profile: ${omittedAgentCount}`,
        ]
      : []),
    '',
    '以下是今天的 issue agents；每個區塊內的 `Summary JSON` 是該 issue 的精簡記憶：',
    '',
    ...agentBlocks,
  ].join('\n');
}

export function buildMemoryContextPrompt({
  memoryDir,
  sources,
  language = DEFAULT_LANGUAGE,
}) {
  if (!Array.isArray(sources) || sources.length === 0) {
    throw new Error('No memory sources were provided.');
  }

  const sourceBlocks = sources.map((source) =>
    [
      `<source label="${source.label}" path="${source.relativePath}">`,
      source.content,
      '</source>',
    ].join('\n'),
  );

  return [
    `請以${language}輸出一份高品質 Markdown 文件，檔名將會是 MEMORY.md。`,
    '你會讀到一份人工維護的 shared notes，外加多份按日期整理過的 daily memory snapshots。',
    '這些 daily snapshots 是從當天活躍的 issue agents 彙整而來。',
    '整體視角是：一群龍蝦正在替主人整理長期記憶，記住主人的生活、工作脈絡、習慣、限制與未完成事項。',
    '請先整合判斷、再輸出結論，不要輸出中間推理過程。',
    `這些內容都來自 memory 目錄：${memoryDir}`,
    '請把 daily 的反覆資訊往上蒸餾成長期可重用的 repo context，避免逐段複製原文。',
    'MEMORY.md 應該是龍蝦群替主人保留的 curated long-term memory，不是原始日誌，也不是索引頁。',
    '如果某件事只在最新一天短暫出現，且還看不出是穩定事實，請放在近期主題或 open loop，不要寫成穩定規則。',
    '輸出要求：',
    '- 第一行必須是 `# Repository Memory`。',
    '- 必須包含 `## Stable Context`、`## Recent Themes`、`## Constraints`、`## Open Loops` 四節。',
    '- 內容請以繁體中文撰寫，語氣像龍蝦在替主人記住重要的生活／工作脈絡，但仍要保有工程可讀性。',
    '- 優先提煉主人長期穩定的規則、近期反覆出現的主題、重要限制與未完成事項，不要只是重複 issue 標題。',
    '- 若資訊不足或彼此矛盾，要明確指出不確定性。',
    '',
    '以下是來源內容：',
    '',
    ...sourceBlocks,
  ].join('\n');
}
