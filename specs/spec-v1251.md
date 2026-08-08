# roughlogic.com Specification v1251 -- Wireless Link Budget (calc-lowvoltage.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lowvoltage.js`** (Group A),
> no new module, group, or dependency. Inherits spec.md through spec-v1250.md.
>
> **The gap.** The RF cluster (`wireless-fspl`, `fresnel-zone-clearance`) needs its endpoint: the full link budget with
> fade margin, the RF analog of `fiber-loss-budget`.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input, a non-positive distance or frequency, or a negative cable loss returns `{ error }`. Citation discipline
(v19/v22): the Friis transmission equation / ITU-R P.525, `GOVERNANCE.electrical`. **No table is reproduced.** The metric
`Link distance (km)` label is the already-allowlisted RF label.

## 2. The tile

### 2.1 `wireless-link-budget` -- Wireless Link Budget (EIRP and Fade Margin)

```
EIRP = Pt + Gt - Lcable(tx)
FSPL = 32.44 + 20 log10(d_km) + 20 log10(f_MHz)
Prx  = EIRP - FSPL + Gr - Lcable(rx)
fade margin = Prx - Rx sensitivity        (target >= 10 dB; 20+ carrier-class)
```

**Inputs:** transmit power (dBm), transmit gain (dBi), transmit cable loss (dB), distance (km), frequency (MHz), receive
gain (dBi), receive cable loss (dB), receiver sensitivity (dBm).

**Outputs:** EIRP, path loss, received power, and fade margin (with an adequate/low verdict).

## 3. Worked example

`Pt 20 dBm, Gt 12 dBi, Ltx 1 dB, d 1 km, f 2400 MHz, Gr 12 dBi, Lrx 1 dB, sensitivity -80 dBm`:

```
EIRP = 20 + 12 - 1 = 31 dBm
FSPL = 100.04 dB
Prx  = 31 - 100.04 + 12 - 1 = -58.04 dBm
fade margin = -58.04 - (-80) = 21.96 dB   (adequate, >= 10)
```

Cross-check: a weak 10 dBm / 6 dBi link over 10 km at 5.8 GHz yields a -34.7 dB fade margin and will not close; a 10 dB
more sensitive receiver raises the margin by exactly 10 dB.

## 4. Scope and non-goals

Free space only -- atmospheric and rain attenuation (significant above ~10 GHz), obstruction and Fresnel-zone diffraction
(check `fresnel-zone-clearance`), and interference are separate. A planning estimate; the path survey, spectrum, and a
commissioning test govern. calc-lowvoltage.js cap raised 33000 -> 36000 B.
