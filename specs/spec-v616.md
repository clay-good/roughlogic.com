# roughlogic.com Specification v616 -- Beam Clamp Reaction and Side-Pull Check (calc-rigging.js, Group Z, 1 New Tile)

> **Status: PROPOSED (2026-07-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-rigging.js`**
> (Group Z, rigging and heavy lift); no new module, group, or dependency. Inherits spec.md through spec-v615.md.
>
> **The gap, and the evidence for it.** Spec-v544 (`bridle-leg-tension`) names this tile as a deliberate follow-on:
> "a beam-clamp / horizontal-reaction capacity check." The bridle tiles hand back each leg's tension and warn that a
> shallow bridle "drives a large horizontal pull into the beams" -- but nothing in the bench turns that leg tension
> into the check the rigger actually has to make at the steel: **the clamp's working load limit is a vertical
> rating, and a bridle leg never pulls straight down.** The statics are one resolution -- `V = T sin(angle)`,
> `H = T cos(angle)` -- and the check compares each component against what the attachment is actually rated for
> (the manufacturer's vertical WLL, and a side-pull rating that for most beam clamps is **zero** unless the
> documentation says otherwise). The number that surprises people: the steep 860 lb leg of the v544 example puts
> only 769 lb of its pull into the clamp vertically but drags it sideways with 385 lb -- 77% of a generous 500 lb
> side-pull allowance while the vertical rating loafs at 38%. The side pull governs, and on an unrated clamp the
> correct answer is re-rig, not "it holds."

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The leg tension, the
vertical / horizontal / resultant components, and the capacities are forces (`M L T^-2`, lb); the leg angle and the
pull angle from vertical (degrees) and the utilization percentages are `dimensionless`. The v18/v21 contract: any
non-finite input, a non-positive tension, a leg angle outside `(0, 90]` degrees above horizontal, a non-positive
vertical capacity, or a negative side-pull capacity returns `{ error }` (a side-pull capacity of 0 is valid and
means "not rated for side pull" -- the manufacturer default). Citation discipline (v19/v22): `GOVERNANCE.rigging`
over the resolution and the rating practice by name (static force resolution; ASME B30.20 / beam-clamp manufacturer
practice: the WLL is a vertical rating and side pull is prohibited unless the manufacturer rates it);
`editionNote` prints `V = T sin(angle)`, `H = T cos(angle)`, the utilizations `V / V_WLL` and `H / H_allow`, and
states that **most beam clamps carry no side-pull rating at all -- when a horizontal component lands on an unrated
clamp the answer is to re-rig (spot the attachment over the load, or use a trolley or spanner beam), not to accept
the number -- and the hardware ratings and a qualified rigger govern** -- a design aid, not a rigging sign-off.

## 2. The tile

### 2.1 `beam-clamp-side-pull` -- What a Bridle Leg Actually Does to the Clamp

```
inputs:
  leg_tension_lb    lb    tension in the leg landing on the clamp (from bridle-leg-tension / three-point-bridle)
  leg_angle_deg     deg   leg angle above horizontal, in (0, 90] (90 = straight vertical hang)
  vertical_wll_lb   lb    the clamp's rated vertical working load limit
  side_pull_lb      lb    the manufacturer's side-pull allowance (0 = not rated, the default)

vertical_lb        = T x sin(angle)                        [lb]
horizontal_lb      = T x cos(angle)                        [lb]
pull_from_vertical = atan2(H, V)                           [deg]
vertical_util_pct  = V / vertical_wll_lb x 100             [%]
horizontal_util_pct = side_pull_lb > 0 ? H / side_pull_lb x 100 : (flagged, no rating)   [%]
```

**Pinned worked example (the steep leg of the v544 bridle).** The 860.23 lb leg at 63.43 degrees on a clamp rated
2,000 lb vertical with a 500 lb documented side-pull allowance: `V = ` **769.4 lb** (38.5% of the WLL) but
`H = ` **384.7 lb** -- **76.9%** of the side-pull allowance, pulling 26.6 degrees off vertical. The side pull
governs at twice the vertical utilization. **Cross-check (the shallow leg on an unrated clamp).** The 1,444 lb
shallow leg at 22.62 degrees (run 12, rise 5) on a 4,000 lb clamp with no side-pull rating: `V = ` **555.4 lb**
(13.9%) and `H = ` **1,332.9 lb** with nowhere to put it -- the tile returns the components and the re-rig flag
instead of a pass. A straight vertical hang (90 degrees) puts the full tension into `V` with `H = 0` and passes on
the vertical rating alone.

## 3. Wiring

A `tools-data.js` row (group `Z`, trades `["rigging", "stage"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.rigging`, `editionNote` per §1); `test/fixtures/worked-examples.json` (both examples);
`test/fixtures/compute-map.js` (`beam-clamp-side-pull` -> `computeBeamClampSidePull` in `../../calc-rigging.js`);
`scripts/related-tiles.mjs` (-> `bridle-leg-tension` / `three-point-bridle` / `shackle-eyebolt-wll`);
`data/search/aliases.json` ("beam clamp", "side pull", "beam clamp side pull", "clamp side load", "horizontal beam
reaction", plus question rows); `RIGGING_RENDERERS["beam-clamp-side-pull"]` appended at the file end and the id
added to the rigging declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated
v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the vertical-hang limit (90 deg ->
H = 0), the Pythagorean resultant, and the error seams (non-finite, non-positive tension / vertical WLL, angle out
of (0, 90], negative side-pull rating). Hand-writes its renderer with the module's `makeNumber` / `makeOutputLine`
/ `attachExampleButton` / `debounce` / `fmt` helpers; the side-pull field defaults to 0 (not rated). The
calc-rigging.js gzip cap was raised to 24000 at spec-v615 and holds this tile without a further raise (verify at
build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2
fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the steep-leg example -> 769.4 lb / 384.7
lb, side pull governing).

## 5. Roadmap position

Closes the last v544-named follow-on: `bridle-leg-tension` and `three-point-bridle` produce the leg tensions, and
this tile lands them on the steel against the ratings that actually apply, beside `shackle-eyebolt-wll` (the
hardware-WLL angular derate). No further bridle follow-on is named; further Group Z growth stays evidence-driven.
