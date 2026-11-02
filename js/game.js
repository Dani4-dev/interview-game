/*
 * Логика игры: диалоги, выбор настроения и ответа, вопросы интервьюеру, письмо с результатом.
 * Тексты берутся только через I18n.t(ключ). Интервьюер создаётся генератором (js/generator.js).
 *
 * Параметры адреса: ?seed=123 - зафиксировать интервьюера, ?lang=ja - язык.
 */
(function () {
  'use strict';

  /* ===== Настройки ===== */
  const CONFIG = {
    showDevButton: true,       // TODO: поставить false, когда режим разработчика станет не нужен
    typeSpeedMs: 18,           // скорость печати текста, мс на символ
    shuffleAnswers: true,      // перемешивать порядок вариантов внутри настроения
    defaultLang: 'ru',
    fallbackLang: 'en',
    noQuestionFailChance: window.NO_QUESTION_FAIL_CHANCE,  // отказ, если не задано ни одного вопроса
    reasonRevealChance: 0.1    // шанс, что на просьбу назвать причину отказа её назовут
  };

  const DAY = 24 * 60 * 60 * 1000;

  const t = (k, p) => I18n.t(k, p);
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  // Параметры реплики могут быть функцией: тогда они считаются заново при смене языка
  const resolve = (p) => (typeof p === 'function' ? p() : p);

  const forcedSeed = (() => {
    const s = new URLSearchParams(location.search).get('seed');
    return s !== null && s !== '' && !isNaN(s) ? Number(s) : null;
  })();

  const els = {
    lang: $('lang'), dev: $('dev-btn'), devRow: $('dev-row'), progress: $('progress'),
    menuBtn: $('menu-btn'), menu: $('menu'), menuRestart: $('menu-restart'), menuClose: $('menu-close'),
    confirm: $('confirm'), confirmYes: $('confirm-yes'), confirmNo: $('confirm-no'),
    nameplate: $('nameplate'), npName: $('np-name'), npRole: $('np-role'),
    npCompany: $('np-company'), npIndustry: $('np-industry'),
    dialogue: $('dialogue'), speaker: $('speaker'), text: $('text'), choices: $('choices'), next: $('next'),
    title: $('screen-title'), mail: $('screen-mail'), thread: $('mail-thread'), mailDev: $('mail-dev'),
    stamp: $('mail-stamp'), why: $('why-btn'),
    start: $('start-btn'), restart: $('restart-btn')
  };

  const state = {
    iv: null,
    phase: 'title',      // title | question | ask | mail
    dev: false,
    qIndex: 0,
    answers: [],
    asked: [],           // id заданных вопросов кандидата по порядку
    text: null,          // { key, params, speaker } - текущая реплика
    advance: null,       // функция продолжения, пока ждём клика
    choicesView: null,   // функция перерисовки текущих кнопок выбора
    keyHandler: null,
    result: null,        // { pass, cause, date }
    reply: null,         // null | 'confidential' | 'reason' - ответ на просьбу назвать причину
    runId: 0
  };

  const ivInfo = () => (state.iv ? Generator.describe(state.iv) : {});

  /* ===== Печать текста ===== */
  let typer = null;

  function startTyping(full, onDone) {
    stopTyping();
    const chars = Array.from(full);
    Scene.setTalking(state.text && state.text.speaker === 'iv');
    els.text.textContent = '';
    typer = { chars: chars, onDone: onDone, timer: null };
    if (!chars.length) { finishTyping(); return; }
    let i = 0;
    typer.timer = setInterval(() => {
      i += 1;
      els.text.textContent = chars.slice(0, i).join('');
      if (i >= chars.length) finishTyping();
    }, CONFIG.typeSpeedMs);
  }

  function stopTyping() {
    if (typer) { clearInterval(typer.timer); typer = null; }
    Scene.setTalking(false);
  }

  function finishTyping() {
    if (!typer) return;
    const done = typer.onDone;
    els.text.textContent = typer.chars.join('');
    clearInterval(typer.timer);
    typer = null;
    Scene.setTalking(false);
    if (done) done();
  }

  /* ===== Диалоговое окно ===== */
  function renderSpeaker() {
    if (!state.text) return;
    const you = state.text.speaker === 'you';
    els.speaker.textContent = you ? t('ui.speaker.you') : ivInfo().name || '';
    els.speaker.classList.toggle('you', you);
    els.text.classList.toggle('you', you);
  }

  function showNext(v) { els.next.classList.toggle('hidden', !v); }

  function clearChoices() {
    els.choices.replaceChildren();
    els.dialogue.classList.remove('choosing');
    state.choicesView = null;
    state.keyHandler = null;
  }

  /** Показывает реплику. Промис завершается по клику (или сразу после печати при opts.noWait). */
  function say(key, opts) {
    opts = opts || {};
    return new Promise((resolveSay) => {
      clearChoices();
      state.advance = null;
      showNext(false);
      state.text = { key: key, params: opts.params, speaker: opts.speaker || 'iv' };
      renderSpeaker();
      startTyping(t(key, resolve(opts.params)), () => {
        if (opts.noWait) { resolveSay(); return; }
        showNext(true);
        state.advance = () => { state.advance = null; showNext(false); resolveSay(); };
      });
    });
  }

  function advance() {
    if (typer) { finishTyping(); return; }
    if (state.advance) state.advance();
  }

  function buttonLabel(num, text) {
    const b = el('button', 'btn');
    b.type = 'button';
    b.append(el('span', 'num', String(num)), el('span', 'label', text));
    return b;
  }

  /* ===== Выбор настроения и ответа ===== */
  function chooseAnswer(q) {
    return new Promise((resolveChoice) => {
      const correctMood = q.correct.split('.')[0];
      const bank = window.QUESTION_BANK[q.id];
      const orders = {};

      const orderFor = (mood) => {
        if (!orders[mood]) {
          const arr = Array.from({ length: bank[mood] }, (_, i) => i + 1);
          orders[mood] = CONFIG.shuffleAnswers ? shuffle(arr) : arr;
        }
        return orders[mood];
      };

      const finish = (mood, n) => {
        clearChoices();
        resolveChoice({
          qid: q.id, mood: mood, n: n,
          key: 'q.' + q.id + '.a.' + mood + '.' + n,
          correct: q.correct === mood + '.' + n
        });
      };

      const showMoods = () => {
        state.choicesView = showMoods;
        els.choices.replaceChildren();
        els.dialogue.classList.add('choosing');
        els.choices.append(el('div', 'hint', t('ui.chooseMood')));
        const row = el('div', 'mood-row');
        window.MOODS.forEach((m, i) => {
          const b = el('button', 'btn mood');
          b.type = 'button';
          b.append(el('span', 'num', String(i + 1)), el('span', 'label', m.icon + ' ' + t('mood.' + m.id)));
          if (state.dev && m.id === correctMood) b.classList.add('dev-correct');
          b.addEventListener('click', () => showAnswers(m.id));
          row.append(b);
        });
        els.choices.append(row);
        state.keyHandler = (e) => {
          const i = parseInt(e.key, 10);
          if (i >= 1 && i <= window.MOODS.length) { showAnswers(window.MOODS[i - 1].id); return true; }
          return false;
        };
      };

      const showAnswers = (mood) => {
        state.choicesView = () => showAnswers(mood);
        els.choices.replaceChildren();
        els.dialogue.classList.add('choosing');
        const head = el('div', 'hint-row');
        const back = el('button', 'btn ghost back', t('ui.back'));
        back.type = 'button';
        back.addEventListener('click', showMoods);
        head.append(el('div', 'hint', t('ui.chooseAnswer')), back);
        els.choices.append(head);
        const order = orderFor(mood);
        order.forEach((n, i) => {
          const b = buttonLabel(i + 1, t('q.' + q.id + '.a.' + mood + '.' + n));
          if (state.dev && q.correct === mood + '.' + n) b.classList.add('dev-correct');
          b.addEventListener('click', () => finish(mood, n));
          els.choices.append(b);
        });
        state.keyHandler = (e) => {
          const i = parseInt(e.key, 10);
          if (i >= 1 && i <= order.length) { finish(mood, order[i - 1]); return true; }
          if (e.key === 'Escape' || e.key === 'Backspace') { showMoods(); return true; }
          return false;
        };
      };

      showMoods();
    });
  }

  /* ===== Вопросы кандидата интервьюеру ===== */
  function chooseAsk(asked) {
    return new Promise((resolveAsk) => {
      const done = (v) => { clearChoices(); resolveAsk(v); };
      const render = () => {
        state.choicesView = render;
        els.choices.replaceChildren();
        els.dialogue.classList.add('choosing');
        if (state.dev) els.choices.append(el('div', 'hint dev', t('ui.dev.askHint')));
        const ids = window.ASK_BANK.filter((id) => !asked.has(id));
        // кнопка «вопросов больше нет» закреплена в шапке, чтобы всегда была видна
        const none = el('button', 'btn ghost back');
        none.type = 'button';
        none.append(el('span', 'num', '0'), el('span', 'label', t('ui.noMore')));
        none.addEventListener('click', () => done(null));
        const head = el('div', 'hint-row');
        head.append(el('div', 'hint', t('ui.chooseAsk')), none);
        els.choices.append(head);
        const grid = el('div', 'ask-grid');
        ids.forEach((id, i) => {
          // цифрами выбираются первые девять; остальные только мышью
          const b = buttonLabel(i < 9 ? i + 1 : '·', t('ask.' + id + '.q'));
          if (state.dev && state.iv.badAsks.includes(id)) b.classList.add('dev-bad');
          b.addEventListener('click', () => done(id));
          grid.append(b);
        });
        els.choices.append(grid);
        state.keyHandler = (e) => {
          const i = parseInt(e.key, 10);
          if (i === 0) { done(null); return true; }
          if (i >= 1 && i <= Math.min(9, ids.length)) { done(ids[i - 1]); return true; }
          return false;
        };
      };
      render();
    });
  }

  /* ===== Ход собеседования ===== */
  async function runInterview(runId) {
    const iv = state.iv;
    const alive = () => state.runId === runId;
    const params = () => Generator.describe(iv);

    state.phase = 'question';
    for (const g of iv.greet) { await say(g, { params: params }); if (!alive()) return; }

    for (let i = 0; i < iv.questions.length; i++) {
      const q = iv.questions[i];
      state.qIndex = i;
      renderHud();
      await say('q.' + q.id + '.text', { noWait: true });
      if (!alive()) return;
      const ans = await chooseAnswer(q);
      if (!alive()) return;
      state.answers.push(ans);
      await say(ans.key, { speaker: 'you' });
      if (!alive()) return;
      await say('common.react.' + (1 + Math.floor(Math.random() * 4)));
      if (!alive()) return;
    }

    state.phase = 'ask';
    renderHud();
    await say('common.askPrompt', { noWait: true });
    const asked = new Set();
    while (alive()) {
      const pick = await chooseAsk(asked);
      if (!alive()) return;
      if (pick === null) break;
      asked.add(pick);
      state.asked.push(pick);
      await say('ask.' + pick + '.q', { speaker: 'you' });
      await say(iv.askPrefix + pick, { params: params });
      if (!alive()) return;
      if (asked.size >= window.ASK_BANK.length) break;
      await say('common.askMore', { noWait: true });
    }
    await say('common.noMore', { speaker: 'you' });
    if (!alive()) return;
    await say(iv.closing, { params: params });
    if (!alive()) return;
    finishInterview();
  }

  /** Решение принимается здесь, а кандидат узнаёт о нём только из письма */
  function finishInterview() {
    const iv = state.iv;
    const wrong = state.answers.find((a) => !a.correct);
    const badAsk = state.asked.find((id) => iv.badAsks.includes(id));
    let cause = null;
    if (wrong) cause = { type: 'answer', qid: wrong.qid };
    else if (badAsk) cause = { type: 'ask', id: badAsk };
    else if (!state.asked.length && Math.random() < CONFIG.noQuestionFailChance) cause = { type: 'noask' };

    state.result = {
      pass: !cause,
      cause: cause,
      date: Date.now() + (3 + Math.floor(Math.random() * 4)) * DAY  // письмо приходит через 3-6 дней
    };
    state.reply = null;
    state.phase = 'mail';
    stopTyping();
    clearChoices();
    els.mail.classList.remove('hidden');
    renderMail(false);
    renderHud();
  }

  /* ===== Электронное письмо ===== */
  function reasonText() {
    const c = state.result && state.result.cause;
    if (!c) return '';
    if (c.type === 'answer') return t('reason.answer', { question: t('q.' + c.qid + '.text') });
    if (c.type === 'ask') return t('reason.ask', { ask: t('ask.' + c.id + '.q') });
    return t('reason.noask');
  }

  function fmtDate(ms) {
    try {
      return new Intl.DateTimeFormat(I18n.lang, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(ms));
    } catch (e) {
      return new Date(ms).toDateString();
    }
  }

  function msgNode(m) {
    const box = el('section', 'msg' + (m.cls ? ' ' + m.cls : ''));
    box.append(el('h3', null, m.subject));
    const dl = el('dl');
    [['ui.mail.from', m.from], ['ui.mail.to', m.to], ['ui.mail.date', m.date]].forEach((row) => {
      dl.append(el('dt', null, t(row[0])), el('dd', null, row[1]));
    });
    box.append(dl, el('div', 'body', m.body));
    return box;
  }

  function renderMail(fresh) {
    const r = state.result;
    if (!r) return;
    const info = ivInfo();
    const subj = t(r.pass ? 'mail.pass.subject' : 'mail.fail.subject', info);
    const hr = info.name + ' (' + info.company + ') <hr@' + Generator.domain(state.iv) + '>';
    const me = t('ui.mail.candidate') + ' <you@example.com>';

    els.thread.replaceChildren();
    els.thread.append(msgNode({
      subject: subj, from: hr, to: me, date: fmtDate(r.date),
      body: t(r.pass ? 'mail.pass.body' : 'mail.fail.body', info)
    }));
    if (state.reply) {
      const ask = msgNode({
        subject: 'Re: ' + subj, from: me, to: hr, date: fmtDate(r.date + DAY),
        body: t('mail.ask.body', info), cls: 'mine' + (fresh ? ' appear' : '')
      });
      const answerBody = state.reply === 'reason'
        ? t('mail.reply.reason', Object.assign({ reason: reasonText() }, info))
        : t('mail.reply.confidential', info);
      const answer = msgNode({
        subject: 'Re: Re: ' + subj, from: hr, to: me, date: fmtDate(r.date + 2 * DAY),
        body: answerBody, cls: fresh ? 'appear' : ''
      });
      els.thread.append(ask, answer);
      if (fresh) answer.style.animationDelay = '.5s';
    }

    els.stamp.textContent = t(r.pass ? 'ui.stamp.pass' : 'ui.stamp.fail');
    els.stamp.className = r.pass ? 'pass' : 'fail';
    els.why.classList.toggle('hidden', r.pass || !!state.reply);

    const showCause = state.dev && !r.pass;
    els.mailDev.classList.toggle('hidden', !showCause);
    if (showCause) els.mailDev.textContent = t('ui.dev.cause', { reason: reasonText() });

    if (fresh) {
      const sc = els.thread.parentElement;
      setTimeout(() => { sc.scrollTop = sc.scrollHeight; }, 80);
    }
  }

  function askReason() {
    if (!state.result || state.result.pass || state.reply) return;
    state.reply = Math.random() < CONFIG.reasonRevealChance ? 'reason' : 'confidential';
    renderMail(true);
  }

  /* ===== Старт ===== */
  function startGame() {
    state.runId += 1;
    stopTyping();
    clearChoices();
    state.advance = null;
    state.text = null;
    state.result = null;
    state.reply = null;
    state.answers = [];
    state.asked = [];
    state.qIndex = 0;
    state.iv = Generator.create(forcedSeed !== null ? { seed: forcedSeed } : {});
    state.phase = 'question';
    Scene.setInterviewer(state.iv);
    els.title.classList.add('hidden');
    els.mail.classList.add('hidden');
    els.dialogue.classList.remove('hidden');
    els.text.textContent = '';
    els.speaker.textContent = '';
    renderHud();
    runInterview(state.runId).catch((e) => console.error(e));
  }

  /* ===== Интерфейс ===== */
  function renderHud() {
    const inInterview = !!state.iv && (state.phase === 'question' || state.phase === 'ask');
    els.nameplate.classList.toggle('hidden', !inInterview);
    els.progress.classList.toggle('hidden', !inInterview);
    if (inInterview) {
      const info = ivInfo();
      els.npName.textContent = info.name;
      els.npRole.textContent = info.role;
      els.npCompany.textContent = info.company;
      els.npIndustry.textContent = info.industry;
      els.progress.textContent = state.phase === 'ask'
        ? t('ui.progress.ask')
        : t('ui.progress', { n: Math.min(state.qIndex + 1, state.iv.questions.length), total: state.iv.questions.length });
    }
    els.dev.textContent = t(state.dev ? 'ui.toggle.on' : 'ui.toggle.off');
    els.dev.classList.toggle('active', state.dev);
  }

  function refreshAll() {
    renderHud();
    if (state.text) {
      if (typer) finishTyping();
      renderSpeaker();
      els.text.textContent = t(state.text.key, resolve(state.text.params));
    }
    if (state.choicesView) state.choicesView();
    renderMail(false);
  }

  /* ===== Меню ===== */
  const overlayOpen = () => !els.menu.classList.contains('hidden') || !els.confirm.classList.contains('hidden');

  function openMenu() {
    els.menuRestart.classList.toggle('hidden', state.phase === 'title');  // на титуле перезапускать нечего
    els.menu.classList.remove('hidden');
  }

  // Окно подтверждения; пока оно открыто, карточка меню под ним скрыта
  function setConfirm(open) {
    els.confirm.classList.toggle('hidden', !open);
    els.menu.classList.toggle('behind', open);
  }

  function closeMenu() {
    els.menu.classList.add('hidden');
    setConfirm(false);
  }

  function setDev(on) {
    state.dev = on;
    renderHud();
    if (state.choicesView) state.choicesView();
    renderMail(false);
  }

  // Включение режима разработчика требует подтверждения: он раскрывает правильные ответы.
  // Выключение подтверждения не требует.
  function toggleDev() {
    els.dev.blur();
    if (state.dev) { setDev(false); return; }
    setConfirm(true);
  }

  /* ===== Проверка контента (предупреждения в консоль) ===== */
  function validateContent() {
    const problems = [];
    const D = window.DICT;
    const S = window.INTERVIEWER_STYLES;
    const keys = [];

    window.MOODS.forEach((m) => keys.push('mood.' + m.id));
    window.ASK_BANK.forEach((id) => keys.push('ask.' + id + '.q'));
    ['fmt.fullName', 'fmt.wordJoin', 'common.askPrompt', 'common.askMore', 'common.noMore',
      'mail.pass.subject', 'mail.pass.body', 'mail.fail.subject', 'mail.fail.body', 'mail.ask.body',
      'mail.reply.confidential', 'mail.reply.reason', 'reason.answer', 'reason.ask', 'reason.noask',
      'ui.stamp.pass', 'ui.stamp.fail', 'ui.mail.why', 'ui.chooseAsk',
      'ui.menu', 'ui.menu.title', 'ui.menu.restart', 'ui.menu.language', 'ui.menu.dev', 'ui.menu.resume',
      'ui.dev.warn', 'ui.confirm.yes', 'ui.confirm.no', 'ui.toggle.on', 'ui.toggle.off'].forEach((k) => keys.push(k));
    for (let i = 1; i <= 4; i++) keys.push('common.react.' + i);
    D.firstNames.m.concat(D.firstNames.f).forEach((id) => keys.push('name.first.' + id));
    D.lastNames.forEach((id) => keys.push('name.last.' + id));
    Object.keys(D.companyWords).forEach((dict) => D.companyWords[dict].forEach((id) => keys.push('cw.' + dict + '.' + id)));
    D.industries.forEach((id) => keys.push('industry.' + id));
    D.roles.forEach((id) => { keys.push('role.' + id + '.m', 'role.' + id + '.f'); });

    Object.keys(S).forEach((sid) => {
      const st = S[sid];
      for (let i = 1; i <= st.greetCount; i++) keys.push('style.' + sid + '.greet.' + i);
      keys.push('style.' + sid + '.closing');
      window.ASK_BANK.forEach((id) => keys.push('style.' + sid + '.ask.' + id));
      st.badAsks.forEach((id) => {
        if (window.ASK_BANK.indexOf(id) < 0) problems.push(sid + ': badAsks содержит неизвестный вопрос "' + id + '"');
      });
      st.questions.forEach((q) => {
        const bank = window.QUESTION_BANK[q.id];
        if (!bank) { problems.push(sid + ': нет вопроса "' + q.id + '" в QUESTION_BANK'); return; }
        const m = /^(\w+)\.(\d+)$/.exec(q.correct || '');
        if (!m || !bank[m[1]] || +m[2] < 1 || +m[2] > bank[m[1]]) {
          problems.push(sid + ': неверный correct у вопроса "' + q.id + '": ' + q.correct);
        }
      });
    });
    Object.keys(window.QUESTION_BANK).forEach((qid) => {
      keys.push('q.' + qid + '.text');
      window.MOODS.forEach((mood) => {
        for (let n = 1; n <= (window.QUESTION_BANK[qid][mood.id] || 0); n++) keys.push('q.' + qid + '.a.' + mood.id + '.' + n);
      });
    });

    I18n.available().forEach((l) => {
      const miss = I18n.missing(keys, l.code);
      if (miss.length) problems.push('[' + l.code + '] нет переводов: ' + miss.join(', '));
    });
    if (problems.length) console.warn('Проблемы с контентом:\n' + problems.join('\n'));
  }

  /* ===== Инициализация ===== */
  function init() {
    I18n.setFallback(CONFIG.fallbackLang);
    I18n.available().forEach((l) => {
      const o = el('option', null, l.name);
      o.value = l.code;
      els.lang.append(o);
    });
    I18n.onChange(refreshAll);
    I18n.setLang(I18n.detect(CONFIG.defaultLang));
    els.lang.value = I18n.lang;

    Scene.init($('scene'));
    Scene.setInterviewer(null);

    els.devRow.classList.toggle('hidden', !CONFIG.showDevButton);
    els.dev.addEventListener('click', toggleDev);
    els.menuBtn.addEventListener('click', () => {
      els.menuBtn.blur();  // чтобы Пробел не нажимал кнопку повторно
      if (overlayOpen()) closeMenu(); else openMenu();
    });
    els.menuClose.addEventListener('click', closeMenu);
    els.menu.addEventListener('click', (e) => { if (e.target === els.menu) closeMenu(); });
    els.menuRestart.addEventListener('click', () => { closeMenu(); startGame(); });
    els.confirmYes.addEventListener('click', () => { setConfirm(false); setDev(true); });
    els.confirmNo.addEventListener('click', () => setConfirm(false));
    els.lang.addEventListener('change', () => { I18n.setLang(els.lang.value); els.lang.blur(); });
    els.start.addEventListener('click', startGame);
    els.restart.addEventListener('click', startGame);
    els.why.addEventListener('click', askReason);
    els.dialogue.addEventListener('click', (e) => {
      if (e.target.closest('#choices')) return;
      advance();
    });

    document.addEventListener('keydown', (e) => {
      const tag = e.target && e.target.tagName;
      if (overlayOpen()) {  // пока открыто меню, игра на клавиши не реагирует; Esc закрывает меню
        if (e.key === 'Escape') {
          e.preventDefault();
          if (!els.confirm.classList.contains('hidden')) setConfirm(false);
          else closeMenu();
        }
        return;
      }
      if (tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (state.keyHandler && state.keyHandler(e)) { e.preventDefault(); return; }
      if ((e.key === ' ' || e.key === 'Enter') && tag !== 'BUTTON') {
        if (state.phase === 'question' || state.phase === 'ask') { e.preventDefault(); advance(); }
      }
    });

    validateContent();
    renderHud();
  }

  window.InterviewGame = { CONFIG: CONFIG, state: state };
  init();
})();
