# roughlogic.com Specification v639 -- Orifice Diameter for a Target Flow (calc-plumbing.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-plumbing.js`**
> (Group B, plumbing/civil), no new module, group, or dependency. Inherits spec.md through spec-v638.md.
>
> **The gap, and the evidence for it.** Spec-v303 (`orifice-flow`) computes the steady discharge `Q = Cd A
> sqrt(2 g h)` in the forward direction: given a diameter and head, what flow. But the question a detention-pond
> or restrictor-plate designer actually starts with is the release rate the drainage code allows, and they need
> the diameter that delivers it -- the inverse. The existing search corpus already carries the intent
> ("size an orifice to release a set cfs"), but it routed to the forward tile, which cannot solve for the
> diameter. Solving the same orifice equation for the area, `A = Q / (Cd sqrt(2 g h))`, then `d = sqrt(4 A / pi)`,
> closes the pair with pure algebra -- no new constant. The number that catches people out: because the flow
> scales with the square root of the head, the required *area* scales as `1/sqrt(h)`, so quadrupling the head
> shrinks the orifice diameter to only **0.71x**, not 0.5x.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The target discharge
is `L^3 T^-1`, the head is `L`, the discharge coefficient is `dimensionless`, the orifice area is `L^2`, and the
orifice diameter is `L`. The gravitational constant `g = 32.2 ft/s^2` is universal and `Cd` is the same
user-entered hydraulic coefficient the `orifice-flow` sibling already takes (~0.6 sharp-edged). The v18/v21
contract: any non-finite input, or a non-positive discharge, head, or discharge coefficient, returns `{ error }`.
Citation discipline (v19/v22): the orifice equation solved for the diameter, the inverse of `orifice-flow`, by
name; the note states that **this sizes a small orifice under a steady head measured to the centroid, the required
area scales as 1/sqrt(h), and it does not integrate the falling head of a draining tank (the time-to-drain is
separate)** -- a design aid, not a substitute for the engineer of record.

## 2. The tile

### 2.1 `orifice-diameter-for-flow` -- The Orifice Diameter That Passes a Target Flow

```
inputs:
  q_cfs   cfs   target discharge (> 0)
  h_ft    ft    head to the orifice center (> 0)
  cd      -     discharge coefficient (~0.6 sharp-edged, > 0)

A = Q / (Cd sqrt(2 g h))            [ft^2]   g = 32.2 ft/s^2
d = 12 sqrt(4 A / pi)               [in]
```

**Pinned worked example (size a release).** Q = 1.5 cfs, h = 4 ft, Cd = 0.60:
`A = 1.5 / (0.60 x sqrt(2 x 32.2 x 4)) = 1.5 / 9.630 = ` **0.1558 ft^2**, so
`d = 12 sqrt(4 x 0.1558 / pi) = ` **5.34 in**.
**Cross-check (exact round-trip against `orifice-flow`).** The `orifice-flow` pinned example (d = 6 in, h = 4 ft,
Cd = 0.60) discharges `1.8908... cfs`. Feeding that discharge back through this tile at the same head and Cd sizes
the orifice to **6.00 in** exactly -- the inverse recovers the forward input.
**Head sensitivity.** Holding Q = 1.5 cfs and Cd = 0.60, raising the head from 4 ft to 16 ft (4x) drops the
diameter from 5.34 in to 3.78 in -- a factor of `(1/4)^(1/4) = 0.7071`, because the flow scales with `sqrt(h)`.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing", "civil"]`, beside `orifice-flow`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (orifice equation solved for the diameter, the note per §1);
`test/fixtures/worked-examples.json` (the pinned example and the round-trip cross-check);
`test/fixtures/compute-map.js` (`orifice-diameter-for-flow` -> `computeOrificeDiameterForFlow` in
`../../calc-plumbing.js`); `scripts/related-tiles.mjs` (-> `orifice-flow` / `tank-drain-time` / `weir-flow` /
`time-of-concentration`, and `orifice-flow` gains the reverse pointer); `data/search/aliases.json` ("orifice
sizing", "size an orifice for a target flow", "restrictor plate sizing", plus question rows, and the existing
"size an orifice to release a set cfs" question is **repointed** from `orifice-flow` to this dedicated tile);
`PLUMBING_RENDERERS["orifice-diameter-for-flow"]` via a hand-written renderer (the module's `makeNumber` /
`makeOutputLine` / `attachExampleButton` / `debounce` / `fmt` helpers, mirroring `orifice-flow`) and the id added
to the calc-plumbing declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated
v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the pinned example, the exact `orifice-flow`
round-trip, the `1/sqrt(h)` area law, and the error seams (non-finite, non-positive discharge / head / Cd). Group B
has no exact audit-count assertion and the mechanical-governance test is an explicit list, so no count bump. The
two `index.html` home-count spots go 1,087 -> 1,088 (check-readme-counts gates them). The calc-plumbing.js gzip cap
is expected to hold (verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> 5.34 in, 0.156 ft^2).

## 5. Roadmap position

Completes the orifice pair spec-v303 opened with `orifice-flow`: the forward steady discharge and now the inverse
diameter sizing, the same `Q = Cd A sqrt(2 g h)` physics solved in the other direction. With `tank-drain-time`
(spec-v630, the falling-head integral), the orifice family now answers all three of "how fast," "how long," and
"how big." Further Group B growth stays evidence-driven.
