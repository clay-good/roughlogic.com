# roughlogic.com Specification v854 -- Branch-Circuit Conductor Footage Takeoff (calc-electrical.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-electrical.js`** (Group A;
> at landing may move to a less-full electrical module -- calc-electrical is near its gzip cap), no new module, group, or
> dependency. Inherits spec.md through spec-v853.md. Electrical rough-in sweep, beside `voltage-drop` and
> `wire-pulling-lubricant`.
>
> **The gap, and the evidence for it.** The catalog sizes conductors (`voltage-drop`, `wire-ampacity`) but nothing takes
> off the **footage** of branch-circuit wire to order and how many rolls that is. Grep confirmed no branch-circuit-footage
> tile. The number this settles: 20 circuits at a 45 ft average home run, three conductors each, with 15 ft of box makeup,
> is **3,600 ft** -- **4 thousand-foot rolls** per color -- the rough-in material order.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group A
electrical siblings (`voltage-drop`, `conduit-fill`): the home-run length, makeup, and roll length carry `L`, the circuit
count and conductors-per-circuit are dimensionless, the total footage is `L`, and the roll count is dimensionless. The
v18/v21 contract: a non-finite or non-positive circuit count, home-run length, conductors-per-circuit, or roll length
returns `{ error }`; a negative makeup returns `{ error }`. Citation discipline (v19/v22): the footage takeoff identity by
name (total = circuits x (home run + makeup) x conductors; rolls = ceil(total / roll length)), `GOVERNANCE.general`; the
note states that for individual conductors in conduit each conductor is counted, that for cable (NM / romex) the count is
set to one to tally the cable itself, that the home run is panel-to-first-device and the makeup is the per-box slack
summed, and that wire is bought per color.

## 2. The tile

### 2.1 `branch-circuit-wire-footage` -- Branch-Circuit Conductor Footage Takeoff

```
inputs:
  circuits                number of branch circuits (count)
  avg_homerun_ft          average home-run length (ft)
  makeup_ft               box makeup / slack per circuit (ft, default 15)
  conductors_per_circuit  conductors per circuit (count, default 3)
  roll_ft                 roll / spool length (ft, default 1000)

total_ft = circuits * (avg_homerun_ft + makeup_ft) * conductors_per_circuit
rolls    = ceil(total_ft / roll_ft)
```

**Pinned worked example.** 20 circuits, 45 ft home run, 15 ft makeup, 3 conductors, 1,000 ft rolls:
`total = 20 * (45+15) * 3 = ` **3,600 ft**; `rolls = ceil(3600/1000) = ` **4 per color**. Cross-check: a bigger job of 30
circuits at a 60 ft home run is `30 * (60+15) * 3 = ` **6,750 ft** and **7 rolls** -- the home-run length and circuit count
both scale it, which is why the panel schedule drives the wire order.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`, inside the `// Group A` electrical block near `voltage-drop`)
-- the Group A citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`A`); a `citations.js` entry
(total = circuits x (home run + makeup) x conductors; rolls = ceil(total/roll), `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the larger-job cross-check); `test/fixtures/compute-map.js`
(`branch-circuit-wire-footage` -> `computeBranchCircuitWireFootage`, module `../../calc-electrical.js`);
`scripts/related-tiles.mjs` (-> `voltage-drop` / `wire-pulling-lubricant` / `conduit-fill`); `data/search/aliases.json`
(5 collision-checked aliases: "branch circuit wire footage", "homerun wire takeoff", "rough-in wire footage", "branch
wire rolls", "conductor footage estimate"); a hand-written renderer in the `ELECTRICAL_RENDERERS` map mirroring a simple
output renderer (non-exported, so no DOM-sentinel dims row), and the id added to the calc-electrical declare list in
`app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the total footage, the roll count, and the error seams (non-positive circuits, home
run, conductors, roll length; negative makeup). The calc-electrical.js gzip cap is watched at build (near cap -- may
prompt a module move). Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent
from home first paint. Home tile count 1,302 -> 1,303.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group A audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build
(watch calc-electrical.js -- near cap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output read
to the value (20 * (45+15) * 3 -> 3,600 ft, 4 rolls).

## 5. Roadmap position

Electrical rough-in takeoff beside `voltage-drop` and `wire-pulling-lubricant`, serving the electrician (electrical).
Stays evidence-driven; the panel schedule governs the count.
