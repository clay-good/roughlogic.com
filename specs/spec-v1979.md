# roughlogic.com Specification v1979 -- Conduit Segment Bend Layout (`calc-fab.js`, Group A Electrical, 1 New Tile)

> **Status: LANDED 2026-10-19 (proposed 2026-10-19). Single-tile spec. As built: `conduit-90-stub` already had a segmented-90 mode (shot count from a per-shot angle, 90 only); this tile extends it to any angle up to 180 with the mark layout and radius check, and that tile's note now points here. A radius under the entered minimum returns a TOO TIGHT verdict with the layout rather than an error. An independent review found the drafted chord 2 R tan(theta / 2n) cannot be built (the tube between shots stays DL / n long), so the tile reports the effective radius the shots make, checks THAT against the minimum (two 90 degree shots on a 20 in layout make 15.7 in), and computes the gain from it; this text was corrected to match.** Part of [scope-product-expansion](scope-product-expansion.md). In scope under the
> spec-v106 trades-only charter: Group A, the conduit-bending bench in `calc-fab.js` beside `conduit-offset`,
> `conduit-saddle` and `conduit-90-stub`, no new dependency and no network call.
>
> **The gap.** The bending bench covers the offset, the saddle, the 90 and the back-to-back, all of them bends a
> hand or mechanical bender makes in one shoe. A large-radius sweep -- the 36 in radius a 4 in rigid run needs at a
> transformer pad, or the sweep that keeps a fiber duct inside its minimum radius -- is made as a segment bend: many
> small shots, equally spaced along the developed length. Nothing laid it out, and the arithmetic (the developed
> length, the degrees per shot, the spacing) is exactly what gets done on a scrap of cardboard beside the bender.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds fuzzer, worked-example registry and the v18/v21 contract apply: a non-positive
radius, an angle outside (0, 180], fewer than 2 shots or more than 60, or a minimum radius larger than the entered
radius returns `{ error }`. Citation: circular-arc geometry (developed length = radius x angle in radians; effective radius of the shot polygon = (DL / n) / (2 tan(theta / 2n))), first principles, with NEC 2023 Chapter 9 Table 2 named as the source of the minimum bending radius the
reader enters, GOVERNANCE.general. Aliases: `segment bend conduit`, `segmented 90 degree bend`, `large radius conduit
bend shots`, `degrees per shot conduit`, `developed length of a conduit bend`.

## 2. The tile

### 2.1 `conduit-segment-bend` -- Conduit Segment Bend Layout

```
developed length   DL = R x theta x pi / 180, R the centerline radius (in), theta the
                   total bend (deg)
shots              n equal shots, each theta / n degrees
arc spacing        DL / n between shot marks, the first mark DL / (2 n) in from the
                   start of the bend so the shots straddle the arc evenly
effective radius   r = (DL / n) / (2 tan(theta / (2 n))): the tube between shots keeps
                   its length, so the bent polygon is tangent to this slightly smaller
                   circle; approaches R as n grows
gain               2 r tan(theta / 2) - DL for any angle under 180: the length saved by
                   bending instead of running the two tangents to their intersection
minimum radius     entered from NEC Chapter 9 Table 2, Other Bends column (or the
                   raceway's own listing); an effective radius under it is TOO TIGHT
```

A segment bend replaces one impossible shoe with many possible ones. The arc has a developed length of R theta, and
dividing that length into n equal pieces and bending theta / n at the center of each piece produces a polygon tangent
to a circle slightly smaller than R, which converges on the intended arc as the shot angle shrinks. The marks go at DL / n
intervals starting half an interval in, which is the detail most often got wrong: starting at the first mark with a
full interval leaves the last shot half an interval short of the end of the bend.

The number of shots is the reader's choice within the bender's habits. Ten degrees per shot is common for a 90 (nine
shots); fewer, larger shots produce a visible polygon and a tighter effective radius at each kink, which is what the
minimum-radius rule is protecting against. The tile reports the effective radius the shots make so the reader can see how
far the finished bend departs from a true arc, and checks that radius against the minimum.

The minimum radius is not computed. NEC Chapter 9 Table 2 lists it per trade size for conductors, and a fiber or
coaxial raceway carries its own, so the tile takes it as an input and flags a layout whose effective radius is tighter than it.

**Inputs:** the centerline radius, the total bend angle, the number of shots, and the minimum bending radius from the
table or listing

**Outputs:** the developed length, degrees per shot, the arc spacing and first-mark offset, the effective radius, the
gain, and a pass/fail of the effective radius against the minimum radius

## 3. Worked example

A 90 degree sweep at a 36 in centerline radius in nine shots, minimum radius from the table 20 in:

```
DL          = 36 x 90 x pi / 180 = 56.55 in
per shot    = 90 / 9 = 10 deg
arc spacing = 56.55 / 9 = 6.28 in; first mark at 3.14 in
r_eff       = 6.28 / (2 tan(5 deg)) = 35.91 in
gain        = 2 x 35.91 - 56.55 = 15.27 in
radius      35.91 in >= 20 in minimum: ok
```

**The effective radius is 0.09 in under the layout radius:** at 10 degrees per shot the polygon is indistinguishable
from the arc, which is why nine shots is the habit. At six shots of 15 degrees on a 24 in radius the same numbers are
DL 37.70 in, spacing 6.28 in, r_eff 23.86 in; at 45 degrees in five shots on a 48 in radius, DL 37.70 in, 9 degrees per
shot, spacing 7.54 in, r_eff 47.90 in.

## 4. Scope and non-goals

A layout aid for a bender, not a bending-machine program. It does not account for the bender's own take-up, deduct,
springback or shoe radius, model the kink each shot makes, address concentric bends alongside this one
(`conduit-concentric-bend`), or look up the minimum radius table, which is the reader's from the NEC or the raceway
listing. The NEC as adopted and the raceway's listing govern; free at nfpa.org/freeaccess.
