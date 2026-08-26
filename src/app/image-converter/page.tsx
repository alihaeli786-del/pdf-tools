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
  Images,
  Download,
  Settings2,
} from "lucide-react";

import type { HdrifyImage } from "hdrify";

type OutputFormat =
  | "jpeg"
  | "png"
  | "webp"
  | "bmp"
  | "tiff"
  | "tga"
  | "gif"
  | "ico"
  | "svg"
  | "avif"
  | "hdr"
  | "exr"
  | "wbmp";

type ImageItem = {
  id: string;
  file: File;
  previewUrl: string;
  convertedUrl?: string;
  convertedSize?: number;
  convertedName?: string;
};

export default function ImageConverterPage() {
  const inputRef =
    useRef<HTMLInputElement>(null);

  const [images, setImages] =
    useState<ImageItem[]>([]);

  const [outputFormat, setOutputFormat] =
    useState<OutputFormat>("jpeg");

  const [quality, setQuality] =
    useState(90);

  const [converting, setConverting] =
    useState(false);

  const clearConvertedResults = () => {
    setImages((current) =>
      current.map((image) => {
        if (image.convertedUrl) {
          URL.revokeObjectURL(
            image.convertedUrl
          );
        }

        return {
          ...image,
          convertedUrl: undefined,
          convertedSize: undefined,
          convertedName: undefined,
        };
      })
    );
  };

  const getFileExtension = (
    file: File
  ) =>
    file.name
      .split(".")
      .pop()
      ?.toLowerCase() || "";

  const isAdvancedFormat = (
    file: File
  ) => {
    const extension =
      getFileExtension(file);

    return [
      "heic",
      "heif",
      "tif",
      "tiff",
      "tga",
      "avif",
      "hdr",
      "exr",
      "wbmp",
    ].includes(extension);
  };

  const isSupportedInput = (
    file: File
  ) => {
    const extension =
      getFileExtension(file);

    return [
      "jpg",
      "jpeg",
      "png",
      "webp",
      "bmp",
      "gif",
      "svg",
      "ico",
      "heic",
      "heif",
      "tif",
      "tiff",
      "tga",
      "avif",
      "hdr",
      "exr",
      "wbmp",
    ].includes(extension);
  };

  const canvasToPreviewBlob = (
    canvas: HTMLCanvasElement
  ) => {
    return new Promise<Blob>(
      (resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(
                new Error(
                  "Unable to create image preview."
                )
              );
              return;
            }

            resolve(blob);
          },
          "image/png"
        );
      }
    );
  };

  const decodeAdvancedImage = async (
    file: File
  ) => {
    const extension =
      getFileExtension(file);

    if (extension === "wbmp") {
      const bytes =
        new Uint8Array(
          await file.arrayBuffer()
        );

      let offset = 0;

      const readMultiByte =
        () => {
          let value = 0;
          let count = 0;

          while (
            offset < bytes.length
          ) {
            const byte =
              bytes[offset++];

            value =
              value * 128 +
              (byte & 0x7f);

            count++;

            if (
              (byte & 0x80) === 0
            ) {
              return value;
            }

            if (count > 5) {
              throw new Error(
                "Invalid WBMP header."
              );
            }
          }

          throw new Error(
            "Incomplete WBMP header."
          );
        };

      const type =
        readMultiByte();

      if (type !== 0) {
        throw new Error(
          "Only WBMP Type 0 is supported."
        );
      }

      if (
        offset >= bytes.length
      ) {
        throw new Error(
          "Invalid WBMP file."
        );
      }

      const fixedHeader =
        bytes[offset++];

      if (fixedHeader !== 0) {
        throw new Error(
          "Unsupported WBMP header."
        );
      }

      const width =
        readMultiByte();

      const height =
        readMultiByte();

      if (
        width <= 0 ||
        height <= 0
      ) {
        throw new Error(
          "Invalid WBMP dimensions."
        );
      }

      const rowBytes =
        Math.ceil(width / 8);

      const dataSize =
        rowBytes * height;

      if (
        offset + dataSize >
        bytes.length
      ) {
        throw new Error(
          "Incomplete WBMP image data."
        );
      }

      const canvas =
        document.createElement(
          "canvas"
        );

      canvas.width = width;
      canvas.height = height;

      const context =
        canvas.getContext("2d");

      if (!context) {
        throw new Error(
          "Canvas unavailable."
        );
      }

      const imageData =
        context.createImageData(
          width,
          height
        );

      const target =
        imageData.data;

      for (
        let y = 0;
        y < height;
        y++
      ) {
        for (
          let x = 0;
          x < width;
          x++
        ) {
          const byte =
            bytes[
              offset +
              y * rowBytes +
              Math.floor(x / 8)
            ];

          const bit =
            (byte >>
              (7 - (x % 8))) &
            1;

          const value =
            bit === 1
              ? 255
              : 0;

          const pixelIndex =
            (y * width + x) *
            4;

          target[pixelIndex] =
            value;

          target[
            pixelIndex + 1
          ] = value;

          target[
            pixelIndex + 2
          ] = value;

          target[
            pixelIndex + 3
          ] = 255;
        }
      }

      context.putImageData(
        imageData,
        0,
        0
      );

      return canvas;
    }

    if (
      extension === "hdr" ||
      extension === "exr"
    ) {
      const hdrify =
        await import("hdrify");

      const buffer =
        new Uint8Array(
          await file.arrayBuffer()
        );

      const hdrImage =
        extension === "hdr"
          ? hdrify.readHdr(buffer)
          : hdrify.readExr(buffer);

      const canvas =
        document.createElement(
          "canvas"
        );

      canvas.width =
        hdrImage.width;

      canvas.height =
        hdrImage.height;

      const context =
        canvas.getContext("2d");

      if (!context) {
        throw new Error(
          "Canvas unavailable."
        );
      }

      const output =
        context.createImageData(
          hdrImage.width,
          hdrImage.height
        );

      const source =
        hdrImage.data;

      const target =
        output.data;

      const linearToSrgb = (
        value: number
      ) => {
        const safe =
          Math.max(
            0,
            value
          );

        /*
          Reinhard tone mapping keeps
          bright HDR detail visible in
          the browser preview.
        */

        const mapped =
          safe /
          (1 + safe);

        const srgb =
          mapped <= 0.0031308
            ? mapped * 12.92
            : 1.055 *
                Math.pow(
                  mapped,
                  1 / 2.4
                ) -
              0.055;

        return Math.max(
          0,
          Math.min(
            255,
            Math.round(
              srgb * 255
            )
          )
        );
      };

      for (
        let sourceIndex = 0,
          targetIndex = 0;
        sourceIndex <
        source.length;
        sourceIndex += 4,
          targetIndex += 4
      ) {
        target[
          targetIndex
        ] =
          linearToSrgb(
            source[
              sourceIndex
            ]
          );

        target[
          targetIndex + 1
        ] =
          linearToSrgb(
            source[
              sourceIndex + 1
            ]
          );

        target[
          targetIndex + 2
        ] =
          linearToSrgb(
            source[
              sourceIndex + 2
            ]
          );

        const alpha =
          source[
            sourceIndex + 3
          ];

        target[
          targetIndex + 3
        ] =
          Number.isFinite(alpha)
            ? Math.max(
                0,
                Math.min(
                  255,
                  Math.round(
                    alpha * 255
                  )
                )
              )
            : 255;
      }

      context.putImageData(
        output,
        0,
        0
      );

      return canvas;
    }

    if (
      extension === "avif"
    ) {
      const avifModule =
        await import(
          "@jsquash/avif"
        );

      const decodeAvif =
        avifModule.decode;

      if (!decodeAvif) {
        throw new Error(
          "AVIF decoder unavailable."
        );
      }

      const buffer =
        await file.arrayBuffer();

      const imageData =
        await decodeAvif(
          buffer
        );

      if (!imageData) {
        throw new Error(
          "Unable to decode AVIF image."
        );
      }

      const canvas =
        document.createElement(
          "canvas"
        );

      canvas.width =
        imageData.width;

      canvas.height =
        imageData.height;

      const context =
        canvas.getContext("2d");

      if (!context) {
        throw new Error(
          "Canvas unavailable."
        );
      }

      context.putImageData(
        imageData,
        0,
        0
      );

      return canvas;
    }

    if (
      extension === "heic" ||
      extension === "heif"
    ) {
      const heicModule =
        await import("heic2any");

      const heic2any =
        heicModule.default;

      const converted =
        await heic2any({
          blob: file,
          toType: "image/png",
          quality: 1,
        });

      const blob =
        Array.isArray(converted)
          ? converted[0]
          : converted;

      const url =
        URL.createObjectURL(blob);

      try {
        const image =
          await loadImage(url);

        const canvas =
          document.createElement(
            "canvas"
          );

        canvas.width =
          image.naturalWidth;

        canvas.height =
          image.naturalHeight;

        const context =
          canvas.getContext("2d");

        if (!context) {
          throw new Error(
            "Canvas unavailable."
          );
        }

        context.drawImage(
          image,
          0,
          0
        );

        return canvas;
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    if (
      extension === "tif" ||
      extension === "tiff"
    ) {
      const utifModule =
        await import("utif");

      const UTIF =
        utifModule.default;

      const buffer =
        await file.arrayBuffer();

      const ifds =
        UTIF.decode(buffer);

      if (
        !ifds ||
        ifds.length === 0
      ) {
        throw new Error(
          "Unable to decode TIFF image."
        );
      }

      UTIF.decodeImage(
        buffer,
        ifds[0]
      );

      const rgba =
        UTIF.toRGBA8(
          ifds[0]
        );

      const width =
        ifds[0].width;

      const height =
        ifds[0].height;

      const canvas =
        document.createElement(
          "canvas"
        );

      canvas.width = width;
      canvas.height = height;

      const context =
        canvas.getContext("2d");

      if (!context) {
        throw new Error(
          "Canvas unavailable."
        );
      }

      const imageData =
        new ImageData(
          new Uint8ClampedArray(
            rgba
          ),
          width,
          height
        );

      context.putImageData(
        imageData,
        0,
        0
      );

      return canvas;
    }

    if (extension === "tga") {
      const tgaModule =
        await import("tga-js");

      const TGA =
        tgaModule.default;

      const buffer =
        await file.arrayBuffer();

      const tga =
        new TGA();

      tga.load(
        new Uint8Array(
          buffer
        )
      );

      return tga.getCanvas();
    }

    throw new Error(
      "Unsupported advanced image format."
    );
  };

  const createPreviewUrl = async (
    file: File
  ) => {
    if (
      !isAdvancedFormat(file)
    ) {
      return URL.createObjectURL(
        file
      );
    }

    const canvas =
      await decodeAdvancedImage(
        file
      );

    const blob =
      await canvasToPreviewBlob(
        canvas
      );

    return URL.createObjectURL(
      blob
    );
  };

  const addFiles = async (
    selectedFiles: FileList | File[]
  ) => {
    const files =
      Array.from(selectedFiles);

    const validFiles =
      files.filter(
        isSupportedInput
      );

    if (
      validFiles.length === 0
    ) {
      alert(
        "Please choose a supported JPG, PNG, WebP, BMP, GIF, SVG, ICO, HEIC, TIFF, TGA, AVIF, HDR, EXR or WBMP image."
      );

      return;
    }

    try {
      const newImages:
        ImageItem[] = [];

      for (
        const file of validFiles
      ) {
        const previewUrl =
          await createPreviewUrl(
            file
          );

        newImages.push({
          id:
            `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,

          file,
          previewUrl,
        });
      }

      setImages((current) => [
        ...current,
        ...newImages,
      ]);
    } catch (error) {
      console.error(
        "Advanced image load error:",
        error
      );

      alert(
        "One or more images could not be opened."
      );
    }
  };

  const removeImage = (
    id: string
  ) => {
    setImages((current) => {
      const target =
        current.find(
          (image) =>
            image.id === id
        );

      if (target) {
        URL.revokeObjectURL(
          target.previewUrl
        );

        if (
          target.convertedUrl
        ) {
          URL.revokeObjectURL(
            target.convertedUrl
          );
        }
      }

      return current.filter(
        (image) =>
          image.id !== id
      );
    });
  };

  const clearAll = () => {
    images.forEach((image) => {
      URL.revokeObjectURL(
        image.previewUrl
      );

      if (
        image.convertedUrl
      ) {
        URL.revokeObjectURL(
          image.convertedUrl
        );
      }
    });

    setImages([]);

    if (inputRef.current) {
      inputRef.current.value =
        "";
    }
  };

  const formatSize = (
    bytes: number
  ) => {
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
          () => resolve(image);

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
                  "Image conversion failed."
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

  const getExtension = () => {
    if (
      outputFormat === "jpeg"
    ) {
      return "jpg";
    }

    if (
      outputFormat === "tiff"
    ) {
      return "tiff";
    }

    return outputFormat;
  };

  const getMimeType = () => {
    if (
      outputFormat === "jpeg"
    ) {
      return "image/jpeg";
    }

    if (
      outputFormat === "png"
    ) {
      return "image/png";
    }

    if (
      outputFormat === "webp"
    ) {
      return "image/webp";
    }

    if (
      outputFormat === "bmp"
    ) {
      return "image/bmp";
    }

    if (
      outputFormat === "tiff"
    ) {
      return "image/tiff";
    }

    if (
      outputFormat === "tga"
    ) {
      return "image/x-tga";
    }

    if (
      outputFormat === "gif"
    ) {
      return "image/gif";
    }

    if (
      outputFormat === "ico"
    ) {
      return "image/x-icon";
    }

    if (
      outputFormat === "avif"
    ) {
      return "image/avif";
    }

    if (
      outputFormat === "wbmp"
    ) {
      return "image/vnd.wap.wbmp";
    }

    return "image/svg+xml";
  };

  const canvasToBmpBlob = (
    canvas: HTMLCanvasElement
  ) => {
    const context =
      canvas.getContext("2d");

    if (!context) {
      throw new Error(
        "Canvas unavailable."
      );
    }

    const width =
      canvas.width;

    const height =
      canvas.height;

    const imageData =
      context.getImageData(
        0,
        0,
        width,
        height
      );

    const pixelDataSize =
      width * height * 4;

    const fileSize =
      54 + pixelDataSize;

    const buffer =
      new ArrayBuffer(
        fileSize
      );

    const view =
      new DataView(buffer);

    const pixels =
      new Uint8Array(
        buffer,
        54
      );

    view.setUint8(0, 0x42);
    view.setUint8(1, 0x4d);

    view.setUint32(
      2,
      fileSize,
      true
    );

    view.setUint32(
      10,
      54,
      true
    );

    view.setUint32(
      14,
      40,
      true
    );

    view.setInt32(
      18,
      width,
      true
    );

    view.setInt32(
      22,
      height,
      true
    );

    view.setUint16(
      26,
      1,
      true
    );

    view.setUint16(
      28,
      32,
      true
    );

    view.setUint32(
      34,
      pixelDataSize,
      true
    );

    const source =
      imageData.data;

    let targetIndex = 0;

    for (
      let y = height - 1;
      y >= 0;
      y--
    ) {
      for (
        let x = 0;
        x < width;
        x++
      ) {
        const sourceIndex =
          (y * width + x) *
          4;

        pixels[
          targetIndex++
        ] =
          source[
            sourceIndex + 2
          ];

        pixels[
          targetIndex++
        ] =
          source[
            sourceIndex + 1
          ];

        pixels[
          targetIndex++
        ] =
          source[
            sourceIndex
          ];

        pixels[
          targetIndex++
        ] =
          source[
            sourceIndex + 3
          ];
      }
    }

    return new Blob(
      [buffer],
      {
        type: "image/bmp",
      }
    );
  };

  const canvasToTgaBlob = (
    canvas: HTMLCanvasElement
  ) => {
    const context =
      canvas.getContext("2d");

    if (!context) {
      throw new Error(
        "Canvas unavailable."
      );
    }

    const width =
      canvas.width;

    const height =
      canvas.height;

    const imageData =
      context.getImageData(
        0,
        0,
        width,
        height
      );

    const buffer =
      new ArrayBuffer(
        18 +
          width *
            height *
            4
      );

    const header =
      new DataView(
        buffer,
        0,
        18
      );

    header.setUint8(
      2,
      2
    );

    header.setUint16(
      12,
      width,
      true
    );

    header.setUint16(
      14,
      height,
      true
    );

    header.setUint8(
      16,
      32
    );

    header.setUint8(
      17,
      0x28
    );

    const output =
      new Uint8Array(
        buffer,
        18
      );

    const source =
      imageData.data;

    let targetIndex = 0;

    for (
      let y = 0;
      y < height;
      y++
    ) {
      for (
        let x = 0;
        x < width;
        x++
      ) {
        const sourceIndex =
          (y * width + x) *
          4;

        output[
          targetIndex++
        ] =
          source[
            sourceIndex + 2
          ];

        output[
          targetIndex++
        ] =
          source[
            sourceIndex + 1
          ];

        output[
          targetIndex++
        ] =
          source[
            sourceIndex
          ];

        output[
          targetIndex++
        ] =
          source[
            sourceIndex + 3
          ];
      }
    }

    return new Blob(
      [buffer],
      {
        type:
          "image/x-tga",
      }
    );
  };

  const canvasToTiffBlob =
    async (
      canvas: HTMLCanvasElement
    ) => {
      const context =
        canvas.getContext("2d");

      if (!context) {
        throw new Error(
          "Canvas unavailable."
        );
      }

      const imageData =
        context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        );

      const utifModule =
        await import("utif");

      const UTIF =
        utifModule.default;

      const rgba =
        new Uint8Array(
          imageData.data
        );

      const encoded =
        UTIF.encodeImage(
          rgba,
          canvas.width,
          canvas.height
        );

      return new Blob(
        [encoded],
        {
          type:
            "image/tiff",
        }
      );
    };

  const canvasToGifBlob = async (
    canvas: HTMLCanvasElement
  ) => {
    const context =
      canvas.getContext("2d");

    if (!context) {
      throw new Error(
        "Canvas unavailable."
      );
    }

    const gifModule =
      await import("gifenc");

    const {
      GIFEncoder,
      quantize,
      applyPalette,
    } = gifModule;

    const imageData =
      context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );

    const rgba =
      new Uint8Array(
        imageData.data
      );

    const palette =
      quantize(
        rgba,
        256
      );

    const index =
      applyPalette(
        rgba,
        palette
      );

    const gif =
      GIFEncoder();

    gif.writeFrame(
      index,
      canvas.width,
      canvas.height,
      {
        palette,
      }
    );

    gif.finish();

    const bytes =
      gif.bytes();

    const gifBuffer =
      new ArrayBuffer(
        bytes.byteLength
      );

    new Uint8Array(
      gifBuffer
    ).set(bytes);

    return new Blob(
      [gifBuffer],
      {
        type: "image/gif",
      }
    );
  };

  const canvasToIcoBlob = async (
    sourceCanvas: HTMLCanvasElement
  ) => {
    const iconSize = 256;

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width =
      iconSize;

    canvas.height =
      iconSize;

    const context =
      canvas.getContext("2d");

    if (!context) {
      throw new Error(
        "Canvas unavailable."
      );
    }

    context.clearRect(
      0,
      0,
      iconSize,
      iconSize
    );

    const scale =
      Math.min(
        iconSize /
          sourceCanvas.width,
        iconSize /
          sourceCanvas.height
      );

    const drawWidth =
      sourceCanvas.width *
      scale;

    const drawHeight =
      sourceCanvas.height *
      scale;

    const drawX =
      (iconSize -
        drawWidth) /
      2;

    const drawY =
      (iconSize -
        drawHeight) /
      2;

    context.drawImage(
      sourceCanvas,
      drawX,
      drawY,
      drawWidth,
      drawHeight
    );

    const pngBlob =
      await canvasToBlob(
        canvas,
        "image/png"
      );

    const pngBytes =
      new Uint8Array(
        await pngBlob.arrayBuffer()
      );

    const headerSize = 6;
    const directorySize = 16;

    const output =
      new Uint8Array(
        headerSize +
          directorySize +
          pngBytes.length
      );

    const view =
      new DataView(
        output.buffer
      );

    // ICONDIR
    view.setUint16(
      0,
      0,
      true
    );

    view.setUint16(
      2,
      1,
      true
    );

    view.setUint16(
      4,
      1,
      true
    );

    // ICONDIRENTRY
    view.setUint8(
      6,
      0
    );

    view.setUint8(
      7,
      0
    );

    view.setUint8(
      8,
      0
    );

    view.setUint8(
      9,
      0
    );

    view.setUint16(
      10,
      1,
      true
    );

    view.setUint16(
      12,
      32,
      true
    );

    view.setUint32(
      14,
      pngBytes.length,
      true
    );

    view.setUint32(
      18,
      headerSize +
        directorySize,
      true
    );

    output.set(
      pngBytes,
      headerSize +
        directorySize
    );

    return new Blob(
      [output],
      {
        type:
          "image/x-icon",
      }
    );
  };

  const blobToDataUrl = (
    blob: Blob
  ) => {
    return new Promise<string>(
      (
        resolve,
        reject
      ) => {
        const reader =
          new FileReader();

        reader.onload =
          () =>
            resolve(
              String(
                reader.result
              )
            );

        reader.onerror =
          () =>
            reject(
              reader.error
            );

        reader.readAsDataURL(
          blob
        );
      }
    );
  };

  const canvasToSvgBlob = async (
    canvas: HTMLCanvasElement
  ) => {
    const pngBlob =
      await canvasToBlob(
        canvas,
        "image/png"
      );

    const dataUrl =
      await blobToDataUrl(
        pngBlob
      );

    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}"><image href="${dataUrl}" width="${canvas.width}" height="${canvas.height}" /></svg>`;

    return new Blob(
      [svg],
      {
        type:
          "image/svg+xml",
      }
    );
  };

  const canvasToAvifBlob =
    async (
      canvas: HTMLCanvasElement
    ) => {
      const context =
        canvas.getContext("2d");

      if (!context) {
        throw new Error(
          "Canvas unavailable."
        );
      }

      const imageData =
        context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        );

      const avifModule =
        await import(
          "@jsquash/avif"
        );

      const encodeAvif =
        avifModule.encode;

      if (!encodeAvif) {
        throw new Error(
          "AVIF encoder unavailable."
        );
      }

      const buffer =
        await encodeAvif(
          imageData,
          quality >= 100
            ? {
                lossless: true,
              }
            : {
                quality,
                speed: 6,
              }
        );

      return new Blob(
        [buffer],
        {
          type: "image/avif",
        }
      );
    };

  const canvasToWbmpBlob = (
    canvas: HTMLCanvasElement
  ) => {
    const context =
      canvas.getContext("2d");

    if (!context) {
      throw new Error(
        "Canvas unavailable."
      );
    }

    const width =
      canvas.width;

    const height =
      canvas.height;

    const imageData =
      context.getImageData(
        0,
        0,
        width,
        height
      );

    const encodeMultiByte = (
      number: number
    ) => {
      let value =
        Math.max(
          0,
          Math.floor(number)
        );

      const parts: number[] =
        [
          value & 0x7f,
        ];

      value =
        Math.floor(
          value / 128
        );

      while (value > 0) {
        parts.unshift(
          value & 0x7f
        );

        value =
          Math.floor(
            value / 128
          );
      }

      for (
        let i = 0;
        i < parts.length - 1;
        i++
      ) {
        parts[i] |= 0x80;
      }

      return parts;
    };

    const widthBytes =
      encodeMultiByte(width);

    const heightBytes =
      encodeMultiByte(height);

    const rowBytes =
      Math.ceil(width / 8);

    const headerLength =
      2 +
      widthBytes.length +
      heightBytes.length;

    const output =
      new Uint8Array(
        headerLength +
          rowBytes * height
      );

    let position = 0;

    // Type 0
    output[position++] = 0;

    // Fixed header
    output[position++] = 0;

    for (
      const byte of widthBytes
    ) {
      output[position++] =
        byte;
    }

    for (
      const byte of heightBytes
    ) {
      output[position++] =
        byte;
    }

    const source =
      imageData.data;

    for (
      let y = 0;
      y < height;
      y++
    ) {
      for (
        let x = 0;
        x < width;
        x++
      ) {
        const sourceIndex =
          (y * width + x) *
          4;

        const alpha =
          source[
            sourceIndex + 3
          ] / 255;

        const red =
          source[sourceIndex] *
            alpha +
          255 * (1 - alpha);

        const green =
          source[
            sourceIndex + 1
          ] *
            alpha +
          255 * (1 - alpha);

        const blue =
          source[
            sourceIndex + 2
          ] *
            alpha +
          255 * (1 - alpha);

        const luminance =
          0.2126 * red +
          0.7152 * green +
          0.0722 * blue;

        // WBMP: white = 1,
        // black = 0
        if (luminance >= 128) {
          const byteIndex =
            headerLength +
            y * rowBytes +
            Math.floor(x / 8);

          output[byteIndex] |=
            1 <<
            (7 - (x % 8));
        }
      }
    }

    const buffer =
      new ArrayBuffer(
        output.byteLength
      );

    new Uint8Array(
      buffer
    ).set(output);

    return new Blob(
      [buffer],
      {
        type:
          "image/vnd.wap.wbmp",
      }
    );
  };

  const exportCanvas = async (
    canvas: HTMLCanvasElement
  ) => {
    if (
      outputFormat === "bmp"
    ) {
      return canvasToBmpBlob(
        canvas
      );
    }

    if (
      outputFormat === "wbmp"
    ) {
      return canvasToWbmpBlob(
        canvas
      );
    }

    if (
      outputFormat === "tiff"
    ) {
      return canvasToTiffBlob(
        canvas
      );
    }

    if (
      outputFormat === "tga"
    ) {
      return canvasToTgaBlob(
        canvas
      );
    }

    if (
      outputFormat === "gif"
    ) {
      return canvasToGifBlob(
        canvas
      );
    }

    if (
      outputFormat === "ico"
    ) {
      return canvasToIcoBlob(
        canvas
      );
    }

    if (
      outputFormat === "svg"
    ) {
      return canvasToSvgBlob(
        canvas
      );
    }

    if (
      outputFormat === "avif"
    ) {
      return canvasToAvifBlob(
        canvas
      );
    }

    return canvasToBlob(
      canvas,
      getMimeType(),
      outputFormat === "png"
        ? undefined
        : quality / 100
    );
  };

  const canvasToHdrifyImage = (
    canvas: HTMLCanvasElement
  ): HdrifyImage => {
    const context =
      canvas.getContext("2d");

    if (!context) {
      throw new Error(
        "Canvas unavailable."
      );
    }

    const imageData =
      context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );

    const source =
      imageData.data;

    const data =
      new Float32Array(
        canvas.width *
          canvas.height *
          4
      );

    const srgbToLinear = (
      byteValue: number
    ) => {
      const value =
        byteValue / 255;

      if (
        value <= 0.04045
      ) {
        return value / 12.92;
      }

      return Math.pow(
        (value + 0.055) /
          1.055,
        2.4
      );
    };

    for (
      let i = 0;
      i < source.length;
      i += 4
    ) {
      data[i] =
        srgbToLinear(
          source[i]
        );

      data[i + 1] =
        srgbToLinear(
          source[i + 1]
        );

      data[i + 2] =
        srgbToLinear(
          source[i + 2]
        );

      data[i + 3] =
        source[i + 3] /
        255;
    }

    return {
      width:
        canvas.width,

      height:
        canvas.height,

      data,

      linearColorSpace:
        "srgb-linear" as HdrifyImage["linearColorSpace"],
    };
  };

  const exportHdrOrExr =
    async (
      sourceFile: File,
      canvas: HTMLCanvasElement
    ) => {
      const hdrify =
        await import("hdrify");

      const sourceExtension =
        getFileExtension(
          sourceFile
        );

      let hdrImage: HdrifyImage;

      /*
        If source is already HDR/EXR,
        preserve the original floating
        point HDR pixel data.
      */

      if (
        sourceExtension === "hdr" ||
        sourceExtension === "exr"
      ) {
        const bytes =
          new Uint8Array(
            await sourceFile.arrayBuffer()
          );

        hdrImage =
          sourceExtension === "hdr"
            ? hdrify.readHdr(
                bytes
              )
            : hdrify.readExr(
                bytes
              );
      } else {
        /*
          Standard images are SDR.
          Convert their sRGB canvas pixels
          into linear floating point data.
        */

        hdrImage =
          canvasToHdrifyImage(
            canvas
          );
      }

      const encoded =
        outputFormat === "hdr"
          ? hdrify.writeHdr(
              hdrImage
            )
          : hdrify.writeExr(
              hdrImage
            );

      const bytes =
        encoded instanceof Uint8Array
          ? encoded
          : new Uint8Array(
              encoded
            );

      const blobBuffer =
        new ArrayBuffer(
          bytes.byteLength
        );

      new Uint8Array(
        blobBuffer
      ).set(bytes);

      return new Blob(
        [blobBuffer],
        {
          type:
            outputFormat === "hdr"
              ? "image/vnd.radiance"
              : "image/x-exr",
        }
      );
    };

  const convertImages = async () => {
    if (
      images.length === 0
    ) {
      return;
    }

    try {
      setConverting(true);

      const convertedItems:
        ImageItem[] = [];

      for (
        const imageItem of images
      ) {
        if (
          imageItem.convertedUrl
        ) {
          URL.revokeObjectURL(
            imageItem.convertedUrl
          );
        }

        let sourceCanvas:
          HTMLCanvasElement;

        if (
          isAdvancedFormat(
            imageItem.file
          )
        ) {
          sourceCanvas =
            await decodeAdvancedImage(
              imageItem.file
            );
        } else {
          const sourceImage =
            await loadImage(
              imageItem.previewUrl
            );

          sourceCanvas =
            document.createElement(
              "canvas"
            );

          sourceCanvas.width =
            sourceImage.naturalWidth;

          sourceCanvas.height =
            sourceImage.naturalHeight;

          const sourceContext =
            sourceCanvas.getContext(
              "2d"
            );

          if (!sourceContext) {
            throw new Error(
              "Canvas is not available."
            );
          }

          sourceContext.drawImage(
            sourceImage,
            0,
            0
          );
        }

        const canvas =
          document.createElement(
            "canvas"
          );

        canvas.width =
          sourceCanvas.width;

        canvas.height =
          sourceCanvas.height;

        const context =
          canvas.getContext("2d");

        if (!context) {
          throw new Error(
            "Canvas is not available."
          );
        }

        if (
          outputFormat === "jpeg"
        ) {
          context.fillStyle =
            "#ffffff";

          context.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
          );
        } else {
          context.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
          );
        }

        context.drawImage(
          sourceCanvas,
          0,
          0
        );

        const blob =
          outputFormat === "hdr" ||
          outputFormat === "exr"
            ? await exportHdrOrExr(
                imageItem.file,
                canvas
              )
            : await exportCanvas(
                canvas
              );

        const baseName =
          imageItem.file.name.replace(
            /\.[^.]+$/,
            ""
          );

        const convertedName =
          `${baseName}.${getExtension()}`;

        convertedItems.push({
          ...imageItem,

          convertedUrl:
            URL.createObjectURL(
              blob
            ),

          convertedSize:
            blob.size,

          convertedName,
        });
      }

      setImages(
        convertedItems
      );
    } catch (error) {
      console.error(
        "Image conversion error:",
        error
      );

      alert(
        "Unable to convert one or more images."
      );
    } finally {
      setConverting(false);
    }
  };

  const handleFormatChange = (
    format: OutputFormat
  ) => {
    clearConvertedResults();
    setOutputFormat(format);
  };

  const handleQualityChange = (
    value: number
  ) => {
    clearConvertedResults();
    setQuality(value);
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f5f3ff_0%,#f8fafc_38%,#f8fafc_100%)]">

      <section className="mx-auto max-w-[1500px] px-5 py-10">

        <div className="mx-auto max-w-4xl text-center">

          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/80 bg-white/80 px-4 py-2 text-sm font-bold text-violet-700 shadow-sm backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_0_4px_rgba(139,92,246,0.12)]" />
            Professional Image Converter
          </div>

          <h1 className="mt-5 text-4xl font-black tracking-[-0.035em] text-slate-950 md:text-6xl">
            Convert images.
            <span className="block bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
              Keep the quality.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
            Fast batch image conversion with professional formats,
            quality controls and private browser-based processing.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">

            <span className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 shadow-sm">
              14+ formats
            </span>

            <span className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 shadow-sm">
              Batch conversion
            </span>

            <span className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 shadow-sm">
              Browser based
            </span>

          </div>

        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.bmp,.gif,.svg,.ico,.heic,.heif,.tif,.tiff,.tga,.avif,.hdr,.exr,.wbmp,image/jpeg,image/png,image/webp,image/bmp,image/gif,image/svg+xml,image/x-icon,image/heic,image/heif,image/tiff,image/avif,image/vnd.wap.wbmp"
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
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">

            <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white px-6 py-16 shadow-[0_20px_70px_rgba(15,23,42,0.08)] md:px-12 md:py-20">

              <div className="pointer-events-none absolute -left-24 top-10 h-64 w-64 rounded-full bg-violet-100/60 blur-3xl" />

              <div className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-blue-100/50 blur-3xl" />

              <div className="relative mx-auto max-w-3xl text-center">

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
                  <ImageIcon size={28} />
                </div>

                <h2 className="mt-7 text-3xl font-bold tracking-tight text-slate-950">
                  Convert your images
                </h2>

                <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-500">
                  Upload one or multiple images.
                  JPG, PNG, WebP, BMP, GIF, SVG, ICO, HEIC, TIFF, TGA, AVIF, HDR, EXR and WBMP are supported.
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

                    addFiles(
                      event.dataTransfer.files
                    );
                  }}
                  className="group mx-auto mt-8 flex min-h-[230px] w-full max-w-2xl flex-col items-center justify-center rounded-[30px] border-2 border-dashed border-violet-200 bg-[linear-gradient(135deg,#faf5ff_0%,#ffffff_48%,#eff6ff_100%)] px-6 shadow-inner transition-all duration-300 hover:-translate-y-1 hover:border-violet-500 hover:shadow-[0_20px_60px_rgba(124,58,237,0.12)]"
                >

                  <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-[0_12px_28px_rgba(124,58,237,0.30)] transition-all duration-300 group-hover:-translate-y-1 group-hover:scale-105">
                    <Upload size={25} />
                  </div>

                  <span className="mt-5 text-lg font-bold text-slate-900">
                    Choose images
                  </span>

                  <span className="mt-1 font-sans text-sm font-medium text-slate-500">
                    or drag and drop them here
                  </span>

                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">

            {/* HEADER */}
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-4">

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <Images size={22} />
                </div>

                <div>
                  <p className="font-bold text-slate-950">
                    {images.length}{" "}
                    {images.length === 1
                      ? "image selected"
                      : "images selected"}
                  </p>

                  <p className="mt-1 font-sans text-sm font-medium text-slate-500">
                    Add more images or remove any you do not need.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">

                <button
                  type="button"
                  onClick={() =>
                    inputRef.current?.click()
                  }
                  className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-100"
                >
                  Add images
                </button>

                <button
                  type="button"
                  onClick={clearAll}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={16} />
                  Clear all
                </button>

              </div>
            </div>

            {/* SETTINGS */}
            <div className="mt-6 overflow-hidden rounded-[28px] border border-slate-200/90 bg-[linear-gradient(135deg,#ffffff_0%,#ffffff_55%,#f5f3ff_100%)] shadow-[0_18px_55px_rgba(15,23,42,0.07)]">

              <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between md:px-6">

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-[0_8px_22px_rgba(124,58,237,0.24)]">
                    <Settings2 size={19} />
                  </div>

                  <div>
                    <h2 className="font-sans font-bold tracking-tight text-slate-950">
                      Conversion settings
                    </h2>

                    <p className="mt-0.5 text-sm text-slate-500">
                      Select your output format and quality.
                    </p>
                  </div>

                </div>

                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Ready
                </div>

              </div>


              <div className="grid gap-6 p-5 md:p-6 lg:grid-cols-[1.35fr_0.65fr]">

                <div>

                  <div className="flex items-end justify-between gap-4">

                    <div>
                      <label className="text-sm font-black text-slate-800">
                        Output format
                      </label>

                      <p className="mt-1 text-xs text-slate-500">
                        Choose the format you want to create.
                      </p>
                    </div>

                    <span className="rounded-lg bg-violet-50 px-2.5 py-1 text-[11px] font-black text-violet-700">
                      {getExtension().toUpperCase()}
                    </span>

                  </div>


                  <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">

                    {(
                      [
                        ["jpeg", "JPG"],
                        ["png", "PNG"],
                        ["webp", "WebP"],
                        ["bmp", "BMP"],
                        ["tiff", "TIFF"],
                        ["tga", "TGA"],
                        ["gif", "GIF"],
                        ["ico", "ICO"],
                        ["svg", "SVG"],
                        ["avif", "AVIF"],
                        ["hdr", "HDR"],
                        ["exr", "EXR"],
                        ["wbmp", "WBMP"],
                      ] as const
                    ).map(([value, label]) => {

                      const active =
                        outputFormat === value;

                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            handleFormatChange(
                              value
                            )
                          }
                          className={`group relative flex min-h-[68px] items-center justify-center overflow-hidden rounded-[18px] border px-4 transition-all duration-300 ${
                            active
                              ? "scale-[1.02] border-violet-600 bg-gradient-to-br from-violet-600 via-violet-600 to-indigo-600 text-white shadow-[0_12px_28px_rgba(124,58,237,0.25)]"
                              : "border-slate-200 bg-white text-slate-700 shadow-[0_3px_12px_rgba(15,23,42,0.05)] hover:-translate-y-1 hover:border-violet-300 hover:bg-violet-50/60 hover:text-violet-700 hover:shadow-[0_10px_25px_rgba(124,58,237,0.10)]"
                          }`}
                        >

                          <span
                            className={`text-sm font-black tracking-wide transition-all duration-300 ${
                              active
                                ? "text-white"
                                : "text-slate-800 group-hover:scale-105 group-hover:text-violet-700"
                            }`}
                          >
                            {label}
                          </span>

                          {active && (
                            <span className="pointer-events-none absolute -bottom-7 -left-7 h-16 w-16 rounded-full bg-white/10 blur-xl" />
                          )}

                        </button>
                      );
                    })}

                  </div>

                </div>


                <div className="rounded-[22px] border border-slate-200 bg-white/90 p-5 shadow-sm">

                  <div className="flex items-start justify-between gap-4">

                    <div>
                      <p className="text-sm font-black text-slate-800">
                        Output quality
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Control compression for supported formats.
                      </p>
                    </div>

                    <span className="rounded-xl bg-violet-50 px-3 py-2 text-xs font-black text-violet-700">

                      {outputFormat === "hdr" ||
                      outputFormat === "exr"
                        ? "HDR"
                        : outputFormat === "jpeg" ||
                          outputFormat === "webp" ||
                          outputFormat === "avif"
                        ? `${quality}%`
                        : "MAX"}

                    </span>

                  </div>


                  <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4">

                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={quality}
                      disabled={
                        outputFormat !== "jpeg" &&
                        outputFormat !== "webp" &&
                        outputFormat !== "avif"
                      }
                      onChange={(event) =>
                        handleQualityChange(
                          Number(
                            event.target.value
                          )
                        )
                      }
                      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-violet-600 disabled:cursor-not-allowed disabled:opacity-35"
                    />

                    <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-slate-400">
                      <span>Smaller file</span>
                      <span>Best quality</span>
                    </div>

                  </div>


                  <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">

                    <p className="text-xs leading-5 text-slate-600">

                      {outputFormat === "jpeg" ||
                      outputFormat === "webp" ||
                      outputFormat === "avif"
                        ? "Higher quality keeps more image detail and usually creates a larger file."
                        : outputFormat === "hdr" ||
                          outputFormat === "exr"
                        ? "High dynamic range output preserves linear floating-point image data."
                        : outputFormat === "wbmp"
                        ? "WBMP output is converted to 1-bit black and white."
                        : outputFormat === "gif"
                        ? "GIF output uses a 256-color palette."
                        : outputFormat === "ico"
                        ? "ICO output is optimized to a 256 ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â 256 icon."
                        : outputFormat === "svg"
                        ? "SVG preserves the image visually inside an SVG container."
                        : "This format uses lossless conversion settings."}

                    </p>

                  </div>

                </div>

              </div>

            </div>

            {/* IMAGE GRID */}
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

              {images.map(
                (image) => (
                  <div
                    key={image.id}
                    className="group overflow-hidden rounded-[24px] border border-slate-200/90 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_18px_45px_rgba(15,23,42,0.10)]"
                  >

                    <div className="relative flex h-52 items-center justify-center overflow-hidden bg-[linear-gradient(45deg,#f8fafc_25%,transparent_25%),linear-gradient(-45deg,#f8fafc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f8fafc_75%),linear-gradient(-45deg,transparent_75%,#f8fafc_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px]">

                      <img
                        src={
                          image.previewUrl
                        }
                        alt={
                          image.file.name
                        }
                        className="max-h-full max-w-full object-contain"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          removeImage(
                            image.id
                          )
                        }
                        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/95 text-slate-500 shadow-md backdrop-blur transition hover:bg-red-50 hover:text-red-600"
                        title="Remove image"
                      >
                        <X size={17} />
                      </button>

                    </div>

                    <div className="p-4">

                      <p
                        className="truncate text-sm font-bold text-slate-900"
                        title={
                          image.file.name
                        }
                      >
                        {image.file.name}
                      </p>

                      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">

                        <span>
                          {image.file.type
                            .replace(
                              "image/",
                              ""
                            )
                            .toUpperCase()}
                        </span>

                        <span>
                          {formatSize(
                            image.file.size
                          )}
                        </span>

                      </div>

                      {image.convertedUrl &&
                        image.convertedSize !==
                          undefined && (
                          <div className="mt-4 border-t border-slate-100 pt-4">

                            <div className="flex items-center justify-between gap-3 text-xs">

                              <span className="font-semibold text-emerald-700">
                                Converted
                              </span>

                              <span className="text-slate-500">
                                {formatSize(
                                  image.convertedSize
                                )}
                              </span>

                            </div>

                            <a
                              href={
                                image.convertedUrl
                              }
                              download={
                                image.convertedName
                              }
                              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white shadow-[0_8px_20px_rgba(15,23,42,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-violet-700 hover:shadow-[0_10px_24px_rgba(124,58,237,0.24)]"
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

            {/* ACTION */}
            <div className="sticky bottom-4 z-40 mt-7 overflow-hidden rounded-[26px] border border-violet-100 bg-white/95 px-5 py-4 font-sans text-slate-900 shadow-[0_18px_50px_rgba(15,23,42,0.12)] backdrop-blur-xl md:px-6">

              <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-violet-500/20 blur-3xl" />

              <div className="relative grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(120px,0.45fr)] sm:items-center">

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-violet-100 bg-violet-50 text-violet-700 shadow-sm">
                    <ImageIcon size={20} />
                  </div>

                  <div>

                    <p className="font-sans font-bold tracking-tight text-slate-950">
                      Ready to convert
                    </p>

                    <p className="mt-1 font-sans text-sm font-medium text-slate-500">
                      {images.length}{" "}
                      {images.length === 1
                        ? "image"
                        : "images"}{" "}
                      selected
                      <span className="mx-2 text-slate-300">
                        {"\u2022"}
                      </span>
                      Output{" "}
                      <span className="font-sans font-bold text-violet-700">
                        {getExtension().toUpperCase()}
                      </span>
                    </p>

                  </div>

                </div>


                                <button
                  type="button"
                  onClick={convertImages}
                  disabled={converting}
                  className="group relative inline-flex min-w-[245px] justify-self-center overflow-hidden rounded-2xl bg-gradient-to-r from-violet-500 via-violet-600 to-indigo-600 px-8 py-4 font-sans text-sm font-bold text-white shadow-[0_14px_35px_rgba(124,58,237,0.30)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(124,58,237,0.38)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {converting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                      Converting...
                    </span>
                  ) : (
                    <span className="whitespace-nowrap">
                      Convert to {getExtension().toUpperCase()}
                    </span>
                  )}
                </button>

              </div>

            </div>

          </div>
        )}
      </section>
    </main>
  );
}
