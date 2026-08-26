# roughlogic.com Specification v1433 -- Carburetor Jet Correction for Altitude and Temperature (calc-mechanic.js, Group K, mechanic and small engine, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, mechanic and small engine), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Group K has engine displacement, compression ratio, and injector sizing, and the catalog has an air-density correction for altitude, but nothing that connects the two: what a carbureted engine's main jet has to become when the air gets thin. Every chainsaw, generator, motorcycle, and small aircraft engine taken up a mountain runs rich, and the correction is a fourth-root relationship that nobody guesses correctly.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive pressure, absolute temperature, or jet dimension, or a density ratio at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the air-density ratio from the pressure and absolute-temperature ratios, and the carburetor jet-scaling relation in which fuel flow follows jet area and required fuel follows air density, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `carburetor-altitude-jetting` -- Carburetor Jet Correction for Altitude and Temperature

```
density ratio     = (P / P0) x (T0 / T)          absolute pressure and absolute temperature
jet area ratio    = density ratio
jet diameter ratio= density ratio ^ 0.5 ... in practice ^ 0.25 on the stamped size
flow-rated jet    = original jet number x density ratio
power ratio       = approximately the density ratio
```

A carburetor is a fixed-geometry device: it meters fuel in proportion to the airflow through the venturi, and it
was calibrated for one air density. Take it up a mountain and the air thins while the fuel metering does not,
so the mixture goes rich -- and rich costs power on top of the power already lost to the thin air, fouls plugs,
and on a two-stroke can load up badly enough to stall.

The correction follows the density ratio, and the important thing is which quantity it applies to. Fuel flow
through a jet is proportional to its **area**, so the area scales with the density ratio directly. Jet *diameter*
therefore scales as the square root of that, and jets that are stamped with a flow number rather than a diameter
scale with the ratio itself. Getting that distinction backward is how people end up two sizes off.

Temperature matters as much as pressure and pulls the other way: cold air is dense, so a cold morning at altitude
is less lean-out than a hot afternoon at the same elevation. Both terms are in the ratio.

**Inputs:** baseline pressure and temperature (or baseline altitude), actual pressure and temperature (or actual
altitude), and either the original jet diameter or its stamped flow number.

**Outputs:** density ratio, corrected jet flow number, corrected jet diameter, and the approximate power ratio at
the new condition.

## 3. Worked example

An engine jetted at sea level on a standard day (29.92 in Hg, 59 F) taken to 8,000 ft (22.22 in Hg, 30.5 F):

```
pressure ratio    = 22.22 / 29.92          = 0.743
temperature ratio = 518.67 / 490.17        = 1.058
density ratio     = 0.743 x 1.058          = 0.786
```

So the engine is breathing 21% less air. A jet stamped by flow number goes from 160 to `160 x 0.786 = 126`. A jet
measured by diameter goes from 0.040 in to `0.040 x 0.786^0.25 = 0.0377 in` -- a change of less than four
thousandths, which is why diameter-measured jets look deceptively insensitive and get under-corrected. And the
power: roughly the density ratio, so about 21% down, which matches the familiar field rule of about 3% per
thousand feet.

Note the temperature term's size. At the same 8,000 ft on a 90 F afternoon the temperature ratio falls to 0.943,
the density ratio to 0.700, and the engine wants a 112 jet rather than a 126 -- a full size and a half apart from
the cold-morning answer at the same elevation.

## 4. Scope and non-goals

A first-order correction for a fixed-jet carburetor's main circuit. Idle, pilot, and needle circuits have their
own calibration and their own altitude behavior, and a needle position or clip change is often needed alongside a
main jet. The tile assumes the engine is otherwise correctly jetted at the baseline, which is frequently not true.
Altitude-compensating carburetors, forced induction, and any form of closed-loop electronic control invalidate the
whole approach. Two-stroke engines are additionally sensitive because the jetting also carries the lubrication,
and running one lean at altitude is how a piston seizes. Exhaust gas temperature, plug reading, and a dynamometer
are how jetting is actually confirmed. The engine manufacturer's altitude kit and specifications govern.
