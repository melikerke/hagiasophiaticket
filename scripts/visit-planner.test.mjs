import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizePlan, visitDay, recommend, itinerary, preferences } from '../visit-planner.mjs';

const registry = JSON.parse(readFileSync(new URL('../offers.json', import.meta.url))).offers;
const page = readFileSync(new URL('../plan-your-visit/index.html', import.meta.url), 'utf8');

test('every preference combination has registered offers and a usable route', () => {
  for (const sights of preferences.sights) for (const style of preferences.style)
    for (const duration of preferences.duration) for (const date of ['', '2026-09-15', '2026-09-11', '2026-09-12']) {
      const input = { sights, style, duration, date };
      const result = recommend(input);
      assert.ok(result.ids.length);
      for (const id of result.ids) {
        assert.ok(registry[id], `unregistered offer ${id}`);
        assert.ok(page.includes(`id="offer-${id}"`), `missing render template ${id}`);
      }
      assert.ok(itinerary(input).stops.length >= 3);
    }
});

test('one-attraction entry keeps the standalone offer; audio and live-guide matches differ', () => {
  assert.deepEqual(recommend({ sights: 'hagia', style: 'self' }).ids, ['hagia-sophia-entry']);
  assert.deepEqual(recommend({ sights: 'hagia-blue', style: 'self' }).ids, ['hagia-blue-audio']);
  assert.deepEqual(recommend({ sights: 'hagia-blue', style: 'guided' }).ids, ['blue-hagia-small-group']);
  assert.match(recommend({ sights: 'hagia-blue', style: 'self' }).summary, /free/);
});

test('a partial guided match clearly identifies separate bookings and the self-guided visit', () => {
  const result = recommend({ sights: 'three', style: 'guided', duration: '8' });
  assert.equal(result.ids.length, 2);
  assert.match(result.summary, /self-guided Basilica/);
  assert.match(result.summary, /two bookings/);
});

test('short plans flag overbooking and never route through three paid attractions', () => {
  const input = { sights: 'three', duration: '2', style: 'guided' };
  assert.ok(recommend(input).warnings.some(t => /two hours/.test(t)));
  assert.deepEqual(itinerary(input).stops.map(s => s.id), ['arrival', 'hagia', 'square']);
  assert.ok(!itinerary({ sights: 'three', duration: '4' }).stops.some(s => s.id === 'topkapi'));
});

test('Tuesday removes Topkapi from the route and flags its booking restriction', () => {
  const input = { sights: 'three', duration: '8', date: '2026-09-15' };
  assert.ok(!itinerary(input).stops.some(s => s.id === 'topkapi'));
  assert.ok(recommend(input).warnings.some(t => /closed on Tuesdays/.test(t)));
  assert.ok(itinerary({ ...input, date: '2026-09-16' }).stops.some(s => s.id === 'topkapi'));
});

test('Friday half-day route puts the selected cistern visit before the mosques', () => {
  const result = itinerary({ sights: 'hagia-cistern', duration: '4', date: '2026-09-11' });
  assert.equal(result.stops[0].id, 'cistern');
  assert.ok(result.notes.some(t => /12:30–14:30/.test(t)));
  assert.ok(result.notes.some(t => /stretch this beyond a half day/.test(t)));
});

test('routes respect selected sights without inserting another paid attraction', () => {
  for (const duration of ['4', '8']) for (const date of ['', '2026-09-11']) {
    const stops = itinerary({ sights: 'hagia', duration, date }).stops.map(s => s.id);
    assert.ok(!stops.includes('cistern'));
    assert.ok(!stops.includes('topkapi'));
    assert.ok(!stops.includes('blue'));
  }
});

test('arrival instructions follow the suggested delivery type', () => {
  const guided = itinerary({ sights: 'hagia', style: 'guided' }).stops.find(s => s.id === 'arrival');
  assert.match(guided.text, /meeting point/);
  assert.doesNotMatch(guided.text, /€28/);
  const entry = itinerary({ sights: 'hagia', style: 'self' }).stops.find(s => s.id === 'arrival');
  assert.match(entry.text, /kiosk/);
});

test('shared URL input is validated and weekday checks are timezone-independent', () => {
  assert.deepEqual(normalizePlan({ sights: '<script>', style: 'other', duration: '99', date: '2026-02-31' }),
    { sights: 'hagia', style: 'self', duration: '4', date: '' });
  assert.equal(visitDay('2026-09-15'), 2);
  assert.equal(visitDay('2026-09-11'), 5);
  assert.equal(visitDay('2028-02-29'), 2);
  assert.equal(visitDay('2026-02-29'), null);
});

test('every template preserves the canonical affiliate destination', () => {
  for (const id of new Set(preferences.sights.flatMap(sights => preferences.style.flatMap(style => recommend({sights, style}).ids)))) {
    const template = page.match(new RegExp(`<template id="offer-${id}">([\\s\\S]*?)</template>`))[1];
    assert.ok(template.includes(registry[id].destinationUrl.replaceAll('&', '&amp;')));
    assert.ok(template.includes('rel="noopener sponsored"'));
  }
});
