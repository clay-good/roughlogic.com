# roughlogic MCP server

A local, zero-dependency [Model Context Protocol](https://modelcontextprotocol.io)
server that exposes the roughlogic catalog of **1,804 trades calculators**
(electrical, plumbing, HVAC, construction, restoration, and more) to any MCP
client — Claude Code, Claude Desktop, Cursor, and the like.

It runs entirely on your machine over stdio. No hosting, no network, no install
step, no dependencies beyond Node 18+.

## Tools

The catalog is exposed as five meta-tools (not one tool per calculator, which
would overwhelm a client's tool list):

| Tool | Purpose |
| --- | --- |
| `search_calculators` | Find calculators by keyword and/or trade. Call with no arguments for a trade overview with counts. |
| `describe_calculator` | Input fields with labels, select options, units, and min/max; the outputs; a publisher-verified worked example; the cited source; and any limitation banner. |
| `run_calculator` | Evaluate a calculator with your own inputs. Returns the raw result plus rendered outputs (units + display strings), range warnings, and the limitation banner. With no inputs, the worked example is run. |
| `answer_query` | **Answer a plain-language question in one call.** Picks the calculator, extracts the values out of the question, and computes: `voltage drop 120v 150 ft 12 awg copper 20a` returns 11.85 V without a `describe` round trip. Returns `MISSING_INPUTS` naming what it still needs rather than a bare refusal, `NO_VALUES` when the question named a calculator that takes inputs but carried no numbers, and `NO_MATCH` otherwise. The 21 tiles that take no inputs at all -- OSHA Top-10, the knot and hand-signal references, the WMM model stamp -- answer from their own content with `via: "reference"`, since asking such a tile for values would point at an empty list. Reads the same `data/fields/` descriptors the website reads, so an agent and a person cannot disagree about what a tile needs. |
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

"Naming it" counts a tile's words of four characters or more, so one incidental
short word cannot corroborate a question. Three tiles have no such word at all
-- **Ohm's Law**, **CFM per Ton**, **Tip Out** -- and until 2026-09-01 that left
the test with nothing to check and returned false for every question, including
the tile's own name typed exactly: `answer_query("ohms law")` answered "No
calculator matched." while `search_calculators` ranked `ohms-law` first for the
same string. A name made only of short words now has to appear in the question
in full, matched at token boundaries so `output` does not answer for Tip Out --
stricter than the four-character rule, not looser. Swept over all 22,837 tile
names and curated alias phrases: three answers changed, all three from
`NO_MATCH` to the right calculator, and nothing regressed.

### What the extractor is not measured on

`scripts/measure-query-fill.mjs` reports **0 wrong values** across 1,763 tiles,
and that is true of the corpus it measures: every number labelled, in field
order, taken from each tile's own worked example. It carries no distractors, so
it cannot see the case where a question holds more numbers than the tile has
fields.

Five of five hand-written trade questions do bind a value the query text rules
out. `wire size for a 50 amp circuit 90 feet away` puts **90 into the
conductor's insulation temperature rating**, where 90 C is a real value and an
agent has nothing to notice. `how many studs for a 40 ft wall 16 on center`
puts **480 inches into a stud-depth field**, the wall length converted. Every
one has the same shape: a number carrying a unit is converted into a field of
the same *dimension* but a different *meaning* -- feet and inches share a
dimension, a wall and a stud do not share a meaning.

`npm run audit:free-text-fill` measures it against
`test/fixtures/free-text-queries.json`, and `test/unit/free-text-fill.test.js`
pins the count both ways: it cannot rise, and it cannot fall without the
constant being lowered to match, so the number always says what the door does.

**Five to two.** Three of the five are fixed.

The nominal-lumber rewrite read every `AxB` in the language as a stick of
wood. `20x30 slab 4 inches thick` became "nominal width 20 in nominal depth 30
in slab 4 inches thick", which handed the 20 an inch the reader never wrote --
and an invented inch beats a real one, so the 20 took Slab thickness and the
four inches went unused. The rewrite is now bounded to 12, the largest nominal
dimension lumber is sold in: a slab, a room and a floor are written in feet,
and only the lumber is in inches. `2x6`, `2x10` and `4x4` still rewrite;
catalog-wide recovery is unchanged.

A name beside a number is evidence; a unit *on* the number is stronger, and
the name-then-value phase weighed only the first. `310 lb worker and 6 ft free
fall` put the 6 into Workers attached -- a count -- because "worker" sat in
front of it, on a tile carrying a Free fall distance measured in feet. A
unit-bearing quantity may no longer name a unitless field while some other
unfilled field is measured in a unit it fits. Catalog-wide recovery **rose**,
4,154 -> 4,349 of 7,184 fields, because a number that used to be captured by
the wrong field now reaches the right one and leaves the count free for the
number that belongs to it. On that particular tile -- two fields in feet,
three in pounds -- neither number can be placed unambiguously once the wrong
binding is gone, so the door now answers `NO_MATCH` where it used to hand back
a pointer carrying a wrong value. That is this module's governing rule
working, not an accident: a wrong prefill is worse than no prefill.

And the insulation-rating case is fixed. A unit-bearing number
may fill a numeric dropdown -- a bare one may not, since the unit is the
corroboration -- but the phase never asked *which* unit, so any unit at all
let a value through that matched an option. It now also requires the tile to
measure *something* in that dimension: `pipe-volume` has a Length in feet, so
a pipe size in inches is still a length among lengths and the case the phase
was written for keeps filling, while `wire-ampacity` measures amps, degrees
and counts and has no home for a distance. Same dimension, not same unit --
narrowing it to the unit would have broken `pipe-volume`, whose size dropdown
declares no unit in its label at all. Recovery across all 1,763 tiles is
unchanged by that one.

The two that remain are not fixed, and both are traced rather than mysterious.
`how many studs for a 40 ft wall 16 on center` puts 480 inches into a
stud-depth field: `assembly-r-value` carries exactly one field with a unit, so
the unit-agreement phase converts the wall length into it unopposed. `how many
4x8 sheets` sits inside the lumber bound, and a 4x8 is a plausible timber as
well as a sheet, so separating them needs the word beside the number.

Two attempts are on record as **not taken**, so the next one does not spend
them again. Requiring label support for a same-family conversion does not
separate the stud case -- the reader did write "studs", just about a different
number. Dropping same-family conversion altogether takes the count from 2 to 1
and leaves the recovery harness completely unchanged, which reads as free and
is not: that harness is built from worked examples, so every number in it
carries the field's own unit and no conversion is ever exercised. It cannot see
what removing it would cost, which is a reader writing 3 ft into a field
measured in inches.

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
