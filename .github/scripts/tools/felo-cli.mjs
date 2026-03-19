const g = "felo_chat", h = "用來搜尋網路並取得外部資訊的工具。當使用者的問題需要查詢資料、取得最新資訊、確認事實或需要引用來源時使用。若問題可以直接用一般知識回答，則不需要使用此工具。", m = { type: "object", properties: { query: { type: "string", description: "要提交進行搜尋的完整問題或內容（1–2000 字元）。應盡量保留使用者原始問題的語言與措辭，不要翻譯、摘要或改寫成關鍵字搜尋。" }, language: { type: "string", description: "最終回答應使用的語言。應與使用者對話語言一致，例如「繁體中文（zh-TW）」或「English」。" } }, required: ["query", "language"], additionalProperties: !1 }, w = { secrets: { apiKey: "FELO_API_KEY" } }, E = {
  name: g,
  description: h,
  inputSchema: m,
  runtime: w
}, q = "https://openapi.felo.ai", I = 1, _ = 2e3;
class c extends Error {
  code;
  requestId;
  statusCode;
  constructor(t, s = {}) {
    super(t), this.name = "FeloApiError", this.code = s.code, this.requestId = s.requestId, this.statusCode = s.statusCode, s.cause !== void 0 && (this.cause = s.cause);
  }
}
const d = (e) => typeof e == "object" && e !== null, A = (e) => {
  if (typeof e != "string")
    throw new TypeError("Query must be a string.");
  if (e.length < I || e.length > _)
    throw new RangeError("Query length must be between 1 and 2000 characters.");
}, F = (e) => e.status === "ok" && e.message === null, b = (e) => e.status === 200 && typeof e.code == "string" && e.code.toUpperCase() === "OK", S = (e) => {
  if (!d(e) || !F(e) && !b(e))
    return null;
  const t = e.data;
  if (!d(t))
    return null;
  const s = t.id, r = t.message_id, a = t.answer, p = t.query_analysis, n = t.resources;
  if (typeof s != "string" || typeof r != "string" || typeof a != "string" || !d(p) || !Array.isArray(n))
    return null;
  const y = p.queries;
  if (!Array.isArray(y) || !y.every((o) => typeof o == "string"))
    return null;
  const l = [];
  for (const o of n) {
    if (!d(o))
      return null;
    const u = o.link, i = o.title, f = o.snippet;
    if (typeof u != "string" || typeof i != "string")
      return null;
    l.push({
      link: u,
      title: i,
      snippet: typeof f == "string" ? f : ""
    });
  }
  return {
    status: "ok",
    message: null,
    data: {
      id: s,
      message_id: r,
      answer: a,
      query_analysis: { queries: y },
      resources: l
    }
  };
}, C = (e) => {
  if (!d(e))
    return null;
  const t = e.error;
  if (!d(t))
    return null;
  const s = t.code, r = t.summary, a = t.detail;
  return typeof s != "number" || typeof r != "string" || typeof a != "string" ? null : { code: s, summary: r, detail: a };
}, P = (e) => {
  if (!d(e) || e.status !== "error" && !(typeof e.status == "number" && e.status >= 400))
    return null;
  const t = e.code, s = e.message, r = e.request_id;
  return typeof t != "string" && typeof t != "number" || typeof s != "string" || typeof r != "string" ? null : {
    status: "error",
    code: t,
    message: s,
    request_id: r
  };
}, K = (e, t) => {
  if (!e)
    throw new c("Felo API returned an empty response.", { statusCode: t });
  try {
    return JSON.parse(e);
  } catch (s) {
    throw new c("Felo API returned invalid JSON.", {
      statusCode: t,
      cause: s
    });
  }
}, Q = (e = {}) => {
  const t = (e.baseUrl ?? q).replace(/\/+$/, ""), s = e.fetchImpl ?? fetch;
  return {
    async chat(r) {
      const a = r.trim();
      A(a);
      const p = e.apiKey;
      if (!p)
        throw new c("Missing apiKey. Pass apiKey in options.");
      let n;
      try {
        n = await s(`${t}/v2/chat`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${p}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ query: a })
        });
      } catch (u) {
        throw new c("Failed to call Felo API.", { cause: u });
      }
      const y = await n.text(), l = K(y, n.status);
      if (n.ok) {
        const u = S(l);
        if (u)
          return u.data;
        const i = C(l);
        if (i) {
          const f = i.summary || i.detail || `Felo API returned an error (code ${i.code}).`;
          throw new c(f, {
            code: i.code,
            statusCode: n.status
          });
        }
        throw new c("Felo API returned an unexpected success payload.", {
          statusCode: n.status
        });
      }
      const o = P(l);
      throw o ? new c(o.message, {
        code: o.code,
        requestId: o.request_id,
        statusCode: n.status
      }) : new c("Felo API returned an unexpected error payload.", {
        statusCode: n.status
      });
    }
  };
}, L = async (e, t = {}) => Q(t).chat(e);
function O(e, t) {
  const s = String(e ?? "").trim(), r = String(t ?? "").trim();
  return r ? [
    `請使用 ${r} 回答以下需求；若原文中有專有名詞、網址或關鍵詞，請保留原文。`,
    "",
    s
  ].join(`
`) : s;
}
const R = {
  ...E,
  async handler(e, t) {
    const s = await L(O(e.query, e.language), { apiKey: t?.secrets?.apiKey });
    return {
      id: s.id,
      messageId: s.message_id,
      answer: s.answer,
      queries: s.query_analysis.queries,
      resources: s.resources
    };
  }
}, T = R;
export {
  T as default,
  R as feloChatTool,
  T as tool
};
