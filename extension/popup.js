"use strict";

const toggle = document.querySelector("#enabled");
const status = document.querySelector("#status");
const routesContainer = document.querySelector("#routes");
const customList = document.querySelector("#custom-engines");
const customForm = document.querySelector("#custom-form");
const customName = document.querySelector("#custom-name");
const customUrl = document.querySelector("#custom-url");
const errorMessage = document.querySelector("#error");
const selectors = new Map();
let settings = null;
let busy = true;
let readRevision = 0;

function showError(message = "") {
  errorMessage.textContent = message;
  errorMessage.hidden = !message;
}

function setBusy(value) {
  busy = value;
  for (const control of document.querySelectorAll('input, select, button')) {
    control.disabled = value;
  }
}

function renderSettings() {
  toggle.checked = settings.enabled;
  status.textContent = settings.enabled
    ? "Opens a new tab. Keeps your search open."
    : "Off · Original image searches stay in place.";

  for (const source of ImageSearch.engines) {
    const select = selectors.get(source.id);
    select.replaceChildren(new Option("Keep original", ""));
    const choices = [...ImageSearch.engines, ...settings.customEngines];
    for (const destination of choices) {
      if (destination.id !== source.id) {
        select.add(new Option(destination.name, destination.id));
      }
    }
    select.value = settings.routes[source.id] || "";
    if (select.selectedIndex === -1) {
      select.value = "";
    }
  }

  customList.replaceChildren();
  for (const engine of settings.customEngines) {
    const item = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = engine.name;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Remove';
    remove.className = 'remove-engine';
    remove.setAttribute('aria-label', `Remove ${engine.name}`);
    remove.addEventListener('click', () => removeCustomEngine(engine.id));
    item.append(name, remove);
    customList.append(item);
  }
  setBusy(busy);
}

async function saveSettings(nextSettings) {
  setBusy(true);
  showError();
  try {
    // One write keeps custom engines and the routes referencing them consistent.
    await chrome.storage.local.set(nextSettings);
    settings = nextSettings;
    renderSettings();
    return true;
  } catch (error) {
    renderSettings();
    showError("Couldn't save your choices. Please try again.");
    console.error(error);
    return false;
  } finally {
    setBusy(false);
  }
}

for (const source of ImageSearch.engines) {
  const row = document.createElement('label');
  row.className = 'route-row';
  const name = document.createElement('span');
  name.textContent = source.name;
  const select = document.createElement('select');
  select.id = `route-${source.id}`;
  select.setAttribute('aria-label', `${source.name} image destination`);
  select.disabled = true;
  select.addEventListener('change', () => {
    const routes = { ...settings.routes };
    if (select.value) {
      routes[source.id] = select.value;
    } else {
      delete routes[source.id];
    }
    saveSettings({ ...settings, routes });
  });
  row.append(name, select);
  routesContainer.append(row);
  selectors.set(source.id, select);
}

toggle.addEventListener('change', () => {
  saveSettings({ ...settings, enabled: toggle.checked });
});

customForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  showError();
  try {
    const name = customName.value.trim();
    if (!name) {
      throw new Error("Give your image engine a name.");
    }
    const choices = [...ImageSearch.engines, ...settings.customEngines];
    if (choices.some((engine) => engine.name.toLowerCase() === name.toLowerCase())) {
      throw new Error("That name is already in use. Choose another name.");
    }
    const engine = {
      id: `custom-${crypto.randomUUID()}`,
      name,
      url: ImageSearch.validateCustomUrl(customUrl.value)
    };
    const customEngines = [...settings.customEngines, engine];
    if (await saveSettings({ ...settings, customEngines })) {
      customForm.reset();
      status.textContent = "Engine added. Choose it in any search engine row.";
    }
  } catch (error) {
    showError(error.message);
  }
});

function removeCustomEngine(id) {
  const customEngines = settings.customEngines.filter((engine) => engine.id !== id);
  const routes = { ...settings.routes };
  for (const source of Object.keys(routes)) {
    if (routes[source] === id) {
      delete routes[source];
    }
  }
  saveSettings({ ...settings, routes, customEngines });
}

async function loadSettings() {
  const revision = ++readRevision;
  try {
    const saved = await chrome.storage.local.get(null);
    if (revision !== readRevision) {
      return;
    }
    settings = ImageSearch.normalizeSettings(saved);
    renderSettings();
    setBusy(false);
  } catch (error) {
    showError("Couldn't load your choices. Reopen this menu.");
    console.error(error);
  }
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    loadSettings();
  }
});
setBusy(true);
loadSettings();
