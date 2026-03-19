const test = require("node:test");
const assert = require("node:assert/strict");

const {
  callAgentViaIssue,
  resolveIssueTarget,
} = require("./call-agent-via-issue.js");

function mockFetch(handler) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = handler;
  return () => {
    globalThis.fetch = originalFetch;
  };
}

test("resolveIssueTarget 會依第一則留言中的 name 找到對應 agent", async () => {
  const restore = mockFetch(async (url) => {
    if (url === "https://api.github.com/repos/octo/claw/issues?state=all&per_page=100&page=1") {
      return Response.json([
        { number: 11, title: "其他 agent" },
        { number: 22, title: "目標 agent" },
      ]);
    }

    if (url === "https://api.github.com/repos/octo/claw/issues/11/comments?per_page=1&page=1") {
      return Response.json([
        { id: 101, body: JSON.stringify({ name: "文件小龍蝦", tools: ["rg"] }) },
      ]);
    }

    if (url === "https://api.github.com/repos/octo/claw/issues/22/comments?per_page=1&page=1") {
      return Response.json([
        {
          id: 202,
          body: JSON.stringify({
            name: "測試小龍蝦",
            description: "負責測試",
            tools: ["node", "pnpm"],
          }),
        },
      ]);
    }

    throw new Error(`Unexpected fetch call: ${url}`);
  });

  try {
    const resolved = await resolveIssueTarget({
      githubToken: "token",
      owner: "octo",
      repo: "claw",
      agentName: " 測試小龍蝦 ",
    });

    assert.deepEqual(resolved, {
      issueNumber: 22,
      issueTitle: "目標 agent",
      agentName: "測試小龍蝦",
      configCommentId: 202,
    });
  } finally {
    restore();
  }
});

test("resolveIssueTarget 在找到重複 agent 名稱時會要求改用 issue", async () => {
  const restore = mockFetch(async (url) => {
    if (url === "https://api.github.com/repos/octo/claw/issues?state=all&per_page=100&page=1") {
      return Response.json([
        { number: 11, title: "第一隻" },
        { number: 22, title: "第二隻" },
      ]);
    }

    if (url === "https://api.github.com/repos/octo/claw/issues/11/comments?per_page=1&page=1") {
      return Response.json([
        { id: 101, body: JSON.stringify({ name: "重複小龍蝦", tools: ["rg"] }) },
      ]);
    }

    if (url === "https://api.github.com/repos/octo/claw/issues/22/comments?per_page=1&page=1") {
      return Response.json([
        { id: 202, body: JSON.stringify({ name: "重複小龍蝦", tools: ["node"] }) },
      ]);
    }

    throw new Error(`Unexpected fetch call: ${url}`);
  });

  try {
    await assert.rejects(
      () =>
        resolveIssueTarget({
          githubToken: "token",
          owner: "octo",
          repo: "claw",
          agentName: "重複小龍蝦",
        }),
      /請改用 --issue 指定目標 Issue/
    );
  } finally {
    restore();
  }
});

test("callAgentViaIssue 會先解析 agent 名稱，再對對應 issue 留言並等待回覆", async () => {
  const restore = mockFetch(async (url, init = {}) => {
    if (url === "https://api.github.com/repos/octo/claw/issues?state=all&per_page=100&page=1") {
      return Response.json([{ number: 22, title: "測試 agent" }]);
    }

    if (url === "https://api.github.com/repos/octo/claw/issues/22/comments?per_page=1&page=1") {
      return Response.json([
        { id: 202, body: JSON.stringify({ name: "測試小龍蝦", tools: ["node"] }) },
      ]);
    }

    if (
      url === "https://api.github.com/repos/octo/claw/issues/22/comments" &&
      init.method === "POST"
    ) {
      const payload = JSON.parse(init.body);
      assert.equal(payload.body, "請幫我修正 failing test");
      return Response.json({
        id: 9001,
        html_url: "https://github.com/octo/claw/issues/22#issuecomment-9001",
        created_at: "2026-03-18T10:00:00Z",
      });
    }

    if (
      url ===
      "https://api.github.com/repos/octo/claw/issues/22/comments?per_page=100&direction=asc&since=2026-03-18T10%3A00%3A00Z&page=1"
    ) {
      return Response.json([
        {
          id: 9002,
          html_url: "https://github.com/octo/claw/issues/22#issuecomment-9002",
          body: [
            "已完成修正。",
            "",
            "<!-- githubclaw-brain-result: {\"ok\":true} -->",
          ].join("\n"),
        },
      ]);
    }

    throw new Error(`Unexpected fetch call: ${url}`);
  });

  try {
    const result = await callAgentViaIssue({
      githubToken: "token",
      owner: "octo",
      repo: "claw",
      agentName: "測試小龍蝦",
      message: "請幫我修正 failing test",
      timeoutSeconds: 5,
      pollIntervalSeconds: 0,
    });

    assert.equal(result.issueNumber, 22);
    assert.equal(result.agentName, "測試小龍蝦");
    assert.equal(result.commentId, 9001);
    assert.equal(result.replyCommentId, 9002);
    assert.equal(result.reply, "已完成修正。");
  } finally {
    restore();
  }
});
