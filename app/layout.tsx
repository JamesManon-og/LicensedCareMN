import type { Metadata } from "next";
import "@/app/globals.css";
import "@/app/app.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Licensed Care MN | Minnesota CRS provider directory", template: "%s | Licensed Care MN" },
  description: "Find Minnesota DHS-licensed Community Residential Setting providers by name, county, and service type.",
  openGraph: { type: "website", siteName: "Licensed Care MN" },
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
