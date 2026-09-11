# roughlogic.com Specification v1770 -- Galvanic Couple Driving Voltage and Area Ratio (`calc-corrosion.js`, Group G Cross-Trade Utilities, cathodic protection and corrosion control, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-corrosion.js`**
> (Group G Cross-Trade Utilities, hub `/groups/cross-trade/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Two dissimilar metals in contact in an electrolyte make a cell, and the galvanic series says which one corrodes. What the series does not say is how fast, and that is set almost entirely by the ratio of the two areas -- a ratio whose effect is quadratic and therefore enormous.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: equal potentials for the two metals, a non-positive area for either metal, or a non-positive current density, equivalent weight, or density returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the galvanic-cell area-ratio relation and Faraday's electrochemical equivalent with the applicable galvanic series for the service electrolyte named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`galvanic corrosion area ratio`, `dissimilar metal corrosion`, `galvanic series driving voltage`, `small anode large cathode`, `bimetallic corrosion fastener`.

## 2. The tile

### 2.1 `galvanic-area-ratio` -- Galvanic Couple Driving Voltage and Area Ratio

```
driving voltage  the difference between the two metals' potentials in the service
                 electrolyte; the galvanic series is ELECTROLYTE-SPECIFIC
which corrodes   the more active (more negative) metal is the anode and is consumed
total current    limited by the CATHODIC reaction, so it scales with the CATHODE
                 area: I = i_c x A_cathode
anode density    i_a = I / A_anode -- the current concentrated onto the anode
the ratio        i_a scales as A_cathode / A_anode, so reversing a couple's areas
                 changes the attack rate by the SQUARE of the ratio
penetration      steel consumes about 20 lb per ampere-year; at 490 lb/cu ft that
                 converts a current density to inches per year
the rule         never put a small anode with a large cathode; a small CATHODE with
                 a large anode is nearly harmless
```

The galvanic series answers the easy question and the area ratio answers the hard one. Knowing that steel is
anodic to copper tells a designer the direction of the attack and nothing about whether it matters, and
couples of identical driving voltage can be harmless or catastrophic depending only on their proportions.
Every field failure attributed to "dissimilar metals" is really a failure of area ratio.

The asymmetry is what makes the rule memorable and it follows directly from where the current is limited. The
cathode sets how much current flows, because the reduction reaction on its surface is the bottleneck; the
anode then has to supply all of it from whatever area it has. A large cathode gathers a large current and
forces it through a small anode, concentrating the attack; a small cathode gathers almost nothing and spreads
it over a large anode, where it disappears into the background rate.

This is why fastener selection is the classic case and why it is so often got backwards. A steel bolt in a
copper or graphite-composite structure is a small anode against an effectively unlimited cathode and will not
last. The same materials reversed -- a copper or stainless fastener in a steel structure -- is a small cathode
against a large anode, and the steel loses a quantity of metal it will never notice. The materials list is
identical; only the geometry differs.

**Inputs:** the two metals' potentials in the service electrolyte or the driving voltage, the cathodic current density, the cathode and anode areas, and the anode metal's electrochemical equivalent and density

**Outputs:** the driving voltage and which metal is the anode, the galvanic current, the current density on the anode, the penetration rate in inches per year, the same figures for the reversed area ratio, and the ratio between the two attack rates

## 3. Worked example

Carbon steel coupled to copper in seawater, at potentials of -0.61 and -0.36 V:

```
driving voltage = -0.36 - (-0.61) = 0.25 V -- steel is the anode
```

**Case A: a steel fastener in a copper plate.** Steel 1 sq in, copper 1,000 sq in, with the copper
supporting 5 mA per square foot of cathodic current:

```
I     = 5 mA/sq ft x 6.944 sq ft = 34.7 mA
i_a   = 34.7 mA / 0.00694 sq ft = 5,000 mA/sq ft = 5.0 A/sq ft
rate  = 5.0 A/sq ft x 20.1 lb/A-yr / 490 lb/cu ft x 12 = 2.46 in/yr
```

**2.5 inches per year.** The fastener is not going to corrode; it is going to disappear. No practical
coating or inhibitor saves a couple with this geometry.

**Case B: the same two metals, areas reversed.** A copper fastener of 1 sq in in a steel plate of 1,000 sq in:

```
I     = 5 mA/sq ft x 0.00694 sq ft = 0.0347 mA
i_a   = 0.0347 mA / 6.944 sq ft = 0.0050 mA/sq ft
rate  = 2.46e-06 in/yr
```

**0.00246 mils per year -- immeasurably small.** The same metals, the same electrolyte, the same
0.25 V driving voltage, and the attack rate differs by a factor of **1,000,000**.

**That factor is the area ratio squared, and it is the entire lesson.** The cathode grew by 1,000 times and the
anode shrank by 1,000 times, and the two multiply. **The galvanic series told you which metal corrodes; only the
geometry tells you whether anyone will ever notice.**

**The design rule falls straight out: a small cathode is safe, a small anode is not.** Where a couple cannot be
avoided, make the critical component the cathode, insulate the joint, or coat the CATHODE -- coating the anode
is the one intervention that makes it worse, because a holiday in that coating is a still smaller anode.

## 4. Scope and non-goals

A screening comparison. The galvanic series is specific to the electrolyte, its temperature, its aeration, and its flow, and potentials shift with all of them -- some couples reverse polarity entirely with temperature, which is why a series for one service must never be applied to another. The cathodic current density is entered and is the limiting term in reality: it depends on oxygen availability, flow, temperature, and any film on the cathode, and it is not a material constant. The uniform penetration rate assumes the attack spreads evenly over the anode, which it does not near the joint -- galvanic attack concentrates within a short distance of the contact, so the local rate near the couple exceeds this figure, often by a large factor. It does not address crevice corrosion at the joint, which frequently dominates, nor the effect of a coating, an insulating kit, or a cathodic protection system on the couple. It does not select materials or design a joint. The applicable galvanic series for the service electrolyte, the materials engineer, and a qualified corrosion engineer govern.
