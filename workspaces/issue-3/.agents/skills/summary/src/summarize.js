#!/usr/bin/env node
/**
 * Unified Summary Tool
 *
 * Auto-detects input type (URL / PDF / Video) and produces a
 * structured Traditional Chinese Markdown summary using Gemini.
 *
 * Usage:
 *   node scripts/summarize.js <url-or-file>
 *   node scripts/summarize.js --type url|pdf|video <input>
 */

import { GoogleGenAI } from "@google/genai";
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MODELS = {
  url: "gemini-3-flash-preview",
  pdf: "gemini-3-flash-preview",
  video: "gemini-3-flash-preview",
  audio: "gemini-3-flash-preview",
};

const MAX_CONTENT_LENGTH = 120_000;
const MIN_CONTENT_LENGTH = 200;
const FETCH_TIMEOUT_MS = 30_000;

const VIDEO_EXTENSIONS = new Set([
  ".3gp", ".avi", ".m4v", ".mkv", ".mov",
  ".mp4", ".mpeg", ".mpg", ".ogv", ".webm",
]);

const VIDEO_MIME_TYPES = {
  ".3gp": "video/3gpp",
  ".avi": "video/x-msvideo",
  ".m4v": "video/x-m4v",
  ".mkv": "video/x-matroska",
  ".mov": "video/quicktime",
  ".mp4": "video/mp4",
  ".mpeg": "video/mpeg",
  ".mpg": "video/mpeg",
  ".ogv": "video/ogg",
  ".webm": "video/webm",
};

const YOUTUBE_HOSTS = new Set([
  "youtube.com", "www.youtube.com", "m.youtube.com",
  "youtu.be", "www.youtu.be",
]);

const AUDIO_EXTENSIONS = new Set([
  ".mp3", ".wav", ".aac", ".ogg", ".flac", ".m4a", ".aiff", ".wma", ".opus",
]);

const AUDIO_MIME_TYPES = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
  ".flac": "audio/flac",
  ".m4a": "audio/mp4",
  ".aiff": "audio/aiff",
  ".wma": "audio/x-ms-wma",
  ".opus": "audio/opus",
};

// ---------------------------------------------------------------------------
// Shared Utilities
// ---------------------------------------------------------------------------

function printUsage() {
  console.error("用法：node scripts/summarize.js [--type url|pdf|video|audio] <input>");
  console.error("");
  console.error("範例：");
  console.error('  node scripts/summarize.js "https://example.com/post/123"');
  console.error('  node scripts/summarize.js "./reports/quarterly.pdf"');
  console.error('  node scripts/summarize.js "https://youtu.be/abc123"');
  console.error('  node scripts/summarize.js "./recording.mp3"');
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

function trimContent(value, maxLength = MAX_CONTENT_LENGTH) {
  const normalized = normalizeText(value);
  if (normalized.length <= maxLength) {
    return { text: normalized, truncated: false };
  }
  return {
    text: `${normalized.slice(0, maxLength)}\n\n[內容因長度限制已截斷]`,
    truncated: true,
  };
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`抓取逾時（${FETCH_TIMEOUT_MS / 1000} 秒）：${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function isRemoteUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function streamInteraction(stream) {
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

// ---------------------------------------------------------------------------
// Input Type Detection
// ---------------------------------------------------------------------------

function parseCliArgs() {
  const args = process.argv.slice(2);
  let type = null;
  let input = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--type" && i + 1 < args.length) {
      type = args[++i];
      if (!["url", "pdf", "video", "audio"].includes(type)) {
        throw new Error(`不支援的類型：${type}（可用：url, pdf, video, audio）`);
      }
    } else if (!input) {
      input = args[i];
    }
  }

  return { type, input };
}

function detectInputType(input) {
  if (!input) throw new Error("請提供輸入（URL 或檔案路徑）。");

  // data: URI → video
  if (input.startsWith("data:")) return "video";

  // URL-based detection
  if (isRemoteUrl(input)) {
    try {
      const url = new URL(input);
      const pathname = url.pathname.toLowerCase();

      // PDF URL
      if (pathname.endsWith(".pdf")) return "pdf";

      // Video URL
      const ext = path.extname(pathname);
      if (VIDEO_EXTENSIONS.has(ext)) return "video";

      // Audio URL
      if (AUDIO_EXTENSIONS.has(ext)) return "audio";

      // YouTube
      if (YOUTUBE_HOSTS.has(url.hostname)) return "video";

      // Default: treat as web page
      return "url";
    } catch {
      return "url";
    }
  }

  // Local file detection
  let localPath = input;
  if (input.startsWith("file://")) localPath = fileURLToPath(input);
  const ext = path.extname(localPath).toLowerCase();

  if (ext === ".pdf") return "pdf";
  if (VIDEO_EXTENSIONS.has(ext)) return "video";
  if (AUDIO_EXTENSIONS.has(ext)) return "audio";

  throw new Error(
    `無法辨識輸入類型：${input}。支援的格式：網頁 URL、.pdf 檔案、影片檔案（${[...VIDEO_EXTENSIONS].join(", ")}）、音訊檔案（${[...AUDIO_EXTENSIONS].join(", ")}）`
  );
}

// ---------------------------------------------------------------------------
// URL Handler
// ---------------------------------------------------------------------------

async function fetchHtml(url) {
  const response = await fetchWithTimeout(url, {
    redirect: "follow",
    headers: {
      "User-Agent":
        "GitHubClawDev/summary (+https://github.com/rewq0494/GitHubClawDev)",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(
      `抓取網址失敗：${url}（HTTP ${response.status} ${response.statusText}）`
    );
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/pdf")) {
    return { __pdfFallback: true };
  }
  if (
    !contentType.includes("text/html") &&
    !contentType.includes("application/xhtml+xml")
  ) {
    throw new Error(
      `網址不是可解析的 HTML 頁面：${url}（Content-Type: ${contentType || "unknown"}）。若為 PDF，請改用 --type pdf`
    );
  }
  return response.text();
}

function extractFromBody(document) {
  const root = document.querySelector("main, article, body");
  const title =
    normalizeText(document.querySelector("title")?.textContent || "") ||
    "未命名頁面";
  const siteName =
    normalizeText(
      document
        .querySelector('meta[property="og:site_name"]')
        ?.getAttribute("content") || ""
    ) || null;
  return {
    title,
    siteName,
    byline: null,
    excerpt: null,
    content: normalizeText(root?.textContent || ""),
    source: "body-fallback",
  };
}

function extractArticle(html, url) {
  const { document, window } = parseHTML(html);
  if (window?.document && !window.document.location) {
    window.document.location = new URL(url);
  }
  const article = new Readability(document).parse();
  if (!article?.textContent) return extractFromBody(document);

  return {
    title: normalizeText(article.title) || "未命名頁面",
    siteName: normalizeText(article.siteName || "") || null,
    byline: normalizeText(article.byline || "") || null,
    excerpt: normalizeText(article.excerpt || "") || null,
    content: normalizeText(article.textContent),
    source: "readability",
  };
}

function buildUrlPrompt({
  url,
  title,
  siteName,
  byline,
  excerpt,
  content,
  truncated,
}) {
  return `你是一個專門整理網頁內容的繁體中文編輯。請根據以下資料，輸出固定格式的 Markdown 摘要。

規則：
1. 全文必須使用繁體中文（zh-TW）。
2. 不要虛構原文沒有提到的資訊。
3. 若資訊不足，直接寫出限制。
4. 「三段摘要」必須剛好三段，每段至少 3–4 句，深入說明主題脈絡與細節，而非僅一句帶過。
5. 「重點條列」至少 7 點，每點需包含具體細節或範例。
6. 「行動建議」若沒有合理建議，請寫「目前無明確行動建議」。
7. 只輸出最終 Markdown，不要額外說明。
8. 盡可能保留原文的專有名詞（括號附上原文）。
9. 如有關鍵數字、日期、百分比等資料，請準確引用。

請使用以下格式：

# 內容摘要

## 來源
- 類型：網頁
- 標題：
- 網站：
- 作者：
- 網址：

## 三段摘要
（每段 3–4 句的深入摘要）

## 重點條列
- ...（至少 7 點，含具體細節）

## 關鍵數字與日期
| 項目 | 數值/日期 |
|------|----------|
（如有關鍵數字、金額、日期、百分比等，以表格呈現；若無則省略此段）

## 行動建議
- ...

以下是原始資料：
- 標題：${title}
- 網站：${siteName || "未提供"}
- 作者：${byline || "未提供"}
- 摘要：${excerpt || "未提供"}
- 網址：${url}
- 內容是否截斷：${truncated ? "是" : "否"}

原文內容：
"""
${content}
"""`;
}

async function handleUrl(input, client) {
  const url = (() => {
    try {
      return new URL(input).toString();
    } catch {
      throw new Error(`網址格式錯誤：${input}`);
    }
  })();

  console.error(`正在抓取網址：${url}`);
  const html = await fetchHtml(url);

  // Auto-fallback: if the URL serves a PDF, delegate to PDF handler
  if (html && html.__pdfFallback) {
    return { __pdfFallback: true, url };
  }

  console.error("正在抽取正文...");
  const article = extractArticle(html, url);
  const prepared = trimContent(article.content);

  if (prepared.text.length < MIN_CONTENT_LENGTH) {
    throw new Error(
      `無法從頁面抽出足夠正文：${url}。這可能是登入頁、動態頁，或頁面內容過少。`
    );
  }

  return {
    dryRunInfo: {
      detectedType: "url",
      url,
      title: article.title,
      siteName: article.siteName,
      byline: article.byline,
      source: article.source,
      contentLength: prepared.text.length,
      truncated: prepared.truncated,
      preview: prepared.text.slice(0, 280),
    },
    model: MODELS.url,
    interactionInput: buildUrlPrompt({
      url,
      title: article.title,
      siteName: article.siteName,
      byline: article.byline,
      excerpt: article.excerpt,
      content: prepared.text,
      truncated: prepared.truncated,
    }),
    cleanup: null,
  };
}

// ---------------------------------------------------------------------------
// PDF Handler
// ---------------------------------------------------------------------------

function buildPdfPrompt() {
  return `你是專業的文件分析助手。請仔細閱讀這份 PDF 文件的每一頁，並產出結構化的繁體中文摘要。請盡可能完整地涵蓋文件中的所有重要內容。

請使用以下格式：

# 內容摘要

## 來源
- 類型：PDF 文件
- 檔名：（請從文件內容推斷）

## 三段摘要
（三段完整摘要，每段至少 3–4 句，深入說明文件的核心主題、關鍵論述與結論。第一段介紹文件的主旨與背景，第二段展開核心內容與方法論，第三段總結結論與影響。）

## 重點條列
- 重點 1
- 重點 2
（至少列出 7 個重點，每點需包含具體細節、數據或範例，不要僅用一句概括）

## 關鍵數字與日期
| 項目 | 數值/日期 |
|------|----------|
（如有關鍵數字、金額、日期、百分比等，以表格呈現；若無則省略此段）

## 專有名詞表
| 術語 | 說明 |
|------|------|
（列出文件中出現的重要專有名詞與其簡要解釋，至少 5 個；若無明顯專有名詞則省略此段）

## 行動建議
（文件的主要結論，或閱讀後的建議行動，至少 2–3 點具體建議）

規則：
1. 全文使用繁體中文（zh-TW）
2. 不要虛構文件中沒有提到的資訊
3. 保留專有名詞的原文（括號附上）
4. 數字和日期必須準確引用，不可估算
5. 只輸出最終 Markdown，不要額外說明
6. 每一頁的重要內容都應被涵蓋，不要只摘要前幾頁`;
}

async function resolvePdfBuffer(rawInput) {
  if (!rawInput) throw new Error("請提供 PDF 檔案路徑或 URL。");

  const lower = rawInput.toLowerCase();
  if (!lower.endsWith(".pdf")) {
    try {
      const url = new URL(rawInput);
      if (!url.pathname.toLowerCase().endsWith(".pdf")) {
        console.error(`警告：輸入不像 PDF 檔案，仍嘗試處理：${rawInput}`);
      }
    } catch {
      console.error(`警告：輸入不像 PDF 檔案，仍嘗試處理：${rawInput}`);
    }
  }

  // Try local file first
  let localPath = rawInput;
  if (rawInput.startsWith("file://")) localPath = fileURLToPath(rawInput);
  const resolvedPath = path.resolve(localPath);

  try {
    const fileBuffer = await readFile(resolvedPath);
    return {
      source: "local-file",
      buffer: fileBuffer,
      mimeType: "application/pdf",
      localPath: resolvedPath,
      displayName: path.basename(resolvedPath),
    };
  } catch (error) {
    if (error?.code !== "ENOENT" && error?.code !== "ENOTDIR") {
      throw new Error(`無法讀取檔案 "${resolvedPath}"：${error.message}`);
    }
  }

  // Try remote URL
  if (isRemoteUrl(rawInput)) {
    console.error(`正在下載 PDF：${rawInput}`);
    const response = await fetchWithTimeout(rawInput);
    if (!response.ok)
      throw new Error(`下載失敗（HTTP ${response.status}）：${rawInput}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    const urlPath = new URL(rawInput).pathname;
    return {
      source: "remote-url",
      buffer,
      mimeType: "application/pdf",
      remoteUrl: rawInput,
      displayName: path.basename(urlPath) || "document.pdf",
    };
  }

  throw new Error(`輸入既非可讀取的本地檔案，也非有效的 URL：${rawInput}`);
}

async function uploadPdfAndGetUri(client, pdfInput) {
  console.error("正在上傳 PDF 至 Gemini Files API...");
  const blob = new Blob([pdfInput.buffer], { type: pdfInput.mimeType });
  let uploadedFile = await client.files.upload({
    file: blob,
    config: {
      mimeType: pdfInput.mimeType,
      displayName: pdfInput.displayName,
    },
  });

  while (uploadedFile.state === "PROCESSING") {
    await new Promise((r) => setTimeout(r, 2000));
    uploadedFile = await client.files.get({ name: uploadedFile.name });
  }

  if (uploadedFile.state === "FAILED") {
    throw new Error(`Gemini Files API 處理失敗：${uploadedFile.name}`);
  }

  return { uri: uploadedFile.uri, name: uploadedFile.name };
}

async function handlePdf(input, client) {
  const pdfInput = await resolvePdfBuffer(input);

  const dryRunInfo = {
    detectedType: "pdf",
    source: pdfInput.source,
    mimeType: pdfInput.mimeType,
    localPath: pdfInput.localPath || null,
    remoteUrl: pdfInput.remoteUrl || null,
    bufferBytes: pdfInput.buffer.length,
    displayName: pdfInput.displayName,
  };

  console.error(`正在分析 PDF：${input}`);
  const { uri, name: uploadedFileName } = await uploadPdfAndGetUri(
    client,
    pdfInput
  );
  console.error(`已上傳：${uploadedFileName}`);

  return {
    dryRunInfo,
    model: MODELS.pdf,
    interactionInput: [
      { type: "text", text: buildPdfPrompt() },
      { type: "document", uri, mime_type: pdfInput.mimeType },
    ],
    cleanup: async () => {
      await client.files.delete({ name: uploadedFileName }).catch(() => {});
    },
  };
}

// ---------------------------------------------------------------------------
// Video Handler
// ---------------------------------------------------------------------------

function getVideoMimeType(filePath) {
  return VIDEO_MIME_TYPES[path.extname(filePath).toLowerCase()] || "video/mp4";
}

function buildVideoPrompt() {
  return `你是一個專業的影片內容分析師。請仔細觀看這段影片的完整內容，並產出結構化的繁體中文 Markdown 摘要。

請使用以下格式：

# 內容摘要

## 來源
- 類型：影片

## 三段摘要
（三段完整摘要，每段至少 3–4 句。第一段介紹影片的主題與背景，第二段展開核心內容與關鍵論點，第三段總結結論與啟示。）

## 重點條列
- 重點 1
- 重點 2
（至少列出 7 個重點，每點需包含具體細節或時間點）

## 關鍵數字與日期
| 項目 | 數值/日期 |
|------|----------|
（如有關鍵數字、金額、日期、百分比等，以表格呈現；若無則省略此段）

## 行動建議
（觀看後的建議行動，至少 2–3 點。若無則寫「目前無明確行動建議」）

規則：
1. 全文使用繁體中文（zh-TW）
2. 不要虛構影片中沒有出現的資訊
3. 保留專有名詞的原文（括號附上）
4. 只輸出最終 Markdown，不要額外說明
5. 涵蓋影片從頭到尾的所有重要段落，不要只摘要開頭`;
}

async function resolveVideoInput(rawInput) {
  if (!rawInput) throw new Error("請提供影片 URL 或本地檔案路徑。");

  if (rawInput.startsWith("data:")) {
    return {
      source: "data-uri",
      uri: rawInput,
      mimeType:
        rawInput.match(/^data:([^;]+);base64,/)?.[1] || "video/mp4",
    };
  }

  // Try local file first
  let localPath = rawInput;
  if (rawInput.startsWith("file://")) localPath = fileURLToPath(rawInput);
  const resolvedPath = path.resolve(localPath);

  try {
    const fileBuffer = await readFile(resolvedPath);
    const mimeType = getVideoMimeType(resolvedPath);
    return {
      source: "local-file",
      uri: `data:${mimeType};base64,${fileBuffer.toString("base64")}`,
      mimeType,
      localPath: resolvedPath,
    };
  } catch (error) {
    if (error?.code !== "ENOENT" && error?.code !== "ENOTDIR") {
      throw new Error(`無法讀取影片檔案 "${resolvedPath}"：${error.message}`);
    }
  }

  // Remote URL
  if (isRemoteUrl(rawInput)) {
    return {
      source: "remote-url",
      uri: rawInput,
      mimeType: "video/mp4",
    };
  }

  throw new Error(
    `輸入既非可讀取的本地檔案，也非有效的影片 URL：${rawInput}`
  );
}

async function handleVideo(input) {
  const videoInput = await resolveVideoInput(input);

  return {
    dryRunInfo: {
      detectedType: "video",
      source: videoInput.source,
      mimeType: videoInput.mimeType,
      localPath: videoInput.localPath || null,
      uriPreview:
        videoInput.source === "local-file" ||
        videoInput.source === "data-uri"
          ? `${videoInput.uri.slice(0, 48)}...`
          : videoInput.uri,
    },
    model: MODELS.video,
    interactionInput: [
      { type: "text", text: buildVideoPrompt() },
      { type: "video", uri: videoInput.uri, mime_type: videoInput.mimeType },
    ],
    cleanup: null,
  };
}

// ---------------------------------------------------------------------------
// Audio Handler
// ---------------------------------------------------------------------------

function getAudioMimeType(filePath) {
  return AUDIO_MIME_TYPES[path.extname(filePath).toLowerCase()] || "audio/mpeg";
}

function buildAudioPrompt() {
  return `你是一個專業的音訊內容分析師。請仔細聆聽這段音訊的完整內容，並產出結構化的繁體中文 Markdown 摘要。

請使用以下格式：

# 內容摘要

## 來源
- 類型：音訊

## 三段摘要
（三段完整摘要，每段至少 3–4 句。第一段介紹音訊的主題與背景脈絡，第二段展開核心內容與關鍵論點，第三段總結結論與要點。）

## 重點條列
- 重點 1
- 重點 2
（至少列出 7 個重點，每點需包含具體細節）

## 關鍵數字與日期
| 項目 | 數值/日期 |
|------|----------|
（如有關鍵數字、金額、日期、百分比等，以表格呈現；若無則省略此段）

## 行動建議
（聆聽後的建議行動，至少 2–3 點。若無則寫「目前無明確行動建議」）

規則：
1. 全文使用繁體中文（zh-TW）
2. 不要虛構音訊中沒有出現的資訊
3. 保留專有名詞的原文（括號附上）
4. 只輸出最終 Markdown，不要額外說明
5. 涵蓋音訊從頭到尾的所有重要段落，不要只摘要開頭`;
}

async function resolveAudioInput(rawInput) {
  if (!rawInput) throw new Error("請提供音訊檔案路徑或 URL。");

  // Try local file first
  let localPath = rawInput;
  if (rawInput.startsWith("file://")) localPath = fileURLToPath(rawInput);
  const resolvedPath = path.resolve(localPath);

  try {
    const fileBuffer = await readFile(resolvedPath);
    const mimeType = getAudioMimeType(resolvedPath);
    return {
      source: "local-file",
      buffer: fileBuffer,
      mimeType,
      localPath: resolvedPath,
      displayName: path.basename(resolvedPath),
    };
  } catch (error) {
    if (error?.code !== "ENOENT" && error?.code !== "ENOTDIR") {
      throw new Error(`無法讀取音訊檔案 "${resolvedPath}"：${error.message}`);
    }
  }

  // Remote URL
  if (isRemoteUrl(rawInput)) {
    console.error(`正在下載音訊：${rawInput}`);
    const response = await fetchWithTimeout(rawInput);
    if (!response.ok)
      throw new Error(`下載失敗（HTTP ${response.status}）：${rawInput}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    const urlPath = new URL(rawInput).pathname;
    const ext = path.extname(urlPath).toLowerCase();
    return {
      source: "remote-url",
      buffer,
      mimeType: AUDIO_MIME_TYPES[ext] || "audio/mpeg",
      remoteUrl: rawInput,
      displayName: path.basename(urlPath) || "audio.mp3",
    };
  }

  throw new Error(
    `輸入既非可讀取的本地檔案，也非有效的音訊 URL：${rawInput}`
  );
}

async function handleAudio(input, client) {
  const audioInput = await resolveAudioInput(input);

  const dryRunInfo = {
    detectedType: "audio",
    source: audioInput.source,
    mimeType: audioInput.mimeType,
    localPath: audioInput.localPath || null,
    remoteUrl: audioInput.remoteUrl || null,
    bufferBytes: audioInput.buffer.length,
    displayName: audioInput.displayName,
  };

  console.error(`正在分析音訊：${input}`);
  const blob = new Blob([audioInput.buffer], { type: audioInput.mimeType });
  let uploadedFile = await client.files.upload({
    file: blob,
    config: {
      mimeType: audioInput.mimeType,
      displayName: audioInput.displayName,
    },
  });

  while (uploadedFile.state === "PROCESSING") {
    await new Promise((r) => setTimeout(r, 2000));
    uploadedFile = await client.files.get({ name: uploadedFile.name });
  }

  if (uploadedFile.state === "FAILED") {
    throw new Error(`Gemini Files API 處理失敗：${uploadedFile.name}`);
  }

  const uploadedFileName = uploadedFile.name;
  console.error(`已上傳：${uploadedFileName}`);

  return {
    dryRunInfo,
    model: MODELS.audio,
    interactionInput: [
      { type: "text", text: buildAudioPrompt() },
      { type: "document", uri: uploadedFile.uri, mime_type: audioInput.mimeType },
    ],
    cleanup: async () => {
      await client.files.delete({ name: uploadedFileName }).catch(() => {});
    },
  };
}

// ---------------------------------------------------------------------------
// Main Entry
// ---------------------------------------------------------------------------

async function main() {
  const { type: forcedType, input } = parseCliArgs();

  if (!input) {
    printUsage();
    process.exit(1);
  }

  const detectedType = forcedType || detectInputType(input);
  console.error(`偵測到輸入類型：${detectedType}`);

  const isDryRun = process.env.SUMMARY_DRY_RUN === "1";

  // For PDF, we need the client before handlePdf (for upload)
  // For URL/Video, we need it only for the interaction
  let client = null;
  if (!isDryRun) {
    const apiKey = ensureApiKey();
    client = new GoogleGenAI({ apiKey });
  }

  let result;
  switch (detectedType) {
    case "url":
      result = await handleUrl(input, client);
      // Auto-fallback: URL returned PDF content-type
      if (result && result.__pdfFallback) {
        console.error("偵測到 PDF Content-Type，自動切換至 PDF 處理器...");
        if (!client) {
          const pdfInput = await resolvePdfBuffer(result.url);
          process.stdout.write(
            `${JSON.stringify(
              {
                detectedType: "pdf",
                source: pdfInput.source,
                mimeType: pdfInput.mimeType,
                localPath: pdfInput.localPath || null,
                remoteUrl: pdfInput.remoteUrl || null,
                bufferBytes: pdfInput.buffer.length,
                displayName: pdfInput.displayName,
              },
              null,
              2
            )}\n`
          );
          return;
        }
        result = await handlePdf(result.url, client);
      }
      break;
    case "pdf":
      if (!client) {
        // dry-run for PDF: still need to resolve buffer but not upload
        const pdfInput = await resolvePdfBuffer(input);
        process.stdout.write(
          `${JSON.stringify(
            {
              detectedType: "pdf",
              source: pdfInput.source,
              mimeType: pdfInput.mimeType,
              localPath: pdfInput.localPath || null,
              remoteUrl: pdfInput.remoteUrl || null,
              bufferBytes: pdfInput.buffer.length,
              displayName: pdfInput.displayName,
            },
            null,
            2
          )}\n`
        );
        return;
      }
      result = await handlePdf(input, client);
      break;
    case "video":
      result = await handleVideo(input);
      break;
    case "audio":
      if (!client) {
        const audioInput = await resolveAudioInput(input);
        process.stdout.write(
          `${JSON.stringify(
            {
              detectedType: "audio",
              source: audioInput.source,
              mimeType: audioInput.mimeType,
              localPath: audioInput.localPath || null,
              remoteUrl: audioInput.remoteUrl || null,
              bufferBytes: audioInput.buffer.length,
              displayName: audioInput.displayName,
            },
            null,
            2
          )}\n`
        );
        return;
      }
      result = await handleAudio(input, client);
      break;
    default:
      throw new Error(`不支援的類型：${detectedType}`);
  }

  // Dry-run: output metadata only
  if (isDryRun) {
    process.stdout.write(`${JSON.stringify(result.dryRunInfo, null, 2)}\n`);
    return;
  }

  // Stream the summary
  console.error("正在請 Gemini 產生摘要...");
  try {
    const stream = await client.interactions.create({
      model: result.model,
      input: result.interactionInput,
      generation_config: { max_output_tokens: 65536 },
      stream: true,
    });
    await streamInteraction(stream);
  } finally {
    if (result.cleanup) await result.cleanup();
  }
}

main().catch((error) => {
  console.error(`錯誤：${error.message || error}`);
  process.exit(1);
});
