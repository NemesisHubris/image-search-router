"use strict";

// Site-specific recognition lives here; routing and storage stay in content.js.
const ImageSources = (() => {
  const controlSelector = 'a[href], button, [role="tab"], input[type="submit"]';
  const navigationSelector = [
    'nav', 'header', '[role="navigation"]', '[role="tablist"]',
    '#hdtb', '#top_nav', '#primary-tabs', '.search-nav', '.search_nav',
    '.search-filters', '.search-tabs', '.tabs', '.navigation'
  ].join(', ');

  const directSelectors = {
    brave: '#primary-tabs a[href*="/images"]',
    bing: '#b-scopeListItem-images a, .b_scopebar a[href*="/images"]',
    duckduckgo: '[data-zci-link="images"], [data-testid="images-tab"]',
    qwant: '[data-testid="imagesNavItem"], [data-click-label="tab_bar_item_images"]',
    startpage: '[data-testid="images-tab"], button[value="images"]',
    ecosia: '[data-test-id="images-tab"], [data-test-id="images-link"]'
  };

  function isImageUrl(url, source) {
    const linkedEngine = ImageSearch.engineForHost(url.hostname);
    if (!linkedEngine || linkedEngine.id !== source.id) {
      return false;
    }

    const parameters = url.searchParams;
    switch (source.id) {
      case 'google':
        return parameters.get('udm') === '2' || parameters.get('tbm') === 'isch';
      case 'duckduckgo':
        return parameters.get('ia') === 'images' || parameters.get('iax') === 'images';
      case 'startpage':
        return parameters.get('cat') === 'images';
      case 'qwant':
        return parameters.get('t') === 'images';
      case 'mojeek':
        return parameters.get('fmt') === 'images' || url.pathname === '/images';
      default:
        return url.pathname === '/images' || url.pathname.startsWith('/images/')
          || (source.id === 'yahoo' && url.pathname.startsWith('/search/images'));
    }
  }

  function isImageControl(control, source, originalHref) {
    const directSelector = directSelectors[source.id];
    if (directSelector && control.matches(directSelector)) {
      return true;
    }

    const text = control.textContent.trim().toLowerCase();
    const label = (control.getAttribute('aria-label') || '').toLowerCase();
    const saysImages = ['images', 'image', 'bilder', 'imágenes', 'immagini', 'afbeeldingen'].includes(text)
      || label === 'images';
    const inNavigation = control.closest(navigationSelector);

    if (control.matches('a[href]')) {
      const url = new URL(originalHref || control.href, window.location.href);
      return isImageUrl(url, source) && Boolean(inNavigation || saysImages);
    }

    // Startpage and some responsive layouts use a button instead of an anchor.
    return Boolean(inNavigation && saysImages);
  }

  function queryFor(control, source, originalHref) {
    if (control.matches('a[href]')) {
      const url = new URL(originalHref || control.href, window.location.href);
      const query = url.searchParams.get(source.queryKey);
      if (query !== null) {
        return query;
      }
    }

    const pageUrl = new URL(window.location.href);
    const pageQuery = pageUrl.searchParams.get(source.queryKey);
    if (pageQuery !== null) {
      return pageQuery;
    }

    // POST-based search pages may keep the query only in their search field.
    const input = document.querySelector(`input[name="${source.queryKey}"], textarea[name="${source.queryKey}"]`);
    return input ? input.value : '';
  }

  return { controlSelector, isImageControl, queryFor };
})();
