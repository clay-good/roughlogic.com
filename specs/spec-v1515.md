# roughlogic.com Specification v1515 -- Dust Collector Air-to-Cloth Ratio and Bag Count (`calc-mining.js`, Group E Carpentry and Construction, industrial ventilation, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mining.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; mining, quarry, and drill-and-blast), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Air-to-cloth ratio is the one number that says whether a baghouse will work or blind, and it is a division a maintenance person can do at the unit: airflow over cloth area. Too high and the bags plug, differential pressure climbs, and the hoods stop capturing.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive airflow, bag count, bag diameter, or bag length returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the air-to-cloth ratio convention with ACGIH Industrial Ventilation and NFPA 652 named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`air to cloth ratio`, `baghouse filtration velocity`, `dust collector cloth area`, `can velocity baghouse`, `bag blinding ratio`.

## 2. The tile

### 2.1 `dust-collector-air-to-cloth` -- Dust Collector Air-to-Cloth Ratio and Bag Count

```
cloth area        A = n_bags x pi x d_bag x L_bag        (round bags, feet)
air-to-cloth      A/C = CFM / A          (ft/min, also called filtration velocity)
typical ranges    shaker 2 to 3, reverse-air 1.5 to 2.5, pulse-jet 3 to 5 (to 8 on
                  free-flowing dust with good cleaning)
cartridge         much lower, 0.5 to 1.5, because of pleat effects
```

The ratio is a velocity: how fast air is being pushed through the fabric. Push too fast and the dust cake is
driven into the weave instead of sitting on it, the cleaning pulse can no longer release it, and the collector
blinds permanently -- a failure that shows up as rising differential pressure over weeks and is not recoverable by
cleaning. Push slowly enough and the cake stays on the surface where it belongs and does most of the filtering.

Two things make this a field tile rather than a design one. First, a plant that adds a hood or a pickup point to
an existing collector raises the airflow without raising the cloth area, and the ratio silently moves outside
range; computing it after the change is a thirty-second check that predicts a failure months in advance. Second,
bags out of service change the denominator directly -- a collector running with twenty bags plugged or blanked off
is running at a ratio 10% higher than its design, and that is often exactly why the remaining bags are failing
too.

**Inputs:** system airflow, bag count, bag diameter and length (or the published cloth area), the cleaning type, and the number of bags out of service

**Outputs:** the cloth area, the air-to-cloth ratio, whether it falls inside the typical range for the cleaning type, the ratio with a stated number of bags out of service, and the maximum airflow the collector supports at the range limit

## 3. Worked example

A pulse-jet collector with 200 bags, 6 in diameter by 8 ft long, on a 12,000 cfm system:

```
cloth area = 200 x pi x (6/12) x 8 = 2,513 sq ft
A/C        = 12,000 / 2,513              = 4.77 ft/min
```

4.77 is comfortable for pulse-jet cleaning. Now add a hood: raise airflow to 16,000 cfm and the ratio becomes
6.37 -- still inside the pulse-jet range but at the top of it, and on an abrasive or fine dust that is
where blinding starts.

The out-of-service check: with 30 bags blanked off, cloth area falls to
2,136 sq ft and the ratio at the original 12,000 cfm rises to
5.62. Every remaining bag is working 18%
harder, which is why bag failures cascade once they start.

## 4. Scope and non-goals

The air-to-cloth ratio and a range check. The typical ranges are broad conventions; the correct ratio for a
specific dust depends on particle size, shape, cohesiveness, moisture, temperature, and loading, and a fine
cohesive dust may need a ratio well below the generic range for its cleaning type. The tile does not select fabric
or media treatment, size the cleaning system, evaluate can velocity (the upward velocity between bags, which
independently causes re-entrainment on tall collectors), size the hopper and discharge, or address the interstitial
and inlet velocities that cause bag abrasion. It does not evaluate explosion protection, which is
`dust-deflagration-vent-area` and which is mandatory for combustible dust. It does not size hoods or ductwork or
verify capture velocity at the source, which is where dust control actually succeeds or fails. The collector
manufacturer's data, ACGIH Industrial Ventilation, and NFPA 652 where the dust is combustible govern.
