#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
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
  toSingleLine,
  truncateText,
} from './memory-utils.mjs';
import { buildMemoryContextPrompt } from './memory-prompts.mjs';
import {
  buildSummarySecrets,
  extractSummaryTextFromToolResult,
  summaryTool,
} from './summary-client.mjs';
import { resolveSummaryExecutionProfile } from './summary-provider-profiles.mjs';

export { buildMemoryContextPrompt } from './memory-prompts.mjs';

const DEFAULT_MEMORY_DIR = '.memory';
const DEFAULT_OUTPUT_FILE_NAME = 'MEMORY.md';
const DEFAULT_LANGUAGE = '繁體中文（zh-TW）';
const DEFAULT_MAX_SOURCE_CHARS = 12000;
const DEFAULT_DAILY_FILE_LIMIT = 7;
const MANUAL_SOURCE = Object.freeze({
  key: 'manualNotes',
  label: 'Shared Manual Notes',
  relativePath: path.join('shared', 'manual.md'),
});
const CONTEXT_ITEM_LIMIT = 8;
const CONTEXT_ITEM_MAX_CHARS = 200;
const CONTEXT_LINE_SCAN_LIMIT = 120;
const CONTEXT_KEYWORDS = Object.freeze({
  stable: [
    '規則',
    'policy',
    'source of truth',
    '流程',
    '慣例',
    '習慣',
    '長期',
    'always',
  ],
  constraints: [
    '限制',
    'constraint',
    '不要',
    'must',
    'quota',
    'timeout',
    'rate limit',
  ],
  openLoops: [
    '待確認',
    'pending',
    'block',
    '卡住',
    '待回覆',
    'open loop',
    'unknown',
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

function printUsage() {
  console.log(`用法:
  node .github/scripts/memory/summarize-memory-context.mjs

可用參數:
  --memory-dir <path>        memory 輸入目錄，預設 .memory。
  --output <path>            輸出 markdown 路徑，預設 <memory-dir>/MEMORY.md。
  --language <value>         輸出語言，預設 繁體中文（zh-TW）。
  --daily-limit <n>          最多納入多少份 daily snapshots，預設 7。
  --max-source-chars <n>     每份 source 最多納入 prompt 的字元數，預設 12000。
  -h, --help                 顯示說明。
`);
}

export function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    memoryDir: DEFAULT_MEMORY_DIR,
    outputPath: '',
    language: DEFAULT_LANGUAGE,
    dailyFileLimit: DEFAULT_DAILY_FILE_LIMIT,
    maxSourceChars: DEFAULT_MAX_SOURCE_CHARS,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    switch (argument) {
      case '-h':
      case '--help':
        options.help = true;
        break;
      case '--memory-dir':
        index += 1;
        options.memoryDir = String(argv[index] || '').trim();
        break;
      case '--output':
        index += 1;
        options.outputPath = String(argv[index] || '').trim();
        break;
      case '--language':
        index += 1;
        options.language = String(argv[index] || '').trim();
        break;
      case '--daily-limit':
        index += 1;
        options.dailyFileLimit = parsePositiveInteger(
          argv[index],
          DEFAULT_DAILY_FILE_LIMIT,
        );
        break;
      case '--max-source-chars':
        index += 1;
        options.maxSourceChars = parsePositiveInteger(
          argv[index],
          DEFAULT_MAX_SOURCE_CHARS,
        );
        break;
      default:
        throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (options.help) {
    return options;
  }

  if (!options.memoryDir) {
    throw new Error('memory-dir must not be empty.');
  }

  if (!options.language) {
    throw new Error('language must not be empty.');
  }

  options.outputPath =
    options.outputPath ||
    path.join(options.memoryDir, DEFAULT_OUTPUT_FILE_NAME);

  return options;
}

async function readOptionalFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    return content.replace(/\r\n/g, '\n').trim();
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function truncateForPrompt(content, maxChars) {
  if (content.length <= maxChars) {
    return {
      text: content,
      truncated: false,
    };
  }

  return {
    text: `${content.slice(0, maxChars).trimEnd()}\n\n[truncated]`,
    truncated: true,
  };
}

function isDailySnapshotFile(name) {
  return /^\d{4}-\d{2}-\d{2}\.json$/.test(name);
}

function normalizeDailyJsonSectionItems(value, fallbackText) {
  const items = Array.isArray(value)
    ? value.map((item) => toSingleLine(item)).filter(Boolean)
    : [];

  return dedupeAndLimitItems(items, {
    fallbackText,
    maxItems: CONTEXT_ITEM_LIMIT,
    maxItemChars: CONTEXT_ITEM_MAX_CHARS,
  });
}

function formatDailySnapshotForSource(dailySnapshot, dateLabel) {
  const data =
    dailySnapshot && typeof dailySnapshot === 'object' ? dailySnapshot : {};
  const sections =
    data.sections && typeof data.sections === 'object' ? data.sections : {};
  const agentActivity = normalizeDailyJsonSectionItems(
    sections.agentActivity,
    '目前沒有可整理的 agent activity。',
  );
  const crossIssueThemes = normalizeDailyJsonSectionItems(
    sections.crossIssueThemes,
    '目前沒有可辨識的跨 issue 主題。',
  );
  const decisions = normalizeDailyJsonSectionItems(
    sections.decisions,
    '目前沒有新的跨 issue 決策。',
  );
  const openLoops = normalizeDailyJsonSectionItems(
    sections.openLoops,
    '目前沒有待追蹤的 open loops。',
  );
  const topLabels = Array.isArray(data.topLabels)
    ? data.topLabels
        .map((item) => {
          const name = toSingleLine(item?.name || '');
          const count = Number(item?.count || 0);
          return name ? `${name} (${count})` : '';
        })
        .filter(Boolean)
    : [];
  const window = data.window || {};

  return [
    `Date: ${dateLabel}`,
    `Generated at: ${toSingleLine(data.generatedAt || '') || 'n/a'}`,
    `Repository: ${toSingleLine(window.repository || '') || 'n/a'}`,
    `Issue state: ${toSingleLine(window.issueState || '') || 'n/a'}`,
    `Issue limit: ${window.issueLimit ?? 'n/a'}`,
    `Since days: ${window.sinceDays ?? 'n/a'}`,
    `Summary source: ${toSingleLine(data.summarySource || '') || 'deterministic'}`,
    '',
    '## Agent Activity',
    ...agentActivity.map((item) => `- ${item}`),
    '',
    '## Cross-Issue Themes',
    ...crossIssueThemes.map((item) => `- ${item}`),
    '',
    '## Decisions',
    ...decisions.map((item) => `- ${item}`),
    '',
    '## Open Loops',
    ...openLoops.map((item) => `- ${item}`),
    '',
    '## Top Labels',
    ...(topLabels.length > 0
      ? topLabels.map((item) => `- ${item}`)
      : ['- none']),
  ].join('\n');
}

async function listRecentDailySnapshotNames(memoryDir, dailyFileLimit) {
  const dailyDir = path.join(memoryDir, 'daily');

  try {
    const entries = await readdir(dailyDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && isDailySnapshotFile(entry.name))
      .map((entry) => entry.name)
      .sort((left, right) => right.localeCompare(left))
      .slice(0, dailyFileLimit);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export async function collectMemorySources(
  memoryDir,
  {
    maxSourceChars = DEFAULT_MAX_SOURCE_CHARS,
    dailyFileLimit = DEFAULT_DAILY_FILE_LIMIT,
  } = {},
) {
  const sources = [];

  const manualFilePath = path.join(memoryDir, MANUAL_SOURCE.relativePath);
  const manualContent = await readOptionalFile(manualFilePath);
  if (manualContent) {
    const truncated = truncateForPrompt(manualContent, maxSourceChars);
    sources.push({
      key: MANUAL_SOURCE.key,
      label: MANUAL_SOURCE.label,
      filePath: manualFilePath,
      relativePath: MANUAL_SOURCE.relativePath,
      content: truncated.text,
      truncated: truncated.truncated,
    });
  }

  const dailySnapshotNames = await listRecentDailySnapshotNames(
    memoryDir,
    dailyFileLimit,
  );

  for (const fileName of dailySnapshotNames) {
    const relativePath = path.join('daily', fileName);
    const filePath = path.join(memoryDir, relativePath);
    const rawContent = await readOptionalFile(filePath);
    if (!rawContent) {
      continue;
    }

    let parsedDailySnapshot;
    try {
      parsedDailySnapshot = JSON.parse(rawContent);
    } catch {
      continue;
    }

    const dateLabel = fileName.replace(/\.json$/, '');
    const formattedDailyContent = formatDailySnapshotForSource(
      parsedDailySnapshot,
      dateLabel,
    );

    const truncated = truncateForPrompt(formattedDailyContent, maxSourceChars);
    sources.push({
      key: `daily:${fileName}`,
      label: `Daily Snapshot ${dateLabel}`,
      filePath,
      relativePath,
      content: truncated.text,
      truncated: truncated.truncated,
    });
  }

  return sources;
}

function normalizeSummaryMarkdown(summary) {
  const normalized = String(summary || '').trim();
  if (!normalized) {
    throw new Error('AI summary returned empty content.');
  }

  if (/^#\s+Repository Memory\b/m.test(normalized)) {
    return normalized;
  }

  if (normalized.startsWith('# ')) {
    return normalized.replace(/^#\s+.*$/m, '# Repository Memory');
  }

  return `# Repository Memory\n\n${normalized}`;
}

export function buildDeterministicMemoryContext({ memoryDir, sources = [] }) {
  if (!Array.isArray(sources) || sources.length === 0) {
    return [
      '# Repository Memory',
      '',
      '## Stable Context',
      '',
      '- 目前尚未收集到可用 memory sources，先保留既有規則。',
      '',
      '## Recent Themes',
      '',
      `- ${memoryDir} 目前沒有可整理的 shared/daily 內容。`,
      '',
      '## Constraints',
      '',
      '- 記憶蒸餾會在有來源內容後更新。',
      '',
      '## Open Loops',
      '',
      '- 等待下一輪 compact-memory 產生新的 daily snapshot。',
    ].join('\n');
  }

  const manualSources = sources.filter(
    (source) => source.key === MANUAL_SOURCE.key,
  );
  const dailySources = sources.filter((source) =>
    String(source.key || '').startsWith('daily:'),
  );
  const allLines = sources.flatMap((source) =>
    extractSourceLines(source.content),
  );
  const manualLines = manualSources.flatMap((source) =>
    extractSourceLines(source.content),
  );
  const dailyLines = dailySources.flatMap((source) =>
    extractSourceLines(source.content),
  );

  const stableContext = dedupeAndLimitItems(
    [
      ...manualLines,
      ...filterLinesByKeywords(allLines, CONTEXT_KEYWORDS.stable),
    ],
    {
      fallbackText: '目前沒有足夠資料可提煉穩定規則。',
      maxItems: CONTEXT_ITEM_LIMIT,
      maxItemChars: CONTEXT_ITEM_MAX_CHARS,
    },
  );
  const recentThemes = dedupeAndLimitItems(
    [
      ...dailySources.map((source) => {
        const firstLine = extractSourceLines(source.content, 1)[0];
        return firstLine ? `${source.label}：${firstLine}` : '';
      }),
      ...dailyLines.slice(0, CONTEXT_ITEM_LIMIT),
    ],
    {
      fallbackText: '近期尚未形成可辨識的重複主題。',
      maxItems: CONTEXT_ITEM_LIMIT,
      maxItemChars: CONTEXT_ITEM_MAX_CHARS,
    },
  );
  const constraints = dedupeAndLimitItems(
    [
      ...filterLinesByKeywords(manualLines, CONTEXT_KEYWORDS.constraints),
      ...filterLinesByKeywords(allLines, CONTEXT_KEYWORDS.constraints),
    ],
    {
      fallbackText: '目前沒有可確認的限制條件。',
      maxItems: CONTEXT_ITEM_LIMIT,
      maxItemChars: CONTEXT_ITEM_MAX_CHARS,
    },
  );
  const openLoops = dedupeAndLimitItems(
    [
      ...filterLinesByKeywords(allLines, CONTEXT_KEYWORDS.openLoops),
      ...allLines.filter((line) => /[?？]$/.test(line) || line.includes('？')),
    ],
    {
      fallbackText: '目前沒有可確認的 open loops。',
      maxItems: CONTEXT_ITEM_LIMIT,
      maxItemChars: CONTEXT_ITEM_MAX_CHARS,
    },
  );

  return [
    '# Repository Memory',
    '',
    '## Stable Context',
    '',
    ...stableContext.map((item) => `- ${item}`),
    '',
    '## Recent Themes',
    '',
    ...recentThemes.map((item) => `- ${item}`),
    '',
    '## Constraints',
    '',
    ...constraints.map((item) => `- ${item}`),
    '',
    '## Open Loops',
    '',
    ...openLoops.map((item) => `- ${item}`),
  ].join('\n');
}

export async function summarizeMemoryContext({
  prompt,
  language = DEFAULT_LANGUAGE,
  summarySecrets = buildSummarySecrets(),
  summaryProfile = resolveSummaryExecutionProfile(summarySecrets),
  summaryToolImpl = summaryTool,
}) {
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
        summaryProfile.execution.memoryContextMaxCompletionTokens,
    },
  );
  const summary = extractSummaryTextFromToolResult(result);

  return {
    result,
    summary: normalizeSummaryMarkdown(summary),
  };
}

export async function writeMemoryContext(outputPath, content) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${String(content).trim()}\n`, 'utf8');
}

export async function generateMemoryContext({
  memoryDir = DEFAULT_MEMORY_DIR,
  outputPath = path.join(memoryDir, DEFAULT_OUTPUT_FILE_NAME),
  language = DEFAULT_LANGUAGE,
  dailyFileLimit = DEFAULT_DAILY_FILE_LIMIT,
  maxSourceChars = DEFAULT_MAX_SOURCE_CHARS,
  apiKey,
  provider,
  model,
  summaryToolImpl,
} = {}) {
  const sources = await collectMemorySources(memoryDir, {
    maxSourceChars,
    dailyFileLimit,
  });
  const summarySecrets = buildSummarySecrets({
    apiKey,
    provider,
    model,
  });
  const internalWarnings = [];
  const deterministicSummary = buildDeterministicMemoryContext({
    memoryDir,
    sources,
  });
  const prompt =
    sources.length > 0
      ? buildMemoryContextPrompt({
          memoryDir,
          sources,
          language,
        })
      : '';
  let summarySource = 'deterministic';
  let summary = {
    result: null,
    summary: deterministicSummary,
  };
  let summaryProfile = null;
  const hasProvider = Boolean(summarySecrets.provider);
  const hasModel = Boolean(summarySecrets.model);
  const hasApiKey = Boolean(summarySecrets.apiKey);
  const llmRefineEnabled = hasCompleteSummarySecrets(summarySecrets);

  if (!llmRefineEnabled) {
    if (hasProvider || hasModel || hasApiKey) {
      const missingFields = [
        !hasProvider ? 'provider' : '',
        !hasModel ? 'model' : '',
        !hasApiKey ? 'apiKey' : '',
      ].filter(Boolean);
      appendInternalWarning(internalWarnings, {
        scope: 'llm-refine-config',
        code: 'llm-config-incomplete',
        message: `Skip LLM refine because required settings are incomplete: missing ${missingFields.join(', ')}.`,
      }, { prefix: 'summarize-memory-context' });
    }
  } else {
    try {
      summaryProfile = resolveSummaryExecutionProfile(summarySecrets);
    } catch (error) {
      appendInternalWarning(
        internalWarnings,
        createInternalWarning({
          scope: 'llm-refine-profile',
          error,
          message:
            'Skip LLM refine because provider profile cannot be resolved.',
          defaultScope: 'memory-context',
          transientPatterns: SUMMARY_TRANSIENT_ERROR_PATTERNS,
        }),
        { prefix: 'summarize-memory-context' },
      );
    }
  }

  if (summaryProfile && prompt) {
    try {
      summary = await summarizeMemoryContext({
        prompt,
        language,
        summarySecrets,
        summaryProfile,
        summaryToolImpl,
      });
      summarySource = 'llm-refine';
    } catch (error) {
      appendInternalWarning(
        internalWarnings,
        createInternalWarning({
          scope: 'memory-context-refine',
          error,
          message:
            'LLM memory-context refine unavailable, fallback to deterministic context.',
          defaultScope: 'memory-context',
          transientPatterns: SUMMARY_TRANSIENT_ERROR_PATTERNS,
        }),
        { prefix: 'summarize-memory-context' },
      );
    }
  }

  await writeMemoryContext(outputPath, summary.summary);

  return {
    memoryDir,
    outputPath,
    prompt,
    sources,
    summarySource,
    summaryMode: summaryProfile
      ? 'deterministic+optional-llm'
      : 'deterministic-only',
    internalWarnings,
    ...summary,
  };
}

async function main() {
  const options = parseArgs();
  if (options.help) {
    printUsage();
    return;
  }

  const result = await generateMemoryContext({
    memoryDir: options.memoryDir,
    outputPath: options.outputPath,
    language: options.language,
    dailyFileLimit: options.dailyFileLimit,
    maxSourceChars: options.maxSourceChars,
  });

  console.log(
    JSON.stringify(
      {
        outputPath: result.outputPath,
        summaryMode: result.summaryMode,
        summarySource: result.summarySource,
        internalWarnings: result.internalWarnings,
        sources: result.sources.map((source) => ({
          label: source.label,
          relativePath: source.relativePath,
          truncated: source.truncated,
        })),
      },
      null,
      2,
    ),
  );
}

const mainModulePath = fileURLToPath(import.meta.url);
const executedAsScript = process.argv[1]
  ? path.resolve(process.argv[1]) === mainModulePath
  : false;

if (executedAsScript) {
  main().catch((error) => {
    console.error(
      error instanceof Error ? error.stack || error.message : String(error),
    );
    process.exitCode = 1;
  });
}
