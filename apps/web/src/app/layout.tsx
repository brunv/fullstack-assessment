import type { Metadata } from "next";
import Link from "next/link";
import { Toaster } from "sonner";

import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrueRestore Interview — Web",
  description: "Next.js + Apollo client for the interview scaffold",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Providers>
          <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="mx-auto flex max-w-3xl items-center px-4 py-4">
              <Link href="/" className="text-base font-semibold text-[var(--color-ink)]">
                TrueRestore
              </Link>
            </div>
          </header>
          {children}
          <Toaster position="top-right" richColors />
        </Providers>
      </body>
    </html>
  );
}
