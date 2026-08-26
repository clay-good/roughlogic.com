# roughlogic.com Specification v1431 -- Insulating Glass U-Factor and Interior Condensation Screen (calc-construction.js, Group E, specialty trades, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`**
> (Group E, specialty trades), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog computes assembly R-values and dew point for wall sections but nothing for glazing, which is both the weakest thermal element in most buildings and the one that condenses first. A U-factor is a resistance sum and an interior glass surface temperature is one more step, and the pair together answer the winter complaint call.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive film or gap resistance, an indoor temperature at or below the outdoor temperature, or a relative humidity outside 0-100 percent, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the series-resistance U-factor summation with the standard ASHRAE indoor and outdoor air film resistances, and the interior-surface temperature relation T_surface = T_in - U x R_indoor film x (T_in - T_out), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `igu-u-factor` -- Insulating Glass U-Factor and Interior Condensation Screen

```
R_total   = R_indoor film + R_glass + R_gap + R_glass + R_outdoor film
U         = 1 / R_total
T_surface = T_indoor - U x R_indoor film x (T_indoor - T_outdoor)
condensation when T_surface < the indoor dew point
```

Everything in a glazing unit is in series, so the resistances add and the U-factor is the reciprocal. What is
striking is how little the *glass* contributes: a light of glass is about R-0.03, essentially nothing, and the
entire performance of an insulating unit lives in the gap and in the air films. Which is exactly why low-emissivity
coating and argon fill work -- they attack the gap, which is the only meaningful resistance in the stack-up.

The surface temperature line is what turns a U-factor into a service call. Interior glass runs colder than the
room by a fraction of the indoor-outdoor difference, and that fraction is `U x R_indoor film`. A poor unit puts
the glass far below room temperature and it condenses; a good one keeps it up. This is the honest answer to "my
new windows are sweating," which is usually not a window defect at all but an indoor humidity that the old, leaky
windows were quietly removing.

**Inputs:** number of lites and their resistance, gap resistance for the fill and coating, indoor and outdoor air
film resistances, indoor and outdoor temperature, indoor relative humidity.

**Outputs:** total R, U-factor, interior glass surface temperature, indoor dew point, and the relative humidity at
which condensation would begin.

## 3. Worked example

Compare a clear double-glazed unit against a low-e argon unit, both at 70 F indoors and 0 F outdoors, with
standard air films (R-0.68 indoors, R-0.17 outdoors) and R-0.03 per light:

```
clear, 1/2 in air gap R-1.02:
  R = 0.68 + 0.03 + 1.02 + 0.03 + 0.17 = 1.93   U = 0.518
  T_surface = 70 - (0.518 x 0.68) x 70          = 45.3 F

low-e with argon, effective gap R-2.13:
  R = 0.68 + 0.03 + 2.13 + 0.03 + 0.17 = 3.04   U = 0.329
  T_surface = 70 - (0.329 x 0.68) x 70          = 54.3 F
```

Nine degrees of interior surface temperature, from one coating and one gas fill. At 40% indoor relative humidity
the dew point is about 44.5 F, so the clear unit at 45.3 F is within a degree of running with water on it and the
low-e unit has nine degrees of margin. Raise the indoor humidity to 55% -- an ordinary winter kitchen -- and the
dew point climbs to about 53 F: the clear unit condenses heavily and the low-e unit is now the one within a degree
of trouble.

## 4. Scope and non-goals

Center-of-glass performance only, which is the *best* part of a window. The whole-window U-factor is worse,
because the edge of the glass, the spacer, and the frame all conduct more than the center -- an NFRC-rated
whole-window U-factor is the number that belongs on a code compliance form, and it is not this one. Gap
resistances depend on gap width, fill gas, coating emissivity and its surface position, and the temperature
difference itself, so published values are condition-specific. The tile does not address solar heat gain (its own
tile), air leakage, condensation resistance ratings, or the frame and sill condensation that is usually worse than
the glass. NFRC ratings, the manufacturer's data, and the adopted energy code govern.
