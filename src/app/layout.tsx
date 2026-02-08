import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Super Bowl LX Boxes — SEA vs NE",
  description: "Pick your boxes, win big on Super Bowl Sunday! Seahawks vs Patriots, Feb 8 2026.",
  openGraph: {
    title: "Super Bowl LX Boxes — SEA vs NE",
    description: "Pick your boxes, win big on Super Bowl Sunday!",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Super Bowl LX Boxes — SEA vs NE",
    description: "Pick your boxes, win big on Super Bowl Sunday!",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
