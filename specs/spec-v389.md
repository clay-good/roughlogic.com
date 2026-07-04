# roughlogic.com Specification v389 -- Hydrant Rated Flow at 20 psi (NFPA 291) (calc-fire.js, Group F, 1 New Tile)

> **Status: PROPOSED (2026-07-03). Third and final tile of the water-system hydraulics trio (v387 friction factor ->
> v388 thrust block -> v389 hydrant available flow). `hydrant-flow` gives the GPM out of one Pitot-gauged outlet during a
> test; this tile projects a two-gauge flow test to the standard rated capacity at 20 psi residual and returns the NFPA 291
> hydrant color class.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A fire-flow test reads a static pressure, a residual
> pressure while flowing a measured `QF`, and reports what the main can deliver down to the `20 psi` minimum residual. NFPA
> 291 projects it with `QR = QF * (hr/hf)^0.54`, where `hf` is the pressure drop during the test (`static - residual`) and
> `hr` is the drop to `20 psi` (`static - 20`); the `0.54` exponent comes from the Hazen-Williams flow-pressure relation.
> `hydrant-flow` computes the single-outlet test flow but never projects it to the rated capacity or assigns the color
> class. This adds the rated-flow tile to the existing **`calc-fire.js`** module (Group F), beside `hydrant-flow`; no new
> group, trade, or dependency. Inherits spec.md through spec-v388.md.
>
> **The gap, and the evidence for it.** A test with `static = 70 psi`, `residual = 50 psi` while flowing `QF = 1000 gpm`
> gives `hf = 70 - 50 = 20 psi`, `hr = 70 - 20 = 50 psi`, and `QR = 1000 * (50/20)^0.54 = 1640 gpm` at 20 psi -- an NFPA 291
> Class AA hydrant (light blue, `>= 1500 gpm`). A weaker main (`static 65`, `residual 45`, `QF 800`) projects to
> `QR = 800 * (45/20)^0.54 = 1240 gpm`, Class A (green). No tile does this projection or the class; `hydrant-flow` stops at
> the tested outlet flow.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The static and residual
pressures are pressures (psi); the test flow `QF` and the rated flow `QR` are volumetric flows (gpm); the color class is a
categorical label. The v18/v21 contract: any non-finite input, or a residual pressure at or above static (no measurable
drop, `hf <= 0`), or a static at or below `20 psi` (no available drop to the rated residual), returns `{ error }`; the tile
returns `QR`, the `hf`/`hr` drops, and the NFPA 291 class. Citation discipline (v19/v22): `GOVERNANCE.general` over the NFPA
291 hydrant flow test by name; `editionNote` names **NFPA 291, the rated-flow projection `QR = QF*(hr/hf)^0.54` with
`hf = static - residual`, `hr = static - 20`, the `0.54` Hazen-Williams exponent, and the color classes (AA `>=1500` light
blue, A `1000-1499` green, B `500-999` orange, C `<500` red)**, and states that **this returns the projected available flow
at 20 psi residual and the marking class from a two-gauge flow test, uses the standard 20 psi minimum residual, and is a
water-supply screening aid, not a substitute for the AHJ or a full waterworks analysis**.

## 2. The tile

### 2.1 `hydrant-available-flow` -- Hydrant Rated Flow at 20 psi (NFPA 291)

```
inputs:
  static_psi     psi   static pressure (no flow)
  residual_psi   psi   residual pressure while flowing QF
  qf_gpm         gpm   total flow measured during the test

hf = static_psi - residual_psi          (test pressure drop)
hr = static_psi - 20                      (drop to the 20 psi rated residual)
qr_gpm = qf_gpm * (hr / hf)^0.54
class  = qr >= 1500 ? "AA (light blue)" : qr >= 1000 ? "A (green)"
       : qr >= 500  ? "B (orange)"      : "C (red)"
```

**Pinned worked example (static 70, residual 50, QF 1000 gpm).** `hf = 20`, `hr = 50`;
`QR = 1000*(50/20)^0.54 = 1640 gpm` -> **Class AA (light blue)**. **Cross-check (a weaker main).** `static 65`,
`residual 45`, `QF 800`: `QR = 800*(45/20)^0.54 = 1240 gpm` -> **Class A (green)**. A residual at or above static, or a
static at or below 20 psi, takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `F`, trades `["fire"]`, beside `hydrant-flow`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, NFPA 291, `editionNote` naming `QR = QF*(hr/hf)^0.54`, the `hf`/`hr`
definitions, the `0.54` exponent, and the AA/A/B/C color classes); `test/fixtures/worked-examples.json` (the Class AA
example + the Class A cross-check; string class output pins with `"tolerance": {"abs": 0}`); `test/fixtures/compute-map.js`
(`hydrant-available-flow` -> `computeHydrantAvailableFlow` in `../../calc-fire.js`); `scripts/related-tiles.mjs` (->
`hydrant-flow` / `required-fire-flow` / `fire-pump-sizing` / `thrust-block-sizing`); `data/search/aliases.json` ("hydrant
available flow", "rated flow 20 psi", "NFPA 291", "fire flow test", "hydrant color class", "available fire flow", "flow at
20 psi", "hydrant marking", "QR QF hydrant"); the id appended to the existing fire renderers block in `app.js`; the
`// dims:` annotation (pressures pressure, flows volumetric flow, class categorical); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the class boundaries, and the residual-above-static / low-static /
non-finite error seams. No new module; re-pin `calc-fire.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from
home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the class assignment, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `QR` / class pair wraps on a phone);
render-no-nan + a11y sweep, output read to the value (70/50/1000 -> 1640 gpm, Class AA).

## 5. Roadmap position

Closes the water-system hydraulics trio: friction factor sets head loss, thrust block restrains the main, and this reads the
supply the main delivers. A graphical N^1.85 flow-test plot and a tie-in to `required-fire-flow` (comparing available versus
required) are the deliberate next follow-ons.
