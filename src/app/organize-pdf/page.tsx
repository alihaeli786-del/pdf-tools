"use client";

import { useRef, useState } from "react";
import type { DragEvent } from "react";
import {
  Upload,
  FileText,
  GripVertical,
  Trash2,
  Download,
  Loader2,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { PDFDocument } from "pdf-lib";

type PageItem = {
  id: string;
  pageNumber: number;
  previewUrl: string;
};

export default function OrganizePdfPage() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [fileBytes, setFileBytes] =
    useState<Uint8Array<ArrayBuffer> | null>(null);

  const [pages, setPages] = useState<PageItem[]>([]);
  const [originalPages, setOriginalPages] = useState<PageItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [draggedId, setDraggedId] =
    useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }

    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const handleFile = async (
    selectedFile?: File
  ) => {
    if (!selectedFile) return;

    if (selectedFile.type !== "application/pdf") {
      setError("Please select a valid PDF file.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess(false);

      setFile(selectedFile);

      const sourceBytes = new Uint8Array(
        await selectedFile.arrayBuffer()
      );

      setFileBytes(sourceBytes);

      const pdfjsLib = await import("pdfjs-dist");

      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "/pdf.worker.min.mjs";

      const pdf = await pdfjsLib.getDocument({
        data: sourceBytes.slice(),
      }).promise;

      const loadedPages: PageItem[] = [];

      for (
        let pageNumber = 1;
        pageNumber <= pdf.numPages;
        pageNumber += 1
      ) {
        const page = await pdf.getPage(pageNumber);

        const viewport = page.getViewport({
          scale: 0.55,
        });

        const canvas =
          document.createElement("canvas");

        const context = canvas.getContext("2d");

        if (!context) continue;

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        context.fillStyle = "#ffffff";
        context.fillRect(
          0,
          0,
          canvas.width,
          canvas.height
        );

        await page.render({
          canvas,
          canvasContext: context,
          viewport,
        }).promise;

        loadedPages.push({
          id: `page-${pageNumber}-${Date.now()}`,
          pageNumber,
          previewUrl: canvas.toDataURL(
            "image/jpeg",
            0.9
          ),
        });

        page.cleanup();
      }

      setPages(loadedPages);
      setOriginalPages(loadedPages);
    } catch (err) {
      console.error(err);
      setError(
        "Unable to load this PDF. Please try another file."
      );
      setFile(null);
      setFileBytes(null);
      setPages([]);
      setOriginalPages([]);
    } finally {
      setLoading(false);
    }

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const removePage = (id: string) => {
    setPages((current) =>
      current.filter((page) => page.id !== id)
    );

    setSuccess(false);
  };

  const resetOrder = () => {
    setPages([...originalPages]);
    setSuccess(false);
  };

  const clearAll = () => {
    setFile(null);
    setFileBytes(null);
    setPages([]);
    setOriginalPages([]);
    setError("");
    setSuccess(false);
    setDraggedId(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleDragStart = (
    event: DragEvent<HTMLElement>,
    id: string
  ) => {
    setDraggedId(id);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (
    event: DragEvent<HTMLElement>
  ) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (
    event: DragEvent<HTMLElement>,
    targetId: string
  ) => {
    event.preventDefault();

    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    setPages((current) => {
      const fromIndex = current.findIndex(
        (page) => page.id === draggedId
      );

      const toIndex = current.findIndex(
        (page) => page.id === targetId
      );

      if (fromIndex === -1 || toIndex === -1) {
        return current;
      }

      const next = [...current];
      const [movedPage] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, movedPage);

      return next;
    });

    setDraggedId(null);
    setSuccess(false);
  };

  const exportPdf = async () => {
    if (!fileBytes || !file || pages.length === 0) {
      return;
    }

    try {
      setExporting(true);
      setError("");
      setSuccess(false);

      const sourcePdf =
        await PDFDocument.load(fileBytes);

      const outputPdf =
        await PDFDocument.create();

      const sourceIndexes = pages.map(
        (page) => page.pageNumber - 1
      );

      const copiedPages =
        await outputPdf.copyPages(
          sourcePdf,
          sourceIndexes
        );

      copiedPages.forEach((page) => {
        outputPdf.addPage(page);
      });

      const outputBytes =
        await outputPdf.save();

      const pdfArray =
        new Uint8Array(outputBytes);

      const blob = new Blob(
        [
          pdfArray.buffer.slice(
            pdfArray.byteOffset,
            pdfArray.byteOffset +
              pdfArray.byteLength
          ),
        ],
        {
          type: "application/pdf",
        }
      );

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      const baseName =
        file.name.replace(/\.pdf$/i, "");

      link.href = url;
      link.download =
        `${baseName}-organized.pdf`;

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
        "Unable to create organized PDF."
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
            <GripVertical size={30} />
          </div>

          <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Organize PDF
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Rearrange PDF pages, remove unwanted
            pages, and download a clean organized PDF.
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs font-semibold text-slate-500">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              Drag to reorder
            </span>

            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              Delete pages
            </span>

            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              Browser processing
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(event) =>
            handleFile(event.target.files?.[0])
          }
        />

        {!file ? (
          <div className="mx-auto max-w-4xl">
            <button
              type="button"
              onClick={() =>
                inputRef.current?.click()
              }
              className="group flex min-h-[390px] w-full flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-blue-200 bg-white px-6 text-center shadow-sm transition hover:border-blue-400 hover:bg-blue-50/30"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200 transition group-hover:-translate-y-1">
                <Upload size={28} />
              </div>

              <h2 className="mt-6 text-2xl font-bold text-slate-900">
                Upload your PDF
              </h2>

              <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
                Select a PDF to rearrange and remove
                pages before downloading.
              </p>

              <span className="mt-6 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-100">
                Select PDF file
              </span>

              <p className="mt-4 text-xs text-slate-400">
                Your PDF stays in your browser
              </p>
            </button>

            {error && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="mb-7 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                      <FileText size={23} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-slate-900">
                        {file.name}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {formatSize(file.size)}
                        {" · "}
                        {pages.length}{" "}
                        {pages.length === 1
                          ? "page"
                          : "pages"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={resetOrder}
                    disabled={
                      loading ||
                      pages.length === 0
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                  >
                    <RotateCcw size={16} />
                    Reset
                  </button>

                  <button
                    type="button"
                    onClick={clearAll}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                  >
                    <Trash2 size={16} />
                    Remove PDF
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {loading ? (
              <div className="rounded-[28px] border border-slate-200 bg-white py-20 text-center shadow-sm">
                <Loader2
                  size={36}
                  className="mx-auto animate-spin text-blue-600"
                />

                <p className="mt-4 font-semibold text-slate-900">
                  Loading PDF pages...
                </p>
              </div>
            ) : (
              <>
                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-950">
                      Organize pages
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Drag pages to reorder them.
                      Delete any page you do not need.
                    </p>
                  </div>

                  <div className="rounded-full bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700">
                    {pages.length} pages remaining
                  </div>
                </div>

                {pages.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-red-200 bg-red-50 py-16 text-center">
                    <Trash2
                      size={34}
                      className="mx-auto text-red-500"
                    />

                    <p className="mt-3 font-bold text-red-700">
                      All pages removed
                    </p>

                    <p className="mt-1 text-sm text-red-600">
                      Use Reset to restore the original pages.
                    </p>

                    <button
                      type="button"
                      onClick={resetOrder}
                      className="mt-5 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white"
                    >
                      Restore pages
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {pages.map((page, index) => (
                      <article
                        key={page.id}
                        draggable
                        onDragStart={(event) =>
                          handleDragStart(
                            event,
                            page.id
                          )
                        }
                        onDragOver={handleDragOver}
                        onDrop={(event) =>
                          handleDrop(
                            event,
                            page.id
                          )
                        }
                        onDragEnd={() =>
                          setDraggedId(null)
                        }
                        className={`group overflow-hidden rounded-[22px] border bg-white shadow-sm transition ${
                          draggedId === page.id
                            ? "scale-[0.98] border-blue-400 opacity-50"
                            : "border-slate-200 hover:-translate-y-1 hover:shadow-lg"
                        }`}
                      >
                        <div className="relative flex h-[330px] items-center justify-center bg-slate-100 p-5">
                          <div className="absolute left-3 top-3 flex h-8 min-w-8 items-center justify-center rounded-lg bg-slate-900/80 px-2 text-xs font-bold text-white">
                            {index + 1}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              removePage(page.id)
                            }
                            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 shadow transition hover:bg-red-50 hover:text-red-600"
                            aria-label="Delete page"
                          >
                            <Trash2 size={15} />
                          </button>

                          <img
                            src={page.previewUrl}
                            alt={`Page ${page.pageNumber}`}
                            draggable={false}
                            className="max-h-[285px] max-w-[90%] object-contain shadow-md"
                          />
                        </div>

                        <div className="flex items-center gap-3 border-t border-slate-100 p-4">
                          <GripVertical
                            size={18}
                            className="shrink-0 text-slate-400"
                          />

                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900">
                              Original page{" "}
                              {page.pageNumber}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              New position: {index + 1}
                            </p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}

                <div className="sticky bottom-5 z-20 mx-auto mt-10 max-w-2xl rounded-[22px] border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-bold text-slate-900">
                        Ready to save?
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Export pages in the exact order shown above.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={exportPdf}
                      disabled={
                        exporting ||
                        pages.length === 0
                      }
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-100 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {exporting ? (
                        <>
                          <Loader2
                            size={17}
                            className="animate-spin"
                          />
                          Creating PDF...
                        </>
                      ) : (
                        <>
                          <Download size={17} />
                          Download Organized PDF
                        </>
                      )}
                    </button>
                  </div>

                  {success && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 size={15} />
                      Organized PDF downloaded successfully.
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
          <ShieldCheck
            size={20}
            className="mx-auto text-emerald-600"
          />

          <p className="mt-2 text-sm font-bold text-slate-900">
            Private & secure
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Your PDF is processed locally in your browser
            and is not uploaded to a conversion server.
          </p>
        </div>
      </section>
    </main>
  );
}

