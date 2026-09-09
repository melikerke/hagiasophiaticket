import { normalizePlan, recommend, itinerary } from './visit-planner.mjs?v=20260909-qr';

const form = document.querySelector('#visit-preferences');
const ticketResult = document.querySelector('#ticket-result');
const route = document.querySelector('#route-result');
const messages = document.querySelector('#planner-status');

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function render(state, announce = false) {
  const match = recommend(state);
  document.querySelector('#match-summary').textContent = match.summary;
  const cards = match.ids.map(id => document.querySelector(`#offer-${id}`).content.cloneNode(true));
  ticketResult.replaceChildren(...cards);
  const warnings = document.querySelector('#match-warnings');
  warnings.replaceChildren(...match.warnings.map(text => element('p', text)));
  warnings.hidden = !match.warnings.length;
  const plan = itinerary(state);
  document.querySelector('#route-title').textContent = plan.title;
  const list = element('ol', '', 'vt-timeline');
  plan.stops.forEach(item => {
    const row = element('li');
    row.append(element('span', item.time, 'vt-time'));
    const link = element('a', item.title); link.href = item.href;
    const title = element('h4'); title.append(link); row.append(title);
    row.append(element('p', item.text)); list.append(row);
  });
  route.replaceChildren(list);
  document.querySelector('#route-notes').replaceChildren(...plan.notes.map(text => element('li', text)));
  const dateText = state.date ? new Intl.DateTimeFormat('en-GB', {dateStyle: 'full', timeZone: 'UTC'}).format(new Date(`${state.date}T12:00:00Z`)) : 'Date not selected';
  document.querySelector('#card-route').textContent = plan.title;
  document.querySelector('#card-date').textContent = dateText;
  document.querySelector('#card-stops').textContent = plan.stops.map(s => s.title).join(' → ');
  document.querySelector('#card-date-notes').textContent = plan.notes.filter(t => /Friday:|closed on Tuesdays/.test(t)).join(' ');
  document.querySelector('#card-arrival').textContent = plan.stops.find(s => s.id === 'arrival').text;
  const url = new URL(location.href);
  for (const key of ['sights', 'style', 'duration', 'date']) {
    if (state[key]) url.searchParams.set(key, state[key]); else url.searchParams.delete(key);
  }
  try { history.replaceState(null, '', url); } catch (_) { /* Tools also work in a local file preview. */ }
  if (announce) messages.textContent = 'Ticket suggestions, route and visit card updated.';
}

if (form && ticketResult && route) {
  const initial = normalizePlan(Object.fromEntries(new URLSearchParams(location.search)));
  for (const [key, value] of Object.entries(initial)) form.elements.namedItem(key).value = value;
  render(initial);
  form.hidden = false;
  document.querySelectorAll('[data-planner-action]').forEach(node => { node.hidden = false; });
  form.addEventListener('submit', event => {
    event.preventDefault();
    render(normalizePlan(Object.fromEntries(new FormData(form))), true);
    document.querySelector('#ticket-match-title').focus({ preventScroll: true });
  });
  form.addEventListener('input', () => { messages.textContent = 'Preferences changed. Choose “Update my plan” to apply them.'; });
  document.querySelector('#print-plan').addEventListener('click', () => window.print());
  document.querySelector('#copy-plan').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      document.querySelector('#share-status').textContent = 'Plan link copied. It includes your applied preferences and date.';
    } catch (_) {
      const fallback = document.querySelector('#share-link');
      fallback.hidden = false; fallback.value = location.href; fallback.focus(); fallback.select();
      document.querySelector('#share-status').textContent = 'Copy the selected link to share this plan.';
    }
  });
}
