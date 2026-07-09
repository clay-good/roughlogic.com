# roughlogic.com Specification v575 -- Mixing Velocity Gradient (G / Gt) (calc-treatment.js, Group M, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-treatment.js`**
> (Group M, water and wastewater operations); no new module, group, or dependency. Inherits spec.md through spec-v574.md.
>
> **The gap, and the evidence for it.** `coagulant-dose`, `detention-time`, and `clarifier-surface-loading` cover the
> chemistry and hydraulics of coagulation, but not the **mixing intensity** that makes or breaks floc formation. The
> Camp-Stein velocity gradient `G = sqrt(P / (mu x V))` sets it: rapid mix wants a high G (500 to 1,000 per second) for
> a short time to disperse coagulant, while flocculation wants a low G (20 to 70 per second) for a long time to grow
> floc without tearing it. The product `Gt` characterizes the whole basin. The catch operators miss is
> **temperature**: `G` depends on the water's dynamic viscosity, and cold water is more viscous, so the same paddle
> delivers a **lower** G in winter and can drop flocculation below the 20-per-second floor. And too high a G in the
> flocculation basin shears the floc apart -- the reason rapid mix and flocculation are staged, not merged. The tile
> takes the power input, the basin volume, the water temperature, and the detention time, and returns G and Gt against
> the target bands.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The power input is a power
(`M L^2 T^-3`, in W); the basin volume is a volume (`L^3`, in m^3); the dynamic viscosity is `M L^-1 T^-1` (Pa-s,
derived from the temperature); the velocity gradient G is `T^-1` (per second); the detention time is a time (`T`, in s);
the dimensionless product Gt is `dimensionless`. The v18/v21 contract: any non-finite input, a non-positive power,
volume, or detention time, or a temperature below freezing / above boiling (outside the viscosity table) returns
`{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the velocity-gradient relations by name (Camp &
Stein; Ten States Standards); `editionNote` names the **Camp-Stein velocity gradient (G / Gt)**, prints
`G = sqrt(P / (mu x V))` and `Gt = G x detention_time`, lists the bands (**rapid mix G 500 to 1,000 per second,
flocculation G 20 to 70 per second, Gt 10^4 to 10^5**), and states that **G depends on water temperature through
viscosity so cold water yields a lower G for the same paddle power and can drop flocculation below the 20-per-second
floor, too high a G in flocculation shears the floc apart (why rapid mix and flocculation are staged), the viscosity is
taken from a water-property table at the given temperature, and the treatment-process design governs** -- a design aid,
not a process design.

## 2. The tile

### 2.1 `flocculation-g-value` -- Why the Same Paddle Delivers Less Mixing in Cold Water

```
inputs:
  power_input_w      W    net power imparted to the water P
  basin_volume_m3    m3   mixing basin volume V
  water_temp_c       C    water temperature (sets dynamic viscosity mu)
  detention_time_s   s    detention time in the basin

mu   = dynamic viscosity of water at water_temp_c        [Pa-s]  (~0.001307 at 10 C, ~0.00089 at 25 C)
G    = sqrt(power_input_w / (mu x basin_volume_m3))       [1/s]
Gt   = G x detention_time_s                               [-]
band = classify G against rapid-mix / flocculation targets
```

**Pinned worked example (300 W into a 100 m^3 flocculation basin at 10 C, 20-minute detention).** At 10 C the viscosity
is about `0.001307 Pa-s`, so `G = sqrt(300 / (0.001307 x 100)) = sqrt(2,295) = ` **48 per second** -- squarely in the
20-to-70 flocculation band -- and over `1,200 s` the product is `Gt = 48 x 1,200 = ` **57,500**, within the 10^4 to
10^5 range. **Cross-check (warm water raises G for the same power).** In summer at 25 C the viscosity drops to about
`0.00089 Pa-s`, so the identical 300 W now gives `G = sqrt(300 / (0.00089 x 100)) = ` **58 per second** -- 20% higher
mixing intensity from the temperature alone, and a cold winter basin conversely drifts toward the low floor. The tile
returns G, Gt, and the band classification.

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["water-treatment"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 10 C example + the 25 C cross-
check); `test/fixtures/compute-map.js` (`flocculation-g-value` -> `computeFlocculationGValue` in
`../../calc-treatment.js`); `scripts/related-tiles.mjs` (-> `coagulant-dose` / `detention-time` /
`clarifier-surface-loading`); `data/search/aliases.json` ("velocity gradient", "g value", "gt value", "flocculation
mixing", "camp stein", "rapid mix g", "floc shear", "mixing intensity water"); the id appended to the treatment
renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning both examples, the sqrt relation, the viscosity-from-temperature dependence, the Gt product, the band
classification, and the error seams (non-finite, non-positive power / volume / time, temp out of table). Hand-writes its
renderer (mirroring the calc-treatment.js `detention-time` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the G / Gt / band stack wraps on a phone); render-no-nan + a11y on the new tile, output read to
the value (the 10 C example -> G 48/s, Gt 57,500).

## 5. Roadmap position

Adds the mixing-intensity metric beside `coagulant-dose` (the chemistry) and `detention-time` (the residence). A
paddle-power-from-geometry helper (computing P from the paddle drag and speed) and a tapered-flocculation multi-stage G
schedule are deliberate future follow-ons. Further Group M growth stays evidence-driven.
