# roughlogic.com Specification v1755 -- Greenhouse CO2 Enrichment Injection Rate (`calc-greenhouse.js`, Group L Agriculture and Forestry, greenhouse and controlled-environment agriculture, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-greenhouse.js`**
> (Group L Agriculture and Forestry, hub `/groups/agriculture/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Enriching a greenhouse with carbon dioxide is a leak-rate problem, not a volume problem: the house is filled once and then topped up forever against the air changes that carry the gas away. What the enrichment costs is set almost entirely by how tight the house is at the moment.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive house volume or air change rate, a target at or below the ambient concentration, or a negative price returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the mass-balance makeup relation and the CO2 density at standard conditions with the crop producer guide and OSHA general-industry exposure limits named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`greenhouse co2 enrichment`, `carbon dioxide injection rate`, `co2 ppm greenhouse`, `enrichment loss air change`, `co2 burner greenhouse rate`.

## 2. The tile

### 2.1 `co2-enrichment-rate` -- Greenhouse CO2 Enrichment Injection Rate

```
initial charge   cu ft of CO2 = house volume x (target - ambient) / 1,000,000
makeup rate      cu ft/h = house volume x air changes per hour x
                 (target - ambient) / 1,000,000
mass             CO2 is about 0.1138 lb per cu ft at 70 degF and one atmosphere
ambient          roughly 400 to 450 ppm outdoors, and a closed house with an active
                 crop can fall well below that by mid-morning
target            commonly 800 to 1,200 ppm; the response flattens above that and
                 5,000 ppm is the occupational exposure limit for people
air changes      a tight closed house runs near 0.5 to 1.5 per hour; a house with
                 vents open runs tens per hour and enrichment becomes futile
sources          bottled or bulk liquid CO2, or a burner whose combustion products
                 enter the house -- the two have very different failure modes
```

Enrichment pays because the atmosphere is the limiting input in a closed house on a bright day. A vigorous
crop under good light draws the house down below outdoor ambient by mid-morning, so the first job of an
enrichment system is not to raise carbon dioxide above outside but to stop it falling below. That recovery
alone is worth real yield, and it is the part of the benefit that is most reliably obtained.

The economics live entirely in the air change rate. The initial charge is trivial -- a house is filled in
minutes -- and everything after that replaces gas that has blown out through the vents, the gutters, and the
doors. Tighten the house and the cost falls proportionally; open the vents and it rises by the same
proportion, which is why enrichment is a cold-weather and closed-house practice, and why a control that keeps
injecting while the vents are open is burning money at a rate that is easy to compute and startling to see.

A burner is a different machine from a tank and it must be treated as one. A burner puts water vapor and
combustion products into the house along with the carbon dioxide, so it raises humidity at the same time it
enriches, and an incomplete burn puts ethylene, carbon monoxide, and nitrogen oxides onto a crop that is
sensitive to all three at low concentration. Unvented burners in growing spaces are a life-safety matter for
the people in the house as much as a crop matter.

**Inputs:** the house volume, the ambient and target carbon dioxide concentrations, the air changes per hour at the operating condition, the gas price, and optionally a second vented air change rate

**Outputs:** the initial charge in cubic feet and pounds, the makeup rate in cubic feet and pounds per hour, the hourly cost, the same figures at a vented air change rate, and the ratio between them

## 3. Worked example

The 30 by 96 ft house, 43,200 cu ft, enriching from 400 to 1,000 ppm and closed tight at 1.0 air change per hour:

```
charge  = 43,200 x (1,000 - 400) / 1,000,000 = 25.9 cu ft (a one-time fill)
makeup  = 43,200 x 1.0 x (1,000 - 400) / 1,000,000 = 25.9 cu ft/h
mass    = 25.9 x 0.1138 = 2.95 lb/h
cost    = 2.95 x $0.10/lb = $0.30 per hour
```

**$0.30 an hour is an easy yes.** Over a 10 hour enrichment day that is $2.95, on a house growing a crop worth
far more than that, which is why enrichment is standard practice in a closed house.

**Now open the vents.** At 30 air changes per hour -- an ordinary figure for a house ventilating on a bright
mild day -- the same target costs:

```
makeup = 43,200 x 30 x 600 / 1,000,000 = 777.6 cu ft/h = 88.5 lb/h
cost   = $8.85 per hour
```

**30 times the rate and 30 times the cost, for the same 1,000 ppm.** The gas is going straight out of the
vents, and a controller that keeps the injector open when the vents crack is spending $8.85 an hour to
enrich the outdoors. **Interlocking the injector to vent position is the whole control strategy**, and it is
worth more than any refinement of the setpoint.

**The house is 2,880 sq ft, so the closed-house rate is 1.02 lb per 1,000 sq ft per hour** -- a figure worth
carrying, because supplier sizing tables are usually quoted in exactly those units.

## 4. Scope and non-goals

An injection-rate and cost estimate. It does not measure or predict the house's actual air change rate, which is the term that dominates the answer and which varies with wind, vent position, and the condition of the glazing and gutters -- a tracer or blower-door measurement is what establishes it, and an assumed value carries the whole uncertainty. It does not model the concentration gradient across a house, the drawdown by the crop, or the dynamics of a controller chasing a setpoint. It does not size or select equipment, address burner combustion products, ventilation, or the carbon monoxide and ethylene hazards a burner creates, or take any position on occupational exposure -- 5,000 ppm is the general-industry limit for people and an enrichment control failure is a confined-space hazard. It does not predict yield response, which flattens well before the concentrations some marketing claims reach. OSHA general-industry limits, the equipment manufacturer's instructions, the crop's producer guide, and a qualified installer govern.
