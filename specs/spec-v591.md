# roughlogic.com Specification v591 -- Quantity Slot Parsing and Prefilled Deep Links (data/search/slots.json, search-discovery.js, app.js, scripts/check-slots.mjs, 0 New Tiles)

> **Status: LANDED (2026-07-10, package 0.178.0). Platform spec, third of the "ask it a question" search series (v589-v592). Depends on
> v589 (normalizeQuery).** No new tile, module, or dependency; fully deterministic (a regex-and-table parser, no model).
> Inherits spec.md through spec-v590.md.
>
> **As-landed deltas.** (1) The seed is **17 tiles / 27 slots**, not ~50: factory-built renderers (`_simpleRenderer` and
> kin) call `makeNumber(f.label, f.id, ...)` with `f.id` undefined -- their inputs render with `id="undefined"`, so no
> hash-state param can target them. Slot coverage for those tiles is blocked until the factories assign real ids (a
> worthwhile follow-on: it would also fix label/for association on every factory tile). (2) check-slots verifies each
> `param` as the **id-position literal of a make\* call**, not merely a string literal in the module -- field KEYS are
> string literals too and would have passed as dead prefills. (3) Single-letter units ("v", "a") are accepted glued-only
> ("120v", not "120 v"), so an article or dimension separator never reads as a unit. (4) search-discovery.js cap landed
> at 8500 B (7053 B as landed), continuing from v589's 7000.
>
> **The gap, and the evidence for it.** A user who types *"voltage drop 120v 150 ft 20 amps"* today lands on a **blank**
> voltage-drop tile and re-types the three numbers they just typed. The infrastructure to do better already exists and is
> gated: hash-state deep links (`#voltage-drop?v=1&<input-id>=<value>`) populate inputs and fire the live compute
> (hash-state.js `applyHashState`, routing.js `parseHashRoute`, the v10 §G.1 schema pin, and docs/hash-state.md). What is
> missing is the deterministic bridge from "numbers with units inside a question" to "hash params for the matched tile."
> That bridge is a per-tile slot table plus a small quantity extractor -- both static, both lintable.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. The shard: data/search/slots.json

A new lazy-loaded shard (sibling of aliases.json, added to the sw.js precache list and the data/search/manifest.json
shard table), strict JSON:

```
{ "version": 1,
  "tiles": [
    { "tile": "voltage-drop",
      "slots": [
        { "param": "<dom-input-id>", "units": ["v", "volt", "volts"] },
        { "param": "<dom-input-id>", "units": ["ft", "foot", "feet"] },
        { "param": "<dom-input-id>", "units": ["a", "amp", "amps"] }
      ] }
  ] }
```

`param` is the tile's **DOM input id** (the literal passed to makeNumber / makeSelect in the renderer -- the same key
`wireHashState` writes and `applyHashState` reads). `units` are lowercase unit spellings, unique across the tile's
slots. **Seed coverage: ~50 tiles** -- the leader-key shortcut set plus the highest-alias-count tiles (voltage-drop,
wire-ampacity, conduit-fill, ohms-law, friction-loss, duct-sizing, concrete, board-feet, and peers) -- expanding in
follow-on batches under this spec.

## 2. The parser (pure, search-discovery.js)

```
extractQuantities(query) -> [{ value: "<canonical decimal string>", unit: "<lowercase token>" | null }]
mapSlots(quantities, slotRow) -> { <param>: <value>, ... } | null
```

**extractQuantities** recognizes `<number><unit>` glued (`120v`, `20a`) and spaced (`150 ft`), decimals, thousands
commas (`1,200`), and simple fractions with a unit (`3/4 in` -> `0.75`). Values are emitted as canonical decimal
strings; the number grammar is anchored so tile names containing digits (`6-3-2`, `62.2`) do not false-positive --
a quantity requires a unit token or standalone-number position, and **unitless numbers never map** (conservative by
design; a `10x12` dimension pair parses as two unitless quantities and maps nothing).

**mapSlots** fills a param only when **exactly one** yet-unfilled slot of the tile accepts the quantity's unit token;
any ambiguity drops that quantity. It returns params only when at least one quantity mapped. Same input, same output --
no scoring, no heuristics beyond the table.

## 3. Wiring

**app.js.** The combobox `pick()` path: when the picked tile has a slot row and `mapSlots` yields params, navigate to
`#<tile>?v=1&<param>=<value>&...` instead of the bare `#<tile>`. Keys come only from the static shard; values are
parser-canonical decimal strings -- no free user text ever enters the hash (and `applyHashState` already CSS-escapes and
ignores unknown ids as defense in depth). The shard loads with `ensureAliases()` on first search interaction; home first
paint is untouched. Presentation of the dropdown rows is deliberately unchanged here -- v592 adds the visible preview.

**scripts/check-slots.mjs** -- new lint, the **29th gate**, wired into `npm run lint`: every `tile` exists in
tools-data.js; every `param` appears as a string literal in the tile's registered compute module source (module resolved
via `test/fixtures/compute-map.js`, the check-dead-inputs source-grep technique); unit tokens are lowercase and unique
within a tile; the JSON parses strict. The gate makes a renamed input id or a deleted tile fail CI instead of silently
dead-linking the prefill.

**Tests.** `test/unit/search-discovery.test.js`: extractQuantities cases (glued / spaced / fraction / comma / unitless /
dimension-pair), mapSlots ambiguity rules, and the flagship acceptance: *"voltage drop 120v 150 ft 20 amps"* -> tile
`voltage-drop` + three mapped params. `test/unit/routing.test.js` (or sibling): the emitted hash round-trips through
`parseHashRoute`. One Playwright integration case on two seed tiles: type the query, press Enter, assert the inputs are
populated and the output region is non-empty (render-no-nan style).

## 4. As-landed verification (gate plan)

`npm run lint` (all 29 gates -- the new check-slots plus `check-sw-precache` for the shard, `check-manifests` for the
manifest row; README gate-count references re-pinned 28 -> 29); `npm test`; `npm run build`; `npm run data:verify`; the
Playwright case above; a 320 px manual smoke (no visual change to the dropdown; the prefilled tile view is existing,
already-audited rendering).

## 5. Roadmap position

Third of the v589-v592 series. Turns the search bar from "tool finder" into "question box that arrives with your numbers
already in the fields." v592 builds directly on this: once a slot row maps, the answer itself can be computed and shown
in the dropdown before the user even clicks. Slot-table growth beyond the ~50-tile seed continues under this spec in
review-sized batches.
