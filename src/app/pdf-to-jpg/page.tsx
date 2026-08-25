"use client";

import { useEffect, useRef, useState } from "react";
import {
  Upload,
  FileText,
  Download,
  Trash2,
  Images,
  Loader2,
  ShieldCheck,
  Archive,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import JSZip from "jszip";

type ConvertedPage = {
  pageNumber: number;
  url: string;
  blob: Blob;
  width: number;
  height: number;
};

export default function PdfToJpgPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<ConvertedPage[]>([]);
  const [converting, setConverting] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [quality, setQuality] = useState("high");
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      pages.forEach((page) => URL.revokeObjectURL(page.url));
    };
  }, [pages]);

  const clearPages = () => {
    pages.forEach((page) => URL.revokeObjectURL(page.url));
    setPages([]);
  };

  const handleFile = async (selectedFile?: File) => {
    if (!selectedFile) return;

    if (selectedFile.type !== "application/pdf") {
      setError("Please select a PDF file.");
      return;
    }

    clearPages();
    setFile(selectedFile);
    setError("");
  };

  const convertPdf = async () => {
    if (!file) return;

    try {
      setConverting(true);
      setError("");
      clearPages();

      const pdfjsLib = await import("pdfjs-dist");

      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "/pdf.worker.min.mjs";

      const bytes = new Uint8Array(
        await file.arrayBuffer()
      );

      const pdf = await pdfjsLib.getDocument({
        data: bytes,
      }).promise;

      const renderScale =
        quality === "maximum"
          ? 3
          : quality === "high"
            ? 2
            : 1.5;

      const jpegQuality =
        quality === "maximum"
          ? 0.98
          : quality === "high"
            ? 0.92
            : 0.82;

      const convertedPages: ConvertedPage[] = [];

      for (
        let pageNumber = 1;
        pageNumber <= pdf.numPages;
        pageNumber += 1
      ) {
        const page = await pdf.getPage(pageNumber);

        const viewport = page.getViewport({
          scale: renderScale,
        });

        const canvas = document.createElement("canvas");

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error(
            `Unable to render page ${pageNumber}.`
          );
        }

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

        const blob = await new Promise<Blob>(
          (resolve, reject) => {
            canvas.toBlob(
              (result) => {
                if (result) {
                  resolve(result);
                } else {
                  reject(
                    new Error(
                      `Unable to convert page ${pageNumber}.`
                    )
                  );
                }
              },
              "image/jpeg",
              jpegQuality
            );
          }
        );

        convertedPages.push({
          pageNumber,
          blob,
          url: URL.createObjectURL(blob),
          width: canvas.width,
          height: canvas.height,
        });

        page.cleanup();
      }

      setPages(convertedPages);
    } catch (err) {
      console.error(err);
      setError(
        "Unable to convert this PDF. Please try another file."
      );
    } finally {
      setConverting(false);
    }
  };

  const downloadPage = (page: ConvertedPage) => {
    const link = document.createElement("a");

    const baseName =
      file?.name.replace(/\.pdf$/i, "") || "pdf";

    link.href = page.url;
    link.download =
      `${baseName}-page-${page.pageNumber}.jpg`;

    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const downloadAll = async () => {
    if (!file || pages.length === 0) return;

    try {
      setDownloadingZip(true);

      const zip = new JSZip();

      const baseName =
        file.name.replace(/\.pdf$/i, "") || "pdf";

      pages.forEach((page) => {
        zip.file(
          `${baseName}-page-${page.pageNumber}.jpg`,
          page.blob
        );
      });

      const zipBlob = await zip.generateAsync({
        type: "blob",
      });

      const url = URL.createObjectURL(zipBlob);

      const link = document.createElement("a");

      link.href = url;
      link.download = `${baseName}-jpg-images.zip`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError("Unable to create ZIP file.");
    } finally {
      setDownloadingZip(false);
    }
  };

  const resetTool = () => {
    clearPages();
    setFile(null);
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const fileSize =
    file && file.size > 0
      ? file.size >= 1024 * 1024
        ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
        : `${(file.size / 1024).toFixed(0)} KB`
      : "";

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200/60">
              <Images size={30} />
            </div>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
              <Sparkles size={14} />
              Fast browser conversion
            </div>

            <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              PDF to JPG
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Convert every PDF page into a crisp,
              high-quality JPG image in just a few seconds.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(event) =>
                handleFile(event.target.files?.[0])
              }
            />

            {!file ? (
              <button
                type="button"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                className="group flex min-h-[330px] w-full flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-blue-200 bg-gradient-to-b from-blue-50/70 to-white px-6 text-center transition hover:border-blue-400 hover:from-blue-50"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200 transition group-hover:-translate-y-1">
                  <Upload size={28} />
                </div>

                <h2 className="mt-6 text-2xl font-bold text-slate-900">
                  Upload your PDF
                </h2>

                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Choose a PDF and we will convert every
                  page into a separate JPG image.
                </p>

                <span className="mt-6 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm">
                  Select PDF file
                </span>

                <span className="mt-4 text-xs text-slate-400">
                  Your file stays in your browser
                </span>
              </button>
            ) : (
              <>
                <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                      <FileText size={26} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-slate-900">
                        {file.name}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {fileSize}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={resetTool}
                    disabled={converting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                    Remove
                  </button>
                </div>

                {pages.length === 0 && (
                  <div className="mt-6">
                    <p className="mb-3 text-sm font-bold text-slate-900">
                      Select image quality
                    </p>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={() => setQuality("standard")}
                        disabled={converting}
                        className={`rounded-2xl border p-4 text-left transition ${
                          quality === "standard"
                            ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <p className="font-semibold text-slate-900">
                          Standard
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Smaller JPG files
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setQuality("high")}
                        disabled={converting}
                        className={`relative rounded-2xl border p-4 text-left transition ${
                          quality === "high"
                            ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <span className="absolute right-3 top-3 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          BEST
                        </span>

                        <p className="font-semibold text-slate-900">
                          High
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Recommended quality
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setQuality("maximum")}
                        disabled={converting}
                        className={`rounded-2xl border p-4 text-left transition ${
                          quality === "maximum"
                            ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <p className="font-semibold text-slate-900">
                          Maximum
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Highest resolution
                        </p>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={convertPdf}
                      disabled={converting}
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-100 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {converting ? (
                        <>
                          <Loader2
                            size={19}
                            className="animate-spin"
                          />
                          Converting PDF...
                        </>
                      ) : (
                        <>
                          <Images size={19} />
                          Convert PDF to JPG
                        </>
                      )}
                    </button>
                  </div>
                )}

                {converting && (
                  <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-6 text-center">
                    <Loader2
                      size={30}
                      className="mx-auto animate-spin text-blue-600"
                    />

                    <p className="mt-3 font-semibold text-slate-900">
                      Converting your PDF
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Please wait while we create your JPG images.
                    </p>
                  </div>
                )}
              </>
            )}

            {error && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <CheckCircle2
                size={20}
                className="text-blue-600"
              />
              <p className="mt-3 text-sm font-bold text-slate-900">
                High-quality images
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Crisp JPG output with selectable quality.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <Archive
                size={20}
                className="text-blue-600"
              />
              <p className="mt-3 text-sm font-bold text-slate-900">
                One-click ZIP
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Download every converted page together.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <ShieldCheck
                size={20}
                className="text-blue-600"
              />
              <p className="mt-3 text-sm font-bold text-slate-900">
                Private conversion
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Processing happens directly in your browser.
              </p>
            </div>
          </div>
        </div>

        {pages.length > 0 && (
          <section className="mt-14">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  <CheckCircle2 size={14} />
                  Conversion complete
                </div>

                <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  Converted JPG images
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {pages.length}{" "}
                  {pages.length === 1
                    ? "page converted"
                    : "pages converted"}
                </p>
              </div>

              <button
                type="button"
                onClick={downloadAll}
                disabled={downloadingZip}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-blue-100 transition hover:bg-blue-700 disabled:opacity-60"
              >
                {downloadingZip ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Archive size={17} />
                )}

                Download All ZIP
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {pages.map((page) => (
                <article
                  key={page.pageNumber}
                  className="group overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex h-[360px] items-center justify-center bg-slate-100 p-5">
                    <img
                      src={page.url}
                      alt={`PDF page ${page.pageNumber}`}
                      className="max-h-full max-w-full object-contain shadow-md"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-slate-100 p-4">
                    <div>
                      <p className="font-bold text-slate-900">
                        Page {page.pageNumber}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {page.width} × {page.height}px
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => downloadPage(page)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <Download size={15} />
                      JPG
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={resetTool}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Convert another PDF
              </button>
            </div>
          </section>
        )}

        <div className="mx-auto mt-14 max-w-3xl rounded-2xl border border-slate-200 bg-white px-6 py-5 text-center shadow-sm">
          <div className="flex items-center justify-center gap-2 text-sm font-bold text-slate-900">
            <ShieldCheck size={18} className="text-emerald-600" />
            Private & secure
          </div>

          <p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-slate-500">
            Your PDF is processed locally in your browser.
            Your documents are not uploaded to a conversion server.
          </p>
        </div>
      </section>
    </main>
  );
}
