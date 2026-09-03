# Contributing

Thanks for looking. This is a small, opinionated project with a large catalog,
so the short version is: **the gates are the contract**. If `npm run audit` is
green and your change fits the constraints below, it is reviewable.

## Before you open a pull request

```bash
npm ci
npm run audit
```

That single command runs the canonical chain (lint -> unit tests -> build ->
`check:dist` -> `check:shells` -> `check:module-sizes` -> `check:shell-values`
-> `check:lastmod` -> `data:verify` -> `check:data-stamps`). `npm run lint`
alone is 57 static gates, of which 56 run here: `check-ngrams` compares text
against a private hash list of licensed code spans that is deliberately not in
this repository, so it skips with a message and passes.
If you changed layout or type, also run `npm run check:shell-mobile`; it drives
every static shell through a headless browser at 320 px and is the one CI
post-build gate `npm run audit` does not include.

Then paste the matching section of
[docs/contributor-checklist.md](docs/contributor-checklist.md) into your PR
description and tick it. The pull-request template already points at it.

## Hard constraints

These are not preferences. A change that breaks one of them will fail a gate.

| Constraint | Why |
|---|---|
| **Zero runtime dependencies** | The site ships as static files. Dev tooling is locked in `package-lock.json`; the shipped bundle has no third-party code. |
| **No network at build time** | Every value in `data/` is an in-tree constant transcribed by a maintainer and reviewable in a diff. `check-build-hermetic` fails on any undeclared fetch. |
| **No new remote write path** | The one hosted write is the bounded, user-initiated problem-report queue. Anything else needs its own approved spec. |
| **No new storage key** beyond `rl-theme` | No accounts, no analytics, no tracking. |
| **US standards only** | See [specs/](specs/) for the scope charter. Metric-only or non-US-code calculators are out of scope. |
| **Plain ASCII in shipped strings** | No emoji, no em-dashes, no decorative icons. `grep-checks` enforces it. |
| **Every answer cites a real, dated source** | `check-citation-coverage` and `check-derivation-coverage` both fail without one. |

## What kind of change is this?

- **A wrong answer.** Highest-value contribution here. Open an issue with the
  calculator, the inputs, the answer you got, the answer you expected, and the
  published source that settles it. A fix lands with a worked-example fixture
  from that source.
- **A new calculator.** Read the "New tile" section of
  [docs/contributor-checklist.md](docs/contributor-checklist.md) first; a tile
  touches about twenty files, and every one of those registries holds all 1,804
  ids. Open an issue before building so the id and scope can be agreed.
- **A bug in the site or the MCP server.** Issue with steps to reproduce, or a
  PR with a failing test that your change turns green.
- **Docs.** Welcome. `check-doc-links` verifies every relative link across the
  living docs, this file, `SECURITY.md`, `AGENTS.md`, and `.github/`.

## Orientation

| You want | Read |
|---|---|
| What the repo is and how it is built | [README.md](README.md) |
| How to work in it as a maintainer | [docs/maintainer-quickstart.md](docs/maintainer-quickstart.md) |
| How to work in it as an AI agent | [AGENTS.md](AGENTS.md) |
| Where the code lives | [docs/architecture.md](docs/architecture.md) |
| Why an answer is what it is | [docs/derivations.md](docs/derivations.md), [docs/data-sources.md](docs/data-sources.md) |

## Security

Do not open a public issue for a suspected vulnerability. See
[SECURITY.md](SECURITY.md).

## Conduct

Be straight with people and assume good faith. Harassment, personal attacks,
and bad-faith argument are not welcome and get you removed from the project.
Report a problem with someone's conduct to `hi@claygood.com`.

## License

By contributing you agree that your contribution is licensed under the
project's [MIT license](LICENSE).
