"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Copy } from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { ERROR_MESSAGES, ErrorCode } from "@/lib/errors";

import MarkdownContent from "./MarkdownContent";

type Action = "summary" | "thesis" | "telegram" | "translate" | "illustration";

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
  {
    id: "illustration",
    label: "Иллюстрация",
    title: "Изображение по содержанию статьи",
  },
];

const STATUS_TEXTS: Record<Action, string> = {
  summary: "Загружаю статью и анализирую содержание…",
  thesis: "Загружаю статью и формирую тезисы…",
  telegram: "Загружаю статью и готовлю пост для Telegram…",
  translate: "Загружаю статью и перевожу текст…",
  illustration: "Готовлю промпт и генерирую иллюстрацию…",
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
  const resultSectionRef = useRef<HTMLElement>(null);
  const [url, setUrl] = useState("");
  const [result, setResult] = useState("");
  const [imageResult, setImageResult] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [activeAction, setActiveAction] = useState<Action | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const hasResult = Boolean(result || imageResult);

  function showError(code: ErrorCode, message?: string) {
    setErrorCode(code);
    setErrorMessage(message ?? ERROR_MESSAGES[code]);
    setActiveAction(null);
  }

  function clearError() {
    setErrorCode(null);
    setErrorMessage("");
  }

  function handleClear() {
    setUrl("");
    setResult("");
    setImageResult("");
    setImagePrompt("");
    setActiveAction(null);
    setLoading(false);
    setErrorCode(null);
    setErrorMessage("");
    setCopied(false);
  }

  async function handleCopy() {
    const textToCopy = result || imagePrompt;

    if (!textToCopy) {
      return;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    if (!hasResult || loading) {
      return;
    }

    resultSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [hasResult, loading, result, imageResult]);

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
    setImageResult("");
    setImagePrompt("");
    setCopied(false);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmedUrl, action }),
      });

      const data = (await response.json()) as ApiErrorPayload & {
        result?: string;
        image?: string;
        prompt?: string;
      };

      if (!response.ok) {
        showError(
          data.error?.code ?? ErrorCode.UNKNOWN,
          getFriendlyErrorMessage(data),
        );
        return;
      }

      if (action === "illustration") {
        if (typeof data.image !== "string" || !data.image.startsWith("data:")) {
          showError(ErrorCode.UNKNOWN);
          return;
        }

        setImageResult(data.image);
        setImagePrompt(
          typeof data.prompt === "string" ? data.prompt.trim() : "",
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
  const canCopy = Boolean(result || imagePrompt);

  return (
    <div className="mx-auto w-full min-w-0 max-w-2xl overflow-x-hidden px-4 py-8 sm:px-6 sm:py-12 md:py-16">
      <header className="mb-8 md:mb-10">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          Referent
        </h1>
        <p className="mt-2 break-words text-sm text-zinc-600 sm:text-base">
          Вставьте ссылку на англоязычную статью и выберите действие
        </p>
      </header>

      <form
        onSubmit={(e) => e.preventDefault()}
        className="space-y-5 sm:space-y-6"
      >
        <div className="min-w-0">
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
            placeholder="https://example.com/article"
            className="w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
            disabled={loading}
          />
          <p className="mt-2 break-words text-xs text-zinc-500">
            Укажите ссылку на англоязычную статью
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              title={action.title}
              onClick={() => handleAction(action.id)}
              disabled={loading}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
        </div>

        <div className="flex sm:justify-end">
          <button
            type="button"
            onClick={handleClear}
            disabled={loading}
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            Очистить
          </button>
        </div>
      </form>

      {errorMessage && (
        <Alert variant="destructive" className="mt-4 break-words">
          <AlertCircle className="size-4" />
          <AlertTitle>{getErrorTitle(errorCode ?? undefined)}</AlertTitle>
          <AlertDescription className="break-words">
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}

      {loading && statusText && (
        <div
          className="mt-6 flex min-w-0 items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 sm:mt-8"
          aria-live="polite"
          aria-busy="true"
        >
          <span
            className="mt-0.5 size-4 shrink-0 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600"
            aria-hidden="true"
          />
          <span className="min-w-0 break-words">{statusText}</span>
        </div>
      )}

      <section ref={resultSectionRef} className="mt-6 scroll-mt-6 sm:mt-8">
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-medium text-zinc-700">Результат</h2>
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
            {activeLabel && !loading && hasResult && (
              <span className="text-xs text-zinc-500">{activeLabel}</span>
            )}
            {canCopy && !loading && (
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
              >
                {copied ? (
                  <>
                    <Check className="size-3.5" aria-hidden="true" />
                    Скопировано
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" aria-hidden="true" />
                    {imageResult ? "Копировать промпт" : "Копировать"}
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="min-h-40 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-zinc-800 sm:min-h-48">
          {imageResult ? (
            <div className="space-y-3">
              <img
                src={imageResult}
                alt="Иллюстрация к статье"
                className="mx-auto max-h-[32rem] w-full rounded-md object-contain"
              />
              {imagePrompt && (
                <p className="break-words text-xs leading-relaxed text-zinc-500">
                  Промпт: {imagePrompt}
                </p>
              )}
            </div>
          ) : result ? (
            <MarkdownContent content={result} />
          ) : (
            <p className="break-words text-sm text-zinc-500 sm:text-base">
              Здесь появится результат после выбора действия
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
