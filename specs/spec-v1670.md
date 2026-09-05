# roughlogic.com Specification v1670 -- Hardness Conversion and Estimated Tensile Strength (`calc-inspection.js`, Group E Carpentry and Construction, metallurgy, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-inspection.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; welding inspection and ndt), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Hardness is quick and tensile testing is destructive, so hardness is routinely used to estimate strength. The correlation is real for steel and it is an approximation with real limits -- and it does not exist at all for several materials people apply it to.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive hardness value, a hardness outside the conversion range, or a material outside the steel correlation returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the hardness-to-tensile approximation for steels with ASTM E140 named as governing scale conversion, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`hardness to tensile strength`, `brinell to psi conversion`, `rockwell brinell vickers conversion`, `astm e140 hardness`, `estimated ultimate tensile from hardness`.

## 2. The tile

### 2.1 `hardness-tensile-conversion` -- Hardness Conversion and Estimated Tensile Strength

```
steel estimate     UTS (ksi) approximately 0.50 x Brinell hardness
                   a widely used approximation valid over a broad hardness range
scale conversion   Brinell, Rockwell B and C, and Vickers convert between each other
                   through published tables (ASTM E140), not through a formula
limits             the tensile correlation is for STEEL; it does not hold for aluminium,
                   copper alloys, cast iron, or austenitic stainless in the same form
cold work          heavily cold-worked material reads harder than its strength implies
surface            case-hardened parts read the case, not the core
```

The half-times-Brinell rule is genuinely useful and genuinely bounded. It is an empirical fit for steels over a
useful hardness range and it is what lets a shop verify incoming material or confirm a heat treatment without
cutting a tensile specimen. Outside steel it does not apply: aluminium and copper alloys have their own and quite
different relationships, austenitic stainless work-hardens at the indentation and reads misleadingly, and cast
iron's graphite structure makes the whole idea of a single correlation unreliable.

The scale conversions are tables, not formulas, and that matters. ASTM E140 gives conversions between Brinell,
Rockwell, and Vickers that were established by measurement, and they are material-specific -- the conversion for
a carbon steel is not the conversion for a nickel alloy. A calculator that converts scales with a single equation
is producing numbers that agree with the tables in the middle and diverge at the ends.

The two field traps are surface and section. A case-hardened part read on its surface reports the case hardness,
which says nothing about the core strength that carries the load; and a part with a decarburized or work-hardened
surface reads the surface condition rather than the bulk. Reading through the surface, on a prepared section, is
what makes a hardness number represent the material.

**Inputs:** the measured hardness and its scale, the material class, the conversion table values, and the specified minimum tensile strength for comparison

**Outputs:** the hardness converted to the other common scales from the entered table values, the estimated ultimate tensile strength for steel, the estimate against a specified minimum, the applicability of the correlation for the entered material, and a warning where the material falls outside it

## 3. Worked example

A steel part measuring 200 HB:

```
estimated UTS = 0.50 x 200 = 100 ksi
```

About 100 ksi -- consistent with a mild structural steel and a useful confirmation that the material is what
the certificate says.

At 350 HB the same rule gives `0.50 x 350` = 175 ksi, a quenched and tempered grade. The rule tracks
across that range, which is why it is used.

**Where it stops working:**

```
aluminium 6061-T6, about 95 HB  -> 0.50 x 95 = 48 ksi estimated
actual UTS                       -> about 45 ksi -- close by coincidence, and the
                                    coefficient is different for other aluminium alloys
austenitic stainless             -> work hardens at the indentation; reads high
grey cast iron                   -> graphite structure; the correlation is unreliable
```

The correlation is a steel relationship, and applying it outside steel produces numbers that are sometimes close
and sometimes badly wrong with no way to tell which from the reading.

**The surface trap.** A carburized shaft reading 60 HRC on its surface has a case at that hardness and a core
that may be 30 HRC. Converting the surface reading to a tensile strength and using it as the shaft's strength
overstates it enormously -- the case is thin and the core carries the load. Reading a prepared section, or reading
the core, is what gives a number that means something (`carburizing-case-depth`).

## 4. Scope and non-goals

A conversion and estimate using table values the user supplies. Hardness scale conversions are empirical tables
that are material-specific -- ASTM E140 gives them and warns against extrapolating between materials -- and no
single formula reproduces them across their range. The tensile correlation applies to steels and is an
approximation with scatter; it is not acceptable as a substitute for a tensile test where a specification
requires one, and it says nothing about yield strength, elongation, or toughness, which are what most
specifications actually require. It does not apply to case-hardened, decarburized, cold-worked, or coated
surfaces without accounting for what is being indented, and it does not apply to materials outside the steel
family. Hardness testing itself has requirements for surface preparation, specimen thickness, spacing between
indentations, and indenter condition that affect the reading. ASTM E140, ASTM E10 and E18 for the test methods,
and the material specification govern.
