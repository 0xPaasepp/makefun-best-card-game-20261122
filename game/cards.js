// EMBERFALL DUEL — card definitions and deck building.
// Five schools, each told apart by colour AND glyph shape: Ember ▲, Frost ◆,
// Verdant ✚, Spark ✦, Shadow ☾.
export const SCHOOLS = {
  ember: { name: 'Ember', color: '#ff5a3c', glyph: '▲' },
  frost: { name: 'Frost', color: '#57b8ff', glyph: '◆' },
  verdant: { name: 'Verdant', color: '#4ade80', glyph: '✚' },
  spark: { name: 'Spark', color: '#ffd23c', glyph: '✦' },
  shadow: { name: 'Shadow', color: '#c084fc', glyph: '☾' },
};

export const CARD_TYPES = [
  { id: 'strike', name: 'Strike', school: 'ember', cost: 1, damage: 4, text: 'Deal 4 damage.' },
  { id: 'fireball', name: 'Fireball', school: 'ember', cost: 2, damage: 6, burn: 2, text: 'Deal 6 damage. Burn 2.' },
  { id: 'inferno', name: 'Inferno', school: 'ember', cost: 3, damage: 10, text: 'Deal 10 damage.' },
  { id: 'frostbite', name: 'Frostbite', school: 'frost', cost: 1, damage: 3, weaken: 1, text: 'Deal 3 damage. Weaken the foe.' },
  { id: 'glacial', name: 'Glacial Spike', school: 'frost', cost: 2, damage: 5, shield: 3, text: 'Deal 5 damage. Gain 3 shield.' },
  { id: 'guard', name: 'Guard', school: 'verdant', cost: 1, shield: 7, text: 'Gain 7 shield.' },
  { id: 'mend', name: 'Mend', school: 'verdant', cost: 2, heal: 6, text: 'Restore 6 life.' },
  { id: 'thornwall', name: 'Thornwall', school: 'verdant', cost: 1, shield: 5, reflect: 3, text: 'Gain 5 shield. Reflect 3.' },
  { id: 'surge', name: 'Surge', school: 'spark', cost: 0, energy: 2, draw: 1, text: 'Gain 2 energy. Draw 1 card.' },
  { id: 'twin', name: 'Twin Slash', school: 'spark', cost: 2, damage: 3, hits: 2, text: 'Deal 3 damage twice.' },
  { id: 'drain', name: 'Drain', school: 'shadow', cost: 2, damage: 4, heal: 4, text: 'Deal 4 damage. Heal 4.' },
  { id: 'hex', name: 'Hex', school: 'shadow', cost: 2, damage: 5, burn: 3, text: 'Deal 5 damage. Burn 3.' },
];

const DECK_COUNTS = {
  strike: 3, fireball: 2, inferno: 1, frostbite: 2, glacial: 2,
  guard: 2, mend: 2, thornwall: 1, surge: 2, twin: 2, drain: 1, hex: 1,
};

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function buildDeck() {
  const deck = [];
  for (const [id, n] of Object.entries(DECK_COUNTS)) {
    const def = CARD_TYPES.find((c) => c.id === id);
    for (let i = 0; i < n; i++) deck.push({ ...def, uid: `${id}-${i}` });
  }
  return shuffle(deck);
}
