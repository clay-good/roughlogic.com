# roughlogic.com Specification v1522 -- Tunnel and Heading Blast Fume Clearance Time (`calc-mining.js`, Group E Carpentry and Construction, underground, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mining.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; mining, quarry, and drill-and-blast), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** After a round is shot, the heading is full of carbon monoxide and nitrogen oxides, and re-entry waits on ventilation. The clearance time is an exponential dilution, which means waiting twice as long does not halve the concentration -- and guessing at it is how people walk into a heading too early.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive heading volume, airflow, or target concentration, or a target concentration at or above the starting concentration returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the exponential dilution relation with MSHA and the mine ventilation plan named as governing re-entry, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`blast fume clearance time`, `re-entry time after blasting`, `heading dilution time`, `air changes to clear fumes`, `carbon monoxide clearance underground`.

## 2. The tile

### 2.1 `blast-fume-clearance-time` -- Tunnel and Heading Blast Fume Clearance Time

```
dilution      C(t) = C_0 x exp( -Q t / V )
time to a target  t = (V / Q) x ln( C_0 / C_target )
air changes   one air change = V / Q; each change cuts concentration to 37%
practical     4.6 air changes reaches 1% of the original concentration
```

Perfect-mixing dilution decays exponentially, so each air change removes the same FRACTION rather than the same
amount. One change takes the heading to 37% of the starting concentration, three changes to 5%, and 4.6 changes
to 1%. That is the shape that makes intuition fail: the first minute does most of the work and the last decade of
concentration takes as long as everything before it.

Two field cautions belong with the number. Real headings do not mix perfectly -- dead corners, the muck pile, and
a tubing end set too far back all leave pockets that clear far more slowly than the average, which is why the
regulation-required practice is to TEST the atmosphere with an instrument before re-entry rather than to trust a
clock. And fumes continue to be released from the muck pile and from any misfire long after the shot, so a
heading that tests clean at the portal can still be unsafe at the face. The calculation sets the minimum wait; the
gas detector sets the actual one.

**Inputs:** heading volume, delivered airflow at the face, the initial and target concentration (or the number of air changes required), and the required re-entry criterion

**Outputs:** the air change time, the number of air changes to reach the target, the total clearance time, the concentration remaining after a stated wait, and the airflow required to clear within a target time

## 3. Worked example

A heading of 48,000 cu ft with 17,500 cfm delivered at the face, clearing to 1% of the post-blast
concentration:

```
one air change = 48,000 / 17,500     = 2.74 minutes
changes to 1%  = ln(100)         = 4.61
clearance time = 2.74 x 4.61  = 12.6 minutes
```

About 13 minutes as a minimum. Watch the exponential shape: after one air change (2.7 min) the heading is
still at 37% of the blast concentration, and after two (5.5 min) it is at 14%. A crew re-entering at ten
minutes on the belief that "most of it clears fast" would be walking into roughly
3% of the original fume load.

If the tubing were repaired to deliver 22,500 cfm instead of 17,500, clearance falls to
9.8 minutes -- 3 minutes saved on every round, every day.

## 4. Scope and non-goals

A perfect-mixing dilution estimate. Real headings mix imperfectly and clear unevenly, and dead zones, the muck
pile, and a poorly positioned tubing end all hold fumes far longer than the average implies. Continued fume
generation from the muck and from any misfire is not modeled and is a real hazard after the calculated time has
elapsed. The tile does not determine the applicable re-entry criterion, which is set by regulation and by the
mine's own ventilation plan, and it does not substitute for atmospheric testing with a calibrated instrument
before re-entry -- which is the actual requirement and the only thing that establishes a heading is safe. It does
not address misfire procedures or the separate waiting periods those require. The mine ventilation plan, the
blaster in charge, and MSHA govern.
