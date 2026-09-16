import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://toolijo.com"),
  title: {
    default: "Toolijo - Free Online PDF & Image Tools",
    template: "%s | Toolijo",
  },
  description: "Use Toolijo's free online PDF and image tools to edit, convert, merge, split, crop, resize, protect and manage files quickly in your browser.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "https://toolijo.com",
    siteName: "Toolijo",
    title: "Toolijo - Free Online PDF & Image Tools",
    description: "Use Toolijo's free online PDF and image tools to edit, convert, merge, split, crop, resize, protect and manage files quickly in your browser.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Toolijo - Free Online PDF & Image Tools",
    description: "Use Toolijo's free online PDF and image tools to edit, convert, merge, split, crop, resize, protect and manage files quickly in your browser.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
