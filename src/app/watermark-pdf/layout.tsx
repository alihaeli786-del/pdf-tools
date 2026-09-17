import type { Metadata } from "next";
import { toolSeo } from "@/data/toolSeo";
import RelatedTools from "@/components/RelatedTools";

const seo = toolSeo["/watermark-pdf"];

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  alternates: {
    canonical: "/watermark-pdf",
  },
  openGraph: {
    title: seo.title,
    description: seo.description,
    url: "https://toolijo.com/watermark-pdf",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: seo.title,
    description: seo.description,
  },
};

export default function WatermarkPdfLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <RelatedTools currentHref="/watermark-pdf" />
    </>
  );
}
