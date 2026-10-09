// Roblox Trading & Catalog Price Tracker - Content Script

(function () {
  "use strict";

  const ASSET_ID_REGEX = /\/catalog\/(\d+)/;
  let panel = null;
  let chartInstance = null;

  function getAssetId() {
    const match = window.location.pathname.match(ASSET_ID_REGEX);
    return match ? match[1] : null;
  }

  function formatNumber(num) {
    if (num == null || isNaN(num)) return "N/A";
    return Number(num).toLocaleString("en-US");
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" });
  }

  function demandLabel(val) {
    const map = { "-1": "—", "0": "Terrible", "1": "Low", "2": "Normal", "3": "High", "4": "Amazing" };
    return map[String(val)] || "—";
  }

  function trendLabel(val) {
    const map = { "-1": "—", "0": "↓ Lowering", "1": "Unstable", "2": "Stable", "3": "↑ Raising", "4": "Fluctuating" };
    return map[String(val)] || "—";
  }

  function createPanel() {
    if (panel) return panel;

    panel = document.createElement("div");
    panel.id = "rpt-panel";
    panel.innerHTML = `
      <div class="rpt-header">
        <div class="rpt-title">
          <span class="rpt-logo">📊</span>
          <span>Price Tracker</span>
        </div>
        <button class="rpt-close" title="Fermer">×</button>
      </div>
      <div class="rpt-body">
        <div class="rpt-loading">Chargement des données...</div>
        <div class="rpt-content" style="display:none;">
          <div class="rpt-stats"></div>
          <div class="rpt-chart-container">
            <canvas id="rpt-price-chart"></canvas>
          </div>
          <div class="rpt-deals">
            <h3>🔥 Meilleures affaires (communauté)</h3>
            <div class="rpt-deals-list"></div>
          </div>
          <div class="rpt-youtube">
            <h3>📺 Recommandations YouTube</h3>
            <div class="rpt-yt-list"></div>
          </div>
          <div class="rpt-links">
            <a href="#" class="rpt-link" id="rpt-rolimons-link" target="_blank">Voir sur Rolimon's</a>
            <a href="https://www.rolimons.com/deals" class="rpt-link" target="_blank">Toutes les deals</a>
          </div>
        </div>
        <div class="rpt-error" style="display:none;"></div>
      </div>
    `;

    document.body.appendChild(panel);

    panel.querySelector(".rpt-close").addEventListener("click", () => {
      panel.classList.remove("rpt-open");
    });

    return panel;
  }

  function showToggleButton() {
    let btn = document.getElementById("rpt-toggle");
    if (btn) return btn;

    btn = document.createElement("button");
    btn.id = "rpt-toggle";
    btn.innerHTML = "📊 Price History";
    btn.title = "Ouvrir le Price Tracker";
    btn.addEventListener("click", () => {
      const p = createPanel();
      p.classList.add("rpt-open");
      loadData();
    });
    document.body.appendChild(btn);
    return btn;
  }

  async function loadData() {
    const assetId = getAssetId();
    if (!assetId) return;

    const content = panel.querySelector(".rpt-content");
    const loading = panel.querySelector(".rpt-loading");
    const errorEl = panel.querySelector(".rpt-error");

    loading.style.display = "block";
    content.style.display = "none";
    errorEl.style.display = "none";

    try {
      // Parallel fetches
      const [resaleRes, catalogRes, roliRes] = await Promise.all([
        new Promise(resolve => {
          chrome.runtime.sendMessage({ action: "getResaleData", assetId }, resolve);
        }),
        new Promise(resolve => {
          chrome.runtime.sendMessage({ action: "getCatalogDetails", assetId }, resolve);
        }),
        new Promise(resolve => {
          chrome.runtime.sendMessage({ action: "getRolimonsItem", assetId }, resolve);
        })
      ]);

      const resale = resaleRes?.success ? resaleRes.data : null;
      const catalog = catalogRes?.success ? catalogRes.data : null;
      const roliRaw = roliRes?.success ? roliRes.item : null;

      // Parse Rolimon's array format: [Name, Acronym, RAP, Value, DefaultValue, Demand, Trend, Projected, Hyped, Rare]
      let roli = null;
      if (roliRaw && Array.isArray(roliRaw)) {
        roli = {
          name: roliRaw[0],
          acronym: roliRaw[1],
          rap: roliRaw[2],
          value: roliRaw[3],
          demand: roliRaw[5],
          trend: roliRaw[6],
          projected: roliRaw[7] === 1,
          hyped: roliRaw[8] === 1,
          rare: roliRaw[9] === 1
        };
      }

      renderStats(resale, catalog, roli, assetId);
      renderChart(resale);
      renderDeals(assetId, roli);
      renderYouTube(assetId, roli?.name || catalog?.name);

      // Links
      const rolimonsLink = panel.querySelector("#rpt-rolimons-link");
      rolimonsLink.href = `https://www.rolimons.com/item/${assetId}`;

      loading.style.display = "none";
      content.style.display = "block";
    } catch (err) {
      console.error("[RPT]", err);
      loading.style.display = "none";
      errorEl.style.display = "block";
      errorEl.textContent = "Erreur lors du chargement des données. Réessayez plus tard.";
    }
  }

  function renderStats(resale, catalog, roli, assetId) {
    const container = panel.querySelector(".rpt-stats");
    const rap = resale?.recentAveragePrice ?? roli?.rap ?? catalog?.recentAveragePrice;
    const lowest = catalog?.lowestResalePrice ?? catalog?.lowestPrice;
    const value = roli?.value > 0 ? roli.value : null;
    const original = resale?.originalPrice;

    let badges = "";
    if (roli?.rare) badges += `<span class="rpt-badge rare">Rare</span>`;
    if (roli?.projected) badges += `<span class="rpt-badge projected">Projected</span>`;
    if (roli?.hyped) badges += `<span class="rpt-badge hyped">Hyped</span>`;

    container.innerHTML = `
      <div class="rpt-stat-grid">
        <div class="rpt-stat">
          <div class="rpt-stat-label">RAP</div>
          <div class="rpt-stat-value">${formatNumber(rap)}</div>
        </div>
        <div class="rpt-stat">
          <div class="rpt-stat-label">Lowest Ask</div>
          <div class="rpt-stat-value">${formatNumber(lowest)}</div>
        </div>
        <div class="rpt-stat">
          <div class="rpt-stat-label">Value (Rolimon's)</div>
          <div class="rpt-stat-value">${value ? formatNumber(value) : "N/A"}</div>
        </div>
        <div class="rpt-stat">
          <div class="rpt-stat-label">Original Price</div>
          <div class="rpt-stat-value">${formatNumber(original)}</div>
        </div>
      </div>
      ${roli ? `
        <div class="rpt-meta">
          <span>Demand: <strong>${demandLabel(roli.demand)}</strong></span>
          <span>Trend: <strong>${trendLabel(roli.trend)}</strong></span>
          ${badges}
        </div>
      ` : ""}
      ${lowest && rap && lowest < rap * 0.85 ? `
        <div class="rpt-deal-alert">
          ⚡ Possible DEAL ! Lowest Ask est ${Math.round((1 - lowest / rap) * 100)}% sous le RAP
        </div>
      ` : ""}
    `;
  }

  function renderChart(resale) {
    const canvas = document.getElementById("rpt-price-chart");
    if (!canvas || !resale?.priceDataPoints?.length) {
      if (canvas) {
        canvas.parentElement.innerHTML = `<p class="rpt-no-data">Pas d'historique de prix disponible pour cet item (nouvelles Limiteds CollectibleItem ou données insuffisantes).</p>`;
      }
      return;
    }

    // Load Chart.js if needed
    if (typeof Chart === "undefined") {
      const script = document.createElement("script");
      script.src = chrome.runtime.getURL("chart.min.js");
      script.onload = () => drawChart(canvas, resale);
      document.head.appendChild(script);
    } else {
      drawChart(canvas, resale);
    }
  }

  function drawChart(canvas, resale) {
    const points = resale.priceDataPoints
      .slice()
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const labels = points.map(p => formatDate(p.date));
    const prices = points.map(p => p.value);

    if (chartInstance) {
      chartInstance.destroy();
    }

    chartInstance = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Prix de revente (RAP history)",
          data: prices,
          borderColor: "#00b2ff",
          backgroundColor: "rgba(0, 178, 255, 0.15)",
          fill: true,
          tension: 0.3,
          pointRadius: 2,
          pointHoverRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${formatNumber(ctx.raw)} R$`
            }
          }
        },
        scales: {
          x: {
            ticks: { maxTicksLimit: 8, color: "#aaa" },
            grid: { color: "rgba(255,255,255,0.05)" }
          },
          y: {
            ticks: {
              color: "#aaa",
              callback: v => formatNumber(v)
            },
            grid: { color: "rgba(255,255,255,0.08)" }
          }
        }
      }
    });
  }

  function renderDeals(assetId, roli) {
    const list = panel.querySelector(".rpt-deals-list");
    // Community-style recommendations based on simple heuristics + links
    const tips = [];

    if (roli) {
      if (roli.demand >= 3 && roli.trend >= 2) {
        tips.push(`🔥 Haute demande + tendance stable/hausse → bon item pour hold ou trade up.`);
      }
      if (roli.projected) {
        tips.push(`⚠️ Item Projected : la Value peut être gonflée. Vérifie les preuves de trade.`);
      }
      if (roli.rare) {
        tips.push(`💎 Rare (< ~100 copies) → liquidité plus faible, valeur potentiellement plus élevée.`);
      }
    }

    tips.push(`Consulte les deals live sur <a href="https://www.rolimons.com/deals" target="_blank">Rolimon's Deals</a>.`);
    tips.push(`Compare toujours Lowest Ask vs RAP avant d'acheter.`);

    list.innerHTML = tips.map(t => `<div class="rpt-deal-item">${t}</div>`).join("");
  }

  function renderYouTube(assetId, itemName) {
    const list = panel.querySelector(".rpt-yt-list");
    const searchQuery = encodeURIComponent(`Roblox limited ${itemName || assetId} trade deal`);

    // Popular Roblox trading channels (community recommendations)
    const channels = [
      { name: "PiggyTrades", url: "https://www.youtube.com/@PiggyTrades", desc: "Analyses marché & lives" },
      { name: "Launtori", url: "https://www.youtube.com/@Launtori", desc: "Guides trading & deals" },
      { name: "highlywanted", url: "https://www.youtube.com/@highlywanted", desc: "Sales idéales & stratégies" },
      { name: "Cleon", url: "https://www.youtube.com/@Cleon113", desc: "Best limiteds & tips" }
    ];

    list.innerHTML = `
      <div class="rpt-yt-search">
        <a href="https://www.youtube.com/results?search_query=${searchQuery}" target="_blank" class="rpt-btn">
          🔍 Chercher des vidéos sur cet item
        </a>
      </div>
      <div class="rpt-channels">
        ${channels.map(c => `
          <a href="${c.url}" target="_blank" class="rpt-channel">
            <strong>${c.name}</strong>
            <span>${c.desc}</span>
          </a>
        `).join("")}
      </div>
      <p class="rpt-note">Les recommandations YouTube sont des chaînes populaires de la communauté trading. Toujours faire ses propres recherches.</p>
    `;
  }

  // Init
  function init() {
    const assetId = getAssetId();
    if (!assetId) return;

    // Wait a bit for page to settle
    setTimeout(() => {
      showToggleButton();
    }, 1500);
  }

  // Handle SPA navigation
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      if (panel) {
        panel.classList.remove("rpt-open");
      }
      const oldBtn = document.getElementById("rpt-toggle");
      if (oldBtn) oldBtn.remove();
      init();
    }
  }).observe(document, { subtree: true, childList: true });

  init();
})();
