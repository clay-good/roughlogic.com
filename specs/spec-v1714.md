# roughlogic.com Specification v1714 -- Riser Modulus and Feeding Distance (`calc-process.js`, Group G Cross-Trade Utilities, foundry, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-process.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; foundry and casting), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A riser only feeds a casting if it stays liquid longer than the casting does, and how long a shape stays liquid depends on its volume-to-surface ratio. Modulus is that ratio, and it turns riser sizing from a guess into a comparison.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive volume or surface area, or a riser modulus not exceeding the casting modulus returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the modulus method and Chvorinov rule by name as standard foundry methoding practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`riser modulus feeding`, `chvorinov rule casting`, `volume to surface ratio riser`, `feeding distance riser`, `insulating sleeve modulus`.

## 2. The tile

### 2.1 `riser-modulus-feeding` -- Riser Modulus and Feeding Distance

```
modulus            M = volume / cooling surface area
solidification     time proportional to M^2 (Chvorinov's rule)
riser requirement  M_riser > M_casting, commonly by 20% or more
volume requirement the riser must also CONTAIN enough metal to feed the shrinkage
                   both conditions must be satisfied; modulus alone is not enough
feeding distance   a riser feeds only a limited distance along a section
sleeves and chills insulating sleeves raise the effective riser modulus without volume;
                   chills lower the local casting modulus
```

Modulus is a shape number: a compact shape has a high volume-to-surface ratio and cools slowly, a thin plate has
a low one and cools quickly. Chvorinov's rule says solidification time goes as modulus squared, so a riser with
twenty percent more modulus than the section it feeds stays liquid roughly forty percent longer -- which is the
margin the feeding needs.

The two conditions are independent and both bind. A riser can have adequate modulus and too little volume, in
which case it stays liquid but runs out of metal to give; or adequate volume and too little modulus, in which
case it freezes first and feeds nothing. Sizing on one and assuming the other is how a riser that looks generous
produces a casting with shrinkage porosity directly beneath it.

Feeding distance is the constraint that determines the NUMBER of risers rather than their size. A riser feeds
only a limited distance along a section before the metal between has solidified, so a long section needs several
risers regardless of how large each one is -- and the distance depends on the section's own geometry and on
whether chills are used to steepen the thermal gradient.

Sleeves and chills are the levers that break the volume-versus-modulus trade. An insulating or exothermic sleeve
raises the riser's effective modulus without adding metal, which is exactly what improves yield
(`casting-pour-yield`) without sacrificing feeding.

**Inputs:** the casting section dimensions for its modulus, the riser dimensions, the required modulus ratio, the casting shrinkage percentage, the riser feeding efficiency, and the feeding distance for the section

**Outputs:** the casting section modulus, the riser modulus, the ratio between them against the requirement, the shrinkage volume to be fed, the riser volume available at the entered feeding efficiency, whether both the modulus and volume conditions are satisfied, and the number of risers the feeding distance requires

## 3. Worked example

A casting section 8 by 6 by 1.5 in:

```
volume  = 8 x 6 x 1.5 = 72 cu in
surface = 2(8x6 + 8x1.5 + 6x1.5) = 138 sq in
modulus = 72 / 138 = 0.522 in
```

For a riser at a 1.2 modulus ratio the riser needs `0.522 x 1.2` = 0.626 in of modulus. A cylindrical
riser of diameter d and height d has a modulus of about d/6, so:

```
d = 6 x 0.626 = 3.76 in
```

**A 3.8 in riser on modulus grounds.** Now the volume check. If the alloy shrinks 4 percent and the
riser feeds at 15 percent efficiency:

```
shrinkage to feed = 72 x 0.04 = 2.9 cu in
riser volume needed = 2.9 / 0.15 = 19 cu in
riser volume available = pi/4 x 3.76^2 x 3.76 = 42 cu in
```

42 against 19 needed -- **both conditions satisfied**, and this riser
works.

Had the volume come out short, the riser would stay liquid and run out of metal, leaving porosity directly under
it -- which looks like a feeding failure and is a volume failure.

**The sleeve lever.** An insulating sleeve raises the effective modulus, so the same feeding can be achieved with
a smaller riser -- which raises the yield (`casting-pour-yield`) without giving up soundness. That is the move
that resolves the yield-versus-quality tension rather than trading one against the other.

## 4. Scope and non-goals

A modulus and volume screen. Chvorinov's rule is an approximation and the modulus ratio required varies with
alloy, section geometry, and the feeding path; foundry practice and solidification simulation give better answers
than a fixed ratio. It does not determine feeding distance, which depends on the section geometry and the thermal
gradient and which determines how many risers a section needs rather than how large each is. It does not address
gating design, riser neck sizing (a neck that freezes early isolates the riser regardless of its modulus), riser
placement, chills, or the directional solidification the whole method depends on. Shrinkage percentages and riser
feeding efficiencies are alloy and practice specific. Solidification simulation has largely replaced hand
methoding for demanding castings. The foundry's methoding practice, solidification simulation, and the
metallurgist govern.
