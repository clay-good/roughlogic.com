# roughlogic.com Specification v1107 -- Injector Static Flow at a Different Rail Pressure (calc-mechanic.js, Group K, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-mechanic.js`** (Group K), no new module, group, or dependency. Inherits spec.md through
> spec-v1106.md.
>
> **The gap, and the evidence for it.** A self-declared gap, quoted from `injector-size`'s own note: it
> "does not cover a return-versus-returnless fuel system, **the rail pressure that sets the injector's
> static flow**, or direct injection." That tile returns `{total_lbh, inj_lbh, inj_ccmin}` with no pressure
> term anywhere, and `injector-max-hp` is its inverse. Discovery batch 8 ranked it a survivor.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: unknown system
type, non-positive flow / pressures, a non-finite manifold pressure, or boost that consumes the entire rail
return `{ error }`. **No new constants**: the square-root orifice law is physics, and the cc/min to lb/h
factor of 10.5 is the same one the landed `injector-size` sibling already uses and documents. Renderer:
this module's `_simpleRenderer`.

## 2. The tile

### 2.1 `injector-flow-at-pressure` -- Injector Static Flow at a Different Rail Pressure

```
inputs:  rated_flow_ccmin, rated_pressure_psi (43.5 = 3 bar), rail_pressure_psi,
         manifold_pressure_psig (+ boost, - vacuum), system_type (returnless | return)
compute: returnless -> dP = rail - manifold        the rail is fixed, so boost eats the differential
         return     -> dP = rail                   the regulator tracks manifold; dP is constant
         flow = rated x sqrt(dP / rated_pressure);  lb/h = cc/min / 10.5
outputs: effective_dp_psi, pressure_ratio, flow_factor, flow_ccmin, flow_lbh, rated_lbh,
         pct_change, loses_flow_under_boost, returnless, note
```

**Two things worth knowing, and the tile is built around both.** First, pressure is a **weak lever**: flow
follows the square root, so it takes four times the differential to double the flow, and no amount of fuel
pressure rescues an injector that is simply too small. Second -- the failure this exists to catch -- the
fuel system decides the differential. A return system's manifold-referenced regulator holds it constant, so
boost changes nothing. A returnless system holds the RAIL constant, so the differential is rail minus
manifold and **boost reduces it**: the engine loses fuel exactly when it wants more.

**Worked example (pinned).** A 550 cc/min injector rated at 43.5 psi, on a returnless 43.5 psi rail with 15
psi of boost: differential 28.5 psi, flow **445.2 cc/min (42.4 lb/h) -- 19.1% below its rating**. The
cross-check fixture runs the identical inputs on a return system and the injector holds all 550 cc/min,
which is the whole reason that plumbing exists.

## 3. Scope limits, all stated in the note

STATIC flow only -- full-open capacity, not delivered flow at a given pulse width -- and it says nothing
about injector dead time (latency), which shifts with voltage and pressure and must be corrected in the
tune. Raising rail pressure also slows opening and can push a small injector out of its linear range at
short pulse widths. Gasoline at about 0.72 specific gravity; ethanol blends change the whole fuel budget.
The injector's own flow data and the tuner's measured fueling govern.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `injector-size`. Fuzzer pins the
returnless boost loss, return-system invariance across four manifold pressures including vacuum, the
square-root law both as a general identity across a rail sweep and as the specific
**4x-differential-doubles-the-flow** property, the exact cc/min-to-lb/h factor, that vacuum raises flow on
a returnless system, that raising the rail recovers the boost loss, the exact unity factor at the rating
point, and the boost-consumes-the-rail error.

## 5. One candidate deferred in the same session

`rc-headed-bar-development` (ACI 318-19 §25.4.4) was scoped and **deferred**. The equation's structure is
described in secondary sources but the Table 25.4.4.3 modification factors could not be verified against
the standard, and the one apparent confirmation was a search engine echoing the query's own phrasing back
-- which is not verification. Consistent with the campaign rule, a structural development length will not
ship on recalled coefficients.
