const GITHUB_API_BASE = "https://api.github.com";
const BRAIN_RESULT_META_PATTERN = /<!--\s*githubclaw-brain-result:\s*(\{[\s\S]*?\})\s*-->/;
const TOOL_RUN_META_PATTERN = /<!--\s*githubclaw-tool-run:\s*(\{[\s\S]*?\})\s*-->/;
const MAX_COMMENTS_PER_PAGE = 100;
const MAX_ISSUES_PER_PAGE = 100;

function printUsage() {
  console.error("用法：");
  console.error(
    "  node .agents/skills/call-agent-via-issue/scripts/call-agent-via-issue.js (--agent <name> | --issue <number>) [--message <text> | --message-file <path>] [--timeout <seconds>] [--poll <seconds>] [--language <label>]"
  );
  console.error("");
  console.error("參數說明：");
  console.error("  --agent <name>          優先使用，代理人名稱。會自動掃描所有 Issue 的第一則留言 JSON 中的 name 來找對應 agent");
  console.error("  --issue <number>        相容舊流程，可直接指定 GitHub Issue 編號");
  console.error("  --message <text>        任務訊息文字");
  console.error("  --message-file <path>   從檔案讀取任務訊息");
  console.error("  --timeout <seconds>     等待回覆最長秒數，預設 300");
  console.error("  --poll <seconds>        輪詢間隔秒數，預設 15");
  console.error("  --language <label>      回覆語言標記，預設 繁體中文（zh-TW）");
  console.error("");
  console.error("環境變數：");
  console.error("  GITHUB_TOKEN            必填，GitHub API token");
  console.error("  GITHUB_REPOSITORY       必填，格式 owner/repo");
  console.error("");
  console.error("若未提供 --message 或 --message-file，會從 stdin 讀取完整訊息。");
}

function parseArgs(argv) {
  const args = {
    timeoutSeconds: 300,
    pollIntervalSeconds: 15,
    language: "繁體中文（zh-TW）",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    switch (token) {
      case "--agent":
        args.agentName = next ?? "";
        index += 1;
        break;
      case "--issue":
        args.issueNumber = Number.parseInt(next, 10);
        index += 1;
        break;
      case "--message":
        args.message = next ?? "";
        index += 1;
        break;
      case "--message-file":
        args.messageFile = next ?? "";
        index += 1;
        break;
      case "--timeout":
        args.timeoutSeconds = Number.parseInt(next, 10);
        index += 1;
        break;
      case "--poll":
        args.pollIntervalSeconds = Number.parseInt(next, 10);
        index += 1;
        break;
      case "--language":
        args.language = next ?? "";
        index += 1;
        break;
      case "--help":
      case "-h":
        args.help = true;
        break;
      default:
        throw new Error(`未知參數：${token}`);
    }
  }

  return args;
}

function parseGithubRepository(githubRepository) {
  const trimmed = String(githubRepository ?? "").trim();
  const slashIndex = trimmed.indexOf("/");
  if (slashIndex <= 0 || slashIndex === trimmed.length - 1) {
    throw new Error(
      `GITHUB_REPOSITORY 格式錯誤，預期為 "owner/repo"，收到："${trimmed}"`
    );
  }

  return {
    owner: trimmed.slice(0, slashIndex),
    repo: trimmed.slice(slashIndex + 1),
  };
}

async function githubRequest(token, url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `GitHub API 請求失敗（HTTP ${response.status}）：${text || response.statusText}`
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return null;
}

async function fetchAllIssues(token, owner, repo) {
  const issues = [];
  let page = 1;

  while (true) {
    const url =
      `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}` +
      `/${encodeURIComponent(repo)}/issues?state=all&per_page=${MAX_ISSUES_PER_PAGE}&page=${page}`;

    const batch = await githubRequest(token, url);
    if (!Array.isArray(batch)) {
      break;
    }

    for (const issue of batch) {
      if (!issue?.pull_request) {
        issues.push(issue);
      }
    }

    if (batch.length < MAX_ISSUES_PER_PAGE) {
      break;
    }

    page += 1;
  }

  return issues;
}

async function fetchFirstIssueComment(token, owner, repo, issueNumber) {
  const url =
    `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}` +
    `/${encodeURIComponent(repo)}/issues/${issueNumber}/comments?per_page=1&page=1`;

  const batch = await githubRequest(token, url);
  if (!Array.isArray(batch) || batch.length === 0) {
    return null;
  }

  return batch[0];
}

function parseConfigComment(body) {
  if (typeof body !== "string") {
    return null;
  }

  const trimmed = body.trim();
  if (!trimmed) {
    return null;
  }

  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }

  if (typeof parsed.name !== "string" || !parsed.name.trim()) {
    return null;
  }

  if (!Array.isArray(parsed.tools)) {
    return null;
  }

  return {
    name: parsed.name.trim(),
    description:
      typeof parsed.description === "string" ? parsed.description.trim() : "",
    goal: typeof parsed.goal === "string" ? parsed.goal.trim() : "",
    tools: parsed.tools.filter((item) => typeof item === "string"),
  };
}

async function resolveIssueTarget(options) {
  const { githubToken, owner, repo, issueNumber, agentName } = options;
  const trimmedAgentName = String(agentName ?? "").trim();

  if (Number.isInteger(issueNumber) && issueNumber > 0) {
    const firstComment = await fetchFirstIssueComment(
      githubToken,
      owner,
      repo,
      issueNumber
    );
    const config = parseConfigComment(firstComment?.body ?? "");

    if (trimmedAgentName && config?.name !== trimmedAgentName) {
      throw new Error(
        `Issue #${issueNumber} 的第一則留言 agent 名稱是「${config?.name || "未設定"}」，與指定的「${trimmedAgentName}」不一致。`
      );
    }

    return {
      issueNumber,
      issueTitle: "",
      agentName: config?.name ?? trimmedAgentName,
      configCommentId: firstComment?.id ?? null,
    };
  }

  if (!trimmedAgentName) {
    throw new Error("缺少有效的 --agent <name> 或 --issue <number>。");
  }

  const issues = await fetchAllIssues(githubToken, owner, repo);
  const matches = [];

  for (const issue of issues) {
    const firstComment = await fetchFirstIssueComment(
      githubToken,
      owner,
      repo,
      issue.number
    );
    const config = parseConfigComment(firstComment?.body ?? "");

    if (config?.name === trimmedAgentName) {
      matches.push({
        issue,
        firstComment,
        config,
      });
    }
  }

  if (matches.length === 0) {
    throw new Error(
      `找不到名稱為「${trimmedAgentName}」的 agent。請確認對應 Issue 的第一則留言是合法 JSON，且包含 name 欄位。`
    );
  }

  if (matches.length > 1) {
    const duplicatedIssues = matches.map((match) => `#${match.issue.number}`).join("、");
    throw new Error(
      `找到多個名稱為「${trimmedAgentName}」的 agent，位於 ${duplicatedIssues}。請改用 --issue 指定目標 Issue。`
    );
  }

  return {
    issueNumber: matches[0].issue.number,
    issueTitle: matches[0].issue.title ?? "",
    agentName: matches[0].config.name,
    configCommentId: matches[0].firstComment?.id ?? null,
  };
}

async function fetchCommentsAfter(token, commentsUrl, afterCommentId, sinceIso) {
  const allComments = [];
  let page = 1;

  while (true) {
    const url =
      `${commentsUrl}?per_page=${MAX_COMMENTS_PER_PAGE}&direction=asc` +
      `&since=${encodeURIComponent(sinceIso)}&page=${page}`;

    const batch = await githubRequest(token, url);
    if (!Array.isArray(batch)) {
      break;
    }

    for (const comment of batch) {
      if (comment?.id !== afterCommentId) {
        allComments.push(comment);
      }
    }

    if (batch.length < MAX_COMMENTS_PER_PAGE) {
      break;
    }

    page += 1;
  }

  return allComments;
}

function stripGithubClawMeta(body) {
  return String(body ?? "")
    .replace(BRAIN_RESULT_META_PATTERN, "")
    .replace(TOOL_RUN_META_PATTERN, "")
    .trim();
}

function hasBrainResultMeta(body) {
  return BRAIN_RESULT_META_PATTERN.test(String(body ?? ""));
}

function hasOnlyToolRunMeta(body) {
  const normalized = String(body ?? "");
  return TOOL_RUN_META_PATTERN.test(normalized) && !BRAIN_RESULT_META_PATTERN.test(normalized);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readStdin() {
  if (process.stdin.isTTY) {
    return "";
  }

  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
  }
  return input.trim();
}

async function readMessage(args) {
  if (args.messageFile) {
    const { readFile } = await import("node:fs/promises");
    return (await readFile(args.messageFile, "utf8")).trim();
  }

  if (typeof args.message === "string" && args.message.trim()) {
    return args.message.trim();
  }

  return readStdin();
}

async function callAgentViaIssue(options) {
  const {
    githubToken,
    owner,
    repo,
    issueNumber,
    agentName,
    message,
    timeoutSeconds,
    pollIntervalSeconds,
  } = options;

  if (!githubToken) {
    throw new Error("缺少 GITHUB_TOKEN，無法呼叫 GitHub API。");
  }
  if (!owner || !repo) {
    throw new Error("缺少 owner 或 repo 資訊，無法組成 GitHub API 路徑。");
  }

  const target = await resolveIssueTarget({
    githubToken,
    owner,
    repo,
    issueNumber,
    agentName,
  });

  const commentsUrl =
    `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}` +
    `/${encodeURIComponent(repo)}/issues/${target.issueNumber}/comments`;

  const postedComment = await githubRequest(githubToken, commentsUrl, {
    method: "POST",
    body: JSON.stringify({ body: message }),
  });

  const commentId = postedComment.id;
  const commentUrl = postedComment.html_url;
  const sinceIso = postedComment.created_at;
  const startTime = Date.now();
  const timeoutMs = timeoutSeconds * 1000;
  const pollIntervalMs = pollIntervalSeconds * 1000;

  while (true) {
    await sleep(pollIntervalMs);

    const elapsed = Date.now() - startTime;
    if (elapsed >= timeoutMs) {
      throw new Error(
        `等待代理人回覆逾時（${timeoutSeconds} 秒）。` +
          `已在 Issue #${target.issueNumber} 發布留言（ID: ${commentId}，${commentUrl}），但未在時限內收到回覆。`
      );
    }

    const candidates = await fetchCommentsAfter(
      githubToken,
      commentsUrl,
      commentId,
      sinceIso
    );

    const brainResult = candidates.find((comment) => hasBrainResultMeta(comment.body));
    if (brainResult) {
      return {
        issueNumber: target.issueNumber,
        agentName: target.agentName,
        commentId,
        commentUrl,
        replyCommentId: brainResult.id,
        replyCommentUrl: brainResult.html_url,
        reply: stripGithubClawMeta(brainResult.body),
        elapsedSeconds: Math.round((Date.now() - startTime) / 1000),
      };
    }

    const otherReply = candidates.find((comment) => !hasOnlyToolRunMeta(comment.body));
    if (otherReply) {
      return {
        issueNumber: target.issueNumber,
        agentName: target.agentName,
        commentId,
        commentUrl,
        replyCommentId: otherReply.id,
        replyCommentUrl: otherReply.html_url,
        reply: stripGithubClawMeta(otherReply.body),
        elapsedSeconds: Math.round((Date.now() - startTime) / 1000),
      };
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  if (
    (!Number.isInteger(args.issueNumber) || args.issueNumber <= 0) &&
    !String(args.agentName ?? "").trim()
  ) {
    throw new Error("缺少有效的 --agent <name> 或 --issue <number>。");
  }
  if (!Number.isInteger(args.timeoutSeconds) || args.timeoutSeconds < 0) {
    throw new Error("--timeout 必須是大於等於 0 的整數。");
  }
  if (!Number.isInteger(args.pollIntervalSeconds) || args.pollIntervalSeconds < 0) {
    throw new Error("--poll 必須是大於等於 0 的整數。");
  }

  const message = await readMessage(args);
  if (!message) {
    throw new Error("缺少任務訊息。請提供 --message、--message-file，或透過 stdin 傳入。");
  }

  const githubToken = process.env.GITHUB_TOKEN ?? "";
  const githubRepository = process.env.GITHUB_REPOSITORY ?? "";
  const { owner, repo } = parseGithubRepository(githubRepository);

  if (String(args.agentName ?? "").trim()) {
    console.error(
      `正在搜尋 agent「${String(args.agentName).trim()}」並委派任務到 ${owner}/${repo}，語言：${args.language}...`
    );
  } else {
    console.error(
      `正在將任務委派到 ${owner}/${repo}#${args.issueNumber}，語言：${args.language}...`
    );
  }

  const result = await callAgentViaIssue({
    githubToken,
    owner,
    repo,
    issueNumber: args.issueNumber,
    agentName: args.agentName,
    message,
    timeoutSeconds: args.timeoutSeconds,
    pollIntervalSeconds: args.pollIntervalSeconds,
  });

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

module.exports = {
  callAgentViaIssue,
  fetchAllIssues,
  fetchFirstIssueComment,
  fetchCommentsAfter,
  hasBrainResultMeta,
  hasOnlyToolRunMeta,
  parseArgs,
  parseConfigComment,
  parseGithubRepository,
  resolveIssueTarget,
  stripGithubClawMeta,
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
