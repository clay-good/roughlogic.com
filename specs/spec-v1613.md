# roughlogic.com Specification v1613 -- Flexible Pavement Structural Number (AASHTO 93) (`calc-civil.js`, Group E Carpentry and Construction, traffic control, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-civil.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; traffic, work zone, and pavement), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Flexible pavement design comes down to one number that describes the whole section: the structural number, a weighted sum of layer thicknesses. It is how a designer trades asphalt against base, and how an inspector checks whether a substituted section is equivalent.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive layer thickness or coefficient, or a drainage coefficient outside the allowable range returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the AASHTO 93 structural number relation with the agency pavement design manual named as governing coefficients, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`pavement structural number`, `aashto 93 sn`, `layer coefficient pavement`, `pavement section equivalency`, `flexible pavement design thickness`.

## 2. The tile

### 2.1 `pavement-structural-number` -- Flexible Pavement Structural Number (AASHTO 93)

```
structural number  SN = sum( a_i x D_i x m_i )
a_i                layer coefficient: asphalt concrete ~0.44, crushed base ~0.14,
                   subbase ~0.11 (agency values govern)
D_i                layer thickness in inches
m_i                drainage coefficient for unbound layers, 0.8 to 1.2
required SN        from the AASHTO 93 equation, using ESALs, reliability, subgrade
                   resilient modulus, and the serviceability loss
equivalency        two sections with the same SN are nominally equivalent
```

The layer coefficients are what make the trade visible. An inch of asphalt is worth roughly three inches of
crushed base and four inches of subbase, so a contractor proposing to substitute base for asphalt has to add
three or four times the thickness to stay equivalent -- and that substitution is often cheaper and often
perfectly sound, which is why the arithmetic gets used in the field.

The drainage coefficient is the term that quietly punishes bad detailing. An unbound layer that stays saturated
carries an m below 1.0, and the section loses structural number without losing an inch of material. Edge drains,
daylighted base, and a subgrade that drains are worth real thickness, and this is where that shows up
numerically.

The required SN comes from the AASHTO equation and depends most strongly on two inputs: the traffic loading in
ESALs (`esal-traffic-loading`) and the subgrade's resilient modulus. Both are commonly assumed rather than
measured, and both move the answer by inches of asphalt -- so a design built on assumed values deserves to be
checked against measured ones.

**Inputs:** each layer with its thickness, layer coefficient, and drainage coefficient; the required structural number; and the design ESALs, reliability, subgrade modulus, and serviceability loss where the requirement is being computed

**Outputs:** the structural number contributed by each layer and the total, the total against the required value, the margin or shortfall, the additional thickness of any single layer needed to meet the requirement, and an equivalent alternative section

## 3. Worked example

A section of 4 in asphalt over 8 in crushed base over 10 in subbase, drainage coefficient 1.0
on the base and 0.8 on the subbase:

```
asphalt  0.44 x 4        = 1.76
base     0.14 x 8 x 1.0  = 1.12
subbase  0.11 x 10 x 0.8  = 0.88
SN                              = 3.76
```

Against a required SN of 3.00 this section passes with 0.76 to spare.

The substitution question: a contractor wants to cut an inch of asphalt. That removes 0.44 of SN, which has to
come back from base:

```
base thickness needed = 0.44 / (0.14 x 1.0) = 3.1 in
```

**3.1 inches of base for one inch of asphalt.** Whether that is a good trade depends on the price of each
and on whether the extra base fits within the grade -- but the equivalency is not a judgment call, it is this
division.

The drainage penalty made concrete: if the base is poorly drained and its coefficient drops from 1.0 to 0.8, the
section loses `0.14x8x0.2` = 0.22 of SN, and the total falls to 3.54 -- most of the way
to failing. Edge drains are structure.

## 4. Scope and non-goals

A structural number calculation using coefficients the user supplies. Layer coefficients are agency-specific
and depend on material quality; using generic values where an agency publishes its own gives a wrong answer. The
required structural number from the AASHTO 93 equation depends on design ESALs, reliability level, overall
standard deviation, subgrade resilient modulus, and the allowable serviceability loss, and this tile does not
solve that equation -- the required SN must be entered. AASHTO 93 is an empirical method derived from the AASHO
Road Test; mechanistic-empirical design (AASHTOWare Pavement ME) supersedes it in many agencies and gives
different answers. It does not address rigid pavement, layer thickness minimums, construction tolerances, or the
subgrade preparation and compaction that determine whether the designed section performs. The agency's pavement
design manual, the geotechnical investigation, and the pavement engineer govern.
