export function parsePositiveInteger(rawValue, fallback) {
  if (rawValue == null || String(rawValue).trim() === '') {
    return fallback;
  }

  const parsed = Number.parseInt(String(rawValue).trim(), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer, received: ${rawValue}`);
  }

  return parsed;
}
