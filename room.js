// ─────────────────────────────────────────────
// 방 구조(벽·바닥), 가구 공통 뼈대, 기본 제공 가구
//  아이템 모양: { id, type, tier, name, desc, footprint?, wallShadow?, wallDecal?, build(r, objId) }
//  type이 같은 아이템은 방에 하나만 놓입니다(예: 침대 디자인 중 하나).
// ─────────────────────────────────────────────

const ROOM = { N: 10, WALL_H: 88, WALL_T: 0.4, FLOOR_T: 6 };
const ROOM_OBJ = 1;
const L = 15.65; // 면을 따라 1타일 = 15.65 월드 px

const C = {
  borderTop: [78, 50, 39],
  borderSide: [60, 38, 30],
  wallpaper: [242, 222, 168],
  wallPattern: [221, 189, 121],
  wainscot: [238, 229, 208],
  groove: [207, 192, 162],
  rail: [222, 205, 170],
  baseboard: [150, 98, 62],
  floor: [186, 122, 78],
  cabinet: [176, 116, 66],
  bed: [166, 106, 60],
  mattress: [240, 235, 224],
  desk: [190, 132, 80],
  chair: [158, 100, 56],
};

// 칠한 물건(나무가 아닌 것)용 부드러운 음영
const SOFT = { top: 1, py: 0.9, px: 0.8 };

// 면별 그림 재질. 함수가 색을 주면 그 색, null이면 투명, undefined면 기본색
function painted(base, arts = {}, shade = SOFT) {
  return (x, y, z, face) => {
    const fn = arts[face];
    if (fn) {
      const c = fn(x, y, z);
      if (c === null) return null;
      if (c) return mul(c, shade[face]);
    }
    return mul(base, shade[face]);
  };
}

// 자체 발광 재질 (그림자를 덜 받음)
const glow = (c) => (x, y, z, face) => mul(c, face === 'top' ? 1 : face === 'py' ? 0.95 : 0.88);

function inHeart(u, v) {
  const a = u * u + v * v - 1;
  return a * a * a - u * u * v * v * v <= 0;
}
function inStar(u, v, R) {
  const r = Math.hypot(u, v);
  const th = Math.atan2(v, u) - Math.PI / 2;
  return r < R * (0.42 + 0.58 * Math.pow(Math.abs(Math.cos(2.5 * th)), 3));
}
// 바닥/윗면에 누운 하트·별: 화면 기준으로 똑바로 보이게 좌표 변환
const flatU = (dx, dy) => (dx - dy) * 14;
const flatV = (dx, dy) => -(dx + dy) * 14;

// 왼쪽 벽 벽걸이 CD 플레이어
const CD = { y0: 2.6, y1: 4.2, z0: 44, z1: 68, depth: 0.35 };
CD.cy = (CD.y0 + CD.y1) / 2;
CD.cz = (CD.z0 + CD.z1) / 2;

// 3×3 장식장 치수와 9칸 위치 (칸 번호: 0~2 아래층, 3~5 가운데층, 6~8 위층 / 왼쪽→오른쪽)
const CAB = { x0: 1.2, x1: 4.2, d: 1.0, h: 52, t: 0.12, back: 0.08, boards: [[0, 4], [17, 20], [33, 36], [49, 52]] };
CAB.cw = (CAB.x1 - CAB.x0 - 4 * CAB.t) / 3;
const CAB_SLOTS = [];
for (let row = 0; row < 3; row++) {
  for (let col = 0; col < 3; col++) {
    const x0 = CAB.x0 + CAB.t + col * (CAB.cw + CAB.t);
    CAB_SLOTS.push({
      x0, x1: x0 + CAB.cw, cx: x0 + CAB.cw / 2,
      y0: CAB.back, y1: CAB.d,
      z0: CAB.boards[row][1], z1: CAB.boards[row + 1][0],
    });
  }
}
function cabCell(x, z) {
  for (let i = 0; i < 9; i++) {
    const s = CAB_SLOTS[i];
    if (x >= s.x0 - 1e-6 && x <= s.x1 + 1e-6 && z >= s.z0 - 1e-6 && z <= s.z1 + 1e-6) return i;
  }
  return -1;
}

// ── 벽 안쪽 무늬: a = 벽을 따라가는 좌표(타일), z = 높이(px)
//    shadows: 벽에 붙은 물건이 드리우는 그림자 [a0, a1, z0, z1]
//    decals: 벽에 직접 그려지는 장식 fn(a, z, 벽색) → 색 | null
function wallInterior(a, z, shadows = [], decals = []) {
  const ap = a * L;
  let c;

  if (z < 5) {
    c = z > 4 ? mul(C.baseboard, 1.15) : C.baseboard;
  } else if (z < 32) {
    if (z >= 29) c = C.rail;
    else c = (((Math.floor(ap) % 10) + 10) % 10 === 0) ? C.groove : C.wainscot;
  } else {
    const zz = z - 32;
    const row = Math.floor(zz / 12);
    const lx = ((((ap + (row % 2) * 7) % 14) + 14) % 14) - 7;
    const lz = zz - row * 12 - 6;
    c = (Math.abs(lx) + Math.abs(lz) <= 2.5) ? C.wallPattern : C.wallpaper;
  }
  for (const [a0, a1, z0, z1] of shadows) {
    if (a > a0 && a < a1 && z > z0 && z < z1) { c = mul(c, 0.84); break; }
  }
  for (const fn of decals) {
    const d = fn(a, z, c);
    if (d) return d;
  }
  const ao = 1 - 0.14 * Math.max(0, 1 - a / 1.0);
  return mul(c, ao);
}

function makeFloorShader(footprints) {
  return (x, y, z, face) => {
    if (face !== 'top') return mul(C.borderSide, SHADE[face] / 0.86);
    const row = Math.floor(y / 0.5);
    const fy = y / 0.5 - row;
    const xs = x + hash3(row, 7, 1) * 3;
    const seg = Math.floor(xs / 3);
    const fx = xs - seg * 3;
    let c = mul(C.floor, 0.93 + hash3(row, seg, 2) * 0.12);
    c = mul(c, 0.97 + hash3(Math.floor(x * 20), row, 5) * 0.05);
    if (fy < 0.1 || fx < 0.05) c = mul(c, 0.74);
    for (const [x0, y0, x1, y1] of footprints) {
      const p = 0.14;
      if (x > x0 - p && x < x1 + p && y > y0 - p && y < y1 + p) { c = mul(c, 0.8); break; }
    }
    const ao = 1 - 0.16 * Math.max(0, 1 - Math.min(x, y) / 0.9);
    return mul(c, ao);
  };
}

function borderOr(interiorFace, interior) {
  return (x, y, z, face) => {
    if (face === interiorFace) return interior(x, y, z);
    return face === 'top' ? C.borderTop : C.borderSide;
  };
}

function buildRoomShell(r, items) {
  const { N, WALL_H: H, WALL_T: T, FLOOR_T: F } = ROOM;
  const footprints = items.filter((it) => it.footprint).map((it) => it.footprint);
  const pick = (key, wall) => items.filter((it) => it[key] && it[key].wall === wall);
  const leftShadows = pick('wallShadow', 'left').map((it) => it.wallShadow.rect);
  const backShadows = pick('wallShadow', 'back').map((it) => it.wallShadow.rect);
  const leftDecals = pick('wallDecal', 'left').map((it) => it.wallDecal.fn);
  const backDecals = pick('wallDecal', 'back').map((it) => it.wallDecal.fn);
  r.box(-T, -T, -F, N, N, 0, makeFloorShader(footprints), ROOM_OBJ);
  r.box(-T, -T, 0, 0, N, H, borderOr('px', (x, y, z) => mul(wallInterior(y, z, leftShadows, leftDecals), 0.93)), ROOM_OBJ);
  r.box(-T, -T, 0, N, 0, H, borderOr('py', (x, y, z) => wallInterior(x, z, backShadows, backDecals)), ROOM_OBJ);
}

// ── 가구 공통 뼈대 ─────────────────────────────

// 장식장: frame(틀 재질), back(칸 뒤판 재질 — (x, y, z, face, 칸번호))
function buildCabinet(r, id, frame, back) {
  const { x0: X0, x1: X1, d: D, h: H, t: T, back: BK, boards, cw } = CAB;
  r.box(X0, 0, 0, X1, BK, H, (x, y, z, face) => {
    const cell = cabCell(x, z);
    let c = back(x, y, z, face, cell);
    // 칸 위쪽 그늘
    if (c && cell >= 0 && face === 'py' && z > CAB_SLOTS[cell].z1 - 2) c = mul(c, 0.82);
    return c;
  }, id);
  r.box(X0, 0, 0, X0 + T, D, H, frame, id);
  r.box(X1 - T, 0, 0, X1, D, H, frame, id);
  for (const [a, b] of boards) r.box(X0 + T, BK, a, X1 - T, D, b, frame, id);
  for (let row = 0; row < 3; row++) {
    const za = boards[row][1], zb = boards[row + 1][0];
    for (let k = 1; k <= 2; k++) {
      const xd = X0 + T + k * cw + (k - 1) * T;
      r.box(xd, BK, za, xd + T, D, zb, frame, id);
    }
  }
}

// 책상 (상판 높이 23~26, 왼쪽 벽에 붙음): m(재질), knob(서랍 손잡이 색)
const DESK = { x1: 1.7, y0: 6.0, y1: 9.0, top: 26 };
function buildDesk(r, id, m, knob, legMat = m) {
  const { x1: X1, y0: Y0, y1: Y1 } = DESK, Lg = 0.15;
  r.box(0, Y0, 23, X1, Y1, 26, m, id);
  for (const [lx, ly] of [[0, Y0], [X1 - Lg, Y0], [0, Y1 - Lg], [X1 - Lg, Y1 - Lg]]) {
    r.box(lx, ly, 0, lx + Lg, ly + Lg, 23, legMat, id);
  }
  const dy0 = 7.9, dy1 = Y1 - Lg, dz0 = 15, dz1 = 23, cy = (dy0 + dy1) / 2, cz = (dz0 + dz1) / 2;
  r.box(0.15, dy0, dz0, X1 - 0.1, dy1, dz1, (x, y, z, face) => {
    const c = m(x, y, z, face);
    if (face === 'px') {
      if (Math.abs(y - cy) < 0.15 && Math.abs(z - cz) < 1) return mul(knob, 0.85);
      if (z < dz0 + 0.6 || z > dz1 - 0.6 || y < dy0 + 0.05 || y > dy1 - 0.05) return mul(c, 0.85);
    }
    return c;
  }, id);
}

// 의자 (책상을 바라봄): legMat, seatMat, backMat, backTop(등받이 높이)
const CHAIR = { x0: 2.0, x1: 2.9, y0: 7.0, y1: 7.9 };
function buildChair(r, id, legMat, seatMat, backMat, backTop = 32) {
  const { x0: X0, x1: X1, y0: Y0, y1: Y1 } = CHAIR, Lg = 0.12;
  for (const [lx, ly] of [[X0, Y0], [X1 - Lg, Y0], [X0, Y1 - Lg], [X1 - Lg, Y1 - Lg]]) {
    r.box(lx, ly, 0, lx + Lg, ly + Lg, 13, legMat, id);
  }
  r.box(X0, Y0, 13, X1, Y1, 15.5, seatMat, id);
  r.box(X1 - 0.14, Y0, 15.5, X1, Y1, backTop, backMat, id);
}
// 위가 둥근 등받이 모양 (등받이 재질에 씌워서 사용)
function roundTop(mat, top, bulge = 2.5) {
  const cy = (CHAIR.y0 + CHAIR.y1) / 2, hw = (CHAIR.y1 - CHAIR.y0) / 2;
  return (x, y, z, face) => {
    const lim = top - bulge + bulge * Math.sqrt(Math.max(0, 1 - ((y - cy) / hw) ** 2));
    return z > lim ? null : mat(x, y, z, face);
  };
}

// 침대 범위
const BED = { x0: 6.0, x1: 8.8, y1: 4.6 };

// ── 기본 제공 가구 ──────────────────────────────
const BASE_ITEMS = [
  {
    id: 'cabinet_base', type: 'cabinet', tier: 'base',
    name: '원목 3×3 장식장', desc: '굿즈를 하나씩 진열할 수 있는 9칸 장식장',
    footprint: [CAB.x0, 0, CAB.x1, CAB.d],
    build(r, id) {
      buildCabinet(r, id, wood(C.cabinet), solid(mul(C.cabinet, 0.7)));
    },
  },
  {
    id: 'cdplayer', type: 'cdplayer', tier: 'base',
    name: 'CD 플레이어', desc: 'CD를 넣어 음악을 틀 수 있는 벽걸이 플레이어',
    wallShadow: { wall: 'left', rect: [CD.y0 + 0.1, CD.y1 + 0.15, CD.z0 - 3, CD.z1 - 2] },
    disc: { y: CD.cy, z: CD.cz, r: 9 }, // 나중에 구매한 CD가 그려질 자리
    build(r, id) {
      const body = [236, 232, 222];
      const front = (x, y, z, face) => {
        if (face !== 'px') return mul(body, SHADE[face]);
        const du = (y - CD.cy) * L, dz = z - CD.cz;
        const d = Math.hypot(du, dz);
        let c = mul(body, 0.95);
        if (d < 1.6) c = [120, 114, 106];
        else if (d < 3.2) c = [214, 210, 202];
        else if (d < 9) {
          c = [196, 192, 184];
          if ((Math.floor(du + 20) + Math.floor(dz + 20)) % 3 === 0) c = [178, 174, 166];
        } else if (d < 10) c = [160, 154, 146];
        if (du > 9.5 && du < 11 && dz > 9 && dz < 10.5) c = [126, 186, 120];
        return c;
      };
      r.box(0, CD.y0, CD.z0, CD.depth, CD.y1, CD.z1, front, id);
      const cy = CD.y1 - 0.25;
      r.box(0.14, cy, 30, 0.22, cy + 0.08, CD.z0, solid([228, 224, 214]), id);
      r.box(0.11, cy - 0.03, 27, 0.25, cy + 0.11, 30, solid([150, 144, 136]), id);
    },
  },
  {
    id: 'bed_base', type: 'bed', tier: 'base',
    name: '나무 침대', desc: '아무 장식 없는 기본 원목 침대',
    footprint: [BED.x0, 0, BED.x1, BED.y1],
    build(r, id) {
      const X0 = BED.x0, X1 = BED.x1, Y1 = BED.y1, Lg = 0.22;
      const m = wood(C.bed);
      r.box(X0, 0, 0, X1, 0.25, 30, m, id);
      for (const [lx, ly] of [[X0 + 0.05, 0.25], [X1 - 0.05 - Lg, 0.25], [X0 + 0.05, Y1 - 0.25 - Lg], [X1 - 0.05 - Lg, Y1 - 0.25 - Lg]]) {
        r.box(lx, ly, 0, lx + Lg, ly + Lg, 2, m, id);
      }
      r.box(X0 + 0.05, 0.25, 2, X1 - 0.05, Y1 - 0.25, 10, m, id);
      r.box(X0 + 0.15, 0.25, 10, X1 - 0.15, Y1 - 0.25, 16, solid(C.mattress), id);
      r.box(X0, Y1 - 0.25, 0, X1, Y1, 19, m, id);
    },
  },
  {
    id: 'desk_base', type: 'desk', tier: 'base',
    name: '원목 책상 세트', desc: '서랍 달린 기본 책상과 의자',
    footprint: [0, DESK.y0, DESK.x1, DESK.y1],
    build(r, id) {
      buildDesk(r, id, wood(C.desk), [80, 52, 34]);
      const m = wood(C.chair);
      const { x0: X0, x1: X1, y0: Y0, y1: Y1 } = CHAIR, Lg = 0.12;
      for (const [lx, ly] of [[X0, Y0], [X1 - Lg, Y0], [X0, Y1 - Lg], [X1 - Lg, Y1 - Lg]]) {
        r.box(lx, ly, 0, lx + Lg, ly + Lg, 13, m, id);
      }
      r.box(X0, Y0, 13, X1, Y1, 15.5, m, id);
      r.box(X1 - Lg, Y0, 15.5, X1, Y0 + Lg, 32, m, id);
      r.box(X1 - Lg, Y1 - Lg, 15.5, X1, Y1, 32, m, id);
      r.box(X1 - Lg, Y0 + Lg, 23, X1, Y1 - Lg, 32, m, id);
    },
  },
];

function buildRoom(r, items) {
  buildRoomShell(r, items);
  items.forEach((it, i) => it.build && it.build(r, i + 2)); // objId 2부터 아이템
}
