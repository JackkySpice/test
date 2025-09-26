# SkyCast Enhancement Backlog

The following opportunities focus on improving overall reliability, UX polish, and accessibility without expanding the "MinuteCast" style surface that is already in place. These ideas are grouped by impact and effort to help prioritize future iterations.

## High-impact, moderate-effort

- **Offline-friendly retry states** – Persist the last successful forecast in `localStorage` and expose a "Retry" button when the Open-Meteo request fails, so users on unstable networks still see useful information.
- **Hourly fallback timeline** – When `minutely_15` data is absent, automatically hydrate the UI with the hourly rain outlook for the next few hours instead of showing a "No data" card.
- **Unit toggles** – Allow millimetres ↔ inches and probability ↔ qualitative phrases ("low", "medium"), remembering the user's choice for future visits.

## Medium-impact, low-effort

- **Input validation hints** – Surface inline helper text (e.g., "Try "City, Country" or "47.6, -122.3"") whenever the location field is empty or invalid, reducing trial-and-error.
- **Accessibility sweep** – Audit focus outlines, colour contrast, and announce timeline updates via ARIA live regions to better support screen reader and keyboard-only users.
- **Shareable deep links** – Encode the selected coordinates in the URL hash so users can bookmark or share a specific location without retyping it.

## Longer-term explorations

- **Radar overlay integration** – Embed a lightweight precipitation radar image (e.g., Rainviewer static tiles) to complement the textual summary when bandwidth allows.
- **Microcopy localisation** – Externalise strings and wire up a translation pipeline (starting with the languages supported by Open-Meteo) to broaden the global audience.
- **Progressive web app shell** – Add a minimal service worker to cache the app shell/assets, enabling installable and offline-first behaviour on mobile devices.

