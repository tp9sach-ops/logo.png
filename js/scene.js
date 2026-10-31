/* ==========================================================================
   scene.js — Cửa hàng 9 Sạch 3D (Three.js 0.160.0, dựng bằng hình khối, không cần GLTF)
   Đặt tại: /js/scene.js . index.html nạp bằng import('./js/scene.js') và gọi World.start()
   Mọi chỗ có thể chỉnh nằm ở 3 khối đầu: SCENES, CAM, HOT
   [v5 — sửa giật/lag/lóa] xem mục 'V5' trong HANDOFF.md. Thêm ?perf=1 vào URL để hiện bảng FPS.
   [v6 — cổng chọn Trẻ / Có tuổi + nút 'Xem dạng danh sách' ở cuối] xem mục 'GATE' bên dưới (buildGate).
   [v12 — xe bus tuyến 09 chạy + xe máy + người đi bộ + trạm xe buýt + chi tiết mặt tiền/nội thất, lấy cảm hứng ví dụ Littlest Tokyo (xem khối V12)]
   [v8 — cảnh luôn sống: gió lay cây, lá rơi, hổ thở, camera nhún theo chuột; cổng chọn đổi chữ hài hước, nút nhỏ trong suốt, đặt cao hơn (khối V8: WIND)]
   [v7 — hiệu ứng khi mở trang liên kết (xem khối V7: FXD)]
   [v6.1 — chống lỗi không thấy cổng: bọc buildGate bằng try/catch + log console; thêm World.version; index.html nạp scene.js kèm ?v=6.1 để khỏi dính cache]
   ========================================================================== */
import * as THREE from 'three';

if (!CanvasRenderingContext2D.prototype.roundRect) {      // bù cho trình duyệt cũ chưa có roundRect
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };
}
const N = window.NINE;                       // cầu nối do index.html cung cấp (MODS, go, effUrl, vis...)
const $ = id => document.getElementById(id);
const FONT = "'Be Vietnam Pro','Segoe UI',Arial,sans-serif";
const LOW = !!((navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4));
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sm = x => { x = clamp(x); return x * x * (3 - 2 * x); };

/* ---------- 1) 7 CẢNH: [bắt đầu, kết thúc] theo tiến độ cuộn 0..1 ---------- */
const SCENES = [[0, .12], [.12, .25], [.25, .42], [.42, .58], [.58, .72], [.72, .84], [.84, 1]];

/* ---------- 2) CAMERA: [tiến độ, [x,y,z] vị trí camera, [x,y,z] điểm nhìn] ----------
   Trục: +z là phía đường phố, -z đi sâu vào cửa hàng, y là chiều cao (mét). */
const CAM = [
  [0.00, [0.5, 1.9, 27],   [0, 3.6, 0]],      // 01 ngoài đường nhìn mặt tiền
  [0.06, [0, 1.8, 21],     [0, 3.4, 0]],
  [0.12, [0, 1.7, 12],     [0, 2.4, -3]],
  [0.19, [0, 1.6, 4.5],    [0, 1.9, -8]],     // 02 cửa kính trượt mở, vào sảnh
  [0.25, [0.6, 1.65, -2.5], [-1.5, 1.2, -8]],
  [0.33, [-0.6, 1.95, -5.1], [-2.3, 0.8, -8.5]], // 03 tủ đông (gần hơn để thấy rõ bánh)
  [0.42, [-0.3, 1.8, -6.5], [-1.5, 0.9, -9]],
  [0.50, [0.2, 1.7, -9.5], [3.5, 1.1, -13.2]], // 04 quầy thu ngân
  [0.58, [1.0, 1.7, -11],  [4.2, 1.3, -14]],
  [0.65, [-3.5, 1.6, -14.5], [-8.5, 1.6, -17.2]], // 05 tường chấm công
  [0.72, [-6.2, 1.6, -17.2], [-9.9, 1.65, -18.4]],
  [0.75, [-4.5, 1.7, -21], [-8.5, 1.0, -24.5]], // 06 khu sau: bàn thờ
  [0.78, [-3.5, 1.7, -23.5], [-5.5, 1.2, -27.4]], //          kệ kỹ thuật
  [0.81, [3.5, 1.7, -21.5], [9.9, 1.7, -23]],  //          bảng trắng
  [0.84, [2.5, 1.7, -23.5], [2.5, 1.4, -27.4]], // 07 cửa kho
  [0.88, [2.5, 1.7, -25.2], [2.5, 1.3, -29]],
  [0.92, [2.5, 1.65, -27.9], [2.5, 1.0, -32]],
  [0.96, [2.5, 1.7, -29.4], [2.5, 0.95, -32.5]],
  [1.00, [2.5, 1.75, -29.8], [2.5, 0.9, -32.5]]
];

/* ---------- 3) CHẤM SÁNG: at = vị trí 3D, win = khoảng tiến độ được hiện, foc = tiến độ camera bay tới ---------- */
const HOT = {
  tt:    { at: [0, 6.9, 1.7],        win: [-.06, .20],  foc: .03 },
  hotro: { at: [5.0, 1.3, -3.2],     win: [.12, .33],   foc: .25 },
  don:   { at: [-2.5, 1.25, -8.5],   win: [.22, .45],   foc: .33 },
  kpi:   { at: [2.3, 1.55, -13.2],   win: [.40, .62],   foc: .50 },
  kc:    { at: [4.6, 1.3, -13.1],    win: [.40, .62],   foc: .52 },
  rt:    { at: [3.6, 2.35, -15.4],   win: [.40, .62],   foc: .54 },
  cong:  { at: [-9.8, 1.6, -17],     win: [.56, .76],   foc: .68 },
  qt:    { at: [-9.8, 1.8, -19.3],   win: [.56, .76],   foc: .71 },
  tl:    { at: [-8.5, 1.35, -24.2],  win: [.70, .78],   foc: .75 },
  kt:    { at: [-5.5, 1.35, -27.1],  win: [.73, .81],   foc: .78 },
  dt:    { at: [9.8, 1.9, -23],      win: [.78, .86],   foc: .81 },
  loi:   { at: [2.5, 1.15, -32],     win: [.84, 1.07],   foc: .97 }
};

/* ============================ TIỆN ÍCH ============================ */
const gBox = new THREE.BoxGeometry(1, 1, 1), gPl = new THREE.PlaneGeometry(1, 1);
const gCyl = new THREE.CylinderGeometry(.5, .5, 1, 24), gSph = new THREE.SphereGeometry(.5, 20, 14), gIco = new THREE.IcosahedronGeometry(.5, 1);
function mesh(p, geo, mat, s, pos, rot) {
  const m = new THREE.Mesh(geo, mat); m.scale.set(s[0], s[1], s[2]); m.position.set(pos[0], pos[1], pos[2]);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]); p.add(m); return m;
}
const B = (p, m, s, pos, rot) => mesh(p, gBox, m, s, pos, rot);          // hộp  [rộng, cao, sâu]
const C = (p, m, s, pos, rot) => mesh(p, gCyl, m, s, pos, rot);          // trụ  [đường kính, cao, đường kính]
const S = (p, m, s, pos, rot) => mesh(p, gSph, m, s, pos, rot);          // cầu  [dx, dy, dz]
const P = (p, m, s, pos, rot) => mesh(p, gPl, m, [s[0], s[1], 1], pos, rot); // mặt phẳng [rộng, cao]

const std = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .6, metalness: 0 }, o));
const emi = (c, i = 2.4) => new THREE.MeshStandardMaterial({ color: 0x111111, emissive: c, emissiveIntensity: i, roughness: .5 });
const M = {
  honey: std(0xF2B705, { roughness: .38, metalness: .3 }), honey2: std(0xE8A800, { roughness: .45, metalness: .25 }),
  led: emi(0xffd36b, 1.5), ledG: emi(0x35e08a, 1.3), green: std(0x1f7a3a, { roughness: .5 }), leaf: std(0x2f8f3a), leaf2: std(0x3fa64a),
  stone: std(0xcdbf9f, { roughness: .8 }), cream: std(0xf6e7bd, { roughness: .85 }), ceil: std(0xf8efd6, { roughness: .9 }),
  wood: std(0x8a5a32, { roughness: .55 }), woodD: std(0x4a2c17, { roughness: .5 }), white: std(0xeeeeee, { roughness: .4 }),
  silver: std(0xb8bec4, { roughness: .3, metalness: .8 }), dark: std(0x1c1f22, { roughness: .5, metalness: .3 }), black: std(0x0d0e0f, { roughness: .4 }),
  glass: new THREE.MeshStandardMaterial({ color: 0xbfe3f0, transparent: true, opacity: .14, roughness: .05, metalness: .2, depthWrite: false, side: THREE.DoubleSide }),
  glassD: new THREE.MeshStandardMaterial({ color: 0x22313f, roughness: .12, metalness: .7 }),
  winLit: emi(0xffd9a0, .9), pot: std(0x7a5a3a), polo: std(0xf2c230), skin: std(0xd9d2c3), red: std(0xa51c1c, { roughness: .5 }),
  gold: std(0xd4a017, { roughness: .3, metalness: .8 }), orange: std(0xff8c1a), apple: std(0xc62828), flame: emi(0xff9a3a, 1.8),
  cake: std(0xffffff, { roughness: .7 }), cakeB: std(0xf6e27a, { roughness: .6 }), cardboard: std(0xb98a55), spike: std(0x8fb339, { flatShading: true }),
  steel: std(0x8c9a94, { roughness: .6, metalness: .4 }), gray: std(0x9aa0a6)
};
function rrShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
function ringGeo(w, h, r, t) { const s = rrShape(w, h, r); s.holes.push(rrShape(w - 2 * t, h - 2 * t, Math.max(r - t, .05))); return new THREE.ShapeGeometry(s, 12); }
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer ? renderer.capabilities.getMaxAnisotropy() : 4); return { c, g, t, w, h };
}
function textMat(text, ratio, color, weight = 700) {
  const W = 1024, H = Math.round(W / ratio);
  const o = canvasTex(W, H, g => {
    let fs = H * .8; g.font = `${weight} ${fs}px ${FONT}`; const mw = g.measureText(text).width;
    if (mw > W * .94) { fs *= W * .94 / mw; g.font = `${weight} ${fs}px ${FONT}`; }
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, W / 2, H / 2 + fs * .04);
  });
  return new THREE.MeshBasicMaterial({ map: o.t, transparent: true });
}
const screenMat = tex => new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });

/* ============================ TIỆN ÍCH MỚI: cây, kim loại vàng, tòa nhà ============================ */
const seeded = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;     // ngẫu nhiên có hạt giống: cảnh luôn giống nhau
function limb(p, m, a, b, r0, r1 = r0) {                                         // thanh trụ nối 2 điểm (cành cây, tay hổ) r0 ở điểm a, r1 ở điểm b
  const A = new THREE.Vector3(a[0], a[1], a[2]), Bv = new THREE.Vector3(b[0], b[1], b[2]), d = Bv.clone().sub(A), L = d.length();
  const o = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, L, 12), m);
  o.position.copy(A).add(Bv).multiplyScalar(.5); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); p.add(o); return o;
}
let LEAF = null, BARK = null, FOL = null, BLOBS = null;
function leafTex() {
  if (LEAF) return LEAF; const r = seeded(7);
  const o = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#2d6a2b'; g.fillRect(0, 0, w, h);
    const cols = ['#1f4f22', '#2c7430', '#3a8a34', '#4fa13f', '#68b44a', '#7fc255'];
    for (let i = 0; i < 1100; i++) {
      g.fillStyle = cols[(r() * cols.length) | 0]; g.save(); g.translate(r() * w, r() * h); g.rotate(r() * 6.28);
      const s = 3 + r() * 7; g.beginPath(); g.ellipse(0, 0, s, s * .42, 0, 0, 7); g.fill(); g.restore();
    }
  });
  o.t.wrapS = o.t.wrapT = THREE.RepeatWrapping; o.t.repeat.set(3, 2); return (LEAF = o.t);
}
function foliage() {                                                             // 3 cụm lá méo mó, dùng chung cho mọi cây và chậu
  if (FOL) return { mat: FOL, geos: BLOBS };
  FOL = std(0xffffff, { map: leafTex(), vertexColors: true, roughness: .9 });
  BLOBS = [11, 23, 37].map(seed => {
    const g = new THREE.IcosahedronGeometry(1, LOW ? 1 : 2), pos = g.attributes.position, col = [], r = seeded(seed), ph = [r() * 6, r() * 6, r() * 6];
    const dark = new THREE.Color(0x2a6a2c), light = new THREE.Color(0x8ccb58), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const n = Math.sin(x * 3.1 + ph[0]) * Math.sin(y * 2.7 + ph[1]) * Math.sin(z * 3.3 + ph[2]), k = 1 + n * .22;
      pos.setXYZ(i, x * k, y * k * .88, z * k); c.copy(dark).lerp(light, clamp((y + 1) / 2 * .85 + n * .2 + .08)); col.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return g;
  });
  return { mat: FOL, geos: BLOBS };
}
function barkMat() {
  if (BARK) return BARK; const r = seeded(5);
  const o = canvasTex(64, 128, (g, w, h) => {
    g.fillStyle = '#5b4331'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { g.fillStyle = i % 2 ? '#43301f' : '#745a42'; g.fillRect(r() * w, 0, 1 + r() * 3, h); }
  });
  o.t.wrapS = o.t.wrapT = THREE.RepeatWrapping; o.t.repeat.set(1, 2); return (BARK = std(0xffffff, { map: o.t, roughness: .95 }));
}
function tree(x, z, k, seed) {                                                   // cây xanh ven đường: hố cây đá, thân thon, cành, tán lá nhiều cụm
  const r = seeded(seed), g = new THREE.Group(), F = foliage(), bk = barkMat();
  g.position.set(x, 0, z); g.scale.setScalar(k); g.rotation.y = r() * 6.28; scene.add(g);
  const pit = B(g, M.stone, [2.2, .16, 2.2], [0, .08, 0]); pit.receiveShadow = !LOW;
  B(g, std(0x3b2a1c, { roughness: 1 }), [1.7, .18, 1.7], [0, .1, 0]);
  B(g, M.dark, [2.3, .05, .12], [0, .17, 1.12]); B(g, M.dark, [2.3, .05, .12], [0, .17, -1.12]); B(g, M.dark, [.12, .05, 2.3], [1.12, .17, 0]); B(g, M.dark, [.12, .05, 2.3], [-1.12, .17, 0]);
  const top = [.1, 3.1, .05];
  limb(g, bk, [0, .1, 0], top, .3, .15).castShadow = !LOW;
  [[-1.3, 4.3, .4], [1.2, 4.5, -.5], [.3, 4.7, 1.2], [-.4, 4.4, -1.2]].forEach(b => limb(g, bk, top, b, .13, .05));
  const TR = { g, k, ry: g.rotation.y, blobs: [], exc: 0 }; TREES.push(TR);                                  // V8: gió lay tán lá
  const blob = (px, py, pz, s) => {
    const m = new THREE.Mesh(F.geos[(r() * 3) | 0], F.mat); m.position.set(px, py, pz); TR.blobs.push({ m, p0: m.position.clone(), ph: r() * 6.28, rz: 0 });
    m.scale.set(s * (1 + r() * .2), s * (.85 + r() * .2), s * (1 + r() * .2)); m.rotation.y = r() * 6.28; m.castShadow = !LOW; g.add(m);
  };
  blob(0, 4.9, 0, 1.9);
  for (let i = 0; i < 13; i++) { const a = r() * 6.28, rad = .9 + r() * 1.2; blob(Math.cos(a) * rad, 3.9 + r() * 1.9, Math.sin(a) * rad, .95 + r() * .55); }
  for (let i = 0; i < 4; i++) blob((r() - .5) * 1.5, 6.0 + r() * .5, (r() - .5) * 1.5, .85 + r() * .3);
  return g;
}
function pot(x, z, s) {                                                          // chậu cây: chậu thon có viền, đất, 4–5 cụm lá
  const g = new THREE.Group(), F = foliage(), r = seeded((x * 100 + z * 10) | 0 || 3);
  g.position.set(x, 0, z); g.scale.setScalar(s); scene.add(g);
  mesh(g, new THREE.CylinderGeometry(.34, .24, .55, 20), M.pot, [1, 1, 1], [0, .28, 0]); C(g, M.pot, [.74, .08, .74], [0, .56, 0]); C(g, std(0x3b2a1c, { roughness: 1 }), [.6, .04, .6], [0, .58, 0]);
  [[0, .98, 0, .62], [.2, .9, .12, .42], [-.2, .94, -.1, .44], [.05, 1.28, 0, .4], [-.12, .78, .22, .34]].forEach(b => {
    const m = new THREE.Mesh(F.geos[(r() * 3) | 0], F.mat); m.position.set(b[0], b[1], b[2]); m.scale.setScalar(b[3]); m.rotation.y = r() * 6; m.castShadow = !LOW; g.add(m);
  });
}
let ENV = null;
function makeEnv() {                                                             // môi trường giả để kim loại vàng có ánh phản chiếu
  if (ENV) return ENV; const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
  const sky = canvasTex(8, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#fff3d6'); gr.addColorStop(.46, '#ffc98a'); gr.addColorStop(.54, '#7a5230'); gr.addColorStop(1, '#2b1d10');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  es.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ map: sky.t, side: THREE.BackSide })));
  [[-22, 24, 30], [26, 14, 22], [0, 30, -18], [-10, 8, -30]].forEach(p => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(16, 12, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.0, 1.8) })); b.position.set(p[0], p[1], p[2]); b.lookAt(0, 0, 0); es.add(b);
  });
  const rt = pm.fromScene(es, .04); pm.dispose(); return (ENV = rt.texture);
}
function bldTex(base, accent, h, seed) {                                         // mặt tiền nhà phố: cửa sổ khung trắng, ban công, máy lạnh, cửa cuốn tầng trệt
  const r = seeded(seed), W = 280, H = Math.round(h * 20), floors = Math.round(h / 3), fh = H / floors;
  const o = canvasTex(W, H, g => {
    g.fillStyle = base; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 46; i++) { g.fillStyle = `rgba(60,45,30,${.02 + r() * .035})`; g.fillRect(r() * W, 0, 2 + r() * 12, H); }
    for (let f = 0; f < floors - 1; f++) {
      const y0 = f * fh; g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(0, y0 + fh - 4, W, 4);
      for (let c = 0; c < 3; c++) {
        const cx = W / 6 + c * W / 3, wx = cx - 21, wy = y0 + 14, ww = 42, wh = fh - 30;
        g.fillStyle = '#f1eee6'; g.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);
        const gr = g.createLinearGradient(wx, wy, wx + ww, wy + wh); const lit = r() < .28;
        if (lit) { gr.addColorStop(0, '#ffe1a6'); gr.addColorStop(1, '#f5b258'); } else { gr.addColorStop(0, '#6a8aa0'); gr.addColorStop(1, '#22313f'); }
        g.fillStyle = gr; g.fillRect(wx, wy, ww, wh); g.fillStyle = '#f1eee6'; g.fillRect(cx - 1.5, wy, 3, wh); g.fillRect(wx, wy + wh * .4, ww, 3);
        if (r() < .35) { g.fillStyle = accent; g.fillRect(wx - 9, wy - 2, 6, wh + 4); g.fillRect(wx + ww + 3, wy - 2, 6, wh + 4); }   // cánh cửa chớp
        g.fillStyle = '#c9c5bb'; g.fillRect(wx - 7, wy + wh + 4, ww + 14, 5);
        if (r() < .4) { g.fillStyle = 'rgba(30,30,30,.55)'; g.fillRect(wx - 8, wy + wh - 12, ww + 16, 3); for (let b = 0; b < 7; b++) g.fillRect(wx - 6 + b * 8.5, wy + wh - 12, 1.5, 14); }   // lan can
        if (r() < .22) { g.fillStyle = '#e8e8ea'; g.fillRect(wx + ww + 12, wy + wh * .55, 22, 14); g.fillStyle = '#9ca3a8'; g.fillRect(wx + ww + 15, wy + wh * .55 + 5, 16, 5); }   // máy lạnh
      }
    }
    const y1 = (floors - 1) * fh; g.fillStyle = accent; g.fillRect(0, y1, W, 16);
    g.fillStyle = '#9aa0a6'; g.fillRect(24, y1 + 22, W - 48, fh - 22); g.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 16; i++) g.fillRect(24, y1 + 26 + i * (fh - 30) / 16, W - 48, 1.5);
  });
  return o.t;
}
function building(x, w, h, z, d, base, accent, seed) {
  const side = std(base, { roughness: .9 }), tex = std(0xffffff, { map: bldTex('#' + new THREE.Color(base).getHexString(), '#' + new THREE.Color(accent).getHexString(), h, seed), roughness: .9 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, side, side, tex, side]); m.position.set(x, h / 2, z); m.castShadow = !LOW; scene.add(m);
  B(scene, std(0xaeaaa2, { roughness: .9 }), [w + .4, .35, d + .4], [x, h + .17, z]);               // mái đua
  return m;
}
let WIN_D = null, WIN_L = null;
function winMats() {
  if (WIN_D) return;
  const mk = lit => canvasTex(128, 112, (g, w, h) => {
    g.fillStyle = '#eceae4'; g.fillRect(0, 0, w, h); const gr = g.createLinearGradient(0, 0, w, h);
    if (lit) { gr.addColorStop(0, '#ffe2a8'); gr.addColorStop(1, '#f6b45c'); } else { gr.addColorStop(0, '#6a8aa2'); gr.addColorStop(.5, '#2c3e50'); gr.addColorStop(1, '#1b2733'); }
    g.fillStyle = gr; g.fillRect(8, 8, w - 16, h - 16); g.fillStyle = '#eceae4'; g.fillRect(w / 2 - 3, 8, 6, h - 16); g.fillRect(8, h * .38, w - 16, 5);
    g.fillStyle = lit ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.13)';
    if (lit) g.fillRect(8, 8, 18, h - 16); else { g.beginPath(); g.moveTo(8, 8); g.lineTo(62, 8); g.lineTo(8, 72); g.fill(); }
  });
  WIN_D = std(0xffffff, { map: mk(false).t, roughness: .25, metalness: .3 }); WIN_L = new THREE.MeshBasicMaterial({ map: mk(true).t });
}

/* ============================ TRẠNG THÁI ============================ */
const scene = new THREE.Scene();
let renderer, camera, composer, bloom, film, useComposer = false, canvas, world, scroller, stk, spc;
let posC, lookC, maxScroll = 1, target = 0, sp = 0, keepP = 0, raf = 0, last = 0, W = 1, H = 1;
const HOTS = [], LIVE = {}, dots = [];
let slideL, slideR, khoL, khoR, altarLight, hover = null, active = null, fly = null, needRay = false, ptrXY = null, lastTouch = false;
const API = { ready: false };
let fx = null; const FXO = {}; const TREES = [];            // V7: hiệu ứng đang chạy + tham chiếu các bộ phận động (xem khối V7 bên dưới)
window.World = API;

/* ============================ ĐỒ HỌA ============================ */
function hot(mid, g, box) {
  g.userData.mid = mid; scene.add(g); g.updateMatrixWorld(true);
  const b = new THREE.Box3();
  if (box) b.setFromCenterAndSize(new THREE.Vector3(box[0], box[1], box[2]), new THREE.Vector3(box[3], box[4], box[5])); else b.setFromObject(g);
  const sz = b.getSize(new THREE.Vector3()).addScalar(.1), ct = b.getCenter(new THREE.Vector3());
  const o = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(sz.x, sz.y, sz.z)),
    new THREE.LineBasicMaterial({ color: 0xffe08a, transparent: true, opacity: .95, depthTest: false, fog: false }));
  o.position.copy(ct); o.visible = false; o.renderOrder = 999; scene.add(o); HOTS.push({ mid, group: g, outline: o });
}

function stageSky() {
  const sky = canvasTex(512, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#1f3a6b'); gr.addColorStop(.2, '#4f5f93'); gr.addColorStop(.38, '#a96f8c'); gr.addColorStop(.5, '#ee9a74'); gr.addColorStop(.62, '#ffc17a'); gr.addColorStop(1, '#ffdca0');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const glow = g.createRadialGradient(w * .22, h * .6, 4, w * .22, h * .6, w * .7); glow.addColorStop(0, 'rgba(255,236,190,.9)'); glow.addColorStop(.25, 'rgba(255,200,130,.45)'); glow.addColorStop(1, 'rgba(255,170,100,0)');
    g.fillStyle = glow; g.fillRect(0, 0, w, h);
    const core = g.createRadialGradient(w * .22, h * .6, 0, w * .22, h * .6, w * .06); core.addColorStop(0, 'rgba(255,252,236,1)'); core.addColorStop(.5, 'rgba(255,236,190,.65)'); core.addColorStop(1, 'rgba(255,220,160,0)');   // đĩa mặt trời
    g.fillStyle = core; g.fillRect(0, 0, w, h);
    const r = seeded(31); for (let i = 0; i < 26; i++) {                                           // mây vệt mềm
      const cx = r() * w, cy = h * (.14 + r() * .32), rw = 60 + r() * 150, rh = 5 + r() * 12, gg = g.createRadialGradient(cx, cy, 1, cx, cy, rw);
      gg.addColorStop(0, `rgba(255,214,190,${.12 + r() * .16})`); gg.addColorStop(1, 'rgba(255,214,190,0)');
      g.save(); g.translate(cx, cy); g.scale(1, rh / rw); g.translate(-cx, -cy); g.fillStyle = gg; g.beginPath(); g.arc(cx, cy, rw, 0, 7); g.fill(); g.restore();
    }
  });
  scene.background = sky.t;
  const env = makeEnv(); [M.honey, M.honey2, M.gold, M.silver, M.steel, M.glassD].forEach(m => { m.envMap = env; m.envMapIntensity = (m === M.honey || m === M.honey2) ? .3 : .6; m.needsUpdate = true; }); M.glass.envMap = env; M.glass.envMapIntensity = .35;
  scene.fog = new THREE.FogExp2(0xf0b878, .0085);                       // sương mù nhẹ
  HEMI = new THREE.HemisphereLight(0xfff0dc, 0x7a6248, 1.0); scene.add(HEMI);
  const sun = new THREE.DirectionalLight(0xffc98a, 1.9); sun.position.set(-22, 20, 42); sun.target.position.set(0, 0, -6);
  scene.add(sun, sun.target);
  if (!LOW) {                                                           // bóng đổ mềm chỉ ở máy mạnh
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    const c = sun.shadow.camera; c.left = -34; c.right = 34; c.top = 34; c.bottom = -34; c.near = 5; c.far = 130;
    sun.shadow.bias = -.0004; sun.shadow.normalBias = .03; sun.shadow.radius = 4;
  }
  [[0, 2.8, -3.5], [-1, 2.8, -9.5], [1.5, 2.8, -16], [0, 2.8, -22.5]].forEach(p => {   // đèn ấm trong cửa hàng
    const l = new THREE.PointLight(0xffd9a0, 4.6, 18, 1); l.position.set(p[0], p[1], p[2]); scene.add(l);
  });
  const gl = new THREE.PointLight(0x62ffa8, 2.4, 9, 1); gl.position.set(2.5, 2.6, -31); scene.add(gl);   // ánh xanh trong kho
  if (!LOW) {
    altarLight = new THREE.PointLight(0xff8a3a, 1.1, 6, 1); altarLight.position.set(-8.2, 1.5, -24.2); scene.add(altarLight);
  }
}

let NOISE = null;
function noiseBump(rx, ry) {                                                       // nền nhám li ti: làm ánh sáng trên đá/sàn lấp lánh không còn phẳng như nhựa
  if (LOW) return null;
  if (!NOISE) { const r = seeded(5), o = canvasTex(128, 128, (g, w, h) => { for (let i = 0; i < 5200; i++) { const v = 90 + r() * 120 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); } }); o.t.colorSpace = THREE.NoColorSpace; o.t.wrapS = o.t.wrapT = THREE.RepeatWrapping; NOISE = o.t; }
  const t = NOISE.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return t;
}
function stagePlaza() {
  const r = seeded(99);
  // ---- đường nhựa (nền) ----
  const at = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#4a4b4f'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const v = 55 + r() * 45 | 0; g.fillStyle = `rgba(${v},${v},${v + 3},.55)`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
  });
  at.t.wrapS = at.t.wrapT = THREE.RepeatWrapping; at.t.repeat.set(50, 50);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ map: at.t, roughness: .92 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, 40); ground.receiveShadow = !LOW; scene.add(ground);
  // ---- vỉa hè lát gạch (z từ 0 đến 13.1) + gờ bó vỉa ----
  const st = canvasTex(256, 256, (g, w, h) => {
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const v = 168 + (r() * 26 | 0); g.fillStyle = `rgb(${v},${v - 4},${v - 12})`; g.fillRect(i * 64, j * 64, 64, 64);
    }
    g.strokeStyle = 'rgba(70,64,56,.65)'; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); }
  });
  st.t.wrapS = st.t.wrapT = THREE.RepeatWrapping; st.t.repeat.set(37, 3.3);
  const walk = P(scene, new THREE.MeshStandardMaterial({ map: st.t, roughness: .8 }), [150, 13.1], [0, .006, 6.55], [-Math.PI / 2, 0, 0]); walk.receiveShadow = !LOW;
  const ap = canvasTex(512, 512, (g, w, h) => {                                                        // cẩm thạch kem có vân, ô 2x2, viền vàng
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const x0 = i * 256, y0 = j * 256, v = 236 + (r() * 12 | 0); g.fillStyle = `rgb(${v},${v - 8},${v - 30})`; g.fillRect(x0, y0, 256, 256);
      g.strokeStyle = 'rgba(150,120,70,.22)'; g.lineWidth = 1.5; for (let k = 0; k < 7; k++) { g.beginPath(); let x = x0 + r() * 256, y = y0; g.moveTo(x, y); for (let n = 0; n < 6; n++) { x += (r() - .5) * 70; y += 256 / 6; g.lineTo(x, y); } g.stroke(); }
    }
    g.strokeStyle = 'rgba(120,95,45,.55)'; g.lineWidth = 4; g.strokeRect(2, 2, 508, 508); g.beginPath(); g.moveTo(256, 0); g.lineTo(256, 512); g.moveTo(0, 256); g.lineTo(512, 256); g.stroke();
    g.strokeStyle = '#c99a2e'; g.lineWidth = 3; g.strokeRect(14, 14, 484, 484);
  });
  ap.t.wrapS = ap.t.wrapT = THREE.RepeatWrapping; ap.t.repeat.set(6, 1.1);
  const apron = P(scene, new THREE.MeshStandardMaterial({ map: ap.t, roughness: .4, envMap: makeEnv(), envMapIntensity: .3, bumpMap: noiseBump(48, 9), bumpScale: .35 }), [24, 4.4], [0, .01, 2.9], [-Math.PI / 2, 0, 0]); apron.receiveShadow = !LOW;
  // thảm xanh lục viền vàng từ mép vỉa hè tới cửa + cọc nhung mạ vàng
  const cp = canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#0f4a2b'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() < .5 ? '255,255,255' : '0,0,0'},.03)`; g.fillRect(r() * w, r() * h, 2, 2); }
    g.fillStyle = '#d8aa3a'; g.fillRect(6, 0, 5, h); g.fillRect(w - 11, 0, 5, h); g.fillStyle = '#e9c566'; g.fillRect(14, 0, 2, h); g.fillRect(w - 16, 0, 2, h);
  });
  cp.t.wrapS = cp.t.wrapT = THREE.RepeatWrapping; cp.t.repeat.set(1, 4.5);
  P(scene, new THREE.MeshStandardMaterial({ map: cp.t, roughness: .95 }), [3.2, 11.6], [0, .016, 7.1], [-Math.PI / 2, 0, 0]).receiveShadow = !LOW;
  const rope = std(0x7a0f1c, { roughness: .6 }), zs = [3.4, 6.4, 9.4], pts = [];
  [-1.95, 1.95].forEach(x => zs.forEach(z => {
    C(scene, M.gold, [.34, .05, .34], [x, .03, z]); C(scene, M.gold, [.07, 1.0, .07], [x, .55, z]); S(scene, M.gold, [.17, .17, .17], [x, 1.08, z]);
  }));
  [-1.95, 1.95].forEach(x => [[3.4, 6.4], [6.4, 9.4]].forEach(a2 => {
    const cv = new THREE.CatmullRomCurve3([new THREE.Vector3(x, .98, a2[0]), new THREE.Vector3(x, .8, (a2[0] + a2[1]) / 2), new THREE.Vector3(x, .98, a2[1])]);
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 14, .035, 8), rope));
  }));
  B(scene, M.stone, [150, .13, .22], [0, .065, 13.2]);                                                   // gờ bó vỉa
  B(scene, std(0xd8b43a, { roughness: .6 }), [150, .01, .12], [0, .135, 13.2]);                           // vạch vàng mép vỉa hè
  // ---- vạch kẻ đường: tim đường đứt đoạn, vạch mép, vạch qua đường ----
  const dash = canvasTex(64, 4, (g, w, h) => { g.fillStyle = '#e9e6dc'; g.fillRect(0, 0, 36, h); });
  dash.t.wrapS = THREE.RepeatWrapping; dash.t.repeat.set(150 / 4, 1);
  P(scene, new THREE.MeshBasicMaterial({ map: dash.t, transparent: true, fog: true }), [150, .18], [0, .012, 22.2], [-Math.PI / 2, 0, 0]);
  P(scene, new THREE.MeshBasicMaterial({ color: 0xcfcbbf }), [150, .12], [0, .012, 14.2], [-Math.PI / 2, 0, 0]);
  const zb = canvasTex(256, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#e9e6dc'; for (let i = 0; i < 8; i++) g.fillRect(i * 32 + 4, 0, 18, h); });
  P(scene, new THREE.MeshBasicMaterial({ map: zb.t, transparent: true }), [7.4, 6], [0, .013, 17.6], [-Math.PI / 2, 0, 0]);
  // ---- nhà hai bên và dãy nhà xa ----
  building(-20, 14, 18, -6, 22, 0xb9d0bd, 0x2e8b57, 3); building(20, 14, 20, -6, 22, 0xe6c9a0, 0xc0562b, 4);
  building(-34, 14, 25, -10, 22, 0xd7c3d6, 0x7a4b8a, 5); building(34, 14, 23, -10, 22, 0xc7d4e6, 0x2c5d9a, 6);
  building(-49, 16, 31, -10, 22, 0xe9d7a9, 0xb8892b, 7); building(49, 16, 28, -10, 22, 0xd6b8a8, 0x8a3b2b, 8);
  // ---- cây xanh ven đường + đèn đường cổ ----
  tree(-13.5, 11.4, 1.0, 21); tree(13.5, 11.4, 1.05, 34); tree(-24, 11.4, .95, 55); tree(24, 11.4, .98, 67);
  const lamp = x => {
    const g = new THREE.Group(); g.position.set(x, 0, 11.4); scene.add(g);
    C(g, M.dark, [.42, .22, .42], [0, .11, 0]); C(g, M.dark, [.26, .9, .26], [0, .67, 0]); C(g, M.dark, [.13, 3.7, .13], [0, 2.6, 0]);
    C(g, M.dark, [.3, .1, .3], [0, 4.4, 0]); B(g, emi(0xffd9a0, 1.5), [.36, .5, .36], [0, 4.7, 0]); C(g, M.dark, [.62, .16, .62], [0, 5.05, 0]); S(g, M.dark, [.16, .16, .16], [0, 5.2, 0]);
  };
  lamp(-8.6); lamp(8.6);
  // ---- xe máy đậu trước hè ----
  const bike = (x, z, ry, c) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
    [-.62, .62].forEach(zz => { C(g, M.black, [.62, .12, .62], [0, .31, zz], [0, 0, Math.PI / 2]); C(g, M.silver, [.3, .14, .3], [0, .31, zz], [0, 0, Math.PI / 2]); });
    B(g, c, [.3, .34, .85], [0, .55, 0]); B(g, M.black, [.3, .1, .6], [0, .8, -.18]); B(g, M.dark, [.06, .62, .06], [0, .62, .66], [.32, 0, 0]);
    B(g, M.dark, [.56, .05, .05], [0, .98, .55]); S(g, emi(0xfff1c0, 1.4), [.16, .16, .1], [0, .86, .72]); B(g, c, [.3, .08, .5], [0, .3, -.62]);
  };
  bike(-9.6, 4.6, 1.2, M.red); bike(-8.7, 5.2, 1.45, std(0x2b4a7a)); bike(10.2, 4.8, -1.3, std(0xd0d0d0, { metalness: .3 }));
  // hình nhân low-poly áo polo vàng cổ xanh
  const man = (x, z, ry) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
    C(g, M.black, [.2, .85, .2], [-.11, .42, 0]); C(g, M.black, [.2, .85, .2], [.11, .42, 0]);
    C(g, M.polo, [.46, .62, .28], [0, 1.15, 0]); C(g, M.green, [.26, .06, .26], [0, 1.47, 0]); S(g, M.skin, [.24, .28, .24], [0, 1.64, 0]);
    C(g, M.polo, [.12, .5, .12], [-.3, 1.2, 0], [0, 0, .12]); C(g, M.polo, [.12, .5, .12], [.3, 1.2, 0], [0, 0, -.12]); scene.add(g);
  };
  man(-4.6, 6.5, .5); man(-7.8, 9.2, -.4);
}

function stageTiger() {                                                       // TƯỢNG HỔ VÀNG CẦM 2 CHIẾC BÁNH, đặt bên phải cửa
  const env = makeEnv();
  const mk = (c, rough, metal = 1) => new THREE.MeshStandardMaterial({ color: c, metalness: metal, roughness: rough, envMap: env, envMapIntensity: .8 });
  const gold = mk(0xf0b223, .26), goldL = mk(0xffd86a, .22), bronze = mk(0x8a5410, .38), rose = mk(0xe58f6e, .32), eye = mk(0x24130a, .2, .5);
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .2, emissive: 0xffffff, emissiveIntensity: .25 });
  const Z = new THREE.Group(); Z.position.set(5.6, 0, 6.4); Z.rotation.y = -.32; Z.scale.setScalar(1.15); scene.add(Z);
  // bệ: đĩa lát tròn, 2 tầng đá kem, viền vàng, dải LED, bảng tên
  C(Z, std(0xf0e3c0, { roughness: .5 }), [4.6, .04, 4.6], [0, .02, 0]);
  B(Z, M.stone, [2.8, .3, 2.8], [0, .19, 0]); B(Z, M.cream, [2.3, .7, 2.3], [0, .65, 0]); B(Z, gold, [2.42, .08, 2.42], [0, 1.02, 0]);
  [[0, 1.19, 2.36, .05, .05], [0, -1.19, 2.36, .05, .05]].forEach(a => B(Z, M.led, [a[2], a[3], a[4]], [a[0], .36, a[1]]));
  [[1.19, 0], [-1.19, 0]].forEach(a => B(Z, M.led, [.05, .05, 2.36], [a[0], .36, a[1]]));
  B(Z, gold, [1.5, .42, .06], [0, .66, 1.17]); P(Z, textMat('9 SẠCH', 1.3 / .3, '#6b3f06'), [1.3, .3], [0, .66, 1.205]);
  const T = new THREE.Group(); T.position.y = 1.06; Z.add(T); FXO.tiger = T;
  // chân, bàn chân, thân, bụng
  [-1, 1].forEach(sx => {
    C(T, gold, [.36, .6, .36], [sx * .32, .46, 0]); S(T, gold, [.52, .22, .66], [sx * .32, .11, .08]);
    C(T, bronze, [.375, .05, .375], [sx * .32, .36, 0]); C(T, bronze, [.375, .05, .375], [sx * .32, .52, 0]);
    [-.14, 0, .14].forEach(o => S(T, bronze, [.03, .06, .03], [sx * .32 + o, .12, .4]));
  });
  S(T, gold, [1.25, 1.25, .95], [0, 1.2, -.02]); S(T, goldL, [.8, .95, .3], [0, 1.15, .36]);
  [-1, 1].forEach(sx => [0, 1, 2].forEach(i => S(T, bronze, [.07, .1, .34], [sx * .6, 1.52 - i * .24, .02], [0, 0, sx * .22])));
  // đầu: tai, trán sọc, mõm, mũi, miệng, mắt, má
  S(T, gold, [1.55, 1.25, 1.2], [0, 2.3, .02]);
  [-1, 1].forEach(sx => {
    S(T, gold, [.5, .5, .28], [sx * .62, 2.84, -.05]); S(T, rose, [.34, .34, .12], [sx * .62, 2.84, .08]); S(T, bronze, [.52, .12, .3], [sx * .64, 3.06, -.05], [0, 0, sx * -.35]);
    S(T, bronze, [.09, .3, .09], [sx * .24, 2.76, .5], [.5, 0, sx * -.4]); S(T, rose, [.28, .2, .1], [sx * .55, 2.1, .42]);
    S(T, eye, [.3, .38, .18], [sx * .34, 2.4, .52]); S(T, white, [.1, .13, .06], [sx * .3, 2.47, .63]); S(T, white, [.05, .06, .04], [sx * .4, 2.31, .64]);
    const sm = new THREE.Mesh(new THREE.TorusGeometry(.12, .017, 6, 16, Math.PI), eye); sm.position.set(sx * .11, 2.1, .735); sm.rotation.z = Math.PI; T.add(sm);
  });
  S(T, bronze, [.1, .32, .1], [0, 2.8, .53], [.55, 0, 0]);
  S(T, goldL, [.8, .55, .5], [0, 2.12, .5]); S(T, eye, [.17, .12, .12], [0, 2.26, .73]); S(T, rose, [.14, .1, .05], [0, 1.99, .74]);
  // tay cầm bánh: mỗi tay 1 thanh, bàn tay, chiếc bánh tròn 6 múi có rãnh
  [-1, 1].forEach(sx => {
    S(T, gold, [.36, .36, .36], [sx * .6, 1.62, .12]); limb(T, gold, [sx * .6, 1.62, .12], [sx * 1.16, 1.22, .7], .17, .14); S(T, goldL, [.36, .32, .32], [sx * 1.18, 1.2, .72]);
    const cake = new THREE.Group(); cake.position.set(sx * 1.3, 1.6, .7); cake.rotation.y = sx * .35; T.add(cake);
    C(cake, sx < 0 ? gold : goldL, [1.04, .14, 1.04], [0, 0, 0], [Math.PI / 2, 0, 0]); C(cake, sx < 0 ? goldL : gold, [.88, .16, .88], [0, 0, .01], [Math.PI / 2, 0, 0]);
    [0, 1, 2].forEach(k => B(cake, bronze, [.86, .028, .02], [0, 0, .095], [0, 0, k * Math.PI / 3]));
  });
  // đuôi cong có vòng sọc
  const curve = new THREE.CatmullRomCurve3([[0, .85, -.5], [-.6, .7, -.95], [-1.2, 1.1, -.95], [-1.4, 1.75, -.6]].map(a => new THREE.Vector3(a[0], a[1], a[2])));
  T.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 28, .13, 10), gold)); S(T, bronze, [.3, .3, .3], [-1.4, 1.78, -.6]);
  [.25, .45, .65, .85].forEach(t => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.135, .045, 8, 16), bronze); ring.position.copy(curve.getPoint(t));
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), curve.getTangent(t)); T.add(ring);
  });
  Z.traverse(o => { if (o.isMesh) o.castShadow = !LOW; });
}

function stageFacade(logoImg) {
  const F = new THREE.Group(); scene.add(F);
  // tháp phía trên và cửa sổ
  winMats();
  const cw = canvasTex(256, 256, (g, w, h) => {
    const r = seeded(13); g.fillStyle = '#dcdad4'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(90,75,60,${.025 + r() * .04})`; g.fillRect(r() * w, 0, 2 + r() * 9, h); }
    g.strokeStyle = 'rgba(0,0,0,.14)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h); g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
  });
  cw.t.wrapS = cw.t.wrapT = THREE.RepeatWrapping; cw.t.repeat.set(5, 4);
  B(F, std(0xffffff, { map: cw.t, roughness: .9 }), [22, 16, 10], [0, 15, -5.2]);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) {
    const wx = -8.5 + c * 3.4, wy = 9.2 + r * 2.6;
    P(F, (r + c) % 3 === 0 ? WIN_L : WIN_D, [1.9, 1.65], [wx, wy, -.17]); B(F, M.stone, [2.15, .1, .26], [wx, wy - .9, -.07]);
  }
  B(F, std(0xb9b5ab, { roughness: .9 }), [22.6, .5, 10.6], [0, 23.25, -5.2]);                          // mái đua + thiết bị trên mái
  [[-6, 1.5, 1.6], [-3.6, 1.5, 1.6], [6.5, 1.4, 1.8]].forEach(a => { B(F, std(0xd7d9dc, { roughness: .5, metalness: .3 }), [a[1] + .4, a[2], 1.4], [a[0], 24.3, -6]); C(F, M.dark, [1, .08, 1], [a[0], 25.15, -6]); });
  C(F, M.steel, [2.2, 2.2, 2.2], [9, 24.6, -7]); C(F, M.dark, [2.3, .12, 2.3], [9, 25.75, -7]);
  // mảng ốp vàng mật ong bo cong
  const fas = new THREE.Mesh(new THREE.ExtrudeGeometry(rrShape(24, 3.7, .9), { depth: 2.2, bevelEnabled: true, bevelThickness: .12, bevelSize: .12, bevelSegments: 3, curveSegments: 10 }), M.honey);
  fas.position.set(0, 5.35, -1.2); fas.castShadow = !LOW; F.add(fas);                       // mặt trước ở z = 1.12
  mesh(F, ringGeo(23.4, 3.1, .8, .14), M.led, [1, 1, 1], [0, 5.35, 1.14]);                  // viền LED vàng ấm quanh mép
  mesh(F, ringGeo(23.8, 3.5, .85, .1), M.green, [1, 1, 1], [0, 5.35, 1.135]);
  B(F, M.green, [24, .1, .12], [0, 3.56, 1.12]);
  B(F, M.gold, [24.5, .14, .26], [0, 3.47, 1.06]); B(F, M.gold, [24.5, .14, .26], [0, 7.23, 1.06]);                    // phào chỉ vàng trên/dưới mảng ốp
  [-12.1, 12.1].forEach(x => B(F, M.gold, [.14, 3.8, .26], [x, 5.35, 1.06]));
  const hg = canvasTex(128, 128, g => { const gr = g.createRadialGradient(64, 64, 2, 64, 64, 64); gr.addColorStop(0, 'rgba(255,225,150,.9)'); gr.addColorStop(1, 'rgba(255,200,110,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  const halo = new THREE.MeshBasicMaterial({ map: hg.t, transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  P(F, halo, [15, 3.4], [0, 4.7, 1.12]); P(F, halo, [6, 6], [0, 6.9, 1.25]);                                            // quầng sáng sau chữ và huy hiệu
  [-1, 1].forEach(sx => {                                                                  // 2 ô kính bo cong hai bên
    mesh(F, new THREE.ShapeGeometry(rrShape(4.6, 2.3, 1.0), 12), M.glassD, [1, 1, 1], [sx * 8.3, 5.35, 1.15]);
    mesh(F, ringGeo(4.8, 2.5, 1.1, .1), M.led, [1, 1, 1], [sx * 8.3, 5.35, 1.16]);
  });
  // chữ trên mặt tiền
  P(F, textMat('Bánh Sầu Riêng', 11 / 1.35, '#1fae4b'), [11, 1.35], [0, 4.6, 1.17]);        // [chữ xanh lá lớn]
  P(F, textMat('124 Mậu Thân', 3.2 / .42, '#1f7a3a', 600), [3.2, .42], [-3.9, 3.95, 1.17]);  // [địa chỉ]
  [3.0, 3.75, 4.5, 5.25].forEach((x, i) => { S(F, i % 2 ? M.cakeB : M.spike, [.5, .5, .5], [x, 3.95, 1.2]); });   // 4 quả sầu riêng nhỏ
  // bảng "Sạch Là Chính – Ngon Là Mười": đặt NẰM TRƯỚC cột (cột chỉ nhô tới z = .7) nên không còn bị che
  B(F, M.honey2, [9.8, .8, .22], [0, 3.1, .92]); B(F, M.green, [9.9, .05, .26], [0, 3.52, .92]); B(F, M.green, [9.9, .05, .26], [0, 2.68, .92]);
  B(F, M.led, [9.6, .025, .04], [0, 3.46, 1.04]); B(F, M.led, [9.6, .025, .04], [0, 2.74, 1.04]);
  const slo = (() => {
    const W = 1400, H = Math.round(W / (9.2 / .6)), text = 'Sạch Là Chính – Ngon Là Mười';
    const o = canvasTex(W, H, g => {
      let fs = H * .74; g.font = `800 ${fs}px ${FONT}`; const mw = g.measureText(text).width; if (mw > W * .94) { fs *= W * .94 / mw; g.font = `800 ${fs}px ${FONT}`; }
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = fs * .13; g.strokeStyle = '#fff6dc'; g.strokeText(text, W / 2, H / 2 + fs * .04); g.fillStyle = '#c8102e'; g.fillText(text, W / 2, H / 2 + fs * .04);
    });
    return new THREE.MeshBasicMaterial({ map: o.t, transparent: true });
  })();
  P(F, slo, [9.2, .6], [0, 3.1, 1.035]);
  // khung kính tầng trệt
  B(F, M.dark, [20.4, .1, .1], [0, 3.42, .06]);
  [-1, 1].forEach(sx => {
    P(F, M.glass, [6.3, 2.7], [sx * 6.45, 2.05, .05]); B(F, M.stone, [6.3, .7, .25], [sx * 6.45, .35, .1]);
    B(F, M.dark, [6.3, .06, .08], [sx * 6.45, .72, .06]);
  });
  [-10, -2.9, 2.9, 10].forEach(x => { const p = B(F, M.stone, [.8, 3.5, .8], [x, 1.75, .3]); p.castShadow = !LOW; B(F, M.woodD, [.96, .22, .96], [x, .11, .3]); B(F, M.gold, [.9, .08, .9], [x, 3.4, .3]); });
  B(F, M.dark, [3, .02, 1.2], [0, .02, 1.8]);
  // cửa kính trượt (mở theo tiến độ cuộn)
  const panel = sx => {
    const g = new THREE.Group(); g.position.set(sx * 1.2, 0, -.25);
    P(g, M.glass, [2.3, 2.5], [0, 1.3, 0]); B(g, M.silver, [2.3, .06, .06], [0, 2.55, 0]); B(g, M.silver, [2.3, .06, .06], [0, .05, 0]);
    B(g, M.silver, [.05, 2.5, .05], [-sx * 1.15, 1.3, 0]); C(g, M.silver, [.04, .8, .04], [-sx * .95, 1.2, .05]); F.add(g); return g;
  };
  slideL = panel(-1); slideR = panel(1);
  // chậu cây
  [[-8.6, 2], [-7.2, 2.4], [-3.9, 2.1], [3.9, 2.1], [7.4, 2.3], [8.8, 2]].forEach(p => pot(p[0], p[1], 1.1));
  // huy hiệu tròn "9 SẠCH" (bấm: mục Thông tin)
  const bt = canvasTex(512, 512, (g, w, h) => {
    const cx = w / 2, cy = h / 2; g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(cx, cy, 250, 0, 7); g.fill();
    g.fillStyle = '#2e8b3e'; for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; g.save(); g.translate(cx, cy); g.rotate(a); g.beginPath(); g.moveTo(-14, -228); g.lineTo(14, -228); g.lineTo(0, -196); g.fill(); g.restore(); }
    g.fillStyle = '#f9cc1f'; g.beginPath(); g.arc(cx, cy, 186, 0, 7); g.fill();
    g.fillStyle = '#d4a017'; g.beginPath(); g.moveTo(190, 150); g.lineTo(215, 100); g.lineTo(256, 135); g.lineTo(297, 100); g.lineTo(322, 150); g.fill();
    g.fillStyle = '#e03a1e'; g.strokeStyle = '#fff'; g.lineWidth = 12; g.font = `700 112px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.strokeText('9 SẠCH', cx, cy + 20); g.fillText('9 SẠCH', cx, cy + 20);
    g.fillStyle = '#1f7a3a'; g.font = `600 30px ${FONT}`; g.fillText('SINCE 2017', cx, cy + 96);
    g.fillStyle = '#f6e27a'; for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(190 + i * 66, 372, 34, 26, 0, 0, 7); g.fill(); }
    if (logoImg) { g.save(); g.beginPath(); g.arc(cx, cy, 250, 0, 7); g.clip(); g.drawImage(logoImg, 0, 0, w, h); g.restore(); }   // /assets/logo.png nếu có
  });
  const bg = new THREE.Group(); bg.position.set(0, 6.9, 1.2);
  mesh(bg, new THREE.CircleGeometry(1.7, 48), new THREE.MeshBasicMaterial({ map: bt.t }), [1, 1, 1], [0, 0, .31]);
  C(bg, M.honey, [3.7, .3, 3.7], [0, 0, .15], [Math.PI / 2, 0, 0]);
  mesh(bg, new THREE.TorusGeometry(1.8, .06, 8, 64), M.led, [1, 1, 1], [0, 0, .33]);
  hot('tt', bg);
}

function stageInterior() {
  const I = new THREE.Group(); scene.add(I);
  const wt = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#b98a5a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#c49560' : '#ad7f52'; g.fillRect(i * 32, 0, 30, h); }
    g.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 8; i++) g.fillRect(i * 32 + 30, 0, 2, h);
  });
  wt.t.wrapS = wt.t.wrapT = THREE.RepeatWrapping; wt.t.repeat.set(7, 6);
  const floor = P(I, std(0xffffff, { map: wt.t, roughness: .4, envMap: makeEnv(), envMapIntensity: .25, bumpMap: noiseBump(40, 68), bumpScale: .3 }), [20, 34], [0, .012, -17], [-Math.PI / 2, 0, 0]); floor.receiveShadow = !LOW;
  const ceil = P(I, M.ceil, [20, 34], [0, 3.45, -17], [Math.PI / 2, 0, 0]); ceil.castShadow = !LOW;
  const wl = P(I, M.cream, [34, 3.45], [-10, 1.725, -17], [0, Math.PI / 2, 0]); const wr = P(I, M.cream, [34, 3.45], [10, 1.725, -17], [0, -Math.PI / 2, 0]);
  wl.castShadow = wr.castShadow = !LOW;
  B(I, M.wood, [.08, 1, 34], [-9.96, .5, -17]); B(I, M.wood, [.08, 1, 34], [9.96, .5, -17]);
  B(I, M.led, [.08, .06, 34], [-9.8, 3.38, -17]); B(I, M.led, [.08, .06, 34], [9.8, 3.38, -17]); B(I, M.led, [20, .06, .08], [0, 3.38, -.2]);
  [-6, 0, 6].forEach(x => [-2, -7.5, -13, -18.5, -24].forEach(z => C(I, M.led, [.28, .03, .28], [x, 3.43, z])));
  [-4.5, -11, -17.5, -24].forEach(z => {                                                                  // vòng đèn LED viền vàng trên trần
    const rg = new THREE.Mesh(new THREE.TorusGeometry(1.3, .035, 8, 64), M.led); rg.rotation.x = Math.PI / 2; rg.position.set(0, 3.4, z); I.add(rg);
    const rg2 = new THREE.Mesh(new THREE.TorusGeometry(1.45, .05, 8, 64), M.gold); rg2.rotation.x = Math.PI / 2; rg2.position.set(0, 3.42, z); I.add(rg2);
  });
}

function stageObjects() {
  const dummy = new THREE.Object3D(); let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  /* --- hotro: màn hình cảm ứng ở lối vào --- */
  { const g = new THREE.Group(); g.position.set(5.0, 0, -3.2);
    B(g, M.dark, [.35, .04, .35], [0, .02, 0]); B(g, M.dark, [.06, 1.1, .06], [0, .58, 0]);
    const head = new THREE.Group(); head.position.set(0, 1.2, 0); head.rotation.x = -.25; g.add(head);
    B(head, M.white, [.54, .4, .04], [0, 0, 0]);
    const t = canvasTex(256, 192, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#0f7a5a'); gr.addColorStop(1, '#0a261d'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.fillStyle = '#fff'; c.beginPath(); c.roundRect(30, 30, 150, 70, 16); c.fill(); c.fillStyle = '#0a261d'; c.font = `600 26px ${FONT}`; c.textAlign = 'left'; c.fillText('Cần hỗ trợ?', 46, 74);
      c.fillStyle = '#ffd36b'; c.beginPath(); c.roundRect(60, 120, 140, 42, 21); c.fill(); c.fillStyle = '#0a261d'; c.font = `600 22px ${FONT}`; c.textAlign = 'center'; c.fillText('Chạm để gửi', 130, 149); });
    P(head, screenMat(t.t), [.46, .33], [0, 0, .025]); hot('hotro', g); }

  /* --- don: tủ đông trưng bày bánh (dựng ở stageFreezer) --- */
  stageFreezer();

  /* --- quầy thu ngân + tường sau quầy --- */
  { B(scene, M.woodD, [4.4, 1, 1], [3.5, .5, -13]); const top = B(scene, std(0xf4f1ea, { roughness: .3 }), [4.6, .06, 1.15], [3.5, 1.03, -13]); top.receiveShadow = !LOW;
    B(scene, M.led, [4.4, .04, .04], [3.5, .95, -12.48]);
    B(scene, M.cream, [8, 3.4, .2], [4.5, 1.7, -15.6]); B(scene, M.wood, [8, .05, .3], [4.5, 1.3, -15.4]); B(scene, M.wood, [8, .05, .3], [4.5, 2.0, -15.4]);
    for (let i = 0; i < 9; i++) { C(scene, i % 2 ? M.gold : M.honey, [.16, .22, .16], [1.0 + i * .85, 1.43, -15.4]); }
  }
  /* kpi: máy tính trên bàn thu ngân */
  { const g = new THREE.Group(); g.position.set(2.3, 1.06, -13.2);
    C(g, M.dark, [.2, .02, .2], [0, .01, 0]); B(g, M.dark, [.05, .26, .05], [0, .14, 0]); B(g, M.dark, [.8, .52, .04], [0, .5, 0]);
    const t = canvasTex(256, 160, (c, w, h) => drawKpi(c, w, h, 1, false)); FXO.kpi = t;
    P(g, screenMat(t.t), [.74, .46], [0, .5, .025]); B(g, M.dark, [.5, .02, .16], [0, .01, .38]); hot('kpi', g); }
  /* kc: sổ và ngăn kéo tiền */
  { const g = new THREE.Group(); g.position.set(4.6, 1.06, -13.1);
    B(g, std(0x2a5bd7), [.42, .03, .3], [-.3, .015, .05], [0, .2, 0]); C(g, M.dark, [.015, .2, .015], [-.2, .04, .05], [0, 0, Math.PI / 2]);
    B(g, M.gray, [.5, .1, .4], [.35, .05, -.05]); B(g, M.silver, [.46, .05, .3], [.35, .045, .22]);
    [0, 1, 2].forEach(i => B(g, std(0x4f9a5b), [.16, .03, .08], [.25 + i * .1, .07, .22])); hot('kc', g); }
  /* rt: TV treo tường hiện biểu đồ số chạy */
  { const g = new THREE.Group(); g.position.set(3.6, 2.3, -15.45);
    B(g, M.black, [2.0, 1.15, .06], [0, 0, 0]); LIVE.tv = canvasTex(512, 288, (c, w, h) => drawTV(c, w, h, 0));
    P(g, screenMat(LIVE.tv.t), [1.9, 1.05], [0, 0, .035]); hot('rt', g); }

  /* --- cong: máy chấm công gắn tường + qt: khung nội quy --- */
  { const g = new THREE.Group(); g.position.set(-9.86, 1.6, -17); g.rotation.y = Math.PI / 2;
    B(g, std(0x2b2f33, { metalness: .4 }), [.5, .62, .14], [0, 0, 0]);
    LIVE.clock = canvasTex(256, 192, (c, w, h) => drawClock(c, w, h)); P(g, screenMat(LIVE.clock.t), [.38, .28], [0, .1, .075]);
    C(g, M.ledG, [.1, .02, .1], [0, -.18, .075], [Math.PI / 2, 0, 0]);
    const head = new THREE.Group(); head.position.set(0, .16, 0); g.add(head); FXO.camHead = head;                // V7: camera chụp ảnh nằm trong thân máy, bật lên khi chấm công
    B(head, M.dark, [.22, .13, .09], [0, 0, 0]); B(head, M.dark, [.08, .16, .04], [0, -.14, -.01]); B(head, M.silver, [.24, .015, .1], [0, .07, 0]);
    C(head, M.silver, [.095, .03, .095], [0, 0, .05], [Math.PI / 2, 0, 0]); C(head, M.black, [.07, .035, .07], [0, 0, .052], [Math.PI / 2, 0, 0]);
    C(head, std(0x2b5cff, { roughness: .1, metalness: .8 }), [.04, .036, .04], [0, 0, .054], [Math.PI / 2, 0, 0]);
    const lens = new THREE.Object3D(); lens.position.set(0, 0, .075); head.add(lens); FXO.lens = lens;
    FXO.camLed = C(head, emi(0xff3030, 2), [.016, .016, .016], [.085, .05, .046], [Math.PI / 2, 0, 0]); FXO.camLed.visible = false;
    hot('cong', g); }
  { const g = new THREE.Group(); g.position.set(-9.9, 1.8, -19.3); g.rotation.y = Math.PI / 2;
    B(g, M.woodD, [1.0, 1.3, .05], [0, 0, 0]);
    const t = canvasTex(256, 320, (c, w, h) => { c.fillStyle = '#fbf6e6'; c.fillRect(0, 0, w, h); c.fillStyle = '#b3201f'; c.font = `700 34px ${FONT}`; c.textAlign = 'center'; c.fillText('NỘI QUY', w / 2, 56);
      c.fillStyle = '#6a7b73'; for (let i = 0; i < 8; i++) { c.fillRect(30, 96 + i * 26, 196 - (i % 3) * 30, 8); c.fillRect(20, 96 + i * 26, 6, 8); } });
    P(g, new THREE.MeshBasicMaterial({ map: t.t }), [.88, 1.18], [0, 0, .03]); hot('qt', g); }

  /* --- khu sau: dt bảng trắng, tl bàn thờ Thần Tài, kt kệ kỹ thuật --- */
  { const g = new THREE.Group(); g.position.set(9.88, 1.75, -23); g.rotation.y = -Math.PI / 2;
    B(g, M.silver, [2.7, 1.5, .05], [0, 0, 0]);
    const t = canvasTex(512, 280, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#1e5bd8'; c.font = `700 44px ${FONT}`; c.textAlign = 'left'; c.fillText('ĐÀO TẠO', 24, 62);
      c.fillStyle = '#1f9a4b'; for (let i = 0; i < 3; i++) { c.fillRect(30, 100 + i * 38, 220 - i * 30, 8); c.beginPath(); c.arc(20, 104 + i * 38, 5, 0, 7); c.fill(); }
      c.strokeStyle = '#d33'; c.lineWidth = 4; c.strokeRect(290, 100, 90, 56); c.strokeRect(420, 100, 70, 56); c.beginPath(); c.moveTo(380, 128); c.lineTo(418, 128); c.stroke(); });
    P(g, new THREE.MeshBasicMaterial({ map: t.t }), [2.56, 1.36], [0, 0, .03]); B(g, M.silver, [.9, .04, .08], [0, -.78, .05]);
    { const bk = document.createElement('canvas'); bk.width = t.w; bk.height = t.h; bk.getContext('2d').drawImage(t.c, 0, 0); FXO.board = t; FXO.boardBak = bk;       // V7: bản sao nội dung bảng để lau xong khôi phục
      const wp = new THREE.Group(); wp.visible = false; g.add(wp); FXO.wipe = wp; FXO.wipeHost = g;
      B(wp, std(0x3d7fd0, { roughness: .95 }), [.34, .06, .18], [0, 0, 0]); B(wp, std(0x2a5fa8, { roughness: .95 }), [.34, .02, .19], [0, .035, 0]);
      S(wp, std(0xe0b48c), [.16, .1, .12], [.06, .01, .13]); limb(wp, M.polo, [.08, 0, .17], [.6, -.42, .62], .05, .065); }
    ['#d33', '#1e5bd8', '#1f9a4b'].forEach((c, i) => C(g, std(c), [.03, .12, .03], [-.2 + i * .2, -.74, .08], [0, 0, Math.PI / 2])); hot('dt', g); }
  { const g = new THREE.Group(); g.position.set(-8.7, 0, -24.2); g.rotation.y = Math.PI / 2;
    B(g, std(0x6b1d12, { roughness: .5 }), [1.2, .8, .55], [0, .4, 0]); B(g, M.gold, [1.25, .04, .6], [0, .82, 0]); B(g, M.red, [1.4, 1.5, .06], [0, 1.55, -.3]); B(g, M.gold, [1.3, .04, .08], [0, 2.3, -.28]);
    C(g, M.gold, [.22, .12, .22], [0, .9, 0]); C(g, M.gold, [.24, .3, .2], [0, 1.1, 0]); S(g, std(0xf1c8a0), [.26, .26, .26], [0, 1.34, 0]); B(g, M.red, [.28, .1, .12], [0, 1.5, 0]);
    C(g, M.gold, [.28, .1, .28], [-.4, .9, .1]);
    for (let i = 0; i < 3; i++) { C(g, M.red, [.012, .2, .012], [-.45 + i * .05, 1.05, .1]); (FXO.tips = FXO.tips || []).push(S(g, M.flame, [.03, .03, .03], [-.45 + i * .05, 1.16, .1])); }
    [-.52, .52].forEach(x => { C(g, M.red, [.07, .2, .07], [x, .94, .05]); S(g, M.flame, [.06, .1, .06], [x, 1.08, .05]); });
    C(g, M.gold, [.34, .02, .34], [.3, .86, .12]); [0, 1, 2].forEach(i => S(g, i === 1 ? M.apple : M.orange, [.12, .12, .12], [.22 + i * .09, .94, .12]));
    [0, 1, 2].forEach(i => C(g, M.white, [.06, .05, .06], [-.1 + i * .1, .86, .2])); hot('tl', g); }
  { const g = new THREE.Group(); g.position.set(-5.5, 0, -27.14);
    B(g, M.woodD, [2.4, 1.9, .03], [0, .95, -.24]); [-1.2, 1.2].forEach(x => B(g, M.wood, [.06, 1.9, .5], [x, .95, 0])); [.1, .95, 1.6].forEach(y => B(g, M.wood, [2.4, .04, .5], [0, y, 0]));
    B(g, M.cardboard, [.5, .4, .4], [-.7, .32, 0]); B(g, M.cardboard, [.4, .3, .4], [.1, .27, 0]); B(g, M.cardboard, [.45, .35, .4], [.8, .3, 0]);
    { const fl = (z, dir) => { const pv = new THREE.Group(); pv.position.set(.8, .478, z); g.add(pv); B(pv, M.cardboard, [.45, .012, .2], [0, 0, dir * .1]); return pv; };   // V7: nắp hộp 2 cánh
      FXO.flapF = fl(.2, -1); FXO.flapB = fl(-.2, 1);
      FXO.boxIn = P(g, std(0x1b1209, { roughness: 1 }), [.43, .38], [.8, .4765, 0], [-Math.PI / 2, 0, 0]); FXO.boxIn.visible = false;
      const pk = new THREE.Group(); pk.position.set(.8, .36, 0); g.add(pk); FXO.pkg = pk; pk.visible = false;
      const it = canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#1e5bd8'; c.beginPath(); c.roundRect(6, 6, w - 12, h - 12, 26); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 12; c.lineCap = 'round'; c.lineJoin = 'round';
        c.beginPath(); c.moveTo(64, 28); c.lineTo(64, 78); c.moveTo(40, 58); c.lineTo(64, 82); c.lineTo(88, 58); c.moveTo(36, 100); c.lineTo(92, 100); c.stroke(); });
      const im2 = new THREE.MeshBasicMaterial({ map: it.t, transparent: true, side: THREE.DoubleSide, toneMapped: false }); P(pk, im2, [.24, .24], [0, 0, 0]); }
    B(g, M.dark, [.46, .02, .3], [-.5, .98, .02]);
    const lh = new THREE.Group(); lh.position.set(-.5, .99, -.12); lh.rotation.x = -.35; g.add(lh); B(lh, M.dark, [.46, .3, .015], [0, .15, 0]);
    const t = canvasTex(256, 160, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#1e5bd8'); gr.addColorStop(1, '#0a2a6a'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.fillRect(30, 24, 120, 90); c.fillStyle = '#1e5bd8'; c.fillRect(30, 24, 120, 16); });
    P(lh, screenMat(t.t), [.42, .26], [0, .15, .01]);
    B(g, M.white, [.5, .2, .38], [.55, 1.07, 0]); B(g, M.gray, [.42, .03, .3], [.55, 1.2, 0]); B(g, std(0xfafafa), [.34, .01, .24], [.55, 1.25, .12], [-.4, 0, 0]); hot('kt', g); }

  /* --- kho: tường ngăn có cửa, hai cánh mở ra, xấp tiền đô --- */
  { const D = new THREE.Group(); scene.add(D);
    const wl = B(D, M.cream, [11.2, 3.45, .2], [-4.4, 1.725, -27.4]), wr = B(D, M.cream, [6.2, 3.45, .2], [6.9, 1.725, -27.4]); B(D, M.cream, [2.6, .75, .2], [2.5, 3.075, -27.4]);
    wl.castShadow = wr.castShadow = !LOW;
    B(D, M.dark, [.12, 2.7, .28], [1.14, 1.35, -27.4]); B(D, M.dark, [.12, 2.7, .28], [3.86, 1.35, -27.4]);
    P(D, textMat('KHO', 3, '#9dffc0'), [1.2, .4], [2.5, 2.95, -27.29]);
    const leaf = (px, sx) => { const p = new THREE.Group(); p.position.set(px, 0, -27.4); B(p, M.dark, [1.28, 2.6, .06], [sx * .64, 1.3, 0]); B(p, std(0x2c3136), [1.0, 2.2, .02], [sx * .64, 1.3, .04]); C(p, M.silver, [.04, .3, .04], [sx * 1.1, 1.2, .08]); D.add(p); return p; };
    khoL = leaf(1.2, 1); khoR = leaf(3.8, -1);
    const wallM = std(0x8c9a94, { roughness: .8 });
    B(D, wallM, [.1, 3.45, 6.6], [-1.5, 1.725, -30.7]); B(D, wallM, [.1, 3.45, 6.6], [6.5, 1.725, -30.7]); B(D, wallM, [8.1, 3.45, .1], [2.5, 1.725, -34]);
    B(D, std(0x5d6b65, { roughness: .9 }), [8, .02, 6.6], [2.5, .011, -30.7]); B(D, M.ceil, [8, .05, 6.6], [2.5, 3.45, -30.7]);
    B(D, M.ledG, [.06, .05, 6.4], [-1.4, 3.35, -30.7]); B(D, M.ledG, [.06, .05, 6.4], [6.4, 3.35, -30.7]);
    const bill = canvasTex(128, 64, (c, w, h) => { c.fillStyle = '#5da46a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#2f6b3a'; c.lineWidth = 4; c.strokeRect(3, 3, w - 6, h - 6);
      c.fillStyle = '#7fc08a'; c.beginPath(); c.arc(w / 2, h / 2, 20, 0, 7); c.fill(); c.fillStyle = '#2f6b3a'; c.font = `700 22px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('100', w / 2, h / 2); });
    const billM = std(0xffffff, { map: bill.t, emissive: 0x44aa66, emissiveMap: bill.t, emissiveIntensity: .35, roughness: .6 });
    B(D, M.wood, [3.2, .15, 1.4], [2.5, .075, -32]);
    const items = [];
    [[-1.1, -.4], [-.4, -.4], [.4, -.4], [1.1, -.4], [-1.1, .4], [-.4, .4], [.4, .4], [1.1, .4]].forEach(p => { const n = 5 + Math.floor(rnd() * 5); for (let k = 0; k < n; k++) items.push([2.5 + p[0], .195 + k * .092, -32 + p[1], (rnd() - .5) * .25]); });
    [[-.2, -33.2], [5.4, -33.2], [-.2, -29.6], [5.4, -29.6]].forEach(p => { for (let k = 0; k < 9; k++) items.push([p[0], .045 + k * .092, p[1], (rnd() - .5) * .3]); });
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(.46, .09, .22), billM, items.length);
    items.forEach((it, i) => { dummy.position.set(it[0], it[1], it[2]); dummy.rotation.set(0, it[3], 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
    const g = new THREE.Group(); g.add(im);
    { const SF = new THREE.Group(); SF.position.set(2.5, 0, -33.5); g.add(SF);                                          // V7: tủ tiền (két sắt) sát tường cuối kho
      const sd = std(0x2b3338, { roughness: .45, metalness: .6 });
      B(SF, sd, [1.1, 1.5, .06], [0, .75, -.37]); B(SF, sd, [.1, 1.5, .8], [-.5, .75, 0]); B(SF, sd, [.1, 1.5, .8], [.5, .75, 0]); B(SF, sd, [1.1, .1, .8], [0, 1.45, 0]); B(SF, sd, [1.1, .1, .8], [0, .05, 0]);
      B(SF, M.steel, [.9, .04, .7], [0, .62, 0]); B(SF, M.steel, [.9, .04, .7], [0, 1.02, 0]);
      B(SF, emi(0xffd36b, .55), [.9, 1.3, .02], [0, .75, -.33]);
      B(SF, M.gold, [1.14, .05, .04], [0, 1.5, .42]); B(SF, M.gold, [1.14, .05, .04], [0, 0, .42]); B(SF, M.gold, [.05, 1.5, .04], [-.55, .75, .42]); B(SF, M.gold, [.05, 1.5, .04], [.55, .75, .42]);
      const bn = []; [[.08, 3], [.64, 2], [1.04, 2]].forEach(r => [-.28, 0, .28].forEach(x => { for (let k = 0; k < r[1]; k++) bn.push([x, r[0] + .05 + k * .1 + (k ? 0 : 0), -.05]); }));
      const im2 = new THREE.InstancedMesh(new THREE.BoxGeometry(.25, .1, .2), billM, bn.length);
      bn.forEach((b, i) => { dummy.position.set(b[0], b[1], b[2]); dummy.rotation.set(0, (rnd() - .5) * .2, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); im2.setMatrixAt(i, dummy.matrix); }); SF.add(im2);
      const dr = new THREE.Group(); dr.position.set(-.52, 0, .38); SF.add(dr); FXO.safeDoor = dr;
      B(dr, std(0x1f262a, { roughness: .4, metalness: .6 }), [1.04, 1.42, .08], [.52, .75, .04]); B(dr, M.gold, [.92, 1.3, .02], [.52, .75, .085]); B(dr, std(0x39444a, { roughness: .35, metalness: .7 }), [.84, 1.22, .02], [.52, .75, .097]);
      P(dr, textMat('TỦ TIỀN', 4, '#f4d27a'), [.5, .125], [.52, 1.2, .11]);
      const dl = new THREE.Group(); dl.position.set(.52, .82, .12); dr.add(dl); FXO.safeDial = dl; C(dl, M.gold, [.3, .05, .3], [0, 0, 0], [Math.PI / 2, 0, 0]); C(dl, M.dark, [.2, .06, .2], [0, 0, .005], [Math.PI / 2, 0, 0]);
      [0, 1, 2].forEach(i => { const sp = B(dl, M.gold, [.035, .36, .03], [0, 0, .04]); sp.rotation.z = i * Math.PI / 3; });
      const hd = new THREE.Group(); hd.position.set(.52, .45, .12); dr.add(hd); FXO.safeHandle = hd; B(hd, M.silver, [.4, .05, .05], [0, 0, .03]); C(hd, M.gold, [.1, .06, .1], [0, 0, .02], [Math.PI / 2, 0, 0]); }
    hot('loi', g, [2.5, .7, -32, 3.4, 1.3, 1.5]); }
}


/* ==========================================================================
   SẢN PHẨM 3D + TRANH ĐÈN (ảnh poster đặt trong /assets/sp/*.jpg)
   Thiếu ảnh nào thì tự vẽ poster thay thế, trang vẫn chạy bình thường.
   ========================================================================== */
const PIMG = {};                                       // ảnh poster đã tải: PIMG.ladua, PIMG.cut ...
const POSTERS = {                                       // khóa ảnh → [tên hiển thị, màu chủ đạo]
  truyenthong: ['Ngàn lớp truyền thống', '#f3c614'], ladua: ['Phú sĩ lá dứa', '#7bbf2e'], khoaimon: ['Phú sĩ khoai môn', '#b58ad8'],
  thantre: ['Phô mai than tre', '#3a3a3a'], choco: ['Phú sĩ choco hạnh nhân', '#6b3f26'], nganlop: ['Ngàn lớp lá dứa', '#59b52a'],
  pannacotta: ['Panna cotta vị trái cây', '#e53b4b'], suachua: ['Sữa chua phô mai Đà Lạt', '#f0b429']
};
const FLAV = [['truyenthong', 'Truyền thống', '#f4cf1e', '#4a3300'], ['ladua', 'Lá dứa', '#86c23d', '#10340d'], ['khoaimon', 'Khoai môn', '#b98bd6', '#2b1042'],
  ['thantre', 'Than tre', '#2a2a2c', '#ffffff'], ['choco', 'Choco hạnh nhân', '#5a3321', '#ffffff']];
const rng = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
function imgTex(img) { const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = LOW ? 1 : 4; t.needsUpdate = true; return t; }
async function loadProductImages() {
  const ld = new THREE.ImageLoader(), get = u => new Promise(r => ld.load(u, r, undefined, () => r(null)));
  const keys = Object.keys(POSTERS).concat(['cut']);
  const run = Promise.all(keys.map(k => get('assets/sp/' + k + (k === 'cut' ? '.png' : '.jpg')).then(i => { if (i) PIMG[k] = i; })));
  await Promise.race([run, wait(8000)]);
}
function posterTex(key) {                                // ảnh thật, hoặc poster tự vẽ nếu thiếu file
  if (PIMG[key]) return imgTex(PIMG[key]);
  const [name, col] = POSTERS[key];
  return canvasTex(512, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffd34a'); gr.addColorStop(1, '#f2a900'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = col; g.beginPath(); g.arc(w / 2, h * .62, 150, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(w / 2 - 40, h * .62 - 50, 60, 0, 7); g.fill();
    g.fillStyle = '#1f7a3a'; g.strokeStyle = '#fff'; g.lineWidth = 10; g.textAlign = 'center'; g.font = `800 46px ${FONT}`; g.strokeText('BÁNH SẦU RIÊNG', w / 2, 70); g.fillText('BÁNH SẦU RIÊNG', w / 2, 70);
    g.font = `800 40px ${FONT}`; g.strokeText(name.toUpperCase(), w / 2, 130); g.fillStyle = '#c8102e'; g.fillText(name.toUpperCase(), w / 2, 130);
  }).t;
}

/* ---- bánh sầu riêng: mặt bánh vẽ bằng canvas (vết cắt, dừa sợi, hạnh nhân) ---- */
const CK = {
  truyenthong: { base: '#f5d01c', edge: '#d7aa0c', cut: '#fff2ab', w: 4 },
  ladua:       { base: '#86c23d', edge: '#5d9a28', cut: '#f3d949', w: 6, flake: 1 },
  khoaimon:    { base: '#b98bd6', edge: '#8e5fb0', cut: '#f3d949', w: 6, flake: 1 },
  thantre:     { base: '#242426', edge: '#fff3b0', cut: '#f2d23a', w: 11 },
  choco:       { base: '#4d2c1b', edge: '#2e1810', cut: '#e6cd52', w: 6, almond: 1 }
};
function cakeTex(kind) {
  const c = CK[kind], SZ = LOW ? 256 : 512, R = SZ / 2, k = SZ / 512, rnd = rng(11 + kind.length * 13);
  return canvasTex(SZ, SZ, g => {
    g.fillStyle = c.base; g.fillRect(0, 0, SZ, SZ);
    const rg = g.createRadialGradient(R * .8, R * .7, 10, R, R, R); rg.addColorStop(0, 'rgba(255,255,255,.16)'); rg.addColorStop(1, 'rgba(0,0,0,.10)'); g.fillStyle = rg; g.fillRect(0, 0, SZ, SZ);
    for (let i = 0; i < 2600; i++) { g.fillStyle = rnd() > .5 ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.09)'; g.fillRect(rnd() * SZ, rnd() * SZ, (1 + rnd() * 2) * k, (1 + rnd() * 2) * k); }
    if (kind === 'truyenthong') { g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,255,255,.14)'; for (let r = 18 * k; r < R; r += 15 * k) { g.beginPath(); g.arc(R, R, r, 0, 7); g.stroke(); } }
    g.save(); g.beginPath(); g.arc(R, R, R * .93, 0, 7); g.clip();            // 3 đường cắt chia bánh thành 6 miếng, hở ra phần nhân vàng
    const off = rnd() * .5;
    for (let i = 0; i < 3; i++) { g.save(); g.translate(R, R); g.rotate(off + i * Math.PI / 3); g.beginPath(); g.moveTo(-R, 0); g.lineTo(R, 0);
      g.strokeStyle = c.edge; g.lineWidth = (c.w + 5) * k; g.stroke(); g.strokeStyle = c.cut; g.lineWidth = c.w * k; g.stroke(); g.restore(); }
    g.restore();
    if (c.flake) { g.lineCap = 'round'; for (let i = 0; i < (LOW ? 350 : 800); i++) { const a = rnd() * 6.283, d = Math.sqrt(rnd()) * R * .9, x = R + Math.cos(a) * d, y = R + Math.sin(a) * d, t = rnd() * 6.283, l = (5 + rnd() * 8) * k;
      g.strokeStyle = `rgba(255,255,255,${(.45 + rnd() * .45).toFixed(2)})`; g.lineWidth = (1.4 + rnd()) * k; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(t) * l, y + Math.sin(t) * l); g.stroke(); } }
    if (c.almond) for (let i = 0; i < 85; i++) { const a = rnd() * 6.283, d = Math.sqrt(rnd()) * R * .86, x = R + Math.cos(a) * d, y = R + Math.sin(a) * d;
      g.save(); g.translate(x, y); g.rotate(rnd() * 6.283); g.fillStyle = '#ecd2a4'; g.strokeStyle = '#bf9560'; g.lineWidth = 1.5 * k; g.beginPath(); g.ellipse(0, 0, (14 + rnd() * 10) * k, (8 + rnd() * 5) * k, 0, 0, 7); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-3 * k, -2 * k, 6 * k, 2.5 * k, 0, 0, 7); g.fill(); g.restore(); }
    g.strokeStyle = c.base; g.lineWidth = R * .12; g.beginPath(); g.arc(R, R, R * .98, 0, 7); g.stroke();   // viền ngoài đặc để mặt bên không bị kéo sọc
  }).t;
}
const CK_R = .18, CK_H = .17;
function domeGeo(phi0, phiL) {                                   // vòm bánh tròn dẹt; uv chiếu thẳng từ trên xuống để mặt bánh khớp hình vẽ
  const pts = []; for (let i = 14; i >= 0; i--) { const t = i / 14 * Math.PI / 2; pts.push(new THREE.Vector2(CK_R * Math.sin(t), CK_H * Math.pow(Math.cos(t), .72))); }
  pts.unshift(new THREE.Vector2(CK_R * .97, -.01));
  const geo = new THREE.LatheGeometry(pts, 40, phi0, phiL), p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (2 * CK_R) + .5, .5 - p.getZ(i) / (2 * CK_R));
  return geo;
}
function faceShape(sx, sy) {
  const s = new THREE.Shape(); for (let i = 0; i <= 24; i++) { const t = -Math.PI / 2 + i / 24 * Math.PI, x = CK_R * Math.sin(t) * sx, y = Math.pow(Math.cos(t), .72) * CK_H * sy; i ? s.lineTo(x, y) : s.moveTo(x, y); } return s;
}
let CAKE = null;
function cakeKit() {                                             // dựng 1 lần: hình học + vật liệu dùng chung cho mọi bánh
  if (CAKE) return CAKE;
  const fill = canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#f1d349'; g.fillRect(0, 0, w, h); const rnd = rng(99);
    for (let y = 4; y < h; y += 7) { g.strokeStyle = y % 14 < 7 ? 'rgba(255,244,160,.6)' : 'rgba(205,150,15,.32)'; g.lineWidth = 2.5; g.beginPath(); for (let x = 0; x <= w; x += 8) { const yy = y + Math.sin(x * .09 + y) * 2.2; x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke(); }
    for (let i = 0; i < 380; i++) { g.strokeStyle = 'rgba(176,118,8,.22)'; g.lineWidth = 1; const x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - .5) * 6, y + rnd() * 9); g.stroke(); }
  }).t;
  fill.repeat.set(1 / (2 * CK_R), 1 / CK_H); fill.offset.set(.5, 0);
  const mats = {}; FLAV.forEach(f => { const t = cakeTex(f[0]); mats[f[0]] = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: .2, roughness: f[0] === 'choco' ? .42 : .74 }); });
  CAKE = { whole: domeGeo(0, Math.PI * 2), half: domeGeo(Math.PI / 2, Math.PI), skin: new THREE.ShapeGeometry(faceShape(1, 1), 24), core: new THREE.ShapeGeometry(faceShape(.93, .9), 24), mats,
    skinM: {}, coreM: new THREE.MeshStandardMaterial({ map: fill, emissiveMap: fill, emissive: 0xffffff, emissiveIntensity: .3, roughness: .8 }) };
  FLAV.forEach(f => CAKE.skinM[f[0]] = std(CK[f[0]].base, { roughness: .6 }));
  return CAKE;
}
function cake(kind, half) {
  const K = cakeKit(), g = new THREE.Group();
  g.add(new THREE.Mesh(half ? K.half : K.whole, K.mats[kind]));
  if (half) { const a = new THREE.Mesh(K.skin, K.skinM[kind]); a.position.z = .001; const b = new THREE.Mesh(K.core, K.coreM); b.position.z = .004; g.add(a, b); }   // mặt cắt: vỏ màu + nhân sầu riêng nhiều lớp
  return g;
}

/* ---- tủ đông trưng bày: 5 vị bánh, mỗi vị 6 hộp, hàng trước mở đôi bánh cho thấy nhân ---- */
function stageFreezer() {
  const g = new THREE.Group(); g.position.set(-2.5, 0, -8.5); const rnd = rng(5);
  B(g, std(0xf3f6f7, { roughness: .3, metalness: .15 }), [4.4, .62, 1.5], [0, .39, 0]);
  B(g, M.green, [4.42, .12, 1.52], [0, .14, 0]); B(g, M.honey, [4.42, .035, 1.52], [0, .215, 0]);
  [[-2, -.65], [2, -.65], [-2, .65], [2, .65]].forEach(p => B(g, M.dark, [.12, .08, .12], [p[0], .04, p[1]]));
  B(g, std(0xdff3ee, { roughness: .25, metalness: .1 }), [4.3, .02, 1.46], [0, .71, 0]);                      // đáy tủ sáng bóng
  B(g, M.silver, [4.5, .05, .06], [0, .72, .78]); B(g, M.silver, [4.5, .05, .06], [0, .72, -.78]); B(g, M.silver, [.06, .05, 1.6], [-2.22, .72, 0]); B(g, M.silver, [.06, .05, 1.6], [2.22, .72, 0]);
  B(g, M.led, [4.2, .03, .03], [0, .74, .8]);
  P(g, textMat('BÁNH SẦU RIÊNG 9 SẠCH', 4 / .3, '#1f7a3a'), [3.2, .22], [0, .595, .762]);
  FLAV.forEach((f, i) => {                                                                                    // nhãn vị bánh dưới mỗi cụm
    const t = canvasTex(512, 128, (c, w, h) => { c.fillStyle = f[2]; c.beginPath(); c.roundRect(4, 4, w - 8, h - 8, 28); c.fill(); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 5; c.stroke();
      c.fillStyle = f[3]; c.font = `700 56px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(f[1], w / 2, h / 2 + 3); });
    P(g, new THREE.MeshBasicMaterial({ map: t.t, transparent: true }), [.74, .185], [-1.6 + i * .8, .385, .763]);
  });
  const tray = new THREE.InstancedMesh(new THREE.CylinderGeometry(.2, .17, .05, 28), std(0xf7f7f4, { roughness: .35 }), 30), d = new THREE.Object3D(); let ti = 0;
  for (let r = 0; r < 3; r++) for (let k = 0; k < 10; k++) {
    const x = -1.8 + k * .4, z = -.46 + r * .46, f = FLAV[Math.floor(k / 2)][0];
    d.position.set(x, .745, z); d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); d.updateMatrix(); tray.setMatrixAt(ti++, d.matrix);
    const c = cake(f, r === 2 && k % 2 === 0); c.position.set(x, .758, z); c.rotation.y = r === 2 && k % 2 === 0 ? (rnd() - .5) * .5 : rnd() * 6.283; g.add(c);
  }
  g.add(tray);
  const lid = new THREE.Group(); lid.position.set(0, .72, -.8); g.add(lid); FXO.lid = lid;                       // nắp kính có bản lề phía sau (V7: mở được)
  B(lid, M.glass, [4.5, .42, 1.6], [0, .21, .8]);                                                              // nắp kính
  B(lid, M.silver, [4.5, .025, .035], [0, .42, 1.6]); B(lid, M.silver, [4.5, .025, .035], [0, .42, 0]);
  const sh = canvasTex(256, 32, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, 0); [[.28, 0], [.36, .6], [.44, 0], [.6, 0], [.66, .32], [.72, 0]].forEach(s => gr.addColorStop(s[0], `rgba(255,255,255,${s[1]})`)); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  P(lid, new THREE.MeshBasicMaterial({ map: sh.t, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), [4.4, 1.5], [0, .425, .8], [-Math.PI / 2, 0, 0]);   // vệt phản chiếu trên kính
  hot('don', g, [-2.5, .72, -8.5, 4.6, 1.2, 1.7]);
}

/* ---- tranh đèn (hộp đèn LED) + biển đèn treo + giá ly panna cotta / sữa chua ---- */
let GLOWM = null;
function lightbox(map, w, h, center) {
  const g = new THREE.Group(), d = .12, fr = .07, z0 = center ? 0 : d / 2, zf = center ? d / 2 : d;
  B(g, M.dark, [w + fr * 2, h + fr * 2, d], [0, 0, z0]);
  const mat = new THREE.MeshBasicMaterial({ map, toneMapped: false }); if (composer) mat.color.setScalar(1.1);   // bù phần ACES làm tối ảnh
  P(g, mat, [w, h], [0, 0, zf + .003]); if (center) P(g, mat, [w, h], [0, 0, -zf - .003], [0, Math.PI, 0]);
  const bar = (sx, sy, x, y) => { B(g, M.silver, [sx, sy, .03], [x, y, zf + .012]); if (center) B(g, M.silver, [sx, sy, .03], [x, y, -zf - .012]); };
  bar(w + fr * 2, fr * .6, 0, (h + fr) / 2); bar(w + fr * 2, fr * .6, 0, -(h + fr) / 2); bar(fr * .6, h, (w + fr) / 2, 0); bar(fr * .6, h, -(w + fr) / 2, 0);
  const led = (sx, sy, x, y) => B(g, M.led, [sx, sy, .02], [x, y, zf + .006]);
  led(w, .018, 0, h / 2 + .004); led(w, .018, 0, -h / 2 - .004);
  return g;
}
function stageDecor() {
  const D = new THREE.Group(); scene.add(D);
  if (!GLOWM) { const gt = canvasTex(64, 64, (c, w, h) => { const gr = c.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(255,214,130,1)'); gr.addColorStop(1, 'rgba(255,214,130,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
    GLOWM = new THREE.MeshBasicMaterial({ map: gt.t, transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }); }
  const wall = (key, z, side) => {                                  // tranh đèn dán tường: trái x=-10, phải x=+10
    const lb = lightbox(posterTex(key), 1.7, 1.7); lb.position.set(side * 9.92, 2.05, z); lb.rotation.y = -side * Math.PI / 2; D.add(lb);
    P(lb, GLOWM, [3.7, 3.3], [0, 0, .005]);
  };
  [['truyenthong', -4.5], ['ladua', -7.5], ['khoaimon', -10.5], ['thantre', -13.5]].forEach(a => wall(a[0], a[1], -1));
  [['nganlop', -4.5], ['choco', -7.5], ['pannacotta', -10.5], ['suachua', -13.5]].forEach(a => wall(a[0], a[1], 1));

  // biển đèn 2 mặt treo trên tủ đông
  const ht = canvasTex(1024, 672, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#ffd84d'); gr.addColorStop(1, '#f2a300'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(w * .74, h * .52, h * .44, 0, 7); g.fill();
    g.textAlign = 'left'; g.lineJoin = 'round'; g.strokeStyle = '#fff'; g.lineWidth = 14; g.fillStyle = '#1f7a3a'; g.font = `800 62px ${FONT}`; g.strokeText('Bánh Sầu Riêng', 48, 130); g.fillText('Bánh Sầu Riêng', 48, 130);
    g.font = `800 130px ${FONT}`; g.lineWidth = 20; g.strokeText('9 Sạch', 48, 290); g.fillStyle = '#c8102e'; g.fillText('9 Sạch', 48, 290);
    g.fillStyle = '#1f5f33'; g.font = `600 36px ${FONT}`; g.fillText('Ngàn lớp · Phú sĩ', 52, 372);
    g.fillStyle = '#fff'; g.beginPath(); g.roundRect(48, 430, 430, 84, 42); g.fill(); g.fillStyle = '#1f7a3a'; g.font = `700 29px ${FONT}`; g.textAlign = 'center'; g.fillText('Sạch Là Chính – Ngon Là Mười', 263, 482);
    if (PIMG.cut) { const s = Math.min(480 / PIMG.cut.width, 480 / PIMG.cut.height), iw = PIMG.cut.width * s, ih = PIMG.cut.height * s; g.drawImage(PIMG.cut, w * .74 - iw / 2, h * .54 - ih / 2, iw, ih); }
    else [['#86c23d', -90], ['#b98bd6', 0], ['#f5d01c', 90]].forEach(c => { g.fillStyle = c[0]; g.beginPath(); g.arc(w * .72 + c[1], h * .5 + Math.abs(c[1]) * .25, 78, 0, 7); g.fill(); });
  });
  ht.t.anisotropy = 4;
  const hero = lightbox(ht.t, 1.5, .98, true); hero.position.set(-2.5, 2.05, -8.5); D.add(hero);
  [-.6, .6].forEach(x => C(D, M.silver, [.012, 3.45 - 2.05 - .56, .012], [-2.5 + x, (3.45 + 2.05 + .56) / 2, -8.5]));

  // giá ly panna cotta + sữa chua trên quầy thu ngân, có 2 bảng ảnh sản phẩm đứng phía sau
  const st = new THREE.Group(); st.position.set(3.55, 1.06, -13); st.scale.setScalar(1.35); D.add(st);
  const acr = std(0xf4fbff, { roughness: .15, metalness: .1 });
  B(st, acr, [.95, .05, .3], [0, .025, .2]); B(st, acr, [.95, .13, .3], [0, .065, -.1]);
  const cupG = new THREE.CylinderGeometry(.06, .045, .085, 18), topG = new THREE.CylinderGeometry(.052, .052, .01, 18);
  const cm = std(0xffffff, { roughness: .35 }), ymm = std(0xf4ecd0, { roughness: .4 });
  const pm = [std(0xd6263f, { roughness: .25, emissive: 0x551018, emissiveIntensity: .5 }), std(0xf6b81a, { roughness: .25, emissive: 0x6a4300, emissiveIntensity: .5 })];
  for (let i = 0; i < 5; i++) {
    const x = -.34 + i * .17;
    const a = new THREE.Mesh(cupG, cm); a.position.set(x, .13 + .0425 + .008, -.1); st.add(a); const at = new THREE.Mesh(topG, ymm); at.position.set(x, .13 + .085 + .01, -.1); st.add(at);       // sữa chua
    const b = new THREE.Mesh(cupG, cm); b.position.set(x, .05 + .0425, .2); st.add(b); const bt = new THREE.Mesh(topG, pm[i % 2]); bt.position.set(x, .05 + .085 + .005, .2); st.add(bt);          // panna cotta
  }
  [['suachua', -.25], ['pannacotta', .25]].forEach(a => { const m = new THREE.MeshBasicMaterial({ map: posterTex(a[0]), toneMapped: false }); if (composer) m.color.setScalar(1.1);
    const bd = B(st, M.dark, [.44, .44, .02], [a[1], .4, -.32], [-.1, 0, 0]); P(bd, m, [.9, .9], [0, 0, .55]); });
  P(st, textMat('Panna cotta · Sữa chua', 5, '#1f7a3a'), [.7, .14], [0, .125, .36], [-.9, 0, 0]);
}

/* ---------- nội dung các màn hình động ---------- */
function drawTV(g, w, h, t) {
  g.fillStyle = '#08111f'; g.fillRect(0, 0, w, h); const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#0e3b2b'); gr.addColorStop(1, '#08111f'); g.fillStyle = gr; g.fillRect(0, 0, w, 54);
  g.fillStyle = '#e9d8a6'; g.font = `600 26px ${FONT}`; g.textAlign = 'left'; g.fillText('REALTIME · 9 SẠCH', 18, 36); g.fillStyle = '#3fe08a'; g.beginPath(); g.arc(w - 30, 27, 7, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.font = `700 54px ${FONT}`; g.fillText(Math.floor(48000000 + (t * 7300) % 900000).toLocaleString('vi-VN'), 18, 118);
  g.fillStyle = '#9fb5aa'; g.font = `400 18px ${FONT}`; g.fillText('Doanh thu hôm nay (đ)', 18, 146);
  g.strokeStyle = '#ffd36b'; g.lineWidth = 3; g.beginPath(); for (let i = 0; i <= 40; i++) { const x = 18 + i * (w - 36) / 40, y = 230 - 26 * Math.sin(i * .35 + t * 1.5) - i * 1.2; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  for (let i = 0; i < 12; i++) { const bh = 14 + 22 * (1 + Math.sin(i + t * 2)); g.fillStyle = 'rgba(63,224,138,.65)'; g.fillRect(18 + i * 40, h - 8 - bh, 26, bh); }
}
function drawClock(g, w, h) {
  const n = new Date(), p = x => String(x).padStart(2, '0'); g.fillStyle = '#04181a'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#7fe8c4'; g.font = `700 54px ${FONT}`; g.textAlign = 'center'; g.fillText(`${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`, w / 2, 90);
  g.fillStyle = '#9fb5aa'; g.font = `500 20px ${FONT}`; g.fillText(`${p(n.getDate())}/${p(n.getMonth() + 1)}/${n.getFullYear()}`, w / 2, 124); g.fillStyle = '#ffd36b'; g.fillText('CHẤM CÔNG', w / 2, 164);
  if (LIVE.shot) { g.fillStyle = 'rgba(4,24,26,.82)'; g.fillRect(0, 0, w, h); g.fillStyle = '#3fe08a'; g.font = `800 46px ${FONT}`; g.fillText('✓', w / 2, 80); g.font = `700 24px ${FONT}`; g.fillText('ĐÃ GHI NHẬN', w / 2, 128); g.fillStyle = '#9fb5aa'; g.font = `500 18px ${FONT}`; g.fillText(`${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`, w / 2, 160); }
}

/* ============================ CHẤM SÁNG, HUD, TƯƠNG TÁC ============================ */
function buildDots() {
  const host = $('dots'); host.innerHTML = '';
  N.mods().forEach(m => {
    if (!HOT[m.id]) return;
    const el = document.createElement('button'); el.type = 'button'; el.className = 'dot'; el.hidden = true;
    el.innerHTML = '<i class="dp"></i><span class="dcard"><b></b><small></small><em></em></span>';
    const d = { m, el, show: null, nl: null, txt: '' }; dots.push(d); host.appendChild(el);
    el.addEventListener('mouseenter', () => { if (!lastTouch) active = m.id; });
    el.addEventListener('mouseleave', () => { if (!lastTouch && active === m.id) active = null; });
    el.addEventListener('focus', () => { active = m.id; });
    el.addEventListener('blur', () => { if (active === m.id) active = null; });
    el.addEventListener('pointerdown', e => { lastTouch = e.pointerType === 'touch'; });
    el.addEventListener('click', () => {
      if (N.edit()) return;
      if (lastTouch && active !== m.id) { active = m.id; return; }      // chạm lần 1: hiện thẻ, chạm lần 2: mở
      openMod(m.id);
    });
  });
}
const winAlpha = (p, w) => sm((p - w[0]) / .03) * sm((w[1] - p) / .03);
const tmpV = new THREE.Vector3(), ray = new THREE.Raycaster(), ptr = new THREE.Vector2();

function pickMid(cx, cy) {
  const r = canvas.getBoundingClientRect(); ptr.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); ray.setFromCamera(ptr, camera);
  const cand = HOTS.filter(h => winAlpha(sp, HOT[h.mid].win) > .3).map(h => h.group); const hit = ray.intersectObjects(cand, true)[0]; if (!hit) return null;
  let o = hit.object; while (o && !o.userData.mid) o = o.parent; return o ? o.userData.mid : null;
}
function updateDots(now) {
  camera.updateMatrixWorld();
  dots.forEach(d => {
    const m = d.m, hz = HOT[m.id], show = N.vis(m);
    if (d.show !== show) { d.show = show; d.el.hidden = !show; } if (!show) return;
    const nl = !N.url(m); if (d.nl !== nl) { d.nl = nl; d.el.classList.toggle('nl', nl); }
    tmpV.set(hz.at[0], hz.at[1], hz.at[2]).applyMatrix4(camera.matrixWorldInverse); const front = tmpV.z < -.3;
    tmpV.set(hz.at[0], hz.at[1], hz.at[2]).project(camera);
    let a = !fx && front && Math.abs(tmpV.x) < 1.05 && Math.abs(tmpV.y) < 1.05 ? winAlpha(sp, hz.win) : 0;
    const x = (tmpV.x * .5 + .5) * W, y = (-tmpV.y * .5 + .5) * H;
    const ok = a.toFixed(2), pe = a > .3 ? 'auto' : 'none';
    if (d.ok !== ok) { d.ok = ok; d.el.style.opacity = ok; } if (d.pe !== pe) { d.pe = pe; d.el.style.pointerEvents = pe; }
    if (a > .004) { const tf = `translate3d(${(x - 22).toFixed(1)}px,${(y - 22).toFixed(1)}px,0)`; if (d.tf !== tf) { d.tf = tf; d.el.style.transform = tf; } }
    const on = a > .3 && (active === m.id || hover === m.id); d.el.classList.toggle('on', on);
    if (on) {
      const tx = m.t + '|' + m.d + '|' + nl; if (d.txt !== tx) { d.txt = tx; const q = d.el.querySelector('.dcard'); q.children[0].textContent = m.t; q.children[1].textContent = m.d; q.children[2].textContent = nl ? 'Chưa có link (chỉ quản trị viên thấy)' : 'Bấm để mở'; }
      d.el.classList.toggle('cl', x < 130); d.el.classList.toggle('cr', x > W - 130); d.el.classList.toggle('cb', y < 150);
    }
  });
  const mods = N.mods();
  HOTS.forEach(h => {
    const m = mods.find(x => x.id === h.mid), nl = N.admin() && m && !N.url(m), inw = winAlpha(sp, HOT[h.mid].win) > .3;
    h.outline.visible = inw && (hover === h.mid || nl); h.outline.material.color.setHex(nl && hover !== h.mid ? 0xe0a526 : 0xffe08a);
  });
}
let hudLast = '', HUD = null;
function updateHud() {
  if (!HUD) HUD = { els: [...document.querySelectorAll('#hud .scn')].map(el => ({ el, k: '' })), ec: $('endc'), wh: $('whint'), num: $('wnum'), bar: $('wbar'), ek: '', wk: '' };
  const end = sm((sp - .955) / .035), edit = N.edit();
  HUD.els.forEach((h, i) => {
    const s = SCENES[i]; if (!s) return; const w = s[1] - s[0]; let a = sm((sp - s[0]) / (w * .22)) * sm((s[1] - sp) / (w * .22)); if (i === 0) a = sm((s[1] - sp) / (w * .22)); if (i === 6) a *= (1 - end);
    if (edit) a = sp >= s[0] && sp < s[1] ? 1 : 0;
    const k = a.toFixed(2); if (k === h.k) return; h.k = k;
    h.el.style.opacity = k; h.el.style.visibility = a < .01 ? 'hidden' : 'visible'; h.el.style.transform = `translateY(${((1 - a) * 16).toFixed(1)}px)`;
  });
  const ek = end.toFixed(2); if (ek !== HUD.ek) { HUD.ek = ek; HUD.ec.style.opacity = ek; HUD.ec.style.visibility = end < .01 ? 'hidden' : 'visible'; }
  const wk = (1 - clamp(sp / .03)).toFixed(2); if (wk !== HUD.wk) { HUD.wk = wk; HUD.wh.style.opacity = wk; }
  let idx = SCENES.findIndex(s => sp >= s[0] && sp < s[1]); if (idx < 0) idx = 6;
  const key = idx + '|' + Math.round(sp * 200); if (key !== hudLast) { hudLast = key; HUD.num.textContent = '0' + (idx + 1) + ' / 07'; HUD.bar.style.height = (sp * 100).toFixed(1) + '%'; }
}

/* ==========================================================================
   V7: HIỆU ỨNG KHI MỞ TRANG LIÊN KẾT (bấm chấm sáng / bấm vật thể / tìm kiếm → camera bay tới → vật thể "diễn" → mở trang)
   don  Tạo đơn khách sỉ : camera lại gần tủ đông, nắp kính mở lên, khói lạnh tỏa ra
   kpi  Vận hành         : camera quay vào quầy, màn hình máy tính làm mới, cột số liệu mọc lên
   cong Chấm công        : camera lại gần máy, camera chụp ảnh bật lên, đèn đỏ nháy, lóe sáng chụp, màn hình báo "ĐÃ GHI NHẬN"
   tl   Góc tâm linh     : que diêm châm lần lượt 3 nén nhang, khói bay lên
   kt   Cài app, kỹ thuật: camera lại gần kệ, hộp carton mở nắp, biểu tượng tải về nổi lên
   dt   Đào tạo          : tay cầm giẻ lau bảng trắng từng hàng cho sạch chữ
   loi  Lợi nhuận        : camera tới tủ tiền, núm xoay, tay nắm, cửa tủ mở, tiền sáng lấp lánh
   Chỉnh nhanh: mỗi mục trong FXD có dur (giây, tổng thời lượng), P (vị trí camera khi lại gần), L (điểm camera nhìn), inT (giây bay vào).
   Tắt hiệu ứng 1 mục: xóa mục đó khỏi FXD. Tắt hết: đặt FX_ON = false. Người dùng bật "giảm chuyển động" của hệ điều hành => tự bỏ hiệu ứng.
   Quy ước: mỗi hiệu ứng có update(t, dt) (t = giây từ lúc bắt đầu) và reset() (trả vật thể về trạng thái nghỉ).
   Vật thể động phải gọi updateMatrixWorld thủ công (mw) vì scene.matrixWorldAutoUpdate = false. ========================================================================== */
const FX_ON = true;
const rg = (t, a, b) => clamp((t - a) / (b - a));
const mw = o => o.updateMatrixWorld(true);
const PUF = { pool: [], all: [], tex: null, flash: null, glow: null, dom: null, acc: {} };
const _v = new THREE.Vector3();
function fxInit() {                                                           // dựng 1 lần lúc khởi tạo: hạt khói/bụi (sprite mờ) + quầng sáng + lớp lóe DOM
  if (PUF.pool.length) return;
  PUF.tex = canvasTex(64, 64, (g, w, h) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.45, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); }).t;
  for (let i = 0; i < 28; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: PUF.tex, transparent: true, depthWrite: false, opacity: 0, fog: false })); s.renderOrder = 6; scene.add(s);
    PUF.pool.push({ s, life: 0, max: 1, v: new THREE.Vector3(), s0: .1, s1: .2, a: .5 }); PUF.all.push(s);
  }
  const mk = c => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: PUF.tex, color: c, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false })); s.renderOrder = 7; scene.add(s); PUF.all.push(s); return s; };
  PUF.flash = mk(0xffffff); PUF.glow = mk(0xffa040);
  const d = document.createElement('div'); d.id = 'afx'; d.style.cssText = 'position:fixed;inset:0;background:#fff;opacity:0;visibility:hidden;pointer-events:none;z-index:44'; document.body.appendChild(d); PUF.dom = d;
  PUF.all.forEach(s => s.visible = true);                                     // hiện tạm để renderer.compile biên dịch trước, tránh khựng lần đầu
}
function fxWarmDone() { PUF.all.forEach(s => s.visible = false); }
function puff(x, y, z, vx, vy, vz, life, s0, s1, a, color) {
  const p = PUF.pool.find(q => q.life <= 0); if (!p) return;
  p.life = p.max = life; p.v.set(vx, vy, vz); p.s0 = s0; p.s1 = s1; p.a = a; p.s.material.color.setHex(color); p.s.position.set(x, y, z); p.s.scale.set(s0, s0, 1); p.s.material.opacity = 0; p.s.visible = true;
}
function puffStep(dt) {
  for (const p of PUF.pool) {
    if (p.life <= 0) continue; p.life -= dt; const s = p.s;
    if (p.life <= 0) { s.visible = false; s.material.opacity = 0; continue; }
    const k = 1 - p.life / p.max, z = p.s0 + (p.s1 - p.s0) * k; s.position.addScaledVector(p.v, dt); s.scale.set(z, z, 1); s.material.opacity = p.a * Math.min(k / .15, 1) * (1 - k); s.updateMatrixWorld();
  }
}
function emit(key, rate, dt, fn) { const a = (PUF.acc[key] = (PUF.acc[key] || 0) + rate * dt); const n = Math.floor(a); PUF.acc[key] = a - n; for (let i = 0; i < n; i++) fn(); }
function glowSpr(sp, pos, size, op) { sp.visible = op > .01; if (!sp.visible) return; sp.position.copy(pos); sp.scale.set(size, size, 1); sp.material.opacity = op; sp.updateMatrixWorld(); }
const R = (a, b) => a + Math.random() * (b - a);
function drawKpi(c, w, h, k, show) {
  c.fillStyle = '#0a261d'; c.fillRect(0, 0, w, h); c.fillStyle = '#e9d8a6'; c.font = `600 18px ${FONT}`; c.textAlign = 'left'; c.fillText('KPI vận hành', 12, 26);
  [.5, .8, .6, .95, .7, .85].forEach((v, i) => { const hh = v * 90 * clamp(k * 1.5 - i * .1); c.fillStyle = i % 2 ? '#ffd36b' : '#3fe08a'; c.fillRect(16 + i * 38, 140 - hh, 26, hh); });
  if (show) { c.fillStyle = '#3fe08a'; c.font = `700 18px ${FONT}`; c.textAlign = 'right'; c.fillText('▲ ' + (k * 12.4).toFixed(1) + '%', w - 12, 26); }
}
const kf = (t, ks) => { let i = 0; while (i < ks.length - 2 && t > ks[i + 1][0]) i++; const a = ks[i], b = ks[i + 1], u = clamp((t - a[0]) / (b[0] - a[0])); return _v.set(a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u, a[3] + (b[3] - a[3]) * u); };
const FXD = {
  /* --- Tạo đơn khách sỉ: mở nắp tủ đông kính --- */
  don: { dur: 2.5, p: [-1.3, 1.7, -6.5], l: [-2.5, .75, -8.5], inT: .7,
    update(t, dt) {
      FXO.lid.rotation.x = -1.25 * sm(rg(t, .6, 1.5)); mw(FXO.lid);
      if (t > .85 && t < 2.3) emit('mist', 34, dt, () => puff(-2.5 + R(-2, 2), .78, -8.5 + R(-.6, .6), R(-.04, .04), R(.2, .32), R(.1, .26), 1.5, .5, 1.2, .3, 0xdff3ff));
    },
    reset() { FXO.lid.rotation.x = 0; mw(FXO.lid); } },
  /* --- Vận hành (KPI): quay vào quầy, màn hình máy tính làm mới --- */
  kpi: { dur: 2.4, p: [2.2, 1.58, -11.5], l: [2.3, 1.56, -13.2], inT: .8,
    update(t) {
      const k = t < .55 ? 1 : t < .85 ? 1 - sm(rg(t, .55, .85)) : sm(rg(t, .85, 2.0)), key = k.toFixed(2);
      if (key !== FXO.kpiK) { FXO.kpiK = key; drawKpi(FXO.kpi.g, 256, 160, k, t > .55); FXO.kpi.t.needsUpdate = true; }
    },
    reset() { FXO.kpiK = ''; drawKpi(FXO.kpi.g, 256, 160, 1, false); FXO.kpi.t.needsUpdate = true; } },
  /* --- Chấm công: camera bật lên, lóe chụp ảnh --- */
  cong: { dur: 2.7, p: [-7.3, 1.62, -16.1], l: [-9.86, 1.78, -17], inT: .8,
    update(t) {
      FXO.camHead.position.y = .16 + .22 * sm(rg(t, .8, 1.4)); mw(FXO.camHead);
      FXO.camLed.visible = t > 1.35 && t < 1.95 && Math.floor((t - 1.35) * 9) % 2 === 0; mw(FXO.camLed);
      const f = t >= 1.95 ? Math.exp(-(t - 1.95) * 8) : 0;
      PUF.dom.style.visibility = f > .01 ? 'visible' : 'hidden'; PUF.dom.style.opacity = (.85 * f).toFixed(3);
      FXO.lens.getWorldPosition(_v); glowSpr(PUF.flash, _v, .15 + f * 1.0, f);
      const shot = t > 2.05; if (shot !== !!LIVE.shot) { LIVE.shot = shot; drawClock(LIVE.clock.g, 256, 192); LIVE.clock.t.needsUpdate = true; }
    },
    reset() { FXO.camHead.position.y = .16; mw(FXO.camHead); FXO.camLed.visible = false; PUF.dom.style.visibility = 'hidden'; PUF.dom.style.opacity = 0; PUF.flash.visible = false; LIVE.shot = false; drawClock(LIVE.clock.g, 256, 192); LIVE.clock.t.needsUpdate = true; } },
  /* --- Góc tâm linh: đốt nhang --- */
  tl: { dur: 2.8, p: [-6.5, 1.45, -23.2], l: [-8.65, 1.15, -24.0], inT: .8, T: [.9, 1.3, 1.7],
    start() { FXO.tipW = FXO.tips.map(m => m.getWorldPosition(new THREE.Vector3())); },
    update(t, dt) {
      const W = FXO.tipW, T = this.T; let boost = 0;
      FXO.tips.forEach((m, i) => {
        const s = t < T[i] ? 1 - .88 * sm(rg(t, 0, .3)) : 1 + 1.6 * Math.exp(-(t - T[i]) * 5); m.scale.setScalar(.03 * s); mw(m);
        if (t >= T[i]) { boost += 1.2 * Math.exp(-(t - T[i]) * 4); emit('sm' + i, 7, dt, () => puff(W[i].x + R(-.01, .01), W[i].y + .03, W[i].z + R(-.01, .01), R(.01, .05), R(.1, .18), R(-.01, .01), 2.2, .03, .24, .22, 0xd4d4d4)); }
      });
      FXO.boost = boost;
      const w0 = W[0], w1 = W[1], w2 = W[2], op = t > .35 && t < 2.1 ? .95 * sm(rg(t, .35, .55)) * (1 - sm(rg(t, 1.9, 2.1))) : 0;
      kf(t, [[.35, w0.x + .35, w0.y + .1, w0.z], [T[0], w0.x, w0.y, w0.z], [T[1], w1.x, w1.y, w1.z], [T[2], w2.x, w2.y, w2.z], [2.1, w2.x + .35, w2.y + .12, w2.z]]);
      glowSpr(PUF.glow, _v, .1 + Math.sin(t * 40) * .015, op);
    },
    reset() { FXO.tips.forEach(m => { m.scale.setScalar(.03); mw(m); }); FXO.boost = 0; PUF.glow.visible = false; } },
  /* --- Cài app, hỗ trợ kỹ thuật: mở hộp carton --- */
  kt: { dur: 2.7, p: [-4.15, 1.2, -25.0], l: [-4.7, .5, -27.1], inT: .8,
    update(t, dt) {
      const o = sm(rg(t, .85, 1.55)); FXO.flapF.rotation.x = 2.2 * o; FXO.flapB.rotation.x = -2.2 * o; FXO.boxIn.visible = o > .04; mw(FXO.flapF); mw(FXO.flapB); mw(FXO.boxIn);
      const r = sm(rg(t, 1.35, 2.2)); FXO.pkg.visible = r > .01; FXO.pkg.position.y = .36 + r * .42; FXO.pkg.scale.setScalar(.6 + .4 * r); FXO.pkg.rotation.y = Math.sin(t * 3) * .35 * r; mw(FXO.pkg);
      if (t > .85 && t < 1.6) emit('dust', 22, dt, () => puff(-4.7 + R(-.18, .18), .52, -27.14 + R(-.15, .15), R(-.05, .05), R(.1, .2), R(0, .08), 1.1, .08, .3, .3, 0xe8d9bd));
    },
    reset() { FXO.flapF.rotation.x = 0; FXO.flapB.rotation.x = 0; FXO.boxIn.visible = false; FXO.pkg.visible = false; FXO.pkg.position.y = .36; [FXO.flapF, FXO.flapB, FXO.pkg].forEach(mw); } },
  /* --- Đào tạo: cầm giẻ lau bảng trắng --- */
  dt: { dur: 2.8, p: [6.8, 1.7, -22.4], l: [9.9, 1.75, -23], inT: .8, ROWS: [.51, .17, -.17, -.51],
    update(t, dt) {
      const wp = FXO.wipe, inn = sm(rg(t, .25, .7)), out = sm(rg(t, 2.35, 2.8)), w = rg(t, .7, 2.2), s = w * 4, row = Math.min(3, Math.floor(s)), f = s - row, Y = this.ROWS;
      const x = (row % 2 === 0 ? -1 + 2 * f : 1 - 2 * f) * 1.1, y = Y[row] + (f > .88 && row < 3 ? (Y[row + 1] - Y[row]) * sm((f - .88) / .12) : 0);
      wp.visible = t > .25 && out < 1; wp.position.set(x - (1 - inn) * .9 - out * .9, y + (1 - inn) * .25, .11); wp.scale.setScalar(.4 + .6 * inn); wp.rotation.z = Math.sin(t * 14) * .08; mw(wp);
      if (w > 0 && w < 1.001 && wp.visible) {
        const c = FXO.board.g, px = (x / 2.56 + .5) * FXO.board.w, py = (.5 - y / 1.36) * FXO.board.h; c.fillStyle = '#fff'; c.fillRect(px - 40, py - 44, 80, 88); FXO.board.t.needsUpdate = true;
        emit('ink', 26, dt, () => { wp.getWorldPosition(_v); puff(_v.x, _v.y, _v.z, R(-.03, .03), R(-.04, .02), R(-.03, .03), .9, .1, .3, .35, 0x9bb7e8); });
      }
    },
    reset() { const b = FXO.board; b.g.clearRect(0, 0, b.w, b.h); b.g.drawImage(FXO.boardBak, 0, 0); b.t.needsUpdate = true; FXO.wipe.visible = false; } },
  /* --- Lợi nhuận: mở tủ tiền --- */
  loi: { dur: 3.0, p: [2.5, 1.4, -30.9], l: [2.5, .85, -33.4], inT: .8,
    update(t, dt) {
      FXO.safeDial.rotation.z = -Math.PI * 3 * sm(rg(t, .7, 1.7)); FXO.safeHandle.rotation.z = -.9 * sm(rg(t, 1.7, 1.95)); FXO.safeDoor.rotation.y = -1.95 * sm(rg(t, 1.95, 2.8)); mw(FXO.safeDoor);
      if (t > 2.2) emit('spk', 30, dt, () => puff(2.5 + R(-.35, .35), R(.3, 1.2), -33.35, R(-.05, .05), R(.12, .22), R(.05, .2), 1.2, .06, .18, .7, 0xffe08a));
    },
    reset() { FXO.safeDial.rotation.z = 0; FXO.safeHandle.rotation.z = 0; FXO.safeDoor.rotation.y = 0; mw(FXO.safeDoor); } }
};
Object.values(FXD).forEach(d => { d.P = new THREE.Vector3(...d.p); d.L = new THREE.Vector3(...d.l); });
function canFx(id) {
  if (!FX_ON || !FXD[id] || !API.ready || !PUF.pool.length || N.edit()) return false;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  const m = N.mods().find(x => x.id === id); return !!(m && N.url(m));
}
function openMod(id) { if (fx) return; if (canFx(id)) API.flyTo(id, () => N.go(id)); else N.go(id); }   // bấm chấm sáng / vật thể: có hiệu ứng thì bay tới + diễn rồi mới mở trang
function startFx(id, cb, now) {
  const d = FXD[id]; fx = { id, def: d, t0: now, cb, called: false, prevOv: scroller.style.overflowY }; scroller.style.overflowY = 'hidden'; active = null; hover = null; PUF.acc = {};
  if (d.start) d.start();
}
function fxStep(now, dt) {                                                     // gọi mỗi khung khi có hiệu ứng; trả về trọng số camera 0..1
  const d = fx.def, t = (now - fx.t0) / 1000; d.update(t, dt); puffStep(dt);
  if (!fx.called && t >= d.dur) { fx.called = true; const cb = fx.cb; if (cb) setTimeout(cb, 0); }
  const w = sm(t / d.inT) * (1 - sm((t - d.dur - .15) / .6));
  if (t > d.dur + 1.0) { endFx(); return 0; }                                  // trả mọi thứ về trạng thái nghỉ (nếu trang đã mở che cảnh thì chẳng ai thấy)
  return w;
}
function endFx() {
  if (!fx) return; const f = fx; fx = null; f.def.reset(); scroller.style.overflowY = f.prevOv; PUF.pool.forEach(p => { p.life = 0; p.s.visible = false; });
  PUF.dom.style.visibility = 'hidden'; PUF.dom.style.opacity = 0; PUF.flash.visible = false; PUF.glow.visible = false;
}
function abortFx() { if (fx) endFx(); }

/* ==========================================================================
   V8: CẢNH LUÔN "SỐNG" — gió lay cây, lá rơi, hổ vàng thở, camera nhún theo chuột (kể cả khi hộp chọn đang mở)
   - Gió: WIND.gust (0..1.6) tăng khi rê chuột qua nút/cây/hổ rồi tự giảm; TREES = các cây ven đường (mỗi cây có tán lá lay riêng).
   - Rê chuột lên cây hoặc tượng hổ (theo vị trí trên màn hình) => cây/hổ lay mạnh hơn; chuột lướt nhanh thì lay mạnh hơn.
   - Lá rơi: 10 lá nhỏ (InstancedMesh) bay theo gió quanh 2 cây gần cửa hàng.
   - Camera: nhún theo chuột rất nhẹ (tối đa ~1.2°) + thở chậm; tắt khi đang chạy hiệu ứng mở trang.
   Chỉnh nhanh: WIND_STRENGTH (độ mạnh gió chung), PARALLAX (độ nhún camera, 0 = tắt), LEAVES (số lá, 0 = tắt).
   Người dùng bật "giảm chuyển động" của hệ điều hành => tắt hết (REDUCE). Vật động cần mw() vì scene.matrixWorldAutoUpdate = false. ========================================================================== */
const WIND_STRENGTH = 1, PARALLAX = 1, LEAVES = 10;
const REDUCE = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const WIND = { gust: 0, spd: 0, tiger: 0, ptr: { x: 0, y: 0, has: false }, par: { x: 0, y: 0 }, leaves: null, lv: [] };
function poke(a) { WIND.gust = Math.min(1.6, Math.max(WIND.gust, a)); WIND.tiger = Math.min(1, WIND.tiger + .6); }
function windInit() {
  if (REDUCE || !LEAVES) return;
  const m = std(0x4fa84a, { roughness: .8, side: THREE.DoubleSide }), im = new THREE.InstancedMesh(new THREE.PlaneGeometry(.16, .1), m, LEAVES); im.frustumCulled = false; scene.add(im); WIND.leaves = im;
  for (let i = 0; i < LEAVES; i++) WIND.lv.push({ x: 0, y: -5, z: 0, rx: Math.random() * 6, ry: Math.random() * 6, sp: R(.3, .7), t: Math.random() * 6 });
}
function respawnLeaf(L) { const T = TREES[(Math.random() * Math.min(2, TREES.length)) | 0]; if (!T) return; L.x = T.g.position.x + R(-1.6, 1.6); L.y = R(3.8, 6); L.z = T.g.position.z + R(-1.6, 1.6); L.sp = R(.3, .7); }
const _d = new THREE.Object3D();
function ambientCam(now, dt) {                                               // camera nhún nhẹ theo chuột + thở chậm
  if (REDUCE || !PARALLAX) return; const t = now / 1000, P = WIND.ptr, k = 1 - Math.exp(-dt * 3), f = fx ? 0 : PARALLAX;
  const nx = P.has ? P.x / W * 2 - 1 : 0, ny = P.has ? -(P.y / H * 2 - 1) : 0; WIND.par.x += (nx - WIND.par.x) * k; WIND.par.y += (ny - WIND.par.y) * k;
  camera.rotation.y += (-WIND.par.x * .02 + Math.sin(t * .37) * .004) * f; camera.rotation.x += (WIND.par.y * .012 + Math.sin(t * .5) * .003) * f;
}
function hitPtr(wx, wy, wz, R2) { if (!WIND.ptr.has) return false; _v.set(wx, wy, wz).applyMatrix4(camera.matrixWorldInverse); if (_v.z > -.5) return false; _v.set(wx, wy, wz).project(camera); return Math.hypot((_v.x * .5 + .5) * W - WIND.ptr.x, (-_v.y * .5 + .5) * H - WIND.ptr.y) < R2 * H; }
function windStep(now, dt) {
  if (REDUCE) return; const t = now / 1000, ws = WIND_STRENGTH; WIND.spd *= Math.exp(-dt * 6); WIND.gust = Math.max(0, WIND.gust - dt * .6); WIND.tiger = Math.max(0, WIND.tiger - dt * .7);
  const gl = (.55 + .25 * Math.sin(t * .35) + WIND.gust * 1.6) * ws, sw = Math.sin(t * 1.15) * .6 + Math.sin(t * 2.7 + 1.3) * .25, mv = Math.min(1, .3 + WIND.spd * .004);
  TREES.forEach(T => {
    const p = T.g.position, hit = hitPtr(p.x, 5 * T.k, p.z, Math.abs(p.x) < 20 ? .2 : .1), tg = hit ? mv : 0;
    T.exc += (tg - T.exc) * (1 - Math.exp(-dt * (tg > T.exc ? 6 : 1.2)));
    const cs = Math.cos(T.ry), sn = Math.sin(T.ry), ex = 1 + T.exc * 2.4, wx = 1, wz = .35;
    T.blobs.forEach(b => {
      const h = Math.max(0, (b.p0.y - 3) / 3) + .35, w1 = Math.sin(t * 1.7 + b.ph), w2 = Math.sin(t * 3.3 + b.ph * 1.7);
      const a = (sw * .07 + w1 * .03 + w2 * .014) * h * ex * gl / T.k, ox = a * wx, oz = a * wz;
      b.m.position.set(b.p0.x + ox * cs - oz * sn, b.p0.y + w2 * .012 * gl * h, b.p0.z + ox * sn + oz * cs); b.m.rotation.z = (w1 * .06 + sw * .04) * gl * ex * .6;
    });
    T.g.updateMatrixWorld(true);
  });
  const Tg = FXO.tiger;                                                           // hổ vàng thở nhẹ; rê chuột / bấm nút thì lắc người
  if (Tg) {
    const hv = hitPtr(5.6, 3.3, 6.4, .16); if (hv) WIND.tiger = Math.max(WIND.tiger, Math.min(1, .35 + WIND.spd * .004));
    const e = WIND.tiger; Tg.position.y = 1.06 + Math.sin(t * 1.8) * .012 + e * Math.abs(Math.sin(t * 9)) * .035; Tg.rotation.y = Math.sin(t * .7) * .025 + e * Math.sin(t * 8) * .09; Tg.rotation.z = Math.sin(t * 1.1 + 1) * .008 + e * Math.sin(t * 6) * .03; Tg.updateMatrixWorld(true);
  }
  if (WIND.leaves) {
    WIND.lv.forEach((L, i) => {
      if (L.y < .15 || L.y > 7) respawnLeaf(L);
      L.t += dt; L.y -= L.sp * dt * (.8 + .3 * Math.sin(L.t * 2)); L.x += (.35 + sw * .25 + gl * .5) * dt * (.6 + .4 * Math.sin(L.t + i)); L.z += (.12 + Math.sin(L.t * 1.3 + i) * .2) * dt;
      L.rx += dt * (1.5 + gl); L.ry += dt * 1.1; _d.position.set(L.x, L.y, L.z); _d.rotation.set(L.rx, L.ry, 0); _d.updateMatrix(); WIND.leaves.setMatrixAt(i, _d.matrix);
    });
    WIND.leaves.instanceMatrix.needsUpdate = true;
  }
}

/* ==========================================================================
   V12: PHỐ SỐNG ĐỘNG + GIAN HÀNG CHI TIẾT (lấy cảm hứng ví dụ three.js "animation - keyframes", mô hình Littlest Tokyo)
   - Xe bus tuyến 09 chạy ngang trước cửa hàng, giảm tốc dừng ở trạm, đèn phanh + đèn hazard, bánh xe quay, khách ngồi trong xe.
   - Xe máy chạy 2 làn, người đi bộ trên vỉa hè (đi qua đi lại), 2 người đứng chờ xe ở trạm (lên xe rồi biến mất).
   - Trạm xe buýt, biển trụ, cột điện + dây, ghế đá, thùng rác, trụ cứu hỏa, biển tên đường, bảng menu chữ phấn.
   - Mặt tiền: trụ + gờ tầng cho tháp, hộp hoa, biển dọc neon, dây đèn nhấp nháy, đèn tường, phim mờ trên kính, chữ trên cửa trượt.
   - Nội thất: dầm trần, đèn ray, máy lạnh âm trần, đèn thả quầy, bảng chữ sau quầy, thảm, biển LỐI RA, tủ chữa cháy...
   Mọi thứ tĩnh được GỘP mesh theo vật liệu (bake) để ít draw call; vật động chỉ cập nhật khi camera còn ở ngoài phố/sảnh (sp < .34).
   Tắt hết: đặt V12_ON = false. Người dùng bật "giảm chuyển động" => xe đứng yên ở trạm, không chạy.
   Mỗi stage bọc try/catch (safe): lỗi ở phần mới không làm hỏng cảnh cũ.
   ========================================================================== */
const V12_ON = true;
let BGU = null, K12 = null;
const LIFE = { t: 3, bus: null, scoot: [], walk: [], wait: [], flags: [], neon: null, chase: [] };
const safe = (n, f) => { try { f(); } catch (e) { console.error('[9Sach] ' + n + ' lỗi:', e); } };

/* gộp mọi mesh con (cùng vật liệu) của g thành 1 mesh => giảm draw call. Bỏ qua InstancedMesh; mesh có userData.keep giữ nguyên. */
function bake(g, shadow) {
  if (!BGU || !BGU.mergeGeometries) return g;
  try {
    g.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(), mt = new THREE.Matrix4(), bk = new Map(), rm = [];
    g.traverse(o => {
      if (o === g || !o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || (o.userData && o.userData.keep)) return;
      const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      geo.applyMatrix4(mt.multiplyMatrices(inv, o.matrixWorld));
      Object.keys(geo.attributes).forEach(k => { if (k !== 'position' && k !== 'normal' && k !== 'uv') geo.deleteAttribute(k); });
      if (!geo.attributes.normal) geo.computeVertexNormals();
      if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
      if (!bk.has(o.material)) bk.set(o.material, []);
      bk.get(o.material).push(geo); rm.push(o);
    });
    if (!rm.length) return g;
    const out = new THREE.Group(), made = [];
    bk.forEach((arr, mat) => { const m = BGU.mergeGeometries(arr, false); if (!m) throw new Error('mergeGeometries null'); const me = new THREE.Mesh(m, mat); me.castShadow = !!shadow && !LOW; made.push(me); });
    rm.forEach(o => { if (o.parent) o.parent.remove(o); });
    made.forEach(m => out.add(m)); g.add(out);
  } catch (e) { console.warn('[9Sach] bake lỗi, giữ nguyên mesh rời:', e); }
  return g;
}

function fitText(g, t, x, y, maxW, fs, fill, stroke, align = 'left', wt = 800) {
  g.font = `${wt} ${fs}px ${FONT}`; const w = g.measureText(t).width; if (w > maxW) { fs *= maxW / w; g.font = `${wt} ${fs}px ${FONT}`; }
  g.textAlign = align; g.textBaseline = 'middle'; g.lineJoin = 'round';
  if (stroke) { g.lineWidth = fs * .14; g.strokeStyle = stroke; g.strokeText(t, x, y); }
  g.fillStyle = fill; g.fillText(t, x, y);
}
function durianIcon(g, cx, cy, r) {                                   // quả sầu riêng vẽ bằng canvas: thân bầu dục + gai
  g.save(); g.translate(cx, cy); g.fillStyle = '#b6c93a'; g.strokeStyle = '#4c7a1c'; g.lineWidth = r * .08;
  for (let i = 0; i < 14; i++) { g.save(); g.rotate(i / 14 * Math.PI * 2); g.beginPath(); g.moveTo(-r * .16, -r * .84); g.lineTo(0, -r * 1.16); g.lineTo(r * .16, -r * .84); g.closePath(); g.fill(); g.restore(); }
  g.beginPath(); g.ellipse(0, 0, r * .92, r * .98, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.ellipse(-r * .3, -r * .32, r * .26, r * .4, .5, 0, 7); g.fill(); g.restore();
}

function k12() {
  if (K12) return K12;
  const env = makeEnv(), paint = (c, ro = .34, me = .3) => std(c, { roughness: ro, metalness: me, envMap: env, envMapIntensity: .5 });
  return (K12 = {
    busG: paint(0x1f8a45), busW: paint(0xf6f3ea, .4, .15), busH: paint(0xf2b705, .4, .25), busD: std(0x1a2128, { roughness: .6, metalness: .3 }),
    doorG: std(0x24384a, { roughness: .12, metalness: .6, envMap: env, envMapIntensity: .8 }),
    glassB: new THREE.MeshStandardMaterial({ color: 0x1b2b3a, roughness: .1, metalness: .5, transparent: true, opacity: .6, depthWrite: false, envMap: env, envMapIntensity: .9 }),
    tire: std(0x141414, { roughness: .9 }), hub: std(0xc9cdd1, { roughness: .3, metalness: .85, envMap: env, envMapIntensity: .7 }), hubD: std(0x3a3f44, { roughness: .5, metalness: .6 }),
    head: emi(0xfff0c0, 2.4), brake: emi(0xff2a1a, .8), ind: emi(0xffa81a, .12), cabin: emi(0xfff1c8, 1.0), lamp: emi(0xffe2a0, 1.8), tail: emi(0xff3322, 1.0),
    seat: std(0x2b7089, { roughness: .7 }), skin: std(0xe0b088, { roughness: .8 }), jeans: std(0x2f3d55, { roughness: .85 }), hair: std(0x1a1410, { roughness: .9 }),
    pax: [0xd9534f, 0x3b7ddd, 0xf0ad4e, 0x5cb85c, 0x8e6bbf, 0xe8e8e8, 0x39414d, 0xe66a8a].map(c => std(c, { roughness: .8 })),
    neon: emi(0xffd36b, 1.6), ch: [0, 1, 2].map(() => emi(0xffe2a0, 1)),
    wire: std(0x15171a, { roughness: .7 }), conc: std(0x9a968c, { roughness: .95 })
  });
}

/* ---------- người (đi bộ / đứng chờ): thân + đầu gộp sẵn, tay chân là khớp xoay riêng ---------- */
function person(shirtC, pantsC, hairC, sc = 1) {
  const K = k12(), g = new THREE.Group(), sh = std(shirtC, { roughness: .8 }), pn = std(pantsC, { roughness: .85 }), hr = std(hairC, { roughness: .9 });
  const core = new THREE.Group(); g.add(core);
  C(core, sh, [.42, .62, .26], [0, 1.16, 0]); S(core, K.skin, [.23, .27, .23], [0, 1.62, 0]); S(core, hr, [.25, .2, .25], [0, 1.7, -.015]);
  [-1, 1].forEach(s => S(core, sh, [.15, .15, .15], [s * .27, 1.44, 0]));
  const mk = (x, y) => { const p = new THREE.Group(); p.position.set(x, y, 0); g.add(p); return p; };
  const lL = mk(-.1, .86), lR = mk(.1, .86), aL = mk(-.27, 1.44), aR = mk(.27, 1.44);
  [lL, lR].forEach(p => C(p, pn, [.15, .86, .15], [0, -.43, 0]));
  [aL, aR].forEach(p => C(p, K.skin, [.1, .54, .1], [0, -.27, 0]));
  bake(core); g.scale.setScalar(sc);
  return { g, lL, lR, aL, aR };
}

/* ---------- xe máy: thân + người lái (+ người ngồi sau), gộp thành vài mesh ---------- */
function buildScooter(bodyC, jacketC, helmC, two) {
  const K = k12(), g = new THREE.Group(), bm = std(bodyC, { roughness: .4, metalness: .3 }), jk = std(jacketC, { roughness: .8 }), hl = std(helmC, { roughness: .35 });
  [-.62, .62].forEach(x => { C(g, K.tire, [.5, .1, .5], [x, .25, 0], [Math.PI / 2, 0, 0]); C(g, K.hub, [.26, .12, .26], [x, .25, 0], [Math.PI / 2, 0, 0]); });
  B(g, bm, [.95, .22, .3], [-.12, .44, 0]); B(g, bm, [.42, .5, .3], [.42, .62, 0], [0, 0, -.25]); B(g, bm, [.36, .3, .3], [-.68, .55, 0]); B(g, M.black, [.7, .1, .32], [-.22, .66, 0]);
  C(g, K.busD, [.05, .6, .05], [.62, .55, 0], [0, 0, .32]); B(g, K.busD, [.07, .07, .66], [.5, .98, 0]); B(g, K.head, [.07, .13, .16], [.67, .84, 0]); B(g, K.tail, [.05, .08, .2], [-.87, .58, 0]);
  const rider = (x, jc) => {
    B(g, jc, [.26, .52, .36], [x, 1.02, 0], [0, 0, .1]); S(g, K.skin, [.22, .24, .22], [x + .08, 1.4, 0]); S(g, hl, [.3, .27, .3], [x + .07, 1.46, 0]); B(g, M.black, [.05, .1, .2], [x + .22, 1.43, 0]);
    [-1, 1].forEach(s => { B(g, jc, [.34, .1, .08], [x + .3, .96, s * .16], [0, 0, -.4]); B(g, K.jeans, [.46, .16, .14], [x + .22, .68, s * .15]); B(g, K.jeans, [.13, .42, .13], [x + .46, .46, s * .15]); });
  };
  rider(.02, jk); if (two) rider(-.4, std(0x1f7a3a, { roughness: .8 }));
  return bake(g);
}

/* ---------- xe bus tuyến 09: +x là đầu xe, cửa lên xuống ở phía +z; dựng xong xoay y = π để chạy về -x (sát vỉa hè) ---------- */
function buildBus() {
  const K = k12(), bus = new THREE.Group(), body = new THREE.Group(); bus.add(body);
  const Bx = (m, s, p, r) => B(body, m, s, p, r), Cx = (m, s, p, r) => C(body, m, s, p, r), Sx = (m, s, p, r) => S(body, m, s, p, r);
  const inDoor = x => (x > -1.0 && x < .4) || (x > 2.4 && x < 3.6);
  // chữ + quảng cáo
  const ad = canvasTex(1275, 205, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, '#ffe58a'); gr.addColorStop(.5, '#f9cf2a'); gr.addColorStop(1, '#f2a900'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = '#1f7a3a'; g.fillRect(0, 0, W, H * .09); g.fillRect(0, H * .91, W, H * .09);
    durianIcon(g, H * .62, H * .52, H * .3); durianIcon(g, W - H * .62, H * .52, H * .3);
    fitText(g, 'Bánh Sầu Riêng 9 Sạch', W / 2, H * .36, W * .62, H * .42, '#1f7a3a', '#fff6dc', 'center');
    fitText(g, 'Sạch Là Chính – Ngon Là Mười', W / 2, H * .72, W * .62, H * .3, '#c8102e', '#fff6dc', 'center');
  });
  const dest = canvasTex(512, 96, (g, W, H) => { g.fillStyle = '#0b0b0b'; g.fillRect(0, 0, W, H); fitText(g, '09  ·  9 SẠCH', W / 2, H / 2, W * .9, H * .62, '#ffb21a', null, 'center', 700); });
  const plate = canvasTex(128, 64, (g, W, H) => { g.fillStyle = '#f3c614'; g.fillRect(0, 0, W, H); g.strokeStyle = '#222'; g.lineWidth = 3; g.strokeRect(3, 3, W - 6, H - 6); fitText(g, '65B', W / 2, H * .3, W * .8, H * .36, '#111', null, 'center', 700); fitText(g, '099.99', W / 2, H * .72, W * .86, H * .42, '#111', null, 'center', 700); });
  const blob = canvasTex(128, 128, (g, W, H) => { const gr = g.createRadialGradient(W / 2, H / 2, 4, W / 2, H / 2, W / 2); gr.addColorStop(0, 'rgba(0,0,0,.75)'); gr.addColorStop(.6, 'rgba(0,0,0,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); });
  // thân
  Bx(K.busG, [10.4, .96, 2.5], [0, 1.05, 0]); Bx(K.busD, [10.1, .32, 2.3], [0, .42, 0]);
  Bx(K.busH, [10.42, .09, 2.52], [0, 1.58, 0]); Bx(K.busH, [10.42, .06, 2.52], [0, .66, 0]);
  Bx(K.glassB, [10.3, 1.0, 2.44], [0, 2.1, 0]); Bx(K.busW, [10.4, .36, 2.5], [0, 2.8, 0]);
  for (let i = 0; i < 10; i++) { const x = -4.95 + i * 1.1; Bx(K.busW, [.12, 1.1, .08], [x, 2.08, -1.25]); if (!inDoor(x)) Bx(K.busW, [.12, 1.1, .08], [x, 2.08, 1.25]); }
  P(body, std(0xffffff, { map: ad.t, roughness: .45 }), [5.1, .82], [.3, 1.0, -1.26], [0, Math.PI, 0]);                     // quảng cáo bên hông (phía camera thấy)
  // đầu xe
  Bx(K.glassB, [.06, 1.25, 2.3], [5.2, 2.12, 0], [0, 0, .08]); Bx(K.busD, [.12, .34, 1.9], [5.19, 2.8, 0]);
  P(body, new THREE.MeshBasicMaterial({ map: dest.t, toneMapped: false }), [1.7, .28], [5.26, 2.8, 0], [0, Math.PI / 2, 0]);
  Bx(K.busD, [.22, .3, 2.44], [5.26, .62, 0]); Bx(K.busD, [.04, .2, 1.1], [5.215, .95, 0]); Bx(K.busD, [.05, .3, 1.0], [5.215, 1.35, 0]);
  P(body, textMat('9 SẠCH', 3.2, '#ffd36b'), [.9, .28], [5.245, 1.35, 0], [0, Math.PI / 2, 0]);
  [-.95, .95].forEach(z => { Bx(K.head, [.07, .2, .5], [5.22, 1.0, z]); Bx(K.ind, [.07, .12, .2], [5.22, .78, z * 1.2]); });
  // đuôi xe
  Bx(K.busD, [.22, .3, 2.44], [-5.26, .62, 0]); Bx(K.glassB, [.06, .9, 1.9], [-5.2, 2.1, 0]); Bx(K.brake, [.06, .08, .9], [-5.21, 2.92, 0]);
  [-1, 1].forEach(s => { Bx(K.brake, [.07, .36, .26], [-5.22, 1.1, s * 1.0]); Bx(K.ind, [.07, .12, .2], [-5.22, .82, s * 1.0]); });
  P(body, new THREE.MeshBasicMaterial({ map: plate.t }), [.5, .26], [-5.225, .85, 0], [0, -Math.PI / 2, 0]);
  // mái + gương + cửa
  Bx(K.busW, [2.8, .26, 1.5], [-1.1, 3.11, 0]); Cx(K.busD, [.9, .04, .9], [-1.9, 3.25, 0]); Cx(K.busD, [.9, .04, .9], [-.3, 3.25, 0]); Bx(K.busW, [1.0, .1, .8], [2.6, 3.03, 0]); Cx(K.busD, [.03, .5, .03], [-3.8, 3.2, .5]);
  [-1, 1].forEach(s => { Bx(K.busD, [.3, .04, .04], [4.95, 2.2, s * 1.45]); Bx(K.busD, [.05, .42, .2], [4.8, 2.0, s * 1.62]); });
  [-.3, 3.0].forEach(dx => {
    Bx(K.doorG, [1.15, 1.8, .05], [dx, 1.65, 1.27]); Bx(K.busH, [.06, 1.9, .07], [dx - .6, 1.6, 1.28]); Bx(K.busH, [.06, 1.9, .07], [dx + .6, 1.6, 1.28]);
    Bx(K.busH, [1.25, .06, .07], [dx, 2.58, 1.28]); Bx(K.busH, [1.1, .05, .45], [dx, .74, 1.42]); Cx(K.hub, [.04, 1.5, .04], [dx - .45, 1.55, 1.05]); Cx(K.hub, [.04, 1.5, .04], [dx + .45, 1.55, 1.05]);
  });
  // nội thất nhìn thấy qua kính: đèn trần, tay vịn, ghế, khách, tài xế
  const rr = seeded(41);
  Bx(K.cabin, [9.4, .05, .2], [0, 2.56, -.5]); Bx(K.cabin, [9.4, .05, .2], [0, 2.56, .5]); Cx(K.hub, [.035, 9.4, .035], [0, 2.45, -.1], [0, 0, Math.PI / 2]);
  [-3.4, 1.9, 4.0].forEach(x => Cx(K.hub, [.04, 1.5, .04], [x, 1.78, 0]));
  [-4.3, -3.3, -2.3, -1.3, 1.1, 2.1, 3.9].forEach(x => [-1, 1].forEach(s => {
    const z = s * .75; Bx(K.seat, [.1, .5, .78], [x, 1.8, z]);
    if (rr() < .62) { Bx(K.pax[(rr() * 8) | 0], [.22, .3, .4], [x + .4, 1.95, z]); Sx(K.skin, [.23, .25, .23], [x + .4, 2.27, z]); Sx(K.hair, [.25, .17, .25], [x + .4, 2.35, z]); }
  }));
  [[-.9, -.3], [.1, .5]].forEach(a => { Bx(K.pax[(rr() * 8) | 0], [.26, .42, .4], [a[0], 2.0, a[1]]); Sx(K.skin, [.23, .25, .23], [a[0], 2.36, a[1]]); Sx(K.hair, [.25, .17, .25], [a[0], 2.44, a[1]]); });
  Bx(K.seat, [.5, .1, .5], [4.4, 1.62, -.65]); Bx(K.pax[2], [.3, .4, .42], [4.4, 1.98, -.65]); Sx(K.skin, [.23, .25, .23], [4.4, 2.32, -.65]); Sx(K.hair, [.25, .17, .25], [4.4, 2.4, -.65]);
  Cx(K.busD, [.36, .03, .36], [4.78, 1.88, -.65], [0, 0, .9]);
  // bánh xe
  const wh = [];
  [[3.55, -1.1], [3.55, 1.1], [-3.0, -1.1], [-3.0, 1.1]].forEach(a => {
    const w = new THREE.Group(); w.position.set(a[0], .52, a[1]); bus.add(w);
    C(w, K.tire, [1.04, .36, 1.04], [0, 0, 0], [Math.PI / 2, 0, 0]); C(w, K.hub, [.64, .38, .64], [0, 0, 0], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 6; i++) { const t = i / 6 * Math.PI * 2; B(w, K.hubD, [.08, .08, .42], [Math.cos(t) * .2, Math.sin(t) * .2, 0]); }
    C(w, K.busD, [.16, .42, .16], [0, 0, 0], [Math.PI / 2, 0, 0]); bake(w); wh.push(w);
    Bx(K.busD, [1.35, .62, .14], [a[0], .78, a[1] * 1.09]);
  });
  bake(body);
  P(bus, new THREE.MeshBasicMaterial({ map: blob.t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), [11.8, 3.6], [0, .03, 0], [-Math.PI / 2, 0, 0]);   // bóng mờ dưới gầm (bóng thật chỉ vẽ 1 lần nên xe không đổ bóng thật)
  return { g: bus, body, wh, px: 0, pitch: 0, last: '' };
}

/* ---------- đường đi của xe bus: đến → giảm tốc → dừng ở trạm → rời đi → chờ ngoài tầm nhìn ---------- */
const BUSC = { z: 15.75, stop: -8.9, from: 62, to: -72, ta: 17.5, td: 5, tb: 14, tw: 8 };
function busPhase(t) {
  const c = BUSC, T = c.ta + c.td + c.tb + c.tw, u = t % T; let x, st;
  if (u < c.ta) { const k = u / c.ta; x = c.from + (c.stop - c.from) * (1 - (1 - k) * (1 - k)); st = k > .82 ? 1 : 0; }
  else if (u < c.ta + c.td) { x = c.stop; st = 2; }
  else if (u < c.ta + c.td + c.tb) { const k = (u - c.ta - c.td) / c.tb; x = c.stop + (c.to - c.stop) * k * k; st = 0; }
  else { x = c.to; st = 3; }
  return { x, st, u };
}

function stageStreetPlus() {
  const K = k12();
  /* --- trạm xe buýt: mái xanh viền vàng, kính, hộp đèn quảng cáo, ghế, thùng rác --- */
  const SH = new THREE.Group(); SH.position.set(-8.6, 0, 12.45); scene.add(SH);
  [-1.25, 1.25].forEach(x => [-.5, .5].forEach(z => C(SH, K.hub, [.08, 2.55, .08], [x, 1.28, z])));
  B(SH, K.busG, [2.9, .3, 1.3], [0, 2.7, 0]); B(SH, K.busH, [3.0, .05, 1.4], [0, 2.88, 0]);
  P(SH, textMat('TRẠM XE BUÝT · TUYẾN 09', 11, '#ffffff'), [2.3, .2], [0, 2.7, .66]);
  B(SH, M.glass, [2.5, 1.95, .03], [0, 1.3, -.5]); B(SH, M.glass, [.03, 1.95, .92], [1.25, 1.3, 0]);
  const ad = lightbox(posterTex('ladua'), .85, 1.3); ad.position.set(-.6, 1.3, -.47); SH.add(ad);
  B(SH, M.wood, [2.0, .07, .4], [.1, .5, -.32]); [-.8, 1.0].forEach(x => B(SH, K.hubD, [.05, .5, .34], [x, .25, -.32])); B(SH, M.wood, [2.0, .32, .04], [.1, .84, -.5]);
  C(SH, K.hubD, [.36, .62, .36], [1.75, .31, .1]); C(SH, K.busG, [.38, .06, .38], [1.75, .64, .1]);
  bake(SH, true);
  { const g = new THREE.Group(); g.position.set(-10.3, 0, 12.95); scene.add(g);                                   // biển trụ "XE BUÝT"
    C(g, K.hub, [.07, 3.1, .07], [0, 1.55, 0]);
    const t = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#0b5fb3'; c.beginPath(); c.roundRect(6, 6, w - 12, h - 12, 28); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 6; c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.roundRect(58, 40, 140, 96, 14); c.fill(); c.fillStyle = '#0b5fb3'; c.fillRect(70, 52, 52, 38); c.fillRect(134, 52, 52, 38); c.beginPath(); c.arc(86, 142, 12, 0, 7); c.arc(170, 142, 12, 0, 7); c.fill();
      fitText(c, 'XE BUÝT', w / 2, 188, w * .8, 40, '#fff', null, 'center', 700); fitText(c, 'TUYẾN 09', w / 2, 226, w * .7, 30, '#ffd36b', null, 'center', 700); });
    B(g, K.busD, [.62, .62, .03], [0, 3.1, 0]); P(g, new THREE.MeshBasicMaterial({ map: t.t }), [.58, .58], [0, 3.1, .02]); bake(g); }
  const tt = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#e3b82c'; g.fillRect(0, 0, w, h); g.fillStyle = '#b98f14'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(8 + i * 16, 8 + j * 16, 4, 0, 7); g.fill(); } });
  tt.t.wrapS = tt.t.wrapT = THREE.RepeatWrapping; tt.t.repeat.set(10, 1);
  P(scene, new THREE.MeshStandardMaterial({ map: tt.t, roughness: .85 }), [4.2, .5], [-8.6, .02, 12.8], [-Math.PI / 2, 0, 0]);   // gạch dẫn đường màu vàng sát lề

  /* --- đồ dùng phố: ghế đá, thùng rác, trụ cứu hỏa, biển tên đường, bảng menu, cột điện + dây --- */
  const FU = new THREE.Group(); scene.add(FU);
  { const g = new THREE.Group(); g.position.set(-5.7, 0, 3.55); FU.add(g);
    B(g, M.wood, [1.6, .07, .44], [0, .46, 0]); B(g, M.wood, [1.6, .36, .05], [0, .74, -.2], [-.15, 0, 0]);
    [-.7, .7].forEach(x => { B(g, K.busD, [.07, .46, .4], [x, .23, 0]); B(g, K.busD, [.07, .05, .4], [x, .62, 0]); }); }
  [[-4.45, 1.55], [4.85, 1.5]].forEach(a => { C(FU, K.busG, [.46, .78, .46], [a[0], .42, a[1]]); C(FU, K.busD, [.5, .06, .5], [a[0], .83, a[1]]); P(FU, textMat('RÁC', 2, '#ffffff'), [.3, .15], [a[0], .45, a[1] + .236]); });
  C(FU, M.red, [.26, .6, .26], [11.6, .4, 12.4]); S(FU, M.red, [.3, .22, .3], [11.6, .74, 12.4]); C(FU, M.red, [.1, .1, .34], [11.6, .5, 12.4], [0, 0, Math.PI / 2]); C(FU, M.gold, [.14, .05, .14], [11.6, .88, 12.4]);
  { const nm = canvasTex(512, 128, (c, w, h) => { c.fillStyle = '#0b5fb3'; c.fillRect(0, 0, w, h); c.strokeStyle = '#fff'; c.lineWidth = 8; c.strokeRect(6, 6, w - 12, h - 12); fitText(c, 'ĐƯỜNG MẬU THÂN', w / 2, h / 2 + 3, w * .86, 60, '#fff', null, 'center', 700); });
    C(FU, K.hub, [.07, 3.2, .07], [10.7, 1.6, 12.3]); B(FU, K.busD, [1.3, .34, .03], [10.7, 3.05, 12.3]); P(FU, new THREE.MeshBasicMaterial({ map: nm.t }), [1.26, .31], [10.7, 3.05, 12.32]);
    B(FU, K.busD, [.34, .34, .03], [10.7, 2.62, 12.3]); P(FU, new THREE.MeshBasicMaterial({ color: 0x0b5fb3 }), [.3, .3], [10.7, 2.62, 12.32]); P(FU, textMat('P', 1, '#ffffff'), [.24, .24], [10.7, 2.62, 12.33]); }
  { const g = new THREE.Group(); g.position.set(-3.0, 0, 3.4); g.rotation.y = .25; FU.add(g);                         // bảng menu chữ phấn (chân chữ A)
    B(g, M.woodD, [.78, 1.1, .04], [0, .55, .1], [-.2, 0, 0]); B(g, M.woodD, [.78, 1.1, .04], [0, .55, -.1], [.2, 0, 0]);
    const t = canvasTex(512, 700, (c, w, h) => { c.fillStyle = '#1d2b24'; c.fillRect(0, 0, w, h); c.strokeStyle = '#c9a24b'; c.lineWidth = 10; c.strokeRect(12, 12, w - 24, h - 24);
      durianIcon(c, w / 2, 96, 44); fitText(c, 'MENU HÔM NAY', w / 2, 188, w * .8, 54, '#f6e27a', null, 'center', 700);
      FLAV.forEach((f, i) => { c.fillStyle = f[2]; c.beginPath(); c.arc(70, 262 + i * 66, 15, 0, 7); c.fill(); fitText(c, f[1], 108, 262 + i * 66, w - 160, 42, '#f4f1e6', null, 'left', 600); });
      fitText(c, 'Panna cotta · Sữa chua', w / 2, 600, w * .8, 34, '#9fd8b0', null, 'center', 600); fitText(c, 'Sạch Là Chính – Ngon Là Mười', w / 2, 650, w * .86, 30, '#f6e27a', null, 'center', 600); });
    P(g, new THREE.MeshBasicMaterial({ map: t.t }), [.7, .95], [0, .555, .123], [-.2, 0, 0]); }
  const pole = (x, tf) => { const z = 12.9;                                                                           // cột điện bê tông, xà gỗ, sứ, biến áp
    limb(FU, K.conc, [x, 0, z], [x, 9.2, z], .2, .12); B(FU, M.woodD, [.12, .12, 2.3], [x, 8.5, z]); B(FU, M.woodD, [.12, .12, 1.8], [x, 7.6, z]);
    [-.9, 0, .9].forEach(o => C(FU, K.hubD, [.08, .14, .08], [x, 8.62, z + o]));
    if (tf) { C(FU, K.hubD, [.55, .85, .55], [x, 6.6, z + .45]); C(FU, K.busD, [.2, .1, .2], [x, 7.1, z + .45]); } };
  pole(-17.5, false); pole(17.5, true);
  const wire = (y, z, sag, r) => { const pts = []; for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push(new THREE.Vector3(-17.5 + 35 * u, y - Math.sin(u * Math.PI) * sag, z)); }
    FU.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, r, 4), K.wire)); };
  [-.9, 0, .9].forEach(o => wire(8.7, 12.9 + o, 1.1, .02)); wire(7.7, 12.6, .7, .03); wire(7.7, 13.2, .8, .03);
  bake(FU, true);
}

function stageBus() {
  const bus = buildBus(); bus.g.rotation.y = Math.PI; bus.g.position.set(BUSC.from, 0, BUSC.z); scene.add(bus.g); LIFE.bus = bus;
  // xe máy 2 làn: [thân, áo, mũ, chở 2, hướng, z, tốc độ, x đầu]
  const defs = [[0xc62828, 0x2b4a7a, 0xf2f2f2, 0, -1, 19.4, 6.4, -30], [0x2b4a7a, 0xf2c230, 0x1c1f22, 1, 1, 24.3, 7.3, 10], [0xd0d0d0, 0x1f7a3a, 0xe0b030, 0, -1, 19.0, 5.2, 25], [0x1a1a1a, 0xd9534f, 0x3b7ddd, 1, 1, 24.7, 6.0, -45]];
  (LOW ? defs.slice(0, 2) : defs).forEach(d => {
    const g = buildScooter(d[0], d[1], d[2], !!d[3]); g.rotation.y = d[4] < 0 ? Math.PI : 0; g.position.set(d[7], 0, d[5]); scene.add(g);
    LIFE.scoot.push({ g, dir: d[4], z: d[5], v: d[6], x0: d[7], ph: Math.random() * 6 });
  });
  // người đi bộ trên vỉa hè (đi qua đi lại, quay đầu ở hai đầu)
  [[0xf2c230, 0x222831, 0x1a1410, 10.1, 1, .9, -9], [0x3b7ddd, 0x39414d, 0x4a2c17, 10.55, -1, 1.15, 8], [0xe66a8a, 0x2f3d55, 0x1a1410, 10.95, 1, .75, -2]].forEach(a => {
    const p = person(a[0], a[1], a[2], 1 + Math.random() * .06); p.g.position.set(a[6], 0, a[3]); p.g.rotation.y = a[4] > 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(p.g);
    LIFE.walk.push({ p, z: a[3], dir: a[4], v: a[5], x: a[6], ph: Math.random() * 6, pause: 0, ry: p.g.rotation.y });
  });
  // 2 người đứng chờ xe ở trạm (tĩnh, gộp mesh): lên xe thì biến mất
  [[0xf2c230, 0x222831, 0x1a1410, -9.3, 12.62, .1, -1.15], [0xe8e8e8, 0x2f3d55, 0x4a2c17, -8.2, 12.68, -.2, 0]].forEach(a => {
    const p = person(a[0], a[1], a[2]); p.aR.rotation.x = a[6]; p.aL.rotation.x = .05; bake(p.g); p.g.position.set(a[3], 0, a[4]); p.g.rotation.y = a[5]; scene.add(p.g); LIFE.wait.push(p.g);
  });
  if (REDUCE) {                                                                       // giảm chuyển động: xe đậu yên ở trạm, người đang chờ
    bus.g.position.x = BUSC.stop; bus.g.updateMatrixWorld(true);
    LIFE.scoot.forEach(s => { s.g.visible = false; }); LIFE.walk.forEach(w => { w.p.g.position.x = 4 + w.z - 10; w.p.g.updateMatrixWorld(true); });
  }
}

function stageShopPlus() {
  const K = k12(), F = new THREE.Group(), stoneT = std(0xc9c4b8, { roughness: .9 }); scene.add(F);
  // tháp: thêm 2 hàng cửa sổ trên cùng, trụ đứng giữa các cột cửa, gờ tầng, phào đỉnh
  for (let r = 3; r < 5; r++) for (let c = 0; c < 6; c++) {
    const wx = -8.5 + c * 3.4, wy = 9.2 + r * 2.6;
    P(F, (r + c) % 3 === 0 ? WIN_L : WIN_D, [1.9, 1.65], [wx, wy, -.17]); B(F, M.stone, [2.15, .1, .26], [wx, wy - .9, -.07]);
  }
  [-10.6, -6.8, -3.4, 0, 3.4, 6.8, 10.6].forEach(x => B(F, stoneT, [Math.abs(x) > 10 ? .5 : .45, 14.2, .3], [x, 14.6, -.05]));
  [10.5, 13.1, 15.7, 18.3, 20.9].forEach(y => B(F, stoneT, [22.1, .2, .36], [0, y, -.04]));
  B(F, stoneT, [22.3, .3, .45], [0, 22.3, -.03]);
  // hộp hoa dưới hàng cửa sổ đầu + cây/hoa nhỏ (InstancedMesh)
  const Fo = foliage(), rr = seeded(77), d = new THREE.Object3D();
  for (let c = 0; c < 6; c++) { B(F, M.woodD, [1.9, .3, .42], [-8.5 + c * 3.4, 8.5, .06]); B(F, std(0x3b2a1c, { roughness: 1 }), [1.8, .04, .34], [-8.5 + c * 3.4, 8.66, .06]); }
  const im = new THREE.InstancedMesh(Fo.geos[0], Fo.mat, 30), fl = new THREE.InstancedMesh(gIco, std(0xffffff, { roughness: .7 }), 30); let n = 0;
  const fc = [0xff7aa8, 0xffffff, 0xffd34a, 0xff9a5a].map(c => new THREE.Color(c));
  for (let c = 0; c < 6; c++) for (let k = 0; k < 5; k++, n++) {
    d.position.set(-8.5 + c * 3.4 - .8 + k * .4 + (rr() - .5) * .1, 8.8 + rr() * .1, .06 + (rr() - .5) * .12); d.scale.setScalar(.2 + rr() * .1); d.rotation.set(0, rr() * 6, 0); d.updateMatrix(); im.setMatrixAt(n, d.matrix);
    d.position.y += .2; d.position.z += .06; d.scale.setScalar(.07); d.updateMatrix(); fl.setMatrixAt(n, d.matrix); fl.setColorAt(n, fc[(rr() * 4) | 0]);
  }
  F.add(im, fl);
  // biển dọc neon "9 SẠCH" ở góc phải tháp
  { const bs = canvasTex(256, 1024, (g, W, H) => {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#1f8a45'); gr.addColorStop(1, '#0f5a2c'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#f2b705'; g.lineWidth = 12; g.strokeRect(10, 10, W - 20, H - 20);
      fitText(g, '9', W / 2, 270, W * .8, 520, '#f9d44a', '#ffffff', 'center', 800); fitText(g, 'SẠCH', W / 2, 560, W * .86, 150, '#ffffff', null, 'center', 800);
      durianIcon(g, W / 2, 740, 70); fitText(g, 'BÁNH', W / 2, 870, W * .7, 70, '#f6e27a', null, 'center', 700); fitText(g, 'SẦU RIÊNG', W / 2, 940, W * .8, 70, '#f6e27a', null, 'center', 700); });
    const BS = new THREE.Group(); BS.position.set(10.2, 0, .72); F.add(BS);
    B(BS, K.busG, [1.0, 5.6, .34], [0, 10.9, 0]); B(BS, K.busH, [1.08, .12, .4], [0, 8.04, 0]); B(BS, K.busH, [1.08, .12, .4], [0, 13.76, 0]);
    P(BS, new THREE.MeshBasicMaterial({ map: bs.t }), [.86, 5.4], [0, 10.9, .175]);
    [-.46, .46].forEach(x => B(BS, K.neon, [.04, 5.4, .03], [x, 10.9, .18])); [8.2, 13.6].forEach(y => B(BS, K.neon, [.9, .04, .03], [0, y, .18]));
    [8.5, 13.2].forEach(y => B(BS, K.busD, [.08, .08, .95], [0, y, -.4])); LIFE.neon = K.neon; }
  // đèn tường ở trụ, dây đèn LED chạy dọc mảng ốp vàng (3 nhóm bóng nhấp nháy đuổi nhau)
  [-10, -2.9, 2.9, 10].forEach(x => { B(F, K.busD, [.08, .08, .18], [x, 2.2, .78]); S(F, K.lamp, [.2, .3, .2], [x, 2.2, .92]); C(F, K.busD, [.26, .04, .26], [x, 2.4, .92]); C(F, K.busD, [.2, .04, .2], [x, 2.0, .92]); });
  { const bulbG = new THREE.SphereGeometry(.07, 8, 6), per = LOW ? 5 : 9, ims = K.ch.map(m => new THREE.InstancedMesh(bulbG, m, 6 * per)), idx = [0, 0, 0];
    for (let s = 0; s < 6; s++) {
      const x0 = -12 + s * 4, pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push(new THREE.Vector3(x0 + 4 * u, 7.62 - Math.sin(u * Math.PI) * .42, 1.34)); }
      F.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, .012, 4), K.wire)); B(F, M.gold, [.1, .22, .1], [x0, 7.5, 1.3]);
      for (let i = 1; i <= 9; i += (LOW ? 2 : 1)) { const k = i % 3, p = pts[i]; d.position.copy(p); d.scale.setScalar(1); d.rotation.set(0, 0, 0); d.updateMatrix(); ims[k].setMatrixAt(idx[k]++, d.matrix); }
    }
    ims.forEach((m, k) => { m.count = idx[k]; F.add(m); }); B(F, M.gold, [.1, .22, .1], [12, 7.5, 1.3]); LIFE.chase = K.ch; }
  // phim mờ họa tiết sầu riêng trên kính hai bên + chữ chào trên hai cánh cửa trượt
  if (!LOW) { const ft = canvasTex(1024, 84, (g, W, H) => { g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(0, 0, W, H); for (let i = 0; i < 12; i++) { g.globalAlpha = .55; durianIcon(g, 45 + i * 86, H / 2, 26); } g.globalAlpha = 1; });
    const fm = new THREE.MeshBasicMaterial({ map: ft.t, transparent: true, depthWrite: false, opacity: .8 }); [-1, 1].forEach(sx => P(F, fm, [6.1, .5], [sx * 6.45, 1.25, .08])); }
  if (slideL && slideR) { P(slideL, textMat('XIN MỜI', 4.5, '#f6e27a'), [.95, .21], [-.35, 1.78, .02]); P(slideR, textMat('QUÝ KHÁCH', 4.5, '#f6e27a'), [1.1, .24], [.35, 1.78, .02]); }
  // cờ hiệu 9 Sạch bay trên mái (thấy rõ ở màn hình dọc của điện thoại)
  [-10.4, 10.4].forEach((x, si) => {
    C(F, K.hub, [.1, 4.2, .1], [x, 25.6, -.3]); S(F, M.gold, [.2, .2, .2], [x, 27.75, -.3]);
    const ft = canvasTex(256, 140, (g, W, H) => { g.fillStyle = '#1f8a45'; g.fillRect(0, 0, W, H); g.fillStyle = '#f2b705'; g.fillRect(0, H * .8, W, H * .2); durianIcon(g, 56, H * .44, 30); fitText(g, '9 SẠCH', 150, H * .44, 110, 56, '#ffffff', null, 'center', 800); });
    const geo = new THREE.PlaneGeometry(2.2, 1.2, 10, 4), fm = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: ft.t, side: THREE.DoubleSide }));
    fm.userData.keep = true; fm.position.set(x + 1.1, 27.1, -.3); F.add(fm); LIFE.flags.push({ geo, base: geo.attributes.position.array.slice(), ph: si * 1.7 });
  });
  bake(F);
}

function stageInsidePlus() {
  const K = k12(), I = new THREE.Group(); scene.add(I);
  // dầm trần gỗ có viền LED, đèn ray + chóa đèn
  [-9, -15.5, -21.5].forEach(z => { B(I, M.woodD, [20, .22, .42], [0, 3.34, z]); B(I, M.honey, [20, .03, .2], [0, 3.22, z]); B(I, M.led, [19.6, .02, .05], [0, 3.21, z + .21]); });
  [-4.6, 4.6].forEach(x => { B(I, K.busD, [.06, .05, 17], [x, 3.38, -14]); [-7, -10.5, -14, -17.5, -21].forEach(z => { B(I, K.busD, [.1, .1, .1], [x, 3.3, z]); C(I, K.busD, [.15, .22, .15], [x, 3.17, z], [.35, 0, 0]); S(I, K.lamp, [.11, .11, .11], [x, 3.05, z + .05]); }); });
  // máy lạnh âm trần
  [[-3.3, -4.5], [3.3, -4.5], [-3.3, -17.5], [3.3, -17.5]].forEach(a => { B(I, M.white, [1.0, .12, 1.0], [a[0], 3.39, a[1]]); [-.3, -.1, .1, .3].forEach(o => B(I, K.busD, [.8, .02, .05], [a[0], 3.325, a[1] + o])); });
  // trụ gỗ giữa các tranh đèn, hai bên tường
  [-6, -9, -12].forEach(z => [-1, 1].forEach(s => { B(I, M.wood, [.12, 3.45, .2], [s * 9.88, 1.725, z]); B(I, M.gold, [.16, .1, .24], [s * 9.88, 3.3, z]); B(I, M.gold, [.16, .1, .24], [s * 9.88, .12, z]); }));
  // thảm đón khách từ cửa tới tủ đông
  { const rg = canvasTex(256, 768, (g, w, h) => { g.fillStyle = '#0f4a2b'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d8aa3a'; g.lineWidth = 10; g.strokeRect(10, 10, w - 20, h - 20); g.lineWidth = 3; g.strokeRect(26, 26, w - 52, h - 52);
      for (let i = 0; i < 6; i++) durianIcon(g, w / 2, 120 + i * 108, 28); });
    P(I, new THREE.MeshStandardMaterial({ map: rg.t, roughness: .95 }), [2.6, 7.8], [0, .02, -4.4], [-Math.PI / 2, 0, 0]).receiveShadow = !LOW; }
  // đèn thả trên quầy thu ngân
  [2.6, 3.5, 4.4].forEach(x => { C(I, K.busD, [.012, .9, .012], [x, 3.0, -12.3]); C(I, K.busH, [.3, .16, .3], [x, 2.55, -12.3]); S(I, K.lamp, [.17, .17, .17], [x, 2.44, -12.3]); });
  // mặt trước quầy + vật dụng trên quầy
  B(I, M.honey, [2.6, .5, .03], [3.5, .55, -12.485]); P(I, textMat('9 SẠCH', 3.6, '#1f5f33'), [1.4, .38], [3.5, .55, -12.465]);
  [[5.35, -12.85, .34, .14, .26], [5.35, -13.05, .3, .12, .22]].forEach((a, i) => { B(I, M.honey, [a[2], a[3], a[4]], [a[0], 1.09 + i * .13, a[1]]); B(I, M.green, [a[2] + .02, .03, .04], [a[0], 1.09 + i * .13, a[1]]); });
  C(I, M.gold, [.1, .04, .1], [1.7, 1.08, -12.95]); S(I, M.gold, [.1, .06, .1], [1.7, 1.12, -12.95]);
  B(I, K.busD, [.3, .02, .2], [1.75, 1.07, -13.25], [-.35, 0, 0]); B(I, M.white, [.12, .16, .1], [1.45, 1.1, -13.2]);
  C(I, M.white, [.1, .2, .1], [5.45, 1.16, -12.7]); [0, 1, 2].forEach(i => S(I, i === 1 ? M.apple : M.orange, [.12, .12, .12], [5.45 + (i - 1) * .05, 1.32 + i * .02, -12.7]));
  // bảng chữ sau quầy
  B(I, M.green, [3.0, .62, .04], [6.9, 2.75, -15.5]); B(I, M.gold, [3.1, .04, .06], [6.9, 3.08, -15.48]); B(I, M.gold, [3.1, .04, .06], [6.9, 2.42, -15.48]);
  P(I, textMat('Sạch Là Chính – Ngon Là Mười', 3.0 / .5, '#f6e27a'), [2.8, .5], [6.9, 2.75, -15.47]);
  // biển LỐI RA, tủ chữa cháy, camera an ninh
  B(I, emi(0x0c5a2a, 1.1), [.9, .3, .08], [6.5, 3.0, -27.28]); P(I, textMat('LỐI RA', 2.8, '#c8ffd8'), [.8, .26], [6.5, 3.0, -27.235]);
  { const g = new THREE.Group(); g.position.set(-9.84, 1.15, -2.3); g.rotation.y = Math.PI / 2; I.add(g);
    B(g, M.red, [.4, .78, .16], [0, 0, 0]); B(g, M.glass, [.32, .66, .02], [0, 0, .085]); C(g, M.red, [.14, .44, .14], [0, -.02, .02]); C(g, M.dark, [.06, .06, .06], [0, .24, .02]); P(g, textMat('CỨU HỎA', 3, '#ffffff'), [.34, .1], [0, .46, .01]); }
  [[-9.3, -2.2], [9.3, -2.2]].forEach(a => { C(I, K.busD, [.2, .04, .2], [a[0], 3.43, a[1]]); S(I, K.busD, [.2, .14, .2], [a[0], 3.36, a[1]]); S(I, K.head, [.06, .06, .06], [a[0], 3.33, a[1] + .05]); });
  bake(I);
  pot(-8.9, -1.4, 1.0); pot(8.9, -1.4, 1.0);
}

/* ---------- vòng cập nhật vật động: chỉ chạy khi camera còn ở ngoài phố / sảnh ---------- */
const wrapX = x => ((x + 75) % 150 + 150) % 150 - 75;
function lifeStep(now, dt) {
  if (!V12_ON || REDUCE || !LIFE.bus || sp > .34) return;
  LIFE.t += dt; const t = LIFE.t;
  MIXERS.forEach(mx => mx.update(dt));
  // xe bus
  { const Bs = LIFE.bus, K = k12(), ph = busPhase(t), g = Bs.g, dx = Bs.px - ph.x; Bs.px = ph.x;
    const vis = ph.st !== 3 && ph.x < 52; if (g.visible !== vis) g.visible = vis;
    if (vis) {
      if (Math.abs(dx) < 3) Bs.wh.forEach(w => { w.rotation.z -= dx / .52; });
      const want = ph.st === 1 ? -.014 : ph.st === 2 ? 0 : ph.u > BUSC.ta + BUSC.td ? .006 : 0; Bs.pitch += (want - Bs.pitch) * Math.min(1, dt * 4);
      Bs.body.rotation.z = Bs.pitch; Bs.body.position.y = ph.st === 2 ? Math.sin(t * 38) * .004 : 0;
      g.position.x = ph.x; g.updateMatrixWorld(true);
    }
    const br = ph.st === 1 || ph.st === 2 ? 3.4 : .8, hz = ph.st === 2 && Math.floor(t * 2.6) % 2 ? 3 : .12;
    if (K.brake.emissiveIntensity !== br) K.brake.emissiveIntensity = br; if (K.ind.emissiveIntensity !== hz) K.ind.emissiveIntensity = hz;
    const wv = ph.u < BUSC.ta + BUSC.td * .35 || ph.u >= BUSC.ta + BUSC.td + BUSC.tb;                                 // khách chờ lên xe rồi biến mất, xe đi khuất mới có khách mới
    LIFE.wait.forEach(w => { if (w.visible !== wv) w.visible = wv; }); }
  // xe máy
  LIFE.scoot.forEach(s => { const x = wrapX(s.x0 + s.dir * s.v * t), vis = Math.abs(x) < 48; if (s.g.visible !== vis) s.g.visible = vis; if (!vis) return;
    s.g.position.set(x, Math.abs(Math.sin(t * 9 + s.ph)) * .008, s.z); s.g.rotation.z = Math.sin(t * 1.7 + s.ph) * .03; s.g.updateMatrixWorld(true); });
  // người đi bộ
  LIFE.walk.forEach(w => {
    const p = w.p; if (w.pause > 0) w.pause -= dt;
    else { w.x += w.dir * w.v * dt; w.ph += dt * w.v * 5.4; if (w.x > 11.5 || w.x < -11.5) { w.dir = -w.dir; w.pause = 1.2; w.x = clamp(w.x, -11.5, 11.5); } }
    const tr = w.dir > 0 ? Math.PI / 2 : -Math.PI / 2; w.ry += (tr - w.ry) * Math.min(1, dt * 5);
    const sw = w.pause > 0 ? 0 : Math.sin(w.ph);
    p.lL.rotation.x = sw * .62; p.lR.rotation.x = -sw * .62; p.aL.rotation.x = -sw * .5; p.aR.rotation.x = sw * .5;
    p.g.position.set(w.x, Math.abs(sw) * .03, w.z); p.g.rotation.y = w.ry; p.g.updateMatrixWorld(true);
  });
  // neon nhấp nháy + dây đèn đuổi nhau + cờ bay
  if (LIFE.neon) LIFE.neon.emissiveIntensity = 1.5 + Math.sin(t * 3) * .18 + (Math.sin(t * 17) > .985 ? -.9 : 0);
  LIFE.chase.forEach((m, k) => { m.emissiveIntensity = .35 + 1.9 * Math.max(0, Math.sin(t * 3.2 - k * 2.09)); });
  if (sp < .12) LIFE.flags.forEach(f => {
    const a = f.geo.attributes.position.array, b = f.base;
    for (let i = 0; i < a.length; i += 3) { const u = (b[i] + 1.1) / 2.2; a[i + 2] = Math.sin(u * 5.5 - t * 4.2 + f.ph) * .22 * u; a[i + 1] = b[i + 1] + Math.sin(u * 3 - t * 3 + f.ph) * .05 * u; }
    f.geo.attributes.position.needsUpdate = true; f.geo.computeVertexNormals();
  });
}


/* ==========================================================================
   V12.1: LỐI DỰNG HÌNH CỦA INDEX 7 (three.js "animation - keyframes")
   1) Ánh sáng môi trường: Sky shader + PMREMGenerator => scene.environment (mọi vật liệu PBR được chiếu sáng/phản chiếu như ảnh trời thật).
      Chỉnh: IBL_ON (bật/tắt), IBL_K (độ mạnh phản chiếu, 0..1), IBL_HEMI (độ sáng đèn bán cầu giữ lại để cảnh không bị cháy sáng).
   2) Nạp mô hình .glb bằng GLTFLoader + DRACOLoader + AnimationMixer, đúng như index 7.
      - BUS_GLB: nếu có file assets/models/bus.glb thì xe bus dựng bằng khối sẽ được thay bằng mô hình thật (len = chiều dài xe theo mét,
        rotY = xoay để đầu xe hướng +x, y = nâng/hạ). Không có file thì giữ xe dựng bằng code.
      - EXTRA_GLB: danh sách mô hình đặt thêm vào cảnh: { url, pos:[x,y,z], rotY, scale }. Ví dụ mô hình Littlest Tokyo của index 7:
        { url: 'https://threejs.org/examples/models/gltf/LittlestTokyo.glb', pos: [30, 0, 8], rotY: 0, scale: .05 }
   ========================================================================== */
const IBL_ON = true, IBL_K = .5, IBL_HEMI = .55, GLB_ON = true;
const BUS_GLB = { url: 'assets/models/bus.glb', len: 10.4, rotY: 0, y: 0 };
const EXTRA_GLB = [];
let HEMI = null, GLTF = null; const MIXERS = [];
async function iblSky() {
  if (!IBL_ON) return;
  try {
    const { Sky } = await import('three/addons/objects/Sky.js');
    const sky = new Sky(); sky.scale.setScalar(10000); const u = sky.material.uniforms;
    u['turbidity'].value = 0; u['rayleigh'].value = 3; u['mieDirectionalG'].value = .7; u['sunPosition'].value.set(-.5, .22, .8);   // thông số như index 7, mặt trời cùng hướng đèn nắng của cảnh
    const es = new THREE.Scene(); es.add(sky); const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(es).texture; pm.dispose(); sky.geometry.dispose(); sky.material.dispose();
    if (HEMI) HEMI.intensity = IBL_HEMI;
  } catch (e) { console.warn('[9Sach] không dựng được ánh sáng môi trường (IBL):', e); scene.environment = null; }
}
function applyIBL() {                                                                       // vật liệu chưa có envMap riêng thì dùng environment chung với độ mạnh IBL_K
  if (!scene.environment) return;
  scene.traverse(o => { const ms = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []); ms.forEach(m => { if (m.isMeshStandardMaterial && !m.envMap) m.envMapIntensity = IBL_K; }); });
}
async function glbInit() {
  try {
    const [a, b] = await Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('three/addons/loaders/DRACOLoader.js')]);
    const dr = new b.DRACOLoader(); dr.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    GLTF = new a.GLTFLoader(); GLTF.setDRACOLoader(dr);
  } catch (e) { GLTF = null; console.warn('[9Sach] không nạp được GLTFLoader:', e); }
}
const loadGLB = url => new Promise(res => { if (!GLTF) return res(null); GLTF.load(url, g => res(g), undefined, () => res(null)); });
function playClips(g, root) { if (g.animations && g.animations.length) { const mx = new THREE.AnimationMixer(root); g.animations.forEach(c => mx.clipAction(c).play()); MIXERS.push(mx); } }
async function glbStart() {
  await glbInit(); if (!GLTF) return;
  const g = await loadGLB(BUS_GLB.url);                                                       // thay xe bus dựng bằng khối bằng mô hình thật
  if (g && LIFE.bus) {
    const m = g.scene, box = new THREE.Box3().setFromObject(m), sz = box.getSize(new THREE.Vector3()), k = BUS_GLB.len / Math.max(sz.x, sz.z, .01);
    m.scale.setScalar(k); m.rotation.y = BUS_GLB.rotY; m.updateMatrixWorld(true);
    const b2 = new THREE.Box3().setFromObject(m), c = b2.getCenter(new THREE.Vector3()); m.position.set(-c.x, -b2.min.y + BUS_GLB.y, -c.z);
    LIFE.bus.body.visible = false; LIFE.bus.wh.forEach(w => { w.visible = false; }); LIFE.bus.g.add(m); playClips(g, m); LIFE.bus.g.updateMatrixWorld(true);
  }
  for (const c of EXTRA_GLB) {
    const x = await loadGLB(c.url); if (!x) continue;
    const m = x.scene; m.position.set(c.pos[0], c.pos[1], c.pos[2]); m.rotation.y = c.rotY || 0; m.scale.setScalar(c.scale || 1); scene.add(m); m.updateMatrixWorld(true); playClips(x, m);
    if (renderer.shadowMap.enabled) renderer.shadowMap.needsUpdate = true;
  }
}

/* ============================ VÒNG LẶP ============================ */
const tmpV2 = new THREE.Vector3();
let doorO1 = -1, doorO2 = -1, yawC = 0, pitC = 0, lookInit = false;
const ROT_MAX = 2.4, ROT_K = 8;      // ROT_MAX = tốc độ quay camera tối đa (rad/giây); ROT_K = độ êm khi quay (càng nhỏ càng êm/trễ)
function tick(now) {
  raf = requestAnimationFrame(tick);
  const raw = now - last; if (raw < 14.5) return;                          // màn 120/144Hz: giới hạn ~60 khung/giây cho đều
  last = now; const dt = Math.min(.05, raw / 1000); adapt(raw);
  if (PERF) renderer.info.reset();
  target = clamp(scroller.scrollTop / maxScroll);
  if (snapMoving && !touching && now - snapT0 > 200) { snapMoving = false; doSnap(); target = clamp(scroller.scrollTop / maxScroll); }
  if (dt > 0) springTo(target, dt); if (Math.abs(target - sp) < 2e-5 && Math.abs(SPR.vel) < 2e-4) { sp = target; SPR.vel = 0; }
  // camera: vị trí chạy theo đường cong; hướng nhìn được làm mượt + giới hạn tốc độ quay (hết chóng mặt), không bao giờ nghiêng (roll = 0)
  const u = mapU(sp); posC.getPoint(u, tmpV); camera.position.copy(tmpV);
  lookC.getPoint(u, tmpV2); const dx = tmpV2.x - tmpV.x, dy = tmpV2.y - tmpV.y, dz = tmpV2.z - tmpV.z;
  const wy = Math.atan2(-dx, -dz), wp = Math.atan2(dy, Math.hypot(dx, dz));
  if (!lookInit) { yawC = wy; pitC = wp; lookInit = true; }
  else {
    const dyw = Math.atan2(Math.sin(wy - yawC), Math.cos(wy - yawC)), f = 1 - Math.exp(-dt * ROT_K), lim = ROT_MAX * dt;
    yawC += clamp(dyw * f, -lim, lim); pitC += clamp((wp - pitC) * f, -lim * .6, lim * .6);
  }
  if (fx) {                                                                  // V7: hiệu ứng mở trang — camera tiến lại gần vật thể rồi trả về đường cũ
    const wv = fxStep(now, dt);
    if (wv > 0 && fx) { const d = fx.def; camera.position.lerp(d.P, wv); const ex = d.L.x - camera.position.x, ey = d.L.y - camera.position.y, ez = d.L.z - camera.position.z;
      const fy = Math.atan2(-ex, -ez), fp = Math.atan2(ey, Math.hypot(ex, ez)); camera.rotation.set(pitC + (fp - pitC) * wv, yawC + Math.atan2(Math.sin(fy - yawC), Math.cos(fy - yawC)) * wv, 0); }
    else camera.rotation.set(pitC, yawC, 0);
  } else camera.rotation.set(pitC, yawC, 0);
  ambientCam(now, dt);
  camera.updateMatrixWorld();
  windStep(now, dt);
  lifeStep(now, dt);
  // cửa kính trượt mở (13%..19%) và cửa kho mở (85%..90%) — chỉ cập nhật khi cửa thực sự đổi
  const o1 = sm((sp - .13) / .06), o2 = sm((sp - .85) / .05);
  if (Math.abs(o1 - doorO1) > 1e-4 || Math.abs(o2 - doorO2) > 1e-4) {
    doorO1 = o1; doorO2 = o2;
    slideL.position.x = -1.2 - o1 * 1.1; slideR.position.x = 1.2 + o1 * 1.1; khoL.rotation.y = o2 * 1.75; khoR.rotation.y = -o2 * 1.75;
    slideL.updateMatrixWorld(true); slideR.updateMatrixWorld(true); khoL.updateMatrixWorld(true); khoR.updateMatrixWorld(true);
    if (renderer.shadowMap.enabled) renderer.shadowMap.needsUpdate = true;
  }
  // màn hình động
  if (sp > .38 && sp < .64 && now - (LIVE.tvT || 0) > 125) { LIVE.tvT = now; drawTV(LIVE.tv.g, 512, 288, now / 1000); LIVE.tv.t.needsUpdate = true; }
  if (sp > .54 && sp < .78 && now - (LIVE.clT || 0) > 1000) { LIVE.clT = now; drawClock(LIVE.clock.g, 256, 192); LIVE.clock.t.needsUpdate = true; }
  if (altarLight) altarLight.intensity = 1.1 + Math.sin(now / 130) * .12 + (FXO.boost || 0);
  // rê chuột lên vật thể 3D
  if (needRay && ptrXY) { needRay = false; const h = pickMid(ptrXY[0], ptrXY[1]); if (h !== hover) { hover = h; scroller.style.cursor = h ? 'pointer' : ''; } }
  if (useComposer && composer) composer.render(); else renderer.render(scene, camera);
  updateHud(); updateDots(now); updateEndBtn(); if (PERF) perfHud(now);
  if (fly && (Math.abs(sp - fly.target) < .012 || now - fly.t0 > 3500)) { const cb = fly.cb, id = fly.id; fly = null; if (id && canFx(id)) startFx(id, cb, now); else if (cb) setTimeout(cb, 350); }
}
const KX = CAM.map(k => k[0]), KY = CAM.map((k, i) => i / (CAM.length - 1));
const KM = (() => {                                                           // nội suy đơn điệu Hermite (PCHIP): vận tốc liên tục tại mọi khung camera => hết giật cục
  const n = KX.length, d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) d[i] = (KY[i + 1] - KY[i]) / (KX[i + 1] - KX[i]);
  m[0] = d[0]; m[n - 1] = d[n - 2]; for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : 2 * d[i - 1] * d[i] / (d[i - 1] + d[i]);
  return m;
})();
function mapU(p) {
  p = clamp(p); let i = 0; while (i < KX.length - 2 && p > KX[i + 1]) i++;
  const h = KX[i + 1] - KX[i], t = (p - KX[i]) / h, t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * KY[i] + (t3 - 2 * t2 + t) * h * KM[i] + (-2 * t3 + 3 * t2) * KY[i + 1] + (t3 - t2) * h * KM[i + 1];
}
/* ---- ĐIỂM DỪNG: cuộn xong (nghỉ ~0.16s) camera tự hít vào điểm gần nhất theo hướng cuộn; cuộn ngắn = sang điểm kế tiếp ---- */
const STOPS = [0, .12, .19, .33, .50, .65, .75, .78, .81, .88, 1];
const SPR = { time: .34, max: .55, vel: 0 };                                   // lò xo giảm chấn tới hạn: time = độ êm (giây), max = tốc độ tối đa (tiến độ/giây)
let snapMoving = false, snapT0 = 0, snapFrom = 0, snapRest = 0, snapSkip = 0, touching = false, pinned = -1;
function springTo(goal, dt) {
  const om = 2 / SPR.time, x = om * dt, e = 1 / (1 + x + .48 * x * x + .235 * x * x * x), mc = SPR.max * SPR.time;
  const ch = clamp(sp - goal, -mc, mc), g2 = sp - ch, tmp = (SPR.vel + om * ch) * dt;
  SPR.vel = (SPR.vel - om * tmp) * e; let out = g2 + (ch + tmp) * e;
  if ((goal - sp > 0) === (out > goal)) { out = goal; SPR.vel = (out - sp) / dt; }
  sp = out;
}
const SNAP_R = .02;                                                         // chỉ hít khi nghỉ cuộn rất gần 1 điểm dừng (2% hành trình); xa hơn thì giữ nguyên chỗ người dùng dừng
function doSnap() {
  if (fly || N.edit() || maxScroll < 2) { snapRest = target; return; }
  if (pinned >= 0 && Math.abs(target - pinned) < .008) { snapRest = target; return; }
  let best = target, bd = 1; for (let i = 0; i < STOPS.length; i++) { const d = Math.abs(STOPS[i] - target); if (d < bd) { bd = d; best = STOPS[i]; } }
  if (bd < SNAP_R && bd > 1e-4) { snapRest = best; snapSkip = performance.now() + 90; scroller.style.scrollBehavior = 'auto'; scroller.scrollTop = best * maxScroll; }
  else snapRest = target;
}
const Q = { warm: 0, pr: 0, max: 1, min: .85, acc: 0, n: 0, good: 0, t: 0, up: 0 };            // chất lượng thích ứng: tự giảm độ phân giải/hiệu ứng khi máy yếu
const PERF = /[?&]perf/.test(location.search); let PERFEL = null; const PF = { n: 0, t: 0 };
let rsT = 0; function resizeSoon() { clearTimeout(rsT); rsT = setTimeout(resize, 140); }
function applyPR() {
  renderer.setPixelRatio(Q.pr); renderer.setSize(W, H, false); canvas.style.width = '100%'; canvas.style.height = '100%';
  if (composer) { composer.setPixelRatio(Q.pr); composer.setSize(W, H); }
  if (film) film.uniforms.px.value.set(1 / (W * Q.pr), 1 / (H * Q.pr));
}
function resize() {
  if (!world || !renderer) return; const w = world.clientWidth, h = world.clientHeight; if (w < 10 || h < 10) return;
  W = w; H = h; Q.max = Math.min(window.devicePixelRatio || 1, LOW ? 1 : 1.75); if (!Q.pr || Q.pr > Q.max) Q.pr = Q.max;
  applyPR();
  camera.aspect = w / h; camera.fov = w / h < .75 ? 80 : w / h < 1.2 ? 68 : 58; camera.updateProjectionMatrix();   // FOV rộng hơn khi màn dọc
  stk.style.height = h + 'px'; stk.style.marginBottom = -h + 'px'; spc.style.height = (h * 7) + 'px';            // ruột cuộn khoảng 700vh
  maxScroll = Math.max(1, scroller.scrollHeight - scroller.clientHeight); scroller.scrollTop = target * maxScroll;
}
function degrade() {
  const now = performance.now();
  if (Q.up && now - Q.up < 8000) { Q.max = Math.max(Q.pr - .15, Q.min); Q.up = 0; }          // vừa tăng đã tụt => khóa trần, khỏi dao động
  if (Q.pr > Q.min + .01) { Q.pr = Math.max(Q.min, Q.pr - .15); applyPR(); }
  else if (bloom && bloom.enabled) bloom.enabled = false;
  else if (useComposer) useComposer = false;
}
function adapt(raw) {
  if (performance.now() < Q.warm) { Q.n = 0; Q.acc = 0; return; }                            // 5 giây đầu: khung hình chậm do nạp texture/biên dịch, không tính để khỏi tụt độ nét
  if (raw > 250) { Q.n = 0; Q.acc = 0; return; }                                              // vừa mở lại tab / bị treo: bỏ qua
  Q.acc += raw; Q.n++; if (Q.n < 40) return;
  const avg = Q.acc / Q.n, now = performance.now(); Q.acc = 0; Q.n = 0;
  if (avg > 25) { Q.good = 0; if (now - Q.t > 1200) { Q.t = now; degrade(); } }
  else if (avg < 18.5) { if (++Q.good >= 3 && Q.pr < Q.max - .01 && now - Q.t > 3000) { Q.good = 0; Q.t = now; Q.up = now; Q.pr = Math.min(Q.max, Q.pr + .1); applyPR(); } }
  else Q.good = 0;
}
function perfHud(now) {
  if (!PERFEL) { PERFEL = document.createElement('div'); PERFEL.style.cssText = 'position:fixed;left:8px;top:8px;z-index:99999;background:rgba(0,0,0,.72);color:#9f9;font:12px/1.4 monospace;padding:6px 8px;border-radius:6px;pointer-events:none;white-space:pre'; document.body.appendChild(PERFEL); }
  PF.n++; if (now - PF.t < 500) return; const i = renderer.info;
  PERFEL.textContent = `${Math.round(PF.n * 1000 / (now - PF.t))} fps | pr ${Q.pr.toFixed(2)} | ${useComposer ? (bloom && bloom.enabled ? 'bloom' : 'post') : 'direct'}\ncalls ${i.render.calls} | tris ${Math.round(i.render.triangles / 1000)}k | tex ${i.memory.textures} | geo ${i.memory.geometries} | lights ${scene.children.filter(o => o.isLight).length}`;
  PF.n = 0; PF.t = now;
}
function shouldRun() { const b = document.body.classList; return API.ready && !document.hidden && !b.contains('imm') && !b.contains('lm'); }
function sync() {
  const run = shouldRun(); setUiShown(run); syncEdit(); if (!run) abortFx();
  if (run && !raf) { resize(); sp = target; lookInit = false; last = performance.now(); raf = requestAnimationFrame(tick); }
  else if (!run && raf) { cancelAnimationFrame(raf); raf = 0; keepP = sp; target = sp; SPR.vel = 0; }            // tạm dừng khi tab ẩn / mở trang con / chế độ danh sách
}

/* ============================ KHỞI TẠO ============================ */

/* ============================ V6: CỔNG CHỌN "TRẺ / CÓ TUỔI" + NÚT DANH SÁCH Ở CUỐI ============================
   - Mới vào: vẫn thấy cửa hàng 3D (camera ở tiến độ 0), phủ thêm hộp hỏi "Bạn là người…?" — cuộn bị khóa tới khi chọn.
   - Chọn "Trẻ"      => vào 3D như cũ.
   - Chọn "Có tuổi"  => bật chế độ danh sách: thêm class LIST_CLASS vào <body> (index.html đã dùng class này: scene.js tự dừng khi có nó).
   - Cuối hành trình 3D (tiến độ > 95%) hiện nút "Xem bằng dạng danh sách".
   Chỉnh nhanh: LIST_CLASS (tên class danh sách), END_BTN_BOTTOM (khoảng cách nút tới đáy), chữ trong GATE_TXT. */
const LIST_CLASS = 'lm', END_BTN_BOTTOM = '24px';
const GATE_TXT = { title: 'Bạn thích xem kiểu nào?', sub: 'Chọn sai cũng không sao, đổi ý lúc nào cũng được', young: 'Lướt như TikTok', youngSub: 'Vuốt một phát bay tới tận tủ đông', youngIc: '📱', old: 'Đọc như tờ báo', oldSub: 'Chữ to, rõ từng dòng, không lo lạc đường', oldIc: '👓', end: 'Mỏi tay rồi? Xem dạng danh sách' };
const UI = { gate: null, btn: null, open: false, prevOverflow: '', endK: '' };
function enterList() { document.body.classList.add(LIST_CLASS); }               // index.html lo phần hiển thị danh sách; MutationObserver trong boot() sẽ tự dừng 3D
function setGate(open) {
  UI.open = open; if (!UI.gate) return;
  if (open) { UI.prevOverflow = scroller.style.overflowY; scroller.style.overflowY = 'hidden'; UI.gate.hidden = false; UI.gate.classList.remove('out'); requestAnimationFrame(() => UI.gate.classList.add('in')); }
  else { scroller.style.overflowY = UI.prevOverflow; UI.gate.classList.remove('in'); UI.gate.classList.add('out'); setTimeout(() => { if (!UI.open) UI.gate.hidden = true; }, 450); }
}
function buildGate() {
  if (UI.gate) return;
  const css = document.createElement('style'); css.id = 'v6css';
  css.textContent = `
#agate{position:fixed;inset:0;z-index:60;display:flex;align-items:flex-end;justify-content:center;padding:16px 16px calc(max(20px,env(safe-area-inset-bottom)) + clamp(90px,24vh,240px));box-sizing:border-box;font-family:${FONT};
  background:linear-gradient(to top,rgba(14,10,4,.3) 0%,rgba(14,10,4,.1) 40%,rgba(14,10,4,0) 70%);opacity:0;transition:opacity .45s ease}
#agate.in{opacity:1}#agate.out{opacity:0;pointer-events:none}#agate[hidden]{display:none}
#agate .box{width:min(440px,100%);text-align:center;color:#fff}
#agate h2{margin:0 0 3px;font-size:clamp(18px,4.2vw,24px);font-weight:800;text-shadow:0 2px 10px rgba(0,0,0,.75)}
#agate p{margin:0 0 12px;font-size:clamp(12px,3vw,13.5px);font-weight:500;opacity:.92;text-shadow:0 1px 6px rgba(0,0,0,.75)}
#agate .row{display:flex;gap:10px}
#agate .opt{display:flex!important;flex-direction:column!important;flex:1;cursor:pointer;user-select:none;min-height:56px;border:1.5px solid rgba(255,255,255,.55);border-radius:16px;cursor:pointer;font:inherit;color:#fff;padding:8px 10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;
  background:rgba(255,255,255,.1);-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px);box-shadow:0 6px 18px rgba(0,0,0,.18);
  transition:transform .25s cubic-bezier(.3,1.5,.5,1),background .25s,border-color .25s,box-shadow .25s;animation:aflt 3.6s ease-in-out infinite}
#agate .o{animation-delay:-1.8s}
#agate .opt:hover,#agate .opt:focus-visible{transform:translateY(-4px) scale(1.05);background:rgba(255,255,255,.22);border-color:#ffe08a;box-shadow:0 12px 26px rgba(0,0,0,.3),0 0 22px rgba(255,224,138,.45);outline:none}
#agate .opt:active{transform:scale(.97)}
#agate .opt:hover i,#agate .opt:focus-visible i{animation:awig .6s ease-in-out infinite}
#agate i{font-style:normal;font-size:clamp(20px,4.6vw,24px);display:inline-block;line-height:1}
#agate b{font-size:clamp(15px,3.6vw,18px);font-weight:800;text-shadow:0 1px 6px rgba(0,0,0,.6)}
#agate small{font-size:clamp(11px,2.8vw,12.5px);font-weight:600;opacity:.92;text-shadow:0 1px 6px rgba(0,0,0,.6)}
#agate .opt b,#agate .opt small{display:block;text-align:center}
#agate.ed{pointer-events:none}#agate.ed [data-k]{pointer-events:auto;user-select:text}#agate.ed .opt{animation:none;cursor:text}
#alist.ed{opacity:1!important;visibility:visible!important;pointer-events:auto!important}#alist [data-k]{cursor:inherit}
@keyframes aflt{0%,100%{translate:0 0}50%{translate:0 -3px}}
@keyframes awig{0%,100%{transform:rotate(0)}25%{transform:rotate(-14deg) scale(1.15)}75%{transform:rotate(14deg) scale(1.15)}}
@media(prefers-reduced-motion:reduce){#agate .opt,#agate .opt:hover i{animation:none}}
@media(max-width:480px){#agate .row{flex-direction:column}}
#alist{position:fixed;left:50%;bottom:calc(${END_BTN_BOTTOM} + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:45;border:0;border-radius:999px;padding:16px 28px;cursor:pointer;
  font:800 clamp(17px,4.4vw,20px) ${FONT};background:#F2B705;color:#2a1c00;box-shadow:0 8px 24px rgba(0,0,0,.4);opacity:0;visibility:hidden;pointer-events:none;white-space:nowrap}
#alist:focus-visible{outline:4px solid #fff;outline-offset:3px}`;
  document.head.appendChild(css);
  const g = document.createElement('div'); g.id = 'agate'; g.hidden = true; g.setAttribute('role', 'dialog'); g.setAttribute('aria-modal', 'true'); g.setAttribute('aria-label', GATE_TXT.title);
  g.innerHTML = `<div class="box"><h2 data-k="gate.title">${GATE_TXT.title}</h2><p data-k="gate.sub">${GATE_TXT.sub}</p><div class="row"><div class="opt y" role="button" tabindex="0" data-g="y"><i>${GATE_TXT.youngIc}</i><b data-k="gate.y.t">${GATE_TXT.young}</b><small data-k="gate.y.s">${GATE_TXT.youngSub}</small></div><div class="opt o" role="button" tabindex="0" data-g="o"><i>${GATE_TXT.oldIc}</i><b data-k="gate.o.t">${GATE_TXT.old}</b><small data-k="gate.o.s">${GATE_TXT.oldSub}</small></div></div></div>`;
  const isEd = () => document.body.classList.contains('edit');                          // đang ở chế độ quản trị sửa chữ: bấm vào nút chỉ để sửa chữ, không chọn
  const pick = b => { if (isEd()) return; setGate(false); if (b.dataset.g === 'o') enterList(); };
  g.addEventListener('pointerover', e => { const b = e.target.closest('.opt'); if (b && !isEd()) poke(b.dataset.g === 'y' ? 1.3 : .7); });   // rê chuột qua nút: gió nổi lên, hổ vàng lắc người
  g.addEventListener('click', e => { const b = e.target.closest('.opt'); if (b) pick(b); });
  g.addEventListener('keydown', e => { if (e.key !== 'Enter' && e.key !== ' ') return; const b = e.target.closest && e.target.closest('.opt'); if (b && e.target === b) { e.preventDefault(); pick(b); } });
  document.body.appendChild(g); UI.gate = g;
  const b = document.createElement('div'); b.id = 'alist'; b.setAttribute('role', 'button'); b.tabIndex = 0; b.innerHTML = '<span>📋 </span><span data-k="gate.end">' + GATE_TXT.end + '</span>';
  b.addEventListener('click', () => { if (!isEd()) enterList(); });
  b.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === b && !isEd()) { e.preventDefault(); enterList(); } });
  document.body.appendChild(b); UI.btn = b;
  try { if (N.apply) N.apply(); } catch (e) { }                                    // nạp chữ đã lưu (nếu quản trị viên đã sửa) vào các phần tử data-k của cổng
  syncEdit();
}
function openGate() {                                                              // gọi SAU khi màn hình tải đã tắt, tránh hộp chọn nằm trên nền đen
  if (UI.gateShown || !UI.gate) return; UI.gateShown = true;
  if (!(N.edit && N.edit())) setGate(true);                                        // quản trị viên đang ở chế độ sửa thì khỏi hỏi
}
function syncEdit() {                                                              // quản trị viên bật/tắt "Chỉnh sửa chữ": hiện cổng + nút cuối để sửa chữ trực tiếp
  if (!UI.gate) return; const ed = document.body.classList.contains('edit'); if (ed === !!UI.ed) return; UI.ed = ed;
  UI.gate.classList.toggle('ed', ed); UI.btn.classList.toggle('ed', ed);
  if (ed && UI.gate.hidden) { UI.edShown = true; UI.gate.hidden = false; UI.gate.classList.remove('out'); requestAnimationFrame(() => UI.gate.classList.add('in')); }
  else if (!ed && UI.edShown) { UI.edShown = false; if (!UI.open) { UI.gate.classList.remove('in'); UI.gate.classList.add('out'); setTimeout(() => { if (!UI.open && !UI.ed) UI.gate.hidden = true; }, 450); } }
}
function setUiShown(run) {                                                         // gọi từ sync(): ẩn cổng + nút khi đang ở danh sách / trang con / tab ẩn
  if (!UI.gate) return;
  if (document.hidden) return;
  const on = !document.body.classList.contains(LIST_CLASS) && !document.body.classList.contains('imm');
  UI.gate.style.display = on ? '' : 'none'; UI.btn.style.display = on ? '' : 'none';
  if (!on && UI.open) { UI.open = false; scroller.style.overflowY = UI.prevOverflow; UI.gate.hidden = true; }   // vào danh sách bằng đường khác thì mở khóa cuộn
}
function updateEndBtn() {
  if (!UI.btn) return; const e = sm((sp - .955) / .035), k = e.toFixed(2); if (k === UI.endK) return; UI.endK = k;
  UI.btn.style.opacity = k; UI.btn.style.visibility = e < .02 ? 'hidden' : 'visible'; UI.btn.style.pointerEvents = e > .5 ? 'auto' : 'none';
}
const wait = ms => new Promise(r => setTimeout(r, ms));
async function boot() {
  world = $('world'); scroller = $('scroller'); stk = $('stk'); spc = $('spc'); canvas = document.createElement('canvas'); $('wcv').appendChild(canvas);
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;
  if (!LOW) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true; }   // bóng vẽ 1 lần (cảnh tĩnh); chỉ vẽ lại khi cửa chuyển động
  if (PERF) renderer.info.autoReset = false;
  camera = new THREE.PerspectiveCamera(60, 1, .1, 220); camera.rotation.order = 'YXZ';
  posC = new THREE.CatmullRomCurve3(CAM.map(k => new THREE.Vector3(k[1][0], k[1][1], k[1][2])), false, 'centripetal');
  lookC = new THREE.CatmullRomCurve3(CAM.map(k => new THREE.Vector3(k[2][0], k[2][1], k[2][2])), false, 'centripetal');
  // màn hình tải với phần trăm thật
  const mgr = new THREE.LoadingManager(); const pct = $('wpct');
  mgr.onProgress = (u, l, t) => { pct.textContent = Math.round(l / t * 100) + '%'; $('wfill').style.width = (l / t * 100) + '%'; };
  const steps = ['font', 'logo', 'post', 'sky', 'plaza', 'facade', 'interior', 'objects', 'decor', 'start']; steps.forEach(s => mgr.itemStart(s));
  const fin = async s => { mgr.itemEnd(s); await wait(30); };
  try { await Promise.race([document.fonts.load('700 40px "Be Vietnam Pro"'), wait(1500)]); } catch (e) { } await fin('font');
  const logo = await new Promise(res => new THREE.ImageLoader(mgr).load('assets/logo.png', res, undefined, () => res(null))); await fin('logo');
  if (!LOW) {                                                                                      // bloom nhẹ, chỉ máy mạnh
    try {
      const [a, b, c, d, e2] = await Promise.all([import('three/addons/postprocessing/EffectComposer.js'), import('three/addons/postprocessing/RenderPass.js'), import('three/addons/postprocessing/UnrealBloomPass.js'), import('three/addons/postprocessing/OutputPass.js'), import('three/addons/postprocessing/ShaderPass.js')]);
      composer = new a.EffectComposer(renderer, new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: 2 })); composer.addPass(new b.RenderPass(scene, camera));
      bloom = new c.UnrealBloomPass(new THREE.Vector2(256, 256), .28, .5, 1.3); composer.addPass(bloom); composer.addPass(new d.OutputPass());
      composer.addPass(film = new e2.ShaderPass({                                                         // tông phim: vignette nhẹ, tương phản mềm, ấm vàng ở vùng sáng
        uniforms: { tDiffuse: { value: null }, px: { value: new THREE.Vector2(1 / 1280, 1 / 720) } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'uniform sampler2D tDiffuse; uniform vec2 px; varying vec2 vUv; void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; vec3 bl = (texture2D(tDiffuse, vUv + vec2(px.x, 0.0)).rgb + texture2D(tDiffuse, vUv - vec2(px.x, 0.0)).rgb + texture2D(tDiffuse, vUv + vec2(0.0, px.y)).rgb + texture2D(tDiffuse, vUv - vec2(0.0, px.y)).rgb) * .25; c += (c - bl) * .6; c = max(c, 0.0); vec2 q = vUv - .5; float v = smoothstep(.98, .3, length(q * vec2(1.0, .85)));'
          + ' c = mix(c * c * (3.0 - 2.0 * c), c, .55); float l = dot(c, vec3(.299, .587, .114)); c = mix(vec3(l), c, 1.22);'
          + ' c += vec3(-.005, .002, .008) * (1.0 - smoothstep(.0, .4, l)); c += vec3(.035, .018, -.01) * smoothstep(.45, 1.0, l); c *= mix(.9, 1.0, v); gl_FragColor = vec4(max(c, 0.0), 1.0); }' }));
      useComposer = true;
    } catch (e) { composer = null; useComposer = false; }
  }
  await fin('post');
  stageSky(); await iblSky(); await fin('sky'); stagePlaza(); await fin('plaza'); stageFacade(logo); stageTiger(); await fin('facade'); stageInterior(); await fin('interior'); stageObjects(); await fin('objects');
  await loadProductImages(); stageDecor(); await fin('decor');
  if (V12_ON) {                                                                                      // V12: phố sống động + chi tiết gian hàng (mỗi phần bọc try/catch)
    try { BGU = await import('three/addons/utils/BufferGeometryUtils.js'); } catch (e) { BGU = null; console.warn('[9Sach] không nạp được BufferGeometryUtils, bỏ gộp mesh'); }
    safe('street', stageStreetPlus); safe('shop', stageShopPlus); safe('inside', stageInsidePlus); safe('bus', stageBus);
  }
  applyIBL();
  buildDots();
  scene.updateMatrixWorld(true); scene.matrixWorldAutoUpdate = false;       // cảnh tĩnh: khỏi tính lại ma trận hàng nghìn vật thể mỗi khung; chỉ cửa được cập nhật tay trong tick()
  if (renderer.shadowMap.enabled) renderer.shadowMap.needsUpdate = true;
  // sự kiện
  new ResizeObserver(resizeSoon).observe(world); window.addEventListener('resize', resizeSoon); if (window.visualViewport) visualViewport.addEventListener('resize', resizeSoon);
  scroller.addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; lastTouch = false; ptrXY = [e.clientX, e.clientY]; needRay = true; });
  scroller.addEventListener('pointerleave', () => { ptrXY = null; hover = null; scroller.style.cursor = ''; });
  scroller.addEventListener('pointerdown', e => { lastTouch = e.pointerType === 'touch'; touching = true; });
  ['pointerup', 'pointercancel', 'touchend', 'touchcancel'].forEach(ev => window.addEventListener(ev, () => { touching = false; snapT0 = performance.now(); }, { passive: true }));
  scroller.addEventListener('scroll', () => {
    const t = performance.now(); if (t < snapSkip) return;
    if (!snapMoving) { snapMoving = true; snapFrom = snapRest; } snapT0 = t;
    if (pinned >= 0 && Math.abs(scroller.scrollTop / maxScroll - pinned) > .02) pinned = -1;
  }, { passive: true });
  scroller.addEventListener('click', e => { if (N.edit()) return; const mid = pickMid(e.clientX, e.clientY); if (mid) openMod(mid); else active = null; });
  window.addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; const P = WIND.ptr; if (P.has) WIND.spd += Math.hypot(e.clientX - P.x, e.clientY - P.y); P.x = e.clientX; P.y = e.clientY; P.has = true; }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => { WIND.ptr.has = false; });
  canvas.addEventListener('webglcontextlost', e => e.preventDefault());
  document.addEventListener('visibilitychange', sync); new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  fxInit(); windInit(); resize(); renderer.compile(scene, camera); fxWarmDone();
  if (GLB_ON) glbStart();                                                                             // nạp .glb (nếu có) ở nền, không chặn màn hình tải
  try { buildGate(); console.info('[9Sach] scene.js ' + API.version + ' — cổng Trẻ/Có tuổi đã dựng'); } catch (err) { console.error('[9Sach] buildGate lỗi:', err); }
  API.ready = true; sync();                                                                          // bật vòng lặp ngay để vẽ khung hình đầu tiên khi màn hình tải còn che
  await Promise.race([new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))), wait(900)]);   // chờ 2 khung hình thật được vẽ (tránh canvas đen lộ ra)
  await fin('start'); $('wload').classList.add('hide'); Q.warm = performance.now() + 5000; setTimeout(openGate, 350);
}

API.version = 'v12.1';
API.start = function () { if (!API._p) API._p = boot().then(() => { API.ready = true; sync(); }); return API._p; };
API.flyTo = function (id, cb) {                                                                    // camera bay tới vật thể rồi gọi cb
  const h = HOT[id]; if (!h || !API.ready) { if (cb) cb(); return; }
  fly = { target: h.foc, cb, id, t0: performance.now() }; pinned = h.foc; snapMoving = false; snapRest = h.foc; scroller.scrollTo({ top: h.foc * maxScroll, behavior: 'smooth' });
};
API.showGate = function () { if (UI.gate) { document.body.classList.remove(LIST_CLASS); setGate(true); } };   // mở lại hộp hỏi Trẻ / Có tuổi
API.toTop = function () { if (API.ready) scroller.scrollTo({ top: 0, behavior: 'smooth' }); };
export default API;
