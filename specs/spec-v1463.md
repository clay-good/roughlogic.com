# roughlogic.com Specification v1463 -- Line Voltage Regulator Tap and Bandwidth (`calc-lineworker.js`, Group W, line work, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lineworker.js`**
> (Group W, overhead line and distribution), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A step voltage regulator has three settings that interact -- set voltage, bandwidth, and time delay -- plus line drop compensation, and getting them wrong produces either a feeder that sags at the end or a regulator that hunts itself to death. The tap arithmetic behind the settings is simple and is nowhere in the catalog.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive base voltage, a bandwidth at or below one tap step, or a tap position beyond plus or minus sixteen returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the ANSI 32-step regulator ranging and the line drop compensation relation, with ANSI C57.15 named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`regulator bandwidth setting`, `voltage regulator tap`, `line drop compensation setting`, `regulator hunting bandwidth`, `step regulator volts per tap`.

## 2. The tile

### 2.1 `regulator-tap-bandwidth` -- Line Voltage Regulator Tap and Bandwidth

```
taps            32 steps of 5/8% each, +/- 10% total
volts per step  V_step = 0.00625 x V_base
regulated range V_set +/- (BW / 2)
minimum BW      BW > V_step   (below one step the regulator hunts)
LDC setting     V_sensed = V_set + I ( R_set cos(phi) + X_set sin(phi) )
```

The bandwidth is a deadband: the regulator does nothing while the sensed voltage stays inside it and moves one
tap when it leaves. The first hard rule is that bandwidth must exceed one tap step, because a regulator whose
deadband is narrower than its own correction will overshoot on every operation and immediately need to come
back -- that is hunting, and it wears out a tap changer in a fraction of its rated operations. Practice is a
bandwidth of about 1.5 to 2 tap steps, which on a 120 V base means 0.75 V per step and a bandwidth around 1.5 to
2.0 V.

Line drop compensation makes the regulator hold voltage at a point out on the feeder rather than at its own
terminals, by adding a synthetic drop proportional to load current. The R and X settings are in volts at rated CT
secondary current, and they encode the impedance to the regulation point. Set them too high and the regulator
overcorrects at peak; set them to zero and the end of the feeder sags exactly as far as the line drops.

**Inputs:** base voltage, bandwidth in volts, tap position, load current and power factor, and the line drop compensation R and X settings with the CT rating

**Outputs:** the volts per tap step, the regulated band, the bandwidth expressed in tap steps with a hunting warning below one, the output voltage at the entered tap, and the compensated sensed voltage with line drop compensation applied

## 3. Worked example

A regulator on a 120 V base with a 2.0 V bandwidth:

```
V_step  = 0.00625 x 120        = 0.750 V per tap
BW      = 2.0 V = 2.67 tap steps
band    = V_set +/- 1.0 V
full range = +/- 16 steps x 0.750 = +/- 12.0 V = +/- 10%
```

2.67 tap steps of bandwidth is right in the normal range. Narrow it to 0.60 V and the deadband is smaller
than one tap -- the regulator corrects, overshoots out the other side of the band, and corrects back, forever.

With line drop compensation set to R = 3 V and X = 6 V at rated current, at full load and 0.9 power
factor the regulator senses `V_set + 3(0.9) + 6(0.436)` = 5.32 V above its terminal voltage, so it holds
the terminals 5.32 V high at peak to keep the regulation point on target.

## 4. Scope and non-goals

One single-phase step regulator, steady state, 32-step ANSI ranging. It does not set the time delay, which
governs coordination between cascaded regulators and between a regulator and a switched capacitor and is the
third setting in the interaction; a downstream device must be slower than the upstream one or they fight. It does
not compute the impedance to the regulation point, which is what the R and X settings should be derived from, and
it does not perform a feeder voltage profile. Reverse power flow -- from distributed generation behind the
regulator -- breaks the compensation logic entirely and requires a reverse-sensing mode this tile knows nothing
about. ANSI C57.15, IEEE 1783, the regulator manufacturer's control manual, and the utility's voltage regulation
practice govern.
