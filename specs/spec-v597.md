# roughlogic.com Specification v597 -- Vacuum Gauge to Drafting Lift Readout (calc-fire.js, Group F, 1 New Tile)

> **Status: PROPOSED (2026-07-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-fire.js`**
> (Group F, the fire-ground engineering bench); no new module, group, or dependency. Inherits spec.md through
> spec-v596.md.
>
> **The gap, and the evidence for it.** Spec-v579 (`draft-lift-max`) names this tile as a deliberate follow-on:
> "a vacuum-gauge-to-lift readout (in Hg to feet)." The maximum-lift tile tells the pump operator the *ceiling* before
> the draft is set up; this tile reads the *actual* number off the compound (vacuum) gauge on the pump intake once
> water is moving, and tells the operator how close to that ceiling the pump is running. The conversion is the standard
> fire-pump relation the sibling already cites: **1 inch of mercury of vacuum is about 1.13 feet** of total suction
> head (lift plus suction-hose friction). A gauge reading of 10 in Hg is 11.3 ft of head; against the roughly 22.6 ft
> a good pump can attain at sea level, that is only half the ceiling with 11 ft of margin. But the same 10 in Hg at a
> 3,000 ft mountain lake, where the atmosphere pushes less, is a much larger share of a lower ceiling -- and a reading
> creeping toward 18 to 20 in Hg is the pump about to lose its prime and cavitate. The tile turns the gauge needle into
> feet and a margin so the operator throttles before the draft breaks, instead of after.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The site elevation and
the suction head / lift are `L` (ft); the vacuum reading is a pressure carried `dimensionless` (in Hg, an instrument
reading, like the other fire-bench gauge inputs), and the pump condition factor and percentages are `dimensionless`.
The v18/v21 contract: any non-finite input, a negative vacuum reading or elevation, or a pump factor outside 0 to 1
returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the vacuum-to-lift conversion by name
(IFSTA / NWCG fire-pump drafting practice, matching the `draft-lift-max` sibling); `editionNote` prints
`suction_head_ft = vacuum_inhg x 1.13`, `theoretical_ceiling_ft = 33.9 - elevation/1000`,
`attainable_ceiling_ft = factor x theoretical` (factor about 2/3), and `margin_ft = attainable - suction_head`, and
states that **the gauge at steady flow reads the lift plus the suction-hose friction (so the readout is total suction
head, not pure lift), a reading approaching the attainable ceiling means the pump is about to lose prime and cavitate,
lift is limited by the atmosphere pushing water up the hose (a bigger pump does not raise the ceiling), and the pump
operator and incident command govern** -- a readout aid, not incident command.

## 2. The tile

### 2.1 `vacuum-lift-reading` -- Compound-Gauge Vacuum to Feet of Suction Head

```
inputs:
  vacuum_inhg        in Hg   compound (vacuum) gauge reading at the pump intake
  site_elevation_ft  ft      elevation of the draft site (default 0)
  pump_factor        0-1     pump condition factor for the ceiling (default 0.667)

suction_head_ft        = vacuum_inhg x 1.13                       [ft]
theoretical_ceiling_ft = 33.9 - site_elevation_ft / 1000          [ft]
attainable_ceiling_ft  = pump_factor x theoretical_ceiling_ft     [ft]
margin_ft              = attainable_ceiling_ft - suction_head_ft   [ft]
pct_of_attainable      = suction_head_ft / attainable_ceiling_ft x 100   [%]
```

**Pinned worked example (10 in Hg on the gauge, sea level, default pump factor).**
`head = 10 x 1.13 = ` **11.3 ft** of suction head. `theoretical = 33.9 ft`, `attainable = 0.667 x 33.9 = ` **22.6
ft**, so the pump is at `11.3 / 22.6 = ` **50%** of its ceiling with **11.3 ft** of margin -- a comfortable draft.
**Cross-check (18 in Hg at a 3,000 ft mountain lake).** `head = 18 x 1.13 = 20.3 ft`, `theoretical = 30.9 ft`,
`attainable = 0.667 x 30.9 = 20.6 ft`, so the pump is at **98%** of its attainable ceiling with only **0.2 ft** of
margin -- the needle is warning the operator the draft is on the edge of breaking, and the fix is to resite the pump
lower, not to throttle up. Both confirm the reading is only useful against the altitude-corrected ceiling, which is
why the tile carries elevation.

## 3. Wiring

A `tools-data.js` row (group `F`, trades `["fire"]`, placed inside the Group F comment block after `draft-lift-max` --
the `citations.test.js` **Group F audit count bumps 31 -> 32**); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (both examples);
`test/fixtures/compute-map.js` (`vacuum-lift-reading` -> `computeVacuumLiftReading` in `../../calc-fire.js`);
`scripts/related-tiles.mjs` (-> `draft-lift-max` / `relay-pump-distance` / `pump-tdh`); `data/search/aliases.json`
("vacuum gauge lift", "in hg to feet", "drafting vacuum reading", "compound gauge feet", "suction lift gauge", plus
question rows); the id appended to the calc-fire declare list in `app.js`; the `// dims:` annotation directly above
the compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the linear
conversion, the altitude effect, and the error seams (non-finite, negative vacuum / elevation, factor out of 0-1).
Renderer hand-written mirroring the `draft-lift-max` pattern (`makeNumber` / `makeOutputLine`). Lazy-loaded, absent
from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2
fixtures, the new fuzzer block, the Group F audit count bump); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value (the 10 in Hg example
-> 11.3 ft / 50% of ceiling).

## 5. Roadmap position

Completes the drafting pair spec-v579 opened: `draft-lift-max` sets the ceiling, this tile reads the gauge against it.
The v579-named maximum-flow-at-a-given-lift companion remains a deliberate future follow-on. Further Group F growth
stays evidence-driven.
