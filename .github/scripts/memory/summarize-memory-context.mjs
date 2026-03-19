#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { parsePositiveInteger } from './cli-utils.mjs';
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
  return /^\d{4}-\d{2}-\d{2}\.md$/.test(name);
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

    const truncated = truncateForPrompt(rawContent, maxSourceChars);
    sources.push({
      key: `daily:${fileName}`,
      label: `Daily Snapshot ${fileName.replace(/\.md$/, '')}`,
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
  if (sources.length === 0) {
    throw new Error(`No memory markdown files found under: ${memoryDir}`);
  }

  const summarySecrets = buildSummarySecrets({
    apiKey,
    provider,
    model,
  });
  const prompt = buildMemoryContextPrompt({
    memoryDir,
    sources,
    language,
  });
  const summary = await summarizeMemoryContext({
    prompt,
    language,
    summarySecrets,
    summaryProfile: resolveSummaryExecutionProfile(summarySecrets),
    summaryToolImpl,
  });

  await writeMemoryContext(outputPath, summary.summary);

  return {
    memoryDir,
    outputPath,
    prompt,
    sources,
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
