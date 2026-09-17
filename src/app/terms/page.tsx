import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Read the Toolijo Terms of Use for using our online PDF and image tools, including permitted use, responsibilities and service limitations.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="border-b border-slate-200 bg-white px-5 py-16 md:px-6 md:py-20">
        <div className="mx-auto max-w-4xl">
          <Link href="/" className="inline-block">
            <img src="/toolijo-logo.png" alt="Toolijo" className="h-11 w-auto max-w-[220px] object-contain" />
          </Link>
          <h1 className="mt-8 text-4xl font-black tracking-[-0.04em] text-slate-950 md:text-5xl">Terms of Use</h1>
          <p className="mt-4 text-sm font-semibold text-slate-500">Last updated: September 16, 2026</p>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
            These Terms of Use apply when you access or use Toolijo and its online PDF and image tools.
          </p>
        </div>
      </section>

      <section className="px-5 py-14 md:px-6 md:py-16">
        <div className="mx-auto max-w-4xl space-y-6">
          <TermsSection title="1. Acceptance of these terms">
            <p>By using Toolijo, you agree to use the website and its tools in accordance with these Terms of Use and applicable law.</p>
            <p>If you do not agree with these terms, you should not use the service.</p>
          </TermsSection>

          <TermsSection title="2. Permitted use">
            <p>Toolijo is provided for lawful document and image tasks such as editing, converting, organizing, protecting and managing files.</p>
            <p>You may use the tools for files that you own or that you have permission or legal authority to access, modify or process.</p>
          </TermsSection>

          <TermsSection title="3. Prohibited use">
            <p>You must not use Toolijo to access, unlock, modify, distribute or process files when you do not have the right or authorization to do so.</p>
            <p>You must not attempt to interfere with the website, abuse its infrastructure, introduce malicious code, bypass technical restrictions or use the service for unlawful activity.</p>
          </TermsSection>

          <TermsSection title="4. Your files and content">
            <p>You remain responsible for the files, text, images, passwords, signatures and other content you choose to process with Toolijo.</p>
            <p>You are responsible for confirming that your use of that content does not violate another person's rights, confidentiality obligations or applicable law.</p>
          </TermsSection>

          <TermsSection title="5. File accuracy and backups">
            <p>File conversion and editing can produce different results depending on the structure, fonts, formatting, encryption, image quality and complexity of the source file.</p>
            <p>You should review the output before relying on it and keep an original backup of important files.</p>
          </TermsSection>

          <TermsSection title="6. Availability of the service">
            <p>Toolijo may add, change, improve, limit, suspend or remove tools and features over time.</p>
            <p>We do not guarantee that every tool or feature will always be available, uninterrupted or compatible with every file, browser or device.</p>
          </TermsSection>

          <TermsSection title="7. No professional advice">
            <p>Toolijo provides general file utilities. Information or output from the website is not legal, financial, accounting or other professional advice.</p>
          </TermsSection>

          <TermsSection title="8. Intellectual property">
            <p>The Toolijo website, branding, interface, original design elements and original website content are protected by applicable intellectual property laws.</p>
            <p>These terms do not transfer ownership of Toolijo intellectual property to users.</p>
          </TermsSection>

          <TermsSection title="9. Third-party technologies and services">
            <p>Toolijo may rely on third-party software libraries, browser technologies, hosting infrastructure and other technical services to operate.</p>
            <p>Third-party products and services may be subject to their own licenses, terms and privacy practices.</p>
          </TermsSection>

          <TermsSection title="10. Disclaimer of warranties">
            <p>Toolijo is provided on an as-available basis. To the extent permitted by applicable law, we do not make guarantees that the service will be error-free, uninterrupted or suitable for every particular purpose.</p>
          </TermsSection>

          <TermsSection title="11. Limitation of liability">
            <p>To the extent permitted by applicable law, Toolijo will not be responsible for indirect, incidental or consequential loss arising from use of the service, inability to use the service, or reliance on processed files.</p>
            <p>You are responsible for reviewing results and maintaining backups of important source files.</p>
          </TermsSection>

          <TermsSection title="12. Changes to these terms">
            <p>These Terms of Use may be updated as Toolijo changes. The date at the top of this page will be revised when material changes are made.</p>
          </TermsSection>

          <TermsSection title="13. Contact">
            <p>If you have questions about these Terms of Use, you can contact Toolijo through the Contact page.</p>
          </TermsSection>

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

function TermsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <h2 className="text-2xl font-black tracking-tight text-slate-950">{title}</h2>
      <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">{children}</div>
    </section>
  );
}
