import type { ReactNode } from "react";
import { MarketingHeader } from "@/components/features/marketing/marketing-header";
import { MarketingFooter } from "@/components/features/marketing/marketing-footer";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <MarketingHeader />
      <main>{children}</main>
      <MarketingFooter />
    </>
  );
}
