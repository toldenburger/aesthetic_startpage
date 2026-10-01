// Startpage data, shared by the new tab page and the toolbar popup.
//
// Shape: { pages: [ { id, name, theme, image, sections: [ { title, links: [ { name, url } ] } ] } ] }
//
// The data lives in chrome.storage.local. On first run it is seeded from
// my_pages.json (your own pages, git-ignored) or, if that doesn't exist,
// from pages.default.json (the example pages that ship with the repo).

const STORE_KEY = "startpage";
const hasStorage =
  typeof chrome !== "undefined" && !!chrome.storage && !!chrome.storage.local;

const THEMES = [
  "blue",
  "cherry",
  "violet",
  "green",
  "orange",
  "purple",
  "white",
  "mesh-purple",
  "summer-wave",
  "retro-gradient",
  "Animated-Gradient",
];

// Images a page can use instead of its theme's own gif. Drop a gif into
// page_images/ and add it here to make it selectable.
const IMAGES = [
  { label: "theme image", path: null },
  { label: "pixel city", path: "./page_images/utilities.gif" },
  { label: "collage", path: "./page_images/zines.gif" },
  { label: "neon city", path: "./page_images/media.gif" },
];

async function fetchJson(path) {
  try {
    const response = await fetch(path);
    if (response.ok) return await response.json();
  } catch (e) {
    // file doesn't exist
  }
  return null;
}

async function loadData() {
  if (hasStorage) {
    const stored = await chrome.storage.local.get(STORE_KEY);
    if (stored[STORE_KEY]) return stored[STORE_KEY];
  }
  const seed = (await fetchJson("./my_pages.json")) ||
    (await fetchJson("./pages.default.json")) || { pages: [] };
  // Keep theme choices made before pages were stored as data
  seed.pages.forEach((page) => {
    page.theme =
      localStorage.getItem(`selected-theme-${page.id}`) ||
      page.theme ||
      localStorage.getItem("selected-theme") ||
      "blue";
  });
  if (hasStorage) await saveData(seed);
  return seed;
}

async function saveData(data) {
  if (!hasStorage) {
    throw new Error("Editing needs the extension's storage permission: restart the browser.");
  }
  await chrome.storage.local.set({ [STORE_KEY]: data });
}

function onDataChanged(callback) {
  if (!hasStorage) return;
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[STORE_KEY]) callback(changes[STORE_KEY].newValue);
  });
}

function makePageId(name, pages) {
  const base =
    name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "page";
  let id = base;
  for (let i = 2; pages.some((p) => p.id === id); i++) id = `${base}_${i}`;
  return id;
}

function normalizeUrl(url) {
  url = url.trim();
  return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
}

// Add a link to a page's section, creating the section if needed
function addLink(data, pageId, sectionTitle, link) {
  const page = data.pages.find((p) => p.id === pageId);
  let section = page.sections.find((s) => s.title === sectionTitle);
  if (!section) {
    section = { title: sectionTitle, links: [] };
    page.sections.push(section);
  }
  section.links.push(link);
}

// Fill a <select> with a page's sections plus a "new section…" choice
function fillSectionSelect(select, page, selected) {
  select.replaceChildren(
    ...page.sections.map((s) => new Option(s.title, s.title, false, s.title === selected)),
    new Option("+ new section…", "__new__")
  );
}

function fillPageSelect(select, pages, selected) {
  select.replaceChildren(
    ...pages.map((p) => new Option(p.name, p.id, false, p.id === selected))
  );
}
