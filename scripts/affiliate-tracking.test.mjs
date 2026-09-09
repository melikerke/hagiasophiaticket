import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../site-runtime.js', import.meta.url), 'utf8');
const registry = JSON.parse(readFileSync(new URL('../offers.json', import.meta.url))).offers;
const catalogue = source.slice(source.indexOf('  var offers = '), source.indexOf('\n\n  function ensureGtag'));
const lookup = source.slice(source.indexOf('  function placement('), source.indexOf('  function normalizeEnglishHeader('));
const listener = source.slice(source.indexOf('  function trackAffiliateClick('), source.indexOf('\n\n  document.addEventListener("click", function (event) {', source.indexOf('  function trackAffiliateClick(')));
function setup(consent = 'granted') {
  const events = [], listeners = {};
  const scope = { analyticsConsent: consent, language: 'en', location: { pathname: '/combo-tickets/' }, window: { gtag: (...args) => events.push(args) }, document: { addEventListener: (name, fn) => { listeners[name] = fn; } } };
  vm.createContext(scope); vm.runInContext(catalogue + lookup + listener, scope);
  function click(id, { type = 'click', button = 0, position = 'combo_card', nested = false } = {}) {
    const attrs = { 'data-offer-id': id, 'data-button-position': position };
    const link = { href: registry[id]?.destinationUrl || '/guides/', getAttribute: key => attrs[key] || null, closest: selector => {
      if (selector.includes('a[rel~=')) return link;
      if (selector === '[data-offer-id],[data-offer]' || selector === '[data-button-position]') return link;
      return null;
    } };
    const target = nested ? { closest: selector => link.closest(selector) } : link;
    listeners[type]({ type, button, target });
  }
  return { events, scope, click };
}
test('tracking catalogue matches every current offer and event names remain bounded', () => {
  const { scope } = setup();
  assert.deepEqual(Object.keys(scope.offers).sort(), Object.keys(registry).sort());
  const names = new Set();
  for (const [id, offer] of Object.entries(registry)) {
    assert.equal(scope.offers[id].destination, offer.destinationUrl);
    assert.equal(scope.offers[id].product, offer.name);
    assert.equal(scope.offers[id].event, offer.analyticsEvent || null);
    if (offer.analyticsEvent) {
      assert.match(offer.analyticsEvent, /^ticket_click_[a-z_]+$/);
      assert.ok(offer.analyticsEvent.length <= 40);
      assert.ok(!names.has(offer.analyticsEvent)); names.add(offer.analyticsEvent);
      assert.equal(scope.offers[id].price, offer.priceReference?.amount || null);
    }
  }
});
test('each product click sends one aggregate and one correct product event, never a purchase value', () => {
  for (const [id, offer] of Object.entries(registry).filter(([, o]) => o.analyticsEvent)) {
    const { events, click } = setup(); click(id, { nested: true });
    assert.deepEqual(events.map(e => e[1]), ['affiliate_click', offer.analyticsEvent]);
    for (const event of events) {
      assert.equal(event[2].offer_id, id); assert.equal(event[2].provider, 'istanbul-welcome-card');
      assert.equal(event[2].button_position, 'combo_card'); assert.equal(event[2].page, '/combo-tickets/');
      assert.ok(!('value' in event[2])); assert.ok(!('transaction_id' in event[2]));
    }
  }
});
test('unknown or rejected consent never queues a click for later replay', () => {
  for (const consent of [null, 'denied']) {
    const { events, click, scope } = setup(consent); click('iwc-old-city-combo');
    assert.equal(events.length, 0); scope.analyticsConsent = 'granted';
    assert.equal(events.length, 0); click('iwc-saver-combo'); assert.equal(events.length, 2);
    scope.analyticsConsent = 'denied'; click('iwc-old-city-combo'); assert.equal(events.length, 2);
  }
});
test('keyboard, middle-click and dynamic planner locations track once; right-click does not', () => {
  const { events, click } = setup();
  click('iwc-old-city-combo', { position: 'visit-planner' });
  assert.equal(events[0][2].button_position, 'visit-planner');
  click('iwc-saver-combo', { type: 'auxclick', button: 1 });
  assert.equal(events.length, 4);
  click('iwc-saver-combo', { type: 'auxclick', button: 2 });
  click('iwc-saver-combo', { button: 1 });
  assert.equal(events.length, 4);
});
test('invalid placement text is not sent as a custom dimension', () => {
  const { events, click } = setup(); click('iwc-old-city-combo', { position: 'email@example.com' });
  assert.equal(events[0][2].button_position, 'content');
});
