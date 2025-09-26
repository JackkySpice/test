const DEFAULT_OPTIONS = {
  probabilityThreshold: 30,
  precipitationThreshold: 0.1,
  timelineEntries: 8,
  maxLeadTimeMinutes: 180
};

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function formatDuration(minutes) {
  if (!Number.isFinite(minutes)) {
    return 'soon';
  }

  if (minutes <= 0) return 'now';
  if (minutes === 1) return '1 minute';
  if (minutes < 60) return `${minutes} minutes`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    if (remainingMinutes === 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    }
    return `${hours}h ${remainingMinutes}m`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (remainingHours === 0) {
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  }
  return `${days}d ${remainingHours}h`;
}

export function toDateWithOffset(timeString, utcOffsetSeconds = 0) {
  if (!timeString) return null;
  const [datePart, timePart = '00:00'] = timeString.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute = 0] = timePart.split(':').map(Number);
  const asUtc = Date.UTC(year, month - 1, day, hour, minute);
  return new Date(asUtc - utcOffsetSeconds * 1000);
}

export function getUpcomingPrecipitation(minutelyData, options = {}) {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  if (!minutelyData || !Array.isArray(minutelyData.time) || !minutelyData.time.length) {
    return { status: 'no-data' };
  }

  const {
    probabilityThreshold,
    precipitationThreshold,
    now = new Date(),
    utcOffsetSeconds = 0,
    maxLeadTimeMinutes
  } = mergedOptions;

  const entries = minutelyData.time.map((isoTime, index) => {
    const precipitation = toNumber(minutelyData.precipitation?.[index]);
    const probability = toNumber(minutelyData.precipitation_probability?.[index]);
    return {
      isoTime,
      at: toDateWithOffset(isoTime, utcOffsetSeconds),
      precipitation,
      probability
    };
  }).filter(entry => entry.at instanceof Date && !Number.isNaN(entry.at.getTime()));

  if (!entries.length) {
    return { status: 'no-data' };
  }

  const nowTime = now instanceof Date ? now.getTime() : Date.now();
  const earliestAllowed = nowTime - 15 * 60 * 1000;
  const relevantEntries = entries.filter(entry => entry.at.getTime() >= earliestAllowed);
  if (!relevantEntries.length) {
    return { status: 'no-data' };
  }

  const leadTimeLimit = Number.isFinite(maxLeadTimeMinutes) && maxLeadTimeMinutes > 0
    ? maxLeadTimeMinutes * 60000
    : null;
  const latestAllowed = leadTimeLimit != null ? nowTime + leadTimeLimit : Infinity;
  const entriesWithinWindow = relevantEntries.filter(entry => entry.at.getTime() <= latestAllowed);

  const searchEntries = entriesWithinWindow.length ? entriesWithinWindow : relevantEntries;

  const rainyEntry = entriesWithinWindow.find(entry => {
    const precipitation = entry.precipitation ?? 0;
    const probability = entry.probability ?? 0;
    return precipitation >= precipitationThreshold || probability >= probabilityThreshold;
  });

  const firstEntry = searchEntries[0];
  const lastEntry = searchEntries[searchEntries.length - 1];

  if (rainyEntry) {
    const minutesUntil = Math.max(0, Math.round((rainyEntry.at.getTime() - nowTime) / 60000));
    return {
      status: 'rain-expected',
      minutesUntil,
      precipitation: rainyEntry.precipitation,
      probability: rainyEntry.probability,
      at: rainyEntry.at
    };
  }

  const minutesAhead = entriesWithinWindow.length
    ? Math.max(0, Math.round((lastEntry.at.getTime() - nowTime) / 60000))
    : (leadTimeLimit != null ? Math.round(leadTimeLimit / 60000) : Math.max(0, Math.round((lastEntry.at.getTime() - nowTime) / 60000)));

  return {
    status: 'clear-period',
    minutesAhead,
    nextCheck: firstEntry?.at
  };
}

export function buildTimeline(minutelyData, options = {}) {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const { timelineEntries, utcOffsetSeconds = 0 } = mergedOptions;

  if (!minutelyData || !Array.isArray(minutelyData.time)) {
    return [];
  }

  const now = mergedOptions.now instanceof Date ? mergedOptions.now : new Date();
  const nowTime = now.getTime();
  const earliestAllowed = nowTime - 15 * 60 * 1000;

  return minutelyData.time.map((isoTime, index) => ({
    at: toDateWithOffset(isoTime, utcOffsetSeconds),
    precipitation: toNumber(minutelyData.precipitation?.[index]),
    probability: toNumber(minutelyData.precipitation_probability?.[index])
  }))
    .filter(entry => entry.at instanceof Date && !Number.isNaN(entry.at.getTime()))
    .filter(entry => entry.at.getTime() >= earliestAllowed)
    .slice(0, timelineEntries);
}

export function describePrecipitationStatus(result, options = {}) {
  const { timezone = 'UTC' } = options;
  if (!result || result.status === 'no-data') {
    return 'Weather data is currently unavailable.';
  }

  if (result.status === 'rain-expected') {
    if (result.minutesUntil <= 1) {
      return 'Rain is starting any minute now.';
    }
    const formatter = new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone
    });
    const timeLabel = formatter.format(result.at);
    return `Rain expected in about ${formatDuration(result.minutesUntil)} (around ${timeLabel}).`;
  }

  if (result.status === 'clear-period') {
    return `No rain expected for at least ${formatDuration(result.minutesAhead)}.`;
  }

  return 'Weather data is currently unavailable.';
}
