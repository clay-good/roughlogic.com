# roughlogic.com Specification v705 -- Masonry Anchor Embedment for a Tension (calc-masonry.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-masonry.js`** (Group E,
> masonry/structural), no new module, group, or dependency. Inherits spec.md through spec-v704.md.
>
> **The gap, and the evidence for it.** The single-mode `masonry-anchor-bolt` tile runs TMS 402 forward: from an
> embedment it returns the allowable tension (the lesser of masonry breakout and steel). The design question is the
> inverse -- **how deep must I set the anchor to carry a required tension**. From the masonry-breakout branch
> `Bab = 1.25 x (pi lbe^2) x sqrt(f'm)`, solving for the embedment gives `lbe = sqrt( T / (1.25 pi sqrt(f'm)) )`, with the
> steel branch `Bas = 0.6 Ab fy` checked as a separate ceiling. The number this settles: **5,000 lb** in **1,500 psi**
> masonry needs **~5.7 in** of embedment (and a 3/4 in A307 bolt's 9,547 lb steel capacity clears it). This is distinct
> from the existing `anchor-embedment` tile, which is the adhesive/grout-bond mechanism, not the TMS 402 breakout cone.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`masonry-anchor-bolt` sibling: the tension and steel capacity are `M L T^-2` (lb), `f'm` and `fy` are `M L^-1 T^-2`
(psi), the bolt area is `L^2`, and the returned embedment is `L` (in). The v18/v21 contract: any non-finite input, or a
non-positive required tension, `f'm`, bolt area, or yield returns `{ error }`. Citation discipline (v19/v22): the TMS 402
masonry-breakout branch solved for the embedment, `GOVERNANCE.general` matching the sibling, citing TMS 402 (ACI 530 /
ASCE 5) and CMHA TEK notes; the note states that **the steel branch is a separate ceiling (a bolt too small yields no
matter how deep), the full-cone Apt is an upper bound so edge distance or overlapping cones deepen the real requirement,
anchor shear (pryout) is a separate check, and the engineer of record's stamped design governs**.

## 2. The tile

### 2.1 `masonry-anchor-embedment` -- Masonry Anchor Embedment for a Tension (TMS 402 ASD)

```
inputs:
  required_tension_lb   M L T^-2      tension the anchor must carry (> 0)
  fm_psi                M L^-1 T^-2   masonry compressive strength (> 0, default 1500)
  ab_in2                L^2           bolt tensile-stress area (> 0, default 0.442 = 3/4 in)
  fy_psi                M L^-1 T^-2   bolt yield (> 0, default 36000 = A307)

lbe_in = sqrt( required_tension_lb / (1.25 x pi x sqrt(fm_psi)) )
apt_in2 = pi x lbe_in^2
bas_lb = 0.6 x ab_in2 x fy_psi           (steel ceiling)
steel_adequate = bas_lb >= required_tension_lb
```

**Pinned worked example.** T = 5,000 lb, f'm = 1,500 psi, Ab = 0.442 in^2, fy = 36,000 psi:
`lbe = sqrt(5000 / (1.25 pi sqrt(1500))) = sqrt(5000 / 152.1) = ` **5.73 in**; feeding a 5.73 in embedment (same f'm/Ab/fy)
back through `masonry-anchor-bolt` returns a masonry breakout Bab of 5,000 lb, the input, and masonry governs (the steel
Bas 9,547 lb clears it). A 12,000 lb demand exceeds the 9,547 lb steel ceiling, so the tile flags that no embedment can
reach it -- a larger bolt is required.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["masonry"]`) placed beside `masonry-anchor-bolt` (Group E is un-audited); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (breakout branch solved for the embedment, `GOVERNANCE.general`
matching the sibling); `test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js`
(`masonry-anchor-embedment` -> `computeMasonryAnchorEmbedment`); `scripts/related-tiles.mjs` (-> `masonry-anchor-bolt` /
`anchor-embedment` / `masonry-prism-fm` / `cmu-wall-flexure`); `data/search/aliases.json` (5 collision-checked question
aliases: "how deep to embed a masonry anchor", "masonry breakout embedment depth", ...); the calc-masonry
`MASONRY_RENDERERS` map entry via the shared `_simpleRenderer` factory (four number fields, a steel-adequacy verdict) and
the id added to the calc-masonry declare list in `app.js`; the `// dims:` annotation directly above the compute;
regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the
round-trip through `computeMasonryAnchorBolt` across a tension/f'm sweep, the stronger-masonry-shallower-embedment
monotonicity, the steel-ceiling flag, and the error seams. The calc-masonry.js gzip cap is expected to hold (verify at
build, including `check-shells`). Lazy-loaded, absent from home first paint. Home tile count 1,153 -> 1,154.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes and check-readme-counts); `npm test`
(+1 fixture, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `node scripts/check-shells.mjs`
and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`; worked-examples runner; 320 px audit;
render + output read to the value (the pinned example -> 5.73 in for 5,000 lb in 1,500 psi masonry).

## 5. Roadmap position

Pairs the forward anchor tile (`masonry-anchor-bolt`, tension from an embedment) with its inverse (embedment from a
required tension), the two halves of the TMS 402 anchor question, and stands apart from the adhesive-bond
`anchor-embedment` tile. Further Group E masonry growth stays evidence-driven.
