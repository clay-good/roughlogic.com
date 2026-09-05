# roughlogic.com Specification v1672 -- Quench Severity and Jominy Hardenability Depth (`calc-inspection.js`, Group E Carpentry and Construction, metallurgy, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-inspection.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; heat treatment and metallurgy), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Two identical parts quenched in different media come out with different hardness at their centres, and the bridge between the quench and the result is severity. Jominy data plus a severity factor says whether a given steel will actually harden through in the section being made.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive section diameter or severity factor, or a Jominy distance outside the curve data returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the Jominy hardenability method and quench severity convention with the applicable heat treatment specification named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`quench severity h factor`, `jominy hardenability distance`, `hardenability versus hardness`, `oil versus water quench`, `core hardness thick section`.

## 2. The tile

### 2.1 `jominy-quench-severity` -- Quench Severity and Jominy Hardenability Depth

```
quench severity H  a relative measure: still oil about 0.3, agitated oil 0.5,
                   still water 1.0, agitated water 1.5, brine 2.0 to 5.0
equivalent Jominy  a bar of diameter D quenched at severity H corresponds to a
                   Jominy distance; higher H and smaller D give a shorter distance
Jominy curve       hardness versus distance from the quenched end, from the steel's own data
hardenability      how far from the surface the steel can harden; a material property
                   distinct from how hard it can get, which is a carbon property
consequence        a low-hardenability steel in a thick section is soft at the core
                   regardless of the quench
```

Hardenability and hardness are different properties and confusing them is the classic error. Maximum hardness is
set almost entirely by carbon content -- a 0.40% carbon steel will not exceed a certain hardness however it is
quenched. Hardenability is set by the alloying elements and determines how DEEP that hardness extends. So a
plain carbon steel and an alloy steel of the same carbon content reach the same surface hardness and behave
completely differently at the core of a thick section.

The Jominy test measures hardenability directly: one end of a standard bar is quenched and the hardness is
traversed along its length, so distance from the quenched end is a proxy for cooling rate. Correlating a real
part to a Jominy distance requires the section size and the quench severity, and that correlation is what says
whether the core of the actual part will make hardness.

Severity is where the shop has leverage. Moving from still oil to agitated oil, or from oil to water, moves the
equivalent Jominy distance substantially and can make a section harden through that would not otherwise -- at the
cost of distortion and quench cracking risk, which rise with severity. That is the trade, and it is why a part
that cracks in water may be specified in oil with a more hardenable steel instead.

**Inputs:** section diameter, the quench medium and its severity factor, the steel grade and its Jominy curve data, the required core hardness, and the location in the section being evaluated

**Outputs:** the equivalent Jominy distance for the entered section and severity, the hardness at that distance from the entered curve, the hardness against the requirement, the severity needed to make the required hardness, and the section size that the steel hardens through at the entered severity

## 3. Worked example

A 2 in diameter bar quenched in still oil (H = 0.3) versus agitated water (H = 1.5).

The equivalent Jominy distance at the CENTRE of the bar is much further along the Jominy bar for the mild quench
than for the severe one -- so the still-oil part sees a slower cooling rate at its core and lands lower on the
Jominy curve.

```
still oil,      2 in bar, centre -> a long equivalent Jominy distance -> lower hardness
agitated water, 2 in bar, centre -> a much shorter distance          -> higher hardness
```

**Whether that matters depends on the steel.** A 4140 with good hardenability may still make the required core
hardness in oil; a 1045 of the same carbon content will not, because its Jominy curve falls away quickly with
distance.

The distinction worth carrying: both steels reach nearly the same SURFACE hardness, because that is carbon. The
4140 holds it inward and the 1045 does not, because that is alloy. A shop substituting 1045 for 4140 on a thick
section because "the carbon is the same" produces a part that tests correctly at the surface and is soft where
the load is.

The severity lever and its cost: moving from oil to water on the 1045 may make the core hardness -- and roughly
triples the distortion and the quench cracking risk on a part with section changes or sharp corners. On many
parts that is not an acceptable trade and the answer is a more hardenable steel.

## 4. Scope and non-goals

A screening correlation using Jominy data and severity factors the user supplies. Quench severity factors are
approximate relative values that depend heavily on agitation, bath temperature, part loading and racking, and
fixture design -- a nominally identical quench in two shops is not the same quench, and severity should be
characterized on the actual process rather than taken from a table. Jominy curves are steel and heat specific and
come from the material certificate or the producer's data; hardenability bands (H-steels) exist precisely because
heat-to-heat variation is significant. It does not predict distortion, quench cracking, or residual stress, which
are the practical constraints on increasing severity and which depend on geometry as much as on the medium. It
does not address tempering (`tempering-for-hardness`), which follows the quench and determines the final
properties. The material specification and certificate, the applicable heat treatment specification, and the heat
treater's qualified process govern.
