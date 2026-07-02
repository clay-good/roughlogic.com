# roughlogic.com Specification v273 -- Wood Shear Wall Unit Shear and Holdown Overturning (SDPWS / ASD) (calc-lateral.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02). Batch spec-v272..v274 (the SDPWS wood lateral-force-resisting-system trio -- diaphragm
> (v272), shear wall (this spec), deflection (v274)). This spec is the middle of the load path: the diaphragm reaction the
> v272 tile computes lands on a shear wall, and this tile resolves the two numbers that wall is detailed for -- the unit
> shear along its length and the holdown tension at its end.)**
> In-scope catalog expansion under the spec-v106 trades-only charter: carpentry is the catalog's largest trade, and the
> catalog now distributes lateral force into a wood diaphragm (`diaphragm-shear`, v272) but nothing resolves the shear wall
> that force lands on -- the unit shear the sheathing and nailing carry, and the uplift the holdown at the wall end must
> resist once the wall wants to overturn. Adds one tile to the **`calc-lateral.js`** Group E cluster (opened by v272); no
> new group, trade, or dependency. Inherits spec.md through spec-v272.md.
>
> **The gap, and the evidence for it.** A shear wall of length `b` takes the story shear `V` delivered to it and carries it
> as a unit shear `v = V / b` (plf) in the sheathing, the number checked against the SDPWS nailing schedule. But the same
> shear, acting at the wall height `h`, also tries to overturn the wall about its far bottom corner with a moment
> `Mot = V h`, and only the wall's own gravity resists it. Under the ASD seismic load combination the stabilizing dead load
> is taken at `0.6D`, so the net uplift the end holdown must anchor is `T = (V h - 0.6 W b / 2) / b`, where `W` is the dead
> load tributary to the wall acting at its center. For an `8 ft` wall taking `8 kip` of story shear at a `10 ft` height with
> `3,000 lb` of tributary dead load, `v = 1,000 plf` and the holdown sees about `9,100 lb` of tension -- the two numbers a
> carpenter needs to pick the panel nailing and the Simpson holdown at the same wall, and ones that no one wants to net out
> of an overturning couple by hand. `diaphragm-shear` hands down the shear; this tile turns it into the wall's unit shear
> and its holdown demand.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The story shear `V` and the
tributary dead load `W` are forces (lb); the wall length `b` and the wall height `h` are lengths (ft); the overturning
moment `Mot` and the resisting moment `Mr` are moments (lb-ft); the unit shear `v` is a force per length (plf); the holdown
tension `T` is a force (lb, reported alongside in kip). The v18/v21 contract: any non-finite input, a story shear or dead
load below zero, or a wall length or height at or below zero, returns `{ error }`; when the `0.6D` resisting moment equals
or exceeds the overturning moment the net uplift is non-positive, so the tile clamps `T` to zero and returns a note that
no holdown is required for overturning (the sill anchorage and shear transfer still govern). Citation discipline (v19/v22):
`GOVERNANCE.general` over the shear-wall unit-shear and rigid-body overturning relations by name; `editionNote` names **the
AWC SDPWS segmented shear-wall model with the ASCE 7 / IBC allowable-stress overturning check -- unit shear `v = V / b`,
overturning moment `Mot = V h` resisted by `0.6` times the dead-load moment `W (b/2)` per the `0.6D + 0.7E` ASD load
combination, net holdown tension `T = (V h - 0.6 W b / 2) / b`, as compiled in the AWC/APA wood-frame shear-wall design
guides**, defaults the dead load `W` to **0 (a conservative no-gravity-resistance holdown demand)**, and states that **this
returns the service-level unit shear and the net holdown uplift of a single fully sheathed shear-wall segment -- it uses the
`0.6D` resisting dead load of the ASD seismic combination (use the wind combination's factor where wind governs), takes `W`
as the dead load tributary to and acting on the wall (not the whole floor), assumes a segmented (not force-transfer-around-
openings or perforated) wall, and does not add the sheathing self-weight-to-nailing or the compression-chord bearing check;
the unit shear is compared against the SDPWS nominal capacity for the chosen sheathing and nailing; and this is a design
aid, not a substitute for the engineer of record's stamped lateral design** -- the structural engineer of record's stamped
design governs.

## 2. The tile

### 2.1 `shearwall-overturning` -- Wood Shear Wall Unit Shear and Holdown Overturning (SDPWS / ASD)

```
inputs:
  V_lb    lb    story shear delivered to the wall (from the diaphragm)
  b_ft    ft    shear-wall length
  h_ft    ft    shear-wall height
  W_lb    lb    dead load tributary to the wall, acting at its center (default 0)

v_plf  = V_lb / b_ft                          ; unit shear along the wall, plf
Mot    = V_lb * h_ft                          ; overturning moment about the far bottom corner, lb-ft
Mr     = 0.6 * W_lb * (b_ft / 2)              ; 0.6D resisting moment, lb-ft (ASD seismic combo)
T_raw  = (Mot - Mr) / b_ft                    ; net uplift at the holdown, lb
T_lb   = max(T_raw, 0)                        ; clamp: no holdown needed if dead load stabilizes
T_kip  = T_lb / 1000
holdown_required = (T_raw > 0)
```

**Pinned worked example (an 8 ft wall, 8 kip story shear, 10 ft tall, 3,000 lb tributary dead load).** `V = 8,000 lb`,
`b = 8 ft`, `h = 10 ft`, `W = 3,000 lb`: `v = 8,000 / 8 = 1,000 plf` (inside a 15/32 in sheathing schedule with 4 in edge
nailing). Overturning `Mot = 8,000 x 10 = 80,000 lb-ft`; resisting `Mr = 0.6 x 3,000 x 4 = 7,200 lb-ft`; net uplift
`T = (80,000 - 7,200) / 8 = 72,800 / 8 = ` **9,100 lb (9.1 kip)** at the end holdown -- a mid-size holdown, and the number
the anchor and the tension chord are sized for. **Cross-check (heavy the wall up to W = 20,000 lb).** Hold the shear and
geometry and raise the tributary dead load: `Mr = 0.6 x 20,000 x 4 = 48,000 lb-ft`; `T = (80,000 - 48,000) / 8 = 4,000 lb
(4.0 kip)` -- gravity now offsets most of the overturning, the reason a heavily loaded wall needs a smaller holdown.
**Seam (dead load overcomes overturning).** Push `W` to `34,000 lb`: `Mr = 0.6 x 34,000 x 4 = 81,600 lb-ft > 80,000`, so
`T_raw < 0`, the tile clamps `T = 0` and flags `holdown_required = false` -- the branch the fuzzer pins so a stabilized
wall never reports a negative holdown. The non-finite, `V_lb < 0`, `W_lb < 0`, `b_ft <= 0`, and `h_ft <= 0` error paths
bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["carpentry","construction"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the shear-wall unit-shear and overturning relations, `editionNote` naming `v = V/b`,
`Mot = V h`, the `0.6D` resisting moment, `T = (V h - 0.6 W b/2)/b`, the AWC/APA shear-wall compilation, and the
ASD-seismic-combo, tributary-dead-load, segmented-wall, and design-aid caveats); `test/fixtures/worked-examples.json` (the
3,000 lb example + the 20,000 lb cross-check); `test/fixtures/compute-map.js` (`shearwall-overturning` ->
`computeShearwallOverturning` in `../../calc-lateral.js`); `scripts/related-tiles.mjs` (-> `diaphragm-shear` /
`shearwall-deflection` / `seismic-base-shear` / `deck-ledger-fasteners`); `data/search/aliases.json` ("shear wall unit
shear", "holdown force", "shear wall overturning", "wall uplift", "tie down force", "SDPWS shear wall", "how big a holdown
do I need", "wall dead load resisting overturning", "segmented shear wall"); the id appended to the
`LATERAL_RENDERERS["shearwall-overturning"]=` block at the file end of `app.js`'s lateral bundle; the `// dims:` annotation
(`V_lb`/`W_lb` force, `b_ft`/`h_ft` length, `v` force/length, `T` force); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the `Mot`/`Mr` intermediates, the clamp-to-zero
`holdown_required = false` seam, and the four error paths. Bump the `calc-lateral.js` size in the `check:module-sizes`
allowlist if the gate flags it (dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the four error paths, the clamp-and-flag assertions); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `v` / `Mot` / `Mr` / `T` stack wraps
on a phone); render-no-nan + a11y sweep, output read to the value (8 ft wall, 8 kip shear, 3,000 lb dead -> 1,000 plf,
9.1 kip holdown).

## 5. Roadmap position

The middle member of the SDPWS wood lateral batch (v272..v274): the diaphragm distribution was v272, this is the shear wall
the diaphragm reaction lands on, and the drift that wall deflects is v274. It is the wood limit state the `seismic-base-shear`
demand ultimately resolves into at the wall. A force-transfer-around-openings (perforated) shear-wall form, a compression-
chord bearing / stud-pack check, and an anchor-bolt sill-shear companion are the deliberate next follow-ons once the trio
lands; with the batch complete the wood lateral cluster stands beside the NDS-member, steel-member, reinforced-concrete,
masonry, and geotechnical clusters in Group E.
