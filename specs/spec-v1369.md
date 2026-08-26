# roughlogic.com Specification v1369 -- RF Antenna Cable Loss and Amplifier Budget (calc-stage.js, Group N, stage and live production, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-stage.js`**
> (Group N, stage and live production), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** A wireless microphone system with remote antennas lives on a link budget nobody writes down: coax loss per hundred feet at the operating frequency, against the gain of an inline amplifier. Under-amplify and the system loses range; over-amplify and the front end overloads and it loses range anyway. The catalog computes RF link budgets for point-to-point radio but nothing for an antenna feed.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive cable length, a negative loss rate, or a splitter or connector count below zero, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the coaxial cable attenuation-per-length model and the unity-gain antenna-distribution practice, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `rf-antenna-cable-loss` -- RF Antenna Cable Loss and Amplifier Budget

```
cable loss   = length / 100 x loss per 100 ft at frequency
total loss   = cable loss + connector loss + splitter insertion loss
net gain     = amplifier gain - total loss
```

Coax loss is quoted per hundred feet at a stated frequency and it rises with frequency, so a run that is fine for
a 200 MHz intercom is lossy for a 600 MHz microphone. Every decibel lost between the antenna and the receiver
comes straight off the system's range, and it cannot be recovered downstream: an amplifier at the receiver end
amplifies the noise the cable added along with the signal.

The target is **unity gain**, not maximum gain. An inline amplifier is there to replace the cable's loss, not to
exceed it. Net gain meaningfully above zero pushes the receiver front end toward overload and intermodulation --
the same products the coordination tile computes -- and the symptom looks exactly like a weak signal. Aim for a
net between about -3 dB and +3 dB and put the amplifier at the antenna end, where it amplifies signal before the
cable degrades it.

**Inputs:** cable length (ft), loss per 100 ft at the operating frequency, connector count and per-connector loss,
splitter or distribution insertion loss, inline amplifier gain (dB).

**Outputs:** cable loss, total system loss, net gain, and a plain statement of whether the run is under, at, or
over unity.

## 3. Worked example

A 150 ft antenna run on RG-8X-class coax at 600 MHz (about 8.8 dB per 100 ft), with a 12 dB inline amplifier:

```
cable loss = 150 / 100 x 8.8 = 13.2 dB
net gain   = 12 - 13.2       = -1.2 dB
```

That lands inside the unity window and the system will work. Now change one thing: run the same 150 ft on
low-loss LMR-400-class coax at about 3.9 dB per 100 ft and the loss is 5.85 dB -- close enough to unity that no
amplifier is needed at all, and one less active device in the path. Better cable is almost always the better
answer, and the tile makes the comparison in one line.

## 4. Scope and non-goals

A cable budget, not a coverage prediction. It says nothing about antenna pattern, placement, height, or the
obstructions between the antenna and the performer, which dominate real-world range far more than a decibel of
cable. Loss per 100 ft must be taken from the specific cable's published figure at the specific operating
frequency; the numbers used here are typical, not authoritative. Active antennas and antenna distribution systems
have their own gain structure and noise figure that this simple sum does not capture. The cable and antenna
manufacturers, and the frequency coordinator, govern.
