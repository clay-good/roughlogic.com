#!/usr/bin/env node
// roughlogic MCP server — zero-dependency, local, stdio transport.
//
// Exposes the site's full trades-calculator catalog to any MCP client
// (Claude Desktop, Claude Code, Cursor, …) as three tools:
//   search_calculators   — find calculators by keyword and/or trade
//   describe_calculator  — inputs, a worked example, and the source for one
//   run_calculator       — evaluate a calculator with your own inputs
//
// One catalog meta-surface, not one tool per calculator — that keeps the
// tool list small enough for any client while still reaching every
// calculator, and the count tracks the live registry with no edits here.
//
// Transport is MCP stdio: newline-delimited JSON-RPC 2.0 on stdin/stdout.
// stderr is for logs only. No network, no install — `node mcp/server.mjs`.

import { createInterface } from "node:readline";
import { readFileSync } from "node:fs";
import { search, describe, run } from "./catalog.mjs";

// Report the site's version: the server exposes the site's catalog verbatim,
// so its version is the root package.json version, read at startup.
const SITE_VERSION = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
).version;
const SERVER_INFO = { name: "roughlogic", version: SITE_VERSION };
// Echo the client's protocol version when sane; otherwise this baseline.
const DEFAULT_PROTOCOL = "2024-11-05";

const TOOLS = [
  {
    name: "search_calculators",
    description:
      "Search the roughlogic catalog of trades calculators (electrical, plumbing, HVAC, construction, restoration, and more). Filter by keyword and/or trade. Call with no arguments to get a trade overview with counts.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Keyword(s) matched against id, name, and description (all terms must match)." },
        trade: { type: "string", description: "Restrict to a trade, e.g. 'electrical', 'plumbing', 'hvac'." },
        limit: { type: "number", description: "Max results (default 30)." },
      },
    },
  },
  {
    name: "describe_calculator",
    description:
      "Get the input fields (with defaults), a publisher-verified worked example, and the cited source for one calculator. Use the id from search_calculators.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Calculator id, e.g. 'voltage-drop'." } },
      required: ["id"],
    },
  },
  {
    name: "run_calculator",
    description:
      "Evaluate a calculator. Pass `id` and an `inputs` object of named field values (see describe_calculator for field names). With no inputs, the worked example is run.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Calculator id, e.g. 'voltage-drop'." },
        inputs: { type: "object", description: "Named input values for the calculator." },
      },
      required: ["id"],
    },
  },
];

async function dispatchTool(name, args) {
  switch (name) {
    case "search_calculators": return search(args || {});
    case "describe_calculator": return describe(args || {});
    case "run_calculator": return run(args || {});
    default: throw new Error(`unknown tool: ${name}`);
  }
}

// --- JSON-RPC plumbing ---------------------------------------------------

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

function reply(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function replyError(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

async function handle(msg) {
  const { id, method, params } = msg;
  const isNotification = id === undefined || id === null;

  try {
    switch (method) {
      case "initialize": {
        const requested = params && params.protocolVersion;
        const protocolVersion = typeof requested === "string" ? requested : DEFAULT_PROTOCOL;
        reply(id, { protocolVersion, capabilities: { tools: {} }, serverInfo: SERVER_INFO });
        return;
      }
      case "notifications/initialized":
      case "initialized":
        return; // notification — no response
      case "ping":
        reply(id, {});
        return;
      case "tools/list":
        reply(id, { tools: TOOLS });
        return;
      case "tools/call": {
        const toolName = params && params.name;
        const data = await dispatchTool(toolName, params && params.arguments);
        reply(id, { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] });
        return;
      }
      default:
        if (!isNotification) replyError(id, -32601, `method not found: ${method}`);
        return;
    }
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    if (isNotification) {
      process.stderr.write(`[roughlogic-mcp] notification error: ${message}\n`);
      return;
    }
    // For a failed tools/call, prefer a tool-level error so the model sees it.
    if (method === "tools/call") {
      reply(id, { content: [{ type: "text", text: `Error: ${message}` }], isError: true });
    } else {
      replyError(id, -32603, message);
    }
  }
}

const rl = createInterface({ input: process.stdin });
rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let msg;
  try {
    msg = JSON.parse(trimmed);
  } catch {
    process.stderr.write(`[roughlogic-mcp] dropping non-JSON line\n`);
    return;
  }
  // Tolerate JSON-RPC batches (arrays) as well as single messages.
  if (Array.isArray(msg)) msg.forEach((m) => handle(m));
  else handle(msg);
});

process.stderr.write(`[roughlogic-mcp] ready on stdio\n`);
