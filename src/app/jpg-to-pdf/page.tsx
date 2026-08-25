"use client";

import { useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";
import {
  Upload,
  Images,
  FileDown,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  X,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  Image as ImageIcon,
  Settings2,
} from "lucide-react";
import { PDFDocument } from "pdf-lib";

type ImageItem = {
  id: string;
  file: File;
  url: string;
  width: number;
  height: number;
};

type PageSizeOption = "fit" | "a4";
type OrientationOption = "portrait" | "landscape";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MM_TO_PT = 2.834645669;

export default function JpgToPdfPage() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<ImageItem[]>([]);
  const [pageSize, setPageSize] =
    useState<PageSizeOption>("fit");
  const [orientation, setOrientation] =
    useState<OrientationOption>("portrait");
  const [marginMm, setMarginMm] = useState(10);

  const [draggedId, setDraggedId] =
    useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    return () => {
      images.forEach((image) =>
        URL.revokeObjectURL(image.url)
      );
    };
  }, [images]);

  const getImageDimensions = (
    file: File
  ): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();

      image.onload = () => {
        resolve({
          width: image.naturalWidth,
          height: image.naturalHeight,
        });

        URL.revokeObjectURL(url);
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Unable to read image."));
      };

      image.src = url;
    });
  };

  const handleFiles = async (
    selectedFiles: FileList | File[]
  ) => {
    try {
      setError("");
      setSuccess(false);

      const files = Array.from(selectedFiles);

      const validFiles = files.filter((file) => {
        return (
          file.type === "image/jpeg" ||
          file.type === "image/png"
        );
      });

      if (validFiles.length === 0) {
        setError(
          "Please select JPG, JPEG or PNG images."
        );
        return;
      }

      const newImages: ImageItem[] = [];

      for (const file of validFiles) {
        const dimensions =
          await getImageDimensions(file);

        newImages.push({
          id: `${Date.now()}-${Math.random()}`,
          file,
          url: URL.createObjectURL(file),
          width: dimensions.width,
          height: dimensions.height,
        });
      }

      setImages((current) => [
        ...current,
        ...newImages,
      ]);
    } catch (err) {
      console.error(err);
      setError(
        "One or more images could not be loaded."
      );
    }

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const removeImage = (id: string) => {
    setImages((current) => {
      const target = current.find(
        (image) => image.id === id
      );

      if (target) {
        URL.revokeObjectURL(target.url);
      }

      return current.filter(
        (image) => image.id !== id
      );
    });

    setSuccess(false);
  };

  const clearAll = () => {
    images.forEach((image) =>
      URL.revokeObjectURL(image.url)
    );

    setImages([]);
    setError("");
    setSuccess(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const moveImage = (
    id: string,
    direction: "up" | "down"
  ) => {
    setImages((current) => {
      const index = current.findIndex(
        (image) => image.id === id
      );

      if (index === -1) return current;

      const targetIndex =
        direction === "up"
          ? index - 1
          : index + 1;

      if (
        targetIndex < 0 ||
        targetIndex >= current.length
      ) {
        return current;
      }

      const next = [...current];

      [next[index], next[targetIndex]] = [
        next[targetIndex],
        next[index],
      ];

      return next;
    });

    setSuccess(false);
  };

  const handleDragStart = (
    event: DragEvent<HTMLDivElement>,
    id: string
  ) => {
    setDraggedId(id);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (
    event: DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (
    event: DragEvent<HTMLDivElement>,
    targetId: string
  ) => {
    event.preventDefault();

    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    setImages((current) => {
      const fromIndex = current.findIndex(
        (image) => image.id === draggedId
      );

      const toIndex = current.findIndex(
        (image) => image.id === targetId
      );

      if (
        fromIndex === -1 ||
        toIndex === -1
      ) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);

      next.splice(toIndex, 0, moved);

      return next;
    });

    setDraggedId(null);
    setSuccess(false);
  };

  const createPdf = async () => {
    if (images.length === 0) return;

    try {
      setCreating(true);
      setError("");
      setSuccess(false);

      const pdfDoc =
        await PDFDocument.create();

      for (const imageItem of images) {
        const bytes =
          await imageItem.file.arrayBuffer();

        let embeddedImage;

        if (
          imageItem.file.type === "image/png"
        ) {
          embeddedImage =
            await pdfDoc.embedPng(bytes);
        } else {
          embeddedImage =
            await pdfDoc.embedJpg(bytes);
        }

        let pageWidth: number;
        let pageHeight: number;

        const margin =
          marginMm * MM_TO_PT;

        if (pageSize === "fit") {
          const naturalWidth =
            embeddedImage.width * 0.75;
          const naturalHeight =
            embeddedImage.height * 0.75;

          pageWidth =
            naturalWidth + margin * 2;
          pageHeight =
            naturalHeight + margin * 2;
        } else {
          if (orientation === "portrait") {
            pageWidth = A4_WIDTH;
            pageHeight = A4_HEIGHT;
          } else {
            pageWidth = A4_HEIGHT;
            pageHeight = A4_WIDTH;
          }
        }

        const page = pdfDoc.addPage([
          pageWidth,
          pageHeight,
        ]);

        const availableWidth = Math.max(
          1,
          pageWidth - margin * 2
        );

        const availableHeight = Math.max(
          1,
          pageHeight - margin * 2
        );

        const scale = Math.min(
          availableWidth / embeddedImage.width,
          availableHeight / embeddedImage.height
        );

        const drawWidth =
          embeddedImage.width * scale;

        const drawHeight =
          embeddedImage.height * scale;

        const x =
          (pageWidth - drawWidth) / 2;

        const y =
          (pageHeight - drawHeight) / 2;

        page.drawImage(embeddedImage, {
          x,
          y,
          width: drawWidth,
          height: drawHeight,
        });
      }

      const pdfBytes =
        await pdfDoc.save();

      const pdfArray =
        new Uint8Array(pdfBytes);

      const blob = new Blob(
        [pdfArray.buffer as ArrayBuffer],
        {
          type: "application/pdf",
        }
      );

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;
      link.download = "images-to-pdf.pdf";

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
        "Unable to create the PDF. Please try again."
      );
    } finally {
      setCreating(false);
    }
  };

  const totalSize = images.reduce(
    (sum, image) => sum + image.file.size,
    0
  );

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }

    return `${(
      bytes /
      1024 /
      1024
    ).toFixed(2)} MB`;
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
            <Images size={30} />
          </div>

          <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            JPG to PDF
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Turn multiple JPG, JPEG or PNG images
            into one professional PDF document.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-slate-500">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              Multiple images
            </span>

            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              Drag to reorder
            </span>

            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              Private browser processing
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files) {
              handleFiles(event.target.files);
            }
          }}
        />

        {images.length === 0 ? (
          <div className="mx-auto max-w-4xl">
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

                if (
                  event.dataTransfer.files.length >
                  0
                ) {
                  handleFiles(
                    event.dataTransfer.files
                  );
                }
              }}
              className="group flex min-h-[390px] w-full flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-blue-200 bg-white px-6 text-center shadow-sm transition hover:border-blue-400 hover:bg-blue-50/30"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200 transition group-hover:-translate-y-1">
                <Upload size={28} />
              </div>

              <h2 className="mt-6 text-2xl font-bold text-slate-900">
                Upload your images
              </h2>

              <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
                Select multiple JPG, JPEG or PNG
                images. You can reorder them before
                creating your PDF.
              </p>

              <span className="mt-6 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-100">
                Select images
              </span>

              <p className="mt-4 text-xs text-slate-400">
                Or drag and drop images here
              </p>
            </button>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <FeatureCard
                icon={<ImageIcon size={20} />}
                title="Multiple images"
                text="Combine all your images into one PDF."
              />

              <FeatureCard
                icon={<GripVertical size={20} />}
                title="Reorder pages"
                text="Drag images into exactly the order you want."
              />

              <FeatureCard
                icon={<ShieldCheck size={20} />}
                title="Private"
                text="Your files are processed in your browser."
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-8 xl:grid-cols-[1fr_330px]">
            <div>
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-950">
                    Your images
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {images.length}{" "}
                    {images.length === 1
                      ? "image"
                      : "images"}{" "}
                    · {formatSize(totalSize)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      inputRef.current?.click()
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  >
                    <Upload size={16} />
                    Add images
                  </button>

                  <button
                    type="button"
                    onClick={clearAll}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                    Clear all
                  </button>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {images.map((image, index) => (
                  <div
                    key={image.id}
                    draggable
                    onDragStart={(event) =>
                      handleDragStart(
                        event,
                        image.id
                      )
                    }
                    onDragOver={handleDragOver}
                    onDrop={(event) =>
                      handleDrop(
                        event,
                        image.id
                      )
                    }
                    onDragEnd={() =>
                      setDraggedId(null)
                    }
                    className={`group overflow-hidden rounded-[22px] border bg-white shadow-sm transition ${
                      draggedId === image.id
                        ? "scale-[0.98] border-blue-400 opacity-50"
                        : "border-slate-200 hover:-translate-y-1 hover:shadow-lg"
                    }`}
                  >
                    <div className="relative flex h-64 items-center justify-center bg-slate-100 p-4">
                      <div className="absolute left-3 top-3 flex h-8 min-w-8 items-center justify-center rounded-lg bg-slate-900/80 px-2 text-xs font-bold text-white backdrop-blur">
                        {index + 1}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          removeImage(image.id)
                        }
                        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 shadow transition hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove image"
                      >
                        <X size={16} />
                      </button>

                      <img
                        src={image.url}
                        alt={`Image ${index + 1}`}
                        draggable={false}
                        className="max-h-full max-w-full object-contain shadow-sm"
                      />
                    </div>

                    <div className="border-t border-slate-100 p-4">
                      <div className="flex items-center gap-2">
                        <GripVertical
                          size={17}
                          className="shrink-0 text-slate-400"
                        />

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {image.file.name}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {image.width} ×{" "}
                            {image.height}px
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() =>
                            moveImage(
                              image.id,
                              "up"
                            )
                          }
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <ArrowUp size={14} />
                          Earlier
                        </button>

                        <button
                          type="button"
                          disabled={
                            index ===
                            images.length - 1
                          }
                          onClick={() =>
                            moveImage(
                              image.id,
                              "down"
                            )
                          }
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <ArrowDown size={14} />
                          Later
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <aside className="xl:sticky xl:top-6 xl:self-start">
              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Settings2
                    size={20}
                    className="text-blue-600"
                  />

                  <h3 className="text-lg font-bold text-slate-950">
                    PDF settings
                  </h3>
                </div>

                <div className="mt-6">
                  <p className="text-sm font-bold text-slate-800">
                    Page size
                  </p>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setPageSize("fit")
                      }
                      className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                        pageSize === "fit"
                          ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-100"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Fit image
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setPageSize("a4")
                      }
                      className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                        pageSize === "a4"
                          ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-100"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      A4
                    </button>
                  </div>
                </div>

                {pageSize === "a4" && (
                  <div className="mt-5">
                    <p className="text-sm font-bold text-slate-800">
                      Orientation
                    </p>

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setOrientation(
                            "portrait"
                          )
                        }
                        className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                          orientation ===
                          "portrait"
                            ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-100"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Portrait
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setOrientation(
                            "landscape"
                          )
                        }
                        className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                          orientation ===
                          "landscape"
                            ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-100"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Landscape
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-800">
                      Margin
                    </p>

                    <span className="text-xs font-semibold text-blue-600">
                      {marginMm} mm
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="5"
                    value={marginMm}
                    onChange={(event) =>
                      setMarginMm(
                        Number(
                          event.target.value
                        )
                      )
                    }
                    className="mt-3 w-full accent-blue-600"
                  />

                  <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                    <span>0 mm</span>
                    <span>30 mm</span>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">
                      Pages
                    </span>

                    <span className="font-bold text-slate-900">
                      {images.length}
                    </span>
                  </div>

                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-slate-500">
                      Images
                    </span>

                    <span className="font-bold text-slate-900">
                      {formatSize(totalSize)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={createPdf}
                  disabled={
                    creating ||
                    images.length === 0
                  }
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-100 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creating ? (
                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />
                      Creating PDF...
                    </>
                  ) : (
                    <>
                      <FileDown size={18} />
                      Create PDF
                    </>
                  )}
                </button>

                {success && (
                  <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium leading-5 text-emerald-700">
                    <CheckCircle2
                      size={17}
                      className="mt-0.5 shrink-0"
                    />
                    PDF created and downloaded successfully.
                  </div>
                )}

                {error && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium leading-5 text-red-700">
                    {error}
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                <ShieldCheck
                  size={20}
                  className="mx-auto text-emerald-600"
                />

                <p className="mt-2 text-sm font-bold text-slate-900">
                  Private & secure
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Images are processed locally in
                  your browser.
                </p>
              </div>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-blue-600">
        {icon}
      </div>

      <p className="mt-3 text-sm font-bold text-slate-900">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {text}
      </p>
    </div>
  );
}
