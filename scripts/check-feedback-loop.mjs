#!/usr/bin/env node
// spec-v1348: repository-level three-door calculator invariant.
//
// Every tile already enters the website through renderToolView and the local
// agent through check-both-doors. This gate asserts that the shared web path
// still mounts one report control and that its bounded API-only Worker, D1
// schema, offline shipping, and contributor standard remain wired.
//
// It also compares the three places a size limit is stated -- the browser's
// cap, the Worker's re-check, and the D1 CHECK constraint -- because until
// 2026-09-04 each named its own number and nothing compared them. Three layers
// is the right design; three independent numbers is a drift that lands on a
// reader's bug report as a 500.

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { TOOLS } from "../tools-data.js";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");
const read = (path) => readFile(resolve(ROOT, path), "utf8");
const errors = [];

function requireMatch(text, pattern, message) {
  if (!pattern.test(text)) errors.push(message);
}

const [app, client, worker, migration, hardeningMigration, wrangler, build, sw, agents, checklist, quickstart] = await Promise.all([
  read("app.js"),
  read("report-feedback.js"),
  read("report-worker.mjs"),
  read("migrations/0001_calculator_reports.sql"),
  read("migrations/0002_report_attempts.sql"),
  read("wrangler.jsonc"),
  read("scripts/build.mjs"),
  read("sw.js"),
  read("AGENTS.md"),
  read("docs/contributor-checklist.md"),
  read("docs/maintainer-quickstart.md"),
]);

const triggerMounts = app.match(/className\s*=\s*"report-trigger"/g) || [];
if (triggerMounts.length !== 1) {
  errors.push(`app.js must mount exactly one shared report-trigger in renderToolView; found ${triggerMounts.length}`);
}
requireMatch(app, /function renderToolView[\s\S]*headerRow\.appendChild\(report\)/,
  "app.js shared renderToolView no longer appends the report control to the top header row");
requireMatch(app, /import\("\.\/report-feedback\.js"\)/,
  "app.js must lazy-load the report client only after the trigger is used");
requireMatch(client, /maxlength|MAX_NOTE_LENGTH|NOTE_LIMIT/,
  "report client no longer carries a bounded note contract");

// The same three limits are stated in three places, and nothing compared them.
// The browser caps what a reader can type, the Worker re-checks it because the
// browser is not trusted, and the D1 schema CHECKs it because the Worker is code
// that can change. Three layers is the right design; three layers each naming
// its own number is a drift waiting to happen, and the failure lands on a
// reader's bug report. Raise the Worker's cap above the schema's and a valid
// report is accepted, then rejected by SQLite -- a 500, and the report is gone.
// Raise the client's above the Worker's and the reader is told 400 after typing.
//
// The note limit also has to match EXACTLY at all three layers, not merely
// nest: a browser that allows fewer characters than the Worker accepts is a
// silently shorter contract than the one the schema documents.
const LIMIT_SURFACES = [
  {
    what: "the 160-character note",
    column: "note",
    client: [client, "report-feedback.js", /\bNOTE_LIMIT\s*=\s*(\d+)/],
    worker: [worker, "report-worker.mjs", /\bMAX_NOTE_LENGTH\s*=\s*(\d+)/],
    exact: true,
  },
  {
    what: "the page URL",
    column: "page_url",
    worker: [worker, "report-worker.mjs", /\bMAX_URL_LENGTH\s*=\s*(\d+)/],
  },
  {
    what: "the rendered output text",
    column: "output_text",
    worker: [worker, "report-worker.mjs", /\bMAX_OUTPUT_TEXT_LENGTH\s*=\s*(\d+)/],
  },
];

function declaredLimit(source, file, pattern, label) {
  const m = source.match(pattern);
  if (!m) {
    errors.push(`${file} no longer declares ${label}, so this gate cannot compare it to the D1 CHECK.`);
    return null;
  }
  return Number(m[1]);
}

for (const surface of LIMIT_SURFACES) {
  const check = migration.match(
    new RegExp("length\\(" + surface.column + "\\)\\s*<=\\s*(\\d+)"),
  );
  if (!check) {
    errors.push(
      `migrations/0001_calculator_reports.sql no longer CHECKs the length of ${surface.column}, ` +
      `so the database has stopped being the backstop for ${surface.what}.`);
    continue;
  }
  const schemaLimit = Number(check[1]);
  const workerLimit = declaredLimit(...surface.worker, surface.what + " limit");
  if (workerLimit !== null && workerLimit > schemaLimit) {
    errors.push(
      `report-worker.mjs accepts ${surface.what} up to ${workerLimit} characters but the D1 CHECK on ` +
      `${surface.column} stops at ${schemaLimit}. The Worker would accept the report and the INSERT ` +
      `would fail, which is a 500 and a lost report.`);
  }
  if (!surface.client) continue;
  const clientLimit = declaredLimit(...surface.client, surface.what + " limit");
  if (clientLimit !== null && workerLimit !== null && surface.exact && clientLimit !== workerLimit) {
    errors.push(
      `report-feedback.js caps ${surface.what} at ${clientLimit} but report-worker.mjs accepts ` +
      `${workerLimit}. These must be the same number: the browser's cap is what the reader sees.`);
  }
}
requireMatch(client, /calculator_id[\s\S]*page_url[\s\S]*inputs[\s\S]*outputs[\s\S]*turnstile_token/,
  "report client payload lost required reproduction context");
requireMatch(client, /isPrivateControl[\s\S]*sanitizedReportUrl/,
  "report client must share centralized private-field detection and sanitize stored URLs");
requireMatch(client, /Output omitted because this calculator contains a private field/,
  "report client must omit derived outputs when a calculator contains a private field");

requireMatch(worker, /import \{ TOOLS \} from "\.\/tools-data\.js"/,
  "report Worker must validate calculator IDs against the live catalog");
requireMatch(worker, /MAX_BODY_BYTES\s*=\s*24 \* 1024/,
  "report Worker lost its 24 KB request ceiling");
requireMatch(worker, /request\.body\.getReader\(\)[\s\S]*reader\.cancel\(\)/,
  "report Worker must stream and cancel oversized bodies instead of buffering the platform limit");
requireMatch(worker, /UNSAFE_STORED_TEXT[\s\S]*safeStoredText/,
  "report Worker must reject terminal-control and bidirectional text before storage");
requireMatch(worker, /DAILY_LIMIT_CEILING\s*=\s*200/,
  "report Worker global accepted-report ceiling changed without updating the standard");
requireMatch(worker, /REPORTER_LIMIT_CEILING\s*=\s*5/,
  "report Worker per-reporter ceiling changed without updating the standard");
requireMatch(worker, /TURNSTILE_VERIFY_URL[\s\S]*result\.action === TURNSTILE_ACTION[\s\S]*allowedHostnames\.has/,
  "report Worker must validate Turnstile success, action, and hostname server-side");
requireMatch(worker, /dailyReporterHmac[\s\S]*name: "HMAC"/,
  "report Worker must hash daily rate-limit identity with HMAC");
requireMatch(worker, /dailyReporterHmac\(day, remoteIp, env\.REPORT_HASH_SECRET\)/,
  "report Worker must key its daily HMAC with REPORT_HASH_SECRET");
requireMatch(worker, /attemptLimitReached[\s\S]*DAILY_ATTEMPT_LIMIT[\s\S]*REPORTER_ATTEMPT_LIMIT/,
  "report Worker must reserve a separate bounded verified-attempt budget");
requireMatch(worker, /REPORT_RETENTION_DAYS\s*=\s*30[\s\S]*cleanupReports/,
  "report Worker must automatically purge reports after 30 days");
requireMatch(worker, /await db\.batch\(\[[\s\S]*incrementGlobalAttempt[\s\S]*insert[\s\S]*incrementReporter[\s\S]*\]\)/,
  "retention, attempt reservations, report insert, and accepted counters must remain one D1 batch");

requireMatch(migration, /CREATE TABLE calculator_reports/,
  "D1 migration is missing calculator_reports");
requireMatch(migration, /dedupe_key TEXT NOT NULL UNIQUE/,
  "D1 migration is missing exact duplicate suppression");
requireMatch(migration, /CREATE TABLE report_limits/,
  "D1 migration is missing bounded rate counters");
requireMatch(migration, /status IN \('open', 'resolved', 'wont_fix'\)/,
  "D1 migration is missing the maintainer review lifecycle");
requireMatch(hardeningMigration, /CREATE TABLE report_attempt_limits/,
  "D1 hardening migration is missing verified-attempt counters");
requireMatch(hardeningMigration, /calculator_reports_created_at/,
  "D1 hardening migration is missing the retention index");

requireMatch(wrangler, /"main"\s*:\s*"report-worker\.mjs"/,
  "wrangler must use the report Worker entry");
requireMatch(wrangler, /"workers_dev"\s*:\s*false/,
  "wrangler must disable the workers.dev URL that would bypass the zone WAF");
requireMatch(wrangler, /"preview_urls"\s*:\s*false/,
  "wrangler must disable public version preview URLs that would bypass the zone WAF");
requireMatch(wrangler, /"secrets"[\s\S]*"required"[\s\S]*"TURNSTILE_SECRET_KEY"[\s\S]*"REPORT_HASH_SECRET"/,
  "wrangler must fail deployment when either required protection secret is missing");
requireMatch(wrangler, /"pattern"\s*:\s*"roughlogic\.com\/api\/reports\*"/,
  "wrangler must expose only the report API route on the production zone");
requireMatch(wrangler, /"observability"\s*:\s*\{\s*"enabled"\s*:\s*false/,
  "report Worker must not persist invocation logs containing request metadata");
requireMatch(wrangler, /"crons"\s*:\s*\["17 8 \* \* \*"\]/,
  "wrangler must schedule daily retention cleanup");
if (/"assets"\s*:|"ASSETS"/.test(wrangler)) {
  errors.push("report Worker must not bind or serve the Pages static asset tree");
}
requireMatch(build, /"report-feedback\.js"/,
  "build must ship the lazy report client");
requireMatch(sw, /"\.\/report-feedback\.js"/,
  "service worker must precache the lazy report client for a complete shell");
requireMatch(sw, /url\.pathname\.startsWith\("\/api\/"\)\) return/,
  "service worker must bypass report API responses so the kill switch cannot be cached");

for (const [name, text] of [["AGENTS.md", agents], ["contributor checklist", checklist], ["maintainer quickstart", quickstart]]) {
  requireMatch(text, /three mandatory doors|three doors|mandatory third door/i,
    `${name} must preserve website, MCP, and reporting as the three-door calculator standard`);
}

if (errors.length) {
  console.error("check-feedback-loop FAILED:");
  for (const error of errors) console.error("  - " + error);
  process.exit(1);
}

console.log(`check-feedback-loop OK: ${TOOLS.length} calculators inherit one shared report control; defensive API-only Worker, D1, offline shipping, and three-door docs are wired; the note, page-URL and output-text limits agree across the browser, the Worker and the D1 CHECK constraints.`);
