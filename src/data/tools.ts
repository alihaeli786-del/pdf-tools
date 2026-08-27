export type ToolCategory = "pdf" | "image";

export type ToolSubcategory =
  | "edit-organize"
  | "convert"
  | "security"
  | "optimize"
  | "image";

export type ToolItem = {
  title: string;
  description: string;
  href?: string;
  icon: string;
  category: ToolCategory;
  subcategory: ToolSubcategory;
  popular?: boolean;
  comingSoon?: boolean;
  keywords: string[];
};

export const tools: ToolItem[] = [
  {
    title: "Edit PDF",
    description: "Edit text, images, signatures and more inside your PDF.",
    href: "/edit-pdf",
    icon: "\u270F\uFE0F",
    category: "pdf",
    subcategory: "edit-organize",
    popular: true,
    keywords: ["edit", "pdf", "text", "signature", "modify"],
  },
  {
    title: "Merge PDF",
    description: "Combine multiple PDF files into one document.",
    href: "/merge-pdf",
    icon: "\uD83D\uDCD1",
    category: "pdf",
    subcategory: "edit-organize",
    popular: true,
    keywords: ["merge", "combine", "join", "pdf"],
  },
  {
    title: "Split PDF",
    description: "Separate PDF pages into individual files.",
    href: "/split-pdf",
    icon: "\u2702\uFE0F",
    category: "pdf",
    subcategory: "edit-organize",
    keywords: ["split", "separate", "extract", "pages", "pdf"],
  },
  {
    title: "Compress PDF",
    description: "Reduce PDF file size while keeping good quality.",
    icon: "\uD83D\uDDDC\uFE0F",
    category: "pdf",
    subcategory: "optimize",
    comingSoon: true,
    keywords: ["compress", "reduce", "size", "optimize", "pdf"],
  },
  {
    title: "PDF to JPG",
    description: "Convert PDF pages into high-quality JPG images.",
    href: "/pdf-to-jpg",
    icon: "\uD83D\uDDBC\uFE0F",
    category: "pdf",
    subcategory: "convert",
    popular: true,
    keywords: ["pdf", "jpg", "jpeg", "image", "convert"],
  },
  {
    title: "JPG to PDF",
    description: "Turn JPG, JPEG and PNG images into a professional PDF.",
    href: "/jpg-to-pdf",
    icon: "\uD83D\uDCC4",
    category: "pdf",
    subcategory: "convert",
    keywords: ["jpg", "jpeg", "png", "image", "pdf", "convert"],
  },
  {
    title: "Rotate PDF",
    description: "Rotate individual pages or your entire PDF document.",
    href: "/rotate-pdf",
    icon: "\uD83D\uDD04",
    category: "pdf",
    subcategory: "edit-organize",
    keywords: ["rotate", "turn", "page", "pdf"],
  },
  {
    title: "Organize PDF",
    description: "Reorder, remove and organize PDF pages visually.",
    href: "/organize-pdf",
    icon: "\uD83D\uDCCB",
    category: "pdf",
    subcategory: "edit-organize",
    keywords: ["organize", "reorder", "remove", "pages", "pdf"],
  },
  {
    title: "Protect PDF",
    description: "Protect your PDF with secure password encryption.",
    href: "/protect-pdf",
    icon: "\uD83D\uDD10",
    category: "pdf",
    subcategory: "security",
    keywords: ["protect", "password", "encrypt", "secure", "pdf"],
  },
  {
    title: "Unlock PDF",
    description: "Unlock password-protected PDF files.",
    href: "/unlock-pdf",
    icon: "\uD83D\uDD13",
    category: "pdf",
    subcategory: "security",
    keywords: ["unlock", "password", "decrypt", "remove password", "pdf"],
  },
  {
    title: "Watermark PDF",
    description: "Add text or image watermarks to your PDF pages.",
    href: "/watermark-pdf",
    icon: "\uD83D\uDCA7",
    category: "pdf",
    subcategory: "edit-organize",
    keywords: ["watermark", "logo", "text", "stamp", "pdf"],
  },
  {
    title: "Crop PDF",
    description: "Crop PDF pages visually and remove unwanted margins.",
    href: "/crop-pdf",
    icon: "\u2702\uFE0F",
    category: "pdf",
    subcategory: "edit-organize",
    keywords: ["crop", "margin", "trim", "page", "pdf"],
  },
  {
    title: "PDF Metadata",
    description: "View and edit PDF title, author, subject and metadata.",
    href: "/pdf-metadata",
    icon: "\uD83C\uDFF7\uFE0F",
    category: "pdf",
    subcategory: "edit-organize",
    keywords: ["metadata", "title", "author", "subject", "pdf"],
  },
  {
    title: "Page Numbers",
    description: "Add customizable page numbers to your PDF document.",
    href: "/page-numbers",
    icon: "\uD83D\uDD22",
    category: "pdf",
    subcategory: "edit-organize",
    keywords: ["page numbers", "number", "pages", "pdf"],
  },
  {
    title: "PDF to Word",
    description: "Convert PDF documents into editable Word files.",
    href: "/pdf-to-word",
    icon: "\uD83D\uDCDD",
    category: "pdf",
    subcategory: "convert",
    popular: true,
    keywords: ["pdf", "word", "docx", "document", "convert"],
  },
  {
    title: "PDF to Excel",
    description: "Convert PDF content and tables into Excel spreadsheets.",
    href: "/pdf-to-excel",
    icon: "\uD83D\uDCCA",
    category: "pdf",
    subcategory: "convert",
    keywords: ["pdf", "excel", "xlsx", "table", "spreadsheet", "convert"],
  },
  {
    title: "Image Converter",
    description: "Convert JPG, PNG, WebP and many other image formats.",
    href: "/image-converter",
    icon: "\uD83D\uDD04",
    category: "image",
    subcategory: "image",
    popular: true,
    keywords: ["image", "convert", "jpg", "png", "webp", "avif", "tiff"],
  },
  {
    title: "Compress Image",
    description: "Reduce image size without noticeable quality loss.",
    href: "/compress-image",
    icon: "\u26A1",
    category: "image",
    subcategory: "image",
    popular: true,
    keywords: ["compress", "image", "reduce", "size", "jpg", "png", "webp"],
  },
  {
    title: "Resize Image",
    description: "Resize images quickly to the exact dimensions you need.",
    href: "/resize-image",
    icon: "\u2194\uFE0F",
    category: "image",
    subcategory: "image",
    keywords: ["resize", "image", "width", "height", "dimensions", "pixels"],
  },
  {
    title: "Crop Image",
    description: "Crop images precisely with custom sizes and aspect ratios.",
    href: "/crop-image",
    icon: "\u2702\uFE0F",
    category: "image",
    subcategory: "image",
    keywords: ["crop", "image", "trim", "aspect ratio", "size"],
  },
  {
    title: "Background Remover",
    description: "Remove image backgrounds automatically with AI.",
    href: "/remove-background",
    icon: "\u2728",
    category: "image",
    subcategory: "image",
    popular: true,
    keywords: ["background", "remove", "remover", "transparent", "ai", "image", "subject"],
  },
];

export const pdfTools = tools.filter((tool) => tool.category === "pdf");
export const imageTools = tools.filter((tool) => tool.category === "image");
export const popularTools = tools.filter((tool) => tool.popular);
