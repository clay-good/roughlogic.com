# roughlogic.com Specification v872 -- Caulk / Sealant Cartridge Yield from Joint Size (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v871.md. Glazing / sealant sweep, sharing the bead-
> volume method with `construction-adhesive-tubes`.
>
> **The gap, and the evidence for it.** Nothing gives the **sealant** yield -- how many linear feet a cartridge does for a
> joint size, and the cartridges for a run. Grep confirmed no sealant / caulk tile (`paint-coverage` is area). The number
> this settles: a 10.1 oz cartridge on a 3/8 x 1/4 in joint does **18 ft**, so **500 LF** of joint takes **28 cartridges**
> -- and a big 1/2 x 1/2 in joint burns them at more than double the rate.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the bead-volume
sibling (`construction-adhesive-tubes`): the joint length carries `L`, the cartridge volume is `L^3`, the joint width and
depth carry `L`, the cross-section is `L^2`, the length per cartridge is `L`, and the cartridge count is dimensionless.
The v18/v21 contract: a non-finite or non-positive joint length, cartridge volume, joint width, or joint depth returns
`{ error }`. Citation discipline (v19/v22): the yield identity by name (cross-section = width x depth; length per
cartridge = cartridge volume / cross-section / 12; cartridges = ceil(joint / length per cartridge)),
`GOVERNANCE.general`; the note states that the bead is approximated as a rectangle (a tooled concave joint uses a little
less), that elastomeric sealant runs about a 2:1 width-to-depth with a backer rod setting the depth, that the cartridge
volume comes from the product (a 10.1 oz cartridge is about 20.5 in^3, a 20 oz sausage about 40 in^3), and that the
manufacturer's joint design governs.

## 2. The tile

### 2.1 `sealant-joint-yield` -- Caulk / Sealant Cartridge Yield from Joint Size

```
inputs:
  joint_lf        joint length (ft)
  cartridge_in3   cartridge volume (in^3, default 20.5)
  joint_width_in  joint width (in, default 0.375)
  joint_depth_in  joint depth (in, default 0.25)

cross_in2    = joint_width_in * joint_depth_in
lf_per_cart  = cartridge_in3 / cross_in2 / 12
cartridges   = ceil(joint_lf / lf_per_cart)
```

**Pinned worked example.** Joint 500 LF, 10.1 oz cartridge (20.5 in^3), 3/8 x 1/4 in joint:
`cross = 0.375*0.25 = ` **0.09375 in^2**; `lf/cart = 20.5/0.09375/12 = ` **18.2 ft**; `cartridges = ceil(500/18.2) = `
**28**. Cross-check: a 1/2 x 1/2 in joint has `cross = 0.25 in^2`, `lf/cart = 20.5/0.25/12 = ` **6.83 ft**, and the same
500 LF takes `ceil(500/6.83) = ` **74 cartridges** -- the joint cross-section is the lever.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["glazing", "construction"]`, inside the `// Group E` construction block near
`construction-adhesive-tubes`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry
(`E`); a `citations.js` entry (lf/cart = cartridge volume / (width x depth) / 12, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the wide-joint cross-check); `test/fixtures/compute-map.js`
(`sealant-joint-yield` -> `computeSealantJointYield`, module `../../calc-construction.js`); `scripts/related-tiles.mjs`
(-> `construction-adhesive-tubes` / `coating-coverage-dft` / `paint-coverage`); `data/search/aliases.json` (5
collision-checked aliases: "sealant cartridge yield", "caulk coverage", "sealant joint quantity", "caulk tubes per foot",
"sealant linear feet per tube"); a hand-written renderer in the `CONSTRUCTION_RENDERERS` map mirroring a simple output
renderer (non-exported, so no DOM-sentinel dims row), and the id added to the calc-construction declare list in `app.js`;
the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the cross-section, length per cartridge, cartridge count, and the error seams
(non-positive joint length, cartridge volume, width, depth). The calc-construction.js gzip cap is watched at build. Verify
at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home
tile count 1,320 -> 1,321.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(20.5 / (0.375*0.25) / 12 -> 18.2 ft/cartridge, 28 cartridges).

## 5. Roadmap position

Glazing / sealant tile sharing the bead-volume method with `construction-adhesive-tubes`, serving the glazier, caulker,
and firestop installer (glazing / construction). Stays evidence-driven; the manufacturer's joint design governs.
