"use client";

import { useEffect, useRef, useState } from "react";
import {
  Clipboard,
  Copy,
  Download,
  FileImage,
  Loader2,
  ScanText,
  Trash2,
  Upload,
} from "lucide-react";
import { createWorker, PSM } from "tesseract.js";
import {
  imageTranslatorLanguages,
  type ImageTranslatorLanguageCode,
} from "@/data/imageTranslator";
import { translateImageText } from "@/lib/imageTranslatorClient";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
async function preprocessImage(file: File) {
  const bitmap = await createImageBitmap(file);

  const targetWidth = 2000;
  const scale = Math.min(
    2,
    Math.max(1, targetWidth / bitmap.width)
  );

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const context = canvas.getContext("2d");

  if (!context) {
    bitmap.close();
    throw new Error("Unable to prepare image for OCR.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  context.drawImage(
    bitmap,
    0,
    0,
    canvas.width,
    canvas.height
  );

  bitmap.close();


  return canvas;
}

export default function ImageTranslatorPage() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [text, setText] = useState("");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  const [sourceLanguage, setSourceLanguage] =
    useState<ImageTranslatorLanguageCode>("en");
  const [targetLanguage, setTargetLanguage] =
    useState<ImageTranslatorLanguageCode>("es");

  const [translatedText, setTranslatedText] = useState("");
  const [translationProgress, setTranslationProgress] = useState(0);
  const [translationStatus, setTranslationStatus] = useState("");
  const [translating, setTranslating] = useState(false);
  const [translatedCopied, setTranslatedCopied] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const loadImage = (nextFile: File) => {
    setError("");
    setText("");
    setProgress(0);
    setStatus("");
    setCopied(false);
    setTranslatedText("");
    setTranslationProgress(0);
    setTranslationStatus("");
    setTranslatedCopied(false);

    if (!ACCEPTED_TYPES.includes(nextFile.type)) {
      setError("Please upload a JPG, PNG or WebP image.");
      return;
    }

    if (nextFile.size > MAX_FILE_SIZE) {
      setError("Please upload an image smaller than 10 MB.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const imageItem = Array.from(event.clipboardData.items).find((item) =>
      item.type.startsWith("image/")
    );

    const pastedFile = imageItem?.getAsFile();

    if (pastedFile) {
      loadImage(pastedFile);
    }
  };

  const extractText = async () => {
    if (!file) {
      setError("Upload or paste an image first.");
      return;
    }

    setProcessing(true);
    setError("");
    setText("");
    setProgress(0);
    setStatus("Preparing OCR...");

    let worker: Awaited<ReturnType<typeof createWorker>> | null = null;

    try {
      worker = await createWorker(imageTranslatorLanguages[sourceLanguage].ocr, 1, {
        logger: (message) => {
          if (typeof message.progress === "number") {
            setProgress(Math.round(message.progress * 100));
          }

          if (message.status) {
            setStatus(
              message.status
                .replace(/_/g, " ")
                .replace(/\b\w/g, (char) => char.toUpperCase())
            );
          }
        },
      });

      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
        preserve_interword_spaces: "1",
        user_defined_dpi: "300",
      });

      setStatus("Improving image for OCR...");
      const preparedImage = await preprocessImage(file);

      setStatus("Recognizing text...");
      const result = await worker.recognize(preparedImage);
      const extracted = result.data.text.trim();

      setText(extracted);

      if (!extracted) {
        setError(
          "No readable text was detected. Try a clearer or higher-resolution image."
        );
      } else {
        setProgress(100);
        setStatus("Text extracted successfully");
      }
    } catch (err) {
      console.error(err);
      setError(
        "Unable to extract text from this image. Please try another image."
      );
    } finally {
      if (worker) {
        await worker.terminate();
      }

      setProcessing(false);
    }
  };

  const translateExtractedText = async () => {
    if (!text.trim()) {
      setError("Extract text from an image first.");
      return;
    }

    if (sourceLanguage === targetLanguage) {
      setError("Choose two different languages.");
      return;
    }

    setTranslating(true);
    setError("");
    setTranslatedText("");
    setTranslationProgress(0);
    setTranslationStatus("Preparing translation...");
    setTranslatedCopied(false);

    try {
      const result = await translateImageText(
        text,
        sourceLanguage,
        targetLanguage,
        (nextProgress, nextStatus) => {
          setTranslationProgress(nextProgress);
          setTranslationStatus(nextStatus);
        }
      );

      setTranslatedText(result);

      if (!result) {
        setError("No translated text was returned.");
      } else {
        setTranslationProgress(100);
        setTranslationStatus("Translation complete");
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to translate this text."
      );
    } finally {
      setTranslating(false);
    }
  };
  const copyTranslatedText = async () => {
    if (!translatedText) return;

    await navigator.clipboard.writeText(translatedText);
    setTranslatedCopied(true);

    setTimeout(() => setTranslatedCopied(false), 1500);
  };

  const downloadTranslatedText = () => {
    if (!translatedText) return;

    const blob = new Blob([translatedText], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = file
      ? `${file.name.replace(/\.[^.]+$/, "")}-translated.txt`
      : "translated-text.txt";

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const swapLanguages = () => {
    const nextSource = targetLanguage;
    const nextTarget = sourceLanguage;

    setSourceLanguage(nextSource);
    setTargetLanguage(nextTarget);
    setText("");
    setTranslatedText("");
    setProgress(0);
    setStatus("");
    setTranslationProgress(0);
    setTranslationStatus("");
    setError("");
  };
  const copyText = async () => {
    if (!text) return;

    await navigator.clipboard.writeText(text);
    setCopied(true);

    setTimeout(() => setCopied(false), 1500);
  };

  const downloadText = () => {
    if (!text) return;

    const blob = new Blob([text], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = file
      ? `${file.name.replace(/\.[^.]+$/, "")}-text.txt`
      : "extracted-text.txt";

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const clearAll = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setFile(null);
    setPreviewUrl("");
    setText("");
    setProgress(0);
    setStatus("");
    setError("");
    setCopied(false);
    setTranslatedText("");
    setTranslationProgress(0);
    setTranslationStatus("");
    setTranslating(false);
    setTranslatedCopied(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const faqItems = [
    {
      question: "What is the Toolijo Image Translator?",
      answer:
        "Toolijo Image Translator extracts text from an image with OCR and translates the recognized text directly in your browser.",
    },
    {
      question: "Which image formats are supported?",
      answer:
        "You can upload JPG, PNG and WebP images up to 10 MB.",
    },
    {
      question: "Which languages are supported?",
      answer:
        "The current version supports English, Spanish, French, German and Simplified Chinese. Translation is available between English and each supported non-English language.",
    },
    {
      question: "Can I translate text from screenshots?",
      answer:
        "Yes. You can upload or paste a screenshot, extract its text with OCR and then translate the recognized text.",
    },
    {
      question: "Can I edit the extracted text before translating?",
      answer:
        "Yes. The OCR result is editable, so you can correct or change recognized text before starting the translation.",
    },
    {
      question: "Is the Image Translator free?",
      answer:
        "Yes. You can use the Image Translator without creating an account.",
    },
    {
      question: "Does the translation happen in my browser?",
      answer:
        "OCR and translation processing run in your browser. Required OCR language data and translation model files may be downloaded when a language is used for the first time.",
    },
    {
      question: "Will names, email addresses and phone numbers be translated?",
      answer:
        "Toolijo is designed to preserve common business names, email addresses, phone numbers and web addresses while translating surrounding text.",
    },
  ];

  const webAppSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Toolijo Image Translator",
    url: "https://toolijo.com/image-translator",
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    description:
      "Translate text in JPG, PNG and WebP images online with OCR. Extract image text and translate between English, Spanish, French, German and Simplified Chinese.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <main
      className="min-h-screen bg-slate-50 text-slate-900"
      onPaste={handlePaste}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webAppSchema),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
      />

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 text-center sm:px-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-lg shadow-blue-100">
            <ScanText size={30} />
          </div>

          <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
            Image Translator - Translate Text in Images Online Free
          </h1>

          <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
            Extract text from JPG, PNG and WebP images with OCR and translate
            it between English, Spanish, French, German and Simplified Chinese.
            Upload, drag and drop, or paste an image to get started.
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs font-bold text-slate-600">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              OCR + Translation
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              5 Languages
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              No sign-up
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              Browser-based
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => {
            const selectedFile = event.target.files?.[0];
            if (selectedFile) loadImage(selectedFile);
          }}
        />

        {!file ? (
          <div
            className="rounded-[28px] border-2 border-dashed border-violet-200 bg-white px-6 py-16 text-center shadow-sm transition hover:border-violet-300"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const droppedFile = event.dataTransfer.files?.[0];
              if (droppedFile) loadImage(droppedFile);
            }}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <FileImage size={27} />
            </div>

            <h2 className="mt-5 text-xl font-black">
              Drop, upload or paste an image
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Supports JPG, PNG and WebP images up to 10 MB.
            </p>

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:opacity-90"
            >
              <Upload size={18} />
              Browse Image
            </button>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
              <Clipboard size={15} />
              You can also press Ctrl + V to paste an image
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="font-black">Image preview</h2>
                  <p className="mt-1 max-w-[260px] truncate text-xs text-slate-500">
                    {file.name}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={clearAll}
                  disabled={processing || translating}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 size={15} />
                  Clear
                </button>
              </div>

              <div className="flex min-h-[420px] items-center justify-center bg-slate-100 p-5">
                <img
                  src={previewUrl}
                  alt="Uploaded image preview"
                  className="max-h-[520px] max-w-full rounded-xl object-contain shadow-sm"
                />
              </div>

              <div className="border-t border-slate-200 p-5">
                <button
                  type="button"
                  onClick={extractText}
                  disabled={processing || translating}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {processing ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Extracting text...
                    </>
                  ) : (
                    <>
                      <ScanText size={18} />
                      Extract Text
                    </>
                  )}
                </button>

                {processing && (
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-600">
                      <span>{status || "Processing..."}</span>
                      <span>{progress}%</span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-600 to-blue-600 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-5">
                <h2 className="font-black">Translate image text</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Choose the language in the image and the language you want.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
                  <label className="block">
                    <span className="text-xs font-bold text-slate-600">
                      From
                    </span>

                    <select
                      value={sourceLanguage}
                      onChange={(event) => {
                        const nextSource =
                          event.target.value as ImageTranslatorLanguageCode;

                        setSourceLanguage(nextSource);
                        setTargetLanguage(
                          nextSource === "en" ? "es" : "en"
                        );
                        setText("");
                        setTranslatedText("");
                        setProgress(0);
                        setTranslationProgress(0);
                        setError("");
                      }}
                      disabled={processing || translating}
                      className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-violet-400 disabled:opacity-60"
                    >
                      {Object.entries(imageTranslatorLanguages).map(
                        ([code, language]) => (
                          <option key={code} value={code}>
                            {language.label}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <button
                    type="button"
                    onClick={swapLanguages}
                    disabled={processing || translating}
                    className="h-11 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Swap
                  </button>

                  <label className="block">
                    <span className="text-xs font-bold text-slate-600">
                      To
                    </span>

                    <select
                      value={targetLanguage}
                      onChange={(event) => {
                        setTargetLanguage(
                          event.target.value as ImageTranslatorLanguageCode
                        );
                        setTranslatedText("");
                        setTranslationProgress(0);
                        setError("");
                      }}
                      disabled={processing || translating}
                      className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-violet-400 disabled:opacity-60"
                    >
                      {Object.entries(imageTranslatorLanguages).map(
                        ([code, language]) => {
                          const languageCode =
                            code as ImageTranslatorLanguageCode;

                          const unavailable =
                            sourceLanguage === "en"
                              ? languageCode === "en"
                              : languageCode !== "en";

                          return (
                            <option
                              key={code}
                              value={code}
                              disabled={unavailable}
                            >
                              {language.label}
                            </option>
                          );
                        }
                      )}
                    </select>
                  </label>
                </div>

                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Version 1 supports English to the selected language, or the
                  selected language to English.
                </p>
              </div>

              <div className="border-b border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      Extracted text
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Review or edit the OCR text before translating.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={copyText}
                      disabled={!text}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                    >
                      <Copy size={15} />
                      {copied ? "Copied" : "Copy"}
                    </button>

                    <button
                      type="button"
                      onClick={downloadText}
                      disabled={!text}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                    >
                      <Download size={15} />
                      TXT
                    </button>
                  </div>
                </div>

                <textarea
                  value={text}
                  onChange={(event) => {
                    setText(event.target.value);
                    setTranslatedText("");
                    setTranslationProgress(0);
                  }}
                  placeholder="Extracted text will appear here..."
                  className="min-h-[220px] w-full resize-y border-t border-slate-100 p-5 text-sm leading-7 text-slate-800 outline-none"
                />
              </div>

              <div className="p-5">
                <button
                  type="button"
                  onClick={translateExtractedText}
                  disabled={!text.trim() || translating || processing}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {translating ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Translating...
                    </>
                  ) : (
                    <>Translate Text</>
                  )}
                </button>

                {translating && (
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-600">
                      <span>
                        {translationStatus || "Preparing translation..."}
                      </span>
                      <span>{translationProgress}%</span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-600 to-blue-600 transition-all"
                        style={{ width: `${translationProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      Translated text
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Edit, copy or download the translated result.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={copyTranslatedText}
                      disabled={!translatedText}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                    >
                      <Copy size={15} />
                      {translatedCopied ? "Copied" : "Copy"}
                    </button>

                    <button
                      type="button"
                      onClick={downloadTranslatedText}
                      disabled={!translatedText}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                    >
                      <Download size={15} />
                      TXT
                    </button>
                  </div>
                </div>

                <textarea
                  value={translatedText}
                  onChange={(event) =>
                    setTranslatedText(event.target.value)
                  }
                  placeholder="Translated text will appear here..."
                  className="mt-3 min-h-[220px] w-full resize-y rounded-xl border border-slate-200 p-4 text-sm leading-7 text-slate-800 outline-none focus:border-violet-300"
                />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <p className="mt-5 text-center text-xs leading-5 text-slate-500">
          OCR and translation run in your browser. The first use of a language
          may take longer while required language data and translation model
          files load.
        </p>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-black tracking-tight text-slate-950">
              How to Translate Text in an Image Online
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-slate-600">
              Extract and translate readable text from an image in three simple
              steps.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-6">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-sm font-black text-white">
                1
              </span>
              <h3 className="mt-4 text-lg font-bold text-slate-950">
                Upload or paste your image
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Choose a JPG, PNG or WebP image, drag and drop it, or paste an
                image directly from your clipboard.
              </p>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-6">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-sm font-black text-white">
                2
              </span>
              <h3 className="mt-4 text-lg font-bold text-slate-950">
                Extract and review the text
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Select the language used in the image, extract the text with
                OCR, and correct the editable result if needed.
              </p>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-6">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-sm font-black text-white">
                3
              </span>
              <h3 className="mt-4 text-lg font-bold text-slate-950">
                Translate, copy or download
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Choose the target language, translate the extracted text, then
                copy the result or download it as a TXT file.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-black tracking-tight text-slate-950">
              Free online image translator with OCR
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-600">
              Toolijo combines OCR and text translation so you can translate
              readable text from screenshots, photos and simple document
              images without retyping everything manually.
            </p>

            <p className="mt-4 text-base leading-7 text-slate-600">
              The current version supports English, Spanish, French, German and
              Simplified Chinese, with translation between English and each
              supported non-English language.
            </p>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-black tracking-tight text-slate-950">
              Browser-based OCR and translation
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-600">
              OCR and translation processing run in your browser. Required
              language data and translation model files may be downloaded when
              you use a language for the first time.
            </p>

            <p className="mt-4 text-base leading-7 text-slate-600">
              The extracted and translated text stays editable. Clear,
              high-resolution printed text usually gives the best OCR results,
              while handwriting and low-quality images may need manual review.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-slate-950">
              JPG, PNG & WebP
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Translate readable text from common image formats up to 10 MB.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-slate-950">
              5 supported languages
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Use English, Spanish, French, German and Simplified Chinese.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-slate-950">
              Editable before translation
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Review and correct OCR text before sending it for translation.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-slate-950">
              No account required
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Use the Image Translator without creating an account.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-black tracking-tight text-slate-950">
              Image Translator FAQ
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-slate-600">
              Common questions about extracting and translating text from
              images with Toolijo.
            </p>
          </div>
          <div className="mt-8 space-y-4">
            {faqItems.map((item) => (
              <div
                key={item.question}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <h3 className="text-base font-bold text-slate-950">
                  {item.question}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
