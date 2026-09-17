import type { Metadata } from "next";
import { toolSeo } from "@/data/toolSeo";
import RelatedTools from "@/components/RelatedTools";

const seo = toolSeo["/image-converter"];

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  alternates: {
    canonical: "/image-converter",
  },
  openGraph: {
    title: seo.title,
    description: seo.description,
    url: "https://toolijo.com/image-converter",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: seo.title,
    description: seo.description,
  },
};

export default function ImageConverterLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <RelatedTools currentHref="/image-converter" />
    </>
  );
}
