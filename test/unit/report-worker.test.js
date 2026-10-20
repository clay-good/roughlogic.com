import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CONFIG_PATH,
  COUNTER_RETENTION_DAYS,
  DAILY_ATTEMPT_LIMIT,
  MAX_BODY_BYTES,
  REPORT_RETENTION_DAYS,
  REPORTER_ATTEMPT_LIMIT,
  cleanupReports,
  handleRequest,
  validateReportPayload,
  verifyTurnstile,
} from "../../report-worker.mjs";

function validPayload() {
  return {
    calculator_id: "ohms-law",
    calculator_name: "untrusted client name",
    page_url: "https://roughlogic.com/#ohms-law?v=1&voltage=120",
    note: "I expected a different power value.",
    inputs: [{ label: "Voltage", value: "120" }],
    outputs: {
      values: [{ label: "Power", value: "1,200 W" }],
      text: "Power: 1,200 W",
      truncated: false,
    },
    turnstile_token: "test-token",
  };
}

test("report validation accepts bounded reproduction context and derives the catalog name", () => {
  const result = validateReportPayload(validPayload());
  assert.equal(result.ok, true);
  assert.notEqual(result.value.calculatorName, "untrusted client name");
  assert.equal(result.value.calculatorId, "ohms-law");
  assert.equal(result.value.note, "I expected a different power value.");
});

test("report validation accepts a no-text two-tap report", () => {
  const payload = validPayload();
  payload.note = "";
  const result = validateReportPayload(payload);
  assert.equal(result.ok, true);
  assert.equal(result.value.note, "");
});

test("report validation rejects unknown calculators and mismatched URLs", () => {
  const unknown = validPayload();
  unknown.calculator_id = "not-a-real-calculator";
  assert.equal(validateReportPayload(unknown).status, 400);

  const crossOrigin = validPayload();
  crossOrigin.page_url = "https://example.com/#ohms-law";
  assert.equal(validateReportPayload(crossOrigin).status, 403);

  const wrongTile = validPayload();
  wrongTile.page_url = "https://roughlogic.com/#voltage-drop";
  assert.equal(validateReportPayload(wrongTile).status, 403);

  const credentials = validPayload();
  credentials.page_url = "https://name:secret@roughlogic.com/#ohms-law";
  assert.equal(validateReportPayload(credentials).status, 403);

  const trackingQuery = validPayload();
  trackingQuery.page_url = "https://roughlogic.com/?customer=Jane#ohms-law";
  assert.equal(validateReportPayload(trackingQuery).status, 403);

  const unrelatedPath = validPayload();
  unrelatedPath.page_url = "https://roughlogic.com/private#ohms-law";
  assert.equal(validateReportPayload(unrelatedPath).status, 403);
});

test("report validation rejects oversized and expanded payload fields", () => {
  const longNote = validPayload();
  longNote.note = "x".repeat(161);
  assert.equal(validateReportPayload(longNote).status, 400);

  const longToken = validPayload();
  longToken.turnstile_token = "x".repeat(2049);
  assert.equal(validateReportPayload(longToken).status, 400);

  const tooManyInputs = validPayload();
  tooManyInputs.inputs = Array.from({ length: 101 }, (_, i) => ({ label: "Input " + i, value: "1" }));
  assert.equal(validateReportPayload(tooManyInputs).status, 400);

  const extraKey = validPayload();
  extraKey.email = "should-not-be-stored@example.com";
  assert.equal(validateReportPayload(extraKey).status, 400);
  assert.equal(MAX_BODY_BYTES, 24 * 1024);
});

test("report validation rejects terminal controls and bidirectional overrides", () => {
  for (const unsafe of [
    "expected\u001b[2Jclear", "expected\rrewritten", "expected\u061Ctxt",
    "expected\u200Etxt", "expected\u200Ftxt", "expected\u202Etxt",
  ]) {
    const payload = validPayload();
    payload.note = unsafe;
    assert.equal(validateReportPayload(payload).status, 400);
  }

  const unsafeInput = validPayload();
  unsafeInput.inputs[0].value = "120\u001b[31m";
  assert.equal(validateReportPayload(unsafeInput).status, 400);
});

function fakeDb({ globalCount = 0, reporterCount = 0 } = {}) {
  const batches = [];
  return {
    batches,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            sql, args,
            first: async () => ({ global_count: globalCount, reporter_count: reporterCount }),
          };
        },
      };
    },
    async batch(statements) { batches.push(statements); },
  };
}

test("scheduled cleanup has a fixed 30-day report and 14-day counter boundary", async () => {
  const db = fakeDb();
  await cleanupReports(db, new Date("2026-08-23T12:00:00.000Z"));
  assert.equal(REPORT_RETENTION_DAYS, 30);
  assert.equal(COUNTER_RETENTION_DAYS, 14);
  assert.equal(db.batches.length, 1);
  assert.equal(db.batches[0].length, 3);
  assert.deepEqual(db.batches[0].map((s) => s.args[0]), [
    "2026-07-24T12:00:00.000Z", "2026-08-09", "2026-08-09",
  ]);
  assert.match(db.batches[0][0].sql, /DELETE FROM calculator_reports/);
  assert.match(db.batches[0][2].sql, /DELETE FROM report_attempt_limits/);
});

test("exhausted verified-attempt quota short-circuits before Siteverify and writes", async () => {
  const db = fakeDb({ globalCount: DAILY_ATTEMPT_LIMIT, reporterCount: REPORTER_ATTEMPT_LIMIT });
  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { fetchCalls += 1; throw new Error("must not run"); };
  try {
    const response = await handleRequest(new Request("https://roughlogic.com/api/reports", {
      method: "POST",
      headers: {
        Origin: "https://roughlogic.com",
        "Content-Type": "application/json",
        "CF-Connecting-IP": "192.0.2.1",
      },
      body: JSON.stringify(validPayload()),
    }), {
      REPORTS_DB: db,
      TURNSTILE_SITE_KEY: "public-key",
      TURNSTILE_SECRET_KEY: "private-key",
      REPORT_HASH_SECRET: "x".repeat(32),
    });
    assert.equal(response.status, 202);
    assert.equal(fetchCalls, 0);
    assert.equal(db.batches.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a verified unique report reserves attempts, cleans retention, and writes atomically", async () => {
  const db = fakeDb();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    success: true, action: "calculator-report", hostname: "roughlogic.com",
  }), { status: 200, headers: { "Content-Type": "application/json" } });
  try {
    const response = await handleRequest(new Request("https://roughlogic.com/api/reports", {
      method: "POST",
      headers: {
        Origin: "https://roughlogic.com",
        "Content-Type": "application/json",
        "CF-Connecting-IP": "192.0.2.1",
      },
      body: JSON.stringify(validPayload()),
    }), {
      REPORTS_DB: db,
      TURNSTILE_SITE_KEY: "public-key",
      TURNSTILE_SECRET_KEY: "private-key",
      REPORT_HASH_SECRET: "x".repeat(32),
    });
    assert.equal(response.status, 202);
    assert.equal(db.batches.length, 1);
    assert.equal(db.batches[0].length, 8);
    assert.match(db.batches[0][3].sql, /INSERT INTO report_attempt_limits/);
    assert.match(db.batches[0][5].sql, /INSERT OR IGNORE INTO calculator_reports/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Turnstile verification requires success, action, and an allowed hostname", async () => {
  const base = {
    token: "token",
    remoteIp: "192.0.2.1",
    env: { TURNSTILE_SECRET_KEY: "secret" },
    origins: ["https://roughlogic.com"],
    idempotencyKey: "00000000-0000-4000-8000-000000000000",
  };
  const fetcher = async () => new Response(JSON.stringify({
    success: true,
    action: "calculator-report",
    hostname: "roughlogic.com",
  }), { status: 200, headers: { "Content-Type": "application/json" } });
  assert.equal(await verifyTurnstile({ ...base, fetcher }), true);

  const wrongAction = async () => new Response(JSON.stringify({
    success: true, action: "login", hostname: "roughlogic.com",
  }), { status: 200 });
  assert.equal(await verifyTurnstile({ ...base, fetcher: wrongAction }), false);

  const wrongHost = async () => new Response(JSON.stringify({
    success: true, action: "calculator-report", hostname: "example.com",
  }), { status: 200 });
  assert.equal(await verifyTurnstile({ ...base, fetcher: wrongHost }), false);
});

test("report config fails closed until every binding and secret exists", async () => {
  const request = new Request("https://roughlogic.com" + CONFIG_PATH);
  const missing = await handleRequest(request, {});
  assert.equal(missing.status, 503);

  const configured = await handleRequest(request, {
    REPORTS_DB: {},
    TURNSTILE_SITE_KEY: "public-key",
    TURNSTILE_SECRET_KEY: "private-key",
    REPORT_HASH_SECRET: "x".repeat(32),
  });
  assert.equal(configured.status, 200);
  assert.deepEqual(await configured.json(), { sitekey: "public-key" });
  assert.equal(configured.headers.get("Cross-Origin-Resource-Policy"), "same-origin");
  assert.match(configured.headers.get("Content-Security-Policy"), /default-src 'none'/);
  assert.equal(configured.headers.get("Strict-Transport-Security"), "max-age=31536000; includeSubDomains; preload");
});

test("encoded report bodies are rejected before parsing", async () => {
  const request = new Request("https://roughlogic.com/api/reports", {
    method: "POST",
    headers: {
      Origin: "https://roughlogic.com",
      "Content-Type": "application/json",
      "Content-Encoding": "gzip",
    },
    body: "not-really-gzip",
  });
  const response = await handleRequest(request, {
    REPORTS_DB: {},
    TURNSTILE_SITE_KEY: "public-key",
    TURNSTILE_SECRET_KEY: "private-key",
    REPORT_HASH_SECRET: "x".repeat(32),
  });
  assert.equal(response.status, 415);
});

test("chunked oversized bodies are canceled without full buffering", async () => {
  let canceled = false;
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(MAX_BODY_BYTES));
      controller.enqueue(new Uint8Array([1]));
    },
    cancel() { canceled = true; },
  });
  const request = new Request("https://roughlogic.com/api/reports", {
    method: "POST",
    headers: {
      Origin: "https://roughlogic.com",
      "Content-Type": "application/json",
      "CF-Connecting-IP": "192.0.2.1",
    },
    body,
    duplex: "half",
  });
  const response = await handleRequest(request, {
    REPORTS_DB: {},
    TURNSTILE_SITE_KEY: "public-key",
    TURNSTILE_SECRET_KEY: "private-key",
    REPORT_HASH_SECRET: "x".repeat(32),
  });
  assert.equal(response.status, 413);
  assert.equal(canceled, true);
});

test("non-report requests cannot reach Pages assets through the API Worker", async () => {
  const response = await handleRequest(new Request("https://roughlogic.com/styles.css"), {});
  assert.equal(response.status, 404);
});

// spec-v1971: request a calculator. Same path, its own shape, refused otherwise.
function validRequest() {
  return {
    kind: "request",
    calculator_id: "-",
    calculator_name: "request",
    page_url: "https://roughlogic.com/",
    note: "How many sheets of drywall for a stairwell.",
    inputs: [{ label: "query", value: "stairwell drywall sheets" }],
    outputs: { values: [{ label: "result", value: "drywall" }], text: "", truncated: false },
    turnstile_token: "test-token",
  };
}

test("request validation accepts the home-search shape and stores no calculator", () => {
  const result = validateReportPayload(validRequest());
  assert.equal(result.ok, true);
  assert.equal(result.value.kind, "request");
  assert.equal(result.value.calculatorId, "-");
  assert.deepEqual(result.value.inputs, [{ label: "query", value: "stairwell drywall sheets" }]);
  const none = validRequest(); none.outputs.values = [];
  assert.equal(validateReportPayload(none).ok, true, "a no-match search has no result ids");
});

test("request validation refuses a tile id, extra outputs, a sentence-less request, a tile page, and an unknown kind", () => {
  const cases = [
    (p) => { p.calculator_id = "ohms-law"; },
    (p) => { p.outputs.values = ["drywall", "ohms-law", "box-fill", "voltage-drop"].map((value) => ({ label: "result", value })); },
    (p) => { p.outputs.values = [{ label: "result", value: "not-a-tile" }]; },
    (p) => { p.outputs.text = "Power: 1,200 W"; },
    (p) => { p.note = "   "; },
    (p) => { p.inputs = [{ label: "query", value: "x".repeat(201) }]; },
    (p) => { p.inputs.push({ label: "Voltage", value: "120" }); },
    (p) => { p.page_url = "https://roughlogic.com/#ohms-law"; },
    (p) => { p.page_url = "https://example.com/"; },
    (p) => { p.kind = "problem"; },
    (p) => { p.kind = "wish"; },
    (p) => { p.extra = 1; },
  ];
  for (const mutate of cases) {
    const p = validRequest(); mutate(p);
    assert.equal(validateReportPayload(p).ok, false, String(mutate));
  }
});

test("a problem report keeps its shape: no kind is sent, and its validation is unchanged", () => {
  const p = validPayload();
  assert.equal(Object.hasOwn(p, "kind"), false);
  assert.equal(validateReportPayload(p).ok, true);
});

test("a stored request writes kind = 'request'; a stored problem leaves the column to its default", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    success: true, action: "calculator-report", hostname: "roughlogic.com",
  }), { status: 200, headers: { "Content-Type": "application/json" } });
  try {
    for (const [payload, wantsKind] of [[validRequest(), true], [validPayload(), false]]) {
      const db = fakeDb();
      const response = await handleRequest(new Request("https://roughlogic.com/api/reports", {
        method: "POST",
        headers: { Origin: "https://roughlogic.com", "Content-Type": "application/json", "CF-Connecting-IP": "192.0.2.1" },
        body: JSON.stringify(payload),
      }), { REPORTS_DB: db, TURNSTILE_SITE_KEY: "public-key", TURNSTILE_SECRET_KEY: "private-key", REPORT_HASH_SECRET: "x".repeat(32) });
      assert.equal(response.status, 202);
      const insert = db.batches[0][5].sql;
      assert.equal(/, kind\b/.test(insert), wantsKind, insert);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("the browser's request payload passes the Worker's request validation", async () => {
  globalThis.window = globalThis.window || { location: { origin: "https://roughlogic.com", href: "https://roughlogic.com/" } };
  const { buildRequestPayload, QUERY_LIMIT } = await import("../../report-feedback.js");
  const { MAX_QUERY_LENGTH } = await import("../../report-worker.mjs");
  assert.equal(QUERY_LIMIT, MAX_QUERY_LENGTH);
  const p = buildRequestPayload({ query: "stairwell drywall sheets", topIds: ["drywall", "ohms-law", "box-fill", "voltage-drop"], note: "How many sheets.", token: "t", origin: "https://roughlogic.com" });
  assert.equal(p.outputs.values.length, 3, "at most three result ids ride along");
  assert.equal(validateReportPayload(p).ok, true);
});

test("request review fixes: /index.html stores as /, duplicate ids are refused, pasted bidi marks are dropped by the client", async () => {
  const p = validRequest(); p.page_url = "https://roughlogic.com/index.html";
  assert.equal(validateReportPayload(p).value.pageUrl, "https://roughlogic.com/");
  const d = validRequest(); d.outputs.values = [{ label: "result", value: "drywall" }, { label: "result", value: "drywall" }];
  assert.equal(validateReportPayload(d).ok, false);
  const { buildRequestPayload } = await import("../../report-feedback.js");
  const b = buildRequestPayload({ query: "drywall‮ sheets", topIds: [], note: "x", token: "t", origin: "https://roughlogic.com" });
  assert.equal(b.inputs[0].value, "drywall sheets");
  assert.equal(validateReportPayload(b).ok, true);
});
