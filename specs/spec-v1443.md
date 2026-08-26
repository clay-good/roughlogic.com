# roughlogic.com Specification v1443 -- Quench Severity, Biot Number, and the Agitation Screen (calc-shop.js, Group G, shop and industrial, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group G, shop and industrial), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Everyone reaches for more agitation when a quench comes out soft, and on a thick section it does almost nothing -- because the heat is not surface-limited, it is conduction-limited. The Biot number built from the Grossmann quench severity and the section radius says which regime a part is in, and therefore whether agitating is worth doing. Nothing in the catalog computes it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive quench severity, section radius, or thermal conductivity, or a heat-transfer coefficient at or below zero, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the Grossmann quench severity H (h divided by twice the thermal conductivity) and the Biot number as the ratio of surface to internal resistance, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `quench-severity` -- Quench Severity, Biot Number, and the Agitation Screen

```
Grossmann H = h / (2 k)          h surface coefficient, k thermal conductivity
Biot number = h r / k = 2 H r    r the section radius

Bi < 0.5   surface-limited: agitation and quenchant choice dominate
Bi > 2     conduction-limited: the section governs; agitation buys little
```

Grossmann's H-value is the standard way of ranking quench severity, and the usual table runs from still oil near
0.25, through agitated oil near 0.4, still water near 1.0, agitated water near 1.5, up to agitated brine above
2.0. What the table does not say is when moving up it helps.

The Biot number answers that. It is the ratio of the internal conduction resistance to the surface transfer
resistance. When it is small, the surface is the bottleneck -- heat cannot get *off* the part fast enough, and
anything that improves the surface condition (a more severe quenchant, more agitation, better fixturing so the
vapor blanket breaks) directly improves the cooling rate. When it is large, the surface is already removing heat
faster than the interior can supply it, the center cools at a rate set by the steel's own conductivity, and a more
severe quench changes the surface and does essentially nothing at the core -- while adding distortion and quench
cracking risk, which scale with the *thermal gradient* the severe quench creates.

That is the practical result: on a thick section, going from oil to brine gets you a harder skin, more distortion,
a higher crack risk, and a core that is exactly as soft as it was. The answer there is a more hardenable alloy,
not a more violent quench.

**Inputs:** quench severity H (or a surface coefficient and conductivity directly), section radius or diameter,
steel thermal conductivity, and a second H value to compare.

**Outputs:** Biot number, the regime it falls in, the equivalent surface coefficient, and the change in Biot
number a second quenchant would produce.

## 3. Worked example

Compare a thin and a thick section across quenchants.

```
1 in diameter bar (r = 0.5 in):
   still oil,     H = 0.25  ->  Bi = 2 x 0.25 x 0.5 = 0.25   surface-limited
   agitated oil,  H = 0.40  ->  Bi = 0.40                    still surface-limited
   the move from still to agitated oil raises the cooling rate by roughly the H ratio, 1.6x

6 in diameter bar (r = 3.0 in):
   still water,   H = 1.0   ->  Bi = 2 x 1.0 x 3.0 = 6.0     conduction-limited
   agitated brine,H = 2.0   ->  Bi = 12.0                    more conduction-limited
   doubling the severity barely moves the centre cooling rate; it doubles the gradient
```

On the one-inch bar the quenchant is the whole story. On the six-inch bar the quenchant is nearly irrelevant at
the center and is actively harmful at the surface. Those two sentences are the reason large sections are made from
deep-hardening alloys and small ones are not.

## 4. Scope and non-goals

**A screen, not a hardness prediction.** It tells you which resistance governs; it does not tell you what hardness
the part will reach, which requires the steel's hardenability -- its Jominy curve or ideal critical diameter -- and
its continuous-cooling transformation behavior, neither of which this tile contains. Grossmann H-values are
approximate and heavily dependent on the actual agitation, the bath temperature, the quenchant's condition and
contamination, part orientation, and rack density; published values are typical, not measured. The tile ignores
the vapor-blanket, boiling, and convection stages of a real quench, which have very different heat-transfer
coefficients and none of which is a single `h`. It says nothing about distortion or quench cracking beyond noting
that severe quenches cause both. ASM references, the steel supplier's data, and a qualified heat treater govern.
