/*
 * Словари для генерации интервьюера. Здесь только идентификаторы, без текстов.
 * Тексты лежат в locales/*.js по ключам:
 *   name.first.<id>        имя
 *   name.last.<id>         фамилия
 *   cw.<словарь>.<id>      слово для названия компании
 *   industry.<id>          отрасль
 *   role.<id>.<m|f>        должность (форма по полу интервьюера)
 * Чтобы добавить запись, допишите id сюда и переведите ключ в каждом словаре локализации.
 */
window.DICT = {
  firstNames: {
    m: ['hiroshi', 'takeshi', 'kenji', 'daisuke', 'ryo', 'satoshi', 'haruto', 'kazuo', 'naoki', 'shinji'],
    f: ['yuki', 'aiko', 'hana', 'emi', 'mio', 'sakura', 'rin', 'keiko', 'yumi', 'noriko']
  },

  lastNames: [
    'tanaka', 'sato', 'suzuki', 'takahashi', 'watanabe', 'ito', 'yamamoto', 'nakamura',
    'kobayashi', 'kato', 'yoshida', 'yamada', 'sasaki', 'matsumoto', 'inoue', 'kimura'
  ],

  // Название компании = от 1 до 4 слов, каждое из своего словаря.
  // Порядок ключей здесь = порядок слов в названии.
  companyWords: {
    prefix: ['neo', 'next', 'grand', 'prime', 'royal', 'global', 'star', 'omega'],
    nature: ['sakura', 'fuji', 'kaze', 'umi', 'tsuki', 'hikari', 'take', 'matsu', 'yama', 'sora'],
    value:  ['harmony', 'trust', 'horizon', 'unity', 'pioneer', 'vision', 'summit', 'spirit'],
    type:   ['group', 'holdings', 'systems', 'works', 'labs', 'industries', 'partners', 'solutions']
  },

  industries: ['trading', 'it', 'auto', 'food', 'logistics', 'electronics', 'construction', 'finance', 'pharma', 'robotics'],

  roles: ['hr', 'dept', 'cto', 'director', 'manager']
};
