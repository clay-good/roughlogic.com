# roughlogic.com Specification v641 -- Rectangular Channel Normal Depth (Manning) (calc-plumbing.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-plumbing.js`**
> (Group B, plumbing/civil), no new module, group, or dependency. Inherits spec.md through spec-v640.md.
>
> **The gap, and the evidence for it.** The `channel-froude-number` tile (spec-v304) classifies an open channel's
> regime and returns the critical depth, and both its note and citation state the boundary in as many words: "it
> does not compute the normal depth (that is Manning)." Normal depth -- the depth at which a prismatic channel
> carries a given discharge in steady uniform flow -- is the other half of the pair. It is what you actually solve
> to know how deep a lined channel or ditch runs on a chosen grade, and comparing it to the critical depth tells
> you whether the reach is mild (subcritical) or steep (supercritical). Manning's `Q = (1.486/n) A R^(2/3) sqrt(S)`
> has no closed form for a rectangular section's depth, but the discharge rises monotonically with depth, so a
> bisection converges trivially -- the same in-file root-find approach `specific-energy` (spec-v637) already uses.
> The pinned example: a 10 ft rectangular channel carrying 200 cfs at n 0.015 on a 0.1% slope runs **3.82 ft deep
> at 5.24 ft/s (Fr 0.47)**, and because that normal depth exceeds the 2.32 ft critical depth the reach is a mild
> slope.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The channel width and
the normal/critical depths are `L`, the discharge is `L^3 T^-1`, the roughness and slope are `dimensionless`, the
velocity is `L T^-1`, and the Froude number is `dimensionless`. The English Manning coefficient `1.486` and
`g = 32.2 ft/s^2` are universal; the roughness `n` is entered directly (open-channel linings span 0.011 smooth
concrete to 0.03+ vegetated earth, so a free number input, not the closed pipe-material list, is the right control).
The v18/v21 contract: any non-finite input, or a non-positive width, discharge, roughness, or slope, returns
`{ error }` (and the bisection returns an error if it fails to bracket, which cannot happen for valid positive
inputs). Citation discipline (v19/v22): the Manning normal-depth solution by name; the note states that **this
solves Manning's equation for the rectangular normal depth by bisection, reports the velocity and Froude number at
that depth, classes the slope against yc = (q^2/g)^(1/3), and does not compute a trapezoidal/irregular section, a
gradually-varied (backwater) profile, or a closed-conduit partial-flow depth** -- a design aid, not a substitute for
the engineer of record.

## 2. The tile

### 2.1 `channel-normal-depth` -- The Manning Normal Depth of a Rectangular Channel

```
inputs:
  b_ft      ft     channel width (> 0)
  q_cfs     cfs    discharge (> 0)
  n         -      Manning roughness (> 0; ~0.013 concrete, ~0.022 earth)
  s_slope   ft/ft  channel bed slope (> 0)

solve for yn:  Q = (1.486/n) A R^(2/3) sqrt(S),  A = b yn,  R = A/(b + 2 yn)   [bisection]
V   = Q / (b yn)                         [ft/s]
Fr  = V / sqrt(g yn)   (g = 32.2)        [-]        regime: Fr <> 1
yc  = (q^2/g)^(1/3),  q = Q/b            [ft]       slope class: yn > yc mild, yn < yc steep
```

**Pinned worked example (a mild-slope channel).** b = 10 ft, Q = 200 cfs, n = 0.015, S = 0.001: the bisection
returns `yn = ` **3.82 ft** (A = 38.2 ft^2), so `V = 200/38.2 = ` **5.24 ft/s** and `Fr = 5.24/sqrt(32.2 x 3.82) = `
**0.47** (subcritical). The critical depth `yc = ((200/10)^2/32.2)^(1/3) = ` **2.32 ft**; because `yn > yc`, the
reach is a **mild slope**.
**Cross-check (round-trip).** Feeding yn = 3.82 ft back through Manning gives Q = 200 cfs (the solver's own
convergence target, verified to 1e-4 in the fuzzer).
**Cross-check (steepen the slope).** Hold the channel and raise the slope to S = 0.004: `yn` shrinks to **2.34 ft**
(Fr ~ 0.99, nearly critical) -- a steeper grade carries the same flow shallower and faster.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing", "civil"]`, beside `channel-froude-number`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (Manning normal depth, Chow, the note per §1);
`test/fixtures/worked-examples.json` (the pinned example plus the steepen-the-slope cross-check);
`test/fixtures/compute-map.js` (`channel-normal-depth` -> `computeChannelNormalDepth` in `../../calc-plumbing.js`);
`scripts/related-tiles.mjs` (<-> `channel-froude-number`, `manning-slope`, `manning-pipe-capacity`,
`specific-energy`); `data/search/aliases.json` ("channel normal depth", "manning normal depth", "uniform flow
depth", "mild or steep slope", plus question rows, all collision-checked); `PLUMBING_RENDERERS["channel-normal-
depth"]` via a hand-written renderer registered inline beside the Froude tile (the module's `makeNumber` /
`makeOutputLine` / `attachExampleButton` / `debounce` / `fmt` helpers) and the id added to the calc-plumbing declare
list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning the pinned example, the algorithm-independent discharge round-trip, the slope
class, the steeper-slope monotonicity, and the error seams (non-finite, non-positive width / discharge / roughness /
slope). Group B has no exact audit-count assertion and the mechanical-governance test is an explicit list, so no
count bump. The two `index.html` home-count spots go 1,089 -> 1,090 (check-readme-counts gates them). The
calc-plumbing.js gzip cap is expected to hold (verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> 3.82 ft, 5.24 ft/s, Fr 0.47, mild slope).

## 5. Roadmap position

Completes the rectangular open-channel set the site-hydraulics batch built: `channel-froude-number` (regime +
critical depth), `specific-energy` (alternate depths), `hydraulic-jump` (sequent depth), and now
`channel-normal-depth` (uniform-flow depth). Trapezoidal/irregular sections and gradually-varied (backwater)
profiles remain deliberately out of scope. Further Group B growth stays evidence-driven.
