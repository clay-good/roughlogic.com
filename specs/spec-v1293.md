# roughlogic.com Specification v1293 -- Planetary (Epicyclic) Gear Ratio (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, mechanic/machinist), no new module or dependency. Inherits spec.md through spec-v1292.md.
>
> **The gap.** `gear-cascade` handles a simple fixed-axis gear train (stage ratios multiply), but a **planetary
> (epicyclic) set** -- sun, planets, ring, carrier -- does not: two of the three members move, and the ratio
> depends on which one is held. Planetaries are everywhere (automatic transmissions, hub reductions, gear reducers,
> hoists). This adds the Willis-equation ratio for the six standard single-stage configurations.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive sun or ring tooth count, a ring not larger than the sun, a non-positive input speed, or an unknown
configuration returns `{ error }`; a ring-minus-sun that is odd flags a non-integer planet count; no numeric field is
ever `Infinity`. Citation discipline (v19/v22): the epicyclic gear-train ratio by the Willis (superposition) method
(Machinery's Handbook; Shigley, *Mechanical Engineering Design*), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `planetary-gear-ratio` -- Planetary (Epicyclic) Gear Ratio

```
R0 = Nr / Ns           basic ring/sun tooth ratio          Np = (Nr - Ns)/2   planet teeth
Ratio = input speed / output speed, by held member:
  ring fixed,   sun -> carrier:   1 + R0           (reduction, same direction)
  sun fixed,    ring -> carrier:  (R0 + 1)/R0      (reduction, same direction)
  ring fixed,   carrier -> sun:   1/(1 + R0)       (overdrive)
  sun fixed,    carrier -> ring:  R0/(1 + R0)      (overdrive)
  carrier fixed, sun -> ring:     -R0              (reversal)
  carrier fixed, ring -> sun:     -1/R0            (reversal)
```

A negative ratio means the output turns opposite the input (a carrier-fixed set reverses). The planet teeth follow
from the concentric constraint `Nr = Ns + 2 Np`; an odd `Nr - Ns` cannot be built with a standard equal planet.

**Inputs:** sun teeth Ns, ring teeth Nr, input speed (rpm), configuration (which member is fixed, and the
input/output pair).

**Outputs:** overall ratio, output speed (rpm, signed), rotation direction, and the planet tooth count Np.

## 3. Worked example

Sun 30 teeth, ring 72 teeth, input 3,400 rpm, ring held, sun drives, carrier is the output (the common reduction):

```
R0 = 72/30 = 2.4,  Np = (72 - 30)/2 = 21
Ratio = 1 + 2.4 = 3.4  ->  output = 3400 / 3.4 = 1,000 rpm, same direction
```

Hold the carrier instead and drive the sun into the ring and the ratio flips to -2.4: the output reverses at
-1,417 rpm. Same gears, different held member, completely different drive -- the thing a fixed-axis cascade cannot
capture.

## 4. Scope and non-goals

The single-stage planetary ratio and output speed for the six standard held-member configurations; compound and
multi-stage planetaries, torque split among the planets, efficiency, and the assembly (equal-spacing) constraint on
the planet count are separate. Tooth strength is the gear-stress tiles. A design aid; Machinery's Handbook / Shigley
and the gear maker govern.
