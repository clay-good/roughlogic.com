# roughlogic.com Specification v1475 -- Vibration Forcing Frequencies (1x, Blade Pass, Gear Mesh) (`calc-millwright.js`, Group G Cross-Trade Utilities, millwrighting, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-millwright.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; millwright, rotating equipment, and pneumatics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** An overall vibration number says something is wrong. The spectrum says what, but only if you know which line belongs to which part -- and those lines are simple multiples of shaft speed that a technician should not have to look up on a phone in a plant aisle.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive shaft speed, or a blade, tooth, or bar count below one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the standard forcing-frequency relations as routine predictive-maintenance practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`forcing frequency vibration`, `blade pass frequency`, `gear mesh frequency`, `vibration harmonics shaft`, `1x 2x vibration`.

## 2. The tile

### 2.1 `vibration-forcing-frequencies` -- Vibration Forcing Frequencies (1x, Blade Pass, Gear Mesh)

```
shaft turning speed   1x = rpm / 60           (Hz)
blade or vane pass    BPF = 1x x N_blades
gear mesh             GMF = 1x x N_teeth
belt frequency        BF  = 1x x pi x D_sheave / L_belt
motor line frequency  2 x f_line (60 Hz line -> 120 Hz)
rotor bar pass        RBPF = 1x x N_rotor_bars
```

Every rotating part announces itself at a frequency tied to shaft speed. A pump impeller with seven vanes
puts energy at seven times running speed; a gear with thirty-one teeth at thirty-one times; a two-pole induction
motor with an electrical fault at twice line frequency regardless of its shaft speed. Identify the peak's
frequency, divide by running speed, and the integer that comes out names the component.

The classic confusions are worth naming. Unbalance is 1x and dominantly radial; misalignment is usually 2x with
significant AXIAL energy, which is what separates it from unbalance in the field; looseness throws a picket
fence of harmonics. And a peak at 120 Hz on a 60 Hz supply is electrical, not mechanical, no matter how much it
looks like a shaft harmonic on a 3,600 rpm machine -- which is exactly the case where 2x running speed and twice
line frequency land nearly on top of each other and a spectrum alone cannot separate them.

**Inputs:** shaft speed, number of impeller vanes or fan blades, gear tooth counts, belt length and sheave diameter, line frequency, and rotor bar count

**Outputs:** the running speed in Hz and CPM, the 1x through 4x harmonics, blade pass, gear mesh with its first two sidebands, belt frequency and its harmonics, twice line frequency, and rotor bar pass frequency

## 3. Worked example

A 1780 rpm pump with a 7-vane impeller, driven through a gearbox whose input pinion has 31 teeth,
on 60 Hz power:

```
1x    = 1780 / 60      = 29.67 Hz  (1780 CPM)
2x    =                   = 59.33 Hz
3x    =                   = 89.00 Hz
BPF   = 29.67 x 7       = 207.67 Hz
GMF   = 29.67 x 31      = 919.67 Hz
2 x f_line                = 120.00 Hz
```

A peak at 207.7 Hz is the impeller passing the cutwater, which at high amplitude means a tight
impeller-to-cutwater clearance or a starved suction, not a bearing. A peak at 59.33 Hz with strong axial
content is misalignment. And note the trap: 59.33 Hz and 120 Hz are far apart here, but on a 3,540 rpm motor
2x is 118 Hz and sits almost on top of twice line frequency -- there, cutting power and watching whether the peak
vanishes instantly is the only reliable test.

## 4. Scope and non-goals

A frequency calculator, not a diagnosis. It tells you where to look; it does not measure, does not weigh
amplitude, and does not distinguish a benign forcing frequency from a fault -- every one of these frequencies is
present on a healthy machine and only its amplitude and its trend say anything. Bearing frequencies are
non-integer and are handled by `bearing-defect-frequencies`. Resonance, which amplifies whatever excitation
happens to sit near a natural frequency, is not addressed and is the reason a small forcing function sometimes
produces a large reading. Phase measurement, which is what actually separates unbalance from misalignment from a
bent shaft, is not modeled. A qualified vibration analyst and the machine manufacturer's data govern.
