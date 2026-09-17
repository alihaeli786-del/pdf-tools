import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "Learn how Toolijo uses analytics cookies, browser storage and consent preferences when you use our website.",
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="border-b border-slate-200 bg-white px-5 py-16 md:px-6 md:py-20">
        <div className="mx-auto max-w-4xl">
          <Link href="/" className="inline-block">
            <img src="/toolijo-logo.png" alt="Toolijo" className="h-11 w-auto max-w-[220px] object-contain" />
          </Link>
          <h1 className="mt-8 text-4xl font-black tracking-[-0.04em] text-slate-950 md:text-5xl">Cookie Policy</h1>
          <p className="mt-4 text-sm font-semibold text-slate-500">Last updated: September 16, 2026</p>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
            This Cookie Policy explains how Toolijo uses browser storage and analytics technologies when you visit our website.
          </p>
        </div>
      </section>

      <section className="px-5 py-14 md:px-6 md:py-16">
        <div className="mx-auto max-w-4xl space-y-6">
          <CookieSection title="1. What are cookies?">
            <p>Cookies are small pieces of information that websites can store in your browser. Similar browser technologies, such as local storage, can also remember settings or preferences.</p>
          </CookieSection>

          <CookieSection title="2. Toolijo analytics consent">
            <p>Toolijo does not load Google Analytics until you choose Accept analytics in our consent banner.</p>
            <p>If you decline analytics, Toolijo does not load the Google Analytics tag. Your choice is remembered in your browser so we do not need to ask on every page visit.</p>
          </CookieSection>

          <CookieSection title="3. Google Analytics">
            <p>If you accept analytics, Toolijo uses Google Analytics to understand general website usage, including visits, pages and tools used, engagement, approximate location, browser information and device information.</p>
            <p>Google Analytics may use first-party identifiers such as the _ga cookie to distinguish users and sessions. The exact cookies and technical behavior may change as Google updates its service.</p>
          </CookieSection>

          <CookieSection title="4. Browser storage used for your preference">
            <p>Toolijo stores your analytics choice in browser local storage under a Toolijo preference key. This storage is used to remember whether you accepted or declined analytics.</p>
            <p>This preference is functional storage rather than advertising tracking.</p>
          </CookieSection>

          <CookieSection title="5. Advertising cookies">
            <p>Toolijo does not currently use Google AdSense, Meta Pixel or other advertising tracking systems. If advertising or additional tracking technologies are introduced later, this policy and the relevant consent controls will be updated.</p>
          </CookieSection>

          <CookieSection title="6. Changing your choice">
            <p>You can clear Toolijo site data or local storage through your browser settings to reset the saved analytics preference. When the saved preference is removed, Toolijo will ask for your analytics choice again on a future visit.</p>
          </CookieSection>

          <CookieSection title="7. Third-party information">
            <p>When you accept Google Analytics, Google may process analytics information according to its own terms and privacy practices.</p>
          </CookieSection>

          <CookieSection title="8. Changes to this policy">
            <p>We may update this Cookie Policy if Toolijo changes the analytics, advertising, storage or consent technologies it uses.</p>
          </CookieSection>

          <CookieSection title="9. Contact">
            <p>For questions about cookies, analytics or privacy, email support@toolijo.com or visit our Contact page.</p>
          </CookieSection>

          <div className="flex flex-wrap gap-3 pt-4">
            <Link href="/privacy" className="rounded-xl border border-violet-200 bg-white px-5 py-3 text-sm font-bold text-violet-700 transition hover:border-violet-300">
              Privacy Policy
            </Link>
            <Link href="/" className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-700">
              Back to Toolijo
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function CookieSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <h2 className="text-2xl font-black tracking-tight text-slate-950">{title}</h2>
      <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">{children}</div>
    </section>
  );
}
