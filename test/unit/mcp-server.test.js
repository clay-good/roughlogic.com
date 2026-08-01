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
