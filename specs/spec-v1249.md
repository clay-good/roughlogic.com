# roughlogic.com Specification v1249 -- Free-Space Path Loss (calc-lowvoltage.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lowvoltage.js`** (Group A),
> no new module, group, or dependency. Inherits spec.md through spec-v1248.md.
>
> **The gap.** New sub-domain: the low-voltage trade has fiber (`fiber-loss-budget`) and coax (`coax-rg-loss`) loss
> budgets but no wireless/RF link math at all. This is the first RF tile -- the wireless link's path loss.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input, a non-positive distance or frequency, or non-finite power/gains return `{ error }`. Citation discipline
(v19/v22): the Friis transmission equation / ITU-R P.525, `GOVERNANCE.electrical`. **No table is reproduced.**

## 2. The tile

### 2.1 `wireless-fspl` -- Free-Space Path Loss (Wireless Bridge)

```
FSPL(dB) = 32.44 + 20 log10(d_km) + 20 log10(f_MHz)      (km, MHz)
received power  Pr = Pt + Gt + Gr - FSPL                 (all in dB)
```

**Inputs:** link distance (km), frequency (MHz), transmit power (dBm), transmit antenna gain (dBi), receive antenna gain
(dBi).

**Outputs:** the free-space path loss (dB) and the received power (dBm).

## 3. Worked example

`d = 1 km, f = 2400 MHz, Pt = 20 dBm, Gt = Gr = 12 dBi`:

```
FSPL = 32.44 + 20 log10(1) + 20 log10(2400) = 32.44 + 0 + 67.60 = 100.04 dB
Pr   = 20 + 12 + 12 - 100.04 = -56.04 dBm
```

Cross-checks: the loss climbs 6.02 dB per doubling of distance (2 km -> 106.06 dB) or frequency (5.8 GHz over 1 km ->
107.71 dB); each dB of antenna gain adds a dB of received power.

## 4. Scope and non-goals

Ideal free space only -- it excludes cable/connector loss, atmospheric and rain attenuation, obstruction and Fresnel-zone
diffraction, and multipath, and a real link keeps a fade margin over this (compare Pr to the receiver sensitivity). A
planning estimate; the path survey and radio spec govern. (First of an RF cluster; Fresnel-zone clearance and a full
link budget with fade margin are natural follow-ons.)
