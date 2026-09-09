// Editorial route estimates, not a timetable or live booking inventory.
export const preferences = {
  sights: ['hagia', 'hagia-blue', 'hagia-cistern', 'three'],
  style: ['self', 'guided'],
  duration: ['2', '4', '8']
};

export function visitDay(value = '') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
    ? date.getUTCDay() : null;
}

export function normalizePlan(input = {}) {
  return {
    sights: preferences.sights.includes(input.sights) ? input.sights : 'hagia',
    style: preferences.style.includes(input.style) ? input.style : 'self',
    duration: preferences.duration.includes(String(input.duration)) ? String(input.duration) : '4',
    date: visitDay(input.date) === null ? '' : input.date
  };
}

export function recommend(input) {
  const { sights, style, duration, date } = normalizePlan(input);
  const warnings = [];
  let ids, summary;
  if (style === 'self') {
    const options = {
      hagia: ['hagia-sophia-entry', 'A straightforward upper-gallery visit at your own pace.'],
      'hagia-blue': ['hagia-blue-audio', 'Hagia Sophia admission with smartphone audio for both mosques. Blue Mosque admission itself is free.'],
      'hagia-cistern': ['hagia-cistern-topkapi-option', 'Two paid attractions in one booking. Select the Hagia Sophia + Basilica Cistern option; Topkapi is an optional extra.'],
      three: ['three-attraction-combo', 'A three-attraction ticket option. Allow a full day, or spread the visits over the validity period shown at checkout.']
    };
    ids = [options[sights][0]];
    summary = options[sights][1];
  } else {
    if (sights === 'three') {
      ids = ['topkapi-hagia-small-group', 'basilica-audio'];
      summary = 'A partial match: a live tour for Topkapi + Hagia Sophia, with a separate self-guided Basilica Cistern visit. These are two bookings, not one fully guided three-attraction tour.';
    } else if (sights === 'hagia-cistern') {
      ids = ['three-sights-guided'];
      summary = 'This live tour covers Hagia Sophia and Basilica Cistern, and also includes a Blue Mosque stop. Confirm the selected option’s admission inclusions and duration.';
    } else {
      ids = ['blue-hagia-small-group'];
      summary = 'A live guided visit covering Hagia Sophia and the Blue Mosque. Choose this if you want both stops; it is not a Hagia Sophia-only tour.';
    }
  }
  if (duration === '2' && (sights !== 'hagia' || style === 'guided')) {
    warnings.push('With only two hours, prioritise one attraction. These multi-stop options may not fit; check the full duration before booking.');
  }
  if (sights === 'three' && duration !== '8') {
    warnings.push('All three paid attractions need more than a half day. Extend your plan or split the visits across days.');
  }
  if (sights === 'three' && visitDay(date) === 2) {
    warnings.push('Topkapi Palace is closed on Tuesdays. Plan that part for another day and check ticket validity before booking.');
  }
  return { ids, summary, warnings };
}

const stop = (id, title, time, text, href) => ({ id, title, time, text, href });
const arrival = stop('arrival', 'Ticket collection & arrival', 'Allow 15–30 min', 'For the main €28 starting-price offer, follow your visit-day code instructions at the History & Experience Museum kiosk. Other offers may use direct QR delivery or a guide meeting point.', '#entrance-map');
const hagia = stop('hagia', 'Hagia Sophia upper gallery', 'Allow 45–60 min inside', 'Keep extra time for security and the ramp. This paid visitor route does not include the ground-floor worship area.', '/hagia-sophia-upper-gallery/');
const square = stop('square', 'Sultanahmet Square', 'Allow 15–20 min', 'Finish with an exterior view of the Blue Mosque and a walk through the square. An interior mosque visit needs its own time allowance.', '#photo-guide');
const cistern = stop('cistern', 'Basilica Cistern', 'Allow 45–60 min inside', 'Allow roughly 5–10 minutes to walk from Hagia Sophia. Download any audio before going underground; use the session on your ticket.', '/basilica-cistern-opening-hours/');
const blue = stop('blue', 'Blue Mosque & a break', 'Allow 45–60 min', 'Walk back through the square, pause for a drink, and enter only during visitor hours. Admission is free; prayer closures and security can add waiting.', '/hagia-sophia-vs-blue-mosque/');
const palace = stop('topkapi', 'Topkapi Palace', 'Allow 2½–3½ hours', 'Start early and use the entry or host meeting time on your ticket. Harem access depends on your option. Leave time for the courtyards and security.', '/combo-tickets/');
const lunch = stop('lunch', 'Lunch & a walk through the square', 'Allow 45–60 min', 'Keep this break flexible. The routes between the main sights are short, but ticket collection and queues use more time than the walk.', '/one-day-sultanahmet-itinerary/');

export function itinerary(input) {
  const { duration, date, sights, style } = normalizePlan(input);
  const day = visitDay(date);
  const withCistern = ['hagia-cistern', 'three'].includes(sights);
  const withBlue = sights === 'hagia-blue';
  let stops, title;
  const notes = ['Times are planning estimates, excluding unpredictable queues. Check opening hours, ticket sessions and any temporary closures for your date.'];
  if (duration === '2') {
    title = 'About 2 hours · one main sight';
    stops = [arrival, hagia, square];
    notes.push('A tight visit: allow longer if collection or security is busy. Add a second paid attraction only with more time.');
  } else if (duration === '4') {
    title = withCistern || withBlue ? 'Half day · about 4–5 hours' : 'Half day · a relaxed Hagia Sophia visit';
    stops = [arrival, hagia, ...(withCistern ? [cistern] : []), withBlue ? blue : square, lunch];
    if (sights === 'three') notes.push('Topkapi needs a separate visit: the three paid attractions do not fit comfortably into a half day.');
  } else if (sights === 'three' && day === 2) {
    title = 'Full day · a slower Tuesday route';
    stops = [arrival, hagia, blue, lunch, cistern];
    notes.push('Topkapi Palace is closed on Tuesdays, so this route leaves it out. Use the extra time for the square and longer breaks.');
  } else if (sights === 'three') {
    title = 'Full day · about 7–9 hours';
    stops = [palace, lunch, arrival, hagia, cistern, square];
    notes.push('This is a busy day. Blue Mosque is an exterior stop; add an interior visit only if time and visitor hours allow. Splitting the three paid attractions over two days is more relaxed.');
  } else {
    title = 'Full day · an easy pace for your selected sights';
    stops = [arrival, hagia, lunch, ...(withCistern ? [cistern] : []), withBlue ? blue : square];
    notes.push('Your selected sights leave spare time in a full day. Take longer breaks, explore the square and allow for queues.');
  }
  if (day === 5) {
    notes.push('Friday: Hagia Sophia’s published visitor closure is 12:30–14:30; Blue Mosque visitor entry begins at 14:30. Allow for queues when visiting resumes.');
    if (duration === '2') notes.push('Use this short route after 14:30, subject to the day’s entry arrangements.');
    if (duration === '4') {
      stops = [...(withCistern ? [cistern, lunch] : []), arrival, hagia, withBlue ? blue : square];
      notes.push(withCistern ? 'Visit the cistern before lunch, then plan Hagia Sophia after 14:30. The prayer break may stretch this beyond a half day.' : 'Use this route after 14:30, subject to the day’s visitor arrangements.');
    }
    if (duration === '8') notes.push('Aim for Hagia Sophia after 14:30; adjust your lunch and ticket collection around the actual reopening.');
  }
  if (duration !== '2' && withCistern) notes.push('Basilica Cistern has separate day and evening sessions, with a published 18:30–19:30 visitor break. Do not assume a day ticket covers evening entry.');
  if (style === 'guided') notes.push('This is a self-directed route idea. A guided booking uses its own meeting point, duration and stop order; follow your tour confirmation.');
  if (sights !== 'hagia' || style !== 'self') {
    stops = stops.map(item => item.id === 'arrival' ? stop('arrival', 'Ticket delivery & arrival', 'Allow arrival time',
      style === 'guided'
        ? 'Use the meeting point and arrival time in your tour confirmation. Your guide’s route takes precedence over this self-directed plan.'
        : 'Save the supplier entry QR and follow the instructions for your selected option. Check whether any timed host meeting is required; collection at the main offer’s museum kiosk is not a universal rule.', '#entrance-map') : item);
  }
  if (!date) notes.push('Add your visit date to flag Tuesday and Friday restrictions. Holiday and temporary closures are not checked automatically.');
  return { title, stops, notes };
}
