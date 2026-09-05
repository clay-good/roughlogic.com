# roughlogic.com Specification v1725 -- Activated Carbon Adsorber Bed Life and Breakthrough (`calc-airquality.js`, Group G Cross-Trade Utilities, air quality, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-airquality.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; air quality and environmental), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** An activated carbon bed adsorbs solvent until it is saturated, and then it passes everything -- so bed life is a capacity divided by a loading rate, and breakthrough is a cliff rather than a slope. Running a bed past breakthrough emits everything it was installed to capture.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive carbon mass, working capacity, or loading rate, or a working capacity above one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the adsorption capacity relation and the breakthrough behaviour with the carbon supplier isotherm data named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`activated carbon bed life`, `carbon breakthrough time`, `adsorber capacity solvent`, `carbon change out interval`, `humidity effect carbon adsorption`.

## 2. The tile

### 2.1 `carbon-bed-life` -- Activated Carbon Adsorber Bed Life and Breakthrough

```
working capacity   pounds of solvent adsorbed per pound of carbon at the operating
                   conditions; typically 5 to 20% for common solvents
loading rate       lb/h = flow x concentration, converted
bed life           t = carbon mass x working capacity / loading rate
breakthrough       when the outlet concentration begins to rise; the bed is spent
humidity           water competes for adsorption sites; high humidity reduces capacity
temperature        capacity falls as temperature rises
regeneration       steam or hot gas desorbs the solvent; a regenerative system cycles
                   between two beds
monitoring         outlet monitoring is what detects breakthrough; a timer does not
```

Breakthrough is a cliff and that is what makes bed life management different from filter management. A carbon
bed removes essentially everything until its mass transfer zone reaches the outlet, and then the outlet
concentration rises quickly toward the inlet. So a bed at 95 percent of its life is performing perfectly and a bed
at 105 percent is doing nothing -- there is no gradual degradation to notice, and the only reliable detection is
monitoring the outlet.

Working capacity is much lower than the carbon's theoretical capacity and it depends on conditions. Humidity is
the variable that surprises people: water vapour competes for adsorption sites, and a stream at high relative
humidity can cut working capacity substantially -- which means a bed sized on dry-air capacity fails early in a
humid application. Temperature works the same way, and a hot stream adsorbs poorly.

The safety consideration that belongs with the arithmetic is bed fires. Adsorption is exothermic, and certain
solvents -- ketones in particular -- can react on the carbon and generate enough heat to ignite the bed. Beds in
those services need temperature monitoring and, on regenerative systems, careful control of the desorption cycle.
It is not an obscure risk; carbon bed fires occur.

Spent carbon is a regulated waste when it carries hazardous constituents, which is a disposal obligation rather
than an afterthought.

**Inputs:** the carbon mass in the bed, the working capacity at the operating conditions, the gas flow and inlet concentration, the humidity and temperature, and the solvent and its molecular weight

**Outputs:** the solvent loading rate, the bed capacity in pounds of solvent, the time to breakthrough, the change-out interval with a safety margin, the effect of a stated humidity on capacity, and the carbon mass required for a target service interval

## 3. Worked example

A bed with 2,000 lb of carbon at a 10 percent working capacity, on a stream loading 1.4 lb/h of solvent:

```
bed capacity = 2,000 x 0.10 = 200 lb of solvent
bed life     = 200 / 1.4 = 143 hours = {200/1.4/24:.1f} days of continuous operation
```

At one shift a day that is {200/1.4/8:.0f} operating days -- a change-out roughly monthly.

**Now the humidity.** If the stream runs at 80 percent relative humidity and the working capacity falls to 6
percent:

```
bed capacity = 2,000 x 0.06 = 120 lb
bed life     = 120 / 1.4 = 86 hours
```

**{100*(1-86/143):.0f} percent shorter**, from humidity alone. A bed sized on dry-air capacity and installed on a
humid stream breaks through at 60 percent of the expected interval, and if the change-out is on a calendar the
excess is emitted.

**Breakthrough is a cliff, not a slope.** Up to the moment the mass transfer zone reaches the outlet the bed
removes essentially everything; after it, the outlet climbs toward the inlet concentration quickly. There is no
partial performance to notice, which is why outlet monitoring rather than a timer is what should trigger a
change-out -- and why a permit that requires a control device usually requires the monitoring too.

**And the fire risk.** Adsorption is exothermic, and ketones and some other solvents react on carbon and can
self-heat to ignition. Beds in those services need temperature monitoring. Spent carbon carrying hazardous
constituents is a regulated waste.

## 4. Scope and non-goals

A capacity and time calculation using a working capacity the user supplies. Working capacity is not a carbon
property alone: it depends on the solvent, its concentration, the temperature, the humidity, the bed depth and
velocity, and the carbon's history, and it is determined from isotherm data or from pilot testing rather than
from a generic percentage. It does not model the mass transfer zone or predict the breakthrough curve's shape,
and it does not address multi-component streams, where a strongly adsorbed compound can displace a weakly
adsorbed one already on the bed and produce an outlet concentration ABOVE the inlet. It does not address bed
fires, which are a real hazard in ketone and some other services and which require temperature monitoring and
appropriate design. It does not address regeneration systems or spent carbon disposal, which is regulated waste
where hazardous constituents are present. The carbon supplier's isotherm data, the vendor's design, the
applicable permit, and the permitting authority govern.
