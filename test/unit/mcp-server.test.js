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
