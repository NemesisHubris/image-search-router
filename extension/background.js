"use strict";

importScripts("engines.js");

// Serialize updates so a slow permission check cannot restore an older route.
let pendingUpdate = Promise.resolve();

async function synchronizeSources() {
  const saved = await chrome.storage.local.get(null);
  const settings = ImageSearch.normalizeSettings(saved);
  const origins = new Set();
  for (const engine of settings.customEngines) {
    if (!engine.sourceUrl || !settings.routes[engine.id]) {
      continue;
    }
    const origin = ImageSearch.sourceOrigin(engine);
    if (await chrome.permissions.contains({ origins: [origin] })) {
      origins.add(origin);
    }
  }

  const id = "custom-sources";
  const registered = await chrome.scripting.getRegisteredContentScripts({ ids: [id] });
  if (origins.size === 0) {
    if (registered.length > 0) {
      await chrome.scripting.unregisterContentScripts({ ids: [id] });
    }
    return;
  }

  const script = {
    id,
    matches: [...origins],
    // Built-in sites already load these files through the manifest.
    excludeMatches: chrome.runtime.getManifest().content_scripts[0].matches,
    js: ["engines.js", "sources.js", "content.js"],
    runAt: "document_start",
    persistAcrossSessions: true
  };
  if (registered.length > 0) {
    await chrome.scripting.updateContentScripts([script]);
  } else {
    await chrome.scripting.registerContentScripts([script]);
  }
}

function queueUpdate() {
  pendingUpdate = pendingUpdate.catch(() => {}).then(synchronizeSources);
  return pendingUpdate;
}

function updateAfterEvent() {
  queueUpdate().catch((error) => {
    console.error("Could not update custom search sites.", error);
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") {
    updateAfterEvent();
  }
});
chrome.permissions.onAdded.addListener(updateAfterEvent);
chrome.permissions.onRemoved.addListener(updateAfterEvent);
chrome.runtime.onInstalled.addListener(updateAfterEvent);
chrome.runtime.onStartup.addListener(updateAfterEvent);
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message.type !== "syncCustomSources") {
    return;
  }
  queueUpdate().then(
    () => respond({ ok: true }),
    (error) => respond({ ok: false, error: error.message })
  );
  return true;
});
