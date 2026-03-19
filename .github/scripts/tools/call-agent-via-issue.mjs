const O = "call_agent_via_issue", G = "透過 GitHub Issue 留言呼叫外部代理人，等待其回覆，並將回覆內容作為結果回傳。適用於需要將任務委派給另一個代理人、並等待其完成後再繼續的情境。呼叫時應優先提供 agent_name，工具會先掃描 repo 內所有 Issue 的第一則留言 JSON 中的 name 來解析對應 agent；若已知目標 Issue，也可用 issue_number 直接指定。", P = { type: "object", properties: { agent_name: { type: "string", description: "優先使用。代理人名稱，工具會掃描所有 Issue 的第一則留言 config JSON，匹配其中的 name 來解析目標 Issue。" }, issue_number: { type: "integer", description: "相容舊流程的 fallback。若你已經知道目標 GitHub Issue 編號，可直接指定。" }, message: { type: "string", description: "要傳送給外部代理人的完整訊息內容。應包含足夠的背景資訊，讓代理人能夠理解任務需求。" }, timeout_seconds: { type: "integer", description: "等待代理人回覆的最長秒數。超過此時間若仍未收到回覆，工具將拋出逾時錯誤。預設值為 300 秒（5 分鐘）。", default: 300 }, poll_interval_seconds: { type: "integer", description: "每次輪詢 GitHub Issue 留言的間隔秒數。預設值為 15 秒。", default: 15 }, language: { type: "string", description: "回應內容應使用的語言，例如「繁體中文（zh-TW）」或「English」。應與目前對話語言一致。" } }, required: ["message", "language"], additionalProperties: !1 }, M = { secrets: { githubToken: "GITHUB_TOKEN", githubRepository: "GITHUB_REPOSITORY" } }, H = {
  name: O,
  description: G,
  inputSchema: P,
  runtime: M
}, _ = "https://api.github.com", w = /<!--\s*githubclaw-brain-result:\s*(\{[\s\S]*?\})\s*-->/, R = /<!--\s*githubclaw-tool-run:\s*(\{[\s\S]*?\})\s*-->/, T = 100, N = 100;
async function g(e, n, s) {
  const t = await fetch(n, {
    ...s,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${e}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...s?.headers ?? {}
    }
  });
  if (!t.ok) {
    const i = await t.text().catch(() => "");
    throw new Error(
      `GitHub API 請求失敗（HTTP ${t.status}）：${i || t.statusText}`
    );
  }
  return (t.headers.get("content-type") ?? "").includes("application/json") ? t.json() : null;
}
async function k(e, n, s) {
  const t = [];
  let o = 1;
  for (; ; ) {
    const i = `${_}/repos/${encodeURIComponent(n)}/${encodeURIComponent(s)}/issues?state=all&per_page=${N}&page=${o}`, r = await g(e, i);
    if (!Array.isArray(r))
      break;
    for (const c of r)
      c?.pull_request || t.push(c);
    if (r.length < N)
      break;
    o += 1;
  }
  return t;
}
async function A(e, n, s, t) {
  const o = `${_}/repos/${encodeURIComponent(n)}/${encodeURIComponent(s)}/issues/${t}/comments?per_page=1&page=1`, i = await g(e, o);
  return !Array.isArray(i) || i.length === 0 ? null : i[0];
}
function $(e) {
  if (typeof e != "string")
    return null;
  const n = e.trim();
  if (!n)
    return null;
  let s;
  try {
    s = JSON.parse(n);
  } catch {
    return null;
  }
  if (typeof s != "object" || s === null || Array.isArray(s))
    return null;
  const t = s;
  return typeof t.name != "string" || !t.name.trim() || !Array.isArray(t.tools) ? null : {
    name: t.name.trim(),
    description: typeof t.description == "string" ? t.description.trim() : "",
    goal: typeof t.goal == "string" ? t.goal.trim() : "",
    tools: t.tools.filter((o) => typeof o == "string")
  };
}
async function v(e) {
  const { githubToken: n, owner: s, repo: t, issueNumber: o, agentName: i } = e, r = String(i ?? "").trim();
  if (Number.isInteger(o) && o > 0) {
    const u = await A(
      n,
      s,
      t,
      o
    ), m = $(u?.body ?? "");
    if (r && m?.name !== r)
      throw new Error(
        `Issue #${o} 的第一則留言 agent 名稱是「${m?.name || "未設定"}」，與指定的「${r}」不一致。`
      );
    return {
      issueNumber: o,
      issueTitle: "",
      agentName: m?.name ?? r,
      configCommentId: u?.id ?? null
    };
  }
  if (!r)
    throw new Error("缺少 agent_name 或 issue_number。");
  const c = await k(n, s, t), a = [];
  for (const u of c) {
    const m = await A(
      n,
      s,
      t,
      u.number
    ), l = $(m?.body ?? "");
    l?.name === r && a.push({
      issue: u,
      firstComment: m,
      config: l
    });
  }
  if (a.length === 0)
    throw new Error(
      `找不到名稱為「${r}」的 agent。請確認對應 Issue 的第一則留言是合法 JSON，且包含 name 欄位。`
    );
  if (a.length > 1) {
    const u = a.map((m) => `#${m.issue.number}`).join("、");
    throw new Error(
      `找到多個名稱為「${r}」的 agent，位於 ${u}。請改用 issue_number 指定目標 Issue。`
    );
  }
  return {
    issueNumber: a[0].issue.number,
    issueTitle: a[0].issue.title ?? "",
    agentName: a[0].config.name,
    configCommentId: a[0].firstComment?.id ?? null
  };
}
async function B(e, n, s, t) {
  const o = [];
  let i = 1;
  for (; ; ) {
    const r = `${n}?per_page=${T}&direction=asc&since=${encodeURIComponent(t)}&page=${i}`, c = await g(e, r);
    if (!Array.isArray(c))
      break;
    for (const a of c)
      a.id !== s && o.push(a);
    if (c.length < T)
      break;
    i += 1;
  }
  return o;
}
function E(e) {
  return e.replace(w, "").replace(R, "").trim();
}
function j(e) {
  return w.test(e);
}
function x(e) {
  return R.test(e) && !w.test(e);
}
function D(e) {
  return new Promise((n) => setTimeout(n, e));
}
function J(e) {
  const n = String(e ?? "").trim(), s = n.indexOf("/");
  if (s <= 0 || s === n.length - 1)
    throw new Error(
      `GITHUB_REPOSITORY 格式錯誤，預期為 "owner/repo"，收到："${n}"`
    );
  return {
    owner: n.slice(0, s),
    repo: n.slice(s + 1)
  };
}
async function q(e) {
  const {
    githubToken: n,
    owner: s,
    repo: t,
    issueNumber: o,
    agentName: i,
    message: r,
    timeoutSeconds: c,
    pollIntervalSeconds: a
  } = e;
  if (!n)
    throw new Error("缺少 GITHUB_TOKEN，無法呼叫 GitHub API。");
  if (!s || !t)
    throw new Error("缺少 owner 或 repo 資訊，無法組成 GitHub API 路徑。");
  const u = await v({
    githubToken: n,
    owner: s,
    repo: t,
    issueNumber: o,
    agentName: i
  }), m = `${_}/repos/${encodeURIComponent(s)}/${encodeURIComponent(t)}/issues/${u.issueNumber}/comments`, l = await g(n, m, {
    method: "POST",
    body: JSON.stringify({ body: r })
  }), p = l.id, b = l.html_url, S = l.created_at, h = Date.now(), C = c * 1e3, U = a * 1e3;
  for (; ; ) {
    if (await D(U), Date.now() - h >= C)
      throw new Error(
        `等待代理人回覆逾時（${c} 秒）。已在 Issue #${u.issueNumber} 發布留言（ID: ${p}，${b}），但未在時限內收到回覆。`
      );
    const I = await B(
      n,
      m,
      p,
      S
    ), d = I.find(
      (y) => j(y.body ?? "")
    );
    if (d)
      return {
        issueNumber: u.issueNumber,
        agentName: u.agentName,
        commentId: p,
        commentUrl: b,
        replyCommentId: d.id,
        replyCommentUrl: d.html_url,
        reply: E(d.body ?? ""),
        elapsedSeconds: Math.round((Date.now() - h) / 1e3)
      };
    const f = I.find(
      (y) => !x(y.body ?? "")
    );
    if (f)
      return {
        issueNumber: u.issueNumber,
        agentName: u.agentName,
        commentId: p,
        commentUrl: b,
        replyCommentId: f.id,
        replyCommentUrl: f.html_url,
        reply: E(f.body ?? ""),
        elapsedSeconds: Math.round((Date.now() - h) / 1e3)
      };
  }
}
const V = {
  ...H,
  async handler(e, n) {
    const s = n?.secrets?.githubToken ?? "", t = n?.secrets?.githubRepository ?? "", { owner: o, repo: i } = J(t), r = typeof e.timeout_seconds == "number" && e.timeout_seconds >= 0 ? e.timeout_seconds : 300, c = typeof e.poll_interval_seconds == "number" && e.poll_interval_seconds >= 0 ? e.poll_interval_seconds : 15;
    if ((!Number.isInteger(e.issue_number) || e.issue_number <= 0) && !String(e.agent_name ?? "").trim())
      throw new Error("缺少 agent_name 或 issue_number。");
    return await q({
      githubToken: s,
      owner: o,
      repo: i,
      issueNumber: typeof e.issue_number == "number" ? e.issue_number : void 0,
      agentName: e.agent_name,
      message: e.message,
      timeoutSeconds: r,
      pollIntervalSeconds: c
    });
  }
}, z = V;
export {
  V as callAgentViaIssueTool,
  z as default,
  z as tool
};
