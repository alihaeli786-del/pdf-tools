import AnalyticsConsent from "@/components/AnalyticsConsent";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AnalyticsConsent />
    </>
  );
}
