"use client";

import { useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import {
  Document,
  Packer,
  PageBreak,
  Paragraph,
  TextRun,
  Textbox,
} from "docx";
import {
  FileText,
  Upload,
  X,
  FileType2,
  Download,
  LayoutTemplate,
  AlignLeft,
  Check,
} from "lucide-react";

type ConversionMode =
  | "layout"
  | "readability";

type TextPart = {
  text: string;
  x: number;
  y: number;
  fontSize: number;
};

type TextLine = {
  y: number;
  parts: TextPart[];
};

export default function PdfToWordPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const resultSectionRef = useRef<HTMLDivElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null);

  const [converting, setConverting] =
    useState(false);

  const [progress, setProgress] = useState(0);

  const [downloadUrl, setDownloadUrl] =
    useState<string | null>(null);

  const [conversionMode, setConversionMode] =
    useState<ConversionMode>("readability");

  const clearResult = () => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }

    setDownloadUrl(null);
    setProgress(0);
  };

  const createPdfPreview = async (
    selectedFile: File
  ) => {
    const pdfjsLib = await import("pdfjs-dist");

    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "/pdf.worker.min.mjs";

    const arrayBuffer =
      await selectedFile.arrayBuffer();

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
    });

    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({
      scale: 1.3,
    });

    const canvas =
      document.createElement("canvas");

    const context =
      canvas.getContext("2d");

    if (!context) return null;

    canvas.width =
      Math.ceil(viewport.width);

    canvas.height =
      Math.ceil(viewport.height);

    const renderTask = page.render({
      canvas,
      canvasContext: context,
      viewport,
    });

    await renderTask.promise;

    return canvas.toDataURL(
      "image/jpeg",
      0.92
    );
  };

  const loadPdf = async (
    selectedFile: File
  ) => {
    try {
      setLoading(true);
      clearResult();

      const bytes =
        await selectedFile.arrayBuffer();

      const pdf =
        await PDFDocument.load(bytes);

      const preview =
        await createPdfPreview(selectedFile);

      setFile(selectedFile);
      setPageCount(pdf.getPageCount());
      setPreviewUrl(preview);
      setConversionMode("readability");
    } catch (error) {
      console.error(
        "PDF to Word load error:",
        error
      );

      alert("Unable to open this PDF.");
    } finally {
      setLoading(false);
    }
  };

  const handleFile = (
    selectedFile?: File
  ) => {
    if (!selectedFile) return;

    if (
      selectedFile.type !==
      "application/pdf"
    ) {
      alert("Please choose a PDF file.");
      return;
    }

    loadPdf(selectedFile);
  };

  const resetTool = () => {
    clearResult();

    setFile(null);
    setPageCount(0);
    setPreviewUrl(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const convertKeepLayout = async () => {
    if (!file) return;

    try {
      setConverting(true);
      clearResult();

      const pdfjsLib =
        await import("pdfjs-dist");

      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "/pdf.worker.min.mjs";

      const arrayBuffer =
        await file.arrayBuffer();

      const loadingTask =
        pdfjsLib.getDocument({
          data: new Uint8Array(
            arrayBuffer
          ),
        });

      const pdf =
        await loadingTask.promise;

      const sections: {
        properties: {
          page: {
            size: {
              width: number;
              height: number;
            };
            margin: {
              top: number;
              right: number;
              bottom: number;
              left: number;
              header: number;
              footer: number;
              gutter: number;
            };
          };
        };
        children: Array<
          Textbox | Paragraph
        >;
      }[] = [];

      for (
        let pageNumber = 1;
        pageNumber <= pdf.numPages;
        pageNumber++
      ) {
        const page =
          await pdf.getPage(
            pageNumber
          );

        const viewport =
          page.getViewport({
            scale: 1,
          });

        const textContent =
          await page.getTextContent();

        const pageChildren: Array<
          Textbox | Paragraph
        > = [];

        for (
          const rawItem of
          textContent.items
        ) {
          if (!("str" in rawItem)) {
            continue;
          }

          const text =
            rawItem.str;

          if (!text.trim()) {
            continue;
          }

          const item = rawItem as {
            str: string;
            transform: number[];
            width: number;
            height: number;
            fontName: string;
          };

          const transformed =
            pdfjsLib.Util.transform(
              viewport.transform,
              item.transform
            );

          const x =
            transformed[4];

          const baselineY =
            transformed[5];

          const fontHeight =
            Math.max(
              6,
              Math.sqrt(
                transformed[2] *
                  transformed[2] +
                  transformed[3] *
                    transformed[3]
              )
            );

          const top =
            Math.max(
              0,
              baselineY -
                fontHeight
            );

          const estimatedWidth =
            Math.max(
              item.width || 0,
              text.length *
                fontHeight *
                0.42,
              fontHeight
            );

          const boxWidth =
            Math.max(
              estimatedWidth + 4,
              fontHeight * 1.5
            );

          const boxHeight =
            Math.max(
              fontHeight * 1.5,
              10
            );

          pageChildren.push(
            new Textbox({
              children: [
                new TextRun({
                  text,
                  size: Math.max(
                    10,
                    Math.round(
                      fontHeight * 2
                    )
                  ),
                  font: "Arial",
                }),
              ],

              spacing: {
                before: 0,
                after: 0,
                line: Math.round(
                  fontHeight * 20
                ),
              },

              style: {
                position:
                  "absolute",

                positionHorizontal:
                  "absolute",

                positionHorizontalRelative:
                  "page",

                positionVertical:
                  "absolute",

                positionVerticalRelative:
                  "page",

                left:
                  (`${Math.max(
                    0,
                    x
                  ).toFixed(2)}pt` as `${number}pt`),

                top:
                  (`${top.toFixed(
                    2
                  )}pt` as `${number}pt`),

                width:
                  (`${boxWidth.toFixed(
                    2
                  )}pt` as `${number}pt`),

                height:
                  (`${boxHeight.toFixed(
                    2
                  )}pt` as `${number}pt`),

                wrapStyle: "none",

                zIndex: 1,
              },
            })
          );
        }

        if (
          pageChildren.length === 0
        ) {
          pageChildren.push(
            new Paragraph("")
          );
        }

        sections.push({
          properties: {
            page: {
              size: {
                width: Math.round(
                  viewport.width *
                    20
                ),

                height: Math.round(
                  viewport.height *
                    20
                ),
              },

              margin: {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                header: 0,
                footer: 0,
                gutter: 0,
              },
            },
          },

          children:
            pageChildren,
        });

        setProgress(
          Math.round(
            (pageNumber /
              pdf.numPages) *
              100
          )
        );
      }

      const document =
        new Document({
          sections,
        });

      const blob =
        await Packer.toBlob(
          document
        );

      const url =
        URL.createObjectURL(blob);

      setDownloadUrl(url);
      setProgress(100);

      setTimeout(() => {
        resultSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 150);
    } catch (error) {
      console.error(
        "Keep Layout conversion error:",
        error
      );

      alert(
        "Unable to convert this PDF using Keep Layout mode."
      );
    } finally {
      setConverting(false);
    }
  };

  const convertToWord = async () => {
    if (!file) return;

    if (conversionMode === "layout") {
      await convertKeepLayout();
      return;
    }

    try {
      setConverting(true);
      clearResult();

      const pdfjsLib =
        await import("pdfjs-dist");

      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "/pdf.worker.min.mjs";

      const arrayBuffer =
        await file.arrayBuffer();

      const loadingTask =
        pdfjsLib.getDocument({
          data: new Uint8Array(
            arrayBuffer
          ),
        });

      const pdf =
        await loadingTask.promise;

      const wordChildren: Paragraph[] = [];

      for (
        let pageNumber = 1;
        pageNumber <= pdf.numPages;
        pageNumber++
      ) {
        const page =
          await pdf.getPage(pageNumber);

        const textContent =
          await page.getTextContent();

        const parts: TextPart[] = [];

        for (
          const item of textContent.items
        ) {
          if (!("str" in item)) {
            continue;
          }

          if (!item.str.trim()) {
            continue;
          }

          const transform =
            item.transform;

          const fontSize =
            Math.max(
              8,
              Math.min(
                36,
                Math.abs(transform[3]) ||
                  Math.abs(transform[0]) ||
                  11
              )
            );

          parts.push({
            text: item.str,
            x: transform[4],
            y: transform[5],
            fontSize,
          });
        }

        const lines: TextLine[] = [];

        const sortedParts = [...parts].sort(
          (a, b) => {
            const yDifference =
              b.y - a.y;

            if (
              Math.abs(yDifference) >
              3
            ) {
              return yDifference;
            }

            return a.x - b.x;
          }
        );

        for (
          const part of sortedParts
        ) {
          let targetLine =
            lines.find(
              (line) =>
                Math.abs(
                  line.y - part.y
                ) <= 3
            );

          if (!targetLine) {
            targetLine = {
              y: part.y,
              parts: [],
            };

            lines.push(targetLine);
          }

          targetLine.parts.push(part);
        }

        lines.sort(
          (a, b) => b.y - a.y
        );

        for (const line of lines) {
          line.parts.sort(
            (a, b) => a.x - b.x
          );

          const runs: TextRun[] = [];

          line.parts.forEach(
            (part, index) => {
              const previous =
                line.parts[index - 1];

              let prefix = "";

              if (previous) {
                const estimatedPreviousWidth =
                  previous.text.length *
                  previous.fontSize *
                  0.45;

                const gap =
                  part.x -
                  (previous.x +
                    estimatedPreviousWidth);

                if (gap > 2) {
                  prefix = " ";
                }
              }

              runs.push(
                new TextRun({
                  text:
                    prefix +
                    part.text,
                  size:
                    Math.round(
                      part.fontSize * 2
                    ),
                  font: "Arial",
                })
              );
            }
          );

          wordChildren.push(
            new Paragraph({
              children: runs,
              spacing: {
                after: 60,
              },
            })
          );
        }

        if (
          pageNumber <
          pdf.numPages
        ) {
          wordChildren.push(
            new Paragraph({
              children: [
                new PageBreak(),
              ],
            })
          );
        }

        setProgress(
          Math.round(
            (pageNumber /
              pdf.numPages) *
              100
          )
        );
      }

      const document =
        new Document({
          sections: [
            {
              properties: {},
              children: wordChildren,
            },
          ],
        });

      const blob =
        await Packer.toBlob(
          document
        );

      const url =
        URL.createObjectURL(blob);

      setDownloadUrl(url);
      setProgress(100);

      setTimeout(() => {
        resultSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 150);
    } catch (error) {
      console.error(
        "PDF to Word conversion error:",
        error
      );

      alert(
        "Unable to convert this PDF to Word."
      );
    } finally {
      setConverting(false);
    }
  };

  const wordFileName = file
    ? `${
        file.name.replace(
          /\.pdf$/i,
          ""
        )
      }.docx`
    : "converted.docx";

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-[1500px] px-5 py-10">

        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            PDF Tool
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            PDF to Word
          </h1>

          <p className="mt-4 text-lg text-slate-600">
            Convert PDF documents into editable Word files.
            Your file stays in your browser.
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(event) =>
            handleFile(
              event.target.files?.[0]
            )
          }
        />

        {!file ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">

            <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white px-6 py-16 shadow-[0_20px_70px_rgba(15,23,42,0.08)] md:px-12 md:py-20">

              <div className="pointer-events-none absolute -left-24 top-10 h-64 w-64 rounded-full bg-blue-100/50 blur-3xl" />

              <div className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-violet-100/50 blur-3xl" />

              <div className="relative mx-auto max-w-3xl text-center">

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
                  <FileType2 size={28} />
                </div>

                <h2 className="mt-7 text-3xl font-bold tracking-tight text-slate-950">
                  Convert your PDF to Word
                </h2>

                <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-500">
                  Upload a text-based PDF and convert its
                  content into an editable DOCX document.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    inputRef.current?.click()
                  }
                  onDragOver={(event) =>
                    event.preventDefault()
                  }
                  onDrop={(event) => {
                    event.preventDefault();

                    handleFile(
                      event.dataTransfer
                        .files?.[0]
                    );
                  }}
                  className="group mx-auto mt-8 flex min-h-[190px] w-full max-w-2xl flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-blue-200 bg-blue-50/40 px-6 transition hover:border-blue-500 hover:bg-blue-50"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md transition group-hover:-translate-y-1">
                    <Upload size={25} />
                  </div>

                  <span className="mt-5 text-lg font-bold text-slate-900">
                    {loading
                      ? "Opening PDF..."
                      : "Choose PDF file"}
                  </span>

                  <span className="mt-1 text-sm text-slate-500">
                    or drag and drop it here
                  </span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">

            {/* FILE BAR */}
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <FileText size={22} />
                </div>

                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-950">
                    {file.name}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {pageCount}{" "}
                    {pageCount === 1
                      ? "page"
                      : "pages"}{" "}
                    Ã‚Â·{" "}
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={resetTool}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <X size={16} />
                Remove
              </button>
            </div>

            {/* CONVERSION MODE */}
            <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50/70 p-5 md:p-6">

              <div className="text-center">
                <h2 className="text-lg font-bold text-slate-950">
                  Choose conversion mode
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Select how you want the Word document to be created.
                </p>
              </div>

              <div className="mx-auto mt-6 grid max-w-3xl gap-4 md:grid-cols-2">

                {/* KEEP LAYOUT */}
                <button
                  type="button"
                  onClick={() =>
                    setConversionMode("layout")
                  }
                  className={`group relative rounded-[22px] border-2 p-6 text-left transition duration-200 ${
                    conversionMode === "layout"
                      ? "border-blue-600 bg-blue-50 shadow-[0_12px_30px_rgba(37,99,235,0.12)]"
                      : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
                  }`}
                >
                  {conversionMode === "layout" && (
                    <div className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white">
                      <Check size={16} strokeWidth={3} />
                    </div>
                  )}

                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      conversionMode === "layout"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-600"
                    }`}
                  >
                    <LayoutTemplate size={23} />
                  </div>

                  <h3 className="mt-5 text-lg font-bold text-slate-950">
                    Keep layout
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Preserve text positions, columns,
                    spacing and page structure while
                    keeping the text editable in Word.
                  </p>

                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-600">
                    Best for invoices & positioned text
                    <span>{"\u2192"}</span>
                  </div>
                </button>

                {/* READABILITY */}
                <button
                  type="button"
                  onClick={() =>
                    setConversionMode("readability")
                  }
                  className={`group relative rounded-[22px] border-2 p-6 text-left transition duration-200 ${
                    conversionMode === "readability"
                      ? "border-blue-600 bg-blue-50 shadow-[0_12px_30px_rgba(37,99,235,0.12)]"
                      : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
                  }`}
                >
                  {conversionMode === "readability" && (
                    <div className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white">
                      <Check size={16} strokeWidth={3} />
                    </div>
                  )}

                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      conversionMode === "readability"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-600"
                    }`}
                  >
                    <AlignLeft size={23} />
                  </div>

                  <h3 className="mt-5 text-lg font-bold text-slate-950">
                    Optimize for legibility
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Create cleaner flowing text that is
                    easier to edit, read and reuse in Word.
                  </p>

                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-600">
                    Best for editing
                    <span>{"\u2192"}</span>
                  </div>
                </button>
              </div>
            </div>

            {/* PREVIEW */}
            <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100/80">

              <div className="border-b border-slate-200 bg-white px-5 py-4">
                <p className="font-bold text-slate-950">
                  PDF preview
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Page 1 of {pageCount}
                </p>
              </div>

              <div className="flex min-h-[620px] items-center justify-center p-6">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="PDF preview"
                    draggable={false}
                    className="block max-h-[580px] max-w-full bg-white object-contain shadow-[0_18px_45px_rgba(15,23,42,0.15)]"
                  />
                ) : (
                  <p className="text-sm text-slate-400">
                    Loading preview...
                  </p>
                )}
              </div>
            </div>

            {/* CONVERT ACTION */}
            <div className="sticky bottom-4 z-40 mt-6 rounded-[24px] border border-slate-200 bg-white/95 px-5 py-4 shadow-[0_14px_45px_rgba(15,23,42,0.16)] backdrop-blur-md md:px-8">

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <p className="font-bold text-slate-950">
                    Ready to convert
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {conversionMode === "layout"
                      ? "Preserve the original PDF layout as closely as possible."
                      : `Convert all ${pageCount} ${
                          pageCount === 1 ? "page" : "pages"
                        } into clean editable Word content.`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={convertToWord}
                  disabled={converting}
                  className="group inline-flex min-w-[230px] items-center justify-center rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-[0_10px_28px_rgba(37,99,235,0.28)] transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {converting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Converting {progress}%
                    </span>
                  ) : (
                    <span className="flex items-center gap-3">
                      Convert to Word
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15">
                        {"\u2192"}
                      </span>
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* DOWNLOAD */}
            {downloadUrl && (
              <div
                ref={resultSectionRef}
                className="mt-6 rounded-[24px] border border-emerald-200 bg-emerald-50 p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                  <div>
                    <p className="font-bold text-slate-950">
                      Your Word document is ready
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      PDF text was converted into an editable DOCX file.
                    </p>
                  </div>

                  <a
                    href={downloadUrl}
                    download={wordFileName}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-[0_8px_22px_rgba(5,150,105,0.22)] transition hover:-translate-y-0.5 hover:bg-emerald-700"
                  >
                    <Download size={18} />
                    Download Word
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
