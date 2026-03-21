#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { parsePositiveInteger } from './cli-utils.mjs';
import {
  buildDailyPrompt,
  buildIssueAgentPrompt,
} from './memory-prompts.mjs';
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
- 每一個 issue 會整理成 \`issue-<number>.md\`
- 每一份記憶都像是一隻龍蝦，持續替主人記住這個 agent 的角色、對話脈絡與工作進展
- 內容是 AI 蒸餾後的 agent memory，不是原始對話逐字稿
- 應優先保留近期活動、目前狀態、已完成工作與待辦，方便下一次接續陪主人工作

資料來源：
- GitHub issue body
- GitHub issue comments
- compact-memory workflow 每次整理視窗內的 issues 後更新這些檔案
`;

const ROOT_MEMORY_TEMPLATE = `# Repository Memory

這份檔案是從 \`daily/*.md\` 蒸餾出來的長期 memory。

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

function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function truncateText(value, maxLength) {
  const normalized = String(value || '');
  if (!normalized || normalized.length <= maxLength) {
    return normalized;
  }

  if (maxLength <= 1) {
    return normalized.slice(0, maxLength);
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function decodeBase64Utf8(value) {
  return Buffer.from(String(value || '').replace(/\s+/g, ''), 'base64')
    .toString('utf8');
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
  const normalized = String(markdown || '').replace(/\r\n/g, '\n').trim();
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
        agentMemory.summaryMarkdown,
        dailySummaryMaxAgentChars,
      );

      return {
        ...agentMemory,
        promptSummaryMarkdown: truncatedSummary.text,
        promptSummaryTruncated: truncatedSummary.truncated,
      };
    });

  return {
    selectedAgentMemories,
    omittedAgentCount:
      sortedAgentMemories.length - selectedAgentMemories.length,
  };
}

async function summarizeIssueAgent({
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
    summary: normalizeIssueAgentSummaryMarkdown(summary),
    result,
  };
}

function buildIssueMemoryFile({
  repo,
  issueThread,
  generatedAt,
  summaryMarkdown,
}) {
  const fileName = `issue-${issueThread.number}.md`;
  const normalizedSummary = normalizeIssueAgentSummaryMarkdown(summaryMarkdown);
  const issueMarkdown = [
    '# Issue Agent Memory',
    '',
    `Generated at: ${formatTimestamp(generatedAt)}`,
    '',
    '## Metadata',
    '',
    `- Repository: \`${repo.fullName}\``,
    `- Issue: [#${issueThread.number}](${issueThread.url}) ${issueThread.title}`,
    `- State: \`${issueThread.state}\``,
    `- Author: \`@${issueThread.author || 'unknown'}\``,
    `- Labels: ${formatInlineList(issueThread.labels)}`,
    `- Assignees: ${formatInlineList(issueThread.assignees)}`,
    `- Participants: ${formatInlineList(issueThread.participants)}`,
    `- Comment count: \`${issueThread.comments.length}\``,
    `- Updated at: \`${issueThread.updatedAt}\``,
    '',
    normalizedSummary,
    '',
  ].join('\n');

  return {
    fileName,
    relativePath: path.join('agents', fileName),
    content: issueMarkdown,
  };
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
  language = DEFAULT_LANGUAGE,
  summaryToolImpl = summaryTool,
}) {
  if (agentMemories.length === 0) {
    return {
      prompt: '',
      summary: [
        '## Agent Activity',
        '',
        '- No issues matched the current compaction window.',
        '',
        '## Cross-Issue Themes',
        '',
        '- No cross-issue themes were observed in this run.',
        '',
        '## Decisions',
        '',
        '- No new decisions were captured because no issues were compacted.',
        '',
        '## Open Loops',
        '',
        '- Wait for new or updated issues in the next compaction window.',
        '',
        '- Daily memory may stay stale if the compaction window remains empty.',
      ].join('\n'),
      result: null,
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
  };
}

export function buildMemoryArtifacts({
  repo,
  issueThreads,
  agentSummaries,
  dailySummaryMarkdown,
  generatedAt,
  issueState,
  issueLimit,
  sinceDays,
}) {
  const stats = buildStats(issueThreads);
  const topLabels = buildLabelSummary(issueThreads);
  const dailyFileName = toIsoDate(new Date(generatedAt));
  const agentFiles = agentSummaries.map((agentSummary) =>
    buildIssueMemoryFile({
      repo,
      issueThread: agentSummary.issueThread,
      generatedAt,
      summaryMarkdown: agentSummary.summaryMarkdown,
    }),
  );
  const dailyMarkdown = [
    '# Daily Memory Snapshot',
    '',
    `Generated at: ${formatTimestamp(generatedAt)}`,
    '',
    '## Window',
    '',
    `- Repository: \`${repo.fullName}\``,
    `- Issue state: \`${issueState}\``,
    `- Issue limit: \`${issueLimit}\``,
    `- Since days: \`${sinceDays}\``,
    '',
    '## Counts',
    '',
    `- Considered issues: \`${stats.consideredIssues}\``,
    `- Open issues: \`${stats.openIssues}\``,
    `- Closed issues: \`${stats.closedIssues}\``,
    '',
    '## Top Labels',
    '',
    ...(topLabels.length > 0
      ? topLabels.map((label) => `- \`${label.name}\`: ${label.count}`)
      : ['- No labels were found in the current compaction window.']),
    '',
    '## Agent Files',
    '',
    ...(agentFiles.length > 0
      ? agentSummaries.map(
          (agentSummary) =>
            `- [#${agentSummary.issueNumber}](${agentSummary.issueUrl}) ${agentSummary.title} -> \`${agentSummary.relativePath}\``,
        )
      : ['- No issue agent files were generated in this run.']),
    '',
    dailySummaryMarkdown.trim(),
    '',
  ].join('\n');

  return {
    agentFiles,
    dailyFileName,
    dailyMarkdown,
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

  const writes = artifacts.agentFiles.map((agentFile) =>
    writeFile(
      path.join(outputDir, agentFile.relativePath),
      `${agentFile.content}\n`,
      'utf8',
    ),
  );

  writes.push(
    writeFile(
      path.join(dailyDir, `${artifacts.dailyFileName}.md`),
      `${artifacts.dailyMarkdown}\n`,
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

async function fetchIssueComments(config, issueNumber) {
  const comments = [];
  let page = 1;

  for (;;) {
    const batch = await githubRequest(
      config,
      `/repos/${config.owner}/${config.repo}/issues/${issueNumber}/comments?per_page=100&page=${page}`,
    );

    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }

    comments.push(...batch);

    if (batch.length < 100) {
      break;
    }

    page += 1;
  }

  return comments;
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

export function buildIssueThread(
  repoMetadata,
  issue,
  comments,
  options = {},
) {
  const archivedComments = Array.isArray(options.archivedSnapshot?.comments)
    ? options.archivedSnapshot.comments
    : [];
  const sourceComments = comments.length > 0 ? comments : archivedComments;
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
    title: String(issue.title || '').trim(),
    state: String(issue.state || 'open').trim(),
    url: issue.html_url,
    author: normalizeLogin(issue.user),
    labels: Array.isArray(issue.labels)
      ? issue.labels.map((label) => normalizeLabel(label)).filter(Boolean)
      : [],
    assignees: Array.isArray(issue.assignees)
      ? issue.assignees
          .map((assignee) => normalizeLogin(assignee))
          .filter(Boolean)
      : [],
    createdAt: formatTimestamp(issue.created_at),
    updatedAt: formatTimestamp(issue.updated_at),
    closedAt: issue.closed_at ? formatTimestamp(issue.closed_at) : '',
    body: normalizeWhitespace(issue.body || ''),
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

    if (typeof data?.content !== 'string' || data.content.trim() === '') {
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
      comments: parseArchivedIssueComments(markdown, issueUrl),
    };
  } catch (error) {
    if (isMissingGitHubContentError(error)) {
      return null;
    }
    throw error;
  }
}

async function loadIssueThreads(config, repoMetadata, rawIssues) {
  return mapWithConcurrency(
    rawIssues,
    DEFAULT_GITHUB_CONCURRENCY,
    async (issue) => {
      const liveComments =
        Number.isInteger(issue.comments) && issue.comments > 0
          ? await fetchIssueComments(config, issue.number)
          : [];
      const archivedSnapshot = liveComments.length === 0
        ? await fetchIssueWorkspaceSnapshot(config, issue.number, issue.html_url)
        : null;
      return buildIssueThread(repoMetadata, issue, liveComments, {
        archivedSnapshot,
      });
    },
  );
}

async function summarizeIssueAgents({
  issueThreads,
  generatedAt,
  summarySecrets,
  summaryProfile,
  language,
  summaryToolImpl = summaryTool,
}) {
  const sortedIssueThreads = [...issueThreads].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );

  return mapWithConcurrency(
    sortedIssueThreads,
    summaryProfile.execution.agentSummaryConcurrency,
    async (issueThread) => {
      const summary = await summarizeIssueAgent({
        issueThread,
        summarySecrets,
        summaryProfile,
        language,
        summaryToolImpl,
      });

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
        relativePath: path.join('agents', `issue-${issueThread.number}.md`),
        generatedAt: formatTimestamp(generatedAt),
        summaryMarkdown: summary.summary,
        prompt: summary.prompt,
        conversationSource: summary.conversationSource,
      };
    },
  );
}

async function compactMemory(options, { summaryToolImpl = summaryTool } = {}) {
  const token = requireGitHubToken();
  const summarySecrets = buildSummarySecrets();
  const summaryProfile = resolveSummaryProfile(summarySecrets);
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
    language: options.language,
    summaryToolImpl,
  });
  const artifacts = buildMemoryArtifacts({
    repo: repoMetadata,
    issueThreads,
    agentSummaries,
    dailySummaryMarkdown: dailySummary.summary,
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
