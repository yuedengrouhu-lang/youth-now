# Browser code organization

The browser code uses ordered classic scripts with `defer`. Top-level functions and state are shared through the page's global script scope, so script order in `index.html` is part of the application architecture.

## Shared runtime

| File | Responsibility |
| --- | --- |
| `config.js` | API paths, refresh intervals, and storage keys |
| `state.js` | Mutable page, feed, weather, disaster, and quiz state |
| `helpers.js` | DOM helpers, formatting, safe URL handling, and JSON requests |
| `dom.js` | Cached references to elements in `index.html` |
| `storage.js` | Local storage and saved preferences |

## Feature code

| File | Responsibility |
| --- | --- |
| `navigation.js` | Page and menu navigation |
| `news-data.js` | News normalization, loading, filtering, and article links |
| `news.js` | News cards, categories, home feed, and news events |
| `command-palette.js` | Keyboard navigation and in-site search |
| `topic-following.js` | Followed topics and topic-based ranking |
| `weather.js` | Weather codes, response normalization, and API loading |
| `weather-view.js` | Current conditions, hourly timeline, forecasts, and home card |
| `weather-location.js` | Location search, geolocation, and weather event bindings |
| `music.js` | Music search, previews, and favorites |
| `disaster.js` | Disaster feed normalization, retrieval, and event bindings |
| `disaster-view.js` | Alert, earthquake, tsunami, and home-card rendering |
| `map.js` | Leaflet map, earthquake markers, and shelter tiles |
| `intelligence.js` | Local impact, traffic headlines, notifications, condition score, and daily brief |
| `read-later.js` | Saved news articles |
| `dashboard-customizer.js` | Dashboard card visibility and order |
| `accessibility.js` | Text size, contrast, and motion preferences |
| `theme.js` | Theme selection |
| `pwa.js` | Service worker registration and installation prompt |
| `ai.js` | Site-aware chat and article summaries through the local server |
| `settings.js` | Settings and region selection |
| `quiz.js` | Internet-sourced prefecture quiz and local answer statistics |
| `app.js` | Startup, event setup, and refresh timers; always load last |

`index.html` shows the required loading order. Shared files load first, feature files load after them, `command-palette.js` loads before startup, and `app.js` remains last. Leaflet must load before `map.js`.

## Adding a browser asset

1. Add a script to `index.html` in dependency order.
2. Add the path to the `publicFiles` allowlist in `../server/static.js`.
3. Add offline shell assets to `../sw.js` and increment `SHELL_CACHE` when changing the app shell.
4. For CSS, add the path to the `style.css` import list in cascade order, then update both asset lists.

API endpoints are in `../server/routes.js`; upstream integrations and normalization are in `../server/services/`. The service worker does not serve cached disaster or traffic data as current information.

AI requests go through the Node server. Keep the API key in the server environment; an adult should manage the account and key. Never place the key in a browser script or commit it.