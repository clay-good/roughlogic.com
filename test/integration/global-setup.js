// Refuse to run the suite against a build that is not this checkout's.
//
// `webServer.reuseExistingServer` is true outside CI, and `scripts/dev.mjs`
// serves the `dist/` NEXT TO ITSELF. Both are reasonable on their own and
// together they are a trap: if any other checkout of this repository -- a
// second git worktree, another agent's session, a terminal left open
// yesterday -- already holds port 8080, Playwright silently adopts THAT
// server and every spec in this suite exercises THAT build.
//
// It happened on 2026-09-05. A dev server from a different worktree had held
// the port since 17:23, and a full local run reported "3,971 passed" over a
// catalog that did not contain the band being verified. The suite was green
// and covered nothing: the tiles under test 404'd, and the one spec that
// noticed -- example-parity-runtime, which builds its id list from the LIVE
// repository and then asks the SERVER for those tiles -- failed with a
// twenty-second locator timeout that named neither the port nor the cause.
//
// So the first thing the suite does is ask the server what it is serving and
// compare it with what this checkout says. The home lede carries the catalog
// count (`check-readme-counts` holds it there), and a tile that this checkout
// has must resolve as a static shell. Either mismatch is fatal, and the
// message names the real cause rather than leaving it to a timeout.
//
// Set PORT to run on your own port when another checkout legitimately holds
// the default one: `PORT=8181 npm run test:e2e`.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PORT = Number(process.env.PORT) || 8080;
const BASE = `http://localhost:${PORT}`;

function fatal(lines) {
  throw new Error(["", "The dev server on " + BASE + " is not serving this checkout.", ...lines,
    "",
    "Most likely another checkout of this repository (a second git worktree, another",
    "agent session, a terminal left open) already holds port " + PORT + ", and",
    "webServer.reuseExistingServer adopted it. Stop that server, or run this suite on",
    "a port of your own:  PORT=8181 npm run test:e2e",
    ""].join("\n"));
}

export default async function globalSetup() {
  const { TOOLS } = await import(resolve(ROOT, "tools-data.js"));
  const expected = TOOLS.length;

  let home;
  try {
    const res = await fetch(BASE + "/");
    if (!res.ok) fatal(["  GET / answered " + res.status + "."]);
    home = await res.text();
  } catch (e) {
    if (e instanceof Error && e.message.includes("not serving this checkout")) throw e;
    fatal(["  GET / could not be read: " + (e && e.message)]);
  }

  const m = home.match(/([\d,]+) free calculators/);
  if (!m) fatal(["  Its home page carries no catalog count at all, so it is not this site."]);
  const served = Number(m[1].replace(/,/g, ""));
  if (served !== expected) {
    fatal(["  It serves a catalog of " + served + " calculators; this checkout has " + expected + ".",
      "  Every spec in this suite would have exercised that other build."]);
  }

  // The count can agree while the shells are stale, so also demand that the
  // newest tile this checkout knows about actually resolves on the server.
  const newest = TOOLS[TOOLS.length - 1].id;
  const shell = await fetch(BASE + "/tools/" + newest + "/");
  if (!shell.ok) {
    fatal(["  Its catalog count matches, but /tools/" + newest + "/ answered " + shell.status + ".",
      "  The shells it is serving are older than the ones this checkout built."]);
  }
}
