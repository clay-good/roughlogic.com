# roughlogic.com Specification v1673 -- Tempering Temperature for a Target Hardness (`calc-inspection.js`, Group E Carpentry and Construction, metallurgy, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-inspection.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; heat treatment and metallurgy), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** As-quenched steel is hard and brittle and nobody uses it that way. Tempering trades hardness for toughness on a curve specific to the steel, and picking the temperature off that curve is what turns a quench into a usable part.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive tempering temperature or time, or a target hardness above the as-quenched hardness returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the tempering curve method with the applicable heat treatment specification and the steel producer data named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`tempering temperature for hardness`, `temper curve steel`, `one hour per inch temper`, `temper embrittlement range`, `secondary hardening tool steel`.

## 2. The tile

### 2.1 `tempering-for-hardness` -- Tempering Temperature for a Target Hardness

```
tempering curve   hardness versus tempering temperature, from the steel's own data
                  hardness falls as temperature rises; toughness rises with it
time              conventionally one hour per inch of section, minimum one hour
                  time has far less effect than temperature
temper embrittlement  some alloy steels lose toughness if tempered in or slow-cooled
                  through a specific range, commonly around 500 to 700 degF
secondary hardening  some tool and die steels HARDEN at higher tempering temperatures
double temper     tool steels are commonly tempered twice to transform retained austenite
as-quenched       hardness comes from carbon; tempering only reduces it
```

The tempering curve is the design tool. It is specific to the steel and it maps temperature to hardness, so a
target hardness is achieved by choosing a temperature and holding it -- not by choosing a time, because time has
a comparatively weak effect once the part is soaked through. That is why the conventional rule is an hour per
inch of section: enough to reach temperature throughout, and after that the temperature governs.

Two behaviours break the simple picture and both matter. Temper embrittlement affects certain alloy steels
tempered in or slow-cooled through a particular range: they come out at the right hardness and with badly reduced
toughness, and the failure appears in service rather than on a hardness tester. Avoiding that range, or cooling
rapidly through it, is a specification requirement rather than a preference.

Secondary hardening runs the other way. High-alloy tool and die steels can INCREASE in hardness when tempered at
high temperature as alloy carbides precipitate, so their tempering curve has a hump and the intuition that hotter
means softer is wrong for them. Those steels are also commonly double or triple tempered, because the first
temper transforms retained austenite to fresh martensite that the second temper then has to address.

**Inputs:** the steel grade and its tempering curve, the as-quenched hardness, the target hardness, the section thickness, and the temper embrittlement range for the grade where applicable

**Outputs:** the tempering temperature for the target hardness from the entered curve, the soak time for the section thickness, a flag when the required temperature falls in the entered embrittlement range, the hardness at an alternative temperature, and a double-temper recommendation for the entered grade class

## 3. Worked example

A quenched 4140 at 57 HRC as-quenched, needing 32 HRC:

```
from the 4140 tempering curve, 32 HRC corresponds to roughly 1,000 to 1,050 degF
soak time for a 2 in section = 2 hours minimum
```

Straightforward -- and note that the same part tempered at 400 degF would be around 52 HRC and at 1,200 degF
around 26 HRC. The temperature is the control.

**The embrittlement check.** Some alloy steels, 4140 among them under certain conditions, are susceptible to
temper embrittlement in a range around 700 to 1,050 degF, particularly on slow cooling through it. A part
tempered at 1,000 degF and furnace-cooled can come out at exactly the specified hardness with substantially
reduced impact toughness -- and a hardness test will not find it. Where the grade is susceptible, the
specification will require cooling rapidly through the range, and that is a process requirement rather than an
optional refinement.

**Secondary hardening**, for contrast. An H13 tool steel tempered at 1,000 degF is HARDER than the same steel
tempered at 700, because alloy carbides precipitate. Applying the intuition from 4140 to H13 gets the direction
wrong, and H13 is also double or triple tempered because each temper transforms retained austenite that the next
one has to address.

Time versus temperature: doubling the soak from 2 to 4 hours moves the hardness a small fraction of what a 100
degF temperature change does. Time is for reaching temperature; temperature is for hardness.

## 4. Scope and non-goals

A lookup against a tempering curve the user supplies. Tempering curves are steel and heat specific and come
from the producer's data or the applicable specification; a curve for one grade applied to another gives a wrong
temperature. It does not address temper embrittlement susceptibility, which depends on the steel's composition
including residual elements, or the cooling requirements that avoid it -- those are specification matters. It
does not address the number of tempers required, retained austenite, dimensional change during tempering, or
stress relief. It does not address the quench that preceded it (`jominy-quench-severity`), and a part that did
not harden properly cannot be corrected by tempering. Hardness alone does not establish that a part has the
required properties: toughness, and for many applications impact testing, are separate requirements. The material
specification, the applicable heat treatment specification, and the heat treater's qualified process govern.
