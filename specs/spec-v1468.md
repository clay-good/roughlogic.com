# roughlogic.com Specification v1468 -- Underground Duct-Bank Ampacity Derate (`calc-lineworker.js`, Group A Electrical, line work, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lineworker.js`**
> (Group A, Electrical -- the existing category, hub `/groups/electrical/`; overhead line and distribution), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** The catalog derates conductors for ambient and for fill in a raceway. It does nothing for a concrete-encased duct bank, where several circuits heat each other through the earth and the governing variables are burial depth, spacing, thermal resistivity of the soil, and load factor. This is where feeder ampacity is actually decided on a commercial or utility job.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a duct count below one, a non-positive spacing, depth, or thermal resistivity, or a load factor outside zero to one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the Neher-McGrath ampacity framework with IEEE 835 and NEC Article 310 named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`duct bank ampacity`, `neher mcgrath derate`, `concrete encased duct ampacity`, `mutual heating cables`, `underground feeder ampacity`.

## 2. The tile

### 2.1 `duct-bank-ampacity-derate` -- Underground Duct-Bank Ampacity Derate

```
Neher-McGrath form   I = sqrt( dTc / ( Rdc (1+Yc) Rca ) )
mutual heating        Rca includes the interference from every other loaded duct
derate factor         DF = I_ductbank / I_table
rho thermal           soil RHO-90 typically 60 to 120 degC-cm/W; concrete ~55 to 85
```

The physical picture is simple even though the arithmetic is not: every loaded cable in the bank is a heat
source, the earth is a poor conductor of heat, and each cable's operating temperature is raised by all the
others. Ampacity falls with the number of loaded ducts, with closer spacing, and with higher soil thermal
resistivity, and it rises with depth only up to a point before the extra earth path hurts more than the cooler
ambient helps.

Two inputs dominate and both are routinely guessed. Soil thermal resistivity varies by a factor of two or more
between wet clay and dry sand, and a dry-out zone around a heavily loaded bank can push local resistivity far
above the design value -- the classic mechanism behind duct bank failures. Load factor matters because the earth
has a long thermal time constant: a bank at 75% load factor carries meaningfully more than one at 100%.

**Inputs:** number of ducts and how many are loaded, duct spacing and burial depth, soil and concrete thermal resistivity, ambient earth temperature, conductor temperature rating, load factor, and the base table ampacity

**Outputs:** the derate factor, the derated ampacity per circuit, the governing (hottest) duct position, the ampacity at a stated alternative soil resistivity, and the conductor size needed to carry a target load after derating

## 3. Worked example

A 3 by 3 duct bank, all nine ducts loaded, 7.5 in center-to-center spacing, 36 in to the top, soil thermal
resistivity 90 degC-cm/W, earth ambient 20 degC, 90 degC conductor, 100% load factor. Base NEC table ampacity for
the cable is 285 A:

```
governing duct  = center of the bank (sees all eight neighbours)
derate factor   ~ 0.62 for this geometry, resistivity, and load factor
derated ampacity= 285 x 0.62 = 177 A per circuit
```

The table says 285 A and the duct bank says 177 A. That is not a rounding correction -- it is nearly two
conductor sizes, and a design that used the table value would run the center ducts over temperature for the life
of the installation. Drop to five loaded ducts and the factor rises toward 0.72; raise soil resistivity to 120
and it falls toward 0.56, which is the sensitivity that argues for a measured thermal resistivity rather than an
assumed one.

## 4. Scope and non-goals

A screening derate for a rectangular concrete-encased bank with uniformly loaded, equally sized circuits. It
is NOT a Neher-McGrath computation to IEEE 835 accuracy: it does not solve the full thermal circuit, does not
handle unequal loading between ducts, mixed conductor sizes, cables in air within a manhole, or the transition at
the riser, and does not model a soil dry-out zone. Those cases need cable ampacity software and, above about 15
kV or on any utility feeder, a thermal study. The base table ampacity must come from the correct NEC table for
the installation, and NEC 310.15(C) adjustment and 110.14(C) termination limits still apply on top. IEEE 835,
NEC Article 310, the cable manufacturer's data, and a measured soil thermal resistivity govern.
