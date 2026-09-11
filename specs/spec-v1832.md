# roughlogic.com Specification v1832 -- Pile Driving Hammer Energy and Bearing Capacity (`calc-marine.js`, Group E Carpentry and Construction, marine construction and dredging, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-marine.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A dynamic formula converts hammer energy and the pile's movement per blow into a bearing capacity, and it has been used on driven piles for a century. It is also one of the least reliable predictions in geotechnical practice, and saying so is part of using it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive hammer energy, required capacity, or loss constant, or a computed set at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the Engineering News dynamic formula and its embedded factor of safety with a wave equation analysis, dynamic or static load testing, and the applicable design code named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`pile driving formula engineering news`, `enr pile bearing capacity`, `set per blow refusal`, `blows per foot pile driving`, `dynamic pile formula reliability`.

## 2. The tile

### 2.1 `pile-hammer-bearing` -- Pile Driving Hammer Energy and Bearing Capacity

```
the idea         work done by the hammer equals the pile's resistance times the
                 distance it moved, less losses
Engineering News R_allowable = 2 E / (s + c)
                 E the rated hammer energy in ft-lb, s the set per blow in inches,
                 c a loss constant: 0.1 in for steam, air, and diesel hammers,
                 1.0 in for a drop hammer
the factor       the ENR form has a factor of safety of about 6 already embedded;
of safety        it returns an ALLOWABLE load, not an ultimate one
set              s = 2 E / R - c, the driving criterion a crew works to
blow count       1/s blows per inch, or 12/s per foot
refusal          a specification's practical refusal, commonly around 10 blows per
                 inch, beyond which driving risks damaging the pile
the honest       dynamic formulas correlate poorly with measured capacity;
caveat           scatter of a factor of two or three is documented, and modern
                 practice uses wave equation analysis and dynamic testing
```

The formula survives because it is the only thing a crew can compute at the pile, and it should be used as a
field control rather than as a design method. A driving criterion expressed in blows per inch gives the
foreman something to count and gives the inspector something to witness, and on a site where the criterion was
calibrated against a load test or a dynamic measurement it is a perfectly reasonable way to run production
piles.

Used as a prediction it is poor, and the record on this is not ambiguous. Comparisons of dynamic formula
predictions against static load tests show scatter of a factor of two or three in both directions, which is why
the built-in factor of safety is as large as six and why it is still not enough on its own. The formula takes
no account of the pile's own stiffness and length, the hammer-cushion-pile system's dynamics, or the soil's
behaviour under a transient load -- all of which a wave equation analysis does represent.

Refusal exists to protect the pile rather than to prove capacity. Beyond a certain blow count the energy going
into each blow is no longer advancing the pile and is instead being absorbed by the pile itself, which damages
the head, buckles the toe, or breaks a concrete section. A specification that sets refusal at a blow count is
saying stop driving, not saying the capacity has been demonstrated -- and a pile at refusal in a soft layer
above a hard one has proven nothing about what it is bearing on.

**Inputs:** the rated hammer energy, the hammer type and its loss constant, the required allowable capacity, and the specification's refusal criterion

**Outputs:** the set per blow for the required capacity, the corresponding blows per inch and per foot, the capacity at the refusal criterion, the capacity at a looser set, and the implied ultimate capacity at the formula's embedded factor of safety

## 3. Worked example

A hammer rated 42,000 ft-lb driving to an allowable capacity of 150 tons:

```
s = 2 x 42,000 / 300,000 - 0.1 = 0.180 in per blow
blows = 1 / 0.180 = 5.6 per inch = 67 per foot
```

**5.6 blows per inch is the driving criterion**, and it is what the inspector counts. The implied ultimate
capacity at the formula's embedded factor of safety is 900 tons.

**At the specification's refusal of 10 blows per inch:**

```
R = 2 x 42,000 / (0.1 + 0.1) = 420,000 lb = 210 tons allowable
```

**210 tons -- 1.4 times the required capacity.** A pile driven to refusal has considerable margin by
the formula, which is exactly the comfort the formula should not be relied on to provide.

**And at a looser set the number falls fast:**

```
s = 0.3 in: R = 210,000 lb = 105 tons -- 30 percent below the requirement
```

**The whole range from 0.3 in to 0.1 in of set spans 105 to 210 tons** -- a factor of 2.0 -- **from a
measurement of a tenth of an inch taken by eye on a moving pile.** That sensitivity is the first reason the
formula is unreliable and it is entirely visible in the arithmetic.

**The second reason is not visible here at all.** The relation contains nothing about the pile's length,
stiffness, or mass, nothing about the cushion, and nothing about how soil behaves under a blow lasting
milliseconds. **Measured against static load tests, dynamic formulas scatter by a factor of two or three**,
which is why the embedded factor of safety is six and why that is still not sufficient on its own.

**Use it as a field control on a criterion someone calibrated.** A wave equation analysis sets the criterion, a
dynamic pile test or a static load test verifies it, and **this arithmetic is how the crew hits it** -- not how
anyone decides what it should be.

## 4. Scope and non-goals

A field control calculation, not a design method. Dynamic formulas correlate poorly with measured pile capacity and the published scatter against static load tests is large in both directions; no modern code permits a driven pile foundation to be designed on a dynamic formula alone. Design capacity comes from a static analysis of the soil profile, and the driving criterion comes from a wave equation analysis of the specific hammer, cushion, pile, and soil system, verified by dynamic testing with signal matching or by a static load test. The formula takes no account of pile length, stiffness, or mass, cushion properties, hammer efficiency and its variation with condition and stroke, or soil setup and relaxation -- capacity commonly changes substantially in the days after driving, in either direction, and a restrike is what measures it. It does not address pile damage, driving stresses, drivability through hard layers, or the effect of driving on adjacent structures and on ground vibration. It does not address group effects, downdrag, uplift, or lateral capacity. A site-specific geotechnical investigation, a wave equation analysis, dynamic or static load testing, the applicable design code, and a licensed geotechnical engineer govern.
