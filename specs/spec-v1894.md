# roughlogic.com Specification v1894 -- MPPT Charge Controller Output Current (`calc-reliefpower.js`, Group A Electrical, emergency and temporary power, 1 New Tile)

> **Status: LANDED 2026-09-30 (proposed 2026-09-25). Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-reliefpower.js`**
> (Group A Electrical, hub `/groups/electrical/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** An MPPT controller is sized by the current it delivers to the battery, and that current is set by array watts and battery voltage -- not by the array's short-circuit current, which is what `pv-circuit-ampacity` works from. The same 3,200 W array needs a 270 A controller on a 12 V bank and a 67 A one on 48 V. No tile makes that conversion.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive array wattage or battery voltage returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the controller manufacturer's nominal-power rating convention (rated output amperes at the battery charging voltage; the worked example cites the Morningstar ProStar MPPT data sheet, which notes that input power may exceed the nominal rating and the controller limits its output), NEC 690.8 cited by number for conductor sizing at 125% of continuous current with the subsection flagged for verification, GOVERNANCE.electrical.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`mppt charge controller size`, `charge controller amps`, `solar charge controller sizing`, `mppt output current battery voltage`, `charge controller for solar panels`.

## 2. The tile

### 2.1 `mppt-controller-output-current` -- MPPT Charge Controller Output Current

```
output current  I_out = array watts at STC / battery nominal voltage
controller      the next standard rating at or above I_out
                (20, 30, 40, 45, 60, 80, 100 A are common)
array ratio     array watts / (controller A x battery V); above 1.0 the
                controller clips at its limit -- by design, not by fault
conductor       output circuit conductor >= 1.25 x the controller's rated
                continuous output current (NEC 690.8, continuous-current basis)
input side      the controller's maximum input voltage and the array's cold Voc
                are a separate check (pv-string-sizing)
```

An MPPT controller converts the array's high-voltage, low-current power into the battery's low-voltage, high-current
charge, so its size is an output-current rating. Power in is roughly power out, and the output voltage is the
battery's, so the current is the array watts divided by the battery voltage. That is why battery voltage is the
largest lever in a small off-grid system: quadrupling it from 12 V to 48 V cuts the controller current, the cable, and
the fuse to a quarter.

Manufacturers rate their controllers this way and say so: a 25 A controller is listed at about 350 W on a 12 V bank
and 700 W on a 24 V bank, and an array larger than that is permitted because the controller will limit its output.
Oversizing the array against the controller is a normal design choice -- it fills the battery sooner on poor days and
clips a little at noon on good ones -- and the tile reports the ratio so the choice is explicit rather than
accidental.

The output conductor is sized on the controller's rated continuous output, not on the calculated current, because the
controller can deliver its full rating whenever the array is large enough to drive it. The tile reports the 125%
figure for conductor and overcurrent protection selection; the ampacity itself comes from the NEC tables.

**Inputs:** the array's STC wattage, the battery nominal voltage, and optionally a chosen controller rating

**Outputs:** the output current, the next standard controller rating, the array-to-controller ratio, and the minimum conductor current (125% of the controller rating)

## 3. Worked example

A field clinic array of eight 400 W modules (3,200 W) charging a 48 V bank:

```
I_out      3,200 / 48 = 66.7 A     -> 80 A controller
ratio      3,200 / (80 x 48) = 0.83 (no clipping)
conductor  1.25 x 80 = 100 A minimum
```

**An 80 A controller with a 100 A output conductor.**

**The same array on a 12 V bank:**

```
I_out = 3,200 / 12 = 266.7 A
```

**Over 260 A -- three or four large controllers in parallel and cable the size of a welding lead.** On 24 V it is
133.3 A. The array did not change; the battery voltage did, and it decides the whole DC side.

## 4. Scope and non-goals

An output-current sizing aid for MPPT controllers using nameplate array power. It does not check the controller's maximum input voltage against the array's cold open-circuit voltage (`pv-string-sizing`), the PV source-circuit current (`pv-circuit-ampacity`), or temperature derating of array output (`pv-cell-temperature-power`). It does not apply to PWM controllers, which pass array current through rather than converting it. Conductor ampacity, terminal ratings, and overcurrent device selection come from the NEC and the equipment listings. The controller manufacturer's specifications, the NEC as adopted, and the AHJ govern.
