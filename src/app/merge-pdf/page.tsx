"use client";

import { useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import {
  Upload,
  FileText,
  Trash2,
  GripVertical,
  Download,
  Plus,
} from "lucide-react";

type PdfItem = {
  id: string;
  file: File;
  previewUrl: string;
  pageCount: number;
};

export default function MergePdfPage() {
  const inputRef = useRef<HTMLInputElement>(null);
const downloadSectionRef = useRef<HTMLDivElement>(null);
  const [files, setFiles] = useState<PdfItem[]>([]);
  const [merging, setMerging] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
const createPdfPreview = async (file: File) => {
  const pdfjsLib = await import("pdfjs-dist");

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
  });

  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({
    scale: 0.55,
  });

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    return {
      previewUrl: "",
      pageCount: pdf.numPages,
    };
  }

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  const renderTask = page.render({
    canvas,
    canvasContext: context,
    viewport,
  });

  await renderTask.promise;

  return {
    previewUrl: canvas.toDataURL("image/jpeg", 0.82),
    pageCount: pdf.numPages,
  };
};
  const addFiles = async (selectedFiles: FileList | null) => {
  if (!selectedFiles) return;

  const pdfFiles = Array.from(selectedFiles).filter(
    (file) => file.type === "application/pdf"
  );

  const newItems = await Promise.all(
    pdfFiles.map(async (file) => {
      const preview = await createPdfPreview(file);

      return {
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
        previewUrl: preview.previewUrl,
        pageCount: preview.pageCount,
      };
    })
  );

  setFiles((current) => [...current, ...newItems]);

  if (downloadUrl) {
    URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
  }
};

  const removeFile = (id: string) => {
    setFiles((current) =>
      current.filter((item) => item.id !== id)
    );

    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
  };
  const clearAllFiles = () => {
  setFiles([]);

  if (downloadUrl) {
    URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
  }
};

  const moveFile = (index: number, direction: "left" | "right") => {
    setFiles((current) => {
      const next = [...current];

      const targetIndex =
        direction === "left" ? index - 1 : index + 1;

      if (
        targetIndex < 0 ||
        targetIndex >= next.length
      ) {
        return current;
      }

      [next[index], next[targetIndex]] = [
        next[targetIndex],
        next[index],
      ];

      return next;
    });

    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
  };
const reorderByDrag = (
  draggedId: string,
  targetId: string
) => {
  if (draggedId === targetId) return;

  setFiles((current) => {
    const next = [...current];

    const fromIndex = next.findIndex(
      (item) => item.id === draggedId
    );

    const toIndex = next.findIndex(
      (item) => item.id === targetId
    );

    if (fromIndex === -1 || toIndex === -1) {
      return current;
    }

    const [movedItem] = next.splice(fromIndex, 1);

    next.splice(toIndex, 0, movedItem);

    return next;
  });

  if (downloadUrl) {
    URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
  }
};
  const mergePdfs = async () => {
    if (files.length < 2) return;

    try {
      setMerging(true);

      const mergedPdf = await PDFDocument.create();

      for (const item of files) {
        const bytes = await item.file.arrayBuffer();

        const sourcePdf = await PDFDocument.load(bytes);

        const pages = await mergedPdf.copyPages(
          sourcePdf,
          sourcePdf.getPageIndices()
        );

        pages.forEach((page) => {
          mergedPdf.addPage(page);
        });
      }

      const mergedBytes = await mergedPdf.save();

      const blob = new Blob(
  [mergedBytes.slice().buffer],
  {
    type: "application/pdf",
  }
);

      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }

      const url = URL.createObjectURL(blob);

      setDownloadUrl(url);
      setTimeout(() => {
  downloadSectionRef.current?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}, 100);
    } catch (error) {
      console.error("Merge PDF error:", error);
      alert("Unable to merge these PDF files.");
    } finally {
      setMerging(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-[1500px] px-5 py-10">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            PDF Tool
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Merge PDF
          </h1>

          <p className="mt-4 text-lg text-slate-600">
            Combine multiple PDF files into one document.
            Your files stay in your browser.
          </p>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={(event) => {
              addFiles(event.target.files);

              event.currentTarget.value = "";
            }}
          />

          {files.length === 0 ? (
            <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white px-6 py-16 shadow-[0_20px_70px_rgba(15,23,42,0.08)] md:px-12 md:py-20">
  <div className="pointer-events-none absolute -left-24 top-10 h-64 w-64 rounded-full bg-blue-100/50 blur-3xl" />
  <div className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-violet-100/50 blur-3xl" />

  <div className="relative mx-auto max-w-3xl text-center">
    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
      <FileText size={28} />
    </div>

    <h2 className="mt-7 text-3xl font-bold tracking-tight text-slate-950">
      Build one PDF from multiple files
    </h2>

    <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-500">
      Add two or more PDF files, arrange them in the order you want,
      then merge them into one document.
    </p>

    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        addFiles(event.dataTransfer.files);
      }}
      className="group mx-auto mt-8 flex min-h-[190px] w-full max-w-2xl flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-blue-200 bg-blue-50/40 px-6 transition hover:border-blue-500 hover:bg-blue-50"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md transition group-hover:-translate-y-1">
        <Upload size={25} />
      </div>

      <span className="mt-5 text-lg font-bold text-slate-900">
        Choose PDF files
      </span>

      <span className="mt-1 text-sm text-slate-500">
        or drag and drop them here
      </span>
    </button>

    <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-slate-500">
      <span className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Browser based
      </span>

      <span className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-blue-500" />
        Files stay on your device
      </span>

      <span className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-violet-500" />
        No account required
      </span>
    </div>
  </div>
</div>
          ) : (
              <>
  {/* WORKSPACE HEADER */}
<div className="rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)] md:px-6">
  <div className="grid items-center gap-4 md:grid-cols-3">

    {/* LEFT */}
    <div className="flex items-center gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-white shadow-md">
        {files.length}
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
          Merge workspace
        </p>

        <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
          Arrange your documents
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Review your PDF order before merging.
        </p>
      </div>
    </div>

    {/* CENTER */}
    <div className="hidden justify-center md:flex">
  <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3">
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
      <GripVertical size={17} />
    </div>

    <div className="text-left">
      <p className="text-sm font-bold text-slate-800">
        Drag to reorder
      </p>

      <p className="mt-0.5 text-xs text-slate-400">
        Drop a PDF into any position
      </p>
    </div>
  </div>
</div>

    {/* RIGHT */}
    <div className="flex justify-center gap-2 md:justify-end">
        <button
  type="button"
  onClick={clearAllFiles}
  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
>
  Clear all
</button>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.22)] transition hover:bg-blue-700"
      >
        <Plus size={18} />
        Add PDFs
      </button>
    </div>

  </div>
</div>

  {/* DOCUMENT WORKSPACE */}
  <div className="mt-5 rounded-[28px] bg-slate-100/80 p-4">
    <div className="flex flex-wrap justify-center gap-4">
      {files.map((item, index) => (
        <div
  key={item.id}
  draggable
  onDragStart={(event) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(
      "text/plain",
      item.id
    );

    event.currentTarget.classList.add(
      "opacity-50"
    );
  }}
  onDragEnd={(event) => {
    event.currentTarget.classList.remove(
      "opacity-50"
    );
  }}
  onDragOver={(event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }}
  onDrop={(event) => {
    event.preventDefault();

    const draggedId =
      event.dataTransfer.getData("text/plain");

    reorderByDrag(draggedId, item.id);
  }}
  className="group relative w-full cursor-grab active:cursor-grabbing sm:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-4rem)/5)]"
>
          {/* ORDER BADGE */}
          <div className="absolute -left-2 -top-2 z-20 flex h-8 min-w-8 items-center justify-center rounded-full bg-slate-950 px-2 text-xs font-bold text-white shadow-lg">
            {String(index + 1).padStart(2, "0")}
          </div>

          {/* DOCUMENT TILE */}
          <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.07)] transition duration-200 group-hover:-translate-y-1 group-hover:shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
            
            {/* REAL PDF FIRST-PAGE PREVIEW */}
<div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden bg-slate-100">
  {item.previewUrl ? (
    <img
      src={item.previewUrl}
      alt={`${item.file.name} preview`}
      draggable={false}
      className="h-full w-full object-contain"
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center">
      <FileText
        size={34}
        className="text-slate-300"
      />
    </div>
  )}

  <div className="absolute bottom-3 left-3 rounded-lg bg-slate-950/80 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
    {item.pageCount}{" "}
    {item.pageCount === 1 ? "page" : "pages"}
  </div>

  <button
    type="button"
    onClick={(event) => {
      event.stopPropagation();
      removeFile(item.id);
    }}
    title="Remove PDF"
    className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-xl bg-white/95 text-slate-400 opacity-0 shadow-md backdrop-blur transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
  >
    <Trash2 size={17} />
  </button>
</div>

            {/* DOCUMENT INFO */}
            <div className="border-t border-slate-100 px-4 pb-4 pt-3">
              <p
                className="truncate text-sm font-bold text-slate-900"
                title={item.file.name}
              >
                {item.file.name}
              </p>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">
                  {(item.file.size / 1024 / 1024).toFixed(2)} MB
                </span>

                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-600">
                  PDF
                </span>
              </div>

              {/* REORDER CONTROLS */}
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <GripVertical size={15} />
                  Order
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveFile(index, "left")}
                    title="Move left"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-25"
                  >
                    ←
                  </button>

                  <button
                    type="button"
                    disabled={index === files.length - 1}
                    onClick={() => moveFile(index, "right")}
                    title="Move right"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-25"
                  >
                    →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>

  {/* MERGE ACTION PANEL */}
<div className="sticky bottom-4 z-40 mt-5 rounded-[24px] border border-slate-200 bg-white/95 px-5 py-4 shadow-[0_14px_45px_rgba(15,23,42,0.16)] backdrop-blur-md md:px-8">
  <div className="grid items-center gap-4 sm:grid-cols-3">
    {/* LEFT */}
<div className="flex items-center gap-3">
  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
    <FileText size={20} />
  </div>

  <div>
    <p className="font-bold text-slate-950">
      {files.length} PDFs ready to merge
    </p>

    <p className="mt-1 text-sm text-slate-500">
      Review the order before merging.
    </p>
  </div>
</div>

{/* CENTER */}
<div className="flex justify-center">
  <button
    type="button"
    disabled={files.length < 2 || merging}
    onClick={mergePdfs}
    className="inline-flex min-w-[210px] items-center justify-center rounded-xl bg-blue-600 px-7 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {merging ? "Merging..." : "Merge PDFs →"}
  </button>
</div>

{/* RIGHT */}
<div className="hidden justify-end sm:flex">
  <div className="text-right">
    <p className="text-sm font-semibold text-slate-700">
      Private & browser based
    </p>

    <p className="mt-1 text-xs text-slate-400">
      Your files stay on your device
    </p>
  </div>
</div>
  </div>
</div>

  {/* DOWNLOAD RESULT */}
  {downloadUrl && (
    <div
  ref={downloadSectionRef}
  className="mt-6 overflow-hidden rounded-[24px] border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-5 md:p-6"
>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md">
            <Download size={20} />
          </div>

          <div>
            <p className="font-bold text-slate-950">
              Your merged PDF is ready
            </p>

            <p className="mt-1 text-sm text-slate-500">
              All {files.length} documents were combined successfully.
            </p>
          </div>
        </div>

        <a
          href={downloadUrl}
          download="merged.pdf"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700"
        >
          <Download size={17} />
          Download merged PDF
        </a>
      </div>
    </div>
        )}
    </>
  )}
</div>
      </section>
</main>
);
}