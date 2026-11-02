/*
 * Банк вопросов и настроений. Здесь нет текстов, только структура.
 * Тексты лежат в locales/*.js по ключам:
 *   q.<id>.text                 - вопрос интервьюера
 *   q.<id>.a.<настроение>.<n>   - n-й вариант ответа (n с 1)
 *   mood.<id>                   - название настроения
 *   ask.<id>.q                  - вопрос кандидата интервьюеру
 */

// Порядок здесь = порядок кнопок настроения
window.MOODS = [
  { id: 'serious',   icon: '😐' },
  { id: 'cheerful',  icon: '😄' },
  { id: 'thoughtful', icon: '🤔' },
  { id: 'confident', icon: '😎' }
];

// id вопроса -> сколько вариантов ответа для каждого настроения
window.QUESTION_BANK = {
  intro:    { serious: 3, cheerful: 3, thoughtful: 3, confident: 3 },
  motive:   { serious: 3, cheerful: 3, thoughtful: 3, confident: 3 },
  strength: { serious: 3, cheerful: 3, thoughtful: 3, confident: 3 },
  overtime: { serious: 3, cheerful: 3, thoughtful: 3, confident: 3 },
  future:   { serious: 3, cheerful: 3, thoughtful: 3, confident: 3 }
};

// Вопросы кандидата, которые можно задать в конце (ответы зависят от стиля интервьюера).
// Какие из них ведут к отказу, задаёт badAsks в data/styles.js.
window.ASK_BANK = [
  'team', 'training', 'hours', 'salary', 'overtime', 'bonus',
  'remote', 'trips', 'vacation', 'career', 'next'
];

// Если кандидат не задал ни одного вопроса - отказ с такой вероятностью
window.NO_QUESTION_FAIL_CHANCE = 0.9;
