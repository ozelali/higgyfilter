"use strict";

const sites = document.querySelector("#sites");
const status = document.querySelector("#status");
const prefix = "paused:";

async function render() {
  try {
    const preferences = await chrome.storage.local.get(null);
    const pausedKeys = Object.keys(preferences)
      .filter(key => key.startsWith(prefix) && preferences[key] === true)
      .sort();
    const rows = pausedKeys.map(key => {
      const row = document.createElement("li");
      const site = document.createElement("span");
      site.textContent = key.slice(prefix.length);
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Resume filtering";
      button.setAttribute("aria-label", `Resume filtering on ${site.textContent}`);
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          await chrome.storage.local.remove(key);
        } catch {
          button.disabled = false;
          status.textContent = "Could not resume filtering. Try again.";
        }
      });
      row.append(site, button);
      return row;
    });
    sites.replaceChildren(...rows);
    status.textContent = rows.length ? "" : "Filtering is active on all supported sites.";
  } catch {
    status.textContent = "Could not load your site preferences.";
  }
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && Object.keys(changes).some(key => key.startsWith(prefix))) void render();
});
void render();
