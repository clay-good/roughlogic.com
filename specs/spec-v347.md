# roughlogic.com Specification v347 -- Duct Heat Gain/Loss Through Unconditioned Space (calc-hvac.js, Group C, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.122.0). Batch spec-v347..v349 (the duct-and-airflow trio -- the airflow effects
> the duct-sizing tile never captures: the heat a duct gains or loses running through an unconditioned space (this spec),
> the grille/register sizing by face velocity and free area (v348), and the air-density correction for altitude and
> temperature (v349).)**
> In-scope catalog expansion under the spec-v106 trades-only charter: `duct-sizing` and `duct-friction-static` size the duct
> for airflow and pressure, but a supply duct running through a hot attic or a cold crawlspace gains or loses heat through
> its walls, warming or cooling the air before it reaches the room -- a capacity loss the catalog cannot quantify. Adds one
> tile to the existing **`calc-hvac.js`** module (Group C); no new group, trade, or dependency. Inherits spec.md through
> spec-v346.md.
>
> **The gap, and the evidence for it.** The heat a duct exchanges with the space around it is `Q = U x A x dT`, where `U`
> is the duct-insulation conductance (`1/R`), `A` the duct surface area, and `dT` the difference between the ambient space
> and the air in the duct; the resulting air temperature change is `dT_air = Q/(1.08 x CFM)`. For 1,000 CFM of 55 degF
> supply air through 100 ft^2 of R-4 duct (`U = 0.25`) in a 120 degF attic (`dT ~ 65 degF`), `Q = 0.25 x 100 x 65 = 1,625 Btu/h`
> and the air warms `1,625/(1.08 x 1,000) = 1.5 degF` before it reaches the register -- a real capacity loss, and one that
> doubles when the airflow halves. Upgrading the duct to R-8 (`U = 0.125`) cuts it to `0.75 degF`, the payback that justifies
> duct insulation in a hot attic. `duct-sizing` moves the air; this tile tracks the heat it picks up on the way.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The duct R-value is an
R-value (h-ft^2-degF/Btu) giving `U = 1/R`; the duct surface area `A` is an area (ft^2); the ambient-to-air temperature
difference `dT` is a temperature (degF); the airflow is a volumetric flow (cfm); the heat exchange `Q` is a power (Btu/h);
the air temperature change `dT_air` is a temperature (degF). The v18/v21 contract: any non-finite input, or an R-value,
area, or airflow at or below zero, returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the duct
heat-transfer relations by name; `editionNote` names **the duct heat exchange `Q = U A dT` (`U = 1/R`), the air temperature
change `dT_air = Q/(1.08 CFM)` from the sensible-air constant, and the ASHRAE Fundamentals duct-loss basis**, and states
that **this returns the sensible heat gain/loss and air temperature change over a duct run -- it uses a single mean
ambient-to-air `dT` (the true value tapers along the run as the air approaches ambient; for a long run integrate or
sublength it), the entered duct R-value (add the film and any radiant/leakage effects separately), and does not add duct
leakage (`duct-leakage`) or the latent gain; and this is a design aid** -- the ACCA Manual D / ASHRAE duct-design analysis
governs.

## 2. The tile

### 2.1 `duct-heat-gain` -- Duct Heat Gain/Loss Through Unconditioned Space

```
inputs:
  R_duct    h-ft2-F/Btu   duct insulation R-value
  A_ft2     ft^2          duct surface area
  dT_F      degF          ambient space minus in-duct air temperature
  cfm       cfm           airflow

U = 1 / R_duct
Q_btuh = U * A_ft2 * dT_F                          ; heat gain(+)/loss, Btu/h
dT_air = Q_btuh / (1.08 * cfm)                      ; air temperature change, degF
```

**Pinned worked example (1,000 CFM of 55 degF air, R-4 duct, 100 ft^2, 120 degF attic).** `U = 1/4 = 0.25`;
`dT = 120 - 55 = 65 degF`; `Q = 0.25 x 100 x 65 = 1,625 Btu/h`; `dT_air = 1,625/(1.08 x 1,000) = 1.5 degF` of warming.
**Cross-check (upgrade to R-8 duct).** `U = 0.125`: `Q = 813 Btu/h`, `dT_air = 0.75 degF` -- half the loss for double the
R-value, the linear return that pays for attic-duct insulation. And at half the airflow (500 CFM), the same R-4 duct warms
the air `3.0 degF`, since the fixed heat is spread over less flow. The non-finite and non-positive error paths bracket the
result.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, matching `duct-sizing`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the duct heat-transfer relations, `editionNote` naming `Q = U A dT`,
`dT_air = Q/(1.08 CFM)`, and the mean-dT, R-value-only, no-leakage caveats); `test/fixtures/worked-examples.json` (the R-4
example + the R-8 cross-check); `test/fixtures/compute-map.js` (`duct-heat-gain` -> `computeDuctHeatGain` in
`../../calc-hvac.js`); `scripts/related-tiles.mjs` (-> `duct-sizing` / `duct-leakage` / `insulation-heat-loss` /
`grille-face-velocity`); `data/search/aliases.json` ("duct heat gain", "duct heat loss", "duct insulation loss", "attic
duct loss", "supply air temperature rise", "duct R value", "duct capacity loss", "ductwork heat gain", "insulated duct");
the id appended to the existing hvac renderers block in `app.js`; the `// dims:` annotation (`R_duct` R-value, `A` area,
`dT`/`dT_air` temperature, `cfm` volumetric flow, `Q` power); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning both examples, the `1/R` conductance, the airflow-inverse air-temp change, and the non-positive / non-finite
error seams. No new module; re-pin `calc-hvac.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the R-value and airflow-inverse assertions); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `Q` / `dT_air` pair wraps on
a phone); render-no-nan + a11y sweep, output read to the value (1,000 CFM R-4 attic -> 1,625 Btu/h, 1.5 degF).

## 5. Roadmap position

Opens the duct-and-airflow batch (v347..v349) in `calc-hvac.js`, adding the thermal loss to the duct-sizing tiles. The
grille face velocity (v348) and air-density correction (v349) follow. A tapering-`dT` sublength integration, a duct-leakage-
plus-conduction combined loss, and a chain into `manual-j-cooling` for the added attic-duct load are the deliberate next
follow-ons once the trio lands.
