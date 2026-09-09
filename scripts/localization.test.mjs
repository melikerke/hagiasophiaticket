import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { recommend, itinerary, preferences } from '../visit-planner.mjs';
import { localizePlan, createTranslator, localizedRoutes } from '../visit-i18n.mjs';
const manifest = JSON.parse(readFileSync(new URL('./locales/localized-manifest.json',import.meta.url)));
const read = path => readFileSync(new URL('..'+path+'index.html',import.meta.url),'utf8');

// Exercise every supported choice on ordinary, Tuesday, Friday and unspecified dates.
test('all planner combinations retain logic and translate visitor-facing output', () => {
 for(const lang of ['de','fr','es']) for(const sights of preferences.sights) for(const style of preferences.style) for(const duration of preferences.duration) for(const date of ['', '2026-09-09','2026-09-08','2026-09-11']) {
  const input={sights,style,duration,date}, raw=itinerary(input), plan=localizePlan(raw,lang), rec=localizePlan(recommend(input),lang);
  assert.deepEqual(plan.stops.map(x=>x.id),raw.stops.map(x=>x.id));
  assert.deepEqual(rec.ids,recommend(input).ids);
  assert.notEqual(rec.summary,recommend(input).summary);
  assert.notEqual(plan.title,raw.title);
  for(let i=0;i<plan.stops.length;i++) {
   for(const key of ['title','time','text']) assert.notEqual(plan.stops[i][key],raw.stops[i][key],`${lang}: ${raw.stops[i][key]}`);
   const href=plan.stops[i].href;
   assert.ok(href.startsWith('#') || href.startsWith('/'+lang+'/'),href);
  }
  for(let i=0;i<plan.notes.length;i++) assert.notEqual(plan.notes[i],raw.notes[i]);
  for(let i=0;i<rec.warnings.length;i++) assert.notEqual(rec.warnings[i],recommend(input).warnings[i]);
 }
});

test('localized homepages preserve the updated offer and complete visual sections', () => {
 for(const lang of ['de','fr','es']) {
  const html=read('/'+lang+'/');
  for(const id of ['tickets','visitor-info','plan-entry-title','price-title','steps-title','nearby-title','faq-title']) assert.match(html,new RegExp(`id="${id}"`));
  for(const offer of ['hagia-sophia-email-qr','iwc-old-city-combo','iwc-saver-combo']) assert.ok(html.includes(`data-offer-id="${offer}"`));
  assert.ok(html.includes('28,45'));
  assert.ok(html.includes('hagia-sophia-tour?ref=iti5'));
  assert.ok(!html.includes('€30.49'));
  // Referral belongs in destination URLs only, never page or schema copy.
  const copy=html.replace(/(?:href|src)="[^"]*"/g,'').replace(/<[^>]+>/g,'');
  assert.doesNotMatch(copy,/ITI5/i);
 }
});

test('equivalent pages have same-topic language navigation and local downloadable cards', () => {
 for(const group of manifest.groups) for(const lang of ['en','de','fr','es']) {
  const html=read(group[lang]);
  for(const [code,path] of Object.entries(group)) {
   assert.ok(html.includes(`hreflang="${code}"`));
   assert.ok(html.includes(`value="${path}"`),`${group[lang]} -> ${path}`);
  }
 }
 for(const lang of ['de','fr','es']) {
  const html=read(localizedRoutes[lang]['/plan-your-visit/']);
  for(const id of ['visit-preferences','entrance-map','route-result','visit-card','offer-iwc-old-city-combo','offer-iwc-basilica-email-qr']) assert.ok(html.includes(`id="${id}"`));
  assert.ok(existsSync(new URL(`../output/pdf/hagia-sophia-visit-card-${lang}.pdf`,import.meta.url)));
  assert.notEqual(createTranslator(lang)('Date not selected'),'Date not selected');
 }
});
