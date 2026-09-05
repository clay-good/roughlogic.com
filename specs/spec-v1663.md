# roughlogic.com Specification v1663 -- Structural Adhesive Bond Area and Shear Strength (`calc-mechanic.js`, Group K Mechanic - Auto, Marine, Aviation, auto body, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, Mechanic - Auto, Marine, Aviation -- the existing category, hub `/groups/mechanic/`; auto body and refinishing), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Structural adhesive replaces welds on many modern panels, and its capacity is an area times a shear strength -- so bond width and length are structural dimensions, not assembly conveniences. A bead that is short or narrow is a joint that is under-designed.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive bond length, width, or shear strength, or a bond line thickness outside the manufacturer range returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the shear area capacity relation with the vehicle manufacturer repair procedure and the adhesive data sheet named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`structural adhesive bond area`, `panel bonding strength`, `adhesive shear capacity`, `bond line thickness`, `weld bonding panel`.

## 2. The tile

### 2.1 `adhesive-bond-area` -- Structural Adhesive Bond Area and Shear Strength

```
bond area        A = bond length x bond width
capacity         P = A x shear strength
shear strength   from the adhesive's data sheet at the service temperature and for the
                 substrate and surface preparation used
bond line        thickness matters: too thin starves the joint, too thick weakens it
                 manufacturers specify a range, often held with glass beads in the adhesive
cure             full strength requires the specified cure time and temperature
substrate        preparation -- abrasion, cleaning, primer -- often governs the achieved
                 strength more than the adhesive does
```

The arithmetic is trivial and everything important is in the conditions attached to the shear strength. A
published value assumes a specific substrate, a specific surface preparation, a specific bond line thickness, and
full cure at a stated temperature; miss any of them and the achieved strength can be a fraction of the number.
Surface preparation in particular is where field joints fail -- adhesive on a contaminated, unabraded, or
incorrectly primed surface releases cleanly, and the failure looks like the adhesive was defective when it was
the preparation.

Bond line thickness has an optimum rather than a minimum. Too thin and the joint is starved and stress
concentrates; too thick and the adhesive's own strength governs over a longer path. Manufacturers hold the
thickness with glass beads mixed into the adhesive for exactly this reason, and clamping a joint until the
adhesive is squeezed out is a way of making it weaker.

Temperature is the other condition worth flagging. Structural adhesives lose strength as they warm, and a joint
adequate at room temperature can be marginal on a hot roof or near an exhaust -- which is why the data sheet's
strength at the service temperature, not its headline value, is the number to use.

**Inputs:** bond length and width, the adhesive shear strength at the service temperature, the bond line thickness, the substrate and preparation, the required joint capacity, and the cure schedule

**Outputs:** the bond area, the joint capacity at the entered shear strength, the capacity against a required load, the bond length required for a target capacity, the capacity at an elevated service temperature, and a flag when the bond line thickness falls outside the specified range

## 3. Worked example

A bonded flange 18 in long with a 0.75 in bead width, adhesive rated 2,500 psi in shear:

```
bond area = 18 x 0.75 = 13.5 sq in
capacity  = 13.5 x 2,500 = 33,750 lb
```

33,750 lb -- substantial, and it is why adhesive bonding is structurally credible.

**Now narrow the bead.** A technician running a 0.5 in bead instead of 0.75 in:

```
area     = 18 x 0.5 = 9.0 sq in
capacity = 22,500 lb
```

33% of the joint gone, from a bead width nobody measured. Bead width is a structural
dimension and the manufacturer specifies it.

Temperature: if the same adhesive drops to 1,400 psi at 180 degF -- a temperature a panel near an exhaust or a
dark roof in summer reaches -- the capacity falls to `13.5 x 1,400` = 18,900 lb,
44% below the room-temperature figure. The data sheet's strength at the SERVICE temperature is
the number the joint has.

And the condition that dominates all of it: the 2,500 psi assumes the specified surface preparation. On an
unabraded or contaminated surface the joint can release at a small fraction of it, and the calculation above
becomes meaningless.

## 4. Scope and non-goals

A capacity calculation using a shear strength the user supplies. Published adhesive strengths are for specific
substrates, surface preparations, bond line thicknesses, cure schedules, and test temperatures, and the achieved
strength in a field joint depends on all of them; surface preparation is usually the governing variable and is
not represented in this arithmetic at all. It does not address joint design -- peel and cleavage loading, which
adhesives resist far less well than shear, stress concentration at the bond ends, and the combination of adhesive
with welds or rivets that most modern repairs specify. Vehicle manufacturers specify which joints may be bonded,
which adhesive, which preparation, and which combination of bonding and mechanical fastening, and those
procedures govern absolutely -- a bonded joint outside the manufacturer's procedure is an unapproved repair with
crash-performance consequences. The vehicle manufacturer's body repair manual, the adhesive manufacturer's
technical data sheet, and the manufacturer's position statements govern.
