/* 직접 그린 라인 아이콘 세트 (24×24, stroke = currentColor) */
const F = 'fill="currentColor" stroke="none"';

export const ICONS = {
  // 주사기: 대각선, 눈금 + 플런저 + 바늘
  syringe: `<g transform="rotate(45 12 12)">
    <rect x="9.5" y="5.5" width="5" height="11" rx="1.2"/>
    <path d="M12 16.5v5.5"/><path d="M12 2v3.5"/><path d="M9.5 2h5"/>
    <path d="M9.5 9h2.3M9.5 12h2.3"/></g>`,
  // 수액 백: 걸이 + 백 + 수위 + 줄
  iv: `<path d="M12 1.8v2"/><path d="M9 3.8h6"/>
    <path d="M7 6.2a2.4 2.4 0 0 1 2.4-2.4h5.2A2.4 2.4 0 0 1 17 6.2V13a5 5 0 0 1-10 0z"/>
    <path d="M7.2 10.5h9.6" opacity=".55"/><path d="M10 13.5h4" opacity=".55"/>
    <path d="M12 18v4.2"/>`,
  // 변기
  toilet: `<rect x="6.5" y="2.5" width="9" height="5.5" rx="1.4"/>
    <path d="M4 10h15v.6a6.6 6.6 0 0 1-6.6 6.6h-1.8A6.6 6.6 0 0 1 4 10.6z"/>
    <path d="M8.5 17.2 7.8 21.5h7.4l-.7-4.3"/>`,
  // 삼각김밥
  onigiri: `<path d="M12 3.2c-1 0-1.8.6-2.3 1.4L3.9 15.1c-.9 1.8.4 3.9 2.4 3.9h11.4c2 0 3.3-2.1 2.4-3.9L14.3 4.6c-.5-.8-1.3-1.4-2.3-1.4z"/>
    <rect x="9" y="12.6" width="6" height="6.4" rx=".6" ${F}/>`,
  // 밥그릇 + 젓가락 (식사 게이지)
  bowl: `<path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0z"/><path d="M9 20h6"/>
    <path d="M13.5 2.5 17 10"/><path d="M17.5 2.5 19.5 10"/>
    <path d="M7.5 8.5c0-1 .8-1.3.8-2.3s-.8-1.3-.8-2.3" opacity=".6"/>`,
  // 배터리 + 번개 (체력)
  battery: `<rect x="2.5" y="7" width="17" height="10" rx="2.6"/><path d="M22 10.5v3"/>
    <path d="M11.8 8.8 8.6 12.6h3l-.8 2.8 3.4-4h-3z" ${F}/>`,
  phone: `<path d="M21 16.4v2.8a1.9 1.9 0 0 1-2.1 1.9 18.8 18.8 0 0 1-8.2-2.9 18.5 18.5 0 0 1-5.7-5.7A18.8 18.8 0 0 1 2.1 4.2 1.9 1.9 0 0 1 4 2.1h2.8a1.9 1.9 0 0 1 1.9 1.6c.1.9.4 1.8.7 2.7a1.9 1.9 0 0 1-.4 2L7.8 9.6a15.2 15.2 0 0 0 5.7 5.7l1.2-1.2a1.9 1.9 0 0 1 2-.4c.9.3 1.8.6 2.7.7a1.9 1.9 0 0 1 1.6 1.9z"/>`,
  stetho: `<path d="M5 2.5v5a4.5 4.5 0 0 0 9 0v-5"/><path d="M9.5 12v2.5a5.5 5.5 0 0 0 11 0V12"/><circle cx="20.5" cy="10" r="2"/>`,
  flame: `<path d="M12 2.5c.8 3 4.8 5.2 4.8 10a4.8 4.8 0 0 1-9.6 0c0-2.4 1.3-3.8 1.3-3.8.2 1.6 1.1 2.6 2.2 2.6 0-3.4-1.4-5.4 1.3-8.8z"/>`,
  bell: `<path d="M18 8.5a6 6 0 0 0-12 0c0 7-3 8.5-3 8.5h18s-3-1.5-3-8.5"/><path d="M13.7 20.5a2 2 0 0 1-3.4 0"/>`,
  doc: `<path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8z"/><path d="M14 2.5V8h5.5"/><path d="M8.5 13h7M8.5 16.5h5"/>`,
  card: `<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 9.5h19"/><path d="M6 15h4"/>`,
  heartPulse: `<path d="M20.4 5.1a5.2 5.2 0 0 0-7.4 0L12 6.2l-1-1.1a5.2 5.2 0 0 0-7.4 7.4l1 1L12 21l7.4-7.5 1-1a5.2 5.2 0 0 0 0-7.4z"/><path d="M3.5 12h4l1.8-2.6 2.7 5 1.8-2.4h6.7"/>`,
  ambulance: `<path d="M2.5 16.5V7.5a1 1 0 0 1 1-1h10v10"/><path d="M13.5 9.5h4l3.5 4v3h-2"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/><path d="M8 9v4M6 11h4"/><path d="M13.5 16.5H9"/>`,
  coin: `<circle cx="12" cy="12" r="9.2" ${F} opacity=".18"/><circle cx="12" cy="12" r="9.2"/><path d="M8 8.5l1.6 7 2.4-5 2.4 5 1.6-7"/><path d="M7.3 11.2h9.4"/>`,
  star: `<path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" ${F}/>`,
  pause: `<rect x="6.5" y="5" width="3.6" height="14" rx="1.2" ${F}/><rect x="13.9" y="5" width="3.6" height="14" rx="1.2" ${F}/>`,
  shield: `<path d="M12 21.5s8-3.8 8-9.8V5.2l-8-2.9-8 2.9v6.5c0 6 8 9.8 8 9.8z"/><path d="M8.6 11.8l2.4 2.4 4.4-4.6"/>`,
  bolt: `<path d="M13 2.5 4.5 13.5h7l-1 8 8.5-11h-7z"/>`,
  cross: `<path d="M9.5 3.5h5v6h6v5h-6v6h-5v-6h-6v-5h6z" ${F}/>`,
  tap: `<path d="M9 11V4.8a1.8 1.8 0 0 1 3.6 0V11"/><path d="M12.6 10.5V9.3a1.8 1.8 0 0 1 3.6 0v2.2"/><path d="M16.2 10.8a1.8 1.8 0 0 1 3.6 0v3.4a7 7 0 0 1-7 7h-1a7 7 0 0 1-5.6-2.8L3.5 15.1a1.8 1.8 0 0 1 2.8-2.3L9 15.5"/>`,
  clock: `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`,
  door: `<path d="M5 21.5V3.5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v18"/><path d="M3 21.5h18"/><circle cx="15" cy="12.5" r="1" ${F}/>`,
  angry: `<circle cx="12" cy="12" r="9"/><path d="M8 16c1-1.3 2.4-2 4-2s3 .7 4 2"/><path d="M7.5 8.5l2.5 1.3M16.5 8.5 14 9.8"/>`,
  smile: `<circle cx="12" cy="12" r="9"/><path d="M8 14c1 1.3 2.4 2 4 2s3-.7 4-2"/><path d="M9 9.5h.01M15 9.5h.01" stroke-width="2.6"/>`,
  alert: `<path d="M10.3 3.9 2.1 18a2 2 0 0 0 1.7 3h16.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4.5"/><path d="M12 17.5h.01" stroke-width="2.6"/>`,
  hand: `<path d="M18 11V6.5a1.8 1.8 0 0 0-3.6 0V11"/><path d="M14.4 10.5V4.3a1.8 1.8 0 0 0-3.6 0v6.2"/><path d="M10.8 10.5V5.8a1.8 1.8 0 0 0-3.6 0V14"/><path d="M18 8.6a1.8 1.8 0 0 1 3.6 0V14a7.5 7.5 0 0 1-7.5 7.5h-1.6a7.5 7.5 0 0 1-5.4-2.3l-3.6-3.8a1.8 1.8 0 0 1 2.6-2.5L7.2 14"/>`,
  fire: `<path d="M12 2.5c.8 3 4.8 5.2 4.8 10a4.8 4.8 0 0 1-9.6 0c0-2.4 1.3-3.8 1.3-3.8.2 1.6 1.1 2.6 2.2 2.6 0-3.4-1.4-5.4 1.3-8.8z" ${F}/>`,
  bed: `<path d="M2.5 19V6"/><path d="M2.5 14h19v5"/><path d="M21.5 14v-2.5a3 3 0 0 0-3-3H11V14"/><circle cx="6.8" cy="10.8" r="2"/>`,
  shoe: `<path d="M2.5 17.5v-6.3l4.5-.9 2 2.7 4.2 1.1 6 .9a2.3 2.3 0 0 1 2 2.3v.2z"/><path d="M2.5 17.5h19"/><path d="M10 13.4l1-1.4M12.5 14.1l1-1.4" opacity=".6"/>`,
  tv: `<rect x="2.5" y="5.5" width="19" height="12.5" rx="2"/><path d="M8 21.5h8"/><path d="M9 2.5l3 3 3-3"/>`,
  cup: `<path d="M4.5 9h12v5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z"/><path d="M16.5 10h1.3a2.6 2.6 0 0 1 0 5.2h-1.6"/><path d="M8.5 2.8c0 1.4 1.4 1.4 1.4 2.8M12.5 2.8c0 1.4 1.4 1.4 1.4 2.8" opacity=".6"/>`,
  won: `<path d="M5.5 6.5l2.2 11 4.3-8.5 4.3 8.5 2.2-11" stroke-width="2.2"/><path d="M4.5 11h15M5.2 14h13.6" stroke-width="1.8"/>`,
  help: `<circle cx="12" cy="12" r="9.2"/><path d="M9.4 9.3a2.7 2.7 0 0 1 5.2.9c0 1.8-2.6 2.4-2.6 4"/><path d="M12 17.3h.01" stroke-width="2.6"/>`,
  heart: `<path d="M20.4 5.1a5.2 5.2 0 0 0-7.4 0L12 6.2l-1-1.1a5.2 5.2 0 0 0-7.4 7.4l1 1L12 21l7.4-7.5 1-1a5.2 5.2 0 0 0 0-7.4z"/><path d="M12 9.5l-1.2 2.6h2.4L12 14.7" opacity=".65"/>`,
  plus: `<path d="M12 5v14M5 12h14"/>`,
  minus: `<path d="M5 12h14"/>`,
  expand: `<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>`,
  tray: `<path d="M3 13.5h4.5l1.5 2.5h6l1.5-2.5H21"/><path d="M5.5 6.5h13L21 13.5v5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5v-5z"/>`,
  pinch: `<path d="M4 4l5 5M4 4v4M4 4h4"/><path d="M20 20l-5-5M20 20v-4M20 20h-4"/><circle cx="12" cy="12" r="1.6"/>`,
  clipboard: `<rect x="5" y="4" width="14" height="17.5" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="M8.5 10h7M8.5 13.5h7M8.5 17h4"/>`,
  run: `<circle cx="14.5" cy="4.2" r="1.8"/><path d="M8.5 21l3-5.5 3 2.5V22"/><path d="M6 11.5l3.5-3.5 4 1 2 3.5 3 1"/><path d="M11.5 15.5l2-6.5"/>`,
  drop: `<path d="M12 2.8s6.5 7 6.5 11.7a6.5 6.5 0 0 1-13 0C5.5 9.8 12 2.8 12 2.8z"/><path d="M9 15a3 3 0 0 0 3 3" opacity=".6"/>`,
  users: `<circle cx="9" cy="8" r="3.4"/><path d="M2.8 20c.6-3.4 3.2-5.5 6.2-5.5s5.6 2.1 6.2 5.5"/><circle cx="17" cy="9.2" r="2.6"/><path d="M16.2 14.3c2.7-.3 4.8 1.6 5.2 4.6"/>`,
  choco: `<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 9h14M5 15h14M12 3v18"/><path d="M5 18.5l3-2.5 3 2.5" opacity=".5"/>`,
  home: `<path d="M3.5 11 12 3.8l8.5 7.2"/><path d="M5.5 9.5v10.5h13V9.5"/><path d="M10 20v-5.5h4V20"/>`,
  medal: `<path d="M8 2.5l-2.5 6M16 2.5l2.5 6M9.5 2.5h5"/><circle cx="12" cy="14.5" r="6.2"/><path d="M12 11.2l1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3-1.7-1.6 2.3-.3z" fill="currentColor" stroke="none"/>`,
  moon: `<path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a6.8 6.8 0 0 0 10.7 10.7z"/>`,
  pen: `<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/><path d="M14.5 5.5l3 3"/>`,
  chat: `<path d="M20.5 12a8 8 0 0 1-11.6 7.2L3.5 20.5l1.3-4.8A8 8 0 1 1 20.5 12z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01" stroke-width="2.6"/>`,
  book: `<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20v-3"/><path d="M8 7.5h8M8 11h6"/>`,
  shirt: `<path d="M8.5 3 4 5.5 2.5 10l3 1.5V21h13v-9.5l3-1.5L20 5.5 15.5 3c-.5 1.5-1.9 2.5-3.5 2.5S9 4.5 8.5 3z"/><path d="M14 13.5h3v3h-3z"/>`,
  ticket: `<path d="M3 8a2 2 0 0 0 0 4v0a2 2 0 0 0 0 4v2.5h18V16a2 2 0 0 1 0-4 2 2 0 0 1 0-4V5.5H3z"/><path d="M15 5.5v13" stroke-dasharray="2 2"/>`,
  megaphone: `<path d="M3.5 10v4a1 1 0 0 0 1 1h2l8.5 4.5v-15L6.5 9h-2a1 1 0 0 0-1 1z"/><path d="M18.5 9a4 4 0 0 1 0 6"/><path d="M7 15l1 5"/>`,
  sleep: `<path d="M3 18.5V8M3 13.5h18v5M21 18.5v-2.5"/><path d="M13 5h4l-4 4.5h4" stroke-width="1.6"/><circle cx="7" cy="10.8" r="1.6"/>`,
  sun: `<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>`,
  warning: `<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><path d="M12 16.5h.01" stroke-width="2.6"/>`,
  volume: `<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6"/><path d="M18 6.5a7.5 7.5 0 0 1 0 11"/>`,
  mute: `<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>`,
  check: `<path d="M5 12.5l4.5 4.5L19 7.5"/>`,
  x: `<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>`,
  play: `<path d="M7 4.5v15l12-7.5z" ${F}/>`,
  sparkle: `<path d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9z" ${F}/><path d="M19 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" ${F}/>`,
  info: `<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><path d="M12 7.5h.01" stroke-width="2.6"/>`,
  lunch: `<path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0z"/><path d="M9 20h6"/><path d="M13.5 2.5 17 10"/><path d="M17.5 2.5 19.5 10"/>`,
};

export function icon(name, cls = '') {
  const body = ICONS[name] || ICONS.info;
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((n) => { n.innerHTML = icon(n.dataset.icon); });
}

// 메시지 앞 이모지 → 아이콘 이름
export const EMOJI_ICON = {
  '🔔': 'bell', '📞': 'phone', '📵': 'phone', '🚨': 'heartPulse', '😡': 'angry', '⚠️': 'alert', '🚑': 'ambulance',
  '🍙': 'onigiri', '🚻': 'toilet', '⚡': 'bolt', '🔍': 'shield', '🍱': 'lunch', '🚪': 'door', '🕕': 'clock',
  '📄': 'doc', '🧑‍⚕️': 'stetho', '✋': 'hand', '💉': 'syringe', '💧': 'iv', '♨️': 'flame', '☕': 'cup',
  '👆': 'tap', '🩸': 'drop', '🍫': 'choco', '👥': 'users', '🏠': 'home', '🎖️': 'medal', '🌙': 'moon', '📝': 'pen', '😣': 'warning', '🙅': 'warning', '📣': 'megaphone', '☀️': 'sun', '🎫': 'ticket', '💢': 'angry', '📋': 'clipboard', '🕘': 'clock', '💔': 'heart', '🧠': 'heart', '🧾': 'card', '👵': 'smile', '👴': 'smile', '☕🍙': 'cup', '🍙🚻': 'battery',
};
