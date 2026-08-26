# roughlogic.com Specification v1365 -- Delay Loudspeaker Time and Haas Offset (calc-stage.js, Group N, stage and live production, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-stage.js`**
> (Group N, stage and live production), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Group N computes the speed of sound versus temperature but never uses it for the job it exists for: setting the delay time on a delay tower or under-balcony fill. The tile is missing the Haas offset, which is the part that is deliberately *not* the geometric time, and the temperature sensitivity that moves the answer between soundcheck and showtime.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive distance or speed of sound, or a negative Haas offset, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the geometric delay time from the speed of sound in air, and the Haas (precedence) effect offset practice of 10 to 20 ms, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `delay-tower-alignment` -- Delay Loudspeaker Time and Haas Offset

```
c            = 1125 ft/s at 70 F, scaling as sqrt(absolute temperature)
geometric ms = distance / c x 1000
set delay    = geometric ms + Haas offset
```

The geometric time is the easy half: sound from the main array reaches the delay tower's position some
milliseconds after the delay speaker could fire, and delaying the tower by that amount puts the two arrivals on
top of each other. But two coincident arrivals from two directions do not localize -- the audience hears the
delay speaker, which is right on top of them, and the show appears to come from the wrong place.

The Haas offset is the fix. Adding 10 to 20 milliseconds beyond the geometric time makes the main array arrive
*first* by a margin the ear reads as the source direction, while the delay speaker, arriving inside the precedence
window, still adds level without being heard as a separate sound. Fifteen milliseconds is the common starting
point, worth about 17 feet of apparent distance.

Temperature is the trap. The speed of sound rises with the square root of absolute temperature, so an outdoor
alignment set in a 70 F afternoon is wrong by showtime -- and the error grows with the distance, which is exactly
where the long throws are.

**Inputs:** distance from the main array to the delay position (ft), air temperature (F), Haas offset (ms).

**Outputs:** speed of sound at that temperature, geometric delay (ms), total delay to set (ms), and the delay at a
second temperature for comparison.

## 3. Worked example

A delay tower 180 ft downfield of the main array, aligned at 70 F with a 15 ms Haas offset:

```
c        = 1125 ft/s
geometric= 180 / 1125 x 1000 = 160.0 ms
set      = 160.0 + 15        = 175.0 ms
```

Now walk it to a 90 F afternoon: `c = 1125 x sqrt(549.67/529.67) = 1146.0 ft/s`, and the geometric time falls to
157.1 ms. The alignment set that morning is 2.9 ms long -- small, but on a 400 ft throw the same 20-degree swing
is 6.5 ms, enough to hear. Outdoor shows re-check delay times when the air moves.

## 4. Scope and non-goals

One delay position at a time. The tile does not handle a delay ring where multiple towers must be timed to each
other as well as to the mains, does not set relative levels (a delay speaker aligned in time but 6 dB hot still
pulls the image), and does not model wind, which shifts arrival time far more than temperature on an exposed
site. Humidity's effect on the speed of sound is negligible next to temperature and is not modeled. Measure with
a dual-channel analyzer and trust the measurement over the arithmetic. The system tech governs.
