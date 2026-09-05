# roughlogic.com Specification v1550 -- Wind Turbine Tip-Speed Ratio and Rotor Speed (`calc-wind.js`, Group A Electrical, wind energy, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-wind.js`**
> (Group A, Electrical -- the existing category, hub `/groups/electrical/`; wind energy), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Tip speed ratio is the number that says whether a rotor is running where it makes power. It is the blade tip's speed divided by the wind speed, and a turbine held near its design ratio is at peak efficiency while one off it is throwing away energy that no amount of wind recovers.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive rotor diameter, rotor speed, or wind speed returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the tip speed ratio definition and typical design ranges, with IEC 61400 named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`tip speed ratio wind turbine`, `tsr calculation`, `rotor rpm wind speed`, `blade tip speed noise`, `optimum tsr turbine`.

## 2. The tile

### 2.1 `tip-speed-ratio` -- Wind Turbine Tip-Speed Ratio and Rotor Speed

```
tip speed        v_tip = pi x D x rpm / 60          (ft/s)
tip speed ratio  TSR = v_tip / v_wind
design TSR       6 to 8 for a modern three-blade upwind machine
                 lower for many-bladed water pumpers, higher for two-blade
variable speed   the controller holds TSR constant below rated wind
noise limit      tip speed is usually capped near 260 to 290 ft/s by acoustics
```

Below rated wind speed a modern turbine varies its rotor speed to hold the tip speed ratio at its design point,
because power coefficient peaks sharply there -- a few units of TSR either side costs several percent of output.
Above rated wind the machine stops trying: it holds power constant by pitching the blades and the ratio falls
away deliberately.

Tip speed itself is bounded by things other than aerodynamics. Acoustic emission rises steeply with tip speed, so
noise-constrained sites cap rotor rpm and accept a lower ratio; leading-edge erosion from rain and dust also
scales hard with tip speed and is a major maintenance cost on large machines. That is why bigger rotors turn
slower -- a 380 ft rotor at 11.5 rpm and a 130 ft rotor at 33 rpm have similar tip speeds, which is not a
coincidence.

For a technician the useful field version is the reverse check: from a measured rotor rpm and an anemometer
reading, is this machine tracking its design ratio, or is the controller or a pitch fault holding it somewhere
it should not be.

**Inputs:** rotor diameter, rotor speed in rpm, wind speed at hub height, and the design tip speed ratio for comparison

**Outputs:** the tip speed in ft/s and mph, the tip speed ratio, the deviation from the design ratio, the rotor speed that would hold the design ratio at the measured wind, and the wind speed at which a stated rpm hits the tip speed cap

## 3. Worked example

A 380 ft rotor turning 11.5 rpm in an 26 mph wind:

```
tip speed = pi x 380 x 11.5 / 60 = 229 ft/s = 156 mph
TSR       = 229 / (26 x 1.467)  = 229 / 38.1 = 6.00
```

TSR 6.0, right in the 6 to 8 design band -- this machine is tracking correctly.

Now the diagnostic case. If the same rotor were held at 11.5 rpm in a 40 mph wind, the ratio falls to
`229 / (40 x 1.467)` = 3.90 -- which is expected above rated wind, where the machine is
power-limited and pitching. But the same 3.90 at a 40 mph wind BELOW rated would mean the rotor is
not being allowed to speed up, and that is a controller or converter fault worth chasing.

To hold TSR 7.0 at 26 mph the rotor would need
`7.0 x 38.1 x 60 / (pi x 380)` = 13.4 rpm.

## 4. Scope and non-goals

A kinematic ratio from rotor speed and wind speed. It does not predict power or the power coefficient, which
depends on blade design, pitch angle, and Reynolds number as well as on tip speed ratio, and it does not evaluate
whether a controller is behaving correctly across its whole operating envelope. Wind speed must be the hub-height
free-stream speed; a nacelle anemometer sits in the rotor's wake and reads low, and manufacturers apply a
transfer function to correct it that this tile does not know. It does not address blade pitch, yaw, structural
loads, noise emission modelling, or the site's noise limits, and it does not evaluate turbine performance against
a warranted power curve, which is a formal measurement to IEC 61400-12. The turbine manufacturer's operating
parameters and control strategy govern.
