import type { Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ThemeProvider } from "@/components/theme-provider";
import { AppLayoutShell } from "@/components/app-layout-shell";
import Script from "next/script";
import { DEFAULT_SCRIPT_ID, SCRIPT_URL } from "@marsidev/react-turnstile";

import { createClient } from "@/utils/supabase/server";
import { getUserProfile, type UserProfile } from "@/app/notes/profile";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let initialUser: UserProfile | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (authUser) {
      initialUser = getUserProfile(authUser);
    }
  } catch {
    // If supabase fails to read cookies or during static generation, gracefully default to null
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <AppLayoutShell initialUser={initialUser}>
              {children}
            </AppLayoutShell>
        </ThemeProvider>
        <Script
          id={DEFAULT_SCRIPT_ID}
          src={SCRIPT_URL}
          strategy="afterInteractive"
        />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
