import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact Toolijo",
  description: "Contact Toolijo for questions, feedback, privacy concerns or help with our online PDF and image tools.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="border-b border-slate-200 bg-white px-5 py-16 md:px-6 md:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <Link href="/" className="inline-block">
            <img src="/toolijo-logo.png" alt="Toolijo" className="mx-auto h-11 w-auto max-w-[220px] object-contain" />
          </Link>
          <h1 className="mt-8 text-4xl font-black tracking-[-0.04em] text-slate-950 md:text-5xl">Contact Toolijo</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600">
            Have a question, found an issue, or want to share feedback about a Toolijo PDF or image tool? We would be glad to hear from you.
          </p>
        </div>
      </section>

      <section className="px-5 py-14 md:px-6 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm md:p-8">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">Email support</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                For general questions, technical feedback, privacy concerns or reports about a tool, email us directly.
              </p>
              <a href="mailto:support@toolijo.com" className="mt-6 inline-flex break-all rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-700">
                support@toolijo.com
              </a>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm md:p-8">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">Helpful details to include</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                If you are reporting a technical problem, include the name of the tool, what you were trying to do, your browser or device, and the error message if one appeared.
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Please avoid emailing confidential documents, passwords or other sensitive file contents unless they are genuinely necessary to explain the issue.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-[28px] border border-violet-200 bg-violet-50 p-7 md:p-8">
            <h2 className="text-2xl font-black tracking-tight text-slate-950">Privacy questions</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              For questions about how Toolijo handles files, technical information or privacy, you can use the same support email or review our Privacy Policy.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/privacy" className="rounded-xl border border-violet-200 bg-white px-5 py-3 text-sm font-bold text-violet-700 transition hover:border-violet-300">
                Read Privacy Policy
              </Link>
              <Link href="/" className="rounded-xl px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-white">
                Back to Toolijo
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
