import path from "path";
import { createWorkerConverter } from "@matbee/libreoffice-converter/server";

export const runtime = "nodejs";

const wasmPath = path.join(
  process.cwd(),
  "node_modules",
  "@matbee",
  "libreoffice-converter",
  "wasm"
);

const allowedMimeTypes = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream",
]);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json(
        { error: "Please choose a Word document." },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return Response.json(
        { error: "The selected file is empty." },
        { status: 400 }
      );
    }

    const extension = path.extname(file.name).toLowerCase();

    if (extension !== ".doc" && extension !== ".docx") {
      return Response.json(
        { error: "Only DOC and DOCX files are supported." },
        { status: 400 }
      );
    }

    if (file.type && !allowedMimeTypes.has(file.type)) {
      return Response.json(
        { error: "This does not appear to be a valid Word document." },
        { status: 400 }
      );
    }

    const input = new Uint8Array(await file.arrayBuffer());
    const converter = await createWorkerConverter({ wasmPath, workerPath: path.join(process.cwd(), "node_modules", "@matbee", "libreoffice-converter", "dist", "node.worker.cjs") });

    try {
      const result = await converter.convert(
        input,
        { outputFormat: "pdf" },
        file.name
      );

      const pdfBuffer = result.data.buffer.slice(
        result.data.byteOffset,
        result.data.byteOffset + result.data.byteLength
      ) as ArrayBuffer;

      const baseName =
        file.name
          .replace(/\.(doc|docx)$/i, "")
          .replace(/[^a-zA-Z0-9._ -]/g, "_")
          .trim() || "converted";

      const outputName = baseName + ".pdf";

      return new Response(pdfBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": "attachment; filename=\"" + outputName + "\"",
          "Content-Length": String(result.data.byteLength),
          "Cache-Control": "no-store",
        },
      });
    } finally {
      await converter.destroy();
    }
  } catch (error) {
    console.error("Word to PDF conversion error:", error);

    return Response.json(
      { error: "Unable to convert this Word document to PDF." },
      { status: 500 }
    );
  }
}
