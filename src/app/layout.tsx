import type { Metadata, Viewport } from "next";

import { siteConfig } from "@/config/site";
import { getLocale } from "@/lib/i18n/server";
import { dirFor } from "@/lib/i18n/config";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: siteConfig.fullName,
    template: `%s · ${siteConfig.shortName}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.fullName,
  robots: { index: false, follow: false }, // internal system — never indexed
};

export const viewport: Viewport = {
  themeColor: "#2f6b4f",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // `dir` is set from the viewer's locale rather than hard-coded, so the
  // whole tree flips to right-to-left without any component changes.
  const locale = await getLocale();

  return (
    <html lang={locale} dir={dirFor(locale)}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
