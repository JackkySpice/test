import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toDateWithOffset,
  getUpcomingPrecipitation,
  buildTimeline,
  describePrecipitationStatus
} from '../src/forecast.js';

test('toDateWithOffset converts local timestamps using timezone offset', () => {
  const result = toDateWithOffset('2024-03-01T12:30', 7200);
  const expected = new Date(Date.UTC(2024, 2, 1, 10, 30));
  assert.equal(result.getTime(), expected.getTime());
});

test('getUpcomingPrecipitation finds the first rainy interval', () => {
  const now = new Date('2024-03-01T09:00:00Z');
  const minutely = {
    time: ['2024-03-01T10:00', '2024-03-01T10:15', '2024-03-01T10:30'],
    precipitation: [0, 0.05, 1.2],
    precipitation_probability: [0, 15, 78]
  };
  const result = getUpcomingPrecipitation(minutely, { now, utcOffsetSeconds: 3600 });
  assert.equal(result.status, 'rain-expected');
  assert.equal(result.minutesUntil, 30);
  assert.equal(result.precipitation, 1.2);
  assert.equal(result.probability, 78);
});

test('getUpcomingPrecipitation returns clear-period when no rain expected', () => {
  const now = new Date('2024-03-01T09:00:00Z');
  const minutely = {
    time: ['2024-03-01T09:00', '2024-03-01T09:15', '2024-03-01T09:30', '2024-03-01T09:45'],
    precipitation: [0, 0, 0, 0],
    precipitation_probability: [5, 10, 15, 20]
  };
  const result = getUpcomingPrecipitation(minutely, { now, utcOffsetSeconds: 0 });
  assert.equal(result.status, 'clear-period');
  assert.ok(result.minutesAhead >= 30);
});

test('getUpcomingPrecipitation ignores rain beyond the lead time window', () => {
  const now = new Date('2024-03-01T09:00:00Z');
  const minutely = {
    time: [
      '2024-03-03T09:00',
      '2024-03-03T09:15'
    ],
    precipitation: [2, 3],
    precipitation_probability: [80, 90]
  };

  const result = getUpcomingPrecipitation(minutely, {
    now,
    utcOffsetSeconds: 0,
    maxLeadTimeMinutes: 120
  });

  assert.equal(result.status, 'clear-period');
  assert.equal(result.minutesAhead, 120);
});

test('buildTimeline caps entries and keeps chronological order', () => {
  const now = new Date('2024-03-01T09:00:00Z');
  const minutely = {
    time: [
      '2024-03-01T08:30',
      '2024-03-01T08:45',
      '2024-03-01T09:00',
      '2024-03-01T09:15',
      '2024-03-01T09:30'
    ],
    precipitation: [0, 0.1, 0.6, 0.2, 0],
    precipitation_probability: [0, 20, 60, 40, 10]
  };

  const timeline = buildTimeline(minutely, { now, utcOffsetSeconds: 0, timelineEntries: 3 });
  assert.equal(timeline.length, 3);
  assert.equal(timeline[0].precipitation, 0.1);
  assert.equal(timeline[0].probability, 20);
  assert.equal(timeline[1].precipitation, 0.6);
  assert.equal(timeline[2].probability, 40);
});

test('describePrecipitationStatus creates human readable summaries', () => {
  const rainStatus = describePrecipitationStatus(
    {
      status: 'rain-expected',
      minutesUntil: 12,
      at: new Date('2024-03-01T10:00:00Z')
    },
    { timezone: 'UTC' }
  );
  assert.match(rainStatus, /Rain expected in about 12 minutes/);

  const clearStatus = describePrecipitationStatus({ status: 'clear-period', minutesAhead: 60 });
  assert.match(clearStatus, /No rain expected/);
});
