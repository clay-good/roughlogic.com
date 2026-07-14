# roughlogic.com Specification v728 -- Interference for a Target Press-Fit Holding Force (calc-shop.js, Group G, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`** (Group G),
> no new module, group, or dependency. Inherits spec.md through spec-v727.md. Sweep-11 inverse queue (final entry).
>
> **The gap, and the evidence for it.** The `press-fit-pressure` tile runs the Lame interference-fit model forward: from a
> diametral interference it returns the contact pressure, the axial holding force, and the hub bore stress. The shop
> question is the inverse -- **what interference reaches a target holding force**. The holding force
> `= i x E x (Do^2 - D^2)/(2 Do^2) x pi x D x L x mu` is linear in the interference (the interface diameter D cancels from
> the pressure/force ratio), so `i = holding x 2 Do^2 / (E x (Do^2 - D^2) x pi x D x L x mu)`. The number this settles: a
> **25,447 lb** target on a **2 in** shaft, **4 in** steel hub, mu **0.12**, **3 in** engagement wants **0.0020 in**,
> developing 11,250 psi contact pressure and 18,750 psi hub bore stress.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`press-fit-pressure` sibling: the target holding force is `M L T^-2` (lb), the shaft and hub diameters and engagement are
`L` (in), the modulus and hub yield are `M L^-1 T^-2` (psi), and the friction coefficient is dimensionless; the returned
interference is `L`, the contact pressure and hub bore stress are `M L^-1 T^-2`. It reuses the sibling's Lame
thick-cylinder model (same-material solid shaft), solved for the interference. The v18/v21 contract: any non-finite input,
a non-positive target force / diameter / modulus / engagement, a hub OD at or below the shaft diameter, or a non-positive
friction coefficient (a zero-friction fit holds nothing, and the term is a denominator) returns `{ error }`. Citation
discipline (v19/v22): the Lame relations solved for the interference, `GOVERNANCE.general` matching the sibling; the note
states that the holding force is **linear in the interference** (D cancels), that the **contact pressure and hub bore
stress** at that interference are reported so the burst risk is visible, that a **hub yield** input flags it, that a
**thin hub** (Do close to D) needs far more interference for the same force which drives the bore stress up fast, and that
the model assumes elastic same-material parts and a solid shaft, with the materials and assembly method governing.

## 2. The tile

### 2.1 `press-fit-interference-for-force` -- Interference for a Target Press-Fit Holding Force

```
inputs:
  target_holding_lb   M L T^-2      target axial holding force (lb, > 0)
  shaft_dia_in        L             interface diameter D (in, > 0)
  hub_od_in           L             hub outer diameter Do (in, must exceed D)
  modulus_psi         M L^-1 T^-2   elastic modulus E (psi, > 0, default 30e6 steel)
  friction_coeff      dimensionless friction coefficient mu (> 0, default 0.12)
  engagement_in       L             engagement length L (in, > 0)
  hub_yield_psi       M L^-1 T^-2   hub yield strength (psi, optional; 0 skips the flag)

interference_in = target_holding_lb x 2 Do^2 / (E x (Do^2 - D^2) x pi x D x L x mu)
p_psi           = (E x interference_in / D) x (Do^2 - D^2) / (2 Do^2)
hub_stress_psi  = p_psi x (Do^2 + D^2) / (Do^2 - D^2)
yield_flag      = hub_yield_psi > 0 ? (hub_stress_psi > hub_yield_psi ? "EXCEEDS..." : "within...") : null
```

**Pinned worked example.** holding = 25,447 lb, D = 2 in, Do = 4 in, E = 30e6 psi, mu = 0.12, L = 3 in:
`i = 25447 x 2 x 16 / (30e6 x 12 x pi x 2 x 3 x 0.12) = ` **0.0020 in**; `p = 11,250 psi`, hub bore stress = **18,750 psi**.
Feeding 0.0020 in back through `press-fit-pressure` at the same geometry returns a 25,447 lb holding force, the target,
with matching pressure and bore stress. A larger 40,000 lb target needs proportionally more interference.

## 3. Wiring

A `tools-data.js` row (group `G`, trades `["fabrication","machinist","mechanic"]`) placed beside `press-fit-pressure` in
the later spec-v511 section, well past the Group G exact-count audit block; a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (Lame relations solved for the interference, `GOVERNANCE.general` matching the sibling);
`test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js`
(`press-fit-interference-for-force` -> `computePressFitInterferenceForForce`); `scripts/related-tiles.mjs` (->
`press-fit-pressure` / `shrink-fit` / `bearing-l10-life` / `bolt-proof-load`); `data/search/aliases.json` (5
collision-checked question aliases: "interference for holding force", "press fit interference", ...); the calc-shop
`SHOP_RENDERERS` map entry via a hand-written renderer (seven number fields) and the id added to the calc-shop declare
list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the round-trip through `computePressFitPressure`
across a force/geometry/material sweep, the pressure/bore-stress match, the more-force-more-interference monotonicity, the
hub-yield flag, and the error seams. The calc-shop.js gzip cap (raised to 26500 B in this spec) covers the addition.
Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,176 -> 1,177.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 0.0020 in for a 25,447 lb
target on the 2 in / 4 in steel fit).

## 5. Roadmap position

Pairs the forward press-fit tile (`press-fit-pressure`, holding force from an interference) with its inverse (the
interference for a target force), the two halves of the shrink/press-fit sizing question. **Closes the sweep-11 inverse
queue.** Further Group G shop-math growth stays evidence-driven; a fresh Explore sweep opens the next batch.
