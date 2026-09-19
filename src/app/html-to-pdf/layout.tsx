import type { Metadata } from "next";
import { toolSeo } from "@/data/toolSeo";
import RelatedTools from "@/components/RelatedTools";

const seo = toolSeo["/html-to-pdf"];

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  alternates: {
    canonical: "/html-to-pdf",
  },
  openGraph: {
    title: seo.title,
    description: seo.description,
    url: "https://toolijo.com/html-to-pdf",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: seo.title,
    description: seo.description,
  },
};

export default function HtmlToPdfLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <RelatedTools currentHref="/html-to-pdf" />
    </>
  );
}
