import type { Metadata } from "next";
import { toolSeo } from "@/data/toolSeo";
import RelatedTools from "@/components/RelatedTools";

const seo = toolSeo["/pdf-to-jpg"];

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  alternates: {
    canonical: "/pdf-to-jpg",
  },
  openGraph: {
    title: seo.title,
    description: seo.description,
    url: "https://toolijo.com/pdf-to-jpg",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: seo.title,
    description: seo.description,
  },
};

export default function PdfToJpgLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <RelatedTools currentHref="/pdf-to-jpg" />
    </>
  );
}
