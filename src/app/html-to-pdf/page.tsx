"use client";

import { useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Code2,
  Eye,
  FileCode2,
  FileDown,
  LayoutTemplate,
  Loader2,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import html2canvas from "html2canvas";
import { PDFDocument } from "pdf-lib";

type PageSize = "a4" | "letter";
type Orientation = "portrait" | "landscape";
type Quality = "standard" | "high";

type SafeHtmlParts = {
  head: string;
  body: string;
};

const DEFAULT_HTML = `<div style="font-family: Arial, sans-serif; color: #0f172a;">
  <h1 style="font-size: 32px; margin-bottom: 12px;">HTML to PDF</h1>
  <p style="font-size: 16px; line-height: 1.7;">
    Paste your HTML code here or upload an HTML file.
  </p>
  <div style="margin-top: 24px; padding: 20px; border: 1px solid #dbeafe; border-radius: 12px; background: #eff6ff;">
    <strong>Tip:</strong> You can use headings, paragraphs, tables, images and CSS styling.
  </div>
</div>`;

const DEFAULT_SAFE_PARTS: SafeHtmlParts = {
  head: "",
  body: DEFAULT_HTML,
};

const PAGE_SIZES = {
  a4: {
    label: "A4",
    width: 595.28,
    height: 841.89,
  },
  letter: {
    label: "Letter",
    width: 612,
    height: 792,
  },
} as const;

const MM_TO_PT = 2.834645669;
const PT_TO_CSS_PX = 96 / 72;

function sanitizeHtmlDocument(rawHtml: string): SafeHtmlParts {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, "text/html");

  doc
    .querySelectorAll(
      "script, iframe, object, embed, frame, frameset, base, meta[http-equiv='refresh']"
    )
    .forEach((element) => element.remove());

  doc.querySelectorAll("*").forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();

      if (name.startsWith("on")) {
        element.removeAttribute(attribute.name);
        return;
      }

      if (
        ["href", "src", "xlink:href", "formaction"].includes(name) &&
        value.startsWith("javascript:")
      ) {
        element.removeAttribute(attribute.name);
      }
    });
  });

  const head = Array.from(
    doc.head.querySelectorAll("style, link[rel='stylesheet']")
  )
    .map((element) => element.outerHTML)
    .join("\n");

  return {
    head,
    body: doc.body.innerHTML,
  };
}

function getPageDimensions(
  pageSize: PageSize,
  orientation: Orientation
) {
  const base = PAGE_SIZES[pageSize];

  if (orientation === "landscape") {
    return {
      width: base.height,
      height: base.width,
    };
  }

  return {
    width: base.width,
    height: base.height,
  };
}

function buildPreviewDocument(
  parts: SafeHtmlParts,
  pageSize: PageSize,
  orientation: Orientation,
  marginMm: number
) {
  const page = getPageDimensions(pageSize, orientation);
  const pageWidthPx = Math.round(page.width * PT_TO_CSS_PX);
  const pageHeightPx = Math.round(page.height * PT_TO_CSS_PX);
  const marginPx = Math.round(marginMm * (96 / 25.4));

  const contentWidthPx = Math.max(120, pageWidthPx - marginPx * 2);
  const contentHeightPx = Math.max(120, pageHeightPx - marginPx * 2);

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #0f172a;
  }

  body {
    width: ${pageWidthPx}px;
    min-height: ${pageHeightPx}px;
    padding: ${marginPx}px;
    box-sizing: border-box;
    overflow-wrap: anywhere;
  }

  #toolijo-html-root {
    width: ${contentWidthPx}px;
    min-height: ${contentHeightPx}px;
    box-sizing: border-box;
    background: #ffffff;
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  img, svg, video, canvas {
    max-width: 100%;
    height: auto;
  }

  table {
    max-width: 100%;
    border-collapse: collapse;
  }

  pre {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
</style>
${parts.head}
</head>
<body>
  <div id="toolijo-html-root">${parts.body}</div>
</body>
</html>`;
}

async function waitForPreviewAssets(doc: Document) {
  if ("fonts" in doc) {
    try {
      await doc.fonts.ready;
    } catch {
      // Continue even when a font cannot be loaded.
    }
  }

  const images = Array.from(doc.images);

  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }

          image.addEventListener("load", () => resolve(), {
            once: true,
          });

          image.addEventListener("error", () => resolve(), {
            once: true,
          });
        })
    )
  );
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
        {icon}
      </div>

      <h3 className="mt-4 text-base font-bold text-slate-950">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        {text}
      </p>
    </div>
  );
}

const faqItems = [
  {
    question: "Can I convert an HTML file to PDF?",
    answer:
      "Yes. Upload an .html or .htm file, preview the rendered content and download the result as a PDF.",
  },
  {
    question: "Can I paste HTML code directly?",
    answer:
      "Yes. You can paste HTML code or an HTML fragment directly into the editor and see a live preview before conversion.",
  },
  {
    question: "Does the HTML to PDF converter support CSS?",
    answer:
      "Inline styles and embedded style blocks are supported. External stylesheets and remote images may depend on the original server and browser access rules.",
  },
  {
    question: "Does Toolijo execute JavaScript inside uploaded HTML?",
    answer:
      "No. Script content and executable event attributes are removed for safer browser-based preview and conversion.",
  },
  {
    question: "Is HTML to PDF free?",
    answer:
      "Yes. Toolijo lets you convert supported HTML content to PDF online for free without requiring a login or sign-up.",
  },
  {
    question: "Will the text stay selectable in the PDF?",
    answer:
      "This browser-based version converts the rendered HTML visually, so text in the generated PDF may not remain selectable like native PDF text.",
  },
];

export default function HtmlToPdfPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [htmlSource, setHtmlSource] = useState(DEFAULT_HTML);
  const [safeParts, setSafeParts] =
    useState<SafeHtmlParts>(DEFAULT_SAFE_PARTS);

  const [pageSize, setPageSize] = useState<PageSize>("a4");
  const [orientation, setOrientation] =
    useState<Orientation>("portrait");
  const [marginMm, setMarginMm] = useState(10);
  const [quality, setQuality] =
    useState<Quality>("high");

  const [fileName, setFileName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const page = getPageDimensions(pageSize, orientation);
  const previewWidthPx = Math.round(page.width * PT_TO_CSS_PX);
  const previewHeightPx = Math.round(page.height * PT_TO_CSS_PX);

  const previewDocument = useMemo(
    () =>
      buildPreviewDocument(
        safeParts,
        pageSize,
        orientation,
        marginMm
      ),
    [safeParts, pageSize, orientation, marginMm]
  );

  const updateHtml = (value: string) => {
    setHtmlSource(value);
    setError("");
    setSuccess(false);

    try {
      setSafeParts(sanitizeHtmlDocument(value));
    } catch {
      setSafeParts({
        head: "",
        body: value,
      });
    }
  };

  const handleFile = async (file: File) => {
    setError("");
    setSuccess(false);

    const validExtension =
      file.name.toLowerCase().endsWith(".html") ||
      file.name.toLowerCase().endsWith(".htm");

    if (!validExtension) {
      setError("Please select an HTML or HTM file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Please select an HTML file smaller than 5 MB.");
      return;
    }

    try {
      const text = await file.text();
      setFileName(file.name);
      updateHtml(text);
    } catch {
      setError("Unable to read this HTML file.");
    }

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const resetSample = () => {
    setHtmlSource(DEFAULT_HTML);
    setSafeParts(DEFAULT_SAFE_PARTS);
    setFileName("");
    setError("");
    setSuccess(false);
  };

  const clearHtml = () => {
    setHtmlSource("");
    setSafeParts({
      head: "",
      body: "",
    });
    setFileName("");
    setError("");
    setSuccess(false);
  };

  const createPdf = async () => {
    if (!htmlSource.trim()) {
      setError("Add HTML code or upload an HTML file first.");
      return;
    }

    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;

    if (!iframe || !doc) {
      setError("The preview is not ready yet. Please try again.");
      return;
    }

    const root = doc.getElementById("toolijo-html-root");

    if (!root) {
      setError("Unable to prepare the HTML preview.");
      return;
    }

    setCreating(true);
    setError("");
    setSuccess(false);

    try {
      await waitForPreviewAssets(doc);

      const captureScale =
        quality === "high" ? 2 : 1.5;

      const canvas = await html2canvas(root, {
        backgroundColor: "#ffffff",
        scale: captureScale,
        useCORS: true,
        allowTaint: false,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        width: root.scrollWidth,
        height: root.scrollHeight,
        windowWidth: Math.max(
          root.scrollWidth,
          doc.documentElement.scrollWidth
        ),
        windowHeight: Math.max(
          root.scrollHeight,
          doc.documentElement.scrollHeight
        ),
      });

      if (!canvas.width || !canvas.height) {
        throw new Error("The rendered HTML is empty.");
      }

      const pdfDoc = await PDFDocument.create();
      const pdfPage = getPageDimensions(
        pageSize,
        orientation
      );

      const marginPt = marginMm * MM_TO_PT;

      const contentWidthPt =
        pdfPage.width - marginPt * 2;

      const contentHeightPt =
        pdfPage.height - marginPt * 2;

      if (
        contentWidthPt <= 0 ||
        contentHeightPt <= 0
      ) {
        throw new Error("The selected margins are too large.");
      }

      const pageSliceHeightPx = Math.max(
        1,
        Math.floor(
          (canvas.width * contentHeightPt) /
            contentWidthPt
        )
      );

      let sourceY = 0;

      while (sourceY < canvas.height) {
        const sliceHeight = Math.min(
          pageSliceHeightPx,
          canvas.height - sourceY
        );

        const sliceCanvas =
          document.createElement("canvas");

        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeight;

        const context =
          sliceCanvas.getContext("2d");

        if (!context) {
          throw new Error(
            "Unable to prepare a PDF page."
          );
        }

        context.fillStyle = "#ffffff";
        context.fillRect(
          0,
          0,
          sliceCanvas.width,
          sliceCanvas.height
        );

        context.drawImage(
          canvas,
          0,
          sourceY,
          canvas.width,
          sliceHeight,
          0,
          0,
          canvas.width,
          sliceHeight
        );

        const jpgData =
          sliceCanvas.toDataURL(
            "image/jpeg",
            quality === "high" ? 0.94 : 0.88
          );

        const image =
          await pdfDoc.embedJpg(jpgData);

        const drawHeightPt =
          (sliceHeight / canvas.width) *
          contentWidthPt;

        const newPage = pdfDoc.addPage([
          pdfPage.width,
          pdfPage.height,
        ]);

        newPage.drawImage(image, {
          x: marginPt,
          y:
            pdfPage.height -
            marginPt -
            drawHeightPt,
          width: contentWidthPt,
          height: drawHeightPt,
        });

        sourceY += sliceHeight;
      }

      const pdfBytes = await pdfDoc.save();

      const blob = new Blob(
        [pdfBytes.buffer as ArrayBuffer],
        {
          type: "application/pdf",
        }
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = fileName
        ? `${fileName.replace(/\.(html?|HTML?)$/i, "")}.pdf`
        : "html-to-pdf.pdf";

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);

      setSuccess(true);
    } catch (err) {
      console.error(err);

      setError(
        "Unable to create the PDF. Some remote images or complex HTML may not be supported by the browser."
      );
    } finally {
      setCreating(false);
    }
  };

  const webAppSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Toolijo HTML to PDF Converter",
    url: "https://toolijo.com/html-to-pdf",
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    description:
      "Convert HTML code and HTML files to PDF online for free with Toolijo.",
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
    <main className="min-h-screen bg-slate-50">
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
        <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
            <Code2 size={30} />
          </div>

          <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            HTML to PDF Converter - Convert HTML to PDF Online Free
          </h1>

          <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
            Paste HTML code or upload an HTML file, preview the result, choose page settings and download a PDF directly in your browser for free.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-slate-500">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              HTML code & files
            </span>

            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              A4 & Letter
            </span>

            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              Browser-based conversion
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <input
          ref={inputRef}
          type="file"
          accept=".html,.htm,text/html"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              handleFile(file);
            }
          }}
        />

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-slate-950">
                  <FileCode2 size={20} />
                  <h2 className="text-lg font-bold">
                    HTML source
                  </h2>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Paste HTML or upload an .html / .htm file.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    inputRef.current?.click()
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  <Upload size={15} />
                  Upload HTML
                </button>

                <button
                  type="button"
                  onClick={resetSample}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                >
                  <Sparkles size={15} />
                  Sample
                </button>

                <button
                  type="button"
                  onClick={clearHtml}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={15} />
                  Clear
                </button>
              </div>
            </div>

            {fileName && (
              <div className="border-b border-blue-100 bg-blue-50 px-5 py-3 text-xs font-semibold text-blue-700">
                Loaded file: {fileName}
              </div>
            )}

            <textarea
              value={htmlSource}
              onChange={(event) =>
                updateHtml(event.target.value)
              }
              spellCheck={false}
              className="min-h-[620px] w-full resize-y bg-slate-950 p-5 font-mono text-sm leading-6 text-slate-100 outline-none"
              aria-label="HTML source code"
            />
          </div>

          <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <div className="flex items-center gap-2 text-slate-950">
                  <Eye size={20} />
                  <h2 className="text-lg font-bold">
                    Live preview
                  </h2>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Preview how your HTML will be rendered.
                </p>
              </div>

              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                Safe preview
              </span>
            </div>

            <div className="h-[680px] overflow-auto bg-slate-200 p-5">
              <div
                className="mx-auto overflow-hidden bg-white shadow-xl"
                style={{
                  width: `${previewWidthPx}px`,
                  minHeight: `${previewHeightPx}px`,
                }}
              >
                <iframe
                  ref={iframeRef}
                  title="HTML preview"
                  srcDoc={previewDocument}
                  sandbox="allow-same-origin"
                  className="block border-0 bg-white"
                  style={{
                    width: `${previewWidthPx}px`,
                    minHeight: `${Math.max(
                      previewHeightPx,
                      660
                    )}px`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2">
            <Settings2 size={21} />
            <h2 className="text-xl font-bold text-slate-950">
              PDF settings
            </h2>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="text-sm font-bold text-slate-700">
                Page size
              </span>

              <select
                value={pageSize}
                onChange={(event) =>
                  setPageSize(
                    event.target.value as PageSize
                  )
                }
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400"
              >
                <option value="a4">A4</option>
                <option value="letter">Letter</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">
                Orientation
              </span>

              <select
                value={orientation}
                onChange={(event) =>
                  setOrientation(
                    event.target.value as Orientation
                  )
                }
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400"
              >
                <option value="portrait">
                  Portrait
                </option>
                <option value="landscape">
                  Landscape
                </option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">
                Margins
              </span>

              <select
                value={marginMm}
                onChange={(event) =>
                  setMarginMm(
                    Number(event.target.value)
                  )
                }
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400"
              >
                <option value={0}>No margin</option>
                <option value={10}>10 mm</option>
                <option value={15}>15 mm</option>
                <option value={20}>20 mm</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">
                Quality
              </span>

              <select
                value={quality}
                onChange={(event) =>
                  setQuality(
                    event.target.value as Quality
                  )
                }
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400"
              >
                <option value="standard">
                  Standard
                </option>
                <option value="high">
                  High quality
                </option>
              </select>
            </label>
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              <CheckCircle2 size={18} />
              PDF created successfully.
            </div>
          )}

          <button
            type="button"
            onClick={createPdf}
            disabled={creating}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-100 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {creating ? (
              <>
                <Loader2
                  size={18}
                  className="animate-spin"
                />
                Creating PDF...
              </>
            ) : (
              <>
                <FileDown size={18} />
                Convert HTML to PDF
              </>
            )}
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard
            icon={<Code2 size={20} />}
            title="HTML code or files"
            text="Paste HTML directly or upload an HTML or HTM file."
          />

          <InfoCard
            icon={<Eye size={20} />}
            title="Live preview"
            text="Check the rendered result before creating your PDF."
          />

          <InfoCard
            icon={<LayoutTemplate size={20} />}
            title="Flexible page layout"
            text="Choose A4 or Letter, orientation, margins and output quality."
          />

          <InfoCard
            icon={<ShieldCheck size={20} />}
            title="Browser processing"
            text="Your HTML is rendered and converted inside your browser."
          />
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-black tracking-tight text-slate-950">
              How to Convert HTML to PDF Online
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-slate-600">
              Convert HTML code or an HTML file to a PDF in three simple steps.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-6">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white">
                1
              </span>

              <h3 className="mt-4 text-lg font-bold text-slate-950">
                Add your HTML
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Paste HTML code into the editor or upload an .html or .htm file from your device.
              </p>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-6">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white">
                2
              </span>

              <h3 className="mt-4 text-lg font-bold text-slate-950">
                Preview and customize
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Review the live preview, then choose page size, orientation, margins and output quality.
              </p>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-6">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white">
                3
              </span>

              <h3 className="mt-4 text-lg font-bold text-slate-950">
                Download the PDF
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Convert the rendered HTML into a multi-page PDF and download it directly to your device.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-black tracking-tight text-slate-950">
              Free HTML to PDF converter for code and HTML files
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-600">
              Toolijo lets you convert HTML code, HTML snippets and HTML files to PDF online. The live preview helps you check headings, paragraphs, tables, images and CSS styling before creating the final PDF.
            </p>

            <p className="mt-4 text-base leading-7 text-slate-600">
              Use the converter for reports, invoices, receipts, printable documents, saved web content, templates and other HTML-based documents that you want to export as PDF.
            </p>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-black tracking-tight text-slate-950">
              Browser-based HTML to PDF conversion
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-600">
              HTML processing and PDF creation happen in your browser, so Toolijo does not need to upload your HTML document to a conversion server.
            </p>

            <p className="mt-4 text-base leading-7 text-slate-600">
              If your HTML references remote images, fonts or stylesheets, your browser may still load those resources from their original websites. Complex remote assets may also be limited by browser security and CORS rules.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-black tracking-tight text-slate-950">
              HTML to PDF FAQ
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-slate-600">
              Common questions about converting HTML files and HTML code to PDF online.
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
