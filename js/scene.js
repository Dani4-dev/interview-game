/*
 * Отрисовка сцены: кабинет, интервьюер за столом, стол с предметами.
 * Всё рисуется кодом в низком разрешении (320x130) и масштабируется CSS без сглаживания.
 *
 * Интервьюер строится из двух шаблонов (TEMPLATE.m и TEMPLATE.f): у каждого своё базовое тело
 * (плечи, шея, форма лица), а поверх рисуются случайные детали из appearance (см. js/generator.js):
 * цвет пиджака/галстука, причёска и цвет волос, усы, морщины, родинки, очки, серьги и другое.
 *
 * API: Scene.init(canvas), Scene.setInterviewer(iv | null), Scene.setTalking(bool)
 */
(function (global) {
  'use strict';

  const W = 320, H = 130, CX = 160;
  const DESK_Y = 96;
  const CLOCK = { x: 98, y: 27, r: 10 };

  const DEFAULT_ROOM = { wall: '#4b4a3c', wainscot: '#3a3128', sky: '#8e9c9a', accent: '#c9a85a', emblem: 'sakura' };

  // Базовые размеры шаблонов: ширина лица, полуширина плеч, ширина шеи
  const TEMPLATE = {
    m: { W: 28, bw: 46, neck: 10 },
    f: { W: 26, bw: 40, neck: 8 }
  };

  let ctx = null;
  let bg = null;
  let fg = null;
  let app = null;
  let appSeed = 1;
  let room = DEFAULT_ROOM;
  let talking = false;
  let lastFrame = 0;

  /* ---------- Утилиты ---------- */
  const hexToRgb = (h) => {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const shade = (h, amt) => {
    const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt)));
    return '#' + hexToRgb(h).map((v) => f(v).toString(16).padStart(2, '0')).join('');
  };
  const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
  function disc(c, cx, cy, r, col) {
    c.fillStyle = col;
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y <= r * r + r * 0.6) c.fillRect(cx + x, cy + y, 1, 1);
      }
    }
  }
  function line(c, x0, y0, x1, y1, col) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
    for (let i = 0; i <= steps; i++) {
      R(c, x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps, 1, 1, col);
    }
  }
  function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  function layer() {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    return { canvas: c, ctx: g };
  }

  /* ---------- Кабинет ---------- */
  function drawWindow(c, x, y, w, h) {
    R(c, x - 3, y - 3, w + 6, h + 6, '#27231c');
    R(c, x, y, w, h, room.sky);
    const rnd = rng(7);
    let bx = x;
    while (bx < x + w) {
      const bw = 5 + Math.floor(rnd() * 7);
      const bh = 10 + Math.floor(rnd() * 22);
      const ww = Math.min(bw, x + w - bx);
      R(c, bx, y + h - bh, ww, bh, shade(room.sky, -48));
      for (let wy = y + h - bh + 3; wy < y + h - 3; wy += 4) {
        if (rnd() > 0.55) R(c, bx + 1 + Math.floor(rnd() * Math.max(1, ww - 3)), wy, 1, 1, '#e8d58a');
      }
      bx += ww;
    }
    for (let sy = y; sy < y + 24; sy += 4) {
      R(c, x, sy, w, 3, '#b9b4a0');
      R(c, x, sy + 3, w, 1, '#7d7967');
    }
    R(c, x + w - 6, y, 1, 28, '#5c564a');
    R(c, x + Math.floor(w / 2) - 1, y + 24, 2, h - 24, '#27231c');
    R(c, x - 5, y + h + 3, w + 10, 3, '#8b8570');
  }

  function drawClockFace(c) {
    disc(c, CLOCK.x, CLOCK.y, CLOCK.r + 2, '#1f1b15');
    disc(c, CLOCK.x, CLOCK.y, CLOCK.r, '#d9d3bd');
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      R(c, CLOCK.x + Math.round(Math.sin(a) * (CLOCK.r - 2)), CLOCK.y - Math.round(Math.cos(a) * (CLOCK.r - 2)), 1, 1, '#2a2418');
    }
  }

  function drawClockHands(c) {
    const d = new Date();
    const m = d.getMinutes() + d.getSeconds() / 60;
    const h = (d.getHours() % 12) + m / 60;
    const am = (m / 60) * Math.PI * 2;
    const ah = (h / 12) * Math.PI * 2;
    line(c, CLOCK.x, CLOCK.y, CLOCK.x + Math.round(Math.sin(ah) * (CLOCK.r - 5)), CLOCK.y - Math.round(Math.cos(ah) * (CLOCK.r - 5)), '#1a1610');
    line(c, CLOCK.x, CLOCK.y, CLOCK.x + Math.round(Math.sin(am) * (CLOCK.r - 2)), CLOCK.y - Math.round(Math.cos(am) * (CLOCK.r - 2)), '#1a1610');
    R(c, CLOCK.x, CLOCK.y, 1, 1, '#a33a2f');
  }

  function drawShelf(c, x, y, w) {
    const cols = ['#6e3b35', '#35506e', '#4d6e35', '#8a7a3c', '#59534a', '#7a4a2a'];
    const rnd = rng(11);
    for (let row = 0; row < 2; row++) {
      const sy = y + row * 22;
      let bx = x + 2;
      while (bx < x + w - 6) {
        const bw = 4 + Math.floor(rnd() * 3);
        const bh = 13 + Math.floor(rnd() * 6);
        R(c, bx, sy - bh, bw, bh, cols[Math.floor(rnd() * cols.length)]);
        R(c, bx, sy - bh, 1, bh, 'rgba(255,255,255,.14)');
        R(c, bx + 1, sy - bh + 3, Math.max(1, bw - 2), 1, '#d9d3bd');
        bx += bw + 1;
      }
      R(c, x, sy, w, 3, '#2e261c');
      R(c, x, sy, w, 1, '#4a3c2a');
    }
  }

  function drawPlant(c, x, y) {
    R(c, x, y + 4, 12, 10, '#7a4a33');
    R(c, x - 1, y + 3, 14, 2, '#8d5a3e');
    disc(c, x + 6, y - 2, 5, '#3d6b3a');
    disc(c, x + 1, y + 1, 4, '#2f5a30');
    disc(c, x + 10, y, 4, '#4b7d42');
    disc(c, x + 6, y - 7, 3, '#4b7d42');
  }

  // Эмблема компании на табличке: sakura | wave | mountain | circle
  function drawEmblem(c, cx, cy, kind, ac) {
    if (kind === 'wave') {
      disc(c, cx, cy, 6, ac);
      R(c, cx - 3, cy - 4, 1, 8, '#10201f');
      R(c, cx + 2, cy - 4, 1, 8, '#10201f');
      for (let i = 0; i < 8; i++) R(c, cx - 3 + Math.round((i * 5) / 7), cy - 4 + i, 1, 1, '#10201f');
    } else if (kind === 'mountain') {
      for (let r = 0; r < 10; r++) R(c, cx - Math.floor(r * 0.7) - 1, cy - 5 + r, Math.floor(r * 1.4) + 3, 1, ac);
      R(c, cx - 1, cy - 5, 3, 3, '#e9e5d6');
      R(c, cx - 2, cy - 2, 5, 1, '#e9e5d6');
    } else if (kind === 'circle') {
      disc(c, cx, cy, 6, ac);
      disc(c, cx, cy, 3, '#1c1914');
      disc(c, cx, cy, 1, ac);
    } else {
      [[0, -4], [4, -1], [2, 3], [-2, 3], [-4, -1]].forEach((o) => disc(c, cx + o[0], cy + o[1], 2, '#e9a8b8'));
      disc(c, cx, cy, 1, '#e8d27a');
    }
  }

  function drawPlaque(c) {
    R(c, 122, 7, 76, 20, '#1c1914');
    R(c, 124, 9, 72, 16, '#2f2a22');
    const ac = room.accent;
    drawEmblem(c, 136, 17, room.emblem, ac);
    R(c, 148, 13, 40, 2, ac);
    R(c, 148, 18, 30, 1, shade(ac, -50));
    R(c, 148, 21, 22, 1, shade(ac, -50));
    // рамка с дипломом справа от таблички
    R(c, 204, 12, 16, 22, '#1c1914');
    R(c, 206, 14, 12, 18, '#cfc7a8');
    for (let i = 0; i < 5; i++) R(c, 208, 17 + i * 3, 8, 1, '#8d8570');
    R(c, 212, 28, 3, 3, '#a33a2f');
  }

  function drawRoom(c) {
    R(c, 0, 0, W, H, room.wall);
    for (let x = 0; x < W; x += 16) R(c, x, 0, 1, 72, shade(room.wall, -6));
    R(c, 0, 0, W, 5, shade(room.wall, -24));
    R(c, 0, 5, W, 1, shade(room.wall, -36));
    R(c, 0, 70, W, 30, room.wainscot);
    R(c, 0, 70, W, 2, shade(room.wainscot, 20));
    R(c, 0, 72, W, 1, shade(room.wainscot, -20));
    for (let x = 8; x < W; x += 32) R(c, x, 76, 14, 20, shade(room.wainscot, -8));
    drawWindow(c, 16, 12, 56, 46);
    drawClockFace(c);
    drawShelf(c, 226, 34, 76);
    drawPlant(c, 305, 78);
    drawPlaque(c);
  }

  function drawChair(c) {
    R(c, CX - 26, 42, 52, 58, '#26231f');
    R(c, CX - 22, 46, 44, 50, '#2f2b26');
    R(c, CX - 26, 42, 52, 2, '#3a352e');
  }

  /* ---------- Стол (передний план) ---------- */
  function drawDesk(c) {
    R(c, 0, DESK_Y, W, H - DESK_Y, '#5c4630');
    R(c, 0, DESK_Y, W, 1, '#8b6d47');
    R(c, 0, DESK_Y + 1, W, 2, '#715638');
    const rnd = rng(3);
    for (let i = 0; i < 40; i++) {
      R(c, Math.floor(rnd() * W), DESK_Y + 6 + Math.floor(rnd() * 26), 10 + Math.floor(rnd() * 30), 1, '#523d29');
    }
    R(c, 0, 124, W, 6, '#3d2f20');
    R(c, 0, 124, W, 1, '#2e2318');

    // табличка с именем
    R(c, 138, 104, 44, 12, '#c9a85a');
    R(c, 138, 104, 44, 2, '#e6cf8a');
    R(c, 138, 114, 44, 2, '#8f7430');
    R(c, 144, 108, 32, 1, '#6b5520');
    R(c, 148, 111, 24, 1, '#6b5520');

    // папка кандидата
    R(c, 40, 109, 70, 18, '#b9a56a');
    R(c, 44, 105, 20, 5, '#b9a56a');
    R(c, 40, 109, 70, 1, '#d1be84');
    R(c, 40, 126, 70, 1, '#8c7a45');
    R(c, 52, 114, 40, 1, '#6e6030');
    R(c, 52, 118, 28, 1, '#6e6030');
    R(c, 94, 113, 10, 8, '#a33a2f');

    // чашка с зелёным чаем
    R(c, 188, 114, 18, 2, '#c7c2b0');
    R(c, 191, 105, 12, 10, '#e9e5d6');
    R(c, 192, 105, 10, 2, '#6b8a3a');
    R(c, 203, 108, 3, 4, '#e9e5d6');
    R(c, 205, 109, 1, 2, '#2a2418');

    // документы
    R(c, 216, 104, 48, 22, '#bcb59c');
    R(c, 214, 102, 48, 22, '#e6e0cc');
    for (let i = 0; i < 4; i++) R(c, 219, 106 + i * 4, 38 - (i % 2) * 9, 1, '#7d776a');
    R(c, 244, 114, 14, 8, '#a33a2f');
    R(c, 245, 115, 12, 6, '#e6e0cc');

    // стакан с ручками
    R(c, 280, 100, 11, 15, '#3b4a5a');
    R(c, 280, 100, 11, 1, '#52667a');
    R(c, 282, 92, 1, 8, '#a33a2f');
    R(c, 285, 90, 1, 10, '#2f6fa0');
    R(c, 288, 94, 1, 6, '#1a1a1a');
  }

  function rebuildLayers() {
    const b = layer();
    drawRoom(b.ctx);
    if (!app) drawChair(b.ctx);
    bg = b.canvas;
    const f = layer();
    drawDesk(f.ctx);
    fg = f.canvas;
  }

  /* ---------- Интервьюер: части ---------- */

  // Волосы, которые видны за головой и телом (рисуются первыми)
  function hairBack(c, a, hx, hy, w) {
    if (a.gender !== 'f') return;
    const h = a.hair;
    if (a.hairStyle === 'bob') R(c, hx - 4, hy - 1, w + 8, 36, h);
    else if (a.hairStyle === 'long') R(c, hx - 6, hy - 2, w + 12, 58, h);
    else if (a.hairStyle === 'pixie') R(c, hx - 3, hy - 1, w + 6, 20, h);
    else if (a.hairStyle === 'bun') {
      R(c, hx - 1, hy - 1, w + 2, 12, h);
      disc(c, CX, hy - 5, 5, h);
      R(c, CX - 3, hy - 9, 5, 1, shade(h, 24));
    }
  }

  // Пиджак (базовое тело): ширина плеч зависит от шаблона
  function drawBody(c, a, T, yS) {
    const bw = T.bw;
    R(c, CX - bw, yS + 6, bw * 2, 40, a.suit);
    R(c, CX - bw + 6, yS + 2, bw * 2 - 12, 6, a.suit);
    R(c, CX - bw + 16, yS, bw * 2 - 32, 3, a.suit);
    R(c, CX - bw + 16, yS, bw * 2 - 32, 1, shade(a.suit, 16));
    R(c, CX + bw - 22, yS + 6, 22, 40, shade(a.suit, -12));
    R(c, CX - bw, yS + 6, 3, 40, shade(a.suit, 8));
  }

  // Рубашка/блузка, лацканы, галстук, значок, ожерелье, бейдж
  function drawClothes(c, a, yS) {
    const f = a.gender === 'f';
    const vTop = yS - 2;
    for (let r = 0; r < 15; r++) {
      const w = Math.max(2, 20 - Math.floor(r * 1.3));
      // у женского шаблона вырез V открывает кожу
      R(c, CX - Math.floor(w / 2), vTop + r, w, 1, f && r < 5 ? a.skin : a.shirt);
    }
    R(c, CX - 9, vTop - 1, 4, 3, a.shirt);
    R(c, CX + 5, vTop - 1, 4, 3, a.shirt);
    const lap = shade(a.suit, 14);
    for (let r = 0; r < 17; r++) {
      const w = Math.max(2, 20 - Math.floor(r * 1.3));
      R(c, CX - Math.floor(w / 2) - 3, vTop + r, 3, 1, lap);
      R(c, CX + Math.ceil(w / 2), vTop + r, 3, 1, lap);
    }
    if (a.tie) {
      R(c, CX - 2, vTop + 1, 4, 3, a.tie);
      R(c, CX - 2, vTop + 4, 4, 14, a.tie);
      R(c, CX - 1, vTop + 4, 1, 14, shade(a.tie, 18));
      R(c, CX - 1, vTop + 18, 2, 2, a.tie);
    }
    if (a.pin) R(c, CX - 24, vTop + 14, 3, 3, a.pin);
    if (a.necklace) {
      R(c, CX - 5, vTop + 3, 10, 1, a.necklace);
      R(c, CX - 1, vTop + 4, 2, 2, a.necklace);
    }
    if (a.lanyard) {
      for (let r = 0; r < 14; r++) {
        R(c, CX - 8 + Math.floor(r / 2), vTop + r, 1, 1, a.lanyard);
        R(c, CX + 7 - Math.floor(r / 2), vTop + r, 1, 1, a.lanyard);
      }
      R(c, CX - 5, vTop + 9, 10, 11, '#eeeae0');
      R(c, CX - 3, vTop + 11, 6, 4, '#8fa0a8');
      R(c, CX - 4, vTop + 17, 8, 1, a.lanyard);
    }
  }

  // Голова: у женского шаблона уже подбородок
  function drawHead(c, a, hx, hy, w) {
    const f = a.gender === 'f';
    const skin = a.skin, skinD = shade(skin, -16);
    R(c, hx - 2, hy + 15, 3, 8, skin);
    R(c, hx + w - 1, hy + 15, 3, 8, skinD);
    R(c, hx + 2, hy + 1, w - 4, 3, skin);
    R(c, hx, hy + 4, w, 26, skin);
    if (f) {
      R(c, hx + 2, hy + 30, w - 4, 2, skin);
      R(c, hx + 4, hy + 32, w - 8, 2, skin);
      R(c, hx + 7, hy + 34, w - 14, 1, skin);
    } else {
      R(c, hx + 2, hy + 30, w - 4, 3, skin);
      R(c, hx + 5, hy + 33, w - 10, 2, skin);
    }
    R(c, hx + w - 6, hy + 5, 6, 25, skinD);
    R(c, hx + w - 9, hy + 30, 5, 3, skinD);
    R(c, hx - 1, hy + 17, 1, 4, shade(skin, -28));
    if (a.hairStyle === 'balding') {
      // гладкая макушка
      R(c, hx + 4, hy - 1, w - 8, 2, skin);
      R(c, hx + 7, hy - 2, w - 14, 1, skin);
      R(c, hx + 7, hy + 1, 5, 1, shade(skin, 18));
    }
  }

  function drawWrinklesAndMoles(c, a, hx, hy) {
    const wr = shade(a.skin, -26);
    const ey = hy + 16;
    if (a.wrinkles >= 1) {
      R(c, CX - 6, hy + 10, 12, 1, wr);
      R(c, CX - 7, ey + 8, 1, 4, wr);
      R(c, CX + 6, ey + 8, 1, 4, wr);
    }
    if (a.wrinkles >= 2) {
      R(c, CX - 5, hy + 8, 10, 1, wr);
      R(c, CX - 11, ey + 1, 2, 1, wr);
      R(c, CX + 9, ey + 1, 2, 1, wr);
      R(c, CX - 8, ey + 4, 5, 1, wr);
      R(c, CX + 3, ey + 4, 5, 1, wr);
    }
    (a.moles || []).forEach((m) => R(c, hx + m[0], hy + m[1], 2, 2, '#4a2f22'));
  }

  // Причёска поверх лба и висков
  function hairFront(c, a, hx, hy, w, rnd) {
    const h = a.hair;
    const g = a.hairGrey;
    const hl = shade(h, 24);
    switch (a.hairStyle) {
      case 'parted':
        R(c, hx - 1, hy - 2, w + 2, 8, h);
        R(c, hx + 1, hy - 3, w - 2, 2, h);
        R(c, hx - 2, hy + 2, 4, 12, g || h);
        R(c, hx + w - 2, hy + 2, 4, 12, g || h);
        R(c, hx + 2, hy + 6, 10, 2, h);
        R(c, hx + 16, hy + 6, 9, 1, h);
        R(c, hx + 8, hy - 2, 1, 5, shade(h, 36));
        break;
      case 'short':
        R(c, hx - 1, hy - 2, w + 2, 7, h);
        R(c, hx + 1, hy - 3, w - 2, 2, h);
        R(c, hx - 2, hy + 2, 3, 11, g || h);
        R(c, hx + w - 1, hy + 2, 3, 11, g || h);
        R(c, hx + 3, hy + 5, w - 6, 1, h);
        R(c, hx + 4, hy - 2, 10, 1, hl);
        break;
      case 'buzz': {
        const s = shade(h, 30);
        R(c, hx, hy - 1, w, 6, s);
        R(c, hx + 2, hy - 2, w - 4, 1, s);
        R(c, hx - 1, hy + 3, 2, 8, g || s);
        R(c, hx + w - 1, hy + 3, 2, 8, g || s);
        break;
      }
      case 'balding':
        R(c, hx - 2, hy + 3, 4, 12, g || h);
        R(c, hx + w - 2, hy + 3, 4, 12, g || h);
        R(c, hx - 1, hy + 1, 2, 3, g || h);
        R(c, hx + w - 1, hy + 1, 2, 3, g || h);
        break;
      case 'bob':
        R(c, hx - 3, hy - 3, w + 6, 10, h);
        R(c, hx - 1, hy - 4, w + 2, 2, h);
        R(c, hx + 1, hy + 6, w - 2, 3, h);
        R(c, hx + 4, hy + 9, 8, 1, h);
        R(c, hx + w - 9, hy + 9, 7, 1, h);
        R(c, hx - 3, hy + 4, 5, 26, h);
        R(c, hx + w - 2, hy + 4, 5, 26, h);
        R(c, hx + 2, hy - 2, 10, 1, hl);
        break;
      case 'long':
        R(c, hx - 3, hy - 3, w + 6, 10, h);
        R(c, hx - 1, hy - 4, w + 2, 2, h);
        R(c, hx + 1, hy + 6, w - 2, 3, h);
        R(c, hx - 4, hy + 4, 6, 28, h);
        R(c, hx + w - 2, hy + 4, 6, 28, h);
        R(c, hx + 2, hy - 2, 10, 1, hl);
        break;
      case 'pixie':
        R(c, hx - 2, hy - 3, w + 4, 10, h);
        R(c, hx, hy - 4, w, 2, h);
        R(c, hx + 2, hy + 6, w - 4, 2, h);
        R(c, hx + 6, hy + 8, 5, 1, h);
        R(c, hx - 2, hy + 4, 3, 8, h);
        R(c, hx + w - 1, hy + 4, 3, 8, h);
        R(c, hx + 2, hy - 2, 8, 1, hl);
        break;
      case 'bun':
        R(c, hx - 1, hy - 2, w + 2, 8, h);
        R(c, hx + 1, hy - 3, w - 2, 2, h);
        R(c, hx - 2, hy + 3, 3, 8, h);
        R(c, hx + w - 1, hy + 3, 3, 8, h);
        R(c, hx + 3, hy + 6, 7, 1, h);
        R(c, hx + 3, hy - 2, 8, 1, hl);
        break;
      default:
        break;
    }
    // седина вкраплениями
    if (g && g !== h && a.hairStyle !== 'balding' && a.hairStyle !== 'buzz') {
      for (let i = 0; i < 18; i++) R(c, hx + Math.floor(rnd() * w), hy - 2 + Math.floor(rnd() * 8), 1, 1, g);
    }
    // длинные пряди, лежащие на плечах (поверх тела)
    if (a.hairStyle === 'long') {
      R(c, hx - 6, hy + 32, 9, 26, h);
      R(c, hx + w - 3, hy + 32, 9, 26, h);
      R(c, hx - 5, hy + 34, 1, 20, hl);
    }
  }

  function drawFace(c, a, hx, hy, w, t) {
    const f = a.gender === 'f';
    const skin = a.skin;
    const hair = a.hair;
    const ey = hy + 16;

    // брови
    const brow = a.age === 'old' ? shade(a.hairGrey || hair, -30) : hair;
    R(c, CX - 9, ey - 4, 7, 1, brow);
    R(c, CX + 2, ey - 4, 7, 1, brow);
    if (a.age === 'old') {
      R(c, CX - 4, ey - 5, 2, 1, brow);
      R(c, CX + 2, ey - 5, 2, 1, brow);
    }

    // глаза
    const blink = t % 4200 < 140;
    const lid = shade(skin, -48);
    if (blink) {
      R(c, CX - 8, ey + 1, 5, 1, '#1a1410');
      R(c, CX + 3, ey + 1, 5, 1, '#1a1410');
    } else {
      R(c, CX - 8, ey - 1, 5, 1, lid);
      R(c, CX + 3, ey - 1, 5, 1, lid);
      R(c, CX - 8, ey, 5, 2, '#e8e4d8');
      R(c, CX - 6, ey, 2, 2, '#14100c');
      R(c, CX + 3, ey, 5, 2, '#e8e4d8');
      R(c, CX + 5, ey, 2, 2, '#14100c');
      if (f) {
        R(c, CX - 9, ey - 1, 1, 1, '#1a1410');
        R(c, CX + 8, ey - 1, 1, 1, '#1a1410');
      }
    }

    // нос
    R(c, CX - 1, ey + 3, 2, 6, shade(skin, -14));
    R(c, CX - 2, ey + 8, 4, 1, shade(skin, -26));

    // румянец
    if (f) {
      R(c, CX - 12, ey + 7, 3, 2, '#d99a8c');
      R(c, CX + 9, ey + 7, 3, 2, '#d99a8c');
    }

    // рот
    const my = hy + 27;
    const open = talking && Math.floor(t / 120) % 2 === 0;
    const lip = a.lip || '#6b3a32';
    if (open) {
      R(c, CX - 4, my - 1, 8, 4, lip);
      R(c, CX - 3, my, 6, 2, '#2e1411');
    } else {
      R(c, CX - 4, my, 8, f ? 2 : 1, lip);
      if (!f) {
        R(c, CX - 5, my + 1, 1, 1, lip);
        R(c, CX + 4, my + 1, 1, 1, lip);
      }
    }

    // усы
    if (a.mustache) {
      const m = a.age === 'old' ? shade(a.hairGrey || hair, -10) : hair;
      R(c, CX - 6, my - 3, 12, 2, m);
      R(c, CX - 7, my - 2, 1, 3, m);
      R(c, CX + 6, my - 2, 1, 3, m);
    }

    // очки
    if (a.glasses) {
      const col = a.glasses.color;
      const round = a.glasses.shape === 'round';
      [CX - 11, CX + 1].forEach((lx) => {
        if (round) {
          R(c, lx + 1, ey - 3, 8, 1, col);
          R(c, lx + 1, ey + 4, 8, 1, col);
          R(c, lx, ey - 2, 1, 6, col);
          R(c, lx + 9, ey - 2, 1, 6, col);
        } else {
          R(c, lx, ey - 3, 10, 1, col);
          R(c, lx, ey + 4, 10, 1, col);
          R(c, lx, ey - 3, 1, 8, col);
          R(c, lx + 9, ey - 3, 1, 8, col);
        }
        R(c, lx + 2, ey - 2, 2, 1, 'rgba(255,255,255,.55)');
      });
      R(c, CX - 1, ey - 1, 2, 1, col);
      R(c, CX - 16, ey - 2, 5, 1, col);
      R(c, CX + 11, ey - 2, 5, 1, col);
    }

    // серьги и заколка
    if (a.earrings) {
      R(c, hx - 2, hy + 23, 2, 3, a.earrings);
      R(c, hx + w, hy + 23, 2, 3, a.earrings);
    }
    if (a.hairClip) {
      if (a.hairStyle === 'bun') R(c, CX - 3, hy - 3, 6, 2, a.hairClip);
      else R(c, hx + w - 7, hy + 2, 5, 2, a.hairClip);
    }
  }

  function drawPerson(c, a, t, seed) {
    const T = a.gender === 'f' ? TEMPLATE.f : TEMPLATE.m;
    const w = T.W;
    const bob = Math.sin(t / 1000) > 0.3 ? 1 : 0;
    const yS = 77 + bob;
    const hy = 33 + bob;
    const hx = CX - w / 2;
    const rnd = rng(seed || 1);

    hairBack(c, a, hx, hy, w);
    drawBody(c, a, T, yS);
    R(c, CX - T.neck / 2, hy + 31, T.neck, 12, shade(a.skin, -16));
    drawClothes(c, a, yS);
    drawHead(c, a, hx, hy, w);
    drawWrinklesAndMoles(c, a, hx, hy);
    hairFront(c, a, hx, hy, w, rnd);
    drawFace(c, a, hx, hy, w, t);
  }

  /* ---------- Цикл отрисовки ---------- */
  function frame(t) {
    requestAnimationFrame(frame);
    if (t - lastFrame < 33) return;
    lastFrame = t;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(bg, 0, 0);
    drawClockHands(ctx);
    if (app) drawPerson(ctx, app, t, appSeed);
    ctx.drawImage(fg, 0, 0);
  }

  const Scene = {
    init(canvas) {
      ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      rebuildLayers();
      requestAnimationFrame(frame);
    },
    setInterviewer(iv) {
      app = iv ? iv.appearance : null;
      appSeed = iv ? iv.seed : 1;
      room = iv ? Object.assign({}, DEFAULT_ROOM, iv.room) : DEFAULT_ROOM;
      talking = false;
      rebuildLayers();
    },
    setTalking(v) { talking = !!v; }
  };

  global.Scene = Scene;
})(window);
