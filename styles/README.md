# Stylesheet sections

`../style.css` is the stylesheet entry point. It imports these files in their original cascade order. Keep the imports in numeric order: later files contain intentional refinements and overrides used by the existing design.

| File | Source section |
| --- | --- |
| `01-foundation.css` | Base styles and early dashboard sections |
| `02-dashboard-sections.css` | Dashboard sections through the start of news styles |
| `03-news-pages.css` | News page and article presentation |
| `04-content-components.css` | Remaining content components and page details |
| `05-footer-responsive-theme.css` | Footer, responsive, and theme refinements |
| `06-editorial-system.css` | Editorial control-room visual system |
| `07-motion-overrides.css` | Motion interaction layer |
| `08-signature-refresh.css` | Signature visual refresh |
| `09-disaster-center.css` | Disaster center presentation |
| `10-live-widgets.css` | Motion system and live dashboard widgets |
| `11-field-notes.css` | Field-notes visual system |
| `12-motion-design.css` | Final motion and reduced-motion refinements |

When adding a stylesheet, append or place it where its cascade role belongs, then register it in the `publicFiles` set in `../server/routes.js` and the `SHELL_FILES` list in `../sw.js` for offline use.