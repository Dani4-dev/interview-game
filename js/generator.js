/*
 * Генератор интервьюера: имя, фамилия, название компании, отрасль, должность,
 * стиль (от него зависят верные ответы) и внешность.
 *
 * Generator.create({ seed, gender, style }) - все параметры необязательны.
 * Один и тот же seed всегда даёт одного и того же интервьюера.
 * Generator.describe(iv) - готовые строки имени, должности, компании и отрасли на текущем языке.
 *
 * Внешность строится из двух шаблонов (мужской и женский, см. scene.js):
 * базовое тело одно, а цвета пиджака и галстука, причёска, цвет волос, усы, морщины,
 * родинки и аксессуары (очки, серьги, значок, ожерелье, заколка) выбираются случайно.
 */
(function (global) {
  'use strict';

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  const chance = (r, p) => r() < p;

  const PAL = {
    skin: ['#f0cfae', '#e6c1a0', '#d9b08c', '#cf9f7a', '#c28e68'],
    hair: ['#161412', '#1c1a19', '#231915', '#2e2118', '#3b2a1c'],
    greySide: '#9a9a96',
    greyFull: '#c6c6c2',
    suit: ['#2c3340', '#3a3f4a', '#23282f', '#3b3b36', '#41352f', '#2d3a35', '#4a4f58', '#1f2433', '#4a2f3a'],
    shirtM: ['#dcdcd2', '#cfd6d8', '#e4dfd0', '#c9d3dc'],
    shirtF: ['#dcdcd2', '#cfd6d8', '#e8d9d9', '#d9e4dc', '#e4dfd0'],
    tie: ['#7a2b2b', '#2b4a7a', '#2f6b4a', '#6b4a2b', '#5a2b6b', '#8a7a2b', '#33353a', '#7a3a5a'],
    pin: ['#c9a85a', '#c0c0c8', '#a33a2f', '#3f7fc0'],
    lanyard: ['#c28b3a', '#4fb3b0', '#b5483a', '#6a8fd0', '#8a6ad0'],
    necklace: ['#e6cf8a', '#e8e4d8', '#c0c0c8'],
    earrings: ['#e6cf8a', '#d9d9de', '#e9a8b8', '#5fb0c8'],
    lip: ['#a5524f', '#b8606a', '#8f3e44', '#c27a72'],
    clip: ['#e9a8b8', '#c9a85a', '#5fb0c8', '#d9d9de'],
    glasses: ['#1d1d22', '#5a3a24', '#8a8a90', '#a33a2f', '#c9a85a'],
    rooms: [
      { wall: '#4b4a3c', wainscot: '#3a3128' },
      { wall: '#3c5154', wainscot: '#2f3a3c' },
      { wall: '#51443f', wainscot: '#3a2f2b' },
      { wall: '#3f4a3a', wainscot: '#2d3629' },
      { wall: '#444a5a', wainscot: '#30343f' }
    ],
    sky: ['#8e9c9a', '#a6bcc4', '#b8a98f', '#8a95ac'],
    accent: ['#c9a85a', '#4fb3b0', '#d27a6a', '#7aa0d0', '#9ac26a'],
    emblem: ['sakura', 'wave', 'mountain', 'circle']
  };

  // Возможные места родинок (координаты относительно левого верхнего угла головы)
  const MOLE_SPOTS = [[5, 21], [22, 22], [8, 26], [20, 25], [12, 11], [21, 10], [4, 17], [24, 18]];

  const HAIR_STYLES = {
    m: ['parted', 'short', 'buzz', 'balding'],
    f: ['bob', 'long', 'pixie', 'bun']
  };

  function makeAppearance(r, gender) {
    const female = gender === 'f';

    // возраст: определяет морщины и седину
    const ageRoll = r();
    const age = ageRoll < 0.3 ? 'young' : ageRoll < 0.7 ? 'mid' : 'old';
    const wrinkles = age === 'young' ? 0 : age === 'mid' ? 1 : 2;

    // волосы и седина
    let hair = pick(r, PAL.hair);
    let hairGrey = null;
    if (age === 'mid' && chance(r, 0.4)) hairGrey = PAL.greySide;
    if (age === 'old') {
      if (chance(r, 0.5)) hair = PAL.greyFull;
      else hairGrey = PAL.greySide;
    }

    // причёска (лысеть могут только немолодые мужчины)
    let styles = HAIR_STYLES[gender];
    if (!female && age === 'young') styles = styles.filter((s) => s !== 'balding');
    const hairStyle = pick(r, styles);

    const a = {
      gender: gender,
      age: age,
      wrinkles: wrinkles,
      skin: pick(r, PAL.skin),
      hair: hair,
      hairGrey: hairGrey,
      hairStyle: hairStyle,
      suit: pick(r, PAL.suit),
      shirt: pick(r, female ? PAL.shirtF : PAL.shirtM),
      glasses: null,
      mustache: false,
      moles: [],
      tie: null, pin: null, lanyard: null, necklace: null, earrings: null, lip: null, hairClip: null
    };

    // родинки: 0-2 штуки
    const molesRoll = r();
    const moleCount = molesRoll < 0.5 ? 0 : molesRoll < 0.85 ? 1 : 2;
    const spots = MOLE_SPOTS.slice();
    for (let i = 0; i < moleCount; i++) a.moles.push(spots.splice(Math.floor(r() * spots.length), 1)[0]);

    // очки
    if (chance(r, 0.42)) a.glasses = { shape: pick(r, ['rect', 'round']), color: pick(r, PAL.glasses) };

    if (female) {
      a.lip = pick(r, PAL.lip);
      if (chance(r, 0.55)) a.earrings = pick(r, PAL.earrings);
      if (chance(r, 0.5)) a.lanyard = pick(r, PAL.lanyard);
      else if (chance(r, 0.6)) a.necklace = pick(r, PAL.necklace);
      if (hairStyle !== 'bun' || true) { if (chance(r, 0.3)) a.hairClip = pick(r, PAL.clip); }
    } else {
      a.tie = pick(r, PAL.tie);
      a.pin = pick(r, PAL.pin);
      a.mustache = chance(r, age === 'young' ? 0.1 : 0.3);
    }
    return a;
  }

  function makeRoom(r) {
    const w = pick(r, PAL.rooms);
    return {
      wall: w.wall, wainscot: w.wainscot,
      sky: pick(r, PAL.sky), accent: pick(r, PAL.accent), emblem: pick(r, PAL.emblem)
    };
  }

  function makeCompany(r) {
    const D = global.DICT.companyWords;
    const order = Object.keys(D);
    const n = 1 + Math.floor(r() * 4);              // 1..4 слова
    const idx = order.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {      // перемешать и взять n словарей
      const j = Math.floor(r() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    return idx.slice(0, n).sort((x, y) => x - y).map((i) => ({ dict: order[i], id: pick(r, D[order[i]]) }));
  }

  function create(opts) {
    opts = opts || {};
    const seed = opts.seed != null && !isNaN(opts.seed)
      ? Number(opts.seed) >>> 0
      : Math.floor(Math.random() * 4294967296);
    const r = mulberry32(seed);
    const D = global.DICT;
    const S = global.INTERVIEWER_STYLES;

    const genderRoll = r() < 0.5 ? 'm' : 'f';
    const gender = opts.gender === 'm' || opts.gender === 'f' ? opts.gender : genderRoll;
    const styleRoll = pick(r, Object.keys(S));
    const style = S[opts.style] ? opts.style : styleRoll;

    const iv = {
      id: 'gen-' + seed,
      seed: seed,
      gender: gender,
      style: style,
      firstId: pick(r, D.firstNames[gender]),
      lastId: pick(r, D.lastNames),
      companyWords: makeCompany(r),
      industryId: pick(r, D.industries),
      roleId: pick(r, D.roles),
      appearance: makeAppearance(r, gender),
      room: makeRoom(r)
    };

    const st = S[style];
    iv.questions = st.questions;
    iv.greet = [];
    for (let i = 1; i <= st.greetCount; i++) iv.greet.push('style.' + style + '.greet.' + i);
    iv.closing = 'style.' + style + '.closing';
    iv.askPrefix = 'style.' + style + '.ask.';
    iv.badAsks = st.badAsks.slice();   // вопросы кандидата, после которых будет отказ
    return iv;
  }

  /** Домен для адреса электронной почты: id слов названия (латиницей), без слов вида "group" */
  function domain(iv) {
    const words = iv.companyWords.filter((w) => w.dict !== 'type').map((w) => w.id);
    const parts = words.length ? words : iv.companyWords.map((w) => w.id);
    return parts.join('-') + '.co.jp';
  }

  function describe(iv) {
    const t = global.I18n.t.bind(global.I18n);
    return {
      name: t('fmt.fullName', { first: t('name.first.' + iv.firstId), last: t('name.last.' + iv.lastId) }),
      role: t('role.' + iv.roleId + '.' + iv.gender),
      company: iv.companyWords.map((w) => t('cw.' + w.dict + '.' + w.id)).join(t('fmt.wordJoin')),
      industry: t('industry.' + iv.industryId)
    };
  }

  global.Generator = { create: create, describe: describe, domain: domain };
})(window);
