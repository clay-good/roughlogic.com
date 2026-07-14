# roughlogic.com Specification v757 -- Septic LPP Squirt Head for a Target Orifice Flow (calc-septic.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-septic.js`** (Group B),
> no new module, group, or dependency. Inherits spec.md through spec-v756.md. Explore sweep #15 (entry 3).
>
> **The gap, and the evidence for it.** The `septic-lpp-orifice` tile runs the orifice-discharge equation forward: from a
> squirt head it returns the per-orifice and system flow. The design question is the inverse -- **the squirt head that
> produces a target per-orifice discharge**, so a designer checks the head lands in the LPP 2.5-5 ft range. From
> `Q = 19.63 Cd d^2 sqrt(h)`, `h = ( Q / (19.63 Cd d^2) )^2`. The number this settles: a **0.25 in** orifice at **Cd 0.6**
> delivering **1.28 gpm** needs about a **3.0 ft** (1.3 psi) squirt head.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`septic-lpp-orifice` sibling: the per-orifice discharge carries the sibling's `L^3` gpm treatment, the orifice diameter
and returned squirt head are `L` (in, ft), the discharge coefficient is dimensionless, and the squirt pressure is
`M L^-1 T^-2` (psi). It reuses the sibling's orifice-discharge equation, solved for the head. The v18/v21 contract: any
non-finite input, a non-positive per-orifice discharge, orifice diameter, or discharge coefficient returns `{ error }`.
Citation discipline (v19/v22): the orifice equation solved for the head, `GOVERNANCE.plumbing` matching the sibling; the
note gives the LPP **2.5-5 ft (1-2 psi)** squirt-head target (and flags whether the result lands there), and stresses this
is the **residual at the orifice** (the pump TDH adds friction, lift, and transport loss) with the permitted onsite design
governing.

## 2. The tile

### 2.1 `septic-lpp-squirt-head` -- Septic LPP Squirt Head for a Target Orifice Flow

```
inputs:
  per_orifice_gpm   L^3           target per-orifice discharge (gpm, > 0)
  orifice_dia_in    L             orifice diameter (in, > 0)
  cd                dimensionless discharge coefficient (> 0; default 0.6)

root       = per_orifice_gpm / (19.63 x cd x orifice_dia_in^2)
squirt_ft  = root^2
squirt_psi = squirt_ft x 0.433
in_lpp_band = 2.5 <= squirt_ft <= 5
```

**Pinned worked example.** Q = 1.275 gpm, d = 0.25 in, Cd = 0.6:
`root = 1.275 / (19.63 x 0.6 x 0.0625) = 1.275 / 0.7361 = 1.732`, `h = 1.732^2 = ` **3.0 ft** (1.30 psi, within the LPP
band). Feeding 3.0 ft back through `septic-lpp-orifice` at the same orifice returns 1.275 gpm per orifice, the target. A
smaller 0.5 gpm target lands at 0.46 ft -- below the LPP band.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing"]`) placed beside `septic-lpp-orifice` (Group B is not exact-count
audited); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (orifice equation solved for the head,
`GOVERNANCE.plumbing` matching the sibling); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`septic-lpp-squirt-head` -> `computeSepticLppSquirtHead`); `scripts/related-tiles.mjs` (->
`septic-lpp-orifice` / `septic-dose-tank` / `pump-tdh`); `data/search/aliases.json` (5 collision-checked question aliases:
"squirt head", "residual pressure lpp", ...); the calc-septic `SEPTIC_RENDERERS` map entry via a hand-written renderer
(three number fields) and the id added to the calc-septic declare list in `app.js`; the `// dims:` annotation directly
above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the
example, the round-trip through `computeSepticLppOrifice` across a flow/diameter/Cd sweep, the more-flow-more-head (square)
and bigger-orifice-less-head behavior, the LPP-band flag, and the error seams. The calc-septic.js gzip cap (raised to
9500 B in this spec) covers the addition. Verify at build, including `check-shells`. Lazy-loaded, absent from home first
paint. Home tile count 1,205 -> 1,206.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 3.0 ft for a 1.275 gpm
target on a 0.25 in orifice).

## 5. Roadmap position

Pairs the forward orifice tile (`septic-lpp-orifice`, flow from the head) with its inverse (the head for a flow), the two
halves of the LPP orifice-hydraulics question. Continues Explore sweep #15; further Group B septic growth stays
evidence-driven.
