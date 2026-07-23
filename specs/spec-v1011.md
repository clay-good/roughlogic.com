# roughlogic.com Specification v1011 -- Circular Pipe Partial-Flow Depth and Velocity (calc-plumbing.js, Group B, 1 New Tile)

> **Status: LANDED (2026-07-23). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-plumbing.js`** (Group B),
> no new module, group, or dependency. Inherits spec.md through spec-v1010.md. Beside `manning-pipe-capacity`,
> `manning-slope`, and `channel-normal-depth`.
>
> **The gap, and the evidence for it.** The catalog declares this gap in FOUR places, one of them in the user-facing
> catalog data: `manning-pipe-capacity`'s note says it "does not compute the partial-flow depth, and a circular pipe
> actually carries a few percent more than full-bore at about 0.94 depth (the partial-flow curves are separate)"; its
> citation says "The partial-flow depth is separate"; `tools-data.js` repeats it; and `channel-normal-depth`'s note
> says it "does not compute ... the partial-flow depth of a closed conduit". Alias-index (0 hits across seven probes),
> compute-map, and nearest-sibling-output checks confirmed no coverage: `computeManningSlope` hard-codes R = D/4 and
> returns no depth, `computeManningPipeCapacity` is full-bore, `computeChannelNormalDepth` is rectangular. The number
> this settles: an 8 in concrete pipe at 1% carrying 200 gpm runs **3.36 in deep**, not full.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `// dims:` annotation above the compute), worked-example registry, bounds-fuzzer, and
reviewer-signoff apply. The v18/v21 contract: a non-finite input, a non-positive diameter, slope, or flow, or an
unknown material returns `{ error }`; a flow above the pipe's maximum gravity capacity returns an `{ error }` that
NAMES the ceiling in gpm rather than a bogus depth. Input names and the `MANNING_ROUGHNESS` table are shared with the
sibling tiles so the family reads as one. Citation discipline (v19/v22): Manning applied to circular-segment geometry
as compiled in ASCE/WEF MOP FD-5 and Chow, by name, `GOVERNANCE.general`; the note discloses the constant-n
simplification against Camp's variable-n curves.

## 2. The tile

### 2.1 `pipe-partial-flow-depth` -- Circular Pipe Partial-Flow Depth and Velocity (Manning)

```
inputs:
  d_in       pipe diameter (in)
  slope      pipe slope S (ft/ft)
  flow_gpm   flow Q (gpm)
  material   MANNING_ROUGHNESS key (pvc 0.009 ... corrugated_metal 0.024)

A(theta)   = (D^2/8)(theta - sin theta)        [circular segment]
P(theta)   = D theta / 2
R          = A / P
y(theta)   = (D/2)(1 - cos(theta/2))
solve  (1.486/n) A R^(2/3) sqrt(S) = Q  for theta, by bisection on (0, THETA_MAX_Q]
V          = Q / A
tau        = 62.4 R S                          [boundary/tractive shear, lb/ft^2]
self-cleansing when V >= 2 ft/s
```

**The correctness trap this tile exists to get right.** Discharge is **not monotonic** with depth. Maximizing
`A R^(2/3) = A^(5/3) P^(-2/3)` gives `5 A' P = 2 A P'`, i.e. `3 theta - 5 theta cos theta + 2 sin theta = 0`, whose
root `theta = 5.27811` is **d/D = 0.93818** -- where Q is **7.571% ABOVE full-bore**, falling back to the full value at
the crown. Maximizing `R = A/P` gives `A' P = A P'`, i.e. `tan theta = theta`, root `theta = 4.49341`, **d/D = 0.81280**
for maximum velocity. Both are computed from these equations at module load, **not read off a chart**. Because two
depths satisfy most flows, the solver is restricted to the rising branch and returns the smaller (physical) root. The
sibling `channel-normal-depth` bisects over the full range, which is valid for a rectangle but would be WRONG here.

**Pinned worked example.** 8 in concrete (n = 0.013), S = 0.01, Q = 200 gpm: depth **3.36 in**, `d/D` **0.420**,
V **3.20 ft/s** (self-cleansing), boundary shear **0.0924 lb/ft^2**, against a full-bore capacity of **542 gpm** and a
maximum of **583 gpm**. The 542 gpm reproduces the value `manning-pipe-capacity` already pins for the same pipe.
Cross-check: feeding the full-bore flow back in returns `d/D` **0.820** -- the smaller root, proving the branch guard.
Independent proof: substituting the solved `theta` back into Manning returns **200.000 gpm**.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing", "civil"]`, beside `manning-pipe-capacity`); a `tile-meta.js`
`_TILES` entry (`B`); a `citations.js` entry (four assumptions, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the derived-turning-points cross-check);
`test/fixtures/compute-map.js` (`pipe-partial-flow-depth` -> `computePipePartialFlowDepth`);
`scripts/related-tiles.mjs` (-> `manning-pipe-capacity` / `manning-slope` / `channel-normal-depth` /
`channel-froude-number`); `data/search/aliases.json` (6 collision-checked search aliases plus 4 question-corpus
phrases), then `node scripts/build-alias-shards.mjs`; a hand-written renderer registered in `PLUMBING_RENDERERS`
(the module's convention -- it has no `_simpleRenderer` factory), taking care that `makeSelect` returns `.select`
and not `.input`; the id added to the calc-plumbing declare list in `app.js`; the `// dims:` annotation directly above
the compute; a `bounds-fuzzer.test.js` block pinning both examples, the derived turning points, the
Q_max/Q_full = 1.07571 ratio, the **non-monotonic branch guard**, the solver's own round-trip proof, the shear
relation, and the error seams; regenerated v14 corpus + tile-index + citation-strings. Home tile count 1,459 -> 1,460.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
worked-examples runner; render + output read to the value (8 in concrete, 1%, 200 gpm -> 3.36 in, d/D 0.420,
3.20 ft/s).

## 5. Roadmap position

Completes the Manning gravity-flow family: full-bore capacity, required slope, rectangular normal depth, and now the
part-full depth of a closed conduit that gravity-sewer design actually turns on. Serves the plumber and the civil/site
designer. Deliberately the uniform-flow screen; surcharged and pressurized flow, backwater profiles, non-circular
conduits, and Camp's variable-n correction stay separate. Fourth tile in a row landed by reading an existing tile's
self-declared limitations -- see spec-v1008 through spec-v1010.
