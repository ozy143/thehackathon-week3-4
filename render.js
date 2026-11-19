// ─────────────────────────────────────────────
// 아이소메트릭 픽셀 렌더러
//  - 월드 좌표: x(화면 오른쪽 아래), y(화면 왼쪽 아래)는 '타일' 단위, z(위)는 픽셀 단위
//  - 픽셀 하나하나를 직접 칠하고 깊이 버퍼로 앞뒤를 가리기 때문에
//    가구를 어떤 순서로 추가해도 올바르게 겹쳐 보입니다.
// ─────────────────────────────────────────────

const HW = 14;          // 타일 가로 절반(월드 px)
const HH = 7;           // 타일 세로 절반(월드 px)
const PX = 2;           // 화면 해상도 배율 (월드 px 1 = 화면 픽셀 2)
const ZS = 1 / 14;      // 깊이 계산용 z 비율 (시선 방향 = (1, 1, 14))
const SHADE = { top: 1, py: 0.86, px: 0.72 }; // 윗면 / 왼쪽 앞면 / 오른쪽 앞면 밝기

function hash3(x, y, z) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const mul = (c, m) => [c[0] * m, c[1] * m, c[2] * m];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// 재질: (x, y, z, face) → [r, g, b]
function solid(color) {
  return (x, y, z, face) => mul(color, SHADE[face]);
}

function wood(color) {
  return (x, y, z, face) => {
    const n = hash3(Math.floor(x * 16), Math.floor(y * 16), Math.floor(z));
    let m = SHADE[face] * (0.95 + n * 0.07);
    // 옆면에는 가로 나뭇결
    if (face !== 'top' && Math.floor(z) % 5 === 0) m *= 0.95;
    return mul(color, m);
  };
}

class IsoRenderer {
  constructor(w, h, ox, oy) {
    Object.assign(this, { w, h, ox, oy });
    const n = w * h;
    this.color = new Float32Array(n * 3);
    this.depth = new Float32Array(n).fill(-Infinity);
    this.obj = new Int16Array(n);
    this.bbox = [w, h, -1, -1]; // 실제로 칠해진 영역
  }

  project(x, y, z) {
    return [this.ox + (x - y) * HW * PX, this.oy + ((x + y) * HH - z) * PX];
  }

  // 평행사변형 면 하나: 원점 o, 변 벡터 u, v
  // 재질 mat이 null을 돌려주면 그 픽셀은 투명(곡선 모양을 만들 때 사용)
  face(o, u, v, face, mat, objId) {
    const Su = [(u[0] - u[1]) * HW * PX, ((u[0] + u[1]) * HH - u[2]) * PX];
    const Sv = [(v[0] - v[1]) * HW * PX, ((v[0] + v[1]) * HH - v[2]) * PX];
    const det = Su[0] * Sv[1] - Su[1] * Sv[0];
    if (Math.abs(det) < 1e-9) return;
    const [X0, Y0] = this.project(o[0], o[1], o[2]);
    const xs = [X0, X0 + Su[0], X0 + Sv[0], X0 + Su[0] + Sv[0]];
    const ys = [Y0, Y0 + Su[1], Y0 + Sv[1], Y0 + Su[1] + Sv[1]];
    const minX = Math.max(0, Math.floor(Math.min(...xs)));
    const maxX = Math.min(this.w - 1, Math.ceil(Math.max(...xs)));
    const minY = Math.max(0, Math.floor(Math.min(...ys)));
    const maxY = Math.min(this.h - 1, Math.ceil(Math.max(...ys)));
    const E = 1e-6;

    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const dx = px + 0.5 - X0, dy = py + 0.5 - Y0;
        const s = (dx * Sv[1] - dy * Sv[0]) / det;
        const t = (Su[0] * dy - Su[1] * dx) / det;
        if (s < -E || s > 1 + E || t < -E || t > 1 + E) continue;
        const wx = o[0] + s * u[0] + t * v[0];
        const wy = o[1] + s * u[1] + t * v[1];
        const wz = o[2] + s * u[2] + t * v[2];
        const d = wx + wy + wz * ZS;
        const i = py * this.w + px;
        if (d <= this.depth[i]) continue;
        const c = mat(wx, wy, wz, face);
        if (!c) continue;
        const b = this.bbox;
        if (px < b[0]) b[0] = px;
        if (py < b[1]) b[1] = py;
        if (px > b[2]) b[2] = px;
        if (py > b[3]) b[3] = py;
        this.depth[i] = d;
        this.obj[i] = objId;
        this.color[i * 3] = c[0];
        this.color[i * 3 + 1] = c[1];
        this.color[i * 3 + 2] = c[2];
      }
    }
  }

  // 직육면체: 보이는 세 면(윗면, +x면, +y면)만 그립니다.
  box(x0, y0, z0, x1, y1, z1, mat, objId) {
    const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
    this.face([x0, y0, z1], [dx, 0, 0], [0, dy, 0], 'top', mat, objId);
    this.face([x1, y0, z0], [0, dy, 0], [0, 0, dz], 'px', mat, objId);
    this.face([x0, y1, z0], [dx, 0, 0], [0, 0, dz], 'py', mat, objId);
  }

  // 위쪽 모양(mask)을 얇은 층으로 쌓아 만든 입체 — 원, 하트, 별 같은 곡선 모양용
  //  mask(x, y, z) → 그 높이에서 (x, y)가 모양 안인지
  //  paint(x, y, z, isTop) → 색
  extrude(x0, y0, x1, y1, z0, z1, mask, paint, objId, step = 0.5) {
    for (let z = z0; z < z1 - 1e-6; z += step) {
      const zt = Math.min(z + step, z1);
      const isTop = zt >= z1 - 1e-6;
      this.face([x0, y0, zt], [x1 - x0, 0, 0], [0, y1 - y0, 0], 'top',
        (x, y) => (mask(x, y, zt) ? paint(x, y, zt, isTop) : null), objId);
    }
  }

  // 외곽선을 넣어 최종 이미지 생성. highlightId 객체는 밝게 표시.
  // crop=true면 칠해진 영역만 잘라서 { img, x, y }로 돌려줍니다.
  compose(highlightId = 0, crop = false) {
    const { w, h, color, depth, obj } = this;
    const [bx0, by0, bx1, by1] = crop ? this.bbox : [0, 0, w - 1, h - 1];
    if (bx1 < bx0) return crop ? { img: new ImageData(1, 1), x: 0, y: 0 } : new ImageData(w, h);
    const cw = bx1 - bx0 + 1, ch = by1 - by0 + 1;
    const img = new ImageData(cw, ch);
    const out = img.data;
    const BG_LINE = [44, 28, 22];

    for (let py = by0; py <= by1; py++) {
      for (let px = bx0; px <= bx1; px++) {
        const i = py * w + px;
        const oi = (py - by0) * cw + (px - bx0);
        const o = obj[i];
        if (!o) continue;
        const d = depth[i];
        let c = [color[i * 3], color[i * 3 + 1], color[i * 3 + 2]];
        let edge = 0; // 0 없음, 1 다른 물체 경계, 2 바깥 경계
        for (const [nx, ny] of [[px - 1, py], [px + 1, py], [px, py - 1], [px, py + 1]]) {
          if (nx < 0 || ny < 0 || nx >= w || ny >= h || !obj[ny * w + nx]) { edge = 2; break; }
          const n = ny * w + nx;
          const no = obj[n];
          // 가구↔방(벽·바닥) 경계는 항상 가구 쪽에, 가구끼리는 앞쪽 가구에 선을 긋습니다.
          if (no !== o && o !== 1 && (no === 1 || depth[n] < d)) edge = 1;
          else if (no === o && depth[n] < d - 0.35) edge = 1;
        }
        if (o === highlightId) c = mix(c, [255, 248, 225], 0.22);
        if (edge === 2) c = BG_LINE;
        else if (edge === 1) c = mul(c, 0.45);
        out[oi * 4] = c[0];
        out[oi * 4 + 1] = c[1];
        out[oi * 4 + 2] = c[2];
        out[oi * 4 + 3] = 255;
      }
    }
    return crop ? { img, x: bx0, y: by0 } : img;
  }

  objectAt(px, py) {
    if (px < 0 || py < 0 || px >= this.w || py >= this.h) return 0;
    return this.obj[py * this.w + px];
  }
}
