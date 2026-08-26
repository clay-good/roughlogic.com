# roughlogic.com Specification v1442 -- Heat-Treat Soak Time and Furnace Load (calc-shop.js, Group G, shop and industrial, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group G, shop and industrial), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Heat treating is absent from the catalog. The two numbers a shop needs before loading a furnace are how long the charge has to sit at temperature -- which is a section-thickness rule, not a weight rule -- and how much energy it takes to get there, which sizes the furnace and the schedule. Neither is in the catalog.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive section thickness, charge weight, specific heat, or temperature rise, or a furnace efficiency outside 0-1, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the soak-time-per-inch-of-section convention used in heat treating and the sensible-heat relation Q = m c dT with a furnace efficiency, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `heat-treat-soak-time` -- Heat-Treat Soak Time and Furnace Load

```
through-heat time = heat-up rate x maximum section thickness
soak time         = soak rate x maximum section thickness       (commonly about 1 hr per inch)
total at temperature = through-heat + soak
charge heat       = charge weight x specific heat x (soak temperature - starting temperature)
furnace input     = charge heat / (heat-up time x furnace efficiency)
```

Soak time is governed by **section thickness**, not by weight. A hundred pounds of half-inch bar and a hundred
pounds of two-inch bar are entirely different soaks, because what has to happen is that the *center* of the
thickest section reaches temperature and then stays there long enough for the transformation to complete. The
common rule -- roughly an hour per inch of section at temperature, after the part is through-heated -- is a
convention with a lot of process-specific variation behind it, and it is separate from the time it takes to get
the part hot in the first place.

The energy side sizes the furnace. Charge heat is a straightforward sensible-heat calculation and the surprise is
usually how much of the furnace's input never reaches it: wall losses, opening losses, atmosphere and fixturing
all consume a large share, and 50% to 70% overall efficiency is common on a batch furnace. The tile reports the
required input at the stated efficiency so the schedule is built on what the furnace can actually deliver.

**Inputs:** maximum section thickness, heat-up and soak rates per inch, charge weight, material specific heat,
starting and soak temperatures, furnace efficiency.

**Outputs:** through-heat time, soak time, total time at temperature, charge heat required, average furnace input
during heat-up in BTU/hr and kW.

## 3. Worked example

A 500 lb charge of 4140 steel, maximum section 2.0 in, austenitized at 1,550 F from a 70 F start, 1 hr per inch to
through-heat and 1 hr per inch to soak, specific heat 0.12 BTU/lb-F, furnace efficiency 60%:

```
through-heat = 1 x 2.0                   = 2.0 hr
soak         = 1 x 2.0                   = 2.0 hr
total        = 4.0 hr at temperature
charge heat  = 500 x 0.12 x 1,480        = 88,800 BTU
furnace input= 88,800 / (2.0 x 0.60)     = 74,000 BTU/hr = 21.7 kW
```

Four hours of furnace time for a two-inch section, and about 22 kW of delivered input during the ramp -- which is
the number that says whether the shop's furnace and its circuit can run this charge on schedule. Note the
thickness leverage: a 4 in section doubles both the through-heat and the soak to 8 hours total, for a charge that
may weigh the same. In heat treating, geometry beats weight every time.

## 4. Scope and non-goals

**Time and energy only. This tile does not specify a heat treatment.** Austenitizing temperature, soak time,
quench medium, and tempering schedule are properties of the specific alloy and the required result, and they come
from the material supplier's data sheet, an ASM reference, or a qualified metallurgist -- not from a rule of
thumb, and a wrong austenitizing temperature ruins the part regardless of how carefully the time was computed.
The soak-rate convention varies widely by process, alloy, and furnace type, and vacuum, salt bath, and induction
heating follow entirely different rules. The tile does not address atmosphere and decarburization, fixturing and
distortion, quenching (its own tile), tempering, or the residual stresses that make a correctly hardened part
crack. The alloy's published heat-treat specification and a qualified heat treater govern.
