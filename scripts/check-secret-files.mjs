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
const forbidden = listed.stdout.split("\0").filter(Boolean).filter((file) => {
  const name = basename(file).toLowerCase();
  if (allowedExamples.has(name)) return false;
  return name === ".env" || name.startsWith(".env.")
    || name === ".dev.vars" || name.startsWith(".dev.vars.")
    || privateKeyNames.has(name) || privateKeyExtensions.has(extname(name));
});

if (forbidden.length) {
  console.error("secret-files: refusing tracked secret-shaped files:\n" + forbidden.join("\n"));
  process.exit(1);
}

console.log("secret-files: ok");
