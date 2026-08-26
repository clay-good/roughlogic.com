# roughlogic.com Specification v1361 -- Time as a Public Health Control Window (calc-kitchen.js, Group O, kitchen and food service, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-kitchen.js`**
> (Group O, kitchen and food service), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Group O has the FDA two-stage cooling curve but nothing for the opposite case: TCS food held with no temperature control at all, under the Food Code's time-as-a-public-health-control provision. The six-hour variant carries a condition -- the food must not exceed 70 F -- and whether it will is a heat-transfer question no tile answers.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive time constant, a starting temperature at or above the ambient temperature, or a window outside the permitted 4-hour and 6-hour options, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): FDA Food Code 3-501.19 (time as a public health control) and Newton's law of heating for the temperature projection, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `tphc-window` -- Time as a Public Health Control Window

```
discard time      = mark time + window
T(t)              = T_ambient - (T_ambient - T_start) x exp(-t / tau)
time to 70 F      = -tau x ln((T_ambient - 70) / (T_ambient - T_start))
```

The Food Code lets a kitchen hold TCS food with no temperature control if it works to a clock instead of a
thermometer. Cold food starting at 41 F or below may be held up to **four hours** and then discarded, with no
temperature condition; or up to **six hours**, but only if the food never exceeds **70 F** during that window,
which must be verified by measurement. Hot food starting at 135 F or above gets four hours. In every case the
food is marked with its start time and discarded at the end -- it may not be returned to refrigeration.

The second and third lines are the part a wall clock cannot answer. Food warming toward room temperature follows
a first-order approach, so whether a pan crosses 70 F inside six hours depends on the room and on the product's
time constant `tau` -- roughly how quickly that pan of that product responds. A deep hotel pan of dense product
in an air-conditioned dining room may never reach 70 F; the same product in a shallow pan in a hot kitchen gets
there in under four hours, and the six-hour option is off the table.

**Inputs:** mark (start) time, window option (4 hr or 6 hr, cold or hot), starting product temperature (F),
ambient temperature (F), product time constant tau (hr).

**Outputs:** discard time, time remaining, projected product temperature at the end of the window, projected time
to reach 70 F, and whether the 6-hour option is supportable.

## 3. Worked example

Potato salad marked out of the walk-in at 41 F into a 75 F dining room, `tau = 4.0 hr` (a full hotel pan), on the
6-hour option marked at 10:30 am:

```
discard time = 10:30 + 6:00 = 4:30 pm
T(6 hr)      = 75 - (75 - 41) x exp(-6/4) = 75 - 7.6  = 67.4 F
time to 70 F = -4 x ln(5 / 34)            = 7.67 hr
```

The pan reaches 70 F at about 6:10 pm, well past the 4:30 pm discard -- so the 6-hour option is supportable here,
subject to the measurement the Food Code still requires. Move the same pan to a 90 F kitchen line and the picture
inverts: it crosses 70 F at 3.58 hr and stands at 79 F by the end of six hours, so only the 4-hour option is
available.

## 4. Scope and non-goals

A planning and verification aid, not a substitute for the written procedure and the measurements the Food Code
requires. TPHC demands a written procedure kept on premises, marking of every unit, discard at the end of the
window, and -- on the 6-hour option -- actual temperature measurement, not a projection. The time constant `tau`
is a property of the specific pan, depth, and product and must be measured, not assumed. The tile does not cover
the exemptions and additional conditions some jurisdictions attach, and several states have not adopted the
6-hour option at all. The FDA Food Code as adopted by the state, and the health inspector, govern.
