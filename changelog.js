// Changelog static view. Fetches CHANGELOG.md (same-origin) and renders it
// as plain text with minimal heading detection. No innerHTML; no Markdown
// library. Headings starting with #, ##, ### become h2, h3, h4 respectively.
// Lines starting with `- ` become list items. Everything else is a paragraph.

const host = document.getElementById("changelog-content");

async function load() {
  while (host.firstChild) host.removeChild(host.firstChild);
  let text;
  try {
    const resp = await fetch("CHANGELOG.md", { cache: "no-cache" });
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    text = await resp.text();
  } catch (e) {
    const p = document.createElement("p");
    p.textContent = "Could not load changelog: " + e.message;
    host.appendChild(p);
    return;
  }
  render(text);
}

function render(text) {
  const lines = text.split(/\r?\n/);
  let currentList = null;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line === "") {
      currentList = null;
      continue;
    }
    if (line.startsWith("### ")) {
      currentList = null;
      const h = document.createElement("h4");
      h.textContent = line.slice(4);
      host.appendChild(h);
      continue;
    }
    if (line.startsWith("## ")) {
      currentList = null;
      const h = document.createElement("h3");
      h.textContent = line.slice(3);
      host.appendChild(h);
      continue;
    }
    if (line.startsWith("# ")) {
      currentList = null;
      // Skip the top-level title; the page already shows "Changelog".
      continue;
    }
    if (line.startsWith("- ")) {
      if (!currentList) {
        currentList = document.createElement("ul");
        host.appendChild(currentList);
      }
      const li = document.createElement("li");
      li.textContent = line.slice(2);
      currentList.appendChild(li);
      continue;
    }
    currentList = null;
    const p = document.createElement("p");
    p.textContent = line;
    host.appendChild(p);
  }
}

load();
