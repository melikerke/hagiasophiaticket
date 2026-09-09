import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compareTickets } from '../combo-budget.mjs';
const registry = JSON.parse(readFileSync(new URL('../offers.json', import.meta.url))).offers;
const keys = { hagia: 'hagia-sophia-email-qr', cistern: 'iwc-basilica-email-qr', topkapi: 'iwc-topkapi-audio', combo: 'iwc-old-city-combo', saver: 'iwc-saver-combo' };
const prices = Object.fromEntries(Object.entries(keys).map(([key, id]) => [key, Math.round(registry[id].priceReference.amount * 100)]));
test('three same-coverage entries compare in cents, including group totals', () => {
  const one = compareTickets(prices, 1, 'three');
  assert.equal(one.separate, 13277); assert.equal(one.combo, 12255); assert.equal(one.difference, 1022);
  const three = compareTickets(prices, 3, 'three');
  assert.equal(three.separate, 39831); assert.equal(three.combo, 36765); assert.equal(three.difference, 3066);
  assert.equal(three.cruiseUpgrade, 1710); assert.equal(three.saver, 38475);
});
test('two-sight comparison removes Topkapi and flags different attraction coverage', () => {
  const result = compareTickets(prices, 2, 'two');
  assert.equal(result.separate, 15172); assert.equal(result.combo, 24510);
  assert.equal(result.difference, -9338); assert.equal(result.sameSights, false);
});
test('a changed price can reverse the result without an unconditional saving claim', () => {
  const result = compareTickets({ ...prices, combo: 20000 }, 1, 'three');
  assert.ok(result.difference < 0);
  assert.equal(compareTickets({ ...prices, combo: 13277 }).difference, 0);
});
test('invalid people, sight selections and incomplete or invalid prices are rejected', () => {
  for (const value of [0, -1, 1.5, 7, Infinity, 'not-a-number']) assert.throws(() => compareTickets(prices, value));
  assert.throws(() => compareTickets(prices, 1, 'all'));
  for (const value of [null, undefined, NaN, -1, 0, 123.4]) assert.throws(() => compareTickets({ ...prices, topkapi: value }));
});
test('all language snapshots match the registry and retain useful no-JavaScript comparisons', () => {
  for (const path of ['combo-tickets', 'de/kombitickets', 'fr/billets-combines', 'es/entradas-combinadas']) {
    const html = readFileSync(new URL('../' + path + '/index.html', import.meta.url), 'utf8');
    const config = JSON.parse(html.match(/<script[^>]*id="combo-comparison-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
    assert.deepEqual(config.prices, prices, path);
    for (const key of ['comboLower','separateLower','twoSights','twoComboLower','equal','upgrade']) assert.ok(config.copy[key]);
    assert.ok(html.includes('€132.77')); assert.ok(html.includes('€122.55')); assert.ok(html.includes('data-comparison-result'));
    for (const id of Object.values(keys)) assert.ok(html.includes(registry[id].destinationUrl));
    assert.doesNotMatch(html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ''), /ITI5|ref=iti5/);
  }
});
