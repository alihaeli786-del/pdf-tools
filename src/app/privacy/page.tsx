import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Read the Toolijo Privacy Policy and learn how files, browser permissions, technical data and privacy are handled when using Toolijo.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="border-b border-slate-200 bg-white px-5 py-16 md:px-6 md:py-20">
        <div className="mx-auto max-w-4xl">
          <Link href="/" className="inline-block">
            <img src="/toolijo-logo.png" alt="Toolijo" className="h-11 w-auto max-w-[220px] object-contain" />
          </Link>
          <h1 className="mt-8 text-4xl font-black tracking-[-0.04em] text-slate-950 md:text-5xl">Privacy Policy</h1>
          <p className="mt-4 text-sm font-semibold text-slate-500">Last updated: September 16, 2026</p>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
            This Privacy Policy explains how Toolijo handles information when you use our website and online PDF and image tools.
          </p>
        </div>
      </section>

      <section className="px-5 py-14 md:px-6 md:py-16">
        <div className="mx-auto max-w-4xl space-y-6">
          <PolicySection title="1. Information you provide">
            <p>Toolijo currently does not require you to create an account to use the available tools.</p>
            <p>When you choose a file, image, password, password clue, signature or other content for use inside a tool, that information is used only to provide the function you requested.</p>
          </PolicySection>

          <PolicySection title="2. File processing">
            <p>Many Toolijo tools are designed to process PDF and image files directly in your web browser. When a tool works locally, your selected file is handled on your device rather than being sent to a PDF or image conversion API.</p>
            <p>Processing behavior can vary by tool as Toolijo develops. We aim to describe important privacy-related behavior clearly within relevant tools.</p>
          </PolicySection>

          <PolicySection title="3. Camera and device permissions">
            <p>Some features may request access to a device capability only when you choose to use that feature. For example, the Edit PDF signature tool can request camera access if you select the camera option.</p>
            <p>Your browser controls these permissions. You can deny or revoke permission through your browser or device settings.</p>
          </PolicySection>

          <PolicySection title="4. Technical information and server logs">
            <p>Like most websites, Toolijo is delivered through web hosting infrastructure. The hosting provider may automatically process standard technical information such as IP address, browser type, request time, requested page and related server-log information for security, reliability and operation of the service.</p>
            <p>Toolijo does not currently operate its own user profiling or behavioral tracking system.</p>
          </PolicySection>

          <PolicySection title="5. Cookies, analytics and advertising">
            <p>Toolijo currently does not use Google Analytics, Google Tag Manager, AdSense, Meta Pixel, Hotjar, Microsoft Clarity or a similar advertising or behavioral analytics system in the application.</p>
            <p>If analytics, advertising or other cookie-based services are introduced in the future, this Privacy Policy and any required consent controls will be updated as appropriate.</p>
          </PolicySection>

          <PolicySection title="6. Passwords and protected PDFs">
            <p>Security tools may temporarily use passwords or password clues in your browser to perform the action you request. You should only unlock or modify documents that you own or are authorized to access.</p>
          </PolicySection>

          <PolicySection title="7. Data retention">
            <p>Toolijo does not currently maintain user accounts or a Toolijo-managed database of uploaded PDF and image files.</p>
            <p>Standard hosting logs may be retained by infrastructure providers according to their operational, security and legal requirements.</p>
          </PolicySection>

          <PolicySection title="8. Third-party services">
            <p>Toolijo relies on technical infrastructure such as web hosting, domain services and browser technologies to operate. Those providers may process limited technical information under their own terms and privacy practices.</p>
          </PolicySection>

          <PolicySection title="9. Security">
            <p>We take reasonable steps to design Toolijo in a way that limits unnecessary handling of user files and information. However, no website, browser or internet transmission can be guaranteed to be completely secure.</p>
          </PolicySection>

          <PolicySection title="10. Children">
            <p>Toolijo is a general-purpose file utility service and is not specifically directed at children. We do not knowingly operate a system designed to collect personal information from children.</p>
          </PolicySection>

          <PolicySection title="11. Changes to this policy">
            <p>Toolijo may update this Privacy Policy as the website, tools or legal requirements change. The date at the top of this page will be updated when material revisions are made.</p>
          </PolicySection>

          <PolicySection title="12. Contact">
            <p>If you have a privacy question or concern, please use the Toolijo Contact page or email support@toolijo.com.</p>
          </PolicySection>

          <div className="pt-4">
            <Link href="/" className="inline-flex rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-700">
              Back to Toolijo
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <h2 className="text-2xl font-black tracking-tight text-slate-950">{title}</h2>
      <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">{children}</div>
    </section>
  );
}
