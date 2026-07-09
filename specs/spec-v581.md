# roughlogic.com Specification v581 -- Foam Eductor Back-Pressure / Hose-Lay Limit (calc-fire.js, Group F, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-fire.js`**
> (Group F, fire-ground engineering); no new module, group, or dependency. Inherits spec.md through spec-v580.md.
>
> **The gap, and the evidence for it.** `foam` gives the required foam volume by class, but an in-line eductor has a
> hard operating limit the bench never checks, and getting it wrong silently kills the foam. An in-line eductor draws
> concentrate by a venturi at its throat, and it needs about 200 psi inlet with the downstream **back-pressure kept
> below roughly 65% of the inlet**. The catch is a cliff, not a slope: if the back-pressure exceeds that threshold, the
> eductor **stops drawing foam concentrate entirely** -- not "less foam," but none, while water keeps flowing so it
> looks like it is working. A long hose lay past the eductor, an elevated nozzle, or a high-pressure automatic nozzle
> downstream all raise the back-pressure and can cross the line. The eductor's rated flow must also match the nozzle's
> flow. The tile takes the inlet pressure, the eductor flow, the downstream hose and nozzle, and the elevation, and
> returns the maximum allowable back-pressure and the maximum hose length before proportioning fails.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The inlet, nozzle, back-
pressure, and friction-loss pressures are `M L^-1 T^-2` (psi); the eductor flow is a volumetric flow (`L^3 T^-1`, in
gpm); the hose length and elevation are lengths (`L`, in ft); the hose coefficient, the 0.65 factor, and `0.434` are
`dimensionless`. The v18/v21 contract: any non-finite input, a non-positive inlet pressure, eductor flow, or hose
coefficient, or a negative nozzle pressure returns `{ error }`; a case where the nozzle and elevation alone already
exceed the 65% ceiling returns a zero-length (won't proportion) result. Citation discipline (v19/v22):
`GOVERNANCE.general` over the eductor relations by name (IFSTA; eductor manufacturer data, TFT/Elkhart); `editionNote`
names the **in-line foam eductor back-pressure limit**, prints `max_back_pressure = 0.65 x inlet`,
`FL_per_100 = C x (Q / 100)^2`, and the maximum hose length
`max_length = (0.65 x inlet - nozzle_pressure - 0.434 x elevation) / FL_per_100 x 100`, and states that **if the
downstream back-pressure exceeds about 65% of the inlet the eductor stops drawing foam concentrate entirely (not less,
none) while water keeps flowing, a long lay, an elevated nozzle, or a high-pressure automatic nozzle can cross that
line, the eductor's rated flow must equal the nozzle's flow, and the eductor manufacturer data governs** -- a planning
aid, not incident command.

## 2. The tile

### 2.1 `foam-eductor-limit` -- The Back-Pressure Cliff Where Foam Proportioning Silently Stops

```
inputs:
  inlet_pressure_psi   psi   eductor inlet pressure (~200)
  eductor_flow_gpm     gpm   rated eductor flow (must match nozzle flow)
  hose_coefficient     -     downstream hose friction coefficient C (1.75 in ~15.5)
  nozzle_pressure_psi  psi   downstream nozzle operating pressure
  elevation_ft         ft    elevation to the nozzle (negative = downhill)

max_back_pressure = 0.65 x inlet_pressure_psi                                              [psi]
FL_per_100        = hose_coefficient x (eductor_flow_gpm / 100)^2                          [psi/100 ft]
max_length        = (max_back_pressure - nozzle_pressure_psi - 0.434 x elevation_ft) / FL_per_100 x 100   [ft]
```

**Pinned worked example (200 psi inlet, a 95 gpm eductor, 1.75 in hose at C = 15.5, a 100 psi nozzle, 30 ft of lift).**
The maximum allowable back-pressure is `0.65 x 200 = 130 psi`. The downstream friction is
`15.5 x (95/100)^2 = 14.0 psi per 100 ft`, and the nozzle plus lift already consumes
`100 + 0.434 x 30 = 113 psi`, leaving `130 - 113 = 17 psi` for friction, so the hose past the eductor can be at most
`17 / 14.0 x 100 = ` **121 ft**. Beyond that the back-pressure crosses 65% of inlet and the eductor stops drawing foam.
**Cross-check (a lower-pressure nozzle buys length).** Swap to a 50 psi low-pressure nozzle:
`130 - (50 + 13) = 67 psi` is left for friction, so `max_length = 67 / 14.0 x 100 = ` **479 ft** -- four times the
reach, purely from the lower nozzle pressure, the reason foam nozzles run at reduced pressure. The tile returns the
maximum back-pressure and the maximum hose length.

## 3. Wiring

A `tools-data.js` row (group `F`, trades `["fire"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 100 psi nozzle example + the
50 psi cross-check); `test/fixtures/compute-map.js` (`foam-eductor-limit` -> `computeFoamEductorLimit` in
`../../calc-fire.js`); `scripts/related-tiles.mjs` (-> `foam` / `pdp` / `relay-pump-distance`);
`data/search/aliases.json` ("foam eductor", "eductor back pressure", "foam proportioning limit", "in-line eductor",
"65 percent back pressure", "foam hose length", "eductor flow match", "foam concentrate draw"); the id appended to the
fire renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the 65% back-pressure ceiling, the Q-squared friction, the
max-length relation, the won't-proportion case, and the error seams (non-finite, non-positive inlet / flow / C, negative
nozzle). Hand-writes its renderer (mirroring the calc-fire.js `foam` pattern). Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the max-BP / max-length stack wraps on a phone); render-no-nan + a11y on the new tile, output read
to the value (the 100 psi example -> 130 psi max BP, 121 ft).

## 5. Roadmap position

Adds the eductor proportioning limit beside `foam` (the required foam rate it must actually deliver). A balanced-
pressure / around-the-pump proportioning alternative and an eductor-flow-vs-nozzle-flow match checker are deliberate
future follow-ons. Further Group F growth stays evidence-driven.
