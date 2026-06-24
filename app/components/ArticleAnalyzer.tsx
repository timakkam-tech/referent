"use client";

import { useState } from "react";

type Action = "summary" | "thesis" | "telegram";

const ACTIONS: { id: Action; label: string }[] = [
  { id: "summary", label: "О чем статья?" },
  { id: "thesis", label: "Тезисы" },
  { id: "telegram", label: "Пост для Telegram" },
];

export default function ArticleAnalyzer() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState("");
  const [activeAction, setActiveAction] = useState<Action | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAction(action: Action) {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setError("Введите URL статьи");
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      setError("Укажите корректный URL (например, https://example.com/article)");
      return;
    }

    setError("");
    setLoading(true);
    setActiveAction(action);
    setResult("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmedUrl, action }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Не удалось выполнить запрос");
      }

      setResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
      setActiveAction(null);
    } finally {
      setLoading(false);
    }
  }

  const activeLabel =
    ACTIONS.find((item) => item.id === activeAction)?.label ?? null;

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
            placeholder="https://example.com/article"
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            disabled={loading}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          {ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => handleAction(action.id)}
              disabled={loading}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
            >
              {action.label}
            </button>
          ))}
        </div>
      </form>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="mt-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-700">Результат</h2>
          {activeLabel && !loading && result && (
            <span className="text-xs text-zinc-500">{activeLabel}</span>
          )}
        </div>

        <div
          className="min-h-48 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-zinc-800"
          aria-live="polite"
          aria-busy={loading}
        >
          {loading ? (
            <div className="flex items-center gap-3 text-zinc-600">
              <span
                className="size-5 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600"
                aria-hidden="true"
              />
              <span>Парсинг статьи…</span>
            </div>
          ) : result ? (
            <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-sm leading-relaxed">
              {result}
            </pre>
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
