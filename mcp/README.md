# roughlogic MCP server

A local, zero-dependency [Model Context Protocol](https://modelcontextprotocol.io)
server that exposes the roughlogic catalog of **706 trades calculators**
(electrical, plumbing, HVAC, construction, restoration, and more) to any MCP
client — Claude Code, Claude Desktop, Cursor, and the like.

It runs entirely on your machine over stdio. No hosting, no network, no install
step, no dependencies beyond Node 18+.

## Tools

The catalog is exposed as three meta-tools (not 706 individual tools, which
would overwhelm a client's tool list):

| Tool | Purpose |
| --- | --- |
| `search_calculators` | Find calculators by keyword and/or trade. Call with no arguments for a trade overview with counts. |
| `describe_calculator` | Input fields (with defaults), a publisher-verified worked example, and the cited source for one calculator. |
| `run_calculator` | Evaluate a calculator with your own inputs. With no inputs, the worked example is run. |

Typical flow: `search_calculators({query:"voltage drop", trade:"electrical"})`
→ `describe_calculator({id:"voltage-drop"})` → `run_calculator({id:"voltage-drop",
inputs:{phase:"single", material:"copper", awg:"10", length_ft:150,
current_A:20, source_voltage_V:240}})`.

The compute functions, their input shapes, and the example values are read
straight from the repo (`tools-data.js`, `test/fixtures/compute-map.js`,
`test/fixtures/worked-examples.json`), so the MCP surface can never drift from
the site.

## Run it

```sh
node /absolute/path/to/roughlogic.com/mcp/server.mjs
```

That's the whole server. It speaks newline-delimited JSON-RPC 2.0 on
stdin/stdout (MCP stdio transport); logs go to stderr.

## Wire it into a client

Point any MCP client at the script with `node`. Use an **absolute path** — the
client launches the server from its own working directory.

### Claude Code

```sh
claude mcp add roughlogic -- node /absolute/path/to/roughlogic.com/mcp/server.mjs
```

### Claude Desktop / Cursor (`claude_desktop_config.json`, `mcp.json`, etc.)

```json
{
  "mcpServers": {
    "roughlogic": {
      "command": "node",
      "args": ["/absolute/path/to/roughlogic.com/mcp/server.mjs"]
    }
  }
}
```

Restart the client; the three tools appear under the `roughlogic` server.

## Sharing it

Because it's all local, anyone can use it by cloning this repo and pointing
their MCP client at `mcp/server.mjs` as above. There's a `bin` entry too, so
`npx roughlogic-mcp` works from a checkout (`npm link` first, or run
`node mcp/server.mjs` directly).

## Quick smoke test

```sh
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{}}}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"run_calculator","arguments":{"id":"ohms-law","inputs":{"V":120,"I":10,"R":null,"P":null}}}}' \
  | node mcp/server.mjs
```

Expect `R: 12` and `P: 1200` in the second response.
