# roughlogic.com Specification v1635 -- Mechanical Room Sound Transmission and NC Rating (`calc-hvacsystems.js`, Group C HVAC, test and balance, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacsystems.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; test and balance, controls, and acoustics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** The room next to a mechanical room hears the equipment through the wall, and how much depends on the wall's rating and the room's absorption. It is a two-term subtraction, and it is what says whether a wall upgrade or an equipment change is the cheaper fix.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive partition area or receiving room absorption, or a negative transmission loss returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the partition transmission relation with ASHRAE acoustics guidance and tested assembly data named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`mechanical room sound transmission`, `nc adjacent to mechanical room`, `wall transmission loss noise`, `flanking path mechanical noise`, `stc mechanical equipment`.

## 2. The tile

### 2.1 `mechanical-room-nc` -- Mechanical Room Sound Transmission and NC Rating

```
received level    L_p2 = L_p1 - TL + 10 log10( S / A )
L_p1              the sound pressure level in the mechanical room
TL                the wall's transmission loss by octave band (from its STC construction)
S                 the area of the common partition
A                 the absorption in the receiving room, sabins
flanking          paths around the wall -- ceiling plenum, floor, ducts, penetrations --
                  which frequently dominate and are not improved by a better wall
low frequency     STC does not describe it; mechanical noise is largely low frequency
```

The subtraction is straightforward and the traps are all in what it leaves out. STC is a single-number rating
weighted for speech frequencies, and mechanical equipment noise is concentrated far lower -- so a wall with a high
STC can perform poorly against a chiller or a fan, and octave-band transmission loss data rather than STC is what
the calculation needs.

Flanking is the reason wall upgrades so often disappoint. If the partition stops at the ceiling and the two rooms
share a plenum, sound goes over the top and the wall's rating is nearly irrelevant. The same applies to a shared
floor slab, to ducts penetrating both rooms, and to any unsealed penetration -- a few square inches of open
penetration can undo an entire wall assembly, which is why sealing is not a detail.

For a field decision the value is comparative. If the calculation says the wall should deliver an NC 35 in the
adjacent room and the measurement reads NC 48, the wall is not the problem -- there is a flanking path, and
finding it is cheaper than any acoustic upgrade. If the calculation and the measurement agree, the wall is
performing as built and the choice is between a better wall, a quieter machine, or vibration isolation.

**Inputs:** the sound pressure level in the mechanical room by octave band, the partition transmission loss by band, the partition area, the receiving room absorption, and the room NC criterion

**Outputs:** the received sound pressure level by octave band, the resulting NC in the receiving room, the level against the criterion, the transmission loss required to meet the criterion, and a flanking flag when a measured level substantially exceeds the calculated one

## 3. Worked example

A 200 sq ft partition between a mechanical room measuring 85 dB at 125 Hz and an office with 300 sabins of
absorption, through a wall with 38 dB of transmission loss at that band:

```
L_p2 = 85 - 38 + 10 log10( 200 / 300 )
     = 85 - 38 + 10 log10(0.667)
     = 85 - 38 - 1.8 = 45.2 dB at 125 Hz
```

45 dB at 125 Hz corresponds to roughly NC 40 if the other bands behave similarly -- above an NC 35 office target
by about 5 points, so the wall needs about 5 more dB of transmission loss at low frequency.

**Now the flanking test.** If the office actually measures 55 dB at 125 Hz -- ten decibels above the calculation --
the wall is not the path. Ten decibels is a factor of ten in energy, and no wall constructed as specified
underperforms its rating by that much. The likely paths are a partition that stops at the ceiling grid, a duct
penetrating both rooms, or an unsealed opening.

That distinction is worth a great deal, because upgrading the wall in the flanking case buys almost nothing while
sealing the plenum above it buys all of it -- and one costs a fraction of the other.

## 4. Scope and non-goals

A single-partition transmission calculation. It uses octave-band transmission loss data, which must come from
tested assembly data rather than from an STC number: STC is weighted for speech and systematically overstates
performance against low-frequency mechanical noise. It considers only the direct path through one partition and
does not model flanking through the ceiling plenum, floor, structure, ducts, piping, or penetrations, which
frequently dominate and which no partition upgrade addresses. It does not model structure-borne transmission from
equipment through its supports, which requires vibration isolation (`isolator-deflection`) rather than acoustic
treatment. It does not predict the source level, which comes from equipment sound power data and the mechanical
room's own absorption. It does not address regenerated noise in the receiving room's own air distribution. ASHRAE
acoustics guidance, tested assembly data, the project acoustical criteria, and an acoustical consultant
govern.
