import { NextRequest, NextResponse } from "next/server";
import {
  extractTheses,
  generateTelegramPost,
  summarizeArticle,
  translateArticle,
} from "@/lib/openrouter";
import {
  AppError,
  ErrorCode,
  getHttpStatusForError,
  toApiErrorResponse,
} from "@/lib/errors";
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
    const error = new AppError(ErrorCode.URL_REQUIRED);
    return NextResponse.json(toApiErrorResponse(error), {
      status: getHttpStatusForError(error.code),
    });
  }

  try {
    new URL(url);
  } catch {
    const error = new AppError(ErrorCode.URL_INVALID);
    return NextResponse.json(toApiErrorResponse(error), {
      status: getHttpStatusForError(error.code),
    });
  }

  if (!VALID_ACTIONS.includes(action)) {
    const error = new AppError(ErrorCode.ACTION_INVALID);
    return NextResponse.json(toApiErrorResponse(error), {
      status: getHttpStatusForError(error.code),
    });
  }

  try {
    const article = await fetchAndParseArticle(url);

    if (!article.title && !article.content) {
      const error = new AppError(ErrorCode.ARTICLE_PARSE_FAILED);
      return NextResponse.json(toApiErrorResponse(error), {
        status: getHttpStatusForError(error.code),
      });
    }

    if (!article.content) {
      const error = new AppError(ErrorCode.ARTICLE_PARSE_FAILED);
      return NextResponse.json(toApiErrorResponse(error), {
        status: getHttpStatusForError(error.code),
      });
    }

    const result = await AI_HANDLERS[action](article.title, article.content);
    return NextResponse.json({ result });
  } catch (err) {
    const payload = toApiErrorResponse(err);
    return NextResponse.json(payload, {
      status: getHttpStatusForError(payload.error.code),
    });
  }
}
