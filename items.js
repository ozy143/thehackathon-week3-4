// ─────────────────────────────────────────────
// 뽑기 카테고리·확률·아이템 디자인
//  카테고리(인테리어/캐릭터/아이돌 굿즈)마다 기본 뽑기와 스페셜 뽑기가 있고,
//  두 뽑기에서 나오는 '항목(type)'은 같습니다. 스페셜(tier: 'special') 쪽이 더 화려한 디자인.
// ─────────────────────────────────────────────

const CATEGORIES = [
  { id: 'interior', name: '인테리어', desc: '방을 채우는 가구와 생활 소품' },
  { id: 'character', name: '캐릭터', desc: '당신의 최애를 꾸미세요!' },
  { id: 'goods', name: '아이돌 굿즈', desc: '최애를 위한 덕질 굿즈' },
  { id: 'music', name: '음악', desc: 'CD 플레이어로 듣는 덕질방 노래' },
];

// 방에 놓이는 순서이기도 합니다.
const TYPES = [
  { id: 'bed', cat: 'interior', name: '침대' },
  { id: 'desk', cat: 'interior', name: '책상 세트' },
  { id: 'cabinet', cat: 'interior', name: '장식장' },
  { id: 'rug', cat: 'interior', name: '러그' },
  { id: 'cushion', cat: 'interior', name: '쿠션' },
  { id: 'plant', cat: 'interior', name: '화분' },
  { id: 'lamp', cat: 'interior', name: '조명' },
  { id: 'blanket', cat: 'interior', name: '이불' },
  { id: 'pillow', cat: 'interior', name: '베개' },
  { id: 'poster', cat: 'goods', name: '응원 포스터' },
  { id: 'album', cat: 'goods', name: '앨범 CD' },
  { id: 'acrylic', cat: 'goods', name: '아크릴 스탠드' },
  { id: 'lightstick', cat: 'goods', name: '응원봉' },
  { id: 'plush', cat: 'goods', name: '최애 인형' },
  { id: 'signed', cat: 'goods', name: '사인 앨범' },
  { id: 'neon', cat: 'goods', name: '네온사인' },
];

const RARITY = {
  common: { label: '일반', color: '#8a9199', refund: 20 },
  rare:   { label: '레어', color: '#3b8ad6', refund: 50 },
  epic:   { label: '에픽', color: '#a057d6', refund: 120 },
  legend: { label: '전설', color: '#e09b12', refund: 300 },
};

const GACHA = {
  basic: {
    name: '기본 뽑기', badge: '매일 1회 무료',
    desc: '심플하고 기본에 충실한 디자인',
    price: 100, price10: 900, dailyFree: true,
    rates: { common: 80, rare: 20 },
  },
  special: {
    name: '스페셜 뽑기', badge: '더 화려한 디자인',
    desc: '같은 항목, 훨씬 특별하고 반짝이는 디자인',
    price: 300, price10: 2700, dailyFree: false,
    rates: { rare: 60, epic: 30, legend: 10 },
  },
};

const WHITE = [250, 249, 246];

// 칸 안 굿즈를 그릴 때 쓰는 앞면 좌표 도우미: u(가로, 오른쪽 +), v(세로, 위 +)
const frontUV = (x, z, cx, cz) => [(x - cx) * L, z - cz];

// 파스텔 홀로그램 색
function holo(t) {
  const stops = [[250, 180, 210], [206, 186, 246], [170, 226, 230], [252, 232, 160], [250, 180, 210]];
  t = ((t % 1) + 1) % 1 * 4;
  const i = Math.floor(t);
  return mix(stops[i], stops[i + 1], t - i);
}
// 반짝이 (작은 십자)
function sparkle(u, v, seed, density = 0.25, cell = 4) {
  const cu = Math.floor(u / cell), cv = Math.floor(v / cell);
  if (hash3(cu, cv, seed) > density) return false;
  const lu = u - (cu + 0.5) * cell, lv = v - (cv + 0.5) * cell;
  return (Math.abs(lu) < 0.5 && Math.abs(lv) < 1.3) || (Math.abs(lv) < 0.5 && Math.abs(lu) < 1.3);
}

// 침대 위 공통 부품
function mattress(r, id, top = 17) {
  r.box(6.1, 0.3, 12, 8.7, 4.5, top, solid([246, 244, 238]), id);
}
function pillows(r, id, a, b, top = 21.5) {
  r.box(6.25, 0.4, 16.5, 7.35, 1.3, top, a, id);
  r.box(7.45, 0.4, 16.5, 8.55, 1.3, top, b, id);
}

const VARIANTS = [
  // ══ 인테리어 · 기본 뽑기 ══════════════════════
  {
    id: 'bed_check', type: 'bed', tier: 'basic', rarity: 'rare',
    name: '블루 체크 원목 침대', desc: '서랍 달린 원목 침대와 시원한 체크 이불',
    footprint: [BED.x0, 0, BED.x1, BED.y1],
    build(r, id) {
      const wd = [192, 130, 74], m = wood(wd), dark = wood(mul(wd, 0.78));
      for (const [lx, ly] of [[6.0, 0.3], [8.55, 0.3], [6.0, 4.35], [8.55, 4.35]]) r.box(lx, ly, 0, lx + 0.25, ly + 0.25, 3, dark, id);
      r.box(6.0, 0.3, 3, 8.8, 4.6, 12, (x, y, z, face) => {
        let c = m(x, y, z, face);
        if (face === 'px') {
          if (Math.abs(y - 2.45) < 0.04 || z < 3.8 || z > 11.2) c = mul(c, 0.8);
          if (Math.abs(z - 7.5) < 0.9 && (Math.abs(y - 1.4) < 0.1 || Math.abs(y - 3.5) < 0.1)) c = [236, 214, 150];
        }
        if (face === 'py' && (z < 3.8 || z > 11.2)) c = mul(c, 0.85);
        return c;
      }, id);
      r.box(6.0, 0, 0, 8.8, 0.3, 37, (x, y, z, face) => {
        const c = m(x, y, z, face);
        return face === 'py' && z > 12 && ((x - 6.0) / 0.35) % 1 < 0.12 ? mul(c, 0.76) : c;
      }, id);
      r.box(5.96, 0, 37, 8.84, 0.42, 40, m, id);
      mattress(r, id);
      const ging = (a, b) => {
        const p = ((a * 4) % 2 + 2) % 2 < 1, q = ((b * 4) % 2 + 2) % 2 < 1;
        return p && q ? [90, 142, 212] : (p || q) ? [160, 196, 236] : [250, 250, 252];
      };
      r.box(6.05, 1.7, 12.5, 8.75, 4.55, 18.5, (x, y, z, face) =>
        face === 'top' ? ging(x, y) : mul(ging(face === 'py' ? x : y, z / 8), face === 'py' ? 0.88 : 0.78), id);
      r.box(6.05, 1.7, 18.5, 8.75, 2.0, 19.3, solid(WHITE), id);
      r.box(6.04, 3.55, 12.6, 8.76, 4.05, 19, solid([238, 188, 72]), id);
      pillows(r, id, solid(WHITE), solid([196, 218, 244]));
    },
  },
  {
    id: 'desk_hutch', type: 'desk', tier: 'basic', rarity: 'rare',
    name: '원목 책장 책상', desc: '책꽂이가 달린 원목 책상과 민트 의자',
    footprint: [0, DESK.y0, DESK.x1, DESK.y1],
    build(r, id) {
      const wd = [202, 142, 84], m = wood(wd);
      buildDesk(r, id, m, [96, 64, 40]);
      r.box(0, 6.0, 26, 0.1, 9.0, 46, wood(mul(wd, 0.82)), id);
      r.box(0, 6.0, 26, 0.55, 6.12, 46, m, id);
      r.box(0, 8.88, 26, 0.55, 9.0, 46, m, id);
      r.box(0.1, 6.12, 34, 0.55, 8.88, 35.5, m, id);
      r.box(0, 6.0, 46, 0.58, 9.0, 48, m, id);
      const books = [[240, 150, 180], [150, 120, 200], [110, 180, 130], [100, 150, 220], [220, 90, 100], [240, 200, 100], [170, 110, 190]];
      let y = 7.2;
      books.forEach((col, i) => {
        const w = 0.13 + (i % 3) * 0.03, h = 6 + (i * 5) % 4;
        r.box(0.12, y, 35.5, 0.48, y + w, 35.5 + h, solid(col), id);
        y += w + 0.02;
      });
      r.box(0.15, 6.35, 26, 0.5, 7.0, 27.4, solid([246, 236, 206]), id);
      const green = [150, 206, 172];
      buildChair(r, id, wood(mul(wd, 0.85)), solid(green), roundTop(solid(green), 33), 33);
    },
  },
  {
    id: 'cabinet_wood', type: 'cabinet', tier: 'basic', rarity: 'rare',
    name: '진한 원목 장식장', desc: '따뜻한 베이지 뒤판의 원목 장식장',
    footprint: [CAB.x0, 0, CAB.x1, CAB.d],
    build(r, id) {
      buildCabinet(r, id, wood([146, 90, 50]), wood([218, 172, 112]));
    },
  },
  {
    id: 'rug_check', type: 'rug', tier: 'basic', rarity: 'common',
    name: '체크 러그', desc: '방 한가운데 까는 포근한 체크무늬 러그',
    build(r, id) {
      const X0 = 3.3, X1 = 6.6, Y0 = 5.0, Y1 = 8.2;
      r.box(X0, Y0, 0, X1, Y1, 0.8, (x, y, z, face) => {
        if (face !== 'top') return mul([214, 150, 150], SHADE[face]);
        if (Math.min(x - X0, X1 - x, y - Y0, Y1 - y) < 0.15) return [226, 150, 160];
        const a = ((x - X0) * 4) % 2 < 0.45, b = ((y - Y0) * 4) % 2 < 0.45;
        if (a && b) return [232, 140, 158];
        if (a || b) return [240, 192, 190];
        return [246, 232, 204];
      }, id);
    },
  },
  {
    id: 'cushion_heart', type: 'cushion', tier: 'basic', rarity: 'common',
    name: '하트 방석', desc: '러그 위에 놓는 말랑한 방석',
    build(r, id) {
      const cx = 4.6, cy = 6.4;
      r.box(4.2, 6.0, 0, 5.0, 6.8, 4, painted([242, 138, 170], {
        top: (x, y) => (inHeart(flatU(x - cx, y - cy) / 5, flatV(x - cx, y - cy) / 5) ? WHITE : undefined),
      }), id);
    },
  },
  {
    id: 'plant_small', type: 'plant', tier: 'basic', rarity: 'common',
    name: '작은 화분', desc: '장식장 위에 올려 둔 초록 화분',
    build(r, id) {
      const z = CAB.h, leaf = solid([108, 166, 88]);
      r.box(3.45, 0.3, z, 3.95, 0.8, z + 6, solid([200, 112, 74]), id);
      r.box(3.5, 0.35, z + 6, 3.9, 0.75, z + 6.5, solid([92, 62, 44]), id);
      r.box(3.55, 0.4, z + 6.5, 3.85, 0.7, z + 11, solid([86, 140, 72]), id);
      r.box(3.35, 0.5, z + 9, 3.7, 0.85, z + 13, leaf, id);
      r.box(3.72, 0.25, z + 8, 4.02, 0.55, z + 12, leaf, id);
      r.box(3.6, 0.45, z + 12, 3.85, 0.7, z + 16, leaf, id);
    },
  },
  {
    id: 'lamp_desk', type: 'lamp', tier: 'basic', rarity: 'common',
    name: '스탠드 조명', desc: '책상을 은은하게 밝혀 주는 조명',
    build(r, id) {
      const z = DESK.top, g = solid([96, 86, 80]);
      r.box(1.0, 6.25, z, 1.4, 6.65, z + 1.2, g, id);
      r.box(1.16, 6.41, z + 1.2, 1.24, 6.49, z + 13, g, id);
      r.box(0.9, 6.15, z + 13, 1.5, 6.75, z + 20, glow([255, 232, 160]), id);
    },
  },
  {
    id: 'blanket_stripe', type: 'blanket', tier: 'basic', rarity: 'common',
    name: '라벤더 줄무늬 이불', desc: '침대를 포근하게 덮는 줄무늬 이불',
    build(r, id) {
      const lav = [178, 156, 222], lavL = [214, 200, 240];
      r.box(6.03, 1.5, 12, 8.77, 4.33, 20, (x, y, z, face) =>
        mul(Math.floor((x - 6.03) * 6) % 3 === 0 ? lavL : lav, SHADE[face]), id);
      r.box(6.03, 1.5, 20, 8.77, 1.9, 21, solid(lavL), id);
    },
  },
  {
    id: 'pillow_plain', type: 'pillow', tier: 'basic', rarity: 'common',
    name: '폭신한 베개', desc: '깔끔한 흰 베개 두 개',
    build(r, id) {
      r.box(6.2, 0.32, 16.5, 7.35, 1.32, 22.5, solid(WHITE), id);
      r.box(7.45, 0.32, 16.5, 8.6, 1.32, 22.5, solid([236, 236, 232]), id);
    },
  },

  // ══ 인테리어 · 스페셜 뽑기 ════════════════════
  {
    id: 'bed_heart', type: 'bed', tier: 'special', rarity: 'legend',
    name: '핑크 하트 침대', desc: '하트 헤드보드와 하트 무늬 이불의 공주 침대',
    footprint: [BED.x0, 0, BED.x1, BED.y1],
    build(r, id) {
      const cr = [238, 226, 212], m = wood(cr);
      for (const [lx, ly] of [[6.0, 0.3], [8.52, 0.3], [6.0, 4.32], [8.52, 4.32]]) {
        r.box(lx, ly, 0, lx + 0.28, ly + 0.28, 1.5, m, id);
        r.box(lx + 0.05, ly + 0.05, 1.5, lx + 0.23, ly + 0.23, 4, m, id);
      }
      r.box(6.0, 0.3, 4, 8.8, 4.6, 12, (x, y, z, face) => {
        const c = m(x, y, z, face);
        return face !== 'top' && (z < 5 || z > 11) ? mul(c, 0.88) : c;
      }, id);
      const arch = (x) => 37 + 6 * Math.sqrt(Math.max(0, 1 - ((x - 7.4) / 1.45) ** 2));
      r.box(6.0, 0, 0, 8.8, 0.3, 43, (x, y, z, face) => {
        if (z > arch(x) + 0.01) return null;
        let c = m(x, y, z, face);
        if (face === 'py') {
          if (z > arch(x) - 1.4) c = mul(c, 0.86);
          if (inHeart((x - 7.4) * L / 3.4, (z - 34) / 3.4)) c = [228, 104, 142];
        }
        return c;
      }, id);
      mattress(r, id);
      const pat = (a, b, base) => {
        const g = 0.42, row = Math.floor(b / g), off = (row % 2) * g / 2;
        const la = ((((a + off) % g) + g) % g - g / 2) * L, lb = (((b % g) + g) % g - g / 2) * L;
        return inHeart(la / 1.8, -lb / 1.8) ? [255, 224, 234] : base;
      };
      const pink = [240, 138, 168];
      r.box(6.05, 1.6, 12.5, 8.75, 4.55, 18.5, (x, y, z, face) =>
        face === 'top' ? pat(x, y, pink) : mul(pat(face === 'py' ? x : y, z / L, pink), face === 'py' ? 0.88 : 0.78), id);
      r.box(6.05, 1.6, 18.5, 8.75, 2.0, 19.5, solid([248, 188, 206]), id);
      pillows(r, id, solid(WHITE), solid([250, 206, 218]));
    },
  },
  {
    id: 'bed_star', type: 'bed', tier: 'special', rarity: 'legend',
    name: '별밤 침대', desc: '달과 별이 수놓인 밤하늘 이불의 라일락 침대',
    footprint: [BED.x0, 0, BED.x1, BED.y1],
    build(r, id) {
      const lil = [212, 204, 234], m = solid(lil), gold = [242, 198, 80];
      for (const [lx, ly] of [[6.0, 0.3], [8.55, 0.3], [6.0, 4.35], [8.55, 4.35]]) r.box(lx, ly, 0, lx + 0.25, ly + 0.25, 4, solid(mul(lil, 0.9)), id);
      r.box(6.0, 0.3, 4, 8.8, 4.6, 12, m, id);
      r.box(6.0, 0, 0, 8.8, 0.3, 41, painted(lil, {
        py: (x, y, z) => {
          const u = (x - 8.0) * L, v = z - 34;
          if (Math.hypot(u, v) < 4.6 && Math.hypot(u - 1.9, v - 1.3) >= 4.0) return gold;
          if (inStar((x - 7.0) * L, z - 37, 2.4)) return gold;
          if (inStar((x - 6.6) * L, z - 31, 1.6)) return gold;
          return undefined;
        },
      }), id);
      mattress(r, id);
      const navy = (a, b) => {
        const g = 0.42, ca = Math.floor(a / g), cb = Math.floor(b / g);
        if (hash3(ca, cb, 9) < 0.55 && inStar((a - (ca + 0.5) * g) * L, (b - (cb + 0.5) * g) * L, 2.3)) return [244, 204, 90];
        return [52, 62, 140];
      };
      r.box(6.05, 1.6, 12.5, 8.75, 4.55, 18.5, (x, y, z, face) =>
        face === 'top' ? navy(x, y) : mul(navy(face === 'py' ? x : y, z / L), face === 'py' ? 0.88 : 0.78), id);
      r.box(6.05, 1.6, 18.5, 8.75, 2.0, 19.5, solid([82, 94, 178]), id);
      pillows(r, id, solid(WHITE), solid([224, 216, 246]));
      r.box(7.05, 1.0, 17, 7.6, 1.45, 22, solid([248, 208, 84]), id);
    },
  },
  {
    id: 'desk_white', type: 'desk', tier: 'special', rarity: 'legend',
    name: '화이트 하트 데스크', desc: '하트 의자와 하늘색 매트가 있는 화이트 책상',
    footprint: [0, DESK.y0, DESK.x1, DESK.y1],
    build(r, id) {
      const white = [246, 243, 237], pink = [240, 160, 182];
      buildDesk(r, id, solid(white), pink, solid([232, 226, 218]));
      r.box(0.5, 7.3, 26, 1.15, 8.2, 26.4, (x, y, z, face) =>
        mul(Math.min(x - 0.5, 1.15 - x, y - 7.3, 8.2 - y) < 0.06 ? [120, 170, 220] : [176, 214, 242], SOFT[face]), id);
      const back = roundTop(painted(pink, {
        px: (x, y, z) => (inHeart((7.45 - y) * L / 2.8, (z - 27) / 2.8) ? WHITE : undefined),
      }), 35, 3);
      buildChair(r, id, solid(pink), solid(pink), back, 35);
      r.box(2.05, 7.05, 15.5, 2.76, 7.85, 16.6, solid(WHITE), id);
    },
  },
  {
    id: 'desk_lav', type: 'desk', tier: 'special', rarity: 'legend',
    name: '라벤더 모니터 데스크', desc: '하트 화면 모니터와 키보드가 놓인 라벤더 책상',
    footprint: [0, DESK.y0, DESK.x1, DESK.y1],
    build(r, id) {
      const lav = [206, 196, 236], dark = [54, 52, 84], gold = [242, 198, 80], z = DESK.top;
      buildDesk(r, id, solid(lav), gold, solid(mul(lav, 0.92)));
      r.box(0.3, 7.4, z, 0.7, 8.0, z + 1, solid(dark), id);
      r.box(0.42, 7.65, z + 1, 0.52, 7.75, z + 6, solid(dark), id);
      r.box(0.2, 6.9, z + 5, 0.32, 8.5, z + 19, (x, y, zz, face) => {
        if (face !== 'px') return mul(dark, SOFT[face]);
        const u = (7.7 - y) * L, v = zz - (z + 12);
        if (Math.abs(u) > 11 || Math.abs(v) > 5.8) return dark;
        if (inHeart(u / 3, (v + 0.3) / 3)) return [255, 150, 196];
        return mix([150, 150, 240], [236, 180, 236], (v + 6) / 12);
      }, id);
      r.box(0.7, 7.1, z, 1.0, 8.4, z + 0.9, painted([244, 244, 250], {
        top: (x, y) => (((y - 7.1) * 10) % 1 < 0.2 || ((x - 0.7) * 10) % 1 < 0.25 ? [214, 214, 228] : undefined),
      }), id);
      r.box(0.75, 8.6, z, 0.95, 8.8, z + 1.3, solid([244, 244, 250]), id);
      const purple = [130, 98, 192];
      const back = roundTop(painted(purple, {
        px: (x, y, zz) => (inStar((7.45 - y) * L, zz - 27, 3.2) ? gold : undefined),
      }), 35, 2);
      buildChair(r, id, solid(mul(purple, 0.85)), solid(purple), back, 35);
    },
  },
  {
    id: 'cabinet_white', type: 'cabinet', tier: 'special', rarity: 'epic',
    name: '화이트 파스텔 장식장', desc: '칸마다 파스텔 뒤판이 들어간 하얀 장식장',
    footprint: [CAB.x0, 0, CAB.x1, CAB.d],
    build(r, id) {
      const pastel = [[170, 206, 236], [246, 190, 206], [176, 224, 200], [248, 226, 150], [214, 196, 240], [246, 190, 206], [176, 224, 200], [170, 206, 236], [248, 226, 150]];
      buildCabinet(r, id, solid([246, 244, 240]), (x, y, z, face, cell) => {
        let c = [232, 230, 226];
        if (cell >= 0 && face === 'py') {
          const s = CAB_SLOTS[cell];
          if (Math.abs(x - s.cx) < 0.24 && z > s.z0 + 2 && z < s.z1 - 3) c = pastel[cell];
        }
        return mul(c, SOFT[face]);
      });
    },
  },
  {
    id: 'cabinet_mint', type: 'cabinet', tier: 'special', rarity: 'epic',
    name: '민트 하트 장식장', desc: '하트 장식과 핑크 구슬이 달린 민트 장식장',
    footprint: [CAB.x0, 0, CAB.x1, CAB.d],
    build(r, id) {
      const mint = [156, 214, 196], pink = [244, 168, 186];
      buildCabinet(r, id, solid(mint), (x, y, z, face, cell) => {
        let c = [248, 218, 224];
        if (cell >= 0 && face === 'py') {
          const s = CAB_SLOTS[cell];
          if (Math.abs(x - s.cx) < 0.18 && z > s.z0 + 3 && z < s.z1 - 3.5) c = [238, 184, 198];
        }
        return mul(c, SOFT[face]);
      });
      r.box(2.25, 0, CAB.h, 3.15, 0.22, CAB.h + 11, painted(mint, {
        py: (x, y, z) => (inHeart((x - 2.7) * L / 3, (z - CAB.h - 5.5) / 3) ? pink : undefined),
        top: () => mul(mint, 1.05),
      }), id);
      for (let x = CAB.x0 + 0.08; x < CAB.x1 - 0.1; x += 0.26) {
        if (x > 2.2 && x < 3.2) continue;
        r.box(x, 0.84, CAB.h, x + 0.14, 0.98, CAB.h + 2.4, solid(pink), id);
      }
    },
  },
  {
    id: 'rug_cloud', type: 'rug', tier: 'special', rarity: 'rare',
    name: '구름 러그', desc: '몽글몽글한 가장자리의 파스텔 구름 러그',
    build(r, id) {
      const cx = 4.95, cy = 6.6;
      const rr = (x, y) => Math.hypot((x - cx) / 1.75, (y - cy) / 1.55);
      const edge = (x, y) => 1 + 0.05 * Math.cos(12 * Math.atan2(y - cy, x - cx));
      r.extrude(3.0, 4.8, 6.9, 8.4, 0, 1, (x, y) => rr(x, y) < edge(x, y), (x, y, z, top) => {
        const d = rr(x, y);
        let c = d > 0.84 ? [252, 248, 244] : d > 0.64 ? [246, 188, 206] : d > 0.42 ? [212, 198, 242] : [252, 242, 216];
        if (d < 0.42 && sparkle(flatU(x - cx, y - cy), flatV(x - cx, y - cy), 4, 0.3, 5)) c = [246, 200, 110];
        return top ? c : mul(c, 0.78);
      }, id);
    },
  },
  {
    id: 'cushion_lace', type: 'cushion', tier: 'special', rarity: 'rare',
    name: '레이스 하트 쿠션', desc: '하얀 레이스를 두른 통통한 하트 쿠션',
    build(r, id) {
      const cx = 4.6, cy = 6.4;
      const hu = (x, y, s) => inHeart(flatU(x - cx, y - cy) / s, flatV(x - cx, y - cy) / s);
      r.extrude(3.8, 5.6, 5.4, 7.2, 0, 1.5, (x, y) => hu(x, y, 9.5), (x, y, z, top) => {
        const lace = Math.floor((Math.atan2(y - cy, x - cx) + 4) * 6) % 2 === 0;
        return mul(lace ? WHITE : [240, 232, 236], top ? 1 : 0.82);
      }, id);
      r.extrude(3.8, 5.6, 5.4, 7.2, 1.5, 6, (x, y, z) => hu(x, y, 8.4 * (1 - 0.28 * ((z - 1.5) / 4.5) ** 2)), (x, y, z, top) => {
        if (top && hu(x, y, 3)) return WHITE;
        return top ? [242, 128, 162] : [212, 100, 134];
      }, id);
    },
  },
  {
    id: 'plant_flower', type: 'plant', tier: 'special', rarity: 'rare',
    name: '하트 꽃 화분', desc: '하트 도자기 화분에 핀 분홍 꽃',
    build(r, id) {
      const z = CAB.h, leaf = solid([108, 172, 96]);
      r.box(3.42, 0.28, z, 3.98, 0.84, z + 7, painted(WHITE, {
        py: (x, y, zz) => (inHeart((x - 3.7) * L / 1.6, (zz - z - 3.5) / 1.6) ? [240, 130, 164] : undefined),
      }), id);
      r.box(3.48, 0.34, z + 7, 3.92, 0.78, z + 7.5, solid([92, 62, 44]), id);
      r.box(3.55, 0.42, z + 7.5, 3.85, 0.7, z + 12, solid([88, 146, 80]), id);
      r.box(3.36, 0.5, z + 10, 3.68, 0.84, z + 14, leaf, id);
      r.box(3.74, 0.26, z + 9, 4.02, 0.56, z + 13, leaf, id);
      for (const [fx, fy, fz] of [[3.42, 0.52, 14], [3.8, 0.3, 13], [3.62, 0.52, 16.5], [3.86, 0.6, 15]]) {
        r.box(fx, fy, z + fz, fx + 0.16, fy + 0.16, z + fz + 2.2, solid([250, 150, 188]), id);
        r.box(fx + 0.05, fy + 0.05, z + fz + 2.2, fx + 0.11, fy + 0.11, z + fz + 2.6, solid([252, 222, 110]), id);
      }
    },
  },
  {
    id: 'lamp_pink', type: 'lamp', tier: 'special', rarity: 'epic',
    name: '핑크 버섯 무드등', desc: '동글동글한 갓에서 분홍빛이 새어 나오는 무드등',
    build(r, id) {
      const z = DESK.top, cx = 1.2, cy = 6.45;
      const rad = (x, y) => Math.hypot(x - cx, y - cy);
      r.extrude(0.9, 6.15, 1.5, 6.75, z, z + 1.5, (x, y) => rad(x, y) < 0.24, (x, y, zz, top) => (top ? [246, 170, 192] : [222, 140, 166]), id);
      r.box(cx - 0.04, cy - 0.04, z + 1.5, cx + 0.04, cy + 0.04, z + 12, solid([214, 214, 224]), id);
      r.extrude(0.7, 5.95, 1.7, 6.95, z + 11, z + 19, (x, y, zz) => {
        const t = (zz - (z + 12)) / 7;
        return rad(x, y) < (t < 0 ? 0.42 : 0.44 * Math.sqrt(Math.max(0, 1 - t * t)));
      }, (x, y, zz, top) => (top ? [255, 226, 236] : mix([255, 186, 208], [255, 220, 232], (zz - z - 11) / 8)), id);
    },
  },
  {
    id: 'blanket_ribbon', type: 'blanket', tier: 'special', rarity: 'epic',
    name: '리본 하트 이불', desc: '하트 무늬와 레이스 끝단, 리본이 달린 이불',
    build(r, id) {
      const cream = [252, 244, 240], pink = [242, 150, 182];
      const pat = (a, b) => {
        const g = 0.5, row = Math.floor(b / g), off = (row % 2) * g / 2;
        const la = ((((a + off) % g) + g) % g - g / 2) * L, lb = (((b % g) + g) % g - g / 2) * L;
        return inHeart(la / 2, -lb / 2) ? pink : cream;
      };
      r.box(6.03, 1.5, 12, 8.77, 4.33, 20, (x, y, z, face) => {
        if (face === 'top') return pat(x, y);
        const a = face === 'py' ? x : y;
        if (z < 14 + Math.abs(Math.sin(a * 18)) * 1.2) return mul([250, 210, 224], SOFT[face]);
        return mul(pat(a, z / L), SOFT[face]);
      }, id);
      r.box(6.03, 1.5, 20, 8.77, 1.9, 21, solid([246, 176, 200]), id);
      r.box(7.2, 1.45, 21, 7.6, 1.8, 22.6, solid([232, 100, 140]), id);
    },
  },
  {
    id: 'pillow_lace', type: 'pillow', tier: 'special', rarity: 'rare',
    name: '레이스 리본 베개', desc: '레이스 테두리에 리본을 단 핑크·화이트 베개',
    build(r, id) {
      const laced = (base, x0, x1) => painted(base, {
        top: (x, y) => (Math.min(x - x0, x1 - x, y - 0.32, 1.32 - y) < 0.08 ? WHITE : undefined),
        py: (x, y, z) => (z < 17.6 + Math.abs(Math.sin(x * 22)) ? WHITE : undefined),
      });
      r.box(6.2, 0.32, 16.5, 7.35, 1.32, 22.5, laced([250, 200, 214], 6.2, 7.35), id);
      r.box(7.45, 0.32, 16.5, 8.6, 1.32, 22.5, laced([248, 240, 240], 7.45, 8.6), id);
      r.box(6.62, 0.75, 22.5, 6.92, 1.0, 23.8, solid([232, 100, 140]), id);
    },
  },

  // ══ 아이돌 굿즈 · 기본 뽑기 ═══════════════════
  {
    id: 'poster_basic', type: 'poster', tier: 'basic', rarity: 'common',
    name: '응원 포스터', desc: '최애를 응원하는 별 포스터',
    wallShadow: { wall: 'back', rect: [4.55, 5.85, 38, 66] },
    build(r, id) {
      const X0 = 4.45, X1 = 5.75, Z0 = 40, Z1 = 68, cx = (X0 + X1) / 2, cz = 54, hu = (X1 - X0) * L / 2;
      r.box(X0, 0, Z0, X1, 0.06, Z1, painted(WHITE, {
        py: (x, y, z) => {
          const [u, v] = frontUV(x, z, cx, cz);
          if (Math.abs(u) > hu - 1.5 || v > Z1 - cz - 1.5 || v < Z0 - cz + 1.5) return WHITE;
          if (inStar(u, v - 3, 7)) return [255, 236, 140];
          if ((v < -7 && v > -8.5 && Math.abs(u) < 6) || (v < -10 && v > -11.5 && Math.abs(u) < 4)) return WHITE;
          return mix([200, 140, 220], [246, 150, 182], (v + 14) / 28);
        },
      }), id);
    },
  },
  {
    id: 'album_basic', type: 'album', tier: 'basic', rarity: 'common',
    name: '앨범 CD', desc: '장식장에 세워 둔 최애의 앨범',
    build(r, id) {
      const s = CAB_SLOTS[6], z = s.z0;
      r.box(s.cx - 0.3, 0.62, z, s.cx + 0.3, 0.74, z + 10, painted([60, 52, 80], {
        py: (x, y, zz) => {
          const [u, v] = frontUV(x, zz, s.cx, z + 5);
          const d = Math.hypot(u - 1, v + 0.5);
          if (d < 1) return [230, 230, 236];
          if (d < 3.5) return [150, 120, 210];
          return mix([110, 80, 170], [240, 150, 190], (v + 5) / 10);
        },
      }), id);
    },
  },
  {
    id: 'acrylic_basic', type: 'acrylic', tier: 'basic', rarity: 'common',
    name: '아크릴 스탠드', desc: '최애 모습을 담은 투명 아크릴 스탠드',
    build(r, id) {
      const s = CAB_SLOTS[7], z = s.z0;
      r.box(s.cx - 0.25, 0.45, z, s.cx + 0.25, 0.85, z + 1, solid([212, 232, 242]), id);
      r.box(s.cx - 0.22, 0.62, z + 1, s.cx + 0.22, 0.66, z + 11.5, painted([200, 226, 240], {
        py: (x, y, zz) => figure(...frontUV(x, zz, s.cx, z + 6)) || [208, 232, 244],
      }), id);
    },
  },
  {
    id: 'plush_basic', type: 'plush', tier: 'basic', rarity: 'common',
    name: '최애 인형', desc: '장식장 한 칸을 차지한 말랑한 토끼 인형',
    build(r, id) { plushBody(r, id, [252, 226, 234]); },
  },
  {
    id: 'lightstick_basic', type: 'lightstick', tier: 'basic', rarity: 'rare',
    name: '응원봉', desc: '콘서트의 설렘을 담은 핑크 응원봉',
    build(r, id) {
      const s = CAB_SLOTS[8], z = s.z0;
      r.box(s.cx - 0.07, 0.55, z, s.cx + 0.07, 0.69, z + 6, solid([70, 64, 78]), id);
      r.box(s.cx - 0.2, 0.42, z + 6, s.cx + 0.2, 0.82, z + 11, glow([255, 150, 198]), id);
      r.box(s.cx - 0.08, 0.54, z + 11, s.cx + 0.08, 0.7, z + 12, glow([255, 230, 240]), id);
    },
  },
  {
    id: 'signed_basic', type: 'signed', tier: 'basic', rarity: 'rare',
    name: '사인 앨범', desc: '하얀 액자에 넣은 사인 앨범',
    build(r, id) { signedAlbum(r, id, [244, 242, 238], false); },
  },
  {
    id: 'neon_basic', type: 'neon', tier: 'basic', rarity: 'rare',
    name: '하트 네온사인', desc: '침대 위 벽에 단 작은 하트 네온',
    wallDecal: { wall: 'back', fn: neonFn(7, false) },
    preview: neonPreview,
  },

  // ══ 아이돌 굿즈 · 스페셜 뽑기 ═════════════════
  {
    id: 'poster_holo', type: 'poster', tier: 'special', rarity: 'rare',
    name: '홀로그램 포스터', desc: '금색 액자 속에서 무지갯빛으로 반짝이는 포스터',
    wallShadow: { wall: 'back', rect: [4.5, 5.95, 36, 69] },
    build(r, id) {
      const X0 = 4.4, X1 = 5.8, Z0 = 38, Z1 = 71, cx = (X0 + X1) / 2, cz = 54.5, hu = (X1 - X0) * L / 2;
      r.box(X0, 0, Z0, X1, 0.1, Z1, painted([232, 186, 72], {
        py: (x, y, z) => {
          const [u, v] = frontUV(x, z, cx, cz);
          const eu = hu - Math.abs(u), ev = (Z1 - Z0) / 2 - Math.abs(v);
          if (eu < 2.2 || ev < 2.2) return eu < 0.8 || ev < 0.8 ? [250, 220, 120] : [232, 186, 72];
          if (inStar(u, v - 3, 8)) return inStar(u, v - 3, 5) ? [255, 255, 250] : [255, 226, 120];
          if (sparkle(u + 20, v + 20, 7, 0.35, 5)) return WHITE;
          if ((v < -8 && v > -9.5 && Math.abs(u) < 6) || (v < -11 && v > -12.5 && Math.abs(u) < 4)) return WHITE;
          return holo(u * 0.035 + v * 0.025);
        },
      }), id);
    },
  },
  {
    id: 'album_limited', type: 'album', tier: 'special', rarity: 'rare',
    name: '한정판 앨범', desc: '홀로그램 커버에 포토카드가 들어 있는 한정판',
    build(r, id) {
      const s = CAB_SLOTS[6], z = s.z0;
      r.box(s.cx - 0.17, 0.56, z + 5, s.cx + 0.17, 0.61, z + 12.5, painted(WHITE, {
        py: (x, y, zz) => {
          const [u, v] = frontUV(x, zz, s.cx, z + 9);
          return Math.abs(u) < 1.8 && v > -3 && v < 3 ? mix([246, 160, 190], [190, 170, 240], (v + 3) / 6) : undefined;
        },
      }), id);
      r.box(s.cx - 0.32, 0.62, z, s.cx + 0.32, 0.76, z + 10, painted([210, 200, 240], {
        py: (x, y, zz) => {
          const [u, v] = frontUV(x, zz, s.cx, z + 5);
          if (u > 2.6 && v > 2.4) return [242, 198, 80];
          if (inHeart(u / 2.6, (v + 0.3) / 2.6)) return [255, 255, 255];
          if (sparkle(u + 10, v + 10, 3, 0.4, 3)) return WHITE;
          return holo(u * 0.05 + v * 0.04 + 0.2);
        },
      }), id);
    },
  },
  {
    id: 'acrylic_star', type: 'acrylic', tier: 'special', rarity: 'epic',
    name: '반짝이 아크릴 스탠드', desc: '별 받침과 글리터 배경, 왕관을 쓴 최애',
    build(r, id) {
      const s = CAB_SLOTS[7], z = s.z0, cy = 0.65;
      r.extrude(s.cx - 0.4, cy - 0.4, s.cx + 0.4, cy + 0.4, z, z + 1.5,
        (x, y) => inStar(flatU(x - s.cx, y - cy), flatV(x - s.cx, y - cy), 7.5),
        (x, y, zz, top) => (top ? [248, 210, 96] : [214, 168, 64]), id);
      r.box(s.cx - 0.27, 0.62, z + 1.5, s.cx + 0.27, 0.66, z + 12.5, (x, y, zz, face) => {
        const [u, v] = frontUV(x, zz, s.cx, z + 6.5);
        const hw = 0.27 * L;
        if (v > 3 && Math.hypot(u, v - 3) > hw) return null;          // 위가 둥근 아크릴
        if (face !== 'py') return [220, 214, 240];
        const f = figure(u, v - 0.5, true);
        if (f) return f;
        if (sparkle(u + 10, v + 10, 5, 0.4, 3)) return WHITE;
        return mix([214, 190, 246], [250, 196, 220], (v + 5) / 10);
      }, id);
    },
  },
  {
    id: 'plush_crown', type: 'plush', tier: 'special', rarity: 'epic',
    name: '왕관 인형', desc: '금빛 왕관과 리본을 단 특별한 토끼 인형',
    build(r, id) {
      const s = CAB_SLOTS[1], z = s.z0, cx = s.cx;
      plushBody(r, id, [255, 240, 244]);
      r.box(cx - 0.2, 0.84, z + 4.6, cx + 0.2, 0.88, z + 6.2, solid([232, 96, 138]), id);
      r.box(cx - 0.13, 0.52, z + 10.5, cx + 0.13, 0.66, z + 12.6, painted([244, 198, 72], {
        py: (x, y, zz) => {
          const [u, v] = frontUV(x, zz, cx, z + 10.5);
          return v > 1.1 && Math.abs(Math.abs(u) - 1) < 0.5 ? null : undefined;
        },
      }), id);
    },
  },
  {
    id: 'lightstick_heart', type: 'lightstick', tier: 'special', rarity: 'epic',
    name: '하트 왕관 응원봉', desc: '왕관을 얹은 하트가 빛나는 공식 응원봉',
    build(r, id) {
      const s = CAB_SLOTS[8], z = s.z0;
      r.box(s.cx - 0.07, 0.56, z, s.cx + 0.07, 0.7, z + 5.5, painted(WHITE, {
        py: (x, y, zz) => (zz > z + 3.5 && zz < z + 4.5 ? [246, 150, 190] : undefined),
      }), id);
      r.box(s.cx - 0.3, 0.58, z + 5, s.cx + 0.3, 0.7, z + 12, (x, y, zz, face) => {
        const [u, v] = frontUV(x, zz, s.cx, z + 8.3);
        const hu = u / 3.8, hv = v / 3.8;
        if (!inHeart(hu, hv)) return null;
        if (face !== 'py') return [255, 140, 190];
        if (!inHeart(hu / 0.72, hv / 0.72)) return [255, 120, 180];
        return inHeart(hu / 0.35, hv / 0.35) ? WHITE : [255, 196, 222];
      }, id);
      r.box(s.cx - 0.1, 0.6, z + 11.6, s.cx + 0.1, 0.68, z + 12.9, glow([248, 206, 84]), id);
    },
  },
  {
    id: 'signed_gold', type: 'signed', tier: 'special', rarity: 'legend',
    name: '친필 사인 앨범', desc: '금빛 액자에 담긴 단 하나의 친필 사인 앨범',
    build(r, id) { signedAlbum(r, id, [240, 200, 90], true); },
  },
  {
    id: 'neon_big', type: 'neon', tier: 'special', rarity: 'legend',
    name: '하트 & 별 네온사인', desc: '커다란 하트와 노란 별이 빛나는 네온사인',
    wallDecal: { wall: 'back', fn: neonFn(10, true) },
    preview: neonPreview,
  },
];

// ── 굿즈 공통 그림 ─────────────────────────────

// 아크릴 속 최애 그림 (u, v: 가운데 기준 px)
function figure(u, v, crown = false) {
  const head = Math.hypot(u, v - 2.4);
  if (crown && v > 4.6 && v < 6.2 && Math.abs(u) < 2 && !(v > 5.4 && Math.abs(Math.abs(u) - 1) < 0.4 && Math.abs(u) > 0.3)) return [244, 198, 72];
  if (head < 1.5 && v < 3.2) return [252, 224, 206];
  if (head < 2.6 && v > 1.2) return [242, 138, 170];
  if (Math.abs(u) < 2.2 - (v + 4) * 0.12 && v < 0.9 && v > -4.6) return [250, 250, 252];
  return null;
}

function plushBody(r, id, body) {
  const s = CAB_SLOTS[1], z = s.z0, cx = s.cx;
  r.box(cx - 0.3, 0.35, z, cx + 0.3, 0.85, z + 5.5, solid(body), id);
  r.box(cx - 0.27, 0.38, z + 5.5, cx + 0.27, 0.82, z + 10.5, painted(body, {
    py: (x, y, zz) => {
      const [u, v] = frontUV(x, zz, cx, z + 8);
      if (v > -0.5 && v < 1 && (Math.abs(u - 2) < 0.8 || Math.abs(u + 2) < 0.8)) return [60, 44, 50];
      if (v < -0.5 && v > -2 && Math.abs(Math.abs(u) - 3) < 1) return [246, 168, 190];
      return undefined;
    },
  }), id);
  r.box(cx - 0.24, 0.5, z + 10.5, cx - 0.1, 0.66, z + 13, solid(body), id);
  r.box(cx + 0.1, 0.5, z + 10.5, cx + 0.24, 0.66, z + 13, solid(body), id);
}

function signedAlbum(r, id, frame, fancy) {
  const s = CAB_SLOTS[4], z = s.z0, hu = 0.34 * L;
  r.box(s.cx - 0.34, 0.6, z + 0.8, s.cx + 0.34, 0.74, z + 12, painted(frame, {
    py: (x, y, zz) => {
      const [u, v] = frontUV(x, zz, s.cx, z + 6.4);
      if (Math.abs(u) > hu - 1.2 || Math.abs(v) > 4.4) return frame;
      if (Math.abs(v - Math.sin(u * 0.9) * 1.2 - 0.5) < 0.6 && Math.abs(u) < 3.6) return WHITE;
      if (fancy && sparkle(u + 10, v + 10, 11, 0.3, 3)) return [255, 232, 150];
      return Math.hypot(u, v + 0.5) < 2.5 ? [70, 50, 110] : mix([40, 30, 70], [140, 90, 200], (v + 5) / 10);
    },
  }), id);
  r.box(s.cx - 0.24, 0.5, z, s.cx + 0.24, 0.9, z + 0.8, solid(frame), id);
}

function neonFn(S, stars) {
  return (a, z, base) => {
    const u = (a - 7.4) * L / S, v = (z - 62) / S;
    if (stars) {
      for (const [sx, sz] of [[6.35, 74], [8.5, 50]]) {
        const su = (a - sx) * L, sv = z - sz;
        if (inStar(su, sv, 5.5) && !inStar(su, sv, 3.8)) return [255, 230, 120];
        if (inStar(su, sv, 7.5)) return mix(base, [255, 236, 150], 0.3);
      }
    }
    if (!inHeart(u / 1.35, v / 1.35)) return null;
    const outer = inHeart(u, v), inner = inHeart(u / 0.78, (v + 0.04) / 0.78);
    if (outer && !inner) return [255, 128, 186];
    return mix(base, [255, 150, 200], inner ? 0.16 : 0.32);
  };
}
// 벽에 그려지는 아이템의 미리보기용 벽 조각
function neonPreview(r, id) {
  const fn = this.wallDecal.fn;
  r.box(5.4, -0.1, 42, 9.4, 0, 84, (x, y, z, face) =>
    face === 'py' ? wallInterior(x, z, [], [fn]) : C.borderSide, id);
}

// ─────────────────────────────────────────────
// 캐릭터 꾸미기 (assets/dressup)
//  캐릭터 그림 위에 같은 크기(1024×1536)의 투명 의상 그림을 겹쳐 입힙니다.
//  처음 들어올 때 최애 한 명을 무료로 고르고, 다른 캐릭터는 코인으로 데려옵니다.
//  기본 옷은 뽑기 없이 입고 있고, 일상복은 기본 뽑기, 무대의상은 스페셜 뽑기에서 나옵니다.
// ─────────────────────────────────────────────
const DRESSUP_DIR = 'assets/dressup/';
const CHARACTER_PRICE = 800;

const CHARACTERS = [
  { id: 'char_01_black_bob', name: '윈터', img: 'characters/char_01_black_bob.png' },
  { id: 'char_02_pink_long', name: '지젤', img: 'characters/char_02_pink_long.png' },
  { id: 'char_03_brown_wavy', name: '카리나', img: 'characters/char_03_brown_wavy.png' },
];

const OUTFITS = [
  {
    id: 'outfit_default_01_tshirt_shorts', type: 'outfit', tier: 'base',
    name: '흰티와 반바지', desc: '처음부터 입고 있는 편한 기본 옷',
    img: 'outfits_default/outfit_default_01_tshirt_shorts.png',
  },
  {
    id: 'outfit_normal_01_onepiece', type: 'outfit', tier: 'basic', rarity: 'common',
    name: '기본 원피스', desc: '하얀 카라가 달린 하늘색 원피스',
    img: 'outfits_normal/outfit_normal_01_onepiece.png',
  },
  {
    id: 'outfit_normal_02_pajama', type: 'outfit', tier: 'basic', rarity: 'common',
    name: '파자마', desc: '방에서 뒹굴기 좋은 포근한 파자마',
    img: 'outfits_normal/outfit_normal_02_pajama.png',
  },
  {
    id: 'outfit_normal_03_street', type: 'outfit', tier: 'basic', rarity: 'common',
    name: '스트릿패션', desc: '형광 라인 후드 집업과 카고 팬츠',
    img: 'outfits_normal/outfit_normal_03_street.png',
  },
  {
    id: 'outfit_legendary_01_stage', type: 'outfit', tier: 'special', rarity: 'legend',
    name: '무대의상 1', desc: '금빛 리본과 프릴로 꾸민 데뷔 무대 의상',
    img: 'outfits_legendary/outfit_legendary_01_stage.png',
  },
  {
    id: 'outfit_legendary_02_stage', type: 'outfit', tier: 'special', rarity: 'legend',
    name: '무대의상 2', desc: '조명 아래에서 빛나는 특별한 무대 의상',
    img: 'outfits_legendary/outfit_legendary_02_stage.png',
  },
];

const DEFAULT_CHARACTER = CHARACTERS[0].id;
const DEFAULT_OUTFIT = OUTFITS.find((o) => o.tier === 'base').id;
const CHARACTER_BY_ID = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));
const OUTFIT_BY_ID = Object.fromEntries(OUTFITS.map((o) => [o.id, o]));

const ALL_ITEMS = [...BASE_ITEMS, ...VARIANTS];
const ITEM_BY_ID = Object.fromEntries(ALL_ITEMS.map((it) => [it.id, it]));
const TYPE_BY_ID = Object.fromEntries(TYPES.map((t) => [t.id, t]));
