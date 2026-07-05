const MAX_CONTENT_LENGTH = 30000;
const HEAD_SHARE = 0.65;
const TAIL_SHARE = 0.35;
const MIN_PARAGRAPH_LENGTH = 20;
const SENTENCES_PER_PARAGRAPH = 4;
const OMISSION_MARKER = "[... пропущена средняя часть статьи ...]";

function splitFlatTextIntoParagraphs(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  const paragraphs: string[] = [];

  for (let i = 0; i < sentences.length; i += SENTENCES_PER_PARAGRAPH) {
    const paragraph = sentences
      .slice(i, i + SENTENCES_PER_PARAGRAPH)
      .join(" ")
      .trim();

    if (paragraph.length >= MIN_PARAGRAPH_LENGTH) {
      paragraphs.push(paragraph);
    }
  }

  return paragraphs.length > 0 ? paragraphs : [text.trim()];
}

function splitIntoParagraphs(content: string): string[] {
  const parts = content.includes("\n")
    ? content.split(/\n+/)
    : splitFlatTextIntoParagraphs(content);

  return parts
    .map((part) => part.trim())
    .filter((part) => part.length >= MIN_PARAGRAPH_LENGTH);
}

function joinParagraphs(paragraphs: string[]): string {
  return paragraphs.join("\n\n");
}

function takeParagraphsWithinBudget(
  paragraphs: string[],
  startIndex: number,
  direction: 1 | -1,
  budget: number,
): { paragraphs: string[]; endIndex: number } {
  const selected: string[] = [];
  let used = 0;
  let index = startIndex;

  while (index >= 0 && index < paragraphs.length) {
    const paragraph = paragraphs[index];
    const separator = selected.length > 0 ? 2 : 0;
    const nextUsed = used + separator + paragraph.length;

    if (nextUsed > budget) break;

    if (direction === 1) {
      selected.push(paragraph);
      index += 1;
    } else {
      selected.unshift(paragraph);
      index -= 1;
    }

    used = nextUsed;
  }

  return {
    paragraphs: selected,
    endIndex: direction === 1 ? index : index + 1,
  };
}

export function prepareContentForAi(content: string): string {
  const trimmed = content.trim();

  if (trimmed.length <= MAX_CONTENT_LENGTH) {
    return trimmed;
  }

  const paragraphs = splitIntoParagraphs(trimmed);

  if (paragraphs.length === 0) {
    return trimmed.slice(0, MAX_CONTENT_LENGTH);
  }

  const fullText = joinParagraphs(paragraphs);

  if (fullText.length <= MAX_CONTENT_LENGTH) {
    return fullText;
  }

  const markerBlock = `\n\n${OMISSION_MARKER}\n\n`;
  const availableBudget = MAX_CONTENT_LENGTH - markerBlock.length;
  const headBudget = Math.floor(availableBudget * HEAD_SHARE);
  const tailBudget = availableBudget - headBudget;

  const head = takeParagraphsWithinBudget(paragraphs, 0, 1, headBudget);
  const tail = takeParagraphsWithinBudget(
    paragraphs,
    paragraphs.length - 1,
    -1,
    tailBudget,
  );

  if (tail.endIndex <= head.endIndex) {
    return joinParagraphs(head.paragraphs).slice(0, MAX_CONTENT_LENGTH);
  }

  const prepared = [
    joinParagraphs(head.paragraphs),
    OMISSION_MARKER,
    joinParagraphs(tail.paragraphs),
  ].join("\n\n");

  return prepared.slice(0, MAX_CONTENT_LENGTH);
}
