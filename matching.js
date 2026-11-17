"use strict";

globalThis.HiggyFilterMatching = (() => {
  const brand = /(?<![\p{L}\p{N}])higgs[\s._-]*field(?![\p{L}\p{N}])/iu;
  const account = /(?<![\p{L}\p{N}])@?higgsfield(?:ai|_ai)(?![\p{L}\p{N}])/iu;

  function mentionsBrand(value) {
    return typeof value === "string" &&
      (brand.test(value.normalize("NFKC")) || account.test(value.normalize("NFKC")));
  }

  function youtubeVideoId(href) {
    const url = new URL(href, "https://www.youtube.com");
    if (url.origin !== "https://www.youtube.com") return null;
    const id = url.pathname === "/watch"
      ? url.searchParams.get("v")
      : url.pathname.match(/^\/shorts\/([\w-]+)\/?$/)?.[1];
    return /^[\w-]{11}$/.test(id ?? "") ? id : null;
  }

  function playerResponse(html) {
    const assignment = /\bytInitialPlayerResponse\s*=\s*(\{)/g;
    for (const match of html.matchAll(assignment)) {
      const start = match.index + match[0].length - 1;
      let depth = 0;
      let quoted = false;
      let escaped = false;
      for (let index = start; index < html.length; index += 1) {
        const char = html[index];
        if (quoted) {
          if (escaped) escaped = false;
          else if (char === "\\") escaped = true;
          else if (char === '"') quoted = false;
        } else if (char === '"') {
          quoted = true;
        } else if (char === "{") {
          depth += 1;
        } else if (char === "}" && --depth === 0) {
          try {
            return JSON.parse(html.slice(start, index + 1));
          } catch {
            break;
          }
        }
      }
    }
    return null;
  }

  function matchWatchPage(html, expectedId) {
    const details = playerResponse(html)?.videoDetails;
    if (details?.videoId !== expectedId) return null;
    const signals = [details.title, details.author, details.shortDescription, ...(details.keywords ?? [])];
    if (signals.some(mentionsBrand)) return true;
    return typeof details.shortDescription === "string" ? false : null;
  }

  return { mentionsBrand, youtubeVideoId, matchWatchPage };
})();
