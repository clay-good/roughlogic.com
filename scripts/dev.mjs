#!/usr/bin/env node
// Lightweight local dev server. Static files only, same-origin, no external
// dependencies. Streams files from the repository root with appropriate
// MIME types and the same security headers that the production _headers
// file applies. Default port 8080.

import { createServer } from "node:http";
import { stat, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, extname } from "node:path";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");
const PORT = Number(process.env.PORT) || 8080;

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
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; form-action 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; worker-src 'self'",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://localhost");
    let p = decodeURIComponent(url.pathname);
    if (p === "/" || p === "") p = "/index.html";
    const file = resolve(ROOT, "." + p);
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    if (!existsSync(file)) { res.writeHead(404); res.end("Not found"); return; }
    const st = await stat(file);
    if (st.isDirectory()) { res.writeHead(403); res.end(); return; }
    const data = await readFile(file);
    const headers = { ...SECURITY_HEADERS, "Content-Type": MIME[extname(file)] || "application/octet-stream", "Content-Length": data.byteLength };
    res.writeHead(200, headers);
    res.end(data);
  } catch (e) {
    res.writeHead(500); res.end("Server error");
  }
}).listen(PORT, () => {
  console.log("dev: http://localhost:" + PORT + "/");
});
