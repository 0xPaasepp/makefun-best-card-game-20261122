// EMBERFALL DUEL — Pyra's brain: a greedy opponent whose plan you can read.
// She values damage most, heals and shields when hurt, and spends energy well.
// Her intent line (shown on the table) is her strongest affordable attack.
export function aiValue(card, me, foe) {
  let v = 0;
  v += (card.damage || 0) * (card.hits || 1);
  v += (card.heal || 0) * (me.hp < me.maxHp * 0.5 ? 1.3 : 0.4);
  v += (card.shield || 0) * 0.7;
  v += (card.burn || 0) * 1.5;
  v += card.weaken ? 2 : 0;
  v += (card.energy || 0) * 2 + (card.draw || 0) * 1.5;
  v += (card.reflect || 0) * 0.5;
  v -= card.cost * 1.4;
  return v;
}

// Best hand index to play next, or -1 when nothing is worth playing.
export function chooseAiPlay(ai, foe) {
  let best = -1;
  let bestScore = 0;
  for (let i = 0; i < ai.hand.length; i++) {
    const card = ai.hand[i];
    if (card.cost > ai.energy) continue;
    const score = aiValue(card, ai, foe) / Math.max(1, card.cost);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

// What Pyra could open with next turn, from the hand she actually holds.
export function aiIntent(ai) {
  let best = null;
  for (const c of ai.hand) {
    if (c.cost > 3) continue;
    const dmg = (c.damage || 0) * (c.hits || 1);
    if (dmg > 0 && (!best || dmg > best.dmg)) best = { dmg, name: c.name };
  }
  if (!best) return 'Pyra is gathering power…';
  if (best.dmg >= 8) return `Pyra plans a heavy strike — ${best.name} (${best.dmg})`;
  return `Pyra plans to attack — ${best.name} (${best.dmg})`;
}
