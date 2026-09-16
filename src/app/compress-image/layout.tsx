import type { Metadata } from "next";
import { toolSeo } from "@/data/toolSeo";

const seo = toolSeo["/compress-image"];

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  alternates: {
    canonical: "/compress-image",
  },
  openGraph: {
    title: seo.title,
    description: seo.description,
    url: "https://toolijo.com/compress-image",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: seo.title,
    description: seo.description,
  },
};

export default function CompressImageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
