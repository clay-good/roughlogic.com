# roughlogic.com Specification v1723 -- SPCC Secondary Containment Volume and Freeboard (`calc-airquality.js`, Group G Cross-Trade Utilities, air quality, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-airquality.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; air quality and environmental), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Secondary containment for an oil tank holds the largest single tank plus room for rain, and the freeboard is not optional. The volume is a simple sum and the number people get wrong is the displacement of everything else standing inside the dike.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive tank capacity or dike dimension, or a displacement volume exceeding the dike gross volume returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): 40 CFR Part 112 secondary containment requirements by name with the certifying Professional Engineer named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`spcc secondary containment volume`, `dike capacity oil tank`, `freeboard precipitation containment`, `displacement inside dike`, `spcc drain valve`.

## 2. The tile

### 2.1 `spcc-containment-volume` -- SPCC Secondary Containment Volume and Freeboard

```
required volume    the largest single container's capacity, plus freeboard for
                   precipitation
freeboard          commonly sized for a 25-year, 24-hour storm event, or a stated
                   percentage; the applicable rule and the PE certification govern
displacement       other tanks, foundations, and equipment inside the dike occupy volume
                   that is NOT available to hold oil -- subtract them
net capacity       dike volume minus displacement
drainage           a dike with an open drain valve has no capacity; valves are normally
                   closed and locked
impervious         the containment must be sufficiently impervious to hold the oil
                   long enough to recover it
```

The displacement subtraction is what gets missed. A dike sized to hold the largest tank looks adequate until
you notice that three other tanks, their ring foundations, and a pump skid all stand inside it and occupy volume
that oil cannot. The net capacity is the dike's gross volume minus everything in it up to the containment height,
and on a congested tank farm that displacement can be a substantial fraction of the total.

Freeboard for precipitation is the other required allowance and it is a design storm rather than a token. A dike
that exactly holds the largest tank is full at the moment of a release and overtops with the next rain -- and in
practice it is partly full of rainwater before the release even happens, unless it is drained on a managed basis.

The drain valve is the operational failure that voids all of it. Dike drain valves are required to be normally
closed and secured, and rainwater is released only after inspection confirms it is free of oil. A dike with its
drain left open has no containment capacity at all, and it is one of the most common findings in an SPCC
inspection -- the engineering is correct and the valve is open.

The impervious requirement is what distinguishes containment from a berm. Soil that drains does not contain, and
demonstrating sufficient imperviousness is part of the plan.

**Inputs:** the capacity of each container, the dike dimensions and wall height, the volume of tanks, foundations, and equipment inside the dike, the required freeboard or design storm, and the drainage arrangement

**Outputs:** the largest single container capacity, the required volume with freeboard, the dike gross volume, the displacement of contents, the net available capacity, the margin, and the dike height required to achieve the requirement

## 3. Worked example

A tank farm whose largest tank holds 12,000 gallons, with a required 10 percent freeboard for
precipitation:

```
required = 12,000 x 1.10 = 13,200 gallons = 1,764 cu ft
```

The dike is 80 by 60 ft with 3 ft walls:

```
gross volume = 80 x 60 x 3 = 14,400 cu ft = 107,726 gallons
```

Comfortable -- until the displacement:

```
three other tanks, each 12 ft diameter, foundations to 1 ft:
  tank displacement to 3 ft: 3 x pi/4 x 12^2 x 3 = 1,018 cu ft
  ring foundations and pump skid, say                     900 cu ft
total displacement                                        1,918 cu ft
net capacity = 14,400 - 1,918 = 12,482 cu ft = 93,379 gallons
```

**93,379 gallons available against 13,200 required** -- and whether it
passes depends entirely on the displacement that a gross-volume calculation ignores.

**The drain valve.** If this dike's drain is left open -- as it commonly is, to let rain out without the trouble
of inspecting and pumping -- the containment capacity is zero regardless of every number above. Normally closed
and secured, released only after inspection, is the requirement, and an open valve is the most frequent SPCC
finding there is.

## 4. Scope and non-goals

A volume calculation. SPCC requirements -- the sizing basis for containment, the freeboard, what counts as
sufficiently impervious, the inspection and recordkeeping obligations, and whether a facility is subject at all
-- are set by 40 CFR Part 112, and most SPCC plans must be prepared and certified by a licensed Professional
Engineer, whose determinations govern. It does not address the many other elements of an SPCC plan: facility
diagrams, discharge prevention and response procedures, inspection schedules, integrity testing of containers,
loading and unloading area containment, training, and the plan review and amendment cycle. It does not address
state and local requirements, which are often more stringent, or containment for materials other than oil, which
follow different rules. 40 CFR Part 112, the certifying Professional Engineer, and the applicable state
requirements govern.
