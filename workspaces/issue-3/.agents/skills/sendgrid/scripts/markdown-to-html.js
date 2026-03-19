#!/usr/bin/env node
/**
 * markdown-to-html.js
 *
 * Converts Markdown to HTML for use with the SendGrid email skill.
 *
 * Usage:
 *   node markdown-to-html.js [file.md]          # convert a file
 *   echo "# Hello" | node markdown-to-html.js   # convert from stdin
 *
 * Output: full HTML document written to stdout.
 *
 * Dependency: marked (auto-installed if missing)
 *   npm install marked   OR   npm install -g marked
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Auto-install 'marked' into the script's own directory if not available.
try {
  require.resolve('marked');
} catch {
  const scriptDir = __dirname;
  process.stderr.write("'marked' not found – installing locally…\n");
  execSync('npm install --prefix . marked', { cwd: scriptDir, stdio: 'inherit' });
}

const { marked } = require('marked');

function readInput(callback) {
  const filePath = process.argv[2];
  if (filePath) {
    const abs = path.resolve(filePath);
    callback(fs.readFileSync(abs, 'utf8'));
  } else {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => { callback(data); });
  }
}

readInput(markdown => {
  const body = marked.parse(markdown);
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Email</title></head>
<body>
${body}
</body>
</html>`;
  process.stdout.write(html);
});
