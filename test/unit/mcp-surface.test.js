// spec-v1191: the exposed protocol surface — tool names and their safety
// annotations, whether each declares an outputSchema, the resource templates,
// the prompt names and arguments, and the advertised capabilities — is pinned
// to a checked-in golden. Adding, renaming, or re-annotating any of them
// requires updating test/fixtures/mcp-surface.json in the same change, so the
// surface can never drift from its spec without a visible diff.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SERVER = fileURLToPath(new URL("../../mcp/server.mjs", import.meta.url));
const GOLDEN = fileURLToPath(new URL("../fixtures/mcp-surface.json", import.meta.url));

async function rpc(requests, waitForId) {
  for (let attempt = 0; ; attempt++) {
    try { return await rpcOnce(requests, waitForId); }
    catch (e) { if (attempt >= 1) throw e; }
  }
}
function rpcOnce(requests, waitForId) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [SERVER], { stdio: ["pipe", "pipe", "ignore"] });
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
        if (msg.id != null) replies.set(msg.id, msg);
        if (replies.has(waitForId)) { clearTimeout(timer); child.kill(); resolve(replies); }
      }
    });
    child.on("error", reject);
    for (const r of requests) child.stdin.write(JSON.stringify(r) + "\n");
  });
}

test("the live protocol surface matches the checked-in golden manifest", async () => {
  const replies = await rpc([
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {} } },
    { jsonrpc: "2.0", id: 2, method: "tools/list" },
    { jsonrpc: "2.0", id: 3, method: "resources/templates/list" },
    { jsonrpc: "2.0", id: 4, method: "prompts/list" },
  ], 4);

  const surface = {
    capabilities: Object.keys(replies.get(1).result.capabilities).sort(),
    tools: replies.get(2).result.tools.map((t) => ({
      name: t.name,
      title: t.annotations && t.annotations.title,
      readOnlyHint: t.annotations.readOnlyHint,
      idempotentHint: t.annotations.idempotentHint,
      destructiveHint: t.annotations.destructiveHint,
      openWorldHint: t.annotations.openWorldHint,
      hasOutputSchema: !!(t.outputSchema && t.outputSchema.type === "object"),
    })).sort((a, b) => (a.name < b.name ? -1 : 1)),
    resourceTemplates: replies.get(3).result.resourceTemplates.map((t) => t.uriTemplate).sort(),
    prompts: replies.get(4).result.prompts.map((p) => ({
      name: p.name,
      args: (p.arguments || []).map((a) => ({ name: a.name, required: !!a.required })),
    })).sort((a, b) => (a.name < b.name ? -1 : 1)),
  };

  const golden = JSON.parse(readFileSync(GOLDEN, "utf8"));
  assert.deepEqual(surface, golden, "MCP surface drifted from test/fixtures/mcp-surface.json — update the golden if intentional.");
});
