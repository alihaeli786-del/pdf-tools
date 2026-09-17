"use client";

import Script from "next/script";
import Link from "next/link";
import { useEffect, useState } from "react";

const GA_ID = "G-JLM51GDGP4";
const CONSENT_KEY = "toolijo-analytics-consent";

type ConsentChoice = "accepted" | "declined" | null;

export default function AnalyticsConsent() {
  const [consent, setConsent] = useState<ConsentChoice>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(CONSENT_KEY);

    if (saved === "accepted" || saved === "declined") {
      setConsent(saved);
    }

    setReady(true);
  }, []);

  const saveChoice = (choice: Exclude<ConsentChoice, null>) => {
    window.localStorage.setItem(CONSENT_KEY, choice);
    setConsent(choice);
  };

  return (
    <>
      {consent === "accepted" && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="toolijo-ga4" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag("js", new Date());
              gtag("config", "${GA_ID}");
            `}
          </Script>
        </>
      )}

      {ready && consent === null && (
        <div className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl md:flex md:items-center md:gap-6">
          <div className="flex-1">
            <p className="text-sm font-extrabold text-slate-950">Analytics preferences</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              We would like to use Google Analytics to understand how Toolijo is used and improve our tools. Analytics will not load unless you accept.
            </p>
            <div className="mt-2 flex gap-4 text-xs font-semibold">
              <Link href="/privacy" className="text-violet-700 hover:underline">Privacy Policy</Link>
              <Link href="/cookies" className="text-violet-700 hover:underline">Cookie Policy</Link>
            </div>
          </div>

          <div className="mt-4 flex shrink-0 gap-3 md:mt-0">
            <button
              type="button"
              onClick={() => saveChoice("declined")}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => saveChoice("accepted")}
              className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700"
            >
              Accept analytics
            </button>
          </div>
        </div>
      )}
    </>
  );
}
