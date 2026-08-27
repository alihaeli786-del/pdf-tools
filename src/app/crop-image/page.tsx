"use client";

import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import {
  Crop,
  Download,
  ImageIcon,
  Upload,
  X,
} from "lucide-react";

type AspectPreset =
  | "free"
  | "1:1"
  | "4:3"
  | "16:9"
  | "3:2";

type OutputFormat =
  | "image/jpeg"
  | "image/png"
  | "image/webp";

type ResizeHandle =
  | "n"
  | "s"
  | "e"
  | "w"
  | "nw"
  | "ne"
  | "sw"
  | "se";

export default function CropImagePage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [resultUrl, setResultUrl] = useState("");

  const [imageWidth, setImageWidth] = useState(0);
  const [imageHeight, setImageHeight] = useState(0);

  const [cropX, setCropX] = useState(10);
  const [cropY, setCropY] = useState(10);
  const [cropWidth, setCropWidth] = useState(80);
  const [cropHeight, setCropHeight] = useState(80);

  const [aspectPreset, setAspectPreset] =
    useState<AspectPreset>("free");

  const [outputFormat, setOutputFormat] =
    useState<OutputFormat>("image/png");

  const [cropping, setCropping] =
    useState(false);

  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    cropX: number;
    cropY: number;
  } | null>(null);

  const resizeStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    cropX: number;
    cropY: number;
    cropWidth: number;
    cropHeight: number;
    handle: ResizeHandle;
  } | null>(null);

  const loadFile = (selectedFile: File) => {
    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(selectedFile.type)
    ) {
      alert("Please choose a JPG, PNG or WebP image.");
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
      setResultUrl("");
    }

    const url =
      URL.createObjectURL(selectedFile);

    const image = new Image();

    image.onload = () => {
      setFile(selectedFile);
      setPreviewUrl(url);

      setImageWidth(
        image.naturalWidth
      );

      setImageHeight(
        image.naturalHeight
      );

      setCropX(10);
      setCropY(10);
      setCropWidth(80);
      setCropHeight(80);
      setAspectPreset("free");
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);

      alert(
        "Unable to open this image."
      );
    };

    image.src = url;
  };

  const clearImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
    }

    setFile(null);
    setPreviewUrl("");
    setResultUrl("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const applyAspect = (
    preset: AspectPreset
  ) => {
    setAspectPreset(preset);

    if (preset === "free") {
      return;
    }

    const ratios: Record<
      Exclude<AspectPreset, "free">,
      number
    > = {
      "1:1": 1,
      "4:3": 4 / 3,
      "16:9": 16 / 9,
      "3:2": 3 / 2,
    };

    const ratio = ratios[preset];

    let width = 80;
    let height =
      width *
      (imageWidth / imageHeight) /
      ratio;

    if (height > 80) {
      height = 80;

      width =
        height *
        (imageHeight / imageWidth) *
        ratio;
    }

    setCropWidth(
      Math.max(
        5,
        Math.min(100, width)
      )
    );

    setCropHeight(
      Math.max(
        5,
        Math.min(100, height)
      )
    );

    setCropX(
      Math.max(
        0,
        (100 - width) / 2
      )
    );

    setCropY(
      Math.max(
        0,
        (100 - height) / 2
      )
    );
  };

  const startDragging = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (!imageRef.current) {
      return;
    }

    event.preventDefault();

    dragStartRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      cropX,
      cropY,
    };

    event.currentTarget.setPointerCapture(
      event.pointerId
    );
  };

  const moveDragging = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    const start =
      dragStartRef.current;

    const imageElement =
      imageRef.current;

    if (
      !start ||
      !imageElement
    ) {
      return;
    }

    const rect =
      imageElement.getBoundingClientRect();

    const deltaX =
      ((event.clientX -
        start.pointerX) /
        rect.width) *
      100;

    const deltaY =
      ((event.clientY -
        start.pointerY) /
        rect.height) *
      100;

    const nextX =
      Math.max(
        0,
        Math.min(
          100 - cropWidth,
          start.cropX + deltaX
        )
      );

    const nextY =
      Math.max(
        0,
        Math.min(
          100 - cropHeight,
          start.cropY + deltaY
        )
      );

    setCropX(nextX);
    setCropY(nextY);
  };

  const stopDragging = () => {
    dragStartRef.current = null;
  };

  const startResizing = (
    event: ReactPointerEvent<HTMLButtonElement>,
    handle: ResizeHandle
  ) => {
    event.preventDefault();
    event.stopPropagation();

    resizeStartRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      handle,
    };

    event.currentTarget.setPointerCapture(
      event.pointerId
    );

    setAspectPreset("free");
  };

  const moveResizing = (
    event: ReactPointerEvent<HTMLButtonElement>
  ) => {
    const start =
      resizeStartRef.current;

    const imageElement =
      imageRef.current;

    if (
      !start ||
      !imageElement
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const rect =
      imageElement.getBoundingClientRect();

    const deltaX =
      ((event.clientX -
        start.pointerX) /
        rect.width) *
      100;

    const deltaY =
      ((event.clientY -
        start.pointerY) /
        rect.height) *
      100;

    const minimumSize = 5;

    let nextX =
      start.cropX;

    let nextY =
      start.cropY;

    let nextWidth =
      start.cropWidth;

    let nextHeight =
      start.cropHeight;

    const rightEdge =
      start.cropX +
      start.cropWidth;

    const bottomEdge =
      start.cropY +
      start.cropHeight;

    if (
      start.handle.includes("e")
    ) {
      nextWidth =
        Math.max(
          minimumSize,
          Math.min(
            100 -
              start.cropX,
            start.cropWidth +
              deltaX
          )
        );
    }

    if (
      start.handle.includes("w")
    ) {
      nextX =
        Math.max(
          0,
          Math.min(
            rightEdge -
              minimumSize,
            start.cropX +
              deltaX
          )
        );

      nextWidth =
        rightEdge -
        nextX;
    }

    if (
      start.handle.includes("s")
    ) {
      nextHeight =
        Math.max(
          minimumSize,
          Math.min(
            100 -
              start.cropY,
            start.cropHeight +
              deltaY
          )
        );
    }

    if (
      start.handle.includes("n")
    ) {
      nextY =
        Math.max(
          0,
          Math.min(
            bottomEdge -
              minimumSize,
            start.cropY +
              deltaY
          )
        );

      nextHeight =
        bottomEdge -
        nextY;
    }

    setCropX(nextX);
    setCropY(nextY);
    setCropWidth(nextWidth);
    setCropHeight(nextHeight);
  };

  const stopResizing = () => {
    resizeStartRef.current =
      null;
  };

  const updateCropPixelWidth = (
    value: number
  ) => {
    if (!imageWidth) {
      return;
    }

    const percentage =
      (Math.max(1, value) /
        imageWidth) *
      100;

    const nextWidth =
      Math.min(
        100 - cropX,
        Math.max(2, percentage)
      );

    setCropWidth(nextWidth);
    setAspectPreset("free");
  };

  const updateCropPixelHeight = (
    value: number
  ) => {
    if (!imageHeight) {
      return;
    }

    const percentage =
      (Math.max(1, value) /
        imageHeight) *
      100;

    const nextHeight =
      Math.min(
        100 - cropY,
        Math.max(2, percentage)
      );

    setCropHeight(nextHeight);
    setAspectPreset("free");
  };

  const cropImage = async () => {
    if (
      !previewUrl ||
      !imageRef.current
    ) {
      return;
    }

    try {
      setCropping(true);

      if (resultUrl) {
        URL.revokeObjectURL(
          resultUrl
        );
      }

      const image =
        new Image();

      image.src = previewUrl;

      await new Promise<void>(
        (resolve, reject) => {
          image.onload = () =>
            resolve();

          image.onerror = () =>
            reject(
              new Error(
                "Unable to load image."
              )
            );
        }
      );

      const sourceX =
        Math.round(
          (cropX / 100) *
            image.naturalWidth
        );

      const sourceY =
        Math.round(
          (cropY / 100) *
            image.naturalHeight
        );

      const sourceWidth =
        Math.max(
          1,
          Math.round(
            (cropWidth / 100) *
              image.naturalWidth
          )
        );

      const sourceHeight =
        Math.max(
          1,
          Math.round(
            (cropHeight / 100) *
              image.naturalHeight
          )
        );

      const canvas =
        document.createElement(
          "canvas"
        );

      canvas.width = sourceWidth;
      canvas.height = sourceHeight;

      const context =
        canvas.getContext("2d");

      if (!context) {
        throw new Error(
          "Canvas unavailable."
        );
      }

      if (
        outputFormat ===
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
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        sourceWidth,
        sourceHeight
      );

      const blob =
        await new Promise<Blob>(
          (resolve, reject) => {
            canvas.toBlob(
              (createdBlob) => {
                if (
                  !createdBlob
                ) {
                  reject(
                    new Error(
                      "Unable to create crop."
                    )
                  );
                  return;
                }

                resolve(
                  createdBlob
                );
              },
              outputFormat,
              outputFormat ===
                "image/png"
                ? undefined
                : 0.94
            );
          }
        );

      setResultUrl(
        URL.createObjectURL(blob)
      );

      setTimeout(() => {
        document
          .getElementById(
            "crop-result"
          )
          ?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
      }, 150);
    } catch (error) {
      console.error(
        "Crop error:",
        error
      );

      alert(
        "Unable to crop this image."
      );
    } finally {
      setCropping(false);
    }
  };

  const cropPixelWidth =
    Math.max(
      1,
      Math.round(
        (cropWidth / 100) *
          imageWidth
      )
    );

  const cropPixelHeight =
    Math.max(
      1,
      Math.round(
        (cropHeight / 100) *
          imageHeight
      )
    );

  const resultExtension =
    outputFormat ===
    "image/jpeg"
      ? "jpg"
      : outputFormat ===
        "image/webp"
      ? "webp"
      : "png";

  const baseName =
    file?.name.replace(
      /\.[^.]+$/,
      ""
    ) || "image";

  return (
    <main className="min-h-screen overflow-x-clip bg-[radial-gradient(circle_at_top,#f5f3ff_0%,#f8fafc_38%,#f8fafc_100%)]">

      <section className="mx-auto max-w-[1450px] px-5 py-10">

        <div className="mx-auto max-w-4xl text-center">

          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-4 py-2 text-sm font-bold text-violet-700 shadow-sm">
            <Crop size={16} />
            Image Crop Tool
          </div>

          <h1 className="mt-5 text-4xl font-black tracking-[-0.035em] text-slate-950 md:text-6xl">
            Crop your images.
            <span className="block bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
              Keep exactly what you need.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
            Select the exact area you want and export your cropped image directly in your browser.
          </p>

        </div>


        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => {
            const selectedFile =
              event.target.files?.[0];

            if (selectedFile) {
              loadFile(
                selectedFile
              );
            }

            event.target.value =
              "";
          }}
        />


        {!file ? (

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

                const dropped =
                  event.dataTransfer.files?.[0];

                if (dropped) {
                  loadFile(dropped);
                }
              }}
              className="group flex min-h-[320px] w-full flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-violet-200 bg-[linear-gradient(135deg,#faf5ff_0%,#ffffff_48%,#eff6ff_100%)] px-6 transition-all duration-300 hover:-translate-y-1 hover:border-violet-500 hover:shadow-[0_20px_60px_rgba(124,58,237,0.12)]"
            >

              <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-[0_12px_28px_rgba(124,58,237,0.30)]">
                <Upload size={27} />
              </div>

              <span className="mt-6 text-xl font-black text-slate-950">
                Choose an image
              </span>

              <span className="mt-2 text-sm text-slate-500">
                or drag and drop it here
              </span>

              <span className="mt-5 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-500 shadow-sm">
                JPG, PNG and WebP
              </span>

            </button>

          </div>

        ) : (

          <div className="mx-auto mt-10 max-w-7xl">

            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_20px_70px_rgba(15,23,42,0.08)] md:p-6">


              <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex min-w-0 items-center gap-3">

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                    <ImageIcon size={21} />
                  </div>

                  <div className="min-w-0">

                    <p className="truncate font-black text-slate-950">
                      {file.name}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {imageWidth} x {imageHeight} px
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
                    Change image
                  </button>

                  <button
                    type="button"
                    onClick={clearImage}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    <X size={18} />
                  </button>

                </div>

              </div>


              <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">


                {/* Crop Preview */}
                <div className="rounded-[26px] border border-slate-200 bg-slate-950 p-4">

                  <div className="flex min-h-[420px] items-center justify-center overflow-hidden rounded-[20px] bg-slate-900">

                    <div className="relative inline-block max-h-[650px] max-w-full">

                      <img
                        ref={imageRef}
                        src={previewUrl}
                        alt="Crop preview"
                        draggable={false}
                        className="block max-h-[650px] max-w-full select-none object-contain"
                      />


                      <div className="pointer-events-none absolute inset-0 bg-black/35" />


                      <div
                        onPointerDown={
                          startDragging
                        }
                        onPointerMove={
                          moveDragging
                        }
                        onPointerUp={
                          stopDragging
                        }
                        onPointerCancel={
                          stopDragging
                        }
                        className="absolute cursor-move touch-none overflow-hidden border-2 border-white shadow-[0_0_0_1px_rgba(124,58,237,0.9),0_8px_30px_rgba(0,0,0,0.30)]"
                        style={{
                          left: `${cropX}%`,
                          top: `${cropY}%`,
                          width: `${cropWidth}%`,
                          height: `${cropHeight}%`,
                        }}
                      >

                        <img
                          src={previewUrl}
                          alt=""
                          draggable={false}
                          className="pointer-events-none absolute max-w-none select-none"
                          style={{
                            width: `${10000 / cropWidth}%`,
                            height: `${10000 / cropHeight}%`,
                            left: `${-(cropX / cropWidth) * 100}%`,
                            top: `${-(cropY / cropHeight) * 100}%`,
                          }}
                        />

                        <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/40" />

                        <div className="pointer-events-none absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/40" />

                        <span className="pointer-events-none absolute left-2 top-2 rounded-lg bg-slate-950/80 px-2.5 py-1 text-[11px] font-bold text-white">
                          {cropPixelWidth} x {cropPixelHeight}
                        </span>


                        {/* Resize Handles */}

                        <button
                          type="button"
                          aria-label="Resize top left"
                          onPointerDown={(event) =>
                            startResizing(event, "nw")
                          }
                          onPointerMove={moveResizing}
                          onPointerUp={stopResizing}
                          onPointerCancel={stopResizing}
                          className="absolute left-1 top-1 z-30 h-4 w-4 cursor-nwse-resize rounded-full border-2 border-violet-600 bg-white shadow-md"
                        />

                        <button
                          type="button"
                          aria-label="Resize top"
                          onPointerDown={(event) =>
                            startResizing(event, "n")
                          }
                          onPointerMove={moveResizing}
                          onPointerUp={stopResizing}
                          onPointerCancel={stopResizing}
                          className="absolute left-1/2 top-1 z-30 h-4 w-4 -translate-x-1/2 cursor-ns-resize rounded-full border-2 border-violet-600 bg-white shadow-md"
                        />

                        <button
                          type="button"
                          aria-label="Resize top right"
                          onPointerDown={(event) =>
                            startResizing(event, "ne")
                          }
                          onPointerMove={moveResizing}
                          onPointerUp={stopResizing}
                          onPointerCancel={stopResizing}
                          className="absolute right-1 top-1 z-30 h-4 w-4 cursor-nesw-resize rounded-full border-2 border-violet-600 bg-white shadow-md"
                        />

                        <button
                          type="button"
                          aria-label="Resize right"
                          onPointerDown={(event) =>
                            startResizing(event, "e")
                          }
                          onPointerMove={moveResizing}
                          onPointerUp={stopResizing}
                          onPointerCancel={stopResizing}
                          className="absolute right-1 top-1/2 z-30 h-4 w-4 -translate-y-1/2 cursor-ew-resize rounded-full border-2 border-violet-600 bg-white shadow-md"
                        />

                        <button
                          type="button"
                          aria-label="Resize bottom right"
                          onPointerDown={(event) =>
                            startResizing(event, "se")
                          }
                          onPointerMove={moveResizing}
                          onPointerUp={stopResizing}
                          onPointerCancel={stopResizing}
                          className="absolute bottom-1 right-1 z-30 h-4 w-4 cursor-nwse-resize rounded-full border-2 border-violet-600 bg-white shadow-md"
                        />

                        <button
                          type="button"
                          aria-label="Resize bottom"
                          onPointerDown={(event) =>
                            startResizing(event, "s")
                          }
                          onPointerMove={moveResizing}
                          onPointerUp={stopResizing}
                          onPointerCancel={stopResizing}
                          className="absolute bottom-1 left-1/2 z-30 h-4 w-4 -translate-x-1/2 cursor-ns-resize rounded-full border-2 border-violet-600 bg-white shadow-md"
                        />

                        <button
                          type="button"
                          aria-label="Resize bottom left"
                          onPointerDown={(event) =>
                            startResizing(event, "sw")
                          }
                          onPointerMove={moveResizing}
                          onPointerUp={stopResizing}
                          onPointerCancel={stopResizing}
                          className="absolute bottom-1 left-1 z-30 h-4 w-4 cursor-nesw-resize rounded-full border-2 border-violet-600 bg-white shadow-md"
                        />

                        <button
                          type="button"
                          aria-label="Resize left"
                          onPointerDown={(event) =>
                            startResizing(event, "w")
                          }
                          onPointerMove={moveResizing}
                          onPointerUp={stopResizing}
                          onPointerCancel={stopResizing}
                          className="absolute left-1 top-1/2 z-30 h-4 w-4 -translate-y-1/2 cursor-ew-resize rounded-full border-2 border-violet-600 bg-white shadow-md"
                        />

                      </div>

                    </div>

                  </div>

                  <p className="mt-3 text-center text-xs text-slate-400">
                    Drag the selected area to position your crop.
                  </p>

                </div>


                {/* Settings */}
                <div className="space-y-4">


                  <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">

                    <p className="text-center text-sm font-black text-slate-900">
                      Aspect ratio
                    </p>

                    <div className="mt-4 grid grid-cols-3 gap-2">

                      {[
                        "free",
                        "1:1",
                        "4:3",
                        "16:9",
                        "3:2",
                      ].map(
                        (preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() =>
                              applyAspect(
                                preset as AspectPreset
                              )
                            }
                            className={`rounded-xl border px-3 py-2.5 text-xs font-black transition ${
                              aspectPreset === preset
                                ? "border-violet-600 bg-gradient-to-r from-violet-600 to-blue-600 text-white"
                                : "border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700"
                            }`}
                          >
                            {preset ===
                            "free"
                              ? "Free"
                              : preset}
                          </button>
                        )
                      )}

                    </div>

                  </div>


                  <div className="rounded-[24px] border border-slate-200 bg-white p-5">

                    <p className="text-center text-sm font-black text-slate-900">
                      Crop size
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-3">

                      <div>

                        <label className="block text-center text-xs font-bold text-slate-500">
                          Width
                        </label>

                        <div className="mt-2 flex overflow-hidden rounded-xl border border-slate-200">

                          <input
                            type="number"
                            min="1"
                            max={
                              imageWidth
                            }
                            value={
                              cropPixelWidth
                            }
                            onChange={(event) =>
                              updateCropPixelWidth(
                                Number(
                                  event.target.value
                                )
                              )
                            }
                            className="min-w-0 flex-1 px-3 py-3 text-center text-sm font-black text-slate-900 outline-none"
                          />

                          <span className="border-l border-slate-200 bg-slate-50 px-3 py-3 text-xs font-bold text-slate-500">
                            PX
                          </span>

                        </div>

                      </div>


                      <div>

                        <label className="block text-center text-xs font-bold text-slate-500">
                          Height
                        </label>

                        <div className="mt-2 flex overflow-hidden rounded-xl border border-slate-200">

                          <input
                            type="number"
                            min="1"
                            max={
                              imageHeight
                            }
                            value={
                              cropPixelHeight
                            }
                            onChange={(event) =>
                              updateCropPixelHeight(
                                Number(
                                  event.target.value
                                )
                              )
                            }
                            className="min-w-0 flex-1 px-3 py-3 text-center text-sm font-black text-slate-900 outline-none"
                          />

                          <span className="border-l border-slate-200 bg-slate-50 px-3 py-3 text-xs font-bold text-slate-500">
                            PX
                          </span>

                        </div>

                      </div>

                    </div>

                  </div>


                  <div className="rounded-[24px] border border-slate-200 bg-white p-5">

                    <p className="text-center text-sm font-black text-slate-900">
                      Output format
                    </p>

                    <div className="mt-4 grid grid-cols-3 gap-2">

                      {[
                        [
                          "image/png",
                          "PNG",
                        ],
                        [
                          "image/jpeg",
                          "JPG",
                        ],
                        [
                          "image/webp",
                          "WebP",
                        ],
                      ].map(
                        ([
                          mime,
                          label,
                        ]) => (
                          <button
                            key={mime}
                            type="button"
                            onClick={() =>
                              setOutputFormat(
                                mime as OutputFormat
                              )
                            }
                            className={`rounded-xl border px-3 py-2.5 text-xs font-black transition ${
                              outputFormat ===
                              mime
                                ? "border-violet-600 bg-violet-600 text-white"
                                : "border-slate-200 bg-white text-slate-600 hover:border-violet-300"
                            }`}
                          >
                            {label}
                          </button>
                        )
                      )}

                    </div>

                  </div>


                  <button
                    type="button"
                    onClick={
                      cropImage
                    }
                    disabled={
                      cropping
                    }
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-4 text-sm font-black text-white shadow-[0_14px_35px_rgba(124,58,237,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Crop size={18} />

                    {cropping
                      ? "Cropping..."
                      : "Crop image"}
                  </button>

                </div>

              </div>


              {resultUrl && (

                <div
                  id="crop-result"
                  className="mt-7 rounded-[26px] border border-emerald-200 bg-emerald-50/50 p-5"
                >

                  <div className="grid items-center gap-5 md:grid-cols-[180px_1fr_auto]">

                    <div className="flex h-36 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">

                      <img
                        src={
                          resultUrl
                        }
                        alt="Cropped result"
                        className="max-h-full max-w-full object-contain"
                      />

                    </div>


                    <div className="text-center md:text-left">

                      <p className="font-black text-slate-950">
                        Your cropped image is ready
                      </p>

                      <p className="mt-2 text-sm text-slate-600">
                        {cropPixelWidth} x {cropPixelHeight} px
                      </p>

                      <p className="mt-1 text-xs font-bold text-emerald-700">
                        {resultExtension.toUpperCase()} output
                      </p>

                    </div>


                    <a
                      href={
                        resultUrl
                      }
                      download={`cropped-${baseName}.${resultExtension}`}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-3.5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5"
                    >
                      <Download size={17} />
                      Download
                    </a>

                  </div>

                </div>

              )}

            </div>

          </div>

        )}

      </section>

    </main>
  );
}
