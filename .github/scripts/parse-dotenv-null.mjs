#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const filePath = process.argv[2] ?? '.env';
const validKey = /^[A-Za-z_][A-Za-z0-9_]*$/;

function warn(lineNumber, message) {
  process.stderr.write(`::warning file=${filePath},line=${lineNumber}::${message}\n`);
}

function stripInlineComment(rawValue) {
  let inSingle = false;
  let inDouble = false;
  let escaped = false;

  for (let i = 0; i < rawValue.length; i += 1) {
    const ch = rawValue[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === '\\' && inDouble) {
      escaped = true;
      continue;
    }

    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }

    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }

    if (ch === '#' && !inSingle && !inDouble) {
      if (i === 0 || /\s/.test(rawValue[i - 1])) {
        return rawValue.slice(0, i).trimEnd();
      }
    }
  }

  return rawValue.trimEnd();
}

function parseValue(rawValue) {
  const value = stripInlineComment(rawValue).trim();
  if (!value) {
    return '';
  }

  if (value[0] === "'") {
    const closingIndex = value.indexOf("'", 1);
    if (closingIndex === -1) {
      throw new Error('Unterminated single-quoted value');
    }

    const trailing = value.slice(closingIndex + 1).trim();
    if (trailing && !trailing.startsWith('#')) {
      throw new Error('Unexpected characters after single-quoted value');
    }

    return value.slice(1, closingIndex);
  }

  if (value[0] === '"') {
    let parsed = '';
    let escaped = false;

    for (let i = 1; i < value.length; i += 1) {
      const ch = value[i];

      if (escaped) {
        const map = {
          n: '\n',
          r: '\r',
          t: '\t',
          '"': '"',
          '\\': '\\',
          $: '$',
        };
        parsed += map[ch] ?? `\\${ch}`;
        escaped = false;
        continue;
      }

      if (ch === '\\') {
        escaped = true;
        continue;
      }

      if (ch === '"') {
        const trailing = value.slice(i + 1).trim();
        if (trailing && !trailing.startsWith('#')) {
          throw new Error('Unexpected characters after double-quoted value');
        }
        return parsed;
      }

      parsed += ch;
    }

    throw new Error('Unterminated double-quoted value');
  }

  return value;
}

const content = readFileSync(filePath, 'utf8');
const lines = content.split(/\r?\n/);

for (let i = 0; i < lines.length; i += 1) {
  let line = lines[i].trim();
  const lineNumber = i + 1;

  if (!line || line.startsWith('#')) {
    continue;
  }

  if (line.startsWith('export ')) {
    line = line.slice(7).trimStart();
  }

  const equalIndex = line.indexOf('=');
  if (equalIndex === -1) {
    warn(lineNumber, "Skipping invalid dotenv line without '='");
    continue;
  }

  const key = line.slice(0, equalIndex).trim();
  const rawValue = line.slice(equalIndex + 1);

  if (!validKey.test(key)) {
    warn(lineNumber, `Skipping invalid environment variable name '${key}'`);
    continue;
  }

  let value = '';
  try {
    value = parseValue(rawValue);
  } catch (error) {
    warn(lineNumber, `${error.message}; skipping line`);
    continue;
  }

  process.stdout.write(key);
  process.stdout.write('\0');
  process.stdout.write(value);
  process.stdout.write('\0');
}
