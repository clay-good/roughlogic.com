# roughlogic.com Specification v1641 -- Marine Propeller Shaft Diameter for Torque (`calc-mechanic.js`, Group K Mechanic - Auto, Marine, Aviation, marine, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, Mechanic - Auto, Marine, Aviation -- the existing category, hub `/groups/mechanic/`; marine and boatyard), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A propeller shaft is sized for torque plus the bending from the propeller hanging off the end, and the classification rules turn that into a diameter with a material factor. A shaft chosen by matching the old one is fine until the engine is repowered.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive power, shaft speed, or diameter, or a material factor at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the shaft torque relation and classification society shaft sizing rules with ABYC and ABS named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`propeller shaft diameter`, `marine shaft sizing`, `shaft torque horsepower rpm`, `tail shaft diameter rule`, `repower shaft size`.

## 2. The tile

### 2.1 `marine-shaft-diameter` -- Marine Propeller Shaft Diameter for Torque

```
torque            T = 63,025 x hp / rpm      (in-lb)
torsional stress   tau = 16 T / (pi d^3)
rule diameter      classification societies give d = F x cube root( hp / rpm ) x material factor
                   the constant embeds an allowance for bending and corrosion
combined loading   shafts see torsion, the propeller's weight in bending, and thrust
tail shaft         the outboard length is larger than the inboard for the bending
material           aluminium bronze, Aquamet and stainless grades have different allowables
```

The cube root is what makes repowering interesting. Shaft diameter scales with the cube root of horsepower over
rpm, so a 40 percent power increase at the same shaft speed calls for only about a 12 percent larger shaft --
which sounds small and is often a whole nominal size, and the coupling, stern tube, bearings, and stuffing box all
change with it.

The bending is why a rule formula rather than a pure torsion calculation is used. A propeller hangs on the end of
an overhung shaft supported at the strut, and its weight plus the hydrodynamic side loads put bending into the
shaft that a torsion-only calculation misses entirely. That is also why the tail shaft -- the outboard portion --
is sized larger than the section inside the boat.

Material choice moves the answer as much as the power does. The allowable stress for a bronze shaft and a
high-strength stainless differ substantially, and so does their corrosion and fatigue behaviour in seawater;
substituting a material without re-running the diameter is not a like-for-like change even at the same size.

**Inputs:** engine power at the shaft, shaft rpm, the shaft material and its allowable stress, the classification rule constant, and the existing shaft diameter for comparison

**Outputs:** the shaft torque, the torsional stress in the existing shaft, the rule-based required diameter for the entered material, the required diameter at an alternative material, the margin of the existing shaft, and the diameter required after a stated power increase

## 3. Worked example

A 350 hp engine turning the shaft at 1200 rpm through a reduction gear:

```
torque = 63,025 x 350 / 1200 = 18,382 in-lb
```

For a 2.0 in shaft the torsional stress alone is

```
tau = 16 x 18,382 / (pi x 2.0^3) = 11,703 psi
```

which for a good marine shaft material is modest -- and that is exactly why torsion alone is not the criterion.
The rule diameter includes an allowance for the propeller's bending and for corrosion, and it will call for
more.

**The repower case.** Raise the engine to 500 hp at the same shaft speed:

```
diameter scales as cube root(500/350) = 1.126
```

13% larger -- a 2.0 in shaft becomes 2.25 in, which rounds up to the
next standard size. And with it: a new coupling, a larger stern tube, different bearings, a different stuffing box
or seal, and possibly a different strut. That cascade is the real cost of the repower, and the cube root is what
makes it easy to underestimate.

Material: the same 350 hp in a lower-allowable bronze rather than a high-strength stainless calls for a
noticeably larger shaft, so a material substitution at the same diameter is a reduction in margin.

## 4. Scope and non-goals

A torque calculation with a rule-form diameter using constants the user supplies. Classification society rules
(ABS, Lloyd's, DNV) and ABYC give the shaft sizing formulas with their own constants, material factors, and
service assumptions, and those rules govern -- the constant embeds allowances that a first-principles torsion
calculation does not include. It does not evaluate torsional vibration, which on a diesel installation can
produce a critical speed within the operating range and is a shaft failure mechanism no static calculation
predicts; a torsional vibration analysis is what addresses it. It does not size the coupling, keyway, taper and
nut, strut and bearings, stern tube, or seal, and it does not evaluate propeller selection or shaft alignment. It
does not address the corrosion and crevice fatigue behaviour of the material in the actual service. ABYC
standards, the applicable classification society rules, the engine and gear manufacturers' limits, and a naval
architect govern.
