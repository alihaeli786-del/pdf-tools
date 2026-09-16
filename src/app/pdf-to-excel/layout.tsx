import type { Metadata } from "next";
import { toolSeo } from "@/data/toolSeo";

const seo = toolSeo["/pdf-to-excel"];

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  alternates: {
    canonical: "/pdf-to-excel",
  },
  openGraph: {
    title: seo.title,
    description: seo.description,
    url: "https://toolijo.com/pdf-to-excel",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: seo.title,
    description: seo.description,
  },
};

export default function PdfToExcelLayout({ children }: { children: React.ReactNode }) {
  return children;
}
