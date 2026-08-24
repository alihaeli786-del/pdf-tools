"use client";

import { useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import {
  Upload,
  FileText,
  Scissors,
  Layers3,
  ListChecks,
  SplitSquareVertical,
  Download,
  RotateCcw,
} from "lucide-react";

type SplitMode =
  | "every-page"
  | "ranges"
  | "every-x"
  | "after-pages";

type OutputFile = {
  name: string;
  url: string;
};

export default function SplitPdfPage() {
  const inputRef = useRef<HTMLInputElement>(null);
const resultSectionRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [selectedMode, setSelectedMode] =
    useState<SplitMode>("every-page");

  const [rangeInput, setRangeInput] = useState("");
  const [everyX, setEveryX] = useState(2);
  const [afterPagesInput, setAfterPagesInput] = useState("");

  const [processing, setProcessing] = useState(false);
  const [outputs, setOutputs] = useState<OutputFile[]>([]);

  const clearOutputs = () => {
    outputs.forEach((item) => {
      URL.revokeObjectURL(item.url);
    });

    setOutputs([]);
  };

  const loadPdf = async (selectedFile: File) => {
    try {
      clearOutputs();

      const bytes = await selectedFile.arrayBuffer();
      const pdf = await PDFDocument.load(bytes);

      setFile(selectedFile);
      setPageCount(pdf.getPageCount());

      setRangeInput("");
      setAfterPagesInput("");
      setEveryX(2);
      setSelectedMode("every-page");
    } catch (error) {
      console.error("PDF load error:", error);
      alert("Unable to open this PDF.");
    }
  };

  const handleFile = (selectedFile: File | undefined) => {
    if (!selectedFile) return;

    if (selectedFile.type !== "application/pdf") {
      alert("Please choose a PDF file.");
      return;
    }

    loadPdf(selectedFile);
  };

  const resetTool = () => {
    clearOutputs();

    setFile(null);
    setPageCount(0);
    setRangeInput("");
    setAfterPagesInput("");
    setEveryX(2);
    setSelectedMode("every-page");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const createOutputPdf = async (
    sourcePdf: PDFDocument,
    pageIndexes: number[],
    name: string
  ) => {
    const outputPdf = await PDFDocument.create();

    const copiedPages = await outputPdf.copyPages(
      sourcePdf,
      pageIndexes
    );

    copiedPages.forEach((page) => {
      outputPdf.addPage(page);
    });

    const bytes = await outputPdf.save();

    const blob = new Blob(
      [bytes.slice().buffer],
      {
        type: "application/pdf",
      }
    );

    return {
      name,
      url: URL.createObjectURL(blob),
    };
  };

  const parseRanges = (
    value: string,
    totalPages: number
  ): number[][] => {
    const groups: number[][] = [];

    const parts = value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    for (const part of parts) {
      if (part.includes("-")) {
        const [startText, endText] = part.split("-");

        const start = Number(startText);
        const end = Number(endText);

        if (
          !Number.isInteger(start) ||
          !Number.isInteger(end) ||
          start < 1 ||
          end > totalPages ||
          start > end
        ) {
          throw new Error("Invalid page range");
        }

        const indexes: number[] = [];

        for (let page = start; page <= end; page++) {
          indexes.push(page - 1);
        }

        groups.push(indexes);
      } else {
        const page = Number(part);

        if (
          !Number.isInteger(page) ||
          page < 1 ||
          page > totalPages
        ) {
          throw new Error("Invalid page number");
        }

        groups.push([page - 1]);
      }
    }

    return groups;
  };

  const splitPdf = async () => {
    if (!file || pageCount === 0) return;

    try {
      setProcessing(true);
      clearOutputs();

      const bytes = await file.arrayBuffer();
      const sourcePdf = await PDFDocument.load(bytes);

      const generated: OutputFile[] = [];

      if (selectedMode === "every-page") {
        for (let index = 0; index < pageCount; index++) {
          generated.push(
            await createOutputPdf(
              sourcePdf,
              [index],
              `page-${index + 1}.pdf`
            )
          );
        }
      }

      if (selectedMode === "ranges") {
        if (!rangeInput.trim()) {
          alert("Enter page ranges first.");
          return;
        }

        const groups = parseRanges(
          rangeInput,
          pageCount
        );

        for (let index = 0; index < groups.length; index++) {
          generated.push(
            await createOutputPdf(
              sourcePdf,
              groups[index],
              `split-${index + 1}.pdf`
            )
          );
        }
      }

      if (selectedMode === "every-x") {
        const size = Math.max(
          1,
          Math.floor(everyX)
        );

        for (
          let start = 0;
          start < pageCount;
          start += size
        ) {
          const indexes: number[] = [];

          for (
            let page = start;
            page < Math.min(start + size, pageCount);
            page++
          ) {
            indexes.push(page);
          }

          generated.push(
            await createOutputPdf(
              sourcePdf,
              indexes,
              `pages-${start + 1}-${start + indexes.length}.pdf`
            )
          );
        }
      }

      if (selectedMode === "after-pages") {
        const splitPoints = afterPagesInput
          .split(",")
          .map((value) => Number(value.trim()))
          .filter(
            (value) =>
              Number.isInteger(value) &&
              value > 0 &&
              value < pageCount
          )
          .sort((a, b) => a - b);

        const uniquePoints = [
          ...new Set(splitPoints),
        ];

        if (uniquePoints.length === 0) {
          alert(
            "Enter valid split points, for example: 2,5,8"
          );
          return;
        }

        const boundaries = [
          0,
          ...uniquePoints,
          pageCount,
        ];

        for (
          let index = 0;
          index < boundaries.length - 1;
          index++
        ) {
          const start = boundaries[index];
          const end = boundaries[index + 1];

          const indexes: number[] = [];

          for (let page = start; page < end; page++) {
            indexes.push(page);
          }

          generated.push(
            await createOutputPdf(
              sourcePdf,
              indexes,
              `part-${index + 1}.pdf`
            )
          );
        }
      }

      setOutputs(generated);
      setTimeout(() => {
  resultSectionRef.current?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}, 100);
    } catch (error) {
      console.error("Split PDF error:", error);
      alert(
        "Unable to split the PDF. Please check your page settings."
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-6xl px-5 py-10">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            PDF Tool
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">
            Split PDF
          </h1>

          <p className="mt-4 text-lg text-slate-600">
            Separate PDF pages exactly the way you need.
            Your file stays in your browser.
          </p>
        </div>

        <div className="mt-8 rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_14px_45px_rgba(15,23,42,0.07)] md:p-8">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(event) => {
              handleFile(event.target.files?.[0]);
            }}
          />

          {!file ? (
            <button
              type="button"
              onClick={() =>
                inputRef.current?.click()
              }
              onDragOver={(event) => {
                event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();

                handleFile(
                  event.dataTransfer.files?.[0]
                );
              }}
              className="group flex min-h-[330px] w-full flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-blue-200 bg-gradient-to-br from-blue-50/70 via-white to-violet-50/60 px-6 text-center transition hover:border-blue-500"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_12px_28px_rgba(37,99,235,0.25)] transition group-hover:-translate-y-1">
                <Upload size={28} />
              </div>

              <h2 className="mt-6 text-2xl font-bold text-slate-950">
                Choose a PDF to split
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Click to browse or drag and drop your PDF here
              </p>
            </button>
          ) : (
            <>
              <div className="flex flex-col gap-4 rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
                    <FileText size={22} />
                  </div>

                  <div className="min-w-0">
                    <p
                      className="truncate font-bold text-slate-950"
                      title={file.name}
                    >
                      {file.name}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {pageCount}{" "}
                      {pageCount === 1
                        ? "page"
                        : "pages"}{" "}
                      •{" "}
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
                  type="button"
                  onClick={resetTool}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  <RotateCcw size={16} />
                  Change PDF
                </button>
              </div>

              <div className="mt-7">
                <div className="text-center">
                  <p className="text-sm font-bold uppercase tracking-[0.14em] text-blue-600">
                    Choose split method
                  </p>

                  <h2 className="mt-2 text-2xl font-bold text-slate-950">
                    How should we split this PDF?
                  </h2>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedMode(
                        "every-page"
                      )
                    }
                    className={`rounded-[22px] border p-5 text-left transition ${
                      selectedMode ===
                      "every-page"
                        ? "border-blue-500 bg-blue-50 shadow-[0_8px_24px_rgba(37,99,235,0.10)]"
                        : "border-slate-200 bg-white hover:border-blue-300"
                    }`}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                      <Layers3 size={21} />
                    </div>

                    <h3 className="mt-4 font-bold text-slate-950">
                      Every page
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Create one separate PDF for
                      every page.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedMode("ranges")
                    }
                    className={`rounded-[22px] border p-5 text-left transition ${
                      selectedMode === "ranges"
                        ? "border-blue-500 bg-blue-50 shadow-[0_8px_24px_rgba(37,99,235,0.10)]"
                        : "border-slate-200 bg-white hover:border-blue-300"
                    }`}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                      <ListChecks size={21} />
                    </div>

                    <h3 className="mt-4 font-bold text-slate-950">
                      Page ranges
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Split selected pages or page
                      ranges.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedMode("every-x")
                    }
                    className={`rounded-[22px] border p-5 text-left transition ${
                      selectedMode === "every-x"
                        ? "border-blue-500 bg-blue-50 shadow-[0_8px_24px_rgba(37,99,235,0.10)]"
                        : "border-slate-200 bg-white hover:border-blue-300"
                    }`}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <SplitSquareVertical
                        size={21}
                      />
                    </div>

                    <h3 className="mt-4 font-bold text-slate-950">
                      Split every X pages
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Choose how many pages each new PDF should contain.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedMode(
                        "after-pages"
                      )
                    }
                    className={`rounded-[22px] border p-5 text-left transition ${
                      selectedMode ===
                      "after-pages"
                        ? "border-blue-500 bg-blue-50 shadow-[0_8px_24px_rgba(37,99,235,0.10)]"
                        : "border-slate-200 bg-white hover:border-blue-300"
                    }`}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                      <Scissors size={21} />
                    </div>

                    <h3 className="mt-4 font-bold text-slate-950">
                      Split after pages
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Choose the page numbers after which a new PDF should start.
                    </p>
                  </button>
                </div>
              </div>

              <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                {selectedMode === "every-page" && (
                  <div>
                    <p className="font-bold text-slate-950">
                      Extract every page
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      This will create {pageCount} separate PDF
                      {pageCount === 1 ? "" : "s"}.
                    </p>
                  </div>
                )}

                {selectedMode === "ranges" && (
                  <div>
                    <label className="text-sm font-bold text-slate-800">
                      Page ranges
                    </label>

                    <input
                      value={rangeInput}
                      onChange={(event) =>
                        setRangeInput(
                          event.target.value
                        )
                      }
                      placeholder="Example: 1-3, 5, 7-9"
                      className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                    />

                    <p className="mt-2 text-xs text-slate-400">
                      Each comma-separated range will
                      become its own PDF.
                    </p>
                  </div>
                )}

                {selectedMode === "every-x" && (
                  <div>
                    <label className="text-sm font-bold text-slate-800">
                      Pages per PDF
                    </label>

                    <input
                      type="number"
                      min={1}
                      max={pageCount}
                      value={everyX}
                      onChange={(event) =>
                        setEveryX(
                          Number(
                            event.target.value
                          )
                        )
                      }
                      className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                    />

                    <p className="mt-2 text-xs text-slate-400">
                      Example: 2 → pages 1–2, 3–4, 5–6...
                    </p>
                  </div>
                )}

                {selectedMode ===
                  "after-pages" && (
                  <div>
                    <label className="text-sm font-bold text-slate-800">
                      Split after page numbers
                    </label>

                    <input
                      value={afterPagesInput}
                      onChange={(event) =>
                        setAfterPagesInput(
                          event.target.value
                        )
                      }
                      placeholder="Example: 2, 5, 8"
                      className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                    />

                    <p className="mt-2 text-xs text-slate-400">
                      Example: 2,5 → pages 1–2, 3–5, 6–end.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  disabled={processing}
                  onClick={splitPdf}
                  className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-sm font-bold text-white shadow-[0_10px_25px_rgba(37,99,235,0.24)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Scissors size={17} />

                  {processing
                    ? "Splitting..."
                    : "Split PDF"}
                </button>
              </div>

              {outputs.length > 0 && (
                <div
  ref={resultSectionRef}
  className="mt-7 rounded-[24px] border border-emerald-200 bg-emerald-50/60 p-5"
>
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-slate-950">
                      Your split PDFs are ready
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {outputs.length} file
                      {outputs.length === 1
                        ? ""
                        : "s"}{" "}
                      created.
                    </p>
                  </div>

                  <div className="mx-auto mt-5 grid max-w-3xl gap-3 sm:grid-cols-2">
                    {outputs.map((item) => (
                      <a
                        key={item.url}
                        href={item.url}
                        download={item.name}
                        className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 transition hover:border-emerald-400"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                            <FileText size={17} />
                          </div>

                          <span className="truncate text-sm font-semibold text-slate-800">
                            {item.name}
                          </span>
                        </div>

                        <Download
                          size={17}
                          className="shrink-0 text-emerald-600"
                        />
                      </a>
                    ))}
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