# roughlogic.com Specification v1811 -- Pallet Rack Base Plate Anchorage and Overturning (`calc-warehouse.js`, Group E Carpentry and Construction, warehouse racking and material handling, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-warehouse.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A tall rack frame is a narrow structure carrying a lot of weight a long way off the floor, and a lateral force tries to tip it about its front columns. The anchors resist the uplift, and a standard base plate has two holes whether or not two anchors are enough.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive frame weight, depth, height, or anchor capacity, a lateral coefficient outside 0 to 1, or a computed uplift below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the overturning and resisting moment relations with ANSI MH16.1, the applicable building code, and the anchor evaluation report named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`rack base plate anchorage`, `rack overturning uplift anchor`, `seismic rack anchor tension`, `storage rack floor anchor`, `rack base plate hole count`.

## 2. The tile

### 2.1 `rack-base-plate-anchorage` -- Pallet Rack Base Plate Anchorage and Overturning

```
the geometry     a frame is deep front-to-back by the frame depth and tall by the
                 top beam elevation; the ratio is what makes it tip
overturning      M_o = lateral force x the effective height at which it acts
resisting        M_r = frame weight (product plus rack) x half the frame depth
net uplift       (M_o - M_r) / frame depth, taken by the anchors on the uplift side
anchor capacity  the post-installed anchor's allowable tension in the slab
                 thickness and concrete strength actually present -- which is
                 often thinner and weaker than assumed
anchors required net uplift / allowable per anchor, rounded up
the constraint   a standard base plate has two holes; more anchors need a larger
                 plate, and thin slabs need a thicker slab or a different scheme
also             shear at the base, and the slab's own capacity to take an edge or
                 near-joint anchor
```

The proportions are what make rack anchorage a real calculation rather than a formality. A frame is roughly
three and a half feet deep and can be twenty or thirty feet tall, so a lateral force applied high up is
resisted by a very short lever arm at the base. The weight helps -- a loaded rack is heavy and its weight acts
at mid-depth -- but the ratio between the overturning arm and the resisting arm is severe, and the difference
lands on the anchors as tension.

The slab is usually the governing element and it is the one least known. Anchor capacity tables assume a
concrete strength, a slab thickness, and an edge distance, and a warehouse floor is frequently thinner than
the drawings say, cracked, jointed near the rack line, or built over a base course rather than a structural
slab. An anchor's rated capacity in six inches of sound concrete is not its capacity in a four-inch slab with
a control joint eight inches away.

The two-hole base plate is where the arithmetic meets the hardware, and it is a real constraint rather than a
detail. When the calculation calls for more anchor capacity than two ordinary anchors provide, the remedies
are all substantial -- a larger plate with more anchors, a deeper or reinforced slab, a change to the frame
proportions, or bracing to the building structure -- and none of them is a field decision.

**Inputs:** the frame weight including product, the frame depth and top beam elevation, the lateral force coefficient or force, the effective height at which it acts, the allowable anchor tension, and the number of holes in the base plate

**Outputs:** the lateral force, the overturning moment, the resisting moment, the net uplift per column, the anchors required, whether the base plate's hole count provides them, and the anchors required at a higher allowable capacity

## 3. Worked example

A frame 42 in deep and 20 ft to the top beam, carrying 15,000 lb of rack and product, with a lateral
force coefficient of 0.20:

```
lateral force = 0.20 x 15,000 = 3,000 lb at an effective height of 13.3 ft
M_overturning = 3,000 x 13.3 = 40,000 ft-lb
M_resisting   = 15,000 x 3.50/2 = 26,250 ft-lb
net uplift    = (40,000 - 26,250) / 3.50 = 3,929 lb per column
```

**3,929 lb of tension on the anchors at one column.** The frame's own weight resisted 66% of the
overturning and the anchors have to take the rest.

**Now check what the floor will give:**

```
anchors = 3,929 / 1,800 lb allowable = 2.18 -> 3 anchors
base plate holes available = 2
```

**3 anchors required and 2 holes in the plate.** The standard base plate does not solve this frame, and
none of the remedies is a field decision: **a larger plate, a thicker or reinforced slab, a shallower or
shorter frame, or bracing to the building structure.**

**The slab is doing most of the deciding.** With a thicker slab and sound concrete giving 2,800 lb per
anchor:

```
anchors = 3,929 / 2,800 = 2
```

**The same frame, the same load, the same force -- and now two anchors carry it**, because the concrete
changed. **The anchorage calculation is really a question about the floor**, and a warehouse floor is routinely
thinner, weaker, more cracked, and closer to a joint than the rack drawings assumed.

**And the geometry is unforgiving by design.** The resisting arm is 1.75 ft and the overturning arm is
13.3 ft -- **a ratio of 8 to 1.** That is what a tall narrow frame is, and it is why rack anchorage is
engineered rather than assumed.

## 4. Scope and non-goals

A screening calculation. Rack anchorage is designed under ANSI MH16.1 and the applicable building code, and in a seismic region the lateral force comes from the code's seismic provisions for nonbuilding structures with a rack-specific response factor, an importance factor, and a reduced operating weight -- the simple coefficient used here stands in for all of that and is not a design force. Anchor capacity must come from an evaluation report for the specific anchor in the actual slab thickness, concrete strength, cracked or uncracked condition, edge distance, and spacing, and post-installed anchor design under ACI 318 Chapter 17 checks concrete breakout, pullout, side-face blowout, and the anchor steel, any of which may govern below the value used here. It does not check shear at the base, the combined tension and shear interaction, the base plate itself, or the column's connection to it. It does not evaluate the slab, which frequently governs and which may require reinforcement, thickening, or a pier. It takes no position on seismic separation from the building, rack-supported structures, or the special inspection a permitted installation requires. ANSI MH16.1 and the applicable building code, ACI 318 Chapter 17 and the anchor's evaluation report, and the rack design engineer govern.
