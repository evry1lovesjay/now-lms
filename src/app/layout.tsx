import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "NowLMS",
  description: "Learn Software QA, Data Analytics, Product Management and Product Design.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html lang="en" className={theme === "system" ? undefined : theme}>
      <body className="flex min-h-screen flex-col">
        <Navbar theme={theme} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
