# План добавления функций кнопок

На основании [PROJECT.md](./PROJECT.md).

## Текущее состояние

| Кнопка | Статус |
|--------|--------|
| О чем статья? | Только парсинг → JSON `{ date, title, content }` |
| Тезисы | Только парсинг → JSON |
| Пост для Telegram | Только парсинг → JSON |
| Перевод | Парсинг + AI (OpenRouter / DeepSeek) → текст |

Общая цепочка уже работает: **URL → парсинг → действие → результат**.

---

## Порядок действий

### Шаг 1. Вынести общую логику OpenRouter

**Файл:** `lib/openrouter.ts`

1. Выделить общую функцию `callOpenRouter(systemPrompt, userContent)` — запрос к `https://openrouter.ai/api/v1/chat/completions`, модель `deepseek/deepseek-chat`, ключ из `OPENROUTER_API_KEY`.
2. Перевести `translateArticle` на использование этой функции.
3. Добавить три новые функции с отдельными system-промптами:
   - `summarizeArticle(title, content)` — «О чем статья?»
   - `extractTheses(title, content)` — «Тезисы»
   - `generateTelegramPost(title, content)` — «Пост для Telegram»

**Промпты (черновик):**

| Действие | System prompt |
|----------|---------------|
| summary | Кратко опиши на русском, о чём статья. 3–5 предложений. Только суть, без вводных фраз. |
| thesis | Выдели 5–10 ключевых тезисов статьи на русском. Нумерованный список. |
| telegram | Напиши пост для Telegram на русском: цепляющий заголовок, 2–3 абзаца, уместные эмодзи, до 1500 символов. |

---

### Шаг 2. Подключить AI-действия в API

**Файл:** `app/api/analyze/route.ts`

1. После `fetchAndParseArticle(url)` проверить наличие `article.content`.
2. По значению `action` вызвать нужную функцию:

```
summary   → summarizeArticle(article.title, article.content)
thesis    → extractTheses(article.title, article.content)
telegram  → generateTelegramPost(article.title, article.content)
translate → translateArticle(...)  // уже есть
```

3. Вернуть единый формат ответа: `{ result: string }`.
4. Убрать возврат сырого JSON для `summary`, `thesis`, `telegram`.

---

### Шаг 3. Обновить интерфейс

**Файл:** `app/components/ArticleAnalyzer.tsx`

1. Для всех AI-действий (`summary`, `thesis`, `telegram`, `translate`) показывать `data.result` как текст.
2. Обновить тексты загрузки:
   - «О чем статья?» → «Анализ статьи…»
   - «Тезисы» → «Формирование тезисов…»
   - «Пост для Telegram» → «Генерация поста…»
3. Убрать `JSON.stringify` для AI-ответов — результат всегда читаемый текст.

---

### Шаг 4. Ограничить длину текста для AI

**Файл:** `lib/openrouter.ts` (или `lib/parse-article.ts`)

1. Обрезать `content` до ~30 000 символов перед отправкой в модель (как в переводе).
2. При необходимости — брать первые N абзацев, если статья очень длинная.

---

### Шаг 5. Проверить локально

1. Убедиться, что в `.env.local` заданы `OPENROUTER_API_KEY` и `OPENAI_BASE_URL`.
2. Запустить `npm run dev`.
3. Протестировать каждую кнопку на 1–2 англоязычных статьях.
4. Проверить: результат на русском, осмысленный, без ошибок API.

---

### Шаг 6. Сборка и деплой

1. `npm run build` — убедиться, что нет ошибок TypeScript.
2. Закоммитить изменения.
3. Push в `main` → автодеплой на Vercel.
4. Проверить, что на Vercel заданы `OPENROUTER_API_KEY` и `OPENAI_BASE_URL`.
5. Протестировать все три кнопки на https://referent-sooty.vercel.app.

---

## Структура файлов после реализации

```
lib/
  openrouter.ts      — общий клиент + 4 AI-функции
  parse-article.ts   — парсинг HTML (без изменений)

app/
  api/analyze/route.ts           — маршрутизация action → AI-функция
  components/ArticleAnalyzer.tsx — UI, вывод result
```

---

## Зависимости между шагами

```
Шаг 1 (openrouter.ts)
    ↓
Шаг 2 (API route)
    ↓
Шаг 3 (UI)
    ↓
Шаг 4 (лимиты текста) — можно параллельно со Шагом 1
    ↓
Шаг 5 (локальные тесты)
    ↓
Шаг 6 (деплой)
```

---

## Риски и как их учесть

| Риск | Решение |
|------|---------|
| Статья не парсится | Сообщение об ошибке 422, предложить другой URL |
| OpenRouter недоступен / нет ключа | Понятная ошибка в UI |
| Слишком длинная статья | Обрезка текста перед запросом |
| Модель отвечает не на русском | Уточнить в system prompt: «Отвечай только на русском» |
