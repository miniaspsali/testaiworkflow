const Xo = "summary", Zo = "為網頁文章 URL、文字、圖片、音訊、影片或文件產生指定語言的摘要。", jo = { type: "object", properties: { language: { type: "string", description: "摘要輸出的語言。應與使用者要求或對話語言一致，例如「繁體中文（zh-TW）」或「English」。" }, text: { type: "string", description: "需要摘要的完整原始文字內容。" }, url: { type: "string", description: "要摘要的多模態輸入清單。支援 text、image、audio、video、document。若是網頁文章，優先使用 url 欄位。" }, type: { type: "string", enum: ["auto", "text", "image", "audio", "video", "document"], description: "指定這次摘要輸入的類型。預設為 auto；若提供 url，可明確指定它應該當成 text、image、audio、video 或 document" } }, required: ["language"], additionalProperties: !1 }, ei = { secrets: { apiKey: "GEMINI_API_KEY" } }, ni = {
  name: Xo,
  description: Zo,
  inputSchema: jo,
  runtime: ei
};
function ti(n) {
  return n && n.__esModule && Object.prototype.hasOwnProperty.call(n, "default") ? n.default : n;
}
var ue = { exports: {} }, ke = {}, Ge, gn;
function oi() {
  if (gn) return Ge;
  gn = 1;
  function n(e, t) {
    typeof t == "boolean" && (t = { forever: t }), this._originalTimeouts = JSON.parse(JSON.stringify(e)), this._timeouts = e, this._options = t || {}, this._maxRetryTime = t && t.maxRetryTime || 1 / 0, this._fn = null, this._errors = [], this._attempts = 1, this._operationTimeout = null, this._operationTimeoutCb = null, this._timeout = null, this._operationStart = null, this._timer = null, this._options.forever && (this._cachedTimeouts = this._timeouts.slice(0));
  }
  return Ge = n, n.prototype.reset = function() {
    this._attempts = 1, this._timeouts = this._originalTimeouts.slice(0);
  }, n.prototype.stop = function() {
    this._timeout && clearTimeout(this._timeout), this._timer && clearTimeout(this._timer), this._timeouts = [], this._cachedTimeouts = null;
  }, n.prototype.retry = function(e) {
    if (this._timeout && clearTimeout(this._timeout), !e)
      return !1;
    var t = (/* @__PURE__ */ new Date()).getTime();
    if (e && t - this._operationStart >= this._maxRetryTime)
      return this._errors.push(e), this._errors.unshift(new Error("RetryOperation timeout occurred")), !1;
    this._errors.push(e);
    var o = this._timeouts.shift();
    if (o === void 0)
      if (this._cachedTimeouts)
        this._errors.splice(0, this._errors.length - 1), o = this._cachedTimeouts.slice(-1);
      else
        return !1;
    var r = this;
    return this._timer = setTimeout(function() {
      r._attempts++, r._operationTimeoutCb && (r._timeout = setTimeout(function() {
        r._operationTimeoutCb(r._attempts);
      }, r._operationTimeout), r._options.unref && r._timeout.unref()), r._fn(r._attempts);
    }, o), this._options.unref && this._timer.unref(), !0;
  }, n.prototype.attempt = function(e, t) {
    this._fn = e, t && (t.timeout && (this._operationTimeout = t.timeout), t.cb && (this._operationTimeoutCb = t.cb));
    var o = this;
    this._operationTimeoutCb && (this._timeout = setTimeout(function() {
      o._operationTimeoutCb();
    }, o._operationTimeout)), this._operationStart = (/* @__PURE__ */ new Date()).getTime(), this._fn(this._attempts);
  }, n.prototype.try = function(e) {
    console.log("Using RetryOperation.try() is deprecated"), this.attempt(e);
  }, n.prototype.start = function(e) {
    console.log("Using RetryOperation.start() is deprecated"), this.attempt(e);
  }, n.prototype.start = n.prototype.try, n.prototype.errors = function() {
    return this._errors;
  }, n.prototype.attempts = function() {
    return this._attempts;
  }, n.prototype.mainError = function() {
    if (this._errors.length === 0)
      return null;
    for (var e = {}, t = null, o = 0, r = 0; r < this._errors.length; r++) {
      var l = this._errors[r], a = l.message, u = (e[a] || 0) + 1;
      e[a] = u, u >= o && (t = l, o = u);
    }
    return t;
  }, Ge;
}
var yn;
function ii() {
  return yn || (yn = 1, (function(n) {
    var e = oi();
    n.operation = function(t) {
      var o = n.timeouts(t);
      return new e(o, {
        forever: t && (t.forever || t.retries === 1 / 0),
        unref: t && t.unref,
        maxRetryTime: t && t.maxRetryTime
      });
    }, n.timeouts = function(t) {
      if (t instanceof Array)
        return [].concat(t);
      var o = {
        retries: 10,
        factor: 2,
        minTimeout: 1 * 1e3,
        maxTimeout: 1 / 0,
        randomize: !1
      };
      for (var r in t)
        o[r] = t[r];
      if (o.minTimeout > o.maxTimeout)
        throw new Error("minTimeout is greater than maxTimeout");
      for (var l = [], a = 0; a < o.retries; a++)
        l.push(this.createTimeout(a, o));
      return t && t.forever && !l.length && l.push(this.createTimeout(a, o)), l.sort(function(u, f) {
        return u - f;
      }), l;
    }, n.createTimeout = function(t, o) {
      var r = o.randomize ? Math.random() + 1 : 1, l = Math.round(r * Math.max(o.minTimeout, 1) * Math.pow(o.factor, t));
      return l = Math.min(l, o.maxTimeout), l;
    }, n.wrap = function(t, o, r) {
      if (o instanceof Array && (r = o, o = null), !r) {
        r = [];
        for (var l in t)
          typeof t[l] == "function" && r.push(l);
      }
      for (var a = 0; a < r.length; a++) {
        var u = r[a], f = t[u];
        t[u] = function(c) {
          var m = n.operation(o), p = Array.prototype.slice.call(arguments, 1), h = p.pop();
          p.push(function(g) {
            m.retry(g) || (g && (arguments[0] = m.mainError()), h.apply(this, arguments));
          }), m.attempt(function() {
            c.apply(t, p);
          });
        }.bind(t, f), t[u].options = o;
      }
    };
  })(ke)), ke;
}
var Fe, Tn;
function ri() {
  return Tn || (Tn = 1, Fe = ii()), Fe;
}
var _n;
function si() {
  if (_n) return ue.exports;
  _n = 1;
  const n = ri(), e = [
    "Failed to fetch",
    // Chrome
    "NetworkError when attempting to fetch resource.",
    // Firefox
    "The Internet connection appears to be offline.",
    // Safari
    "Network request failed"
    // `cross-fetch`
  ];
  class t extends Error {
    constructor(u) {
      super(), u instanceof Error ? (this.originalError = u, { message: u } = u) : (this.originalError = new Error(u), this.originalError.stack = this.stack), this.name = "AbortError", this.message = u;
    }
  }
  const o = (a, u, f) => {
    const d = f.retries - (u - 1);
    return a.attemptNumber = u, a.retriesLeft = d, a;
  }, r = (a) => e.includes(a), l = (a, u) => new Promise((f, d) => {
    u = {
      onFailedAttempt: () => {
      },
      retries: 10,
      ...u
    };
    const c = n.operation(u);
    c.attempt(async (m) => {
      try {
        f(await a(m));
      } catch (p) {
        if (!(p instanceof Error)) {
          d(new TypeError(`Non-error was thrown: "${p}". You should only throw errors.`));
          return;
        }
        if (p instanceof t)
          c.stop(), d(p.originalError);
        else if (p instanceof TypeError && !r(p.message))
          c.stop(), d(p);
        else {
          o(p, m, u);
          try {
            await u.onFailedAttempt(p);
          } catch (h) {
            d(h);
            return;
          }
          c.retry(p) || d(c.mainError());
        }
      }
    });
  });
  return ue.exports = l, ue.exports.default = l, ue.exports.AbortError = t, ue.exports;
}
var oo = si();
const li = /* @__PURE__ */ ti(oo);
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
let ai, ui;
function di() {
  return {
    geminiUrl: ai,
    vertexUrl: ui
  };
}
function fi(n, e, t, o) {
  var r, l;
  if (!n?.baseUrl) {
    const a = di();
    return e ? (r = a.vertexUrl) !== null && r !== void 0 ? r : t : (l = a.geminiUrl) !== null && l !== void 0 ? l : o;
  }
  return n.baseUrl;
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class Y {
}
function I(n, e) {
  const t = /\{([^}]+)\}/g;
  return n.replace(t, (o, r) => {
    if (Object.prototype.hasOwnProperty.call(e, r)) {
      const l = e[r];
      return l != null ? String(l) : "";
    } else
      throw new Error(`Key '${r}' not found in valueMap.`);
  });
}
function s(n, e, t) {
  for (let l = 0; l < e.length - 1; l++) {
    const a = e[l];
    if (a.endsWith("[]")) {
      const u = a.slice(0, -2);
      if (!(u in n))
        if (Array.isArray(t))
          n[u] = Array.from({ length: t.length }, () => ({}));
        else
          throw new Error(`Value must be a list given an array path ${a}`);
      if (Array.isArray(n[u])) {
        const f = n[u];
        if (Array.isArray(t))
          for (let d = 0; d < f.length; d++) {
            const c = f[d];
            s(c, e.slice(l + 1), t[d]);
          }
        else
          for (const d of f)
            s(d, e.slice(l + 1), t);
      }
      return;
    } else if (a.endsWith("[0]")) {
      const u = a.slice(0, -3);
      u in n || (n[u] = [{}]);
      const f = n[u];
      s(f[0], e.slice(l + 1), t);
      return;
    }
    (!n[a] || typeof n[a] != "object") && (n[a] = {}), n = n[a];
  }
  const o = e[e.length - 1], r = n[o];
  if (r !== void 0) {
    if (!t || typeof t == "object" && Object.keys(t).length === 0 || t === r)
      return;
    if (typeof r == "object" && typeof t == "object" && r !== null && t !== null)
      Object.assign(r, t);
    else
      throw new Error(`Cannot set value for an existing key. Key: ${o}`);
  } else
    o === "_self" && typeof t == "object" && t !== null && !Array.isArray(t) ? Object.assign(n, t) : n[o] = t;
}
function i(n, e, t = void 0) {
  try {
    if (e.length === 1 && e[0] === "_self")
      return n;
    for (let o = 0; o < e.length; o++) {
      if (typeof n != "object" || n === null)
        return t;
      const r = e[o];
      if (r.endsWith("[]")) {
        const l = r.slice(0, -2);
        if (l in n) {
          const a = n[l];
          return Array.isArray(a) ? a.map((u) => i(u, e.slice(o + 1), t)) : t;
        } else
          return t;
      } else
        n = n[r];
    }
    return n;
  } catch (o) {
    if (o instanceof TypeError)
      return t;
    throw o;
  }
}
function ci(n, e) {
  for (const [t, o] of Object.entries(e)) {
    const r = t.split("."), l = o.split("."), a = /* @__PURE__ */ new Set();
    let u = -1;
    for (let f = 0; f < r.length; f++)
      if (r[f] === "*") {
        u = f;
        break;
      }
    if (u !== -1 && l.length > u)
      for (let f = u; f < l.length; f++) {
        const d = l[f];
        d !== "*" && !d.endsWith("[]") && !d.endsWith("[0]") && a.add(d);
      }
    Je(n, r, l, 0, a);
  }
}
function Je(n, e, t, o, r) {
  if (o >= e.length || typeof n != "object" || n === null)
    return;
  const l = e[o];
  if (l.endsWith("[]")) {
    const a = l.slice(0, -2), u = n;
    if (a in u && Array.isArray(u[a]))
      for (const f of u[a])
        Je(f, e, t, o + 1, r);
  } else if (l === "*") {
    if (typeof n == "object" && n !== null && !Array.isArray(n)) {
      const a = n, u = Object.keys(a).filter((d) => !d.startsWith("_") && !r.has(d)), f = {};
      for (const d of u)
        f[d] = a[d];
      for (const [d, c] of Object.entries(f)) {
        const m = [];
        for (const p of t.slice(o))
          p === "*" ? m.push(d) : m.push(p);
        s(a, m, c);
      }
      for (const d of u)
        delete a[d];
    }
  } else {
    const a = n;
    l in a && Je(a[l], e, t, o + 1, r);
  }
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function rn(n) {
  if (typeof n != "string")
    throw new Error("fromImageBytes must be a string");
  return n;
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function pi(n) {
  const e = {}, t = i(n, [
    "operationName"
  ]);
  t != null && s(e, ["operationName"], t);
  const o = i(n, ["resourceName"]);
  return o != null && s(e, ["_url", "resourceName"], o), e;
}
function mi(n) {
  const e = {}, t = i(n, ["name"]);
  t != null && s(e, ["name"], t);
  const o = i(n, ["metadata"]);
  o != null && s(e, ["metadata"], o);
  const r = i(n, ["done"]);
  r != null && s(e, ["done"], r);
  const l = i(n, ["error"]);
  l != null && s(e, ["error"], l);
  const a = i(n, [
    "response",
    "generateVideoResponse"
  ]);
  return a != null && s(e, ["response"], gi(a)), e;
}
function hi(n) {
  const e = {}, t = i(n, ["name"]);
  t != null && s(e, ["name"], t);
  const o = i(n, ["metadata"]);
  o != null && s(e, ["metadata"], o);
  const r = i(n, ["done"]);
  r != null && s(e, ["done"], r);
  const l = i(n, ["error"]);
  l != null && s(e, ["error"], l);
  const a = i(n, ["response"]);
  return a != null && s(e, ["response"], yi(a)), e;
}
function gi(n) {
  const e = {}, t = i(n, [
    "generatedSamples"
  ]);
  if (t != null) {
    let l = t;
    Array.isArray(l) && (l = l.map((a) => Ti(a))), s(e, ["generatedVideos"], l);
  }
  const o = i(n, [
    "raiMediaFilteredCount"
  ]);
  o != null && s(e, ["raiMediaFilteredCount"], o);
  const r = i(n, [
    "raiMediaFilteredReasons"
  ]);
  return r != null && s(e, ["raiMediaFilteredReasons"], r), e;
}
function yi(n) {
  const e = {}, t = i(n, ["videos"]);
  if (t != null) {
    let l = t;
    Array.isArray(l) && (l = l.map((a) => _i(a))), s(e, ["generatedVideos"], l);
  }
  const o = i(n, [
    "raiMediaFilteredCount"
  ]);
  o != null && s(e, ["raiMediaFilteredCount"], o);
  const r = i(n, [
    "raiMediaFilteredReasons"
  ]);
  return r != null && s(e, ["raiMediaFilteredReasons"], r), e;
}
function Ti(n) {
  const e = {}, t = i(n, ["video"]);
  return t != null && s(e, ["video"], vi(t)), e;
}
function _i(n) {
  const e = {}, t = i(n, ["_self"]);
  return t != null && s(e, ["video"], Ri(t)), e;
}
function Ei(n) {
  const e = {}, t = i(n, [
    "operationName"
  ]);
  return t != null && s(e, ["_url", "operationName"], t), e;
}
function Ci(n) {
  const e = {}, t = i(n, [
    "operationName"
  ]);
  return t != null && s(e, ["_url", "operationName"], t), e;
}
function Ii(n) {
  const e = {}, t = i(n, ["name"]);
  t != null && s(e, ["name"], t);
  const o = i(n, ["metadata"]);
  o != null && s(e, ["metadata"], o);
  const r = i(n, ["done"]);
  r != null && s(e, ["done"], r);
  const l = i(n, ["error"]);
  l != null && s(e, ["error"], l);
  const a = i(n, ["response"]);
  return a != null && s(e, ["response"], Si(a)), e;
}
function Si(n) {
  const e = {}, t = i(n, [
    "sdkHttpResponse"
  ]);
  t != null && s(e, ["sdkHttpResponse"], t);
  const o = i(n, ["parent"]);
  o != null && s(e, ["parent"], o);
  const r = i(n, ["documentName"]);
  return r != null && s(e, ["documentName"], r), e;
}
function io(n) {
  const e = {}, t = i(n, ["name"]);
  t != null && s(e, ["name"], t);
  const o = i(n, ["metadata"]);
  o != null && s(e, ["metadata"], o);
  const r = i(n, ["done"]);
  r != null && s(e, ["done"], r);
  const l = i(n, ["error"]);
  l != null && s(e, ["error"], l);
  const a = i(n, ["response"]);
  return a != null && s(e, ["response"], Ai(a)), e;
}
function Ai(n) {
  const e = {}, t = i(n, [
    "sdkHttpResponse"
  ]);
  t != null && s(e, ["sdkHttpResponse"], t);
  const o = i(n, ["parent"]);
  o != null && s(e, ["parent"], o);
  const r = i(n, ["documentName"]);
  return r != null && s(e, ["documentName"], r), e;
}
function vi(n) {
  const e = {}, t = i(n, ["uri"]);
  t != null && s(e, ["uri"], t);
  const o = i(n, ["encodedVideo"]);
  o != null && s(e, ["videoBytes"], rn(o));
  const r = i(n, ["encoding"]);
  return r != null && s(e, ["mimeType"], r), e;
}
function Ri(n) {
  const e = {}, t = i(n, ["gcsUri"]);
  t != null && s(e, ["uri"], t);
  const o = i(n, [
    "bytesBase64Encoded"
  ]);
  o != null && s(e, ["videoBytes"], rn(o));
  const r = i(n, ["mimeType"]);
  return r != null && s(e, ["mimeType"], r), e;
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
var En;
(function(n) {
  n.OUTCOME_UNSPECIFIED = "OUTCOME_UNSPECIFIED", n.OUTCOME_OK = "OUTCOME_OK", n.OUTCOME_FAILED = "OUTCOME_FAILED", n.OUTCOME_DEADLINE_EXCEEDED = "OUTCOME_DEADLINE_EXCEEDED";
})(En || (En = {}));
var Cn;
(function(n) {
  n.LANGUAGE_UNSPECIFIED = "LANGUAGE_UNSPECIFIED", n.PYTHON = "PYTHON";
})(Cn || (Cn = {}));
var In;
(function(n) {
  n.SCHEDULING_UNSPECIFIED = "SCHEDULING_UNSPECIFIED", n.SILENT = "SILENT", n.WHEN_IDLE = "WHEN_IDLE", n.INTERRUPT = "INTERRUPT";
})(In || (In = {}));
var Q;
(function(n) {
  n.TYPE_UNSPECIFIED = "TYPE_UNSPECIFIED", n.STRING = "STRING", n.NUMBER = "NUMBER", n.INTEGER = "INTEGER", n.BOOLEAN = "BOOLEAN", n.ARRAY = "ARRAY", n.OBJECT = "OBJECT", n.NULL = "NULL";
})(Q || (Q = {}));
var Sn;
(function(n) {
  n.PHISH_BLOCK_THRESHOLD_UNSPECIFIED = "PHISH_BLOCK_THRESHOLD_UNSPECIFIED", n.BLOCK_LOW_AND_ABOVE = "BLOCK_LOW_AND_ABOVE", n.BLOCK_MEDIUM_AND_ABOVE = "BLOCK_MEDIUM_AND_ABOVE", n.BLOCK_HIGH_AND_ABOVE = "BLOCK_HIGH_AND_ABOVE", n.BLOCK_HIGHER_AND_ABOVE = "BLOCK_HIGHER_AND_ABOVE", n.BLOCK_VERY_HIGH_AND_ABOVE = "BLOCK_VERY_HIGH_AND_ABOVE", n.BLOCK_ONLY_EXTREMELY_HIGH = "BLOCK_ONLY_EXTREMELY_HIGH";
})(Sn || (Sn = {}));
var An;
(function(n) {
  n.AUTH_TYPE_UNSPECIFIED = "AUTH_TYPE_UNSPECIFIED", n.NO_AUTH = "NO_AUTH", n.API_KEY_AUTH = "API_KEY_AUTH", n.HTTP_BASIC_AUTH = "HTTP_BASIC_AUTH", n.GOOGLE_SERVICE_ACCOUNT_AUTH = "GOOGLE_SERVICE_ACCOUNT_AUTH", n.OAUTH = "OAUTH", n.OIDC_AUTH = "OIDC_AUTH";
})(An || (An = {}));
var vn;
(function(n) {
  n.HTTP_IN_UNSPECIFIED = "HTTP_IN_UNSPECIFIED", n.HTTP_IN_QUERY = "HTTP_IN_QUERY", n.HTTP_IN_HEADER = "HTTP_IN_HEADER", n.HTTP_IN_PATH = "HTTP_IN_PATH", n.HTTP_IN_BODY = "HTTP_IN_BODY", n.HTTP_IN_COOKIE = "HTTP_IN_COOKIE";
})(vn || (vn = {}));
var Rn;
(function(n) {
  n.API_SPEC_UNSPECIFIED = "API_SPEC_UNSPECIFIED", n.SIMPLE_SEARCH = "SIMPLE_SEARCH", n.ELASTIC_SEARCH = "ELASTIC_SEARCH";
})(Rn || (Rn = {}));
var Pn;
(function(n) {
  n.UNSPECIFIED = "UNSPECIFIED", n.BLOCKING = "BLOCKING", n.NON_BLOCKING = "NON_BLOCKING";
})(Pn || (Pn = {}));
var wn;
(function(n) {
  n.MODE_UNSPECIFIED = "MODE_UNSPECIFIED", n.MODE_DYNAMIC = "MODE_DYNAMIC";
})(wn || (wn = {}));
var Mn;
(function(n) {
  n.MODE_UNSPECIFIED = "MODE_UNSPECIFIED", n.AUTO = "AUTO", n.ANY = "ANY", n.NONE = "NONE", n.VALIDATED = "VALIDATED";
})(Mn || (Mn = {}));
var Nn;
(function(n) {
  n.THINKING_LEVEL_UNSPECIFIED = "THINKING_LEVEL_UNSPECIFIED", n.LOW = "LOW", n.MEDIUM = "MEDIUM", n.HIGH = "HIGH", n.MINIMAL = "MINIMAL";
})(Nn || (Nn = {}));
var Dn;
(function(n) {
  n.DONT_ALLOW = "DONT_ALLOW", n.ALLOW_ADULT = "ALLOW_ADULT", n.ALLOW_ALL = "ALLOW_ALL";
})(Dn || (Dn = {}));
var xn;
(function(n) {
  n.HARM_CATEGORY_UNSPECIFIED = "HARM_CATEGORY_UNSPECIFIED", n.HARM_CATEGORY_HARASSMENT = "HARM_CATEGORY_HARASSMENT", n.HARM_CATEGORY_HATE_SPEECH = "HARM_CATEGORY_HATE_SPEECH", n.HARM_CATEGORY_SEXUALLY_EXPLICIT = "HARM_CATEGORY_SEXUALLY_EXPLICIT", n.HARM_CATEGORY_DANGEROUS_CONTENT = "HARM_CATEGORY_DANGEROUS_CONTENT", n.HARM_CATEGORY_CIVIC_INTEGRITY = "HARM_CATEGORY_CIVIC_INTEGRITY", n.HARM_CATEGORY_IMAGE_HATE = "HARM_CATEGORY_IMAGE_HATE", n.HARM_CATEGORY_IMAGE_DANGEROUS_CONTENT = "HARM_CATEGORY_IMAGE_DANGEROUS_CONTENT", n.HARM_CATEGORY_IMAGE_HARASSMENT = "HARM_CATEGORY_IMAGE_HARASSMENT", n.HARM_CATEGORY_IMAGE_SEXUALLY_EXPLICIT = "HARM_CATEGORY_IMAGE_SEXUALLY_EXPLICIT", n.HARM_CATEGORY_JAILBREAK = "HARM_CATEGORY_JAILBREAK";
})(xn || (xn = {}));
var Un;
(function(n) {
  n.HARM_BLOCK_METHOD_UNSPECIFIED = "HARM_BLOCK_METHOD_UNSPECIFIED", n.SEVERITY = "SEVERITY", n.PROBABILITY = "PROBABILITY";
})(Un || (Un = {}));
var Ln;
(function(n) {
  n.HARM_BLOCK_THRESHOLD_UNSPECIFIED = "HARM_BLOCK_THRESHOLD_UNSPECIFIED", n.BLOCK_LOW_AND_ABOVE = "BLOCK_LOW_AND_ABOVE", n.BLOCK_MEDIUM_AND_ABOVE = "BLOCK_MEDIUM_AND_ABOVE", n.BLOCK_ONLY_HIGH = "BLOCK_ONLY_HIGH", n.BLOCK_NONE = "BLOCK_NONE", n.OFF = "OFF";
})(Ln || (Ln = {}));
var kn;
(function(n) {
  n.FINISH_REASON_UNSPECIFIED = "FINISH_REASON_UNSPECIFIED", n.STOP = "STOP", n.MAX_TOKENS = "MAX_TOKENS", n.SAFETY = "SAFETY", n.RECITATION = "RECITATION", n.LANGUAGE = "LANGUAGE", n.OTHER = "OTHER", n.BLOCKLIST = "BLOCKLIST", n.PROHIBITED_CONTENT = "PROHIBITED_CONTENT", n.SPII = "SPII", n.MALFORMED_FUNCTION_CALL = "MALFORMED_FUNCTION_CALL", n.IMAGE_SAFETY = "IMAGE_SAFETY", n.UNEXPECTED_TOOL_CALL = "UNEXPECTED_TOOL_CALL", n.IMAGE_PROHIBITED_CONTENT = "IMAGE_PROHIBITED_CONTENT", n.NO_IMAGE = "NO_IMAGE", n.IMAGE_RECITATION = "IMAGE_RECITATION", n.IMAGE_OTHER = "IMAGE_OTHER";
})(kn || (kn = {}));
var Gn;
(function(n) {
  n.HARM_PROBABILITY_UNSPECIFIED = "HARM_PROBABILITY_UNSPECIFIED", n.NEGLIGIBLE = "NEGLIGIBLE", n.LOW = "LOW", n.MEDIUM = "MEDIUM", n.HIGH = "HIGH";
})(Gn || (Gn = {}));
var Fn;
(function(n) {
  n.HARM_SEVERITY_UNSPECIFIED = "HARM_SEVERITY_UNSPECIFIED", n.HARM_SEVERITY_NEGLIGIBLE = "HARM_SEVERITY_NEGLIGIBLE", n.HARM_SEVERITY_LOW = "HARM_SEVERITY_LOW", n.HARM_SEVERITY_MEDIUM = "HARM_SEVERITY_MEDIUM", n.HARM_SEVERITY_HIGH = "HARM_SEVERITY_HIGH";
})(Fn || (Fn = {}));
var Vn;
(function(n) {
  n.URL_RETRIEVAL_STATUS_UNSPECIFIED = "URL_RETRIEVAL_STATUS_UNSPECIFIED", n.URL_RETRIEVAL_STATUS_SUCCESS = "URL_RETRIEVAL_STATUS_SUCCESS", n.URL_RETRIEVAL_STATUS_ERROR = "URL_RETRIEVAL_STATUS_ERROR", n.URL_RETRIEVAL_STATUS_PAYWALL = "URL_RETRIEVAL_STATUS_PAYWALL", n.URL_RETRIEVAL_STATUS_UNSAFE = "URL_RETRIEVAL_STATUS_UNSAFE";
})(Vn || (Vn = {}));
var qn;
(function(n) {
  n.BLOCKED_REASON_UNSPECIFIED = "BLOCKED_REASON_UNSPECIFIED", n.SAFETY = "SAFETY", n.OTHER = "OTHER", n.BLOCKLIST = "BLOCKLIST", n.PROHIBITED_CONTENT = "PROHIBITED_CONTENT", n.IMAGE_SAFETY = "IMAGE_SAFETY", n.MODEL_ARMOR = "MODEL_ARMOR", n.JAILBREAK = "JAILBREAK";
})(qn || (qn = {}));
var Hn;
(function(n) {
  n.TRAFFIC_TYPE_UNSPECIFIED = "TRAFFIC_TYPE_UNSPECIFIED", n.ON_DEMAND = "ON_DEMAND", n.ON_DEMAND_PRIORITY = "ON_DEMAND_PRIORITY", n.ON_DEMAND_FLEX = "ON_DEMAND_FLEX", n.PROVISIONED_THROUGHPUT = "PROVISIONED_THROUGHPUT";
})(Hn || (Hn = {}));
var Ce;
(function(n) {
  n.MODALITY_UNSPECIFIED = "MODALITY_UNSPECIFIED", n.TEXT = "TEXT", n.IMAGE = "IMAGE", n.AUDIO = "AUDIO";
})(Ce || (Ce = {}));
var Bn;
(function(n) {
  n.MEDIA_RESOLUTION_UNSPECIFIED = "MEDIA_RESOLUTION_UNSPECIFIED", n.MEDIA_RESOLUTION_LOW = "MEDIA_RESOLUTION_LOW", n.MEDIA_RESOLUTION_MEDIUM = "MEDIA_RESOLUTION_MEDIUM", n.MEDIA_RESOLUTION_HIGH = "MEDIA_RESOLUTION_HIGH";
})(Bn || (Bn = {}));
var bn;
(function(n) {
  n.TUNING_MODE_UNSPECIFIED = "TUNING_MODE_UNSPECIFIED", n.TUNING_MODE_FULL = "TUNING_MODE_FULL", n.TUNING_MODE_PEFT_ADAPTER = "TUNING_MODE_PEFT_ADAPTER";
})(bn || (bn = {}));
var Jn;
(function(n) {
  n.ADAPTER_SIZE_UNSPECIFIED = "ADAPTER_SIZE_UNSPECIFIED", n.ADAPTER_SIZE_ONE = "ADAPTER_SIZE_ONE", n.ADAPTER_SIZE_TWO = "ADAPTER_SIZE_TWO", n.ADAPTER_SIZE_FOUR = "ADAPTER_SIZE_FOUR", n.ADAPTER_SIZE_EIGHT = "ADAPTER_SIZE_EIGHT", n.ADAPTER_SIZE_SIXTEEN = "ADAPTER_SIZE_SIXTEEN", n.ADAPTER_SIZE_THIRTY_TWO = "ADAPTER_SIZE_THIRTY_TWO";
})(Jn || (Jn = {}));
var $e;
(function(n) {
  n.JOB_STATE_UNSPECIFIED = "JOB_STATE_UNSPECIFIED", n.JOB_STATE_QUEUED = "JOB_STATE_QUEUED", n.JOB_STATE_PENDING = "JOB_STATE_PENDING", n.JOB_STATE_RUNNING = "JOB_STATE_RUNNING", n.JOB_STATE_SUCCEEDED = "JOB_STATE_SUCCEEDED", n.JOB_STATE_FAILED = "JOB_STATE_FAILED", n.JOB_STATE_CANCELLING = "JOB_STATE_CANCELLING", n.JOB_STATE_CANCELLED = "JOB_STATE_CANCELLED", n.JOB_STATE_PAUSED = "JOB_STATE_PAUSED", n.JOB_STATE_EXPIRED = "JOB_STATE_EXPIRED", n.JOB_STATE_UPDATING = "JOB_STATE_UPDATING", n.JOB_STATE_PARTIALLY_SUCCEEDED = "JOB_STATE_PARTIALLY_SUCCEEDED";
})($e || ($e = {}));
var $n;
(function(n) {
  n.TUNING_JOB_STATE_UNSPECIFIED = "TUNING_JOB_STATE_UNSPECIFIED", n.TUNING_JOB_STATE_WAITING_FOR_QUOTA = "TUNING_JOB_STATE_WAITING_FOR_QUOTA", n.TUNING_JOB_STATE_PROCESSING_DATASET = "TUNING_JOB_STATE_PROCESSING_DATASET", n.TUNING_JOB_STATE_WAITING_FOR_CAPACITY = "TUNING_JOB_STATE_WAITING_FOR_CAPACITY", n.TUNING_JOB_STATE_TUNING = "TUNING_JOB_STATE_TUNING", n.TUNING_JOB_STATE_POST_PROCESSING = "TUNING_JOB_STATE_POST_PROCESSING";
})($n || ($n = {}));
var Kn;
(function(n) {
  n.AGGREGATION_METRIC_UNSPECIFIED = "AGGREGATION_METRIC_UNSPECIFIED", n.AVERAGE = "AVERAGE", n.MODE = "MODE", n.STANDARD_DEVIATION = "STANDARD_DEVIATION", n.VARIANCE = "VARIANCE", n.MINIMUM = "MINIMUM", n.MAXIMUM = "MAXIMUM", n.MEDIAN = "MEDIAN", n.PERCENTILE_P90 = "PERCENTILE_P90", n.PERCENTILE_P95 = "PERCENTILE_P95", n.PERCENTILE_P99 = "PERCENTILE_P99";
})(Kn || (Kn = {}));
var On;
(function(n) {
  n.PAIRWISE_CHOICE_UNSPECIFIED = "PAIRWISE_CHOICE_UNSPECIFIED", n.BASELINE = "BASELINE", n.CANDIDATE = "CANDIDATE", n.TIE = "TIE";
})(On || (On = {}));
var Wn;
(function(n) {
  n.TUNING_TASK_UNSPECIFIED = "TUNING_TASK_UNSPECIFIED", n.TUNING_TASK_I2V = "TUNING_TASK_I2V", n.TUNING_TASK_T2V = "TUNING_TASK_T2V", n.TUNING_TASK_R2V = "TUNING_TASK_R2V";
})(Wn || (Wn = {}));
var Yn;
(function(n) {
  n.MEDIA_RESOLUTION_UNSPECIFIED = "MEDIA_RESOLUTION_UNSPECIFIED", n.MEDIA_RESOLUTION_LOW = "MEDIA_RESOLUTION_LOW", n.MEDIA_RESOLUTION_MEDIUM = "MEDIA_RESOLUTION_MEDIUM", n.MEDIA_RESOLUTION_HIGH = "MEDIA_RESOLUTION_HIGH", n.MEDIA_RESOLUTION_ULTRA_HIGH = "MEDIA_RESOLUTION_ULTRA_HIGH";
})(Yn || (Yn = {}));
var Ke;
(function(n) {
  n.COLLECTION = "COLLECTION";
})(Ke || (Ke = {}));
var zn;
(function(n) {
  n.FEATURE_SELECTION_PREFERENCE_UNSPECIFIED = "FEATURE_SELECTION_PREFERENCE_UNSPECIFIED", n.PRIORITIZE_QUALITY = "PRIORITIZE_QUALITY", n.BALANCED = "BALANCED", n.PRIORITIZE_COST = "PRIORITIZE_COST";
})(zn || (zn = {}));
var Qn;
(function(n) {
  n.ENVIRONMENT_UNSPECIFIED = "ENVIRONMENT_UNSPECIFIED", n.ENVIRONMENT_BROWSER = "ENVIRONMENT_BROWSER";
})(Qn || (Qn = {}));
var Xn;
(function(n) {
  n.PROMINENT_PEOPLE_UNSPECIFIED = "PROMINENT_PEOPLE_UNSPECIFIED", n.ALLOW_PROMINENT_PEOPLE = "ALLOW_PROMINENT_PEOPLE", n.BLOCK_PROMINENT_PEOPLE = "BLOCK_PROMINENT_PEOPLE";
})(Xn || (Xn = {}));
var Ie;
(function(n) {
  n.PREDICT = "PREDICT", n.EMBED_CONTENT = "EMBED_CONTENT";
})(Ie || (Ie = {}));
var Zn;
(function(n) {
  n.BLOCK_LOW_AND_ABOVE = "BLOCK_LOW_AND_ABOVE", n.BLOCK_MEDIUM_AND_ABOVE = "BLOCK_MEDIUM_AND_ABOVE", n.BLOCK_ONLY_HIGH = "BLOCK_ONLY_HIGH", n.BLOCK_NONE = "BLOCK_NONE";
})(Zn || (Zn = {}));
var jn;
(function(n) {
  n.auto = "auto", n.en = "en", n.ja = "ja", n.ko = "ko", n.hi = "hi", n.zh = "zh", n.pt = "pt", n.es = "es";
})(jn || (jn = {}));
var et;
(function(n) {
  n.MASK_MODE_DEFAULT = "MASK_MODE_DEFAULT", n.MASK_MODE_USER_PROVIDED = "MASK_MODE_USER_PROVIDED", n.MASK_MODE_BACKGROUND = "MASK_MODE_BACKGROUND", n.MASK_MODE_FOREGROUND = "MASK_MODE_FOREGROUND", n.MASK_MODE_SEMANTIC = "MASK_MODE_SEMANTIC";
})(et || (et = {}));
var nt;
(function(n) {
  n.CONTROL_TYPE_DEFAULT = "CONTROL_TYPE_DEFAULT", n.CONTROL_TYPE_CANNY = "CONTROL_TYPE_CANNY", n.CONTROL_TYPE_SCRIBBLE = "CONTROL_TYPE_SCRIBBLE", n.CONTROL_TYPE_FACE_MESH = "CONTROL_TYPE_FACE_MESH";
})(nt || (nt = {}));
var tt;
(function(n) {
  n.SUBJECT_TYPE_DEFAULT = "SUBJECT_TYPE_DEFAULT", n.SUBJECT_TYPE_PERSON = "SUBJECT_TYPE_PERSON", n.SUBJECT_TYPE_ANIMAL = "SUBJECT_TYPE_ANIMAL", n.SUBJECT_TYPE_PRODUCT = "SUBJECT_TYPE_PRODUCT";
})(tt || (tt = {}));
var ot;
(function(n) {
  n.EDIT_MODE_DEFAULT = "EDIT_MODE_DEFAULT", n.EDIT_MODE_INPAINT_REMOVAL = "EDIT_MODE_INPAINT_REMOVAL", n.EDIT_MODE_INPAINT_INSERTION = "EDIT_MODE_INPAINT_INSERTION", n.EDIT_MODE_OUTPAINT = "EDIT_MODE_OUTPAINT", n.EDIT_MODE_CONTROLLED_EDITING = "EDIT_MODE_CONTROLLED_EDITING", n.EDIT_MODE_STYLE = "EDIT_MODE_STYLE", n.EDIT_MODE_BGSWAP = "EDIT_MODE_BGSWAP", n.EDIT_MODE_PRODUCT_IMAGE = "EDIT_MODE_PRODUCT_IMAGE";
})(ot || (ot = {}));
var it;
(function(n) {
  n.FOREGROUND = "FOREGROUND", n.BACKGROUND = "BACKGROUND", n.PROMPT = "PROMPT", n.SEMANTIC = "SEMANTIC", n.INTERACTIVE = "INTERACTIVE";
})(it || (it = {}));
var rt;
(function(n) {
  n.ASSET = "ASSET", n.STYLE = "STYLE";
})(rt || (rt = {}));
var st;
(function(n) {
  n.INSERT = "INSERT", n.REMOVE = "REMOVE", n.REMOVE_STATIC = "REMOVE_STATIC", n.OUTPAINT = "OUTPAINT";
})(st || (st = {}));
var lt;
(function(n) {
  n.OPTIMIZED = "OPTIMIZED", n.LOSSLESS = "LOSSLESS";
})(lt || (lt = {}));
var at;
(function(n) {
  n.SUPERVISED_FINE_TUNING = "SUPERVISED_FINE_TUNING", n.PREFERENCE_TUNING = "PREFERENCE_TUNING", n.DISTILLATION = "DISTILLATION";
})(at || (at = {}));
var ut;
(function(n) {
  n.STATE_UNSPECIFIED = "STATE_UNSPECIFIED", n.STATE_PENDING = "STATE_PENDING", n.STATE_ACTIVE = "STATE_ACTIVE", n.STATE_FAILED = "STATE_FAILED";
})(ut || (ut = {}));
var dt;
(function(n) {
  n.STATE_UNSPECIFIED = "STATE_UNSPECIFIED", n.PROCESSING = "PROCESSING", n.ACTIVE = "ACTIVE", n.FAILED = "FAILED";
})(dt || (dt = {}));
var ft;
(function(n) {
  n.SOURCE_UNSPECIFIED = "SOURCE_UNSPECIFIED", n.UPLOADED = "UPLOADED", n.GENERATED = "GENERATED", n.REGISTERED = "REGISTERED";
})(ft || (ft = {}));
var ct;
(function(n) {
  n.TURN_COMPLETE_REASON_UNSPECIFIED = "TURN_COMPLETE_REASON_UNSPECIFIED", n.MALFORMED_FUNCTION_CALL = "MALFORMED_FUNCTION_CALL", n.RESPONSE_REJECTED = "RESPONSE_REJECTED", n.NEED_MORE_INPUT = "NEED_MORE_INPUT";
})(ct || (ct = {}));
var pt;
(function(n) {
  n.MODALITY_UNSPECIFIED = "MODALITY_UNSPECIFIED", n.TEXT = "TEXT", n.IMAGE = "IMAGE", n.VIDEO = "VIDEO", n.AUDIO = "AUDIO", n.DOCUMENT = "DOCUMENT";
})(pt || (pt = {}));
var mt;
(function(n) {
  n.VAD_SIGNAL_TYPE_UNSPECIFIED = "VAD_SIGNAL_TYPE_UNSPECIFIED", n.VAD_SIGNAL_TYPE_SOS = "VAD_SIGNAL_TYPE_SOS", n.VAD_SIGNAL_TYPE_EOS = "VAD_SIGNAL_TYPE_EOS";
})(mt || (mt = {}));
var ht;
(function(n) {
  n.TYPE_UNSPECIFIED = "TYPE_UNSPECIFIED", n.ACTIVITY_START = "ACTIVITY_START", n.ACTIVITY_END = "ACTIVITY_END";
})(ht || (ht = {}));
var gt;
(function(n) {
  n.START_SENSITIVITY_UNSPECIFIED = "START_SENSITIVITY_UNSPECIFIED", n.START_SENSITIVITY_HIGH = "START_SENSITIVITY_HIGH", n.START_SENSITIVITY_LOW = "START_SENSITIVITY_LOW";
})(gt || (gt = {}));
var yt;
(function(n) {
  n.END_SENSITIVITY_UNSPECIFIED = "END_SENSITIVITY_UNSPECIFIED", n.END_SENSITIVITY_HIGH = "END_SENSITIVITY_HIGH", n.END_SENSITIVITY_LOW = "END_SENSITIVITY_LOW";
})(yt || (yt = {}));
var Tt;
(function(n) {
  n.ACTIVITY_HANDLING_UNSPECIFIED = "ACTIVITY_HANDLING_UNSPECIFIED", n.START_OF_ACTIVITY_INTERRUPTS = "START_OF_ACTIVITY_INTERRUPTS", n.NO_INTERRUPTION = "NO_INTERRUPTION";
})(Tt || (Tt = {}));
var _t;
(function(n) {
  n.TURN_COVERAGE_UNSPECIFIED = "TURN_COVERAGE_UNSPECIFIED", n.TURN_INCLUDES_ONLY_ACTIVITY = "TURN_INCLUDES_ONLY_ACTIVITY", n.TURN_INCLUDES_ALL_INPUT = "TURN_INCLUDES_ALL_INPUT";
})(_t || (_t = {}));
var Et;
(function(n) {
  n.SCALE_UNSPECIFIED = "SCALE_UNSPECIFIED", n.C_MAJOR_A_MINOR = "C_MAJOR_A_MINOR", n.D_FLAT_MAJOR_B_FLAT_MINOR = "D_FLAT_MAJOR_B_FLAT_MINOR", n.D_MAJOR_B_MINOR = "D_MAJOR_B_MINOR", n.E_FLAT_MAJOR_C_MINOR = "E_FLAT_MAJOR_C_MINOR", n.E_MAJOR_D_FLAT_MINOR = "E_MAJOR_D_FLAT_MINOR", n.F_MAJOR_D_MINOR = "F_MAJOR_D_MINOR", n.G_FLAT_MAJOR_E_FLAT_MINOR = "G_FLAT_MAJOR_E_FLAT_MINOR", n.G_MAJOR_E_MINOR = "G_MAJOR_E_MINOR", n.A_FLAT_MAJOR_F_MINOR = "A_FLAT_MAJOR_F_MINOR", n.A_MAJOR_G_FLAT_MINOR = "A_MAJOR_G_FLAT_MINOR", n.B_FLAT_MAJOR_G_MINOR = "B_FLAT_MAJOR_G_MINOR", n.B_MAJOR_A_FLAT_MINOR = "B_MAJOR_A_FLAT_MINOR";
})(Et || (Et = {}));
var Ct;
(function(n) {
  n.MUSIC_GENERATION_MODE_UNSPECIFIED = "MUSIC_GENERATION_MODE_UNSPECIFIED", n.QUALITY = "QUALITY", n.DIVERSITY = "DIVERSITY", n.VOCALIZATION = "VOCALIZATION";
})(Ct || (Ct = {}));
var te;
(function(n) {
  n.PLAYBACK_CONTROL_UNSPECIFIED = "PLAYBACK_CONTROL_UNSPECIFIED", n.PLAY = "PLAY", n.PAUSE = "PAUSE", n.STOP = "STOP", n.RESET_CONTEXT = "RESET_CONTEXT";
})(te || (te = {}));
class Oe {
  constructor(e) {
    const t = {};
    for (const o of e.headers.entries())
      t[o[0]] = o[1];
    this.headers = t, this.responseInternal = e;
  }
  json() {
    return this.responseInternal.json();
  }
}
class de {
  /**
   * Returns the concatenation of all text parts from the first candidate in the response.
   *
   * @remarks
   * If there are multiple candidates in the response, the text from the first
   * one will be returned.
   * If there are non-text parts in the response, the concatenation of all text
   * parts will be returned, and a warning will be logged.
   * If there are thought parts in the response, the concatenation of all text
   * parts excluding the thought parts will be returned.
   *
   * @example
   * ```ts
   * const response = await ai.models.generateContent({
   *   model: 'gemini-2.0-flash',
   *   contents:
   *     'Why is the sky blue?',
   * });
   *
   * console.debug(response.text);
   * ```
   */
  get text() {
    var e, t, o, r, l, a, u, f;
    if (((r = (o = (t = (e = this.candidates) === null || e === void 0 ? void 0 : e[0]) === null || t === void 0 ? void 0 : t.content) === null || o === void 0 ? void 0 : o.parts) === null || r === void 0 ? void 0 : r.length) === 0)
      return;
    this.candidates && this.candidates.length > 1 && console.warn("there are multiple candidates in the response, returning text from the first one.");
    let d = "", c = !1;
    const m = [];
    for (const p of (f = (u = (a = (l = this.candidates) === null || l === void 0 ? void 0 : l[0]) === null || a === void 0 ? void 0 : a.content) === null || u === void 0 ? void 0 : u.parts) !== null && f !== void 0 ? f : []) {
      for (const [h, g] of Object.entries(p))
        h !== "text" && h !== "thought" && h !== "thoughtSignature" && (g !== null || g !== void 0) && m.push(h);
      if (typeof p.text == "string") {
        if (typeof p.thought == "boolean" && p.thought)
          continue;
        c = !0, d += p.text;
      }
    }
    return m.length > 0 && console.warn(`there are non-text parts ${m} in the response, returning concatenation of all text parts. Please refer to the non text parts for a full response from model.`), c ? d : void 0;
  }
  /**
   * Returns the concatenation of all inline data parts from the first candidate
   * in the response.
   *
   * @remarks
   * If there are multiple candidates in the response, the inline data from the
   * first one will be returned. If there are non-inline data parts in the
   * response, the concatenation of all inline data parts will be returned, and
   * a warning will be logged.
   */
  get data() {
    var e, t, o, r, l, a, u, f;
    if (((r = (o = (t = (e = this.candidates) === null || e === void 0 ? void 0 : e[0]) === null || t === void 0 ? void 0 : t.content) === null || o === void 0 ? void 0 : o.parts) === null || r === void 0 ? void 0 : r.length) === 0)
      return;
    this.candidates && this.candidates.length > 1 && console.warn("there are multiple candidates in the response, returning data from the first one.");
    let d = "";
    const c = [];
    for (const m of (f = (u = (a = (l = this.candidates) === null || l === void 0 ? void 0 : l[0]) === null || a === void 0 ? void 0 : a.content) === null || u === void 0 ? void 0 : u.parts) !== null && f !== void 0 ? f : []) {
      for (const [p, h] of Object.entries(m))
        p !== "inlineData" && (h !== null || h !== void 0) && c.push(p);
      m.inlineData && typeof m.inlineData.data == "string" && (d += atob(m.inlineData.data));
    }
    return c.length > 0 && console.warn(`there are non-data parts ${c} in the response, returning concatenation of all data parts. Please refer to the non data parts for a full response from model.`), d.length > 0 ? btoa(d) : void 0;
  }
  /**
   * Returns the function calls from the first candidate in the response.
   *
   * @remarks
   * If there are multiple candidates in the response, the function calls from
   * the first one will be returned.
   * If there are no function calls in the response, undefined will be returned.
   *
   * @example
   * ```ts
   * const controlLightFunctionDeclaration: FunctionDeclaration = {
   *   name: 'controlLight',
   *   parameters: {
   *   type: Type.OBJECT,
   *   description: 'Set the brightness and color temperature of a room light.',
   *   properties: {
   *     brightness: {
   *       type: Type.NUMBER,
   *       description:
   *         'Light level from 0 to 100. Zero is off and 100 is full brightness.',
   *     },
   *     colorTemperature: {
   *       type: Type.STRING,
   *       description:
   *         'Color temperature of the light fixture which can be `daylight`, `cool` or `warm`.',
   *     },
   *   },
   *   required: ['brightness', 'colorTemperature'],
   *  };
   *  const response = await ai.models.generateContent({
   *     model: 'gemini-2.0-flash',
   *     contents: 'Dim the lights so the room feels cozy and warm.',
   *     config: {
   *       tools: [{functionDeclarations: [controlLightFunctionDeclaration]}],
   *       toolConfig: {
   *         functionCallingConfig: {
   *           mode: FunctionCallingConfigMode.ANY,
   *           allowedFunctionNames: ['controlLight'],
   *         },
   *       },
   *     },
   *   });
   *  console.debug(JSON.stringify(response.functionCalls));
   * ```
   */
  get functionCalls() {
    var e, t, o, r, l, a, u, f;
    if (((r = (o = (t = (e = this.candidates) === null || e === void 0 ? void 0 : e[0]) === null || t === void 0 ? void 0 : t.content) === null || o === void 0 ? void 0 : o.parts) === null || r === void 0 ? void 0 : r.length) === 0)
      return;
    this.candidates && this.candidates.length > 1 && console.warn("there are multiple candidates in the response, returning function calls from the first one.");
    const d = (f = (u = (a = (l = this.candidates) === null || l === void 0 ? void 0 : l[0]) === null || a === void 0 ? void 0 : a.content) === null || u === void 0 ? void 0 : u.parts) === null || f === void 0 ? void 0 : f.filter((c) => c.functionCall).map((c) => c.functionCall).filter((c) => c !== void 0);
    if (d?.length !== 0)
      return d;
  }
  /**
   * Returns the first executable code from the first candidate in the response.
   *
   * @remarks
   * If there are multiple candidates in the response, the executable code from
   * the first one will be returned.
   * If there are no executable code in the response, undefined will be
   * returned.
   *
   * @example
   * ```ts
   * const response = await ai.models.generateContent({
   *   model: 'gemini-2.0-flash',
   *   contents:
   *     'What is the sum of the first 50 prime numbers? Generate and run code for the calculation, and make sure you get all 50.'
   *   config: {
   *     tools: [{codeExecution: {}}],
   *   },
   * });
   *
   * console.debug(response.executableCode);
   * ```
   */
  get executableCode() {
    var e, t, o, r, l, a, u, f, d;
    if (((r = (o = (t = (e = this.candidates) === null || e === void 0 ? void 0 : e[0]) === null || t === void 0 ? void 0 : t.content) === null || o === void 0 ? void 0 : o.parts) === null || r === void 0 ? void 0 : r.length) === 0)
      return;
    this.candidates && this.candidates.length > 1 && console.warn("there are multiple candidates in the response, returning executable code from the first one.");
    const c = (f = (u = (a = (l = this.candidates) === null || l === void 0 ? void 0 : l[0]) === null || a === void 0 ? void 0 : a.content) === null || u === void 0 ? void 0 : u.parts) === null || f === void 0 ? void 0 : f.filter((m) => m.executableCode).map((m) => m.executableCode).filter((m) => m !== void 0);
    if (c?.length !== 0)
      return (d = c?.[0]) === null || d === void 0 ? void 0 : d.code;
  }
  /**
   * Returns the first code execution result from the first candidate in the response.
   *
   * @remarks
   * If there are multiple candidates in the response, the code execution result from
   * the first one will be returned.
   * If there are no code execution result in the response, undefined will be returned.
   *
   * @example
   * ```ts
   * const response = await ai.models.generateContent({
   *   model: 'gemini-2.0-flash',
   *   contents:
   *     'What is the sum of the first 50 prime numbers? Generate and run code for the calculation, and make sure you get all 50.'
   *   config: {
   *     tools: [{codeExecution: {}}],
   *   },
   * });
   *
   * console.debug(response.codeExecutionResult);
   * ```
   */
  get codeExecutionResult() {
    var e, t, o, r, l, a, u, f, d;
    if (((r = (o = (t = (e = this.candidates) === null || e === void 0 ? void 0 : e[0]) === null || t === void 0 ? void 0 : t.content) === null || o === void 0 ? void 0 : o.parts) === null || r === void 0 ? void 0 : r.length) === 0)
      return;
    this.candidates && this.candidates.length > 1 && console.warn("there are multiple candidates in the response, returning code execution result from the first one.");
    const c = (f = (u = (a = (l = this.candidates) === null || l === void 0 ? void 0 : l[0]) === null || a === void 0 ? void 0 : a.content) === null || u === void 0 ? void 0 : u.parts) === null || f === void 0 ? void 0 : f.filter((m) => m.codeExecutionResult).map((m) => m.codeExecutionResult).filter((m) => m !== void 0);
    if (c?.length !== 0)
      return (d = c?.[0]) === null || d === void 0 ? void 0 : d.output;
  }
}
class It {
}
class St {
}
class Pi {
}
class wi {
}
class Mi {
}
class Ni {
}
class At {
}
class vt {
}
class Rt {
}
class Di {
}
class Se {
  /**
   * Instantiates an Operation of the same type as the one being called with the fields set from the API response.
   * @internal
   */
  _fromAPIResponse({ apiResponse: e, _isVertexAI: t }) {
    const o = new Se();
    let r;
    const l = e;
    return t ? r = hi(l) : r = mi(l), Object.assign(o, r), o;
  }
}
class Pt {
}
class wt {
}
class Mt {
}
class Nt {
}
class xi {
}
class Ui {
}
class Li {
}
class sn {
  /**
   * Instantiates an Operation of the same type as the one being called with the fields set from the API response.
   * @internal
   */
  _fromAPIResponse({ apiResponse: e, _isVertexAI: t }) {
    const o = new sn(), l = Ii(e);
    return Object.assign(o, l), o;
  }
}
class ki {
}
class Gi {
}
class Fi {
}
class Vi {
}
class Dt {
}
class qi {
  /**
   * Returns the concatenation of all text parts from the server content if present.
   *
   * @remarks
   * If there are non-text parts in the response, the concatenation of all text
   * parts will be returned, and a warning will be logged.
   */
  get text() {
    var e, t, o;
    let r = "", l = !1;
    const a = [];
    for (const u of (o = (t = (e = this.serverContent) === null || e === void 0 ? void 0 : e.modelTurn) === null || t === void 0 ? void 0 : t.parts) !== null && o !== void 0 ? o : []) {
      for (const [f, d] of Object.entries(u))
        f !== "text" && f !== "thought" && d !== null && a.push(f);
      if (typeof u.text == "string") {
        if (typeof u.thought == "boolean" && u.thought)
          continue;
        l = !0, r += u.text;
      }
    }
    return a.length > 0 && console.warn(`there are non-text parts ${a} in the response, returning concatenation of all text parts. Please refer to the non text parts for a full response from model.`), l ? r : void 0;
  }
  /**
   * Returns the concatenation of all inline data parts from the server content if present.
   *
   * @remarks
   * If there are non-inline data parts in the
   * response, the concatenation of all inline data parts will be returned, and
   * a warning will be logged.
   */
  get data() {
    var e, t, o;
    let r = "";
    const l = [];
    for (const a of (o = (t = (e = this.serverContent) === null || e === void 0 ? void 0 : e.modelTurn) === null || t === void 0 ? void 0 : t.parts) !== null && o !== void 0 ? o : []) {
      for (const [u, f] of Object.entries(a))
        u !== "inlineData" && f !== null && l.push(u);
      a.inlineData && typeof a.inlineData.data == "string" && (r += atob(a.inlineData.data));
    }
    return l.length > 0 && console.warn(`there are non-data parts ${l} in the response, returning concatenation of all data parts. Please refer to the non data parts for a full response from model.`), r.length > 0 ? btoa(r) : void 0;
  }
}
class Hi {
  /**
   * Returns the first audio chunk from the server content, if present.
   *
   * @remarks
   * If there are no audio chunks in the response, undefined will be returned.
   */
  get audioChunk() {
    if (this.serverContent && this.serverContent.audioChunks && this.serverContent.audioChunks.length > 0)
      return this.serverContent.audioChunks[0];
  }
}
class ln {
  /**
   * Instantiates an Operation of the same type as the one being called with the fields set from the API response.
   * @internal
   */
  _fromAPIResponse({ apiResponse: e, _isVertexAI: t }) {
    const o = new ln(), l = io(e);
    return Object.assign(o, l), o;
  }
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function N(n, e) {
  if (!e || typeof e != "string")
    throw new Error("model is required and must be a string");
  if (e.includes("..") || e.includes("?") || e.includes("&"))
    throw new Error("invalid model parameter");
  if (n.isVertexAI()) {
    if (e.startsWith("publishers/") || e.startsWith("projects/") || e.startsWith("models/"))
      return e;
    if (e.indexOf("/") >= 0) {
      const t = e.split("/", 2);
      return `publishers/${t[0]}/models/${t[1]}`;
    } else
      return `publishers/google/models/${e}`;
  } else
    return e.startsWith("models/") || e.startsWith("tunedModels/") ? e : `models/${e}`;
}
function ro(n, e) {
  const t = N(n, e);
  return t ? t.startsWith("publishers/") && n.isVertexAI() ? `projects/${n.getProject()}/locations/${n.getLocation()}/${t}` : t.startsWith("models/") && n.isVertexAI() ? `projects/${n.getProject()}/locations/${n.getLocation()}/publishers/google/${t}` : t : "";
}
function so(n) {
  return Array.isArray(n) ? n.map((e) => Ae(e)) : [Ae(n)];
}
function Ae(n) {
  if (typeof n == "object" && n !== null)
    return n;
  throw new Error(`Could not parse input as Blob. Unsupported blob type: ${typeof n}`);
}
function lo(n) {
  const e = Ae(n);
  if (e.mimeType && e.mimeType.startsWith("image/"))
    return e;
  throw new Error(`Unsupported mime type: ${e.mimeType}`);
}
function ao(n) {
  const e = Ae(n);
  if (e.mimeType && e.mimeType.startsWith("audio/"))
    return e;
  throw new Error(`Unsupported mime type: ${e.mimeType}`);
}
function xt(n) {
  if (n == null)
    throw new Error("PartUnion is required");
  if (typeof n == "object")
    return n;
  if (typeof n == "string")
    return { text: n };
  throw new Error(`Unsupported part type: ${typeof n}`);
}
function uo(n) {
  if (n == null || Array.isArray(n) && n.length === 0)
    throw new Error("PartListUnion is required");
  return Array.isArray(n) ? n.map((e) => xt(e)) : [xt(n)];
}
function We(n) {
  return n != null && typeof n == "object" && "parts" in n && Array.isArray(n.parts);
}
function Ut(n) {
  return n != null && typeof n == "object" && "functionCall" in n;
}
function Lt(n) {
  return n != null && typeof n == "object" && "functionResponse" in n;
}
function k(n) {
  if (n == null)
    throw new Error("ContentUnion is required");
  return We(n) ? n : {
    role: "user",
    parts: uo(n)
  };
}
function an(n, e) {
  if (!e)
    return [];
  if (n.isVertexAI() && Array.isArray(e))
    return e.flatMap((t) => {
      const o = k(t);
      return o.parts && o.parts.length > 0 && o.parts[0].text !== void 0 ? [o.parts[0].text] : [];
    });
  if (n.isVertexAI()) {
    const t = k(e);
    return t.parts && t.parts.length > 0 && t.parts[0].text !== void 0 ? [t.parts[0].text] : [];
  }
  return Array.isArray(e) ? e.map((t) => k(t)) : [k(e)];
}
function H(n) {
  if (n == null || Array.isArray(n) && n.length === 0)
    throw new Error("contents are required");
  if (!Array.isArray(n)) {
    if (Ut(n) || Lt(n))
      throw new Error("To specify functionCall or functionResponse parts, please wrap them in a Content object, specifying the role for them");
    return [k(n)];
  }
  const e = [], t = [], o = We(n[0]);
  for (const r of n) {
    const l = We(r);
    if (l != o)
      throw new Error("Mixing Content and Parts is not supported, please group the parts into a the appropriate Content objects and specify the roles for them");
    if (l)
      e.push(r);
    else {
      if (Ut(r) || Lt(r))
        throw new Error("To specify functionCall or functionResponse parts, please wrap them, and any other parts, in Content objects as appropriate, specifying the role for them");
      t.push(r);
    }
  }
  return o || e.push({ role: "user", parts: uo(t) }), e;
}
function Bi(n, e) {
  n.includes("null") && (e.nullable = !0);
  const t = n.filter((o) => o !== "null");
  if (t.length === 1)
    e.type = Object.values(Q).includes(t[0].toUpperCase()) ? t[0].toUpperCase() : Q.TYPE_UNSPECIFIED;
  else {
    e.anyOf = [];
    for (const o of t)
      e.anyOf.push({
        type: Object.values(Q).includes(o.toUpperCase()) ? o.toUpperCase() : Q.TYPE_UNSPECIFIED
      });
  }
}
function ie(n) {
  const e = {}, t = ["items"], o = ["anyOf"], r = ["properties"];
  if (n.type && n.anyOf)
    throw new Error("type and anyOf cannot be both populated.");
  const l = n.anyOf;
  l != null && l.length == 2 && (l[0].type === "null" ? (e.nullable = !0, n = l[1]) : l[1].type === "null" && (e.nullable = !0, n = l[0])), n.type instanceof Array && Bi(n.type, e);
  for (const [a, u] of Object.entries(n))
    if (u != null)
      if (a == "type") {
        if (u === "null")
          throw new Error("type: null can not be the only possible type for the field.");
        if (u instanceof Array)
          continue;
        e.type = Object.values(Q).includes(u.toUpperCase()) ? u.toUpperCase() : Q.TYPE_UNSPECIFIED;
      } else if (t.includes(a))
        e[a] = ie(u);
      else if (o.includes(a)) {
        const f = [];
        for (const d of u) {
          if (d.type == "null") {
            e.nullable = !0;
            continue;
          }
          f.push(ie(d));
        }
        e[a] = f;
      } else if (r.includes(a)) {
        const f = {};
        for (const [d, c] of Object.entries(u))
          f[d] = ie(c);
        e[a] = f;
      } else {
        if (a === "additionalProperties")
          continue;
        e[a] = u;
      }
  return e;
}
function un(n) {
  return ie(n);
}
function dn(n) {
  if (typeof n == "object")
    return n;
  if (typeof n == "string")
    return {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: n
        }
      }
    };
  throw new Error(`Unsupported speechConfig type: ${typeof n}`);
}
function fn(n) {
  if ("multiSpeakerVoiceConfig" in n)
    throw new Error("multiSpeakerVoiceConfig is not supported in the live API.");
  return n;
}
function se(n) {
  if (n.functionDeclarations)
    for (const e of n.functionDeclarations)
      e.parameters && (Object.keys(e.parameters).includes("$schema") ? e.parametersJsonSchema || (e.parametersJsonSchema = e.parameters, delete e.parameters) : e.parameters = ie(e.parameters)), e.response && (Object.keys(e.response).includes("$schema") ? e.responseJsonSchema || (e.responseJsonSchema = e.response, delete e.response) : e.response = ie(e.response));
  return n;
}
function le(n) {
  if (n == null)
    throw new Error("tools is required");
  if (!Array.isArray(n))
    throw new Error("tools is required and must be an array of Tools");
  const e = [];
  for (const t of n)
    e.push(t);
  return e;
}
function bi(n, e, t, o = 1) {
  const r = !e.startsWith(`${t}/`) && e.split("/").length === o;
  return n.isVertexAI() ? e.startsWith("projects/") ? e : e.startsWith("locations/") ? `projects/${n.getProject()}/${e}` : e.startsWith(`${t}/`) ? `projects/${n.getProject()}/locations/${n.getLocation()}/${e}` : r ? `projects/${n.getProject()}/locations/${n.getLocation()}/${t}/${e}` : e : r ? `${t}/${e}` : e;
}
function z(n, e) {
  if (typeof e != "string")
    throw new Error("name must be a string");
  return bi(n, e, "cachedContents");
}
function fo(n) {
  switch (n) {
    case "STATE_UNSPECIFIED":
      return "JOB_STATE_UNSPECIFIED";
    case "CREATING":
      return "JOB_STATE_RUNNING";
    case "ACTIVE":
      return "JOB_STATE_SUCCEEDED";
    case "FAILED":
      return "JOB_STATE_FAILED";
    default:
      return n;
  }
}
function X(n) {
  return rn(n);
}
function Ji(n) {
  return n != null && typeof n == "object" && "name" in n;
}
function $i(n) {
  return n != null && typeof n == "object" && "video" in n;
}
function Ki(n) {
  return n != null && typeof n == "object" && "uri" in n;
}
function co(n) {
  var e;
  let t;
  if (Ji(n) && (t = n.name), !(Ki(n) && (t = n.uri, t === void 0)) && !($i(n) && (t = (e = n.video) === null || e === void 0 ? void 0 : e.uri, t === void 0))) {
    if (typeof n == "string" && (t = n), t === void 0)
      throw new Error("Could not extract file name from the provided input.");
    if (t.startsWith("https://")) {
      const r = t.split("files/")[1].match(/[a-z0-9]+/);
      if (r === null)
        throw new Error(`Could not extract file name from URI ${t}`);
      t = r[0];
    } else t.startsWith("files/") && (t = t.split("files/")[1]);
    return t;
  }
}
function po(n, e) {
  let t;
  return n.isVertexAI() ? t = e ? "publishers/google/models" : "models" : t = e ? "models" : "tunedModels", t;
}
function mo(n) {
  for (const e of ["models", "tunedModels", "publisherModels"])
    if (Oi(n, e))
      return n[e];
  return [];
}
function Oi(n, e) {
  return n !== null && typeof n == "object" && e in n;
}
function Wi(n, e = {}) {
  const t = n, o = {
    name: t.name,
    description: t.description,
    parametersJsonSchema: t.inputSchema
  };
  return t.outputSchema && (o.responseJsonSchema = t.outputSchema), e.behavior && (o.behavior = e.behavior), {
    functionDeclarations: [
      o
    ]
  };
}
function Yi(n, e = {}) {
  const t = [], o = /* @__PURE__ */ new Set();
  for (const r of n) {
    const l = r.name;
    if (o.has(l))
      throw new Error(`Duplicate function name ${l} found in MCP tools. Please ensure function names are unique.`);
    o.add(l);
    const a = Wi(r, e);
    a.functionDeclarations && t.push(...a.functionDeclarations);
  }
  return { functionDeclarations: t };
}
function ho(n, e) {
  let t;
  if (typeof e == "string")
    if (n.isVertexAI())
      if (e.startsWith("gs://"))
        t = { format: "jsonl", gcsUri: [e] };
      else if (e.startsWith("bq://"))
        t = { format: "bigquery", bigqueryUri: e };
      else
        throw new Error(`Unsupported string source for Vertex AI: ${e}`);
    else if (e.startsWith("files/"))
      t = { fileName: e };
    else
      throw new Error(`Unsupported string source for Gemini API: ${e}`);
  else if (Array.isArray(e)) {
    if (n.isVertexAI())
      throw new Error("InlinedRequest[] is not supported in Vertex AI.");
    t = { inlinedRequests: e };
  } else
    t = e;
  const o = [t.gcsUri, t.bigqueryUri].filter(Boolean).length, r = [
    t.inlinedRequests,
    t.fileName
  ].filter(Boolean).length;
  if (n.isVertexAI()) {
    if (r > 0 || o !== 1)
      throw new Error("Exactly one of `gcsUri` or `bigqueryUri` must be set for Vertex AI.");
  } else if (o > 0 || r !== 1)
    throw new Error("Exactly one of `inlinedRequests`, `fileName`, must be set for Gemini API.");
  return t;
}
function zi(n) {
  if (typeof n != "string")
    return n;
  const e = n;
  if (e.startsWith("gs://"))
    return {
      format: "jsonl",
      gcsUri: e
    };
  if (e.startsWith("bq://"))
    return {
      format: "bigquery",
      bigqueryUri: e
    };
  throw new Error(`Unsupported destination: ${e}`);
}
function go(n) {
  if (typeof n != "object" || n === null)
    return {};
  const e = n, t = e.inlinedResponses;
  if (typeof t != "object" || t === null)
    return n;
  const r = t.inlinedResponses;
  if (!Array.isArray(r) || r.length === 0)
    return n;
  let l = !1;
  for (const a of r) {
    if (typeof a != "object" || a === null)
      continue;
    const f = a.response;
    if (typeof f != "object" || f === null)
      continue;
    if (f.embedding !== void 0) {
      l = !0;
      break;
    }
  }
  return l && (e.inlinedEmbedContentResponses = e.inlinedResponses, delete e.inlinedResponses), n;
}
function ae(n, e) {
  const t = e;
  if (!n.isVertexAI()) {
    if (/batches\/[^/]+$/.test(t))
      return t.split("/").pop();
    throw new Error(`Invalid batch job name: ${t}.`);
  }
  if (/^projects\/[^/]+\/locations\/[^/]+\/batchPredictionJobs\/[^/]+$/.test(t))
    return t.split("/").pop();
  if (/^\d+$/.test(t))
    return t;
  throw new Error(`Invalid batch job name: ${t}.`);
}
function yo(n) {
  const e = n;
  return e === "BATCH_STATE_UNSPECIFIED" ? "JOB_STATE_UNSPECIFIED" : e === "BATCH_STATE_PENDING" ? "JOB_STATE_PENDING" : e === "BATCH_STATE_RUNNING" ? "JOB_STATE_RUNNING" : e === "BATCH_STATE_SUCCEEDED" ? "JOB_STATE_SUCCEEDED" : e === "BATCH_STATE_FAILED" ? "JOB_STATE_FAILED" : e === "BATCH_STATE_CANCELLED" ? "JOB_STATE_CANCELLED" : e === "BATCH_STATE_EXPIRED" ? "JOB_STATE_EXPIRED" : e;
}
function Qi(n) {
  return n.includes("gemini") && n !== "gemini-embedding-001" || n.includes("maas");
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function Xi(n) {
  const e = {}, t = i(n, ["apiKey"]);
  if (t != null && s(e, ["apiKey"], t), i(n, ["apiKeyConfig"]) !== void 0)
    throw new Error("apiKeyConfig parameter is not supported in Gemini API.");
  if (i(n, ["authType"]) !== void 0)
    throw new Error("authType parameter is not supported in Gemini API.");
  if (i(n, ["googleServiceAccountConfig"]) !== void 0)
    throw new Error("googleServiceAccountConfig parameter is not supported in Gemini API.");
  if (i(n, ["httpBasicAuthConfig"]) !== void 0)
    throw new Error("httpBasicAuthConfig parameter is not supported in Gemini API.");
  if (i(n, ["oauthConfig"]) !== void 0)
    throw new Error("oauthConfig parameter is not supported in Gemini API.");
  if (i(n, ["oidcConfig"]) !== void 0)
    throw new Error("oidcConfig parameter is not supported in Gemini API.");
  return e;
}
function Zi(n) {
  const e = {}, t = i(n, ["responsesFile"]);
  t != null && s(e, ["fileName"], t);
  const o = i(n, [
    "inlinedResponses",
    "inlinedResponses"
  ]);
  if (o != null) {
    let l = o;
    Array.isArray(l) && (l = l.map((a) => xr(a))), s(e, ["inlinedResponses"], l);
  }
  const r = i(n, [
    "inlinedEmbedContentResponses",
    "inlinedResponses"
  ]);
  if (r != null) {
    let l = r;
    Array.isArray(l) && (l = l.map((a) => a)), s(e, ["inlinedEmbedContentResponses"], l);
  }
  return e;
}
function ji(n) {
  const e = {}, t = i(n, ["predictionsFormat"]);
  t != null && s(e, ["format"], t);
  const o = i(n, [
    "gcsDestination",
    "outputUriPrefix"
  ]);
  o != null && s(e, ["gcsUri"], o);
  const r = i(n, [
    "bigqueryDestination",
    "outputUri"
  ]);
  return r != null && s(e, ["bigqueryUri"], r), e;
}
function er(n) {
  const e = {}, t = i(n, ["format"]);
  t != null && s(e, ["predictionsFormat"], t);
  const o = i(n, ["gcsUri"]);
  o != null && s(e, ["gcsDestination", "outputUriPrefix"], o);
  const r = i(n, ["bigqueryUri"]);
  if (r != null && s(e, ["bigqueryDestination", "outputUri"], r), i(n, ["fileName"]) !== void 0)
    throw new Error("fileName parameter is not supported in Vertex AI.");
  if (i(n, ["inlinedResponses"]) !== void 0)
    throw new Error("inlinedResponses parameter is not supported in Vertex AI.");
  if (i(n, ["inlinedEmbedContentResponses"]) !== void 0)
    throw new Error("inlinedEmbedContentResponses parameter is not supported in Vertex AI.");
  return e;
}
function _e(n) {
  const e = {}, t = i(n, ["name"]);
  t != null && s(e, ["name"], t);
  const o = i(n, [
    "metadata",
    "displayName"
  ]);
  o != null && s(e, ["displayName"], o);
  const r = i(n, ["metadata", "state"]);
  r != null && s(e, ["state"], yo(r));
  const l = i(n, [
    "metadata",
    "createTime"
  ]);
  l != null && s(e, ["createTime"], l);
  const a = i(n, [
    "metadata",
    "endTime"
  ]);
  a != null && s(e, ["endTime"], a);
  const u = i(n, [
    "metadata",
    "updateTime"
  ]);
  u != null && s(e, ["updateTime"], u);
  const f = i(n, ["metadata", "model"]);
  f != null && s(e, ["model"], f);
  const d = i(n, ["metadata", "output"]);
  return d != null && s(e, ["dest"], Zi(go(d))), e;
}
function Ye(n) {
  const e = {}, t = i(n, ["name"]);
  t != null && s(e, ["name"], t);
  const o = i(n, ["displayName"]);
  o != null && s(e, ["displayName"], o);
  const r = i(n, ["state"]);
  r != null && s(e, ["state"], yo(r));
  const l = i(n, ["error"]);
  l != null && s(e, ["error"], l);
  const a = i(n, ["createTime"]);
  a != null && s(e, ["createTime"], a);
  const u = i(n, ["startTime"]);
  u != null && s(e, ["startTime"], u);
  const f = i(n, ["endTime"]);
  f != null && s(e, ["endTime"], f);
  const d = i(n, ["updateTime"]);
  d != null && s(e, ["updateTime"], d);
  const c = i(n, ["model"]);
  c != null && s(e, ["model"], c);
  const m = i(n, ["inputConfig"]);
  m != null && s(e, ["src"], nr(m));
  const p = i(n, ["outputConfig"]);
  p != null && s(e, ["dest"], ji(go(p)));
  const h = i(n, [
    "completionStats"
  ]);
  return h != null && s(e, ["completionStats"], h), e;
}
function nr(n) {
  const e = {}, t = i(n, ["instancesFormat"]);
  t != null && s(e, ["format"], t);
  const o = i(n, ["gcsSource", "uris"]);
  o != null && s(e, ["gcsUri"], o);
  const r = i(n, [
    "bigquerySource",
    "inputUri"
  ]);
  return r != null && s(e, ["bigqueryUri"], r), e;
}
function tr(n, e) {
  const t = {};
  if (i(e, ["format"]) !== void 0)
    throw new Error("format parameter is not supported in Gemini API.");
  if (i(e, ["gcsUri"]) !== void 0)
    throw new Error("gcsUri parameter is not supported in Gemini API.");
  if (i(e, ["bigqueryUri"]) !== void 0)
    throw new Error("bigqueryUri parameter is not supported in Gemini API.");
  const o = i(e, ["fileName"]);
  o != null && s(t, ["fileName"], o);
  const r = i(e, [
    "inlinedRequests"
  ]);
  if (r != null) {
    let l = r;
    Array.isArray(l) && (l = l.map((a) => Dr(n, a))), s(t, ["requests", "requests"], l);
  }
  return t;
}
function or(n) {
  const e = {}, t = i(n, ["format"]);
  t != null && s(e, ["instancesFormat"], t);
  const o = i(n, ["gcsUri"]);
  o != null && s(e, ["gcsSource", "uris"], o);
  const r = i(n, ["bigqueryUri"]);
  if (r != null && s(e, ["bigquerySource", "inputUri"], r), i(n, ["fileName"]) !== void 0)
    throw new Error("fileName parameter is not supported in Vertex AI.");
  if (i(n, ["inlinedRequests"]) !== void 0)
    throw new Error("inlinedRequests parameter is not supported in Vertex AI.");
  return e;
}
function ir(n) {
  const e = {}, t = i(n, ["data"]);
  if (t != null && s(e, ["data"], t), i(n, ["displayName"]) !== void 0)
    throw new Error("displayName parameter is not supported in Gemini API.");
  const o = i(n, ["mimeType"]);
  return o != null && s(e, ["mimeType"], o), e;
}
function rr(n, e) {
  const t = {}, o = i(e, ["name"]);
  return o != null && s(t, ["_url", "name"], ae(n, o)), t;
}
function sr(n, e) {
  const t = {}, o = i(e, ["name"]);
  return o != null && s(t, ["_url", "name"], ae(n, o)), t;
}
function lr(n) {
  const e = {}, t = i(n, ["content"]);
  t != null && s(e, ["content"], t);
  const o = i(n, [
    "citationMetadata"
  ]);
  o != null && s(e, ["citationMetadata"], ar(o));
  const r = i(n, ["tokenCount"]);
  r != null && s(e, ["tokenCount"], r);
  const l = i(n, ["finishReason"]);
  l != null && s(e, ["finishReason"], l);
  const a = i(n, [
    "groundingMetadata"
  ]);
  a != null && s(e, ["groundingMetadata"], a);
  const u = i(n, ["avgLogprobs"]);
  u != null && s(e, ["avgLogprobs"], u);
  const f = i(n, ["index"]);
  f != null && s(e, ["index"], f);
  const d = i(n, [
    "logprobsResult"
  ]);
  d != null && s(e, ["logprobsResult"], d);
  const c = i(n, [
    "safetyRatings"
  ]);
  if (c != null) {
    let p = c;
    Array.isArray(p) && (p = p.map((h) => h)), s(e, ["safetyRatings"], p);
  }
  const m = i(n, [
    "urlContextMetadata"
  ]);
  return m != null && s(e, ["urlContextMetadata"], m), e;
}
function ar(n) {
  const e = {}, t = i(n, ["citationSources"]);
  if (t != null) {
    let o = t;
    Array.isArray(o) && (o = o.map((r) => r)), s(e, ["citations"], o);
  }
  return e;
}
function To(n) {
  const e = {}, t = i(n, ["parts"]);
  if (t != null) {
    let r = t;
    Array.isArray(r) && (r = r.map((l) => qr(l))), s(e, ["parts"], r);
  }
  const o = i(n, ["role"]);
  return o != null && s(e, ["role"], o), e;
}
function ur(n, e) {
  const t = {}, o = i(n, ["displayName"]);
  if (e !== void 0 && o != null && s(e, ["batch", "displayName"], o), i(n, ["dest"]) !== void 0)
    throw new Error("dest parameter is not supported in Gemini API.");
  return t;
}
function dr(n, e) {
  const t = {}, o = i(n, ["displayName"]);
  e !== void 0 && o != null && s(e, ["displayName"], o);
  const r = i(n, ["dest"]);
  return e !== void 0 && r != null && s(e, ["outputConfig"], er(zi(r))), t;
}
function kt(n, e) {
  const t = {}, o = i(e, ["model"]);
  o != null && s(t, ["_url", "model"], N(n, o));
  const r = i(e, ["src"]);
  r != null && s(t, ["batch", "inputConfig"], tr(n, ho(n, r)));
  const l = i(e, ["config"]);
  return l != null && ur(l, t), t;
}
function fr(n, e) {
  const t = {}, o = i(e, ["model"]);
  o != null && s(t, ["model"], N(n, o));
  const r = i(e, ["src"]);
  r != null && s(t, ["inputConfig"], or(ho(n, r)));
  const l = i(e, ["config"]);
  return l != null && dr(l, t), t;
}
function cr(n, e) {
  const t = {}, o = i(n, ["displayName"]);
  return e !== void 0 && o != null && s(e, ["batch", "displayName"], o), t;
}
function pr(n, e) {
  const t = {}, o = i(e, ["model"]);
  o != null && s(t, ["_url", "model"], N(n, o));
  const r = i(e, ["src"]);
  r != null && s(t, ["batch", "inputConfig"], Er(n, r));
  const l = i(e, ["config"]);
  return l != null && cr(l, t), t;
}
function mr(n, e) {
  const t = {}, o = i(e, ["name"]);
  return o != null && s(t, ["_url", "name"], ae(n, o)), t;
}
function hr(n, e) {
  const t = {}, o = i(e, ["name"]);
  return o != null && s(t, ["_url", "name"], ae(n, o)), t;
}
function gr(n) {
  const e = {}, t = i(n, [
    "sdkHttpResponse"
  ]);
  t != null && s(e, ["sdkHttpResponse"], t);
  const o = i(n, ["name"]);
  o != null && s(e, ["name"], o);
  const r = i(n, ["done"]);
  r != null && s(e, ["done"], r);
  const l = i(n, ["error"]);
  return l != null && s(e, ["error"], l), e;
}
function yr(n) {
  const e = {}, t = i(n, [
    "sdkHttpResponse"
  ]);
  t != null && s(e, ["sdkHttpResponse"], t);
  const o = i(n, ["name"]);
  o != null && s(e, ["name"], o);
  const r = i(n, ["done"]);
  r != null && s(e, ["done"], r);
  const l = i(n, ["error"]);
  return l != null && s(e, ["error"], l), e;
}
function Tr(n, e) {
  const t = {}, o = i(e, ["contents"]);
  if (o != null) {
    let l = an(n, o);
    Array.isArray(l) && (l = l.map((a) => a)), s(t, ["requests[]", "request", "content"], l);
  }
  const r = i(e, ["config"]);
  return r != null && (s(t, ["_self"], _r(r, t)), ci(t, { "requests[].*": "requests[].request.*" })), t;
}
function _r(n, e) {
  const t = {}, o = i(n, ["taskType"]);
  e !== void 0 && o != null && s(e, ["requests[]", "taskType"], o);
  const r = i(n, ["title"]);
  e !== void 0 && r != null && s(e, ["requests[]", "title"], r);
  const l = i(n, [
    "outputDimensionality"
  ]);
  if (e !== void 0 && l != null && s(e, ["requests[]", "outputDimensionality"], l), i(n, ["mimeType"]) !== void 0)
    throw new Error("mimeType parameter is not supported in Gemini API.");
  if (i(n, ["autoTruncate"]) !== void 0)
    throw new Error("autoTruncate parameter is not supported in Gemini API.");
  return t;
}
function Er(n, e) {
  const t = {}, o = i(e, ["fileName"]);
  o != null && s(t, ["file_name"], o);
  const r = i(e, [
    "inlinedRequests"
  ]);
  return r != null && s(t, ["requests"], Tr(n, r)), t;
}
function Cr(n) {
  const e = {};
  if (i(n, ["displayName"]) !== void 0)
    throw new Error("displayName parameter is not supported in Gemini API.");
  const t = i(n, ["fileUri"]);
  t != null && s(e, ["fileUri"], t);
  const o = i(n, ["mimeType"]);
  return o != null && s(e, ["mimeType"], o), e;
}
function Ir(n) {
  const e = {}, t = i(n, ["id"]);
  t != null && s(e, ["id"], t);
  const o = i(n, ["args"]);
  o != null && s(e, ["args"], o);
  const r = i(n, ["name"]);
  if (r != null && s(e, ["name"], r), i(n, ["partialArgs"]) !== void 0)
    throw new Error("partialArgs parameter is not supported in Gemini API.");
  if (i(n, ["willContinue"]) !== void 0)
    throw new Error("willContinue parameter is not supported in Gemini API.");
  return e;
}
function Sr(n) {
  const e = {}, t = i(n, [
    "allowedFunctionNames"
  ]);
  t != null && s(e, ["allowedFunctionNames"], t);
  const o = i(n, ["mode"]);
  if (o != null && s(e, ["mode"], o), i(n, ["streamFunctionCallArguments"]) !== void 0)
    throw new Error("streamFunctionCallArguments parameter is not supported in Gemini API.");
  return e;
}
function Ar(n, e, t) {
  const o = {}, r = i(e, [
    "systemInstruction"
  ]);
  t !== void 0 && r != null && s(t, ["systemInstruction"], To(k(r)));
  const l = i(e, ["temperature"]);
  l != null && s(o, ["temperature"], l);
  const a = i(e, ["topP"]);
  a != null && s(o, ["topP"], a);
  const u = i(e, ["topK"]);
  u != null && s(o, ["topK"], u);
  const f = i(e, [
    "candidateCount"
  ]);
  f != null && s(o, ["candidateCount"], f);
  const d = i(e, [
    "maxOutputTokens"
  ]);
  d != null && s(o, ["maxOutputTokens"], d);
  const c = i(e, [
    "stopSequences"
  ]);
  c != null && s(o, ["stopSequences"], c);
  const m = i(e, [
    "responseLogprobs"
  ]);
  m != null && s(o, ["responseLogprobs"], m);
  const p = i(e, ["logprobs"]);
  p != null && s(o, ["logprobs"], p);
  const h = i(e, [
    "presencePenalty"
  ]);
  h != null && s(o, ["presencePenalty"], h);
  const g = i(e, [
    "frequencyPenalty"
  ]);
  g != null && s(o, ["frequencyPenalty"], g);
  const T = i(e, ["seed"]);
  T != null && s(o, ["seed"], T);
  const y = i(e, [
    "responseMimeType"
  ]);
  y != null && s(o, ["responseMimeType"], y);
  const _ = i(e, [
    "responseSchema"
  ]);
  _ != null && s(o, ["responseSchema"], un(_));
  const S = i(e, [
    "responseJsonSchema"
  ]);
  if (S != null && s(o, ["responseJsonSchema"], S), i(e, ["routingConfig"]) !== void 0)
    throw new Error("routingConfig parameter is not supported in Gemini API.");
  if (i(e, ["modelSelectionConfig"]) !== void 0)
    throw new Error("modelSelectionConfig parameter is not supported in Gemini API.");
  const C = i(e, [
    "safetySettings"
  ]);
  if (t !== void 0 && C != null) {
    let L = C;
    Array.isArray(L) && (L = L.map((U) => Hr(U))), s(t, ["safetySettings"], L);
  }
  const A = i(e, ["tools"]);
  if (t !== void 0 && A != null) {
    let L = le(A);
    Array.isArray(L) && (L = L.map((U) => br(se(U)))), s(t, ["tools"], L);
  }
  const R = i(e, ["toolConfig"]);
  if (t !== void 0 && R != null && s(t, ["toolConfig"], Br(R)), i(e, ["labels"]) !== void 0)
    throw new Error("labels parameter is not supported in Gemini API.");
  const E = i(e, [
    "cachedContent"
  ]);
  t !== void 0 && E != null && s(t, ["cachedContent"], z(n, E));
  const w = i(e, [
    "responseModalities"
  ]);
  w != null && s(o, ["responseModalities"], w);
  const D = i(e, [
    "mediaResolution"
  ]);
  D != null && s(o, ["mediaResolution"], D);
  const v = i(e, ["speechConfig"]);
  if (v != null && s(o, ["speechConfig"], dn(v)), i(e, ["audioTimestamp"]) !== void 0)
    throw new Error("audioTimestamp parameter is not supported in Gemini API.");
  const M = i(e, [
    "thinkingConfig"
  ]);
  M != null && s(o, ["thinkingConfig"], M);
  const x = i(e, ["imageConfig"]);
  x != null && s(o, ["imageConfig"], Nr(x));
  const q = i(e, [
    "enableEnhancedCivicAnswers"
  ]);
  if (q != null && s(o, ["enableEnhancedCivicAnswers"], q), i(e, ["modelArmorConfig"]) !== void 0)
    throw new Error("modelArmorConfig parameter is not supported in Gemini API.");
  return o;
}
function vr(n) {
  const e = {}, t = i(n, [
    "sdkHttpResponse"
  ]);
  t != null && s(e, ["sdkHttpResponse"], t);
  const o = i(n, ["candidates"]);
  if (o != null) {
    let f = o;
    Array.isArray(f) && (f = f.map((d) => lr(d))), s(e, ["candidates"], f);
  }
  const r = i(n, ["modelVersion"]);
  r != null && s(e, ["modelVersion"], r);
  const l = i(n, [
    "promptFeedback"
  ]);
  l != null && s(e, ["promptFeedback"], l);
  const a = i(n, ["responseId"]);
  a != null && s(e, ["responseId"], a);
  const u = i(n, [
    "usageMetadata"
  ]);
  return u != null && s(e, ["usageMetadata"], u), e;
}
function Rr(n, e) {
  const t = {}, o = i(e, ["name"]);
  return o != null && s(t, ["_url", "name"], ae(n, o)), t;
}
function Pr(n, e) {
  const t = {}, o = i(e, ["name"]);
  return o != null && s(t, ["_url", "name"], ae(n, o)), t;
}
function wr(n) {
  const e = {}, t = i(n, ["authConfig"]);
  t != null && s(e, ["authConfig"], Xi(t));
  const o = i(n, ["enableWidget"]);
  return o != null && s(e, ["enableWidget"], o), e;
}
function Mr(n) {
  const e = {}, t = i(n, ["searchTypes"]);
  if (t != null && s(e, ["searchTypes"], t), i(n, ["blockingConfidence"]) !== void 0)
    throw new Error("blockingConfidence parameter is not supported in Gemini API.");
  if (i(n, ["excludeDomains"]) !== void 0)
    throw new Error("excludeDomains parameter is not supported in Gemini API.");
  const o = i(n, [
    "timeRangeFilter"
  ]);
  return o != null && s(e, ["timeRangeFilter"], o), e;
}
function Nr(n) {
  const e = {}, t = i(n, ["aspectRatio"]);
  t != null && s(e, ["aspectRatio"], t);
  const o = i(n, ["imageSize"]);
  if (o != null && s(e, ["imageSize"], o), i(n, ["personGeneration"]) !== void 0)
    throw new Error("personGeneration parameter is not supported in Gemini API.");
  if (i(n, ["prominentPeople"]) !== void 0)
    throw new Error("prominentPeople parameter is not supported in Gemini API.");
  if (i(n, ["outputMimeType"]) !== void 0)
    throw new Error("outputMimeType parameter is not supported in Gemini API.");
  if (i(n, ["outputCompressionQuality"]) !== void 0)
    throw new Error("outputCompressionQuality parameter is not supported in Gemini API.");
  if (i(n, ["imageOutputOptions"]) !== void 0)
    throw new Error("imageOutputOptions parameter is not supported in Gemini API.");
  return e;
}
function Dr(n, e) {
  const t = {}, o = i(e, ["model"]);
  o != null && s(t, ["request", "model"], N(n, o));
  const r = i(e, ["contents"]);
  if (r != null) {
    let u = H(r);
    Array.isArray(u) && (u = u.map((f) => To(f))), s(t, ["request", "contents"], u);
  }
  const l = i(e, ["metadata"]);
  l != null && s(t, ["metadata"], l);
  const a = i(e, ["config"]);
  return a != null && s(t, ["request", "generationConfig"], Ar(n, a, i(t, ["request"], {}))), t;
}
function xr(n) {
  const e = {}, t = i(n, ["response"]);
  t != null && s(e, ["response"], vr(t));
  const o = i(n, ["metadata"]);
  o != null && s(e, ["metadata"], o);
  const r = i(n, ["error"]);
  return r != null && s(e, ["error"], r), e;
}
function Ur(n, e) {
  const t = {}, o = i(n, ["pageSize"]);
  e !== void 0 && o != null && s(e, ["_query", "pageSize"], o);
  const r = i(n, ["pageToken"]);
  if (e !== void 0 && r != null && s(e, ["_query", "pageToken"], r), i(n, ["filter"]) !== void 0)
    throw new Error("filter parameter is not supported in Gemini API.");
  return t;
}
function Lr(n, e) {
  const t = {}, o = i(n, ["pageSize"]);
  e !== void 0 && o != null && s(e, ["_query", "pageSize"], o);
  const r = i(n, ["pageToken"]);
  e !== void 0 && r != null && s(e, ["_query", "pageToken"], r);
  const l = i(n, ["filter"]);
  return e !== void 0 && l != null && s(e, ["_query", "filter"], l), t;
}
function kr(n) {
  const e = {}, t = i(n, ["config"]);
  return t != null && Ur(t, e), e;
}
function Gr(n) {
  const e = {}, t = i(n, ["config"]);
  return t != null && Lr(t, e), e;
}
function Fr(n) {
  const e = {}, t = i(n, [
    "sdkHttpResponse"
  ]);
  t != null && s(e, ["sdkHttpResponse"], t);
  const o = i(n, [
    "nextPageToken"
  ]);
  o != null && s(e, ["nextPageToken"], o);
  const r = i(n, ["operations"]);
  if (r != null) {
    let l = r;
    Array.isArray(l) && (l = l.map((a) => _e(a))), s(e, ["batchJobs"], l);
  }
  return e;
}
function Vr(n) {
  const e = {}, t = i(n, [
    "sdkHttpResponse"
  ]);
  t != null && s(e, ["sdkHttpResponse"], t);
  const o = i(n, [
    "nextPageToken"
  ]);
  o != null && s(e, ["nextPageToken"], o);
  const r = i(n, [
    "batchPredictionJobs"
  ]);
  if (r != null) {
    let l = r;
    Array.isArray(l) && (l = l.map((a) => Ye(a))), s(e, ["batchJobs"], l);
  }
  return e;
}
function qr(n) {
  const e = {}, t = i(n, [
    "mediaResolution"
  ]);
  t != null && s(e, ["mediaResolution"], t);
  const o = i(n, [
    "codeExecutionResult"
  ]);
  o != null && s(e, ["codeExecutionResult"], o);
  const r = i(n, [
    "executableCode"
  ]);
  r != null && s(e, ["executableCode"], r);
  const l = i(n, ["fileData"]);
  l != null && s(e, ["fileData"], Cr(l));
  const a = i(n, ["functionCall"]);
  a != null && s(e, ["functionCall"], Ir(a));
  const u = i(n, [
    "functionResponse"
  ]);
  u != null && s(e, ["functionResponse"], u);
  const f = i(n, ["inlineData"]);
  f != null && s(e, ["inlineData"], ir(f));
  const d = i(n, ["text"]);
  d != null && s(e, ["text"], d);
  const c = i(n, ["thought"]);
  c != null && s(e, ["thought"], c);
  const m = i(n, [
    "thoughtSignature"
  ]);
  m != null && s(e, ["thoughtSignature"], m);
  const p = i(n, [
    "videoMetadata"
  ]);
  return p != null && s(e, ["videoMetadata"], p), e;
}
function Hr(n) {
  const e = {}, t = i(n, ["category"]);
  if (t != null && s(e, ["category"], t), i(n, ["method"]) !== void 0)
    throw new Error("method parameter is not supported in Gemini API.");
  const o = i(n, ["threshold"]);
  return o != null && s(e, ["threshold"], o), e;
}
function Br(n) {
  const e = {}, t = i(n, [
    "retrievalConfig"
  ]);
  t != null && s(e, ["retrievalConfig"], t);
  const o = i(n, [
    "functionCallingConfig"
  ]);
  return o != null && s(e, ["functionCallingConfig"], Sr(o)), e;
}
function br(n) {
  const e = {};
  if (i(n, ["retrieval"]) !== void 0)
    throw new Error("retrieval parameter is not supported in Gemini API.");
  const t = i(n, ["computerUse"]);
  t != null && s(e, ["computerUse"], t);
  const o = i(n, ["fileSearch"]);
  o != null && s(e, ["fileSearch"], o);
  const r = i(n, ["googleSearch"]);
  r != null && s(e, ["googleSearch"], Mr(r));
  const l = i(n, ["googleMaps"]);
  l != null && s(e, ["googleMaps"], wr(l));
  const a = i(n, [
    "codeExecution"
  ]);
  if (a != null && s(e, ["codeExecution"], a), i(n, ["enterpriseWebSearch"]) !== void 0)
    throw new Error("enterpriseWebSearch parameter is not supported in Gemini API.");
  const u = i(n, [
    "functionDeclarations"
  ]);
  if (u != null) {
    let m = u;
    Array.isArray(m) && (m = m.map((p) => p)), s(e, ["functionDeclarations"], m);
  }
  const f = i(n, [
    "googleSearchRetrieval"
  ]);
  if (f != null && s(e, ["googleSearchRetrieval"], f), i(n, ["parallelAiSearch"]) !== void 0)
    throw new Error("parallelAiSearch parameter is not supported in Gemini API.");
  const d = i(n, ["urlContext"]);
  d != null && s(e, ["urlContext"], d);
  const c = i(n, ["mcpServers"]);
  if (c != null) {
    let m = c;
    Array.isArray(m) && (m = m.map((p) => p)), s(e, ["mcpServers"], m);
  }
  return e;
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
var W;
(function(n) {
  n.PAGED_ITEM_BATCH_JOBS = "batchJobs", n.PAGED_ITEM_MODELS = "models", n.PAGED_ITEM_TUNING_JOBS = "tuningJobs", n.PAGED_ITEM_FILES = "files", n.PAGED_ITEM_CACHED_CONTENTS = "cachedContents", n.PAGED_ITEM_FILE_SEARCH_STORES = "fileSearchStores", n.PAGED_ITEM_DOCUMENTS = "documents";
})(W || (W = {}));
class ne {
  constructor(e, t, o, r) {
    this.pageInternal = [], this.paramsInternal = {}, this.requestInternal = t, this.init(e, o, r);
  }
  init(e, t, o) {
    var r, l;
    this.nameInternal = e, this.pageInternal = t[this.nameInternal] || [], this.sdkHttpResponseInternal = t?.sdkHttpResponse, this.idxInternal = 0;
    let a = { config: {} };
    !o || Object.keys(o).length === 0 ? a = { config: {} } : typeof o == "object" ? a = Object.assign({}, o) : a = o, a.config && (a.config.pageToken = t.nextPageToken), this.paramsInternal = a, this.pageInternalSize = (l = (r = a.config) === null || r === void 0 ? void 0 : r.pageSize) !== null && l !== void 0 ? l : this.pageInternal.length;
  }
  initNextPage(e) {
    this.init(this.nameInternal, e, this.paramsInternal);
  }
  /**
   * Returns the current page, which is a list of items.
   *
   * @remarks
   * The first page is retrieved when the pager is created. The returned list of
   * items could be a subset of the entire list.
   */
  get page() {
    return this.pageInternal;
  }
  /**
   * Returns the type of paged item (for example, ``batch_jobs``).
   */
  get name() {
    return this.nameInternal;
  }
  /**
   * Returns the length of the page fetched each time by this pager.
   *
   * @remarks
   * The number of items in the page is less than or equal to the page length.
   */
  get pageSize() {
    return this.pageInternalSize;
  }
  /**
   * Returns the headers of the API response.
   */
  get sdkHttpResponse() {
    return this.sdkHttpResponseInternal;
  }
  /**
   * Returns the parameters when making the API request for the next page.
   *
   * @remarks
   * Parameters contain a set of optional configs that can be
   * used to customize the API request. For example, the `pageToken` parameter
   * contains the token to request the next page.
   */
  get params() {
    return this.paramsInternal;
  }
  /**
   * Returns the total number of items in the current page.
   */
  get pageLength() {
    return this.pageInternal.length;
  }
  /**
   * Returns the item at the given index.
   */
  getItem(e) {
    return this.pageInternal[e];
  }
  /**
   * Returns an async iterator that support iterating through all items
   * retrieved from the API.
   *
   * @remarks
   * The iterator will automatically fetch the next page if there are more items
   * to fetch from the API.
   *
   * @example
   *
   * ```ts
   * const pager = await ai.files.list({config: {pageSize: 10}});
   * for await (const file of pager) {
   *   console.log(file.name);
   * }
   * ```
   */
  [Symbol.asyncIterator]() {
    return {
      next: async () => {
        if (this.idxInternal >= this.pageLength)
          if (this.hasNextPage())
            await this.nextPage();
          else
            return { value: void 0, done: !0 };
        const e = this.getItem(this.idxInternal);
        return this.idxInternal += 1, { value: e, done: !1 };
      },
      return: async () => ({ value: void 0, done: !0 })
    };
  }
  /**
   * Fetches the next page of items. This makes a new API request.
   *
   * @throws {Error} If there are no more pages to fetch.
   *
   * @example
   *
   * ```ts
   * const pager = await ai.files.list({config: {pageSize: 10}});
   * let page = pager.page;
   * while (true) {
   *   for (const file of page) {
   *     console.log(file.name);
   *   }
   *   if (!pager.hasNextPage()) {
   *     break;
   *   }
   *   page = await pager.nextPage();
   * }
   * ```
   */
  async nextPage() {
    if (!this.hasNextPage())
      throw new Error("No more pages to fetch.");
    const e = await this.requestInternal(this.params);
    return this.initNextPage(e), this.page;
  }
  /**
   * Returns true if there are more pages to fetch from the API.
   */
  hasNextPage() {
    var e;
    return ((e = this.params.config) === null || e === void 0 ? void 0 : e.pageToken) !== void 0;
  }
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class Jr extends Y {
  constructor(e) {
    super(), this.apiClient = e, this.list = async (t = {}) => new ne(W.PAGED_ITEM_BATCH_JOBS, (o) => this.listInternal(o), await this.listInternal(t), t), this.create = async (t) => (this.apiClient.isVertexAI() && (t.config = this.formatDestination(t.src, t.config)), this.createInternal(t)), this.createEmbeddings = async (t) => {
      if (console.warn("batches.createEmbeddings() is experimental and may change without notice."), this.apiClient.isVertexAI())
        throw new Error("Vertex AI does not support batches.createEmbeddings.");
      return this.createEmbeddingsInternal(t);
    };
  }
  // Helper function to handle inlined generate content requests
  createInlinedGenerateContentRequest(e) {
    const t = kt(
      this.apiClient,
      // Use instance apiClient
      e
    ), o = t._url, r = I("{model}:batchGenerateContent", o), u = t.batch.inputConfig.requests, f = u.requests, d = [];
    for (const c of f) {
      const m = Object.assign({}, c);
      if (m.systemInstruction) {
        const p = m.systemInstruction;
        delete m.systemInstruction;
        const h = m.request;
        h.systemInstruction = p, m.request = h;
      }
      d.push(m);
    }
    return u.requests = d, delete t.config, delete t._url, delete t._query, { path: r, body: t };
  }
  // Helper function to get the first GCS URI
  getGcsUri(e) {
    if (typeof e == "string")
      return e.startsWith("gs://") ? e : void 0;
    if (!Array.isArray(e) && e.gcsUri && e.gcsUri.length > 0)
      return e.gcsUri[0];
  }
  // Helper function to get the BigQuery URI
  getBigqueryUri(e) {
    if (typeof e == "string")
      return e.startsWith("bq://") ? e : void 0;
    if (!Array.isArray(e))
      return e.bigqueryUri;
  }
  // Function to format the destination configuration for Vertex AI
  formatDestination(e, t) {
    const o = t ? Object.assign({}, t) : {}, r = Date.now().toString();
    if (o.displayName || (o.displayName = `genaiBatchJob_${r}`), o.dest === void 0) {
      const l = this.getGcsUri(e), a = this.getBigqueryUri(e);
      if (l)
        l.endsWith(".jsonl") ? o.dest = `${l.slice(0, -6)}/dest` : o.dest = `${l}_dest_${r}`;
      else if (a)
        o.dest = `${a}_dest_${r}`;
      else
        throw new Error("Unsupported source for Vertex AI: No GCS or BigQuery URI found.");
    }
    return o;
  }
  /**
   * Internal method to create batch job.
   *
   * @param params - The parameters for create batch job request.
   * @return The created batch job.
   *
   */
  async createInternal(e) {
    var t, o, r, l;
    let a, u = "", f = {};
    if (this.apiClient.isVertexAI()) {
      const d = fr(this.apiClient, e);
      return u = I("batchPredictionJobs", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "POST",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((c) => c.json()), a.then((c) => Ye(c));
    } else {
      const d = kt(this.apiClient, e);
      return u = I("{model}:batchGenerateContent", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "POST",
        httpOptions: (r = e.config) === null || r === void 0 ? void 0 : r.httpOptions,
        abortSignal: (l = e.config) === null || l === void 0 ? void 0 : l.abortSignal
      }).then((c) => c.json()), a.then((c) => _e(c));
    }
  }
  /**
   * Internal method to create batch job.
   *
   * @param params - The parameters for create batch job request.
   * @return The created batch job.
   *
   */
  async createEmbeddingsInternal(e) {
    var t, o;
    let r, l = "", a = {};
    if (this.apiClient.isVertexAI())
      throw new Error("This method is only supported by the Gemini Developer API.");
    {
      const u = pr(this.apiClient, e);
      return l = I("{model}:asyncBatchEmbedContent", u._url), a = u._query, delete u._url, delete u._query, r = this.apiClient.request({
        path: l,
        queryParams: a,
        body: JSON.stringify(u),
        httpMethod: "POST",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((f) => f.json()), r.then((f) => _e(f));
    }
  }
  /**
   * Gets batch job configurations.
   *
   * @param params - The parameters for the get request.
   * @return The batch job.
   *
   * @example
   * ```ts
   * await ai.batches.get({name: '...'}); // The server-generated resource name.
   * ```
   */
  async get(e) {
    var t, o, r, l;
    let a, u = "", f = {};
    if (this.apiClient.isVertexAI()) {
      const d = Pr(this.apiClient, e);
      return u = I("batchPredictionJobs/{name}", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "GET",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((c) => c.json()), a.then((c) => Ye(c));
    } else {
      const d = Rr(this.apiClient, e);
      return u = I("batches/{name}", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "GET",
        httpOptions: (r = e.config) === null || r === void 0 ? void 0 : r.httpOptions,
        abortSignal: (l = e.config) === null || l === void 0 ? void 0 : l.abortSignal
      }).then((c) => c.json()), a.then((c) => _e(c));
    }
  }
  /**
   * Cancels a batch job.
   *
   * @param params - The parameters for the cancel request.
   * @return The empty response returned by the API.
   *
   * @example
   * ```ts
   * await ai.batches.cancel({name: '...'}); // The server-generated resource name.
   * ```
   */
  async cancel(e) {
    var t, o, r, l;
    let a = "", u = {};
    if (this.apiClient.isVertexAI()) {
      const f = sr(this.apiClient, e);
      a = I("batchPredictionJobs/{name}:cancel", f._url), u = f._query, delete f._url, delete f._query, await this.apiClient.request({
        path: a,
        queryParams: u,
        body: JSON.stringify(f),
        httpMethod: "POST",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      });
    } else {
      const f = rr(this.apiClient, e);
      a = I("batches/{name}:cancel", f._url), u = f._query, delete f._url, delete f._query, await this.apiClient.request({
        path: a,
        queryParams: u,
        body: JSON.stringify(f),
        httpMethod: "POST",
        httpOptions: (r = e.config) === null || r === void 0 ? void 0 : r.httpOptions,
        abortSignal: (l = e.config) === null || l === void 0 ? void 0 : l.abortSignal
      });
    }
  }
  async listInternal(e) {
    var t, o, r, l;
    let a, u = "", f = {};
    if (this.apiClient.isVertexAI()) {
      const d = Gr(e);
      return u = I("batchPredictionJobs", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "GET",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((c) => c.json().then((m) => {
        const p = m;
        return p.sdkHttpResponse = {
          headers: c.headers
        }, p;
      })), a.then((c) => {
        const m = Vr(c), p = new Dt();
        return Object.assign(p, m), p;
      });
    } else {
      const d = kr(e);
      return u = I("batches", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "GET",
        httpOptions: (r = e.config) === null || r === void 0 ? void 0 : r.httpOptions,
        abortSignal: (l = e.config) === null || l === void 0 ? void 0 : l.abortSignal
      }).then((c) => c.json().then((m) => {
        const p = m;
        return p.sdkHttpResponse = {
          headers: c.headers
        }, p;
      })), a.then((c) => {
        const m = Fr(c), p = new Dt();
        return Object.assign(p, m), p;
      });
    }
  }
  /**
   * Deletes a batch job.
   *
   * @param params - The parameters for the delete request.
   * @return The empty response returned by the API.
   *
   * @example
   * ```ts
   * await ai.batches.delete({name: '...'}); // The server-generated resource name.
   * ```
   */
  async delete(e) {
    var t, o, r, l;
    let a, u = "", f = {};
    if (this.apiClient.isVertexAI()) {
      const d = hr(this.apiClient, e);
      return u = I("batchPredictionJobs/{name}", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "DELETE",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((c) => c.json().then((m) => {
        const p = m;
        return p.sdkHttpResponse = {
          headers: c.headers
        }, p;
      })), a.then((c) => yr(c));
    } else {
      const d = mr(this.apiClient, e);
      return u = I("batches/{name}", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "DELETE",
        httpOptions: (r = e.config) === null || r === void 0 ? void 0 : r.httpOptions,
        abortSignal: (l = e.config) === null || l === void 0 ? void 0 : l.abortSignal
      }).then((c) => c.json().then((m) => {
        const p = m;
        return p.sdkHttpResponse = {
          headers: c.headers
        }, p;
      })), a.then((c) => gr(c));
    }
  }
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function $r(n) {
  const e = {}, t = i(n, ["apiKey"]);
  if (t != null && s(e, ["apiKey"], t), i(n, ["apiKeyConfig"]) !== void 0)
    throw new Error("apiKeyConfig parameter is not supported in Gemini API.");
  if (i(n, ["authType"]) !== void 0)
    throw new Error("authType parameter is not supported in Gemini API.");
  if (i(n, ["googleServiceAccountConfig"]) !== void 0)
    throw new Error("googleServiceAccountConfig parameter is not supported in Gemini API.");
  if (i(n, ["httpBasicAuthConfig"]) !== void 0)
    throw new Error("httpBasicAuthConfig parameter is not supported in Gemini API.");
  if (i(n, ["oauthConfig"]) !== void 0)
    throw new Error("oauthConfig parameter is not supported in Gemini API.");
  if (i(n, ["oidcConfig"]) !== void 0)
    throw new Error("oidcConfig parameter is not supported in Gemini API.");
  return e;
}
function Kr(n) {
  const e = {}, t = i(n, ["data"]);
  if (t != null && s(e, ["data"], t), i(n, ["displayName"]) !== void 0)
    throw new Error("displayName parameter is not supported in Gemini API.");
  const o = i(n, ["mimeType"]);
  return o != null && s(e, ["mimeType"], o), e;
}
function Gt(n) {
  const e = {}, t = i(n, ["parts"]);
  if (t != null) {
    let r = t;
    Array.isArray(r) && (r = r.map((l) => ms(l))), s(e, ["parts"], r);
  }
  const o = i(n, ["role"]);
  return o != null && s(e, ["role"], o), e;
}
function Or(n, e) {
  const t = {}, o = i(n, ["ttl"]);
  e !== void 0 && o != null && s(e, ["ttl"], o);
  const r = i(n, ["expireTime"]);
  e !== void 0 && r != null && s(e, ["expireTime"], r);
  const l = i(n, ["displayName"]);
  e !== void 0 && l != null && s(e, ["displayName"], l);
  const a = i(n, ["contents"]);
  if (e !== void 0 && a != null) {
    let c = H(a);
    Array.isArray(c) && (c = c.map((m) => Gt(m))), s(e, ["contents"], c);
  }
  const u = i(n, [
    "systemInstruction"
  ]);
  e !== void 0 && u != null && s(e, ["systemInstruction"], Gt(k(u)));
  const f = i(n, ["tools"]);
  if (e !== void 0 && f != null) {
    let c = f;
    Array.isArray(c) && (c = c.map((m) => gs(m))), s(e, ["tools"], c);
  }
  const d = i(n, ["toolConfig"]);
  if (e !== void 0 && d != null && s(e, ["toolConfig"], hs(d)), i(n, ["kmsKeyName"]) !== void 0)
    throw new Error("kmsKeyName parameter is not supported in Gemini API.");
  return t;
}
function Wr(n, e) {
  const t = {}, o = i(n, ["ttl"]);
  e !== void 0 && o != null && s(e, ["ttl"], o);
  const r = i(n, ["expireTime"]);
  e !== void 0 && r != null && s(e, ["expireTime"], r);
  const l = i(n, ["displayName"]);
  e !== void 0 && l != null && s(e, ["displayName"], l);
  const a = i(n, ["contents"]);
  if (e !== void 0 && a != null) {
    let m = H(a);
    Array.isArray(m) && (m = m.map((p) => p)), s(e, ["contents"], m);
  }
  const u = i(n, [
    "systemInstruction"
  ]);
  e !== void 0 && u != null && s(e, ["systemInstruction"], k(u));
  const f = i(n, ["tools"]);
  if (e !== void 0 && f != null) {
    let m = f;
    Array.isArray(m) && (m = m.map((p) => ys(p))), s(e, ["tools"], m);
  }
  const d = i(n, ["toolConfig"]);
  e !== void 0 && d != null && s(e, ["toolConfig"], d);
  const c = i(n, ["kmsKeyName"]);
  return e !== void 0 && c != null && s(e, ["encryption_spec", "kmsKeyName"], c), t;
}
function Yr(n, e) {
  const t = {}, o = i(e, ["model"]);
  o != null && s(t, ["model"], ro(n, o));
  const r = i(e, ["config"]);
  return r != null && Or(r, t), t;
}
function zr(n, e) {
  const t = {}, o = i(e, ["model"]);
  o != null && s(t, ["model"], ro(n, o));
  const r = i(e, ["config"]);
  return r != null && Wr(r, t), t;
}
function Qr(n, e) {
  const t = {}, o = i(e, ["name"]);
  return o != null && s(t, ["_url", "name"], z(n, o)), t;
}
function Xr(n, e) {
  const t = {}, o = i(e, ["name"]);
  return o != null && s(t, ["_url", "name"], z(n, o)), t;
}
function Zr(n) {
  const e = {}, t = i(n, [
    "sdkHttpResponse"
  ]);
  return t != null && s(e, ["sdkHttpResponse"], t), e;
}
function jr(n) {
  const e = {}, t = i(n, [
    "sdkHttpResponse"
  ]);
  return t != null && s(e, ["sdkHttpResponse"], t), e;
}
function es(n) {
  const e = {};
  if (i(n, ["displayName"]) !== void 0)
    throw new Error("displayName parameter is not supported in Gemini API.");
  const t = i(n, ["fileUri"]);
  t != null && s(e, ["fileUri"], t);
  const o = i(n, ["mimeType"]);
  return o != null && s(e, ["mimeType"], o), e;
}
function ns(n) {
  const e = {}, t = i(n, ["id"]);
  t != null && s(e, ["id"], t);
  const o = i(n, ["args"]);
  o != null && s(e, ["args"], o);
  const r = i(n, ["name"]);
  if (r != null && s(e, ["name"], r), i(n, ["partialArgs"]) !== void 0)
    throw new Error("partialArgs parameter is not supported in Gemini API.");
  if (i(n, ["willContinue"]) !== void 0)
    throw new Error("willContinue parameter is not supported in Gemini API.");
  return e;
}
function ts(n) {
  const e = {}, t = i(n, [
    "allowedFunctionNames"
  ]);
  t != null && s(e, ["allowedFunctionNames"], t);
  const o = i(n, ["mode"]);
  if (o != null && s(e, ["mode"], o), i(n, ["streamFunctionCallArguments"]) !== void 0)
    throw new Error("streamFunctionCallArguments parameter is not supported in Gemini API.");
  return e;
}
function os(n) {
  const e = {}, t = i(n, ["description"]);
  t != null && s(e, ["description"], t);
  const o = i(n, ["name"]);
  o != null && s(e, ["name"], o);
  const r = i(n, ["parameters"]);
  r != null && s(e, ["parameters"], r);
  const l = i(n, [
    "parametersJsonSchema"
  ]);
  l != null && s(e, ["parametersJsonSchema"], l);
  const a = i(n, ["response"]);
  a != null && s(e, ["response"], a);
  const u = i(n, [
    "responseJsonSchema"
  ]);
  if (u != null && s(e, ["responseJsonSchema"], u), i(n, ["behavior"]) !== void 0)
    throw new Error("behavior parameter is not supported in Vertex AI.");
  return e;
}
function is(n, e) {
  const t = {}, o = i(e, ["name"]);
  return o != null && s(t, ["_url", "name"], z(n, o)), t;
}
function rs(n, e) {
  const t = {}, o = i(e, ["name"]);
  return o != null && s(t, ["_url", "name"], z(n, o)), t;
}
function ss(n) {
  const e = {}, t = i(n, ["authConfig"]);
  t != null && s(e, ["authConfig"], $r(t));
  const o = i(n, ["enableWidget"]);
  return o != null && s(e, ["enableWidget"], o), e;
}
function ls(n) {
  const e = {}, t = i(n, ["searchTypes"]);
  if (t != null && s(e, ["searchTypes"], t), i(n, ["blockingConfidence"]) !== void 0)
    throw new Error("blockingConfidence parameter is not supported in Gemini API.");
  if (i(n, ["excludeDomains"]) !== void 0)
    throw new Error("excludeDomains parameter is not supported in Gemini API.");
  const o = i(n, [
    "timeRangeFilter"
  ]);
  return o != null && s(e, ["timeRangeFilter"], o), e;
}
function as(n, e) {
  const t = {}, o = i(n, ["pageSize"]);
  e !== void 0 && o != null && s(e, ["_query", "pageSize"], o);
  const r = i(n, ["pageToken"]);
  return e !== void 0 && r != null && s(e, ["_query", "pageToken"], r), t;
}
function us(n, e) {
  const t = {}, o = i(n, ["pageSize"]);
  e !== void 0 && o != null && s(e, ["_query", "pageSize"], o);
  const r = i(n, ["pageToken"]);
  return e !== void 0 && r != null && s(e, ["_query", "pageToken"], r), t;
}
function ds(n) {
  const e = {}, t = i(n, ["config"]);
  return t != null && as(t, e), e;
}
function fs(n) {
  const e = {}, t = i(n, ["config"]);
  return t != null && us(t, e), e;
}
function cs(n) {
  const e = {}, t = i(n, [
    "sdkHttpResponse"
  ]);
  t != null && s(e, ["sdkHttpResponse"], t);
  const o = i(n, [
    "nextPageToken"
  ]);
  o != null && s(e, ["nextPageToken"], o);
  const r = i(n, [
    "cachedContents"
  ]);
  if (r != null) {
    let l = r;
    Array.isArray(l) && (l = l.map((a) => a)), s(e, ["cachedContents"], l);
  }
  return e;
}
function ps(n) {
  const e = {}, t = i(n, [
    "sdkHttpResponse"
  ]);
  t != null && s(e, ["sdkHttpResponse"], t);
  const o = i(n, [
    "nextPageToken"
  ]);
  o != null && s(e, ["nextPageToken"], o);
  const r = i(n, [
    "cachedContents"
  ]);
  if (r != null) {
    let l = r;
    Array.isArray(l) && (l = l.map((a) => a)), s(e, ["cachedContents"], l);
  }
  return e;
}
function ms(n) {
  const e = {}, t = i(n, [
    "mediaResolution"
  ]);
  t != null && s(e, ["mediaResolution"], t);
  const o = i(n, [
    "codeExecutionResult"
  ]);
  o != null && s(e, ["codeExecutionResult"], o);
  const r = i(n, [
    "executableCode"
  ]);
  r != null && s(e, ["executableCode"], r);
  const l = i(n, ["fileData"]);
  l != null && s(e, ["fileData"], es(l));
  const a = i(n, ["functionCall"]);
  a != null && s(e, ["functionCall"], ns(a));
  const u = i(n, [
    "functionResponse"
  ]);
  u != null && s(e, ["functionResponse"], u);
  const f = i(n, ["inlineData"]);
  f != null && s(e, ["inlineData"], Kr(f));
  const d = i(n, ["text"]);
  d != null && s(e, ["text"], d);
  const c = i(n, ["thought"]);
  c != null && s(e, ["thought"], c);
  const m = i(n, [
    "thoughtSignature"
  ]);
  m != null && s(e, ["thoughtSignature"], m);
  const p = i(n, [
    "videoMetadata"
  ]);
  return p != null && s(e, ["videoMetadata"], p), e;
}
function hs(n) {
  const e = {}, t = i(n, [
    "retrievalConfig"
  ]);
  t != null && s(e, ["retrievalConfig"], t);
  const o = i(n, [
    "functionCallingConfig"
  ]);
  return o != null && s(e, ["functionCallingConfig"], ts(o)), e;
}
function gs(n) {
  const e = {};
  if (i(n, ["retrieval"]) !== void 0)
    throw new Error("retrieval parameter is not supported in Gemini API.");
  const t = i(n, ["computerUse"]);
  t != null && s(e, ["computerUse"], t);
  const o = i(n, ["fileSearch"]);
  o != null && s(e, ["fileSearch"], o);
  const r = i(n, ["googleSearch"]);
  r != null && s(e, ["googleSearch"], ls(r));
  const l = i(n, ["googleMaps"]);
  l != null && s(e, ["googleMaps"], ss(l));
  const a = i(n, [
    "codeExecution"
  ]);
  if (a != null && s(e, ["codeExecution"], a), i(n, ["enterpriseWebSearch"]) !== void 0)
    throw new Error("enterpriseWebSearch parameter is not supported in Gemini API.");
  const u = i(n, [
    "functionDeclarations"
  ]);
  if (u != null) {
    let m = u;
    Array.isArray(m) && (m = m.map((p) => p)), s(e, ["functionDeclarations"], m);
  }
  const f = i(n, [
    "googleSearchRetrieval"
  ]);
  if (f != null && s(e, ["googleSearchRetrieval"], f), i(n, ["parallelAiSearch"]) !== void 0)
    throw new Error("parallelAiSearch parameter is not supported in Gemini API.");
  const d = i(n, ["urlContext"]);
  d != null && s(e, ["urlContext"], d);
  const c = i(n, ["mcpServers"]);
  if (c != null) {
    let m = c;
    Array.isArray(m) && (m = m.map((p) => p)), s(e, ["mcpServers"], m);
  }
  return e;
}
function ys(n) {
  const e = {}, t = i(n, ["retrieval"]);
  t != null && s(e, ["retrieval"], t);
  const o = i(n, ["computerUse"]);
  if (o != null && s(e, ["computerUse"], o), i(n, ["fileSearch"]) !== void 0)
    throw new Error("fileSearch parameter is not supported in Vertex AI.");
  const r = i(n, ["googleSearch"]);
  r != null && s(e, ["googleSearch"], r);
  const l = i(n, ["googleMaps"]);
  l != null && s(e, ["googleMaps"], l);
  const a = i(n, [
    "codeExecution"
  ]);
  a != null && s(e, ["codeExecution"], a);
  const u = i(n, [
    "enterpriseWebSearch"
  ]);
  u != null && s(e, ["enterpriseWebSearch"], u);
  const f = i(n, [
    "functionDeclarations"
  ]);
  if (f != null) {
    let p = f;
    Array.isArray(p) && (p = p.map((h) => os(h))), s(e, ["functionDeclarations"], p);
  }
  const d = i(n, [
    "googleSearchRetrieval"
  ]);
  d != null && s(e, ["googleSearchRetrieval"], d);
  const c = i(n, [
    "parallelAiSearch"
  ]);
  c != null && s(e, ["parallelAiSearch"], c);
  const m = i(n, ["urlContext"]);
  if (m != null && s(e, ["urlContext"], m), i(n, ["mcpServers"]) !== void 0)
    throw new Error("mcpServers parameter is not supported in Vertex AI.");
  return e;
}
function Ts(n, e) {
  const t = {}, o = i(n, ["ttl"]);
  e !== void 0 && o != null && s(e, ["ttl"], o);
  const r = i(n, ["expireTime"]);
  return e !== void 0 && r != null && s(e, ["expireTime"], r), t;
}
function _s(n, e) {
  const t = {}, o = i(n, ["ttl"]);
  e !== void 0 && o != null && s(e, ["ttl"], o);
  const r = i(n, ["expireTime"]);
  return e !== void 0 && r != null && s(e, ["expireTime"], r), t;
}
function Es(n, e) {
  const t = {}, o = i(e, ["name"]);
  o != null && s(t, ["_url", "name"], z(n, o));
  const r = i(e, ["config"]);
  return r != null && Ts(r, t), t;
}
function Cs(n, e) {
  const t = {}, o = i(e, ["name"]);
  o != null && s(t, ["_url", "name"], z(n, o));
  const r = i(e, ["config"]);
  return r != null && _s(r, t), t;
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class Is extends Y {
  constructor(e) {
    super(), this.apiClient = e, this.list = async (t = {}) => new ne(W.PAGED_ITEM_CACHED_CONTENTS, (o) => this.listInternal(o), await this.listInternal(t), t);
  }
  /**
   * Creates a cached contents resource.
   *
   * @remarks
   * Context caching is only supported for specific models. See [Gemini
   * Developer API reference](https://ai.google.dev/gemini-api/docs/caching?lang=node/context-cac)
   * and [Vertex AI reference](https://cloud.google.com/vertex-ai/generative-ai/docs/context-cache/context-cache-overview#supported_models)
   * for more information.
   *
   * @param params - The parameters for the create request.
   * @return The created cached content.
   *
   * @example
   * ```ts
   * const contents = ...; // Initialize the content to cache.
   * const response = await ai.caches.create({
   *   model: 'gemini-2.0-flash-001',
   *   config: {
   *    'contents': contents,
   *    'displayName': 'test cache',
   *    'systemInstruction': 'What is the sum of the two pdfs?',
   *    'ttl': '86400s',
   *  }
   * });
   * ```
   */
  async create(e) {
    var t, o, r, l;
    let a, u = "", f = {};
    if (this.apiClient.isVertexAI()) {
      const d = zr(this.apiClient, e);
      return u = I("cachedContents", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "POST",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((c) => c.json()), a.then((c) => c);
    } else {
      const d = Yr(this.apiClient, e);
      return u = I("cachedContents", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "POST",
        httpOptions: (r = e.config) === null || r === void 0 ? void 0 : r.httpOptions,
        abortSignal: (l = e.config) === null || l === void 0 ? void 0 : l.abortSignal
      }).then((c) => c.json()), a.then((c) => c);
    }
  }
  /**
   * Gets cached content configurations.
   *
   * @param params - The parameters for the get request.
   * @return The cached content.
   *
   * @example
   * ```ts
   * await ai.caches.get({name: '...'}); // The server-generated resource name.
   * ```
   */
  async get(e) {
    var t, o, r, l;
    let a, u = "", f = {};
    if (this.apiClient.isVertexAI()) {
      const d = rs(this.apiClient, e);
      return u = I("{name}", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "GET",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((c) => c.json()), a.then((c) => c);
    } else {
      const d = is(this.apiClient, e);
      return u = I("{name}", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "GET",
        httpOptions: (r = e.config) === null || r === void 0 ? void 0 : r.httpOptions,
        abortSignal: (l = e.config) === null || l === void 0 ? void 0 : l.abortSignal
      }).then((c) => c.json()), a.then((c) => c);
    }
  }
  /**
   * Deletes cached content.
   *
   * @param params - The parameters for the delete request.
   * @return The empty response returned by the API.
   *
   * @example
   * ```ts
   * await ai.caches.delete({name: '...'}); // The server-generated resource name.
   * ```
   */
  async delete(e) {
    var t, o, r, l;
    let a, u = "", f = {};
    if (this.apiClient.isVertexAI()) {
      const d = Xr(this.apiClient, e);
      return u = I("{name}", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "DELETE",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((c) => c.json().then((m) => {
        const p = m;
        return p.sdkHttpResponse = {
          headers: c.headers
        }, p;
      })), a.then((c) => {
        const m = jr(c), p = new Mt();
        return Object.assign(p, m), p;
      });
    } else {
      const d = Qr(this.apiClient, e);
      return u = I("{name}", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "DELETE",
        httpOptions: (r = e.config) === null || r === void 0 ? void 0 : r.httpOptions,
        abortSignal: (l = e.config) === null || l === void 0 ? void 0 : l.abortSignal
      }).then((c) => c.json().then((m) => {
        const p = m;
        return p.sdkHttpResponse = {
          headers: c.headers
        }, p;
      })), a.then((c) => {
        const m = Zr(c), p = new Mt();
        return Object.assign(p, m), p;
      });
    }
  }
  /**
   * Updates cached content configurations.
   *
   * @param params - The parameters for the update request.
   * @return The updated cached content.
   *
   * @example
   * ```ts
   * const response = await ai.caches.update({
   *   name: '...',  // The server-generated resource name.
   *   config: {'ttl': '7600s'}
   * });
   * ```
   */
  async update(e) {
    var t, o, r, l;
    let a, u = "", f = {};
    if (this.apiClient.isVertexAI()) {
      const d = Cs(this.apiClient, e);
      return u = I("{name}", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "PATCH",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((c) => c.json()), a.then((c) => c);
    } else {
      const d = Es(this.apiClient, e);
      return u = I("{name}", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "PATCH",
        httpOptions: (r = e.config) === null || r === void 0 ? void 0 : r.httpOptions,
        abortSignal: (l = e.config) === null || l === void 0 ? void 0 : l.abortSignal
      }).then((c) => c.json()), a.then((c) => c);
    }
  }
  async listInternal(e) {
    var t, o, r, l;
    let a, u = "", f = {};
    if (this.apiClient.isVertexAI()) {
      const d = fs(e);
      return u = I("cachedContents", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "GET",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((c) => c.json().then((m) => {
        const p = m;
        return p.sdkHttpResponse = {
          headers: c.headers
        }, p;
      })), a.then((c) => {
        const m = ps(c), p = new Nt();
        return Object.assign(p, m), p;
      });
    } else {
      const d = ds(e);
      return u = I("cachedContents", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "GET",
        httpOptions: (r = e.config) === null || r === void 0 ? void 0 : r.httpOptions,
        abortSignal: (l = e.config) === null || l === void 0 ? void 0 : l.abortSignal
      }).then((c) => c.json().then((m) => {
        const p = m;
        return p.sdkHttpResponse = {
          headers: c.headers
        }, p;
      })), a.then((c) => {
        const m = cs(c), p = new Nt();
        return Object.assign(p, m), p;
      });
    }
  }
}
function ve(n, e) {
  var t = {};
  for (var o in n) Object.prototype.hasOwnProperty.call(n, o) && e.indexOf(o) < 0 && (t[o] = n[o]);
  if (n != null && typeof Object.getOwnPropertySymbols == "function")
    for (var r = 0, o = Object.getOwnPropertySymbols(n); r < o.length; r++)
      e.indexOf(o[r]) < 0 && Object.prototype.propertyIsEnumerable.call(n, o[r]) && (t[o[r]] = n[o[r]]);
  return t;
}
function Ft(n) {
  var e = typeof Symbol == "function" && Symbol.iterator, t = e && n[e], o = 0;
  if (t) return t.call(n);
  if (n && typeof n.length == "number") return {
    next: function() {
      return n && o >= n.length && (n = void 0), { value: n && n[o++], done: !n };
    }
  };
  throw new TypeError(e ? "Object is not iterable." : "Symbol.iterator is not defined.");
}
function P(n) {
  return this instanceof P ? (this.v = n, this) : new P(n);
}
function b(n, e, t) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var o = t.apply(n, e || []), r, l = [];
  return r = Object.create((typeof AsyncIterator == "function" ? AsyncIterator : Object).prototype), u("next"), u("throw"), u("return", a), r[Symbol.asyncIterator] = function() {
    return this;
  }, r;
  function a(h) {
    return function(g) {
      return Promise.resolve(g).then(h, m);
    };
  }
  function u(h, g) {
    o[h] && (r[h] = function(T) {
      return new Promise(function(y, _) {
        l.push([h, T, y, _]) > 1 || f(h, T);
      });
    }, g && (r[h] = g(r[h])));
  }
  function f(h, g) {
    try {
      d(o[h](g));
    } catch (T) {
      p(l[0][3], T);
    }
  }
  function d(h) {
    h.value instanceof P ? Promise.resolve(h.value.v).then(c, m) : p(l[0][2], h);
  }
  function c(h) {
    f("next", h);
  }
  function m(h) {
    f("throw", h);
  }
  function p(h, g) {
    h(g), l.shift(), l.length && f(l[0][0], l[0][1]);
  }
}
function J(n) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var e = n[Symbol.asyncIterator], t;
  return e ? e.call(n) : (n = typeof Ft == "function" ? Ft(n) : n[Symbol.iterator](), t = {}, o("next"), o("throw"), o("return"), t[Symbol.asyncIterator] = function() {
    return this;
  }, t);
  function o(l) {
    t[l] = n[l] && function(a) {
      return new Promise(function(u, f) {
        a = n[l](a), r(u, f, a.done, a.value);
      });
    };
  }
  function r(l, a, u, f) {
    Promise.resolve(f).then(function(d) {
      l({ value: d, done: u });
    }, a);
  }
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function Ss(n) {
  var e;
  if (n.candidates == null || n.candidates.length === 0)
    return !1;
  const t = (e = n.candidates[0]) === null || e === void 0 ? void 0 : e.content;
  return t === void 0 ? !1 : _o(t);
}
function _o(n) {
  if (n.parts === void 0 || n.parts.length === 0)
    return !1;
  for (const e of n.parts)
    if (e === void 0 || Object.keys(e).length === 0)
      return !1;
  return !0;
}
function As(n) {
  if (n.length !== 0) {
    for (const e of n)
      if (e.role !== "user" && e.role !== "model")
        throw new Error(`Role must be user or model, but got ${e.role}.`);
  }
}
function Vt(n) {
  if (n === void 0 || n.length === 0)
    return [];
  const e = [], t = n.length;
  let o = 0;
  for (; o < t; )
    if (n[o].role === "user")
      e.push(n[o]), o++;
    else {
      const r = [];
      let l = !0;
      for (; o < t && n[o].role === "model"; )
        r.push(n[o]), l && !_o(n[o]) && (l = !1), o++;
      l ? e.push(...r) : e.pop();
    }
  return e;
}
class vs {
  constructor(e, t) {
    this.modelsModule = e, this.apiClient = t;
  }
  /**
   * Creates a new chat session.
   *
   * @remarks
   * The config in the params will be used for all requests within the chat
   * session unless overridden by a per-request `config` in
   * @see {@link types.SendMessageParameters#config}.
   *
   * @param params - Parameters for creating a chat session.
   * @returns A new chat session.
   *
   * @example
   * ```ts
   * const chat = ai.chats.create({
   *   model: 'gemini-2.0-flash'
   *   config: {
   *     temperature: 0.5,
   *     maxOutputTokens: 1024,
   *   }
   * });
   * ```
   */
  create(e) {
    return new Rs(
      this.apiClient,
      this.modelsModule,
      e.model,
      e.config,
      // Deep copy the history to avoid mutating the history outside of the
      // chat session.
      structuredClone(e.history)
    );
  }
}
class Rs {
  constructor(e, t, o, r = {}, l = []) {
    this.apiClient = e, this.modelsModule = t, this.model = o, this.config = r, this.history = l, this.sendPromise = Promise.resolve(), As(l);
  }
  /**
   * Sends a message to the model and returns the response.
   *
   * @remarks
   * This method will wait for the previous message to be processed before
   * sending the next message.
   *
   * @see {@link Chat#sendMessageStream} for streaming method.
   * @param params - parameters for sending messages within a chat session.
   * @returns The model's response.
   *
   * @example
   * ```ts
   * const chat = ai.chats.create({model: 'gemini-2.0-flash'});
   * const response = await chat.sendMessage({
   *   message: 'Why is the sky blue?'
   * });
   * console.log(response.text);
   * ```
   */
  async sendMessage(e) {
    var t;
    await this.sendPromise;
    const o = k(e.message), r = this.modelsModule.generateContent({
      model: this.model,
      contents: this.getHistory(!0).concat(o),
      config: (t = e.config) !== null && t !== void 0 ? t : this.config
    });
    return this.sendPromise = (async () => {
      var l, a, u;
      const f = await r, d = (a = (l = f.candidates) === null || l === void 0 ? void 0 : l[0]) === null || a === void 0 ? void 0 : a.content, c = f.automaticFunctionCallingHistory, m = this.getHistory(!0).length;
      let p = [];
      c != null && (p = (u = c.slice(m)) !== null && u !== void 0 ? u : []);
      const h = d ? [d] : [];
      this.recordHistory(o, h, p);
    })(), await this.sendPromise.catch(() => {
      this.sendPromise = Promise.resolve();
    }), r;
  }
  /**
   * Sends a message to the model and returns the response in chunks.
   *
   * @remarks
   * This method will wait for the previous message to be processed before
   * sending the next message.
   *
   * @see {@link Chat#sendMessage} for non-streaming method.
   * @param params - parameters for sending the message.
   * @return The model's response.
   *
   * @example
   * ```ts
   * const chat = ai.chats.create({model: 'gemini-2.0-flash'});
   * const response = await chat.sendMessageStream({
   *   message: 'Why is the sky blue?'
   * });
   * for await (const chunk of response) {
   *   console.log(chunk.text);
   * }
   * ```
   */
  async sendMessageStream(e) {
    var t;
    await this.sendPromise;
    const o = k(e.message), r = this.modelsModule.generateContentStream({
      model: this.model,
      contents: this.getHistory(!0).concat(o),
      config: (t = e.config) !== null && t !== void 0 ? t : this.config
    });
    this.sendPromise = r.then(() => {
    }).catch(() => {
    });
    const l = await r;
    return this.processStreamResponse(l, o);
  }
  /**
   * Returns the chat history.
   *
   * @remarks
   * The history is a list of contents alternating between user and model.
   *
   * There are two types of history:
   * - The `curated history` contains only the valid turns between user and
   * model, which will be included in the subsequent requests sent to the model.
   * - The `comprehensive history` contains all turns, including invalid or
   *   empty model outputs, providing a complete record of the history.
   *
   * The history is updated after receiving the response from the model,
   * for streaming response, it means receiving the last chunk of the response.
   *
   * The `comprehensive history` is returned by default. To get the `curated
   * history`, set the `curated` parameter to `true`.
   *
   * @param curated - whether to return the curated history or the comprehensive
   *     history.
   * @return History contents alternating between user and model for the entire
   *     chat session.
   */
  getHistory(e = !1) {
    const t = e ? Vt(this.history) : this.history;
    return structuredClone(t);
  }
  processStreamResponse(e, t) {
    return b(this, arguments, function* () {
      var r, l, a, u, f, d;
      const c = [];
      try {
        for (var m = !0, p = J(e), h; h = yield P(p.next()), r = h.done, !r; m = !0) {
          u = h.value, m = !1;
          const g = u;
          if (Ss(g)) {
            const T = (d = (f = g.candidates) === null || f === void 0 ? void 0 : f[0]) === null || d === void 0 ? void 0 : d.content;
            T !== void 0 && c.push(T);
          }
          yield yield P(g);
        }
      } catch (g) {
        l = { error: g };
      } finally {
        try {
          !m && !r && (a = p.return) && (yield P(a.call(p)));
        } finally {
          if (l) throw l.error;
        }
      }
      this.recordHistory(t, c);
    });
  }
  recordHistory(e, t, o) {
    let r = [];
    t.length > 0 && t.every((l) => l.role !== void 0) ? r = t : r.push({
      role: "model",
      parts: []
    }), o && o.length > 0 ? this.history.push(...Vt(o)) : this.history.push(e), this.history.push(...r);
  }
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class we extends Error {
  constructor(e) {
    super(e.message), this.name = "ApiError", this.status = e.status, Object.setPrototypeOf(this, we.prototype);
  }
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function Ps(n) {
  const e = {}, t = i(n, ["file"]);
  return t != null && s(e, ["file"], t), e;
}
function ws(n) {
  const e = {}, t = i(n, [
    "sdkHttpResponse"
  ]);
  return t != null && s(e, ["sdkHttpResponse"], t), e;
}
function Ms(n) {
  const e = {}, t = i(n, ["name"]);
  return t != null && s(e, ["_url", "file"], co(t)), e;
}
function Ns(n) {
  const e = {}, t = i(n, [
    "sdkHttpResponse"
  ]);
  return t != null && s(e, ["sdkHttpResponse"], t), e;
}
function Ds(n) {
  const e = {}, t = i(n, ["name"]);
  return t != null && s(e, ["_url", "file"], co(t)), e;
}
function xs(n) {
  const e = {}, t = i(n, ["uris"]);
  return t != null && s(e, ["uris"], t), e;
}
function Us(n, e) {
  const t = {}, o = i(n, ["pageSize"]);
  e !== void 0 && o != null && s(e, ["_query", "pageSize"], o);
  const r = i(n, ["pageToken"]);
  return e !== void 0 && r != null && s(e, ["_query", "pageToken"], r), t;
}
function Ls(n) {
  const e = {}, t = i(n, ["config"]);
  return t != null && Us(t, e), e;
}
function ks(n) {
  const e = {}, t = i(n, [
    "sdkHttpResponse"
  ]);
  t != null && s(e, ["sdkHttpResponse"], t);
  const o = i(n, [
    "nextPageToken"
  ]);
  o != null && s(e, ["nextPageToken"], o);
  const r = i(n, ["files"]);
  if (r != null) {
    let l = r;
    Array.isArray(l) && (l = l.map((a) => a)), s(e, ["files"], l);
  }
  return e;
}
function Gs(n) {
  const e = {}, t = i(n, [
    "sdkHttpResponse"
  ]);
  t != null && s(e, ["sdkHttpResponse"], t);
  const o = i(n, ["files"]);
  if (o != null) {
    let r = o;
    Array.isArray(r) && (r = r.map((l) => l)), s(e, ["files"], r);
  }
  return e;
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class Fs extends Y {
  constructor(e) {
    super(), this.apiClient = e, this.list = async (t = {}) => new ne(W.PAGED_ITEM_FILES, (o) => this.listInternal(o), await this.listInternal(t), t);
  }
  /**
   * Uploads a file asynchronously to the Gemini API.
   * This method is not available in Vertex AI.
   * Supported upload sources:
   * - Node.js: File path (string) or Blob object.
   * - Browser: Blob object (e.g., File).
   *
   * @remarks
   * The `mimeType` can be specified in the `config` parameter. If omitted:
   *  - For file path (string) inputs, the `mimeType` will be inferred from the
   *     file extension.
   *  - For Blob object inputs, the `mimeType` will be set to the Blob's `type`
   *     property.
   * Somex eamples for file extension to mimeType mapping:
   * .txt -> text/plain
   * .json -> application/json
   * .jpg  -> image/jpeg
   * .png -> image/png
   * .mp3 -> audio/mpeg
   * .mp4 -> video/mp4
   *
   * This section can contain multiple paragraphs and code examples.
   *
   * @param params - Optional parameters specified in the
   *        `types.UploadFileParameters` interface.
   *         @see {@link types.UploadFileParameters#config} for the optional
   *         config in the parameters.
   * @return A promise that resolves to a `types.File` object.
   * @throws An error if called on a Vertex AI client.
   * @throws An error if the `mimeType` is not provided and can not be inferred,
   * the `mimeType` can be provided in the `params.config` parameter.
   * @throws An error occurs if a suitable upload location cannot be established.
   *
   * @example
   * The following code uploads a file to Gemini API.
   *
   * ```ts
   * const file = await ai.files.upload({file: 'file.txt', config: {
   *   mimeType: 'text/plain',
   * }});
   * console.log(file.name);
   * ```
   */
  async upload(e) {
    if (this.apiClient.isVertexAI())
      throw new Error("Vertex AI does not support uploading files. You can share files through a GCS bucket.");
    return this.apiClient.uploadFile(e.file, e.config).then((t) => t);
  }
  /**
   * Downloads a remotely stored file asynchronously to a location specified in
   * the `params` object. This method only works on Node environment, to
   * download files in the browser, use a browser compliant method like an <a>
   * tag.
   *
   * @param params - The parameters for the download request.
   *
   * @example
   * The following code downloads an example file named "files/mehozpxf877d" as
   * "file.txt".
   *
   * ```ts
   * await ai.files.download({file: file.name, downloadPath: 'file.txt'});
   * ```
   */
  async download(e) {
    await this.apiClient.downloadFile(e);
  }
  /**
   * Registers Google Cloud Storage files for use with the API.
   * This method is only available in Node.js environments.
   */
  async registerFiles(e) {
    throw new Error("registerFiles is only supported in Node.js environments.");
  }
  async _registerFiles(e) {
    return this.registerFilesInternal(e);
  }
  async listInternal(e) {
    var t, o;
    let r, l = "", a = {};
    if (this.apiClient.isVertexAI())
      throw new Error("This method is only supported by the Gemini Developer API.");
    {
      const u = Ls(e);
      return l = I("files", u._url), a = u._query, delete u._url, delete u._query, r = this.apiClient.request({
        path: l,
        queryParams: a,
        body: JSON.stringify(u),
        httpMethod: "GET",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((f) => f.json().then((d) => {
        const c = d;
        return c.sdkHttpResponse = {
          headers: f.headers
        }, c;
      })), r.then((f) => {
        const d = ks(f), c = new ki();
        return Object.assign(c, d), c;
      });
    }
  }
  async createInternal(e) {
    var t, o;
    let r, l = "", a = {};
    if (this.apiClient.isVertexAI())
      throw new Error("This method is only supported by the Gemini Developer API.");
    {
      const u = Ps(e);
      return l = I("upload/v1beta/files", u._url), a = u._query, delete u._url, delete u._query, r = this.apiClient.request({
        path: l,
        queryParams: a,
        body: JSON.stringify(u),
        httpMethod: "POST",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((f) => f.json()), r.then((f) => {
        const d = ws(f), c = new Gi();
        return Object.assign(c, d), c;
      });
    }
  }
  /**
   * Retrieves the file information from the service.
   *
   * @param params - The parameters for the get request
   * @return The Promise that resolves to the types.File object requested.
   *
   * @example
   * ```ts
   * const config: GetFileParameters = {
   *   name: fileName,
   * };
   * file = await ai.files.get(config);
   * console.log(file.name);
   * ```
   */
  async get(e) {
    var t, o;
    let r, l = "", a = {};
    if (this.apiClient.isVertexAI())
      throw new Error("This method is only supported by the Gemini Developer API.");
    {
      const u = Ds(e);
      return l = I("files/{file}", u._url), a = u._query, delete u._url, delete u._query, r = this.apiClient.request({
        path: l,
        queryParams: a,
        body: JSON.stringify(u),
        httpMethod: "GET",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((f) => f.json()), r.then((f) => f);
    }
  }
  /**
   * Deletes a remotely stored file.
   *
   * @param params - The parameters for the delete request.
   * @return The DeleteFileResponse, the response for the delete method.
   *
   * @example
   * The following code deletes an example file named "files/mehozpxf877d".
   *
   * ```ts
   * await ai.files.delete({name: file.name});
   * ```
   */
  async delete(e) {
    var t, o;
    let r, l = "", a = {};
    if (this.apiClient.isVertexAI())
      throw new Error("This method is only supported by the Gemini Developer API.");
    {
      const u = Ms(e);
      return l = I("files/{file}", u._url), a = u._query, delete u._url, delete u._query, r = this.apiClient.request({
        path: l,
        queryParams: a,
        body: JSON.stringify(u),
        httpMethod: "DELETE",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((f) => f.json().then((d) => {
        const c = d;
        return c.sdkHttpResponse = {
          headers: f.headers
        }, c;
      })), r.then((f) => {
        const d = Ns(f), c = new Fi();
        return Object.assign(c, d), c;
      });
    }
  }
  async registerFilesInternal(e) {
    var t, o;
    let r, l = "", a = {};
    if (this.apiClient.isVertexAI())
      throw new Error("This method is only supported by the Gemini Developer API.");
    {
      const u = xs(e);
      return l = I("files:register", u._url), a = u._query, delete u._url, delete u._query, r = this.apiClient.request({
        path: l,
        queryParams: a,
        body: JSON.stringify(u),
        httpMethod: "POST",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((f) => f.json()), r.then((f) => {
        const d = Gs(f), c = new Vi();
        return Object.assign(c, d), c;
      });
    }
  }
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function qt(n) {
  const e = {};
  if (i(n, ["languageCodes"]) !== void 0)
    throw new Error("languageCodes parameter is not supported in Gemini API.");
  return e;
}
function Vs(n) {
  const e = {}, t = i(n, ["apiKey"]);
  if (t != null && s(e, ["apiKey"], t), i(n, ["apiKeyConfig"]) !== void 0)
    throw new Error("apiKeyConfig parameter is not supported in Gemini API.");
  if (i(n, ["authType"]) !== void 0)
    throw new Error("authType parameter is not supported in Gemini API.");
  if (i(n, ["googleServiceAccountConfig"]) !== void 0)
    throw new Error("googleServiceAccountConfig parameter is not supported in Gemini API.");
  if (i(n, ["httpBasicAuthConfig"]) !== void 0)
    throw new Error("httpBasicAuthConfig parameter is not supported in Gemini API.");
  if (i(n, ["oauthConfig"]) !== void 0)
    throw new Error("oauthConfig parameter is not supported in Gemini API.");
  if (i(n, ["oidcConfig"]) !== void 0)
    throw new Error("oidcConfig parameter is not supported in Gemini API.");
  return e;
}
function Ee(n) {
  const e = {}, t = i(n, ["data"]);
  if (t != null && s(e, ["data"], t), i(n, ["displayName"]) !== void 0)
    throw new Error("displayName parameter is not supported in Gemini API.");
  const o = i(n, ["mimeType"]);
  return o != null && s(e, ["mimeType"], o), e;
}
function qs(n) {
  const e = {}, t = i(n, ["parts"]);
  if (t != null) {
    let r = t;
    Array.isArray(r) && (r = r.map((l) => nl(l))), s(e, ["parts"], r);
  }
  const o = i(n, ["role"]);
  return o != null && s(e, ["role"], o), e;
}
function Hs(n) {
  const e = {};
  if (i(n, ["displayName"]) !== void 0)
    throw new Error("displayName parameter is not supported in Gemini API.");
  const t = i(n, ["fileUri"]);
  t != null && s(e, ["fileUri"], t);
  const o = i(n, ["mimeType"]);
  return o != null && s(e, ["mimeType"], o), e;
}
function Bs(n) {
  const e = {}, t = i(n, ["id"]);
  t != null && s(e, ["id"], t);
  const o = i(n, ["args"]);
  o != null && s(e, ["args"], o);
  const r = i(n, ["name"]);
  if (r != null && s(e, ["name"], r), i(n, ["partialArgs"]) !== void 0)
    throw new Error("partialArgs parameter is not supported in Gemini API.");
  if (i(n, ["willContinue"]) !== void 0)
    throw new Error("willContinue parameter is not supported in Gemini API.");
  return e;
}
function bs(n) {
  const e = {}, t = i(n, ["description"]);
  t != null && s(e, ["description"], t);
  const o = i(n, ["name"]);
  o != null && s(e, ["name"], o);
  const r = i(n, ["parameters"]);
  r != null && s(e, ["parameters"], r);
  const l = i(n, [
    "parametersJsonSchema"
  ]);
  l != null && s(e, ["parametersJsonSchema"], l);
  const a = i(n, ["response"]);
  a != null && s(e, ["response"], a);
  const u = i(n, [
    "responseJsonSchema"
  ]);
  if (u != null && s(e, ["responseJsonSchema"], u), i(n, ["behavior"]) !== void 0)
    throw new Error("behavior parameter is not supported in Vertex AI.");
  return e;
}
function Js(n) {
  const e = {}, t = i(n, [
    "modelSelectionConfig"
  ]);
  t != null && s(e, ["modelConfig"], t);
  const o = i(n, [
    "responseJsonSchema"
  ]);
  o != null && s(e, ["responseJsonSchema"], o);
  const r = i(n, [
    "audioTimestamp"
  ]);
  r != null && s(e, ["audioTimestamp"], r);
  const l = i(n, [
    "candidateCount"
  ]);
  l != null && s(e, ["candidateCount"], l);
  const a = i(n, [
    "enableAffectiveDialog"
  ]);
  a != null && s(e, ["enableAffectiveDialog"], a);
  const u = i(n, [
    "frequencyPenalty"
  ]);
  u != null && s(e, ["frequencyPenalty"], u);
  const f = i(n, ["logprobs"]);
  f != null && s(e, ["logprobs"], f);
  const d = i(n, [
    "maxOutputTokens"
  ]);
  d != null && s(e, ["maxOutputTokens"], d);
  const c = i(n, [
    "mediaResolution"
  ]);
  c != null && s(e, ["mediaResolution"], c);
  const m = i(n, [
    "presencePenalty"
  ]);
  m != null && s(e, ["presencePenalty"], m);
  const p = i(n, [
    "responseLogprobs"
  ]);
  p != null && s(e, ["responseLogprobs"], p);
  const h = i(n, [
    "responseMimeType"
  ]);
  h != null && s(e, ["responseMimeType"], h);
  const g = i(n, [
    "responseModalities"
  ]);
  g != null && s(e, ["responseModalities"], g);
  const T = i(n, [
    "responseSchema"
  ]);
  T != null && s(e, ["responseSchema"], T);
  const y = i(n, [
    "routingConfig"
  ]);
  y != null && s(e, ["routingConfig"], y);
  const _ = i(n, ["seed"]);
  _ != null && s(e, ["seed"], _);
  const S = i(n, ["speechConfig"]);
  S != null && s(e, ["speechConfig"], S);
  const C = i(n, [
    "stopSequences"
  ]);
  C != null && s(e, ["stopSequences"], C);
  const A = i(n, ["temperature"]);
  A != null && s(e, ["temperature"], A);
  const R = i(n, [
    "thinkingConfig"
  ]);
  R != null && s(e, ["thinkingConfig"], R);
  const E = i(n, ["topK"]);
  E != null && s(e, ["topK"], E);
  const w = i(n, ["topP"]);
  if (w != null && s(e, ["topP"], w), i(n, ["enableEnhancedCivicAnswers"]) !== void 0)
    throw new Error("enableEnhancedCivicAnswers parameter is not supported in Vertex AI.");
  return e;
}
function $s(n) {
  const e = {}, t = i(n, ["authConfig"]);
  t != null && s(e, ["authConfig"], Vs(t));
  const o = i(n, ["enableWidget"]);
  return o != null && s(e, ["enableWidget"], o), e;
}
function Ks(n) {
  const e = {}, t = i(n, ["searchTypes"]);
  if (t != null && s(e, ["searchTypes"], t), i(n, ["blockingConfidence"]) !== void 0)
    throw new Error("blockingConfidence parameter is not supported in Gemini API.");
  if (i(n, ["excludeDomains"]) !== void 0)
    throw new Error("excludeDomains parameter is not supported in Gemini API.");
  const o = i(n, [
    "timeRangeFilter"
  ]);
  return o != null && s(e, ["timeRangeFilter"], o), e;
}
function Os(n, e) {
  const t = {}, o = i(n, [
    "generationConfig"
  ]);
  e !== void 0 && o != null && s(e, ["setup", "generationConfig"], o);
  const r = i(n, [
    "responseModalities"
  ]);
  e !== void 0 && r != null && s(e, ["setup", "generationConfig", "responseModalities"], r);
  const l = i(n, ["temperature"]);
  e !== void 0 && l != null && s(e, ["setup", "generationConfig", "temperature"], l);
  const a = i(n, ["topP"]);
  e !== void 0 && a != null && s(e, ["setup", "generationConfig", "topP"], a);
  const u = i(n, ["topK"]);
  e !== void 0 && u != null && s(e, ["setup", "generationConfig", "topK"], u);
  const f = i(n, [
    "maxOutputTokens"
  ]);
  e !== void 0 && f != null && s(e, ["setup", "generationConfig", "maxOutputTokens"], f);
  const d = i(n, [
    "mediaResolution"
  ]);
  e !== void 0 && d != null && s(e, ["setup", "generationConfig", "mediaResolution"], d);
  const c = i(n, ["seed"]);
  e !== void 0 && c != null && s(e, ["setup", "generationConfig", "seed"], c);
  const m = i(n, ["speechConfig"]);
  e !== void 0 && m != null && s(e, ["setup", "generationConfig", "speechConfig"], fn(m));
  const p = i(n, [
    "thinkingConfig"
  ]);
  e !== void 0 && p != null && s(e, ["setup", "generationConfig", "thinkingConfig"], p);
  const h = i(n, [
    "enableAffectiveDialog"
  ]);
  e !== void 0 && h != null && s(e, ["setup", "generationConfig", "enableAffectiveDialog"], h);
  const g = i(n, [
    "systemInstruction"
  ]);
  e !== void 0 && g != null && s(e, ["setup", "systemInstruction"], qs(k(g)));
  const T = i(n, ["tools"]);
  if (e !== void 0 && T != null) {
    let E = le(T);
    Array.isArray(E) && (E = E.map((w) => ol(se(w)))), s(e, ["setup", "tools"], E);
  }
  const y = i(n, [
    "sessionResumption"
  ]);
  e !== void 0 && y != null && s(e, ["setup", "sessionResumption"], tl(y));
  const _ = i(n, [
    "inputAudioTranscription"
  ]);
  e !== void 0 && _ != null && s(e, ["setup", "inputAudioTranscription"], qt(_));
  const S = i(n, [
    "outputAudioTranscription"
  ]);
  e !== void 0 && S != null && s(e, ["setup", "outputAudioTranscription"], qt(S));
  const C = i(n, [
    "realtimeInputConfig"
  ]);
  e !== void 0 && C != null && s(e, ["setup", "realtimeInputConfig"], C);
  const A = i(n, [
    "contextWindowCompression"
  ]);
  e !== void 0 && A != null && s(e, ["setup", "contextWindowCompression"], A);
  const R = i(n, ["proactivity"]);
  if (e !== void 0 && R != null && s(e, ["setup", "proactivity"], R), i(n, ["explicitVadSignal"]) !== void 0)
    throw new Error("explicitVadSignal parameter is not supported in Gemini API.");
  return t;
}
function Ws(n, e) {
  const t = {}, o = i(n, [
    "generationConfig"
  ]);
  e !== void 0 && o != null && s(e, ["setup", "generationConfig"], Js(o));
  const r = i(n, [
    "responseModalities"
  ]);
  e !== void 0 && r != null && s(e, ["setup", "generationConfig", "responseModalities"], r);
  const l = i(n, ["temperature"]);
  e !== void 0 && l != null && s(e, ["setup", "generationConfig", "temperature"], l);
  const a = i(n, ["topP"]);
  e !== void 0 && a != null && s(e, ["setup", "generationConfig", "topP"], a);
  const u = i(n, ["topK"]);
  e !== void 0 && u != null && s(e, ["setup", "generationConfig", "topK"], u);
  const f = i(n, [
    "maxOutputTokens"
  ]);
  e !== void 0 && f != null && s(e, ["setup", "generationConfig", "maxOutputTokens"], f);
  const d = i(n, [
    "mediaResolution"
  ]);
  e !== void 0 && d != null && s(e, ["setup", "generationConfig", "mediaResolution"], d);
  const c = i(n, ["seed"]);
  e !== void 0 && c != null && s(e, ["setup", "generationConfig", "seed"], c);
  const m = i(n, ["speechConfig"]);
  e !== void 0 && m != null && s(e, ["setup", "generationConfig", "speechConfig"], fn(m));
  const p = i(n, [
    "thinkingConfig"
  ]);
  e !== void 0 && p != null && s(e, ["setup", "generationConfig", "thinkingConfig"], p);
  const h = i(n, [
    "enableAffectiveDialog"
  ]);
  e !== void 0 && h != null && s(e, ["setup", "generationConfig", "enableAffectiveDialog"], h);
  const g = i(n, [
    "systemInstruction"
  ]);
  e !== void 0 && g != null && s(e, ["setup", "systemInstruction"], k(g));
  const T = i(n, ["tools"]);
  if (e !== void 0 && T != null) {
    let w = le(T);
    Array.isArray(w) && (w = w.map((D) => il(se(D)))), s(e, ["setup", "tools"], w);
  }
  const y = i(n, [
    "sessionResumption"
  ]);
  e !== void 0 && y != null && s(e, ["setup", "sessionResumption"], y);
  const _ = i(n, [
    "inputAudioTranscription"
  ]);
  e !== void 0 && _ != null && s(e, ["setup", "inputAudioTranscription"], _);
  const S = i(n, [
    "outputAudioTranscription"
  ]);
  e !== void 0 && S != null && s(e, ["setup", "outputAudioTranscription"], S);
  const C = i(n, [
    "realtimeInputConfig"
  ]);
  e !== void 0 && C != null && s(e, ["setup", "realtimeInputConfig"], C);
  const A = i(n, [
    "contextWindowCompression"
  ]);
  e !== void 0 && A != null && s(e, ["setup", "contextWindowCompression"], A);
  const R = i(n, ["proactivity"]);
  e !== void 0 && R != null && s(e, ["setup", "proactivity"], R);
  const E = i(n, [
    "explicitVadSignal"
  ]);
  return e !== void 0 && E != null && s(e, ["setup", "explicitVadSignal"], E), t;
}
function Ys(n, e) {
  const t = {}, o = i(e, ["model"]);
  o != null && s(t, ["setup", "model"], N(n, o));
  const r = i(e, ["config"]);
  return r != null && s(t, ["config"], Os(r, t)), t;
}
function zs(n, e) {
  const t = {}, o = i(e, ["model"]);
  o != null && s(t, ["setup", "model"], N(n, o));
  const r = i(e, ["config"]);
  return r != null && s(t, ["config"], Ws(r, t)), t;
}
function Qs(n) {
  const e = {}, t = i(n, [
    "musicGenerationConfig"
  ]);
  return t != null && s(e, ["musicGenerationConfig"], t), e;
}
function Xs(n) {
  const e = {}, t = i(n, [
    "weightedPrompts"
  ]);
  if (t != null) {
    let o = t;
    Array.isArray(o) && (o = o.map((r) => r)), s(e, ["weightedPrompts"], o);
  }
  return e;
}
function Zs(n) {
  const e = {}, t = i(n, ["media"]);
  if (t != null) {
    let d = so(t);
    Array.isArray(d) && (d = d.map((c) => Ee(c))), s(e, ["mediaChunks"], d);
  }
  const o = i(n, ["audio"]);
  o != null && s(e, ["audio"], Ee(ao(o)));
  const r = i(n, [
    "audioStreamEnd"
  ]);
  r != null && s(e, ["audioStreamEnd"], r);
  const l = i(n, ["video"]);
  l != null && s(e, ["video"], Ee(lo(l)));
  const a = i(n, ["text"]);
  a != null && s(e, ["text"], a);
  const u = i(n, [
    "activityStart"
  ]);
  u != null && s(e, ["activityStart"], u);
  const f = i(n, ["activityEnd"]);
  return f != null && s(e, ["activityEnd"], f), e;
}
function js(n) {
  const e = {}, t = i(n, ["media"]);
  if (t != null) {
    let d = so(t);
    Array.isArray(d) && (d = d.map((c) => c)), s(e, ["mediaChunks"], d);
  }
  const o = i(n, ["audio"]);
  o != null && s(e, ["audio"], ao(o));
  const r = i(n, [
    "audioStreamEnd"
  ]);
  r != null && s(e, ["audioStreamEnd"], r);
  const l = i(n, ["video"]);
  l != null && s(e, ["video"], lo(l));
  const a = i(n, ["text"]);
  a != null && s(e, ["text"], a);
  const u = i(n, [
    "activityStart"
  ]);
  u != null && s(e, ["activityStart"], u);
  const f = i(n, ["activityEnd"]);
  return f != null && s(e, ["activityEnd"], f), e;
}
function el(n) {
  const e = {}, t = i(n, [
    "setupComplete"
  ]);
  t != null && s(e, ["setupComplete"], t);
  const o = i(n, [
    "serverContent"
  ]);
  o != null && s(e, ["serverContent"], o);
  const r = i(n, ["toolCall"]);
  r != null && s(e, ["toolCall"], r);
  const l = i(n, [
    "toolCallCancellation"
  ]);
  l != null && s(e, ["toolCallCancellation"], l);
  const a = i(n, [
    "usageMetadata"
  ]);
  a != null && s(e, ["usageMetadata"], rl(a));
  const u = i(n, ["goAway"]);
  u != null && s(e, ["goAway"], u);
  const f = i(n, [
    "sessionResumptionUpdate"
  ]);
  f != null && s(e, ["sessionResumptionUpdate"], f);
  const d = i(n, [
    "voiceActivityDetectionSignal"
  ]);
  d != null && s(e, ["voiceActivityDetectionSignal"], d);
  const c = i(n, [
    "voiceActivity"
  ]);
  return c != null && s(e, ["voiceActivity"], sl(c)), e;
}
function nl(n) {
  const e = {}, t = i(n, [
    "mediaResolution"
  ]);
  t != null && s(e, ["mediaResolution"], t);
  const o = i(n, [
    "codeExecutionResult"
  ]);
  o != null && s(e, ["codeExecutionResult"], o);
  const r = i(n, [
    "executableCode"
  ]);
  r != null && s(e, ["executableCode"], r);
  const l = i(n, ["fileData"]);
  l != null && s(e, ["fileData"], Hs(l));
  const a = i(n, ["functionCall"]);
  a != null && s(e, ["functionCall"], Bs(a));
  const u = i(n, [
    "functionResponse"
  ]);
  u != null && s(e, ["functionResponse"], u);
  const f = i(n, ["inlineData"]);
  f != null && s(e, ["inlineData"], Ee(f));
  const d = i(n, ["text"]);
  d != null && s(e, ["text"], d);
  const c = i(n, ["thought"]);
  c != null && s(e, ["thought"], c);
  const m = i(n, [
    "thoughtSignature"
  ]);
  m != null && s(e, ["thoughtSignature"], m);
  const p = i(n, [
    "videoMetadata"
  ]);
  return p != null && s(e, ["videoMetadata"], p), e;
}
function tl(n) {
  const e = {}, t = i(n, ["handle"]);
  if (t != null && s(e, ["handle"], t), i(n, ["transparent"]) !== void 0)
    throw new Error("transparent parameter is not supported in Gemini API.");
  return e;
}
function ol(n) {
  const e = {};
  if (i(n, ["retrieval"]) !== void 0)
    throw new Error("retrieval parameter is not supported in Gemini API.");
  const t = i(n, ["computerUse"]);
  t != null && s(e, ["computerUse"], t);
  const o = i(n, ["fileSearch"]);
  o != null && s(e, ["fileSearch"], o);
  const r = i(n, ["googleSearch"]);
  r != null && s(e, ["googleSearch"], Ks(r));
  const l = i(n, ["googleMaps"]);
  l != null && s(e, ["googleMaps"], $s(l));
  const a = i(n, [
    "codeExecution"
  ]);
  if (a != null && s(e, ["codeExecution"], a), i(n, ["enterpriseWebSearch"]) !== void 0)
    throw new Error("enterpriseWebSearch parameter is not supported in Gemini API.");
  const u = i(n, [
    "functionDeclarations"
  ]);
  if (u != null) {
    let m = u;
    Array.isArray(m) && (m = m.map((p) => p)), s(e, ["functionDeclarations"], m);
  }
  const f = i(n, [
    "googleSearchRetrieval"
  ]);
  if (f != null && s(e, ["googleSearchRetrieval"], f), i(n, ["parallelAiSearch"]) !== void 0)
    throw new Error("parallelAiSearch parameter is not supported in Gemini API.");
  const d = i(n, ["urlContext"]);
  d != null && s(e, ["urlContext"], d);
  const c = i(n, ["mcpServers"]);
  if (c != null) {
    let m = c;
    Array.isArray(m) && (m = m.map((p) => p)), s(e, ["mcpServers"], m);
  }
  return e;
}
function il(n) {
  const e = {}, t = i(n, ["retrieval"]);
  t != null && s(e, ["retrieval"], t);
  const o = i(n, ["computerUse"]);
  if (o != null && s(e, ["computerUse"], o), i(n, ["fileSearch"]) !== void 0)
    throw new Error("fileSearch parameter is not supported in Vertex AI.");
  const r = i(n, ["googleSearch"]);
  r != null && s(e, ["googleSearch"], r);
  const l = i(n, ["googleMaps"]);
  l != null && s(e, ["googleMaps"], l);
  const a = i(n, [
    "codeExecution"
  ]);
  a != null && s(e, ["codeExecution"], a);
  const u = i(n, [
    "enterpriseWebSearch"
  ]);
  u != null && s(e, ["enterpriseWebSearch"], u);
  const f = i(n, [
    "functionDeclarations"
  ]);
  if (f != null) {
    let p = f;
    Array.isArray(p) && (p = p.map((h) => bs(h))), s(e, ["functionDeclarations"], p);
  }
  const d = i(n, [
    "googleSearchRetrieval"
  ]);
  d != null && s(e, ["googleSearchRetrieval"], d);
  const c = i(n, [
    "parallelAiSearch"
  ]);
  c != null && s(e, ["parallelAiSearch"], c);
  const m = i(n, ["urlContext"]);
  if (m != null && s(e, ["urlContext"], m), i(n, ["mcpServers"]) !== void 0)
    throw new Error("mcpServers parameter is not supported in Vertex AI.");
  return e;
}
function rl(n) {
  const e = {}, t = i(n, [
    "promptTokenCount"
  ]);
  t != null && s(e, ["promptTokenCount"], t);
  const o = i(n, [
    "cachedContentTokenCount"
  ]);
  o != null && s(e, ["cachedContentTokenCount"], o);
  const r = i(n, [
    "candidatesTokenCount"
  ]);
  r != null && s(e, ["responseTokenCount"], r);
  const l = i(n, [
    "toolUsePromptTokenCount"
  ]);
  l != null && s(e, ["toolUsePromptTokenCount"], l);
  const a = i(n, [
    "thoughtsTokenCount"
  ]);
  a != null && s(e, ["thoughtsTokenCount"], a);
  const u = i(n, [
    "totalTokenCount"
  ]);
  u != null && s(e, ["totalTokenCount"], u);
  const f = i(n, [
    "promptTokensDetails"
  ]);
  if (f != null) {
    let h = f;
    Array.isArray(h) && (h = h.map((g) => g)), s(e, ["promptTokensDetails"], h);
  }
  const d = i(n, [
    "cacheTokensDetails"
  ]);
  if (d != null) {
    let h = d;
    Array.isArray(h) && (h = h.map((g) => g)), s(e, ["cacheTokensDetails"], h);
  }
  const c = i(n, [
    "candidatesTokensDetails"
  ]);
  if (c != null) {
    let h = c;
    Array.isArray(h) && (h = h.map((g) => g)), s(e, ["responseTokensDetails"], h);
  }
  const m = i(n, [
    "toolUsePromptTokensDetails"
  ]);
  if (m != null) {
    let h = m;
    Array.isArray(h) && (h = h.map((g) => g)), s(e, ["toolUsePromptTokensDetails"], h);
  }
  const p = i(n, ["trafficType"]);
  return p != null && s(e, ["trafficType"], p), e;
}
function sl(n) {
  const e = {}, t = i(n, ["type"]);
  return t != null && s(e, ["voiceActivityType"], t), e;
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function ll(n, e) {
  const t = {}, o = i(n, ["apiKey"]);
  if (o != null && s(t, ["apiKey"], o), i(n, ["apiKeyConfig"]) !== void 0)
    throw new Error("apiKeyConfig parameter is not supported in Gemini API.");
  if (i(n, ["authType"]) !== void 0)
    throw new Error("authType parameter is not supported in Gemini API.");
  if (i(n, ["googleServiceAccountConfig"]) !== void 0)
    throw new Error("googleServiceAccountConfig parameter is not supported in Gemini API.");
  if (i(n, ["httpBasicAuthConfig"]) !== void 0)
    throw new Error("httpBasicAuthConfig parameter is not supported in Gemini API.");
  if (i(n, ["oauthConfig"]) !== void 0)
    throw new Error("oauthConfig parameter is not supported in Gemini API.");
  if (i(n, ["oidcConfig"]) !== void 0)
    throw new Error("oidcConfig parameter is not supported in Gemini API.");
  return t;
}
function al(n, e) {
  const t = {}, o = i(n, ["data"]);
  if (o != null && s(t, ["data"], o), i(n, ["displayName"]) !== void 0)
    throw new Error("displayName parameter is not supported in Gemini API.");
  const r = i(n, ["mimeType"]);
  return r != null && s(t, ["mimeType"], r), t;
}
function ul(n, e) {
  const t = {}, o = i(n, ["content"]);
  o != null && s(t, ["content"], o);
  const r = i(n, [
    "citationMetadata"
  ]);
  r != null && s(t, ["citationMetadata"], dl(r));
  const l = i(n, ["tokenCount"]);
  l != null && s(t, ["tokenCount"], l);
  const a = i(n, ["finishReason"]);
  a != null && s(t, ["finishReason"], a);
  const u = i(n, [
    "groundingMetadata"
  ]);
  u != null && s(t, ["groundingMetadata"], u);
  const f = i(n, ["avgLogprobs"]);
  f != null && s(t, ["avgLogprobs"], f);
  const d = i(n, ["index"]);
  d != null && s(t, ["index"], d);
  const c = i(n, [
    "logprobsResult"
  ]);
  c != null && s(t, ["logprobsResult"], c);
  const m = i(n, [
    "safetyRatings"
  ]);
  if (m != null) {
    let h = m;
    Array.isArray(h) && (h = h.map((g) => g)), s(t, ["safetyRatings"], h);
  }
  const p = i(n, [
    "urlContextMetadata"
  ]);
  return p != null && s(t, ["urlContextMetadata"], p), t;
}
function dl(n, e) {
  const t = {}, o = i(n, ["citationSources"]);
  if (o != null) {
    let r = o;
    Array.isArray(r) && (r = r.map((l) => l)), s(t, ["citations"], r);
  }
  return t;
}
function fl(n, e, t) {
  const o = {}, r = i(e, ["model"]);
  r != null && s(o, ["_url", "model"], N(n, r));
  const l = i(e, ["contents"]);
  if (l != null) {
    let a = H(l);
    Array.isArray(a) && (a = a.map((u) => u)), s(o, ["contents"], a);
  }
  return o;
}
function cl(n, e) {
  const t = {}, o = i(n, [
    "sdkHttpResponse"
  ]);
  o != null && s(t, ["sdkHttpResponse"], o);
  const r = i(n, ["tokensInfo"]);
  if (r != null) {
    let l = r;
    Array.isArray(l) && (l = l.map((a) => a)), s(t, ["tokensInfo"], l);
  }
  return t;
}
function pl(n, e) {
  const t = {}, o = i(n, ["values"]);
  o != null && s(t, ["values"], o);
  const r = i(n, ["statistics"]);
  return r != null && s(t, ["statistics"], ml(r)), t;
}
function ml(n, e) {
  const t = {}, o = i(n, ["truncated"]);
  o != null && s(t, ["truncated"], o);
  const r = i(n, ["token_count"]);
  return r != null && s(t, ["tokenCount"], r), t;
}
function pe(n, e) {
  const t = {}, o = i(n, ["parts"]);
  if (o != null) {
    let l = o;
    Array.isArray(l) && (l = l.map((a) => Sa(a))), s(t, ["parts"], l);
  }
  const r = i(n, ["role"]);
  return r != null && s(t, ["role"], r), t;
}
function hl(n, e) {
  const t = {}, o = i(n, ["controlType"]);
  o != null && s(t, ["controlType"], o);
  const r = i(n, [
    "enableControlImageComputation"
  ]);
  return r != null && s(t, ["computeControl"], r), t;
}
function gl(n, e) {
  const t = {};
  if (i(n, ["systemInstruction"]) !== void 0)
    throw new Error("systemInstruction parameter is not supported in Gemini API.");
  if (i(n, ["tools"]) !== void 0)
    throw new Error("tools parameter is not supported in Gemini API.");
  if (i(n, ["generationConfig"]) !== void 0)
    throw new Error("generationConfig parameter is not supported in Gemini API.");
  return t;
}
function yl(n, e, t) {
  const o = {}, r = i(n, [
    "systemInstruction"
  ]);
  e !== void 0 && r != null && s(e, ["systemInstruction"], k(r));
  const l = i(n, ["tools"]);
  if (e !== void 0 && l != null) {
    let u = l;
    Array.isArray(u) && (u = u.map((f) => So(f))), s(e, ["tools"], u);
  }
  const a = i(n, [
    "generationConfig"
  ]);
  return e !== void 0 && a != null && s(e, ["generationConfig"], aa(a)), o;
}
function Tl(n, e, t) {
  const o = {}, r = i(e, ["model"]);
  r != null && s(o, ["_url", "model"], N(n, r));
  const l = i(e, ["contents"]);
  if (l != null) {
    let u = H(l);
    Array.isArray(u) && (u = u.map((f) => pe(f))), s(o, ["contents"], u);
  }
  const a = i(e, ["config"]);
  return a != null && gl(a), o;
}
function _l(n, e, t) {
  const o = {}, r = i(e, ["model"]);
  r != null && s(o, ["_url", "model"], N(n, r));
  const l = i(e, ["contents"]);
  if (l != null) {
    let u = H(l);
    Array.isArray(u) && (u = u.map((f) => f)), s(o, ["contents"], u);
  }
  const a = i(e, ["config"]);
  return a != null && yl(a, o), o;
}
function El(n, e) {
  const t = {}, o = i(n, [
    "sdkHttpResponse"
  ]);
  o != null && s(t, ["sdkHttpResponse"], o);
  const r = i(n, ["totalTokens"]);
  r != null && s(t, ["totalTokens"], r);
  const l = i(n, [
    "cachedContentTokenCount"
  ]);
  return l != null && s(t, ["cachedContentTokenCount"], l), t;
}
function Cl(n, e) {
  const t = {}, o = i(n, [
    "sdkHttpResponse"
  ]);
  o != null && s(t, ["sdkHttpResponse"], o);
  const r = i(n, ["totalTokens"]);
  return r != null && s(t, ["totalTokens"], r), t;
}
function Il(n, e, t) {
  const o = {}, r = i(e, ["model"]);
  return r != null && s(o, ["_url", "name"], N(n, r)), o;
}
function Sl(n, e, t) {
  const o = {}, r = i(e, ["model"]);
  return r != null && s(o, ["_url", "name"], N(n, r)), o;
}
function Al(n, e) {
  const t = {}, o = i(n, [
    "sdkHttpResponse"
  ]);
  return o != null && s(t, ["sdkHttpResponse"], o), t;
}
function vl(n, e) {
  const t = {}, o = i(n, [
    "sdkHttpResponse"
  ]);
  return o != null && s(t, ["sdkHttpResponse"], o), t;
}
function Rl(n, e, t) {
  const o = {}, r = i(n, ["outputGcsUri"]);
  e !== void 0 && r != null && s(e, ["parameters", "storageUri"], r);
  const l = i(n, [
    "negativePrompt"
  ]);
  e !== void 0 && l != null && s(e, ["parameters", "negativePrompt"], l);
  const a = i(n, [
    "numberOfImages"
  ]);
  e !== void 0 && a != null && s(e, ["parameters", "sampleCount"], a);
  const u = i(n, ["aspectRatio"]);
  e !== void 0 && u != null && s(e, ["parameters", "aspectRatio"], u);
  const f = i(n, [
    "guidanceScale"
  ]);
  e !== void 0 && f != null && s(e, ["parameters", "guidanceScale"], f);
  const d = i(n, ["seed"]);
  e !== void 0 && d != null && s(e, ["parameters", "seed"], d);
  const c = i(n, [
    "safetyFilterLevel"
  ]);
  e !== void 0 && c != null && s(e, ["parameters", "safetySetting"], c);
  const m = i(n, [
    "personGeneration"
  ]);
  e !== void 0 && m != null && s(e, ["parameters", "personGeneration"], m);
  const p = i(n, [
    "includeSafetyAttributes"
  ]);
  e !== void 0 && p != null && s(e, ["parameters", "includeSafetyAttributes"], p);
  const h = i(n, [
    "includeRaiReason"
  ]);
  e !== void 0 && h != null && s(e, ["parameters", "includeRaiReason"], h);
  const g = i(n, ["language"]);
  e !== void 0 && g != null && s(e, ["parameters", "language"], g);
  const T = i(n, [
    "outputMimeType"
  ]);
  e !== void 0 && T != null && s(e, ["parameters", "outputOptions", "mimeType"], T);
  const y = i(n, [
    "outputCompressionQuality"
  ]);
  e !== void 0 && y != null && s(e, ["parameters", "outputOptions", "compressionQuality"], y);
  const _ = i(n, ["addWatermark"]);
  e !== void 0 && _ != null && s(e, ["parameters", "addWatermark"], _);
  const S = i(n, ["labels"]);
  e !== void 0 && S != null && s(e, ["labels"], S);
  const C = i(n, ["editMode"]);
  e !== void 0 && C != null && s(e, ["parameters", "editMode"], C);
  const A = i(n, ["baseSteps"]);
  return e !== void 0 && A != null && s(e, ["parameters", "editConfig", "baseSteps"], A), o;
}
function Pl(n, e, t) {
  const o = {}, r = i(e, ["model"]);
  r != null && s(o, ["_url", "model"], N(n, r));
  const l = i(e, ["prompt"]);
  l != null && s(o, ["instances[0]", "prompt"], l);
  const a = i(e, [
    "referenceImages"
  ]);
  if (a != null) {
    let f = a;
    Array.isArray(f) && (f = f.map((d) => Ma(d))), s(o, ["instances[0]", "referenceImages"], f);
  }
  const u = i(e, ["config"]);
  return u != null && Rl(u, o), o;
}
function wl(n, e) {
  const t = {}, o = i(n, [
    "sdkHttpResponse"
  ]);
  o != null && s(t, ["sdkHttpResponse"], o);
  const r = i(n, [
    "predictions"
  ]);
  if (r != null) {
    let l = r;
    Array.isArray(l) && (l = l.map((a) => Me(a))), s(t, ["generatedImages"], l);
  }
  return t;
}
function Ml(n, e, t) {
  const o = {}, r = i(n, ["taskType"]);
  e !== void 0 && r != null && s(e, ["requests[]", "taskType"], r);
  const l = i(n, ["title"]);
  e !== void 0 && l != null && s(e, ["requests[]", "title"], l);
  const a = i(n, [
    "outputDimensionality"
  ]);
  if (e !== void 0 && a != null && s(e, ["requests[]", "outputDimensionality"], a), i(n, ["mimeType"]) !== void 0)
    throw new Error("mimeType parameter is not supported in Gemini API.");
  if (i(n, ["autoTruncate"]) !== void 0)
    throw new Error("autoTruncate parameter is not supported in Gemini API.");
  return o;
}
function Nl(n, e, t) {
  const o = {};
  let r = i(t, [
    "embeddingApiType"
  ]);
  if (r === void 0 && (r = "PREDICT"), r === "PREDICT") {
    const d = i(n, ["taskType"]);
    e !== void 0 && d != null && s(e, ["instances[]", "task_type"], d);
  } else if (r === "EMBED_CONTENT") {
    const d = i(n, ["taskType"]);
    e !== void 0 && d != null && s(e, ["taskType"], d);
  }
  let l = i(t, [
    "embeddingApiType"
  ]);
  if (l === void 0 && (l = "PREDICT"), l === "PREDICT") {
    const d = i(n, ["title"]);
    e !== void 0 && d != null && s(e, ["instances[]", "title"], d);
  } else if (l === "EMBED_CONTENT") {
    const d = i(n, ["title"]);
    e !== void 0 && d != null && s(e, ["title"], d);
  }
  let a = i(t, [
    "embeddingApiType"
  ]);
  if (a === void 0 && (a = "PREDICT"), a === "PREDICT") {
    const d = i(n, [
      "outputDimensionality"
    ]);
    e !== void 0 && d != null && s(e, ["parameters", "outputDimensionality"], d);
  } else if (a === "EMBED_CONTENT") {
    const d = i(n, [
      "outputDimensionality"
    ]);
    e !== void 0 && d != null && s(e, ["outputDimensionality"], d);
  }
  let u = i(t, [
    "embeddingApiType"
  ]);
  if (u === void 0 && (u = "PREDICT"), u === "PREDICT") {
    const d = i(n, ["mimeType"]);
    e !== void 0 && d != null && s(e, ["instances[]", "mimeType"], d);
  }
  let f = i(t, [
    "embeddingApiType"
  ]);
  if (f === void 0 && (f = "PREDICT"), f === "PREDICT") {
    const d = i(n, [
      "autoTruncate"
    ]);
    e !== void 0 && d != null && s(e, ["parameters", "autoTruncate"], d);
  } else if (f === "EMBED_CONTENT") {
    const d = i(n, [
      "autoTruncate"
    ]);
    e !== void 0 && d != null && s(e, ["autoTruncate"], d);
  }
  return o;
}
function Dl(n, e, t) {
  const o = {}, r = i(e, ["model"]);
  r != null && s(o, ["_url", "model"], N(n, r));
  const l = i(e, ["contents"]);
  if (l != null) {
    let d = an(n, l);
    Array.isArray(d) && (d = d.map((c) => c)), s(o, ["requests[]", "content"], d);
  }
  const a = i(e, ["content"]);
  a != null && pe(k(a));
  const u = i(e, ["config"]);
  u != null && Ml(u, o);
  const f = i(e, ["model"]);
  return f !== void 0 && s(o, ["requests[]", "model"], N(n, f)), o;
}
function xl(n, e, t) {
  const o = {}, r = i(e, ["model"]);
  r != null && s(o, ["_url", "model"], N(n, r));
  let l = i(t, [
    "embeddingApiType"
  ]);
  if (l === void 0 && (l = "PREDICT"), l === "PREDICT") {
    const f = i(e, ["contents"]);
    if (f != null) {
      let d = an(n, f);
      Array.isArray(d) && (d = d.map((c) => c)), s(o, ["instances[]", "content"], d);
    }
  }
  let a = i(t, [
    "embeddingApiType"
  ]);
  if (a === void 0 && (a = "PREDICT"), a === "EMBED_CONTENT") {
    const f = i(e, ["content"]);
    f != null && s(o, ["content"], k(f));
  }
  const u = i(e, ["config"]);
  return u != null && Nl(u, o, t), o;
}
function Ul(n, e) {
  const t = {}, o = i(n, [
    "sdkHttpResponse"
  ]);
  o != null && s(t, ["sdkHttpResponse"], o);
  const r = i(n, ["embeddings"]);
  if (r != null) {
    let a = r;
    Array.isArray(a) && (a = a.map((u) => u)), s(t, ["embeddings"], a);
  }
  const l = i(n, ["metadata"]);
  return l != null && s(t, ["metadata"], l), t;
}
function Ll(n, e) {
  const t = {}, o = i(n, [
    "sdkHttpResponse"
  ]);
  o != null && s(t, ["sdkHttpResponse"], o);
  const r = i(n, [
    "predictions[]",
    "embeddings"
  ]);
  if (r != null) {
    let a = r;
    Array.isArray(a) && (a = a.map((u) => pl(u))), s(t, ["embeddings"], a);
  }
  const l = i(n, ["metadata"]);
  if (l != null && s(t, ["metadata"], l), e && i(e, ["embeddingApiType"]) === "EMBED_CONTENT") {
    const a = i(n, ["embedding"]), u = i(n, ["usageMetadata"]), f = i(n, ["truncated"]);
    if (a) {
      const d = {};
      u && u.promptTokenCount && (d.tokenCount = u.promptTokenCount), f && (d.truncated = f), a.statistics = d, s(t, ["embeddings"], [a]);
    }
  }
  return t;
}
function kl(n, e) {
  const t = {}, o = i(n, ["endpoint"]);
  o != null && s(t, ["name"], o);
  const r = i(n, [
    "deployedModelId"
  ]);
  return r != null && s(t, ["deployedModelId"], r), t;
}
function Gl(n, e) {
  const t = {};
  if (i(n, ["displayName"]) !== void 0)
    throw new Error("displayName parameter is not supported in Gemini API.");
  const o = i(n, ["fileUri"]);
  o != null && s(t, ["fileUri"], o);
  const r = i(n, ["mimeType"]);
  return r != null && s(t, ["mimeType"], r), t;
}
function Fl(n, e) {
  const t = {}, o = i(n, ["id"]);
  o != null && s(t, ["id"], o);
  const r = i(n, ["args"]);
  r != null && s(t, ["args"], r);
  const l = i(n, ["name"]);
  if (l != null && s(t, ["name"], l), i(n, ["partialArgs"]) !== void 0)
    throw new Error("partialArgs parameter is not supported in Gemini API.");
  if (i(n, ["willContinue"]) !== void 0)
    throw new Error("willContinue parameter is not supported in Gemini API.");
  return t;
}
function Vl(n, e) {
  const t = {}, o = i(n, [
    "allowedFunctionNames"
  ]);
  o != null && s(t, ["allowedFunctionNames"], o);
  const r = i(n, ["mode"]);
  if (r != null && s(t, ["mode"], r), i(n, ["streamFunctionCallArguments"]) !== void 0)
    throw new Error("streamFunctionCallArguments parameter is not supported in Gemini API.");
  return t;
}
function ql(n, e) {
  const t = {}, o = i(n, ["description"]);
  o != null && s(t, ["description"], o);
  const r = i(n, ["name"]);
  r != null && s(t, ["name"], r);
  const l = i(n, ["parameters"]);
  l != null && s(t, ["parameters"], l);
  const a = i(n, [
    "parametersJsonSchema"
  ]);
  a != null && s(t, ["parametersJsonSchema"], a);
  const u = i(n, ["response"]);
  u != null && s(t, ["response"], u);
  const f = i(n, [
    "responseJsonSchema"
  ]);
  if (f != null && s(t, ["responseJsonSchema"], f), i(n, ["behavior"]) !== void 0)
    throw new Error("behavior parameter is not supported in Vertex AI.");
  return t;
}
function Hl(n, e, t, o) {
  const r = {}, l = i(e, [
    "systemInstruction"
  ]);
  t !== void 0 && l != null && s(t, ["systemInstruction"], pe(k(l)));
  const a = i(e, ["temperature"]);
  a != null && s(r, ["temperature"], a);
  const u = i(e, ["topP"]);
  u != null && s(r, ["topP"], u);
  const f = i(e, ["topK"]);
  f != null && s(r, ["topK"], f);
  const d = i(e, [
    "candidateCount"
  ]);
  d != null && s(r, ["candidateCount"], d);
  const c = i(e, [
    "maxOutputTokens"
  ]);
  c != null && s(r, ["maxOutputTokens"], c);
  const m = i(e, [
    "stopSequences"
  ]);
  m != null && s(r, ["stopSequences"], m);
  const p = i(e, [
    "responseLogprobs"
  ]);
  p != null && s(r, ["responseLogprobs"], p);
  const h = i(e, ["logprobs"]);
  h != null && s(r, ["logprobs"], h);
  const g = i(e, [
    "presencePenalty"
  ]);
  g != null && s(r, ["presencePenalty"], g);
  const T = i(e, [
    "frequencyPenalty"
  ]);
  T != null && s(r, ["frequencyPenalty"], T);
  const y = i(e, ["seed"]);
  y != null && s(r, ["seed"], y);
  const _ = i(e, [
    "responseMimeType"
  ]);
  _ != null && s(r, ["responseMimeType"], _);
  const S = i(e, [
    "responseSchema"
  ]);
  S != null && s(r, ["responseSchema"], un(S));
  const C = i(e, [
    "responseJsonSchema"
  ]);
  if (C != null && s(r, ["responseJsonSchema"], C), i(e, ["routingConfig"]) !== void 0)
    throw new Error("routingConfig parameter is not supported in Gemini API.");
  if (i(e, ["modelSelectionConfig"]) !== void 0)
    throw new Error("modelSelectionConfig parameter is not supported in Gemini API.");
  const A = i(e, [
    "safetySettings"
  ]);
  if (t !== void 0 && A != null) {
    let U = A;
    Array.isArray(U) && (U = U.map((K) => Na(K))), s(t, ["safetySettings"], U);
  }
  const R = i(e, ["tools"]);
  if (t !== void 0 && R != null) {
    let U = le(R);
    Array.isArray(U) && (U = U.map((K) => Fa(se(K)))), s(t, ["tools"], U);
  }
  const E = i(e, ["toolConfig"]);
  if (t !== void 0 && E != null && s(t, ["toolConfig"], Ga(E)), i(e, ["labels"]) !== void 0)
    throw new Error("labels parameter is not supported in Gemini API.");
  const w = i(e, [
    "cachedContent"
  ]);
  t !== void 0 && w != null && s(t, ["cachedContent"], z(n, w));
  const D = i(e, [
    "responseModalities"
  ]);
  D != null && s(r, ["responseModalities"], D);
  const v = i(e, [
    "mediaResolution"
  ]);
  v != null && s(r, ["mediaResolution"], v);
  const M = i(e, ["speechConfig"]);
  if (M != null && s(r, ["speechConfig"], dn(M)), i(e, ["audioTimestamp"]) !== void 0)
    throw new Error("audioTimestamp parameter is not supported in Gemini API.");
  const x = i(e, [
    "thinkingConfig"
  ]);
  x != null && s(r, ["thinkingConfig"], x);
  const q = i(e, ["imageConfig"]);
  q != null && s(r, ["imageConfig"], pa(q));
  const L = i(e, [
    "enableEnhancedCivicAnswers"
  ]);
  if (L != null && s(r, ["enableEnhancedCivicAnswers"], L), i(e, ["modelArmorConfig"]) !== void 0)
    throw new Error("modelArmorConfig parameter is not supported in Gemini API.");
  return r;
}
function Bl(n, e, t, o) {
  const r = {}, l = i(e, [
    "systemInstruction"
  ]);
  t !== void 0 && l != null && s(t, ["systemInstruction"], k(l));
  const a = i(e, ["temperature"]);
  a != null && s(r, ["temperature"], a);
  const u = i(e, ["topP"]);
  u != null && s(r, ["topP"], u);
  const f = i(e, ["topK"]);
  f != null && s(r, ["topK"], f);
  const d = i(e, [
    "candidateCount"
  ]);
  d != null && s(r, ["candidateCount"], d);
  const c = i(e, [
    "maxOutputTokens"
  ]);
  c != null && s(r, ["maxOutputTokens"], c);
  const m = i(e, [
    "stopSequences"
  ]);
  m != null && s(r, ["stopSequences"], m);
  const p = i(e, [
    "responseLogprobs"
  ]);
  p != null && s(r, ["responseLogprobs"], p);
  const h = i(e, ["logprobs"]);
  h != null && s(r, ["logprobs"], h);
  const g = i(e, [
    "presencePenalty"
  ]);
  g != null && s(r, ["presencePenalty"], g);
  const T = i(e, [
    "frequencyPenalty"
  ]);
  T != null && s(r, ["frequencyPenalty"], T);
  const y = i(e, ["seed"]);
  y != null && s(r, ["seed"], y);
  const _ = i(e, [
    "responseMimeType"
  ]);
  _ != null && s(r, ["responseMimeType"], _);
  const S = i(e, [
    "responseSchema"
  ]);
  S != null && s(r, ["responseSchema"], un(S));
  const C = i(e, [
    "responseJsonSchema"
  ]);
  C != null && s(r, ["responseJsonSchema"], C);
  const A = i(e, [
    "routingConfig"
  ]);
  A != null && s(r, ["routingConfig"], A);
  const R = i(e, [
    "modelSelectionConfig"
  ]);
  R != null && s(r, ["modelConfig"], R);
  const E = i(e, [
    "safetySettings"
  ]);
  if (t !== void 0 && E != null) {
    let O = E;
    Array.isArray(O) && (O = O.map((Le) => Le)), s(t, ["safetySettings"], O);
  }
  const w = i(e, ["tools"]);
  if (t !== void 0 && w != null) {
    let O = le(w);
    Array.isArray(O) && (O = O.map((Le) => So(se(Le)))), s(t, ["tools"], O);
  }
  const D = i(e, ["toolConfig"]);
  t !== void 0 && D != null && s(t, ["toolConfig"], D);
  const v = i(e, ["labels"]);
  t !== void 0 && v != null && s(t, ["labels"], v);
  const M = i(e, [
    "cachedContent"
  ]);
  t !== void 0 && M != null && s(t, ["cachedContent"], z(n, M));
  const x = i(e, [
    "responseModalities"
  ]);
  x != null && s(r, ["responseModalities"], x);
  const q = i(e, [
    "mediaResolution"
  ]);
  q != null && s(r, ["mediaResolution"], q);
  const L = i(e, ["speechConfig"]);
  L != null && s(r, ["speechConfig"], dn(L));
  const U = i(e, [
    "audioTimestamp"
  ]);
  U != null && s(r, ["audioTimestamp"], U);
  const K = i(e, [
    "thinkingConfig"
  ]);
  K != null && s(r, ["thinkingConfig"], K);
  const Z = i(e, ["imageConfig"]);
  if (Z != null && s(r, ["imageConfig"], ma(Z)), i(e, ["enableEnhancedCivicAnswers"]) !== void 0)
    throw new Error("enableEnhancedCivicAnswers parameter is not supported in Vertex AI.");
  const me = i(e, [
    "modelArmorConfig"
  ]);
  return t !== void 0 && me != null && s(t, ["modelArmorConfig"], me), r;
}
function Ht(n, e, t) {
  const o = {}, r = i(e, ["model"]);
  r != null && s(o, ["_url", "model"], N(n, r));
  const l = i(e, ["contents"]);
  if (l != null) {
    let u = H(l);
    Array.isArray(u) && (u = u.map((f) => pe(f))), s(o, ["contents"], u);
  }
  const a = i(e, ["config"]);
  return a != null && s(o, ["generationConfig"], Hl(n, a, o)), o;
}
function Bt(n, e, t) {
  const o = {}, r = i(e, ["model"]);
  r != null && s(o, ["_url", "model"], N(n, r));
  const l = i(e, ["contents"]);
  if (l != null) {
    let u = H(l);
    Array.isArray(u) && (u = u.map((f) => f)), s(o, ["contents"], u);
  }
  const a = i(e, ["config"]);
  return a != null && s(o, ["generationConfig"], Bl(n, a, o)), o;
}
function bt(n, e) {
  const t = {}, o = i(n, [
    "sdkHttpResponse"
  ]);
  o != null && s(t, ["sdkHttpResponse"], o);
  const r = i(n, ["candidates"]);
  if (r != null) {
    let d = r;
    Array.isArray(d) && (d = d.map((c) => ul(c))), s(t, ["candidates"], d);
  }
  const l = i(n, ["modelVersion"]);
  l != null && s(t, ["modelVersion"], l);
  const a = i(n, [
    "promptFeedback"
  ]);
  a != null && s(t, ["promptFeedback"], a);
  const u = i(n, ["responseId"]);
  u != null && s(t, ["responseId"], u);
  const f = i(n, [
    "usageMetadata"
  ]);
  return f != null && s(t, ["usageMetadata"], f), t;
}
function Jt(n, e) {
  const t = {}, o = i(n, [
    "sdkHttpResponse"
  ]);
  o != null && s(t, ["sdkHttpResponse"], o);
  const r = i(n, ["candidates"]);
  if (r != null) {
    let c = r;
    Array.isArray(c) && (c = c.map((m) => m)), s(t, ["candidates"], c);
  }
  const l = i(n, ["createTime"]);
  l != null && s(t, ["createTime"], l);
  const a = i(n, ["modelVersion"]);
  a != null && s(t, ["modelVersion"], a);
  const u = i(n, [
    "promptFeedback"
  ]);
  u != null && s(t, ["promptFeedback"], u);
  const f = i(n, ["responseId"]);
  f != null && s(t, ["responseId"], f);
  const d = i(n, [
    "usageMetadata"
  ]);
  return d != null && s(t, ["usageMetadata"], d), t;
}
function bl(n, e, t) {
  const o = {};
  if (i(n, ["outputGcsUri"]) !== void 0)
    throw new Error("outputGcsUri parameter is not supported in Gemini API.");
  if (i(n, ["negativePrompt"]) !== void 0)
    throw new Error("negativePrompt parameter is not supported in Gemini API.");
  const r = i(n, [
    "numberOfImages"
  ]);
  e !== void 0 && r != null && s(e, ["parameters", "sampleCount"], r);
  const l = i(n, ["aspectRatio"]);
  e !== void 0 && l != null && s(e, ["parameters", "aspectRatio"], l);
  const a = i(n, [
    "guidanceScale"
  ]);
  if (e !== void 0 && a != null && s(e, ["parameters", "guidanceScale"], a), i(n, ["seed"]) !== void 0)
    throw new Error("seed parameter is not supported in Gemini API.");
  const u = i(n, [
    "safetyFilterLevel"
  ]);
  e !== void 0 && u != null && s(e, ["parameters", "safetySetting"], u);
  const f = i(n, [
    "personGeneration"
  ]);
  e !== void 0 && f != null && s(e, ["parameters", "personGeneration"], f);
  const d = i(n, [
    "includeSafetyAttributes"
  ]);
  e !== void 0 && d != null && s(e, ["parameters", "includeSafetyAttributes"], d);
  const c = i(n, [
    "includeRaiReason"
  ]);
  e !== void 0 && c != null && s(e, ["parameters", "includeRaiReason"], c);
  const m = i(n, ["language"]);
  e !== void 0 && m != null && s(e, ["parameters", "language"], m);
  const p = i(n, [
    "outputMimeType"
  ]);
  e !== void 0 && p != null && s(e, ["parameters", "outputOptions", "mimeType"], p);
  const h = i(n, [
    "outputCompressionQuality"
  ]);
  if (e !== void 0 && h != null && s(e, ["parameters", "outputOptions", "compressionQuality"], h), i(n, ["addWatermark"]) !== void 0)
    throw new Error("addWatermark parameter is not supported in Gemini API.");
  if (i(n, ["labels"]) !== void 0)
    throw new Error("labels parameter is not supported in Gemini API.");
  const g = i(n, ["imageSize"]);
  if (e !== void 0 && g != null && s(e, ["parameters", "sampleImageSize"], g), i(n, ["enhancePrompt"]) !== void 0)
    throw new Error("enhancePrompt parameter is not supported in Gemini API.");
  return o;
}
function Jl(n, e, t) {
  const o = {}, r = i(n, ["outputGcsUri"]);
  e !== void 0 && r != null && s(e, ["parameters", "storageUri"], r);
  const l = i(n, [
    "negativePrompt"
  ]);
  e !== void 0 && l != null && s(e, ["parameters", "negativePrompt"], l);
  const a = i(n, [
    "numberOfImages"
  ]);
  e !== void 0 && a != null && s(e, ["parameters", "sampleCount"], a);
  const u = i(n, ["aspectRatio"]);
  e !== void 0 && u != null && s(e, ["parameters", "aspectRatio"], u);
  const f = i(n, [
    "guidanceScale"
  ]);
  e !== void 0 && f != null && s(e, ["parameters", "guidanceScale"], f);
  const d = i(n, ["seed"]);
  e !== void 0 && d != null && s(e, ["parameters", "seed"], d);
  const c = i(n, [
    "safetyFilterLevel"
  ]);
  e !== void 0 && c != null && s(e, ["parameters", "safetySetting"], c);
  const m = i(n, [
    "personGeneration"
  ]);
  e !== void 0 && m != null && s(e, ["parameters", "personGeneration"], m);
  const p = i(n, [
    "includeSafetyAttributes"
  ]);
  e !== void 0 && p != null && s(e, ["parameters", "includeSafetyAttributes"], p);
  const h = i(n, [
    "includeRaiReason"
  ]);
  e !== void 0 && h != null && s(e, ["parameters", "includeRaiReason"], h);
  const g = i(n, ["language"]);
  e !== void 0 && g != null && s(e, ["parameters", "language"], g);
  const T = i(n, [
    "outputMimeType"
  ]);
  e !== void 0 && T != null && s(e, ["parameters", "outputOptions", "mimeType"], T);
  const y = i(n, [
    "outputCompressionQuality"
  ]);
  e !== void 0 && y != null && s(e, ["parameters", "outputOptions", "compressionQuality"], y);
  const _ = i(n, ["addWatermark"]);
  e !== void 0 && _ != null && s(e, ["parameters", "addWatermark"], _);
  const S = i(n, ["labels"]);
  e !== void 0 && S != null && s(e, ["labels"], S);
  const C = i(n, ["imageSize"]);
  e !== void 0 && C != null && s(e, ["parameters", "sampleImageSize"], C);
  const A = i(n, [
    "enhancePrompt"
  ]);
  return e !== void 0 && A != null && s(e, ["parameters", "enhancePrompt"], A), o;
}
function $l(n, e, t) {
  const o = {}, r = i(e, ["model"]);
  r != null && s(o, ["_url", "model"], N(n, r));
  const l = i(e, ["prompt"]);
  l != null && s(o, ["instances[0]", "prompt"], l);
  const a = i(e, ["config"]);
  return a != null && bl(a, o), o;
}
function Kl(n, e, t) {
  const o = {}, r = i(e, ["model"]);
  r != null && s(o, ["_url", "model"], N(n, r));
  const l = i(e, ["prompt"]);
  l != null && s(o, ["instances[0]", "prompt"], l);
  const a = i(e, ["config"]);
  return a != null && Jl(a, o), o;
}
function Ol(n, e) {
  const t = {}, o = i(n, [
    "sdkHttpResponse"
  ]);
  o != null && s(t, ["sdkHttpResponse"], o);
  const r = i(n, [
    "predictions"
  ]);
  if (r != null) {
    let a = r;
    Array.isArray(a) && (a = a.map((u) => ia(u))), s(t, ["generatedImages"], a);
  }
  const l = i(n, [
    "positivePromptSafetyAttributes"
  ]);
  return l != null && s(t, ["positivePromptSafetyAttributes"], Co(l)), t;
}
function Wl(n, e) {
  const t = {}, o = i(n, [
    "sdkHttpResponse"
  ]);
  o != null && s(t, ["sdkHttpResponse"], o);
  const r = i(n, [
    "predictions"
  ]);
  if (r != null) {
    let a = r;
    Array.isArray(a) && (a = a.map((u) => Me(u))), s(t, ["generatedImages"], a);
  }
  const l = i(n, [
    "positivePromptSafetyAttributes"
  ]);
  return l != null && s(t, ["positivePromptSafetyAttributes"], Io(l)), t;
}
function Yl(n, e, t) {
  const o = {}, r = i(n, [
    "numberOfVideos"
  ]);
  if (e !== void 0 && r != null && s(e, ["parameters", "sampleCount"], r), i(n, ["outputGcsUri"]) !== void 0)
    throw new Error("outputGcsUri parameter is not supported in Gemini API.");
  if (i(n, ["fps"]) !== void 0)
    throw new Error("fps parameter is not supported in Gemini API.");
  const l = i(n, [
    "durationSeconds"
  ]);
  if (e !== void 0 && l != null && s(e, ["parameters", "durationSeconds"], l), i(n, ["seed"]) !== void 0)
    throw new Error("seed parameter is not supported in Gemini API.");
  const a = i(n, ["aspectRatio"]);
  e !== void 0 && a != null && s(e, ["parameters", "aspectRatio"], a);
  const u = i(n, ["resolution"]);
  e !== void 0 && u != null && s(e, ["parameters", "resolution"], u);
  const f = i(n, [
    "personGeneration"
  ]);
  if (e !== void 0 && f != null && s(e, ["parameters", "personGeneration"], f), i(n, ["pubsubTopic"]) !== void 0)
    throw new Error("pubsubTopic parameter is not supported in Gemini API.");
  const d = i(n, [
    "negativePrompt"
  ]);
  e !== void 0 && d != null && s(e, ["parameters", "negativePrompt"], d);
  const c = i(n, [
    "enhancePrompt"
  ]);
  if (e !== void 0 && c != null && s(e, ["parameters", "enhancePrompt"], c), i(n, ["generateAudio"]) !== void 0)
    throw new Error("generateAudio parameter is not supported in Gemini API.");
  const m = i(n, ["lastFrame"]);
  e !== void 0 && m != null && s(e, ["instances[0]", "lastFrame"], Ne(m));
  const p = i(n, [
    "referenceImages"
  ]);
  if (e !== void 0 && p != null) {
    let h = p;
    Array.isArray(h) && (h = h.map((g) => Qa(g))), s(e, ["instances[0]", "referenceImages"], h);
  }
  if (i(n, ["mask"]) !== void 0)
    throw new Error("mask parameter is not supported in Gemini API.");
  if (i(n, ["compressionQuality"]) !== void 0)
    throw new Error("compressionQuality parameter is not supported in Gemini API.");
  return o;
}
function zl(n, e, t) {
  const o = {}, r = i(n, [
    "numberOfVideos"
  ]);
  e !== void 0 && r != null && s(e, ["parameters", "sampleCount"], r);
  const l = i(n, ["outputGcsUri"]);
  e !== void 0 && l != null && s(e, ["parameters", "storageUri"], l);
  const a = i(n, ["fps"]);
  e !== void 0 && a != null && s(e, ["parameters", "fps"], a);
  const u = i(n, [
    "durationSeconds"
  ]);
  e !== void 0 && u != null && s(e, ["parameters", "durationSeconds"], u);
  const f = i(n, ["seed"]);
  e !== void 0 && f != null && s(e, ["parameters", "seed"], f);
  const d = i(n, ["aspectRatio"]);
  e !== void 0 && d != null && s(e, ["parameters", "aspectRatio"], d);
  const c = i(n, ["resolution"]);
  e !== void 0 && c != null && s(e, ["parameters", "resolution"], c);
  const m = i(n, [
    "personGeneration"
  ]);
  e !== void 0 && m != null && s(e, ["parameters", "personGeneration"], m);
  const p = i(n, ["pubsubTopic"]);
  e !== void 0 && p != null && s(e, ["parameters", "pubsubTopic"], p);
  const h = i(n, [
    "negativePrompt"
  ]);
  e !== void 0 && h != null && s(e, ["parameters", "negativePrompt"], h);
  const g = i(n, [
    "enhancePrompt"
  ]);
  e !== void 0 && g != null && s(e, ["parameters", "enhancePrompt"], g);
  const T = i(n, [
    "generateAudio"
  ]);
  e !== void 0 && T != null && s(e, ["parameters", "generateAudio"], T);
  const y = i(n, ["lastFrame"]);
  e !== void 0 && y != null && s(e, ["instances[0]", "lastFrame"], $(y));
  const _ = i(n, [
    "referenceImages"
  ]);
  if (e !== void 0 && _ != null) {
    let A = _;
    Array.isArray(A) && (A = A.map((R) => Xa(R))), s(e, ["instances[0]", "referenceImages"], A);
  }
  const S = i(n, ["mask"]);
  e !== void 0 && S != null && s(e, ["instances[0]", "mask"], za(S));
  const C = i(n, [
    "compressionQuality"
  ]);
  return e !== void 0 && C != null && s(e, ["parameters", "compressionQuality"], C), o;
}
function Ql(n, e) {
  const t = {}, o = i(n, ["name"]);
  o != null && s(t, ["name"], o);
  const r = i(n, ["metadata"]);
  r != null && s(t, ["metadata"], r);
  const l = i(n, ["done"]);
  l != null && s(t, ["done"], l);
  const a = i(n, ["error"]);
  a != null && s(t, ["error"], a);
  const u = i(n, [
    "response",
    "generateVideoResponse"
  ]);
  return u != null && s(t, ["response"], ea(u)), t;
}
function Xl(n, e) {
  const t = {}, o = i(n, ["name"]);
  o != null && s(t, ["name"], o);
  const r = i(n, ["metadata"]);
  r != null && s(t, ["metadata"], r);
  const l = i(n, ["done"]);
  l != null && s(t, ["done"], l);
  const a = i(n, ["error"]);
  a != null && s(t, ["error"], a);
  const u = i(n, ["response"]);
  return u != null && s(t, ["response"], na(u)), t;
}
function Zl(n, e, t) {
  const o = {}, r = i(e, ["model"]);
  r != null && s(o, ["_url", "model"], N(n, r));
  const l = i(e, ["prompt"]);
  l != null && s(o, ["instances[0]", "prompt"], l);
  const a = i(e, ["image"]);
  a != null && s(o, ["instances[0]", "image"], Ne(a));
  const u = i(e, ["video"]);
  u != null && s(o, ["instances[0]", "video"], Ao(u));
  const f = i(e, ["source"]);
  f != null && ta(f, o);
  const d = i(e, ["config"]);
  return d != null && Yl(d, o), o;
}
function jl(n, e, t) {
  const o = {}, r = i(e, ["model"]);
  r != null && s(o, ["_url", "model"], N(n, r));
  const l = i(e, ["prompt"]);
  l != null && s(o, ["instances[0]", "prompt"], l);
  const a = i(e, ["image"]);
  a != null && s(o, ["instances[0]", "image"], $(a));
  const u = i(e, ["video"]);
  u != null && s(o, ["instances[0]", "video"], vo(u));
  const f = i(e, ["source"]);
  f != null && oa(f, o);
  const d = i(e, ["config"]);
  return d != null && zl(d, o), o;
}
function ea(n, e) {
  const t = {}, o = i(n, [
    "generatedSamples"
  ]);
  if (o != null) {
    let a = o;
    Array.isArray(a) && (a = a.map((u) => sa(u))), s(t, ["generatedVideos"], a);
  }
  const r = i(n, [
    "raiMediaFilteredCount"
  ]);
  r != null && s(t, ["raiMediaFilteredCount"], r);
  const l = i(n, [
    "raiMediaFilteredReasons"
  ]);
  return l != null && s(t, ["raiMediaFilteredReasons"], l), t;
}
function na(n, e) {
  const t = {}, o = i(n, ["videos"]);
  if (o != null) {
    let a = o;
    Array.isArray(a) && (a = a.map((u) => la(u))), s(t, ["generatedVideos"], a);
  }
  const r = i(n, [
    "raiMediaFilteredCount"
  ]);
  r != null && s(t, ["raiMediaFilteredCount"], r);
  const l = i(n, [
    "raiMediaFilteredReasons"
  ]);
  return l != null && s(t, ["raiMediaFilteredReasons"], l), t;
}
function ta(n, e, t) {
  const o = {}, r = i(n, ["prompt"]);
  e !== void 0 && r != null && s(e, ["instances[0]", "prompt"], r);
  const l = i(n, ["image"]);
  e !== void 0 && l != null && s(e, ["instances[0]", "image"], Ne(l));
  const a = i(n, ["video"]);
  return e !== void 0 && a != null && s(e, ["instances[0]", "video"], Ao(a)), o;
}
function oa(n, e, t) {
  const o = {}, r = i(n, ["prompt"]);
  e !== void 0 && r != null && s(e, ["instances[0]", "prompt"], r);
  const l = i(n, ["image"]);
  e !== void 0 && l != null && s(e, ["instances[0]", "image"], $(l));
  const a = i(n, ["video"]);
  return e !== void 0 && a != null && s(e, ["instances[0]", "video"], vo(a)), o;
}
function ia(n, e) {
  const t = {}, o = i(n, ["_self"]);
  o != null && s(t, ["image"], ha(o));
  const r = i(n, [
    "raiFilteredReason"
  ]);
  r != null && s(t, ["raiFilteredReason"], r);
  const l = i(n, ["_self"]);
  return l != null && s(t, ["safetyAttributes"], Co(l)), t;
}
function Me(n, e) {
  const t = {}, o = i(n, ["_self"]);
  o != null && s(t, ["image"], Eo(o));
  const r = i(n, [
    "raiFilteredReason"
  ]);
  r != null && s(t, ["raiFilteredReason"], r);
  const l = i(n, ["_self"]);
  l != null && s(t, ["safetyAttributes"], Io(l));
  const a = i(n, ["prompt"]);
  return a != null && s(t, ["enhancedPrompt"], a), t;
}
function ra(n, e) {
  const t = {}, o = i(n, ["_self"]);
  o != null && s(t, ["mask"], Eo(o));
  const r = i(n, ["labels"]);
  if (r != null) {
    let l = r;
    Array.isArray(l) && (l = l.map((a) => a)), s(t, ["labels"], l);
  }
  return t;
}
function sa(n, e) {
  const t = {}, o = i(n, ["video"]);
  return o != null && s(t, ["video"], Wa(o)), t;
}
function la(n, e) {
  const t = {}, o = i(n, ["_self"]);
  return o != null && s(t, ["video"], Ya(o)), t;
}
function aa(n, e) {
  const t = {}, o = i(n, [
    "modelSelectionConfig"
  ]);
  o != null && s(t, ["modelConfig"], o);
  const r = i(n, [
    "responseJsonSchema"
  ]);
  r != null && s(t, ["responseJsonSchema"], r);
  const l = i(n, [
    "audioTimestamp"
  ]);
  l != null && s(t, ["audioTimestamp"], l);
  const a = i(n, [
    "candidateCount"
  ]);
  a != null && s(t, ["candidateCount"], a);
  const u = i(n, [
    "enableAffectiveDialog"
  ]);
  u != null && s(t, ["enableAffectiveDialog"], u);
  const f = i(n, [
    "frequencyPenalty"
  ]);
  f != null && s(t, ["frequencyPenalty"], f);
  const d = i(n, ["logprobs"]);
  d != null && s(t, ["logprobs"], d);
  const c = i(n, [
    "maxOutputTokens"
  ]);
  c != null && s(t, ["maxOutputTokens"], c);
  const m = i(n, [
    "mediaResolution"
  ]);
  m != null && s(t, ["mediaResolution"], m);
  const p = i(n, [
    "presencePenalty"
  ]);
  p != null && s(t, ["presencePenalty"], p);
  const h = i(n, [
    "responseLogprobs"
  ]);
  h != null && s(t, ["responseLogprobs"], h);
  const g = i(n, [
    "responseMimeType"
  ]);
  g != null && s(t, ["responseMimeType"], g);
  const T = i(n, [
    "responseModalities"
  ]);
  T != null && s(t, ["responseModalities"], T);
  const y = i(n, [
    "responseSchema"
  ]);
  y != null && s(t, ["responseSchema"], y);
  const _ = i(n, [
    "routingConfig"
  ]);
  _ != null && s(t, ["routingConfig"], _);
  const S = i(n, ["seed"]);
  S != null && s(t, ["seed"], S);
  const C = i(n, ["speechConfig"]);
  C != null && s(t, ["speechConfig"], C);
  const A = i(n, [
    "stopSequences"
  ]);
  A != null && s(t, ["stopSequences"], A);
  const R = i(n, ["temperature"]);
  R != null && s(t, ["temperature"], R);
  const E = i(n, [
    "thinkingConfig"
  ]);
  E != null && s(t, ["thinkingConfig"], E);
  const w = i(n, ["topK"]);
  w != null && s(t, ["topK"], w);
  const D = i(n, ["topP"]);
  if (D != null && s(t, ["topP"], D), i(n, ["enableEnhancedCivicAnswers"]) !== void 0)
    throw new Error("enableEnhancedCivicAnswers parameter is not supported in Vertex AI.");
  return t;
}
function ua(n, e, t) {
  const o = {}, r = i(e, ["model"]);
  return r != null && s(o, ["_url", "name"], N(n, r)), o;
}
function da(n, e, t) {
  const o = {}, r = i(e, ["model"]);
  return r != null && s(o, ["_url", "name"], N(n, r)), o;
}
function fa(n, e) {
  const t = {}, o = i(n, ["authConfig"]);
  o != null && s(t, ["authConfig"], ll(o));
  const r = i(n, ["enableWidget"]);
  return r != null && s(t, ["enableWidget"], r), t;
}
function ca(n, e) {
  const t = {}, o = i(n, ["searchTypes"]);
  if (o != null && s(t, ["searchTypes"], o), i(n, ["blockingConfidence"]) !== void 0)
    throw new Error("blockingConfidence parameter is not supported in Gemini API.");
  if (i(n, ["excludeDomains"]) !== void 0)
    throw new Error("excludeDomains parameter is not supported in Gemini API.");
  const r = i(n, [
    "timeRangeFilter"
  ]);
  return r != null && s(t, ["timeRangeFilter"], r), t;
}
function pa(n, e) {
  const t = {}, o = i(n, ["aspectRatio"]);
  o != null && s(t, ["aspectRatio"], o);
  const r = i(n, ["imageSize"]);
  if (r != null && s(t, ["imageSize"], r), i(n, ["personGeneration"]) !== void 0)
    throw new Error("personGeneration parameter is not supported in Gemini API.");
  if (i(n, ["prominentPeople"]) !== void 0)
    throw new Error("prominentPeople parameter is not supported in Gemini API.");
  if (i(n, ["outputMimeType"]) !== void 0)
    throw new Error("outputMimeType parameter is not supported in Gemini API.");
  if (i(n, ["outputCompressionQuality"]) !== void 0)
    throw new Error("outputCompressionQuality parameter is not supported in Gemini API.");
  if (i(n, ["imageOutputOptions"]) !== void 0)
    throw new Error("imageOutputOptions parameter is not supported in Gemini API.");
  return t;
}
function ma(n, e) {
  const t = {}, o = i(n, ["aspectRatio"]);
  o != null && s(t, ["aspectRatio"], o);
  const r = i(n, ["imageSize"]);
  r != null && s(t, ["imageSize"], r);
  const l = i(n, [
    "personGeneration"
  ]);
  l != null && s(t, ["personGeneration"], l);
  const a = i(n, [
    "prominentPeople"
  ]);
  a != null && s(t, ["prominentPeople"], a);
  const u = i(n, [
    "outputMimeType"
  ]);
  u != null && s(t, ["imageOutputOptions", "mimeType"], u);
  const f = i(n, [
    "outputCompressionQuality"
  ]);
  f != null && s(t, ["imageOutputOptions", "compressionQuality"], f);
  const d = i(n, [
    "imageOutputOptions"
  ]);
  return d != null && s(t, ["imageOutputOptions"], d), t;
}
function ha(n, e) {
  const t = {}, o = i(n, [
    "bytesBase64Encoded"
  ]);
  o != null && s(t, ["imageBytes"], X(o));
  const r = i(n, ["mimeType"]);
  return r != null && s(t, ["mimeType"], r), t;
}
function Eo(n, e) {
  const t = {}, o = i(n, ["gcsUri"]);
  o != null && s(t, ["gcsUri"], o);
  const r = i(n, [
    "bytesBase64Encoded"
  ]);
  r != null && s(t, ["imageBytes"], X(r));
  const l = i(n, ["mimeType"]);
  return l != null && s(t, ["mimeType"], l), t;
}
function Ne(n, e) {
  const t = {};
  if (i(n, ["gcsUri"]) !== void 0)
    throw new Error("gcsUri parameter is not supported in Gemini API.");
  const o = i(n, ["imageBytes"]);
  o != null && s(t, ["bytesBase64Encoded"], X(o));
  const r = i(n, ["mimeType"]);
  return r != null && s(t, ["mimeType"], r), t;
}
function $(n, e) {
  const t = {}, o = i(n, ["gcsUri"]);
  o != null && s(t, ["gcsUri"], o);
  const r = i(n, ["imageBytes"]);
  r != null && s(t, ["bytesBase64Encoded"], X(r));
  const l = i(n, ["mimeType"]);
  return l != null && s(t, ["mimeType"], l), t;
}
function ga(n, e, t, o) {
  const r = {}, l = i(e, ["pageSize"]);
  t !== void 0 && l != null && s(t, ["_query", "pageSize"], l);
  const a = i(e, ["pageToken"]);
  t !== void 0 && a != null && s(t, ["_query", "pageToken"], a);
  const u = i(e, ["filter"]);
  t !== void 0 && u != null && s(t, ["_query", "filter"], u);
  const f = i(e, ["queryBase"]);
  return t !== void 0 && f != null && s(t, ["_url", "models_url"], po(n, f)), r;
}
function ya(n, e, t, o) {
  const r = {}, l = i(e, ["pageSize"]);
  t !== void 0 && l != null && s(t, ["_query", "pageSize"], l);
  const a = i(e, ["pageToken"]);
  t !== void 0 && a != null && s(t, ["_query", "pageToken"], a);
  const u = i(e, ["filter"]);
  t !== void 0 && u != null && s(t, ["_query", "filter"], u);
  const f = i(e, ["queryBase"]);
  return t !== void 0 && f != null && s(t, ["_url", "models_url"], po(n, f)), r;
}
function Ta(n, e, t) {
  const o = {}, r = i(e, ["config"]);
  return r != null && ga(n, r, o), o;
}
function _a(n, e, t) {
  const o = {}, r = i(e, ["config"]);
  return r != null && ya(n, r, o), o;
}
function Ea(n, e) {
  const t = {}, o = i(n, [
    "sdkHttpResponse"
  ]);
  o != null && s(t, ["sdkHttpResponse"], o);
  const r = i(n, [
    "nextPageToken"
  ]);
  r != null && s(t, ["nextPageToken"], r);
  const l = i(n, ["_self"]);
  if (l != null) {
    let a = mo(l);
    Array.isArray(a) && (a = a.map((u) => ze(u))), s(t, ["models"], a);
  }
  return t;
}
function Ca(n, e) {
  const t = {}, o = i(n, [
    "sdkHttpResponse"
  ]);
  o != null && s(t, ["sdkHttpResponse"], o);
  const r = i(n, [
    "nextPageToken"
  ]);
  r != null && s(t, ["nextPageToken"], r);
  const l = i(n, ["_self"]);
  if (l != null) {
    let a = mo(l);
    Array.isArray(a) && (a = a.map((u) => Qe(u))), s(t, ["models"], a);
  }
  return t;
}
function Ia(n, e) {
  const t = {}, o = i(n, ["maskMode"]);
  o != null && s(t, ["maskMode"], o);
  const r = i(n, [
    "segmentationClasses"
  ]);
  r != null && s(t, ["maskClasses"], r);
  const l = i(n, ["maskDilation"]);
  return l != null && s(t, ["dilation"], l), t;
}
function ze(n, e) {
  const t = {}, o = i(n, ["name"]);
  o != null && s(t, ["name"], o);
  const r = i(n, ["displayName"]);
  r != null && s(t, ["displayName"], r);
  const l = i(n, ["description"]);
  l != null && s(t, ["description"], l);
  const a = i(n, ["version"]);
  a != null && s(t, ["version"], a);
  const u = i(n, ["_self"]);
  u != null && s(t, ["tunedModelInfo"], Va(u));
  const f = i(n, [
    "inputTokenLimit"
  ]);
  f != null && s(t, ["inputTokenLimit"], f);
  const d = i(n, [
    "outputTokenLimit"
  ]);
  d != null && s(t, ["outputTokenLimit"], d);
  const c = i(n, [
    "supportedGenerationMethods"
  ]);
  c != null && s(t, ["supportedActions"], c);
  const m = i(n, ["temperature"]);
  m != null && s(t, ["temperature"], m);
  const p = i(n, [
    "maxTemperature"
  ]);
  p != null && s(t, ["maxTemperature"], p);
  const h = i(n, ["topP"]);
  h != null && s(t, ["topP"], h);
  const g = i(n, ["topK"]);
  g != null && s(t, ["topK"], g);
  const T = i(n, ["thinking"]);
  return T != null && s(t, ["thinking"], T), t;
}
function Qe(n, e) {
  const t = {}, o = i(n, ["name"]);
  o != null && s(t, ["name"], o);
  const r = i(n, ["displayName"]);
  r != null && s(t, ["displayName"], r);
  const l = i(n, ["description"]);
  l != null && s(t, ["description"], l);
  const a = i(n, ["versionId"]);
  a != null && s(t, ["version"], a);
  const u = i(n, ["deployedModels"]);
  if (u != null) {
    let p = u;
    Array.isArray(p) && (p = p.map((h) => kl(h))), s(t, ["endpoints"], p);
  }
  const f = i(n, ["labels"]);
  f != null && s(t, ["labels"], f);
  const d = i(n, ["_self"]);
  d != null && s(t, ["tunedModelInfo"], qa(d));
  const c = i(n, [
    "defaultCheckpointId"
  ]);
  c != null && s(t, ["defaultCheckpointId"], c);
  const m = i(n, ["checkpoints"]);
  if (m != null) {
    let p = m;
    Array.isArray(p) && (p = p.map((h) => h)), s(t, ["checkpoints"], p);
  }
  return t;
}
function Sa(n, e) {
  const t = {}, o = i(n, [
    "mediaResolution"
  ]);
  o != null && s(t, ["mediaResolution"], o);
  const r = i(n, [
    "codeExecutionResult"
  ]);
  r != null && s(t, ["codeExecutionResult"], r);
  const l = i(n, [
    "executableCode"
  ]);
  l != null && s(t, ["executableCode"], l);
  const a = i(n, ["fileData"]);
  a != null && s(t, ["fileData"], Gl(a));
  const u = i(n, ["functionCall"]);
  u != null && s(t, ["functionCall"], Fl(u));
  const f = i(n, [
    "functionResponse"
  ]);
  f != null && s(t, ["functionResponse"], f);
  const d = i(n, ["inlineData"]);
  d != null && s(t, ["inlineData"], al(d));
  const c = i(n, ["text"]);
  c != null && s(t, ["text"], c);
  const m = i(n, ["thought"]);
  m != null && s(t, ["thought"], m);
  const p = i(n, [
    "thoughtSignature"
  ]);
  p != null && s(t, ["thoughtSignature"], p);
  const h = i(n, [
    "videoMetadata"
  ]);
  return h != null && s(t, ["videoMetadata"], h), t;
}
function Aa(n, e) {
  const t = {}, o = i(n, ["productImage"]);
  return o != null && s(t, ["image"], $(o)), t;
}
function va(n, e, t) {
  const o = {}, r = i(n, [
    "numberOfImages"
  ]);
  e !== void 0 && r != null && s(e, ["parameters", "sampleCount"], r);
  const l = i(n, ["baseSteps"]);
  e !== void 0 && l != null && s(e, ["parameters", "baseSteps"], l);
  const a = i(n, ["outputGcsUri"]);
  e !== void 0 && a != null && s(e, ["parameters", "storageUri"], a);
  const u = i(n, ["seed"]);
  e !== void 0 && u != null && s(e, ["parameters", "seed"], u);
  const f = i(n, [
    "safetyFilterLevel"
  ]);
  e !== void 0 && f != null && s(e, ["parameters", "safetySetting"], f);
  const d = i(n, [
    "personGeneration"
  ]);
  e !== void 0 && d != null && s(e, ["parameters", "personGeneration"], d);
  const c = i(n, ["addWatermark"]);
  e !== void 0 && c != null && s(e, ["parameters", "addWatermark"], c);
  const m = i(n, [
    "outputMimeType"
  ]);
  e !== void 0 && m != null && s(e, ["parameters", "outputOptions", "mimeType"], m);
  const p = i(n, [
    "outputCompressionQuality"
  ]);
  e !== void 0 && p != null && s(e, ["parameters", "outputOptions", "compressionQuality"], p);
  const h = i(n, [
    "enhancePrompt"
  ]);
  e !== void 0 && h != null && s(e, ["parameters", "enhancePrompt"], h);
  const g = i(n, ["labels"]);
  return e !== void 0 && g != null && s(e, ["labels"], g), o;
}
function Ra(n, e, t) {
  const o = {}, r = i(e, ["model"]);
  r != null && s(o, ["_url", "model"], N(n, r));
  const l = i(e, ["source"]);
  l != null && wa(l, o);
  const a = i(e, ["config"]);
  return a != null && va(a, o), o;
}
function Pa(n, e) {
  const t = {}, o = i(n, [
    "predictions"
  ]);
  if (o != null) {
    let r = o;
    Array.isArray(r) && (r = r.map((l) => Me(l))), s(t, ["generatedImages"], r);
  }
  return t;
}
function wa(n, e, t) {
  const o = {}, r = i(n, ["prompt"]);
  e !== void 0 && r != null && s(e, ["instances[0]", "prompt"], r);
  const l = i(n, ["personImage"]);
  e !== void 0 && l != null && s(e, ["instances[0]", "personImage", "image"], $(l));
  const a = i(n, [
    "productImages"
  ]);
  if (e !== void 0 && a != null) {
    let u = a;
    Array.isArray(u) && (u = u.map((f) => Aa(f))), s(e, ["instances[0]", "productImages"], u);
  }
  return o;
}
function Ma(n, e) {
  const t = {}, o = i(n, [
    "referenceImage"
  ]);
  o != null && s(t, ["referenceImage"], $(o));
  const r = i(n, ["referenceId"]);
  r != null && s(t, ["referenceId"], r);
  const l = i(n, [
    "referenceType"
  ]);
  l != null && s(t, ["referenceType"], l);
  const a = i(n, [
    "maskImageConfig"
  ]);
  a != null && s(t, ["maskImageConfig"], Ia(a));
  const u = i(n, [
    "controlImageConfig"
  ]);
  u != null && s(t, ["controlImageConfig"], hl(u));
  const f = i(n, [
    "styleImageConfig"
  ]);
  f != null && s(t, ["styleImageConfig"], f);
  const d = i(n, [
    "subjectImageConfig"
  ]);
  return d != null && s(t, ["subjectImageConfig"], d), t;
}
function Co(n, e) {
  const t = {}, o = i(n, [
    "safetyAttributes",
    "categories"
  ]);
  o != null && s(t, ["categories"], o);
  const r = i(n, [
    "safetyAttributes",
    "scores"
  ]);
  r != null && s(t, ["scores"], r);
  const l = i(n, ["contentType"]);
  return l != null && s(t, ["contentType"], l), t;
}
function Io(n, e) {
  const t = {}, o = i(n, [
    "safetyAttributes",
    "categories"
  ]);
  o != null && s(t, ["categories"], o);
  const r = i(n, [
    "safetyAttributes",
    "scores"
  ]);
  r != null && s(t, ["scores"], r);
  const l = i(n, ["contentType"]);
  return l != null && s(t, ["contentType"], l), t;
}
function Na(n, e) {
  const t = {}, o = i(n, ["category"]);
  if (o != null && s(t, ["category"], o), i(n, ["method"]) !== void 0)
    throw new Error("method parameter is not supported in Gemini API.");
  const r = i(n, ["threshold"]);
  return r != null && s(t, ["threshold"], r), t;
}
function Da(n, e) {
  const t = {}, o = i(n, ["image"]);
  return o != null && s(t, ["image"], $(o)), t;
}
function xa(n, e, t) {
  const o = {}, r = i(n, ["mode"]);
  e !== void 0 && r != null && s(e, ["parameters", "mode"], r);
  const l = i(n, [
    "maxPredictions"
  ]);
  e !== void 0 && l != null && s(e, ["parameters", "maxPredictions"], l);
  const a = i(n, [
    "confidenceThreshold"
  ]);
  e !== void 0 && a != null && s(e, ["parameters", "confidenceThreshold"], a);
  const u = i(n, ["maskDilation"]);
  e !== void 0 && u != null && s(e, ["parameters", "maskDilation"], u);
  const f = i(n, [
    "binaryColorThreshold"
  ]);
  e !== void 0 && f != null && s(e, ["parameters", "binaryColorThreshold"], f);
  const d = i(n, ["labels"]);
  return e !== void 0 && d != null && s(e, ["labels"], d), o;
}
function Ua(n, e, t) {
  const o = {}, r = i(e, ["model"]);
  r != null && s(o, ["_url", "model"], N(n, r));
  const l = i(e, ["source"]);
  l != null && ka(l, o);
  const a = i(e, ["config"]);
  return a != null && xa(a, o), o;
}
function La(n, e) {
  const t = {}, o = i(n, ["predictions"]);
  if (o != null) {
    let r = o;
    Array.isArray(r) && (r = r.map((l) => ra(l))), s(t, ["generatedMasks"], r);
  }
  return t;
}
function ka(n, e, t) {
  const o = {}, r = i(n, ["prompt"]);
  e !== void 0 && r != null && s(e, ["instances[0]", "prompt"], r);
  const l = i(n, ["image"]);
  e !== void 0 && l != null && s(e, ["instances[0]", "image"], $(l));
  const a = i(n, [
    "scribbleImage"
  ]);
  return e !== void 0 && a != null && s(e, ["instances[0]", "scribble"], Da(a)), o;
}
function Ga(n, e) {
  const t = {}, o = i(n, [
    "retrievalConfig"
  ]);
  o != null && s(t, ["retrievalConfig"], o);
  const r = i(n, [
    "functionCallingConfig"
  ]);
  return r != null && s(t, ["functionCallingConfig"], Vl(r)), t;
}
function Fa(n, e) {
  const t = {};
  if (i(n, ["retrieval"]) !== void 0)
    throw new Error("retrieval parameter is not supported in Gemini API.");
  const o = i(n, ["computerUse"]);
  o != null && s(t, ["computerUse"], o);
  const r = i(n, ["fileSearch"]);
  r != null && s(t, ["fileSearch"], r);
  const l = i(n, ["googleSearch"]);
  l != null && s(t, ["googleSearch"], ca(l));
  const a = i(n, ["googleMaps"]);
  a != null && s(t, ["googleMaps"], fa(a));
  const u = i(n, [
    "codeExecution"
  ]);
  if (u != null && s(t, ["codeExecution"], u), i(n, ["enterpriseWebSearch"]) !== void 0)
    throw new Error("enterpriseWebSearch parameter is not supported in Gemini API.");
  const f = i(n, [
    "functionDeclarations"
  ]);
  if (f != null) {
    let p = f;
    Array.isArray(p) && (p = p.map((h) => h)), s(t, ["functionDeclarations"], p);
  }
  const d = i(n, [
    "googleSearchRetrieval"
  ]);
  if (d != null && s(t, ["googleSearchRetrieval"], d), i(n, ["parallelAiSearch"]) !== void 0)
    throw new Error("parallelAiSearch parameter is not supported in Gemini API.");
  const c = i(n, ["urlContext"]);
  c != null && s(t, ["urlContext"], c);
  const m = i(n, ["mcpServers"]);
  if (m != null) {
    let p = m;
    Array.isArray(p) && (p = p.map((h) => h)), s(t, ["mcpServers"], p);
  }
  return t;
}
function So(n, e) {
  const t = {}, o = i(n, ["retrieval"]);
  o != null && s(t, ["retrieval"], o);
  const r = i(n, ["computerUse"]);
  if (r != null && s(t, ["computerUse"], r), i(n, ["fileSearch"]) !== void 0)
    throw new Error("fileSearch parameter is not supported in Vertex AI.");
  const l = i(n, ["googleSearch"]);
  l != null && s(t, ["googleSearch"], l);
  const a = i(n, ["googleMaps"]);
  a != null && s(t, ["googleMaps"], a);
  const u = i(n, [
    "codeExecution"
  ]);
  u != null && s(t, ["codeExecution"], u);
  const f = i(n, [
    "enterpriseWebSearch"
  ]);
  f != null && s(t, ["enterpriseWebSearch"], f);
  const d = i(n, [
    "functionDeclarations"
  ]);
  if (d != null) {
    let h = d;
    Array.isArray(h) && (h = h.map((g) => ql(g))), s(t, ["functionDeclarations"], h);
  }
  const c = i(n, [
    "googleSearchRetrieval"
  ]);
  c != null && s(t, ["googleSearchRetrieval"], c);
  const m = i(n, [
    "parallelAiSearch"
  ]);
  m != null && s(t, ["parallelAiSearch"], m);
  const p = i(n, ["urlContext"]);
  if (p != null && s(t, ["urlContext"], p), i(n, ["mcpServers"]) !== void 0)
    throw new Error("mcpServers parameter is not supported in Vertex AI.");
  return t;
}
function Va(n, e) {
  const t = {}, o = i(n, ["baseModel"]);
  o != null && s(t, ["baseModel"], o);
  const r = i(n, ["createTime"]);
  r != null && s(t, ["createTime"], r);
  const l = i(n, ["updateTime"]);
  return l != null && s(t, ["updateTime"], l), t;
}
function qa(n, e) {
  const t = {}, o = i(n, [
    "labels",
    "google-vertex-llm-tuning-base-model-id"
  ]);
  o != null && s(t, ["baseModel"], o);
  const r = i(n, ["createTime"]);
  r != null && s(t, ["createTime"], r);
  const l = i(n, ["updateTime"]);
  return l != null && s(t, ["updateTime"], l), t;
}
function Ha(n, e, t) {
  const o = {}, r = i(n, ["displayName"]);
  e !== void 0 && r != null && s(e, ["displayName"], r);
  const l = i(n, ["description"]);
  e !== void 0 && l != null && s(e, ["description"], l);
  const a = i(n, [
    "defaultCheckpointId"
  ]);
  return e !== void 0 && a != null && s(e, ["defaultCheckpointId"], a), o;
}
function Ba(n, e, t) {
  const o = {}, r = i(n, ["displayName"]);
  e !== void 0 && r != null && s(e, ["displayName"], r);
  const l = i(n, ["description"]);
  e !== void 0 && l != null && s(e, ["description"], l);
  const a = i(n, [
    "defaultCheckpointId"
  ]);
  return e !== void 0 && a != null && s(e, ["defaultCheckpointId"], a), o;
}
function ba(n, e, t) {
  const o = {}, r = i(e, ["model"]);
  r != null && s(o, ["_url", "name"], N(n, r));
  const l = i(e, ["config"]);
  return l != null && Ha(l, o), o;
}
function Ja(n, e, t) {
  const o = {}, r = i(e, ["model"]);
  r != null && s(o, ["_url", "model"], N(n, r));
  const l = i(e, ["config"]);
  return l != null && Ba(l, o), o;
}
function $a(n, e, t) {
  const o = {}, r = i(n, ["outputGcsUri"]);
  e !== void 0 && r != null && s(e, ["parameters", "storageUri"], r);
  const l = i(n, [
    "safetyFilterLevel"
  ]);
  e !== void 0 && l != null && s(e, ["parameters", "safetySetting"], l);
  const a = i(n, [
    "personGeneration"
  ]);
  e !== void 0 && a != null && s(e, ["parameters", "personGeneration"], a);
  const u = i(n, [
    "includeRaiReason"
  ]);
  e !== void 0 && u != null && s(e, ["parameters", "includeRaiReason"], u);
  const f = i(n, [
    "outputMimeType"
  ]);
  e !== void 0 && f != null && s(e, ["parameters", "outputOptions", "mimeType"], f);
  const d = i(n, [
    "outputCompressionQuality"
  ]);
  e !== void 0 && d != null && s(e, ["parameters", "outputOptions", "compressionQuality"], d);
  const c = i(n, [
    "enhanceInputImage"
  ]);
  e !== void 0 && c != null && s(e, ["parameters", "upscaleConfig", "enhanceInputImage"], c);
  const m = i(n, [
    "imagePreservationFactor"
  ]);
  e !== void 0 && m != null && s(e, ["parameters", "upscaleConfig", "imagePreservationFactor"], m);
  const p = i(n, ["labels"]);
  e !== void 0 && p != null && s(e, ["labels"], p);
  const h = i(n, [
    "numberOfImages"
  ]);
  e !== void 0 && h != null && s(e, ["parameters", "sampleCount"], h);
  const g = i(n, ["mode"]);
  return e !== void 0 && g != null && s(e, ["parameters", "mode"], g), o;
}
function Ka(n, e, t) {
  const o = {}, r = i(e, ["model"]);
  r != null && s(o, ["_url", "model"], N(n, r));
  const l = i(e, ["image"]);
  l != null && s(o, ["instances[0]", "image"], $(l));
  const a = i(e, [
    "upscaleFactor"
  ]);
  a != null && s(o, ["parameters", "upscaleConfig", "upscaleFactor"], a);
  const u = i(e, ["config"]);
  return u != null && $a(u, o), o;
}
function Oa(n, e) {
  const t = {}, o = i(n, [
    "sdkHttpResponse"
  ]);
  o != null && s(t, ["sdkHttpResponse"], o);
  const r = i(n, [
    "predictions"
  ]);
  if (r != null) {
    let l = r;
    Array.isArray(l) && (l = l.map((a) => Me(a))), s(t, ["generatedImages"], l);
  }
  return t;
}
function Wa(n, e) {
  const t = {}, o = i(n, ["uri"]);
  o != null && s(t, ["uri"], o);
  const r = i(n, ["encodedVideo"]);
  r != null && s(t, ["videoBytes"], X(r));
  const l = i(n, ["encoding"]);
  return l != null && s(t, ["mimeType"], l), t;
}
function Ya(n, e) {
  const t = {}, o = i(n, ["gcsUri"]);
  o != null && s(t, ["uri"], o);
  const r = i(n, [
    "bytesBase64Encoded"
  ]);
  r != null && s(t, ["videoBytes"], X(r));
  const l = i(n, ["mimeType"]);
  return l != null && s(t, ["mimeType"], l), t;
}
function za(n, e) {
  const t = {}, o = i(n, ["image"]);
  o != null && s(t, ["_self"], $(o));
  const r = i(n, ["maskMode"]);
  return r != null && s(t, ["maskMode"], r), t;
}
function Qa(n, e) {
  const t = {}, o = i(n, ["image"]);
  o != null && s(t, ["image"], Ne(o));
  const r = i(n, [
    "referenceType"
  ]);
  return r != null && s(t, ["referenceType"], r), t;
}
function Xa(n, e) {
  const t = {}, o = i(n, ["image"]);
  o != null && s(t, ["image"], $(o));
  const r = i(n, [
    "referenceType"
  ]);
  return r != null && s(t, ["referenceType"], r), t;
}
function Ao(n, e) {
  const t = {}, o = i(n, ["uri"]);
  o != null && s(t, ["uri"], o);
  const r = i(n, ["videoBytes"]);
  r != null && s(t, ["encodedVideo"], X(r));
  const l = i(n, ["mimeType"]);
  return l != null && s(t, ["encoding"], l), t;
}
function vo(n, e) {
  const t = {}, o = i(n, ["uri"]);
  o != null && s(t, ["gcsUri"], o);
  const r = i(n, ["videoBytes"]);
  r != null && s(t, ["bytesBase64Encoded"], X(r));
  const l = i(n, ["mimeType"]);
  return l != null && s(t, ["mimeType"], l), t;
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function Za(n, e) {
  const t = {}, o = i(n, ["displayName"]);
  return e !== void 0 && o != null && s(e, ["displayName"], o), t;
}
function ja(n) {
  const e = {}, t = i(n, ["config"]);
  return t != null && Za(t, e), e;
}
function eu(n, e) {
  const t = {}, o = i(n, ["force"]);
  return e !== void 0 && o != null && s(e, ["_query", "force"], o), t;
}
function nu(n) {
  const e = {}, t = i(n, ["name"]);
  t != null && s(e, ["_url", "name"], t);
  const o = i(n, ["config"]);
  return o != null && eu(o, e), e;
}
function tu(n) {
  const e = {}, t = i(n, ["name"]);
  return t != null && s(e, ["_url", "name"], t), e;
}
function ou(n, e) {
  const t = {}, o = i(n, [
    "customMetadata"
  ]);
  if (e !== void 0 && o != null) {
    let l = o;
    Array.isArray(l) && (l = l.map((a) => a)), s(e, ["customMetadata"], l);
  }
  const r = i(n, [
    "chunkingConfig"
  ]);
  return e !== void 0 && r != null && s(e, ["chunkingConfig"], r), t;
}
function iu(n) {
  const e = {}, t = i(n, ["name"]);
  t != null && s(e, ["name"], t);
  const o = i(n, ["metadata"]);
  o != null && s(e, ["metadata"], o);
  const r = i(n, ["done"]);
  r != null && s(e, ["done"], r);
  const l = i(n, ["error"]);
  l != null && s(e, ["error"], l);
  const a = i(n, ["response"]);
  return a != null && s(e, ["response"], su(a)), e;
}
function ru(n) {
  const e = {}, t = i(n, [
    "fileSearchStoreName"
  ]);
  t != null && s(e, ["_url", "file_search_store_name"], t);
  const o = i(n, ["fileName"]);
  o != null && s(e, ["fileName"], o);
  const r = i(n, ["config"]);
  return r != null && ou(r, e), e;
}
function su(n) {
  const e = {}, t = i(n, [
    "sdkHttpResponse"
  ]);
  t != null && s(e, ["sdkHttpResponse"], t);
  const o = i(n, ["parent"]);
  o != null && s(e, ["parent"], o);
  const r = i(n, ["documentName"]);
  return r != null && s(e, ["documentName"], r), e;
}
function lu(n, e) {
  const t = {}, o = i(n, ["pageSize"]);
  e !== void 0 && o != null && s(e, ["_query", "pageSize"], o);
  const r = i(n, ["pageToken"]);
  return e !== void 0 && r != null && s(e, ["_query", "pageToken"], r), t;
}
function au(n) {
  const e = {}, t = i(n, ["config"]);
  return t != null && lu(t, e), e;
}
function uu(n) {
  const e = {}, t = i(n, [
    "sdkHttpResponse"
  ]);
  t != null && s(e, ["sdkHttpResponse"], t);
  const o = i(n, [
    "nextPageToken"
  ]);
  o != null && s(e, ["nextPageToken"], o);
  const r = i(n, [
    "fileSearchStores"
  ]);
  if (r != null) {
    let l = r;
    Array.isArray(l) && (l = l.map((a) => a)), s(e, ["fileSearchStores"], l);
  }
  return e;
}
function Ro(n, e) {
  const t = {}, o = i(n, ["mimeType"]);
  e !== void 0 && o != null && s(e, ["mimeType"], o);
  const r = i(n, ["displayName"]);
  e !== void 0 && r != null && s(e, ["displayName"], r);
  const l = i(n, [
    "customMetadata"
  ]);
  if (e !== void 0 && l != null) {
    let u = l;
    Array.isArray(u) && (u = u.map((f) => f)), s(e, ["customMetadata"], u);
  }
  const a = i(n, [
    "chunkingConfig"
  ]);
  return e !== void 0 && a != null && s(e, ["chunkingConfig"], a), t;
}
function du(n) {
  const e = {}, t = i(n, [
    "fileSearchStoreName"
  ]);
  t != null && s(e, ["_url", "file_search_store_name"], t);
  const o = i(n, ["config"]);
  return o != null && Ro(o, e), e;
}
function fu(n) {
  const e = {}, t = i(n, [
    "sdkHttpResponse"
  ]);
  return t != null && s(e, ["sdkHttpResponse"], t), e;
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const cu = "Content-Type", pu = "X-Server-Timeout", mu = "User-Agent", Xe = "x-goog-api-client", hu = "1.45.0", gu = `google-genai-sdk/${hu}`, yu = "v1beta1", Tu = "v1beta", _u = 5, Eu = [
  408,
  // Request timeout
  429,
  // Too many requests
  500,
  // Internal server error
  502,
  // Bad gateway
  503,
  // Service unavailable
  504
  // Gateway timeout
];
class Cu {
  constructor(e) {
    var t, o, r;
    this.clientOptions = Object.assign({}, e), this.customBaseUrl = (t = e.httpOptions) === null || t === void 0 ? void 0 : t.baseUrl, this.clientOptions.vertexai && (this.clientOptions.project && this.clientOptions.location ? this.clientOptions.apiKey = void 0 : this.clientOptions.apiKey && (this.clientOptions.project = void 0, this.clientOptions.location = void 0));
    const l = {};
    if (this.clientOptions.vertexai) {
      if (!this.clientOptions.location && !this.clientOptions.apiKey && !this.customBaseUrl && (this.clientOptions.location = "global"), !(this.clientOptions.project && this.clientOptions.location || this.clientOptions.apiKey) && !this.customBaseUrl)
        throw new Error("Authentication is not set up. Please provide either a project and location, or an API key, or a custom base URL.");
      const u = e.project && e.location || !!e.apiKey;
      this.customBaseUrl && !u ? (l.baseUrl = this.customBaseUrl, this.clientOptions.project = void 0, this.clientOptions.location = void 0) : this.clientOptions.apiKey || this.clientOptions.location === "global" ? l.baseUrl = "https://aiplatform.googleapis.com/" : this.clientOptions.project && this.clientOptions.location && (l.baseUrl = `https://${this.clientOptions.location}-aiplatform.googleapis.com/`), l.apiVersion = (o = this.clientOptions.apiVersion) !== null && o !== void 0 ? o : yu;
    } else
      this.clientOptions.apiKey || console.warn("API key should be set when using the Gemini API."), l.apiVersion = (r = this.clientOptions.apiVersion) !== null && r !== void 0 ? r : Tu, l.baseUrl = "https://generativelanguage.googleapis.com/";
    l.headers = this.getDefaultHeaders(), this.clientOptions.httpOptions = l, e.httpOptions && (this.clientOptions.httpOptions = this.patchHttpOptions(l, e.httpOptions));
  }
  isVertexAI() {
    var e;
    return (e = this.clientOptions.vertexai) !== null && e !== void 0 ? e : !1;
  }
  getProject() {
    return this.clientOptions.project;
  }
  getLocation() {
    return this.clientOptions.location;
  }
  getCustomBaseUrl() {
    return this.customBaseUrl;
  }
  async getAuthHeaders() {
    const e = new Headers();
    return await this.clientOptions.auth.addAuthHeaders(e), e;
  }
  getApiVersion() {
    if (this.clientOptions.httpOptions && this.clientOptions.httpOptions.apiVersion !== void 0)
      return this.clientOptions.httpOptions.apiVersion;
    throw new Error("API version is not set.");
  }
  getBaseUrl() {
    if (this.clientOptions.httpOptions && this.clientOptions.httpOptions.baseUrl !== void 0)
      return this.clientOptions.httpOptions.baseUrl;
    throw new Error("Base URL is not set.");
  }
  getRequestUrl() {
    return this.getRequestUrlInternal(this.clientOptions.httpOptions);
  }
  getHeaders() {
    if (this.clientOptions.httpOptions && this.clientOptions.httpOptions.headers !== void 0)
      return this.clientOptions.httpOptions.headers;
    throw new Error("Headers are not set.");
  }
  getRequestUrlInternal(e) {
    if (!e || e.baseUrl === void 0 || e.apiVersion === void 0)
      throw new Error("HTTP options are not correctly set.");
    const o = [e.baseUrl.endsWith("/") ? e.baseUrl.slice(0, -1) : e.baseUrl];
    return e.apiVersion && e.apiVersion !== "" && o.push(e.apiVersion), o.join("/");
  }
  getBaseResourcePath() {
    return `projects/${this.clientOptions.project}/locations/${this.clientOptions.location}`;
  }
  getApiKey() {
    return this.clientOptions.apiKey;
  }
  getWebsocketBaseUrl() {
    const e = this.getBaseUrl(), t = new URL(e);
    return t.protocol = t.protocol == "http:" ? "ws" : "wss", t.toString();
  }
  setBaseUrl(e) {
    if (this.clientOptions.httpOptions)
      this.clientOptions.httpOptions.baseUrl = e;
    else
      throw new Error("HTTP options are not correctly set.");
  }
  constructUrl(e, t, o) {
    const r = [this.getRequestUrlInternal(t)];
    return o && r.push(this.getBaseResourcePath()), e !== "" && r.push(e), new URL(`${r.join("/")}`);
  }
  shouldPrependVertexProjectPath(e, t) {
    return !(t.baseUrl && t.baseUrlResourceScope === Ke.COLLECTION || this.clientOptions.apiKey || !this.clientOptions.vertexai || e.path.startsWith("projects/") || e.httpMethod === "GET" && e.path.startsWith("publishers/google/models"));
  }
  async request(e) {
    let t = this.clientOptions.httpOptions;
    e.httpOptions && (t = this.patchHttpOptions(this.clientOptions.httpOptions, e.httpOptions));
    const o = this.shouldPrependVertexProjectPath(e, t), r = this.constructUrl(e.path, t, o);
    if (e.queryParams)
      for (const [a, u] of Object.entries(e.queryParams))
        r.searchParams.append(a, String(u));
    let l = {};
    if (e.httpMethod === "GET") {
      if (e.body && e.body !== "{}")
        throw new Error("Request body should be empty for GET request, but got non empty request body");
    } else
      l.body = e.body;
    return l = await this.includeExtraHttpOptionsToRequestInit(l, t, r.toString(), e.abortSignal), this.unaryApiCall(r, l, e.httpMethod);
  }
  patchHttpOptions(e, t) {
    const o = JSON.parse(JSON.stringify(e));
    for (const [r, l] of Object.entries(t))
      typeof l == "object" ? o[r] = Object.assign(Object.assign({}, o[r]), l) : l !== void 0 && (o[r] = l);
    return o;
  }
  async requestStream(e) {
    let t = this.clientOptions.httpOptions;
    e.httpOptions && (t = this.patchHttpOptions(this.clientOptions.httpOptions, e.httpOptions));
    const o = this.shouldPrependVertexProjectPath(e, t), r = this.constructUrl(e.path, t, o);
    (!r.searchParams.has("alt") || r.searchParams.get("alt") !== "sse") && r.searchParams.set("alt", "sse");
    let l = {};
    return l.body = e.body, l = await this.includeExtraHttpOptionsToRequestInit(l, t, r.toString(), e.abortSignal), this.streamApiCall(r, l, e.httpMethod);
  }
  async includeExtraHttpOptionsToRequestInit(e, t, o, r) {
    if (t && t.timeout || r) {
      const l = new AbortController(), a = l.signal;
      if (t.timeout && t?.timeout > 0) {
        const u = setTimeout(() => l.abort(), t.timeout);
        u && typeof u.unref == "function" && u.unref();
      }
      r && r.addEventListener("abort", () => {
        l.abort();
      }), e.signal = a;
    }
    return t && t.extraBody !== null && Iu(e, t.extraBody), e.headers = await this.getHeadersInternal(t, o), e;
  }
  async unaryApiCall(e, t, o) {
    return this.apiCall(e.toString(), Object.assign(Object.assign({}, t), { method: o })).then(async (r) => (await $t(r), new Oe(r))).catch((r) => {
      throw r instanceof Error ? r : new Error(JSON.stringify(r));
    });
  }
  async streamApiCall(e, t, o) {
    return this.apiCall(e.toString(), Object.assign(Object.assign({}, t), { method: o })).then(async (r) => (await $t(r), this.processStreamResponse(r))).catch((r) => {
      throw r instanceof Error ? r : new Error(JSON.stringify(r));
    });
  }
  processStreamResponse(e) {
    return b(this, arguments, function* () {
      var o;
      const r = (o = e?.body) === null || o === void 0 ? void 0 : o.getReader(), l = new TextDecoder("utf-8");
      if (!r)
        throw new Error("Response body is empty");
      try {
        let a = "";
        const u = "data:", f = [`

`, "\r\r", `\r
\r
`];
        for (; ; ) {
          const { done: d, value: c } = yield P(r.read());
          if (d) {
            if (a.trim().length > 0)
              throw new Error("Incomplete JSON segment at the end");
            break;
          }
          const m = l.decode(c, { stream: !0 });
          try {
            const g = JSON.parse(m);
            if ("error" in g) {
              const T = JSON.parse(JSON.stringify(g.error)), y = T.status, _ = T.code, S = `got status: ${y}. ${JSON.stringify(g)}`;
              if (_ >= 400 && _ < 600)
                throw new we({
                  message: S,
                  status: _
                });
            }
          } catch (g) {
            if (g.name === "ApiError")
              throw g;
          }
          a += m;
          let p = -1, h = 0;
          for (; ; ) {
            p = -1, h = 0;
            for (const y of f) {
              const _ = a.indexOf(y);
              _ !== -1 && (p === -1 || _ < p) && (p = _, h = y.length);
            }
            if (p === -1)
              break;
            const g = a.substring(0, p);
            a = a.substring(p + h);
            const T = g.trim();
            if (T.startsWith(u)) {
              const y = T.substring(u.length).trim();
              try {
                const _ = new Response(y, {
                  headers: e?.headers,
                  status: e?.status,
                  statusText: e?.statusText
                });
                yield yield P(new Oe(_));
              } catch (_) {
                throw new Error(`exception parsing stream chunk ${y}. ${_}`);
              }
            }
          }
        }
      } finally {
        r.releaseLock();
      }
    });
  }
  async apiCall(e, t) {
    var o;
    if (!this.clientOptions.httpOptions || !this.clientOptions.httpOptions.retryOptions)
      return fetch(e, t);
    const r = this.clientOptions.httpOptions.retryOptions;
    return li(async () => {
      const a = await fetch(e, t);
      if (a.ok)
        return a;
      throw Eu.includes(a.status) ? new Error(`Retryable HTTP Error: ${a.statusText}`) : new oo.AbortError(`Non-retryable exception ${a.statusText} sending request`);
    }, {
      // Retry attempts is one less than the number of total attempts.
      retries: ((o = r.attempts) !== null && o !== void 0 ? o : _u) - 1
    });
  }
  getDefaultHeaders() {
    const e = {}, t = gu + " " + this.clientOptions.userAgentExtra;
    return e[mu] = t, e[Xe] = t, e[cu] = "application/json", e;
  }
  async getHeadersInternal(e, t) {
    const o = new Headers();
    if (e && e.headers) {
      for (const [r, l] of Object.entries(e.headers))
        o.append(r, l);
      e.timeout && e.timeout > 0 && o.append(pu, String(Math.ceil(e.timeout / 1e3)));
    }
    return await this.clientOptions.auth.addAuthHeaders(o, t), o;
  }
  getFileName(e) {
    var t;
    let o = "";
    return typeof e == "string" && (o = e.replace(/[/\\]+$/, ""), o = (t = o.split(/[/\\]/).pop()) !== null && t !== void 0 ? t : ""), o;
  }
  /**
   * Uploads a file asynchronously using Gemini API only, this is not supported
   * in Vertex AI.
   *
   * @param file The string path to the file to be uploaded or a Blob object.
   * @param config Optional parameters specified in the `UploadFileConfig`
   *     interface. @see {@link types.UploadFileConfig}
   * @return A promise that resolves to a `File` object.
   * @throws An error if called on a Vertex AI client.
   * @throws An error if the `mimeType` is not provided and can not be inferred,
   */
  async uploadFile(e, t) {
    var o;
    const r = {};
    t != null && (r.mimeType = t.mimeType, r.name = t.name, r.displayName = t.displayName), r.name && !r.name.startsWith("files/") && (r.name = `files/${r.name}`);
    const l = this.clientOptions.uploader, a = await l.stat(e);
    r.sizeBytes = String(a.size);
    const u = (o = t?.mimeType) !== null && o !== void 0 ? o : a.type;
    if (u === void 0 || u === "")
      throw new Error("Can not determine mimeType. Please provide mimeType in the config.");
    r.mimeType = u;
    const f = {
      file: r
    }, d = this.getFileName(e), c = I("upload/v1beta/files", f._url), m = await this.fetchUploadUrl(c, r.sizeBytes, r.mimeType, d, f, t?.httpOptions);
    return l.upload(e, m, this);
  }
  /**
   * Uploads a file to a given file search store asynchronously using Gemini API only, this is not supported
   * in Vertex AI.
   *
   * @param fileSearchStoreName The name of the file search store to upload the file to.
   * @param file The string path to the file to be uploaded or a Blob object.
   * @param config Optional parameters specified in the `UploadFileConfig`
   *     interface. @see {@link UploadFileConfig}
   * @return A promise that resolves to a `File` object.
   * @throws An error if called on a Vertex AI client.
   * @throws An error if the `mimeType` is not provided and can not be inferred,
   */
  async uploadFileToFileSearchStore(e, t, o) {
    var r;
    const l = this.clientOptions.uploader, a = await l.stat(t), u = String(a.size), f = (r = o?.mimeType) !== null && r !== void 0 ? r : a.type;
    if (f === void 0 || f === "")
      throw new Error("Can not determine mimeType. Please provide mimeType in the config.");
    const d = `upload/v1beta/${e}:uploadToFileSearchStore`, c = this.getFileName(t), m = {};
    o != null && Ro(o, m);
    const p = await this.fetchUploadUrl(d, u, f, c, m, o?.httpOptions);
    return l.uploadToFileSearchStore(t, p, this);
  }
  /**
   * Downloads a file asynchronously to the specified path.
   *
   * @params params - The parameters for the download request, see {@link
   * types.DownloadFileParameters}
   */
  async downloadFile(e) {
    await this.clientOptions.downloader.download(e, this);
  }
  async fetchUploadUrl(e, t, o, r, l, a) {
    var u;
    let f = {};
    a ? f = a : f = {
      apiVersion: "",
      // api-version is set in the path.
      headers: Object.assign({ "Content-Type": "application/json", "X-Goog-Upload-Protocol": "resumable", "X-Goog-Upload-Command": "start", "X-Goog-Upload-Header-Content-Length": `${t}`, "X-Goog-Upload-Header-Content-Type": `${o}` }, r ? { "X-Goog-Upload-File-Name": r } : {})
    };
    const d = await this.request({
      path: e,
      body: JSON.stringify(l),
      httpMethod: "POST",
      httpOptions: f
    });
    if (!d || !d?.headers)
      throw new Error("Server did not return an HttpResponse or the returned HttpResponse did not have headers.");
    const c = (u = d?.headers) === null || u === void 0 ? void 0 : u["x-goog-upload-url"];
    if (c === void 0)
      throw new Error("Failed to get upload url. Server did not return the x-google-upload-url in the headers");
    return c;
  }
}
async function $t(n) {
  var e;
  if (n === void 0)
    throw new Error("response is undefined");
  if (!n.ok) {
    const t = n.status;
    let o;
    !((e = n.headers.get("content-type")) === null || e === void 0) && e.includes("application/json") ? o = await n.json() : o = {
      error: {
        message: await n.text(),
        code: n.status,
        status: n.statusText
      }
    };
    const r = JSON.stringify(o);
    throw t >= 400 && t < 600 ? new we({
      message: r,
      status: t
    }) : new Error(r);
  }
}
function Iu(n, e) {
  if (!e || Object.keys(e).length === 0)
    return;
  if (n.body instanceof Blob) {
    console.warn("includeExtraBodyToRequestInit: extraBody provided but current request body is a Blob. extraBody will be ignored as merging is not supported for Blob bodies.");
    return;
  }
  let t = {};
  if (typeof n.body == "string" && n.body.length > 0)
    try {
      const l = JSON.parse(n.body);
      if (typeof l == "object" && l !== null && !Array.isArray(l))
        t = l;
      else {
        console.warn("includeExtraBodyToRequestInit: Original request body is valid JSON but not a non-array object. Skip applying extraBody to the request body.");
        return;
      }
    } catch {
      console.warn("includeExtraBodyToRequestInit: Original request body is not valid JSON. Skip applying extraBody to the request body.");
      return;
    }
  function o(l, a) {
    const u = Object.assign({}, l);
    for (const f in a)
      if (Object.prototype.hasOwnProperty.call(a, f)) {
        const d = a[f], c = u[f];
        d && typeof d == "object" && !Array.isArray(d) && c && typeof c == "object" && !Array.isArray(c) ? u[f] = o(c, d) : (c && d && typeof c != typeof d && console.warn(`includeExtraBodyToRequestInit:deepMerge: Type mismatch for key "${f}". Original type: ${typeof c}, New type: ${typeof d}. Overwriting.`), u[f] = d);
      }
    return u;
  }
  const r = o(t, e);
  n.body = JSON.stringify(r);
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const Su = "mcp_used/unknown";
let Au = !1;
function Po(n) {
  for (const e of n)
    if (vu(e) || typeof e == "object" && "inputSchema" in e)
      return !0;
  return Au;
}
function wo(n) {
  var e;
  const t = (e = n[Xe]) !== null && e !== void 0 ? e : "";
  n[Xe] = (t + ` ${Su}`).trimStart();
}
function vu(n) {
  return n !== null && typeof n == "object" && n instanceof cn;
}
function Ru(n) {
  return b(this, arguments, function* (t, o = 100) {
    let r, l = 0;
    for (; l < o; ) {
      const a = yield P(t.listTools({ cursor: r }));
      for (const u of a.tools)
        yield yield P(u), l++;
      if (!a.nextCursor)
        break;
      r = a.nextCursor;
    }
  });
}
class cn {
  constructor(e = [], t) {
    this.mcpTools = [], this.functionNameToMcpClient = {}, this.mcpClients = e, this.config = t;
  }
  /**
   * Creates a McpCallableTool.
   */
  static create(e, t) {
    return new cn(e, t);
  }
  /**
   * Validates the function names are not duplicate and initialize the function
   * name to MCP client mapping.
   *
   * @throws {Error} if the MCP tools from the MCP clients have duplicate tool
   *     names.
   */
  async initialize() {
    var e, t, o, r;
    if (this.mcpTools.length > 0)
      return;
    const l = {}, a = [];
    for (const c of this.mcpClients)
      try {
        for (var u = !0, f = (t = void 0, J(Ru(c))), d; d = await f.next(), e = d.done, !e; u = !0) {
          r = d.value, u = !1;
          const m = r;
          a.push(m);
          const p = m.name;
          if (l[p])
            throw new Error(`Duplicate function name ${p} found in MCP tools. Please ensure function names are unique.`);
          l[p] = c;
        }
      } catch (m) {
        t = { error: m };
      } finally {
        try {
          !u && !e && (o = f.return) && await o.call(f);
        } finally {
          if (t) throw t.error;
        }
      }
    this.mcpTools = a, this.functionNameToMcpClient = l;
  }
  async tool() {
    return await this.initialize(), Yi(this.mcpTools, this.config);
  }
  async callTool(e) {
    await this.initialize();
    const t = [];
    for (const o of e)
      if (o.name in this.functionNameToMcpClient) {
        const r = this.functionNameToMcpClient[o.name];
        let l;
        this.config.timeout && (l = {
          timeout: this.config.timeout
        });
        const a = await r.callTool(
          {
            name: o.name,
            arguments: o.args
          },
          // Set the result schema to undefined to allow MCP to rely on the
          // default schema.
          void 0,
          l
        );
        t.push({
          functionResponse: {
            name: o.name,
            response: a.isError ? { error: a } : a
          }
        });
      }
    return t;
  }
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
async function Pu(n, e, t) {
  const o = new Hi();
  let r;
  t.data instanceof Blob ? r = JSON.parse(await t.data.text()) : r = JSON.parse(t.data), Object.assign(o, r), e(o);
}
class wu {
  constructor(e, t, o) {
    this.apiClient = e, this.auth = t, this.webSocketFactory = o;
  }
  /**
       Establishes a connection to the specified model and returns a
       LiveMusicSession object representing that connection.
  
       @experimental
  
       @remarks
  
       @param params - The parameters for establishing a connection to the model.
       @return A live session.
  
       @example
       ```ts
       let model = 'models/lyria-realtime-exp';
       const session = await ai.live.music.connect({
         model: model,
         callbacks: {
           onmessage: (e: MessageEvent) => {
             console.log('Received message from the server: %s\n', debug(e.data));
           },
           onerror: (e: ErrorEvent) => {
             console.log('Error occurred: %s\n', debug(e.error));
           },
           onclose: (e: CloseEvent) => {
             console.log('Connection closed.');
           },
         },
       });
       ```
      */
  async connect(e) {
    var t, o;
    if (this.apiClient.isVertexAI())
      throw new Error("Live music is not supported for Vertex AI.");
    console.warn("Live music generation is experimental and may change in future versions.");
    const r = this.apiClient.getWebsocketBaseUrl(), l = this.apiClient.getApiVersion(), a = Du(this.apiClient.getDefaultHeaders()), u = this.apiClient.getApiKey(), f = `${r}/ws/google.ai.generativelanguage.${l}.GenerativeService.BidiGenerateMusic?key=${u}`;
    let d = () => {
    };
    const c = new Promise((C) => {
      d = C;
    }), m = e.callbacks, p = function() {
      d({});
    }, h = this.apiClient, g = {
      onopen: p,
      onmessage: (C) => {
        Pu(h, m.onmessage, C);
      },
      onerror: (t = m?.onerror) !== null && t !== void 0 ? t : function(C) {
      },
      onclose: (o = m?.onclose) !== null && o !== void 0 ? o : function(C) {
      }
    }, T = this.webSocketFactory.create(f, Nu(a), g);
    T.connect(), await c;
    const S = { setup: { model: N(this.apiClient, e.model) } };
    return T.send(JSON.stringify(S)), new Mu(T, this.apiClient);
  }
}
class Mu {
  constructor(e, t) {
    this.conn = e, this.apiClient = t;
  }
  /**
      Sets inputs to steer music generation. Updates the session's current
      weighted prompts.
  
      @param params - Contains one property, `weightedPrompts`.
  
        - `weightedPrompts` to send to the model; weights are normalized to
          sum to 1.0.
  
      @experimental
     */
  async setWeightedPrompts(e) {
    if (!e.weightedPrompts || Object.keys(e.weightedPrompts).length === 0)
      throw new Error("Weighted prompts must be set and contain at least one entry.");
    const t = Xs(e);
    this.conn.send(JSON.stringify({ clientContent: t }));
  }
  /**
      Sets a configuration to the model. Updates the session's current
      music generation config.
  
      @param params - Contains one property, `musicGenerationConfig`.
  
        - `musicGenerationConfig` to set in the model. Passing an empty or
      undefined config to the model will reset the config to defaults.
  
      @experimental
     */
  async setMusicGenerationConfig(e) {
    e.musicGenerationConfig || (e.musicGenerationConfig = {});
    const t = Qs(e);
    this.conn.send(JSON.stringify(t));
  }
  sendPlaybackControl(e) {
    const t = { playbackControl: e };
    this.conn.send(JSON.stringify(t));
  }
  /**
   * Start the music stream.
   *
   * @experimental
   */
  play() {
    this.sendPlaybackControl(te.PLAY);
  }
  /**
   * Temporarily halt the music stream. Use `play` to resume from the current
   * position.
   *
   * @experimental
   */
  pause() {
    this.sendPlaybackControl(te.PAUSE);
  }
  /**
   * Stop the music stream and reset the state. Retains the current prompts
   * and config.
   *
   * @experimental
   */
  stop() {
    this.sendPlaybackControl(te.STOP);
  }
  /**
   * Resets the context of the music generation without stopping it.
   * Retains the current prompts and config.
   *
   * @experimental
   */
  resetContext() {
    this.sendPlaybackControl(te.RESET_CONTEXT);
  }
  /**
       Terminates the WebSocket connection.
  
       @experimental
     */
  close() {
    this.conn.close();
  }
}
function Nu(n) {
  const e = {};
  return n.forEach((t, o) => {
    e[o] = t;
  }), e;
}
function Du(n) {
  const e = new Headers();
  for (const [t, o] of Object.entries(n))
    e.append(t, o);
  return e;
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const xu = "FunctionResponse request must have an `id` field from the response of a ToolCall.FunctionalCalls in Google AI.";
async function Uu(n, e, t) {
  const o = new qi();
  let r;
  t.data instanceof Blob ? r = await t.data.text() : t.data instanceof ArrayBuffer ? r = new TextDecoder().decode(t.data) : r = t.data;
  const l = JSON.parse(r);
  if (n.isVertexAI()) {
    const a = el(l);
    Object.assign(o, a);
  } else
    Object.assign(o, l);
  e(o);
}
class Lu {
  constructor(e, t, o) {
    this.apiClient = e, this.auth = t, this.webSocketFactory = o, this.music = new wu(this.apiClient, this.auth, this.webSocketFactory);
  }
  /**
       Establishes a connection to the specified model with the given
       configuration and returns a Session object representing that connection.
  
       @experimental Built-in MCP support is an experimental feature, may change in
       future versions.
  
       @remarks
  
       @param params - The parameters for establishing a connection to the model.
       @return A live session.
  
       @example
       ```ts
       let model: string;
       if (GOOGLE_GENAI_USE_VERTEXAI) {
         model = 'gemini-2.0-flash-live-preview-04-09';
       } else {
         model = 'gemini-live-2.5-flash-preview';
       }
       const session = await ai.live.connect({
         model: model,
         config: {
           responseModalities: [Modality.AUDIO],
         },
         callbacks: {
           onopen: () => {
             console.log('Connected to the socket.');
           },
           onmessage: (e: MessageEvent) => {
             console.log('Received message from the server: %s\n', debug(e.data));
           },
           onerror: (e: ErrorEvent) => {
             console.log('Error occurred: %s\n', debug(e.error));
           },
           onclose: (e: CloseEvent) => {
             console.log('Connection closed.');
           },
         },
       });
       ```
      */
  async connect(e) {
    var t, o, r, l, a, u;
    if (e.config && e.config.httpOptions)
      throw new Error("The Live module does not support httpOptions at request-level in LiveConnectConfig yet. Please use the client-level httpOptions configuration instead.");
    const f = this.apiClient.getWebsocketBaseUrl(), d = this.apiClient.getApiVersion();
    let c;
    const m = this.apiClient.getHeaders();
    e.config && e.config.tools && Po(e.config.tools) && wo(m);
    const p = Vu(m);
    if (this.apiClient.isVertexAI()) {
      const v = this.apiClient.getProject(), M = this.apiClient.getLocation(), x = this.apiClient.getApiKey(), q = !!v && !!M || !!x;
      this.apiClient.getCustomBaseUrl() && !q ? c = f : (c = `${f}/ws/google.cloud.aiplatform.${d}.LlmBidiService/BidiGenerateContent`, await this.auth.addAuthHeaders(p, c));
    } else {
      const v = this.apiClient.getApiKey();
      let M = "BidiGenerateContent", x = "key";
      v?.startsWith("auth_tokens/") && (console.warn("Warning: Ephemeral token support is experimental and may change in future versions."), d !== "v1alpha" && console.warn("Warning: The SDK's ephemeral token support is in v1alpha only. Please use const ai = new GoogleGenAI({apiKey: token.name, httpOptions: { apiVersion: 'v1alpha' }}); before session connection."), M = "BidiGenerateContentConstrained", x = "access_token"), c = `${f}/ws/google.ai.generativelanguage.${d}.GenerativeService.${M}?${x}=${v}`;
    }
    let h = () => {
    };
    const g = new Promise((v) => {
      h = v;
    }), T = e.callbacks, y = function() {
      var v;
      (v = T?.onopen) === null || v === void 0 || v.call(T), h({});
    }, _ = this.apiClient, S = {
      onopen: y,
      onmessage: (v) => {
        Uu(_, T.onmessage, v);
      },
      onerror: (t = T?.onerror) !== null && t !== void 0 ? t : function(v) {
      },
      onclose: (o = T?.onclose) !== null && o !== void 0 ? o : function(v) {
      }
    }, C = this.webSocketFactory.create(c, Fu(p), S);
    C.connect(), await g;
    let A = N(this.apiClient, e.model);
    if (this.apiClient.isVertexAI() && A.startsWith("publishers/")) {
      const v = this.apiClient.getProject(), M = this.apiClient.getLocation();
      v && M && (A = `projects/${v}/locations/${M}/` + A);
    }
    let R = {};
    this.apiClient.isVertexAI() && ((r = e.config) === null || r === void 0 ? void 0 : r.responseModalities) === void 0 && (e.config === void 0 ? e.config = { responseModalities: [Ce.AUDIO] } : e.config.responseModalities = [Ce.AUDIO]), !((l = e.config) === null || l === void 0) && l.generationConfig && console.warn("Setting `LiveConnectConfig.generation_config` is deprecated, please set the fields on `LiveConnectConfig` directly. This will become an error in a future version (not before Q3 2025).");
    const E = (u = (a = e.config) === null || a === void 0 ? void 0 : a.tools) !== null && u !== void 0 ? u : [], w = [];
    for (const v of E)
      if (this.isCallableTool(v)) {
        const M = v;
        w.push(await M.tool());
      } else
        w.push(v);
    w.length > 0 && (e.config.tools = w);
    const D = {
      model: A,
      config: e.config,
      callbacks: e.callbacks
    };
    return this.apiClient.isVertexAI() ? R = zs(this.apiClient, D) : R = Ys(this.apiClient, D), delete R.config, C.send(JSON.stringify(R)), new Gu(C, this.apiClient);
  }
  // TODO: b/416041229 - Abstract this method to a common place.
  isCallableTool(e) {
    return "callTool" in e && typeof e.callTool == "function";
  }
}
const ku = {
  turnComplete: !0
};
class Gu {
  constructor(e, t) {
    this.conn = e, this.apiClient = t;
  }
  tLiveClientContent(e, t) {
    if (t.turns !== null && t.turns !== void 0) {
      let o = [];
      try {
        o = H(t.turns), e.isVertexAI() || (o = o.map((r) => pe(r)));
      } catch {
        throw new Error(`Failed to parse client content "turns", type: '${typeof t.turns}'`);
      }
      return {
        clientContent: { turns: o, turnComplete: t.turnComplete }
      };
    }
    return {
      clientContent: { turnComplete: t.turnComplete }
    };
  }
  tLiveClienttToolResponse(e, t) {
    let o = [];
    if (t.functionResponses == null)
      throw new Error("functionResponses is required.");
    if (Array.isArray(t.functionResponses) ? o = t.functionResponses : o = [t.functionResponses], o.length === 0)
      throw new Error("functionResponses is required.");
    for (const l of o) {
      if (typeof l != "object" || l === null || !("name" in l) || !("response" in l))
        throw new Error(`Could not parse function response, type '${typeof l}'.`);
      if (!e.isVertexAI() && !("id" in l))
        throw new Error(xu);
    }
    return {
      toolResponse: { functionResponses: o }
    };
  }
  /**
      Send a message over the established connection.
  
      @param params - Contains two **optional** properties, `turns` and
          `turnComplete`.
  
        - `turns` will be converted to a `Content[]`
        - `turnComplete: true` [default] indicates that you are done sending
          content and expect a response. If `turnComplete: false`, the server
          will wait for additional messages before starting generation.
  
      @experimental
  
      @remarks
      There are two ways to send messages to the live API:
      `sendClientContent` and `sendRealtimeInput`.
  
      `sendClientContent` messages are added to the model context **in order**.
      Having a conversation using `sendClientContent` messages is roughly
      equivalent to using the `Chat.sendMessageStream`, except that the state of
      the `chat` history is stored on the API server instead of locally.
  
      Because of `sendClientContent`'s order guarantee, the model cannot respons
      as quickly to `sendClientContent` messages as to `sendRealtimeInput`
      messages. This makes the biggest difference when sending objects that have
      significant preprocessing time (typically images).
  
      The `sendClientContent` message sends a `Content[]`
      which has more options than the `Blob` sent by `sendRealtimeInput`.
  
      So the main use-cases for `sendClientContent` over `sendRealtimeInput` are:
  
      - Sending anything that can't be represented as a `Blob` (text,
      `sendClientContent({turns="Hello?"}`)).
      - Managing turns when not using audio input and voice activity detection.
        (`sendClientContent({turnComplete:true})` or the short form
      `sendClientContent()`)
      - Prefilling a conversation context
        ```
        sendClientContent({
            turns: [
              Content({role:user, parts:...}),
              Content({role:user, parts:...}),
              ...
            ]
        })
        ```
      @experimental
     */
  sendClientContent(e) {
    e = Object.assign(Object.assign({}, ku), e);
    const t = this.tLiveClientContent(this.apiClient, e);
    this.conn.send(JSON.stringify(t));
  }
  /**
      Send a realtime message over the established connection.
  
      @param params - Contains one property, `media`.
  
        - `media` will be converted to a `Blob`
  
      @experimental
  
      @remarks
      Use `sendRealtimeInput` for realtime audio chunks and video frames (images).
  
      With `sendRealtimeInput` the api will respond to audio automatically
      based on voice activity detection (VAD).
  
      `sendRealtimeInput` is optimized for responsivness at the expense of
      deterministic ordering guarantees. Audio and video tokens are to the
      context when they become available.
  
      Note: The Call signature expects a `Blob` object, but only a subset
      of audio and image mimetypes are allowed.
     */
  sendRealtimeInput(e) {
    let t = {};
    this.apiClient.isVertexAI() ? t = {
      realtimeInput: js(e)
    } : t = {
      realtimeInput: Zs(e)
    }, this.conn.send(JSON.stringify(t));
  }
  /**
      Send a function response message over the established connection.
  
      @param params - Contains property `functionResponses`.
  
        - `functionResponses` will be converted to a `functionResponses[]`
  
      @remarks
      Use `sendFunctionResponse` to reply to `LiveServerToolCall` from the server.
  
      Use {@link types.LiveConnectConfig#tools} to configure the callable functions.
  
      @experimental
     */
  sendToolResponse(e) {
    if (e.functionResponses == null)
      throw new Error("Tool response parameters are required.");
    const t = this.tLiveClienttToolResponse(this.apiClient, e);
    this.conn.send(JSON.stringify(t));
  }
  /**
       Terminates the WebSocket connection.
  
       @experimental
  
       @example
       ```ts
       let model: string;
       if (GOOGLE_GENAI_USE_VERTEXAI) {
         model = 'gemini-2.0-flash-live-preview-04-09';
       } else {
         model = 'gemini-live-2.5-flash-preview';
       }
       const session = await ai.live.connect({
         model: model,
         config: {
           responseModalities: [Modality.AUDIO],
         }
       });
  
       session.close();
       ```
     */
  close() {
    this.conn.close();
  }
}
function Fu(n) {
  const e = {};
  return n.forEach((t, o) => {
    e[o] = t;
  }), e;
}
function Vu(n) {
  const e = new Headers();
  for (const [t, o] of Object.entries(n))
    e.append(t, o);
  return e;
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const Kt = 10;
function Ot(n) {
  var e, t, o;
  if (!((e = n?.automaticFunctionCalling) === null || e === void 0) && e.disable)
    return !0;
  let r = !1;
  for (const a of (t = n?.tools) !== null && t !== void 0 ? t : [])
    if (re(a)) {
      r = !0;
      break;
    }
  if (!r)
    return !0;
  const l = (o = n?.automaticFunctionCalling) === null || o === void 0 ? void 0 : o.maximumRemoteCalls;
  return l && (l < 0 || !Number.isInteger(l)) || l == 0 ? (console.warn("Invalid maximumRemoteCalls value provided for automatic function calling. Disabled automatic function calling. Please provide a valid integer value greater than 0. maximumRemoteCalls provided:", l), !0) : !1;
}
function re(n) {
  return "callTool" in n && typeof n.callTool == "function";
}
function qu(n) {
  var e, t, o;
  return (o = (t = (e = n.config) === null || e === void 0 ? void 0 : e.tools) === null || t === void 0 ? void 0 : t.some((r) => re(r))) !== null && o !== void 0 ? o : !1;
}
function Wt(n) {
  var e;
  const t = [];
  return !((e = n?.config) === null || e === void 0) && e.tools && n.config.tools.forEach((o, r) => {
    if (re(o))
      return;
    const l = o;
    l.functionDeclarations && l.functionDeclarations.length > 0 && t.push(r);
  }), t;
}
function Yt(n) {
  var e;
  return !(!((e = n?.automaticFunctionCalling) === null || e === void 0) && e.ignoreCallHistory);
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class Hu extends Y {
  constructor(e) {
    super(), this.apiClient = e, this.embedContent = async (t) => {
      if (!this.apiClient.isVertexAI())
        return await this.embedContentInternal(t);
      if (t.model.includes("gemini") && t.model !== "gemini-embedding-001" || t.model.includes("maas")) {
        const r = H(t.contents);
        if (r.length > 1)
          throw new Error("The embedContent API for this model only supports one content at a time.");
        const l = Object.assign(Object.assign({}, t), { content: r[0], embeddingApiType: Ie.EMBED_CONTENT });
        return await this.embedContentInternal(l);
      } else {
        const r = Object.assign(Object.assign({}, t), { embeddingApiType: Ie.PREDICT });
        return await this.embedContentInternal(r);
      }
    }, this.generateContent = async (t) => {
      var o, r, l, a, u;
      const f = await this.processParamsMaybeAddMcpUsage(t);
      if (this.maybeMoveToResponseJsonSchem(t), !qu(t) || Ot(t.config))
        return await this.generateContentInternal(f);
      const d = Wt(t);
      if (d.length > 0) {
        const T = d.map((y) => `tools[${y}]`).join(", ");
        throw new Error(`Automatic function calling with CallableTools (or MCP objects) and basic FunctionDeclarations is not yet supported. Incompatible tools found at ${T}.`);
      }
      let c, m;
      const p = H(f.contents), h = (l = (r = (o = f.config) === null || o === void 0 ? void 0 : o.automaticFunctionCalling) === null || r === void 0 ? void 0 : r.maximumRemoteCalls) !== null && l !== void 0 ? l : Kt;
      let g = 0;
      for (; g < h && (c = await this.generateContentInternal(f), !(!c.functionCalls || c.functionCalls.length === 0)); ) {
        const T = c.candidates[0].content, y = [];
        for (const _ of (u = (a = t.config) === null || a === void 0 ? void 0 : a.tools) !== null && u !== void 0 ? u : [])
          if (re(_)) {
            const C = await _.callTool(c.functionCalls);
            y.push(...C);
          }
        g++, m = {
          role: "user",
          parts: y
        }, f.contents = H(f.contents), f.contents.push(T), f.contents.push(m), Yt(f.config) && (p.push(T), p.push(m));
      }
      return Yt(f.config) && (c.automaticFunctionCallingHistory = p), c;
    }, this.generateContentStream = async (t) => {
      var o, r, l, a, u;
      if (this.maybeMoveToResponseJsonSchem(t), Ot(t.config)) {
        const m = await this.processParamsMaybeAddMcpUsage(t);
        return await this.generateContentStreamInternal(m);
      }
      const f = Wt(t);
      if (f.length > 0) {
        const m = f.map((p) => `tools[${p}]`).join(", ");
        throw new Error(`Incompatible tools found at ${m}. Automatic function calling with CallableTools (or MCP objects) and basic FunctionDeclarations" is not yet supported.`);
      }
      const d = (l = (r = (o = t?.config) === null || o === void 0 ? void 0 : o.toolConfig) === null || r === void 0 ? void 0 : r.functionCallingConfig) === null || l === void 0 ? void 0 : l.streamFunctionCallArguments, c = (u = (a = t?.config) === null || a === void 0 ? void 0 : a.automaticFunctionCalling) === null || u === void 0 ? void 0 : u.disable;
      if (d && !c)
        throw new Error("Running in streaming mode with 'streamFunctionCallArguments' enabled, this feature is not compatible with automatic function calling (AFC). Please set 'config.automaticFunctionCalling.disable' to true to disable AFC or leave 'config.toolConfig.functionCallingConfig.streamFunctionCallArguments' to be undefined or set to false to disable streaming function call arguments feature.");
      return await this.processAfcStream(t);
    }, this.generateImages = async (t) => await this.generateImagesInternal(t).then((o) => {
      var r;
      let l;
      const a = [];
      if (o?.generatedImages)
        for (const f of o.generatedImages)
          f && f?.safetyAttributes && ((r = f?.safetyAttributes) === null || r === void 0 ? void 0 : r.contentType) === "Positive Prompt" ? l = f?.safetyAttributes : a.push(f);
      let u;
      return l ? u = {
        generatedImages: a,
        positivePromptSafetyAttributes: l,
        sdkHttpResponse: o.sdkHttpResponse
      } : u = {
        generatedImages: a,
        sdkHttpResponse: o.sdkHttpResponse
      }, u;
    }), this.list = async (t) => {
      var o;
      const a = {
        config: Object.assign(Object.assign({}, {
          queryBase: !0
        }), t?.config)
      };
      if (this.apiClient.isVertexAI() && !a.config.queryBase) {
        if (!((o = a.config) === null || o === void 0) && o.filter)
          throw new Error("Filtering tuned models list for Vertex AI is not currently supported");
        a.config.filter = "labels.tune-type:*";
      }
      return new ne(W.PAGED_ITEM_MODELS, (u) => this.listInternal(u), await this.listInternal(a), a);
    }, this.editImage = async (t) => {
      const o = {
        model: t.model,
        prompt: t.prompt,
        referenceImages: [],
        config: t.config
      };
      return t.referenceImages && t.referenceImages && (o.referenceImages = t.referenceImages.map((r) => r.toReferenceImageAPI())), await this.editImageInternal(o);
    }, this.upscaleImage = async (t) => {
      let o = {
        numberOfImages: 1,
        mode: "upscale"
      };
      t.config && (o = Object.assign(Object.assign({}, o), t.config));
      const r = {
        model: t.model,
        image: t.image,
        upscaleFactor: t.upscaleFactor,
        config: o
      };
      return await this.upscaleImageInternal(r);
    }, this.generateVideos = async (t) => {
      var o, r, l, a, u, f;
      if ((t.prompt || t.image || t.video) && t.source)
        throw new Error("Source and prompt/image/video are mutually exclusive. Please only use source.");
      return this.apiClient.isVertexAI() || (!((o = t.video) === null || o === void 0) && o.uri && (!((r = t.video) === null || r === void 0) && r.videoBytes) ? t.video = {
        uri: t.video.uri,
        mimeType: t.video.mimeType
      } : !((a = (l = t.source) === null || l === void 0 ? void 0 : l.video) === null || a === void 0) && a.uri && (!((f = (u = t.source) === null || u === void 0 ? void 0 : u.video) === null || f === void 0) && f.videoBytes) && (t.source.video = {
        uri: t.source.video.uri,
        mimeType: t.source.video.mimeType
      })), await this.generateVideosInternal(t);
    };
  }
  /**
   * This logic is needed for GenerateContentConfig only.
   * Previously we made GenerateContentConfig.responseSchema field to accept
   * unknown. Since v1.9.0, we switch to use backend JSON schema support.
   * To maintain backward compatibility, we move the data that was treated as
   * JSON schema from the responseSchema field to the responseJsonSchema field.
   */
  maybeMoveToResponseJsonSchem(e) {
    e.config && e.config.responseSchema && (e.config.responseJsonSchema || Object.keys(e.config.responseSchema).includes("$schema") && (e.config.responseJsonSchema = e.config.responseSchema, delete e.config.responseSchema));
  }
  /**
   * Transforms the CallableTools in the parameters to be simply Tools, it
   * copies the params into a new object and replaces the tools, it does not
   * modify the original params. Also sets the MCP usage header if there are
   * MCP tools in the parameters.
   */
  async processParamsMaybeAddMcpUsage(e) {
    var t, o, r;
    const l = (t = e.config) === null || t === void 0 ? void 0 : t.tools;
    if (!l)
      return e;
    const a = await Promise.all(l.map(async (f) => re(f) ? await f.tool() : f)), u = {
      model: e.model,
      contents: e.contents,
      config: Object.assign(Object.assign({}, e.config), { tools: a })
    };
    if (u.config.tools = a, e.config && e.config.tools && Po(e.config.tools)) {
      const f = (r = (o = e.config.httpOptions) === null || o === void 0 ? void 0 : o.headers) !== null && r !== void 0 ? r : {};
      let d = Object.assign({}, f);
      Object.keys(d).length === 0 && (d = this.apiClient.getDefaultHeaders()), wo(d), u.config.httpOptions = Object.assign(Object.assign({}, e.config.httpOptions), { headers: d });
    }
    return u;
  }
  async initAfcToolsMap(e) {
    var t, o, r;
    const l = /* @__PURE__ */ new Map();
    for (const a of (o = (t = e.config) === null || t === void 0 ? void 0 : t.tools) !== null && o !== void 0 ? o : [])
      if (re(a)) {
        const u = a, f = await u.tool();
        for (const d of (r = f.functionDeclarations) !== null && r !== void 0 ? r : []) {
          if (!d.name)
            throw new Error("Function declaration name is required.");
          if (l.has(d.name))
            throw new Error(`Duplicate tool declaration name: ${d.name}`);
          l.set(d.name, u);
        }
      }
    return l;
  }
  async processAfcStream(e) {
    var t, o, r;
    const l = (r = (o = (t = e.config) === null || t === void 0 ? void 0 : t.automaticFunctionCalling) === null || o === void 0 ? void 0 : o.maximumRemoteCalls) !== null && r !== void 0 ? r : Kt;
    let a = !1, u = 0;
    const f = await this.initAfcToolsMap(e);
    return (function(d, c, m) {
      return b(this, arguments, function* () {
        for (var p, h, g, T, y, _; u < l; ) {
          a && (u++, a = !1);
          const R = yield P(d.processParamsMaybeAddMcpUsage(m)), E = yield P(d.generateContentStreamInternal(R)), w = [], D = [];
          try {
            for (var S = !0, C = (h = void 0, J(E)), A; A = yield P(C.next()), p = A.done, !p; S = !0) {
              T = A.value, S = !1;
              const v = T;
              if (yield yield P(v), v.candidates && (!((y = v.candidates[0]) === null || y === void 0) && y.content)) {
                D.push(v.candidates[0].content);
                for (const M of (_ = v.candidates[0].content.parts) !== null && _ !== void 0 ? _ : [])
                  if (u < l && M.functionCall) {
                    if (!M.functionCall.name)
                      throw new Error("Function call name was not returned by the model.");
                    if (c.has(M.functionCall.name)) {
                      const x = yield P(c.get(M.functionCall.name).callTool([M.functionCall]));
                      w.push(...x);
                    } else
                      throw new Error(`Automatic function calling was requested, but not all the tools the model used implement the CallableTool interface. Available tools: ${c.keys()}, mising tool: ${M.functionCall.name}`);
                  }
              }
            }
          } catch (v) {
            h = { error: v };
          } finally {
            try {
              !S && !p && (g = C.return) && (yield P(g.call(C)));
            } finally {
              if (h) throw h.error;
            }
          }
          if (w.length > 0) {
            a = !0;
            const v = new de();
            v.candidates = [
              {
                content: {
                  role: "user",
                  parts: w
                }
              }
            ], yield yield P(v);
            const M = [];
            M.push(...D), M.push({
              role: "user",
              parts: w
            });
            const x = H(m.contents).concat(M);
            m.contents = x;
          } else
            break;
        }
      });
    })(this, f, e);
  }
  async generateContentInternal(e) {
    var t, o, r, l;
    let a, u = "", f = {};
    if (this.apiClient.isVertexAI()) {
      const d = Bt(this.apiClient, e);
      return u = I("{model}:generateContent", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "POST",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((c) => c.json().then((m) => {
        const p = m;
        return p.sdkHttpResponse = {
          headers: c.headers
        }, p;
      })), a.then((c) => {
        const m = Jt(c), p = new de();
        return Object.assign(p, m), p;
      });
    } else {
      const d = Ht(this.apiClient, e);
      return u = I("{model}:generateContent", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "POST",
        httpOptions: (r = e.config) === null || r === void 0 ? void 0 : r.httpOptions,
        abortSignal: (l = e.config) === null || l === void 0 ? void 0 : l.abortSignal
      }).then((c) => c.json().then((m) => {
        const p = m;
        return p.sdkHttpResponse = {
          headers: c.headers
        }, p;
      })), a.then((c) => {
        const m = bt(c), p = new de();
        return Object.assign(p, m), p;
      });
    }
  }
  async generateContentStreamInternal(e) {
    var t, o, r, l;
    let a, u = "", f = {};
    if (this.apiClient.isVertexAI()) {
      const d = Bt(this.apiClient, e);
      return u = I("{model}:streamGenerateContent?alt=sse", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.requestStream({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "POST",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }), a.then(function(m) {
        return b(this, arguments, function* () {
          var p, h, g, T;
          try {
            for (var y = !0, _ = J(m), S; S = yield P(_.next()), p = S.done, !p; y = !0) {
              T = S.value, y = !1;
              const C = T, A = Jt(yield P(C.json()), e);
              A.sdkHttpResponse = {
                headers: C.headers
              };
              const R = new de();
              Object.assign(R, A), yield yield P(R);
            }
          } catch (C) {
            h = { error: C };
          } finally {
            try {
              !y && !p && (g = _.return) && (yield P(g.call(_)));
            } finally {
              if (h) throw h.error;
            }
          }
        });
      });
    } else {
      const d = Ht(this.apiClient, e);
      return u = I("{model}:streamGenerateContent?alt=sse", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.requestStream({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "POST",
        httpOptions: (r = e.config) === null || r === void 0 ? void 0 : r.httpOptions,
        abortSignal: (l = e.config) === null || l === void 0 ? void 0 : l.abortSignal
      }), a.then(function(m) {
        return b(this, arguments, function* () {
          var p, h, g, T;
          try {
            for (var y = !0, _ = J(m), S; S = yield P(_.next()), p = S.done, !p; y = !0) {
              T = S.value, y = !1;
              const C = T, A = bt(yield P(C.json()), e);
              A.sdkHttpResponse = {
                headers: C.headers
              };
              const R = new de();
              Object.assign(R, A), yield yield P(R);
            }
          } catch (C) {
            h = { error: C };
          } finally {
            try {
              !y && !p && (g = _.return) && (yield P(g.call(_)));
            } finally {
              if (h) throw h.error;
            }
          }
        });
      });
    }
  }
  /**
   * Calculates embeddings for the given contents. Only text is supported.
   *
   * @param params - The parameters for embedding contents.
   * @return The response from the API.
   *
   * @example
   * ```ts
   * const response = await ai.models.embedContent({
   *  model: 'text-embedding-004',
   *  contents: [
   *    'What is your name?',
   *    'What is your favorite color?',
   *  ],
   *  config: {
   *    outputDimensionality: 64,
   *  },
   * });
   * console.log(response);
   * ```
   */
  async embedContentInternal(e) {
    var t, o, r, l;
    let a, u = "", f = {};
    if (this.apiClient.isVertexAI()) {
      const d = xl(this.apiClient, e, e), c = Qi(e.model) ? "{model}:embedContent" : "{model}:predict";
      return u = I(c, d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "POST",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((m) => m.json().then((p) => {
        const h = p;
        return h.sdkHttpResponse = {
          headers: m.headers
        }, h;
      })), a.then((m) => {
        const p = Ll(m, e), h = new It();
        return Object.assign(h, p), h;
      });
    } else {
      const d = Dl(this.apiClient, e);
      return u = I("{model}:batchEmbedContents", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "POST",
        httpOptions: (r = e.config) === null || r === void 0 ? void 0 : r.httpOptions,
        abortSignal: (l = e.config) === null || l === void 0 ? void 0 : l.abortSignal
      }).then((c) => c.json().then((m) => {
        const p = m;
        return p.sdkHttpResponse = {
          headers: c.headers
        }, p;
      })), a.then((c) => {
        const m = Ul(c), p = new It();
        return Object.assign(p, m), p;
      });
    }
  }
  /**
   * Private method for generating images.
   */
  async generateImagesInternal(e) {
    var t, o, r, l;
    let a, u = "", f = {};
    if (this.apiClient.isVertexAI()) {
      const d = Kl(this.apiClient, e);
      return u = I("{model}:predict", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "POST",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((c) => c.json().then((m) => {
        const p = m;
        return p.sdkHttpResponse = {
          headers: c.headers
        }, p;
      })), a.then((c) => {
        const m = Wl(c), p = new St();
        return Object.assign(p, m), p;
      });
    } else {
      const d = $l(this.apiClient, e);
      return u = I("{model}:predict", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "POST",
        httpOptions: (r = e.config) === null || r === void 0 ? void 0 : r.httpOptions,
        abortSignal: (l = e.config) === null || l === void 0 ? void 0 : l.abortSignal
      }).then((c) => c.json().then((m) => {
        const p = m;
        return p.sdkHttpResponse = {
          headers: c.headers
        }, p;
      })), a.then((c) => {
        const m = Ol(c), p = new St();
        return Object.assign(p, m), p;
      });
    }
  }
  /**
   * Private method for editing an image.
   */
  async editImageInternal(e) {
    var t, o;
    let r, l = "", a = {};
    if (this.apiClient.isVertexAI()) {
      const u = Pl(this.apiClient, e);
      return l = I("{model}:predict", u._url), a = u._query, delete u._url, delete u._query, r = this.apiClient.request({
        path: l,
        queryParams: a,
        body: JSON.stringify(u),
        httpMethod: "POST",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((f) => f.json().then((d) => {
        const c = d;
        return c.sdkHttpResponse = {
          headers: f.headers
        }, c;
      })), r.then((f) => {
        const d = wl(f), c = new Pi();
        return Object.assign(c, d), c;
      });
    } else
      throw new Error("This method is only supported by the Vertex AI.");
  }
  /**
   * Private method for upscaling an image.
   */
  async upscaleImageInternal(e) {
    var t, o;
    let r, l = "", a = {};
    if (this.apiClient.isVertexAI()) {
      const u = Ka(this.apiClient, e);
      return l = I("{model}:predict", u._url), a = u._query, delete u._url, delete u._query, r = this.apiClient.request({
        path: l,
        queryParams: a,
        body: JSON.stringify(u),
        httpMethod: "POST",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((f) => f.json().then((d) => {
        const c = d;
        return c.sdkHttpResponse = {
          headers: f.headers
        }, c;
      })), r.then((f) => {
        const d = Oa(f), c = new wi();
        return Object.assign(c, d), c;
      });
    } else
      throw new Error("This method is only supported by the Vertex AI.");
  }
  /**
   * Recontextualizes an image.
   *
   * There are two types of recontextualization currently supported:
   * 1) Imagen Product Recontext - Generate images of products in new scenes
   *    and contexts.
   * 2) Virtual Try-On: Generate images of persons modeling fashion products.
   *
   * @param params - The parameters for recontextualizing an image.
   * @return The response from the API.
   *
   * @example
   * ```ts
   * const response1 = await ai.models.recontextImage({
   *  model: 'imagen-product-recontext-preview-06-30',
   *  source: {
   *    prompt: 'In a modern kitchen setting.',
   *    productImages: [productImage],
   *  },
   *  config: {
   *    numberOfImages: 1,
   *  },
   * });
   * console.log(response1?.generatedImages?.[0]?.image?.imageBytes);
   *
   * const response2 = await ai.models.recontextImage({
   *  model: 'virtual-try-on-001',
   *  source: {
   *    personImage: personImage,
   *    productImages: [productImage],
   *  },
   *  config: {
   *    numberOfImages: 1,
   *  },
   * });
   * console.log(response2?.generatedImages?.[0]?.image?.imageBytes);
   * ```
   */
  async recontextImage(e) {
    var t, o;
    let r, l = "", a = {};
    if (this.apiClient.isVertexAI()) {
      const u = Ra(this.apiClient, e);
      return l = I("{model}:predict", u._url), a = u._query, delete u._url, delete u._query, r = this.apiClient.request({
        path: l,
        queryParams: a,
        body: JSON.stringify(u),
        httpMethod: "POST",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((f) => f.json()), r.then((f) => {
        const d = Pa(f), c = new Mi();
        return Object.assign(c, d), c;
      });
    } else
      throw new Error("This method is only supported by the Vertex AI.");
  }
  /**
   * Segments an image, creating a mask of a specified area.
   *
   * @param params - The parameters for segmenting an image.
   * @return The response from the API.
   *
   * @example
   * ```ts
   * const response = await ai.models.segmentImage({
   *  model: 'image-segmentation-001',
   *  source: {
   *    image: image,
   *  },
   *  config: {
   *    mode: 'foreground',
   *  },
   * });
   * console.log(response?.generatedMasks?.[0]?.mask?.imageBytes);
   * ```
   */
  async segmentImage(e) {
    var t, o;
    let r, l = "", a = {};
    if (this.apiClient.isVertexAI()) {
      const u = Ua(this.apiClient, e);
      return l = I("{model}:predict", u._url), a = u._query, delete u._url, delete u._query, r = this.apiClient.request({
        path: l,
        queryParams: a,
        body: JSON.stringify(u),
        httpMethod: "POST",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((f) => f.json()), r.then((f) => {
        const d = La(f), c = new Ni();
        return Object.assign(c, d), c;
      });
    } else
      throw new Error("This method is only supported by the Vertex AI.");
  }
  /**
   * Fetches information about a model by name.
   *
   * @example
   * ```ts
   * const modelInfo = await ai.models.get({model: 'gemini-2.0-flash'});
   * ```
   */
  async get(e) {
    var t, o, r, l;
    let a, u = "", f = {};
    if (this.apiClient.isVertexAI()) {
      const d = da(this.apiClient, e);
      return u = I("{name}", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "GET",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((c) => c.json()), a.then((c) => Qe(c));
    } else {
      const d = ua(this.apiClient, e);
      return u = I("{name}", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "GET",
        httpOptions: (r = e.config) === null || r === void 0 ? void 0 : r.httpOptions,
        abortSignal: (l = e.config) === null || l === void 0 ? void 0 : l.abortSignal
      }).then((c) => c.json()), a.then((c) => ze(c));
    }
  }
  async listInternal(e) {
    var t, o, r, l;
    let a, u = "", f = {};
    if (this.apiClient.isVertexAI()) {
      const d = _a(this.apiClient, e);
      return u = I("{models_url}", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "GET",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((c) => c.json().then((m) => {
        const p = m;
        return p.sdkHttpResponse = {
          headers: c.headers
        }, p;
      })), a.then((c) => {
        const m = Ca(c), p = new At();
        return Object.assign(p, m), p;
      });
    } else {
      const d = Ta(this.apiClient, e);
      return u = I("{models_url}", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "GET",
        httpOptions: (r = e.config) === null || r === void 0 ? void 0 : r.httpOptions,
        abortSignal: (l = e.config) === null || l === void 0 ? void 0 : l.abortSignal
      }).then((c) => c.json().then((m) => {
        const p = m;
        return p.sdkHttpResponse = {
          headers: c.headers
        }, p;
      })), a.then((c) => {
        const m = Ea(c), p = new At();
        return Object.assign(p, m), p;
      });
    }
  }
  /**
   * Updates a tuned model by its name.
   *
   * @param params - The parameters for updating the model.
   * @return The response from the API.
   *
   * @example
   * ```ts
   * const response = await ai.models.update({
   *   model: 'tuned-model-name',
   *   config: {
   *     displayName: 'New display name',
   *     description: 'New description',
   *   },
   * });
   * ```
   */
  async update(e) {
    var t, o, r, l;
    let a, u = "", f = {};
    if (this.apiClient.isVertexAI()) {
      const d = Ja(this.apiClient, e);
      return u = I("{model}", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "PATCH",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((c) => c.json()), a.then((c) => Qe(c));
    } else {
      const d = ba(this.apiClient, e);
      return u = I("{name}", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "PATCH",
        httpOptions: (r = e.config) === null || r === void 0 ? void 0 : r.httpOptions,
        abortSignal: (l = e.config) === null || l === void 0 ? void 0 : l.abortSignal
      }).then((c) => c.json()), a.then((c) => ze(c));
    }
  }
  /**
   * Deletes a tuned model by its name.
   *
   * @param params - The parameters for deleting the model.
   * @return The response from the API.
   *
   * @example
   * ```ts
   * const response = await ai.models.delete({model: 'tuned-model-name'});
   * ```
   */
  async delete(e) {
    var t, o, r, l;
    let a, u = "", f = {};
    if (this.apiClient.isVertexAI()) {
      const d = Sl(this.apiClient, e);
      return u = I("{name}", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "DELETE",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((c) => c.json().then((m) => {
        const p = m;
        return p.sdkHttpResponse = {
          headers: c.headers
        }, p;
      })), a.then((c) => {
        const m = vl(c), p = new vt();
        return Object.assign(p, m), p;
      });
    } else {
      const d = Il(this.apiClient, e);
      return u = I("{name}", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "DELETE",
        httpOptions: (r = e.config) === null || r === void 0 ? void 0 : r.httpOptions,
        abortSignal: (l = e.config) === null || l === void 0 ? void 0 : l.abortSignal
      }).then((c) => c.json().then((m) => {
        const p = m;
        return p.sdkHttpResponse = {
          headers: c.headers
        }, p;
      })), a.then((c) => {
        const m = Al(c), p = new vt();
        return Object.assign(p, m), p;
      });
    }
  }
  /**
   * Counts the number of tokens in the given contents. Multimodal input is
   * supported for Gemini models.
   *
   * @param params - The parameters for counting tokens.
   * @return The response from the API.
   *
   * @example
   * ```ts
   * const response = await ai.models.countTokens({
   *  model: 'gemini-2.0-flash',
   *  contents: 'The quick brown fox jumps over the lazy dog.'
   * });
   * console.log(response);
   * ```
   */
  async countTokens(e) {
    var t, o, r, l;
    let a, u = "", f = {};
    if (this.apiClient.isVertexAI()) {
      const d = _l(this.apiClient, e);
      return u = I("{model}:countTokens", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "POST",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((c) => c.json().then((m) => {
        const p = m;
        return p.sdkHttpResponse = {
          headers: c.headers
        }, p;
      })), a.then((c) => {
        const m = Cl(c), p = new Rt();
        return Object.assign(p, m), p;
      });
    } else {
      const d = Tl(this.apiClient, e);
      return u = I("{model}:countTokens", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "POST",
        httpOptions: (r = e.config) === null || r === void 0 ? void 0 : r.httpOptions,
        abortSignal: (l = e.config) === null || l === void 0 ? void 0 : l.abortSignal
      }).then((c) => c.json().then((m) => {
        const p = m;
        return p.sdkHttpResponse = {
          headers: c.headers
        }, p;
      })), a.then((c) => {
        const m = El(c), p = new Rt();
        return Object.assign(p, m), p;
      });
    }
  }
  /**
   * Given a list of contents, returns a corresponding TokensInfo containing
   * the list of tokens and list of token ids.
   *
   * This method is not supported by the Gemini Developer API.
   *
   * @param params - The parameters for computing tokens.
   * @return The response from the API.
   *
   * @example
   * ```ts
   * const response = await ai.models.computeTokens({
   *  model: 'gemini-2.0-flash',
   *  contents: 'What is your name?'
   * });
   * console.log(response);
   * ```
   */
  async computeTokens(e) {
    var t, o;
    let r, l = "", a = {};
    if (this.apiClient.isVertexAI()) {
      const u = fl(this.apiClient, e);
      return l = I("{model}:computeTokens", u._url), a = u._query, delete u._url, delete u._query, r = this.apiClient.request({
        path: l,
        queryParams: a,
        body: JSON.stringify(u),
        httpMethod: "POST",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((f) => f.json().then((d) => {
        const c = d;
        return c.sdkHttpResponse = {
          headers: f.headers
        }, c;
      })), r.then((f) => {
        const d = cl(f), c = new Di();
        return Object.assign(c, d), c;
      });
    } else
      throw new Error("This method is only supported by the Vertex AI.");
  }
  /**
   * Private method for generating videos.
   */
  async generateVideosInternal(e) {
    var t, o, r, l;
    let a, u = "", f = {};
    if (this.apiClient.isVertexAI()) {
      const d = jl(this.apiClient, e);
      return u = I("{model}:predictLongRunning", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "POST",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((c) => c.json()), a.then((c) => {
        const m = Xl(c), p = new Se();
        return Object.assign(p, m), p;
      });
    } else {
      const d = Zl(this.apiClient, e);
      return u = I("{model}:predictLongRunning", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "POST",
        httpOptions: (r = e.config) === null || r === void 0 ? void 0 : r.httpOptions,
        abortSignal: (l = e.config) === null || l === void 0 ? void 0 : l.abortSignal
      }).then((c) => c.json()), a.then((c) => {
        const m = Ql(c), p = new Se();
        return Object.assign(p, m), p;
      });
    }
  }
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class Bu extends Y {
  constructor(e) {
    super(), this.apiClient = e;
  }
  /**
   * Gets the status of a long-running operation.
   *
   * @param parameters The parameters for the get operation request.
   * @return The updated Operation object, with the latest status or result.
   */
  async getVideosOperation(e) {
    const t = e.operation, o = e.config;
    if (t.name === void 0 || t.name === "")
      throw new Error("Operation name is required.");
    if (this.apiClient.isVertexAI()) {
      const r = t.name.split("/operations/")[0];
      let l;
      o && "httpOptions" in o && (l = o.httpOptions);
      const a = await this.fetchPredictVideosOperationInternal({
        operationName: t.name,
        resourceName: r,
        config: { httpOptions: l }
      });
      return t._fromAPIResponse({
        apiResponse: a,
        _isVertexAI: !0
      });
    } else {
      const r = await this.getVideosOperationInternal({
        operationName: t.name,
        config: o
      });
      return t._fromAPIResponse({
        apiResponse: r,
        _isVertexAI: !1
      });
    }
  }
  /**
   * Gets the status of a long-running operation.
   *
   * @param parameters The parameters for the get operation request.
   * @return The updated Operation object, with the latest status or result.
   */
  async get(e) {
    const t = e.operation, o = e.config;
    if (t.name === void 0 || t.name === "")
      throw new Error("Operation name is required.");
    if (this.apiClient.isVertexAI()) {
      const r = t.name.split("/operations/")[0];
      let l;
      o && "httpOptions" in o && (l = o.httpOptions);
      const a = await this.fetchPredictVideosOperationInternal({
        operationName: t.name,
        resourceName: r,
        config: { httpOptions: l }
      });
      return t._fromAPIResponse({
        apiResponse: a,
        _isVertexAI: !0
      });
    } else {
      const r = await this.getVideosOperationInternal({
        operationName: t.name,
        config: o
      });
      return t._fromAPIResponse({
        apiResponse: r,
        _isVertexAI: !1
      });
    }
  }
  async getVideosOperationInternal(e) {
    var t, o, r, l;
    let a, u = "", f = {};
    if (this.apiClient.isVertexAI()) {
      const d = Ci(e);
      return u = I("{operationName}", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "GET",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((c) => c.json()), a;
    } else {
      const d = Ei(e);
      return u = I("{operationName}", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "GET",
        httpOptions: (r = e.config) === null || r === void 0 ? void 0 : r.httpOptions,
        abortSignal: (l = e.config) === null || l === void 0 ? void 0 : l.abortSignal
      }).then((c) => c.json()), a;
    }
  }
  async fetchPredictVideosOperationInternal(e) {
    var t, o;
    let r, l = "", a = {};
    if (this.apiClient.isVertexAI()) {
      const u = pi(e);
      return l = I("{resourceName}:fetchPredictOperation", u._url), a = u._query, delete u._url, delete u._query, r = this.apiClient.request({
        path: l,
        queryParams: a,
        body: JSON.stringify(u),
        httpMethod: "POST",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((f) => f.json()), r;
    } else
      throw new Error("This method is only supported by the Vertex AI.");
  }
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function zt(n) {
  const e = {};
  if (i(n, ["languageCodes"]) !== void 0)
    throw new Error("languageCodes parameter is not supported in Gemini API.");
  return e;
}
function bu(n) {
  const e = {}, t = i(n, ["apiKey"]);
  if (t != null && s(e, ["apiKey"], t), i(n, ["apiKeyConfig"]) !== void 0)
    throw new Error("apiKeyConfig parameter is not supported in Gemini API.");
  if (i(n, ["authType"]) !== void 0)
    throw new Error("authType parameter is not supported in Gemini API.");
  if (i(n, ["googleServiceAccountConfig"]) !== void 0)
    throw new Error("googleServiceAccountConfig parameter is not supported in Gemini API.");
  if (i(n, ["httpBasicAuthConfig"]) !== void 0)
    throw new Error("httpBasicAuthConfig parameter is not supported in Gemini API.");
  if (i(n, ["oauthConfig"]) !== void 0)
    throw new Error("oauthConfig parameter is not supported in Gemini API.");
  if (i(n, ["oidcConfig"]) !== void 0)
    throw new Error("oidcConfig parameter is not supported in Gemini API.");
  return e;
}
function Ju(n) {
  const e = {}, t = i(n, ["data"]);
  if (t != null && s(e, ["data"], t), i(n, ["displayName"]) !== void 0)
    throw new Error("displayName parameter is not supported in Gemini API.");
  const o = i(n, ["mimeType"]);
  return o != null && s(e, ["mimeType"], o), e;
}
function $u(n) {
  const e = {}, t = i(n, ["parts"]);
  if (t != null) {
    let r = t;
    Array.isArray(r) && (r = r.map((l) => ju(l))), s(e, ["parts"], r);
  }
  const o = i(n, ["role"]);
  return o != null && s(e, ["role"], o), e;
}
function Ku(n, e, t) {
  const o = {}, r = i(e, ["expireTime"]);
  t !== void 0 && r != null && s(t, ["expireTime"], r);
  const l = i(e, [
    "newSessionExpireTime"
  ]);
  t !== void 0 && l != null && s(t, ["newSessionExpireTime"], l);
  const a = i(e, ["uses"]);
  t !== void 0 && a != null && s(t, ["uses"], a);
  const u = i(e, [
    "liveConnectConstraints"
  ]);
  t !== void 0 && u != null && s(t, ["bidiGenerateContentSetup"], Zu(n, u));
  const f = i(e, [
    "lockAdditionalFields"
  ]);
  return t !== void 0 && f != null && s(t, ["fieldMask"], f), o;
}
function Ou(n, e) {
  const t = {}, o = i(e, ["config"]);
  return o != null && s(t, ["config"], Ku(n, o, t)), t;
}
function Wu(n) {
  const e = {};
  if (i(n, ["displayName"]) !== void 0)
    throw new Error("displayName parameter is not supported in Gemini API.");
  const t = i(n, ["fileUri"]);
  t != null && s(e, ["fileUri"], t);
  const o = i(n, ["mimeType"]);
  return o != null && s(e, ["mimeType"], o), e;
}
function Yu(n) {
  const e = {}, t = i(n, ["id"]);
  t != null && s(e, ["id"], t);
  const o = i(n, ["args"]);
  o != null && s(e, ["args"], o);
  const r = i(n, ["name"]);
  if (r != null && s(e, ["name"], r), i(n, ["partialArgs"]) !== void 0)
    throw new Error("partialArgs parameter is not supported in Gemini API.");
  if (i(n, ["willContinue"]) !== void 0)
    throw new Error("willContinue parameter is not supported in Gemini API.");
  return e;
}
function zu(n) {
  const e = {}, t = i(n, ["authConfig"]);
  t != null && s(e, ["authConfig"], bu(t));
  const o = i(n, ["enableWidget"]);
  return o != null && s(e, ["enableWidget"], o), e;
}
function Qu(n) {
  const e = {}, t = i(n, ["searchTypes"]);
  if (t != null && s(e, ["searchTypes"], t), i(n, ["blockingConfidence"]) !== void 0)
    throw new Error("blockingConfidence parameter is not supported in Gemini API.");
  if (i(n, ["excludeDomains"]) !== void 0)
    throw new Error("excludeDomains parameter is not supported in Gemini API.");
  const o = i(n, [
    "timeRangeFilter"
  ]);
  return o != null && s(e, ["timeRangeFilter"], o), e;
}
function Xu(n, e) {
  const t = {}, o = i(n, [
    "generationConfig"
  ]);
  e !== void 0 && o != null && s(e, ["setup", "generationConfig"], o);
  const r = i(n, [
    "responseModalities"
  ]);
  e !== void 0 && r != null && s(e, ["setup", "generationConfig", "responseModalities"], r);
  const l = i(n, ["temperature"]);
  e !== void 0 && l != null && s(e, ["setup", "generationConfig", "temperature"], l);
  const a = i(n, ["topP"]);
  e !== void 0 && a != null && s(e, ["setup", "generationConfig", "topP"], a);
  const u = i(n, ["topK"]);
  e !== void 0 && u != null && s(e, ["setup", "generationConfig", "topK"], u);
  const f = i(n, [
    "maxOutputTokens"
  ]);
  e !== void 0 && f != null && s(e, ["setup", "generationConfig", "maxOutputTokens"], f);
  const d = i(n, [
    "mediaResolution"
  ]);
  e !== void 0 && d != null && s(e, ["setup", "generationConfig", "mediaResolution"], d);
  const c = i(n, ["seed"]);
  e !== void 0 && c != null && s(e, ["setup", "generationConfig", "seed"], c);
  const m = i(n, ["speechConfig"]);
  e !== void 0 && m != null && s(e, ["setup", "generationConfig", "speechConfig"], fn(m));
  const p = i(n, [
    "thinkingConfig"
  ]);
  e !== void 0 && p != null && s(e, ["setup", "generationConfig", "thinkingConfig"], p);
  const h = i(n, [
    "enableAffectiveDialog"
  ]);
  e !== void 0 && h != null && s(e, ["setup", "generationConfig", "enableAffectiveDialog"], h);
  const g = i(n, [
    "systemInstruction"
  ]);
  e !== void 0 && g != null && s(e, ["setup", "systemInstruction"], $u(k(g)));
  const T = i(n, ["tools"]);
  if (e !== void 0 && T != null) {
    let E = le(T);
    Array.isArray(E) && (E = E.map((w) => nd(se(w)))), s(e, ["setup", "tools"], E);
  }
  const y = i(n, [
    "sessionResumption"
  ]);
  e !== void 0 && y != null && s(e, ["setup", "sessionResumption"], ed(y));
  const _ = i(n, [
    "inputAudioTranscription"
  ]);
  e !== void 0 && _ != null && s(e, ["setup", "inputAudioTranscription"], zt(_));
  const S = i(n, [
    "outputAudioTranscription"
  ]);
  e !== void 0 && S != null && s(e, ["setup", "outputAudioTranscription"], zt(S));
  const C = i(n, [
    "realtimeInputConfig"
  ]);
  e !== void 0 && C != null && s(e, ["setup", "realtimeInputConfig"], C);
  const A = i(n, [
    "contextWindowCompression"
  ]);
  e !== void 0 && A != null && s(e, ["setup", "contextWindowCompression"], A);
  const R = i(n, ["proactivity"]);
  if (e !== void 0 && R != null && s(e, ["setup", "proactivity"], R), i(n, ["explicitVadSignal"]) !== void 0)
    throw new Error("explicitVadSignal parameter is not supported in Gemini API.");
  return t;
}
function Zu(n, e) {
  const t = {}, o = i(e, ["model"]);
  o != null && s(t, ["setup", "model"], N(n, o));
  const r = i(e, ["config"]);
  return r != null && s(t, ["config"], Xu(r, t)), t;
}
function ju(n) {
  const e = {}, t = i(n, [
    "mediaResolution"
  ]);
  t != null && s(e, ["mediaResolution"], t);
  const o = i(n, [
    "codeExecutionResult"
  ]);
  o != null && s(e, ["codeExecutionResult"], o);
  const r = i(n, [
    "executableCode"
  ]);
  r != null && s(e, ["executableCode"], r);
  const l = i(n, ["fileData"]);
  l != null && s(e, ["fileData"], Wu(l));
  const a = i(n, ["functionCall"]);
  a != null && s(e, ["functionCall"], Yu(a));
  const u = i(n, [
    "functionResponse"
  ]);
  u != null && s(e, ["functionResponse"], u);
  const f = i(n, ["inlineData"]);
  f != null && s(e, ["inlineData"], Ju(f));
  const d = i(n, ["text"]);
  d != null && s(e, ["text"], d);
  const c = i(n, ["thought"]);
  c != null && s(e, ["thought"], c);
  const m = i(n, [
    "thoughtSignature"
  ]);
  m != null && s(e, ["thoughtSignature"], m);
  const p = i(n, [
    "videoMetadata"
  ]);
  return p != null && s(e, ["videoMetadata"], p), e;
}
function ed(n) {
  const e = {}, t = i(n, ["handle"]);
  if (t != null && s(e, ["handle"], t), i(n, ["transparent"]) !== void 0)
    throw new Error("transparent parameter is not supported in Gemini API.");
  return e;
}
function nd(n) {
  const e = {};
  if (i(n, ["retrieval"]) !== void 0)
    throw new Error("retrieval parameter is not supported in Gemini API.");
  const t = i(n, ["computerUse"]);
  t != null && s(e, ["computerUse"], t);
  const o = i(n, ["fileSearch"]);
  o != null && s(e, ["fileSearch"], o);
  const r = i(n, ["googleSearch"]);
  r != null && s(e, ["googleSearch"], Qu(r));
  const l = i(n, ["googleMaps"]);
  l != null && s(e, ["googleMaps"], zu(l));
  const a = i(n, [
    "codeExecution"
  ]);
  if (a != null && s(e, ["codeExecution"], a), i(n, ["enterpriseWebSearch"]) !== void 0)
    throw new Error("enterpriseWebSearch parameter is not supported in Gemini API.");
  const u = i(n, [
    "functionDeclarations"
  ]);
  if (u != null) {
    let m = u;
    Array.isArray(m) && (m = m.map((p) => p)), s(e, ["functionDeclarations"], m);
  }
  const f = i(n, [
    "googleSearchRetrieval"
  ]);
  if (f != null && s(e, ["googleSearchRetrieval"], f), i(n, ["parallelAiSearch"]) !== void 0)
    throw new Error("parallelAiSearch parameter is not supported in Gemini API.");
  const d = i(n, ["urlContext"]);
  d != null && s(e, ["urlContext"], d);
  const c = i(n, ["mcpServers"]);
  if (c != null) {
    let m = c;
    Array.isArray(m) && (m = m.map((p) => p)), s(e, ["mcpServers"], m);
  }
  return e;
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function td(n) {
  const e = [];
  for (const t in n)
    if (Object.prototype.hasOwnProperty.call(n, t)) {
      const o = n[t];
      if (typeof o == "object" && o != null && Object.keys(o).length > 0) {
        const r = Object.keys(o).map((l) => `${t}.${l}`);
        e.push(...r);
      } else
        e.push(t);
    }
  return e.join(",");
}
function od(n, e) {
  let t = null;
  const o = n.bidiGenerateContentSetup;
  if (typeof o == "object" && o !== null && "setup" in o) {
    const l = o.setup;
    typeof l == "object" && l !== null ? (n.bidiGenerateContentSetup = l, t = l) : delete n.bidiGenerateContentSetup;
  } else o !== void 0 && delete n.bidiGenerateContentSetup;
  const r = n.fieldMask;
  if (t) {
    const l = td(t);
    if (Array.isArray(e?.lockAdditionalFields) && e?.lockAdditionalFields.length === 0)
      l ? n.fieldMask = l : delete n.fieldMask;
    else if (e?.lockAdditionalFields && e.lockAdditionalFields.length > 0 && r !== null && Array.isArray(r) && r.length > 0) {
      const a = [
        "temperature",
        "topK",
        "topP",
        "maxOutputTokens",
        "responseModalities",
        "seed",
        "speechConfig"
      ];
      let u = [];
      r.length > 0 && (u = r.map((d) => a.includes(d) ? `generationConfig.${d}` : d));
      const f = [];
      l && f.push(l), u.length > 0 && f.push(...u), f.length > 0 ? n.fieldMask = f.join(",") : delete n.fieldMask;
    } else
      delete n.fieldMask;
  } else
    r !== null && Array.isArray(r) && r.length > 0 ? n.fieldMask = r.join(",") : delete n.fieldMask;
  return n;
}
class id extends Y {
  constructor(e) {
    super(), this.apiClient = e;
  }
  /**
   * Creates an ephemeral auth token resource.
   *
   * @experimental
   *
   * @remarks
   * Ephemeral auth tokens is only supported in the Gemini Developer API.
   * It can be used for the session connection to the Live constrained API.
   * Support in v1alpha only.
   *
   * @param params - The parameters for the create request.
   * @return The created auth token.
   *
   * @example
   * ```ts
   * const ai = new GoogleGenAI({
   *     apiKey: token.name,
   *     httpOptions: { apiVersion: 'v1alpha' }  // Support in v1alpha only.
   * });
   *
   * // Case 1: If LiveEphemeralParameters is unset, unlock LiveConnectConfig
   * // when using the token in Live API sessions. Each session connection can
   * // use a different configuration.
   * const config: CreateAuthTokenConfig = {
   *     uses: 3,
   *     expireTime: '2025-05-01T00:00:00Z',
   * }
   * const token = await ai.tokens.create(config);
   *
   * // Case 2: If LiveEphemeralParameters is set, lock all fields in
   * // LiveConnectConfig when using the token in Live API sessions. For
   * // example, changing `outputAudioTranscription` in the Live API
   * // connection will be ignored by the API.
   * const config: CreateAuthTokenConfig =
   *     uses: 3,
   *     expireTime: '2025-05-01T00:00:00Z',
   *     LiveEphemeralParameters: {
   *        model: 'gemini-2.0-flash-001',
   *        config: {
   *           'responseModalities': ['AUDIO'],
   *           'systemInstruction': 'Always answer in English.',
   *        }
   *     }
   * }
   * const token = await ai.tokens.create(config);
   *
   * // Case 3: If LiveEphemeralParameters is set and lockAdditionalFields is
   * // set, lock LiveConnectConfig with set and additional fields (e.g.
   * // responseModalities, systemInstruction, temperature in this example) when
   * // using the token in Live API sessions.
   * const config: CreateAuthTokenConfig =
   *     uses: 3,
   *     expireTime: '2025-05-01T00:00:00Z',
   *     LiveEphemeralParameters: {
   *        model: 'gemini-2.0-flash-001',
   *        config: {
   *           'responseModalities': ['AUDIO'],
   *           'systemInstruction': 'Always answer in English.',
   *        }
   *     },
   *     lockAdditionalFields: ['temperature'],
   * }
   * const token = await ai.tokens.create(config);
   *
   * // Case 4: If LiveEphemeralParameters is set and lockAdditionalFields is
   * // empty array, lock LiveConnectConfig with set fields (e.g.
   * // responseModalities, systemInstruction in this example) when using the
   * // token in Live API sessions.
   * const config: CreateAuthTokenConfig =
   *     uses: 3,
   *     expireTime: '2025-05-01T00:00:00Z',
   *     LiveEphemeralParameters: {
   *        model: 'gemini-2.0-flash-001',
   *        config: {
   *           'responseModalities': ['AUDIO'],
   *           'systemInstruction': 'Always answer in English.',
   *        }
   *     },
   *     lockAdditionalFields: [],
   * }
   * const token = await ai.tokens.create(config);
   * ```
   */
  async create(e) {
    var t, o;
    let r, l = "", a = {};
    if (this.apiClient.isVertexAI())
      throw new Error("The client.tokens.create method is only supported by the Gemini Developer API.");
    {
      const u = Ou(this.apiClient, e);
      l = I("auth_tokens", u._url), a = u._query, delete u.config, delete u._url, delete u._query;
      const f = od(u, e.config);
      return r = this.apiClient.request({
        path: l,
        queryParams: a,
        body: JSON.stringify(f),
        httpMethod: "POST",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((d) => d.json()), r.then((d) => d);
    }
  }
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function rd(n, e) {
  const t = {}, o = i(n, ["force"]);
  return e !== void 0 && o != null && s(e, ["_query", "force"], o), t;
}
function sd(n) {
  const e = {}, t = i(n, ["name"]);
  t != null && s(e, ["_url", "name"], t);
  const o = i(n, ["config"]);
  return o != null && rd(o, e), e;
}
function ld(n) {
  const e = {}, t = i(n, ["name"]);
  return t != null && s(e, ["_url", "name"], t), e;
}
function ad(n, e) {
  const t = {}, o = i(n, ["pageSize"]);
  e !== void 0 && o != null && s(e, ["_query", "pageSize"], o);
  const r = i(n, ["pageToken"]);
  return e !== void 0 && r != null && s(e, ["_query", "pageToken"], r), t;
}
function ud(n) {
  const e = {}, t = i(n, ["parent"]);
  t != null && s(e, ["_url", "parent"], t);
  const o = i(n, ["config"]);
  return o != null && ad(o, e), e;
}
function dd(n) {
  const e = {}, t = i(n, [
    "sdkHttpResponse"
  ]);
  t != null && s(e, ["sdkHttpResponse"], t);
  const o = i(n, [
    "nextPageToken"
  ]);
  o != null && s(e, ["nextPageToken"], o);
  const r = i(n, ["documents"]);
  if (r != null) {
    let l = r;
    Array.isArray(l) && (l = l.map((a) => a)), s(e, ["documents"], l);
  }
  return e;
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class fd extends Y {
  constructor(e) {
    super(), this.apiClient = e, this.list = async (t) => new ne(W.PAGED_ITEM_DOCUMENTS, (o) => this.listInternal({ parent: t.parent, config: o.config }), await this.listInternal(t), t);
  }
  /**
   * Gets a Document.
   *
   * @param params - The parameters for getting a document.
   * @return Document.
   */
  async get(e) {
    var t, o;
    let r, l = "", a = {};
    if (this.apiClient.isVertexAI())
      throw new Error("This method is only supported by the Gemini Developer API.");
    {
      const u = ld(e);
      return l = I("{name}", u._url), a = u._query, delete u._url, delete u._query, r = this.apiClient.request({
        path: l,
        queryParams: a,
        body: JSON.stringify(u),
        httpMethod: "GET",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((f) => f.json()), r.then((f) => f);
    }
  }
  /**
   * Deletes a Document.
   *
   * @param params - The parameters for deleting a document.
   */
  async delete(e) {
    var t, o;
    let r = "", l = {};
    if (this.apiClient.isVertexAI())
      throw new Error("This method is only supported by the Gemini Developer API.");
    {
      const a = sd(e);
      r = I("{name}", a._url), l = a._query, delete a._url, delete a._query, await this.apiClient.request({
        path: r,
        queryParams: l,
        body: JSON.stringify(a),
        httpMethod: "DELETE",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      });
    }
  }
  async listInternal(e) {
    var t, o;
    let r, l = "", a = {};
    if (this.apiClient.isVertexAI())
      throw new Error("This method is only supported by the Gemini Developer API.");
    {
      const u = ud(e);
      return l = I("{parent}/documents", u._url), a = u._query, delete u._url, delete u._query, r = this.apiClient.request({
        path: l,
        queryParams: a,
        body: JSON.stringify(u),
        httpMethod: "GET",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((f) => f.json()), r.then((f) => {
        const d = dd(f), c = new xi();
        return Object.assign(c, d), c;
      });
    }
  }
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class cd extends Y {
  constructor(e, t = new fd(e)) {
    super(), this.apiClient = e, this.documents = t, this.list = async (o = {}) => new ne(W.PAGED_ITEM_FILE_SEARCH_STORES, (r) => this.listInternal(r), await this.listInternal(o), o);
  }
  /**
   * Uploads a file asynchronously to a given File Search Store.
   * This method is not available in Vertex AI.
   * Supported upload sources:
   * - Node.js: File path (string) or Blob object.
   * - Browser: Blob object (e.g., File).
   *
   * @remarks
   * The `mimeType` can be specified in the `config` parameter. If omitted:
   *  - For file path (string) inputs, the `mimeType` will be inferred from the
   *     file extension.
   *  - For Blob object inputs, the `mimeType` will be set to the Blob's `type`
   *     property.
   *
   * This section can contain multiple paragraphs and code examples.
   *
   * @param params - Optional parameters specified in the
   *        `types.UploadToFileSearchStoreParameters` interface.
   *         @see {@link types.UploadToFileSearchStoreParameters#config} for the optional
   *         config in the parameters.
   * @return A promise that resolves to a long running operation.
   * @throws An error if called on a Vertex AI client.
   * @throws An error if the `mimeType` is not provided and can not be inferred,
   * the `mimeType` can be provided in the `params.config` parameter.
   * @throws An error occurs if a suitable upload location cannot be established.
   *
   * @example
   * The following code uploads a file to a given file search store.
   *
   * ```ts
   * const operation = await ai.fileSearchStores.upload({fileSearchStoreName: 'fileSearchStores/foo-bar', file: 'file.txt', config: {
   *   mimeType: 'text/plain',
   * }});
   * console.log(operation.name);
   * ```
   */
  async uploadToFileSearchStore(e) {
    if (this.apiClient.isVertexAI())
      throw new Error("Vertex AI does not support uploading files to a file search store.");
    return this.apiClient.uploadFileToFileSearchStore(e.fileSearchStoreName, e.file, e.config);
  }
  /**
   * Creates a File Search Store.
   *
   * @param params - The parameters for creating a File Search Store.
   * @return FileSearchStore.
   */
  async create(e) {
    var t, o;
    let r, l = "", a = {};
    if (this.apiClient.isVertexAI())
      throw new Error("This method is only supported by the Gemini Developer API.");
    {
      const u = ja(e);
      return l = I("fileSearchStores", u._url), a = u._query, delete u._url, delete u._query, r = this.apiClient.request({
        path: l,
        queryParams: a,
        body: JSON.stringify(u),
        httpMethod: "POST",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((f) => f.json()), r.then((f) => f);
    }
  }
  /**
   * Gets a File Search Store.
   *
   * @param params - The parameters for getting a File Search Store.
   * @return FileSearchStore.
   */
  async get(e) {
    var t, o;
    let r, l = "", a = {};
    if (this.apiClient.isVertexAI())
      throw new Error("This method is only supported by the Gemini Developer API.");
    {
      const u = tu(e);
      return l = I("{name}", u._url), a = u._query, delete u._url, delete u._query, r = this.apiClient.request({
        path: l,
        queryParams: a,
        body: JSON.stringify(u),
        httpMethod: "GET",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((f) => f.json()), r.then((f) => f);
    }
  }
  /**
   * Deletes a File Search Store.
   *
   * @param params - The parameters for deleting a File Search Store.
   */
  async delete(e) {
    var t, o;
    let r = "", l = {};
    if (this.apiClient.isVertexAI())
      throw new Error("This method is only supported by the Gemini Developer API.");
    {
      const a = nu(e);
      r = I("{name}", a._url), l = a._query, delete a._url, delete a._query, await this.apiClient.request({
        path: r,
        queryParams: l,
        body: JSON.stringify(a),
        httpMethod: "DELETE",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      });
    }
  }
  async listInternal(e) {
    var t, o;
    let r, l = "", a = {};
    if (this.apiClient.isVertexAI())
      throw new Error("This method is only supported by the Gemini Developer API.");
    {
      const u = au(e);
      return l = I("fileSearchStores", u._url), a = u._query, delete u._url, delete u._query, r = this.apiClient.request({
        path: l,
        queryParams: a,
        body: JSON.stringify(u),
        httpMethod: "GET",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((f) => f.json()), r.then((f) => {
        const d = uu(f), c = new Ui();
        return Object.assign(c, d), c;
      });
    }
  }
  async uploadToFileSearchStoreInternal(e) {
    var t, o;
    let r, l = "", a = {};
    if (this.apiClient.isVertexAI())
      throw new Error("This method is only supported by the Gemini Developer API.");
    {
      const u = du(e);
      return l = I("upload/v1beta/{file_search_store_name}:uploadToFileSearchStore", u._url), a = u._query, delete u._url, delete u._query, r = this.apiClient.request({
        path: l,
        queryParams: a,
        body: JSON.stringify(u),
        httpMethod: "POST",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((f) => f.json()), r.then((f) => {
        const d = fu(f), c = new Li();
        return Object.assign(c, d), c;
      });
    }
  }
  /**
   * Imports a File from File Service to a FileSearchStore.
   *
   * This is a long-running operation, see aip.dev/151
   *
   * @param params - The parameters for importing a file to a file search store.
   * @return ImportFileOperation.
   */
  async importFile(e) {
    var t, o;
    let r, l = "", a = {};
    if (this.apiClient.isVertexAI())
      throw new Error("This method is only supported by the Gemini Developer API.");
    {
      const u = ru(e);
      return l = I("{file_search_store_name}:importFile", u._url), a = u._query, delete u._url, delete u._query, r = this.apiClient.request({
        path: l,
        queryParams: a,
        body: JSON.stringify(u),
        httpMethod: "POST",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((f) => f.json()), r.then((f) => {
        const d = iu(f), c = new sn();
        return Object.assign(c, d), c;
      });
    }
  }
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
let Mo = function() {
  const { crypto: n } = globalThis;
  if (n?.randomUUID)
    return Mo = n.randomUUID.bind(n), n.randomUUID();
  const e = new Uint8Array(1), t = n ? () => n.getRandomValues(e)[0] : () => Math.random() * 255 & 255;
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (o) => (+o ^ t() & 15 >> +o / 4).toString(16));
};
const pd = () => Mo();
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function Ze(n) {
  return typeof n == "object" && n !== null && // Spec-compliant fetch implementations
  ("name" in n && n.name === "AbortError" || // Expo fetch
  "message" in n && String(n.message).includes("FetchRequestCanceledException"));
}
const je = (n) => {
  if (n instanceof Error)
    return n;
  if (typeof n == "object" && n !== null) {
    try {
      if (Object.prototype.toString.call(n) === "[object Error]") {
        const e = new Error(n.message, n.cause ? { cause: n.cause } : {});
        return n.stack && (e.stack = n.stack), n.cause && !e.cause && (e.cause = n.cause), n.name && (e.name = n.name), e;
      }
    } catch {
    }
    try {
      return new Error(JSON.stringify(n));
    } catch {
    }
  }
  return new Error(n);
};
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class B extends Error {
}
class V extends B {
  constructor(e, t, o, r) {
    super(`${V.makeMessage(e, t, o)}`), this.status = e, this.headers = r, this.error = t;
  }
  static makeMessage(e, t, o) {
    const r = t?.message ? typeof t.message == "string" ? t.message : JSON.stringify(t.message) : t ? JSON.stringify(t) : o;
    return e && r ? `${e} ${r}` : e ? `${e} status code (no body)` : r || "(no status code or body)";
  }
  static generate(e, t, o, r) {
    if (!e || !r)
      return new De({ message: o, cause: je(t) });
    const l = t;
    return e === 400 ? new Do(e, l, o, r) : e === 401 ? new xo(e, l, o, r) : e === 403 ? new Uo(e, l, o, r) : e === 404 ? new Lo(e, l, o, r) : e === 409 ? new ko(e, l, o, r) : e === 422 ? new Go(e, l, o, r) : e === 429 ? new Fo(e, l, o, r) : e >= 500 ? new Vo(e, l, o, r) : new V(e, l, o, r);
  }
}
class en extends V {
  constructor({ message: e } = {}) {
    super(void 0, void 0, e || "Request was aborted.", void 0);
  }
}
class De extends V {
  constructor({ message: e, cause: t }) {
    super(void 0, void 0, e || "Connection error.", void 0), t && (this.cause = t);
  }
}
class No extends De {
  constructor({ message: e } = {}) {
    super({ message: e ?? "Request timed out." });
  }
}
class Do extends V {
}
class xo extends V {
}
class Uo extends V {
}
class Lo extends V {
}
class ko extends V {
}
class Go extends V {
}
class Fo extends V {
}
class Vo extends V {
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const md = /^[a-z][a-z0-9+.-]*:/i, hd = (n) => md.test(n);
let nn = (n) => (nn = Array.isArray, nn(n));
const gd = nn;
let yd = gd;
const Qt = yd;
function Xt(n) {
  if (!n)
    return !0;
  for (const e in n)
    return !1;
  return !0;
}
function Td(n, e) {
  return Object.prototype.hasOwnProperty.call(n, e);
}
const _d = (n, e) => {
  if (typeof e != "number" || !Number.isInteger(e))
    throw new B(`${n} must be an integer`);
  if (e < 0)
    throw new B(`${n} must be a positive integer`);
  return e;
}, Ed = (n) => {
  try {
    return JSON.parse(n);
  } catch {
    return;
  }
};
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const Cd = (n) => new Promise((e) => setTimeout(e, n));
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function Id() {
  if (typeof fetch < "u")
    return fetch;
  throw new Error("`fetch` is not defined as a global; Either pass `fetch` to the client, `new GeminiNextGenAPIClient({ fetch })` or polyfill the global, `globalThis.fetch = fetch`");
}
function qo(...n) {
  const e = globalThis.ReadableStream;
  if (typeof e > "u")
    throw new Error("`ReadableStream` is not defined as a global; You will need to polyfill it, `globalThis.ReadableStream = ReadableStream`");
  return new e(...n);
}
function Sd(n) {
  let e = Symbol.asyncIterator in n ? n[Symbol.asyncIterator]() : n[Symbol.iterator]();
  return qo({
    start() {
    },
    async pull(t) {
      const { done: o, value: r } = await e.next();
      o ? t.close() : t.enqueue(r);
    },
    async cancel() {
      var t;
      await ((t = e.return) === null || t === void 0 ? void 0 : t.call(e));
    }
  });
}
function Ho(n) {
  if (n[Symbol.asyncIterator])
    return n;
  const e = n.getReader();
  return {
    async next() {
      try {
        const t = await e.read();
        return t?.done && e.releaseLock(), t;
      } catch (t) {
        throw e.releaseLock(), t;
      }
    },
    async return() {
      const t = e.cancel();
      return e.releaseLock(), await t, { done: !0, value: void 0 };
    },
    [Symbol.asyncIterator]() {
      return this;
    }
  };
}
async function Ad(n) {
  var e, t;
  if (n === null || typeof n != "object")
    return;
  if (n[Symbol.asyncIterator]) {
    await ((t = (e = n[Symbol.asyncIterator]()).return) === null || t === void 0 ? void 0 : t.call(e));
    return;
  }
  const o = n.getReader(), r = o.cancel();
  o.releaseLock(), await r;
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const vd = ({ headers: n, body: e }) => ({
  bodyHeaders: {
    "content-type": "application/json"
  },
  body: JSON.stringify(e)
});
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function Rd(n) {
  return Object.entries(n).filter(([e, t]) => typeof t < "u").map(([e, t]) => {
    if (typeof t == "string" || typeof t == "number" || typeof t == "boolean")
      return `${encodeURIComponent(e)}=${encodeURIComponent(t)}`;
    if (t === null)
      return `${encodeURIComponent(e)}=`;
    throw new B(`Cannot stringify type ${typeof t}; Expected string, number, boolean, or null. If you need to pass nested query parameters, you can manually encode them, e.g. { query: { 'foo[key1]': value1, 'foo[key2]': value2 } }, and please open a GitHub issue requesting better support for your use case.`);
  }).join("&");
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const Pd = "0.0.1";
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const Bo = () => {
  var n;
  if (typeof File > "u") {
    const { process: e } = globalThis, t = typeof ((n = e?.versions) === null || n === void 0 ? void 0 : n.node) == "string" && parseInt(e.versions.node.split(".")) < 20;
    throw new Error("`File` is not defined as a global, which is required for file uploads." + (t ? " Update to Node 20 LTS or newer, or set `globalThis.File` to `import('node:buffer').File`." : ""));
  }
};
function Ve(n, e, t) {
  return Bo(), new File(n, e ?? "unknown_file", t);
}
function wd(n) {
  return (typeof n == "object" && n !== null && ("name" in n && n.name && String(n.name) || "url" in n && n.url && String(n.url) || "filename" in n && n.filename && String(n.filename) || "path" in n && n.path && String(n.path)) || "").split(/[\\/]/).pop() || void 0;
}
const Md = (n) => n != null && typeof n == "object" && typeof n[Symbol.asyncIterator] == "function";
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const bo = (n) => n != null && typeof n == "object" && typeof n.size == "number" && typeof n.type == "string" && typeof n.text == "function" && typeof n.slice == "function" && typeof n.arrayBuffer == "function", Nd = (n) => n != null && typeof n == "object" && typeof n.name == "string" && typeof n.lastModified == "number" && bo(n), Dd = (n) => n != null && typeof n == "object" && typeof n.url == "string" && typeof n.blob == "function";
async function xd(n, e, t) {
  if (Bo(), n = await n, Nd(n))
    return n instanceof File ? n : Ve([await n.arrayBuffer()], n.name);
  if (Dd(n)) {
    const r = await n.blob();
    return e || (e = new URL(n.url).pathname.split(/[\\/]/).pop()), Ve(await tn(r), e, t);
  }
  const o = await tn(n);
  if (e || (e = wd(n)), !t?.type) {
    const r = o.find((l) => typeof l == "object" && "type" in l && l.type);
    typeof r == "string" && (t = Object.assign(Object.assign({}, t), { type: r }));
  }
  return Ve(o, e, t);
}
async function tn(n) {
  var e, t, o, r, l;
  let a = [];
  if (typeof n == "string" || ArrayBuffer.isView(n) || // includes Uint8Array, Buffer, etc.
  n instanceof ArrayBuffer)
    a.push(n);
  else if (bo(n))
    a.push(n instanceof Blob ? n : await n.arrayBuffer());
  else if (Md(n))
    try {
      for (var u = !0, f = J(n), d; d = await f.next(), e = d.done, !e; u = !0) {
        r = d.value, u = !1;
        const c = r;
        a.push(...await tn(c));
      }
    } catch (c) {
      t = { error: c };
    } finally {
      try {
        !u && !e && (o = f.return) && await o.call(f);
      } finally {
        if (t) throw t.error;
      }
    }
  else {
    const c = (l = n?.constructor) === null || l === void 0 ? void 0 : l.name;
    throw new Error(`Unexpected data type: ${typeof n}${c ? `; constructor: ${c}` : ""}${Ud(n)}`);
  }
  return a;
}
function Ud(n) {
  return typeof n != "object" || n === null ? "" : `; props: [${Object.getOwnPropertyNames(n).map((t) => `"${t}"`).join(", ")}]`;
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class Jo {
  constructor(e) {
    this._client = e;
  }
}
Jo._key = [];
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function $o(n) {
  return n.replace(/[^A-Za-z0-9\-._~!$&'()*+,;=:@]+/g, encodeURIComponent);
}
const Zt = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.create(null)), Ld = (n = $o) => (function(t, ...o) {
  if (t.length === 1)
    return t[0];
  let r = !1;
  const l = [], a = t.reduce((c, m, p) => {
    var h, g, T;
    /[?#]/.test(m) && (r = !0);
    const y = o[p];
    let _ = (r ? encodeURIComponent : n)("" + y);
    return p !== o.length && (y == null || typeof y == "object" && // handle values from other realms
    y.toString === ((T = Object.getPrototypeOf((g = Object.getPrototypeOf((h = y.hasOwnProperty) !== null && h !== void 0 ? h : Zt)) !== null && g !== void 0 ? g : Zt)) === null || T === void 0 ? void 0 : T.toString)) && (_ = y + "", l.push({
      start: c.length + m.length,
      length: _.length,
      error: `Value of type ${Object.prototype.toString.call(y).slice(8, -1)} is not a valid path parameter`
    })), c + m + (p === o.length ? "" : _);
  }, ""), u = a.split(/[?#]/, 1)[0], f = /(^|\/)(?:\.|%2e){1,2}(?=\/|$)/gi;
  let d;
  for (; (d = f.exec(u)) !== null; ) {
    const c = d[0].startsWith("/"), m = c ? 1 : 0, p = c ? d[0].slice(1) : d[0];
    l.push({
      start: d.index + m,
      length: p.length,
      error: `Value "${p}" can't be safely passed as a path parameter`
    });
  }
  if (l.sort((c, m) => c.start - m.start), l.length > 0) {
    let c = 0;
    const m = l.reduce((p, h) => {
      const g = " ".repeat(h.start - c), T = "^".repeat(h.length);
      return c = h.start + h.length, p + g + T;
    }, "");
    throw new B(`Path parameters result in path with invalid segments:
${l.map((p) => p.error).join(`
`)}
${a}
${m}`);
  }
  return a;
}), he = /* @__PURE__ */ Ld($o);
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class Ko extends Jo {
  create(e, t) {
    var o;
    const { api_version: r = this._client.apiVersion } = e, l = ve(e, ["api_version"]);
    if ("model" in l && "agent_config" in l)
      throw new B("Invalid request: specified `model` and `agent_config`. If specifying `model`, use `generation_config`.");
    if ("agent" in l && "generation_config" in l)
      throw new B("Invalid request: specified `agent` and `generation_config`. If specifying `agent`, use `agent_config`.");
    return this._client.post(he`/${r}/interactions`, Object.assign(Object.assign({ body: l }, t), { stream: (o = e.stream) !== null && o !== void 0 ? o : !1 }));
  }
  /**
   * Deletes the interaction by id.
   *
   * @example
   * ```ts
   * const interaction = await client.interactions.delete('id', {
   *   api_version: 'api_version',
   * });
   * ```
   */
  delete(e, t = {}, o) {
    const { api_version: r = this._client.apiVersion } = t ?? {};
    return this._client.delete(he`/${r}/interactions/${e}`, o);
  }
  /**
   * Cancels an interaction by id. This only applies to background interactions that are still running.
   *
   * @example
   * ```ts
   * const interaction = await client.interactions.cancel('id', {
   *   api_version: 'api_version',
   * });
   * ```
   */
  cancel(e, t = {}, o) {
    const { api_version: r = this._client.apiVersion } = t ?? {};
    return this._client.post(he`/${r}/interactions/${e}/cancel`, o);
  }
  get(e, t = {}, o) {
    var r;
    const l = t ?? {}, { api_version: a = this._client.apiVersion } = l, u = ve(l, ["api_version"]);
    return this._client.get(he`/${a}/interactions/${e}`, Object.assign(Object.assign({ query: u }, o), { stream: (r = t?.stream) !== null && r !== void 0 ? r : !1 }));
  }
}
Ko._key = Object.freeze(["interactions"]);
class Oo extends Ko {
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function kd(n) {
  let e = 0;
  for (const r of n)
    e += r.length;
  const t = new Uint8Array(e);
  let o = 0;
  for (const r of n)
    t.set(r, o), o += r.length;
  return t;
}
let ge;
function pn(n) {
  let e;
  return (ge ?? (e = new globalThis.TextEncoder(), ge = e.encode.bind(e)))(n);
}
let ye;
function jt(n) {
  let e;
  return (ye ?? (e = new globalThis.TextDecoder(), ye = e.decode.bind(e)))(n);
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class xe {
  constructor() {
    this.buffer = new Uint8Array(), this.carriageReturnIndex = null, this.searchIndex = 0;
  }
  decode(e) {
    var t;
    if (e == null)
      return [];
    const o = e instanceof ArrayBuffer ? new Uint8Array(e) : typeof e == "string" ? pn(e) : e;
    this.buffer = kd([this.buffer, o]);
    const r = [];
    let l;
    for (; (l = Gd(this.buffer, (t = this.carriageReturnIndex) !== null && t !== void 0 ? t : this.searchIndex)) != null; ) {
      if (l.carriage && this.carriageReturnIndex == null) {
        this.carriageReturnIndex = l.index;
        continue;
      }
      if (this.carriageReturnIndex != null && (l.index !== this.carriageReturnIndex + 1 || l.carriage)) {
        r.push(jt(this.buffer.subarray(0, this.carriageReturnIndex - 1))), this.buffer = this.buffer.subarray(this.carriageReturnIndex), this.carriageReturnIndex = null, this.searchIndex = 0;
        continue;
      }
      const a = this.carriageReturnIndex !== null ? l.preceding - 1 : l.preceding, u = jt(this.buffer.subarray(0, a));
      r.push(u), this.buffer = this.buffer.subarray(l.index), this.carriageReturnIndex = null, this.searchIndex = 0;
    }
    return this.searchIndex = Math.max(0, this.buffer.length - 1), r;
  }
  flush() {
    return this.buffer.length ? this.decode(`
`) : [];
  }
}
xe.NEWLINE_CHARS = /* @__PURE__ */ new Set([`
`, "\r"]);
xe.NEWLINE_REGEXP = /\r\n|[\n\r]/g;
function Gd(n, e) {
  const r = e ?? 0, l = n.indexOf(10, r), a = n.indexOf(13, r);
  if (l === -1 && a === -1)
    return null;
  let u;
  return l !== -1 && a !== -1 ? u = Math.min(l, a) : u = l !== -1 ? l : a, n[u] === 10 ? { preceding: u, index: u + 1, carriage: !1 } : { preceding: u, index: u + 1, carriage: !0 };
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const Re = {
  off: 0,
  error: 200,
  warn: 300,
  info: 400,
  debug: 500
}, eo = (n, e, t) => {
  if (n) {
    if (Td(Re, n))
      return n;
    F(t).warn(`${e} was set to ${JSON.stringify(n)}, expected one of ${JSON.stringify(Object.keys(Re))}`);
  }
};
function ce() {
}
function Te(n, e, t) {
  return !e || Re[n] > Re[t] ? ce : e[n].bind(e);
}
const Fd = {
  error: ce,
  warn: ce,
  info: ce,
  debug: ce
};
let no = /* @__PURE__ */ new WeakMap();
function F(n) {
  var e;
  const t = n.logger, o = (e = n.logLevel) !== null && e !== void 0 ? e : "off";
  if (!t)
    return Fd;
  const r = no.get(t);
  if (r && r[0] === o)
    return r[1];
  const l = {
    error: Te("error", t, o),
    warn: Te("warn", t, o),
    info: Te("info", t, o),
    debug: Te("debug", t, o)
  };
  return no.set(t, [o, l]), l;
}
const j = (n) => (n.options && (n.options = Object.assign({}, n.options), delete n.options.headers), n.headers && (n.headers = Object.fromEntries((n.headers instanceof Headers ? [...n.headers] : Object.entries(n.headers)).map(([e, t]) => [
  e,
  e.toLowerCase() === "x-goog-api-key" || e.toLowerCase() === "authorization" || e.toLowerCase() === "cookie" || e.toLowerCase() === "set-cookie" ? "***" : t
]))), "retryOfRequestLogID" in n && (n.retryOfRequestLogID && (n.retryOf = n.retryOfRequestLogID), delete n.retryOfRequestLogID), n);
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class oe {
  constructor(e, t, o) {
    this.iterator = e, this.controller = t, this.client = o;
  }
  static fromSSEResponse(e, t, o) {
    let r = !1;
    const l = o ? F(o) : console;
    function a() {
      return b(this, arguments, function* () {
        var f, d, c, m;
        if (r)
          throw new B("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
        r = !0;
        let p = !1;
        try {
          try {
            for (var h = !0, g = J(Vd(e, t)), T; T = yield P(g.next()), f = T.done, !f; h = !0) {
              m = T.value, h = !1;
              const y = m;
              if (!p)
                if (y.data.startsWith("[DONE]")) {
                  p = !0;
                  continue;
                } else
                  try {
                    yield yield P(JSON.parse(y.data));
                  } catch (_) {
                    throw l.error("Could not parse message into JSON:", y.data), l.error("From chunk:", y.raw), _;
                  }
            }
          } catch (y) {
            d = { error: y };
          } finally {
            try {
              !h && !f && (c = g.return) && (yield P(c.call(g)));
            } finally {
              if (d) throw d.error;
            }
          }
          p = !0;
        } catch (y) {
          if (Ze(y))
            return yield P(void 0);
          throw y;
        } finally {
          p || t.abort();
        }
      });
    }
    return new oe(a, t, o);
  }
  /**
   * Generates a Stream from a newline-separated ReadableStream
   * where each item is a JSON value.
   */
  static fromReadableStream(e, t, o) {
    let r = !1;
    function l() {
      return b(this, arguments, function* () {
        var f, d, c, m;
        const p = new xe(), h = Ho(e);
        try {
          for (var g = !0, T = J(h), y; y = yield P(T.next()), f = y.done, !f; g = !0) {
            m = y.value, g = !1;
            const _ = m;
            for (const S of p.decode(_))
              yield yield P(S);
          }
        } catch (_) {
          d = { error: _ };
        } finally {
          try {
            !g && !f && (c = T.return) && (yield P(c.call(T)));
          } finally {
            if (d) throw d.error;
          }
        }
        for (const _ of p.flush())
          yield yield P(_);
      });
    }
    function a() {
      return b(this, arguments, function* () {
        var f, d, c, m;
        if (r)
          throw new B("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
        r = !0;
        let p = !1;
        try {
          try {
            for (var h = !0, g = J(l()), T; T = yield P(g.next()), f = T.done, !f; h = !0) {
              m = T.value, h = !1;
              const y = m;
              p || y && (yield yield P(JSON.parse(y)));
            }
          } catch (y) {
            d = { error: y };
          } finally {
            try {
              !h && !f && (c = g.return) && (yield P(c.call(g)));
            } finally {
              if (d) throw d.error;
            }
          }
          p = !0;
        } catch (y) {
          if (Ze(y))
            return yield P(void 0);
          throw y;
        } finally {
          p || t.abort();
        }
      });
    }
    return new oe(a, t, o);
  }
  [Symbol.asyncIterator]() {
    return this.iterator();
  }
  /**
   * Splits the stream into two streams which can be
   * independently read from at different speeds.
   */
  tee() {
    const e = [], t = [], o = this.iterator(), r = (l) => ({
      next: () => {
        if (l.length === 0) {
          const a = o.next();
          e.push(a), t.push(a);
        }
        return l.shift();
      }
    });
    return [
      new oe(() => r(e), this.controller, this.client),
      new oe(() => r(t), this.controller, this.client)
    ];
  }
  /**
   * Converts this stream to a newline-separated ReadableStream of
   * JSON stringified values in the stream
   * which can be turned back into a Stream with `Stream.fromReadableStream()`.
   */
  toReadableStream() {
    const e = this;
    let t;
    return qo({
      async start() {
        t = e[Symbol.asyncIterator]();
      },
      async pull(o) {
        try {
          const { value: r, done: l } = await t.next();
          if (l)
            return o.close();
          const a = pn(JSON.stringify(r) + `
`);
          o.enqueue(a);
        } catch (r) {
          o.error(r);
        }
      },
      async cancel() {
        var o;
        await ((o = t.return) === null || o === void 0 ? void 0 : o.call(t));
      }
    });
  }
}
function Vd(n, e) {
  return b(this, arguments, function* () {
    var o, r, l, a;
    if (!n.body)
      throw e.abort(), typeof globalThis.navigator < "u" && globalThis.navigator.product === "ReactNative" ? new B("The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api") : new B("Attempted to iterate over a response with no body");
    const u = new Hd(), f = new xe(), d = Ho(n.body);
    try {
      for (var c = !0, m = J(qd(d)), p; p = yield P(m.next()), o = p.done, !o; c = !0) {
        a = p.value, c = !1;
        const h = a;
        for (const g of f.decode(h)) {
          const T = u.decode(g);
          T && (yield yield P(T));
        }
      }
    } catch (h) {
      r = { error: h };
    } finally {
      try {
        !c && !o && (l = m.return) && (yield P(l.call(m)));
      } finally {
        if (r) throw r.error;
      }
    }
    for (const h of f.flush()) {
      const g = u.decode(h);
      g && (yield yield P(g));
    }
  });
}
function qd(n) {
  return b(this, arguments, function* () {
    var t, o, r, l;
    try {
      for (var a = !0, u = J(n), f; f = yield P(u.next()), t = f.done, !t; a = !0) {
        l = f.value, a = !1;
        const d = l;
        if (d == null)
          continue;
        const c = d instanceof ArrayBuffer ? new Uint8Array(d) : typeof d == "string" ? pn(d) : d;
        yield yield P(c);
      }
    } catch (d) {
      o = { error: d };
    } finally {
      try {
        !a && !t && (r = u.return) && (yield P(r.call(u)));
      } finally {
        if (o) throw o.error;
      }
    }
  });
}
class Hd {
  constructor() {
    this.event = null, this.data = [], this.chunks = [];
  }
  decode(e) {
    if (e.endsWith("\r") && (e = e.substring(0, e.length - 1)), !e) {
      if (!this.event && !this.data.length)
        return null;
      const l = {
        event: this.event,
        data: this.data.join(`
`),
        raw: this.chunks
      };
      return this.event = null, this.data = [], this.chunks = [], l;
    }
    if (this.chunks.push(e), e.startsWith(":"))
      return null;
    let [t, o, r] = Bd(e, ":");
    return r.startsWith(" ") && (r = r.substring(1)), t === "event" ? this.event = r : t === "data" && this.data.push(r), null;
  }
}
function Bd(n, e) {
  const t = n.indexOf(e);
  return t !== -1 ? [n.substring(0, t), e, n.substring(t + e.length)] : [n, "", ""];
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
async function bd(n, e) {
  const { response: t, requestLogID: o, retryOfRequestLogID: r, startTime: l } = e, a = await (async () => {
    var u;
    if (e.options.stream)
      return F(n).debug("response", t.status, t.url, t.headers, t.body), e.options.__streamClass ? e.options.__streamClass.fromSSEResponse(t, e.controller, n) : oe.fromSSEResponse(t, e.controller, n);
    if (t.status === 204)
      return null;
    if (e.options.__binaryResponse)
      return t;
    const f = t.headers.get("content-type"), d = (u = f?.split(";")[0]) === null || u === void 0 ? void 0 : u.trim();
    return d?.includes("application/json") || d?.endsWith("+json") ? t.headers.get("content-length") === "0" ? void 0 : await t.json() : await t.text();
  })();
  return F(n).debug(`[${o}] response parsed`, j({
    retryOfRequestLogID: r,
    url: t.url,
    status: t.status,
    body: a,
    durationMs: Date.now() - l
  })), a;
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class mn extends Promise {
  constructor(e, t, o = bd) {
    super((r) => {
      r(null);
    }), this.responsePromise = t, this.parseResponse = o, this.client = e;
  }
  _thenUnwrap(e) {
    return new mn(this.client, this.responsePromise, async (t, o) => e(await this.parseResponse(t, o), o));
  }
  /**
   * Gets the raw `Response` instance instead of parsing the response
   * data.
   *
   * If you want to parse the response body but still get the `Response`
   * instance, you can use {@link withResponse()}.
   *
   * 👋 Getting the wrong TypeScript type for `Response`?
   * Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
   * to your `tsconfig.json`.
   */
  asResponse() {
    return this.responsePromise.then((e) => e.response);
  }
  /**
   * Gets the parsed response data and the raw `Response` instance.
   *
   * If you just want to get the raw `Response` instance without parsing it,
   * you can use {@link asResponse()}.
   *
   * 👋 Getting the wrong TypeScript type for `Response`?
   * Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
   * to your `tsconfig.json`.
   */
  async withResponse() {
    const [e, t] = await Promise.all([this.parse(), this.asResponse()]);
    return { data: e, response: t };
  }
  parse() {
    return this.parsedPromise || (this.parsedPromise = this.responsePromise.then((e) => this.parseResponse(this.client, e))), this.parsedPromise;
  }
  then(e, t) {
    return this.parse().then(e, t);
  }
  catch(e) {
    return this.parse().catch(e);
  }
  finally(e) {
    return this.parse().finally(e);
  }
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const Wo = /* @__PURE__ */ Symbol("brand.privateNullableHeaders");
function* Jd(n) {
  if (!n)
    return;
  if (Wo in n) {
    const { values: o, nulls: r } = n;
    yield* o.entries();
    for (const l of r)
      yield [l, null];
    return;
  }
  let e = !1, t;
  n instanceof Headers ? t = n.entries() : Qt(n) ? t = n : (e = !0, t = Object.entries(n ?? {}));
  for (let o of t) {
    const r = o[0];
    if (typeof r != "string")
      throw new TypeError("expected header name to be a string");
    const l = Qt(o[1]) ? o[1] : [o[1]];
    let a = !1;
    for (const u of l)
      u !== void 0 && (e && !a && (a = !0, yield [r, null]), yield [r, u]);
  }
}
const fe = (n) => {
  const e = new Headers(), t = /* @__PURE__ */ new Set();
  for (const o of n) {
    const r = /* @__PURE__ */ new Set();
    for (const [l, a] of Jd(o)) {
      const u = l.toLowerCase();
      r.has(u) || (e.delete(l), r.add(u)), a === null ? (e.delete(l), t.add(u)) : (e.append(l, a), t.delete(u));
    }
  }
  return { [Wo]: !0, values: e, nulls: t };
};
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const qe = (n) => {
  var e, t, o, r, l, a;
  if (typeof globalThis.process < "u")
    return (o = (t = (e = globalThis.process.env) === null || e === void 0 ? void 0 : e[n]) === null || t === void 0 ? void 0 : t.trim()) !== null && o !== void 0 ? o : void 0;
  if (typeof globalThis.Deno < "u")
    return (a = (l = (r = globalThis.Deno.env) === null || r === void 0 ? void 0 : r.get) === null || l === void 0 ? void 0 : l.call(r, n)) === null || a === void 0 ? void 0 : a.trim();
};
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
var Yo;
class Ue {
  /**
   * API Client for interfacing with the Gemini Next Gen API API.
   *
   * @param {string | null | undefined} [opts.apiKey=process.env['GEMINI_API_KEY'] ?? null]
   * @param {string | undefined} [opts.apiVersion=v1beta]
   * @param {string} [opts.baseURL=process.env['GEMINI_NEXT_GEN_API_BASE_URL'] ?? https://generativelanguage.googleapis.com] - Override the default base URL for the API.
   * @param {number} [opts.timeout=1 minute] - The maximum amount of time (in milliseconds) the client will wait for a response before timing out.
   * @param {MergedRequestInit} [opts.fetchOptions] - Additional `RequestInit` options to be passed to `fetch` calls.
   * @param {Fetch} [opts.fetch] - Specify a custom `fetch` function implementation.
   * @param {number} [opts.maxRetries=2] - The maximum number of times the client will retry a request.
   * @param {HeadersLike} opts.defaultHeaders - Default headers to include with every request to the API.
   * @param {Record<string, string | undefined>} opts.defaultQuery - Default query parameters to include with every request to the API.
   */
  constructor(e) {
    var t, o, r, l, a, u, f, { baseURL: d = qe("GEMINI_NEXT_GEN_API_BASE_URL"), apiKey: c = (t = qe("GEMINI_API_KEY")) !== null && t !== void 0 ? t : null, apiVersion: m = "v1beta" } = e, p = ve(e, ["baseURL", "apiKey", "apiVersion"]);
    const h = Object.assign(Object.assign({
      apiKey: c,
      apiVersion: m
    }, p), { baseURL: d || "https://generativelanguage.googleapis.com" });
    this.baseURL = h.baseURL, this.timeout = (o = h.timeout) !== null && o !== void 0 ? o : Ue.DEFAULT_TIMEOUT, this.logger = (r = h.logger) !== null && r !== void 0 ? r : console;
    const g = "warn";
    this.logLevel = g, this.logLevel = (a = (l = eo(h.logLevel, "ClientOptions.logLevel", this)) !== null && l !== void 0 ? l : eo(qe("GEMINI_NEXT_GEN_API_LOG"), "process.env['GEMINI_NEXT_GEN_API_LOG']", this)) !== null && a !== void 0 ? a : g, this.fetchOptions = h.fetchOptions, this.maxRetries = (u = h.maxRetries) !== null && u !== void 0 ? u : 2, this.fetch = (f = h.fetch) !== null && f !== void 0 ? f : Id(), this.encoder = vd, this._options = h, this.apiKey = c, this.apiVersion = m, this.clientAdapter = h.clientAdapter;
  }
  /**
   * Create a new client instance re-using the same options given to the current client with optional overriding.
   */
  withOptions(e) {
    return new this.constructor(Object.assign(Object.assign(Object.assign({}, this._options), { baseURL: this.baseURL, maxRetries: this.maxRetries, timeout: this.timeout, logger: this.logger, logLevel: this.logLevel, fetch: this.fetch, fetchOptions: this.fetchOptions, apiKey: this.apiKey, apiVersion: this.apiVersion }), e));
  }
  /**
   * Check whether the base URL is set to its default.
   */
  baseURLOverridden() {
    return this.baseURL !== "https://generativelanguage.googleapis.com";
  }
  defaultQuery() {
    return this._options.defaultQuery;
  }
  validateHeaders({ values: e, nulls: t }) {
    if (!(e.has("authorization") || e.has("x-goog-api-key")) && !(this.apiKey && e.get("x-goog-api-key")) && !t.has("x-goog-api-key"))
      throw new Error('Could not resolve authentication method. Expected the apiKey to be set. Or for the "x-goog-api-key" headers to be explicitly omitted');
  }
  async authHeaders(e) {
    const t = fe([e.headers]);
    if (!(t.values.has("authorization") || t.values.has("x-goog-api-key"))) {
      if (this.apiKey)
        return fe([{ "x-goog-api-key": this.apiKey }]);
      if (this.clientAdapter.isVertexAI())
        return fe([await this.clientAdapter.getAuthHeaders()]);
    }
  }
  /**
   * Basic re-implementation of `qs.stringify` for primitive types.
   */
  stringifyQuery(e) {
    return Rd(e);
  }
  getUserAgent() {
    return `${this.constructor.name}/JS ${Pd}`;
  }
  defaultIdempotencyKey() {
    return `stainless-node-retry-${pd()}`;
  }
  makeStatusError(e, t, o, r) {
    return V.generate(e, t, o, r);
  }
  buildURL(e, t, o) {
    const r = !this.baseURLOverridden() && o || this.baseURL, l = hd(e) ? new URL(e) : new URL(r + (r.endsWith("/") && e.startsWith("/") ? e.slice(1) : e)), a = this.defaultQuery(), u = Object.fromEntries(l.searchParams);
    return (!Xt(a) || !Xt(u)) && (t = Object.assign(Object.assign(Object.assign({}, u), a), t)), typeof t == "object" && t && !Array.isArray(t) && (l.search = this.stringifyQuery(t)), l.toString();
  }
  /**
     * Used as a callback for mutating the given `FinalRequestOptions` object.
  
     */
  async prepareOptions(e) {
    if (this.clientAdapter && this.clientAdapter.isVertexAI() && !e.path.startsWith(`/${this.apiVersion}/projects/`)) {
      const t = e.path.slice(this.apiVersion.length + 1);
      e.path = `/${this.apiVersion}/projects/${this.clientAdapter.getProject()}/locations/${this.clientAdapter.getLocation()}${t}`;
    }
  }
  /**
   * Used as a callback for mutating the given `RequestInit` object.
   *
   * This is useful for cases where you want to add certain headers based off of
   * the request properties, e.g. `method` or `url`.
   */
  async prepareRequest(e, { url: t, options: o }) {
  }
  get(e, t) {
    return this.methodRequest("get", e, t);
  }
  post(e, t) {
    return this.methodRequest("post", e, t);
  }
  patch(e, t) {
    return this.methodRequest("patch", e, t);
  }
  put(e, t) {
    return this.methodRequest("put", e, t);
  }
  delete(e, t) {
    return this.methodRequest("delete", e, t);
  }
  methodRequest(e, t, o) {
    return this.request(Promise.resolve(o).then((r) => Object.assign({ method: e, path: t }, r)));
  }
  request(e, t = null) {
    return new mn(this, this.makeRequest(e, t, void 0));
  }
  async makeRequest(e, t, o) {
    var r, l, a;
    const u = await e, f = (r = u.maxRetries) !== null && r !== void 0 ? r : this.maxRetries;
    t == null && (t = f), await this.prepareOptions(u);
    const { req: d, url: c, timeout: m } = await this.buildRequest(u, {
      retryCount: f - t
    });
    await this.prepareRequest(d, { url: c, options: u });
    const p = "log_" + (Math.random() * (1 << 24) | 0).toString(16).padStart(6, "0"), h = o === void 0 ? "" : `, retryOf: ${o}`, g = Date.now();
    if (F(this).debug(`[${p}] sending request`, j({
      retryOfRequestLogID: o,
      method: u.method,
      url: c,
      options: u,
      headers: d.headers
    })), !((l = u.signal) === null || l === void 0) && l.aborted)
      throw new en();
    const T = new AbortController(), y = await this.fetchWithTimeout(c, d, m, T).catch(je), _ = Date.now();
    if (y instanceof globalThis.Error) {
      const C = `retrying, ${t} attempts remaining`;
      if (!((a = u.signal) === null || a === void 0) && a.aborted)
        throw new en();
      const A = Ze(y) || /timed? ?out/i.test(String(y) + ("cause" in y ? String(y.cause) : ""));
      if (t)
        return F(this).info(`[${p}] connection ${A ? "timed out" : "failed"} - ${C}`), F(this).debug(`[${p}] connection ${A ? "timed out" : "failed"} (${C})`, j({
          retryOfRequestLogID: o,
          url: c,
          durationMs: _ - g,
          message: y.message
        })), this.retryRequest(u, t, o ?? p);
      throw F(this).info(`[${p}] connection ${A ? "timed out" : "failed"} - error; no more retries left`), F(this).debug(`[${p}] connection ${A ? "timed out" : "failed"} (error; no more retries left)`, j({
        retryOfRequestLogID: o,
        url: c,
        durationMs: _ - g,
        message: y.message
      })), A ? new No() : new De({ cause: y });
    }
    const S = `[${p}${h}] ${d.method} ${c} ${y.ok ? "succeeded" : "failed"} with status ${y.status} in ${_ - g}ms`;
    if (!y.ok) {
      const C = await this.shouldRetry(y);
      if (t && C) {
        const v = `retrying, ${t} attempts remaining`;
        return await Ad(y.body), F(this).info(`${S} - ${v}`), F(this).debug(`[${p}] response error (${v})`, j({
          retryOfRequestLogID: o,
          url: y.url,
          status: y.status,
          headers: y.headers,
          durationMs: _ - g
        })), this.retryRequest(u, t, o ?? p, y.headers);
      }
      const A = C ? "error; no more retries left" : "error; not retryable";
      F(this).info(`${S} - ${A}`);
      const R = await y.text().catch((v) => je(v).message), E = Ed(R), w = E ? void 0 : R;
      throw F(this).debug(`[${p}] response error (${A})`, j({
        retryOfRequestLogID: o,
        url: y.url,
        status: y.status,
        headers: y.headers,
        message: w,
        durationMs: Date.now() - g
      })), this.makeStatusError(y.status, E, w, y.headers);
    }
    return F(this).info(S), F(this).debug(`[${p}] response start`, j({
      retryOfRequestLogID: o,
      url: y.url,
      status: y.status,
      headers: y.headers,
      durationMs: _ - g
    })), { response: y, options: u, controller: T, requestLogID: p, retryOfRequestLogID: o, startTime: g };
  }
  async fetchWithTimeout(e, t, o, r) {
    const l = t || {}, { signal: a, method: u } = l, f = ve(l, ["signal", "method"]), d = this._makeAbort(r);
    a && a.addEventListener("abort", d, { once: !0 });
    const c = setTimeout(d, o), m = globalThis.ReadableStream && f.body instanceof globalThis.ReadableStream || typeof f.body == "object" && f.body !== null && Symbol.asyncIterator in f.body, p = Object.assign(Object.assign(Object.assign({ signal: r.signal }, m ? { duplex: "half" } : {}), { method: "GET" }), f);
    u && (p.method = u.toUpperCase());
    try {
      return await this.fetch.call(void 0, e, p);
    } finally {
      clearTimeout(c);
    }
  }
  async shouldRetry(e) {
    const t = e.headers.get("x-should-retry");
    return t === "true" ? !0 : t === "false" ? !1 : e.status === 408 || e.status === 409 || e.status === 429 || e.status >= 500;
  }
  async retryRequest(e, t, o, r) {
    var l;
    let a;
    const u = r?.get("retry-after-ms");
    if (u) {
      const d = parseFloat(u);
      Number.isNaN(d) || (a = d);
    }
    const f = r?.get("retry-after");
    if (f && !a) {
      const d = parseFloat(f);
      Number.isNaN(d) ? a = Date.parse(f) - Date.now() : a = d * 1e3;
    }
    if (a === void 0) {
      const d = (l = e.maxRetries) !== null && l !== void 0 ? l : this.maxRetries;
      a = this.calculateDefaultRetryTimeoutMillis(t, d);
    }
    return await Cd(a), this.makeRequest(e, t - 1, o);
  }
  calculateDefaultRetryTimeoutMillis(e, t) {
    const l = t - e, a = Math.min(0.5 * Math.pow(2, l), 8), u = 1 - Math.random() * 0.25;
    return a * u * 1e3;
  }
  async buildRequest(e, { retryCount: t = 0 } = {}) {
    var o, r, l;
    const a = Object.assign({}, e), { method: u, path: f, query: d, defaultBaseURL: c } = a, m = this.buildURL(f, d, c);
    "timeout" in a && _d("timeout", a.timeout), a.timeout = (o = a.timeout) !== null && o !== void 0 ? o : this.timeout;
    const { bodyHeaders: p, body: h } = this.buildBody({ options: a }), g = await this.buildHeaders({ options: e, method: u, bodyHeaders: p, retryCount: t });
    return { req: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ method: u, headers: g }, a.signal && { signal: a.signal }), globalThis.ReadableStream && h instanceof globalThis.ReadableStream && { duplex: "half" }), h && { body: h }), (r = this.fetchOptions) !== null && r !== void 0 ? r : {}), (l = a.fetchOptions) !== null && l !== void 0 ? l : {}), url: m, timeout: a.timeout };
  }
  async buildHeaders({ options: e, method: t, bodyHeaders: o, retryCount: r }) {
    let l = {};
    this.idempotencyHeader && t !== "get" && (e.idempotencyKey || (e.idempotencyKey = this.defaultIdempotencyKey()), l[this.idempotencyHeader] = e.idempotencyKey);
    const a = await this.authHeaders(e);
    let u = fe([
      l,
      { Accept: "application/json", "User-Agent": this.getUserAgent() },
      this._options.defaultHeaders,
      o,
      e.headers,
      a
    ]);
    return this.validateHeaders(u), u.values;
  }
  _makeAbort(e) {
    return () => e.abort();
  }
  buildBody({ options: { body: e, headers: t } }) {
    if (!e)
      return { bodyHeaders: void 0, body: void 0 };
    const o = fe([t]);
    return (
      // Pass raw type verbatim
      ArrayBuffer.isView(e) || e instanceof ArrayBuffer || e instanceof DataView || typeof e == "string" && // Preserve legacy string encoding behavior for now
      o.values.has("content-type") || // `Blob` is superset of `File`
      globalThis.Blob && e instanceof globalThis.Blob || // `FormData` -> `multipart/form-data`
      e instanceof FormData || // `URLSearchParams` -> `application/x-www-form-urlencoded`
      e instanceof URLSearchParams || // Send chunked stream (each chunk has own `length`)
      globalThis.ReadableStream && e instanceof globalThis.ReadableStream ? { bodyHeaders: void 0, body: e } : typeof e == "object" && (Symbol.asyncIterator in e || Symbol.iterator in e && "next" in e && typeof e.next == "function") ? { bodyHeaders: void 0, body: Sd(e) } : typeof e == "object" && o.values.get("content-type") === "application/x-www-form-urlencoded" ? {
        bodyHeaders: { "content-type": "application/x-www-form-urlencoded" },
        body: this.stringifyQuery(e)
      } : this.encoder({ body: e, headers: o })
    );
  }
}
Ue.DEFAULT_TIMEOUT = 6e4;
class G extends Ue {
  constructor() {
    super(...arguments), this.interactions = new Oo(this);
  }
}
Yo = G;
G.GeminiNextGenAPIClient = Yo;
G.GeminiNextGenAPIClientError = B;
G.APIError = V;
G.APIConnectionError = De;
G.APIConnectionTimeoutError = No;
G.APIUserAbortError = en;
G.NotFoundError = Lo;
G.ConflictError = ko;
G.RateLimitError = Fo;
G.BadRequestError = Do;
G.AuthenticationError = xo;
G.InternalServerError = Vo;
G.PermissionDeniedError = Uo;
G.UnprocessableEntityError = Go;
G.toFile = xd;
G.Interactions = Oo;
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function $d(n, e) {
  const t = {}, o = i(n, ["name"]);
  return o != null && s(t, ["_url", "name"], o), t;
}
function Kd(n, e) {
  const t = {}, o = i(n, ["name"]);
  return o != null && s(t, ["_url", "name"], o), t;
}
function Od(n, e) {
  const t = {}, o = i(n, [
    "sdkHttpResponse"
  ]);
  return o != null && s(t, ["sdkHttpResponse"], o), t;
}
function Wd(n, e) {
  const t = {}, o = i(n, [
    "sdkHttpResponse"
  ]);
  return o != null && s(t, ["sdkHttpResponse"], o), t;
}
function Yd(n, e, t) {
  const o = {};
  if (i(n, ["validationDataset"]) !== void 0)
    throw new Error("validationDataset parameter is not supported in Gemini API.");
  const r = i(n, [
    "tunedModelDisplayName"
  ]);
  if (e !== void 0 && r != null && s(e, ["displayName"], r), i(n, ["description"]) !== void 0)
    throw new Error("description parameter is not supported in Gemini API.");
  const l = i(n, ["epochCount"]);
  e !== void 0 && l != null && s(e, ["tuningTask", "hyperparameters", "epochCount"], l);
  const a = i(n, [
    "learningRateMultiplier"
  ]);
  if (a != null && s(o, ["tuningTask", "hyperparameters", "learningRateMultiplier"], a), i(n, ["exportLastCheckpointOnly"]) !== void 0)
    throw new Error("exportLastCheckpointOnly parameter is not supported in Gemini API.");
  if (i(n, ["preTunedModelCheckpointId"]) !== void 0)
    throw new Error("preTunedModelCheckpointId parameter is not supported in Gemini API.");
  if (i(n, ["adapterSize"]) !== void 0)
    throw new Error("adapterSize parameter is not supported in Gemini API.");
  if (i(n, ["tuningMode"]) !== void 0)
    throw new Error("tuningMode parameter is not supported in Gemini API.");
  if (i(n, ["customBaseModel"]) !== void 0)
    throw new Error("customBaseModel parameter is not supported in Gemini API.");
  const u = i(n, ["batchSize"]);
  e !== void 0 && u != null && s(e, ["tuningTask", "hyperparameters", "batchSize"], u);
  const f = i(n, ["learningRate"]);
  if (e !== void 0 && f != null && s(e, ["tuningTask", "hyperparameters", "learningRate"], f), i(n, ["labels"]) !== void 0)
    throw new Error("labels parameter is not supported in Gemini API.");
  if (i(n, ["beta"]) !== void 0)
    throw new Error("beta parameter is not supported in Gemini API.");
  if (i(n, ["baseTeacherModel"]) !== void 0)
    throw new Error("baseTeacherModel parameter is not supported in Gemini API.");
  if (i(n, ["tunedTeacherModelSource"]) !== void 0)
    throw new Error("tunedTeacherModelSource parameter is not supported in Gemini API.");
  if (i(n, ["sftLossWeightMultiplier"]) !== void 0)
    throw new Error("sftLossWeightMultiplier parameter is not supported in Gemini API.");
  if (i(n, ["outputUri"]) !== void 0)
    throw new Error("outputUri parameter is not supported in Gemini API.");
  if (i(n, ["encryptionSpec"]) !== void 0)
    throw new Error("encryptionSpec parameter is not supported in Gemini API.");
  return o;
}
function zd(n, e, t) {
  const o = {};
  let r = i(t, [
    "config",
    "method"
  ]);
  if (r === void 0 && (r = "SUPERVISED_FINE_TUNING"), r === "SUPERVISED_FINE_TUNING") {
    const E = i(n, [
      "validationDataset"
    ]);
    e !== void 0 && E != null && s(e, ["supervisedTuningSpec"], He(E));
  } else if (r === "PREFERENCE_TUNING") {
    const E = i(n, [
      "validationDataset"
    ]);
    e !== void 0 && E != null && s(e, ["preferenceOptimizationSpec"], He(E));
  } else if (r === "DISTILLATION") {
    const E = i(n, [
      "validationDataset"
    ]);
    e !== void 0 && E != null && s(e, ["distillationSpec"], He(E));
  }
  const l = i(n, [
    "tunedModelDisplayName"
  ]);
  e !== void 0 && l != null && s(e, ["tunedModelDisplayName"], l);
  const a = i(n, ["description"]);
  e !== void 0 && a != null && s(e, ["description"], a);
  let u = i(t, [
    "config",
    "method"
  ]);
  if (u === void 0 && (u = "SUPERVISED_FINE_TUNING"), u === "SUPERVISED_FINE_TUNING") {
    const E = i(n, ["epochCount"]);
    e !== void 0 && E != null && s(e, ["supervisedTuningSpec", "hyperParameters", "epochCount"], E);
  } else if (u === "PREFERENCE_TUNING") {
    const E = i(n, ["epochCount"]);
    e !== void 0 && E != null && s(e, ["preferenceOptimizationSpec", "hyperParameters", "epochCount"], E);
  } else if (u === "DISTILLATION") {
    const E = i(n, ["epochCount"]);
    e !== void 0 && E != null && s(e, ["distillationSpec", "hyperParameters", "epochCount"], E);
  }
  let f = i(t, [
    "config",
    "method"
  ]);
  if (f === void 0 && (f = "SUPERVISED_FINE_TUNING"), f === "SUPERVISED_FINE_TUNING") {
    const E = i(n, [
      "learningRateMultiplier"
    ]);
    e !== void 0 && E != null && s(e, ["supervisedTuningSpec", "hyperParameters", "learningRateMultiplier"], E);
  } else if (f === "PREFERENCE_TUNING") {
    const E = i(n, [
      "learningRateMultiplier"
    ]);
    e !== void 0 && E != null && s(e, [
      "preferenceOptimizationSpec",
      "hyperParameters",
      "learningRateMultiplier"
    ], E);
  } else if (f === "DISTILLATION") {
    const E = i(n, [
      "learningRateMultiplier"
    ]);
    e !== void 0 && E != null && s(e, ["distillationSpec", "hyperParameters", "learningRateMultiplier"], E);
  }
  let d = i(t, ["config", "method"]);
  if (d === void 0 && (d = "SUPERVISED_FINE_TUNING"), d === "SUPERVISED_FINE_TUNING") {
    const E = i(n, [
      "exportLastCheckpointOnly"
    ]);
    e !== void 0 && E != null && s(e, ["supervisedTuningSpec", "exportLastCheckpointOnly"], E);
  } else if (d === "PREFERENCE_TUNING") {
    const E = i(n, [
      "exportLastCheckpointOnly"
    ]);
    e !== void 0 && E != null && s(e, ["preferenceOptimizationSpec", "exportLastCheckpointOnly"], E);
  } else if (d === "DISTILLATION") {
    const E = i(n, [
      "exportLastCheckpointOnly"
    ]);
    e !== void 0 && E != null && s(e, ["distillationSpec", "exportLastCheckpointOnly"], E);
  }
  let c = i(t, [
    "config",
    "method"
  ]);
  if (c === void 0 && (c = "SUPERVISED_FINE_TUNING"), c === "SUPERVISED_FINE_TUNING") {
    const E = i(n, ["adapterSize"]);
    e !== void 0 && E != null && s(e, ["supervisedTuningSpec", "hyperParameters", "adapterSize"], E);
  } else if (c === "PREFERENCE_TUNING") {
    const E = i(n, ["adapterSize"]);
    e !== void 0 && E != null && s(e, ["preferenceOptimizationSpec", "hyperParameters", "adapterSize"], E);
  } else if (c === "DISTILLATION") {
    const E = i(n, ["adapterSize"]);
    e !== void 0 && E != null && s(e, ["distillationSpec", "hyperParameters", "adapterSize"], E);
  }
  let m = i(t, [
    "config",
    "method"
  ]);
  if (m === void 0 && (m = "SUPERVISED_FINE_TUNING"), m === "SUPERVISED_FINE_TUNING") {
    const E = i(n, ["tuningMode"]);
    e !== void 0 && E != null && s(e, ["supervisedTuningSpec", "tuningMode"], E);
  }
  const p = i(n, [
    "customBaseModel"
  ]);
  e !== void 0 && p != null && s(e, ["customBaseModel"], p);
  let h = i(t, [
    "config",
    "method"
  ]);
  if (h === void 0 && (h = "SUPERVISED_FINE_TUNING"), h === "SUPERVISED_FINE_TUNING") {
    const E = i(n, ["batchSize"]);
    e !== void 0 && E != null && s(e, ["supervisedTuningSpec", "hyperParameters", "batchSize"], E);
  }
  let g = i(t, [
    "config",
    "method"
  ]);
  if (g === void 0 && (g = "SUPERVISED_FINE_TUNING"), g === "SUPERVISED_FINE_TUNING") {
    const E = i(n, [
      "learningRate"
    ]);
    e !== void 0 && E != null && s(e, ["supervisedTuningSpec", "hyperParameters", "learningRate"], E);
  }
  const T = i(n, ["labels"]);
  e !== void 0 && T != null && s(e, ["labels"], T);
  const y = i(n, ["beta"]);
  e !== void 0 && y != null && s(e, ["preferenceOptimizationSpec", "hyperParameters", "beta"], y);
  const _ = i(n, [
    "baseTeacherModel"
  ]);
  e !== void 0 && _ != null && s(e, ["distillationSpec", "baseTeacherModel"], _);
  const S = i(n, [
    "tunedTeacherModelSource"
  ]);
  e !== void 0 && S != null && s(e, ["distillationSpec", "tunedTeacherModelSource"], S);
  const C = i(n, [
    "sftLossWeightMultiplier"
  ]);
  e !== void 0 && C != null && s(e, ["distillationSpec", "hyperParameters", "sftLossWeightMultiplier"], C);
  const A = i(n, ["outputUri"]);
  e !== void 0 && A != null && s(e, ["outputUri"], A);
  const R = i(n, [
    "encryptionSpec"
  ]);
  return e !== void 0 && R != null && s(e, ["encryptionSpec"], R), o;
}
function Qd(n, e) {
  const t = {}, o = i(n, ["baseModel"]);
  o != null && s(t, ["baseModel"], o);
  const r = i(n, [
    "preTunedModel"
  ]);
  r != null && s(t, ["preTunedModel"], r);
  const l = i(n, [
    "trainingDataset"
  ]);
  l != null && af(l);
  const a = i(n, ["config"]);
  return a != null && Yd(a, t), t;
}
function Xd(n, e) {
  const t = {}, o = i(n, ["baseModel"]);
  o != null && s(t, ["baseModel"], o);
  const r = i(n, [
    "preTunedModel"
  ]);
  r != null && s(t, ["preTunedModel"], r);
  const l = i(n, [
    "trainingDataset"
  ]);
  l != null && uf(l, t, e);
  const a = i(n, ["config"]);
  return a != null && zd(a, t, e), t;
}
function Zd(n, e) {
  const t = {}, o = i(n, ["name"]);
  return o != null && s(t, ["_url", "name"], o), t;
}
function jd(n, e) {
  const t = {}, o = i(n, ["name"]);
  return o != null && s(t, ["_url", "name"], o), t;
}
function ef(n, e, t) {
  const o = {}, r = i(n, ["pageSize"]);
  e !== void 0 && r != null && s(e, ["_query", "pageSize"], r);
  const l = i(n, ["pageToken"]);
  e !== void 0 && l != null && s(e, ["_query", "pageToken"], l);
  const a = i(n, ["filter"]);
  return e !== void 0 && a != null && s(e, ["_query", "filter"], a), o;
}
function nf(n, e, t) {
  const o = {}, r = i(n, ["pageSize"]);
  e !== void 0 && r != null && s(e, ["_query", "pageSize"], r);
  const l = i(n, ["pageToken"]);
  e !== void 0 && l != null && s(e, ["_query", "pageToken"], l);
  const a = i(n, ["filter"]);
  return e !== void 0 && a != null && s(e, ["_query", "filter"], a), o;
}
function tf(n, e) {
  const t = {}, o = i(n, ["config"]);
  return o != null && ef(o, t), t;
}
function of(n, e) {
  const t = {}, o = i(n, ["config"]);
  return o != null && nf(o, t), t;
}
function rf(n, e) {
  const t = {}, o = i(n, [
    "sdkHttpResponse"
  ]);
  o != null && s(t, ["sdkHttpResponse"], o);
  const r = i(n, [
    "nextPageToken"
  ]);
  r != null && s(t, ["nextPageToken"], r);
  const l = i(n, ["tunedModels"]);
  if (l != null) {
    let a = l;
    Array.isArray(a) && (a = a.map((u) => zo(u))), s(t, ["tuningJobs"], a);
  }
  return t;
}
function sf(n, e) {
  const t = {}, o = i(n, [
    "sdkHttpResponse"
  ]);
  o != null && s(t, ["sdkHttpResponse"], o);
  const r = i(n, [
    "nextPageToken"
  ]);
  r != null && s(t, ["nextPageToken"], r);
  const l = i(n, ["tuningJobs"]);
  if (l != null) {
    let a = l;
    Array.isArray(a) && (a = a.map((u) => on(u))), s(t, ["tuningJobs"], a);
  }
  return t;
}
function lf(n, e) {
  const t = {}, o = i(n, ["name"]);
  o != null && s(t, ["model"], o);
  const r = i(n, ["name"]);
  return r != null && s(t, ["endpoint"], r), t;
}
function af(n, e) {
  const t = {};
  if (i(n, ["gcsUri"]) !== void 0)
    throw new Error("gcsUri parameter is not supported in Gemini API.");
  if (i(n, ["vertexDatasetResource"]) !== void 0)
    throw new Error("vertexDatasetResource parameter is not supported in Gemini API.");
  const o = i(n, ["examples"]);
  if (o != null) {
    let r = o;
    Array.isArray(r) && (r = r.map((l) => l)), s(t, ["examples", "examples"], r);
  }
  return t;
}
function uf(n, e, t) {
  const o = {};
  let r = i(t, [
    "config",
    "method"
  ]);
  if (r === void 0 && (r = "SUPERVISED_FINE_TUNING"), r === "SUPERVISED_FINE_TUNING") {
    const a = i(n, ["gcsUri"]);
    e !== void 0 && a != null && s(e, ["supervisedTuningSpec", "trainingDatasetUri"], a);
  } else if (r === "PREFERENCE_TUNING") {
    const a = i(n, ["gcsUri"]);
    e !== void 0 && a != null && s(e, ["preferenceOptimizationSpec", "trainingDatasetUri"], a);
  } else if (r === "DISTILLATION") {
    const a = i(n, ["gcsUri"]);
    e !== void 0 && a != null && s(e, ["distillationSpec", "promptDatasetUri"], a);
  }
  let l = i(t, [
    "config",
    "method"
  ]);
  if (l === void 0 && (l = "SUPERVISED_FINE_TUNING"), l === "SUPERVISED_FINE_TUNING") {
    const a = i(n, [
      "vertexDatasetResource"
    ]);
    e !== void 0 && a != null && s(e, ["supervisedTuningSpec", "trainingDatasetUri"], a);
  } else if (l === "PREFERENCE_TUNING") {
    const a = i(n, [
      "vertexDatasetResource"
    ]);
    e !== void 0 && a != null && s(e, ["preferenceOptimizationSpec", "trainingDatasetUri"], a);
  } else if (l === "DISTILLATION") {
    const a = i(n, [
      "vertexDatasetResource"
    ]);
    e !== void 0 && a != null && s(e, ["distillationSpec", "promptDatasetUri"], a);
  }
  if (i(n, ["examples"]) !== void 0)
    throw new Error("examples parameter is not supported in Vertex AI.");
  return o;
}
function zo(n, e) {
  const t = {}, o = i(n, [
    "sdkHttpResponse"
  ]);
  o != null && s(t, ["sdkHttpResponse"], o);
  const r = i(n, ["name"]);
  r != null && s(t, ["name"], r);
  const l = i(n, ["state"]);
  l != null && s(t, ["state"], fo(l));
  const a = i(n, ["createTime"]);
  a != null && s(t, ["createTime"], a);
  const u = i(n, [
    "tuningTask",
    "startTime"
  ]);
  u != null && s(t, ["startTime"], u);
  const f = i(n, [
    "tuningTask",
    "completeTime"
  ]);
  f != null && s(t, ["endTime"], f);
  const d = i(n, ["updateTime"]);
  d != null && s(t, ["updateTime"], d);
  const c = i(n, ["description"]);
  c != null && s(t, ["description"], c);
  const m = i(n, ["baseModel"]);
  m != null && s(t, ["baseModel"], m);
  const p = i(n, ["_self"]);
  return p != null && s(t, ["tunedModel"], lf(p)), t;
}
function on(n, e) {
  const t = {}, o = i(n, [
    "sdkHttpResponse"
  ]);
  o != null && s(t, ["sdkHttpResponse"], o);
  const r = i(n, ["name"]);
  r != null && s(t, ["name"], r);
  const l = i(n, ["state"]);
  l != null && s(t, ["state"], fo(l));
  const a = i(n, ["createTime"]);
  a != null && s(t, ["createTime"], a);
  const u = i(n, ["startTime"]);
  u != null && s(t, ["startTime"], u);
  const f = i(n, ["endTime"]);
  f != null && s(t, ["endTime"], f);
  const d = i(n, ["updateTime"]);
  d != null && s(t, ["updateTime"], d);
  const c = i(n, ["error"]);
  c != null && s(t, ["error"], c);
  const m = i(n, ["description"]);
  m != null && s(t, ["description"], m);
  const p = i(n, ["baseModel"]);
  p != null && s(t, ["baseModel"], p);
  const h = i(n, ["tunedModel"]);
  h != null && s(t, ["tunedModel"], h);
  const g = i(n, [
    "preTunedModel"
  ]);
  g != null && s(t, ["preTunedModel"], g);
  const T = i(n, [
    "supervisedTuningSpec"
  ]);
  T != null && s(t, ["supervisedTuningSpec"], T);
  const y = i(n, [
    "preferenceOptimizationSpec"
  ]);
  y != null && s(t, ["preferenceOptimizationSpec"], y);
  const _ = i(n, [
    "distillationSpec"
  ]);
  _ != null && s(t, ["distillationSpec"], _);
  const S = i(n, [
    "tuningDataStats"
  ]);
  S != null && s(t, ["tuningDataStats"], S);
  const C = i(n, [
    "encryptionSpec"
  ]);
  C != null && s(t, ["encryptionSpec"], C);
  const A = i(n, [
    "partnerModelTuningSpec"
  ]);
  A != null && s(t, ["partnerModelTuningSpec"], A);
  const R = i(n, [
    "customBaseModel"
  ]);
  R != null && s(t, ["customBaseModel"], R);
  const E = i(n, [
    "evaluateDatasetRuns"
  ]);
  if (E != null) {
    let Z = E;
    Array.isArray(Z) && (Z = Z.map((me) => me)), s(t, ["evaluateDatasetRuns"], Z);
  }
  const w = i(n, ["experiment"]);
  w != null && s(t, ["experiment"], w);
  const D = i(n, [
    "fullFineTuningSpec"
  ]);
  D != null && s(t, ["fullFineTuningSpec"], D);
  const v = i(n, ["labels"]);
  v != null && s(t, ["labels"], v);
  const M = i(n, ["outputUri"]);
  M != null && s(t, ["outputUri"], M);
  const x = i(n, ["pipelineJob"]);
  x != null && s(t, ["pipelineJob"], x);
  const q = i(n, [
    "serviceAccount"
  ]);
  q != null && s(t, ["serviceAccount"], q);
  const L = i(n, [
    "tunedModelDisplayName"
  ]);
  L != null && s(t, ["tunedModelDisplayName"], L);
  const U = i(n, [
    "tuningJobState"
  ]);
  U != null && s(t, ["tuningJobState"], U);
  const K = i(n, [
    "veoTuningSpec"
  ]);
  return K != null && s(t, ["veoTuningSpec"], K), t;
}
function df(n, e) {
  const t = {}, o = i(n, [
    "sdkHttpResponse"
  ]);
  o != null && s(t, ["sdkHttpResponse"], o);
  const r = i(n, ["name"]);
  r != null && s(t, ["name"], r);
  const l = i(n, ["metadata"]);
  l != null && s(t, ["metadata"], l);
  const a = i(n, ["done"]);
  a != null && s(t, ["done"], a);
  const u = i(n, ["error"]);
  return u != null && s(t, ["error"], u), t;
}
function He(n, e) {
  const t = {}, o = i(n, ["gcsUri"]);
  o != null && s(t, ["validationDatasetUri"], o);
  const r = i(n, [
    "vertexDatasetResource"
  ]);
  return r != null && s(t, ["validationDatasetUri"], r), t;
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class ff extends Y {
  constructor(e) {
    super(), this.apiClient = e, this.list = async (t = {}) => new ne(W.PAGED_ITEM_TUNING_JOBS, (o) => this.listInternal(o), await this.listInternal(t), t), this.get = async (t) => await this.getInternal(t), this.tune = async (t) => {
      var o;
      if (this.apiClient.isVertexAI())
        if (t.baseModel.startsWith("projects/")) {
          const r = {
            tunedModelName: t.baseModel
          };
          !((o = t.config) === null || o === void 0) && o.preTunedModelCheckpointId && (r.checkpointId = t.config.preTunedModelCheckpointId);
          const l = Object.assign(Object.assign({}, t), { preTunedModel: r });
          return l.baseModel = void 0, await this.tuneInternal(l);
        } else {
          const r = Object.assign({}, t);
          return await this.tuneInternal(r);
        }
      else {
        const r = Object.assign({}, t), l = await this.tuneMldevInternal(r);
        let a = "";
        return l.metadata !== void 0 && l.metadata.tunedModel !== void 0 ? a = l.metadata.tunedModel : l.name !== void 0 && l.name.includes("/operations/") && (a = l.name.split("/operations/")[0]), {
          name: a,
          state: $e.JOB_STATE_QUEUED
        };
      }
    };
  }
  async getInternal(e) {
    var t, o, r, l;
    let a, u = "", f = {};
    if (this.apiClient.isVertexAI()) {
      const d = jd(e);
      return u = I("{name}", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "GET",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((c) => c.json().then((m) => {
        const p = m;
        return p.sdkHttpResponse = {
          headers: c.headers
        }, p;
      })), a.then((c) => on(c));
    } else {
      const d = Zd(e);
      return u = I("{name}", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "GET",
        httpOptions: (r = e.config) === null || r === void 0 ? void 0 : r.httpOptions,
        abortSignal: (l = e.config) === null || l === void 0 ? void 0 : l.abortSignal
      }).then((c) => c.json().then((m) => {
        const p = m;
        return p.sdkHttpResponse = {
          headers: c.headers
        }, p;
      })), a.then((c) => zo(c));
    }
  }
  async listInternal(e) {
    var t, o, r, l;
    let a, u = "", f = {};
    if (this.apiClient.isVertexAI()) {
      const d = of(e);
      return u = I("tuningJobs", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "GET",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((c) => c.json().then((m) => {
        const p = m;
        return p.sdkHttpResponse = {
          headers: c.headers
        }, p;
      })), a.then((c) => {
        const m = sf(c), p = new Pt();
        return Object.assign(p, m), p;
      });
    } else {
      const d = tf(e);
      return u = I("tunedModels", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "GET",
        httpOptions: (r = e.config) === null || r === void 0 ? void 0 : r.httpOptions,
        abortSignal: (l = e.config) === null || l === void 0 ? void 0 : l.abortSignal
      }).then((c) => c.json().then((m) => {
        const p = m;
        return p.sdkHttpResponse = {
          headers: c.headers
        }, p;
      })), a.then((c) => {
        const m = rf(c), p = new Pt();
        return Object.assign(p, m), p;
      });
    }
  }
  /**
   * Cancels a tuning job.
   *
   * @param params - The parameters for the cancel request.
   * @return The empty response returned by the API.
   *
   * @example
   * ```ts
   * await ai.tunings.cancel({name: '...'}); // The server-generated resource name.
   * ```
   */
  async cancel(e) {
    var t, o, r, l;
    let a, u = "", f = {};
    if (this.apiClient.isVertexAI()) {
      const d = Kd(e);
      return u = I("{name}:cancel", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "POST",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((c) => c.json().then((m) => {
        const p = m;
        return p.sdkHttpResponse = {
          headers: c.headers
        }, p;
      })), a.then((c) => {
        const m = Wd(c), p = new wt();
        return Object.assign(p, m), p;
      });
    } else {
      const d = $d(e);
      return u = I("{name}:cancel", d._url), f = d._query, delete d._url, delete d._query, a = this.apiClient.request({
        path: u,
        queryParams: f,
        body: JSON.stringify(d),
        httpMethod: "POST",
        httpOptions: (r = e.config) === null || r === void 0 ? void 0 : r.httpOptions,
        abortSignal: (l = e.config) === null || l === void 0 ? void 0 : l.abortSignal
      }).then((c) => c.json().then((m) => {
        const p = m;
        return p.sdkHttpResponse = {
          headers: c.headers
        }, p;
      })), a.then((c) => {
        const m = Od(c), p = new wt();
        return Object.assign(p, m), p;
      });
    }
  }
  async tuneInternal(e) {
    var t, o;
    let r, l = "", a = {};
    if (this.apiClient.isVertexAI()) {
      const u = Xd(e, e);
      return l = I("tuningJobs", u._url), a = u._query, delete u._url, delete u._query, r = this.apiClient.request({
        path: l,
        queryParams: a,
        body: JSON.stringify(u),
        httpMethod: "POST",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((f) => f.json().then((d) => {
        const c = d;
        return c.sdkHttpResponse = {
          headers: f.headers
        }, c;
      })), r.then((f) => on(f));
    } else
      throw new Error("This method is only supported by the Vertex AI.");
  }
  async tuneMldevInternal(e) {
    var t, o;
    let r, l = "", a = {};
    if (this.apiClient.isVertexAI())
      throw new Error("This method is only supported by the Gemini Developer API.");
    {
      const u = Qd(e);
      return l = I("tunedModels", u._url), a = u._query, delete u._url, delete u._query, r = this.apiClient.request({
        path: l,
        queryParams: a,
        body: JSON.stringify(u),
        httpMethod: "POST",
        httpOptions: (t = e.config) === null || t === void 0 ? void 0 : t.httpOptions,
        abortSignal: (o = e.config) === null || o === void 0 ? void 0 : o.abortSignal
      }).then((f) => f.json().then((d) => {
        const c = d;
        return c.sdkHttpResponse = {
          headers: f.headers
        }, c;
      })), r.then((f) => df(f));
    }
  }
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class cf {
  async download(e, t) {
    throw new Error("Download to file is not supported in the browser, please use a browser compliant download like an <a> tag.");
  }
}
const pf = 1024 * 1024 * 8, mf = 3, hf = 1e3, gf = 2, Pe = "x-goog-upload-status";
async function yf(n, e, t) {
  var o;
  const r = await Qo(n, e, t), l = await r?.json();
  if (((o = r?.headers) === null || o === void 0 ? void 0 : o[Pe]) !== "final")
    throw new Error("Failed to upload file: Upload status is not finalized.");
  return l.file;
}
async function Tf(n, e, t) {
  var o;
  const r = await Qo(n, e, t), l = await r?.json();
  if (((o = r?.headers) === null || o === void 0 ? void 0 : o[Pe]) !== "final")
    throw new Error("Failed to upload file: Upload status is not finalized.");
  const a = io(l), u = new ln();
  return Object.assign(u, a), u;
}
async function Qo(n, e, t) {
  var o, r;
  let l = 0, a = 0, u = new Oe(new Response()), f = "upload";
  for (l = n.size; a < l; ) {
    const d = Math.min(pf, l - a), c = n.slice(a, a + d);
    a + d >= l && (f += ", finalize");
    let m = 0, p = hf;
    for (; m < mf && (u = await t.request({
      path: "",
      body: c,
      httpMethod: "POST",
      httpOptions: {
        apiVersion: "",
        baseUrl: e,
        headers: {
          "X-Goog-Upload-Command": f,
          "X-Goog-Upload-Offset": String(a),
          "Content-Length": String(d)
        }
      }
    }), !(!((o = u?.headers) === null || o === void 0) && o[Pe])); )
      m++, await Ef(p), p = p * gf;
    if (a += d, ((r = u?.headers) === null || r === void 0 ? void 0 : r[Pe]) !== "active")
      break;
    if (l <= a)
      throw new Error("All content has been uploaded, but the upload status is not finalized.");
  }
  return u;
}
async function _f(n) {
  return { size: n.size, type: n.type };
}
function Ef(n) {
  return new Promise((e) => setTimeout(e, n));
}
class Cf {
  async upload(e, t, o) {
    if (typeof e == "string")
      throw new Error("File path is not supported in browser uploader.");
    return await yf(e, t, o);
  }
  async uploadToFileSearchStore(e, t, o) {
    if (typeof e == "string")
      throw new Error("File path is not supported in browser uploader.");
    return await Tf(e, t, o);
  }
  async stat(e) {
    if (typeof e == "string")
      throw new Error("File path is not supported in browser uploader.");
    return await _f(e);
  }
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class If {
  create(e, t, o) {
    return new Sf(e, t, o);
  }
}
class Sf {
  constructor(e, t, o) {
    this.url = e, this.headers = t, this.callbacks = o;
  }
  connect() {
    this.ws = new WebSocket(this.url), this.ws.onopen = this.callbacks.onopen, this.ws.onerror = this.callbacks.onerror, this.ws.onclose = this.callbacks.onclose, this.ws.onmessage = this.callbacks.onmessage;
  }
  send(e) {
    if (this.ws === void 0)
      throw new Error("WebSocket is not connected");
    this.ws.send(e);
  }
  close() {
    if (this.ws === void 0)
      throw new Error("WebSocket is not connected");
    this.ws.close();
  }
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const to = "x-goog-api-key";
class Af {
  constructor(e) {
    this.apiKey = e;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async addAuthHeaders(e, t) {
    if (e.get(to) === null) {
      if (this.apiKey.startsWith("auth_tokens/"))
        throw new Error("Ephemeral tokens are only supported by the live API.");
      if (!this.apiKey)
        throw new Error("API key is missing. Please provide a valid API key.");
      e.append(to, this.apiKey);
    }
  }
}
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const vf = "gl-node/";
class Rf {
  get interactions() {
    var e;
    if (this._interactions !== void 0)
      return this._interactions;
    console.warn("GoogleGenAI.interactions: Interactions usage is experimental and may change in future versions.");
    const t = this.httpOptions;
    t?.extraBody && console.warn("GoogleGenAI.interactions: Client level httpOptions.extraBody is not supported by the interactions client and will be ignored.");
    const o = new G({
      baseURL: this.apiClient.getBaseUrl(),
      apiKey: this.apiKey,
      apiVersion: this.apiClient.getApiVersion(),
      clientAdapter: this.apiClient,
      defaultHeaders: this.apiClient.getDefaultHeaders(),
      timeout: t?.timeout,
      maxRetries: (e = t?.retryOptions) === null || e === void 0 ? void 0 : e.attempts
    });
    return this._interactions = o.interactions, this._interactions;
  }
  constructor(e) {
    var t;
    if (e.apiKey == null)
      throw new Error("An API Key must be set when running in a browser");
    if (e.project || e.location)
      throw new Error("Vertex AI project based authentication is not supported on browser runtimes. Please do not provide a project or location.");
    this.vertexai = (t = e.vertexai) !== null && t !== void 0 ? t : !1, this.apiKey = e.apiKey;
    const o = fi(
      e.httpOptions,
      e.vertexai,
      /*vertexBaseUrlFromEnv*/
      void 0,
      /*geminiBaseUrlFromEnv*/
      void 0
    );
    o && (e.httpOptions ? e.httpOptions.baseUrl = o : e.httpOptions = { baseUrl: o }), this.apiVersion = e.apiVersion, this.httpOptions = e.httpOptions;
    const r = new Af(this.apiKey);
    this.apiClient = new Cu({
      auth: r,
      apiVersion: this.apiVersion,
      apiKey: this.apiKey,
      vertexai: this.vertexai,
      httpOptions: this.httpOptions,
      userAgentExtra: vf + "web",
      uploader: new Cf(),
      downloader: new cf()
    }), this.models = new Hu(this.apiClient), this.live = new Lu(this.apiClient, r, new If()), this.batches = new Jr(this.apiClient), this.chats = new vs(this.models, this.apiClient), this.caches = new Is(this.apiClient), this.files = new Fs(this.apiClient), this.operations = new Bu(this.apiClient), this.authTokens = new id(this.apiClient), this.tunings = new ff(this.apiClient), this.fileSearchStores = new cd(this.apiClient);
  }
}
const Be = "gemini-3-pro-preview", hn = "繁體中文（zh-TW）", Pf = 1e4, wf = {
  ".3gp": "video/3gpp",
  ".aac": "audio/aac",
  ".aiff": "audio/aiff",
  ".avi": "video/avi",
  ".flac": "audio/flac",
  ".flv": "video/x-flv",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".mov": "video/mov",
  ".mp3": "audio/mp3",
  ".mp4": "video/mp4",
  ".mpeg": "video/mpeg",
  ".mpg": "video/mpg",
  ".ogg": "audio/ogg",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".wav": "audio/wav",
  ".webm": "video/webm",
  ".webp": "image/webp",
  ".wmv": "video/wmv"
}, Mf = ({
  language: n = hn,
  textInput: e,
  hasAttachment: t
}) => [
  `請以${n}輸出一份高品質 Markdown 摘要。`,
  t ? "你也要一併理解附加的遠端內容。" : "",
  e ? `請根據以下文字內容整理：
<content>
${e}
</content>` : ""
].filter(Boolean).join(`

`), be = (n, e = {}) => Object.assign(new Error(n), { name: "GeminiApiError", ...e }), ee = (n) => typeof n == "object" && n !== null, Nf = (n) => {
  if (!ee(n)) return;
  const e = n.status;
  if (typeof e == "number") return e;
  const t = n.code;
  if (typeof t == "number") return t;
}, Df = (n, e) => {
  if (!ee(n)) return e;
  const t = n.message;
  if (typeof t == "string" && t.trim()) return t;
  const o = n.error;
  return ee(o) && typeof o.message == "string" ? o.message : e;
}, xf = (n) => !ee(n) || !Array.isArray(n.outputs) ? [] : n.outputs.filter(
  (e) => ee(e) && e.type === "text" && typeof e.text == "string"
).map((e) => e.text.trim()).filter(Boolean), Uf = (n) => {
  if (!ee(n)) return null;
  const e = n.usageMetadata ?? n.usage_metadata;
  return ee(e) ? e : null;
}, Lf = (n) => {
  try {
    const e = new URL(n);
    return e.protocol === "http:" || e.protocol === "https:";
  } catch {
    return !1;
  }
}, kf = (n) => {
  try {
    const { hostname: e } = new URL(n), t = e.toLowerCase();
    return [
      "youtube.com",
      "www.youtube.com",
      "m.youtube.com",
      "youtu.be",
      "www.youtu.be",
      "youtube-nocookie.com",
      "www.youtube-nocookie.com"
    ].includes(t);
  } catch {
    return !1;
  }
}, Gf = ({
  language: n = hn,
  url: e,
  textInput: t
}) => [
  `請以${n}輸出一份高品質 Markdown 摘要。`,
  `請總結這個網址的內容：${e}`,
  t ? `另外請一併納入以下補充說明：
<content>
${t}
</content>` : ""
].filter(Boolean).join(`

`), Ff = (n) => {
  try {
    const t = new URL(n).pathname.toLowerCase(), o = t.lastIndexOf(".");
    if (o < 0) return null;
    const r = t.slice(o);
    return wf[r] ?? null;
  } catch {
    return null;
  }
}, Vf = async (n, e) => {
  const t = new AbortController(), o = setTimeout(() => t.abort(), Pf);
  try {
    const l = (await e(n, {
      method: "HEAD",
      redirect: "follow",
      signal: t.signal
    })).headers.get("content-type");
    return l ? l.split(";", 1)[0].trim().toLowerCase() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(o);
  }
}, qf = (n, e) => e === "image" ? n.startsWith("image/") : e === "audio" ? n.startsWith("audio/") : e === "video" ? n.startsWith("video/") : n === "application/pdf", Hf = (n) => n.startsWith("image/") ? "image" : n.startsWith("audio/") ? "audio" : n.startsWith("video/") ? "video" : n === "application/pdf" ? "document" : null, Bf = ({
  requestedType: n,
  mimeType: e
}) => n === "text" || e === "text/html" || n === "document" && e === "text/html", bf = async (n, e, t) => {
  if (!Lf(n))
    throw new TypeError(`Unsupported url protocol: ${n}`);
  const o = Ff(n) ?? await Vf(n, e);
  if (t === "video" && kf(n) && (!o || o === "text/html"))
    return {
      kind: "attachment",
      inputPart: {
        type: "video",
        uri: n,
        mime_type: "video/mp4"
      },
      resolvedInput: {
        type: "video",
        source: "remote-url",
        url: n,
        mimeType: "video/mp4"
      }
    };
  if (Bf({ requestedType: t, mimeType: o }))
    return {
      kind: "url_context",
      resolvedInput: {
        type: "text",
        source: "url_context",
        url: n
      }
    };
  if (!o) {
    if (t === "auto") return null;
    throw new TypeError(
      `Unable to determine mime type for url: ${n}. Please provide a URL with a supported file extension or reachable content-type header.`
    );
  }
  if (t !== "auto" && !qf(o, t))
    throw new TypeError(
      `Requested type "${t}" does not match detected mime type "${o}" for url: ${n}`
    );
  const r = t === "auto" ? Hf(o) : t;
  return r ? o === "text/html" ? {
    kind: "url_context",
    resolvedInput: {
      type: "text",
      source: "url_context",
      url: n
    }
  } : {
    kind: "attachment",
    inputPart: r === "image" ? {
      type: "image",
      uri: n,
      mime_type: o
    } : r === "audio" ? {
      type: "audio",
      uri: n,
      mime_type: o
    } : r === "video" ? {
      type: "video",
      uri: n,
      mime_type: o
    } : {
      type: "document",
      uri: n,
      mime_type: o
    },
    resolvedInput: {
      type: r,
      source: "remote-url",
      url: n,
      mimeType: o
    }
  } : null;
}, Jf = async (n, e = {}) => {
  const t = Object.keys(n).filter(
    (C) => !["language", "text", "url", "type"].includes(C)
  );
  if (t.length)
    throw new TypeError(`Unsupported summary args: ${t.join(", ")}`);
  const o = e.apiKey ?? process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!o)
    throw be(
      "Missing apiKey. Pass apiKey in options or set GEMINI_API_KEY."
    );
  const r = String(n.language ?? "").trim() || hn, l = String(n.text ?? "").trim(), a = String(n.url ?? "").trim(), u = String(n.type ?? "auto").trim(), f = e.fetchImpl ?? fetch;
  if (!["auto", "text", "image", "audio", "video", "document"].includes(u))
    throw new TypeError(`Unsupported summary type: ${u}`);
  if (!a && ["image", "audio", "video", "document"].includes(u))
    throw new TypeError(`Summary type "${u}" requires a url input.`);
  const d = a ? await bf(a, f, u) : null, c = [l, a && !d ? `參考網址：${a}` : ""].filter(Boolean).join(`

`);
  if (!c && !d)
    throw new TypeError(
      "Either text or a supported url input must be provided."
    );
  const m = d?.kind === "url_context", p = m ? [
    {
      type: "text",
      text: Gf({
        language: r,
        url: a,
        textInput: l || void 0
      })
    }
  ] : [
    {
      type: "text",
      text: Mf({
        language: r,
        textInput: c,
        hasAttachment: d?.kind === "attachment"
      })
    },
    ...d?.kind === "attachment" ? [d.inputPart] : []
  ], h = m ? [{ type: "url_context" }] : void 0, g = new Rf({
    apiKey: o,
    httpOptions: {
      timeout: 1800 * 1e3,
      ...e.baseUrl ? { baseUrl: e.baseUrl } : {}
    }
  });
  let T;
  const y = {
    model: Be,
    input: p,
    store: !1,
    stream: !1,
    ...h ? { tools: h } : {}
  };
  console.log(" Calling Gemini with params:", y);
  try {
    T = await g.interactions.create(y);
  } catch (C) {
    throw be(
      Df(C, "Failed to call Gemini via GoogleGenAI."),
      {
        cause: C,
        statusCode: Nf(C)
      }
    );
  }
  const _ = xf(T), S = _.join(`

`).trim();
  if (!S) throw be("Gemini interaction returned no text output.");
  return {
    id: typeof T.id == "string" ? T.id : null,
    requestedModel: Be,
    model: typeof T.model == "string" ? T.model : Be,
    store: !1,
    summary: S,
    outputs: _,
    resolvedInputs: [
      ...l ? [{ type: "text", source: "text" }] : [],
      ...d ? [d.resolvedInput] : a ? [{ type: "text", source: "url", url: a }] : []
    ],
    usageMetadata: Uf(T)
  };
}, $f = {
  ...ni,
  async handler(n, e) {
    return Jf(n, {
      apiKey: e?.secrets?.apiKey
    });
  }
}, Kf = $f;
export {
  Kf as default,
  $f as summaryTool,
  Kf as tool
};
