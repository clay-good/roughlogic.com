# roughlogic.com Specification v1633 -- Duct Breakout Noise and Lagging (`calc-hvacsystems.js`, Group C HVAC, test and balance, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacsystems.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; test and balance, controls, and acoustics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Duct-borne noise gets attenuated by silencers; breakout noise does not, because it radiates through the duct wall directly into the space the duct passes through. It is why a conference room next to a shaft is loud despite a perfectly good silencer, and the fix is mass on the duct rather than anything inside it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive duct dimension or length, or a negative sound power level returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the breakout transmission loss concept with ASHRAE acoustics guidance and the project criteria named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`duct breakout noise`, `rectangular duct rumble`, `duct lagging transmission loss`, `silencer does not fix noise`, `round versus rectangular duct noise`.

## 2. The tile

### 2.1 `duct-breakout-noise` -- Duct Breakout Noise and Lagging

```
breakout          sound radiating through the duct wall into the surrounding space
transmission loss the duct wall's own TL; rectangular ducts are far worse than round
rectangular       large flat panels are efficient radiators, especially at low frequency
round             much stiffer; breakout TL is dramatically higher, often 20 dB or more
lagging           mass (loaded vinyl) over a decoupling layer (fibreglass) adds TL;
                  mass alone bolted to the duct adds little
low frequency     rumble is the usual complaint and the hardest to treat
first fix         route the duct elsewhere, or use round duct through sensitive spaces
```

The reason a silencer does not help is geometric: a silencer attenuates sound travelling ALONG the duct to a
downstream outlet, while breakout is sound leaving SIDEWAYS through the wall wherever the duct runs. A duct
carrying high sound power past a quiet room radiates into it regardless of what is installed downstream, and the
noise arrives without ever passing through the diffuser.

Rectangular duct is the problem. A large flat sheet-metal panel is an efficient radiator at low frequency, and
the bigger and flatter the panel the worse it is -- so a wide, shallow rectangular duct is the worst case and it
is also the shape a tight ceiling forces. Round duct of the same area is enormously better because a cylinder is
stiff and does not have flat panels to flex.

Lagging works but only if it is done correctly: a limp mass layer, decoupled from the duct by a soft layer, adds
transmission loss. Mass strapped directly to the metal couples to it and does much less. And because the complaint
is usually low-frequency rumble, thin materials do almost nothing -- the required surface mass is substantial.

The cheapest fix is always routing, and the second cheapest is round duct, and both are design decisions rather
than field ones -- which is why identifying breakout early matters.

**Inputs:** duct shape and dimensions, gauge, the length exposed to the sensitive space, the sound power level in the duct by octave band, the room absorption, and any lagging construction

**Outputs:** the duct surface area exposed, the breakout transmission loss by octave band for the entered construction, the resulting sound pressure in the room, the level against the room criterion, the improvement from a stated lagging, and the comparison against an equivalent round duct

## 3. Worked example

A 48 in by 12 in rectangular duct running 20 ft through a conference room ceiling, carrying the discharge of a
rooftop unit.

```
exposed surface = 2 x (48 + 12)/12 x 20 = 200 sq ft
```

A 48 by 12 duct is close to the worst case for breakout: a wide flat panel with low stiffness, radiating
efficiently in the 63 and 125 Hz bands where the fan puts most of its sound power and where the room criterion is
least forgiving.

**The silencer downstream does nothing about this.** It reduces what reaches the diffusers; the rumble in this
room arrives through 200 sq ft of duct wall.

The options, in order of effectiveness per dollar:

```
route the duct outside the room            -- removes the problem entirely
substitute round duct of equal area (28 in) -- typically 15 to 25 dB better at low frequency
lag with 1 lb/sq ft loaded vinyl over 2 in fibreglass -- roughly 8 to 12 dB
increase gauge / add stiffeners            -- a few dB, rarely enough alone
```

Note that the round substitution and the routing change are design decisions. By the time a balancer is
measuring the complaint the duct is in, and lagging 200 sq ft in a finished ceiling is expensive -- which is the
argument for catching it on the drawings.

## 4. Scope and non-goals

A screening discussion with a surface-area calculation. Breakout transmission loss is frequency-dependent and
depends on duct dimensions, aspect ratio, gauge, stiffening, and length; ASHRAE publishes TL data by duct size
and the values must come from there or from the manufacturer rather than from a single number. It does not
compute the sound power in the duct, which comes from the fan or terminal unit's rated sound power adjusted for
the duct system, and without that the room level cannot be predicted. It does not address duct-borne noise,
regenerated noise at fittings and dampers, or structure-borne transmission from equipment, all of which produce
similar complaints with different fixes. Lagging performance depends critically on the decoupling layer and on
complete coverage; a lagged duct with unlagged hangers or an open seam performs far below its rating. ASHRAE
Applications handbook acoustics chapters, the project acoustical criteria, and an acoustical consultant
govern.
