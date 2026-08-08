# roughlogic.com Specification v1232 -- Masonry Anchor Bolt in Shear (calc-masonry.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-masonry.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v1231.md.
>
> **The gap.** Sibling names the gap: `masonry-anchor-bolt` (spec-v449) and `masonry-anchor-embedment` (spec-v705)
> cover a headed anchor in tension and both state "anchor shear (pryout) is a separate check." This is that check.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input (via `_finiteGuard`), or a non-positive f'm / embedment / edge distance / bolt area / yield returns
`{ error }`. Citation discipline (v19/v22): TMS 402-16 ASD Section 8.1.5.2, `GOVERNANCE.general`, distinct from the
tension `masonry-anchor-bolt` tile. **No copyrighted table is reproduced** -- the four closed-form equations, with the
crushing coefficient verified directly against the free NCMA TEK 12-03A.

## 2. The tile

### 2.1 `masonry-anchor-shear` -- Masonry Anchor Bolt in Shear (TMS 402 ASD)

```
Bvb (breakout) = 1.25 * Apv * sqrt(f'm)      Apv = pi * lbe^2 / 2   (lbe = edge distance)
Bvc (crushing) = 350 * (f'm * Ab)^(1/4)
Bvpry (pryout) = 2.0 * Bab                    Bab = 1.25 * (pi * lb^2) * sqrt(f'm)   (lb = embedment)
Bvs (steel)    = 0.36 * Ab * fy
Bv = min(Bvb, Bvc, Bvpry, Bvs)
```

**Inputs:** masonry strength f'm (psi), effective embedment lb (in), edge distance lbe (in), bolt tensile area Ab
(in^2), bolt yield fy (psi).

**Outputs:** the allowable shear Bv and the governing mode, plus each of the four branch capacities and Apv.

## 3. Worked example

`f'm = 1,500 psi, lb = 5 in, lbe = 4 in, Ab = 0.442 in^2 (3/4 in), fy = 36,000 psi (A307)`:

```
Apv   = pi * 4^2 / 2 = 25.13 in^2
Bvb   = 1.25 * 25.13 * sqrt(1500) = 1,217 lb   <- governs (edge-controlled)
Bvc   = 350 * (1500 * 0.442)^(1/4) = 1,776 lb
Bvpry = 2.0 * (1.25 * pi * 25 * sqrt(1500)) = 7,605 lb
Bvs   = 0.36 * 0.442 * 36000 = 5,728 lb
Bv    = 1,217 lb
```

Cross-check: the same bolt away from an edge (lb 8, lbe 10) lifts breakout to 4,866 lb, so crushing at 1,776 lb governs;
a very shallow embedment (lb 1.5) drops pryout until it governs.

## 4. Coefficient verification and non-goals

The crushing coefficient `350 * (f'm * Ab)^(1/4)` is confirmed verbatim in NCMA TEK 12-03A (stable across editions).
The shear-steel `0.36 * Ab * fy` is the edition-stable `0.6 x` the tension-steel `0.6 * Ab * fy` (TEK 12-03A: the old
`0.12 = 0.6 x 0.2`). Breakout `1.25 * Apv * sqrt(f'm)` parallels the verified in-repo tension breakout; pryout is the
standard `2.0 x Bab`. The full half-cone Apv is an upper bound (edge/overlap reductions and the < 12 db breakout
reduction are separate), and the combined tension+shear unity check is a separate step. A design aid; the engineer of
record's stamped design governs.
