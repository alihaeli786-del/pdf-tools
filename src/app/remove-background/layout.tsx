import type { Metadata } from "next";
import { toolSeo } from "@/data/toolSeo";

const seo = toolSeo["/remove-background"];

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  alternates: {
    canonical: "/remove-background",
  },
  openGraph: {
    title: seo.title,
    description: seo.description,
    url: "https://toolijo.com/remove-background",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: seo.title,
    description: seo.description,
  },
};

export default function RemoveBackgroundLayout({ children }: { children: React.ReactNode }) {
  return children;
}
