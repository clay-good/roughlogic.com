# roughlogic.com Specification v1724 -- Electrostatic Precipitator Collection Efficiency (Deutsch) (`calc-airquality.js`, Group G Cross-Trade Utilities, air quality, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-airquality.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; air quality and environmental), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** An electrostatic precipitator's efficiency follows an exponential in collecting area, so each increment of plate area removes the same FRACTION of what is left -- and reaching very high efficiency takes disproportionately more plate. That shape is why ESPs are large.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive plate area, migration velocity, or gas flow, or a target efficiency at or above one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the Deutsch equation by name with its known limitations and the vendor performance guarantee named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`esp deutsch equation`, `precipitator efficiency area`, `migration velocity esp`, `dust resistivity back corona`, `electrostatic precipitator sizing`.

## 2. The tile

### 2.1 `esp-deutsch-efficiency` -- Electrostatic Precipitator Collection Efficiency (Deutsch)

```
Deutsch equation   eta = 1 - exp( -A w / Q )
A                  collecting plate area
w                  migration velocity, the speed particles drift toward the plate
Q                  gas volumetric flow
diminishing        90% takes a certain area; 99% takes twice it; 99.9% takes three times
migration velocity depends on particle size, resistivity, and field strength; it is
                   fitted from performance rather than predicted
resistivity        the dominant variable; too high causes back corona, too low and
                   particles re-entrain
rapping            plates are rapped to release the cake; rapping re-entrains some of it
```

The exponential is what governs ESP design and it is unforgiving at the top end. Each doubling of plate area
removes the same fraction of the remaining penetration, so going from 99 to 99.9 percent efficiency requires as
much additional area as going from 0 to 90 did. That is why high-efficiency precipitators are enormous and why
the last increment of performance is the expensive one.

Migration velocity carries all the physics and it is not a constant. It depends on particle size distribution,
on the dust's electrical resistivity, and on the field strength achieved -- and resistivity is the variable that
dominates. Dust with very high resistivity does not give up its charge at the plate, a reverse ionization forms
in the layer, and collection collapses; dust with very low resistivity gives up its charge instantly and is
re-entrained. Both failure modes appear as poor efficiency with a mechanically perfect unit.

Resistivity is temperature and moisture dependent, which is why conditioning agents exist. Injecting sulphur
trioxide or ammonia, or changing the operating temperature, moves the dust's resistivity into the workable range
-- and a precipitator that stopped performing after a fuel change is usually a resistivity story rather than an
equipment one.

**Inputs:** the collecting plate area, the gas volumetric flow, the migration velocity, the target efficiency, and the dust resistivity and temperature

**Outputs:** the efficiency at the entered area and migration velocity, the area required for a target efficiency, the additional area to go from one efficiency to a higher one, the migration velocity implied by a measured efficiency, and the penetration remaining

## 3. Worked example

An ESP with 12,000 sq ft of plate on 60,000 acfm, migration velocity 0.2 ft/s:

```
eta = 1 - exp( -12,000 x 0.2 / (60,000/60) )
    = 1 - exp( -2.40 ) = 0.9093 = 90.93%
```

**Now the area to go further:**

```
99.0%  needs A = -ln(0.010) x (60,000/60) / 0.2 = 23,026 sq ft
99.9%  needs A = -ln(0.001) x (60,000/60) / 0.2 = 34,539 sq ft
```

Going from 99.0 to 99.9 percent takes another
11,513 sq ft -- **as much plate as the first 90 percent
required**. That exponential shape is the whole economics of precipitator design.

**And migration velocity is the number that actually moves.** If a fuel change raises the dust's resistivity and
w falls from 0.2 to 0.12 ft/s:

```
eta = 1 - exp( -12,000 x 0.12 / (60,000/60) ) = 0.7631 = 76.31%
```

The penetration goes from 9.07 to 23.69 percent --
**2.6 times the emissions**, from a fuel change with no equipment fault at all.
That is the diagnosis a precipitator that "stopped working" usually needs, and the fix is conditioning or a
temperature change rather than repair.

## 4. Scope and non-goals

A Deutsch-equation screen. Migration velocity is an effective, fitted parameter rather than a physical property
-- it lumps particle size distribution, resistivity, field strength, sneakage, and re-entrainment into one number
-- and it must come from measured performance on a similar duty rather than from a table. The Deutsch equation
itself systematically overpredicts efficiency for a wide particle size distribution, and modified forms
(Deutsch-Anderson with an exponent) fit better. It does not size an ESP, design fields and sectionalization,
address rapping and its re-entrainment, or evaluate the electrical energization that determines field strength.
It does not address dust resistivity, which dominates performance and which is measured, or the conditioning
systems used to manage it. It does not address the combustible dust and arcing hazards. The vendor's design and
performance guarantee, the applicable permit, and the permitting authority govern.
