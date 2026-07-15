import { AppError, ErrorCode } from "@/lib/errors";

const IMAGE_MODEL = "black-forest-labs/FLUX.1-schnell";
const HF_ENDPOINT = `https://router.huggingface.co/hf-inference/models/${IMAGE_MODEL}`;
const IMAGE_TIMEOUT_MS = 180_000;
const MAX_ATTEMPTS = 3;

function mapHuggingFaceFailure(status: number): AppError {
  if (status === 401 || status === 403) {
    return new AppError(ErrorCode.AI_AUTH_FAILED);
  }

  if (status === 408 || status === 504) {
    return new AppError(ErrorCode.AI_TIMEOUT);
  }

  return new AppError(ErrorCode.AI_UNAVAILABLE);
}

function getMimeType(contentType: string | null): string {
  if (contentType?.includes("jpeg") || contentType?.includes("jpg")) {
    return "image/jpeg";
  }

  if (contentType?.includes("webp")) {
    return "image/webp";
  }

  return "image/png";
}

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateImageFromPrompt(prompt: string): Promise<string> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;

  if (!apiKey) {
    throw new AppError(ErrorCode.AI_AUTH_FAILED);
  }

  const trimmedPrompt = prompt.trim();

  if (!trimmedPrompt) {
    throw new AppError(ErrorCode.AI_EMPTY_RESPONSE);
  }

  let lastError: AppError = new AppError(ErrorCode.AI_UNAVAILABLE);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(HF_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "image/png",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: trimmedPrompt,
          parameters: {
            num_inference_steps: 4,
          },
        }),
        signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
      });

      const contentType = response.headers.get("content-type");

      if (!response.ok) {
        // Model may still be loading.
        if (response.status === 503 && attempt < MAX_ATTEMPTS) {
          await delay(2000 * attempt);
          continue;
        }

        lastError = mapHuggingFaceFailure(response.status);
        throw lastError;
      }

      if (contentType?.includes("application/json")) {
        throw new AppError(ErrorCode.AI_UNAVAILABLE);
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      if (buffer.byteLength === 0) {
        throw new AppError(ErrorCode.AI_EMPTY_RESPONSE);
      }

      const mimeType = getMimeType(contentType);
      return `data:${mimeType};base64,${buffer.toString("base64")}`;
    } catch (err) {
      if (err instanceof AppError) {
        lastError = err;

        if (
          err.code === ErrorCode.AI_UNAVAILABLE &&
          attempt < MAX_ATTEMPTS
        ) {
          await delay(2000 * attempt);
          continue;
        }

        throw err;
      }

      if (err instanceof Error && err.name === "TimeoutError") {
        throw new AppError(ErrorCode.AI_TIMEOUT);
      }

      lastError = new AppError(ErrorCode.AI_UNAVAILABLE);

      if (attempt < MAX_ATTEMPTS) {
        await delay(2000 * attempt);
        continue;
      }
    }
  }

  throw lastError;
}
