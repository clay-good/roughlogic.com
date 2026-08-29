#!/usr/bin/env node
// Lightweight local dev server. Static files only, same-origin, no external
// dependencies. Streams files from the repository root with appropriate
// MIME types and the same security headers that the production _headers
// file applies. Default port 8080.

import { createServer } from "node:http";
import { lstat, readFile, realpath } from "node:fs/promises";
import { resolve, extname, relative, isAbsolute } from "node:path";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..", "dist");
const PORT = Number(process.env.PORT) || 8080;
const HOST = "127.0.0.1";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".md": "text/markdown; charset=utf-8",
};

const SECURITY_HEADERS = {
  // Mirror the production _headers CSP exactly, including the sha256 of the
  // inline theme-boot script in index.html. Omitting the hash here makes the
  // dev server (and any Playwright suite it serves) enforce a stricter policy
  // than production: the two CSPs combine and `script-src 'self'` blocks the
  // boot script, flashing un-themed paint locally. check-csp.mjs gates this
  // line against the recomputed hash so it cannot drift from _headers again.
  "Content-Security-Policy": "default-src 'self'; script-src 'self' https://challenges.cloudflare.com 'sha256-0qFLOnMo4ZqgtC+YMO+1763cr/ZxTi2v7KEhzLIIz4I='; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-src https://challenges.cloudflare.com; form-action 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; worker-src 'self'",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
};

createServer(async (req, res) => {
  try {
    const host = String(req.headers.host || "").toLowerCase();
    if (host !== `localhost:${PORT}` && host !== `${HOST}:${PORT}`) {
      res.writeHead(421); res.end("Misdirected request"); return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD" }); res.end(); return;
    }
    const url = new URL(req.url || "/", "http://localhost");
    let p = decodeURIComponent(url.pathname);
    if (p === "/" || p === "") p = "/index.html";
    let file = resolve(ROOT, "." + p);
    let rel = relative(ROOT, file);
    if (!rel || rel.startsWith("..") || isAbsolute(rel)) { res.writeHead(403); res.end(); return; }
    let st;
    try { st = await lstat(file); } catch (error) {
      if (error && error.code === "ENOENT") { res.writeHead(404); res.end("Not found"); return; }
      throw error;
    }
    // A directory resolves to its index.html, the way the edge does. Without
    // this, `/tools/voltage-drop/` -- the CANONICAL url this site publishes in
    // its own sitemap, its JSON-LD and every shell's <link rel=canonical> --
    // answered 403 locally while working in production. Only `/` was mapped.
    //
    // The traversal guards are re-run against the file actually served rather
    // than the directory that was asked for, so index.html gets the same
    // containment, symlink and realpath checks any other path would.
    if (st.isDirectory()) {
      file = resolve(file, "index.html");
      rel = relative(ROOT, file);
      if (!rel || rel.startsWith("..") || isAbsolute(rel)) { res.writeHead(403); res.end(); return; }
      try { st = await lstat(file); } catch (error) {
        if (error && error.code === "ENOENT") { res.writeHead(404); res.end("Not found"); return; }
        throw error;
      }
    }
    if (!st.isFile() || st.isSymbolicLink()) { res.writeHead(403); res.end(); return; }
    const canonical = await realpath(file);
    const canonicalRel = relative(ROOT, canonical);
    if (canonicalRel.startsWith("..") || isAbsolute(canonicalRel)) { res.writeHead(403); res.end(); return; }
    const data = await readFile(file);
    const headers = { ...SECURITY_HEADERS, "Content-Type": MIME[extname(file)] || "application/octet-stream", "Content-Length": data.byteLength };
    res.writeHead(200, headers);
    res.end(req.method === "HEAD" ? undefined : data);
  } catch (e) {
    res.writeHead(500); res.end("Server error");
  }
}).listen(PORT, HOST, () => {
  console.log("dev: http://localhost:" + PORT + "/");
});
