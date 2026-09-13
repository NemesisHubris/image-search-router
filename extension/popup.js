"use strict";

const toggle = document.querySelector("#enabled");
const status = document.querySelector("#status");
let enabled = true;

function showSetting(value) {
  enabled = value;
  toggle.checked = value;

  if (value) {
    status.textContent = "On · Opens a new tab. Keeps Brave open.";
  } else {
    status.textContent = "Off · Images opens in Brave as usual.";
  }
}

async function loadSetting() {
  try {
    const settings = await chrome.storage.local.get({ enabled: true });
    showSetting(settings.enabled !== false);
    toggle.disabled = false;
  } catch (error) {
    status.textContent = "Couldn't load your setting. Reopen this menu.";
    console.error(error);
  }
}

toggle.addEventListener("change", async () => {
  const previousSetting = enabled;
  const nextSetting = toggle.checked;
  toggle.disabled = true;

  try {
    await chrome.storage.local.set({ enabled: nextSetting });
    showSetting(nextSetting);
  } catch (error) {
    showSetting(previousSetting);
    status.textContent = "Couldn't save your setting. Please try again.";
    console.error(error);
  } finally {
    toggle.disabled = false;
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.enabled) {
    showSetting(changes.enabled.newValue !== false);
  }
});

loadSetting();
