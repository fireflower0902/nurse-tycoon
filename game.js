/* =========================================================
 * 간호사 타이쿤: 오늘도 칼퇴 실패 — 3D PoC (STAGE 1 · 동네 의원)
 * Three.js (CDN importmap), 빌드 없음. 모바일 세로 화면 기준.
 * ========================================================= */
import * as THREE from 'three';
import { icon, hydrateIcons, EMOJI_ICON } from './icons.js';
hydrateIcons();

const $ = (s, r = document) => r.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const vibrate = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (_) {} };

// ================= 게임 설정 =================
const SAVE_KEY = 'nurse-tycoon-v1';
const DAY_SECONDS = 180;               // 09:00~18:00 을 실제 3분으로
const START_MIN = 9 * 60, END_MIN = 18 * 60;
const MIN_PER_SEC = (END_MIN - START_MIN) / DAY_SECONDS;
const MAX_TASKS = 5;
const WAIT_CAP = 8;
const NURSE_SPEED = 6.2;  // 간호사는 늘 뛰어다닌다   // 월드 유닛/초
const PATIENT_SPEED = 3.4;

const LAST = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황'];
const FIRST = ['순자', '영희', '민수', '지훈', '서연', '도윤', '하은', '영수', '말순', '정호', '수빈', '예준', '춘자', '미경', '현우', '옥자', '지아', '태식'];

const TYPES = {
  grandma:   { emoji: '👵', patience: 70, exam: 4.8 },
  grandpa:   { emoji: '👴', patience: 62, exam: 4.4 },
  worker:    { emoji: '🧑‍💼', patience: 30, exam: 2.8 },
  kid:       { emoji: '👶', patience: 36, exam: 3.0 },
  normal:    { emoji: '🧑', patience: 46, exam: 3.4 },
  emergency: { emoji: '🥵', patience: 16, exam: 0 },
};
const ORDER = {
  shot: { icon: '💉', label: '주사', fee: 3000 },
  iv:   { icon: '💧', label: '수액', fee: 6000 },
  heat: { icon: '♨️', label: '핫팩', fee: 2500 },
  none: { icon: '🧾', label: '처방만', fee: 1500 },
};
const ORDER_TABLE = {
  grandma: [['heat', 4], ['iv', 2], ['shot', 2], ['none', 2]],
  grandpa: [['heat', 4], ['iv', 2], ['shot', 2], ['none', 2]],
  worker:  [['iv', 4], ['shot', 3], ['none', 3]],
  kid:     [['none', 5], ['shot', 3], ['iv', 1]],
  normal:  [['shot', 3], ['iv', 2], ['heat', 2], ['none', 3]],
};
const ITEM_ICON = { shot: '💉', iv: '💧' };
const ORDER_ICON = { shot: 'syringe', iv: 'iv', heat: 'flame', none: 'card' };
const ITEM_SVG = { shot: 'syringe', iv: 'iv' };

const UPGRADES = {
  ivBed:   { name: '수액 침대 추가', icon: '🛏️', desc: '수액실 침대 +1', cost: [50000, 90000], max: 2 },
  heatBed: { name: '핫팩 침대 추가', icon: '♨️', desc: '물리치료실 침대 +1', cost: [40000, 75000], max: 2 },
  shoes:   { name: '푹신한 간호화', icon: '👟', desc: '이동 속도 +20%', cost: [45000], max: 1 },
  tv:      { name: '대기실 TV', icon: '📺', desc: '대기실 인내심 감소 -25%', cost: [60000], max: 1 },
  coffee:  { name: '탕비실 커피머신', icon: '☕', desc: '간식 회복량↑, 체력 소모 -20%', cost: [45000], max: 1 },
};
const UP_ICON = { ivBed: 'bed', heatBed: 'flame', shoes: 'shoe', tv: 'tv', coffee: 'cup' };
const fmtWon = (n) => (Math.abs(n) >= 10000 ? (n / 10000).toFixed(1).replace(/\.0$/, '') + '만' : n.toLocaleString('ko-KR'));
const RUDE_LINES = ['여기 왜 이렇게 느려요!', '내가 먼저 왔는데?!', '아가씨! 아가씨!', '원장 나오라 그래!', '주사 하나 놓는 데 뭐 이리 오래 걸려?', '돈 내고 왔는데 이게 뭐야!'];
const ERRANDS = [
  { label: '처방 대신 입력 좀', icon: 'clipboard', dur: 1.6 },
  { label: '커피 한 잔만~', icon: 'cup', dur: 1.2 },
  { label: '보험 서류 정리 좀', icon: 'doc', dur: 1.8 },
  { label: '내일 예약 확인해 줘', icon: 'phone', dur: 1.2 },
];
const PHONE_LINES = [
  '“오늘 몇 시까지 해요?”', '“독감 주사 예약 되나요?”', '약국: “처방 용량 확인 부탁드려요”',
  '“어제 받은 약 먹고 속이 쓰려요…”', '“주차 되나요?”', '“실비 서류 팩스로 보내주실 수 있어요?”',
];

// ================= 저장 =================
function defaultSave() {
  return { day: 1, money: 0, rating: 3.0, startStamina: 100, seen: {},
    up: { ivBed: 0, heatBed: 0, shoes: 0, tv: 0, coffee: 0 } };
}
function loadSave() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!raw) return defaultSave();
    const d = defaultSave();
    return { ...d, ...raw, up: { ...d.up, ...(raw.up || {}) }, seen: raw.seen || {} };
  } catch (_) { return defaultSave(); }
}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) {} }
let save = loadSave();
let S = null;

// ================= DOM =================
const mapEl = $('#map'), stageEl = $('#stage'), ovEl = $('#ov');
const el = {
  day: $('#day'), clock: $('#clock'), phase: $('#phase'), tlFill: $('#timeline-fill'), timeline: $('.timeline'),
  money: $('#money'), rating: $('#rating'), combo: $('#combo'),
  gH: $('#g-hunger'), gB: $('#g-bladder'), gS: $('#g-stamina'), gM: $('#g-mental'), trayCount: $('#tray-count'),
  hands: [...document.querySelectorAll('.hand')], queue: $('#queue'), check: $('#btn-check'),
  toasts: $('#toasts'), hint: $('#hint'),
};

// ================= 3D 기본 =================
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stageEl.appendChild(renderer.domElement);
$('#loading').remove();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 200);
const CAM_DIR = new THREE.Vector3(0, 1.35, 0.85).normalize();
const CAM_LOOK = new THREE.Vector3(0, 0, 0.9);

scene.add(new THREE.HemisphereLight(0xffffff, 0xaacfc6, 1.5));
const sun = new THREE.DirectionalLight(0xffffff, 1.7);
sun.position.set(7, 18, 9);
sun.castShadow = true;
sun.shadow.mapSize.set(1536, 1536);
Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 16, bottom: -16, near: 1, far: 60 });
sun.shadow.bias = -0.0006;
scene.add(sun);

const matCache = new Map();
function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.82, ...opts }));
  return matCache.get(key);
}
function mesh(geo, color, opts, shadow = true) {
  const m = new THREE.Mesh(geo, mat(color, opts));
  m.castShadow = shadow; m.receiveShadow = true;
  return m;
}
function box(w, h, d, color, x, y, z, parent, opts) {
  const m = mesh(new THREE.BoxGeometry(w, h, d), color, opts);
  m.position.set(x, y, z);
  if (parent) parent.add(m);
  return m;
}
function cyl(rt, rb, h, color, x, y, z, parent, seg = 14, opts) {
  const m = mesh(new THREE.CylinderGeometry(rt, rb, h, seg), color, opts);
  m.position.set(x, y, z);
  if (parent) parent.add(m);
  return m;
}
function sph(r, color, x, y, z, parent, opts) {
  const m = mesh(new THREE.SphereGeometry(r, 14, 10), color, opts);
  m.position.set(x, y, z);
  if (parent) parent.add(m);
  return m;
}

// ================= 의원 평면도 =================
// 왼쪽/오른쪽 방 열, 가운데 복도(x≈0), 입구는 앞쪽(+z)
const ROWS = [[-11, -5.5], [-5.5, 0], [0, 5.5], [5.5, 11]];
const COR = 1.1, XMAX = 6.6;
const CHAR_SCALE = 1.3;   // 캐릭터 크기 배율
const CHAIR_SCALE = 1.2;
const ROOM_DEF = {
  exam:    [-1, 0, '진료실', '#dff1ec'],
  cabinet: [1, 0, '약품장', '#e4eef6'],
  wait:    [-1, 1, '대기실', '#f8ecd2'],
  order:   [1, 1, '처치 대기', '#dfe8fa'],
  iv:      [-1, 2, '수액실', '#dcf0f6'],
  heat:    [1, 2, '물리치료실', '#f8e5d6'],
  desk:    [-1, 3, '접수·수납', '#e9e0f8'],
  pantry:  [1, 3, '탕비실', '#e8e8e8'],
};
const ROOMS = {};
for (const [k, [side, row, name, floor]] of Object.entries(ROOM_DEF)) {
  const x0 = side < 0 ? -XMAX : COR, x1 = side < 0 ? -COR : XMAX;
  const [z0, z1] = ROWS[row];
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  ROOMS[k] = { key: k, side, row, name, floor, x0, x1, z0, z1, cx, cz, door: { x: side * COR, z: cz } };
}
// 방 기준 좌표. +dx = 복도(문) 쪽이 되도록 좌우 대칭
const R = (k, dx, dz, extra = {}) => ({ x: ROOMS[k].cx + dx * -ROOMS[k].side, z: ROOMS[k].cz + dz, ...extra });
function roomAt(x, z) {
  if (Math.abs(x) < COR) return null;
  for (const r of Object.values(ROOMS)) if (x >= r.x0 - 0.01 && x <= r.x1 + 0.01 && z >= r.z0 - 0.01 && z <= r.z1 + 0.01) return r;
  return null;
}

// 바닥/벽
const world = new THREE.Group();
scene.add(world);
{
  const base = mesh(new THREE.BoxGeometry(XMAX * 2 + 1.4, 0.4, 24.6), '#9fc9be');
  base.position.set(0, -0.21, 0.6);
  world.add(base);
  const corridor = mesh(new THREE.BoxGeometry(COR * 2, 0.04, 23.4), '#d6e4e0');
  corridor.position.set(0, 0.0, 0.7);
  world.add(corridor);
  for (const r of Object.values(ROOMS)) {
    const f = mesh(new THREE.BoxGeometry(r.x1 - r.x0, 0.05, r.z1 - r.z0), r.floor);
    f.position.set(r.cx, 0.0, r.cz);
    world.add(f);
  }
  box(1.8, 0.03, 0.9, '#2bb5a0', 0, 0.03, 11.7, world); // 입구 매트

  const WALL = '#fbfdfc', TRIM = '#cfe3de';
  const wall = (x0, z0, x1, z1, h, color = WALL) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const w = box(len, h, 0.14, color, (x0 + x1) / 2, h / 2, (z0 + z1) / 2, world);
    w.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    return w;
  };
  wall(-XMAX, -11, XMAX, -11, 1.7);
  wall(-XMAX, -11, -XMAX, 11, 1.1);
  wall(XMAX, -11, XMAX, 11, 1.1);
  for (const z of [-5.5, 0, 5.5]) { wall(-XMAX, z, -COR, z, 0.55, TRIM); wall(COR, z, XMAX, z, 0.55, TRIM); }
  for (const r of Object.values(ROOMS)) {
    const x = r.side * COR;
    wall(x, r.z0, x, r.cz - 0.95, 0.55, TRIM);
    wall(x, r.cz + 0.95, x, r.z1, 0.55, TRIM);
  }
  const sign = box(3.6, 0.7, 0.12, '#2bb5a0', 0, 1.35, -10.9, world);
  sign.castShadow = false;
}

// ---------- 가구 ----------
function chair(x, z, rot, color, parent = world) {
  const g = new THREE.Group();
  box(0.46, 0.07, 0.42, color, 0, 0.3, 0, g);
  box(0.46, 0.42, 0.06, color, 0, 0.52, -0.2, g);
  cyl(0.04, 0.05, 0.28, '#8a9a97', 0, 0.14, 0, g, 8);
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  g.scale.setScalar(CHAIR_SCALE);
  parent.add(g);
  return g;
}
function plant(x, z, parent = world) {
  cyl(0.2, 0.15, 0.35, '#c98b5a', x, 0.18, z, parent, 10);
  sph(0.32, '#5cb874', x, 0.6, z, parent);
  sph(0.22, '#4aa863', x + 0.12, 0.82, z - 0.05, parent);
}

// 좌석: 가운데 통로(dz=aisle)를 두고 마주 보는 두 줄
const SEATS = {};
function seatRows(room, dxs, rowA, rowB, aisle, color) {
  const list = [];
  for (const [dz, face] of [[rowA, 0], [rowB, Math.PI]]) {
    for (const dx of dxs) {
      const p = R(room, dx, dz, { rot: face, via: R(room, dx, aisle) });
      list.push(p);
      chair(p.x, p.z - Math.cos(face) * 0.12, face, color);
    }
  }
  return list;
}
SEATS.wait = seatRows('wait', [-2.15, -1.0, 0.15, 1.3], -1.5, 1.5, 0, '#f2a65a');
SEATS.order = seatRows('order', [-2.15, -1.0, 0.15, 1.3], -1.5, 1.5, 0, '#6f9be0');
SEATS.exam = [];
for (const dx of [-2.25, -1.4, -0.55, 0.3, 1.15, 2.0]) {
  const p = R('exam', dx, 1.95, { rot: Math.PI, via: R('exam', dx, 1.1) });
  SEATS.exam.push(p);
  chair(p.x, p.z + 0.12, Math.PI, '#8fcfc0');
}
SEATS.pay = [];
for (let i = 0; i < 6; i++) SEATS.pay.push(R('desk', -2.25 + i * 0.85, 0.75, { rot: Math.PI }));

// 주요 지점
const SP = {
  doc: R('exam', -1.4, -0.35, { rot: Math.PI }),
  desk: R('desk', -1.0, -1.65, { rot: 0, via: R('desk', 2.4, -1.65) }),
  cab_shot: R('cabinet', -1.4, 0.15, { rot: Math.PI }),
  cab_iv: R('cabinet', 1.4, 0.15, { rot: Math.PI }),
  toilet: R('pantry', 1.3, 0.55, { rot: Math.PI }),
  snack: R('pantry', -0.6, 0.15, { rot: Math.PI }),
  exit: { x: 0, z: 12.6 },
  errand: R('exam', -0.35, -1.95, { rot: -Math.PI / 2, via: R('exam', -0.35, -0.5) }),
};

// 진료실
{
  const d = R('exam', -1.4, -1.35);
  box(1.7, 0.75, 0.8, '#c99a6b', d.x, 0.375, d.z, world);
  box(0.6, 0.4, 0.05, '#2d3436', R('exam', -1.05, -1.55).x, 0.98, d.z - 0.2, world);
  box(0.3, 0.04, 0.2, '#dddddd', R('exam', -1.8, -1.25).x, 0.77, d.z + 0.1, world);
  chair(d.x, d.z - 0.85, 0, '#555555');
  const b = R('exam', 1.9, -1.8);
  box(0.9, 0.5, 1.8, '#e7eeee', b.x, 0.25, b.z, world);
  box(0.85, 0.12, 1.75, '#9ad0e6', b.x, 0.56, b.z, world);
  const pl = R('exam', -2.4, -2.3); plant(pl.x, pl.z);
}
// 약품장
{
  const s = R('cabinet', 0, -2.35);
  box(4.8, 1.9, 0.55, '#f4f7f8', s.x, 0.95, s.z, world);
  box(4.6, 1.6, 0.04, '#bfe3f0', s.x, 1.05, s.z + 0.29, world, { transparent: true, opacity: 0.55 });
  const cols = ['#ff8a80', '#ffd180', '#80d8ff', '#b9f6ca', '#ea80fc'];
  for (let i = 0; i < 14; i++) box(0.22, 0.28, 0.2, cols[i % cols.length], s.x - 2.1 + (i % 7) * 0.7, i < 7 ? 0.65 : 1.25, s.z, world);
  for (const [k, dx] of [['shot', -1.4], ['iv', 1.4]]) {
    const t = R('cabinet', dx, -0.75);
    box(1.0, 0.75, 0.65, '#d7e7e3', t.x, 0.375, t.z, world);
    if (k === 'shot') {
      for (let i = 0; i < 3; i++) {
        const sy = cyl(0.035, 0.035, 0.36, '#e8f6ff', t.x - 0.25 + i * 0.25, 0.8, t.z, world, 8);
        sy.rotation.x = Math.PI / 2;
      }
    } else {
      for (let i = 0; i < 3; i++) box(0.22, 0.32, 0.06, '#9fdcff', t.x - 0.28 + i * 0.28, 0.92, t.z, world, { transparent: true, opacity: 0.8 });
    }
  }
}
// 대기실 / 처치 대기 소품
{
  const w = R('wait', 2.35, -2.3); plant(w.x, w.z);
  const wd = R('wait', -2.4, -2.35);
  box(0.4, 1.0, 0.4, '#e0f2ff', wd.x, 0.5, wd.z, world);
  cyl(0.15, 0.15, 0.35, '#7ec8f0', wd.x, 1.17, wd.z, world, 12, { transparent: true, opacity: 0.7 });
  const p = R('order', 2.35, 2.3); plant(p.x, p.z);
}
// 접수·수납 카운터
const PHONE_POS = R('desk', -2.1, -0.7);
let phoneMesh;
{
  const c = R('desk', -1.0, -0.7);
  box(3.3, 1.0, 0.6, '#b9a2e6', c.x, 0.5, c.z, world);
  box(3.4, 0.06, 0.75, '#f5f0ff', c.x, 1.03, c.z, world);
  const mon = R('desk', -0.4, -0.85);
  box(0.55, 0.38, 0.05, '#2d3436', mon.x, 1.27, mon.z, world);
  phoneMesh = new THREE.Group();
  box(0.32, 0.1, 0.22, '#3d3d3d', 0, 0, 0, phoneMesh);
  const h = box(0.36, 0.07, 0.09, '#ff6b5b', 0, 0.08, 0, phoneMesh);
  h.rotation.y = 0.2;
  phoneMesh.position.set(PHONE_POS.x, 1.12, PHONE_POS.z);
  world.add(phoneMesh);
  chair(SP.desk.x, SP.desk.z - 0.25, 0, '#555555');
  const rack = R('desk', -2.3, -2.35);
  box(0.9, 1.5, 0.4, '#d9c9ef', rack.x, 0.75, rack.z, world);
}
// 탕비실
{
  const t = R('pantry', 1.3, -1.3);
  box(1.6, 2.0, 1.7, '#9cc3e3', t.x, 1.0, t.z, world);
  box(0.75, 1.6, 0.05, '#5e8fb8', t.x, 0.8, t.z + 0.86, world);
  sph(0.05, '#ffd166', t.x + 0.25, 0.85, t.z + 0.9, world);
  const f = R('pantry', -1.6, -2.3);
  box(0.85, 1.75, 0.7, '#f7f7f7', f.x, 0.875, f.z, world);
  box(0.04, 0.5, 0.04, '#bbbbbb', f.x + 0.3, 1.1, f.z + 0.36, world);
  const tb = R('pantry', -0.6, -0.8);
  box(1.3, 0.75, 0.75, '#e2c7a6', tb.x, 0.375, tb.z, world);
  for (let i = 0; i < 4; i++) {
    const o = mesh(new THREE.ConeGeometry(0.11, 0.16, 3), '#f5f5f5');
    o.position.set(tb.x - 0.4 + i * 0.25, 0.83, tb.z + 0.1);
    world.add(o);
    box(0.13, 0.05, 0.03, '#2d3436', tb.x - 0.4 + i * 0.25, 0.79, tb.z + 0.17, world);
  }
}

// ---------- 업그레이드 장식(매일 재구성) ----------
const decor = new THREE.Group();
world.add(decor);
function buildDecor() {
  decor.clear();
  if (save.up.tv) {
    const t = R('wait', 0, -2.6);
    box(1.6, 0.95, 0.1, '#222222', t.x, 1.25, t.z, decor);
    box(1.45, 0.8, 0.02, '#4fb3ff', t.x, 1.25, t.z + 0.06, decor, { emissive: '#2a7fd0', emissiveIntensity: 0.6 });
  }
  if (save.up.coffee) {
    const c = R('pantry', -0.2, -0.85);
    box(0.32, 0.42, 0.3, '#3d3d3d', c.x, 0.96, c.z, decor);
    cyl(0.06, 0.05, 0.1, '#ffffff', c.x, 0.8, c.z + 0.12, decor, 8);
  }
}

// ================= 캐릭터 (치비 스타일) =================
const SKIN = '#f7d7bd';
function makeChibi(o) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const legGeo = new THREE.CylinderGeometry(0.065, 0.07, 0.26, 10);
  const legs = [-1, 1].map((s) => {
    const pv = new THREE.Group();
    pv.position.set(s * 0.085, 0.27, 0);
    const l = mesh(legGeo, o.pants); l.position.y = -0.13; pv.add(l);
    box(0.11, 0.07, 0.17, o.shoes || '#555555', 0, -0.25, 0.03, pv);
    body.add(pv);
    return pv;
  });
  const torso = cyl(0.16, 0.22, 0.36, o.top, 0, 0.44, 0, body, 16);
  const armGeo = new THREE.CapsuleGeometry(0.05, 0.2, 4, 8);
  const arms = [-1, 1].map((s) => {
    const pv = new THREE.Group();
    pv.position.set(s * 0.2, 0.58, 0);
    const a = mesh(armGeo, o.sleeve || o.top); a.position.y = -0.13; pv.add(a);
    sph(0.05, o.skin || SKIN, 0, -0.27, 0, pv);
    pv.rotation.z = s * 0.12;
    body.add(pv);
    return pv;
  });
  const head = new THREE.Group();
  head.position.y = 0.89;
  body.add(head);
  const skull = mesh(new THREE.SphereGeometry(0.27, 24, 18), o.skin || SKIN);
  head.add(skull);
  const eyes = [-1, 1].map((s) => {
    const e = sph(0.034, '#2a2320', s * 0.095, 0, 0.245, head);
    e.scale.y = o.eyeSquash || 1;
    e.castShadow = false;
    return e;
  });
  if (o.blush !== false) for (const s of [-1, 1]) {
    const b = sph(0.045, '#ffb0a8', s * 0.155, -0.075, 0.215, head);
    b.scale.set(1, 0.55, 0.3); b.castShadow = false;
  }
  const mouth = box(0.06, 0.016, 0.01, '#8a4a3f', 0, -0.105, 0.262, head);
  mouth.castShadow = false;
  if (o.hair) {
    const cap = mesh(new THREE.SphereGeometry(0.29, 24, 16, 0, Math.PI * 2, 0, Math.PI * (o.hairLen || 0.52)), o.hair);
    cap.position.y = 0.02; cap.rotation.x = -0.32;
    head.add(cap);
  }
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.26, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.12 }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.035;
  g.add(blob);
  const ch = { g, body, head, legs, arms, eyes, mouth, torso, blob, extras: {}, scale: o.scale || 1, walkT: Math.random() * 6, pose: null };
  g.scale.setScalar(ch.scale * CHAR_SCALE);
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.4, 8), new THREE.MeshBasicMaterial());
  hit.visible = false; hit.position.y = 0.65;
  g.add(hit);
  ch.hit = hit;
  return ch;
}
function glasses(head, color = '#222222', square = false) {
  for (const s of [-1, 1]) {
    if (square) box(0.1, 0.07, 0.01, color, s * 0.095, 0.0, 0.262, head, { transparent: true, opacity: 0.85 });
    else { const r = mesh(new THREE.TorusGeometry(0.058, 0.012, 6, 16), color); r.position.set(s * 0.095, 0, 0.258); head.add(r); }
  }
  box(0.08, 0.012, 0.01, color, 0, 0.01, 0.262, head);
}

// --- 플레이어: 짠한 간호사 ---
function makeNurse() {
  const n = makeChibi({ top: '#7fd3c4', pants: '#6cc5b5', shoes: '#f3f3f3', hair: '#3a2a22', eyeSquash: 0.42, hairLen: 0.5 });
  const h = n.head;
  // 대충 묶은 똥머리 + 삐져나온 머리카락
  sph(0.12, '#3a2a22', 0, 0.2, -0.2, h);
  for (const [rx, rz, len] of [[0.6, 0.5, 0.18], [-0.3, -0.7, 0.15], [0.9, -0.2, 0.13]]) {
    const st = cyl(0.012, 0.006, len, '#3a2a22', 0, 0.26, -0.24, h, 4);
    st.rotation.set(rx, 0, rz);
  }
  const ahoge = cyl(0.012, 0.004, 0.2, '#3a2a22', 0.03, 0.34, 0.05, h, 4);
  ahoge.rotation.set(0.5, 0, -0.4);
  for (const s of [-1, 1]) { const side = cyl(0.025, 0.012, 0.2, '#3a2a22', s * 0.24, -0.06, 0.1, h, 5); side.rotation.z = s * 0.15; }
  // 간호사 캡
  box(0.24, 0.07, 0.13, '#ffffff', 0, 0.28, 0.07, h);
  box(0.06, 0.016, 0.012, '#ff5b5b', 0, 0.29, 0.14, h);
  box(0.016, 0.05, 0.012, '#ff5b5b', 0, 0.29, 0.14, h);
  // 다크서클
  for (const s of [-1, 1]) {
    const dc = sph(0.05, '#a38bbd', s * 0.095, -0.045, 0.236, h);
    dc.scale.set(1.2, 0.42, 0.25); dc.castShadow = false;
  }
  // 걱정스러운 八자 눈썹
  for (const s of [-1, 1]) {
    const br = box(0.085, 0.016, 0.01, '#3a2a22', s * 0.1, 0.085, 0.255, h);
    br.rotation.z = s * -0.38; br.castShadow = false;
  }
  // 볼 밴드
  const band = box(0.09, 0.035, 0.012, '#f0c08c', 0.16, -0.035, 0.225, h);
  band.rotation.set(0, 0.5, 0.45);
  n.mouth.scale.set(0.7, 1, 1);
  // 명찰 + 펜
  box(0.09, 0.05, 0.01, '#ffffff', -0.08, 0.5, 0.19, n.body);
  cyl(0.01, 0.01, 0.1, '#3b6fb6', 0.09, 0.52, 0.19, n.body, 4);
  // 땀방울
  const sweat = new THREE.Group();
  sph(0.035, '#8fd3ff', 0, 0, 0, sweat, { transparent: true, opacity: 0.9 });
  const tip = mesh(new THREE.ConeGeometry(0.034, 0.06, 8), '#8fd3ff', { transparent: true, opacity: 0.9 });
  tip.position.y = 0.04; sweat.add(tip);
  sweat.position.set(-0.26, 0.1, 0.12);
  sweat.visible = false;
  h.add(sweat);
  n.extras.sweat = sweat;
  // 손에 든 물건
  n.extras.held = [0, 1].map((i) => {
    const g = new THREE.Group();
    g.position.set(0, -0.3, 0.05);
    n.arms[i].add(g);
    return g;
  });
  return n;
}
function heldItemMesh(item) {
  const g = new THREE.Group();
  if (item === 'shot') { const s = cyl(0.03, 0.03, 0.26, '#e8f6ff', 0, 0, 0.05, g, 8); s.rotation.x = Math.PI / 2; }
  else box(0.16, 0.22, 0.05, '#9fdcff', 0, 0, 0.06, g, { transparent: true, opacity: 0.85 });
  return g;
}

// --- NPC: 원장님 ---
function makeDoctor() {
  const d = makeChibi({ top: '#fafafa', pants: '#4a4f5a', shoes: '#3a2a22', hair: '#a9a9a9', hairLen: 0.36, eyeSquash: 0.8 });
  glasses(d.head, '#333333');
  box(0.05, 0.2, 0.02, '#3b6fb6', 0, 0.47, 0.19, d.body);
  const st = mesh(new THREE.TorusGeometry(0.15, 0.014, 6, 20, Math.PI * 1.2), '#2f3640');
  st.position.set(0, 0.6, 0.06); st.rotation.set(Math.PI / 2 + 0.3, 0, Math.PI * 0.9);
  d.body.add(st);
  for (const s of [-1, 1]) { const sh = sph(0.09, '#a9a9a9', s * 0.24, 0.0, -0.02, d.head); sh.scale.set(0.6, 1, 1); }
  const mus = box(0.12, 0.03, 0.02, '#8a8a8a', 0, -0.07, 0.262, d.head);
  mus.castShadow = false;
  return d;
}

// --- NPC: 환자들 ---
const NORMAL_LOOKS = [['#4fb37a', '#3b2a1a'], ['#e0a64f', '#2b2b2b'], ['#7c8cf0', '#5a3b22'], ['#e87fa5', '#2b2b2b']];
function makePatientModel(type) {
  let c;
  switch (type) {
    case 'grandma': {
      c = makeChibi({ top: '#b48ad6', pants: '#6b5a7a', scale: 0.92, eyeSquash: 0.35 });
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        sph(0.1, '#cfc8dc', Math.cos(a) * 0.19, 0.17 + (i % 2) * 0.04, Math.sin(a) * 0.17 - 0.04, c.head);
      }
      sph(0.15, '#cfc8dc', 0, 0.25, -0.03, c.head);
      const cane = cyl(0.02, 0.02, 0.62, '#8b5a2b', 0, -0.3, 0.06, c.arms[1], 6);
      cane.rotation.x = 0.1;
      c.mouth.scale.set(1.3, 1, 1);
      break;
    }
    case 'grandpa': {
      c = makeChibi({ top: '#8b6b4a', pants: '#555555', scale: 0.95, hair: '#cfcfcf', hairLen: 0.45, eyeSquash: 0.5 });
      cyl(0.27, 0.28, 0.1, '#5a6b4a', 0, 0.2, -0.02, c.head, 18);
      box(0.3, 0.03, 0.16, '#5a6b4a', 0, 0.16, 0.22, c.head);
      box(0.13, 0.04, 0.02, '#d0d0d0', 0, -0.07, 0.262, c.head);
      break;
    }
    case 'worker': {
      c = makeChibi({ top: '#2f4a7a', pants: '#2f4a7a', shoes: '#222222', hair: '#1f1f1f', hairLen: 0.5, eyeSquash: 0.7 });
      box(0.12, 0.08, 0.02, '#ffffff', 0, 0.59, 0.165, c.body);
      box(0.045, 0.2, 0.02, '#d64545', 0, 0.48, 0.19, c.body);
      glasses(c.head, '#111111', true);
      box(0.32, 0.22, 0.08, '#4a3528', 0, -0.36, 0.0, c.arms[1]);
      break;
    }
    case 'kid': {
      c = makeChibi({ top: '#ffcf4a', pants: '#4a7ac0', scale: 0.7, eyeSquash: 1.25 });
      const hat = mesh(new THREE.SphereGeometry(0.3, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), '#ffcf4a');
      hat.position.y = 0.03; c.head.add(hat);
      box(0.3, 0.03, 0.12, '#ffcf4a', 0, 0.1, 0.26, c.head);
      sph(0.07, '#ff8a80', 0, -0.3, 0.05, c.arms[0]);
      break;
    }
    case 'emergency': {
      c = makeChibi({ top: '#e0553f', pants: '#444444', hair: '#2b2b2b', skin: '#efd0c4', eyeSquash: 0.25 });
      c.arms[0].rotation.set(-1.25, 0, -0.55);
      c.keepArms = true;
      for (const [x, y] of [[0.24, 0.12], [-0.26, 0.05]]) sph(0.035, '#8fd3ff', x, y, 0.12, c.head, { transparent: true, opacity: 0.9 });
      c.mouth.scale.set(1.1, 2.5, 1);
      break;
    }
    default: {
      const [top, hair] = pick(NORMAL_LOOKS);
      c = makeChibi({ top, pants: '#3e4a5a', hair, hairLen: 0.5, eyeSquash: 0.8 });
      const m = box(0.3, 0.14, 0.05, '#f4f7f8', 0, -0.085, 0.235, c.head); // 마스크
      m.castShadow = false;
      break;
    }
  }
  return c;
}

function setPose(ch, pose) {
  if (ch.pose === pose) return;
  ch.pose = pose;
  ch.body.rotation.set(0, 0, 0);
  ch.body.position.set(0, 0, 0);
  ch.legs.forEach((l) => l.rotation.set(0, 0, 0));
  ch.blob.visible = true;
  if (pose === 'sit') {
    ch.legs.forEach((l) => (l.rotation.x = -Math.PI / 2));
    ch.body.position.y = 0.07;
    ch.body.position.z = -0.08;
  } else if (pose === 'lie') {
    ch.body.rotation.x = -Math.PI / 2;
    ch.body.position.y = 0.62;
    ch.blob.visible = false;
  }
}
function animateChibi(ch, dt, moving, t, run = false) {
  if (moving) {
    ch.walkT += dt * (run ? 18 : 11);
    const s = Math.sin(ch.walkT);
    const legA = run ? 0.95 : 0.6, armA = run ? 1.0 : 0.5;
    ch.legs[0].rotation.x = s * legA; ch.legs[1].rotation.x = -s * legA;
    if (!ch.keepArms) ch.arms[0].rotation.x = -s * armA - (run ? 0.35 : 0);
    ch.arms[1].rotation.x = s * armA - (run ? 0.35 : 0);
    ch.body.position.y = Math.abs(s) * (run ? 0.08 : 0.035);
  } else if (ch.pose === 'stand') {
    ch.legs[0].rotation.x = ch.legs[1].rotation.x = 0;
    if (!ch.keepArms) ch.arms[0].rotation.x = 0;
    ch.arms[1].rotation.x = 0;
    ch.body.position.y = 0;
  }
  ch.torso.scale.set(1, 1 + Math.sin(t * 2.4 + ch.walkT) * 0.025, 1);
}

// ================= 오버레이 (3D→화면 좌표) =================
const _v = new THREE.Vector3();
let viewW = 1, viewH = 1;
function toScreen(x, y, z) {
  _v.set(x, y, z).project(camera);
  return { x: (_v.x + 1) / 2 * viewW, y: (1 - _v.y) / 2 * viewH };
}
function placeOv(node, x, y, z) {
  const s = toScreen(x, y, z);
  node.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px) translate(-50%, -100%)`;
}
function ov(html, cls) {
  const d = document.createElement('div');
  d.className = cls;
  d.innerHTML = html;
  ovEl.appendChild(d);
  return d;
}
const ROOM_DOT = { exam: '#1fb39a', cabinet: '#3f7df0', wait: '#f5a524', order: '#6f8cf0', iv: '#3aa8f0', heat: '#ff7a3d', desk: '#8b6cf0', pantry: '#9bb0ab' };
const staticOv = [];
for (const r of Object.values(ROOMS)) {
  const node = ov(`<i style="--dot:${ROOM_DOT[r.key]}"></i>${r.name}` + (r.key === 'wait' ? '<em id="wait-count"></em>' : ''), 'rlabel');
  staticOv.push({ node, x: r.side < 0 ? r.x0 + 0.95 : r.x1 - 0.95, y: 0.05, z: r.z1 - 0.12 });
}
function stationBtn(html, x, y, z, onTap, extraCls = '') {
  const node = ov(html, 'sbtn ' + extraCls);
  node.addEventListener('click', (e) => { e.stopPropagation(); onTap(); });
  staticOv.push({ node, x, y, z });
  return node;
}
const guard = (fn) => () => { if (S && !S.paused && !S.ended) fn(); };
{
  const a = R('cabinet', -1.4, -0.75), b = R('cabinet', 1.4, -0.75);
  stationBtn(`<span class="pin">${icon('syringe')}</span><small>주사</small>`, a.x, 1.3, a.z, guard(() => enqueue({ kind: 'prep', item: 'shot' })), 'shot');
  stationBtn(`<span class="pin">${icon('iv')}</span><small>수액</small>`, b.x, 1.3, b.z, guard(() => enqueue({ kind: 'prep', item: 'iv' })), 'iv');
  const t = R('pantry', 1.3, -1.3), s = R('pantry', -0.6, -0.8);
  stationBtn(`<span class="pin">${icon('toilet')}</span><small>화장실</small>`, t.x, 1.25, t.z + 0.9, guard(() => enqueue({ kind: 'toilet' })), 'toilet');
  stationBtn(`<span class="pin">${icon('onigiri')}</span><small>간식</small>`, s.x, 1.3, s.z, guard(() => enqueue({ kind: 'snack' })), 'snack');
}
const MON = R('desk', -0.4, -0.85);
const chartBtn = stationBtn(`<span class="pin">${icon('clipboard')}<span class="chart-count"></span></span><small>기록</small>`, MON.x + 0.35, 1.5, MON.z, guard(() => {
  if (!S.charts) { toast('📋 밀린 기록이 없어요'); return; }
  enqueue({ kind: 'chart' });
}), 'chart');
const chartCount = chartBtn.querySelector('.chart-count');
const errandOv = ov('<span class="e-ic"></span><span class="e-tx"></span><i></i>', 'errand');
errandOv.style.display = 'none';
errandOv.addEventListener('click', (e) => { e.stopPropagation(); if (S && S.errand && !S.paused) enqueue({ kind: 'errand' }); });
const phoneBtn = stationBtn(`<span class="pin">${icon('phone')}</span><small>전화</small>`, PHONE_POS.x - 0.2, 1.5, PHONE_POS.z, guard(() => {
  if (!S.phone.ringing) { toast('전화가 울리고 있지 않아요'); return; }
  enqueue({ kind: 'phone' });
}), 'phone');
function layoutStaticOverlays() { for (const o of staticOv) placeOv(o.node, o.x, o.y, o.z); }

// ================= 카메라 맞춤 =================
const FIT_PTS = [];
for (const x of [-XMAX - 0.3, XMAX + 0.3]) for (const z of [-11.2, 12.4]) for (const y of [0, 1.7]) FIT_PTS.push(new THREE.Vector3(x, y, z));
let focusing = false;
function fitCamera() {
  if (focusing) return;
  viewW = mapEl.clientWidth; viewH = mapEl.clientHeight;
  if (!viewW || !viewH) return;
  renderer.setSize(viewW, viewH, false);
  camera.aspect = viewW / viewH;
  camera.updateProjectionMatrix();
  let lo = 5, hi = 200;
  for (let i = 0; i < 28; i++) {
    const d = (lo + hi) / 2;
    camera.position.copy(CAM_LOOK).addScaledVector(CAM_DIR, d);
    camera.lookAt(CAM_LOOK);
    camera.updateMatrixWorld();
    const fits = FIT_PTS.every((p) => { const v = p.clone().project(camera); return Math.abs(v.x) <= 0.98 && Math.abs(v.y) <= 0.96; });
    if (fits) hi = d; else lo = d;
  }
  cam.base = hi;
  applyCamera();
}
// ---- 확대/축소 · 이동 ----
const cam = { base: 40, zoom: 1, tZoom: 1, px: 0, pz: 0, tpx: 0, tpz: 0 };
const ZMIN = 1, ZMAX = 2.8;
function clampCam() {
  cam.tZoom = clamp(cam.tZoom, ZMIN, ZMAX);
  const f = 1 - 1 / cam.tZoom;
  cam.tpx = clamp(cam.tpx, -XMAX * f, XMAX * f);
  cam.tpz = clamp(cam.tpz, -12 * f, 12 * f);
}
function applyCamera() {
  if (focusing) return;
  const look = new THREE.Vector3(CAM_LOOK.x + cam.px, 0, CAM_LOOK.z + cam.pz);
  camera.position.copy(look).addScaledVector(CAM_DIR, cam.base / cam.zoom);
  camera.lookAt(look);
  camera.updateMatrixWorld();
  layoutStaticOverlays();
}
function easeCamera(dt) {
  const k = Math.min(1, dt * 14);
  const before = cam.zoom + cam.px + cam.pz;
  cam.zoom += (cam.tZoom - cam.zoom) * k;
  cam.px += (cam.tpx - cam.px) * k;
  cam.pz += (cam.tpz - cam.pz) * k;
  if (Math.abs(cam.zoom + cam.px + cam.pz - before) > 1e-5) applyCamera();
}
function worldPerPx() { return (2 * (cam.base / cam.zoom) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / viewH; }
function zoomBy(f) { cam.tZoom *= f; clampCam(); }
$('#zoom-in').addEventListener('click', () => zoomBy(1.35));
$('#zoom-out').addEventListener('click', () => zoomBy(1 / 1.35));
$('#zoom-reset').addEventListener('click', () => { cam.tZoom = 1; cam.tpx = 0; cam.tpz = 0; });
new ResizeObserver(fitCamera).observe(mapEl);
window.addEventListener('resize', fitCamera);

// ================= 고정 NPC: 원장님 & 간호사 =================
const doctor = makeDoctor();
{
  const d = R('exam', -1.4, -2.15);
  doctor.g.position.set(d.x, 0, d.z);
  setPose(doctor, 'sit');
  world.add(doctor.g);
  doctor.hit.userData.hit = { type: 'doctor' };
}
const docBar = ov('<i></i>', 'pbar doc');
docBar.style.visibility = 'hidden';
const nurse = makeNurse();
setPose(nurse, 'stand');
world.add(nurse.g);
const nurseBar = ov('<i></i>', 'pbar');
nurseBar.style.visibility = 'hidden';

// ================= 경로 =================
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function route(pos, fromSpot, to) {
  const pts = [];
  const ra = roomAt(pos.x, pos.z), rb = roomAt(to.x, to.z);
  if (ra && rb && ra === rb) {
    if (fromSpot && fromSpot.via && (!to.via || dist(fromSpot.via, to.via) > 0.05)) pts.push(fromSpot.via);
    if (to.via) pts.push(to.via);
    pts.push(to);
    return pts;
  }
  if (ra) {
    if (fromSpot && fromSpot.via) pts.push(fromSpot.via);
    pts.push(ra.door, { x: 0, z: ra.cz });
  } else pts.push({ x: 0, z: pos.z });
  if (rb) { pts.push({ x: 0, z: rb.cz }, rb.door); if (to.via) pts.push(to.via); }
  pts.push(to);
  return pts;
}
function stepAlong(mover, dt, speed) {
  let budget = speed * dt;
  while (mover.path.length && budget > 0) {
    const t = mover.path[0];
    const dx = t.x - mover.pos.x, dz = t.z - mover.pos.z, d = Math.hypot(dx, dz);
    if (d > 0.001) mover.face = Math.atan2(dx, dz);
    if (d <= budget) { mover.pos.x = t.x; mover.pos.z = t.z; budget -= d; mover.path.shift(); }
    else { mover.pos.x += (dx / d) * budget; mover.pos.z += (dz / d) * budget; budget = 0; }
  }
  return mover.path.length === 0;
}
function turnTo(g, target, dt) {
  let diff = target - g.rotation.y;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  g.rotation.y += diff * Math.min(1, dt * 12);
}

// ================= 피드백 UI =================
// 메시지 앞의 이모지를 아이콘으로 바꿔 준다
function splitIcon(msg, fallback) {
  const m = msg.match(/^(\S+)\s+/);
  if (m && EMOJI_ICON[m[1]]) return [EMOJI_ICON[m[1]], msg.slice(m[0].length)];
  if (m && /\p{Extended_Pictographic}/u.test(m[1])) return [fallback, msg.slice(m[0].length)];
  return [fallback, msg];
}
function toast(msg, kind = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  const [ic, text] = splitIcon(msg, kind === 'warn' ? 'alert' : 'info');
  t.innerHTML = `<span class="t-ic">${icon(ic)}</span><span></span>`;
  t.lastChild.textContent = text;
  el.toasts.appendChild(t);
  while (el.toasts.children.length > 3) el.toasts.firstChild.remove();
  setTimeout(() => t.remove(), 2700);
}
let hintTimer = null;
function hint(key, msg) {
  if (save.seen[key]) return;
  save.seen[key] = true; persist();
  const [ic, text] = splitIcon(msg, 'info');
  el.hint.innerHTML = `<span class="h-ic">${icon(ic)}</span><div><b>TIP</b><span></span></div>`;
  el.hint.querySelector('div span').textContent = text;
  el.hint.classList.remove('hidden');
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => el.hint.classList.add('hidden'), 4500);
}
el.hint.addEventListener('click', () => el.hint.classList.add('hidden'));
function floatText(pos, text, bad = false) {
  if (!pos) return;
  const s = toScreen(pos.x, 1.6, pos.z);
  const f = document.createElement('div');
  f.className = 'float' + (bad ? ' bad' : '');
  f.textContent = text;
  f.style.left = (s.x - 24) + 'px';
  f.style.top = (s.y - 10) + 'px';
  mapEl.appendChild(f);
  setTimeout(() => f.remove(), 1000);
}

// ================= 하루 =================
function clearDayVisuals() {
  if (!S) return;
  for (const p of [...S.patients.values(), ...S.leavers]) disposePatientVisual(p);
  for (const kind of ['iv', 'heat']) for (const b of S.beds[kind]) { world.remove(b.g); b.ov.remove(); }
}
function newDay() {
  clearDayVisuals();
  el.toasts.innerHTML = '';
  el.hint.classList.add('hidden');
  const day = save.day;
  S = {
    t: 0, closed: false, intakeClosed: false, ended: false, paused: false,
    patients: new Map(), leavers: [], nextId: 1,
    examQ: [], doctor: { cur: null, t: 0, dur: 1 },
    queue: [], cur: null,
    nurse: { pos: { x: SP.desk.x, z: SP.desk.z }, spot: SP.desk, path: [], face: 0, hands: [] },
    body: { hunger: 100, bladder: 100, stamina: save.startStamina, mental: 100 },
    charts: 0, errand: null, errandAt: day === 1 ? rand(60, 85) : rand(40, 65),
    warned: {}, beds: { iv: [], heat: [] },
    phone: { ringing: false, left: 0, next: rand(18, 30), answering: false },
    spawnAt: 0.8, check: true, combo: 0, lastDone: -99, returns: [],
    lunchAnnounced: false, layoutDirty: true,
    emergencyAt: day >= 2 ? rand(35, 140) : -1,
    changeAt: day >= 2 ? rand(45, 130) : -1,
    stats: { served: 0, angry: 0, incidents: 0, earned: 0, phone: 0, phoneMissed: 0, e119: 0,
             skippedMeal: false, heldPee: false, startRating: save.rating, maxCombo: 0,
             restSec: 0, errands: 0, errandsMissed: 0, rude: 0, charted: 0 },
  };
  buildBeds();
  buildDecor();
  nurse.g.position.set(SP.desk.x, 0, SP.desk.z);
  nurse.g.rotation.y = 0;
  nurse.g.visible = true;
  renderHands(); renderQueue(); renderCheck();
  el.day.textContent = day;
  phoneBtn.classList.remove('ringing');
  setTimeout(() => toast('🕘 08:30 조기 출근 완료 · 인계받은 30분은 근무시간에 안 쳐줘요'), 400);
  hint('first', '👆 대기실에 온 환자를 탭하세요. 간호사가 접수하러 가요! 여러 번 탭하면 순서대로 처리해요.');
}

function buildBeds() {
  for (const kind of ['iv', 'heat']) {
    const n = 2 + save.up[kind === 'iv' ? 'ivBed' : 'heatBed'];
    S.beds[kind] = [];
    const span = Array.from({ length: n }, (_, i) => -2.1 + i * (3.8 / (n - 1)));
    span.forEach((dx) => {
      const c = R(kind, dx, -1.15);
      const g = new THREE.Group();
      g.position.set(c.x, 0, c.z);
      box(1.0, 0.42, 2.0, '#e9eef0', 0, 0.21, 0, g);
      const mattress = box(0.94, 0.14, 1.9, kind === 'iv' ? '#a8dcef' : '#f6c3a0', 0, 0.49, 0, g);
      mattress.material = new THREE.MeshStandardMaterial({ color: kind === 'iv' ? '#a8dcef' : '#f6c3a0', roughness: 0.8, emissive: '#ff3b2f', emissiveIntensity: 0 });
      box(0.6, 0.1, 0.32, '#ffffff', 0, 0.6, -0.75, g);
      if (kind === 'iv') {
        cyl(0.02, 0.02, 1.9, '#b0b8bb', 0.62, 0.95, -0.7, g, 6);
        box(0.2, 0.3, 0.06, '#9fdcff', 0.62, 1.7, -0.7, g, { transparent: true, opacity: 0.8 });
      } else {
        cyl(0.025, 0.025, 1.7, '#888888', 0.62, 0.85, -0.3, g, 6);
        const lamp = mesh(new THREE.ConeGeometry(0.2, 0.25, 12, 1, true), '#ff8a3d', { emissive: '#ff6a00', emissiveIntensity: 0.6, side: THREE.DoubleSide });
        lamp.position.set(0.45, 1.65, -0.3); lamp.rotation.z = -0.6;
        g.add(lamp);
      }
      const hit = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 2.2), new THREE.MeshBasicMaterial());
      hit.visible = false; hit.position.y = 0.6; g.add(hit);
      world.add(g);
      const bed = {
        kind, g, mattress, hit, pid: null, t: 0, dur: 1,
        spot: { x: c.x, z: c.z + 0.75, rot: 0, via: { x: c.x, z: c.z + 1.6 } },
        nurseSpot: { x: c.x + 0.05, z: c.z + 1.7, rot: Math.PI },
        ov: ov('<i></i>', 'pbar ' + kind),
      };
      bed.ov.style.visibility = 'hidden';
      hit.userData.hit = { type: 'bed', bed };
      S.beds[kind].push(bed);
    });
  }
}
const freeBed = (kind) => S.beds[kind].find((b) => !b.pid);

// ================= 환자 =================
function waitingCount() { let n = 0; for (const p of S.patients.values()) if (p.state === 'wait') n++; return n; }
function spawnPatient(type, opts = {}) {
  const p = {
    id: S.nextId++, type, emoji: TYPES[type].emoji,
    name: opts.name || pick(LAST) + pick(FIRST),
    max: opts.max || TYPES[type].patience, state: opts.state || 'wait', enterT: S.t,
    order: null, docs: !!opts.docs, returning: !!opts.returning, bed: null, busy: false,
    pos: { x: SP.exit.x, z: SP.exit.z }, path: [], face: Math.PI, spot: null, spotKey: '',
  };
  p.patience = p.max;
  if (opts.rude) { p.rude = true; p.yellT = rand(4, 7); }
  p.ch = makePatientModel(type);
  setPose(p.ch, 'stand');
  p.ch.g.position.set(p.pos.x, 0, p.pos.z);
  p.ch.g.rotation.y = Math.PI;
  p.ch.hit.userData.hit = { type: 'patient', id: p.id };
  world.add(p.ch.g);
  p.ov = ov(`<span class="tag"></span><span class="bar"><i></i></span><span class="qmark">${icon('check')}</span>`, 'po');
  p.tagEl = p.ov.querySelector('.tag'); p.barEl = p.ov.querySelector('.bar i');
  p.ov.addEventListener('click', (e) => { e.stopPropagation(); onPatientTap(p.id); });
  S.patients.set(p.id, p);
  renderPatient(p);
  updateWaitCount();
  return p;
}
function setState(p, st) { p.state = st; p.enterT = S.t; renderPatient(p); }
function renderPatient(p) {
  let tag = null;
  if (p.type === 'emergency') tag = ['heartPulse', 'alert'];
  else if (p.state === 'order') tag = [ORDER_ICON[p.order], p.order];
  else if (p.state === 'beddone') tag = ['bell', 'bell'];
  else if (p.state === 'pay') tag = p.docs ? ['doc', 'doc'] : ['card', 'pay'];
  else if (p.state === 'examq' && S.doctor.cur === p.id) tag = ['stetho', 'exam'];
  else if (p.rude && (p.state === 'wait' || p.state === 'examq')) tag = ['angry', 'rude'];
  const key = tag ? tag.join() : '';
  if (p.tagKey !== key) { p.tagKey = key; p.tagEl.innerHTML = tag ? `<span class="badge-ic ${tag[1]}">${icon(tag[0])}</span>` : ''; }
  p.ov.classList.toggle('ringing', p.state === 'beddone');
  if (p.bed && p.state !== 'beddone') p.bed.mattress.material.emissiveIntensity = 0;
  S.layoutDirty = true;
}
function goTo(p, spot, key) {
  p.path = route(p.pos, p.spot, spot);
  p.spot = spot;
  p.spotKey = key;
}
function layoutZones() {
  S.layoutDirty = false;
  const by = { wait: [], examq: [], order: [], pay: [] };
  for (const p of S.patients.values()) if (by[p.state]) by[p.state].push(p);
  for (const k in by) by[k].sort((a, b) => a.enterT - b.enterT || a.id - b.id);
  const assign = (list, seats, zone) => list.forEach((p, i) => {
    const idx = Math.min(i, seats.length - 1);
    const key = zone + ':' + idx;
    if (p.spotKey !== key) goTo(p, seats[idx], key);
  });
  assign(by.wait, SEATS.wait, 'wait');
  const cur = by.examq.find((p) => p.id === S.doctor.cur);
  if (cur && cur.spotKey !== 'doc') goTo(cur, SP.doc, 'doc');
  assign(by.examq.filter((p) => p !== cur), SEATS.exam, 'exam');
  assign(by.order, SEATS.order, 'order');
  assign(by.pay, SEATS.pay, 'pay');
  for (const p of S.patients.values()) {
    if ((p.state === 'bed' || p.state === 'beddone') && p.spotKey !== 'bed') goTo(p, p.bed.spot, 'bed');
  }
}
function disposePatientVisual(p) {
  world.remove(p.ch.g);
  p.ch.g.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  if (p.ov) { p.ov.remove(); p.ov = null; }
}
function removePatient(p) {
  S.patients.delete(p.id);
  if (p.bed) { p.bed.pid = null; p.bed.mattress.material.emissiveIntensity = 0; p.bed.ov.style.visibility = 'hidden'; p.bed = null; }
  S.examQ = S.examQ.filter((x) => x !== p.id);
  S.queue = S.queue.filter((a) => a.pid !== p.id);
  if (p.ov) { p.ov.remove(); p.ov = null; }
  setPose(p.ch, 'stand');
  goTo(p, SP.exit, 'exit');   // 출구까지 걸어 나간다
  S.leavers.push(p);
  S.layoutDirty = true;
  renderQueue();
  updateWaitCount();
}
function refill(p, ratio = 0.35) { p.patience = Math.min(p.max, p.patience + p.max * ratio); }
function toPay(p) {
  if (!p.docs) p.docs = Math.random() < 0.25;
  refill(p);
  setState(p, 'pay');
  hint('pay', '🧾 수납 대기 환자를 탭해서 보내드리세요. 서류 아이콘이 뜬 환자는 실비 서류까지 떼 가는 환자라 조금 오래 걸려요.');
}
function leaveAngry(p) {
  if (p.type === 'emergency') {
    save.rating -= 0.8;
    toast(`🚨 ${p.name}님 상태 악화! 응급 대처에 실패했어요`, 'warn');
    vibrate([200, 80, 200]);
  } else {
    save.rating -= 0.2;
    toast(`😡 ${p.name}님이 기다리다 화나서 가셨어요`, 'warn');
  }
  floatText(p.pos, '평판 −', true);
  S.stats.angry++;
  S.body.mental -= 6;
  removePatient(p);
}
function updateWaitCount() {
  const n = waitingCount();
  const w = $('#wait-count');
  if (w) w.textContent = n ? ` ${n}/${WAIT_CAP}` : '';
}

// ================= 입력 =================
function onPatientTap(id) {
  if (!S || S.paused || S.ended) return;
  const p = S.patients.get(id);
  if (!p) return;
  switch (p.state) {
    case 'wait': enqueue(p.type === 'emergency' ? { kind: 'call119', pid: id } : { kind: 'register', pid: id }); break;
    case 'examq': toast(S.doctor.cur === id ? '🧑‍⚕️ 원장님이 진료 중이에요' : '원장님 진료를 기다리는 중이에요'); break;
    case 'order': enqueue({ kind: 'treat', pid: id }); break;
    case 'bed': toast(`아직 ${Math.ceil(p.bed.t)}초 남았어요`); break;
    case 'beddone': enqueue({ kind: 'unbed', pid: id }); break;
    case 'pay': enqueue({ kind: 'pay', pid: id }); break;
  }
}
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const pointers = new Map();
let gesture = null;
const cvs = renderer.domElement;
cvs.addEventListener('pointerdown', (e) => {
  cvs.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) gesture = { type: 'tap', sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY };
  else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    gesture = { type: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y), z0: cam.tZoom, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  }
});
cvs.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!gesture) return;
  if (gesture.type === 'pinch' && pointers.size >= 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    cam.tZoom = gesture.z0 * (d / Math.max(20, gesture.d0));
    panBy(mx - gesture.mx, my - gesture.my);
    gesture.mx = mx; gesture.my = my;
    clampCam(); cam.zoom = cam.tZoom; cam.px = cam.tpx; cam.pz = cam.tpz; applyCamera();
  } else if (gesture.type === 'tap' || gesture.type === 'pan') {
    if (gesture.type === 'tap' && Math.hypot(e.clientX - gesture.sx, e.clientY - gesture.sy) > 9) gesture.type = 'pan';
    if (gesture.type === 'pan') {
      panBy(e.clientX - gesture.lx, e.clientY - gesture.ly);
      clampCam(); cam.px = cam.tpx; cam.pz = cam.tpz; applyCamera();
    }
    gesture.lx = e.clientX; gesture.ly = e.clientY;
  }
});
function panBy(dxPx, dyPx) {
  const w = worldPerPx();
  cam.tpx -= dxPx * w;
  cam.tpz -= (dyPx * w) / CAM_DIR.y;
}
function endPointer(e) {
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);
  if (gesture && gesture.type === 'tap' && pointers.size === 0) handleTap(e.clientX, e.clientY);
  if (pointers.size === 0) gesture = null;
  else if (gesture && gesture.type === 'pinch') gesture = { type: 'pan', lx: [...pointers.values()][0].x, ly: [...pointers.values()][0].y };
}
cvs.addEventListener('pointerup', endPointer);
cvs.addEventListener('pointercancel', (e) => { pointers.delete(e.pointerId); if (!pointers.size) gesture = null; });
cvs.addEventListener('wheel', (e) => { e.preventDefault(); zoomBy(Math.exp(-e.deltaY * 0.0015)); }, { passive: false });

function handleTap(cx, cy) {
  if (!S || S.paused || S.ended) return;
  const r = cvs.getBoundingClientRect();
  ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const targets = [phoneMesh, doctor.hit];
  for (const p of S.patients.values()) targets.push(p.ch.hit);
  for (const k of ['iv', 'heat']) for (const b of S.beds[k]) targets.push(b.hit);
  const hits = raycaster.intersectObjects(targets, true);
  for (const h of hits) {
    let o = h.object;
    while (o && !o.userData.hit && o !== phoneMesh) o = o.parent;
    if (!o) continue;
    if (o === phoneMesh) { phoneBtn.click(); return; }
    const info = o.userData.hit;
    if (info.type === 'doctor') { if (S.errand) enqueue({ kind: 'errand' }); else toast('🧑‍⚕️ 원장님은 진료 중이에요'); return; }
    if (info.type === 'patient') { onPatientTap(info.id); return; }
    if (info.type === 'bed') {
      if (info.bed.pid) onPatientTap(info.bed.pid);
      else toast(info.bed.kind === 'iv' ? '비어 있는 수액 침대예요' : '비어 있는 핫팩 침대예요');
      return;
    }
  }
}
el.hands.forEach((h, i) => h.addEventListener('click', () => {
  if (!S || !S.nurse.hands[i]) return;
  const it = S.nurse.hands.splice(i, 1)[0];
  toast(`✋ ${ORDER[it].label} 세트를 내려놓았어요`);
  renderHands();
}));
el.check.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-mode]');
  if (!S || !b) return;
  const safe = b.dataset.mode === 'safe';
  if (S.check === safe) return;
  S.check = safe;
  renderCheck();
  toast(S.check ? '🔍 꼼꼼히 · 환자 이름과 생년월일을 확인해요' : '⚡ 빠르게 · 시간은 아끼지만 투약 사고 위험!', S.check ? 'good' : 'warn');
});
el.queue.addEventListener('click', (e) => {
  const chip = e.target.closest('.qchip[data-i]');
  if (!chip) return;
  S.queue.splice(+chip.dataset.i, 1);
  renderQueue();
});

// ================= 할 일 큐 =================
const sameAction = (a, b) => a.kind === b.kind && a.pid === b.pid && a.item === b.item;
function enqueue(a) {
  if (S.ended) return;
  const all = S.cur ? [S.cur.a, ...S.queue] : S.queue;
  if ((a.pid || a.kind === 'chart' || a.kind === 'errand') && all.some((x) => sameAction(x, a))) { toast('이미 할 일에 들어 있어요'); return; }
  if (all.length >= MAX_TASKS) { toast(`할 일이 너무 많아요! (최대 ${MAX_TASKS}개)`, 'warn'); return; }
  S.queue.push(a);
  renderQueue();
}
function actionIcon(a) {
  const p = a.pid ? S.patients.get(a.pid) : null;
  return { register: 'doc', call119: 'ambulance', treat: p ? ORDER_ICON[p.order] : 'syringe', unbed: 'bell', pay: 'card',
    phone: 'phone', prep: a.item ? ITEM_SVG[a.item] : 'syringe', toilet: 'toilet', snack: 'onigiri', chart: 'clipboard', errand: 'stetho' }[a.kind] || 'info';
}
function actionLabel(a) {
  const p = a.pid ? S.patients.get(a.pid) : null;
  const n = p ? p.name : '';
  switch (a.kind) {
    case 'register': return `접수 ${n}`;
    case 'call119': return `119 ${n}`;
    case 'treat': return p ? `${ORDER[p.order].label} ${n}` : '처치';
    case 'unbed': return `정리 ${n}`;
    case 'pay': return `수납 ${n}`;
    case 'phone': return '전화';
    case 'prep': return `${ORDER[a.item].label} 챙기기`;
    case 'toilet': return '화장실';
    case 'snack': return '간식';
    case 'chart': return '기록';
    case 'errand': return '원장님 호출';
  }
  return a.kind;
}
function renderQueue() {
  const chips = [];
  if (S.cur) chips.push(`<span class="qchip cur">${icon(actionIcon(S.cur.a))}${actionLabel(S.cur.a)}</span>`);
  S.queue.forEach((a, i) => chips.push(`<span class="qchip" data-i="${i}">${icon(actionIcon(a))}${actionLabel(a)}<span class="x">×</span></span>`));
  el.queue.innerHTML = chips.length ? chips.join('') : '<span class="qempty">할 일 없음 · 환자나 시설을 탭하세요</span>';
  const queued = new Set([...(S.cur ? [S.cur.a.pid] : []), ...S.queue.map((a) => a.pid)]);
  for (const p of S.patients.values()) if (p.ov) p.ov.classList.toggle('queued', queued.has(p.id));
}
function renderHands() {
  el.hands.forEach((h, i) => {
    const it = S.nurse.hands[i];
    h.innerHTML = it ? icon(ITEM_SVG[it]) + `<span>${ORDER[it].label}</span>` : '';
    h.className = 'hand' + (it ? ' full ' + it : '');
  });
  el.trayCount.textContent = `${S.nurse.hands.length}/2`;
  nurse.extras.held.forEach((g, i) => {
    g.clear();
    const it = S.nurse.hands[i];
    if (it) g.add(heldItemMesh(it));
  });
}
function renderCheck() {
  el.check.classList.toggle('on', S.check);
  el.check.querySelectorAll('button').forEach((b) => b.classList.toggle('on', (b.dataset.mode === 'safe') === S.check));
}

// ================= 행동 =================
const P = (a) => S.patients.get(a.pid);
const TREAT_DUR = { shot: 1.1, iv: 1.5, heat: 0.9 };
function incidentRoll(p) {
  if (S.check) return false;
  let risk = 0.07;
  if (S.body.stamina < 30) risk += 0.06;
  if (S.body.hunger < 20 || S.body.bladder < 20) risk += 0.04;
  if (Math.random() < risk) {
    S.stats.incidents++;
    save.rating -= 0.5;
    save.money -= 5000; S.stats.earned -= 5000;
    S.body.mental -= 10;
    toast(`⚠️ 투약 사고! ${p.name}님 확인을 건너뛰었어요 (평판 −0.5, ₩−5,000)`, 'warn');
    floatText(p.pos, '사고!', true);
    vibrate([300, 100, 300]);
    return true;
  }
  return false;
}
function bumpCombo(pos) {
  if (S.t - S.lastDone <= 3.5) S.combo++; else S.combo = 1;
  S.lastDone = S.t;
  S.stats.maxCombo = Math.max(S.stats.maxCombo, S.combo);
  if (S.combo >= 3) floatText(pos, `콤보 x${S.combo}`);
}
const comboMult = () => 1 + Math.min(S.combo - 1, 10) * 0.1;
function frontOf(spot, d = 0.85) {
  return { x: spot.x + Math.sin(spot.rot || 0) * d, z: spot.z + Math.cos(spot.rot || 0) * d, rot: (spot.rot || 0) + Math.PI, via: spot.via };
}

const ACT = {
  register: {
    where: () => SP.desk, dur: () => 0.9,
    check: (a) => (P(a) && P(a).state === 'wait' ? null : 'skip'),
    apply: (a) => { const p = P(a); refill(p); S.examQ.push(p.id); setState(p, 'examq'); updateWaitCount(); bumpCombo(SP.desk); },
  },
  call119: {
    where: () => SP.desk, dur: () => 1.6,
    check: (a) => (P(a) ? null : 'skip'),
    apply: (a) => {
      const p = P(a);
      save.rating += 0.3; S.stats.e119++;
      toast(`🚑 ${p.name}님 119 연계 완료! 빠른 판단이었어요 (평판 +0.3)`, 'good');
      floatText(SP.desk, '평판 +0.3');
      removePatient(p);
    },
  },
  treat: {
    where: (a) => P(a) && P(a).spot && frontOf(P(a).spot),
    dur: (a) => { const p = P(a); return TREAT_DUR[p.order] + (S.check && p.order !== 'heat' ? 0.7 : 0); },
    check: (a) => {
      const p = P(a);
      if (!p || p.state !== 'order') return 'skip';
      const o = p.order;
      if ((o === 'shot' || o === 'iv') && !S.nurse.hands.includes(o)) return `${ITEM_ICON[o]} ${ORDER[o].label} 세트가 손에 없어요! 약품장에서 챙기세요`;
      if (o === 'iv' && !freeBed('iv')) return '💧 수액 침대가 꽉 찼어요';
      if (o === 'heat' && !freeBed('heat')) return '♨️ 핫팩 침대가 꽉 찼어요';
      return null;
    },
    apply: (a) => {
      const p = P(a), o = p.order;
      if (o === 'shot' || o === 'iv') { S.nurse.hands.splice(S.nurse.hands.indexOf(o), 1); renderHands(); incidentRoll(p); }
      addChart();
      if (o === 'shot') toPay(p);
      else {
        const bed = freeBed(o);
        bed.pid = p.id; bed.dur = bed.t = (o === 'iv' ? 22 : 15);
        bed.ov.style.visibility = 'visible';
        bed.ov.firstChild.style.width = '0%';
        p.bed = bed; refill(p, 0.5);
        setState(p, 'bed');
      }
      bumpCombo(p.pos);
    },
  },
  unbed: {
    where: (a) => P(a) && P(a).bed && P(a).bed.nurseSpot, dur: () => 0.7,
    check: (a) => (P(a) && P(a).state === 'beddone' ? null : 'skip'),
    apply: (a) => {
      const p = P(a), bed = p.bed;
      bed.pid = null; bed.mattress.material.emissiveIntensity = 0; bed.ov.style.visibility = 'hidden';
      p.bed = null;
      setPose(p.ch, 'stand');
      toPay(p);
      bumpCombo(p.pos);
    },
  },
  pay: {
    where: () => SP.desk,
    dur: (a) => 0.8 + (P(a) && P(a).docs ? 1.1 : 0),
    check: (a) => (P(a) && P(a).state === 'pay' ? null : 'skip'),
    apply: (a) => {
      const p = P(a);
      const r = p.patience / p.max;
      bumpCombo(SP.desk);
      const base = p.returning ? 1000 : ORDER[p.order || 'none'].fee + (p.docs ? 1000 : 0);
      const gain = Math.round(base * (0.7 + 0.6 * r) * comboMult() / 100) * 100;
      save.money += gain; S.stats.earned += gain; S.stats.served++;
      save.rating += (r - 0.4) * 0.12;
      floatText(p.pos, `+₩${gain.toLocaleString('ko-KR')}`);
      if (r > 0.75 && (p.type === 'grandma' || p.type === 'grandpa') && Math.random() < 0.3)
        { toast('👵 “아이고 우리 간호사 선생님 최고여~” (멘탈 +8)', 'good'); S.body.mental = Math.min(100, S.body.mental + 8); }
      if (!p.docs && !p.returning && !S.closed && Math.random() < 0.12)
        S.returns.push({ at: S.t + rand(4, 9), name: p.name, type: p.type });
      removePatient(p);
    },
  },
  phone: {
    where: () => SP.desk, dur: () => 1.4,
    check: () => (S.phone.ringing ? null : '📞 전화가 끊겼어요…'),
    start: () => { S.phone.answering = true; },
    apply: () => {
      S.phone.ringing = false; S.phone.answering = false; phoneBtn.classList.remove('ringing');
      S.phone.next = rand(20, 38);
      save.rating += 0.03; S.stats.phone++;
      toast('📞 ' + pick(PHONE_LINES));
    },
  },
  prep: {
    where: (a) => SP['cab_' + a.item], dur: () => 0.6,
    check: () => (S.nurse.hands.length < 2 ? null : '✋ 손이 모자라요! (최대 2개) 아래 손 칸을 탭하면 내려놓아요'),
    apply: (a) => { S.nurse.hands.push(a.item); renderHands(); },
  },
  chart: {
    where: () => SP.desk,
    dur: () => 0.3 + 0.45 * Math.min(S.charts, 6),
    check: () => (S.charts > 0 ? null : 'skip'),
    apply: () => {
      const n = Math.min(S.charts, 6);
      S.charts -= n; S.stats.charted += n;
      updateCharts();
      toast(`📋 기록 ${n}건 정리 완료${S.charts ? ` · 아직 ${S.charts}건 남음` : ''}`);
    },
  },
  errand: {
    where: () => SP.errand,
    dur: () => (S.errand ? S.errand.dur : 1),
    check: () => (S.errand ? null : '🧑‍⚕️ 원장님 호출이 이미 끝났어요'),
    start: () => { if (S.errand) S.errand.answering = true; },
    apply: () => {
      S.errand = null; errandOv.style.display = 'none';
      S.stats.errands++;
      S.body.mental -= 3;
      S.errandAt = S.t + rand(40, 70);
      toast('🧑‍⚕️ 원장님 부탁 처리 완료… 내 일은 그대로 밀렸다');
    },
  },
  toilet: {
    where: () => SP.toilet, dur: () => 2.0, check: () => null,
    start: () => { nurse.g.visible = false; },
    apply: () => { S.body.bladder = 100; toast('🚻 휴… 살 것 같다'); },
  },
  snack: {
    where: () => SP.snack, dur: () => 1.5, check: () => null,
    apply: () => {
      S.body.hunger = 100;
      S.body.stamina = Math.min(100, S.body.stamina + (save.up.coffee ? 35 : 20));
      S.body.mental = Math.min(100, S.body.mental + 10);
      toast(save.up.coffee ? '☕🍙 커피랑 삼각김밥 흡입 완료!' : '🍙 3초 만에 삼각김밥 흡입');
    },
  },
};

function addChart() {
  S.charts++;
  updateCharts();
  if (S.charts === 6) toast('📋 기록이 6건이나 밀렸어요! 접수대 기록 버튼을 탭하세요', 'warn');
  hint('chart', '📋 처치할 때마다 기록이 쌓여요. 접수대의 기록 버튼으로 정리하지 않으면 퇴근 후 무급 야근이 돼요.');
}
function updateCharts() {
  chartCount.textContent = S.charts ? S.charts : '';
  chartBtn.classList.toggle('piled', S.charts >= 6);
}
function speedMult() {
  const b = S.body;
  let m = save.up.shoes ? 1.2 : 1;
  if (b.hunger < 20 || b.bladder < 20 || b.stamina < 20) m *= 0.75;
  if (b.bladder <= 0) m *= 0.65;
  return m;
}
const workMult = () => (S.body.stamina < 30 ? 1.3 : 1) * (S.body.mental < 25 ? 1.25 : 1);

// ================= 업데이트 =================
function updateNurse(dt) {
  const N = S.nurse;
  if (!S.cur) {
    if (!S.queue.length) return;
    const a = S.queue.shift();
    const spot = ACT[a.kind].where(a);
    if (!spot) { renderQueue(); return; }
    S.cur = { a, phase: 'walk', t: 0, dur: 1, spot };
    N.path = route(N.pos, N.spot, spot);
    renderQueue();
  }
  const c = S.cur, def = ACT[c.a.kind];
  if (c.phase === 'walk') {
    const arrived = stepAlong(N, dt, NURSE_SPEED * speedMult());
    if (arrived) {
      N.spot = c.spot;
      const err = def.check(c.a);
      if (err) { if (err !== 'skip') toast(err, 'warn'); S.cur = null; renderQueue(); return; }
      c.phase = 'work'; c.t = 0; c.dur = def.dur(c.a) * workMult();
      if (def.start) def.start(c.a);
      const p = c.a.pid && P(c.a); if (p) p.busy = true;
    }
  } else {
    c.t += dt;
    if (c.t >= c.dur) {
      const p = c.a.pid && P(c.a); if (p) p.busy = false;
      nurse.g.visible = true;
      const err = def.check(c.a);
      if (!err) { def.apply(c.a); S.body.stamina -= 1.5 * (save.up.coffee ? 0.8 : 1); if (c.a.kind === 'toilet' || c.a.kind === 'snack') S.stats.restSec += c.dur; }
      else if (err !== 'skip') toast(err, 'warn');
      if (c.a.kind === 'phone') S.phone.answering = false;
      if (c.a.kind === 'errand' && S.errand) S.errand.answering = false;
      S.cur = null;
      renderQueue();
    }
  }
}
function updateDoctor(dt) {
  const D = S.doctor;
  if (!D.cur && S.examQ.length) {
    const id = S.examQ.shift();
    const p = S.patients.get(id);
    if (p) { D.cur = id; D.t = 0; D.dur = TYPES[p.type].exam; renderPatient(p); }
  }
  if (D.cur) {
    const p = S.patients.get(D.cur);
    if (!p) { D.cur = null; return; }
    if (p.path.length || p.spotKey !== 'doc') return;  // 진찰석에 앉아야 진료 시작
    D.t += dt;
    if (D.t >= D.dur) {
      D.cur = null;
      p.order = weightedPick(ORDER_TABLE[p.type]);
      if (p.order === 'none') toPay(p);
      else {
        refill(p);
        setState(p, 'order');
        if (p.order === 'shot') hint('o_shot', '💉 주사 처방! 약품장의 주사 버튼으로 챙긴 뒤 처치 대기 환자를 탭하세요.');
        if (p.order === 'iv') hint('o_iv', '💧 수액 처방! 약품장의 수액 버튼으로 챙기고 환자를 탭하면 수액실 침대로 모셔요.');
        if (p.order === 'heat') hint('o_heat', '♨️ 핫팩 처방! 준비물 없이 환자를 탭하면 물리치료실 침대로 모셔요.');
      }
    }
  }
}
function weightedPick(list) {
  const tot = list.reduce((s, x) => s + x[1], 0);
  let r = Math.random() * tot;
  for (const [k, w] of list) if ((r -= w) < 0) return k;
  return list[0][0];
}
function updatePatients(dt) {
  const tv = save.up.tv ? 0.75 : 1;
  for (const p of S.patients.values()) {
    if (p.busy || S.doctor.cur === p.id || p.path.length) continue;  // 걷는 중엔 인내심 유지
    let m = { wait: tv, examq: 0.5, order: 1, bed: 0, beddone: 1.6, pay: 1 }[p.state];
    if (p.type === 'emergency') m = 1;
    p.patience -= dt * m;
    const r = p.patience / p.max;
    p.barEl.style.width = clamp(r * 100, 0, 100) + '%';
    p.barEl.className = r < 0.25 ? 'low' : r < 0.55 ? 'mid' : '';
    if (p.rude && p.state !== 'bed' && !p.busy) {
      p.yellT -= dt;
      if (p.yellT <= 0) {
        p.yellT = rand(7, 11);
        S.body.mental -= 6; S.stats.rude++;
        toast(`💢 ${p.name}님: “${pick(RUDE_LINES)}” (멘탈 −6)`, 'warn');
        floatText(p.pos, '멘탈 −', true);
        hint('rude', '💢 진상 환자는 계속 폭언을 해서 멘탈을 깎아요. 빨리 처리해서 보내는 게 상책… (현실에서도 피해 간호사 71.8%가 무대응)');
      }
    }
    if (p.patience <= 0) leaveAngry(p);
  }
}
function updateBeds(dt) {
  for (const kind of ['iv', 'heat']) for (const bed of S.beds[kind]) {
    if (!bed.pid) continue;
    const p = S.patients.get(bed.pid);
    if (!p) continue;
    if (p.state === 'beddone') { bed.mattress.material.emissiveIntensity = 0.2 + Math.abs(Math.sin(S.t * 5)) * 0.4; continue; }
    if (p.state !== 'bed' || p.path.length) continue;  // 침대에 누운 뒤부터 진행
    bed.t -= dt;
    bed.ov.firstChild.style.width = clamp((1 - bed.t / bed.dur) * 100, 0, 100) + '%';
    if (bed.t <= 0) {
      refill(p, 0.2);
      setState(p, 'beddone');
      vibrate(80);
      toast(kind === 'iv' ? `🔔 ${p.name}님 “수액 다 들어갔어요!”` : `🔔 ${p.name}님 “핫팩 끝났는데요?”`);
      hint('beddone', '🔔 빨갛게 깜빡이는 침대를 탭해서 정리해 주세요. 늦으면 인내심이 빨리 줄어요!');
    }
  }
}
function updateBody(dt) {
  const b = S.body;
  b.hunger = Math.max(0, b.hunger - dt * (100 / 150));
  b.bladder = Math.max(0, b.bladder - dt * (100 / 125));
  b.stamina = Math.max(0, b.stamina - dt * 0.18 * (save.up.coffee ? 0.8 : 1));
  if (b.hunger <= 0) S.stats.skippedMeal = true;
  if (b.bladder <= 5) S.stats.heldPee = true;
  const warn = (k, v, msg) => {
    if (v < 25 && !S.warned[k]) { S.warned[k] = true; toast(msg, 'warn'); }
    if (v > 60) S.warned[k] = false;
  };
  warn('h', b.hunger, '🍙 배고파서 손이 떨려요… 탕비실 가야 하는데');
  warn('b', b.bladder, '🚻 화장실이 급해요…! 3시간째 참는 중');
  warn('s', b.stamina, '⚡ 체력이 바닥나고 있어요. 간식이라도…');
  b.mental = clamp(b.mental, 0, 100);
  warn('m', b.mental, '💔 멘탈이 바닥나서 손이 느려져요…');
  if (b.hunger < 40 || b.bladder < 40) hint('body', '🍙🚻 내 몸도 챙겨야 해요! 게이지가 바닥나면 느려지고 실수가 늘어요. 탕비실 버튼을 탭하세요.');
  setGauge(el.gH, b.hunger); setGauge(el.gB, b.bladder); setGauge(el.gS, b.stamina); setGauge(el.gM, b.mental);
}
function setGauge(g, v) {
  g.querySelector('i').style.width = v + '%';
  const n = String(Math.round(v));
  const em = g.querySelector('em');
  if (em.textContent !== n) em.textContent = n;
  g.classList.toggle('low', v < 40 && v >= 20);
  g.classList.toggle('crit', v < 20);
}
function updateErrand(dt) {
  if (S.closed) { if (S.errand && !S.errand.answering) { S.errand = null; errandOv.style.display = 'none'; } return; }
  if (!S.errand) {
    if (S.t >= S.errandAt) {
      const e = pick(ERRANDS);
      S.errand = { ...e, left: 14, max: 14, answering: false };
      errandOv.querySelector('.e-ic').innerHTML = icon(e.icon);
      errandOv.querySelector('.e-tx').textContent = `“${e.label}”`;
      errandOv.style.display = '';
      toast(`🧑‍⚕️ 원장님: “김 선생~ ${e.label}”`);
      hint('errand', '🧑‍⚕️ 원장님 호출! 말풍선이나 원장님을 탭하면 처리하러 가요. 무시하면 멘탈이 크게 깎여요. (간호사 66.2%가 의사 업무를 요구받은 경험)');
    }
    return;
  }
  if (S.errand.answering) return;
  S.errand.left -= dt;
  errandOv.querySelector('i').style.transform = `scaleX(${Math.max(0, S.errand.left / S.errand.max)})`;
  if (S.errand.left <= 0) {
    S.errand = null; errandOv.style.display = 'none';
    S.body.mental -= 15; save.rating -= 0.05; S.stats.errandsMissed++;
    S.errandAt = S.t + rand(40, 70);
    S.queue = S.queue.filter((a) => a.kind !== 'errand'); renderQueue();
    toast('🧑‍⚕️ 원장님: “김 선생, 아까 말한 거 안 했어?” (멘탈 −15)', 'warn');
  }
}
function updatePhone(dt) {
  const ph = S.phone;
  if (S.closed) { if (ph.ringing && !ph.answering) { ph.ringing = false; phoneBtn.classList.remove('ringing'); } return; }
  if (ph.ringing) {
    if (ph.answering) return;
    ph.left -= dt;
    if (ph.left <= 0) {
      ph.ringing = false; phoneBtn.classList.remove('ringing');
      ph.next = rand(20, 38);
      save.rating -= 0.05; S.stats.phoneMissed++;
      toast('📵 전화를 못 받았어요 (평판 −)', 'warn');
      S.queue = S.queue.filter((a) => a.kind !== 'phone'); renderQueue();
    }
  } else {
    ph.next -= dt;
    if (ph.next <= 0) {
      ph.ringing = true; ph.left = 9;
      phoneBtn.classList.add('ringing');
      vibrate(60);
      hint('phone', '📞 전화가 울려요! 접수대의 전화 버튼을 탭하면 받으러 가요. 안 받으면 평판이 떨어져요.');
    }
  }
}
function updateSpawns() {
  if (S.closed || S.intakeClosed) return;
  const gm = gameMinute();
  if (gm >= END_MIN - 30) { S.intakeClosed = true; toast('🚪 17:30 접수 마감! 이제 새 환자는 안 받아요'); return; }
  const lunch = gm >= 12 * 60 && gm < 13 * 60;
  if (lunch && !S.lunchAnnounced) { S.lunchAnnounced = true; toast('🍱 12시! 점심시간 직장인 러시 시작', 'warn'); }
  if (S.t >= S.spawnAt) {
    const base = Math.max(3.2, 7.6 - (save.day - 1) * 0.7);
    S.spawnAt = S.t + base * (lunch ? 0.55 : 1) * rand(0.7, 1.3);
    if (waitingCount() >= WAIT_CAP) {
      save.rating -= 0.05;
      toast('🚪 대기실이 꽉 차서 환자가 그냥 돌아갔어요', 'warn');
    } else {
      const table = lunch ? [['worker', 6], ['normal', 2], ['grandma', 1]]
        : gm < 11 * 60 ? [['grandma', 4], ['grandpa', 3], ['normal', 2], ['kid', 1]]
        : [['normal', 3], ['grandma', 2], ['grandpa', 2], ['kid', 2], ['worker', 1]];
      const ty = weightedPick(table);
      spawnPatient(ty, { rude: S.t > 25 && ty !== 'kid' && Math.random() < (save.day === 1 ? 0.07 : 0.12 + save.day * 0.02) });
    }
  }
  if (S.emergencyAt > 0 && S.t >= S.emergencyAt) {
    S.emergencyAt = -1;
    spawnPatient('emergency');
    toast('🚨 가슴을 움켜쥔 환자 내원! 탭해서 바로 119 연계!', 'warn');
    vibrate([150, 60, 150]);
  }
  if (S.changeAt > 0 && S.t >= S.changeAt) {
    const cands = [...S.patients.values()].filter((p) => p.state === 'order' && (p.order === 'shot' || p.order === 'iv'));
    if (cands.length) {
      S.changeAt = Math.random() < 0.5 ? S.t + rand(40, 70) : -1;
      const p = pick(cands);
      const from = p.order; p.order = from === 'shot' ? 'iv' : 'shot';
      renderPatient(p);
      toast(`🧑‍⚕️ 원장님: “${p.name}님 ${ORDER[from].label} 말고 ${ORDER[p.order].label}로 바꿔주세요!”`, 'warn');
    } else S.changeAt = S.t + 8;
  }
  for (let i = S.returns.length - 1; i >= 0; i--) {
    const r = S.returns[i];
    if (S.t >= r.at) {
      S.returns.splice(i, 1);
      spawnPatient(r.type, { name: r.name, state: 'pay', docs: true, returning: true, max: 24 });
      toast(`📄 ${r.name}님 “아 맞다, 실비 서류 좀 떼 주세요!”`);
    }
  }
}
// 18:00 이후(야근)는 시계가 1분/초로 흐른다
function gameMinute() { return S.t <= DAY_SECONDS ? START_MIN + S.t * MIN_PER_SEC : END_MIN + (S.t - DAY_SECONDS); }
function fmtTime(m) { m = Math.floor(m); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
function updateHud() {
  const gm = gameMinute();
  el.clock.textContent = fmtTime(gm);
  const phase = S.closed ? ['야근 중', 'over'] : S.intakeClosed ? ['접수 마감', 'warn'] : (gm >= 720 && gm < 780) ? ['점심 러시', 'warn'] : ['진료 중', ''];
  if (el.phase.textContent !== phase[0]) { el.phase.textContent = phase[0]; el.phase.className = 'phase ' + phase[1]; }
  el.tlFill.style.width = clamp((gm - START_MIN) / (END_MIN - START_MIN) * 100, 0, 100) + '%';
  el.timeline.classList.toggle('over', S.closed);
  save.rating = clamp(save.rating, 0, 5);
  setNum(el.money, fmtWon(save.money));
  setNum(el.rating, save.rating.toFixed(1));
  const showCombo = S.combo >= 2 && S.t - S.lastDone <= 3.5;
  const comboKey = showCombo ? S.combo : 0;
  if (el.combo.dataset.k !== String(comboKey)) {
    el.combo.dataset.k = comboKey;
    el.combo.innerHTML = showCombo ? `<span class="cb">${icon('fire')}콤보 ×${S.combo}</span>` : '';
  }
}
function setNum(node, v) {
  if (node.textContent === v) return;
  node.textContent = v;
  node.classList.remove('bump'); void node.offsetWidth; node.classList.add('bump');
}
function updateClock() {
  if (!S.closed && gameMinute() >= END_MIN) {
    S.closed = true; S.returns = [];
    toast('🕕 18:00 진료 마감! 남은 환자를 마무리해야 퇴근…', 'warn');
  }
  if (S.closed && S.patients.size === 0 && !S.ended) endDay();
}

// ---------- 시각 효과 ----------
function animateWorld(dt, t) {
  easeCamera(dt);
  if (errandOv.style.display !== 'none') placeOv(errandOv, doctor.g.position.x, 2.35, doctor.g.position.z);
  if (S) {
    const N = S.nurse;
    nurse.g.position.set(N.pos.x, 0, N.pos.z);
    const moving = !!(S.cur && S.cur.phase === 'walk' && N.path.length > 0);
    turnTo(nurse.g, moving ? N.face : (N.spot && N.spot.rot !== undefined ? N.spot.rot : N.face), dt);
    animateChibi(nurse, dt, moving, t, true);
    const working = !!(S.cur && S.cur.phase === 'work');
    if (working) {
      nurse.arms[0].rotation.x = -1.0 + Math.sin(t * 14) * 0.25;
      nurse.arms[1].rotation.x = -0.9 + Math.cos(t * 14) * 0.25;
      nurseBar.style.visibility = nurse.g.visible ? 'visible' : 'hidden';
      nurseBar.firstChild.style.width = Math.min(100, (S.cur.t / S.cur.dur) * 100) + '%';
    } else nurseBar.style.visibility = 'hidden';
    placeOv(nurseBar, N.pos.x, 1.95, N.pos.z);
    // 짠함 표현: 피곤하면 구부정 + 땀, 화장실 급하면 동동
    const b = S.body;
    const tired = b.stamina < 35 || b.hunger < 25 || b.bladder < 25;
    nurse.extras.sweat.visible = tired;
    if (tired) nurse.extras.sweat.position.y = 0.1 - ((t * 0.6) % 1) * 0.15;
    if (!moving) nurse.body.rotation.x = tired ? 0.18 : 0.06;
    else nurse.body.rotation.x = tired ? 0.2 : 0.26;  // 앞으로 숙이고 뛰기
    nurse.head.rotation.z = Math.sin(t * 1.3) * (tired ? 0.14 : 0.05);
    nurse.head.rotation.x = tired ? 0.22 : 0.08;
    if (b.bladder < 25 && !moving) nurse.body.position.y = Math.abs(Math.sin(t * 16)) * 0.03;

    for (const p of [...S.patients.values(), ...S.leavers]) {
      const moving2 = p.path.length > 0;
      if (moving2) stepAlong(p, dt, PATIENT_SPEED);
      const arrived = p.path.length === 0;
      p.ch.g.position.set(p.pos.x, 0, p.pos.z);
      if (!arrived) { setPose(p.ch, 'stand'); turnTo(p.ch.g, p.face, dt); }
      else if (p.spot) {
        turnTo(p.ch.g, p.spot.rot !== undefined ? p.spot.rot : p.face, dt);
        const k = p.spotKey;
        if (k === 'bed') setPose(p.ch, 'lie');
        else if (k.startsWith('wait') || k.startsWith('exam') || k.startsWith('order') || k === 'doc') setPose(p.ch, 'sit');
        else setPose(p.ch, 'stand');
        if (p.ov && p.state !== 'bed' && p.patience / p.max < 0.3) p.ch.g.position.y = Math.abs(Math.sin(t * 10 + p.id)) * 0.05;
      }
      animateChibi(p.ch, dt, !arrived, t);
      if (p.ov) {
        const lying = p.ch.pose === 'lie';
        const h = lying ? 1.35 : (p.ch.pose === 'sit' ? 1.3 : 1.45) * p.ch.scale * CHAR_SCALE;
        placeOv(p.ov, p.pos.x, h, p.pos.z + (lying ? -0.5 : 0));
      }
    }
    for (let i = S.leavers.length - 1; i >= 0; i--) {
      if (S.leavers[i].path.length === 0) { disposePatientVisual(S.leavers[i]); S.leavers.splice(i, 1); }
    }
    for (const k of ['iv', 'heat']) for (const b2 of S.beds[k]) placeOv(b2.ov, b2.g.position.x, 2.05, b2.g.position.z - 0.7);
    const D = S.doctor;
    const dp = D.cur && S.patients.get(D.cur);
    const examining = !!(dp && dp.path.length === 0 && dp.spotKey === 'doc');
    docBar.style.visibility = examining ? 'visible' : 'hidden';
    if (examining) docBar.firstChild.style.width = Math.min(100, (D.t / D.dur) * 100) + '%';
    doctor.arms[1].rotation.x = examining ? -1.1 + Math.sin(t * 6) * 0.3 : -0.7;
    doctor.arms[0].rotation.x = S.errand ? -2.4 + Math.sin(t * 8) * 0.4 : -0.7;  // 호출할 때 손 흔들기
    doctor.head.rotation.y = examining ? Math.sin(t * 2) * 0.15 : Math.sin(t * 0.7) * 0.35;
    phoneMesh.position.y = 1.12 + (S.phone.ringing ? Math.abs(Math.sin(t * 30)) * 0.04 : 0);
  } else {
    // 타이틀 화면: 간호사 대기 모션
    animateChibi(nurse, dt, false, t);
    nurse.head.rotation.z = Math.sin(t * 1.3) * 0.08;
    nurse.body.rotation.x = 0.08;
    doctor.head.rotation.y = Math.sin(t * 0.7) * 0.35;
  }
  placeOv(docBar, doctor.g.position.x, 1.95, doctor.g.position.z);
  animateChibi(doctor, dt, false, t);
}

// ================= 메인 루프 =================
let lastTs = performance.now();
function frame(ts) {
  const dt = Math.min(0.1, (ts - lastTs) / 1000 || 0);
  lastTs = ts;
  const t = ts / 1000;
  const steps = window.__timeScale ?? 1;   // 테스트용 배속
  for (let k = 0; k < steps; k++) frameLogic(dt);
  if (!S || !S.paused) for (let k = 0; k < steps; k++) animateWorld(dt, t + k * dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
function frameLogic(dt) {
  if (S && !S.paused && !S.ended) {
    S.t += dt;
    if (S.layoutDirty) layoutZones();
    updateSpawns();
    updateDoctor(dt);
    updatePatients(dt);
    updateBeds(dt);
    updateBody(dt);
    updatePhone(dt);
    updateErrand(dt);
    updateNurse(dt);
    if (S.layoutDirty) layoutZones();
    updateClock();
    updateHud();
  }
}

// ================= 하루 끝 / 상점 =================
function endDay() {
  S.ended = true;
  const overtime = Math.max(0, Math.round(gameMinute() - END_MIN));
  const chartOT = S.charts * 6;                // 남은 기록 1건 = 6분
  const early = 30;                             // 조기 출근 인계
  const unpaid = early + overtime + chartOT;
  const restMin = Math.round(S.stats.restSec * MIN_PER_SEC);
  const st = S.stats;
  save.rating = clamp(save.rating, 0, 5);
  const dRating = save.rating - st.startRating;
  save.startStamina = clamp(Math.round(100 - (overtime + chartOT) * 0.6), 55, 100);
  const finishedDay = save.day;
  save.day++;
  persist();
  $('#res-eyebrow').textContent = `DAY ${finishedDay} 퇴근 기록`;
  $('#res-title').textContent = overtime + chartOT ? `야근 ${overtime + chartOT}분 하고 퇴근…` : '정시 퇴근 성공!';
  const stat = (label, val, bad) => `<div class="stat ${bad ? 'bad' : ''}"><small>${label}</small><b>${val}</b></div>`;
  $('#res-stats').innerHTML = [
    stat('처리한 환자', st.served + '명'),
    stat('화나서 간 환자', st.angry + '명', st.angry > 0),
    stat('오늘 수입', st.earned.toLocaleString()),
    stat('평판 변화', (dRating >= 0 ? '+' : '') + dRating.toFixed(2), dRating < 0),
    stat('투약 사고', st.incidents + '건', st.incidents > 0),
    stat('전화 응대', `${st.phone}통 / 놓침 ${st.phoneMissed}`, st.phoneMissed > 0),
    stat('원장님 심부름', `${st.errands}건 / 놓침 ${st.errandsMissed}`, st.errandsMissed > 0),
    stat('들은 폭언', st.rude + '번', st.rude > 0),
    stat('최대 콤보', '×' + st.maxCombo),
  ].join('') + `<div class="labor" style="grid-column: 1 / -1">
      <h4>${icon('clock')}오늘의 공짜 노동</h4>
      <div class="lrow"><span>조기 출근 · 인계</span><b>${early}분</b></div>
      <div class="lrow"><span>진료 마감 후 야근</span><b>${overtime}분</b></div>
      <div class="lrow"><span>밀린 기록 ${S.charts}건 정리</span><b>${chartOT}분</b></div>
      <div class="lrow"><span>휴게시간 (법정 60분)</span><b>${restMin}분 사용</b></div>
      <div class="lrow total"><span>수당 없는 노동</span><b>${unpaid}분</b></div>
    </div>`;
  const badges = [];
  if (!overtime && !chartOT) badges.push(['전설의 칼퇴', true]);
  if (overtime + chartOT >= 20) badges.push([`내일 체력 ${save.startStamina}%로 시작`, false]);
  if (restMin < 30) badges.push(['휴게시간? 그게 뭔데', false]);
  if (S.body.mental < 30) badges.push(['멘탈 바사삭', false]);
  if (st.skippedMeal) badges.push(['오늘도 점심 거름', false]);
  if (st.heldPee) badges.push(['방광 강철 인증', false]);
  if (st.e119) badges.push(['응급 판별 성공', true]);
  if (st.incidents === 0 && !S.check) badges.push(['운 좋은 날', true]);
  if (st.angry === 0 && st.served >= 10) badges.push(['민원 0건', true]);
  if (save.rating <= 1.5) badges.push(['원장님이 면담하재요…', false]);
  $('#res-badges').innerHTML = badges.map(([tx, g]) => `<span class="badge ${g ? 'good' : ''}">${tx}</span>`).join('');
  renderShop();
  $('#screen-result').classList.remove('hidden');
}
function renderShop() {
  $('#shop-money').innerHTML = `<span class="won-badge">${icon('won')}</span>${save.money.toLocaleString('ko-KR')}`;
  $('#shop').innerHTML = Object.entries(UPGRADES).map(([k, u]) => {
    const lv = save.up[k], maxed = lv >= u.max, cost = maxed ? 0 : u.cost[lv];
    return `<div class="item"><span class="it-ic">${icon(UP_ICON[k])}</span><span class="tx"><b>${u.name}${u.max > 1 ? ` (${lv}/${u.max})` : ''}</b><small>${u.desc}</small></span>
      <button data-up="${k}" ${maxed || save.money < cost ? 'disabled' : ''}>${maxed ? icon('check') + '완료' : '₩' + fmtWon(cost)}</button></div>`;
  }).join('');
}
$('#shop').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-up]');
  if (!b || b.disabled) return;
  const k = b.dataset.up, u = UPGRADES[k], lv = save.up[k];
  if (lv >= u.max || save.money < u.cost[lv]) return;
  save.money -= u.cost[lv]; save.up[k]++;
  persist(); renderShop();
});

// ================= 화면 전환 =================
function startDay() {
  $('#screen-start').classList.add('hidden');
  $('#screen-result').classList.add('hidden');
  $('#screen-pause').classList.add('hidden');
  newDay();
  updateCharts();
}
function pause(on) {
  if (!S || S.ended) return;
  S.paused = on;
  $('#screen-pause').classList.toggle('hidden', !on);
}
function refreshStartButton() { $('#btn-start').textContent = save.day > 1 ? `DAY ${save.day} 출근하기` : '출근하기'; }
$('#btn-next').textContent = '다음 날 출근';
$('#btn-start').addEventListener('click', startDay);
$('#btn-next').addEventListener('click', startDay);
$('#btn-reset').addEventListener('click', () => {
  if (!confirm('저장된 진행 상황(돈, 업그레이드, 날짜)을 모두 지울까요?')) return;
  save = defaultSave(); persist(); refreshStartButton();
});
$('#btn-pause').addEventListener('click', () => pause(true));
let helpPaused = false;
function openHelp(tab = 'basic') {
  if (S && !S.ended && !S.paused) { S.paused = true; helpPaused = true; }
  setHelpTab(tab);
  $('#screen-help').classList.remove('hidden');
}
function closeHelp() {
  $('#screen-help').classList.add('hidden');
  if (helpPaused && S) { S.paused = false; helpPaused = false; }
}
function setHelpTab(tab) {
  document.querySelectorAll('#help-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  document.querySelectorAll('.tab-body').forEach((b) => b.classList.toggle('hidden', b.dataset.tab !== tab));
}
$('#help-tabs').addEventListener('click', (e) => { const b = e.target.closest('button[data-tab]'); if (b) setHelpTab(b.dataset.tab); });
$('#btn-help').addEventListener('click', () => openHelp());
$('#btn-howto').addEventListener('click', () => openHelp());
$('#btn-help2').addEventListener('click', () => { $('#screen-pause').classList.add('hidden'); S.paused = true; helpPaused = false; openHelp(); });
$('#btn-help-close').addEventListener('click', () => {
  closeHelp();
  if (S && S.paused && !S.ended && $('#screen-pause').classList.contains('hidden') && !helpPaused) $('#screen-pause').classList.remove('hidden');
});
$('#btn-resume').addEventListener('click', () => pause(false));
$('#btn-quit').addEventListener('click', () => {
  S.ended = true; persist();
  $('#screen-pause').classList.add('hidden');
  refreshStartButton();
  $('#screen-start').classList.remove('hidden');
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(true); });

nurse.g.position.set(SP.desk.x, 0, SP.desk.z);
refreshStartButton();
fitCamera();
requestAnimationFrame(frame);

// 테스트용 훅
window.__game = {
  get S() { return S; }, enqueue, onPatientTap, freeBed: (k) => S && freeBed(k), phoneBtn,
  // 클로즈업 촬영용: 월드 좌표 (x,z) 를 거리 d 로 바라보기. 인자 없으면 원래 시점 복귀
  focus(x, z, d = 6, y = 0.8) {
    if (x === undefined) { focusing = false; fitCamera(); ovEl.style.display = ''; return; }
    focusing = true;
    const look = new THREE.Vector3(x, y, z);
    camera.position.copy(look).addScaledVector(new THREE.Vector3(0, 0.6, 1).normalize(), d);
    camera.lookAt(look); camera.updateMatrixWorld();
    ovEl.style.display = 'none';
  },
  spots: { nurse: () => S.nurse.pos, doctor: () => ({ x: doctor.g.position.x, z: doctor.g.position.z }), wait: () => R('wait', -0.4, 0), iv: () => R('iv', 0, -1), desk: () => R('desk', -0.5, 0) },
};
