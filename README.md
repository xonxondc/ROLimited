# Roblox Trading & Catalog Price Tracker

Extension Chrome (Manifest V3) qui affiche l’**historique des prix** des objets Limiteds sur le site Roblox, les valeurs **Rolimon’s**, et des recommandations de la communauté YouTube.

## Fonctionnalités

- **Bouton flottant** « 📊 Price History » sur les pages catalogue (`roblox.com/catalog/...`)
- **Panel latéral** avec :
  - RAP (Recent Average Price)
  - Lowest Ask
  - Value Rolimon’s + Demand / Trend
  - Badges Rare / Projected / Hyped
  - Alerte DEAL si le Lowest Ask est significativement sous le RAP
  - **Graphique d’historique des prix** (données officielles Roblox `resale-data`)
  - Conseils communautaires + liens vers Rolimon’s Deals
  - Section **YouTube** avec recherche rapide + chaînes populaires (PiggyTrades, Launtori, highlywanted, Cleon…)
- Cache intelligent des données Rolimon’s (rafraîchissement via le popup)
- Compatible navigation SPA de Roblox

## Installation (mode développeur)

1. Ouvre Chrome → `chrome://extensions`
2. Active le **Mode développeur** (en haut à droite)
3. Clique sur **Charger l’extension non empaquetée**
4. Sélectionne le dossier `roblox-price-tracker-extension`
5. Va sur une page Limited, ex. :  
   https://www.roblox.com/catalog/21070012/Dominus-Empyreus  
   et clique sur le bouton flottant en bas à droite.

## Notes importantes

- L’endpoint officiel `economy.roblox.com/.../resale-data` fonctionne très bien pour les **Limiteds classiques**.  
  Pour certains nouveaux items (système CollectibleItem), l’historique peut être vide (limitation Roblox).
- Les données **Value / Demand / Trend** viennent de Rolimon’s (rate-limit ~1 requête/minute → cache de 5 min).
- L’extension ne stocke aucune donnée personnelle et ne demande pas de login.
- Les recommandations YouTube sont des chaînes populaires de la communauté trading ; fais toujours tes propres recherches avant d’acheter/trader.

## Structure

```
roblox-price-tracker-extension/
├── manifest.json
├── background.js          # Service worker + cache Rolimon’s
├── content.js             # Injection panel + logique
├── styles.css
├── popup.html / popup.js
├── chart.min.js           # Chart.js
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## Améliorations possibles

- Support du nouvel endpoint CollectibleItem resale-data
- Watchlist d’items + notifications de prix
- Intégration plus poussée des deals live Rolimon’s
- Thème clair / options personnalisables

---

Créé pour la communauté trading Roblox.  
Non affilié à Roblox Corporation ni à Rolimon’s.
