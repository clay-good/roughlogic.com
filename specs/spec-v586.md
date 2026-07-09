# roughlogic.com Specification v586 -- Liquid-Line Subcooling to Prevent Flash Gas (calc-refrigerant.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-refrigerant.js`**
> (Group C, the refrigerant bench); no new module, group, or dependency. Inherits spec.md through spec-v585.md.
>
> **The gap, and the evidence for it.** `superheat-subcool` reports the actual subcooling measured from temperature and
> pressure, but not how much subcooling a system **needs** to keep the liquid line from flashing to vapor before it
> reaches the metering device. When the liquid line rises (evaporator above condenser) or loses pressure to friction,
> the saturation pressure can drop below the liquid's pressure and it boils in the line -- flash gas -- which starves the
> metering device. The required subcooling is the total pressure drop divided by the refrigerant's pressure-temperature
> slope near condensing. The catch is the **vertical lift**: techs credit only the friction drop and forget the static
> column, `0.43 psi/ft` for R-410A liquid, which on a tall riser dominates. The tile takes the refrigerant, the vertical
> lift, and the liquid-line friction, and returns the total pressure drop and the required subcooling against the field
> target -- so the liquid arrives at the metering device still liquid.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The vertical lift is a
length (`L`, in ft); the static, friction, and total pressure drops are pressures (`M L^-1 T^-2`, in psi); the required
subcooling carries the temperature dimension (degrees F); the per-foot static gradient (`0.43 psi/ft` R-410A liquid) and
the pressure-temperature slope (`5 psi/degF` near condensing) are `dimensionless` unit-bearing constants. The v18/v21
contract: any non-finite input, a negative vertical lift or friction drop, or a non-positive pressure-temperature slope
returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the flash-gas relations by name (ASHRAE
Refrigeration Handbook; refrigerant piping guides); `editionNote` names the **liquid-line subcooling to prevent flash
gas**, prints `dP_lift = 0.43 x lift` (R-410A liquid), `dP_total = dP_lift + friction`, and
`required_subcool = dP_total / slope` (slope about 5 psi/degF for R-410A near condensing), and states that **techs often
credit only the friction and forget the 0.43 psi/ft vertical-lift column that dominates on a tall riser, liquid-line
heat gain also flashes liquid, subcooling should be measured at the metering device not the condenser outlet, the
5 psi/degF slope flattens at higher pressure (an approximation), and the manufacturer data and the actual refrigerant
govern** -- a design aid, not a commissioning measurement.

## 2. The tile

### 2.1 `flash-gas-subcool` -- The Vertical-Lift Pressure Drop Techs Forget

```
inputs:
  vertical_lift_ft   ft    evaporator height above the condenser (liquid riser)
  friction_dp_psi    psi   liquid-line friction pressure drop
  static_gradient    psi/ft  liquid static gradient (0.43 R-410A, refrigerant-specific)
  pt_slope           psi/degF  P-T slope near condensing (5 R-410A)

dP_lift          = static_gradient x vertical_lift_ft          [psi]
dP_total         = dP_lift + friction_dp_psi                   [psi]
required_subcool = dP_total / pt_slope                         [degF]
```

**Pinned worked example (a 40 ft R-410A liquid riser with 15 psi of line friction).** The static column alone is
`0.43 x 40 = 17.2 psi`, so the total drop is `17.2 + 15 = 32.2 psi`, and the required subcooling to keep the liquid
from flashing is `32.2 / 5 = ` **6.4 F** -- and the tech should add margin to reach the 8 to 12 F field target.
**Cross-check (crediting only friction badly under-subcools).** Forgetting the lift and counting only the 15 psi of
friction gives `15 / 5 = ` **3.0 F** of apparent requirement -- less than half the true 6.4 F, so a system set to that
would flash in the riser and starve the metering device, the exact error the vertical-lift term prevents. The tile
returns the lift and total pressure drops and the required subcooling.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac", "refrigeration"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the with-lift example + the
friction-only cross-check); `test/fixtures/compute-map.js` (`flash-gas-subcool` -> `computeFlashGasSubcool` in
`../../calc-refrigerant.js`); `scripts/related-tiles.mjs` (-> `superheat-subcool` / `refrigerant-velocity` /
`refrigerant-charge`); `data/search/aliases.json` ("flash gas", "liquid line subcooling", "subcool vertical lift",
"0.43 psi per foot", "liquid riser flash", "required subcooling", "flash gas prevention", "liquid line pressure drop");
the id appended to the refrigerant renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the static-lift term, the total drop, the required
subcooling, and the error seams (non-finite, negative lift / friction, non-positive slope). Hand-writes its renderer
(mirroring the calc-refrigerant.js `superheat-subcool` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the lift-dP / total / subcool stack wraps on a phone); render-no-nan + a11y on the new tile,
output read to the value (the 40 ft example -> 32.2 psi, 6.4 F required).

## 5. Roadmap position

Adds the required-subcooling design number beside `superheat-subcool` (the measured value) and `refrigerant-velocity`
(the friction it depends on). A per-refrigerant static-gradient and P-T-slope library and a liquid-line-heat-gain term
are deliberate future follow-ons. Further Group C growth stays evidence-driven.
