import { slugify } from "@/lib/utils/slug";
import type { Section, SourceDocument } from "@/lib/engine/types";

const SECTION_HEADING_PATTERN =
  /^(?:\d+(?:\.\d+)*)\s+[A-Z][A-Za-z0-9 ,:/()-]{2,}$|^(?:Abstract|Introduction|Method|Methods|Approach|Experiments|Results|Conclusion|Related Work)$/;

export function normalizePaperUrl(sourceUrl: string) {
  const url = new URL(sourceUrl);

  if (url.hostname.includes("arxiv.org")) {
    const arxivId = url.pathname.split("/").filter(Boolean).pop() ?? "";
    const normalizedId = arxivId.replace(".pdf", "");

    return {
      sourceUrl: `https://arxiv.org/abs/${normalizedId}`,
      pdfUrl: `https://arxiv.org/pdf/${normalizedId}.pdf`,
      fallbackUrl: `https://ar5iv.labs.arxiv.org/html/${normalizedId}`,
      slug: normalizedId.replace(/\./g, "-"),
    };
  }

  return {
    sourceUrl,
    pdfUrl: sourceUrl,
    fallbackUrl: sourceUrl,
    slug: slugify(url.pathname),
  };
}

async function extractPdfText(pdfBuffer: Buffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer),
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (pageText) {
      pages.push(pageText);
    }
  }

  return pages.join("\n\n");
}

function splitSections(rawText: string) {
  const lines = rawText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const sections: Section[] = [];
  let currentHeading = "Overview";
  let currentBuffer: string[] = [];

  for (const line of lines) {
    if (SECTION_HEADING_PATTERN.test(line)) {
      if (currentBuffer.length > 0) {
        sections.push({
          heading: currentHeading,
          content: currentBuffer.join(" ").trim(),
        });
      }

      currentHeading = line;
      currentBuffer = [];
      continue;
    }

    currentBuffer.push(line);
  }

  if (currentBuffer.length > 0) {
    sections.push({
      heading: currentHeading,
      content: currentBuffer.join(" ").trim(),
    });
  }

  return sections;
}

function extractAbstract(rawText: string, sections: Section[]) {
  const abstractSection = sections.find((section) =>
    section.heading.toLowerCase().includes("abstract"),
  );

  if (abstractSection) {
    return abstractSection.content.slice(0, 2400);
  }

  const abstractMatch = rawText.match(/abstract[:\s]+([\s\S]{100,1800}?)(?:introduction|1\s+[A-Z])/i);

  return abstractMatch?.[1]?.trim() ?? rawText.slice(0, 1200);
}

function extractTitle(rawText: string) {
  const lines = rawText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines[0] ?? "Untitled Paper";
}

/** Strip script/style tags and their content so ar5iv HTML yields only readable text. */
function stripNonTextElements(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchTextFallback(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "PaperFlow/0.1",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch fallback HTML: ${response.status}`);
  }

  const html = await response.text();
  return stripNonTextElements(html);
}

export async function ingestPaperFromUrl(sourceUrl: string): Promise<SourceDocument> {
  const normalized = normalizePaperUrl(sourceUrl);
  let rawText = "";
  let fallbackUsed = false;

  try {
    const response = await fetch(normalized.pdfUrl, {
      headers: {
        "User-Agent": "PaperFlow/0.1",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status}`);
    }

    const pdfArrayBuffer = await response.arrayBuffer();
    rawText = await extractPdfText(Buffer.from(pdfArrayBuffer));
  } catch {
    rawText = await fetchTextFallback(normalized.fallbackUrl);
    fallbackUsed = true;
  }

  const sections = splitSections(rawText);
  const metadata = {
    title: extractTitle(rawText),
    authors: [],
    abstract: extractAbstract(rawText, sections),
    sourceUrl: normalized.sourceUrl,
  };

  return {
    type: "paper",
    url: normalized.sourceUrl,
    slug: normalized.slug,
    metadata,
    sections,
    paragraphs: rawText.split(/\n+/).filter(Boolean),
    rawText,
    fallbackUsed,
  };
}
