// Toolbar popup: add the current tab to a page/section of the startpage

const form = document.getElementById("form");
const status = document.getElementById("status");
let data;

function updateSectionField() {
  const page = data.pages.find((p) => p.id === form.page.value);
  fillSectionSelect(form.section, page, page.sections[0] && page.sections[0].title);
  if (!page.sections.length) form.section.value = "__new__";
  toggleNewSection();
}

function toggleNewSection() {
  const isNew = form.section.value === "__new__";
  form.querySelector(".new_section").hidden = !isNew;
  form.new_section.required = isNew;
}

form.page.addEventListener("change", updateSectionField);
form.section.addEventListener("change", toggleNewSection);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const sectionTitle =
    form.section.value === "__new__" ? form.new_section.value.trim() : form.section.value;
  addLink(data, form.page.value, sectionTitle, {
    name: form.link_name.value.trim(),
    url: normalizeUrl(form.url.value),
  });
  try {
    await saveData(data);
    const page = data.pages.find((p) => p.id === form.page.value);
    status.textContent = `Added to ${page.name} › ${sectionTitle}.`;
    form.querySelector("button").disabled = true;
    setTimeout(() => window.close(), 900);
  } catch (err) {
    status.textContent = err.message;
  }
});

(async () => {
  data = await loadData();
  if (!data.pages.length) {
    form.hidden = true;
    status.textContent = "No pages yet: open a new tab and press + to make one.";
    return;
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  form.link_name.value = (tab && tab.title) || "";
  form.url.value = (tab && tab.url) || "";
  fillPageSelect(form.page, data.pages, localStorage.getItem("selected-page"));
  updateSectionField();
  form.link_name.select();
})();
