# roughlogic.com Specification v1286 -- Fluctuating-Stress Fatigue Safety Factor (calc-machining.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`**
> (Group K, mechanic/machinist), no new module or dependency. Inherits spec.md through spec-v1285.md.
>
> **The gap.** The machine-design bench has the static checks -- `shaft-torsion`, `combined-stress-axial-bending`,
> `shaft-diameter-for-torsion`, the spring and gear stresses -- but nothing for **fatigue under a fluctuating
> load**, which is how rotating shafts, springs, and fasteners actually fail. This adds the standard
> alternating/mean-stress safety factor on the Goodman, Soderberg, or Gerber line, plus the first-cycle-yield
> (Langer) check, taking the corrected endurance limit Se as an input so no Marin-factor tables are needed.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive endurance limit Se / ultimate Sut / yield Sy, a negative alternating or mean stress, a zero total
stress, or an unknown criterion returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the modified-Goodman, Soderberg, and Gerber fluctuating-stress criteria with the Langer first-cycle
yield line (Shigley, *Mechanical Engineering Design*; Juvinall), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `fatigue-safety-factor` -- Fluctuating-Stress Fatigue Safety Factor (Goodman / Soderberg / Gerber)

```
Goodman:    1/n = sigma_a/Se + sigma_m/Sut
Soderberg:  1/n = sigma_a/Se + sigma_m/Sy
Gerber:     n sigma_a/Se + (n sigma_m/Sut)^2 = 1   (solved for n)
Langer (first-cycle yield):   n_y = Sy / (sigma_a + sigma_m)
Governing safety factor = min(fatigue n, Langer n_y)
```

`sigma_a` is the alternating stress amplitude and `sigma_m` the mean (midrange) stress. Soderberg is the most
conservative (never yields), Goodman the standard design line, Gerber the least conservative (best fit to test
data). With `sigma_m = 0` (fully reversed) every criterion gives `n = Se/sigma_a`. Se is the *corrected* endurance
limit (Se' ~= 0.5 Sut for steel Sut < 200 ksi, times the Marin surface/size/load/temperature/reliability factors);
it is an input so this tile stays table-free.

**Inputs:** alternating stress sigma_a (psi), mean stress sigma_m (psi), corrected endurance limit Se (psi),
ultimate strength Sut (psi), yield strength Sy (psi), criterion (Goodman / Soderberg / Gerber).

**Outputs:** fatigue safety factor n, first-cycle-yield (Langer) safety factor n_y, and the governing (smaller) one.

## 3. Worked example

sigma_a 25 ksi, sigma_m 30 ksi, Se 40 ksi, Sut 100 ksi, Sy 80 ksi:

```
Goodman:   n = 1/(25/40 + 30/100) = 1/0.925 = 1.08
Soderberg: n = 1/(25/40 + 30/80)  = 1/1.000 = 1.00
Gerber:    n solves n(0.625) + (n x 0.30)^2 = 1  ->  n = 1.34
Langer:    n_y = 80/(25 + 30) = 1.45
```

By Goodman the fatigue factor 1.08 governs over the 1.45 yield factor, so the part is fatigue-critical with only
8% margin; Soderberg calls it exactly marginal; Gerber, fit to data, gives 1.34. Fully reverse the load (sigma_m 0)
and all three collapse to n = Se/sigma_a = 40/20 = 2.0 for a 20 ksi amplitude.

## 4. Scope and non-goals

The infinite-life safety factor for a uniaxial fluctuating stress on the three standard criteria plus the
first-cycle yield check. Building the corrected endurance limit Se from Sut and the Marin factors, notch-sensitivity
(Kf), finite-life (S-N) counting, and multiaxial stress combination are separate and are the designer's inputs. A
design aid; Shigley / Juvinall and the engineer of record govern.
