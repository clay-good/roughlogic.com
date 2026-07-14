# roughlogic.com Specification v704 -- Septic Tank Size for a Target Pump-Out Interval (calc-septic.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-septic.js`** (Group B,
> plumbing / onsite wastewater), no new module, group, or dependency. Inherits spec.md through spec-v703.md.
>
> **The gap, and the evidence for it.** The `septic-pumpout-interval` tile runs the accumulation math forward: from a tank
> volume, household size, and a per-capita sludge/scum rate it returns the years between pump-outs. The planning question
> is the inverse -- **how big a tank do I need so the household only pumps every N years**. From
> `years = (tank x fill) / (people x accum)`, the inverse is `tank = target_years x people x accum / fill`. The number
> this settles: a **4-person** home at **30 gal/person/yr** wanting a **5-year** interval (1/3 fill) needs a **~1,820 gal**
> working volume. This sizing basis (by desired interval) is distinct from the existing `septic-tank` tile, which sizes by
> daily flow (2x flow, 1,000 gal floor).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`septic-pumpout-interval` sibling: the tank and working volumes are `L^3` (gal), and the years, occupants, accumulation
rate, and fill fraction are dimensionless. The v18/v21 contract: any non-finite input, a non-positive target interval,
occupants, or accumulation rate, or a fill fraction outside (0, 1) returns `{ error }`. Citation discipline (v19/v22):
the accumulation-interval relation solved for the tank, `GOVERNANCE.plumbing` matching the sibling, citing the EPA OWTS
Manual and extension pumping-frequency guidance; the note states that **this is a planning estimate, that a garbage
disposal roughly doubles the accumulation rate, that the state minimum tank size by bedroom count usually governs the
actual tank, and that a sludge-judge measurement, not a calendar, governs the pumping call**.

## 2. The tile

### 2.1 `septic-tank-for-interval` -- Septic Tank Size for a Target Pump-Out Interval

```
inputs:
  target_years      dimensionless   desired years between pump-outs (> 0)
  people            dimensionless   household occupants (> 0)
  accum_gal_pp_yr   dimensionless   per-capita sludge+scum accumulation (> 0, default 30)
  fill_fraction     dimensionless   fill fraction before pumping (0 to 1, default 0.33)

annual_accum_gal = people x accum_gal_pp_yr
working_gal      = target_years x annual_accum_gal
tank_gal         = working_gal / fill_fraction
```

**Pinned worked example.** 5 years, 4 people, 30 gal/person/yr, 1/3 fill:
`annual = 120 gal/yr`, `working = 5 x 120 = 600 gal`, `tank = 600 / 0.33 = ` **1,818 gal**; feeding a 1,818 gal tank
(same people/accum/fill) back through `septic-pumpout-interval` returns 5 years, the input. Doubling the accumulation
(a garbage disposal) or the occupancy halves the interval for the same tank, so the required tank scales up in step.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing"]`) placed beside `septic-pumpout-interval` (Group B is un-audited);
a `tile-meta.js` `_TILES` entry; a `citations.js` entry (interval relation solved for the tank, `GOVERNANCE.plumbing`
matching the sibling); `test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js`
(`septic-tank-for-interval` -> `computeSepticTankForInterval`); `scripts/related-tiles.mjs` (-> `septic-pumpout-interval`
/ `septic-tank` / `septic-drainfield-capacity`); `data/search/aliases.json` (5 collision-checked question aliases: "how
big a septic tank to pump every 5 years", "size septic tank by pumping frequency", ...); the calc-septic `RENDERERS` map
entry via a hand-written renderer (four number fields, no banner -- matching the pump-out-interval sibling) and the id
added to the calc-septic declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14
corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the round-trip through
`computeSepticPumpoutInterval` across a years/people/fill sweep, the more-people-bigger-tank monotonicity, and the error
seams. The calc-septic.js gzip cap is raised 7000 -> 8000 B (this is the module's second inverse tile this session; ~6.5
KB gz, ~19% headroom restored). Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint.
Home tile count 1,152 -> 1,153.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes and check-readme-counts); `npm test`
(+1 fixture, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `node scripts/check-shells.mjs`
and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`; worked-examples runner; 320 px audit;
render + output read to the value (the pinned example -> 1,818 gal for a 5-year interval, 4 people).

## 5. Roadmap position

Pairs the forward interval tile (`septic-pumpout-interval`, years from a tank) with its inverse (tank from a target
interval), the two halves of the pumping-frequency question, and complements the flow-based `septic-tank` sizing. Further
Group B onsite-wastewater growth stays evidence-driven.
