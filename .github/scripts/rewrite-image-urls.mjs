import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const IMAGE_EXTENSIONS = /\.(?:jpe?g|png|gif|webp|svg)$/i;
const MD_IMAGE_RE = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

// Bare image paths in text — paths like `workspaces/issue-1/files/img.png`.
// Negative lookbehind excludes paths inside URLs (preceded by `/`) or markdown syntax (`(`, `[`).
const BARE_IMAGE_PATH_RE = /(?<![/(\[])\b((?:[\w.-]+\/)+[\w.-]+\.(?:jpe?g|png|gif|webp|svg))\b/gi;

function isAbsoluteUrl(path) {
  return /^(?:https?:\/\/|data:)/i.test(path);
}

function buildBlobUrl(rawPath, repo, branch) {
  const cleanPath = rawPath.replace(/^\.\//, '');
  const encodedBranch = encodeURIComponent(branch);
  const encodedPath = cleanPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `https://github.com/${repo}/blob/${encodedBranch}/${encodedPath}?raw=true`;
}

function fileName(p) {
  return p.split('/').pop();
}

export function rewriteImageUrls(text, repo, branch) {
  if (!text || !repo || !branch) {
    return text;
  }

  // Pass 1: Replace all markdown image/link syntax with placeholders to protect
  // them from Pass 2. Rewrite relative image paths to absolute blob URLs.
  const placeholders = [];
  let result = text.replace(MD_IMAGE_RE, (match, alt, rawPath) => {
    const idx = placeholders.length;
    if (isAbsoluteUrl(rawPath) || !IMAGE_EXTENSIONS.test(rawPath)) {
      placeholders.push(match);
    } else {
      placeholders.push(`![${alt}](${buildBlobUrl(rawPath, repo, branch)})`);
    }
    return `\x00MDIMG${idx}\x00`;
  });

  // Pass 2: Rewrite bare image paths in remaining text (now safe from collision
  // with Pass 1 URLs). Convert to markdown images so they render on GitHub.
  result = result.replace(BARE_IMAGE_PATH_RE, (_match, rawPath) => {
    return `![${fileName(rawPath)}](${buildBlobUrl(rawPath, repo, branch)})`;
  });

  // Restore placeholders
  result = result.replace(/\x00MDIMG(\d+)\x00/g, (_m, idx) => placeholders[Number(idx)]);

  return result;
}

async function main() {
  const [resultFile, repo, branch] = process.argv.slice(2);

  if (!resultFile || !repo || !branch) {
    console.error(
      'Usage: node .github/scripts/rewrite-image-urls.mjs <result-file> <repo> <branch>',
    );
    process.exitCode = 1;
    return;
  }

  const text = await readFile(resultFile, 'utf8');
  const rewritten = rewriteImageUrls(text, repo, branch);

  if (rewritten !== text) {
    await writeFile(resultFile, rewritten, 'utf8');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
