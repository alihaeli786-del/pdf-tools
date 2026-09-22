export const imageTranslatorLanguages = {
  en: { label: "English", ocr: "eng" },
  es: { label: "Spanish", ocr: "spa" },
  fr: { label: "French", ocr: "fra" },
  de: { label: "German", ocr: "deu" },



  zh: { label: "Chinese (Simplified)", ocr: "chi_sim" },


} as const;

export type ImageTranslatorLanguageCode =
  keyof typeof imageTranslatorLanguages;

export type ImageTranslationPair = {
  model: string;
  prefix?: string;
};

export const imageTranslationPairs: Record<
  string,
  ImageTranslationPair
> = {
  "en-es": { model: "Xenova/opus-mt-en-es" },
  "es-en": { model: "Xenova/opus-mt-es-en" },

  "en-fr": { model: "Xenova/opus-mt-en-fr" },
  "fr-en": { model: "Xenova/opus-mt-fr-en" },

  "en-de": { model: "Xenova/opus-mt-en-de" },
  "de-en": { model: "Xenova/opus-mt-de-en" },










  "en-zh": { model: "Xenova/opus-mt-en-zh" },
  "zh-en": { model: "Xenova/opus-mt-zh-en" },






};
