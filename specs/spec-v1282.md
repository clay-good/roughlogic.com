# roughlogic.com Specification v1282 -- Gear Tooth Contact Stress / Surface Durability (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, mechanic/machinist), no new module or dependency. Inherits spec.md through spec-v1281.md.
>
> **The gap (the sibling names it).** `gear-tooth-bending-stress` (spec-v1015) and its dynamic companion
> `gear-dynamic-tooth-stress` (spec-v1108) both compute *bending* stress -- the tooth-breakage failure mode.
> The Barth tile's own note ends: "pitting often governs before bending does." The *other* AGMA failure mode,
> **surface durability (contact/Hertzian stress)**, was never built. This adds it: the Buckingham/AGMA contact
> stress that predicts pitting, the pair to the Lewis bending check.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive transmitted load / diametral pitch / face width / pinion teeth, gear teeth below pinion teeth, a
pressure angle outside (0, 45) deg, or a non-positive elastic coefficient returns `{ error }`; no numeric field is
ever `Infinity`. Citation discipline (v19/v22): the Hertzian gear contact stress (Buckingham; Shigley, *Mechanical
Engineering Design*; AGMA surface-durability geometry factor I), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `gear-contact-stress` -- Gear Tooth Contact Stress (Surface Durability / Pitting)

```
dp = Np / Pd                                  pinion pitch diameter
mG = Ng / Np                                  gear ratio (>= 1)
I  = (cos phi * sin phi / 2) * mG/(mG + 1)    AGMA geometry factor, external spur mesh
sigma_c = Cp * sqrt( Wt / (F * dp * I) )      Hertzian contact stress
```

`Cp` is the elastic coefficient, `sqrt(1 / (pi * ((1-v1^2)/E1 + (1-v2^2)/E2)))`; for steel on steel it is about
2300 sqrt(psi) (default). This is the STATIC contact stress with all AGMA application, dynamic, size,
load-distribution, and surface-condition factors set to 1 -- the base Hertzian value. Contact stress runs far
higher than the Lewis bending stress on the same tooth, which is why surface pitting, not root breakage, is often
the governing durability limit.

**Inputs:** transmitted (tangential) load Wt (lb), diametral pitch Pd (teeth per in), pinion teeth Np, gear teeth
Ng, face width F (in), pressure angle phi (deg, default 20), elastic coefficient Cp (sqrt-psi, default 2300).

**Outputs:** contact stress sigma_c (psi), AGMA geometry factor I, pinion pitch diameter dp (in), gear ratio mG.

## 3. Worked example

500 lb tangential load, 8-pitch, 20-tooth pinion driving a 60-tooth gear, 1.5 in face, 20 deg, steel on steel:

```
dp = 20/8 = 2.5 in,  mG = 60/20 = 3
I  = (cos20 sin20 / 2)(3/4) = 0.1607 x 0.75 = 0.1205
sigma_c = 2300 sqrt( 500 / (1.5 x 2.5 x 0.1205) ) = 2300 x 33.26 = 76,500 psi
```

Cross-check: the same 500 lb / 8-pitch / 1.5 in / 20-tooth pinion returns a Lewis bending stress of about
7,800 psi from `gear-tooth-bending-stress`. The contact stress is roughly ten times larger -- the concrete reason
the Barth tile warns "pitting often governs before bending does."

## 4. Scope and non-goals

The static Hertzian contact stress for an external spur mesh; the AGMA 2001 application (Ko), dynamic (Kv), size
(Ks), load-distribution (Km), and surface-condition (Cf) factors are not applied, and the allowable contact stress
(material hardness, life, reliability) is the maker's. Internal meshes and helical/bevel geometry factors are not
modeled. Pair this with `gear-tooth-bending-stress` and `gear-dynamic-tooth-stress`; AGMA 2001 and the gear maker
govern.
