# roughlogic.com Specification v1411 -- Curtain Wall Mullion Deflection Limit and Required Stiffness (calc-construction.js, Group E, specialty trades, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`**
> (Group E, specialty trades), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Curtain wall and storefront are absent from the catalog. The number that governs a mullion is not strength -- aluminum mullions almost never fail in bending -- it is deflection, because the glass and the sealant cannot follow the frame. The required moment of inertia falls straight out of the span, the tributary width, and the deflection limit.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive span, tributary width, design pressure, or elastic modulus, or a deflection-limit divisor at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the AAMA deflection limits for framing members supporting glass (L/175 for spans to 13 ft 6 in, L/240 plus 1/4 in beyond) and the simple-span uniform-load deflection relation, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `curtain-wall-mullion-deflection` -- Curtain Wall Mullion Deflection Limit and Required Stiffness

```
line load w      = design wind pressure x tributary width
deflection limit = span / 175                    for spans up to 13 ft 6 in
                 = span / 240 + 0.25 in          for longer spans
required I       = 5 w L^4 / (384 E x deflection limit)      simple span, uniform load
bending moment   = w L^2 / 8
```

A mullion is a simple beam spanning floor to floor, loaded by the wind pressure on the glass either side of it --
so the line load is the pressure times the tributary width, half a bay each way. Aluminum's elastic modulus is
about 10 million psi, a third of steel's, which is why aluminum framing is deflection-governed almost without
exception: it has plenty of strength and not much stiffness.

The deflection limit is not comfort. Glass is rigid and its sealant joints have limited movement capacity, so a
frame that deflects too far either breaks the glass or opens the seal and leaks. AAMA sets L/175 for framing
supporting glass on ordinary spans, and switches to L/240 plus a quarter inch on long ones -- because on a very
long span a pure ratio would allow a deflection larger than any sealant can accommodate.

Note how hard span drives it. Deflection goes as `L^4` while the allowance goes as `L`, so required stiffness
scales as `L^3`: a mullion spanning 13 ft rather than 10 ft needs `(13/10)^3 = 2.2` times the moment of inertia,
and more still past 13 ft 6 in where the limit tightens to L/240 plus a quarter inch. Floor-to-floor height is the
single most consequential input in a curtain wall's framing cost.

**Inputs:** mullion span, tributary width, design wind pressure, elastic modulus, deflection-limit rule.

**Outputs:** line load, allowable deflection, required moment of inertia, bending moment, and the required section
modulus at a stated allowable stress.

## 3. Worked example

A 10 ft (120 in) mullion span at 5 ft tributary width, 30 psf design wind, aluminum at E = 10,000,000 psi:

```
line load   = 30 x 5              = 150 lb/ft = 12.5 lb/in
limit       = 120 / 175           = 0.686 in
required I  = 5 x 12.5 x 120^4 / (384 x 10e6 x 0.686) = 4.92 in^4
moment      = 12.5 x 120^2 / 8    = 22,500 in-lb
```

Just under five cubic inches to the fourth of moment of inertia, from a wind pressure most people would call
modest. Push the span to 13 ft (156 in) at the same pressure and tributary width and the required I goes to
10.8 in^4 -- more than double, for a 30% longer span. That is the cube law, and it is why curtain wall sections
get visibly deeper as floor heights rise.

## 4. Scope and non-goals

**A screening calculation, not a curtain wall design.** It treats one mullion as a simply supported beam under a
uniform load and ignores continuity, the anchor conditions, the differential movement between floors that the
anchors must accommodate, and the torsion a pressure-plate system puts into an unsymmetric section. Aluminum
sections are thin-walled and often need to be checked for local buckling and for torsional behavior, neither of
which a moment of inertia captures. The required-moment-of-inertia arithmetic itself is the ordinary simple-span
relation the catalog's `steel-inertia-for-deflection` tile carries; what this tile adds is the AAMA two-part
deflection limit and the tributary-width conversion that a framing member supporting glass is judged by. It does
not compute design wind pressure, which is an ASCE 7 component-and-cladding calculation, does not check strength, thermal movement, water management, condensation,
or the anchor and embed design, and does not address the testing (AAMA 501 and the ASTM E283/E331/E330 series)
that qualifies a real system. Curtain wall is engineered, tested, and stamped. AAMA, the system manufacturer, the
structural engineer, and the AHJ govern.
