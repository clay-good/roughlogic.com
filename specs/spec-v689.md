# roughlogic.com Specification v689 -- Hydraulic Flow Limit from Drive Power (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`** (Group K,
> mechanic / hydraulics), no new module, group, or dependency. Inherits spec.md through spec-v688.md.
>
> **The gap, and the evidence for it.** Spec-v396 (`hydraulic-pump-horsepower`) runs the fluid-power relation forward:
> given a flow and pressure, it returns the drive horsepower. The system-matching question a hydraulics tech asks is the
> inverse -- **how much flow can my power unit deliver at this pressure for the drive horsepower it has**. The forward
> tile makes you guess flows and re-read the HP against the motor; the inverse solves it directly. From
> `drive_hp = (gpm x psi / 1714) / efficiency`, `gpm = 1714 x drive_hp x efficiency / psi`. The number this settles: a
> **13.7 HP** drive at **2,000 psi** and 0.85 efficiency moves **10 GPM**; raise the pressure to **3,000 psi** and the
> same motor moves only **6.7 GPM** -- flow trades directly against pressure at a fixed power, the constant-horsepower
> curve a pressure-compensated pump rides.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`hydraulic-pump-horsepower` sibling: the drive power is `M L^2 T^-3` (HP), the pressure is `M L^-1 T^-2` (psi), the
efficiency is `dimensionless`, and the returned flow is `L^3 T^-1` (gpm). It reuses the sibling's `1714` psi-gpm-to-HP
constant. The v18/v21 contract: any non-finite input, a non-positive drive HP or pressure, or an efficiency outside
(0, 1] returns `{ error }`. Citation discipline (v19/v22): the fluid-power horsepower relation solved for flow, by name
and `GOVERNANCE.general` matching the sibling; the note states that **flow trades inversely against pressure at fixed
power (the constant-horsepower curve), the overall efficiency is the fraction of drive power that reaches the fluid, and
this is the power ceiling (the pump displacement and rpm set the actual flow, so treat it as the maximum the motor can
support) -- the pump and motor manufacturer data govern**.

## 2. The tile

### 2.1 `hydraulic-drive-flow-limit` -- Hydraulic Flow Limit from Drive Power

```
inputs:
  drive_hp     HP    available drive horsepower (> 0)
  psi          psi   working pressure (> 0)
  efficiency   -     overall pump efficiency (0-1, default 0.85)

fluid_hp = drive_hp x efficiency
max_gpm = 1714 x fluid_hp / psi = 1714 x drive_hp x efficiency / psi   [gpm]
```

**Pinned worked example (a 13.7 HP drive).** drive_hp = 13.73, psi = 2,000, efficiency = 0.85:
`fluid_hp = 13.73 x 0.85 = 11.67`, `max_gpm = 1714 x 11.67 / 2000 = ` **10 GPM**; feeding 10 GPM at 2,000 psi through
`hydraulic-pump-horsepower` returns 13.73 drive HP, the input. **Cross-check (higher pressure).** Same drive at 3,000
psi: `max_gpm = 1714 x 11.67 / 3000 = ` **6.7 GPM** -- the higher pressure leaves less power for flow, so the same motor
moves a third less.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic", "hydraulics"]`, beside `hydraulic-pump-horsepower`, which sits in
the spec-v396 fluid-power section OUTSIDE the exact-12 `// Group K: Mechanic`..`// Group L` audit block, so no count
bump); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (fluid-power relation solved for flow, `GOVERNANCE.general`
matching the sibling, the note per §1); `test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js`
(`hydraulic-drive-flow-limit` -> `computeHydraulicDriveFlowLimit` in `../../calc-mechanic.js`);
`scripts/related-tiles.mjs` (-> `hydraulic-pump-horsepower` / `hydraulic-pump-flow` / `hydraulic-motor-torque-speed` /
`hydraulic-cylinder`, and the forward tile links back); `data/search/aliases.json` ("hydraulic flow from horsepower",
"max gpm for a drive motor", "how much gpm can my motor drive", plus adjacent rows);
`MECHANIC_RENDERERS["hydraulic-drive-flow-limit"]` via the module's `_simpleRenderer` factory (mirroring
`hydraulic-pump-horsepower`) and the id added to the calc-mechanic declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block
pinning both examples, the pressure-halves-flow trade, the round-trip through `computeHydraulicPumpHorsepower`, and the
error seams. The calc-mechanic.js gzip cap is expected to hold (verify at build, including `check-shells`). Lazy-loaded,
absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes); `npm test` (+2 fixtures, the new
fuzzer block); `npm run build` (one new shell, regenerated sitemap); `node scripts/check-shells.mjs` and
`check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`; worked-examples runner; 320 px audit; render +
output read to the value (the pinned example -> 10 GPM for a 13.7 HP drive at 2,000 psi).

## 5. Roadmap position

Pairs the forward hydraulic tile (`hydraulic-pump-horsepower`, HP from flow) with its inverse (flow from drive power),
the two halves of the power-unit matching question. Further Group K growth stays evidence-driven.
