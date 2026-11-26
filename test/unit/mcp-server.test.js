// spec-v1192: the MCP server declares an outputSchema per tool and returns
// structuredContent alongside the text fallback. Driven as a real stdio
// subprocess (importing the server would start its readline loop).

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

const SERVER = fileURLToPath(new URL("../../mcp/server.mjs", import.meta.url));

// Send a batch of JSON-RPC requests to a fresh server and collect the replies
// keyed by id. Resolves once EVERY request in the batch has been answered.
// JSON-RPC does not promise replies come back in the order they were sent, and
// the server answers each request on its own promise chain, so waiting on the
// last id alone would sometimes stop reading while an earlier reply was still
// in flight and leave a hole in the map. Retries once: each call spawns a node
// that re-imports the catalog, so a transient spawn or timing hiccup under a
// saturated parallel suite must not fail the test.
async function rpc(requests) {
  for (let attempt = 0; ; attempt++) {
    try { return await rpcOnce(requests); }
    catch (e) { if (attempt >= 1) throw e; }
  }
}
function rpcOnce(requests) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [SERVER], { stdio: ["pipe", "pipe", "ignore"] });
    const pending = new Set(requests.filter((r) => r.id != null).map((r) => r.id));
    const replies = new Map();
    let buf = "";
    const timer = setTimeout(() => { child.kill(); reject(new Error("timeout")); }, 30000);
    child.stdout.on("data", (chunk) => {
      buf += chunk;
      let nl;
      while ((nl = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        const msg = JSON.parse(line);
        if (msg.id != null) { replies.set(msg.id, msg); pending.delete(msg.id); }
        if (pending.size === 0) { clearTimeout(timer); child.kill(); resolve(replies); }
      }
    });
    child.on("error", reject);
    for (const r of requests) child.stdin.write(JSON.stringify(r) + "\n");
  });
}

test("tools/list declares an object outputSchema for every tool", async () => {
  const replies = await rpc([
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {} } },
    { jsonrpc: "2.0", id: 2, method: "tools/list" },
  ]);
  const tools = replies.get(2).result.tools;
  assert.equal(tools.length, 5);
  for (const t of tools) {
    assert.equal(t.outputSchema && t.outputSchema.type, "object", `${t.name} declares an object outputSchema`);
  }
});

test("initialize advertises tools, resources, and prompts capabilities (spec-v1186)", async () => {
  const replies = await rpc([
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {} } },
  ]);
  const caps = replies.get(1).result.capabilities;
  assert.ok(caps.tools && caps.resources && caps.prompts);
});

test("resources round-trip: list, template, and read a calculator card (spec-v1186)", async () => {
  const replies = await rpc([
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {} } },
    { jsonrpc: "2.0", id: 2, method: "resources/list" },
    { jsonrpc: "2.0", id: 3, method: "resources/templates/list" },
    { jsonrpc: "2.0", id: 4, method: "resources/read", params: { uri: "roughlogic://calculator/pull-box-sizing" } },
  ]);
  assert.ok(replies.get(2).result.resources.some((r) => r.uri === "roughlogic://catalog"));
  assert.equal(replies.get(3).result.resourceTemplates[0].uriTemplate, "roughlogic://calculator/{id}");
  const card = JSON.parse(replies.get(4).result.contents[0].text);
  assert.equal(card.id, "pull-box-sizing");
  assert.ok(Array.isArray(card.inputs));
});

// A required prompt argument that is absent used to render a complete-looking
// prompt with an empty hole in it -- prompts/get on find-calculator with no
// arguments returned `Search the roughlogic catalog for "" with
// search_calculators`, and an agent handed that goes and searches for nothing.
// The failure is silent from the client's side, and a MISSPELLED argument is
// the same thing from the server's: passing "task" to a prompt that wants
// "need" looked exactly like passing nothing.
test("prompts/get refuses a missing required argument instead of rendering an empty slot", async () => {
  const replies = await rpc([
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {} } },
    { jsonrpc: "2.0", id: 2, method: "prompts/get", params: { name: "find-calculator", arguments: {} } },
    { jsonrpc: "2.0", id: 3, method: "prompts/get", params: { name: "size-and-check" } },
    { jsonrpc: "2.0", id: 4, method: "prompts/get", params: { name: "find-calculator", arguments: { task: "voltage drop" } } },
    { jsonrpc: "2.0", id: 5, method: "prompts/get", params: { name: "find-calculator", arguments: { need: "   " } } },
    // The optional one stays optional: run-with-inputs without `inputs` is the
    // documented worked-example branch, not an error.
    { jsonrpc: "2.0", id: 6, method: "prompts/get", params: { name: "run-with-inputs", arguments: { id: "ohms-law" } } },
  ]);
  for (const id of [2, 3, 4, 5]) {
    const r = replies.get(id);
    assert.ok(r.error, `prompts/get #${id} should be an error, got ${JSON.stringify(r.result)}`);
    assert.match(r.error.message, /requires/);
  }
  // The error has to name the argument, because "got \"task\"" is the whole
  // difference between a client bug and a server bug.
  assert.match(replies.get(4).error.message, /"need".*"task"/s);
  assert.ok(replies.get(6).result, "an omitted OPTIONAL argument is not an error");
  assert.match(replies.get(6).result.messages[0].content.text, /worked example/);
});

test("prompts round-trip: list and get with argument substitution (spec-v1186)", async () => {
  const replies = await rpc([
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {} } },
    { jsonrpc: "2.0", id: 2, method: "prompts/list" },
    { jsonrpc: "2.0", id: 3, method: "prompts/get", params: { name: "run-with-inputs", arguments: { id: "voltage-drop" } } },
  ]);
  assert.ok(replies.get(2).result.prompts.some((p) => p.name === "run-with-inputs"));
  const msg = replies.get(3).result.messages[0];
  assert.equal(msg.role, "user");
  assert.match(msg.content.text, /voltage-drop/);
});

test("every tool is annotated read-only, idempotent, non-destructive, closed-world (spec-v1193)", async () => {
  const replies = await rpc([
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {} } },
    { jsonrpc: "2.0", id: 2, method: "tools/list" },
  ]);
  for (const t of replies.get(2).result.tools) {
    const a = t.annotations;
    assert.ok(a, `${t.name} has annotations`);
    assert.equal(a.readOnlyHint, true);
    assert.equal(a.idempotentHint, true);
    assert.equal(a.destructiveHint, false);
    assert.equal(a.openWorldHint, false);
  }
});

test("tools/call returns structuredContent plus a matching text fallback", async () => {
  const replies = await rpc([
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {} } },
    { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "run_calculator", arguments: { id: "pull-box-sizing", inputs: { pull_type: "straight", largest_raceway_in: 3, other_raceways_in: 0 } } } },
  ]);
  const res = replies.get(3).result;
  assert.ok(res.structuredContent, "structuredContent present");
  assert.equal(res.structuredContent.id, "pull-box-sizing");
  assert.equal(res.structuredContent.result.governing, 24);
  assert.equal(res.content[0].type, "text");
  assert.equal(res.content[0].text, JSON.stringify(res.structuredContent, null, 2));
});

test("oversized or malformed local RPC input is dropped and the server recovers", async () => {
  const reply = await new Promise((resolve, reject) => {
    const child = spawn("node", [SERVER], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => { child.kill(); reject(new Error("timeout")); }, 30000);
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      const lines = stdout.split("\n").filter(Boolean);
      const found = lines.map((line) => JSON.parse(line)).find((msg) => msg.id === 99);
      if (found) {
        clearTimeout(timer);
        child.kill();
        resolve({ found, stderr });
      }
    });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.stdin.write("x".repeat(256 * 1024 + 1) + "\n");
    child.stdin.write("null\n");
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 99, method: "ping" }) + "\n");
  });
  assert.deepEqual(reply.found.result, {});
  assert.match(reply.stderr, /dropping oversized message/);
});

test("MCP rejects enormous finite calculator workloads without allocating their output", async () => {
  const replies = await rpc([{
    jsonrpc: "2.0", id: 44, method: "tools/call",
    params: { name: "run_calculator", arguments: {
      id: "lab-dilution", inputs: { c1: 1000, mode: "serial", steps: 1e9, dilution_factor: 10 },
    } },
  }]);
  const result = replies.get(44).result.structuredContent;
  assert.match(JSON.stringify(result), /1,000|whole number|error/i);
});

test("MCP serializes a bounded request queue and honors stdout backpressure", async () => {
  const source = await readFile(SERVER, "utf8");
  assert.match(source, /MAX_PENDING_RPC\s*=\s*100/);
  assert.match(source, /rpcTail\s*=\s*rpcTail/);
  assert.match(source, /once\(process\.stdout, "drain"\)/);
  assert.doesNotMatch(source, /\bhandle\(item\);/);
});

// The docs an agent reads BEFORE it connects: AGENTS.md is the first file a
// coding agent opens in this repo, and mcp/README.md is what a human wires the
// client from. Both stated "four tools" while five shipped -- `run_calculators`
// landed with the batch work and neither count moved. Nothing checked them, so
// the agent surface was described wrong in the two places describing it.
test("every doc that counts the MCP tools counts them right, and names them all", async () => {
  const { readFile } = await import("node:fs/promises");
  const src = await readFile(new URL("../../mcp/server.mjs", import.meta.url), "utf8");
  const names = [...src.matchAll(/^\s{4}name: "([a-z_]+)",$/gm)].map((m) => m[1]);
  assert.ok(names.length >= 5, `could not read the tool list from server.mjs: ${names}`);
  const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  const expected = WORDS[names.length];
  const wrong = [];
  for (const doc of ["AGENTS.md", "mcp/README.md", "README.md", "docs/architecture.md"]) {
    const text = await readFile(new URL("../../" + doc, import.meta.url), "utf8");
    for (const m of text.matchAll(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten)\b[^.\n]{0,20}?\b(?:meta-)?tools\b/gi)) {
      if (m[1].toLowerCase() !== expected) {
        wrong.push(`${doc}: "${m[0].trim()}" but the server exposes ${names.length}`);
      }
    }
    // And the names themselves, so a renamed tool cannot leave a doc pointing
    // an agent at a tool that no longer answers.
    if (/`search_calculators`/.test(text)) {
      for (const n of names) {
        if (!text.includes("`" + n + "`")) wrong.push(`${doc}: does not name ${n}`);
      }
    }
  }
  assert.deepEqual(wrong, []);
});

// Every request carrying an id gets an answer, including the ones this server
// refuses to run.
//
// Shedding WORK under load is deliberate -- MAX_PENDING_RPC caps what runs at
// once, and MAX_RPC_BATCH_SIZE caps a batch. Shedding the RESPONSE was not: a
// request carries an id because a client is blocked on that id, and until
// 2026-11-26 anything past the hundredth in flight, and every message in a
// batch one item too long, was dropped without a word on stdout.
//
// stdin arrives in bulk, so this hit a client that merely pipelined, which
// JSON-RPC permits. A sweep of this repo's own catalog ran into it: 101 of
// 4,585 requests answered and then silence, with no error to read and no way
// to tell a stalled server from a slow one.
function collect(requests, ms = 4000) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [SERVER], { stdio: ["pipe", "pipe", "ignore"] });
    const msgs = [];
    let buf = "";
    child.stdout.on("data", (chunk) => {
      buf += chunk;
      let nl;
      while ((nl = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        try { msgs.push(JSON.parse(line)); } catch { /* not a message */ }
      }
    });
    child.on("error", reject);
    for (const r of requests) child.stdin.write(JSON.stringify(r) + "\n");
    setTimeout(() => { child.kill(); resolve(msgs); }, ms);
  });
}

test("a pipelined client past the in-flight cap is told so, not left waiting", async () => {
  const N = 150;                                  // MAX_PENDING_RPC is 100
  const reqs = Array.from({ length: N }, (_, i) => ({
    jsonrpc: "2.0", id: i + 1, method: "tools/call",
    params: { name: "describe_calculator", arguments: { id: "ohms-law" } },
  }));
  const msgs = await collect(reqs);

  const answered = new Set(msgs.filter((m) => m.id != null).map((m) => m.id));
  assert.equal(answered.size, N, `every one of the ${N} ids is answered (was 100, then silence)`);

  const busy = msgs.filter((m) => m.error && m.error.code === -32000);
  assert.ok(busy.length > 0, "the ones it would not run come back as an error");
  assert.match(busy[0].error.message, /busy/i);
  assert.match(busy[0].error.message, /retry/i, "and say retrying is worth it, because the queue drains");

  // The cap still does its job: the server did not run all 150.
  assert.ok(
    msgs.filter((m) => m.result).length <= 100,
    "shedding the work is kept -- only the response is restored",
  );
});

test("a batch one item too long is answered with an error, not dropped", async () => {
  const batch = Array.from({ length: 51 }, (_, i) => ({   // MAX_RPC_BATCH_SIZE is 50
    jsonrpc: "2.0", id: 1000 + i, method: "tools/call",
    params: { name: "describe_calculator", arguments: { id: "ohms-law" } },
  }));
  const msgs = await collect([batch]);

  assert.equal(msgs.length, 1, "exactly one response -- never one per item, which would amplify a huge batch");
  assert.equal(msgs[0].id, null, "a null id, as JSON-RPC prescribes for a batch it cannot process as sent");
  assert.equal(msgs[0].error.code, -32600);
  assert.match(msgs[0].error.message, /batch of 51/);

  // A batch at the limit still runs.
  const ok = await collect([batch.slice(0, 50)]);
  assert.equal(ok.filter((m) => m.result).length, 50, "fifty is accepted and every item answered");
});

test("a notification over the cap stays silent -- nobody is waiting on it", async () => {
  // The fix keys on the id. A notification has none, so it is still dropped
  // without a reply; answering one would itself break the protocol.
  const reqs = [
    ...Array.from({ length: 120 }, (_, i) => ({
      jsonrpc: "2.0", id: i + 1, method: "tools/call",
      params: { name: "describe_calculator", arguments: { id: "ohms-law" } },
    })),
    ...Array.from({ length: 30 }, () => ({ jsonrpc: "2.0", method: "notifications/initialized" })),
  ];
  const msgs = await collect(reqs);
  assert.equal(msgs.filter((m) => m.id === null || m.id === undefined).length, 0, "no reply is addressed to a notification");
  assert.equal(new Set(msgs.map((m) => m.id)).size, 120, "and all 120 real requests are answered");
});

// Every tool's real output satisfies the outputSchema it publishes, for the
// whole catalog.
//
// The tests above assert that each tool DECLARES an object outputSchema. That
// is a check on the declaration, not on the output: nothing here had ever
// compared a reply against the schema a client is told to expect. This drives
// describe_calculator and run_calculator over all 2,288 tiles, plus the other
// three tools, and validates `structuredContent` against the declared types,
// required keys and enums -- 4,585 calls, which the server answers in under a
// second through one process.
//
// It must WINDOW its requests. The server runs at most 100 at a time, and
// before 2026-11-26 the rest were dropped in silence; the sweep that found
// that defect looked exactly like a hung server for twenty minutes.
function typeName(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  if (typeof v === "number") return Number.isInteger(v) ? "integer" : "number";
  return typeof v;
}
function validateAgainst(schema, v, path, errs) {
  if (!schema || typeof schema !== "object") return;
  if (schema.type) {
    const want = Array.isArray(schema.type) ? schema.type : [schema.type];
    const got = typeName(v);
    if (!want.some((t) => t === got || (t === "number" && got === "integer"))) {
      errs.push(`${path}: declared ${want.join("|")}, got ${got}`);
      return;
    }
  }
  if (schema.enum && !schema.enum.some((e) => e === v)) errs.push(`${path}: ${JSON.stringify(v)} is not one of the declared values`);
  if (v && typeName(v) === "object") {
    for (const r of schema.required || []) {
      if (!Object.prototype.hasOwnProperty.call(v, r)) errs.push(`${path}: required "${r}" absent`);
    }
    for (const [k, sub] of Object.entries(schema.properties || {})) {
      if (v[k] !== undefined) validateAgainst(sub, v[k], `${path}.${k}`, errs);
    }
  }
  if (typeName(v) === "array" && schema.items) v.forEach((x, i) => validateAgainst(schema.items, x, `${path}[${i}]`, errs));
}

test("every tool's output matches its published outputSchema, catalog-wide", async () => {
  const { RENDERER_MAP } = await import("../fixtures/renderer-map.js");
  const tiles = Object.keys(RENDERER_MAP);

  const child = spawn("node", [SERVER], { stdio: ["pipe", "pipe", "ignore"] });
  try {
    const replies = new Map();
    const pending = new Set();
    const meta = new Map();
    let buf = "";
    child.stdout.on("data", (chunk) => {
      buf += chunk;
      let nl;
      while ((nl = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        let msg;
        try { msg = JSON.parse(line); } catch { continue; }
        if (msg.id != null) { replies.set(msg.id, msg); pending.delete(msg.id); }
      }
    });

    const WINDOW = 40;                       // well inside MAX_PENDING_RPC
    let nextId = 1;
    const send = async (method, params, tool, label) => {
      while (pending.size >= WINDOW) await new Promise((r) => setTimeout(r, 5));
      const id = nextId++;
      meta.set(id, [tool, label]);
      pending.add(id);
      child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
      return id;
    };
    const callTool = (name, args, label) => send("tools/call", { name, arguments: args }, name, label);

    const listId = await send("tools/list", {}, "__list", "list");
    for (const t of tiles) {
      await callTool("describe_calculator", { id: t }, t);
      await callTool("run_calculator", { id: t }, t);
    }
    for (const q of ["voltage drop 120v 150 ft 12 awg copper 20a", "concrete for a 10x12 slab 4 inches deep", "what is the capital of mars"]) {
      await callTool("answer_query", { query: q }, q.slice(0, 20));
    }
    for (const q of ["rebar", "duct", "zzzznope"]) await callTool("search_calculators", { query: q }, q);
    await callTool("run_calculators", { calls: [{ id: "ohms-law", inputs: { V: 120, I: 10 } }, { id: "nope-not-a-tile" }] }, "batch");

    const deadline = Date.now() + 120000;
    while (pending.size && Date.now() < deadline) await new Promise((r) => setTimeout(r, 25));
    assert.equal(pending.size, 0, `every request answered (${pending.size} outstanding)`);

    const tools = new Map(replies.get(listId).result.tools.map((t) => [t.name, t]));
    const errs = [];
    let validated = 0;
    for (const [id, [tool, label]] of meta) {
      if (tool === "__list") continue;
      const r = replies.get(id);
      if (r.error) { errs.push(`${tool}(${label}): JSON-RPC error ${r.error.code} ${r.error.message}`); continue; }
      const sc = r.result && r.result.structuredContent;
      if (sc === undefined) { errs.push(`${tool}(${label}): no structuredContent, though the tool declares an outputSchema`); continue; }
      validated++;
      const e = [];
      validateAgainst(tools.get(tool).outputSchema, sc, tool, e);
      for (const m of e) errs.push(`${tool}(${label}): ${m}`);
    }

    assert.ok(validated > 4500, `swept the whole catalog (${validated} replies validated)`);
    assert.deepEqual(errs.slice(0, 10), [], `${errs.length} reply/replies contradict the published schema`);
  } finally {
    child.kill();
  }
});
