# roughlogic.com Specification v805 -- Tailstock Setover for Taper Turning (calc-shop.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`** (Group K), no
> new module, group, or dependency. Inherits spec.md through spec-v804.md. Explore sweep #25 (entry 1), completing the
> lathe-taper cluster beside `taper-calc` (spec-v40) and `taper-diameter` (spec-v650).
>
> **The gap, and the evidence for it.** The catalog computes taper-per-foot / angle (`taper-calc`) and the missing end
> diameter (`taper-diameter`), but not the **tailstock setover** -- the machine offset that actually turns a taper
> between centers. Grep confirmed no tile computes it (0 hits for `tailstock` / `setover` / `set-over` / `taper offset`).
> The number this settles, and the one machinists get wrong: a 12 in part with a 1.500-to-1.000 in taper over 8 in needs
> **0.375 in** of setover -- scaled by the OVERALL length, not the 8 in taper length.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group K
lathe siblings (`taper-calc`, `taper-diameter`): the overall length, both diameters, the taper length, and the setover
carry `L`, and the per-inch setover is dimensionless. The v18/v21 contract: a non-finite input (via `_finiteGuard`), a
non-positive overall or taper length, a large diameter below the small diameter, or a taper length exceeding the overall
length returns `{ error }`. Citation discipline (v19/v22): the tailstock-setover geometry by name (first-principles /
Machinery's Handbook), `GOVERNANCE.general` matching the siblings; the note states that the offset scales with the
overall length (the whole part pivots about the headstock center), that it reduces to (D-d)/2 when the taper runs the
full length, and that the method suits shallow tapers only (steep tapers want a taper attachment or the compound).

## 2. The tile

### 2.1 `tailstock-setover` -- Tailstock Setover for Taper Turning

```
inputs:
  overall_length_in   overall length between centers OAL (in)
  large_dia_in        large taper diameter D (in)
  small_dia_in        small taper diameter d (in)
  taper_length_in     axial length over which the taper runs L (in)

per_inch_setover_in = (D - d) / (2 L)
setover_in          = OAL * per_inch_setover_in     ( = OAL (D - d) / (2 L) )
```

**Pinned worked example.** OAL 12 in, D 1.500 in, d 1.000 in, L 8 in: per-inch = (1.5 - 1.0)/(2 x 8) = 0.03125 in/in;
`S = 12 x 0.03125 = ` **0.375 in**. Cross-check: a taper over the full length (L = OAL) reduces to (D-d)/2 -- a 10 in
part, 1.000-to-0.800 in over 10 in, gives **0.100 in**.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["machinist", "mechanic"]`) beside `taper-diameter`; a `tile-meta.js` `_TILES`
entry (`K`); a `citations.js` entry (tailstock-setover geometry, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the full-length cross-check); `test/fixtures/compute-map.js`
(`tailstock-setover` -> `computeTailstockSetover`); `scripts/related-tiles.mjs` (-> `taper-calc` / `taper-diameter` /
`sine-bar`); `data/search/aliases.json` (5 collision-checked aliases: "tailstock setover", "tailstock offset for taper",
"taper turning between centers", "lathe taper offset", "set over tailstock"); the calc-shop `SHOP_RENDERERS` map entry
via a non-exported renderer with OAL / D / d / L inputs, and the id added to the calc-shop declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the OAL-scaled offset, the full-length reduction, and the error seams. The
calc-shop.js gzip cap is unchanged. Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint.
Home tile count 1,253 -> 1,254.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build (the
local-only module-size gate); `npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the
value (12 / 1.5 / 1.0 / 8 -> 0.375 in).

## 5. Roadmap position

Completes the lathe-taper cluster in the machinist Group K (taper-per-foot, missing diameter, tailstock setover). The
catalog is very saturated; the sweep-25 queue continues (transformer-turns-ratio next). Stays evidence-driven.
