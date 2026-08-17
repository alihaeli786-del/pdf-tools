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
  Bold,
  Italic,
  Move,
  Copy,
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
  backgroundColor: string;
  isNew?: boolean;
};

type TextEdit = {
  text: string;
  deleted: boolean;
  bold: boolean;
  italic: boolean;
  fontSize: number;
  fontFamily: string;
  color: string;
  link: string;
  offsetX: number;
  offsetY: number;
};

type PageSize = {
  width: number;
  height: number;
};

const fontOptions = [
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Georgia",
  "Courier New",
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
  "Garamond",
  "Palatino Linotype",
  "Bookman",
  "Century Gothic",
  "Calibri",
  "Cambria",
];

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
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  const [textEdits, setTextEdits] = useState<Record<string, TextEdit>>({});

  const [moveMode, setMoveMode] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const duplicateCounterRef = useRef(0);
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);

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

  const selectedBox =
    textBoxes.find((box) => box.id === selectedTextId) || null;

  const createDefaultEdit = (box: TextBox): TextEdit => ({
    text: box.text,
    deleted: false,
    bold: false,
    italic: false,
    fontSize: box.fontSize,
    fontFamily: box.fontFamily || "Arial",
    color: "#111111",
    link: "",
    offsetX: 0,
    offsetY: 0,
  });

  const getTextEdit = (box: TextBox) => {
    return textEdits[box.id] || createDefaultEdit(box);
  };

  const updateEdit = (box: TextBox, patch: Partial<TextEdit>) => {
    setTextEdits((current) => ({
      ...current,
      [box.id]: {
        ...(current[box.id] || createDefaultEdit(box)),
        ...patch,
      },
    }));
  };

  const startEditing = (box: TextBox) => {
    setSelectedTextId(box.id);
    setMoveMode(false);

    setTextEdits((current) => {
      const existing = current[box.id];

      if (existing) {
        return {
          ...current,
          [box.id]: {
            ...existing,
            deleted: false,
          },
        };
      }

      return {
        ...current,
        [box.id]: createDefaultEdit(box),
      };
    });
  };

  const deleteSelectedText = () => {
    if (!selectedBox) return;

    updateEdit(selectedBox, {
      text: "",
      deleted: true,
    });

    setSelectedTextId(null);
    setMoveMode(false);
  };
const duplicateSelectedText = () => {
  if (!selectedBox) return;

  const sourceEdit = getTextEdit(selectedBox);

  duplicateCounterRef.current += 1;

const duplicateId = `duplicate-${pageNumber}-${duplicateCounterRef.current}`;

  const duplicateBox: TextBox = {
    ...selectedBox,
    id: duplicateId,
    left: selectedBox.left + 20,
    top: selectedBox.top + 20,
    isNew: true,
  };

  setTextBoxes((current) => [
    ...current,
    duplicateBox,
  ]);

  setTextEdits((current) => ({
    ...current,
    [duplicateId]: {
      ...sourceEdit,
      deleted: false,
      offsetX: 0,
      offsetY: 0,
    },
  }));

  setSelectedTextId(duplicateId);
  setMoveMode(false);
};
  const createLink = () => {
    if (!selectedBox) return;

    const current = getTextEdit(selectedBox);

    const url = window.prompt(
      "Enter link URL:",
      current.link || "https://"
    );

    if (url === null) return;

    updateEdit(selectedBox, {
      link: url.trim(),
    });
  };

  const sampleBackgroundColor = (
    context: CanvasRenderingContext2D,
    left: number,
    top: number,
    width: number,
    height: number
  ) => {
    const points = [
      [left - 3, top - 3],
      [left + width + 3, top - 3],
      [left - 3, top + height + 3],
      [left + width + 3, top + height + 3],
    ];

    const colors: number[][] = [];

    for (const point of points) {
      const x = Math.max(
        0,
        Math.min(context.canvas.width - 1, Math.round(point[0]))
      );

      const y = Math.max(
        0,
        Math.min(context.canvas.height - 1, Math.round(point[1]))
      );

      try {
        const data = context.getImageData(x, y, 1, 1).data;

        colors.push([data[0], data[1], data[2]]);
      } catch {
        // Ignore pixel sampling errors.
      }
    }

    if (!colors.length) {
      return "rgb(255,255,255)";
    }

    const average = [0, 1, 2].map((channel) =>
      Math.round(
        colors.reduce((sum, color) => sum + color[channel], 0) /
          colors.length
      )
    );

    return `rgb(${average[0]}, ${average[1]}, ${average[2]})`;
  };

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
      const loadedPdf = await pdfjsLib.getDocument({

        data: new Uint8Array(arrayBuffer),
      }).promise;

      setFile(selectedFile);
      setPdfDoc(loadedPdf);

      setPageCount(loadedPdf.numPages);
      setPageNumber(1);

      setScale(1.3);
      setRotation(0);

      setTextBoxes([]);
      setSelectedTextId(null);
      setTextEdits({});
    } catch (err) {
      console.error(err);

      setError("Unable to open this PDF. Please try another file.");
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
        setSelectedTextId(null);
        setMoveMode(false);
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

        context.clearRect(0, 0, width, height);

        renderTask = page.render({
          canvasContext: context,
          viewport,
          canvas,
        });

        await renderTask.promise;

        if (cancelled) return;

        const textContent = await page.getTextContent();

        const pdfjsLib = await import("pdfjs-dist");

        const extractedText: TextBox[] = textContent.items.flatMap(
          (item, index) => {
            if (!("str" in item)) return [];
            if (!item.str.trim()) return [];

            const transformed = pdfjsLib.Util.transform(
              viewport.transform,
              item.transform
            );

            const angle =
              (Math.atan2(transformed[1], transformed[0]) * 180) / Math.PI;

            const fontHeight = Math.max(
              Math.hypot(transformed[2], transformed[3]),
              6
            );

            const textWidth = Math.max(Math.abs(item.width * scale), 4);

            const left = transformed[4];

            const top = transformed[5] - fontHeight;

            const textStyle = textContent.styles[item.fontName];

            const fontFamily =
              textStyle?.fontFamily || item.fontName || "Arial";

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

                backgroundColor: sampleBackgroundColor(
                  context,
                  left,
                  top,
                  textWidth,
                  fontHeight
                ),
              },
            ];
          }
        );

        setTextBoxes(extractedText);
      } catch (err) {
        if (
          err instanceof Error &&
          err.name === "RenderingCancelledException"
        ) {
          return;
        }

        console.error("PDF render error:", err);
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
  }, [pdfDoc, pageNumber, scale, rotation]);

  const zoomIn = () => {
    setScale((current) => Math.min(current + 0.2, 3));
  };

  const zoomOut = () => {
    setScale((current) => Math.max(current - 0.2, 0.5));
  };

  const rotatePage = () => {
    setRotation((current) => (current + 90) % 360);
  };

  const previousPage = () => {
    setPageNumber((current) => Math.max(1, current - 1));
  };

  const nextPage = () => {
    setPageNumber((current) => Math.min(pageCount, current + 1));
  };

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

            <span className="text-lg font-bold text-slate-950">
              PDF Editor
            </span>

            <div className="w-16" />
          </div>
        </header>

        <section className="flex min-h-[calc(100vh-74px)] items-center justify-center px-6 py-16">
          <div className="w-full max-w-3xl text-center">
            <FileInput className="mx-auto text-blue-600" size={48} />

            <h1 className="mt-5 text-4xl font-bold text-slate-950">
              Edit PDF
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-slate-600">
              Upload a PDF and edit it directly in your browser.
            </p>

            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();

                handleFile(event.dataTransfer.files?.[0]);
              }}
              className="mt-10 rounded-3xl border-2 border-dashed border-blue-300 bg-white px-8 py-14"
            >
              <Upload className="mx-auto text-blue-600" size={40} />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="mt-7 rounded-xl bg-blue-600 px-8 py-3.5 font-semibold text-white"
              >
                {loading ? "Opening PDF..." : "Choose PDF file"}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(event) =>
                  handleFile(event.target.files?.[0])
                }
              />
            </div>

            {error && (
              <p className="mt-5 font-medium text-red-600">{error}</p>
            )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#e9e9e9]">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex min-h-16 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="rounded-lg p-2 text-slate-600">
              <ChevronLeft size={20} />
            </Link>

            <div>
              <p className="max-w-64 truncate text-sm font-semibold">
                {file.name}
              </p>

              <p className="text-xs text-slate-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>

          <button
            disabled
            className="flex cursor-not-allowed items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white opacity-60"
          >
            <Download size={17} />
            Apply changes
          </button>
        </div>
      </header>

      <div className="sticky top-0 z-30 border-b bg-white px-3 py-2">
        <div className="mx-auto flex max-w-[1500px] items-center justify-center gap-1">
          {tools.map((tool) => {
            const Icon = tool.icon;

            return (
              <button
                key={tool.label}
                disabled={!tool.enabled}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                  tool.enabled
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-400"
                }`}
              >
                <Icon size={17} />
                {tool.label}
              </button>
            );
          })}

          <div className="mx-1 h-7 w-px bg-slate-300" />

          <Undo2 size={18} className="text-blue-600" />
          <Redo2 size={18} className="text-blue-600" />
        </div>
      </div>

      <div className="border-b border-slate-300 bg-[#ededed] px-4 py-3">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={previousPage}
            disabled={pageNumber <= 1}
            className="rounded border border-blue-400 bg-white p-2"
          >
            <ChevronLeft size={17} />
          </button>

          <span className="px-4 text-sm font-semibold">
            Page {pageNumber} / {pageCount}
          </span>

          <button
            onClick={nextPage}
            disabled={pageNumber >= pageCount}
            className="rounded border border-blue-400 bg-white p-2"
          >
            <ChevronRight size={17} />
          </button>

          <button
            onClick={zoomIn}
            className="rounded border border-blue-400 bg-white p-2"
          >
            <ZoomIn size={16} />
          </button>

          <button
            onClick={zoomOut}
            className="rounded border border-blue-400 bg-white p-2"
          >
            <ZoomOut size={16} />
          </button>

          <button
            onClick={rotatePage}
            className="rounded border border-blue-400 bg-white p-2"
          >
            <RotateCw size={16} />
          </button>

          <span className="ml-2 text-xs font-semibold">
            {Math.round(scale * 100)}%
          </span>

          <button className="ml-3 flex items-center gap-2 rounded border border-blue-400 bg-white px-3 py-2 text-blue-600">
            <Plus size={16} />
            Insert page here
          </button>
        </div>
      </div>

      <section className="relative flex flex-1 justify-center overflow-auto p-8">
        {rendering && (
          <div className="fixed bottom-6 right-6 z-50 rounded bg-slate-900 px-4 py-2 text-sm text-white">
            Rendering page...
          </div>
        )}

        <div
          className="relative bg-white shadow-xl"
          style={{
            width: pageSize.width,
            height: pageSize.height,
          }}
          onMouseDown={() => {
            setSelectedTextId(null);
            setMoveMode(false);
          }}
        >
          <canvas
            ref={canvasRef}
            className="absolute left-0 top-0 bg-white"
          />

          {selectedBox && (() => {
            const edit = getTextEdit(selectedBox);

            const x = selectedBox.left;
const y = selectedBox.top;

            return (
              <div
                className="absolute z-50 flex items-center gap-1 rounded-md border border-slate-300 bg-white p-1 shadow-xl"
                style={{
                  left: Math.max(
                    5,
                    Math.min(x, pageSize.width - 590)
                  ),

                  top: Math.max(5, y - 70),
                }}
                onMouseDown={(event) => event.stopPropagation()}
              >
                <button
                  onClick={() =>
                    updateEdit(selectedBox, {
                      bold: !edit.bold,
                    })
                  }
                  className={`rounded p-2 ${
                    edit.bold ? "bg-blue-100 text-blue-700" : ""
                  }`}
                  title="Bold"
                >
                  <Bold size={15} />
                </button>

                <button
                  onClick={() =>
                    updateEdit(selectedBox, {
                      italic: !edit.italic,
                    })
                  }
                  className={`rounded p-2 ${
                    edit.italic ? "bg-blue-100 text-blue-700" : ""
                  }`}
                  title="Italic"
                >
                  <Italic size={15} />
                </button>

                <input
                  type="number"
                  min="6"
                  max="100"
                  value={Math.round(edit.fontSize)}
                  onChange={(event) =>
                    updateEdit(selectedBox, {
                      fontSize: Number(event.target.value),
                    })
                  }
                  className="w-14 rounded border px-2 py-1.5 text-sm"
                  title="Font size"
                />

                <select
                  value={edit.fontFamily}
                  onChange={(event) =>
                    updateEdit(selectedBox, {
                      fontFamily: event.target.value,
                    })
                  }
                  className="max-w-36 rounded border px-2 py-1.5 text-sm"
                  title="Font family"
                >
                  <option value={edit.fontFamily}>
                    {edit.fontFamily}
                  </option>

                  {fontOptions
                    .filter((font) => font !== edit.fontFamily)
                    .map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                </select>

                <input
                  type="color"
                  value={edit.color}
                  onChange={(event) =>
                    updateEdit(selectedBox, {
                      color: event.target.value,
                    })
                  }
                  className="h-8 w-8 cursor-pointer"
                  title="Text color"
                />

                <button
                  onClick={createLink}
                  className={`rounded p-2 ${
                    edit.link ? "bg-blue-100 text-blue-700" : ""
                  }`}
                  title="Create link"
                >
                  <LinkIcon size={15} />
                </button>

                <button
                  onClick={() => setMoveMode((current) => !current)}
                  className={`rounded p-2 ${
                    moveMode ? "bg-blue-100 text-blue-700" : ""
                  }`}
                  title="Move text"
                >
                  <Move size={15} />
                </button>

                <button
  onClick={duplicateSelectedText}
  title="Duplicate"
  className="rounded p-2 text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
>
  <Copy size={15} />
</button>

                <button
                  onClick={deleteSelectedText}
                  title="Delete"
                  className="rounded p-2 text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })()}

          <div className="pointer-events-none absolute inset-0 z-10">
            {textBoxes.map((box) => {
  const edit = textEdits[box.id];
  const activeEdit = edit || createDefaultEdit(box);

  const left = box.left + activeEdit.offsetX;
  const top = box.top + activeEdit.offsetY;

  const isSelected = selectedTextId === box.id;

  const hasChanged =
    !!edit &&
    (
      edit.text !== box.text ||
      edit.deleted ||
      edit.offsetX !== 0 ||
      edit.offsetY !== 0 ||
      edit.bold ||
      edit.italic ||
      edit.fontSize !== box.fontSize ||
      edit.fontFamily !== box.fontFamily ||
      edit.color !== "#111111"
    );

  const shouldMaskOriginal =
  !box.isNew && (isSelected || hasChanged);

  return (
    <div key={box.id} className="contents">

      {/* PERMANENT MASK OVER ORIGINAL PDF TEXT */}
      {shouldMaskOriginal && (
        <div
          className="pointer-events-none absolute z-20"
          style={{
            left: box.left - 2,
            top: box.top - 1,

            width: Math.max(box.width + 6, 14),
            height: Math.max(box.height * 1.25, 14),

            backgroundColor: box.backgroundColor,

            transform: `rotate(${box.angle}deg)`,
            transformOrigin: "0 0",
          }}
        />
      )}

      {/* DELETED TEXT:
          Keep blank area clickable so new text can be entered */}
      {edit?.deleted && !isSelected && (
        <button
          type="button"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            startEditing(box);
          }}
          title="Click to add text here"
          className="pointer-events-auto absolute z-30 cursor-text border border-transparent bg-transparent p-0 outline-none hover:border-blue-300"
          style={{
            left: box.left,
            top: box.top,

            width: Math.max(box.width + 6, 15),
            height: Math.max(box.height * 1.25, 14),

            transform: `rotate(${box.angle}deg)`,
            transformOrigin: "0 0",
          }}
        />
      )}

      {/* CURRENTLY EDITING */}
      {isSelected && (
        <textarea
          autoFocus
          value={activeEdit.text}
          spellCheck={false}

          onMouseDown={(event) => {
            event.stopPropagation();

            if (!moveMode) return;

            event.preventDefault();

            dragRef.current = {
              id: box.id,
              startX: event.clientX,
              startY: event.clientY,
              initialX: activeEdit.offsetX,
              initialY: activeEdit.offsetY,
            };
          }}

          onPointerMove={(event) => {
            const drag = dragRef.current;

            if (
              !moveMode ||
              !drag ||
              drag.id !== box.id
            ) {
              return;
            }

            updateEdit(box, {
              offsetX:
                drag.initialX +
                event.clientX -
                drag.startX,

              offsetY:
                drag.initialY +
                event.clientY -
                drag.startY,
            });
          }}

          onPointerUp={() => {
            dragRef.current = null;
          }}

          onClick={(event) => event.stopPropagation()}

          onChange={(event) =>
            updateEdit(box, {
              text: event.target.value,
              deleted: false,
            })
          }

          className="pointer-events-auto absolute z-40 resize-none overflow-hidden border border-blue-500 bg-transparent p-0 outline-none"

          style={{
            left,
            top,

            width: Math.max(
              box.width + 18,
              activeEdit.text.length *
                activeEdit.fontSize *
                0.62
            ),

            minWidth: 20,

            minHeight: Math.max(
              box.height * 1.2,
              activeEdit.fontSize * 1.15
            ),

            fontFamily: activeEdit.fontFamily,

            fontSize: activeEdit.fontSize,

            fontWeight:
              activeEdit.bold ? 700 : 400,

            fontStyle:
              activeEdit.italic
                ? "italic"
                : "normal",

            lineHeight: 1.05,

            color: activeEdit.color,

            backgroundColor: "transparent",

            transform: `rotate(${box.angle}deg)`,

            transformOrigin: "0 0",

            cursor:
              moveMode ? "move" : "text",

            caretColor: "#2563eb",
          }}
        />
      )}

      {/* FINISHED EDITED TEXT */}
      {!isSelected &&
        edit &&
        !edit.deleted &&
        hasChanged && (
          <button
            type="button"

            onMouseDown={(event) =>
              event.stopPropagation()
            }

            onClick={(event) => {
              event.stopPropagation();
              startEditing(box);
            }}

            className="pointer-events-auto absolute z-30 cursor-text border-0 bg-transparent p-0 text-left outline-none"

            style={{
              left,
              top,

              width: Math.max(
                box.width + 12,
                activeEdit.text.length *
                  activeEdit.fontSize *
                  0.62
              ),

              minHeight: Math.max(
                box.height * 1.15,
                activeEdit.fontSize
              ),

              backgroundColor: "transparent",

              color: activeEdit.color,

              fontFamily:
                activeEdit.fontFamily,

              fontSize:
                activeEdit.fontSize,

              fontWeight:
                activeEdit.bold
                  ? 700
                  : 400,

              fontStyle:
                activeEdit.italic
                  ? "italic"
                  : "normal",

              lineHeight: 1.05,

              transform: `rotate(${box.angle}deg)`,

              transformOrigin: "0 0",

              whiteSpace: "pre-wrap",
            }}
          >
            {activeEdit.text}
          </button>
        )}

      {/* ORIGINAL UNEDITED TEXT CLICK AREA */}
      {!isSelected && !hasChanged && (
        <button
          type="button"

          aria-label={`Edit ${box.text}`}

          onMouseDown={(event) =>
            event.stopPropagation()
          }

          onClick={(event) => {
            event.stopPropagation();
            startEditing(box);
          }}

          className="pointer-events-auto absolute z-30 cursor-text border border-transparent bg-transparent p-0 outline-none hover:border-blue-400"

          style={{
            left: box.left,
            top: box.top,

            width: Math.max(
              box.width,
              5
            ),

            height: Math.max(
              box.height,
              8
            ),

            transform: `rotate(${box.angle}deg)`,

            transformOrigin: "0 0",
          }}
        />
      )}
    </div>
  );
})}
          </div>
        </div>
      </section>
    </main>
  );
}