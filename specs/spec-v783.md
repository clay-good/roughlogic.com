# roughlogic.com Specification v783 -- Battery Reserve Capacity to Amp-Hours (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`** (Group K),
> no new module, group, or dependency. Inherits spec.md through spec-v782.md. Explore sweep #20 (entry 3).
>
> **The gap, and the evidence for it.** Auto, marine, and RV techs read a battery's **reserve capacity (RC)** off the
> label and need the amp-hours behind it to compare batteries and size a bank. RC is a fixed-definition rating: the
> minutes a fully charged 12 V battery at 80 F sustains a **25 A** draw before terminal voltage falls to **10.5 V** (BCI /
> SAE J537). The amp-hours at that reserve rate are `25 x RC/60`. No tile does the conversion. The number this settles: an
> RC of **120 minutes** is **50 Ah**. Grep confirmed no reserve-capacity or amp-hours tile exists.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group K
mechanic siblings (`abyc-dc-wire`, `fuel-range`): reserve capacity carries `T` (time), the amp-hours carry `I T`
(charge). The v18/v21 contract: a non-finite input (via `_finiteGuard`) or a non-positive reserve capacity returns
`{ error }`. Citation discipline (v19/v22): BCI / SAE J537 reserve capacity by name, `GOVERNANCE.general` matching the
siblings; the note fixes the rating basis (25 A to 10.5 V at 80 F on a 12 V battery), states that the RC-rate amp-hours
are smaller than the 20-hour-rate amp-hours on a deep-cycle label because a higher discharge current delivers less
capacity (Peukert's effect) so the two are not interchangeable, and that cold reduces the available capacity further.

## 2. The tile

### 2.1 `reserve-capacity-amp-hours` -- Battery Reserve Capacity to Amp-Hours

```
inputs:
  rc_minutes   reserve capacity (minutes, from the battery label)

amp_hours = 25 x rc_minutes / 60
```

**Pinned worked example.** RC = 120 minutes: `amp_hours = 25 x 120/60 = ` **50.0 Ah** at the 25 A reserve rate. The
conversion is linear in RC, so 240 minutes is 100 Ah and 60 minutes is 25 Ah.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`) placed with the mechanic tiles beside `cutting-fluid-
concentration` (spec-interleaved, not under the v4 `// Group K` seed block); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (BCI / SAE J537, `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`reserve-capacity-amp-hours` -> `computeReserveCapacityAmpHours`);
`scripts/related-tiles.mjs` (-> `standby-battery-sizing` / `fuel-range` / `abyc-dc-wire`); `data/search/aliases.json`
(5 collision-checked aliases: "reserve capacity to amp hours", "battery reserve capacity", "sae j537 reserve
capacity", ...); the calc-mechanic `MECHANIC_RENDERERS` map entry via the `_simpleRenderer` factory (non-exported, so no
DOM-sentinel row) and the id added to the calc-mechanic declare list in `app.js`; the `// dims:` annotation directly
above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the
example, the linear monotonicity, and the error seams. The calc-mechanic.js gzip cap is unchanged (the addition fits
under the current cap). Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile
count 1,231 -> 1,232.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (RC 120 min -> 50.0 Ah).

## 5. Roadmap position

Adds the battery-spec conversion every auto/marine/RV tech runs off the label -- reserve capacity to amp-hours --
alongside the existing charging, wiring, and fuel-range mechanic tiles. Continues the post-inverse forward-coverage vein
(Explore sweep #20). A CCA-to-CA / cranking-amps comparison and a bank-sizing-from-load-and-days-of-autonomy tile are the
natural next battery additions; they stay evidence-driven.
