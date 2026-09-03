#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { basename, extname } from "node:path";

const listed = spawnSync("git", ["ls-files", "-z"], { encoding: "utf8" });
if (listed.status !== 0) {
  console.error("secret-files: unable to inspect tracked files");
  process.exit(1);
}

const allowedExamples = new Set([".env.example", ".dev.vars.example"]);
const privateKeyExtensions = new Set([".key", ".pem", ".p12", ".pfx"]);
const privateKeyNames = new Set(["id_rsa", "id_dsa", "id_ecdsa", "id_ed25519"]);
function isSecretShaped(file) {
  const name = basename(file).toLowerCase();
  if (allowedExamples.has(name)) return false;
  return name === ".env" || name.startsWith(".env.")
    || name === ".dev.vars" || name.startsWith(".dev.vars.")
    || privateKeyNames.has(name) || privateKeyExtensions.has(extname(name));
}

const forbidden = listed.stdout.split("\0").filter(Boolean).filter(isSecretShaped);

if (forbidden.length) {
  console.error("secret-files: refusing tracked secret-shaped files:\n" + forbidden.join("\n"));
  process.exit(1);
}

// `git ls-files` sees the CURRENT tree. A secret committed once and deleted in
// the next commit is gone from the tree and still readable forever by anyone who
// clones -- which stopped being a theoretical distinction when this repository
// went public. Ask history what was ever ADDED, not what is here now.
//
// Every path ever added, deduped, is 2,018 entries and enumerates in about a
// third of a second, so this is cheap enough to run on every lint. It is a path
// check, not a content check: a full scan of all 16,541 history blobs for
// credential patterns takes minutes and was run once, by hand, on 2026-09-02 --
// clean, and recorded in docs/threat-model.md. What this catches is the ordinary
// accident, which is committing a file whose NAME says what it holds.
const everAdded = spawnSync(
  "git",
  ["log", "--all", "--diff-filter=A", "--name-only", "--pretty=format:", "-z"],
  { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
);
if (everAdded.status !== 0) {
  console.error("secret-files: unable to inspect history");
  process.exit(1);
}
const historical = [...new Set(everAdded.stdout.split("\0").filter(Boolean))].filter(isSecretShaped);
if (historical.length) {
  console.error(
    "secret-files: these secret-shaped paths exist in git history and are readable in a public\n" +
      "clone even though they are not in the working tree. Rotate whatever they held, then purge\n" +
      "them from history (git filter-repo) -- deleting the file in a later commit does not do it:\n" +
      historical.join("\n"),
  );
  process.exit(1);
}

console.log(
  "secret-files: ok (" + forbidden.length + " tracked and " + historical.length +
    " historical secret-shaped path(s); " + new Set(everAdded.stdout.split("\0").filter(Boolean)).size +
    " path(s) ever added were checked).",
);
