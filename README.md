# YOUTH NOW

A local dashboard for news, weather, disaster information, traffic headlines, music, and a prefecture quiz.

## Start locally

From the project directory, run:

```powershell
npm start
```

Then open `http://127.0.0.1:3000`. Keep the server terminal open while using the site.

## Public deployment

This app is a Node server, so it should be deployed to a service that supports a long-running Node process.

Recommended setup:

```powershell
$env:PORT = "3000"
$env:HOST = "0.0.0.0"
npm start
```

Then deploy the same command on a hosting provider such as Render, Railway, Fly.io, Azure App Service, or a VM.

> Important: the server now reads `HOST` and `PORT` from environment variables, so it can bind publicly instead of only on localhost.

## Project map

| Path | Purpose |
| --- | --- |
| `index.html` | Page structure and ordered browser script loading |
| `style.css` | CSS import entry point |
| `styles/` | Numbered stylesheet sections kept in cascade order |
| `features.css` | Styles for later feature additions; loaded after `style.css` |
| `scripts/` | Browser runtime and feature code; see `scripts/README.md` |
| `server.js` | Local HTTP server entry point |
| `server/routes.js` | API routing |
| `server/static.js` | Static asset delivery and its allowlist |
| `server/services/` | Upstream API integrations and data normalization |
| `sw.js` | Offline shell and network/cache policy |
| `manifest.webmanifest` | PWA name, colors, and install metadata |

## Keeping the project maintainable

- Preserve the script dependency order documented in `scripts/README.md`.
- Keep CSS imports in `style.css` in numeric order. Later files intentionally override earlier declarations.
- When adding a browser file, update `index.html`, the `server/static.js` allowlist, and `sw.js` shell cache.
- Keep API credentials in server environment variables, never in browser code or committed files.