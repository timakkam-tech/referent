import { NextRequest, NextResponse } from "next/server";
import {
  extractTheses,
  generateTelegramPost,
  summarizeArticle,
  translateArticle,
} from "@/lib/openrouter";
import { fetchAndParseArticle } from "@/lib/parse-article";

export const maxDuration = 300;

type Action = "summary" | "thesis" | "telegram" | "translate";

const VALID_ACTIONS: Action[] = ["summary", "thesis", "telegram", "translate"];

const AI_HANDLERS: Record<
  Action,
  (title: string | null, content: string) => Promise<string>
> = {
  summary: summarizeArticle,
  thesis: extractTheses,
  telegram: generateTelegramPost,
  translate: translateArticle,
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const action = body.action as Action;

  if (!url) {
    return NextResponse.json({ error: "URL не указан" }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Некорректный URL" }, { status: 400 });
  }

  if (!VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
  }

  try {
    const article = await fetchAndParseArticle(url);

    if (!article.title && !article.content) {
      return NextResponse.json(
        { error: "Не удалось извлечь содержимое статьи" },
        { status: 422 },
      );
    }

    if (!article.content) {
      return NextResponse.json(
        { error: "Не удалось извлечь текст статьи" },
        { status: 422 },
      );
    }

    const result = await AI_HANDLERS[action](article.title, article.content);
    return NextResponse.json({ result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Ошибка при обработке статьи";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
