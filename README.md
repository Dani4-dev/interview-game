# Job Interview (game)

Run: open `index.html` in a browser (no server needed).

URL parameters: `?seed=123` fixes the interviewer (handy for debugging), `?lang=ja` sets the language (ru, en, ja).

## How the game goes

1. The interviewer (name, company, industry and appearance are generated) greets you and asks 5 questions.
2. For each question you pick a mood, then one of the answers. Exactly one answer is correct; it depends on the interviewer's style (`traditional` / `modern`, which can be guessed from the greeting).
3. Then you can ask the interviewer questions (salary, overtime, bonus, remote work, business trips, vacation, career, etc.). Some of them lead to rejection for a given style.
4. The interviewer says the result will come within a week, and the screen switches to an email with a big "Accepted"/"Rejected" stamp.
5. On rejection there is a "Try to ask for the reason" button: 90% of the time the answer cites confidentiality, 10% of the time the real reason is given.

Rejection happens if: at least one answer is wrong; or a "bad" question was asked; or no questions were asked at all (in 90% of cases, see `NO_QUESTION_FAIL_CHANCE`).

## Menu

The "Menu" button in the top-right corner (Esc closes it): "Start over" (new interviewer), language choice, developer mode, "Resume game".

## Phones

The layout adapts to the screen: in portrait the picture is on top and the dialogue fills the rest; in landscape on a short screen the picture is on top and the dialogue below. The interviewer's nameplate (name and company) sits on the bottom edge of the picture, half hidden behind the dialogue box. On touch screens buttons are larger and key hints are hidden.

## Developer mode

Turned on in the menu; before enabling, a warning is shown: "With developer mode all correct answers will be visible and the idea of the game will be lost. Continue?" (turning it off needs no confirmation).
In this mode the correct mood and answer are highlighted in green, questions to the interviewer that lead to rejection in red; the rejection email shows the real reason.
To remove the switch from the menu entirely: `CONFIG.showDevButton = false` at the top of `js/game.js`.

## Structure

| File | Contents |
|---|---|
| `index.html`, `style.css` | markup and styling |
| `js/i18n.js` | localization: `I18n.t(key, params)` |
| `js/generator.js` | interviewer generator: name, company, industry, role, style, appearance, office |
| `js/scene.js` | pixel-art scene; two body templates (male/female) and random details |
| `js/game.js` | game flow, email; `CONFIG` at the top of the file |
| `data/dictionaries.js` | dictionaries: first names, last names, 4 word lists for company names, industries, roles |
| `data/styles.js` | interviewer styles: correct answers, "bad" questions |
| `data/questions.js` | moods, interviewer questions, list of candidate questions |
| `locales/ru.js`, `en.js`, `ja.js` | all game texts |

## Generation

- Company name: 1 to 4 words, each from its own dictionary (`companyWords` in `data/dictionaries.js`: prefix, nature, value, type).
- Appearance: gender (template), jacket/shirt/tie colors, hairstyle and hair color, gray hair, mustache, wrinkles, moles, glasses, earrings, pin, necklace, hair clip, badge.
- The interviewer stores only word ids; texts come from the localization dictionaries, so name and company are translated automatically when the language changes.

## Adding a language

Copy `locales/en.js` to `locales/xx.js`, change the code and name in `I18n.register('xx', {...}, { name: '...' })`, translate the values, and include the file in `index.html`. The language appears in the list automatically. Missing keys fall back to English, and the list of missing ones is printed to the browser console on load.

## Extending

- New word/name/industry: add an id in `data/dictionaries.js` and a key (`name.first.<id>`, `cw.<dictionary>.<id>`, `industry.<id>`) in every localization file.
- New candidate question: add an id to `ASK_BANK` (`data/questions.js`), texts `ask.<id>.q` and `style.<style>.ask.<id>`; if it leads to rejection, add it to `badAsks` of the relevant style.
- New interviewer style: an object in `data/styles.js` and texts `style.<id>.*`.

---

# 面接ゲーム

起動方法:ブラウザで `index.html` を開くだけです(サーバー不要)。

URLパラメータ:`?seed=123` で面接官を固定(デバッグに便利)、`?lang=ja` で言語を指定(ru, en, ja)。

## ゲームの流れ

1. 面接官(名前・会社・業界・外見は自動生成)が挨拶し、5つの質問をします。
2. 各質問で、まず気分を選び、次に回答を1つ選びます。正解は1つだけで、面接官のスタイル(`traditional` / `modern`、挨拶から推測できます)によって変わります。
3. その後、面接官に質問できます(給与、残業、ボーナス、リモートワーク、出張、休暇、キャリアなど)。スタイルによっては、一部の質問が不合格につながります。
4. 面接官が「結果は1週間以内にお知らせします」と伝え、画面が大きな「合格」/「不合格」スタンプ付きのメールに切り替わります。
5. 不合格の場合は「理由を聞いてみる」ボタンがあります。90%は守秘義務を理由に断られ、10%で本当の理由が明かされます。

不合格になる条件:回答が1つでも間違っている/「悪い」質問をした/質問を1つもしなかった(90%の確率。`NO_QUESTION_FAIL_CHANCE` を参照)。

## メニュー

右上の「メニュー」ボタン(Escで閉じます):「最初から」(新しい面接官)、言語選択、開発者モード、「ゲームに戻る」。

## スマートフォン

画面に合わせてレイアウトが変わります。縦向きでは上に絵、残りが会話欄です。高さの低い横向き画面でも上が絵、下が会話欄です。面接官の名札(名前と会社)は絵の下端に置かれ、会話ウィンドウの後ろに半分隠れます。タッチ画面ではボタンが大きくなり、キー操作のヒントは非表示になります。

## 開発者モード

メニューでオンにします。オンにする前に警告が表示されます:「開発者モードではすべての正解が見えてしまい、ゲームの面白さが失われます。続行しますか?」(オフにするときは確認不要)。
このモードでは、正しい気分と回答が緑、不合格につながる面接官への質問が赤で強調され、不合格メールには本当の理由が表示されます。
メニューからスイッチ自体を消すには、`js/game.js` の冒頭で `CONFIG.showDevButton = false` にします。

## 構成

| ファイル | 内容 |
|---|---|
| `index.html`, `style.css` | マークアップとスタイル |
| `js/i18n.js` | 多言語化:`I18n.t(キー, パラメータ)` |
| `js/generator.js` | 面接官ジェネレーター:名前、会社、業界、役職、スタイル、外見、部屋 |
| `js/scene.js` | ピクセルアートのシーン。男女2つの体型テンプレートとランダムな装飾 |
| `js/game.js` | ゲームの進行、メール。ファイル冒頭に `CONFIG` |
| `data/dictionaries.js` | 辞書:名、姓、会社名用の4つの単語辞書、業界、役職 |
| `data/styles.js` | 面接官のスタイル:正解、「悪い」質問 |
| `data/questions.js` | 気分、面接官の質問、応募者の質問リスト |
| `locales/ru.js`, `en.js`, `ja.js` | ゲームの全テキスト |

## 生成

- 会社名:1〜4語で、各語はそれぞれ別の辞書から選ばれます(`data/dictionaries.js` の `companyWords`:prefix, nature, value, type)。
- 外見:性別(テンプレート)、ジャケット/シャツ/ネクタイの色、髪型と髪色、白髪、口ひげ、しわ、ほくろ、眼鏡、イヤリング、ピンバッジ、ネックレス、ヘアクリップ、名札。
- 面接官は単語のIDだけを保持し、テキストは各言語の辞書から取得します。そのため、言語を切り替えると名前や会社名も自動的に翻訳されます。

## 言語の追加

`locales/en.js` を `locales/xx.js` にコピーし、`I18n.register('xx', {...}, { name: '...' })` のコードと名前を変更して、値を翻訳し、`index.html` にファイルを追加します。言語は自動的に一覧に表示されます。不足しているキーは英語で補われ、不足キーの一覧は読み込み時にブラウザのコンソールに出力されます。

## 拡張

- 新しい単語/名前/業界:`data/dictionaries.js` にIDを追加し、各言語ファイルにキー(`name.first.<id>`, `cw.<辞書>.<id>`, `industry.<id>`)を追加します。
- 応募者の新しい質問:`ASK_BANK`(`data/questions.js`)にIDを追加し、テキスト `ask.<id>.q` と `style.<スタイル>.ask.<id>` を追加します。不合格につながる場合は、該当スタイルの `badAsks` に追加します。
- 新しい面接官スタイル:`data/styles.js` にオブジェクトを追加し、テキスト `style.<id>.*` を追加します。

---

# Собеседование (игра)

Запуск: открыть `index.html` в браузере (сервер не нужен).

Параметры адреса: `?seed=123` — зафиксировать интервьюера (удобно для отладки), `?lang=ja` — язык (ru, en, ja).

## Как проходит игра

1. Интервьюер (имя, компания, отрасль и внешность генерируются) здоровается и задаёт 5 вопросов.
2. На каждый вопрос выбирается настроение, затем один из ответов. Верный ответ ровно один, зависит от стиля интервьюера (`traditional` / `modern`, его видно по приветствию).
3. Затем можно задать интервьюеру вопросы (зарплата, переработки, бонус, удалёнка, командировки, отпуск, карьера и др.). Часть из них для данного стиля ведёт к отказу.
4. Интервьюер говорит, что результат сообщат в течение недели, и экран сменяется письмом с крупным штампом «Принят»/«Отказ».
5. При отказе есть кнопка «Попытаться спросить причину»: в 90% случаев ответ ссылается на конфиденциальность, в 10% причина называется.

Отказ, если: хотя бы один неверный ответ; или задан «плохой» вопрос; или не задано ни одного вопроса (в 90% случаев, см. `NO_QUESTION_FAIL_CHANCE`).

## Меню

Кнопка «Меню» в правом верхнем углу (Esc закрывает): «Начать заново» (новый интервьюер), выбор языка, режим разработчика, «Продолжить игру».

## Телефоны

Раскладка подстраивается под экран: в портрете картинка сверху, диалог занимает остальное; в ландшафте на низком экране картинка сверху, диалог снизу. Табличка интервьюера (имя и компания) стоит на нижнем краю картинки и наполовину спрятана за окном диалога. На сенсорных экранах кнопки крупнее, подсказки про клавиши скрыты.

## Режим разработчика

Включается в меню; перед включением показывается предупреждение: «С режимом разработчика будут видны все правильные ответы, и задумка игры пропадёт. Продолжить?» (выключение подтверждения не требует).
В режиме верные настроение и ответ подсвечиваются зелёным, вопросы интервьюеру, ведущие к отказу, — красным; в письме с отказом показывается настоящая причина.
Убрать переключатель из меню совсем: `CONFIG.showDevButton = false` в начале `js/game.js`.

## Структура

| Файл | Что внутри |
|---|---|
| `index.html`, `style.css` | разметка и оформление |
| `js/i18n.js` | локализация: `I18n.t(ключ, параметры)` |
| `js/generator.js` | генератор интервьюера: имя, компания, отрасль, должность, стиль, внешность, кабинет |
| `js/scene.js` | пиксельная сцена; два шаблона тела (мужской/женский) и случайные детали |
| `js/game.js` | ход игры, письмо; в начале файла `CONFIG` |
| `data/dictionaries.js` | словари: имена, фамилии, 4 словаря слов для названия компании, отрасли, должности |
| `data/styles.js` | стили интервьюеров: верные ответы, «плохие» вопросы |
| `data/questions.js` | настроения, вопросы интервьюера, список вопросов кандидата |
| `locales/ru.js`, `en.js`, `ja.js` | все тексты игры |

## Генерация

- Название компании — от 1 до 4 слов, каждое из своего словаря (`companyWords` в `data/dictionaries.js`: prefix, nature, value, type).
- Внешность: пол (шаблон), цвет пиджака/рубашки/галстука, причёска и цвет волос, седина, усы, морщины, родинки, очки, серьги, значок, ожерелье, заколка, бейдж.
- Интервьюер хранит только id слов; тексты берутся из словарей локализации, поэтому при смене языка имя и компания переводятся сами.

## Добавить язык

Скопировать `locales/en.js` в `locales/xx.js`, заменить код и название в `I18n.register('xx', {...}, { name: '...' })`, перевести значения, подключить файл в `index.html`. Язык появится в списке сам. Недостающие ключи берутся из английского, а список пропущенных выводится в консоль браузера при загрузке.

## Расширять

- Новое слово/имя/отрасль: добавить id в `data/dictionaries.js` и ключ (`name.first.<id>`, `cw.<словарь>.<id>`, `industry.<id>`) в каждый словарь локализации.
- Новый вопрос кандидата: id в `ASK_BANK` (`data/questions.js`), тексты `ask.<id>.q` и `style.<стиль>.ask.<id>`; если он ведёт к отказу — добавить в `badAsks` нужного стиля.
- Новый стиль интервьюера: объект в `data/styles.js` и тексты `style.<id>.*`.
