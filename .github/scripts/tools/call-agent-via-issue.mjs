const E = "call_agent_via_issue", S = "透過 GitHub Issue 留言呼叫外部代理人，等待其回覆，並將回覆內容作為結果回傳。適用於需要將任務委派給另一個代理人、並等待其完成後再繼續的情境。呼叫時需指定 Issue 編號與訊息內容，工具會自動留言並輪詢回覆，直到收到回應或逾時為止。", $ = { type: "object", properties: { issue_number: { type: "integer", description: "要留言的 GitHub Issue 編號。外部代理人需要監聽這個 Issue 才能收到訊息。" }, message: { type: "string", description: "要傳送給外部代理人的完整訊息內容。應包含足夠的背景資訊，讓代理人能夠理解任務需求。" }, timeout_seconds: { type: "integer", description: "等待代理人回覆的最長秒數。超過此時間若仍未收到回覆，工具將拋出逾時錯誤。預設值為 300 秒（5 分鐘）。", default: 300 }, poll_interval_seconds: { type: "integer", description: "每次輪詢 GitHub Issue 留言的間隔秒數。預設值為 15 秒。", default: 15 }, language: { type: "string", description: "回應內容應使用的語言，例如「繁體中文（zh-TW）」或「English」。應與目前對話語言一致。" } }, required: ["issue_number", "message", "language"], additionalProperties: !1 }, G = { secrets: { githubToken: "GITHUB_TOKEN", githubRepository: "GITHUB_REPOSITORY" } }, P = {
  name: E,
  description: S,
  inputSchema: $,
  runtime: G
}, U = "https://api.github.com", _ = /<!--\s*githubclaw-brain-result:\s*(\{[\s\S]*?\})\s*-->/, w = /<!--\s*githubclaw-tool-run:\s*(\{[\s\S]*?\})\s*-->/, f = 100;
async function I(e, t, n) {
  const o = await fetch(t, {
    ...n,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${e}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...n?.headers ?? {}
    }
  });
  if (!o.ok) {
    const r = await o.text().catch(() => "");
    throw new Error(
      `GitHub API 請求失敗（HTTP ${o.status}）：${r || o.statusText}`
    );
  }
  return (o.headers.get("content-type") ?? "").includes("application/json") ? o.json() : null;
}
async function C(e, t, n, o) {
  const s = [];
  let r = 1;
  for (; ; ) {
    const c = `${t}?per_page=${f}&direction=asc&since=${encodeURIComponent(o)}&page=${r}`, i = await I(e, c);
    if (!Array.isArray(i))
      break;
    for (const a of i)
      a.id !== n && s.push(a);
    if (i.length < f)
      break;
    r += 1;
  }
  return s;
}
function T(e) {
  return e.replace(_, "").replace(w, "").trim();
}
function H(e) {
  return _.test(e);
}
function M(e) {
  return w.test(e) && !_.test(e);
}
function O(e) {
  return new Promise((t) => setTimeout(t, e));
}
function N(e) {
  const t = String(e ?? "").trim(), n = t.indexOf("/");
  if (n <= 0 || n === t.length - 1)
    throw new Error(
      `GITHUB_REPOSITORY 格式錯誤，預期為 "owner/repo"，收到："${t}"`
    );
  return {
    owner: t.slice(0, n),
    repo: t.slice(n + 1)
  };
}
async function v(e) {
  const {
    githubToken: t,
    owner: n,
    repo: o,
    issueNumber: s,
    message: r,
    timeoutSeconds: c,
    pollIntervalSeconds: i
  } = e;
  if (!t)
    throw new Error("缺少 GITHUB_TOKEN，無法呼叫 GitHub API。");
  if (!n || !o)
    throw new Error("缺少 owner 或 repo 資訊，無法組成 GitHub API 路徑。");
  const a = `${U}/repos/${encodeURIComponent(n)}/${encodeURIComponent(o)}/issues/${s}/comments`, d = await I(t, a, {
    method: "POST",
    body: JSON.stringify({ body: r })
  }), u = d.id, m = d.html_url, g = d.created_at, h = Date.now(), R = c * 1e3, A = i * 1e3;
  for (; ; ) {
    if (await O(A), Date.now() - h >= R)
      throw new Error(
        `等待代理人回覆逾時（${c} 秒）。已在 Issue #${s} 發布留言（ID: ${u}，${m}），但未在時限內收到回覆。`
      );
    const y = await C(
      t,
      a,
      u,
      g
    ), l = y.find(
      (b) => H(b.body ?? "")
    );
    if (l)
      return {
        commentId: u,
        commentUrl: m,
        replyCommentId: l.id,
        replyCommentUrl: l.html_url,
        reply: T(l.body ?? ""),
        elapsedSeconds: Math.round((Date.now() - h) / 1e3)
      };
    const p = y.find(
      (b) => !M(b.body ?? "")
    );
    if (p)
      return {
        commentId: u,
        commentUrl: m,
        replyCommentId: p.id,
        replyCommentUrl: p.html_url,
        reply: T(p.body ?? ""),
        elapsedSeconds: Math.round((Date.now() - h) / 1e3)
      };
  }
}
const B = {
  ...P,
  async handler(e, t) {
    const n = t?.secrets?.githubToken ?? "", o = t?.secrets?.githubRepository ?? "", { owner: s, repo: r } = N(o), c = typeof e.timeout_seconds == "number" && e.timeout_seconds >= 0 ? e.timeout_seconds : 300, i = typeof e.poll_interval_seconds == "number" && e.poll_interval_seconds >= 0 ? e.poll_interval_seconds : 15;
    return await v({
      githubToken: n,
      owner: s,
      repo: r,
      issueNumber: e.issue_number,
      message: e.message,
      timeoutSeconds: c,
      pollIntervalSeconds: i
    });
  }
}, j = B;
export {
  B as callAgentViaIssueTool,
  j as default,
  j as tool
};
