import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "xthread",
  description: "Grow your X audience with algorithm-optimized content. Generate viral posts in seconds with AI-powered Scroll Stoppers, Debate Starters, and Viral Catalysts.",
  icons: {
    icon: "/favicon.svg",
    apple: "/icon-512.svg",
  },
  openGraph: {
    title: "xthread - Grow Your X Audience",
    description: "Generate viral posts in seconds. Our AI creates Scroll Stoppers, Debate Starters, and Viral Catalysts designed to maximize engagement.",
    images: ["/og-image.svg"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "xthread - Grow Your X Audience",
    description: "Generate viral posts in seconds. Our AI creates Scroll Stoppers, Debate Starters, and Viral Catalysts designed to maximize engagement.",
    images: ["/og-image.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('xthread-theme');
                  if (theme === 'light') {
                    document.documentElement.classList.add('light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
