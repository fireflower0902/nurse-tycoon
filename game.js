/* =========================================================
 * 간호사 타이쿤: 오늘도 칼퇴 실패 — STAGE 1 · 동네 의원 (v3)
 * Three.js (CDN importmap), 빌드 없음. 모바일 세로 화면 기준.
 * ========================================================= */
import * as THREE from 'three';
import { icon, hydrateIcons, EMOJI_ICON } from './icons.js?v=10';
import { box, cyl, sph, mesh, makeChibi, makeNurse, makeLead, makeDoctor, makePatientModel, heldItemMesh, setPose, animateChibi, CHAR_SCALE } from './models.js?v=10';
hydrateIcons();

const $ = (s, r = document) => r.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const vibrate = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (_) {} };
const fmtWon = (n) => (Math.abs(n) >= 10000 ? (n / 10000).toFixed(1).replace(/\.0$/, '') + '만' : n.toLocaleString('ko-KR'));
const won = (n) => '₩' + Math.round(n).toLocaleString('ko-KR');

// ================= 게임 설정 =================
const SAVE_KEY = 'nurse-tycoon-v4';
const DAY_SECONDS = 180;
const START_MIN = 9 * 60, END_MIN = 18 * 60;
const MIN_PER_SEC = (END_MIN - START_MIN) / DAY_SECONDS;
const LUNCH_S = 13 * 60, LUNCH_E = 14 * 60;
const MAX_TASKS = 5;
const NURSE_SPEED = 6.2;
const PATIENT_SPEED = 3.4;
const PAID_HOURS = 8;
const MIN_WAGE_2026 = 10320;

const LAST = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황'];
const FIRST = ['순자', '영희', '민수', '지훈', '서연', '도윤', '하은', '영수', '말순', '정호', '수빈', '예준', '춘자', '미경', '현우', '옥자', '지아', '태식'];

const TYPES = {
  grandma:   { emoji: '👵', patience: 70, exam: 4.6 },
  grandpa:   { emoji: '👴', patience: 62, exam: 4.2 },
  worker:    { emoji: '🧑‍💼', patience: 34, exam: 2.8 },
  kid:       { emoji: '👶', patience: 40, exam: 3.0 },
  normal:    { emoji: '🧑', patience: 50, exam: 3.4 },
  emergency: { emoji: '🥵', patience: 18, exam: 0 },
};
// 처방 종류 (진료비 = 의원 매출)
const ORDER = {
  shot:  { label: '주사', fee: 3000, icon: 'syringe' },
  iv:    { label: '수액', fee: 6000, icon: 'iv' },
  heat:  { label: '핫팩', fee: 2500, icon: 'flame' },
  blood: { label: '채혈', fee: 4000, icon: 'drop' },
  none:  { label: '처방만', fee: 1500, icon: 'card' },
};
// 약 (색깔로 구분)
const MEDS = {
  shotA: { type: 'shot', name: '진통제', color: '#3f7df0' },
  shotB: { type: 'shot', name: '항생제', color: '#e84393' },
  ivA:   { type: 'iv', name: '영양수액', color: '#e0a100' },
  ivB:   { type: 'iv', name: '식염수', color: '#35b6e8' },
  blood: { type: 'blood', name: '채혈 키트', color: '#e53935' },
};
const ORDER_TABLE = {
  grandma: [['heat', 4], ['iv', 2], ['shot', 2], ['none', 2]],
  grandpa: [['heat', 4], ['iv', 2], ['shot', 2], ['none', 2]],
  worker:  [['iv', 4], ['shot', 3], ['none', 3]],
  kid:     [['none', 5], ['shot', 3], ['iv', 1]],
  normal:  [['shot', 3], ['iv', 2], ['heat', 2], ['none', 3]],
};
const DOCTORS = [
  { id: 'biz', name: '최원장', trait: '사업가 원장', desc: '환자가 곧 매출. 워라밸은 관심 없고, 가끔 의료지식 질문으로 기습해요.', owner: true, examMul: 0.85, errandMul: 1.4, quiz: true, biz: true, look: { hair: '#2b2b2b', hairLen: 0.4, square: true, tie: '#c9a227', mustache: false } },
  { id: 'kind', name: '대진 오선생', trait: '천사 대진의', desc: '원장님 학회 날. 호출이 적고 커피도 사 줘요.', good: true, examMul: 1.1, errandMul: 0.5, kind: true, look: { hair: '#5a4636', hairLen: 0.5, smile: true, glasses: false, tie: '#2bb5a0' } },
  { id: 'slow', name: '대진 서선생', trait: '꼼꼼파', desc: '원장님 학회 날. 진료를 길게 봐서 대기 환자가 쌓여요.', examMul: 1.6, errandMul: 0.7, look: { hair: '#a9a9a9', sides: true, mustache: true } },
  { id: 'fast', name: '대진 윤선생', trait: '속전속결', desc: '원장님 학회 날. 진료가 빨라 처치가 몰리고, 처방도 자주 바꿔요.', examMul: 0.6, errandMul: 1, changeMul: 2.2, look: { hair: '#222222', hairLen: 0.5, square: true, tie: '#d64545' } },
  { id: 'creep', name: '대진 정선생', trait: '선 넘는 농담', desc: '원장님 학회 날. 불쾌한 말을 던져요. 선을 그을지, 넘길지…', examMul: 1, errandMul: 1.2, harass: true, look: { hair: '#3a3a3a', hairLen: 0.45, glasses: false, tie: '#7a1f3d' } },
];
const RANKS = [
  { name: '신규 간호사', wage: 11500, need: 0 },
  { name: '간호사', wage: 12300, need: 250 },
  { name: '책임간호사', wage: 13500, need: 650 },
  { name: '주임간호사', wage: 15000, need: 1300 },
  { name: '수간호사', wage: 17000, need: 2200 },
];
const HOMES = [
  { name: '고시원', cost: 0, max: 100, recS: 55, recM: 35, desc: '창문 없는 2평' },
  { name: '원룸', cost: 300000, max: 110, recS: 70, recM: 50, desc: '최대치 110 · 회복↑' },
  { name: '투룸 빌라', cost: 900000, max: 120, recS: 85, recM: 65, desc: '최대치 120 · 회복↑↑' },
  { name: '아파트 전세', cost: 2500000, max: 130, recS: 100, recM: 80, desc: '최대치 130 · 완전 회복' },
];
const SHOP = [
  { id: 'choco1', name: '초코바', icon: 'choco', desc: '근무 중 바로 식사 +40', cost: 1500, give: (s) => { s.choco += 1; } },
  { id: 'choco3', name: '초코바 3개 묶음', icon: 'choco', desc: '조금 더 저렴하게', cost: 4000, give: (s) => { s.choco += 3; } },
  { id: 'cardigan', name: '주머니 가디건', icon: 'shirt', desc: '처치 트레이 +1칸 (3칸)', cost: 39000, once: true },
  { id: 'shoes', name: '푹신한 간호화', icon: 'shoe', desc: '이동 속도 +15%', cost: 59000, once: true },
  { id: 'tumbler', name: '보온 텀블러', icon: 'cup', desc: '체력 소모 −20%', cost: 25000, once: true },
];
const INVEST = [
  { rev: 250000, key: 'ivBeds', text: '수액 침대 1대 추가' },
  { rev: 550000, key: 'heatBeds', text: '핫팩 침대 1대 추가' },
  { rev: 900000, key: 'tv', text: '대기 공간에 TV 설치 (대기 인내심 ↑)' },
  { rev: 1400000, key: 'ivBeds', text: '수액 침대 1대 추가' },
  { rev: 2000000, key: 'heatBeds', text: '핫팩 침대 1대 추가' },
];
const LEAD_DEF = { name: '한 팀장' };
// 후배 동료: DAY 3 박 선생, DAY 5 이 선생 입사
const MATE_DEFS = [
  { name: '박 선생', from: 3, look: { tired: false, hair: '#6b3f2a', top: '#9ec9f0', pants: '#86b9e8', style: 'pony' } },
  { name: '이 선생', from: 5, look: { tired: false, hair: '#1d1d1d', top: '#f4b6c2', pants: '#eaa0b0', style: 'short' } },
];
const juniorsFor = (day) => MATE_DEFS.filter((m) => day >= m.from);
const FOCUS = { auto: '알아서', desk: '접수·수납', treat: '처치', chart: '기록' };
const RUDE_LINES = ['여기 왜 이렇게 느려요!', '내가 먼저 왔는데?!', '아가씨! 아가씨!', '원장 나오라 그래!', '주사 하나 놓는 데 뭐 이리 오래 걸려?', '돈 내고 왔는데 이게 뭐야!'];
const ERRANDS = [
  { label: '처방 대신 입력 좀', icon: 'clipboard', dur: 1.6 },
  { label: '커피 한 잔만~', icon: 'cup', dur: 1.2 },
  { label: '보험 서류 정리 좀', icon: 'doc', dur: 1.8 },
  { label: '내일 예약 확인해 줘', icon: 'phone', dur: 1.2 },
];
const LEAD_SCOLD = {
  rest: '“환자 밀려 있는데 지금 쉬어요?”',
  choco: '“일하다 말고 뭘 먹어요? 신규가 간이 크네.”',
  chart: '“기록 이렇게 밀려도 돼요? 내가 하나하나 다 봐야 돼?”',
  angry: '“환자 화나서 가는 거 봤어요. 정신 안 차려요?”',
  incident: '“투약 사고? 경위서 오늘 안에 써서 올려요.”',
};
const LEAD_SWEET = ['원장님~ 오늘 넥타이 너무 멋지세요 호호', '원장님 커피 타 드릴까요~?', '원장님 오늘 환자 많아서 힘드시죠~'];
const HARASS_LINES = ['“김 선생은 오늘따라 예쁘네~ 남자친구 있어?”', '“요즘 애들은 치마 입고 다니면 좋을 텐데 말이야.”', '“김 선생, 이따 둘이 회식이나 할까?”'];
const PHONE_LINES = ['“오늘 몇 시까지 해요?”', '“독감 주사 예약 되나요?”', '약국: “처방 용량 확인 부탁드려요”', '“어제 받은 약 먹고 속이 쓰려요…”', '“주차 되나요?”', '“점심시간에도 진료해요?”'];
const TIPS = [
  '환자 머리 위 색깔이 처방이에요. 같은 색 약을 챙기세요.',
  '팀장님 지시 말풍선을 탭하면 바로 처리하러 가요.',
  '팀장님 근처에서 쉬면 한소리 들어요. 동선을 잘 짜세요.',
  '최원장님 날엔 점심이 30분뿐이에요. 미리 초코바를 챙기세요.',
  '기록이 밀리면 퇴근 후 무급 야근이 돼요.',
];

// ================= 저장 =================
function defaultSave() {
  return {
    day: 1, money: 0, rating: 3.0, rank: 0, evalPts: 0, stamina: 100, mental: 100, home: 0, choco: 2,
    items: { cardigan: 0, shoes: 0, tumbler: 0 }, clinic: { ivBeds: 2, heatBeds: 2, tv: 0 },
    revenue: 0, investIdx: 0, seen: {}, lastDoc: null, focus: ['auto', 'auto'], muted: false,
  };
}
function loadSave() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!raw) return defaultSave();
    const d = defaultSave();
    return { ...d, ...raw, items: { ...d.items, ...(raw.items || {}) }, clinic: { ...d.clinic, ...(raw.clinic || {}) }, seen: raw.seen || {}, focus: raw.focus || d.focus };
  } catch (_) { return defaultSave(); }
}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) {} }
let save = loadSave();
let S = null;
const maxStat = () => HOMES[save.home].max;
const trayCap = () => 2 + (save.items.cardigan ? 1 : 0);

// ================= DOM =================
const mapEl = $('#map'), stageEl = $('#stage'), ovEl = $('#ov');
const el = {
  day: $('#day'), clock: $('#clock'), phase: $('#phase'), tlFill: $('#timeline-fill'), timeline: $('.timeline'),
  money: $('#money'), rating: $('#rating'), combo: $('#combo'),
  gH: $('#g-hunger'), gB: $('#g-bladder'), gS: $('#g-stamina'), gM: $('#g-mental'),
  traySlots: $('#tray-slots'), trayCount: $('#tray-count'), queue: $('#queue'),
  choco: $('#btn-choco'), chocoCount: $('#choco-count'), mates: $('#btn-mates'), mateCount: $('#mate-count'),
  toasts: $('#toasts'), hint: $('#hint'), sheet: $('#sheet'),
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

// ================= 의원 평면도 =================
const ROWS = [[-11, -5], [-5, 1.5], [1.5, 11]];
const COR = 1.1, XMAX = 6.6;
const ROOM_DEF = {
  exam:    [-1, 0, '진료실', '#dff1ec', '#1fb39a'],
  cabinet: [1, 0, '약품장', '#e4eef6', '#3f7df0'],
  ward:    [-1, 1, '수액·치료실', '#dcf0f6', '#3aa8f0'],
  inject:  [1, 1, '주사실', '#e6e3fa', '#7d6cf0'],
  desk:    [-1, 2, '접수·수납', '#f6ecd6', '#f5a524'],
  pantry:  [1, 2, '탕비실', '#e8e8e8', '#9bb0ab'],
};
const ROOMS = {};
for (const [k, [side, row, name, floor, dot]] of Object.entries(ROOM_DEF)) {
  const x0 = side < 0 ? -XMAX : COR, x1 = side < 0 ? -COR : XMAX;
  const [z0, z1] = ROWS[row];
  ROOMS[k] = { key: k, side, row, name, floor, dot, x0, x1, z0, z1, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 };
  ROOMS[k].door = { x: side * COR, z: ROOMS[k].cz };
}
// 방 기준 좌표: +dx = 복도(문) 쪽
const R = (k, dx, dz, extra = {}) => ({ x: ROOMS[k].cx + dx * -ROOMS[k].side, z: ROOMS[k].cz + dz, ...extra });
function roomAt(x, z) {
  if (Math.abs(x) < COR) return null;
  for (const r of Object.values(ROOMS)) if (x >= r.x0 - 0.01 && x <= r.x1 + 0.01 && z >= r.z0 - 0.01 && z <= r.z1 + 0.01) return r;
  return null;
}
// 약품장 ↔ 주사실 내부 문
const LINK_DX = -1.6;
const LINKS = { 'cabinet>inject': [R('cabinet', LINK_DX, 2.3), R('inject', LINK_DX, -2.6), R('inject', LINK_DX, -0.1)] };
LINKS['inject>cabinet'] = [...LINKS['cabinet>inject']].reverse();

const world = new THREE.Group();
scene.add(world);
{
  const base = mesh(new THREE.BoxGeometry(XMAX * 2 + 1.4, 0.4, 24.6), '#9fc9be');
  base.position.set(0, -0.21, 0.6); world.add(base);
  const corridor = mesh(new THREE.BoxGeometry(COR * 2, 0.04, 23.4), '#d6e4e0');
  corridor.position.set(0, 0, 0.7); world.add(corridor);
  for (const r of Object.values(ROOMS)) {
    const f = mesh(new THREE.BoxGeometry(r.x1 - r.x0, 0.05, r.z1 - r.z0), r.floor);
    f.position.set(r.cx, 0, r.cz); world.add(f);
  }
  box(1.8, 0.03, 0.9, '#2bb5a0', 0, 0.03, 11.7, world);
  const WALL = '#fbfdfc', TRIM = '#cfe3de';
  const wall = (x0, z0, x1, z1, h, color = WALL) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    if (len < 0.05) return;
    const w = box(len, h, 0.14, color, (x0 + x1) / 2, h / 2, (z0 + z1) / 2, world);
    w.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
  };
  wall(-XMAX, -11, XMAX, -11, 1.7);
  wall(-XMAX, -11, -XMAX, 11, 1.1);
  wall(XMAX, -11, XMAX, 11, 1.1);
  for (const z of [-5, 1.5]) wall(-XMAX, z, -COR, z, 0.55, TRIM);
  const lx = R('cabinet', LINK_DX, 0).x;
  wall(COR, -5, lx - 0.65, -5, 0.55, TRIM); wall(lx + 0.65, -5, XMAX, -5, 0.55, TRIM);
  box(1.3, 0.04, 0.5, '#c8d7f0', lx, 0.03, -5, world);
  wall(COR, 1.5, XMAX, 1.5, 0.55, TRIM);
  for (const r of Object.values(ROOMS)) {
    const x = r.side * COR;
    wall(x, r.z0, x, r.cz - 0.95, 0.55, TRIM);
    wall(x, r.cz + 0.95, x, r.z1, 0.55, TRIM);
  }
  box(3.6, 0.7, 0.12, '#2bb5a0', 0, 1.35, -10.9, world).castShadow = false;
}

// ---------- 가구 ----------
const CHAIR_SCALE = 1.2;
function chair(x, z, rot, color, parent = world) {
  const g = new THREE.Group();
  box(0.46, 0.07, 0.42, color, 0, 0.3, 0, g);
  box(0.46, 0.42, 0.06, color, 0, 0.52, -0.2, g);
  cyl(0.04, 0.05, 0.28, '#8a9a97', 0, 0.14, 0, g, 8);
  g.position.set(x, 0, z); g.rotation.y = rot; g.scale.setScalar(CHAIR_SCALE);
  parent.add(g);
  return g;
}
function plant(p, parent = world) {
  cyl(0.2, 0.15, 0.35, '#c98b5a', p.x, 0.18, p.z, parent, 10);
  sph(0.32, '#5cb874', p.x, 0.6, p.z, parent);
  sph(0.22, '#4aa863', p.x + 0.12, 0.82, p.z - 0.05, parent);
}

const SEATS = { lobby: [], inject: [] };
for (const [dz, via] of [[0.9, (dx) => [R('desk', dx, 0.1)]], [2.7, (dx) => [R('desk', 2.35, 1.8), R('desk', dx, 1.8)]]]) {
  for (const dx of [-2.3, -1.25, -0.2, 0.85, 1.9]) {
    const s = R('desk', dx, dz, { rot: Math.PI, pose: 'sit', via: via(dx) });
    SEATS.lobby.push(s);
    chair(s.x, s.z + 0.12, Math.PI, '#f2a65a');
  }
}
for (const [dz, face] of [[-1.5, 0], [1.5, Math.PI]]) {
  for (const dx of [-0.4, 0.8, 2.0]) {
    const s = R('inject', dx, dz, { rot: face, pose: 'sit', via: [R('inject', dx, -0.1)] });
    SEATS.inject.push(s);
    chair(s.x, s.z - Math.cos(face) * 0.12, face, '#8f7fe8');
  }
}
const OVERFLOW = {
  lobby: [R('desk', 2.3, 3.5), R('desk', 2.3, 4.2), R('desk', 1.5, 4.3), R('desk', 0.7, 4.3)].map((p) => ({ ...p, rot: Math.PI, pose: 'stand' })),
  inject: [R('inject', 2.3, 2.7), R('inject', 1.5, 2.8)].map((p) => ({ ...p, rot: Math.PI, pose: 'stand' })),
};

const DESK_VIA = [R('desk', 2.2, -3.5)];
const DESK_SLOTS = [
  { spot: R('desk', -1.6, -3.5, { rot: 0, via: DESK_VIA }), window: R('desk', -1.6, -1.75, { rot: Math.PI, pose: 'stand' }), owner: null },
  { spot: R('desk', 0.2, -3.5, { rot: 0, via: DESK_VIA }), window: R('desk', 0.2, -1.75, { rot: Math.PI, pose: 'stand' }), owner: null },
];
const SP = {
  ticket: R('desk', 1.5, -1.3, { rot: Math.PI / 2, pose: 'stand' }),
  examChair: R('exam', -1.4, 0.0, { rot: Math.PI, pose: 'sit', via: [R('exam', -1.4, 1.0)] }),
  examNext: R('exam', 2.1, 0.9, { rot: -Math.PI / 2, pose: 'stand' }),
  errand: R('exam', -0.25, -1.85, { rot: -Math.PI / 2, via: [R('exam', -0.25, -0.6)] }),
  prep: R('cabinet', 0.2, 0.15, { rot: Math.PI }),
  toilet: R('pantry', 1.5, -1.35, { rot: Math.PI }),
  snack: R('pantry', -0.8, -1.45, { rot: Math.PI }),
  lunchSeats: [R('pantry', -1.7, -1.5, { rot: Math.PI, pose: 'sit' }), R('pantry', 0.1, -1.5, { rot: Math.PI, pose: 'sit' })],
  exit: { x: 0, z: 12.6 },
};

// 진료실
{
  const d = R('exam', -1.4, -1.0);
  box(1.7, 0.75, 0.8, '#c99a6b', d.x, 0.375, d.z, world);
  const mon = R('exam', -1.05, -1.2);
  box(0.6, 0.4, 0.05, '#2d3436', mon.x, 0.98, mon.z, world);
  chair(d.x, d.z - 0.85, 0, '#555555');
  chair(SP.examChair.x, SP.examChair.z + 0.12, Math.PI, '#8fcfc0');
  const b = R('exam', 1.9, -1.9);
  box(0.9, 0.5, 1.8, '#e7eeee', b.x, 0.25, b.z, world);
  box(0.85, 0.12, 1.75, '#9ad0e6', b.x, 0.56, b.z, world);
  plant(R('exam', -2.4, 2.4));
}
// 약품장
{
  const s = R('cabinet', 0, -2.45);
  box(4.8, 1.9, 0.55, '#f4f7f8', s.x, 0.95, s.z, world);
  box(4.6, 1.6, 0.04, '#bfe3f0', s.x, 1.05, s.z + 0.29, world, { transparent: true, opacity: 0.55 });
  const cols = ['#ff8a80', '#ffd180', '#80d8ff', '#b9f6ca', '#ea80fc'];
  for (let i = 0; i < 14; i++) box(0.22, 0.28, 0.2, cols[i % cols.length], s.x - 2.1 + (i % 7) * 0.7, i < 7 ? 0.65 : 1.25, s.z, world);
  const t = R('cabinet', 0.2, -0.9);
  box(2.6, 0.75, 0.7, '#d7e7e3', t.x, 0.375, t.z, world);
  Object.values(MEDS).forEach((m, i) => box(0.36, 0.22, 0.4, m.color, t.x - 1.0 + i * 0.5, 0.86, t.z, world));
}
// 주사실
{
  const c = R('inject', -2.3, 2.2);
  box(0.7, 0.85, 0.5, '#f0f0f6', c.x, 0.43, c.z, world);
  box(0.6, 0.06, 0.4, '#b9b2ec', c.x, 0.9, c.z, world);
  const sink = R('inject', -2.4, -2.6);
  box(0.7, 0.9, 0.5, '#e8ecef', sink.x, 0.45, sink.z, world);
  plant(R('inject', 2.4, -2.7));
}
// 접수·수납
const PHONE_POS = R('desk', -2.2, -2.6);
const MON_POS = R('desk', -0.7, -2.75);
let phoneMesh;
{
  const c = R('desk', -0.7, -2.6);
  box(3.8, 1.0, 0.6, '#e6c48f', c.x, 0.5, c.z, world);
  box(3.9, 0.06, 0.75, '#fff7e8', c.x, 1.03, c.z, world);
  for (const s of DESK_SLOTS) box(0.5, 0.36, 0.05, '#2d3436', s.spot.x, 1.25, c.z - 0.1, world);
  phoneMesh = new THREE.Group();
  box(0.32, 0.1, 0.22, '#3d3d3d', 0, 0, 0, phoneMesh);
  box(0.36, 0.07, 0.09, '#ff6b5b', 0, 0.08, 0, phoneMesh).rotation.y = 0.2;
  phoneMesh.position.set(PHONE_POS.x, 1.12, PHONE_POS.z);
  world.add(phoneMesh);
  for (const s of DESK_SLOTS) chair(s.spot.x, s.spot.z - 0.25, 0, '#555555');
  const k = R('desk', 2.15, -1.3);
  box(0.45, 1.3, 0.4, '#2bb5a0', k.x, 0.65, k.z, world);
  box(0.3, 0.2, 0.05, '#ffffff', R('desk', 1.95, -1.3).x, 1.05, k.z, world);
  plant(R('desk', -2.4, 4.3));
  const wd = R('desk', -2.4, -4.3);
  box(0.4, 1.0, 0.4, '#e0f2ff', wd.x, 0.5, wd.z, world);
}
// 탕비실
{
  const t = R('pantry', 1.5, -3.0);
  box(1.7, 2.0, 1.7, '#9cc3e3', t.x, 1.0, t.z, world);
  box(0.75, 1.6, 0.05, '#5e8fb8', t.x, 0.8, t.z + 0.86, world);
  const f = R('pantry', -2.2, -4.1);
  box(0.85, 1.75, 0.7, '#f7f7f7', f.x, 0.875, f.z, world);
  const tb = R('pantry', -0.8, -2.4);
  box(2.2, 0.75, 0.8, '#e2c7a6', tb.x, 0.375, tb.z, world);
  for (let i = 0; i < 4; i++) {
    const o = mesh(new THREE.ConeGeometry(0.11, 0.16, 3), '#f5f5f5');
    o.position.set(tb.x - 0.4 + i * 0.25, 0.83, tb.z + 0.1); world.add(o);
  }
  for (const s of SP.lunchSeats) chair(s.x, s.z + 0.12, Math.PI, '#c9a37a');
  const lk = R('pantry', -2.3, 1.2);
  box(0.6, 1.8, 1.6, '#b7c4c9', lk.x, 0.9, lk.z, world);
  const sofa = R('pantry', -0.6, 3.4);
  box(2.0, 0.45, 0.8, '#7fb3a6', sofa.x, 0.23, sofa.z, world);
  box(2.0, 0.5, 0.2, '#6ea396', sofa.x, 0.6, sofa.z + 0.35, world);
}

// ---------- 매일 바뀌는 것: 침대 · TV ----------
const dayGroup = new THREE.Group();
world.add(dayGroup);
function buildBeds(holder) {
  dayGroup.clear();
  holder.beds = [];
  const make = (kind, n, bz, flip) => {
    [-2.2, -0.9, 0.4, 1.7].slice(0, n).forEach((dx) => {
      const c = R('ward', dx, bz);
      const g = new THREE.Group();
      g.position.set(c.x, 0, c.z);
      if (flip) g.rotation.y = Math.PI;
      dayGroup.add(g);
      box(1.0, 0.42, 2.0, '#e9eef0', 0, 0.21, 0, g);
      const mattress = box(0.94, 0.14, 1.9, '#ffffff', 0, 0.49, 0, g);
      mattress.material = new THREE.MeshStandardMaterial({ color: kind === 'iv' ? '#a8dcef' : '#f6c3a0', roughness: 0.8, emissive: '#ff3b2f', emissiveIntensity: 0 });
      box(0.6, 0.1, 0.32, '#ffffff', 0, 0.6, -0.75, g);
      if (kind === 'iv') {
        cyl(0.02, 0.02, 1.9, '#b0b8bb', 0.62, 0.95, -0.7, g, 6);
        box(0.2, 0.3, 0.06, '#9fdcff', 0.62, 1.7, -0.7, g, { transparent: true, opacity: 0.8 });
      } else {
        cyl(0.025, 0.025, 1.7, '#888888', 0.62, 0.85, -0.3, g, 6);
        const lamp = mesh(new THREE.ConeGeometry(0.2, 0.25, 12, 1, true), '#ff8a3d', { emissive: '#ff6a00', emissiveIntensity: 0.6, side: THREE.DoubleSide });
        lamp.position.set(0.45, 1.65, -0.3); lamp.rotation.z = -0.6; g.add(lamp);
      }
      const hit = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 2.2), new THREE.MeshBasicMaterial());
      hit.visible = false; hit.position.y = 0.6; g.add(hit);
      const sgn = flip ? -1 : 1;
      const bed = {
        kind, g, mattress, hit, pid: null, t: 0, dur: 1,
        spot: { x: c.x, z: c.z + 0.5 * sgn, rot: flip ? Math.PI : 0, pose: 'lie', via: [{ x: c.x, z: ROOMS.ward.cz - 0.15 * sgn }] },
        nurseSpot: { x: c.x + 0.05, z: c.z + 1.45 * sgn, rot: flip ? 0 : Math.PI },
        ov: ov('<i></i>', 'pbar ' + kind),
      };
      bed.ov.style.visibility = 'hidden';
      hit.userData.hit = { type: 'bed', bed };
      holder.beds.push(bed);
    });
  };
  make('iv', Math.min(4, save.clinic.ivBeds), -2.0, false);
  make('heat', Math.min(4, save.clinic.heatBeds), 2.0, true);
  if (save.clinic.tv) {
    const t = R('desk', -2.65, 1.8);
    box(0.1, 0.9, 1.5, '#222222', t.x, 1.3, t.z, dayGroup);
    box(0.02, 0.76, 1.36, '#4fb3ff', t.x + 0.06, 1.3, t.z, dayGroup, { emissive: '#2a7fd0', emissiveIntensity: 0.6 });
  }
}
const freeBed = (kind) => S.beds.find((b) => b.kind === kind && !b.pid);

// ================= 오버레이 =================
const _v = new THREE.Vector3();
let viewW = 1, viewH = 1;
function toScreen(x, y, z) { _v.set(x, y, z).project(camera); return { x: (_v.x + 1) / 2 * viewW, y: (1 - _v.y) / 2 * viewH }; }
function placeOv(node, x, y, z) {
  const s = toScreen(x, y, z);
  node.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px) translate(-50%, -100%)`;
}
function ov(html, cls) {
  const d = document.createElement('div');
  d.className = cls; d.innerHTML = html;
  ovEl.appendChild(d);
  return d;
}
const staticOv = [];
for (const r of Object.values(ROOMS)) {
  const node = ov(`<i style="--dot:${r.dot}"></i>${r.name}` + (r.key === 'desk' ? '<em id="wait-count"></em>' : ''), 'rlabel');
  staticOv.push({ node, x: r.side < 0 ? r.x0 + 1.05 : r.x1 - 1.05, y: 0.05, z: r.z1 - 0.12 });
}
function stationBtn(html, p, y, onTap, cls = '', rail = null) {
  let node;
  if (rail) {
    // 화면 가장자리 레일: 3D 캐릭터를 가리지 않게
    node = document.createElement('button');
    node.className = 'sbtn ' + cls; node.innerHTML = html;
    $(rail).appendChild(node);
  } else {
    node = ov(html, 'sbtn ' + cls);
    staticOv.push({ node, x: p.x, y, z: p.z });
  }
  node.addEventListener('click', (e) => { e.stopPropagation(); onTap(); });
  return node;
}
const playing = () => S && !S.paused && !S.ended && !S.modal;
const guard = (fn) => () => { if (playing()) fn(); };
const cabBtn = stationBtn(`<span class="pin">${icon('syringe')}</span><small>약품장</small>`, R('cabinet', 0.2, -0.9), 1.45, guard(() => openCabinet()), 'shot');
stationBtn(`<span class="pin">${icon('toilet')}</span><small>화장실</small>`, R('pantry', 1.5, -2.1), 1.3, guard(() => enqueue(player, { kind: 'toilet' })), 'toilet', '#rail-right');
const snackBtn = stationBtn(`<span class="pin">${icon('onigiri')}</span><small>간식</small>`, R('pantry', -0.8, -2.4), 1.3, guard(() => enqueue(player, { kind: 'snack' })), 'snack', '#rail-right');
const chartBtn = stationBtn(`<span class="pin">${icon('clipboard')}<span class="chart-count"></span></span><small>기록</small>`, MON_POS, 1.55, guard(() => {
  if (!S.charts) { toast('📋 밀린 기록이 없어요'); return; }
  enqueue(player, { kind: 'chart' });
}), 'chart', '#rail-left');
const chartCount = chartBtn.querySelector('.chart-count');
const phoneBtn = stationBtn(`<span class="pin">${icon('phone')}</span><small>전화</small>`, PHONE_POS, 1.5, guard(() => {
  if (!S.phone.ringing) { toast('전화가 울리고 있지 않아요'); return; }
  enqueue(player, { kind: 'phone' });
}), 'phone', '#rail-left');
const errandOv = ov('<span class="e-ic"></span><span class="e-tx"></span><i></i>', 'errand');
errandOv.style.display = 'none';
errandOv.addEventListener('click', (e) => { e.stopPropagation(); if (playing() && S.errand) enqueue(player, { kind: 'errand' }); });
const choreOv = ov(`<span class="e-ic">${icon('megaphone')}</span><span class="e-tx">팀장님 지시</span><i></i>`, 'errand directive');
choreOv.style.display = 'none';
choreOv.addEventListener('click', (e) => { e.stopPropagation(); if (playing() && S.directive) enqueue(player, { kind: S.directive.kind, pid: S.directive.pid }); });
function layoutStaticOverlays() { for (const o of staticOv) placeOv(o.node, o.x, o.y, o.z); }

// 말풍선
const bubbles = [];
function say(target, text, cls = '', dur = 2.2) {
  for (let i = bubbles.length - 1; i >= 0; i--) if (bubbles[i].target === target) { bubbles[i].node.remove(); bubbles.splice(i, 1); }
  const node = ov('', 'bubble ' + cls);
  node.textContent = text;
  bubbles.push({ node, target, until: performance.now() + dur * 1000 });
}
function updateBubbles() {
  const now = performance.now();
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    if (now > b.until) { b.node.remove(); bubbles.splice(i, 1); continue; }
    const p = b.target.bubblePos ? b.target.bubblePos() : b.target.pos;
    placeOv(b.node, p.x, 2.55, p.z);
  }
}

// ================= 카메라 · 확대 · 입력 =================
let focusing = false;
const cam = { base: 40, zoom: 1, tZoom: 1, px: 0, pz: 0, tpx: 0, tpz: 0 };
const ZMIN = 1, ZMAX = 3.2;
const FIT_PTS = [];
for (const x of [-XMAX - 0.3, XMAX + 0.3]) for (const z of [-11.2, 12.4]) for (const y of [0, 1.7]) FIT_PTS.push(new THREE.Vector3(x, y, z));
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
    camera.lookAt(CAM_LOOK); camera.updateMatrixWorld();
    const fits = FIT_PTS.every((p) => { const v = p.clone().project(camera); return Math.abs(v.x) <= 0.98 && Math.abs(v.y) <= 0.96; });
    if (fits) hi = d; else lo = d;
  }
  cam.base = hi;
  applyCamera();
}
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
  camera.lookAt(look); camera.updateMatrixWorld();
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
new ResizeObserver(fitCamera).observe(mapEl);
window.addEventListener('resize', fitCamera);
const worldPerPx = () => (2 * (cam.base / cam.zoom) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / viewH;
function zoomBy(f) { cam.tZoom *= f; clampCam(); }
const cvs = renderer.domElement;
function zoomAt(cx, cy, f) {
  const r = cvs.getBoundingClientRect();
  const dx = cx - r.left - viewW / 2, dy = cy - r.top - viewH / 2;
  const w = worldPerPx();
  cam.tpx += dx * w * (1 - 1 / f);
  cam.tpz += (dy * w / CAM_DIR.y) * (1 - 1 / f);
  cam.tZoom *= f; clampCam();
}
$('#zoom-in').addEventListener('click', () => zoomBy(1.4));
$('#zoom-out').addEventListener('click', () => zoomBy(1 / 1.4));
$('#zoom-reset').addEventListener('click', () => { cam.tZoom = 1; cam.tpx = 0; cam.tpz = 0; });
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, (e) => e.preventDefault());

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const pointers = new Map();
let gesture = null, lastTap = { t: 0, x: 0, y: 0 };
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
function panBy(dxPx, dyPx) { const w = worldPerPx(); cam.tpx -= dxPx * w; cam.tpz -= (dyPx * w) / CAM_DIR.y; }
function endPointer(e) {
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);
  if (gesture && gesture.type === 'tap' && pointers.size === 0) {
    const hit = handleTap(e.clientX, e.clientY);
    const now = performance.now();
    if (!hit && now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30) {
      if (cam.tZoom > 1.6) { cam.tZoom = 1; cam.tpx = 0; cam.tpz = 0; } else zoomAt(e.clientX, e.clientY, 2);
      lastTap.t = 0;
    } else lastTap = { t: now, x: e.clientX, y: e.clientY };
  }
  if (pointers.size === 0) gesture = null;
  else if (gesture && gesture.type === 'pinch') { const p = [...pointers.values()][0]; gesture = { type: 'pan', lx: p.x, ly: p.y }; }
}
cvs.addEventListener('pointerup', endPointer);
cvs.addEventListener('pointercancel', (e) => { pointers.delete(e.pointerId); if (!pointers.size) gesture = null; });
cvs.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });

function handleTap(cx, cy) {
  if (!playing()) return false;
  const r = cvs.getBoundingClientRect();
  ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const targets = [phoneMesh];
  if (doctor) targets.push(doctor.hit);
  for (const p of S.patients.values()) targets.push(p.ch.hit);
  for (const b of S.beds) targets.push(b.hit);
  const hits = raycaster.intersectObjects(targets, true);
  for (const h of hits) {
    let o = h.object;
    while (o && !o.userData.hit && o !== phoneMesh) o = o.parent;
    if (!o) continue;
    if (o === phoneMesh) { phoneBtn.click(); return true; }
    const info = o.userData.hit;
    if (info.type === 'doctor') { if (S.errand) enqueue(player, { kind: 'errand' }); else toast('🧑‍⚕️ 원장님은 진료 중이에요'); return true; }
    if (info.type === 'patient') { onPatientTap(info.id); return true; }
    if (info.type === 'bed') {
      if (info.bed.pid) onPatientTap(info.bed.pid);
      else toast(info.bed.kind === 'iv' ? '비어 있는 수액 침대예요' : '비어 있는 핫팩 침대예요');
      return true;
    }
  }
  return false;
}

// ================= 피드백 =================
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
  while (el.toasts.children.length > 1) el.toasts.firstChild.remove();
  setTimeout(() => t.remove(), 2700);
}
let hintTimer = null;
function hint(key, msg) {
  if (save.seen[key] || (S && S.tut)) return;
  save.seen[key] = true; persist();
  const [ic, text] = splitIcon(msg, 'info');
  el.hint.innerHTML = `<span class="h-ic">${icon(ic)}</span><div><b>TIP</b><span></span></div>`;
  el.hint.querySelector(':scope > div > span').textContent = text;
  el.hint.classList.remove('hidden');
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => el.hint.classList.add('hidden'), 5000);
}
el.hint.addEventListener('click', () => el.hint.classList.add('hidden'));
function floatText(pos, text, bad = false) {
  if (!pos) return;
  const s = toScreen(pos.x, 1.8, pos.z);
  const f = document.createElement('div');
  f.className = 'float' + (bad ? ' bad' : '');
  f.textContent = text;
  f.style.left = (s.x - 24) + 'px'; f.style.top = (s.y - 10) + 'px';
  mapEl.appendChild(f);
  setTimeout(() => f.remove(), 1000);
}

// ================= 경로 =================
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function route(pos, from, to) {
  if (dist(pos, to) < 0.05) return [];
  const ra = roomAt(pos.x, pos.z), rb = roomAt(to.x, to.z);
  const fv = from && from.via && from !== to ? [...from.via].reverse() : [];
  const tv = to.via || [];
  if (ra && rb && ra === rb) {
    // 같은 방 · 같은 진입로(예: 데스크 자리끼리)면 바로 이동 → 문 앞까지 갔다 오는 버그 방지
    if (from && from.via && to.via && dist(from.via[0], to.via[0]) < 0.05) return [to];
    return [...fv, ...tv, to];
  }
  const link = ra && rb && LINKS[ra.key + '>' + rb.key];
  if (link) return [...fv, ...link, ...tv, to];
  const pts = [];
  if (ra) pts.push(...fv, ra.door, { x: 0, z: ra.cz }); else pts.push({ x: 0, z: pos.z });
  if (rb) pts.push({ x: 0, z: rb.cz }, rb.door, ...tv);
  pts.push(to);
  return pts;
}
function stepAlong(m, dt, speed) {
  let budget = speed * dt;
  while (m.path.length && budget > 0) {
    const t = m.path[0];
    const dx = t.x - m.pos.x, dz = t.z - m.pos.z, d = Math.hypot(dx, dz);
    if (d > 0.001) m.face = Math.atan2(dx, dz);
    if (d <= budget) { m.pos.x = t.x; m.pos.z = t.z; budget -= d; m.path.shift(); }
    else { m.pos.x += (dx / d) * budget; m.pos.z += (dz / d) * budget; budget = 0; }
  }
  return m.path.length === 0;
}
function turnTo(g, target, dt) {
  let diff = target - g.rotation.y;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  g.rotation.y += diff * Math.min(1, dt * 12);
}
function goTo(m, spot) { m.path = route(m.pos, m.spot, spot); m.spot = spot; }

// ================= 배우(간호사들) =================
function makeActor(kind, name, ch, idx) {
  const a = {
    kind, name, ch, idx, pos: { x: DESK_SLOTS[0].spot.x, z: DESK_SLOTS[0].spot.z }, spot: null, path: [], face: 0, hands: [], queue: [], cur: null,
    focus: 'auto', state: 'work', ovNode: ov(`<span class="nametag ${kind === 'player' ? 'me' : kind === 'lead' ? 'lead' : ''}">${name}</span><div class="pbar"><i></i></div>`, 'actor-ov'),
  };
  a.barEl = a.ovNode.querySelector('.pbar'); a.barFill = a.barEl.firstChild;
  a.bubblePos = () => a.pos;
  setPose(ch, 'stand');
  world.add(ch.g);
  return a;
}
const player = makeActor('player', '나', makeNurse(), -1);
let mates = [];
let doctor = null;
let lead = null;

function placeDoctor(look) {
  if (doctor) world.remove(doctor.g);
  doctor = makeDoctor(look);
  const dp = R('exam', -1.4, -1.85);
  doctor.g.position.set(dp.x, 0, dp.z);
  setPose(doctor, 'sit');
  doctor.hit.userData.hit = { type: 'doctor' };
  doctor.pos = { x: dp.x, z: dp.z };
  doctor.bubblePos = () => doctor.pos;
  world.add(doctor.g);
}
function buildDayCast() {
  for (const m of mates) { world.remove(m.ch.g); m.ovNode.remove(); }
  lead = makeActor('lead', LEAD_DEF.name, makeLead(), 0);
  lead.isLead = true; lead.focus = 'auto';
  const juniors = juniorsFor(save.day).map((d, i) => {
    const m = makeActor('mate', d.name, makeNurse(d.look), i + 1);
    m.jIdx = i; m.focus = save.focus[i] || 'auto';
    return m;
  });
  mates = [lead, ...juniors];
  placeDoctor(S.doc.look);
  el.mateCount.textContent = mates.length;
}
const allActors = () => [player, ...mates];

// ================= 하루 시작 =================
function pickDoctor() {
  const owner = DOCTORS[0];
  if (save.day <= 3) return owner;
  if (Math.random() < 0.6) return owner;
  return pick(DOCTORS.slice(1).filter((d) => d.id !== save.lastDoc));
}
function clearDay() {
  if (!S) return;
  for (const p of [...S.patients.values(), ...S.leavers]) disposePatient(p);
  for (const b of S.beds) b.ov.remove();
  for (const b of bubbles) b.node.remove();
  bubbles.length = 0;
}
function newDay(doc) {
  clearDay();
  el.toasts.innerHTML = '';
  el.hint.classList.add('hidden');
  closeSheet();
  const day = save.day;
  const mx = maxStat();
  S = {
    t: 0, clock: 0, closed: false, intakeClosed: false, ended: false, paused: false, modal: false,
    doc, patients: new Map(), leavers: [], nextId: 1, ticket: 0,
    examQ: [], D: { cur: null, next: null, t: 0, dur: 1 },
    seatOwner: { lobby: Array(SEATS.lobby.length).fill(null), inject: Array(SEATS.inject.length).fill(null) },
    body: { hunger: mx, bladder: mx, stamina: clamp(save.stamina, 0, mx), mental: clamp(save.mental, 0, mx) },
    warned: {}, beds: [], phone: { ringing: false, left: 0, next: rand(20, 32), by: null },
    spawnAt: 0.8, combo: 0, lastDone: -99, returns: [], charts: 0,
    errand: null, errandAt: rand(50, 75) / doc.errandMul, directive: null, directiveAt: rand(22, 35), bossCd: {},
    quizAt: doc.quiz && Math.random() < 0.35 ? rand(70, 160) : -1, quizCount: 0, quizPending: -1,
    lunchEnd: LUNCH_E, intakeEnd: END_MIN - 30, extendDone: false,
    changeAt: day >= 2 ? rand(45, 120) / (doc.changeMul || 1) : -1,
    emergencyAt: day >= 2 ? rand(35, 150) : -1,
    harassAt: doc.harass ? rand(30, 55) : -1, harassCount: 0,
    coffeeAt: doc.kind ? rand(60, 140) : -1,
    bloodLeft: 1 + (Math.random() < 0.5 ? 1 : 0),
    lateDone: false, lunchToast: false, lunchEndToast: false,
    stats: { served: 0, angry: 0, incidents: 0, revenue: 0, phone: 0, phoneMissed: 0, e119: 0, skippedMeal: false, heldPee: false,
             startRating: save.rating, maxCombo: 0, restSec: 0, errands: 0, errandsMissed: 0, rude: 0, charted: 0,
             taeum: 0, harass: 0, ateLunch: false, blood: 0, bloodFail: 0, chores: 0, evalAdj: 0, ord: 0, ordMiss: 0, quizOk: 0, quizBad: 0 },
  };
  for (const b of preview.beds) b.ov.remove();
  preview.beds = [];
  buildDayCast();
  buildBeds(S);
  allActors().forEach((a, i) => {
    a.hands = []; a.queue = []; a.cur = null; a.path = []; a.state = 'work'; a.slot = null;
    const sp = i < 2 ? DESK_SLOTS[i].spot : SP.prep;
    a.pos = { x: sp.x, z: sp.z }; a.spot = sp; a.face = 0;
    a.ch.g.position.set(sp.x, 0, sp.z); a.ch.g.visible = true;
  });
  DESK_SLOTS.forEach((s) => (s.owner = null));
  updateCharts(); renderHands(); renderQueue();
  el.day.textContent = day;
  phoneBtn.classList.remove('ringing');
  errandOv.style.display = 'none'; choreOv.style.display = 'none';
  setTimeout(() => toast('🕘 08:30 조기 출근 · 인계받은 30분은 근무시간에 안 쳐줘요'), 400);
  hint('first', '👆 번호표를 뽑고 앉은 환자를 탭하면 데스크에서 접수해요. 동료 간호사들도 알아서 같이 일해요!');
}

// ================= 환자 =================
const lobbyWaiting = () => { let n = 0; for (const p of S.patients.values()) if (p.state === 'wait' || p.state === 'arrive') n++; return n; };
function spawnPatient(type, opts = {}) {
  const p = {
    id: S.nextId++, type, emoji: TYPES[type].emoji, name: opts.name || pick(LAST) + pick(FIRST),
    ticket: ++S.ticket, max: opts.max || TYPES[type].patience, state: opts.state || 'arrive', arriveT: 0,
    order: null, med: null, vein: Math.random() < 0.45 ? 'hard' : 'good', docs: !!opts.docs, returning: !!opts.returning,
    rude: !!opts.rude, yellT: rand(4, 7), bed: null, busy: false, seat: null,
    pos: { ...SP.exit }, path: [], face: Math.PI, spot: null,
  };
  if (save.day === 1) p.max *= 1.3; else if (save.day === 2) p.max *= 1.15;
  p.patience = p.max;
  p.ch = makePatientModel(type, Math.random());
  setPose(p.ch, 'stand');
  p.ch.g.position.set(p.pos.x, 0, p.pos.z);
  p.ch.g.rotation.y = Math.PI;
  p.ch.hit.userData.hit = { type: 'patient', id: p.id };
  world.add(p.ch.g);
  p.ov = ov(`<span class="tag"></span><span class="bar"><i></i></span><span class="qmark">${icon('check')}</span><span class="mate-tag">${icon('users')}</span>`, 'po');
  p.tagEl = p.ov.querySelector('.tag'); p.barEl = p.ov.querySelector('.bar i');
  p.ov.addEventListener('click', (e) => { e.stopPropagation(); onPatientTap(p.id); });
  S.patients.set(p.id, p);
  if (p.state === 'arrive') goTo(p, SP.ticket);
  else if (p.state === 'pay') goTo(p, takeSeat(p, 'lobby'));
  else if (p.state === 'order') { p.order = opts.order; p.med = opts.med || null; goTo(p, takeSeat(p, 'inject')); }
  renderPatient(p);
  return p;
}
function takeSeat(p, pool) {
  releaseSeat(p);
  const arr = S.seatOwner[pool];
  const i = arr.indexOf(null);
  if (i >= 0) { arr[i] = p.id; p.seat = { pool, idx: i }; return SEATS[pool][i]; }
  p.seat = { pool, idx: -1 };
  return OVERFLOW[pool][p.id % OVERFLOW[pool].length];
}
function releaseSeat(p) {
  if (p.seat && p.seat.idx >= 0 && S.seatOwner[p.seat.pool][p.seat.idx] === p.id) S.seatOwner[p.seat.pool][p.seat.idx] = null;
  p.seat = null;
}
const seatSpot = (p) => (!p.seat ? null : p.seat.idx >= 0 ? SEATS[p.seat.pool][p.seat.idx] : OVERFLOW[p.seat.pool][p.id % OVERFLOW[p.seat.pool].length]);
function setState(p, st) { p.state = st; renderPatient(p); }
function renderPatient(p) {
  if (!p.ov) return;
  const b = (ic, cls, style = '') => `<span class="badge-ic ${cls}" style="${style}">${icon(ic)}</span>`;
  let html = '';
  if (p.type === 'emergency') html = b('heartPulse', 'alert');
  else if (p.state === 'wait' || p.state === 'arrive') html = p.rude ? b('angry', 'rude') : `<span class="badge-ic ticket"><b>${p.ticket}</b></span>`;
  else if (p.state === 'order' || p.state === 'tobed') {
    const m = p.med && MEDS[p.med];
    html = m ? b(ORDER[p.order].icon, 'med', `--c:${m.color}`) : b(ORDER[p.order].icon, p.order);
  } else if (p.state === 'beddone') html = b('bell', 'bell');
  else if (p.state === 'pay') html = p.docs ? b('doc', 'doc') : b('card', 'pay');
  else if (p.state === 'examq' && S.D.cur === p.id) html = b('stetho', 'exam');
  else if (p.rude && p.state === 'examq') html = b('angry', 'rude');
  if (p.tagHtml !== html) { p.tagHtml = html; p.tagEl.innerHTML = html; }
  p.ov.classList.toggle('ringing', p.state === 'beddone');
  if (p.bed) p.bed.mattress.material.emissiveIntensity = p.state === 'beddone' ? 0.35 : 0;
}
function disposePatient(p) {
  world.remove(p.ch.g);
  p.ch.g.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  if (p.ov) { p.ov.remove(); p.ov = null; }
}
function removePatient(p) {
  S.patients.delete(p.id);
  releaseSeat(p);
  if (p.bed) { p.bed.pid = null; p.bed.mattress.material.emissiveIntensity = 0; p.bed.ov.style.visibility = 'hidden'; p.bed = null; }
  S.examQ = S.examQ.filter((x) => x !== p.id);
  if (S.D.cur === p.id) S.D.cur = null;
  if (S.D.next === p.id) S.D.next = null;
  for (const a of allActors()) {
    a.queue = a.queue.filter((t) => t.pid !== p.id);
    if (a.cur && a.cur.a.pid === p.id && a.cur.phase !== 'work') { if (a === player) closeSheet('pick'); a.cur = null; }
  }
  if (p.ov) { p.ov.remove(); p.ov = null; }
  setPose(p.ch, 'stand');
  goTo(p, SP.exit);
  S.leavers.push(p);
  renderQueue();
}
function refill(p, r = 0.35) { p.patience = Math.min(p.max, p.patience + p.max * r); }
function toPay(p) {
  if (!p.docs) p.docs = Math.random() < 0.25;
  refill(p);
  setState(p, 'pay');
  goTo(p, takeSeat(p, 'lobby'));
  hint('pay', '🧾 처치가 끝난 환자는 접수·수납실에 앉아 수납을 기다려요. 탭하면 수납 창구로 불러요.');
}
function leaveAngry(p) {
  if (p.type === 'emergency') { save.rating -= 0.8; toast(`🚨 ${p.name}님 상태 악화! 응급 대처에 실패했어요`, 'warn'); vibrate([200, 80, 200]); }
  else { save.rating -= 0.2; toast(`😡 ${p.name}님이 기다리다 화나서 가셨어요`, 'warn'); }
  floatText(p.pos, '평판 −', true);
  S.stats.angry++;
  S.body.mental -= 6;
  if (leadNear(9)) leadScold('angry', 6);
  removePatient(p);
}

// ================= 할 일 · 소유권 =================
const sameTask = (a, b) => a.kind === b.kind && a.pid === b.pid && a.med === b.med;
function claimedBy(kind, pid) {
  for (const a of allActors()) {
    if (a.cur && a.cur.a.kind === kind && a.cur.a.pid === pid) return a;
    if (a.queue.some((t) => t.kind === kind && t.pid === pid)) return a;
  }
  return null;
}
function onPatientTap(id) {
  if (!playing()) return;
  const p = S.patients.get(id);
  if (!p) return;
  const want = { arrive: null, wait: p.type === 'emergency' ? 'call119' : 'register', examq: null, order: 'treat', tobed: 'setup', bed: null, beddone: 'unbed', pay: 'pay' }[p.state];
  if (!want) {
    if (p.state === 'examq') toast(S.D.cur === id ? '🧑‍⚕️ 원장님이 진료 중이에요' : '접수 완료 · 진료를 기다리는 중이에요');
    else if (p.state === 'bed') toast(`아직 ${Math.ceil(p.bed.t)}초 남았어요`);
    else if (p.state === 'arrive') toast('🎫 번호표 뽑는 중이에요');
    return;
  }
  const who = claimedBy(want, id);
  if (who && who !== player) { toast(`👥 ${who.name}님이 이미 처리 중이에요`); return; }
  enqueue(player, { kind: want, pid: id });
}
function enqueue(actor, t) {
  if (!S || S.ended) return false;
  const all = actor.cur ? [actor.cur.a, ...actor.queue] : actor.queue;
  if (actor === player) {
    if ((t.pid || ['chart', 'errand', 'phone', 'chore'].includes(t.kind)) && all.some((x) => sameTask(x, t))) { toast('이미 할 일에 들어 있어요'); return false; }
    if (all.length >= MAX_TASKS) { toast(`할 일이 너무 많아요! (최대 ${MAX_TASKS}개)`, 'warn'); return false; }
  }
  actor.queue.push(t);
  if (actor === player) renderQueue();
  return true;
}
function taskIcon(t) {
  const p = t.pid ? S.patients.get(t.pid) : null;
  const orderIcon = p && p.order ? ORDER[p.order].icon : 'syringe';
  return { register: 'doc', call119: 'ambulance', treat: orderIcon, setup: orderIcon, unbed: 'bell', pay: 'card',
    phone: 'phone', prep: t.med ? ORDER[MEDS[t.med].type].icon : 'syringe', toilet: 'toilet', snack: 'onigiri', chart: 'clipboard', errand: 'stetho', chore: 'megaphone' }[t.kind] || 'info';
}
function taskLabel(t) {
  const p = t.pid ? S.patients.get(t.pid) : null;
  const n = p ? p.name : '';
  switch (t.kind) {
    case 'register': return `접수 ${p ? p.ticket + '번' : ''}`;
    case 'call119': return `119 ${n}`;
    case 'treat': return p ? `${ORDER[p.order].label} ${n}` : '처치';
    case 'setup': return `세팅 ${n}`;
    case 'unbed': return `정리 ${n}`;
    case 'pay': return `수납 ${n}`;
    case 'phone': return '전화';
    case 'prep': return `${MEDS[t.med].name} 챙기기`;
    case 'toilet': return '화장실';
    case 'snack': return isLunch() ? '점심 먹기' : '간식';
    case 'chart': return '기록';
    case 'errand': return '원장님 호출';
    case 'chore': return '재고 정리';
  }
  return t.kind;
}
function renderQueue() {
  const chips = [];
  if (player.cur) chips.push(`<span class="qchip cur">${icon(taskIcon(player.cur.a))}${taskLabel(player.cur.a)}</span>`);
  player.queue.forEach((t, i) => chips.push(`<span class="qchip" data-i="${i}">${icon(taskIcon(t))}${taskLabel(t)}<span class="x">×</span></span>`));
  el.queue.innerHTML = chips.length ? chips.join('') : '<span class="qempty">할 일 없음 · 환자나 시설을 탭하세요</span>';
}
el.queue.addEventListener('click', (e) => {
  const chip = e.target.closest('.qchip[data-i]');
  if (!chip) return;
  player.queue.splice(+chip.dataset.i, 1);
  renderQueue();
});
function renderHands() {
  const cap = trayCap();
  let html = '';
  for (let i = 0; i < cap; i++) {
    const it = player.hands[i];
    if (it) { const m = MEDS[it]; html += `<button class="hand full" data-h="${i}" style="--c:${m.color}"><span class="med-dot"></span>${icon(ORDER[m.type].icon)}<span>${m.name}</span></button>`; }
    else html += `<button class="hand" data-h="${i}"></button>`;
  }
  el.traySlots.innerHTML = html;
  el.trayCount.textContent = `${player.hands.length}/${cap}`;
  player.ch.extras.held.forEach((g, i) => { g.clear(); const it = player.hands[i]; if (it) g.add(heldItemMesh(MEDS[it].color)); });
}
el.traySlots.addEventListener('click', (e) => {
  const h = e.target.closest('.hand.full');
  if (!h || !S) return;
  const it = player.hands.splice(+h.dataset.h, 1)[0];
  toast(`✋ ${MEDS[it].name}을(를) 내려놓았어요`);
  renderHands();
});

// ================= 행동 정의 =================
const P = (t) => S.patients.get(t.pid);
const isLunch = () => { if (!S) return false; const gm = gameMinute(); return gm >= LUNCH_S && gm < S.lunchEnd; };
function deskSlotFor(actor) {
  if (actor === player) { DESK_SLOTS[0].owner = player; return DESK_SLOTS[0]; }
  const s = DESK_SLOTS[1];
  if (s.owner && s.owner !== actor && s.owner.cur && ACT[s.owner.cur.a.kind].desk) return null; // 의자는 한 사람만
  s.owner = actor;
  return s;
}
const deskFreeFor = (m) => !DESK_SLOTS[1].owner || DESK_SLOTS[1].owner === m || !(DESK_SLOTS[1].owner.cur && ACT[DESK_SLOTS[1].owner.cur.a.kind].desk);
function releaseDesk(actor) { DESK_SLOTS.forEach((d) => { if (d.owner === actor) d.owner = null; }); }
function frontOf(spot, d = 0.85) {
  return { x: spot.x + Math.sin(spot.rot || 0) * d, z: spot.z + Math.cos(spot.rot || 0) * d, rot: (spot.rot || 0) + Math.PI, via: spot.via };
}
function addChart() {
  S.charts++;
  updateCharts();
  if (S.charts === 6) toast('📋 기록이 6건이나 밀렸어요! 접수대 기록 버튼을 탭하세요', 'warn');
  hint('chart', '📋 처치할 때마다 기록이 쌓여요. 접수대의 기록 버튼으로 정리하지 않으면 퇴근 후 무급 야근이 돼요.');
}
function updateCharts() {
  chartCount.textContent = S && S.charts ? S.charts : '';
  chartBtn.classList.toggle('piled', !!S && S.charts >= 6);
}
function bumpCombo(pos) {
  if (S.t - S.lastDone <= 3.5) S.combo++; else S.combo = 1;
  S.lastDone = S.t;
  S.stats.maxCombo = Math.max(S.stats.maxCombo, S.combo);
  if (S.combo >= 3) { floatText(pos, `콤보 ×${S.combo}`); S.stats.evalAdj += 1; }
}
function incident(p, actor, why) {
  S.stats.incidents++;
  save.rating -= 0.4;
  if (actor === player) {
    S.body.mental -= 15;
    toast(`⚠️ 투약 사고! ${p.name}님께 ${why} (멘탈 −15 · 경위서)`, 'warn');
    leadScold('incident', 4);
  } else toast(`⚠️ ${actor.name}님 투약 사고… 팀 전체가 경위서`, 'warn');
  S.reportDue = true;
  floatText(p.pos, '투약 사고!', true);
  vibrate([300, 100, 300]);
}
function useMed(actor, p, chosen) {
  const i = actor.hands.indexOf(chosen);
  if (i >= 0) actor.hands.splice(i, 1);
  if (actor === player) renderHands();
  if (chosen !== p.med) incident(p, actor, `${MEDS[p.med].name} 대신 ${MEDS[chosen].name}을(를) 썼어요`);
}

const ACT = {
  register: {
    desk: true, dur: () => 0.9,
    check: (t) => (P(t) && P(t).state === 'wait' ? null : 'skip'),
    start: (t, a) => { const p = P(t); goTo(p, a.slot.window); p.busy = true; say(a, `${p.ticket}번 환자분~`, '', 1.4); },
    ready: (t) => P(t) && P(t).path.length === 0,
    apply: (t, a) => {
      const p = P(t);
      refill(p); setState(p, 'examq'); S.examQ.push(p.id);
      goTo(p, seatSpot(p) || takeSeat(p, 'lobby'));
      if (a === player) bumpCombo(p.pos);
    },
  },
  pay: {
    desk: true, dur: (t) => 0.8 + (P(t) && P(t).docs ? 1.1 : 0),
    check: (t) => (P(t) && P(t).state === 'pay' ? null : 'skip'),
    start: (t, a) => { const p = P(t); goTo(p, a.slot.window); p.busy = true; },
    ready: (t) => P(t) && P(t).path.length === 0,
    apply: (t, a) => {
      const p = P(t);
      const r = p.patience / p.max;
      const fee = p.returning ? 1000 : ORDER[p.order || 'none'].fee + (p.docs ? 1000 : 0);
      S.stats.revenue += fee; S.stats.served++;
      save.rating += (r - 0.4) * 0.12;
      floatText(p.pos, `매출 +${won(fee)}`);
      if (a === player) bumpCombo(p.pos);
      if (r > 0.75 && (p.type === 'grandma' || p.type === 'grandpa') && Math.random() < 0.3) {
        say(p, '아이고 우리 간호사 선생님 최고여~', 'sweet');
        S.body.mental = Math.min(maxStat(), S.body.mental + 8);
      }
      if (!p.docs && !p.returning && !S.closed && Math.random() < 0.1) S.returns.push({ at: S.t + rand(4, 9), name: p.name, type: p.type });
      removePatient(p);
    },
  },
  call119: {
    desk: true, dur: () => 1.6, check: (t) => (P(t) ? null : 'skip'),
    apply: (t) => {
      const p = P(t);
      save.rating += 0.3; S.stats.e119++; S.stats.evalAdj += 15;
      toast(`🚑 ${p.name}님 119 연계 완료! 빠른 판단이었어요`, 'good');
      removePatient(p);
    },
  },
  phone: {
    desk: true, dur: () => 1.4,
    check: () => (S.phone.ringing ? null : '📞 전화가 끊겼어요…'),
    start: (t, a) => { S.phone.by = a; },
    apply: () => {
      S.phone.ringing = false; S.phone.by = null; phoneBtn.classList.remove('ringing');
      S.phone.next = rand(20, 36); S.stats.phone++; save.rating += 0.02;
      toast('📞 ' + pick(PHONE_LINES));
    },
  },
  chart: {
    desk: true, dur: () => 0.3 + 0.45 * Math.min(S.charts, 6),
    check: () => (S.charts > 0 ? null : 'skip'),
    apply: (t, a) => {
      const n = Math.min(S.charts, 6);
      S.charts -= n; S.stats.charted += n; updateCharts();
      if (a === player) toast(`📋 기록 ${n}건 정리 완료${S.charts ? ` · 아직 ${S.charts}건 남음` : ''}`);
    },
  },
  prep: {
    where: () => SP.prep, dur: () => 0.5,
    check: (t, a) => (a.hands.length < (a === player ? trayCap() : 2) ? null : '✋ 트레이가 꽉 찼어요! 아래 칸을 탭하면 내려놓아요'),
    apply: (t, a) => { a.hands.push(t.med); if (a === player) renderHands(); },
  },
  treat: {
    where: (t) => { const p = P(t); const s = p && seatSpot(p); return s ? frontOf(s) : null; },
    dur: (t) => ({ shot: 1.1, iv: 0.6, heat: 0.6, blood: 0.3 }[P(t).order]),
    check: (t, a) => {
      const p = P(t);
      if (!p || p.state !== 'order') return 'skip';
      const o = p.order;
      if ((o === 'shot' || o === 'iv') && !a.hands.some((h) => MEDS[h].type === o)) return `${ORDER[o].label}이(가) 트레이에 없어요! 약품장에서 ${MEDS[p.med].name}을(를) 챙기세요`;
      if (o === 'blood' && !a.hands.includes('blood')) return '🩸 채혈 키트가 없어요! 약품장에서 챙기세요';
      if ((o === 'iv' || o === 'heat') && !freeBed(o)) return o === 'iv' ? '💧 수액 침대가 꽉 찼어요' : '♨️ 핫팩 침대가 꽉 찼어요';
      return null;
    },
    pick: (t) => (P(t).order === 'shot' ? 'shot' : null),
    mini: (t) => P(t).order === 'blood',
    apply: (t, a, c) => {
      const p = P(t), o = p.order;
      if (o === 'shot') { useMed(a, p, c.med); addChart(); toPay(p); }
      else if (o === 'blood') {
        a.hands.splice(a.hands.indexOf('blood'), 1); if (a === player) renderHands();
        S.stats.blood++; addChart(); toPay(p);
        toast(`🩸 ${p.name}님 채혈 성공!`, 'good');
      } else {
        const bed = freeBed(o);
        bed.pid = p.id; p.bed = bed;
        releaseSeat(p); setState(p, 'tobed'); goTo(p, bed.spot);
        a.queue.unshift({ kind: 'setup', pid: p.id });
        if (a === player) renderQueue();
      }
      if (a === player) bumpCombo(p.pos);
    },
  },
  setup: {
    where: (t) => P(t) && P(t).bed && P(t).bed.nurseSpot,
    dur: (t) => (P(t).order === 'iv' ? 1.3 : 0.8),
    check: (t, a) => {
      const p = P(t);
      if (!p || p.state !== 'tobed') return 'skip';
      if (p.order === 'iv' && !a.hands.some((h) => MEDS[h].type === 'iv')) return `💧 수액이 트레이에 없어요! ${MEDS[p.med].name}을(를) 챙겨 오세요`;
      return null;
    },
    ready: (t) => P(t) && P(t).path.length === 0,
    pick: (t) => (P(t).order === 'iv' ? 'iv' : null),
    apply: (t, a, c) => {
      const p = P(t), bed = p.bed;
      if (p.order === 'iv') useMed(a, p, c.med);
      bed.dur = bed.t = S.tut ? 4 : p.order === 'iv' ? 22 : 15;
      bed.ov.style.visibility = 'visible'; bed.ov.firstChild.style.width = '0%';
      refill(p, 0.4); setState(p, 'bed'); addChart();
    },
  },
  unbed: {
    where: (t) => P(t) && P(t).bed && P(t).bed.nurseSpot, dur: () => 0.7,
    check: (t) => (P(t) && P(t).state === 'beddone' ? null : 'skip'),
    apply: (t, a) => {
      const p = P(t), bed = p.bed;
      bed.pid = null; bed.mattress.material.emissiveIntensity = 0; bed.ov.style.visibility = 'hidden';
      p.bed = null; setPose(p.ch, 'stand'); toPay(p);
      if (a === player) bumpCombo(p.pos);
    },
  },
  errand: {
    where: () => SP.errand, dur: () => (S.errand ? S.errand.dur : 1),
    check: () => (S.errand ? null : '🧑‍⚕️ 원장님 호출이 이미 끝났어요'),
    start: () => { if (S.errand) S.errand.answering = true; },
    apply: () => {
      S.errand = null; errandOv.style.display = 'none';
      S.stats.errands++; S.stats.evalAdj += 3; S.body.mental -= 3;
      S.errandAt = S.t + rand(40, 70) / S.doc.errandMul * (S.grudge ? 0.7 : 1);
      toast('🧑‍⚕️ 원장님 부탁 처리 완료… 내 일은 그대로 밀렸다');
      if (S.doc.quiz && S.quizCount < 2 && Math.random() < 0.5) S.quizPending = S.t + 0.5; // 진료실에 들른 김에
    },
  },
  chore: {
    where: () => SP.prep, dur: () => 2.6,
    check: () => (S.directive && S.directive.kind === 'chore' ? null : 'skip'),
    apply: () => { S.stats.chores++; toast('📣 재고 정리 완료. 팀장님은 고맙다는 말이 없다'); },
  },
  toilet: {
    where: () => SP.toilet, dur: () => 2.0, check: () => null, rest: true,
    start: (t, a) => { a.ch.g.visible = false; },
    apply: () => { S.body.bladder = maxStat(); toast('🚻 휴… 살 것 같다'); },
  },
  snack: {
    where: () => SP.snack, dur: () => (isLunch() ? 3.5 : 1.5), check: () => null, rest: true,
    apply: () => {
      const mx = maxStat();
      if (isLunch()) {
        S.body.hunger = mx; S.body.stamina = Math.min(mx, S.body.stamina + 25); S.body.mental = Math.min(mx, S.body.mental + 8);
        S.stats.ateLunch = true;
        toast('🍱 점심 먹었다! 10분 만에 흡입했지만…', 'good');
      } else {
        S.body.hunger = mx; S.body.stamina = Math.min(mx, S.body.stamina + 15); S.body.mental = Math.min(mx, S.body.mental + 5);
        toast('🍙 3초 만에 삼각김밥 흡입');
      }
    },
  },
};

function speedMult(a) {
  if (a !== player) return 0.85;
  const b = S.body;
  let m = save.items.shoes ? 1.15 : 1;
  if (b.hunger < 20 || b.bladder < 20 || b.stamina < 20) m *= 0.75;
  if (b.bladder <= 0) m *= 0.65;
  return m;
}
function workMult(a) {
  if (a !== player) return 1.2;
  return (S.body.stamina < 30 ? 1.3 : 1) * (S.body.mental < 25 ? 1.25 : 1);
}

function updateActor(a, dt) {
  if (a.state !== 'work' && !a.cur) return;
  if (!a.cur) {
    if (!a.queue.length) return;
    const t = a.queue.shift();
    const def = ACT[t.kind];
    let spot;
    if (def.desk) { a.slot = deskSlotFor(a); spot = a.slot && a.slot.spot; }
    else { releaseDesk(a); spot = def.where(t, a); }
    if (!spot) { if (a === player) renderQueue(); return; }
    a.cur = { a: t, phase: 'walk', t: 0, dur: 1, spot };
    a.path = route(a.pos, a.spot, spot);
    if (a === player) renderQueue();
  }
  const c = a.cur, def = ACT[c.a.kind];
  if (c.phase === 'walk') {
    if (stepAlong(a, dt, NURSE_SPEED * speedMult(a))) {
      a.spot = c.spot;
      const err = def.check(c.a, a);
      if (err) { if (err !== 'skip' && a === player) toast(err, 'warn'); a.cur = null; if (a === player) renderQueue(); return; }
      if (def.start) def.start(c.a, a);
      c.phase = def.ready ? 'ready' : 'begin';
    }
  }
  if (c.phase === 'ready') {
    if (c.a.pid && !P(c.a)) { a.cur = null; if (a === player) renderQueue(); return; }
    if (def.ready(c.a)) c.phase = 'begin';
  }
  if (c.phase === 'begin') {
    const p = c.a.pid && P(c.a);
    if (p) p.busy = true;
    const pickType = def.pick && def.pick(c.a);
    if (def.mini && def.mini(c.a) && a === player) { c.phase = 'mini'; openBlood(c, P(c.a)); return; }
    if (pickType) {
      if (a === player) { c.phase = 'pick'; openPick(c, P(c.a), pickType); return; }
      c.med = a.hands.includes(p.med) ? p.med : a.hands.find((h) => MEDS[h].type === pickType);
    }
    c.phase = 'work'; c.t = 0; c.dur = def.dur(c.a, a) * workMult(a);
  }
  if (c.phase === 'work') {
    c.t += dt;
    if (c.t >= c.dur) {
      const p = c.a.pid && P(c.a); if (p) p.busy = false;
      a.ch.g.visible = true;
      const err = def.check(c.a, a);
      if (!err) {
        def.apply(c.a, a, c);
        if (a === player) checkDirective(c.a);
        if (a === player) {
          S.body.stamina -= 1.5 * (save.items.tumbler ? 0.8 : 1);
          if (def.rest) S.stats.restSec += c.dur;
        }
      } else if (err !== 'skip' && a === player) toast(err, 'warn');
      if (c.a.kind === 'phone') S.phone.by = null;
      if (c.a.kind === 'errand' && S.errand) S.errand.answering = false;
      a.cur = null;
      if (a === player) renderQueue();
    }
  }
}
function finishPick(c, med) {
  if (player.cur !== c || c.phase !== 'pick') return;
  c.med = med;
  c.phase = 'work'; c.t = 0; c.dur = ACT[c.a.kind].dur(c.a, player) * workMult(player);
}

// ================= 동료 AI =================
function mateThink(m) {
  if (m.cur || m.queue.length || m.state !== 'work') return;
  const f = m.focus;
  const w = (kind) => {
    if (f === 'desk') return ['register', 'pay', 'phone'].includes(kind) ? 1.8 : 0.7;
    if (f === 'treat') return ['treat', 'setup', 'unbed'].includes(kind) ? 1.8 : 0.7;
    if (f === 'chart') return kind === 'chart' ? 4 : 0.8;
    return 1;
  };
  const cands = [];
  const deskOk = deskFreeFor(m);
  const lobbyLoad = [...S.patients.values()].filter((p) => p.state === 'wait' || p.state === 'pay').length;
  const deskFor = (p) => deskOk && (!m.isLead || lobbyLoad >= 4 || p.patience / p.max < 0.35);
  for (const p of S.patients.values()) {
    if (p.busy || (S.directive && S.directive.pid === p.id)) continue;
    const urg = (1 - p.patience / p.max) * 30;
    if (p.type === 'emergency' && p.state === 'wait') { if (deskOk && !claimedBy('call119', p.id)) cands.push({ s: 200, t: { kind: 'call119', pid: p.id } }); }
    else if (p.state === 'wait' && deskFor(p) && !claimedBy('register', p.id)) cands.push({ s: (40 + urg) * w('register'), t: { kind: 'register', pid: p.id } });
    else if (p.state === 'pay' && !p.path.length && deskFor(p) && !claimedBy('pay', p.id)) cands.push({ s: (48 + urg) * w('pay'), t: { kind: 'pay', pid: p.id } });
    else if (p.state === 'beddone' && !claimedBy('unbed', p.id)) cands.push({ s: (70 + urg) * w('unbed'), t: { kind: 'unbed', pid: p.id } });
    else if (p.state === 'tobed' && !claimedBy('setup', p.id)) cands.push({ s: (65 + urg) * w('setup'), t: { kind: 'setup', pid: p.id }, need: p.order === 'iv' ? p.med : null });
    else if (p.state === 'order' && p.order !== 'blood' && !p.path.length && !claimedBy('treat', p.id)) {
      if ((p.order === 'iv' || p.order === 'heat') && !freeBed(p.order)) continue;
      cands.push({ s: (55 + urg) * w('treat'), t: { kind: 'treat', pid: p.id }, need: p.order === 'shot' || p.order === 'iv' ? p.med : null });
    }
  }
  if (deskOk && S.phone.ringing && !claimedBy('phone')) cands.push({ s: 52 * w('phone'), t: { kind: 'phone' } });
  if (deskOk && S.charts >= (f === 'chart' ? 1 : 4) && !claimedBy('chart')) cands.push({ s: (20 + S.charts * 4) * w('chart'), t: { kind: 'chart' } });
  if (!cands.length) return;
  cands.sort((x, y) => y.s - x.s);
  const best = cands[0];
  if (best.need && !m.hands.includes(best.need)) {
    if (m.hands.length >= 2) m.hands = [];
    m.queue.push({ kind: 'prep', med: best.need });
  }
  m.queue.push(best.t);
}

// ================= 한 팀장 (같이 일하는 간호팀장) =================
const leadNear = (d = 6) => !!(lead && lead.state === 'work' && lead.ch.g.visible && dist(lead.pos, player.pos) < d);
function leadScold(kind, amt) {
  if ((S.bossCd[kind] || -99) > S.t - 40) return;
  S.bossCd[kind] = S.t;
  const a = amt * (save.rank >= 3 ? 0.5 : 1);
  S.body.mental -= a; S.stats.taeum++; S.stats.evalAdj -= 5;
  say(lead, LEAD_SCOLD[kind].replace(/[“”]/g, ''), 'lead', 3);
  toast(`📣 한 팀장: ${LEAD_SCOLD[kind]} (멘탈 −${Math.round(a)})`, 'warn');
  hint('lead', '📣 한 팀장은 같이 일하는 상사예요. 근처에서 쉬거나 기록이 밀리면 태움을 당해요. (인권침해 가해자 1위: 선임 간호사)');
}
function issueDirective() {
  const cands = [];
  for (const p of S.patients.values()) {
    if (p.state === 'wait' && p.type !== 'emergency' && !p.busy && !claimedBy('register', p.id)) cands.push({ kind: 'register', pid: p.id, label: `${p.ticket}번 접수 먼저 해요` });
    if (p.state === 'beddone' && !claimedBy('unbed', p.id)) cands.push({ kind: 'unbed', pid: p.id, label: `${p.name}님 침대 정리 좀 해요` });
  }
  if (S.charts >= 3 && !claimedBy('chart')) cands.push({ kind: 'chart', label: '기록부터 정리해요' });
  cands.push({ kind: 'chore', label: '약품장 재고 정리 좀 해놔요' });
  const d = pick(cands);
  S.directive = { ...d, left: 18, max: 18 };
  choreOv.querySelector('.e-tx').textContent = `팀장님 지시: ${d.label}`;
  choreOv.style.display = '';
  say(lead, `김 선생, ${d.label}`, 'lead', 3);
  hint('directive', '📣 팀장님 지시! 아래 "지시" 줄의 남색 칩을 탭하면 할 일로 내려가요. 제때 안 하면 멘탈과 평가가 깎여요.');
}
function checkDirective(t) {
  const d = S.directive;
  if (!d || d.kind !== t.kind || (d.pid && d.pid !== t.pid)) return;
  S.directive = null; choreOv.style.display = 'none';
  S.stats.ord++; S.stats.evalAdj += 8;
  S.directiveAt = S.t + rand(35, 55);
  say(lead, '음, 됐어요.', 'lead', 1.8);
}
function updateBoss(dt) {
  if (!lead) return;
  if (!isLunch() && !S.closed) {
    if (player.cur && ACT[player.cur.a.kind].rest && player.cur.phase === 'work' && leadNear(7)) leadScold('rest', 8);
    if (S.charts >= 6) leadScold('chart', 6);
  }
  const d = S.directive;
  if (!d) {
    if (!S.closed && !isLunch() && S.t >= S.directiveAt && !S.modal) issueDirective();
    return;
  }
  // 다른 사람이 먼저 처리했거나 대상이 사라지면 조용히 취소
  if (d.pid) {
    const p = S.patients.get(d.pid);
    const ok = p && ((d.kind === 'register' && p.state === 'wait') || (d.kind === 'unbed' && p.state === 'beddone'));
    const mine = player.cur && player.cur.a.kind === d.kind && player.cur.a.pid === d.pid;
    if (!ok && !mine) { S.directive = null; choreOv.style.display = 'none'; S.directiveAt = S.t + rand(30, 45); return; }
  }
  const inMine = (player.cur && player.cur.a.kind === d.kind && player.cur.a.pid === d.pid) || player.queue.some((t) => t.kind === d.kind && t.pid === d.pid);
  if (inMine) return;
  d.left -= dt;
  choreOv.querySelector('i').style.transform = `scaleX(${Math.max(0, d.left / d.max)})`;
  if (d.left <= 0) {
    S.directive = null; choreOv.style.display = 'none';
    const a = 8 * (save.rank >= 3 ? 0.5 : 1);
    S.body.mental -= a; S.stats.ordMiss++; S.stats.evalAdj -= 10; S.stats.taeum++;
    S.directiveAt = S.t + rand(35, 55);
    say(lead, '시킨 거 하나 제대로 못 해요?', 'lead', 2.6);
    toast(`📣 한 팀장: “시킨 거 하나 제대로 못 해요?” (멘탈 −${a})`, 'warn');
  }
}

// ================= 원장님 =================
function weightedPick(list) {
  const tot = list.reduce((s, x) => s + x[1], 0);
  let r = Math.random() * tot;
  for (const [k, w] of list) if ((r -= w) < 0) return k;
  return list[0][0];
}
function updateDoctor(dt) {
  const D = S.D;
  if (!D.cur && S.examQ.length) {
    const id = S.examQ.shift();
    const p = S.patients.get(id);
    if (p) {
      D.cur = id; D.t = 0; D.dur = TYPES[p.type].exam * S.doc.examMul;
      if (D.next === id) D.next = null;
      releaseSeat(p); goTo(p, SP.examChair); renderPatient(p);
    }
  }
  if (D.cur && !D.next && S.examQ.length) {
    const n = S.patients.get(S.examQ[0]);
    if (n && !n.busy) { D.next = n.id; releaseSeat(n); goTo(n, SP.examNext); }
  }
  if (!D.cur) return;
  const p = S.patients.get(D.cur);
  if (!p) { D.cur = null; return; }
  if (p.path.length || p.spot !== SP.examChair) return;
  D.t += dt;
  if (D.t < D.dur) return;
  D.cur = null;
  let o = p.tutOrder || weightedPick(ORDER_TABLE[p.type]);
  if (S.bloodLeft > 0 && o !== 'none' && Math.random() < 0.22 && S.t > 20) { o = 'blood'; S.bloodLeft--; }
  p.order = o;
  p.med = p.tutMed || (o === 'shot' ? pick(['shotA', 'shotB']) : o === 'iv' ? pick(['ivA', 'ivB']) : o === 'blood' ? 'blood' : null);
  if (o === 'none') { toPay(p); return; }
  refill(p);
  setState(p, 'order');
  goTo(p, takeSeat(p, 'inject'));
  if (o === 'shot' || o === 'iv') hint('o_med', `💉 ${p.name}님 ${MEDS[p.med].name} 처방! 머리 위 색깔과 같은 약을 약품장에서 챙긴 뒤 주사실의 환자를 탭하세요.`);
  if (o === 'heat') hint('o_heat', '♨️ 핫팩 처방! 주사실 환자를 탭해 수액·치료실 침대로 안내한 뒤 세팅해요.');
  if (o === 'blood') hint('o_blood', '🩸 채혈 처방! 약품장에서 채혈 키트를 챙기고 환자를 탭하면 미니게임이 시작돼요.');
}
function updateErrand(dt) {
  if (S.closed) { if (S.errand && !S.errand.answering) { S.errand = null; errandOv.style.display = 'none'; } return; }
  if (isLunch()) return;
  if (!S.errand) {
    if (S.t >= S.errandAt) {
      const e = pick(ERRANDS);
      S.errand = { ...e, left: 14, max: 14, answering: false };
      errandOv.querySelector('.e-ic').innerHTML = icon(e.icon);
      errandOv.querySelector('.e-tx').textContent = `“${e.label}”`;
      errandOv.style.display = '';
      say(doctor, `김 선생~ ${e.label}`, 'doc');
      setTimeout(() => { if (S && lead && !S.ended) say(lead, pick(LEAD_SWEET), 'sweet', 2.6); }, 1300);
      hint('errand', '🧑‍⚕️ 원장님 호출! 아래 "지시" 줄의 노란 칩이나 원장님을 탭하면 할 일로 내려가요. 무시하면 멘탈이 크게 깎여요. (간호사 66.2%가 의사 업무를 요구받은 경험)');
    }
    return;
  }
  if (S.errand.answering) return;
  S.errand.left -= dt;
  errandOv.querySelector('i').style.transform = `scaleX(${Math.max(0, S.errand.left / S.errand.max)})`;
  if (S.errand.left <= 0) {
    S.errand = null; errandOv.style.display = 'none';
    S.body.mental -= 15; save.rating -= 0.05; S.stats.errandsMissed++; S.stats.evalAdj -= 8;
    S.errandAt = S.t + rand(40, 70) / S.doc.errandMul;
    player.queue = player.queue.filter((t) => t.kind !== 'errand'); renderQueue();
    toast('🧑‍⚕️ 원장님: “김 선생, 아까 말한 거 안 했어?” (멘탈 −15)', 'warn');
  }
}
function updateDoctorEvents() {
  if (S.closed) return;
  // 최원장의 질문: 진료실에 들렀을 때(심부름 후) 또는 하루 한 번 뜬금없이
  const due = (S.quizPending > 0 && S.t >= S.quizPending) || (S.quizAt > 0 && S.t >= S.quizAt);
  if (due && S.quizCount < 2 && !S.modal && !isLunch() && !(player.cur && /pick|mini/.test(player.cur.phase))) {
    const surprise = S.quizAt > 0 && S.t >= S.quizAt;
    S.quizCount++; S.quizPending = -1; if (surprise) S.quizAt = -1;
    say(doctor, surprise ? '김 선생! 지나가다 생각났는데…' : '말 나온 김에, 이거 알아?', 'doc', 2.2);
    openQuiz(`${S.doc.name}의 ${surprise ? '뜬금없는' : '기습'} 질문`, (ok) => {
      if (ok) { S.body.mental = Math.min(maxStat(), S.body.mental + 3); S.stats.evalAdj += 8; S.stats.quizOk++; toast(`🧑‍⚕️ ${S.doc.name}: “오, 제법인데?”`, 'good'); }
      else { S.body.mental -= 10; S.stats.evalAdj -= 4; S.stats.quizBad++; toast(`🧑‍⚕️ ${S.doc.name}: “그것도 몰라? 간호사 맞아?” (멘탈 −10)`, 'warn'); }
    });
    return;
  }
  // 사업가 원장: 접수 마감 연장
  if (S.doc.biz && !S.extendDone && gameMinute() >= END_MIN - 40) {
    S.extendDone = true;
    if (Math.random() < 0.6) {
      S.intakeEnd = END_MIN - 15;
      say(doctor, '환자 오면 다 받아! 마감 15분 연장!', 'doc', 3);
      toast(`🧑‍⚕️ ${S.doc.name}: “오늘 접수 마감 15분 연장이야~” (워라밸은…?)`, 'warn');
    }
  }
  if (S.harassAt > 0 && S.t >= S.harassAt && S.harassCount < 2 && !player.cur?.phase?.match(/pick|mini/)) {
    S.harassCount++;
    S.harassAt = S.t + rand(50, 80);
    S.stats.harass++;
    const line = pick(HARASS_LINES);
    say(doctor, line.replace(/[“”]/g, ''), 'doc', 3);
    openChoice({
      icon: 'warning', who: `${S.doc.name} · ${S.doc.trait}`, text: line,
      options: [
        { label: '단호하게 선 긋기', sub: '“그런 말씀은 불편합니다.” · 멘탈 −3, 대신 원장님 호출이 늘어나요', fn: () => { S.body.mental -= 3; S.grudge = true; S.errandAt = Math.min(S.errandAt, S.t + 10); toast('🙅 선을 그었다. 원장님 표정이 굳었다…'); } },
        { label: '애써 웃어넘기기', sub: '분위기는 지켰지만… 멘탈 −12', fn: () => { S.body.mental -= 12; toast('😣 웃어넘겼다. 마음이 무겁다', 'warn'); } },
        { label: '팀장님께 말하기', sub: '공식적으로 알린다 · 결과는 장담 못 해요', fn: () => { S.body.mental -= 8; toast('📣 한 팀장: “선생님이 농담하신 거잖아~ 예민하게 굴지 마요.” (멘탈 −8)', 'warn'); } },
      ],
    });
  }
  if (S.coffeeAt > 0 && S.t >= S.coffeeAt) {
    S.coffeeAt = -1;
    S.body.mental = Math.min(maxStat(), S.body.mental + 10);
    say(doctor, '다들 고생 많아요~ 커피 시켰어요!', 'doc', 3);
    toast(`☕ ${S.doc.name}님이 커피를 쐈어요! (멘탈 +10)`, 'good');
  }
}

// ================= 시트: 약품장 / 투약 확인 / 동료 =================
let sheetKind = null, pickTimer = null, pickFn = null;
function closeSheet(kind) {
  if (kind && sheetKind !== kind) return;
  el.sheet.classList.add('hidden'); el.sheet.innerHTML = ''; sheetKind = null; pickFn = null;
  clearInterval(pickTimer);
}
function openCabinet() {
  if (sheetKind === 'pick') return;
  sheetKind = 'cab';
  const queued = player.queue.filter((t) => t.kind === 'prep').length;
  el.sheet.innerHTML = `<h4>${icon('syringe')}약품장 <button class="close" data-close>${icon('x')}</button></h4>
    <p class="sub2">챙길 약을 고르세요 · 트레이 ${player.hands.length + queued}/${trayCap()}</p>
    <div class="med-grid">${Object.entries(MEDS).map(([k, m]) => `<button class="med-btn" data-med="${k}" style="--c:${m.color}"><span class="mi">${icon(ORDER[m.type].icon)}</span>${m.name}<small>${ORDER[m.type].label}</small></button>`).join('')}</div>`;
  el.sheet.classList.remove('hidden');
}
function openPick(c, p, type) {
  const cands = player.hands.filter((h) => MEDS[h].type === type);
  if (!cands.length) { finishPick(c, null); return; }
  sheetKind = 'pick';
  const rx = MEDS[p.med];
  el.sheet.innerHTML = `<h4>${icon('shield')}투약 확인 · ${p.name}님</h4>
    <div class="rx">처방 <span class="chip" style="--c:${rx.color}">${icon(ORDER[rx.type].icon)}${rx.name}</span></div>
    <div class="med-grid">${cands.map((h) => `<button class="med-btn" data-use="${h}" style="--c:${MEDS[h].color}"><span class="mi">${icon(ORDER[MEDS[h].type].icon)}</span>${MEDS[h].name}<small>트레이</small></button>`).join('')}</div>
    <div class="timer"><i></i></div>`;
  el.sheet.classList.remove('hidden');
  pickFn = (med) => { closeSheet('pick'); finishPick(c, med); };
  let left = 3.6;
  const bar = el.sheet.querySelector('.timer i');
  clearInterval(pickTimer);
  pickTimer = setInterval(() => {
    if (!S || S.paused || S.modal) return;
    left -= 0.05;
    bar.style.transform = `scaleX(${Math.max(0, left / 3.6)})`;
    if (left <= 0 && pickFn) pickFn(cands[0]);
  }, 50);
  hint('pick', '🛡️ 투약 확인! 처방 색깔과 같은 약을 고르세요. 시간이 지나면 첫 번째 약이 자동으로 쓰여요.');
}
function openMates() {
  sheetKind = 'mates';
  el.sheet.innerHTML = `<h4>${icon('users')}동료에게 요청하기 <button class="close" data-close>${icon('x')}</button></h4>
    <p class="sub2">후배에게 어떤 일 위주로 맡길까요? 팀장님은 상사라 지정할 수 없어요.</p>
    ${mates.map((m, i) => m.isLead
      ? `<div class="mate-row locked"><span class="mate-av">${icon('megaphone')}</span><span class="mate-name">${m.name}<small>${m.state === 'lunch' ? '점심 중' : m.cur ? taskLabel(m.cur.a) : '대기 중'}</small></span><span class="lock-tag">상사 · 지정 불가</span></div>`
      : `<div class="mate-row"><span class="mate-av">${icon('users')}</span><span class="mate-name">${m.name}<small>${m.state === 'lunch' ? '점심 중' : m.cur ? taskLabel(m.cur.a) : '대기 중'}</small></span>
      <div class="focus-seg" data-mate="${i}">${Object.entries(FOCUS).map(([k, v]) => `<button data-focus="${k}" class="${m.focus === k ? 'on' : ''}">${v}</button>`).join('')}</div></div>`).join('')}
    ${mates.length < 2 ? '<p class="sub2">아직 후배가 없어요. DAY 3에 박 선생이 입사해요.</p>' : ''}`;
  el.sheet.classList.remove('hidden');
}
el.sheet.addEventListener('click', (e) => {
  if (e.target.closest('[data-close]')) { closeSheet(); return; }
  const med = e.target.closest('[data-med]');
  if (med) {
    const queued = player.queue.filter((t) => t.kind === 'prep').length;
    if (player.hands.length + queued >= trayCap()) { toast('✋ 트레이가 꽉 찼어요', 'warn'); return; }
    if (!enqueue(player, { kind: 'prep', med: med.dataset.med })) return;
    if (player.hands.length + queued + 1 >= trayCap()) closeSheet('cab'); else openCabinet();
    return;
  }
  const use = e.target.closest('[data-use]');
  if (use && pickFn) { pickFn(use.dataset.use); return; }
  const fb = e.target.closest('[data-focus]');
  if (fb) {
    const i = +fb.closest('[data-mate]').dataset.mate;
    mates[i].focus = fb.dataset.focus; save.focus[mates[i].jIdx] = fb.dataset.focus; persist();
    say(mates[i], fb.dataset.focus === 'auto' ? '네~ 알아서 할게요!' : `${FOCUS[fb.dataset.focus]} 위주로 할게요!`, '', 2);
    openMates();
  }
});
el.mates.addEventListener('click', () => { if (!playing()) return; if (sheetKind === 'mates') closeSheet(); else if (sheetKind !== 'pick') openMates(); });
el.choco.addEventListener('click', () => {
  if (!playing()) return;
  if (save.choco <= 0) { toast('🍫 초코바가 없어요. 퇴근 후 상점에서 살 수 있어요'); return; }
  save.choco--; persist();
  S.body.hunger = Math.min(maxStat(), S.body.hunger + 40);
  S.body.stamina = Math.min(maxStat(), S.body.stamina + 5);
  toast('🍫 초코바 한 입에 털어 넣기 (식사 +40)', 'good');
  if (leadNear(6) && !isLunch()) leadScold('choco', 5);
  updateChocoBtn();
});
function updateChocoBtn() { el.chocoCount.textContent = save.choco; }

// ================= 채혈 미니게임 =================
const blood = { open: false, c: null, p: null, x: 0, dir: 1, speed: 1, zone: [0.4, 0.6] };
function openBlood(c, p) {
  blood.open = true; blood.c = c; blood.p = p; blood.x = 0; blood.dir = 1;
  const w = p.vein === 'hard' ? 0.11 : 0.24;
  const st = rand(0.15, 0.85 - w);
  blood.zone = [st, st + w];
  blood.speed = p.vein === 'hard' ? 1.25 : 0.95;
  S.modal = true;
  $('#blood-title').textContent = `${p.name}님 채혈`;
  $('#blood-eyebrow').textContent = p.rude ? '채혈 · 진상 주의' : '채혈';
  const vb = $('#blood-vein');
  vb.textContent = p.vein === 'hard' ? '혈관이 잘 안 보여요 · 성공 구간 좁음' : '혈관 잘 보임';
  vb.classList.toggle('hard', p.vein === 'hard');
  document.querySelector('.vein').classList.toggle('faint', p.vein === 'hard');
  const z = $('#blood-zone');
  z.style.left = blood.zone[0] * 100 + '%'; z.style.width = w * 100 + '%';
  $('#blood-anger').style.width = clamp((1 - p.patience / p.max) * 100, 0, 100) + '%';
  const msg = $('#blood-msg'); msg.textContent = '바늘이 초록 구간에 들어오면 찌르세요'; msg.className = 'blood-msg';
  $('#screen-blood').classList.remove('hidden');
}
function closeBlood() { blood.open = false; S.modal = false; $('#screen-blood').classList.add('hidden'); }
function animateBlood(dt) {
  if (!blood.open) return;
  blood.x += blood.dir * blood.speed * dt;
  if (blood.x >= 1) { blood.x = 1; blood.dir = -1; } else if (blood.x <= 0) { blood.x = 0; blood.dir = 1; }
  $('#blood-needle').style.left = blood.x * 100 + '%';
}
$('#btn-blood-stop').addEventListener('click', () => {
  if (!blood.open) return;
  const { c, p } = blood;
  const ok = blood.x >= blood.zone[0] && blood.x <= blood.zone[1];
  const msg = $('#blood-msg');
  if (ok) {
    msg.textContent = '성공! 한 번에 들어갔어요'; msg.className = 'blood-msg good';
    blood.open = false;
    setTimeout(() => { closeBlood(); if (player.cur === c) { c.phase = 'work'; c.t = 0; c.dur = 0.8; } }, 450);
    return;
  }
  S.stats.bloodFail++;
  if (p.rude) {
    p.patience = Math.min(p.patience, p.max * 0.08);
    S.body.mental -= 8;
    msg.textContent = `실패… ${p.name}님: “아 씨, 몇 번을 찌르는 거야!”`;
  } else {
    p.patience -= p.max * 0.25;
    msg.textContent = '실패… 환자분이 인상을 쓰세요';
  }
  msg.className = 'blood-msg bad';
  $('#blood-anger').style.width = clamp((1 - p.patience / p.max) * 100, 0, 100) + '%';
  vibrate(120);
  blood.speed *= 1.08;
  if (false) {
    blood.open = false;
    setTimeout(() => { closeBlood(); if (player.cur === c) { player.cur = null; renderQueue(); } p.busy = false; if (S.patients.has(p.id)) leaveAngry(p); }, 600);
  }
});
$('#btn-blood-later').addEventListener('click', () => {
  if (!blood.open) return;
  closeBlood();
  if (player.cur === blood.c) { blood.p.busy = false; player.cur = null; renderQueue(); }
});

// ================= 선택지 모달 =================
function openChoice({ icon: ic, who, text, options }) {
  S.modal = true;
  $('#choice-icon').innerHTML = icon(ic);
  $('#choice-who').textContent = who;
  $('#choice-text').textContent = text;
  const btns = $('#choice-btns');
  btns.innerHTML = '';
  options.forEach((o) => {
    const b = document.createElement('button');
    b.innerHTML = `${o.label}<small></small>`;
    b.querySelector('small').textContent = o.sub;
    b.addEventListener('click', () => { $('#screen-choice').classList.add('hidden'); S.modal = false; o.fn(); });
    btns.appendChild(b);
  });
  $('#screen-choice').classList.remove('hidden');
}

// ================= 업데이트 =================
function updatePatients(dt) {
  const tv = save.clinic.tv ? 0.8 : 1;
  for (const p of S.patients.values()) {
    if (p.state === 'arrive') {
      if (!p.path.length) { p.arriveT += dt; if (p.arriveT > 0.7) { setState(p, 'wait'); goTo(p, takeSeat(p, 'lobby')); } }
      continue;
    }
    if (p.busy || S.D.cur === p.id || p.path.length) continue;
    if (S.tut) { p.barEl.style.width = '100%'; continue; }
    let m = { wait: tv, examq: 0.45 * tv, order: 1, tobed: 0.6, bed: 0, beddone: 1.6, pay: 1 }[p.state] ?? 1;
    if (p.type === 'emergency') m = 1;
    const treated = !!p.order; // 진료를 받았으면 수납 전엔 절대 안 감
    p.patience -= dt * m;
    if (treated && p.patience < 0) {
      p.patience = 0;
      p.complainT = (p.complainT || 6) - dt;
      if (p.complainT <= 0) {
        p.complainT = rand(9, 13);
        save.rating -= 0.03; S.body.mental -= 2;
        say(p, pick(['언제까지 기다려요!', '계산은 언제 해 줘요?', '나 바쁜 사람이에요!']), '', 2);
      }
    }
    const r = p.patience / p.max;
    p.barEl.style.width = clamp(r * 100, 0, 100) + '%';
    p.barEl.className = r <= 0 ? 'low over' : r < 0.25 ? 'low' : r < 0.55 ? 'mid' : '';
    if (p.rude && p.state !== 'bed') {
      p.yellT -= dt;
      if (p.yellT <= 0) {
        p.yellT = rand(7, 11);
        S.body.mental -= 6; S.stats.rude++;
        const line = pick(RUDE_LINES);
        say(p, line, '', 2.5);
        toast(`💢 ${p.name}님: “${line}” (멘탈 −6)`, 'warn');
        hint('rude', '💢 진상 환자는 계속 폭언을 해서 멘탈을 깎아요. 빨리 처리해서 보내는 게 상책… (현실에서도 피해 간호사 71.8%가 무대응)');
      }
    }
    // 게이지가 바닥난 뒤에도 잠시(약 7초) 버티다가 떠남 · 진료 전 환자만
    if (!treated && p.patience <= -(p.type === 'emergency' ? 2 : 7)) leaveAngry(p);
  }
  for (const p of S.patients.values()) {
    if (!p.ov) continue;
    let mine = false, mate = false;
    for (const a of allActors()) {
      const ts = a.cur ? [a.cur.a, ...a.queue] : a.queue;
      if (ts.some((t) => t.pid === p.id)) { if (a === player) mine = true; else mate = true; }
    }
    p.ov.classList.toggle('queued', mine);
    p.ov.classList.toggle('by-mate', mate && !mine);
  }
}
function updateBeds(dt) {
  for (const bed of S.beds) {
    if (!bed.pid) continue;
    const p = S.patients.get(bed.pid);
    if (!p) continue;
    if (p.state === 'beddone') { bed.mattress.material.emissiveIntensity = 0.2 + Math.abs(Math.sin(S.t * 5)) * 0.4; continue; }
    if (p.state !== 'bed') continue;
    bed.t -= dt;
    bed.ov.firstChild.style.width = clamp((1 - bed.t / bed.dur) * 100, 0, 100) + '%';
    if (bed.t <= 0) {
      refill(p, 0.2); setState(p, 'beddone'); vibrate(80);
      say(p, bed.kind === 'iv' ? '수액 다 들어갔어요~!' : '핫팩 끝났는데요?', '', 2.5);
      hint('beddone', '🔔 빨갛게 깜빡이는 침대를 탭해서 정리해 주세요. 늦으면 인내심이 빨리 줄어요!');
    }
  }
}
function updateBody(dt) {
  const b = S.body, mx = maxStat();
  b.hunger = Math.max(0, b.hunger - dt * (100 / 150));
  b.bladder = Math.max(0, b.bladder - dt * (100 / 125));
  b.stamina = Math.max(0, b.stamina - dt * 0.18 * (save.items.tumbler ? 0.8 : 1));
  b.mental = clamp(b.mental, 0, mx);
  if (b.hunger <= 0) S.stats.skippedMeal = true;
  if (b.bladder <= 5) S.stats.heldPee = true;
  const warn = (k, v, msg) => {
    if (v < 25 && !S.warned[k]) { S.warned[k] = true; toast(msg, 'warn'); }
    if (v > 60) S.warned[k] = false;
  };
  warn('h', b.hunger, '🍙 배고파서 손이 떨려요… 초코바라도');
  warn('b', b.bladder, '🚻 화장실이 급해요…! 3시간째 참는 중');
  warn('s', b.stamina, '⚡ 체력이 바닥나고 있어요');
  warn('m', b.mental, '💔 멘탈이 바닥나서 손이 느려져요…');
  if (b.hunger < 40 || b.bladder < 40) hint('body', '🍙🚻 내 몸도 챙겨야 해요! 탕비실이나 초코바로 회복하세요. 단, 팀장님 눈치는 보면서…');
  setGauge(el.gH, b.hunger, mx); setGauge(el.gB, b.bladder, mx); setGauge(el.gS, b.stamina, mx); setGauge(el.gM, b.mental, mx);
}
function setGauge(g, v, mx) {
  g.querySelector('i').style.width = (v / mx) * 100 + '%';
  const n = String(Math.round(v));
  const em = g.querySelector('em');
  if (em.textContent !== n) em.textContent = n;
  g.classList.toggle('crit', v < mx * 0.2);
}
function updatePhone(dt) {
  const ph = S.phone;
  if (S.closed || isLunch()) { if (ph.ringing && !ph.by) { ph.ringing = false; phoneBtn.classList.remove('ringing'); } return; }
  if (ph.ringing) {
    if (ph.by) return;
    ph.left -= dt;
    if (ph.left <= 0) {
      ph.ringing = false; phoneBtn.classList.remove('ringing');
      ph.next = rand(20, 36); save.rating -= 0.05; S.stats.phoneMissed++;
      toast('📵 전화를 못 받았어요 (평판 −)', 'warn');
      for (const a of allActors()) a.queue = a.queue.filter((t) => t.kind !== 'phone');
      renderQueue();
    }
  } else if ((ph.next -= dt) <= 0) {
    ph.ringing = true; ph.left = 9; phoneBtn.classList.add('ringing'); vibrate(60);
  }
}
function updateSpawns() {
  if (S.closed || S.intakeClosed || isLunch()) return;
  const gm = gameMinute();
  if (gm >= S.intakeEnd) { S.intakeClosed = true; toast(`🚪 ${fmtTime(S.intakeEnd)} 접수 마감! 이제 새 환자는 안 받아요`); return; }
  if (gm >= LUNCH_S - 10 && gm < S.lunchEnd) {
    if (!S.lateDone && gm >= LUNCH_S - 5) {
      S.lateDone = true;
      if (Math.random() < 0.65) {
        spawnPatient(pick(['worker', 'normal']));
        toast('🕐 12시 55분 “아직 점심시간 아니죠?” 막차 환자 도착…', 'warn');
      }
    }
    return;
  }
  const rush = gm >= 12 * 60 && gm < LUNCH_S - 10;
  if (S.t >= S.spawnAt) {
    const base = save.day === 1 ? 9.0 : save.day === 2 ? 7.6 : Math.max(3.6, 7.4 - (save.day - 2) * 0.5);
    S.spawnAt = S.t + base * (rush ? 0.6 : 1) * rand(0.7, 1.3);
    if (lobbyWaiting() >= 9) { save.rating -= 0.05; toast('🚪 대기 공간이 꽉 차서 환자가 그냥 돌아갔어요', 'warn'); }
    else {
      const table = rush ? [['worker', 6], ['normal', 2]]
        : gm < 10.5 * 60 ? [['grandma', 4], ['grandpa', 3], ['normal', 2], ['kid', 1]]
        : [['normal', 3], ['grandma', 2], ['grandpa', 2], ['kid', 2], ['worker', 1]];
      const ty = weightedPick(table);
      spawnPatient(ty, { rude: S.t > 25 && ty !== 'kid' && Math.random() < (save.day === 1 ? 0.03 : 0.08 + save.day * 0.015) });
    }
  }
  if (S.emergencyAt > 0 && S.t >= S.emergencyAt) {
    S.emergencyAt = -1;
    spawnPatient('emergency');
    toast('🚨 가슴을 움켜쥔 환자 내원! 탭해서 바로 119 연계!', 'warn');
    vibrate([150, 60, 150]);
  }
  if (S.changeAt > 0 && S.t >= S.changeAt) {
    const cands = [...S.patients.values()].filter((p) => (p.state === 'order' || p.state === 'tobed') && (p.order === 'shot' || p.order === 'iv'));
    if (cands.length) {
      S.changeAt = Math.random() < 0.6 ? S.t + rand(35, 60) / (S.doc.changeMul || 1) : -1;
      const p = pick(cands);
      const from = p.med;
      p.med = from.endsWith('A') ? from.slice(0, -1) + 'B' : from.slice(0, -1) + 'A';
      renderPatient(p);
      say(doctor, `${p.name}님 ${MEDS[from].name} 말고 ${MEDS[p.med].name}!`, 'doc', 3);
      toast(`🧑‍⚕️ ${S.doc.name}: “${p.name}님 ${MEDS[from].name} 말고 ${MEDS[p.med].name}로 바꿔요!”`, 'warn');
    } else S.changeAt = S.t + 8;
  }
  for (let i = S.returns.length - 1; i >= 0; i--) {
    const r = S.returns[i];
    if (S.t >= r.at) {
      S.returns.splice(i, 1);
      spawnPatient(r.type, { name: r.name, state: 'pay', docs: true, returning: true, max: 26 });
      toast(`📄 ${r.name}님 “아 맞다, 실비 서류 좀 떼 주세요!”`);
    }
  }
}
function updateLunch() {
  const gm = gameMinute();
  if (gm >= LUNCH_S && !S.lunchToast) {
    S.lunchToast = true;
    const left = S.patients.size;
    toast(left ? `🍱 13시 점심시간! …인데 아직 환자 ${left}명이 남았다` : '🍱 13시 점심시간! 탕비실에서 밥 먹을 수 있어요', left ? 'warn' : 'good');
    if (S.doc.biz) setTimeout(() => { say(doctor, '밥은 빨리빨리 먹고 와요~', 'doc', 2.4); toast(`🧑‍⚕️ ${S.doc.name}: “점심 먹고 와서 기록 정리 다 해 놔요~”`, 'warn'); }, 900);
    hint('lunch', '🍱 점심시간에는 새 환자가 없고, 탕비실에서 팀장님 눈치 없이 밥을 먹을 수 있어요.');
  }
  if (isLunch()) {
    mates.forEach((m, i) => {
      if (m.state === 'work' && !m.cur && !m.queue.length && (S.patients.size === 0 || gm > LUNCH_S + 20)) {
        m.state = 'lunch'; releaseDesk(m); goTo(m, SP.lunchSeats[i % 2]);
        say(m, '밥 먹고 올게요~', '', 1.8);
      }
    });
  } else if (gm >= S.lunchEnd) {
    if (!S.lunchEndToast) {
      S.lunchEndToast = true;
      toast(`🕑 ${fmtTime(S.lunchEnd)} 오후 진료 시작`);
      if (!S.stats.ateLunch) setTimeout(() => toast('🍱 결국 점심을 못 먹었어요…', 'warn'), 600);
    }
    for (const m of mates) if (m.state === 'lunch') m.state = 'work';
  }
}
function gameMinute() { const t = S.clock ?? S.t; return t <= DAY_SECONDS ? START_MIN + t * MIN_PER_SEC : END_MIN + (t - DAY_SECONDS); }
function fmtTime(m) { m = Math.floor(m); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
// 팀장 지시 · 원장 호출을 도크의 요청 칩으로
const reqEl = $('#requests');
function renderRequests() {
  const items = [];
  const has = (k, pid) => (player.cur && player.cur.a.kind === k && player.cur.a.pid === pid) || player.queue.some((t) => t.kind === k && t.pid === pid);
  if (S.directive) items.push({ id: 'd', cls: '', ic: 'megaphone', label: `팀장 · ${S.directive.label}`, r: S.directive.left / S.directive.max, q: has(S.directive.kind, S.directive.pid) });
  if (S.errand) items.push({ id: 'e', cls: 'doc', ic: 'stetho', label: `원장 · ${S.errand.label}`, r: S.errand.left / S.errand.max, q: has('errand') || S.errand.answering });
  const shown = items.filter((i) => !i.q);
  $('#req-row').classList.toggle('hidden', !shown.length);
  const key = shown.map((i) => i.id + i.label).join('|');
  if (reqEl.dataset.k !== key) {
    reqEl.dataset.k = key;
    reqEl.innerHTML = shown.map((i) => `<button class="req ${i.cls}" data-req="${i.id}">${icon(i.ic)}<span>${i.label}</span><i></i></button>`).join('');
  }
  items.forEach((i) => { const b = reqEl.querySelector(`[data-req="${i.id}"] i`); if (b) b.style.transform = `scaleX(${Math.max(0, i.r)})`; });
}
reqEl.addEventListener('click', (e) => {
  const b = e.target.closest('[data-req]');
  if (!b || !playing()) return;
  if (b.dataset.req === 'd' && S.directive) enqueue(player, { kind: S.directive.kind, pid: S.directive.pid });
  if (b.dataset.req === 'e' && S.errand) enqueue(player, { kind: 'errand' });
});
function setNum(node, v) {
  if (node.textContent === v) return;
  node.textContent = v;
  node.classList.remove('bump'); void node.offsetWidth; node.classList.add('bump');
}
function updateHud() {
  const gm = gameMinute();
  el.clock.textContent = fmtTime(gm);
  const ph = S.closed ? ['야근 중', 'over'] : isLunch() ? ['점심시간', 'lunch'] : S.intakeClosed ? ['접수 마감', 'warn'] : (gm >= 720 && gm < LUNCH_S) ? ['점심 직전', 'warn'] : ['진료 중', ''];
  if (el.phase.textContent !== ph[0]) { el.phase.textContent = ph[0]; el.phase.className = 'phase ' + ph[1]; }
  el.tlFill.style.width = clamp((gm - START_MIN) / (END_MIN - START_MIN) * 100, 0, 100) + '%';
  el.timeline.classList.toggle('over', S.closed);
  save.rating = clamp(save.rating, 0, 5);
  setNum(el.money, fmtWon(save.money));
  setNum(el.rating, save.rating.toFixed(1));
  const w = $('#wait-count');
  const n = lobbyWaiting();
  if (w) w.textContent = n ? ` ${n}` : '';
  const show = S.combo >= 2 && S.t - S.lastDone <= 3.5;
  const key = show ? String(S.combo) : '0';
  if (el.combo.dataset.k !== key) { el.combo.dataset.k = key; el.combo.innerHTML = show ? `<span class="cb">${icon('fire')}콤보 ×${S.combo}</span>` : ''; }
  renderRequests();
  const lbl = isLunch() ? '점심' : '간식';
  const sm = snackBtn.querySelector('small');
  if (sm.textContent !== lbl) sm.textContent = lbl;
}
function updateClock() {
  if (!S.closed && gameMinute() >= END_MIN) {
    S.closed = true; S.returns = [];
    toast('🕕 18:00 진료 마감! 남은 환자와 기록을 마무리해야 퇴근…', 'warn');
  }
  if (S.closed && S.patients.size === 0 && !S.ended) endDay();
}

// ================= 시각 효과 =================
function animateActor(a, dt, t) {
  a.ch.g.position.set(a.pos.x, 0, a.pos.z);
  const moving = a.path.length > 0;
  turnTo(a.ch.g, moving ? a.face : (a.spot && a.spot.rot !== undefined ? a.spot.rot : a.face), dt);
  const sitting = a.state === 'lunch' && !moving;
  setPose(a.ch, sitting ? 'sit' : 'stand');
  animateChibi(a.ch, dt, moving, t, true);
  const working = a.cur && ['work', 'ready', 'pick', 'mini'].includes(a.cur.phase);
  if (working && !moving) {
    a.ch.arms[0].rotation.x = -1.0 + Math.sin(t * 14) * 0.25;
    a.ch.arms[1].rotation.x = -0.9 + Math.cos(t * 14) * 0.25;
  }
  if (moving) a.ch.body.rotation.x = 0.26;
  else if (!sitting) a.ch.body.rotation.x = 0.06;
  const showBar = a.cur && a.cur.phase === 'work' && a.ch.g.visible;
  a.barEl.style.visibility = showBar ? 'visible' : 'hidden';
  if (showBar) a.barFill.style.width = Math.min(100, (a.cur.t / a.cur.dur) * 100) + '%';
  a.ovNode.style.display = a.ch.g.visible ? '' : 'none';
  placeOv(a.ovNode, a.pos.x, 2.05, a.pos.z);
  if (a !== player) a.ch.extras.held.forEach((g, i) => { const it = a.hands[i] || ''; if (g.userData.k !== it) { g.userData.k = it; g.clear(); if (it) g.add(heldItemMesh(MEDS[it].color)); } });
}
function animateWorld(dt, t) {
  easeCamera(dt);
  if (S) {
    for (const a of allActors()) {
      if (a !== player && a.state === 'lunch' && a.path.length) stepAlong(a, dt, NURSE_SPEED * 0.7);
      animateActor(a, dt, t);
    }
    const b = S.body, mx = maxStat();
    const tired = b.stamina < mx * 0.35 || b.hunger < mx * 0.25 || b.bladder < mx * 0.25 || b.mental < mx * 0.3;
    player.ch.extras.sweat.visible = tired;
    if (tired) player.ch.extras.sweat.position.y = 0.1 - ((t * 0.6) % 1) * 0.15;
    if (!player.path.length && tired) player.ch.body.rotation.x = 0.18;
    player.ch.head.rotation.z = Math.sin(t * 1.3) * (tired ? 0.14 : 0.05);
    player.ch.head.rotation.x = tired ? 0.22 : 0.08;
    if (b.bladder < mx * 0.25 && !player.path.length) player.ch.body.position.y = Math.abs(Math.sin(t * 16)) * 0.03;
    for (const p of [...S.patients.values(), ...S.leavers]) {
      const moving = p.path.length > 0;
      if (moving) stepAlong(p, dt, PATIENT_SPEED);
      const arrived = p.path.length === 0;
      p.ch.g.position.set(p.pos.x, 0, p.pos.z);
      if (!arrived) { setPose(p.ch, 'stand'); turnTo(p.ch.g, p.face, dt); }
      else if (p.spot) {
        turnTo(p.ch.g, p.spot.rot !== undefined ? p.spot.rot : p.face, dt);
        setPose(p.ch, p.spot.pose || 'stand');
        if (p.ov && p.state !== 'bed' && p.patience / p.max < 0.3) p.ch.g.position.y = Math.abs(Math.sin(t * 10 + p.id)) * 0.05;
      }
      animateChibi(p.ch, dt, !arrived, t);
      if (p.ov) {
        const lying = p.ch.pose === 'lie';
        const h = lying ? 1.35 : (p.ch.pose === 'sit' ? 1.3 : 1.45) * p.ch.scale * CHAR_SCALE;
        const off = lying ? -0.5 * Math.cos(p.spot.rot || 0) : 0;
        placeOv(p.ov, p.pos.x, h, p.pos.z + off);
      }
    }
    for (let i = S.leavers.length - 1; i >= 0; i--) if (!S.leavers[i].path.length) { disposePatient(S.leavers[i]); S.leavers.splice(i, 1); }
    for (const bd of S.beds) placeOv(bd.ov, bd.g.position.x, 2.05, bd.g.position.z);
    const D = S.D;
    const dp = D.cur && S.patients.get(D.cur);
    const examining = !!(dp && !dp.path.length && dp.spot === SP.examChair);
    doctor.arms[1].rotation.x = examining ? -1.1 + Math.sin(t * 6) * 0.3 : -0.7;
    doctor.arms[0].rotation.x = S.errand ? -2.4 + Math.sin(t * 8) * 0.4 : -0.7;
    doctor.head.rotation.y = examining ? Math.sin(t * 2) * 0.15 : Math.sin(t * 0.7) * 0.35;
    phoneMesh.position.y = 1.12 + (S.phone.ringing ? Math.abs(Math.sin(t * 30)) * 0.04 : 0);
    if (errandOv.style.display !== 'none') placeOv(errandOv, doctor.g.position.x, 2.4, doctor.g.position.z);
    if (choreOv.style.display !== 'none' && lead) placeOv(choreOv, lead.pos.x, 3.35, lead.pos.z);
    updateBubbles();
  }
  if (doctor) animateChibi(doctor, dt, false, t);
}

// ================= 메인 루프 =================
let lastTs = performance.now();
function frameLogic(dt) {
  if (!S || S.paused || S.ended || S.modal) return;
  S.t += dt;
  if (S.tut) { // 튜토리얼: 시간 정지 · 이벤트 없음
    updateDoctor(dt); updatePatients(dt); updateBeds(dt);
    for (const a of allActors()) updateActor(a, dt);
    updateHud(); return;
  }
  S.clock += dt;
  updateSpawns(); updateLunch(); updateDoctor(dt); updatePatients(dt); updateBeds(dt); updateBody(dt);
  updatePhone(dt); updateErrand(dt); updateDoctorEvents(); updateBoss(dt);
  for (const m of mates) mateThink(m);
  for (const a of allActors()) updateActor(a, dt);
  updateClock(); updateHud();
}
function frame(ts) {
  const dt = Math.min(0.1, (ts - lastTs) / 1000 || 0);
  lastTs = ts;
  const steps = window.__timeScale ?? 1;
  for (let k = 0; k < steps; k++) {
    frameLogic(dt);
    if (!S || (!S.paused && !S.modal)) animateWorld(dt, ts / 1000 + k * dt);
  }
  animateBlood(dt);
  if (S && S.modal) updateBubbles();
  updateCoach();
  if (CS.active) csFrame(dt, ts / 1000);
  else renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// ================= 하루 끝 → 결과 → 퇴근 후 → 브리핑 =================
let dayResult = null;
function endDay() {
  S.ended = true;
  closeSheet();
  const st = S.stats;
  const overtime = Math.max(0, Math.round(gameMinute() - END_MIN));
  const chartOT = S.charts * 6;
  const early = 30;
  const restMin = Math.round(st.restSec * MIN_PER_SEC);
  save.rating = clamp(save.rating, 0, 5);
  const dRating = save.rating - st.startRating;
  const rank = RANKS[save.rank];
  const wage = rank.wage * PAID_HOURS;
  let bonus = 0;
  if (save.rating >= 3.4 && st.served >= 14) bonus = (S.doc.kind ? 2 : 1) * 10000 * (st.served >= 22 ? 2 : 1);
  save.money += wage + bonus;
  save.revenue += st.revenue;
  const invests = [];
  while (save.investIdx < INVEST.length && save.revenue >= INVEST[save.investIdx].rev) {
    const iv = INVEST[save.investIdx++];
    if (iv.key === 'tv') save.clinic.tv = 1; else save.clinic[iv.key] = Math.min(4, save.clinic[iv.key] + 1);
    invests.push(iv.text);
  }
  const pts = Math.max(-30, Math.round(st.served * 8 + Math.max(0, dRating) * 60 + st.evalAdj - st.incidents * 40 - st.angry * 6));
  save.evalPts = Math.max(0, save.evalPts + pts);
  let promoted = null;
  if (save.rank < RANKS.length - 1 && save.evalPts >= RANKS[save.rank + 1].need) { save.rank++; promoted = RANKS[save.rank]; }
  save.stamina = S.body.stamina; save.mental = S.body.mental;
  dayResult = { overtime, chartOT, early, restMin, wage, bonus, invests, pts, promoted, report: !!S.reportDue, st };
  persist();

  $('#res-eyebrow').textContent = `DAY ${save.day} 퇴근 기록 · ${S.doc.name}(${S.doc.trait})`;
  $('#res-title').textContent = overtime + chartOT ? `야근 ${overtime + chartOT}분 하고 퇴근…` : '정시 퇴근 성공!';
  const stat = (label, val, bad) => `<div class="stat ${bad ? 'bad' : ''}"><small>${label}</small><b>${val}</b></div>`;
  $('#res-stats').innerHTML = [
    stat('처리한 환자', st.served + '명'),
    stat('화나서 간 환자', st.angry + '명', st.angry > 0),
    stat('의원 매출', won(st.revenue)),
    stat('평판 변화', (dRating >= 0 ? '+' : '') + dRating.toFixed(2), dRating < 0),
    stat('투약 사고', st.incidents + '건', st.incidents > 0),
    stat('채혈', `${st.blood}건 · 실패 ${st.bloodFail}`, st.bloodFail > 2),
    stat('원장님 심부름', `${st.errands}건 · 놓침 ${st.errandsMissed}`, st.errandsMissed > 0),
    stat('팀장님 지시', `${st.ord}건 · 놓침 ${st.ordMiss}`, st.ordMiss > 0),
    stat('의료지식 퀴즈', `정답 ${st.quizOk} · 오답 ${st.quizBad}`, st.quizBad > 0),
    stat('들은 폭언 · 태움', `${st.rude} · ${st.taeum}번`, st.rude + st.taeum > 0),
  ].join('') + `<div class="labor" style="grid-column: 1 / -1">
      <h4>${icon('won')}오늘의 급여 명세</h4>
      <div class="lrow"><span>시급 ${won(rank.wage)} × ${PAID_HOURS}시간 (최저 ${won(MIN_WAGE_2026)})</span><b>${won(wage)}</b></div>
      ${bonus ? `<div class="lrow"><span>원장님 금일봉</span><b>${won(bonus)}</b></div>` : ''}
      <div class="lrow"><span>야근수당 (조기출근 ${early}·야근 ${overtime}·기록 ${chartOT}분)</span><b>₩0</b></div>
      <div class="lrow"><span>휴게시간 사용 (법정 60분)</span><b>${restMin}분</b></div>
      <div class="lrow total"><span>오늘 입금 · 공짜 노동 ${early + overtime + chartOT}분</span><b>${won(wage + bonus)}</b></div>
    </div>`;
  const badges = [];
  if (!overtime && !chartOT) badges.push(['전설의 칼퇴', true]);
  if (!st.ateLunch) badges.push(['점심 못 먹음', false]);
  if (st.heldPee) badges.push(['방광 강철 인증', false]);
  if (restMin < 30) badges.push(['휴게시간? 그게 뭔데', false]);
  if (S.body.mental < maxStat() * 0.3) badges.push(['멘탈 바사삭', false]);
  if (st.e119) badges.push(['응급 판별 성공', true]);
  if (st.angry === 0 && st.served >= 10) badges.push(['민원 0건', true]);
  if (st.harass) badges.push(['불쾌한 말을 들은 날', false]);
  $('#res-badges').innerHTML = badges.map(([tx, g]) => `<span class="badge ${g ? 'good' : ''}">${tx}</span>`).join('');
  const next = RANKS[save.rank + 1];
  let extra = '';
  if (promoted) extra += `<div class="promo up"><h4>${icon('medal')}승진! ${promoted.name}</h4><small>시급이 ${won(promoted.wage)}(으)로 올랐어요${save.rank >= 3 ? ' · 팀장님 태움 데미지 절반' : ''}</small></div>`;
  else if (next) extra += `<div class="promo"><h4>${icon('medal')}승진 심사 · 다음: ${next.name}</h4><div class="pbar2"><i style="width:${clamp(save.evalPts / next.need * 100, 0, 100)}%"></i></div><small>평가 점수 ${save.evalPts} / ${next.need} (오늘 ${pts >= 0 ? '+' : ''}${pts})</small></div>`;
  for (const iv of invests) extra += `<div class="invest">${icon('sparkle')}<span>의원 매출이 늘어 원장님이 투자했어요: <b>${iv}</b></span></div>`;
  $('#res-extra').innerHTML = extra;
  $('#screen-result').classList.remove('hidden');
}

let eveChoice = null;
function openEvening() {
  $('#screen-result').classList.add('hidden');
  const r = dayResult, st = r.st;
  $('#eve-eyebrow').textContent = `퇴근 후 · ${HOMES[save.home].name}`;
  const lines = [];
  if (st.rude >= 2) lines.push(`오늘 들은 폭언 <b>${st.rude}번</b>. 웃으며 “네~ 죄송합니다” 했지만, 집에 와서도 그 목소리가 맴돈다.`);
  if (st.taeum) lines.push(`팀장님한테 <b>${st.taeum}번</b> 혼났다. “신규가 간이 크네”라는 말이 계속 떠오른다.`);
  if (st.quizBad) lines.push('“그것도 몰라? 간호사 맞아?” 원장님 말에 얼굴이 화끈거렸다. 오늘 밤은 책 좀 봐야겠다.');
  if (st.harass) lines.push('대진 선생님의 그 말… 웃어야 했나, 화내야 했나. 아무도 내 편이 아니었다.');
  if (r.overtime + r.chartOT > 30) lines.push(`오늘도 ${r.overtime + r.chartOT}분 공짜 야근. 버스 막차를 겨우 탔다.`);
  if (!lines.length) lines.push('오늘은 그럭저럭 버텼다. 내일도 이 정도면 좋겠다.');
  $('#eve-mood').innerHTML = `<div class="mood">${lines.join('<br>')}</div>`;
  const acts = r.report
    ? [{ id: 'report', icon: 'pen', name: '투약 사고 경위서 쓰기', desc: '밤 11시까지 경위서를… 멘탈 −10 · 회복량 감소', forced: true }]
    : [
      { id: 'rest', icon: 'sleep', name: '집에서 푹 쉬기', desc: '배달 음식 먹고 일찍 잔다 · 체력 회복 +15' },
      { id: 'friend', icon: 'chat', name: '친구 만나 수다 떨기', desc: `${won(15000)} · 멘탈 회복 +20` },
      { id: 'diary', icon: 'book', name: '오늘 하루 돌아보기', desc: '일기를 쓰며 마음 정리 · 멘탈 +8, 체력 +5' },
    ];
  eveChoice = acts[0].id;
  $('#eve-acts').innerHTML = `<div class="act-list">${acts.map((a, i) => `<button class="act ${a.forced ? 'forced' : ''} ${i === 0 ? 'on' : ''}" data-act="${a.id}"><span class="ai">${icon(a.icon)}</span><span><b>${a.name}</b><p>${a.desc}</p></span></button>`).join('')}</div>`;
  renderShop();
  $('#screen-evening').classList.remove('hidden');
}
$('#eve-acts').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  if (b.dataset.act === 'friend' && save.money < 15000) { toast('통장 잔고가 부족해요', 'warn'); return; }
  eveChoice = b.dataset.act;
  document.querySelectorAll('#eve-acts .act').forEach((x) => x.classList.toggle('on', x === b));
});
function renderShop() {
  $('#shop-money').innerHTML = `<span class="won-badge">${icon('won')}</span>${save.money.toLocaleString('ko-KR')}`;
  const items = SHOP.map((it) => {
    const owned = it.once && save.items[it.id];
    return `<div class="item"><span class="it-ic">${icon(it.icon)}</span><span class="tx"><b>${it.name}${it.id.startsWith('choco') ? ` <span class="home-tag">보유 ${save.choco}</span>` : ''}</b><small>${it.desc}</small></span>
      ${owned ? '<span class="owned">보유 중</span>' : `<button data-buy="${it.id}" ${save.money < it.cost ? 'disabled' : ''}>${won(it.cost)}</button>`}</div>`;
  });
  const nh = HOMES[save.home + 1];
  items.push(`<div class="item"><span class="it-ic">${icon('home')}</span><span class="tx"><b>${HOMES[save.home].name}<span class="home-tag">현재 집</span></b><small>${nh ? `다음: ${nh.name} · ${nh.desc}` : '최고의 집이에요'}</small></span>
    ${nh ? `<button data-home="1" ${save.money < nh.cost ? 'disabled' : ''}>이사 ${won(nh.cost)}</button>` : ''}</div>`);
  $('#shop').innerHTML = items.join('');
}
$('#shop').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b || b.disabled) return;
  if (b.dataset.buy) {
    const it = SHOP.find((x) => x.id === b.dataset.buy);
    if (save.money < it.cost) return;
    save.money -= it.cost;
    if (it.give) it.give(save); else save.items[it.id] = 1;
  } else if (b.dataset.home) {
    const nh = HOMES[save.home + 1];
    if (!nh || save.money < nh.cost) return;
    save.money -= nh.cost; save.home++;
    toast(`🏠 ${nh.name}(으)로 이사했어요!`, 'good');
  }
  persist(); renderShop();
});
function sleepAndNext() {
  const r = dayResult;
  const home = HOMES[save.home], mx = home.max;
  let recS = home.recS, recM = home.recM;
  const otPen = (r.overtime + r.chartOT) * 0.3;
  if (eveChoice === 'rest') recS += 15;
  if (eveChoice === 'friend') { recM += 20; save.money -= 15000; }
  if (eveChoice === 'diary') { recM += 8; recS += 5; }
  if (eveChoice === 'report') { recS *= 0.6; recM = recM * 0.6 - 10; }
  if (r.st.rude >= 3) recM -= 8;
  save.stamina = clamp(Math.round(save.stamina + recS - otPen), 30, mx);
  save.mental = clamp(Math.round(save.mental + recM), 20, mx);
  save.lastDoc = S.doc.id;
  $('#screen-evening').classList.add('hidden');
  const eve = eveningStory(dayResult, eveChoice);
  save.day++;
  persist();
  briefDoc = { ...pickDoctor(), _day: save.day };
  playScene(eve, () => playStory(briefDoc, openBrief));
}

let briefDoc = null;
const preview = { beds: [], on: false };
const DOC_PLAN = {
  biz: '최원장님은 회전율이 최우선이에요. 마감 연장도 각오하세요. 진료실 심부름을 가면 질문이 날아올 수 있으니 기본기를 떠올려 두세요.',
  kind: '여유로운 날이에요. 기록을 그때그때 정리하고, 점심도 꼭 챙겨 드세요.',
  slow: '진료가 길어 접수·수납실이 붐벼요. 후배는 <b>접수·수납 위주</b>로, 대기 환자 인내심을 지켜 주세요.',
  fast: '진료가 빨라 주사실이 금방 차요. 후배를 <b>처치 위주</b>로 돌리고, 처방 변경이 잦으니 약은 1~2개씩만 챙기세요.',
  creep: '불쾌한 말에 대비해 멘탈을 아껴 두세요. 초코바·간식으로 멘탈과 체력을 미리 채워 두는 게 좋아요.',
};
function estPatients() {
  const base = save.day === 1 ? 9.0 : save.day === 2 ? 7.6 : Math.max(3.6, 7.4 - (save.day - 2) * 0.5);
  return Math.round(147 / base + (16.7 / base) * (1 / 0.6 - 1));
}
function minimapSVG(doc) {
  const K = 14, ox = 7.2, oz = 11.6;
  const X = (x) => ((x + ox) * K).toFixed(1), Z = (z) => ((z + oz) * K).toFixed(1);
  const W = (14.4 * K).toFixed(0), H = (24.6 * K).toFixed(0);
  const nIv = Math.min(4, save.clinic.ivBeds), nHeat = Math.min(4, save.clinic.heatBeds);
  const info = {
    exam: [`${doc.name} · ${doc.trait}`, '진료 의자 1'],
    cabinet: ['약 5종', '주사실과 내부 문'],
    ward: [`침대 · 수액 ${nIv} · 핫팩 ${nHeat}`],
    inject: ['처치 대기 의자 6', '주사 · 채혈'],
    desk: ['창구 2 · 번호표', `대기 의자 10${save.clinic.tv ? ' · TV' : ''}`],
    pantry: ['화장실 · 간식', '점심 13~14시'],
  };
  const flow = { desk: '1·5', exam: '2', inject: '3', ward: '4' };
  let g = `<svg class="minimap" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
  g += `<rect x="${X(-COR)}" y="${Z(-11)}" width="${(2 * COR * K).toFixed(1)}" height="${(23.6 * K).toFixed(1)}" fill="#e3eeeb"/>`;
  for (const r of Object.values(ROOMS)) {
    g += `<rect x="${X(r.x0)}" y="${Z(r.z0)}" width="${((r.x1 - r.x0) * K).toFixed(1)}" height="${((r.z1 - r.z0) * K).toFixed(1)}" rx="6" fill="${r.floor}" stroke="#ffffff" stroke-width="3"/>`;
    const tx = r.cx + (r.side < 0 ? -0.4 : 0.4), tz = r.cz + { exam: 0.2, cabinet: 0.9, ward: -0.05, inject: -0.6, desk: -1.6, pantry: 0.6 }[r.key];
    g += `<text x="${X(tx)}" y="${Z(tz)}" text-anchor="middle" font-size="11" font-weight="800" fill="#15302b">${r.name}</text>`;
    info[r.key].forEach((ln, i) => { g += `<text x="${X(tx)}" y="${(+Z(tz) + 13 + i * 11).toFixed(1)}" text-anchor="middle" font-size="8.5" font-weight="600" fill="#4c6661">${ln}</text>`; });
    const dx = r.side * COR;
    g += `<rect x="${(+X(dx) - 2).toFixed(1)}" y="${Z(r.cz - 0.9)}" width="4" height="${(1.8 * K).toFixed(1)}" rx="2" fill="#1fb39a"/>`;
    const fx = r.side < 0 ? r.x1 - 0.5 : r.x0 + 0.5, fz = r.cz + (r.key === 'desk' ? -1.0 : r.key === 'ward' ? 0.15 : 0);
    if (flow[r.key]) g += `<circle cx="${X(fx)}" cy="${Z(fz)}" r="9" fill="#15302b"/><text x="${X(fx)}" y="${(+Z(fz) + 3.5).toFixed(1)}" text-anchor="middle" font-size="${flow[r.key].length > 1 ? 7 : 9}" font-weight="800" fill="#7ff0dc">${flow[r.key]}</text>`;
  }
  // 침대 · 의자 · 사람
  [-2.2, -0.9, 0.4, 1.7].slice(0, nIv).forEach((dx) => { const c = R('ward', dx, -2.0); g += `<rect x="${X(c.x - 0.5)}" y="${Z(c.z - 1)}" width="${K}" height="${2 * K}" rx="3" fill="#a8dcef"/>`; });
  [-2.2, -0.9, 0.4, 1.7].slice(0, nHeat).forEach((dx) => { const c = R('ward', dx, 2.0); g += `<rect x="${X(c.x - 0.5)}" y="${Z(c.z - 1)}" width="${K}" height="${2 * K}" rx="3" fill="#f6c3a0"/>`; });
  for (const st of [...SEATS.lobby, ...SEATS.inject]) g += `<circle cx="${X(st.x)}" cy="${Z(st.z)}" r="3.2" fill="${SEATS.lobby.includes(st) ? '#f2a65a' : '#8f7fe8'}"/>`;
  const desk = R('desk', -0.7, -2.6);
  g += `<rect x="${X(desk.x - 1.9)}" y="${Z(desk.z - 0.3)}" width="${(3.8 * K).toFixed(1)}" height="${(0.6 * K).toFixed(1)}" rx="3" fill="#e6c48f"/>`;
  const dp = R('exam', -1.4, -1.85);
  g += `<circle cx="${X(dp.x)}" cy="${Z(dp.z)}" r="5" fill="#ffffff" stroke="#15302b" stroke-width="2"/>`;
  const lx = R('cabinet', LINK_DX, 0).x;
  g += `<rect x="${X(lx - 0.6)}" y="${(+Z(-5) - 2).toFixed(1)}" width="${(1.2 * K).toFixed(1)}" height="4" rx="2" fill="#3f7df0"/>`;
  g += `<text x="${X(0)}" y="${Z(12.3)}" text-anchor="middle" font-size="9" font-weight="800" fill="#128a76">▲ 입구</text>`;
  return g + '</svg>';
}
function renderBriefMap(doc) {
  const nJ = juniorsFor(save.day).length;
  const beds = Math.min(4, save.clinic.ivBeds) + Math.min(4, save.clinic.heatBeds);
  const evs = [
    ['drop', '채혈 1~2건'], ['lunch', '점심 13~14시 (신규 환자 없음)'], ['clock', '17:30 접수 마감'], ['megaphone', '팀장님 지시'],
  ];
  if (doc.quiz) evs.push(['book', '원장님 기습 질문', 1]);
  if (doc.biz) evs.push(['clock', '마감 연장 가능', 1]);
  if (save.day >= 2) evs.push(['heartPulse', '응급 환자 가능', 1], ['stetho', '처방 변경', 1]);
  if (doc.harass) evs.push(['warning', '불쾌한 발언', 1]);
  if (doc.kind) evs.push(['cup', '커피 이벤트']);
  if (doc.errandMul > 2) evs.push(['stetho', '원장님 호출 잦음', 1]);
  $('#brief-map').innerHTML = `<div class="map-wrap">${minimapSVG(doc)}</div>
    <div class="scale-grid">
      <div><b>1</b><small>의사</small></div>
      <div><b>1</b><small>간호팀장</small></div>
      <div><b>${1 + nJ}</b><small>간호사 (나${nJ ? '+후배' : ''})</small></div>
      <div><b>${beds}</b><small>치료 침대</small></div>
      <div><b>16</b><small>대기 의자</small></div>
      <div><b>~${estPatients()}</b><small>예상 환자</small></div>
    </div>
    <div class="ev-list">${evs.map(([ic, t, w]) => `<span class="ev ${w ? 'warn' : ''}">${icon(ic)}${t}</span>`).join('')}</div>
    <div class="stage-next">${icon('home')}<span><b>STAGE 1 · 동네 의원</b> — 다음 스테이지 <b>종합병원</b>(원무과·병동·3교대)은 준비 중이에요</span></div>`;
}
function setBriefTab(tab) {
  document.querySelectorAll('#brief-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.btab === tab));
  document.querySelectorAll('.btab').forEach((b) => b.classList.toggle('hidden', b.dataset.btab !== tab));
}
$('#brief-tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-btab]'); if (b) setBriefTab(b.dataset.btab); });
$('#brief-body').addEventListener('click', (e) => {
  const fb = e.target.closest('[data-bfocus]');
  if (!fb) return;
  const i = +fb.dataset.bmate;
  save.focus[i] = fb.dataset.bfocus; persist();
  fb.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === fb));
});
function startPreview() {
  $('#screen-brief').classList.add('hidden');
  if (S && S.ended) clearDay();
  for (const b of preview.beds) b.ov.remove();
  buildBeds(preview);
  placeDoctor(briefDoc.look);
  cam.tZoom = 1; cam.tpx = 0; cam.tpz = 0;
  preview.on = true;
  $('#preview-bar').classList.remove('hidden');
  toast('🏠 오늘의 의원을 둘러보세요. 두 손가락으로 확대할 수 있어요');
}
function endPreview() { preview.on = false; $('#preview-bar').classList.add('hidden'); }
$('#btn-brief-look').addEventListener('click', startPreview);
$('#pv-back').addEventListener('click', () => { endPreview(); $('#screen-brief').classList.remove('hidden'); });
$('#pv-go').addEventListener('click', () => { endPreview(); $('#btn-brief-go').click(); });
function openBrief() {
  if (!briefDoc || briefDoc._day !== save.day) briefDoc = { ...pickDoctor(), _day: save.day };
  const rank = RANKS[save.rank];
  $('#brief-eyebrow').textContent = `DAY ${save.day} · ${rank.name} · 시급 ${won(rank.wage)}`;
  $('#brief-title').textContent = save.day === 1 ? '첫 출근 · 작전을 세워 보세요' : '출근 전 작전 회의';
  const juniors = juniorsFor(save.day);
  const mx = maxStat();
  const bar = (label, v, c) => `<div>${label} ${v}/${mx}<b><i style="width:${v / mx * 100}%;background:${c}"></i></b></div>`;
  $('#brief-body').innerHTML = `<div class="brief-grid">
    <div class="brief-item"><span class="bi">${icon('stetho')}</span><div><b>${briefDoc.name}<span class="tag ${briefDoc.good ? 'good' : ''}">${briefDoc.trait}</span></b><p>${briefDoc.desc}</p></div></div>
    <div class="brief-item"><span class="bi">${icon('megaphone')}</span><div><b>한 팀장과 함께 근무</b><p>같이 환자를 보면서 중간중간 지시를 내려요. 원장님 앞에선 싹싹, 나에겐 모질어요.</p></div></div>
    <div class="brief-item"><span class="bi">${icon('users')}</span><div><b>후배 ${juniors.length}명</b><p>${juniors.length ? juniors.map((m) => m.name).join(', ') : '아직 후배가 없어요. 팀장님과 둘이서 버텨야 해요.'}${juniors.some((m) => m.from === save.day) ? ' · <b>오늘 입사!</b>' : ''}</p></div></div>
    <div class="brief-item"><span class="bi">${icon('battery')}</span><div><b>컨디션 · ${HOMES[save.home].name}에서 출근</b><div class="bars2">${bar('체력', Math.round(save.stamina), '#1fb39a')}${bar('멘탈', Math.round(save.mental), '#f06292')}</div></div></div>
    <div class="plan"><h4>${icon('sparkle')}추천 작전</h4><p>${DOC_PLAN[briefDoc.id]}</p></div>
    <div class="brief-mates"><b>${icon('users')}동료 업무 미리 지정</b>
      <div class="mate-row locked"><span class="mate-name">${LEAD_DEF.name}</span><span class="lock-tag">상사 · 지정 불가</span></div>
      ${juniors.map((m, i) => `<div class="mate-row"><span class="mate-name">${m.name}</span><div class="focus-seg">${Object.entries(FOCUS).map(([k, v]) => `<button data-bmate="${i}" data-bfocus="${k}" class="${(save.focus[i] || 'auto') === k ? 'on' : ''}">${v}</button>`).join('')}</div></div>`).join('')}
    </div>
  </div>`;
  renderBriefMap(briefDoc);
  setBriefTab('today');
  $('#screen-brief').classList.remove('hidden');
}
$('#btn-brief-go').addEventListener('click', () => {
  $('#screen-brief').classList.add('hidden');
  newDay(briefDoc);
  updateChocoBtn();
});
$('#btn-evening').addEventListener('click', openEvening);
$('#btn-sleep').addEventListener('click', sleepAndNext);

// ================= 화면 전환 =================
function pause(on) {
  if (!S || S.ended || S.modal) return;
  S.paused = on;
  $('#screen-pause').classList.toggle('hidden', !on);
}
function refreshStartButton() { $('#btn-start').textContent = save.day > 1 ? `DAY ${save.day} 출근하기` : '출근하기'; }
function goToWork() {
  $('#screen-start').classList.add('hidden'); $('#screen-tutask').classList.add('hidden');
  briefDoc = { ...pickDoctor(), _day: save.day };
  playStory(briefDoc, openBrief);
}
$('#btn-start').addEventListener('click', () => {
  if (!save.tutDone && save.day === 1) { $('#screen-start').classList.add('hidden'); $('#screen-tutask').classList.remove('hidden'); return; }
  goToWork();
});
$('#btn-tut-yes').addEventListener('click', () => startTutorial());
$('#btn-tut-no').addEventListener('click', () => { save.tutDone = true; persist(); goToWork(); });
$('#btn-reset').addEventListener('click', () => {
  if (!confirm('저장된 진행 상황(돈, 집, 승진, 날짜)을 모두 지울까요?')) return;
  save = defaultSave(); persist(); refreshStartButton(); updateChocoBtn();
});
$('#btn-pause').addEventListener('click', () => pause(true));
$('#btn-resume').addEventListener('click', () => pause(false));
$('#btn-quit').addEventListener('click', () => {
  S.ended = true; persist();
  $('#screen-pause').classList.add('hidden');
  refreshStartButton();
  $('#screen-start').classList.remove('hidden');
});
let helpPaused = false;
function openHelp(tab = 'basic') {
  if (S && !S.ended && !S.paused && !S.modal) { S.paused = true; helpPaused = true; }
  setHelpTab(tab);
  $('#screen-help').classList.remove('hidden');
}
function setHelpTab(tab) {
  document.querySelectorAll('#help-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  document.querySelectorAll('.tab-body').forEach((b) => b.classList.toggle('hidden', b.dataset.tab !== tab));
}
$('#help-tabs').addEventListener('click', (e) => { const b = e.target.closest('button[data-tab]'); if (b) setHelpTab(b.dataset.tab); });
$('#btn-help').addEventListener('click', () => openHelp());
$('#btn-howto').addEventListener('click', () => startTutorial());
$('#btn-help2').addEventListener('click', () => { $('#screen-pause').classList.add('hidden'); helpPaused = false; openHelp(); });
$('#btn-help-close').addEventListener('click', () => {
  $('#screen-help').classList.add('hidden');
  if (helpPaused && S) { S.paused = false; helpPaused = false; }
  else if (S && S.paused && !S.ended) $('#screen-pause').classList.remove('hidden');
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(true); });

// 타이틀 뒤 배경
placeDoctor(DOCTORS[0].look);
player.ch.g.position.set(DESK_SLOTS[0].spot.x, 0, DESK_SLOTS[0].spot.z);
player.ovNode.style.display = 'none';
refreshStartButton();
updateChocoBtn();
fitCamera();
requestAnimationFrame(frame);

// ================= 의료지식 퀴즈 =================
const QUIZ = [
  { q: '성인의 정상 호흡수(분당)는?', o: ['12~20회', '6~10회', '25~35회', '40~60회'], a: 0, e: '성인 안정 시 호흡수는 분당 <b>12~20회</b>가 정상 범위예요.' },
  { q: '성인의 정상 맥박수(분당)는?', o: ['60~100회', '40~50회', '110~130회', '140~160회'], a: 0, e: '성인 안정 시 맥박은 분당 <b>60~100회</b>가 정상이에요.' },
  { q: '근육주사(IM)의 바늘 삽입 각도는?', o: ['90°', '10~15°', '45°', '5°'], a: 0, e: '근육주사 <b>90°</b>, 피하주사 45~90°, 피내주사 10~15°예요.' },
  { q: '피내주사(ID)의 바늘 삽입 각도는?', o: ['10~15°', '45°', '90°', '60°'], a: 0, e: '피내주사는 피부 바로 아래로 <b>10~15°</b>로 얕게 넣어요.' },
  { q: '투약의 기본 원칙(5 Right)에 포함되지 않는 것은?', o: ['정확한 가격', '정확한 환자', '정확한 약물', '정확한 시간'], a: 0, e: '5 Right는 <b>환자·약물·용량·경로·시간</b>이에요.' },
  { q: '생리식염수(Normal saline)의 NaCl 농도는?', o: ['0.9%', '0.45%', '3%', '5%'], a: 0, e: '생리식염수는 <b>0.9%</b> NaCl 등장액이에요.' },
  { q: '일반적으로 저혈당으로 보는 혈당 기준은?', o: ['70 mg/dL 미만', '100 mg/dL 미만', '126 mg/dL 이상', '200 mg/dL 이상'], a: 0, e: '혈당 <b>70 mg/dL 미만</b>이면 저혈당으로 보고 바로 대처해요.' },
  { q: '당뇨병 진단 기준이 되는 공복 혈당은?', o: ['126 mg/dL 이상', '100 mg/dL 이상', '110 mg/dL 이상', '90 mg/dL 이상'], a: 0, e: '8시간 이상 공복 혈당 <b>126 mg/dL 이상</b>이면 당뇨병 진단 기준이에요.' },
  { q: '아나필락시스 응급 시 1차로 투여하는 약물은?', o: ['에피네프린', '아세트아미노펜', '인슐린', '헤파린'], a: 0, e: '아나필락시스의 1차 약물은 <b>에피네프린</b> 근육주사예요.' },
  { q: '일반 혈액검사(CBC)용 EDTA 채혈 튜브의 뚜껑 색은?', o: ['보라색', '노란색', '빨간색', '하늘색'], a: 0, e: 'EDTA 튜브는 <b>보라색</b> 캡. 하늘색은 응고검사용 구연산나트륨 튜브예요.' },
  { q: '채혈 시 토니켓(지혈대)은 보통 얼마 이내로 묶어야 할까요?', o: ['1분 이내', '5분', '10분', '30분'], a: 0, e: '토니켓은 <b>1분 이내</b>로. 오래 묶으면 검사 결과가 왜곡될 수 있어요.' },
  { q: '정상 산소포화도(SpO₂) 범위로 가장 적절한 것은?', o: ['95~100%', '85~90%', '75~80%', '60~70%'], a: 0, e: '건강한 성인의 SpO₂는 보통 <b>95~100%</b>예요.' },
  { q: '인슐린의 일반적인 투여 경로는?', o: ['피하주사', '근육주사', '피내주사', '경구 복용'], a: 0, e: '인슐린은 보통 <b>피하주사</b>로 투여해요.' },
  { q: '진료실 혈압 기준, 고혈압 진단 기준은?', o: ['140/90 mmHg 이상', '120/80 mmHg 이상', '110/70 mmHg 이상', '160/110 mmHg 이상'], a: 0, e: '진료실 혈압 <b>140/90 mmHg 이상</b>이면 고혈압으로 진단해요.' },
  { q: '알코올 손소독제로 손 위생을 할 때 권장 시간은?', o: ['20~30초', '3~5초', '2분', '5분'], a: 0, e: 'WHO 권고: 알코올 손소독 <b>20~30초</b>, 물과 비누는 40~60초.' },
  { q: '성인의 정상 체온(구강)으로 가장 적절한 것은?', o: ['36.5℃', '35.0℃', '38.5℃', '39.5℃'], a: 0, e: '구강 체온은 보통 <b>36.5℃</b> 안팎이 정상이에요.' },
];
const quiz = { open: false, cb: null, ans: -1, timer: null, used: [] };
function openQuiz(who, cb) {
  let pool = QUIZ.map((_, i) => i).filter((i) => !quiz.used.includes(i));
  if (!pool.length) { quiz.used = []; pool = QUIZ.map((_, i) => i); }
  const qi = pick(pool); quiz.used.push(qi);
  const Q = QUIZ[qi];
  const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
  quiz.open = true; quiz.cb = cb; quiz.ans = order.indexOf(Q.a); quiz.result = null;
  if (S && !S.ended) S.modal = true;
  $('#quiz-who').textContent = who;
  $('#quiz-q').textContent = Q.q;
  $('#quiz-opts').innerHTML = order.map((oi, k) => `<button data-k="${k}">${['①', '②', '③', '④'][k]} ${Q.o[oi]}</button>`).join('');
  const exp = $('#quiz-exp'); exp.innerHTML = Q.e; exp.classList.add('hidden');
  $('#quiz-ok').classList.add('hidden');
  $('#screen-quiz').classList.remove('hidden');
  let left = 10;
  const bar = $('#quiz-timer');
  bar.style.transform = 'scaleX(1)';
  clearInterval(quiz.timer);
  quiz.timer = setInterval(() => { left -= 0.05; bar.style.transform = `scaleX(${Math.max(0, left / 10)})`; if (left <= 0) answerQuiz(-1); }, 50);
}
function answerQuiz(k) {
  if (quiz.result !== undefined && quiz.result !== null) return;
  clearInterval(quiz.timer);
  quiz.result = k === quiz.ans;
  $('#quiz-opts').querySelectorAll('button').forEach((b, i) => { b.disabled = true; if (i === quiz.ans) b.classList.add('ok'); else if (i === k) b.classList.add('bad'); });
  if (k === -1) $('#quiz-who').textContent = '시간 초과!';
  $('#quiz-exp').classList.remove('hidden');
  $('#quiz-ok').classList.remove('hidden');
}
$('#quiz-opts').addEventListener('click', (e) => { const b = e.target.closest('button[data-k]'); if (b && quiz.open) answerQuiz(+b.dataset.k); });
$('#quiz-ok').addEventListener('click', () => {
  const ok = quiz.result, cb = quiz.cb;
  quiz.open = false; quiz.result = null; quiz.cb = null;
  $('#screen-quiz').classList.add('hidden');
  if (S && !S.ended) S.modal = false;
  if (cb) cb(ok);
});

// ================= 스토리 디오라마 =================
const CS = { active: false, renderer: null, scene: null, camera: null, cast: {}, steps: [], i: -1, typing: null, wait: 0, done: null, t: 0, speaker: null };
const WHO = {
  boss: { name: '최원장', color: '#c9a227' }, lead: { name: '한 팀장', color: '#2d3e66' }, me: { name: '나', color: '#ff6257' },
  park: { name: '박 선생', color: '#4a90d9' }, lee: { name: '이 선생', color: '#e84393' }, sub: { name: '', color: '#3b6fb6' },
  friend: { name: '수진 (친구)', color: '#8b6cf0' },
};
// ---- 음성 (Web Speech API) ----
const VOICE = { boss: [0.72, 0.92], sub: [0.85, 0.95], lead: [1.12, 1.0], me: [1.3, 0.95], park: [1.45, 1.02], lee: [1.2, 0.92], friend: [1.4, 1.05], narr: [1.0, 0.9] };
let koVoice = null;
function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  const vs = speechSynthesis.getVoices().filter((v) => /^ko/i.test(v.lang));
  koVoice = vs.find((v) => /yuna|sora|heami|google/i.test(v.name)) || vs[0] || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function speakLine(who, text, onEnd) {
  if (save.muted || !('speechSynthesis' in window)) { onEnd && onEnd(false); return; }
  speechSynthesis.cancel();
  let t = text.replace(/\([^)]*\)\s*/g, '').trim();          // 지문 (정색하며) 제거
  if (!t) t = text.replace(/[()]/g, '');                    // 속마음 대사는 괄호만 벗겨 읽기
  t = t.replace(/[“”]/g, '').replace(/…/g, ', ').replace(/~/g, '');
  const u = new SpeechSynthesisUtterance(t);
  u.lang = 'ko-KR'; if (koVoice) u.voice = koVoice;
  const [pitch, rate] = VOICE[who] || VOICE.narr;
  u.pitch = pitch; u.rate = rate;
  let fired = false;
  const fin = () => { if (!fired) { fired = true; onEnd && onEnd(true); } };
  u.onend = fin; u.onerror = fin;
  speechSynthesis.speak(u);
  try { speechSynthesis.resume(); } catch (_) {}
  CS.voiceTried = true;
}
function renderMute() {
  const b = $('#cs-mute');
  b.innerHTML = icon(save.muted ? 'mute' : 'volume');
  b.classList.toggle('off', save.muted);
}
$('#cs-mute').addEventListener('click', (e) => {
  e.stopPropagation();
  save.muted = !save.muted; persist(); renderMute();
  if (save.muted && 'speechSynthesis' in window) speechSynthesis.cancel();
  else if (CS.active && CS.cur) speakLine(CS.cur.who, CS.cur.text, () => { CS.spoken = true; });
});
renderMute();
function csInit() {
  if (CS.renderer) return;
  CS.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  CS.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  CS.renderer.shadowMap.enabled = true;
  CS.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  $('#cs-stage').appendChild(CS.renderer.domElement);
  CS.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  const resize = () => { const w = innerWidth, h = innerHeight; CS.renderer.setSize(w, h, false); CS.camera.aspect = w / h; CS.camera.updateProjectionMatrix(); };
  addEventListener('resize', resize); resize();
}
function buildDiorama(set) {
  if (set === 'room' || set === 'pocha') return buildNightSet(set);
  const sc = new THREE.Scene();
  sc.add(new THREE.HemisphereLight(0xffffff, 0x9fc9be, 1.4));
  const key = new THREE.DirectionalLight(0xfff3e0, 1.9);
  key.position.set(4, 8, 6); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 });
  sc.add(key);
  const base = cyl(4.4, 4.6, 0.5, '#c9a37a', 0, -0.26, 0, sc, 48);
  base.receiveShadow = true;
  cyl(4.2, 4.2, 0.04, set === 'interview' ? '#dff1ec' : '#f6ecd6', 0, 0.01, 0, sc, 48).receiveShadow = true;
  box(6.2, 2.6, 0.18, '#f7faf9', 0, 1.3, -2.7, sc);
  const sideWall = box(0.18, 2.6, 4.6, '#eef4f2', -3.0, 1.3, -0.4, sc);
  sideWall.rotation.y = 0.12;
  box(1.8, 1.1, 0.06, '#bfe3f0', 1.2, 1.6, -2.6, sc, { emissive: '#bfe3f0', emissiveIntensity: 0.25 });
  box(1.95, 0.08, 0.1, '#ffffff', 1.2, 2.18, -2.58, sc); box(1.95, 0.08, 0.1, '#ffffff', 1.2, 1.02, -2.58, sc);
  box(1.6, 0.42, 0.06, '#2bb5a0', -1.3, 2.05, -2.6, sc);
  box(0.16, 0.16, 0.07, '#ffffff', -2.0, 2.05, -2.56, sc);
  const clockG = cyl(0.22, 0.22, 0.05, '#ffffff', -0.4, 2.0, -2.58, sc, 24); clockG.rotation.x = Math.PI / 2;
  const pl = { x: 2.6, z: -1.9 };
  cyl(0.24, 0.18, 0.4, '#c98b5a', pl.x, 0.2, pl.z, sc, 12); sph(0.38, '#5cb874', pl.x, 0.7, pl.z, sc); sph(0.26, '#4aa863', pl.x + 0.15, 0.95, pl.z, sc);
  if (set === 'interview' || set === 'meeting') {
    box(2.0, 0.75, 0.9, '#c99a6b', 0, 0.375, 0, sc);
    box(0.5, 0.36, 0.05, '#2d3436', -0.4, 0.96, -0.2, sc);
    box(0.5, 0.04, 0.35, '#ffffff', 0.35, 0.77, 0.05, sc); // 이력서
    if (set === 'meeting') {
      box(1.6, 1.0, 0.05, '#ffffff', -1.3, 1.5, -2.58, sc);
      const ln = box(1.2, 0.05, 0.02, '#e84393', -1.3, 1.45, -2.54, sc); ln.rotation.z = -0.35;
    }
  } else {
    box(3.2, 1.0, 0.6, '#e6c48f', 0, 0.5, -1.0, sc);
    box(3.3, 0.06, 0.75, '#fff7e8', 0, 1.03, -1.0, sc);
    box(0.5, 0.36, 0.05, '#2d3436', -0.6, 1.25, -1.1, sc);
    box(0.45, 1.3, 0.4, '#2bb5a0', 2.3, 0.65, 0.3, sc);
  }
  return sc;
}
function buildNightSet(set) {
  const sc = new THREE.Scene();
  sc.add(new THREE.HemisphereLight(0xb8c6ff, 0x3a2a22, set === 'room' ? 0.75 : 0.9));
  const key = new THREE.DirectionalLight(0xffd9a0, 1.2);
  key.position.set(3, 7, 5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 });
  sc.add(key);
  const lamp = new THREE.PointLight(0xffc27a, 6, 7, 1.6);
  sc.add(lamp);
  cyl(4.4, 4.6, 0.5, '#5a4636', 0, -0.26, 0, sc, 48).receiveShadow = true;
  if (set === 'room') {
    const small = HOMES[save.home].max <= 100;
    cyl(4.2, 4.2, 0.04, '#d8b48a', 0, 0.01, 0, sc, 48).receiveShadow = true;
    box(6.2, 2.6, 0.18, small ? '#e8e2d6' : '#f4efe6', 0, 1.3, -2.7, sc);
    box(0.18, 2.6, 4.6, '#e2dbcd', -3.0, 1.3, -0.4, sc).rotation.y = 0.12;
    if (!small) { box(1.5, 1.0, 0.06, '#23395b', 1.4, 1.65, -2.6, sc, { emissive: '#1b2b4a', emissiveIntensity: 0.6 }); sph(0.09, '#fff6c2', 1.75, 1.95, -2.55, sc, { emissive: '#fff6c2', emissiveIntensity: 1 }); }
    box(1.3, 0.42, 2.2, '#ffffff', -1.6, 0.21, -1.0, sc); box(1.25, 0.12, 1.5, '#9ec9f0', -1.6, 0.48, -0.6, sc); box(0.8, 0.12, 0.4, '#ffffff', -1.6, 0.5, -1.85, sc);
    box(1.4, 0.75, 0.7, '#a07850', 1.3, 0.375, -1.8, sc);
    cyl(0.06, 0.12, 0.4, '#333333', 1.7, 0.95, -1.95, sc, 8);
    const shade = mesh(new THREE.ConeGeometry(0.22, 0.25, 14, 1, true), '#ffcf7a', { emissive: '#ffb347', emissiveIntensity: 0.9, side: THREE.DoubleSide });
    shade.position.set(1.7, 1.25, -1.95); sc.add(shade);
    lamp.position.set(1.6, 1.4, -1.6);
    box(0.5, 0.04, 0.35, '#ffffff', 1.1, 0.77, -1.75, sc);
    box(0.7, 0.9, 0.05, '#f2a65a', -0.2, 1.6, -2.6, sc); // 포스터
    box(0.45, 0.35, 0.3, '#7fd3c4', 2.4, 0.18, 0.4, sc); // 벗어 둔 스크럽 가방
  } else {
    cyl(4.2, 4.2, 0.04, '#8b6b4a', 0, 0.01, 0, sc, 48).receiveShadow = true;
    box(6.2, 2.6, 0.18, '#e85d3f', 0, 1.3, -2.7, sc, { transparent: true, opacity: 0.92 });
    box(0.18, 2.6, 4.6, '#d9502f', -3.0, 1.3, -0.4, sc, { transparent: true, opacity: 0.92 }).rotation.y = 0.12;
    cyl(0.9, 0.9, 0.08, '#c0c0c0', 0, 0.72, 0, sc, 24); cyl(0.08, 0.12, 0.7, '#777777', 0, 0.35, 0, sc, 8);
    cyl(0.35, 0.3, 0.08, '#e53935', -0.2, 0.8, 0.1, sc, 16); // 떡볶이
    for (const [x, c] of [[0.35, '#4caf50'], [0.55, '#4caf50']]) cyl(0.06, 0.07, 0.26, c, x, 0.89, -0.2, sc, 10); // 초록병
    sph(0.22, '#ffb347', 0, 2.2, -1.2, sc, { emissive: '#ff9a3c', emissiveIntensity: 1.2 });
    lamp.position.set(0, 2.0, -0.8);
    for (const x of [-1.1, 1.1]) cyl(0.25, 0.25, 0.45, '#3d6fb6', x, 0.23, 0.1, sc, 12);
  }
  return sc;
}
function eveningStory(r, choice) {
  const st = r.st, home = HOMES[save.home].name;
  const thoughts = [];
  if (st.rude >= 2) thoughts.push({ who: 'me', text: '(“여기 왜 이렇게 느려요!” …그 목소리가 아직도 귓가에 맴돈다.)' });
  if (st.taeum) thoughts.push({ who: 'me', text: '(“신규가 간이 크네.” …내가 그렇게 잘못했나.)' });
  if (st.quizBad) thoughts.push({ who: 'me', text: '(“그것도 몰라?” 얼굴이 화끈거렸다. 오늘은 책 좀 봐야겠다.)' });
  if (r.overtime + r.chartOT > 30) thoughts.push({ who: 'me', text: `(오늘도 공짜 야근 ${r.overtime + r.chartOT}분. 시급으로 치면… 아니다, 계산하지 말자.)` });
  if (!thoughts.length) thoughts.push({ who: 'me', text: '(오늘은 그럭저럭 버텼다. 나, 조금은 늘었나?)' });
  const meAt = (x, z, rot, pose = 'sit') => ({ k: 'me', x, z, rot, pose, look: 'home' });
  if (choice === 'report') return {
    title: `퇴근 후 · ${home} · 경위서`, set: 'room', cast: [meAt(1.25, -0.95, Math.PI)],
    steps: [
      { who: 'narr', text: '밤 11시. 책상 위에 경위서 양식이 놓여 있다.' },
      { who: 'me', text: '(“처방 확인 미흡으로 인하여…” 몇 번을 다시 써도 손이 떨린다.)' },
      { who: 'me', text: '(바빠서 그랬다고 쓰면… 안 되겠지.)' },
      ...thoughts.slice(0, 1),
      { who: 'narr', text: '새벽 1시. 결국 네 시간밖에 못 잤다.' },
    ],
  };
  if (choice === 'friend') return {
    title: '퇴근 후 · 포장마차', set: 'pocha', cast: [meAt(-1.1, 0.1, Math.PI / 2), { k: 'friend', x: 1.1, z: 0.1, rot: -Math.PI / 2, pose: 'sit' }],
    steps: [
      { who: 'friend', text: '야, 얼굴이 왜 이래? 오늘 무슨 일 있었어?' },
      { who: 'me', text: st.rude || st.taeum ? '환자한테 소리 듣고, 팀장님한테 혼나고… 그냥 다 그래.' : '그냥… 하루 종일 뛰어다녔어. 밥도 못 먹고.' },
      { who: 'friend', text: '간호사 다들 그렇다더라. 그래도 너 몸이 먼저야. 힘들면 그만둬도 돼.' },
      { who: 'me', text: '…그래도 아직은 버텨 볼래. 고맙다고 해 주는 할머니도 있었거든.' },
      { who: 'friend', text: '그래, 오늘 떡볶이는 내가 쏜다! 많이 먹어.' },
      { who: 'narr', text: '오랜만에 크게 웃었다. 마음이 조금 가벼워졌다.' },
    ],
  };
  if (choice === 'diary') return {
    title: `퇴근 후 · ${home} · 일기`, set: 'room', cast: [meAt(1.25, -0.95, Math.PI)],
    steps: [
      { who: 'narr', text: `DAY ${save.day}의 일기` },
      { who: 'me', text: `(오늘은 환자 ${st.served}명을 봤다.${st.angry ? ` 화나서 가신 분이 ${st.angry}명… 죄송했다.` : ' 화나서 간 사람은 없었다!'})` },
      ...thoughts.slice(0, 2),
      { who: 'me', text: '(그래도 내일은, 오늘보다 조금 더 잘할 수 있을 거야.)' },
      { who: 'narr', text: '일기장을 덮고 알람을 맞췄다. 06:50.' },
    ],
  };
  return {
    title: `퇴근 후 · ${home}`, set: 'room', cast: [meAt(-1.6, -0.6, 0)],
    steps: [
      { who: 'narr', text: `밤 9시. ${home}에 도착했다.` },
      { who: 'me', text: '(배달 앱을 열었다. 최소 주문 금액… 그래도 오늘은 시킨다.)' },
      ...thoughts.slice(0, 2),
      { who: 'me', text: '(내일은… 조금 덜 바빴으면.)' },
      { who: 'narr', text: '불을 끄자마자 잠이 들었다.' },
    ],
  };
}
function storyFor(doc) {
  const day = save.day;
  const sub = !doc.owner;
  const castBase = (extra = []) => [
    { k: 'boss', x: -1.3, z: 0.5, rot: 0.85 }, { k: 'lead', x: 0, z: -1.7, rot: 0 }, { k: 'me', x: 1.4, z: 0.6, rot: -0.85 }, ...extra,
  ];
  if (day === 1) return {
    title: 'STAGE 1 · 햇살내과의원 — 면접', set: 'interview',
    cast: [{ k: 'boss', x: -1.15, z: -0.05, rot: Math.PI / 2, pose: 'sit' }, { k: 'lead', x: -0.35, z: -1.35, rot: 0.25 }, { k: 'me', x: 1.15, z: 0.05, rot: -Math.PI / 2, pose: 'sit', look: 'interview' }],
    steps: [
      { who: 'narr', text: '동네 의원 「햇살내과의원」 · 면접 날 오후' },
      { who: 'boss', text: '간호사 면허 있고… 신규라고? 경력은 없네.' },
      { who: 'boss', text: '우리 병원은 환자가 곧 매출이야. 일은 빠릿빠릿하게 해야 돼.' },
      { who: 'lead', text: '원장님~ 요즘 신규들 다 이래요. 제가 잘 가르칠게요 호호.' },
      { who: 'boss', text: '그럼 하나만 물어볼까? 간호사면 이 정도는 알아야지.' },
      { quiz: 'boss', who: 'boss', ok: '흠, 기본은 되네. 합격.', bad: '…그것도 몰라? 뭐, 일하면서 배워. 사람이 급하니까.' },
      { who: 'lead', text: '(정색하며) 내일부터 바로 나올 수 있죠? 8시 반까지 와요. 인계 받아야 하니까.' },
      { who: 'me', text: '네…? 내, 내일부터요?' },
      { who: 'lead', text: '사람이 없어서 그래요. 시급은 원장님이 최저보다 더 쳐준대요.' },
      { who: 'boss', text: '그래, 내일 봐요. 아, 점심은… 바쁘면 좀 늦게 먹고. 하하.' },
      { who: 'narr', text: '그렇게 다음 날 아침 8시 30분, 첫 출근이 시작됐다.' },
    ],
  };
  const juniorsNow = juniorsFor(day);
  const jCast = juniorsNow.map((m, i) => ({ k: i === 0 ? 'park' : 'lee', x: 0.5 + i * 0.7, z: 1.4, rot: Math.PI - 0.2 }));
  if (sub) return {
    title: `DAY ${day} · 원장님 학회 가는 날`, set: 'station', cast: castBase(jCast), subDoc: doc,
    steps: [
      { who: 'narr', text: `오늘 최원장님은 학회. 대진으로 ${doc.name.replace('대진 ', '')}님이 오셨다.` },
      { who: 'sub', text: doc.kind ? '오늘 하루 잘 부탁해요~ 다들 무리하지 말고요.' : doc.id === 'fast' ? '빨리빨리 봅시다. 처방 바뀌면 바로 따라와요.' : doc.id === 'slow' ? '저는 한 분 한 분 자세히 보는 편이라… 대기가 좀 길어질 거예요.' : '아, 여기 간호사분들 다 젊네? 하하.' },
      { who: 'lead', text: '선생님~ 필요한 거 있으면 저한테 말씀만 하세요 호호.' },
      { who: 'lead', text: '(돌아서서) 김 선생, 대진 날이라고 느슨해지지 마요.' },
    ],
  };
  if (day === 2) return {
    title: 'DAY 2 · 아침 조회', set: 'station', cast: castBase(),
    steps: [
      { who: 'narr', text: '출근 이틀째, 08:30 아침 조회' },
      { who: 'lead', text: '어제 기록 봤어요. 신규라도 기록은 칼같이 해요.' },
      { who: 'boss', text: '오늘은 환자 좀 많이 받아 보자고. 점심은 30분이면 충분하지?' },
      { who: 'me', text: '(…어제도 점심 제대로 못 먹었는데)' },
      { who: 'lead', text: '네~ 원장님! 저희가 알아서 할게요 호호.' },
      { who: 'boss', text: '아 그리고 김 선생, 어제 하나 물어보려다 말았는데.' },
      { quiz: 'boss', who: 'boss', ok: '흠, 공부는 했나 보네.', bad: '하… 내일까지 찾아봐.' },
    ],
  };
  if (day === 3) return {
    title: 'DAY 3 · 새 얼굴', set: 'station', cast: castBase(jCast),
    steps: [
      { who: 'lead', text: '오늘부터 같이 일할 박 선생이에요. 인사해요.' },
      { who: 'park', text: '안녕하세요! 박지은입니다. 잘 부탁드립니다!' },
      { who: 'lead', text: '김 선생이 좀 가르쳐줘요. 나는 바쁘니까.' },
      { who: 'me', text: '(나도 이제 겨우 3일차인데…)' },
      { who: 'narr', text: '이제 후배에게 업무를 지정할 수 있어요.' },
    ],
  };
  if (day === 4) return {
    title: 'DAY 4 · 매출 회의', set: 'meeting', cast: [{ k: 'boss', x: -1.15, z: -0.05, rot: Math.PI / 2, pose: 'sit' }, { k: 'lead', x: -0.35, z: -1.35, rot: 0.25 }, { k: 'me', x: 1.3, z: 0.4, rot: -Math.PI / 2 }, ...jCast.map((c) => ({ ...c, x: 1.3, z: -0.7, rot: -Math.PI / 2 }))],
    steps: [
      { who: 'boss', text: '이번 달 매출이 영 별로야. 수액 많이 권해 봐. 회전율도 올리고.' },
      { who: 'lead', text: '네 원장님~ 애들한테 단단히 일러둘게요.' },
      { who: 'lead', text: '(작게) 들었죠? 오늘 한 명도 그냥 보내지 마요.' },
      { quiz: 'boss', who: 'boss', pre: '아 그리고 김 선생, 이거 알지?', ok: '오, 좀 늘었네?', bad: '아직도 몰라? 공부 좀 해.' },
    ],
  };
  if (day === 5) return {
    title: 'DAY 5 · 또 한 명', set: 'station', cast: castBase(jCast),
    steps: [
      { who: 'lead', text: '이 선생, 인사해요.' },
      { who: 'lee', text: '이수아입니다… 잘 부탁드립니다.' },
      { who: 'boss', text: '사람 늘었으니까 환자 더 받을 수 있지? 하하.' },
      { who: 'me', text: '(사람이 늘면… 일도 느는 거였구나)' },
    ],
  };
  const pool = [
    [{ who: 'boss', text: '옆 의원이 수액을 싸게 한다던데… 우리도 회전율 올려야 해.' }, { who: 'lead', text: '네 원장님~ 오늘은 더 빨리 돌릴게요.' }],
    [{ who: 'lead', text: '어제 화나서 간 환자 있었죠? 오늘은 그런 일 없게 해요.' }, { who: 'me', text: '네… 알겠습니다.' }],
    [{ who: 'boss', text: '토요일 진료도 해 볼까? …농담이야, 아직은.' }, { who: 'me', text: '(아직은…?)' }],
  ];
  const steps = [{ who: 'narr', text: `DAY ${day} · 아침 조회` }, ...pick(pool)];
  if (Math.random() < 0.5) steps.push({ who: 'boss', text: '아, 김 선생. 출근했으면 몸풀기로 하나 물어보자.' }, { quiz: 'boss', who: 'boss', ok: '오케이. 오늘도 그렇게만 해.', bad: '아침부터 이러면 곤란한데?' });
  else if (Math.random() < 0.5) steps.push({ who: 'lead', text: '자, 아침 퀴즈. 이것도 모르면 곤란해요.' }, { quiz: 'lead', who: 'lead', ok: '…맞았네요. 오늘도 그렇게 해요.', bad: '하… 기본부터 다시 봐요.' });
  return { title: `DAY ${day} · 아침 조회`, set: 'station', cast: castBase(jCast), steps };
}
function makeCastModel(k, c, doc) {
  if (k === 'boss') return makeDoctor(DOCTORS[0].look);
  if (k === 'sub') return makeDoctor(doc.look);
  if (k === 'lead') return makeLead();
  if (k === 'park') return makeNurse(MATE_DEFS[0].look);
  if (k === 'lee') return makeNurse(MATE_DEFS[1].look);
  if (k === 'friend') return makeChibi({ top: '#f2a65a', pants: '#3e4a5a', shoes: '#222222', hair: '#5a3b22', hairLen: 0.55, eyeSquash: 0.9, brows: '#5a3b22', browAngle: 0.1 });
  if (c.look === 'home') return makeChibi({ top: '#b8d8ff', sleeve: '#b8d8ff', pants: '#9ec2ef', shoes: '#f3f3f3', hair: '#3a2a22', hairLen: 0.52, eyeSquash: 0.4, brows: '#3a2a22', browAngle: -0.38 });
  if (c.look === 'interview') return makeChibi({ top: '#f4f4f4', pants: '#34405a', shoes: '#222222', hair: '#3a2a22', hairLen: 0.52, eyeSquash: 0.9, brows: '#3a2a22', browAngle: -0.2 });
  return makeNurse();
}
function playStory(doc, done) { playScene(storyFor(doc), done); }
function playScene(story, done) {
  if (!story) { done(); return; }
  csInit();
  CS.scene = buildDiorama(story.set);
  CS.cast = {};
  for (const c of story.cast) {
    const key = c.k === 'boss' && story.subDoc ? 'sub' : c.k;
    const ch = makeCastModel(key, c, story.subDoc);
    ch.g.position.set(c.x, 0, c.z);
    ch.g.rotation.y = c.rot;
    setPose(ch, c.pose || 'stand');
    if (c.pose === 'sit') chair(c.x - Math.sin(c.rot) * 0.12, c.z - Math.cos(c.rot) * 0.12, c.rot, '#7d8f8b', CS.scene);
    CS.scene.add(ch.g);
    CS.cast[key] = { ch, base: c.rot, enter: c.k === 'park' && save.day === 3 || c.k === 'lee' && save.day === 5 };
    if (CS.cast[key].enter) ch.g.position.x += 3.5;
    CS.cast[key].tx = c.x;
  }
  WHO.sub.name = story.subDoc ? story.subDoc.name : '';
  CS.steps = story.steps.slice();
  CS.i = -1; CS.t = 0; CS.done = done; CS.active = true; CS.speaker = null;
  $('#cs-title').textContent = story.title;
  if (!save.muted && !CS.hintShown) {
    CS.hintShown = true;
    const h = $('#cs-sound-hint'); h.classList.remove('hidden');
    setTimeout(() => h.classList.add('hidden'), 4500);
  }
  const root = $('#cutscene');
  root.classList.remove('hidden'); root.classList.add('intro');
  setTimeout(() => root.classList.remove('intro'), 60);
  csNext();
}
function csShow(who, text) {
  const box2 = $('#cs-box');
  box2.classList.toggle('narr', who === 'narr');
  const w = $('#cs-who');
  if (who === 'narr') { w.textContent = ''; } else { w.textContent = WHO[who].name; w.style.setProperty('--who', WHO[who].color); }
  CS.speaker = who === 'narr' ? null : who;
  CS.typing = { text, n: 0 };
  CS.cur = { who, text };
  $('#cs-text').textContent = '';
  CS.wait = 0;
  CS.spoken = save.muted || !('speechSynthesis' in window);
  CS.speakStart = performance.now();
  speakLine(who, text, () => { CS.spoken = true; });
}
function csNext() {
  if (quiz.open) return;
  CS.i++;
  if (CS.i >= CS.steps.length) { csEnd(); return; }
  const st = CS.steps[CS.i];
  if (st.quiz) {
    if (st.pre) { CS.steps.splice(CS.i, 0, { who: st.who, text: st.pre }); delete st.pre; csShow(st.who, CS.steps[CS.i].text); return; }
    CS.typing = null;
    openQuiz(st.quiz === 'boss' ? (save.day === 1 ? '최원장의 면접 질문' : '최원장의 아침 질문') : '한 팀장의 아침 퀴즈', (ok) => {
      if (ok) { save.mental = Math.min(maxStat(), save.mental + 3); save.evalPts += 5; } else { save.mental = Math.max(20, save.mental - 5); }
      persist();
      CS.steps.splice(CS.i + 1, 0, { who: st.who, text: ok ? st.ok : st.bad });
      csNext();
    });
    return;
  }
  csShow(st.who, st.text);
}
function csEnd() {
  if (!CS.active) return;
  CS.active = false;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  $('#cutscene').classList.add('hidden');
  const d = CS.done; CS.done = null;
  if (d) d();
}
$('#cutscene').addEventListener('click', (e) => {
  if (e.target.closest('#cs-skip')) { if (!quiz.open) csEnd(); return; }
  if (!CS.active || quiz.open) return;
  // iOS: 첫 탭에서 음성이 아직 안 나오면 현재 대사를 다시 읽어 음성을 깨움
  if (!save.muted && 'speechSynthesis' in window && !CS.unlocked) {
    CS.unlocked = true;
    if (!speechSynthesis.speaking && CS.cur) { speakLine(CS.cur.who, CS.cur.text, () => { CS.spoken = true; }); CS.speakStart = performance.now(); CS.spoken = false; return; }
  }
  if (CS.typing && CS.typing.n < CS.typing.text.length) { CS.typing.n = CS.typing.text.length; $('#cs-text').textContent = CS.typing.text; return; }
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  csNext();
});
function csFrame(dt, t) {
  CS.t += dt;
  if (CS.typing && !quiz.open) {
    const tp = CS.typing;
    if (tp.n < tp.text.length) { tp.n = Math.min(tp.text.length, tp.n + dt * 14); $('#cs-text').textContent = tp.text.slice(0, Math.floor(tp.n)); }
    else {
      CS.wait += dt;
      const readT = Math.max(3.2, tp.text.length * 0.12);           // 음소거일 때 읽는 시간
      const voiceDone = CS.spoken || (performance.now() - CS.speakStart) / 1000 > tp.text.length * 0.3 + 4; // 음성 안전장치
      if (save.muted ? CS.wait > readT : (voiceDone && CS.wait > 1.0)) csNext();
    }
  }
  // 캐릭터 연기
  const sp = CS.speaker && CS.cast[CS.speaker === 'boss' && CS.cast.sub ? 'sub' : CS.speaker];
  for (const [k, c] of Object.entries(CS.cast)) {
    const ch = c.ch;
    if (c.enter) {
      const dx = c.tx - ch.g.position.x;
      const moving = Math.abs(dx) > 0.02;
      if (moving) { ch.g.position.x += Math.sign(dx) * Math.min(Math.abs(dx), dt * 1.8); ch.g.rotation.y = -Math.PI / 2; } else ch.g.rotation.y += (c.base - ch.g.rotation.y) * Math.min(1, dt * 6);
      animateChibi(ch, dt, moving, t);
    } else animateChibi(ch, dt, false, t);
    if (sp && c === sp) {
      ch.head.rotation.x = Math.sin(t * 9) * 0.08;
      ch.arms[1].rotation.x = -0.8 + Math.sin(t * 6) * 0.35;
    } else {
      ch.head.rotation.x = 0;
      if (ch.pose !== 'sit') ch.arms[1].rotation.x *= 0.9;
      if (sp) {
        const dx2 = sp.ch.g.position.x - ch.g.position.x, dz2 = sp.ch.g.position.z - ch.g.position.z;
        let rel = Math.atan2(dx2, dz2) - ch.g.rotation.y;
        while (rel > Math.PI) rel -= Math.PI * 2; while (rel < -Math.PI) rel += Math.PI * 2;
        ch.head.rotation.y += (clamp(rel, -0.7, 0.7) - ch.head.rotation.y) * Math.min(1, dt * 4);
      }
    }
  }
  // 카메라: 천천히 돌며 다가가기 + 말하는 사람 쪽으로 살짝
  const k2 = Math.min(1, CS.t / 14);
  const port = CS.camera.aspect < 0.8 ? 1.5 : 1;
  const ang = -0.45 + k2 * 0.7, r = (8.6 - k2 * 1.4) * port, h = (4.4 - k2 * 0.6) * (port > 1 ? 1.25 : 1);
  const look = new THREE.Vector3(0, 0.95, 0);
  if (sp) look.lerp(new THREE.Vector3(sp.ch.g.position.x, 1.0, sp.ch.g.position.z), 0.35);
  CS.look = CS.look ? CS.look.lerp(look, Math.min(1, dt * 2.5)) : look;
  CS.camera.position.set(Math.sin(ang) * r, h, Math.cos(ang) * r);
  CS.camera.lookAt(CS.look);
  CS.renderer.render(CS.scene, CS.camera);
}

// ================= 인터랙티브 튜토리얼 =================
const TUT = { on: false, i: -1, steps: [], A: null, B: null };
const tA = () => TUT.A && S.patients.get(TUT.A.id);
const tB = () => TUT.B && S.patients.get(TUT.B.id);
const hasTask = (kind, pid) => (player.cur && player.cur.a.kind === kind && (pid === undefined || player.cur.a.pid === pid)) || player.queue.some((t) => t.kind === kind && (pid === undefined || t.pid === pid));
function tutSteps() {
  return [
    { text: '<b>햇살내과의원</b>에 온 걸 환영해요!<br>실제 화면에서 하나씩 따라 해 볼게요.', next: true },
    { enter: () => { TUT.A = spawnPatient('grandma', { name: '김순자' }); TUT.A.tutOrder = 'shot'; TUT.A.tutMed = 'shotA'; },
      text: '환자가 들어와 <b>번호표</b>를 뽑고 앉아요.<br>머리 위 <b>번호</b>를 탭해서 <b>접수</b>하세요.', target: () => tA() && tA().ov,
      wait: () => tA() && (hasTask('register', TUT.A.id) || !['arrive', 'wait'].includes(tA().state)) },
    { watch: true, text: '간호사가 데스크로 뛰어가 접수해요.<br>탭한 일은 아래 <b>할 일</b> 줄에 순서대로 쌓여요.', target: () => $('#queue'),
      wait: () => tA() && tA().state === 'examq' && !tA().busy },
    { watch: true, text: '접수한 순서대로 <b>원장님 진료</b>를 받아요.<br>잠깐 기다려 볼까요?', target: () => tA() && tA().ov, wait: () => tA() && tA().state === 'order' && !tA().path.length },
    { text: '진료 끝! 머리 위 <b>파란 주사</b> = <b>진통제</b> 처방이에요.<br><b>색깔이 곧 처방</b>이에요.', target: () => tA() && tA().ov, next: true },
    { text: '<b>약품장</b>을 탭해서 약을 챙기러 가요.', target: () => cabBtn, wait: () => sheetKind === 'cab' },
    { text: '처방과 같은 <b>진통제(파랑)</b>를 고르세요.', target: () => $('#sheet [data-med="shotA"]'), wait: () => hasTask('prep') || player.hands.includes('shotA') },
    { watch: true, enter: () => closeSheet('cab'), text: '챙긴 약은 <b>처치 트레이</b>에 담겨요.<br>손은 두 개뿐이라 꼭 필요한 것만!', target: () => $('#tray-slots'), wait: () => player.hands.includes('shotA') },
    { text: '이제 <b>주사실</b>에 앉은 환자를 탭하세요.', target: () => tA() && tA().ov, wait: () => sheetKind === 'pick' || (tA() && tA().state === 'pay') },
    { text: '<b>투약 확인!</b> 처방과 같은 색 약을 고르세요.<br>망설이면 첫 번째 약이 자동으로 쓰여요.', target: () => $('#sheet'), wait: () => tA() && tA().state === 'pay' },
    { text: '주사 완료! 처치가 끝난 환자는 다시 <b>접수·수납실</b>에 앉아요.<br>탭해서 <b>수납</b>하세요.', target: () => tA() && tA().ov, wait: () => !tA() },
    { enter: () => { TUT.B = spawnPatient('grandpa', { name: '박영수', state: 'order', order: 'heat' }); },
      text: '이번엔 <b>핫팩</b> 처방 환자예요.<br>준비물 없이 탭하면 <b>침대로 안내</b>하고 세팅해요.', target: () => tB() && tB().ov, wait: () => tB() && ['bed', 'beddone'].includes(tB().state) },
    { text: '핫팩이 끝나면 침대가 <b>빨갛게 깜빡</b>여요.<br>그때 탭해서 <b>정리</b>하세요.', target: () => tB() && tB().ov, wait: () => tB() && (tB().state === 'pay' || hasTask('unbed', TUT.B.id)) },
    { text: '정리한 환자도 <b>수납</b>까지 해야 끝!<br>환자를 탭하세요.', target: () => tB() && tB().ov, wait: () => !tB() },
    { text: '처치할 때마다 <b>기록</b>이 쌓여요.<br>왼쪽 <b>기록</b> 버튼으로 정리하세요. 안 하면 퇴근 후 무급 야근!', target: () => chartBtn, wait: () => S.charts === 0 },
    { enter: () => { S.directive = { kind: 'chore', label: '약품장 재고 정리 좀 해놔요', left: 999, max: 999 }; say(lead, '김 선생, 약품장 재고 정리 좀 해놔요.', 'lead', 3); },
      text: '팀장님·원장님 <b>지시</b>는 이 줄에 떠요.<br>탭하면 <b>할 일</b>로 내려가요.', target: () => $('#req-row'), wait: () => hasTask('chore') || !S.directive },
    { text: '내 몸 상태예요. <b>식사·화장실·체력·멘탈</b>이<br>바닥나면 느려지고 실수가 늘어요.', target: () => $('.vitals'), next: true },
    { text: '오른쪽 <b>화장실·간식</b>으로 회복하세요.<br>단, 팀장님 근처에서 쉬면 혼나요!', target: () => $('#rail-right'), next: true },
    { text: '두 손가락으로 <b>확대·이동</b>, <b>더블탭</b>으로도 확대돼요.<br>환자가 작을 땐 확대해서 탭하세요.', target: () => $('.zoom-ctl'), next: true },
    { text: '준비 끝! 이제 진짜 <b>첫 출근</b>을 해 볼까요?<br>모르는 건 언제든 상단 <b>?</b> 버튼에서 볼 수 있어요.', next: true, final: true },
  ];
}
function startTutorial() {
  $('#screen-start').classList.add('hidden'); $('#screen-tutask').classList.add('hidden'); $('#screen-help').classList.add('hidden');
  newDay({ ...DOCTORS[0], quiz: false, _day: 0 });
  S.tut = true;
  for (const m of mates) m.state = 'tut';
  el.toasts.innerHTML = '';
  TUT.on = true; TUT.i = -1; TUT.steps = tutSteps();
  $('#coach').classList.remove('hidden');
  tutNext();
}
function tutNext() {
  TUT.i++;
  const st = TUT.steps[TUT.i];
  if (!st) { endTutorial(false); return; }
  if (st.enter) st.enter();
  $('#coach-step').textContent = `${TUT.i + 1} / ${TUT.steps.length}`;
  $('#coach-text').innerHTML = st.text;
  const nb = $('#coach-next');
  nb.classList.toggle('hidden', !st.next);
  nb.textContent = st.final ? '출근하기' : '다음';
}
function endTutorial(goWork) {
  TUT.on = false;
  $('#coach').classList.add('hidden');
  closeSheet();
  if (S) { S.ended = true; clearDay(); }
  S = null;
  save.tutDone = true; persist();
  if (goWork) goToWork(); else { refreshStartButton(); $('#screen-start').classList.remove('hidden'); }
}
$('#coach-next').addEventListener('click', () => { const st = TUT.steps[TUT.i]; if (st && st.final) endTutorial(true); else tutNext(); });
$('#coach-skip').addEventListener('click', () => endTutorial(false));
function updateCoach() {
  if (!TUT.on || !S) return;
  const st = TUT.steps[TUT.i];
  if (!st) return;
  if (st.wait && !S.paused && st.wait()) { tutNext(); return; }
  const target = st.target && st.target();
  const hole = $('.coach-hole'), fin = $('.coach-finger'), card = $('.coach-card');
  const r = target && target.isConnected ? target.getBoundingClientRect() : null;
  if (r && r.width > 0) {
    const pad = 6;
    Object.assign(hole.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
    hole.classList.remove('none');
    fin.classList.toggle('hidden', !!(st.next || st.watch));
    fin.style.left = r.left + r.width / 2 + 'px'; fin.style.top = Math.min(innerHeight - 60, r.bottom + 8) + 'px';
    const lower = r.top + r.height / 2 > innerHeight * 0.5;
    card.classList.toggle('top', lower); card.classList.toggle('bottom', !lower);
  } else {
    hole.classList.add('none'); fin.classList.add('hidden');
    card.classList.remove('top'); card.classList.add('bottom');
  }
}

// 테스트용 훅
window.__game = {
  get S() { return S; }, player, get mates() { return mates; }, get lead() { return lead; }, enqueue, onPatientTap, freeBed: (k) => S && freeBed(k), phoneBtn, MEDS,
  get pickFn() { return pickFn; }, blood, openCabinet, quiz, CS, answerQuiz, TUT, tA, tB,
  focus(x, z, d = 6, y = 0.8) {
    if (x === undefined) { focusing = false; fitCamera(); ovEl.style.display = ''; return; }
    focusing = true;
    const look = new THREE.Vector3(x, y, z);
    camera.position.copy(look).addScaledVector(new THREE.Vector3(0, 0.6, 1).normalize(), d);
    camera.lookAt(look); camera.updateMatrixWorld();
    ovEl.style.display = 'none';
  },
  spots: { nurse: () => player.pos, doctor: () => ({ x: doctor.g.position.x, z: doctor.g.position.z }), lobby: () => R('desk', 0, 1), ward: () => R('ward', 0, 0), inject: () => R('inject', 0.5, 0), lead: () => lead.pos },
};
