# roughlogic.com Specification v293 -- Steel Web Local Yielding and Web Crippling at a Concentrated Force (AISC 360 J10) (calc-steel.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v293..v295 (the steel connection/detailing depth trio -- the
> checks the member tiles never touch: the beam web under a concentrated reaction or bearing force (this spec), the slip-
> critical bolt (v294), and the fillet-weld size limits (v295).)**
> In-scope catalog expansion under the spec-v106 trades-only charter: the steel member tiles check the beam in bending and
> shear, but where a column bears on a beam or a beam lands on a bearing plate, the web itself can yield or cripple under
> the concentrated force -- the AISC J10 limit states that decide whether a bearing stiffener is needed. Adds one tile to
> the existing **`calc-steel.js`** module (Group E); no new group, trade, or dependency. Inherits spec.md through
> spec-v292.md.
>
> **The gap, and the evidence for it.** AISC 360 J10 checks two web limit states under a concentrated force over a bearing
> length `lb`: web local yielding, `Rn = Fy tw (5k + lb)` at an interior location (`2.5k + lb` near the end), with
> `phi = 1.00` / `Omega = 1.50`; and web crippling,
> `Rn = 0.80 tw^2 [1 + 3(lb/d)(tw/tf)^1.5] sqrt(E Fy tf/tw)` interior, with `phi = 0.75` / `Omega = 2.00`. For a W18x50
> (`tw = 0.355`, `tf = 0.570`, `k = 1.25`, `d = 18.0`) taking a 4 in interior bearing at `Fy = 50`, web local yielding gives
> `Rn = 50 x 0.355 x (6.25 + 4) = 181.9 kip` (ASD 121.3) and web crippling `Rn = 204.2 kip` (ASD 102.1); because their
> safety factors differ, web crippling governs the ASD capacity at 102.1 kip -- the reaction beyond which the web needs a
> stiffener, a check the shear and flexure tiles never make.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The web thickness `tw`, flange
thickness `tf`, `k` distance, depth `d`, and bearing length `lb` are lengths (in); `Fy` is a stress (ksi); the location
selects the yielding coefficient (`5k` interior, `2.5k` end) and the crippling form; the nominal, ASD, and LRFD strengths
are forces (kip). The v18/v21 contract: any non-finite input, or any thickness/dimension/strength at or below zero, returns
`{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the AISC 360 J10 provisions by name; `editionNote`
names **the AISC 360-22 J10.2 web local yielding `Rn = Fy tw (5k + lb)` interior / `(2.5k + lb)` end (`phi = 1.00`/
`Omega = 1.50`) and J10.3 web crippling `Rn = 0.80 tw^2 [1 + 3(lb/d)(tw/tf)^1.5] sqrt(E Fy tf/tw)` interior
(`phi = 0.75`/`Omega = 2.00`), `E = 29,000 ksi`, `k = kdes`**, and states that **this returns the two web limit states under
a concentrated transverse force at an interior or near-end location -- it uses the interior/end forms as selected, does not
cover the near-end crippling reduction for `lb/d > 0.2`, the local crippling with the `lb` beyond half the depth, web
sidesway/compression buckling (J10.4/J10.5), or the stiffener design itself; and this is a design aid, not a substitute for
the engineer of record** -- the structural engineer of record's stamped design governs.

## 2. The tile

### 2.1 `steel-web-local-strength` -- Steel Web Local Yielding and Crippling (AISC 360 J10)

```
inputs:
  Fy       ksi    yield stress
  tw       in     web thickness
  tf       in     flange thickness
  k_in     in     k distance (kdes) flange face to web toe of fillet
  d_in     in     member depth
  lb_in    in     bearing length of the applied force
  location -      interior | end

E = 29000 ksi
WLY_Rn = (location==interior) ? Fy*tw*(5*k_in+lb_in) : Fy*tw*(2.5*k_in+lb_in)   ; phi 1.00 / Om 1.50
WC_Rn  = 0.80*tw^2*(1 + 3*(lb_in/d_in)*(tw/tf)^1.5)*sqrt(E*Fy*tf/tw)             ; phi 0.75 / Om 2.00
ASD  = min(WLY_Rn/1.50, WC_Rn/2.00)
LRFD = min(1.00*WLY_Rn, 0.75*WC_Rn)
```

**Pinned worked example (a W18x50, 4 in interior bearing, A992).** `Fy = 50`, `tw = 0.355`, `tf = 0.570`, `k = 1.25`,
`d = 18.0`, `lb = 4`, interior: web local yielding `Rn = 50 x 0.355 x (5 x 1.25 + 4) = 181.9 kip` (ASD 121.3, LRFD 181.9);
web crippling `Rn = 0.80 x 0.355^2 x [1 + 3(4/18)(0.355/0.570)^1.5] x sqrt(29,000 x 50 x 0.570/0.355) = 204.2 kip`
(ASD 102.1, LRFD 153.2). Because the safety factors differ, the governing ASD capacity is web crippling at **102.1 kip**
and the governing LRFD capacity is web crippling at **153.2 kip**. **Cross-check (a near-end reaction).** Move the same
bearing to an end (`location = end`): web local yielding drops to `Rn = 50 x 0.355 x (2.5 x 1.25 + 4) = 126.0 kip`
(ASD 84.0), now below the crippling ASD, so at an end the yielding limit governs the ASD capacity at 84.0 kip -- the reason
end reactions are checked separately from interior bearings. The non-finite and non-positive error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["welding","construction"]`, matching the steel member tiles); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the AISC 360 J10 provisions, `editionNote` naming the WLY and
WC forms, the interior/end coefficients, the differing `phi`/`Omega`, and the no-sidesway-buckling, no-stiffener-design
caveats); `test/fixtures/worked-examples.json` (the interior example + the end cross-check); `test/fixtures/compute-map.js`
(`steel-web-local-strength` -> `computeSteelWebLocalStrength` in `../../calc-steel.js`); `scripts/related-tiles.mjs` (->
`steel-beam-shear` / `steel-beam-ltb` / `column-base-plate` / `steel-block-shear`); `data/search/aliases.json` ("web local
yielding", "web crippling", "AISC J10", "bearing stiffener", "concentrated load web", "web strength beam", "5k plus N",
"reaction web check", "column on beam web"); the id appended to the existing steel renderers block in `app.js`; the
`// dims:` annotation (lengths in, `Fy` stress, strengths force); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the interior/end branch, the min-of-availables selection (differing
`Omega`), and the non-positive / non-finite error seams. No new module; re-pin `calc-steel.js` on the `check:module-sizes`
allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the governing-limit-state assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the WLY / WC / ASD / LRFD stack wraps on
a phone); render-no-nan + a11y sweep, output read to the value (W18x50, 4 in interior -> 102.1 kip ASD, crippling governs).

## 5. Roadmap position

Opens the steel connection/detailing depth batch (v293..v295) in `calc-steel.js`, adding the concentrated-force web checks
the member tiles never made. The slip-critical bolt (v294) and fillet-weld size limits (v295) follow. Web sidesway buckling
(J10.4), the near-end crippling reduction, and a bearing-stiffener design tile are the deliberate next follow-ons once the
trio lands.
