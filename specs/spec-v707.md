# roughlogic.com Specification v707 -- Max One-Way Slab / Beam Span for a Given Depth (calc-concrete.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-concrete.js`** (Group E,
> reinforced concrete), no new module, group, or dependency. Inherits spec.md through spec-v706.md. Sweep-9 inverse queue.
>
> **The gap, and the evidence for it.** The single-mode `rc-slab-min-thickness` tile runs ACI 318-19 forward: from a span
> and support condition it returns the deflection-control minimum thickness. The layout question is the inverse -- **with
> the slab or beam depth already fixed, how long can it span before a deflection check is required**. Since
> `hmin = (12 l / denom) x kfy x klw` is linear in the span, the inverse is `max_span = h x denom / (12 kfy klw)`. The
> number this settles: a **10 in** both-ends-continuous Grade 60 member spans up to **23.3 ft** without an explicit
> deflection calculation.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`rc-slab-min-thickness` sibling: the thickness is `L` (in), the returned span is `L` (ft), `fy` is `M L^-1 T^-2` (psi),
`wc` is `M L^-2 T^-2` (pcf), and the support condition is a categorical select (l/20, l/24, l/28, l/10). To keep the
denom / kfy / klw geometry in one place, the compute calls `computeRcSlabMinThickness` at `l_ft = 1` and divides the
available thickness by the per-foot minimum. The v18/v21 contract: any non-finite input, a non-positive thickness, an
invalid support condition, or a non-positive `fy` or `wc` returns `{ error }`. Citation discipline (v19/v22): the ACI
318-19 minimum-thickness relation solved for the span, `GOVERNANCE.general` matching the sibling; the note states that
**a longer span needs a deflection calculation or a deeper member, that it applies to normalweight (unless wc is set)
members not supporting partitions likely to be damaged by deflection, uses the clear span, is not the strength design,
and the structural engineer of record's stamped design governs**.

## 2. The tile

### 2.1 `rc-slab-max-span-for-thickness` -- Max One-Way Slab / Beam Span for a Given Depth (ACI 318-19)

```
inputs:
  available_thickness_in   L             slab / beam depth (> 0)
  support                  dimensionless simply | one-end | both-ends | cantilever
  fy_psi                   M L^-1 T^-2   steel yield (> 0, default 60000)
  wc_pcf                   M L^-2 T^-2   concrete unit weight (> 0, default 145)

denom = {simply:20, one-end:24, both-ends:28, cantilever:10}
kfy   = (fy == 60000) ? 1 : 0.4 + fy/100000
klw   = (wc >= 145) ? 1 : max(1.65 - 0.005 wc, 1.09)
max_span_ft = available_thickness_in x denom / (12 x kfy x klw)
```

**Pinned worked example.** h = 10 in, both ends continuous (denom 28), Grade 60 (kfy 1.0), normalweight (klw 1.0):
`max_span = 10 x 28 / (12 x 1 x 1) = ` **23.33 ft**; feeding a 23.33 ft span (same support/fy/wc) back through
`rc-slab-min-thickness` returns a 10 in minimum, the input. A simply supported member of the same depth spans only 16.7 ft
(denom 20), so continuity buys span.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`) placed beside `rc-slab-min-thickness` (Group E is
un-audited); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (minimum-thickness relation solved for the span,
`GOVERNANCE.general` matching the sibling); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`rc-slab-max-span-for-thickness` -> `computeRcSlabMaxSpanForThickness`);
`scripts/related-tiles.mjs` (-> `rc-slab-min-thickness` / `rc-beam-flexure` / `joist-deflection` / `rc-beam-shear`);
`data/search/aliases.json` (5 collision-checked question aliases: "max slab span for 10 inch depth", "how far can a beam
span without deflection check", ...); the calc-concrete `CONCRETE_RENDERERS` map entry via the shared `_simpleRenderer`
factory (a thickness field, the support select, fy and wc) and the id added to the calc-concrete declare list in `app.js`;
the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the example, the round-trip through `computeRcSlabMinThickness` across a
thickness/support/fy sweep, the continuity-buys-span monotonicity, and the error seams. The calc-concrete.js gzip cap is
raised 23000 -> 25000 B (this queue adds three concrete inverse tiles; the module was at 94.6%). Verify at build,
including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,155 -> 1,156.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes and check-readme-counts); `npm test`
(+1 fixture, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `node scripts/check-shells.mjs`
and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`; worked-examples runner; 320 px audit;
render + output read to the value (the pinned example -> 23.33 ft for a 10 in both-ends-continuous member).

## 5. Roadmap position

Pairs the forward minimum-thickness tile (`rc-slab-min-thickness`, depth from a span) with its inverse (span from a depth),
the two halves of the deflection-control layout question. Further Group E concrete growth stays evidence-driven.
