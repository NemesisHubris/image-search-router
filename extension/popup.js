"use strict";

const toggle = document.querySelector("#enabled");
const status = document.querySelector("#status");
const routesContainer = document.querySelector("#routes");
const addButton = document.querySelector("#add-route");
const editor = document.querySelector("#custom-editor");
const customForm = document.querySelector("#custom-form");
const customName = document.querySelector("#custom-name");
const customUrl = document.querySelector("#custom-url");
const sourceUrl = document.querySelector("#custom-source-url");
const customSelector = document.querySelector("#custom-selector");
const errorMessage = document.querySelector("#error");
let settings = null;
let rows = [];
let editing = null;
let busy = true;

function showError(message = "") {
  errorMessage.textContent = message;
  errorMessage.hidden = !message;
}

function setBusy(value) {
  busy = value;
  for (const control of document.querySelectorAll("input, select, button")) {
    control.disabled = value;
  }
}

function allEngines() {
  return [...ImageSearch.engines, ...settings.customEngines];
}

function renderSelect(row, side, index) {
  const select = document.createElement("select");
  const label = side === "source" ? "Search engine" : "Image destination";
  select.setAttribute("aria-label", `${label} for route ${index + 1}`);
  select.dataset.side = side;
  select.add(new Option("Choose engine", ""));
  for (const engine of allEngines()) {
    const usedElsewhere = rows.some((other) => other !== row && other.source === engine.id);
    if (side === "source" && usedElsewhere) {
      continue;
    }
    select.add(new Option(engine.name, engine.id));
  }
  select.add(new Option("Custom engine…", "new-custom"));
  select.value = row[side];
  select.addEventListener("change", () => changeEngine(row, side, select.value));
  return select;
}

function renderSettings() {
  toggle.checked = settings.enabled;
  status.textContent = settings.enabled
    ? "Images open in a new tab. Your search stays open."
    : "Routing is off. Your choices are saved.";
  routesContainer.replaceChildren();
  rows.forEach((row, index) => {
    const element = document.createElement("div");
    element.className = "route-row";
    const arrow = document.createElement("span");
    arrow.className = "route-arrow";
    arrow.textContent = "→";
    arrow.setAttribute("aria-hidden", "true");
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-route";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Remove route ${index + 1}`);
    remove.addEventListener("click", async () => {
      const remaining = rows.filter((item) => item !== row);
      if (await saveRows(remaining)) {
        closeEditor();
      }
    });
    element.append(renderSelect(row, "source", index), arrow);
    element.append(renderSelect(row, "destination", index), remove);
    routesContainer.append(element);
  });

  const list = document.querySelector("#custom-engines");
  list.replaceChildren();
  document.querySelector("#custom-section").hidden = settings.customEngines.length === 0;
  for (const engine of settings.customEngines) {
    const item = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = engine.name;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "quiet";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove ${engine.name}`);
    remove.addEventListener("click", () => removeCustomEngine(engine.id));
    item.append(name, remove);
    list.append(item);
  }
  setBusy(busy);
}

async function saveRows(nextRows, customEngines = settings.customEngines) {
  const routes = {};
  for (const row of nextRows) {
    if (row.source && row.destination) {
      routes[row.source] = row.destination;
    }
  }
  return saveSettings({ ...settings, routes, customEngines }, nextRows);
}

async function saveSettings(nextSettings, nextRows = rows) {
  setBusy(true);
  showError();
  try {
    await chrome.storage.local.set(nextSettings);
    settings = nextSettings;
    rows = nextRows;
    const result = await chrome.runtime.sendMessage({ type: "syncCustomSources" });
    if (!result.ok) {
      throw new Error("Choices saved, but custom sites could not be enabled. Try again.");
    }
    return true;
  } catch (error) {
    showError(error.message || "Couldn't save your choices. Please try again.");
    return false;
  } finally {
    setBusy(false);
    renderSettings();
  }
}

async function allowSource(engine) {
  if (!engine.sourceUrl) {
    return true;
  }
  // Called directly from a click/change handler so the browser can show its prompt.
  const granted = await chrome.permissions.request({
    origins: [ImageSearch.sourceOrigin(engine)]
  });
  if (!granted) {
    throw new Error("Site access wasn't allowed. The route hasn't changed.");
  }
  return true;
}

async function changeEngine(row, side, id) {
  showError();
  const engine = allEngines().find((item) => item.id === id);
  const needsSourceDetails = side === "source" && engine?.id.startsWith("custom-")
    && !engine.sourceUrl;
  if (id === "new-custom" || needsSourceDetails) {
    openEditor(row, side, needsSourceDetails ? engine : null);
    renderSettings();
    return;
  }
  try {
    if (side === "source" && engine) {
      await allowSource(engine);
    }
    const nextRows = rows.map((item) => {
      return item === row ? { ...row, [side]: id } : item;
    });
    closeEditor();
    await saveRows(nextRows);
  } catch (error) {
    showError(error.message);
    renderSettings();
  }
}

function openEditor(row, side, engine) {
  editing = { row, side, engine };
  customForm.reset();
  customName.value = engine?.name || "";
  customUrl.value = engine?.url || "";
  sourceUrl.value = engine?.sourceUrl || "";
  customSelector.value = engine?.selector || "";
  const isSource = side === "source";
  document.querySelector("#source-fields").hidden = !isSource;
  document.querySelector("#source-options").hidden = !isSource;
  document.querySelector("#editor-title").textContent = isSource
    ? "Custom search engine" : "Custom image destination";
  editor.hidden = false;
  customName.focus();
}

function closeEditor() {
  editing = null;
  editor.hidden = true;
}

customForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showError();
  if (!editing || busy) {
    return;
  }
  const target = editing;
  try {
    const name = customName.value.trim();
    if (!name) {
      throw new Error("Give your engine a name.");
    }
    const duplicate = allEngines().some((engine) => {
      return engine.id !== target.engine?.id && engine.name.toLowerCase() === name.toLowerCase();
    });
    if (duplicate) {
      throw new Error("That name is already in use. Choose another name.");
    }
    const engine = {
      ...target.engine,
      id: target.engine?.id || `custom-${crypto.randomUUID()}`,
      name,
      url: ImageSearch.validateCustomUrl(customUrl.value)
    };
    if (target.side === "source") {
      engine.sourceUrl = ImageSearch.validateCustomUrl(sourceUrl.value);
      const exampleSearch = engine.sourceUrl.replaceAll("{query}", "example");
      if (ImageSearch.queryFromTemplate(exampleSearch, engine.sourceUrl) === null) {
        throw new Error("Put {query} in the web URL's path or search parameters, before any #.");
      }
      engine.selector = customSelector.value.trim();
      if (engine.selector) {
        try {
          document.querySelector(engine.selector);
        } catch {
          throw new Error("The Images button selector is not valid CSS.");
        }
      }
      await allowSource(engine);
    }
    const customEngines = settings.customEngines.filter((item) => item.id !== engine.id);
    customEngines.push(engine);
    const nextRows = rows.map((row) => {
      return row === target.row ? { ...row, [target.side]: engine.id } : row;
    });
    if (await saveRows(nextRows, customEngines)) {
      closeEditor();
      if (target.side === "source") {
        status.textContent = "Route saved. Refresh any open tabs for your custom search site.";
      }
    }
  } catch (error) {
    showError(error.message);
  }
});

async function removeCustomEngine(id) {
  const customEngines = settings.customEngines.filter((engine) => engine.id !== id);
  const nextRows = rows.filter((row) => row.source !== id && row.destination !== id);
  if (await saveRows(nextRows, customEngines)) {
    closeEditor();
  }
}

addButton.addEventListener("click", () => {
  closeEditor();
  rows.push({ source: "", destination: "google" });
  renderSettings();
  routesContainer.lastElementChild.querySelector("select").focus();
});
document.querySelector("#cancel-custom").addEventListener("click", closeEditor);
toggle.addEventListener("change", () => {
  saveSettings({ ...settings, enabled: toggle.checked });
});

async function loadSettings() {
  try {
    const saved = await chrome.storage.local.get(null);
    settings = ImageSearch.normalizeSettings(saved);
    rows = Object.entries(settings.routes).map(([source, destination]) => {
      return { source, destination };
    });
    setBusy(false);
    renderSettings();
  } catch {
    showError("Couldn't load your choices. Reopen this menu.");
  }
}

// A popup normally closes before another opens. Also keep separate settings
// windows current, without replacing a draft while our own save is in progress.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && !busy) {
    closeEditor();
    loadSettings();
  }
});
setBusy(true);
loadSettings();
