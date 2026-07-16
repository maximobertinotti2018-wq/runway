import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider, themeInitScript } from "@/lib/theme/ThemeProvider";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { TopControls } from "@/components/TopControls";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://runway-blond.vercel.app";
const description = "Expense & subscription intelligence for indie founders.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Runway",
  description,
  openGraph: {
    title: "Runway",
    description,
    url: siteUrl,
    siteName: "Runway",
    images: [{ url: "/og-image.png", width: 2560, height: 1600 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Runway",
    description,
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Runs before paint: sets the `dark` class from the stored/system
            preference so the page never flashes the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <LanguageProvider>
            <TopControls />
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
