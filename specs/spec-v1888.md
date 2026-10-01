# roughlogic.com Specification v1888 -- Generator Output Derate for Altitude and Temperature (`calc-reliefpower.js`, Group A Electrical, emergency and temporary power, 1 New Tile)

> **Status: LANDED 2026-09-30 (proposed 2026-09-25). Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-reliefpower.js`**
> (Group A Electrical, hub `/groups/electrical/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** A rental generator shipped to a mountain town in a heat wave does not make its nameplate. Every diesel data sheet gives an altitude threshold, a temperature threshold, and a percentage per step past each; `gas-altitude-derate` covers a gas appliance's burner input, and no tile turns a genset's own derate rules into available kilowatts.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive rated kW, step size, or derate rate returns `{ error }`; a total derate of 100% or more returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the generator manufacturer's published derate statement named as the method and as governing -- the worked example uses the Cummins DQDAC data sheet -- NFPA 110 cited by number for the requirement that the EPSS be rated for its site conditions, GOVERNANCE.electrical.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`generator altitude derate`, `generator temperature derate`, `genset derating high elevation`, `diesel generator derate hot weather`, `generator kw at altitude`.

## 2. The tile

### 2.1 `generator-altitude-temp-derate` -- Generator Output Derate for Altitude and Temperature

```
altitude     a% x max(0, site elevation - altitude threshold) / altitude step
temperature  t% x max(0, site ambient - temperature threshold) / temperature step
combined     added:      total% = altitude% + temperature%
             multiplied: (1 - altitude%)(1 - temperature%)
             the tile uses ADDED (the conservative reading) and shows both
available    rated kW x (1 - total%)
data sheet   the thresholds and rates are the UNIT'S OWN, entered from its
             data sheet; they differ by model, rating (standby vs prime), and
             fuel, from roughly 3% to 7% per step
```

A diesel engine makes power by burning air, and thin or hot air carries less of it. Every generator data sheet says
so in one sentence: full output up to a stated altitude and ambient temperature, then a percentage off for each
increment beyond. The thresholds vary by model and by rating -- the same Cummins frame derates from 1,800 ft on its
standby rating and from 1,640 ft on its prime rating -- so the tile takes them from the unit being used rather than
supplying a generic curve.

The data sheets say the derates "must be combined" when both thresholds are exceeded, and most do not say how. Adding
the two percentages is the conservative reading and matches the manufacturers that describe the temperature derate as
"additional"; multiplying the two factors gives a slightly higher number. The difference is small -- about a
kilowatt in the worked example -- and the tile shows both so that a planner is not surprised by either.

The derate matters most where disasters and rental fleets meet: a unit sized at sea level for a critical load, then
dispatched to a high-elevation site during a summer event. The load it was sized for may no longer fit, and the
first symptom is voltage dip or a stall when a motor starts. The tile's output feeds `generator-sizing` and
`generator-motor-starting` as the real capacity.

**Inputs:** the rated kW (standby or prime), the site elevation, the site design ambient temperature, the altitude threshold, step, and rate, and the temperature threshold, step, and rate from the data sheet

**Outputs:** the altitude derate, the temperature derate, the combined derate (added and multiplied), and the available kW

## 3. Worked example

A 300 kW standby unit (Cummins DQDAC: full output to 1,800 ft and 104 degF; 7% per 1,312 ft above, 7% per 18 degF
above) sent to a site at 5,000 ft with a 110 degF design day:

```
altitude     (5,000 - 1,800) / 1,312 x 7% = 17.07%
temperature  (110 - 104) / 18 x 7%        =  2.33%
added        19.41%  -> 300 x 0.8059 = 241.8 kW
multiplied   300 x 0.8293 x 0.9767 = 243.0 kW
```

**About 242 kW from a 300 kW nameplate -- a fifth of the unit gone, almost all of it to altitude.** A 260 kW load that
fit comfortably at sea level no longer fits.

**The same unit at 7,000 ft on a 115 degF day:**

```
altitude 27.74% + temperature 4.28% = 32.02%  -> 203.9 kW
```

**Two-thirds of nameplate.** At that point the right answer is usually a larger unit, not a trimmed load.

## 4. Scope and non-goals

An available-capacity estimate from a manufacturer's published derate rules. It does not supply derate rates, which must come from the specific unit's data sheet and rating; it does not address humidity, fuel quality, cooling-system capacity at altitude, or the separate derates some manufacturers publish for the alternator. It does not size the generator for a load (`generator-sizing`, `generator-motor-starting`) or compute fuel (`generator-part-load-fuel`). NFPA 110 is cited by number only. The manufacturer's data sheet, NFPA 110 as adopted, and the AHJ govern.
