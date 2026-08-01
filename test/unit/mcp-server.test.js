// spec-v1192: the MCP server declares an outputSchema per tool and returns
// structuredContent alongside the text fallback. Driven as a real stdio
// subprocess (importing the server would start its readline loop).

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const SERVER = fileURLToPath(new URL("../../mcp/server.mjs", import.meta.url));

// Send a batch of JSON-RPC requests to a fresh server and collect the replies
// keyed by id. Resolves once a reply for `waitForId` has arrived.
function rpc(requests, waitForId) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [SERVER], { stdio: ["pipe", "pipe", "ignore"] });
    const replies = new Map();
    let buf = "";
    const timer = setTimeout(() => { child.kill(); reject(new Error("timeout")); }, 10000);
    child.stdout.on("data", (chunk) => {
      buf += chunk;
      let nl;
      while ((nl = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        const msg = JSON.parse(line);
        if (msg.id != null) replies.set(msg.id, msg);
        if (replies.has(waitForId)) { clearTimeout(timer); child.kill(); resolve(replies); }
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
  ], 2);
  const tools = replies.get(2).result.tools;
  assert.equal(tools.length, 4);
  for (const t of tools) {
    assert.equal(t.outputSchema && t.outputSchema.type, "object", `${t.name} declares an object outputSchema`);
  }
});

test("initialize advertises tools, resources, and prompts capabilities (spec-v1186)", async () => {
  const replies = await rpc([
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {} } },
  ], 1);
  const caps = replies.get(1).result.capabilities;
  assert.ok(caps.tools && caps.resources && caps.prompts);
});

test("resources round-trip: list, template, and read a calculator card (spec-v1186)", async () => {
  const replies = await rpc([
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {} } },
    { jsonrpc: "2.0", id: 2, method: "resources/list" },
    { jsonrpc: "2.0", id: 3, method: "resources/templates/list" },
    { jsonrpc: "2.0", id: 4, method: "resources/read", params: { uri: "roughlogic://calculator/pull-box-sizing" } },
  ], 4);
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
  ], 3);
  assert.ok(replies.get(2).result.prompts.some((p) => p.name === "run-with-inputs"));
  const msg = replies.get(3).result.messages[0];
  assert.equal(msg.role, "user");
  assert.match(msg.content.text, /voltage-drop/);
});

test("every tool is annotated read-only, idempotent, non-destructive, closed-world (spec-v1193)", async () => {
  const replies = await rpc([
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {} } },
    { jsonrpc: "2.0", id: 2, method: "tools/list" },
  ], 2);
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
  ], 3);
  const res = replies.get(3).result;
  assert.ok(res.structuredContent, "structuredContent present");
  assert.equal(res.structuredContent.id, "pull-box-sizing");
  assert.equal(res.structuredContent.result.governing, 24);
  assert.equal(res.content[0].type, "text");
  assert.equal(res.content[0].text, JSON.stringify(res.structuredContent, null, 2));
});
