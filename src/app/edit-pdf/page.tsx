"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  Type,
  Link as LinkIcon,
  FileInput,
  Image as ImageIcon,
  PenLine,
  Eraser,
  Highlighter,
  Shapes,
  Undo2,
  Redo2,
  Upload,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Trash2,
  Plus,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

type TextBox = {
  id: string;
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
  angle: number;
  fontSize: number;
  fontFamily: string;
  fontName: string;
};

type PageSize = {
  width: number;
  height: number;
};

export default function EditPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);

  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);

  const [scale, setScale] = useState(1.3);
  const [rotation, setRotation] = useState(0);

  const [loading, setLoading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");

  const [pageSize, setPageSize] = useState<PageSize>({
    width: 0,
    height: 0,
  });

  const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
  const [selectedText, setSelectedText] = useState<TextBox | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tools = [
    { label: "Text", icon: Type, enabled: true },
    { label: "Links", icon: LinkIcon, enabled: false },
    { label: "Forms", icon: FileInput, enabled: false },
    { label: "Images", icon: ImageIcon, enabled: false },
    { label: "Sign", icon: PenLine, enabled: false },
    { label: "Whiteout", icon: Eraser, enabled: false },
    { label: "Annotate", icon: Highlighter, enabled: false },
    { label: "Shapes", icon: Shapes, enabled: false },
  ];

  const handleFile = async (selectedFile?: File) => {
    if (!selectedFile) return;

    if (selectedFile.type !== "application/pdf") {
      alert("Please select a PDF file.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const pdfjsLib = await import("pdfjs-dist");

      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      const arrayBuffer = await selectedFile.arrayBuffer();

      const data = new Uint8Array(arrayBuffer);

      const loadedPdf = await pdfjsLib.getDocument({
        data,
      }).promise;

      setFile(selectedFile);
      setPdfDoc(loadedPdf);

      setPageCount(loadedPdf.numPages);
      setPageNumber(1);

      setScale(1.3);
      setRotation(0);

      setTextBoxes([]);
      setSelectedText(null);
    } catch (err) {
      console.error(err);

      setError(
        "Unable to open this PDF. Please try another file."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let cancelled = false;

    let renderTask:
      | {
          promise: Promise<void>;
          cancel: () => void;
        }
      | null = null;

    const renderPage = async () => {
      try {
        setRendering(true);

        setSelectedText(null);
        setTextBoxes([]);

        const page = await pdfDoc.getPage(pageNumber);

        if (cancelled) return;

        const viewport = page.getViewport({
          scale,
          rotation,
        });

        const canvas = canvasRef.current;

        if (!canvas) return;

        const context = canvas.getContext("2d");

        if (!context) return;

        const width = Math.floor(viewport.width);
        const height = Math.floor(viewport.height);

        canvas.width = width;
        canvas.height = height;

        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        setPageSize({
          width,
          height,
        });

        context.clearRect(
          0,
          0,
          canvas.width,
          canvas.height
        );

        renderTask = page.render({
          canvasContext: context,
          viewport,
          canvas,
        });

        await renderTask.promise;

        if (cancelled) return;

        /*
         * EXTRACT EXISTING PDF TEXT
         */

        const textContent = await page.getTextContent();

        if (cancelled) return;

        const pdfjsLib = await import("pdfjs-dist");

        const extractedText: TextBox[] =
          textContent.items.flatMap((item, index) => {
            if (!("str" in item)) {
              return [];
            }

            if (!item.str.trim()) {
              return [];
            }

            const transformed =
              pdfjsLib.Util.transform(
                viewport.transform,
                item.transform
              );

            const angle =
              (Math.atan2(
                transformed[1],
                transformed[0]
              ) *
                180) /
              Math.PI;

            /*
             * PDF text height is best estimated
             * from its transformation matrix.
             */
            const fontHeight = Math.max(
              Math.hypot(
                transformed[2],
                transformed[3]
              ),
              6
            );

            /*
             * item.width is in PDF coordinate space.
             * Apply current viewport scale.
             */
            const textWidth = Math.max(
              Math.abs(item.width * scale),
              4
            );

            const left = transformed[4];

            const top =
              transformed[5] - fontHeight;

            const textStyle =
              textContent.styles[item.fontName];

            const fontFamily =
              textStyle?.fontFamily ||
              item.fontName ||
              "Unknown font";

            return [
              {
                id: `${pageNumber}-${index}`,
                text: item.str,

                left,
                top,

                width: textWidth,
                height: fontHeight,

                angle,

                fontSize: fontHeight,

                fontFamily,
                fontName: item.fontName,
              },
            ];
          });

        setTextBoxes(extractedText);
      } catch (err) {
        if (
          err instanceof Error &&
          err.name ===
            "RenderingCancelledException"
        ) {
          return;
        }

        console.error(
          "PDF render error:",
          err
        );
      } finally {
        if (!cancelled) {
          setRendering(false);
        }
      }
    };

    renderPage();

    return () => {
      cancelled = true;

      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [
    pdfDoc,
    pageNumber,
    scale,
    rotation,
  ]);

  const zoomIn = () => {
    setScale((current) =>
      Math.min(current + 0.2, 3)
    );
  };

  const zoomOut = () => {
    setScale((current) =>
      Math.max(current - 0.2, 0.5)
    );
  };

  const rotatePage = () => {
    setRotation(
      (current) => (current + 90) % 360
    );
  };

  const previousPage = () => {
    setPageNumber((current) =>
      Math.max(1, current - 1)
    );
  };

  const nextPage = () => {
    setPageNumber((current) =>
      Math.min(pageCount, current + 1)
    );
  };

  /*
   * UPLOAD SCREEN
   */

  if (!file || !pdfDoc) {
    return (
      <main className="min-h-screen bg-[#f7f8fc]">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold text-slate-700"
            >
              <ChevronLeft size={19} />

              Back
            </Link>

            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">
                P
              </div>

              <span className="text-lg font-bold text-slate-950">
                PDF Editor
              </span>
            </div>

            <div className="w-16" />
          </div>
        </header>

        <section className="flex min-h-[calc(100vh-74px)] items-center justify-center px-6 py-16">
          <div className="w-full max-w-3xl text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
              <FileInput size={32} />
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">
              Edit PDF
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-slate-600">
              Upload a PDF and edit text,
              images, signatures,
              annotations and more directly
              from your browser.
            </p>

            <div
              onDragOver={(event) =>
                event.preventDefault()
              }
              onDrop={(event) => {
                event.preventDefault();

                handleFile(
                  event.dataTransfer.files?.[0]
                );
              }}
              className="mt-10 rounded-3xl border-2 border-dashed border-blue-300 bg-white px-8 py-14 shadow-sm transition hover:border-blue-500"
            >
              <Upload
                className="mx-auto text-blue-600"
                size={40}
              />

              <h2 className="mt-5 text-xl font-bold text-slate-900">
                Drop your PDF here
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                or select a PDF from your
                computer
              </p>

              <button
                onClick={() =>
                  fileInputRef.current?.click()
                }
                disabled={loading}
                className="mt-7 rounded-xl bg-blue-600 px-8 py-3.5 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Opening PDF..."
                  : "Choose PDF file"}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(event) =>
                  handleFile(
                    event.target.files?.[0]
                  )
                }
              />
            </div>

            {error && (
              <p className="mt-5 font-medium text-red-600">
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-wrap justify-center gap-x-7 gap-y-2 text-sm text-slate-500">
              <span>✓ Easy to use</span>
              <span>✓ Browser based</span>
              <span>
                ✓ No signup required
              </span>
            </div>
          </div>
        </section>
      </main>
    );
  }

  /*
   * PDF EDITOR
   */

  return (
    <main className="flex min-h-screen flex-col bg-[#e9e9e9]">
      {/* FILE HEADER */}

      <header className="border-b border-slate-200 bg-white">
        <div className="flex min-h-16 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
            >
              <ChevronLeft size={20} />
            </Link>

            <div>
              <p className="max-w-64 truncate text-sm font-semibold text-slate-900">
                {file.name}
              </p>

              <p className="text-xs text-slate-500">
                {(
                  file.size /
                  1024 /
                  1024
                ).toFixed(2)}{" "}
                MB
              </p>
            </div>
          </div>

          <button
            disabled
            title="Editing and export will be enabled in the next development steps."
            className="flex cursor-not-allowed items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white opacity-60"
          >
            <Download size={17} />

            Apply changes
          </button>
        </div>
      </header>

      {/* MAIN TOOLBAR */}

      <div className="sticky top-0 z-30 border-b border-slate-300 bg-white px-3 py-2 shadow-sm">
        <div className="mx-auto flex max-w-[1500px] items-center justify-center gap-1 overflow-x-auto">
          {tools.map((tool) => {
            const Icon = tool.icon;

            return (
              <button
                key={tool.label}
                disabled={!tool.enabled}
                title={
                  tool.enabled
                    ? "Select existing PDF text"
                    : `${tool.label} will be added next`
                }
                className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                  tool.enabled
                    ? "bg-blue-50 text-blue-700"
                    : "cursor-not-allowed text-slate-400"
                }`}
              >
                <Icon size={17} />

                {tool.label}
              </button>
            );
          })}

          <div className="mx-1 h-7 w-px shrink-0 bg-slate-300" />

          <button
            title="Undo"
            className="rounded-md p-2 text-blue-600 hover:bg-blue-50"
          >
            <Undo2 size={18} />
          </button>

          <button
            title="Redo"
            className="rounded-md p-2 text-blue-600 hover:bg-blue-50"
          >
            <Redo2 size={18} />
          </button>
        </div>
      </div>

      {/* SELECTED TEXT INFO */}

      {selectedText && (
        <div className="z-20 border-b border-blue-200 bg-blue-50 px-4 py-2">
          <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-center gap-3 text-sm">
            <span className="font-semibold text-blue-800">
              Selected text:
            </span>

            <span className="max-w-md truncate rounded-md border border-blue-200 bg-white px-3 py-1.5 font-medium text-slate-900">
              {selectedText.text}
            </span>

            <span className="rounded-md bg-white px-3 py-1.5 text-slate-600">
              Font:{" "}
              <strong>
                {selectedText.fontFamily}
              </strong>
            </span>

            <span className="rounded-md bg-white px-3 py-1.5 text-slate-600">
              Size:{" "}
              <strong>
                {Math.round(
                  selectedText.fontSize
                )}
                px
              </strong>
            </span>

            <button
              onClick={() =>
                setSelectedText(null)
              }
              className="rounded-md p-1.5 text-slate-500 hover:bg-blue-100 hover:text-slate-900"
              title="Clear selection"
            >
              <X size={17} />
            </button>
          </div>
        </div>
      )}

      {/* PAGE CONTROLS */}

      <div className="border-b border-slate-300 bg-[#ededed] px-4 py-3">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-center gap-2">
          <button
            onClick={previousPage}
            disabled={pageNumber <= 1}
            className="rounded-md border border-blue-400 bg-white p-2 text-blue-600 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronLeft size={17} />
          </button>

          <span className="min-w-24 text-center text-sm font-semibold text-slate-700">
            Page {pageNumber} /{" "}
            {pageCount}
          </span>

          <button
            onClick={nextPage}
            disabled={
              pageNumber >= pageCount
            }
            className="rounded-md border border-blue-400 bg-white p-2 text-blue-600 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronRight size={17} />
          </button>

          <div className="mx-2 h-7 w-px bg-slate-300" />

          <button
            title="Delete page - coming later"
            className="rounded-md border border-blue-400 bg-white p-2 text-blue-600 hover:bg-blue-50"
          >
            <Trash2 size={16} />
          </button>

          <button
            onClick={zoomIn}
            title="Zoom in"
            className="rounded-md border border-blue-400 bg-white p-2 text-blue-600 hover:bg-blue-50"
          >
            <ZoomIn size={16} />
          </button>

          <button
            onClick={zoomOut}
            title="Zoom out"
            className="rounded-md border border-blue-400 bg-white p-2 text-blue-600 hover:bg-blue-50"
          >
            <ZoomOut size={16} />
          </button>

          <button
            onClick={rotatePage}
            title="Rotate"
            className="rounded-md border border-blue-400 bg-white p-2 text-blue-600 hover:bg-blue-50"
          >
            <RotateCw size={16} />
          </button>

          <span className="ml-1 min-w-14 text-center text-xs font-semibold text-slate-600">
            {Math.round(scale * 100)}%
          </span>

          <button
            title="Insert page - coming later"
            className="ml-2 flex items-center gap-2 rounded-md border border-blue-400 bg-white px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
          >
            <Plus size={16} />

            Insert page here
          </button>
        </div>
      </div>

      {/* PDF WORKSPACE */}

      <section className="relative flex flex-1 justify-center overflow-auto p-6 md:p-8">
        {rendering && (
          <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
            Rendering page...
          </div>
        )}

        <div className="flex min-h-[900px] min-w-fit items-start justify-center">
          <div
            className="relative bg-white shadow-xl"
            style={{
              width: pageSize.width,
              height: pageSize.height,
            }}
          >
            {/* PDF CANVAS */}

            <canvas
              ref={canvasRef}
              className="absolute left-0 top-0 bg-white"
            />

            {/* CLICKABLE TEXT LAYER */}

            <div className="pointer-events-none absolute inset-0 z-10">
              {textBoxes.map((box) => {
                const isSelected =
                  selectedText?.id === box.id;

                return (
                  <button
                    key={box.id}
                    type="button"
                    title={box.text}
                    aria-label={`PDF text: ${box.text}`}
                    onClick={(event) => {
                      event.stopPropagation();

                      setSelectedText(box);
                    }}
                    className={`pointer-events-auto absolute m-0 cursor-text p-0 transition ${
                      isSelected
                        ? "border-2 border-blue-500 bg-blue-500/10"
                        : "border border-transparent hover:border-blue-400 hover:bg-blue-400/10"
                    }`}
                    style={{
                      left: box.left,
                      top: box.top,

                      width: Math.max(
                        box.width,
                        4
                      ),

                      height: Math.max(
                        box.height,
                        8
                      ),

                      transform: `rotate(${box.angle}deg)`,

                      transformOrigin:
                        "0 0",
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {!rendering &&
          textBoxes.length === 0 && (
            <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 shadow">
              No selectable text detected on
              this page.
            </div>
          )}
      </section>
    </main>
  );
}