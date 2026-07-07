export const ErrorCode = {
  URL_REQUIRED: "URL_REQUIRED",
  URL_INVALID: "URL_INVALID",
  ACTION_INVALID: "ACTION_INVALID",
  ARTICLE_LOAD_FAILED: "ARTICLE_LOAD_FAILED",
  ARTICLE_PARSE_FAILED: "ARTICLE_PARSE_FAILED",
  AI_UNAVAILABLE: "AI_UNAVAILABLE",
  AI_AUTH_FAILED: "AI_AUTH_FAILED",
  AI_TIMEOUT: "AI_TIMEOUT",
  AI_EMPTY_RESPONSE: "AI_EMPTY_RESPONSE",
  UNKNOWN: "UNKNOWN",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  URL_REQUIRED: "Введите URL статьи.",
  URL_INVALID: "Укажите корректный URL, например: https://example.com/article",
  ACTION_INVALID: "Выбрано неизвестное действие.",
  ARTICLE_LOAD_FAILED: "Не удалось загрузить статью по этой ссылке.",
  ARTICLE_PARSE_FAILED:
    "Не удалось извлечь текст статьи. Попробуйте другую ссылку.",
  AI_UNAVAILABLE: "Сервис AI временно недоступен. Попробуйте позже.",
  AI_AUTH_FAILED:
    "Не удалось подключиться к AI. Проверьте API-ключ и настройки OpenRouter.",
  AI_TIMEOUT:
    "Обработка заняла слишком много времени. Попробуйте более короткую статью.",
  AI_EMPTY_RESPONSE: "AI не вернул результат. Попробуйте ещё раз.",
  UNKNOWN: "Что-то пошло не так. Попробуйте позже.",
};

export class AppError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message?: string) {
    super(message ?? ERROR_MESSAGES[code]);
    this.name = "AppError";
    this.code = code;
  }
}

export type ApiErrorResponse = {
  error: {
    code: ErrorCode;
    message: string;
  };
};

export function toApiErrorResponse(
  err: unknown,
  fallbackCode: ErrorCode = ErrorCode.UNKNOWN,
): ApiErrorResponse {
  if (err instanceof AppError) {
    return {
      error: {
        code: err.code,
        message: err.message,
      },
    };
  }

  return {
    error: {
      code: fallbackCode,
      message: ERROR_MESSAGES[fallbackCode],
    },
  };
}

export function getHttpStatusForError(code: ErrorCode): number {
  switch (code) {
    case ErrorCode.URL_REQUIRED:
    case ErrorCode.URL_INVALID:
    case ErrorCode.ACTION_INVALID:
      return 400;
    case ErrorCode.ARTICLE_PARSE_FAILED:
      return 422;
    case ErrorCode.ARTICLE_LOAD_FAILED:
      return 502;
    case ErrorCode.AI_AUTH_FAILED:
      return 503;
    case ErrorCode.AI_TIMEOUT:
      return 504;
    default:
      return 500;
  }
}
