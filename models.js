/* 3D 헬퍼 + 치비 캐릭터 모델 */
import * as THREE from 'three';

const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.82, ...opts }));
  return matCache.get(key);
}
export function mesh(geo, color, opts, shadow = true) {
  const m = new THREE.Mesh(geo, mat(color, opts));
  m.castShadow = shadow; m.receiveShadow = true;
  return m;
}
export function box(w, h, d, color, x, y, z, parent, opts) {
  const m = mesh(new THREE.BoxGeometry(w, h, d), color, opts);
  m.position.set(x, y, z);
  if (parent) parent.add(m);
  return m;
}
export function cyl(rt, rb, h, color, x, y, z, parent, seg = 14, opts) {
  const m = mesh(new THREE.CylinderGeometry(rt, rb, h, seg), color, opts);
  m.position.set(x, y, z);
  if (parent) parent.add(m);
  return m;
}
export function sph(r, color, x, y, z, parent, opts) {
  const m = mesh(new THREE.SphereGeometry(r, 14, 10), color, opts);
  m.position.set(x, y, z);
  if (parent) parent.add(m);
  return m;
}

export const CHAR_SCALE = 1.3;
const SKIN = '#f7d7bd';

export function makeChibi(o) {
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
  head.add(mesh(new THREE.SphereGeometry(0.27, 24, 18), o.skin || SKIN));
  const eyes = [-1, 1].map((s) => {
    const e = sph(0.034, '#2a2320', s * 0.095, 0, 0.245, head);
    e.scale.y = o.eyeSquash || 1; e.castShadow = false;
    return e;
  });
  if (o.blush !== false) for (const s of [-1, 1]) {
    const b = sph(0.045, '#ffb0a8', s * 0.155, -0.075, 0.215, head);
    b.scale.set(1, 0.55, 0.3); b.castShadow = false;
  }
  const mouth = box(0.06, 0.016, 0.01, o.mouth || '#8a4a3f', 0, -0.105, 0.262, head);
  mouth.castShadow = false;
  if (o.hair) {
    const cap = mesh(new THREE.SphereGeometry(0.29, 24, 16, 0, Math.PI * 2, 0, Math.PI * (o.hairLen || 0.52)), o.hair);
    cap.position.y = 0.02; cap.rotation.x = -0.32;
    head.add(cap);
  }
  if (o.brows) for (const s of [-1, 1]) {
    const br = box(0.085, 0.016, 0.01, o.brows, s * 0.1, 0.085, 0.255, head);
    br.rotation.z = s * (o.browAngle ?? -0.38); br.castShadow = false;
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

export function glasses(head, color = '#222222', square = false) {
  for (const s of [-1, 1]) {
    if (square) box(0.1, 0.07, 0.01, color, s * 0.095, 0.0, 0.262, head, { transparent: true, opacity: 0.85 });
    else { const r = mesh(new THREE.TorusGeometry(0.058, 0.012, 6, 16), color); r.position.set(s * 0.095, 0, 0.258); head.add(r); }
  }
  box(0.08, 0.012, 0.01, color, 0, 0.01, 0.262, head);
}

function addHeldSlots(n) {
  n.extras.held = [0, 1].map((i) => {
    const g = new THREE.Group();
    g.position.set(0, -0.3, 0.05);
    n.arms[i].add(g);
    return g;
  });
}

// --- 간호사: 플레이어(짠함) / 동료 ---
export function makeNurse(o = {}) {
  const hair = o.hair || '#3a2a22';
  const n = makeChibi({ top: o.top || '#7fd3c4', pants: o.pants || '#6cc5b5', shoes: '#f3f3f3', hair, eyeSquash: o.tired === false ? 0.75 : 0.42, hairLen: 0.5, brows: hair, browAngle: o.tired === false ? 0 : -0.38 });
  const h = n.head;
  if (o.style === 'pony') {
    const p = sph(0.1, hair, 0, 0.05, -0.3, h); p.scale.set(0.8, 1.6, 0.8);
  } else if (o.style === 'short') {
    for (const s of [-1, 1]) { const sd = sph(0.13, hair, s * 0.2, -0.04, -0.04, h); sd.scale.set(0.6, 1.1, 1); }
  } else {
    sph(0.12, hair, 0, 0.2, -0.2, h);
    for (const [rx, rz, len] of [[0.6, 0.5, 0.18], [-0.3, -0.7, 0.15], [0.9, -0.2, 0.13]]) {
      const st = cyl(0.012, 0.006, len, hair, 0, 0.26, -0.24, h, 4); st.rotation.set(rx, 0, rz);
    }
    const ahoge = cyl(0.012, 0.004, 0.2, hair, 0.03, 0.34, 0.05, h, 4); ahoge.rotation.set(0.5, 0, -0.4);
    for (const s of [-1, 1]) { const side = cyl(0.025, 0.012, 0.2, hair, s * 0.24, -0.06, 0.1, h, 5); side.rotation.z = s * 0.15; }
  }
  box(0.24, 0.07, 0.13, '#ffffff', 0, 0.28, 0.07, h);
  box(0.06, 0.016, 0.012, '#ff5b5b', 0, 0.29, 0.14, h);
  box(0.016, 0.05, 0.012, '#ff5b5b', 0, 0.29, 0.14, h);
  if (o.tired !== false) {
    for (const s of [-1, 1]) { const dc = sph(0.05, '#a38bbd', s * 0.095, -0.045, 0.236, h); dc.scale.set(1.2, 0.42, 0.25); dc.castShadow = false; }
    const band = box(0.09, 0.035, 0.012, '#f0c08c', 0.16, -0.035, 0.225, h); band.rotation.set(0, 0.5, 0.45);
    n.mouth.scale.set(0.7, 1, 1);
  }
  box(0.09, 0.05, 0.01, '#ffffff', -0.08, 0.5, 0.19, n.body);
  cyl(0.01, 0.01, 0.1, '#3b6fb6', 0.09, 0.52, 0.19, n.body, 4);
  const sweat = new THREE.Group();
  sph(0.035, '#8fd3ff', 0, 0, 0, sweat, { transparent: true, opacity: 0.9 });
  const tip = mesh(new THREE.ConeGeometry(0.034, 0.06, 8), '#8fd3ff', { transparent: true, opacity: 0.9 });
  tip.position.y = 0.04; sweat.add(tip);
  sweat.position.set(-0.26, 0.1, 0.12); sweat.visible = false;
  h.add(sweat);
  n.extras.sweat = sweat;
  addHeldSlots(n);
  return n;
}

// --- 간호실장: 원장님께는 싹싹, 아랫사람에겐 모진 ---
export function makeLead() {
  const l = makeChibi({ top: '#2d3e66', sleeve: '#2d3e66', pants: '#f0f0f0', shoes: '#222222', hair: '#1d1715', hairLen: 0.56, eyeSquash: 0.55, brows: '#1d1715', browAngle: 0.3, mouth: '#c0392b' });
  for (const s of [-1, 1]) { const b = sph(0.15, '#1d1715', s * 0.2, -0.08, -0.03, l.head); b.scale.set(0.55, 1.2, 1); }
  glasses(l.head, '#7a1f3d');
  box(0.2, 0.32, 0.02, '#ffffff', 0, 0.42, 0.205, l.body); // 안에 받친 흰 블라우스
  box(0.09, 0.05, 0.01, '#ffd166', -0.08, 0.52, 0.215, l.body); // 금색 명찰
  sph(0.035, '#ffffff', 0, -0.3, 0.06, l.arms[1]); // 볼펜 든 손
  box(0.18, 0.24, 0.02, '#c8a165', 0, -0.33, 0.08, l.arms[0]); // 클립보드
  return l;
}

// --- 의사 (성향별 외형) ---
export function makeDoctor(look = {}) {
  const d = makeChibi({ top: '#fafafa', pants: look.pants || '#4a4f5a', shoes: '#3a2a22', hair: look.hair || '#a9a9a9', hairLen: look.hairLen || 0.36, eyeSquash: look.eyes || 0.8 });
  if (look.glasses !== false) glasses(d.head, look.glassColor || '#333333', !!look.square);
  box(0.05, 0.2, 0.02, look.tie || '#3b6fb6', 0, 0.47, 0.19, d.body);
  const st = mesh(new THREE.TorusGeometry(0.15, 0.014, 6, 20, Math.PI * 1.2), '#2f3640');
  st.position.set(0, 0.6, 0.06); st.rotation.set(Math.PI / 2 + 0.3, 0, Math.PI * 0.9);
  d.body.add(st);
  if (look.sides) for (const s of [-1, 1]) { const sh = sph(0.09, look.hair, s * 0.24, 0.0, -0.02, d.head); sh.scale.set(0.6, 1, 1); }
  if (look.mustache) { const m = box(0.12, 0.03, 0.02, '#8a8a8a', 0, -0.07, 0.262, d.head); m.castShadow = false; }
  if (look.smile) d.mouth.scale.set(1.5, 1, 1);
  return d;
}

// --- 환자 ---
const NORMAL_LOOKS = [['#4fb37a', '#3b2a1a'], ['#e0a64f', '#2b2b2b'], ['#7c8cf0', '#5a3b22'], ['#e87fa5', '#2b2b2b']];
export function makePatientModel(type, rnd) {
  let c;
  switch (type) {
    case 'grandma': {
      c = makeChibi({ top: '#b48ad6', pants: '#6b5a7a', scale: 0.92, eyeSquash: 0.35 });
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        sph(0.1, '#cfc8dc', Math.cos(a) * 0.19, 0.17 + (i % 2) * 0.04, Math.sin(a) * 0.17 - 0.04, c.head);
      }
      sph(0.15, '#cfc8dc', 0, 0.25, -0.03, c.head);
      const cane = cyl(0.02, 0.02, 0.62, '#8b5a2b', 0, -0.3, 0.06, c.arms[1], 6); cane.rotation.x = 0.1;
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
      const [top, hair] = NORMAL_LOOKS[Math.floor(rnd * NORMAL_LOOKS.length)];
      c = makeChibi({ top, pants: '#3e4a5a', hair, hairLen: 0.5, eyeSquash: 0.8 });
      const m = box(0.3, 0.14, 0.05, '#f4f7f8', 0, -0.085, 0.235, c.head); m.castShadow = false;
      break;
    }
  }
  return c;
}

export function heldItemMesh(color) {
  const g = new THREE.Group();
  box(0.15, 0.2, 0.05, color, 0, 0, 0.06, g, { transparent: true, opacity: 0.9 });
  return g;
}

export function setPose(ch, pose) {
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

export function animateChibi(ch, dt, moving, t, run = false) {
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
