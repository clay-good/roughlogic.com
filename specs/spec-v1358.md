# roughlogic.com Specification v1358 -- Fermentation and Proof Time vs Temperature (Q10) (calc-kitchen.js, Group O, kitchen and food service, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-kitchen.js`**
> (Group O, kitchen and food service), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog computes desired dough temperature -- what water temperature to mix at -- but not the consequence: how the proof time changes when the dough or the room lands at a different temperature than planned. Yeast activity roughly doubles every 10 degrees C, which means a 10 degree F miss is not a small schedule change.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive reference time, a Q10 at or below zero, or a temperature interval outside a plausible fermentation range, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the Q10 temperature-coefficient model as applied to yeast fermentation (standard food-science practice), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `fermentation-time-q10` -- Fermentation and Proof Time vs Temperature (Q10)

```
delta C = (T_reference - T_actual) x 5/9
t_actual = t_reference x Q10 ^ (delta C / 10)
```

Q10 is the factor by which a biological rate changes for a 10 degree C change in temperature. For baker's yeast
in the range a bakery actually works in, Q10 is close to 2: warm the dough 10 C and it ferments twice as fast;
cool it 10 C and it takes twice as long. Ten degrees C is 18 degrees F, which is why a 10 degree F miss on dough
temperature is worth roughly 45% on the clock -- large enough to blow a production schedule, small enough that it
gets ignored.

The tile runs in both directions. Given the shop's reference (a proof time at a known dough temperature) it
predicts the time at today's temperature; given a target finish time it reports the temperature that would hit it,
which is what a retarder or a warm box is being asked to do.

**Inputs:** reference proof or bulk time (hr) and its reference temperature (F), actual temperature (F), Q10
(default 2.0).

**Outputs:** predicted time at the actual temperature (hr and min), the ratio to the reference, and the
temperature difference in both F and C.

## 3. Worked example

A bulk ferment that takes 2.0 hr at a 78 F dough temperature, on a morning when the dough comes off the mixer at
68 F:

```
delta C  = (78 - 68) x 5/9 = 5.56 C colder
t_actual = 2.0 x 2 ^ (5.56 / 10) = 2.0 x 1.470 = 2.94 hr
```

Nearly an hour late on a two-hour bulk. Run it the other way: at 88 F the same dough finishes in
`2.0 x 2^(-0.556) = 1.36 hr`, and a schedule built on 2 hours over-proofs it. Between 68 F and 88 F -- twenty
degrees, an ordinary summer-versus-winter swing in an un-air-conditioned bakery -- the same dough takes anywhere
from 82 minutes to 176 minutes.

## 4. Scope and non-goals

Q10 = 2 is a working approximation over a moderate range, not a law. It breaks down at the extremes: below about
40 F yeast activity nearly stops rather than merely slowing, and above roughly 105 F the yeast begins to die, so
the model over-predicts speed at high temperature. It models yeast activity only -- enzymatic and bacterial
activity in a sourdough or preferment follow their own curves and shift flavor, not just time. Dough strength,
hydration, salt, and inoculation rate all move the reference time. Use the shop's own reference, not a book's.
