// New tab page: renders the pages from store.js as folders with tabs,
// and lets you add/edit bookmarks and pages in place.

let data = { pages: [] };
let currentId = localStorage.getItem("selected-page");
let editing = false;

const content = document.getElementById("content");
const linksEl = document.getElementById("links");
const tabsEl = document.getElementById("folder_tabs");
const img = document.getElementById("img");

// Preload all of the themes css to avoid the FOUC on change
THEMES.forEach((theme) => {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `./main-themes/${theme}/style.css`;
  link.classList.add(`theme-${theme}`);
  link.disabled = true;
  document.head.appendChild(link);
});

function currentPage() {
  return data.pages.find((p) => p.id === currentId) || data.pages[0];
}

// The open page's theme styles the whole page; its image (or the theme's gif) fills the card
function applyTheme(page) {
  const theme = page ? page.theme : "blue";
  THEMES.forEach((t) => {
    document.querySelector(`.theme-${t}`).disabled = t !== theme;
  });
  img.src = (page && page.image) || `./main-themes/${theme}/images/gif.gif`;
}

// Each tab's text takes the heading colour of its own page's theme
const headingColors = {};
function headingColor(theme) {
  if (!headingColors[theme]) {
    headingColors[theme] = fetch(`./main-themes/${theme}/style.css`)
      .then((r) => r.text())
      .then((css) => (css.match(/--link-heading:\s*([^;]+);/) || [])[1])
      .catch(() => undefined);
  }
  return headingColors[theme];
}

function el(tag, { dataset, ...props } = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  Object.assign(node.dataset, dataset);
  node.append(...children);
  return node;
}

function render() {
  const page = currentPage();
  currentId = page && page.id;
  if (currentId) localStorage.setItem("selected-page", currentId);

  tabsEl.replaceChildren(
    ...data.pages.map((p) => {
      const tab = el("button", {
        className: "folder_tab" + (p.id === currentId ? " active" : ""),
        textContent: p.name,
      });
      headingColor(p.theme).then((color) => {
        if (color) tab.style.setProperty("--tab-color", color);
      });
      tab.addEventListener("click", () => {
        if (p.id !== currentId) switchTo(p.id);
        else if (editing) openPageEditor(p);
      });
      return tab;
    })
  );

  if (!page) {
    linksEl.replaceChildren(el("p", { className: "empty", textContent: "No pages yet. Press + to add one." }));
  } else if (!page.sections.some((s) => s.links.length)) {
    linksEl.replaceChildren(el("p", { className: "empty", textContent: "This page is empty. Press + to add a bookmark." }));
  } else {
    linksEl.replaceChildren(
      ...page.sections.map((section, si) =>
        el(
          "section",
          {},
          el("h3", { textContent: section.title, dataset: { section: si } }),
          el(
            "ul",
            {},
            ...section.links.map((link, li) =>
              el("li", {}, el("a", { href: link.url, textContent: link.name, dataset: { section: si, link: li } }))
            )
          )
        )
      )
    );
  }
  applyTheme(page);
}

function switchTo(id) {
  content.classList.add("switching");
  setTimeout(() => {
    currentId = id;
    render();
    content.classList.remove("switching");
  }, 150);
}

async function save() {
  render();
  await saveData(data);
}

// Theme menu: changes the open page's theme
document.querySelectorAll(".menu-items [data-theme]").forEach((a) =>
  a.addEventListener("click", () => {
    const page = currentPage();
    if (!page) return;
    page.theme = a.dataset.theme;
    save().catch(() => {});
  })
);

// ---- editing ----

const editor = document.getElementById("editor");
const linkForm = document.getElementById("link_form");
const pageForm = document.getElementById("page_form");
const modes = document.getElementById("editor_modes");
const errorEl = document.getElementById("editor_error");
let editingLink = null; // { pageId, si, li } when editing an existing bookmark
let editingPage = null; // the page object when editing an existing page

function showError(message) {
  errorEl.textContent = message || "";
  errorEl.hidden = !message;
}

function showMode(mode, withModes) {
  modes.hidden = !withModes;
  modes.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
  editor.querySelectorAll(".editor_form").forEach((f) => (f.hidden = f.dataset.mode !== mode));
  showError(hasStorage ? "" : "Editing needs the extension's storage permission: restart the browser.");
  if (!editor.open) editor.showModal();
  const first = editor.querySelector(`.editor_form[data-mode="${mode}"] input:not([type=file])`);
  if (first) first.focus();
}

modes.querySelectorAll("button").forEach((b) =>
  b.addEventListener("click", () => {
    if (b.dataset.mode === "link") openLinkEditor();
    else if (b.dataset.mode === "page") openPageEditor();
    else showMode("backup", true);
  })
);

editor.querySelectorAll('[data-action="cancel"]').forEach((b) => b.addEventListener("click", () => editor.close()));

// Bookmark form

function updateSectionField(selected) {
  const page = data.pages.find((p) => p.id === linkForm.page.value);
  fillSectionSelect(linkForm.section, page, selected);
  if (!page.sections.length) linkForm.section.value = "__new__";
  toggleNewSection();
}

function toggleNewSection() {
  const isNew = linkForm.section.value === "__new__";
  linkForm.querySelector(".new_section").hidden = !isNew;
  linkForm.new_section.required = isNew;
}

linkForm.page.addEventListener("change", () => updateSectionField());
linkForm.section.addEventListener("change", toggleNewSection);

function openLinkEditor(target) {
  if (!data.pages.length) return openPageEditor();
  editingLink = target || null;
  const page = target ? data.pages.find((p) => p.id === target.pageId) : currentPage();
  const section = target ? page.sections[target.si] : page.sections[0];
  const link = target ? section.links[target.li] : { name: "", url: "" };
  linkForm.reset();
  linkForm.link_name.value = link.name;
  linkForm.url.value = link.url;
  fillPageSelect(linkForm.page, data.pages, page.id);
  updateSectionField(section && section.title);
  document.getElementById("link_form_title").textContent = target ? "edit bookmark" : "new bookmark";
  linkForm.querySelector('[data-action="delete"]').hidden = !target;
  showMode("link", !target);
}

function removeEditingLink() {
  const page = data.pages.find((p) => p.id === editingLink.pageId);
  const section = page.sections[editingLink.si];
  section.links.splice(editingLink.li, 1);
  if (!section.links.length) page.sections.splice(editingLink.si, 1);
}

linkForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const pageId = linkForm.page.value;
  const sectionTitle =
    linkForm.section.value === "__new__" ? linkForm.new_section.value.trim() : linkForm.section.value;
  const link = { name: linkForm.link_name.value.trim(), url: normalizeUrl(linkForm.url.value) };
  const old = editingLink && data.pages.find((p) => p.id === editingLink.pageId).sections[editingLink.si];
  if (old && editingLink.pageId === pageId && old.title === sectionTitle) {
    old.links[editingLink.li] = link; // same place: keep its position
  } else {
    if (editingLink) removeEditingLink();
    addLink(data, pageId, sectionTitle, link);
  }
  currentId = pageId;
  try {
    await save();
    editor.close();
  } catch (err) {
    showError(err.message);
  }
});

linkForm.querySelector('[data-action="delete"]').addEventListener("click", async () => {
  removeEditingLink();
  try {
    await save();
    editor.close();
  } catch (err) {
    showError(err.message);
  }
});

// Page form

pageForm.theme.replaceChildren(...THEMES.map((t) => new Option(t.toLowerCase(), t)));

function openPageEditor(page) {
  editingPage = page || null;
  pageForm.reset();
  const images = [...IMAGES];
  if (page && page.image && !images.some((i) => i.path === page.image)) {
    images.push({ label: page.image.replace(/^.*\//, ""), path: page.image });
  }
  pageForm.image.replaceChildren(...images.map((i) => new Option(i.label, i.path || "")));
  pageForm.page_name.value = page ? page.name : "";
  pageForm.theme.value = page ? page.theme : THEMES.find((t) => !data.pages.some((p) => p.theme === t)) || "blue";
  pageForm.image.value = (page && page.image) || "";
  document.getElementById("page_form_title").textContent = page ? "edit page" : "new page";
  pageForm.querySelector('[data-action="delete"]').hidden = !page;
  showMode("page", !page);
}

pageForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fields = {
    name: pageForm.page_name.value.trim(),
    theme: pageForm.theme.value,
    image: pageForm.image.value || null,
  };
  if (editingPage) {
    Object.assign(editingPage, fields);
  } else {
    const page = { id: makePageId(fields.name, data.pages), ...fields, sections: [] };
    data.pages.push(page);
    currentId = page.id;
  }
  try {
    await save();
    editor.close();
  } catch (err) {
    showError(err.message);
  }
});

pageForm.querySelector('[data-action="delete"]').addEventListener("click", async () => {
  const count = editingPage.sections.reduce((n, s) => n + s.links.length, 0);
  if (!confirm(`Delete the page "${editingPage.name}" and its ${count} bookmarks?`)) return;
  data.pages = data.pages.filter((p) => p !== editingPage);
  currentId = data.pages[0] && data.pages[0].id;
  try {
    await save();
    editor.close();
  } catch (err) {
    showError(err.message);
  }
});

// Backup

editor.querySelector('[data-action="export"]').addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(data, null, 2) + "\n"], { type: "application/json" });
  const a = el("a", { href: URL.createObjectURL(blob), download: "my_pages.json" });
  a.click();
  URL.revokeObjectURL(a.href);
});

const importFile = document.getElementById("import_file");
editor.querySelector('[data-action="import"]').addEventListener("click", () => importFile.click());
importFile.addEventListener("change", async () => {
  try {
    const imported = JSON.parse(await importFile.files[0].text());
    if (!Array.isArray(imported.pages) || !imported.pages.every((p) => p.id && p.name && Array.isArray(p.sections))) {
      throw new Error("That file doesn't look like an exported pages file.");
    }
    if (!confirm(`Replace your ${data.pages.length} pages with the ${imported.pages.length} pages in this file?`)) return;
    data = imported;
    currentId = data.pages[0] && data.pages[0].id;
    await save();
    editor.close();
  } catch (err) {
    showError(err.message);
  } finally {
    importFile.value = "";
  }
});

// Card buttons and edit mode

document.getElementById("add_button").addEventListener("click", () => openLinkEditor());
document.getElementById("edit_button").addEventListener("click", () => {
  editing = !editing;
  document.body.classList.toggle("editing", editing);
});

linksEl.addEventListener("click", (e) => {
  if (!editing) return;
  const a = e.target.closest("a[data-link]");
  const h3 = e.target.closest("h3[data-section]");
  if (a) {
    e.preventDefault();
    openLinkEditor({ pageId: currentId, si: +a.dataset.section, li: +a.dataset.link });
  } else if (h3) {
    const section = currentPage().sections[+h3.dataset.section];
    const title = prompt("Rename section (leave empty to delete it and its bookmarks):", section.title);
    if (title === null) return;
    if (title.trim()) section.title = title.trim();
    else if (confirm(`Delete the section "${section.title}" and its ${section.links.length} bookmarks?`)) {
      currentPage().sections.splice(+h3.dataset.section, 1);
    } else return;
    save().catch((err) => alert(err.message));
  }
});

// Changes from the toolbar popup (or another tab)
onDataChanged((newData) => {
  data = newData;
  render();
});

loadData().then((loaded) => {
  data = loaded;
  render();
});

// ---- search ----

const search_url = "https://duckduckgo.com/";

function search() {
  const is_url =
    /^(((http)|(https)):\/\/)?(www\.)?[a-zA-Z0-9]+\.[a-zA-Z]+\/?([a-zA-Z0-9/?=&%-_]+)?$/;
  const is_ip =
    /^(((http)|(https)):\/\/)?([0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}|localhost)(:[0-9]{1,5})?(\/[a-zA-Z0-9/?=&%-_]+)?$/;

  const search_term = document.getElementById("search_box").value;
  const url_match = search_term.match(is_url);
  const ip_match = search_term.match(is_ip);
  if (url_match != null) {
    window.location.href =
      url_match[0].substring(0, 4) == "http" ? url_match[0] : "https://" + url_match[0];
  } else if (ip_match != null) {
    window.location.href =
      ip_match[0].substring(0, 4) == "http" ? ip_match[0] : "http://" + ip_match[0];
  } else {
    window.location.href = search_url + encodeURIComponent(search_term);
  }

  return false;
}

document.getElementById("search_form").addEventListener("submit", (e) => {
  e.preventDefault();
  search();
});
