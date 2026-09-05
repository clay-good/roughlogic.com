# roughlogic.com Specification v1619 -- Post-Tension Tendon Elongation and Jacking Force (`calc-concrete.js`, Group E Carpentry and Construction, concrete, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-concrete.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; concrete placement and tilt-up), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Post-tensioning is verified by elongation: the tendon is jacked to a force and the strand should stretch a computed amount, and if it does not, something is wrong. It is the only field check that catches a blocked duct, a wrong strand, or a gauge reading a force that is not there.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive strand area, modulus, length, or jacking force, or a friction coefficient below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the elongation and friction relations with ACI 318 and PTI named, and the engineer of record named as governing acceptance, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`post tension elongation`, `tendon stretch calculation`, `pt elongation tolerance`, `friction wobble loss tendon`, `jacking force verification`.

## 2. The tile

### 2.1 `post-tension-elongation` -- Post-Tension Tendon Elongation and Jacking Force

```
theoretical elongation  dL = P L / (A E)
P                       average force along the tendon, after friction and wobble losses
friction                P(x) = P_jack x exp( -(mu x alpha + K x) )
                        mu curvature friction, alpha total angular change, K wobble
seating loss            anchor set, typically 1/4 in, reduces force near the anchorage
acceptance              measured elongation within about 7% of theoretical (ACI 318)
outside tolerance       investigate before grouting; do not simply accept
```

Elongation is a measurement of the tendon's whole length responding to the force actually in it, which is why
it catches what a gauge cannot. A pressure gauge reads what the jack is pushing; it says nothing about whether
that force reached the far end. A tendon binding in a crushed duct, or one strand of a bundle not gripped, shows
up as elongation short of theoretical while the gauge reads exactly the specified pressure.

The friction terms are what make the theoretical number non-trivial. Force decays along the tendon with the total
angular change of its profile and with unintended wobble, so a draped tendon in a long slab develops noticeably
less force at its far end than at the jack -- and the elongation calculation uses the AVERAGE force, not the
jacking force. Using jacking force directly overstates the expected elongation and makes a good tendon look
short.

The tolerance is roughly 7% and it is two-sided. Elongation short means the force is not getting there; elongation
long means the strand is stretching more than it should, which can mean a wrong strand area, a wrong modulus, or
slip. Both require investigation before grouting, because after grouting nothing can be corrected.

**Inputs:** strand area and modulus, tendon length, jacking force, curvature friction coefficient and total angular change, wobble coefficient, anchor set, and the measured elongation

**Outputs:** the force at the far anchorage after friction and wobble, the average force along the tendon, the theoretical elongation, the seating loss, the measured elongation against theoretical as a percentage, and a pass or investigate verdict against the entered tolerance

## 3. Worked example

A single 0.6 in strand (0.153 sq in, E = 2.8e+07 psi), 120 ft long, jacked to 75% of a 270 ksi ultimate:

```
jacking force = 0.75 x 270,000 x 0.153 = 30,982 lb
```

Ignoring friction for a straight tendon, the theoretical elongation is

```
dL = P L / (A E) = 30,982 x 1440 / (0.153 x 2.8e+07) = 10.23 in
```

About 10.2 inches of stretch. Less the anchor set of 1/4 in, the expected measured elongation
is roughly 9.98 in.

Now the draped tendon in a real slab, with 0.30 radians of total angular change and 0.0002 per foot of wobble:

```
force at the far end = P_jack x exp(-(0.20 x 0.30 + 0.0002 x 120))
                     = P_jack x exp(-0.084) = 0.919 P_jack
average force        ~ 0.96 P_jack
theoretical dL       = 9.82 in
```

**Using the jacking force instead of the average overstates the expected elongation by
0.41 in**, which on a 7% tolerance is most of the allowance -- and it
makes a perfectly good tendon look like a failing one.

If the measured elongation comes in at 8.35 in, that is 15% short: stop, do not
grout, and investigate for a blocked duct or an ungripped strand.

## 4. Scope and non-goals

A theoretical elongation calculation for verification. Friction and wobble coefficients must come from the
post-tensioning system supplier for the actual duct and strand, and assumed values can move the theoretical
elongation by more than the acceptance tolerance. It does not design a post-tensioned member, determine jacking
forces, or address the stressing sequence, which matters on a multi-tendon element. It does not evaluate the many
causes of an out-of-tolerance reading -- blocked or damaged duct, ungripped or broken wire, wrong strand,
incorrect gauge calibration, anchor set different from assumed, or a measurement error -- which require
investigation by the PT supplier and the engineer of record. Stressing operations are hazardous: personnel must
stay out of the line of the jack, and a strand failure during stressing is a fatality mechanism. ACI 318, PTI
standards, the PT system supplier's procedures, and the engineer of record govern.
