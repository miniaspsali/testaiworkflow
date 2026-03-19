import { GoogleGenAI } from "@google/genai";
import { readFile } from "node:fs/promises";

const DEFAULT_MODEL = "gemini-3-flash-preview";
const MAX_INPUT_LENGTH = 120000;

function printUsage() {
  console.error("用法：");
  console.error("  node scripts/format.js <file-path>");
  console.error("  cat note.txt | node scripts/format.js");
}

function ensureApiKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "缺少 GEMINI_API_KEY。請先執行 export GEMINI_API_KEY=your_api_key"
    );
  }
  return apiKey;
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function scrubNoise(value) {
  return normalizeText(value)
    .replace(/^transcript:\s*/gim, "")
    .replace(/^speaker \d+:\s*/gim, (match) => match.trim())
    .replace(/^\[(music|applause|silence|noise)\]$/gim, "")
    .trim();
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function resolveInput() {
  const filePath = process.argv[2];
  if (filePath) {
    const content = await readFile(filePath, "utf8").catch((error) => {
      throw new Error(`讀取檔案失敗：${filePath}（${error.message}）`);
    });

    return {
      source: "file",
      label: filePath,
      text: content,
    };
  }

  if (!process.stdin.isTTY) {
    const content = await readStdin();
    return {
      source: "stdin",
      label: "stdin",
      text: content,
    };
  }

  throw new Error("請提供檔案路徑，或透過 stdin 傳入逐字稿內容。");
}

function trimContent(value, maxLength = MAX_INPUT_LENGTH) {
  const normalized = scrubNoise(value);
  if (normalized.length <= maxLength) {
    return { text: normalized, truncated: false };
  }

  return {
    text: `${normalized.slice(0, maxLength)}\n\n[內容因長度限制已截斷]`,
    truncated: true,
  };
}

function buildPrompt({ sourceLabel, content, truncated }) {
  return `你是一個專門整理會議逐字稿與會議紀錄的繁體中文助理。請將以下內容整理成固定格式的 zh-TW Markdown。

規則：
1. 全文使用繁體中文（zh-TW）。
2. 不要虛構原文沒有提到的資訊。
3. 若某欄沒有資訊，請填「未明確提及」。
4. 待辦事項要盡量具體，並對應到具體負責人。
5. 只輸出最終 Markdown，不要補充說明。

請使用以下格式：

# 會議摘要

（用 1 至 2 段整理重點）

## 決策事項
- ...

## 待辦事項
- ...

## 負責人
- ...

## 截止日
- ...

## 待確認問題
- ...

補充資訊：
- 輸入來源：${sourceLabel}
- 內容是否截斷：${truncated ? "是" : "否"}

原始內容：
"""
${content}
"""`;
}

async function main() {
  if (!process.argv[2] && process.stdin.isTTY) {
    printUsage();
    process.exit(1);
  }

  const resolved = await resolveInput();
  const prepared = trimContent(resolved.text);

  if (!process.argv[2] && resolved.source === "stdin" && !prepared.text) {
    printUsage();
    process.exit(1);
  }

  if (!prepared.text) {
    throw new Error("輸入內容是空的，無法整理會議紀錄。");
  }

  if (process.env.MEETING_NOTE_FORMATTER_DRY_RUN === "1") {
    process.stdout.write(
      `${JSON.stringify(
        {
          source: resolved.source,
          label: resolved.label,
          contentLength: prepared.text.length,
          truncated: prepared.truncated,
          preview: prepared.text.slice(0, 280),
        },
        null,
        2
      )}\n`
    );
    return;
  }

  const apiKey = ensureApiKey();
  const client = new GoogleGenAI({ apiKey });
  const prompt = buildPrompt({
    sourceLabel: resolved.label,
    content: prepared.text,
    truncated: prepared.truncated,
  });

  console.error(`正在整理會議內容：${resolved.label}`);
  const stream = await client.interactions.create({
    model: DEFAULT_MODEL,
    input: prompt,
    stream: true,
  });

  for await (const chunk of stream) {
    if (
      chunk.event_type === "content.delta" &&
      chunk.delta?.type === "text" &&
      chunk.delta.text
    ) {
      process.stdout.write(chunk.delta.text);
    }
  }

  process.stdout.write("\n");
}

main().catch((error) => {
  console.error(`錯誤：${error.message || error}`);
  process.exit(1);
});
