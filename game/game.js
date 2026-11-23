// EMBERFALL DUEL — game state, table rendering and turn flow.
// Player and Pyra both start at 30 life, draw to 5 cards, get 3 energy a turn.
// Shield blocks damage and fades at the start of your next turn; burn ticks at
// the start of the burned side's turn; weaken cuts the next attack by 2.
import { buildDeck, shuffle, SCHOOLS } from './cards.js';
import { chooseAiPlay, aiIntent } from './ai.js';

const $ = (s) => document.querySelector(s);
const MAX_HAND = 5;
const START_ENERGY = 3;
const START_HP = 30;

let S = null;
let busy = false;

function freshSide(hp) {
  return {
    hp, maxHp: hp, shield: 0, reflect: 0, burn: 0, burnTurns: 0, weaken: 0,
    energy: 0, deck: [], hand: [], discard: [],
  };
}

function newGame() {
  S = {
    player: freshSide(START_HP),
    ai: freshSide(START_HP),
    turn: 0, over: false, winner: null, log: [],
    cardsPlayed: 0, damageDealt: 0,
  };
  S.player.deck = buildDeck();
  S.ai.deck = buildDeck();
  drawUp(S.player);
  drawUp(S.ai);
  showScreen('table');
  startPlayerTurn();
}

function drawUp(side) {
  while (side.hand.length < MAX_HAND) {
    if (side.deck.length === 0) {
      if (side.discard.length === 0) break;
      side.deck = shuffle(side.discard.splice(0));
    }
    side.hand.push(side.deck.pop());
  }
}

function drawCards(side, n) {
  for (let i = 0; i < n; i++) {
    if (side.deck.length === 0) {
      if (side.discard.length === 0) break;
      side.deck = shuffle(side.discard.splice(0));
    }
    side.hand.push(side.deck.pop());
  }
  while (side.hand.length > 7) side.discard.push(side.hand.pop());
}

function tickBurn(side, who) {
  if (side.burnTurns > 0 && side.burn > 0) {
    side.hp = Math.max(0, side.hp - side.burn);
    floater(who === 'You' ? 'player' : 'ai', `-${side.burn} burn`, 'dmg');
    log(`${who} burn for ${side.burn}.`);
    side.burnTurns -= 1;
    if (side.burnTurns === 0) side.burn = 0;
  }
}

function startPlayerTurn() {
  if (S.over) { busy = false; return; }
  S.turn += 1;
  const p = S.player;
  p.shield = 0;
  p.reflect = 0;
  p.energy = START_ENERGY;
  tickBurn(p, 'You');
  if (checkEnd()) { busy = false; return; }
  drawUp(p);
  log(`— Turn ${S.turn}: your move. —`);
  busy = false;
  render();
}

function dealDamage(src, dst, raw) {
  let dmg = raw;
  if (src.weaken > 0 && dmg > 0) {
    dmg = Math.max(0, dmg - 2);
    src.weaken = 0;
  }
  const absorbed = Math.min(dst.shield, dmg);
  dst.shield -= absorbed;
  dmg -= absorbed;
  dst.hp = Math.max(0, dst.hp - dmg);
  if (dst.reflect > 0 && dmg > 0) {
    const r = dst.reflect;
    dst.reflect = 0;
    src.hp = Math.max(0, src.hp - r);
    floater(src === S.player ? 'player' : 'ai', `-${r} reflect`, 'reflect');
    log(`Thorns reflect ${r} damage.`);
  }
  if (dmg >= 8) shake();
  return dmg;
}

function applyCard(me, foe, card, meSide) {
  const hits = card.hits || 1;
  for (let h = 0; h < hits; h++) {
    if (card.damage) {
      const dealt = dealDamage(me, foe, card.damage);
      floater(meSide === 'player' ? 'ai' : 'player', `-${dealt}`, 'dmg');
      if (meSide === 'player') S.damageDealt += dealt;
    }
  }
  if (card.shield) {
    me.shield += card.shield;
    floater(meSide, `+${card.shield} shield`, 'shield');
  }
  if (card.heal) {
    me.hp = Math.min(me.maxHp, me.hp + card.heal);
    floater(meSide, `+${card.heal}`, 'heal');
  }
  if (card.burn) {
    foe.burn = card.burn;
    foe.burnTurns = 2;
    log(`${foe === S.ai ? 'Pyra burns' : 'You burn'} ${card.burn} a turn.`);
  }
  if (card.weaken) foe.weaken = 1;
  if (card.reflect) me.reflect = card.reflect;
}

function playCard(i) {
  if (busy || !S || S.over) return;
  const card = S.player.hand[i];
  if (!card || card.cost > S.player.energy) return;
  const el = document.querySelectorAll('#hand .card')[i];
  if (el) el.classList.add('playing');
  S.player.energy -= card.cost;
  S.player.hand.splice(i, 1);
  S.player.discard.push(card);
  S.cardsPlayed += 1;
  applyCard(S.player, S.ai, card, 'player');
  if (card.draw) drawCards(S.player, card.draw);
  if (card.energy) S.player.energy += card.energy;
  log(`You played ${card.name}.`);
  setTimeout(() => { render(); checkEnd(); }, 120);
  render();
}

function endTurn() {
  if (busy || !S || S.over) return;
  busy = true;
  render();
  const ai = S.ai;
  ai.shield = 0;
  ai.reflect = 0;
  ai.energy = START_ENERGY;
  tickBurn(ai, 'Pyra');
  if (checkEnd()) { busy = false; return; }
  drawUp(ai);
  log('Pyra takes her turn…');
  render();
  setTimeout(aiStep, 500);
}

function aiStep() {
  if (S.over) { busy = false; return; }
  const idx = chooseAiPlay(S.ai, S.player);
  if (idx === -1) {
    log('Pyra ends her turn.');
    setTimeout(startPlayerTurn, 450);
    return;
  }
  const card = S.ai.hand[idx];
  S.ai.energy -= card.cost;
  S.ai.hand.splice(idx, 1);
  S.ai.discard.push(card);
  applyCard(S.ai, S.player, card, 'ai');
  log(`Pyra played ${card.name}.`);
  render();
  if (checkEnd()) { busy = false; return; }
  setTimeout(aiStep, 600);
}

function checkEnd() {
  if (!S || S.over) return S ? S.over : false;
  if (S.ai.hp <= 0) return endGame('win');
  if (S.player.hp <= 0) return endGame('lose');
  return false;
}

function endGame(result) {
  S.over = true;
  S.winner = result;
  busy = false;
  const title = $('#end-title');
  const sub = $('#end-sub');
  if (result === 'win') {
    title.textContent = 'VICTORY';
    title.className = 'win';
    sub.textContent = 'Pyra is defeated. The ember is yours.';
  } else {
    title.textContent = 'DEFEAT';
    title.className = 'lose';
    sub.textContent = 'The ember fades… but a knight always rises again.';
  }
  $('#end-stats').innerHTML =
    `<div><b>${S.turn}</b><span>TURNS</span></div>` +
    `<div><b>${S.damageDealt}</b><span>DAMAGE DEALT</span></div>` +
    `<div><b>${S.cardsPlayed}</b><span>CARDS PLAYED</span></div>`;
  render();
  setTimeout(() => showScreen('end'), 650);
  return true;
}

function log(text, dim = false) {
  S.log.unshift({ text, dim });
  if (S.log.length > 6) S.log.length = 6;
  const box = $('#log');
  if (box) box.innerHTML = S.log.map((e) => `<div class="${e.dim ? 'dim' : ''}">${e.text}</div>`).join('');
}

function floater(side, text, kind) {
  const box = $('#floaters');
  if (!box) return;
  const el = document.createElement('span');
  el.className = `floater ${kind}`;
  el.textContent = text;
  const x = side === 'player' ? 62 + Math.random() * 20 : 62 + Math.random() * 20;
  const y = side === 'player' ? 62 : 8;
  el.style.left = `${x}%`;
  el.style.top = `${y}%`;
  box.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
  setTimeout(() => el.remove(), 1200);
}

function shake() {
  const app = $('#app');
  app.classList.remove('shake');
  void app.offsetWidth;
  app.classList.add('shake');
}

function showScreen(name) {
  for (const id of ['title-screen', 'table-screen', 'end-screen']) {
    document.getElementById(id).classList.toggle('hidden', id !== `${name}-screen`);
  }
}

function hpFill(side, fillEl, textEl) {
  const pct = Math.max(0, (side.hp / side.maxHp) * 100);
  fillEl.style.width = `${pct}%`;
  textEl.textContent = `${side.hp} / ${side.maxHp}`;
}

function effectsHtml(side) {
  let out = '';
  if (side.burnTurns > 0) out += `<span class="chip fx-burn">🔥 Burn ${side.burn} ×${side.burnTurns}</span>`;
  if (side.weaken > 0) out += `<span class="chip fx-weaken">Weaken</span>`;
  return out;
}

function cardEl(card, i, playable) {
  const s = SCHOOLS[card.school];
  const div = document.createElement('div');
  div.className = `card school-${card.school} ${playable ? 'playable' : 'unaffordable'}`;
  div.innerHTML =
    `<div class="cost">${card.cost}</div>` +
    `<div class="glyph" style="color:${s.color}">${s.glyph}</div>` +
    `<div class="cname">${card.name}</div>` +
    `<div class="ctext">${card.text}</div>` +
    `<div class="school">${s.name.toUpperCase()}</div>`;
  div.addEventListener('click', () => playCard(i));
  return div;
}

function render() {
  if (!S) return;
  hpFill(S.ai, $('#ai-hp-fill'), $('#ai-hp-text'));
  hpFill(S.player, $('#pl-hp-fill'), $('#pl-hp-text'));
  const aiShield = $('#ai-shield');
  aiShield.classList.toggle('hidden', S.ai.shield <= 0);
  aiShield.textContent = `🛡 ${S.ai.shield}`;
  const plShield = $('#pl-shield');
  plShield.classList.toggle('hidden', S.player.shield <= 0);
  plShield.textContent = `🛡 ${S.player.shield}`;
  $('#ai-effects').innerHTML = effectsHtml(S.ai);
  $('#pl-effects').innerHTML = effectsHtml(S.player);
  $('#ai-intent').textContent = S.over ? '' : aiIntent(S.ai);
  $('#ai-deck-count').textContent = String(S.ai.deck.length);
  $('#deck-count').textContent = String(S.player.deck.length);
  $('#turn-label').textContent = `TURN ${Math.max(1, S.turn)}`;
  $('#end-turn-btn').disabled = busy || S.over;

  const energy = $('#energy');
  energy.innerHTML = '';
  for (let i = 0; i < START_ENERGY; i++) {
    const c = document.createElement('span');
    c.className = `crystal${i < S.player.energy ? ' on' : ''}`;
    energy.appendChild(c);
  }
  const lab = document.createElement('span');
  lab.className = 'elabel';
  lab.textContent = `${S.player.energy} / ${START_ENERGY} ENERGY`;
  energy.appendChild(lab);

  const aiHand = $('#ai-hand');
  aiHand.innerHTML = '';
  for (let i = 0; i < S.ai.hand.length; i++) {
    const b = document.createElement('div');
    b.className = 'mini-back';
    aiHand.appendChild(b);
  }

  const hand = $('#hand');
  hand.innerHTML = '';
  S.player.hand.forEach((card, i) => {
    hand.appendChild(cardEl(card, i, !busy && !S.over && card.cost <= S.player.energy));
  });
}

// Floating embers on the title and table backdrop.
function seedEmbers() {
  const box = $('#embers');
  for (let i = 0; i < 16; i++) {
    const s = document.createElement('span');
    const size = 3 + Math.random() * 5;
    s.style.width = `${size}px`;
    s.style.height = `${size}px`;
    s.style.left = `${Math.random() * 100}%`;
    s.style.animationDuration = `${7 + Math.random() * 9}s`;
    s.style.animationDelay = `${-Math.random() * 14}s`;
    box.appendChild(s);
  }
}

$('#play-btn').addEventListener('click', newGame);
$('#again-btn').addEventListener('click', newGame);
$('#end-turn-btn').addEventListener('click', endTurn);
document.addEventListener('keydown', (e) => {
  if (!S || S.over || $('#table-screen').classList.contains('hidden')) return;
  if (e.key >= '1' && e.key <= '5') playCard(Number(e.key) - 1);
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); endTurn(); }
});

seedEmbers();

// Playtest hook: drives the game from the browser console or automation.
window.GAME = {
  get state() { return S; },
  newGame,
  playCard,
  endTurn,
  setHp(side, hp) { if (S) S[side].hp = hp; },
};
