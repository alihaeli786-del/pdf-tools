"use client";

import {
  useRef,
  useState,
} from "react";

import JSZip from "jszip";

import {
  ImageIcon,
  Upload,
  X,
  Trash2,
  Download,
  Gauge,
} from "lucide-react";

type ImageItem = {
  id: string;
  file: File;
  previewUrl: string;
  compressedUrl?: string;
  compressedSize?: number;
  compressedName?: string;
};

export default function CompressImagePage() {
  const inputRef =
    useRef<HTMLInputElement>(null);

  const [images, setImages] =
    useState<ImageItem[]>([]);

  const [quality, setQuality] =
    useState(75);

  const [
    compressionMode,
    setCompressionMode,
  ] =
    useState<
      "target" | "quality"
    >("target");

  const [targetKb, setTargetKb] =
    useState(100);

  const [compressing, setCompressing] =
    useState(false);

  const formatSize = (
    bytes: number
  ) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(
        bytes / 1024
      ).toFixed(1)} KB`;
    }

    return `${(
      bytes /
      1024 /
      1024
    ).toFixed(2)} MB`;
  };

  const addFiles = (
    selectedFiles:
      | FileList
      | File[]
  ) => {
    const files =
      Array.from(
        selectedFiles
      ).filter((file) =>
        [
          "image/jpeg",
          "image/png",
          "image/webp",
        ].includes(file.type)
      );

    if (files.length === 0) {
      alert(
        "Please choose JPG, PNG or WebP images."
      );
      return;
    }

    const newImages =
      files.map((file) => ({
        id:
          `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
        previewUrl:
          URL.createObjectURL(
            file
          ),
      }));

    setImages((current) => [
      ...current,
      ...newImages,
    ]);
  };

  const removeImage = (
    id: string
  ) => {
    setImages((current) => {
      const target =
        current.find(
          (item) =>
            item.id === id
        );

      if (target) {
        URL.revokeObjectURL(
          target.previewUrl
        );

        if (
          target.compressedUrl
        ) {
          URL.revokeObjectURL(
            target.compressedUrl
          );
        }
      }

      return current.filter(
        (item) =>
          item.id !== id
      );
    });
  };

  const clearAll = () => {
    images.forEach(
      (item) => {
        URL.revokeObjectURL(
          item.previewUrl
        );

        if (
          item.compressedUrl
        ) {
          URL.revokeObjectURL(
            item.compressedUrl
          );
        }
      }
    );

    setImages([]);

    if (inputRef.current) {
      inputRef.current.value =
        "";
    }
  };

  const loadImage = (
    url: string
  ) => {
    return new Promise<HTMLImageElement>(
      (resolve, reject) => {
        const image =
          new Image();

        image.onload =
          () =>
            resolve(image);

        image.onerror =
          reject;

        image.src = url;
      }
    );
  };

  const canvasToBlob = (
    canvas: HTMLCanvasElement,
    mimeType: string,
    imageQuality?: number
  ) => {
    return new Promise<Blob>(
      (resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(
                new Error(
                  "Image compression failed."
                )
              );
              return;
            }

            resolve(blob);
          },
          mimeType,
          imageQuality
        );
      }
    );
  };

  const clearCompressedResults =
    () => {
      setImages((current) =>
        current.map((item) => {
          if (
            item.compressedUrl
          ) {
            URL.revokeObjectURL(
              item.compressedUrl
            );
          }

          return {
            ...item,
            compressedUrl:
              undefined,
            compressedSize:
              undefined,
            compressedName:
              undefined,
          };
        })
      );
    };


  const compressCanvasToTarget =
    async (
      sourceCanvas:
        HTMLCanvasElement,
      targetBytes: number
    ) => {
      let scale = 1;

      let smallestBlob:
        Blob | null = null;

      for (
        let resizeAttempt = 0;
        resizeAttempt < 14;
        resizeAttempt++
      ) {
        const canvas =
          document.createElement(
            "canvas"
          );

        canvas.width =
          Math.max(
            1,
            Math.round(
              sourceCanvas.width *
                scale
            )
          );

        canvas.height =
          Math.max(
            1,
            Math.round(
              sourceCanvas.height *
                scale
            )
          );

        const context =
          canvas.getContext(
            "2d"
          );

        if (!context) {
          throw new Error(
            "Canvas unavailable."
          );
        }

        /*
          Student portals commonly
          accept JPEG and JPEG gives
          predictable target-size
          compression.

          White background prevents
          transparent PNG areas from
          becoming black.
        */

        context.fillStyle =
          "#ffffff";

        context.fillRect(
          0,
          0,
          canvas.width,
          canvas.height
        );

        context.drawImage(
          sourceCanvas,
          0,
          0,
          canvas.width,
          canvas.height
        );

        let minimumQuality =
          0.08;

        let maximumQuality =
          0.95;

        let bestBlob:
          Blob | null = null;

        for (
          let qualityAttempt = 0;
          qualityAttempt < 10;
          qualityAttempt++
        ) {
          const testQuality =
            (
              minimumQuality +
              maximumQuality
            ) / 2;

          const blob =
            await canvasToBlob(
              canvas,
              "image/jpeg",
              testQuality
            );

          if (
            !smallestBlob ||
            blob.size <
              smallestBlob.size
          ) {
            smallestBlob =
              blob;
          }

          if (
            blob.size <=
            targetBytes
          ) {
            bestBlob =
              blob;

            minimumQuality =
              testQuality;
          } else {
            maximumQuality =
              testQuality;
          }
        }

        if (bestBlob) {
          return bestBlob;
        }

        scale *= 0.8;
      }

      if (smallestBlob) {
        return smallestBlob;
      }

      throw new Error(
        "Unable to create compressed image."
      );
    };


  const compressImages =
    async () => {
      if (
        images.length === 0
      ) {
        return;
      }

      try {
        setCompressing(true);

        const compressed:
          ImageItem[] = [];

        for (
          const item of images
        ) {
          if (
            item.compressedUrl
          ) {
            URL.revokeObjectURL(
              item.compressedUrl
            );
          }

          const sourceImage =
            await loadImage(
              item.previewUrl
            );

          const canvas =
            document.createElement(
              "canvas"
            );

          canvas.width =
            sourceImage.naturalWidth;

          canvas.height =
            sourceImage.naturalHeight;

          const context =
            canvas.getContext(
              "2d"
            );

          if (!context) {
            throw new Error(
              "Canvas unavailable."
            );
          }

          context.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
          );

          context.drawImage(
            sourceImage,
            0,
            0
          );

          const baseName =
            item.file.name.replace(
              /\.[^.]+$/,
              ""
            );

          let blob: Blob;

          let compressedName:
            string;


          if (
            compressionMode ===
            "target"
          ) {
            const targetBytes =
              targetKb * 1024;

            /*
              Already below target?
              Keep original quality.
            */

            if (
              item.file.size <=
              targetBytes
            ) {
              blob =
                item.file;

              compressedName =
                `compressed-${item.file.name}`;
            } else {
              blob =
                await compressCanvasToTarget(
                  canvas,
                  targetBytes
                );

              compressedName =
                `compressed-${baseName}.jpg`;
            }
          } else {

            let mimeType =
              item.file.type;

            blob =
              await canvasToBlob(
                canvas,
                mimeType,
                mimeType ===
                  "image/png"
                  ? undefined
                  : quality / 100
              );

            let outputExtension =
              item.file.name
                .split(".")
                .pop()
                ?.toLowerCase() ||
              "jpg";

            if (
              item.file.type ===
              "image/png"
            ) {
              const webpBlob =
                await canvasToBlob(
                  canvas,
                  "image/webp",
                  quality / 100
                );

              if (
                webpBlob.size <
                blob.size
              ) {
                blob =
                  webpBlob;

                mimeType =
                  "image/webp";

                outputExtension =
                  "webp";
              }
            }

            if (
              blob.size >=
              item.file.size
            ) {
              blob =
                item.file;

              outputExtension =
                item.file.name
                  .split(".")
                  .pop()
                  ?.toLowerCase() ||
                outputExtension;
            }

            compressedName =
              `compressed-${baseName}.${outputExtension}`;
          }


          compressed.push({
            ...item,

            compressedUrl:
              URL.createObjectURL(
                blob
              ),

            compressedSize:
              blob.size,

            compressedName,
          });
        }

        setImages(
          compressed
        );
      } catch (error) {
        console.error(
          "Image compression error:",
          error
        );

        alert(
          "Unable to compress one or more images."
        );
      } finally {
        setCompressing(false);
      }
    };

  const downloadAllCompressed =
    async () => {
      const completedImages =
        images.filter(
          (item) =>
            item.compressedUrl &&
            item.compressedName
        );

      if (
        completedImages.length === 0
      ) {
        return;
      }

      try {
        const zip =
          new JSZip();

        const usedNames =
          new Set<string>();

        for (
          const item of
          completedImages
        ) {
          if (
            !item.compressedUrl ||
            !item.compressedName
          ) {
            continue;
          }

          const response =
            await fetch(
              item.compressedUrl
            );

          const blob =
            await response.blob();

          const dotIndex =
            item.compressedName
              .lastIndexOf(".");

          const baseName =
            dotIndex > 0
              ? item.compressedName.slice(
                  0,
                  dotIndex
                )
              : item.compressedName;

          const extension =
            dotIndex > 0
              ? item.compressedName.slice(
                  dotIndex
                )
              : "";

          let zipName =
            item.compressedName;

          let copyNumber = 2;

          while (
            usedNames.has(
              zipName
            )
          ) {
            zipName =
              `${baseName}-${copyNumber}${extension}`;

            copyNumber++;
          }

          usedNames.add(
            zipName
          );

          zip.file(
            zipName,
            blob
          );
        }

        const zipBlob =
          await zip.generateAsync({
            type: "blob",
          });

        const url =
          URL.createObjectURL(
            zipBlob
          );

        const anchor =
          document.createElement(
            "a"
          );

        anchor.href = url;

        anchor.download =
          "compressed-images.zip";

        document.body.appendChild(
          anchor
        );

        anchor.click();

        anchor.remove();

        URL.revokeObjectURL(
          url
        );
      } catch (error) {
        console.error(
          "ZIP download error:",
          error
        );

        alert(
          "Unable to create ZIP file."
        );
      }
    };


  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f5f3ff_0%,#f8fafc_38%,#f8fafc_100%)]">

      <section className="mx-auto max-w-[1450px] px-5 py-10">

        <div className="mx-auto max-w-4xl text-center">

          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-4 py-2 text-sm font-bold text-violet-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-violet-500" />
            Image Compression Tool
          </div>

          <h1 className="mt-5 text-4xl font-black tracking-[-0.035em] text-slate-950 md:text-6xl">
            Compress images.
            <span className="block bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
              Keep them looking great.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
            Reduce image file size directly in your browser without uploading your files to a server.
          </p>

        </div>


        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => {
            if (
              event.target.files
            ) {
              addFiles(
                event.target.files
              );

              event.target.value =
                "";
            }
          }}
        />


        {images.length === 0 ? (
          <div className="mx-auto mt-10 max-w-5xl rounded-[32px] border border-slate-200 bg-white p-7 shadow-[0_20px_70px_rgba(15,23,42,0.08)]">

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

                addFiles(
                  event.dataTransfer.files
                );
              }}
              className="group flex min-h-[320px] w-full flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-violet-200 bg-[linear-gradient(135deg,#faf5ff_0%,#ffffff_48%,#eff6ff_100%)] px-6 transition-all duration-300 hover:-translate-y-1 hover:border-violet-500 hover:shadow-[0_20px_60px_rgba(124,58,237,0.12)]"
            >

              <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-[0_12px_28px_rgba(124,58,237,0.30)] transition group-hover:-translate-y-1">
                <Upload size={26} />
              </div>

              <span className="mt-6 text-xl font-black text-slate-950">
                Choose images
              </span>

              <span className="mt-2 text-sm text-slate-500">
                or drag and drop them here
              </span>

              <span className="mt-5 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-500 shadow-sm">
                JPG, PNG and WebP
              </span>

            </button>

          </div>
        ) : (
          <div className="mx-auto mt-10 max-w-7xl">

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">

              <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex flex-1 items-center justify-center gap-3 text-center">

                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                    <ImageIcon size={21} />
                  </div>

                  <div className="text-center">
                    <p className="font-black text-slate-950">
                      {images.length}{" "}
                      {images.length === 1
                        ? "image selected"
                        : "images selected"}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Add or remove images before compression.
                    </p>
                  </div>

                </div>


                <div className="flex gap-2">

                  <button
                    type="button"
                    onClick={() =>
                      inputRef.current?.click()
                    }
                    className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-700 transition hover:bg-violet-100"
                  >
                    Add images
                  </button>

                  <button
                    type="button"
                    onClick={clearAll}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                    Clear all
                  </button>

                </div>

              </div>


              <div className="mt-6 overflow-hidden rounded-[26px] border border-slate-200 bg-slate-50/70">

                <div className="border-b border-slate-200 bg-white px-5 py-5">

                  <div className="flex items-center justify-center gap-3 text-center sm:pr-[230px]">

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                      <Gauge size={19} />
                    </div>

                    <div className="text-center">
                      <p className="font-black text-slate-950">
                        Compression target
                      </p>

                      <p className="text-sm text-slate-500">
                        Choose a file-size limit or control quality manually.
                      </p>
                    </div>

                  </div>

                </div>


                <div className="p-5">

                  <div className="grid gap-3 sm:grid-cols-2">

                    <button
                      type="button"
                      onClick={() => {
                        clearCompressedResults();
                        setCompressionMode(
                          "target"
                        );
                      }}
                      className={`rounded-2xl border px-5 py-4 text-center transition-all ${
                        compressionMode ===
                        "target"
                          ? "border-violet-600 bg-violet-600 text-white shadow-[0_10px_25px_rgba(124,58,237,0.22)]"
                          : "border-slate-200 bg-white text-slate-700 hover:border-violet-300"
                      }`}
                    >
                      <p className="font-black">
                        Target file size
                      </p>

                      <p
                        className={`mt-1 text-xs ${
                          compressionMode ===
                          "target"
                            ? "text-violet-100"
                            : "text-slate-500"
                        }`}
                      >
                        Best for student portals and upload limits.
                      </p>
                    </button>


                    <button
                      type="button"
                      onClick={() => {
                        clearCompressedResults();
                        setCompressionMode(
                          "quality"
                        );
                      }}
                      className={`rounded-2xl border px-5 py-4 text-center transition-all ${
                        compressionMode ===
                        "quality"
                          ? "border-violet-600 bg-violet-600 text-white shadow-[0_10px_25px_rgba(124,58,237,0.22)]"
                          : "border-slate-200 bg-white text-slate-700 hover:border-violet-300"
                      }`}
                    >
                      <p className="font-black">
                        Manual quality
                      </p>

                      <p
                        className={`mt-1 text-xs ${
                          compressionMode ===
                          "quality"
                            ? "text-violet-100"
                            : "text-slate-500"
                        }`}
                      >
                        Set image quality yourself.
                      </p>
                    </button>

                  </div>


                  {compressionMode ===
                  "target" ? (
                    <div className="mt-5">

                      <div className="relative flex items-center justify-center gap-4 sm:pr-[230px]">

                        <div className="text-center">
                          <p className="text-sm font-black text-slate-800">
                            Maximum file size
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            We will automatically optimize quality and dimensions.
                          </p>
                        </div>

                        <span className="rounded-xl bg-violet-100 px-3 py-2 text-sm font-black text-violet-700 sm:absolute sm:left-[65%] sm:-translate-x-1/2">
                          {targetKb} KB
                        </span>

                      </div>


                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">

                        {[
                          50,
                          100,
                          200,
                          500,
                        ].map(
                          (size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => {
                                clearCompressedResults();
                                setTargetKb(
                                  size
                                );
                              }}
                              className={`rounded-2xl border px-4 py-4 text-sm font-black transition-all ${
                                targetKb ===
                                size
                                  ? "border-violet-600 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md"
                                  : "border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-700"
                              }`}
                            >
                              {size} KB
                            </button>
                          )
                        )}

                      </div>


                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                          <div className="flex-1 text-center">
                            <p className="text-sm font-black text-slate-800">
                              Custom size
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              Enter any maximum file size you need.
                            </p>
                          </div>


                          <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100">

                            <input
                              type="number"
                              min="10"
                              max="5000"
                              step="1"
                              value={targetKb}
                              onChange={(event) => {
                                clearCompressedResults();

                                const value =
                                  Number(
                                    event.target.value
                                  );

                                setTargetKb(
                                  Math.max(
                                    10,
                                    Math.min(
                                      5000,
                                      value || 10
                                    )
                                  )
                                );
                              }}
                              className="w-28 bg-transparent px-4 py-3 text-right text-sm font-black text-slate-900 outline-none"
                            />

                            <span className="border-l border-slate-200 bg-white px-4 py-3 text-sm font-black text-violet-700">
                              KB
                            </span>

                          </div>

                        </div>

                      </div>


                      <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-center text-xs leading-5 text-blue-700">
                        For strict upload limits, the result is optimized to stay at or below the selected target whenever possible.
                      </div>

                    </div>
                  ) : (
                    <div className="mt-5">

                      <div className="flex items-center justify-between gap-4">

                        <div>
                          <p className="text-sm font-black text-slate-800">
                            Image quality
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Lower quality usually creates a smaller file.
                          </p>
                        </div>

                        <span className="rounded-xl bg-violet-100 px-3 py-2 text-sm font-black text-violet-700">
                          {quality}%
                        </span>

                      </div>


                      <input
                        type="range"
                        min="20"
                        max="95"
                        step="5"
                        value={quality}
                        onChange={(event) => {
                          clearCompressedResults();

                          setQuality(
                            Number(
                              event.target.value
                            )
                          );
                        }}
                        className="mt-6 w-full accent-violet-600"
                      />

                    </div>
                  )}

                </div>

              </div>

              <div className="mt-6 flex flex-wrap justify-center gap-5">

                {images.map(
                  (item) => {
                    const savings =
                      item.compressedSize !==
                        undefined &&
                      item.file.size > 0
                        ? Math.max(
                            0,
                            Math.round(
                              (1 -
                                item.compressedSize /
                                  item.file.size) *
                                100
                            )
                          )
                        : null;

                    const downloadAllCompressed =
    async () => {
      const completedImages =
        images.filter(
          (item) =>
            item.compressedUrl &&
            item.compressedName
        );

      if (
        completedImages.length === 0
      ) {
        return;
      }

      try {
        const zip =
          new JSZip();

        const usedNames =
          new Set<string>();

        for (
          const item of
          completedImages
        ) {
          if (
            !item.compressedUrl ||
            !item.compressedName
          ) {
            continue;
          }

          const response =
            await fetch(
              item.compressedUrl
            );

          const blob =
            await response.blob();

          const dotIndex =
            item.compressedName
              .lastIndexOf(".");

          const baseName =
            dotIndex > 0
              ? item.compressedName.slice(
                  0,
                  dotIndex
                )
              : item.compressedName;

          const extension =
            dotIndex > 0
              ? item.compressedName.slice(
                  dotIndex
                )
              : "";

          let zipName =
            item.compressedName;

          let copyNumber = 2;

          while (
            usedNames.has(
              zipName
            )
          ) {
            zipName =
              `${baseName}-${copyNumber}${extension}`;

            copyNumber++;
          }

          usedNames.add(
            zipName
          );

          zip.file(
            zipName,
            blob
          );
        }

        const zipBlob =
          await zip.generateAsync({
            type: "blob",
          });

        const url =
          URL.createObjectURL(
            zipBlob
          );

        const anchor =
          document.createElement(
            "a"
          );

        anchor.href = url;

        anchor.download =
          "compressed-images.zip";

        document.body.appendChild(
          anchor
        );

        anchor.click();

        anchor.remove();

        URL.revokeObjectURL(
          url
        );
      } catch (error) {
        console.error(
          "ZIP download error:",
          error
        );

        alert(
          "Unable to create ZIP file."
        );
      }
    };


  return (
                      <div
                        key={item.id}
                        className="w-full overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm sm:w-[292px]"
                      >

                        <div className="relative flex h-52 items-center justify-center overflow-hidden bg-slate-50">

                          <img
                            src={
                              item.previewUrl
                            }
                            alt={
                              item.file.name
                            }
                            className="max-h-full max-w-full object-contain"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              removeImage(
                                item.id
                              )
                            }
                            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-500 shadow-md hover:bg-red-50 hover:text-red-600"
                          >
                            <X size={17} />
                          </button>

                        </div>


                        <div className="p-4">

                          <p className="truncate text-sm font-black text-slate-900">
                            {item.file.name}
                          </p>

                          <div className="mt-2 flex justify-between text-xs text-slate-500">
                            <span>
                              Original
                            </span>

                            <span>
                              {formatSize(
                                item.file.size
                              )}
                            </span>
                          </div>


                          {item.compressedUrl &&
                            item.compressedSize !==
                              undefined && (
                              <div className="mt-4 border-t border-slate-100 pt-4">

                                <div className="flex justify-between text-xs">
                                  <span className="font-bold text-emerald-700">
                                    Compressed
                                  </span>

                                  <span className="font-bold text-slate-700">
                                    {formatSize(
                                      item.compressedSize
                                    )}
                                  </span>
                                </div>

                                {savings !==
                                  null && (
                                  <div className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-center text-xs font-black text-emerald-700">
                                    {savings}% smaller
                                  </div>
                                )}

                                <a
                                  href={
                                    item.compressedUrl
                                  }
                                  download={
                                    item.compressedName
                                  }
                                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700"
                                >
                                  <Download size={16} />
                                  Download
                                </a>

                              </div>
                            )}

                        </div>

                      </div>
                    );
                  }
                )}

              </div>


              <div className="sticky bottom-4 z-40 mt-7 rounded-[24px] border border-violet-100 bg-white/95 px-5 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.12)] backdrop-blur-xl">

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                  <div className="flex-1 text-center">
                    <p className="font-bold text-slate-950">
                      Ready to compress
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {compressionMode ===
                      "target" ? (
                        <>
                          Compress{" "}
                          {images.length}{" "}
                          {images.length === 1
                            ? "image"
                            : "images"}{" "}
                          to maximum{" "}
                          <span className="font-bold text-violet-700">
                            {targetKb} KB
                          </span>
                          .
                        </>
                      ) : (
                        <>
                          Compress{" "}
                          {images.length}{" "}
                          {images.length === 1
                            ? "image"
                            : "images"}{" "}
                          at {quality}% quality.
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">

                    {images.some(
                      (item) =>
                        item.compressedUrl
                    ) && (
                      <button
                        type="button"
                        onClick={
                          downloadAllCompressed
                        }
                        className="inline-flex min-w-[190px] items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-6 py-4 text-sm font-bold text-violet-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-violet-100"
                      >
                        <Download size={17} />
                        Download All ZIP
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={
                        compressImages
                      }
                      disabled={
                        compressing
                      }
                      className="min-w-[230px] rounded-2xl bg-gradient-to-r from-violet-500 via-violet-600 to-indigo-600 px-7 py-4 text-sm font-bold text-white shadow-[0_14px_35px_rgba(124,58,237,0.30)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {compressing
                        ? "Compressing..."
                        : "Compress images"}
                    </button>

                  </div>

                </div>

              </div>

            </div>

          </div>
        )}

      </section>

    </main>
  );
}
