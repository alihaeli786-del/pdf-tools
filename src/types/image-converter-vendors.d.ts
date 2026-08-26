declare module "utif" {
  export interface UTIFImage {
    width: number;
    height: number;
    [key: string]: unknown;
  }

  interface UTIFApi {
    decode(
      buffer: ArrayBuffer
    ): UTIFImage[];

    decodeImage(
      buffer: ArrayBuffer,
      ifd: UTIFImage
    ): void;

    toRGBA8(
      ifd: UTIFImage
    ): Uint8Array;

    encodeImage(
      rgba: Uint8Array,
      width: number,
      height: number
    ): ArrayBuffer;
  }

  const UTIF: UTIFApi;
  export default UTIF;
}

declare module "tga-js" {
  export default class TGA {
    load(
      data: Uint8Array
    ): void;

    getCanvas():
      HTMLCanvasElement;
  }
}

declare module "gifenc" {
  interface GIFEncoderInstance {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      options: {
        palette: unknown;
      }
    ): void;

    finish(): void;

    bytes(): Uint8Array;
  }

  export function GIFEncoder():
    GIFEncoderInstance;

  export function quantize(
    rgba: Uint8Array,
    maxColors: number
  ): unknown;

  export function applyPalette(
    rgba: Uint8Array,
    palette: unknown
  ): Uint8Array;
}