# roughlogic.com Specification v1528 -- Cathodic Protection Anode Count and Life (`calc-oilgas.js`, Group B Plumbing and Gas, pipelining, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-oilgas.js`**
> (Group B, Plumbing and Gas -- the existing category, hub `/groups/plumbing/`; oil, gas, and pipeline), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A buried steel line corrodes unless current is pushed onto it, and the two questions are how much current and how long the anodes last. Both are one multiplication each, and getting the coating quality wrong changes the answer by two orders of magnitude.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive surface area, current density, anode weight, or consumption rate, or a coating efficiency or utilization factor outside zero to one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the current-demand and anode-consumption relations with NACE SP0169 and 49 CFR 192 Subpart I named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`cathodic protection current`, `anode life calculation`, `sacrificial anode count pipeline`, `impressed current anode bed`, `cp current density coating`.

## 2. The tile

### 2.1 `cathodic-anode-count-life` -- Cathodic Protection Anode Count and Life

```
current required   I = A_bare x current_density
bare area          A x (1 - coating efficiency); a good coating exposes under 0.1%
anode life         t = W x utilization / (consumption_rate x I_anode)      years
                   consumption ~ 20 lb/A-yr magnesium, 1 lb/A-yr high-silicon cast iron
anode count        n = I_total / I_per_anode
```

Everything turns on how much steel is actually exposed. A well-coated line needs current only where the coating
has holidays, so its demand is a tiny fraction of a bare line's -- and that is why coating is the primary
corrosion control and cathodic protection is the secondary system that handles what the coating misses. A line
assumed bare when it is well coated gets a wildly oversized rectifier and anode bed; a line assumed well coated
when its coating has degraded gets a system that cannot hold potential, which is the more dangerous error.

Anode life is then just mass over consumption rate. The material choice drives it: galvanic magnesium is consumed
about twenty times faster per ampere than an impressed-current high-silicon cast iron anode, which is why
galvanic systems suit small, well-coated, low-current jobs and impressed current suits everything larger.
Utilization factor -- typically around 0.85 -- accounts for the anode becoming ineffective before it is fully
consumed.

**Inputs:** pipe diameter and length, coating efficiency or bare area percentage, the required current density, anode type with its weight, consumption rate, utilization factor, and the current output per anode

**Outputs:** the total and bare surface area, the current required, the number of anodes, the anode life in years, the total anode mass required for a target life, and the current demand if the coating degrades to a stated efficiency

## 3. Worked example

A 12.75 in line, 42 miles, coated to 99.9% efficiency (0.1% bare), at 1.5 mA per sq ft of bare steel:

```
total surface = pi x (12.75/12) x 42 x 5,280   = 740,222 sq ft
bare area     = 740,222 x 0.001                = 740 sq ft
current       = 740 x 1.5 mA / 1,000     = 1.11 A
```

Under 1 amps for forty-two miles of pipe -- that is what a good coating buys.

Now let the coating degrade to 99% efficiency, which is an ordinary condition on an older line:

```
bare area = 740,222 x 0.01 = 7,402 sq ft
current   = 11.1 A
```

Ten times the current, from a coating change most people would describe as "still mostly good." A rectifier sized
for the first case cannot hold this line, and the symptom is a potential survey that fails at the far end.

Anode life, impressed current, 50 lb high-silicon cast iron at 1 lb/A-yr, utilization 0.85, each carrying 3 A:
`50 x 0.85 / (1 x 3)` = 14.2 years.

## 4. Scope and non-goals

A current-demand and anode-life estimate. Required current density is not a constant: it depends on soil
resistivity, moisture, aeration, temperature, bacterial activity, and whether the line is in contact with other
structures, and published values span a wide range. Actual demand is established by a current-requirement test on
the installed line, not by calculation. The tile does not design the anode bed geometry, compute anode-to-earth
resistance or the rectifier voltage required to drive the current, evaluate interference with foreign structures
(a real hazard -- an anode bed can corrode a neighbour's pipeline), address stray current, or assess whether
protection criteria are being met, which is done by potential survey against the NACE criteria and not by design
calculation. Isolation, bonding, and AC interference on lines sharing a corridor with transmission are separate
problems. NACE SP0169, 49 CFR 192 Subpart I, and a qualified corrosion engineer govern.
