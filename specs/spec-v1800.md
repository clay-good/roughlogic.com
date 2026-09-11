# roughlogic.com Specification v1800 -- Power Usage Effectiveness and Cooling Overhead (`calc-datacenter.js`, Group A Electrical, data centre and mission-critical facilities, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-datacenter.js`**
> (Group A Electrical, hub `/groups/electrical/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Power usage effectiveness divides everything the building draws by what the computers draw, and the remainder is the facility's overhead. It is the industry's standard metric and it is a ratio, which means a genuine efficiency improvement can make it worse.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive IT load or tariff, negative overhead components, or a target PUE below 1 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): The Green Grid and ASHRAE power usage effectiveness definitions with the site's own metering and measurement category named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`power usage effectiveness pue`, `data center energy overhead`, `dcie data center infrastructure efficiency`, `cooling overhead kw per it kw`, `data center annual energy cost`.

## 2. The tile

### 2.1 `datacenter-pue` -- Power Usage Effectiveness and Cooling Overhead

```
PUE              total facility energy / IT equipment energy; 1.0 is the
                 unreachable ideal and everything above it is overhead
components       cooling and its pumps and fans, uninterruptible power supply and
                 distribution losses, lighting, and building services
DCiE             the reciprocal, expressed as a percentage
overhead         total - IT, the kilowatts the building spends to run the computers
annual energy    total kW x 8,760 h, and the cost at the tariff
measurement      PUE should be an ANNUAL energy ratio, not an instantaneous power
                 ratio; a winter afternoon reading flatters a hot climate badly
the trap         PUE is a RATIO. Reducing the IT load while overhead stays partly
                 fixed makes the ratio worse even though the building uses less
                 energy in total
```

PUE works because it is simple and it misleads for the same reason. A single number that anyone can compute
from two meters made efficiency comparable across an industry that had no common measure, and that was worth a
great deal. What it cannot do is tell you whether a facility is doing useful work, because the denominator is
energy consumed by IT equipment rather than computation delivered by it.

The ratio's behaviour under IT load reduction is the trap that catches operators and reporting alike.
Virtualise, retire old servers, or consolidate, and the IT load falls; the cooling load falls with it but not
proportionally, and lighting, controls, and standby losses barely move at all. The facility now uses less
energy and reports a worse PUE. A site managed to its PUE target will resist exactly the projects that save
the most energy.

Measurement period matters more than most published figures admit. An annual energy ratio captures the
economiser hours, the seasonal swing, and the part-load behaviour of the plant; an instantaneous reading
captures the weather that afternoon. A site in a cold climate quoting a January power ratio and a site in a
hot one quoting an annual energy ratio are not comparable, and the difference between the two conventions on
the same building can exceed the difference between two genuinely different buildings.

**Inputs:** the IT equipment load, the cooling, uninterruptible power supply, and lighting and miscellaneous loads, the energy tariff, and optionally a target PUE and a reduced IT load case

**Outputs:** the total facility load, the PUE and DCiE, the overhead in kilowatts and as a percentage of IT, the annual energy and cost, the energy and cost at a target PUE, and the PUE that results if the IT load is reduced

## 3. Worked example

A hall with 500 kW of IT load:

```
cooling    210 kW
UPS losses  35 kW
lighting    15 kW
total      = 760 kW
PUE        = 760 / 500 = 1.52
DCiE       = 65.8%
overhead   = 260 kW, or 52% of the IT load
```

**1.52 is an ordinary figure for an existing hall** -- not efficient, not scandalous, and typical of a
building with raised floor cooling and no containment.

```
annual = 760 kW x 8,760 = 6,657,600 kWh = $665,760
```

**Getting to 1.30 is worth $96,360 a year:**

```
total  = 500 x 1.30 = 650 kW
annual = 5,694,000 kWh = $569,400
```

**Now the trap, and it is the reason PUE targets are dangerous as objectives.** Suppose the site virtualises
and cuts the IT load to 400 kW. Cooling falls with it, to 175 kW; UPS losses fall a little, to 30 kW;
**lighting and controls do not move at all:**

```
total = 400 + 175 + 30 + 15 = 620 kW
PUE   = 620 / 400 = 1.55
```

**The building now draws 140 kW less -- 18 percent less energy, worth $122,640 a year -- and its
PUE got WORSE, from 1.52 to 1.55.**

**A site managed to a PUE target will resist the single most effective energy project available to it**, because
the metric punishes it. PUE measures how efficiently a building supports its IT load; it says nothing about
whether that load should be there. **Report total energy alongside it, always.**

## 4. Scope and non-goals

A metric calculation. PUE is defined by The Green Grid and ASHRAE with specific measurement categories and boundaries, and a figure is only comparable against another computed the same way: where the IT measurement is taken -- at the UPS output, the power distribution unit output, or the rack -- changes the answer materially, and an annual energy ratio and an instantaneous power ratio are different metrics. It does not measure useful work: a facility running idle servers efficiently reports a good PUE, which is why the metric is reported alongside total energy and, where a site can define it, a work-per-energy measure. It does not address water usage effectiveness, carbon usage effectiveness, or the source and carbon intensity of the electricity, which increasingly govern reporting obligations. It does not diagnose where overhead is going or size any equipment. The Green Grid and ASHRAE measurement definitions, the site's own metering, and the facility engineer govern.
