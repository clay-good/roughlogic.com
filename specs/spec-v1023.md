# roughlogic.com Specification v1023 -- Embedded Post / Pole Depth, IBC 1807.3 (calc-geotech.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-geotech.js`**
> (Group E), no new module, group, or dependency. Inherits spec.md through spec-v1022.md.
>
> **The gap, and the evidence for it.** Zero hits anywhere for "1807.3", "nonconstrained", "pole embedment",
> or "post embedment": `anchor-embedment` is concrete anchor bond, `post-hole-concrete` is bag-count volume
> only, `pile-length-for-capacity` is axial pile capacity. Nothing answers the question every fence, sign,
> deck-rail, and flagpole installer actually has -- how DEEP does the post go for a lateral load -- even
> though the code gives a closed formula for it. Discovery flagged this the strongest gap in its batch.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: non-finite or
non-positive P / h / b / bearing rate returns `{ error }`. Citation discipline: IBC by section number (the
equations are code text verified via public sources 2026-07-27: UpCodes hosts 1807.3 verbatim; the 1806.3.4
doubling provision confirmed across the 2018/2021/2022/2024 editions). No Table 1806.2 values are shipped --
the lateral-bearing rate is a USER INPUT from the local code or geotech report. `GOVERNANCE.general`.
Renderer: this module's `_simpleRenderer`.

## 2. The tile

### 2.1 `pole-embedment-depth` -- Embedded Post / Pole Depth for Lateral Load (IBC 1807.3)

```
inputs:  lateral_force_lb (P), force_height_ft (h, above grade), post_width_ft (b, diameter of a round
         post/footing or the DIAGONAL of a square one), lateral_bearing_psf_per_ft (from the local code
         table or geotech report; default 150), constraint (nonconstrained | constrained at grade by a
         rigid slab), isolated (no | yes -- 1806.3.4 permits 2x lateral bearing where 1/2 in of motion
         at grade is acceptable, e.g. flagpoles and signs)

compute (nonconstrained, Eq. 18-1): d = 0.5 A (1 + sqrt(1 + 4.36 h / A)), A = 2.34 P / (S1 b),
         S1 = rate x mult x (d/3)  -- evaluated at one-third the embedment, so d appears on both
         sides; solved by bisection and VERIFIED by back-substitution in the fuzzer
compute (constrained, Eq. 18-2):    d^2 = 4.25 P h / (S3 b), S3 = rate x mult x d  -- closed form
         d = cbrt(4.25 P h / (rate x mult x b))
         mult = 2.0 when isolated (1806.3.4), else 1.0
         d over 12 ft -> flagged (the code caps the formula's applicability at 12 ft embedment)

outputs: embedment_ft, embedment_in, s_pressure_psf (S1 or S3 at the solved depth), over_12ft, note
```

**Worked example (pinned).** A 6-ft fence run: P = 200 lb of wind at h = 4 ft on a 6-in-diameter post
(b = 0.5 ft), 150 psf/ft lateral bearing, isolated pole (movement acceptable), nonconstrained:
d = 4.333 ft (52 in) -- the classic "bury a third of it" rule of thumb emerging from the code formula.
Same post without the isolated increase: 5.739 ft. Constrained by a slab: 2.830 ft (isolated) -- restraint
at grade cuts the required depth by a third.

## 3. Scope limits

The formula pair applies to isolated poles/posts resisting lateral load by soil bearing alone -- not braced
poles, not poles carrying masonry or concrete (1807.3.1 requires bracing for those), not group action, and
not vertical capacity (`post-hole-concrete` and the bearing tiles cover other pieces). Embedments past 12 ft
are outside the formula and flagged. The lateral-bearing rate and the AHJ's adopted edition govern; wood
posts need AWPA U1 UC4B treatment per 1807.3.1. A design aid, not the engineer of record.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5. Fuzzer pins the worked example, back-substitution of the
bisection root into Eq. 18-1 (exact), the constrained closed-form identity, constrained <= nonconstrained,
the isolated toggle exactly halving the bearing demand path, monotonicity in P/h/b/rate, the 12-ft flag
seam, and error seams. Trades: fencing + construction (fencing was a 3-tile trade before this).
