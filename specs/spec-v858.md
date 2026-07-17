# roughlogic.com Specification v858 -- Freeze-Protection Heat-Trace Cable and Circuit (calc-plumbing.js, Group B, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-plumbing.js`** (Group B),
> no new module, group, or dependency. Inherits spec.md through spec-v857.md. Plumbing / mechanical install-ops sweep.
>
> **The gap, and the evidence for it.** Nothing sizes **heat-trace** for freeze protection -- the cable length with valve
> and support allowances, the wattage, and the circuit current. Grep confirmed no heat-trace tile. The number this
> settles: a 150 ft line with one valve, on a 5 W/ft cable, needs **168 ft** of cable drawing **840 W** -- **7.0 A** at
> 120 V, fine on a 20 A circuit -- but a 400 ft run climbs past a single circuit and has to be split.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group B
mechanical siblings: the pipe length and valve allowance carry `L`, the allowance percent, valve count, wattage per foot,
voltage, and breaker rating are dimensionless coefficients, the cable length is `L`, and the wattage, current, and the ok
flag follow. The v18/v21 contract: a non-finite or non-positive pipe length, wattage per foot, voltage, or breaker rating
returns `{ error }`; a negative allowance, valve count, or valve allowance returns `{ error }`. Citation discipline
(v19/v22): the heat-trace identity by name (cable = pipe x (1 + allowance) + valves x allowance; watts = rated W/ft x
cable; amps = watts / voltage), `GOVERNANCE.general`; the note states that the required W/ft (the pipe heat loss) comes
from `insulation-heat-loss` or the manufacturer and the picked cable must be rated at or above it, that valves, flanges,
and supports are heat sinks that add cable, that a cold start can draw two to three times the steady current on
self-regulating cable, and that the manufacturer's design tables and maximum circuit length govern.

## 2. The tile

### 2.1 `heat-trace-sizing` -- Freeze-Protection Heat-Trace Cable and Circuit

```
inputs:
  pipe_ft        pipe run length (ft)
  allowance_pct  support / spiral allowance (percent, default 10)
  num_valves     valves and flanges (count)
  valve_allow_ft cable allowance per valve (ft, default 3)
  rated_w_per_ft cable rated wattage (W/ft)
  voltage        supply voltage (V, default 120)
  breaker_a      circuit breaker rating (A, default 20)

cable_ft   = pipe_ft * (1 + allowance_pct/100) + num_valves * valve_allow_ft
watts      = rated_w_per_ft * cable_ft
amps       = watts / voltage
breaker_ok = amps <= 0.8 * breaker_a
```

**Pinned worked example.** Pipe 150 ft, 10% allowance, 1 valve at 3 ft, 5 W/ft, 120 V, 20 A breaker:
`cable = 150*1.10 + 1*3 = ` **168 ft**; `watts = 5*168 = ` **840 W**; `amps = 840/120 = ` **7.0 A** (<= 0.8*20 = 16 A,
ok). Cross-check: a 400 ft line is `400*1.10 = 440 ft`, `5*440 = 2,200 W`, `2200/120 = ` **18.3 A** -- over the 16 A
continuous limit, so the run is split across two circuits.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing", "hvac"]`, inside the `// Group B` plumbing block) -- the Group B
citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`B`); a `citations.js` entry (cable = pipe(1+
allow)+valves x allow; amps = watts/voltage, `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the pinned
example plus the long-line split cross-check); `test/fixtures/compute-map.js` (`heat-trace-sizing` ->
`computeHeatTraceSizing`, module `../../calc-plumbing.js`); `scripts/related-tiles.mjs` (-> `insulation-heat-loss` /
`pipe-insulation-takeoff` / `voltage-drop`); `data/search/aliases.json` (5 collision-checked aliases: "heat trace
sizing", "freeze protection heat trace", "heat tape length", "heat trace circuit", "pipe heat trace amps"); a
hand-written renderer in the `PLUMBING_RENDERERS` map mirroring a simple output renderer (non-exported, so no DOM-sentinel
dims row), and the id added to the calc-plumbing declare list in `app.js`; the `// dims:` annotation directly above the
compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the cable length,
watts, amps, the ok flag, and the error seams (non-positive pipe, W/ft, voltage, breaker; negative allowance, valves,
valve allowance). The calc-plumbing.js gzip cap is watched at build. Verify at build, including `check-shells` and
`check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count 1,306 -> 1,307.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group B audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(5 * (150*1.10 + 3) / 120 -> 7.0 A).

## 5. Roadmap position

Plumbing / mechanical install-ops tile fed by `insulation-heat-loss` (the W/ft) and paired with `pipe-insulation-takeoff`,
serving the plumber and mechanical contractor (plumbing / hvac). Stays evidence-driven; the manufacturer's tables govern.
