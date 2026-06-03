import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import CustomCursor from "@/components/CustomCursor";
import ScrollProgress from "@/components/ScrollProgress";

export const metadata: Metadata = {
  title: "Shubha Vidyalaya",
  description: "Official Website of Shubha Vidyalaya",
  icons: {
    icon: "/svm_logo.png",
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <Script id="theme-script" strategy="beforeInteractive">
          {`
            (function() {
              try {
                const saved = localStorage.getItem('theme') || 'light';
                document.documentElement.setAttribute('data-theme', saved);
              } catch (e) {}
            })()
          `}
        </Script>
      </head>
      <body suppressHydrationWarning>
        <CustomCursor />
        <ScrollProgress />
        {children}
      </body>
    </html>
  );
}
