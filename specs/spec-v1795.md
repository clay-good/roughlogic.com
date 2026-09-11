# roughlogic.com Specification v1795 -- Landfill Gas Flare Capacity and Destruction (`calc-waste.js`, Group G Cross-Trade Utilities, solid waste and landfill operations, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-waste.js`**
> (Group G Cross-Trade Utilities, hub `/groups/cross-trade/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A flare has to burn the peak gas flow and keep burning as the field declines, and the second requirement is the harder one. Flares go out because the methane concentration fell, not because the flow did -- and over-pulling the wells is what causes it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive gas flow, heating value, turndown ratio, or global warming potential, a methane fraction or destruction efficiency outside 0 to 1, or a design margin below 1 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the flare capacity and turndown convention and the methane heating value with the flare manufacturer's sizing, the applicable air permit, and the governing greenhouse gas protocol named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`landfill gas flare sizing`, `flare turndown ratio lfg`, `methane destruction efficiency`, `enclosed flare capacity`, `lfg btu content air intrusion`.

## 2. The tile

### 2.1 `lfg-flare-capacity` -- Landfill Gas Flare Capacity and Destruction

```
design flow      the peak generation, which occurs at closure
                 (`landfill-gas-generation`), with a margin
heat release     methane cfm x 911 Btu per cubic foot x 60
turndown         the ratio of maximum to minimum stable flow; an enclosed flare
                 commonly holds 10:1, a candle flare much less
methane content  a flare needs roughly 20 to 25% methane to sustain a stable flame;
                 below that it will not hold regardless of flow
heat content     landfill gas at 50% methane is about 455 Btu per cubic foot; at 20%
                 it is about 182, which is the real limit
destruction      an enclosed flare is commonly credited with 98% or better methane
efficiency       destruction, a candle flare with less
air intrusion    over-pulling a well field draws air in through the cover, diluting
                 methane and raising the oxygen -- the flame is lost before the gas
greenhouse       destroyed methane counted at its global warming potential; the
credit           carbon dioxide produced is biogenic and is not counted against it
```

A flare is sized twice over, for the most gas it will ever see and for the least it must still burn, and the
two requirements pull in opposite directions. The peak is straightforward and is read off the generation
curve. The minimum is a combustion question rather than a flow question, and it is where flares actually fail
-- an enclosed flare with a wide turndown will handle a declining flow for decades, and will still go out the
first time the gas quality drops below what a flame needs.

Over-pulling is the operational cause and it is a self-inflicted one. A well field under too much vacuum
draws air down through the cover, which dilutes the methane, introduces oxygen, and in the worst case supports
a subsurface fire. The field's reward for chasing every cubic foot of gas is gas that is no longer combustible
and a flare that shuts down on flame failure -- which is a reportable event as well as an operational one, since
the gas is then venting.

The greenhouse credit is real and asymmetric in a way that is worth stating plainly. Methane destroyed is
counted at its global warming potential, which is tens of times carbon dioxide's; the carbon dioxide the flare
produces came from recently living biomass and is not charged against the credit. That asymmetry is why
flaring landfill gas is worth doing even where there is no energy project and no revenue at all.

**Inputs:** the peak landfill gas flow and its methane fraction, the design margin, the flare turndown ratio, the methane heating value, the destruction efficiency, the global warming potential, and a reduced methane fraction for the stability check

**Outputs:** the design and rated flare capacity, the heat release, the minimum stable flow from the turndown, the heat content of the gas at the design and at a reduced methane fraction, the annual methane mass destroyed, and the carbon dioxide equivalent credit

## 3. Worked example

The site from `landfill-gas-generation`, at peak:

```
methane    = 856 cfm
landfill gas at 50% methane = 1,712 cfm
rated with a 25% margin  = 2,140 scfm
heat release = 856 x 911 x 60 = 46.8 MMBtu/h
```

**A 2,140 scfm enclosed flare releasing 47 MMBtu/h at the peak.** Its turndown sets the other end:

```
minimum stable flow = 2,140 / 10 = 214 scfm
```

**214 scfm is reached by decline alone only after decades** -- at a 0.04 decay constant the flow takes
58 years to fall that far. **Flow is not what puts this flare out.**

**Gas quality is.** The flare needs about 20% methane to hold a flame:

```
at 50% methane: 456 Btu per cubic foot
at 20% methane: 182 Btu per cubic foot
```

**A 60 percent fall in methane content takes the gas to the edge of combustibility**, and it does not take
decades -- **it takes a well field pulled too hard for a week.** Air drawn down through the cover dilutes the
methane, raises the oxygen, and the flare trips on flame failure with plenty of flow still arriving. **Tune the
field to the gas, not to the vacuum.**

**The destruction is what the flare is for:**

```
methane mass = 856 cfm x 60 x 24 x 365 x 0.04226 lb/cu ft = 19,013,850 lb/yr
destroyed    = 18,633,573 lb = 9,317 tons
CO2e credit  = 9,317 x 28 = 260,870 tons CO2e per year
```

**260,870 tons of carbon dioxide equivalent a year from a flare that produces no revenue at all.** The
carbon dioxide the flare emits is biogenic and is not charged against the credit, which is the asymmetry that
makes flaring worth doing on sites with no energy project.

## 4. Scope and non-goals

A sizing and credit estimate. Flare selection is a combustion engineering matter and the manufacturer's own sizing governs: turndown, the minimum heat content for stable operation, the pilot and ignition arrangement, flame arrestors, the stack height and residence time an enclosed flare needs to reach its rated destruction, and the emissions of nitrogen oxides, carbon monoxide, and products of incomplete combustion are all outside this arithmetic. Destruction efficiency is a credited value that depends on the flare type, its operation, and the applicable rule, and it is demonstrated by a performance test rather than assumed. Global warming potentials differ between reporting protocols and between assessment report vintages, and the applicable protocol governs which value may be claimed. It does not design the well field, the header, the condensate knockout, or the blower, and it does not address gas quality constituents -- siloxanes, hydrogen sulfide, halogenated compounds -- that affect both equipment and emissions. It takes no position on the Clean Air Act new source performance standards and emission guidelines, Title V permitting, or the greenhouse gas reporting and offset protocols under which a credit could be claimed. The flare manufacturer's sizing, the applicable Clean Air Act regulations and air permit, the governing greenhouse gas protocol, and a qualified landfill gas engineer govern.
