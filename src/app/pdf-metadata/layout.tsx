import type { Metadata } from "next";
import { toolSeo } from "@/data/toolSeo";

const seo = toolSeo["/pdf-metadata"];

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  alternates: {
    canonical: "/pdf-metadata",
  },
  openGraph: {
    title: seo.title,
    description: seo.description,
    url: "https://toolijo.com/pdf-metadata",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: seo.title,
    description: seo.description,
  },
};

export default function PdfMetadataLayout({ children }: { children: React.ReactNode }) {
  return children;
}
