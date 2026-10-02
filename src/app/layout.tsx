import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { THEME_SCRIPT } from "@/components/theme-toggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "NowLMS",
  description: "Learn Software QA, Data Analytics, Product Management and Product Design.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The theme script adds class="dark" before hydration, so the class may differ from the server render.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen">
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
