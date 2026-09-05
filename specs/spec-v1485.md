# roughlogic.com Specification v1485 -- Two-Stage Refrigeration Interstage Pressure (`calc-refrigeration.js`, Group C HVAC, industrial refrigeration, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-refrigeration.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; industrial and commercial refrigeration), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A two-stage system's interstage pressure decides how the compression work splits between the booster and the high stage, and the optimum is a geometric mean -- not the arithmetic middle that gets used when nobody looks it up. Getting it wrong overloads one machine and leaves the other loafing.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a low-side or high-side absolute pressure at or below zero, or a high-side pressure at or below the low side returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the geometric-mean interstage relation as standard two-stage refrigeration practice, with IIAR 2 named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`interstage pressure two stage`, `booster compressor pressure`, `geometric mean interstage`, `two stage refrigeration split`, `compound compression ratio`.

## 2. The tile

### 2.1 `two-stage-interstage-pressure` -- Two-Stage Refrigeration Interstage Pressure

```
optimum interstage  P_i = sqrt( P_low_abs x P_high_abs )      (absolute pressures)
stage ratio         R = P_i / P_low = P_high / P_i             (equal in both stages)
single-stage ratio  R_single = P_high / P_low
work saving         two-stage with intercooling vs single stage
```

Compression work per stage scales with the pressure RATIO, not the pressure difference, so splitting the total
ratio equally between two stages minimizes the total work -- and equal ratios means the interstage sits at the
geometric mean of the two absolute pressures, always below the arithmetic mean. On a plant running minus 40 degF
suction and 95 degF condensing that difference is tens of psi, which is a real load imbalance between machines.

The optimum is a starting point rather than an answer. Real plants move the interstage deliberately: if there is
a substantial intermediate-temperature load, the interstage is set at that load's saturation pressure instead,
because feeding it from the intermediate is far more efficient than pulling it down to the low stage.
Compressor selection also pulls the setting, since the machines come in discrete sizes and matching real
equipment beats matching a theoretical optimum.

**Inputs:** low-side and high-side pressures with their unit and gauge or absolute basis, and optionally an intermediate load saturation pressure

**Outputs:** the optimum interstage pressure in gauge and absolute, the equal stage ratio, the single-stage ratio for comparison, the corresponding saturation temperature at the interstage, and the arithmetic mean for contrast

## 3. Worked example

A plant at 15 psig suction and 185 psig discharge:

```
P_low_abs  = 15 + 14.7 = 29.7 psia
P_high_abs = 185 + 14.7 = 199.7 psia
P_i        = sqrt(29.7 x 199.7) = sqrt(5,931.1) = 77.0 psia = 62.3 psig
stage ratio= 2.59 in each stage
single-stage ratio = 6.72
```

62.3 psig. The arithmetic mean of the two gauge pressures is 100 psig -- 37.7 psi higher -- and
setting the interstage there would load the booster with a ratio of 3.86 against the high
stage's 1.74, an imbalance that shows up as a hot booster discharge.

Note also what two-staging buys: a single-stage ratio of 6.72 is far past where discharge
temperature and volumetric efficiency make a single machine practical on ammonia. Splitting it into two stages of
2.59 puts each machine in a comfortable range.

## 4. Scope and non-goals

The thermodynamic optimum for equal-ratio staging, computed from pressures alone. It assumes ideal behaviour
and equal isentropic efficiency in both stages, neither of which is exactly true, and real optimum interstage
pressures land slightly below the geometric mean for most refrigerants. It does not size the intercooler, the
desuperheating or liquid subcooling that a flash intercooler provides, the compressors, or the oil system, and
it does not model the substantial effect of an intermediate-temperature load, which usually overrides the
optimum entirely. Discharge temperature, which is what actually limits single-stage ammonia operation, is not
computed here. Cascade systems, which use two different refrigerants rather than two stages of one, follow
different arithmetic. The compressor manufacturer's selection software, IIAR 2, and the system designer
govern.
