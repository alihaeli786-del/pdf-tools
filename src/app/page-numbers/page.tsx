"use client";

import { useRef, useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  FileText,
  Upload,
  X,
  Hash,
  MapPin,
  Type,
  ListOrdered,
  Download,
} from "lucide-react";

type NumberPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

type NumberStyle =
  | "number"
  | "page-number"
  | "number-total"
  | "page-number-total";

export default function PageNumbersPdfPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const resultSectionRef = useRef<HTMLDivElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null);

  const [numberStyle, setNumberStyle] =
    useState<NumberStyle>("page-number-total");

  const [position, setPosition] =
    useState<NumberPosition>("bottom-center");

  const [startNumber, setStartNumber] = useState(1);
  const [fontSize, setFontSize] = useState(12);
  const [skipFirstPage, setSkipFirstPage] = useState(false);

  const [processing, setProcessing] = useState(false);

  const [downloadUrl, setDownloadUrl] =
    useState<string | null>(null);

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

    const context = canvas.getContext("2d");

    if (!context) return null;

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

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

      const bytes =
        await selectedFile.arrayBuffer();

      const pdf =
        await PDFDocument.load(bytes);

      const preview =
        await createPdfPreview(selectedFile);

      setFile(selectedFile);
      setPageCount(pdf.getPageCount());
      setPreviewUrl(preview);

      setNumberStyle("page-number-total");
      setPosition("bottom-center");
      setStartNumber(1);
      setFontSize(12);
      setSkipFirstPage(false);
    } catch (error) {
      console.error(
        "PDF load error:",
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

  const getNumberText = (
    number: number
  ) => {
    const numberedPages =
      skipFirstPage
        ? Math.max(pageCount - 1, 0)
        : pageCount;

    const totalNumber =
      startNumber +
      Math.max(numberedPages - 1, 0);

    if (numberStyle === "number") {
      return String(number);
    }

    if (numberStyle === "page-number") {
      return `Page ${number}`;
    }

    if (numberStyle === "number-total") {
      return `${number} of ${totalNumber}`;
    }

    return `Page ${number} of ${totalNumber}`;
  };

  const clearResult = () => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }

    setDownloadUrl(null);
  };

  const applyPageNumbers = async () => {
    if (!file) return;

    try {
      setProcessing(true);
      clearResult();

      const bytes = await file.arrayBuffer();

      const pdf =
        await PDFDocument.load(bytes);

      const font =
        await pdf.embedFont(
          StandardFonts.Helvetica
        );

      const pages = pdf.getPages();

      pages.forEach((page, index) => {
        if (
          skipFirstPage &&
          index === 0
        ) {
          return;
        }

        const sequenceIndex =
          skipFirstPage
            ? index - 1
            : index;

        const number =
          startNumber +
          sequenceIndex;

        const text =
          getNumberText(number);

        const {
          width,
          height,
        } = page.getSize();

        const textWidth =
          font.widthOfTextAtSize(
            text,
            fontSize
          );

        const margin = 30;

        let x =
          (width - textWidth) / 2;

        let y = margin;

        if (
          position === "top-left"
        ) {
          x = margin;
          y =
            height -
            fontSize -
            margin;
        }

        if (
          position === "top-center"
        ) {
          x =
            (width - textWidth) / 2;

          y =
            height -
            fontSize -
            margin;
        }

        if (
          position === "top-right"
        ) {
          x =
            width -
            textWidth -
            margin;

          y =
            height -
            fontSize -
            margin;
        }

        if (
          position === "bottom-left"
        ) {
          x = margin;
          y = margin;
        }

        if (
          position === "bottom-center"
        ) {
          x =
            (width - textWidth) / 2;

          y = margin;
        }

        if (
          position === "bottom-right"
        ) {
          x =
            width -
            textWidth -
            margin;

          y = margin;
        }

        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(
            0.12,
            0.15,
            0.2
          ),
        });
      });

      const resultBytes =
        await pdf.save();

      const outputBuffer =
        new ArrayBuffer(
          resultBytes.byteLength
        );

      new Uint8Array(
        outputBuffer
      ).set(resultBytes);

      const blob = new Blob(
        [outputBuffer],
        {
          type: "application/pdf",
        }
      );

      const url =
        URL.createObjectURL(blob);

      setDownloadUrl(url);

      setTimeout(() => {
        resultSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 150);
    } catch (error) {
      console.error(
        "Page numbers PDF error:",
        error
      );

      alert(
        "Unable to add page numbers to this PDF."
      );
    } finally {
      setProcessing(false);
    }
  };

  const previewText =
    skipFirstPage
      ? ""
      : getNumberText(startNumber);

  const positionClasses: Record<
    NumberPosition,
    string
  > = {
    "top-left": "left-[5%] top-[3%]",
    "top-center":
      "left-1/2 top-[3%] -translate-x-1/2",
    "top-right": "right-[5%] top-[3%]",
    "bottom-left": "bottom-[3%] left-[5%]",
    "bottom-center":
      "bottom-[3%] left-1/2 -translate-x-1/2",
    "bottom-right":
      "bottom-[3%] right-[5%]",
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-[1500px] px-5 py-10">

        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            PDF Tool
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Page Numbers PDF
          </h1>

          <p className="mt-4 text-lg text-slate-600">
            Add professional page numbers to your PDF.
            Your files stay in your browser.
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
                  <Hash size={28} />
                </div>

                <h2 className="mt-7 text-3xl font-bold tracking-tight text-slate-950">
                  Add page numbers to your PDF
                </h2>

                <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-500">
                  Upload your document, customize the numbering
                  and download the finished PDF.
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
                      event.dataTransfer.files?.[0]
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
                    Â·{" "}
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={resetTool}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <X size={16} />
                Remove
              </button>
            </div>

            {/* WORKSPACE */}
            <div className="mt-6 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">

              {/* SETTINGS */}
              <div className="rounded-[24px] border border-slate-200 bg-white p-5">

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <ListOrdered size={19} />
                  </div>

                  <div>
                    <h2 className="font-bold text-slate-950">
                      Numbering settings
                    </h2>

                    <p className="text-sm text-slate-500">
                      Customize your page numbers.
                    </p>
                  </div>
                </div>

                {/* STYLE */}
                <div className="mt-6">
                  <label className="text-sm font-semibold text-slate-700">
                    Number style
                  </label>

                  <select
                    value={numberStyle}
                    onChange={(event) =>
                      setNumberStyle(
                        event.target.value as NumberStyle
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500"
                  >
                    <option value="number">
                      1
                    </option>

                    <option value="page-number">
                      Page 1
                    </option>

                    <option value="number-total">
                      1 of {pageCount}
                    </option>

                    <option value="page-number-total">
                      Page 1 of {pageCount}
                    </option>
                  </select>
                </div>

                {/* START NUMBER */}
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <label className="text-sm font-semibold text-slate-700">
                    Start numbering from
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={startNumber}
                    onChange={(event) =>
                      setStartNumber(
                        Math.max(
                          1,
                          Number(event.target.value) || 1
                        )
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500"
                  />
                </div>

                {/* FONT SIZE */}
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Type size={16} />
                      Font size
                    </label>

                    <span className="text-sm font-bold text-blue-600">
                      {fontSize}px
                    </span>
                  </div>

                  <input
                    type="range"
                    min="8"
                    max="36"
                    value={fontSize}
                    onChange={(event) =>
                      setFontSize(
                        Number(event.target.value)
                      )
                    }
                    className="mt-3 w-full accent-blue-600"
                  />
                </div>

                {/* POSITION */}
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <MapPin size={16} />
                    Position
                  </label>

                  <select
                    value={position}
                    onChange={(event) =>
                      setPosition(
                        event.target.value as NumberPosition
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500"
                  >
                    <option value="top-left">
                      Top left
                    </option>

                    <option value="top-center">
                      Top center
                    </option>

                    <option value="top-right">
                      Top right
                    </option>

                    <option value="bottom-left">
                      Bottom left
                    </option>

                    <option value="bottom-center">
                      Bottom center
                    </option>

                    <option value="bottom-right">
                      Bottom right
                    </option>
                  </select>
                </div>

                {/* SKIP FIRST */}
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">

                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        Skip first page
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Useful for cover pages.
                      </p>
                    </div>

                    <input
                      type="checkbox"
                      checked={skipFirstPage}
                      onChange={(event) =>
                        setSkipFirstPage(
                          event.target.checked
                        )
                      }
                      className="h-5 w-5 accent-blue-600"
                    />
                  </label>
                </div>
              </div>

              {/* PREVIEW */}
              <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100/80">

                <div className="border-b border-slate-200 bg-white px-5 py-4">
                  <p className="font-bold text-slate-950">
                    Live preview
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Page 1 of {pageCount}
                  </p>
                </div>

                <div className="flex min-h-[650px] items-center justify-center p-6">

                  {previewUrl ? (
                    <div className="relative inline-block max-w-full overflow-hidden bg-white shadow-[0_18px_45px_rgba(15,23,42,0.15)]">

                      <img
                        src={previewUrl}
                        alt="PDF preview"
                        draggable={false}
                        className="block max-h-[610px] max-w-full object-contain"
                      />

                      {previewText && (
                        <div
                          className={`pointer-events-none absolute whitespace-nowrap font-medium text-slate-900 ${positionClasses[position]}`}
                          style={{
                            fontSize: `${fontSize}px`,
                          }}
                        >
                          {previewText}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">
                      Loading preview...
                    </p>
                  )}
                </div>

                <div className="border-t border-slate-200 bg-white px-5 py-3 text-center text-xs text-slate-500">
                  Preview updates automatically when you change the settings.
                </div>
              </div>
            </div>

            {/* ACTION BAR */}
            <div className="sticky bottom-4 z-40 mt-6 rounded-[24px] border border-slate-200 bg-white/95 px-5 py-4 shadow-[0_14px_45px_rgba(15,23,42,0.16)] backdrop-blur-md md:px-8">

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <p className="font-bold text-slate-950">
                    {pageCount}{" "}
                    {pageCount === 1
                      ? "page"
                      : "pages"} ready
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Add your selected numbering style to the PDF.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={applyPageNumbers}
                  disabled={processing}
                  className="group inline-flex min-w-[230px] items-center justify-center rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-[0_10px_28px_rgba(37,99,235,0.28)] transition duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-[0_14px_34px_rgba(37,99,235,0.32)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {processing ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Adding numbers...
                    </span>
                  ) : (
                    <span className="flex items-center gap-3">
                      Add page numbers
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-base transition group-hover:translate-x-0.5 group-hover:bg-white/20">
                        {"\u2192"}
                      </span>
                    </span>
                  )}
                </button>
              </div>
            </div>

            {downloadUrl && (
              <div
                ref={resultSectionRef}
                className="mt-6 rounded-[24px] border border-emerald-200 bg-emerald-50 p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                  <div>
                    <p className="font-bold text-slate-950">
                      Your numbered PDF is ready
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      Page numbers were added successfully.
                    </p>
                  </div>

                  <a
                    href={downloadUrl}
                    download={`numbered-${file.name}`}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-[0_8px_22px_rgba(5,150,105,0.22)] transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-[0_12px_28px_rgba(5,150,105,0.28)]"
                  >
                    <Download size={18} />
                    Download PDF
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
