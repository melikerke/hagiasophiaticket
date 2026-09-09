// Price snapshots in cents. The caller supplies the reviewed offer data, never live inventory.
export function compareTickets(prices, people = 1, sights = 'three') {
  const count = Number(people);
  if (!Number.isInteger(count) || count < 1 || count > 6) throw new RangeError('Choose 1–6 adults.');
  if (!['two', 'three'].includes(sights)) throw new RangeError('Choose two or three sights.');
  for (const key of ['hagia', 'cistern', 'topkapi', 'combo', 'saver']) {
    if (!Number.isSafeInteger(prices[key]) || prices[key] <= 0) throw new TypeError('A reviewed price is missing.');
  }
  const separate = (prices.hagia + prices.cistern + (sights === 'three' ? prices.topkapi : 0)) * count;
  const combo = prices.combo * count;
  return { count, sights, separate, combo, difference: separate - combo, saver: prices.saver * count,
    cruiseUpgrade: (prices.saver - prices.combo) * count, sameSights: sights === 'three' };
}
