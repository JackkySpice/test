import {
  getUpcomingPrecipitation,
  buildTimeline,
  describePrecipitationStatus,
  buildHourlyFallback
} from './forecast.js';

const STORAGE_KEYS = {
  preferences: 'skycast:preferences',
  lastForecast: 'skycast:lastForecast',
  locale: 'skycast:locale'
};

const DEFAULT_PREFERENCES = {
  precipitationUnit: 'mm',
  probabilityDisplay: 'percent'
};

const TRANSLATIONS = {
  en: {
    'app.title': 'SkyCast',
    'app.tagline': 'Hyperlocal rain alerts powered by Open-Meteo',
    'input.title': 'Check your sky',
    'input.description': 'Search for a place or use your current location to see minute-by-minute rain expectations.',
    'input.label': 'City, address or coordinates',
    'input.placeholder': 'Try “Berlin”, “New York”, or “48.85, 2.35”',
    'input.search': 'Search',
    'input.useLocation': 'Use my location',
    'input.hint.empty': 'Enter a city, region, or coordinates like “47.6, -122.3”.',
    'input.hint.example': 'Try “City, Country” or “47.6, -122.3”.',
    'input.hint.coordinates': 'Looks like coordinates — tap search to load that spot.',
    'loading.message': 'Fetching forecast…',
    'features.precip': 'Minute-by-minute rain probabilities',
    'features.arrival': 'Smart arrival estimates for the next showers',
    'features.timeline': 'Plan ahead with a curated 2 hour timeline',
    'forecast.title': 'Rain outlook',
    'preferences.precip': 'Rain',
    'preferences.probability': 'Chance',
    'preferences.language': 'Language',
    'preferences.mm': 'mm',
    'preferences.in': 'inches',
    'preferences.percent': '%',
    'preferences.qualitative': 'Low/High',
    'preferences.english': 'English',
    'preferences.spanish': 'Español',
    'timeline.title': 'Next 2 hours snapshot',
    'timeline.noMinute': 'No minute-level data available right now.',
    'timeline.hourlyFallback': 'Minute data is unavailable; showing hourly trend.',
    'timeline.hourlyTag': 'Hourly',
    'radar.title': 'Radar overlay',
    'radar.caption':
      'Radar imagery courtesy of <a href="https://www.rainviewer.com" target="_blank" rel="noopener">Rainviewer</a>.',
    'radar.alt': 'Precipitation radar centered on {location}',
    'footer.copy':
      'Data by <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a>. For best results allow location access so we can center the forecast near you.',
    'offline.retry': 'Retry',
    'offline.messageOffline': 'You appear to be offline.',
    'offline.messageError': 'We couldn’t reach the weather service.',
    'offline.storedAt': 'Showing saved forecast from {time}.',
    'offline.noStored': 'No saved forecast is available yet.',
    'offline.backOnline': 'Back online. Refresh for the latest rain outlook.',
    'errors.geocode': 'Unable to find that place right now. Check your connection and try again.',
    'errors.forecast': 'Sorry, something went wrong while loading the forecast. Please try again.',
    'errors.geolocationUnsupported': 'Geolocation is not supported in this browser. Please search for a place instead.',
    'errors.geolocation': 'Unable to retrieve your location. Please allow access or search manually.',
    'errors.noResults': 'No matching locations were found. Please try something else.',
    'status.noData': 'Weather data is currently unavailable.',
    'status.rainImminent': 'Rain is starting any minute now.',
    'status.rainSoon': 'Rain expected in about {duration} (around {time}).',
    'status.clear': 'No rain expected for at least {duration}.',
    'chip.noData': 'No data',
    'chip.rainImminent': 'Rain imminent',
    'chip.rainSoon': 'Rain on the way',
    'chip.clear': 'Staying dry',
    'details.arrival': 'Arrival',
    'details.intensity': 'Intensity',
    'details.confidence': 'Confidence',
    'details.dryWindow': 'Dry window',
    'details.dryWindowValue': '{duration} (within forecast horizon)',
    'details.watchNext': 'Watch next',
    'details.highestChance': 'Highest chance soon',
    'details.hourlyFallback': 'Using hourly outlook while minute data is unavailable.',
    'format.missing': '—',
    'format.percentSuffix': '%',
    'format.chanceSuffix': 'chance',
    'format.perHour': 'per hr',
    'units.mm': 'mm',
    'units.in': 'in',
    'probability.low': 'Low chance',
    'probability.medium': 'Medium chance',
    'probability.high': 'High chance',
    'probability.veryHigh': 'Very high chance',
    'intensity.unknown': 'unknown',
    'intensity.veryLight': 'very light',
    'intensity.light': 'light',
    'intensity.moderate': 'moderate',
    'intensity.heavy': 'heavy',
    'intensity.torrential': 'torrential',
    'time.now': 'now',
    'time.soon': 'soon',
    'time.minute': '1 minute',
    'time.minutes': '{value} minutes',
    'time.hour': '1 hour',
    'time.hours': '{value} hours',
    'time.day': '1 day',
    'time.days': '{value} days',
    'time.hoursMinutes': '{hours}h {minutes}m',
    'time.daysHours': '{days}d {hours}h',
    'time.nowShort': 'now',
    'time.minuteShort': '1 min',
    'time.minutesShort': '{value} min',
    'time.hourShort': '1 hr',
    'time.hoursShort': '{value} hr',
    'time.hoursMinutesShort': '{hours}h {minutes}m',
    'geo.locating': 'Locating you…',
    'geo.message': 'Hang tight while we look up the closest rain radar.'
  },
  es: {
    'app.title': 'SkyCast',
    'app.tagline': 'Alertas de lluvia hiperlocales con Open-Meteo',
    'input.title': 'Consulta tu cielo',
    'input.description': 'Busca un lugar o usa tu ubicación actual para ver la lluvia minuto a minuto.',
    'input.label': 'Ciudad, dirección o coordenadas',
    'input.placeholder': 'Prueba “Berlín”, “Madrid” o “48.85, 2.35”',
    'input.search': 'Buscar',
    'input.useLocation': 'Usar mi ubicación',
    'input.hint.empty': 'Introduce una ciudad, región o coordenadas como “47.6, -122.3”.',
    'input.hint.example': 'Prueba “Ciudad, País” o “47.6, -122.3”.',
    'input.hint.coordinates': 'Parece un par de coordenadas. Pulsa buscar para cargar ese punto.',
    'loading.message': 'Obteniendo pronóstico…',
    'features.precip': 'Probabilidades de lluvia minuto a minuto',
    'features.arrival': 'Estimaciones inteligentes de llegada de la lluvia',
    'features.timeline': 'Planifica con una línea de tiempo de 2 horas',
    'forecast.title': 'Panorama de lluvia',
    'preferences.precip': 'Lluvia',
    'preferences.probability': 'Probabilidad',
    'preferences.language': 'Idioma',
    'preferences.mm': 'mm',
    'preferences.in': 'pulgadas',
    'preferences.percent': '%',
    'preferences.qualitative': 'Baja/Alta',
    'preferences.english': 'English',
    'preferences.spanish': 'Español',
    'timeline.title': 'Próximas 2 horas',
    'timeline.noMinute': 'No hay datos por minuto disponibles ahora.',
    'timeline.hourlyFallback': 'Sin datos por minuto; mostramos la tendencia por hora.',
    'timeline.hourlyTag': 'Por hora',
    'radar.title': 'Radar de precipitación',
    'radar.caption':
      'Imágenes de radar cortesía de <a href="https://www.rainviewer.com" target="_blank" rel="noopener">Rainviewer</a>.',
    'radar.alt': 'Radar de precipitación centrado en {location}',
    'footer.copy':
      'Datos de <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a>. Para mejores resultados permite el acceso a tu ubicación.',
    'offline.retry': 'Reintentar',
    'offline.messageOffline': 'Parece que estás sin conexión.',
    'offline.messageError': 'No pudimos contactar con el servicio meteorológico.',
    'offline.storedAt': 'Mostrando el pronóstico guardado de {time}.',
    'offline.noStored': 'Aún no hay un pronóstico guardado disponible.',
    'offline.backOnline': 'Conexión restablecida. Actualiza para ver la última lluvia.',
    'errors.geocode': 'No encontramos ese lugar. Comprueba tu conexión e inténtalo de nuevo.',
    'errors.forecast': 'Ocurrió un problema al cargar el pronóstico. Vuelve a intentarlo.',
    'errors.geolocationUnsupported': 'Tu navegador no admite geolocalización. Busca un lugar manualmente.',
    'errors.geolocation': 'No pudimos obtener tu ubicación. Permite el acceso o busca manualmente.',
    'errors.noResults': 'No se encontraron ubicaciones coincidentes. Prueba otra búsqueda.',
    'status.noData': 'Los datos meteorológicos no están disponibles ahora.',
    'status.rainImminent': 'La lluvia comenzará en cualquier momento.',
    'status.rainSoon': 'Lluvia prevista en {duration} (alrededor de las {time}).',
    'status.clear': 'Sin lluvia prevista durante al menos {duration}.',
    'chip.noData': 'Sin datos',
    'chip.rainImminent': 'Lluvia inminente',
    'chip.rainSoon': 'Lluvia en camino',
    'chip.clear': 'Se mantiene seco',
    'details.arrival': 'Llegada',
    'details.intensity': 'Intensidad',
    'details.confidence': 'Confianza',
    'details.dryWindow': 'Ventana seca',
    'details.dryWindowValue': '{duration} (dentro del horizonte del pronóstico)',
    'details.watchNext': 'Atento a',
    'details.highestChance': 'Mayor probabilidad próxima',
    'details.hourlyFallback': 'Usamos el pronóstico por hora mientras no haya datos por minuto.',
    'format.missing': '—',
    'format.percentSuffix': '%',
    'format.chanceSuffix': 'probabilidad',
    'format.perHour': 'por hora',
    'units.mm': 'mm',
    'units.in': 'pulg',
    'probability.low': 'Probabilidad baja',
    'probability.medium': 'Probabilidad media',
    'probability.high': 'Probabilidad alta',
    'probability.veryHigh': 'Probabilidad muy alta',
    'intensity.unknown': 'desconocida',
    'intensity.veryLight': 'muy ligera',
    'intensity.light': 'ligera',
    'intensity.moderate': 'moderada',
    'intensity.heavy': 'intensa',
    'intensity.torrential': 'torrencial',
    'time.now': 'ahora',
    'time.soon': 'pronto',
    'time.minute': '1 minuto',
    'time.minutes': '{value} minutos',
    'time.hour': '1 hora',
    'time.hours': '{value} horas',
    'time.day': '1 día',
    'time.days': '{value} días',
    'time.hoursMinutes': '{hours}h {minutes}m',
    'time.daysHours': '{days}d {hours}h',
    'time.nowShort': 'ahora',
    'time.minuteShort': '1 min',
    'time.minutesShort': '{value} min',
    'time.hourShort': '1 h',
    'time.hoursShort': '{value} h',
    'time.hoursMinutesShort': '{hours}h {minutes}m',
    'geo.locating': 'Buscando tu ubicación…',
    'geo.message': 'Un momento mientras buscamos el radar más cercano.'
  }
};

function safeParse(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('Unable to parse stored value', error);
    return null;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Unable to persist value', error);
  }
}

function readStorage(key) {
  try {
    return safeParse(window.localStorage.getItem(key));
  } catch (error) {
    return null;
  }
}

function detectInitialLocale() {
  const stored = readStorage(STORAGE_KEYS.locale);
  if (stored && TRANSLATIONS[stored]) return stored;
  const navLocale = navigator.language?.slice(0, 2).toLowerCase();
  if (navLocale && TRANSLATIONS[navLocale]) {
    return navLocale;
  }
  return 'en';
}

const elements = {
  form: document.querySelector('#location-form'),
  input: document.querySelector('#location-input'),
  inputHint: document.querySelector('#input-hint'),
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
  inputError: document.querySelector('#input-error'),
  unitPrecipitation: document.querySelector('#unit-precipitation'),
  unitProbability: document.querySelector('#unit-probability'),
  languageSelect: document.querySelector('#language-select'),
  offlineBanner: document.querySelector('#offline-banner'),
  offlineMessage: document.querySelector('#offline-message'),
  retryButton: document.querySelector('#retry-button'),
  radar: document.querySelector('#radar'),
  radarImage: document.querySelector('#radar-image')
};

const state = {
  locale: detectInitialLocale(),
  preferences: { ...DEFAULT_PREFERENCES, ...readStorage(STORAGE_KEYS.preferences) },
  lastForecast: readStorage(STORAGE_KEYS.lastForecast),
  lastLocation: null,
  currentRecord: null,
  settingHash: false
};

if (!state.preferences.precipitationUnit) {
  state.preferences.precipitationUnit = DEFAULT_PREFERENCES.precipitationUnit;
}
if (!state.preferences.probabilityDisplay) {
  state.preferences.probabilityDisplay = DEFAULT_PREFERENCES.probabilityDisplay;
}

if (state.lastForecast?.location) {
  state.lastLocation = {
    latitude: state.lastForecast.location.latitude,
    longitude: state.lastForecast.location.longitude,
    label: state.lastForecast.location.label || state.lastForecast.resolvedLabel
  };
}

function getLocaleStrings(locale = state.locale) {
  return TRANSLATIONS[locale] ?? TRANSLATIONS.en;
}

function translate(key, replacements = {}) {
  const strings = getLocaleStrings();
  const fallback = getLocaleStrings('en');
  const template = strings[key] ?? fallback[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, token) => {
    if (Object.prototype.hasOwnProperty.call(replacements, token)) {
      return replacements[token];
    }
    return match;
  });
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    element.textContent = translate(key);
  });
  document.querySelectorAll('[data-i18n-html]').forEach(element => {
    const key = element.getAttribute('data-i18n-html');
    element.innerHTML = translate(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    element.setAttribute('placeholder', translate(key));
  });
}

function saveLocale(locale) {
  writeStorage(STORAGE_KEYS.locale, locale);
}

function savePreferences() {
  writeStorage(STORAGE_KEYS.preferences, state.preferences);
}

function persistLastForecast(record) {
  writeStorage(STORAGE_KEYS.lastForecast, record);
}

function setLoading(isLoading) {
  elements.loading.hidden = !isLoading;
  elements.useLocation.disabled = isLoading;
  if (elements.submitButton) {
    elements.submitButton.disabled = isLoading;
  }
  if (elements.input) {
    elements.input.toggleAttribute('aria-busy', isLoading);
  }
  updateRetryButtonState();
}

function showError(message) {
  elements.inputError.textContent = message;
  elements.inputError.hidden = !message;
}

function showInputHint(key) {
  if (!key) {
    elements.inputHint.textContent = '';
    return;
  }
  elements.inputHint.textContent = translate(key);
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
  return parts.filter(Boolean).join(', ');
}

function geocodeLanguage() {
  return state.locale ?? 'en';
}

async function geocode(query) {
  const params = new URLSearchParams({
    name: query,
    count: '5',
    language: geocodeLanguage(),
    format: 'json'
  });
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`);
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
    language: geocodeLanguage(),
    format: 'json'
  });
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?${params.toString()}`);
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
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Unable to load forecast data');
  }
  return response.json();
}

function formatProbability(probability) {
  if (probability === null || probability === undefined) {
    return translate('format.missing');
  }
  if (state.preferences.probabilityDisplay === 'qualitative') {
    if (probability < 20) return translate('probability.low');
    if (probability < 50) return translate('probability.medium');
    if (probability < 75) return translate('probability.high');
    return translate('probability.veryHigh');
  }
  return `${Math.round(probability)}${translate('format.percentSuffix')}`;
}

function formatPrecipitation(amount) {
  if (amount === null || amount === undefined) {
    return translate('format.missing');
  }
  if (state.preferences.precipitationUnit === 'in') {
    const inches = amount * 0.0393701;
    const rounded = inches < 0.1 ? inches.toFixed(3) : inches.toFixed(2);
    return `${rounded} ${translate('units.in')}`;
  }
  const rounded = amount < 0.1 ? amount.toFixed(2) : amount.toFixed(1);
  return `${rounded} ${translate('units.mm')}`;
}

function describeIntensity(amount) {
  if (amount === null || amount === undefined) {
    return translate('intensity.unknown');
  }
  if (amount < 0.2) return translate('intensity.veryLight');
  if (amount < 1) return translate('intensity.light');
  if (amount < 3) return translate('intensity.moderate');
  if (amount < 7) return translate('intensity.heavy');
  return translate('intensity.torrential');
}

function formatTime(date, timezone) {
  return new Intl.DateTimeFormat(state.locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone
  }).format(date);
}

function buildDurationStrings() {
  return {
    noData: translate('status.noData'),
    rainImminent: translate('status.rainImminent'),
    rainSoon: translate('status.rainSoon'),
    clear: translate('status.clear'),
    duration: {
      now: translate('time.now'),
      soon: translate('time.soon'),
      minute: translate('time.minute'),
      minutes: translate('time.minutes'),
      hour: translate('time.hour'),
      hours: translate('time.hours'),
      day: translate('time.day'),
      days: translate('time.days'),
      hoursMinutes: translate('time.hoursMinutes'),
      daysHours: translate('time.daysHours')
    }
  };
}

function formatRelativeMinutes(minutes) {
  if (minutes <= 0) return translate('time.nowShort');
  if (minutes === 1) return translate('time.minuteShort');
  if (minutes < 60) {
    return translate('time.minutesShort', { value: minutes });
  }
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) {
    if (hours === 1) {
      return translate('time.hourShort');
    }
    return translate('time.hoursShort', { value: hours });
  }
  return translate('time.hoursMinutesShort', { hours, minutes: remaining });
}

function renderStatusDetails(result, timeline, { timezone, source }) {
  elements.statusDetails.innerHTML = '';

  const details = [];
  if (result?.status === 'rain-expected') {
    details.push({
      term: translate('details.arrival'),
      description: `${formatRelativeMinutes(result.minutesUntil)} (${formatTime(result.at, timezone)})`
    });
    details.push({
      term: translate('details.intensity'),
      description: `${formatPrecipitation(result.precipitation)} · ${describeIntensity(result.precipitation)}`
    });
    details.push({
      term: translate('details.confidence'),
      description: formatProbability(result.probability)
    });
  } else if (result?.status === 'clear-period') {
    const nextWet = timeline.find(entry => (entry.precipitation ?? 0) > 0.05 || (entry.probability ?? 0) > 50);
    details.push({
      term: translate('details.dryWindow'),
      description: translate('details.dryWindowValue', {
        duration: formatRelativeMinutes(result.minutesAhead)
      })
    });
    if (nextWet) {
      details.push({
        term: translate('details.watchNext'),
        description: `${formatTime(nextWet.at, timezone)} · ${formatProbability(nextWet.probability)}`
      });
    }
    const highestProbability = timeline.reduce((max, entry) => Math.max(max, entry.probability ?? 0), 0);
    details.push({
      term: translate('details.highestChance'),
      description: highestProbability ? `${Math.round(highestProbability)}${translate('format.percentSuffix')}` : translate('probability.low')
    });
  }

  if (source === 'hourly') {
    details.push({
      term: translate('timeline.hourlyTag'),
      description: translate('details.hourlyFallback')
    });
  }

  details.forEach(({ term, description }) => {
    const dt = document.createElement('dt');
    dt.textContent = term;
    const dd = document.createElement('dd');
    dd.textContent = description;
    elements.statusDetails.append(dt, dd);
  });
}

function renderTimeline(timeline, { timezone, source }) {
  elements.timelineList.innerHTML = '';
  if (!timeline.length) {
    const item = document.createElement('li');
    item.className = 'timeline__item timeline__item--note';
    item.textContent = translate('timeline.noMinute');
    elements.timelineList.append(item);
    return;
  }

  if (source === 'hourly') {
    const note = document.createElement('li');
    note.className = 'timeline__item timeline__item--note';
    note.textContent = translate('timeline.hourlyFallback');
    elements.timelineList.append(note);
  }

  timeline.forEach(entry => {
    const item = document.createElement('li');
    const isRain = (entry.precipitation ?? 0) > 0.05 || (entry.probability ?? 0) > 40;
    item.className = `timeline__item${isRain ? ' timeline__item--rain' : ''}`;

    const timeLabel = document.createElement('span');
    timeLabel.className = 'timeline__label';
    timeLabel.textContent = formatTime(entry.at, timezone);

    const precip = document.createElement('span');
    const precipitationLabel = formatPrecipitation(entry.precipitation);
    if (entry.interval === 'hour' && precipitationLabel !== translate('format.missing')) {
      precip.textContent = `${precipitationLabel} · ${translate('format.perHour')}`;
    } else {
      precip.textContent = precipitationLabel;
    }

    const probability = document.createElement('span');
    const probabilityLabel = formatProbability(entry.probability);
    if (state.preferences.probabilityDisplay === 'percent' && probabilityLabel !== translate('format.missing')) {
      probability.textContent = `${probabilityLabel} ${translate('format.chanceSuffix')}`;
    } else {
      probability.textContent = probabilityLabel;
    }

    item.append(timeLabel, precip, probability);
    elements.timelineList.append(item);
  });
}

function updateStatusChip(result) {
  if (!result || result.status === 'no-data') {
    elements.statusChip.hidden = false;
    elements.statusChip.className = 'status-chip';
    elements.statusChip.textContent = translate('chip.noData');
    return;
  }

  if (result.status === 'rain-expected') {
    elements.statusChip.hidden = false;
    elements.statusChip.className = 'status-chip is-rain';
    elements.statusChip.textContent = result.minutesUntil <= 1 ? translate('chip.rainImminent') : translate('chip.rainSoon');
    return;
  }

  if (result.status === 'clear-period') {
    elements.statusChip.hidden = false;
    elements.statusChip.className = 'status-chip is-clear';
    elements.statusChip.textContent = translate('chip.clear');
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

function latLonToTile(latitude, longitude, zoom) {
  const latRad = (latitude * Math.PI) / 180;
  const n = 2 ** zoom;
  const x = Math.floor(((longitude + 180) / 360) * n);
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x: Math.min(Math.max(x, 0), n - 1), y: Math.min(Math.max(y, 0), n - 1) };
}

function updateRadar(location) {
  if (!elements.radar || !elements.radarImage) return;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!location || location.latitude == null || location.longitude == null || connection?.saveData) {
    elements.radar.hidden = true;
    elements.radarImage.src = '';
    return;
  }

  const zoom = 6;
  const { x, y } = latLonToTile(location.latitude, location.longitude, zoom);
  const src = `https://tilecache.rainviewer.com/v2/radar/nowcast_0/256/${zoom}/${x}/${y}/2/1_1.png`;
  elements.radarImage.src = src;
  elements.radarImage.alt = translate('radar.alt', { location: elements.locationLabel.textContent || translate('radar.title') });
  elements.radar.hidden = false;
}

function formatStoredTimestamp(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat(state.locale, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function updateOfflineBanner(config) {
  if (!elements.offlineBanner) return;
  if (!config) {
    elements.offlineBanner.hidden = true;
    if (elements.retryButton) {
      elements.retryButton.hidden = true;
    }
    updateRetryButtonState();
    return;
  }
  elements.offlineMessage.textContent = config.message;
  if (elements.retryButton) {
    elements.retryButton.hidden = !config.showRetry;
  }
  updateRetryButtonState();
  elements.offlineBanner.hidden = false;
}

function updateRetryButtonState() {
  if (!elements.retryButton) return;
  const canRetry = !!state.lastLocation && !elements.retryButton.hidden;
  elements.retryButton.disabled = !canRetry;
}

function renderForecast(record, { isCached = false, skipBanner = false } = {}) {
  if (!record) return;
  const { data, resolvedLabel, location, fetchedAt } = record;
  const now = new Date();
  let status = getUpcomingPrecipitation(data.minutely_15, {
    now,
    utcOffsetSeconds: data.utc_offset_seconds
  });
  let timeline = buildTimeline(data.minutely_15, {
    now,
    utcOffsetSeconds: data.utc_offset_seconds,
    timelineEntries: 8
  });
  let source = 'minutely';

  if ((!timeline.length || status.status === 'no-data') && data.hourly) {
    const fallback = buildHourlyFallback(data.hourly, {
      now,
      utcOffsetSeconds: data.utc_offset_seconds,
      timelineEntries: 8
    });
    if (fallback.timeline.length) {
      timeline = fallback.timeline;
      status = fallback.status;
      source = 'hourly';
    }
  }

  const tzAbbr = data.timezone_abbreviation ? ` · ${data.timezone_abbreviation}` : '';
  elements.locationLabel.textContent = `${resolvedLabel}${tzAbbr}`;
  const statusMessage = describePrecipitationStatus(status, {
    timezone: data.timezone,
    strings: buildDurationStrings()
  });
  elements.statusMessage.textContent = statusMessage;
  updateStatusChip(status);
  updateStatusIllustration(status);
  renderStatusDetails(status, timeline, { timezone: data.timezone, source });
  renderTimeline(timeline, { timezone: data.timezone, source });
  elements.forecastCard.hidden = false;
  updateRadar(location);

  if (!skipBanner) {
    if (isCached) {
      const stored = formatStoredTimestamp(fetchedAt);
      const base = navigator.onLine ? translate('offline.messageError') : translate('offline.messageOffline');
      const message = `${base} ${translate('offline.storedAt', { time: stored })}`;
      updateOfflineBanner({ message, showRetry: true });
    } else {
      updateOfflineBanner(null);
    }
  }

  state.currentRecord = { record, status, source, isCached };
}

function persistAndRender(record) {
  state.lastForecast = record;
  state.lastLocation = {
    latitude: record.location.latitude,
    longitude: record.location.longitude,
    label: record.location.label || record.resolvedLabel
  };
  persistLastForecast(record);
  renderForecast(record, { isCached: false });
  updateRetryButtonState();
}

function handleForecastFailure(error) {
  console.error(error);
  const offline = !navigator.onLine;
  const cached = state.lastForecast;
  if (cached) {
    renderForecast(cached, { isCached: true });
    return;
  }
  const base = offline ? translate('offline.messageOffline') : translate('offline.messageError');
  updateOfflineBanner({ message: `${base} ${translate('offline.noStored')}`, showRetry: true });
  elements.forecastCard.hidden = true;
}

function setLocale(locale) {
  if (!TRANSLATIONS[locale]) return;
  state.locale = locale;
  saveLocale(locale);
  applyTranslations();
  if (elements.languageSelect) {
    elements.languageSelect.value = locale;
  }
  if (state.currentRecord) {
    renderForecast(state.currentRecord.record, {
      isCached: state.currentRecord.isCached,
      skipBanner: true
    });
  }
  const currentValue = elements.input.value.trim();
  if (!currentValue) {
    showInputHint('input.hint.empty');
  } else if (parseCoordinates(currentValue)) {
    showInputHint('input.hint.coordinates');
  } else {
    showInputHint('input.hint.example');
  }

  if (state.currentRecord?.isCached) {
    const stored = formatStoredTimestamp(state.currentRecord.record.fetchedAt);
    const base = navigator.onLine ? translate('offline.messageError') : translate('offline.messageOffline');
    updateOfflineBanner({
      message: `${base} ${translate('offline.storedAt', { time: stored })}`,
      showRetry: true
    });
  } else if (!navigator.onLine) {
    updateOfflineBanner({ message: translate('offline.messageOffline'), showRetry: !!state.lastLocation });
  } else {
    updateOfflineBanner(null);
  }
}

function setProbabilityDisplay(value) {
  state.preferences.probabilityDisplay = value;
  savePreferences();
  if (state.currentRecord) {
    renderForecast(state.currentRecord.record, {
      isCached: state.currentRecord.isCached,
      skipBanner: true
    });
  }
}

function setPrecipitationUnit(value) {
  state.preferences.precipitationUnit = value;
  savePreferences();
  if (state.currentRecord) {
    renderForecast(state.currentRecord.record, {
      isCached: state.currentRecord.isCached,
      skipBanner: true
    });
  }
}

function parseLocationHash() {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const latitude = Number(params.get('lat'));
  const longitude = Number(params.get('lon'));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  const label = params.get('label') ?? undefined;
  return { latitude, longitude, label };
}

function updateLocationHash(location, resolvedLabel) {
  state.settingHash = true;
  const params = new URLSearchParams();
  if (location.latitude != null && location.longitude != null) {
    params.set('lat', location.latitude.toFixed(4));
    params.set('lon', location.longitude.toFixed(4));
  }
  if (resolvedLabel) {
    params.set('label', resolvedLabel);
  }
  const url = `${window.location.pathname}${window.location.search}#${params.toString()}`;
  window.history.replaceState(null, '', url);
  setTimeout(() => {
    state.settingHash = false;
  }, 0);
}

async function loadForecast(location) {
  if (!location || location.latitude == null || location.longitude == null) return;
  state.lastLocation = { ...location };
  setLoading(true);
  showError('');
  showInputHint('');
  clearSearchResults();
  try {
    const [data, resolvedLabel] = await Promise.all([
      fetchForecast(location),
      resolveLocationLabel(location)
    ]);
    const record = {
      data,
      resolvedLabel: resolvedLabel.trim(),
      location: {
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        label: location.label || resolvedLabel
      },
      fetchedAt: Date.now()
    };
    persistAndRender(record);
    updateLocationHash(location, record.resolvedLabel);
  } catch (error) {
    showError(translate('errors.forecast'));
    handleForecastFailure(error);
  } finally {
    setLoading(false);
  }
}

function handleSearch(event) {
  event.preventDefault();
  const value = elements.input.value.trim();
  if (!value) {
    showInputHint('input.hint.empty');
    return;
  }
  showError('');
  showInputHint('');

  const coords = parseCoordinates(value);
  if (coords) {
    loadForecast({
      ...coords,
      label: `Lat ${coords.latitude.toFixed(2)}, Lon ${coords.longitude.toFixed(2)}`
    });
    return;
  }

  (async () => {
    try {
      setLoading(true);
      clearSearchResults();
      const results = await geocode(value);
      if (!results.length) {
        showError(translate('errors.noResults'));
        showInputHint('input.hint.example');
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
        button.innerHTML = `<strong>${formatLocation(result)}</strong><span class="search-result__meta">Lat ${result.latitude.toFixed(2)}, Lon ${result.longitude.toFixed(2)}</span>`;
        button.addEventListener('click', () => loadForecast({ ...result, label: formatLocation(result) }));
        elements.searchResults.append(button);
      });
    } catch (error) {
      console.error(error);
      showError(translate('errors.geocode'));
    } finally {
      setLoading(false);
    }
  })();
}

function handleGeolocation() {
  if (!navigator.geolocation) {
    showError(translate('errors.geolocationUnsupported'));
    return;
  }

  setLoading(true);
  showError('');
  showInputHint('');
  clearSearchResults();
  elements.locationLabel.textContent = translate('geo.locating');
  elements.statusMessage.textContent = translate('geo.message');
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
      showError(translate('errors.geolocation'));
      setLoading(false);
    },
    { enableHighAccuracy: true, timeout: 15000 }
  );
}

function handleInputChange(event) {
  const value = event.target.value.trim();
  if (!value) {
    showInputHint('input.hint.empty');
    return;
  }
  if (parseCoordinates(value)) {
    showInputHint('input.hint.coordinates');
  } else {
    showInputHint('input.hint.example');
  }
}

function handleHashChange() {
  if (state.settingHash) return;
  const location = parseLocationHash();
  if (location) {
    loadForecast(location);
  }
}

function handleOnline() {
  if (state.currentRecord?.isCached) {
    updateOfflineBanner({ message: translate('offline.backOnline'), showRetry: !!state.lastLocation });
  } else {
    updateOfflineBanner(null);
  }
  updateRetryButtonState();
}

function handleOffline() {
  updateOfflineBanner({ message: translate('offline.messageOffline'), showRetry: !!state.lastLocation });
}

elements.form.addEventListener('submit', handleSearch);
elements.useLocation.addEventListener('click', handleGeolocation);
elements.input.addEventListener('input', handleInputChange);

elements.unitPrecipitation.value = state.preferences.precipitationUnit;
elements.unitProbability.value = state.preferences.probabilityDisplay;
elements.languageSelect.value = state.locale;

elements.unitPrecipitation.addEventListener('change', event => setPrecipitationUnit(event.target.value));
elements.unitProbability.addEventListener('change', event => setProbabilityDisplay(event.target.value));
elements.languageSelect.addEventListener('change', event => setLocale(event.target.value));

elements.retryButton.addEventListener('click', () => {
  if (state.lastLocation) {
    loadForecast(state.lastLocation);
  }
});

window.addEventListener('online', handleOnline);
window.addEventListener('offline', handleOffline);
window.addEventListener('hashchange', handleHashChange);

applyTranslations();
showInputHint('input.hint.empty');
updateRetryButtonState();

document.addEventListener('DOMContentLoaded', () => {
  if (document.activeElement === document.body && elements.input) {
    elements.input.focus({ preventScroll: true });
  }
  const fromHash = parseLocationHash();
  if (fromHash) {
    loadForecast(fromHash);
  } else if (!navigator.onLine && state.lastForecast) {
    renderForecast(state.lastForecast, { isCached: true });
  }
});
