# roughlogic.com Specification v879 -- Adhesive-Anchor Epoxy Cartridge Volume (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v878.md. Anchoring sweep, beside the `concrete-anchor`
> tiles.
>
> **The gap, and the evidence for it.** The catalog sizes anchor capacity but nothing gives the **epoxy** to set adhesive
> anchors -- the annular volume per hole and the cartridges. Grep confirmed no epoxy-volume tile. The number this settles:
> 40 holes of a 5/8 in bar in a 3/4 in hole at 6 in embedment is **0.81 in^3** each -- about **3 cartridges** with waste --
> and deeper embedment or a bigger hole runs it up fast.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
anchoring pattern: the hole diameter, bar diameter, and embedment carry `L`, the hole count and waste are dimensionless,
the cartridge volume is `L^3`, the per-hole and total volumes are `L^3`, and the cartridge count is dimensionless. The
v18/v21 contract: a non-finite or non-positive hole count, hole diameter, embedment, or cartridge volume returns
`{ error }`; a bar diameter at or above the hole (a non-positive annulus) returns `{ error }`; a negative waste returns
`{ error }`. Citation discipline (v19/v22): the epoxy-volume identity by name (per hole = pi/4 x (hole^2 - bar^2) x
embedment; cartridges = ceil(holes x per hole x (1 + waste) / cartridge volume)), `GOVERNANCE.general`; the note states
that this is the annular fill between the bar and the hole, that the hole diameter comes from the adhesive manufacturer's
printed installation instructions (oversized relative to the bar), that the waste covers the mixing-nozzle purge at each
cartridge start, and that this is distinct from the `concrete-anchor` capacity calcs.

## 2. The tile

### 2.1 `anchor-epoxy-volume` -- Adhesive-Anchor Epoxy Cartridge Volume

```
inputs:
  holes         number of anchors (count)
  hole_dia_in   drilled hole diameter (in)
  bar_dia_in    anchor / rebar diameter (in)
  embed_in      embedment depth (in)
  cartridge_in3 cartridge volume (in^3, default 15.3)
  waste_pct     nozzle-purge waste (percent, default 10)

per_hole_in3 = (PI/4) * (hole_dia_in^2 - bar_dia_in^2) * embed_in
total_in3    = holes * per_hole_in3 * (1 + waste_pct/100)
cartridges   = ceil(total_in3 / cartridge_in3)
```

**Pinned worked example.** Holes 40, 3/4 in hole, 5/8 in bar, 6 in embed, 15.3 in^3 cartridge, 10% waste:
`per hole = (PI/4)*(0.75^2 - 0.625^2)*6 = ` **0.810 in^3**; `total = 40*0.810*1.10 = ` **35.6 in^3**;
`cartridges = ceil(35.6/15.3) = ` **3**. Cross-check: a deeper 9 in embedment is `1.215 in^3` per hole, `53.5 in^3`, and
`ceil(53.5/15.3) = ` **4 cartridges** -- embedment scales the fill linearly.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["concrete", "construction"]`, inside the `// Group E` construction block near
`concrete-anchor-pullout`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (per hole = pi/4 (hole^2 - bar^2) x embed; cartridges = ceil(total(1+waste)/cartridge),
`GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the pinned example plus the deeper-embed cross-check);
`test/fixtures/compute-map.js` (`anchor-epoxy-volume` -> `computeAnchorEpoxyVolume`, module `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `concrete-anchor-pullout` / `baseplate-grout-volume` / `annular-grout-volume`);
`data/search/aliases.json` (5 collision-checked aliases: "anchor epoxy volume", "adhesive anchor cartridges", "epoxy
anchor quantity", "rebar dowel epoxy", "anchor adhesive volume"); a hand-written renderer in the `CONSTRUCTION_RENDERERS`
map mirroring a simple output renderer (non-exported, so no DOM-sentinel dims row), and the id added to the
calc-construction declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the per-hole and total volume, the cartridge count,
and the error seams (non-positive holes, hole dia, embed, cartridge; bar >= hole; negative waste). The calc-construction.js
gzip cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded,
absent from home first paint. Home tile count 1,327 -> 1,328.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(ceil(40*(PI/4)*(0.75^2-0.625^2)*6*1.10/15.3) -> 3 cartridges).

## 5. Roadmap position

Anchoring takeoff beside the `concrete-anchor` capacity tiles and `baseplate-grout-volume`, serving the concrete /
installation contractor (concrete / construction). Stays evidence-driven; the adhesive manufacturer's instructions govern
the hole size.
