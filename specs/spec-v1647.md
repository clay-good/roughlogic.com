# roughlogic.com Specification v1647 -- Aviation Fuel Weight vs Temperature and Load Sheet (`calc-mechanic.js`, Group K Mechanic - Auto, Marine, Aviation, aviation, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, Mechanic - Auto, Marine, Aviation -- the existing category, hub `/groups/mechanic/`; aviation maintenance), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Fuel is loaded in gallons and weighed on the load sheet in pounds, and the conversion moves with temperature. Using the standard density on a hot ramp overstates the fuel weight and understates the useful load -- and on a tight weight-and-balance that error is in the unsafe direction.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive volume or density, or a temperature outside the correction range returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the temperature-corrected fuel density relation with the aircraft flight manual named as governing weight and balance, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`jet fuel weight per gallon`, `fuel density temperature correction`, `avgas pounds per gallon`, `fuel load sheet weight`, `gallons to pounds fuel`.

## 2. The tile

### 2.1 `aviation-fuel-weight` -- Aviation Fuel Weight vs Temperature and Load Sheet

```
standard density  Jet A about 6.75 lb/gal at 15 degC; 100LL about 6.0 lb/gal at 15 degC
temperature       density falls roughly 0.4% per 10 degF for hydrocarbon fuels
actual weight     W = gallons x density at the actual fuel temperature
volume for weight gallons = required weight / density at temperature
moment            weight x arm; a fuel weight error moves the centre of gravity too
consequence       overstating fuel weight understates payload available -- conservative;
                  understating it is not
```

The conversion is a multiplication and the trap is which density. Standard tables are at a reference
temperature, and fuel drawn from an above-ground tank on a hot day is materially less dense than that -- so a
given number of gallons weighs less than the table says. Loading to a weight by counting gallons at standard
density therefore puts LESS fuel aboard than intended, which shows up as a shorter range than planned.

The direction of the error matters for safety in both senses. Computing the load sheet with an overstated fuel
weight is conservative for weight and balance -- the aircraft is lighter than the paperwork -- but it means the
endurance calculation is optimistic, because the fuel actually aboard is less than the weight suggests. Computing
with an understated weight is the reverse and is the unsafe one for weight and balance.

The centre of gravity moves with it too. Fuel is carried at a specific arm, and an error in its weight is an
error in its moment, so a large fuel-weight error on an aircraft with a distant fuel arm shifts the calculated
CG. On most aircraft that shift is small; on some it is not, and the check is worth doing rather than assuming.

**Inputs:** fuel type, volume in gallons, fuel temperature, the standard density and its reference temperature, the temperature correction rate, the fuel arm, and the required fuel weight when solving for volume

**Outputs:** the fuel density at the entered temperature, the weight of the entered volume, the volume required for a target weight, the difference from a standard-density calculation, and the moment and its effect on the centre of gravity

## 3. Worked example

380 gallons of Jet A. At the 6.75 lb/gal standard density:

```
weight = 380 x 6.75 = 2,565 lb
```

Now the same 380 gallons at 95 degF, roughly 44 degF above the 15 degC (59 degF) reference:

```
density correction ~ -0.4% per 10 degF x 4.4 = -1.8%
density            = 6.75 x 0.982 = 6.628 lb/gal
weight             = 380 x 6.628 = 2,519 lb
```

**46 lb lighter** than the standard-density figure. On a load sheet that is
46 lb of payload the aircraft could have carried, and on an endurance calculation it
is 46 lb of fuel that is not there.

The reverse case, loading to a weight: to put 2,600 lb of fuel aboard on that hot ramp requires

```
2,600 / 6.628 = 392 gallons
```

against 385 gallons at standard density -- 7 gallons more. A fueller
told "2,600 pounds" and converting at the standard figure delivers less than asked.

The moment: at a fuel arm of 140 in, a 46 lb error is
6,464 in-lb of moment, which on a light aircraft is a visible CG shift and on a
transport is not.

## 4. Scope and non-goals

A density and weight conversion using values the user supplies. Fuel densities vary with the actual product and
its specification as well as with temperature, and the correction rate used is an approximation; where accuracy
matters the fuel's own density at the delivery temperature, from the fueller's records, is the authority. It does
not perform weight and balance, which requires the aircraft's own empty weight and CG, the loading schedule, and
the applicable limits from the flight manual, and it does not compute endurance, which needs the fuel flow and
the reserve requirements. It does not address unusable fuel, tank calibration, or the difference between indicated
and actual fuel quantity. It does not address fuel type verification, which is a critical safety check --
misfuelling a turbine aircraft with avgas or a piston aircraft with jet fuel is a fatal error that no calculation
prevents. The aircraft flight manual, the operator's weight and balance procedures, 14 CFR Part 91, and the
pilot in command govern.
