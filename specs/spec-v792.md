# roughlogic.com Specification v792 -- Compressor Theoretical Displacement (calc-refrigerant.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-refrigerant.js`** (Group
> C), no new module, group, or dependency. Inherits spec.md through spec-v791.md. Explore sweep #22 (entry 2).
>
> **The gap, and the evidence for it.** The catalog's own `refrigerant-mass-flow` tile ends its note with "it does not
> compute the compressor displacement, the volumetric efficiency" -- the catalog names this gap explicitly. The swept
> (theoretical) displacement of a reciprocating compressor is pure geometry: `displacement = (pi/4) x bore^2 x stroke x
> cylinders x RPM`, divided by 1728 for CFM. The number this settles: a **2.0"** bore, **1.5"** stroke, **4-cylinder**
> compressor at **1750 RPM** sweeps **18.85 in^3/rev**, **19.1 CFM** at 100% volumetric efficiency. Grep confirmed no
> compressor-displacement / swept-volume / pumping-capacity tile exists.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group C
refrigeration siblings (`refrigerant-mass-flow`, `evaporator-td-dtd`): the bore and stroke carry `L`, the cylinder count
is dimensionless, the speed carries `T^-1` (per minute), the per-rev displacement carries `L^3`, and the CFM carries `L^3
T^-1`. The v18/v21 contract: a non-finite input (via `_finiteGuard`), a non-positive bore, stroke, or speed, or a
cylinder count below 1 returns `{ error }`. Citation discipline (v19/v22): reciprocating compressor theoretical
displacement by name (ASHRAE Refrigeration; positive-displacement swept-volume geometry), `GOVERNANCE.general` matching
the siblings; the note states that this is the 100%-volumetric-efficiency ceiling, that the actual delivered volume is
this times the volumetric efficiency (which falls with compression ratio, leakage, and suction superheat), and that the
swept-volume form applies to reciprocating machines only (scroll, screw, and rotary differ).

## 2. The tile

### 2.1 `compressor-displacement` -- Compressor Theoretical Displacement

```
inputs:
  bore_in      cylinder bore (in)
  stroke_in    piston stroke (in)
  cylinders    number of cylinders (>= 1)
  rpm          speed (RPM)

displacement_cid_per_rev = (pi/4) x bore^2 x stroke x cylinders
displacement_cfm         = displacement_cid_per_rev x rpm / 1728
```

**Pinned worked example.** Bore 2.0", stroke 1.5", 4 cylinders, 1750 RPM: `per_rev = (pi/4) x 2^2 x 1.5 x 4 = ` **18.85
in^3/rev**; `cfm = 18.85 x 1750 / 1728 = ` **19.09 CFM** at 100% VE. Bore enters squared (double the bore quadruples the
displacement); speed scales it linearly. The actual delivered volume is this times the volumetric efficiency.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac", "refrigeration"]`) beside `product-pull-down-load` (Group C rows are
spec-interleaved and carry an explicit `group:` field); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (ASHRAE
Refrigeration, `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the pinned example, two pinned outputs);
`test/fixtures/compute-map.js` (`compressor-displacement` -> `computeCompressorDisplacement`);
`scripts/related-tiles.mjs` (-> `refrigerant-mass-flow` / `recovery-cylinder` / `evaporator-td-dtd`);
`data/search/aliases.json` (5 collision-checked aliases: "compressor displacement", "swept volume of a compressor",
"reciprocating compressor pumping capacity", ...); the calc-refrigerant `REFRIGERANT_RENDERERS` map entry via a
hand-written renderer (non-exported, so no DOM-sentinel row) and the id added to the calc-refrigerant declare list in
`app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the swept volume, the CFM, the bore-squared / RPM-linear scaling, and the error
seams. The calc-refrigerant.js gzip cap is unchanged (the addition fits under the current cap). Verify at build,
including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,240 -> 1,241.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (2.0" x 1.5" x 4 at 1750 RPM -> 19.1 CFM).

## 5. Roadmap position

Fills the compressor-displacement gap the `refrigerant-mass-flow` tile names, completing the compressor side of the
refrigeration cycle bench. Continues Explore sweep #22 (an aviation cluster -- glidepath descent rate, coordinated-turn
radius, climb-gradient rate of climb -- is queued next and may justify a small `calc-flightops.js` module). A
volumetric-efficiency-from-compression-ratio tile is the natural companion; it stays evidence-driven.
