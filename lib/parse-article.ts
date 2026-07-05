import * as cheerio from "cheerio";

export type ParsedArticle = {
  date: string | null;
  title: string | null;
  content: string | null;
};

const CONTENT_SELECTORS = [
  "article",
  '[role="article"]',
  ".post-content",
  ".article-content",
  ".entry-content",
  ".post-body",
  ".post",
  ".content",
  "main",
];

const DATE_SELECTORS = [
  'meta[property="article:published_time"]',
  'meta[property="og:published_time"]',
  'meta[name="date"]',
  'meta[name="pubdate"]',
  'meta[name="publish-date"]',
  'meta[itemprop="datePublished"]',
  "time[datetime]",
];

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function extractTitle($: cheerio.CheerioAPI): string | null {
  const ogTitle = $('meta[property="og:title"]').attr("content");
  if (ogTitle) return cleanText(ogTitle);

  for (const selector of CONTENT_SELECTORS) {
    const heading = $(selector).find("h1").first().text();
    if (heading) return cleanText(heading);
  }

  const h1 = $("h1").first().text();
  if (h1) return cleanText(h1);

  const title = $("title").first().text();
  return title ? cleanText(title) : null;
}

function extractDate($: cheerio.CheerioAPI): string | null {
  for (const selector of DATE_SELECTORS) {
    const el = $(selector).first();
    const value =
      el.attr("content") ?? el.attr("datetime") ?? el.attr("value") ?? el.text();
    if (value) return cleanText(value);
  }

  const jsonLdScripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < jsonLdScripts.length; i++) {
    const raw = $(jsonLdScripts[i]).html();
    if (!raw) continue;

    try {
      const data = JSON.parse(raw) as unknown;
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const record = item as Record<string, unknown>;
        const date =
          record.datePublished ??
          record.dateCreated ??
          record.uploadDate ??
          (record["@graph"] as Record<string, unknown>[] | undefined)?.find(
            (node) => node.datePublished,
          )?.datePublished;

        if (typeof date === "string") return date;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function extractContent($: cheerio.CheerioAPI): string | null {
  for (const selector of CONTENT_SELECTORS) {
    const element = $(selector).first();
    if (!element.length) continue;

    const clone = element.clone();
    clone.find("script, style, nav, footer, aside, .comments, .sidebar").remove();

    const blocks: string[] = [];
    clone.find("p, h2, h3, h4, li, blockquote").each((_, el) => {
      const text = cleanText($(el).text());
      if (text.length > 20) blocks.push(text);
    });

    const text =
      blocks.length > 0 ? blocks.join("\n\n") : cleanText(clone.text());

    if (text.length > 100) return text;
  }

  const bodyText = cleanText($("body").text());
  return bodyText || null;
}

export function parseArticleHtml(html: string): ParsedArticle {
  const $ = cheerio.load(html);

  return {
    date: extractDate($),
    title: extractTitle($),
    content: extractContent($),
  };
}

export async function fetchAndParseArticle(url: string): Promise<ParsedArticle> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; ReferentBot/1.0; +https://referent.app)",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Не удалось загрузить страницу: ${response.status}`);
  }

  const html = await response.text();
  return parseArticleHtml(html);
}
