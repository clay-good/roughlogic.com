import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CONFIG_PATH,
  MAX_BODY_BYTES,
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
  for (const unsafe of ["expected\u001b[2Jclear", "expected\rrewritten", "expected\u202Etxt"]) {
    const payload = validPayload();
    payload.note = unsafe;
    assert.equal(validateReportPayload(payload).status, 400);
  }

  const unsafeInput = validPayload();
  unsafeInput.inputs[0].value = "120\u001b[31m";
  assert.equal(validateReportPayload(unsafeInput).status, 400);
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
