# roughlogic.com Specification v761 -- COP Implied by the Heat of Rejection (calc-refrigerant.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-refrigerant.js`** (Group
> C), no new module, group, or dependency. Inherits spec.md through spec-v760.md. Explore sweep #15 (entry 5).
>
> **The gap, and the evidence for it.** The `condenser-heat-rejection` tile runs the energy balance forward: from a COP it
> returns the total heat of rejection. The commissioning question is the inverse -- **the COP implied by a measured or
> rated heat of rejection** and the evaporator capacity. From `THR = Q_evap (1 + 1/COP)`,
> `COP = Q_evap / (THR - Q_evap)`. The number this settles: a system absorbing **60,000 Btu/h** and rejecting **100,000**
> runs a **COP of 1.5**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`condenser-heat-rejection` sibling: the evaporator capacity, target heat of rejection, and compressor work are
`M L^2 T^-3` (Btu/h or tons via the unit select), the unit flag is dimensionless, and the returned COP and factor are
dimensionless. It reuses the sibling's THR energy balance, solved for the COP. The v18/v21 contract: any non-finite input,
a non-positive evaporator capacity or heat of rejection, or a **heat of rejection not exceeding the evaporator capacity**
(the compressor work must add heat) returns `{ error }`. Citation discipline (v19/v22): the balance solved for the COP,
`GOVERNANCE.general` matching the sibling; the note explains that a **low COP gives a large heat-rejection factor**
(THR/Q_evap), that a struggling system overloads its own condenser, and that **hermetic-motor heat** inflates the measured
THR and lowers the apparent COP with the rated data governing.

## 2. The tile

### 2.1 `condenser-cop-for-heat-rejection` -- COP Implied by the Heat of Rejection

```
inputs:
  q_evap       M L^2 T^-3    evaporator capacity (tons or Btu/h via unit, > 0)
  target_thr   M L^2 T^-3    total heat of rejection (same unit as capacity, > q_evap)
  unit_tons    dimensionless 1 = tons (x 12,000), 0 = Btu/h

q_btuh      = unit_tons == 1 ? q_evap x 12000 : q_evap
thr_btuh    = unit_tons == 1 ? target_thr x 12000 : target_thr
w_comp_btuh = thr_btuh - q_btuh
cop         = q_btuh / w_comp_btuh
factor      = thr_btuh / q_btuh
```

**Pinned worked example.** q_evap = 60,000 Btu/h, target THR = 100,000 Btu/h:
`W_comp = 100000 - 60000 = 40,000 Btu/h`, `COP = 60000 / 40000 = ` **1.5** (factor 1.67). Feeding COP 1.5 back through
`condenser-heat-rejection` at 60,000 Btu/h returns a 100,000 Btu/h heat of rejection, the input. A higher 120,000 Btu/h
rejection at the same capacity implies a worse COP of 1.0.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac","refrigeration"]`) placed beside `condenser-heat-rejection` (Group C is
not exact-count audited); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (balance solved for the COP,
`GOVERNANCE.general` matching the sibling); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`condenser-cop-for-heat-rejection` -> `computeCondenserCopForHeatRejection`);
`scripts/related-tiles.mjs` (-> `condenser-heat-rejection` / `refrigeration-cop` / `refrigerant-mass-flow`);
`data/search/aliases.json` (4 collision-checked question aliases: "cop from heat of rejection", "implied cop", ...); the
calc-refrigerant `REFRIGERANT_RENDERERS` map entry via a hand-written renderer (a capacity field, a unit select, and a
THR field) and the id added to the calc-refrigerant declare list in `app.js`; the `// dims:` annotation directly above the
compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the
round-trip through `computeCondenserHeatRejection` across a capacity/THR/unit sweep, the higher-THR-lower-COP behavior, the
tons/Btu-h unit equivalence, and the error seams (including THR <= Q_evap). The calc-refrigerant.js gzip cap (raised to
18000 B in this spec) covers the addition. Verify at build, including `check-shells`. Lazy-loaded, absent from home first
paint. Home tile count 1,209 -> 1,210.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> COP 1.5 for a 60,000 Btu/h
evaporator rejecting 100,000 Btu/h).

## 5. Roadmap position

Pairs the forward heat-rejection tile (`condenser-heat-rejection`, THR from the COP) with its inverse (the COP from the
THR), the two halves of the condenser-duty question, and complements the `refrigeration-cop` tile. Continues Explore sweep
#15; further Group C refrigerant growth stays evidence-driven.
