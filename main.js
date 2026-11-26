// ─────────────────────────────────────────────
// 화면 동작: 첫 방문(닉네임·최애 고르기), 방 그리기(가구 + 최애 + CD),
//  내 방/굿즈/옷장/음악 탭, 상점(카테고리별 기본·스페셜 뽑기, 최애 데려오기), 저장
// ─────────────────────────────────────────────

const W = 640, H = 500, OX = 320, OY = 196;
const STORE_KEY = 'deokjil-room-v2';
const START_COINS = 1000; // 첫 방문 선물
const RARITY_ORDER = ['legend', 'epic', 'rare', 'common'];

const $ = (s) => document.querySelector(s);
const canvas = $('#room');
const ctx = canvas.getContext('2d');
const tip = $('#tip');

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

// 친구 방 정보(코드에서 읽은 값)를 믿을 수 있는 값만 남겨 정리. 잘못된 값이면 null
function cleanFriend(d) {
  if (!d || typeof d !== 'object' || typeof d.n !== 'string' || !d.n.trim() || !CHARACTER_BY_ID[d.c]) return null;
  const e = {};
  if (d.e && typeof d.e === 'object') {
    for (const t of TYPES) {
      const id = d.e[t.id];
      if (id === null) e[t.id] = null;
      else if (ITEM_BY_ID[id] && ITEM_BY_ID[id].type === t.id) e[t.id] = id;
    }
  }
  return {
    id: String(d.id || '').slice(0, 16),
    n: d.n.trim().slice(0, 12),
    c: d.c,
    o: OUTFIT_BY_ID[d.o] ? d.o : DEFAULT_OUTFIT,
    e,
    s: SONG_BY_ID[d.s] ? d.s : DEFAULT_SONG,
    at: typeof d.at === 'string' ? d.at.slice(0, 10) : '',
    sample: !!d.sample,
  };
}

// 받침 있으면 b, 없으면 a (예: josa('지젤', '와', '과') → '과')
function josa(word, a, b) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 ? b : a;
}

// ── 저장 ──────────────────────────────────────
function freshState() {
  return {
    coins: START_COINS, owned: [], equipped: {}, free: {},
    nickname: '', chars: [], char: null, outfits: {}, song: DEFAULT_SONG,
    uid: Math.random().toString(36).slice(2, 12), friends: [],
  };
}
function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    if (s && typeof s.coins === 'number' && Array.isArray(s.owned)) {
      const st = { ...freshState(), ...s };
      st.owned = s.owned.filter((id) => ITEM_BY_ID[id] || OUTFIT_BY_ID[id] || SONG_BY_ID[id]);
      st.chars = (Array.isArray(s.chars) ? s.chars : []).filter((id) => CHARACTER_BY_ID[id]);
      if (!st.chars.includes(st.char)) st.char = st.chars[0] || null;
      if (s.outfit && !s.outfits) st.outfits = s.char ? { [s.char]: s.outfit } : {}; // 이전 버전 저장 데이터
      delete st.outfit;
      if (!SONG_BY_ID[st.song]) st.song = DEFAULT_SONG;
      if (typeof s.uid !== 'string' || !s.uid) st.uid = freshState().uid;
      st.friends = (Array.isArray(s.friends) ? s.friends : []).map(cleanFriend).filter(Boolean);
      return st;
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
const hasItem = (it) => it.tier === 'base' || state.owned.includes(it.id);

// ── 현재 고른 것들 ──────────────────────────────
const baseOf = (type) => BASE_ITEMS.find((it) => it.type === type) || null;
function equippedItem(type) {
  const id = state.equipped[type];
  if (id === null) return null;                       // '없음'을 고른 경우
  if (id && ITEM_BY_ID[id] && hasItem(ITEM_BY_ID[id])) return ITEM_BY_ID[id];
  return baseOf(type);
}
const currentCharacter = () => CHARACTER_BY_ID[state.char] || null;
function outfitOf(charId) {
  const o = OUTFIT_BY_ID[state.outfits[charId]];
  return o && hasItem(o) ? o : OUTFIT_BY_ID[DEFAULT_OUTFIT];
}
const ownedSongs = () => SONGS.filter(hasItem);
function currentSong() {
  const s = SONG_BY_ID[state.song];
  return s && hasItem(s) ? s : SONG_BY_ID[DEFAULT_SONG];
}

// ── 그림 불러오기 ──────────────────────────────
const dressSrc = (it) => DRESSUP_DIR + it.img;
const imgCache = new Map();
function loadImg(src) {
  if (!imgCache.has(src)) {
    imgCache.set(src, new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = src;
    }));
  }
  return imgCache.get(src);
}

// ── 방 그리기 ──────────────────────────────────
// 최애는 방 가운데 서 있는 세로 판으로 그려서, 가구와 앞뒤가 깊이 버퍼로 맞게 겹칩니다.
//  발 위치 (c, c), 판 너비 2a타일(화면 가로), 높이 h(px). sw×sh = 화면에 그려지는 픽셀 크기
const IDOL_OBJ = 900;
const IDOL_SCALE = 1.7;
const IDOL = { c: 5.5, a: 0.74 * IDOL_SCALE, z0: 0.5, h: 62 * IDOL_SCALE };
IDOL.sw = Math.round(4 * IDOL.a * HW * PX);
IDOL.sh = Math.round(IDOL.h * PX);

const spriteCache = new Map();
// 캐릭터+옷을 방 크기로 줄인 픽셀 그림 { canvas, data }. 아직 없으면 불러온 뒤 방을 다시 그립니다.
//  index.html을 파일로 바로 열면 브라우저가 그림 픽셀 읽기를 막아서 data가 null → 방 위에 겹쳐 표시
function idolSprite(ch, of) {
  const key = `${ch.id}|${of.id}`;
  if (spriteCache.has(key)) return spriteCache.get(key);
  spriteCache.set(key, null);
  Promise.all([loadImg(dressSrc(ch)), loadImg(dressSrc(of))]).then(([a, b]) => {
    const cv = document.createElement('canvas');
    cv.width = IDOL.sw; cv.height = IDOL.sh;
    const c = cv.getContext('2d');
    c.imageSmoothingQuality = 'high';
    c.drawImage(a, 0, 0, IDOL.sw, IDOL.sh);
    c.drawImage(b, 0, 0, IDOL.sw, IDOL.sh);
    let data = null;
    try { data = c.getImageData(0, 0, IDOL.sw, IDOL.sh); } catch (e) { /* file:// 에서는 막힘 */ }
    spriteCache.set(key, { canvas: cv, data });
    rebuildRoom();
  }).catch(() => spriteCache.delete(key));
  return null;
}

// 픽셀을 못 읽을 때: 같은 자리에 픽셀 그림 캔버스를 겹쳐 보여 줌 (가구와 앞뒤 가림은 없음)
const roomIdol = $('#room-idol');
function showIdolOverlay(sprite) {
  roomIdol.hidden = !sprite;
  if (!sprite) return;
  const { c, a, z0, h, sw, sh } = IDOL;
  const left = OX - 2 * a * HW * PX, top = OY + (2 * c * HH - (z0 + h)) * PX;
  Object.assign(roomIdol.style, {
    left: `${(left / W) * 100}%`, top: `${(top / H) * 100}%`,
    width: `${(sw / W) * 100}%`, height: `${(sh / H) * 100}%`,
  });
  roomIdol.replaceChildren(sprite.canvas);
  roomIdol.title = tipText(IDOL_OBJ);
  roomIdol.setAttribute('aria-label', roomIdol.title);
}
roomIdol.addEventListener('click', () => { if (!visiting) switchTab('closet'); });

function buildIdol(r, sprite) {
  const { c, a, z0, h, sw, sh } = IDOL, d = sprite.data.data; // ImageData의 픽셀 배열
  r.face([c - a, c + a, z0], [2 * a, -2 * a, 0], [0, 0, h], 'py', (x, _y, z) => {
    const px = Math.min(sw - 1, Math.max(0, Math.floor(((x - (c - a)) / (2 * a)) * sw)));
    const py = Math.min(sh - 1, Math.max(0, Math.floor((1 - (z - z0) / h) * sh)));
    const i = (py * sw + px) * 4;
    return d[i + 3] >= 128 ? [d[i], d[i + 1], d[i + 2]] : null;
  }, IDOL_OBJ);
}

const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
// CD 플레이어 앞면에 지금 넣어 둔 CD를 그림
function buildDisc(r, song, objId) {
  const R = ITEM_BY_ID.cdplayer.disc.r, x = CD.depth + 0.01;
  const [ca, cb] = song.colors.map(hexRgb);
  r.face([x, CD.cy - R / L, CD.cz - R], [0, (2 * R) / L, 0], [0, 0, 2 * R], 'px', (_, y, z) => {
    const du = (y - CD.cy) * L, dz = z - CD.cz, d = Math.hypot(du, dz);
    if (d > R - 0.3) return null;
    if (d < 1.6) return [120, 114, 106];
    if (d < 3.2) return [226, 222, 216];
    const t = (Math.atan2(dz, du) / Math.PI + 1) / 2;
    let col = mix(ca, cb, Math.abs(t * 2 - 1));
    if (Math.abs(du + dz) < 1.2 && d > 4) col = mix(col, [255, 255, 255], 0.45); // 반짝이는 줄
    return col;
  }, objId);
}

let roomItems = [];
let renderer = null;
let hovered = 0;

// 지금 화면에 그릴 방: 내 방, 또는 놀러 간 친구의 방
let visiting = null;
function friendItem(f, type) {
  const id = f.e[type];
  if (id === null) return null;
  return ITEM_BY_ID[id] || baseOf(type);
}
function roomView() {
  if (visiting) {
    return {
      items: TYPES.map((t) => friendItem(visiting, t.id)).filter(Boolean),
      ch: CHARACTER_BY_ID[visiting.c], of: OUTFIT_BY_ID[visiting.o], song: SONG_BY_ID[visiting.s], nick: visiting.n,
    };
  }
  const ch = currentCharacter();
  return {
    items: TYPES.map((t) => equippedItem(t.id)).filter(Boolean),
    ch, of: ch ? outfitOf(ch.id) : null, song: currentSong(), nick: state.nickname,
  };
}

function rebuildRoom() {
  const view = roomView();
  roomItems = [ITEM_BY_ID.cdplayer, ...view.items];
  renderer = new IsoRenderer(W, H, OX, OY);
  const sprite = view.ch ? idolSprite(view.ch, view.of) : null;
  const { c } = IDOL, sr = 0.28 * IDOL_SCALE;
  // 최애 발밑 그림자는 바닥 그림자(footprint)로 표시
  const shadow = sprite ? [{ id: 'idol-shadow', footprint: [c - sr, c - sr, c + sr, c + sr] }] : [];
  buildRoom(renderer, [...roomItems, ...shadow]);
  buildDisc(renderer, view.song, 2);
  if (sprite && sprite.data) buildIdol(renderer, sprite);
  showIdolOverlay(sprite && !sprite.data ? sprite : null);
  drawRoom();
  updateStageBar();
}

// 방 위쪽 띠: 방 이름 / 친구 방 방문 중 표시
function updateStageBar() {
  $('#room-label').hidden = !!visiting;
  $('#room-label').textContent = state.nickname ? `${state.nickname}의 방` : '';
  $('#visit-bar').hidden = !visiting;
  if (visiting) $('#visit-text').textContent = `${visiting.n}님의 방에 놀러 왔어요`;
}
function visit(f) {
  visiting = f;
  rebuildRoom();
  closeFriends();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  toast(`${f.n}님의 방에 놀러 왔어요! CD 플레이어를 눌러 친구의 음악도 들어 보세요`);
}
// 내 방을 바꾸는 동작을 하면 내 방으로 돌아와서 보여 줌
function homeRoom() {
  visiting = null;
  rebuildRoom();
}
$('#visit-home').addEventListener('click', homeRoom);
function drawRoom() { ctx.putImageData(renderer.compose(hovered), 0, 0); }
function setHover(id) {
  if (id === hovered) return;
  hovered = id;
  drawRoom();
}
const objIdOfType = (type) => { const i = roomItems.findIndex((it) => it.type === type); return i < 0 ? 0 : i + 2; };

function objectUnder(e) {
  const rect = canvas.getBoundingClientRect();
  const px = Math.floor((e.clientX - rect.left) * W / rect.width);
  const py = Math.floor((e.clientY - rect.top) * H / rect.height);
  return renderer.objectAt(px, py);
}
function tipText(id) {
  const view = roomView();
  if (id === IDOL_OBJ) return `${view.nick}의 최애 · ${view.ch.name}${visiting ? '' : ' (눌러서 꾸미기)'}`;
  const it = roomItems[id - 2];
  if (!it) return '';
  if (it.type === 'cdplayer') {
    return MusicPlayer.playing && MusicPlayer.song === view.song
      ? `♪ ${view.song.name} (눌러서 정지)` : `CD 플레이어 · ${view.song.name} (눌러서 재생)`;
  }
  return it.name;
}
canvas.addEventListener('mousemove', (e) => {
  const id = objectUnder(e);
  const text = tipText(id);
  setHover(text ? id : 0);
  canvas.style.cursor = (id === IDOL_OBJ && !visiting) || id === 2 ? 'pointer' : '';
  if (text) {
    const box = tip.parentElement.getBoundingClientRect();
    tip.hidden = false;
    tip.textContent = text;
    tip.style.left = `${e.clientX - box.left}px`;
    tip.style.top = `${e.clientY - box.top}px`;
  } else tip.hidden = true;
});
canvas.addEventListener('mouseleave', () => { setHover(0); tip.hidden = true; });
canvas.addEventListener('click', (e) => {
  const id = objectUnder(e);
  if (id === IDOL_OBJ && !visiting) switchTab('closet');
  else if (id === 2) {
    // 친구 방에서는 친구의 CD를 내 CD로 바꾸지 않고 그대로 들려줌
    const song = roomView().song;
    if (MusicPlayer.playing && MusicPlayer.song === song) MusicPlayer.stop();
    else if (visiting) MusicPlayer.play(song);
    else playSong(song);
    tip.textContent = tipText(2);
  }
});

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

// 캐릭터는 머리, 의상은 옷 부분만 보이게 자른 썸네일 (의상은 세로 3:4라서 size는 높이)
function dressThumb(it, kind, size) {
  const d = document.createElement('span');
  d.className = `dress-thumb ${kind}`;
  d.style.backgroundImage = `url("${dressSrc(it)}")`;
  if (size) { d.style.height = `${size}px`; d.style.width = kind === 'outfit' ? `${size * 0.75}px` : `${size}px`; }
  return d;
}
// 곡은 CD 모양 썸네일
function songThumb(song, size) {
  const d = document.createElement('span');
  d.className = 'song-thumb';
  d.style.setProperty('--a', song.colors[0]);
  d.style.setProperty('--b', song.colors[1]);
  if (size) { d.style.width = `${size}px`; d.style.height = `${size}px`; }
  return d;
}
function itemThumb(it, size) {
  if (it.type === 'outfit') return dressThumb(it, 'outfit', size);
  if (it.type === 'song') return songThumb(it, size * 0.8);
  return itemPreview(it, size);
}

// ── 내 방 / 굿즈 탭: 항목별 디자인 고르기 ─────────
function renderInventory(catId, wrap) {
  wrap.innerHTML = '';
  for (const t of TYPES.filter((x) => x.cat === catId)) {
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
        homeRoom();
        renderInventory(catId, wrap);
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

// ── 옷장 탭: 최애 고르기 + 옷 갈아입히기 ─────────
let shownOutfit = null;
function wear(outfitId) {
  state.outfits[state.char] = outfitId;
  saveState();
  homeRoom();
  renderCloset();
}
function renderCloset() {
  const ch = currentCharacter();
  if (!ch) return;
  const of = outfitOf(ch.id);
  const fig = $('#idol-figure');
  fig.innerHTML = '';
  const body = new Image();
  body.src = dressSrc(ch);
  body.alt = `${ch.name} 최애가 ${of.name}${josa(of.name, '를', '을')} 입은 모습`;
  const cloth = new Image();
  cloth.src = dressSrc(of);
  cloth.alt = '';
  const key = `${ch.id}|${of.id}`;
  if (shownOutfit && shownOutfit !== key) cloth.classList.add('swap');
  shownOutfit = key;
  fig.append(body, cloth);
  $('#idol-caption').innerHTML = `${ch.name} · ${of.name}<small>${of.desc}</small>`;

  const pick = $('#char-pick');
  pick.innerHTML = '';
  for (const c of CHARACTERS) {
    const own = state.chars.includes(c.id);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = own ? 'char-card' : 'char-card not-mine';
    if (c.id === ch.id) b.classList.add('on');
    b.title = own ? c.name : `${c.name} · 상점에서 ${CHARACTER_PRICE}코인으로 데려올 수 있어요`;
    b.appendChild(dressThumb(c, 'character'));
    b.insertAdjacentHTML('beforeend', `<b>${c.name}</b><small>${own ? (c.id === ch.id ? '꾸미는 중' : '함께하는 중') : `${CHARACTER_PRICE.toLocaleString()}코인`}</small>`);
    if (!own) b.insertAdjacentHTML('beforeend', '<span class="lock-tag">구매</span>');
    b.addEventListener('click', () => {
      if (own) { state.char = c.id; saveState(); homeRoom(); renderCloset(); return; }
      shopCat = 'character';
      renderShop();
      switchTab('shop');
    });
    pick.appendChild(b);
  }

  const closet = $('#closet');
  closet.innerHTML = '';
  let have = 0;
  for (const o of OUTFITS) {
    if (!hasItem(o)) {
      const lock = document.createElement('span');
      lock.className = `cloth locked ${o.tier}`;
      lock.innerHTML = `<b>?</b>${GACHA[o.tier].name}`;
      closet.appendChild(lock);
      continue;
    }
    have++;
    const r = o.rarity ? RARITY[o.rarity] : null;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `cloth ${o.rarity || 'base'}`;
    if (o.id === of.id) b.classList.add('on');
    if (r) b.style.setProperty('--c', r.color);
    b.title = o.desc;
    b.appendChild(dressThumb(o, 'outfit'));
    b.insertAdjacentHTML('beforeend', `<span class="rar">${r ? r.label : '기본'}</span>${o.name}`);
    b.addEventListener('click', () => wear(o.id));
    closet.appendChild(b);
  }
  $('#stat-closet').innerHTML = `<b>${have}</b>/${OUTFITS.length}<small>옷</small>`;
}

// ── 음악 탭: 플레이어 + 내 CD ─────────────────────
function playSong(song) {
  const changed = state.song !== song.id;
  state.song = song.id;
  saveState();
  if (changed) rebuildRoom(); // CD 플레이어 속 CD 바꾸기
  MusicPlayer.play(song);
}
function togglePlay() {
  if (MusicPlayer.playing) MusicPlayer.stop();
  else playSong(currentSong());
}
function stepSong(dir) {
  const list = ownedSongs();
  const i = list.findIndex((s) => s.id === currentSong().id);
  playSong(list[(i + dir + list.length) % list.length]);
}
$('#player-toggle').addEventListener('click', togglePlay);
$('#player-prev').addEventListener('click', () => stepSong(-1));
$('#player-next').addEventListener('click', () => stepSong(1));

function renderMusic() {
  const song = currentSong();
  const playing = MusicPlayer.playing && MusicPlayer.song === song;
  // 친구 방에서 친구 곡을 듣는 중이면 플레이어에는 그 곡을 보여 줌
  const shown = MusicPlayer.playing ? MusicPlayer.song : song;
  const disc = $('#player-disc');
  disc.style.setProperty('--a', shown.colors[0]);
  disc.style.setProperty('--b', shown.colors[1]);
  disc.classList.toggle('spin', MusicPlayer.playing);
  $('#player-title').textContent = shown.name;
  $('#player-desc').textContent = MusicPlayer.playing && shown !== song ? `친구 방에서 듣는 중 · ${shown.desc}` : shown.desc;
  const tg = $('#player-toggle');
  tg.textContent = MusicPlayer.playing ? '⏸' : '▶';
  tg.setAttribute('aria-label', MusicPlayer.playing ? '정지' : '재생');

  const list = $('#songs');
  list.innerHTML = '';
  for (const s of SONGS) {
    if (!hasItem(s)) {
      const lock = document.createElement('span');
      lock.className = `song-row locked ${s.tier}`;
      lock.innerHTML = `<span class="song-q">?</span><span>${GACHA[s.tier].name}에서 얻을 수 있어요</span>`;
      list.appendChild(lock);
      continue;
    }
    const r = s.rarity ? RARITY[s.rarity] : null;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'song-row';
    if (s.id === song.id) b.classList.add('on');
    if (s.id === song.id && playing) b.classList.add('playing');
    b.appendChild(songThumb(s, 34));
    b.insertAdjacentHTML('beforeend', `
      <span class="song-name"><b>${s.name}</b><small>${s.desc}</small></span>
      <span class="rar" style="--c:${r ? r.color : 'var(--muted)'}">${s.id === song.id && playing ? '♪ 재생 중' : r ? r.label : '기본'}</span>`);
    b.addEventListener('click', () => (s.id === song.id && playing ? MusicPlayer.stop() : playSong(s)));
    list.appendChild(b);
  }
  $('#stat-music').innerHTML = `<b>${ownedSongs().length}</b>/${SONGS.length}<small>CD</small>`;

  const np = $('#now-playing');
  np.hidden = !MusicPlayer.playing;
  if (MusicPlayer.playing) np.textContent = `♪ ${MusicPlayer.song.name}`;
}
MusicPlayer.onChange(renderMusic);

// ── 처음부터 다시 하기 ──────────────────────────
$('#reset').addEventListener('click', () => { $('#reset-confirm').hidden = false; });
$('#reset-no').addEventListener('click', () => { $('#reset-confirm').hidden = true; });
$('#reset-yes').addEventListener('click', () => {
  MusicPlayer.stop();
  Object.keys(state).forEach((k) => delete state[k]);
  Object.assign(state, freshState());
  saveState();
  visiting = null;
  $('#reset-confirm').hidden = true;
  refreshAll();
  showWelcome();
});

// ── 탭 ─────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('[data-tab]').forEach((b) => {
    b.setAttribute('aria-selected', b.dataset.tab === name);
    $(`#tab-${b.dataset.tab}`).hidden = b.dataset.tab !== name;
  });
}
document.querySelectorAll('[data-tab]').forEach((btn) => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ── 코인 ───────────────────────────────────────
function updateCoins() {
  $('#coins').textContent = state.coins.toLocaleString();
  document.querySelectorAll('[data-cost]').forEach((b) => {
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
  toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
}

// ── 상점 ───────────────────────────────────────
let shopCat = 'interior';

function poolOf(cat, tier) {
  if (cat === 'character') return OUTFITS.filter((o) => o.tier === tier);
  if (cat === 'music') return SONGS.filter((s) => s.tier === tier);
  return VARIANTS.filter((v) => v.tier === tier && TYPE_BY_ID[v.type].cat === cat);
}
// 풀에 실제로 있는 등급만 남기고, 합이 100%가 되게 다시 나눔
function ratesOf(cat, tier) {
  const pool = poolOf(cat, tier);
  const list = Object.entries(GACHA[tier].rates).filter(([r]) => pool.some((v) => v.rarity === r));
  const sum = list.reduce((s, [, w]) => s + w, 0);
  return list.map(([r, w]) => [r, Math.round((w * 100) / sum)]);
}

// 카테고리별 소개 문구 (인테리어·굿즈는 공통 문구)
const SHOP_TEXT = {
  character: {
    note: '기본 뽑기는 일상복, 스페셜 뽑기는 무대의상이 나와요.<br><small>새 옷은 뽑자마자 지금 최애가 바로 입고, 옷장에서 언제든 갈아입힐 수 있어요.</small>',
    basic: '원피스·파자마·스트릿패션 같은 일상복', special: '조명 아래 반짝이는 무대의상',
  },
  music: {
    note: '기본 뽑기는 일상 플레이리스트, 스페셜 뽑기는 무대 위 명곡이 나와요.<br><small>새 곡은 CD 플레이어에 바로 들어가요. 음악 탭이나 방의 CD 플레이어로 들어 보세요.</small>',
    basic: '방에서 흥얼거리기 좋은 일상 노래', special: '공연장의 열기를 담은 특별한 노래',
  },
};

function buyCharacter(id) {
  const c = CHARACTER_BY_ID[id];
  if (state.chars.includes(id)) return;
  if (state.coins < CHARACTER_PRICE) { toast('코인이 부족해요'); return; }
  state.coins -= CHARACTER_PRICE;
  state.chars.push(id);
  state.char = id;
  saveState();
  visiting = null;
  refreshAll();
  toast(`${c.name}${josa(c.name, '와', '과')} 함께하게 됐어요! 옷장에서 꾸며 보세요`);
}

function renderAdopt(wrap) {
  const sec = document.createElement('section');
  sec.className = 'gacha adopt';
  sec.innerHTML = `
    <header><h3>최애 데려오기</h3><span class="badge">한 명당 ${CHARACTER_PRICE.toLocaleString()}코인</span></header>
    <div class="adopt-list"></div>`;
  const list = sec.querySelector('.adopt-list');
  for (const c of CHARACTERS) {
    const own = state.chars.includes(c.id);
    const card = document.createElement('div');
    card.className = 'adopt-card';
    card.appendChild(dressThumb(c, 'character'));
    card.insertAdjacentHTML('beforeend', `<b>${c.name}</b>`);
    const b = document.createElement('button');
    b.type = 'button';
    if (own) { b.textContent = '함께하는 중'; b.disabled = true; } else {
      b.dataset.cost = CHARACTER_PRICE;
      b.innerHTML = `데려오기 <span><i class="coin"></i>${CHARACTER_PRICE.toLocaleString()}</span>`;
      b.addEventListener('click', () => buyCharacter(c.id));
    }
    card.appendChild(b);
    list.appendChild(card);
  }
  wrap.appendChild(sec);
}

function renderShop() {
  const tabs = $('#cat-tabs');
  tabs.innerHTML = '';
  for (const c of CATEGORIES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-selected', c.id === shopCat);
    b.textContent = c.name;
    b.addEventListener('click', () => { shopCat = c.id; renderShop(); });
    tabs.appendChild(b);
  }

  const wrap = $('#gachas');
  wrap.innerHTML = '';
  const cat = CATEGORIES.find((c) => c.id === shopCat);
  const text = SHOP_TEXT[cat.id];
  if (text) {
    wrap.insertAdjacentHTML('beforeend', `<p class="pool-note"><b>${cat.desc}</b><br>${text.note}</p>`);
  } else {
    const typeNames = TYPES.filter((t) => t.cat === cat.id).map((t) => t.name).join(' · ');
    wrap.insertAdjacentHTML('beforeend',
      `<p class="pool-note"><b>${cat.name}</b>에서 나오는 항목<br>${typeNames}<br><small>기본·스페셜 뽑기 모두 같은 항목이 나와요. 스페셜은 더 화려한 디자인!</small></p>`);
  }
  if (cat.id === 'character') renderAdopt(wrap);

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
      <p>${text ? text[tier] : g.desc}</p>
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

    // 대표 3개 (방 아이템은 서로 다른 항목, 등급 높은 순)
    const show = sec.querySelector('.showcase');
    const seen = new Set();
    [...pool].sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity))
      .filter((v) => text || (!seen.has(v.type) && seen.add(v.type)))
      .slice(0, 3)
      .forEach((v) => {
        const cell = document.createElement('div');
        cell.className = 'show';
        cell.title = v.name;
        cell.appendChild(itemThumb(v, 76));
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
  let picked = null; // 옷·곡: 새로 얻은 것 중 바로 입히거나 CD에 넣을 것 (등급 높은 것 우선)
  for (let i = 0; i < n; i++) {
    const it = rollOnce(cat, tier);
    const dup = state.owned.includes(it.id);
    if (dup) refund += RARITY[it.rarity].refund;
    else {
      state.owned.push(it.id);
      if (it.type === 'outfit' || it.type === 'song') {
        if (!picked || RARITY_ORDER.indexOf(it.rarity) < RARITY_ORDER.indexOf(picked.rarity)) picked = it;
      } else state.equipped[it.type] = it.id; // 새 디자인은 바로 방에 배치
    }
    results.push({ it, dup });
  }
  if (picked && picked.type === 'outfit') state.outfits[state.char] = picked.id;
  if (picked && picked.type === 'song') state.song = picked.id;
  state.coins += refund;
  saveState();
  visiting = null;
  refreshAll();
  const catName = CATEGORIES.find((c) => c.id === cat).name;
  showResults(`${catName} ${g.name}${free ? ' (무료)' : ''}`, tier, results, refund, cat, picked);
}

// 결과 창의 버튼: 어디로 가서 무엇을 할지
const MODAL_GO = {
  character: { label: '최애 보러 가기', tab: 'closet' },
  music: { label: '음악 들으러 가기', tab: 'music', play: true },
  goods: { label: '굿즈 확인하기', tab: 'goods' },
  interior: { label: '방에서 확인하기', tab: 'room' },
};
let modalGo = MODAL_GO.interior;
function freshLabel(it, picked) {
  if (it.type === 'outfit') return it === picked ? 'NEW · 바로 입었어요' : 'NEW · 옷장에 보관';
  if (it.type === 'song') return it === picked ? 'NEW · CD 플레이어에 넣었어요' : 'NEW · 내 CD에 보관';
  return 'NEW · 방에 배치됨';
}
function showResults(title, tier, results, refund, cat, picked) {
  modalGo = MODAL_GO[cat];
  $('#modal-close').textContent = modalGo.label;
  $('#modal-title').textContent = `${title} 결과`;
  const box = $('#results');
  box.innerHTML = '';
  box.className = `results ${tier} ${results.length > 1 ? 'many' : 'one'}`;
  const many = results.length > 1;
  results.forEach(({ it, dup }, i) => {
    const r = RARITY[it.rarity];
    const card = document.createElement('div');
    card.className = `result ${it.rarity}`;
    card.style.setProperty('--c', r.color);
    card.style.animationDelay = `${i * 70}ms`;
    card.appendChild(itemThumb(it, it.type === 'outfit' ? (many ? 80 : 160) : (many ? 56 : 110)));
    card.insertAdjacentHTML('beforeend', `
      <span class="rar">${r.label}</span>
      <b>${it.name}</b>
      <small>${dup ? `중복 · +${r.refund}코인` : freshLabel(it, picked)}</small>`);
    box.appendChild(card);
  });
  const fresh = results.filter((x) => !x.dup).length;
  $('#modal-sum').textContent = `새 아이템 ${fresh}개${refund ? ` · 중복 환급 ${refund.toLocaleString()}코인` : ''}`;
  $('#modal').hidden = false;
  $('#modal-close').focus();
}

function closeModal() { $('#modal').hidden = true; }
$('#modal-close').addEventListener('click', () => {
  closeModal();
  switchTab(modalGo.tab);
  if (modalGo.play) playSong(currentSong());
});
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); closeFriends(); } });

// ── 처음 방문: 닉네임 → 최애 고르기 ───────────────
let welcomePick = CHARACTERS[0].id;
function showWelcome() {
  $('#welcome').hidden = false;
  $('#step-name').hidden = false;
  $('#step-idol').hidden = true;
  $('#nickname').value = state.nickname || '';
  $('#nickname').focus();
}
function renderIdolChoices() {
  const box = $('#idol-choices');
  box.innerHTML = '';
  for (const c of CHARACTERS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'idol-choice';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', c.id === welcomePick);
    const fig = document.createElement('span');
    fig.className = 'idol-mini';
    const body = new Image(); body.src = dressSrc(c); body.alt = '';
    const cloth = new Image(); cloth.src = dressSrc(OUTFIT_BY_ID[DEFAULT_OUTFIT]); cloth.alt = '';
    fig.append(body, cloth);
    b.appendChild(fig);
    b.insertAdjacentHTML('beforeend', `<b>${c.name}</b>`);
    b.addEventListener('click', () => { welcomePick = c.id; renderIdolChoices(); });
    box.appendChild(b);
  }
}
$('#step-name').addEventListener('submit', (e) => {
  e.preventDefault();
  const nick = $('#nickname').value.trim();
  if (!nick) { $('#nickname').focus(); return; }
  state.nickname = nick;
  saveState();
  updateTitle();
  $('#welcome-nick').textContent = nick;
  welcomePick = state.char || CHARACTERS[0].id;
  renderIdolChoices();
  $('#step-name').hidden = true;
  $('#step-idol').hidden = false;
});
$('#welcome-back').addEventListener('click', showWelcome);
$('#step-idol').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!state.chars.includes(welcomePick)) state.chars.push(welcomePick);
  state.char = welcomePick;
  saveState();
  $('#welcome').hidden = true;
  refreshAll();
  const c = CHARACTER_BY_ID[welcomePick];
  toast(`${state.nickname}님, ${c.name}${josa(c.name, '와', '과')} 함께 덕질방을 시작해요!`);
  handleInvite();
});

function updateTitle() {
  $('#room-owner').textContent = state.nickname ? `${state.nickname}의 덕질방` : '나만의 덕질방';
  document.title = state.nickname ? `픽마이돌 · ${state.nickname}의 덕질방` : '픽마이돌';
}

// ── 친구: 코드·초대 링크로 서로의 방 정보를 주고받기 ─────
//  서버가 없어서 '코드를 만든 순간의 방'을 코드 안에 담아 보냅니다.
const CODE_PREFIX = 'PMI-';
function encodeCode(obj) {
  let bin = '';
  new TextEncoder().encode(JSON.stringify(obj)).forEach((b) => { bin += String.fromCharCode(b); });
  return CODE_PREFIX + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decodeCode(text) {
  try {
    let s = String(text).trim().replace(/^.*friend=/, '').replace(/^PMI-/, '').replace(/[^A-Za-z0-9_-].*$/, '');
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const bytes = Uint8Array.from(atob(s), (ch) => ch.charCodeAt(0));
    return cleanFriend(JSON.parse(new TextDecoder().decode(bytes)));
  } catch (e) { return null; }
}
function mySnapshot() {
  const e = {};
  for (const t of TYPES) {
    const it = equippedItem(t.id), base = baseOf(t.id);
    const a = it ? it.id : null, b = base ? base.id : null;
    if (a !== b) e[t.id] = a; // 기본과 다른 것만 담아 코드를 짧게
  }
  const ch = currentCharacter();
  return { v: 1, id: state.uid, n: state.nickname, c: ch.id, o: outfitOf(ch.id).id, e, s: currentSong().id };
}
const myCode = () => encodeCode(mySnapshot());
const inviteLink = () => `${location.href.split('#')[0]}#friend=${myCode()}`;

// 바로 체험해 볼 수 있는 예시 친구 방
const SAMPLE_FRIEND = cleanFriend({
  id: 'sample', n: '덕질메이트', c: 'char_03_brown_wavy', o: 'outfit_legendary_01_stage', s: 'song_concert', sample: true,
  e: {
    bed: 'bed_check', desk: 'desk_hutch', cabinet: 'cabinet_wood', rug: 'rug_check', cushion: 'cushion_heart',
    plant: 'plant_small', plush: 'plush_crown', lightstick: 'lightstick_heart', signed: 'signed_gold', neon: 'neon_big',
  },
});

function addFriend(f) {
  if (f.id && f.id === state.uid) { toast('내 친구 코드예요. 친구의 코드를 붙여 넣어 주세요'); return; }
  f.at = new Date().toISOString().slice(0, 10);
  f.sample = false;
  const i = state.friends.findIndex((x) => (f.id ? x.id === f.id : x.n === f.n));
  if (i >= 0) { state.friends[i] = f; toast(`${f.n}님의 방 정보를 새로 받았어요`); } else {
    state.friends.unshift(f);
    toast(`${f.n}님과 친구가 됐어요! 놀러가기를 눌러 보세요`);
  }
  if (visiting && visiting.id === f.id) { visiting = f; rebuildRoom(); }
  saveState();
  renderFriends();
}

function friendRow(f) {
  const ch = CHARACTER_BY_ID[f.c];
  const row = document.createElement('div');
  row.className = `fr-row${f.sample ? ' sample' : ''}${visiting && visiting.id === f.id ? ' here' : ''}`;
  row.appendChild(dressThumb(ch, 'character'));
  row.insertAdjacentHTML('beforeend', `
    <span class="fr-info"><b>${escapeHtml(f.n)}</b><small>${f.sample ? '예시 친구 · 체험용 방' : `최애 ${ch.name}${f.at ? ` · ${f.at} 추가` : ''}`}</small></span>`);
  const go = document.createElement('button');
  go.type = 'button';
  go.className = 'primary small';
  go.textContent = visiting && visiting.id === f.id ? '방문 중' : '놀러가기';
  go.addEventListener('click', () => visit(f));
  row.appendChild(go);
  if (!f.sample) {
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'icon-btn';
    del.setAttribute('aria-label', `${f.n} 친구 삭제`);
    del.textContent = '✕';
    del.addEventListener('click', () => {
      state.friends = state.friends.filter((x) => x !== f);
      if (visiting === f) homeRoom();
      saveState();
      renderFriends();
      toast(`${f.n}님을 친구 목록에서 지웠어요`);
    });
    row.appendChild(del);
  }
  return row;
}
function renderFriends() {
  const n = state.friends.length;
  $('#friend-count').textContent = n;
  $('#friend-count2').textContent = n ? `${n}명` : '';
  if (state.nickname && currentCharacter()) $('#my-code').value = myCode();
  const list = $('#friend-list');
  list.innerHTML = '';
  if (!n) list.insertAdjacentHTML('beforeend', '<p class="fr-empty">아직 친구가 없어요. 친구에게 코드를 받아 추가해 보세요!</p>');
  state.friends.forEach((f) => list.appendChild(friendRow(f)));
  list.insertAdjacentHTML('beforeend', '<p class="fr-label">예시 방 둘러보기</p>');
  list.appendChild(friendRow(SAMPLE_FRIEND));
}
function openFriends() { renderFriends(); $('#friends').hidden = false; }
function closeFriends() { $('#friends').hidden = true; }
$('#open-friends').addEventListener('click', openFriends);
$('#friends-close').addEventListener('click', closeFriends);
$('#friends').addEventListener('click', (e) => { if (e.target.id === 'friends') closeFriends(); });

async function copyText(text, what) {
  try {
    await navigator.clipboard.writeText(text);
    toast(`${what} 복사했어요. 친구에게 보내 주세요`);
  } catch (e) {
    const ta = $('#my-code');
    ta.value = text;
    ta.select();
    toast(document.execCommand('copy') ? `${what} 복사했어요. 친구에게 보내 주세요` : '복사가 안 돼요. 칸을 직접 선택해서 복사해 주세요');
  }
}
$('#copy-code').addEventListener('click', () => copyText(myCode(), '친구 코드를'));
$('#copy-link').addEventListener('click', () => copyText(inviteLink(), '초대 링크를'));
$('#add-friend').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('#friend-input');
  const f = decodeCode(input.value);
  if (!f) { toast('올바른 친구 코드가 아니에요. 다시 확인해 주세요'); input.focus(); return; }
  addFriend(f);
  input.value = '';
});

// 초대 링크(#friend=코드)로 들어오면 입장 후 친구로 추가
let pendingInvite = null;
function readInviteHash() {
  const m = /friend=([^&]+)/.exec(location.hash);
  if (!m) return false;
  pendingInvite = decodeCode(m[1]);
  try { history.replaceState(null, '', location.href.split('#')[0]); } catch (e) { location.hash = ''; }
  return true;
}
readInviteHash();
// 사이트가 열려 있는 탭에 초대 링크를 붙여 넣은 경우(페이지가 새로 로드되지 않음)
window.addEventListener('hashchange', () => {
  if (readInviteHash() && $('#splash').hidden && state.nickname && state.chars.length) handleInvite();
});
function handleInvite() {
  if (!pendingInvite) return;
  const f = pendingInvite;
  pendingInvite = null;
  addFriend(f);
  openFriends();
}

// ── 탭 머리글의 수집 현황 ────────────────────────
function updateStats() {
  const stat = (cat) => {
    const all = VARIANTS.filter((v) => TYPE_BY_ID[v.type].cat === cat);
    return `<b>${all.filter((v) => state.owned.includes(v.id)).length}</b>/${all.length}<small>수집</small>`;
  };
  $('#stat-room').innerHTML = stat('interior');
  $('#stat-goods').innerHTML = stat('goods');
  const free = CATEGORIES.filter((c) => freeLeft(c.id)).length;
  $('#stat-shop').innerHTML = `<b>${free}</b>회<small>오늘 무료</small>`;
}

// ── 입장 화면 ───────────────────────────────────
$('#enter').addEventListener('click', () => {
  const sp = $('#splash');
  sp.classList.add('out');
  setTimeout(() => { sp.hidden = true; }, 550);
  if (!state.nickname || !state.chars.length) showWelcome();
  else handleInvite();
});

// ── 시작 ───────────────────────────────────────
function refreshAll() {
  updateTitle();
  rebuildRoom();
  renderInventory('interior', $('#inv-interior'));
  renderInventory('goods', $('#inv-goods'));
  renderCloset();
  renderMusic();
  renderShop();
  renderFriends();
  updateStats();
  updateCoins();
}
refreshAll();
$('#enter').focus();
