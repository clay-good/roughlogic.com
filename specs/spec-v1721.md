# roughlogic.com Specification v1721 -- Thermal Oxidizer Residence Time and Chamber Volume (`calc-airquality.js`, Group G Cross-Trade Utilities, air quality, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-airquality.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; air quality and environmental), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A thermal oxidizer destroys organics by holding them hot for long enough, and the three requirements -- temperature, time, and turbulence -- are all necessary. Residence time is chamber volume over flow, and a chamber sized on flow alone at the wrong temperature destroys nothing.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive chamber volume, gas flow, or residence time, or a chamber temperature below the required minimum returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the residence time relation with the gas expansion correction and NFPA 86 named for oxidizer safety, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`thermal oxidizer residence time`, `rto chamber volume`, `three ts combustion`, `gas expansion at temperature`, `destruction efficiency oxidizer`.

## 2. The tile

### 2.1 `thermal-oxidizer-residence` -- Thermal Oxidizer Residence Time and Chamber Volume

```
residence time     t = chamber volume / actual gas flow at temperature
                   the flow must be at CHAMBER conditions, not standard conditions
volume required    V = flow at temperature x required residence time
three T's          temperature, time, and turbulence; all three are required
typical            1,400 to 1,800 degF and 0.5 to 1.0 second for most VOC destruction
                   higher for halogenated compounds and for high destruction efficiency
expansion          gas expands roughly threefold from ambient to 1,600 degF, so the
                   actual flow in the chamber is far above the inlet standard flow
destruction        DRE is measured, not calculated; 98 to 99% is common permit language
```

The gas expansion is the arithmetic trap and it is a factor of three. A chamber sized on the inlet flow in
standard cubic feet gives a residence time three times what the unit actually achieves, because the gas expands
as it heats and moves through the chamber that much faster. Sizing must use the actual flow at chamber
temperature, and a unit that appears to have a full second of residence on standard flow may have a third of a
second in reality.

Temperature and time trade against each other but not freely. Destruction is a kinetic process, so a lower
temperature can be compensated by longer residence -- but the relationship is exponential in temperature and
linear in time, so dropping a hundred degrees costs far more residence than it saves in fuel. That is why
oxidizers run hot and short rather than cool and long.

Turbulence is the requirement without a number and the one that fails silently. A chamber with poor mixing has
regions where gas short-circuits from inlet to outlet in a fraction of the nominal residence time, and those
streams are not destroyed regardless of the chamber's average. Baffles and burner arrangement are what address
it, and a destruction efficiency test is what proves it -- which is why DRE is measured rather than calculated.

Halogenated compounds are a separate problem: they need higher temperatures, they produce acid gases that need
scrubbing downstream, and they attack the oxidizer's own materials.

**Inputs:** the inlet gas flow at standard conditions, the inlet and chamber temperatures, the required residence time and temperature, the chamber volume, and the compounds present

**Outputs:** the actual gas flow at chamber temperature, the expansion factor from standard conditions, the residence time in the entered chamber, the chamber volume required for the target residence time, the residence time computed wrongly on standard flow for comparison, and the auxiliary fuel to reach chamber temperature

## 3. Worked example

8,000 scfm entering an oxidizer operating at 1,600 degF, with a required 0.75 second residence.

**The expansion first:**

```
absolute temperatures: 1,600 degF = 2,060 degR;  70 degF = 530 degR
expansion factor = 2,060 / 530 = 3.89
actual flow in the chamber = 8,000 x 3.89 = 31,094 acfm
```

**Nearly four times the standard flow.** The chamber volume required:

```
V = 31,094 x 0.75 / 60 = 389 cu ft
```

Sizing on the standard flow instead:

```
V = 8,000 x 0.75 / 60 = 100 cu ft
```

100 cubic feet -- **a quarter of what is needed**. A unit built to that has 0.19 seconds of residence
where 0.75 was specified, and it will not meet its destruction efficiency no matter how hot it runs.

**Temperature versus time**, the trade that is not free: destruction kinetics are exponential in temperature and
linear in time, so dropping from 1,600 to 1,500 degF to save fuel requires far more than a proportional increase
in residence -- which usually means a bigger chamber, which costs more than the fuel saved.

**Turbulence** has no number here and it is the failure that a residence calculation cannot see. A chamber with
short-circuiting gives some of the gas a fraction of the nominal residence, and that gas leaves undestroyed. It
is why destruction efficiency is a stack test rather than a calculation.

## 4. Scope and non-goals

A residence time calculation. It does not predict destruction efficiency, which depends on the compounds
present, their destruction kinetics, the temperature, the mixing, and the presence of catalyst in a catalytic
unit -- and which is demonstrated by stack testing rather than calculated. It does not size an oxidizer, design
the burner and mixing, evaluate heat recovery (regenerative and recuperative units have very different fuel
consumption), or address the auxiliary fuel required, which depends on the inlet stream's own heating value. It
does not address halogenated compounds, which require higher temperatures and downstream acid gas control, or
catalyst poisoning in catalytic units. It does not address the flame arrestors, dilution, and lower explosive
limit monitoring that a stream with combustible content requires, which are safety systems. NFPA 86, the vendor's
design and performance guarantee, the applicable permit, and the permitting authority govern.
