"use client";

import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { PDFDocument } from "pdf-lib";
import {
  FileText,
  Upload,
  X,
  Crop,
  RotateCcw,
  Move,
  Download,
} from "lucide-react";

type CropSelection = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ResizeHandle =
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w";

type Interaction =
  | {
      mode: "create";
      startX: number;
      startY: number;
    }
  | {
      mode: "move";
      startX: number;
      startY: number;
      original: CropSelection;
    }
  | {
      mode: "resize";
      startX: number;
      startY: number;
      original: CropSelection;
      handle: ResizeHandle;
    };

const clamp = (
  value: number,
  min: number,
  max: number
) => Math.min(Math.max(value, min), max);

export default function CropPdfPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<Interaction | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null);

  const [selection, setSelection] =
    useState<CropSelection | null>(null);

  const [moveMode, setMoveMode] = useState(false);

  const [applyScope, setApplyScope] =
    useState<"current" | "all">("all");

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
      scale: 1.4,
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
      0.94
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

      setSelection(null);
      setMoveMode(false);
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
      alert(
        "Please choose a PDF file."
      );
      return;
    }

    loadPdf(selectedFile);
  };

  const clearResult = () => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }

    setDownloadUrl(null);
  };

  const resetSelection = () => {
    clearResult();
    setSelection(null);
    setMoveMode(false);
    interactionRef.current = null;
  };

  const resetTool = () => {
    setFile(null);
    setPageCount(0);
    setPreviewUrl(null);

    resetSelection();

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const getPoint = (
    event: ReactPointerEvent
  ) => {
    const element = previewRef.current;

    if (!element) {
      return {
        x: 0,
        y: 0,
      };
    }

    const rect =
      element.getBoundingClientRect();

    return {
      x: clamp(
        ((event.clientX - rect.left) /
          rect.width) *
          100,
        0,
        100
      ),
      y: clamp(
        ((event.clientY - rect.top) /
          rect.height) *
          100,
        0,
        100
      ),
    };
  };

  const capturePointer = (
    pointerId: number
  ) => {
    try {
      previewRef.current?.setPointerCapture(
        pointerId
      );
    } catch {
      // Ignore capture errors.
    }
  };

  const beginCreate = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (event.button !== 0) return;

    const point = getPoint(event);

    setMoveMode(false);

    setSelection({
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
    });

    interactionRef.current = {
      mode: "create",
      startX: point.x,
      startY: point.y,
    };

    capturePointer(event.pointerId);

    event.preventDefault();
  };

  const beginMove = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (!selection || !moveMode) {
      return;
    }

    const point = getPoint(event);

    interactionRef.current = {
      mode: "move",
      startX: point.x,
      startY: point.y,
      original: {
        ...selection,
      },
    };

    capturePointer(event.pointerId);

    event.preventDefault();
    event.stopPropagation();
  };

  const beginResize = (
    event: ReactPointerEvent<HTMLDivElement>,
    handle: ResizeHandle
  ) => {
    if (!selection) return;

    const point = getPoint(event);

    interactionRef.current = {
      mode: "resize",
      startX: point.x,
      startY: point.y,
      original: {
        ...selection,
      },
      handle,
    };

    capturePointer(event.pointerId);

    event.preventDefault();
    event.stopPropagation();
  };

  const handlePointerMove = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    const interaction =
      interactionRef.current;

    if (!interaction) return;

    const point = getPoint(event);

    if (interaction.mode === "create") {
      const x = Math.min(
        interaction.startX,
        point.x
      );

      const y = Math.min(
        interaction.startY,
        point.y
      );

      const width = Math.abs(
        point.x -
          interaction.startX
      );

      const height = Math.abs(
        point.y -
          interaction.startY
      );

      setSelection({
        x,
        y,
        width,
        height,
      });

      return;
    }

    if (interaction.mode === "move") {
      const {
        original,
        startX,
        startY,
      } = interaction;

      const dx =
        point.x - startX;

      const dy =
        point.y - startY;

      setSelection({
        ...original,

        x: clamp(
          original.x + dx,
          0,
          100 - original.width
        ),

        y: clamp(
          original.y + dy,
          0,
          100 - original.height
        ),
      });

      return;
    }

    const {
      original,
      handle,
    } = interaction;

    const minSize = 3;

    let left = original.x;
    let top = original.y;

    let right =
      original.x +
      original.width;

    let bottom =
      original.y +
      original.height;

    if (
      handle.includes("w")
    ) {
      left = clamp(
        point.x,
        0,
        right - minSize
      );
    }

    if (
      handle.includes("e")
    ) {
      right = clamp(
        point.x,
        left + minSize,
        100
      );
    }

    if (
      handle.includes("n")
    ) {
      top = clamp(
        point.y,
        0,
        bottom - minSize
      );
    }

    if (
      handle.includes("s")
    ) {
      bottom = clamp(
        point.y,
        top + minSize,
        100
      );
    }

    if (handle === "n") {
      top = clamp(
        point.y,
        0,
        bottom - minSize
      );
    }

    if (handle === "s") {
      bottom = clamp(
        point.y,
        top + minSize,
        100
      );
    }

    if (handle === "w") {
      left = clamp(
        point.x,
        0,
        right - minSize
      );
    }

    if (handle === "e") {
      right = clamp(
        point.x,
        left + minSize,
        100
      );
    }

    setSelection({
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    });
  };

  const finishInteraction = () => {
    const interaction =
      interactionRef.current;

    interactionRef.current = null;

    if (
      interaction?.mode === "create"
    ) {
      setSelection((current) => {
        if (
          !current ||
          current.width < 1 ||
          current.height < 1
        ) {
          return null;
        }

        return current;
      });
    }
  };

  const cropPdf = async () => {
    if (!file || !selection) {
      alert("Please select a crop area first.");
      return;
    }

    if (
      selection.width < 1 ||
      selection.height < 1
    ) {
      alert("Crop area is too small.");
      return;
    }

    try {
      setProcessing(true);
      clearResult();

      const bytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(bytes);

      const pages = pdf.getPages();

      const targetPages =
        applyScope === "all"
          ? pages
          : [pages[0]];

      for (const page of targetPages) {
        const { width, height } =
          page.getSize();

        const cropX =
          width * (selection.x / 100);

        const cropWidth =
          width *
          (selection.width / 100);

        const cropHeight =
          height *
          (selection.height / 100);

        /*
          Preview coordinates start at the top-left,
          but PDF coordinates start at the bottom-left.
        */
        const cropY =
          height -
          height *
            ((selection.y +
              selection.height) /
              100);

        page.setCropBox(
          cropX,
          cropY,
          cropWidth,
          cropHeight
        );
      }

      const resultBytes =
        await pdf.save();

      const outputBuffer =
        new ArrayBuffer(
          resultBytes.byteLength
        );

      new Uint8Array(outputBuffer).set(
        resultBytes
      );

      const blob = new Blob(
        [outputBuffer],
        {
          type: "application/pdf",
        }
      );

      setDownloadUrl(
        URL.createObjectURL(blob)
      );
    } catch (error) {
      console.error(
        "Crop PDF error:",
        error
      );

      alert(
        "Unable to crop this PDF."
      );
    } finally {
      setProcessing(false);
    }
  };

  const cropValues = selection
    ? {
        left: selection.x,
        top: selection.y,
        right:
          100 -
          selection.x -
          selection.width,
        bottom:
          100 -
          selection.y -
          selection.height,
      }
    : null;

  const handles: Array<{
    id: ResizeHandle;
    className: string;
    cursor: string;
  }> = [
    {
      id: "nw",
      className:
        "-left-2 -top-2",
      cursor: "nwse-resize",
    },
    {
      id: "n",
      className:
        "left-1/2 -top-2 -translate-x-1/2",
      cursor: "ns-resize",
    },
    {
      id: "ne",
      className:
        "-right-2 -top-2",
      cursor: "nesw-resize",
    },
    {
      id: "e",
      className:
        "-right-2 top-1/2 -translate-y-1/2",
      cursor: "ew-resize",
    },
    {
      id: "se",
      className:
        "-bottom-2 -right-2",
      cursor: "nwse-resize",
    },
    {
      id: "s",
      className:
        "-bottom-2 left-1/2 -translate-x-1/2",
      cursor: "ns-resize",
    },
    {
      id: "sw",
      className:
        "-bottom-2 -left-2",
      cursor: "nesw-resize",
    },
    {
      id: "w",
      className:
        "-left-2 top-1/2 -translate-y-1/2",
      cursor: "ew-resize",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f7f8fc]">
      <section className="mx-auto max-w-[1500px] px-5 py-10">

        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            PDF Tool
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Crop PDF
          </h1>

          <p className="mt-4 text-lg text-slate-600">
            Visually select the exact area you want to keep.
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
                  <FileText size={28} />
                </div>

                <h2 className="mt-7 text-3xl font-bold tracking-tight text-slate-950">
                  Select the area you want to keep
                </h2>

                <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-500">
                  Upload your PDF and draw a crop area directly
                  over the document.
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
          <div className="mt-8 rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.07)] md:p-8">

            {/* FILE */}
            <div className="border-b border-slate-100 pb-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">

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
                        {pageCount === 1 ? "page" : "pages"} Ã‚Â·{" "}
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  <div className="flex min-h-[72px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-center">
                    <p className="text-sm font-bold text-slate-900">
                      Interactive Crop Editor
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Draw a selection, resize it with the handles, or double-click it to move.
                    </p>
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
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">

              {/* SIDE PANEL */}
              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Crop size={19} />
                  </div>

                  <div>
                    <h2 className="font-bold text-slate-950">
                      Crop area
                    </h2>

                    <p className="text-sm text-slate-500">
                      Draw directly on the page.
                    </p>
                  </div>
                </div>

                {!selection ? (
                  <div className="mt-6 rounded-xl border border-dashed border-blue-200 bg-blue-50/50 p-4 text-center">
                    <p className="text-sm font-bold text-slate-900">
                      No crop selected
                    </p>

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Click and drag over the PDF to select the
                      area you want to keep.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mt-6 grid grid-cols-2 gap-2">
                      {cropValues &&
                        [
                          [
                            "Top",
                            cropValues.top,
                          ],
                          [
                            "Right",
                            cropValues.right,
                          ],
                          [
                            "Bottom",
                            cropValues.bottom,
                          ],
                          [
                            "Left",
                            cropValues.left,
                          ],
                        ].map(
                          ([label, value]) => (
                            <div
                              key={String(
                                label
                              )}
                              className="rounded-xl bg-slate-50 px-3 py-3 text-center"
                            >
                              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                                {String(
                                  label
                                )}
                              </p>

                              <p className="mt-1 text-sm font-bold text-slate-900">
                                {Number(
                                  value
                                ).toFixed(
                                  1
                                )}
                                %
                              </p>
                            </div>
                          )
                        )}
                    </div>

                    <div
                      className={`mt-4 rounded-xl border px-4 py-3 ${
                        moveMode
                          ? "border-blue-200 bg-blue-50"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Move
                          size={16}
                          className={
                            moveMode
                              ? "text-blue-600"
                              : "text-slate-400"
                          }
                        />

                        <p className="text-sm font-bold text-slate-900">
                          {moveMode
                            ? "Move mode active"
                            : "Double-click selection to move"}
                        </p>
                      </div>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {moveMode
                          ? "Drag inside the crop box to reposition it."
                          : "Resize it using any of the handles."}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={resetSelection}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      <RotateCcw size={16} />
                      Clear selection
                    </button>
                  </>
                )}
              </div>

              {/* PREVIEW */}
              <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">

                <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 md:px-6">

                  <div>
                    <p className="font-bold text-slate-950">
                      Interactive crop
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Page 1 of {pageCount}
                    </p>
                  </div>

                  <div className="hidden items-center gap-3 sm:flex">
                    <span className="text-xs font-medium text-slate-400">
                      Drag Ã‚Â· Resize Ã‚Â· Double-click to move
                    </span>

                    <span className="rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-blue-700">
                      Interactive
                    </span>
                  </div>
                </div>

                <div className="flex min-h-[680px] items-center justify-center bg-[#eef1f6] p-6 md:p-8">

                  {previewUrl ? (
                    <div
                      ref={previewRef}
                      onPointerDown={beginCreate}
                      onPointerMove={
                        handlePointerMove
                      }
                      onPointerUp={
                        finishInteraction
                      }
                      onPointerCancel={
                        finishInteraction
                      }
                      className="relative inline-block max-w-full touch-none select-none overflow-hidden bg-white shadow-[0_24px_60px_rgba(15,23,42,0.20)] ring-1 ring-slate-900/5"
                      style={{
                        cursor:
                          "crosshair",
                      }}
                    >
                      <img
                        src={previewUrl}
                        alt="PDF preview"
                        draggable={false}
                        className="pointer-events-none block max-h-[630px] max-w-full select-none object-contain"
                      />

                      {selection && (
                        <div
                          onPointerDown={
                            beginMove
                          }
                          onDoubleClick={(
                            event
                          ) => {
                            event.preventDefault();
                            event.stopPropagation();

                            setMoveMode(
                              (current) =>
                                !current
                            );
                          }}
                          className={`absolute border-2 border-blue-500 ${
                            moveMode
                              ? "cursor-move"
                              : "cursor-default"
                          }`}
                          style={{
                            left: `${selection.x}%`,
                            top: `${selection.y}%`,
                            width: `${selection.width}%`,
                            height: `${selection.height}%`,
                            boxShadow:
                              "0 0 0 9999px rgba(15,23,42,0.48)",
                          }}
                        >
                          {moveMode && (
                            <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-lg">
                              <Move
                                size={
                                  14
                                }
                              />
                              Drag to move
                            </div>
                          )}

                          {handles.map(
                            (
                              handle
                            ) => (
                              <div
                                key={
                                  handle.id
                                }
                                onPointerDown={(
                                  event
                                ) =>
                                  beginResize(
                                    event,
                                    handle.id
                                  )
                                }
                                className={`absolute z-20 h-4 w-4 rounded-[3px] border-2 border-white bg-blue-600 shadow-md ${handle.className}`}
                                style={{
                                  cursor:
                                    handle.cursor,
                                }}
                              />
                            )
                          )}
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
                  The clear selected area will be kept. The dark
                  area will be cropped away.
                </div>
              </div>
            </div>

            {/* CROP ACTION */}
            <div className="sticky bottom-4 z-40 mt-6 rounded-[24px] border border-slate-200 bg-white/95 px-5 py-4 shadow-[0_14px_45px_rgba(15,23,42,0.16)] backdrop-blur-md md:px-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                <div>
                  <p className="font-bold text-slate-950">
                    {selection
                      ? "Crop area ready"
                      : "Select an area to crop"}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    The clear selected area will remain in the finished PDF.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

                  <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setApplyScope("current");
                        clearResult();
                      }}
                      className={`rounded-lg px-4 py-2.5 text-sm font-bold transition ${
                        applyScope === "current"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-slate-500"
                      }`}
                    >
                      Page 1 only
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setApplyScope("all");
                        clearResult();
                      }}
                      className={`rounded-lg px-4 py-2.5 text-sm font-bold transition ${
                        applyScope === "all"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-slate-500"
                      }`}
                    >
                      All pages
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={cropPdf}
                    disabled={
                      !selection ||
                      processing
                    }
                    className="inline-flex min-w-[190px] items-center justify-center rounded-xl bg-blue-600 px-7 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {processing
                      ? "Cropping..."
                      : "Crop PDF →"}
                  </button>
                </div>
              </div>
            </div>

            {downloadUrl && (
              <div className="mt-6 rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                  <div>
                    <p className="font-bold text-slate-950">
                      Your cropped PDF is ready
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      The selected crop area was applied successfully.
                    </p>
                  </div>

                  <a
                    href={downloadUrl}
                    download={`cropped-${file.name}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white transition hover:bg-emerald-700"
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
