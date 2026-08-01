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
import {
  search, describe, run, runMany,
  listResources, listResourceTemplates, readResource,
} from "./catalog.mjs";

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
    annotations: { title: "Search calculators", readOnlyHint: true, idempotentHint: true, destructiveHint: false, openWorldHint: false },
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
    outputSchema: {
      type: "object",
      properties: {
        total: { type: "number" },
        returned: { type: "number" },
        results: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" }, name: { type: "string" }, group: { type: "string" },
              trades: { type: "array", items: { type: "string" } }, desc: { type: "string" },
            },
          },
        },
        trades: {
          type: "array",
          items: { type: "object", properties: { trade: { type: "string" }, count: { type: "number" } } },
        },
      },
    },
  },
  {
    name: "describe_calculator",
    annotations: { title: "Describe calculator", readOnlyHint: true, idempotentHint: true, destructiveHint: false, openWorldHint: false },
    description:
      "Get the input fields (with defaults), a publisher-verified worked example, and the cited source for one calculator. Use the id from search_calculators.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Calculator id, e.g. 'voltage-drop'." } },
      required: ["id"],
    },
    outputSchema: {
      type: "object",
      properties: {
        id: { type: "string" }, name: { type: "string" }, group: { type: "string" },
        trades: { type: "array", items: { type: "string" } }, desc: { type: "string" },
        runnable: { type: "boolean" },
        inputs_source: { type: "string", enum: ["renderer", "compute"] },
        inputs: { type: "array", description: "Field descriptors (key, label, kind, options, default, attrs) or compute params." },
        outputs: { type: "array", items: { type: "object", properties: { key: { type: "string" }, label: { type: "string" }, unit: { type: ["string", "null"] } } } },
        example: { type: "object" },
        source: { type: "string" },
        limitation: { type: ["object", "null"] },
      },
      required: ["id", "name", "runnable"],
    },
  },
  {
    name: "run_calculator",
    annotations: { title: "Run calculator", readOnlyHint: true, idempotentHint: true, destructiveHint: false, openWorldHint: false },
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
    outputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        inputs: { type: "object" },
        usedExample: { type: "boolean" },
        result: { type: "object", description: "The raw compute result object." },
        outputs: { type: "array", items: { type: "object", properties: { key: { type: "string" }, label: { type: "string" }, unit: { type: ["string", "null"] }, display: { type: ["string", "null"] } } } },
        warnings: { type: "array", items: { type: "object", properties: { key: { type: "string" }, rule: { type: "string" }, limit: { type: "number" }, message: { type: "string" } } } },
        limitation: { type: ["object", "null"] },
      },
      required: ["id", "result"],
    },
  },
  {
    name: "run_calculators",
    annotations: { title: "Run calculators (batch)", readOnlyHint: true, idempotentHint: true, destructiveHint: false, openWorldHint: false },
    description:
      "Evaluate up to 50 calculator calls in one request — for sweeps and comparisons (e.g. one voltage-drop across several wire gauges). Pass `calls`: an array of { id, inputs }. Each item is evaluated independently; a bad item returns { id, error } in place without failing the batch.",
    inputSchema: {
      type: "object",
      properties: {
        calls: {
          type: "array",
          description: "Up to 50 { id, inputs } objects, each evaluated like run_calculator.",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "Calculator id." },
              inputs: { type: "object", description: "Named input values." },
            },
            required: ["id"],
          },
        },
      },
      required: ["calls"],
    },
    outputSchema: {
      type: "object",
      properties: {
        count: { type: "number" },
        results: { type: "array", description: "One entry per call: a run_calculator result, or { id, error }." },
      },
      required: ["count", "results"],
    },
  },
];

// --- Prompts (spec-v1186) ------------------------------------------------
// Static task templates the client surfaces in its prompt picker. Plain string
// substitution — no model call, consistent with the site's "no AI at runtime"
// constraint. Each expands into a first user message wired to the tools.
const PROMPTS = [
  {
    name: "find-calculator",
    description: "Find the best calculator for a need and describe it.",
    arguments: [{ name: "need", description: "What you need to calculate.", required: true }],
    template: (a) =>
      `Search the roughlogic catalog for "${a.need ?? ""}" with search_calculators, then call describe_calculator on the best match and summarize its inputs (with valid options), outputs, and the cited source.`,
  },
  {
    name: "run-with-inputs",
    description: "Run a calculator and cite the source.",
    arguments: [
      { name: "id", description: "Calculator id.", required: true },
      { name: "inputs", description: "JSON object of named inputs.", required: false },
    ],
    template: (a) =>
      `Call run_calculator with id "${a.id ?? ""}"${a.inputs ? ` and inputs ${a.inputs}` : " (worked example)"}. Report each output with its unit and display value, note any warnings, then cite the source from describe_calculator.`,
  },
  {
    name: "size-and-check",
    description: "Size something, then check it against the code limit.",
    arguments: [{ name: "task", description: "The sizing task in plain language.", required: true }],
    template: (a) =>
      `Task: ${a.task ?? ""}. Search the catalog, pick the calculator, run its worked example to learn the shape, then run it again with the real numbers and report the result against the code limit with its citation and any limitation banner.`,
  },
];

function getPrompt(name, args) {
  const p = PROMPTS.find((x) => x.name === name);
  if (!p) throw new Error(`unknown prompt: ${name}`);
  return {
    description: p.description,
    messages: [{ role: "user", content: { type: "text", text: p.template(args || {}) } }],
  };
}

async function dispatchTool(name, args) {
  switch (name) {
    case "search_calculators": return search(args || {});
    case "describe_calculator": return describe(args || {});
    case "run_calculator": return run(args || {});
    case "run_calculators": return runMany(args || {});
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
        reply(id, { protocolVersion, capabilities: { tools: {}, resources: {}, prompts: {} }, serverInfo: SERVER_INFO });
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
      case "resources/list":
        reply(id, await listResources());
        return;
      case "resources/templates/list":
        reply(id, listResourceTemplates());
        return;
      case "resources/read": {
        const uri = params && params.uri;
        reply(id, await readResource(uri));
        return;
      }
      case "prompts/list":
        reply(id, { prompts: PROMPTS.map(({ name, description, arguments: a }) => ({ name, description, arguments: a })) });
        return;
      case "prompts/get":
        reply(id, getPrompt(params && params.name, params && params.arguments));
        return;
      case "tools/call": {
        const toolName = params && params.name;
        const data = await dispatchTool(toolName, params && params.arguments);
        // spec-v1192: return the typed object in the structured channel and keep
        // the JSON text as a fallback for clients that predate structured output.
        reply(id, {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          structuredContent: data,
        });
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
