"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  Type,
  Link as LinkIcon,
  FileInput,
  Image as ImageIcon,
  PenLine,
  Eraser,
  Highlighter,
  Shapes,
  Undo2,
  Redo2,
  Upload,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Trash2,
  Plus,
  Download,
  ChevronLeft,
  ChevronRight,
  Bold,
  Italic,
  Move,
  Copy,
} from "lucide-react";

type TextBox = {
  id: string;
  pageNumber: number;
  viewScale: number;
  viewRotation: number;
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
  angle: number;
  fontSize: number;
  fontFamily: string;
  fontName: string;
  backgroundColor: string;
  isNew?: boolean;
};
type ImageBox = {
  id: string;
  pageNumber: number;
  viewScale: number;
  viewRotation: number;
  src: string;
  mimeType: "image/png" | "image/jpeg";
  left: number;
  top: number;
  width: number;
  height: number;
};
type WhiteoutBox = {
  id: string;
  pageNumber: number;
  viewScale: number;
  viewRotation: number;
  left: number;
  top: number;
  width: number;
  height: number;
};
type AnnotateBox = WhiteoutBox;
type TextEdit = {
  text: string;
  deleted: boolean;
  bold: boolean;
  italic: boolean;
  fontSize: number;
  fontFamily: string;
  color: string;
  link: string;
  offsetX: number;
  offsetY: number;
};
type LinkBox = WhiteoutBox & {
  url: string;
};

type LinkTargetType = "url" | "email" | "phone" | "page";

type PageSize = {
  width: number;
  height: number;
};
type FormFieldType =
  | "text"
  | "multiline"
  | "checkbox"
  | "radio"
  | "dropdown";
type ShapeType =
  | "rectangle"
  | "circle"
  | "line"
  | "arrow";

type ShapeBox = WhiteoutBox & {
  shapeType: ShapeType;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
};

type FormFieldBox = WhiteoutBox & {
  fieldType: FormFieldType;
  name: string;
  value: string;
  checked?: boolean;
  options?: string[];
};

const fontOptions = [
  "Roboto",
  "Open Sans",
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Georgia",
  "Courier New",
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
  "Garamond",
  "Palatino Linotype",
  "Bookman",
  "Century Gothic",
  "Calibri",
  "Cambria",
];
function PdfPagePreview({
  pdfDoc,
  pageNumber,
  scale,
  onActivate,
}: {
  pdfDoc: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  onActivate: () => void;
}) {
  const previewCanvasRef =
    useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const renderPreview = async () => {
      const page = await pdfDoc.getPage(pageNumber);

      const viewport = page.getViewport({
        scale,
      });

      const canvas = previewCanvasRef.current;
      if (!canvas || cancelled) return;

      const context = canvas.getContext("2d");
      if (!context) return;

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      const renderTask = page.render({
  canvas,
  canvasContext: context,
  viewport,
});

      try {
        await renderTask.promise;
      } catch (err) {
        if (!cancelled) {
          console.error(err);
        }
      }
    };

    renderPreview();

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pageNumber, scale]);

  return (
    <button
      type="button"
      onClick={onActivate}
      className="block border-0 bg-transparent p-0"
      title={`Edit page ${pageNumber}`}
    >
      <canvas
        ref={previewCanvasRef}
        className="block bg-white shadow-xl"
      />
    </button>
  );
}
export default function EditPdfPage() {
  const measureTextBox = (
  text: string,
  fontSize: number,
  fontFamily: string,
  bold: boolean,
  italic: boolean
) => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  const safeText = text || " ";

  if (!context) {
    return {
  width: Math.max(
    8,
    safeText.length * fontSize * 0.58 + 3
  ),
  height: Math.max(
    fontSize + 3,
    fontSize * 1.08
  ),
};
  }

  context.font = `${italic ? "italic " : ""}${
    bold ? "700 " : "400 "
  }${fontSize}px ${fontFamily}`;

  const lines = safeText.split("\n");

  const widestLine = Math.max(
    ...lines.map((line) =>
      context.measureText(line || " ").width
    )
  );

  return {
  width: Math.max(
    8,
    Math.ceil(widestLine) + 3
  ),

  height: Math.max(
    fontSize + 3,
    Math.ceil(lines.length * fontSize * 1.08) + 2
  ),
};
};
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
const [pdfSourceBytes, setPdfSourceBytes] =
  useState<Uint8Array | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);

  const [scale, setScale] = useState(1.3);
  const [rotation, setRotation] = useState(0);

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");

  const [pageSize, setPageSize] = useState<PageSize>({
    width: 0,
    height: 0,
  });
  const [emptyPageTemplate, setEmptyPageTemplate] = useState<{
  width: number;
  height: number;
  rotation: number;
} | null>(null);

  const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
  const [imageBoxes, setImageBoxes] = useState<ImageBox[]>([]);
  const [whiteoutBoxes, setWhiteoutBoxes] = useState<WhiteoutBox[]>([]);
  const [draftWhiteout, setDraftWhiteout] = useState<WhiteoutBox | null>(null);
  const [annotateBoxes, setAnnotateBoxes] = useState<AnnotateBox[]>([]);
const [draftAnnotate, setDraftAnnotate] = useState<AnnotateBox | null>(null);
const [selectedAnnotateId, setSelectedAnnotateId] = useState<string | null>(null);
const [linkBoxes, setLinkBoxes] = useState<LinkBox[]>([]);
const [draftLinkBox, setDraftLinkBox] = useState<LinkBox | null>(null);
const [selectedLinkBoxId, setSelectedLinkBoxId] =
  useState<string | null>(null);
  const [selectedWhiteoutId, setSelectedWhiteoutId] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  const [textEdits, setTextEdits] = useState<Record<string, TextEdit>>({});
  const [editBoxes, setEditBoxes] = useState<Record<string, TextBox>>({});
  const [moveMode, setMoveMode] = useState(false);
  const [isTextDragging, setIsTextDragging] = useState(false);
  const [textSnapGuides, setTextSnapGuides] = useState<{
  x?: number;
  y?: number;
}>({});
  const [imageMoveMode, setImageMoveMode] = useState(false);
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [signDialogMode, setSignDialogMode] =
  useState<"type" | "draw" | "upload" | "camera">("type");
  const [typedSignature, setTypedSignature] = useState("");
  const [typedSignatureStyle, setTypedSignatureStyle] = useState(0);
  const [addTextMode, setAddTextMode] = useState(false);
  const [whiteoutMode, setWhiteoutMode] = useState(false);
  const [annotateMode, setAnnotateMode] = useState(false);
  const [linkAreaMode, setLinkAreaMode] = useState(false);
  const [showFormsMenu, setShowFormsMenu] = useState(false);
  const [showShapesMenu, setShowShapesMenu] = useState(false);

const [shapeMode, setShapeMode] =
  useState<ShapeType | null>(null);

const [shapeBoxes, setShapeBoxes] =
  useState<ShapeBox[]>([]);

const [draftShapeBox, setDraftShapeBox] =
  useState<ShapeBox | null>(null);

const [selectedShapeId, setSelectedShapeId] =
  useState<string | null>(null);
  const [showShapeProperties, setShowShapeProperties] =
  useState(false);

const [formFieldMode, setFormFieldMode] =
  useState<FormFieldType | null>(null);

const [formFields, setFormFields] = useState<FormFieldBox[]>([]);
const [draftFormField, setDraftFormField] =
  useState<FormFieldBox | null>(null);

  const [selectedFormFieldId, setSelectedFormFieldId] =
  useState<string | null>(null);

const [showFormProperties, setShowFormProperties] =
  useState(false);
const [showLinkProperties, setShowLinkProperties] = useState(false);
const [linkTargetType, setLinkTargetType] =
  useState<LinkTargetType>("url");
const [linkTargetValue, setLinkTargetValue] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const signatureImageInputRef = useRef<HTMLInputElement>(null);
  const signatureCameraVideoRef = useRef<HTMLVideoElement>(null);
const signatureCameraStreamRef = useRef<MediaStream | null>(null);
const signatureDrawingRef = useRef(false);
  const duplicateCounterRef = useRef(0);
  const newTextCounterRef = useRef(0);
  const imageCounterRef = useRef(0);
  const whiteoutCounterRef = useRef(0);
  const annotateCounterRef = useRef(0);
  const linkCounterRef = useRef(0);

const linkDragRef = useRef<{
  startX: number;
  startY: number;
} | null>(null);
const linkMoveRef = useRef<{
  id: string;
  startX: number;
  startY: number;
  initialLeft: number;
  initialTop: number;
  moved: boolean;
} | null>(null);
  const whiteoutDragRef = useRef<{
  startX: number;
  startY: number;
} | null>(null);
const annotateDragRef = useRef<{
  startX: number;
  startY: number;
} | null>(null);
const whiteoutMoveRef = useRef<{
  id: string;
  startX: number;
  startY: number;
  initialLeft: number;
  initialTop: number;
} | null>(null);
const annotateMoveRef = useRef<{
  id: string;
  startX: number;
  startY: number;
  initialLeft: number;
  initialTop: number;
} | null>(null);
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);
  const textClickRef = useRef<{
  id: string;
  time: number;
} | null>(null);

const pendingCaretRef = useRef<{
  id: string;
  clientX: number;
} | null>(null);
const imageDragRef = useRef<{
  id: string;
  startX: number;
  startY: number;
  initialLeft: number;
  initialTop: number;
} | null>(null);
const imageResizeRef = useRef<{
  id: string;
  startX: number;
  startY: number;
  initialWidth: number;
  initialHeight: number;
} | null>(null);
const formFieldCounterRef = useRef(0);
const shapeCounterRef = useRef(0);

const shapeDragRef = useRef<{
  startX: number;
  startY: number;
} | null>(null);
const shapeMoveRef = useRef<{
  id: string;
  startX: number;
  startY: number;
  initialLeft: number;
  initialTop: number;
  initialStartX: number;
  initialStartY: number;
  initialEndX: number;
  initialEndY: number;
} | null>(null);

const formFieldDragRef = useRef<{
  startX: number;
  startY: number;
} | null>(null);
const formFieldMoveRef = useRef<{
  id: string;
  startX: number;
  startY: number;
  initialLeft: number;
  initialTop: number;
} | null>(null);
  const tools = [
    { label: "Text", icon: Type, enabled: true },
    { label: "Links", icon: LinkIcon, enabled: true },
    { label: "Forms", icon: FileInput, enabled: true },
    { label: "Images", icon: ImageIcon, enabled: true },
    { label: "Sign", icon: PenLine, enabled: true },
    { label: "Whiteout", icon: Eraser, enabled: true },
    { label: "Annotate", icon: Highlighter, enabled: true },
    { label: "Shapes", icon: Shapes, enabled: true },
  ];

  const selectedBox =
    textBoxes.find((box) => box.id === selectedTextId) || null;
const selectedImageBox =
  imageBoxes.find((imageBox) => imageBox.id === selectedImageId) || null;
  const selectedWhiteoutBox =
  whiteoutBoxes.find((box) => box.id === selectedWhiteoutId) || null;
  const selectedAnnotateBox =
  annotateBoxes.find((box) => box.id === selectedAnnotateId) || null;
  const selectedLinkBox =
  linkBoxes.find((box) => box.id === selectedLinkBoxId) || null;
  const selectedFormField =
  formFields.find(
    (field) => field.id === selectedFormFieldId
  ) ?? null;
  const selectedShape =
  shapeBoxes.find(
    (shape) => shape.id === selectedShapeId
  ) ?? null;
  const deleteSelectedImage = () => {
  if (!selectedImageId) return;

  setImageBoxes((current) =>
    current.filter((imageBox) => imageBox.id !== selectedImageId)
  );

  setSelectedImageId(null);
};
const deleteSelectedWhiteout = () => {
  if (!selectedWhiteoutId) return;

  setWhiteoutBoxes((current) =>
    current.filter((box) => box.id !== selectedWhiteoutId)
  );

  setSelectedWhiteoutId(null);
};
const deleteSelectedAnnotate = () => {
  if (!selectedAnnotateId) return;

  setAnnotateBoxes((current) =>
    current.filter((box) => box.id !== selectedAnnotateId)
  );

  setSelectedAnnotateId(null);
};
const saveLinkProperties = () => {
  if (!selectedLinkBoxId || !linkTargetValue.trim()) return;

  let finalUrl = linkTargetValue.trim();

  if (linkTargetType === "url") {
    if (
      !finalUrl.startsWith("http://") &&
      !finalUrl.startsWith("https://")
    ) {
      finalUrl = `https://${finalUrl}`;
    }
  }

  if (linkTargetType === "email") {
    finalUrl = `mailto:${finalUrl}`;
  }

  if (linkTargetType === "phone") {
    finalUrl = `tel:${finalUrl}`;
  }

  if (linkTargetType === "page") {
    finalUrl = `page:${finalUrl}`;
  }

  setLinkBoxes((current) =>
    current.map((box) =>
      box.id === selectedLinkBoxId
        ? { ...box, url: finalUrl }
        : box
    )
  );

  setShowLinkProperties(false);
  setSelectedLinkBoxId(null);
};

const deleteSelectedLinkBox = () => {
  if (!selectedLinkBoxId) return;

  setLinkBoxes((current) =>
    current.filter((box) => box.id !== selectedLinkBoxId)
  );

  setSelectedLinkBoxId(null);
  setShowLinkProperties(false);
};
const closeLinkProperties = () => {
  if (selectedLinkBoxId) {
    const selectedLink = linkBoxes.find(
      (box) => box.id === selectedLinkBoxId
    );

    if (selectedLink && !selectedLink.url.trim()) {
      setLinkBoxes((current) =>
        current.filter((box) => box.id !== selectedLinkBoxId)
      );

      setSelectedLinkBoxId(null);
    }
  }

  setShowLinkProperties(false);
  setLinkAreaMode(false);
};
const handleImageResizeStart = (
  event: React.PointerEvent<HTMLDivElement>
) => {
  if (!selectedImageBox) return;

  event.preventDefault();
  event.stopPropagation();

  event.currentTarget.setPointerCapture(event.pointerId);

  imageResizeRef.current = {
    id: selectedImageBox.id,
    startX: event.clientX,
    startY: event.clientY,
    initialWidth: selectedImageBox.width,
    initialHeight: selectedImageBox.height,
  };
};

const handleImageResizeMove = (
  event: React.PointerEvent<HTMLDivElement>
) => {
  if (!selectedImageBox) return;

  const resize = imageResizeRef.current;

  if (!resize || resize.id !== selectedImageBox.id) return;

  const imageScale = scale / selectedImageBox.viewScale;

  const deltaX =
    (event.clientX - resize.startX) / imageScale;

  const aspectRatio =
    resize.initialHeight / resize.initialWidth;

  const newWidth = Math.max(
    40,
    resize.initialWidth + deltaX
  );

  const newHeight = newWidth * aspectRatio;

  setImageBoxes((current) =>
    current.map((currentImage) =>
      currentImage.id === selectedImageBox.id
        ? {
            ...currentImage,
            width: newWidth,
            height: newHeight,
          }
        : currentImage
    )
  );
};

const handleImageResizeEnd = (
  event: React.PointerEvent<HTMLDivElement>
) => {
  if (
    !selectedImageBox ||
    imageResizeRef.current?.id !== selectedImageBox.id
  ) {
    return;
  }

  imageResizeRef.current = null;

  if (
    event.currentTarget.hasPointerCapture(event.pointerId)
  ) {
    event.currentTarget.releasePointerCapture(
      event.pointerId
    );
  }
};
const startSignatureDrawing = (
  event: React.PointerEvent<HTMLCanvasElement>
) => {
  const canvas = signatureCanvasRef.current;
  if (!canvas) return;

  const context = canvas.getContext("2d");
  if (!context) return;

  event.currentTarget.setPointerCapture(event.pointerId);

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;

  context.beginPath();
  context.moveTo(x, y);
  context.lineWidth = 2;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = "#111111";

  signatureDrawingRef.current = true;
};

const drawSignature = (
  event: React.PointerEvent<HTMLCanvasElement>
) => {
  if (!signatureDrawingRef.current) return;

  const canvas = signatureCanvasRef.current;
  if (!canvas) return;

  const context = canvas.getContext("2d");
  if (!context) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;

  context.lineTo(x, y);
  context.stroke();
};

const stopSignatureDrawing = (
  event: React.PointerEvent<HTMLCanvasElement>
) => {
  signatureDrawingRef.current = false;

  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }
};
const useTypedSignature = () => {
  if (!typedSignature.trim()) return;

  const signatureStyles = [
    {
      fontFamily: "cursive",
      fontStyle: "normal",
      fontWeight: 400,
    },
    {
      fontFamily: "Georgia, serif",
      fontStyle: "italic",
      fontWeight: 400,
    },
    {
      fontFamily: "cursive",
      fontStyle: "italic",
      fontWeight: 700,
    },
    {
      fontFamily: "'Times New Roman', serif",
      fontStyle: "italic",
      fontWeight: 400,
    },
    {
  fontFamily: '"Brush Script MT", cursive',
  fontStyle: "italic",
  fontWeight: 400,
},
{
  fontFamily: '"Segoe Script", "Lucida Handwriting", cursive',
  fontStyle: "normal",
  fontWeight: 600,
  
},
{
  fontFamily: '"Brush Script MT", "Segoe Script", cursive',
  fontStyle: "italic",
  fontWeight: 700,
},
{
  fontFamily: '"Lucida Handwriting", "Segoe Script", cursive',
  fontStyle: "normal",
  fontWeight: 400,
},
  ];

  const selectedStyle =
    signatureStyles[typedSignatureStyle] ||
    signatureStyles[0];

  const canvas = document.createElement("canvas");
  canvas.width = 500;
  canvas.height = 160;

  const context = canvas.getContext("2d");
  if (!context) return;

  context.clearRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "#111111";
  context.textAlign = "center";
  context.textBaseline = "middle";

  context.font = `${selectedStyle.fontStyle} ${selectedStyle.fontWeight} 72px ${selectedStyle.fontFamily}`;

  context.fillText(
    typedSignature.trim(),
    canvas.width / 2,
    canvas.height / 2
  );

  const src = canvas.toDataURL("image/png");

  imageCounterRef.current += 1;

  const width = 220;
  const height = 70;

  const newSignature: ImageBox = {
    id: `signature-${imageCounterRef.current}`,
    pageNumber,
    viewScale: scale,
    viewRotation: rotation,
    src,
    mimeType: "image/png",
    left: Math.max(20, (pageSize.width - width) / 2),
    top: Math.max(20, (pageSize.height - height) / 2),
    width,
    height,
  };

  setImageBoxes((current) => [
    ...current,
    newSignature,
  ]);

  setSelectedImageId(newSignature.id);
  setSelectedTextId(null);

  setShowSignDialog(false);
  setSignDialogMode("type");
};
const useDrawnSignature = () => {
  const canvas = signatureCanvasRef.current;
  if (!canvas) return;

  const context = canvas.getContext("2d");
  if (!context) return;

  const imageData = context.getImageData(
    0,
    0,
    canvas.width,
    canvas.height
  );

  const hasSignature = Array.from(imageData.data).some(
    (_, index) =>
      index % 4 === 3 &&
      imageData.data[index] > 0
  );

  if (!hasSignature) return;

  const src = canvas.toDataURL("image/png");

  imageCounterRef.current += 1;

  const width = 220;
  const height = width * (canvas.height / canvas.width);

  const newSignature: ImageBox = {
    id: `signature-${imageCounterRef.current}`,
    pageNumber,
    viewScale: scale,
    viewRotation: rotation,
    src,
    mimeType: "image/png",
    left: Math.max(20, (pageSize.width - width) / 2),
    top: Math.max(20, (pageSize.height - height) / 2),
    width,
    height,
  };

  setImageBoxes((current) => [
    ...current,
    newSignature,
  ]);

  setSelectedImageId(newSignature.id);
  setSelectedTextId(null);

  context.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  setShowSignDialog(false);
  setSignDialogMode("type");
};
  const createDefaultEdit = (box: TextBox): TextEdit => ({
    text: box.text,
    deleted: false,
    bold: /Bold/i.test(box.fontName),
    italic: /(Italic|Oblique)/i.test(box.fontName),
    fontSize: box.fontSize,
    fontFamily: box.fontFamily || "Arial",
    color: "#111111",
    link: "",
    offsetX: 0,
    offsetY: 0,
  });

  const getTextEdit = (box: TextBox) => {
    return textEdits[box.id] || createDefaultEdit(box);
  };

  const updateEdit = (box: TextBox, patch: Partial<TextEdit>) => {
    setTextEdits((current) => ({
      ...current,
      [box.id]: {
        ...(current[box.id] || createDefaultEdit(box)),
        ...patch,
      },
    }));
  };

  const startEditing = (box: TextBox) => {
    setSelectedTextId(box.id);
    setMoveMode(false);
    setEditBoxes((current) => ({
  ...current,
  [box.id]: box,
}));

    setTextEdits((current) => {
      const existing = current[box.id];

      if (existing) {
        return {
          ...current,
          [box.id]: {
            ...existing,
            deleted: false,
          },
        };
      }

      return {
        ...current,
        [box.id]: createDefaultEdit(box),
      };
    });
  };

  const deleteSelectedText = () => {
    if (!selectedBox) return;

    updateEdit(selectedBox, {
      text: "",
      deleted: true,
    });

    setSelectedTextId(null);
    setMoveMode(false);
  };
const duplicateSelectedText = () => {
  if (!selectedBox) return;

  const sourceEdit = getTextEdit(selectedBox);

  duplicateCounterRef.current += 1;

const duplicateId = `duplicate-${pageNumber}-${duplicateCounterRef.current}`;

  const duplicateBox: TextBox = {
    ...selectedBox,
    id: duplicateId,
    left: selectedBox.left + 20,
    top: selectedBox.top + 20,
    isNew: true,
  };

  setTextBoxes((current) => [
    ...current,
    duplicateBox,
  ]);
   setEditBoxes((current) => ({
  ...current,
  [duplicateId]: duplicateBox,
}));
  setTextEdits((current) => ({
    ...current,
    [duplicateId]: {
      ...sourceEdit,
      deleted: false,
      offsetX: 0,
      offsetY: 0,
    },
  }));

  setSelectedTextId(duplicateId);
  setMoveMode(false);
};
const addNewTextAt = (x: number, y: number) => {
  newTextCounterRef.current += 1;

  const newId = `new-text-${pageNumber}-${newTextCounterRef.current}`;

  const newBox: TextBox = {
    id: newId,
pageNumber,
viewScale: scale,
viewRotation: rotation,
text: "",
    left: x,
    top: y,
    width: 120,
    height: 16,
    angle: 0,
    fontSize: 14,
    fontFamily: "Arial",
    fontName: "Arial",
    backgroundColor: "transparent",
    isNew: true,
  };

  setTextBoxes((current) => [
    ...current,
    newBox,
  ]);
setEditBoxes((current) => ({
  ...current,
  [newId]: newBox,
}));
  setTextEdits((current) => ({
    ...current,
    [newId]: {
      text: "",
      deleted: false,
      bold: false,
      italic: false,
      fontSize: 14,
      fontFamily: "Arial",
      color: "#111111",
      link: "",
      offsetX: 0,
      offsetY: 0,
    },
  }));

  setSelectedTextId(newId);
  setMoveMode(false);
  setAddTextMode(false);
};
const startWhiteout = (
  event: React.PointerEvent<HTMLDivElement>
) => {
  if (!whiteoutMode) return;

  event.preventDefault();
  event.stopPropagation();

  const rect = event.currentTarget.getBoundingClientRect();

  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  whiteoutCounterRef.current += 1;

  const newWhiteout: WhiteoutBox = {
    id: `whiteout-${pageNumber}-${whiteoutCounterRef.current}`,
    pageNumber,
    viewScale: scale,
    viewRotation: rotation,
    left: x,
    top: y,
    width: 0,
    height: 0,
  };

  whiteoutDragRef.current = {
    startX: x,
    startY: y,
  };

  setDraftWhiteout(newWhiteout);

  event.currentTarget.setPointerCapture(event.pointerId);
};
const moveWhiteout = (
  event: React.PointerEvent<HTMLDivElement>
) => {
  if (!whiteoutMode) return;

  const drag = whiteoutDragRef.current;
  if (!drag) return;

  const rect = event.currentTarget.getBoundingClientRect();

  const currentX = event.clientX - rect.left;
  const currentY = event.clientY - rect.top;

  const left = Math.min(drag.startX, currentX);
  const top = Math.min(drag.startY, currentY);

  const width = Math.abs(currentX - drag.startX);
  const height = Math.abs(currentY - drag.startY);

  setDraftWhiteout((current) =>
    current
      ? {
          ...current,
          left,
          top,
          width,
          height,
        }
      : null
  );
};
const endWhiteout = (
  event: React.PointerEvent<HTMLDivElement>
) => {
  if (!whiteoutMode) return;

  const currentWhiteout = draftWhiteout;

  whiteoutDragRef.current = null;

  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  if (
    currentWhiteout &&
    currentWhiteout.width > 2 &&
    currentWhiteout.height > 2
  ) {
    setWhiteoutBoxes((current) => [
      ...current,
      currentWhiteout,
    ]);
  }

  setDraftWhiteout(null);
};
const startWhiteoutMove = (
  event: React.PointerEvent<HTMLDivElement>,
  box: WhiteoutBox
) => {
  event.preventDefault();
  event.stopPropagation();

  setSelectedWhiteoutId(box.id);
  setSelectedTextId(null);
  setSelectedImageId(null);

  whiteoutMoveRef.current = {
    id: box.id,
    startX: event.clientX,
    startY: event.clientY,
    initialLeft: box.left,
    initialTop: box.top,
  };

  event.currentTarget.setPointerCapture(event.pointerId);
};
const moveWhiteoutBox = (
  event: React.PointerEvent<HTMLDivElement>
) => {
  const move = whiteoutMoveRef.current;
  if (!move) return;

  const box = whiteoutBoxes.find(
    (currentBox) => currentBox.id === move.id
  );

  if (!box) return;

  const whiteoutScale = scale / box.viewScale;

  const deltaX =
    (event.clientX - move.startX) / whiteoutScale;

  const deltaY =
    (event.clientY - move.startY) / whiteoutScale;

  setWhiteoutBoxes((current) =>
    current.map((currentBox) =>
      currentBox.id === move.id
        ? {
            ...currentBox,
            left: move.initialLeft + deltaX,
            top: move.initialTop + deltaY,
          }
        : currentBox
    )
  );
};
const endWhiteoutMove = (
  event: React.PointerEvent<HTMLDivElement>
) => {
  const move = whiteoutMoveRef.current;
  if (!move) return;

  whiteoutMoveRef.current = null;

  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }
};
const startAnnotate = (
  event: React.PointerEvent<HTMLDivElement>
) => {
  if (!annotateMode) return;

  event.preventDefault();
  event.stopPropagation();

  const rect = event.currentTarget.getBoundingClientRect();

  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  annotateCounterRef.current += 1;

  const newAnnotate: AnnotateBox = {
    id: `annotate-${pageNumber}-${annotateCounterRef.current}`,
    pageNumber,
    viewScale: scale,
    viewRotation: rotation,
    left: x,
    top: y,
    width: 0,
    height: 0,
  };

  annotateDragRef.current = {
    startX: x,
    startY: y,
  };

  setDraftAnnotate(newAnnotate);

  event.currentTarget.setPointerCapture(event.pointerId);
};

const moveAnnotate = (
  event: React.PointerEvent<HTMLDivElement>
) => {
  if (!annotateMode) return;

  const drag = annotateDragRef.current;
  if (!drag) return;

  const rect = event.currentTarget.getBoundingClientRect();

  const currentX = event.clientX - rect.left;
  const currentY = event.clientY - rect.top;

  const left = Math.min(drag.startX, currentX);
  const top = Math.min(drag.startY, currentY);
  const width = Math.abs(currentX - drag.startX);
  const height = Math.abs(currentY - drag.startY);

  setDraftAnnotate((current) =>
    current
      ? {
          ...current,
          left,
          top,
          width,
          height,
        }
      : null
  );
};

const endAnnotate = (
  event: React.PointerEvent<HTMLDivElement>
) => {
  if (!annotateMode) return;

  const currentAnnotate = draftAnnotate;

  annotateDragRef.current = null;

  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  if (
    currentAnnotate &&
    currentAnnotate.width > 2 &&
    currentAnnotate.height > 2
  ) {
    setAnnotateBoxes((current) => [
      ...current,
      currentAnnotate,
    ]);
  }

  setDraftAnnotate(null);
};
const startLinkArea = (
  event: React.PointerEvent<HTMLDivElement>
) => {
  if (!linkAreaMode) return;

  event.preventDefault();
  event.stopPropagation();

  const rect = event.currentTarget.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  linkCounterRef.current += 1;

  const newLink: LinkBox = {
    id: `link-${pageNumber}-${linkCounterRef.current}`,
    pageNumber,
    viewScale: scale,
    viewRotation: rotation,
    left: x,
    top: y,
    width: 0,
    height: 0,
    url: "",
  };

  linkDragRef.current = {
    startX: x,
    startY: y,
  };

  setDraftLinkBox(newLink);
  event.currentTarget.setPointerCapture(event.pointerId);
};

const moveLinkArea = (
  event: React.PointerEvent<HTMLDivElement>
) => {
  if (!linkAreaMode) return;

  const drag = linkDragRef.current;
  if (!drag) return;

  const rect = event.currentTarget.getBoundingClientRect();
  const currentX = event.clientX - rect.left;
  const currentY = event.clientY - rect.top;

  setDraftLinkBox((current) =>
    current
      ? {
          ...current,
          left: Math.min(drag.startX, currentX),
          top: Math.min(drag.startY, currentY),
          width: Math.abs(currentX - drag.startX),
          height: Math.abs(currentY - drag.startY),
        }
      : null
  );
};

const endLinkArea = (
  event: React.PointerEvent<HTMLDivElement>
) => {
  if (!linkAreaMode) return;

  const currentLink = draftLinkBox;
  linkDragRef.current = null;

  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  if (
    currentLink &&
    currentLink.width > 5 &&
    currentLink.height > 5
  ) {
    setLinkBoxes((current) => [...current, currentLink]);
    setSelectedLinkBoxId(currentLink.id);
    setLinkTargetType("url");
    setLinkTargetValue("");
    setShowLinkProperties(true);
    setLinkAreaMode(false);
  }

  setDraftLinkBox(null);
};
const startLinkMove = (
  event: React.PointerEvent<HTMLDivElement>,
  box: LinkBox
) => {
  if (linkAreaMode) return;

  event.preventDefault();
  event.stopPropagation();

  setSelectedLinkBoxId(box.id);

  linkMoveRef.current = {
    id: box.id,
    startX: event.clientX,
    startY: event.clientY,
    initialLeft: box.left,
    initialTop: box.top,
    moved: false,
  };

  event.currentTarget.setPointerCapture(event.pointerId);
};

const moveLinkBox = (
  event: React.PointerEvent<HTMLDivElement>
) => {
  const move = linkMoveRef.current;
  if (!move) return;

  const box = linkBoxes.find((item) => item.id === move.id);
  if (!box) return;

  const linkScale = scale / box.viewScale;

  const deltaX = (event.clientX - move.startX) / linkScale;
  const deltaY = (event.clientY - move.startY) / linkScale;

  if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
    move.moved = true;
  }

  setLinkBoxes((current) =>
    current.map((item) =>
      item.id === move.id
        ? {
            ...item,
            left: move.initialLeft + deltaX,
            top: move.initialTop + deltaY,
          }
        : item
    )
  );
};

const endLinkMove = (
  event: React.PointerEvent<HTMLDivElement>,
  box: LinkBox
) => {
  const move = linkMoveRef.current;
  if (!move) return;

  linkMoveRef.current = null;

  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  if (!move.moved) {
    if (box.url.startsWith("mailto:")) {
      setLinkTargetType("email");
      setLinkTargetValue(box.url.replace(/^mailto:/, ""));
    } else if (box.url.startsWith("tel:")) {
      setLinkTargetType("phone");
      setLinkTargetValue(box.url.replace(/^tel:/, ""));
    } else if (box.url.startsWith("page:")) {
      setLinkTargetType("page");
      setLinkTargetValue(box.url.replace(/^page:/, ""));
    } else {
      setLinkTargetType("url");
      setLinkTargetValue(box.url);
    }

    setShowLinkProperties(true);
  }
};
const startFormField = (
  event: React.PointerEvent<HTMLDivElement>
) => {
  if (!formFieldMode) return;

  event.preventDefault();
  event.stopPropagation();

  const rect = event.currentTarget.getBoundingClientRect();

  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  formFieldCounterRef.current += 1;

  const newField: FormFieldBox = {
    id: `form-${pageNumber}-${formFieldCounterRef.current}`,
    pageNumber,
    viewScale: scale,
    viewRotation: rotation,
    left: x,
    top: y,
    width: 0,
    height: 0,
    fieldType: formFieldMode,
    name: `Field_${formFieldCounterRef.current}`,
    value: "",
    checked: false,
    options:
      formFieldMode === "dropdown"
        ? ["Option 1", "Option 2"]
        : undefined,
  };

  formFieldDragRef.current = {
    startX: x,
    startY: y,
  };

  setDraftFormField(newField);

  event.currentTarget.setPointerCapture(event.pointerId);
};

const moveFormField = (
  event: React.PointerEvent<HTMLDivElement>
) => {
  if (!formFieldMode) return;

  const drag = formFieldDragRef.current;
  if (!drag) return;

  const rect = event.currentTarget.getBoundingClientRect();

  const currentX = event.clientX - rect.left;
  const currentY = event.clientY - rect.top;

  setDraftFormField((current) =>
    current
      ? {
          ...current,
          left: Math.min(drag.startX, currentX),
          top: Math.min(drag.startY, currentY),
          width: Math.abs(currentX - drag.startX),
          height: Math.abs(currentY - drag.startY),
        }
      : null
  );
};

const endFormField = (
  event: React.PointerEvent<HTMLDivElement>
) => {
  if (!formFieldMode) return;

  const currentField = draftFormField;

  formFieldDragRef.current = null;

  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  if (
  currentField &&
  currentField.width > 5 &&
  currentField.height > 5
) {
  let finalField = currentField;

  if (
    currentField.fieldType === "checkbox" ||
    currentField.fieldType === "radio"
  ) {
    finalField = {
      ...currentField,
      width: 22,
      height: 22,
    };
  }

  if (currentField.fieldType === "text") {
    finalField = {
      ...currentField,
      width: Math.max(currentField.width, 140),
      height: 28,
    };
  }

  if (currentField.fieldType === "multiline") {
    finalField = {
      ...currentField,
      width: Math.max(currentField.width, 160),
      height: Math.max(currentField.height, 70),
    };
  }

  if (currentField.fieldType === "dropdown") {
    finalField = {
      ...currentField,
      width: Math.max(currentField.width, 140),
      height: 30,
    };
  }

  setFormFields((current) => [
    ...current,
    finalField,
  ]);

  setSelectedFormFieldId(finalField.id);
}

  setDraftFormField(null);
  setFormFieldMode(null);
};
const startShape = (
  event: React.PointerEvent<HTMLDivElement>
) => {
  if (!shapeMode) return;

  event.preventDefault();
  event.stopPropagation();

  const rect = event.currentTarget.getBoundingClientRect();

  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  shapeCounterRef.current += 1;

  const newShape: ShapeBox = {
    id: `shape-${pageNumber}-${shapeCounterRef.current}`,
    pageNumber,
    viewScale: scale,
    viewRotation: rotation,
    left: x,
    top: y,
    width: 0,
    height: 0,
    shapeType: shapeMode,
    strokeColor: "#1d4ed8",
fillColor: "#ffffff",
strokeWidth: 2,
opacity: 1,
    startX: x,
    startY: y,
    endX: x,
    endY: y,
  };

  shapeDragRef.current = {
    startX: x,
    startY: y,
  };

  setDraftShapeBox(newShape);

  event.currentTarget.setPointerCapture(event.pointerId);
};

const moveShape = (
  event: React.PointerEvent<HTMLDivElement>
) => {
  if (!shapeMode) return;

  const drag = shapeDragRef.current;
  if (!drag) return;

  const rect = event.currentTarget.getBoundingClientRect();

  const currentX = event.clientX - rect.left;
  const currentY = event.clientY - rect.top;

  setDraftShapeBox((current) =>
    current
      ? {
          ...current,
          left: Math.min(drag.startX, currentX),
          top: Math.min(drag.startY, currentY),
          width: Math.abs(currentX - drag.startX),
          height: Math.abs(currentY - drag.startY),
          endX: currentX,
          endY: currentY,
        }
      : null
  );
};

const endShape = (
  event: React.PointerEvent<HTMLDivElement>
) => {
  if (!shapeMode) return;

  const drag = shapeDragRef.current;

  if (!drag || !draftShapeBox) {
    setDraftShapeBox(null);
    setShapeMode(null);
    return;
  }

  const rect = event.currentTarget.getBoundingClientRect();

  const endX = event.clientX - rect.left;
  const endY = event.clientY - rect.top;

  const width = Math.abs(endX - drag.startX);
  const height = Math.abs(endY - drag.startY);

  const finalShape: ShapeBox = {
    ...draftShapeBox,
    left: Math.min(drag.startX, endX),
    top: Math.min(drag.startY, endY),
    width,
    height,
    startX: drag.startX,
    startY: drag.startY,
    endX,
    endY,
  };

  const lineLength = Math.hypot(
    endX - drag.startX,
    endY - drag.startY
  );

  const isValid =
    shapeMode === "line" || shapeMode === "arrow"
      ? lineLength > 5
      : width > 5 && height > 5;

  if (isValid) {
    setShapeBoxes((current) => [
      ...current,
      finalShape,
    ]);

    setSelectedShapeId(finalShape.id);
  }

  shapeDragRef.current = null;

  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  setDraftShapeBox(null);
  setShapeMode(null);
};
const startShapeMove = (
  event: React.PointerEvent<HTMLDivElement>,
  shape: ShapeBox
) => {
  if (shapeMode) return;

  event.preventDefault();
  event.stopPropagation();

  setSelectedShapeId(shape.id);

  shapeMoveRef.current = {
    id: shape.id,
    startX: event.clientX,
    startY: event.clientY,
    initialLeft: shape.left,
    initialTop: shape.top,
    initialStartX: shape.startX,
    initialStartY: shape.startY,
    initialEndX: shape.endX,
    initialEndY: shape.endY,
  };

  event.currentTarget.setPointerCapture(event.pointerId);
};

const moveShapeBox = (
  event: React.PointerEvent<HTMLDivElement>,
  shape: ShapeBox
) => {
  const move = shapeMoveRef.current;

  if (!move || move.id !== shape.id) return;

  event.preventDefault();
  event.stopPropagation();

  const shapeScale = scale / shape.viewScale;

  const deltaX =
    (event.clientX - move.startX) / shapeScale;

  const deltaY =
    (event.clientY - move.startY) / shapeScale;

  setShapeBoxes((current) =>
    current.map((item) =>
      item.id === shape.id
        ? {
            ...item,
            left: move.initialLeft + deltaX,
            top: move.initialTop + deltaY,
            startX: move.initialStartX + deltaX,
            startY: move.initialStartY + deltaY,
            endX: move.initialEndX + deltaX,
            endY: move.initialEndY + deltaY,
          }
        : item
    )
  );
};

const endShapeMove = (
  event: React.PointerEvent<HTMLDivElement>
) => {
  event.preventDefault();
  event.stopPropagation();

  shapeMoveRef.current = null;

  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }
};
const startFormFieldMove = (
  event: React.PointerEvent<HTMLDivElement>,
  field: FormFieldBox
) => {
  if (formFieldMode) return;

  event.preventDefault();
  event.stopPropagation();

  setSelectedFormFieldId(field.id);

  formFieldMoveRef.current = {
    id: field.id,
    startX: event.clientX,
    startY: event.clientY,
    initialLeft: field.left,
    initialTop: field.top,
  };

  event.currentTarget.setPointerCapture(event.pointerId);
};

const moveFormFieldBox = (
  event: React.PointerEvent<HTMLDivElement>,
  field: FormFieldBox
) => {
  const move = formFieldMoveRef.current;

  if (!move || move.id !== field.id) return;

  event.preventDefault();
  event.stopPropagation();

  const fieldScale = scale / field.viewScale;

  const deltaX = (event.clientX - move.startX) / fieldScale;
  const deltaY = (event.clientY - move.startY) / fieldScale;

  setFormFields((current) =>
    current.map((item) =>
      item.id === field.id
        ? {
            ...item,
            left: move.initialLeft + deltaX,
            top: move.initialTop + deltaY,
          }
        : item
    )
  );
};

const endFormFieldMove = (
  event: React.PointerEvent<HTMLDivElement>
) => {
  event.preventDefault();
  event.stopPropagation();

  formFieldMoveRef.current = null;

  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }
};

const deleteSelectedFormField = () => {
  if (!selectedFormFieldId) return;

  setFormFields((current) =>
    current.filter(
      (field) => field.id !== selectedFormFieldId
    )
  );

  setSelectedFormFieldId(null);
};
const deleteSelectedShape = () => {
  if (!selectedShapeId) return;

  setShapeBoxes((current) =>
    current.filter(
      (shape) => shape.id !== selectedShapeId
    )
  );

  setSelectedShapeId(null);
};
const updateSelectedShape = (
  updates: Partial<ShapeBox>
) => {
  if (!selectedShapeId) return;

  setShapeBoxes((current) =>
    current.map((shape) =>
      shape.id === selectedShapeId
        ? { ...shape, ...updates }
        : shape
    )
  );
};

const closeShapeProperties = () => {
  setShowShapeProperties(false);
};
const updateSelectedFormField = (
  updates: Partial<FormFieldBox>
) => {
  if (!selectedFormFieldId) return;

  setFormFields((current) =>
    current.map((field) =>
      field.id === selectedFormFieldId
        ? { ...field, ...updates }
        : field
    )
  );
};

const closeFormProperties = () => {
  setShowFormProperties(false);
};
const startAnnotateMove = (
  event: React.PointerEvent<HTMLDivElement>,
  box: AnnotateBox
) => {
  event.preventDefault();
  event.stopPropagation();

  setSelectedAnnotateId(box.id);
  setSelectedWhiteoutId(null);
  setSelectedImageId(null);
  setSelectedTextId(null);

  annotateMoveRef.current = {
    id: box.id,
    startX: event.clientX,
    startY: event.clientY,
    initialLeft: box.left,
    initialTop: box.top,
  };

  event.currentTarget.setPointerCapture(event.pointerId);
};

const moveAnnotateBox = (
  event: React.PointerEvent<HTMLDivElement>
) => {
  const move = annotateMoveRef.current;
  if (!move) return;

  const box = annotateBoxes.find(
    (currentBox) => currentBox.id === move.id
  );

  if (!box) return;

  const annotateScale = scale / box.viewScale;

  const deltaX =
    (event.clientX - move.startX) / annotateScale;

  const deltaY =
    (event.clientY - move.startY) / annotateScale;

  setAnnotateBoxes((current) =>
    current.map((currentBox) =>
      currentBox.id === move.id
        ? {
            ...currentBox,
            left: move.initialLeft + deltaX,
            top: move.initialTop + deltaY,
          }
        : currentBox
    )
  );
};

const endAnnotateMove = (
  event: React.PointerEvent<HTMLDivElement>
) => {
  if (!annotateMoveRef.current) return;

  annotateMoveRef.current = null;

  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }
};
  const createLink = () => {
    if (!selectedBox) return;

    const current = getTextEdit(selectedBox);

    const url = window.prompt(
      "Enter link URL:",
      current.link || "https://"
    );

    if (url === null) return;

    updateEdit(selectedBox, {
      link: url.trim(),
    });
  };
const groupTextIntoLines = (boxes: TextBox[]): TextBox[] => {
  if (!boxes.length) return [];

  const sorted = [...boxes].sort((a, b) => {
    const verticalDifference = a.top - b.top;

    if (Math.abs(verticalDifference) > 3) {
      return verticalDifference;
    }

    return a.left - b.left;
  });

  const grouped: TextBox[] = [];

  for (const box of sorted) {
    const previous = grouped[grouped.length - 1];

    if (!previous) {
      grouped.push({ ...box });
      continue;
    }

    const sameLine =
      Math.abs(previous.top - box.top) <=
      Math.max(previous.height, box.height) * 0.35;

    const previousRight =
      previous.left + previous.width;

    const gap =
      box.left - previousRight;

    const closeEnough =
      gap >= -2 &&
      gap <=
        Math.max(
          previous.fontSize * 1.5,
          box.fontSize * 1.5,
          14
        );

    const similarSize =
      Math.abs(
        previous.fontSize - box.fontSize
      ) <=
      Math.max(previous.fontSize, box.fontSize) * 0.2;

    const sameFont =
  previous.fontFamily === box.fontFamily;

const sameStyle =
  /Bold/i.test(previous.fontName) ===
    /Bold/i.test(box.fontName) &&
  /(Italic|Oblique)/i.test(previous.fontName) ===
    /(Italic|Oblique)/i.test(box.fontName);

    if (
  sameLine &&
  closeEnough &&
  similarSize &&
  sameFont &&
  sameStyle
) {
      const needsSpace =
        gap >
        Math.max(
          previous.fontSize * 0.15,
          1
        );

      previous.text =
        previous.text +
        (needsSpace ? " " : "") +
        box.text;

      previous.width =
        Math.max(
          previousRight,
          box.left + box.width
        ) - previous.left;

      previous.height =
        Math.max(
          previous.height,
          box.height
        );

      previous.id =
        `${previous.id}-${box.id}`;
    } else {
      grouped.push({ ...box });
    }
  }

  return grouped;
};
  const sampleBackgroundColor = (
  context: CanvasRenderingContext2D,
  left: number,
  top: number,
  width: number,
  height: number,
  outputScale = 1
) => {
    const points = [
      [left - 3, top - 3],
      [left + width + 3, top - 3],
      [left - 3, top + height + 3],
      [left + width + 3, top + height + 3],
    ];

    const colors: number[][] = [];

    for (const point of points) {
      const x = Math.max(
  0,
  Math.min(
    context.canvas.width - 1,
    Math.round(point[0] * outputScale)
  )
);

const y = Math.max(
  0,
  Math.min(
    context.canvas.height - 1,
    Math.round(point[1] * outputScale)
  )
);

      try {
        const data = context.getImageData(x, y, 1, 1).data;

        colors.push([data[0], data[1], data[2]]);
      } catch {
        // Ignore pixel sampling errors.
      }
    }

    if (!colors.length) {
      return "rgb(255,255,255)";
    }

    const average = [0, 1, 2].map((channel) =>
      Math.round(
        colors.reduce((sum, color) => sum + color[channel], 0) /
          colors.length
      )
    );

    return `rgb(${average[0]}, ${average[1]}, ${average[2]})`;
  };
const handleImageFile = (selectedFile?: File) => {
  if (!selectedFile) return;

  if (
    selectedFile.type !== "image/png" &&
    selectedFile.type !== "image/jpeg"
  ) {
    alert("Please select a PNG or JPG image.");
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    const src = reader.result as string;
    const image = new Image();

    image.onload = () => {
      imageCounterRef.current += 1;

      const maxWidth = 220;
      const width = Math.min(image.naturalWidth, maxWidth);
      const height =
        (image.naturalHeight / image.naturalWidth) * width;

      const newImage: ImageBox = {
        id: `image-${imageCounterRef.current}`,
        pageNumber,
        viewScale: scale,
        viewRotation: rotation,
        src,
        mimeType: selectedFile.type as
          | "image/png"
          | "image/jpeg",
        left: Math.max(20, (pageSize.width - width) / 2),
        top: Math.max(20, (pageSize.height - height) / 2),
        width,
        height,
      };

      setImageBoxes((current) => [...current, newImage]);
      setSelectedImageId(newImage.id);
setSelectedTextId(null);
    };

    image.src = src;
  };

  reader.readAsDataURL(selectedFile);
};
const handleSignatureImageFile = (selectedFile?: File) => {
  if (!selectedFile) return;

  handleImageFile(selectedFile);

  setShowSignDialog(false);
  setSignDialogMode("type");
};
const startSignatureCamera = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });

    signatureCameraStreamRef.current = stream;

    const video = signatureCameraVideoRef.current;

    if (video) {
      video.srcObject = stream;
      await video.play();
    }
  } catch {
    alert("Unable to access camera. Please allow camera permission.");
  }
};

const stopSignatureCamera = () => {
  const stream = signatureCameraStreamRef.current;

  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }

  signatureCameraStreamRef.current = null;

  const video = signatureCameraVideoRef.current;

  if (video) {
    video.srcObject = null;
  }
};
const captureSignatureCamera = () => {
  const video = signatureCameraVideoRef.current;
  if (!video || !video.videoWidth || !video.videoHeight) return;

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context = canvas.getContext("2d");
  if (!context) return;

  context.drawImage(
    video,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const src = canvas.toDataURL("image/png");

  imageCounterRef.current += 1;

  const width = 220;
  const height =
    width * (canvas.height / canvas.width);

  const newImage: ImageBox = {
    id: `signature-camera-${imageCounterRef.current}`,
    pageNumber,
    viewScale: scale,
    viewRotation: rotation,
    src,
    mimeType: "image/png",
    left: Math.max(20, (pageSize.width - width) / 2),
    top: Math.max(20, (pageSize.height - height) / 2),
    width,
    height,
  };

  setImageBoxes((current) => [
    ...current,
    newImage,
  ]);

  setSelectedImageId(newImage.id);
  setSelectedTextId(null);

  stopSignatureCamera();

  setShowSignDialog(false);
  setSignDialogMode("type");
};
  const handleFile = async (selectedFile?: File) => {
    if (!selectedFile) return;

    if (selectedFile.type !== "application/pdf") {
      alert("Please select a PDF file.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const pdfjsLib = await import("pdfjs-dist");

      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      const arrayBuffer = await selectedFile.arrayBuffer();

const sourceBytes = new Uint8Array(arrayBuffer);

setPdfSourceBytes(sourceBytes.slice());

const loadedPdf = await pdfjsLib.getDocument({
  data: sourceBytes,
}).promise;

      setFile(selectedFile);
      setPdfDoc(loadedPdf);

      setPageCount(loadedPdf.numPages);
      setPageNumber(1);

      setScale(1.3);
      setRotation(0);

      setTextBoxes([]);
      setSelectedTextId(null);
      setTextEdits({});
      setEditBoxes({});
    } catch (err) {
      console.error(err);

      setError("Unable to open this PDF. Please try another file.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let cancelled = false;

    let renderTask:
      | {
          promise: Promise<void>;
          cancel: () => void;
        }
      | null = null;

    const renderPage = async () => {
      try {
        setRendering(true);
        setSelectedTextId(null);
        setMoveMode(false);
        setTextBoxes([]);

        const page = await pdfDoc.getPage(pageNumber);

        if (cancelled) return;

        const viewport = page.getViewport({
          scale,
          rotation,
        });

        const canvas = canvasRef.current;

        if (!canvas) return;

        const context = canvas.getContext("2d");

        if (!context) return;

        const width = viewport.width;
const height = viewport.height;

const outputScale = Math.min(
  Math.max(window.devicePixelRatio || 1, 2),
  3
);

canvas.width = Math.floor(width * outputScale);
canvas.height = Math.floor(height * outputScale);

canvas.style.width = `${width}px`;
canvas.style.height = `${height}px`;

setPageSize({
  width,
  height,
});

context.setTransform(1, 0, 0, 1, 0, 0);

context.clearRect(
  0,
  0,
  canvas.width,
  canvas.height
);

renderTask = page.render({
  canvasContext: context,
  viewport,
  canvas,

  transform: [
    outputScale,
    0,
    0,
    outputScale,
    0,
    0,
  ],
});

        await renderTask.promise;

        if (cancelled) return;

        const textContent = await page.getTextContent();

        const pdfjsLib = await import("pdfjs-dist");

        const extractedText: TextBox[] = textContent.items.flatMap(
          (item, index) => {
            if (!("str" in item)) return [];
            if (!item.str.trim()) return [];

            const transformed = pdfjsLib.Util.transform(
              viewport.transform,
              item.transform
            );

            const angle =
              (Math.atan2(transformed[1], transformed[0]) * 180) / Math.PI;

            const fontHeight = Math.max(
              Math.hypot(transformed[2], transformed[3]),
              6
            );

            const textWidth = Math.max(Math.abs(item.width * scale), 4);

            const left = transformed[4];

            const top = transformed[5] - fontHeight;

            const textStyle = textContent.styles[item.fontName];
const commonObjs = page.commonObjs as unknown as {
  has: (id: string) => boolean;
  get: (id: string) => {
    name?: string;
    loadedName?: string;
    fallbackName?: string;
  };
};

const fontData = commonObjs.has(item.fontName)
  ? commonObjs.get(item.fontName)
  : undefined;

const rawFontName =
  fontData?.name ||
  fontData?.loadedName ||
  textStyle?.fontFamily ||
  item.fontName ||
  "Arial";

const fontFamily = rawFontName
  .replace(/^[A-Z]{6}\+/, "")
  .replace(
    /[-\s]?(BoldItalic|BoldOblique|Bold|Italic|Oblique)$/i,
    ""
  )
  .trim();

            return [
              {
                id: `${pageNumber}-${index}`,
pageNumber,
viewScale: scale,
viewRotation: rotation,
text: item.str,

                left,
                top,

                width: textWidth,
                height: fontHeight,

                angle,

                fontSize: fontHeight,

                fontFamily,
fontName: rawFontName,

                backgroundColor: sampleBackgroundColor(
  context,
  left,
  top,
  textWidth,
  fontHeight,
  outputScale
),
              },
            ];
          }
        );

        setTextBoxes(groupTextIntoLines(extractedText));
      } catch (err) {
        if (
          err instanceof Error &&
          err.name === "RenderingCancelledException"
        ) {
          return;
        }

        console.error("PDF render error:", err);
      } finally {
        if (!cancelled) {
          setRendering(false);
        }
      }
    };

    renderPage();

    return () => {
      cancelled = true;

      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, pageNumber, scale, rotation]);
  const cssColorToRgb = (color: string) => {
  const match = color.match(
    /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/
  );

  if (!match) {
    return {
      r: 1,
      g: 1,
      b: 1,
    };
  }

  return {
    r: Number(match[1]) / 255,
    g: Number(match[2]) / 255,
    b: Number(match[3]) / 255,
  };
};
const hexColorToRgb = (color: string) => {
  const hex = color.replace("#", "");

  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
    return {
      r: 0,
      g: 0,
      b: 0,
    };
  }

  return {
    r: parseInt(hex.slice(0, 2), 16) / 255,
    g: parseInt(hex.slice(2, 4), 16) / 255,
    b: parseInt(hex.slice(4, 6), 16) / 255,
  };
};
const viewportPointToPdfPoint = async (
  x: number,
  y: number,
  targetPageNumber: number,
  viewScale: number,
  viewRotation: number
) => {
  if (!pdfDoc) {
    return null;
  }

  const page = await pdfDoc.getPage(targetPageNumber);

  const viewport = page.getViewport({
    scale: viewScale,
    rotation: viewRotation,
  });

  const [pdfX, pdfY] = viewport.convertToPdfPoint(x, y);

  return {
    x: pdfX,
    y: pdfY,
  };
};
const insertPageAt = async (
  insertIndex: number,
  referencePageNumber: number
) => {
  if (pageCount === 0) {
  if (!emptyPageTemplate) return;

  try {
    setError("");

    const { PDFDocument, degrees } = await import("pdf-lib");
    const pdfjsLib = await import("pdfjs-dist");

    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "/pdf.worker.min.mjs";

    const newPdf = await PDFDocument.create();

    const newPage = newPdf.addPage([
      emptyPageTemplate.width,
      emptyPageTemplate.height,
    ]);

    newPage.setRotation(
      degrees(emptyPageTemplate.rotation)
    );

    const updatedBytes = await newPdf.save();
    const newSourceBytes = updatedBytes.slice();

    const loadedPdf = await pdfjsLib.getDocument({
      data: newSourceBytes.slice(),
    }).promise;

    setPdfSourceBytes(newSourceBytes);
    setPdfDoc(loadedPdf);
    setPageCount(1);
    setPageNumber(1);
    setRotation(0);

    return;
  } catch (err) {
    console.error(err);
    setError("Unable to create a new page.");
    return;
  }
}

if (!pdfSourceBytes || !pdfDoc) return;

  try {
    setError("");

    const { PDFDocument } = await import("pdf-lib");
    const pdfjsLib = await import("pdfjs-dist");

    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "/pdf.worker.min.mjs";

    const workingPdf = await PDFDocument.load(
      pdfSourceBytes.slice()
    );

    const referencePage = workingPdf.getPage(
      referencePageNumber - 1
    );

    const { width, height } = referencePage.getSize();

    const newPage = workingPdf.insertPage(
      insertIndex,
      [width, height]
    );

    newPage.setRotation(referencePage.getRotation());

    const updatedBytes = await workingPdf.save();
    const newSourceBytes = updatedBytes.slice();

    const loadedPdf = await pdfjsLib.getDocument({
      data: newSourceBytes.slice(),
    }).promise;

    const shiftPage = <
      T extends { pageNumber: number },
    >(
      item: T
    ): T =>
      item.pageNumber > insertIndex
        ? {
            ...item,
            pageNumber: item.pageNumber + 1,
          }
        : item;

    setTextBoxes((current) =>
      current.map(shiftPage)
    );

    setImageBoxes((current) =>
      current.map(shiftPage)
    );

    setWhiteoutBoxes((current) =>
      current.map(shiftPage)
    );

    setAnnotateBoxes((current) =>
      current.map(shiftPage)
    );

    setLinkBoxes((current) =>
      current.map(shiftPage)
    );

    setFormFields((current) =>
      current.map(shiftPage)
    );

    setShapeBoxes((current) =>
      current.map(shiftPage)
    );

    setPdfSourceBytes(newSourceBytes);
    setPdfDoc(loadedPdf);
    setPageCount(loadedPdf.numPages);

    setPageNumber(insertIndex + 1);
    setRotation(0);

    setSelectedTextId(null);
    setSelectedImageId(null);
    setSelectedWhiteoutId(null);
    setSelectedAnnotateId(null);
    setSelectedLinkBoxId(null);
    setSelectedFormFieldId(null);
    setSelectedShapeId(null);

    setShowLinkProperties(false);
    setShowFormProperties(false);
    setShowShapeProperties(false);
  } catch (err) {
    console.error(err);
    setError("Unable to insert a new page.");
  }
};
const deletePageAt = async (
  pageToDelete: number
) => {
  if (!pdfSourceBytes || !pdfDoc) return;

  
  try {
    setError("");

    const { PDFDocument } = await import("pdf-lib");
    const pdfjsLib = await import("pdfjs-dist");

    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "/pdf.worker.min.mjs";

    const workingPdf = await PDFDocument.load(
      pdfSourceBytes.slice()
    );
if (workingPdf.getPageCount() === 1) {
  const onlyPage = workingPdf.getPage(0);

  const { width, height } = onlyPage.getSize();

  setEmptyPageTemplate({
    width,
    height,
    rotation: onlyPage.getRotation().angle,
  });

  setPdfSourceBytes(null);
  setPdfDoc(null);
  setPageCount(0);
  setPageNumber(0);
  setRotation(0);

  setTextBoxes([]);
  setImageBoxes([]);
  setWhiteoutBoxes([]);
  setAnnotateBoxes([]);
  setLinkBoxes([]);
  setFormFields([]);
  setShapeBoxes([]);

  setSelectedTextId(null);
  setSelectedImageId(null);
  setSelectedWhiteoutId(null);
  setSelectedAnnotateId(null);
  setSelectedLinkBoxId(null);
  setSelectedFormFieldId(null);
  setSelectedShapeId(null);

  setShowLinkProperties(false);
  setShowFormProperties(false);
  setShowShapeProperties(false);

  return;
}
    workingPdf.removePage(pageToDelete - 1);

    const updatedBytes = await workingPdf.save();
    const newSourceBytes = updatedBytes.slice();

    const loadedPdf = await pdfjsLib.getDocument({
      data: newSourceBytes.slice(),
    }).promise;

    const removeAndShift = <
      T extends { pageNumber: number },
    >(
      items: T[]
    ) =>
      items
        .filter(
          (item) =>
            item.pageNumber !== pageToDelete
        )
        .map((item) =>
          item.pageNumber > pageToDelete
            ? {
                ...item,
                pageNumber: item.pageNumber - 1,
              }
            : item
        );

    setTextBoxes((current) =>
      removeAndShift(current)
    );

    setImageBoxes((current) =>
      removeAndShift(current)
    );

    setWhiteoutBoxes((current) =>
      removeAndShift(current)
    );

    setAnnotateBoxes((current) =>
      removeAndShift(current)
    );

    setLinkBoxes((current) =>
      removeAndShift(current)
    );

    setFormFields((current) =>
      removeAndShift(current)
    );

    setShapeBoxes((current) =>
      removeAndShift(current)
    );

    setPdfSourceBytes(newSourceBytes);
    setPdfDoc(loadedPdf);
    setPageCount(loadedPdf.numPages);

    const nextPageNumber = Math.min(
      pageToDelete,
      loadedPdf.numPages
    );

    setPageNumber(nextPageNumber);
    setRotation(0);

    setSelectedTextId(null);
    setSelectedImageId(null);
    setSelectedWhiteoutId(null);
    setSelectedAnnotateId(null);
    setSelectedLinkBoxId(null);
    setSelectedFormFieldId(null);
    setSelectedShapeId(null);

    setShowLinkProperties(false);
    setShowFormProperties(false);
    setShowShapeProperties(false);
  } catch (err) {
    console.error(err);
    setError("Unable to delete this page.");
  }
};
const applyChanges = async () => {
  if (!file || exporting) return;

  try {
    setExporting(true);
    setSelectedTextId(null);
    setMoveMode(false);

    const {
  PDFDocument,
  StandardFonts,
  rgb,
  degrees,
  PDFName,
  PDFArray,
  PDFString,
} = await import("pdf-lib");

    const originalBytes = pdfSourceBytes
  ? pdfSourceBytes.slice()
  : new Uint8Array(await file.arrayBuffer());

    const outputPdf = await PDFDocument.load(originalBytes);
    const fontkitModule = await import("@pdf-lib/fontkit");
const fontkit = fontkitModule.default;

outputPdf.registerFontkit(fontkit);

const loadFontBytes = async (path: string) => {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Unable to load font: ${path}`);
  }

  return new Uint8Array(
    await response.arrayBuffer()
  );
};

const [
  robotoRegularBytes,
  robotoItalicBytes,
  robotoBoldBytes,
  robotoBoldItalicBytes,
] = await Promise.all([
  loadFontBytes("/fonts/roboto-400-normal.woff"),
  loadFontBytes("/fonts/roboto-400-italic.woff"),
  loadFontBytes("/fonts/roboto-700-normal.woff"),
  loadFontBytes("/fonts/roboto-700-italic.woff"),
]);
const [
  openSansRegularBytes,
  openSansItalicBytes,
  openSansBoldBytes,
  openSansBoldItalicBytes,
] = await Promise.all([
  loadFontBytes("/fonts/open-sans-400-normal.woff"),
  loadFontBytes("/fonts/open-sans-400-italic.woff"),
  loadFontBytes("/fonts/open-sans-700-normal.woff"),
  loadFontBytes("/fonts/open-sans-700-italic.woff"),
]);
const [
  robotoRegularFont,
  robotoItalicFont,
  robotoBoldFont,
  robotoBoldItalicFont,
] = await Promise.all([
  outputPdf.embedFont(robotoRegularBytes, {
    subset: true,
  }),

  outputPdf.embedFont(robotoItalicBytes, {
    subset: true,
  }),

  outputPdf.embedFont(robotoBoldBytes, {
    subset: true,
  }),

  outputPdf.embedFont(robotoBoldItalicBytes, {
    subset: true,
  }),
]);
const [
  openSansRegularFont,
  openSansItalicFont,
  openSansBoldFont,
  openSansBoldItalicFont,
] = await Promise.all([
  outputPdf.embedFont(openSansRegularBytes, {
    subset: true,
  }),

  outputPdf.embedFont(openSansItalicBytes, {
    subset: true,
  }),

  outputPdf.embedFont(openSansBoldBytes, {
    subset: true,
  }),

  outputPdf.embedFont(openSansBoldItalicBytes, {
    subset: true,
  }),
]);
    const pages = outputPdf.getPages();

    const chooseFont = (edit: TextEdit) => {
      const family = edit.fontFamily.toLowerCase();
if (family.includes("roboto")) {
  if (edit.bold && edit.italic) {
    return robotoBoldItalicFont;
  }

  if (edit.bold) {
    return robotoBoldFont;
  }

  if (edit.italic) {
    return robotoItalicFont;
  }

  return robotoRegularFont;
}
 if (family.includes("open sans")) {
  if (edit.bold && edit.italic) {
    return openSansBoldItalicFont;
  }

  if (edit.bold) {
    return openSansBoldFont;
  }

  if (edit.italic) {
    return openSansItalicFont;
  }

  return openSansRegularFont;
}     
const isTimes =
        family.includes("times") ||
        family.includes("georgia") ||
        family.includes("garamond") ||
        family.includes("cambria");

      const isCourier =
        family.includes("courier") ||
        family.includes("mono");

      if (isTimes) {
        if (edit.bold && edit.italic) {
          return StandardFonts.TimesRomanBoldItalic;
        }

        if (edit.bold) {
          return StandardFonts.TimesRomanBold;
        }

        if (edit.italic) {
          return StandardFonts.TimesRomanItalic;
        }

        return StandardFonts.TimesRoman;
      }

      if (isCourier) {
        if (edit.bold && edit.italic) {
          return StandardFonts.CourierBoldOblique;
        }

        if (edit.bold) {
          return StandardFonts.CourierBold;
        }

        if (edit.italic) {
          return StandardFonts.CourierOblique;
        }

        return StandardFonts.Courier;
      }

      if (edit.bold && edit.italic) {
        return StandardFonts.HelveticaBoldOblique;
      }

      if (edit.bold) {
        return StandardFonts.HelveticaBold;
      }

      if (edit.italic) {
        return StandardFonts.HelveticaOblique;
      }

      return StandardFonts.Helvetica;
    };

    for (const [id, edit] of Object.entries(textEdits)) {
      const box = editBoxes[id];

      if (!box) continue;

      const hasChanged =
        box.isNew ||
        edit.deleted ||
        edit.text !== box.text ||
        edit.offsetX !== 0 ||
        edit.offsetY !== 0 ||
        edit.bold ||
        edit.italic ||
        Math.abs(edit.fontSize - box.fontSize) > 0.01 ||
        edit.fontFamily !== box.fontFamily ||
        edit.color !== "#111111";

      if (!hasChanged) continue;

      const outputPage = pages[box.pageNumber - 1];

      if (!outputPage) continue;

      /*
       * REMOVE / MASK ORIGINAL TEXT
       */
      if (!box.isNew) {
        const maskTopLeft =
          await viewportPointToPdfPoint(
            box.left - 2,
            box.top - 2,
            box.pageNumber,
            box.viewScale,
            box.viewRotation
          );

        const maskBottomRight =
          await viewportPointToPdfPoint(
            box.left + box.width + 5,
            box.top +
              Math.max(
                box.height * 1.35,
                box.fontSize * 1.25
              ) +
              2,
            box.pageNumber,
            box.viewScale,
            box.viewRotation
          );

        if (maskTopLeft && maskBottomRight) {
          const background =
            cssColorToRgb(box.backgroundColor);

          const maskX = Math.min(
            maskTopLeft.x,
            maskBottomRight.x
          );

          const maskY = Math.min(
            maskTopLeft.y,
            maskBottomRight.y
          );

          const maskWidth = Math.abs(
            maskBottomRight.x - maskTopLeft.x
          );

          const maskHeight = Math.abs(
            maskBottomRight.y - maskTopLeft.y
          );

          outputPage.drawRectangle({
            x: maskX,
            y: maskY,
            width: maskWidth,
            height: maskHeight,
            color: rgb(
              background.r,
              background.g,
              background.b
            ),
          });
        }
      }

      /*
       * DELETE = only mask original,
       * don't draw replacement text.
       */
      if (edit.deleted || !edit.text.trim()) {
        continue;
      }

      /*
       * FINAL POSITION OF EDITED / NEW TEXT
       */
      const displayLeft =
        box.left + edit.offsetX;

      const displayTop =
        box.top + edit.offsetY;

      /*
       * drawText uses a baseline-like Y position,
       * so convert near the bottom of the text box.
       */
      const textPoint =
        await viewportPointToPdfPoint(
          displayLeft,
          displayTop +
            Math.max(
              edit.fontSize,
              box.height
            ),
          box.pageNumber,
          box.viewScale,
          box.viewRotation
        );

      if (!textPoint) continue;

      const selectedFont = chooseFont(edit);

const font =
  typeof selectedFont === "string"
    ? await outputPdf.embedFont(selectedFont)
    : selectedFont;

      const textColor =
        hexColorToRgb(edit.color);

      const pdfFontSize = Math.max(
        4,
        edit.fontSize /
          Math.max(box.viewScale, 0.01)
      );

      /*
       * Remove editor viewport rotation.
       * This leaves the text's intrinsic PDF rotation.
       */
      let pdfAngle =
        box.angle - box.viewRotation;

      while (pdfAngle > 180) {
        pdfAngle -= 360;
      }

      while (pdfAngle < -180) {
        pdfAngle += 360;
      }

      outputPage.drawText(edit.text, {
        x: textPoint.x,
        y: textPoint.y,

        size: pdfFontSize,

        font,

        color: rgb(
          textColor.r,
          textColor.g,
          textColor.b
        ),

        rotate: degrees(pdfAngle),

        lineHeight:
          pdfFontSize * 1.15,
      });
    }
for (const [id, edit] of Object.entries(textEdits)) {
  const box = editBoxes[id];

  if (!box || !edit.link.trim() || edit.deleted) continue;

  const outputPage = pages[box.pageNumber - 1];

  if (!outputPage) continue;

  const linkLeft = box.left + edit.offsetX;
  const linkTop = box.top + edit.offsetY;

  const linkWidth = Math.max(
    box.width,
    edit.text.length * edit.fontSize * 0.6
  );

  const linkHeight = Math.max(
    box.height,
    edit.fontSize * 1.3
  );

  const point1 = await viewportPointToPdfPoint(
    linkLeft,
    linkTop,
    box.pageNumber,
    box.viewScale,
    box.viewRotation
  );

  const point2 = await viewportPointToPdfPoint(
    linkLeft + linkWidth,
    linkTop + linkHeight,
    box.pageNumber,
    box.viewScale,
    box.viewRotation
  );
if (!point1 || !point2) continue;
  const x1 = Math.min(point1.x, point2.x);
  const y1 = Math.min(point1.y, point2.y);
  const x2 = Math.max(point1.x, point2.x);
  const y2 = Math.max(point1.y, point2.y);

  const linkAnnotation = outputPdf.context.obj({
    Type: "Annot",
    Subtype: "Link",
    Rect: [x1, y1, x2, y2],
    Border: [0, 0, 0],
    A: {
      Type: "Action",
      S: "URI",
      URI: PDFString.of(edit.link.trim()),
    },
  });

  const linkAnnotationRef =
    outputPdf.context.register(linkAnnotation);

  outputPage.node.addAnnot(linkAnnotationRef);
}
for (const imageBox of imageBoxes) {
  const outputPage = pages[imageBox.pageNumber - 1];

  if (!outputPage) continue;

  const response = await fetch(imageBox.src);
  const imageBytes = await response.arrayBuffer();

  const embeddedImage =
    imageBox.mimeType === "image/png"
      ? await outputPdf.embedPng(imageBytes)
      : await outputPdf.embedJpg(imageBytes);

  const topLeft = await viewportPointToPdfPoint(
    imageBox.left,
    imageBox.top,
    imageBox.pageNumber,
    imageBox.viewScale,
    imageBox.viewRotation
  );

  const bottomRight = await viewportPointToPdfPoint(
    imageBox.left + imageBox.width,
    imageBox.top + imageBox.height,
    imageBox.pageNumber,
    imageBox.viewScale,
    imageBox.viewRotation
  );

  if (!topLeft || !bottomRight) continue;

  const x = Math.min(topLeft.x, bottomRight.x);
  const y = Math.min(topLeft.y, bottomRight.y);

  const width = Math.abs(bottomRight.x - topLeft.x);
  const height = Math.abs(bottomRight.y - topLeft.y);

  outputPage.drawImage(embeddedImage, {
    x,
    y,
    width,
    height,
  });
}
for (const whiteoutBox of whiteoutBoxes) {
  const outputPage = outputPdf.getPage(
    whiteoutBox.pageNumber - 1
  );

  const topLeft = await viewportPointToPdfPoint(
    whiteoutBox.left,
    whiteoutBox.top,
    whiteoutBox.pageNumber,
    whiteoutBox.viewScale,
    whiteoutBox.viewRotation
  );

  const bottomRight = await viewportPointToPdfPoint(
    whiteoutBox.left + whiteoutBox.width,
    whiteoutBox.top + whiteoutBox.height,
    whiteoutBox.pageNumber,
    whiteoutBox.viewScale,
    whiteoutBox.viewRotation
  );

  if (!topLeft || !bottomRight) continue;

  const x = Math.min(topLeft.x, bottomRight.x);
  const y = Math.min(topLeft.y, bottomRight.y);

  const width = Math.abs(bottomRight.x - topLeft.x);
  const height = Math.abs(bottomRight.y - topLeft.y);

  outputPage.drawRectangle({
    x,
    y,
    width,
    height,
    color: rgb(1, 1, 1),
  });
}
for (const annotateBox of annotateBoxes) {
  const outputPage = outputPdf.getPage(
    annotateBox.pageNumber - 1
  );

  const topLeft = await viewportPointToPdfPoint(
    annotateBox.left,
    annotateBox.top,
    annotateBox.pageNumber,
    annotateBox.viewScale,
    annotateBox.viewRotation
  );

  const bottomRight = await viewportPointToPdfPoint(
    annotateBox.left + annotateBox.width,
    annotateBox.top + annotateBox.height,
    annotateBox.pageNumber,
    annotateBox.viewScale,
    annotateBox.viewRotation
  );

  if (!topLeft || !bottomRight) continue;

  const x = Math.min(topLeft.x, bottomRight.x);
  const y = Math.min(topLeft.y, bottomRight.y);
  const width = Math.abs(bottomRight.x - topLeft.x);
  const height = Math.abs(bottomRight.y - topLeft.y);

  outputPage.drawRectangle({
    x,
    y,
    width,
    height,
    color: rgb(1, 0.8, 0),
    opacity: 0.35,
  });
}
for (const linkBox of linkBoxes) {
  if (!linkBox.url.trim()) continue;

  const outputPage = outputPdf.getPage(
    linkBox.pageNumber - 1
  );

  const topLeft = await viewportPointToPdfPoint(
    linkBox.left,
    linkBox.top,
    linkBox.pageNumber,
    linkBox.viewScale,
    linkBox.viewRotation
  );

  const bottomRight = await viewportPointToPdfPoint(
    linkBox.left + linkBox.width,
    linkBox.top + linkBox.height,
    linkBox.pageNumber,
    linkBox.viewScale,
    linkBox.viewRotation
  );

  if (!topLeft || !bottomRight) continue;

  const x1 = Math.min(topLeft.x, bottomRight.x);
  const y1 = Math.min(topLeft.y, bottomRight.y);
  const x2 = Math.max(topLeft.x, bottomRight.x);
  const y2 = Math.max(topLeft.y, bottomRight.y);

  let linkAnnotation;

  if (linkBox.url.startsWith("page:")) {
    const targetPageNumber = Number(
      linkBox.url.replace(/^page:/, "")
    );

    if (
      !Number.isInteger(targetPageNumber) ||
      targetPageNumber < 1 ||
      targetPageNumber > outputPdf.getPageCount()
    ) {
      continue;
    }

    const targetPage = outputPdf.getPage(
      targetPageNumber - 1
    );

    linkAnnotation = outputPdf.context.register(
      outputPdf.context.obj({
        Type: "Annot",
        Subtype: "Link",
        Rect: [x1, y1, x2, y2],
        Border: [0, 0, 0],
        Dest: [
          targetPage.ref,
          PDFName.of("Fit"),
        ],
      })
    );
  } else {
    linkAnnotation = outputPdf.context.register(
      outputPdf.context.obj({
        Type: "Annot",
        Subtype: "Link",
        Rect: [x1, y1, x2, y2],
        Border: [0, 0, 0],
        A: {
          Type: "Action",
          S: "URI",
          URI: PDFString.of(linkBox.url),
        },
      })
    );
  }

  let annotations;

  try {
    annotations = outputPage.node.lookup(
      PDFName.of("Annots"),
      PDFArray
    );
  } catch {
    annotations = outputPdf.context.obj([]);

    outputPage.node.set(
      PDFName.of("Annots"),
      annotations
    );
  }

  annotations.push(linkAnnotation);
}
const pdfForm = outputPdf.getForm();
const formFont = await outputPdf.embedFont(
  StandardFonts.Helvetica
);
const createdRadioGroups = new Set<string>();
for (const field of formFields) {
  const outputPage = outputPdf.getPage(field.pageNumber - 1);
  const { width: pageWidth, height: pageHeight } =
    outputPage.getSize();

  const fieldLeft = field.left / field.viewScale;
  const fieldTop = field.top / field.viewScale;
  const fieldWidth = field.width / field.viewScale;
  const fieldHeight = field.height / field.viewScale;

  let x = fieldLeft;
  let y = pageHeight - fieldTop - fieldHeight;
  let width = fieldWidth;
  let height = fieldHeight;

  if (field.viewRotation === 90) {
    x = fieldTop;
    y = fieldLeft;
    width = fieldHeight;
    height = fieldWidth;
  } else if (field.viewRotation === 180) {
    x = pageWidth - fieldLeft - fieldWidth;
    y = fieldTop;
  } else if (field.viewRotation === 270) {
    x = pageWidth - fieldTop - fieldHeight;
    y = pageHeight - fieldLeft - fieldWidth;
    width = fieldHeight;
    height = fieldWidth;
  }

  const fieldName = field.name || field.id;

  if (field.fieldType === "text") {
  const textField = pdfForm.createTextField(fieldName);

  if (field.value) {
    textField.setText(field.value);
  }

  textField.addToPage(outputPage, {
    x,
    y,
    width,
    height,
    borderWidth: 1,
    font: formFont,
  });

  textField.setFontSize(12);
  textField.updateAppearances(formFont);
}

  if (field.fieldType === "multiline") {
  const textField = pdfForm.createTextField(fieldName);

  textField.enableMultiline();

  if (field.value) {
    textField.setText(field.value);
  }

  textField.addToPage(outputPage, {
    x,
    y,
    width,
    height,
    borderWidth: 1,
    font: formFont,
  });

  textField.setFontSize(12);
  textField.updateAppearances(formFont);
}

  if (field.fieldType === "checkbox") {
    const checkBox = pdfForm.createCheckBox(fieldName);

    checkBox.addToPage(outputPage, {
      x,
      y,
      width,
      height,
      borderWidth: 1,
    });

    if (field.checked) {
      checkBox.check();
    }
  }

  if (field.fieldType === "radio") {
  let radioGroup;

  if (createdRadioGroups.has(fieldName)) {
    radioGroup = pdfForm.getRadioGroup(fieldName);
  } else {
    radioGroup = pdfForm.createRadioGroup(fieldName);
    createdRadioGroups.add(fieldName);
  }

  radioGroup.addOptionToPage(
    field.value || `Option_${field.id}`,
    outputPage,
    {
      x,
      y,
      width,
      height,
      borderWidth: 1,
    }
  );
}

  if (field.fieldType === "dropdown") {
  const dropdown = pdfForm.createDropdown(fieldName);

  const options =
    field.options && field.options.length > 0
      ? field.options
      : ["Option 1", "Option 2"];

  dropdown.addOptions(options);

  if (field.value && options.includes(field.value)) {
    dropdown.select(field.value);
  }

  dropdown.addToPage(outputPage, {
    x,
    y,
    width,
    height,
    borderWidth: 1,
    font: formFont,
  });

  dropdown.setFontSize(12);
  dropdown.updateAppearances(formFont);
}
}
for (const shape of shapeBoxes) {
  const outputPage = outputPdf.getPage(
    shape.pageNumber - 1
  );

  const {
    width: pageWidth,
    height: pageHeight,
  } = outputPage.getSize();

  const hexToPdfRgb = (hex: string) => {
  const cleanHex = hex.replace("#", "");
  const value = parseInt(cleanHex, 16);

  return rgb(
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255
  );
};

const shapeColor = hexToPdfRgb(shape.strokeColor);
const shapeFillColor = hexToPdfRgb(shape.fillColor);

  const convertPoint = (
    pointX: number,
    pointY: number
  ) => {
    const x = pointX / shape.viewScale;
    const y = pointY / shape.viewScale;

    if (shape.viewRotation === 90) {
      return {
        x: y,
        y: x,
      };
    }

    if (shape.viewRotation === 180) {
      return {
        x: pageWidth - x,
        y,
      };
    }

    if (shape.viewRotation === 270) {
      return {
        x: pageWidth - y,
        y: pageHeight - x,
      };
    }

    return {
      x,
      y: pageHeight - y,
    };
  };

  if (
    shape.shapeType === "rectangle" ||
    shape.shapeType === "circle"
  ) {
    const topLeft = convertPoint(
      shape.left,
      shape.top
    );

    const bottomRight = convertPoint(
      shape.left + shape.width,
      shape.top + shape.height
    );

    const x = Math.min(
      topLeft.x,
      bottomRight.x
    );

    const y = Math.min(
      topLeft.y,
      bottomRight.y
    );

    const width = Math.abs(
      bottomRight.x - topLeft.x
    );

    const height = Math.abs(
      bottomRight.y - topLeft.y
    );

    if (shape.shapeType === "rectangle") {
      outputPage.drawRectangle({
        x,
  y,
  width,
  height,
  color: shapeFillColor,
  borderColor: shapeColor,
  borderWidth: shape.strokeWidth,
  opacity: shape.opacity,
  borderOpacity: shape.opacity,
});
    }

    if (shape.shapeType === "circle") {
  outputPage.drawEllipse({
    x: x + width / 2,
    y: y + height / 2,
    xScale: width / 2,
    yScale: height / 2,
    color: shapeFillColor,
    borderColor: shapeColor,
    borderWidth: shape.strokeWidth,
    opacity: shape.opacity,
    borderOpacity: shape.opacity,
  });
}
  }

  if (
    shape.shapeType === "line" ||
    shape.shapeType === "arrow"
  ) {
    const start = convertPoint(
      shape.startX,
      shape.startY
    );

    const end = convertPoint(
      shape.endX,
      shape.endY
    );

    outputPage.drawLine({
  start,
  end,
  thickness: shape.strokeWidth,
  color: shapeColor,
  opacity: shape.opacity,
});

    if (shape.shapeType === "arrow") {
      const angle = Math.atan2(
        end.y - start.y,
        end.x - start.x
      );

      const arrowLength =
        10 / shape.viewScale;

      const angle1 =
        angle + Math.PI * 0.85;

      const angle2 =
        angle - Math.PI * 0.85;

      const arrowPoint1 = {
        x:
          end.x +
          arrowLength * Math.cos(angle1),
        y:
          end.y +
          arrowLength * Math.sin(angle1),
      };

      const arrowPoint2 = {
        x:
          end.x +
          arrowLength * Math.cos(angle2),
        y:
          end.y +
          arrowLength * Math.sin(angle2),
      };

      outputPage.drawLine({
  start: end,
  end: arrowPoint1,
  thickness: shape.strokeWidth,
  color: shapeColor,
  opacity: shape.opacity,
});

      outputPage.drawLine({
  start: end,
  end: arrowPoint2,
  thickness: shape.strokeWidth,
  color: shapeColor,
  opacity: shape.opacity,
});
    }
  }
}
    /*
     * SAVE NEW PDF
     */
    const pdfBytes =
      await outputPdf.save();

    const pdfArrayBuffer =
      pdfBytes.buffer.slice(
        pdfBytes.byteOffset,
        pdfBytes.byteOffset +
          pdfBytes.byteLength
      ) as ArrayBuffer;

    const blob = new Blob(
      [pdfArrayBuffer],
      {
        type: "application/pdf",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const downloadLink =
      document.createElement("a");

    downloadLink.href = url;

    const originalName =
      file.name.replace(
        /\.pdf$/i,
        ""
      );

    downloadLink.download =
      `${originalName}-edited.pdf`;

    document.body.appendChild(
      downloadLink
    );

    downloadLink.click();

    downloadLink.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  } catch (err) {
    console.error(
      "PDF export error:",
      err
    );

    alert(
      "Unable to apply PDF changes. Please try again."
    );
  } finally {
    setExporting(false);
  }
};
  const zoomIn = () => {
    setScale((current) => Math.min(current + 0.2, 3));
  };

  const zoomOut = () => {
    setScale((current) => Math.max(current - 0.2, 0.5));
  };

  const rotatePage = () => {
    setRotation((current) => (current + 90) % 360);
  };

  const previousPage = () => {
    setPageNumber((current) => Math.max(1, current - 1));
  };

  const nextPage = () => {
    setPageNumber((current) => Math.min(pageCount, current + 1));
  };

  if (!file) {
    return (
      <main className="min-h-screen bg-[#f7f8fc]">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold text-slate-700"
            >
              <ChevronLeft size={19} />
              Back
            </Link>

            <span className="text-lg font-bold text-slate-950">
              PDF Editor
            </span>

            <div className="w-16" />
          </div>
        </header>

        <section className="flex min-h-[calc(100vh-74px)] items-center justify-center px-6 py-16">
          <div className="w-full max-w-3xl text-center">
            <FileInput className="mx-auto text-blue-600" size={48} />

            <h1 className="mt-5 text-4xl font-bold text-slate-950">
              Edit PDF
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-slate-600">
              Upload a PDF and edit it directly in your browser.
            </p>

            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();

                handleFile(event.dataTransfer.files?.[0]);
              }}
              className="mt-10 rounded-3xl border-2 border-dashed border-blue-300 bg-white px-8 py-14"
            >
              <Upload className="mx-auto text-blue-600" size={40} />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="mt-7 rounded-xl bg-blue-600 px-8 py-3.5 font-semibold text-white"
              >
                {loading ? "Opening PDF..." : "Choose PDF file"}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(event) =>
                  handleFile(event.target.files?.[0])
                }
              />
            </div>

            {error && (
              <p className="mt-5 font-medium text-red-600">{error}</p>
            )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#e9e9e9]">
    <input
  ref={imageInputRef}
  type="file"
  accept="image/png,image/jpeg"
  className="hidden"
  onChange={(event) => {
  handleImageFile(event.target.files?.[0]);
  event.target.value = "";
}}
/>
{showSignDialog && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
    <div
      className="w-[420px] max-w-[90vw] rounded-xl bg-white p-6 shadow-2xl"
      onMouseDown={(event) => event.stopPropagation()}
    >
      <h2 className="text-xl font-semibold text-slate-900">
        Add Signature
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        Draw your signature or upload an image.
      </p>
<div className="mt-5 flex border-b border-slate-200">
  <button
    onClick={() => setSignDialogMode("type")}
    className={`px-4 py-3 text-sm font-medium ${
      signDialogMode === "type"
        ? "border-b-2 border-blue-600 text-blue-600"
        : "text-slate-600 hover:text-blue-600"
    }`}
  >
    Type
  </button>

  <button
    onClick={() => setSignDialogMode("draw")}
    className={`px-4 py-3 text-sm font-medium ${
      signDialogMode === "draw"
        ? "border-b-2 border-blue-600 text-blue-600"
        : "text-slate-600 hover:text-blue-600"
    }`}
  >
    Draw
  </button>

  <button
    onClick={() => setSignDialogMode("upload")}
    className={`px-4 py-3 text-sm font-medium ${
      signDialogMode === "upload"
        ? "border-b-2 border-blue-600 text-blue-600"
        : "text-slate-600 hover:text-blue-600"
    }`}
  >
    Upload Image
  </button>

  <button
    onClick={() => setSignDialogMode("camera")}
    className={`px-4 py-3 text-sm font-medium ${
      signDialogMode === "camera"
        ? "border-b-2 border-blue-600 text-blue-600"
        : "text-slate-600 hover:text-blue-600"
    }`}
  >
    Camera
  </button>
</div>
      {signDialogMode === "type" && (
  <div className="mt-5">
    <input
      type="text"
      value={typedSignature}
      onChange={(event) =>
        setTypedSignature(event.target.value)
      }
      placeholder="Type your name"
      className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
    />

    <div className="mt-5 grid grid-cols-2 gap-3">
      {[
        {
          fontFamily: "cursive",
          fontStyle: "normal",
          fontWeight: 400,
        },
        {
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
          fontWeight: 400,
        },
        {
          fontFamily: "cursive",
          fontStyle: "italic",
          fontWeight: 700,
        },
        {
          fontFamily: "'Times New Roman', serif",
          fontStyle: "italic",
          fontWeight: 400,
        },
        {
  fontFamily: '"Brush Script MT", cursive',
  fontStyle: "italic",
  fontWeight: 400,
},
{
  fontFamily: '"Segoe Script", "Lucida Handwriting", cursive',
  fontStyle: "normal",
  fontWeight: 600,
},
{
  fontFamily: '"Brush Script MT", "Segoe Script", cursive',
  fontStyle: "italic",
  fontWeight: 700,
},
{
  fontFamily: '"Lucida Handwriting", "Segoe Script", cursive',
  fontStyle: "normal",
  fontWeight: 400,
},
      ].map((signatureStyle, index) => (
        <button
          key={index}
          onClick={() => setTypedSignatureStyle(index)}
          className={`flex min-h-20 items-center justify-center rounded-lg border px-3 py-3 ${
            typedSignatureStyle === index
              ? "border-blue-500 bg-blue-50"
              : "border-slate-200 hover:border-blue-300"
          }`}
        >
          <span
            className="text-2xl text-slate-800"
            style={{
              fontFamily: signatureStyle.fontFamily,
              fontStyle: signatureStyle.fontStyle,
              fontWeight: signatureStyle.fontWeight,
            }}
          >
            {typedSignature || "Your Name"}
          </span>
        </button>
      ))}
    </div>
    <div className="mt-5 flex justify-center">
  <button
    onClick={useTypedSignature}
    disabled={!typedSignature.trim()}
    className={`rounded-lg px-6 py-2.5 text-sm font-semibold text-white ${
      typedSignature.trim()
        ? "bg-blue-600 hover:bg-blue-700"
        : "cursor-not-allowed bg-slate-300"
    }`}
  >
    Use Signature
  </button>
</div>
  </div>
)}

{signDialogMode === "draw" && (
  <div className="mt-5">
    <canvas
      ref={signatureCanvasRef}
      width={360}
      height={160}
      onPointerDown={startSignatureDrawing}
onPointerMove={drawSignature}
onPointerUp={stopSignatureDrawing}
      className="w-full touch-none rounded-lg border border-slate-300 bg-white"
    />

    <div className="mt-3 flex justify-between">
      <button
        onClick={() => setSignDialogMode("type")}
        className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
      >
        Back
      </button>

      <button
      onClick={useDrawnSignature}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
      >
        Use Signature
      </button>
    </div>
  </div>
)}
{signDialogMode === "upload" && (
  <div className="mt-5">
    <button
      onClick={() => signatureImageInputRef.current?.click()}
      className="w-full rounded-lg border-2 border-dashed border-slate-300 px-5 py-8 text-center hover:border-blue-400 hover:bg-blue-50"
    >
      <ImageIcon className="mx-auto mb-2 text-blue-600" size={28} />

      <div className="font-medium text-slate-800">
        Choose Signature Image
      </div>

      <div className="mt-1 text-sm text-slate-500">
        PNG or JPG
      </div>
    </button>

    <input
      ref={signatureImageInputRef}
      type="file"
      accept="image/png,image/jpeg"
      className="hidden"
      onChange={(event) => {
        handleSignatureImageFile(event.target.files?.[0]);
        event.target.value = "";
      }}
    />
  </div>
)}
{signDialogMode === "camera" && (
  <div className="mt-5">
    <video
      ref={signatureCameraVideoRef}
      autoPlay
      playsInline
      muted
      className="w-full rounded-lg border border-slate-300 bg-black"
    />

    <div className="mt-3 flex justify-center gap-3">
      <button
        onClick={startSignatureCamera}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Start Camera
      </button>

      <button
        onClick={stopSignatureCamera}
        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        Stop Camera
      </button>
      <button
  onClick={captureSignatureCamera}
  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
>
  Capture Photo
</button>
    </div>
    
  </div>
)}
      <div className="mt-5 flex justify-end">
        <button
          onClick={() => {
  setShowSignDialog(false);
  setSignDialogMode("type");
}}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
{showShapeProperties && selectedShape && (
  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30">
    <div
      className="w-[400px] rounded-xl bg-white p-5 shadow-2xl"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Shape Properties
          </h3>
          <p className="text-xs capitalize text-slate-500">
            {selectedShape.shapeType}
          </p>
        </div>

        <button
          type="button"
          onClick={closeShapeProperties}
          className="rounded-md px-2 py-1 text-xl text-slate-500 hover:bg-slate-100"
        >
          ×
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Line color
          </label>

          <div className="flex items-center gap-3">
            <input
              type="color"
              value={selectedShape.strokeColor}
              onChange={(event) =>
                updateSelectedShape({
                  strokeColor: event.target.value,
                })
              }
              className="h-10 w-14 cursor-pointer rounded border border-slate-300"
            />

            <span className="text-sm text-slate-600">
              {selectedShape.strokeColor}
            </span>
          </div>
        </div>

        {selectedShape.shapeType !== "line" &&
          selectedShape.shapeType !== "arrow" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Fill color
              </label>

              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={selectedShape.fillColor}
                  onChange={(event) =>
                    updateSelectedShape({
                      fillColor: event.target.value,
                    })
                  }
                  className="h-10 w-14 cursor-pointer rounded border border-slate-300"
                />

                <span className="text-sm text-slate-600">
                  {selectedShape.fillColor}
                </span>
              </div>
            </div>
          )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Line thickness
          </label>

          <select
            value={selectedShape.strokeWidth}
            onChange={(event) =>
              updateSelectedShape({
                strokeWidth: Number(event.target.value),
              })
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value={1}>1 px</option>
            <option value={2}>2 px</option>
            <option value={3}>3 px</option>
            <option value={4}>4 px</option>
            <option value={5}>5 px</option>
            <option value={6}>6 px</option>
            <option value={8}>8 px</option>
            <option value={10}>10 px</option>
          </select>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">
              Opacity
            </label>

            <span className="text-sm text-slate-500">
              {Math.round(selectedShape.opacity * 100)}%
            </span>
          </div>

          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={selectedShape.opacity}
            onChange={(event) =>
              updateSelectedShape({
                opacity: Number(event.target.value),
              })
            }
            className="w-full"
          />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={() => {
            deleteSelectedShape();
            setShowShapeProperties(false);
          }}
          className="rounded-md bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
        >
          Delete shape
        </button>

        <button
          type="button"
          onClick={closeShapeProperties}
          className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Done
        </button>
      </div>
    </div>
  </div>
)}
{showFormProperties && selectedFormField && (
  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30">
    <div
      className="w-[420px] rounded-xl bg-white p-5 shadow-2xl"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Form Properties
          </h3>
          <p className="text-xs text-slate-500">
            {selectedFormField.fieldType}
          </p>
        </div>

        <button
          type="button"
          onClick={closeFormProperties}
          className="rounded-md px-2 py-1 text-xl text-slate-500 hover:bg-slate-100"
        >
          ×
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Field name
          </label>

          <input
            type="text"
            value={selectedFormField.name}
            onChange={(event) =>
              updateSelectedFormField({
                name: event.target.value,
              })
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>

        {(selectedFormField.fieldType === "text" ||
          selectedFormField.fieldType === "multiline") && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Default value
            </label>

            {selectedFormField.fieldType === "multiline" ? (
              <textarea
                value={selectedFormField.value}
                onChange={(event) =>
                  updateSelectedFormField({
                    value: event.target.value,
                  })
                }
                rows={4}
                className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            ) : (
              <input
                type="text"
                value={selectedFormField.value}
                onChange={(event) =>
                  updateSelectedFormField({
                    value: event.target.value,
                  })
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            )}
          </div>
        )}

        {selectedFormField.fieldType === "checkbox" && (
          <label className="flex items-center gap-3 rounded-md border border-slate-200 p-3">
            <input
              type="checkbox"
              checked={selectedFormField.checked ?? false}
              onChange={(event) =>
                updateSelectedFormField({
                  checked: event.target.checked,
                })
              }
            />

            <span className="text-sm text-slate-700">
              Checked by default
            </span>
          </label>
        )}

        {selectedFormField.fieldType === "radio" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Radio option value
            </label>

            <input
              type="text"
              value={selectedFormField.value}
              placeholder="Option 1"
              onChange={(event) =>
                updateSelectedFormField({
                  value: event.target.value,
                })
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />

            <p className="mt-1 text-xs text-slate-500">
              Radio buttons with the same field name will belong to the same group.
            </p>
          </div>
        )}

        {selectedFormField.fieldType === "dropdown" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Dropdown options
            </label>

            <textarea
              value={(selectedFormField.options ?? []).join("\n")}
              onChange={(event) =>
                updateSelectedFormField({
                  options: event.target.value.split("\n"),
                })
              }
              rows={5}
              placeholder={"Option 1\nOption 2\nOption 3"}
              className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />

            <p className="mt-1 text-xs text-slate-500">
              Enter one option per line.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={() => {
            deleteSelectedFormField();
            setShowFormProperties(false);
          }}
          className="rounded-md bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
        >
          Delete field
        </button>

        <button
          type="button"
          onClick={closeFormProperties}
          className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Done
        </button>
      </div>
    </div>
  </div>
)}
{showLinkProperties && selectedLinkBox && (
  <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30">
    <div className="w-[430px] max-w-[92vw] rounded-xl bg-white p-6 shadow-2xl">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">
          Link properties
        </h2>

        <button
          onClick={closeLinkProperties}
          className="text-2xl leading-none text-slate-400 hover:text-slate-700"
        >
          ×
        </button>
      </div>

      <div className="space-y-4">
        <label className="block">
          <div className="mb-2 flex items-center gap-2">
            <input
              type="radio"
              name="linkTarget"
              checked={linkTargetType === "url"}
              onChange={() => setLinkTargetType("url")}
            />
            <span className="text-sm font-medium text-slate-700">
              Link to external URL
            </span>
          </div>

          <input
            type="text"
            disabled={linkTargetType !== "url"}
            value={linkTargetType === "url" ? linkTargetValue : ""}
            onChange={(event) => setLinkTargetValue(event.target.value)}
            placeholder="https://example.com"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none disabled:bg-slate-50 disabled:text-slate-400 focus:border-blue-500"
          />
        </label>

        <label className="block">
          <div className="mb-2 flex items-center gap-2">
            <input
              type="radio"
              name="linkTarget"
              checked={linkTargetType === "email"}
              onChange={() => {
                setLinkTargetType("email");
                setLinkTargetValue("");
              }}
            />
            <span className="text-sm font-medium text-slate-700">
              Link to email address
            </span>
          </div>

          <input
            type="email"
            disabled={linkTargetType !== "email"}
            value={linkTargetType === "email" ? linkTargetValue : ""}
            onChange={(event) => setLinkTargetValue(event.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none disabled:bg-slate-50 disabled:text-slate-400 focus:border-blue-500"
          />
        </label>

        <label className="block">
          <div className="mb-2 flex items-center gap-2">
            <input
              type="radio"
              name="linkTarget"
              checked={linkTargetType === "phone"}
              onChange={() => {
                setLinkTargetType("phone");
                setLinkTargetValue("");
              }}
            />
            <span className="text-sm font-medium text-slate-700">
              Link to phone number
            </span>
          </div>

          <input
            type="text"
            disabled={linkTargetType !== "phone"}
            value={linkTargetType === "phone" ? linkTargetValue : ""}
            onChange={(event) => setLinkTargetValue(event.target.value)}
            placeholder="+1234567890"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none disabled:bg-slate-50 disabled:text-slate-400 focus:border-blue-500"
          />
        </label>

        <label className="block">
          <div className="mb-2 flex items-center gap-2">
            <input
              type="radio"
              name="linkTarget"
              checked={linkTargetType === "page"}
              onChange={() => {
                setLinkTargetType("page");
                setLinkTargetValue("");
              }}
            />
            <span className="text-sm font-medium text-slate-700">
              Link to internal page
            </span>
          </div>

          <input
            type="number"
            min={1}
            max={pageCount}
            disabled={linkTargetType !== "page"}
            value={linkTargetType === "page" ? linkTargetValue : ""}
            onChange={(event) => setLinkTargetValue(event.target.value)}
            placeholder={`1 - ${pageCount}`}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none disabled:bg-slate-50 disabled:text-slate-400 focus:border-blue-500"
          />
        </label>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
        <button
          onClick={deleteSelectedLinkBox}
          className="text-sm font-medium text-red-600 hover:text-red-700"
        >
          Delete link
        </button>

        <div className="flex gap-2">
          <button
            onClick={closeLinkProperties}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>

          <button
            onClick={saveLinkProperties}
            disabled={!linkTargetValue.trim()}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  </div>
)}
      <header className="border-b border-slate-200 bg-white">
        <div className="flex min-h-16 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="rounded-lg p-2 text-slate-600">
              <ChevronLeft size={20} />
            </Link>

            <div>
              <p className="max-w-64 truncate text-sm font-semibold">
                {file.name}
              </p>

              <p className="text-xs text-slate-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>

          <button
  onClick={applyChanges}
  disabled={exporting}
  className={`flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 ${
    exporting
      ? "cursor-not-allowed opacity-60"
      : ""
  }`}
>
  <Download size={17} />

  {exporting
    ? "Applying..."
    : "Apply changes"}
</button>
        </div>
      </header>

      <div className="sticky top-0 z-30 border-b bg-white px-3 py-2">
        <div className="mx-auto flex max-w-[1500px] items-center justify-center gap-1">
          {tools.map((tool) => {
            const Icon = tool.icon;

            return (
            <div key={tool.label} className="relative">  
              <button
                
                onClick={() => {
  if (tool.label === "Text") {
    setAddTextMode((current) => !current);
    setWhiteoutMode(false);
setAnnotateMode(false);
    setSelectedTextId(null);
    setMoveMode(false);
  }
  if (tool.label === "Images") {
  imageInputRef.current?.click();
}
if (tool.label === "Sign") {
  setShowSignDialog(true);
}
if (tool.label === "Whiteout") {
  setWhiteoutMode((current) => !current);
  setAnnotateMode(false);
  setAddTextMode(false);
  setSelectedTextId(null);
  setSelectedImageId(null);
  setMoveMode(false);
}
if (tool.label === "Annotate") {
  setAnnotateMode((current) => !current);
  setWhiteoutMode(false);
  setAddTextMode(false);
  setSelectedTextId(null);
  setSelectedImageId(null);
  setSelectedWhiteoutId(null);
  setMoveMode(false);
}
if (tool.label === "Links") {
  setLinkAreaMode((current) => !current);
  setAnnotateMode(false);
  setWhiteoutMode(false);
  setAddTextMode(false);
  setSelectedTextId(null);
  setSelectedImageId(null);
  setSelectedWhiteoutId(null);
  setSelectedAnnotateId(null);
}
if (tool.label === "Forms") {
  setShowFormsMenu((current) => !current);

  setAddTextMode(false);
  setWhiteoutMode(false);
  setAnnotateMode(false);
  setLinkAreaMode(false);

  setSelectedTextId(null);
  setSelectedImageId(null);
  setSelectedWhiteoutId(null);
  setSelectedAnnotateId(null);
  setSelectedLinkBoxId(null);
}
if (tool.label === "Shapes") {
  setShowShapesMenu((current) => !current);

  setAddTextMode(false);
  setWhiteoutMode(false);
  setAnnotateMode(false);
  setLinkAreaMode(false);
  setFormFieldMode(null);

  setSelectedTextId(null);
  setSelectedImageId(null);
  setSelectedWhiteoutId(null);
  setSelectedAnnotateId(null);
  setSelectedLinkBoxId(null);
  setSelectedFormFieldId(null);
}
}}

                disabled={!tool.enabled}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                  tool.enabled
  ? (tool.label === "Text" && addTextMode) ||
(tool.label === "Whiteout" && whiteoutMode) ||
(tool.label === "Annotate" && annotateMode) ||
(tool.label === "Links" && linkAreaMode) ||
(tool.label === "Forms" && formFieldMode !== null) ||
(tool.label === "Shapes" && shapeMode !== null)
    ? "bg-blue-600 text-white"
    : "bg-blue-50 text-blue-700"
  : "text-slate-400"
                }`}
              >
                <Icon size={17} />
                {tool.label}
              </button>
              {tool.label === "Forms" && showFormsMenu && (
  <div className="absolute left-0 top-full z-[100] mt-2 w-64 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
    <div className="px-3 py-2 text-xs font-semibold uppercase text-slate-400">
      Add new form fields
    </div>

    <button
      onClick={() => {
        setFormFieldMode("text");
        setShowFormsMenu(false);
      }}
      className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700"
    >
      Text field
    </button>

    <button
      onClick={() => {
        setFormFieldMode("multiline");
        setShowFormsMenu(false);
      }}
      className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700"
    >
      Text multiline
    </button>

    <button
      onClick={() => {
        setFormFieldMode("checkbox");
        setShowFormsMenu(false);
      }}
      className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700"
    >
      Checkbox
    </button>

    <button
      onClick={() => {
        setFormFieldMode("radio");
        setShowFormsMenu(false);
      }}
      className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700"
    >
      Radio button
    </button>

    <button
      onClick={() => {
        setFormFieldMode("dropdown");
        setShowFormsMenu(false);
      }}
      className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700"
    >
      Drop-down list
    </button>
  </div>
)}
{tool.label === "Shapes" && showShapesMenu && (
  <div className="absolute left-0 top-full z-[100] mt-2 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
    <div className="px-3 py-2 text-xs font-semibold uppercase text-slate-400">
      Add shape
    </div>

    <button
      onClick={() => {
        setShapeMode("rectangle");
        setShowShapesMenu(false);
      }}
      className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700"
    >
      Rectangle
    </button>

    <button
      onClick={() => {
        setShapeMode("circle");
        setShowShapesMenu(false);
      }}
      className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700"
    >
      Circle
    </button>

    <button
      onClick={() => {
        setShapeMode("line");
        setShowShapesMenu(false);
      }}
      className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700"
    >
      Line
    </button>

    <button
      onClick={() => {
        setShapeMode("arrow");
        setShowShapesMenu(false);
      }}
      className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700"
    >
      Arrow
    </button>
  </div>
)}
              </div>
            );
          })}

          <div className="mx-1 h-7 w-px bg-slate-300" />

          <Undo2 size={18} className="text-blue-600" />
          <Redo2 size={18} className="text-blue-600" />
        </div>
      </div>

      <div className="border-b border-slate-300 bg-[#ededed] px-4 py-3">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={previousPage}
            disabled={pageNumber <= 1}
            className="rounded border border-blue-400 bg-white p-2"
          >
            <ChevronLeft size={17} />
          </button>

          <span className="px-4 text-sm font-semibold">
            Page {pageNumber} / {pageCount}
          </span>

          <button
            onClick={nextPage}
            disabled={pageNumber >= pageCount}
            className="rounded border border-blue-400 bg-white p-2"
          >
            <ChevronRight size={17} />
          </button>

          <button
            onClick={zoomIn}
            className="rounded border border-blue-400 bg-white p-2"
          >
            <ZoomIn size={16} />
          </button>

          <button
            onClick={zoomOut}
            className="rounded border border-blue-400 bg-white p-2"
          >
            <ZoomOut size={16} />
          </button>

          <button
            onClick={rotatePage}
            className="rounded border border-blue-400 bg-white p-2"
          >
            <RotateCw size={16} />
          </button>

          <span className="ml-2 text-xs font-semibold">
            {Math.round(scale * 100)}%
          </span>

          <button
  onClick={() => insertPageAt(pageNumber, pageNumber)}
  className="ml-3 flex items-center gap-2 rounded border border-blue-400 bg-white px-3 py-2 text-blue-600"
>
            <Plus size={16} />
            Insert page here
          </button>
        </div>
      </div>

      <section className="relative flex flex-1 flex-col items-center gap-2 overflow-auto p-8">
        {rendering && (
          <div className="fixed bottom-6 right-6 z-50 rounded bg-slate-900 px-4 py-2 text-sm text-white">
            Rendering page...
          </div>
        )}
{pdfDoc && pageNumber > 0 && (
  <div className="flex items-center gap-2">
    <button
      type="button"
      onClick={() => insertPageAt(0, 1)}
      className="flex items-center gap-1 rounded-md border border-blue-400 bg-white px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
    >
      <Plus size={13} />
      Insert page here
    </button>

    <button
      type="button"
      onClick={() => deletePageAt(pageNumber)}
      className="rounded-md border border-red-300 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
    >
      Delete page
    </button>
  </div>
)}

{pdfDoc &&
  Array.from(
    { length: Math.max(0, pageNumber - 1) },
    (_, index) => {
      const previewPage = index + 1;

      return (
        <div
          key={`before-page-${previewPage}`}
          className="flex flex-col items-center gap-6"
        >
          <PdfPagePreview
            pdfDoc={pdfDoc}
            pageNumber={previewPage}
            scale={scale}
            onActivate={() => {
              setPageNumber(previewPage);
              setRotation(0);
            }}
          />

  <div className="flex items-center gap-2">
  <button
    type="button"
    onClick={() =>
      insertPageAt(previewPage, previewPage)
    }
    className="flex items-center gap-2 rounded-md border border-blue-400 bg-white px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
  >
    <Plus size={16} />
    Insert page here
  </button>

  <button
    type="button"
    onClick={() => deletePageAt(previewPage)}
    className="rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
  >
    Delete page
  </button>
</div>
</div>
      );
    }
  )}
  
        <div
  className={`relative bg-white shadow-xl ${
  pageCount === 0
    ? "hidden"
    : addTextMode
      ? "cursor-text"
      : ""
}`}
  style={{
    width: pageSize.width,
    height: pageSize.height,
  }}
 onPointerDown={(event) => {
  startWhiteout(event);
  startAnnotate(event);
  startLinkArea(event);
  startFormField(event);
  startShape(event);
}}
onPointerMove={(event) => {
  moveWhiteout(event);
  moveAnnotate(event);
  moveLinkArea(event);
  moveFormField(event);
  moveShape(event);
}}
onPointerUp={(event) => {
  endWhiteout(event);
  endAnnotate(event);
  endLinkArea(event);
  endFormField(event);
  endShape(event);
}}
  onMouseDown={(event) => {
    if (addTextMode) {
      const rect = event.currentTarget.getBoundingClientRect();

      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      addNewTextAt(x, y);
      return;
    }

    setSelectedTextId(null);
    setMoveMode(false);
  }}
>
          <canvas
            ref={canvasRef}
            className="absolute left-0 top-0 bg-white"
          />
{whiteoutBoxes
  .filter((box) => box.pageNumber === pageNumber)
  .map((box) => {
    const whiteoutScale = scale / box.viewScale;

    return (
      <div
  key={box.id}
  onPointerDown={(event) => startWhiteoutMove(event, box)}
  onPointerMove={moveWhiteoutBox}
  onPointerUp={endWhiteoutMove}
  className={`absolute z-10 cursor-move bg-white ${
    selectedWhiteoutId === box.id
      ? "outline-2 outline-blue-500"
      : ""
  }`}
  style={{
    left: box.left * whiteoutScale,
    top: box.top * whiteoutScale,
    width: box.width * whiteoutScale,
    height: box.height * whiteoutScale,
  }}
/>
    );
  })}

{draftWhiteout && draftWhiteout.pageNumber === pageNumber && (
  <div
    className="pointer-events-none absolute z-20 border-2 border-dashed border-blue-500 bg-white"
    style={{
      left: draftWhiteout.left,
      top: draftWhiteout.top,
      width: draftWhiteout.width,
      height: draftWhiteout.height,
    }}
  />
)}
{annotateBoxes
  .filter((box) => box.pageNumber === pageNumber)
  .map((box) => {
    const annotateScale = scale / box.viewScale;

    return (
      <div
  key={box.id}
  onPointerDown={(event) => startAnnotateMove(event, box)}
  onPointerMove={moveAnnotateBox}
  onPointerUp={endAnnotateMove}
  className={`absolute z-10 cursor-move ${
    selectedAnnotateId === box.id
      ? "outline-2 outline-yellow-500"
      : ""
  }`}
  style={{
    left: box.left * annotateScale,
    top: box.top * annotateScale,
    width: box.width * annotateScale,
    height: box.height * annotateScale,
    backgroundColor: "rgba(250, 204, 21, 0.35)",
  }}
/>
    );
  })}

{draftAnnotate && draftAnnotate.pageNumber === pageNumber && (
  <div
    className="pointer-events-none absolute z-20 border-2 border-dashed border-yellow-500"
    style={{
      left: draftAnnotate.left,
      top: draftAnnotate.top,
      width: draftAnnotate.width,
      height: draftAnnotate.height,
      backgroundColor: "rgba(250, 204, 21, 0.35)",
    }}
  />
)}
{linkBoxes
  .filter((box) => box.pageNumber === pageNumber)
  .map((box) => {
    const linkScale = scale / box.viewScale;

    return (
      <div
        key={box.id}
        onPointerDown={(event) => startLinkMove(event, box)}
onPointerMove={moveLinkBox}
onPointerUp={(event) => endLinkMove(event, box)}
        className={`absolute z-30 cursor-pointer border-2 border-dashed ${
  selectedLinkBoxId === box.id
    ? "border-blue-600 bg-blue-100/20"
    : "border-transparent bg-transparent"
}`}
        style={{
          left: box.left * linkScale,
          top: box.top * linkScale,
          width: box.width * linkScale,
          height: box.height * linkScale,
        }}
        
      />
    );
  })}
{formFields
  .filter((field) => field.pageNumber === pageNumber)
  .map((field) => {
    const fieldScale = scale / field.viewScale;

    const width = field.width * fieldScale;
    const height = field.height * fieldScale;

    return (
      <div
        key={field.id}
        onPointerDown={(event) =>
  startFormFieldMove(event, field)
}
onPointerMove={(event) =>
  moveFormFieldBox(event, field)
}
onPointerUp={endFormFieldMove}
        className={`absolute z-30 flex items-center ${
          selectedFormFieldId === field.id
            ? "ring-2 ring-blue-500"
            : ""
        }`}
        style={{
          left: field.left * fieldScale,
          top: field.top * fieldScale,
          width,
          height,
        }}
        onClick={(event) => {
          event.stopPropagation();
          setSelectedFormFieldId(field.id);
          setShowFormProperties(true);
        }}
      >
        {field.fieldType === "text" && (
  <div className="h-full w-full border border-slate-500 bg-white px-2 text-xs text-slate-700">
    {field.value || "Text field"}
  </div>
)}

        {field.fieldType === "multiline" && (
  <div className="h-full w-full whitespace-pre-wrap border border-slate-500 bg-white p-2 text-xs text-slate-700">
    {field.value || "Multiline text"}
  </div>
)}

        {field.fieldType === "checkbox" && (
  <div className="flex h-full w-full items-center justify-center border-2 border-slate-600 bg-white text-lg font-bold text-slate-800">
    {field.checked ? "✓" : ""}
  </div>
)}

        {field.fieldType === "radio" && (
          <div className="h-full w-full rounded-full border-2 border-slate-600 bg-white" />
        )}

        {field.fieldType === "dropdown" && (
  <div className="flex h-full w-full items-center justify-between border border-slate-500 bg-white px-2 text-xs text-slate-500">
    <span>
      {field.value ||
        field.options?.[0] ||
        "Option 1"}
    </span>
    <span>▼</span>
  </div>
)}
        {selectedFormFieldId === field.id && (
  <button
    type="button"
    onPointerDown={(event) => {
      event.preventDefault();
      event.stopPropagation();
    }}
    onClick={(event) => {
      event.preventDefault();
      event.stopPropagation();
      deleteSelectedFormField();
    }}
    className="absolute -right-2 -top-8 rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white shadow-md hover:bg-red-700"
  >
    Delete
  </button>
)}
      </div>
    );
  })}
  {shapeBoxes
  .filter((shape) => shape.pageNumber === pageNumber)
  .map((shape) => {
    const shapeScale = scale / shape.viewScale;

    const left = shape.left * shapeScale;
    const top = shape.top * shapeScale;
    const width = shape.width * shapeScale;
    const height = shape.height * shapeScale;

    if (
      shape.shapeType === "line" ||
      shape.shapeType === "arrow"
    ) {
      const startX = shape.startX * shapeScale;
      const startY = shape.startY * shapeScale;
      const endX = shape.endX * shapeScale;
      const endY = shape.endY * shapeScale;

      const deltaX = endX - startX;
      const deltaY = endY - startY;

      const length = Math.hypot(deltaX, deltaY);
      const angle =
        Math.atan2(deltaY, deltaX) * (180 / Math.PI);

      return (
        <div
          key={shape.id}
          onPointerDown={(event) =>
  startShapeMove(event, shape)
}
onPointerMove={(event) =>
  moveShapeBox(event, shape)
}
onPointerUp={endShapeMove}
          className="absolute z-30"
          style={{
            left: startX,
            top: startY,
            width: length,
            height: 2,
            transform: `rotate(${angle}deg)`,
            transformOrigin: "0 50%",
          }}
          onClick={(event) => {
  event.stopPropagation();
  setSelectedShapeId(shape.id);
  setShowShapeProperties(true);
}}
        >
          <div
  className={`w-full ${
    selectedShapeId === shape.id
      ? "ring-2 ring-blue-400"
      : ""
  }`}
  style={{
    height: shape.strokeWidth,
    backgroundColor: shape.strokeColor,
    opacity: shape.opacity,
  }}
/>

          {shape.shapeType === "arrow" && (
            <div
              className="absolute right-[-2px] top-1/2 h-0 w-0 -translate-y-1/2"
              style={{
  borderTop: "6px solid transparent",
  borderBottom: "6px solid transparent",
  borderLeft: `10px solid ${shape.strokeColor}`,
  opacity: shape.opacity,
}}
            />
          )}
          {selectedShapeId === shape.id && (
  <button
    type="button"
    onPointerDown={(event) => {
      event.preventDefault();
      event.stopPropagation();
    }}
    onClick={(event) => {
      event.preventDefault();
      event.stopPropagation();
      deleteSelectedShape();
    }}
    className="absolute -right-2 -top-8 rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white shadow-md hover:bg-red-700"
  >
    Delete
  </button>
)}
        </div>
      );
    }

    return (
      <div
        key={shape.id}
        onPointerDown={(event) =>
  startShapeMove(event, shape)
}
onPointerMove={(event) =>
  moveShapeBox(event, shape)
}
onPointerUp={endShapeMove}
        onClick={(event) => {
          event.stopPropagation();
          setSelectedShapeId(shape.id);
          setShowShapeProperties(true);
        }}
        className={`absolute z-30 ${
  shape.shapeType === "circle"
    ? "rounded-full"
    : ""
} ${
  selectedShapeId === shape.id
    ? "ring-2 ring-blue-400"
    : ""
}`}
        style={{
  left,
  top,
  width,
  height,
  borderStyle: "solid",
  borderColor: shape.strokeColor,
  borderWidth: shape.strokeWidth,
  backgroundColor: shape.fillColor,
  opacity: shape.opacity,
}}
    >
  {selectedShapeId === shape.id && (
    <button
      type="button"
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        deleteSelectedShape();
      }}
      className="absolute -right-2 -top-8 rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white shadow-md hover:bg-red-700"
    >
      Delete
    </button>
  )}
</div>
    );
  })}
  {draftShapeBox &&
  draftShapeBox.pageNumber === pageNumber && (() => {
    const shapeScale =
      scale / draftShapeBox.viewScale;

    if (
      draftShapeBox.shapeType === "line" ||
      draftShapeBox.shapeType === "arrow"
    ) {
      const startX =
        draftShapeBox.startX * shapeScale;
      const startY =
        draftShapeBox.startY * shapeScale;
      const endX =
        draftShapeBox.endX * shapeScale;
      const endY =
        draftShapeBox.endY * shapeScale;

      const deltaX = endX - startX;
      const deltaY = endY - startY;

      const length = Math.hypot(deltaX, deltaY);
      const angle =
        Math.atan2(deltaY, deltaX) *
        (180 / Math.PI);

      return (
        <div
          className="pointer-events-none absolute z-40"
          style={{
            left: startX,
            top: startY,
            width: length,
            height: 2,
            transform: `rotate(${angle}deg)`,
            transformOrigin: "0 50%",
          }}
        >
          <div className="h-[2px] w-full bg-blue-500" />

          {draftShapeBox.shapeType === "arrow" && (
            <div
              className="absolute right-[-2px] top-1/2 h-0 w-0 -translate-y-1/2"
              style={{
                borderTop: "6px solid transparent",
                borderBottom: "6px solid transparent",
                borderLeft: "10px solid rgb(59 130 246)",
              }}
            />
          )}
        </div>
      );
    }

    return (
      <div
        className={`pointer-events-none absolute z-40 border-2 border-dashed border-blue-500 ${
          draftShapeBox.shapeType === "circle"
            ? "rounded-full"
            : ""
        }`}
        style={{
          left: draftShapeBox.left * shapeScale,
          top: draftShapeBox.top * shapeScale,
          width: draftShapeBox.width * shapeScale,
          height: draftShapeBox.height * shapeScale,
        }}
      />
    );
  })()}
  {draftFormField &&
  draftFormField.pageNumber === pageNumber && (
    <div
      className="pointer-events-none absolute z-40 border-2 border-dashed border-blue-500 bg-blue-100/20"
      style={{
        left:
          draftFormField.left *
          (scale / draftFormField.viewScale),
        top:
          draftFormField.top *
          (scale / draftFormField.viewScale),
        width:
          draftFormField.width *
          (scale / draftFormField.viewScale),
        height:
          draftFormField.height *
          (scale / draftFormField.viewScale),
      }}
    />
  )}
{draftLinkBox && draftLinkBox.pageNumber === pageNumber && (
  <div
    className="pointer-events-none absolute z-30 border-2 border-dashed border-blue-500 bg-blue-100/20"
    style={{
      left: draftLinkBox.left,
      top: draftLinkBox.top,
      width: draftLinkBox.width,
      height: draftLinkBox.height,
    }}
  />
)}
{imageBoxes
  .filter((imageBox) => imageBox.pageNumber === pageNumber)
  .map((imageBox) => {
    const imageScale = scale / imageBox.viewScale;

    return (
      <img
        key={imageBox.id}
        src={imageBox.src}
        alt=""
        draggable={false}
        onMouseDown={(event) => {
  event.stopPropagation();
  setSelectedImageId(imageBox.id);
  setSelectedTextId(null);
  setMoveMode(false);
}}
onPointerDown={(event) => {


  event.preventDefault();
  event.stopPropagation();

  event.currentTarget.setPointerCapture(event.pointerId);

  imageDragRef.current = {
    id: imageBox.id,
    startX: event.clientX,
    startY: event.clientY,
    initialLeft: imageBox.left,
    initialTop: imageBox.top,
  };
}}

onPointerMove={(event) => {
  const drag = imageDragRef.current;

  if (
  !drag ||
  drag.id !== imageBox.id
) {
    return;
  }

  const deltaX =
    (event.clientX - drag.startX) / imageScale;

  const deltaY =
    (event.clientY - drag.startY) / imageScale;

  setImageBoxes((current) =>
    current.map((currentImage) =>
      currentImage.id === imageBox.id
        ? {
            ...currentImage,
            left: drag.initialLeft + deltaX,
            top: drag.initialTop + deltaY,
          }
        : currentImage
    )
  );
}}

onPointerUp={(event) => {
  if (imageDragRef.current?.id === imageBox.id) {
    imageDragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }
}}
        className={`absolute z-20 select-none ${
  selectedImageId === imageBox.id
    ? "outline-2 outline-blue-500"
    : ""
}`}
        style={{
          left: imageBox.left * imageScale,
          top: imageBox.top * imageScale,
          width: imageBox.width * imageScale,
          height: imageBox.height * imageScale,
        }}
      />
    );
  })}
  {selectedImageBox && (() => {
    
  const imageScale = scale / selectedImageBox.viewScale;

  return (
    <div
      className="absolute z-40 h-4 w-4 cursor-nwse-resize rounded-sm border-2 border-white bg-blue-600 shadow"
      style={{
        left:
          (selectedImageBox.left + selectedImageBox.width) *
            imageScale -
          8,
        top:
          (selectedImageBox.top + selectedImageBox.height) *
            imageScale -
          8,
      }}
      onPointerDown={handleImageResizeStart}
onPointerMove={handleImageResizeMove}
onPointerUp={handleImageResizeEnd}
 
    />
  );
})()}
{selectedAnnotateBox && (() => {
  const annotateScale = scale / selectedAnnotateBox.viewScale;

  return (
    <div
      className="absolute z-50 flex items-center rounded-md border border-slate-300 bg-white p-1 shadow-xl"
      style={{
        left: selectedAnnotateBox.left * annotateScale,
        top: Math.max(
          5,
          selectedAnnotateBox.top * annotateScale - 42
        ),
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        onClick={deleteSelectedAnnotate}
        className="rounded-md px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
      >
        Delete
      </button>
    </div>
  );
})()}
{selectedWhiteoutBox && (() => {
  const whiteoutScale = scale / selectedWhiteoutBox.viewScale;

  return (
    <div
      className="absolute z-50 flex items-center rounded-md border border-slate-300 bg-white p-1 shadow-xl"
      style={{
        left: selectedWhiteoutBox.left * whiteoutScale,
        top: Math.max(
          5,
          selectedWhiteoutBox.top * whiteoutScale - 42
        ),
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        onClick={deleteSelectedWhiteout}
        className="rounded-md px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
        title="Delete whiteout"
      >
        Delete
      </button>
    </div>
  );
})()}
  {selectedImageBox && (() => {
  const imageScale = scale / selectedImageBox.viewScale;

  return (
    <div
      className="absolute z-50 flex items-center gap-1 rounded-md border border-slate-300 bg-white p-1 shadow-xl"
      style={{
        left: selectedImageBox.left * imageScale,
        top: Math.max(5, selectedImageBox.top * imageScale - 42),
      }}
      onMouseDown={(event) => event.stopPropagation()}
    >
     <button
  onClick={() => setImageMoveMode((current) => !current)}
  className={`rounded p-2 ${
    imageMoveMode
      ? "bg-blue-100 text-blue-700"
      : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
  }`}
  title="Move image"
>
  <Move size={16} />
</button> 
      <button
        onClick={deleteSelectedImage}
        className="rounded px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
        title="Delete image"
      >
        Delete
      </button>
    </div>
  );
})()}
          {selectedBox && !isTextDragging &&  (() => {
            const edit = getTextEdit(selectedBox);

            const x = selectedBox.left + (edit.offsetX ?? 0);
const y = selectedBox.top + (edit.offsetY ?? 0);

            return (
              <div
                className="absolute z-50 flex items-center gap-1 rounded-md border border-slate-300 bg-white p-1 shadow-xl"
                style={{
                  left: Math.max(
                    5,
                    Math.min(x, pageSize.width - 590)
                  ),

                  top: Math.max(5, y - 70),
                }}
                onMouseDown={(event) => event.stopPropagation()}
              >
                <button
                  onClick={() =>
                    updateEdit(selectedBox, {
                      bold: !edit.bold,
                    })
                  }
                  className={`rounded p-2 ${
                    edit.bold ? "bg-blue-100 text-blue-700" : ""
                  }`}
                  title="Bold"
                >
                  <Bold size={15} />
                </button>

                <button
                  onClick={() =>
                    updateEdit(selectedBox, {
                      italic: !edit.italic,
                    })
                  }
                  className={`rounded p-2 ${
                    edit.italic ? "bg-blue-100 text-blue-700" : ""
                  }`}
                  title="Italic"
                >
                  <Italic size={15} />
                </button>

                <input
                  type="number"
                  min="6"
                  max="100"
                  value={Math.round(edit.fontSize)}
                  onChange={(event) =>
                    updateEdit(selectedBox, {
                      fontSize: Number(event.target.value),
                    })
                  }
                  className="w-14 rounded border px-2 py-1.5 text-sm"
                  title="Font size"
                />

                <select
  value={edit.fontFamily}
  onChange={(event) =>
    updateEdit(selectedBox, {
      fontFamily: event.target.value,
    })
  }
  className="w-48 rounded border px-2 py-1.5 text-sm"
  title="Font family"
  style={{
    fontFamily: edit.fontFamily,
  }}
>
  <option
    value={selectedBox.fontFamily}
    style={{
      fontFamily: selectedBox.fontFamily,
    }}
  >
    Original ({selectedBox.fontFamily})
  </option>

  {fontOptions
    .filter((font) => font !== selectedBox.fontFamily)
    .map((font) => (
      <option
        key={font}
        value={font}
        style={{
          fontFamily: font,
        }}
      >
        {font}
      </option>
    ))}
</select>

                <input
                  type="color"
                  value={edit.color}
                  onChange={(event) =>
                    updateEdit(selectedBox, {
                      color: event.target.value,
                    })
                  }
                  className="h-8 w-8 cursor-pointer"
                  title="Text color"
                />

                <button
                  onClick={createLink}
                  className={`rounded p-2 ${
                    edit.link ? "bg-blue-100 text-blue-700" : ""
                  }`}
                  title="Create link"
                >
                  <LinkIcon size={15} />
                </button>

                <button
                  onClick={() => setMoveMode((current) => !current)}
                  className={`rounded p-2 ${
                    moveMode ? "bg-blue-100 text-blue-700" : ""
                  }`}
                  title="Move text"
                >
                  <Move size={15} />
                </button>

                <button
  onClick={duplicateSelectedText}
  title="Duplicate"
  className="rounded p-2 text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
>
  <Copy size={15} />
</button>

                <button
                  onClick={deleteSelectedText}
                  title="Delete"
                  className="rounded p-2 text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })()}
{isTextDragging && textSnapGuides.x !== undefined && (
  <div
    className="pointer-events-none absolute z-50 bg-cyan-500"
    style={{
      left: textSnapGuides.x,
      top: 0,
      width: 1,
      height: pageSize.height,
    }}
  />
)}

{isTextDragging && textSnapGuides.y !== undefined && (
  <div
    className="pointer-events-none absolute z-50 bg-cyan-500"
    style={{
      left: 0,
      top: textSnapGuides.y,
      width: pageSize.width,
      height: 1,
    }}
  />
)}
          <div className="pointer-events-none absolute inset-0 z-10">
            {textBoxes.map((box) => {
  const edit = textEdits[box.id];
  const activeEdit = edit || createDefaultEdit(box);
const measuredTextBox = measureTextBox(
  activeEdit.text,
  activeEdit.fontSize,
  activeEdit.fontFamily,
  activeEdit.bold,
  activeEdit.italic
);
  const left = box.left + activeEdit.offsetX;
  const top = box.top + activeEdit.offsetY;

  const isSelected = selectedTextId === box.id;

  const hasChanged =
    !!edit &&
    (
      edit.text !== box.text ||
      edit.deleted ||
      edit.offsetX !== 0 ||
      edit.offsetY !== 0 ||
      edit.bold ||
      edit.italic ||
      edit.fontSize !== box.fontSize ||
      edit.fontFamily !== box.fontFamily ||
      edit.color !== "#111111"
    );

  const shouldMaskOriginal =
  !box.isNew && (isSelected || hasChanged);

  return (
    <div key={box.id} className="contents">

      {/* PERMANENT MASK OVER ORIGINAL PDF TEXT */}
      {shouldMaskOriginal && (
        <div
          className="pointer-events-none absolute z-20"
          style={{
            left: box.left - 2,
            top: box.top - 1,

            width: Math.max(box.width + 6, 14),
            height: Math.max(box.height * 1.25, 14),

            backgroundColor: box.backgroundColor,

            transform: `rotate(${box.angle}deg)`,
            transformOrigin: "0 0",
          }}
        />
      )}

      {/* DELETED TEXT:
          Keep blank area clickable so new text can be entered */}
      {edit?.deleted && !isSelected && (
        <button
          type="button"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            startEditing(box);
          }}
          title="Click to add text here"
          className="pointer-events-auto absolute z-30 cursor-text border border-transparent bg-transparent p-0 outline-none hover:border-blue-300"
          style={{
            left: box.left,
            top: box.top,

            width: Math.max(box.width + 6, 15),
            height: Math.max(box.height * 1.25, 14),

            transform: `rotate(${box.angle}deg)`,
            transformOrigin: "0 0",
          }}
        />
      )}

      {/* CURRENTLY EDITING */}
      {isSelected && (
        <textarea
          autoFocus
          onMouseDown={(event) => {
  event.stopPropagation();
}}
          ref={(element) => {
  if (!element) return;

  const pendingCaret = pendingCaretRef.current;

  if (
    pendingCaret &&
    pendingCaret.id === box.id
  ) {
    requestAnimationFrame(() => {
      element.focus();

      const rect =
        element.getBoundingClientRect();

      const clickX =
        pendingCaret.clientX - rect.left;

      const canvas =
        document.createElement("canvas");

      const context =
        canvas.getContext("2d");

      if (context) {
        context.font = `${
          activeEdit.italic ? "italic " : ""
        }${
          activeEdit.bold ? "700 " : "400 "
        }${activeEdit.fontSize}px ${
          activeEdit.fontFamily
        }`;

        let caretPosition = 0;

        for (
          let i = 0;
          i <= activeEdit.text.length;
          i++
        ) {
          const before =
            activeEdit.text.slice(0, i);

          const width =
            context.measureText(before).width;

          if (width >= clickX) {
            const previousWidth =
              i > 0
                ? context.measureText(
                    activeEdit.text.slice(0, i - 1)
                  ).width
                : 0;

            caretPosition =
              clickX - previousWidth <
              width - clickX
                ? Math.max(0, i - 1)
                : i;

            break;
          }

          caretPosition = i;
        }

        element.setSelectionRange(
          caretPosition,
          caretPosition
        );
      }

      pendingCaretRef.current = null;
    });
  }
}}
          value={activeEdit.text}
          spellCheck={false}

          onPointerDown={(event) => {
  event.stopPropagation();

  if (!moveMode) return;

  event.preventDefault();

  event.currentTarget.setPointerCapture(event.pointerId);

  dragRef.current = {
    id: box.id,
    startX: event.clientX,
    startY: event.clientY,
    initialX: activeEdit.offsetX,
    initialY: activeEdit.offsetY,
  };

  setIsTextDragging(true);
}}

          onPointerMove={(event) => {
  const drag = dragRef.current;

  if (
    !moveMode ||
    !drag ||
    drag.id !== box.id
  ) {
    return;
  }

  const rawOffsetX =
    drag.initialX +
    event.clientX -
    drag.startX;

  const rawOffsetY =
    drag.initialY +
    event.clientY -
    drag.startY;

  const rawLeft = box.left + rawOffsetX;
  const rawTop = box.top + rawOffsetY;

  const snapThreshold = 8;
  let snappedLeft = rawLeft;
  let snappedTop = rawTop;

  let guideX: number | undefined;
let guideY: number | undefined;

let bestX:
  | {
      distance: number;
      delta: number;
      guide: number;
    }
  | undefined;

let bestY:
  | {
      distance: number;
      delta: number;
      guide: number;
    }
  | undefined;

for (const otherBox of textBoxes) {
  if (otherBox.id === box.id) continue;
  if (otherBox.pageNumber !== box.pageNumber) continue;

  const otherEdit = getTextEdit(otherBox);

  if (otherEdit.deleted) continue;

  const otherMeasured = measureTextBox(
    otherEdit.text,
    otherEdit.fontSize,
    otherEdit.fontFamily,
    otherEdit.bold,
    otherEdit.italic
  );

  const otherLeft =
    otherBox.left + otherEdit.offsetX;

  const otherTop =
    otherBox.top + otherEdit.offsetY;

  const currentWidth = measuredTextBox.width;
  const currentHeight = measuredTextBox.height;

  const otherWidth = otherMeasured.width;
  const otherHeight = otherMeasured.height;

  const currentXPoints = [
    rawLeft,
    rawLeft + currentWidth / 2,
    rawLeft + currentWidth,
  ];

  const otherXPoints = [
    otherLeft,
    otherLeft + otherWidth / 2,
    otherLeft + otherWidth,
  ];

  for (const currentX of currentXPoints) {
    for (const targetX of otherXPoints) {
      const distance =
        Math.abs(currentX - targetX);

      if (
        distance <= snapThreshold &&
        (!bestX || distance < bestX.distance)
      ) {
        bestX = {
          distance,
          delta: targetX - currentX,
          guide: targetX,
        };
      }
    }
  }

  const currentYPoints = [
    rawTop,
    rawTop + currentHeight,
  ];

  const otherYPoints = [
    otherTop,
    otherTop + otherHeight,
  ];

  for (const currentY of currentYPoints) {
    for (const targetY of otherYPoints) {
      const distance =
        Math.abs(currentY - targetY);

      if (
        distance <= snapThreshold &&
        (!bestY || distance < bestY.distance)
      ) {
        bestY = {
          distance,
          delta: targetY - currentY,
          guide: targetY,
        };
      }
    }
  }
}

if (bestX) {
  snappedLeft = rawLeft + bestX.delta;
  guideX = bestX.guide;
}

if (bestY) {
  snappedTop = rawTop + bestY.delta;
  guideY = bestY.guide;
}
  setTextSnapGuides({
    x: guideX,
    y: guideY,
  });

  updateEdit(box, {
    offsetX: snappedLeft - box.left,
    offsetY: snappedTop - box.top,
  });
}}

          onPointerUp={(event) => {
  dragRef.current = null;
  setIsTextDragging(false);

  if (
    event.currentTarget.hasPointerCapture(
      event.pointerId
    )
  ) {
    event.currentTarget.releasePointerCapture(
      event.pointerId
    );
  }
}}

          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => {
  event.preventDefault();
  event.stopPropagation();

  event.currentTarget.focus();
  event.currentTarget.select();
}}

          onChange={(event) =>
            updateEdit(box, {
              text: event.target.value,
              deleted: false,
            })
          }

          className={`pointer-events-auto absolute z-40 resize-none overflow-hidden border bg-transparent p-0 outline-none ${
  moveMode
    ? "border-dashed border-blue-500"
    : "border-transparent"
}`}

          style={{
            left,
            top,

            width: measuredTextBox.width,
height: measuredTextBox.height,
minWidth: measuredTextBox.width,
minHeight: measuredTextBox.height,

            fontFamily: activeEdit.fontFamily,

            fontSize: activeEdit.fontSize,

            fontWeight:
              activeEdit.bold ? 700 : 400,

            fontStyle:
              activeEdit.italic
                ? "italic"
                : "normal",

            lineHeight: 1.05,

            color: activeEdit.color,

            backgroundColor: "transparent",

            transform: `rotate(${box.angle}deg)`,

            transformOrigin: "0 0",

            cursor:
              moveMode ? "move" : "text",
              touchAction: moveMode ? "none" : "auto",
userSelect: moveMode ? "none" : "text",

            caretColor: "#2563eb",
          }}
        />
      )}

      {/* FINISHED EDITED TEXT */}
      {!isSelected &&
        edit &&
        !edit.deleted &&
        hasChanged && (
          <button
            type="button"

            onMouseDown={(event) =>
              event.stopPropagation()
            }

            onClick={(event) => {
              event.stopPropagation();
              startEditing(box);
            }}

            className="pointer-events-auto absolute z-30 cursor-text border border-dashed border-transparent bg-transparent p-0 text-left outline-none hover:border-blue-500"

            style={{
              left,
              top,

              width: measuredTextBox.width,

              height: measuredTextBox.height,
minHeight: measuredTextBox.height,

              backgroundColor: "transparent",

              color: activeEdit.color,

              fontFamily:
                activeEdit.fontFamily,

              fontSize:
                activeEdit.fontSize,

              fontWeight:
                activeEdit.bold
                  ? 700
                  : 400,

              fontStyle:
                activeEdit.italic
                  ? "italic"
                  : "normal",

              lineHeight: 1.05,

              transform: `rotate(${box.angle}deg)`,

              transformOrigin: "0 0",

              whiteSpace: "pre-wrap",
            }}
          >
            {activeEdit.text}
          </button>
        )}

      {/* ORIGINAL UNEDITED TEXT CLICK AREA */}
      {!isSelected && !hasChanged && (
        <button
          type="button"

          aria-label={`Edit ${box.text}`}

          onPointerDown={(event) => {
  event.stopPropagation();

  pendingCaretRef.current = {
    id: box.id,
    clientX: event.clientX,
  };

  textClickRef.current = {
    id: box.id,
    time: Date.now(),
  };
}}

onClick={(event) => {
  event.stopPropagation();
  startEditing(box);
}}

          className="pointer-events-auto absolute z-30 cursor-text border border-dashed border-transparent bg-transparent p-0 outline-none hover:border-blue-500"

          style={{
            left: box.left,
            top: box.top,

            width: Math.max(
  measuredTextBox.width,
  box.width + 4
),

height: Math.max(
  measuredTextBox.height,
  box.height + 2
),

            transform: `rotate(${box.angle}deg)`,

            transformOrigin: "0 0",
          }}
        />
      )}
    </div>
  );
})}
          </div>
        </div>
        {pdfDoc && (
  <button
    type="button"
    onClick={() =>
      insertPageAt(pageNumber, pageNumber)
    }
    className="flex items-center gap-2 rounded-md border border-blue-400 bg-white px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
  >
    <Plus size={16} />
    Insert page here
  </button>
)}

{pdfDoc &&
  Array.from(
    { length: Math.max(0, pageCount - pageNumber) },
    (_, index) => {
      const previewPage =
        pageNumber + index + 1;

      return (
        <div
          key={`after-page-${previewPage}`}
          className="flex flex-col items-center gap-6"
        >
          <PdfPagePreview
            pdfDoc={pdfDoc}
            pageNumber={previewPage}
            scale={scale}
            onActivate={() => {
              setPageNumber(previewPage);
              setRotation(0);
            }}
          />

          <button
            type="button"
            onClick={() =>
              insertPageAt(
                previewPage,
                previewPage
              )
            }
            className="flex items-center gap-2 rounded-md border border-blue-400 bg-white px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
          >
            <Plus size={16} />
            Insert page here
          </button>
        </div>
      );
    }
  )}
      </section>
    </main>
  );
}