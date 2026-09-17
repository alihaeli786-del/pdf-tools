import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Toolijo",
  description: "Learn about Toolijo, a growing collection of simple online tools for editing, converting and managing PDF and image files.",
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="border-b border-slate-200 bg-white px-5 py-16 md:px-6 md:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <Link href="/" className="inline-block">
            <img src="/toolijo-logo.png" alt="Toolijo" className="mx-auto h-12 w-auto max-w-[230px] object-contain" />
          </Link>
          <h1 className="mt-8 text-4xl font-black tracking-[-0.04em] text-slate-950 md:text-5xl">About Toolijo</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Toolijo is a growing collection of straightforward online tools designed to make everyday PDF and image tasks easier.
          </p>
        </div>
      </section>

      <section className="px-5 py-16 md:px-6 md:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-slate-950">Simple by design</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Our tools focus on clear controls and practical workflows so you can complete common file tasks without complicated software or unnecessary setup.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-slate-950">Useful PDF tools</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Edit, merge, split, rotate, organize, crop, watermark, protect, unlock and convert PDF files with tools built for everyday use.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-slate-950">Image tools too</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Convert, compress, resize and crop images, or remove image backgrounds with tools that work directly from your web browser.
              </p>
            </div>
          </div>

          <div className="mt-10 rounded-[32px] border border-slate-200 bg-white p-7 shadow-sm md:p-10">
            <h2 className="text-3xl font-black tracking-[-0.03em] text-slate-950">What we are building</h2>
            <p className="mt-5 text-base leading-8 text-slate-600">
              Toolijo is being developed as a practical toolkit for people who need quick access to common document and image utilities. Instead of making users switch between many different websites, the goal is to bring useful tools together in one consistent experience.
            </p>
            <p className="mt-4 text-base leading-8 text-slate-600">
              The collection continues to grow as existing tools are improved and new utilities are added. We focus on making each tool understandable, useful and easy to access on both desktop and mobile devices.
            </p>
          </div>

          <div className="mt-10 rounded-[32px] border border-violet-200 bg-violet-50 p-7 md:p-10">
            <h2 className="text-2xl font-black text-slate-950">Explore Toolijo</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Visit the homepage to browse all currently available PDF and image tools.
            </p>
            <Link href="/" className="mt-6 inline-flex rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-700">
              Explore all tools
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
