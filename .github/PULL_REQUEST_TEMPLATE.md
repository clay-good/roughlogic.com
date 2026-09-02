<!--
Title: Conventional Commits, e.g. fix(search): a code section inside a tile's
name was ranking it
-->

## What this changes

<!-- One or two plain-language lines. What was wrong or missing, and what the
new behavior is. -->

## Proof it works

<!-- The failing-then-passing test, the repro steps, or the before/after
output. A claim with no evidence is not reviewable. -->

## Checklist

- [ ] `npm run audit` is green (lint -> test -> build -> check:dist ->
      check:shells -> check:module-sizes -> check:shell-values ->
      check:lastmod -> data:verify)
- [ ] `npm run check:shell-mobile` run, if this touches layout or type
- [ ] CHANGELOG updated, if this is user-visible
- [ ] No new runtime dependency, network call, storage key, or remote write path

<!-- Adding a calculator, rolling an edition, or changing the data pipeline?
Paste the matching section of docs/contributor-checklist.md here and tick it. -->
