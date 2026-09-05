# roughlogic.com Specification v1585 -- Bandmill Blade Speed, Feed, and Bite per Tooth (`calc-sawmill.js`, Group L Agriculture and Forestry, sawmill, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-sawmill.js`**
> (Group L, Agriculture and Forestry -- the existing category, hub `/groups/agriculture/`; sawmill and forest products), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Bite per tooth is the number a filer tunes a mill around: too little and the saw rubs and heats, too much and it dives or breaks. It comes from feed speed, blade speed, and tooth spacing, and it is the bridge between what the sawyer does and what the saw does.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive wheel diameter, rotation speed, tooth spacing, or feed rate returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the bite-per-tooth relation and typical ranges as standard sawfiling practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`bandmill bite per tooth`, `band saw feed speed`, `sawmill blade speed sfpm`, `gullet loading band saw`, `feed rate for bite per tooth`.

## 2. The tile

### 2.1 `bandmill-speed-bite` -- Bandmill Blade Speed, Feed, and Bite per Tooth

```
blade speed     SFPM = pi x wheel diameter / 12 x rpm
bite per tooth   = feed speed (in/min) / (SFPM x 12 / tooth spacing)
                 equivalently, the wood advanced between successive teeth
gullet loading  the sawdust from one bite must fit in the gullet through the cut
typical band    0.020 to 0.045 in per tooth for softwood; less for dense hardwood
symptoms        too little bite: heat, dulling, washboarding; too much: dive, wander, breakage
```

Bite per tooth is what each tooth actually takes, and everything about a band's behaviour follows from it. Too
small a bite means the tooth is rubbing rather than cutting, which generates heat, work-hardens the tip, and
produces the washboard finish that gets blamed on tension. Too large a bite overloads the gullet, and a gullet
that fills before it exits the cut packs, which is what makes a saw dive.

The gullet is the real constraint and it is why bite and depth of face cannot be considered separately. A bite
that is fine in a 12 inch cant is too much in a 30 inch one, because the gullet has to carry the sawdust across a
face two and a half times as deep. That is the arithmetic behind slowing the feed as the cants get bigger, and it
is why a mill running mixed sizes at a fixed feed speed has a saw problem on the big logs only.

For a filer the useful inversion is what feed speed a target bite implies at the current blade speed and tooth
spacing -- which is a setting the sawyer can act on directly.

**Inputs:** wheel diameter and rotation speed (or blade speed directly), tooth spacing, feed speed, depth of face, and the target bite per tooth

**Outputs:** the blade speed in surface feet per minute, the bite per tooth, whether it falls inside the typical band, the feed speed for a target bite, the sawdust volume per gullet, and the maximum depth of face the gullet supports at that bite

## 3. Worked example

A bandmill with 54 in wheels at 580 rpm, 1.75 in tooth spacing, feeding at 120 ft/min:

```
blade speed = pi x 54 / 12 x 580 = 8,200 SFPM
teeth passing per minute = 8,200 x 12 / 1.75 = 56,226
bite per tooth = 120 x 12 / 56,226 = 0.0256 in
```

0.026 in -- comfortably inside the 0.020 to 0.045 band for softwood.

Now the sawyer speeds up to 200 ft/min on a small cant:

```
bite = 200 x 12 / 56,226 = 0.0427 in
```

0.043 in, at the top of the range. Fine in a shallow cut, and in a 30 in face the same bite
puts far more sawdust through each gullet than it can carry -- which is when the saw starts to dive and everyone
blames the tension or the filer.

Working backwards for a target of 0.030 in:

```
feed = 0.030 x 56,226 / 12 = 141 ft/min
```

## 4. Scope and non-goals

A kinematic relation between feed, blade speed, and tooth spacing. It does not evaluate gullet capacity
quantitatively, which requires the gullet area, the sawdust bulking factor for the species and moisture, and the
depth of face; the tile flags the interaction but the filer's judgment and the saw manufacturer's guidance
govern. It does not address saw tension, wheel alignment and tracking, tooth geometry, hook and clearance angles,
set or swage, blade width and gauge, or strain -- all of which affect cutting behaviour at least as much as bite
does and none of which is arithmetic. It does not address sawing accuracy, target sizes, or the kerf and
oversize allowances that determine recovery (`lumber-recovery-overrun`). Band saws operating at these speeds are
a serious hazard: the saw and mill manufacturers' specifications, a qualified filer, and OSHA govern.
