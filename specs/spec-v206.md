# roughlogic.com Specification v206 -- Medical Gas System Demand and Diversity (NFPA 99) (calc-gas.js, Group B, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v204..v206 (plumbing/pipefitting -- the deferred
> process/specialized cluster: branch reinforcement, expansion guide spacing, medical gas demand).**
> In-scope catalog expansion under the spec-v106 trades-only charter: medical-gas piping is installed by
> brazing-certified plumbers and pipefitters (ASSE 6010). Adds one tile to **`calc-gas.js`** (Group B); no
> new module, group, or dependency. Inherits spec.md through spec-v205.md.
>
> **The gap, and the evidence for it.** The catalog sizes fuel gas six ways but has nothing for medical
> gas, a piped system that plumbers and pipefitters install and certify under NFPA 99. The first sizing
> step for an oxygen, medical-air, nitrous, or vacuum main is the demand: the connected flow is the
> station (outlet/inlet) count times the per-station design flow, and the system design flow is that
> connected total times a diversity (simultaneous-use) factor that falls as the station count rises --
> because not every outlet flows at once. The catalog has the fuel-gas demand tile (`gas-appliance-demand`)
> but no medical-gas equivalent, so the med-gas main is sized without the diversity step that NFPA 99
> requires.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The station
count is `dimensionless`; the per-station design flow, the connected flow, and the system design flow are
a volumetric flow (`L^3/T`, scfm); the diversity factor is `dimensionless` in (0, 1]. The v18/v21
contract: any non-finite input, a non-positive station count or per-station flow, or a diversity factor
outside (0, 1] returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the
connected-times-diversity demand relation by name; `editionNote` names **NFPA 99 Health Care Facilities
Code (medical gas and vacuum systems)** and **ASSE 6010** for the installer qualification, and states that
**the per-station design flows and the diversity (simultaneous-use) factors are read from the adopted NFPA
99 edition and the facility's equipment list (user-supplied here), a medical-gas verifier and the AHJ
govern, and this tile gives the design flow that feeds pipe sizing, not the system design itself** -- a
demand aggregation, not a med-gas system stamp.

## 2. The tile

### 2.1 `medgas-demand` -- Medical Gas Connected and Design Flow With Diversity

```
inputs:
  stations          dimensionless   number of outlets/inlets on the service
  per_station_scfm  L^3/T           per-station design flow, scfm (from NFPA 99 / equipment)
  diversity         dimensionless   simultaneous-use factor, (0,1] (from the adopted table)

connected_scfm = stations x per_station_scfm
design_scfm    = connected_scfm x diversity        # the flow the main is sized for
```

**Pinned worked example (oxygen riser).** 20 oxygen outlets at 1.0 scfm per station, diversity 0.25:
`connected = 20 x 1.0 = 20 scfm`; `design = 20 x 0.25 = ` **5.0 scfm** -- the flow the oxygen main is
sized to carry.
**Cross-check (medical-surgical vacuum, higher diversity).** 30 vacuum inlets at 1.0 scfm, diversity
0.50: `connected = 30 scfm`; `design = 30 x 0.50 = 15 scfm`. Same per-station flow, but vacuum's higher
simultaneous use drives a larger design flow per inlet than oxygen's.

## 3. Wiring

A `tools-data.js` row (group `B`, trade `["plumbing","pipefitting"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the connected-times-diversity relation, `editionNote` naming
NFPA 99 and ASSE 6010, the user-supplied-flows-and-factors and verifier/AHJ-governs caveats);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`medgas-demand` -> `computeMedgasDemand` in `../../calc-gas.js`); `scripts/related-tiles.mjs` (->
`gas-appliance-demand` / `gas-pipe-sizing` / `pipe-velocity`); `data/search/aliases.json` ("medical gas",
"med gas demand", "oxygen sizing", "medical vacuum", "NFPA 99", "diversity factor"); the id appended to
the existing gas renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning the example, the cross-check, and error seams
(non-finite, stations/flow <= 0, diversity outside (0,1]). Raise the `calc-gas.js` size cap by ~20
percent if needed (dated comment); bump the `citations.js` cap if needed. Lazy-loaded, absent from home
first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**);
`npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the connected and design flow lines wrap on
a phone); render-no-nan + a11y sweep, output read to the value (20 outlets / 1.0 / 0.25 -> 5.0 scfm).

## 5. Roadmap position

Opens medical-gas as a plumbing/pipefitting service alongside the deep fuel-gas family; its design flow
feeds `gas-pipe-sizing` and `pipe-velocity`. A fuller medical-gas cluster (source/manifold sizing, zone
valve and alarm layout, bulk-oxygen separation reference) is a deliberate future batch, not an automatic
landing -- it is a specialized, verifier-governed system.

## 6. Note on catalog saturation

This batch (v204..v206) clears the last cluster of everyday plumbing/pipefitting tools that had a
defensible, cleanly pinnable worked example. Beyond it the remaining candidates are either specialized
systems that deserve their own deliberate batch (a full medical-gas suite) or calculations whose
governing coefficients are too source-variable to pin without a citation pass (LP-tank vaporization
capacity, steam PRV choked-flow sizing, electric heat-trace wattage). Those are flagged, not written, so
the catalog does not grow on shaky numbers. The trade is, for practical purposes, saturated for field and
shop hand-tools.
