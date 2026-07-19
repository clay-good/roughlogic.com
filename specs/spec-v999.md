# roughlogic.com Specification v999 -- Bagged Concrete Count for a Small Pour (calc-concrete.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-concrete.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v998.md. Beside `post-hole-concrete` and the
> `concrete` (cubic-yard) tile.
>
> **The gap, and the evidence for it.** `concrete` gives cubic yards for a ready-mix order and `post-hole-concrete`
> counts bags for a CYLINDRICAL hole-minus-post, but nothing counts bags for a small RECTANGULAR pour (a pad, footing,
> curb, or equipment base) -- the most common bag-mix job. Grep confirmed no rectangular bag-count tile. The number
> this settles: a 4 x 4 ft pad, 4 in thick, takes **10** of the 80 lb bags.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut), bounds-fuzzer, worked-example registry, and
reviewer-signoff apply. The v18/v21 contract: a non-finite input, a non-positive dimension or bag yield, or a negative
waste returns `{ error }`. Citation discipline (v19/v22): the bagged-concrete count by name (manufacturer bag yield;
Quikrete / Sakrete), `GOVERNANCE.general`; the note gives the per-bag yields (80 lb ~0.60, 60 lb ~0.45, 50 lb ~0.375,
40 lb ~0.30 ft^3), notes the round-up and the ~1 cu yd (~45 of the 80 lb bags) ready-mix crossover, and stresses that
the printed bag yield, the real formwork, and the mix design govern.

## 2. The tile

### 2.1 `concrete-premix-bags` -- Bagged Concrete Count for a Small Pour

```
inputs:
  length_ft      pour length (ft), default 4
  width_ft       pour width (ft), default 4
  thickness_in   thickness (in), default 4
  bag_yield_ft3  yield per bag (ft^3): 80 lb 0.60, 60 lb 0.45, 50 lb 0.375, 40 lb 0.30, default 0.60
  waste_pct      waste allowance (%), default 10

volume_ft3 = length_ft x width_ft x (thickness_in / 12)
bags       = ceil(volume_ft3 x (1 + waste_pct/100) / bag_yield_ft3)
```

**Pinned worked example.** 4 x 4 ft pad, 4 in thick, 80 lb bags (0.60 ft^3), 10% waste: `volume = 4 x 4 x 4/12 = 5.33
ft^3`; `bags = ceil(5.33 x 1.10 / 0.60) = ceil(9.78) = ` **10 bags**. Cross-check: the same pad with 60 lb bags (0.45
ft^3): `bags = ceil(5.33 x 1.10 / 0.45) = ceil(13.04) = ` **14 bags** (smaller bags yield less, so more of them).

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["concrete", "construction"]`, beside `post-hole-concrete`); a `tile-meta.js`
`_TILES` entry (`E`); a `citations.js` entry (manufacturer bag yield, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the 80 lb base plus the 60 lb cross-check, pinning the volume and bag count);
`test/fixtures/compute-map.js` (`concrete-premix-bags` -> `computeConcretePremixBags`, module
`../../calc-concrete.js`); `scripts/related-tiles.mjs` (-> `concrete` / `post-hole-concrete` / `self-leveler-bags`);
`data/search/aliases.json` (5 collision-checked aliases: "concrete bags", "premix concrete", "bags of concrete",
"quikrete bags", "bagged concrete"), then `node scripts/build-alias-shards.mjs`; the tile is rendered by the
`_simpleRenderer` factory in the `CONCRETE_RENDERERS` map, and the id added to the calc-concrete declare list in
`app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings;
a `bounds-fuzzer.test.js` block pinning both examples, the ceil boundary, the more-waste / thicker-pour directions, and
the error seams. The calc-concrete.js gzip cap and the Group E group shell are watched at build (cap raised for this
tile). Home tile count 1,447 -> 1,448.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(4 x 4 ft x 4 in / 0.60 -> 10 bags).

## 5. Roadmap position

Small-pour concrete beside `post-hole-concrete`, serving the handyman / fence / deck / concrete contractor (concrete,
construction). Deliberately the material-ordering estimate; the printed bag yield, the true formwork dimensions, and the
mix design govern. Stays evidence-driven. Continues the concrete-takeoff sweep at 1 new spec (v999).
