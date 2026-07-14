# roughlogic.com Specification v788 -- Lightning Rolling-Sphere Zone of Protection (calc-elecdesign.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-elecdesign.js`** (Group A),
> no new module, group, or dependency. Inherits spec.md through spec-v787.md. Explore sweep #21 (entry 3).
>
> **The gap, and the evidence for it.** An electrician or lightning-protection installer laying out masts and air
> terminals sizes the shielded zone with the **NFPA 780 rolling-sphere method**, and no tile does it. Roll a sphere of
> radius R (150 ft standard) over the structure -- lightning strikes wherever it touches, so a mast of height h shields a
> ground circle of radius `d = sqrt(2 R h - h^2)`. The number this settles: a **30 ft** mast with the **150 ft** sphere
> protects a **90 ft** radius (`sqrt(9000 - 900) = sqrt(8100) = 90`), about **25,400 ft^2**. Grep confirmed no rolling-
> sphere / lightning-protection tile exists (`lightning-countdown` is the NWS flash-to-bang rule, a different concept).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group A
electrical-design siblings (`ground-potential-rise`, `step-touch-voltage`): the mast height and sphere radius carry `L`,
the protected radius carries `L`, and the protected area carries `L^2`. The v18/v21 contract: a non-finite input (via
`_finiteGuard`), a non-positive mast height, or a non-positive sphere radius returns `{ error }`; a mast at least as tall
as the sphere radius returns the radius capped at R with a `capped: true` flag (a real design condition, not an error).
Citation discipline (v19/v22): the NFPA 780 rolling-sphere method by name, `GOVERNANCE.general` matching the siblings;
the note states that R = 150 ft is the standard protection level (smaller radii for higher levels), that this is a
single-mast estimate (multiple masts protect the overlapping zone, higher than either alone), that a mast taller than R
caps at R with side-flash exposure above, and that the method sizes the zone only -- not the down-conductor, bonding, or
grounding a complete system requires.

## 2. The tile

### 2.1 `rolling-sphere-protection` -- Lightning Rolling-Sphere Zone of Protection

```
inputs:
  mast_height_ft     mast / air-terminal height (ft)
  sphere_radius_ft   rolling-sphere radius (ft, 150 standard)

protected_radius = sqrt(2 x R x h - h^2)   for h <= R
                 = R                        for h >= R  (capped; side-flash flag)
protected_area   = pi x protected_radius^2
```

**Pinned worked example.** Mast 30 ft, sphere 150 ft: `d = sqrt(2 x 150 x 30 - 30^2) = sqrt(9000 - 900) = sqrt(8100) = `
**90 ft**; `area = pi x 90^2 = ` **25,447 ft^2**. A taller mast (up to R) protects more; at h = R the radius equals R;
above R the radius caps at R and the upper mast can still take side flashes.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`) beside `ground-potential-rise` (Group A rows are
spec-interleaved and carry an explicit `group:` field, so the group-shell count stays consistent); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (NFPA 780, `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the pinned
example, two pinned outputs); `test/fixtures/compute-map.js` (`rolling-sphere-protection` ->
`computeRollingSphereProtection`); `scripts/related-tiles.mjs` (-> `grounding-electrode` / `step-touch-voltage` /
`ground-potential-rise`); `data/search/aliases.json` (5 collision-checked aliases: "rolling sphere method", "lightning
mast coverage radius", "nfpa 780 rolling sphere", ...); the calc-elecdesign `ELECDESIGN_RENDERERS` map entry via the
`_simpleRenderer` factory (non-exported, so no DOM-sentinel row) and the id added to the calc-elecdesign declare list in
`app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the example, the h>=R cap, the monotonicity, and the error seams. The
calc-elecdesign.js gzip cap is unchanged (the addition fits under the current cap). Verify at build, including
`check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,236 -> 1,237.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (30 ft mast, 150 ft sphere -> 90 ft radius).

## 5. Roadmap position

Adds the lightning-protection layout calc -- the rolling-sphere zone of protection -- to the electrical-design bench,
beside the grounding and SCCR tiles. Continues Explore sweep #21 (dovetail-over-pins and deck-board-takeoff queued next).
A two-mast overlap-zone tile and a strike-distance-from-current tile are the natural next lightning additions; they stay
evidence-driven.
