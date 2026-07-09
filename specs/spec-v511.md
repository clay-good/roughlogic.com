# roughlogic.com Specification v511 -- Interference Press-Fit Pressure and Holding Force (calc-shop.js, Group G, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group G, the shop-mechanical bench); no new module, group, or dependency. Inherits spec.md through spec-v510.md.
>
> **The gap, and the evidence for it.** `shrink-fit` sizes the heating temperature to slip a hub over a shaft, and it
> **explicitly defers** the holding capacity to a Lam thick-cylinder check -- which the bench does not have. This tile
> is that check. Given the diametral interference, the Lam equations give the contact pressure at the interface, and
> from that the axial force the joint holds by friction and the tangential (hoop) stress the interference induces in the
> hub. Two catches make it worth its own tile. First, a **thin hub** (outer diameter close to the shaft) develops far
> less pressure for the same interference, so holding force collapses as the hub gets thin. Second, the interference
> that holds the shaft also stresses the hub, and too much interference can **yield or burst** the hub -- the failure
> that turns a press job into scrap. The tile takes the diameter, the interference, the hub outer diameter, the modulus,
> the friction coefficient, and the engagement length, and returns the contact pressure, the axial holding force, and
> the hub bore stress, so a press fit is sized for grip without cracking the hub.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The diameter, interference,
hub outer diameter, and engagement length are lengths (`L`, in inches); the modulus, the contact pressure, and the hub
stress are stresses (`M L^-1 T^-2`, in psi); the axial holding force is a force (`M L T^-2`, in lb); the friction
coefficient and the area ratios are `dimensionless`. This tile models the common same-material, solid-shaft case. The
v18/v21 contract: any non-finite input, a non-positive diameter, interference, modulus, or engagement length, a hub
outer diameter at or below the shaft diameter, or a negative friction coefficient returns `{ error }`. Citation
discipline (v19/v22): `GOVERNANCE.general` over the Lam press-fit relations by name (Machinery's Handbook "Forces and
Fits"; Lam thick-cylinder equations); `editionNote` names the **Lam interference-fit model (same-material solid
shaft)**, prints `p = (E x interference / D) x (Do^2 - D^2) / (2 x Do^2)`,
`holding_force = p x pi x D x length x friction`, and `hub_bore_stress = p x (Do^2 + D^2) / (Do^2 - D^2)`, and states
that **a thin hub develops far less contact pressure for the same interference so holding force falls as the hub
thins, the interference also raises a tangential stress at the hub bore that must stay below yield or the hub cracks,
the model assumes elastic same-material parts and a solid shaft (a hollow shaft or dissimilar metals change the
coefficients), and the actual materials, surface finish, and assembly method govern** -- a design aid, not the engineer
of record.

## 2. The tile

### 2.1 `press-fit-pressure` -- The Lam Holding-Force Check `shrink-fit` Defers

```
inputs:
  shaft_dia_in      in    nominal interface diameter D
  interference_in   in    diametral interference (shaft OD minus hub bore)
  hub_od_in         in    hub outer diameter Do (> D)
  modulus_psi       psi   elastic modulus E (steel ~30e6)
  friction_coeff    -     coefficient of friction at the interface (~0.12 dry steel)
  engagement_in     in    axial length of engagement L

p_psi        = (modulus_psi x interference_in / shaft_dia_in) x (hub_od_in^2 - shaft_dia_in^2) / (2 x hub_od_in^2)   [psi]
holding_lb   = p_psi x pi x shaft_dia_in x engagement_in x friction_coeff                                          [lb]
hub_stress   = p_psi x (hub_od_in^2 + shaft_dia_in^2) / (hub_od_in^2 - shaft_dia_in^2)                             [psi]
```

**Pinned worked example (a 2.000 in shaft, 0.002 in interference, 4.000 in hub OD, steel E = 30e6, mu = 0.12, 3 in
engagement).** The contact pressure is
`p = (30e6 x 0.002 / 2) x (16 - 4) / (2 x 16) = 30000 x 0.375 = ` **11,250 psi**; the axial holding force is
`11250 x pi x 2 x 3 x 0.12 = ` **25,447 lb**; and the hub bore stress is `11250 x (16 + 4) / (16 - 4) = ` **18,750 psi**
-- comfortably below steel yield, so the fit grips hard without cracking. **Cross-check (a thin hub grips far less).**
Shrink the hub OD to `2.5 in` (a thin ring): the ratio `(6.25 - 4)/(2 x 6.25) = 0.18` drops the pressure to
`30000 x 0.18 = 5,400 psi` and the holding force to `5400 x pi x 2 x 3 x 0.12 = ` **12,215 lb** -- less than half,
purely from the thinner hub, and the bore stress climbs to `5400 x (6.25+4)/(6.25-4) = 24,600 psi`. The tile returns the
contact pressure, the holding force, and the hub bore stress.

## 3. Wiring

A `tools-data.js` row (group `G`, trades `["machinist", "mechanic", "fabrication"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the thick-hub
example + the thin-hub cross-check); `test/fixtures/compute-map.js` (`press-fit-pressure` -> `computePressFitPressure`
in `../../calc-shop.js`); `scripts/related-tiles.mjs` (-> `shrink-fit` / `bearing-l10-life` / `bolt-proof-load`);
`data/search/aliases.json` ("press fit pressure", "interference fit", "lame equations", "holding force press fit",
"shrink fit holding", "hub bore stress", "forces and fits", "interference contact pressure"); the id appended to the
shop renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the pressure falling as the hub thins, the holding force scaling
with length and friction, the hub stress rising as the hub thins, and the error seams (non-finite, non-positive D /
interference / E / L, hub OD <= D, negative friction). Hand-writes its renderer (mirroring the calc-shop.js `shrink-fit`
pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the pressure / holding / hub-stress stack wraps on a phone); render-no-nan + a11y on the new tile,
output read to the value (the thick-hub example -> 11,250 psi, 25,447 lb).

## 5. Roadmap position

Completes the press-fit pair with `shrink-fit` (the assembly temperature) by supplying the holding-force and hub-stress
check it defers. A dissimilar-material coefficient set, a hollow-shaft variant, and an assembly-force (cold press-on)
estimate are deliberate future follow-ons. Further Group G growth stays evidence-driven.
