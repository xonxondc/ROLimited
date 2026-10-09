// Background service worker - caches Rolimon's data and handles API requests

const ROLIMONS_ITEMS_URL = "https://www.rolimons.com/itemapi/itemdetails";
const CACHE_KEY = "rolimons_items_cache";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function fetchRolimonsItems() {
  try {
    const response = await fetch(ROLIMONS_ITEMS_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data.success && data.items) {
      await chrome.storage.local.set({
        [CACHE_KEY]: {
          data: data.items,
          timestamp: Date.now()
        }
      });
      return data.items;
    }
  } catch (err) {
    console.error("[RPT] Failed to fetch Rolimon's items:", err);
  }
  return null;
}

async function getRolimonsItem(assetId) {
  const result = await chrome.storage.local.get(CACHE_KEY);
  const cache = result[CACHE_KEY];

  if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
    return cache.data[String(assetId)] || null;
  }

  // Refresh cache
  const items = await fetchRolimonsItems();
  if (items) {
    return items[String(assetId)] || null;
  }

  // Fallback to stale cache
  if (cache) {
    return cache.data[String(assetId)] || null;
  }
  return null;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getRolimonsItem") {
    getRolimonsItem(request.assetId).then(item => {
      sendResponse({ success: true, item });
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true; // async
  }

  if (request.action === "refreshRolimons") {
    fetchRolimonsItems().then(items => {
      sendResponse({ success: !!items });
    });
    return true;
  }

  if (request.action === "getResaleData") {
    fetch(`https://economy.roblox.com/v1/assets/${request.assetId}/resale-data`)
      .then(r => r.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === "getCatalogDetails") {
    fetch(`https://catalog.roblox.com/v1/catalog/items/${request.assetId}/details?itemType=Asset`)
      .then(r => r.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

// Pre-fetch on install / startup
chrome.runtime.onInstalled.addListener(() => {
  fetchRolimonsItems();
});

chrome.runtime.onStartup.addListener(() => {
  fetchRolimonsItems();
});
