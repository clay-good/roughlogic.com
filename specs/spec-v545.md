# roughlogic.com Specification v545 -- Winch Drum Line Pull and Capacity by Layer (calc-rigging.js, Group Z, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-rigging.js`**
> (Group Z, rigging and heavy lift); no new module, group, or dependency. Inherits spec.md through spec-v544.md.
>
> **The gap, and the evidence for it.** The rigging bench has wire-rope and hoist tiles but nothing for a powered winch
> drum, and the number riggers plan wrong is the line pull. A winch's rated pull is a **bare-drum** number, valid only
> for the first wrap. As the rope fills the drum in layers, the effective diameter grows, the moment arm lengthens, and
> the pull falls layer by layer -- the outer wraps can be 30 to 40% weaker than the nameplate, while the line speed
> rises in the same proportion. A rigger who plans a pull at the drum's rated capacity can stall on the top layer. The
> tile takes the bare-drum rated pull and diameter, the rope diameter, the barrel width, and a target layer, and returns
> the mean diameter, the derated pull, and the increased speed at that layer, plus the wraps per layer and the rope
> stored -- the numbers that keep a winch from running out of pull at the wrong wrap.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The bare-drum pull and the
derated pull are forces (`M L T^-2`, in lb); the drum diameter, rope diameter, barrel width, and mean diameter are
lengths (`L`, in inches); the wraps per layer, the layer index, and the speed ratio are `dimensionless`. The v18/v21
contract: any non-finite input, a non-positive rated pull, drum diameter, rope diameter, or barrel width, or a layer
below 1 returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the drum mechanics by name (wire-
rope drum mechanics; SAE winch rating convention); `editionNote` names the **winch drum line-pull by layer**, prints
`Dn = drum_dia + (2n - 1) x rope_dia`, `Pn = rated_pull x drum_dia / Dn`, `Vn = drum_speed x Dn / drum_dia`, and
`wraps_per_layer = barrel_width / rope_dia`, and states that **the rated line pull is a bare-drum figure for the first
wrap and it falls layer by layer as the growing moment arm works against the motor (outer layers can be 30 to 40%
weaker) while the line speed rises in proportion, the rope must also fit the drum capacity, and the winch manufacturer's
layer ratings govern** -- a planning aid, not the winch's certified capacity.

## 2. The tile

### 2.1 `winch-drum-line-pull` -- Why the Rated Pull Is a Bare-Drum Number That Fades With Every Layer

```
inputs:
  rated_pull_lb    lb    bare-drum rated line pull P1
  drum_dia_in      in    bare drum (barrel) diameter D1
  rope_dia_in      in    wire rope diameter dr
  barrel_width_in  in    drum barrel width
  target_layer     -     layer of interest n (1 = first/bare)

Dn              = drum_dia_in + (2 x target_layer - 1) x rope_dia_in     [in]   mean diameter at layer n
pull_at_layer   = rated_pull_lb x drum_dia_in / Dn                       [lb]
speed_ratio     = Dn / drum_dia_in                                       [-]    line speed rises with layer
wraps_per_layer = floor(barrel_width_in / rope_dia_in)                   [count]
```

**Pinned worked example (a 10,000 lb bare-drum winch, 10 in drum, 1/2 in rope, 12 in barrel).** On the first layer the
mean diameter is `10 + (2x1-1) x 0.5 = 10.5 in`, so the pull is `10,000 x 10 / 10.5 = ` **9,524 lb**. By the **fourth**
layer the mean diameter grows to `10 + 7 x 0.5 = 13.5 in`, and the pull drops to `10,000 x 10 / 13.5 = ` **7,407 lb** --
**26% below** the nameplate, while the line speed rises 35%. The drum holds `floor(12 / 0.5) = ` **24 wraps per layer**.
**Cross-check (a fatter rope fades faster).** Swap to a 3/4 in rope: the fourth-layer mean diameter is
`10 + 7 x 0.75 = 15.25 in`, so the pull falls to `10,000 x 10 / 15.25 = ` **6,557 lb** -- a 34% loss by the same layer,
because the thicker rope grows the drum faster. The tile returns the mean diameter, the derated pull, the speed ratio,
and the wraps per layer.

## 3. Wiring

A `tools-data.js` row (group `Z`, trades `["rigging"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 1/2 in example + the 3/4 in
cross-check); `test/fixtures/compute-map.js` (`winch-drum-line-pull` -> `computeWinchDrumLinePull` in
`../../calc-rigging.js`); `scripts/related-tiles.mjs` (-> `wire-rope-strength` / `chain-lever-hoist` / `pulley-ma-gen`);
`data/search/aliases.json` ("winch line pull", "drum line pull", "winch layer derate", "bare drum rating", "winch
capacity by layer", "wire rope drum", "line speed layer", "winch stall"); the id appended to the rigging renderers
declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples, the diameter growth per layer, the pull falling and speed rising with the layer, the wraps-per-
layer, and the error seams (non-finite, non-positive pull / diameters / barrel, layer < 1). Hand-writes its renderer
(mirroring the calc-rigging.js `wire-rope-strength` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the mean-diameter / pull / speed stack wraps on a phone); render-no-nan + a11y on the new tile,
output read to the value (the fourth-layer example -> 7,407 lb).

## 5. Roadmap position

Adds powered-winch drum mechanics beside `wire-rope-strength` (the rope) and `chain-lever-hoist`. A rope-capacity check
(total rope length against the drum's layer capacity) and a required-layer-for-a-pull solver are deliberate future
follow-ons. Further Group Z growth stays evidence-driven.
