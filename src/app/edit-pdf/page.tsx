"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const DesktopEditor = dynamic(
  () => import("./desktop-editor"),
  { ssr: false }
);

const MobileEditor = dynamic(
  () => import("./mobile-editor"),
  { ssr: false }
);

export default function FinalEditorTest() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);

    update();
    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, []);

  if (isMobile === null) {
    return <main className="p-6">Loading editor...</main>;
  }

  return isMobile ? <MobileEditor /> : <DesktopEditor />;
}
