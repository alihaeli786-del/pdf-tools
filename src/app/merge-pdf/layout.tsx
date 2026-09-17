import type { Metadata } from "next";
import { toolSeo } from "@/data/toolSeo";
import RelatedTools from "@/components/RelatedTools";

const seo = toolSeo["/merge-pdf"];

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  alternates: {
    canonical: "/merge-pdf",
  },
  openGraph: {
    title: seo.title,
    description: seo.description,
    url: "https://toolijo.com/merge-pdf",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: seo.title,
    description: seo.description,
  },
};

export default function MergePdfLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <RelatedTools currentHref="/merge-pdf" />
    </>
  );
}
