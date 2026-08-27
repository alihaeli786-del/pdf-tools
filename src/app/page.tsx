"use client";

import { useEffect, useRef, useState } from "react";
import {
  Search,
  ArrowRight,
  ShieldCheck,
  Zap,
  Layers3,
  Upload,
  WandSparkles,
  Download,
  CircleHelp,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { tools as allTools } from "../data/tools";
export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [pdfFilter, setPdfFilter] = useState<
    "all" | "edit-organize" | "convert" | "security" | "optimize"
  >("all");
  const searchBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        searchBoxRef.current &&
        !searchBoxRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const searchResults = normalizedQuery
    ? allTools
        .filter((tool) => {
          const searchableText = [
            tool.title,
            tool.description,
            ...tool.keywords,
          ]
            .join(" ")
            .toLowerCase();

          return searchableText.includes(normalizedQuery);
        })
        .sort((a, b) => {
          const getScore = (tool: (typeof allTools)[number]) => {
            let score = 0;

            const title = tool.title.toLowerCase();

            if (title === normalizedQuery) {
              score += 200;
            }

            if (title.startsWith(normalizedQuery)) {
              score += 100;
            }

            if (title.includes(normalizedQuery)) {
              score += 50;
            }

            if (
              normalizedQuery.includes("image") &&
              tool.category === "image"
            ) {
              score += 300;
            }

            if (
              normalizedQuery.includes("pdf") &&
              tool.category === "pdf"
            ) {
              score += 300;
            }

            return score;
          };

          return getScore(b) - getScore(a);
        })
        .slice(0, 8)
    : [];

  const popularTools = allTools.filter((tool) => tool.popular);
  const pdfTools = allTools.filter((tool) => tool.category === "pdf");
  const imageTools = allTools.filter((tool) => tool.category === "image");

  const filteredPdfTools =
    pdfFilter === "all"
      ? pdfTools
      : pdfTools.filter((tool) => tool.subcategory === pdfFilter);

  const pdfFilters = [
    { label: "All PDF", value: "all" },
    { label: "Edit & Organize", value: "edit-organize" },
    { label: "Convert", value: "convert" },
    { label: "Security", value: "security" },
    { label: "Optimize", value: "optimize" },
  ] as const;

  const renderToolCard = (tool: (typeof allTools)[number]) => {
    const isComingSoon = tool.comingSoon || !tool.href;

    if (!isComingSoon && tool.href) {
      return (
        <a
          key={tool.title}
          href={tool.href}
          className="group relative flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_18px_45px_rgba(15,23,42,0.10)] sm:p-6"
        >
          {tool.popular && (
            <span className="absolute right-3 top-3 rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black tracking-wide text-violet-700 sm:right-4 sm:top-4 sm:px-3 sm:text-xs">
              POPULAR
            </span>
          )}

          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-xl transition group-hover:bg-violet-50 sm:mb-5 sm:h-12 sm:w-12 sm:text-2xl">
            {tool.icon}
          </div>

          <h3 className="pr-1 text-base font-black text-slate-900 sm:text-lg">
            {tool.title}
          </h3>

          <p className="mt-2 text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6">
            {tool.description}
          </p>

          <div className="mt-auto pt-5">
            <span className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-3 py-2.5 text-xs font-bold text-white shadow-sm transition group-hover:shadow-md sm:px-4 sm:text-sm">
              Open tool
            </span>
          </div>
        </a>
      );
    }

    return (
      <div
        key={tool.title}
        className="relative flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left shadow-sm opacity-80 sm:p-6"
      >
        <span className="absolute right-3 top-3 rounded-full bg-amber-100 px-2.5 py-1 text-[9px] font-black tracking-wide text-amber-700 sm:right-4 sm:top-4 sm:px-3 sm:text-xs">
          COMING SOON
        </span>

        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-xl sm:mb-5 sm:h-12 sm:w-12 sm:text-2xl">
          {tool.icon}
        </div>

        <h3 className="pr-1 text-base font-black text-slate-900 sm:text-lg">
          {tool.title}
        </h3>

        <p className="mt-2 text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6">
          {tool.description}
        </p>

        <div className="mt-auto pt-5">
          <span className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-3 py-2.5 text-xs font-bold text-white shadow-sm sm:px-4 sm:text-sm">
            Coming soon
          </span>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen overflow-x-clip bg-[#f7f8fc] text-slate-900">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">

        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 lg:px-6">

          <a href="/" className="flex min-w-0 items-center gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 text-lg font-black text-white shadow-[0_8px_24px_rgba(99,102,241,0.25)]">
              P
            </div>

            <div className="min-w-0">
              <div className="text-[17px] font-black tracking-tight text-slate-950">
                PDF Tools
              </div>

              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Documents & Images
              </div>
            </div>

          </a>


          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50/80 p-1.5 lg:flex">

            <a
              href="#pdf-tools"
              className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-white hover:text-violet-700 hover:shadow-sm"
            >
              PDF Tools
            </a>

            <a
              href="#image-tools"
              className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-white hover:text-violet-700 hover:shadow-sm"
            >
              Image Tools
            </a>

            <a
              href="#all-tools"
              className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-white hover:text-violet-700 hover:shadow-sm"
            >
              All Tools
            </a>

          </nav>


          {/* Desktop Actions */}
          <div className="hidden items-center gap-2 lg:flex">

            <a
              href="#pdf-tools"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
            >
              Browse tools
            </a>

            <a
              href="/edit-pdf"
              className="rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(79,70,229,0.22)] transition hover:-translate-y-0.5"
            >
              Edit PDF
            </a>

          </div>


          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((current) => !current)}
            aria-label="Toggle navigation menu"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 lg:hidden"
          >
            {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>

        </div>


        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <>
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 top-[72px] z-40 bg-slate-950/20 backdrop-blur-[2px] lg:hidden"
            />

            <div className="absolute left-0 right-0 top-[72px] z-50 border-b border-slate-200 bg-white px-5 py-4 shadow-[0_20px_50px_rgba(15,23,42,0.12)] lg:hidden">

              <nav className="mx-auto flex max-w-7xl flex-col gap-2">

                <a
                  href="#pdf-tools"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-violet-50 hover:text-violet-700"
                >
                  PDF Tools
                </a>

                <a
                  href="#image-tools"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-violet-50 hover:text-violet-700"
                >
                  Image Tools
                </a>

                <a
                  href="#all-tools"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-violet-50 hover:text-violet-700"
                >
                  All Tools
                </a>

                <a
                  href="#popular-tools"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-violet-50 hover:text-violet-700"
                >
                  Popular Tools
                </a>


                <div className="my-1 h-px bg-slate-100" />


                <a
                  href="/edit-pdf"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm"
                >
                  Edit PDF
                </a>

              </nav>

            </div>
          </>
        )}

      </header>

      {/* Premium Hero */}
      <section className="relative z-20 overflow-visible px-5 pb-20 pt-16 md:pb-24 md:pt-20">

        <div className="pointer-events-none absolute left-1/2 top-[-260px] h-[620px] w-[900px] -translate-x-1/2 rounded-full bg-violet-200/30 blur-[100px]" />

        <div className="pointer-events-none absolute right-[-170px] top-[180px] h-[380px] w-[380px] rounded-full bg-blue-200/30 blur-[100px]" />


        <div className="relative mx-auto max-w-5xl text-center">

          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-4 py-2 text-xs font-bold text-violet-700 shadow-sm backdrop-blur">

            <span className="h-2 w-2 rounded-full bg-emerald-500" />

            Fast, private and easy to use

          </div>


          <h1 className="mx-auto mt-7 max-w-4xl text-5xl font-black tracking-[-0.045em] text-slate-950 md:text-7xl md:leading-[1.02]">

            All your document and image tools.

            <span className="mt-2 block bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
              One powerful workspace.
            </span>

          </h1>


          <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-slate-600 md:text-lg md:leading-8">
            Edit, convert, organize and secure PDFs. Convert, compress and resize images with fast tools designed to get the job done.
          </p>


          {/* Working Search */}
          <div ref={searchBoxRef} className="relative mx-auto mt-9 max-w-2xl text-left">

            <div className="relative rounded-[22px] border border-slate-200 bg-white p-2 shadow-[0_18px_60px_rgba(15,23,42,0.12)] transition focus-within:border-violet-300 focus-within:shadow-[0_22px_70px_rgba(99,102,241,0.16)]">

              <Search
                size={21}
                className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search tools... Try: crop, resize, Excel, password"
                className="h-14 w-full rounded-2xl bg-transparent pl-14 pr-5 text-[15px] font-semibold text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-400"
              />

            </div>


            {normalizedQuery && searchOpen && (
              <div className="absolute left-0 right-0 top-[76px] z-40 overflow-hidden rounded-[22px] border border-slate-200 bg-white p-2 shadow-[0_24px_70px_rgba(15,23,42,0.16)]">

                {searchResults.length > 0 ? (

                  <div className="max-h-[390px] overflow-y-auto">

                    {searchResults.map((tool) =>
                      tool.href ? (

                        <a
                          key={tool.title}
                          href={tool.href}
                          className="group flex items-center gap-4 rounded-2xl px-4 py-3.5 transition hover:bg-violet-50"
                        >

                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl transition group-hover:bg-white">
                            {tool.icon}
                          </div>


                          <div className="min-w-0 flex-1">

                            <div className="font-black text-slate-900">
                              {tool.title}
                            </div>

                            <div className="mt-0.5 truncate text-xs text-slate-500">
                              {tool.description}
                            </div>

                          </div>


                          <ArrowRight
                            size={17}
                            className="shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-violet-600"
                          />

                        </a>

                      ) : (

                        <div
                          key={tool.title}
                          className="flex items-center gap-4 rounded-2xl px-4 py-3.5 opacity-60"
                        >

                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl">
                            {tool.icon}
                          </div>


                          <div className="min-w-0 flex-1">

                            <div className="font-black text-slate-900">
                              {tool.title}
                            </div>

                            <div className="mt-0.5 text-xs text-slate-500">
                              Coming soon
                            </div>

                          </div>

                        </div>

                      )
                    )}

                  </div>

                ) : (

                  <div className="px-5 py-8 text-center">

                    <div className="font-bold text-slate-800">
                      No tools found
                    </div>

                    <div className="mt-1 text-sm text-slate-500">
                      Try another keyword such as PDF, image, crop or convert.
                    </div>

                  </div>

                )}

              </div>
            )}

          </div>


          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-slate-500">

            <span>No complicated software</span>

            <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />

            <span>Browser-first processing</span>

            <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />

            <span>19 tools and growing</span>

          </div>

        </div>

      </section>

      <div id="all-tools" className="scroll-mt-24" />

      {/* Popular Tools */}
      <section id="popular-tools" className="px-5 pb-20 md:px-6 md:pb-24">
        <div className="mx-auto max-w-7xl">

          <div className="mb-8 flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-violet-700">
                Start here
              </div>

              <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                Popular tools
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 md:text-base">
                Quick access to the tools people need most for documents and images.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-500 shadow-sm">
              {popularTools.length} popular tools
            </div>
          </div>


          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
            {popularTools.map((tool) => renderToolCard(tool))}
          </div>

        </div>
      </section>


      {/* PDF Tools */}
      <section
        id="pdf-tools"
        className="border-y border-slate-200/80 bg-white/70 px-5 py-20 md:px-6 md:py-24"
      >
        <div className="mx-auto max-w-7xl">

          <div className="mb-8 flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-blue-700">
                PDF workspace
              </div>

              <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                PDF Tools
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                Edit, organize, convert, secure and manage PDF documents from one place.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-500 shadow-sm">
              {pdfTools.length} PDF tools
            </div>
          </div>


          {/* PDF Filters */}
          <div className="mb-8 flex flex-wrap justify-center gap-2 md:justify-start">

            {pdfFilters.map((filter) => {
              const active = pdfFilter === filter.value;

              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setPdfFilter(filter.value)}
                  className={`rounded-xl border px-4 py-2.5 text-xs font-black transition sm:text-sm ${
                    active
                      ? "border-violet-600 bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-md"
                      : "border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}

          </div>


          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
            {filteredPdfTools.map((tool) => renderToolCard(tool))}
          </div>

        </div>
      </section>


      {/* Image Tools */}
      <section
        id="image-tools"
        className="px-5 py-20 md:px-6 md:py-24"
      >
        <div className="mx-auto max-w-7xl">

          <div className="mb-8 flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-violet-700">
                Image workspace
              </div>

              <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                Image Tools
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                Convert, compress and resize images with fast browser-based tools.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-500 shadow-sm">
              {imageTools.length} image tools
            </div>
          </div>


          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
            {imageTools.map((tool) => renderToolCard(tool))}
          </div>

        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-slate-200 bg-white px-5 py-20 md:px-6 md:py-24">

        <div className="mx-auto max-w-5xl">

          <div className="mx-auto max-w-3xl text-center">

            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-violet-700">
              <CircleHelp size={15} />
              Frequently asked questions
            </div>

            <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
              Questions? We have answers.
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              Everything you need to know before using our PDF and image tools.
            </p>

          </div>


          <div className="mt-12 grid gap-4 md:grid-cols-2">

            <details className="group rounded-[22px] border border-slate-200 bg-slate-50/70 p-5 transition open:border-violet-200 open:bg-violet-50/40">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-black text-slate-900">
                Are the tools free to use?

                <ChevronDown
                  size={18}
                  className="shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180"
                />
              </summary>

              <p className="mt-4 text-sm leading-6 text-slate-600">
                The current tools can be used directly without creating an account. If premium features are introduced later, they will be clearly identified.
              </p>
            </details>


            <details className="group rounded-[22px] border border-slate-200 bg-slate-50/70 p-5 transition open:border-violet-200 open:bg-violet-50/40">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-black text-slate-900">
                Do I need to create an account?

                <ChevronDown
                  size={18}
                  className="shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180"
                />
              </summary>

              <p className="mt-4 text-sm leading-6 text-slate-600">
                No account is required for the tools currently available on the website.
              </p>
            </details>


            <details className="group rounded-[22px] border border-slate-200 bg-slate-50/70 p-5 transition open:border-violet-200 open:bg-violet-50/40">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-black text-slate-900">
                How are my files processed?

                <ChevronDown
                  size={18}
                  className="shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180"
                />
              </summary>

              <p className="mt-4 text-sm leading-6 text-slate-600">
                Many of our current tools process files directly in your browser. If a future tool requires server-side processing, that workflow can be clearly indicated on the tool page.
              </p>
            </details>


            <details className="group rounded-[22px] border border-slate-200 bg-slate-50/70 p-5 transition open:border-violet-200 open:bg-violet-50/40">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-black text-slate-900">
                Can I use the tools on mobile?

                <ChevronDown
                  size={18}
                  className="shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180"
                />
              </summary>

              <p className="mt-4 text-sm leading-6 text-slate-600">
                Yes. The website is designed to work across desktop, tablet and mobile browsers, although very large files may work better on a desktop device.
              </p>
            </details>


            <details className="group rounded-[22px] border border-slate-200 bg-slate-50/70 p-5 transition open:border-violet-200 open:bg-violet-50/40">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-black text-slate-900">
                Which file formats are supported?

                <ChevronDown
                  size={18}
                  className="shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180"
                />
              </summary>

              <p className="mt-4 text-sm leading-6 text-slate-600">
                Support depends on the tool. PDF tools work with PDF documents, while image tools support common formats such as JPG, PNG and WebP, with additional formats available in Image Converter.
              </p>
            </details>


            <details className="group rounded-[22px] border border-slate-200 bg-slate-50/70 p-5 transition open:border-violet-200 open:bg-violet-50/40">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-black text-slate-900">
                Will more tools be added?

                <ChevronDown
                  size={18}
                  className="shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180"
                />
              </summary>

              <p className="mt-4 text-sm leading-6 text-slate-600">
                Yes. The website is structured so new PDF, image and future file tools can be added without making the workspace difficult to navigate.
              </p>
            </details>

          </div>

        </div>

      </section>

      {/* Why Our Tools */}
      <section className="relative overflow-hidden border-t border-slate-200 bg-slate-950 px-5 py-20 text-white md:px-6 md:py-24">

        <div className="pointer-events-none absolute left-[-140px] top-[-140px] h-[420px] w-[420px] rounded-full bg-violet-600/20 blur-[110px]" />

        <div className="pointer-events-none absolute bottom-[-160px] right-[-100px] h-[420px] w-[420px] rounded-full bg-blue-600/20 blur-[110px]" />


        <div className="relative mx-auto max-w-7xl">

          <div className="mx-auto max-w-3xl text-center">

            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-violet-300">
              Built for simplicity
            </div>

            <h2 className="mt-5 text-3xl font-black tracking-tight md:text-5xl">
              Powerful tools without the complicated workflow.
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-400 md:text-base">
              Straightforward document and image tools designed to help you finish everyday file tasks quickly.
            </p>

          </div>


          <div className="mt-12 grid gap-4 md:grid-cols-3">

            <div className="rounded-[26px] border border-white/10 bg-white/[0.055] p-6 backdrop-blur">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
                <ShieldCheck size={23} />
              </div>

              <h3 className="mt-5 text-lg font-black">
                Browser-first tools
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Many of our tools process files directly in your browser for a fast and convenient workflow.
              </p>

            </div>


            <div className="rounded-[26px] border border-white/10 bg-white/[0.055] p-6 backdrop-blur">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300">
                <Zap size={23} />
              </div>

              <h3 className="mt-5 text-lg font-black">
                Fast by design
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Focused interfaces remove unnecessary steps so you can upload, process and download quickly.
              </p>

            </div>


            <div className="rounded-[26px] border border-white/10 bg-white/[0.055] p-6 backdrop-blur">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
                <Layers3 size={23} />
              </div>

              <h3 className="mt-5 text-lg font-black">
                One growing workspace
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                PDF and image tools live in one organized workspace, with more useful tools ready to be added over time.
              </p>

            </div>

          </div>


          {/* How It Works */}
          <div className="mt-20 rounded-[32px] border border-white/10 bg-white/[0.04] p-6 md:p-10">

            <div className="text-center">

              <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-300">
                How it works
              </p>

              <h3 className="mt-3 text-2xl font-black md:text-3xl">
                From file to finished in three steps
              </h3>

            </div>


            <div className="mt-10 grid gap-4 md:grid-cols-3">

              <div className="relative rounded-[24px] border border-white/10 bg-slate-900/60 p-6">

                <div className="absolute right-5 top-5 text-5xl font-black text-white/[0.04]">
                  01
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500 text-white shadow-lg shadow-violet-950/30">
                  <Upload size={20} />
                </div>

                <h4 className="mt-5 font-black">
                  Upload your file
                </h4>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Choose the PDF or image you want to work with.
                </p>

              </div>


              <div className="relative rounded-[24px] border border-white/10 bg-slate-900/60 p-6">

                <div className="absolute right-5 top-5 text-5xl font-black text-white/[0.04]">
                  02
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-lg shadow-indigo-950/30">
                  <WandSparkles size={20} />
                </div>

                <h4 className="mt-5 font-black">
                  Process it
                </h4>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Apply the settings you need using a clean, focused interface.
                </p>

              </div>


              <div className="relative rounded-[24px] border border-white/10 bg-slate-900/60 p-6">

                <div className="absolute right-5 top-5 text-5xl font-black text-white/[0.04]">
                  03
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-950/30">
                  <Download size={20} />
                </div>

                <h4 className="mt-5 font-black">
                  Download the result
                </h4>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Save the finished file and continue with your work.
                </p>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* Premium Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 px-5 text-slate-400 md:px-6">

        <div className="mx-auto max-w-7xl py-14 md:py-16">

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">

            {/* Brand */}
            <div className="max-w-sm">

              <a href="/" className="inline-flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 text-lg font-black text-white shadow-lg shadow-violet-950/30">
                  P
                </div>

                <div>
                  <div className="text-lg font-black text-white">
                    PDF Tools
                  </div>

                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Documents & Images
                  </div>
                </div>

              </a>


              <p className="mt-5 text-sm leading-6 text-slate-400">
                A growing collection of simple tools for working with PDFs and images directly from your browser.
              </p>


              <div className="mt-6 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold text-slate-400">
                19 tools and growing
              </div>

            </div>


            {/* PDF Tools */}
            <div>

              <h3 className="text-sm font-black uppercase tracking-[0.12em] text-white">
                PDF Tools
              </h3>

              <div className="mt-5 space-y-3 text-sm">

                <a
                  href="/edit-pdf"
                  className="block transition hover:text-white"
                >
                  Edit PDF
                </a>

                <a
                  href="/merge-pdf"
                  className="block transition hover:text-white"
                >
                  Merge PDF
                </a>

                <a
                  href="/split-pdf"
                  className="block transition hover:text-white"
                >
                  Split PDF
                </a>

                <a
                  href="/pdf-to-word"
                  className="block transition hover:text-white"
                >
                  PDF to Word
                </a>

                <a
                  href="/pdf-to-excel"
                  className="block transition hover:text-white"
                >
                  PDF to Excel
                </a>

                <a
                  href="#pdf-tools"
                  className="block font-bold text-violet-300 transition hover:text-violet-200"
                >
                  View all PDF tools
                </a>

              </div>

            </div>


            {/* Image Tools */}
            <div>

              <h3 className="text-sm font-black uppercase tracking-[0.12em] text-white">
                Image Tools
              </h3>

              <div className="mt-5 space-y-3 text-sm">

                <a
                  href="/image-converter"
                  className="block transition hover:text-white"
                >
                  Image Converter
                </a>

                <a
                  href="/compress-image"
                  className="block transition hover:text-white"
                >
                  Compress Image
                </a>

                <a
                  href="/resize-image"
                  className="block transition hover:text-white"
                >
                  Resize Image
                </a>

                <a
                  href="#image-tools"
                  className="block font-bold text-violet-300 transition hover:text-violet-200"
                >
                  View all image tools
                </a>

              </div>

            </div>


            {/* Help */}
            <div>

              <h3 className="text-sm font-black uppercase tracking-[0.12em] text-white">
                Help & Legal
              </h3>

              <div className="mt-5 space-y-3 text-sm">

                <a
                  href="#"
                  className="block transition hover:text-white"
                >
                  Privacy Policy
                </a>

                <a
                  href="#"
                  className="block transition hover:text-white"
                >
                  Terms of Use
                </a>

                <a
                  href="#"
                  className="block transition hover:text-white"
                >
                  Contact
                </a>

                <a
                  href="#popular-tools"
                  className="block transition hover:text-white"
                >
                  Popular Tools
                </a>

              </div>

            </div>

          </div>

        </div>


        {/* Bottom Bar */}
        <div className="border-t border-white/10">

          <div className="mx-auto flex max-w-7xl flex-col gap-3 py-6 text-center text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:text-left">

            <p>
              {"\u00A9"} 2026 PDF Tools. All rights reserved.
            </p>

            <p>
              Simple tools. Faster workflow.
            </p>

          </div>

        </div>

      </footer>
    </main>
  );
}