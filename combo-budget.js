import { compareTickets } from './combo-budget.mjs?v=20260909-content';
const section = document.querySelector('[data-combo-comparison]');
if (section) {
  const config = JSON.parse(document.querySelector('#combo-comparison-data').textContent);
  const form = section.querySelector('form');
  const money = cents => new Intl.NumberFormat(config.locale, { style: 'currency', currency: 'EUR' }).format(cents / 100);
  function update() {
    const result = compareTickets(config.prices, form.elements.namedItem('adults').value, form.elements.namedItem('sights').value);
    for (const key of ['separate', 'combo', 'saver']) section.querySelector(`[data-total="${key}"]`).textContent = money(result[key]);
    const difference = money(Math.abs(result.difference));
    const template = result.difference === 0 ? config.copy.equal : result.sameSights
      ? (result.difference > 0 ? config.copy.comboLower : config.copy.separateLower)
      : (result.difference > 0 ? config.copy.twoComboLower : config.copy.twoSights);
    section.querySelector('[data-comparison-result]').textContent = template.replace('{difference}', difference);
    section.querySelector('[data-comparison-upgrade]').textContent = config.copy.upgrade.replace('{difference}', money(result.cruiseUpgrade));
    section.querySelector('[data-topkapi-separate]').hidden = !result.sameSights;
  }
  update();
  form.hidden = false;
  form.addEventListener('change', update);
}
