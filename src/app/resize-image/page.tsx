"use client";

import {
  useRef,
  useState,
} from "react";

import {
  ImageIcon,
  Upload,
  X,
  Trash2,
  Download,
  Maximize2,
  Lock,
  Unlock,
} from "lucide-react";

type ResizeMode =
  | "dimensions"
  | "percentage";

type ImageItem = {
  id: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  resizedUrl?: string;
  resizedWidth?: number;
  resizedHeight?: number;
  resizedSize?: number;
  resizedName?: string;
};

export default function ResizeImagePage() {
  const inputRef =
    useRef<HTMLInputElement>(null);

  const resultSectionRef =
    useRef<HTMLDivElement>(null);

  const [images, setImages] =
    useState<ImageItem[]>([]);

  const [resizeMode, setResizeMode] =
    useState<ResizeMode>(
      "dimensions"
    );

  const [targetWidth, setTargetWidth] =
    useState(1080);

  const [targetHeight, setTargetHeight] =
    useState(1080);

  const [percentage, setPercentage] =
    useState(50);

  const [
    preserveAspect,
    setPreserveAspect,
  ] = useState(true);

  const [resizing, setResizing] =
    useState(false);


  const formatSize = (
    bytes: number
  ) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (
      bytes <
      1024 * 1024
    ) {
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

        image.src =
          url;
      }
    );
  };


  const canvasToBlob = (
    canvas: HTMLCanvasElement,
    mimeType: string
  ) => {
    return new Promise<Blob>(
      (resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(
                new Error(
                  "Unable to create resized image."
                )
              );
              return;
            }

            resolve(blob);
          },
          mimeType,
          mimeType ===
            "image/png"
            ? undefined
            : 0.92
        );
      }
    );
  };


  const clearResizeResults =
    () => {
      setImages((current) =>
        current.map(
          (item) => {
            if (
              item.resizedUrl
            ) {
              URL.revokeObjectURL(
                item.resizedUrl
              );
            }

            return {
              ...item,
              resizedUrl:
                undefined,
              resizedWidth:
                undefined,
              resizedHeight:
                undefined,
              resizedSize:
                undefined,
              resizedName:
                undefined,
            };
          }
        )
      );
    };


  const addFiles = async (
    selectedFiles:
      | FileList
      | File[]
  ) => {
    const files =
      Array.from(
        selectedFiles
      ).filter(
        (file) =>
          [
            "image/jpeg",
            "image/png",
            "image/webp",
          ].includes(
            file.type
          )
      );

    if (
      files.length === 0
    ) {
      alert(
        "Please choose JPG, PNG or WebP images."
      );
      return;
    }

    try {
      const newItems:
        ImageItem[] = [];

      for (
        const file of files
      ) {
        const previewUrl =
          URL.createObjectURL(
            file
          );

        const image =
          await loadImage(
            previewUrl
          );

        newItems.push({
          id:
            `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
          file,
          previewUrl,
          width:
            image.naturalWidth,
          height:
            image.naturalHeight,
        });
      }

      setImages(
        (current) => [
          ...current,
          ...newItems,
        ]
      );
    } catch (error) {
      console.error(
        "Image load error:",
        error
      );

      alert(
        "Unable to open one or more images."
      );
    }
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
          target.resizedUrl
        ) {
          URL.revokeObjectURL(
            target.resizedUrl
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
          item.resizedUrl
        ) {
          URL.revokeObjectURL(
            item.resizedUrl
          );
        }
      }
    );

    setImages([]);

    if (
      inputRef.current
    ) {
      inputRef.current.value =
        "";
    }
  };


  const getDimensions = (
    originalWidth: number,
    originalHeight: number
  ) => {
    if (
      resizeMode ===
      "percentage"
    ) {
      const scale =
        Math.max(
          1,
          percentage
        ) / 100;

      return {
        width:
          Math.max(
            1,
            Math.round(
              originalWidth *
                scale
            )
          ),

        height:
          Math.max(
            1,
            Math.round(
              originalHeight *
                scale
            )
          ),
      };
    }


    if (!preserveAspect) {
      return {
        width:
          Math.max(
            1,
            targetWidth
          ),

        height:
          Math.max(
            1,
            targetHeight
          ),
      };
    }


    /*
      Preserve aspect ratio and
      fit the image inside the
      selected width / height.
    */

    const widthRatio =
      Math.max(
        1,
        targetWidth
      ) /
      originalWidth;

    const heightRatio =
      Math.max(
        1,
        targetHeight
      ) /
      originalHeight;

    const scale =
      Math.min(
        widthRatio,
        heightRatio
      );

    return {
      width:
        Math.max(
          1,
          Math.round(
            originalWidth *
              scale
          )
        ),

      height:
        Math.max(
          1,
          Math.round(
            originalHeight *
              scale
          )
        ),
    };
  };


  const resizeImages =
    async () => {
      if (
        images.length === 0
      ) {
        return;
      }

      try {
        setResizing(true);

        const resized:
          ImageItem[] = [];

        for (
          const item of images
        ) {
          if (
            item.resizedUrl
          ) {
            URL.revokeObjectURL(
              item.resizedUrl
            );
          }

          const image =
            await loadImage(
              item.previewUrl
            );

          const dimensions =
            getDimensions(
              image.naturalWidth,
              image.naturalHeight
            );

          const canvas =
            document.createElement(
              "canvas"
            );

          canvas.width =
            dimensions.width;

          canvas.height =
            dimensions.height;

          const context =
            canvas.getContext(
              "2d"
            );

          if (!context) {
            throw new Error(
              "Canvas unavailable."
            );
          }

          if (
            item.file.type ===
            "image/jpeg"
          ) {
            context.fillStyle =
              "#ffffff";

            context.fillRect(
              0,
              0,
              canvas.width,
              canvas.height
            );
          }

          context.imageSmoothingEnabled =
            true;

          context.imageSmoothingQuality =
            "high";

          context.drawImage(
            image,
            0,
            0,
            canvas.width,
            canvas.height
          );

          const mimeType =
            [
              "image/jpeg",
              "image/png",
              "image/webp",
            ].includes(
              item.file.type
            )
              ? item.file.type
              : "image/jpeg";

          const blob =
            await canvasToBlob(
              canvas,
              mimeType
            );

          const baseName =
            item.file.name.replace(
              /\.[^.]+$/,
              ""
            );

          const extension =
            mimeType ===
            "image/jpeg"
              ? "jpg"
              : mimeType ===
                "image/png"
              ? "png"
              : "webp";

          resized.push({
            ...item,

            resizedUrl:
              URL.createObjectURL(
                blob
              ),

            resizedWidth:
              dimensions.width,

            resizedHeight:
              dimensions.height,

            resizedSize:
              blob.size,

            resizedName:
              `resized-${baseName}.${extension}`,
          });
        }

        setImages(
          resized
        );

        setTimeout(() => {
          resultSectionRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 150);
      } catch (error) {
        console.error(
          "Resize error:",
          error
        );

        alert(
          "Unable to resize one or more images."
        );
      } finally {
        setResizing(false);
      }
    };


  const applyPreset = (
    width: number,
    height: number
  ) => {
    clearResizeResults();

    setResizeMode(
      "dimensions"
    );

    setTargetWidth(
      width
    );

    setTargetHeight(
      height
    );
  };


  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f5f3ff_0%,#f8fafc_38%,#f8fafc_100%)]">

      <section className="mx-auto max-w-[1450px] px-5 py-10">


        <div className="mx-auto max-w-4xl text-center">

          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-4 py-2 text-sm font-bold text-violet-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-violet-500" />
            Image Resize Tool
          </div>

          <h1 className="mt-5 text-4xl font-black tracking-[-0.035em] text-slate-950 md:text-6xl">
            Resize images.
            <span className="block bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
              Exactly how you need.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
            Change image dimensions while preserving quality and aspect ratio directly in your browser.
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

              <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-[0_12px_28px_rgba(124,58,237,0.30)]">
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

          <div className="mx-auto mt-10 max-w-7xl rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)]">


            <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex flex-1 items-center justify-center gap-3 text-center">

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                  <ImageIcon size={21} />
                </div>

                <div>
                  <p className="font-black text-slate-950">
                    {images.length}{" "}
                    {images.length === 1
                      ? "image selected"
                      : "images selected"}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Choose your resize settings below.
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
                    <Maximize2 size={19} />
                  </div>

                  <div>
                    <p className="font-black text-slate-950">
                      Resize settings
                    </p>

                    <p className="text-sm text-slate-500">
                      Set dimensions or resize by percentage.
                    </p>
                  </div>

                </div>

              </div>


              <div className="p-5">

                <div className="grid gap-3 sm:grid-cols-2">

                  <button
                    type="button"
                    onClick={() => {
                      clearResizeResults();

                      setResizeMode(
                        "dimensions"
                      );
                    }}
                    className={`rounded-2xl border px-5 py-4 text-center transition-all ${
                      resizeMode ===
                      "dimensions"
                        ? "border-violet-600 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md"
                        : "border-slate-200 bg-white text-slate-700 hover:border-violet-300"
                    }`}
                  >
                    <p className="font-black">
                      Dimensions
                    </p>

                    <p
                      className={`mt-1 text-xs ${
                        resizeMode ===
                        "dimensions"
                          ? "text-violet-100"
                          : "text-slate-500"
                      }`}
                    >
                      Resize using width and height.
                    </p>
                  </button>


                  <button
                    type="button"
                    onClick={() => {
                      clearResizeResults();

                      setResizeMode(
                        "percentage"
                      );
                    }}
                    className={`rounded-2xl border px-5 py-4 text-center transition-all ${
                      resizeMode ===
                      "percentage"
                        ? "border-violet-600 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md"
                        : "border-slate-200 bg-white text-slate-700 hover:border-violet-300"
                    }`}
                  >
                    <p className="font-black">
                      Percentage
                    </p>

                    <p
                      className={`mt-1 text-xs ${
                        resizeMode ===
                        "percentage"
                          ? "text-violet-100"
                          : "text-slate-500"
                      }`}
                    >
                      Scale every image proportionally.
                    </p>
                  </button>

                </div>


                {resizeMode ===
                "dimensions" ? (

                  <div className="mt-5">


                    <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">

                      <div>

                        <label className="block text-center text-sm font-black text-slate-800">
                          Width
                        </label>

                        <div className="mt-2 flex overflow-hidden rounded-xl border border-slate-200 bg-white">

                          <input
                            type="number"
                            min="1"
                            max="20000"
                            value={
                              targetWidth
                            }
                            onChange={(event) => {
                              clearResizeResults();

                              setTargetWidth(
                                Math.max(
                                  1,
                                  Number(
                                    event.target.value
                                  ) || 1
                                )
                              );
                            }}
                            className="w-full px-4 py-3 text-center text-sm font-black text-slate-900 outline-none"
                          />

                          <span className="border-l border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-violet-700">
                            PX
                          </span>

                        </div>

                      </div>


                      <button
                        type="button"
                        onClick={() => {
                          clearResizeResults();

                          setPreserveAspect(
                            (current) =>
                              !current
                          );
                        }}
                        className={`flex h-12 w-12 items-center justify-center rounded-xl border transition ${
                          preserveAspect
                            ? "border-violet-200 bg-violet-50 text-violet-700"
                            : "border-slate-200 bg-white text-slate-500"
                        }`}
                        title={
                          preserveAspect
                            ? "Aspect ratio preserved"
                            : "Exact dimensions"
                        }
                      >
                        {preserveAspect ? (
                          <Lock size={18} />
                        ) : (
                          <Unlock size={18} />
                        )}
                      </button>


                      <div>

                        <label className="block text-center text-sm font-black text-slate-800">
                          Height
                        </label>

                        <div className="mt-2 flex overflow-hidden rounded-xl border border-slate-200 bg-white">

                          <input
                            type="number"
                            min="1"
                            max="20000"
                            value={
                              targetHeight
                            }
                            onChange={(event) => {
                              clearResizeResults();

                              setTargetHeight(
                                Math.max(
                                  1,
                                  Number(
                                    event.target.value
                                  ) || 1
                                )
                              );
                            }}
                            className="w-full px-4 py-3 text-center text-sm font-black text-slate-900 outline-none"
                          />

                          <span className="border-l border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-violet-700">
                            PX
                          </span>

                        </div>

                      </div>

                    </div>


                    <p className="mt-3 text-center text-xs text-slate-500">
                      {preserveAspect
                        ? "Images will fit inside these dimensions without distortion."
                        : "Images will be resized to the exact width and height."}
                    </p>


                    <div className="mt-1">

                      <p className="text-center text-sm font-black text-slate-800">
                        Quick presets
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">

                        {[
                          [
                            800,
                            800,
                            "800 x 800",
                          ],
                          [
                            1080,
                            1080,
                            "1080 x 1080",
                          ],
                          [
                            1920,
                            1080,
                            "1920 x 1080",
                          ],
                          [
                            1080,
                            1350,
                            "1080 x 1350",
                          ],
                        ].map(
                          ([
                            width,
                            height,
                            label,
                          ]) => (
                            <button
                              key={label}
                              type="button"
                              onClick={() =>
                                applyPreset(
                                  Number(
                                    width
                                  ),
                                  Number(
                                    height
                                  )
                                )
                              }
                              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-700"
                            >
                              {label}
                            </button>
                          )
                        )}

                      </div>

                    </div>

                  </div>

                ) : (

                  <div className="mt-5">

                    <div className="flex items-center justify-between gap-4">

                      <div>
                        <p className="text-sm font-black text-slate-800">
                          Resize percentage
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Scale width and height proportionally.
                        </p>
                      </div>

                      <span className="rounded-xl bg-violet-100 px-4 py-2 text-sm font-black text-violet-700">
                        {percentage}%
                      </span>

                    </div>


                    <input
                      type="range"
                      min="10"
                      max="200"
                      step="5"
                      value={
                        percentage
                      }
                      onChange={(event) => {
                        clearResizeResults();

                        setPercentage(
                          Number(
                            event.target.value
                          )
                        );
                      }}
                      className="mt-6 w-full accent-violet-600"
                    />


                    <div className="mt-4 grid grid-cols-4 gap-3">

                      {[
                        25,
                        50,
                        75,
                        100,
                      ].map(
                        (value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => {
                              clearResizeResults();

                              setPercentage(
                                value
                              );
                            }}
                            className={`rounded-xl border px-3 py-3 text-sm font-black transition ${
                              percentage ===
                              value
                                ? "border-violet-600 bg-violet-600 text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:border-violet-300"
                            }`}
                          >
                            {value}%
                          </button>
                        )
                      )}

                    </div>

                  </div>

                )}

              </div>

            </div>


            <div
              ref={resultSectionRef}
              className="mt-7 flex flex-wrap justify-center gap-5"
            >

              {images.map(
                (item) => (
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

                      <div className="mt-3 space-y-2 text-xs">

                        <div className="flex justify-between text-slate-500">
                          <span>
                            Original
                          </span>

                          <span className="font-bold text-slate-700">
                            {item.width} x{" "}
                            {item.height}
                          </span>
                        </div>

                        <div className="flex justify-between text-slate-500">
                          <span>
                            File size
                          </span>

                          <span>
                            {formatSize(
                              item.file.size
                            )}
                          </span>
                        </div>

                      </div>


                      {item.resizedUrl &&
                        item.resizedWidth !==
                          undefined &&
                        item.resizedHeight !==
                          undefined &&
                        item.resizedSize !==
                          undefined && (

                          <div className="mt-4 border-t border-slate-100 pt-4">

                            <div className="flex justify-between text-xs">
                              <span className="font-bold text-emerald-700">
                                Resized
                              </span>

                              <span className="font-black text-slate-700">
                                {item.resizedWidth} x{" "}
                                {item.resizedHeight}
                              </span>
                            </div>

                            <div className="mt-2 flex justify-between text-xs text-slate-500">
                              <span>
                                New size
                              </span>

                              <span>
                                {formatSize(
                                  item.resizedSize
                                )}
                              </span>
                            </div>


                            <a
                              href={
                                item.resizedUrl
                              }
                              download={
                                item.resizedName
                              }
                              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700"
                            >
                              <Download size={16} />
                              Download
                            </a>

                          </div>

                        )}

                    </div>

                  </div>
                )
              )}

            </div>


            <div className="sticky bottom-4 z-40 mt-7 rounded-[24px] border border-violet-100 bg-white/95 px-5 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.12)] backdrop-blur-xl">

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex-1 text-center">

                  <p className="font-bold text-slate-950">
                    Ready to resize
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {resizeMode ===
                    "dimensions"
                      ? preserveAspect
                        ? `Fit ${images.length} ${
                            images.length ===
                            1
                              ? "image"
                              : "images"
                          } within ${targetWidth} x ${targetHeight} px.`
                        : `Resize ${images.length} ${
                            images.length ===
                            1
                              ? "image"
                              : "images"
                          } to ${targetWidth} x ${targetHeight} px.`
                      : `Resize ${images.length} ${
                          images.length ===
                          1
                            ? "image"
                            : "images"
                        } to ${percentage}%.`}
                  </p>

                </div>


                <button
                  type="button"
                  onClick={
                    resizeImages
                  }
                  disabled={
                    resizing
                  }
                  className="min-w-[230px] rounded-2xl bg-gradient-to-r from-violet-500 via-violet-600 to-indigo-600 px-7 py-4 text-sm font-bold text-white shadow-[0_14px_35px_rgba(124,58,237,0.30)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resizing
                    ? "Resizing..."
                    : "Resize images"}
                </button>

              </div>

            </div>

          </div>

        )}

      </section>

    </main>
  );
}
