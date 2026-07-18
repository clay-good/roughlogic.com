# roughlogic.com Specification v984 -- Fluoride Feed Dose (Available Fluoride Ion) (calc-water.js, Group M, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-water.js`** (Group M),
> no new module, group, or dependency. Inherits spec.md through spec-v983.md. Water-treatment dosing sweep, beside the
> accepted `pounds-formula` and `dechlorination-dose` tiles.
>
> **The gap, and the evidence for it.** The generic `pounds-formula` tile treats a chemical as pure at its purity
> percent, but fluoride dosing needs two corrections it does not make: divide by the AVAILABLE FLUORIDE ION (AFI)
> fraction of the compound, and subtract the raw background fluoride already in the water. Grep confirmed no fluoride /
> AFI dosing tile. The number this settles: net 0.6 mg/L into 2 MGD with 25% fluorosilicic acid is **50.55 lb/day**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, lb/day out of mg/L, MGD, and fractions -- like the
sibling dosing tiles), bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input, a non-positive flow, an AFI or purity outside (0, 1], a negative dose, or a target at or below the
raw background (no feed needed) returns `{ error }`. The 8.34 lb/(mg/L*MG) factor is shared with the other pounds-
formula tiles and the cross-module 8.34 guard. Citation discipline (v19/v22): the water-fluoridation available-
fluoride-ion pounds formula by name (CDC Water Fluoridation / AWWA), `GOVERNANCE.general`; the note gives the AFI
constants, the US PHS 0.7 mg/L target, and stresses that the daily lab checks, the SDWA maximum, the product assay,
and the state fluoridation program govern.

## 2. The tile

### 2.1 `fluoride-feed-dose` -- Fluoride Feed Dose (Available Fluoride Ion)

```
inputs:
  target_dose_mg_l    target finished fluoride (mg/L), default 0.7
  raw_fluoride_mg_l   raw background fluoride (mg/L), default 0.1
  flow_mgd            plant flow (MGD), default 2
  afi_fraction        available fluoride ion (0-1): FSA 0.792, NaF 0.452, Na2SiF6 0.607, default 0.792
  purity_fraction     commercial purity / solution strength (0-1), default 0.25

net_dose             = target_dose_mg_l - raw_fluoride_mg_l   (must be > 0)
pure_fluoride_lb_day = net_dose x flow_mgd x 8.34
feed_lb_day          = pure_fluoride_lb_day / (afi_fraction x purity_fraction)
```

**Pinned worked example.** Net 0.6 mg/L (0.7 target - 0.1 raw), 2 MGD, 25% fluorosilicic acid (AFI 0.792):
`pure = 0.6 x 2 x 8.34 = 10.0 lb/day` fluoride ion; `feed = 10.008 / (0.792 x 0.25) = ` **50.55 lb/day** of acid.
Cross-check: dry sodium fluoride (AFI 0.452) at 98% purity, 1 MGD: `feed = 0.6 x 1 x 8.34 / (0.452 x 0.98) = ` **11.30
lb/day**.

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["water"]`, beside `float-method-flow`); a `tile-meta.js` `_TILES` entry
(`M`); a `citations.js` entry (CDC / AWWA available-fluoride-ion pounds formula, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the fluorosilicic-acid base plus the dry-NaF cross-check, pinning feed_lb_day and
pure_fluoride_lb_day); `test/fixtures/compute-map.js` (`fluoride-feed-dose` -> `computeFluorideFeedDose`, module
`../../calc-water.js`); `scripts/related-tiles.mjs` (-> `pounds-formula` / `coagulant-dose` / `chlorine-demand`);
`data/search/aliases.json` (5 collision-checked aliases: "fluoride feed", "fluoridation dose", "fluoride dosage",
"water fluoridation", "fluorosilicic acid feed"), then `node scripts/build-alias-shards.mjs`; a hand-written renderer in
the `WATER_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id added to the calc-water declare list
in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning both examples, the AFI / purity / raw-background monotonic
directions, and the error seams. The calc-water.js gzip cap and the Group M group shell are watched at build (cap
raised for this tile). Home tile count 1,432 -> 1,433.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(net 0.6 / 2 MGD / 0.792 / 0.25 -> 50.55 lb/day).

## 5. Roadmap position

Water-treatment dosing beside `pounds-formula`, serving the water-treatment operator (water). Deliberately the
feed-setpoint aid; the daily fluoride lab results, the SDWA MCL, the exact product assay and specific gravity, and the
state fluoridation program govern the real feed. Stays evidence-driven. Continues the water-treatment dosing sweep at
1 new spec (v984).
