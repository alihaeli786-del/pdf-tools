import { tools } from "@/data/tools";

const relatedToolMap: Record<string, string[]> = {
  "/edit-pdf": ["/organize-pdf", "/watermark-pdf", "/page-numbers", "/protect-pdf"],
  "/merge-pdf": ["/split-pdf", "/organize-pdf", "/rotate-pdf", "/page-numbers"],
  "/split-pdf": ["/merge-pdf", "/organize-pdf", "/rotate-pdf", "/crop-pdf"],
  "/pdf-to-jpg": ["/jpg-to-pdf", "/image-converter", "/crop-image", "/compress-image"],
  "/jpg-to-pdf": ["/pdf-to-jpg", "/merge-pdf", "/organize-pdf", "/protect-pdf"],
  "/rotate-pdf": ["/organize-pdf", "/crop-pdf", "/page-numbers", "/edit-pdf"],
  "/organize-pdf": ["/merge-pdf", "/split-pdf", "/rotate-pdf", "/page-numbers"],
  "/protect-pdf": ["/unlock-pdf", "/watermark-pdf", "/pdf-metadata", "/edit-pdf"],
  "/unlock-pdf": ["/protect-pdf", "/edit-pdf", "/pdf-metadata", "/merge-pdf"],
  "/watermark-pdf": ["/edit-pdf", "/protect-pdf", "/page-numbers", "/pdf-metadata"],
  "/crop-pdf": ["/rotate-pdf", "/organize-pdf", "/edit-pdf", "/pdf-to-jpg"],
  "/pdf-metadata": ["/protect-pdf", "/watermark-pdf", "/edit-pdf", "/organize-pdf"],
  "/page-numbers": ["/organize-pdf", "/watermark-pdf", "/merge-pdf", "/edit-pdf"],
  "/pdf-to-word": ["/pdf-to-excel", "/edit-pdf", "/pdf-to-jpg", "/merge-pdf"],
  "/pdf-to-excel": ["/pdf-to-word", "/edit-pdf", "/pdf-to-jpg", "/split-pdf"],
  "/image-converter": ["/compress-image", "/resize-image", "/crop-image", "/remove-background"],
  "/compress-image": ["/resize-image", "/crop-image", "/image-converter", "/remove-background"],
  "/resize-image": ["/crop-image", "/compress-image", "/image-converter", "/remove-background"],
  "/crop-image": ["/resize-image", "/compress-image", "/remove-background", "/image-converter"],
  "/remove-background": ["/crop-image", "/resize-image", "/compress-image", "/image-converter"],
};

export default function RelatedTools({ currentHref }: { currentHref: string }) {
  const hrefs = relatedToolMap[currentHref] ?? [];
  const related = hrefs
    .map((href) => tools.find((tool) => tool.href === href && !tool.comingSoon))
    .filter((tool): tool is NonNullable<typeof tool> => Boolean(tool));

  if (!related.length) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-16 md:px-6">
      <div className="border-t border-slate-200 pt-10">
        <div className="mb-6">
          <h2 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">Related tools</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Continue working with other useful Toolijo tools.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {related.map((tool) => (
            <a
              key={tool.href}
              href={tool.href}
              className="group flex min-h-[190px] flex-col rounded-[18px] border border-slate-200 bg-white p-5 transition duration-200 hover:border-slate-300 hover:shadow-[0_10px_28px_rgba(15,23,42,0.07)]"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-xl transition group-hover:border-violet-100 group-hover:bg-violet-50">
                {tool.icon}
              </div>
              <h3 className="text-lg font-extrabold tracking-tight text-slate-900">{tool.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{tool.description}</p>
            </a>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-6 text-sm text-slate-500">
          <a href="/about" className="transition hover:text-violet-700">About Us</a>
          <a href="/privacy" className="transition hover:text-violet-700">Privacy Policy</a>
          <a href="/cookies" className="transition hover:text-violet-700">Cookie Policy</a>
          <a href="/terms" className="transition hover:text-violet-700">Terms of Use</a>
          <a href="/contact" className="transition hover:text-violet-700">Contact</a>
        </div>
      </div>
    </section>
  );
}
