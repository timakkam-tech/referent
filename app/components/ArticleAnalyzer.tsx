"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { ERROR_MESSAGES, ErrorCode } from "@/lib/errors";

type Action = "summary" | "thesis" | "telegram" | "translate";

type ApiErrorPayload = {
  error?: {
    code?: ErrorCode;
    message?: string;
  };
};

const ACTIONS: { id: Action; label: string; title: string }[] = [
  {
    id: "summary",
    label: "О чем статья?",
    title: "Краткое описание содержания статьи на русском",
  },
  {
    id: "thesis",
    label: "Тезисы",
    title: "Список ключевых тезисов и главных мыслей статьи",
  },
  {
    id: "telegram",
    label: "Пост для Telegram",
    title: "Готовый пост для публикации в Telegram",
  },
  {
    id: "translate",
    label: "Перевод",
    title: "Перевод статьи на русский язык",
  },
];

const STATUS_TEXTS: Record<Action, string> = {
  summary: "Загружаю статью и анализирую содержание…",
  thesis: "Загружаю статью и формирую тезисы…",
  telegram: "Загружаю статью и готовлю пост для Telegram…",
  translate: "Загружаю статью и перевожу текст…",
};

const ERROR_TITLES: Partial<Record<ErrorCode, string>> = {
  URL_REQUIRED: "Нужен адрес статьи",
  URL_INVALID: "Некорректная ссылка",
  ARTICLE_LOAD_FAILED: "Статья не загрузилась",
  ARTICLE_PARSE_FAILED: "Не удалось прочитать статью",
  AI_UNAVAILABLE: "AI недоступен",
  AI_AUTH_FAILED: "Проблема с доступом к AI",
  AI_TIMEOUT: "Слишком долго",
  AI_EMPTY_RESPONSE: "Пустой ответ",
  UNKNOWN: "Ошибка",
};

function getErrorTitle(code?: ErrorCode): string {
  if (code && ERROR_TITLES[code]) {
    return ERROR_TITLES[code]!;
  }

  return ERROR_TITLES.UNKNOWN!;
}

function getFriendlyErrorMessage(data: ApiErrorPayload): string {
  const code = data.error?.code;
  const message = data.error?.message;

  if (message) {
    return message;
  }

  if (code && ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }

  return ERROR_MESSAGES.UNKNOWN;
}

export default function ArticleAnalyzer() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState("");
  const [activeAction, setActiveAction] = useState<Action | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  function showError(code: ErrorCode, message?: string) {
    setErrorCode(code);
    setErrorMessage(message ?? ERROR_MESSAGES[code]);
    setActiveAction(null);
  }

  function clearError() {
    setErrorCode(null);
    setErrorMessage("");
  }

  async function handleAction(action: Action) {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      showError(ErrorCode.URL_REQUIRED);
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      showError(ErrorCode.URL_INVALID);
      return;
    }

    clearError();
    setLoading(true);
    setActiveAction(action);
    setResult("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmedUrl, action }),
      });

      const data = (await response.json()) as ApiErrorPayload & {
        result?: string;
      };

      if (!response.ok) {
        showError(
          data.error?.code ?? ErrorCode.UNKNOWN,
          getFriendlyErrorMessage(data),
        );
        return;
      }

      if (typeof data.result !== "string") {
        showError(ErrorCode.UNKNOWN);
        return;
      }

      setResult(data.result);
    } catch {
      showError(ErrorCode.UNKNOWN);
    } finally {
      setLoading(false);
    }
  }

  const activeLabel =
    ACTIONS.find((item) => item.id === activeAction)?.label ?? null;

  const statusText = activeAction ? STATUS_TEXTS[activeAction] : null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Referent
        </h1>
        <p className="mt-2 text-zinc-600">
          Вставьте ссылку на англоязычную статью и выберите действие
        </p>
      </header>

      <form
        onSubmit={(e) => e.preventDefault()}
        className="space-y-6"
      >
        <div>
          <label
            htmlFor="article-url"
            className="mb-2 block text-sm font-medium text-zinc-700"
          >
            URL статьи
          </label>
          <input
            id="article-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Введите URL статьи, например: https://example.com/article"
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            disabled={loading}
          />
          <p className="mt-2 text-xs text-zinc-500">
            Укажите ссылку на англоязычную статью
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              title={action.title}
              onClick={() => handleAction(action.id)}
              disabled={loading}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
        </div>
      </form>

      {errorMessage && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="size-4" />
          <AlertTitle>{getErrorTitle(errorCode ?? undefined)}</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {loading && statusText && (
        <div
          className="mt-8 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800"
          aria-live="polite"
          aria-busy="true"
        >
          <span
            className="size-4 shrink-0 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600"
            aria-hidden="true"
          />
          <span>{statusText}</span>
        </div>
      )}

      <section className="mt-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-700">Результат</h2>
          {activeLabel && !loading && result && (
            <span className="text-xs text-zinc-500">{activeLabel}</span>
          )}
        </div>

        <div className="min-h-48 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-zinc-800">
          {result ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {result}
            </p>
          ) : (
            <p className="text-zinc-500">
              Здесь появится результат после выбора действия
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
