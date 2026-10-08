# roughlogic.com Specification v1929 -- Wood Connection Row and Group Tear-Out (NDS Appendix E) (`calc-construction.js`, Group E, 1 New Tile)

> **Status: LANDED 2026-10-08. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group E, the
> NDS wood bench in `calc-construction.js`, no new dependency and no network call.
>
> **The gap.** `wood-bolt-connection` gives a bolt's yield value and `wood-tension-member` the net section, and the
> tension-member note said "row/group tear-out is separate". No tile computed it, though in a closely spaced bolt
> group it often governs before any bolt yields.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: a non-positive
thickness, depth, hole, end distance, Fv', or Ft'; a fractional or zero row or bolt count; an in-row or row spacing
not greater than the hole; a group wider than the member; or a negative bolt capacity returns `{ error }`.
Citation: NDS Appendix E by name, worked as AWC Wood Design Focus (Winter 2002) Example 1 (free), GOVERNANCE.general.
Aliases: `row tear-out`, `group tear-out`, `nds appendix e`, `bolt group tear out wood`, `wood connection block shear`.

## 2. The tile

### 2.1 `wood-row-group-tearout` -- Wood Connection Row and Group Tear-Out (NDS Appendix E)

| Quantity | Relation |
|---|---|
| Net section | Z'NT = Ft' t (d - n_row Dh) |
| Row tear-out | Z'RTi = n_i Fv' t s_crit, s_crit = min(end distance, in-row spacing); Z'RT = sum over rows |
| Group tear-out | Z'GT = Z'RT-1/2 + Z'RT-n/2 + Ft' t (n_row - 1)(s_row - Dh) |
| Connection | least of the three and the bolt group capacity n Z' when entered |

Interior rows may hold a different count (a staggered pattern); blank means the outer count. A one-bolt row uses the
end distance alone.

## 3. Worked examples (registry rows)

AWC Wood Design Focus Example 1: 3-1/8 x 12 glulam, Fv' 240, Ft' 1,450 psi, eight 1 in bolts in rows of 3, 2, 3 at
2.5 in, end 7 in, spacing 4 in, n Z' 35,040 lb. Printed: Z'NT 39,930, Z'RT 24,000, Z'GT 22,030 lb (governs). The tile
gives 39,932, 24,000 and 22,027 lb.

STRUCTURE magazine, Design of Bolted Connections per the 2015 NDS: 2x12 No. 2 SP, two rows of three 1 in bolts,
Fv' 218.75, Ft' 562.5 psi. Printed: Z'RT 7,875, Z'GT 6,418 (governs), Z'NT 7,706 lb; the tile gives 7,875, 6,416 and
7,699 lb (the article rounds its areas to 4.41 and 13.7 sq in).
