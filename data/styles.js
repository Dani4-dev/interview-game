/*
 * Стили интервьюеров (замена прежнего списка фиксированных интервьюеров).
 * Стиль определяет, какие ответы считаются верными, и тексты приветствия:
 *   traditional - ценит скромность, гармонию и верность компании
 *   modern      - ценит инициативу, конкретные результаты и баланс работы и жизни
 *
 * Тексты: style.<id>.greet.<n>, style.<id>.closing, style.<id>.ask.<id вопроса кандидата>
 * Правильный ответ на вопрос ровно один: correct: '<настроение>.<номер>'.
 * badAsks - вопросы кандидата (из ASK_BANK), после которых будет отказ. Остальные безопасны.
 * Новый стиль: добавить объект сюда и тексты в locales/*.js.
 */
window.INTERVIEWER_STYLES = {
  traditional: {
    greetCount: 3,
    badAsks: ['salary', 'bonus', 'remote', 'vacation', 'overtime'],
    questions: [
      { id: 'intro',    correct: 'serious.1' },
      { id: 'motive',   correct: 'thoughtful.1' },
      { id: 'strength', correct: 'serious.1' },
      { id: 'overtime', correct: 'serious.1' },
      { id: 'future',   correct: 'thoughtful.1' }
    ]
  },
  modern: {
    greetCount: 3,
    badAsks: ['hours', 'vacation'],
    questions: [
      { id: 'intro',    correct: 'confident.2' },
      { id: 'motive',   correct: 'cheerful.2' },
      { id: 'strength', correct: 'confident.1' },
      { id: 'overtime', correct: 'thoughtful.1' },
      { id: 'future',   correct: 'confident.1' }
    ]
  }
};
