import {
  getUpcomingPrecipitation,
  buildTimeline,
  describePrecipitationStatus
} from './forecast.js';

const geocodeEndpoint = 'https://geocoding-api.open-meteo.com/v1/search';
const reverseGeocodeEndpoint = 'https://geocoding-api.open-meteo.com/v1/reverse';
const forecastEndpoint = 'https://api.open-meteo.com/v1/forecast';

const elements = {
  form: document.querySelector('#location-form'),
  input: document.querySelector('#location-input'),
  submitButton: document.querySelector('#location-form button[type="submit"]'),
  useLocation: document.querySelector('#use-location'),
  loading: document.querySelector('#loading-indicator'),
  forecastCard: document.querySelector('#forecast-card'),
  locationLabel: document.querySelector('#location-label'),
  statusChip: document.querySelector('#status-chip'),
  statusMessage: document.querySelector('#status-message'),
  statusIllustration: document.querySelector('#status-illustration'),
  statusDetails: document.querySelector('#status-details'),
  timelineList: document.querySelector('#timeline-list'),
  searchResults: document.querySelector('#search-results'),
  inputError: document.querySelector('#input-error')
};

function setLoading(isLoading) {
  elements.loading.hidden = !isLoading;
  elements.useLocation.disabled = isLoading;
  if (elements.submitButton) {
    elements.submitButton.disabled = isLoading;
  }
  if (elements.input) {
    elements.input.toggleAttribute('aria-busy', isLoading);
  }
}

function showError(message) {
  elements.inputError.textContent = message;
  elements.inputError.hidden = !message;
}

function clearSearchResults() {
  elements.searchResults.innerHTML = '';
}

function parseCoordinates(value) {
  if (!value) return null;
  const match = value
    .trim()
    .match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return { latitude, longitude };
  }
  return null;
}

function formatLocation(result) {
  if (!result) return '';
  const parts = [result.name];
  if (result.admin1 && result.admin1 !== result.name) {
    parts.push(result.admin1);
  }
  if (result.country) {
    parts.push(result.country);
  }
  return parts.join(', ');
}

async function geocode(query) {
  const params = new URLSearchParams({
    name: query,
    count: '5',
    language: 'en',
    format: 'json'
  });
  const response = await fetch(`${geocodeEndpoint}?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Geocoding failed');
  }
  const data = await response.json();
  return data.results ?? [];
}

const GENERIC_LABELS = new Set(['Your location', 'Selected location']);

async function reverseGeocode({ latitude, longitude }) {
  if (latitude == null || longitude == null) return null;
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    count: '1',
    language: 'en',
    format: 'json'
  });
  const response = await fetch(`${reverseGeocodeEndpoint}?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Reverse geocoding failed');
  }
  const data = await response.json();
  return data.results?.[0] ?? null;
}

async function resolveLocationLabel(location = {}) {
  const manualLabel = location.label?.trim();
  const isCoordinateLabel = manualLabel ? /^Lat\s-?\d+(?:\.\d+)?,\sLon\s-?\d+(?:\.\d+)?$/i.test(manualLabel) : false;
  if (manualLabel && !GENERIC_LABELS.has(manualLabel) && !isCoordinateLabel) {
    return manualLabel;
  }

  if (location.name) {
    return formatLocation(location);
  }

  if (location.latitude != null && location.longitude != null) {
    try {
      const place = await reverseGeocode(location);
      if (place) {
        return formatLocation(place);
      }
    } catch (error) {
      console.warn('Reverse geocoding failed', error);
    }
    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return `Lat ${latitude.toFixed(2)}, Lon ${longitude.toFixed(2)}`;
    }
  }

  return manualLabel || 'Selected location';
}

async function fetchForecast({ latitude, longitude }) {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    minutely_15: 'precipitation_probability,precipitation',
    hourly: 'precipitation_probability,precipitation,rain',
    timezone: 'auto'
  });
  const response = await fetch(`${forecastEndpoint}?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Unable to load forecast data');
  }
  return response.json();
}

function formatProbability(probability) {
  if (probability === null || probability === undefined) {
    return '—';
  }
  return `${Math.round(probability)}%`;
}

function formatPrecipitation(amount) {
  if (amount === null || amount === undefined) {
    return '—';
  }
  const rounded = amount < 0.1 ? amount.toFixed(2) : amount.toFixed(1);
  return `${rounded} mm`; // per 15 minutes
}

function describeIntensity(amount) {
  if (amount === null || amount === undefined) {
    return 'unknown';
  }
  if (amount < 0.2) return 'very light';
  if (amount < 1) return 'light';
  if (amount < 3) return 'moderate';
  if (amount < 7) return 'heavy';
  return 'torrential';
}

function formatTime(date, timezone) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone
  }).format(date);
}

function formatRelativeMinutes(minutes) {
  if (minutes <= 0) return 'now';
  if (minutes === 1) return '1 minute';
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  return `${hours}h ${remaining}m`;
}

function renderStatusDetails(result, timeline, { timezone }) {
  elements.statusDetails.innerHTML = '';

  if (result.status === 'rain-expected') {
    const details = [
      {
        term: 'Arrival',
        description: `${formatRelativeMinutes(result.minutesUntil)} (${formatTime(result.at, timezone)})`
      },
      {
        term: 'Intensity',
        description: `${formatPrecipitation(result.precipitation)} · ${describeIntensity(result.precipitation)}`
      },
      {
        term: 'Confidence',
        description: formatProbability(result.probability)
      }
    ];
    details.forEach(({ term, description }) => {
      const dt = document.createElement('dt');
      dt.textContent = term;
      const dd = document.createElement('dd');
      dd.textContent = description;
      elements.statusDetails.append(dt, dd);
    });
  } else if (result.status === 'clear-period') {
    const nextWet = timeline.find(entry => (entry.precipitation ?? 0) > 0.05 || (entry.probability ?? 0) > 50);
    const details = [
      {
        term: 'Dry window',
        description: `${formatRelativeMinutes(result.minutesAhead)} (within forecast horizon)`
      }
    ];
    if (nextWet) {
      details.push({
        term: 'Watch next',
        description: `${formatTime(nextWet.at, timezone)} · ${formatProbability(nextWet.probability)}`
      });
    }
    const highestProbability = timeline.reduce((max, entry) => Math.max(max, entry.probability ?? 0), 0);
    details.push({
      term: 'Highest chance soon',
      description: highestProbability ? `${Math.round(highestProbability)}%` : 'Very low'
    });

    details.forEach(({ term, description }) => {
      const dt = document.createElement('dt');
      dt.textContent = term;
      const dd = document.createElement('dd');
      dd.textContent = description;
      elements.statusDetails.append(dt, dd);
    });
  }
}

function renderTimeline(timeline, { timezone }) {
  elements.timelineList.innerHTML = '';
  if (!timeline.length) {
    const item = document.createElement('li');
    item.className = 'timeline__item';
    item.textContent = 'No minute-level data available right now.';
    elements.timelineList.append(item);
    return;
  }

  timeline.forEach(entry => {
    const item = document.createElement('li');
    const isRain = (entry.precipitation ?? 0) > 0.05 || (entry.probability ?? 0) > 40;
    item.className = `timeline__item${isRain ? ' timeline__item--rain' : ''}`;

    const timeLabel = document.createElement('span');
    timeLabel.className = 'timeline__label';
    timeLabel.textContent = formatTime(entry.at, timezone);

    const precip = document.createElement('span');
    precip.textContent = formatPrecipitation(entry.precipitation);

    const probability = document.createElement('span');
    probability.textContent = `${formatProbability(entry.probability)} chance`;

    item.append(timeLabel, precip, probability);
    elements.timelineList.append(item);
  });
}

function updateStatusChip(result) {
  if (!result || result.status === 'no-data') {
    elements.statusChip.hidden = false;
    elements.statusChip.className = 'status-chip';
    elements.statusChip.textContent = 'No data';
    return;
  }

  if (result.status === 'rain-expected') {
    elements.statusChip.hidden = false;
    elements.statusChip.className = 'status-chip is-rain';
    elements.statusChip.textContent = result.minutesUntil <= 1 ? 'Rain imminent' : 'Rain on the way';
    return;
  }

  if (result.status === 'clear-period') {
    elements.statusChip.hidden = false;
    elements.statusChip.className = 'status-chip is-clear';
    elements.statusChip.textContent = 'Staying dry';
    return;
  }

  elements.statusChip.hidden = true;
}

function updateStatusIllustration(result) {
  const baseClass = 'status-hero__icon';
  elements.statusIllustration.className = baseClass;

  if (!result || result.status === 'no-data') {
    elements.statusIllustration.classList.add('is-nodata');
    return;
  }

  if (result.status === 'rain-expected') {
    elements.statusIllustration.classList.add('is-rain');
    return;
  }

  if (result.status === 'clear-period') {
    elements.statusIllustration.classList.add('is-clear');
    return;
  }

  elements.statusIllustration.classList.add('is-nodata');
}

async function loadForecast(location) {
  try {
    setLoading(true);
    showError('');
    clearSearchResults();
    const [data, resolvedLabel] = await Promise.all([
      fetchForecast(location),
      resolveLocationLabel(location)
    ]);
    const now = new Date();
    const upcoming = getUpcomingPrecipitation(data.minutely_15, {
      now,
      utcOffsetSeconds: data.utc_offset_seconds
    });
    const message = describePrecipitationStatus(upcoming, { timezone: data.timezone });
    const timeline = buildTimeline(data.minutely_15, {
      now,
      utcOffsetSeconds: data.utc_offset_seconds,
      timelineEntries: 8
    });

    const displayLabel = resolvedLabel.trim();
    const tzAbbr = data.timezone_abbreviation ? ` · ${data.timezone_abbreviation}` : '';
    elements.locationLabel.textContent = `${displayLabel}${tzAbbr}`;
    elements.statusMessage.textContent = message;
    updateStatusChip(upcoming);
    updateStatusIllustration(upcoming);
    renderStatusDetails(upcoming, timeline, { timezone: data.timezone });
    renderTimeline(timeline, { timezone: data.timezone });
    elements.forecastCard.hidden = false;
  } catch (error) {
    console.error(error);
    showError('Sorry, something went wrong while loading the forecast. Please try again.');
  } finally {
    setLoading(false);
  }
}

async function handleSearch(event) {
  event.preventDefault();
  const value = elements.input.value.trim();
  if (!value) return;
  showError('');

  const coords = parseCoordinates(value);
  if (coords) {
    await loadForecast({
      ...coords,
      label: `Lat ${coords.latitude.toFixed(2)}, Lon ${coords.longitude.toFixed(2)}`
    });
    return;
  }

  try {
    setLoading(true);
    clearSearchResults();
    const results = await geocode(value);
    if (!results.length) {
      showError('No matching locations were found. Please try something else.');
      return;
    }

    if (results.length === 1) {
      await loadForecast({ ...results[0], label: formatLocation(results[0]) });
      return;
    }

    results.forEach(result => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'search-result';
      button.innerHTML = `<strong>${formatLocation(result)}</strong><span class="search-result__meta">Lat ${result.latitude.toFixed(
        2
      )}, Lon ${result.longitude.toFixed(2)}</span>`;
      button.addEventListener('click', () => loadForecast({ ...result, label: formatLocation(result) }));
      elements.searchResults.append(button);
    });
  } catch (error) {
    console.error(error);
    showError('Unable to find that place right now. Check your connection and try again.');
  } finally {
    setLoading(false);
  }
}

async function handleGeolocation() {
  if (!navigator.geolocation) {
    showError('Geolocation is not supported in this browser. Please search for a place instead.');
    return;
  }

  setLoading(true);
  showError('');
  clearSearchResults();
  elements.locationLabel.textContent = 'Locating you…';
  elements.statusMessage.textContent = 'Hang tight while we look up the closest rain radar.';
  elements.statusChip.hidden = true;
  updateStatusIllustration(null);
  elements.forecastCard.hidden = false;

  navigator.geolocation.getCurrentPosition(
    position => {
      const { latitude, longitude } = position.coords;
      loadForecast({ latitude, longitude, label: 'Your location' });
    },
    error => {
      console.error(error);
      showError('Unable to retrieve your location. Please allow access or search manually.');
      setLoading(false);
    },
    { enableHighAccuracy: true, timeout: 15000 }
  );
}

elements.form.addEventListener('submit', handleSearch);
elements.useLocation.addEventListener('click', handleGeolocation);

document.addEventListener('DOMContentLoaded', () => {
  elements.input.focus({ preventScroll: true });
});
