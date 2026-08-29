# roughlogic MCP server

A local, zero-dependency [Model Context Protocol](https://modelcontextprotocol.io)
server that exposes the roughlogic catalog of **1,804 trades calculators**
(electrical, plumbing, HVAC, construction, restoration, and more) to any MCP
client — Claude Code, Claude Desktop, Cursor, and the like.

It runs entirely on your machine over stdio. No hosting, no network, no install
step, no dependencies beyond Node 18+.

## Tools

The catalog is exposed as four meta-tools (not one tool per calculator, which
would overwhelm a client's tool list):

| Tool | Purpose |
| --- | --- |
| `search_calculators` | Find calculators by keyword and/or trade. Call with no arguments for a trade overview with counts. |
| `describe_calculator` | Input fields with labels, select options, units, and min/max; the outputs; a publisher-verified worked example; the cited source; and any limitation banner. |
| `run_calculator` | Evaluate a calculator with your own inputs. Returns the raw result plus rendered outputs (units + display strings), range warnings, and the limitation banner. With no inputs, the worked example is run. |
| `answer_query` | **Answer a plain-language question in one call.** Picks the calculator, extracts the values out of the question, and computes: `voltage drop 120v 150 ft 12 awg copper 20a` returns 11.85 V without a `describe` round trip. Returns `MISSING_INPUTS` naming what it still needs rather than a bare refusal, `NO_VALUES` when the question named a calculator but carried no numbers, and `NO_MATCH` otherwise. Reads the same `data/fields/` descriptors the website reads, so an agent and a person cannot disagree about what a tile needs. |
| `run_calculators` | Evaluate up to 50 `{ id, inputs }` calls in one request — for sweeps and comparisons. A bad item returns `{ id, error }` without failing the batch. |

Typical flow: `search_calculators({query:"voltage drop", trade:"electrical"})`
→ `describe_calculator({id:"voltage-drop"})` → `run_calculator({id:"voltage-drop",
inputs:{phase:"single", material:"copper", awg:"10", length_ft:150,
current_A:20, source_voltage_V:240}})`.

### Resources and prompts

The server also implements the MCP `resources/*` and `prompts/*` surfaces, so a
client can browse the catalog and start a common task without knowing the tool
names. Resources: `roughlogic://catalog` (trade overview), `roughlogic://trade/{trade}`
(one trade's calculators), and the template `roughlogic://calculator/{id}` (one
tile's full card). Prompts: `find-calculator`, `run-with-inputs`, and
`size-and-check` — plain templates with argument substitution, no model call.

The compute functions, their input shapes, and the example values are read
straight from the repo (`tools-data.js`, `test/fixtures/compute-map.js`,
`test/fixtures/worked-examples.json`), so the MCP surface can never drift from
the site.

Input names come from the calculator's renderer schema where it has one, and
otherwise from its compute signature. Where the signature cannot be read — a
few take a bare object, a few collect a shape-dependent key set through a rest
element — the keys of the publisher-verified worked example fill the gap, so
`describe_calculator` names every value a caller must supply rather than
returning an empty list. `scripts/check-both-doors.mjs` holds the door to that
contract: every advertised name must be a key a caller can actually send, every
key the tile's own example sets must be advertised, and that example must run
clean through `run_calculator`. All three are checked for all 1,804 tiles on
every build.

`run_calculator` also warns when it is handed a key the calculator cannot
receive. It spreads the caller's object into the compute, so an unrecognised
key is dropped silently and the tile answers from its defaults -- a confident
number built on a value the caller believes it supplied. A misspelling lands
that way. The warning is advisory and the result still comes back. Calculators
that legitimately take a shape-dependent key set are exempt, since their
accepted keys are not a fixed list.

The key a calculator's own page shows is never one of those misses. Four
calculators sit on a correlation published in metric while facing the US user
in the units the trade works in -- dyno correction (in Hg / deg F over
mbar / deg C), the two flocculation G tiles (hp / gal / deg F over
W / m^3 / deg C), and speaker time alignment (deg F over deg C). Their computes
accept **either** family and convert internally, so the page's own numbers run
straight through the door, warning-free, to the answer the page shows. Send one
family or the other; where both are given, the US key wins.

`describe_calculator` names the answers as well as the inputs, and says which
of two key spaces it is using. A calculator with a field schema reports its
**display lines** -- the rows a person reads down the page -- so `outputs_source`
is `renderer`, the keys are the renderer's own line ids, and `run_calculator`
fills each one's `display` with the formatted string the page shows ("24.0 in
(straight pull)"). The hand-written renderers have no schema and no format
closure, so for those the door reports the **caption the calculator prints above
each number**, keyed by the compute's own result key: `outputs_source` is
`captions`, `display` is null, and the key joins straight onto `result`. Either
way, a key is named only where the calculator is observed to produce it -- the
worked example's result for `describe_calculator`, the caller's own result for
`run_calculator` -- so the door never names an answer that is not there.
`check-both-doors.mjs` holds that. **1,768 of 1,804 calculators name their
answers.** The remaining 36 return them unlabelled; their captions are built by
an expression a static read cannot follow.

A boolean answer is the one case where a captioned output carries a `display`.
The renderer states both words as literals (`flag ? "PASS" : "FAIL"`), so the
string for the state a result is in is verbatim what the page prints, not a
reconstruction. Numbers stay bare.

Captioned outputs carry no `unit`. A hand-written renderer's answer wrapping is
extracted as the prefix and suffix it literally is -- `"$"`, `" CFU/mL"`, but
also `"eta^2 = "` -- and calling that a unit would be a guess. `outputUnits(id)`
in `catalog.mjs` exposes them as what they are.

`answer_query` reads the `data/fields/` descriptors the website reads, which
exist for 1,763 calculators. For the other 41 it projects the descriptors from
`describe_calculator` instead, naming each input with the caption the
calculator itself prints. A field whose verified
example holds something a numeric extractor must not guess at -- a list, a
date, a coded token like `wingwall_30_75` -- is named but never filled, and a
field the example sets is treated as required. So a question that covers only
part of a calculator comes back as `MISSING_INPUTS` naming the rest, rather
than an answer computed partly from defaults.

It will not answer from a weak match, so a question has to corroborate the
calculator it reached: by carrying values, by naming it, or by matching a phrase
the catalog's own alias corpus already maps to it. That third form matters more
than it sounds -- the corpus exists precisely because people do not use the
name. Measured over a 300-term sample of it, questions refused as `NO_MATCH`
fall from 70 to 4, and 284 of the 300 now name the calculator and say what it
needs. Corroboration is checked against the top-ranked calculator only, so this
widens what counts as a match without widening what gets answered.

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

Restart the client; the five tools appear under the `roughlogic` server.

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
