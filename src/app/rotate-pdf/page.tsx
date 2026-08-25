"use client";

import { useMemo, useState } from "react";
import { PDFDocument, degrees } from "pdf-lib";

type PdfPagePreview = {
  pageNumber: number;
  previewUrl: string;
  originalRotation: number;
};

function normalizeRotation(value: number) {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function RotatePdfPage() {
  const [file, setFile] = useState<File | null>(null);

  const [fileBytes, setFileBytes] =
    useState<Uint8Array<ArrayBuffer> | null>(null);

  const [pages, setPages] =
    useState<PdfPagePreview[]>([]);

  const [rotations, setRotations] =
    useState<Record<number, number>>({});

  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] =
    useState(false);

  const [error, setError] = useState("");

  const totalPages = pages.length;

  const canDownload = useMemo(() => {
    return !!file && !!fileBytes && pages.length > 0;
  }, [file, fileBytes, pages]);

  const clearAll = () => {
    setFile(null);
    setFileBytes(null);
    setPages([]);
    setRotations({});
    setError("");
    setLoading(false);
    setDownloading(false);
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile =
      event.target.files?.[0];

    if (!selectedFile) return;

    if (
      selectedFile.type !== "application/pdf"
    ) {
      setError(
        "Please select a valid PDF file."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");
      setFile(selectedFile);
      setPages([]);
      setRotations({});

      const sourceBytes = new Uint8Array(
        await selectedFile.arrayBuffer()
      );

      setFileBytes(sourceBytes);

      const pdfjsLib =
        await import("pdfjs-dist");

      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "/pdf.worker.min.mjs";

      const pdf = await pdfjsLib.getDocument({
        data: sourceBytes.slice(),
      }).promise;

      const previews: PdfPagePreview[] = [];

      for (
        let pageNumber = 1;
        pageNumber <= pdf.numPages;
        pageNumber += 1
      ) {
        const page =
          await pdf.getPage(pageNumber);

        const pageRotation =
          page.rotate || 0;

        const viewport =
          page.getViewport({
            scale: 0.55,
            rotation: pageRotation,
          });

        const canvas =
          document.createElement("canvas");

        const context =
          canvas.getContext("2d");

        if (!context) continue;

        canvas.width =
          Math.ceil(viewport.width);

        canvas.height =
          Math.ceil(viewport.height);

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

        previews.push({
          pageNumber,
          previewUrl:
            canvas.toDataURL(
              "image/jpeg",
              0.9
            ),
          originalRotation:
            pageRotation,
        });

        page.cleanup();
      }

      setPages(previews);
    } catch (err) {
      console.error(err);

      setFile(null);
      setFileBytes(null);
      setPages([]);
      setRotations({});

      setError(
        "Unable to load PDF. Please try another file."
      );
    } finally {
      setLoading(false);
    }
  };

  const rotatePage = (
    pageNumber: number,
    amount: number
  ) => {
    setRotations((current) => ({
      ...current,

      [pageNumber]: normalizeRotation(
        (current[pageNumber] || 0) +
          amount
      ),
    }));
  };

  const rotateAllPages = (
    amount: number
  ) => {
    if (!pages.length) return;

    setRotations((current) => {
      const updated = { ...current };

      pages.forEach((page) => {
        updated[page.pageNumber] =
          normalizeRotation(
            (updated[
              page.pageNumber
            ] || 0) + amount
          );
      });

      return updated;
    });
  };

  const resetPageRotation = (
    pageNumber: number
  ) => {
    setRotations((current) => ({
      ...current,
      [pageNumber]: 0,
    }));
  };

  const resetAllRotations = () => {
    const updated: Record<
      number,
      number
    > = {};

    pages.forEach((page) => {
      updated[page.pageNumber] = 0;
    });

    setRotations(updated);
  };

  const downloadRotatedPdf =
    async () => {
      if (!fileBytes || !file) return;

      try {
        setDownloading(true);
        setError("");

        const pdfDoc =
          await PDFDocument.load(
            fileBytes
          );

        const docPages =
          pdfDoc.getPages();

        docPages.forEach(
          (page, index) => {
            const pageNumber =
              index + 1;

            const originalRotation =
              pages.find(
                (item) =>
                  item.pageNumber ===
                  pageNumber
              )?.originalRotation || 0;

            const extraRotation =
              rotations[
                pageNumber
              ] || 0;

            const finalRotation =
              normalizeRotation(
                originalRotation +
                  extraRotation
              );

            page.setRotation(
              degrees(finalRotation)
            );
          }
        );

        const outputBytes =
          await pdfDoc.save();

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

        const fileName =
          file.name.replace(
            /\.pdf$/i,
            ""
          );

        link.href = url;

        link.download =
          `${fileName}-rotated.pdf`;

        document.body.appendChild(
          link
        );

        link.click();
        link.remove();

        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);
      } catch (err) {
        console.error(err);

        setError(
          "Unable to export rotated PDF."
        );
      } finally {
        setDownloading(false);
      }
    };

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-3xl text-white shadow-lg shadow-blue-200">
            ↻
          </div>

          <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Rotate PDF
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Rotate individual PDF pages or
            rotate every page at once, then
            download your updated PDF.
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs font-semibold text-slate-500">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              Rotate individual pages
            </span>

            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              Rotate all pages
            </span>

            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              Browser processing
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {!file ? (
          <div className="mx-auto max-w-4xl">
            <label className="group flex min-h-[390px] cursor-pointer flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-blue-200 bg-white px-6 text-center shadow-sm transition hover:border-blue-400 hover:bg-blue-50/30">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-3xl text-white shadow-lg shadow-blue-200 transition group-hover:-translate-y-1">
                ↻
              </div>

              <h2 className="mt-6 text-2xl font-bold text-slate-900">
                Upload your PDF
              </h2>

              <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
                Choose a PDF to preview and
                rotate its pages.
              </p>

              <span className="mt-6 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-100">
                Select PDF file
              </span>

              <p className="mt-4 text-xs text-slate-400">
                Your file is processed in
                your browser
              </p>

              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={
                  handleFileChange
                }
                className="hidden"
              />
            </label>

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
                <div>
                  <p className="max-w-xl truncate text-lg font-bold text-slate-900">
                    {file.name}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {formatFileSize(
                      file.size
                    )}
                    {" · "}
                    {totalPages}{" "}
                    {totalPages === 1
                      ? "page"
                      : "pages"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      rotateAllPages(-90)
                    }
                    disabled={
                      loading ||
                      !pages.length
                    }
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
                  >
                    ↶ Rotate All Left
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      rotateAllPages(90)
                    }
                    disabled={
                      loading ||
                      !pages.length
                    }
                    className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-40"
                  >
                    ↷ Rotate All Right
                  </button>

                  <button
                    type="button"
                    onClick={
                      resetAllRotations
                    }
                    disabled={
                      loading ||
                      !pages.length
                    }
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                  >
                    Reset
                  </button>

                  <button
                    type="button"
                    onClick={clearAll}
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                  >
                    Remove
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
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />

                <p className="mt-4 font-semibold text-slate-900">
                  Loading PDF pages...
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {pages.map((page) => {
                    const extraRotation =
                      rotations[
                        page.pageNumber
                      ] || 0;

                    const finalRotation =
                      normalizeRotation(
                        page.originalRotation +
                          extraRotation
                      );

                    return (
                      <article
                        key={
                          page.pageNumber
                        }
                        className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm"
                      >
                        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              Page{" "}
                              {
                                page.pageNumber
                              }
                            </p>

                            <p className="mt-0.5 text-xs text-slate-500">
                              {
                                finalRotation
                              }
                              °
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              resetPageRotation(
                                page.pageNumber
                              )
                            }
                            className="text-xs font-semibold text-slate-400 transition hover:text-blue-600"
                          >
                            Reset
                          </button>
                        </div>

                        <div className="flex h-[330px] items-center justify-center overflow-hidden bg-slate-100 p-5">
                          <img
                            src={
                              page.previewUrl
                            }
                            alt={`Page ${page.pageNumber}`}
                            className="max-h-[270px] max-w-[90%] object-contain shadow-md transition-transform duration-200"
                            style={{
                              transform: `rotate(${extraRotation}deg)`,
                            }}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-4">
                          <button
                            type="button"
                            onClick={() =>
                              rotatePage(
                                page.pageNumber,
                                -90
                              )
                            }
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            ↶ Left
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              rotatePage(
                                page.pageNumber,
                                90
                              )
                            }
                            className="rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                          >
                            ↷ Right
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="sticky bottom-5 z-20 mx-auto mt-10 max-w-2xl rounded-[22px] border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-bold text-slate-900">
                        Ready to download?
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Your original PDF is
                        preserved until you
                        download the rotated
                        version.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={
                        downloadRotatedPdf
                      }
                      disabled={
                        !canDownload ||
                        downloading
                      }
                      className="shrink-0 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-100 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {downloading
                        ? "Creating PDF..."
                        : "Download Rotated PDF"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
          <p className="text-sm font-bold text-slate-900">
            Private & secure
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            Your PDF is processed locally
            in your browser and is not
            uploaded to a conversion server.
          </p>
        </div>
      </section>
    </main>
  );
}
