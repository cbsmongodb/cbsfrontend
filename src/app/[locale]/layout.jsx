import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { cookies } from "next/headers";
import '../globals.css'

// Google Search Console ownership: <meta name="google-site-verification"> on every page
export const metadata = {
  verification: { google: "BTvih5rnQtmjqJ4l0WBYMe6ZJgzDSw3PsmN8Kw5MEPc" },
};

// edge to edge on iPhone + status bar / toolbar colour that follows light / dark mode
export async function generateViewport() {
  const dark = (await cookies()).get("cbs-theme")?.value === "dark";
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: dark ? "#17181b" : "#f8fafc",
  };
}

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;
  const messages = await getMessages();
  const theme = (await cookies()).get("cbs-theme")?.value === "dark" ? "dark" : undefined;

  return (
    <html lang={locale} data-theme={theme} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
