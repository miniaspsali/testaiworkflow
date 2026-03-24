export function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function toSingleLine(value) {
  return normalizeWhitespace(value).replace(/\n+/g, ' ').trim();
}

export function truncateText(value, maxLength) {
  const normalized = String(value || '');
  if (!normalized || normalized.length <= maxLength) {
    return normalized;
  }

  if (maxLength <= 1) {
    return normalized.slice(0, maxLength);
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function canonicalizeForDedup(value) {
  return toSingleLine(value)
    .toLowerCase()
    .replace(/[`*_#>[\](){}]/g, ' ')
    .replace(/[^a-z0-9\u3400-\u9fff\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function dedupeAndLimitItems(
  values,
  { fallbackText, maxItems = 5, maxItemChars = 180 } = {},
) {
  const result = [];
  const seen = new Set();

  for (const value of values || []) {
    const normalized = truncateText(toSingleLine(value), maxItemChars);
    if (!normalized) {
      continue;
    }

    const dedupeKey = canonicalizeForDedup(normalized);
    if (!dedupeKey || seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    result.push(normalized);
    if (result.length >= maxItems) {
      break;
    }
  }

  if (result.length > 0) {
    return result;
  }

  return fallbackText
    ? [truncateText(toSingleLine(fallbackText), maxItemChars)]
    : [];
}

export function extractSourceLines(value, maxLinesOrOptions = 80) {
  const options =
    typeof maxLinesOrOptions === 'number'
      ? { maxLines: maxLinesOrOptions }
      : maxLinesOrOptions || {};
  const maxLines = Number(options.maxLines || 80);
  const stripTaskMarkers = Boolean(options.stripTaskMarkers);

  return String(value || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => {
      let normalized = line.trim();
      normalized = normalized.replace(/^[-*]\s+/, '');
      normalized = normalized.replace(/^\d+\.\s+/, '');
      if (stripTaskMarkers) {
        normalized = normalized.replace(/^\[(?: |x|X)\]\s+/, '');
      }
      return normalized.trim();
    })
    .filter(Boolean)
    .slice(0, Math.max(maxLines, 0));
}

export function filterLinesByKeywords(lines, keywords = []) {
  if (!Array.isArray(lines) || lines.length === 0) {
    return [];
  }

  const loweredKeywords = keywords.map((keyword) => keyword.toLowerCase());
  return lines.filter((line) => {
    const loweredLine = String(line || '').toLowerCase();
    return loweredKeywords.some((keyword) => loweredLine.includes(keyword));
  });
}

export function hasCompleteSummarySecrets(summarySecrets = {}) {
  return Boolean(
    summarySecrets.provider && summarySecrets.model && summarySecrets.apiKey,
  );
}

export function detectSummaryErrorCode(error, transientPatterns = []) {
  const message = error instanceof Error ? error.message : String(error || '');
  if (transientPatterns.some((pattern) => pattern.test(message))) {
    return 'llm-temporary-unavailable';
  }
  return 'llm-refine-failed';
}

export function createInternalWarning({
  scope,
  error,
  message,
  defaultScope = 'memory',
  transientPatterns = [],
}) {
  const raw = error instanceof Error ? error.message : String(error || '');
  return {
    scope: String(scope || defaultScope),
    code: detectSummaryErrorCode(error, transientPatterns),
    message: message || truncateText(raw || 'Unknown warning', 240),
  };
}

export function appendInternalWarning(
  warnings,
  warning,
  { logger = console, prefix = 'memory' } = {},
) {
  if (!warning || !Array.isArray(warnings)) {
    return;
  }

  warnings.push(warning);
  logger.warn(`[${prefix}][warning] ${warning.scope}: ${warning.message}`);
}
