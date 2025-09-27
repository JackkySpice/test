const DEFAULT_OPTIONS = {
  probabilityThreshold: 30,
  precipitationThreshold: 0.1,
  timelineEntries: 8,
  maxLeadTimeMinutes: 180
};

const DEFAULT_DURATION_STRINGS = {
  now: 'now',
  soon: 'soon',
  minute: '1 minute',
  minutes: '{value} minutes',
  hour: '1 hour',
  hours: '{value} hours',
  day: '1 day',
  days: '{value} days',
  hoursMinutes: '{hours}h {minutes}m',
  daysHours: '{days}d {hours}h'
};

const DEFAULT_STATUS_STRINGS = {
  noData: 'Weather data is currently unavailable.',
  rainImminent: 'Rain is starting any minute now.',
  rainSoon: 'Rain expected in about {duration} (around {time}).',
  clear: 'No rain expected for at least {duration}.',
  duration: DEFAULT_DURATION_STRINGS
};

function formatTemplate(template, values = {}) {
  if (typeof template !== 'string') return '';
  return template.replace(/\{(\w+)\}/g, (match, token) => {
    if (Object.prototype.hasOwnProperty.call(values, token)) {
      return values[token];
    }
    return match;
  });
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function formatDuration(minutes, strings = {}) {
  const messages = {
    ...DEFAULT_DURATION_STRINGS,
    ...strings
  };

  if (!Number.isFinite(minutes)) {
    return messages.soon || 'soon';
  }

  if (minutes <= 0) return messages.now;
  if (minutes === 1) return messages.minute;
  if (minutes < 60) {
    return formatTemplate(messages.minutes, { value: minutes });
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    if (remainingMinutes === 0) {
      if (hours === 1) {
        return messages.hour;
      }
      return formatTemplate(messages.hours, { value: hours });
    }
    return formatTemplate(messages.hoursMinutes, { hours, minutes: remainingMinutes });
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (remainingHours === 0) {
    if (days === 1) {
      return messages.day;
    }
    return formatTemplate(messages.days, { value: days });
  }
  return formatTemplate(messages.daysHours, { days, hours: remainingHours });
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
  const { timezone = 'UTC', strings = {} } = options;
  const messages = {
    ...DEFAULT_STATUS_STRINGS,
    ...strings,
    duration: {
      ...DEFAULT_DURATION_STRINGS,
      ...(strings.duration || {})
    }
  };

  if (!result || result.status === 'no-data') {
    return messages.noData;
  }

  if (result.status === 'rain-expected') {
    if (result.minutesUntil <= 1) {
      return messages.rainImminent;
    }
    const formatter = new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone
    });
    const timeLabel = formatter.format(result.at);
    return formatTemplate(messages.rainSoon, {
      duration: formatDuration(result.minutesUntil, messages.duration),
      time: timeLabel
    });
  }

  if (result.status === 'clear-period') {
    return formatTemplate(messages.clear, {
      duration: formatDuration(result.minutesAhead, messages.duration)
    });
  }

  return messages.noData;
}

export function buildHourlyFallback(hourlyData, options = {}) {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const { timelineEntries, utcOffsetSeconds = 0, probabilityThreshold, precipitationThreshold } = mergedOptions;

  if (!hourlyData || !Array.isArray(hourlyData.time)) {
    return { timeline: [], status: { status: 'no-data' } };
  }

  const now = mergedOptions.now instanceof Date ? mergedOptions.now : new Date();
  const nowTime = now.getTime();
  const earliestAllowed = nowTime - 60 * 60 * 1000;

  const entries = hourlyData.time
    .map((isoTime, index) => ({
      isoTime,
      at: toDateWithOffset(isoTime, utcOffsetSeconds),
      precipitation: toNumber(hourlyData.precipitation?.[index] ?? hourlyData.rain?.[index]),
      probability: toNumber(hourlyData.precipitation_probability?.[index])
    }))
    .filter(entry => entry.at instanceof Date && !Number.isNaN(entry.at.getTime()))
    .filter(entry => entry.at.getTime() >= earliestAllowed)
    .sort((a, b) => a.at.getTime() - b.at.getTime());

  if (!entries.length) {
    return { timeline: [], status: { status: 'no-data' } };
  }

  const timeline = entries.slice(0, timelineEntries).map(entry => ({
    at: entry.at,
    precipitation: entry.precipitation,
    probability: entry.probability,
    interval: 'hour'
  }));

  const rainyEntry = entries.find(entry => {
    const precipitation = entry.precipitation ?? 0;
    const probability = entry.probability ?? 0;
    return precipitation >= precipitationThreshold || probability >= probabilityThreshold;
  });

  if (rainyEntry) {
    const minutesUntil = Math.max(0, Math.round((rainyEntry.at.getTime() - nowTime) / 60000));
    return {
      timeline,
      status: {
        status: 'rain-expected',
        minutesUntil,
        precipitation: rainyEntry.precipitation,
        probability: rainyEntry.probability,
        at: rainyEntry.at
      }
    };
  }

  const lastEntry = timeline[timeline.length - 1] ?? entries[entries.length - 1];
  const minutesAhead = Math.max(0, Math.round((lastEntry.at.getTime() - nowTime) / 60000));
  return {
    timeline,
    status: {
      status: 'clear-period',
      minutesAhead
    }
  };
}
