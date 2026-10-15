# roughlogic.com Specification v1963 -- Riser Feeding Distance (`calc-process.js`, Group G, 1 New Tile)

> **Status: LANDED 2026-10-14. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group G, the
> foundry bench in `calc-process.js`, no new dependency and no network call.
>
> **The gap.** `riser-modulus-feeding` sizes a riser on modulus and volume and says, in its own assumptions, that how
> far the riser reaches along a section "is a separate limit". Nothing computed that limit, and a riser big enough to
> stay liquid still leaves centerline shrinkage midway along a section it cannot reach.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: a non-positive
thickness or width, a width below the thickness, a negative feeding length, an unknown sand, cooling or grade, or a
superheat outside 54 to 450 F returns `{ error }`. Citation: Carlson, Ou and Beckermann (SFSA 2003) by name,
GOVERNANCE.general. Aliases: `feeding distance riser` (moved from the riser-modulus tile), `riser feeding distance
steel`, `how far will a riser feed`, `centerline shrinkage plate casting`, `end chill feeding distance`.

## 2. The tile

### 2.1 `riser-feeding-distance`

| Quantity | Relation |
|---|---|
| Base end-effect rule (AISI 1025, furan, 60 C superheat) | FD/T = -4.29e-4 (W/T)^4 + 0.0174 (W/T)^3 - 0.266 (W/T)^2 + 1.99 (W/T) + 1.97 to W/T 15; 9.0 beyond (Eq. 1) |
| Other conditions | FD/T = (FD/T)base x C_superheat x C_alloy x C_sand x C_cooling (Eq. 2, Table 2) |
| Sand | furan 1, green sand 1.09, zircon 0.96, chromite 0.88 |
| Cooling | end effect 1, end chill 1.19, drag chill 0.95 |
| Superheat | 30 C 0.94, 60 C 1, 90 C 1.06, 120 C 1.12, 150 C 1.18, 250 C 1.38, linear between rows |
| Lateral (two top risers) | LFD = 0.48 FD (without the cooling multiplier) for W/T up to 7 (Ou et al., MMTB 33B 2002, Eq. 1); none past 7 |
| Check | sound when the furthest point is within FD of the riser EDGE |

Grades carry Table 2's eight carbon and low-alloy and seven high-alloy multipliers (0.86 to 1.036).

## 3. Worked examples (registry rows)

- 2 by 8 in section (W/T 4), 1025, furan, end effect, 108 F: FD/T 6.6778, FD 13.36 in; a point 12 in out is sound.
- p. 13 of the paper: 100 C (180 F) superheat gives C_superheat 1.08.
- p. 13: 158 C (284 F) "has a multiplier of almost 1.2" (1.196); with CF-8M at 0.06 C (0.978).
- Cross-check against the paper's Table 1 trials (not a registry row): a 1 by 5.5 in CF-8M plate at 132 C
  superheat computes FD 8.25 in; the 7.0 in plates cast sound and the 9.4 in plates began to show shrinkage.

## 4. Not in scope

Lateral feeding past W/T 7 (a chart only), side risers, and the thin-section credit for gating through the riser are
named in the note, not computed.
