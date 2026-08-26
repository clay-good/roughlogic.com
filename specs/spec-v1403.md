# roughlogic.com Specification v1403 -- Band Saw Blade Pitch, Speed, and Cut Time (calc-machining.js, Group E, machining and fabrication, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`**
> (Group E, machining and fabrication), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog computes grinding wheel speed, cutting speed for milling and turning, and radial chip thinning, but the saw -- the first machine most parts touch -- has no tile. Blade pitch is chosen by a tooth-count rule that depends on the section being cut, and getting it wrong strips teeth on thin wall or work-hardens on thick.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive section thickness, blade speed, wheel diameter, or cut area, or a feed rate at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the 3-to-24 teeth-in-the-cut rule for band sawing and the surface-speed relation for the blade, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `band-saw-blade-pitch` -- Band Saw Blade Pitch, Speed, and Cut Time

```
minimum TPI   = 3 / section thickness in the cut
maximum TPI   = 24 / section thickness in the cut
wheel RPM     = blade speed (SFM) x 12 / (pi x wheel diameter)
cut area      = the cross-section the blade passes through
cut time      = cut area / feed rate (sq in per minute)
```

The whole rule is that between **three and twenty-four teeth** must be engaged in the cut at any moment. Fewer
than three and a tooth can straddle the work, catch a corner, and strip -- which is how a blade dies on thin-wall
tube in one stroke. More than twenty-four and there is no gullet space for the chip, so the chips pack, the teeth
rub instead of cutting, and the work hardens ahead of the blade -- which is how a blade dies on stainless.

Because the tooth count depends on the *thickness in the cut* and not on the part's overall size, the answer
changes through the cut on a round bar or a tube, which is exactly why variable-pitch blades exist and why they
are the default for mixed work. The tile reports the acceptable band so a single blade can be checked against a
range of sections rather than one.

**Inputs:** section thickness in the cut (or the tube wall and diameter), blade speed for the material (SFM),
wheel diameter, cut cross-sectional area, achievable feed rate in square inches per minute.

**Outputs:** minimum and maximum TPI, the recommended pitch band, wheel RPM at the chosen blade speed, cut area,
and cut time.

## 3. Worked example

A 2.0 in solid mild steel round, blade at 250 SFM on 12 in wheels, cutting at 5 sq in per minute:

```
minimum TPI = 3 / 2.0            = 1.5
maximum TPI = 24 / 2.0           = 12
              -> a 4/6 variable pitch sits comfortably inside the band
wheel RPM   = 250 x 12 / (pi x 12) = 79.6 rpm
cut area    = pi x 1.0^2           = 3.14 sq in
cut time    = 3.14 / 5             = 0.63 min = 38 seconds
```

Now cut 2.0 in square tube with a 0.120 in wall instead. The thickness in the cut on the walls is 0.120 in, so the
band becomes 25 to 200 TPI -- and there is no such blade. That is the real lesson: thin wall cannot satisfy the
minimum-three-teeth rule with any practical pitch on its own, which is why thin tube is bundled, nested, or cut
with a fine 14/18 blade at reduced feed and accepted as a compromise.

## 4. Scope and non-goals

Pitch selection and cycle time. Blade speed and achievable feed rate are material and machine figures from the
blade manufacturer's chart -- feed rate in particular depends on machine rigidity, blade tension, coolant, and
blade condition, and it is the least predictable input here. The tile does not select blade width (which is set by
the smallest radius to be cut and by the machine's wheel diameter), tooth form, set, or backing material, does not
address break-in, blade tension, or guide adjustment, and does not compute blade life. It assumes a straight cut
through a uniform section. The saw and blade manufacturers govern.
