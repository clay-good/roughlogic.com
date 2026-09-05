# roughlogic.com Specification v1509 -- Blast Vibration Scaled Distance and Peak Particle Velocity (`calc-mining.js`, Group E Carpentry and Construction, blasting, 1 New Tile)

> **Status: LANDED 2026-09-05. Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mining.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; mining, quarry, and drill-and-blast), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Ground vibration from a blast is regulated, and the regulation is written as a scaled distance: distance divided by the square root of the charge weight per delay. That one number decides the maximum charge a shot may carry at a given house, and it is the calculation that keeps a quarry out of court.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive distance or charge weight per delay, or a non-positive propagation constant returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the scaled-distance relation and frequency-dependent vibration limits, with MSHA and OSM named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`scaled distance blasting`, `blast vibration ppv`, `charge weight per delay`, `seismograph blast limit`, `maximum pounds per delay`.

## 2. The tile

### 2.1 `blast-scaled-distance-ppv` -- Blast Vibration Scaled Distance and Peak Particle Velocity

```
scaled distance   SD = D / sqrt(W)        (D feet, W pounds per delay)
peak particle vel PPV = K x SD^(-b)        (K ~ 160, b ~ 1.6 typical; site constants preferred)
regulatory forms  many jurisdictions permit a minimum SD in lieu of monitoring
                  (commonly 50 ft/lb^0.5 at close range, rising with distance)
max charge        W_max = (D / SD_req)^2
```

Vibration scales with charge weight per DELAY, not per shot -- which is the whole reason delay initiation
exists. A 10,000 lb shot fired on forty delays of 250 lb each produces the vibration of a 250 lb shot, and that
single fact is what lets a quarry work near a town at all. Reading the charge weight per shot into this formula
instead of per delay overstates the vibration enormously and is the most common misuse.

The propagation constants `K` and `b` are site-specific and vary widely with geology; the generic values are a
starting point and a site-specific regression from actual seismograph records is what a serious operation uses.
That is why most regulations offer two compliance paths: monitor every shot with a seismograph, or stay above a
prescribed minimum scaled distance and skip the monitoring. The second path is conservative by design, and the
tile computes both the predicted PPV and the maximum charge for a required scaled distance.

**Inputs:** distance to the nearest protected structure, charge weight per delay, the site propagation constants K and b, and the regulatory PPV limit or required minimum scaled distance

**Outputs:** the scaled distance, the predicted peak particle velocity, the margin against the entered limit, the maximum charge weight per delay for a required scaled distance, and the distance at which a given charge meets the limit

## 3. Worked example

A house 1,200 ft from the shot, 340 lb of explosive on the largest single delay:

```
SD  = 1,200 / sqrt(340) = 1,200 / 18.44 = 65.1 ft/lb^0.5
PPV = 160 x 65.1^-1.6                   = 0.201 in/s
```

0.20 in/s against a typical 1.0 in/s limit at this frequency -- comfortable, and the scaled distance of
65.1 is well above the customary 50 minimum, so this shot would also comply under the no-monitoring path.

Work it the other way. The largest charge per delay allowed at a scaled distance of 50 for this house is
`(1,200 / 50)^2` = 576 lb -- far more than the 340 lb actually loaded, so there is room. But move
the house to 400 ft and the limit falls to `(400/50)^2` = 64 lb per delay, and the 340 lb column now
has to be decked onto separate delays to comply.

## 4. Scope and non-goals

A vibration prediction and compliance screen using generic or site-supplied propagation constants. Generic
constants can be wrong by a factor of two or more in either direction; a site-specific regression from
seismograph data is the only defensible basis for a production operation, and where a regulation requires
monitoring this calculation does not substitute for it. The tile does not evaluate frequency, and every modern
vibration limit is frequency-dependent -- the same PPV is acceptable at 40 Hz and not at 6 Hz, because low
frequencies couple into structures. It does not address airblast, which is a separate limit and separate
calculation (`blast-airblast-overpressure`), or flyrock. It does not perform a preblast survey, which is what
actually resolves damage claims. Blasting is a licensed activity: the blaster in charge, the state and federal
explosives regulations, OSM, MSHA or OSHA jurisdiction as applicable, and the site's blast plan govern.
