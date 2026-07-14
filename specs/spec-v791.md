# roughlogic.com Specification v791 -- Engine BMEP (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`** (Group K),
> no new module, group, or dependency. Inherits spec.md through spec-v790.md. Explore sweep #22 (entry 1).
>
> **The gap, and the evidence for it.** Engine builders and tuners compare engines of different sizes with **brake mean
> effective pressure** -- torque normalized by displacement -- and no tile does it, though the catalog holds torque, HP,
> displacement, and volumetric-efficiency tiles that never take this step. `BMEP(psi) = 150.8 x torque(lb-ft) /
> displacement(CID)` for a 4-stroke. The number this settles: a **350 CID** V8 at **400 lb-ft** runs **172 psi**, right
> in the healthy naturally-aspirated gasoline range. Grep confirmed no BMEP / mean-effective-pressure tile exists.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group K
mechanic siblings (`displacement-cr`, `volumetric-efficiency`, `hp-from-torque`): the torque carries `M L^2 T^-2`, the
displacement carries `L^3`, the cycle type is dimensionless, and the BMEP carries `M L^-1 T^-2` (pressure). The v18/v21
contract: a non-finite input (via `_finiteGuard`), an unknown cycle type, or a non-positive torque or displacement
returns `{ error }`. Citation discipline (v19/v22): brake mean effective pressure by name (SAE; Heywood, *Internal
Combustion Engine Fundamentals*), `GOVERNANCE.general` matching the siblings; the note derives the factor from `BMEP =
2*pi*n_rev*T/V_d` (150.8 for a 4-stroke where n_rev = 2, 75.4 for a 2-stroke where n_rev = 1), states that BMEP is
evaluated at the torque peak, that naturally-aspirated gasoline tops out near 180-190 psi so a higher value signals
boost, and that a corrected dyno torque should be used.

## 2. The tile

### 2.1 `engine-bmep` -- Engine BMEP (Brake Mean Effective Pressure)

```
inputs:
  torque_lb_ft       peak torque (lb-ft)
  displacement_cid   engine displacement (cubic inches)
  cycle_type         four_stroke (150.8) | two_stroke (75.4)

factor = { four_stroke: 150.796, two_stroke: 75.398 }[cycle_type]
bmep_psi = factor x torque_lb_ft / displacement_cid
```

**Derivation.** From `Power = 2*pi*N*T` and `Power = BMEP x V_d x (N / n_rev)`, `BMEP = 2*pi*n_rev*T/V_d`. With torque in
lb-in (= lb-ft x 12) and displacement in cubic inches, the constant is `2*pi*n_rev*12`: `4*pi*12 = 150.8` for a 4-stroke
(n_rev = 2), `2*pi*12 = 75.4` for a 2-stroke (n_rev = 1).

**Pinned worked example.** 350 CID, 400 lb-ft, 4-stroke: `bmep = 150.8 x 400 / 350 = ` **172.3 psi** (about 11.9 bar), a
strong naturally-aspirated gasoline value. The same engine as a 2-stroke would read half (86.2 psi); more torque raises
BMEP, more displacement lowers it.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`) beside `sacrificial-anode-life` (Group K rows are
spec-interleaved and carry an explicit `group:` field); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (SAE /
Heywood, `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js`
(`engine-bmep` -> `computeEngineBmep`); `scripts/related-tiles.mjs` (-> `displacement-cr` / `volumetric-efficiency` /
`hp-from-torque`); `data/search/aliases.json` (5 collision-checked aliases: "brake mean effective pressure", "bmep from
torque and displacement", ...); the calc-mechanic `MECHANIC_RENDERERS` map entry via the `_simpleRenderer` factory
(non-exported, so no DOM-sentinel row) with a cycle select, and the id added to the calc-mechanic declare list in
`app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the 4-stroke / 2-stroke factors, the monotonicity, and the error seams. The
calc-mechanic.js gzip cap is unchanged (the addition fits under the current cap). Verify at build, including
`check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,239 -> 1,240.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (350 CID, 400 lb-ft -> 172 psi).

## 5. Roadmap position

Adds the size-normalized engine-comparison metric -- BMEP -- to the mechanic bench, beside the torque, HP, and
displacement tiles. Opens Explore sweep #22 (a compressor theoretical-displacement tile and an aviation cluster --
glidepath descent rate, coordinated-turn radius, climb-gradient rate of climb -- are queued next; the aviation cluster
may justify a small `calc-flightops.js` module). Stays evidence-driven.
