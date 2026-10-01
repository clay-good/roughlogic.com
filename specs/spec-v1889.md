# roughlogic.com Specification v1889 -- Generator Fuel at Part Load and Minimum-Load Check (`calc-reliefpower.js`, Group A Electrical, emergency and temporary power, 1 New Tile)

> **Status: LANDED 2026-09-30 (proposed 2026-09-25). Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-reliefpower.js`**
> (Group A Electrical, hub `/groups/electrical/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** Emergency generators are nearly always oversized for the load they actually carry, and a lightly loaded diesel burns more fuel per kilowatt-hour and wet-stacks. `engine-fuel-burn-gph` uses a constant specific consumption and cannot show the light-load penalty; `generator-fuel-runtime` takes the burn rate as given. No tile reads a data sheet's fuel curve at the real load or flags the load bank NFPA 110 calls for.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive rating or fuel-curve point returns `{ error }`; fuel-curve points that decrease with load return `{ error }`; a load above the rating returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the manufacturer's published fuel consumption at 1/4, 1/2, 3/4, and full load named as the data -- the worked example uses the Cummins C60D6R rental generator data sheet D-6567 -- and NFPA 110 Section 8.4.2 (exercise at not less than 30% of the EPS standby nameplate kW, with a supplemental load bank permitted) cited by number, GOVERNANCE.electrical.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`generator fuel consumption part load`, `generator gallons per hour at 25% load`, `generator wet stacking`, `generator load bank 30 percent`, `diesel generator kwh per gallon`.

## 2. The tile

### 2.1 `generator-part-load-fuel` -- Generator Fuel at Part Load and Minimum-Load Check

```
fuel curve     the data sheet's gph at 1/4, 1/2, 3/4, and full load of the
               chosen rating; gph at the actual load P by straight-line
               interpolation between the bracketing points
below 1/4      extended along the first segment and FLAGGED as extrapolated
efficiency     kWh per gallon = P / gph
load fraction  P / standby nameplate kW
minimum load   NFPA 110 8.4.2: not less than 30% of the standby nameplate kW;
               supplemental load bank = 0.30 x standby kW - P when positive
```

A generator's fuel curve is not proportional to its load, and the part that is not proportional is the part that
matters in an emergency. At full load the example unit makes about 12 kWh per gallon; at a third of its rating it
makes about 10, and at a fifth, under 9. The fixed losses of turning the engine over do not shrink with the load, so
every kilowatt-hour delivered at light load carries more of them. Interpolating the manufacturer's four published
points captures this without modelling the engine.

Light load also has a mechanical cost. A diesel that runs for long periods well below its rating does not get hot
enough to burn its fuel completely, and unburned fuel and soot accumulate in the exhaust -- wet stacking. NFPA 110 sets
a floor of 30% of the standby nameplate for exercising an emergency power supply and permits a supplemental load bank
to reach it. The tile reports the shortfall in kilowatts, which is the size of load bank to rent, and flags the load
as extrapolated when it falls below the lowest published point.

The load fraction is taken against the standby nameplate, as the code states, even when the unit is running on its
prime rating. That is the number an inspector will check, and it is slightly more demanding than the prime-rating
fraction.

**Inputs:** the standby and prime ratings, the four published fuel-curve points for the rating in use, and the actual load

**Outputs:** the fuel consumption at the load, the kWh per gallon at the load and at full load, the load as a percentage of standby nameplate, the NFPA 110 minimum-load check, the supplemental load bank kW, and an extrapolation flag

## 3. Worked example

A Cummins C60D6R rental unit on its prime rating (55 kW; 1.5, 2.5, 3.4, 4.6 gph at 1/4, 1/2, 3/4, full; standby
nameplate 60 kW) carrying a 20 kW shelter load:

```
bracket    13.75 kW (1.5 gph) to 27.5 kW (2.5 gph)
gph        1.5 + (20 - 13.75) / 13.75 x 1.0 = 1.955 gph
kWh/gal    20 / 1.955 = 10.23   (full load: 55 / 4.6 = 11.96)
load       20 / 60 = 33.3% of standby -> meets the 30% floor
```

**1.96 gallons an hour, and 14% less energy per gallon than at full load** -- but above the 30% floor, so no load
bank.

**The same unit at night, carrying 12 kW:**

```
gph        1.5 + (12 - 13.75) / 13.75 x 1.0 = 1.373 gph   (EXTRAPOLATED below 1/4 load)
kWh/gal    8.74
load       12 / 60 = 20.0% -> below the 30% floor
load bank  0.30 x 60 - 12 = 6 kW
```

**A 6 kW supplemental load bank brings it to the floor**, and the fuel figure is flagged because it lies below the
lowest point the manufacturer published. The alternative -- a smaller unit, or a battery that lets the generator run
harder for fewer hours (`generator-battery-hybrid-fuel`) -- usually costs less over a long outage.

## 4. Scope and non-goals

A fuel and minimum-load estimate from a manufacturer's four-point fuel curve. The curve's straight-line interpolation is an approximation of a smooth curve and is least reliable below the first published point; the manufacturer's detailed fuel map governs where it exists. It does not derate for altitude or temperature (`generator-altitude-temp-derate`), compute tank runtime (`generator-fuel-runtime`), or size a generator (`generator-sizing`). NFPA 110's minimum-load provision is an exercising and testing requirement cited by number; manufacturers publish their own minimum continuous load guidance, which governs operation. The manufacturer's data sheet, NFPA 110 as adopted, and the AHJ govern.
