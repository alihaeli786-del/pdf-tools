import type { Metadata } from "next";
import { toolSeo } from "@/data/toolSeo";

const seo = toolSeo["/resize-image"];

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  alternates: {
    canonical: "/resize-image",
  },
  openGraph: {
    title: seo.title,
    description: seo.description,
    url: "https://toolijo.com/resize-image",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: seo.title,
    description: seo.description,
  },
};

export default function ResizeImageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
