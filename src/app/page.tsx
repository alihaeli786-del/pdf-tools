export default function Home() {
  const tools = [
    {
      title: "Edit PDF",
      description: "Edit text, images, signatures and more inside your PDF.",
      icon: "✏️",
      featured: true,
      href: "/edit-pdf",
    },
    {
      title: "Merge PDF",
      description: "Combine multiple PDF files into one document.",
      icon: "📑",
      href: "/merge-pdf",
    },
    {
      title: "Split PDF",
      description: "Separate PDF pages into individual files.",
      icon: "✂️",
      href: "/split-pdf",
    },
    {
      title: "Compress PDF",
      description: "Reduce PDF file size while keeping good quality.",
      icon: "🗜️",
      comingSoon: true,
    },
    {
      title: "PDF to JPG",
      description: "Convert PDF pages into high-quality JPG images.",
      icon: "🖼️",
      comingSoon: true,
    },
    {
      title: "JPG to PDF",
      description: "Turn your images into a professional PDF document.",
      icon: "📄",
      comingSoon: true,
    },
    {
      title: "Image Converter",
      description: "Convert JPG, PNG, WebP and other image formats.",
      icon: "🔄",
      comingSoon: true,
    },
    {
      title: "Compress Image",
      description: "Reduce image size without noticeable quality loss.",
      icon: "⚡",
      comingSoon: true,
    },
    {
      title: "Resize Image",
      description: "Resize images quickly to the exact dimensions you need.",
      icon: "↔️",
      comingSoon: true,
    },
  ];

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-900">
      {/* Navbar */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white">
              P
            </div>
            <span className="text-xl font-bold">PDF Tools</span>
          </div>

          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            <a href="#pdf-tools" className="transition hover:text-blue-600">
              PDF Tools
            </a>
            <a href="#image-tools" className="transition hover:text-blue-600">
              Image Tools
            </a>
            <a href="#video-tools" className="transition hover:text-blue-600">
              Video Tools
            </a>
            <a href="#pricing" className="transition hover:text-blue-600">
              Pricing
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button className="hidden rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:block">
              Log in
            </button>

            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
              Go Premium
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 pb-16 pt-20 text-center">
        <div className="mx-auto max-w-4xl">
          <div className="mb-5 inline-flex rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            Fast • Secure • Easy to use
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-slate-950 md:text-6xl">
            Everything you need to work
            <span className="text-blue-600"> with PDFs</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Edit, convert, compress and manage PDF files directly from your
            browser. Simple tools with a clean and user-friendly experience.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button className="w-full rounded-xl bg-blue-600 px-7 py-3.5 font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:w-auto">
              Edit a PDF
            </button>

            <button className="w-full rounded-xl border border-slate-300 bg-white px-7 py-3.5 font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto">
              View all tools
            </button>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            No signup required for basic tools.
          </p>
        </div>
      </section>

      {/* Tools */}
      <section id="pdf-tools" className="px-6 pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-9 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Popular tools
            </h2>
            <p className="mt-3 text-slate-600">
              Simple tools for your everyday documents and images.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => {
  const isComingSoon = tool.comingSoon;

  if (tool.href && !isComingSoon) {
    return (
      <a
        key={tool.title}
        href={tool.href}
        className={`group relative rounded-2xl border bg-white p-6 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg ${
          tool.featured
            ? "border-blue-300 ring-1 ring-blue-100"
            : "border-slate-200"
        }`}
      >
        {tool.featured && (
          <span className="absolute right-4 top-4 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
            POPULAR
          </span>
        )}

        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-2xl transition group-hover:bg-blue-50">
          {tool.icon}
        </div>

        <h3 className="text-lg font-bold text-slate-900">
          {tool.title}
        </h3>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          {tool.description}
        </p>

        <div className="mt-5 text-sm font-semibold text-blue-600">
          Open tool →
        </div>
      </a>
    );
  }

  return (
    <div
      key={tool.title}
      className="relative rounded-2xl border border-slate-200 bg-slate-50 p-6 text-left shadow-sm opacity-80"
    >
      <span className="absolute right-4 top-4 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
        COMING SOON
      </span>

      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-2xl">
        {tool.icon}
      </div>

      <h3 className="text-lg font-bold text-slate-900">
        {tool.title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        {tool.description}
      </p>

      <div className="mt-5 text-sm font-semibold text-slate-400">
        Coming soon
      </div>
    </div>
  );
})}
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="border-y border-slate-200 bg-white px-6 py-20">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-3">
          <div>
            <div className="mb-4 text-3xl">🔒</div>
            <h3 className="text-lg font-bold">Privacy first</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Where possible, files are processed directly in your browser.
            </p>
          </div>

          <div>
            <div className="mb-4 text-3xl">⚡</div>
            <h3 className="text-lg font-bold">Fast processing</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Modern browser technology keeps everyday tools quick and simple.
            </p>
          </div>

          <div>
            <div className="mb-4 text-3xl">✨</div>
            <h3 className="text-lg font-bold">Easy to use</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Clean interfaces designed for people who just want the job done.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 px-6 py-10 text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 text-sm md:flex-row md:items-center md:justify-between">
          <div>
            <span className="font-bold text-white">PDF Tools</span>
            <span className="ml-2">© 2026</span>
          </div>

          <div className="flex flex-wrap gap-5">
            <a href="#" className="hover:text-white">
              Privacy
            </a>
            <a href="#" className="hover:text-white">
              Terms
            </a>
            <a href="#" className="hover:text-white">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}