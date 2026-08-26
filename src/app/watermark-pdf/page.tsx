"use client";

import { useRef, useState } from "react";
import {
  PDFDocument,
  StandardFonts,
  degrees,
  rgb,
} from "pdf-lib";
import {
  FileText,
  Upload,
  X,
  Type,
  RotateCw,
  Droplets,
  MapPin,
  Download,
  Image as ImageIcon,
} from "lucide-react";

type WatermarkPosition =
  | "center"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

type WatermarkMode = "text" | "image";

export default function WatermarkPdfPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [watermarkMode, setWatermarkMode] =
    useState<WatermarkMode>("text");

  const [watermarkText, setWatermarkText] =
    useState("CONFIDENTIAL");

  const [fontSize, setFontSize] = useState(48);
  const [opacity, setOpacity] = useState(25);
  const [rotation, setRotation] = useState(-45);

  const [position, setPosition] =
    useState<WatermarkPosition>("center");

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] =
    useState<string | null>(null);

  const [logoSize, setLogoSize] = useState(25);

  const [processing, setProcessing] = useState(false);

  const [downloadUrl, setDownloadUrl] =
    useState<string | null>(null);

  const clearResult = () => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }

    setDownloadUrl(null);
  };

  const createPdfPreview = async (selectedFile: File) => {
    const pdfjsLib = await import("pdfjs-dist");

    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "/pdf.worker.min.mjs";

    const arrayBuffer = await selectedFile.arrayBuffer();

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
    });

    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({
      scale: 1.3,
    });

    const canvas = document.createElement("canvas");
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

    return canvas.toDataURL("image/jpeg", 0.92);
  };

  const loadPdf = async (selectedFile: File) => {
    try {
      setLoading(true);
      clearResult();

      const bytes = await selectedFile.arrayBuffer();
      const pdf = await PDFDocument.load(bytes);

      const preview = await createPdfPreview(selectedFile);

      setFile(selectedFile);
      setPageCount(pdf.getPageCount());
      setPreviewUrl(preview);
    } catch (error) {
      console.error("PDF load error:", error);
      alert("Unable to open this PDF.");
    } finally {
      setLoading(false);
    }
  };

  const handleFile = (selectedFile?: File) => {
    if (!selectedFile) return;

    if (selectedFile.type !== "application/pdf") {
      alert("Please choose a PDF file.");
      return;
    }

    loadPdf(selectedFile);
  };

  const handleLogoFile = (selectedFile?: File) => {
    if (!selectedFile) return;

    if (
      selectedFile.type !== "image/png" &&
      selectedFile.type !== "image/jpeg"
    ) {
      alert("Please choose a PNG, JPG or JPEG image.");
      return;
    }

    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl);
    }

    setLogoFile(selectedFile);
    setLogoPreviewUrl(URL.createObjectURL(selectedFile));
    clearResult();
  };

  const removeLogo = () => {
    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl);
    }

    setLogoFile(null);
    setLogoPreviewUrl(null);

    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }

    clearResult();
  };

  const resetTool = () => {
    clearResult();

    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl);
    }

    setFile(null);
    setPageCount(0);
    setPreviewUrl(null);

    setLogoFile(null);
    setLogoPreviewUrl(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }

    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
  };

  const getDesiredCenter = (
    pageWidth: number,
    pageHeight: number,
    itemWidth: number,
    itemHeight: number
  ) => {
    const margin = 42;

    if (position === "top-left") {
      return {
        cx: margin + itemWidth / 2,
        cy: pageHeight - margin - itemHeight / 2,
      };
    }

    if (position === "top-right") {
      return {
        cx: pageWidth - margin - itemWidth / 2,
        cy: pageHeight - margin - itemHeight / 2,
      };
    }

    if (position === "bottom-left") {
      return {
        cx: margin + itemWidth / 2,
        cy: margin + itemHeight / 2,
      };
    }

    if (position === "bottom-right") {
      return {
        cx: pageWidth - margin - itemWidth / 2,
        cy: margin + itemHeight / 2,
      };
    }

    return {
      cx: pageWidth / 2,
      cy: pageHeight / 2,
    };
  };

  const getRotatedOrigin = (
    cx: number,
    cy: number,
    itemWidth: number,
    itemHeight: number
  ) => {
    const angle = (rotation * Math.PI) / 180;

    const rotatedCenterX =
      Math.cos(angle) * (itemWidth / 2) -
      Math.sin(angle) * (itemHeight / 2);

    const rotatedCenterY =
      Math.sin(angle) * (itemWidth / 2) +
      Math.cos(angle) * (itemHeight / 2);

    return {
      x: cx - rotatedCenterX,
      y: cy - rotatedCenterY,
    };
  };

  const applyWatermark = async () => {
    if (!file) return;

    if (
      watermarkMode === "text" &&
      !watermarkText.trim()
    ) {
      alert("Please enter watermark text.");
      return;
    }

    if (watermarkMode === "image" && !logoFile) {
      alert("Please choose a logo or image first.");
      return;
    }

    try {
      setProcessing(true);
      clearResult();

      const bytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(bytes);

      if (watermarkMode === "text") {
        const text = watermarkText.trim();

        const font = await pdf.embedFont(
          StandardFonts.HelveticaBold
        );

        for (const page of pdf.getPages()) {
          const { width, height } = page.getSize();

          const textWidth =
            font.widthOfTextAtSize(text, fontSize);

          const textHeight = fontSize;

          const { cx, cy } = getDesiredCenter(
            width,
            height,
            textWidth,
            textHeight
          );

          const { x, y } = getRotatedOrigin(
            cx,
            cy,
            textWidth,
            textHeight
          );

          page.drawText(text, {
            x,
            y,
            size: fontSize,
            font,
            color: rgb(0.15, 0.23, 0.35),
            opacity: opacity / 100,
            rotate: degrees(rotation),
          });
        }
      } else if (logoFile) {
        const imageBytes = await logoFile.arrayBuffer();

        const embeddedImage =
          logoFile.type === "image/png"
            ? await pdf.embedPng(imageBytes)
            : await pdf.embedJpg(imageBytes);

        for (const page of pdf.getPages()) {
          const { width, height } = page.getSize();

          const imageWidth =
            width * (logoSize / 100);

          const imageHeight =
            imageWidth *
            (embeddedImage.height / embeddedImage.width);

          const { cx, cy } = getDesiredCenter(
            width,
            height,
            imageWidth,
            imageHeight
          );

          const { x, y } = getRotatedOrigin(
            cx,
            cy,
            imageWidth,
            imageHeight
          );

          page.drawImage(embeddedImage, {
            x,
            y,
            width: imageWidth,
            height: imageHeight,
            opacity: opacity / 100,
            rotate: degrees(rotation),
          });
        }
      }

      const resultBytes = await pdf.save();

      const outputBuffer =
        new ArrayBuffer(resultBytes.byteLength);

      new Uint8Array(outputBuffer).set(resultBytes);

      const blob = new Blob([outputBuffer], {
        type: "application/pdf",
      });

      setDownloadUrl(URL.createObjectURL(blob));
    } catch (error) {
      console.error("Watermark PDF error:", error);

      alert(
        "Unable to add the watermark to this PDF."
      );
    } finally {
      setProcessing(false);
    }
  };

  const previewPositionClasses: Record<
    WatermarkPosition,
    string
  > = {
    center: "left-1/2 top-1/2",
    "top-left": "left-6 top-6",
    "top-right": "right-6 top-6",
    "bottom-left": "bottom-6 left-6",
    "bottom-right": "bottom-6 right-6",
  };

  const previewTransform =
    position === "center"
      ? `translate(-50%, -50%) rotate(${rotation}deg)`
      : `rotate(${rotation}deg)`;

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-[1500px] px-5 py-10">

        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            PDF Tool
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Watermark PDF
          </h1>

          <p className="mt-4 text-lg text-slate-600">
            Add text, image or logo watermarks to your PDF.
            Your files stay in your browser.
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(event) =>
            handleFile(event.target.files?.[0])
          }
        />

        <input
          ref={logoInputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(event) =>
            handleLogoFile(event.target.files?.[0])
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
                  Add a watermark to your PDF
                </h2>

                <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-500">
                  Upload your document, customize the watermark,
                  preview it and download the finished PDF.
                </p>

                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(event) =>
                    event.preventDefault()
                  }
                  onDrop={(event) => {
                    event.preventDefault();

                    handleFile(
                      event.dataTransfer.files?.[0]
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
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">

            {/* FILE */}
            <div className="border-b border-slate-100 pb-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
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
                        {pageCount === 1 ? "page" : "pages"} ·{" "}
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  <div className="flex h-full min-h-[76px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-center">
                    <p className="text-sm font-semibold text-slate-900">
                      Selected PDF
                    </p>

                    <p className="mt-1 max-w-2xl text-sm text-slate-500">
                      Your document is ready. Adjust the settings below and apply the watermark when you are done.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={resetTool}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    <X size={16} />
                    Remove
                  </button>
                </div>
              </div>
            </div>

            {/* WORKSPACE */}
            <div className="mt-6 grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">

              {/* SETTINGS */}
              <div className="rounded-[24px] border border-slate-200 bg-white p-5">

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    {watermarkMode === "text" ? (
                      <Type size={19} />
                    ) : (
                      <ImageIcon size={19} />
                    )}
                  </div>

                  <div>
                    <h2 className="font-bold text-slate-950">
                      Watermark settings
                    </h2>

                    <p className="text-sm text-slate-500">
                      Customize the appearance.
                    </p>
                  </div>
                </div>

                {/* MODE */}
                <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setWatermarkMode("text");
                      clearResult();
                    }}
                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                      watermarkMode === "text"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Type size={16} />
                    Text
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setWatermarkMode("image");
                      clearResult();
                    }}
                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                      watermarkMode === "image"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <ImageIcon size={16} />
                    Image / Logo
                  </button>
                </div>

                {watermarkMode === "text" ? (
                  <>
                    <div className="mt-6">
                      <label className="text-sm font-semibold text-slate-700">
                        Watermark text
                      </label>

                      <input
                        type="text"
                        value={watermarkText}
                        onChange={(event) => {
                          setWatermarkText(event.target.value);
                          clearResult();
                        }}
                        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div className="mt-6">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">
                          Font size
                        </span>

                        <span className="text-sm font-bold text-blue-600">
                          {fontSize}px
                        </span>
                      </div>

                      <input
                        type="range"
                        min="12"
                        max="120"
                        value={fontSize}
                        onChange={(event) => {
                          setFontSize(Number(event.target.value));
                          clearResult();
                        }}
                        className="mt-3 w-full accent-blue-600"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mt-6">
                      <label className="text-sm font-semibold text-slate-700">
                        Image or logo
                      </label>

                      {!logoPreviewUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            logoInputRef.current?.click()
                          }
                          className="mt-2 flex min-h-[120px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/40 px-4 transition hover:border-blue-500 hover:bg-blue-50"
                        >
                          <ImageIcon
                            size={24}
                            className="text-blue-600"
                          />

                          <span className="mt-2 text-sm font-bold text-slate-900">
                            Choose image or logo
                          </span>

                          <span className="mt-1 text-xs text-slate-500">
                            PNG, JPG or JPEG
                          </span>
                        </button>
                      ) : (
                        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white p-1">
                              <img
                                src={logoPreviewUrl}
                                alt="Logo preview"
                                className="max-h-full max-w-full object-contain"
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-slate-900">
                                {logoFile?.name}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                Ready to use
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={removeLogo}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                              title="Remove image"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-6">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">
                          Logo size
                        </span>

                        <span className="text-sm font-bold text-blue-600">
                          {logoSize}%
                        </span>
                      </div>

                      <input
                        type="range"
                        min="8"
                        max="70"
                        value={logoSize}
                        onChange={(event) => {
                          setLogoSize(Number(event.target.value));
                          clearResult();
                        }}
                        className="mt-3 w-full accent-blue-600"
                      />
                    </div>
                  </>
                )}

                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Droplets size={16} />
                      Opacity
                    </span>

                    <span className="text-sm font-bold text-blue-600">
                      {opacity}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={opacity}
                    onChange={(event) => {
                      setOpacity(Number(event.target.value));
                      clearResult();
                    }}
                    className="mt-3 w-full accent-blue-600"
                  />
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <RotateCw size={16} />
                      Rotation
                    </span>

                    <span className="text-sm font-bold text-blue-600">
                      {rotation}°
                    </span>
                  </div>

                  <input
                    type="range"
                    min="-90"
                    max="90"
                    step="5"
                    value={rotation}
                    onChange={(event) => {
                      setRotation(Number(event.target.value));
                      clearResult();
                    }}
                    className="mt-3 w-full accent-blue-600"
                  />
                </div>

                <div className="mt-6">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <MapPin size={16} />
                    Position
                  </label>

                  <select
                    value={position}
                    onChange={(event) => {
                      setPosition(
                        event.target.value as WatermarkPosition
                      );
                      clearResult();
                    }}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500"
                  >
                    <option value="center">Center</option>
                    <option value="top-left">Top left</option>
                    <option value="top-right">Top right</option>
                    <option value="bottom-left">Bottom left</option>
                    <option value="bottom-right">Bottom right</option>
                  </select>
                </div>
              </div>

              {/* PREVIEW */}
              <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100/80">

                <div className="border-b border-slate-200 bg-white px-5 py-4">
                  <p className="font-bold text-slate-950">
                    Preview
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Page 1 of {pageCount}
                  </p>
                </div>

                <div className="flex min-h-[590px] items-center justify-center p-5">
                  {previewUrl && (
                    <div className="relative inline-block max-w-full overflow-hidden bg-white shadow-[0_18px_45px_rgba(15,23,42,0.15)]">

                      <img
                        src={previewUrl}
                        alt="PDF preview"
                        draggable={false}
                        className="block max-h-[550px] max-w-full object-contain"
                      />

                      {watermarkMode === "text" ? (
                        <div
                          className={`pointer-events-none absolute max-w-[80%] break-words text-center font-bold text-slate-900 ${previewPositionClasses[position]}`}
                          style={{
                            fontSize: `${Math.min(
                              fontSize,
                              72
                            )}px`,
                            opacity: opacity / 100,
                            transform: previewTransform,
                            transformOrigin: "center",
                          }}
                        >
                          {watermarkText || "Watermark"}
                        </div>
                      ) : (
                        logoPreviewUrl && (
                          <img
                            src={logoPreviewUrl}
                            alt="Watermark logo preview"
                            className={`pointer-events-none absolute h-auto object-contain ${previewPositionClasses[position]}`}
                            style={{
                              width: `${logoSize}%`,
                              opacity: opacity / 100,
                              transform: previewTransform,
                              transformOrigin: "center",
                            }}
                          />
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ACTION BAR */}
            <div className="sticky bottom-4 z-40 mt-6 rounded-[24px] border border-slate-200 bg-white/95 px-5 py-4 shadow-[0_14px_45px_rgba(15,23,42,0.16)] backdrop-blur-md md:px-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <p className="font-bold text-slate-950">
                    {pageCount}{" "}
                    {pageCount === 1 ? "page" : "pages"} ready
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Apply your watermark to the entire PDF.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={applyWatermark}
                  disabled={
                    processing ||
                    (watermarkMode === "text" &&
                      !watermarkText.trim()) ||
                    (watermarkMode === "image" &&
                      !logoFile)
                  }
                  className="inline-flex min-w-[210px] items-center justify-center rounded-xl bg-blue-600 px-7 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {processing
                    ? "Applying..."
                    : "Apply watermark →"}
                </button>
              </div>
            </div>

            {downloadUrl && (
              <div className="mt-6 rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                  <div>
                    <p className="font-bold text-slate-950">
                      Your watermarked PDF is ready
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      Watermark applied successfully.
                    </p>
                  </div>

                  <a
                    href={downloadUrl}
                    download={`watermarked-${file.name}`}
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
