# roughlogic.com Specification v1829 -- Slurry Critical Velocity in a Discharge Line (`calc-marine.js`, Group E Carpentry and Construction, marine construction and dredging, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-marine.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Below a certain velocity the solids in a slurry line stop being carried and start sliding, then stop. The threshold comes from Durand's relation, and the coefficient in it depends on particle size -- which is the one thing about a dredging job that changes without notice.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive pipe diameter, coefficient, or operating velocity, or a solids specific gravity at or below 1 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the Durand critical velocity relation and its empirical coefficient with Durand's published curves and the site investigation's particle size distribution named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`slurry critical velocity durand`, `settling velocity slurry pipeline`, `deposition velocity dredge discharge`, `fl factor durand slurry`, `pipeline plugging slurry`.

## 2. The tile

### 2.1 `slurry-critical-velocity` -- Slurry Critical Velocity in a Discharge Line

```
Durand           V_c = F_L x sqrt(2 g D (S_s - 1))
                 D the pipe inside diameter in feet, S_s the solids specific
                 gravity, V_c in ft/s
F_L              an empirical coefficient from Durand's curves, roughly 0.8 to 1.5
                 depending on PARTICLE SIZE and concentration; it peaks for
                 medium sand and falls for very fine and very coarse material
diameter         V_c goes as the square root of pipe diameter, so a bigger line
                 needs a higher velocity, not a lower one
operating point  just above V_c, because friction head rises as the SQUARE of
                 velocity while production rises linearly
                 (`dredge-production-rate`)
below V_c        solids form a moving bed, then a stationary one; the line plugs
the uncertainty  F_L is where the answer lives and the material is what sets it
```

The relation says something physically simple: the velocity needed to keep particles suspended scales with how
much denser they are than the fluid and with how far they have to be lifted across the pipe. Both terms are
inside a square root, which is why critical velocity is remarkably insensitive to everything except pipe size
and material -- and why a dredge that works one material at a given velocity is not automatically safe in
another.

Pipe diameter working the wrong way is the counterintuitive part and it matters when a line is upsized. A
larger pipe carries more at the same velocity, which is the reason to upsize; it also raises the velocity below
which it plugs, because the particles have further to fall across a larger bore. Upsizing a discharge without
raising the pump's delivery can put a line below its own critical velocity at a flow that would have been
comfortable in the smaller pipe.

Particle size is the term that changes without warning and it is the one the coefficient is most sensitive to.
A cut that runs into a coarser layer raises the coefficient, the critical velocity rises with it, and an
operating velocity that was adequate an hour ago is now below the threshold. The dredge does not signal this;
the discharge pressure rises as a bed forms, and by the time it is obvious the line is plugging.

**Inputs:** the pipe inside diameter, the solids specific gravity, the Durand coefficient for the material and concentration, and the operating velocity

**Outputs:** the critical velocity at the entered coefficient, the critical velocity at a higher and a lower coefficient, the margin between the operating velocity and each, and the relative friction head at the operating velocity against the critical velocity

## 3. Worked example

The 24 in discharge from `dredge-production-rate`, carrying sand at specific gravity 2.65:

```
V_c = F_L x sqrt(2 x 32.2 x 2.0 x (2.65 - 1))
    = F_L x 14.58 ft/s
```

**The whole answer is F_L**, and here is what it does:

```
fine sand,   F_L = 1.00:  V_c = 14.6 ft/s
medium sand, F_L = 1.20:  V_c = 17.5 ft/s
coarse sand, F_L = 1.34:  V_c = 19.5 ft/s
```

**Against an operating velocity of 18 ft/s**, the fine sand runs with 23 percent of margin, the medium
sand with 3 percent, and **the coarse sand does not run at all** -- 19.5 ft/s is above the 18 ft/s the pump is
delivering, so the solids deposit.

**Nothing about the dredge changed.** The cutter ran into a coarser layer, the coefficient moved, and a line
that was operating comfortably is now below its own critical velocity. **The dredge gives no warning**; the
discharge pressure rises as a bed forms in the invert, and by the time it is unmistakable the line is
plugging.

**Running fast to be safe is expensive, and quadratically so.** At 18 ft/s against a 14.6 ft/s threshold:

```
relative friction head = (18 / 14.6)^2 = 1.52
```

**52 percent more friction head than operating at the threshold**, paid in pump power for every foot of
line, every hour. **The operating point is a deliberate compromise just above V_c**, and it has to be
re-established whenever the material changes.

**And a larger pipe raises the threshold rather than lowering it.** V_c goes as the square root of diameter, so
upsizing a 24 in line to 30 in raises the fine-sand threshold to 16.3 ft/s -- **an upsize that
increases capacity can put the line below its own critical velocity** if the pump's delivery is not raised with
it.

## 4. Scope and non-goals

An empirical threshold. Durand's relation is a correlation from experiment and the coefficient must be read from its curves for the actual particle size distribution and concentration, not assumed -- a real dredged material is graded rather than uniform, and a single coefficient stands in for a distribution. The relation is for settling slurries of granular material in a horizontal pipe and does not apply to fine, cohesive, or non-Newtonian slurries, where clay and silt content change the behaviour entirely and a higher fines content can actually reduce the critical velocity by supporting the coarser particles. It does not address inclined or vertical sections, bends, or the behaviour on a suction line, which is a different problem. It does not compute friction head or system curves, size pumps or boosters, or address pipe wear, which is what the high velocities actually cost over a season. It does not predict what happens during a plug or how to clear one. Durand's published curves or a modern equivalent correlation, the site investigation's particle size distribution, and the dredging engineer govern.
