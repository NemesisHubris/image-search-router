(() => {
  "use strict";

  let source = null;

  const linkTitle = "Open images with your chosen engine in a new tab";
  const managedControls = new Map();
  let settings = null;
  let settingsRevision = 0;
  let scanScheduled = false;

  function restoreAttribute(control, name, originalValue, extensionValue) {
    if (control.getAttribute(name) !== extensionValue) {
      return;
    }
    if (originalValue === null) {
      control.removeAttribute(name);
    } else {
      control.setAttribute(name, originalValue);
    }
  }

  function restoreControl(control) {
    const original = managedControls.get(control);
    if (!original) {
      return;
    }
    restoreAttribute(control, "href", original.href, original.destination);
    restoreAttribute(control, "target", original.target, "_blank");
    restoreAttribute(control, "rel", original.rel, "noopener noreferrer");
    restoreAttribute(control, "title", original.title, linkTitle);
    managedControls.delete(control);
  }

  function updateControl(control) {
    const destinationId = source && settings?.routes[source.id];
    if (!settings?.enabled || !destinationId) {
      restoreControl(control);
      return;
    }

    const previous = managedControls.get(control);
    const stillOurLink = previous && control.getAttribute("href") === previous.destination;
    const originalHref = stillOurLink ? previous.href : control.getAttribute("href");

    if (!ImageSources.isImageControl(control, source, originalHref)) {
      restoreControl(control);
      return;
    }

    const query = ImageSources.queryFor(control, source, originalHref);
    if (!query || !query.trim()) {
      restoreControl(control);
      return;
    }

    let destination;
    try {
      destination = ImageSearch.destinationFor(query, destinationId, settings);
    } catch {
      restoreControl(control);
      return;
    }
    if (!destination) {
      restoreControl(control);
      return;
    }
    if (previous && previous.destination === destination && (stillOurLink || !control.matches('a'))) {
      return;
    }

    const original = previous || {
      href: control.getAttribute("href"),
      target: control.getAttribute("target"),
      rel: control.getAttribute("rel"),
      title: control.getAttribute("title")
    };
    original.href = originalHref;
    original.destination = destination;
    managedControls.set(control, original);

    if (control.matches('a')) {
      control.href = destination;
      control.target = "_blank";
      control.rel = "noopener noreferrer";
    }
    control.title = linkTitle;
  }

  function controlSelector() {
    const selectors = [ImageSources.controlSelector];
    if (source?.selector) {
      selectors.push(source.selector);
    }
    return selectors.join(", ");
  }

  function updateControls() {
    scanScheduled = false;
    if (settings) {
      source = ImageSearch.customSourceFor(window.location.href, settings)
        || ImageSearch.engineForHost(window.location.hostname);
    }
    for (const control of managedControls.keys()) {
      if (!control.isConnected) {
        restoreControl(control);
      }
    }
    for (const control of document.querySelectorAll(controlSelector())) {
      updateControl(control);
    }
  }

  function scheduleScan() {
    if (!scanScheduled) {
      scanScheduled = true;
      requestAnimationFrame(updateControls);
    }
  }

  function openImages(event) {
    if (!(event.target instanceof Element)) {
      return;
    }
    if (event.type === 'auxclick' && event.button !== 1) {
      return;
    }
    const control = event.target.closest(controlSelector());
    if (!control) {
      return;
    }

    // Recheck at click time, including links inserted just before the click.
    updateControl(control);
    const original = managedControls.get(control);
    if (!original) {
      return;
    }
    event.stopImmediatePropagation();

    if (!control.matches('a')) {
      event.preventDefault();
      window.open(original.destination, '_blank', 'noopener,noreferrer');
    }
    // Anchors keep native Enter, middle-click, and modifier-key behavior.
  }

  async function refreshSettings() {
    const revision = ++settingsRevision;
    try {
      const saved = await chrome.storage.local.get(null);
      if (revision !== settingsRevision) {
        return;
      }
      for (const control of managedControls.keys()) {
        restoreControl(control);
      }
      settings = ImageSearch.normalizeSettings(saved);
      updateControls();
    } catch (error) {
      console.warn("Image Search Router could not read its settings.", error);
    }
  }

  window.addEventListener('click', openImages, true);
  window.addEventListener('auxclick', openImages, true);
  window.addEventListener('popstate', scheduleScan);
  const observer = new MutationObserver(scheduleScan);
  observer.observe(document, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['href', 'aria-label', 'value']
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      refreshSettings();
    }
  });
  refreshSettings();
})();
