# roughlogic.com Specification v1304 -- Hydraulic Accumulator Usable Volume (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, mechanic/hydraulics), no new module or dependency. Inherits spec.md through spec-v1303.md.
>
> **The gap.** The catalog sizes a compressed-**air** receiver (`air-receiver`) but has nothing for a **hydraulic
> accumulator** -- the gas-charged vessel that stores oil for shock absorption, leakage make-up, or emergency
> actuation. It sizes on the gas law between the precharge and the working pressures, a completely different
> calculation. This adds the usable (deliverable) oil volume.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive accumulator size or pressure, a precharge above the minimum working pressure, or a maximum not above
the minimum returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the
gas-accumulator relation `dV = V0[(P0/P1)^(1/n) - (P0/P2)^(1/n)]` with absolute pressures (Machinery's Handbook;
fluid-power design; Boyle's law n = 1 isothermal, n = 1.4 adiabatic), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `hydraulic-accumulator-volume` -- Hydraulic Accumulator Usable Oil Volume

```
absolute pressures: P = P_gauge + 14.7
dV = V0 [ (P0/P1)^(1/n) - (P0/P2)^(1/n) ]      usable oil volume
n = 1 isothermal (slow cycle), 1.4 adiabatic (fast cycle)
```

`V0` is the accumulator (nominal gas) size, `P0` the gas precharge, `P1` the minimum working pressure, and `P2` the
maximum. Below the precharge the accumulator holds no oil, so the precharge must sit at or just below `P1` (a common
rule is `P0 = 0.9 P1`). A fast cycle heats the gas (use `n = 1.4`), which stores less oil than a slow, isothermal
one; the truth is between.

**Inputs:** accumulator size V0 (gal), precharge P0 (psig), minimum working pressure P1 (psig), maximum working
pressure P2 (psig), gas process (isothermal / adiabatic).

**Outputs:** usable oil volume (gal), and the utilization (usable / nominal, %).

## 3. Worked example

A 1-gallon bladder accumulator, precharged to 1,500 psig, working between 1,600 and 3,000 psig, slow cycle:

```
absolute: P0 1514.7, P1 1614.7, P2 3014.7 psia
dV = 1 x (1514.7/1614.7 - 1514.7/3014.7) = 0.436 gal usable (43.6% of the shell)
```

The 1-gallon shell gives 0.44 gallon of usable oil between 1,600 and 3,000 psi on a slow cycle; run it fast
(adiabatic) and the heated gas stores less, 0.34 gallon. Widen the pressure band or precharge closer to the minimum
to get more, or step up to a bigger accumulator.

## 4. Scope and non-goals

The usable oil volume of a gas-charged (bladder/piston) accumulator by the gas law; temperature correction of the
precharge, real-gas effects at very high pressure, response time, and the shock/pulsation duty are separate. Keep the
precharge and pressures within the accumulator's rating. A design aid; Machinery's Handbook / NFPA fluid-power
practice and the accumulator maker govern.
