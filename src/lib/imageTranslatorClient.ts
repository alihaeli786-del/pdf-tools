import {
  imageTranslationPairs,
  type ImageTranslatorLanguageCode,
} from "@/data/imageTranslator";

type TranslationResult = {
  translation_text?: string;
};

type TranslationPipeline = (
  input: string,
  options?: Record<string, unknown>
) => Promise<TranslationResult | TranslationResult[]>;

const translatorCache = new Map<
  string,
  Promise<TranslationPipeline>
>();

function splitTextIntoChunks(text: string, maxLength = 260) {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\n{2,}/g, "<<<PARAGRAPH>>>")
    .replace(/\n/g, " ")
    .replace(/<<<PARAGRAPH>>>/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  if (!normalized) return [];

  const chunks: string[] = [];
  const paragraphs = normalized.split(/\n+/);

  for (const paragraph of paragraphs) {
    const value = paragraph.trim();

    if (!value) continue;

    const sentences =
      value.match(/[^.!?。！？؟]+[.!?。！？؟]?/g) ?? [value];

    for (const sentence of sentences) {
      const cleanSentence = sentence.trim();

      if (!cleanSentence) continue;

      if (cleanSentence.length <= maxLength) {
        chunks.push(cleanSentence);
        continue;
      }

      const clauses =
        cleanSentence.match(/[^,;:،؛]+[,;:،؛]?/g) ?? [cleanSentence];

      let current = "";

      for (const clause of clauses) {
        const cleanClause = clause.trim();

        if (!cleanClause) continue;

        if (
          current &&
          current.length + cleanClause.length + 1 > maxLength
        ) {
          chunks.push(current.trim());
          current = "";
        }

        if (cleanClause.length > maxLength) {
          if (current) {
            chunks.push(current.trim());
            current = "";
          }

          for (
            let index = 0;
            index < cleanClause.length;
            index += maxLength
          ) {
            chunks.push(
              cleanClause.slice(index, index + maxLength).trim()
            );
          }
        } else {
          current = current
            ? `${current} ${cleanClause}`
            : cleanClause;
        }
      }

      if (current.trim()) {
        chunks.push(current.trim());
      }
    }
  }

  return chunks;
}

async function getTranslator(model: string) {
  const cached = translatorCache.get(model);

  if (cached) {
    return cached;
  }

  const promise = (async () => {
    const transformers =
      await import("@huggingface/transformers");

    transformers.env.allowLocalModels = false;

    const translator = await transformers.pipeline(
      "translation",
      model
    );

    return translator as unknown as TranslationPipeline;
  })();

  translatorCache.set(model, promise);

  try {
    return await promise;
  } catch (error) {
    translatorCache.delete(model);
    throw error;
  }
}

function cleanTranslationDuplicates(text: string) {
  let cleaned = text;

  cleaned = cleaned.replace(
    /\b([\p{L}\p{N}][\p{L}\p{N}'’.-]*)\s+(?:and|und|et|y|e|ou|oder)\s+\1\b/giu,
    "$1"
  );

  cleaned = cleaned.replace(
    /\b([\p{L}\p{N}][\p{L}\p{N}'’.-]*(?:\s+[\p{L}\p{N}][\p{L}\p{N}'’.-]*){1,3})\s+\1\b/giu,
    "$1"
  );

  return cleaned;
}
const businessPhraseGlossary: Partial<
  Record<ImageTranslatorLanguageCode, Record<string, string>>
> = {
  de: {
    "best regards": "Mit freundlichen Gr\u00fc\u00dfen",
    "kind regards": "Mit freundlichen Gr\u00fc\u00dfen",
    regards: "Mit freundlichen Gr\u00fc\u00dfen",
    sincerely: "Mit freundlichen Gr\u00fc\u00dfen",
    "yours sincerely": "Mit freundlichen Gr\u00fc\u00dfen",
  },
  es: {
    "best regards": "Saludos cordiales",
    "kind regards": "Saludos cordiales",
    regards: "Saludos cordiales",
    sincerely: "Atentamente",
    "yours sincerely": "Atentamente",
  },
  zh: {
    "best regards": "此致敬礼",
    "kind regards": "此致敬礼",
    regards: "此致敬礼",
    sincerely: "此致敬礼",
    "yours sincerely": "此致敬礼",
  },
};

function translateBusinessPhrase(
  text: string,
  sourceLanguage: ImageTranslatorLanguageCode,
  targetLanguage: ImageTranslatorLanguageCode
) {
  if (sourceLanguage !== "en") {
    return null;
  }

  const match = text.match(/^(.+?)([,.!?;:]*)$/u);

  if (!match) {
    return null;
  }

  const phrase = match[1].trim().toLowerCase();
  const punctuation = match[2] ?? "";
  const translated =
    businessPhraseGlossary[targetLanguage]?.[phrase];

  if (!translated) {
    return null;
  }

  return `${translated}${punctuation}`;
}
function translateProtectedBusinessChunk(
  text: string,
  sourceLanguage: ImageTranslatorLanguageCode,
  targetLanguage: ImageTranslatorLanguageCode,
  protectedMap: Map<string, string>
) {
  if (sourceLanguage !== "en") {
    return null;
  }

  if (targetLanguage === "de") {
    const match = text.match(
      /^thank you for choosing\s+(ZXQ\d+QXZ)([.!?]*)$/i
    );

    if (match) {
      const companyName = protectedMap.get(match[1]);

      if (companyName) {
        return `Vielen Dank, dass Sie sich f\u00fcr ${companyName} entschieden haben${match[2]}`;
      }
    }
  }

  return null;
}
function cleanTargetLanguageStyle(
  text: string,
  targetLanguage: ImageTranslatorLanguageCode
) {
  if (targetLanguage === "es") {
    return text
      .replace(/\bll\u00e1manos\b/giu, "ll\u00e1menos")
      .replace(/\bcont\u00e1ctanos\b/giu, "cont\u00e1ctenos")
      .replace(/\bescr\u00edbenos\b/giu, "escr\u00edbanos");
  }

  if (targetLanguage === "zh") {
    return text
      .replace(/你满意/gu, "您的满意")
      .replace(/或呼我们/gu, "或致电我们")
      .replace(/支援小组/gu, "支持团队");
  }

  return text;
}
function readTranslation(
  result: TranslationResult | TranslationResult[]
) {
  if (Array.isArray(result)) {
    return result[0]?.translation_text?.trim() || "";
  }

  return result.translation_text?.trim() || "";
}

type ProtectedItem = {
  token: string;
  value: string;
};

function protectSpecialText(text: string) {
  const items: ProtectedItem[] = [];

  const pattern =
    /\b(?:[A-Z][A-Za-z0-9&'.-]*)(?:\s+[A-Z][A-Za-z0-9&'.-]*){0,3}\s+(?:Ltd|LTD|Limited|LIMITED|LLC|Inc|INC|Incorporated|Corp|CORP|Corporation|PLC|LLP|GmbH|AG|Co)\b|https?:\/\/[^\s]+|www\.[^\s]+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:\+?\d[\d\s().-]{6,}\d)/g;

  const protectedText = text.replace(pattern, (value) => {
    const token = `ZXQ${items.length}QXZ`;

    items.push({
      token,
      value,
    });

    return token;
  });

  return {
    protectedText,
    items,
  };
}

function restoreSpecialText(
  text: string,
  items: ProtectedItem[]
) {
  let restored = text;

  for (const item of items) {
    restored = restored.replaceAll(
      item.token,
      item.value
    );
  }

  return restored;
}
export async function translateImageText(
  text: string,
  sourceLanguage: ImageTranslatorLanguageCode,
  targetLanguage: ImageTranslatorLanguageCode,
  onProgress?: (progress: number, status: string) => void
) {
  const cleanText = text.trim();

  if (!cleanText) {
    throw new Error("There is no text to translate.");
  }

  if (sourceLanguage === targetLanguage) {
    return cleanText;
  }

  const {
    protectedText,
    items: protectedItems,
  } = protectSpecialText(cleanText);

  const pairKey =
    `${sourceLanguage}-${targetLanguage}`;

  const pair = imageTranslationPairs[pairKey];

  if (!pair) {
    throw new Error(
      "This language pair is not available in Version 1."
    );
  }

  onProgress?.(5, "Loading translation model...");

  const translator = await getTranslator(pair.model);
  const chunks = splitTextIntoChunks(protectedText);

  if (!chunks.length) {
    throw new Error("There is no text to translate.");
  }

  const translatedChunks: string[] = [];
  const protectedMap = new Map(
    protectedItems.map((item) => [item.token, item.value])
  );

  for (let index = 0; index < chunks.length; index++) {
    const progress = Math.round(
      15 + (index / chunks.length) * 80
    );

    onProgress?.(
      progress,
      `Translating ${index + 1} of ${chunks.length}...`
    );

    const protectedBusinessTranslation =
      translateProtectedBusinessChunk(
        chunks[index],
        sourceLanguage,
        targetLanguage,
        protectedMap
      );

    if (protectedBusinessTranslation) {
      translatedChunks.push(protectedBusinessTranslation);
      continue;
    }

    const parts = chunks[index].split(/(ZXQ\d+QXZ)/g);
    const translatedParts: string[] = [];

    for (const part of parts) {
      if (!part) continue;

      const protectedValue = protectedMap.get(part);

      if (protectedValue) {
        translatedParts.push(protectedValue);
        continue;
      }

      const coreText = part.trim();

      if (!coreText) {
        translatedParts.push(part);
        continue;
      }

      if (!/[\p{L}\p{N}]/u.test(coreText)) {
        translatedParts.push(part);
        continue;
      }

      const leadingSpace = part.match(/^\s*/)?.[0] ?? "";
      const trailingSpace = part.match(/\s*$/)?.[0] ?? "";

      const glossaryTranslation = translateBusinessPhrase(
        coreText,
        sourceLanguage,
        targetLanguage
      );

      if (glossaryTranslation) {
        translatedParts.push(
          `${leadingSpace}${glossaryTranslation}${trailingSpace}`
        );
        continue;
      }

      const input = pair.prefix
        ? `${pair.prefix}${coreText}`
        : coreText;

      const result = await translator(input);

      const translatedPart = cleanTargetLanguageStyle(
        cleanTranslationDuplicates(
          readTranslation(result)
        ),
        targetLanguage
      );

      translatedParts.push(
        `${leadingSpace}${translatedPart}${trailingSpace}`
      );
    }

    const translated = translatedParts.join("").trim();

    if (translated) {
      translatedChunks.push(translated);
    }
  }

  onProgress?.(100, "Translation complete");

  return translatedChunks.join("\n\n").trim();
}
