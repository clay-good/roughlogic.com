# roughlogic.com Specification v842 -- Mass Concrete Adiabatic Temperature Rise Screen (ACI 207) (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v841.md. Concrete-operations sweep, beside
> `concrete-maturity` and `fresh-concrete-temp`.
>
> **The gap, and the evidence for it.** Nothing screens **mass concrete heat** -- the adiabatic temperature rise from the
> cement's heat of hydration and the peak the placement will reach, the trigger for a thermal-control plan. Grep confirmed
> no temperature-rise / mass-concrete tile (`concrete-maturity` is strength-vs-time). The number this settles: a rich
> 600 lb/cy mix at a 12 degF-per-100-lb rise gains **72 degF** and, placed at 70 degF, peaks near **142 degF** -- past the
> roughly 35 degF differential that governs cracking, so this pour needs cooling.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
concrete siblings (`concrete-maturity`, `fresh-concrete-temp`): the cementitious content and rise coefficient are
dimensionless coefficients, the temperatures and differential limit carry `T`, and the exceed flag is a boolean. The
v18/v21 contract: a non-finite or non-positive cementitious content, rise coefficient, or differential limit returns
`{ error }`; a non-finite placing temperature returns `{ error }`. Citation discipline (v19/v22): the ACI 207 adiabatic
rise identity by name (rise = cementitious x coefficient / 100; peak = placing + rise), `GOVERNANCE.general`; the note
states plainly that this is a SCREEN, not a thermal analysis -- the rise coefficient depends on the cement type and the
supplementary cementitious materials (slag and fly ash lower it) and is entered from the mix data, the roughly 35 degF
surface-to-core differential is the crack-control target a thermal-control plan enforces through modeling, and the
engineer of record governs; a wrong number here means thermal cracking (repair), not injury.

## 2. The tile

### 2.1 `mass-concrete-temp-rise` -- Mass Concrete Adiabatic Temperature Rise Screen (ACI 207)

```
inputs:
  cementitious_lb_per_cy  total cementitious content (lb/cy)
  rise_f_per_100lb        adiabatic rise per 100 lb cementitious (degF, default 12)
  placing_temp_f          concrete placing temperature (degF, default 70)
  diff_limit_f            surface-core differential target (degF, default 35)

delta_t_f      = cementitious_lb_per_cy * rise_f_per_100lb / 100
peak_temp_f    = placing_temp_f + delta_t_f
exceeds_screen = delta_t_f > diff_limit_f
```

**Pinned worked example.** Cementitious 600 lb/cy, rise 12 degF/100lb, placing 70 degF, limit 35 degF:
`rise = 600 * 12 / 100 = ` **72 degF**; `peak = 70 + 72 = ` **142 degF**; `exceeds = 72 > 35` -> **true** (thermal control
plan indicated). Cross-check: a leaner 400 lb/cy mix with slag at an 8 degF/100lb rise gains `400*8/100 = ` **32 degF**
(peak 102 degF), under the 35 degF screen -- the cementitious content and the SCM-lowered coefficient are the levers.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["concrete", "construction"]`, inside the `// Group E` construction block near
`concrete-maturity`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (rise = cementitious x coefficient / 100; peak = placing + rise [ACI 207], `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the slag-mix cross-check); `test/fixtures/compute-map.js`
(`mass-concrete-temp-rise` -> `computeMassConcreteTempRise`, module `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `concrete-maturity` / `fresh-concrete-temp` / `concrete-evaporation-rate`);
`data/search/aliases.json` (5 collision-checked aliases: "mass concrete temperature rise", "adiabatic temperature rise",
"concrete heat of hydration", "mass concrete peak temp", "thermal control screen"); a hand-written renderer in the
`CONSTRUCTION_RENDERERS` map mirroring the `concrete-maturity` renderer (non-exported, so no DOM-sentinel dims row), and
the id added to the calc-construction declare list in `app.js`; the `// dims:` annotation directly above the compute;
regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the rise, peak, the
exceed flag, and the error seams (non-positive cementitious, coefficient, limit; non-finite placing temp). The
calc-construction.js gzip cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes`
post-build. Lazy-loaded, absent from home first paint. Home tile count 1,290 -> 1,291.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(600 * 12 / 100 -> 72 degF rise, 142 degF peak).

## 5. Roadmap position

Concrete-operations screen beside `concrete-maturity` and `fresh-concrete-temp`, serving the concrete superintendent
(concrete / construction). Deliberately a screen; the thermal-control plan and the EOR govern. Stays evidence-driven.
