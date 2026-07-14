# roughlogic.com Specification v744 -- Spreader Beam Minimum Top-Point Height (calc-rigging.js, Group Z, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-rigging.js`** (Group Z),
> no new module, group, or dependency. Inherits spec.md through spec-v743.md. Explore sweep #13 (entry 3).
>
> **The gap, and the evidence for it.** The `spreader-beam` tile runs the below-the-hook statics forward: from a top-point
> height it returns the top-sling tension. The rigger's question is the inverse -- **the minimum top-point height so the
> top-sling tension stays within the sling WLL**, since a taller rig makes a steeper sling that pulls less. From
> `top_sling_tension = (load/2) / sin(angle)` and `angle = atan(top / (bar/2))`, `angle = asin( load / (2 x WLL) )` and
> `top = (bar/2) x tan(angle)`. The number this settles: a **10,000 lb** load on a **10 ft** bar with **6,000 lb** slings
> needs at least **7.54 ft** of top height.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`spreader-beam` sibling: the load, sling WLL, and bar compression are `M L T^-2` (lb), the bar length and returned height
are `L` (ft), and the sling angle is dimensionless (degrees). It reuses the sibling's below-the-hook statics, solved for
the top-point height. The v18/v21 contract: any non-finite input, a non-positive load, bar length, or sling WLL, or a
**sling WLL at or below half the load** (each top sling carries at least W/2 even hung vertical, so no height works)
returns `{ error }`. Citation discipline (v19/v22): the statics solved for the height, `GOVERNANCE.rigging` matching the
sibling; the note states that a taller rig makes a steeper sling carrying less tension so this is a **floor** (more is
safer), that the WLL must exceed W/2, that the **spreader bar carries the axial compression** shown (check it for
buckling), and that these are engineered below-the-hook devices with the **rating plate governing**.

## 2. The tile

### 2.1 `spreader-beam-min-height` -- Spreader Beam Minimum Top-Point Height

```
inputs:
  load_lb         M L T^-2   total load (lb, > 0)
  bar_length_ft   L          bar length, pick to pick (ft, > 0)
  sling_wll_lb    M L T^-2   top sling WLL, each (lb, > load/2)

angle_min         = asin( load_lb / (2 x sling_wll_lb) )
min_top_height_ft = (bar_length_ft / 2) x tan(angle_min)
bar_compression_lb = (load_lb / 2) / tan(angle_min)
```

**Pinned worked example.** load = 10,000 lb, bar = 10 ft, sling WLL = 6,000 lb:
`angle = asin( 10000 / 12000 ) = asin(0.8333) = 56.44 deg`, `min_top = 5 x tan(56.44) = ` **7.54 ft**. Feeding 7.54 ft back
through `spreader-beam` at the same load and bar returns a 6,000 lb top-sling tension, the WLL. Stronger 8,000 lb slings
lower the minimum height to 4.15 ft.

## 3. Wiring

A `tools-data.js` row (group `Z`, trades `["rigging"]`) placed beside `spreader-beam` (Group Z is not exact-count
audited); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (statics solved for the height, `GOVERNANCE.rigging`
matching the sibling); `test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js`
(`spreader-beam-min-height` -> `computeSpreaderBeamMinHeight`); `scripts/related-tiles.mjs` (-> `spreader-beam` /
`sling-angle` / `cg-load-share`); `data/search/aliases.json` (5 collision-checked question aliases: "spreader beam
height", "how much headroom for spreader", ...); the calc-rigging `RIGGING_RENDERERS` map entry via a hand-written
renderer (three number fields) and the id added to the calc-rigging declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block
pinning the example, the round-trip through `computeSpreaderBeam` across a load/bar/WLL sweep, the higher-WLL-lower-height
monotonicity, the WLL <= load/2 impossibility, and the error seams. The calc-rigging.js gzip cap (28500 B, raised in
spec-v739) holds. Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count
1,192 -> 1,193.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 7.54 ft for a 10,000 lb
load on a 10 ft bar with 6,000 lb slings).

## 5. Roadmap position

Pairs the forward below-the-hook tile (`spreader-beam`, tension from the height) with its inverse (the min height for a
WLL), the two halves of the spreader-rig headroom question. Continues Explore sweep #13; further Group Z rigging growth
stays evidence-driven.
