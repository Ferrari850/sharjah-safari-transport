export const siteConfig = {
  name: "Sharjah Safari Transport",
  fullName: "Sharjah Safari Transport Management System",
  shortName: "SSTMS",
  org: "Environment and Protected Areas Authority (EPAA)",
  description:
    "Internal transport management system for Sharjah Safari — drivers, trips, and assignments.",
  locale: "en",
} as const;

export type SiteConfig = typeof siteConfig;
