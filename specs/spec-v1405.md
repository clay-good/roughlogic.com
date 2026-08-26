# roughlogic.com Specification v1405 -- Counterbore Depth and Remaining Material (calc-machining.js, Group E, machining and fabrication, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`**
> (Group E, machining and fabrication), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog computes countersink diameter and plunge depth for a flat-head screw but has nothing for a counterbore, which is what a socket head cap screw needs. The counterbore is only half the question: the other half is what is left underneath it, and whether that remainder still gives the thread enough engagement -- which is where the design actually fails.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive head height, plate thickness, or screw diameter, a counterbore depth at or beyond the plate thickness, or a negative clearance, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the socket-head-cap-screw counterbore convention (head height plus clearance, at the standard counterbore diameter) and the minimum thread-engagement rule of one to one-and-a-half diameters by material, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `counterbore-depth` -- Counterbore Depth and Remaining Material

```
counterbore depth   = head height + clearance below flush
remaining thickness = plate thickness - counterbore depth
required engagement = engagement multiplier x nominal screw diameter
                      (about 1.0 D into steel, 1.5 D into cast iron, 2.0 D or more into aluminum)
engagement check    = remaining thread depth in the tapped part >= required engagement
```

The counterbore itself is arithmetic: the head has to end up flush or a chosen amount below flush, so the bore
goes as deep as the head is tall plus the clearance. Fifteen thousandths below flush is a common choice -- enough
that the head is definitively under the surface, little enough that a driver still reaches it.

The second half is where the design gets caught. Every thousandth of counterbore is a thousandth taken out of the
material below, and when the counterbore is in the *tapped* part rather than in a clearance plate, it comes
straight out of the thread engagement. Steel wants about one diameter of engagement, cast iron about one and a
half, aluminum two or more -- and a counterbore that leaves less than that has quietly turned a strong joint into
one that will strip the threads before the bolt yields, which is the failure mode nobody wants.

**Inputs:** screw nominal diameter, head height and head diameter, counterbore diameter, clearance below flush,
plate thickness, material engagement multiplier.

**Outputs:** counterbore depth, remaining thickness below the bore, required thread engagement, available
engagement, and pass or fail with the shortfall.

## 3. Worked example

A 1/2-13 socket head cap screw -- head 0.750 in diameter, 0.500 in tall -- counterbored 0.015 in below flush in a
0.750 in steel plate, using a 13/16 in counterbore:

```
counterbore depth   = 0.500 + 0.015  = 0.515 in
remaining thickness = 0.750 - 0.515  = 0.235 in
required engagement = 1.0 x 0.500    = 0.500 in into steel
0.235 < 0.500                        -> FAILS by 0.265 in
```

Three quarters of an inch of plate looked like plenty and it is not: the counterbore eats two thirds of it. The
fixes are a thicker tapped part -- 1.015 in minimum to get the half inch of engagement under the bore -- or moving
the counterbore to a separate clearance plate so the tapped part keeps its full thickness, which is what a
properly detailed joint does. Put the same screw through a 0.750 in *clearance* plate into a 1.000 in tapped block
and there is no conflict at all.

## 4. Scope and non-goals

Depth arithmetic and an engagement screen. It does not compute joint strength, preload, or bolt stress -- the
catalog's bolt tiles do that -- and the engagement multipliers are rules of thumb, not a substitute for
calculating the thread shear area against the bolt's tensile area, which is what governs on a critical joint. It
does not check counterbore diameter against the head diameter and driver clearance for the specific fastener
standard, address tapped-hole depth beyond full thread, spot-facing, or the effect of a chamfer at the counterbore
bottom. The fastener standard, Machinery's Handbook, and the designer govern.
