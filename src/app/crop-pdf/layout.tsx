import type { Metadata } from "next";
import { toolSeo } from "@/data/toolSeo";

const seo = toolSeo["/crop-pdf"];

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  alternates: {
    canonical: "/crop-pdf",
  },
  openGraph: {
    title: seo.title,
    description: seo.description,
    url: "https://toolijo.com/crop-pdf",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: seo.title,
    description: seo.description,
  },
};

export default function CropPdfLayout({ children }: { children: React.ReactNode }) {
  return children;
}
