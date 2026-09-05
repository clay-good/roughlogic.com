# roughlogic.com Specification v1643 -- Travel-Lift Sling Placement and Hull Load (`calc-mechanic.js`, Group K Mechanic - Auto, Marine, Aviation, marine, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, Mechanic - Auto, Marine, Aviation -- the existing category, hub `/groups/mechanic/`; marine and boatyard), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A travel lift picks a boat on two slings, and where they go decides whether the hull is supported or crushed. The slings must land under structure and clear the running gear, and the load split follows from their position relative to the centre of gravity.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive displacement or sling spacing, or a centre of gravity outside the sling positions returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the two-point load split relation with the builder lifting points and the travel lift manufacturer ratings named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`travel lift sling placement`, `boat hoist sling load`, `haul out sling position`, `sling spacing hull damage`, `centre of gravity boat lift`.

## 2. The tile

### 2.1 `travel-lift-sling-placement` -- Travel-Lift Sling Placement and Hull Load

```
load split        the sling nearer the centre of gravity carries more
                  P_fwd = W x (distance from aft sling to CG) / (sling spacing)
sling placement   under bulkheads, frames, or engine beds -- never under a shaft, strut,
                  transducer, thruster tunnel, or unsupported panel
spacing           wider is better for stability, subject to landing on structure
sling angle       slings converging from the beams add compression across the hull
lifting points    many production boats have marked or documented sling positions
```

The load split is simple statics and it matters because the slings and the hull are both rated. A boat whose
centre of gravity sits well aft puts a disproportionate share on the aft sling, and both the sling's working load
limit and the hull's ability to take that load locally have to cover it -- so the split, not half the
displacement, is the number to check.

Where the slings land is the part that damages boats. A sling under a shaft, a strut, a folding propeller, a
transducer, or a thruster tunnel destroys the appendage; a sling under an unsupported hull panel between frames
crushes it. The correct positions are under bulkheads, frames, or engine beds, and on many production boats the
builder documents them -- which is worth asking for before the boat is in the air.

The convergence angle is a hull load rather than a sling load. Slings running up to the machine from both sides
squeeze the hull inward, and the narrower the machine relative to the beam the harder they squeeze; spreader bars
are what relieve it on wide or lightly built hulls. A boat that comes out of the slings with sprung joinery has
usually been squeezed rather than dropped.

**Inputs:** displacement, the longitudinal centre of gravity, the forward and aft sling positions, the machine width and sling angle, the builder documented lifting points, and the sling working load limit

**Outputs:** the load carried by each sling, the split as a percentage, each against the sling working load limit, the sling angle and the resulting inward hull load, and the sling positions that equalize the load

## 3. Worked example

A 28,000 lb boat with slings 18 ft apart and the centre of gravity 10 ft aft of the forward sling:

```
aft sling  = 28,000 x 10 / 18 = 15,556 lb
fwd sling  = 28,000 x  8 / 18 = 12,444 lb
split                            = 56% aft, 44% forward
```

**The aft sling carries 3,111 lb more** than the forward one. If both slings are rated for
14,000 lb on the assumption of an even split, the aft one is over its limit and the machine's own capacity
check on half the displacement was the wrong check.

Moving the forward sling aft to equalize is not usually available, because the sling has to land on structure --
which is the constraint that decides everything. If the only usable forward position is where it is, the answer
is slings rated for the actual 15,556 lb, not a repositioning that puts a sling under the shaft.

The convergence: with the machine 14 ft wide and the slings picking up at the hull 12 ft apart at a 70 degree
angle, each sling's horizontal component is `15,556 / tan(70)` = 5,662 lb
squeezing inward on that side of the hull. On a light or cored hull that is the load that does damage, and
spreaders are what remove it.

## 4. Scope and non-goals

A statics calculation for a two-sling lift. It does not evaluate the hull's local capacity to accept the sling
load, which depends on the structure at that station and is a naval architecture question -- the builder's
documented lifting points are the authority and their absence is a reason for caution rather than an invitation
to guess. It does not locate the centre of gravity, which for most vessels is estimated rather than known and
which shifts with fuel, water, and gear aboard. It does not evaluate the travel lift itself, its rated capacity
and load distribution between beams, sling condition and inspection, or the rigging practices that govern the
lift; those are the yard's responsibility and are regulated as material handling. It does not address blocking
and cradling once the boat is out, which is a separate and equally consequential problem. The builder's lifting
instructions, the travel lift manufacturer's ratings, the yard's rigging procedures, and OSHA govern.
