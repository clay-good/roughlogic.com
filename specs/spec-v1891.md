# roughlogic.com Specification v1891 -- Paralleled Generator Droop Load Sharing (`calc-reliefpower.js`, Group A Electrical, emergency and temporary power, 1 New Tile)

> **Status: LANDED 2026-09-30 (proposed 2026-09-25). Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-reliefpower.js`**
> (Group A Electrical, hub `/groups/electrical/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** Temporary power often means paralleling whatever units arrived -- different sizes, different governors -- on an isolated bus. In droop, each unit takes load in proportion to its droop slope, not its rating, and a mismatched pair can leave one unit near its limit while the other idles. Nothing in the catalog mentions droop.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: fewer than two units, a non-positive rating or droop, a no-load frequency at or below rated frequency, or a load at or above the combined rating returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): Woodward Application Note 01302, *Speed Droop and Power Generation*, named as the method (droop is a straight-line function of speed reference against fuel position), the governor and paralleling-controls manufacturers named as governing, GOVERNANCE.electrical.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`generator droop load sharing`, `paralleling generators different sizes`, `speed droop kw share`, `isolated bus frequency droop`, `generator paralleling load split`.

## 2. The tile

### 2.1 `generator-droop-load-share` -- Paralleled Generator Droop Load Sharing

```
droop line     each unit: f = f_nl - (f_nl - f_fl) x P / P_rated
               f_fl = rated frequency at full load; f_nl - f_fl = D x f_rated
               (3% droop at 60 Hz: 61.8 Hz no load, 60.0 Hz full load)
stiffness      k_i = P_rated,i / (D_i x f_rated)     (kW per Hz)
bus frequency  f = (sum k_i x f_nl,i - P_load) / sum k_i
unit load      P_i = k_i x (f_nl,i - f)
equal loading  requires every unit to have the SAME droop and the SAME no-load
               setpoint; then each carries the same fraction of its rating
```

On an isolated bus with every governor in droop, the units agree on one frequency and each delivers whatever load
its droop line gives at that frequency. A unit's share is set by how steep its line is and where it starts, which is
the governor setting, not the nameplate. Two units of different sizes share in proportion to their ratings only when
their droop percentages and no-load setpoints match; otherwise the shares depart from the ratings, and which unit
ends up carrying more depends on the slopes and the setpoints together -- which is why the tile solves the system
rather than guessing from the nameplates.

The tile solves the straight-line system directly: every unit's stiffness in kilowatts per hertz, the common bus
frequency that makes the shares add up to the load, and each unit's load and loading percentage. It flags any unit
above its rating before the total is, because that is the failure the mismatch produces -- one unit trips on overload,
the other inherits the whole load, and the bus goes down.

Bus frequency itself falls as load rises in all-droop operation, which is normal and is the price of stable sharing
without a load-sharing controller. The tile reports it so that a frequency-sensitive load can be checked, and shows
what matched settings would do for comparison.

**Inputs:** for each unit, the kW rating, the droop percentage, and the no-load frequency setpoint; the rated frequency; the total load

**Outputs:** each unit's stiffness, the bus frequency, each unit's kW and percentage of rating, an overload flag per unit, and the matched-droop comparison

## 3. Worked example

A 100 kW unit set to 3% droop (61.8 Hz no load) paralleled with a 200 kW unit at 5% droop (63.0 Hz no load), carrying
180 kW:

```
k_A = 100 / (0.03 x 60) = 55.6 kW/Hz      k_B = 200 / (0.05 x 60) = 66.7 kW/Hz
f   = (55.6 x 61.8 + 66.7 x 63.0 - 180) / 122.2 = 60.98 Hz
P_A = 55.6 x (61.8 - 60.98) = 45.5 kW  (45%)
P_B = 66.7 x (63.0 - 60.98) = 134.5 kW (67%)
```

**The small unit carries 45% of its rating and the large one 67%** -- unequal, because the droops differ. The two
reach their ratings together only at 300 kW and 60.0 Hz, because both no-load setpoints were chosen to give rated
frequency at full load; below that the 200 kW unit always runs nearer its limit.

**Set the 200 kW unit's no-load frequency half a hertz high, at 63.5 Hz:**

```
B reaches 200 kW at f = 63.5 - 200 / 66.7 = 60.50 Hz
A at that frequency   = 55.6 x (61.8 - 60.50) = 72.2 kW
total                 = 272 kW
```

**The large unit is at its rating with the bus carrying only 272 of 300 kW** -- the overload the tile flags before the
total says anything is wrong.

**Both units set to 4% droop and 62.4 Hz no load:**

```
f = 60.96 Hz    P_A = 60.0 kW (60%)    P_B = 120.0 kW (60%)
```

**Matched settings put both at 60%** -- the same 180 kW, now shared in proportion to rating.

## 4. Scope and non-goals

A steady-state load-share estimate for governors in droop on an isolated bus, assuming straight-line droop characteristics. It does not model isochronous load sharing with a load-sharing controller, a unit in isochronous with others in droop, paralleling with the utility, transient response to load steps, reactive (kvar) sharing and voltage droop, or synchronizing. Actual governor droop characteristics are only approximately linear. It does not size the units (`generator-sizing`) or derate them (`generator-altitude-temp-derate`). The governor and paralleling-switchgear manufacturers, the qualified technician setting them up, and the AHJ govern.
