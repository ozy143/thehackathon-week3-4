// ─────────────────────────────────────────────
// 화면 동작: 방 그리기, 내 방(디자인 고르기), 상점(카테고리별 기본/스페셜 뽑기), 저장
// ─────────────────────────────────────────────

const W = 640, H = 500, OX = 320, OY = 196;
const STORE_KEY = 'deokjil-room-v2';
const START_COINS = 1000; // 첫 방문 선물
const RARITY_ORDER = ['legend', 'epic', 'rare', 'common'];

const $ = (s) => document.querySelector(s);
const canvas = $('#room');
const ctx = canvas.getContext('2d');
const tip = $('#tip');

// ── 저장 ──────────────────────────────────────
function freshState() { return { coins: START_COINS, owned: [], equipped: {}, free: {} }; }
function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    if (s && typeof s.coins === 'number' && Array.isArray(s.owned)) {
      return { ...freshState(), ...s, owned: s.owned.filter((id) => ITEM_BY_ID[id]) };
    }
  } catch (e) { /* 저장소를 못 쓰는 환경 */ }
  return freshState();
}
function saveState() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* 무시 */ }
}
const state = loadState();

const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const freeLeft = (cat) => state.free[cat] !== today();

// ── 어떤 디자인이 방에 놓였는지 ─────────────────
const baseOf = (type) => BASE_ITEMS.find((it) => it.type === type) || null;
function equippedItem(type) {
  const id = state.equipped[type];
  if (id === null) return null;                       // '없음'을 고른 경우
  if (id && ITEM_BY_ID[id] && (state.owned.includes(id) || ITEM_BY_ID[id].tier === 'base')) return ITEM_BY_ID[id];
  return baseOf(type);
}

// ── 방 그리기 ──────────────────────────────────
let roomItems = [];
let renderer = null;
let hovered = 0;

function rebuildRoom() {
  roomItems = [ITEM_BY_ID.cdplayer, ...TYPES.map((t) => equippedItem(t.id)).filter(Boolean)];
  renderer = new IsoRenderer(W, H, OX, OY);
  buildRoom(renderer, roomItems);
  drawRoom();
}
function drawRoom() { ctx.putImageData(renderer.compose(hovered), 0, 0); }
function setHover(id) {
  if (id === hovered) return;
  hovered = id;
  drawRoom();
}
const objIdOfType = (type) => { const i = roomItems.findIndex((it) => it.type === type); return i < 0 ? 0 : i + 2; };

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const px = Math.floor((e.clientX - rect.left) * W / rect.width);
  const py = Math.floor((e.clientY - rect.top) * H / rect.height);
  const id = renderer.objectAt(px, py);
  const it = roomItems[id - 2];
  setHover(it ? id : 0);
  if (it) {
    const box = canvas.parentElement.getBoundingClientRect();
    tip.hidden = false;
    tip.textContent = it.name;
    tip.style.left = `${e.clientX - box.left}px`;
    tip.style.top = `${e.clientY - box.top}px`;
  } else tip.hidden = true;
});
canvas.addEventListener('mouseleave', () => { setHover(0); tip.hidden = true; });

// 아이템 하나만 그린 미리보기
const previewCache = new Map();
function itemPreview(item, size = 64) {
  if (!previewCache.has(item.id)) {
    const r = new IsoRenderer(W, H, OX, OY);
    (item.preview || item.build).call(item, r, 2);
    const { img } = r.compose(0, true);
    const src = document.createElement('canvas');
    src.width = img.width; src.height = img.height;
    src.getContext('2d').putImageData(img, 0, 0);
    previewCache.set(item.id, src);
  }
  const src = previewCache.get(item.id);
  let scale = Math.min(3, size / src.width, size / src.height);
  if (scale >= 1) scale = Math.floor(scale);
  const out = document.createElement('canvas');
  out.width = size; out.height = size;
  out.className = 'preview';
  const c = out.getContext('2d');
  c.imageSmoothingEnabled = scale < 1;
  const w = src.width * scale, h = src.height * scale;
  c.drawImage(src, Math.round((size - w) / 2), Math.round((size - h) / 2), w, h);
  return out;
}

// ── 내 방 탭: 항목별 디자인 고르기 ───────────────
function renderInventory() {
  const wrap = $('#inventory');
  wrap.innerHTML = '';
  for (const cat of CATEGORIES.filter((c) => !c.soon)) {
    const h = document.createElement('h3');
    h.className = 'group';
    h.textContent = cat.name;
    wrap.appendChild(h);
    for (const t of TYPES.filter((x) => x.cat === cat.id)) {
      const variants = VARIANTS.filter((v) => v.type === t.id);
      const base = baseOf(t.id);
      const cur = equippedItem(t.id);
      const row = document.createElement('div');
      row.className = 'slot-row';
      const have = variants.filter((v) => state.owned.includes(v.id)).length;
      row.innerHTML = `<div class="slot-head"><b>${t.name}</b><small>${cur ? cur.name : '비어 있음'}</small><span class="slot-count">${have}/${variants.length}</span></div>`;
      const opts = document.createElement('div');
      opts.className = 'opts';

      const addTile = (item, label) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'opt';
        const on = item ? cur && cur.id === item.id : !cur;
        if (on) b.classList.add('on');
        b.title = item ? item.name : '놓지 않기';
        if (item) {
          b.style.setProperty('--c', item.rarity ? RARITY[item.rarity].color : '#b9a682');
          b.appendChild(itemPreview(item, 44));
        } else b.innerHTML = `<span class="none">${label}</span>`;
        b.addEventListener('click', () => {
          state.equipped[t.id] = item ? item.id : null;
          saveState();
          rebuildRoom();
          renderInventory();
        });
        opts.appendChild(b);
      };

      if (base) addTile(base); else addTile(null, '없음');
      for (const v of variants) {
        if (state.owned.includes(v.id)) addTile(v);
        else {
          const lock = document.createElement('span');
          lock.className = `opt locked ${v.tier}`;
          lock.title = `${GACHA[v.tier].name}에서 얻을 수 있어요`;
          lock.textContent = '?';
          opts.appendChild(lock);
        }
      }
      row.appendChild(opts);
      row.addEventListener('mouseenter', () => setHover(objIdOfType(t.id)));
      row.addEventListener('mouseleave', () => setHover(0));
      wrap.appendChild(row);
    }
  }
}

$('#reset').addEventListener('click', () => { $('#reset-confirm').hidden = false; });
$('#reset-no').addEventListener('click', () => { $('#reset-confirm').hidden = true; });
$('#reset-yes').addEventListener('click', () => {
  Object.assign(state, freshState());
  saveState();
  $('#reset-confirm').hidden = true;
  refreshAll();
  toast('처음 상태로 돌아갔어요');
});

// ── 탭 ─────────────────────────────────────────
document.querySelectorAll('[data-tab]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', b === btn));
    $('#tab-room').hidden = btn.dataset.tab !== 'room';
    $('#tab-shop').hidden = btn.dataset.tab !== 'shop';
  });
});

// ── 코인 ───────────────────────────────────────
function updateCoins() {
  $('#coins').textContent = state.coins.toLocaleString();
  document.querySelectorAll('[data-pull]').forEach((b) => {
    b.disabled = b.dataset.free !== '1' && state.coins < +b.dataset.cost;
  });
}
document.querySelectorAll('[data-charge]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.coins += +btn.dataset.charge;
    saveState();
    updateCoins();
    toast(`${(+btn.dataset.charge).toLocaleString()} 코인이 충전됐어요`);
  });
});

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 1800);
}

// ── 상점 ───────────────────────────────────────
let shopCat = 'interior';

function poolOf(cat, tier) {
  return VARIANTS.filter((v) => v.tier === tier && TYPE_BY_ID[v.type].cat === cat);
}
function ratesOf(cat, tier) {
  const pool = poolOf(cat, tier);
  return Object.entries(GACHA[tier].rates).filter(([r]) => pool.some((v) => v.rarity === r));
}

function renderShop() {
  const tabs = $('#cat-tabs');
  tabs.innerHTML = '';
  for (const c of CATEGORIES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-selected', c.id === shopCat);
    b.innerHTML = c.soon ? `${c.name}<small>준비 중</small>` : c.name;
    b.addEventListener('click', () => { shopCat = c.id; renderShop(); });
    tabs.appendChild(b);
  }

  const wrap = $('#gachas');
  wrap.innerHTML = '';
  const cat = CATEGORIES.find((c) => c.id === shopCat);
  if (cat.soon) {
    wrap.innerHTML = `<div class="soon"><b>${cat.name} 뽑기는 준비 중이에요</b><p>조금만 기다려 주세요!</p></div>`;
    return;
  }
  const typeNames = TYPES.filter((t) => t.cat === cat.id).map((t) => t.name).join(' · ');
  wrap.insertAdjacentHTML('beforeend',
    `<p class="pool-note"><b>${cat.name}</b>에서 나오는 항목<br>${typeNames}<br><small>기본·스페셜 뽑기 모두 같은 항목이 나와요. 스페셜은 더 화려한 디자인!</small></p>`);

  for (const [tier, g] of Object.entries(GACHA)) {
    const pool = poolOf(cat.id, tier);
    const have = pool.filter((v) => state.owned.includes(v.id)).length;
    const free = g.dailyFree && freeLeft(cat.id);
    const sec = document.createElement('section');
    sec.className = `gacha ${tier}`;
    sec.innerHTML = `
      <header>
        <h3>${g.name}</h3>
        <span class="badge">${g.badge}</span>
      </header>
      <div class="showcase"></div>
      <p>${g.desc}</p>
      <div class="meta">
        <div class="rates">${ratesOf(cat.id, tier).map(([r, w]) => `<span style="--c:${RARITY[r].color}">${RARITY[r].label} ${w}%</span>`).join('')}</div>
        <span class="collected">${have} / ${pool.length} 수집</span>
      </div>
      <div class="buy">
        ${free
          ? `<button type="button" class="free" data-pull="${tier}" data-n="1" data-free="1" data-cost="0">오늘의 무료 뽑기 <span>1회 무료</span></button>`
          : `<button type="button" data-pull="${tier}" data-n="1" data-cost="${g.price}">1회 <span><i class="coin"></i>${g.price.toLocaleString()}</span></button>`}
        <button type="button" data-pull="${tier}" data-n="10" data-cost="${g.price10}">10회 <span><i class="coin"></i>${g.price10.toLocaleString()}</span></button>
      </div>
      ${g.dailyFree && !free ? '<small class="free-note">오늘 무료 뽑기를 썼어요 · 내일 다시 열려요</small>' : ''}`;

    // 대표 디자인 3개 (서로 다른 항목, 등급 높은 순)
    const show = sec.querySelector('.showcase');
    const seen = new Set();
    [...pool].sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity))
      .filter((v) => !seen.has(v.type) && seen.add(v.type))
      .slice(0, 3)
      .forEach((v) => {
        const cell = document.createElement('div');
        cell.className = 'show';
        cell.title = v.name;
        cell.appendChild(itemPreview(v, 76));
        show.appendChild(cell);
      });
    wrap.appendChild(sec);
  }
  wrap.querySelectorAll('[data-pull]').forEach((b) => {
    b.addEventListener('click', () => pull(shopCat, b.dataset.pull, +b.dataset.n, b.dataset.free === '1'));
  });
  updateCoins();
}

function rollOnce(cat, tier) {
  const rates = ratesOf(cat, tier);
  let t = Math.random() * rates.reduce((s, [, w]) => s + w, 0);
  let rarity = rates[rates.length - 1][0];
  for (const [r, w] of rates) { if ((t -= w) < 0) { rarity = r; break; } }
  const cands = poolOf(cat, tier).filter((v) => v.rarity === rarity);
  return cands[Math.floor(Math.random() * cands.length)];
}

function pull(cat, tier, n, free) {
  const g = GACHA[tier];
  if (free) {
    if (!freeLeft(cat)) { toast('오늘 무료 뽑기는 이미 썼어요'); return; }
    state.free[cat] = today();
  } else {
    const cost = n === 10 ? g.price10 : g.price;
    if (state.coins < cost) { toast('코인이 부족해요'); return; }
    state.coins -= cost;
  }
  const results = [];
  let refund = 0;
  for (let i = 0; i < n; i++) {
    const it = rollOnce(cat, tier);
    const dup = state.owned.includes(it.id);
    if (dup) refund += RARITY[it.rarity].refund;
    else { state.owned.push(it.id); state.equipped[it.type] = it.id; } // 새 디자인은 바로 방에 배치
    results.push({ it, dup });
  }
  state.coins += refund;
  saveState();
  refreshAll();
  const catName = CATEGORIES.find((c) => c.id === cat).name;
  showResults(`${catName} ${g.name}${free ? ' (무료)' : ''}`, tier, results, refund);
}

function showResults(title, tier, results, refund) {
  $('#modal-title').textContent = `${title} 결과`;
  const box = $('#results');
  box.innerHTML = '';
  box.className = `results ${tier} ${results.length > 1 ? 'many' : 'one'}`;
  results.forEach(({ it, dup }, i) => {
    const r = RARITY[it.rarity];
    const card = document.createElement('div');
    card.className = `result ${it.rarity}`;
    card.style.setProperty('--c', r.color);
    card.style.animationDelay = `${i * 70}ms`;
    card.appendChild(itemPreview(it, results.length > 1 ? 56 : 110));
    card.insertAdjacentHTML('beforeend', `
      <span class="rar">${r.label}</span>
      <b>${it.name}</b>
      <small>${dup ? `중복 · +${r.refund}코인` : 'NEW · 방에 배치됨'}</small>`);
    box.appendChild(card);
  });
  const fresh = results.filter((x) => !x.dup).length;
  $('#modal-sum').textContent = `새 아이템 ${fresh}개${refund ? ` · 중복 환급 ${refund.toLocaleString()}코인` : ''}`;
  $('#modal').hidden = false;
  $('#modal-close').focus();
}

function closeModal() { $('#modal').hidden = true; }
$('#modal-close').addEventListener('click', closeModal);
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

// ── 시작 ───────────────────────────────────────
function refreshAll() {
  rebuildRoom();
  renderInventory();
  renderShop();
  updateCoins();
}
refreshAll();
