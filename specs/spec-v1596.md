# roughlogic.com Specification v1596 -- Directional Drill Pullback Force and Pipe Stress (`calc-trenchless.js`, Group E Carpentry and Construction, trenchless, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-trenchless.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; trenchless, hdd, and utility locating), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Pullback force is what decides whether a bore succeeds or the product pipe parts in the hole, and it is a sum of drag terms that grows with length. The rig's rated pull is not the limit that matters -- the pipe's safe pull is, and on long HDPE bores the pipe gives first.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive length, pipe weight, or friction coefficient, or a computed pull exceeding the entered safe pull returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the frictional and capstan drag relations with ASTM F1962 and the pipe manufacturer safe pull named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`hdd pullback force`, `directional drill pull calculation`, `hdpe safe pull`, `bore drag force`, `capstan effect pullback`.

## 2. The tile

### 2.1 `hdd-pullback-force` -- Directional Drill Pullback Force and Pipe Stress

```
frictional drag   F = weight per foot x length x friction coefficient
buoyant weight    a pipe ballasted with water weighs far less in the hole than in air
capstan effect    each curve multiplies the tension by e^(mu x angle)
fluidic drag      the drilling fluid's resistance along the annulus
safe pull, HDPE   from the pipe's allowable tensile stress, reduced for duration and temperature
governing         the LOWER of the rig's rated pull and the pipe's safe pull
```

The drag terms compound rather than add in a simple way: friction along the straight sections is multiplied at
every curve by the capstan relation, so a bore with significant curvature can see pullback several times what a
straight bore of the same length would. That is why entry and exit angles and the bend radius
(`hdd-bend-radius`) are pullback decisions, not just geometry.

Ballasting the product pipe with water is the standard mitigation and it is worth a great deal, because an empty
HDPE pipe in a fluid-filled hole is strongly buoyant and its buoyant force presses it against the top of the bore
for its whole length. Filling it brings the net buoyant weight close to zero and the drag with it.

The limit that governs is the pipe. HDPE has a time-dependent allowable stress -- it will take a high load
briefly and a much lower one for hours -- so the safe pull for a pullback lasting a shift is well below any
short-term rating. Exceeding it does not necessarily part the pipe on the spot; it can stretch it, and a pipe
pulled beyond its limit may fail later or fail its pressure test.

**Inputs:** bore length, pipe outside diameter and wall, whether the pipe is ballasted, the friction coefficient, the bore profile angles, the pipe safe pull, and the rig rated pull

**Outputs:** the buoyant weight per foot, the frictional drag along each segment, the capstan multiplication at each bend, the total pullback force, the margin against the pipe safe pull and the rig rated pull, and which of the two governs

## 3. Worked example

A 900 ft bore pulling 12 in DR 11 HDPE, buoyant weight 12.5 lb/ft ballasted, friction coefficient 0.3:

```
straight drag = 900 x 12.5 x 0.3 = 3,375 lb
```

Now add the bends. A bore with 12 degrees of total direction change at the entry sag and 10 at the exit
multiplies the tension:

```
capstan factor = e^(0.3 x (12 + 10) deg in radians) = e^(0.1152) = 1.122
pullback ~ 3,375 x 1.122 = 3,787 lb
```

**3,787 lb**, against a 12 in DR 11 HDPE safe pull for a long-duration pull that
is on the order of 40,000 to 50,000 lb depending on temperature and duration. The margin exists but is not
generous, and a rig rated 100,000 lb is not the constraint -- **the pipe is**, which is the point.

Now run it unballasted. An empty HDPE pipe in fluid is buoyant, pressing hard against the bore crown, and the
effective normal force can be several times the ballasted case -- easily doubling the drag and putting the pull
past the pipe's limit on the same bore. Filling the pipe with water costs an hour and saves the job.

## 4. Scope and non-goals

A drag estimate using coefficients the user supplies. Friction coefficients in a real bore vary enormously with
soil, hole condition, fluid quality, and whether the hole has been adequately reamed and cleaned, and a bore that
is not clean can see pullback far above any calculation. It does not model the full profile with segment-by-
segment buoyancy and curvature, which is what pullback software does, and it does not model fluidic drag, which
on a tight annulus is significant. It does not evaluate the pipe's combined tensile and bending stress in the
curves, which for a stiff pipe can govern before straight tension does, or the external collapse pressure the
pipe sees. HDPE safe pull is time and temperature dependent and must come from the pipe manufacturer for the
actual pull duration. It does not address the bore itself (`hdd-annular-pressure`, `hdd-bend-radius`). The pipe
manufacturer's safe pull data, ASTM F1962 for HDD design, and the drilling contractor's engineer govern.
