# roughlogic.com Specification v1462 -- Line Capacitor Bank Voltage Rise (`calc-lineworker.js`, Group W, line work, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lineworker.js`**
> (Group W, overhead line and distribution), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Switching a capacitor bank onto a feeder raises the voltage upstream of it, and the rise is what decides whether the bank helps the end of the line or pushes the head of it over limit. The relation is one line and it is not the power-factor calculation the catalog already has.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive line-to-line voltage or reactance, or a negative bank rating returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the capacitor voltage-rise relation and ANSI C84.1 voltage ranges by name, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`capacitor bank voltage rise`, `cap bank kvar rise`, `feeder voltage rise capacitor`, `switched capacitor overvoltage`, `capacitor voltage boost`.

## 2. The tile

### 2.1 `capacitor-bank-voltage-rise` -- Line Capacitor Bank Voltage Rise

```
percent rise    dV% = kVAR x X_line / (10 x kV_LL^2)
voltage rise    dV = dV% x V_nominal / 100
current change  the bank draws kVAR / (sqrt(3) kV_LL) amperes leading
```

A capacitor injects leading reactive current, and that current flowing back through the source impedance
raises the voltage at the point of connection. Everything upstream of the bank sees the rise; everything
downstream sees it too, on top of whatever the bank does for the drop along the line beyond it. The rise depends
on the reactance BETWEEN the bank and the source, so the further out the bank sits the bigger its voltage effect
and the smaller its loss-reduction effect per kVAR -- the two goals pull in opposite directions and this is the
arithmetic that shows the trade.

The number that gets people is the light-load case. A fixed bank sized for peak-load power factor is still there
at 3 a.m. when the load is a fifth of peak, the drop it was cancelling is gone, and the rise it produces is the
whole story. That is why banks get switched, and the tile reports the rise at both the peak and light-load
reactances so the light-load overvoltage is visible before it is a complaint.

**Inputs:** bank rating in kVAR, line-to-line system voltage, the line reactance from the source to the bank, and optionally the ANSI C84.1 upper limit and the pre-switching voltage

**Outputs:** the percent voltage rise, the rise in volts on a 120 V base, the leading current the bank draws, the resulting voltage against the entered limit, and the maximum bank size that keeps the rise inside the limit

## 3. Worked example

A 600 kVAR bank on a 12.47 kV feeder with 2.4 ohms of reactance from the substation to the bank location:

```
dV% = 600 x 2.4 / (10 x 12.47^2) = 1,440 / 1,555.0 = 0.93%
```

0.93% is 1.11 V on a 120 V base -- a bit over one tap step of a regulator. If the head of the feeder
already sits at 124 V at light load, this bank puts it at 125.1 V, past the ANSI C84.1 Range A limit of 126,
and that is the case for switching it rather than fixing it. Working the relation backwards, the largest fixed
bank that keeps the rise under 2.0% at this location is 1,296 kVAR.

## 4. Scope and non-goals

A single bank at a single location on a radial feeder, steady state. It does not model switching transients,
which is where capacitor problems actually live: inrush on back-to-back switching, restrike on the switch, and
the voltage magnification that can damage customer equipment and trip adjustable-speed drives. It does not check
harmonic resonance, which the catalog covers in `harmonic-resonance` and `capacitor-bank-for-resonance-order` and
which is the other reason a bank sizing fails. It does not perform a voltage profile along the feeder or
coordinate the bank with regulators. ANSI C84.1, IEEE 1036, the utility's capacitor application guide, and a
distribution power-flow study govern.
