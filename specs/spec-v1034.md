# roughlogic.com Specification v1034 -- Condensate Drain Trap Depth (calc-hvacservice.js, Group C, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-hvacservice.js`** (Group C), no new module, group, or dependency. Inherits spec.md through
> spec-v1033.md.
>
> **The gap, and the evidence for it.** `condensate-drain` returns `{rate_pints_hr, rate_gph, min_size_in,
> fall_in}` and only MENTIONS the trap in prose ("a draw-through coil needs a proper trap"). "Trap depth"
> returns zero alias hits; `trap-seal-loss` is a plumbing DWV tile about siphonage, unrelated to fan static.
> Discovery batch 6 confirmed CLEAR after checking the full `condensate-drain` return set and the whole
> `trap-*` family.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: an unknown
configuration, non-positive static or diameter, or negative insulation return `{ error }`. Dimensions that
do not apply to a configuration are returned as `null` per the v21 guard convention, and the renderer
branches on `draw` so a null is never formatted. Renderer: this module's `_simpleRenderer`.

## 2. The tile

### 2.1 `condensate-trap-depth` -- Condensate Drain Trap Depth from Fan Static

```
inputs:  configuration (draw-through | blow-through), static_pressure_in_wc (WORST case),
         pipe_diameter_in (1.0), insulation_in (0)
compute: DRAW-THROUGH   H = static + 1 in;  J = H / 2;  L = H + J + pipe diameter + insulation
         BLOW-THROUGH   H = static + 0.5 in;  K = 0.5 in minimum
outputs: h_in, j_in, k_in, l_in, draw, note
```

**Source resolution -- this is why the tile is trustworthy.** Two rules circulate in the field and they
disagree: one widely repeated article says the trap depth is DOUBLE the static ("0.5 in w.c. means a 1-in
trap"), another says static PLUS one inch. Rather than pick, the manufacturer engineering bulletin was
retrieved and read (Trane, "Condensate Trapping"), and it dimensions the trap explicitly with named
letters -- draw-through `H = (1 in for each 1 in of maximum negative static) + 1 in`, `J = half of H`,
`L = H + J + pipe diameter + insulation`; blow-through `H = 1/2 in plus maximum total static`,
`K = min 1/2 in`. The doubled-static rule is not the manufacturer geometry, and the tile does not ship it.

**Why L matters and no one publishes it.** The clearance dimension is the one that decides whether the
trap physically fits under the unit. When it does not, the installer improvises -- and both improvisations
fail in opposite directions, which the note states: too SHORT loses the seal at start-up and the unit pulls
air, condensate spray, and drain-line odors back through the pan; too TALL will not drain against the
negative pressure and backs water into the unit.

**Worked example (pinned).** Draw-through, 2.0 in w.c. worst-case static, 1-in drain, 0.5-in insulation:
H = 3.0 in, J = 1.5 in, L = 6.0 in. Blow-through cross-check at 1.5 in w.c.: H = 2.0 in, K = 0.5 in.

## 3. Scope limits

Trap geometry only -- condensate RATE and drain size are the `condensate-drain` sibling. Size H on the
worst-case (dirty-filter) static, which the tile's field label says. Each drain pan must be trapped
separately (ganged pans let the unit at greater negative pressure pull air through the other's drain line,
bypassing both seals); line pitch, sag/air-lock, clean-out, and start-up fill are named in the note but not
computed. The equipment manufacturer's trapping instructions govern.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, backlinked from `condensate-drain`. Fuzzer pins both
configurations, the exact J = H/2 and L identities, the +1 vs +0.5 offsets, the null-dimension contract for
the non-applicable configuration, monotonicity in static, and error seams.
