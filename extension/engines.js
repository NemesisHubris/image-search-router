"use strict";

// Every built-in engine can be both a source site and an image destination.
const ImageSearch = (() => {
  const engines = [
    {
      id: "brave", name: "Brave", queryKey: "q",
      hosts: ["search.brave.com"],
      url: "https://search.brave.com/images?q={query}"
    },
    {
      id: "google", name: "Google", queryKey: "q",
      hosts: ["google.com", "www.google.com", "images.google.com"],
      url: "https://www.google.com/search?udm=2&q={query}"
    },
    {
      id: "bing", name: "Bing", queryKey: "q",
      hosts: ["bing.com", "www.bing.com"],
      url: "https://www.bing.com/images/search?q={query}"
    },
    {
      id: "duckduckgo", name: "DuckDuckGo", queryKey: "q",
      hosts: ["duckduckgo.com", "www.duckduckgo.com", "html.duckduckgo.com", "noai.duckduckgo.com"],
      url: "https://duckduckgo.com/?q={query}&iax=images&ia=images"
    },
    {
      id: "yahoo", name: "Yahoo", queryKey: "p",
      hosts: ["search.yahoo.com", "images.search.yahoo.com"],
      url: "https://images.search.yahoo.com/search/images?p={query}"
    },
    {
      id: "yandex", name: "Yandex", queryKey: "text",
      hosts: ["yandex.com", "www.yandex.com", "yandex.ru", "www.yandex.ru"],
      url: "https://yandex.com/images/search?text={query}"
    },
    {
      id: "startpage", name: "Startpage", queryKey: "query",
      hosts: ["startpage.com", "www.startpage.com"],
      url: "https://www.startpage.com/sp/search?cat=images&query={query}"
    },
    {
      id: "ecosia", name: "Ecosia", queryKey: "q",
      hosts: ["ecosia.org", "www.ecosia.org"],
      url: "https://www.ecosia.org/images?q={query}"
    },
    {
      id: "qwant", name: "Qwant", queryKey: "q",
      hosts: ["qwant.com", "www.qwant.com"],
      url: "https://www.qwant.com/?t=images&q={query}"
    },
    {
      id: "mojeek", name: "Mojeek", queryKey: "q",
      hosts: ["mojeek.com", "www.mojeek.com", "www.mojeek.co.uk"],
      url: "https://www.mojeek.com/search?q={query}&fmt=images"
    },
    {
      id: "kagi", name: "Kagi", queryKey: "q",
      hosts: ["kagi.com", "www.kagi.com"],
      url: "https://kagi.com/images?q={query}"
    }
  ];

  function validateCustomUrl(value) {
    const template = value.trim().replaceAll("%s", "{query}");
    if (!template.includes("{query}")) {
      throw new Error("Add {query} where the search words should go.");
    }

    let url;
    try {
      url = new URL(template.replaceAll("{query}", "image-search-placeholder"));
    } catch {
      throw new Error("Enter a full URL starting with https:// or http://.");
    }

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("The URL must start with https:// or http://.");
    }
    if (url.username || url.password) {
      throw new Error("Use a URL without a username or password.");
    }
    if (url.hostname.includes("image-search-placeholder")) {
      throw new Error("Put {query} after the website address, not inside it.");
    }
    return template;
  }

  function engineForHost(hostname) {
    return engines.find((engine) => engine.hosts.includes(hostname));
  }

  function normalizeSettings(saved) {
    const settings = {
      enabled: saved.enabled !== false,
      routes: { ...saved.routes },
      customEngines: Array.isArray(saved.customEngines) ? saved.customEngines : []
    };

    // Upgrades preserve the old Brave destination and the old custom URL.
    // Other source engines stay unchanged until the user chooses a destination.
    if (!saved.routes) {
      settings.routes = { brave: saved.engine || "google" };
      if (saved.engine === "custom" && saved.customUrl) {
        settings.customEngines = [{
          id: "custom-legacy", name: "My engine", url: saved.customUrl
        }];
        settings.routes.brave = "custom-legacy";
      }
    }
    return settings;
  }

  function destinationFor(query, destinationId, settings) {
    const choices = [...engines, ...settings.customEngines];
    const selected = choices.find((engine) => engine.id === destinationId);
    if (!selected) {
      return null;
    }

    const template = validateCustomUrl(selected.url);
    const encodedQuery = encodeURIComponent(query);
    return new URL(template.replaceAll("{query}", encodedQuery)).href;
  }

  // A template match tolerates extra tracking parameters, but requires the
  // engine's fixed parameters (for example categories=images) to stay intact.
  function queryFromTemplate(address, template) {
    const marker = "image-search-placeholder";
    const pattern = new URL(template.replaceAll("{query}", marker));
    const actual = new URL(address);
    if (actual.origin !== pattern.origin) {
      return null;
    }

    function matchPart(value, expected) {
      // Match URL punctuation literally; only the query placeholder can vary.
      const escaped = expected.split(marker).map((part) => {
        return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      });
      return value.match(new RegExp(`^${escaped.join("(.*?)")}$`));
    }

    const pathMatch = matchPart(actual.pathname, pattern.pathname);
    if (!pathMatch) {
      return null;
    }
    let query = null;
    if (pattern.pathname.includes(marker)) {
      try {
        query = decodeURIComponent(pathMatch[1]);
      } catch {
        return null;
      }
    }
    for (const [key, expected] of pattern.searchParams) {
      const value = actual.searchParams.get(key);
      if (value === null) {
        return null;
      }
      const match = matchPart(value, expected);
      if (!match) {
        return null;
      }
      if (expected.includes(marker)) {
        query = match[1];
      }
    }
    return query;
  }

  function customSourceFor(address, settings) {
    return settings.customEngines.find((engine) => {
      if (!engine.sourceUrl || !settings.routes[engine.id]) {
        return false;
      }
      return queryFromTemplate(address, engine.sourceUrl) !== null
        || queryFromTemplate(address, engine.url) !== null;
    });
  }

  function sourceOrigin(engine) {
    const url = new URL(engine.sourceUrl.replaceAll("{query}", "example"));
    return `${url.protocol}//${url.hostname}/*`;
  }

  return {
    engines,
    engineForHost,
    normalizeSettings,
    validateCustomUrl,
    destinationFor,
    queryFromTemplate,
    customSourceFor,
    sourceOrigin
  };
})();
