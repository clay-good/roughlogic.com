# roughlogic.com Specification v1284 -- Helical Spring Natural Frequency (Surge) (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-08-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, mechanic/machinist), no new module or dependency. Inherits spec.md through spec-v1283.md.
>
> **The gap.** The helical-spring family has the rate (`helical-spring-rate`), the Wahl wire stress, solid height,
> and buckling (`spring-wire-stress`) -- but not the **natural (surge) frequency**, the fifth standard check.
> A compression spring cycled near its own resonance surges: the coils bunch in a travelling wave, the force spikes,
> and the spring can float off the cam or fatigue. Engine valve springs live or die by keeping the surge frequency
> a wide margin above the valvetrain forcing harmonics. This adds the Shigley closed form, cross-pinned to the rate.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive wire diameter / mean coil diameter / active coils, or an unknown material, returns `{ error }`; no
numeric field is ever `Infinity`. Citation discipline (v19/v22): the helical-spring surge frequency
`fn = (1/2) sqrt(k g / W)` for a spring held between flat parallel plates (Shigley, *Mechanical Engineering
Design*; Machinery's Handbook), by name, `GOVERNANCE.general`. Adds a weight-density field to the existing
`SPRING_MATERIALS` map (additive; the rate tile reads only the shear modulus).

## 2. The tile

### 2.1 `spring-natural-frequency` -- Helical Spring Natural (Surge) Frequency

```
k  = G d^4 / (8 D^3 Na)                       spring rate (same as helical-spring-rate)
W  = pi^2 d^2 D Na gamma / 4                   weight of the active coils, gamma = wire weight density
fn = (1/2) sqrt(k g / W)                        fundamental surge frequency (both ends against flat plates), g = 386.4 in/s^2
```

The fundamental is the lowest of a series `fn, 2 fn, 3 fn ...`; the tile reports `fn` in Hz and cycles/min. The
tile also reports `k` so the result can be checked against `helical-spring-rate` (they share the identical rate).

**Inputs:** wire diameter d (in), mean coil diameter D (in), active coils Na, wire material (shear modulus G and
weight density gamma from `SPRING_MATERIALS`).

**Outputs:** surge frequency fn (Hz and cycles/min), spring rate k (lb/in), weight of the active coils W (lb).

## 3. Worked example

0.080 in hard-drawn wire, 0.75 in mean coil, 8 active coils:

```
k  = 11.5e6 x 0.080^4 / (8 x 0.75^3 x 8) = 17.45 lb/in   (matches helical-spring-rate)
W  = pi^2 x 0.080^2 x 0.75 x 8 x 0.284 / 4 = 0.0269 lb
fn = (1/2) sqrt(17.45 x 386.4 / 0.0269) = 250 Hz = 15,000 cycles/min
```

The rate agrees exactly with `helical-spring-rate` for the same wire. Music wire (stiffer, G 11.85e6) raises it to
254 Hz; phosphor bronze (softer and denser) drops it to 170 Hz. For a valve spring you want `fn` at least 13-20
times the highest valvetrain forcing harmonic, so a spring surging at 250 Hz suits a cam whose fundamental stays
well under about 15 Hz -- roughly 1,800 engine rpm of headroom per harmonic order.

## 4. Scope and non-goals

The fundamental surge frequency of the active coils held between flat parallel plates; the higher modes are integer
multiples. Damping, variable-pitch or conical springs, preload, and the actual valvetrain harmonic content are not
modeled -- matching `fn` against the real cam-acceleration harmonics is the cam grinder's and engine builder's job.
A screen; Machinery's Handbook / Shigley and the spring maker govern.
