# roughlogic.com Specification v1490 -- Refrigerant Receiver Pump-Down Capacity (`calc-refrigeration.js`, Group C HVAC, industrial refrigeration, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-refrigeration.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; industrial and commercial refrigeration), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Before a coil or a vessel can be opened for service the refrigerant has to go somewhere, and that somewhere is usually the high-pressure receiver. Whether it fits is a volume comparison against a maximum fill limit that exists because a liquid-full vessel has nowhere to expand.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive receiver volume or liquid density, a fill limit outside zero to one, or an existing liquid volume exceeding the receiver volume returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the receiver fill-limit comparison with IIAR 2, IIAR 7, and ASHRAE 15 named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`receiver pump down capacity`, `refrigerant pump down volume`, `receiver fill limit`, `can the receiver hold the charge`, `pump down before service`.

## 2. The tile

### 2.1 `receiver-pumpdown-capacity` -- Refrigerant Receiver Pump-Down Capacity

```
available volume   V_avail = V_receiver x fill_limit - V_existing_liquid
required volume    V_req = charge to be pumped down / rho_liquid at receiver conditions
fill limit         commonly 80% at the warmest expected liquid temperature
verdict            V_avail >= V_req
```

The fill limit is the whole point. A receiver filled solid with liquid and then warmed has no vapor space to
absorb the liquid's expansion, and the pressure rise is enormous and fast -- this is hydrostatic overpressure,
and it is a vessel rupture rather than a relief-valve event if there is no relief path. The customary 80% limit
is evaluated at the WARMEST liquid temperature the receiver could see, not at operating temperature, because the
dangerous case is a shut-down plant sitting in a hot machine room.

The practical use is a go or no-go before a job starts. A plant that discovers mid-shutdown that its receiver
will not hold the pumped-down charge has to either transfer to a rented recovery vessel or vent, and venting
ammonia is a reportable release. The tile also answers the reverse question -- how much can be pumped down -- so a
service plan can be built around what the receiver actually holds.

**Inputs:** receiver volume, existing liquid level or volume, the maximum fill limit, the warmest expected liquid temperature with its density, and the charge to be pumped down

**Outputs:** the available receiver volume at the fill limit, the volume the pumped-down charge occupies, the resulting fill percentage, a fits or does not fit verdict, and the maximum charge the receiver can accept

## 3. Worked example

A 1,000 gal receiver already holding 220 gal of liquid, an 80% fill limit, and 2,400 lb of ammonia to be
pumped down. Warmest expected liquid temperature 90 degF, density 36.9 lb/cu ft (4.93 lb/gal):

```
V_avail = 1,000 x 0.80 - 220        = 580 gal
V_req   = 2,400 / 4.93              = 487 gal
resulting fill = (220 + 487) / 1,000 = 70.7%
```

It fits, with 93 gal to spare, and the receiver ends at 70.7% -- inside the 80% limit at the warm condition. The
maximum charge this receiver could take is `580 x 4.93` = 2,859 lb.

Now change one input: do the same job in August with the receiver already at 400 gal. Available volume drops to
400 gal, the 487 gal charge does not fit, and the job needs a recovery vessel. That is a difference worth
knowing the day before, not during the shutdown.

## 4. Scope and non-goals

A volume comparison for service planning. It does not evaluate the pump-down procedure, the low-pressure cutout
that must stop the compressor, the isolation valve arrangement, or whether the section being isolated can
actually be evacuated to the intended pressure -- oil, trapped liquid in low points, and refrigerant absorbed in
oil all remain behind. It does not size relief, which is `refrigeration-relief-capacity`, and it does not
address the hydrostatic overpressure protection required on any section of liquid line that can be isolated
between two closed valves, which is a separate and mandatory provision. Liquid density must be entered at the
warmest credible temperature; using operating-temperature density understates the volume and defeats the
purpose. IIAR 2 and IIAR 7 for the service procedure, ASHRAE 15, ASME Section VIII for the vessel, and the
plant's own operating procedures govern.
