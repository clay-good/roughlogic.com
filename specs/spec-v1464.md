# roughlogic.com Specification v1464 -- Recloser-to-Fuse Coordination Screen (`calc-lineworker.js`, Group A Electrical, line work, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lineworker.js`**
> (Group A, Electrical -- the existing category, hub `/groups/electrical/`; overhead line and distribution), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A recloser's fast curve is supposed to clear a temporary fault before the branch fuse melts, so a tree limb does not cost a customer a fuse change. Whether it does is a comparison of two curves at the fault current, and the multiplier that makes the comparison honest is the part crews get wrong.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive fault current or time, a heating factor below one, or a minimum-melt time at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the fuse-saving coordination criterion with fuse heating factors, and IEEE C37.230 named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`recloser fuse coordination`, `fuse saving scheme`, `fast curve minimum melt`, `recloser branch fuse`, `coordination ratio fuse`.

## 2. The tile

### 2.1 `recloser-fuse-coordination` -- Recloser-to-Fuse Coordination Screen

```
fuse-saving band   t_fast x K_heat  <  t_fuse,min      (fuse must not be damaged)
fuse-blowing band  t_fuse,max        <  t_slow,min      (fuse must clear first)
heating factor     K_heat ~ 1.2 for one fast operation, ~1.35 for two
coordination ratio CR = t_fuse,min / (K_heat x t_fast)
```

Fuse saving works when the recloser's fast curve, multiplied by a heating factor that accounts for the fuse
element retaining heat between operations, still sits below the fuse's minimum-melt curve at the maximum fault
current on the branch. Two fast operations heat the element more than one, which is why the factor rises and why
two-fast schemes coordinate over a narrower current range than one-fast schemes.

The band is bounded at BOTH ends, and that is the part missed. Coordination holds only between the minimum fault
current where the fuse still clears within the recloser's slow curve and the maximum fault current where the fast
curve still beats minimum melt. Outside that window the scheme does not work, and on a modern feeder with high
available fault current at the head, the upper bound is often inside the protected zone.

**Inputs:** fault current at the branch, recloser fast and slow curve times at that current, fuse minimum-melt and total-clear times at that current, the number of fast operations, and the heating factor

**Outputs:** the heated fast-curve time, the coordination ratio against minimum melt, a pass or fail for fuse saving, the same check for the fuse-blowing scheme against the slow curve, and the margin in cycles

## 3. Worked example

A branch fuse seeing 1,200 A of fault current. The recloser fast curve clears in 0.045 s, the fuse minimum
melt at 1,200 A is 0.080 s, fuse total clear is 0.140 s, and the recloser slow curve is 0.400 s. Two fast
operations, heating factor 1.35:

```
heated fast   = 0.045 x 1.35 = 0.0608 s
CR            = 0.080 / 0.0608 = 1.32   -> fuse saving HOLDS (CR > 1)
fuse blowing  = 0.140 s total clear < 0.400 s slow curve -> HOLDS
margin        = 0.080 - 0.0608 = 0.0192 s = 1.15 cycles
```

It coordinates, but 1.15 cycles is not a lot of room, and it is the two-fast heating factor that ate it: with one
fast operation the heated time is 0.054 s and the ratio is 1.48. Raise the available fault current and the two
curves converge until the fast curve crosses minimum melt, which is where the scheme stops working.

## 4. Scope and non-goals

A comparison of curve times a user reads off the published time-current characteristics at one fault current.
It does not hold curve data for any recloser or fuse -- those are manufacturer publications and shipping them
would go stale -- and it does not sweep the current range to find the coordination limits, which is what a
protection study does. It does not consider asymmetry, pre-loading of the fuse by load current, ambient, or fuse
damage curves distinct from minimum melt, nor coordination with downstream sectionalizers, upstream substation
relays, or distributed generation contributions that change the fault current the fuse sees. A screen, not a
protection study: the manufacturer's TCC curves, IEEE C37.230, and the utility's protection engineer govern.
