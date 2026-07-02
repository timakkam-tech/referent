const DEEPSEEK_MODEL = "deepseek/deepseek-chat";

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
  error?: {
    message?: string;
  };
};

export async function translateArticle(
  title: string | null,
  content: string,
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY не задан в .env.local");
  }

  const textToTranslate = [title ? `Title: ${title}` : "", content]
    .filter(Boolean)
    .join("\n\n");

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
        {
          role: "system",
          content:
            "You are a professional translator. Translate the following English article into Russian. Preserve meaning, tone, and paragraph structure. Return only the translation without comments.",
        },
        {
          role: "user",
          content: textToTranslate.slice(0, 30000),
        },
      ],
    }),
    signal: AbortSignal.timeout(120000),
  });

  const data = (await response.json()) as ChatCompletionResponse;

  if (!response.ok) {
    throw new Error(
      data.error?.message ?? `OpenRouter вернул ошибку: ${response.status}`,
    );
  }

  const translation = data.choices?.[0]?.message?.content?.trim();

  if (!translation) {
    throw new Error("Модель не вернула перевод");
  }

  return translation;
}
