"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Download, FileText, Upload, X } from "lucide-react";

export default function WordToPdfPage() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const clearResult = () => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }

    setDownloadUrl(null);
    setError("");
  };

  const handleFile = (selectedFile?: File) => {
    if (!selectedFile) return;

    const name = selectedFile.name.toLowerCase();

    if (!name.endsWith(".doc") && !name.endsWith(".docx")) {
      setError("Please choose a DOC or DOCX file.");
      return;
    }

    clearResult();
    setFile(selectedFile);
  };

  const resetTool = () => {
    clearResult();
    setFile(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const convertToPdf = async () => {
    if (!file || converting) return;

    try {
      setConverting(true);
      clearResult();

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/word-to-pdf", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Conversion failed.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      setDownloadUrl(url);
    } catch (conversionError) {
      console.error("Word to PDF error:", conversionError);

      setError(
        conversionError instanceof Error
          ? conversionError.message
          : "Unable to convert this Word document."
      );
    } finally {
      setConverting(false);
    }
  };

  const pdfFileName = file
    ? file.name.replace(/\.(doc|docx)$/i, "") + ".pdf"
    : "converted.pdf";

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-[1500px] px-5 py-10">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            PDF Tool
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Word to PDF
          </h1>

          <p className="mt-4 text-lg text-slate-600">
            Convert Word documents to PDF while preserving formatting and layout.
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(event) => handleFile(event.target.files?.[0])}
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
                  Convert your Word file to PDF
                </h2>

                <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-500">
                  Upload a DOC or DOCX document and create a high-quality PDF using the Toolijo server.
                </p>

                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleFile(event.dataTransfer.files?.[0]);
                  }}
                  className="group mx-auto mt-8 flex min-h-[190px] w-full max-w-2xl flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-blue-200 bg-blue-50/40 px-6 transition hover:border-blue-500 hover:bg-blue-50"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md transition group-hover:-translate-y-1">
                    <Upload size={25} />
                  </div>

                  <span className="mt-5 text-lg font-bold text-slate-900">
                    Choose Word file
                  </span>

                  <span className="mt-1 text-sm text-slate-500">
                    or drag and drop it here
                  </span>

                  <span className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    DOC and DOCX
                  </span>
                </button>

                {error && (
                  <p className="mt-5 text-sm font-semibold text-red-600">{error}</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto mt-8 max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <FileText size={22} />
                </div>

                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-950">{file.name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={resetTool}
                disabled={converting}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={16} />
                Remove
              </button>
            </div>

            <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50/70 p-6 text-center md:p-8">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md">
                <FileText size={25} />
              </div>

              <h2 className="mt-5 text-2xl font-bold text-slate-950">
                Ready to convert
              </h2>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Toolijo will process this Word document on the server and return the converted PDF.
              </p>

              <button
                type="button"
                onClick={convertToPdf}
                disabled={converting}
                className="mt-6 inline-flex min-w-[230px] items-center justify-center rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-[0_10px_28px_rgba(37,99,235,0.28)] transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {converting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Converting...
                  </span>
                ) : (
                  "Convert to PDF"
                )}
              </button>
            </div>

            {error && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            {downloadUrl && (
              <div className="mt-6 rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 text-emerald-600" size={22} />

                    <div>
                      <p className="font-bold text-slate-950">
                        Your PDF is ready
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Your Word document was converted successfully.
                      </p>
                    </div>
                  </div>

                  <a
                    href={downloadUrl}
                    download={pdfFileName}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-[0_8px_22px_rgba(5,150,105,0.22)] transition hover:-translate-y-0.5 hover:bg-emerald-700"
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
