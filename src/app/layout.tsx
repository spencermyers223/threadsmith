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
  title: "ThreadSmith",
  description: "Your ideas, expertly threaded. Turn your research into engaging X content while keeping your authentic voice.",
  icons: {
    icon: "/favicon.svg",
    apple: "/icon-512.svg",
  },
  openGraph: {
    title: "ThreadSmith",
    description: "Your ideas, expertly threaded. Turn your research into engaging X content while keeping your authentic voice.",
    images: ["/og-image.svg"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ThreadSmith",
    description: "Your ideas, expertly threaded. Turn your research into engaging X content while keeping your authentic voice.",
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
                  var theme = localStorage.getItem('threadsmith-theme');
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
