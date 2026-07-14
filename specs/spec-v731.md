# roughlogic.com Specification v731 -- Scupper Width for a Required Overflow Flow (calc-drainage.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-drainage.js`** (Group B),
> no new module, group, or dependency. Inherits spec.md through spec-v730.md. Explore sweep #12 (entry 9).
>
> **The gap, and the evidence for it.** The `overflow-scupper-sizing` tile runs the rectangular (Francis) weir forward:
> from a scupper width and head it returns the overflow capacity. The plumbing question is the inverse -- **how wide a
> scupper a required overflow flow needs** at the design head. From `Q = 3.33 L H^1.5` (cfs, feet),
> `L = Q / (3.33 H^1.5)` (suppressed), and from the end-contracted form `Q = 3.33 (L - 0.2 H) H^1.5`,
> `L = Q / (3.33 H^1.5) + 0.2 H`. The number this settles: **118 gpm** at a **3.5 in** head needs a **6.0 in** opening
> (6.7 in contracted).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`overflow-scupper-sizing` sibling: the required flow is `L^3 T^-1` (gpm), the head and returned widths are `L` (in), and
the internal flow is `L^3 T^-1` (cfs). It reuses the sibling's Francis rectangular-weir model, solved for the width, in
both the suppressed and end-contracted forms. The v18/v21 contract: any non-finite input, a non-positive required flow, or
a non-positive head returns `{ error }`. Citation discipline (v19/v22): the Francis weir solved for the width,
`GOVERNANCE.general` matching the sibling; the note states that the **contracted** (narrow) scupper needs the wider
opening for the same flow, that the width should be **rounded UP**, that the head is the **blocked-primary** design
condition (IPC 1108 / FM Global), and that this sizes the weir flow only -- **the plumbing code, the AHJ, and the
structural roof-loading check govern**.

## 2. The tile

### 2.1 `scupper-width-for-flow` -- Scupper Width for a Required Overflow Flow

```
inputs:
  required_gpm   L^3 T^-1   required overflow flow (gpm, > 0)
  head_in        L          head above the scupper invert (in, > 0)

q_cfs               = required_gpm / 448.8
H                   = head_in / 12                      (ft)
base_ft             = q_cfs / (3.33 x H^1.5)
width_suppressed_in = base_ft x 12
width_contracted_in = (base_ft + 0.2 x H) x 12
```

**Pinned worked example.** required flow = 118 gpm, head = 3.5 in:
`q_cfs = 0.263`, `H = 0.2917 ft`, `base = 0.263 / (3.33 x 0.2917^1.5) = 0.501 ft = ` **6.0 in** suppressed,
6.7 in contracted. Feeding 6.0 in back through `overflow-scupper-sizing` at 3.5 in returns 118 gpm (suppressed), and 6.7 in
returns 118 gpm under the contracted form -- the inputs. A larger 200 gpm flow at the same head needs a wider ~10 in
opening.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing","roofing"]`) placed beside `overflow-scupper-sizing` (Group B is not
exact-count audited); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (Francis weir solved for the width,
`GOVERNANCE.general` matching the sibling); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`scupper-width-for-flow` -> `computeScupperWidthForFlow`); `scripts/related-tiles.mjs` (->
`overflow-scupper-sizing` / `roof-drain-sizing` / `rain-load-ponding` / `weir-flow`); `data/search/aliases.json` (5
collision-checked question aliases: "scupper width", "how wide scupper", ...); the calc-drainage `DRAINAGE_RENDERERS` map
entry via a hand-written renderer (two number fields) and the id added to the calc-drainage declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the example, the round-trip through `computeOverflowScupperSizing` (both forms)
across a flow/head sweep, the more-flow-wider-scupper monotonicity, and the error seams. The calc-drainage.js gzip cap
(9000 B) holds. Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count
1,179 -> 1,180.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 6.0 in suppressed for 118
gpm at a 3.5 in head).

## 5. Roadmap position

Pairs the forward scupper tile (`overflow-scupper-sizing`, flow from the width) with its inverse (the width for a flow),
the two halves of the overflow-scupper question. Continues Explore sweep #12; further Group B drainage growth stays
evidence-driven.
