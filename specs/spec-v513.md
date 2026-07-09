# roughlogic.com Specification v513 -- Shaft Key and Keyseat Size (calc-machining.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`**
> (Group K, the machining bench); no new module, group, or dependency. Inherits spec.md through spec-v512.md.
>
> **The gap, and the evidence for it.** Cutting a keyseat for a pulley or coupling is everyday machinist work, and the
> bench has no tile for it. ANSI B17.1 sets the standard key width from the **shaft-diameter band**, not exactly `D/4`,
> and the two traps are the depth and the length. The **shaft** keyseat is cut to half the key height (`H/2`), which is
> the depth machinists mis-read off the full key height and cut too deep, weakening the shaft. And a key **longer than
> the hub** adds no torque capacity -- the hub is the limit -- so paying for a long key past the hub length is wasted.
> The tile takes the shaft diameter (and, optionally, the transmitted torque and key length), and returns the standard
> key width, the shaft and hub keyseat depths, and the shear and bearing stresses in the key, so the keyseat is cut to
> the standard and the key is checked against the torque it carries.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The shaft diameter, key
width, key height, keyseat depths, and key length are lengths (`L`, in inches); the transmitted torque is `M L^2 T^-2`
(in in-lb); the shear and bearing stresses are stresses (`M L^-1 T^-2`, in psi). The v18/v21 contract: any non-finite
input, a non-positive shaft diameter, or (when the stress check is requested) a non-positive torque or key length
returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the key-size relations by name (ANSI B17.1
Keys and Keyseats; Machinery's Handbook); `editionNote` names the **ANSI B17.1 key and keyseat sizing**, prints the
standard key width from the shaft-diameter band, `shaft_keyseat_depth = key_height / 2`,
`hub_keyseat_depth = key_height / 2`, `shear_stress = 2 x T / (D x W x L)`, and
`bearing_stress = 4 x T / (D x H x L)`, and states that **the key width comes from the shaft-diameter band table not
exactly D/4, the shaft keyseat is cut to half the key height (over-cutting weakens the shaft), a key longer than the hub
adds no capacity so the hub length limits the key, and the material allowables and the fit class govern** -- a design
aid, not the engineer of record.

## 2. The tile

### 2.1 `keyseat-key-size` -- The Band-Table Width and H/2 Depth Machinists Mis-Read

```
inputs:
  shaft_diameter_in   in    shaft diameter D
  torque_in_lb        in-lb transmitted torque (0 = geometry only)
  key_length_in       in    key length L (0 = geometry only)

key_width  = standard width from the ANSI B17.1 shaft-diameter band (e.g. 7/8..1-1/4 in -> 1/4 in)   [in]
key_height = square key: = key_width (rectangular per table)                                          [in]
shaft_keyseat_depth = key_height / 2                                                                  [in]
shear_stress   = torque > 0 ? 2 x torque / (shaft_diameter_in x key_width x key_length_in) : null     [psi]
bearing_stress = torque > 0 ? 4 x torque / (shaft_diameter_in x key_height x key_length_in) : null    [psi]
```

**Pinned worked example (a 1.000 in shaft, 1,000 in-lb torque, 1.5 in key).** The 1 in shaft falls in the 7/8 to
1-1/4 in band, so the standard key is a **1/4 in square** (`W = H = 0.25`), and the shaft keyseat is cut to
`0.25 / 2 = ` **0.125 in** deep. The key shear stress is `2 x 1000 / (1.0 x 0.25 x 1.5) = ` **5,333 psi** and the
bearing stress on the keyseat wall is `4 x 1000 / (1.0 x 0.25 x 1.5) = ` **10,667 psi** -- both well under a steel key's
allowables, so the standard key carries the torque. **Cross-check (a longer key past the hub buys nothing).** The hub is
only 1.0 in long: a key cut to `1.5 in` engages just the 1.0 in of hub, so the effective length for capacity is 1.0 in
and the stresses rise accordingly (`2 x 1000 / (1.0 x 0.25 x 1.0) = 8,000 psi` shear) -- the reminder that the hub, not
the key stock, sets the working length. The tile returns the key width and height, the shaft keyseat depth, and the
shear and bearing stresses.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["machinist"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the standard-key example + the
hub-limited cross-check); `test/fixtures/compute-map.js` (`keyseat-key-size` -> `computeKeyseatKeySize` in
`../../calc-machining.js`); `scripts/related-tiles.mjs` (-> `countersink-depth` / `shrink-fit` / `press-fit-pressure`);
`data/search/aliases.json` ("key size", "keyseat", "keyway", "ansi b17.1", "shaft key", "key shear stress", "square
key", "keyseat depth"); the id appended to the machining renderers declare in `app.js`; the `// dims:` annotation;
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the band-table width by
shaft diameter, the H/2 depth, the shear and bearing stress formulas, and the error seams (non-finite, non-positive
shaft diameter, non-positive torque / length when the stress check is on). Hand-writes its renderer (mirroring the
calc-machining.js pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the width / depth / stress stack wraps on a phone); render-no-nan + a11y on the new tile, output
read to the value (the 1 in shaft example -> 1/4 in key, 5,333 psi shear).

## 5. Roadmap position

Adds keyseat sizing beside `press-fit-pressure` and `shrink-fit` (the other shaft-to-hub joints). A key-length-for-
torque solver (the length needed to hold a given torque at an allowable) and a Woodruff-key variant are deliberate
future follow-ons. Further Group K growth stays evidence-driven.
