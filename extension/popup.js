"use strict";

const toggle = document.querySelector("#enabled");
const status = document.querySelector("#status");
const engineSelect = document.querySelector("#engine");
const customForm = document.querySelector("#custom-form");
const customUrl = document.querySelector("#custom-url");
const saveButton = customForm.querySelector("button");
const errorMessage = document.querySelector("#error");
let settings = { ...ImageSearch.defaults };

for (const engine of ImageSearch.engines) {
  engineSelect.add(new Option(engine.name, engine.id));
}
engineSelect.add(new Option("Custom…", "custom"));

function showError(message = "") {
  errorMessage.textContent = message;
  errorMessage.hidden = message.length === 0;
  customUrl.setAttribute("aria-invalid", String(message.length > 0));
}

function showStatus() {
  toggle.checked = settings.enabled;

  if (settings.enabled) {
    status.textContent = "On · Opens a new tab. Keeps Brave open.";
  } else {
    status.textContent = "Off · Images opens in Brave as usual.";
  }
}

function showSettings() {
  showStatus();
  engineSelect.value = settings.engine;
  customUrl.value = settings.customUrl;
  customForm.hidden = settings.engine !== "custom";
}

function setBusy(busy) {
  toggle.disabled = busy;
  engineSelect.disabled = busy;
  saveButton.disabled = busy;
}

async function saveSettings(changes) {
  setBusy(true);
  showError();

  try {
    await chrome.storage.local.set(changes);
    Object.assign(settings, changes);
    showSettings();
  } catch (error) {
    showSettings();
    showError("Couldn't save your settings. Please try again.");
    console.error(error);
  } finally {
    setBusy(false);
  }
}

toggle.addEventListener("change", () => {
  saveSettings({ enabled: toggle.checked });
});

engineSelect.addEventListener("change", () => {
  showError();
  customForm.hidden = engineSelect.value !== "custom";

  if (engineSelect.value === "custom") {
    customUrl.focus();
    status.textContent = "Enter your image search URL, then save it.";
    return;
  }

  saveSettings({ engine: engineSelect.value });
});

customForm.addEventListener("submit", (event) => {
  event.preventDefault();

  try {
    const template = ImageSearch.validateCustomUrl(customUrl.value);
    saveSettings({ engine: "custom", customUrl: template });
  } catch (error) {
    showError(error.message);
    customUrl.focus();
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  for (const key of Object.keys(ImageSearch.defaults)) {
    if (key in changes) {
      settings[key] = changes[key].newValue ?? ImageSearch.defaults[key];
    }
  }

  showSettings();
});

async function loadSettings() {
  try {
    settings = await chrome.storage.local.get(ImageSearch.defaults);
    showSettings();
    setBusy(false);
  } catch (error) {
    showError("Couldn't load your settings. Reopen this menu.");
    console.error(error);
  }
}

loadSettings();
