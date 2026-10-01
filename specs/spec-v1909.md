# roughlogic.com Specification v1909 -- Flooded Basement Staged Pump-Down Schedule (`calc-floodfight.js`, Group D Water Damage and Mold Restoration, flood recovery, 1 New Tile)

> **Status: LANDED 2026-09-30 (proposed 2026-09-25). Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-floodfight.js`**
> (Group D Water Damage and Mold Restoration, hub `/groups/restoration/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** Pumping a flooded basement dry in one go can collapse its walls or heave its floor, because the saturated soil outside is still pushing. FEMA prescribes a staged schedule -- test a foot, wait, test another, then two to three feet a day -- and no tile turns it into days, gallons, and pump hours. `standing-water` gives only the volume.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive basement area, water depth, daily drawdown, or pump rate returns `{ error }`; a daily drawdown above 3 ft returns `{ error }` with the FEMA limit; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): FEMA, *Mitigation and Basement Flooding* (pumping out a flooded basement), and University of Nebraska-Lincoln Extension disaster education guidance on pumping flooded basements, named as the method, the restoration contractor and a structural engineer (where walls show movement) named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`pump out flooded basement`, `how fast to pump basement`, `basement water removal schedule`, `flooded basement wall collapse`, `basement pumping feet per day`.

## 2. The tile

### 2.1 `basement-flood-pumpdown` -- Flooded Basement Staged Pump-Down Schedule

```
day 1       mark the wall; draw down 1 ft; wait 24 h
day 2       if the level held, draw down 1 ft more; mark; wait 24 h
            (if the water came back up, the ground is still saturated: stop
             and wait -- the schedule restarts only when a drawdown holds)
day 3 on    2 to 3 ft every 24 h until empty
days        2 + ceil((depth - 2) / daily rate)
volume      area x depth x 7.4805 gal; per foot = area x 7.4805
pump        each day's gallons / pump gpm = run minutes
```

The water in a flooded basement is holding the walls up. The soil outside is saturated and pushes inward with its own
weight plus the water in it, and the water inside pushes back. Remove the inside water faster than the outside
drains and the walls take the full difference; FEMA's text is plain that they can buckle inward or collapse, and the
floor can heave. The schedule exists to let the outside catch up.

The two test days are the diagnostic. If a foot of drawdown holds overnight, the ground outside is draining; if the
water comes back, it is not, and pumping further only loads the walls. The tile treats a failed test as a stop, not a
delay to be pushed through. After the tests, two to three feet a day is the FEMA rate, and the tile computes the days
and each day's gallons at the chosen rate.

The volume sets the pump. A basement holds about 7.5 gallons per square foot per foot of depth, so an ordinary
basement holds tens of thousands of gallons. The tile turns each day's share into run time at the pump's rate, which
tells a homeowner whether a rental trash pump or a borrowed sump pump can keep to the schedule.

**Inputs:** the basement floor area, the water depth, the daily drawdown rate after the test days (2 to 3 ft), and the pump rate

**Outputs:** the total volume, the gallons per foot, the day-by-day drawdown and gallons, the number of days, and the pump run time for the largest day

## 3. Worked example

A 30 x 40 ft basement with 6 ft of water, drawn down at 2.5 ft per day after the tests, with a 50 gpm pump:

```
per foot   1,200 x 7.4805 = 8,977 gal
total      6 x 8,977 = 53,860 gal
schedule   day 1: 1 ft (8,977 gal)   day 2: 1 ft (8,977 gal)
           day 3: 2.5 ft (22,442 gal) day 4: 1.5 ft (13,465 gal)
days       2 + ceil(4 / 2.5) = 4
pump       largest day 22,442 / 50 = 449 min = 7.5 h
```

**Four days and about 54,000 gallons** -- not an afternoon. The 50 gpm pump runs seven and a half hours on the third
day, well within a day.

**If the water rises back after day 1,** the schedule stops there. Pumping the remaining five feet that day would put
the full saturated-soil load on the walls with nothing inside to balance it.

## 4. Scope and non-goals

A pumping schedule from FEMA's staged drawdown guidance. It does not assess wall or floor condition, the soil and groundwater level outside, or whether the basement should be entered at all; electrical and gas hazards in a flooded basement come first and are not addressed. It does not size a pump for head (`pump-tdh`), treat Category 3 water (`sewage-loss-disposal`), or plan drying after the water is out (`drying-balance`, `dehumidifier` tiles). Uplift on the floor slab is `flood-uplift-cover-slab`. FEMA guidance, the restoration contractor, and a structural engineer where walls have moved govern.
