"use client";

import { I18nProvider } from "../lib/i18n/index.js";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}
