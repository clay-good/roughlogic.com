# roughlogic.com Specification v1424 -- Neutral Current from Nonlinear Loads and Conductor Adjustment (calc-elecdesign.js, Group A, electrical power systems, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-elecdesign.js`**
> (Group A, electrical power systems), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** On a three-phase four-wire branch feeding electronic loads, the neutral can carry more current than any phase -- because third harmonics do not cancel in the neutral, they add. The catalog computes multiwire branch circuit voltage drop and transformer K-factor but never the neutral current itself, or the conductor adjustment factor that follows from counting the neutral as current-carrying.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive phase current, a harmonic content fraction outside 0-1, or a conductor count below one, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the triplen-harmonic neutral summation for a balanced three-phase four-wire circuit and NEC 310.15(E) on the neutral as a current-carrying conductor, with the 310.15(C)(1) adjustment factors cited by section and linked, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `nonlinear-neutral` -- Neutral Current from Nonlinear Loads and Conductor Adjustment

```
third-harmonic current per phase = harmonic content fraction x phase current
neutral current (balanced)       = 3 x third-harmonic current per phase
neutral ratio                    = neutral current / phase current = 3 x content fraction
current-carrying conductors      = 3 phases + 1 neutral when the load is majority nonlinear
adjusted ampacity                = table ampacity x adjustment factor for that count
```

On a balanced three-phase four-wire circuit with linear loads the neutral carries essentially nothing -- the three
phase currents are 120 degrees apart and sum to zero. The third harmonic does not work that way. Third-harmonic
currents in the three phases are 360 degrees apart, which is to say they are *in phase* with one another, so they
do not cancel in the neutral. They add, arithmetically, three times over.

The consequence is a neutral that can exceed the phase conductors. At 33% third-harmonic content the neutral
carries as much as a phase; above that it carries more, and a neutral sized to the phase conductors is undersized.
Switch-mode power supplies, LED drivers, and electronic ballasts routinely produce third-harmonic content in this
range, which is why a lighting or receptacle branch in an office building is a genuinely different design problem
from a motor branch.

The NEC ties it together: where the major portion of the load is nonlinear, the neutral **is** a current-carrying
conductor, so a three-phase four-wire circuit has four of them rather than three, and the adjustment factor for
more than three current-carrying conductors in a raceway applies. That derate is the second half of the tile.

**Inputs:** phase current, third-harmonic content fraction, whether the load is majority nonlinear, number of
current-carrying conductors in the raceway, conductor table ampacity.

**Outputs:** third-harmonic current per phase, neutral current, neutral-to-phase ratio, current-carrying conductor
count, adjustment factor, and adjusted ampacity.

## 3. Worked example

A three-phase four-wire branch balanced at 100 A per phase, 30% third-harmonic content, four current-carrying
conductors in the raceway (80% adjustment):

```
third harmonic per phase = 0.30 x 100  = 30 A
neutral current          = 3 x 30      = 90 A
neutral ratio            = 90 / 100    = 0.90
```

Ninety amps in a conductor that a linear-load design would have assumed carried nothing. Push the content to 40%,
which is not unusual on a floor of workstations, and the neutral carries `3 x 40 = 120 A` -- twenty percent more
than any phase. At that point the neutral, not the phase conductor, sizes the circuit, and the 80% adjustment for
four current-carrying conductors applies on top: a conductor with a 100 A table ampacity is good for 80 A after
adjustment and does not carry either the phases or the neutral.

## 4. Scope and non-goals

Balanced loads and third harmonic only. The relation is exact for a balanced circuit with pure triplen content;
real neutral current is the RMS sum of the residual fundamental unbalance and all the triplen harmonics, so a
measured value on an unbalanced circuit will differ. Harmonic content is a measurement -- take it with a true-RMS
meter or a power quality analyzer, not from an assumption -- and it varies with load level, often rising sharply
at light load. The tile does not address transformer K-factor and derating (its own tile), harmonic distortion
limits under IEEE 519 (also its own tile), neutral-to-ground voltage, or whether a separate neutral per phase or an
oversized common neutral is the better remedy. NEC as adopted and the AHJ govern.
