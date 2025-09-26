# SkyCast Minute Rain Watch

SkyCast is a responsive, mobile-first web app that turns the Open-Meteo nowcast API into a friendly "is it going to rain soon?" dashboard. Enter an address (or allow geolocation) and SkyCast highlights when precipitation is likely to begin within the next couple of hours, including intensity estimates and a quarter-hour timeline.

## ✨ Features

- **Minute-style rain outlook** – highlights the first upcoming 15-minute slot with meaningful precipitation or probability.
- **Friendly status summaries** – clearly communicates whether rain is imminent or if a dry window is ahead.
- **Detailed timeline** – renders the next two hours of precipitation probability and intensity for quick scanning.
- **Geolocation + search** – use the browser's location services or search for any place worldwide via Open-Meteo's geocoder.
- **Responsive UI** – gradient glassmorphism design tuned for phones, tablets, and desktops.

## 🚀 Quick start

This project is 100% static, so no build step is required.

```bash
npm install  # optional; no runtime dependencies
npm run test # executes deterministic unit tests for the forecast logic
```

To preview locally, open `index.html` in any modern browser or serve the folder with your preferred static server (e.g. `npx serve`).

## ✅ Tests

The included `node:test` suite focuses on the data-processing helpers that power the UI messaging (time conversions, precipitation detection, timeline shaping). Run the tests locally:

```bash
npm run test
```

## ☁️ One-click deploy

Deploy the site to Netlify with a single click after pushing this repository to GitHub (or another git provider supported by Netlify):

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPOSITORY_NAME)

> 🔁 Replace `YOUR_GITHUB_USERNAME/YOUR_REPOSITORY_NAME` with the actual repository slug once it lives on GitHub. Netlify will detect the static site, apply the included `netlify.toml`, and publish automatically.

## 🧭 Environment variables

None required. All requests go directly from the browser to the Open-Meteo APIs.

## 📝 Notes

- The app uses the `minutely_15` endpoint to emulate a minute-by-minute rain experience (in 15-minute increments). If Open-Meteo ever exposes finer granularity, adjust the `minutely` parameters in `src/main.js`.
- Open-Meteo responses are timezone-aware. We convert every timestamp using the provided offset to ensure countdowns stay accurate regardless of the viewer's timezone.
