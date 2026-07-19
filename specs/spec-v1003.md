# roughlogic.com Specification v1003 -- Potential / Needed Acoustic Gain (Feedback Stability) (calc-stage.js, Group N, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-stage.js`** (Group N),
> no new module, group, or dependency. Inherits spec.md through spec-v1002.md. Beside `spl-distance`, `amp-power-spl`,
> and the audio tiles.
>
> **The gap, and the evidence for it.** The catalog has SPL-vs-distance and amplifier-power tiles, but nothing checks
> FEEDBACK STABILITY -- whether a reinforcement system can be loud enough before it rings, the PAG/NAG analysis a sound
> tech runs when placing mics and speakers. Grep confirmed no PAG/NAG tile. The number this settles: a 2 ft mic, 30 ft
> room, 8 ft speaker throw, 12 ft speaker-to-mic, one mic, 6 ft EAD is exactly **balanced (PAG 14.0 = NAG 14.0)**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, dB from distances), bounds-fuzzer, worked-example
registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input, a non-positive distance or EAD, or
fewer than one open mic returns `{ error }`. Citation discipline (v19/v22): the PAG/NAG feedback-stability analysis by
name (Davis & Patronis, Sound System Engineering; Yamaha Sound Reinforcement Handbook), `GOVERNANCE.rigging` (the Group
N stage variant, matching `spl-distance`); the note explains the four critical distances, the 3 dB-per-open-mic-doubling
and 6 dB feedback margin, and the design levers, and stresses that the room acoustics, mic/speaker directivity, and
system tuning govern actual stability.

## 2. The tile

### 2.1 `acoustic-gain-pag-nag` -- Potential / Needed Acoustic Gain (Feedback Stability)

```
inputs:
  ds_ft      talker to microphone (ft), default 2
  d0_ft      talker to farthest listener (ft), default 30
  d1_ft      loudspeaker to farthest listener (ft), default 8
  d2_ft      loudspeaker to microphone (ft), default 12
  open_mics  number of open microphones NOM, default 1
  ead_ft     equivalent acoustic distance (ft), default 6

pag_db    = 20log(d1_ft) + 20log(d0_ft) - 20log(ds_ft) - 20log(d2_ft) - 10log(open_mics) - 6
nag_db    = 20log(d0_ft / ead_ft)
margin_db = pag_db - nag_db   (workable when >= 0)
```

**Pinned worked example.** Ds 2, D0 30, D1 8, D2 12 ft, 1 open mic, EAD 6 ft: `PAG = 20log8 + 20log30 - 20log2 -
20log12 - 10log1 - 6 = ` **14.0 dB**; `NAG = 20log(30/6) = ` **14.0 dB** -- exactly balanced (the marginal case).
Cross-check: move the mic to 1 ft from the talker (Ds 1): `PAG = ` **20.0 dB**, NAG 14.0, a comfortable **+6 dB** of
headroom.

## 3. Wiring

A `tools-data.js` row (group `N`, trades `["stage"]`, beside `spl-distance`); a `tile-meta.js` `_TILES` entry (`N`); a
`citations.js` entry (Davis & Patronis / Yamaha PAG/NAG, `GOVERNANCE.rigging`); `test/fixtures/worked-examples.json`
(the balance base plus the mic-closer cross-check, pinning PAG, NAG, and margin); `test/fixtures/compute-map.js`
(`acoustic-gain-pag-nag` -> `computeAcousticGainPagNag`, module `../../calc-stage.js`); `scripts/related-tiles.mjs`
(-> `spl-distance` / `room-acoustics` / `amp-power-spl`); `data/search/aliases.json` (5 collision-checked aliases:
"acoustic gain", "pag nag", "feedback stability", "potential acoustic gain", "sound system gain"), then
`node scripts/build-alias-shards.mjs`; a hand-written renderer in the `STAGE_RENDERERS` map (non-exported, so no
DOM-sentinel dims row), and the id added to the calc-stage declare list in `app.js`; the `// dims:` annotation directly
above the compute; the Group N citation-coverage audit count bumped; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning both examples, the open-mic 3 dB step, the SHORT verdict, and
the error seams. The calc-stage.js gzip cap and the Group N group shell are watched at build (cap raised for this tile).
Home tile count 1,451 -> 1,452.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group N count bump);
`npm run build`; `node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs`
post-build; `npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(2/30/8/12 ft, 1 mic, 6 ft EAD -> PAG 14.0 = NAG 14.0).

## 5. Roadmap position

Sound reinforcement beside `spl-distance`, serving the audio engineer / sound tech (stage). Deliberately the design
screen; the real room acoustics, the mic and loudspeaker directivity, and the final system tuning govern actual
feedback stability. Stays evidence-driven. Continues the stage-audio sweep at 1 new spec (v1003).
