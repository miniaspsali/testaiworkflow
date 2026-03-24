#!/usr/bin/env node

import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { parsePositiveInteger } from './cli-utils.mjs';
import {
  appendInternalWarning,
  createInternalWarning,
  dedupeAndLimitItems,
  extractSourceLines,
  filterLinesByKeywords,
  hasCompleteSummarySecrets,
  normalizeWhitespace,
  toSingleLine,
  truncateText,
} from './memory-utils.mjs';
import { buildDailyPrompt, buildIssueAgentPrompt } from './memory-prompts.mjs';
import {
  buildSummarySecrets,
  extractSummaryTextFromToolResult,
  summaryTool,
} from './summary-client.mjs';
import { resolveSummaryExecutionProfile } from './summary-provider-profiles.mjs';

export {
  buildSummarySecrets,
  requireSummarySecrets,
  summarizeTextWithProvider,
  extractSummaryTextFromToolResult,
  summaryTool,
} from './summary-client.mjs';
export { buildIssueAgentPrompt } from './memory-prompts.mjs';

const DEFAULT_ISSUE_STATE = 'all';
const DEFAULT_ISSUE_LIMIT = 100;
const DEFAULT_SINCE_DAYS = 30;
const DEFAULT_LANGUAGE = '繁體中文（zh-TW）';
const DEFAULT_LABEL_COUNT = 15;
const DEFAULT_GITHUB_CONCURRENCY = 5;
const GITHUB_API_BASE_URL = 'https://api.github.com';
const ISSUE_AGENT_OMITTED_SECTIONS = ['Risks', 'Next Steps'];
const ISSUE_AGENT_SECTION_RENAMES = new Map([
  ['Conversation Summary', 'Recent Activity'],
]);
const ISSUE_AGENT_JSON_EMPTY_STATUS = '資訊不足，無法整理可保留的 agent 摘要。';
const DETERMINISTIC_RECENT_COMMENT_LIMIT = 8;
const DETERMINISTIC_LIST_LIMIT = 5;
const DETERMINISTIC_ITEM_MAX_CHARS = 180;
const DETERMINISTIC_STATUS_MAX_CHARS = 220;
const DETERMINISTIC_DAILY_SECTION_ITEM_LIMIT = 8;
const ISSUE_SUMMARY_KEYWORDS = Object.freeze({
  activeTasks: [
    'todo',
    'to do',
    'next',
    'follow up',
    '待辦',
    '待处理',
    '待處理',
    '待確認',
    '需要',
    '應該',
    '請',
  ],
  decisions: ['決定', '決議', '同意', 'adopt', 'agreed', '將', '會改', 'will'],
  completed: ['完成', '已完成', 'done', 'fixed', 'merged', 'resolved', '上線'],
  preferences: [
    'prefer',
    'preference',
    '習慣',
    '偏好',
    '規則',
    '限制',
    '不要',
    '務必',
    'must',
    'should',
  ],
  openLoops: [
    'block',
    'blocked',
    'waiting',
    'pending',
    'unknown',
    '待確認',
    '待回覆',
    '不確定',
    '卡住',
    '風險',
  ],
});
const SUMMARY_TRANSIENT_ERROR_PATTERNS = [
  /429/,
  /rate[- ]?limit/i,
  /quota/i,
  /resource exhausted/i,
  /timeout/i,
  /timed out/i,
  /etimedout/i,
  /abort/i,
  /overloaded/i,
];

function resolveSummaryProfile(summarySecrets) {
  return resolveSummaryExecutionProfile(summarySecrets);
}

const SHARED_MANUAL_TEMPLATE = `# Shared Memory Manual Notes

這個檔案保留給人類手動維護的長期記憶。

建議放這些內容：
- 穩定規則
- 長期決策
- 常見限制
- agent 共同遵守的 repo 習慣

注意：
- GitHub issue / comment 才是原始資料來源
- 這個檔案不應該複製完整 issue 原文
- compact-memory workflow 會讀取這份手動筆記，但不會覆寫它
`;

const AGENTS_README_TEMPLATE = `# Agent Memory

這個資料夾把每一個 GitHub issue 視為一個 agent。

約定：
- 每一個 issue 會整理成 \`issue-<number>.json\`
- 每一份記憶都像是一隻龍蝦，持續替主人記住這個 agent 的角色、對話脈絡與工作進展
- 內容是 AI 蒸餾後的 agent memory，不是原始對話逐字稿
- 應優先保留近期活動、目前狀態、已完成工作與待辦，方便下一次接續陪主人工作

資料來源：
- issue workspace 的 \`workspaces/issue-<number>/issue.md\`
- 若找不到對應 \`issue.md\`，就略過該 issue
- compact-memory workflow 每次整理視窗內的 issues 後更新這些檔案
`;

const ROOT_MEMORY_TEMPLATE = `# Repository Memory

這份檔案是從 \`daily/*.json\` 蒸餾出來的長期 memory。

它代表整群龍蝦替主人保留的長期生活與工作記憶。

尚未建立整理後的長期 context。

請先產生 issue agent memories 與 daily snapshots，再整理成這份 MEMORY.md：
- 觸發 \`.github/workflows/compact-memory.yml\`
- 執行 \`node .github/scripts/memory/compact-memory.mjs\`
- 執行 \`node .github/scripts/memory/summarize-memory-context.mjs --memory-dir .memory --output .memory/MEMORY.md\`
`;

function printUsage() {
  console.log(`用法:
  node .github/scripts/memory/compact-memory.mjs --repo owner/repo

可用參數:
  --repo <owner/repo>         目標 repository。預設讀取 GITHUB_REPOSITORY。
  --issue-state <state>       all | open | closed，預設 all。
  --issue-limit <number>      最多考慮多少筆 issue，預設 100。
  --since-days <number>       只整理最近幾天有更新的 issue，預設 30。
  --output-dir <path>         memory 輸出目錄，預設 .memory。
  --language <value>          AI 輸出語言，預設 繁體中文（zh-TW）。
  -h, --help                  顯示說明。
`);
}

export function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    repo: String(process.env.GITHUB_REPOSITORY || '').trim(),
    issueState: DEFAULT_ISSUE_STATE,
    issueLimit: DEFAULT_ISSUE_LIMIT,
    sinceDays: DEFAULT_SINCE_DAYS,
    outputDir: '.memory',
    language: DEFAULT_LANGUAGE,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    switch (argument) {
      case '-h':
      case '--help':
        options.help = true;
        break;
      case '--repo':
        index += 1;
        options.repo = String(argv[index] || '').trim();
        break;
      case '--issue-state':
        index += 1;
        options.issueState = String(argv[index] || '')
          .trim()
          .toLowerCase();
        break;
      case '--issue-limit':
        index += 1;
        options.issueLimit = parsePositiveInteger(
          argv[index],
          DEFAULT_ISSUE_LIMIT,
        );
        break;
      case '--since-days':
        index += 1;
        options.sinceDays = parsePositiveInteger(
          argv[index],
          DEFAULT_SINCE_DAYS,
        );
        break;
      case '--output-dir':
        index += 1;
        options.outputDir = String(argv[index] || '').trim();
        break;
      case '--language':
        index += 1;
        options.language = String(argv[index] || '').trim();
        break;
      default:
        throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (options.help) {
    return options;
  }

  if (!/^[^/\s]+\/[^/\s]+$/.test(options.repo)) {
    throw new Error(`Invalid repo format: ${options.repo || '(empty)'}`);
  }

  if (!['all', 'open', 'closed'].includes(options.issueState)) {
    throw new Error(`Invalid issue state: ${options.issueState}`);
  }

  if (!options.outputDir) {
    throw new Error('output-dir must not be empty.');
  }

  if (!options.language) {
    throw new Error('language must not be empty.');
  }

  return options;
}

function requireGitHubToken() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
  if (!token.trim()) {
    throw new Error('Missing GITHUB_TOKEN or GH_TOKEN.');
  }
  return token.trim();
}

function toIsoDate(value) {
  return value.toISOString().slice(0, 10);
}

function formatTimestamp(value) {
  return new Date(value).toISOString();
}

function extractUncheckedTaskItems(value) {
  const text = String(value || '');
  const matches = Array.from(text.matchAll(/^\s*[-*]\s+\[\s*\]\s+(.+?)\s*$/gm));

  return matches.map((match) => String(match[1] || '').trim()).filter(Boolean);
}

function extractCheckedTaskItems(value) {
  const text = String(value || '');
  const matches = Array.from(
    text.matchAll(/^\s*[-*]\s+\[(?:x|X)\]\s+(.+?)\s*$/gm),
  );

  return matches.map((match) => String(match[1] || '').trim()).filter(Boolean);
}

function extractQuestionLikeLines(lines) {
  return lines.filter((line) => /[?？]$/.test(line) || line.includes('？'));
}

function decodeBase64Utf8(value) {
  return Buffer.from(
    String(value || '').replace(/\s+/g, ''),
    'base64',
  ).toString('utf8');
}

function isMissingGitHubContentError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message === 'Not Found' ||
    message.includes('No commit found for the ref') ||
    message.includes('Reference does not exist') ||
    message.includes('status 404')
  );
}

function normalizeLabel(label) {
  if (typeof label === 'string') {
    return label.trim();
  }

  if (label && typeof label === 'object' && typeof label.name === 'string') {
    return label.name.trim();
  }

  return '';
}

function normalizeLogin(user) {
  return user && typeof user.login === 'string' ? user.login.trim() : '';
}

function collectParticipants(issueThread) {
  const participants = new Set();

  if (issueThread.author) {
    participants.add(issueThread.author);
  }

  for (const comment of issueThread.comments) {
    if (comment.author) {
      participants.add(comment.author);
    }
  }

  return Array.from(participants).sort((left, right) =>
    left.localeCompare(right),
  );
}

function formatInlineList(values = [], emptyText = 'none') {
  return values.length > 0
    ? values.map((value) => `\`${value}\``).join(', ')
    : emptyText;
}

function buildLabelSummary(issueThreads, labelLimit = DEFAULT_LABEL_COUNT) {
  const counts = new Map();

  for (const issueThread of issueThreads) {
    for (const label of issueThread.labels) {
      counts.set(label, (counts.get(label) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }
      return left.name.localeCompare(right.name);
    })
    .slice(0, labelLimit);
}

function buildStats(issueThreads) {
  const open = issueThreads.filter((issue) => issue.state === 'open').length;
  const closed = issueThreads.length - open;

  return {
    consideredIssues: issueThreads.length,
    openIssues: open,
    closedIssues: closed,
  };
}

function normalizeSectionMarkdown(summary, fallbackHeading) {
  const normalized = String(summary || '').trim();
  if (!normalized) {
    throw new Error('AI summary returned empty content.');
  }

  return /^##\s+/m.test(normalized)
    ? normalized
    : `${fallbackHeading}\n\n${normalized}`;
}

function stripTopLevelSections(markdown, sectionTitles = []) {
  const normalized = String(markdown || '').trim();
  if (!normalized) {
    return '';
  }

  const headings = [...normalized.matchAll(/^##\s+(.+?)\s*$/gm)];
  if (headings.length === 0) {
    return normalized;
  }

  const omitted = new Set(
    sectionTitles.map((title) => String(title || '').trim()).filter(Boolean),
  );
  const keptSections = [];

  for (let index = 0; index < headings.length; index += 1) {
    const current = headings[index];
    const next = headings[index + 1];
    const title = String(current[1] || '').trim();
    if (omitted.has(title)) {
      continue;
    }

    const start = current.index ?? 0;
    const end = next?.index ?? normalized.length;
    keptSections.push(normalized.slice(start, end).trim());
  }

  return keptSections.join('\n\n').trim();
}

function renameTopLevelSections(markdown, sectionRenames = new Map()) {
  let normalized = String(markdown || '').trim();
  if (!normalized || sectionRenames.size === 0) {
    return normalized;
  }

  for (const [from, to] of sectionRenames.entries()) {
    const escapedFrom = String(from).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    normalized = normalized.replace(
      new RegExp(`^##\\s+${escapedFrom}\\s*$`, 'gm'),
      `## ${to}`,
    );
  }

  return normalized;
}

function normalizeIssueAgentSummaryMarkdown(summary) {
  const normalized = normalizeSectionMarkdown(summary, '## Status');
  const stripped = stripTopLevelSections(
    normalized,
    ISSUE_AGENT_OMITTED_SECTIONS,
  );
  const renamed = renameTopLevelSections(stripped, ISSUE_AGENT_SECTION_RENAMES);

  return renamed || '## Status\n\n- 資訊不足，無法整理可保留的 agent 摘要。';
}

function normalizeIssueAgentSummaryItem(value) {
  return truncateText(toSingleLine(value), DETERMINISTIC_ITEM_MAX_CHARS);
}

function normalizeIssueAgentSummaryList(values, fallbackText) {
  const normalizedValues = Array.isArray(values)
    ? values
        .map((value) => normalizeIssueAgentSummaryItem(value))
        .filter(Boolean)
    : typeof values === 'string'
      ? [normalizeIssueAgentSummaryItem(values)].filter(Boolean)
      : [];

  return dedupeAndLimitItems(normalizedValues, {
    fallbackText,
    maxItems: DETERMINISTIC_LIST_LIMIT,
    maxItemChars: DETERMINISTIC_ITEM_MAX_CHARS,
  });
}

function parseMarkdownSectionMap(markdown) {
  const normalized = String(markdown || '').trim();
  if (!normalized) {
    return new Map();
  }

  const headings = [...normalized.matchAll(/^##\s+(.+?)\s*$/gm)];
  if (headings.length === 0) {
    return new Map();
  }

  const sections = new Map();
  for (let index = 0; index < headings.length; index += 1) {
    const current = headings[index];
    const next = headings[index + 1];
    const title = String(current[1] || '').trim();
    const start = (current.index ?? 0) + current[0].length;
    const end = next?.index ?? normalized.length;
    sections.set(title, normalized.slice(start, end).trim());
  }

  return sections;
}

function parseMarkdownSectionList(sectionBody, fallbackText) {
  const normalized = String(sectionBody || '').trim();
  if (!normalized) {
    return [fallbackText];
  }

  const bulletItems = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^-\s+/, '').trim())
    .filter(Boolean);

  return bulletItems.length > 0 ? bulletItems.slice(0, 5) : [normalized];
}

function normalizeDailySectionItems(values, fallbackText) {
  return dedupeAndLimitItems(values, {
    fallbackText,
    maxItems: DETERMINISTIC_DAILY_SECTION_ITEM_LIMIT,
    maxItemChars: DETERMINISTIC_ITEM_MAX_CHARS,
  });
}

function normalizeDailySummarySections(summaryMarkdown) {
  const normalized = normalizeSectionMarkdown(
    summaryMarkdown,
    '## Agent Activity',
  );
  const sections = parseMarkdownSectionMap(normalized);

  return {
    agentActivity: normalizeDailySectionItems(
      parseMarkdownSectionList(
        sections.get('Agent Activity'),
        '目前沒有可整理的 agent activity。',
      ),
      '目前沒有可整理的 agent activity。',
    ),
    crossIssueThemes: normalizeDailySectionItems(
      parseMarkdownSectionList(
        sections.get('Cross-Issue Themes'),
        '目前沒有可辨識的跨 issue 主題。',
      ),
      '目前沒有可辨識的跨 issue 主題。',
    ),
    decisions: normalizeDailySectionItems(
      parseMarkdownSectionList(
        sections.get('Decisions'),
        '目前沒有新的跨 issue 決策。',
      ),
      '目前沒有新的跨 issue 決策。',
    ),
    openLoops: normalizeDailySectionItems(
      parseMarkdownSectionList(
        sections.get('Open Loops'),
        '目前沒有待追蹤的 open loops。',
      ),
      '目前沒有待追蹤的 open loops。',
    ),
  };
}

function normalizeIssueAgentSummaryMarkdownToJson(summary) {
  const normalized = normalizeIssueAgentSummaryMarkdown(summary);
  const sections = parseMarkdownSectionMap(normalized);
  const statusBody = String(sections.get('Status') || '').trim();

  return {
    status: statusBody
      ? statusBody.replace(/^-\s+/, '').trim()
      : ISSUE_AGENT_JSON_EMPTY_STATUS,
    recentActivity: parseMarkdownSectionList(
      sections.get('Recent Activity'),
      '沒有足夠資訊可整理近期活動。',
    ),
    decisions: parseMarkdownSectionList(
      sections.get('Decisions'),
      '目前沒有明確決策。',
    ),
    completedWork: parseMarkdownSectionList(
      sections.get('Completed Work'),
      '目前沒有可確認的已完成工作。',
    ),
    openTasks: parseMarkdownSectionList(
      sections.get('Open Tasks'),
      '目前沒有可確認的待辦，或資訊不足。',
    ),
    preferences: parseMarkdownSectionList(
      sections.get('Preferences'),
      '目前沒有可確認的偏好設定。',
    ),
    openLoops: parseMarkdownSectionList(
      sections.get('Open Loops'),
      sections.get('Open Tasks') || '目前沒有可確認的未解議題。',
    ),
  };
}

function extractJsonBlock(summary) {
  const normalized = String(summary || '').trim();
  if (!normalized) {
    return '';
  }

  const fencedMatch = normalized.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  if (normalized.startsWith('{') && normalized.endsWith('}')) {
    return normalized;
  }

  const firstBraceIndex = normalized.indexOf('{');
  const lastBraceIndex = normalized.lastIndexOf('}');
  if (firstBraceIndex >= 0 && lastBraceIndex > firstBraceIndex) {
    return normalized.slice(firstBraceIndex, lastBraceIndex + 1).trim();
  }

  return normalized;
}

function normalizeIssueAgentSummaryJson(summary) {
  const jsonText = extractJsonBlock(summary);
  let parsed;

  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    parsed = normalizeIssueAgentSummaryMarkdownToJson(summary);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('AI issue agent summary must be a JSON object.');
  }

  const status =
    normalizeIssueAgentSummaryItem(parsed.status) ||
    ISSUE_AGENT_JSON_EMPTY_STATUS;

  return {
    status: truncateText(status, DETERMINISTIC_STATUS_MAX_CHARS),
    recentActivity: normalizeIssueAgentSummaryList(
      parsed.recentActivity ?? parsed.recent_activity,
      '沒有足夠資訊可整理近期活動。',
    ),
    decisions: normalizeIssueAgentSummaryList(
      parsed.decisions,
      '目前沒有明確決策。',
    ),
    completedWork: normalizeIssueAgentSummaryList(
      parsed.completedWork ?? parsed.completed_work,
      '目前沒有可確認的已完成工作。',
    ),
    openTasks: normalizeIssueAgentSummaryList(
      parsed.openTasks ?? parsed.open_tasks,
      '目前沒有可確認的待辦，或資訊不足。',
    ),
    preferences: normalizeIssueAgentSummaryList(
      parsed.preferences,
      '目前沒有可確認的偏好設定。',
    ),
    openLoops: normalizeIssueAgentSummaryList(
      parsed.openLoops ??
        parsed.open_loops ??
        parsed.openTasks ??
        parsed.open_tasks,
      '目前沒有可確認的未解議題。',
    ),
  };
}

function buildIssueAgentSummaryJsonText(summaryJson) {
  return JSON.stringify(summaryJson);
}

function buildIssueCommentBlocks(issueThread) {
  return issueThread.comments.map((comment, index) =>
    [
      `[Comment ${index + 1}]`,
      `Author: @${comment.author || 'unknown'}`,
      `Created at: ${comment.createdAt}`,
      `URL: ${comment.url || issueThread.url}`,
      '',
      comment.body || '(empty)',
    ].join('\n'),
  );
}

export function buildIssueConversationSource(issueThread, options = {}) {
  const maxChars =
    typeof options === 'number'
      ? options
      : (options.maxChars ?? options.issueSummaryMaxSourceChars ?? 4000);
  const metadataBlock = [
    `Repository: ${issueThread.repoFullName}`,
    `Issue: #${issueThread.number} ${issueThread.title}`,
    `URL: ${issueThread.url}`,
    `State: ${issueThread.state}`,
    `Author: @${issueThread.author || 'unknown'}`,
    `Created at: ${issueThread.createdAt}`,
    `Updated at: ${issueThread.updatedAt}`,
    `Closed at: ${issueThread.closedAt || 'n/a'}`,
    `Labels: ${issueThread.labels.join(', ') || 'none'}`,
    `Assignees: ${issueThread.assignees.join(', ') || 'none'}`,
    `Participants: ${issueThread.participants.join(', ') || 'none'}`,
    `Comment count: ${issueThread.comments.length}`,
    '',
    '[Issue body]',
    issueThread.body || '(empty)',
  ].join('\n');

  const commentBlocks = buildIssueCommentBlocks(issueThread);
  if (commentBlocks.length === 0) {
    return {
      text: metadataBlock,
      truncated: false,
      includedCommentCount: 0,
      omittedCommentCount: 0,
    };
  }

  if (metadataBlock.length >= maxChars) {
    return {
      text: truncateText(metadataBlock, maxChars),
      truncated: true,
      includedCommentCount: 0,
      omittedCommentCount: commentBlocks.length,
    };
  }

  const selectedCommentBlocks = [];
  let usedLength = metadataBlock.length;

  for (let index = commentBlocks.length - 1; index >= 0; index -= 1) {
    const block = commentBlocks[index];
    const nextLength = usedLength + 2 + block.length;
    if (nextLength > maxChars) {
      break;
    }

    selectedCommentBlocks.unshift(block);
    usedLength = nextLength;
  }

  const omittedCommentCount =
    commentBlocks.length - selectedCommentBlocks.length;
  const omittedNotice =
    omittedCommentCount > 0
      ? `[Earlier comments omitted to fit prompt: ${omittedCommentCount}]`
      : '';
  const pieces = [metadataBlock];

  if (omittedNotice && usedLength + 2 + omittedNotice.length <= maxChars) {
    pieces.push(omittedNotice);
  }

  pieces.push(...selectedCommentBlocks);

  return {
    text: pieces.join('\n\n'),
    truncated: omittedCommentCount > 0,
    includedCommentCount: selectedCommentBlocks.length,
    omittedCommentCount,
  };
}

function truncatePromptBlock(content, maxChars) {
  const normalized = String(content || '').trim();
  if (!normalized || normalized.length <= maxChars) {
    return {
      text: normalized,
      truncated: false,
    };
  }

  return {
    text: `${normalized.slice(0, maxChars).trimEnd()}\n\n[truncated]`,
    truncated: true,
  };
}

function parseArchivedIssueCommentTimestamp(rawValue) {
  const normalized = String(rawValue || '').trim();
  if (!normalized) {
    return '';
  }

  const parsed = new Date(`${normalized} UTC`);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return formatTimestamp(parsed);
}

export function parseArchivedIssueComments(markdown, fallbackIssueUrl = '') {
  const normalized = String(markdown || '')
    .replace(/\r\n/g, '\n')
    .trim();
  if (!normalized) {
    return [];
  }

  const headingPattern =
    /^### Comment by @(.+?) at (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) UTC\s*$/gm;
  const matches = Array.from(normalized.matchAll(headingPattern));

  return matches.map((match, index) => {
    const nextMatch = matches[index + 1];
    const bodyStart = (match.index || 0) + match[0].length;
    const bodyEnd = nextMatch?.index ?? normalized.length;
    const rawBody = normalized.slice(bodyStart, bodyEnd);
    const body = rawBody
      .replace(/^\s+/, '')
      .replace(/\n*\n---\s*$/, '')
      .trim();
    const createdAt = parseArchivedIssueCommentTimestamp(match[2]);

    return {
      id: `archived-${index + 1}`,
      author: String(match[1] || '').trim(),
      createdAt,
      updatedAt: createdAt,
      url: fallbackIssueUrl,
      body,
    };
  });
}

function parseWorkspaceIssueLabels(rawValue) {
  const normalized = String(rawValue || '').trim();
  if (!normalized || normalized.toLowerCase() === 'none') {
    return [];
  }

  return normalized
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean);
}

function parseWorkspaceIssueTitle(rawValue) {
  const normalized = String(rawValue || '').trim();
  if (!normalized) {
    return '';
  }

  return normalized.endsWith(' Description')
    ? normalized.slice(0, -' Description'.length).trimEnd()
    : normalized;
}

function parseIssueBodyMemoryEnabled(body) {
  if (typeof body !== 'string') {
    return true;
  }

  const match = body.match(/```json\s*([\s\S]*?)\s*```/i);
  if (!match) {
    return true;
  }

  try {
    const parsed = JSON.parse(match[1]);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return true;
    }

    if (typeof parsed.memoryEnabled === 'boolean') {
      return parsed.memoryEnabled;
    }

    if (typeof parsed.memory === 'boolean') {
      return parsed.memory;
    }

    if (
      parsed.memory &&
      typeof parsed.memory === 'object' &&
      !Array.isArray(parsed.memory) &&
      typeof parsed.memory.enabled === 'boolean'
    ) {
      return parsed.memory.enabled;
    }

    if (typeof parsed.loadMemory === 'boolean') {
      return parsed.loadMemory;
    }
  } catch {
    return true;
  }

  return true;
}

export function parseWorkspaceIssueSnapshot(markdown, fallbackIssueUrl = '') {
  const normalized = String(markdown || '').replace(/\r\n/g, '\n');
  const trimmed = normalized.trim();

  if (!trimmed) {
    return {
      title: '',
      state: '',
      labels: [],
      author: '',
      createdAt: '',
      body: '',
      comments: [],
      url: fallbackIssueUrl,
    };
  }

  const titleMatch = trimmed.match(/^#\s+(.+?)\s*$/m);
  const stateMatch = trimmed.match(/^\*\*State:\*\*\s*(.+?)\s*$/m);
  const labelsMatch = trimmed.match(/^\*\*Labels:\*\*\s*(.+?)\s*$/m);
  const authorMatch = trimmed.match(/^\*\*Created by:\*\*\s*@?(.+?)\s*$/m);
  const createdAtMatch = trimmed.match(
    /^\*\*Created at:\*\*\s*(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) UTC\s*$/m,
  );
  const comments = parseArchivedIssueComments(trimmed, fallbackIssueUrl);
  const commentHeadingMatch = trimmed.match(
    /^### Comment by @.+? at \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC\s*$/m,
  );
  const metadataEnd =
    createdAtMatch?.index != null
      ? createdAtMatch.index + createdAtMatch[0].length
      : 0;
  const bodyEnd = commentHeadingMatch?.index ?? trimmed.length;
  const rawBody =
    metadataEnd < bodyEnd ? trimmed.slice(metadataEnd, bodyEnd) : '';
  const body = rawBody
    .replace(/^\s+/, '')
    .replace(/\n*\n---\s*$/, '')
    .trim();

  return {
    title: parseWorkspaceIssueTitle(titleMatch?.[1] || ''),
    state: String(stateMatch?.[1] || '').trim(),
    labels: parseWorkspaceIssueLabels(labelsMatch?.[1] || ''),
    author: String(authorMatch?.[1] || '')
      .trim()
      .replace(/^@/, ''),
    createdAt: parseArchivedIssueCommentTimestamp(createdAtMatch?.[1] || ''),
    body: normalizeWhitespace(body),
    comments,
    url: fallbackIssueUrl,
  };
}

function selectDailyAgentPromptSources(agentMemories, summaryProfile) {
  const { dailySummaryMaxAgents, dailySummaryMaxAgentChars } =
    summaryProfile.execution;
  const sortedAgentMemories = [...agentMemories].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
  const selectedAgentMemories = sortedAgentMemories
    .slice(0, dailySummaryMaxAgents)
    .map((agentMemory) => {
      const truncatedSummary = truncatePromptBlock(
        agentMemory.summaryJson,
        dailySummaryMaxAgentChars,
      );

      return {
        ...agentMemory,
        promptSummaryJson: truncatedSummary.text,
        promptSummaryTruncated: truncatedSummary.truncated,
      };
    });

  return {
    selectedAgentMemories,
    omittedAgentCount:
      sortedAgentMemories.length - selectedAgentMemories.length,
  };
}

function summarizeIssueStatus({
  issueState,
  openTasks,
  openLoops,
  completedWork,
  recentActivity,
}) {
  if (issueState === 'closed') {
    return 'Issue 已結案，主要保留關鍵決策與後續追蹤事項。';
  }

  if (openTasks.length > 0) {
    return `Issue 仍在推進中，保留 ${openTasks.length} 個 active tasks。`;
  }

  if (openLoops.length > 0) {
    return 'Issue 目前處於等待或待確認狀態，仍有未解的 open loops。';
  }

  if (completedWork.length > 0 && recentActivity.length === 0) {
    return 'Issue 已完成主要工作，目前以維護與追蹤為主。';
  }

  if (recentActivity.length > 0) {
    return 'Issue 近期仍有活動，狀態維持 active。';
  }

  return ISSUE_AGENT_JSON_EMPTY_STATUS;
}

export function buildDeterministicIssueSummary(issueThread) {
  const recentComments = issueThread.comments.slice(
    -DETERMINISTIC_RECENT_COMMENT_LIMIT,
  );
  const commentTexts = recentComments.map((comment) => comment.body || '');
  const allTexts = [
    issueThread.body,
    ...issueThread.comments.map((comment) => comment.body || ''),
  ]
    .filter(Boolean)
    .join('\n\n');
  const bodyLines = extractSourceLines(issueThread.body || '', {
    maxLines: 80,
    stripTaskMarkers: true,
  });
  const recentCommentLines = extractSourceLines(commentTexts.join('\n'), {
    maxLines: 80,
    stripTaskMarkers: true,
  });
  const allLines = extractSourceLines(allTexts, {
    maxLines: 80,
    stripTaskMarkers: true,
  });

  const recentActivity = dedupeAndLimitItems(
    recentComments.map((comment) => {
      const commentLine =
        extractSourceLines(comment.body || '', {
          maxLines: 1,
          stripTaskMarkers: true,
        })[0] || '(empty)';
      const date =
        String(comment.createdAt || '').slice(0, 10) || 'unknown-date';
      return `@${comment.author || 'unknown'} (${date}): ${commentLine}`;
    }),
    {
      fallbackText: '最近沒有新的留言活動。',
    },
  );
  const activeTaskSignals = [
    ...extractUncheckedTaskItems(issueThread.body),
    ...extractUncheckedTaskItems(commentTexts.join('\n')),
    ...filterLinesByKeywords(allLines, ISSUE_SUMMARY_KEYWORDS.activeTasks),
  ];
  const activeTasks = dedupeAndLimitItems(activeTaskSignals, {
    fallbackText: '目前沒有可確認的待辦，或資訊不足。',
  });
  const completedWork = dedupeAndLimitItems(
    [
      ...extractCheckedTaskItems(issueThread.body),
      ...extractCheckedTaskItems(commentTexts.join('\n')),
      ...filterLinesByKeywords(allLines, ISSUE_SUMMARY_KEYWORDS.completed),
    ],
    {
      fallbackText: '目前沒有可確認的已完成工作。',
    },
  );
  const decisions = dedupeAndLimitItems(
    [
      ...filterLinesByKeywords(bodyLines, ISSUE_SUMMARY_KEYWORDS.decisions),
      ...filterLinesByKeywords(
        recentCommentLines,
        ISSUE_SUMMARY_KEYWORDS.decisions,
      ),
      ...filterLinesByKeywords(bodyLines, ISSUE_SUMMARY_KEYWORDS.preferences),
    ],
    {
      fallbackText: '目前沒有明確決策。',
    },
  );
  const preferences = dedupeAndLimitItems(
    [
      ...filterLinesByKeywords(bodyLines, ISSUE_SUMMARY_KEYWORDS.preferences),
      ...filterLinesByKeywords(
        recentCommentLines,
        ISSUE_SUMMARY_KEYWORDS.preferences,
      ),
    ],
    {
      fallbackText: '目前沒有可確認的偏好設定。',
    },
  );
  const openLoops = dedupeAndLimitItems(
    [
      ...extractQuestionLikeLines(recentCommentLines),
      ...filterLinesByKeywords(allLines, ISSUE_SUMMARY_KEYWORDS.openLoops),
      ...activeTaskSignals,
    ],
    {
      fallbackText: '目前沒有可確認的未解議題。',
    },
  );
  const status = truncateText(
    summarizeIssueStatus({
      issueState: issueThread.state,
      openTasks: activeTasks,
      openLoops,
      completedWork,
      recentActivity,
    }),
    DETERMINISTIC_STATUS_MAX_CHARS,
  );

  return {
    status,
    recentActivity,
    decisions,
    completedWork,
    openTasks: activeTasks,
    preferences,
    openLoops,
  };
}

function mergeIssueSummaries(deterministicSummary, llmSummary) {
  const candidate = llmSummary || {};
  const resolveList = (listCandidate, fallbackList) => {
    const candidateValues = Array.isArray(listCandidate)
      ? listCandidate
      : typeof listCandidate === 'string'
        ? [listCandidate]
        : [];

    return normalizeIssueAgentSummaryList(
      candidateValues.length > 0 ? candidateValues : fallbackList,
      fallbackList?.[0] || '',
    );
  };

  return {
    status: truncateText(
      toSingleLine(candidate.status || deterministicSummary.status),
      DETERMINISTIC_STATUS_MAX_CHARS,
    ),
    recentActivity: resolveList(
      candidate.recentActivity,
      deterministicSummary.recentActivity,
    ),
    decisions: resolveList(candidate.decisions, deterministicSummary.decisions),
    completedWork: resolveList(
      candidate.completedWork,
      deterministicSummary.completedWork,
    ),
    openTasks: resolveList(candidate.openTasks, deterministicSummary.openTasks),
    preferences: resolveList(
      candidate.preferences,
      deterministicSummary.preferences,
    ),
    openLoops: resolveList(candidate.openLoops, deterministicSummary.openLoops),
  };
}

async function summarizeIssueAgentWithLlm({
  issueThread,
  summarySecrets,
  summaryProfile,
  language = DEFAULT_LANGUAGE,
  summaryToolImpl = summaryTool,
}) {
  const conversationSource = buildIssueConversationSource(issueThread, {
    issueSummaryMaxSourceChars:
      summaryProfile.execution.issueSummaryMaxSourceChars,
  });
  const prompt = buildIssueAgentPrompt({
    issueThread,
    conversationSource,
    language,
  });
  const result = await summaryToolImpl.handler(
    {
      language,
      text: prompt,
      type: 'text',
    },
    {
      secrets: summarySecrets,
      summaryProfile,
      maxCompletionTokens:
        summaryProfile.execution.issueSummaryMaxCompletionTokens,
    },
  );
  const summary = extractSummaryTextFromToolResult(result);

  return {
    prompt,
    conversationSource,
    summary: normalizeIssueAgentSummaryJson(summary),
    result,
  };
}

function buildIssueMemoryFile({ repo, issueThread, generatedAt, summaryJson }) {
  const fileName = `issue-${issueThread.number}.json`;
  const issueJson = {
    generatedAt: formatTimestamp(generatedAt),
    repository: repo.fullName,
    issue: {
      number: issueThread.number,
      title: issueThread.title,
      url: issueThread.url,
      state: issueThread.state,
      author: issueThread.author || 'unknown',
      labels: issueThread.labels,
      assignees: issueThread.assignees,
      participants: issueThread.participants,
      commentCount: issueThread.comments.length,
      updatedAt: issueThread.updatedAt,
    },
    summary: summaryJson,
  };

  return {
    fileName,
    relativePath: path.join('agents', fileName),
    content: JSON.stringify(issueJson, null, 2),
  };
}

export function buildDeterministicDailySummary({ agentMemories = [] }) {
  if (agentMemories.length === 0) {
    return [
      '## Agent Activity',
      '',
      '- 本次整理視窗沒有可用 issue，先保留既有記憶。',
      '',
      '## Cross-Issue Themes',
      '',
      '- 目前沒有可辨識的跨 issue 主題。',
      '',
      '## Decisions',
      '',
      '- 目前沒有新的跨 issue 決策。',
      '',
      '## Open Loops',
      '',
      '- 等待下一輪 issue 更新後再整理。',
    ].join('\n');
  }

  const sorted = [...agentMemories].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
  const activity = dedupeAndLimitItems(
    sorted.map((agent) => {
      const firstActivity =
        agent.summaryData?.recentActivity?.[0] ||
        agent.summaryData?.status ||
        '近期無明確活動';
      return `#${agent.issueNumber} ${agent.title}：${firstActivity}`;
    }),
    {
      fallbackText: '本次沒有可用活動摘要。',
      maxItems: DETERMINISTIC_DAILY_SECTION_ITEM_LIMIT,
    },
  );
  const crossIssueThemes = dedupeAndLimitItems(
    [
      ...sorted.flatMap((agent) =>
        (agent.summaryData?.preferences || []).map(
          (preference) => `#${agent.issueNumber}：${preference}`,
        ),
      ),
      ...sorted
        .flatMap((agent) => agent.labels || [])
        .filter(Boolean)
        .map((label) => `Label theme：${label}`),
    ],
    {
      fallbackText: '目前沒有穩定的跨 issue 主題。',
      maxItems: DETERMINISTIC_DAILY_SECTION_ITEM_LIMIT,
    },
  );
  const decisions = dedupeAndLimitItems(
    sorted.flatMap((agent) =>
      (agent.summaryData?.decisions || []).map(
        (decision) => `#${agent.issueNumber}：${decision}`,
      ),
    ),
    {
      fallbackText: '目前沒有可確認的跨 issue 決策。',
      maxItems: DETERMINISTIC_DAILY_SECTION_ITEM_LIMIT,
    },
  );
  const openLoops = dedupeAndLimitItems(
    sorted.flatMap((agent) => {
      const loops = agent.summaryData?.openLoops?.length
        ? agent.summaryData.openLoops
        : agent.summaryData?.openTasks || [];
      return loops.map((loop) => `#${agent.issueNumber}：${loop}`);
    }),
    {
      fallbackText: '目前沒有待追蹤的 open loops。',
      maxItems: DETERMINISTIC_DAILY_SECTION_ITEM_LIMIT,
    },
  );

  return [
    '## Agent Activity',
    '',
    ...activity.map((item) => `- ${item}`),
    '',
    '## Cross-Issue Themes',
    '',
    ...crossIssueThemes.map((item) => `- ${item}`),
    '',
    '## Decisions',
    '',
    ...decisions.map((item) => `- ${item}`),
    '',
    '## Open Loops',
    '',
    ...openLoops.map((item) => `- ${item}`),
  ].join('\n');
}

async function summarizeDailyMemory({
  repo,
  issueState,
  issueLimit,
  sinceDays,
  generatedAt,
  agentMemories,
  summarySecrets,
  summaryProfile,
  llmRefineEnabled = false,
  internalWarnings = [],
  language = DEFAULT_LANGUAGE,
  summaryToolImpl = summaryTool,
}) {
  const deterministicSummary = buildDeterministicDailySummary({
    agentMemories,
  });
  if (!llmRefineEnabled || !summaryProfile || agentMemories.length === 0) {
    return {
      prompt: '',
      summary: deterministicSummary,
      result: null,
      summarySource: 'deterministic',
    };
  }

  const dailyPromptSource = selectDailyAgentPromptSources(
    agentMemories,
    summaryProfile,
  );
  const prompt = buildDailyPrompt({
    repo,
    issueState,
    issueLimit,
    sinceDays,
    generatedAt,
    agentMemories: dailyPromptSource.selectedAgentMemories,
    omittedAgentCount: dailyPromptSource.omittedAgentCount,
    language,
  });

  try {
    const result = await summaryToolImpl.handler(
      {
        language,
        text: prompt,
        type: 'text',
      },
      {
        secrets: summarySecrets,
        summaryProfile,
        maxCompletionTokens:
          summaryProfile.execution.dailySummaryMaxCompletionTokens,
      },
    );
    const summary = extractSummaryTextFromToolResult(result);

    return {
      prompt,
      summary: normalizeSectionMarkdown(summary, '## Agent Activity'),
      result,
      summarySource: 'llm-refine',
    };
  } catch (error) {
    appendInternalWarning(
      internalWarnings,
      createInternalWarning({
        scope: 'daily-summary-refine',
        error,
        message:
          'LLM daily refine unavailable, fallback to deterministic summary.',
        defaultScope: 'memory',
        transientPatterns: SUMMARY_TRANSIENT_ERROR_PATTERNS,
      }),
      { prefix: 'compact-memory' },
    );
  }

  return {
    prompt,
    summary: deterministicSummary,
    result: null,
    summarySource: 'deterministic',
  };
}

export function buildMemoryArtifacts({
  repo,
  issueThreads,
  agentSummaries,
  dailySummary,
  generatedAt,
  issueState,
  issueLimit,
  sinceDays,
}) {
  const stats = buildStats(issueThreads);
  const topLabels = buildLabelSummary(issueThreads);
  const dailyFileName = toIsoDate(new Date(generatedAt));
  const normalizedDailySummary =
    dailySummary && typeof dailySummary === 'object'
      ? dailySummary
      : { summary: String(dailySummary || ''), summarySource: 'deterministic' };
  const dailySections = normalizeDailySummarySections(
    normalizedDailySummary.summary,
  );
  const agentFiles = agentSummaries.map((agentSummary) =>
    buildIssueMemoryFile({
      repo,
      issueThread: agentSummary.issueThread,
      generatedAt,
      summaryJson: agentSummary.summaryData,
    }),
  );
  const dailySnapshot = {
    generatedAt: formatTimestamp(generatedAt),
    window: {
      repository: repo.fullName,
      issueState,
      issueLimit,
      sinceDays,
    },
    counts: {
      consideredIssues: stats.consideredIssues,
      openIssues: stats.openIssues,
      closedIssues: stats.closedIssues,
    },
    topLabels,
    agentFiles: agentSummaries.map((agentSummary) => ({
      issueNumber: agentSummary.issueNumber,
      issueUrl: agentSummary.issueUrl,
      title: agentSummary.title,
      relativePath: agentSummary.relativePath,
    })),
    sections: dailySections,
    summarySource: normalizedDailySummary.summarySource || 'deterministic',
  };

  return {
    agentFiles,
    dailyFileName,
    dailySnapshot,
  };
}

async function ensureFileIfMissing(filePath, content) {
  try {
    await readFile(filePath, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, content, 'utf8');
      return;
    }
    throw error;
  }
}

export async function writeMemoryArtifacts(outputDir, artifacts) {
  const sharedDir = path.join(outputDir, 'shared');
  const dailyDir = path.join(outputDir, 'daily');
  const agentsDir = path.join(outputDir, 'agents');

  await mkdir(sharedDir, { recursive: true });
  await mkdir(dailyDir, { recursive: true });
  await mkdir(agentsDir, { recursive: true });

  await ensureFileIfMissing(
    path.join(outputDir, 'MEMORY.md'),
    ROOT_MEMORY_TEMPLATE,
  );
  await ensureFileIfMissing(
    path.join(sharedDir, 'manual.md'),
    SHARED_MANUAL_TEMPLATE,
  );
  await ensureFileIfMissing(
    path.join(agentsDir, 'README.md'),
    AGENTS_README_TEMPLATE,
  );
  await ensureFileIfMissing(path.join(dailyDir, '.gitkeep'), '');

  const legacyAgentFiles = await readdir(agentsDir)
    .then((entries) => entries.filter((entry) => /^issue-\d+\.md$/.test(entry)))
    .catch(() => []);
  const legacyDailyMarkdownFiles = await readdir(dailyDir)
    .then((entries) =>
      entries.filter((entry) => /^\d{4}-\d{2}-\d{2}\.md$/.test(entry)),
    )
    .catch(() => []);

  await Promise.all([
    ...legacyAgentFiles.map((entry) => unlink(path.join(agentsDir, entry))),
    ...legacyDailyMarkdownFiles.map((entry) =>
      unlink(path.join(dailyDir, entry)),
    ),
  ]);

  const writes = artifacts.agentFiles.map((agentFile) =>
    writeFile(
      path.join(outputDir, agentFile.relativePath),
      `${agentFile.content}\n`,
      'utf8',
    ),
  );

  writes.push(
    writeFile(
      path.join(dailyDir, `${artifacts.dailyFileName}.json`),
      `${JSON.stringify(artifacts.dailySnapshot, null, 2)}\n`,
      'utf8',
    ),
  );

  await Promise.all(writes);
}

async function githubRequest(config, requestPath) {
  const response = await fetch(`${config.apiBaseUrl}${requestPath}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${config.token}`,
      'User-Agent': 'GitHubClawDev/compact-memory',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : null;

  if (!response.ok) {
    throw new Error(
      data?.message ||
        `GitHub API request failed with status ${response.status}`,
    );
  }

  return data;
}

async function fetchRepoMetadata(config) {
  const repo = await githubRequest(
    config,
    `/repos/${config.owner}/${config.repo}`,
  );

  return {
    fullName: repo.full_name,
    htmlUrl: repo.html_url,
    defaultBranch: repo.default_branch,
    description: typeof repo.description === 'string' ? repo.description : '',
  };
}

async function fetchIssues(config, { issueState, issueLimit, sinceDays }) {
  const issues = [];
  const since = new Date(
    Date.now() - sinceDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  let page = 1;

  while (issues.length < issueLimit) {
    const perPage = Math.min(100, issueLimit - issues.length);
    const search = new URLSearchParams({
      state: issueState,
      sort: 'updated',
      direction: 'desc',
      per_page: String(perPage),
      page: String(page),
      since,
    });

    const batch = await githubRequest(
      config,
      `/repos/${config.owner}/${config.repo}/issues?${search.toString()}`,
    );

    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }

    const filtered = batch.filter((issue) => !issue.pull_request);
    issues.push(...filtered);

    if (batch.length < perPage) {
      break;
    }

    page += 1;
  }

  return issues.slice(0, issueLimit);
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    for (;;) {
      const currentIndex = cursor;
      cursor += 1;
      if (currentIndex >= items.length) {
        return;
      }

      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  const workerCount = Math.min(Math.max(concurrency, 1), items.length || 1);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

export function buildIssueThread(repoMetadata, issue, comments, options = {}) {
  const workspaceIssue = options.workspaceSnapshot?.issueThread || null;
  const archivedComments = Array.isArray(options.archivedSnapshot?.comments)
    ? options.archivedSnapshot.comments
    : [];
  const sourceComments = workspaceIssue
    ? workspaceIssue.comments
    : comments.length > 0
      ? comments
      : archivedComments;
  const normalizedComments = sourceComments.map((comment) => {
    if (comment && typeof comment.created_at === 'string') {
      return {
        id: comment.id,
        author: normalizeLogin(comment.user),
        createdAt: formatTimestamp(comment.created_at),
        updatedAt: formatTimestamp(comment.updated_at),
        url: comment.html_url,
        body: normalizeWhitespace(comment.body || ''),
      };
    }

    return {
      id: comment.id,
      author: String(comment.author || '').trim(),
      createdAt: String(comment.createdAt || '').trim(),
      updatedAt: String(comment.updatedAt || comment.createdAt || '').trim(),
      url: String(comment.url || issue.html_url || '').trim(),
      body: normalizeWhitespace(comment.body || ''),
    };
  });
  const issueThread = {
    repoFullName: repoMetadata.fullName,
    number: issue.number,
    title: String(workspaceIssue?.title || issue.title || '').trim(),
    state: String(workspaceIssue?.state || issue.state || 'open').trim(),
    url: issue.html_url,
    author: String(
      workspaceIssue?.author || normalizeLogin(issue.user) || '',
    ).trim(),
    labels: workspaceIssue
      ? workspaceIssue.labels
      : Array.isArray(issue.labels)
        ? issue.labels.map((label) => normalizeLabel(label)).filter(Boolean)
        : [],
    assignees: Array.isArray(issue.assignees)
      ? issue.assignees
          .map((assignee) => normalizeLogin(assignee))
          .filter(Boolean)
      : [],
    createdAt: String(
      workspaceIssue?.createdAt || formatTimestamp(issue.created_at) || '',
    ).trim(),
    updatedAt: formatTimestamp(issue.updated_at),
    closedAt: issue.closed_at ? formatTimestamp(issue.closed_at) : '',
    body: workspaceIssue
      ? normalizeWhitespace(workspaceIssue.body || '')
      : normalizeWhitespace(issue.body || ''),
    comments: normalizedComments,
  };

  return {
    ...issueThread,
    participants: collectParticipants(issueThread),
  };
}

async function fetchIssueWorkspaceSnapshot(config, issueNumber, issueUrl = '') {
  const branchName = `issue-${issueNumber}`;
  const artifactPath = `workspaces/issue-${issueNumber}/issue.md`;

  try {
    const data = await githubRequest(
      config,
      `/repos/${config.owner}/${config.repo}/contents/${artifactPath}?ref=${encodeURIComponent(branchName)}`,
    );

    if (typeof data?.content !== 'string') {
      return null;
    }

    if (data.encoding !== 'base64') {
      return null;
    }

    const markdown = decodeBase64Utf8(data.content);
    return {
      branchName,
      artifactPath,
      markdown,
      issueThread: parseWorkspaceIssueSnapshot(markdown, issueUrl),
    };
  } catch (error) {
    if (isMissingGitHubContentError(error)) {
      return null;
    }
    throw error;
  }
}

async function loadIssueThreads(config, repoMetadata, rawIssues) {
  const issueThreads = await mapWithConcurrency(
    rawIssues,
    DEFAULT_GITHUB_CONCURRENCY,
    async (issue) => {
      if (!parseIssueBodyMemoryEnabled(issue.body)) {
        return null;
      }

      const workspaceSnapshot = await fetchIssueWorkspaceSnapshot(
        config,
        issue.number,
        issue.html_url,
      );

      if (!workspaceSnapshot) {
        return null;
      }

      return buildIssueThread(repoMetadata, issue, [], {
        workspaceSnapshot,
      });
    },
  );

  return issueThreads.filter(Boolean);
}

async function summarizeIssueAgents({
  issueThreads,
  generatedAt,
  summarySecrets,
  summaryProfile,
  llmRefineEnabled = false,
  internalWarnings = [],
  language,
  summaryToolImpl = summaryTool,
}) {
  const sortedIssueThreads = [...issueThreads].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );

  return mapWithConcurrency(
    sortedIssueThreads,
    summaryProfile?.execution?.agentSummaryConcurrency || 1,
    async (issueThread) => {
      const deterministicSummary = buildDeterministicIssueSummary(issueThread);
      let summarySource = 'deterministic';
      let summaryData = deterministicSummary;
      let prompt = '';
      let conversationSource = buildIssueConversationSource(issueThread);

      if (llmRefineEnabled && summaryProfile) {
        try {
          const summary = await summarizeIssueAgentWithLlm({
            issueThread,
            summarySecrets,
            summaryProfile,
            language,
            summaryToolImpl,
          });
          summarySource = 'llm-refine';
          summaryData = mergeIssueSummaries(
            deterministicSummary,
            summary.summary,
          );
          prompt = summary.prompt;
          conversationSource = summary.conversationSource;
        } catch (error) {
          appendInternalWarning(
            internalWarnings,
            createInternalWarning({
              scope: `issue-${issueThread.number}`,
              error,
              message: `LLM refine unavailable for issue #${issueThread.number}; fallback to deterministic summary.`,
              defaultScope: 'memory',
              transientPatterns: SUMMARY_TRANSIENT_ERROR_PATTERNS,
            }),
            { prefix: 'compact-memory' },
          );
        }
      }

      return {
        issueThread,
        issueNumber: issueThread.number,
        issueUrl: issueThread.url,
        title: issueThread.title,
        state: issueThread.state,
        labels: issueThread.labels,
        assignees: issueThread.assignees,
        participants: issueThread.participants,
        updatedAt: issueThread.updatedAt,
        relativePath: path.join('agents', `issue-${issueThread.number}.json`),
        generatedAt: formatTimestamp(generatedAt),
        summaryJson: buildIssueAgentSummaryJsonText(summaryData),
        summaryData,
        summarySource,
        prompt,
        conversationSource,
      };
    },
  );
}

async function compactMemory(options, { summaryToolImpl = summaryTool } = {}) {
  const token = requireGitHubToken();
  const summarySecrets = buildSummarySecrets();
  const internalWarnings = [];
  const hasProvider = Boolean(summarySecrets.provider);
  const hasModel = Boolean(summarySecrets.model);
  const hasApiKey = Boolean(summarySecrets.apiKey);
  const llmRefineEnabled = hasCompleteSummarySecrets(summarySecrets);
  let summaryProfile = null;

  if (!llmRefineEnabled) {
    if (hasProvider || hasModel || hasApiKey) {
      const missingFields = [
        !hasProvider ? 'provider' : '',
        !hasModel ? 'model' : '',
        !hasApiKey ? 'apiKey' : '',
      ].filter(Boolean);
      appendInternalWarning(
        internalWarnings,
        {
          scope: 'llm-refine-config',
          code: 'llm-config-incomplete',
          message: `Skip LLM refine because required settings are incomplete: missing ${missingFields.join(', ')}.`,
        },
        { prefix: 'compact-memory' },
      );
    }
  } else {
    try {
      summaryProfile = resolveSummaryProfile(summarySecrets);
    } catch (error) {
      appendInternalWarning(
        internalWarnings,
        createInternalWarning({
          scope: 'llm-refine-profile',
          error,
          message:
            'Skip LLM refine because provider profile cannot be resolved.',
          defaultScope: 'memory',
          transientPatterns: SUMMARY_TRANSIENT_ERROR_PATTERNS,
        }),
        { prefix: 'compact-memory' },
      );
    }
  }
  const [owner, repo] = options.repo.split('/');
  const config = {
    owner,
    repo,
    token,
    apiBaseUrl: GITHUB_API_BASE_URL,
  };

  const generatedAt = new Date();
  const [repoMetadata, rawIssues] = await Promise.all([
    fetchRepoMetadata(config),
    fetchIssues(config, options),
  ]);
  const issueThreads = await loadIssueThreads(config, repoMetadata, rawIssues);
  const agentSummaries = await summarizeIssueAgents({
    issueThreads,
    generatedAt,
    summarySecrets,
    summaryProfile,
    llmRefineEnabled: Boolean(summaryProfile),
    internalWarnings,
    language: options.language,
    summaryToolImpl,
  });
  const dailySummary = await summarizeDailyMemory({
    repo: repoMetadata,
    issueState: options.issueState,
    issueLimit: options.issueLimit,
    sinceDays: options.sinceDays,
    generatedAt,
    agentMemories: agentSummaries,
    summarySecrets,
    summaryProfile,
    llmRefineEnabled: Boolean(summaryProfile),
    internalWarnings,
    language: options.language,
    summaryToolImpl,
  });
  const artifacts = buildMemoryArtifacts({
    repo: repoMetadata,
    issueThreads,
    agentSummaries,
    dailySummary,
    generatedAt,
    issueState: options.issueState,
    issueLimit: options.issueLimit,
    sinceDays: options.sinceDays,
  });

  await writeMemoryArtifacts(options.outputDir, artifacts);

  return {
    repo: repoMetadata.fullName,
    outputDir: options.outputDir,
    generatedAt: formatTimestamp(generatedAt),
    consideredIssues: issueThreads.length,
    generatedAgentFiles: artifacts.agentFiles.length,
    dailyFileName: artifacts.dailyFileName,
    summaryMode: summaryProfile
      ? 'deterministic+optional-llm'
      : 'deterministic-only',
    internalWarnings,
  };
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);

  if (options.help) {
    printUsage();
    return { ok: true, help: true };
  }

  const result = await compactMemory(options);
  console.log(
    JSON.stringify(
      {
        ok: true,
        ...result,
      },
      null,
      2,
    ),
  );

  return result;
}

const mainModulePath = fileURLToPath(import.meta.url);

if (process.argv[1] && path.resolve(process.argv[1]) === mainModulePath) {
  main().catch((error) => {
    console.error(
      error instanceof Error ? error.stack || error.message : String(error),
    );
    process.exitCode = 1;
  });
}
