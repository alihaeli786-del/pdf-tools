"use client";

import { useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import {
  FileText,
  Upload,
  X,
  Tags,
  User,
  BookOpen,
  KeyRound,
  Download,
} from "lucide-react";

type MetadataState = {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
  creationDate: string;
  modificationDate: string;
};

const emptyMetadata: MetadataState = {
  title: "",
  author: "",
  subject: "",
  keywords: "",
  creator: "",
  producer: "",
  creationDate: "",
  modificationDate: "",
};

export default function PdfMetadataPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const resultSectionRef = useRef<HTMLDivElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const [metadata, setMetadata] =
    useState<MetadataState>(emptyMetadata);

  const [saving, setSaving] = useState(false);

  const [downloadUrl, setDownloadUrl] =
    useState<string | null>(null);

  const formatDate = (date?: Date) => {
    if (!date) return "";

    return date.toLocaleString();
  };

  const loadPdf = async (selectedFile: File) => {
    try {
      setLoading(true);

      const bytes = await selectedFile.arrayBuffer();
      const pdf = await PDFDocument.load(bytes);

      setFile(selectedFile);
      setPageCount(pdf.getPageCount());

      setMetadata({
        title: pdf.getTitle() || "",
        author: pdf.getAuthor() || "",
        subject: pdf.getSubject() || "",
        keywords: pdf.getKeywords() || "",
        creator: pdf.getCreator() || "",
        producer: pdf.getProducer() || "",
        creationDate: formatDate(
          pdf.getCreationDate()
        ),
        modificationDate: formatDate(
          pdf.getModificationDate()
        ),
      });
    } catch (error) {
      console.error(
        "PDF metadata load error:",
        error
      );

      alert("Unable to open this PDF.");
    } finally {
      setLoading(false);
    }
  };

  const handleFile = (selectedFile?: File) => {
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
    setMetadata(emptyMetadata);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const clearResult = () => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }

    setDownloadUrl(null);
  };

  const updateField = (
    field: keyof MetadataState,
    value: string
  ) => {
    clearResult();

    setMetadata((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const saveMetadata = async () => {
    if (!file) return;

    try {
      setSaving(true);
      clearResult();

      const bytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(bytes);

      pdf.setTitle(metadata.title.trim());
      pdf.setAuthor(metadata.author.trim());
      pdf.setSubject(metadata.subject.trim());
      pdf.setCreator(metadata.creator.trim());
      pdf.setProducer(metadata.producer.trim());

      const keywords = metadata.keywords
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean);

      pdf.setKeywords(keywords);

      pdf.setModificationDate(new Date());

      const resultBytes = await pdf.save();

      const outputBuffer =
        new ArrayBuffer(resultBytes.byteLength);

      new Uint8Array(outputBuffer).set(
        resultBytes
      );

      const blob = new Blob(
        [outputBuffer],
        {
          type: "application/pdf",
        }
      );

      const url = URL.createObjectURL(blob);

      setDownloadUrl(url);

      setTimeout(() => {
        resultSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 150);
    } catch (error) {
      console.error(
        "PDF metadata save error:",
        error
      );

      alert(
        "Unable to save PDF metadata."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-[1200px] px-5 py-10">

        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            PDF Tool
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            PDF Metadata Editor
          </h1>

          <p className="mt-4 text-lg text-slate-600">
            View and edit document information stored inside your PDF.
            Your file stays in your browser.
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
                  <Tags size={28} />
                </div>

                <h2 className="mt-7 text-3xl font-bold tracking-tight text-slate-950">
                  Edit your PDF information
                </h2>

                <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-500">
                  Upload a PDF to view its title, author,
                  subject, keywords and other metadata.
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
                      ? "Reading PDF..."
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
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

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
                      Ãƒâ€šÃ‚Â·{" "}
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
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  <X size={16} />
                  Remove
                </button>
              </div>
            </div>

            {/* METADATA */}
            <div className="mt-6 rounded-[24px] border border-slate-200 bg-white p-5 md:p-6">

              <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Tags size={19} />
                </div>

                <div>
                  <h2 className="font-bold text-slate-950">
                    Document metadata
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    View and edit the information stored inside this PDF.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">

                {/* TITLE */}
                <div className="rounded-xl bg-slate-50 px-5 py-4">
                  <label className="block text-sm font-bold text-slate-900">
                    Title
                  </label>

                  <input
                    value={metadata.title}
                    onChange={(event) =>
                      updateField("title", event.target.value)
                    }
                    placeholder="(anonymous)"
                    className="mt-2.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* AUTHOR */}
                <div className="rounded-xl bg-slate-50 px-5 py-4">
                  <label className="block text-sm font-bold text-slate-900">
                    Author
                  </label>

                  <input
                    value={metadata.author}
                    onChange={(event) =>
                      updateField("author", event.target.value)
                    }
                    placeholder="(anonymous)"
                    className="mt-2.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* CREATION DATE */}
                <div className="rounded-xl bg-slate-50 px-5 py-4">
                  <label className="block text-sm font-bold text-slate-900">
                    Creation Date
                  </label>

                  <input
                    value={metadata.creationDate || "Not available"}
                    readOnly
                    className="mt-2.5 w-full cursor-default rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 outline-none"
                  />
                </div>

                {/* CREATOR */}
                <div className="rounded-xl bg-slate-50 px-5 py-4">
                  <label className="block text-sm font-bold text-slate-900">
                    Creator
                  </label>

                  <input
                    value={metadata.creator}
                    onChange={(event) =>
                      updateField("creator", event.target.value)
                    }
                    placeholder="(unspecified)"
                    className="mt-2.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* KEYWORDS */}
                <div className="rounded-xl bg-slate-50 px-5 py-4">
                  <label className="block text-sm font-bold text-slate-900">
                    Keywords
                  </label>

                  <input
                    value={metadata.keywords}
                    onChange={(event) =>
                      updateField("keywords", event.target.value)
                    }
                    placeholder="example, report, invoice"
                    className="mt-2.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* MODIFICATION DATE */}
                <div className="rounded-xl bg-slate-50 px-5 py-4">
                  <label className="block text-sm font-bold text-slate-900">
                    Modification Date
                  </label>

                  <input
                    value={metadata.modificationDate || "Not available"}
                    readOnly
                    className="mt-2.5 w-full cursor-default rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 outline-none"
                  />
                </div>

                {/* SUBJECT */}
                <div className="rounded-xl bg-slate-50 px-5 py-4">
                  <label className="block text-sm font-bold text-slate-900">
                    Subject
                  </label>

                  <input
                    value={metadata.subject}
                    onChange={(event) =>
                      updateField("subject", event.target.value)
                    }
                    placeholder="(unspecified)"
                    className="mt-2.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* PRODUCER */}
                <div className="rounded-xl bg-slate-50 px-5 py-4">
                  <label className="block text-sm font-bold text-slate-900">
                    Producer
                  </label>

                  <input
                    value={metadata.producer}
                    onChange={(event) =>
                      updateField("producer", event.target.value)
                    }
                    placeholder="(unspecified)"
                    className="mt-2.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

              </div>
            </div>
            {/* SAVE ACTION */}
            <div className="sticky bottom-4 z-40 mt-6 rounded-[24px] border border-slate-200 bg-white/95 px-5 py-4 shadow-[0_14px_45px_rgba(15,23,42,0.16)] backdrop-blur-md md:px-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <p className="font-bold text-slate-950">
                    Ready to save metadata
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Your original PDF will remain unchanged.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={saveMetadata}
                  disabled={saving}
                  className="inline-flex min-w-[210px] items-center justify-center rounded-xl bg-blue-600 px-7 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : <>Save metadata {"\u2192"}</>}
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
                      Updated PDF is ready
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      Your metadata changes were saved successfully.
                    </p>
                  </div>

                  <a
                    href={downloadUrl}
                    download={`metadata-${file.name}`}
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
