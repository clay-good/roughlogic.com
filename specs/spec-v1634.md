# roughlogic.com Specification v1634 -- Duct Silencer Insertion Loss and Pressure Drop (`calc-hvacsystems.js`, Group C HVAC, test and balance, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacsystems.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; test and balance, controls, and acoustics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A duct silencer buys attenuation and costs static pressure, and the two scale together -- so the temptation is to pick the quietest one and discover it has eaten the fan's entire remaining capacity. The trade is a manufacturer table, and the pressure drop rises with the square of velocity.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive airflow, face area, or silencer length, or a negative insertion loss returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the insertion loss and pressure drop trade with ASTM E477 and the manufacturer tested data named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`duct silencer insertion loss`, `sound attenuator pressure drop`, `silencer face velocity`, `regenerated noise silencer`, `silencer sizing hvac`.

## 2. The tile

### 2.1 `silencer-insertion-loss` -- Duct Silencer Insertion Loss and Pressure Drop

```
insertion loss   the reduction in sound power the silencer provides, by octave band
pressure drop    from the manufacturer at the face velocity; rises with velocity squared
face velocity    the velocity through the silencer's own free area, not the duct
regenerated noise the silencer makes its own noise at high velocity, which sets a floor
                 below which more insertion loss buys nothing
length           attenuation rises with length; so does pressure drop, but linearly
                 while noise regeneration rises much faster with velocity
forward vs reverse  a silencer's rating differs with flow direction relative to the sound
```

Insertion loss and pressure drop are not independent: the geometry that absorbs sound -- narrow passages,
thick baffles -- is the geometry that restricts flow. Doubling the face velocity through a given silencer roughly
quadruples its pressure drop, so a silencer squeezed into a duct that is already undersized costs far more static
than its catalogue figure suggests.

Regenerated noise is the limit that people discover last. At high face velocity the silencer generates turbulent
noise of its own downstream of the baffles, and that noise is not attenuated by anything -- it is created after
the attenuation. So there is a velocity above which adding silencer length makes the system quieter on paper and
no quieter in the room, because the regenerated noise has become the dominant source. The manufacturer's
regenerated sound power data is what identifies it, and it is the reason silencers are sized for a face velocity
target rather than simply fitted to the duct.

The practical sequence is: get the face velocity down by transitioning to a larger cross-section at the silencer,
choose the length for the attenuation needed, then check the pressure drop against the fan's available static and
the regenerated noise against the room criterion.

**Inputs:** airflow, silencer face area and free area, the insertion loss by octave band, the pressure drop at the face velocity, the regenerated sound power, the fan available static, and the room criterion

**Outputs:** the face velocity, the pressure drop at that velocity, the insertion loss by band, the regenerated sound power level, the resulting sound power downstream, the room level against the criterion, and the face area needed to bring velocity to a target

## 3. Worked example

A silencer passing 9,000 cfm through a 36 in by 24 in face:

```
face area     = 36 x 24 / 144 = 6.0 sq ft
face velocity = 9,000 / 6.0   = 1,500 fpm
```

At 1,500 fpm a typical 5 ft rectangular silencer might give 0.35 in wc of pressure drop. Now squeeze the same
airflow through a 30 by 20 face because that is what the shaft allows:

```
face area     = 30 x 20 / 144 = 4.17 sq ft
face velocity = 9,000 / 4.17  = 2,158 fpm
pressure drop ~ 0.35 x (2,158/1,500)^2 = {0.35*(2158/1500)**2:.2f} in wc
```

**Pressure drop doubles** for a 44 percent velocity increase, and that {0.35*(2158/1500)**2 - 0.35:.2f} in wc has to
come out of the fan's available static.

And the regenerated noise: at 2,158 fpm the silencer's own generated sound power in the low bands may exceed what
its insertion loss removed, so the room gets no quieter no matter how long a silencer is fitted. The correct move
is a transition to a larger silencer face -- keeping the duct velocity wherever it needs to be and slowing the air
only through the silencer -- which costs a fitting and buys back both the pressure drop and the noise floor.

## 4. Scope and non-goals

A screening calculation around manufacturer data the user supplies. Insertion loss, pressure drop, and
regenerated sound power are tested values specific to a silencer model, length, and configuration, measured to
ASTM E477, and they must come from the manufacturer's data at the actual face velocity and flow direction --
generic values will misrepresent all three. It does not predict the room sound level, which requires the source
sound power, the duct system attenuation and regeneration upstream and downstream, the end reflection, and the
room absorption. It does not address breakout noise (`duct-breakout-noise`), which a silencer does not touch, or
flanking paths. Silencers with fibrous media carry erosion and indoor air quality considerations in some
applications, and packless designs perform differently. ASTM E477 test data from the manufacturer, ASHRAE
acoustics guidance, and an acoustical consultant govern.
