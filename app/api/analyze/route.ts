import { NextRequest, NextResponse } from "next/server";

type Action = "summary" | "thesis" | "telegram";

const PLACEHOLDERS: Record<Action, string> = {
  summary:
    "Краткое содержание статьи появится здесь после подключения AI и парсинга страницы.",
  thesis:
    "Список тезисов появится здесь после подключения AI и парсинга страницы.",
  telegram:
    "Текст поста для Telegram появится здесь после подключения AI и парсинга страницы.",
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

  if (!PLACEHOLDERS[action]) {
    return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
  }

  return NextResponse.json({
    result: `${PLACEHOLDERS[action]}\n\nСтатья: ${url}`,
  });
}
