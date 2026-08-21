// spec-v1188: static, zero-cost agent-discovery files, generated into dist/ by
// the build so a crawling or browsing agent can learn that a calculator catalog
// and a local MCP server exist. Pure renderers (no I/O) so the build emits them
// and a unit test can assert their contents against the live catalog. No hosted
// endpoint — these only describe the local stdio server; they do not run it.

// The five tools the MCP server exposes (mcp/server.mjs). Kept here so the
// discovery files and the server share one list; the golden surface manifest
// (test/fixtures/mcp-surface.json) pins the server side.
export const MCP_TOOLS = ["search_calculators", "describe_calculator", "run_calculator", "answer_query", "run_calculators"];
export const MCP_RESOURCES = ["roughlogic://catalog", "roughlogic://trade/{trade}", "roughlogic://calculator/{id}"];
export const MCP_PROMPTS = ["find-calculator", "run-with-inputs", "size-and-check"];
const INSTALL = "claude mcp add roughlogic -- node /absolute/path/to/roughlogic.com/mcp/server.mjs";

// /llms.txt — the emerging convention for an agent-readable site guide.
export function renderLlmsTxt({ tiles, modules }) {
  return `# roughlogic.com

> Field math for the trades: ${tiles.toLocaleString("en-US")} free calculators across ${modules} modules (electrical, plumbing, HVAC, construction, restoration, and more), US standards only. A local, zero-cost Model Context Protocol (MCP) server exposes every one to an AI agent. No hosting — the server runs on your machine over stdio.

## MCP server

- Install: \`${INSTALL}\`
- Tools: ${MCP_TOOLS.join(", ")}
- Resources: ${MCP_RESOURCES.join(", ")}
- Prompts: ${MCP_PROMPTS.join(", ")}
- Transport: local stdio (Node 18+, zero dependencies). No network, no hosted endpoint.

## Docs

- /AGENTS.md — how an AI agent works in this repository.
- Source and MCP setup: https://github.com/clay-good/roughlogic.com
`;
}

// /.well-known/mcp.json — a small machine manifest for clients that probe
// .well-known. Describes the local server; it does not host it.
export function renderMcpManifest({ version, tiles }) {
  return JSON.stringify({
    name: "roughlogic",
    version,
    description: `A local, zero-cost MCP server exposing ${tiles} trades calculators (search, describe, run).`,
    transport: "stdio",
    install: INSTALL,
    tools: MCP_TOOLS,
    resources: MCP_RESOURCES,
    prompts: MCP_PROMPTS,
    homepage: "https://roughlogic.com",
    source: "https://github.com/clay-good/roughlogic.com",
  }, null, 2) + "\n";
}
