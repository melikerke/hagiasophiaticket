import test from 'node:test';
import assert from 'node:assert/strict';
import { welcomeCardUrlErrors } from './offer-destinations.mjs';

const url = 'https://istanbulwelcomecard.com/shop/hagia-sophia-tour?ref=iti5';
test('the supplied discounted product URL is accepted', () => {
  assert.deepEqual(welcomeCardUrlErrors(url), []);
});
test('lost, substituted and ambiguous referrals cannot silently change the offer', () => {
  for (const value of [url.split('?')[0], url.replace('iti5', 'other'), url + '&ref=other', url + '&ref=iti5', url + '&partner_id=other']) {
    assert.ok(welcomeCardUrlErrors(value).length, value);
  }
});
test('wrong products, providers and deceptive destinations are rejected', () => {
  for (const value of [url.replace('-tour', '-museum'), url.replace('https:', 'http:'), url.replace('.com/', '.com.example/'), url.replace('istanbulwelcomecard.com', 'www.getyourguide.com'), url.replace('https://', 'https://user@'), url + '#checkout', '/shop/hagia-sophia-tour']) {
    assert.ok(welcomeCardUrlErrors(value).length, value);
  }
});
