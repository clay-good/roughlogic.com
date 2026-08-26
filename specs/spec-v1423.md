# roughlogic.com Specification v1423 -- Transformer Secondary Fault Current (Infinite Bus) (calc-elecdesign.js, Group A, electrical power systems, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-elecdesign.js`**
> (Group A, electrical power systems), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog computes short-circuit current at a panel by the point-to-point method, which needs an upstream fault current to start from. The number it starts from is usually the transformer secondary infinite-bus value, and that first step -- full-load amps divided by per-unit impedance, then adjusted for the NEMA impedance tolerance -- is not in the catalog.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive kVA, secondary voltage, or percent impedance, a phase value other than 1 or 3, or an impedance tolerance below zero, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the infinite-bus secondary fault relation I_sc = FLA / per-unit impedance, the NEMA ST-20 plus-or-minus 10 percent impedance tolerance, and the motor short-circuit contribution convention, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `infinite-bus-fault` -- Transformer Secondary Fault Current (Infinite Bus)

```
FLA           = kVA x 1000 / (V x 1.732)      three-phase
              = kVA x 1000 / V                single-phase
I_sc infinite = FLA / (percent Z / 100)
worst case    = FLA / ((percent Z x (1 - tolerance)) / 100)
motor contrib = motor contribution multiple x total connected motor FLA
total         = I_sc + motor contribution
```

"Infinite bus" means assuming the utility source has zero impedance, so the transformer's own impedance is the
only thing limiting the fault. It is the conservative starting point for a short-circuit study and the number that
belongs at the top of a point-to-point calculation, because the real utility impedance only ever makes the answer
smaller.

Two adjustments are not optional. First, the **impedance tolerance**: NEMA permits the nameplate percent impedance
to be off by plus or minus 10%, and the *low* side is the worst case for fault current -- a transformer marked
5.75% may actually be 5.175%, which is 11% more fault current. Second, **motor contribution**: running motors
become generators for the first few cycles of a fault and feed it, conventionally at four to six times their
full-load current. On a motor-heavy service that contribution is a large fraction of the total and it is regularly
left out.

**Inputs:** transformer kVA, secondary voltage, phase, nameplate percent impedance, impedance tolerance, total
connected motor full-load amps, motor contribution multiple.

**Outputs:** secondary full-load amps, infinite-bus fault current at nameplate impedance and at the tolerance
worst case, motor contribution, and total available fault current.

## 3. Worked example

A 500 kVA, 480 V three-phase transformer with 5.75% nameplate impedance, 10% tolerance:

```
FLA          = 500,000 / (480 x 1.732)   = 601.4 A
I_sc         = 601.4 / 0.0575            = 10,459 A
worst case   = 601.4 / 0.05175           = 11,621 A
```

Eleven hundred amps of difference from a nameplate tolerance nobody reads -- and equipment selected at a 10 kA
rating against the 10,459 A figure is already marginal and is plainly inadequate against 11,621 A. Add 400 A of
connected motor load contributing at 4x and the total becomes `11,621 + 1,600 = 13,221 A`, which puts a 22 kA
rated panel comfortably in and a 14 kA rated panel uncomfortably close.

## 4. Scope and non-goals

The first step of a short-circuit study, not the study. The infinite-bus assumption is deliberately conservative;
a real calculation includes the utility's available fault current and the impedance of the primary conductors,
both of which reduce the answer, and the utility will provide the former on request. The tile does not compute
fault current at any downstream point -- the catalog's point-to-point tile does that, starting from this number.
It does not address X/R ratio and asymmetrical peak (its own tile in this group), single-line-to-ground faults,
which on some transformer connections exceed the three-phase value, arc-flash energy, or equipment short-circuit
current ratings. Equipment must be applied at or above the available fault current per NEC 110.9 and 110.10. A
qualified engineer and the AHJ govern.
