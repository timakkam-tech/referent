import { prepareContentForAi } from "@/lib/prepare-content";
import { AppError, ErrorCode } from "@/lib/errors";

const DEEPSEEK_MODEL = "deepseek/deepseek-chat";
const MAX_REQUEST_LENGTH = 30000;
const DEFAULT_TIMEOUT_MS = 120_000;
const TRANSLATE_TIMEOUT_MS = 300_000;

function getOpenRouterApiUrl(): string {
  const baseUrl =
    process.env.OPENAI_BASE_URL?.replace(/\/$/, "") ??
    "https://openrouter.ai/api/v1";

  return `${baseUrl}/chat/completions`;
}

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: { message?: string } | string;
};

function formatArticleInput(title: string | null, content: string): string {
  const preparedContent = prepareContentForAi(content);
  return [title ? `Title: ${title}` : "", preparedContent]
    .filter(Boolean)
    .join("\n\n");
}

function mapOpenRouterFailure(status: number): AppError {
  if (status === 401 || status === 403) {
    return new AppError(ErrorCode.AI_AUTH_FAILED);
  }

  return new AppError(ErrorCode.AI_UNAVAILABLE);
}

async function callOpenRouter(
  systemPrompt: string,
  userContent: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new AppError(ErrorCode.AI_AUTH_FAILED);
  }

  try {
    const response = await fetch(getOpenRouterApiUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://referent-sooty.vercel.app",
        "X-Title": "Referent",
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: userContent.slice(0, MAX_REQUEST_LENGTH),
          },
        ],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    const data = (await response.json()) as ChatCompletionResponse;

    if (!response.ok) {
      throw mapOpenRouterFailure(response.status);
    }

    const result = data.choices?.[0]?.message?.content?.trim();

    if (!result) {
      throw new AppError(ErrorCode.AI_EMPTY_RESPONSE);
    }

    return result;
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }

    if (err instanceof Error && err.name === "TimeoutError") {
      throw new AppError(ErrorCode.AI_TIMEOUT);
    }

    throw new AppError(ErrorCode.AI_UNAVAILABLE);
  }
}

export async function translateArticle(
  title: string | null,
  content: string,
): Promise<string> {
  return callOpenRouter(
    "You are a professional translator. Translate the following English article into Russian. Preserve meaning, tone, and paragraph structure. Return only the translation without comments.",
    formatArticleInput(title, content),
    TRANSLATE_TIMEOUT_MS,
  );
}

export async function summarizeArticle(
  title: string | null,
  content: string,
): Promise<string> {
  return callOpenRouter(
    "Кратко опиши на русском, о чём статья. 3–5 предложений. Только суть, без вводных фраз.",
    formatArticleInput(title, content),
  );
}

export async function extractTheses(
  title: string | null,
  content: string,
): Promise<string> {
  return callOpenRouter(
    "Выдели 5–10 ключевых тезисов статьи на русском. Нумерованный список. Без вводных фраз.",
    formatArticleInput(title, content),
  );
}

export async function generateTelegramPost(
  title: string | null,
  content: string,
): Promise<string> {
  return callOpenRouter(
    "Напиши пост для Telegram на русском: цепляющий заголовок, 2–3 абзаца, уместные эмодзи, до 1500 символов. Без вводных фраз.",
    formatArticleInput(title, content),
  );
}
