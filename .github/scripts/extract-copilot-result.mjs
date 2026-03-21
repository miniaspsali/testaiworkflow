import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function normalizeMessageContent(value) {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((part) => {
        if (typeof part === 'string') {
          return part;
        }
        if (part && typeof part.text === 'string') {
          return part.text;
        }
        return '';
      })
      .join('');
  }

  if (value && typeof value === 'object' && typeof value.text === 'string') {
    return value.text;
  }

  return '';
}

export function parseCopilotLogText(logText) {
  return String(logText)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line, index) => {
      try {
        return [JSON.parse(line)];
      } catch (error) {
        console.warn(
          `[extract-copilot-result] Skipping invalid JSON line ${index + 1}: ${error.message}`,
        );
        return [];
      }
    });
}

function findLast(events, predicate) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (predicate(events[index])) {
      return events[index];
    }
  }
  return null;
}

export function extractCopilotResultFromEvents(events) {
  const sessionError = findLast(events, (event) =>
    event?.type === 'session.error'
    && normalizeMessageContent(event?.data?.message).trim() !== '');
  if (sessionError) {
    return normalizeMessageContent(sessionError.data.message);
  }

  const finalAnswer = findLast(events, (event) =>
    event?.type === 'assistant.message'
    && event?.data?.phase === 'final_answer'
    && normalizeMessageContent(event?.data?.content).trim() !== '');
  if (finalAnswer) {
    return normalizeMessageContent(finalAnswer.data.content);
  }

  const lastAssistantMessage = findLast(events, (event) =>
    event?.type === 'assistant.message'
    && normalizeMessageContent(event?.data?.content).trim() !== '');
  if (lastAssistantMessage) {
    return normalizeMessageContent(lastAssistantMessage.data.content);
  }

  return '';
}

export async function extractCopilotResultFromFile(logPath) {
  const logText = await readFile(logPath, 'utf8');
  return extractCopilotResultFromEvents(parseCopilotLogText(logText));
}

async function main() {
  const logPath = process.argv[2];

  if (!logPath) {
    console.error('Usage: node .github/scripts/extract-copilot-result.mjs <copilot-log-path>');
    process.exitCode = 1;
    return;
  }

  const result = await extractCopilotResultFromFile(logPath);
  process.stdout.write(result);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
