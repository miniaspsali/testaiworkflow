#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);

function getArgValue(flag) {
  const index = args.indexOf(flag);
  if (index === -1) {
    return null;
  }
  return args[index + 1] ?? null;
}

const bodyArg = getArgValue('--body');
const fileArg = getArgValue('--from-file');
const envArg = getArgValue('--from-env');

let body = '';

if (bodyArg !== null) {
  body = bodyArg;
} else if (fileArg !== null) {
  body = readFileSync(fileArg, 'utf8');
} else if (envArg !== null) {
  body = process.env[envArg] ?? '';
} else {
  console.error('Usage: build-comment-body-json.mjs --body <text> | --from-file <path> | --from-env <NAME>');
  process.exit(1);
}

process.stdout.write(JSON.stringify({ body }));
